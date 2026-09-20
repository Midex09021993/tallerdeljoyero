import * as THREE from "three";
import { AURUM_IJEWEL_DAROS_GEMS, getAurumIJEWELDAROSReference } from "./aurum/ijewel-daros-reference";

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
  diamante:{id:"diamante",familia:"Diamante",variante:"Natural",color:0xffffff,transmission:1,ior:2.417,roughness:.012,envMapIntensity:1.3,attenuationColor:0xffffff,attenuationDistance:100,dispersion:.01,iridescence:.03,thicknessScale:1,inclusions:false,inclusionDensity:0,inclusionType:"none"},
  diamante_inclusiones:{id:"diamante_inclusiones",familia:"Diamante",variante:"Con inclusiones",color:0xf8f8f8,transmission:1,ior:2.417,roughness:.018,envMapIntensity:1.3,attenuationColor:0xf5f5f5,attenuationDistance:65,dispersion:.01,iridescence:.04,thicknessScale:1,inclusions:true,inclusionDensity:.18,inclusionType:"crystal"},
  esmeralda_1:{id:"esmeralda_1",familia:"Esmeralda",variante:"Calidad 1",color:0x22dfa3,transmission:.94,ior:1.58,roughness:.018,envMapIntensity:1.00,attenuationColor:0x087f45,attenuationDistance:18,dispersion:.012,iridescence:0,thicknessScale:1.05,inclusions:false,inclusionDensity:0,inclusionType:"none"},
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
  Diamante:{ior:2.417,transmission:1,dispersion:.01,absorptionDistance:100,internalReflection:.98,facetContrast:1,brilliance:1,fire:1},
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


export type AurumIJEWELGemParameters = {
  engineVersion:string;
  materialType:"DiamondMaterial";
  sourceRootPath?:string;
  color:number;
  environmentIntensity:number;
  environmentRotationOffset:number;
  dispersion:number;
  squashFactor:number;
  geometryFactor:number;
  gammaFactor:number;
  absorptionFactor:number;
  reflectivity:number;
  refractiveIndex:number;
  rayBounces:number;
  diamondOrientedEnvMap:number;
  boostFactors:{x:number;y:number;z:number};
  transmissionParameter:number;
};

/**
 * Native iJewel parameter core.
 *
 * These values are intentionally kept in the same semantic space as the
 * supplied DiamondMaterial. AURUM does not rewrite refractiveIndex 2.6 into
 * a catalog IOR, nor does it treat transmissionParameter as Three.js
 * MeshPhysicalMaterial.transmission. The latter is an engine-specific switch
 * in the source material; AURUM keeps the source value and implements its
 * visible refraction path separately.
 */
export const getAurumIJEWELGemReference=(sourceRootPath:string)=>getAurumIJEWELDAROSReference(sourceRootPath);

export const applyAurumIJEWELReferenceFromMaterial=(material:any)=>{
  if(!material)return material;
  const ud=material.userData??{};
  const sourceRootPath=String(ud.rootPath??ud.aurumRootPath??ud.WEBGI_rootPath??"");
  const ref=getAurumIJEWELGemReference(sourceRootPath);
  if(!ref)return material;
  return applyAurumIJEWELGemParameters(material,ref);
};

export const applyAurumIJEWELGemParameters=(material:any,source:AurumIJEWELGemParameters)=>{
  if(!material)return material;
  const p={...source,boostFactors:{...source.boostFactors}};
  material.metalness=0;
  // DiamondMaterial uses its own screen-space/refraction solver; the supplied
  // iJewel references explicitly carry transmission=0. Disable Three's volume
  // transmission path here to avoid rendering the source twice.
  material.transmission=0;
  material.color?.setHex(p.color);
  // iJewel's refractiveIndex is an active renderer parameter. Keep the source
  // value instead of substituting a gemological constant.
  material.ior=Math.max(1.01,Number(p.refractiveIndex));
  material.dispersion=Math.max(0,Number(p.dispersion));
  material.envMapIntensity=Math.max(0,Number(p.environmentIntensity));
  if (material.envMapRotation?.set) material.envMapRotation.set(0,Number(p.environmentRotationOffset??0),0);
  material.userData={
    ...(material.userData??{}),
    aurumIJEWELParameters:p,
    aurumIJEWELActive:true,
    aurumIJEWELSourceTransmission:Number(p.transmissionParameter),
    aurumIJEWELRayBounces:Math.max(1,Math.floor(Number(p.rayBounces))),
    aurumIJEWELOrientedEnvMap:Number(p.diamondOrientedEnvMap??0),
  };
  material.needsUpdate=true;
  return material;
};

export const AURUM_IJEWEL_EMERALD_REFERENCE = {
  engineVersion: "0.22.0",
  materialType: "DiamondMaterial",
  sourceRootPath: "1_gem_emerald_1_58128f46c0.dmat",
  color: 0x22dfa3,
  environmentIntensity: 1,
  environmentRotationOffset: 0,
  dispersion: 7.182839392716467e-19,
  squashFactor: .98,
  geometryFactor: .5,
  gammaFactor: 1,
  absorptionFactor: 1.6,
  reflectivity: .5,
  refractiveIndex: 1.58,
  rayBounces: 5,
  diamondOrientedEnvMap: 0,
  boostFactors: {x:-.3,y:1,z:1},
  transmissionParameter: 0,
} as const;

/**
 * Calibrates a refractive gem against an observed iJewel/WebGi material.
 * The reference values remain metadata where the source renderer's parameter
 * semantics differ from Three.js. Physical catalog values continue to control
 * the actual MeshPhysicalMaterial transmission/IOR/attenuation.
 */
export const applyAurumReferenceGemOptics=(material:any,family:string)=>{
  if(!material)return material;
  if(family!=="Esmeralda")return material;
  return applyAurumIJEWELGemParameters(material,AURUM_IJEWEL_EMERALD_REFERENCE);
};

export type AurumDiamondOpticalConfig = {refractionStrength:number;dispersionStrength:number;internalReflection:number;brilliance:number;fire:number;facetContrast:number;environmentBoost:number};
export const AURUM_DIAMOND_OPTICAL_CONFIG:AurumDiamondOpticalConfig={refractionStrength:1,dispersionStrength:1,internalReflection:.98,brilliance:1,fire:1,facetContrast:1,environmentBoost:1};
export const AURUM_IJEWEL_DIAMOND_REFERENCE:AurumIJEWELGemParameters={
  engineVersion:"0.22.0",
  materialType:"DiamondMaterial",
  sourceRootPath:"1_gem_diamond_white_1_4aa77fb087.dmat",
  color:0xffffff,
  environmentIntensity:1.3,
  environmentRotationOffset:0,
  dispersion:.01,
  squashFactor:.98,
  geometryFactor:.5,
  gammaFactor:1,
  absorptionFactor:1,
  reflectivity:.5,
  refractiveIndex:2.6,
  rayBounces:5,
  diamondOrientedEnvMap:0,
  boostFactors:{x:1,y:1,z:1},
  transmissionParameter:0,
};

export const applyAurumDiamondOptics=(material:any,config=AURUM_DIAMOND_OPTICAL_CONFIG)=>{
  if(!material)return material;
  const r=AURUM_IJEWEL_DIAMOND_REFERENCE;
  applyAurumIJEWELGemParameters(material,r);
  material.roughness=.010;
  material.clearcoat=.26;
  material.clearcoatRoughness=.010;
  material.attenuationDistance=100;
  material.attenuationColor?.setHex(0xffffff);
  material.specularIntensity=1;
  material.specularColor?.setHex(0xffffff);
  material.iridescence=0;
  material.userData={
    ...(material.userData??{}),
    aurumDiamondOptics:config,
    aurumDiamondReference:r,
    aurumDiamondOpticalCoreVersion:"3.0.0-native-ijewel-params",
  };
  material.needsUpdate=true;
  return material;
};
export const applyAurumGemPreset=(material:any,preset:AurumGemPreset,thickness:number)=>applyAurumGem(material,preset,Math.max(.015,thickness*(preset.thicknessScale??1)));

/** iJewel/WebGi metal references extracted from the supplied GLB scene. */
export { AURUM_IJEWEL_DAROS_GEMS };\n\nexport const AURUM_IJEWEL_METAL_REFERENCES = {
  whiteGold: {
    sourceRootPath: "1_metal_whitegold_polished_0db3fb834b.pmat",
    baseColorFactor: [0.5394794890033748, 0.5394794890033748, 0.5457244613615395],
    roughness: 0,
    ior: 1.5,
    environmentIntensity: 1,
  },
  redGold: {
    sourceRootPath: "2_metal_redgold_polished_448aec7bd1.pmat",
    baseColorFactor: [0.5058823529411764, 0.23529411764705882, 0.12156862745098039],
    roughness: 0,
    ior: 1.5,
    environmentIntensity: 0.8,
  },
  roseGold: {
    sourceRootPath: "metal-rosegold-polished.pmat",
    baseColorFactor: [0.7835377915215659, 0.450785782828426, 0.1844749944900301],
    roughness: 0,
    ior: 1.5,
    environmentIntensity: 1,
  },
  greenGold: {
    sourceRootPath: "2_metal_greengold_polished_7c9dfd65ef.pmat",
    baseColorFactor: [0.5583403896257968, 0.4178850708380236, 0.17788841597328695],
    roughness: 0,
    ior: 1.5,
    environmentIntensity: 0.8,
  },
  platinum: {
    sourceRootPath: "2_metal_platinum_polished_9976f87c18.pmat",
    baseColorFactor: [0.48514994004665124, 0.4969329950515914, 0.5028864580233624],
    roughness: 0,
    ior: 1.5,
    environmentIntensity: 0.8,
  },
} as const;

/**
 * Applies only renderer-reference values that were actually present in the
 * supplied iJewel GLB. The source values are visual calibration data, not
 * alloy composition or metallurgical constants.
 */
export const applyAurumReferenceMetalOptics=(material:any,materialId:string)=>{
  if(!material) return material;
  const id=String(materialId??"").toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"");
  const ref=id.includes("whitegold")||id.includes("white-gold")||id.includes("white_gold")||id.includes("oro-blanco")||id.includes("oro_blanco") ? AURUM_IJEWEL_METAL_REFERENCES.whiteGold : id.includes("redgold")||id.includes("red-gold")||id.includes("oro-rojo")||id.includes("oro_rojo")
    ? AURUM_IJEWEL_METAL_REFERENCES.redGold
    : id.includes("rosegold")||id.includes("rose-gold")||id.includes("rose_gold")||id.includes("oro-rosa")||id.includes("oro_rosa")
      ? AURUM_IJEWEL_METAL_REFERENCES.roseGold
      : id.includes("greengold")||id.includes("green-gold")||id.includes("green_gold")||id.includes("oro-verde")||id.includes("oro_verde")
        ? AURUM_IJEWEL_METAL_REFERENCES.greenGold
        : id.includes("platinum")||id.includes("platino")
          ? AURUM_IJEWEL_METAL_REFERENCES.platinum
          : null;
  if(!ref) return material;
  material.color?.setRGB(ref.baseColorFactor[0],ref.baseColorFactor[1],ref.baseColorFactor[2]);
  material.metalness=1;
  material.roughness=ref.roughness;
  material.ior=ref.ior;
  material.envMapIntensity=ref.environmentIntensity;
  material.clearcoat=0;
  material.clearcoatRoughness=0;
  material.userData={
    ...(material.userData??{}),
    aurumIJEWELMetalReference:{...ref,materialId,source:"supplied GLB",renderer:"iJewel/WebGi"},
    aurumMetalBaseEnvMapIntensity:ref.environmentIntensity,
  };
  material.needsUpdate=true;
  return material;
};

