import * as THREE from "three";
export const AURUM_GEM_ENVIRONMENT_PROFILES: Record<string, { intensity:number; rotationOffset:number; }> = {
  // The gem environment is intentionally independent from the metal environment.
  // Small family offsets improve the way the same HDR light field crosses
  // different optical responses without changing IOR, color or dispersion.
  Diamante: { intensity: 1.30, rotationOffset: 0.00 },
  Moissanita: { intensity: 1.24, rotationOffset: 0.025 },
  Esmeralda: { intensity: 1.12, rotationOffset: -0.035 },
  Rubi: { intensity: 1.16, rotationOffset: -0.020 },
  Zafiro: { intensity: 1.16, rotationOffset: 0.020 },
  default: { intensity: 1.14, rotationOffset: 0.00 },
};

export const getAurumGemEnvironmentProfile = (family:string) =>
  AURUM_GEM_ENVIRONMENT_PROFILES[family] ??
  AURUM_GEM_ENVIRONMENT_PROFILES["default"]!;

export const getAurumGemEnvironmentIntensity = (family:string) =>
  getAurumGemEnvironmentProfile(family).intensity;

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
        const family = String(m.userData?.aurumGemFamily ?? m.userData?.aurumOpticalProfile?.familia ?? "default");
        const profile = getAurumGemEnvironmentProfile(family);
        const authored = Number.isFinite(m.userData?.aurumGemBaseEnvIntensity)
          ? m.userData.aurumGemBaseEnvIntensity
          : (Number.isFinite(m.userData?.aurumGemEnvIntensity)
            ? m.userData.aurumGemEnvIntensity
            : profile.intensity);

        // iJewel exposes the gem environment independently from the scene
        // environment. A very small family-specific rotation offset is applied
        // to the gem light field only; it does not alter geometry or IOR.
        m.envMapIntensity = Math.max(.55, Math.min(2.35, authored * intensityScale));
        const nativeIJEWELRotation = Number(m.userData?.aurumIJEWELParameters?.environmentRotationOffset);
        const oriented = Number(m.userData?.aurumIJEWELParameters?.diamondOrientedEnvMap ?? 0) === 1;
        const worldEuler = new THREE.Euler();
        if (oriented && m.getWorldQuaternion) worldEuler.setFromQuaternion(m.getWorldQuaternion(new THREE.Quaternion()), "YXZ");
        const orientedCompensation = oriented ? -worldEuler.y : 0;
        const effectiveRotation = rotation + (Number.isFinite(nativeIJEWELRotation) ? nativeIJEWELRotation : profile.rotationOffset) + orientedCompensation;

        if (m.envMapRotation?.set) {
          m.envMapRotation.set(0, effectiveRotation, 0);
        } else if (m.envMapRotation) {
          m.envMapRotation.y = effectiveRotation;
        }

        m.userData = {
          ...(m.userData ?? {}),
          aurumGemEnvironmentRotation: effectiveRotation,
          aurumGemEnvironmentBaseRotation: rotation,
          aurumGemEnvironmentRotationOffset: Number.isFinite(nativeIJEWELRotation) ? nativeIJEWELRotation : profile.rotationOffset,
          aurumGemEnvironmentOriented: oriented,
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
