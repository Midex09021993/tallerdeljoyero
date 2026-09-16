import * as THREE from "three";
import { applyAurumOpticalProfile, applyAurumDiamondOptics, getAurumOpticalProfile } from "../aurum-material-engine";

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
  model?.traverse?.((x:any)=>{
    if(!x.isMesh) return;
    x.castShadow=true;
    x.receiveShadow=true;
    const meta=x.userData?.aurumRhino;
    if(meta?.categoria==="gema"){
      // First-load presentation is intentionally uniform, like a product-preview render:
      // every MatrixGold gem layer starts as diamond. MatrixGold slots are used only
      // when the user changes the material/gem after selection.
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
      // Initial product presentation uses the existing metal presets,
      // but attenuates only the first-load reflection energy. User-selected
      // materials later restore their catalog values.
      const envScale = options.presentation?.metalEnvironmentScale ?? 1;
      const coatScale = options.presentation?.metalClearcoatScale ?? 1;
      if (Number.isFinite(envScale)) mat.envMapIntensity = Math.max(0, (mat.envMapIntensity ?? 1) * envScale);
      if (Number.isFinite(coatScale)) mat.clearcoat = Math.max(0, (mat.clearcoat ?? 0) * coatScale);
      mat.needsUpdate = true;
      x.material=mat;
    }else{
      x.material=options.fallbackMaterial;
    }
  });
}
