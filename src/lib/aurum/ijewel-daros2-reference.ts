import type { AurumIJEWELGemParameters } from "../aurum-material-engine";

export type AurumIJEWELDAROS2Reference = AurumIJEWELGemParameters & {
  materialIndex:number;
  materialName:string;
  sourceRootPath:string;
  separateEnvMapIntensity:true;
  sourceFile:"DAROS (2).glb";
};

const r=(materialIndex:number,materialName:string,sourceRootPath:string,p:Omit<AurumIJEWELDAROS2Reference,"materialIndex"|"materialName"|"sourceRootPath"|"separateEnvMapIntensity"|"sourceFile">):AurumIJEWELDAROS2Reference=>({
  materialIndex,materialName,sourceRootPath,separateEnvMapIntensity:true,sourceFile:"DAROS (2).glb",...p,
});

const whiteDiaRoot="https://cdn1.ijewel.design/7bf58cc83842bff3f1b19145acaf468c4803776e/68924d53-54df/custom-asset/white-dia_1754418514761.dmat";

export const AURUM_IJEWEL_DAROS2_GEMS:ReadonlyArray<AurumIJEWELDAROS2Reference>=[
  r(4,"Metal 04",whiteDiaRoot,{engineVersion:"0.22.0",materialType:"DiamondMaterial",color:0xffffff,environmentIntensity:2.64,environmentRotationOffset:-0.73,dispersion:0,squashFactor:.98,geometryFactor:.5,gammaFactor:.78,absorptionFactor:0,reflectivity:.15,refractiveIndex:1.53,rayBounces:3,diamondOrientedEnvMap:1,boostFactors:{x:1.6015625,y:1.1703125,z:1.7296875},transmissionParameter:0}),
  r(5,"Setting",whiteDiaRoot,{engineVersion:"0.22.0",materialType:"DiamondMaterial",color:0xffffff,environmentIntensity:1.33,environmentRotationOffset:-0.73,dispersion:0,squashFactor:.98,geometryFactor:.5,gammaFactor:.71,absorptionFactor:0,reflectivity:.15,refractiveIndex:1.53,rayBounces:4,diamondOrientedEnvMap:1,boostFactors:{x:2.140625,y:2.8140625,z:4.0140625},transmissionParameter:0}),
  r(6,"Finger",whiteDiaRoot,{engineVersion:"0.22.0",materialType:"DiamondMaterial",color:15000804,environmentIntensity:1.05,environmentRotationOffset:.01,dispersion:0,squashFactor:.98,geometryFactor:.5,gammaFactor:.74,absorptionFactor:0,reflectivity:.98,refractiveIndex:1.46,rayBounces:3,diamondOrientedEnvMap:1,boostFactors:{x:2,y:2,z:2},transmissionParameter:0}),
  r(7,"Creation",whiteDiaRoot,{engineVersion:"0.22.0",materialType:"DiamondMaterial",color:15000804,environmentIntensity:2.51,environmentRotationOffset:.01,dispersion:0,squashFactor:.98,geometryFactor:.5,gammaFactor:.99,absorptionFactor:0,reflectivity:.98,refractiveIndex:1.46,rayBounces:3,diamondOrientedEnvMap:1,boostFactors:{x:2,y:2,z:2},transmissionParameter:0}),
  r(8,"Cutting",whiteDiaRoot,{engineVersion:"0.22.0",materialType:"DiamondMaterial",color:15000804,environmentIntensity:1.46,environmentRotationOffset:.01,dispersion:0,squashFactor:.98,geometryFactor:.5,gammaFactor:.82,absorptionFactor:0,reflectivity:.98,refractiveIndex:1.46,rayBounces:3,diamondOrientedEnvMap:1,boostFactors:{x:2,y:2,z:2},transmissionParameter:0}),
  r(9,"User 03",whiteDiaRoot,{engineVersion:"0.22.0",materialType:"DiamondMaterial",color:15000804,environmentIntensity:2.51,environmentRotationOffset:-.73,dispersion:0,squashFactor:.98,geometryFactor:.5,gammaFactor:.85,absorptionFactor:0,reflectivity:.53,refractiveIndex:1.53,rayBounces:3,diamondOrientedEnvMap:1,boostFactors:{x:2.0203125,y:2,z:2.30625},transmissionParameter:0}),
  r(10,"User 04",whiteDiaRoot,{engineVersion:"0.22.0",materialType:"DiamondMaterial",color:15000804,environmentIntensity:2.51,environmentRotationOffset:.01,dispersion:0,squashFactor:.98,geometryFactor:.5,gammaFactor:.78,absorptionFactor:0,reflectivity:.53,refractiveIndex:1.53,rayBounces:4,diamondOrientedEnvMap:1,boostFactors:{x:2,y:2,z:2},transmissionParameter:0}),
  r(11,"User 02",whiteDiaRoot,{engineVersion:"0.22.0",materialType:"DiamondMaterial",color:15000804,environmentIntensity:2.51,environmentRotationOffset:.01,dispersion:0,squashFactor:.98,geometryFactor:.5,gammaFactor:.78,absorptionFactor:0,reflectivity:.53,refractiveIndex:1.53,rayBounces:4,diamondOrientedEnvMap:1,boostFactors:{x:2,y:2,z:2},transmissionParameter:0}),
  r(12,"User 01",whiteDiaRoot,{engineVersion:"0.22.0",materialType:"DiamondMaterial",color:15000804,environmentIntensity:1.46,environmentRotationOffset:.01,dispersion:0,squashFactor:.98,geometryFactor:.5,gammaFactor:.82,absorptionFactor:0,reflectivity:.98,refractiveIndex:1.46,rayBounces:3,diamondOrientedEnvMap:1,boostFactors:{x:2,y:2,z:2},transmissionParameter:0}),
  r(13,"Light",whiteDiaRoot,{engineVersion:"0.22.0",materialType:"DiamondMaterial",color:15000804,environmentIntensity:2.51,environmentRotationOffset:.01,dispersion:0,squashFactor:.98,geometryFactor:.5,gammaFactor:.78,absorptionFactor:0,reflectivity:.53,refractiveIndex:1.53,rayBounces:4,diamondOrientedEnvMap:1,boostFactors:{x:2,y:2,z:2},transmissionParameter:0}),
  r(14,"Ground Plane","https://packs.ijewel3d.com/files/gem_topas_2cdee6fc1b.dmat?localhost",{engineVersion:"0.22.0",materialType:"DiamondMaterial",color:10738661,environmentIntensity:1,environmentRotationOffset:0,dispersion:0,squashFactor:.98,geometryFactor:.5,gammaFactor:1,absorptionFactor:2.98,reflectivity:.5,refractiveIndex:1.64,rayBounces:6,diamondOrientedEnvMap:0,boostFactors:{x:1,y:1,z:1},transmissionParameter:0}),
];

export const getAurumIJEWELDAROS2Reference=(sourceRootPath:string,materialName?:string)=>{
  const source=String(sourceRootPath??"");
  const name=String(materialName??"").trim().toLowerCase();
  return AURUM_IJEWEL_DAROS2_GEMS.find(x=>
    (x.sourceRootPath===source || x.sourceRootPath.split("/").pop()?.split("?")[0]===source.split("/").pop()?.split("?")[0]) &&
    (!name || x.materialName.toLowerCase()===name)
  ) ?? (name ? undefined : AURUM_IJEWEL_DAROS2_GEMS.find(x=>x.sourceRootPath===source || x.sourceRootPath.split("/").pop()?.split("?")[0]===source.split("/").pop()?.split("?")[0]));
};
