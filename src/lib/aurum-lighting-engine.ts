/**
 * AURUM LIGHTING STUDIO v1.1
 * Iluminación de fotografía de joyería en tiempo real.
 */
export type AurumLightConfig={
  key:{enabled:boolean;intensity:number;position:[number,number,number];angle:number;penumbra:number};
  fill:{enabled:boolean;intensity:number;position:[number,number,number];angle:number;penumbra:number};
  rim:{enabled:boolean;intensity:number;position:[number,number,number];angle:number;penumbra:number};
  gem:{enabled:boolean;intensity:number;position:[number,number,number]};
  front:{enabled:boolean;intensity:number};
  ambient:number;
  /** Shared photographic white-balance control for the studio sources. */
  temperatureK?:number;
};
export const AURUM_LIGHTING_DEFAULT:AurumLightConfig={
 // Start with the manual studio sources disabled. The scene HDR remains active;
 // users can enable each added light independently from the lighting panel.
 key:{enabled:false,intensity:.9,position:[6,6,4],angle:.58,penumbra:.82},
 fill:{enabled:false,intensity:.32,position:[-4,3,4],angle:.82,penumbra:.9},
 rim:{enabled:false,intensity:.5,position:[2,5,-5],angle:.7,penumbra:.88},
 gem:{enabled:false,intensity:1.0,position:[0,3,2]},front:{enabled:false,intensity:1},ambient:.08
};
export const AURUM_LIGHTING_PRESETS={joyeria:{...AURUM_LIGHTING_DEFAULT},diamante:{...AURUM_LIGHTING_DEFAULT,gem:{enabled:true,intensity:1.25,position:[0,3,2]}},oro:{...AURUM_LIGHTING_DEFAULT,key:{...AURUM_LIGHTING_DEFAULT.key,intensity:1.0}},suave:{...AURUM_LIGHTING_DEFAULT,key:{...AURUM_LIGHTING_DEFAULT.key,intensity:1.15},fill:{...AURUM_LIGHTING_DEFAULT.fill,intensity:.7}}};

/** Broad source ratios. The shape of the reflection matters more than raw light power. */
export const AURUM_LIGHTING_RENDER_PRESETS={
  // Product shot: broad diffusion is dominant; direct sources are restrained
  // so polished metal is described by long, soft reflections rather than hot spots.
  // A separate gem source remains available for controlled stone brilliance.
  productSoft:{key:.42,fill:.30,rim:.18,gem:.62,softbox:1.08,strip:.68,front:.46,kicker:.24,edgeLeft:.30,edgeRight:.28},
  studioSoft:{key:.58,fill:.20,rim:.23,gem:.50,softbox:.94,strip:.58,front:.52,kicker:.54,edgeLeft:.50,edgeRight:.48},
  studioHard:{key:.46,fill:.05,rim:.28,gem:.12,softbox:.54,strip:.30,front:.14,kicker:.82,edgeLeft:.28,edgeRight:.34},
  jewelry:{key:.58,fill:.14,rim:.25,gem:.52,softbox:.90,strip:.58,front:.38,kicker:.62,edgeLeft:.46,edgeRight:.44},
  // Keep the HDRI dominant; favor narrow vertical and rear reflections over
  // a broad frontal wash so polished white metal retains dark/light contrast.
  ijewelReference:{key:.42,fill:.10,rim:.18,gem:.62,softbox:.62,strip:1.0,front:.25,kicker:.75,edgeLeft:.70,edgeRight:.70},
  ijewelEnvironmentReference:{key:.42,fill:.10,rim:.18,gem:.62,softbox:.62,strip:1.0,front:.25,kicker:.75,edgeLeft:.70,edgeRight:.70},
  luxury:{key:.36,fill:.045,rim:.30,gem:.12,softbox:.42,strip:.22,front:.09,kicker:.82,edgeLeft:.20,edgeRight:.25},
} as const;
export type AurumLightingRenderPresetId=keyof typeof AURUM_LIGHTING_RENDER_PRESETS;
export const getAurumLightingPreset=(id:string)=>AURUM_LIGHTING_RENDER_PRESETS[id as AurumLightingRenderPresetId]??AURUM_LIGHTING_RENDER_PRESETS.jewelry;