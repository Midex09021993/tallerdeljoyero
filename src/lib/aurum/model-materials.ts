import * as THREE from "three";
import {
  applyAurumOpticalProfile,
  applyAurumDiamondOptics,
  getAurumOpticalProfile,
} from "../aurum-material-engine";

function getAurumCategoryDiagnostic(){
  try {
    return new URLSearchParams(window.location.search).get("aurumCategories") === "1";
  } catch {
    return false;
  }
}

function diagnosticMaterial(category:string){
  const colors:{[key:string]:number}={metal:0x00ff00,gema:0x0088ff,otro:0xff00ff};
  const m=new THREE.MeshStandardMaterial({
    color:colors[category] ?? colors.otro,
    metalness:0,
    roughness:.55,
  });
  m.userData={...m.userData,aurumCategoryDiagnostic:true,aurumCategory:category};
  return m;
}

// Material de presentación para objetos/capas "otro".
// No pretende representar un metal ni una gema: identifica visualmente que la
// pieza todavía no tiene material asignado y evita que AURUM la convierta en
// diamante por defecto. El usuario puede reemplazarlo libremente por cualquier
// metal o gema desde las bibliotecas.
function createAurumNeutralMaterial(){
  const m=new THREE.MeshPhysicalMaterial({
    color:0xc98fa7,
    metalness:0,
    roughness:.46,
    envMapIntensity:.35,
    clearcoat:.04,
    clearcoatRoughness:.12,
  });
  m.userData={
    ...(m.userData??{}),
    aurumNeutralMaterial:true,
    aurumMaterialAssigned:false,
  };
  return m;
}

export function applyAurumInitialModelMaterials(
  model:any,
  options:{
    gems:any[];
    metals:any[];
    initialMetalId?:string;
    initialGemId?:string;
    fallbackMaterial:any;
    applyGem:(material:any,preset:any,thickness:number)=>void;
    gemPresetFromConfig:(gem:any)=>any;
    configureMetal:(material:any,metal:any)=>void;
    presentation?:{metalEnvironmentScale?:number; metalClearcoatScale?:number};
    createInclusions:(target:any,gem:any)=>void;
    applyGemEnvironment:()=>void;
  }
){
  const categoryDiagnostic=getAurumCategoryDiagnostic();
  model?.traverse?.((x:any)=>{
    if(!x.isMesh) return;
    x.castShadow=true;
    x.receiveShadow=true;
    const meta=x.userData?.aurumRhino;
    const category=meta?.categoria ?? "otro";

    // Diagnostic-only mode: isolate the classification stage. No HDR,
    // lighting, camera, geometry, normals or production materials are changed.
    // green = metal, blue = gem, magenta = other.
    if(categoryDiagnostic){
      x.material=diagnosticMaterial(category);
      x.userData={
        ...x.userData,
        aurumCategoryDiagnostic:true,
        aurumDetectedCategory:category,
        aurumDetectedLayer:meta?.capa ?? null,
        aurumDetectedMatrixSlot:meta?.matrixSlot ?? null,
      };
      return;
    }

    if(meta?.categoria==="gema"){
      // First-load presentation: only the four MatrixGold gem layers receive
      // the default diamond preview. "Other" layers never enter this branch.
      const initialGemId = options.initialGemId ?? "diamante_natural";
      const gem=options.gems.find((g:any)=>g.id===initialGemId) ?? options.gems.find((g:any)=>g.id==="diamante_natural") ?? options.gems[0];
      if(!gem) return;
      const m=new THREE.MeshPhysicalMaterial();
      const box=new THREE.Box3().setFromObject(x);
      const size=box.getSize(new THREE.Vector3());
      const preset=options.gemPresetFromConfig(gem);
      options.applyGem(m,preset,Math.min(size.x,size.y,size.z)*.85);
      if (preset?.familia) {
        applyAurumOpticalProfile(m,getAurumOpticalProfile(preset.familia));
        if (preset.familia==="Diamante") applyAurumDiamondOptics(m);
      }
      x.material=m;
      options.createInclusions(x,gem);
      options.applyGemEnvironment();
    }else if(meta?.categoria==="metal"){
      // First-load presentation is intentionally uniform: every metal layer starts
      // with the same silver preset. Layer/slot mapping remains available for edits.
      const initialMetalId = options.initialMetalId ?? "plata925_pulida";
      const metal=options.metals.find((m:any)=>m.id===initialMetalId) ?? options.metals.find((m:any)=>m.id==="plata925_pulida") ?? options.metals[0];
      if(!metal) return;
      const mat=x.material?.clone ? x.material.clone() : new THREE.MeshPhysicalMaterial();
      options.configureMetal(mat,metal);
      const envScale = options.presentation?.metalEnvironmentScale ?? 1;
      const coatScale = options.presentation?.metalClearcoatScale ?? 1;
      if (Number.isFinite(envScale)) mat.envMapIntensity = Math.max(0, (mat.envMapIntensity ?? 1) * envScale);
      if (Number.isFinite(coatScale)) mat.clearcoat = Math.max(0, (mat.clearcoat ?? 0) * coatScale);
      mat.needsUpdate = true;
      x.material=mat;
    }else{
      // Neutral placeholder for all remaining layers (purple, cream, yellow,
      // decorative objects, etc.). It is deliberately NOT a gemstone.
      x.material=createAurumNeutralMaterial();
    }
  });
}