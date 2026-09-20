import * as THREE from "three";
import {
  applyAurumMetal,
  applyAurumGem,
  applyAurumOpticalProfile,
  applyAurumDiamondOptics,
  applyAurumReferenceGemOptics,
  applyAurumReferenceMetalOptics,
  getAurumOpticalProfile,
  metalPresetFromConfig,
} from "../aurum-material-engine";
import { applyAurumFamilyOpticalResponse } from "./optical-response";
import { applyAurumDynamicScintillation } from "./scintillation";
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

export function applyAurumMaterialToModel(model:any,activePart:any,materialConfig:any,sharedMaterial:any) {
  if (!model || !activePart?.isMesh) return false;
  const selectedMeta=selectionMeta(activePart);
  const selectedLayer=selectedMeta.capa||activePart?.userData?.attributes?.layerName||null;
  const selectedCategory=selectionCategory(activePart);
  const selectedSlot=selectedMeta.matrixSlot;
  if(selectedCategory!=="metal"&&selectedCategory!=="otro") return false;
  applyAurumMetal(sharedMaterial,metalPresetFromConfig(materialConfig));
  applyAurumReferenceMetalOptics(sharedMaterial,String(materialConfig?.id??""));
  let applied=0;
  model.traverse((x:any)=>{
    if(!x.isMesh)return;
    x.castShadow=true;x.receiveShadow=true;
    const meta=selectionMeta(x),category=selectionCategory(x);
    const sameLayer=!!selectedLayer&&meta.capa===selectedLayer&&category===selectedCategory;
    const sameSlot=selectedSlot!=null&&meta.matrixSlot===selectedSlot&&category===selectedCategory;
    const shouldApply=x.uuid===activePart.uuid||(selectedCategory==="otro"&&sameLayer)||(selectedCategory==="metal"&&(sameLayer||sameSlot));
    if(shouldApply){
      const apply=(base:any)=>{const next=base?.clone?base.clone():sharedMaterial.clone();applyAurumMetal(next,metalPresetFromConfig(materialConfig));return next;};
      x.material=Array.isArray(x.material)?x.material.map(apply):apply(x.material);applied++;
    }
  });
  return applied>0;
}

export function applyAurumGemToTarget(target:any,gemConfig:any,applyGemEnvironment:()=>void) {
  if(!target?.isMesh)return false;
  const selectedCategory=selectionCategory(target);
  if(selectedCategory!=="gema"&&selectedCategory!=="otro")return false;
  const modelRoot=target.parent?.parent?(()=>{let r=target;while(r.parent)r=r.parent;return r;})():target;
  const selectedMeta=selectionMeta(target);
  const selectedLayer=selectedMeta.capa||target.userData?.attributes?.layerName||null;
  const selectedSlot=selectedMeta.matrixSlot;
  const targets:any[]=[];
  modelRoot?.traverse?.((x:any)=>{
    if(!x.isMesh||x.userData?.aurumInternalInclusion)return;
    const meta=selectionMeta(x),category=selectionCategory(x);
    const sameLayer=!!selectedLayer&&meta.capa===selectedLayer&&category===selectedCategory;
    const sameSlot=selectedSlot!=null&&meta.matrixSlot===selectedSlot&&category===selectedCategory;
    if(x===target||(selectedCategory==="otro"&&sameLayer)||(selectedCategory==="gema"&&(sameLayer||sameSlot)))targets.push(x);
  });
  if(!targets.length)targets.push(target);
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
    applyAurumDynamicScintillation(next,{...opticalProfile,crystal:physicalModel.crystal,structure:physicalModel.structure,luminescence:physicalModel.luminescence} as any);
    if(preset.familia==="Diamante")applyAurumDiamondOptics(next);
    // The new scene shows iJewel using its specialized DiamondMaterial even
    // for the emerald asset. Preserve that reference behavior while keeping
    // Aurum's physical emerald transmission model in Three.js.
    if(preset.familia==="Esmeralda")applyAurumReferenceGemOptics(next,preset.familia);
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
    // Apply the proven scalar thickness immediately so selecting a gem never
    // waits for the optional spatial bake.
    part.material=Array.isArray(part.material)
      ? part.material.map((base:any)=>apply(base,part,thickness,null))
      : apply(part.material,part,thickness,null);
    part.userData={...part.userData,aurumFacetNormalsApplied:true,aurumFacetNormalMode:part.geometry?.attributes?.normal?"authored-or-crease":"flat-fallback",aurumOpticalThickness:thickness,aurumOpticalThicknessSpace:"local",aurumOpticalThicknessMode:"local-bounds-v1",aurumGemThicknessMapDiagnostics:null,aurumGemGeometryDiagnostics:inspectAurumGemGeometry(part)};
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
    // This keeps the UI/render loop responsive and leaves the scalar fallback
    // visible if the optional bake cannot be completed.
    setTimeout(()=>{
      try{
        const result=buildAurumThicknessMap(part,preset.thicknessScale,96);
        if(!result)return;
        const materials=Array.isArray(part.material)?part.material:[part.material];
        materials.forEach((mat:any)=>{
          if(!mat)return;
          mat.thickness=result.baseThickness;
          mat.thicknessMap=result.texture;
          mat.needsUpdate=true;
        });
        part.userData={...part.userData,aurumOpticalThickness:result.baseThickness,aurumOpticalThicknessMode:"uv-ray-depth-v1",aurumGemThicknessMapDiagnostics:{hitRatio:Number(result.hitRatio.toFixed(3)),minDepth:Number(result.minDepth.toFixed(4)),maxDepth:Number(result.maxDepth.toFixed(4)),resolution:96}};
        console.warn("[AURUM][GEM THICKNESS]", { mesh:part.name||part.uuid, geometry:part.userData.aurumGemGeometryDiagnostics, thickness:part.userData.aurumOpticalThickness, map:part.userData.aurumGemThicknessMapDiagnostics });
      }catch(error){
        console.warn("[AURUM][GEM THICKNESS] spatial bake skipped", {mesh:part.name||part.uuid,error});
      }
    },0);
  });
  applyGemEnvironment();
  return true;
}

export function clearAurumGemFromTarget(target:any){if(target)clearAurumInclusions(target);}
