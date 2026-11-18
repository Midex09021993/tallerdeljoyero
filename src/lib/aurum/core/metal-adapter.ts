/**
 * AURUM CORE — Metal Engine Adapter.
 *
 * Stable service boundary for the production jewelry-metal material pipeline.
 * The underlying PBR calibration, surface microstructure and reference optics
 * remain owned by aurum-material-engine; this adapter only delegates calls.
 */
import {
  applyAurumMetal,
  applyAurumReferenceMetalOptics,
  getAurumMetalReflectionResponse,
  metalPresetFromConfig,
  type AurumMetalPreset,
} from "../../aurum-material-engine";

import { createAurumReadonlyMap } from "./readonly-map";
import type { IAurumMetalOpticalContract } from "./module-contracts";

export const AURUM_METAL_SERVICES = {
  apply: "aurum.metal.apply",
  presetFromConfig: "aurum.metal.preset-from-config",
  reflectionResponse: "aurum.metal.reflection-response",
  applyReferenceOptics: "aurum.metal.reference-optics",
} as const;

export interface AurumMetalAdapter extends IAurumMetalOpticalContract {
  readonly services: ReadonlyMap<string, unknown>;
  createPreset(config: unknown): AurumMetalPreset;
  getReflectionResponse(preset: AurumMetalPreset): ReturnType<typeof getAurumMetalReflectionResponse>;
  apply(material: unknown, preset: AurumMetalPreset): unknown;
  applyReferenceOptics(material: unknown, materialId: string): unknown;
}

export function createAurumMetalAdapter(): AurumMetalAdapter {
  const services = createAurumReadonlyMap(new Map<string, unknown>([
    [AURUM_METAL_SERVICES.apply, applyAurumMetal],
    [AURUM_METAL_SERVICES.presetFromConfig, metalPresetFromConfig],
    [AURUM_METAL_SERVICES.reflectionResponse, getAurumMetalReflectionResponse],
    [AURUM_METAL_SERVICES.applyReferenceOptics, applyAurumReferenceMetalOptics],
  ]));

  return Object.freeze({
    services,
    createPreset: (config: unknown) => metalPresetFromConfig(config),
    getReflectionResponse: (preset: AurumMetalPreset) => getAurumMetalReflectionResponse(preset),
    apply: (material: unknown, preset: AurumMetalPreset) => applyAurumMetal(material, preset),
    applyReferenceOptics: (material: unknown, materialId: string) =>
      applyAurumReferenceMetalOptics(material, materialId),
  });
}
