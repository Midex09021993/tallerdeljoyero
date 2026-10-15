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

export interface AurumFinalRenderOptions {
  width: number;
  height: number;
  samples?: number;
  bounces?: number;
  /** Trace separate wavelength-dependent IOR passes for physically motivated diamond fire. */
  spectralDispersion?: boolean;
  mimeType?: "image/png" | "image/jpeg" | "image/webp";
  environmentUrl?: string | null;
  environmentIntensity?: number;
  environmentRotationY?: number;
  signal?: AbortSignal | undefined;
  onProgress?: ((done: number, total: number) => void) | undefined;
}

/** Real diamond IOR. Three's MeshPhysicalMaterial clamps `ior` to 2.333, so it is set as an own property read by the tracer. */
export const AURUM_PT_DIAMOND_IOR = 2.417;

const yieldFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

function convertMaterial(src: any): THREE.MeshPhysicalMaterial {
  const diamondMeta = src?.userData?.aurumDiamondMaterial;
  const isDiamond = src?.userData?.aurumGemFamily === "Diamante"
    || Boolean(src?.userData?.aurumIJEWELActive && diamondMeta)
    || src?.userData?.aurumDiamondShaderMode === "aurum-native-facet-environment-v1";
  const isGem = isDiamond || Boolean(src?.userData?.aurumGemFamily) || Number(src?.transmission ?? 0) > 0;
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

function buildIsolatedScene(model: THREE.Object3D) {
  const scene = new THREE.Scene();
  const materials: THREE.Material[] = [];
  const diamondMaterials: THREE.MeshPhysicalMaterial[] = [];
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
      if (!c) {
        c = convertMaterial(s);
        cache.set(s, c);
        materials.push(c);
        const isDiamond = s?.userData?.aurumGemFamily === "Diamante"
          || Boolean(s?.userData?.aurumIJEWELActive && s?.userData?.aurumDiamondMaterial)
          || s?.userData?.aurumDiamondShaderMode === "aurum-native-facet-environment-v1";
        if (isDiamond && (c as any).isMeshPhysicalMaterial) diamondMaterials.push(c as THREE.MeshPhysicalMaterial);
      }
      return c;
    });
    const mesh = new THREE.Mesh(obj.geometry, Array.isArray(obj.material) ? conv : conv[0]);
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(obj.matrixWorld);
    root.add(mesh);
  });
  scene.add(root);

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
  return { scene, materials, floorGeo, diamondMaterials };
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

  const { scene, materials, floorGeo, diamondMaterials } = buildIsolatedScene(model);
  const env = await loadEquirect(opts.environmentUrl);
  scene.environment = env;
  scene.environmentIntensity = opts.environmentIntensity ?? 1;
  scene.environmentRotation.set(0, opts.environmentRotationY ?? 0, 0);

  const useSpectralDispersion = opts.spectralDispersion !== false && diamondMaterials.length > 0;
  const wavelengthPasses = useSpectralDispersion
    ? [
        { channel: 0, ior: 2.410 }, // long wavelengths (red)
        { channel: 1, ior: 2.417 }, // reference green / sodium D line
        { channel: 2, ior: 2.435 }, // short wavelengths (blue)
      ]
    : [{ channel: -1, ior: AURUM_PT_DIAMOND_IOR }];
  const passCanvases: HTMLCanvasElement[] = [];
  let tracer: any = null;
  try {
    renderer.setRenderTarget(null);
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    const total = samples * wavelengthPasses.length;
    let completed = 0;

    for (let passIndex = 0; passIndex < wavelengthPasses.length; passIndex++) {
      if (opts.signal?.aborted) throw new DOMException("cancelado", "AbortError");
      const pass = wavelengthPasses[passIndex]!;
      // Change IOR only on diamond materials. Metals and colored gems remain
      // physically identical across wavelength passes, so their RGB channels
      // recombine without a synthetic rainbow tint.
      for (const material of diamondMaterials) {
        Object.defineProperty(material, "ior", {
          value: pass.ior, writable: true, configurable: true,
        });
        material.roughness = 0;
        material.transmission = 1;
        material.color.set(0xffffff);
      }

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

      let last = 0;
      while (tracer.samples < samples) {
        if (opts.signal?.aborted) throw new DOMException("cancelado", "AbortError");
        tracer.renderSample();
        const done = Math.floor(tracer.samples);
        if (done !== last) {
          completed += done - last;
          last = done;
          opts.onProgress?.(Math.min(completed, total), total);
        }
        await yieldFrame();
      }
      // Preserve each wavelength pass before disposing its accumulation.
      tracer.renderSample();
      const passCanvas = document.createElement("canvas");
      passCanvas.width = width;
      passCanvas.height = height;
      const passContext = passCanvas.getContext("2d");
      if (!passContext) throw new Error("No se pudo crear el lienzo de dispersión.");
      passContext.drawImage(renderer.domElement, 0, 0, width, height);
      passCanvases.push(passCanvas);
      tracer.dispose();
      tracer = null;
    }

    const out = document.createElement("canvas");
    out.width = width;
    out.height = height;
    const ctx = out.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("No se pudo crear el lienzo de captura.");
    if (passCanvases.length === 1) {
      ctx.drawImage(passCanvases[0]!, 0, 0);
    } else {
      const pixels = passCanvases.map((canvas) => {
        const passCtx = canvas.getContext("2d", { willReadFrequently: true });
        if (!passCtx) throw new Error("No se pudo leer una pasada espectral.");
        return passCtx.getImageData(0, 0, width, height);
      });
      const combined = ctx.createImageData(width, height);
      const red = pixels[0]!.data, green = pixels[1]!.data, blue = pixels[2]!.data;
      for (let i = 0; i < combined.data.length; i += 4) {
        combined.data[i] = red[i]!;
        combined.data[i + 1] = green[i + 1]!;
        combined.data[i + 2] = blue[i + 2]!;
        combined.data[i + 3] = 255;
      }
      ctx.putImageData(combined, 0, 0);
    }
    if (opts.signal?.aborted) throw new DOMException("cancelado", "AbortError");
    const url = out.toDataURL(opts.mimeType ?? "image/png", 0.95);
    if (!url || url.length < 1000) throw new Error("El render final quedó vacío.");
    return url;
  } finally {
    try { tracer?.dispose?.(); } catch { /* ignore */ }
    passCanvases.forEach((canvas) => { canvas.width = 1; canvas.height = 1; });
    materials.forEach((m) => m.dispose());
    floorGeo.dispose();
    env.dispose();
    renderer.setRenderTarget(oldTarget);
    renderer.setPixelRatio(oldPR);
    renderer.setSize(oldSize.x, oldSize.y, false);
  }
}
