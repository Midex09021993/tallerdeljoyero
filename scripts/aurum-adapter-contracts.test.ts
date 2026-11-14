import { expect, test } from "bun:test";
import { createAurumReadonlyMap } from "../src/lib/aurum/core/readonly-map";
import { createAurumViewerAdapter } from "../src/lib/aurum/core/viewer-adapter";
import { createAurumSceneAdapter } from "../src/lib/aurum/core/scene-adapter";
import { createAurumLightingAdapter } from "../src/lib/aurum/core/lighting-adapter";
import { createAurumMetalAdapter } from "../src/lib/aurum/core/metal-adapter";
import { createAurumGemAdapter } from "../src/lib/aurum/core/gem-adapter";
import { createAurumRenderPipelineContract } from "../src/lib/aurum/core/render-pipeline-contract";
import { createAurumMediaExportContract } from "../src/lib/aurum/core/media-export-contract";
import { createAurumOpticalContract } from "../src/lib/aurum/core/optical-contract";

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


test("AURUM render contract maps motion and settled modes without enabling TAA", () => {
  const motionStates: boolean[] = [];
  const taaPass = { enabled: false, accumulate: false };
  const runtime = {
    composer: {}, renderPass: {}, gemMaskPass: {}, fxaaPass: {},
    surfaceEdgeAaPass: {}, outputPass: {}, taaPass,
    setTemporalMotion: (active: boolean) => motionStates.push(active),
    updateTemporal: () => undefined,
    resetTemporalAccumulation: () => undefined,
    applyQuality: () => undefined,
  };
  const contract = createAurumRenderPipelineContract(runtime);

  expect(contract.getMode()).toBe("RESTING_SETTLED");
  contract.setMode("LIVE_MOTION");
  expect(contract.getMode()).toBe("LIVE_MOTION");
  contract.setMode("RESTING_SETTLED");
  contract.setMode("CAPTURE");

  expect(motionStates).toEqual([false, true, false, false]);
  expect(taaPass.enabled).toBe(false);
  expect(taaPass.accumulate).toBe(false);
});

test("AURUM media export contract exposes the production frame and recorder boundaries", () => {
  const contract = createAurumMediaExportContract();
  expect(typeof contract.createFramePipeline).toBe("function");
  expect(typeof contract.recordCanvas).toBe("function");
});


test("AURUM optical contract composes typed metal and gem boundaries", () => {
  const optical = createAurumOpticalContract();
  expect(typeof optical.metal.apply).toBe("function");
  expect(typeof optical.metal.createPreset).toBe("function");
  expect(typeof optical.gem.applyBaseMaterial).toBe("function");
  expect(typeof optical.gem.applyDiamondOptics).toBe("function");
});
