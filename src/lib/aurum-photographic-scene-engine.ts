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
  lighting: "studioSoft"|"studioHard"|"jewelry"|"luxury"|"productSoft";
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

// iJewel treats the gemstone environment as a separate optical lighting source.
// We keep a dedicated catalog instead of reusing the metal HDRI so facets can
// receive clean, high-contrast reflections without forcing the metal exposure up.
export const AURUM_GEM_HDRI_URLS: Record<string,string> = {
  gemDiamond:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/story_studio_05_1k.hdr",
  gemWhite:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/white_studio_06_1k.hdr",
  gemNeutral:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/monochrome_studio_02_1k.hdr",
  gemColor:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/story_studio_02_1k.hdr",
  gemLuxury:"https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_03_1k.hdr",
};

export const getAurumGemHdriUrl=(key:string)=>
  AURUM_GEM_HDRI_URLS[key] ?? AURUM_GEM_HDRI_URLS.gemDiamond;

export const AURUM_PHOTOGRAPHIC_PROFILES: Record<string, AurumPhotographicProfile> = {
  oscuro: {
    environmentKey:"studioHard", gemEnvironmentKey:"gemNeutral",
    environmentIntensity:.50, environmentRotation:.16, gemEnvironmentRotation:.34, gemEnvironmentIntensity:.86, metalEnvironmentScale:.78, highlightProtection:.91, exposure:.58,
    lighting:"studioHard",
    post:{ssao:true,ssaoIntensity:.10,bloom:false,bloomIntensity:.035,bloomThreshold:1.45,lut:true,lutIntensity:.08,taa:true,dof:false,dofAperture:.0005,dofMaxBlur:.004}
  },
  claro: {
    environmentKey:"jewelry", gemEnvironmentKey:"gemWhite",
    environmentIntensity:.48, environmentRotation:.24, gemEnvironmentRotation:-.16, gemEnvironmentIntensity:.82, metalEnvironmentScale:.68, highlightProtection:.89, exposure:.68,
    lighting:"jewelry",
    post:{ssao:true,ssaoIntensity:.08,bloom:false,bloomIntensity:.025,bloomThreshold:1.5,lut:true,lutIntensity:.07,taa:true,dof:false,dofAperture:.0005,dofMaxBlur:.004}
  },
  luxury: {
    environmentKey:"luxury", gemEnvironmentKey:"gemNeutral",
    environmentIntensity:.46, environmentRotation:.42, gemEnvironmentRotation:.68, gemEnvironmentIntensity:.88, metalEnvironmentScale:.72, highlightProtection:.84, exposure:.56,
    lighting:"luxury",
    post:{ssao:true,ssaoIntensity:.10,bloom:false,bloomIntensity:.018,bloomThreshold:1.70,lut:true,lutIntensity:.08,taa:true,dof:false,dofAperture:.00055,dofMaxBlur:.005}
  },
  marmol: {
    environmentKey:"studioSoft", gemEnvironmentKey:"gemWhite",
    environmentIntensity:.56, environmentRotation:.16, gemEnvironmentRotation:.10, gemEnvironmentIntensity:.95, metalEnvironmentScale:.90, highlightProtection:.94, exposure:.64,
    lighting:"studioSoft",
    post:{ssao:true,ssaoIntensity:.10,bloom:false,bloomIntensity:.025,bloomThreshold:1.5,lut:true,lutIntensity:.06,taa:true,dof:false,dofAperture:.0005,dofMaxBlur:.004}
  },
  transparente: {
    environmentKey:"studioSoft", gemEnvironmentKey:"gemNeutral",
    environmentIntensity:.52, environmentRotation:.16, gemEnvironmentRotation:.34, gemEnvironmentIntensity:1.00, metalEnvironmentScale:.90, highlightProtection:.94, exposure:.64,
    lighting:"studioSoft",
    post:{ssao:false,ssaoIntensity:.06,bloom:false,bloomIntensity:.02,bloomThreshold:1.55,lut:true,lutIntensity:.05,taa:true,dof:false,dofAperture:.0005,dofMaxBlur:.004}
  },
  producto: {
    // Product-shot profile: bright white sweep, restrained metal exposure and a
    // dedicated clean gem environment, matching the logic of professional
    // jewelry product photography without copying iJewel assets.
    environmentKey:"white", gemEnvironmentKey:"gemWhite",
    environmentIntensity:.43, environmentRotation:.22, gemEnvironmentRotation:-.18, gemEnvironmentIntensity:.90, metalEnvironmentScale:.62, highlightProtection:.90, exposure:.72,
    lighting:"productSoft",
    post:{ssao:true,ssaoIntensity:.055,bloom:false,bloomIntensity:.012,bloomThreshold:1.80,lut:true,lutIntensity:.045,taa:true,dof:false,dofAperture:.00045,dofMaxBlur:.0035}
  },
  galeria: {
    environmentKey:"studioHard", gemEnvironmentKey:"gemNeutral",
    environmentIntensity:.54, environmentRotation:.62, gemEnvironmentRotation:.64, gemEnvironmentIntensity:1.02, metalEnvironmentScale:.88, highlightProtection:.92, exposure:.66,
    lighting:"studioHard",
    post:{ssao:true,ssaoIntensity:.11,bloom:false,bloomIntensity:.03,bloomThreshold:1.5,lut:true,lutIntensity:.08,taa:true,dof:false,dofAperture:.0005,dofMaxBlur:.004}
  },
  oroCalido: {
    environmentKey:"warm", gemEnvironmentKey:"gemDiamond",
    environmentIntensity:.52, environmentRotation:.42, gemEnvironmentRotation:.46, gemEnvironmentIntensity:.94, metalEnvironmentScale:.82, highlightProtection:.88, exposure:.64,
    lighting:"luxury",
    post:{ssao:true,ssaoIntensity:.09,bloom:false,bloomIntensity:.03,bloomThreshold:1.55,lut:true,lutIntensity:.11,taa:true,dof:false,dofAperture:.0005,dofMaxBlur:.004}
  },
  gemaClara: {
    environmentKey:"jewelry", gemEnvironmentKey:"gemWhite",
    environmentIntensity:.50, environmentRotation:.08, gemEnvironmentRotation:-.08, gemEnvironmentIntensity:.84, metalEnvironmentScale:.70, highlightProtection:.86, exposure:.68,
    lighting:"jewelry",
    post:{ssao:true,ssaoIntensity:.065,bloom:false,bloomIntensity:.018,bloomThreshold:1.70,lut:true,lutIntensity:.045,taa:true,dof:false,dofAperture:.00055,dofMaxBlur:.005}
  }
};

export const getAurumPhotographicProfile=(id:string):AurumPhotographicProfile =>
  AURUM_PHOTOGRAPHIC_PROFILES[id] ?? AURUM_PHOTOGRAPHIC_PROFILES.producto;
