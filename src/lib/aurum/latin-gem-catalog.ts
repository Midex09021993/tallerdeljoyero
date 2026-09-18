import * as THREE from "three";
import { GEMAS, type GemaConfig } from "./catalog";
import { clearAurumInclusions } from "./gems";

const add=(target:any,mesh:any,type:string)=>{mesh.userData={...(mesh.userData??{}),aurumInternalInclusion:true,aurumInclusionType:type};target.add(mesh);};
const rng=(seed:number)=>{let s=seed>>>0;return()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};};
const sizeOf=(target:any)=>new THREE.Box3().setFromObject(target).getSize(new THREE.Vector3());
const pos=(r:()=>number,s:THREE.Vector3,k=.7)=>new THREE.Vector3((r()-.5)*s.x*k,(r()-.5)*s.y*k,(r()-.5)*s.z*k);

const colombia=(target:any,s:THREE.Vector3,r:()=>number,d:number)=>{
  const m=Math.min(s.x,s.y,s.z);
  for(let i=0;i<10+Math.round(d*12);i++){
    const base=pos(r,s,.58),dir=new THREE.Vector3((r()-.5)*.18,(r()-.5)*.18,1).normalize(),len=m*(.14+r()*.26);
    const curve=new THREE.CatmullRomCurve3([base,base.clone().add(dir.clone().multiplyScalar(len*.45)),base.clone().add(dir.clone().multiplyScalar(len))]);
    add(target,new THREE.Mesh(new THREE.TubeGeometry(curve,7,Math.max(m*.002,m*.0035),4,false),new THREE.MeshPhysicalMaterial({color:0x9eb7a5,roughness:.62,transmission:.18,transparent:true,opacity:.055+d*.045,depthWrite:false,envMapIntensity:.28})),"colombia-growth-tube");
  }
  for(let i=0;i<2+Math.round(d*4);i++){
    const base=pos(r,s,.42),q=m*(.009+r()*.015);
    const pocket=new THREE.Mesh(new THREE.SphereGeometry(q,9,6),new THREE.MeshPhysicalMaterial({color:0xb6c7bd,roughness:.08,transmission:.62,transparent:true,opacity:.075+d*.045,depthWrite:false,envMapIntensity:.5}));pocket.position.copy(base);pocket.scale.set(1.7,.7,.85);add(target,pocket,"colombia-three-phase-fluid");
    const bubble=new THREE.Mesh(new THREE.SphereGeometry(q*.22,8,5),new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.02,transmission:.9,transparent:true,opacity:.32,depthWrite:false}));bubble.position.copy(base).add(new THREE.Vector3(q*.48,q*.1,0));add(target,bubble,"colombia-gas-bubble");
    const salt=new THREE.Mesh(new THREE.BoxGeometry(q*.32,q*.32,q*.32),new THREE.MeshPhysicalMaterial({color:0xe4e7e2,roughness:.28,transmission:.05,transparent:true,opacity:.25,depthWrite:false}));salt.position.copy(base).add(new THREE.Vector3(-q*.35,-q*.08,q*.08));salt.rotation.set(r()*2,r()*2,r()*2);add(target,salt,"colombia-cubic-crystal");
  }
  if(d>.55){const pts:THREE.Vector3[]=[],c=pos(r,s,.35),rad=m*.018,len=m*.25;for(let i=0;i<14;i++){const t=i/13,a=t*Math.PI*3.2;pts.push(c.clone().add(new THREE.Vector3(Math.cos(a)*rad,Math.sin(a)*rad,(t-.5)*len)));}const curve=new THREE.CatmullRomCurve3(pts);add(target,new THREE.Mesh(new THREE.TubeGeometry(curve,28,m*.0018,4,false),new THREE.MeshPhysicalMaterial({color:0xd2d6d0,roughness:.5,transparent:true,opacity:.12,depthWrite:false})),"colombia-helical-inclusion");}
};

const brasilEmerald=(target:any,s:THREE.Vector3,r:()=>number,d:number)=>{
  const m=Math.min(s.x,s.y,s.z);
  for(let i=0;i<12+Math.round(d*16);i++){const base=pos(r,s,.62),h=m*(.09+r()*.22),geo=new THREE.CapsuleGeometry(m*.0018,m*.0018+h,3,5),mesh=new THREE.Mesh(geo,new THREE.MeshPhysicalMaterial({color:0xa8b7ad,roughness:.5,transmission:.16,transparent:true,opacity:.04+d*.035,depthWrite:false,envMapIntensity:.25}));mesh.position.copy(base);mesh.rotation.set((r()-.5)*.15,(r()-.5)*.15,r()*Math.PI);add(target,mesh,"brasil-rain-tube");}
  for(let i=0;i<3+Math.round(d*4);i++){const q=m*(.008+r()*.014),mesh=new THREE.Mesh(new THREE.BoxGeometry(q*1.4,q,q*.85),new THREE.MeshPhysicalMaterial({color:0x9ba89f,roughness:.32,transmission:.18,transparent:true,opacity:.12+d*.08,depthWrite:false,envMapIntensity:.38}));mesh.position.copy(pos(r,s,.45));mesh.rotation.set(r()*2,r()*2,r()*2);add(target,mesh,"brasil-blocky-fluid");}
  for(let i=0;i<2+Math.round(d*2);i++){const q=m*(.006+r()*.009),mesh=new THREE.Mesh(new THREE.OctahedronGeometry(q,0),new THREE.MeshPhysicalMaterial({color:r()<.5?0x756d63:0x5d5145,roughness:.28,transparent:true,opacity:.2,depthWrite:false,envMapIntensity:.42}));mesh.position.copy(pos(r,s,.48));mesh.rotation.set(r()*3,r()*3,r()*3);add(target,mesh,"brasil-mineral-crystal");}
};

const paraiba=(target:any,s:THREE.Vector3,r:()=>number,d:number,copper=false)=>{const m=Math.min(s.x,s.y,s.z),axis=new THREE.Vector3(0,0,1);for(let i=0;i<18+Math.round(d*18);i++){const line=new THREE.Mesh(new THREE.CylinderGeometry(m*.0012,m*.0012,m*(.12+r()*.28),5),new THREE.MeshPhysicalMaterial({color:copper?0xb88745:0x91c6bd,metalness:copper?.55:.05,roughness:copper?.18:.34,transparent:true,opacity:copper?.16:.075,depthWrite:false,envMapIntensity:copper?.9:.45}));line.position.set((r()-.5)*s.x*.72,(r()-.5)*s.y*.72,(r()-.5)*s.z*.55);line.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis);add(target,line,copper?"paraiba-copper-platelet":"paraiba-growth-tube");}};
const rutilo=(target:any,s:THREE.Vector3,r:()=>number,d:number)=>{const m=Math.min(s.x,s.y,s.z);for(let i=0;i<9+Math.round(d*15);i++){const start=pos(r,s,.7),dir=new THREE.Vector3((r()-.5)*.5,(r()-.5)*.5,1).normalize(),len=m*(.15+r()*.35),a=start.clone().sub(dir.clone().multiplyScalar(len*.5)),b=start.clone().add(dir.clone().multiplyScalar(len*.5));const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(a,b),1,m*.0022,4,false),new THREE.MeshPhysicalMaterial({color:0xb06b2c,metalness:.15,roughness:.3,transparent:true,opacity:.16+d*.06,depthWrite:false,envMapIntensity:.6}));add(target,mesh,"quartz-rutile-needle");}};
const ametrino=(target:any,s:THREE.Vector3)=>{const g=new THREE.Group();g.userData={aurumInternalInclusion:true,aurumInclusionType:"ametrine-sector-zoning"};const a=new THREE.Mesh(new THREE.BoxGeometry(s.x*.92,s.y*.92,s.z*.46),new THREE.MeshPhysicalMaterial({color:0x7046aa,roughness:.03,transmission:.22,transparent:true,opacity:.34,depthWrite:false,envMapIntensity:1}));a.position.z=-s.z*.23;g.add(a);const b=new THREE.Mesh(new THREE.BoxGeometry(s.x*.92,s.y*.92,s.z*.46),new THREE.MeshPhysicalMaterial({color:0xd79b32,roughness:.03,transmission:.22,transparent:true,opacity:.30,depthWrite:false,envMapIntensity:1}));b.position.z=s.z*.23;g.add(b);target.add(g);};

/**
 * Common-opal microstructure proxy.
 * GIA describes play-of-color as diffraction from ordered silica spheres. The
 * catalog entries here are common opals, so we do NOT invent a rainbow
 * play-of-color. We retain a restrained translucent microstructure, but pack
 * the 35 inclusions into one InstancedMesh to avoid 35 extra draw calls and
 * 35 MeshPhysicalMaterial instances.
 */
const opal=(target:any,s:THREE.Vector3,r:()=>number,color:number)=>{
  const m=Math.min(s.x,s.y,s.z);
  const count=35;
  const geometry=new THREE.SphereGeometry(m*.0025,5,4);
  const material=new THREE.MeshPhysicalMaterial({
    color,roughness:.18,transmission:.45,transparent:true,opacity:.035,
    depthWrite:false,envMapIntensity:.3
  });
  const instances=new THREE.InstancedMesh(geometry,material,count);
  const matrix=new THREE.Matrix4();
  for(let i=0;i<count;i++){
    const q=m*(.0015+r()*.0035);
    const p=pos(r,s,.75);
    matrix.compose(p,new THREE.Quaternion(),new THREE.Vector3(q/(m*.0025),q/(m*.0025),q/(m*.0025)));
    instances.setMatrixAt(i,matrix);
  }
  instances.instanceMatrix.needsUpdate=true;
  add(target,instances,"opal-silica-microstructure");
};

const rodocrosita=(target:any,s:THREE.Vector3)=>{const g=new THREE.Group();g.userData={aurumInternalInclusion:true,aurumInclusionType:"rodocrosita-growth"};for(let i=0;i<3;i++){const beam=new THREE.Mesh(new THREE.BoxGeometry(s.x*.06,s.y*.92,Math.min(s.x,s.y,s.z)*.018),new THREE.MeshPhysicalMaterial({color:0xead0d0,roughness:.38,transparent:true,opacity:.22,depthWrite:false}));beam.rotation.z=i*Math.PI*2/3;g.add(beam);}target.add(g);};

export const LATIN_GEMAS:GemaConfig[]=[
{id:"esmeralda_colombia_muzo" as any,familia:"Esmeralda",nombre:"Esmeralda Colombiana · Muzo",color:0x087b4a,transmission:.83,ior:1.58,roughness:.032,envMapIntensity:4.2,attenuationColor:0x075a36,attenuationDistance:1.8,dispersion:.08,iridescence:.008,inclusionStyle:"velos",inclusionStrength:.30,origen:"Colombia",perfilInterno:"colombia_jardin",notaGemologica:"Perfil visual inspirado en inclusiones multifásicas, tubos de crecimiento y jardin de Muzo."},
{id:"esmeralda_colombia_chivor" as any,familia:"Esmeralda",nombre:"Esmeralda Colombiana · Chivor",color:0x0a8654,transmission:.85,ior:1.58,roughness:.03,envMapIntensity:4.3,attenuationColor:0x075f3d,attenuationDistance:2.0,dispersion:.08,iridescence:.009,inclusionStyle:"velos",inclusionStrength:.24,origen:"Colombia",perfilInterno:"colombia_jardin",notaGemologica:"Perfil visual de estudio; no pretende determinar origen gemológico."},
{id:"esmeralda_brasil_belmont" as any,familia:"Esmeralda",nombre:"Esmeralda Brasileña · Belmont",color:0x087047,transmission:.78,ior:1.58,roughness:.045,envMapIntensity:3.9,attenuationColor:0x064b31,attenuationDistance:1.35,dispersion:.07,iridescence:.006,inclusionStyle:"velos",inclusionStrength:.25,origen:"Brasil",perfilInterno:"brasil_jardin",notaGemologica:"Perfil visual inspirado en fluidos bloqueados, tubos tipo lluvia, mica y cristales minerales de Belmont."},
{id:"turmalina_paraiba",familia:"Turmalina",nombre:"Turmalina Paraíba · Brasil",color:0x21d5d0,transmission:.86,ior:1.64,roughness:.028,envMapIntensity:4.5,attenuationColor:0x0b9f9c,attenuationDistance:2.4,dispersion:.025,iridescence:.01,inclusionStyle:"silk",inclusionStrength:.16,origen:"Brasil",perfilInterno:"paraiba_acicular",notaGemologica:"Tubos paralelos y rasgos aciculares; la chatoyancy se modela como perfil visual, no como prueba de origen."},
{id:"turmalina_paraiba_chatoyancy" as any,familia:"Turmalina",nombre:"Paraíba · Chatoyancy",color:0x28d9d2,transmission:.84,ior:1.64,roughness:.025,envMapIntensity:4.7,attenuationColor:0x0a9e9b,attenuationDistance:2.2,dispersion:.025,iridescence:.012,inclusionStyle:"silk",inclusionStrength:.22,origen:"Brasil",perfilInterno:"paraiba_chatoyancy"},
{id:"turmalina_rubelite",familia:"Turmalina",nombre:"Rubelita · Brasil",color:0xb51f55,transmission:.82,ior:1.64,roughness:.035,envMapIntensity:3.6,attenuationColor:0x711331,attenuationDistance:2.1,dispersion:.018,iridescence:.004,inclusionStyle:"silk",inclusionStrength:.12,origen:"Brasil",perfilInterno:"brasil_pegmatita"},
{id:"turmalina_bicolor",familia:"Turmalina",nombre:"Turmalina Bicolor · Brasil",color:0x43b779,transmission:.84,ior:1.64,roughness:.03,envMapIntensity:3.8,attenuationColor:0x28724a,attenuationDistance:2.3,dispersion:.02,iridescence:.004,inclusionStyle:"silk",inclusionStrength:.1,origen:"Brasil",perfilInterno:"brasil_pegmatita"},
{id:"aguamarina_brasil",familia:"Aguamarina",nombre:"Aguamarina · Brasil",color:0x72cfe3,transmission:.9,ior:1.58,roughness:.024,envMapIntensity:3.9,attenuationColor:0x4ca6b8,attenuationDistance:3.2,dispersion:.014,iridescence:.006,inclusionStyle:"velos",inclusionStrength:.08,origen:"Brasil",perfilInterno:"brasil_pegmatita"},
{id:"alexandrita_brasil",familia:"Alejandrita",nombre:"Alejandrita · Brasil",color:0x3e9b68,transmission:.78,ior:1.75,roughness:.028,envMapIntensity:3.7,attenuationColor:0x205b3d,attenuationDistance:1.8,dispersion:.018,iridescence:.01,inclusionStyle:"velos",inclusionStrength:.08,origen:"Brasil",perfilInterno:"brasil_pegmatita"},
{id:"topacio_imperial_minas",familia:"Topacio",nombre:"Topacio Imperial · Minas Gerais",color:0xe0a04c,transmission:.88,ior:1.63,roughness:.03,envMapIntensity:3.9,attenuationColor:0xa96824,attenuationDistance:2.6,dispersion:.014,iridescence:.005,inclusionStyle:"velos",inclusionStrength:.1,origen:"Brasil",perfilInterno:"brasil_pegmatita"},
{id:"cuarzo_rutilado_bahia",familia:"Cuarzo",nombre:"Cuarzo Rutilado · Bahía",color:0xe9dfcc,transmission:.91,ior:1.54,roughness:.022,envMapIntensity:3.3,attenuationColor:0xd7c8aa,attenuationDistance:4.2,dispersion:.012,iridescence:.003,inclusionStyle:"silk",inclusionStrength:.22,origen:"Brasil",perfilInterno:"cuarzo_rutilado"},
{id:"ametrino_bolivia",familia:"Ametrino",nombre:"Ametrino · Anahí, Bolivia",color:0xb78968,transmission:.9,ior:1.55,roughness:.022,envMapIntensity:3.8,attenuationColor:0x79503b,attenuationDistance:3.5,dispersion:.014,iridescence:.004,inclusionStyle:"velos",inclusionStrength:.04,origen:"Bolivia",perfilInterno:"ametrino_zonificado",notaGemologica:"Zonificación interna amatista/citrino inspirada en Anahí."},
{id:"opal_peru_rosa",familia:"Ópalo",nombre:"Ópalo Rosa · Perú",color:0xe7a2a9,transmission:.58,ior:1.45,roughness:.16,envMapIntensity:2.5,attenuationColor:0xb96f7b,attenuationDistance:1.7,dispersion:0,iridescence:.01,inclusionStyle:"velos",inclusionStrength:.14,origen:"Perú",perfilInterno:"opal_microestructura"},
{id:"opal_peru_azul",familia:"Ópalo",nombre:"Ópalo Azul Andino · Perú",color:0x67b9ca,transmission:.55,ior:1.45,roughness:.17,envMapIntensity:2.7,attenuationColor:0x3f8d9e,attenuationDistance:1.6,dispersion:0,iridescence:.01,inclusionStyle:"velos",inclusionStrength:.16,origen:"Perú",perfilInterno:"opal_microestructura"},
{id:"crisocola_gem_silica_peru",familia:"Gem Silica",nombre:"Gem Silica · Crisocola · Perú",color:0x25a9a4,transmission:.62,ior:1.53,roughness:.13,envMapIntensity:3,attenuationColor:0x087a78,attenuationDistance:1.8,dispersion:.008,iridescence:.004,inclusionStyle:"velos",inclusionStrength:.18,origen:"Perú",perfilInterno:"crisocola_calcedonia",notaGemologica:"Color azul a verde azulado producido por diminutas inclusiones de crisocola en calcedonia."},
{id:"rodocrosita_argentina",familia:"Rodocrosita",nombre:"Rodocrosita · Capillitas, Argentina",color:0xc65c67,transmission:.28,ior:1.6,roughness:.2,envMapIntensity:2.2,attenuationColor:0x8c3542,attenuationDistance:.8,dispersion:.006,iridescence:0,inclusionStyle:"velos",inclusionStrength:.2,origen:"Argentina",perfilInterno:"rodocrosita_crecimiento",notaGemologica:"Perfil de crecimiento trapiche-like/cogwheel documentado en Capillitas."}
];

for(const g of LATIN_GEMAS) if(!GEMAS.some(x=>x.id===g.id)) GEMAS.push(g);

export const applyAurumLatinGemProfile=(target:any,g:any)=>{const profile=String(g?.perfilInterno??"");if(!profile)return false;clearAurumInclusions(target);const s=sizeOf(target),r=rng(9173+String(g?.id??"").length*97),d=Math.max(.05,Math.min(1,Number(g?.inclusionStrength??.15)));
 if(profile==="colombia_jardin"){colombia(target,s,r,d);return true;}if(profile==="brasil_jardin"){brasilEmerald(target,s,r,d);return true;}if(profile==="paraiba_acicular"){paraiba(target,s,r,d,false);return true;}if(profile==="paraiba_chatoyancy"){paraiba(target,s,r,d,true);return true;}if(profile==="cuarzo_rutilado"){rutilo(target,s,r,d);return true;}if(profile==="ametrino_zonificado"){ametrino(target,s);return true;}if(profile==="opal_microestructura"){opal(target,s,r,Number(g?.color??0xd0a0a0));return true;}if(profile==="crisocola_calcedonia"){opal(target,s,r,0x39a6a2);return true;}if(profile==="rodocrosita_crecimiento"){rodocrosita(target,s);return true;}return false;};
