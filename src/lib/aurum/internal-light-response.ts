import type { AurumOpticalProfile } from "../aurum-material-engine";

/**
 * Controlled volume response for transparent colored gems.
 * Keeps authored optical constants while making thickness/absorption read
 * more naturally instead of treating every stone like clear glass.
 *
 * The response is based on a normalized Beer-Lambert-style depth term:
 * thicker geometry participates more strongly in absorption, while the
 * catalog's attenuation distance remains the physical authority for color.
 */
export const applyAurumInternalLightResponse=(material:any,profile:AurumOpticalProfile,thickness:number)=>{
  if(!material) return material;

  const family=String(material.userData?.aurumGemFamily??"");
  const t=Math.max(.015,Number(thickness??.015));
  const absorption=Math.max(.05,Number(profile.absorptionDistance??10));
  const reflection=Math.max(0,Math.min(1,Number(profile.internalReflection??.8)));

  // Increase only the family separation of volumetric absorption.
  // The authored IOR, transmission, dispersion, thickness map and lighting
  // remain untouched. Lower values produce a shorter effective attenuation
  // distance and therefore a visibly deeper body color.
  const familyScale=family==="Esmeralda" ? .58
    : family==="Rubí" ? .68
    : family==="Zafiro" ? .74
    : family==="Diamante" || family==="Moissanita" ? 1.04
    : .86;

  // Normalized depth response. This approaches 0 for very thin stones and
  // increases smoothly with thickness instead of using a fixed linear lift.
  const depthResponse=1-Math.exp(-t/absorption);
  const depthFactor=Math.max(.76,Math.min(1.04,1-depthResponse*.30));

  // Internal reflection preserves some light in high-IOR/high-reflection
  // families while absorption still increases with physical depth.
  const reflectionFactor=.94+reflection*.06;
  const correctedDistance=Math.max(.05,absorption*familyScale*depthFactor*reflectionFactor);

  material.attenuationDistance=correctedDistance;
  material.userData={
    ...(material.userData??{}),
    aurumInternalLightResponse:{
      family,
      thickness:t,
      authoredAbsorptionDistance:absorption,
      depthResponse,
      depthFactor,
      effectiveAttenuationDistance:correctedDistance,
      internalReflection:reflection,
      version:"v3-family-absorption",
    },
  };
  material.needsUpdate=true;
  return material;
};
