/**
 * AURUM SHADOW ENGINE v1.0
 * Sombras suaves y de contacto para fotografía de joyería.
 */
export const AURUM_SHADOW_CONFIG={
  progressive:true,
  contact:true,
  // Sombra de contacto sutil: suficiente para anclar la pieza
  // al plano sin crear una mancha oscura de estudio.
  contactOpacity:.16,
  contactScale:2.2,
  bias:.0007,
  normalBias:.035,
  mapSize:2048
};
export const getAurumShadowConfig=()=>({...AURUM_SHADOW_CONFIG});
