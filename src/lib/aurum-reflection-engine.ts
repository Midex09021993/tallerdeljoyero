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
    softbox:source(10.5,7.0,1.95,[3.8,5.8,4.8]),
    strip:source(3.0,10.5,.92,[-3.8,3.6,3.0]),
    front:source(6.0,4.0,.38,[0,3.1,5.8]),
    kicker:source(2.6,8.2,.72,[4.4,4.0,-3.0]),
    edgeLeft:source(1.15,6.8,.42,[-4.8,3.8,1.2]),
    edgeRight:source(1.15,6.8,.38,[4.8,3.8,1.2]),
  },
  studioHard:{
    softbox:source(7.0,4.0,1.28,[3.8,5.8,4.8]),
    strip:source(1.8,7.2,.48,[-3.8,3.5,3.0]),
    front:source(4.8,3.0,.24,[0,3.0,5.6]),
    kicker:source(1.5,7.8,1.02,[4.2,4.0,-2.8]),
    edgeLeft:source(.8,6.0,.18,[-4.6,3.8,1.0]),
    edgeRight:source(.8,6.0,.22,[4.6,3.8,1.0]),
  },
  jewelry:{
    softbox:source(11.5,7.5,2.35,[3.8,5.8,4.8]),
    strip:source(2.8,11.0,1.02,[-3.8,3.6,3.0]),
    front:source(6.5,4.4,.46,[0,3.1,5.8]),
    kicker:source(2.4,8.6,.78,[4.4,4.0,-3.0]),
    edgeLeft:source(1.0,6.4,.34,[-4.7,3.8,1.1]),
    edgeRight:source(1.0,6.4,.32,[4.7,3.8,1.1]),
  },
  luxury:{
    softbox:source(6.0,3.6,1.08,[3.8,5.8,4.8]),
    strip:source(1.5,6.5,.34,[-3.8,3.5,3.0]),
    front:source(4.0,2.6,.18,[0,3.0,5.6]),
    kicker:source(1.4,8.8,1.38,[4.2,4.0,-2.8]),
    edgeLeft:source(.85,6.2,.20,[-4.6,3.8,1.0]),
    edgeRight:source(.85,6.2,.26,[4.6,3.8,1.0]),
  },
};

export const getAurumReflectionRigProfile=(id:string):AurumReflectionRigProfile=>
  AURUM_REFLECTION_RIG_PROFILES[id]??AURUM_REFLECTION_RIG_PROFILES.jewelry;
