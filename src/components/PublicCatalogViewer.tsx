import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Play, Pause, ZoomIn, ZoomOut } from "lucide-react";
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
import { getAurumGemEnvironmentProfile } from "@/lib/aurum/gem-environment";

type Props = { modelUrl: string; modelName: string; materialId: string; gemId: string; onReady?: () => void; onError?: (message: string) => void; hideControls?: boolean; onResetViewReady?: (reset: (() => void) | null) => void };
export const classifyMesh = (mesh: any): "metal" | "gema" | "otro" => {
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
  ].map((value) => String(value ?? "")).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
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

// Geometry inference complements explicit gem metadata instead of disabling
// itself when a model contains side stones but its center diamond is unnamed.
// Only a central, compact candidate that outranks explicitly named side stones
// is inferred. Metal-classified meshes are never eligible in mixed assemblies.
export const inferGemMeshes = (
  model: THREE.Object3D,
  options: { allowCentralInferenceAlongsideExplicitGems?: boolean } = {},
): number => {
  const meshes: THREE.Mesh[] = [];
  model.traverse((object) => {
    if (object instanceof THREE.Mesh && object.visible && object.geometry?.getAttribute("position")) meshes.push(object);
  });
  const explicitlyIdentified = new Set(meshes.filter((mesh) => classifyMesh(mesh) === "gema"));
  const allowMixedInference = options.allowCentralInferenceAlongsideExplicitGems === true;
  if (explicitlyIdentified.size > 0 && !allowMixedInference) {
    console.info("[PUBLIC VIEWER][GEM AUDIT] Gemas explícitas detectadas; se conserva el comportamiento de no inferencia geométrica.", {
      explicitlyIdentified: explicitlyIdentified.size,
    });
    return 0;
  }

  model.updateMatrixWorld(true);
  const modelBounds = new THREE.Box3().setFromObject(model);
  if (modelBounds.isEmpty()) return 0;
  const modelSize = modelBounds.getSize(new THREE.Vector3());
  const modelCenter = modelBounds.getCenter(new THREE.Vector3());
  const candidates: Array<{ mesh: THREE.Mesh; score: number; explicit: boolean }> = [];

  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.visible || !object.geometry?.getAttribute("position")) return;
    const explicit = explicitlyIdentified.has(object);
    // In mixed-inference mode, metals are never eligible; explicit gems remain
    // candidates and win when they are already the central stone.
    if (allowMixedInference && explicitlyIdentified.size > 0 && classifyMesh(object) === "metal") return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (materials.length === 0) return;
    // A faceted center stone can be exported as one mesh with several face
    // materials. It is still a valid geometric candidate when none of those
    // slots is explicitly metallic; the later catalog pass assigns the same
    // gemstone profile to every slot before the BVH runtime is created.
    const hasExplicitMetalSlot = materials.some((material: any) =>
      /(metal|oro|gold|plata|silver|platino|platinum|steel|acero)/i.test(String(material?.name ?? "")),
    );
    if (hasExplicitMetalSlot) return;
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

    // Strict filters exclude long prongs, rails and most setting components.
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
    candidates.push({ mesh: object, score, explicit });
  });

  candidates.sort((a, b) => b.score - a.score);
  const inferred = candidates[0];
  if (!inferred) {
    console.warn("[PUBLIC VIEWER][GEM AUDIT] No se encontró una gema central aislada por geometría.", {
      meshCount: meshes.length,
      explicitlyIdentified: explicitlyIdentified.size,
    });
    return 0;
  }
  if (inferred.explicit) return 0;
  inferred.mesh.userData = { ...(inferred.mesh.userData ?? {}), aurumPublicInferredGem: true };
  console.info("[PUBLIC VIEWER][GEM AUDIT] Diamante central inferido sin alterar gemas explícitas ni metales.", {
    mesh: inferred.mesh.name || inferred.mesh.uuid,
    candidates: candidates.length,
    explicitlyIdentified: explicitlyIdentified.size,
  });
  return 1;
};

export function PublicCatalogViewer({ modelUrl, modelName, materialId, gemId, onReady, onError, hideControls = false, onResetViewReady }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const diamondBvhRuntimeRef = useRef<Awaited<ReturnType<typeof createAurumDiamondBvhRuntime>> | null>(null);
  const gemEnvironmentReadyRef = useRef<Promise<THREE.Texture | null> | null>(null);
  const bvhCameraStateRef = useRef<Float64Array | null>(null);
  const [modelLoadedVersion, setModelLoadedVersion] = useState(0);
  const renderRef = useRef<(() => void) | null>(null);
  const materialIdRef = useRef(materialId);
  const gemIdRef = useRef(gemId);
  materialIdRef.current = materialId;
  gemIdRef.current = gemId;
  const [status, setStatus] = useState("Preparando el visor 3D…");
  const [error, setError] = useState<string | null>(null);
  const [gemOpticsLoading, setGemOpticsLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const cameraActionsRef = useRef<{ reset: () => void; front: () => void; side: () => void; top: () => void; zoom: (direction: "in" | "out") => void; rotate: (enabled: boolean) => void } | null>(null);
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
    let zoomFrameId = 0;
    cameraActionsRef.current = null;
    setCameraReady(false);
    setAutoRotate(false);
    let environment: THREE.Texture | null = null;
    let gemEnvironment: THREE.Texture | null = null;
    let resolveGemEnvironmentReady: ((texture: THREE.Texture | null) => void) | null = null;
    let pmrem: THREE.PMREMGenerator | null = null;
    let roomEnvironmentTexture: THREE.Texture | null = null;
    let studioShadow: THREE.Mesh | null = null;
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
            // Match the approved AURUM Render gem EXR orientation: 0° base
            // plus the same per-family correction used by its gem controller.
            const gemEnvironmentProfile = getAurumGemEnvironmentProfile(gem.familia);
            const gemEnvironmentRotation = gemEnvironmentProfile.rotationOffset; // El catálogo público usa la orientación aprobada de AURUM Render: 0° base.
            if (material.envMapRotation?.set) material.envMapRotation.set(0, gemEnvironmentRotation, 0);
            else if (material.envMapRotation) material.envMapRotation.y = gemEnvironmentRotation;
            material.userData = { ...(material.userData ?? {}), aurumOpticalProfile: gemPresetFromConfig(gem), aurumGemFamily: gem.familia.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase(), aurumGemEnvIntensity: gem.envMapIntensity, aurumGemEnvironmentRotation: gemEnvironmentRotation };
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
        // Keep desktop detail while reducing fragment workload on high-DPI phones.
        // This is scoped to the public viewer; the shared Aurum renderer is unchanged.
        const isCompactViewport = window.matchMedia("(max-width: 767px)").matches;
        const viewerPixelRatio = Math.min(window.devicePixelRatio || 1, isCompactViewport ? 1 : 1.25);
        const viewer = createAurumWebGLViewer(THREE, host, { pixelRatio: viewerPixelRatio, controlsClass: OrbitControls, maxDistance: 100 });
        ({ scene, camera, renderer, controls } = viewer);
        rendererRef.current = renderer as THREE.WebGLRenderer;
        // Public viewer only: align highlight roll-off with the photographic reference.
        // Keep this override local; createAurumWebGLViewer is shared with Aurum Render.
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        scene.background = new THREE.Color("#ffffff");
        scene.add(new THREE.HemisphereLight(0xffffff, 0x77716a, 0.6));
        const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(4, 7, 5); scene.add(key);
        const fill = new THREE.DirectionalLight(0xffffff, 1.0); fill.position.set(-5, 2, -3); scene.add(fill);
        // A restrained rear rim light adds a clean edge highlight without changing material presets.
        const rim = new THREE.DirectionalLight(0xffffff, 0.55); rim.position.set(-1, 4, -6); scene.add(rim);
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
        const gemEnvironmentReady = new Promise<THREE.Texture | null>((resolve) => {
          resolveGemEnvironmentReady = resolve;
        });
        gemEnvironmentReadyRef.current = gemEnvironmentReady;
        const acceptHdr = (texture: THREE.Texture, done: (texture: THREE.Texture) => void) => {
          if (cancelled) { texture.dispose(); return; }
          texture.mapping = THREE.EquirectangularReflectionMapping;
          done(texture);
        };
        const loadHdr = (url: string, done: (texture: THREE.Texture) => void, onError?: () => void, useFloatExr = false) => {
          const failed = () => onError?.();
          if (/\.exr(?:$|[?#])/i.test(url)) {
            const loader = new EXRLoader();
            // The public BVH diamond runtime requires the gem EXR as FloatType.
            // Pass the same correctly decoded texture to both the physical gem
            // materials and BVH; the EXRLoader default HalfFloatType washes the
            // central diamond to an opaque white appearance in the BVH shader.
            if (useFloatExr && typeof (loader as any).setDataType === "function") {
              (loader as any).setDataType(THREE.FloatType);
            }
            loader.load(url, (texture) => {
              if (useFloatExr) {
                texture.colorSpace = THREE.LinearSRGBColorSpace;
                texture.generateMipmaps = false;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.unpackAlignment = 1;
                texture.needsUpdate = true;
              }
              acceptHdr(texture, done);
            }, undefined, failed);
          } else {
            new RGBELoader().load(url, (texture) => acceptHdr(texture, done), undefined, failed);
          }
        };
        loadHdr(metalUrl, (texture) => {
          environment = texture;
          if (scene) scene.environment = texture;
          if (gemUrl === metalUrl) {
            gemEnvironment = texture;
            resolveGemEnvironmentReady?.(texture);
          }
          applyProfiles();
          renderRef.current?.();
        });
        if (gemUrl !== metalUrl) loadHdr(gemUrl, (texture) => {
          gemEnvironment = texture;
          resolveGemEnvironmentReady?.(texture);
          applyProfiles();
          renderRef.current?.();
        }, () => resolveGemEnvironmentReady?.(null), true);

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
        // Match AurumRender's Rhino Z-up -> Three.js Y-up correction for direct 3DM imports.
        // GLB/GLTF and other formats keep their authored orientation.
        if (supportedExtension === "3dm") {
          model.rotation.x = -Math.PI / 2;
          model.updateMatrixWorld(true);
        }
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
        // A ring can contain explicitly named melee diamonds while its center stone
        // has no Rhino/GLB gem metadata. Infer the dominant central stone even in
        // that mixed case; otherwise the side stones get BVH and the center stays
        // on the plain physical fallback (the opaque-white failure seen in catalog).
        const inferredGemCount = inferGemMeshes(model, {
          allowCentralInferenceAlongsideExplicitGems: true,
        });
        const gemClassificationAudit = {
          modelName,
          sourceFormat: supportedExtension,
          meshCount: 0,
          gemMeshCount: 0,
          inferredCentralGemCount: inferredGemCount,
          inferredMeshes: [] as string[],
        };
        model.traverse((object: any) => {
          if (!object.isMesh || !object.geometry) return;
          gemClassificationAudit.meshCount += 1;
          const isInferred = Boolean(object.userData?.aurumPublicInferredGem);
          const family = isInferred ? "gema" : object.userData?.aurumPublicDefaultMetal ? "metal" : classifyMesh(object);
          if (family === "gema") gemClassificationAudit.gemMeshCount += 1;
          if (isInferred) gemClassificationAudit.inferredMeshes.push(String(object.name || object.uuid));
        });
        console.info("[PUBLIC VIEWER][GEM CLASSIFICATION]", gemClassificationAudit);
        // Building and logging a full per-mesh audit on every public load adds
        // allocations and console work for large jewelry models. Keep it opt-in
        // alongside the existing ?aurumPerf=1 diagnostics.
        if (perfEnabled) {
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
        }
        // Use only visible geometry for centering, scale and camera fit. Some 3DM
        // exports contain hidden/helper meshes whose bounds otherwise make the jewel
        // appear much smaller than an equivalent GLB in the public viewer.
        const bounds = new THREE.Box3();
        model.traverse((object: any) => {
          if (object.isMesh && object.geometry && object.visible) bounds.expandByObject(object);
        });
        if (bounds.isEmpty()) throw new Error("El modelo no contiene mallas visibles para mostrar.");
        const center = bounds.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.updateMatrixWorld(true);

        // Keep each source model's authored units and scale intact. Match the
        // public viewer's proven GLB framing by fitting the camera to visible geometry;
        // do not normalize to MiniAurumRender's separate canonical scale.
        const visibleBounds = new THREE.Box3();
        model.traverse((object: any) => {
          if (object.isMesh && object.geometry && object.visible) visibleBounds.expandByObject(object);
        });
        if (visibleBounds.isEmpty()) throw new Error("El modelo no contiene mallas visibles para mostrar.");
        const visibleSphere = visibleBounds.getBoundingSphere(new THREE.Sphere());
        const radius = Math.max(visibleSphere.radius, .001);

        // Lightweight studio contact shadow: one transparent plane and one tiny procedural texture.
        // This avoids real-time shadow maps and their extra render cost.
        const shadowCanvas = document.createElement("canvas");
        shadowCanvas.width = 256;
        shadowCanvas.height = 256;
        const shadowContext = shadowCanvas.getContext("2d");
        if (shadowContext) {
          const gradient = shadowContext.createRadialGradient(128, 128, 8, 128, 128, 124);
          gradient.addColorStop(0, "rgba(35, 31, 25, 0.22)");
          gradient.addColorStop(0.42, "rgba(45, 40, 34, 0.13)");
          gradient.addColorStop(0.76, "rgba(55, 50, 44, 0.045)");
          gradient.addColorStop(1, "rgba(55, 50, 44, 0)");
          shadowContext.fillStyle = gradient;
          shadowContext.fillRect(0, 0, 256, 256);
          const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
          const shadowMaterial = new THREE.MeshBasicMaterial({
            map: shadowTexture,
            transparent: true,
            opacity: 0.78,
            depthWrite: false,
            toneMapped: false,
          });
          const shadowGeometry = new THREE.PlaneGeometry(radius * 3.0, radius * 2.0);
          studioShadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
          studioShadow.rotation.x = -Math.PI / 2;
          const shadowCenter = visibleBounds.getCenter(new THREE.Vector3());
          studioShadow.position.set(shadowCenter.x, visibleBounds.min.y - radius * 0.014, shadowCenter.z);
          studioShadow.renderOrder = 1;
          scene.add(studioShadow);
        }

        camera.fov = 35;
        // This is the same bounding-sphere camera-fit formula used by the GLB viewer
        // before the 3DM sizing adjustment, so GLB presentation remains unchanged.
        const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.2;
        camera.position.copy(new THREE.Vector3(0, 0, distance));
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
        controls.autoRotate = false;
        controls.autoRotateSpeed = 1.25;
        controls.update();
        const setCameraView = (position: THREE.Vector3, up = new THREE.Vector3(0, 1, 0)) => {
          camera.position.copy(position);
          camera.up.copy(up);
          controls.target.set(0, 0, 0);
          camera.lookAt(controls.target);
          controls.update();
          loop?.converge?.(3);
        };
        const animateZoom = (direction: "in" | "out") => {
          if (zoomFrameId) cancelAnimationFrame(zoomFrameId);
          const offset = camera.position.clone().sub(controls.target);
          const startDistance = offset.length();
          // The zoom direction is constant for this animation; normalize once,
          // not with a new Vector3 allocation on every animation frame.
          offset.normalize();
          const factor = direction === "in" ? 0.88 : 1.12;
          const endDistance = THREE.MathUtils.clamp(startDistance * factor, controls.minDistance, controls.maxDistance);
          const distanceDelta = endDistance - startDistance;
          if (Math.abs(distanceDelta) < 0.0001) return;
          const startedAt = performance.now();
          const duration = 260;
          loop?.setContinuousRendering?.(true);
          const step = (now: number) => {
            const progress = Math.min((now - startedAt) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const nextDistance = startDistance + distanceDelta * eased;
            camera.position.copy(controls.target).addScaledVector(offset, nextDistance);
            controls.update();
            if (progress < 1) {
              zoomFrameId = requestAnimationFrame(step);
            } else {
              zoomFrameId = 0;
              loop?.setContinuousRendering?.(false);
              loop?.converge?.(3);
            }
          };
          zoomFrameId = requestAnimationFrame(step);
        };
        cameraActionsRef.current = {
          reset: () => {
            controls.autoRotate = false;
            loop?.setContinuousRendering?.(false);
            setAutoRotate(false);
            setCameraView(new THREE.Vector3(0, 0, distance));
          },
          front: () => setCameraView(new THREE.Vector3(0, 0, distance)),
          side: () => setCameraView(new THREE.Vector3(distance, 0, 0)),
          top: () => setCameraView(new THREE.Vector3(0, distance, 0.001), new THREE.Vector3(0, 0, -1)),
          zoom: (direction) => animateZoom(direction),
          rotate: (enabled) => { controls.autoRotate = enabled; if (enabled) loop?.setContinuousRendering?.(true); else { loop?.setContinuousRendering?.(false); loop?.converge?.(3); } controls.update(); },
        };
        onResetViewReady?.(() => cameraActionsRef.current?.reset());
        setCameraReady(true);
        scene.add(model);
        modelRef.current = model;
        applyProfiles();

        cameraRef.current = camera;
        setModelLoadedVersion((version) => version + 1);

        // BVH camera uniforms only need refreshing when the camera pose/target changes.
        // This skips redundant BVH work on settled/progressive frames without throttling
        // updates during an actual drag, zoom or auto-rotation.
        bvhCameraStateRef.current = null;
        // Opt-in runtime profiling: zero timing calls and no diagnostic logs unless
        // the public viewer is opened with ?aurumPerf=1.
        const framePerf = perfEnabled ? {
          frames: 0,
          startedAt: 0,
          bvhUpdates: 0,
          bvhTotalMs: 0,
          bvhMaxMs: 0,
          renderTotalMs: 0,
          renderMaxMs: 0,
          lastFrameAt: 0,
          frameIntervalTotalMs: 0,
          frameIntervalMaxMs: 0,
        } : null;
        const reportFramePerf = (reason: "interaction-end" | "sample") => {
          if (!framePerf || framePerf.frames === 0) return;
          const elapsedMs = Math.max(1, performance.now() - framePerf.startedAt);
          console.info("[PUBLIC VIEWER PERF] Rendimiento interactivo", {
            reason,
            frames: framePerf.frames,
            elapsedMs: Math.round(elapsedMs),
            averageFps: Number((framePerf.frames * 1000 / elapsedMs).toFixed(1)),
            averageFrameIntervalMs: Number((framePerf.frameIntervalTotalMs / Math.max(1, framePerf.frames - 1)).toFixed(2)),
            maxFrameIntervalMs: Number(framePerf.frameIntervalMaxMs.toFixed(2)),
            bvhUpdateCount: framePerf.bvhUpdates,
            bvhUpdateAverageMs: Number((framePerf.bvhTotalMs / Math.max(1, framePerf.bvhUpdates)).toFixed(3)),
            bvhUpdateMaxMs: Number(framePerf.bvhMaxMs.toFixed(3)),
            renderAverageMs: Number((framePerf.renderTotalMs / framePerf.frames).toFixed(3)),
            renderMaxMs: Number(framePerf.renderMaxMs.toFixed(3)),
            drawCalls: renderer.info?.render?.calls ?? null,
            triangles: renderer.info?.render?.triangles ?? null,
            geometries: renderer.info?.memory?.geometries ?? null,
            textures: renderer.info?.memory?.textures ?? null,
          });
          framePerf.frames = 0;
          framePerf.startedAt = 0;
          framePerf.bvhUpdates = 0;
          framePerf.bvhTotalMs = 0;
          framePerf.bvhMaxMs = 0;
          framePerf.renderTotalMs = 0;
          framePerf.renderMaxMs = 0;
          framePerf.lastFrameAt = 0;
          framePerf.frameIntervalTotalMs = 0;
          framePerf.frameIntervalMaxMs = 0;
        };
        loop = startAurumViewerLoop({ node: host, camera, renderer, controls }, () => {
          // Reuse one typed buffer: no temporary object/array allocations while dragging.
          const frameStartedAt = framePerf ? performance.now() : 0;
          const previous = bvhCameraStateRef.current;
          const state = previous ?? new Float64Array(10);
          const cameraChanged = previous === null
            || Math.abs(camera.position.x - state[0]!) > 1e-7
            || Math.abs(camera.position.y - state[1]!) > 1e-7
            || Math.abs(camera.position.z - state[2]!) > 1e-7
            || Math.abs(camera.quaternion.x - state[3]!) > 1e-7
            || Math.abs(camera.quaternion.y - state[4]!) > 1e-7
            || Math.abs(camera.quaternion.z - state[5]!) > 1e-7
            || Math.abs(camera.quaternion.w - state[6]!) > 1e-7
            || Math.abs(controls.target.x - state[7]!) > 1e-7
            || Math.abs(controls.target.y - state[8]!) > 1e-7
            || Math.abs(controls.target.z - state[9]!) > 1e-7;
          let bvhDurationMs = 0;
          if (cameraChanged) {
            const bvhStartedAt = framePerf ? performance.now() : 0;
            diamondBvhRuntimeRef.current?.update();
            if (framePerf) {
              bvhDurationMs = performance.now() - bvhStartedAt;
              framePerf.bvhUpdates += 1;
            }
            state[0] = camera.position.x;
            state[1] = camera.position.y;
            state[2] = camera.position.z;
            state[3] = camera.quaternion.x;
            state[4] = camera.quaternion.y;
            state[5] = camera.quaternion.z;
            state[6] = camera.quaternion.w;
            state[7] = controls.target.x;
            state[8] = controls.target.y;
            state[9] = controls.target.z;
            bvhCameraStateRef.current = state;
          }
          const renderStartedAt = framePerf ? performance.now() : 0;
          renderer.render(scene, camera);
          if (framePerf) {
            const finishedAt = performance.now();
            const renderDurationMs = finishedAt - renderStartedAt;
            if (framePerf.frames === 0) framePerf.startedAt = frameStartedAt;
            if (framePerf.lastFrameAt > 0) {
              const interval = frameStartedAt - framePerf.lastFrameAt;
              framePerf.frameIntervalTotalMs += interval;
              framePerf.frameIntervalMaxMs = Math.max(framePerf.frameIntervalMaxMs, interval);
            }
            framePerf.lastFrameAt = frameStartedAt;
            framePerf.frames += 1;
            framePerf.bvhTotalMs += bvhDurationMs;
            framePerf.bvhMaxMs = Math.max(framePerf.bvhMaxMs, bvhDurationMs);
            framePerf.renderTotalMs += renderDurationMs;
            framePerf.renderMaxMs = Math.max(framePerf.renderMaxMs, renderDurationMs);
            if (framePerf.frames >= 120 || finishedAt - framePerf.startedAt >= 2500) {
              reportFramePerf("sample");
            }
          }
        }, {
          progressiveFrames: 3,
          onEnd: () => reportFramePerf("interaction-end"),
        });
        renderRef.current = () => loop?.converge?.(3);
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
      resolveGemEnvironmentReady?.(null);
      if (zoomFrameId) cancelAnimationFrame(zoomFrameId);
      loop?.stop?.();
      if (diamondBvhRuntimeRef.current) {
        diamondBvhRuntimeRef.current.dispose();
        diamondBvhRuntimeRef.current = null;
      }
      cameraRef.current = null;
      if (rendererRef.current === renderer) rendererRef.current = null;
      cameraActionsRef.current = null;
      onResetViewReady?.(null);
      setCameraReady(false);
      if (studioShadow) {
        scene?.remove(studioShadow);
        studioShadow.geometry.dispose();
        const shadowMaterial = studioShadow.material as THREE.MeshBasicMaterial;
        shadowMaterial.map?.dispose();
        shadowMaterial.dispose();
        studioShadow = null;
      }
      if (model) model.traverse((object: any) => {
        object.geometry?.dispose?.();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material: any) => material?.dispose?.());
      });
      if (renderer) disposeAurumViewer({ node: host, renderer, controls });
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
    const selectedFamily = selectedGem?.familia.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
    const bvhFamilies = ["diamante", "esmeralda", "rubi", "zafiro", "amatista"];
    if (!model || !camera || !selectedGem || !selectedFamily || !bvhFamilies.includes(selectedFamily)) {
      setGemOpticsLoading(false);
      return () => { cancelled = true; };
    }
    setGemOpticsLoading(true);

    // The public viewer keeps the original five choices, but each choice must
    // activate its own AURUM BVH optical family—not the diamond shader for all stones.
    model.traverse((object: any) => {
      if (!object.isMesh || !object.material) return;
      const family = object.userData?.aurumPublicInferredGem ? "gema" : object.userData?.aurumPublicDefaultMetal ? "metal" : classifyMesh(object);
      if (family !== "gema") return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (materials.length !== 1) return;
      materials[0].userData = { ...(materials[0].userData ?? {}), aurumGemFamily: selectedFamily };
      object.userData = {
        ...(object.userData ?? {}),
        aurumActiveGemId: gemId,
        aurumActiveGemFamily: selectedFamily,
      };
    });

    void (async () => {
      const sharedEnvironmentMap = await gemEnvironmentReadyRef.current;
      if (cancelled || modelRef.current !== model || gemIdRef.current !== gemId) return;
      const runtime = await createAurumDiamondBvhRuntime({
        THREE,
        RGBELoader,
        EXRLoader,
        url: getAurumGemHdriUrl("ijewelGem"),
        ...(sharedEnvironmentMap ? { environmentMap: sharedEnvironmentMap, ownsEnvironmentMap: false } : {}),
        // Match the approved AURUM Render gem EXR orientation: 0° base.
        // The BVH runtime retains its geometry-derived per-stone optical-frame correction.
        environmentRotationRadians: 0, // Misma orientación de EXR que la calibración aprobada de AURUM Render.
        camera,
        getViewportHeight: () => rendererRef.current?.domElement.height ?? hostRef.current?.clientHeight ?? 1,
        quality: "high",
        targetFamilies: [selectedFamily],
        diamondCenterOnly: false,
        onError: (cause) => console.warn("[PUBLIC VIEWER] BVH AURUM para " + selectedFamily + ": se conserva el material AURUM como respaldo.", cause),
      });
      if (cancelled || modelRef.current !== model || gemIdRef.current !== gemId) {
        runtime.dispose();
        setGemOpticsLoading(false);
        return;
      }
      runtime.refresh(model);
      const bvhDiagnostics = runtime.diagnostics();
      const hasSelectedDiamond = selectedFamily !== "diamante" || bvhDiagnostics.diamondMeshes > 0;
      if (!bvhDiagnostics.enabled || !hasSelectedDiamond) {
        console.warn("[PUBLIC VIEWER][BVH AUDIT] El runtime no activó la familia óptica solicitada; se conserva el material físico AURUM.", {
          selectedFamily,
          ...bvhDiagnostics,
        });
        runtime.dispose();
        setGemOpticsLoading(false);
        return;
      }
      const protectedCenterDiamonds: string[] = [];
      model.traverse((object: any) => {
        if (object.isMesh && object.userData?.aurumDiamondMicroCenterProtected) {
          protectedCenterDiamonds.push(String(object.name || object.uuid));
        }
      });
      console.info("[PUBLIC VIEWER][BVH READY]", {
        selectedFamily,
        selectedGemId: gemId,
        protectedCenterDiamonds,
        ...bvhDiagnostics,
      });
      diamondBvhRuntimeRef.current = runtime;
      // Force one camera-uniform refresh for the newly attached BVH runtime.
      bvhCameraStateRef.current = null;
      setGemOpticsLoading(false);
      renderRef.current?.();
    })().catch((cause) => {
      if (!cancelled) {
        console.warn("[PUBLIC VIEWER] No se pudo iniciar el BVH AURUM para " + selectedFamily + "; se mantiene el perfil de catálogo.", cause);
        setGemOpticsLoading(false);
      }
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
          aurumActiveGemFamily: gem.familia.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase(),
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
            aurumGemFamily: gem.familia.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase(),
            aurumGemEnvIntensity: gem.envMapIntensity,
          };
        }
        material.needsUpdate = true;
      });
    });
    renderRef.current?.();
  }, [materialId, gemId]);

  return <div className="relative h-full min-h-[280px] w-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_44%,#ffffff_0%,#ffffff_58%,#f5f3ee_100%)]">
    {gemOpticsLoading && !status && !error && <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
      <div className="rounded-full border border-[#ece5d9] bg-white/95 px-4 py-2 text-xs text-[#625b54] shadow-sm">Preparando la gema AURUM…</div>
    </div>}
    <div ref={hostRef} className="absolute inset-0" />
    {!hideControls && cameraReady && !status && !error && <div className="hidden sm:flex absolute right-4 top-1/2 z-20 -translate-y-1/2 flex-col gap-2 rounded-full border border-white/65 bg-white/65 p-2 shadow-[0_10px_28px_-16px_rgba(45,35,20,.32),inset_0_1px_0_rgba(255,255,255,.85)] backdrop-blur-xl" aria-label="Controles de cámara">
      <button type="button" onClick={() => { const next = !autoRotate; setAutoRotate(next); cameraActionsRef.current?.rotate(next); }} title={autoRotate ? "Pausar rotación" : "Rotación automática"} aria-label={autoRotate ? "Pausar rotación" : "Iniciar rotación automática"} aria-pressed={autoRotate} className={"grid size-8 place-items-center rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b28b45] " + (autoRotate ? "bg-[#f5efe3] text-[#8b692f]" : "text-[#655b4c] hover:bg-[#f5efe3] hover:text-[#8b692f]")}>{autoRotate ? <Pause className="size-4" /> : <Play className="size-4" />}</button>
      <div className="h-px bg-[#eee8dd]" />
      <button type="button" onClick={() => cameraActionsRef.current?.front()} title="Vista frontal" aria-label="Vista frontal" className="grid size-8 place-items-center rounded-xl text-[#655b4c] transition hover:bg-[#f5efe3] hover:text-[#8b692f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b28b45]"><Camera className="size-4" /></button>
      <button type="button" onClick={() => cameraActionsRef.current?.side()} title="Vista lateral" aria-label="Vista lateral" className="grid size-8 place-items-center rounded-xl text-[#655b4c] transition hover:bg-[#f5efe3] hover:text-[#8b692f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b28b45]"><span className="text-[10px] font-bold">L</span></button>
      <button type="button" onClick={() => cameraActionsRef.current?.top()} title="Vista superior" aria-label="Vista superior" className="grid size-8 place-items-center rounded-xl text-[#655b4c] transition hover:bg-[#f5efe3] hover:text-[#8b692f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b28b45]"><span className="text-[10px] font-bold">S</span></button>
      <div className="h-px bg-[#eee8dd]" />
    </div>}
    {!hideControls && cameraReady && !status && !error && <div className="absolute bottom-4 right-3 z-20 flex flex-col gap-1 rounded-full border border-white/65 bg-white/65 p-1.5 shadow-[0_10px_24px_-16px_rgba(45,35,20,.28),inset_0_1px_0_rgba(255,255,255,.85)] backdrop-blur-xl sm:bottom-5 sm:right-4" aria-label="Zoom de cámara">
      <button type="button" onClick={() => cameraActionsRef.current?.zoom("in")} title="Acercar" aria-label="Acercar" className="grid size-8 place-items-center rounded-full text-[#655b4c] transition hover:bg-white/60 hover:text-[#8b692f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b28b45]"><ZoomIn className="size-4" /></button>
      <button type="button" onClick={() => cameraActionsRef.current?.zoom("out")} title="Alejar" aria-label="Alejar" className="grid size-8 place-items-center rounded-full text-[#655b4c] transition hover:bg-white/60 hover:text-[#8b692f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b28b45]"><ZoomOut className="size-4" /></button>
    </div>}
    {(status || error) && <div className={"absolute inset-x-3 bottom-3 z-20 rounded-xl px-3 py-2 text-xs " + (error ? "border border-red-300 bg-white/95 text-red-800" : "bg-white/90 text-[#625b54]")}>{error || status}</div>}
  </div>;
}
