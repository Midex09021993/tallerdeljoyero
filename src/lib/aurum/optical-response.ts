import type { AurumOpticalProfile } from "../aurum-material-engine";

/**
 * Family-specific optical response.
 *
 * GIA separates brightness, fire and scintillation rather than treating
 * "more brightness" as universally better. This layer therefore makes only
 * restrained, family-aware adjustments to the material response and leaves
 * authored IOR, transmission, attenuation and dispersion values authoritative.
 */
export const applyAurumFamilyOpticalResponse=(material:any,profile:AurumOpticalProfile)=>{
  if(!material) return material;

  const brilliance=Math.max(0,Math.min(1.2,Number(profile.brilliance??.75)));
  const fire=Math.max(0,Math.min(1.25,Number(profile.fire??.35)));
  const facetContrast=Math.max(0,Math.min(1.2,Number(profile.facetContrast??.9)));
  const family=String(material.userData?.aurumGemFamily??"");

  // Keep the authored environment response, but shape it by optical family.
  // This avoids the common "turn the gem brighter" shortcut that washes color.
  const baseEnv=Number(material.envMapIntensity??1);
  material.envMapIntensity=baseEnv*(.94+brilliance*.10);

  // A polished gemstone needs a strong but controlled specular response.
  // Contrast is intentionally a small multiplier because the actual facets
  // already come from the CAD geometry and flat-shaded normals.
  material.specularIntensity=Math.max(.82,Math.min(1, .90+facetContrast*.10));

  // Dispersion is already authored per catalog stone. Fire only modulates it
  // gently; this prevents colored gems from becoming synthetic rainbow glass.
  const dispersion=Number(material.dispersion??0);
  const fireScale=.94+fire*.08;
  material.dispersion=Math.max(0,dispersion*fireScale);

  // Colored stones benefit from slightly stronger facet separation than a
  // transparent-glass look. Diamonds/moissanite retain their own dedicated
  // optical path below this layer.
  if(family!=="Diamante" && family!=="Moissanita"){
    material.roughness=Math.max(.006,Number(material.roughness??.02)*(1-.035*facetContrast));
  }

  material.userData={
    ...(material.userData??{}),
    aurumFamilyOpticalResponse:{
      family,
      brilliance,
      fire,
      facetContrast,
      internalReflection:Number(profile.internalReflection??.8),
    },
  };
  material.needsUpdate=true;
  return material;
};
