/**
 * AURUM REFLECTION STUDIO v1.0
 *
 * Reflection-source profiles for polished jewelry.
 * iJewel documents HDR environments as a critical part of the final look and
 * exposes environment rotation/intensity independently. AURUM complements
 * that global environment with broad, camera-scale reflection sources so
 * polished metal receives intentional gradients instead of arbitrary white
 * hotspots.
 *
 * These are original AURUM profiles; they do not copy proprietary iJewel
 * assets, shaders or implementation.
 */
export type AurumReflectionSourceProfile = {
  width:number;
  height:number;
  intensity:number;
  position:[number,number,number];
};

export type AurumReflectionRigProfile = {
  softbox:AurumReflectionSourceProfile;
  strip:AurumReflectionSourceProfile;
  front:AurumReflectionSourceProfile;
  kicker:AurumReflectionSourceProfile;
};

const source=(width:number,height:number,intensity:number,position:[number,number,number]):AurumReflectionSourceProfile=>({
  width,height,intensity,position,
});

export const AURUM_REFLECTION_RIG_PROFILES:Record<string,AurumReflectionRigProfile>={
  studioSoft:{
    softbox:source(9.5,6.5,2.05,[3.8,5.8,4.8]),
    strip:source(2.8,9.5,.72,[-3.8,3.5,3.0]),
    front:source(6.8,4.6,.58,[0,3.0,5.6]),
    kicker:source(2.4,7.4,.55,[4.2,4.0,-2.8]),
  },
  studioHard:{
    softbox:source(7.0,4.0,1.28,[3.8,5.8,4.8]),
    strip:source(1.8,7.2,.48,[-3.8,3.5,3.0]),
    front:source(4.8,3.0,.24,[0,3.0,5.6]),
    kicker:source(1.5,7.8,1.02,[4.2,4.0,-2.8]),
  },
  jewelry:{
    softbox:source(10.5,7.0,2.55,[3.8,5.8,4.8]),
    strip:source(2.5,10.5,.90,[-3.8,3.5,3.0]),
    front:source(7.0,4.8,.72,[0,3.0,5.6]),
    kicker:source(2.2,8.2,.70,[4.2,4.0,-2.8]),
  },
  luxury:{
    softbox:source(6.0,3.6,1.08,[3.8,5.8,4.8]),
    strip:source(1.5,6.5,.34,[-3.8,3.5,3.0]),
    front:source(4.0,2.6,.18,[0,3.0,5.6]),
    kicker:source(1.4,8.8,1.38,[4.2,4.0,-2.8]),
  },
};

export const getAurumReflectionRigProfile=(id:string):AurumReflectionRigProfile=>
  AURUM_REFLECTION_RIG_PROFILES[id]??AURUM_REFLECTION_RIG_PROFILES.jewelry;
