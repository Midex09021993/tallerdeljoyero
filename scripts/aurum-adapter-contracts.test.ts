import { expect, test } from "bun:test";
import { createAurumReadonlyMap } from "../src/lib/aurum/core/readonly-map";
import { createAurumViewerAdapter } from "../src/lib/aurum/core/viewer-adapter";
import { createAurumSceneAdapter } from "../src/lib/aurum/core/scene-adapter";
import { createAurumLightingAdapter } from "../src/lib/aurum/core/lighting-adapter";
import { createAurumMetalAdapter } from "../src/lib/aurum/core/metal-adapter";
import { createAurumGemAdapter } from "../src/lib/aurum/core/gem-adapter";

function expectRuntimeReadonlyMap(map: ReadonlyMap<string, unknown>) {
  expect(typeof (map as any).set).toBe("undefined");
  expect(typeof (map as any).delete).toBe("undefined");
  expect(typeof (map as any).clear).toBe("undefined");
  expect(Object.isFrozen(map)).toBe(true);
}

test("AURUM readonly map snapshots entries and exposes no runtime mutation methods", () => {
  const source = new Map<string, unknown>([["aurum.initial", { ready: true }]]);
  const readonly = createAurumReadonlyMap(source);

  source.set("aurum.late", {});
  expectRuntimeReadonlyMap(readonly);
  expect(readonly.size).toBe(1);
  expect(readonly.has("aurum.initial")).toBe(true);
  expect(readonly.has("aurum.late")).toBe(false);

  const visited: string[] = [];
  readonly.forEach((_value, key, callbackMap) => {
    visited.push(key);
    expect(callbackMap).toBe(readonly);
  });
  expect(visited).toEqual(["aurum.initial"]);
});

test("AURUM production adapters expose runtime-readonly service contracts", () => {
  const viewer = createAurumViewerAdapter({
    scene: {},
    camera: {},
    renderer: {},
    controls: {},
    host: {} as HTMLElement,
  });

  const sceneController = {
    apply: () => ({}),
    setBackground: () => undefined,
    getBackground: () => "white",
  };
  const scene = createAurumSceneAdapter(sceneController as any);

  const lightingController = {
    lights: [],
    create: () => undefined,
    applyPreset: () => undefined,
    update: () => undefined,
    scaleToModel: () => undefined,
    applyIJEWELShadowProfile: () => true,
    dispose: () => undefined,
  };
  const lighting = createAurumLightingAdapter(lightingController as any);
  const metal = createAurumMetalAdapter();
  const gem = createAurumGemAdapter();

  for (const adapter of [viewer, scene, lighting, metal, gem]) {
    expectRuntimeReadonlyMap(adapter.services);
  }

  expect(viewer.services.size).toBe(5);
  expect(scene.services.size).toBe(1);
  expect(lighting.services.size).toBe(2);
  expect(metal.services.size).toBe(4);
  expect(gem.services.size).toBe(5);
});
