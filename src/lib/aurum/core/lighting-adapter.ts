/**
 * AURUM CORE — Lighting Adapter.
 *
 * Stable access to the established production lighting controller.
 * Presets, reflector profiles, gem shader synchronization, shadows and HDRI
 * ownership remain inside the existing lighting/environment modules.
 */
import type { AurumLightingController } from "../lighting";

import { createAurumReadonlyMap } from "./readonly-map";

export const AURUM_LIGHTING_SERVICES = {
  controller: "aurum.lighting.controller",
  lights: "aurum.lighting.lights",
} as const;

export interface AurumLightingAdapter {
  readonly services: ReadonlyMap<string, unknown>;
  readonly lights: AurumLightingController["lights"];
  create(): void;
  applyPreset(id: string): void;
  update(patch: unknown): void;
  scaleToModel(radius: number, targetY: number): void;
  applyIJEWELShadowProfile(profile: unknown): boolean;
  dispose(): void;
}

export function createAurumLightingAdapter(controller: AurumLightingController): AurumLightingAdapter {
  const services = createAurumReadonlyMap(new Map<string, unknown>([
    [AURUM_LIGHTING_SERVICES.controller, controller],
    [AURUM_LIGHTING_SERVICES.lights, controller.lights],
  ]));

  return Object.freeze({
    services,
    lights: controller.lights,
    create: () => controller.create(),
    applyPreset: (id: string) => controller.applyPreset(id),
    update: (patch: unknown) => controller.update(patch),
    scaleToModel: (radius: number, targetY: number) => controller.scaleToModel(radius, targetY),
    applyIJEWELShadowProfile: (profile: unknown) => controller.applyIJEWELShadowProfile(profile),
    dispose: () => controller.dispose(),
  });
}
