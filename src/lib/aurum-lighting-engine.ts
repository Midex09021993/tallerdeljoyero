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
 gem:{enabled:true,intensity:.22,position:[0,4,2]},
 ambient:.08
};
export const AURUM_LIGHTING_PRESETS={
 joyeria:{...AURUM_LIGHTING_DEFAULT},
 diamante:{...AURUM_LIGHTING_DEFAULT,gem:{enabled:true,intensity:.95,position:[0,3,2]}},
 oro:{...AURUM_LIGHTING_DEFAULT,key:{...AURUM_LIGHTING_DEFAULT.key,intensity:1.05}},
 suave:{...AURUM_LIGHTING_DEFAULT,key:{...AURUM_LIGHTING_DEFAULT.key,intensity:1.25},fill:{...AURUM_LIGHTING_DEFAULT.fill,intensity:1}}
};
