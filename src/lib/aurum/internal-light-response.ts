import * as THREE from "three";
import type { AurumOpticalProfile } from "../aurum-material-engine";

/**
 * Controlled volumetric response for transparent colored gems.
 *
 * The spectral proxy is intentionally broad, not a reconstruction of a measured
 * laboratory spectrum. It follows the visible absorption windows documented by
 * GIA: ruby strongly absorbs blue/green regions while transmitting red; emerald
 * has strong blue/red-side absorption associated with Cr/V/Fe; blue sapphire
 * has a strong Fe-Ti absorption around 580 nm, suppressing yellow/green light.
 */
export const applyAurumInternalLightResponse=(material:any,profile:AurumOpticalProfile,thickness:number)=>{
  if(!material) return material;

  const family=String(material.userData?.aurumGemFamily??"");
  const t=Math.max(.015,Number(thickness??.015));
  const absorption=Math.max(.05,Number(profile.absorptionDistance??10));
  const reflection=Math.max(0,Math.min(1,Number(profile.internalReflection??.8)));

  const familyScale=family==="Esmeralda" ? .58
    : family==="Rubí" ? .68
    : family==="Zafiro" ? .74
    : family==="Diamante" || family==="Moissanita" ? 1.04
    : .86;

  // Broad visible-spectrum transmission proxy derived from documented GIA
  // absorption behavior. These are relative channel weights, not measured
  // RGB absorption coefficients.
  const spectral=family==="Rubí" ? {r:1.00,g:.78,b:.58}
    : family==="Esmeralda" ? {r:.68,g:1.00,b:.62}
    : family==="Zafiro" ? {r:.84,g:.64,b:1.00}
    : family==="Diamante" || family==="Moissanita" ? {r:1.00,g:1.00,b:1.00}
    : {r:1.00,g:1.00,b:1.00};

  const authoredAttenuationColor=Number(profile.attenuationColor??0xffffff);
  const authoredColor=new THREE.Color(authoredAttenuationColor);
  const attenuationColor=new THREE.Color(
    authoredColor.r*spectral.r,
    authoredColor.g*spectral.g,
    authoredColor.b*spectral.b,
  );
  material.attenuationColor?.copy?.(attenuationColor);

  const depthResponse=1-Math.exp(-t/absorption);
  const depthFactor=Math.max(.76,Math.min(1.04,1-depthResponse*.30));
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
      spectralAbsorptionProxyVersion:"gia-visible-windows-v1",
      spectralTransmissionProxy:spectral,
      authoredAttenuationColor:"#" + authoredAttenuationColor.toString(16).padStart(6,"0"),
    },
  };
  material.needsUpdate=true;
  return material;
};
