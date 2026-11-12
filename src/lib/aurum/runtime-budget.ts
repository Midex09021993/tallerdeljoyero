/**
 * AURUM RUNTIME BUDGET
 *
 * Keeps interactive rendering independent from the requested beauty quality.
 * Live raster resolution receives a +0.10 DPR bump per geometry tier;
 * existing caps remain the hard safety ceiling for dense CAD assemblies.
 * Jewelry CAD can be much denser than a web-ready asset; the budget caps the
 * GPU-heavy transmission/DPR path without changing geometry or material identity.
 *
 * iJewel recommends keeping runtime jewelry assets around 200k polygons and
 * explicitly exposes lower-quality progressive rendering for faster interaction.
 */
export type AurumRuntimeBudget = {
  triangleCount:number;
  tier:"web"|"dense"|"very-dense"|"extreme";
  pixelRatioCap:number;
  transmissionScaleCap:number;
  interactionTransmissionScale:number;
  interactionPixelRatio:number;
};

export function countAurumTriangles(root:any):number {
  let triangles=0;
  root?.traverse?.((x:any)=>{
    if(!x?.isMesh || !x.geometry) return;
    const index=x.geometry.getIndex?.();
    const position=x.geometry.getAttribute?.("position");
    const count=index?.count ?? position?.count ?? 0;
    triangles += Math.floor(Number(count)/3);
  });
  return triangles;
}

export function getAurumRuntimeBudget(triangleCount:number):AurumRuntimeBudget {
  const triangles=Math.max(0,Math.floor(Number(triangleCount)||0));

  if(triangles<=200_000){
    return {triangleCount:triangles,tier:"web",pixelRatioCap:1.5,transmissionScaleCap:.50,interactionTransmissionScale:.22,interactionPixelRatio:1.45};
  }
  if(triangles<=500_000){
    return {triangleCount:triangles,tier:"dense",pixelRatioCap:1.25,transmissionScaleCap:.32,interactionTransmissionScale:.17,interactionPixelRatio:1.20};
  }
  if(triangles<=900_000){
    return {triangleCount:triangles,tier:"very-dense",pixelRatioCap:1.10,transmissionScaleCap:.25,interactionTransmissionScale:.13,interactionPixelRatio:1.10};
  }
  return {triangleCount:triangles,tier:"extreme",pixelRatioCap:1.0,transmissionScaleCap:.20,interactionTransmissionScale:.12,interactionPixelRatio:1.0};
}
