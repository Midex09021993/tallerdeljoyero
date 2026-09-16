import * as THREE from "three";

export function applyAurumInitialModelMaterials(
  model:any,
  options:{
    gems:any[];
    metals:any[];
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
      const gem=options.gems[0];
      if(!gem) return;
      const m=new THREE.MeshPhysicalMaterial();
      const box=new THREE.Box3().setFromObject(x);
      const size=box.getSize(new THREE.Vector3());
      options.applyGem(m,options.gemPresetFromConfig(gem),Math.min(size.x,size.y,size.z)*.85);
      x.material=m;
      options.createInclusions(x,gem);
      options.applyGemEnvironment();
    }else if(meta?.categoria==="metal"){
      const metal=options.metals[0];
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
