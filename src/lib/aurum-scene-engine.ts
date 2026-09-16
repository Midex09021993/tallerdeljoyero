/**
 * AURUM SCENE ENGINE v1.1

/**
 * TEMPORARY LOVABLE REPAIR TRIGGER
 * This branch intentionally throws during module initialization so Lovable Agent
 * receives a deterministic failure to diagnose. Remove this block after fixing
 * the Aurum viewer initialization/loading path and verifying the 3D viewport.
 */
throw new Error("[AURUM-LOVABLE-REPAIR] Viewer initialization intentionally blocked. Fix the 3D viewport loading path, preserve the current Aurum UX shell, and verify materials, gems, scenes, lighting, HDRI/PBR controls, quality modes, model loading and camera framing.");

 * Escenas fotográficas separadas de materiales y postprocesado.
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
  claro:{id:"claro",background:0xf4f4f2,ground:0xe9e8e5,groundRoughness:.56,groundMetalness:.01,groundVisible:true,environmentIntensity:.62,environmentRotation:.20,shadowIntensity:.22,shadowSoftness:.94,exposure:.70,lighting:"jewelry"},
  luxury:{id:"luxury",background:0x21150c,ground:0x20140b,groundRoughness:.34,groundMetalness:.03,groundVisible:true,environmentIntensity:.56,environmentRotation:.42,shadowIntensity:.46,shadowSoftness:.82,exposure:.57,lighting:"luxury"},
  marmol:{id:"marmol",background:0xc9c6bf,ground:0xc5c2bc,groundRoughness:.24,groundMetalness:.02,groundVisible:true,environmentIntensity:.68,environmentRotation:.16,shadowIntensity:.30,shadowSoftness:.90,exposure:.62,lighting:"studioSoft"},
  transparente:{id:"transparente",background:0x000000,ground:0x15181c,groundRoughness:.30,groundMetalness:.02,groundVisible:false,environmentIntensity:.62,environmentRotation:.16,shadowIntensity:.30,shadowSoftness:.90,exposure:.62,lighting:"studioSoft"},
  // White-background packshot: pure white canvas, slightly off-white ground for
  // separation, restrained exposure and enough HDR energy to keep polished metal alive.
  producto:{id:"producto",background:0xffffff,ground:0xf8f8f6,groundRoughness:.72,groundMetalness:.001,groundVisible:true,environmentIntensity:.34,environmentRotation:.54,shadowIntensity:.16,shadowSoftness:.985,exposure:.58,lighting:"productSoft"},
  galeria:{id:"galeria",background:0x18191c,ground:0x24262a,groundRoughness:.34,groundMetalness:.025,groundVisible:true,environmentIntensity:.68,environmentRotation:.62,shadowIntensity:.36,shadowSoftness:.90,exposure:.68,lighting:"studioHard"},
  oroCalido:{id:"oroCalido",background:0x302216,ground:0x3b2a1b,groundRoughness:.38,groundMetalness:.02,groundVisible:true,environmentIntensity:.58,environmentRotation:.42,shadowIntensity:.28,shadowSoftness:.92,exposure:.61,lighting:"luxury"},
  // Gem scene: brighter neutral set, but not a global exposure push.
  gemaClara:{id:"gemaClara",background:0xf0f3f5,ground:0xe5eaee,groundRoughness:.48,groundMetalness:.01,groundVisible:true,environmentIntensity:.42,environmentRotation:.08,shadowIntensity:.13,shadowSoftness:.985,exposure:.66,lighting:"jewelry"}
};

export type AurumHdriResource = {
  id:string;
  name:string;
  url:string;
  sourceUrl:string;
  purpose:"soft-product"|"specular-product"|"neutral-product";
  license:"CC0";
};

export const AURUM_HDRI_LIBRARY:AurumHdriResource[]=[
  {id:"storyStudio02",name:"Story Studio 02",url:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/story_studio_02_1k.hdr",sourceUrl:"https://polyhaven.com/a/story_studio_02",purpose:"soft-product",license:"CC0"},
  {id:"storyStudio04",name:"Story Studio 04",url:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/story_studio_04_1k.hdr",sourceUrl:"https://polyhaven.com/a/story_studio_04",purpose:"soft-product",license:"CC0"},
  {id:"storyStudio05",name:"Story Studio 05",url:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/story_studio_05_1k.hdr",sourceUrl:"https://polyhaven.com/a/story_studio_05",purpose:"specular-product",license:"CC0"},
  {id:"monochromeStudio02",name:"Monochrome Studio 02",url:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/monochrome_studio_02_1k.hdr",sourceUrl:"https://polyhaven.com/a/monochrome_studio_02",purpose:"specular-product",license:"CC0"},
  {id:"whiteStudio06",name:"White Studio 06",url:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/white_studio_06_1k.hdr",sourceUrl:"https://polyhaven.com/a/white_studio_06",purpose:"neutral-product",license:"CC0"},
];

export const getAurumScenePreset=(id:string)=>AURUM_SCENE_PRESETS[id]??AURUM_SCENE_PRESETS["claro"]!;

export type AurumRenderQuality={pixelRatio:number;shadows:boolean;shadowMapSize:number;transmissionScale:number};
export type AurumRenderQualityId="low"|"high"|"ultra";
export const AURUM_RENDER_QUALITY:Record<AurumRenderQualityId,AurumRenderQuality>={
  low:{pixelRatio:1.0,shadows:true,shadowMapSize:512,transmissionScale:.40},
  high:{pixelRatio:1.4,shadows:true,shadowMapSize:1024,transmissionScale:.68},
  ultra:{pixelRatio:1.6,shadows:true,shadowMapSize:1536,transmissionScale:.82},
};
export const getAurumRenderQuality=(quality:AurumRenderQualityId="high")=>AURUM_RENDER_QUALITY[quality];

export type AurumHdriGroundConfig={enabled:boolean;worldRadius:number;tripodHeight:number;originX:number;originY:number;originZ:number;opacity:number};
export const AURUM_HDRI_GROUND_DEFAULT:AurumHdriGroundConfig={enabled:false,worldRadius:40,tripodHeight:1.2,originX:0,originY:0,originZ:0,opacity:1};
