/**
 * AURUM LIGHTING STUDIO v1.0
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
 gem:{enabled:true,intensity:.3,position:[0,4,2]},
 ambient:.08
};
export const AURUM_LIGHTING_PRESETS={
 joyeria:{...AURUM_LIGHTING_DEFAULT},
 diamante:{...AURUM_LIGHTING_DEFAULT,gem:{enabled:true,intensity:.85,position:[0,3,2]}},
 oro:{...AURUM_LIGHTING_DEFAULT,key:{...AURUM_LIGHTING_DEFAULT.key,intensity:1.0}},
 suave:{...AURUM_LIGHTING_DEFAULT,key:{...AURUM_LIGHTING_DEFAULT.key,intensity:1.15},fill:{...AURUM_LIGHTING_DEFAULT.fill,intensity:.7}}
};
/**
 * Photographic rig profiles.
 * The RectAreaLights are part of the reflection design: polished jewelry reads
 * the shape of the source, not only its intensity. Keeping their ratios here
 * makes every scene a distinct lighting setup instead of a background swap.
 */
export const AURUM_LIGHTING_RENDER_PRESETS={
  productSoft:{
    key:.46,fill:.12,rim:.18,gem:.58,
    softbox:1.00,strip:.56,front:.34,kicker:.46,edgeLeft:.40,edgeRight:.38
  },
  studioSoft:{
    key:.58,fill:.14,rim:.22,gem:.42,
    softbox:.90,strip:.50,front:.50,kicker:.60,edgeLeft:.54,edgeRight:.50
  },
  studioHard:{
    key:.48,fill:.055,rim:.30,gem:.12,
    softbox:.56,strip:.32,front:.15,kicker:.84,edgeLeft:.30,edgeRight:.36
  },
  jewelry:{
    key:.62,fill:.15,rim:.27,gem:.44,
    softbox:.92,strip:.54,front:.42,kicker:.66,edgeLeft:.48,edgeRight:.46
  },
  luxury:{
    key:.40,fill:.05,rim:.34,gem:.10,
    softbox:.46,strip:.24,front:.10,kicker:.96,edgeLeft:.22,edgeRight:.28
  },
} as const;

export type AurumLightingRenderPresetId=keyof typeof AURUM_LIGHTING_RENDER_PRESETS;
export const getAurumLightingPreset=(id:string)=>
  AURUM_LIGHTING_RENDER_PRESETS[id as AurumLightingRenderPresetId] ?? AURUM_LIGHTING_RENDER_PRESETS.jewelry;

