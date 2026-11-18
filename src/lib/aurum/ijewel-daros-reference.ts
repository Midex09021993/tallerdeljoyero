import type { AurumIJEWELGemParameters } from "../aurum-material-engine";

export type AurumIJEWELDAROSReference = AurumIJEWELGemParameters & {
  materialIndex:number;
  materialName:string;
  sourceRootPath:string;
  separateEnvMapIntensity:true;
};

const r=(materialIndex:number,materialName:string,sourceRootPath:string,color:number,environmentIntensity:number,dispersion:number,gammaFactor:number,absorptionFactor:number,reflectivity:number,refractiveIndex:number,rayBounces:number,transmissionParameter=0):AurumIJEWELDAROSReference=>({
  materialIndex,materialName,sourceRootPath,color,environmentIntensity,environmentRotationOffset:0,dispersion,
  squashFactor:.98,geometryFactor:.5,gammaFactor,absorptionFactor,reflectivity,refractiveIndex,rayBounces,
  diamondOrientedEnvMap:0,boostFactors:{x:1,y:1,z:1},transmissionParameter,separateEnvMapIntensity:true,
  engineVersion:"0.22.0",materialType:"DiamondMaterial"
});

export const AURUM_IJEWEL_DAROS_GEMS:ReadonlyArray<AurumIJEWELDAROSReference>=[
r(1,"Metal 01","2_gem_diamond_pink_1_29b6e3de64.dmat",0xf7e0e0,1.5,.004,1.09,1,.46,2.4,6),
r(2,"Metal 02","2_gem_diamond_pink_2_f81d0d280c.dmat",0xf9dfec,1.03,.012,1,1,.5,2.6,5),
r(3,"Metal 03","2_gem_diamond_t_lightyellow_4e89caee2b.dmat",0xfffed1,1.5,.004,1.09,1,.46,2.4,6),
r(4,"Metal 04","2_gem_diamond_yellow_1_18f953a9b0.dmat",0xfefbf2,1.03,.005,1,1.3,.5,2.6,6),
r(5,"Setting","1_gem_emerald_2_4e52dc6733.dmat",0x4fd5b3,1,7.182839392716467e-19,1,1.8,.31,1.58,5),
r(6,"Finger","1_gem_emerald_1_58128f46c0.dmat",0x19d597,1,7.182839392716467e-19,1,1.6,.5,1.58,3),
r(7,"Creation","1_gem_ruby_1_0229c0f56f.dmat",0xe14276,1,0,1,1.6,.5,1.77,5),
r(8,"Cutting","1_gem_emerald_1_58128f46c0.dmat",0x09e09d,1,7.182839392716467e-19,1,1.6,.5,1.58,3),
r(9,"User 03","1_gem_ruby_1_0229c0f56f.dmat",0xe14159,1,0,1,1.6,.5,1.77,5),
r(10,"User 04","1_gem_sapphire_1_199754e399.dmat",0x89b0cb,1,0,1,1.6,.5,1.77,5),
r(11,"User 02","1_gem_ruby_1_0229c0f56f.dmat",0xe14276,1,0,1,1.6,.5,1.77,5),
r(12,"User 01","1_gem_ruby_2_539554ebc7.dmat",0xe1405c,1,0,1,1.8,.5,1.77,5),
r(13,"Light","1_gem_sapphire_2_0c9c1d5101.dmat",0x649dc4,1,0,1,1.6,.5,1.77,5),
r(14,"Ground Plane","1_gem_emerald_1_58128f46c0.dmat",0x8ac4ff,1,7.182839392716467e-19,1,1.6,.5,1.58,3),
r(15,"Emissive","1_gem_ruby_1_0229c0f56f.dmat",0xffe978,1,0,1,1.6,.5,1.77,5),
r(16,"Prop","1_gem_emerald_1_58128f46c0.dmat",0x9cc2e8,1,7.182839392716467e-19,1,2.2,.5,1.58,3),
r(17,"Extra 01","1_gem_ruby_1_0229c0f56f.dmat",0xe6cf4d,1,0,1,1.6,.5,1.77,5),
r(18,"Extra 02","2_gem_diamond_black_7e415915d7.dmat",0x000000,1.03,.012,1,15,.5,2.6,5),
r(19,"Extra 04","2_gem_diamond_greem_2_35262ea2e4.dmat",0xbcfed8,1.03,.012,1,1,.5,2.6,5),
r(20,"Extra 03","2_gem_diamond_blue_1_daf2ed7886.dmat",0xb5cbdd,1.5,.004,1.09,1,.46,2.4,6),
r(21,"Extra 07","2_gem_diamond_greem_2_35262ea2e4.dmat",0xbcfed8,1.03,.012,1,1,.5,2.6,5),
r(23,"Extra 06","2_gem_diamond_d_colorless_039be63563.dmat",0xececec,1.5,.004,1.09,1,.46,2.4,6),
r(24,"Extra 05","2_gem_diamond_brown_5f6be3cbfb.dmat",0xf9e1c4,1.03,.012,1,1.3,.5,2.6,5),
r(25,"Extra 09","2_gem_diamond_green_1_75b3a9287a.dmat",0xc9e3d3,1.5,.004,1.09,1,.46,2.4,6),
r(26,"Extra 10","2_gem_diamond_h_nearcolorless_e24e0c6450.dmat",0xf2f2ed,1.5,.004,1.09,1,.46,2.4,6),
r(27,"Extra 12","2_gem_diamond_p_verylightyellow_f62df767e7.dmat",0xffffe6,1.5,.004,1.09,1,.46,2.4,6),
r(28,"Extra 11","2_gem_diamond_k_faintyellow_61ef854bd5.dmat",0xf5f5e5,1.5,.004,1.09,1,.46,2.4,6),
r(29,"Gem 01","1_gem_diamond_white_1_4aa77fb087.dmat",0xffffff,1.3,.01,1,1,.5,2.6,5),
r(30,"Gem 02","1_gem_diamond_white_2_45a2728698.dmat",0xffffff,1.3,0,1,1,.5,2.6,5),
r(31,"Gem 03","1_gem_diamond_white_3_731246f173.dmat",0xffffff,1.3,0,1,1,.5,2.6,5,1),
r(32,"Gem 04","1_gem_emerald_1_58128f46c0.dmat",0x22dfa3,1,7.182839392716467e-19,1,1.6,.5,1.58,5)
];

export const AURUM_IJEWEL_DAROS_ENVIRONMENT={
  engineVersion:"0.22.0",
  metalEnvironment:"env_metal_001_d01c4504e0.hdr",
  gemEnvironment:"env_gem_002_30251392af.exr",
  metalEnvironmentIntensity:1,
  gemEnvironmentIntensity:1,
  fixedEnvironmentDirection:true,
  environmentRotation:[0,0,0] as const,
  backgroundIntensity:1,
  diamondEnvironmentUuid:"6913d63c-0c34-4f79-b364-265c078b1aa1",
  sceneEnvironmentUuid:"50ee5b1b-8796-4c34-b056-89778197f283",
};

export const getAurumIJEWELDAROSReference=(sourceRootPath:string)=>{
  const key=String(sourceRootPath??"").split("/").pop()?.split("?")[0]??"";
  return AURUM_IJEWEL_DAROS_GEMS.find(x=>x.sourceRootPath===key||x.sourceRootPath===sourceRootPath);
};
