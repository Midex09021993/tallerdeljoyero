import * as THREE from "three";
import { mergeVertices, toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type AurumRenderReadyReport = {
  meshes:number;
  triangles:number;
  repairedNormals:number;
  mergedVertices:number;
  warnings:string[];
};

const isGem=(m:any)=>{
  const u=m?.userData?.aurumRhino;
  const n=String(u?.nombre??m?.name??"").toLowerCase();
  return u?.categoria==="gema" || /(gem|gema|diamond|diamante|ruby|rubi|zafiro|sapphire|emerald|esmeralda|amethyst|amatista|citrine|citrino|topaz|topacio|moissanite|moissanita)/.test(n);
};

export function prepareAurumRenderReady(model:THREE.Object3D):AurumRenderReadyReport{
  const report:AurumRenderReadyReport={meshes:0,triangles:0,repairedNormals:0,mergedVertices:0,warnings:[]};
  model.updateMatrixWorld(true);

  model.traverse((node:any)=>{
    if(!node.isMesh || !node.geometry) return;
    report.meshes++;
    const g=node.geometry as THREE.BufferGeometry;
    const pos=g.getAttribute("position");
    if(!pos) return;
    const triangles=g.index ? g.index.count/3 : pos.count/3;
    report.triangles+=triangles;

    const gem=isGem(node);
    const before=pos.count;

    // Production CAD often arrives with duplicated seam vertices. Merge only
    // non-gem meshes; gemstone facets must keep authored vertex normals.
    if(!gem && pos.count>12){
      try{
        const merged=mergeVertices(g,1e-5);
        if(merged!==g){
          node.geometry=merged;
          report.mergedVertices+=Math.max(0,before-merged.getAttribute("position").count);
          if(merged.getAttribute("normal")?.count!==merged.getAttribute("position")?.count){
            merged.computeVertexNormals();
            report.repairedNormals++;
          }
        }
      }catch{}
    }

    const active=node.geometry as THREE.BufferGeometry;
    if(!active.getAttribute("normal")){
      active.computeVertexNormals();
      report.repairedNormals++;
    }

    // Smooth metal/plastic-like production surfaces while preserving hard
    // jewelry edges and all gem facet boundaries.
    if(!gem && !node.userData?.aurumKeepHardNormals){
      try{
        const creased=toCreasedNormals(active,Math.PI/8);
        node.geometry=creased;
      }catch{}
    }

    const triCount=(node.geometry.index?.count??node.geometry.getAttribute("position")?.count??0)/3;
    if(triCount>200000) report.warnings.push(`${node.name||"Mesh"} supera 200k triángulos; conviene reducir malla.`);
  });

  if(report.triangles>1000000) report.warnings.push("Modelo pesado: más de 1M triángulos.");
  model.updateMatrixWorld(true);
  return report;
}
