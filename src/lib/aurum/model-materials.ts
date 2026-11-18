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

// Reversible A/B experiment: apply DoubleSide to every mesh classified as metal.
// Activated only by an explicit URL flag; gemstones and other objects are unchanged.
function isAurumMetalDoubleSideDiagnostic(){
  try {
    return new URLSearchParams(window.location.search).get("aurumMetalDoubleSide")==="on";
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
function resolveInitialRhinoLayer(model:any, mesh:any){
  const root=model?.userData??{};
  const layers=[
    root.aurumRhinoSourceLayers,
    root.layers,
    root.rhinoLayers,
  ].find((value:any)=>Array.isArray(value)&&value.length)??[];
  const meta=mesh?.userData?.aurumRhino??{};
  const source=mesh?.userData?.aurumRhinoSource??{};
  const instance=mesh?.userData?.aurumRhinoInstanceSource??{};
  const attrs=mesh?.userData?.attributes??{};
  const rawIndex=instance.layerIndex??source.layerIndex??attrs.layerIndex??attrs.LayerIndex??mesh?.userData?.layerIndex??mesh?.userData?.LayerIndex??meta.layerIndex;
  const layerIndex=rawIndex===null||rawIndex===undefined||rawIndex===""?-1:Number(rawIndex);
  const layerId=instance.layerId??source.layerId??attrs.layerId??attrs.LayerId??mesh?.userData?.layerId??mesh?.userData?.LayerId??meta.rhinoLayerId;
  const explicitName=instance.layerName??source.layerName??attrs.layerName??attrs.LayerName??mesh?.userData?.layerName??mesh?.userData?.LayerName??meta.capa;
  let layer=Number.isInteger(layerIndex)&&layerIndex>=0?layers[layerIndex]:undefined;
  if(!layer&&layerId!=null)layer=layers.find((item:any)=>String(item?.id??item?.Id??"")===String(layerId));
  if(!layer&&explicitName)layer=layers.find((item:any)=>String(item?.name??item?.Name??"").trim().toLocaleLowerCase()===String(explicitName).trim().toLocaleLowerCase());
  const layerName=String(layer?.name??layer?.Name??explicitName??"").trim();
  return {layer,layerName,layerIndex:Number.isInteger(layerIndex)&&layerIndex>=0?layerIndex:(layer?layers.indexOf(layer):-1),layerId:layer?.id??layer?.Id??layerId??null};
}

function inferInitialLayerCategory(layerName:string):"gema"|"metal"|undefined{
  const name=String(layerName??"").trim().toLocaleLowerCase().replace(/[_-]+/g," ").replace(/\\s+/g," ");
  // Gem 01, Gem_02, Gema 03, Piedra 01 and Stone 01 are explicit CAD layer
  // conventions. Do not classify prongs, settings, or other jewelry geometry.
  if(/^(?:gem|gema|piedra|stone)(?:\\s*0*\\d+)?$/.test(name))return "gema";
  if(/^(?:metal|metales|oro|gold|plata|silver|platino|platinum|metalico|metálico)(?:\\s*0*\\d+)?$/.test(name))return "metal";
  return undefined;
}

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
    initialGemByLayer?:Record<string,string>;
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
    const existingMeta=x.userData?.aurumRhino??{};
    const sourceLayer=resolveInitialRhinoLayer(model,x);
    const inferredCategory=inferInitialLayerCategory(sourceLayer.layerName);
    // Preserve explicit CAD/user assignments. Only hydrate a missing/unknown
    // category from a clearly named source layer such as "Gem 01".
    const category=existingMeta.categoria==="gema"||existingMeta.categoria==="metal"
      ? existingMeta.categoria
      : inferredCategory??"otro";
    const meta={
      ...existingMeta,
      ...(sourceLayer.layerName?{capa:sourceLayer.layerName}:{}),
      ...(sourceLayer.layerIndex>=0?{layerIndex:sourceLayer.layerIndex}:{}),
      ...(sourceLayer.layerId!=null?{rhinoLayerId:sourceLayer.layerId}:{}),
      ...(category!=="otro"?{categoria:category}:{}),
    };
    if(category!=="otro"||sourceLayer.layerName){
      x.userData={...(x.userData??{}),aurumRhino:meta};
    }
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
      // Preserve the imported GLB/CAD material unless this layer has an explicit
      // saved/catalog gem assignment. Never guess that every unassigned gem is a diamond.
      captureAurumSourceMaterials(x);
      const layerKey=String(meta?.layerKey??"");
      const savedAssignments=model.userData?.aurumGemLayerAssignments??{};
      const layerName=String(meta?.capa??meta?.layerName??"").trim();
      const layerNameKey=layerName ? "rhino-layer:"+encodeURIComponent(layerName.toLocaleLowerCase()) : "";
      const layerIndex=meta?.indice??meta?.layerIndex??null;
      const layerId=String(meta?.rhinoLayerId??meta?.layerId??"").trim();
      const layerIndexKey=layerIndex!=null ? "rhino-index:"+String(layerIndex) : "";
      const layerIdKey=layerId ? "rhino-id:"+layerId : "";
      // Gem application stores assignments using a canonical layer key, while
      // imported GLB metadata may retain a different key format. Resolve by
      // stable layer identity before considering explicit source metadata.
      const savedAssignment=
        savedAssignments[layerKey] ??
        (layerNameKey ? savedAssignments[layerNameKey] : undefined) ??
        (layerIndexKey ? savedAssignments[layerIndexKey] : undefined) ??
        (layerIdKey ? savedAssignments[layerIdKey] : undefined) ??
        Object.values(savedAssignments).find((assignment:any) =>
          (layerName && String(assignment?.layerName??"").trim().toLocaleLowerCase()===layerName.toLocaleLowerCase()) ||
          (layerIndex!=null && assignment?.layerIndex!=null && String(assignment.layerIndex)===String(layerIndex)) ||
          (layerId && String(assignment?.layerId??"").trim()===layerId)
        );
      const assignedGemId=String(savedAssignment?.gemId??options.initialGemByLayer?.[layerKey]??(layerNameKey ? options.initialGemByLayer?.[layerNameKey] : "")??meta?.gemId??"");
      const initialGemId=assignedGemId || String(options.initialGemId??"");
      const gem=initialGemId ? options.gems.find((g:any)=>g.id===initialGemId) : undefined;
      if(!gem) {
        x.userData={...(x.userData??{}),aurumActiveGemId:"",aurumActiveGemFamily:""};
        return;
      }
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
        aurumActiveGemId:String(gem.id??""),
        aurumActiveGemFamily:String(gem.familia??"").toLocaleLowerCase(),
        aurumInitialLayerGemId:String(gem.id??""),
      };
      m.userData={
        ...(m.userData??{}),
        aurumGemFamily:String(gem.familia??"").toLocaleLowerCase(),
        aurumActiveGemId:String(gem.id??""),
      };
      // Procedural inclusions are deferred to CAPTURE. Creating dozens of
      // transparent meshes during every model load is unnecessary for LIVE.
      options.applyGemEnvironment();
    }else if(meta?.categoria==="metal"){
      // Keep recognized imported iJewel/MatrixGold alloy assignments separate.
      // Only source-material names that explicitly identify green gold or white
      // gold override the uniform first-load silver fallback.
      const sourceMaterials=Array.isArray(x.material)?x.material:[x.material];
      const diagnosticDoubleSide=isAurumMetalDoubleSideDiagnostic();
      const resolveInitialMetal=(source:any,mesh:any)=>{
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
        ].filter((value:any)=>typeof value==="string"&&value.trim())
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
        return options.metals.find((m:any)=>m.id===sourceId)
          ?? options.metals.find((m:any)=>m.id===(options.initialMetalId ?? "plata925_pulida"))
          ?? options.metals.find((m:any)=>m.id==="plata925_pulida")
          ?? options.metals[0];
      };
      const configureSourceMaterial=(source:any)=>{
        const metal=resolveInitialMetal(source,x);
        if(!metal)return source?.clone?source.clone():new THREE.MeshPhysicalMaterial();
        const mat=source?.clone?source.clone():new THREE.MeshPhysicalMaterial();
        options.configureMetal(mat,metal);
        const envScale=options.presentation?.metalEnvironmentScale??1;
        const coatScale=options.presentation?.metalClearcoatScale??1;
        if(Number.isFinite(envScale))mat.envMapIntensity=Math.max(0,(mat.envMapIntensity??1)*envScale);
        if(Number.isFinite(coatScale))mat.clearcoat=Math.max(0,(mat.clearcoat??0)*coatScale);
        if(diagnosticDoubleSide)mat.side=THREE.DoubleSide;
        mat.userData={
          ...(mat.userData??{}),
          aurumSourceMetalMaterial:String(source?.name??""),
          aurumInitialMetalProfile:String(metal.id),
          ...(diagnosticDoubleSide?{aurumProngDoubleSideDiagnostic:true}:{}),
        };
        mat.needsUpdate=true;
        return mat;
      };
      x.material=Array.isArray(x.material)
        ? sourceMaterials.map(configureSourceMaterial)
        : configureSourceMaterial(x.material);
    }else{
      // STL has no reliable layer/material metadata. Use neutral gray for
      // unclassified STL meshes; preserve the established 3DM fallback.
      if (model.userData?.aurumSourceFormat === "stl") {
        const stlNeutral = new THREE.MeshPhysicalMaterial({
          color: 0xb8b8b8,
          metalness: 0,
          roughness: 0.42,
          envMapIntensity: 0.5,
          clearcoat: 0.04,
          clearcoatRoughness: 0.12,
        });
        stlNeutral.userData = {
          ...(stlNeutral.userData ?? {}),
          aurumNeutralMaterial: true,
          aurumMaterialAssigned: false,
          aurumSourceFormat: "stl",
        };
        x.material = stlNeutral;
        // STL has no CAD layer metadata, but it must still be eligible for
        // the same catalog metal assignment flow as a 3DM mesh. Mark it as
        // "otro" (not metal/gem) so material-application can target it safely.
        // No shared layer key is added: applying one metal to a selected STL
        // mesh will not unintentionally recolor unrelated meshes.
        x.userData = {
          ...(x.userData ?? {}),
          aurumSourceFormat: "stl",
          aurumDetectedCategory: "otro",
          aurumRhino: {
            ...(x.userData?.aurumRhino ?? {}),
            categoria: "otro",
          },
        };
      } else {
        // Keep the existing fallback unchanged for 3DM and other formats.
        x.material=createAurumNeutralMaterial();
      }
    }
  });
}