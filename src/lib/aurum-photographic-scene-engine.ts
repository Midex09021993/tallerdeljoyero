/**
 * AURUM PHOTOGRAPHIC SCENE ENGINE v1.0
 *
 * Separates the photographic response of a jewelry scene from its visual
 * background. The structure follows the documented iJewel workflow:
 * environment, gem environment, camera/lighting intent and post-processing
 * are treated as scene settings rather than as one global lighting switch.
 *
 * HDR assets remain CC0 Poly Haven resources already used by Aurum.
 */

export type AurumPhotographicProfile = {
  environmentKey: string;
  gemEnvironmentKey: string;
  environmentIntensity: number;
  environmentRotation: number;
  metalEnvironmentScale: number;
  highlightProtection: number;
  exposure: number;
  lighting: "studioSoft"|"studioHard"|"jewelry"|"luxury";
  post: {
    ssao: boolean;
    ssaoIntensity: number;
    bloom: boolean;
    bloomIntensity: number;
    bloomThreshold: number;
    lut: boolean;
    lutIntensity: number;
  };
};

export const AURUM_HDRI_URLS: Record<string,string> = {
  studioSoft:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/story_studio_04_1k.hdr",
  studioHard:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr",
  jewelry:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/story_studio_05_1k.hdr",
  luxury:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_03_1k.hdr",
  monochrome:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/monochrome_studio_02_1k.hdr",
  warm:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/story_studio_02_1k.hdr",
  white:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/white_studio_06_1k.hdr",
};

export const getAurumHdriUrl=(key:string)=>
  AURUM_HDRI_URLS[key] ?? AURUM_HDRI_URLS.jewelry;

export const AURUM_PHOTOGRAPHIC_PROFILES: Record<string, AurumPhotographicProfile> = {
  oscuro: {
    environmentKey:"studioHard", gemEnvironmentKey:"jewelry",
    environmentIntensity:.54, environmentRotation:.16, metalEnvironmentScale:.88, highlightProtection:.94, exposure:.62,
    lighting:"studioHard",
    post:{ssao:true,ssaoIntensity:.10,bloom:false,bloomIntensity:.035,bloomThreshold:1.45,lut:true,lutIntensity:.08}
  },
  claro: {
    environmentKey:"jewelry", gemEnvironmentKey:"jewelry",
    environmentIntensity:.58, environmentRotation:.20, metalEnvironmentScale:.84, highlightProtection:.92, exposure:.76,
    lighting:"jewelry",
    post:{ssao:true,ssaoIntensity:.08,bloom:false,bloomIntensity:.025,bloomThreshold:1.5,lut:true,lutIntensity:.07}
  },
  luxury: {
    environmentKey:"luxury", gemEnvironmentKey:"jewelry",
    environmentIntensity:.50, environmentRotation:.42, metalEnvironmentScale:.86, highlightProtection:.90, exposure:.60,
    lighting:"luxury",
    post:{ssao:true,ssaoIntensity:.12,bloom:true,bloomIntensity:.045,bloomThreshold:1.55,lut:true,lutIntensity:.10}
  },
  marmol: {
    environmentKey:"studioSoft", gemEnvironmentKey:"jewelry",
    environmentIntensity:.56, environmentRotation:.16, metalEnvironmentScale:.90, highlightProtection:.94, exposure:.64,
    lighting:"studioSoft",
    post:{ssao:true,ssaoIntensity:.10,bloom:false,bloomIntensity:.025,bloomThreshold:1.5,lut:true,lutIntensity:.06}
  },
  transparente: {
    environmentKey:"studioSoft", gemEnvironmentKey:"jewelry",
    environmentIntensity:.52, environmentRotation:.16, metalEnvironmentScale:.90, highlightProtection:.94, exposure:.64,
    lighting:"studioSoft",
    post:{ssao:false,ssaoIntensity:.06,bloom:false,bloomIntensity:.02,bloomThreshold:1.55,lut:true,lutIntensity:.05}
  },
  producto: {
    environmentKey:"studioSoft", gemEnvironmentKey:"jewelry",
    environmentIntensity:.56, environmentRotation:.30, metalEnvironmentScale:.86, highlightProtection:.92, exposure:.72,
    lighting:"studioSoft",
    post:{ssao:true,ssaoIntensity:.09,bloom:false,bloomIntensity:.025,bloomThreshold:1.5,lut:true,lutIntensity:.06}
  },
  galeria: {
    environmentKey:"studioHard", gemEnvironmentKey:"jewelry",
    environmentIntensity:.54, environmentRotation:.62, metalEnvironmentScale:.88, highlightProtection:.92, exposure:.66,
    lighting:"studioHard",
    post:{ssao:true,ssaoIntensity:.11,bloom:false,bloomIntensity:.03,bloomThreshold:1.5,lut:true,lutIntensity:.08}
  },
  oroCalido: {
    environmentKey:"warm", gemEnvironmentKey:"jewelry",
    environmentIntensity:.52, environmentRotation:.42, metalEnvironmentScale:.82, highlightProtection:.88, exposure:.64,
    lighting:"luxury",
    post:{ssao:true,ssaoIntensity:.09,bloom:false,bloomIntensity:.03,bloomThreshold:1.55,lut:true,lutIntensity:.11}
  },
  gemaClara: {
    environmentKey:"jewelry", gemEnvironmentKey:"jewelry",
    environmentIntensity:.55, environmentRotation:.08, metalEnvironmentScale:.84, highlightProtection:.90, exposure:.72,
    lighting:"jewelry",
    post:{ssao:true,ssaoIntensity:.07,bloom:true,bloomIntensity:.035,bloomThreshold:1.65,lut:true,lutIntensity:.05}
  }
};

export const getAurumPhotographicProfile=(id:string):AurumPhotographicProfile =>
  AURUM_PHOTOGRAPHIC_PROFILES[id] ?? AURUM_PHOTOGRAPHIC_PROFILES.producto;
