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
  /** Independent gemstone HDRI controls, mirroring iJewel's Gem Environment. */
  gemEnvironmentRotation: number;
  gemEnvironmentIntensity: number;
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
    taa?: boolean;
    dof?: boolean;
    dofAperture?: number;
    dofMaxBlur?: number;
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
    environmentKey:"studioHard", gemEnvironmentKey:"monochrome",
    environmentIntensity:.50, environmentRotation:.16, gemEnvironmentRotation:.34, gemEnvironmentIntensity:.86, metalEnvironmentScale:.78, highlightProtection:.91, exposure:.58,
    lighting:"studioHard",
    post:{ssao:true,ssaoIntensity:.10,bloom:false,bloomIntensity:.035,bloomThreshold:1.45,lut:true,lutIntensity:.08,taa:true,dof:false,dofAperture:.0005,dofMaxBlur:.004}
  },
  claro: {
    environmentKey:"jewelry", gemEnvironmentKey:"white",
    environmentIntensity:.48, environmentRotation:.24, gemEnvironmentRotation:-.16, gemEnvironmentIntensity:.82, metalEnvironmentScale:.68, highlightProtection:.89, exposure:.68,
    lighting:"jewelry",
    post:{ssao:true,ssaoIntensity:.08,bloom:false,bloomIntensity:.025,bloomThreshold:1.5,lut:true,lutIntensity:.07,taa:true,dof:false,dofAperture:.0005,dofMaxBlur:.004}
  },
  luxury: {
    environmentKey:"luxury", gemEnvironmentKey:"monochrome",
    environmentIntensity:.46, environmentRotation:.42, gemEnvironmentRotation:.68, gemEnvironmentIntensity:.88, metalEnvironmentScale:.72, highlightProtection:.84, exposure:.56,
    lighting:"luxury",
    post:{ssao:true,ssaoIntensity:.12,bloom:true,bloomIntensity:.045,bloomThreshold:1.55,lut:true,lutIntensity:.10,taa:true,dof:true,dofAperture:.00055,dofMaxBlur:.005}
  },
  marmol: {
    environmentKey:"studioSoft", gemEnvironmentKey:"white",
    environmentIntensity:.56, environmentRotation:.16, gemEnvironmentRotation:.10, gemEnvironmentIntensity:.95, metalEnvironmentScale:.90, highlightProtection:.94, exposure:.64,
    lighting:"studioSoft",
    post:{ssao:true,ssaoIntensity:.10,bloom:false,bloomIntensity:.025,bloomThreshold:1.5,lut:true,lutIntensity:.06,taa:true,dof:false,dofAperture:.0005,dofMaxBlur:.004}
  },
  transparente: {
    environmentKey:"studioSoft", gemEnvironmentKey:"monochrome",
    environmentIntensity:.52, environmentRotation:.16, gemEnvironmentRotation:.34, gemEnvironmentIntensity:1.00, metalEnvironmentScale:.90, highlightProtection:.94, exposure:.64,
    lighting:"studioSoft",
    post:{ssao:false,ssaoIntensity:.06,bloom:false,bloomIntensity:.02,bloomThreshold:1.55,lut:true,lutIntensity:.05,taa:true,dof:false,dofAperture:.0005,dofMaxBlur:.004}
  },
  producto: {
    environmentKey:"studioSoft", gemEnvironmentKey:"monochrome",
    environmentIntensity:.47, environmentRotation:.34, gemEnvironmentRotation:.28, gemEnvironmentIntensity:.84, metalEnvironmentScale:.70, highlightProtection:.90, exposure:.66,
    lighting:"studioSoft",
    post:{ssao:true,ssaoIntensity:.07,bloom:false,bloomIntensity:.020,bloomThreshold:1.60,lut:true,lutIntensity:.055,taa:true,dof:false,dofAperture:.0005,dofMaxBlur:.004}
  },
  galeria: {
    environmentKey:"studioHard", gemEnvironmentKey:"monochrome",
    environmentIntensity:.54, environmentRotation:.62, gemEnvironmentRotation:.64, gemEnvironmentIntensity:1.02, metalEnvironmentScale:.88, highlightProtection:.92, exposure:.66,
    lighting:"studioHard",
    post:{ssao:true,ssaoIntensity:.11,bloom:false,bloomIntensity:.03,bloomThreshold:1.5,lut:true,lutIntensity:.08,taa:true,dof:false,dofAperture:.0005,dofMaxBlur:.004}
  },
  oroCalido: {
    environmentKey:"warm", gemEnvironmentKey:"jewelry",
    environmentIntensity:.52, environmentRotation:.42, gemEnvironmentRotation:.46, gemEnvironmentIntensity:.94, metalEnvironmentScale:.82, highlightProtection:.88, exposure:.64,
    lighting:"luxury",
    post:{ssao:true,ssaoIntensity:.09,bloom:false,bloomIntensity:.03,bloomThreshold:1.55,lut:true,lutIntensity:.11,taa:true,dof:false,dofAperture:.0005,dofMaxBlur:.004}
  },
  gemaClara: {
    environmentKey:"jewelry", gemEnvironmentKey:"white",
    environmentIntensity:.50, environmentRotation:.08, gemEnvironmentRotation:-.08, gemEnvironmentIntensity:.84, metalEnvironmentScale:.70, highlightProtection:.86, exposure:.68,
    lighting:"jewelry",
    post:{ssao:true,ssaoIntensity:.065,bloom:false,bloomIntensity:.018,bloomThreshold:1.70,lut:true,lutIntensity:.045,taa:true,dof:false,dofAperture:.00055,dofMaxBlur:.005}
  }
};

export const getAurumPhotographicProfile=(id:string):AurumPhotographicProfile =>
  AURUM_PHOTOGRAPHIC_PROFILES[id] ?? AURUM_PHOTOGRAPHIC_PROFILES.producto;
