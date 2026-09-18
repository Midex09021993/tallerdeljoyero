import * as THREE from "three";

/**
 * AURUM MATERIAL ENGINE v1.2
 * Motor independiente para materiales PBR de joyería y gemas.
 */

export type AurumMetalPreset = {
  id?:string;
  color:number; metalness:number; roughness:number; envMapIntensity:number;
  clearcoat:number; anisotropy?:number; anisotropyRotation?:number;
};

export type AurumGemPreset = {
  id:string; familia:string; variante:string; color:number; transmission:number;
  ior:number; roughness:number; envMapIntensity:number; attenuationColor:number;
  attenuationDistance:number; dispersion:number; iridescence:number; thicknessScale:number;
  inclusions:boolean; inclusionDensity:number; inclusionType?:AurumInclusionType;
};

export type AurumInclusionType =
  | "none" | "veil" | "feather" | "needle" | "cloud" | "crystal"
  | "silk" | "fingerprint" | "tubular";

export type AurumInclusionConfig = {
  type:AurumInclusionType; density:number; scale:number; opacity:number;
  depth:number; seed:number; color:number;
};

export const AURUM_MATERIAL_ENGINE_VERSION="1.4.1";

/**
 * Reflected-light response for jewelry metals.
 *
 * Professional jewelry photography is controlled primarily by what the polished
 * surface reflects: broad white sources create clean gradients while narrow dark
 * regions preserve edge definition. Warm yellow gold needs a moderated reflected
 * environment because its colored metallic base response has much stronger contrast
 * against neutral studio sources than white metals.
 */
export const getAurumMetalReflectionResponse=(preset:AurumMetalPreset)=>{
  const r=(preset.color>>16)&255, g=(preset.color>>8)&255, b=preset.color&255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b), avg=(r+g+b)/3;
  let scale=.72;
  let family="neutral";

  if(r>b*1.28 && g>b*1.10){
    // Yellow gold: moderate the environment without changing the alloy color.
    // This avoids the extreme white/black reflection contrast seen on small,
    // highly curved ornamental parts while keeping polished metal readable.
    scale=.62;
    family="yellow-gold";
  }else if(r>b*1.18 && g>b*1.04 && r-g<75){
    scale=.60;
    family="rose-gold";
  }else if(avg<78){
    scale=.80;
    family="dark-metal";
  }else if(max-min<42 && avg>125){
    scale=.72;
    family="white-metal";
  }

  return {
    family,
    environmentIntensity:Math.max(.42,Math.min(1.55,preset.envMapIntensity*scale)),
    highlightScale:scale,
  };
};

const aurumSurfaceTextureCache=new Map<string,THREE.DataTexture>();
const aurumSurfaceHash=(x:number)=>{x|=0;x=Math.imul(x^(x>>>16),0x45d9f3b);x=Math.imul(x^(x>>>16),0x45d9f3b);return ((x^(x>>>16))>>>0)/4294967296;};
const getAurumSurfaceMicrostructure=(THREE:any,preset:AurumMetalPreset)=>{
  const id=String(preset.id??"").toLowerCase();
  let kind:"none"|"artisan"|"hammered"|"satin"|"brushed"="none";
  if(id.includes("martillado"))kind="hammered";
  else if(id.includes("artesanal"))kind="artisan";
  else if(id.includes("satinado"))kind="satin";
  else if(id.includes("cepillado"))kind="brushed";
  if(kind==="none")return null;
  const key=kind+":"+preset.color;
  const cached=aurumSurfaceTextureCache.get(key); if(cached)return cached;
  const size=64, data=new Uint8Array(size*size);
  const seed=preset.color|0;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const nx=x/size, ny=y/size;
    const n=aurumSurfaceHash((x+1)*374761393 ^ (y+1)*668265263 ^ seed);
    let v=128;
    if(kind==="brushed"){
      const bands=Math.sin(nx*Math.PI*2*18 + n*.7);
      v=128+bands*34+(n-.5)*24;
    }else if(kind==="satin"){
      const bands=Math.sin(nx*Math.PI*2*7 + ny*Math.PI*2*2);
      v=128+bands*12+(n-.5)*18;
    }else if(kind==="hammered"){
      const cell=Math.sin(nx*Math.PI*2*9 + Math.sin(ny*Math.PI*2*11)*1.7)*Math.cos(ny*Math.PI*2*8);
      v=128+cell*30+(n-.5)*34;
    }else{
      const broad=Math.sin(nx*Math.PI*2*5+ny*3.2)+Math.sin(ny*Math.PI*2*6-nx*2.1);
      v=128+broad*10+(n-.5)*20;
    }
    data[y*size+x]=Math.max(0,Math.min(255,Math.round(v)));
  }
  const tex=new THREE.DataTexture(data,size,size,THREE.RedFormat,THREE.UnsignedByteType);
  tex.colorSpace=THREE.NoColorSpace; tex.wrapS=THREE.RepeatWrapping; tex.wrapT=THREE.RepeatWrapping; tex.repeat?.set?.(kind==="brushed"?3:2,kind==="hammered"?3:2); tex.minFilter=THREE.LinearFilter; tex.magFilter=THREE.LinearFilter; tex.generateMipmaps=true; tex.needsUpdate=true;
  aurumSurfaceTextureCache.set(key,tex); return tex;
};

export const applyAurumMetal=(material:any,preset:AurumMetalPreset)=>{
  if(!material) return material;
  material.color?.setHex(preset.color);
  material.metalness=preset.metalness;

  const response=getAurumMetalReflectionResponse(preset);

  // Keep authored finish categories, but give polished yellow gold a slightly
  // broader micro-surface response than the previous .12 setting. This is still
  // a polished metal; it only reduces clipped highlights on small ornamental faces.
  const baseRoughness=Math.max(.02,Number(preset.roughness??.12));
  material.roughness=response.family==="yellow-gold"
    ? Math.max(.075,Math.min(.55,baseRoughness*1.33))
    : baseRoughness;

  material.envMapIntensity=response.environmentIntensity;

  // Base precious metals are not lacquered. Keep clearcoat only as a tiny
  // residual response so polished metal highlights come from the metal itself.
  material.clearcoat=Math.max(.025,Math.min(.055,preset.clearcoat*.10+.015));
  material.clearcoatRoughness=Math.max(.045,Math.min(.14,material.roughness*.8));

  material.anisotropy=Math.max(0,Math.min(1,preset.anisotropy??0));
  const surfaceMicrostructure=getAurumSurfaceMicrostructure(THREE,preset);
  material.roughnessMap=surfaceMicrostructure;
  material.userData={...(material.userData??{}),aurumSurfaceMicrostructure:surfaceMicrostructure?String(preset.id??"surface"):"polished-base"};
  material.anisotropyRotation=preset.anisotropyRotation??0;
  material.specularIntensity=preset.metalness>.9
    ? Math.max(.78,Math.min(1,response.highlightScale+.25))
    : .8;
  material.specularColor?.setHex(0xffffff);
  material.emissive?.setHex(0x000000);
  material.emissiveIntensity=0;
  material.userData={
    ...(material.userData??{}),
    aurumMetalRenderProfile:response,
    aurumMetalBaseEnvMapIntensity:response.environmentIntensity,
    aurumMetalSurfaceRoughness:material.roughness,
  };
  material.needsUpdate=true;
  return material;
};

export const applyAurumGem=(material:any,preset:AurumGemPreset,thickness:number)=>{
  if(!material) return material;
  material.color?.setHex(preset.color); material.metalness=0;
  material.roughness=preset.roughness; material.transmission=preset.transmission;
  material.thickness=Math.max(.015,thickness);
  material.ior=Math.min(2.65,Math.max(1.01,preset.ior)); material.specularIntensity=1;
  material.clearcoat=(preset.familia==="Diamante"||preset.familia==="Moissanita") ? .26 : .18;
  material.clearcoatRoughness=(preset.familia==="Diamante"||preset.familia==="Moissanita") ? .012 : .02;
  material.envMapIntensity=preset.envMapIntensity;
  material.userData={
    ...(material.userData??{}),
    aurumGemFamily:preset.familia,
    aurumGemEnvIntensity:preset.envMapIntensity,
  };
  material.attenuationColor?.setHex(preset.attenuationColor);
  material.attenuationDistance=preset.attenuationDistance;
  material.dispersion=Math.max(0,preset.dispersion); material.iridescence=preset.iridescence;
  material.iridescenceIOR=Math.min(2.65,Math.max(1.01,preset.ior));
  material.transparent=false; material.opacity=1; material.needsUpdate=true; return material;
};

export const metalPresetFromConfig=(m:any):AurumMetalPreset=>({
  color:m.color,metalness:m.metalness,roughness:m.roughness,envMapIntensity:m.envMapIntensity,
  clearcoat:m.clearcoat,anisotropy:m.anisotropy,anisotropyRotation:m.anisotropyRotation
});

export const gemPresetFromConfig=(g:any):AurumGemPreset=>({
  id:g.id,familia:g.familia,variante:g.variante,color:g.color,transmission:g.transmission,
  ior:g.ior,roughness:g.roughness,envMapIntensity:g.envMapIntensity,
  attenuationColor:g.attenuationColor,attenuationDistance:g.attenuationDistance,
  dispersion:g.dispersion,iridescence:g.iridescence,thicknessScale:g.thicknessScale??1,
  inclusions:!!g.inclusions,inclusionDensity:g.inclusionDensity??g.inclusionStrength??0,
  inclusionType:g.inclusionType
});

export const AURUM_GEM_PRESETS:Record<string,AurumGemPreset>={
  diamante:{id:"diamante",familia:"Diamante",variante:"Natural",color:0xffffff,transmission:1,ior:2.417,roughness:.012,envMapIntensity:1.9,attenuationColor:0xffffff,attenuationDistance:100,dispersion:.035,iridescence:.03,thicknessScale:1,inclusions:false,inclusionDensity:0,inclusionType:"none"},
  diamante_inclusiones:{id:"diamante_inclusiones",familia:"Diamante",variante:"Con inclusiones",color:0xf8f8f8,transmission:1,ior:2.417,roughness:.018,envMapIntensity:1.8,attenuationColor:0xf5f5f5,attenuationDistance:65,dispersion:.035,iridescence:.04,thicknessScale:1,inclusions:true,inclusionDensity:.18,inclusionType:"crystal"},
  esmeralda_1:{id:"esmeralda_1",familia:"Esmeralda",variante:"Calidad 1",color:0x087f45,transmission:.94,ior:1.577,roughness:.018,envMapIntensity:1.65,attenuationColor:0x087f45,attenuationDistance:18,dispersion:.012,iridescence:0,thicknessScale:1.05,inclusions:false,inclusionDensity:0,inclusionType:"none"},
  esmeralda_2:{id:"esmeralda_2",familia:"Esmeralda",variante:"Calidad 2",color:0x0a6b3b,transmission:.88,ior:1.577,roughness:.022,envMapIntensity:1.55,attenuationColor:0x075d34,attenuationDistance:12,dispersion:.012,iridescence:0,thicknessScale:1.05,inclusions:true,inclusionDensity:.10,inclusionType:"fingerprint"},
  esmeralda_3:{id:"esmeralda_3",familia:"Calidad 3",variante:"Natural",color:0x064d2f,transmission:.80,ior:1.577,roughness:.028,envMapIntensity:1.45,attenuationColor:0x043d25,attenuationDistance:8,dispersion:.012,iridescence:0,thicknessScale:1.08,inclusions:true,inclusionDensity:.22,inclusionType:"fingerprint"},
  rubi:{id:"rubi",familia:"Rubí",variante:"Natural",color:0x9f1239,transmission:.93,ior:1.762,roughness:.018,envMapIntensity:1.65,attenuationColor:0x8f1239,attenuationDistance:16,dispersion:.014,iridescence:0,thicknessScale:1.05,inclusions:false,inclusionDensity:0,inclusionType:"none"},
  rubi_sangre_pichon:{id:"rubi_sangre_pichon",familia:"Rubí",variante:"Sangre de pichón",color:0x8f0d28,transmission:.91,ior:1.762,roughness:.016,envMapIntensity:1.7,attenuationColor:0x78091f,attenuationDistance:13,dispersion:.014,iridescence:0,thicknessScale:1.05,inclusions:false,inclusionDensity:0,inclusionType:"none"},
  rubi_inclusiones:{id:"rubi_inclusiones",familia:"Rubí",variante:"Con inclusiones",color:0x7f1233,transmission:.84,ior:1.762,roughness:.025,envMapIntensity:1.5,attenuationColor:0x650c28,attenuationDistance:9,dispersion:.014,iridescence:0,thicknessScale:1.08,inclusions:true,inclusionDensity:.20,inclusionType:"silk"},
  zafiro_azul:{id:"zafiro_azul",familia:"Zafiro",variante:"Azul",color:0x1247a6,transmission:.94,ior:1.77,roughness:.018,envMapIntensity:1.65,attenuationColor:0x103d91,attenuationDistance:17,dispersion:.012,iridescence:0,thicknessScale:1.05,inclusions:false,inclusionDensity:0,inclusionType:"none"},
  zafiro_inclusiones:{id:"zafiro_inclusiones",familia:"Zafiro",variante:"Con inclusiones",color:0x173c86,transmission:.85,ior:1.77,roughness:.025,envMapIntensity:1.5,attenuationColor:0x112e69,attenuationDistance:10,dispersion:.012,iridescence:0,thicknessScale:1.08,inclusions:true,inclusionDensity:.18,inclusionType:"silk"},
  moissanita:{id:"moissanita",familia:"Moissanita",variante:"Natural",color:0xffffff,transmission:1,ior:2.65,roughness:.012,envMapIntensity:1.85,attenuationColor:0xffffff,attenuationDistance:80,dispersion:.104,iridescence:.05,thicknessScale:1,inclusions:false,inclusionDensity:0,inclusionType:"none"}
};

export const getAurumGemPreset=(id:string)=>AURUM_GEM_PRESETS[id]??AURUM_GEM_PRESETS["diamante"]!;
export const listAurumGemPresets=()=>Object.values(AURUM_GEM_PRESETS);

export const createAurumInclusionConfig=(preset:AurumGemPreset,seed=1):AurumInclusionConfig=>({
  type:preset.inclusionType??"none",
  density:Math.max(0,Math.min(1,preset.inclusionDensity)),
  scale:preset.familia==="Diamante" ? .035 : .06,
  opacity:.30,depth:.72,seed,
  color:preset.familia==="Esmeralda"?0x173c2c:preset.familia==="Rubí"?0x3a0714:preset.familia==="Zafiro"?0xd9e4ff:0x6f6f6f
});

export const generateAurumInclusionPoints=(config:AurumInclusionConfig,count=48)=>{
  const points:{x:number;y:number;z:number;size:number;opacity:number}[]=[];
  let s=(config.seed>>>0)||1;
  const rnd=()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};
  const n=Math.round(Math.max(0,Math.min(160,count*config.density)));
  for(let i=0;i<n;i++){
    const r=Math.cbrt(rnd()),a=rnd()*Math.PI*2,z=rnd()*2-1,t=Math.sqrt(Math.max(0,1-z*z));
    points.push({x:r*t*Math.cos(a),y:r*t*Math.sin(a),z:r*z,size:config.scale*(.45+rnd()*1.55),opacity:config.opacity*(.55+rnd()*.45)});
  }
  return points;
};

export type AurumOpticalProfile = {
  ior:number; transmission:number; dispersion:number; absorptionDistance:number;
  internalReflection:number; facetContrast:number; brilliance:number; fire:number;
};

export const AURUM_OPTICAL_PROFILES:Record<string,AurumOpticalProfile>={
  Diamante:{ior:2.417,transmission:1,dispersion:.035,absorptionDistance:100,internalReflection:.98,facetContrast:1,brilliance:1,fire:1},
  Moissanita:{ior:2.65,transmission:1,dispersion:.104,absorptionDistance:80,internalReflection:.99,facetContrast:1,brilliance:.98,fire:1.18},
  Esmeralda:{ior:1.577,transmission:.92,dispersion:.012,absorptionDistance:15,internalReflection:.82,facetContrast:.88,brilliance:.78,fire:.45},
  Rubí:{ior:1.762,transmission:.90,dispersion:.014,absorptionDistance:13,internalReflection:.86,facetContrast:.92,brilliance:.84,fire:.52},
  Zafiro:{ior:1.77,transmission:.91,dispersion:.012,absorptionDistance:15,internalReflection:.87,facetContrast:.92,brilliance:.82,fire:.48}
};

export const getAurumOpticalProfile=(familia:string):AurumOpticalProfile=>
  AURUM_OPTICAL_PROFILES[familia]??AURUM_OPTICAL_PROFILES["Diamante"]!;

export type AurumFacetProfile={cut:string;crownAngle:number;pavilionAngle:number;tableRatio:number;facetContrast:number};
export const AURUM_FACET_PROFILES:Record<string,AurumFacetProfile>={
  brillante:{cut:"Brillante",crownAngle:34,pavilionAngle:40.75,tableRatio:.57,facetContrast:1},
  esmeralda:{cut:"Esmeralda",crownAngle:33,pavilionAngle:38,tableRatio:.68,facetContrast:.88},
  oval:{cut:"Oval",crownAngle:34,pavilionAngle:40,tableRatio:.60,facetContrast:.94},
  cushion:{cut:"Cushion",crownAngle:35,pavilionAngle:40,tableRatio:.62,facetContrast:.92},
  princesa:{cut:"Princesa",crownAngle:36,pavilionAngle:40,tableRatio:.72,facetContrast:.96}
};

export const getAurumFacetProfile=(cut:string="brillante")=>AURUM_FACET_PROFILES[cut]??AURUM_FACET_PROFILES["brillante"]!;

export const applyAurumOpticalProfile=(material:any,profile:AurumOpticalProfile)=>{
  if(!material)return material;
  material.ior=Math.min(2.65,Math.max(1.01,profile.ior));
  material.transmission=Math.max(0,Math.min(1,profile.transmission));
  material.dispersion=Math.max(0,profile.dispersion);
  material.thickness=Math.max(.015,material.thickness??.5);
  material.attenuationDistance=Math.max(.1,profile.absorptionDistance);
  material.userData={...(material.userData??{}),aurumOpticalProfile:profile};
  material.needsUpdate=true;
  return material;
};

export type AurumDiamondOpticalConfig = {refractionStrength:number;dispersionStrength:number;internalReflection:number;brilliance:number;fire:number;facetContrast:number;environmentBoost:number};
export const AURUM_DIAMOND_OPTICAL_CONFIG:AurumDiamondOpticalConfig={refractionStrength:1,dispersionStrength:1,internalReflection:.98,brilliance:1,fire:1,facetContrast:1,environmentBoost:1};
export const applyAurumDiamondOptics=(material:any,config=AURUM_DIAMOND_OPTICAL_CONFIG)=>{
  if(!material)return material;
  material.transmission=1; material.ior=2.417; material.dispersion=.035*config.dispersionStrength;
  material.roughness=.010; material.clearcoat=.26; material.clearcoatRoughness=.010;
  material.envMapIntensity=1.9*config.environmentBoost; material.attenuationDistance=100;
  material.userData={...(material.userData??{}),aurumDiamondOptics:config}; material.needsUpdate=true; return material;
};
export const applyAurumGemPreset=(material:any,preset:AurumGemPreset,thickness:number)=>applyAurumGem(material,preset,Math.max(.015,thickness*(preset.thicknessScale??1)));
