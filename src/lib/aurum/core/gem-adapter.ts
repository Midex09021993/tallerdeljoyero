/**
 * AURUM CORE — Gem Engine Adapter.
 *
 * Stable boundary for the existing gemstone material pipeline. It delegates
 * to the production optical engine without changing shader, BVH, HDRI,
 * scintillation, thickness, inclusion or family calibration behavior.
 */
import {
  applyAurumGem,
  applyAurumOpticalProfile,
  applyAurumDiamondOptics,
  applyAurumReferenceGemOptics,
  getAurumOpticalProfile,
} from "../../aurum-material-engine";

import { createAurumReadonlyMap } from "./readonly-map";

export const AURUM_GEM_SERVICES = {
  applyBaseMaterial: "aurum.gem.apply-base-material",
  applyOpticalProfile: "aurum.gem.apply-optical-profile",
  applyDiamondOptics: "aurum.gem.apply-diamond-optics",
  applyReferenceOptics: "aurum.gem.apply-reference-optics",
  getOpticalProfile: "aurum.gem.get-optical-profile",
} as const;

export interface AurumGemAdapter {
  readonly services: ReadonlyMap<string, unknown>;
  applyBaseMaterial(material: unknown, preset: unknown, thickness: number): unknown;
  applyOpticalProfile(material: unknown, profile: unknown): unknown;
  applyDiamondOptics(material: unknown): unknown;
  applyReferenceOptics(material: unknown, family: string): unknown;
  getOpticalProfile(family: string): ReturnType<typeof getAurumOpticalProfile>;
}

export function createAurumGemAdapter(): AurumGemAdapter {
  const services = createAurumReadonlyMap(new Map<string, unknown>([
    [AURUM_GEM_SERVICES.applyBaseMaterial, applyAurumGem],
    [AURUM_GEM_SERVICES.applyOpticalProfile, applyAurumOpticalProfile],
    [AURUM_GEM_SERVICES.applyDiamondOptics, applyAurumDiamondOptics],
    [AURUM_GEM_SERVICES.applyReferenceOptics, applyAurumReferenceGemOptics],
    [AURUM_GEM_SERVICES.getOpticalProfile, getAurumOpticalProfile],
  ]));

  return Object.freeze({
    services,
    applyBaseMaterial: (material: unknown, preset: unknown, thickness: number) =>
      applyAurumGem(material, preset as any, thickness),
    applyOpticalProfile: (material: unknown, profile: unknown) =>
      applyAurumOpticalProfile(material, profile as any),
    applyDiamondOptics: (material: unknown) => applyAurumDiamondOptics(material),
    applyReferenceOptics: (material: unknown, family: string) =>
      applyAurumReferenceGemOptics(material, family),
    getOpticalProfile: (family: string) => getAurumOpticalProfile(family),
  });
}
