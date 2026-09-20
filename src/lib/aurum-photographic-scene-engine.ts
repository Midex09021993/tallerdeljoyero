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
  lighting:"studioSoft"|"studioHard"|"jewelry"|"luxury"|"productSoft"|"ijewelReference";
  post:{
    ssao:boolean; ssaoIntensity:number; ssaoFalloff?:number;
    bloom:boolean; bloomIntensity:number; bloomThreshold:number;
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
  // Exact iJewel/WebGi environment references found in the supplied VJSON.
  ijewelMetal:"https://playground.ijewel3d.com/assetspro/hdrmaps/metal/env-metal-003.hdr",
  ijewelGem:"https://playground.ijewel3d.com/assetspro/hdrmaps/gem/env-gem-003.hdr",
};
export const getAurumHdriUrl=(key:string)=>AURUM_HDRI_URLS[key]??AURUM_HDRI_URLS["jewelry"]!;

export const AURUM_GEM_HDRI_URLS:Record<string,string>={
  gemDiamond:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/story_studio_05_2k.hdr",
  gemWhite:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/white_studio_06_2k.hdr",
  gemNeutral:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/monochrome_studio_02_2k.hdr",
  gemColor:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/story_studio_02_2k.hdr",
  gemLuxury:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/studio_small_03_2k.hdr",
  // Exact iJewel/WebGi gem environment reference.
  ijewelGem:"https://playground.ijewel3d.com/assetspro/hdrmaps/gem/env-gem-003.hdr",
};
export const getAurumGemHdriUrl=(key:string)=>AURUM_GEM_HDRI_URLS[key]??AURUM_GEM_HDRI_URLS["gemDiamond"]!;

const post=(ssao:boolean,ssaoIntensity:number,lutIntensity:number,extra:any={})=>({ssao,ssaoIntensity,bloom:false,bloomIntensity:.012,bloomThreshold:1.8,lut:true,lutIntensity,taa:true,dof:false,dofAperture:.0005,dofMaxBlur:.004,vignette:true,vignetteDarkness:.035,...extra});

export const AURUM_PHOTOGRAPHIC_PROFILES:Record<string,AurumPhotographicProfile>={
  oscuro:{environmentKey:"studioHard",gemEnvironmentKey:"gemNeutral",environmentIntensity:.50,environmentRotation:.16,gemEnvironmentRotation:.34,gemEnvironmentIntensity:.86,metalEnvironmentScale:.78,highlightProtection:.91,exposure:.58,lighting:"studioHard",post:post(true,.10,.08,{vignetteDarkness:.025})},
  claro:{environmentKey:"jewelry",gemEnvironmentKey:"gemWhite",environmentIntensity:.44,environmentRotation:.24,gemEnvironmentRotation:-.16,gemEnvironmentIntensity:.90,metalEnvironmentScale:.82,highlightProtection:.93,exposure:.66,lighting:"jewelry",post:post(true,.065,.055,{vignetteDarkness:.02})},
  luxury:{environmentKey:"luxury",gemEnvironmentKey:"gemNeutral",environmentIntensity:.42,environmentRotation:.42,gemEnvironmentIntensity:.86,gemEnvironmentRotation:.68,metalEnvironmentScale:.84,highlightProtection:.90,exposure:.54,lighting:"luxury",post:post(true,.085,.055,{vignetteDarkness:.04})},
  marmol:{environmentKey:"studioSoft",gemEnvironmentKey:"gemWhite",environmentIntensity:.52,environmentRotation:.16,gemEnvironmentRotation:.10,gemEnvironmentIntensity:.96,metalEnvironmentScale:.88,highlightProtection:.95,exposure:.61,lighting:"studioSoft",post:post(true,.085,.045,{vignetteDarkness:.025})},
  transparente:{environmentKey:"studioSoft",gemEnvironmentKey:"gemNeutral",environmentIntensity:.50,environmentRotation:.16,gemEnvironmentRotation:.34,gemEnvironmentIntensity:1.00,metalEnvironmentScale:.88,highlightProtection:.95,exposure:.61,lighting:"studioSoft",post:post(false,.05,.04,{vignette:false})},
  producto:{environmentKey:"studioSoft",gemEnvironmentKey:"gemWhite",environmentIntensity:.40,environmentRotation:.54,gemEnvironmentRotation:-.18,gemEnvironmentIntensity:1.00,metalEnvironmentScale:1.08,highlightProtection:.94,exposure:.70,lighting:"productSoft",post:post(true,.035,.025,{vignette:false})},
  galeria:{environmentKey:"studioHard",gemEnvironmentKey:"gemNeutral",environmentIntensity:.52,environmentRotation:.62,gemEnvironmentRotation:.64,gemEnvironmentIntensity:.98,metalEnvironmentScale:.88,highlightProtection:.92,exposure:.63,lighting:"studioHard",post:post(true,.10,.07,{vignetteDarkness:.03})},
  oroCalido:{environmentKey:"warm",gemEnvironmentKey:"gemDiamond",environmentIntensity:.48,environmentRotation:.42,gemEnvironmentRotation:.46,gemEnvironmentIntensity:.96,metalEnvironmentScale:.82,highlightProtection:.90,exposure:.60,lighting:"luxury",post:post(true,.08,.09,{vignetteDarkness:.045})},
  gemaClara:{environmentKey:"studioSoft",gemEnvironmentKey:"gemWhite",environmentIntensity:.40,environmentRotation:.08,gemEnvironmentRotation:-.08,gemEnvironmentIntensity:1.08,metalEnvironmentScale:.88,highlightProtection:.93,exposure:.64,lighting:"jewelry",post:post(true,.04,.025,{vignette:false})},
  // VJSON reference: scene environment 1.0, fixed direction, white background.
  // The original UUID environment is not embedded as a local HDR asset, so Aurum
  // uses its closest local white-studio HDR while preserving the measured control values.
  ijewelReference:{environmentKey:"ijewelMetal",gemEnvironmentKey:"ijewelGem",environmentIntensity:AURUM_IJEWEL_REFERENCE.scene.environmentIntensity,environmentRotation:0,gemEnvironmentRotation:0,gemEnvironmentIntensity:1,metalEnvironmentScale:1,highlightProtection:1,exposure:AURUM_IJEWEL_REFERENCE.toneMapping.exposure,lighting:"ijewelReference",post:{ssao:true,ssaoIntensity:AURUM_IJEWEL_REFERENCE.ssao.intensity,bloom:true,bloomIntensity:AURUM_IJEWEL_REFERENCE.bloom.intensity,bloomThreshold:AURUM_IJEWEL_REFERENCE.bloom.threshold,lut:false,lutIntensity:0,gradeEnabled:true,gradeContrast:AURUM_IJEWEL_REFERENCE.toneMapping.contrast,gradeSaturation:AURUM_IJEWEL_REFERENCE.toneMapping.saturation,ssaoFalloff:AURUM_IJEWEL_REFERENCE.ssao.falloff,bloomRadius:AURUM_IJEWEL_REFERENCE.bloom.radius,taa:true,progressiveFrameCount:AURUM_IJEWEL_REFERENCE.progressive.maxFrameCount,ssr:true,ssrIntensity:AURUM_IJEWEL_REFERENCE.ssr.intensity,ssrMaxDistance:AURUM_IJEWEL_REFERENCE.ssr.objectRadius,ssrThickness:.018,dof:false,vignette:false}},
};

export const getAurumPhotographicProfile=(id:string):AurumPhotographicProfile=>AURUM_PHOTOGRAPHIC_PROFILES[id]??AURUM_PHOTOGRAPHIC_PROFILES["producto"]!;
