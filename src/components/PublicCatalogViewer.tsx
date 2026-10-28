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
import { createAurumDiamondBvhRuntime } from "@/lib/aurum/aurum-diamond-bvh-runtime";

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

  // Match MiniAurumRender: explicit gem names/materials are authoritative.
  // Geometry fallback is only for models with no explicitly identified stones.
  const explicitlyIdentified = meshes.filter((mesh) => classifyMesh(mesh) === "gema");
  if (explicitlyIdentified.length > 0) {
    console.info("[PUBLIC VIEWER][GEM AUDIT] Gemas identificadas por nombre/metadatos; se omite inferencia geométrica para no teñir el engaste.", {
      explicitlyIdentified: explicitlyIdentified.length,
    });
    return 0;
  }

  model.updateMatrixWorld(true);
  const modelBounds = new THREE.Box3().setFromObject(model);
  if (modelBounds.isEmpty()) return 0;
  const modelSize = modelBounds.getSize(new THREE.Vector3());
  const modelCenter = modelBounds.getCenter(new THREE.Vector3());
  const candidates: Array<{ mesh: THREE.Mesh; score: number }> = [];

  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.visible || !object.geometry?.getAttribute("position")) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (materials.length !== 1) return;
    object.updateWorldMatrix(true, false);
    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const heightRatio = size.y / Math.max(modelSize.y, 1e-6);
    const xOffset = Math.abs(center.x - modelCenter.x) / Math.max(modelSize.x, 1e-6);
    const zOffset = Math.abs(center.z - modelCenter.z) / Math.max(modelSize.z, 1e-6);
    const topRatio = (center.y - modelBounds.min.y) / Math.max(modelSize.y, 1e-6);
    const triangles = Math.floor((object.geometry.getIndex()?.count ?? object.geometry.getAttribute("position").count) / 3);
    const widthRatio = size.x / Math.max(modelSize.x, 1e-6);
    const depthRatio = size.z / Math.max(modelSize.z, 1e-6);
    const compactness = Math.max(size.x, size.y, size.z) / Math.max(Math.min(size.x, size.y, size.z), 1e-5);

    // Keep MiniAurumRender's stricter filters. The previous 0.012 threshold
    // admitted prongs, rails and metal setting parts as supposed side gemstones.
    if (
      heightRatio > 0.48 ||
      topRatio < 0.62 ||
      xOffset > 0.24 ||
      zOffset > 0.24 ||
      widthRatio < 0.075 ||
      depthRatio < 0.075 ||
      triangles < 8 ||
      compactness > 4.2
    ) return;
    const footprint = widthRatio * depthRatio;
    const score = topRatio * 3 - xOffset * 2 - zOffset * 2 + footprint * 5 -
      Math.abs(heightRatio - 0.22) - Math.max(0, compactness - 2.2) * 0.16;
    candidates.push({ mesh: object, score });
  });

  candidates.sort((a, b) => b.score - a.score);
  const inferredGem = candidates[0]?.mesh;
  if (!inferredGem) {
    console.warn("[PUBLIC VIEWER][GEM AUDIT] No se encontró una gema aislada por geometría.", {
      meshCount: meshes.length,
    });
    return 0;
  }
  inferredGem.userData = { ...(inferredGem.userData ?? {}), aurumPublicInferredGem: true };
  console.info("[PUBLIC VIEWER][GEM AUDIT] Gema central inferida con el mismo criterio estricto de MiniAurumRender.", {
    mesh: inferredGem.name || inferredGem.uuid,
    candidates: candidates.length,
  });
  return 1;
};

export function PublicCatalogViewer({ modelUrl, modelName, materialId, gemId, onReady, onError }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const diamondBvhRuntimeRef = useRef<Awaited<ReturnType<typeof createAurumDiamondBvhRuntime>> | null>(null);
  const [modelLoadedVersion, setModelLoadedVersion] = useState(0);
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
        const family = object.userData?.aurumPublicInferredGem ? "gema" : object.userData?.aurumPublicDefaultMetal ? "metal" : classifyMesh(object);
        const originalMaterials = Array.isArray(object.material) ? object.material : [object.material];
        const next = originalMaterials.map((original: any) => {
          // Do not replace a live BVH shader when a metal selection or HDR callback reapplies profiles.
          if (family === "gema" && diamondBvhRuntimeRef.current) return original;
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
        if (supportedExtension === "3dm") {
          // Direct Rhino imports may arrive with dark/default CAD materials and
          // incomplete layer metadata. Keep explicitly identified gemstones,
          // but let the selected public metal profile drive otherwise-unclassified
          // meshes instead of leaving them black.
          model.userData = { ...(model.userData ?? {}), aurumPublicSourceFormat: "3dm" };
          model.traverse((object: any) => {
            if (!object.isMesh || !object.material) return;
            if (classifyMesh(object) === "otro") {
              object.userData = { ...(object.userData ?? {}), aurumPublicDefaultMetal: true };
            }
          });
        }
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
          const family = object.userData?.aurumPublicInferredGem ? "gema" : object.userData?.aurumPublicDefaultMetal ? "metal" : classifyMesh(object);
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

        cameraRef.current = camera;
        setModelLoadedVersion((version) => version + 1);

        loop = startAurumViewerLoop({ node: host, camera, renderer, controls }, () => {
          diamondBvhRuntimeRef.current?.update();
          renderer.render(scene, camera);
        }, { progressiveFrames: 3 });
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
      if (diamondBvhRuntimeRef.current) {
        diamondBvhRuntimeRef.current.dispose();
        diamondBvhRuntimeRef.current = null;
      }
      cameraRef.current = null;
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

  // Keep diamond BVH lifecycle independent from metal/gem material updates.
  // Changing a metal never reloads the model or recreates the diamond runtime.
  useEffect(() => {
    let cancelled = false;
    const previousRuntime = diamondBvhRuntimeRef.current;
    diamondBvhRuntimeRef.current = null;
    previousRuntime?.dispose();

    const model = modelRef.current;
    const camera = cameraRef.current;
    const selectedGem = GEMAS.find((item) => item.id === gemId);
    if (!model || !camera || !selectedGem || selectedGem.familia.toLocaleLowerCase() !== "diamante") {
      return () => { cancelled = true; };
    }

    model.traverse((object: any) => {
      if (!object.isMesh || !object.material) return;
      const family = object.userData?.aurumPublicInferredGem ? "gema" : object.userData?.aurumPublicDefaultMetal ? "metal" : classifyMesh(object);
      if (family !== "gema") return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (materials.length !== 1) return;
      materials[0].userData = { ...(materials[0].userData ?? {}), aurumGemFamily: "diamante" };
      object.userData = {
        ...(object.userData ?? {}),
        aurumActiveGemId: gemId,
        aurumActiveGemFamily: "diamante",
      };
    });

    void createAurumDiamondBvhRuntime({
      THREE,
      RGBELoader,
      EXRLoader,
      url: getAurumGemHdriUrl("ijewelGem"),
      camera,
      quality: "interactive",
      targetFamilies: ["diamante"],
      onError: (cause) => console.warn("[PUBLIC VIEWER] BVH diamante: se conserva el material AURUM como respaldo.", cause),
    }).then((runtime) => {
      if (cancelled || modelRef.current !== model || gemIdRef.current !== gemId) {
        runtime.dispose();
        return;
      }
      runtime.refresh(model);
      if (!runtime.diagnostics().enabled) {
        console.warn("[PUBLIC VIEWER] BVH diamante sin mallas compatibles; se mantiene el material AURUM.");
        runtime.dispose();
        return;
      }
      diamondBvhRuntimeRef.current = runtime;
      renderRef.current?.();
    }).catch((cause) => {
      if (!cancelled) console.warn("[PUBLIC VIEWER] No se pudo iniciar el BVH de diamante; se mantiene el perfil de catálogo.", cause);
    });

    return () => {
      cancelled = true;
      if (diamondBvhRuntimeRef.current) {
        diamondBvhRuntimeRef.current.dispose();
        diamondBvhRuntimeRef.current = null;
      }
    };
  }, [modelUrl, modelName, gemId, modelLoadedVersion]);

  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;
    const metal = MATERIALES.find((item) => item.id === materialId) ?? MATERIALES.find((item) => item.id === "oro18a_pulido")!;
    const gem = GEMAS.find((item) => item.id === gemId) ?? GEMAS.find((item) => item.id === "diamante_natural")!;
    model.traverse((object: any) => {
      if (!object.isMesh || !object.material) return;
      const family = object.userData?.aurumPublicInferredGem ? "gema" : object.userData?.aurumPublicDefaultMetal ? "metal" : classifyMesh(object);
      const originalMaterials = Array.isArray(object.material) ? object.material : [object.material];
      if (family === "gema") {
        object.userData = {
          ...(object.userData ?? {}),
          aurumActiveGemId: gem.id,
          aurumActiveGemFamily: gem.familia.toLocaleLowerCase(),
        };
        // The live diamond BVH owns the stone shader. Metal changes must never
        // replace it with a plain physical material; the BVH effect handles
        // teardown/recreation only when the selected gem profile changes.
        if (diamondBvhRuntimeRef.current) return;
      }
      const materials = originalMaterials.map((material: any) => family === "gema" ? ensurePhysicalGemMaterial(material) : material);
      object.material = Array.isArray(object.material) ? materials : materials[0];
      materials.forEach((material: any) => {
        if (family === "metal") applyAurumMetal(material, metalPresetFromConfig(metal));
        if (family === "gema") {
          applyAurumGem(material, gemPresetFromConfig(gem), Math.max(.015, Number(object.userData?.aurumOpticalProfile?.thickness ?? 1)));
          material.userData = {
            ...(material.userData ?? {}),
            aurumOpticalProfile: gemPresetFromConfig(gem),
            aurumGemFamily: gem.familia,
            aurumGemEnvIntensity: gem.envMapIntensity,
          };
        }
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
