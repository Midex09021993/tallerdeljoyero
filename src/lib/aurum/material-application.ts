import * as THREE from "three";
import {
  applyAurumMetal,
  applyAurumGem,
  applyAurumOpticalProfile,
  applyAurumDiamondOptics,
  getAurumOpticalProfile,
  metalPresetFromConfig,
} from "../aurum-material-engine";
import { applyAurumFamilyOpticalResponse } from "./optical-response";
import { applyAurumDynamicScintillation } from "./scintillation";
import { applyAurumInternalLightResponse } from "./internal-light-response";
import { renderAurumInclusions, clearAurumInclusions } from "./gems";
import { applyAurumLatinGemProfile } from "./latin-gem-catalog";

const inclusionTypeFromCatalog=(style:string|undefined)=>
  style==="diamante" ? "crystal" : style==="silk" ? "silk" : style==="velos" ? "veil" : "none";

const presetFromCatalog=(g:any):any=>({
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
  return {
    ...base,
    ior:Number(g.ior??base.ior),
    transmission:Number(g.transmission??base.transmission),
    dispersion:Number(g.dispersion??base.dispersion),
    absorptionDistance:Number(g.attenuationDistance??base.absorptionDistance),
  };
};

const selectionMeta=(part:any)=>part?.userData?.aurumRhino||{};
const selectionCategory=(part:any)=>String(selectionMeta(part).categoria||"").toLowerCase();

export function applyAurumMaterialToModel(
  model:any,
  activePart:any,
  materialConfig:any,
  sharedMaterial:any
) {
  // Material assignment is layer-based for every layer, including the free-form "other" layers.
  // A missing selection never means "apply to the whole model".
  if (!model || !activePart?.isMesh) return false;

  const selectedMeta = selectionMeta(activePart);
  const selectedLayer = selectedMeta.capa || activePart?.userData?.attributes?.layerName || null;
  const selectedCategory = selectionCategory(activePart);
  const selectedSlot = selectedMeta.matrixSlot;

  if (selectedCategory !== "metal" && selectedCategory !== "otro") return false;

  applyAurumMetal(sharedMaterial, metalPresetFromConfig(materialConfig));
  let applied = 0;
  model.traverse((x:any) => {
    if (!x.isMesh) return;
    x.castShadow = true;
    x.receiveShadow = true;
    const meta = selectionMeta(x);
    const category = selectionCategory(x);
    const sameLayer = !!selectedLayer && meta.capa === selectedLayer && category === selectedCategory;
    const sameSlot = selectedSlot != null && meta.matrixSlot === selectedSlot && category === selectedCategory;
    const shouldApply = x.uuid === activePart.uuid
      || (selectedCategory === "otro" && sameLayer)
      || (selectedCategory === "metal" && (sameLayer || sameSlot));
    if (shouldApply) {
      const apply = (base:any) => {
        const next = base?.clone ? base.clone() : sharedMaterial.clone();
        applyAurumMetal(next, metalPresetFromConfig(materialConfig));
        return next;
      };
      x.material = Array.isArray(x.material) ? x.material.map(apply) : apply(x.material);
      applied++;
    }
  });
  return applied>0;
}

export function applyAurumGemToTarget(
  target:any,
  gemConfig:any,
  applyGemEnvironment:()=>void
) {
  // Gem assignment is layer-based for every layer, including the free-form "other" layers.
  if (!target?.isMesh) return false;
  const selectedCategory=selectionCategory(target);
  if (selectedCategory !== "gema" && selectedCategory !== "otro") return false;

  const modelRoot = target.parent?.parent ? (()=>{ let r=target; while(r.parent) r=r.parent; return r; })() : target;
  const selectedMeta = selectionMeta(target);
  const selectedLayer = selectedMeta.capa || target.userData?.attributes?.layerName || null;
  const selectedSlot = selectedMeta.matrixSlot;
  const targets:any[] = [];
  modelRoot?.traverse?.((x:any)=>{
    if (!x.isMesh || x.userData?.aurumInternalInclusion) return;
    const meta=selectionMeta(x);
    const category=selectionCategory(x);
    const sameLayer = !!selectedLayer && meta.capa === selectedLayer && category === selectedCategory;
    const sameSlot = selectedSlot != null && meta.matrixSlot === selectedSlot && category === selectedCategory;
    if(x===target || (selectedCategory === "otro" && sameLayer) || (selectedCategory === "gema" && (sameLayer || sameSlot))) targets.push(x);
  });
  if(!targets.length) targets.push(target);
  const box = new THREE.Box3().setFromObject(target);
  const size = box.getSize(new THREE.Vector3());
  const thickness = Math.max(0.015, Math.min(size.x,size.y,size.z) * 0.85);
  const preset:any = presetFromCatalog(gemConfig);
  const opticalProfile = opticalProfileFromCatalog(gemConfig);
  const apply = (base:any) => {
    const next = base?.clone ? base.clone() : new THREE.MeshPhysicalMaterial();
    applyAurumGem(next, preset, thickness);
    applyAurumOpticalProfile(next, opticalProfile);
    applyAurumFamilyOpticalResponse(next, opticalProfile);
    applyAurumInternalLightResponse(next, opticalProfile, thickness);
    applyAurumDynamicScintillation(next, opticalProfile);
    if (preset.familia === "Diamante") applyAurumDiamondOptics(next);
    next.flatShading = true;
    next.needsUpdate = true;
    return next;
  };
  targets.forEach((part:any)=>{
    part.material = Array.isArray(part.material) ? part.material.map(apply) : apply(part.material);
    part.userData = {
      ...part.userData,
      aurumFacetNormalsApplied:true,
      aurumFacetNormalMode:"flatShading",
    };
    renderAurumInclusions(THREE, part, gemConfig, 9173, preset);
    applyAurumLatinGemProfile(part, gemConfig);
  });
  applyGemEnvironment();
  return true;
}

export function clearAurumGemFromTarget(target:any) {
  if (target) clearAurumInclusions(target);
}
