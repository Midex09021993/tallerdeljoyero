/**
 * AURUM MATERIAL ENGINE
 * Capa técnica independiente del visor.
 */
export type AurumMetalPreset = {
  color:number; metalness:number; roughness:number; envMapIntensity:number;
  clearcoat:number; anisotropy?:number; anisotropyRotation?:number;
};
export type AurumGemPreset = {
  color:number; transmission:number; ior:number; roughness:number;
  envMapIntensity:number; attenuationColor:number; attenuationDistance:number;
  dispersion:number; iridescence:number;
};
export const AURUM_MATERIAL_ENGINE_VERSION = "1.0.0";

export const applyAurumMetal = (material:any, preset:AurumMetalPreset) => {
  if (!material) return material;
  material.color?.setHex(preset.color);
  material.metalness=preset.metalness; material.roughness=preset.roughness;
  material.envMapIntensity=preset.envMapIntensity; material.clearcoat=preset.clearcoat;
  material.clearcoatRoughness=Math.min(.35,Math.max(.025,preset.roughness*.42));
  material.anisotropy=Math.max(0,Math.min(1,preset.anisotropy??0));
  material.anisotropyRotation=preset.anisotropyRotation??0;
  material.specularIntensity=preset.metalness>.9?1:.8;
  material.specularColor?.setHex(0xffffff);
  material.emissive?.setHex(0x000000); material.emissiveIntensity=0;
  material.needsUpdate=true; return material;
};

export const applyAurumGem = (material:any,preset:AurumGemPreset,thickness:number,family:string) => {
  if (!material) return material;
  material.color?.setHex(preset.color); material.metalness=0;
  material.roughness=preset.roughness; material.transmission=preset.transmission;
  material.thickness=Math.max(.015,thickness);
  material.ior=Math.min(2.333,Math.max(1.01,preset.ior));
  material.specularIntensity=1;
  material.clearcoat=family==="Diamante" ? .26 : .18;
  material.clearcoatRoughness=family==="Diamante" ? .012 : .02;
  material.envMapIntensity=preset.envMapIntensity;
  material.attenuationColor?.setHex(preset.attenuationColor);
  material.attenuationDistance=preset.attenuationDistance;
  material.dispersion=Math.max(0,preset.dispersion);
  material.iridescence=preset.iridescence;
  material.iridescenceIOR=Math.min(2.333,Math.max(1.01,preset.ior));
  material.transparent=false; material.opacity=1; material.needsUpdate=true; return material;
};

export const metalPresetFromConfig=(m:any):AurumMetalPreset=>({
  color:m.color,metalness:m.metalness,roughness:m.roughness,envMapIntensity:m.envMapIntensity,
  clearcoat:m.clearcoat,anisotropy:m.anisotropy,anisotropyRotation:m.anisotropyRotation
});
export const gemPresetFromConfig=(g:any):AurumGemPreset=>({
  color:g.color,transmission:g.transmission,ior:g.ior,roughness:g.roughness,
  envMapIntensity:g.envMapIntensity,attenuationColor:g.attenuationColor,
  attenuationDistance:g.attenuationDistance,dispersion:g.dispersion,iridescence:g.iridescence
});


/**
 * AURUM GEM ENGINE v1.0
 * Presets ópticos para gemas de joyería. No modifica la UI.
 */
export type AurumGemPreset = {
  id:string; familia:string; variante:string; color:number; transmission:number;
  ior:number; roughness:number; envMapIntensity:number; attenuationColor:number;
  attenuationDistance:number; dispersion:number; iridescence:number; thicknessScale:number;
  inclusions:boolean; inclusionDensity:number;
};

export const AURUM_GEM_ENGINE_VERSION="1.0.0";

export const AURUM_GEM_PRESETS:Record<string,AurumGemPreset>={
  diamante:{
    id:"diamante",familia:"Diamante",variante:"Natural",color:0xffffff,
    transmission:1,ior:2.417,roughness:.012,envMapIntensity:1.9,
    attenuationColor:0xffffff,attenuationDistance:100,dispersion:.035,
    iridescence:.03,thicknessScale:1,inclusions:false,inclusionDensity:0
  },
  diamante_inclusiones:{
    id:"diamante_inclusiones",familia:"Diamante",variante:"Con inclusiones",color:0xf8f8f8,
    transmission:1,ior:2.417,roughness:.018,envMapIntensity:1.8,
    attenuationColor:0xf5f5f5,attenuationDistance:65,dispersion:.035,
    iridescence:.04,thicknessScale:1,inclusions:true,inclusionDensity:.18
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
    iridescence:0,thicknessScale:1.05,inclusions:true,inclusionDensity:.10
  },
  esmeralda_3:{
    id:"esmeralda_3",familia:"Esmeralda",variante:"Calidad 3",color:0x064d2f,
    transmission:.80,ior:1.577,roughness:.028,envMapIntensity:1.45,
    attenuationColor:0x043d25,attenuationDistance:8,dispersion:.012,
    iridescence:0,thicknessScale:1.08,inclusions:true,inclusionDensity:.22
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
    iridescence:0,thicknessScale:1.08,inclusions:true,inclusionDensity:.20
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
