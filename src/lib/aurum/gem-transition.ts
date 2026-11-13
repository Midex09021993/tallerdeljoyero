type ColorLike = {
  clone?: () => ColorLike;
  copy?: (value: ColorLike) => ColorLike;
  lerp?: (value: ColorLike, alpha: number) => ColorLike;
};

type GemMaterialSnapshot = {
  meshUuid: string;
  materialIndex: number;
  color: ColorLike | null;
  attenuationColor: ColorLike | null;
  roughness: number;
  transmission: number;
  envMapIntensity: number;
  attenuationDistance: number;
};

export type AurumGemTransitionController = {
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  readonly active: boolean;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const easeInOut = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

function materialList(mesh: any): any[] {
  return Array.isArray(mesh?.material) ? mesh.material : [mesh?.material];
}

/** Capture only stable, interpolable appearance values before a gem profile is replaced. */
export function captureAurumGemTransitionState(target: any): GemMaterialSnapshot[] {
  const snapshots: GemMaterialSnapshot[] = [];
  const visit = (mesh: any) => {
    if (!mesh?.isMesh || mesh.userData?.aurumInternalInclusion) return;
    materialList(mesh).forEach((material, materialIndex) => {
      // The source may still be a MeshStandardMaterial from Rhino/GLB.
      // Capture its compatible base appearance so the first gem assignment
      // can also blend smoothly into the new MeshPhysicalMaterial.
      if (!material) return;
      snapshots.push({
        meshUuid: String(mesh.uuid),
        materialIndex,
        color: material.color?.clone?.() ?? null,
        attenuationColor: material.attenuationColor?.clone?.() ?? null,
        roughness: Number(material.roughness ?? 0),
        transmission: Number(material.transmission ?? 0),
        envMapIntensity: Number(material.envMapIntensity ?? 1),
        attenuationDistance: Number(material.attenuationDistance ?? 10),
      });
    });
  };
  // Use only the meshes resolved for this exact assignment. Never walk
  // the model root, where previously assigned neighboring gems also live.
  const targets = Array.isArray(target) ? target : [target];
  targets.forEach(visit);
  return snapshots;
}

/**
 * Smoothly blends compatible MeshPhysicalMaterial appearance values.
 * Shader-based diamond materials and physical identity parameters (IOR,
 * dispersion, scintillation, inclusions and BVH state) remain untouched.
 */
export function createAurumGemTransition(
  target: any,
  previous: GemMaterialSnapshot[],
  onFrame: () => void,
  durationMs = 240,
  onComplete?: () => void,
): AurumGemTransitionController | null {
  if (!target || previous.length === 0) return null;
  const previousByKey = new Map(previous.map((item) => [`${item.meshUuid}:${item.materialIndex}`, item]));
  const tracks: Array<{ material: any; from: GemMaterialSnapshot; to: GemMaterialSnapshot }> = [];

  const visit = (mesh: any) => {
    if (!mesh?.isMesh || mesh.userData?.aurumInternalInclusion || !mesh.userData?.aurumActiveGemId) return;
    materialList(mesh).forEach((material, materialIndex) => {
      if (!material?.isMeshPhysicalMaterial) return;
      const from = previousByKey.get(`${mesh.uuid}:${materialIndex}`);
      if (!from) return;
      tracks.push({
        material,
        from,
        to: {
          meshUuid: String(mesh.uuid),
          materialIndex,
          color: material.color?.clone?.() ?? null,
          attenuationColor: material.attenuationColor?.clone?.() ?? null,
          roughness: Number(material.roughness ?? 0),
          transmission: Number(material.transmission ?? 0),
          envMapIntensity: Number(material.envMapIntensity ?? 1),
          attenuationDistance: Number(material.attenuationDistance ?? 10),
        },
      });
    });
  };
  // Match the snapshot boundary exactly: animate only meshes belonging
  // to the currently selected gem assignment/layer.
  const targets = Array.isArray(target) ? target : [target];
  targets.forEach(visit);
  if (tracks.length === 0) return null;

  let frameId = 0;
  let active = true;
  let paused = false;
  let startedAt = 0;
  let elapsedBeforePause = 0;
  let lastRenderAt = 0;
  const duration = Math.max(120, Math.min(420, durationMs));

  const apply = (progress: number) => {
    const eased = easeInOut(progress);
    for (const track of tracks) {
      const { material, from, to } = track;
      if (from.color && to.color && material.color?.copy && material.color?.lerp) {
        material.color.copy(from.color).lerp(to.color, eased);
      }
      if (from.attenuationColor && to.attenuationColor && material.attenuationColor?.copy && material.attenuationColor?.lerp) {
        material.attenuationColor.copy(from.attenuationColor).lerp(to.attenuationColor, eased);
      }
      material.roughness = from.roughness + (to.roughness - from.roughness) * eased;
      material.transmission = from.transmission + (to.transmission - from.transmission) * eased;
      material.envMapIntensity = from.envMapIntensity + (to.envMapIntensity - from.envMapIntensity) * eased;
      material.attenuationDistance = from.attenuationDistance + (to.attenuationDistance - from.attenuationDistance) * eased;
    }
  };

  const tick = (timestamp: number) => {
    frameId = 0;
    if (!active || paused) return;
    if (!startedAt) startedAt = timestamp - elapsedBeforePause;
    const elapsed = Math.max(0, timestamp - startedAt);
    const progress = clamp01(elapsed / duration);
    apply(progress);
    // Cap transition updates to ~30 Hz. The viewer remains demand-driven and
    // receives only the frames required to display a changed material.
    if (timestamp - lastRenderAt >= 30 || progress >= 1) {
      lastRenderAt = timestamp;
      onFrame();
    }
    if (progress >= 1) {
      active = false;
      frameId = 0;
      onComplete?.();
      return;
    }
    frameId = requestAnimationFrame(tick);
  };

  const schedule = () => {
    if (!active || paused || frameId) return;
    frameId = requestAnimationFrame(tick);
  };

  apply(0);
  onFrame();
  schedule();
  return {
    pause: () => {
      if (!active || paused) return;
      paused = true;
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
      if (startedAt) elapsedBeforePause = Math.max(0, performance.now() - startedAt);
    },
    resume: () => {
      if (!active || !paused) return;
      paused = false;
      startedAt = performance.now() - elapsedBeforePause;
      schedule();
    },
    cancel: () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
      active = false;
    },
    get active() { return active; },
  };
}
