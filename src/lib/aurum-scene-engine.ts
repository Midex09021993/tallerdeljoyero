/**
 * AURUM SCENE ENGINE v1.2
 * Escenas de presentación independientes de HDR, iluminación y postprocesado.
 */

export type AurumScenePreset = {
  id:string;
  background:number;
  ground:number;
  groundRoughness:number;
  groundMetalness:number;
  groundVisible:boolean;
  shadowIntensity:number;
  shadowSoftness:number;
  groundSize?:number;
  preserveBackground?:boolean;
  groundReflection?:boolean;
  environmentRotation?:number;
  bakedShadowProfile?: "A" | "B";
  cameraDirection?: [number,number,number];
  shadowTarget?: [number,number,number];
  shadowOffset?: [number,number];
  shadowProfile?: {lightIntensity:number;shadowRadius:number;bias:number;frustumSize:number;focus:number;spread:number;distanceScale:number;mapWidth:number;mapHeight:number;near:number;far:number;randomizedDirectionalLight:boolean};
};

/** Parámetros de referencia del shadowBaker extraídos de los VJSON originales.
 * Se conservan como metadatos; no se convierten en sombras dinámicas ni se afirma
 * que AURUM reproduzca todavía el bake de iJewel.
 */
export const AURUM_IJEWEL_BAKED_SHADOW_PROFILES = {
  A: {"lightIntensity":10,"shadowRadius":10,"bias":0,"frustumSize":4,"focus":0.6400712089334843,"spread":1,"distanceScale":20,"mapWidth":1024,"mapHeight":1024,"near":1.5,"far":41,"randomizedDirectionalLight":false},
  B: {"lightIntensity":41.57678074024398,"shadowRadius":6.5435290904968575,"bias":0.014228227814819916,"frustumSize":8,"focus":0,"spread":1,"distanceScale":36.758315910917325,"mapWidth":1024,"mapHeight":1024,"near":1.5,"far":81,"randomizedDirectionalLight":false},
} as const;

/** Referencias exactas por escena: cámara y dirección/offset originales del shadowBaker. */
export const AURUM_IJEWEL_SCENE_REFERENCES = {
  "ijewel01": {
    "cameraDirection": [
      -0.287375815,
      0.57570319,
      0.765493943
    ],
    "shadowTarget": [
      -0.518831349,
      -0.67976089,
      -0.518400583
    ],
    "shadowOffset": [
      -0.375,
      -0.25
    ],
    "shadowProfile": "A"
  },
  "ijewel02": {
    "cameraDirection": [
      -0.287375815,
      0.57570319,
      0.765493943
    ],
    "shadowTarget": [
      0.331665996,
      -0.768227555,
      -0.547561952
    ],
    "shadowOffset": [
      -0.25,
      0.375
    ],
    "shadowProfile": "A"
  },
  "ijewel03": {
    "cameraDirection": [
      -0.287375815,
      0.57570319,
      0.765493943
    ],
    "shadowTarget": [
      0.540277702,
      -0.841486732,
      0.000291992
    ],
    "shadowOffset": [
      -0.375,
      -0.25
    ],
    "shadowProfile": "A"
  },
  "ijewel04": {
    "cameraDirection": [
      -0.287375815,
      0.57570319,
      0.765493943
    ],
    "shadowTarget": [
      0.382608668,
      -0.892881062,
      -0.23743213
    ],
    "shadowOffset": [
      -0.25,
      0.375
    ],
    "shadowProfile": "A"
  },
  "ijewel05": {
    "cameraDirection": [
      -0.287375815,
      0.57570319,
      0.765493943
    ],
    "shadowTarget": [
      0.050370096,
      -0.902971068,
      -0.426738918
    ],
    "shadowOffset": [
      -0.375,
      -0.25
    ],
    "shadowProfile": "A"
  },
  "ijewel06": {
    "cameraDirection": [
      -0.307644152,
      0.57570319,
      0.757575681
    ],
    "shadowTarget": [
      -0.247103166,
      -0.954176417,
      -0.168782079
    ],
    "shadowOffset": [
      -0.25,
      0.375
    ],
    "shadowProfile": "A"
  },
  "ijewel07": {
    "cameraDirection": [
      -0.307644152,
      0.57570319,
      0.757575681
    ],
    "shadowTarget": [
      -0.074052198,
      -0.898270768,
      -0.433158054
    ],
    "shadowOffset": [
      -0.375,
      -0.25
    ],
    "shadowProfile": "A"
  },
  "ijewel08": {
    "cameraDirection": [
      -0.307644152,
      0.57570319,
      0.757575681
    ],
    "shadowTarget": [
      -0.17899533,
      -0.983017602,
      0.040460664
    ],
    "shadowOffset": [
      -0.375,
      -0.25
    ],
    "shadowProfile": "A"
  },
  "ijewel09": {
    "cameraDirection": [
      -0.307644152,
      0.57570319,
      0.757575681
    ],
    "shadowTarget": [
      -0.528257325,
      -0.805849027,
      -0.267491205
    ],
    "shadowOffset": [
      -0.25,
      0.375
    ],
    "shadowProfile": "A"
  },
  "ijewel10": {
    "cameraDirection": [
      -0.307644152,
      0.57570319,
      0.757575681
    ],
    "shadowTarget": [
      -0.583354224,
      -0.778711285,
      0.230882187
    ],
    "shadowOffset": [
      -0.25,
      0.375
    ],
    "shadowProfile": "A"
  },
  "ijewel11": {
    "cameraDirection": [
      -0.307644152,
      0.57570319,
      0.757575681
    ],
    "shadowTarget": [
      0.304600612,
      -0.892566771,
      -0.332480115
    ],
    "shadowOffset": [
      -0.25,
      0.375
    ],
    "shadowProfile": "B"
  },
  "ijewel12": {
    "cameraDirection": [
      -0.307644152,
      0.57570319,
      0.757575681
    ],
    "shadowTarget": [
      0.063044106,
      -0.996408122,
      0.056535787
    ],
    "shadowOffset": [
      -0.25,
      0.375
    ],
    "shadowProfile": "B"
  }
} as const;

export const AURUM_SCENE_PRESETS:Record<string,AurumScenePreset>={
  oscuro:{id:"oscuro",background:0x090b0e,ground:0x15181c,groundRoughness:.30,groundMetalness:.05,groundVisible:true,shadowIntensity:.48,shadowSoftness:.72},
  claro:{id:"claro",background:0xf4f4f2,ground:0xe9e8e5,groundRoughness:.56,groundMetalness:.01,groundVisible:true,shadowIntensity:.22,shadowSoftness:.94},
  luxury:{id:"luxury",background:0x21150c,ground:0x20140b,groundRoughness:.34,groundMetalness:.03,groundVisible:true,shadowIntensity:.46,shadowSoftness:.82},
  marmol:{id:"marmol",background:0xc9c6bf,ground:0xc5c2bc,groundRoughness:.24,groundMetalness:.02,groundVisible:true,shadowIntensity:.30,shadowSoftness:.90},
  transparente:{id:"transparente",background:0x000000,ground:0x15181c,groundRoughness:.30,groundMetalness:.02,groundVisible:false,shadowIntensity:.30,shadowSoftness:.90},
  // Product presentation: neutral gray photographic sweep with a separate light
  // ground. The distinction makes the jewelry sit in the frame instead of
  // disappearing into a pure-white canvas.
  producto:{id:"producto",background:0xdfdfdd,ground:0xf5f5f3,groundRoughness:.82,groundMetalness:.001,groundVisible:true,shadowIntensity:.24,shadowSoftness:.985},
  galeria:{id:"galeria",background:0x18191c,ground:0x24262a,groundRoughness:.34,groundMetalness:.025,groundVisible:true,shadowIntensity:.36,shadowSoftness:.90},
  oroCalido:{id:"oroCalido",background:0x302216,ground:0x3b2a1b,groundRoughness:.38,groundMetalness:.02,groundVisible:true,shadowIntensity:.28,shadowSoftness:.92},
  // Gem scene: brighter neutral set, but not a global exposure push.
  gemaClara:{id:"gemaClara",background:0xf0f3f5,ground:0xe5eaee,groundRoughness:.48,groundMetalness:.01,groundVisible:true,shadowIntensity:.13,shadowSoftness:.985},
  // Original AURUM premium baseline, retained as a separate calibration.
  // This is a presentation preset only; the VJSON HDR values remain in the
  // independent photographic environment configuration.
  // Doce escenas independientes; diez usan el perfil de horneado A y dos el B.
  ijewel01:{id:"ijewel01",background:0xffffff,ground:0xffffff,groundRoughness:1,groundMetalness:0,groundVisible:true,shadowIntensity:.22,shadowSoftness:.985,groundSize:8,preserveBackground:true,environmentRotation:0,bakedShadowProfile:"A"},
  ijewel02:{id:"ijewel02",background:0xffffff,ground:0xffffff,groundRoughness:1,groundMetalness:0,groundVisible:true,shadowIntensity:.22,shadowSoftness:.985,groundSize:8,preserveBackground:true,environmentRotation:0,bakedShadowProfile:"A"},
  ijewel03:{id:"ijewel03",background:0xffffff,ground:0xffffff,groundRoughness:1,groundMetalness:0,groundVisible:true,shadowIntensity:.22,shadowSoftness:.985,groundSize:8,preserveBackground:true,environmentRotation:0,bakedShadowProfile:"A"},
  ijewel04:{id:"ijewel04",background:0xffffff,ground:0xffffff,groundRoughness:1,groundMetalness:0,groundVisible:true,shadowIntensity:.22,shadowSoftness:.985,groundSize:8,preserveBackground:true,environmentRotation:1.615631142852238,bakedShadowProfile:"A"},
  ijewel05:{id:"ijewel05",background:0xffffff,ground:0xffffff,groundRoughness:1,groundMetalness:0,groundVisible:true,shadowIntensity:.22,shadowSoftness:.985,groundSize:8,preserveBackground:true,environmentRotation:1.615631142852238,bakedShadowProfile:"A"},
  ijewel06:{id:"ijewel06",background:0xffffff,ground:0xffffff,groundRoughness:1,groundMetalness:0,groundVisible:true,shadowIntensity:.22,shadowSoftness:.985,groundSize:8,preserveBackground:true,environmentRotation:1.615631142852238,bakedShadowProfile:"A"},
  ijewel07:{id:"ijewel07",background:0xffffff,ground:0xffffff,groundRoughness:1,groundMetalness:0,groundVisible:true,shadowIntensity:.22,shadowSoftness:.985,groundSize:8,preserveBackground:true,environmentRotation:2.1541748571363173,bakedShadowProfile:"A"},
  ijewel08:{id:"ijewel08",background:0xffffff,ground:0xffffff,groundRoughness:1,groundMetalness:0,groundVisible:true,shadowIntensity:.22,shadowSoftness:.985,groundSize:8,preserveBackground:true,environmentRotation:2.1541748571363173,bakedShadowProfile:"A"},
  ijewel09:{id:"ijewel09",background:0xffffff,ground:0xffffff,groundRoughness:1,groundMetalness:0,groundVisible:true,shadowIntensity:.22,shadowSoftness:.985,groundSize:8,preserveBackground:true,environmentRotation:2.1541748571363173,bakedShadowProfile:"A"},
  ijewel10:{id:"ijewel10",background:0xffffff,ground:0xffffff,groundRoughness:1,groundMetalness:0,groundVisible:true,shadowIntensity:.22,shadowSoftness:.985,groundSize:8,preserveBackground:true,environmentRotation:2.1541748571363173,bakedShadowProfile:"A"},
  ijewel11:{id:"ijewel11",background:0xffffff,ground:0xae3737,groundRoughness:0,groundMetalness:0.4038946361818656,groundVisible:true,shadowIntensity:.22,shadowSoftness:.985,groundSize:10,preserveBackground:true,environmentRotation:2.1541748571363173,bakedShadowProfile:"B",groundReflection:true},
  ijewel12:{id:"ijewel12",background:0xffffff,ground:0x516d8e,groundRoughness:0,groundMetalness:0.5207337216378336,groundVisible:true,shadowIntensity:.22,shadowSoftness:.985,groundSize:10,preserveBackground:true,environmentRotation:2.1541748571363173,bakedShadowProfile:"B",groundReflection:true},
  ijewelEnvironmentReference:{id:"ijewelEnvironmentReference",background:0xe7e7e4,ground:0xf1f0ec,groundRoughness:.68,groundMetalness:.01,groundVisible:true,shadowIntensity:.22,shadowSoftness:.985},
  // Adaptación de scene-config (13): fondo blanco y suelo oculto. HDR doble se aplica en Ambientes.
  estudioRosaPremium:{id:"estudioRosaPremium",background:0xffffff,ground:0xffffff,groundRoughness:1,groundMetalness:0,groundVisible:false,shadowIntensity:0,shadowSoftness:.985}
};

/** iJewel/WebGi reference calibration extracted from supplied VJSON/GLB. Renderer values are not universal physical constants. */
export const AURUM_IJEWEL_REFERENCE_CALIBRATION = {
  version: "0.22.0",
  camera: { fov: 25, damping: 0.08, zoomSpeed: 0.15, rotateSpeed: 2 },
  tonemap: { exposure: 1, saturation: 1, contrast: 1.1 },
  progressive: { referenceFrameCount: 10, highQualityFrameCount: 32, jitter: true },
  ssr: { intensity: 1, power: 1.1, stepCount: 16, tolerance: 0.5 },
  ssao: { intensity: 0.25, worldRadius: 1, bias: 0.001, falloff: 1.3 },
  taa: { feedback: [0.88, 0.97] as [number, number] },
  bloom: { threshold: 2, softThreshold: 0.5, intensity: 0.2, iterations: 4, radius: 0.6 },
  ground: { bakedShadows: true, reflection: false, physicalReflections: false },
  diamond: { environmentIntensity: 1.3, dispersion: 0.01, reflectivity: 0.5, rayBounces: 5, referenceIOR: 2.6, physicalIOR: 2.417 },
  disabledInReference: ["SSGI","DepthOfField","SSContactShadows","SSBevel","ReliefParallax","VelocityBuffer"] as const,
} as const;

export type AurumHdriResource = {
  id:string;
  name:string;
  url:string;
  sourceUrl:string;
  purpose:"soft-product"|"specular-product"|"neutral-product";
  license:"CC0";
};

export const AURUM_HDRI_LIBRARY:AurumHdriResource[]=[  {id:"ijewelMetal003",name:"iJewel Metal 003",url:"https://playground.ijewel3d.com/assetspro/hdrmaps/metal/env-metal-003.hdr",sourceUrl:"https://playground.ijewel3d.com/assetspro/hdrmaps/metal/env-metal-003.hdr",purpose:"specular-product",license:"CC0"},
  {id:"ijewelGem003",name:"iJewel Gem 003",url:"https://playground.ijewel3d.com/assetspro/hdrmaps/gem/env-gem-003.hdr",sourceUrl:"https://playground.ijewel3d.com/assetspro/hdrmaps/gem/env-gem-003.hdr",purpose:"specular-product",license:"CC0"},

  {id:"storyStudio02",name:"Story Studio 02",url:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/story_studio_02_1k.hdr",sourceUrl:"https://polyhaven.com/a/story_studio_02",purpose:"soft-product",license:"CC0"},
  {id:"storyStudio04",name:"Story Studio 04",url:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/story_studio_04_1k.hdr",sourceUrl:"https://polyhaven.com/a/story_studio_04",purpose:"soft-product",license:"CC0"},
  {id:"storyStudio05",name:"Story Studio 05",url:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/story_studio_05_1k.hdr",sourceUrl:"https://polyhaven.com/a/story_studio_05",purpose:"specular-product",license:"CC0"},
  {id:"monochromeStudio02",name:"Monochrome Studio 02",url:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/monochrome_studio_02_1k.hdr",sourceUrl:"https://polyhaven.com/a/monochrome_studio_02",purpose:"specular-product",license:"CC0"},
  {id:"whiteStudio06",name:"White Studio 06",url:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/white_studio_06_1k.hdr",sourceUrl:"https://polyhaven.com/a/white_studio_06",purpose:"neutral-product",license:"CC0"},
];

/** Escena maestra para comparar materiales bajo condiciones constantes. No cambia el visor público. */
/** Original AURUM premium baseline. The exact VJSON comparison is a separate scene profile. */
export const AURUM_IJEWEL_REFERENCE_SCENE: AurumScenePreset = AURUM_SCENE_PRESETS["ijewelReference"]!;

export const AURUM_MATERIAL_CALIBRATION_SCENE: AurumScenePreset = {
  id:"material-calibration",
  background:0xe7e7e4,
  ground:0xf1f0ec,
  groundRoughness:.68,
  groundMetalness:.01,
  groundVisible:true,
  shadowIntensity:.22,
  shadowSoftness:.985,
};

export const getAurumScenePreset=(id:string):AurumScenePreset=>{
  const preset=AURUM_SCENE_PRESETS[id]??AURUM_SCENE_PRESETS["claro"]!;
  const reference=(AURUM_IJEWEL_SCENE_REFERENCES as Record<string,any>)[id];
  if(!reference) return preset;
  return {...preset,...reference,shadowProfile:reference.shadowProfile==="B"?AURUM_IJEWEL_BAKED_SHADOW_PROFILES.B:AURUM_IJEWEL_BAKED_SHADOW_PROFILES.A};
};

export type AurumRenderQuality={pixelRatio:number;shadows:boolean;shadowMapSize:number;transmissionScale:number};
export type AurumRenderQualityId="low"|"high"|"ultra";
export const AURUM_RENDER_QUALITY:Record<AurumRenderQualityId,AurumRenderQuality>={
  // Transmission is one of the most expensive paths for jewelry glass/gems.
  // Profiling showed the same ~1.1M scene triangles at 0.82 transmission scale
  // running around 11 FPS, while 0.40 reached around 22 FPS. Keep Low at the
  // existing fast path and use a measured middle ground for production tiers.
  low:{pixelRatio:1.75,shadows:true,shadowMapSize:512,transmissionScale:.40},
  // Interactive production preview: preserve facet readability while avoiding
  // an unnecessary full-screen transmission buffer at high DPR.
  high:{pixelRatio:1.75,shadows:true,shadowMapSize:768,transmissionScale:.42},
  ultra:{pixelRatio:1.75,shadows:true,shadowMapSize:1536,transmissionScale:.62},
};
export const getAurumRenderQuality=(quality:AurumRenderQualityId="high")=>AURUM_RENDER_QUALITY[quality];

export type AurumHdriGroundConfig={enabled:boolean;worldRadius:number;tripodHeight:number;originX:number;originY:number;originZ:number;opacity:number};
export const AURUM_HDRI_GROUND_DEFAULT:AurumHdriGroundConfig={enabled:false,worldRadius:40,tripodHeight:1.2,originX:0,originY:0,originZ:0,opacity:1};