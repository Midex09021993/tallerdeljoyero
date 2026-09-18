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

const addPeridotInclusions=(THREE:any,target:any,config:any,size:any)=>{
  let s=(config.seed>>>0)||1; const rnd=()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};
  const strength=Math.max(0,Math.min(1,config.density));
  const scale=Math.min(size.x,size.y,size.z);
  const count=Math.max(2,Math.round(2+strength*7));
  for(let i=0;i<count;i++){
    // GIA's "lily pad" inclusions are reflective, disk-shaped fracture
    // inclusions. They are modeled as thin paired discs, not as random dots.
    const r=scale*(.018+rnd()*.032);
    const ring=new THREE.Mesh(new THREE.RingGeometry(r*.45,r,10,1),new THREE.MeshPhysicalMaterial({color:0xb7c09a,roughness:.18,metalness:.05,transmission:.04,transparent:true,opacity:.18+strength*.10,depthWrite:false,envMapIntensity:.8,side:THREE.DoubleSide}));
    ring.position.set((rnd()-.5)*size.x*.52,(rnd()-.5)*size.y*.52,(rnd()-.5)*size.z*.52);
    ring.rotation.set(rnd()*3,rnd()*3,rnd()*3); ring.scale.z=.32;
    ring.userData={aurumInternalInclusion:true,aurumInclusionType:"peridot-lily-pad"}; target.add(ring);
    if(rnd()<.7){
      const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(scale*(.004+rnd()*.007),0),new THREE.MeshPhysicalMaterial({color:0x263321,roughness:.3,transmission:.04,transparent:true,opacity:.35,depthWrite:false}));
      crystal.position.copy(ring.position); crystal.rotation.copy(ring.rotation); crystal.position.add(new THREE.Vector3(r*(rnd()-.5),r*(rnd()-.5),r*(rnd()-.5)));
      crystal.userData={aurumInternalInclusion:true,aurumInclusionType:"peridot-dark-crystal"}; target.add(crystal);
    }
  }
};

const addTourmalineInclusions=(THREE:any,target:any,config:any,size:any)=>{
  let s=(config.seed>>>0)||1; const rnd=()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};
  const strength=Math.max(0,Math.min(1,config.density)); const scale=Math.min(size.x,size.y,size.z);
  const count=Math.max(3,Math.round(3+strength*9));
  for(let i=0;i<count;i++){
    // Growth tubes are aligned with a dominant local crystal axis, with small
    // angular deviations rather than isotropic random needles.
    const tube=new THREE.Mesh(new THREE.CylinderGeometry(scale*.0025,scale*.0035,scale*(.16+rnd()*.30),6),new THREE.MeshPhysicalMaterial({color:0x87968b,roughness:.28,transmission:.12,transparent:true,opacity:.09+strength*.07,depthWrite:false,envMapIntensity:.5}));
    tube.position.set((rnd()-.5)*size.x*.48,(rnd()-.5)*size.y*.48,(rnd()-.5)*size.z*.48);
    tube.rotation.set((rnd()-.5)*.35,rnd()*Math.PI*2,(rnd()-.5)*.35);
    tube.userData={aurumInternalInclusion:true,aurumInclusionType:"tourmaline-growth-tube"}; target.add(tube);
    if(rnd()<.45){
      const pocket=scale*(.004+rnd()*.007);
      const bubble=new THREE.Mesh(new THREE.SphereGeometry(pocket,8,6),new THREE.MeshPhysicalMaterial({color:0xe8eee9,roughness:.05,transmission:.4,transparent:true,opacity:.12+strength*.08,depthWrite:false}));
      bubble.position.copy(tube.position); bubble.position.y+=scale*(rnd()-.5)*.06;
      bubble.userData={aurumInternalInclusion:true,aurumInclusionType:"tourmaline-fluid-bubble"}; target.add(bubble);
    }
  }
};

const addMorganiteInclusions=(THREE:any,target:any,config:any,size:any)=>{
  let s=(config.seed>>>0)||1; const rnd=()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};
  const strength=Math.max(0,Math.min(1,config.density)); const scale=Math.min(size.x,size.y,size.z);
  // Multiphase pockets are documented in morganite. The newer Madagascar
  // material reported by GIA also contains planar yellow helvine and dark
  // brown hubnerite microcrystals; those are kept deliberately rare.
  const pockets=Math.max(1,Math.round(1+strength*4));
  for(let i=0;i<pockets;i++){
    const base=new THREE.Vector3((rnd()-.5)*size.x*.48,(rnd()-.5)*size.y*.48,(rnd()-.5)*size.z*.48);
    const r=scale*(.008+rnd()*.014);
    const fluid=new THREE.Mesh(new THREE.SphereGeometry(r,10,6),new THREE.MeshPhysicalMaterial({color:0xf0dce2,roughness:.08,transmission:.5,transparent:true,opacity:.08+strength*.07,depthWrite:false,envMapIntensity:.55}));
    fluid.position.copy(base); fluid.scale.set(1.4,.7,.8); fluid.userData={aurumInternalInclusion:true,aurumInclusionType:"morganite-multiphase-fluid"}; target.add(fluid);
    const bubble=new THREE.Mesh(new THREE.SphereGeometry(r*.23,8,6),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.18,depthWrite:false}));
    bubble.position.copy(base).add(new THREE.Vector3(r*.35,r*.12,0)); bubble.userData={aurumInternalInclusion:true,aurumInclusionType:"morganite-gas-bubble"}; target.add(bubble);
    const solid=new THREE.Mesh(new THREE.OctahedronGeometry(r*.28,0),new THREE.MeshPhysicalMaterial({color:0xe8e4df,roughness:.3,transmission:.08,transparent:true,opacity:.14,depthWrite:false}));
    solid.position.copy(base).add(new THREE.Vector3(-r*.28,-r*.08,0)); solid.userData={aurumInternalInclusion:true,aurumInclusionType:"morganite-solid-phase"}; target.add(solid);
  }
  if(rnd()<.18+strength*.22){
    const planeCount=Math.max(3,Math.round(4+strength*10));
    for(let i=0;i<planeCount;i++){
      const crystal=new THREE.Mesh(new THREE.TetrahedronGeometry(scale*(.003+rnd()*.006),0),new THREE.MeshPhysicalMaterial({color:0xf1c62d,roughness:.25,transmission:.05,transparent:true,opacity:.22+strength*.12,depthWrite:false,envMapIntensity:.7}));
      crystal.position.set((rnd()-.5)*size.x*.30,(rnd()-.5)*size.y*.10,(rnd()-.5)*size.z*.30);
      crystal.rotation.set(.15+rnd()*.3,rnd()*Math.PI,rnd()*.2); crystal.userData={aurumInternalInclusion:true,aurumInclusionType:"morganite-helvine-microcrystal"}; target.add(crystal);
    }
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
  if(preset.familia==="Peridoto"){
    addPeridotInclusions(THREE,target,config,size);
    return;
  }
  if(preset.familia==="Turmalina"){
    addTourmalineInclusions(THREE,target,config,size);
    return;
  }
  if(preset.familia==="Morganita"){
    addMorganiteInclusions(THREE,target,config,size);
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
