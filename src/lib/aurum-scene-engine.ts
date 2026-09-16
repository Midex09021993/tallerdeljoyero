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
  lighting:"studioSoft"|"studioHard"|"jewelry"|"luxury"|"productSoft";
};

export const AURUM_SCENE_PRESETS:Record<string,AurumScenePreset>={
  oscuro:{id:"oscuro",background:0x090b0e,ground:0x15181c,groundRoughness:.30,groundMetalness:.05,groundVisible:true,environmentIntensity:.68,environmentRotation:.16,shadowIntensity:.48,shadowSoftness:.72,exposure:.62,lighting:"studioHard"},
  claro:{id:"claro",background:0xe9e9e7,ground:0xe3e2df,groundRoughness:.52,groundMetalness:.01,groundVisible:true,environmentIntensity:.72,environmentRotation:.20,shadowIntensity:.22,shadowSoftness:.94,exposure:.86,lighting:"jewelry"},
  luxury:{id:"luxury",background:0x21150c,ground:0x20140b,groundRoughness:.30,groundMetalness:.04,groundVisible:true,environmentIntensity:.64,environmentRotation:.42,shadowIntensity:.52,shadowSoftness:.68,exposure:.60,lighting:"luxury"},
  marmol:{id:"marmol",background:0xc9c6bf,ground:0xc5c2bc,groundRoughness:.24,groundMetalness:.02,groundVisible:true,environmentIntensity:.68,environmentRotation:.16,shadowIntensity:.30,shadowSoftness:.90,exposure:.62,lighting:"studioSoft"},
  transparente:{id:"transparente",background:0x000000,ground:0x15181c,groundRoughness:.30,groundMetalness:.02,groundVisible:false,environmentIntensity:.62,environmentRotation:.16,shadowIntensity:.30,shadowSoftness:.90,exposure:.62,lighting:"studioSoft"},
  producto:{id:"producto",background:0xf7f7f5,ground:0xf1f0ed,groundRoughness:.88,groundMetalness:.001,groundVisible:true,environmentIntensity:.46,environmentRotation:.22,shadowIntensity:.20,shadowSoftness:.97,exposure:.72,lighting:"productSoft"},
  galeria:{id:"galeria",background:0x18191c,ground:0x24262a,groundRoughness:.34,groundMetalness:.025,groundVisible:true,environmentIntensity:.68,environmentRotation:.62,shadowIntensity:.36,shadowSoftness:.90,exposure:.68,lighting:"studioHard"},
  oroCalido:{id:"oroCalido",background:0x302216,ground:0x3b2a1b,groundRoughness:.38,groundMetalness:.02,groundVisible:true,environmentIntensity:.64,environmentRotation:.42,shadowIntensity:.30,shadowSoftness:.92,exposure:.70,lighting:"luxury"},
  gemaClara:{id:"gemaClara",background:0xe7edf2,ground:0xdde4ea,groundRoughness:.42,groundMetalness:.01,groundVisible:true,environmentIntensity:.66,environmentRotation:.08,shadowIntensity:.16,shadowSoftness:.97,exposure:.80,lighting:"jewelry"}
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

export type AurumRenderQuality={
  /** Drawing-buffer scale used by the interactive viewport. */
  pixelRatio:number;
  shadows:boolean;
  shadowMapSize:number;
  /** Resolution scale of Three.js' transmission render target for gems. */
  transmissionScale:number;
};

export type AurumRenderQualityId="low"|"high"|"ultra";

export const AURUM_RENDER_QUALITY:Record<AurumRenderQualityId,AurumRenderQuality>={
  // Preview: keeps interaction fluid on normal/low-power hardware.
  low:{pixelRatio:1.0,shadows:true,shadowMapSize:512,transmissionScale:.40},
  // Production viewport: enough resolution to improve metal highlights without
  // making post-processing and transmission unnecessarily expensive.
  high:{pixelRatio:1.4,shadows:true,shadowMapSize:1024,transmissionScale:.68},
  // Ultra is a photographic-detail mode, not a brute-force "everything max".
  // Keep the jump measurable while avoiding the 4x pixel cost of 2x DPR plus
  // a 2x shadow map and full-resolution transmission on every frame.
  ultra:{pixelRatio:1.6,shadows:true,shadowMapSize:1536,transmissionScale:.82},
};

export const getAurumRenderQuality=(quality:AurumRenderQualityId="high")=>AURUM_RENDER_QUALITY[quality];


export type AurumHdriGroundConfig={
  enabled:boolean; worldRadius:number; tripodHeight:number;
  originX:number; originY:number; originZ:number; opacity:number;
};

export const AURUM_HDRI_GROUND_DEFAULT:AurumHdriGroundConfig={
  enabled:false, worldRadius:40, tripodHeight:1.2,
  originX:0, originY:0, originZ:0, opacity:1
};
