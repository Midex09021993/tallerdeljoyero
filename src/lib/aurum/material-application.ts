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
import { renderAurumInclusions, clearAurumInclusions } from "./gems";

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
    // MatrixGold semantics: a selected part represents its entire source layer.
    // Apply to every mesh with the same Rhino layer (and, when present, MatrixGold slot).
    const selectedMeta = activePart?.userData?.aurumRhino || {};
    const selectedLayer = selectedMeta.capa || activePart?.userData?.attributes?.layerName || null;
    const selectedCategory = selectedMeta.categoria || null;
    const selectedSlot = selectedMeta.matrixSlot;
    const meta = x.userData?.aurumRhino || {};
    const sameLayer = !!activePart && selectedLayer && meta.capa === selectedLayer;
    const sameSlot = !!activePart && selectedSlot != null && meta.matrixSlot === selectedSlot && meta.categoria === selectedCategory;
    if (!activePart || x.uuid === activePart.uuid || sameLayer || sameSlot) {
      const apply = (base:any) => {
        const next = base?.clone ? base.clone() : sharedMaterial.clone();
        applyAurumMetal(next, metalPresetFromConfig(materialConfig));
        return next;
      };
      x.material = Array.isArray(x.material) ? x.material.map(apply) : apply(x.material);
    }
  });
}

export function applyAurumGemToTarget(
  target:any,
  gemConfig:any,
  applyGemEnvironment:()=>void
) {
  if (!target) return;
  const modelRoot = target.parent?.parent ? (()=>{ let r=target; while(r.parent) r=r.parent; return r; })() : target;
  const selectedMeta = target.userData?.aurumRhino || {};
  const selectedLayer = selectedMeta.capa || target.userData?.attributes?.layerName || null;
  const selectedCategory = selectedMeta.categoria || null;
  const selectedSlot = selectedMeta.matrixSlot;
  const targets:any[] = [];
  modelRoot?.traverse?.((x:any)=>{
    if (!x.isMesh || x.userData?.aurumInternalInclusion) return;
    const meta=x.userData?.aurumRhino || {};
    const sameLayer=!!selectedLayer && meta.capa===selectedLayer;
    const sameSlot=selectedSlot!=null && meta.matrixSlot===selectedSlot && meta.categoria===selectedCategory;
    if(x===target || sameLayer || sameSlot) targets.push(x);
  });
  if(!targets.length) targets.push(target);
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
  targets.forEach((part:any)=>{
    part.material = Array.isArray(part.material) ? part.material.map(apply) : apply(part.material);
    renderAurumInclusions(THREE, part, gemConfig, 9173);
  });
  applyGemEnvironment();
}

export function clearAurumGemFromTarget(target:any) {
  if (target) clearAurumInclusions(target);
}
