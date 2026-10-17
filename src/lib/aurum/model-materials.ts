import * as THREE from "three";
import { captureAurumSourceMaterials } from "./gem-material-baseline";
import {
  applyAurumOpticalProfile,
  applyAurumDiamondOptics,
  getAurumOpticalProfile,
} from "../aurum-material-engine";
import { applyAurumDynamicScintillation } from "./scintillation";

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
    color:colors[category] ?? 0xff00ff,
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

type AurumGemChoice = { id: string; familia?: string };
type AurumMetalChoice = { id: string };
type AurumMeshObject = THREE.Object3D & { isMesh?: boolean; material: THREE.Material | THREE.Material[]; castShadow?: boolean; receiveShadow?: boolean };

export function applyAurumInitialModelMaterials<TGem extends AurumGemChoice, TMetal extends AurumMetalChoice, TPreset>(
  model:THREE.Object3D,
  options:{
    gems:TGem[];
    metals:TMetal[];
    initialMetalId?:string;
    initialGemId?:string;
    initialGemByLayer?:Record<string,string>;
    fallbackMaterial:THREE.Material;
    applyGem:(material:THREE.MeshPhysicalMaterial,preset:TPreset,thickness:number)=>void;
    gemPresetFromConfig:(gem:TGem)=>TPreset;
    configureMetal:(material:THREE.MeshPhysicalMaterial,metal:TMetal)=>void;
    presentation?:{metalEnvironmentScale?:number; metalClearcoatScale?:number};
    createInclusions:(target:THREE.Object3D,gem:TGem)=>void;
    applyGemEnvironment:()=>void;
  }
){
  const categoryDiagnostic=getAurumCategoryDiagnostic();
  model.traverse((node)=>{
    const x = node as AurumMeshObject;
    if(!x.isMesh) return;
    const meta=x.userData?.aurumRhino;
    const category=meta?.categoria ?? "otro";
    // Gem transmission already performs an expensive optical pass. Gems do not
    // need to cast a second shadow pass in the live viewer.
    x.castShadow=category !== "gema";
    x.receiveShadow=true;

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
      // Capture the original imported GLB/CAD material before applying the default diamond preview.
      captureAurumSourceMaterials(x);
      // First-load presentation: only the four MatrixGold gem layers receive
      // the default diamond preview. "Other" layers never enter this branch.
      const layerKey=String(meta?.layerKey??"");
      const savedAssignments=model.userData?.aurumGemLayerAssignments??{};
      const assignedGemId=String(savedAssignments[layerKey]?.gemId??options.initialGemByLayer?.[layerKey]??meta?.gemId??"");
      const initialGemId=assignedGemId||options.initialGemId||"diamante_natural";
      const gem=options.gems.find((g)=>g.id===initialGemId)??options.gems.find((g:any)=>g.id==="diamante_natural")??options.gems[0];
      if(!gem) return;
      const m=new THREE.MeshPhysicalMaterial();
      const box=new THREE.Box3().setFromObject(x);
      const size=box.getSize(new THREE.Vector3());
      const preset=options.gemPresetFromConfig(gem);
      options.applyGem(m,preset,Math.min(size.x,size.y,size.z)*.85);
      if (preset?.familia) {
        applyAurumOpticalProfile(m,getAurumOpticalProfile(preset.familia));
        if (preset.familia==="Diamante") {
          applyAurumDiamondOptics(m);
          m.userData={
            ...(m.userData??{}),
            aurumIJEWELActive:true,
            aurumDiamondShaderMode:"native-ijewel-approx-v1",
          };
          applyAurumDynamicScintillation(m,getAurumOpticalProfile(preset.familia));
        }
      }
      x.material=m;
      x.userData={
        ...(x.userData??{}),
        aurumActiveGemId:String(gem.id??"diamante_natural"),
        aurumInitialLayerGemId:String(gem.id??"diamante_natural"),
      };
      // Procedural inclusions are deferred to CAPTURE. Creating dozens of
      // transparent meshes during every model load is unnecessary for LIVE.
      options.applyGemEnvironment();
    }else if(meta?.categoria==="metal"){
      // Keep recognized imported iJewel/MatrixGold alloy assignments separate.
      // Only source-material names that explicitly identify green gold or white
      // gold override the uniform first-load silver fallback.
      const sourceMaterials=Array.isArray(x.material)?x.material:[x.material];
      const resolveInitialMetal=(source:THREE.Material,mesh:AurumMeshObject)=>{
        // Alloy identity may be stored on the imported material, mesh, or CAD
        // layer. Inspect all explicit labels so a generic material name does
        // not hide a more useful source-layer name.
        const sourceMeta=source?.userData??{};
        const meshMeta=mesh?.userData??{};
        const attributes=meshMeta?.attributes??{};
        const rhino=meshMeta?.aurumRhino??{};
        const sourceLabel=[
          source?.name,
          sourceMeta?.name,
          sourceMeta?.materialName,
          sourceMeta?.sourceRootPath,
          sourceMeta?.sourceFile,
          sourceMeta?.originalMaterialName,
          mesh?.name,
          rhino?.capa,
          rhino?.layerName,
          attributes?.layerName,
          attributes?.LayerName,
          meshMeta?.layerName,
          meshMeta?.LayerName,
        ].filter((value): value is string => typeof value==="string"&&Boolean(value.trim()))
          .join(" ")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g,"");
        const key=sourceLabel.replace(/[^a-z0-9]+/g,"");
        const sourceId=key.includes("greengold")||key.includes("oro18verde")||key.includes("oroverde")
          ? "oro18_verde"
          : key.includes("whitegold")||key.includes("oroblanco")
            ? "oro18b_pulido"
            : options.initialMetalId ?? "plata925_pulida";
        return options.metals.find((m)=>m.id===sourceId)
          ?? options.metals.find((m:any)=>m.id===(options.initialMetalId ?? "plata925_pulida"))
          ?? options.metals.find((m:any)=>m.id==="plata925_pulida")
          ?? options.metals[0];
      };
      const configureSourceMaterial=(source:THREE.Material)=>{
        const metal=resolveInitialMetal(source,x);
        if(!metal)return source?.clone?source.clone():new THREE.MeshPhysicalMaterial();
        const mat=(source?.clone?source.clone():new THREE.MeshPhysicalMaterial()) as THREE.MeshPhysicalMaterial;
        options.configureMetal(mat,metal);
        const envScale=options.presentation?.metalEnvironmentScale??1;
        const coatScale=options.presentation?.metalClearcoatScale??1;
        if(Number.isFinite(envScale))mat.envMapIntensity=Math.max(0,(mat.envMapIntensity??1)*envScale);
        if(Number.isFinite(coatScale))mat.clearcoat=Math.max(0,(mat.clearcoat??0)*coatScale);
        mat.userData={
          ...(mat.userData??{}),
          aurumSourceMetalMaterial:String(source?.name??""),
          aurumInitialMetalProfile:String(metal.id),
        };
        mat.needsUpdate=true;
        return mat;
      };
      x.material=Array.isArray(x.material)
        ? sourceMaterials.map(configureSourceMaterial)
        : configureSourceMaterial(x.material);
    }else{
      // Neutral placeholder for all remaining layers (purple, cream, yellow,
      // decorative objects, etc.). It is deliberately NOT a gemstone.
      x.material=createAurumNeutralMaterial();
    }
  });
}