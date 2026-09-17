import type { AurumOpticalProfile } from "../aurum-material-engine";

/**
 * Controlled volume response for transparent colored gems.
 * Keeps authored optical constants while making thickness/absorption read
 * more naturally instead of treating every stone like clear glass.
 */
export const applyAurumInternalLightResponse=(material:any,profile:AurumOpticalProfile,thickness:number)=>{
  if(!material) return material;

  const family=String(material.userData?.aurumGemFamily??"");
  const t=Math.max(.015,Number(thickness??.015));
  const absorption=Math.max(.05,Number(profile.absorptionDistance??10));
  const reflection=Math.max(0,Math.min(1,Number(profile.internalReflection??.8)));

  // The authored attenuation distance remains the authority. We only apply
  // a restrained geometry-aware correction so thicker stones show more depth.
  const familyScale=family==="Esmeralda" ? .86
    : family==="Rubí" ? .90
    : family==="Zafiro" ? .92
    : family==="Diamante" || family==="Moissanita" ? 1.02
    : .96;
  const depthFactor=Math.max(.78,Math.min(1.12,1-(t/(absorption+t))*0.22));
  const correctedDistance=Math.max(.05,absorption*familyScale*depthFactor*(.92+reflection*.08));

  material.attenuationDistance=correctedDistance;
  material.userData={
    ...(material.userData??{}),
    aurumInternalLightResponse:{
      family,
      thickness:t,
      authoredAbsorptionDistance:absorption,
      effectiveAttenuationDistance:correctedDistance,
      internalReflection:reflection,
      version:"v1",
    },
  };
  material.needsUpdate=true;
  return material;
};
