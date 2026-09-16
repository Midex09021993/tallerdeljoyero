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
  edgeLeft:AurumReflectionSourceProfile;
  edgeRight:AurumReflectionSourceProfile;
};

const source=(width:number,height:number,intensity:number,position:[number,number,number]):AurumReflectionSourceProfile=>({
  width,height,intensity,position,
});

export const AURUM_REFLECTION_RIG_PROFILES:Record<string,AurumReflectionRigProfile>={
  studioSoft:{
    softbox:source(12.5,8.5,1.55,[3.8,5.8,4.8]),
    strip:source(3.4,11.5,.72,[-3.8,3.6,3.0]),
    front:source(6.8,4.8,.28,[0,3.1,5.8]),
    kicker:source(2.8,8.8,.60,[4.4,4.0,-3.0]),
    edgeLeft:source(1.25,7.2,.32,[-4.8,3.8,1.2]),
    edgeRight:source(1.25,7.2,.30,[4.8,3.8,1.2]),
  },
  studioHard:{
    softbox:source(8.0,4.8,1.05,[3.8,5.8,4.8]),
    strip:source(2.0,7.8,.36,[-3.8,3.5,3.0]),
    front:source(5.2,3.4,.18,[0,3.0,5.6]),
    kicker:source(1.6,8.4,.82,[4.2,4.0,-2.8]),
    edgeLeft:source(.9,6.4,.14,[-4.6,3.8,1.0]),
    edgeRight:source(.9,6.4,.17,[4.6,3.8,1.0]),
  },
  jewelry:{
    softbox:source(13.5,9.0,1.72,[3.8,5.8,4.8]),
    strip:source(3.2,11.8,.78,[-3.8,3.6,3.0]),
    front:source(7.0,5.0,.30,[0,3.1,5.8]),
    kicker:source(2.6,9.0,.62,[4.4,4.0,-3.0]),
    edgeLeft:source(1.1,6.8,.25,[-4.7,3.8,1.1]),
    edgeRight:source(1.1,6.8,.24,[4.7,3.8,1.1]),
  },
  luxury:{
    softbox:source(7.0,4.2,.88,[3.8,5.8,4.8]),
    strip:source(1.7,7.0,.26,[-3.8,3.5,3.0]),
    front:source(4.4,2.9,.12,[0,3.0,5.6]),
    kicker:source(1.5,9.2,1.08,[4.2,4.0,-2.8]),
    edgeLeft:source(.9,6.5,.15,[-4.6,3.8,1.0]),
    edgeRight:source(.9,6.5,.19,[4.6,3.8,1.0]),
  },
};

export const getAurumReflectionRigProfile=(id:string):AurumReflectionRigProfile=>
  AURUM_REFLECTION_RIG_PROFILES[id]??AURUM_REFLECTION_RIG_PROFILES.jewelry;
