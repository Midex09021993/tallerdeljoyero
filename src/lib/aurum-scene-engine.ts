/**
 * AURUM SCENE ENGINE v1.0
 * Configuración de escena inspirada en la separación de Scene Settings de iJewel:
 * entorno, fondo, suelo, sombras y calidad de render.
 */

export type AurumScenePreset = {
  id:string;
  background:number;
  ground:number;
  groundRoughness:number;
  groundMetalness:number;
  groundVisible:boolean;
  environmentIntensity:number;
  environmentRotation:number;
  shadowIntensity:number;
  shadowSoftness:number;
  exposure:number;
};

export const AURUM_SCENE_PRESETS:Record<string,AurumScenePreset>={
  oscuro:{id:"oscuro",background:0x090b0e,ground:0x15181c,groundRoughness:.30,groundMetalness:.05,groundVisible:true,environmentIntensity:.105,environmentRotation:.16,shadowIntensity:.48,shadowSoftness:.72,exposure:.62},
  claro:{id:"claro",background:0xc4c5c7,ground:0xb9babe,groundRoughness:.42,groundMetalness:.02,groundVisible:true,environmentIntensity:.10,environmentRotation:.16,shadowIntensity:.34,shadowSoftness:.86,exposure:.61},
  luxury:{id:"luxury",background:0x21150c,ground:0x20140b,groundRoughness:.30,groundMetalness:.04,groundVisible:true,environmentIntensity:.095,environmentRotation:.42,shadowIntensity:.52,shadowSoftness:.68,exposure:.60},
  marmol:{id:"marmol",background:0xc9c6bf,ground:0xc5c2bc,groundRoughness:.24,groundMetalness:.02,groundVisible:true,environmentIntensity:.11,environmentRotation:.16,shadowIntensity:.30,shadowSoftness:.90,exposure:.60},
  transparente:{id:"transparente",background:0x000000,ground:0x15181c,groundRoughness:.30,groundMetalness:.02,groundVisible:false,environmentIntensity:.10,environmentRotation:.16,shadowIntensity:.30,shadowSoftness:.90,exposure:.62}
};

export const getAurumScenePreset=(id:string)=>AURUM_SCENE_PRESETS[id]??AURUM_SCENE_PRESETS.claro;

export type AurumRenderQuality={pixelRatio:number;shadows:boolean;shadowMapSize:number;transmissionScale:number};

export const AURUM_RENDER_QUALITY:Record<"balanced"|"high",AurumRenderQuality>={
  balanced:{pixelRatio:1.5,shadows:true,shadowMapSize:1024,transmissionScale:.65},
  high:{pixelRatio:2,shadows:true,shadowMapSize:2048,transmissionScale:.85}
};

export const getAurumRenderQuality=(quality:"balanced"|"high"="balanced")=>AURUM_RENDER_QUALITY[quality];


export type AurumHdriGroundConfig={
  enabled:boolean; worldRadius:number; tripodHeight:number;
  originX:number; originY:number; originZ:number; opacity:number;
};

export const AURUM_HDRI_GROUND_DEFAULT:AurumHdriGroundConfig={
  enabled:false, worldRadius:40, tripodHeight:1.2,
  originX:0, originY:0, originZ:0, opacity:1
};
