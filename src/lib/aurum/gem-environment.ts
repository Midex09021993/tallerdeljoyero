import * as THREE from "three";
export const AURUM_GEM_ENVIRONMENT_PROFILES: Record<string, { intensity:number; rotationOffset:number; }> = {
  // Every gem family shares the same spatial EXR reference. Family response
  // is expressed through intensity and its own optical profile, never yaw.
  Diamante: { intensity: 1.14, rotationOffset: 0 },
  Moissanita: { intensity: 1.24, rotationOffset: 0 },
  Esmeralda: { intensity: 1.12, rotationOffset: 0 },
  Rubi: { intensity: 1.16, rotationOffset: 0 },
  Zafiro: { intensity: 1.16, rotationOffset: 0 },
  default: { intensity: 1.14, rotationOffset: 0 },
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
    onLoaded:(texture:any)=>void,
    onError?:()=>void
  )=>void;
  applyToModel: (
    model:any,
    texture:any,
    options?:{rotation?:number; intensityScale?:number}
  )=>void;
  applyToTargets: (
    targets:readonly any[],
    texture:any,
    options?:{rotation?:number; intensityScale?:number}
  )=>void;
  diagnostics: () => { loaded:boolean; url:string|null; textureUuid:string|null; appliedMeshes:number; appliedMaterials:number; };
  dispose: (texture?:any)=>void;
}

export function createAurumGemEnvironment(
  environmentController:any,
  RGBELoader:any,
  EXRLoader?:any
): AurumGemEnvironmentController {
  let current:any = null;
  let currentUrl:string|null = null;
  let appliedMeshes = 0;
  let appliedMaterials = 0;
  const cache = new Map<string, any>();
  const MAX_CACHE = 2;

  const applyToTargets = (
    targets:readonly any[],
    texture:any,
    options:{rotation?:number; intensityScale?:number} = {}
  ) => {
    if (!texture || !targets?.length) return;
    let nextAppliedMeshes = 0;
    let nextAppliedMaterials = 0;
    const rotation = Number.isFinite(options.rotation) ? Number(options.rotation) : 0;
    const intensityScale = Number.isFinite(options.intensityScale)
      ? Math.max(.75, Math.min(1.35, Number(options.intensityScale)))
      : 1;

    for (const x of targets) {
      if (!x?.isMesh || !x.material) continue;
      const apply = (m:any) => {
        if (!m?.userData?.aurumOpticalProfile) return m;
        const requiresShaderUpdate = !m.envMap;
        m.envMap = texture;
        nextAppliedMaterials += 1;
        const family = String(m.userData?.aurumGemFamily ?? m.userData?.aurumOpticalProfile?.familia ?? "default");
        const profile = getAurumGemEnvironmentProfile(family);
        const authored = Number.isFinite(m.userData?.aurumGemBaseEnvIntensity)
          ? m.userData.aurumGemBaseEnvIntensity
          : (Number.isFinite(m.userData?.aurumGemEnvIntensity)
            ? m.userData.aurumGemEnvIntensity
            : profile.intensity);
        const familyReflectionScale = family === "Diamante" ? 1.5 : 1;
        m.envMapIntensity = Math.max(.55, Math.min(2.35, authored * intensityScale * familyReflectionScale));
        const gemEnvironmentUniform = m.userData?.aurumGemEnvironmentUniforms;
        // Uniform value 0 is valid; test the uniform container, not truthiness
        // of its current numeric value, before synchronizing environment intensity.
        if (gemEnvironmentUniform && "value" in gemEnvironmentUniform) {
          gemEnvironmentUniform.value = m.envMapIntensity;
        }
        const oriented = Number(m.userData?.aurumIJEWELParameters?.diamondOrientedEnvMap ?? 0) === 1;
        const worldEuler = new THREE.Euler();
        if (oriented && m.getWorldQuaternion) worldEuler.setFromQuaternion(m.getWorldQuaternion(new THREE.Quaternion()), "YXZ");
        const orientedCompensation = oriented ? -worldEuler.y : 0;
        // The EXR yaw is a model-wide reference, independent of gem family or
        // per-catalog material offsets. Preserve only world-orientation compensation.
        const effectiveRotation = rotation + orientedCompensation;
        if (m.envMapRotation?.set) m.envMapRotation.set(0, effectiveRotation, 0);
        else if (m.envMapRotation) m.envMapRotation.y = effectiveRotation;
        m.userData = {
          ...(m.userData ?? {}),
          aurumGemEnvironmentRotation: effectiveRotation,
          aurumGemEnvironmentBaseRotation: rotation,
          aurumGemEnvironmentRotationOffset: 0,
          aurumGemEnvironmentOriented: oriented,
          aurumGemBaseEnvIntensity: authored,
          aurumGemEnvironmentIntensity: m.envMapIntensity,
        };
        if (requiresShaderUpdate) m.needsUpdate = true;
        return m;
      };
      const before = nextAppliedMaterials;
      x.material = Array.isArray(x.material) ? x.material.map(apply) : apply(x.material);
      if (nextAppliedMaterials > before) nextAppliedMeshes += 1;
    }
    appliedMeshes = nextAppliedMeshes;
    appliedMaterials = nextAppliedMaterials;
  };

  const applyToModel = (
    model:any,
    texture:any,
    options:{rotation?:number; intensityScale?:number} = {}
  ) => {
    if (!model || !texture) return;
    const targets:any[] = [];
    model.traverse((x:any) => { if (x?.isMesh) targets.push(x); });
    applyToTargets(targets, texture, options);
  };

  return {
    load(url, _requestId, isCurrent, onLoaded, onError) {
      const cached = cache.get(url);
      if (cached) {
        // Do not let an older cached request supersede a newer selection.
        if (!isCurrent()) return;
        current = cached;
        currentUrl = url;
        onLoaded(cached);
        return;
      }

      const Loader = /\.exr(?:$|[?#])/i.test(url) && EXRLoader ? EXRLoader : RGBELoader;
      new Loader().load(url, (hdrTexture:any) => {
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
          currentUrl = url;
          onLoaded(next);
        } catch (error) {
          hdrTexture.dispose?.();
          console.warn("[Aurum Render] No se pudo procesar el HDR de gemas:", url, error);
          onError?.();
        }
      }, undefined, (error:any) => {
        console.warn("[Aurum Render] No se pudo cargar el HDR de gemas; se conservará el entorno anterior:", url, error);
        if (isCurrent()) onError?.();
      });
    },
    applyToModel,
    applyToTargets,
    diagnostics() {
      return {
        loaded: Boolean(current),
        url: currentUrl,
        textureUuid: current?.uuid ?? null,
        appliedMeshes,
        appliedMaterials,
      };
    },
    dispose(texture?:any) {
      if (texture) {
        for (const [url, cached] of cache) {
          if (cached === texture) cache.delete(url);
        }
        texture.dispose?.();
        if (texture === current) { current = null; currentUrl = null; appliedMeshes = 0; appliedMaterials = 0; }
        return;
      }
      for (const cached of cache.values()) cached?.dispose?.();
      cache.clear();
      current = null;
      currentUrl = null;
      appliedMeshes = 0;
      appliedMaterials = 0;
    }
  };
}
