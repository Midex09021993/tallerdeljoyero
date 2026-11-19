import * as THREE from "three";
import { resolveAurumLayerKey } from "./layer-identity";
import { classifyAurumSemanticObject } from "./semantic-object-recognition";
import { getAurumSourceMaterials, hadAurumSourceMaterialArray } from "./gem-material-baseline";
import { applyAurumIJEWELReferenceFromMaterial } from "../aurum-material-engine";
import { createAurumGemAdapter } from "./core/gem-adapter";
import { createAurumMetalAdapter } from "./core/metal-adapter";
import { applyAurumFamilyOpticalResponse } from "./optical-response";
import { applyAurumDynamicScintillation } from "./scintillation";
import { activateAurumDiamondMaterial } from "./aurum-diamond-material";
import { applyAurumInternalLightResponse } from "./internal-light-response";
import { renderAurumInclusions, clearAurumInclusions } from "./gems";
import { applyAurumLatinGemProfile } from "./latin-gem-catalog";
import { buildAurumThicknessMap } from "./thickness-map";
import { resolveAurumGemPhysicalModel, attachAurumGemPhysicalModel } from "./gem-physical-core";
import { getAurumDiamondPipelineDiagnostics } from "./aurum-diamond-pipeline";

const aurumMetalAdapter=createAurumMetalAdapter();
const aurumGemAdapter=createAurumGemAdapter();

/** Read-only service surfaces for AURUM CORE composition; material ownership stays here. */
export function getAurumMaterialAdapterServices() {
  return {
    metal: aurumMetalAdapter.services,
    gem: aurumGemAdapter.services,
  } as const;
}

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
  ...(g.diamondMaterialParameters ? { diamondMaterialParameters:g.diamondMaterialParameters } : {}),
});

const opticalProfileFromCatalog=(g:any)=>{
  const knownFamilies=new Set(["Diamante","Moissanita","Esmeralda","Rubí","Zafiro"]);
  const base=knownFamilies.has(String(g.familia))
    ? aurumGemAdapter.getOpticalProfile(String(g.familia))
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
        ? undefined
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
const selectionLayerIdentity=(part:any)=>{
  const data=part?.userData??{};
  const instance=data.aurumRhinoInstanceSource??{};
  const source=data.aurumRhinoSource??{};
  const attrs=data.attributes??{};
  const meta=selectionMeta(part);
  return {
    layerName:String(instance.layerName??source.layerName??attrs.layerName??attrs.LayerName??meta.capa??"").trim(),
    layerIndex:instance.layerIndex??source.layerIndex??attrs.layerIndex??attrs.LayerIndex??data.layerIndex??data.LayerIndex??meta.layerIndex,
    layerId:instance.layerId??source.layerId??attrs.layerId??attrs.LayerId??data.layerId??data.LayerId??meta.rhinoLayerId??null,
  };
};
export const normalizeAurumGemLayerName=(value:any)=>{
  const raw=String(value??"").trim();
  const segments=raw.split(/::|[\\/]/).filter(Boolean).map((part)=>
    part.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase().replace(/[_-]+/g," ").replace(/\s+/g," ").trim()
  );
  const leaf=segments[segments.length-1]??"";
  // Collapse only Rhino’s generic Gem::Gem 0N container prefix. Preserve
  // meaningful parent paths so two separate CAD groups with a repeated
  // leaf name can never be merged accidentally.
  const genericGemContainer=segments.length===2&&/^(?:gem|gems|gemstone|gemstones)$/.test(segments[0]??"");
  return (genericGemContainer?[leaf]:segments).filter(Boolean).join("::");
};
const selectionLayerName=(part:any)=>selectionLayerIdentity(part).layerName;
export const getAurumGemLayerIdentity=(part:any)=>{
  const identity=selectionLayerIdentity(part);
  return {...identity,layerName:normalizeAurumGemLayerName(identity.layerName),layerIndex:selectionLayerIndex(part)};
};
export const isAurumGemTarget=(part:any)=>selectionCategory(part)==="gema";
const isExplicitGemSlot=(part:any)=>{
  const layerName=normalizeAurumGemLayerName(selectionLayerName(part));
  // MatrixGold/Rhino gemstone slots are authoritative even when an imported
  // material or stale semantic tag incorrectly labels the mesh as metal.
  return /\b(?:gem|gema|piedra|stone|diamond|diamante)\s*[_-]?\s*0?[1-4]\b/.test(layerName);
};
const selectionCategory=(part:any)=>{
  const declared=String(selectionMeta(part).categoria||"").toLowerCase();
  // Source/instance layer identity is authoritative across Rhino -> GLB hydration.
  // A MatrixGold Gem 01–04 slot remains a gem even if cached category metadata is stale.
  if(isExplicitGemSlot(part))return "gema";
  if(declared==="metal"||declared==="gema")return declared;
  const semantic=classifyAurumSemanticObject(part,null);
  return semantic.confidence>=.7 && (semantic.classification==="metal"||semantic.classification==="gem")
    ? semantic.classification==="gem"?"gema":"metal"
    : declared||"otro";
};
const selectionLayerIndex=(part:any):number|null=>{
  const meta=selectionMeta(part);
  const identity=selectionLayerIdentity(part);
  const candidates=[
    identity.layerIndex,
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

type AurumGemLayerIndex = {
  byLayerName: Map<string, any[]>;
  byLayerIndex: Map<number, any[]>;
  byLayerId: Map<string, any[]>;
  gemMeshCount: number;
};

// Layer identity is immutable after model preparation. Cache the expensive
// CAD traversal once per model so repeated catalog changes resolve in O(k)
// instead of rescanning every mesh for the same MatrixGold layer.
const AURUM_GEM_LAYER_INDEX = new WeakMap<object, AurumGemLayerIndex>();

const addGemIndexEntry=(map:Map<any,any[]>,key:any,mesh:any)=>{
  if(key===null||key===undefined||key==="")return;
  const current=map.get(key);
  if(current)current.push(mesh);
  else map.set(key,[mesh]);
};

const getAurumGemLayerIndex=(modelRoot:any):AurumGemLayerIndex=>{
  const cached=AURUM_GEM_LAYER_INDEX.get(modelRoot);
  if(cached)return cached;
  const index:AurumGemLayerIndex={
    byLayerName:new Map(),
    byLayerIndex:new Map(),
    byLayerId:new Map(),
    gemMeshCount:0,
  };
  modelRoot?.traverse?.((part:any)=>{
    if(!part?.isMesh||part.userData?.aurumInternalInclusion||selectionCategory(part)!=="gema")return;
    index.gemMeshCount++;
    const identity=selectionLayerIdentity(part);
    const layerName=normalizeAurumGemLayerName(identity.layerName);
    const layerIndex=selectionLayerIndex(part);
    const layerId=identity.layerId;
    addGemIndexEntry(index.byLayerName,layerName,part);
    addGemIndexEntry(index.byLayerIndex,layerIndex,part);
    if(layerId!==null&&String(layerId).trim()!=="")addGemIndexEntry(index.byLayerId,String(layerId).trim(),part);
  });
  AURUM_GEM_LAYER_INDEX.set(modelRoot,index);
  return index;
};

export const prepareAurumGemLayerIndex=(model:any)=>{
  let root=model;
  while(root?.parent)root=root.parent;
  if(root&&typeof root==="object"){
    // The scene root is reused when a new CAD model is loaded. Rebuild its
    // index for each model lifecycle so no previous model's meshes survive.
    AURUM_GEM_LAYER_INDEX.delete(root);
    return getAurumGemLayerIndex(root);
  }
  return null;
};

export const invalidateAurumGemLayerIndex=(model:any)=>{
  let root=model;
  while(root?.parent)root=root.parent;
  if(root&&typeof root==="object")AURUM_GEM_LAYER_INDEX.delete(root);
};

export function applyAurumMaterialToModel(model:any,activePart:any,materialConfig:any,sharedMaterial:any,applyAll=false) {
  if (!model) return false;
  if (!activePart?.isMesh && applyAll) {
    model.traverse((part:any) => {
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
  const isWaxMaterial=String(materialConfig?.id??"")==="cera_microfusion_roja";
  // La cera tiene un perfil físico independiente: nunca pasa por la calibración
  // ni por la óptica de referencia de los metales.
  if(!isWaxMaterial){
    aurumMetalAdapter.apply(sharedMaterial,aurumMetalAdapter.createPreset(materialConfig));
    aurumMetalAdapter.applyReferenceOptics(sharedMaterial,String(materialConfig?.id??""));
  }
  let applied=0;
  const auditedMaterials:any[]=[];
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
    const shouldApply=applyAll ? (category==="metal"||category==="otro") : (x.uuid===activePart.uuid||(selectedCategory==="otro"&&sameLayer)||(selectedCategory==="metal"&&sameLayer));
    if(shouldApply){
      const apply=(base:any)=>{
        if(isWaxMaterial){
          const wax=new THREE.MeshPhysicalMaterial({
            color:0xa20d1a,
            metalness:0,
            roughness:.48,
            envMapIntensity:.42,
            clearcoat:.06,
            clearcoatRoughness:.28,
            transmission:.035,
            thickness:.35,
            ior:1.46,
            attenuationColor:new THREE.Color(0x650812),
            attenuationDistance:.55,
            specularIntensity:.58,
            specularColor:new THREE.Color(0xffffff),
            side:base?.side??THREE.FrontSide,
            depthTest:base?.depthTest??true,
            depthWrite:true,
          });
          wax.name="AURUM · Cera roja GEMMEX";
          wax.userData={
            ...(base?.userData??{}),
            aurumMaterialKind:"jewelry-casting-wax",
            aurumWaxProfile:{
              reference:"GEMMEX / Flashforge FFWJ1200 visual reference",
              color:"#A20D1A",
              metalness:0,
              roughness:.48,
              envMapIntensity:.42,
              clearcoat:.06,
              clearcoatRoughness:.28,
              transmission:.035,
              thickness:.35,
              ior:1.46,
              attenuationColor:"#650812",
              attenuationDistance:.55,
            },
          };
          return wax;
        }
        const next=base?.clone?base.clone():sharedMaterial.clone();
        aurumMetalAdapter.apply(next,aurumMetalAdapter.createPreset(materialConfig));
        aurumMetalAdapter.applyReferenceOptics(next,String(materialConfig?.id??""));
        return next;
      };
      x.material=Array.isArray(x.material)?x.material.map(apply):apply(x.material);
      const finalMaterials=Array.isArray(x.material)?x.material:[x.material];
      auditedMaterials.push(...finalMaterials.filter(Boolean).map((m:any)=>({mesh:x.name||x.uuid,material:m})));
      applied++;
    }
  });
  if(applied>0){
    console.info(isWaxMaterial?"[AURUM][WAX MATERIAL AUDIT]":"[AURUM][METAL MATERIAL AUDIT]",{
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
      materials:auditedMaterials.map(({mesh,material:m}:any)=>({
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

export function applyAurumGemToTarget(target:any,gemConfig:any,applyGemEnvironment:(targets?:readonly any[])=>void,requestRender?:()=>void,applyAll=false,onTargetsResolved?:(targets:any[])=>void,onDiamondDispersionTransition?:(targets:any[],from:number,to:number)=>void) {
  if(!target?.isMesh)return false;
  const selectedCategory=selectionCategory(target);
  // GLB meshes without Rhino layer metadata are categorized as "otro".
  // A manual click is an explicit target selection, so allow gem assignment
  // to that mesh only; never infer or recolor neighboring meshes by layer.
  if(selectedCategory!=="gema"&&selectedCategory!=="otro")return false;
  let modelRoot:any=target;
  while(modelRoot.parent)modelRoot=modelRoot.parent;

  const selectedMeta=selectionMeta(target);
  const selectedIdentity=selectionLayerIdentity(target);
  const selectedLayer=selectedIdentity.layerName;
  const selectedLayerNormalized=normalizeAurumGemLayerName(selectedLayer);
  const selectedLayerIndex=selectionLayerIndex(target);
  const selectedLayerId=selectedIdentity.layerId;
  const selectedLayerColor=String(selectedMeta.colorCapa??target.userData?.aurumRhinoSource?.layerColor??target.userData?.attributes?.layerColor??target.userData?.attributes?.LayerColor??"").trim().toLowerCase();

  // MatrixGold's Gem 01–04 names are the user-visible source of truth.
  // Some 3DM/GLB metadata paths can carry a stale/shared Rhino ID, so exact
  // layer name must win whenever present; do not let a shared ID merge layers.
  const hasStableLayerIdentity=selectedCategory==="gema"&&Boolean(selectedLayerNormalized||selectedLayerIndex!=null||(selectedLayerId!=null&&String(selectedLayerId).trim()!==""));
  const assignmentKey=selectedCategory==="otro"
    ? "mesh:"+target.uuid
    : selectedLayerNormalized
      ? "rhino-layer:"+encodeURIComponent(selectedLayerNormalized)
      : selectedLayerIndex!=null
        ? "rhino-index:"+selectedLayerIndex
        : selectedLayerId!=null&&String(selectedLayerId).trim()!==""
          ? "rhino-id:"+String(selectedLayerId).trim()
          : "mesh:"+target.uuid;
  const targets:any[]=[];
  if(selectedCategory==="otro"){
    // Unknown GLB mesh: apply only to the exact mesh the user clicked.
    targets.push(target);
  }else{
    const index=getAurumGemLayerIndex(modelRoot);
    // Prefer the canonical leaf name. If a GLB sibling omitted its name
    // but retained the same Rhino index/ID, use those stable identities only
    // when no exact-name group exists; never merge a conflicting ID into a
    // successfully resolved named layer.
    const indexedTargets=(selectedLayerNormalized
      ? index.byLayerName.get(selectedLayerNormalized)
      : undefined)
      ??(selectedLayerIndex!=null ? index.byLayerIndex.get(selectedLayerIndex) : undefined)
      ??(selectedLayerId!=null&&String(selectedLayerId).trim()!==""
        ? index.byLayerId.get(String(selectedLayerId).trim())
        : undefined);
    if(indexedTargets?.length)targets.push(...indexedTargets);
    if(!targets.length){
      console.error("[AURUM][GEM LAYER ASSIGNMENT FAILED]",{
        selectedMesh:target.name||target.uuid,
        selectedLayer,
        selectedLayerKey:assignmentKey,
        reason:hasStableLayerIdentity?"No mesh matched the selected raw Rhino layer identity":"Missing stable layer identity; using clicked mesh only",
        gemLayerMeshes:index.gemMeshCount,
      });
      targets.push(target);
    }
  }

  // Expose the exact mesh set resolved for this assignment before materials
  // are replaced, so the transition snapshots only this gemstone/layer.
  const isDiamondToDiamond = String(gemConfig?.familia??"").toLowerCase()==="diamante"
    && targets.length>0
    && targets.every((part:any)=>String(part.userData?.aurumActiveGemFamily??"").toLowerCase()==="diamante");
  // Catalog profile switching applies to every selected diamond, including
  // the focal/large stone. Its brilliant tier remains 1:1; melee tiers keep
  // their dedicated micro/small/medium optical multipliers.
  if(isDiamondToDiamond){
    const targetDispersion=Math.max(0,Math.min(.1,Number(gemConfig?.diamondMaterialParameters?.dispersion ?? gemConfig?.dispersion ?? 0)));
    const currentMaterials=targets.flatMap((part:any)=>Array.isArray(part.material)?part.material:[part.material]).filter(Boolean);
    const fromDispersion=Number(targets[0]?.userData?.aurumDiamondSourceDispersion
      ?? currentMaterials[0]?.userData?.aurumIJEWELParameters?.dispersion
      ?? currentMaterials[0]?.userData?.aurumDiamondSourceDispersion
      ?? currentMaterials[0]?.dispersion
      ?? targetDispersion);
    if(currentMaterials.length){
      const selectedDiamondColor=Number(gemConfig?.color??0xffffff);
      const selectedDiamondParameters=gemConfig?.diamondMaterialParameters??{};
      const selectedBoost=selectedDiamondParameters.boostFactors??{x:1,y:1,z:1};
      currentMaterials.forEach((material:any)=>{
        if(!material) return;
        material.color?.setHex(selectedDiamondColor);
        material.envMapIntensity=Math.max(0,Number(gemConfig?.envMapIntensity??material.envMapIntensity??1));
        material.dispersion=targetDispersion;
        material.attenuationColor?.setHex(Number(gemConfig?.attenuationColor??selectedDiamondColor));
        material.attenuationDistance=Math.max(.1,Number(gemConfig?.attenuationDistance??material.attenuationDistance??100));
        const prior=material.userData??{};
        const priorIje=prior.aurumIJEWELParameters??{};
        material.userData={
          ...prior,
          aurumIJEWELParameters:{
            ...priorIje,
            color:selectedDiamondColor,
            dispersion:targetDispersion,
            boostFactors:selectedBoost,
          },
          aurumDiamondCatalogProfile:String(gemConfig?.id??""),
          aurumDiamondCatalogColor:selectedDiamondColor,
        };
        const boostUniform=material.userData?.aurumIJEWELUniforms?.boostFactors;
        boostUniform?.value?.set?.(Number(selectedBoost.x??1),Number(selectedBoost.y??1),Number(selectedBoost.z??1));
        material.needsUpdate=true;
      });
      const currentRootData=modelRoot.userData??{};
      const currentAssignments=currentRootData.aurumGemLayerAssignments??{};
      modelRoot.userData={
        ...currentRootData,
        aurumGemLayerAssignments:{
          ...currentAssignments,
          [assignmentKey]:{
            ...(currentAssignments[assignmentKey]??{}),
            layerKey:assignmentKey,
            layerName:selectedLayer||null,
            layerIndex:selectedLayerIndex,
            layerId:selectedLayerId==null?null:String(selectedLayerId),
            gemId:String(gemConfig?.id??""),
            gemName:String(gemConfig?.nombre??gemConfig?.id??""),
            updatedAt:Date.now(),
            matchedMeshUuids:targets.map((part:any)=>part.uuid),
            identityResolved:hasStableLayerIdentity,
          },
        },
      };
      targets.forEach((part:any)=>{
        const materials=Array.isArray(part.material)?part.material:[part.material];
        materials.forEach((material:any)=>{
          if(!material) return;
          material.userData={
            ...(material.userData??{}),
            aurumGemFamily:"Diamante",
            aurumIJEWELParameters:{
              ...(material.userData?.aurumIJEWELParameters??{}),
              dispersion:fromDispersion,
            },
            aurumDiamondPresetId:String(gemConfig?.id??""),
            aurumDiamondSourceDispersion:fromDispersion,
          };
          material.dispersion=fromDispersion;
        });
        part.userData={
          ...(part.userData??{}),
          aurumGemApplicationToken:Number(part.userData?.aurumGemApplicationToken??0)+1,
          aurumActiveGemId:String(gemConfig?.id??""),
          aurumActiveGemFamily:"diamante",
          aurumDiamondSourceDispersion:fromDispersion,
          aurumDiamondDispersionOnlyUpdate:true,
        };
      });
      onTargetsResolved?.(targets.slice());
      onDiamondDispersionTransition?.(targets.slice(),fromDispersion,targetDispersion);
      requestRender?.();
      return true;
    }
  }
  onTargetsResolved?.(targets.slice());

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
    matchedMeshUuids:targets.map((part:any)=>part.uuid),
    identityResolved:hasStableLayerIdentity,
  };
  modelRoot.userData={
    ...rootUserData,
    aurumGemLayerAssignments:{
      ...priorAssignments,
      [assignmentKey]:assignment,
    },
  };
  const gemAuditEnabled=typeof window!=="undefined"
    && new URLSearchParams(window.location.search).get("aurumGemAudit")==="1";
  if(gemAuditEnabled){
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
      matches:targets.map((part:any)=>({
        mesh:part.name||part.uuid,
        layer:selectionMeta(part).capa??part.userData?.attributes?.layerName??null,
        layerKey:selectionMeta(part).layerKey??null,
        category:selectionCategory(part),
        layerIndex:selectionLayerIndex(part),
        layerId:selectionMeta(part).rhinoLayerId??part.userData?.attributes?.layerId??part.userData?.attributes?.LayerId??null,
      })),
    });
  }

  const physicalModel=resolveAurumGemPhysicalModel(gemConfig);
  const preset:any=presetFromCatalog(gemConfig);
  const opticalProfile=opticalProfileFromCatalog(gemConfig);
  const thickness=estimateAurumGemThickness(target,preset.thicknessScale);
  const apply=(base:any,partTarget:any,partThickness:number,thicknessMap:THREE.DataTexture|null)=>{
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
    aurumGemAdapter.applyBaseMaterial(next,preset,partThickness);
    aurumGemAdapter.applyOpticalProfile(next,opticalProfile);
    applyAurumFamilyOpticalResponse(next,opticalProfile);
    applyAurumInternalLightResponse(next,opticalProfile,partThickness);
    attachAurumGemPhysicalModel(next,physicalModel);
    if(preset.familia==="Diamante")aurumGemAdapter.applyDiamondOptics(next);
    applyAurumIJEWELReferenceFromMaterial(next,String(base?.name??next?.name??""));
    // Apply the emerald reference calibration last: a matching source .dmat
    // can otherwise overwrite the selected catalog hue and environment level.
    // Keep the diamond path and its ordering unchanged.
    if(preset.familia==="Esmeralda"){
      aurumGemAdapter.applyReferenceOptics(next,preset.familia);
      // The catalog grade is the source of truth for emerald appearance. The
      // generic engine preset above contains one shared emerald profile and
      // otherwise makes Quality 1/2/3 look alike, especially in the live view.
      next.color?.setHex(Number(gemConfig?.color??preset.color));
      next.transmission=Math.max(0,Math.min(1,Number(gemConfig?.transmission??preset.transmission)));
      next.ior=Math.max(1.01,Math.min(2.65,Number(gemConfig?.ior??preset.ior)));
      next.roughness=Math.max(0,Math.min(1,Number(gemConfig?.roughness??preset.roughness)));
      next.envMapIntensity=Math.max(0,Number(gemConfig?.envMapIntensity??preset.envMapIntensity));
      next.attenuationColor?.setHex(Number(gemConfig?.attenuationColor??gemConfig?.color??preset.attenuationColor));
      next.attenuationDistance=Math.max(.1,Number(gemConfig?.attenuationDistance??preset.attenuationDistance));
      next.dispersion=Math.max(0,Number(gemConfig?.dispersion??preset.dispersion));
      next.iridescence=Math.max(0,Math.min(1,Number(gemConfig?.iridescence??preset.iridescence)));
      next.userData={
        ...(next.userData??{}),
        aurumGemFamily:"Esmeralda",
        aurumEmeraldCatalogGrade:String(gemConfig?.id??""),
        aurumEmeraldCatalogProfileApplied:true,
        // The live renderer caches authored transmission once per material.
        // Refresh that cache whenever a new emerald grade is applied, otherwise
        // switching grades can keep using the previous grade's transmission.
        aurumLiveTransmissionStored:Math.max(0,Math.min(1,Number(gemConfig?.transmission??preset.transmission))),
      };
      next.needsUpdate=true;
    }
    if(preset.familia==="Diamante"){
      // The shared diamond reference optics are calibrated against a white
      // brilliant and can overwrite the selected catalog hue. Re-apply the
      // selected profile color after reference optics, without changing the
      // protected diamond shader/BVH pipeline.
      const diamondColor=Number(gemConfig?.color??preset.color??0xffffff);
      next.color?.setHex(diamondColor);
      const sourceDiamondParameters=gemConfig?.diamondMaterialParameters??preset.diamondMaterialParameters;
      if(sourceDiamondParameters){
        const currentDiamondParameters=next.userData?.aurumIJEWELParameters??{};
        next.userData={
          ...(next.userData??{}),
          aurumIJEWELParameters:{
            ...currentDiamondParameters,
            color:diamondColor,
            boostFactors:sourceDiamondParameters.boostFactors??currentDiamondParameters.boostFactors,
            dispersion:Number(sourceDiamondParameters.dispersion??currentDiamondParameters.dispersion??preset.dispersion??0),
          },
          aurumDiamondCatalogProfile:String(gemConfig?.id??preset.id??""),
          aurumDiamondCatalogColor:diamondColor,
        };
      }
      // Applying a gem to a MatrixGold layer must use the same dedicated
      // spectral shader as the initial diamond preview. Do this after the
      // source-reference metadata is attached so activation cannot be lost.
      activateAurumDiamondMaterial(next,preset);
      next.color?.setHex(diamondColor);
      next.needsUpdate=true;
    }
    applyAurumDynamicScintillation(next,{...opticalProfile,crystal:physicalModel.crystal,structure:physicalModel.structure,luminescence:physicalModel.luminescence} as any);
    const geometry=partTarget?.geometry;
    const hasUsableNormals=!!geometry?.attributes?.normal&&geometry.attributes.normal.count===geometry.attributes.position?.count;
    next.flatShading=!hasUsableNormals;
    next.thickness=partThickness;
    next.thicknessMap=thicknessMap;
    next.needsUpdate=true;
    return next;
  };
  const activeGemId=String(gemConfig?.id??"");
  const activeGemFamily=String(gemConfig?.familia??"").toLocaleLowerCase();
  const scheduleIdle=(callback:()=>void,timeout=900)=>{
    if(typeof window!=="undefined" && typeof (window as any).requestIdleCallback==="function"){
      (window as any).requestIdleCallback(callback,{timeout});
    }else if(typeof window!=="undefined"){
      window.setTimeout(callback,80);
    }else{
      callback();
    }
  };

  // Critical path: assign all physical catalog materials first. No full-model
  // environment walk, inclusion construction, geometry audit or thickness bake
  // is allowed to delay the first visible frame.
  const enrichmentJobs:Array<()=>void>=[];
  targets.forEach((part:any)=>{
    const stableSourceMaterials=getAurumSourceMaterials(part);
    const originalMaterialIsArray=hadAurumSourceMaterialArray(part);
    part.material=originalMaterialIsArray
      ? stableSourceMaterials.map((base:any)=>apply(base,part,thickness,null))
      : apply(stableSourceMaterials[0],part,thickness,null);
    const applicationToken=Number(part.userData?.aurumGemApplicationToken??0)+1;
    part.userData={
      ...part.userData,
      aurumGemApplicationToken:applicationToken,
      aurumActiveGemId:activeGemId,
      aurumActiveGemFamily:activeGemFamily,
      ...(activeGemFamily==="diamante" ? { aurumDiamondSourceDispersion:Number(gemConfig?.diamondMaterialParameters?.dispersion ?? gemConfig?.dispersion ?? 0) } : {}),
      aurumFacetNormalsApplied:true,
      aurumFacetNormalMode:part.geometry?.attributes?.normal?"authored-or-crease":"flat-fallback",
      aurumOpticalThickness:thickness,
      aurumOpticalThicknessSpace:"local",
      aurumOpticalThicknessMode:"local-bounds-v1",
      aurumGemThicknessMapDiagnostics:null,
      aurumGemGeometryDiagnostics:null,
      ...(String(gemConfig?.familia??"")==="Diamante" ? { aurumDiamondPipelineDiagnostics:null } : {}),
      aurumGemPhysicalModel:{
        ...physicalModel,
        crystal:{
          ...physicalModel.crystal,
          axisA:physicalModel.crystal.axisA.toArray(),
          axisB:physicalModel.crystal.axisB.toArray(),
          axisC:physicalModel.crystal.axisC.toArray(),
        },
      },
    };
    // Remove only this stone's previous internal inclusions. Their replacement
    // is built after the new material has already been painted.
    clearAurumInclusions(part);
    const expectedMaterials=Array.isArray(part.material)?[...part.material]:[part.material];
    const isCurrentApplication=()=>{
      let root=part;
      while(root?.parent)root=root.parent;
      if(root?.userData?.aurumDisposed)return false;
      if(part.userData?.aurumGemApplicationToken!==applicationToken||part.userData?.aurumActiveGemId!==activeGemId)return false;
      const currentMaterials=Array.isArray(part.material)?part.material:[part.material];
      return currentMaterials.length===expectedMaterials.length
        && currentMaterials.every((mat:any,index:number)=>mat===expectedMaterials[index]);
    };

    enrichmentJobs.push(()=>{
      if(!isCurrentApplication())return;
      const isCatalogEmeraldGrade=activeGemFamily==="esmeralda"
        && ["esmeralda_1","esmeralda_2","esmeralda_3","esmeralda_inclusiones"].includes(activeGemId);
      // Latin catalog profiles already provide their own inclusion geometry.
      // Avoid creating generic inclusions only to clear and replace them again.
      if(gemConfig?.perfilInterno && !isCatalogEmeraldGrade){
        if(!applyAurumLatinGemProfile(part,gemConfig)){
          renderAurumInclusions(THREE,part,gemConfig,9173,preset);
        }
      }else{
        renderAurumInclusions(THREE,part,gemConfig,9173,preset);
        if(gemConfig?.perfilInterno)applyAurumLatinGemProfile(part,gemConfig);
      }

      const geometryDiagnostics=inspectAurumGemGeometry(part);
      const diamondDiagnostics=String(gemConfig?.familia??"")==="Diamante"
        ? getAurumDiamondPipelineDiagnostics(part,"high")
        : null;
      if(!isCurrentApplication())return;
      part.userData={
        ...part.userData,
        aurumGemGeometryDiagnostics:geometryDiagnostics,
        ...(diamondDiagnostics?{aurumDiamondPipelineDiagnostics:diamondDiagnostics}:{ }),
      };
      if(gemAuditEnabled){
        const materials=Array.isArray(part.material)?part.material:[part.material];
        console.info("[AURUM][GEM APPLICATION]",{
          mesh:part.name||part.uuid,
          selectedGem:{id:activeGemId,nombre:String(gemConfig?.nombre??""),familia:String(gemConfig?.familia??""),color:String(gemConfig?.color??"")},
          material:materials.filter(Boolean).map((m:any)=>({
            color:m.color?.getHexString?.()??null,
            transmission:m.transmission??null,
            ior:m.ior??null,
            roughness:m.roughness??null,
            thickness:m.thickness??null,
          })),
          geometry:geometryDiagnostics,
          diamond:diamondDiagnostics,
        });
      }

      // Per-ray thickness is optional refinement. It runs after paint and only
      // if this exact application is still current (rapid catalog changes cancel
      // stale work without touching the new material).
      scheduleIdle(()=>{
        if(!isCurrentApplication())return;
        try{
          const thicknessResolution=preset.familia==="Diamante"?512:preset.familia==="Moissanita"?384:256;
          const result=buildAurumThicknessMap(part,preset.thicknessScale,thicknessResolution);
          if(!result||!isCurrentApplication())return;
          const materials=Array.isArray(part.material)?part.material:[part.material];
          materials.forEach((mat:any)=>{
            if(!mat)return;
            mat.thickness=result.baseThickness;
            mat.thicknessMap=result.texture;
            mat.needsUpdate=true;
          });
          part.userData={
            ...part.userData,
            aurumOpticalThickness:result.baseThickness,
            aurumGemThicknessMapDiagnostics:{
              method:result.method,
              hitRatio:result.hitRatio,
              minDepth:result.minDepth,
              maxDepth:result.maxDepth,
              cacheKey:result.cacheKey,
              normalMapRes:result.normalMapRes,
            },
          };
          requestRender?.();
        }catch(error){
          if(gemAuditEnabled)console.warn("[AURUM][GEM THICKNESS MAP]",error);
        }
      },1400);
    });
  });

  // Apply the gem HDR only to the meshes assigned by this click, then paint.
  // The rest of the model is not traversed or rewritten during a catalog change.
  applyGemEnvironment(targets);
  requestRender?.();
  const runNextEnrichmentJob=()=>{
    const nextJob=enrichmentJobs.shift();
    nextJob?.();
    // Large MatrixGold layers are enriched one mesh per idle turn instead of
    // running every inclusion/diagnostic task in a single long browser task.
    if(enrichmentJobs.length)scheduleIdle(runNextEnrichmentJob,700);
  };
  if(enrichmentJobs.length)scheduleIdle(runNextEnrichmentJob,700);
  return true;
}
export function clearAurumGemFromTarget(target:any){if(target)clearAurumInclusions(target);}
