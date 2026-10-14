import * as THREE from "three";
import { resolveAurumLayerKey } from "./layer-identity";
import { getAurumSourceMaterials } from "./gem-material-baseline";
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
} from "../aurum-material-engine";
import { applyAurumFamilyOpticalResponse } from "./optical-response";
import { applyAurumDynamicScintillation } from "./scintillation";
import { activateAurumDiamondMaterial } from "./aurum-diamond-material";
import { applyAurumInternalLightResponse } from "./internal-light-response";
import { renderAurumInclusions, clearAurumInclusions } from "./gems";
import { applyAurumLatinGemProfile } from "./latin-gem-catalog";
import { buildAurumThicknessMap } from "./thickness-map";
import { resolveAurumGemPhysicalModel, attachAurumGemPhysicalModel } from "./gem-physical-core";

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
  thicknessScale:Number(g.thicknessScale??1),
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
  const phenomenon=(g as any).fenomenoOptico;
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
const estimateAurumGemThickness=(target:any,thicknessScale=1)=>{
  const geometry=target?.geometry;
  if(!geometry)return .015;
  geometry.computeBoundingBox?.();
  const box=geometry.boundingBox;
  if(!box)return .015;
  const size=box.getSize(new THREE.Vector3());
  const minimumDimension=Math.min(size.x,size.y,size.z);
  return Math.max(.015,minimumDimension*.85*Math.max(.5,Math.min(1.5,Number(thicknessScale??1))));
};


const inspectAurumGemGeometry=(target:any)=>{
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

const selectionMeta=(part:any)=>part?.userData?.aurumRhino||{};
const selectionCategory=(part:any)=>String(selectionMeta(part).categoria||"").toLowerCase();
const selectionLayerIndex=(part:any):number|null=>{
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

export function applyAurumMaterialToModel(model:any,activePart:any,materialConfig:any,sharedMaterial:any) {
  if (!model || !activePart?.isMesh) return false;
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
  model.traverse((x:any)=>{
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
    const shouldApply=x.uuid===activePart.uuid||(selectedCategory==="otro"&&sameLayer)||(selectedCategory==="metal"&&sameLayer);
    if(shouldApply){
      const apply=(base:any)=>{const next=base?.clone?base.clone():sharedMaterial.clone();applyAurumMetal(next,metalPresetFromConfig(materialConfig));applyAurumReferenceMetalOptics(next,String(materialConfig?.id??""));return next;};
      x.material=Array.isArray(x.material)?x.material.map(apply):apply(x.material);applied++;
    }
  });
  return applied>0;
}

export function applyAurumGemToTarget(target:any,gemConfig:any,applyGemEnvironment:()=>void,requestRender?:()=>void) {
  if(!target?.isMesh)return false;
  const selectedCategory=selectionCategory(target);
  if(selectedCategory!=="gema"&&selectedCategory!=="otro")return false;
  let modelRoot:any=target;
  while(modelRoot.parent)modelRoot=modelRoot.parent;
  const selectedMeta=selectionMeta(target);
  const selectedLayer=String(selectedMeta.capa||target.userData?.attributes?.layerName||"").trim();
  const selectedLayerId=selectedMeta.rhinoLayerId??target.userData?.attributes?.layerId??target.userData?.attributes?.LayerId??target.userData?.layerId??target.userData?.LayerId??null;
  const selectedLayerKey=resolveAurumLayerKey({
    layerId:selectedLayerId,
    layerIndex:selectionLayerIndex(target),
    layerName:selectedLayer,
    layerColor:selectedMeta.colorCapa??target.userData?.attributes?.layerColor,
    category:selectedCategory,
  })??"mesh:"+target.uuid;
  const selectedLayerIndex=selectionLayerIndex(target);
  const targets:any[]=[];
  modelRoot?.traverse?.((x:any)=>{
    if(!x.isMesh||x.userData?.aurumInternalInclusion)return;
    const meta=selectionMeta(x),category=selectionCategory(x);
    if(category!==selectedCategory)return;
    const partLayerId=meta.rhinoLayerId??x.userData?.attributes?.layerId??x.userData?.attributes?.LayerId??x.userData?.layerId??x.userData?.LayerId??null;
    const partLayer=String(meta.capa||x.userData?.attributes?.layerName||"").trim();
    const partLayerKey=meta.layerKey??resolveAurumLayerKey({
      layerId:partLayerId,
      layerIndex:selectionLayerIndex(x),
      layerName:partLayer,
      layerColor:meta.colorCapa??x.userData?.attributes?.layerColor,
      category,
    });
    // The canonical key is hydrated from source metadata and survives GLB
    // extras. Do not group by the generic "gema" category.
    const sameLayerIdentity=Boolean(selectedLayerKey&&partLayerKey&&selectedLayerKey===partLayerKey);
    if(sameLayerIdentity)targets.push(x);
  });
  // Fail closed: if no matching layer metadata survives conversion, modify only
  // the clicked mesh rather than guessing from category or applying to all gems.
  if(!targets.length)targets.push(target);
  const rootUserData=modelRoot.userData??{};
  const priorAssignments=rootUserData.aurumGemLayerAssignments??{};
  modelRoot.userData={
    ...rootUserData,
    aurumGemLayerAssignments:{
      ...priorAssignments,
      [selectedLayerKey]:{
        layerKey:selectedLayerKey,
        layerName:selectedLayer||null,
        layerIndex:selectedLayerIndex,
        layerId:selectedLayerId==null?null:String(selectedLayerId),
        gemId:String(gemConfig?.id??""),
        gemName:String(gemConfig?.nombre??""),
        updatedAt:Date.now(),
        matchedMeshUuids:targets.map((part:any)=>part.uuid),
      },
    },
  };
  console.info("[AURUM][GEM LAYER ASSIGNMENT]", {
    selectedMesh:target.name||target.uuid,
    selectedLayer,
    selectedLayerKey,
    selectedLayerIndex,
    selectedLayerId:selectedLayerId==null?null:String(selectedLayerId),
    selectedCategory,
    gemId:String(gemConfig?.id??""),
    matchedMeshes:targets.length,
    matches:targets.map((part:any)=>({
      mesh:part.name||part.uuid,
      layer:selectionMeta(part).capa??part.userData?.attributes?.layerName??null,
      layerIndex:selectionLayerIndex(part),
      layerId:selectionMeta(part).rhinoLayerId??part.userData?.attributes?.layerId??part.userData?.attributes?.LayerId??null,
    })),
  });
  const physicalModel=resolveAurumGemPhysicalModel(gemConfig);
  const preset:any=presetFromCatalog(gemConfig);
  const opticalProfile=opticalProfileFromCatalog(gemConfig);
  const thickness=estimateAurumGemThickness(target,preset.thicknessScale);
  const apply=(base:any,partTarget:any,partThickness:number,thicknessMap:THREE.DataTexture|null)=>{
    const next=base?.clone?base.clone():new THREE.MeshPhysicalMaterial();
    applyAurumGem(next,preset,partThickness);
    applyAurumOpticalProfile(next,opticalProfile);
    applyAurumFamilyOpticalResponse(next,opticalProfile);
    applyAurumInternalLightResponse(next,opticalProfile,partThickness);
    attachAurumGemPhysicalModel(next,physicalModel);
    // Apply the source iJewel material parameters BEFORE compiling the custom
    // optical shader so they become active uniforms, not metadata-only references.
    if(preset.familia==="Diamante")applyAurumDiamondOptics(next);
    if(preset.familia==="Esmeralda")applyAurumReferenceGemOptics(next,preset.familia);
    // If the loaded GLB carries an exact iJewel/WebGi DiamondMaterial rootPath,
    // preserve and activate that authored reference instead of replacing it with
    // a generic family preset. This is what lets DAROS-grade source materials
    // survive the AURUM material application pipeline.
    applyAurumIJEWELReferenceFromMaterial(next,String(base?.name??next?.name??""));
    // Enable the native iJewel-inspired optical path only for diamonds. The
    // LIVE quality controller swaps this beauty shader out during interaction.
    if(preset.familia==="Diamante")activateAurumDiamondMaterial(next,preset);
    applyAurumDynamicScintillation(next,{...opticalProfile,crystal:physicalModel.crystal,structure:physicalModel.structure,luminescence:physicalModel.luminescence} as any);
    // Preserve authored CAD facet normals. Only fall back to flat shading when
    // the geometry has no usable normals; the renderer's normal pipeline handles
    // crease preservation for meshes that already carry valid facet normals.
    const geometry=partTarget?.geometry;
    const hasUsableNormals=!!geometry?.attributes?.normal&&geometry.attributes.normal.count===geometry.attributes.position?.count;
    next.flatShading=!hasUsableNormals;
    next.thickness=partThickness;
    next.thicknessMap=thicknessMap;
    next.needsUpdate=true;
    return next;
  };
  targets.forEach((part:any)=>{
    // Rebuild from the immutable imported material captured before the
    // initial preview; never inherit the prior gemstone's optical state.
    const stableSourceMaterials=getAurumSourceMaterials(part);
    part.material=Array.isArray(part.material)
      ? stableSourceMaterials.map((base:any)=>apply(base,part,thickness,null))
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
    };
    console.warn("[AURUM][GEM MATERIAL APPLIED]", {
      mesh:part.name||part.uuid,
      selectedGem:{id:String(gemConfig?.id??""),nombre:String(gemConfig?.nombre??""),familia:String(gemConfig?.familia??""),color:String(gemConfig?.color??"")},
      material:Array.isArray(part.material)?part.material.map((m:any)=>({color:m?.color?.getHexString?.(),metalness:m?.metalness,transmission:m?.transmission,ior:m?.ior,thickness:m?.thickness})):part.material?{color:part.material.color?.getHexString?.(),metalness:part.material.metalness,transmission:part.material.transmission,ior:part.material.ior,thickness:part.material.thickness}:null
    });
    console.warn("[AURUM][GEM GEOMETRY]", { mesh: part.name || part.uuid, diagnostics: part.userData.aurumGemGeometryDiagnostics });

    part.userData={...part.userData,aurumGemPhysicalModel:{...physicalModel,crystal:{...physicalModel.crystal,axisA:physicalModel.crystal.axisA.toArray(),axisB:physicalModel.crystal.axisB.toArray(),axisC:physicalModel.crystal.axisC.toArray()}}};
    renderAurumInclusions(THREE,part,gemConfig,9173,preset);
    applyAurumLatinGemProfile(part,gemConfig);

    // Bake the spatial map after the selection has already been applied.
    // A selection token prevents an older asynchronous bake from overwriting
    // the optics of a gem selected later on the same mesh.
    const expectedMaterials=Array.isArray(part.material)?[...part.material]:[part.material];
    setTimeout(()=>{
      try{
        let root=part;
        while(root?.parent) root=root.parent;
        if(root?.userData?.aurumDisposed)return;
        if(part.userData?.aurumGemApplicationToken!==applicationToken||part.userData?.aurumActiveGemId!==activeGemId)return;
        const currentMaterials=Array.isArray(part.material)?part.material:[part.material];
        if(currentMaterials.length!==expectedMaterials.length||currentMaterials.some((mat:any,index:number)=>mat!==expectedMaterials[index]))return;
        const thicknessResolution=preset.familia==="Diamante" ? 512 : preset.familia==="Moissanita" ? 384 : 256;
        const result=buildAurumThicknessMap(part,preset.thicknessScale,thicknessResolution);
        if(!result)return;
        const materials=Array.isArray(part.material)?part.material:[part.material];
        materials.forEach((mat:any)=>{
          if(!mat)return;
          mat.thickness=result.baseThickness;
          mat.thicknessMap=result.texture;
          mat.needsUpdate=true;
        });
        part.userData={...part.userData,aurumOpticalThickness:result.baseThickness,aurumOpticalThicknessMode:"uv-ray-depth-v3",aurumGemThicknessMapDiagnostics:{hitRatio:Number(result.hitRatio.toFixed(3)),minDepth:Number(result.minDepth.toFixed(4)),maxDepth:Number(result.maxDepth.toFixed(4)),resolution:result.normalMapRes,cacheKey:result.cacheKey,method:result.method}};
        console.warn("[AURUM][GEM THICKNESS]", { mesh:part.name||part.uuid, geometry:part.userData.aurumGemGeometryDiagnostics, thickness:part.userData.aurumOpticalThickness, map:part.userData.aurumGemThicknessMapDiagnostics });
        requestRender?.();
      }catch(error){
        console.warn("[AURUM][GEM THICKNESS] spatial bake skipped", {mesh:part.name||part.uuid,error});
      }
    },0);
  });
  applyGemEnvironment();
  return true;
}

export function clearAurumGemFromTarget(target:any){if(target)clearAurumInclusions(target);}
