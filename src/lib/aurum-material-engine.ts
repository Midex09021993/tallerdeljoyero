import * as THREE from "three";

/**
 * AURUM MATERIAL ENGINE v1.2
 * Motor independiente para materiales PBR de joyería y gemas.
 */

export type AurumMetalPreset = {
  id?:string;
  color:number; metalness:number; roughness:number; envMapIntensity:number;
  clearcoat:number; anisotropy?:number; anisotropyRotation?:number;
};