/**
 * AURUM LIGHTING STUDIO v1.2
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
  productSoft:{key:.34,fill:.075,rim:.14,gem:.48,softbox:.76,strip:.54,front:.18,kicker:.34,edgeLeft:.30,edgeRight:.28},
  studioSoft:{key:.44,fill:.09,rim:.19,gem:.34,softbox:.80,strip:.52,front:.28,kicker:.52,edgeLeft:.44,edgeRight:.42},
  studioHard:{key:.38,fill:.035,rim:.27,gem:.08,softbox:.50,strip:.27,front:.10,kicker:.80,edgeLeft:.26,edgeRight:.30},
  jewelry:{key:.46,fill:.095,rim:.23,gem:.38,softbox:.82,strip:.56,front:.24,kicker:.60,edgeLeft:.44,edgeRight:.42},
  // Luxury keeps a controlled dark side and a narrower kicker for edge definition.
  luxury:{key:.30,fill:.035,rim:.27,gem:.08,softbox:.38,strip:.18,front:.06,kicker:.76,edgeLeft:.18,edgeRight:.22},
} as const;
export type AurumLightingRenderPresetId=keyof typeof AURUM_LIGHTING_RENDER_PRESETS;
// v1.2: lower direct fill and preserve broad reflection gradients. GIA notes diffused light is preferable for gemstone color and soft gradients help polished metal.\nexport const getAurumLightingPreset=(id:string)=>AURUM_LIGHTING_RENDER_PRESETS[id as AurumLightingRenderPresetId]??AURUM_LIGHTING_RENDER_PRESETS.jewelry;
