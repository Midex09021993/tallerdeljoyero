/** AURUM GEM RENDERING
 * Procedural gemstone inclusions.
 * The renderer keeps inclusions inside the stone volume and uses family-specific
 * structures for natural emeralds instead of generic floating particles.
 */
import { createAurumInclusionConfig, generateAurumInclusionPoints, getAurumGemPreset } from "../aurum-material-engine";

export type AurumGemInclusionInput = { id:string; inclusionStrength?:number; inclusionStyle?:string; };

export const clearAurumInclusions=(target:any)=>{
  const remove:any[]=[];
  target?.traverse?.((child:any)=>{if(child.userData?.aurumInternalInclusion)remove.push(child);});
  remove.forEach(child=>{child.parent?.remove(child);child.geometry?.dispose?.();child.material?.dispose?.();});
};

const addEmeraldInclusions=(THREE:any,target:any,config:any,size:any)=>{
  let s=(config.seed>>>0)||1;
  const rnd=()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};
  const strength=Math.max(0,Math.min(1,config.density));
  const count=Math.max(3,Math.round(5+strength*15));

  // Jardin: irregular translucent branching structures kept sparse so the
  // emerald reads as a natural internal garden rather than surface scratches.
  for(let i=0;i<count;i++){
    const points:any[]=[];
    const start=new THREE.Vector3((rnd()-.5)*size.x*.62,(rnd()-.5)*size.y*.62,(rnd()-.5)*size.z*.62);
    const dir=new THREE.Vector3(rnd()-.5,rnd()-.5,rnd()-.5).normalize();
    const length=Math.min(size.x,size.y,size.z)*(.12+rnd()*.28);
    const steps=3+Math.floor(rnd()*4);
    for(let j=0;j<steps;j++){
      const t=j/(steps-1);
      const p=start.clone().add(dir.clone().multiplyScalar(length*t));
      p.x+=Math.sin(t*Math.PI*2+rnd()*2)*length*.09;
      p.y+=Math.cos(t*Math.PI*1.7+rnd()*2)*length*.07;
      points.push(p);
    }
    const curve=new THREE.CatmullRomCurve3(points);
    const geometry=new THREE.TubeGeometry(curve,8,Math.max(.0008,Math.min(size.x,size.y,size.z)*.006),4,false);
    const material=new THREE.MeshPhysicalMaterial({color:0x6b9278,metalness:0,roughness:.55,transmission:.12,transparent:true,opacity:.035+strength*.055,depthWrite:false,envMapIntensity:.32});
    const mesh=new THREE.Mesh(geometry,material);
    mesh.userData={aurumInternalInclusion:true,aurumInclusionType:"emerald-jardin"};
    target.add(mesh);

    // Occasional solid mineral micro-crystal associated with the jardin.
    if(rnd()<.30+strength*.25){
      const crystalSize=Math.min(size.x,size.y,size.z)*(.006+rnd()*.012);
      const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(crystalSize,0),new THREE.MeshPhysicalMaterial({color:rnd()<.65?0x7f8a79:0x3f4d42,roughness:.30,transmission:.18,transparent:true,opacity:.16+strength*.12,depthWrite:false,envMapIntensity:.45}));
      crystal.position.copy(points[Math.floor(rnd()*points.length)]);
      crystal.rotation.set(rnd()*3,rnd()*3,rnd()*3);
      crystal.userData={aurumInternalInclusion:true,aurumInclusionType:"emerald-crystal"};
      target.add(crystal);
    }
  }

  // Sparse three-phase micro-inclusions: fluid pocket + gas bubble + solid.
  // GIA documents multiphase liquid/gas/solid scenes as common in natural
  // emeralds, so these are intentionally rare and low contrast.
  const fluidCount=Math.max(1,Math.round(1+strength*4));
  for(let i=0;i<fluidCount;i++){
    const base=new THREE.Vector3((rnd()-.5)*size.x*.48,(rnd()-.5)*size.y*.48,(rnd()-.5)*size.z*.48);
    const pocketSize=Math.min(size.x,size.y,size.z)*(.012+rnd()*.018);
    const pocket=new THREE.Mesh(new THREE.SphereGeometry(pocketSize,10,6),new THREE.MeshPhysicalMaterial({color:0x9bb5a7,roughness:.08,transmission:.55,transparent:true,opacity:.08+strength*.06,depthWrite:false,envMapIntensity:.55}));
    pocket.position.copy(base); pocket.scale.set(1.5,.65,.8);
    pocket.userData={aurumInternalInclusion:true,aurumInclusionType:"emerald-fluid"};
    target.add(pocket);

    const bubble=new THREE.Mesh(new THREE.SphereGeometry(pocketSize*.25,8,6),new THREE.MeshBasicMaterial({color:0xeef8f1,transparent:true,opacity:.20+strength*.10,depthWrite:false}));
    bubble.position.copy(base).add(new THREE.Vector3(pocketSize*.45,pocketSize*.12,pocketSize*.08));
    bubble.userData={aurumInternalInclusion:true,aurumInclusionType:"emerald-gas-bubble"};
    target.add(bubble);

    const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(pocketSize*.34,0),new THREE.MeshPhysicalMaterial({color:0xd8ddd8,roughness:.24,transmission:.08,transparent:true,opacity:.18,depthWrite:false,envMapIntensity:.35}));
    crystal.position.copy(base).add(new THREE.Vector3(-pocketSize*.30,-pocketSize*.05,0));
    crystal.rotation.set(rnd()*3,rnd()*3,rnd()*3);
    crystal.userData={aurumInternalInclusion:true,aurumInclusionType:"emerald-fluid-crystal"};
    target.add(crystal);
  }
};

export const renderAurumInclusions=(THREE:any,target:any,g:AurumGemInclusionInput,seed=9173,providedPreset?:any)=>{
  clearAurumInclusions(target);
  const preset=providedPreset ?? getAurumGemPreset(g.id);
  const config=createAurumInclusionConfig(preset,seed);
  const enabled=preset.inclusions || (!!g.inclusionStrength && g.inclusionStyle!=="ninguna");
  if(!enabled || config.density<=0)return;
  const box=new THREE.Box3().setFromObject(target);
  const size=box.getSize(new THREE.Vector3());

  // Emeralds get a dedicated inclusion scene instead of the generic particle
  // system used by other gemstones.
  if(preset.familia==="Esmeralda"){
    addEmeraldInclusions(THREE,target,config,size);
    return;
  }

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
