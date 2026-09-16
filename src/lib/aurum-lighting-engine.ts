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
  studioSoft:{
    key:.64,fill:.18,rim:.24,gem:.42,
    softbox:1.05,strip:.58,front:.62,kicker:.68,edgeLeft:.62,edgeRight:.56
  },
  studioHard:{
    key:.52,fill:.07,rim:.34,gem:.12,
    softbox:.62,strip:.38,front:.18,kicker:.95,edgeLeft:.34,edgeRight:.42
  },
  jewelry:{
    key:.72,fill:.20,rim:.30,gem:.46,
    softbox:1.18,strip:.72,front:.52,kicker:.78,edgeLeft:.58,edgeRight:.54
  },
  luxury:{
    key:.44,fill:.06,rim:.38,gem:.10,
    softbox:.52,strip:.28,front:.12,kicker:1.12,edgeLeft:.26,edgeRight:.34
  },
} as const;

export type AurumLightingRenderPresetId=keyof typeof AURUM_LIGHTING_RENDER_PRESETS;
export const getAurumLightingPreset=(id:string)=>
  AURUM_LIGHTING_RENDER_PRESETS[id as AurumLightingRenderPresetId] ?? AURUM_LIGHTING_RENDER_PRESETS.jewelry;

