import * as THREE from "three";
import { resolveAurumLayerKey } from "./layer-identity";
import { getAurumSourceMaterials, hadAurumSourceMaterialArray } from "./gem-material-baseline";
import {
  applyAurumMetal,
  applyAurumGem,
  applyAurumOpticalProfile,
  applyAurumDiamondOptics,
  applyAurumReferenceGemOptics,
  applyAurumReferenceMetalOptics,
  applyAurumIJEWELReferenceFromMaterial,
  getAurumOpticalProfile,
  metalPresetFromConfig,
  type AurumGemPreset,
  type AurumMetalPreset,
} from "../aurum-material-engine";
import { applyAurumFamilyOpticalResponse } from "./optical-response";
import { applyAurumDynamicScintillation } from "./scintillation";
import { activateAurumDiamondMaterial } from "./aurum-diamond-material";
import { applyAurumInternalLightResponse } from "./internal-light-response";
import { renderAurumInclusions, clearAurumInclusions } from "./gems";
import { applyAurumLatinGemProfile } from "./latin-gem-catalog";
import { buildAurumThicknessMap } from "./thickness-map";
import { resolveAurumGemPhysicalModel, attachAurumGemPhysicalModel } from "./gem-physical-core";
import { getAurumDiamondPipelineDiagnostics } from "./aurum-diamond-pipeline";

type AurumGemCatalogEntry = { id?:string; familia?:string; nombre?:string; color?:number; transmission?:number; ior?:number; roughness?:number; envMapIntensity?:number; attenuationColor?:number; attenuationDistance?:number; dispersion?:number; iridescence?:number; thicknessScale?:number; inclusionStrength?:number; inclusionStyle?:string; perfilInterno?:string; fenomenoOptico?:string; phenomenonScaleNm?:number; };
type AurumMeshTarget = THREE.Object3D & { isMesh?:boolean; geometry?:THREE.BufferGeometry; material?:THREE.Material | THREE.Material[] };

const inclusionTypeFromCatalog=(style:string|undefined)=>
  style==="diamante" ? "crystal" : style==="silk" ? "silk" : style==="velos" ? "veil" : "none";

const presetFromCatalog=(g:AurumGemCatalogEntry):AurumGemPreset=>({
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
  thicknessScale:Number(g.thicknessScale??1),
  inclusions:Boolean(g.inclusionStrength>0 && g.inclusionStyle!=="ninguna"),
  inclusionDensity:Math.max(0,Math.min(1,Number(g.inclusionStrength??0))),
  inclusionType:inclusionTypeFromCatalog(g.inclusionStyle),
});

const opticalProfileFromCatalog=(g:AurumGemCatalogEntry)=>{
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
  const family=String(g.familia??"");
  const gemId=String(g.id??"");
  const pleochroism=(family==="Tanzanita"||family==="Turmalina"||family==="Peridoto"||family==="Morganita"||family==="Zafiro")
    ? {
        enabled:true,
        strength:family==="Tanzanita" ? (gemId==="tanzanita_natural"?.42:.36)
          : family==="Turmalina" ? .30
          : family==="Morganita" ? .24
          : family==="Zafiro" ? .20
          : .16,
        thirdAxisStrength:family==="Tanzanita" ? (gemId==="tanzanita_natural"?.12:.08)
          : family==="Turmalina" ? .07
          : family==="Morganita" ? .045
          : family==="Zafiro" ? .035
          : .04,
        axisC:family==="Tanzanita"
          ? (gemId==="tanzanita_natural"?"yellowGreen":"redViolet")
          : family==="Turmalina"
            ? (gemId==="turmalina_verde"?"deepGreen":gemId==="turmalina_rosa"?"deepRose":"deepBlue")
            : family==="Morganita"
              ? "palePink"
              : family==="Zafiro"
                ? (gemId==="zafiro_amarillo"?"golden":gemId==="zafiro_padparadscha"?"salmon":"pink")
                : "yellowGreen",
      }
    : undefined;
  const familyFire=family==="Zircon"
    ? .82
    : gemId==="granate_demantoide"
      ? .76
      : family==="Turmalina" && gemId.includes("paraiba")
        ? .34
        : family==="Crisoberilo" && gemId==="alexandrita_brasil"
          ? .48
          : Number(base.fire??.35);
  const familyBrilliance=family==="Zircon"
    ? 1.02
    : family==="Turmalina" && gemId.includes("paraiba")
      ? 1.04
      : family==="Crisoberilo" && gemId==="alexandrita_brasil"
        ? 1.00
        : Number(base.brilliance??.75);
  const colorChange=gemId==="alexandrita_brasil"
    ? {enabled:true,fluorescent:new THREE.Color(0x4e9a67),incandescent:new THREE.Color(0x8a3557),strength:.58}
    : undefined;
  const oilDrop=family==="Esmeralda" && String(g.perfilInterno??"")==="colombia_jardin"
    ? {enabled:true,strength:gemId==="esmeralda_1"?.18:gemId==="esmeralda_2"?.14:.10}
    : undefined;
  const fluorescenceProfile = gemId==="alexandrita_brasil"
    ? {enabled:true,lw:new THREE.Color(0x78ffb0),sw:new THREE.Color(0x64d8ff),strength:.28}
    : family==="Rubí"
      ? {enabled:true,lw:new THREE.Color(0xff1830),sw:new THREE.Color(0xff2538),strength:.78}
      : family==="Diamante"
        ? {enabled:true,lw:new THREE.Color(0x73a9ff),sw:new THREE.Color(0x507cff),strength:.22}
        : family==="Esmeralda"
          ? {enabled:true,lw:new THREE.Color(0x55ff86),sw:new THREE.Color(0x35d96b),strength:.12}
          : family==="Zafiro"
            ? {enabled:true,lw:new THREE.Color(0x73a8ff),sw:new THREE.Color(0x4d77c9),strength:.10}
            : family==="Perla"
              ? {enabled:true,lw:new THREE.Color(0xb7d9ff),sw:new THREE.Color(0x8dc7e8),strength:.08}
              : undefined;
  const phenomenon=g.fenomenoOptico;
  const phenomenonProfile=phenomenon
    ? {
        enabled:true,
        type:String(phenomenon),
        strength:phenomenon==="chatoyancy"?.72:phenomenon==="asterism"?.68:.58,
        axisA:new THREE.Vector3(1,0,0),
        axisB:new THREE.Vector3(0.5,.8660254,0),
        axisC:new THREE.Vector3(-.5,.8660254,0),
        scaleNm:gemId.includes("opal")?Number(g.phenomenonScaleNm??170):0,
      }
    : undefined;
  return {
    ...base,
    ior:Number(g.ior??base.ior),
    transmission:Number(g.transmission??base.transmission),
    dispersion:Number(g.dispersion??base.dispersion),
    absorptionDistance:Number(g.attenuationDistance??base.absorptionDistance),
    ...(pleochroism?{pleochroism}:{}),
    ...(colorChange?{colorChange}:{}),
    ...(oilDrop?{oilDrop}:{}),
    ...(fluorescenceProfile?{fluorescence:fluorescenceProfile}:{}),
    ...(phenomenonProfile?{phenomenon:phenomenonProfile}:{}),
  };
};

/**
 * Estimate optical thickness in the gem's LOCAL coordinate system.
 * Three.js MeshPhysicalMaterial expects thickness in local space, so using a
 * world-space AABB can make a rotated stone appear artificially thicker.
 * We intentionally keep this a conservative scalar estimate for this step;
 * per-ray geometric depth/BVH remains a later enhancement.
 */
const estimateAurumGemThickness=(target:AurumMeshTarget,thicknessScale=1)=>{
  const geometry=target?.geometry;
  if(!geometry)return .015;
  geometry.computeBoundingBox?.();
  const box=geometry.boundingBox;
  if(!box)return .015;
  const size=box.getSize(new THREE.Vector3());
  const minimumDimension=Math.min(size.x,size.y,size.z);
  return Math.max(.015,minimumDimension*.85*Math.max(.5,Math.min(1.5,Number(thicknessScale??1))));
};


const inspectAurumGemGeometry=(target:AurumMeshTarget)=>{
  const geometry=target?.geometry;
  if(!geometry)return {available:false};
  geometry.computeBoundingBox?.();
  const position=geometry.getAttribute?.("position");
  const normal=geometry.getAttribute?.("normal");
  const uv=geometry.getAttribute?.("uv");
  const index=geometry.getIndex?.();
  const box=geometry.boundingBox;
  const size=box?box.getSize(new THREE.Vector3()):new THREE.Vector3();
  const triangles=index?Math.floor(index.count/3):position?Math.floor(position.count/3):0;
  const preflight=target.userData?.aurumMeshPreflight;
  return {
    available:true,
    vertices:position?.count??0,
    triangles,
    indexed:!!index,
    hasNormals:!!normal&&normal.count===(position?.count??-1),
    hasUV:!!uv&&uv.count===(position?.count??-1),
    hasColor:!!geometry.getAttribute?.("color"),
    dimensions:{x:Number(size.x.toFixed(6)),y:Number(size.y.toFixed(6)),z:Number(size.z.toFixed(6))},
    localMinimumDimension:Number(Math.min(size.x,size.y,size.z).toFixed(6)),
    closedCandidate:preflight?preflight.boundaryEdges===0&&preflight.nonManifoldEdges===0:null,
    boundaryEdges:preflight?.boundaryEdges??null,
    nonManifoldEdges:preflight?.nonManifoldEdges??null,
    degenerateTriangles:preflight?.degenerateTriangles??null,
  };
};

const selectionMeta=(part:THREE.Object3D)=>part?.userData?.aurumRhino||{};
const selectionCategory=(part:THREE.Object3D)=>String(selectionMeta(part).categoria||"").toLowerCase();
const selectionLayerIndex=(part:THREE.Object3D):number|null=>{
  const meta=selectionMeta(part);
  const candidates=[
    meta.layerIndex,
    part?.userData?.attributes?.layerIndex,
    part?.userData?.attributes?.LayerIndex,
    part?.userData?.layerIndex,
    part?.userData?.LayerIndex,
  ];
  for(const raw of candidates){
    if(raw===null||raw===undefined||raw==="")continue;
    const value=Number(raw);
    if(Number.isInteger(value)&&value>=0)return value;
  }
  return null;
};

export function applyAurumMaterialToModel(model:THREE.Object3D,activePart:THREE.Object3D|null,materialConfig:AurumMetalPreset,sharedMaterial:THREE.MeshPhysicalMaterial,applyAll=false) {
  if (!model) return false;
  if (!activePart?.isMesh && applyAll) {
    model.traverse((node) => {
    const part = node as AurumMeshTarget;
      if (!activePart && part?.isMesh && (selectionCategory(part)==="metal" || selectionCategory(part)==="otro")) activePart=part;
    });
  }
  if (!activePart?.isMesh) return false;
  const selectedMeta=selectionMeta(activePart);
  const selectedLayer=selectedMeta.capa||activePart?.userData?.attributes?.layerName||null;
  const selectedLayerIndex=selectionLayerIndex(activePart);
  const selectedCategory=selectionCategory(activePart);
  const selectedLayerId=selectedMeta.rhinoLayerId??activePart?.userData?.attributes?.layerId??activePart?.userData?.attributes?.LayerId??activePart?.userData?.layerId??activePart?.userData?.LayerId??null;
  const selectedLayerKey=resolveAurumLayerKey({layerId:selectedLayerId,layerIndex:selectedLayerIndex,layerName:selectedLayer,layerColor:selectedMeta.colorCapa,category:selectedCategory,existingKey:selectedMeta.layerKey});
  if(selectedCategory!=="metal"&&selectedCategory!=="otro") return false;
  applyAurumMetal(sharedMaterial,metalPresetFromConfig(materialConfig));
  applyAurumReferenceMetalOptics(sharedMaterial,String(materialConfig?.id??""));
  let applied=0;
  const auditedMaterials:Array<{mesh:string;material:THREE.Material}>=[];
  model.traverse((node)=>{
    const x = node as AurumMeshTarget;
    if(!x.isMesh)return;
    const category=selectionCategory(x);
    x.castShadow=category !== "gema";
    x.receiveShadow=true;
    const meta=selectionMeta(x);
    const partLayerIndex=selectionLayerIndex(x);
    const partLayerId=meta.rhinoLayerId??x?.userData?.attributes?.layerId??x?.userData?.attributes?.LayerId??x?.userData?.layerId??x?.userData?.LayerId??null;
    const partLayerKey=meta.layerKey??resolveAurumLayerKey({layerId:partLayerId,layerIndex:partLayerIndex,layerName:meta.capa,layerColor:meta.colorCapa,category,existingKey:meta.layerKey});
    const sameLayerIdentity=Boolean(selectedLayerKey&&partLayerKey&&selectedLayerKey===partLayerKey);
    const sameLayer=sameLayerIdentity&&category===selectedCategory;
    const shouldApply=applyAll ? (category==="metal"||category==="otro") : (x.uuid===activePart.uuid||(selectedCategory==="otro"&&sameLayer)||(selectedCategory==="metal"&&sameLayer));
    if(shouldApply){
      const apply=(base:THREE.Material)=>{const next=base?.clone?base.clone():sharedMaterial.clone();applyAurumMetal(next,metalPresetFromConfig(materialConfig));applyAurumReferenceMetalOptics(next,String(materialConfig?.id??""));return next;};
      x.material=Array.isArray(x.material)?x.material.map(apply):apply(x.material);
      const finalMaterials=Array.isArray(x.material)?x.material:[x.material];
      auditedMaterials.push(...finalMaterials.filter(Boolean).map((m:THREE.Material)=>({mesh:x.name||x.uuid,material:m})));
      applied++;
    }
  });
  if(applied>0){
    console.info("[AURUM][METAL MATERIAL AUDIT]",{
      mesh:activePart.name||activePart.uuid,
      requestedProfile:{
        id:String(materialConfig?.id??""),
        label:String(materialConfig?.nombre??materialConfig?.name??""),
        color:materialConfig?.color??null,
        metalness:materialConfig?.metalness??null,
        roughness:materialConfig?.roughness??null,
        envMapIntensity:materialConfig?.envMapIntensity??null,
      },
      appliedCount:applied,
      materials:auditedMaterials.map(({mesh,material:m})=>({
        mesh,
        name:m.name??null,
        colorHex:m.color?.getHexString?.()??null,
        colorLinear:m.color?{r:Number(m.color.r.toFixed(5)),g:Number(m.color.g.toFixed(5)),b:Number(m.color.b.toFixed(5))}:null,
        metalness:m.metalness??null,
        roughness:m.roughness??null,
        envMapIntensity:m.envMapIntensity??null,
        ior:m.ior??null,
        clearcoat:m.clearcoat??null,
        clearcoatRoughness:m.clearcoatRoughness??null,
        hasRoughnessMap:!!m.roughnessMap,
        roughnessMapName:m.roughnessMap?.name||null,
        roughnessMapType:m.roughnessMap?.type??null,
        renderProfile:m.userData?.aurumMetalRenderProfile??null,
        iJewelReference:m.userData?.aurumIJEWELMetalReference??null,
        baseEnvironmentIntensity:m.userData?.aurumMetalBaseEnvMapIntensity??null,
      })),
    });
  }
  return applied>0;
}

export function applyAurumGemToTarget(target:AurumMeshTarget,gemConfig:AurumGemCatalogEntry,applyGemEnvironment:()=>void,requestRender?:()=>void,applyAll=false) {
  if(!target?.isMesh)return false;
  const selectedCategory=selectionCategory(target);
  if(selectedCategory!=="gema")return false;
  let modelRoot:THREE.Object3D=target;
  while(modelRoot.parent)modelRoot=modelRoot.parent;

  const selectedMeta=selectionMeta(target);
  const selectedLayer=String(selectedMeta.capa||target.userData?.attributes?.layerName||target.userData?.attributes?.LayerName||"").trim();
  const selectedLayerNormalized=selectedLayer.toLocaleLowerCase();
  const selectedLayerIndex=selectionLayerIndex(target);
  const selectedLayerId=selectedMeta.rhinoLayerId??target.userData?.attributes?.layerId??target.userData?.attributes?.LayerId??target.userData?.layerId??target.userData?.LayerId??null;
  const selectedLayerColor=String(selectedMeta.colorCapa??target.userData?.attributes?.layerColor??target.userData?.attributes?.LayerColor??"").trim().toLowerCase();

  // MatrixGold's Gem 01–04 names are the user-visible source of truth.
  // Some 3DM/GLB metadata paths can carry a stale/shared Rhino ID, so exact
  // layer name must win whenever present; do not let a shared ID merge layers.
  const hasStableLayerIdentity=Boolean(selectedLayerNormalized||selectedLayerIndex!=null||(selectedLayerId!=null&&String(selectedLayerId).trim()!==""));
  const assignmentKey=selectedLayerNormalized
    ? "rhino-layer:"+encodeURIComponent(selectedLayerNormalized)
    : selectedLayerIndex!=null
      ? "rhino-index:"+selectedLayerIndex
      : selectedLayerId!=null&&String(selectedLayerId).trim()!==""
        ? "rhino-id:"+String(selectedLayerId).trim()
        : "mesh:"+target.uuid;
  const targets:AurumMeshTarget[]=[];
  const allGemMeshes:AurumMeshTarget[]=[];
  const sameSourceLayer=(part:AurumMeshTarget):boolean=>{
    if(!part?.isMesh)return false;
    const meta=selectionMeta(part);
    const partLayer=String(meta.capa||part.userData?.attributes?.layerName||part.userData?.attributes?.LayerName||"").trim();
    const partLayerNormalized=partLayer.toLocaleLowerCase();
    const partLayerIndex=selectionLayerIndex(part);
    const partLayerId=meta.rhinoLayerId??part.userData?.attributes?.layerId??part.userData?.attributes?.LayerId??part.userData?.layerId??part.userData?.LayerId??null;
    const partColor=String(meta.colorCapa??part.userData?.attributes?.layerColor??part.userData?.attributes?.LayerColor??"").trim().toLowerCase();

    // Never fall through to ID/index matching if a source layer name exists:
    // a mismatched/missing name is safer as a non-match than recoloring other layers.
    if(selectedLayerNormalized)return partLayerNormalized===selectedLayerNormalized;
    if(selectedLayerIndex!=null)return partLayerIndex===selectedLayerIndex;
    if(selectedLayerId!=null&&String(selectedLayerId).trim()!=="")return partLayerId!=null&&String(partLayerId).trim()===String(selectedLayerId).trim();
    return part.uuid===target.uuid;
  };
  modelRoot.traverse((node)=>{
    const x = node as AurumMeshTarget;
    if(!x.isMesh||x.userData?.aurumInternalInclusion)return;
    const category=selectionCategory(x);
    if(category==="gema")allGemMeshes.push(x);
    if(category==="gema"&&sameSourceLayer(x))targets.push(x);
  });
  if(!targets.length){
    console.error("[AURUM][GEM LAYER ASSIGNMENT FAILED]",{
      selectedMesh:target.name||target.uuid,
      selectedLayer,
      selectedLayerKey: assignmentKey,
      reason:hasStableLayerIdentity?"No mesh matched the selected raw Rhino layer identity":"Missing stable layer identity; using clicked mesh only",
      gemLayerMeshes:allGemMeshes.length,
    });
    targets.push(target);
  }

  const rootUserData=modelRoot.userData??{};
  const priorAssignments=rootUserData.aurumGemLayerAssignments??{};
  const assignment={
    layerKey:assignmentKey,
    layerName:selectedLayer||null,
    layerIndex:selectedLayerIndex,
    layerId:selectedLayerId==null?null:String(selectedLayerId),
    gemId:String(gemConfig?.id??""),
    gemName:String(gemConfig?.nombre??""),
    updatedAt:Date.now(),
    matchedMeshUuids:targets.map((part)=>part.uuid),
    identityResolved:hasStableLayerIdentity,
  };
  modelRoot.userData={
    ...rootUserData,
    aurumGemLayerAssignments:{
      ...priorAssignments,
      [assignmentKey]:assignment,
    },
  };
  console.info("[AURUM][GEM LAYER ASSIGNMENT]",{
    selectedMesh:target.name||target.uuid,
    selectedLayer,
    selectedLayerKey:assignmentKey,
    selectedLayerIndex,
    selectedLayerId:selectedLayerId==null?null:String(selectedLayerId),
    selectedCategory,
    gemId:String(gemConfig?.id??""),
    matchedMeshes:targets.length,
    identityResolved:hasStableLayerIdentity,
    matches:targets.map((part)=>({
      mesh:part.name||part.uuid,
      layer:selectionMeta(part).capa??part.userData?.attributes?.layerName??null,
      layerKey:selectionMeta(part).layerKey??null,
      category:selectionCategory(part),
      layerIndex:selectionLayerIndex(part),
      layerId:selectionMeta(part).rhinoLayerId??part.userData?.attributes?.layerId??part.userData?.attributes?.LayerId??null,
    })),
  });

  const physicalModel=resolveAurumGemPhysicalModel(gemConfig);
  const preset:AurumGemPreset=presetFromCatalog(gemConfig);
  const opticalProfile=opticalProfileFromCatalog(gemConfig);
  const thickness=estimateAurumGemThickness(target,preset.thicknessScale);
  const apply=(base:THREE.Material,partTarget:AurumMeshTarget,partThickness:number,thicknessMap:THREE.DataTexture|null)=>{
    // Gem optics require MeshPhysicalMaterial. Rhino 3DM imports commonly
    // arrive as MeshStandardMaterial; cloning that class silently ignores
    // transmission, IOR, attenuation, dispersion and the dedicated diamond shader.
    // Preserve only neutral render state from the source material, never its class.
    const next=new THREE.MeshPhysicalMaterial({
      color:base?.color?.clone?.()??new THREE.Color(0xffffff),
      // Imported diamond CAD meshes can contain inconsistent face winding.
      // DoubleSide prevents those crown/pavilion facets from disappearing at
      // grazing angles; keep the original sidedness for every other gemstone.
      side:preset.familia==="Diamante"?THREE.DoubleSide:(base?.side??THREE.FrontSide),
      depthTest:base?.depthTest??true,
      depthWrite:true,
    });
    if(base?.name)next.name=String(base.name);
    applyAurumGem(next,preset,partThickness);
    applyAurumOpticalProfile(next,opticalProfile);
    applyAurumFamilyOpticalResponse(next,opticalProfile);
    applyAurumInternalLightResponse(next,opticalProfile,partThickness);
    attachAurumGemPhysicalModel(next,physicalModel);
    if(preset.familia==="Diamante")applyAurumDiamondOptics(next);
    applyAurumIJEWELReferenceFromMaterial(next,String(base?.name??next?.name??""));
    // Apply the emerald reference calibration last: a matching source .dmat
    // can otherwise overwrite the selected catalog hue and environment level.
    // Keep the diamond path and its ordering unchanged.
    if(preset.familia==="Esmeralda")applyAurumReferenceGemOptics(next,preset.familia);
    if(preset.familia==="Diamante"){
      // Applying a gem to a MatrixGold layer must use the same dedicated
      // spectral shader as the initial diamond preview. Do this after the
      // source-reference metadata is attached so activation cannot be lost.
      activateAurumDiamondMaterial(next,preset);
    }
    applyAurumDynamicScintillation(next,{...opticalProfile,crystal:physicalModel.crystal,structure:physicalModel.structure,luminescence:physicalModel.luminescence} as ReturnType<typeof getAurumOpticalProfile>);
    const geometry=partTarget?.geometry;
    const hasUsableNormals=!!geometry?.attributes?.normal&&geometry.attributes.normal.count===geometry.attributes.position?.count;
    next.flatShading=!hasUsableNormals;
    next.thickness=partThickness;
    next.thicknessMap=thicknessMap;
    next.needsUpdate=true;
    return next;
  };
  targets.forEach((part)=>{
    const stableSourceMaterials=getAurumSourceMaterials(part);
    const originalMaterialIsArray=hadAurumSourceMaterialArray(part);
    part.material=originalMaterialIsArray
      ? stableSourceMaterials.map((base:THREE.Material)=>apply(base,part,thickness,null))
      : apply(stableSourceMaterials[0],part,thickness,null);
    const applicationToken=Number(part.userData?.aurumGemApplicationToken??0)+1;
    const activeGemId=String(gemConfig?.id??"");
    part.userData={
      ...part.userData,
      aurumGemApplicationToken:applicationToken,
      aurumActiveGemId:activeGemId,
      aurumFacetNormalsApplied:true,
      aurumFacetNormalMode:part.geometry?.attributes?.normal?"authored-or-crease":"flat-fallback",
      aurumOpticalThickness:thickness,
      aurumOpticalThicknessSpace:"local",
      aurumOpticalThicknessMode:"local-bounds-v1",
      aurumGemThicknessMapDiagnostics:null,
      aurumGemGeometryDiagnostics:inspectAurumGemGeometry(part),
      ...(String(gemConfig?.familia??"")==="Diamante" ? { aurumDiamondPipelineDiagnostics:getAurumDiamondPipelineDiagnostics(part,"high") } : {}),
    };
    console.warn("[AURUM][GEM MATERIAL APPLIED]",{
      mesh:part.name||part.uuid,
      selectedGem:{id:String(gemConfig?.id??""),nombre:String(gemConfig?.nombre??""),familia:String(gemConfig?.familia??""),color:String(gemConfig?.color??"")},
      material:Array.isArray(part.material)?part.material.map((m:THREE.Material)=>({color:m?.color?.getHexString?.(),metalness:m?.metalness,transmission:m?.transmission,ior:m?.ior,thickness:m?.thickness})):part.material?{color:part.material.color?.getHexString?.(),metalness:part.material.metalness,transmission:part.material.transmission,ior:part.material.ior,thickness:part.material.thickness}:null
    });
    console.warn("[AURUM][GEM GEOMETRY]",{mesh:part.name||part.uuid,diagnostics:part.userData.aurumGemGeometryDiagnostics});
    part.userData={...part.userData,aurumGemPhysicalModel:{...physicalModel,crystal:{...physicalModel.crystal,axisA:physicalModel.crystal.axisA.toArray(),axisB:physicalModel.crystal.axisB.toArray(),axisC:physicalModel.crystal.axisC.toArray()}}};
    renderAurumInclusions(THREE,part,gemConfig,9173,preset);
    applyAurumLatinGemProfile(part,gemConfig);
    const expectedMaterials=Array.isArray(part.material)?[...part.material]:[part.material];
    setTimeout(()=>{
      try{
        let root=part;
        while(root?.parent)root=root.parent;
        if(root?.userData?.aurumDisposed)return;
        if(part.userData?.aurumGemApplicationToken!==applicationToken||part.userData?.aurumActiveGemId!==activeGemId)return;
        const currentMaterials=Array.isArray(part.material)?part.material:[part.material];
        if(currentMaterials.length!==expectedMaterials.length||currentMaterials.some((mat,index:number)=>mat!==expectedMaterials[index]))return;
        const thicknessResolution=preset.familia==="Diamante"?512:preset.familia==="Moissanita"?384:256;
        const result=buildAurumThicknessMap(part,preset.thicknessScale,thicknessResolution);
        if(!result)return;
        const materials=Array.isArray(part.material)?part.material:[part.material];
        materials.forEach((mat)=>{
          if(!mat)return;
          mat.thickness=result.baseThickness;
          mat.thicknessMap=result.texture;
          mat.needsUpdate=true;
        });
        part.userData={
          ...part.userData,
          aurumOpticalThickness:result.baseThickness,
          aurumGemThicknessMapDiagnostics:{method:result.method,hitRatio:result.hitRatio,minDepth:result.minDepth,maxDepth:result.maxDepth,cacheKey:result.cacheKey,normalMapRes:result.normalMapRes},
        };
        requestRender?.();
      }catch(error){
        console.warn("[AURUM][GEM THICKNESS MAP]",error);
      }
    },0);
  });
  applyGemEnvironment();
  requestRender?.();
  return true;
}
export function clearAurumGemFromTarget(target:THREE.Object3D){if(target)clearAurumInclusions(target);}
