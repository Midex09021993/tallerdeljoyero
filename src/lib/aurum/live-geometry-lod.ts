import type { Object3D } from "three";

export type AurumLiveGeometryReport = {
  sourceTriangles:number;
  liveTriangles:number;
  simplifiedMeshes:number;
  ready:boolean;
};

const triangleCount=(geometry:any)=>{
  const index=geometry?.getIndex?.();
  const position=geometry?.getAttribute?.("position");
  return Math.floor(Number(index?.count ?? position?.count ?? 0)/3);
};

export async function prepareAurumLiveGeometry(
  root:Object3D,
  options:{maxLiveTriangles?:number; minMeshTriangles?:number; removeRatio?:number}={}
):Promise<AurumLiveGeometryReport>{
  const maxLiveTriangles=Math.max(120000,Math.floor(options.maxLiveTriangles??160000));
  const minMeshTriangles=Math.max(10000,Math.floor(options.minMeshTriangles??20000));
  const removeRatio=Math.max(.35,Math.min(.65,Number(options.removeRatio??.55)));

  let sourceTriangles=0;
  let simplifiedMeshes=0;

  root.traverse((object:any)=>{
    if(!object?.isMesh || !object.geometry || object.userData?.aurumInternalInclusion) return;
    const category=String(object.userData?.aurumRhino?.categoria??"").toLowerCase();
    if(category==="gema") return;
    sourceTriangles+=triangleCount(object.geometry);
  });

  if(sourceTriangles<=maxLiveTriangles){
    root.userData={...(root.userData??{}),aurumLiveGeometryReady:true,aurumLiveGeometryTriangles:sourceTriangles};
    return {sourceTriangles,liveTriangles:sourceTriangles,simplifiedMeshes:0,ready:true};
  }

  const { SimplifyModifier } = await import("three/examples/jsm/modifiers/SimplifyModifier.js");
  const { mergeVertices } = await import("three/examples/jsm/utils/BufferGeometryUtils.js");
  const modifier=new SimplifyModifier();

  const candidates:any[]=[];
  root.traverse((object:any)=>{
    if(!object?.isMesh || !object.geometry || object.userData?.aurumInternalInclusion) return;
    const category=String(object.userData?.aurumRhino?.categoria??"").toLowerCase();
    if(category==="gema") return;
    const triangles=triangleCount(object.geometry);
    if(triangles<minMeshTriangles) return;
    candidates.push(object);
  });

  for(const object of candidates){
    const source=object.geometry;
    if(object.userData?.aurumLiveGeometry) continue;

    try{
      let base=source;
      if(!base.getIndex?.()) base=mergeVertices(base.clone(),1e-4);
      const vertices=Number(base.getAttribute?.("position")?.count??0);
      if(vertices<3000) continue;

      const remove=Math.floor(vertices*removeRatio);
      if(remove<100) continue;

      const simplified=await modifier.modify(base,remove);
      simplified.computeBoundingSphere?.();
      simplified.computeBoundingBox?.();

      object.userData={
        ...(object.userData??{}),
        aurumLiveGeometry: simplified,
        aurumLiveGeometrySource: source,
      };
      simplifiedMeshes++;
    }catch(error){
      // A single problematic CAD mesh must not invalidate the whole viewer.
      object.userData={
        ...(object.userData??{}),
        aurumLiveGeometryError:String(error?.message??error),
      };
    }
  }

  let liveTriangles=0;
  root.traverse((object:any)=>{
    if(!object?.isMesh || !object.geometry || object.userData?.aurumInternalInclusion) return;
    const category=String(object.userData?.aurumRhino?.categoria??"").toLowerCase();
    if(category==="gema") liveTriangles+=triangleCount(object.geometry);
    else liveTriangles+=triangleCount(object.userData?.aurumLiveGeometry??object.geometry);
  });

  root.userData={
    ...(root.userData??{}),
    aurumLiveGeometryReady:true,
    aurumLiveGeometryTriangles:liveTriangles,
  };
  return {sourceTriangles,liveTriangles,simplifiedMeshes,ready:true};
}

export function setAurumLiveGeometryQuality(root:any,quality:"live"|"beauty"){
  if(!root?.userData?.aurumLiveGeometryReady) return;
  root.traverse((object:any)=>{
    if(!object?.isMesh || object.userData?.aurumInternalInclusion) return;
    const live=object.userData?.aurumLiveGeometry;
    const source=object.userData?.aurumLiveGeometrySource;
    if(!live || !source) return;
    object.geometry=quality==="live"?live:source;
  });
}

export function disposeAurumLiveGeometry(root:any){
  root?.traverse?.((object:any)=>{
    const live=object?.userData?.aurumLiveGeometry;
    if(live?.dispose) live.dispose();
    if(object?.userData){
      const next={...object.userData};
      delete next.aurumLiveGeometry;
      delete next.aurumLiveGeometrySource;
      delete next.aurumLiveGeometryError;
      object.userData=next;
    }
  });
  if(root?.userData){
    const next={...root.userData};
    delete next.aurumLiveGeometryReady;
    delete next.aurumLiveGeometryTriangles;
    root.userData=next;
  }
}
