/**
 * AURUM GEM PHYSICAL CORE
 *
 * Single source of truth for the physical description consumed by the
 * gemstone material, inclusion, phenomenon and luminescence layers.
 *
 * Scientific basis:
 * - GIA, Gems & Gemology Summer 2025: phenomenal effects arise from the
 *   interaction of host structure, inclusions/nanotextures and light.
 * - GIA, Optical Effects of Phenomenal Cabochons: orientation of needles and
 *   cabochon geometry control chatoyancy/asterism.
 *
 * This is deliberately a data/coordination layer, not a claim of full
 * spectral ray tracing. Values not present in the catalog remain explicit
 * approximations so they can be calibrated later without changing the UI.
 */
import * as THREE from "three";

export type AurumGemPhenomenon =
  | "chatoyancy" | "asterism" | "adularescence" | "aventurescence"
  | "labradorescence" | "play-of-color" | "schiller" | "peristerescence"
  | "iridescence" | "orient" | "opalescence" | "overtone";

export type AurumGemPhysicalModel = {
  id:string;
  family:string;
  variant:string;
  optical:{
    ior:number;
    transmission:number;
    absorptionDistance:number;
    dispersion:number;
    iridescence:number;
    bodyColor:THREE.Color;
  };
  crystal:{
    symmetry:"cubic"|"trigonal"|"hexagonal"|"orthorhombic"|"monoclinic"|"tetragonal"|"amorphous"|"unknown";
    axisA:THREE.Vector3;
    axisB:THREE.Vector3;
    axisC:THREE.Vector3;
    orientationSource:"catalog"|"canonical-family";
  };
  structure:{
    inclusionDensity:number;
    inclusionStyle:string;
    phenomenon?:AurumGemPhenomenon;
    phenomenonScaleNm:number;
    dimensionality:0|1|2|3;
    fieldSeed:number;
    fieldScale:number;
    spectralAbsorption:number[];
  };
  luminescence:{
    fluorescenceStrength:number;
    uv365:boolean;
    uv254:boolean;
    phosphorescence:boolean;
  };
  treatment:{
    heat:number;
    filling:number;
    coating:number;
  };
  thicknessScale:number;
  gemological:{specificGravity:number;hardnessMohs:number;isotropic:boolean;chemicalFormula:string};
};

const normalize=(v:THREE.Vector3)=>v.clone().normalize();

const canonicalCrystal=(family:string)=>{
  // Canonical frames describe the host symmetry, not the cut orientation.
  // The actual cut remains in the mesh transform. Catalog-provided axes can
  // replace these defaults when measured crystallographic orientation exists.
  const f=family.toLowerCase();
  if(f.includes("diamante")||f.includes("espinela")||f.includes("granate"))
    return {symmetry:"cubic" as const,a:new THREE.Vector3(1,0,0),b:new THREE.Vector3(0,1,0),c:new THREE.Vector3(0,0,1)};
  if(f.includes("zafiro")||f.includes("rubí")||f.includes("esmeralda"))
    return {symmetry:"trigonal" as const,a:new THREE.Vector3(1,0,0),b:new THREE.Vector3(-.5,.8660254,0),c:new THREE.Vector3(0,0,1)};
  if(f.includes("tanzanita")||f.includes("crisoberilo"))
    return {symmetry:"orthorhombic" as const,a:new THREE.Vector3(1,0,0),b:new THREE.Vector3(0,1,0),c:new THREE.Vector3(0,0,1)};
  if(f.includes("turmalina")||f.includes("cuarzo"))
    return {symmetry:"trigonal" as const,a:new THREE.Vector3(1,0,0),b:new THREE.Vector3(-.5,.8660254,0),c:new THREE.Vector3(0,0,1)};
  if(f.includes("zircon"))
    return {symmetry:"tetragonal" as const,a:new THREE.Vector3(1,0,0),b:new THREE.Vector3(0,1,0),c:new THREE.Vector3(0,0,1)};
  if(f.includes("perla")||f.includes("opal")||f.includes("ópalo"))
    return {symmetry:"amorphous" as const,a:new THREE.Vector3(1,0,0),b:new THREE.Vector3(0,1,0),c:new THREE.Vector3(0,0,1)};
  return {symmetry:"unknown" as const,a:new THREE.Vector3(1,0,0),b:new THREE.Vector3(0,1,0),c:new THREE.Vector3(0,0,1)};
};

export const resolveAurumGemPhysicalModel=(g:any):AurumGemPhysicalModel=>{
  const family=String(g?.familia??"Gema");
  const phenomenon=g?.fenomenoOptico as AurumGemPhenomenon|undefined;
  const canonical=canonicalCrystal(family);
  const dimensionality:0|1|2|3 =
    phenomenon==="chatoyancy"||phenomenon==="asterism" ? 1 :
    phenomenon==="schiller"||phenomenon==="peristerescence"||phenomenon==="iridescence"||phenomenon==="orient"||phenomenon==="overtone" ? 2 :
    phenomenon==="play-of-color" ? 3 : 0;
  const fluorescenceStrength =
    family==="Rubí" ? .78 :
    family==="Diamante" ? .22 :
    family==="Esmeralda" ? .12 :
    family==="Zafiro" ? .10 :
    family==="Perla" ? .08 :
    family==="Crisoberilo" ? .28 : 0;
  return {
    id:String(g?.id??"gema"),
    family,
    variant:String(g?.nombre??g?.id??"Natural"),
    optical:{
      ior:Number(g?.ior??1.5),
      transmission:Number(g?.transmission??.85),
      absorptionDistance:Number(g?.attenuationDistance??10),
      dispersion:Number(g?.dispersion??0),
      iridescence:Number(g?.iridescence??0),
      bodyColor:new THREE.Color(Number(g?.color??0xffffff)),
    },
    crystal:{
      symmetry:canonical.symmetry,
      axisA:normalize(canonical.a),
      axisB:normalize(canonical.b),
      axisC:normalize(canonical.c),
      orientationSource:"canonical-family",
    },
    structure:{
      inclusionDensity:Math.max(0,Math.min(1,Number(g?.inclusionStrength??0))),
      inclusionStyle:String(g?.inclusionStyle??"ninguna"),
      ...(phenomenon?{phenomenon}:{}),
      phenomenonScaleNm:Number(g?.phenomenonScaleNm??170),
      dimensionality,
      fieldSeed:(Number(g?.id?.length??7)*2654435761)>>>0,
      fieldScale:Math.max(.05,Math.min(1.0,Number(g?.inclusionStrength??0)+.18)),
      // Compact 12-band absorption scaffold (400–730 nm). Catalog RGB values
      // remain the visual baseline until measured spectra are supplied.
      spectralAbsorption:Array.from({length:12},(_,i)=>Math.max(0,Math.min(1,
        (1-Number(g?.transmission??.85))*(.65+.35*Math.sin((i+1)*.71+(Number(g?.color??0)%97)))
      ))),
    },
    luminescence:{
      fluorescenceStrength,
      uv365:true,
      uv254:true,
      phosphorescence:false,
    },
    treatment:{
      heat:0,
      filling:0,
      coating:0,
    },
    thicknessScale:Number(g?.thicknessScale??1),
    gemological:family==="Diamante"
      ? {specificGravity:3.52,hardnessMohs:10,isotropic:true,chemicalFormula:"C"}
      : {specificGravity:Number(g?.specificGravity??0),hardnessMohs:Number(g?.hardnessMohs??0),isotropic:canonical.symmetry==="cubic",chemicalFormula:String(g?.chemicalFormula??"")},
  };
};

/**
 * Attach the resolved model to a material so every downstream AURUM layer can
 * consume the same physical state without duplicating family-specific rules.
 */
export const attachAurumGemPhysicalModel=(material:any,model:AurumGemPhysicalModel)=>{
  if(!material)return;
  material.userData={
    ...(material.userData??{}),
    aurumGemPhysicalModel:{
      ...model,
      optical:{...model.optical,bodyColor:model.optical.bodyColor.getHex()},
      crystal:{
        ...model.crystal,
        axisA:model.crystal.axisA.toArray(),
        axisB:model.crystal.axisB.toArray(),
        axisC:model.crystal.axisC.toArray(),
      },
    },
  };
};


/**
 * Returns the normalized internal-structure metadata used by shader/inclusion
 * layers. The field is procedural until a measured CT/micrograph-derived field
 * is available; it is deterministic per gemstone id.
 */
export const getAurumGemStructureField=(model:AurumGemPhysicalModel,position:THREE.Vector3)=>{
  const s=(model.structure.fieldSeed>>>0)||1;
  const p=position.clone().multiplyScalar(6+model.structure.fieldScale*14);
  const n=Math.sin(p.x*12.9898+p.y*78.233+p.z*37.719+(s%997))*43758.5453;
  const cell=n-Math.floor(n);
  return Math.max(0,Math.min(1,cell*model.structure.fieldScale));
};
