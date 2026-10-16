/**
 * AURUM final render — real progressive path tracing (three-gpu-pathtracer).
 *
 * Capture-only engine. The interactive viewer keeps its raster pipeline; this
 * module builds an ISOLATED scene (cloned meshes + converted physical
 * materials), traces it with the live WebGL renderer and returns an image.
 *
 * Real optics here: multiple reflections, refraction through the CAD facets,
 * total internal reflection and per-gem IOR/attenuation. Known limitation of
 * three-gpu-pathtracer 0.0.27: chromatic dispersion is NOT traced; custom
 * AURUM gem shaders (scintillation) are not used by the tracer.
 */
import * as THREE from "three";
import { getAurumDiamondPipelineDiagnostics } from "./aurum-diamond-pipeline";

export interface AurumFinalRenderOptions {
  width: number;
  height: number;
  samples?: number;
  bounces?: number;
  mimeType?: "image/png" | "image/jpeg" | "image/webp";
  environmentUrl?: string | null;
  environmentIntensity?: number;
  environmentRotationY?: number;
  /** Independent HDRI for gem reflections; scene.environment remains the metal/studio HDRI. */
  gemEnvironmentUrl?: string | null;
  /** Reuse the live studio lights in the isolated final-render scene. */
  studioScene?: THREE.Scene | null;
  signal?: AbortSignal | undefined;
  onProgress?: ((done: number, total: number) => void) | undefined;
}

/** Real diamond IOR. Three's MeshPhysicalMaterial clamps `ior` to 2.333, so it is set as an own property read by the tracer. */
export const AURUM_PT_DIAMOND_IOR = 2.417;

const yieldFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

function convertMaterial(src: any, gemEnvironment?: THREE.Texture | null): THREE.MeshPhysicalMaterial {
  const isGem = Boolean(src?.userData?.aurumGemFamily) || Number(src?.transmission ?? 0) > 0;
  const isDiamond = src?.userData?.aurumGemFamily === "Diamante";
  const m = new THREE.MeshPhysicalMaterial({
    color: src?.color?.clone?.() ?? new THREE.Color(0xffffff),
    metalness: isGem ? 0 : Number(src?.metalness ?? 0),
    roughness: Math.max(isGem ? 0 : 0.02, Number(src?.roughness ?? 0.5)),
    map: src?.map ?? null,
    normalMap: src?.normalMap ?? null,
    roughnessMap: src?.roughnessMap ?? null,
    metalnessMap: src?.metalnessMap ?? null,
    clearcoat: Number(src?.clearcoat ?? 0),
    clearcoatRoughness: Number(src?.clearcoatRoughness ?? 0),
    side: isGem ? THREE.DoubleSide : (src?.side ?? THREE.FrontSide),
    flatShading: Boolean(src?.flatShading),
  });
  if (src?.normalScale) m.normalScale.copy(src.normalScale);
  if (isGem) {
    // Keep the dedicated gem environment on gem materials without replacing
    // scene.environment, which continues to illuminate and reflect on metals.
    if (gemEnvironment) {
      m.envMap = gemEnvironment;
      m.envMapIntensity = Math.max(0.55, Math.min(2.35, Number(src?.envMapIntensity ?? 1.3)));
      if (src?.envMapRotation && m.envMapRotation) m.envMapRotation.copy(src.envMapRotation);
    }
    // Real refraction: full transmission, per-gem IOR and absorption colour.
    m.transmission = 1;
    m.thickness = Number(src?.thickness ?? 1);
    m.ior = Math.min(2.333, Math.max(1, Number(src?.ior ?? 1.5)));
    if (src?.attenuationColor) m.attenuationColor.copy(src.attenuationColor);
    m.attenuationDistance = Number.isFinite(src?.attenuationDistance) ? src.attenuationDistance : Infinity;
    if (src?.specularColor) m.specularColor.copy(src.specularColor);
    if (isDiamond) {
      Object.defineProperty(m, "ior", { value: AURUM_PT_DIAMOND_IOR, writable: true, configurable: true });
      m.roughness = 0;
      m.color.set(0xffffff);
    }
  }
  return m;
}

function buildIsolatedScene(model: THREE.Object3D, gemEnvironment?: THREE.Texture | null, studioScene?: THREE.Scene | null) {
  const scene = new THREE.Scene();
  const materials: THREE.Material[] = [];
  const cache = new Map<any, THREE.Material>();
  const root = new THREE.Group();
  model.updateMatrixWorld(true);
  model.traverse((obj: any) => {
    if (!obj.isMesh || !obj.visible || !obj.geometry) return;
    // Skip helpers/overlays the viewer adds (selection outlines, etc.).
    if (obj.userData?.aurumHelper || obj.userData?.aurumSelectionOverlay) return;
    let hidden = false;
    for (let p = obj; p; p = p.parent) if (p.visible === false) { hidden = true; break; }
    if (hidden) return;
    const srcMats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const conv = srcMats.map((s: any) => {
      let c = cache.get(s);
      if (!c) { c = convertMaterial(s, gemEnvironment); cache.set(s, c); materials.push(c); }
      return c;
    });
    const mesh = new THREE.Mesh(obj.geometry, Array.isArray(obj.material) ? conv : conv[0]);
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(obj.matrixWorld);

    // Connect the diamond geometry pipeline to the isolated final-render scene.
    // The GPU path tracer performs per-pixel multi-bounce transport; these
    // diagnostics confirm the exact CAD mesh is passed through unchanged.
    const isDiamond = srcMats.some((m: any) => m?.userData?.aurumGemFamily === "Diamante");
    if (isDiamond) {
      mesh.userData["aurumDiamondPipelineDiagnostics"] = getAurumDiamondPipelineDiagnostics(obj as THREE.Mesh, "final");
      mesh.userData["aurumDiamondPipelineVersion"] = mesh.userData["aurumDiamondPipelineDiagnostics"].version;
    }
    root.add(mesh);
  });
  scene.add(root);

  // The isolated tracer scene previously copied only the model and HDRI.
  // Reuse the live viewer's lights so polished metals and small stones retain
  // the studio highlights they have in the real-time preview.
  if (studioScene) {
    studioScene.updateMatrixWorld(true);
    studioScene.traverse((source: any) => {
      if (!source?.isLight || source.visible === false) return;
      const light = source.clone();
      const worldPosition = new THREE.Vector3();
      const worldQuaternion = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();
      source.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);
      light.position.copy(worldPosition);
      light.quaternion.copy(worldQuaternion);
      light.scale.copy(worldScale);
      light.matrixAutoUpdate = true;
      light.updateMatrix();
      scene.add(light);

      if (source.target?.isObject3D && light.target?.isObject3D) {
        source.target.updateMatrixWorld(true);
        source.target.getWorldPosition(worldPosition);
        light.target.position.copy(worldPosition);
        light.target.updateMatrixWorld(true);
        scene.add(light.target);
      }
    });
  }

  // White studio floor so the tracer produces real contact shadows/bounce.
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3()).length() || 1;
  const floorMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
  materials.push(floorMat);
  const floorGeo = new THREE.PlaneGeometry(size * 40, size * 40);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = Number.isFinite(box.min.y) ? box.min.y - size * 0.0005 : 0;
  scene.add(floor);
  scene.background = new THREE.Color(0xffffff);
  return { scene, materials, floorGeo };
}

async function loadEquirect(url: string | null | undefined): Promise<THREE.Texture> {
  if (url) {
    try {
      const isExr = /\.exr(?:$|[?#])/i.test(url);
      const mod: any = isExr
        ? await import("three/examples/jsm/loaders/EXRLoader.js")
        : await import("three/examples/jsm/loaders/RGBELoader.js");
      const Loader = isExr ? mod.EXRLoader : mod.RGBELoader;
      const tex: THREE.Texture = await new Loader().loadAsync(url);
      tex.mapping = THREE.EquirectangularReflectionMapping;
      return tex;
    } catch {
      /* fall through to procedural studio */
    }
  }
  const { GradientEquirectTexture } = await import("three-gpu-pathtracer");
  const g = new GradientEquirectTexture(512);
  g.topColor.set(0xffffff);
  g.bottomColor.set(0x505050);
  g.update();
  return g;
}

/** WebGL2 + float render targets are required by the tracer. */
export function aurumPathTracerSupported(renderer: THREE.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    return typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext
      && Boolean(gl.getExtension("EXT_color_buffer_float"));
  } catch { return false; }
}

/**
 * Trace the model and return a data URL. The caller must pause its own render
 * loop and restore renderer size/state afterwards (done in `finally` here for
 * size, pixel ratio and tone mapping exposure).
 */
export async function renderAurumPathTracedImage(
  renderer: THREE.WebGLRenderer,
  model: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  opts: AurumFinalRenderOptions,
): Promise<string> {
  if (!aurumPathTracerSupported(renderer)) {
    throw new Error("Este navegador o GPU no admite el render final con trazado de rayos (requiere WebGL2 con texturas flotantes).");
  }
  const { WebGLPathTracer } = await import("three-gpu-pathtracer");
  const samples = Math.max(1, Math.min(2048, Math.floor(opts.samples ?? 256)));
  const width = Math.max(320, Math.min(4096, Math.round(opts.width)));
  const height = Math.max(320, Math.min(4096, Math.round(opts.height)));

  const oldSize = new THREE.Vector2();
  renderer.getSize(oldSize);
  const oldPR = renderer.getPixelRatio();
  const oldTarget = renderer.getRenderTarget();
  const cam = camera.clone();
  cam.aspect = width / height;
  cam.updateProjectionMatrix();

  const env = await loadEquirect(opts.environmentUrl);
  // Load the gem HDRI separately. A failed gem-HDRI load falls back to the
  // scene HDRI so final rendering still works instead of aborting the capture.
  let gemEnv: THREE.Texture | null = null;
  if (opts.gemEnvironmentUrl && opts.gemEnvironmentUrl !== opts.environmentUrl) {
    try { gemEnv = await loadEquirect(opts.gemEnvironmentUrl); } catch { gemEnv = null; }
  }
  const { scene, materials, floorGeo } = buildIsolatedScene(model, gemEnv, opts.studioScene);
  scene.environment = env;
  scene.environmentIntensity = opts.environmentIntensity ?? 1;
  scene.environmentRotation.set(0, opts.environmentRotationY ?? 0, 0);

  let tracer: any = null;
  try {
    renderer.setRenderTarget(null);
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    tracer = new WebGLPathTracer(renderer);
    tracer.renderDelay = 0;
    tracer.minSamples = 1;
    tracer.fadeDuration = 0;
    tracer.rasterizeScene = false;
    tracer.dynamicLowRes = false;
    tracer.renderToCanvas = true;
    tracer.bounces = Math.max(4, Math.min(20, opts.bounces ?? 12));
    tracer.transmissiveBounces = 16;
    tracer.multipleImportanceSampling = true;
    tracer.tiles.set(2, 2);
    await yieldFrame();
    tracer.setScene(scene, cam);
    if (opts.signal?.aborted) throw new DOMException("cancelado", "AbortError");

    const total = samples;
    let last = 0;
    while (tracer.samples < total) {
      if (opts.signal?.aborted) throw new DOMException("cancelado", "AbortError");
      tracer.renderSample();
      const done = Math.floor(tracer.samples);
      if (done !== last) { last = done; opts.onProgress?.(Math.min(done, total), total); }
      await yieldFrame();
    }
    // Draw the final accumulation to the canvas and read it in the same task
    // (works with preserveDrawingBuffer=false).
    tracer.renderSample();
    const out = document.createElement("canvas");
    out.width = width; out.height = height;
    const ctx = out.getContext("2d");
    if (!ctx) throw new Error("No se pudo crear el lienzo de captura.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(renderer.domElement, 0, 0, width, height);
    const url = out.toDataURL(opts.mimeType ?? "image/png", 0.95);
    if (!url || url.length < 1000) throw new Error("El render final quedó vacío.");
    return url;
  } finally {
    try { tracer?.dispose?.(); } catch { /* ignore */ }
    materials.forEach((m) => m.dispose());
    floorGeo.dispose();
    env.dispose();
    if (gemEnv && gemEnv !== env) gemEnv.dispose();
    renderer.setRenderTarget(oldTarget);
    renderer.setPixelRatio(oldPR);
    renderer.setSize(oldSize.x, oldSize.y, false);
  }
}
