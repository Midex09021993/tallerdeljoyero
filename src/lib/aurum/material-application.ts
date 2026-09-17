import * as THREE from "three";
import {
  applyAurumMetal,
  applyAurumGem,
  applyAurumOpticalProfile,
  applyAurumDiamondOptics,
  getAurumOpticalProfile,
  metalPresetFromConfig,
} from "../aurum-material-engine";
import { renderAurumInclusions, clearAurumInclusions } from "./gems";

const inclusionTypeFromCatalog=(style:string|undefined)=>
  style==="diamante" ? "crystal" : style==="silk" ? "silk" : style==="velos" ? "veil" : "none";

const presetFromCatalog=(g:any)=>({
  id:String(g.id??"gema"),
  familia:String(g.familia??"Gema"),
  variante:String(g.nombre??g.id??"Natural"),
  color:Number(g.color??0xffffff),
  transmission:Number(g.transmission??1),
  ior:Number(g.ior??1.5),
  roughness:Number(g.roughness??.03),
  envMapIntensity:Number(g.envMapIntensity??1),
  attenuationColor:Number(g.attenuationColor??g.color??0xffffff),
  attenuationDistance:Number(g.attenuationDistance??10),
  dispersion:Number(g.dispersion??0),
  iridescence:Number(g.iridescence??0),
  thicknessScale:1,
  inclusions:Boolean(g.inclusionStrength>0 && g.inclusionStyle!=="ninguna"),
  inclusionDensity:Math.max(0,Math.min(1,Number(g.inclusionStrength??0))),
  inclusionType:inclusionTypeFromCatalog(g.inclusionStyle),
});

const opticalProfileFromCatalog=(g:any)=>{
  const knownFamilies=new Set(["Diamante","Moissanita","Esmeralda","Rubí","Zafiro"]);
  const base=knownFamilies.has(String(g.familia))
    ? getAurumOpticalProfile(String(g.familia))
    : {
        ior:Number(g.ior??1.5),
        transmission:Number(g.transmission??.85),
        dispersion:Number(g.dispersion??0),
        absorptionDistance:Number(g.attenuationDistance??10),
        internalReflection:.80,
        facetContrast:.90,
        brilliance:.75,
        fire:.35,
      };

  // The catalog is authoritative for the physical values of the selected stone.
  // This prevents Amethyst/Citrine/Topaz and other catalog gems from inheriting
  // the Diamond fallback profile.
  return {
    ...base,
    ior:Number(g.ior??base.ior),
    transmission:Number(g.transmission??base.transmission),
    dispersion:Number(g.dispersion??base.dispersion),
    absorptionDistance:Number(g.attenuationDistance??base.absorptionDistance),
  };
};

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
  const preset = presetFromCatalog(gemConfig);
  const opticalProfile = opticalProfileFromCatalog(gemConfig);
  const apply = (base:any) => {
    const next = base?.clone ? base.clone() : new THREE.MeshPhysicalMaterial();
    applyAurumGem(next, preset, thickness);
    applyAurumOpticalProfile(next, opticalProfile);
    if (preset.familia === "Diamante") applyAurumDiamondOptics(next);
    return next;
  };
  targets.forEach((part:any)=>{
    part.material = Array.isArray(part.material) ? part.material.map(apply) : apply(part.material);
    renderAurumInclusions(THREE, part, gemConfig, 9173, preset);
  });
  applyGemEnvironment();
}

export function clearAurumGemFromTarget(target:any) {
  if (target) clearAurumInclusions(target);
}
