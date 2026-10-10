import type { Object3D } from "three";

export type AurumLiveGeometryReport = {
  sourceTriangles:number;
  liveTriangles:number;
  simplifiedMeshes:number;
  ready:boolean;
};

/**
 * Live geometry policy:
 * Do not run SimplifyModifier in the browser's main thread. It can block the
 * UI for several seconds on dense CAD meshes. Keep authored geometry intact;
 * performance is managed by the stable LIVE render budget instead.
 */
const countTriangles=(root:any)=>{
  let triangles=0;
  root?.traverse?.((object:any)=>{
    if(!object?.isMesh || !object.geometry || object.userData?.aurumInternalInclusion) return;
    const index=object.geometry.getIndex?.();
    const position=object.geometry.getAttribute?.("position");
    triangles+=Math.floor(Number(index?.count ?? position?.count ?? 0)/3);
  });
  return triangles;
};

export async function prepareAurumLiveGeometry(
  root:Object3D,
  _options:{maxLiveTriangles?:number; minMeshTriangles?:number; removeRatio?:number}={}
):Promise<AurumLiveGeometryReport>{
  const sourceTriangles=countTriangles(root);
  root.userData={
    ...(root.userData??{}),
    aurumLiveGeometryReady:true,
    aurumLiveGeometryTriangles:sourceTriangles,
  };
  return {sourceTriangles,liveTriangles:sourceTriangles,simplifiedMeshes:0,ready:true};
}

/** Geometry is unchanged between LIVE and CAPTURE. */
export function setAurumLiveGeometryQuality(_root:any,_quality:"live"|"beauty"){}

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
