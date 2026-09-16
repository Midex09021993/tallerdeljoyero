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
  oscuro:{id:"oscuro",background:0x090b0e,ground:0x15181c,groundRoughness:.30,groundMetalness:.05,groundVisible:true,environmentIntensity:.72,environmentRotation:.16,shadowIntensity:.48,shadowSoftness:.72,exposure:.62},
  claro:{id:"claro",background:0xe9e9e7,ground:0xe3e2df,groundRoughness:.52,groundMetalness:.01,groundVisible:true,environmentIntensity:.88,environmentRotation:.20,shadowIntensity:.22,shadowSoftness:.94,exposure:1.02},
  luxury:{id:"luxury",background:0x21150c,ground:0x20140b,groundRoughness:.30,groundMetalness:.04,groundVisible:true,environmentIntensity:.74,environmentRotation:.42,shadowIntensity:.52,shadowSoftness:.68,exposure:.60},
  marmol:{id:"marmol",background:0xc9c6bf,ground:0xc5c2bc,groundRoughness:.24,groundMetalness:.02,groundVisible:true,environmentIntensity:.76,environmentRotation:.16,shadowIntensity:.30,shadowSoftness:.90,exposure:.60},
  transparente:{id:"transparente",background:0x000000,ground:0x15181c,groundRoughness:.30,groundMetalness:.02,groundVisible:false,environmentIntensity:.72,environmentRotation:.16,shadowIntensity:.30,shadowSoftness:.90,exposure:.62},
  producto:{id:"producto",background:0xf7f6f3,ground:0xe9e7e3,groundRoughness:.78,groundMetalness:.002,groundVisible:true,environmentIntensity:.78,environmentRotation:.42,shadowIntensity:.18,shadowSoftness:.985,exposure:.78},
  galeria:{id:"galeria",background:0x18191c,ground:0x24262a,groundRoughness:.34,groundMetalness:.025,groundVisible:true,environmentIntensity:.78,environmentRotation:.62,shadowIntensity:.36,shadowSoftness:.90,exposure:.68},
  oroCalido:{id:"oroCalido",background:0x302216,ground:0x3b2a1b,groundRoughness:.38,groundMetalness:.02,groundVisible:true,environmentIntensity:.80,environmentRotation:.42,shadowIntensity:.30,shadowSoftness:.92,exposure:.72},
  gemaClara:{id:"gemaClara",background:0xe7edf2,ground:0xdde4ea,groundRoughness:.42,groundMetalness:.01,groundVisible:true,environmentIntensity:.86,environmentRotation:.08,shadowIntensity:.16,shadowSoftness:.97,exposure:.86}
};


export type AurumHdriResource = {
  id:string;
  name:string;
  url:string;
  sourceUrl:string;
  purpose:"soft-product"|"specular-product"|"neutral-product";
  license:"CC0";
};

/**
 * Recursos HDRI externos candidatos para producto/joyería.
 * Se mantienen en catálogo sin cambiar los presets activos hasta validarlos visualmente.
 */
export const AURUM_HDRI_LIBRARY:AurumHdriResource[]=[
  {
    id:"storyStudio02",
    name:"Story Studio 02",
    url:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/story_studio_02_1k.hdr",
    sourceUrl:"https://polyhaven.com/a/story_studio_02",
    purpose:"soft-product",
    license:"CC0",
  },
  {
    id:"storyStudio04",
    name:"Story Studio 04",
    url:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/story_studio_04_1k.hdr",
    sourceUrl:"https://polyhaven.com/a/story_studio_04",
    purpose:"soft-product",
    license:"CC0",
  },
  {
    id:"storyStudio05",
    name:"Story Studio 05",
    url:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/story_studio_05_1k.hdr",
    sourceUrl:"https://polyhaven.com/a/story_studio_05",
    purpose:"specular-product",
    license:"CC0",
  },
  {
    id:"monochromeStudio02",
    name:"Monochrome Studio 02",
    url:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/monochrome_studio_02_1k.hdr",
    sourceUrl:"https://polyhaven.com/a/monochrome_studio_02",
    purpose:"specular-product",
    license:"CC0",
  },
  {
    id:"whiteStudio06",
    name:"White Studio 06",
    url:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/white_studio_06_1k.hdr",
    sourceUrl:"https://polyhaven.com/a/white_studio_06",
    purpose:"neutral-product",
    license:"CC0",
  },
];

export const getAurumScenePreset=(id:string)=>AURUM_SCENE_PRESETS[id]??AURUM_SCENE_PRESETS["claro"]!;

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
