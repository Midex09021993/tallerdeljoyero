import * as THREE from "three";
import {
  applyAurumMetal,
  applyAurumGem,
  applyAurumOpticalProfile,
  applyAurumDiamondOptics,
  getAurumGemPreset,
  getAurumOpticalProfile,
  metalPresetFromConfig,
} from "../aurum-material-engine";
import { renderAurumInclusions, clearAurumInclusions } from "../aurum-gem-engine";

export function applyAurumMaterialToModel(
  model:any,
  activePart:any,
  materialConfig:any,
  sharedMaterial:any
) {
  applyAurumMetal(sharedMaterial, metalPresetFromConfig(materialConfig));
  model?.traverse?.((x:any) => {
    if (!x.isMesh) return;
    x.castShadow = true;
    x.receiveShadow = true;
    if (!activePart || x.uuid === activePart.uuid) {
      const apply = (base:any) => {
        const next = base?.clone ? base.clone() : sharedMaterial.clone();
        applyAurumMetal(next, metalPresetFromConfig(materialConfig));
        return next;
      };
      x.material = Array.isArray(x.material)
        ? x.material.map(apply)
        : activePart ? apply(x.material) : sharedMaterial;
    }
  });
}

export function applyAurumGemToTarget(
  target:any,
  gemConfig:any,
  applyGemEnvironment:()=>void
) {
  if (!target) return;
  const box = new THREE.Box3().setFromObject(target);
  const size = box.getSize(new THREE.Vector3());
  const thickness = Math.max(0.015, Math.min(size.x,size.y,size.z) * 0.85);
  const apply = (base:any) => {
    const next = base?.clone ? base.clone() : new THREE.MeshPhysicalMaterial();
    const preset = getAurumGemPreset(gemConfig.id as string);
    applyAurumGem(next, preset, thickness);
    applyAurumOpticalProfile(next, getAurumOpticalProfile(preset.familia));
    if (preset.familia === "Diamante") applyAurumDiamondOptics(next);
    return next;
  };
  target.material = Array.isArray(target.material)
    ? target.material.map(apply)
    : apply(target.material);
  renderAurumInclusions(THREE, target, gemConfig, 9173);
  applyGemEnvironment();
}

export function clearAurumGemFromTarget(target:any) {
  if (target) clearAurumInclusions(target);
}
