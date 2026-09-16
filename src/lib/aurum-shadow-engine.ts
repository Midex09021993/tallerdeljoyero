/**
 * AURUM SHADOW ENGINE v1.0
 * Sombras suaves y de contacto para fotografía de joyería.
 */
export const AURUM_SHADOW_CONFIG={
  progressive:true,
  contact:true,
  contactOpacity:.32,
  contactScale:1.5,
  bias:.0005,
  normalBias:.015,
  mapSize:2048
};
export const getAurumShadowConfig=()=>({...AURUM_SHADOW_CONFIG});
