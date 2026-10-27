/** AURUM GEM RENDERING
 * Procedural gemstone inclusions.
 * The renderer keeps inclusions inside the stone volume and uses family-specific
 * structures for natural emeralds instead of generic floating particles.
 */
import { createAurumInclusionConfig, generateAurumInclusionPoints, getAurumGemPreset } from "../aurum-material-engine";

type InclusionObject = import("three").Object3D & {
  geometry?: import("three").BufferGeometry;
  material?: import("three").Material | import("three").Material[];
};

export type AurumGemInclusionInput = {
  id: string;
  inclusionStrength?: number;
  inclusionStyle?: string;
  familia?: string;
  fenomenoOptico?: "chatoyancy" | "asterism" | "schiller" | "peristerescence" | "iridescence" | "orient";
};

export const clearAurumInclusions = (target: import("three").Object3D) => {
  const remove: InclusionObject[] = [];
  target.traverse((child) => {
    if (child.userData?.["aurumInternalInclusion"]) remove.push(child as InclusionObject);
  });
  remove.forEach((child) => {
    child.parent?.remove(child);
    child.geometry?.dispose();
    if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
    else child.material?.dispose();
  });
};

export const setAurumInclusionsVisible = (target: import("three").Object3D, visible: boolean) => {
  target.traverse((child) => {
    if (child.userData?.["aurumInternalInclusion"]) child.visible = visible;
  });
};

// Keep emerald jardin visible in the interactive preview while other procedural
// inclusions remain hidden for performance. Emerald grades are defined by these
// internal structures, so hiding them made all three look like the same clean gem.
export const setAurumEmeraldInclusionsVisible = (
  target: import("three").Object3D,
  visible: boolean,
  gemId?: string,
) => {
  target.traverse((child) => {
    const type = String(child.userData?.["aurumInclusionType"] ?? "");
    const inclusionGemId = String(child.userData?.["aurumInclusionGemId"] ?? "");
    const matchesGem = !gemId || inclusionGemId === gemId;
    if (child.userData?.["aurumInternalInclusion"] && type.startsWith("emerald-") && matchesGem) {
      child.visible = visible;
    }
  });
};

const addEmeraldInclusions=(THREE: typeof import("three"),target: import("three").Object3D,config: ReturnType<typeof createAurumInclusionConfig>,size: import("three").Vector3,gemId:string)=>{
  let s=(config.seed>>>0)||1;
  const rnd=()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};
  const strength=Math.max(0,Math.min(1,config.density));
  const meshTarget=target as any;
  if(meshTarget.geometry && !meshTarget.geometry.boundingBox && typeof meshTarget.geometry.computeBoundingBox==="function"){
    meshTarget.geometry.computeBoundingBox();
  }
  const bounds=meshTarget.geometry?.boundingBox;
  const localSize=bounds?.getSize?.(new THREE.Vector3()) ?? size.clone();
  const center=bounds?.getCenter?.(new THREE.Vector3()) ?? new THREE.Vector3();
  const safeSize=new THREE.Vector3(
    Math.max(.0001,localSize.x*.68),
    Math.max(.0001,localSize.y*.68),
    Math.max(.0001,localSize.z*.68),
  );
  const scale=Math.max(.0001,Math.max(safeSize.x,safeSize.y,safeSize.z));
  const quality=gemId==="esmeralda_1"?1:gemId==="esmeralda_2"?2:gemId==="esmeralda_3"?3:4;

  // Natural emerald jardin is dominated by cloudy, irregular internal zones,
  // not a dense bundle of straight surface-like scratches. Keep the clusters
  // in a conservative central envelope and vary each axis independently.
  const cloudCount=quality===1?2:quality===2?4:quality===3?6:Math.max(7,Math.round(7+strength*4));
  const cloudColors=[0x244f3f,0x527a68,0x8da99a,0x183e31];
  for(let i=0;i<cloudCount;i++){
    const cloudScale=gemId==="esmeralda_inclusiones"?1.22:1;
    const radiusX=safeSize.x*(.045+rnd()*.065)*cloudScale;
    const radiusY=safeSize.y*(.045+rnd()*.065)*cloudScale;
    const radiusZ=safeSize.z*(.045+rnd()*.065)*cloudScale;
    const geometry=new THREE.IcosahedronGeometry(1,2);
    const position=geometry.attributes.position;
    for(let v=0;v<position.count;v++){
      const wobble=.78+rnd()*.42;
      position.setXYZ(v,position.getX(v)*wobble,position.getY(v)*wobble,position.getZ(v)*wobble);
    }
    position.needsUpdate=true;
    geometry.computeVertexNormals();
    const color=cloudColors[Math.floor(rnd()*cloudColors.length)];
    const material=new THREE.MeshPhysicalMaterial({
      color,metalness:0,roughness:.82,transmission:0,
      transparent:true,opacity:gemId==="esmeralda_inclusiones"?.18+rnd()*.055:(quality===2?.075:quality===3?.095:.11)+rnd()*.045,
      depthTest:false,depthWrite:false,side:THREE.DoubleSide,envMapIntensity:.12
    });
    const cloud=new THREE.Mesh(geometry,material);
    cloud.position.set(
      center.x+(rnd()-.5)*safeSize.x*.42,
      center.y+(rnd()-.5)*safeSize.y*.42,
      center.z+(rnd()-.5)*safeSize.z*.42,
    );
    cloud.scale.set(radiusX,radiusY,radiusZ);
    cloud.rotation.set(rnd()*Math.PI,rnd()*Math.PI,rnd()*Math.PI);
    cloud.userData={aurumInternalInclusion:true,aurumInclusionType:"emerald-jardin-cloud",aurumInclusionQuality:quality,aurumInclusionGemId:gemId};
    cloud.renderOrder=11;
    target.add(cloud);
  }

  // Fine branching jardin remains as a secondary detail. It is deliberately
  // sparse and low-opacity to avoid reading as scratches on the crown facets.
  const branchCount=quality===1?3:quality===2?5:quality===3?7:Math.max(8,Math.round(8+strength*3));
  const branchOpacity=quality===1?.075:quality===2?.10:.125;
  const tubeRadius=Math.max(.00001,Math.min(safeSize.x,safeSize.y,safeSize.z))*(quality===1?.003:quality===2?.004:.005);
  for(let i=0;i<branchCount;i++){
    const points: import("three").Vector3[]=[];
    const start=new THREE.Vector3(center.x+(rnd()-.5)*safeSize.x*.36,center.y+(rnd()-.5)*safeSize.y*.36,center.z+(rnd()-.5)*safeSize.z*.36);
    const dir=new THREE.Vector3(rnd()-.5,rnd()-.5,rnd()-.5).normalize();
    const length=scale*(quality===1?.045+rnd()*.035:quality===2?.05+rnd()*.045:.055+rnd()*.05);
    const steps=4+Math.floor(rnd()*3);
    for(let j=0;j<steps;j++){
      const t=j/(steps-1);
      const p=start.clone().add(dir.clone().multiplyScalar(length*t));
      p.x+=Math.sin(t*Math.PI*2+rnd()*2)*length*.05;
      p.y+=Math.cos(t*Math.PI*1.7+rnd()*2)*length*.04;
      p.x=Math.max(center.x-safeSize.x*.28,Math.min(center.x+safeSize.x*.28,p.x));
      p.y=Math.max(center.y-safeSize.y*.28,Math.min(center.y+safeSize.y*.28,p.y));
      p.z=Math.max(center.z-safeSize.z*.28,Math.min(center.z+safeSize.z*.28,p.z));
      points.push(p);
    }
    const curve=new THREE.CatmullRomCurve3(points);
    const geometry=new THREE.TubeGeometry(curve,Math.max(10,steps*3),tubeRadius*(.8+rnd()*.5),4,false);
    const material=new THREE.MeshPhysicalMaterial({
      color:quality===1?0x8fae9c:quality===2?0x7f9c8a:0xaabbb0,
      metalness:0,roughness:.68,transmission:0,
      transparent:true,opacity:branchOpacity+(rnd()*.025),depthTest:false,depthWrite:false,envMapIntensity:.18
    });
    const mesh=new THREE.Mesh(geometry,material);
    mesh.userData={aurumInternalInclusion:true,aurumInclusionType:"emerald-jardin",aurumInclusionQuality:quality,aurumInclusionGemId:gemId};
    mesh.renderOrder=12;
    target.add(mesh);
  }

  // Multiphase inclusions are sparse accents within the same central envelope.
  const fluidCount=quality===1?0:quality===2?2:quality===3?3:Math.max(4,Math.round(4+strength*2));
  for(let i=0;i<fluidCount;i++){
    const base=new THREE.Vector3(center.x+(rnd()-.5)*safeSize.x*.24,center.y+(rnd()-.5)*safeSize.y*.24,center.z+(rnd()-.5)*safeSize.z*.24);
    const pocketSize=Math.max(.00001,Math.min(safeSize.x,safeSize.y,safeSize.z))*(.035+rnd()*.025);
    const pocket=new THREE.Mesh(new THREE.SphereGeometry(pocketSize,12,8),new THREE.MeshPhysicalMaterial({
      color:quality===2?0x9bb5a7:0xc1d1c7,roughness:.3,transmission:0,
      transparent:true,opacity:quality===2?.12:.17,depthTest:false,depthWrite:false,envMapIntensity:.2
    }));
    pocket.position.copy(base);pocket.scale.set(1.6,.62,.82);
    pocket.userData={aurumInternalInclusion:true,aurumInclusionType:"emerald-fluid",aurumInclusionQuality:quality,aurumInclusionGemId:gemId};
    pocket.renderOrder=13;target.add(pocket);

    if(rnd()<.6){
      const crystalSize=pocketSize*(.3+rnd()*.25);
      const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(crystalSize,0),new THREE.MeshPhysicalMaterial({
        color:rnd()<.5?0x8e9a8b:0x46584b,roughness:.4,transmission:0,transparent:true,
        opacity:.2,depthTest:false,depthWrite:false,envMapIntensity:.25
      }));
      crystal.position.copy(base).add(new THREE.Vector3(pocketSize*.25,pocketSize*.1,pocketSize*.12));
      crystal.rotation.set(rnd()*3,rnd()*3,rnd()*3);
      crystal.userData={aurumInternalInclusion:true,aurumInclusionType:"emerald-fluid-crystal",aurumInclusionQuality:quality,aurumInclusionGemId:gemId};
      crystal.renderOrder=14;target.add(crystal);
    }
  }
};
const addPeridotInclusions=(THREE: typeof import("three"),target: import("three").Object3D,config: ReturnType<typeof createAurumInclusionConfig>,size: import("three").Vector3)=>{
  let s=(config.seed>>>0)||1; const rnd=()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};
  const strength=Math.max(0,Math.min(1,config.density));
  const scale=Math.min(size.x,size.y,size.z);
  const count=Math.max(2,Math.round(2+strength*7));
  for(let i=0;i<count;i++){
    // GIA's "lily pad" inclusions are reflective, disk-shaped fracture
    // inclusions. They are modeled as thin paired discs, not as random dots.
    const r=scale*(.018+rnd()*.032);
    const ring=new THREE.Mesh(new THREE.RingGeometry(r*.45,r,10,1),new THREE.MeshPhysicalMaterial({color:0xb7c09a,roughness:.18,metalness:.05,transmission:.04,transparent:true,opacity:.18+strength*.10,depthWrite:false,envMapIntensity:.8,side:THREE.DoubleSide,forceSinglePass:true}));
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

const addTourmalineInclusions=(THREE: typeof import("three"),target: import("three").Object3D,config: ReturnType<typeof createAurumInclusionConfig>,size: import("three").Vector3)=>{
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

const addAlexandriteInclusions=(THREE: typeof import("three"),target: import("three").Object3D,config: ReturnType<typeof createAurumInclusionConfig>,size: import("three").Vector3)=>{
  let s=(config.seed>>>0)||1; const rnd=()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};
  const strength=Math.max(0,Math.min(1,config.density)); const scale=Math.min(size.x,size.y,size.z);
  const count=Math.max(8,Math.round(8+strength*18));
  // Natural alexandrite/cat's-eye chrysoberyl commonly contains parallel
  // rutile needles; when sufficiently dense and correctly oriented they can
  // produce chatoyancy. Keep the inclusions sub-resolution and restrained for
  // faceted stones, while preserving the physical origin of the phenomenon.
  for(let i=0;i<count;i++){
    const needle=new THREE.Mesh(new THREE.CylinderGeometry(scale*.0012,scale*.0018,scale*(.18+rnd()*.34),5),new THREE.MeshPhysicalMaterial({color:0x8b8071,roughness:.24,transmission:.08,transparent:true,opacity:.055+strength*.055,depthWrite:false,envMapIntensity:.38}));
    needle.position.set((rnd()-.5)*size.x*.48,(rnd()-.5)*size.y*.48,(rnd()-.5)*size.z*.48);
    needle.rotation.set((rnd()-.5)*.12,.08+(rnd()-.5)*.12,rnd()*Math.PI);
    needle.userData={aurumInternalInclusion:true,aurumInclusionType:"alexandrite-rutile-needle"}; target.add(needle);
  }
};

const addChrysoberylPhenomenalInclusions=(THREE: typeof import("three"),target: import("three").Object3D,config: ReturnType<typeof createAurumInclusionConfig>,size: import("three").Vector3,phenomenon:"chatoyancy"|"asterism")=>{
  let seed=(config.seed>>>0)||1; const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const strength=Math.max(0,Math.min(1,config.density)); const scale=Math.min(size.x,size.y,size.z);
  const count=Math.max(18,Math.round(18+strength*34));
  const makeNeedle=(angle:number,spread:number)=>{
    const needle=new THREE.Mesh(new THREE.CylinderGeometry(scale*.0009,scale*.0015,scale*(.22+rnd()*.38),5),new THREE.MeshPhysicalMaterial({color:0x8f8472,roughness:.2,transmission:.06,transparent:true,opacity:.045+strength*.045,depthWrite:false,envMapIntensity:.42}));
    needle.position.set((rnd()-.5)*size.x*.5,(rnd()-.5)*size.y*.5,(rnd()-.5)*size.z*.5);
    needle.rotation.set((rnd()-.5)*spread,angle+(rnd()-.5)*spread,(rnd()-.5)*spread);
    needle.userData={aurumInternalInclusion:true,aurumInclusionType:phenomenon==="chatoyancy"?"chrysoberyl-rutile-chatoyancy":"chrysoberyl-rutile-asterism"};
    target.add(needle);
  };
  if(phenomenon==="chatoyancy"){
    for(let i=0;i<count;i++)makeNeedle(0,.055);
  }else{
    // Three crystallographic needle sets are used as the visual approximation
    // for a six-rayed star; the shader supplies the directional reflected band.
    for(let i=0;i<count;i++)makeNeedle(0,.05);
    for(let i=0;i<count;i++)makeNeedle(Math.PI/3,.05);
    for(let i=0;i<count;i++)makeNeedle(2*Math.PI/3,.05);
  }
};

const addSunstoneCopperInclusions=(THREE: typeof import("three"),target: import("three").Object3D,config: ReturnType<typeof createAurumInclusionConfig>,size: import("three").Vector3)=>{
  let seed=(config.seed>>>0)||7; const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const strength=Math.max(0,Math.min(1,config.density)); const scale=Math.min(size.x,size.y,size.z);
  const count=Math.max(12,Math.round(16+strength*38));
  for(let i=0;i<count;i++){
    const diameter=scale*(.00025+rnd()*.0028);
    const length=scale*(.01+rnd()*.06);
    const geo=new THREE.CircleGeometry(diameter,6);
    const mat=new THREE.MeshPhysicalMaterial({color:0xb56a35,metalness:.72,roughness:.18,transmission:.02,transparent:true,opacity:.08+strength*.16,side:THREE.DoubleSide,forceSinglePass:true,depthWrite:false});
    const p=new THREE.Mesh(geo,mat);
    p.scale.x=1.5+rnd()*4.0;
    p.position.set((rnd()-.5)*size.x*.46,(rnd()-.5)*size.y*.46,(rnd()-.5)*size.z*.46);
    p.rotation.set(rnd()*.35,Math.PI/2+(rnd()-.5)*.25,rnd()*Math.PI);
    p.userData={aurumInternalInclusion:true,aurumInclusionType:"oregon-sunstone-copper"};
    target.add(p);
  }
};

const addPhenomenalPlates=(THREE: typeof import("three"),target: import("three").Object3D,config: ReturnType<typeof createAurumInclusionConfig>,size: import("three").Vector3,phenomenon:"schiller"|"peristerescence"|"iridescence"|"orient")=>{
  let seed=(config.seed>>>0)||1; const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const strength=Math.max(0,Math.min(1,config.density)); const scale=Math.min(size.x,size.y,size.z);
  const count=Math.max(10,Math.round(10+strength*24));
  const color=phenomenon==="orient"?0xd8c9b0:phenomenon==="iridescence"?0x6d7884:phenomenon==="peristerescence"?0xbfcbd4:0xb07a42;
  for(let i=0;i<count;i++){
    const g=new THREE.PlaneGeometry(scale*(.012+rnd()*.028),scale*(.003+rnd()*.008));
    const m=new THREE.MeshPhysicalMaterial({color,roughness:.16,metalness:.02,transmission:.05,transparent:true,opacity:.025+strength*.045,side:THREE.DoubleSide,forceSinglePass:true,depthWrite:false,envMapIntensity:.45});
    const p=new THREE.Mesh(g,m);
    p.position.set((rnd()-.5)*size.x*.48,(rnd()-.5)*size.y*.48,(rnd()-.5)*size.z*.48);
    p.rotation.set(rnd()*Math.PI,rnd()*Math.PI,rnd()*Math.PI);
    p.userData={aurumInternalInclusion:true,aurumInclusionType:"oriented-plate-"+phenomenon};
    target.add(p);
  }
};

const addPhenomenalNeedles=(THREE: typeof import("three"),target: import("three").Object3D,config: ReturnType<typeof createAurumInclusionConfig>,size: import("three").Vector3,phenomenon:"chatoyancy"|"asterism",host:string)=>{
  let seed=(config.seed>>>0)||1; const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const strength=Math.max(0,Math.min(1,config.density)); const scale=Math.min(size.x,size.y,size.z);
  const count=Math.max(14,Math.round(14+strength*30));
  const crystal=target.userData["aurumGemPhysicalModel"]?.crystal;
  const axes = [crystal?.axisA, crystal?.axisB, crystal?.axisC].map((axis) =>
    Array.isArray(axis) && axis.every((value): value is number => typeof value === "number")
      ? new THREE.Vector3().fromArray(axis)
      : null
  );
  const addSet=(angle:number,spread:number,axisIndex=0)=>{for(let i=0;i<count;i++){
    const n=new THREE.Mesh(new THREE.CylinderGeometry(scale*.0008,scale*.0014,scale*(.18+rnd()*.34),5),new THREE.MeshPhysicalMaterial({color:host==="esmeralda"?0x8ba58f:0x887b69,roughness:.22,transmission:.06,transparent:true,opacity:.04+strength*.05,depthWrite:false,envMapIntensity:.38}));
    n.position.set((rnd()-.5)*size.x*.48,(rnd()-.5)*size.y*.48,(rnd()-.5)*size.z*.48);
    const axis=axes[axisIndex]??new THREE.Vector3(Math.cos(angle),Math.sin(angle),0);
    const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),axis.clone().normalize());
    n.quaternion.copy(q); n.rotateZ((rnd()-.5)*spread);
    n.userData={aurumInternalInclusion:true,aurumInclusionType:host+"-"+phenomenon+"-oriented-inclusion"}; target.add(n);
  }};
  if(phenomenon==="chatoyancy") addSet(0,.06,0);
  else { addSet(0,.05,0); addSet(Math.PI/3,.05,1); addSet(2*Math.PI/3,.05,2); }
};

const addParaibaInclusions=(THREE: typeof import("three"),target: import("three").Object3D,config: ReturnType<typeof createAurumInclusionConfig>,size: import("three").Vector3)=>{
  let s=(config.seed>>>0)||1; const rnd=()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};
  const strength=Math.max(0,Math.min(1,config.density)); const scale=Math.min(size.x,size.y,size.z);
  const count=Math.max(4,Math.round(5+strength*12));
  // GIA documents growth tubes, fluid inclusions and native copper in
  // copper-bearing Paraiba tourmaline. The metallic inclusions are aligned
  // so they can produce a restrained directional reflection rather than noise.
  for(let i=0;i<count;i++){
    const tube=new THREE.Mesh(new THREE.CylinderGeometry(scale*.002,scale*.003,scale*(.18+rnd()*.34),5),new THREE.MeshPhysicalMaterial({color:0x82928c,roughness:.25,transmission:.10,transparent:true,opacity:.08+strength*.07,depthWrite:false,envMapIntensity:.45}));
    tube.position.set((rnd()-.5)*size.x*.44,(rnd()-.5)*size.y*.44,(rnd()-.5)*size.z*.44);
    tube.rotation.set((rnd()-.5)*.18,rnd()*Math.PI*2,(rnd()-.5)*.18);
    tube.userData={aurumInternalInclusion:true,aurumInclusionType:"paraiba-growth-tube"}; target.add(tube);
    if(rnd()<.42){
      const r=scale*(.003+rnd()*.006);
      const copper=new THREE.Mesh(new THREE.CylinderGeometry(r*.18,r*.65,r*(.16+rnd()*.5),6),new THREE.MeshPhysicalMaterial({color:0xb8793b,metalness:.92,roughness:.16,envMapIntensity:1.25,transparent:true,opacity:.42+strength*.18,depthWrite:false}));
      copper.position.copy(tube.position); copper.rotation.copy(tube.rotation); copper.rotation.z+=.12;
      copper.userData={aurumInternalInclusion:true,aurumInclusionType:"paraiba-native-copper"}; target.add(copper);
    }
  }
  const fluidCount=Math.max(1,Math.round(1+strength*3));
  for(let i=0;i<fluidCount;i++){
    const r=scale*(.006+rnd()*.009);
    const fluid=new THREE.Mesh(new THREE.SphereGeometry(r,9,6),new THREE.MeshPhysicalMaterial({color:0x9de3df,roughness:.06,transmission:.5,transparent:true,opacity:.07+strength*.06,depthWrite:false,envMapIntensity:.5}));
    fluid.position.set((rnd()-.5)*size.x*.45,(rnd()-.5)*size.y*.45,(rnd()-.5)*size.z*.45);
    fluid.userData={aurumInternalInclusion:true,aurumInclusionType:"paraiba-fluid-network"}; target.add(fluid);
  }
};

const addMorganiteInclusions=(THREE: typeof import("three"),target: import("three").Object3D,config: ReturnType<typeof createAurumInclusionConfig>,size: import("three").Vector3)=>{
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

export const renderAurumInclusions=(THREE: typeof import("three"),target: import("three").Object3D,g:AurumGemInclusionInput,seed=9173,providedPreset?: ReturnType<typeof getAurumGemPreset>)=>{
  clearAurumInclusions(target);
  const preset=providedPreset ?? getAurumGemPreset(g.id);
  const config=createAurumInclusionConfig(preset,seed);
  // Catalog inclusionStrength is the grade-specific source of truth for gems.
  // The engine presets for emerald grades intentionally have lower generic
  // densities, which previously masked the catalog differences (especially Q1).
  if(preset.familia==="Esmeralda") config.density=Math.max(0,Math.min(1,Number(g.inclusionStrength??preset.inclusionDensity)));
  const enabled=preset.inclusions || (!!g.inclusionStrength && g.inclusionStyle!=="ninguna");
  if(!enabled || config.density<=0)return;
  const box=new THREE.Box3().setFromObject(target);
  const size=box.getSize(new THREE.Vector3());

  // Emeralds get a dedicated inclusion scene instead of the generic particle
  // system used by other gemstones.
  if(preset.familia==="Esmeralda"){
    addEmeraldInclusions(THREE,target,config,size,String(g.id??""));
    return;
  }
  if(preset.familia==="Peridoto"){
    addPeridotInclusions(THREE,target,config,size);
    return;
  }
  if(preset.familia==="Turmalina"){
    if(String(g.id).includes("paraiba")) addParaibaInclusions(THREE,target,config,size);
    else addTourmalineInclusions(THREE,target,config,size);
    return;
  }
  if(preset.familia==="Morganita"){
    addMorganiteInclusions(THREE,target,config,size);
    return;
  }
  if(String(g.id)==="alexandrita_brasil"){
    addAlexandriteInclusions(THREE,target,config,size);
    return;
  }
  if((String(g.id)==="crisoberilo_gato"||String(g.id)==="crisoberilo_estrella") && (g.fenomenoOptico === "chatoyancy" || g.fenomenoOptico === "asterism")){
    addChrysoberylPhenomenalInclusions(THREE,target,config,size,g.fenomenoOptico);
    return;
  }
  if(String(g.id)==="sunstone_aventurescencia" || String(g.id)==="sunstone_schiller"){
    addSunstoneCopperInclusions(THREE,target,config,size);
    if(String(g.id)==="sunstone_schiller") addPhenomenalPlates(THREE,target,config,size,"schiller");
    return;
  }
  if(g.fenomenoOptico){
    const phenomenon=g.fenomenoOptico;
    if(phenomenon==="chatoyancy" || phenomenon==="asterism"){
      addPhenomenalNeedles(THREE,target,config,size,phenomenon,String(g.familia??"gem"));
    } else if(phenomenon==="schiller" || phenomenon==="peristerescence" || phenomenon==="iridescence" || phenomenon==="orient"){
      addPhenomenalPlates(THREE,target,config,size,phenomenon);
    }
    return;
  }

  const points=generateAurumInclusionPoints(config,56);
  points.forEach((p: ReturnType<typeof generateAurumInclusionPoints>[number]) =>{
    const material=new THREE.MeshPhysicalMaterial({color:config.color,metalness:0,roughness:config.type==="silk"?.34:.22,transmission:config.type==="crystal"?.48:.10,transparent:true,opacity:p.opacity,depthWrite:false,envMapIntensity:.75});
    let geometry: import("three").BufferGeometry;
    if(config.type==="needle"||config.type==="silk")geometry=new THREE.CylinderGeometry(p.size*.16,p.size*.16,p.size*3.2,5);
    else if(config.type==="feather"||config.type==="veil")geometry=new THREE.TetrahedronGeometry(p.size*1.6,0);
    else geometry=new THREE.IcosahedronGeometry(p.size,1);
    const inclusion=new THREE.Mesh(geometry,material);
    inclusion.position.set(p.x*size.x*.46,p.y*size.y*.46,p.z*size.z*.46);
    inclusion.rotation.set(p.y*3.1,p.z*4.7,p.x*5.3);
    if(config.type==="silk"||config.type==="needle")inclusion.scale.set(1,1,.35);
    inclusion.userData["aurumInternalInclusion"]=true;
    inclusion.userData["aurumInclusionType"]=config.type;
    inclusion.userData["aurumInclusionSeed"]=config.seed;
    inclusion.renderOrder=12;
    target.add(inclusion);
  });
};
