export const AURUM_GEM_ENVIRONMENT_PROFILES: Record<string, { intensity:number; }> = {
  Diamante: { intensity: 1.28 },
  Moissanita: { intensity: 1.24 },
  Esmeralda: { intensity: 1.12 },
  Rubi: { intensity: 1.16 },
  Zafiro: { intensity: 1.16 },
  default: { intensity: 1.14 },
};

export const getAurumGemEnvironmentIntensity = (family:string) =>
  AURUM_GEM_ENVIRONMENT_PROFILES[family]?.intensity ??
  AURUM_GEM_ENVIRONMENT_PROFILES.default.intensity;

export interface AurumGemEnvironmentController {
  load: (
    url:string,
    requestId:number,
    isCurrent:()=>boolean,
    onLoaded:(texture:any)=>void
  )=>void;
  applyToModel: (
    model:any,
    texture:any,
    options?:{rotation?:number; intensityScale?:number}
  )=>void;
  dispose: (texture?:any)=>void;
}

export function createAurumGemEnvironment(
  environmentController:any,
  RGBELoader:any
): AurumGemEnvironmentController {
  let current:any = null;
  const cache = new Map<string, any>();
  const MAX_CACHE = 2;

  const applyToModel = (
    model:any,
    texture:any,
    options:{rotation?:number; intensityScale?:number} = {}
  ) => {
    if (!model || !texture) return;
    const rotation = Number.isFinite(options.rotation) ? Number(options.rotation) : 0;
    const intensityScale = Number.isFinite(options.intensityScale)
      ? Math.max(.75, Math.min(1.35, Number(options.intensityScale)))
      : 1;

    model.traverse((x:any) => {
      if (!x.isMesh || !x.material) return;
      const apply = (m:any) => {
        if (!m?.userData?.aurumOpticalProfile) return m;
        m.envMap = texture;
        const family = m.userData?.aurumGemFamily ?? m.userData?.aurumOpticalProfile?.familia ?? "default";
        const authored = Number.isFinite(m.userData?.aurumGemBaseEnvIntensity)
          ? m.userData.aurumGemBaseEnvIntensity
          : (Number.isFinite(m.userData?.aurumGemEnvIntensity)
            ? m.userData.aurumGemEnvIntensity
            : getAurumGemEnvironmentIntensity(family));

        // iJewel exposes environment intensity and per-gem rotation separately.
        // Keep the authored optical preset, then apply the photographic scene
        // multiplier without letting the environment wash out the facets.
        m.envMapIntensity = Math.max(.55, Math.min(2.35, authored * intensityScale));

        // Three.js r185 supports per-material environment rotation. This is
        // intentionally independent from scene.environmentRotation so the same
        // HDRI can illuminate metal and still be oriented differently for gems.
        if (m.envMapRotation?.set) {
          m.envMapRotation.set(0, rotation, 0);
        } else if (m.envMapRotation) {
          m.envMapRotation.y = rotation;
        }

        m.userData = {
          ...(m.userData ?? {}),
          aurumGemEnvironmentRotation: rotation,
          // Keep the authored intensity immutable. Scene changes must never
          // multiply an already-scaled value and progressively wash out gems.
          aurumGemBaseEnvIntensity: authored,
          aurumGemEnvironmentIntensity: m.envMapIntensity,
        };
        m.needsUpdate = true;
        return m;
      };
      x.material = Array.isArray(x.material) ? x.material.map(apply) : apply(x.material);
    });
  };

  return {
    load(url, _requestId, isCurrent, onLoaded) {
      const cached = cache.get(url);
      if (cached) {
        current = cached;
        if (isCurrent()) onLoaded(cached);
        return;
      }

      new RGBELoader().load(url, (hdrTexture:any) => {
        if (!isCurrent()) {
          hdrTexture.dispose?.();
          return;
        }
        try {
          const next = environmentController.fromEquirectangular(hdrTexture);
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
            oldTexture?.dispose?.();
          }
          current = next;
          onLoaded(next);
        } catch {
          hdrTexture.dispose?.();
        }
      }, undefined, () => {});
    },
    applyToModel,
    dispose(texture?:any) {
      if (texture) {
        for (const [url, cached] of cache) {
          if (cached === texture) cache.delete(url);
        }
        texture.dispose?.();
        if (texture === current) current = null;
        return;
      }
      for (const cached of cache.values()) cached?.dispose?.();
      cache.clear();
      current = null;
    }
  };
}
