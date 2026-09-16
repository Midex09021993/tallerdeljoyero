export const AURUM_GEM_ENVIRONMENT_PROFILES: Record<string, { intensity:number; }> = {
  Diamante: { intensity: 1.18 },
  Esmeralda: { intensity: 1.05 },
  Rubi: { intensity: 1.10 },
  Zafiro: { intensity: 1.10 },
  default: { intensity: 1.10 },
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
  applyToModel: (model:any, texture:any)=>void;
  dispose: (texture?:any)=>void;
}

export function createAurumGemEnvironment(
  environmentController:any,
  RGBELoader:any
): AurumGemEnvironmentController {
  let current:any = null;

  const applyToModel = (model:any, texture:any) => {
    if (!model || !texture) return;
    model.traverse((x:any) => {
      if (!x.isMesh || !x.material) return;
      const apply = (m:any) => {
        if (!m?.userData?.aurumOpticalProfile) return m;
        m.envMap = texture;
        const family = m.userData.aurumOpticalProfile;
        const intensity = Number.isFinite(m.userData?.aurumGemEnvIntensity)
          ? m.userData.aurumGemEnvIntensity
          : getAurumGemEnvironmentIntensity(family);
        m.envMapIntensity = intensity;
        m.needsUpdate = true;
        return m;
      };
      x.material = Array.isArray(x.material) ? x.material.map(apply) : apply(x.material);
    });
  };

  return {
    load(url, _requestId, isCurrent, onLoaded) {
      new RGBELoader().load(url, (hdrTexture:any) => {
        if (!isCurrent()) {
          hdrTexture.dispose?.();
          return;
        }
        try {
          const next = environmentController.fromEquirectangular(hdrTexture);
          hdrTexture.dispose?.();
          const previous = current;
          current = next;
          previous?.dispose?.();
          onLoaded(next);
        } catch {
          hdrTexture.dispose?.();
        }
      }, undefined, () => {});
    },
    applyToModel,
    dispose(texture?:any) {
      const target = texture || current;
      target?.dispose?.();
      if (target === current) current = null;
    }
  };
}
