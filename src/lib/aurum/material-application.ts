import * as THREE from "three";
import {
  applyAurumMetal,
  applyAurumGem,
  applyAurumOpticalProfile,
  applyAurumDiamondOptics,
  getAurumOpticalProfile,
  metalPresetFromConfig,
} from "../aurum-material-engine";
import { applyAurumFamilyOpticalResponse } from "./optical-response";
import { applyAurumDynamicScintillation } from "./scintillation";
import { applyAurumInternalLightResponse } from "./internal-light-response";
import { renderAurumInclusions, clearAurumInclusions } from "./gems";
import { applyAurumLatinGemProfile } from "./latin-gem-catalog";
import { buildAurumThicknessMap } from "./thickness-map";

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
  const pleochroism=(family==="Tanzanita"||family==="Turmalina"||family==="Peridoto")
    ? {
        enabled:true,
        strength:family==="Tanzanita" ? (gemId==="tanzanita_natural"?.42:.36) : family==="Turmalina" ? .30 : .16,
        thirdAxisStrength:family==="Tanzanita" ? (gemId==="tanzanita_natural"?.12:.08) : family==="Turmalina" ? .07 : .04,
        axisC:family==="Tanzanita"
          ? (gemId==="tanzanita_natural"?"yellowGreen":"redViolet")
          : family==="Turmalina"
            ? (gemId==="turmalina_verde"?"deepGreen":gemId==="turmalina_rosa"?"deepRose":"deepBlue")
            : "yellowGreen",
      }
    : undefined;
  const familyFire=family==="Zircon"
    ? .82
    : gemId==="granate_demantoide"
      ? .76
      : Number(base.fire??.35);
  const familyBrilliance=family==="Zircon" ? 1.02 : Number(base.brilliance??.75);
  return {
    ...base,
    ior:Number(g.ior??base.ior),
    transmission:Number(g.transmission??base.transmission),
    dispersion:Number(g.dispersion??base.dispersion),
    absorptionDistance:Number(g.attenuationDistance??base.absorptionDistance),
    ...(pleochroism?{pleochroism}:{}),
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
  const preset:any=presetFromCatalog(gemConfig);
  const opticalProfile=opticalProfileFromCatalog(gemConfig);
  const thickness=estimateAurumGemThickness(target,preset.thicknessScale);
  const apply=(base:any,partTarget:any,partThickness:number,thicknessMap:THREE.DataTexture|null)=>{
    const next=base?.clone?base.clone():new THREE.MeshPhysicalMaterial();
    applyAurumGem(next,preset,partThickness);
    applyAurumOpticalProfile(next,opticalProfile);
    applyAurumFamilyOpticalResponse(next,opticalProfile);
    applyAurumInternalLightResponse(next,opticalProfile,partThickness);
    applyAurumDynamicScintillation(next,opticalProfile);
    if(preset.familia==="Diamante")applyAurumDiamondOptics(next);
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
