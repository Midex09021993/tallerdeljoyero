/**
 * AURUM MATERIAL ENGINE
 * Capa técnica independiente del visor.
 */
export type AurumMetalPreset = {
  color:number; metalness:number; roughness:number; envMapIntensity:number;
  clearcoat:number; anisotropy?:number; anisotropyRotation?:number;
};
export type AurumGemPreset = {
  id:string; familia:string; variante:string; color:number; transmission:number;
  ior:number; roughness:number; envMapIntensity:number; attenuationColor:number;
  attenuationDistance:number; dispersion:number; iridescence:number; thicknessScale:number;
  inclusions:boolean; inclusionDensity:number; inclusionType?:string;
};

export type AurumInclusionType =
  | "none" | "veil" | "feather" | "needle" | "cloud" | "crystal"
  | "silk" | "fingerprint" | "tubular";

export type AurumInclusionConfig = {
  type:AurumInclusionType;
  density:number;
  scale:number;
  opacity:number;
  depth:number;
  seed:number;
  color:number;
};

export const AURUM_GEM_ENGINE_VERSION="1.1.0";

export const AURUM_GEM_PRESETS:Record<string,AurumGemPreset>={
  diamante:{
    id:"diamante",familia:"Diamante",variante:"Natural",color:0xffffff,
    transmission:1,ior:2.417,roughness:.012,envMapIntensity:1.9,
    attenuationColor:0xffffff,attenuationDistance:100,dispersion:.035,
    iridescence:.03,thicknessScale:1,inclusions:false,inclusionDensity:0,inclusionType:"none"
  },
  diamante_inclusiones:{
    id:"diamante_inclusiones",familia:"Diamante",variante:"Con inclusiones",color:0xf8f8f8,
    transmission:1,ior:2.417,roughness:.018,envMapIntensity:1.8,
    attenuationColor:0xf5f5f5,attenuationDistance:65,dispersion:.035,
    iridescence:.04,thicknessScale:1,inclusions:true,inclusionDensity:.18,inclusionType:"silk"
  },
  esmeralda_1:{
    id:"esmeralda_1",familia:"Esmeralda",variante:"Calidad 1",color:0x087f45,
    transmission:.94,ior:1.577,roughness:.018,envMapIntensity:1.65,
    attenuationColor:0x087f45,attenuationDistance:18,dispersion:.012,
    iridescence:0,thicknessScale:1.05,inclusions:false,inclusionDensity:0
  },
  esmeralda_2:{
    id:"esmeralda_2",familia:"Esmeralda",variante:"Calidad 2",color:0x0a6b3b,
    transmission:.88,ior:1.577,roughness:.022,envMapIntensity:1.55,
    attenuationColor:0x075d34,attenuationDistance:12,dispersion:.012,
    iridescence:0,thicknessScale:1.05,inclusions:true,inclusionDensity:.10,inclusionType:"fingerprint"
  },
  esmeralda_3:{
    id:"esmeralda_3",familia:"Esmeralda",variante:"Calidad 3",color:0x064d2f,
    transmission:.80,ior:1.577,roughness:.028,envMapIntensity:1.45,
    attenuationColor:0x043d25,attenuationDistance:8,dispersion:.012,
    iridescence:0,thicknessScale:1.08,inclusions:true,inclusionDensity:.22,inclusionType:"fingerprint"
  },
  rubi:{
    id:"rubi",familia:"Rubí",variante:"Natural",color:0x9f1239,
    transmission:.93,ior:1.762,roughness:.018,envMapIntensity:1.65,
    attenuationColor:0x8f1239,attenuationDistance:16,dispersion:.014,
    iridescence:0,thicknessScale:1.05,inclusions:false,inclusionDensity:0
  },
  rubi_sangre_pichon:{
    id:"rubi_sangre_pichon",familia:"Rubí",variante:"Sangre de pichón",color:0x8f0d28,
    transmission:.91,ior:1.762,roughness:.016,envMapIntensity:1.7,
    attenuationColor:0x78091f,attenuationDistance:13,dispersion:.014,
    iridescence:0,thicknessScale:1.05,inclusions:false,inclusionDensity:0
  },
  rubi_inclusiones:{
    id:"rubi_inclusiones",familia:"Rubí",variante:"Con inclusiones",color:0x7f1233,
    transmission:.84,ior:1.762,roughness:.025,envMapIntensity:1.5,
    attenuationColor:0x650c28,attenuationDistance:9,dispersion:.014,
    iridescence:0,thicknessScale:1.08,inclusions:true,inclusionDensity:.20,inclusionType:"silk"
  },
  zafiro_azul:{
    id:"zafiro_azul",familia:"Zafiro",variante:"Azul",color:0x1247a6,
    transmission:.94,ior:1.77,roughness:.018,envMapIntensity:1.65,
    attenuationColor:0x103d91,attenuationDistance:17,dispersion:.012,
    iridescence:0,thicknessScale:1.05,inclusions:false,inclusionDensity:0
  },
  zafiro_inclusiones:{
    id:"zafiro_inclusiones",familia:"Zafiro",variante:"Con inclusiones",color:0x173c86,
    transmission:.85,ior:1.77,roughness:.025,envMapIntensity:1.5,
    attenuationColor:0x112e69,attenuationDistance:10,dispersion:.012,
    iridescence:0,thicknessScale:1.08,inclusions:true,inclusionDensity:.18
  },
  moissanita:{
    id:"moissanita",familia:"Moissanita",variante:"Natural",color:0xffffff,
    transmission:1,ior:2.65,roughness:.012,envMapIntensity:1.85,
    attenuationColor:0xffffff,attenuationDistance:80,dispersion:.104,
    iridescence:.05,thicknessScale:1,inclusions:false,inclusionDensity:0
  }
};

export const getAurumGemPreset=(id:string)=>AURUM_GEM_PRESETS[id] ?? AURUM_GEM_PRESETS.diamante;
export const listAurumGemPresets=()=>Object.values(AURUM_GEM_PRESETS);

export const applyAurumGemPreset=(material:any,preset:AurumGemPreset,thickness:number)=>{
  if(!material) return material;
  material.color?.setHex(preset.color);
  material.metalness=0; material.roughness=preset.roughness;
  material.transmission=preset.transmission;
  material.thickness=Math.max(.015,thickness*preset.thicknessScale);
  material.ior=Math.min(2.65,Math.max(1.01,preset.ior));
  material.specularIntensity=1;
  material.clearcoat=(preset.familia==="Diamante"||preset.familia==="Moissanita") ? .26 : .18;
  material.clearcoatRoughness=(preset.familia==="Diamante"||preset.familia==="Moissanita") ? .012 : .02;
  material.envMapIntensity=preset.envMapIntensity;
  material.attenuationColor?.setHex(preset.attenuationColor);
  material.attenuationDistance=preset.attenuationDistance;
  material.dispersion=Math.max(0,preset.dispersion);
  material.iridescence=preset.iridescence;
  material.iridescenceIOR=Math.min(2.65,Math.max(1.01,preset.ior));
  material.transparent=false; material.opacity=1; material.needsUpdate=true;
  return material;
};


/**
 * Configuración determinista de inclusiones.
 * El seed garantiza que una misma piedra conserve sus inclusiones al cambiar de vista.
 */
export const createAurumInclusionConfig=(preset:AurumGemPreset, seed=1):AurumInclusionConfig=>({
  type:(preset.inclusionType??(preset.familia==="Esmeralda"?"fingerprint":preset.familia==="Rubí"||preset.familia==="Zafiro"?"silk":"none")) as AurumInclusionType,
  density:Math.max(0,Math.min(1,preset.inclusionDensity)),
  scale:preset.familia==="Diamante"?.035:.06,
  opacity:.34,
  depth:.72,
  seed,
  color:preset.familia==="Esmeralda"?0x173c2c:preset.familia==="Rubí"?0x3a0714:preset.familia==="Zafiro"?0xd9e4ff:0x6f6f6f
});

/**
 * Genera puntos 3D reproducibles dentro del volumen local de la gema.
 * El render puede convertirlos posteriormente en micro-inclusiones/volúmenes.
 */
export const generateAurumInclusionPoints=(config:AurumInclusionConfig,count=48)=>{
  const points:{x:number;y:number;z:number;size:number;opacity:number}[]=[];
  let s=(config.seed>>>0)||1;
  const rnd=()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};
  const n=Math.round(Math.max(0,Math.min(160,count*config.density)));
  for(let i=0;i<n;i++){
    const r=Math.cbrt(rnd()), a=rnd()*Math.PI*2, z=rnd()*2-1;
    const t=Math.sqrt(Math.max(0,1-z*z));
    points.push({
      x:r*t*Math.cos(a),y:r*t*Math.sin(a),z:r*z,
      size:config.scale*(.45+rnd()*1.55),
      opacity:config.opacity*(.55+rnd()*.45)
    });
  }
  return points;
};
