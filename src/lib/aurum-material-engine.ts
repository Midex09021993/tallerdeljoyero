/**
 * AURUM MATERIAL ENGINE
 * Capa técnica independiente del visor.
 */
export type AurumMetalPreset = {
  color:number; metalness:number; roughness:number; envMapIntensity:number;
  clearcoat:number; anisotropy?:number; anisotropyRotation?:number;
};
export type AurumGemPreset = {
  color:number; transmission:number; ior:number; roughness:number;
  envMapIntensity:number; attenuationColor:number; attenuationDistance:number;
  dispersion:number; iridescence:number;
};
export const AURUM_MATERIAL_ENGINE_VERSION = "1.0.0";

export const applyAurumMetal = (material:any, preset:AurumMetalPreset) => {
  if (!material) return material;
  material.color?.setHex(preset.color);
  material.metalness=preset.metalness; material.roughness=preset.roughness;
  material.envMapIntensity=preset.envMapIntensity; material.clearcoat=preset.clearcoat;
  material.clearcoatRoughness=Math.min(.35,Math.max(.025,preset.roughness*.42));
  material.anisotropy=Math.max(0,Math.min(1,preset.anisotropy??0));
  material.anisotropyRotation=preset.anisotropyRotation??0;
  material.specularIntensity=preset.metalness>.9?1:.8;
  material.specularColor?.setHex(0xffffff);
  material.emissive?.setHex(0x000000); material.emissiveIntensity=0;
  material.needsUpdate=true; return material;
};

export const applyAurumGem = (material:any,preset:AurumGemPreset,thickness:number,family:string) => {
  if (!material) return material;
  material.color?.setHex(preset.color); material.metalness=0;
  material.roughness=preset.roughness; material.transmission=preset.transmission;
  material.thickness=Math.max(.015,thickness);
  material.ior=Math.min(2.333,Math.max(1.01,preset.ior));
  material.specularIntensity=1;
  material.clearcoat=family==="Diamante" ? .26 : .18;
  material.clearcoatRoughness=family==="Diamante" ? .012 : .02;
  material.envMapIntensity=preset.envMapIntensity;
  material.attenuationColor?.setHex(preset.attenuationColor);
  material.attenuationDistance=preset.attenuationDistance;
  material.dispersion=Math.max(0,preset.dispersion);
  material.iridescence=preset.iridescence;
  material.iridescenceIOR=Math.min(2.333,Math.max(1.01,preset.ior));
  material.transparent=false; material.opacity=1; material.needsUpdate=true; return material;
};

export const metalPresetFromConfig=(m:any):AurumMetalPreset=>({
  color:m.color,metalness:m.metalness,roughness:m.roughness,envMapIntensity:m.envMapIntensity,
  clearcoat:m.clearcoat,anisotropy:m.anisotropy,anisotropyRotation:m.anisotropyRotation
});
export const gemPresetFromConfig=(g:any):AurumGemPreset=>({
  color:g.color,transmission:g.transmission,ior:g.ior,roughness:g.roughness,
  envMapIntensity:g.envMapIntensity,attenuationColor:g.attenuationColor,
  attenuationDistance:g.attenuationDistance,dispersion:g.dispersion,iridescence:g.iridescence
});
