import * as THREE from "three";

type Ctx={target:any;size:THREE.Vector3;density:number;seed:number};

const rng=(seed:number)=>{let s=seed>>>0;return()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};};
const add=(target:any,mesh:any,type:string)=>{mesh.userData={...(mesh.userData??{}),aurumInternalInclusion:true,aurumInclusionType:type};target.add(mesh);};
const point=(r:()=>number,s:THREE.Vector3,k=.7)=>new THREE.Vector3((r()-.5)*s.x*k,(r()-.5)*s.y*k,(r()-.5)*s.z*k);
const mat=(o:any)=>new THREE.MeshPhysicalMaterial({transparent:true,depthWrite:false,...o});

const colombia=(c:Ctx)=>{
  const r=rng(c.seed),m=Math.min(c.size.x,c.size.y,c.size.z),n=7+Math.round(c.density*9);
  for(let i=0;i<n;i++){
    const p=point(r,c.size,.58),d=new THREE.Vector3((r()-.5)*.18,(r()-.5)*.18,1).normalize(),l=m*(.14+r()*.28);
    const curve=new THREE.CatmullRomCurve3([p,p.clone().add(d.clone().multiplyScalar(l*.45)),p.clone().add(d.clone().multiplyScalar(l))]);
    add(c.target,new THREE.Mesh(new THREE.TubeGeometry(curve,7,m*.0026,4,false),mat({color:0x8ca995,roughness:.6,transmission:.2,opacity:.045+c.density*.035,envMapIntensity:.25})),"colombia-growth-tube");
  }
  const fluidN=1+Math.round(c.density*3);
  for(let i=0;i<fluidN;i++){
    const p=point(r,c.size,.42),q=m*(.009+r()*.014);
    const pocket=new THREE.Mesh(new THREE.SphereGeometry(q,9,6),mat({color:0xaebfb5,roughness:.08,transmission:.62,opacity:.07+c.density*.05,envMapIntensity:.45}));pocket.position.copy(p);pocket.scale.set(1.7,.7,.85);add(c.target,pocket,"colombia-three-phase-fluid");
    const bubble=new THREE.Mesh(new THREE.SphereGeometry(q*.22,7,5),mat({color:0xffffff,roughness:.02,transmission:.9,opacity:.28,envMapIntensity:.4}));bubble.position.copy(p).add(new THREE.Vector3(q*.48,q*.1,0));add(c.target,bubble,"colombia-gas-bubble");
    const crystal=new THREE.Mesh(new THREE.BoxGeometry(q*.32,q*.32,q*.32),mat({color:0xe0e4df,roughness:.3,transmission:.05,opacity:.22}));crystal.position.copy(p).add(new THREE.Vector3(-q*.35,-q*.08,q*.08));crystal.rotation.set(r()*2,r()*2,r()*2);add(c.target,crystal,"colombia-cubic-crystal");
  }
};

const brasil=(c:Ctx)=>{
  const r=rng(c.seed),m=Math.min(c.size.x,c.size.y,c.size.z),n=8+Math.round(c.density*12);
  for(let i=0;i<n;i++){
    const p=point(r,c.size,.62),h=m*(.08+r()*.22),geo=new THREE.CapsuleGeometry(m*.0017,m*.0017+h,3,5),mesh=new THREE.Mesh(geo,mat({color:0xa5b5aa,roughness:.5,transmission:.16,opacity:.035+c.density*.03,envMapIntensity:.24}));mesh.position.copy(p);mesh.rotation.set((r()-.5)*.12,(r()-.5)*.12,r()*Math.PI);add(c.target,mesh,"brasil-rain-tube");
  }
  for(let i=0;i<2+Math.round(c.density*4);i++){const q=m*(.008+r()*.012),mesh=new THREE.Mesh(new THREE.BoxGeometry(q*1.45,q,q*.85),mat({color:0x9ba89f,roughness:.32,transmission:.16,opacity:.10+c.density*.07,envMapIntensity:.35}));mesh.position.copy(point(r,c.size,.44));mesh.rotation.set(r()*2,r()*2,r()*2);add(c.target,mesh,"brasil-blocky-fluid");}
  for(let i=0;i<1+Math.round(c.density*2);i++){const q=m*(.006+r()*.008),mesh=new THREE.Mesh(new THREE.OctahedronGeometry(q,0),mat({color:r()<.5?0x756d63:0x5d5145,roughness:.28,opacity:.18,envMapIntensity:.35}));mesh.position.copy(point(r,c.size,.46));mesh.rotation.set(r()*3,r()*3,r()*3);add(c.target,mesh,"brasil-mineral-crystal");}
};

const paraiba=(c:Ctx,copper:boolean)=>{
  const r=rng(c.seed),m=Math.min(c.size.x,c.size.y,c.size.z),n=10+Math.round(c.density*12);
  const axis=new THREE.Vector3(0,0,1);
  for(let i=0;i<n;i++){
    const len=m*(.12+r()*.28),mesh=new THREE.Mesh(new THREE.CylinderGeometry(m*.0011,m*.0011,len,5),mat({color:copper?0xb88745:0x8fc5be,metalness:copper?.58:.05,roughness:copper?.18:.34,opacity:copper?.13:.065,envMapIntensity:copper?.85:.4}));
    mesh.position.set((r()-.5)*c.size.x*.7,(r()-.5)*c.size.y*.7,(r()-.5)*c.size.z*.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis);add(c.target,mesh,copper?"paraiba-copper-inclusion":"paraiba-acicular");
  }
};

const rutile=(c:Ctx)=>{
  const r=rng(c.seed),m=Math.min(c.size.x,c.size.y,c.size.z),n=7+Math.round(c.density*10);
  for(let i=0;i<n;i++){
    const p=point(r,c.size,.68),d=new THREE.Vector3((r()-.5)*.5,(r()-.5)*.5,1).normalize(),l=m*(.16+r()*.34),a=p.clone().sub(d.clone().multiplyScalar(l*.5)),b=p.clone().add(d.clone().multiplyScalar(l*.5));
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(a,b),1,m*.002,4,false),mat({color:0xa9652b,metalness:.12,roughness:.3,opacity:.13+c.density*.045,envMapIntensity:.55}));add(c.target,mesh,"quartz-rutile-needle");
  }
};

const ametrine=(c:Ctx)=>{
  const g=new THREE.Group();g.userData={aurumInternalInclusion:true,aurumInclusionType:"ametrine-zoning"};
  const purple=new THREE.Mesh(new THREE.BoxGeometry(c.size.x*.92,c.size.y*.92,c.size.z*.46),mat({color:0x7046aa,roughness:.04,transmission:.18,opacity:.22,envMapIntensity:.8}));purple.position.z=-c.size.z*.23;g.add(purple);
  const yellow=new THREE.Mesh(new THREE.BoxGeometry(c.size.x*.92,c.size.y*.92,c.size.z*.46),mat({color:0xd79b32,roughness:.04,transmission:.18,opacity:.20,envMapIntensity:.8}));yellow.position.z=c.size.z*.23;g.add(yellow);c.target.add(g);
};

const opal=(c:Ctx,color:number)=>{
  const r=rng(c.seed),m=Math.min(c.size.x,c.size.y,c.size.z),n=22+Math.round(c.density*18);
  for(let i=0;i<n;i++){const q=m*(.0014+r()*.003),mesh=new THREE.Mesh(new THREE.SphereGeometry(q,5,4),mat({color,roughness:.2,transmission:.42,opacity:.018+r()*.018,envMapIntensity:.25}));mesh.position.copy(point(r,c.size,.74));add(c.target,mesh,"opal-microstructure");}
};

const rodocrosita=(c:Ctx)=>{
  const g=new THREE.Group();g.userData={aurumInternalInclusion:true,aurumInclusionType:"rodocrosita-growth"};
  for(let i=0;i<3;i++){const beam=new THREE.Mesh(new THREE.BoxGeometry(c.size.x*.055,c.size.y*.9,Math.min(c.size.x,c.size.y,c.size.z)*.018),mat({color:0xe8c9ca,roughness:.4,opacity:.18}));beam.rotation.z=i*Math.PI*2/3;g.add(beam);}c.target.add(g);
};

export function renderLatinGemInternalScene(profile:string|undefined,target:any,size:THREE.Vector3,density:number,seed=9173){
  if(!profile||!target)return false;
  const c={target,size,density:Math.max(0,Math.min(1,density)),seed};
  switch(profile){
    case "colombia_jardin": colombia(c); return true;
    case "brasil_jardin": brasil(c); return true;
    case "paraiba_acicular": paraiba(c,false); return true;
    case "paraiba_chatoyancy": paraiba(c,true); return true;
    case "cuarzo_rutilado": rutile(c); return true;
    case "ametrino_zonificado": ametrine(c); return true;
    case "opal_microestructura": opal(c,0xd8c5c0); return true;
    case "crisocola_calcedonia": opal(c,0x4b9fa0); return true;
    case "rodocrosita_crecimiento": rodocrosita(c); return true;
    default: return false;
  }
}
