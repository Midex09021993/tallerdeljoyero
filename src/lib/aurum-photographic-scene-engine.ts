import { AURUM_IJEWEL_REFERENCE } from "./aurum/ijewel-reference";

/**
 * AURUM PHOTOGRAPHIC SCENE ENGINE v1.2
 *
 * The photographic profile controls environment, gem environment, reflection
 * energy and post processing independently. HDR environments use 2K maps for
 * higher-frequency jewelry reflections while keeping the same lighting design.
 */
export type AurumPhotographicProfile = {
  environmentKey:string;
  gemEnvironmentKey:string;
  environmentIntensity:number;
  environmentRotation:number;
  gemEnvironmentRotation:number;
  gemEnvironmentIntensity:number;
  metalEnvironmentScale:number;
  highlightProtection:number;
  exposure:number;
  lighting:"studioSoft"|"studioHard"|"jewelry"|"luxury"|"productSoft"|"ijewelReference"|"ijewelEnvironmentReference";
  post:{
    ssao:boolean; ssaoIntensity:number; ssaoFalloff?:number;
    bloom:boolean; bloomIntensity:number; bloomThreshold:number; bloomRadius?:number;
    lut:boolean; lutIntensity:number; gradeEnabled?:boolean; gradeContrast?:number; gradeSaturation?:number;
    taa?:boolean; progressiveFrameCount?:number; ssr?:boolean; ssrIntensity?:number; ssrMaxDistance?:number; ssrThickness?:number; dof?:boolean; dofAperture?:number; dofMaxBlur?:number;
    vignette?:boolean; vignetteDarkness?:number;
  };
};

export const AURUM_HDRI_URLS:Record<string,string>={
  studioSoft:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/story_studio_04_2k.hdr",
  studioHard:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/studio_small_09_2k.hdr",
  jewelry:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/story_studio_01_2k.hdr",
  luxury:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/studio_small_03_2k.hdr",
  monochrome:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/monochrome_studio_02_2k.hdr",
  warm:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/story_studio_02_2k.hdr",
  white:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/white_studio_06_2k.hdr",
  // External environment maps preserved from the supplied calibration files.
  ijewelMetal:"https://playground.ijewel3d.com/assetspro/hdrmaps/metal/env-metal-010.exr",
  ijewelMetalVjson:"https://playground.ijewel3d.com/assetspro/hdrmaps/metal/env-metal-002.exr",
  ijewelGem:"https://playground.ijewel3d.com/assetspro/hdrmaps/gem/env-gem-010.exr",
};
export const getAurumHdriUrl=(key:string)=>AURUM_HDRI_URLS[key]??AURUM_HDRI_URLS["jewelry"]!;

// One controlled gem environment: the EXR supplied for AURUM diamond calibration.
// All legacy gem-environment keys remain aliases to this single asset so existing
// scene profiles cannot silently load a different gem HDRI.
export const AURUM_GEM_HDRI_ASSET_URL = "/env_gem_002_30251392af.exr";
export const AURUM_GEM_HDRI_APPROVED_URL = "/env_gem_001_b9c4533e70.exr";
export const AURUM_GEM_HDRI_APPROVED_2_URL = "/env_gem_004_13d65af3ba.exr";
export const AURUM_GEM_HDRI_LIBRARY_URLS = {
  gem001: "/env_gem_001_b9c4533e70.exr",
  gem002: "/env_gem_002_30251392af.exr",
  gem004: "/env_gem_004_13d65af3ba.exr",
  gem005: "/env_gem_005_314acddf6c.exr",
  gem006: "/env_gem_006_c9c284167f.exr",
  gem007A: "/env_gem_007_a_edf3febd3c.exr",
  gem007B: "/env_gem_007_b_ee3338abf6.exr",
  gem007C: "/env_gem_007_c_c264662992.exr",
} as const;
export const AURUM_GEM_HDRI_URLS:Record<string,string>={
  // One library source of truth: changing the central EXR updates every
  // legacy tier key (central, medium, small and micro) together.
  gemDiamond:AURUM_GEM_HDRI_ASSET_URL,
  gemWhite:AURUM_GEM_HDRI_ASSET_URL,
  gemNeutral:AURUM_GEM_HDRI_ASSET_URL,
  gemColor:AURUM_GEM_HDRI_ASSET_URL,
  gemLuxury:AURUM_GEM_HDRI_ASSET_URL,
  ijewelGem:AURUM_GEM_HDRI_ASSET_URL,
  gemDiamondWhite1:AURUM_GEM_HDRI_ASSET_URL,
  gemDiamondWhite2:AURUM_GEM_HDRI_ASSET_URL,
  gemDiamondWhite3:AURUM_GEM_HDRI_ASSET_URL,
  gemDiamondWhite4:AURUM_GEM_HDRI_ASSET_URL,
  gemDiamondWhite5:AURUM_GEM_HDRI_ASSET_URL,
  gemDiamondWhite6:AURUM_GEM_HDRI_ASSET_URL,
  gemDiamondWhite7:AURUM_GEM_HDRI_ASSET_URL,
  ...AURUM_GEM_HDRI_LIBRARY_URLS,
};
export const getAurumGemHdriUrl=(key:string)=>AURUM_GEM_HDRI_URLS[key]??AURUM_GEM_HDRI_ASSET_URL;

/** Legacy paired preset retained only for existing saved configurations. Gem illumination uses the supplied
 * optical-lab EXR; only the metal environment varies independently. */
export const AURUM_LEGACY_HDR_PAIR_PRESETS:Record<string,{id:string;name:string;url:string;rotation:number;intensity:number;previewClass:string;metalKey?:string;metalRotation?:number;metalIntensity?:number}>={
  predeterminado:{
    id:"predeterminado",
    name:"Ambiente Premium",
    url:AURUM_GEM_HDRI_ASSET_URL,
    rotation:0,
    intensity:1,
    previewClass:"bg-[radial-gradient(ellipse_at_50%_22%,#fffdf4_0%,#e9dfc5_22%,#9da3a6_48%,#4c5359_72%,#171b20_100%)]",
    metalKey:"ijewelMetal",
    metalRotation:0,
    metalIntensity:1,
  },
};

// Independent gem EXR choices. Existing material profile IDs remain compatible.
export const AURUM_GEM_ENVIRONMENT_PRESETS:Record<string,{id:string;name:string;url:string;rotation:number;intensity:number;previewClass:string}>={
  gemUserHdr:{id:"gemUserHdr",name:"02 · HDR central",url:AURUM_GEM_HDRI_ASSET_URL,rotation:0,intensity:1,previewClass:"bg-[radial-gradient(ellipse_at_50%_22%,#fffdf4_0%,#e9dfc5_22%,#9da3a6_48%,#4c5359_72%,#171b20_100%)]"},
  gemLibrary001:{id:"gemLibrary001",name:"01 · HDR gemas",url:"/env_gem_001_b9c4533e70.exr",rotation:0,intensity:1,previewClass:"bg-[radial-gradient(ellipse_at_50%_22%,#fffdf4_0%,#e9dfc5_22%,#9da3a6_48%,#4c5359_72%,#171b20_100%)]"},
  gemLibrary004:{id:"gemLibrary004",name:"04 · HDR gemas",url:"/env_gem_004_13d65af3ba.exr",rotation:0,intensity:1,previewClass:"bg-[radial-gradient(ellipse_at_50%_22%,#fffdf4_0%,#e9dfc5_22%,#9da3a6_48%,#4c5359_72%,#171b20_100%)]"},
  gemLibrary005:{id:"gemLibrary005",name:"05 · HDR gemas",url:"/env_gem_005_314acddf6c.exr",rotation:0,intensity:1,previewClass:"bg-[radial-gradient(ellipse_at_50%_22%,#fffdf4_0%,#e9dfc5_22%,#9da3a6_48%,#4c5359_72%,#171b20_100%)]"},
  gemLibrary006:{id:"gemLibrary006",name:"06 · HDR gemas",url:"/env_gem_006_c9c284167f.exr",rotation:0,intensity:1,previewClass:"bg-[radial-gradient(ellipse_at_50%_22%,#fffdf4_0%,#e9dfc5_22%,#9da3a6_48%,#4c5359_72%,#171b20_100%)]"},
  gemLibrary007A:{id:"gemLibrary007A",name:"07A · HDR gemas",url:"/env_gem_007_a_edf3febd3c.exr",rotation:0,intensity:1,previewClass:"bg-[radial-gradient(ellipse_at_50%_22%,#fffdf4_0%,#e9dfc5_22%,#9da3a6_48%,#4c5359_72%,#171b20_100%)]"},
  gemLibrary007B:{id:"gemLibrary007B",name:"07B · HDR gemas",url:"/env_gem_007_b_ee3338abf6.exr",rotation:0,intensity:1,previewClass:"bg-[radial-gradient(ellipse_at_50%_22%,#fffdf4_0%,#e9dfc5_22%,#9da3a6_48%,#4c5359_72%,#171b20_100%)]"},
  gemLibrary007C:{id:"gemLibrary007C",name:"07C · HDR gemas",url:"/env_gem_007_c_c264662992.exr",rotation:0,intensity:1,previewClass:"bg-[radial-gradient(ellipse_at_50%_22%,#fffdf4_0%,#e9dfc5_22%,#9da3a6_48%,#4c5359_72%,#171b20_100%)]"},
  // Legacy saved IDs continue to resolve to the established central environment.
  gemDiamondWhite1:{id:"gemDiamondWhite1",name:"Diamante blanco 1 · perfil guardado",url:AURUM_GEM_HDRI_ASSET_URL,rotation:0,intensity:1,previewClass:"bg-[radial-gradient(ellipse_at_50%_22%,#fffdf4_0%,#e9dfc5_22%,#9da3a6_48%,#4c5359_72%,#171b20_100%)]"},
  gemDiamondWhite2:{id:"gemDiamondWhite2",name:"Diamante blanco 2 · perfil guardado",url:AURUM_GEM_HDRI_ASSET_URL,rotation:0,intensity:1,previewClass:"bg-[radial-gradient(ellipse_at_50%_22%,#fffdf4_0%,#e9dfc5_22%,#9da3a6_48%,#4c5359_72%,#171b20_100%)]"},
  gemDiamondWhite3:{id:"gemDiamondWhite3",name:"Diamante blanco 3 · perfil guardado",url:AURUM_GEM_HDRI_ASSET_URL,rotation:0,intensity:1,previewClass:"bg-[radial-gradient(ellipse_at_50%_22%,#fffdf4_0%,#e9dfc5_22%,#9da3a6_48%,#4c5359_72%,#171b20_100%)]"},
  gemDiamondWhite4:{id:"gemDiamondWhite4",name:"Diamante blanco 4 · perfil guardado",url:AURUM_GEM_HDRI_ASSET_URL,rotation:0,intensity:1,previewClass:"bg-[radial-gradient(ellipse_at_50%_22%,#fffdf4_0%,#e9dfc5_22%,#9da3a6_48%,#4c5359_72%,#171b20_100%)]"},
  gemDiamondWhite5:{id:"gemDiamondWhite5",name:"Diamante blanco 5 · perfil guardado",url:AURUM_GEM_HDRI_ASSET_URL,rotation:0,intensity:1,previewClass:"bg-[radial-gradient(ellipse_at_50%_22%,#fffdf4_0%,#e9dfc5_22%,#9da3a6_48%,#4c5359_72%,#171b20_100%)]"},
  gemDiamondWhite6:{id:"gemDiamondWhite6",name:"Diamante blanco 6 · perfil guardado",url:AURUM_GEM_HDRI_ASSET_URL,rotation:0,intensity:1,previewClass:"bg-[radial-gradient(ellipse_at_50%_22%,#fffdf4_0%,#e9dfc5_22%,#9da3a6_48%,#4c5359_72%,#171b20_100%)]"},
  gemDiamondWhite7:{id:"gemDiamondWhite7",name:"Diamante blanco 7 · perfil guardado",url:AURUM_GEM_HDRI_ASSET_URL,rotation:0,intensity:1,previewClass:"bg-[radial-gradient(ellipse_at_50%_22%,#fffdf4_0%,#e9dfc5_22%,#9da3a6_48%,#4c5359_72%,#171b20_100%)]"},
};


const post=(ssao:boolean,ssaoIntensity:number,lutIntensity:number,extra:any={})=>({ssao,ssaoIntensity,bloom:false,bloomIntensity:.012,bloomThreshold:1.8,lut:true,lutIntensity,taa:true,dof:false,dofAperture:.0005,dofMaxBlur:.004,vignette:true,vignetteDarkness:.035,...extra});

// Post processing built from the supplied external VJSON calibration values.
const ijewelReferencePost:AurumPhotographicProfile["post"] = {
  ssao:AURUM_IJEWEL_REFERENCE.ssao.enabled,
  ssaoIntensity:AURUM_IJEWEL_REFERENCE.ssao.intensity,
  ssaoFalloff:AURUM_IJEWEL_REFERENCE.ssao.falloff,
  bloom:AURUM_IJEWEL_REFERENCE.bloom.enabled,
  bloomIntensity:AURUM_IJEWEL_REFERENCE.bloom.intensity,
  bloomThreshold:AURUM_IJEWEL_REFERENCE.bloom.threshold,
  bloomRadius:AURUM_IJEWEL_REFERENCE.bloom.radius,
  lut:false,
  lutIntensity:0,
  gradeEnabled:true,
  gradeContrast:AURUM_IJEWEL_REFERENCE.toneMapping.contrast,
  gradeSaturation:AURUM_IJEWEL_REFERENCE.toneMapping.saturation,
  taa:AURUM_IJEWEL_REFERENCE.taa.enabled,
  progressiveFrameCount:AURUM_IJEWEL_REFERENCE.progressive.maxFrameCount,
  ssr:AURUM_IJEWEL_REFERENCE.ssr.enabled,
  ssrIntensity:AURUM_IJEWEL_REFERENCE.ssr.intensity,
  ssrMaxDistance:AURUM_IJEWEL_REFERENCE.ssr.objectRadius,
  ssrThickness:.018,
  dof:false,
  vignette:false
};

export const AURUM_PHOTOGRAPHIC_PROFILES:Record<string,AurumPhotographicProfile>={
  oscuro:{environmentKey:"studioHard",gemEnvironmentKey:"gemNeutral",environmentIntensity:.50,environmentRotation:.16,gemEnvironmentRotation:.34,gemEnvironmentIntensity:.86,metalEnvironmentScale:.78,highlightProtection:.91,exposure:.58,lighting:"studioHard",post:post(true,.10,.08,{vignetteDarkness:.025})},
  claro:{environmentKey:"jewelry",gemEnvironmentKey:"gemWhite",environmentIntensity:.58,environmentRotation:.24,gemEnvironmentRotation:-.16,gemEnvironmentIntensity:1.02,metalEnvironmentScale:.92,highlightProtection:.93,exposure:.80,lighting:"jewelry",post:post(true,.065,.055,{vignetteDarkness:.02})},
  luxury:{environmentKey:"luxury",gemEnvironmentKey:"gemNeutral",environmentIntensity:.42,environmentRotation:.42,gemEnvironmentIntensity:.86,gemEnvironmentRotation:.68,metalEnvironmentScale:.84,highlightProtection:.90,exposure:.54,lighting:"luxury",post:post(true,.085,.055,{vignetteDarkness:.04})},
  marmol:{environmentKey:"studioSoft",gemEnvironmentKey:"gemWhite",environmentIntensity:.52,environmentRotation:.16,gemEnvironmentRotation:.10,gemEnvironmentIntensity:.96,metalEnvironmentScale:.88,highlightProtection:.95,exposure:.61,lighting:"studioSoft",post:post(true,.085,.045,{vignetteDarkness:.025})},
  transparente:{environmentKey:"studioSoft",gemEnvironmentKey:"gemNeutral",environmentIntensity:.50,environmentRotation:.16,gemEnvironmentRotation:.34,gemEnvironmentIntensity:1.00,metalEnvironmentScale:.88,highlightProtection:.95,exposure:.61,lighting:"studioSoft",post:post(false,.05,.04,{vignette:false})},
  producto:{environmentKey:"studioSoft",gemEnvironmentKey:"gemWhite",environmentIntensity:.58,environmentRotation:.54,gemEnvironmentRotation:-.18,gemEnvironmentIntensity:1.12,metalEnvironmentScale:1.12,highlightProtection:.94,exposure:.82,lighting:"productSoft",post:post(true,.035,.025,{vignette:false})},
  galeria:{environmentKey:"studioHard",gemEnvironmentKey:"gemNeutral",environmentIntensity:.52,environmentRotation:.62,gemEnvironmentRotation:.64,gemEnvironmentIntensity:.98,metalEnvironmentScale:.88,highlightProtection:.92,exposure:.63,lighting:"studioHard",post:post(true,.10,.07,{vignetteDarkness:.03})},
  oroCalido:{environmentKey:"warm",gemEnvironmentKey:"gemDiamond",environmentIntensity:.48,environmentRotation:.42,gemEnvironmentRotation:.46,gemEnvironmentIntensity:.96,metalEnvironmentScale:.82,highlightProtection:.90,exposure:.60,lighting:"luxury",post:post(true,.08,.09,{vignetteDarkness:.045})},
  gemaClara:{environmentKey:"studioSoft",gemEnvironmentKey:"gemWhite",environmentIntensity:.52,environmentRotation:.08,gemEnvironmentRotation:-.08,gemEnvironmentIntensity:1.16,metalEnvironmentScale:.94,highlightProtection:.93,exposure:.76,lighting:"jewelry",post:post(true,.04,.025,{vignette:false})},

  // Existing AURUM premium reference: preserve its original environment and auxiliary rig.
  ijewelReference:{environmentKey:"ijewelMetal",gemEnvironmentKey:"ijewelGem",environmentIntensity:1,environmentRotation:0,gemEnvironmentRotation:0,gemEnvironmentIntensity:1,metalEnvironmentScale:1,highlightProtection:1,exposure:AURUM_IJEWEL_REFERENCE.toneMapping.exposure,lighting:"ijewelReference",post:ijewelReferencePost},
  // Separate experimental profile built from the supplied external VJSON calibration values.
  // This does not overwrite the existing AURUM premium scene.
  ijewelEnvironmentReference:{environmentKey:"ijewelMetalVjson",gemEnvironmentKey:"ijewelGem",environmentIntensity:0.6,environmentRotation:0,gemEnvironmentRotation:0,gemEnvironmentIntensity:1,metalEnvironmentScale:1,highlightProtection:1,exposure:AURUM_IJEWEL_REFERENCE.toneMapping.exposure,lighting:"ijewelEnvironmentReference",post:ijewelReferencePost},
};

export const getAurumPhotographicProfile=(id:string):AurumPhotographicProfile=>AURUM_PHOTOGRAPHIC_PROFILES[id]??AURUM_PHOTOGRAPHIC_PROFILES["producto"]!;
