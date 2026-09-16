/**
 * AURUM MATERIAL ENGINE v1.2
 * Motor independiente para materiales PBR de joyería y gemas.
 */

export type AurumMetalPreset = {
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

export const AURUM_MATERIAL_ENGINE_VERSION="1.3.0";

/**
 * Reflected-light response for jewelry metals.
 *
 * Professional jewelry photography is controlled primarily by what the polished
 * surface reflects: broad white sources create clean gradients while narrow dark
 * regions preserve edge definition. A single global environment multiplier makes
 * warm gold clip much sooner than silver/white metals. We therefore attenuate the
 * environment contribution per metal family while keeping the authored base color
 * intact. This is a material response control, not a global exposure hack.
 */
export const getAurumMetalReflectionResponse=(preset:AurumMetalPreset)=>{
  const r=(preset.color>>16)&255, g=(preset.color>>8)&255, b=preset.color&255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b), avg=(r+g+b)/3;
  let scale=.72;
  let family="neutral";

  // Yellow gold: warm alloy color must survive without broad HDR highlights
  // turning into featureless white.
  if(r>b*1.28 && g>b*1.10){
    scale=.55;
    family="yellow-gold";
  // Rose gold: the copper component already supplies warmth, so keep the
  // reflected environment slightly more restrained than neutral metals.
  }else if(r>b*1.18 && g>b*1.04 && r-g<75){
    scale=.60;
    family="rose-gold";
  // Very dark/black metals need enough environment to reveal curvature.
  }else if(avg<78){
    scale=.80;
    family="dark-metal";
  // White gold, silver and platinum benefit from clean but controlled broad
  // reflections against a light product background.
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

export const applyAurumMetal=(material:any,preset:AurumMetalPreset)=>{
  if(!material) return material;
  material.color?.setHex(preset.color);
  material.metalness=preset.metalness;
  material.roughness=preset.roughness;

  const response=getAurumMetalReflectionResponse(preset);
  material.envMapIntensity=response.environmentIntensity;

  // Keep the metal itself responsible for the reflection. A strong clearcoat
  // reads like lacquer and can create a second, artificial hot highlight.
  material.clearcoat=Math.max(.025,Math.min(.10,preset.clearcoat*.25+.025));
  material.clearcoatRoughness=Math.max(.045,Math.min(.14,preset.roughness*.8));

  material.anisotropy=Math.max(0,Math.min(1,preset.anisotropy??0));
  material.anisotropyRotation=preset.anisotropyRotation??0;
  // Precious metals need strong reflections, but yellow/rose alloys should not
  // turn broad studio sources into clipped white patches. Keep the reflection
  // visible and attenuate only the specular peak by the metal family response.
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
  esmeralda_3:{id:"esmeralda_3",familia:"Esmeralda",variante:"Calidad 3",color:0x064d2f,transmission:.80,ior:1.577,roughness:.028,envMapIntensity:1.45,attenuationColor:0x043d25,attenuationDistance:8,dispersion:.012,iridescence:0,thicknessScale:1.08,inclusions:true,inclusionDensity:.22,inclusionType:"fingerprint"},
  rubi:{id:"rubi",familia:"Rubí",variante:"Natural",color:0x9f1239,transmission:.93,ior:1.762,roughness:.018,envMapIntensity:1.65,attenuationColor:0x8f1239,attenuationDistance:16,dispersion:.014,iridescence:0,thicknessScale:1.05,inclusions:false,inclusionDensity:0,inclusionType:"none"},
  rubi_sangre_pichon:{id:"rubi_sangre_pichon",familia:"Rubí",variante:"Sangre de pichón",color:0x8f0d28,transmission:.91,ior:1.762,roughness:.016,envMapIntensity:1.7,attenuationColor:0x78091f,attenuationDistance:13,dispersion:.014,iridescence:0,thicknessScale:1.05,inclusions:false,inclusionDensity:0,inclusionType:"none"},
  rubi_inclusiones:{id:"rubi_inclusiones",familia:"Rubí",variante:"Con inclusiones",color:0x7f1233,transmission:.84,ior:1.762,roughness:.025,envMapIntensity:1.5,attenuationColor:0x650c28,attenuationDistance:9,dispersion:.014,iridescence:0,thicknessScale:1.08,inclusions:true,inclusionDensity:.20,inclusionType:"silk"},
  zafiro_azul:{id:"zafiro_azul",familia:"Zafiro",variante:"Azul",color:0x1247a6,transmission:.94,ior:1.77,roughness:.018,envMapIntensity:1.65,attenuationColor:0x103d91,attenuationDistance:17,dispersion:.012,iridescence:0,thicknessScale:1.05,inclusions:false,inclusionDensity:0,inclusionType:"none"},
  zafiro_intenso:{id:"zafiro_intenso",familia:"Zafiro",variante:"Azul intenso",color:0x0d2f78,transmission:.91,ior:1.77,roughness:.022,envMapIntensity:1.62,attenuationColor:0x08265f,attenuationDistance:13,dispersion:.012,iridescence:.008,thicknessScale:1.05,inclusions:false,inclusionDensity:0,inclusionType:"none"},
  zafiro_inclusiones:{id:"zafiro_inclusiones",familia:"Zafiro",variante:"Con inclusiones",color:0x173c86,transmission:.85,ior:1.77,roughness:.025,envMapIntensity:1.5,attenuationColor:0x112e69,attenuationDistance:10,dispersion:.012,iridescence:0,thicknessScale:1.08,inclusions:true,inclusionDensity:.18,inclusionType:"silk"},
  moissanita_blanca:{id:"moissanita_blanca",familia:"Moissanita",variante:"Blanca",color:0xf4f8ff,transmission:.985,ior:2.65,roughness:.013,envMapIntensity:1.88,attenuationColor:0xf6faff,attenuationDistance:80,dispersion:.104,iridescence:.055,thicknessScale:1,inclusions:false,inclusionDensity:0,inclusionType:"none"},
  moissanita_brillante:{id:"moissanita_brillante",familia:"Moissanita",variante:"Brillante",color:0xeaf3ff,transmission:.99,ior:2.65,roughness:.010,envMapIntensity:1.98,attenuationColor:0xf2f8ff,attenuationDistance:90,dispersion:.104,iridescence:.075,thicknessScale:1,inclusions:false,inclusionDensity:0,inclusionType:"none"},
  citrino_natural:{id:"citrino_natural",familia:"Citrino",variante:"Natural",color:0xd49a22,transmission:.91,ior:1.544,roughness:.025,envMapIntensity:1.58,attenuationColor:0xa96d0c,attenuationDistance:8,dispersion:.009,iridescence:0,thicknessScale:1.04,inclusions:true,inclusionDensity:.045,inclusionType:"fingerprint"},
  citrino_intenso:{id:"citrino_intenso",familia:"Citrino",variante:"Intenso",color:0xb8780b,transmission:.87,ior:1.544,roughness:.030,envMapIntensity:1.52,attenuationColor:0x8b5307,attenuationDistance:5.5,dispersion:.009,iridescence:0,thicknessScale:1.04,inclusions:true,inclusionDensity:.025,inclusionType:"veil"},
  // Amethyst is quartz: the optical response is deliberately different from
  // corundum (ruby/sapphire). Natural amethyst may show hematite needles and
  // fluid-related features, so its inclusion profile is subtle rather than a
  // generic "sparkle" texture.
  amatista_natural:{id:"amatista_natural",familia:"Amatista",variante:"Natural",color:0x7650b9,transmission:.91,ior:1.55,roughness:.025,envMapIntensity:1.60,attenuationColor:0x57358f,attenuationDistance:8,dispersion:.009,iridescence:0,thicknessScale:1.04,inclusions:true,inclusionDensity:.065,inclusionType:"needle"},
  amatista_intensa:{id:"amatista_intensa",familia:"Amatista",variante:"Intensa",color:0x5b319c,transmission:.87,ior:1.55,roughness:.030,envMapIntensity:1.54,attenuationColor:0x3f2076,attenuationDistance:5.5,dispersion:.009,iridescence:0,thicknessScale:1.04,inclusions:true,inclusionDensity:.04,inclusionType:"needle"},
  topacio_azul:{id:"topacio_azul",familia:"Topacio",variante:"Azul",color:0x65b9e8,transmission:.94,ior:1.63,roughness:.020,envMapIntensity:1.62,attenuationColor:0x4d9acb,attenuationDistance:10,dispersion:.014,iridescence:.003,thicknessScale:1.03,inclusions:false,inclusionDensity:0,inclusionType:"none"},
  topacio_imperial:{id:"topacio_imperial",familia:"Topacio",variante:"Imperial",color:0xd79b4b,transmission:.91,ior:1.63,roughness:.025,envMapIntensity:1.58,attenuationColor:0xa96722,attenuationDistance:7,dispersion:.014,iridescence:.002,thicknessScale:1.03,inclusions:true,inclusionDensity:.035,inclusionType:"fluid"},
  moissanita:{id:"moissanita",familia:"Moissanita",variante:"Natural",color:0xffffff,transmission:1,ior:2.65,roughness:.012,envMapIntensity:1.85,attenuationColor:0xffffff,attenuationDistance:80,dispersion:.104,iridescence:.05,thicknessScale:1,inclusions:false,inclusionDensity:0,inclusionType:"none"}
};

export const getAurumGemPreset=(id:string)=>AURUM_GEM_PRESETS[id]??AURUM_GEM_PRESETS["diamante"]!;
export const listAurumGemPresets=()=>Object.values(AURUM_GEM_PRESETS);

export const createAurumInclusionConfig=(preset:AurumGemPreset,seed=1):AurumInclusionConfig=>({
  type:preset.inclusionType??"none",
  density:Math.max(0,Math.min(1,preset.inclusionDensity)),
  scale:preset.familia==="Diamante" ? .035 : .06,
  opacity:.30,depth:.72,seed,
  color:preset.familia==="Esmeralda"?0x173c2c:preset.familia==="Rubí"?0x3a0714:preset.familia==="Zafiro"?0xd9e4ff:preset.familia==="Amatista"?0x8b4b2f:preset.familia==="Citrino"?0x9a6b24:preset.familia==="Topacio"?0xb8dff2:0x6f6f6f
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


/**
 * AURUM OPTICAL ENGINE v1.0
 * Presets de óptica y corte. La geometría original del archivo no se reemplaza:
 * estos parámetros permiten preparar el material y el postprocesado para la
 * respuesta óptica de cada familia de gema.
 */
export type AurumOpticalProfile = {
  ior:number;
  transmission:number;
  dispersion:number;
  absorptionDistance:number;
  internalReflection:number;
  facetContrast:number;
  brilliance:number;
  fire:number;
};

export const AURUM_OPTICAL_PROFILES:Record<string,AurumOpticalProfile>={
  Diamante:{ior:2.417,transmission:1,dispersion:.035,absorptionDistance:100,internalReflection:.98,facetContrast:1,brilliance:1,fire:1},
  Moissanita:{ior:2.65,transmission:1,dispersion:.104,absorptionDistance:80,internalReflection:.99,facetContrast:1,brilliance:.98,fire:1.18},
  Esmeralda:{ior:1.577,transmission:.92,dispersion:.012,absorptionDistance:15,internalReflection:.82,facetContrast:.88,brilliance:.78,fire:.45},
  Rubí:{ior:1.762,transmission:.90,dispersion:.014,absorptionDistance:13,internalReflection:.86,facetContrast:.92,brilliance:.84,fire:.52},
  Zafiro:{ior:1.77,transmission:.91,dispersion:.012,absorptionDistance:15,internalReflection:.87,facetContrast:.92,brilliance:.82,fire:.48},
  // Quartz-family profiles: lower RI and dispersion than corundum, with
  // controlled absorption so purple/yellow stones retain body color without
  // becoming opaque under a bright studio HDRI.
  Amatista:{ior:1.55,transmission:.90,dispersion:.009,absorptionDistance:8,internalReflection:.72,facetContrast:.78,brilliance:.66,fire:.18},
  Citrino:{ior:1.544,transmission:.90,dispersion:.009,absorptionDistance:8,internalReflection:.72,facetContrast:.80,brilliance:.68,fire:.18},
  Topacio:{ior:1.63,transmission:.93,dispersion:.014,absorptionDistance:10,internalReflection:.78,facetContrast:.84,brilliance:.74,fire:.24}
};

export const getAurumOpticalProfile=(familia:string):AurumOpticalProfile=>
  AURUM_OPTICAL_PROFILES[familia]??AURUM_OPTICAL_PROFILES["Diamante"]!;

export type AurumFacetProfile={
  cut:string;
  crownAngle:number;
  pavilionAngle:number;
  tableRatio:number;
  facetContrast:number;
};

export const AURUM_FACET_PROFILES:Record<string,AurumFacetProfile>={
  brillante:{cut:"Brillante",crownAngle:34,pavilionAngle:40.75,tableRatio:.57,facetContrast:1},
  esmeralda:{cut:"Esmeralda",crownAngle:33,pavilionAngle:38,tableRatio:.68,facetContrast:.88},
  oval:{cut:"Oval",crownAngle:34,pavilionAngle:40,tableRatio:.60,facetContrast:.94},
  cushion:{cut:"Cushion",crownAngle:35,pavilionAngle:40,tableRatio:.62,facetContrast:.92},
  princesa:{cut:"Princesa",crownAngle:36,pavilionAngle:40,tableRatio:.72,facetContrast:.96}
};

export const getAurumFacetProfile=(cut:string="brillante")=>
  AURUM_FACET_PROFILES[cut]??AURUM_FACET_PROFILES["brillante"]!;

/**
 * Ajusta propiedades ópticas del material sin alterar la geometría del modelo.
 * Esto permite probar el pipeline óptico de forma segura con los archivos actuales.
 */
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


export type AurumDiamondOpticalConfig = {
  refractionStrength:number; dispersionStrength:number; internalReflection:number;
  brilliance:number; fire:number; facetContrast:number; environmentBoost:number;
};

export const AURUM_DIAMOND_OPTICAL_CONFIG:AurumDiamondOpticalConfig={
  refractionStrength:1, dispersionStrength:1, internalReflection:.98,
  brilliance:1, fire:1, facetContrast:1, environmentBoost:1
};

export const applyAurumDiamondOptics=(material:any,config=AURUM_DIAMOND_OPTICAL_CONFIG)=>{
  if(!material)return material;
  material.transmission=1;
  material.ior=2.417;
  material.dispersion=.035*config.dispersionStrength;
  material.roughness=.010;
  material.clearcoat=.26;
  material.clearcoatRoughness=.010;
  material.envMapIntensity=1.9*config.environmentBoost;
  material.attenuationDistance=100;
  material.userData={...(material.userData??{}),aurumDiamondOptics:config};
  material.needsUpdate=true;
  return material;
};


/**
 * Compatibilidad de API para AurumRender.
 * Mantiene un único comportamiento de aplicación de gemas.
 */
export const applyAurumGemPreset=(material:any,preset:AurumGemPreset,thickness:number)=>{
  return applyAurumGem(material,preset,Math.max(.015,thickness*(preset.thicknessScale??1)));
};
