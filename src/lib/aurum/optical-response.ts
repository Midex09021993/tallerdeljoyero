import type { AurumOpticalProfile } from "../aurum-material-engine";

/**
 * Family-specific optical response.
 *
 * This layer makes the differences between transparent gemstones visible in the
 * render without replacing the authored CAD geometry or optical constants.
 */
export const applyAurumFamilyOpticalResponse=(material:any,profile:AurumOpticalProfile)=>{
  if(!material) return material;

  const brilliance=Math.max(0,Math.min(1.2,Number(profile.brilliance??.75)));
  const fire=Math.max(0,Math.min(1.25,Number(profile.fire??.35)));
  const facetContrast=Math.max(0,Math.min(1.2,Number(profile.facetContrast??.9)));
  const internalReflection=Math.max(0,Math.min(1,Number(profile.internalReflection??.8)));
  const family=String(material.userData?.aurumGemFamily??"");

  // Make broad reflections readable without washing out saturated stones.
  const baseEnv=Number(material.envMapIntensity??1);
  material.envMapIntensity=baseEnv*(.90+brilliance*.18);

  // Strong specular response is essential for polished facet transitions.
  material.specularIntensity=Math.max(.88,Math.min(1, .90+facetContrast*.10));

  // Increase the visible separation between neighboring authored facets. The
  // geometry remains untouched; flatShading supplies the actual facet normals.
  if(family!=="Diamante" && family!=="Moissanita"){
    const baseRoughness=Math.max(.006,Number(material.roughness??.02));
    material.roughness=Math.max(.006,baseRoughness*(1-.12*facetContrast));
    material.clearcoat=Math.max(.14,Math.min(.30,.14+facetContrast*.10));
    material.clearcoatRoughness=Math.max(.008,Math.min(.025,baseRoughness*.65));
  }

  // Let internal reflection influence the transmission response instead of
  // treating every colored stone as the same piece of glass.
  const baseTransmission=Math.max(0,Math.min(1,Number(material.transmission??1)));
  material.transmission=Math.max(0,Math.min(1,baseTransmission*(.92+internalReflection*.08)));

  // Fire remains a subtle spectral effect on colored stones.
  const dispersion=Number(material.dispersion??0);
  material.dispersion=Math.max(0,dispersion*(.94+fire*.08));

  material.userData={
    ...(material.userData??{}),
    aurumFamilyOpticalResponse:{
      family,
      brilliance,
      fire,
      facetContrast,
      internalReflection,
      facetResponseVersion:"v2",
    },
  };
  material.needsUpdate=true;
  return material;
};
