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
  claro:{id:"claro",background:0xe9e9e7,ground:0xe3e2df,groundRoughness:.52,groundMetalness:.01,groundVisible:true,environmentIntensity:.42,environmentRotation:.20,shadowIntensity:.22,shadowSoftness:.94,exposure:1.02},
  luxury:{id:"luxury",background:0x21150c,ground:0x20140b,groundRoughness:.30,groundMetalness:.04,groundVisible:true,environmentIntensity:.095,environmentRotation:.42,shadowIntensity:.52,shadowSoftness:.68,exposure:.60},
  marmol:{id:"marmol",background:0xc9c6bf,ground:0xc5c2bc,groundRoughness:.24,groundMetalness:.02,groundVisible:true,environmentIntensity:.11,environmentRotation:.16,shadowIntensity:.30,shadowSoftness:.90,exposure:.60},
  transparente:{id:"transparente",background:0x000000,ground:0x15181c,groundRoughness:.30,groundMetalness:.02,groundVisible:false,environmentIntensity:.10,environmentRotation:.16,shadowIntensity:.30,shadowSoftness:.90,exposure:.62},
  producto:{id:"producto",background:0xf4f3f0,ground:0xe8e6e1,groundRoughness:.46,groundMetalness:.01,groundVisible:true,environmentIntensity:.16,environmentRotation:.12,shadowIntensity:.18,shadowSoftness:.96,exposure:.84},
  galeria:{id:"galeria",background:0x18191c,ground:0x24262a,groundRoughness:.34,groundMetalness:.025,groundVisible:true,environmentIntensity:.12,environmentRotation:.62,shadowIntensity:.36,shadowSoftness:.90,exposure:.68},
  oroCalido:{id:"oroCalido",background:0x302216,ground:0x3b2a1b,groundRoughness:.38,groundMetalness:.02,groundVisible:true,environmentIntensity:.13,environmentRotation:.42,shadowIntensity:.30,shadowSoftness:.92,exposure:.72},
  gemaClara:{id:"gemaClara",background:0xe7edf2,ground:0xdde4ea,groundRoughness:.42,groundMetalness:.01,groundVisible:true,environmentIntensity:.18,environmentRotation:.08,shadowIntensity:.16,shadowSoftness:.97,exposure:.86}
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
