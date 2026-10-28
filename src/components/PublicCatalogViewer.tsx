import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { createAurumWebGLViewer, startAurumViewerLoop, disposeAurumViewer } from "@/lib/aurum/viewer";
import { parseAurumInput, preprocessAurumModel } from "@/lib/aurum/model-loader";
import { applyAurumMetal, applyAurumGem, metalPresetFromConfig, gemPresetFromConfig } from "@/lib/aurum-material-engine";
import { MATERIALES, GEMAS } from "@/lib/aurum/catalog";
import { getAurumHdriUrl, getAurumGemHdriUrl } from "@/lib/aurum-photographic-scene-engine";

type Props = { modelUrl: string; modelName: string; materialId: string; gemId: string; onReady?: () => void; onError?: (message: string) => void };
const classifyMesh = (mesh: any): "metal" | "gema" | "otro" => {
  const data = mesh?.userData ?? {};
  const attrs = data?.attributes ?? {};
  const rhino = data?.aurumRhino ?? {};
  const source = data?.aurumRhinoSource ?? {};
  const instanceSource = data?.aurumRhinoInstanceSource ?? {};
  const materials = Array.isArray(mesh?.material) ? mesh.material : [mesh?.material];
  const text = [
    mesh?.name,
    rhino?.capa,
    source?.layerName,
    instanceSource?.layerName,
    attrs?.layerName,
    attrs?.LayerName,
    ...materials.map((material: any) => material?.name),
  ].map((value) => String(value ?? "")).join(" ").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase();
  const explicitGem = [rhino?.categoria, data?.aurumGemFamily, data?.aurumActiveGemFamily]
    .some((value) => String(value ?? "").toLowerCase() === "gema" || String(value ?? "").toLowerCase() === "gem" || String(value ?? "").toLowerCase() === "diamante");
  if (explicitGem || /(gema|piedra|gem|stone|diamond|diamante|esmeralda|emerald|rubi|ruby|zafiro|sapphire|amatista|amethyst|moissanita|moissanite|citrino|citrine|topacio|topaz|aguamarina|aquamarine)/.test(text)) return "gema";
  if (rhino?.categoria === "metal" || /(metal|oro|gold|plata|silver|platino|platinum|acero|steel)/.test(text)) return "metal";
  return "otro";
};

const ensurePhysicalGemMaterial = (material: any): THREE.MeshPhysicalMaterial => {
  if (material?.isMeshPhysicalMaterial) return material as THREE.MeshPhysicalMaterial;

  // CAD/GLB imports can expose non-standard material objects. Avoid Material.copy()
  // here because it assumes every Three.js color/vector field exists on the source.
  const color = material?.color?.isColor ? material.color.clone() : new THREE.Color(0xffffff);
  const physical = new THREE.MeshPhysicalMaterial({
    color,
    roughness: Number.isFinite(material?.roughness) ? material.roughness : 0.08,
    metalness: 0,
    opacity: Number.isFinite(material?.opacity) ? material.opacity : 1,
    transparent: Boolean(material?.transparent),
    side: Number.isFinite(material?.side) ? material.side : THREE.FrontSide,
  });
  physical.name = typeof material?.name === "string" && material.name ? material.name : "AURUM Gem";
  physical.userData = { ...(material?.userData ?? {}) };
  return physical;
};

// Fallback inspired by MiniAurumRender: CAD exports may give every part a generic
// name. Only run geometry inference when no explicit gemstone mesh was found.
const inferGemMeshes = (model: THREE.Object3D): number => {
  const meshes: THREE.Mesh[] = [];
  model.traverse((object) => {
    if (object instanceof THREE.Mesh && object.visible && object.geometry?.getAttribute("position")) meshes.push(object);
  });

  // First preserve MiniAurumRender's reliable explicit-name strategy. Unlike the
  // mini preview, the public viewer must also find unnamed side stones when only
  // the center stone has metadata, so geometric inference runs for unclassified
  // meshes as well—not only when the entire model has zero recognized gems.
  const explicitlyIdentified = new Set(meshes.filter((mesh) => classifyMesh(mesh) === "gema"));
  model.updateMatrixWorld(true);
  const modelBounds = new THREE.Box3().setFromObject(model);
  if (modelBounds.isEmpty()) return 0;
  const modelSize = modelBounds.getSize(new THREE.Vector3());
  const modelCenter = modelBounds.getCenter(new THREE.Vector3());
  const candidates: Array<{ mesh: THREE.Mesh; score: number }> = [];

  for (const mesh of meshes) {
    if (explicitlyIdentified.has(mesh)) continue;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (!materials.length) continue;
    mesh.updateWorldMatrix(true, false);
    const bounds = new THREE.Box3().setFromObject(mesh);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const heightRatio = size.y / Math.max(modelSize.y, 1e-6);
    const xOffset = Math.abs(center.x - modelCenter.x) / Math.max(modelSize.x, 1e-6);
    const zOffset = Math.abs(center.z - modelCenter.z) / Math.max(modelSize.z, 1e-6);
    const topRatio = (center.y - modelBounds.min.y) / Math.max(modelSize.y, 1e-6);
    const widthRatio = size.x / Math.max(modelSize.x, 1e-6);
    const depthRatio = size.z / Math.max(modelSize.z, 1e-6);
    const position = mesh.geometry.getAttribute("position");
    const triangles = Math.floor((mesh.geometry.getIndex()?.count ?? position.count) / 3);
    const compactness = Math.max(size.x, size.y, size.z) / Math.max(Math.min(size.x, size.y, size.z), 1e-5);

    // Same core geometry tests as MiniAurumRender, with a smaller footprint
    // allowance for pavé stones. Keep the test limited to the upper setting area.
    if (heightRatio > .48 || topRatio < .62 || xOffset > .24 || zOffset > .24 ||
        widthRatio < .012 || depthRatio < .012 || triangles < 8 || compactness > 4.2) continue;
    const footprint = widthRatio * depthRatio;
    const score = topRatio * 3 - xOffset * 2 - zOffset * 2 + footprint * 5 -
      Math.abs(heightRatio - .22) - Math.max(0, compactness - 2.2) * .16;
    candidates.push({ mesh, score });
  }

  candidates.sort((a, b) => b.score - a.score);
  if (!candidates.length) {
    console.warn("[PUBLIC VIEWER][GEM AUDIT] No se encontraron gemas por geometría.", {
      meshCount: meshes.length,
      explicitlyIdentified: explicitlyIdentified.size,
    });
    return 0;
  }

  const bestScore = candidates[0].score;
  const selected = candidates.filter(({ score }) => score >= bestScore - .42);
  selected.forEach(({ mesh }) => {
    mesh.userData = { ...(mesh.userData ?? {}), aurumPublicInferredGem: true };
  });
  console.info("[PUBLIC VIEWER][GEM AUDIT] Inferencia geométrica basada en MiniAurumRender", {
    explicitlyIdentified: explicitlyIdentified.size,
    inferred: selected.length,
    candidateCount: candidates.length,
    selectedMeshes: selected.map(({ mesh }) => mesh.name || mesh.uuid),
  });
  return selected.length;
};

export function PublicCatalogViewer({ modelUrl, modelName, materialId, gemId, onReady, onError }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const renderRef = useRef<(() => void) | null>(null);
  const materialIdRef = useRef(materialId);
  const gemIdRef = useRef(gemId);
  materialIdRef.current = materialId;
  gemIdRef.current = gemId;
  const [status, setStatus] = useState("Preparando el visor 3D…");
  const [error, setError] = useState<string | null>(null);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let renderer: any = null;
    let scene: any = null;
    let camera: any = null;
    let controls: any = null;
    let model: THREE.Object3D | null = null;
    let loop: any = null;
    let resizeObserver: ResizeObserver | null = null;
    let environment: THREE.Texture | null = null;
    let gemEnvironment: THREE.Texture | null = null;
    let pmrem: THREE.PMREMGenerator | null = null;
    let roomEnvironmentTexture: THREE.Texture | null = null;
    const fallbackMaterial = new THREE.MeshPhysicalMaterial({ color: 0xdfe3e7, metalness: 1, roughness: .12 });

    const applyProfiles = () => {
      if (!model) return;
      const metal = MATERIALES.find((item) => item.id === materialIdRef.current) ?? MATERIALES.find((item) => item.id === "oro18a_pulido")!
      const gem = GEMAS.find((item) => item.id === gemIdRef.current) ?? GEMAS.find((item) => item.id === "diamante_natural")!
      model.traverse((object: any) => {
        if (!object.isMesh || !object.material) return;
        const family = object.userData?.aurumPublicInferredGem ? "gema" : classifyMesh(object);
        const originalMaterials = Array.isArray(object.material) ? object.material : [object.material];
        const next = originalMaterials.map((original: any) => {
          const material = family === "gema" ? ensurePhysicalGemMaterial(original) : original;
          if (family === "metal") {
            applyAurumMetal(material, metalPresetFromConfig(metal));
            material.envMap = environment;
          } else if (family === "gema") {
            applyAurumGem(material, gemPresetFromConfig(gem), Math.max(.015, Number(object.userData?.aurumOpticalProfile?.thickness ?? 1)));
            material.envMap = gemEnvironment ?? environment;
            material.userData = { ...(material.userData ?? {}), aurumOpticalProfile: gemPresetFromConfig(gem), aurumGemFamily: gem.familia, aurumGemEnvIntensity: gem.envMapIntensity };
          }
          material.needsUpdate = true;
          return material;
        });
        object.material = Array.isArray(object.material) ? next : next[0];
      });
      renderRef.current?.();
    };

    const boot = async () => {
      const perfEnabled = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("aurumPerf") === "1";
      const bootStartedAt = performance.now();
      let fetchStartedAt = bootStartedAt;
      let downloadStartedAt = bootStartedAt;
      let parseStartedAt = bootStartedAt;
      let preprocessStartedAt = bootStartedAt;
      try {
        const viewer = createAurumWebGLViewer(THREE, host, { pixelRatio: Math.min(window.devicePixelRatio || 1, 1.25), controlsClass: OrbitControls, maxDistance: 100 });
        ({ scene, camera, renderer, controls } = viewer);
        scene.background = new THREE.Color("#ffffff");
        scene.add(new THREE.HemisphereLight(0xffffff, 0x77716a, 1.5));
        const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(4, 7, 5); scene.add(key);
        const fill = new THREE.DirectionalLight(0xffffff, 1.0); fill.position.set(-5, 2, -3); scene.add(fill);
        const room = new RoomEnvironment();
        pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();
        const roomTarget = pmrem.fromScene(room, .04);
        scene.environment = roomTarget.texture;
        room.dispose();
        roomEnvironmentTexture = roomTarget.texture;
        environment = roomTarget.texture;
        gemEnvironment = environment;

        // Use the same dedicated metal and gem HDR sources as Aurum Render when available.
        const metalUrl = getAurumHdriUrl("ijewelMetal");
        const gemUrl = getAurumGemHdriUrl("ijewelGem");
        const acceptHdr = (texture: THREE.Texture, done: (texture: THREE.Texture) => void) => {
          if (cancelled) { texture.dispose(); return; }
          texture.mapping = THREE.EquirectangularReflectionMapping;
          done(texture);
        };
        const loadHdr = (url: string, done: (texture: THREE.Texture) => void) => {
          if (/\.exr(?:$|[?#])/i.test(url)) {
            new EXRLoader().load(url, (texture) => acceptHdr(texture, done), undefined, () => {});
          } else {
            new RGBELoader().load(url, (texture) => acceptHdr(texture, done), undefined, () => {});
          }
        };
        loadHdr(metalUrl, (texture) => { environment = texture; if (scene) scene.environment = texture; applyProfiles(); renderRef.current?.(); });
        if (gemUrl !== metalUrl) loadHdr(gemUrl, (texture) => { gemEnvironment = texture; applyProfiles(); renderRef.current?.(); });

        fetchStartedAt = performance.now();
        const response = await fetch(modelUrl);
        if (perfEnabled) console.info("[PUBLIC VIEWER PERF] Solicitud del modelo", { durationMs: Math.round(performance.now() - fetchStartedAt), status: response.status });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403 || response.status === 404) {
            throw new Error("El enlace ha caducado o el modelo ya no está disponible. Solicita un enlace nuevo al remitente.");
          }
          throw new Error("No se pudo descargar el modelo 3D.");
        }
        downloadStartedAt = performance.now();
        const blob = await response.blob();
        if (perfEnabled) console.info("[PUBLIC VIEWER PERF] Descarga del modelo", { durationMs: Math.round(performance.now() - downloadStartedAt), bytes: blob.size });
        if (cancelled) return;
        const sourceName = modelName || (() => {
          try { return decodeURIComponent(new URL(modelUrl).pathname.split("/").pop() || "modelo.glb"); }
          catch { return "modelo.glb"; }
        })();
        const extension = sourceName.split(".").pop()?.toLowerCase() || "glb";
        const supportedExtension = ["glb", "gltf", "3dm", "obj", "stl", "fbx"].includes(extension) ? extension : "glb";
        parseStartedAt = performance.now();
        model = await parseAurumInput(new File([blob], sourceName.includes(".") ? sourceName : `${sourceName}.${supportedExtension}`, { type: blob.type || "application/octet-stream" }), supportedExtension, fallbackMaterial);
        if (perfEnabled) console.info("[PUBLIC VIEWER PERF] Interpretación del modelo", { durationMs: Math.round(performance.now() - parseStartedAt), format: supportedExtension });
        if (!model) throw new Error("No se pudo interpretar la geometría del modelo 3D.");
        preprocessStartedAt = performance.now();
        await preprocessAurumModel(model);
        if (perfEnabled) console.info("[PUBLIC VIEWER PERF] Preparación de geometría", { durationMs: Math.round(performance.now() - preprocessStartedAt) });
        if (cancelled) return;
        // Give each mesh its own material instance so changing a profile in the
        // public viewer cannot mutate a shared CAD material or another family.
        model.traverse((object: any) => {
          if (!object.isMesh || !object.material) return;
          object.material = Array.isArray(object.material)
            ? object.material.map((material: any) => material?.clone ? material.clone() : material)
            : (object.material?.clone ? object.material.clone() : object.material);
        });
        model.updateMatrixWorld(true);
        const inferredGemCount = inferGemMeshes(model);
        const meshAudit: Array<Record<string, unknown>> = [];
        const familyCounts = { metal: 0, gema: 0, otro: 0 };
        model.traverse((object: any) => {
          if (!object.isMesh || !object.geometry) return;
          const family = object.userData?.aurumPublicInferredGem ? "gema" : classifyMesh(object);
          familyCounts[family]++;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          meshAudit.push({
            name: String(object.name || object.uuid),
            family,
            inferred: Boolean(object.userData?.aurumPublicInferredGem),
            visible: object.visible,
            triangles: Math.floor((object.geometry.getIndex()?.count ?? object.geometry.getAttribute("position")?.count ?? 0) / 3),
            materialTypes: materials.map((material: any) => material?.type ?? "unknown"),
            materialNames: materials.map((material: any) => material?.name ?? ""),
            layer: object.userData?.aurumRhino?.capa ?? object.userData?.aurumRhinoSource?.layerName ?? object.userData?.aurumRhinoInstanceSource?.layerName ?? object.userData?.attributes?.layerName ?? "",
          });
        });
        console.info("[PUBLIC VIEWER][GEM AUDIT]", {
          modelName,
          meshCount: meshAudit.length,
          familyCounts,
          inferredGemCount,
          meshes: meshAudit,
        });
        const bounds = new THREE.Box3();
        model.traverse((object: any) => { if (object.isMesh && object.geometry && object.visible) bounds.expandByObject(object); });
        if (bounds.isEmpty()) throw new Error("El modelo no contiene mallas visibles para mostrar.");
        const center = bounds.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.updateMatrixWorld(true);
        const sphere = new THREE.Box3().setFromObject(model).getBoundingSphere(new THREE.Sphere());
        const radius = Math.max(sphere.radius, .001);
        camera.fov = 35;
        const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.2;
        camera.position.copy(new THREE.Vector3(1, .62, 1).normalize().multiplyScalar(distance));
        camera.near = Math.max(radius / 100, .001);
        camera.far = Math.max(distance + radius * 20, 100);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
        controls.target.set(0, 0, 0);
        controls.minDistance = radius * .6;
        controls.maxDistance = radius * 12;
        controls.enablePan = false;
        controls.enableRotate = true;
        controls.enableZoom = true;
        controls.update();
        scene.add(model);
        modelRef.current = model;
        applyProfiles();
        loop = startAurumViewerLoop({ node: host, camera, renderer, controls }, () => renderer.render(scene, camera), { progressiveFrames: 3 });
        renderRef.current = () => loop?.converge?.(3);
        resizeObserver = new ResizeObserver(() => {
          if (!host || !camera || !renderer) return;
          const width = Math.max(host.clientWidth, 1), height = Math.max(host.clientHeight, 1);
          camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); loop?.converge?.(2);
        });
        resizeObserver.observe(host);
        loop.converge(3);
        setStatus("");
        if (perfEnabled) console.info("[PUBLIC VIEWER PERF] Tiempo hasta visor listo", { durationMs: Math.round(performance.now() - bootStartedAt) });
        onReadyRef.current?.();
      } catch (cause) {
        if (!cancelled) { const message = cause instanceof Error ? cause.message : "No se pudo abrir el diseño 3D."; setError(message); setStatus(""); onErrorRef.current?.(message); }
      }
    };
    void boot();
    return () => {
      cancelled = true;
      loop?.stop?.();
      resizeObserver?.disconnect();
      if (model) model.traverse((object: any) => {
        object.geometry?.dispose?.();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material: any) => material?.dispose?.());
      });
      if (renderer) disposeAurumViewer({ node: host, renderer, controls, ...(resizeObserver ? { observer: resizeObserver } : {}) });
      if (environment && environment !== roomEnvironmentTexture) environment.dispose?.();
      if (gemEnvironment && gemEnvironment !== environment && gemEnvironment !== roomEnvironmentTexture) gemEnvironment.dispose?.();
      roomEnvironmentTexture?.dispose?.();
      pmrem?.dispose?.();
      fallbackMaterial.dispose();
      modelRef.current = null; renderRef.current = null;
    };
  }, [modelUrl, modelName]);

  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;
    const metal = MATERIALES.find((item) => item.id === materialId) ?? MATERIALES.find((item) => item.id === "oro18a_pulido")!;
    const gem = GEMAS.find((item) => item.id === gemId) ?? GEMAS.find((item) => item.id === "diamante_natural")!;
    model.traverse((object: any) => {
      if (!object.isMesh || !object.material) return;
      const family = object.userData?.aurumPublicInferredGem ? "gema" : classifyMesh(object);
      const originalMaterials = Array.isArray(object.material) ? object.material : [object.material];
      const materials = originalMaterials.map((material: any) => family === "gema" ? ensurePhysicalGemMaterial(material) : material);
      object.material = Array.isArray(object.material) ? materials : materials[0];
      materials.forEach((material: any) => {
        if (family === "metal") applyAurumMetal(material, metalPresetFromConfig(metal));
        if (family === "gema") applyAurumGem(material, gemPresetFromConfig(gem), Math.max(.015, Number(object.userData?.aurumOpticalProfile?.thickness ?? 1)));
        material.needsUpdate = true;
      });
    });
    renderRef.current?.();
  }, [materialId, gemId]);

  return <div className="relative h-full min-h-[280px] w-full overflow-hidden bg-[#f7f6f2]">
    <div ref={hostRef} className="absolute inset-0" />
    {(status || error) && <div className={"absolute inset-x-3 bottom-3 z-20 rounded-xl px-3 py-2 text-xs " + (error ? "border border-red-300 bg-white/95 text-red-800" : "bg-white/90 text-[#625b54]")}>{error || status}</div>}
  </div>;
}
