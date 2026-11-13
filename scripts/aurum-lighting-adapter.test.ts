import { expect, test } from "bun:test";
import { createAurumLightingAdapter, AURUM_LIGHTING_SERVICES } from "../src/lib/aurum/core/lighting-adapter";
import type { AurumLightingController } from "../src/lib/aurum/lighting";

test("AURUM Lighting Adapter forwards production controller operations and preserves light references", () => {
  const calls: unknown[][] = [];
  const lights = { key: { intensity: 1 }, gem: { intensity: 0.5 } };
  const controller: AurumLightingController = {
    lights,
    create: () => { calls.push(["create"]); },
    applyPreset: (id) => { calls.push(["applyPreset", id]); },
    update: (patch) => { calls.push(["update", patch]); },
    scaleToModel: (radius, targetY) => { calls.push(["scaleToModel", radius, targetY]); },
    applyIJEWELShadowProfile: (profile) => { calls.push(["shadow", profile]); return true; },
    dispose: () => { calls.push(["dispose"]); },
  };
  const adapter = createAurumLightingAdapter(controller);
  const patch = { key: { intensity: 2 } };
  const shadowProfile = { bias: -0.001 };

  expect(adapter.lights).toBe(lights);
  expect(adapter.services.get(AURUM_LIGHTING_SERVICES.controller)).toBe(controller);
  expect(adapter.services.get(AURUM_LIGHTING_SERVICES.lights)).toBe(lights);
  adapter.create();
  adapter.applyPreset("jewelry");
  adapter.update(patch);
  adapter.scaleToModel(2.5, 0.2);
  expect(adapter.applyIJEWELShadowProfile(shadowProfile)).toBe(true);
  adapter.dispose();

  expect(calls).toEqual([
    ["create"],
    ["applyPreset", "jewelry"],
    ["update", patch],
    ["scaleToModel", 2.5, 0.2],
    ["shadow", shadowProfile],
    ["dispose"],
  ]);
});
