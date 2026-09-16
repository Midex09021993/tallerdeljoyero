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
  const family=String(preset.familia||"");
  points.forEach((p:any)=>{
    // Inclusions are deliberately subdued: in gemology they are internal
    // micro-features, not a decorative noise layer. Their job is to break the
    // perfectly synthetic appearance without overpowering body color.
    const isQuartz=family==="Amatista"||family==="Citrino";
    const isNeedle=config.type==="needle"||config.type==="silk";
    const material=new THREE.MeshPhysicalMaterial({
      color:config.color,
      metalness:0,
      roughness:isNeedle?.42:config.type==="crystal"?.30:.26,
      transmission:config.type==="crystal"?.35:(isQuartz?.02:.06),
      transparent:true,
      opacity:p.opacity*(isQuartz?.58:1),
      depthWrite:false,
      envMapIntensity:isQuartz?.38:.55,
    });
    let geometry:any;
    if(isNeedle){
      // Hematite/goethite-like needle inclusions: long, fine bodies rather
      // than chunky cylinders. GIA documents reddish-brown hematite needles
      // as a recurring natural amethyst feature.
      geometry=new THREE.CylinderGeometry(p.size*.055,p.size*.055,p.size*4.8,5);
    }else if(config.type==="feather"||config.type==="veil"||config.type==="fingerprint"){
      geometry=new THREE.TetrahedronGeometry(p.size*1.15,0);
    }else{
      geometry=new THREE.IcosahedronGeometry(p.size*.72,1);
    }
    const inclusion=new THREE.Mesh(geometry,material);
    inclusion.position.set(p.x*size.x*.42,p.y*size.y*.42,p.z*size.z*.42);
    inclusion.rotation.set(p.y*3.1,p.z*4.7,p.x*5.3);
    if(isNeedle){
      inclusion.scale.set(1,.55,.55);
      // Natural quartz needles tend to follow growth directions; introduce a
      // preferred axis instead of uniformly random "sparkle" orientations.
      inclusion.rotation.z += (config.seed%3-1)*0.18;
    }
    inclusion.userData.aurumInternalInclusion=true;
    inclusion.userData.aurumInclusionType=config.type;
    inclusion.userData.aurumInclusionSeed=config.seed;
    inclusion.renderOrder=12;
    target.add(inclusion);
  });
};
