import type { Euler, Scene, Texture, WebGLRenderer } from "three";
type AurumScene = Scene & { environmentIntensity?: number; environmentRotation?: Euler };
type EnvironmentLoaderConstructor = new () => { load: (url:string, onLoad:(texture:Texture)=>void, onProgress?:undefined, onError?:(error:unknown)=>void) => unknown };
type RoomEnvironmentConstructor = new () => { dispose?: () => void };

export interface AurumEnvironmentController {
  fallback: Texture;
  current: Texture;
  /** URL of the equirect HDRI behind `current`; null when using the fallback. */
  currentUrl: string | null;
  fromEquirectangular: (hdrTexture: Texture) => Texture;
  load: (
    url: string,
    requestId: number,
    isCurrent: () => boolean,
    onLoaded: (texture: Texture) => void,
    onError?: () => void
  ) => void;
  rotation: number;
  intensity: number;
  setRotation: (radians: number) => void;
  setIntensity: (value: number) => void;
  dispose: (extraTexture?: Texture) => void;
}

export function createAurumEnvironment(
  renderer: WebGLRenderer,
  scene: AurumScene,
  THREE: typeof import("three"),
  RoomEnvironment: RoomEnvironmentConstructor,
  RGBELoader: EnvironmentLoaderConstructor,
  EXRLoader?: EnvironmentLoaderConstructor
): AurumEnvironmentController {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const diagnosticMode = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("aurumDiag")
    : null;
  const diagnosticDirectOnly = diagnosticMode === "direct";
  const diagnosticNeutral = diagnosticMode === "neutral";

  const fallbackScene = new RoomEnvironment();
  const fallback = pmrem.fromScene(fallbackScene, .04).texture;
  fallbackScene.dispose?.();
  // Diagnostic modes are intentionally opt-in through the URL. Production keeps
  // the normal fallback environment exactly as before.
  scene.environment = diagnosticDirectOnly ? null : fallback;

  let current = fallback;
  let currentUrl: string | null = null;
  let rotation = 0;
  let intensity = 1;
  // Keep a small per-renderer PMREM cache so returning to a recent scene does
  // not redownload/re-prefilter the same HDRI on every switch.
  const cache = new Map<string, Texture>();
  const MAX_CACHE = 3;

  return {
    fallback,
    get current() {
      return current;
    },
    get currentUrl() {
      return currentUrl;
    },
    fromEquirectangular(hdrTexture: Texture) {
      return pmrem.fromEquirectangular(hdrTexture).texture;
    },
    get rotation() { return rotation; },
    get intensity() { return intensity; },
    setRotation(radians: number) {
      rotation = Number.isFinite(radians) ? radians : 0;
      // PMREM textures are world-oriented; rotate the environment through
      // scene.environmentRotation when the renderer supports it.
      if (scene.environmentRotation?.set) {
        scene.environmentRotation.set(0, rotation, 0);
      } else if (scene.environmentRotation) {
        scene.environmentRotation.y = rotation;
      }
    },
    setIntensity(value: number) {
      intensity = Math.max(0, Number.isFinite(value) ? value : 1);
      if ("environmentIntensity" in scene) {
        scene.environmentIntensity = intensity;
      }
    },
    load(url, requestId, isCurrent, onLoaded, onError) {
      // Diagnostic "direct" removes the IBL/HDR contribution entirely.
      // Diagnostic "neutral" keeps only the controlled RoomEnvironment PMREM.
      // Neither mode downloads or installs the production HDRI.
      if (diagnosticDirectOnly || diagnosticNeutral) {
        if (diagnosticDirectOnly) scene.environment = null;
        else scene.environment = fallback;
        console.info("[AURUM][HDR METAL][DIAGNOSTIC MODE]", {
          requestId,
          mode: diagnosticMode,
          urlIgnored: url,
          environmentInstalled: scene.environment === fallback,
        });
        onLoaded(fallback);
        return;
      }

      const cached = cache.get(url);
      if (cached) {
        current = cached;
        currentUrl = url;
        scene.environment = cached;
        console.info("[AURUM][HDR METAL][CACHE HIT]", {
          requestId,
          url,
          urlActive: currentUrl,
          rotationRadians: rotation,
          controllerIntensity: intensity,
          sceneEnvironmentIntensity: Number.isFinite(Number(scene.environmentIntensity)) ? Number(scene.environmentIntensity) : null,
          sceneEnvironmentRotation: scene.environmentRotation
            ? { x: Number(scene.environmentRotation.x ?? 0), y: Number(scene.environmentRotation.y ?? 0), z: Number(scene.environmentRotation.z ?? 0) }
            : null,
          environmentInstalled: scene.environment === cached,
        });
        if (isCurrent()) onLoaded(cached);
        return;
      }

      const Loader = /\.exr(?:$|[?#])/i.test(url) && EXRLoader ? EXRLoader : RGBELoader;
      console.info("[AURUM][HDR METAL][LOAD START]", {
        requestId,
        url,
        loader: Loader === EXRLoader ? "EXRLoader" : "RGBELoader",
      });
      new Loader().load(url, (hdrTexture: Texture) => {
        if (!isCurrent()) {
          console.warn("[AURUM][HDR METAL][STALE RESPONSE]", { requestId, url });
          hdrTexture.dispose?.();
          return;
        }
        try {
          const next = pmrem.fromEquirectangular(hdrTexture).texture;
          hdrTexture.dispose?.();
          if (!isCurrent()) {
            console.warn("[AURUM][HDR METAL][STALE CONVERSION]", { requestId, url });
            next.dispose?.();
            return;
          }
          cache.set(url, next);
          current = next;
          currentUrl = url;
          scene.environment = next;
          while (cache.size > MAX_CACHE) {
            const oldest = cache.keys().next().value as string | undefined;
            if (!oldest || oldest === url) break;
            const oldTexture = cache.get(oldest);
            cache.delete(oldest);
            if (oldTexture && oldTexture !== current) oldTexture.dispose?.();
          }
          console.info("[AURUM][HDR METAL][ACTIVE]", {
            requestId,
            urlRequested: url,
            urlActive: currentUrl,
            responseTextureConverted: true,
            rotationRadians: rotation,
            controllerIntensity: intensity,
            sceneEnvironmentIntensity: Number.isFinite(Number(scene.environmentIntensity)) ? Number(scene.environmentIntensity) : null,
            sceneEnvironmentRotation: scene.environmentRotation
              ? { x: Number(scene.environmentRotation.x ?? 0), y: Number(scene.environmentRotation.y ?? 0), z: Number(scene.environmentRotation.z ?? 0) }
              : null,
            environmentInstalled: scene.environment === next,
            currentMatchesInstalledEnvironment: current === scene.environment,
            textureUuid: next.uuid ?? null,
          });
          onLoaded(next);
        } catch (error) {
          hdrTexture.dispose?.();
          console.error("[AURUM][HDR METAL][CONVERSION ERROR]", {
            requestId,
            url,
            error,
          });
          onError?.();
        }
      }, undefined, (error: unknown) => {
        console.error("[AURUM][HDR METAL][NETWORK ERROR]", {
          requestId,
          url,
          loader: Loader === EXRLoader ? "EXRLoader" : "RGBELoader",
          error,
        });
        // RoomEnvironment permanece como fallback silencioso cuando falla la red.
        onError?.();
      });
    },
    dispose(extraTexture?: Texture) {
      if (extraTexture && extraTexture !== current && extraTexture !== fallback && !Array.from(cache.values()).includes(extraTexture)) {
        extraTexture.dispose?.();
      }
      for (const cached of cache.values()) cached?.dispose?.();
      cache.clear();
      current = fallback;
      currentUrl = null;
      fallback?.dispose?.();
      pmrem.dispose?.();
    },
  };
}
