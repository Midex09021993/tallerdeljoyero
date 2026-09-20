/**
 * AURUM POST PROCESSING ENGINE v1.0
 * Primera capa: tone mapping y exposición controlada.
 * Preparado para añadir AA/SSAO/SSR/Bloom sin alterar el render base.
 */
export type AurumPostConfig={
  toneMapping:"ACES"|"AgX"|"Neutral";
  exposure:number;
  contrast:number;
  saturation:number;
  bloom:boolean;
  bloomIntensity:number;
  bloomThreshold:number;
  ssao:boolean;
  ssaoIntensity:number;
  ssaoFalloff:number;
  bloomRadius:number;
  ssr:boolean;
  ssrIntensity:number;
  ssrMaxDistance:number;
  ssrThickness:number;
  temporalAA:boolean;
  progressiveFrameCount:number;
  lut:boolean;
  lutIntensity:number;
  vignette:boolean;
  vignetteDarkness:number;
  vignetteOffset:number;
};
export const AURUM_POST_CONFIG:AurumPostConfig={
  toneMapping:"AgX", exposure:.62, contrast:1.018, saturation:1.018,
  bloom:false, bloomIntensity:.08, bloomThreshold:1.35, bloomRadius:.6,
  ssao:false, ssaoIntensity:.22, ssaoFalloff:1.3, ssr:false, ssrIntensity:1, ssrMaxDistance:1, ssrThickness:.018, temporalAA:false, progressiveFrameCount:32,
  lut:true, lutIntensity:.12,
  vignette:true, vignetteDarkness:.055, vignetteOffset:1.02
};
export const getAurumPostConfig=()=>({...AURUM_POST_CONFIG});
