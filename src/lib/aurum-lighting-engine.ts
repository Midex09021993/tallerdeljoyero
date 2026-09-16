/**
 * AURUM LIGHTING STUDIO v1.1
 * Iluminación de fotografía de joyería en tiempo real.
 */
export type AurumLightConfig={
  key:{enabled:boolean;intensity:number;position:[number,number,number];angle:number;penumbra:number};
  fill:{enabled:boolean;intensity:number;position:[number,number,number];angle:number;penumbra:number};
  rim:{enabled:boolean;intensity:number;position:[number,number,number];angle:number;penumbra:number};
  gem:{enabled:boolean;intensity:number;position:[number,number,number]};
  ambient:number;
};
export const AURUM_LIGHTING_DEFAULT:AurumLightConfig={
 key:{enabled:true,intensity:.9,position:[4,6,5],angle:.58,penumbra:.82},
 fill:{enabled:true,intensity:.32,position:[-4,3,4],angle:.82,penumbra:.9},
 rim:{enabled:true,intensity:.5,position:[2,5,-5],angle:.7,penumbra:.88},
 gem:{enabled:true,intensity:.3,position:[0,4,2]},ambient:.08
};
export const AURUM_LIGHTING_PRESETS={joyeria:{...AURUM_LIGHTING_DEFAULT},diamante:{...AURUM_LIGHTING_DEFAULT,gem:{enabled:true,intensity:.85,position:[0,3,2]}},oro:{...AURUM_LIGHTING_DEFAULT,key:{...AURUM_LIGHTING_DEFAULT.key,intensity:1.0}},suave:{...AURUM_LIGHTING_DEFAULT,key:{...AURUM_LIGHTING_DEFAULT.key,intensity:1.15},fill:{...AURUM_LIGHTING_DEFAULT.fill,intensity:.7}}};

/** Broad source ratios. The shape of the reflection matters more than raw light power. */
export const AURUM_LIGHTING_RENDER_PRESETS={
  // Large diffused key + moderate fill: clean gradients without washing the metal.
  productSoft:{key:.42,fill:.10,rim:.16,gem:.68,softbox:.92,strip:.64,front:.28,kicker:.38,edgeLeft:.34,edgeRight:.32},
  studioSoft:{key:.55,fill:.13,rim:.21,gem:.46,softbox:.88,strip:.54,front:.46,kicker:.56,edgeLeft:.50,edgeRight:.48},
  studioHard:{key:.46,fill:.05,rim:.28,gem:.12,softbox:.54,strip:.30,front:.14,kicker:.82,edgeLeft:.28,edgeRight:.34},
  jewelry:{key:.58,fill:.14,rim:.25,gem:.52,softbox:.90,strip:.58,front:.38,kicker:.62,edgeLeft:.46,edgeRight:.44},
  // Luxury keeps a controlled dark side and a narrower kicker for edge definition.
  luxury:{key:.36,fill:.045,rim:.30,gem:.12,softbox:.42,strip:.22,front:.09,kicker:.82,edgeLeft:.20,edgeRight:.25},
} as const;
export type AurumLightingRenderPresetId=keyof typeof AURUM_LIGHTING_RENDER_PRESETS;
export const getAurumLightingPreset=(id:string)=>AURUM_LIGHTING_RENDER_PRESETS[id as AurumLightingRenderPresetId]??AURUM_LIGHTING_RENDER_PRESETS.jewelry;
