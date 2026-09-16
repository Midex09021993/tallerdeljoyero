/** AURUM GEM RENDERING
 * Safe rendering helpers for procedural gem inclusions.
 * Material/optical presets remain in aurum-material-engine.ts.
 */
import { createAurumInclusionConfig, generateAurumInclusionPoints, getAurumGemPreset } from "../aurum-material-engine";

export type AurumGemInclusionInput = { id:string; inclusionStrength?:number; inclusionStyle?:string; };

export const clearAurumInclusions=(target:any)=>{
  const remove:any[]=[];
  target?.traverse?.((child:any)=>{if(child.userData?.aurumInternalInclusion)remove.push(child);});
  remove.forEach(child=>{child.parent?.remove(child);child.geometry?.dispose?.();child.material?.dispose?.();});
};

export const renderAurumInclusions=(THREE:any,target:any,g:AurumGemInclusionInput,seed=9173)=>{
  clearAurumInclusions(target);
  const preset=getAurumGemPreset(g.id);
  const config=createAurumInclusionConfig(preset,seed);
  const enabled=preset.inclusions || (!!g.inclusionStrength && g.inclusionStyle!=="ninguna");
  if(!enabled || config.density<=0)return;
  const box=new THREE.Box3().setFromObject(target);
  const size=box.getSize(new THREE.Vector3());
  const points=generateAurumInclusionPoints(config,56);
  points.forEach((p:any)=>{
    const material=new THREE.MeshPhysicalMaterial({color:config.color,metalness:0,roughness:config.type==="silk"?.34:.22,transmission:config.type==="crystal"?.48:.10,transparent:true,opacity:p.opacity,depthWrite:false,envMapIntensity:.75});
    let geometry:any;
    if(config.type==="needle"||config.type==="silk")geometry=new THREE.CylinderGeometry(p.size*.16,p.size*.16,p.size*3.2,5);
    else if(config.type==="feather"||config.type==="veil")geometry=new THREE.TetrahedronGeometry(p.size*1.6,0);
    else geometry=new THREE.IcosahedronGeometry(p.size,1);
    const inclusion=new THREE.Mesh(geometry,material);
    inclusion.position.set(p.x*size.x*.46,p.y*size.y*.46,p.z*size.z*.46);
    inclusion.rotation.set(p.y*3.1,p.z*4.7,p.x*5.3);
    if(config.type==="silk"||config.type==="needle")inclusion.scale.set(1,1,.35);
    inclusion.userData.aurumInternalInclusion=true;
    inclusion.userData.aurumInclusionType=config.type;
    inclusion.userData.aurumInclusionSeed=config.seed;
    inclusion.renderOrder=12;
    target.add(inclusion);
  });
};
