export interface AurumEnvironmentController {
  fallback: any;
  current: any;
  fromEquirectangular: (hdrTexture: any) => any;
  load: (
    url: string,
    requestId: number,
    isCurrent: () => boolean,
    onLoaded: (texture: any) => void,
    onError?: () => void
  ) => void;
  rotation: number;
  intensity: number;
  setRotation: (radians: number) => void;
  setIntensity: (value: number) => void;
  dispose: (extraTexture?: any) => void;
}

export function createAurumEnvironment(
  renderer: any,
  scene: any,
  THREE: any,
  RoomEnvironment: any,
  RGBELoader: any
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
  let rotation = 0;
  let intensity = 1;
  // Keep a small per-renderer PMREM cache so returning to a recent scene does
  // not redownload/re-prefilter the same HDRI on every switch.
  const cache = new Map<string, any>();
  const MAX_CACHE = 3;

  return {
    fallback,
    get current() {
      return current;
    },
    fromEquirectangular(hdrTexture: any) {
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
        onLoaded(fallback);
        return;
      }

      const cached = cache.get(url);
      if (cached) {
        current = cached;
        scene.environment = cached;
        if (isCurrent()) onLoaded(cached);
        return;
      }

      new RGBELoader().load(url, (hdrTexture: any) => {
        if (!isCurrent()) {
          hdrTexture.dispose?.();
          return;
        }
        try {
          const next = pmrem.fromEquirectangular(hdrTexture).texture;
          hdrTexture.dispose?.();
          if (!isCurrent()) {
            next.dispose?.();
            return;
          }
          cache.set(url, next);
          while (cache.size > MAX_CACHE) {
            const oldest = cache.keys().next().value as string | undefined;
            if (!oldest || oldest === url) break;
            const oldTexture = cache.get(oldest);
            cache.delete(oldest);
            if (oldTexture && oldTexture !== current) oldTexture.dispose?.();
          }
          current = next;
          scene.environment = next;
          onLoaded(next);
        } catch {
          hdrTexture.dispose?.();
          onError?.();
        }
      }, undefined, () => {
        // RoomEnvironment permanece como fallback silencioso cuando falla la red.
        onError?.();
      });
    },
    dispose(extraTexture?: any) {
      if (extraTexture && extraTexture !== current && extraTexture !== fallback && !Array.from(cache.values()).includes(extraTexture)) {
        extraTexture.dispose?.();
      }
      for (const cached of cache.values()) cached?.dispose?.();
      cache.clear();
      current = fallback;
      fallback?.dispose?.();
      pmrem.dispose?.();
    },
  };
}
