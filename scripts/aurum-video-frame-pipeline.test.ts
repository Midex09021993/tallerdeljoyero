import { expect, test } from "bun:test";
import { createAurumVideoFramePipeline, getAurumVideoLivePasses } from "../src/lib/aurum/video-frame-pipeline";

test("AURUM video frames use the live composition passes and restore composer state", () => {
  const calls: string[] = [];
  const livePass = { enabled: true };
  const photographicPass = { enabled: true };
  const fxaaPass = { enabled: true };
  const outputPass = { enabled: true };
  const composer = {
    passes: [livePass, photographicPass, fxaaPass, outputPass],
    getPixelRatio: () => 1.5,
    setPixelRatio: (value: number) => { calls.push("pixelRatio:" + value); },
    setSize: (width: number, height: number) => { calls.push("size:" + width + "x" + height); },
    render: () => { calls.push("composer.render"); },
  };
  const renderer = { render: () => { calls.push("renderer.render"); } };
  const bvh = { update: () => { calls.push("bvh.update"); } };

  const pipeline = createAurumVideoFramePipeline({
    composer,
    renderer,
    scene: {},
    camera: {},
    diamondBvhRuntime: bvh,
    livePasses: [livePass, fxaaPass, outputPass],
    width: 2560,
    height: 1440,
    restoreWidth: 960,
    restoreHeight: 540,
  });

  expect(livePass.enabled).toBe(true);
  expect(photographicPass.enabled).toBe(false);
  expect(fxaaPass.enabled).toBe(true);
  expect(outputPass.enabled).toBe(true);
  pipeline.renderFrame();
  expect(calls.slice(-2)).toEqual(["bvh.update", "composer.render"]);

  pipeline.restore();
  pipeline.restore();
  expect(calls.filter((call) => call === "pixelRatio:1.5")).toHaveLength(1);
  expect(calls).toContain("size:960x540");
  expect(photographicPass.enabled).toBe(true);
  expect(livePass.enabled).toBe(true);
});

test("AURUM video frame pipeline falls back to the renderer when no composer exists", () => {
  const calls: string[] = [];
  const pipeline = createAurumVideoFramePipeline({
    composer: null,
    renderer: { render: () => { calls.push("renderer.render"); } },
    scene: {},
    camera: {},
    livePasses: [],
    width: 1280,
    height: 720,
    restoreWidth: 800,
    restoreHeight: 450,
  });

  pipeline.renderFrame();
  pipeline.restore();
  expect(calls).toEqual(["renderer.render"]);
});

test("AURUM video pipeline rolls back partial composer setup when initialization fails", () => {
  const calls: string[] = [];
  const livePass = { enabled: false };
  const nonLivePass = { enabled: true };
  let setup = true;
  const composer = {
    passes: [livePass, nonLivePass],
    getPixelRatio: () => 2,
    setPixelRatio: (value: number) => { calls.push("pixelRatio:" + value); },
    setSize: (width: number, height: number) => {
      calls.push("size:" + width + "x" + height);
      if (setup && width === 1920) {
        setup = false;
        throw new Error("setup failed");
      }
    },
    render: () => { calls.push("composer.render"); },
  };

  expect(() => createAurumVideoFramePipeline({
    composer,
    renderer: {},
    scene: {},
    camera: {},
    livePasses: [livePass],
    width: 1920,
    height: 1080,
    restoreWidth: 800,
    restoreHeight: 450,
  })).toThrow("setup failed");

  expect(calls).toContain("pixelRatio:2");
  expect(calls).toContain("size:800x450");
  expect(livePass.enabled).toBe(false);
  expect(nonLivePass.enabled).toBe(true);
});

test("AURUM video pipeline refuses to render after restoration", () => {
  const pipeline = createAurumVideoFramePipeline({
    composer: null,
    renderer: { render: () => undefined },
    scene: {},
    camera: {},
    livePasses: [],
    width: 1280,
    height: 720,
    restoreWidth: 800,
    restoreHeight: 450,
  });
  pipeline.restore();
  expect(() => pipeline.renderFrame()).toThrow("ya fue restaurado");
});

test("AURUM video beauty passes include settled Surface Edge AA when enabled and never add TAA", () => {
  const renderPass = { name: "render" };
  const gemMaskPass = { name: "gem-mask" };
  const fxaaPass = { name: "fxaa" };
  const surfaceEdgeAaPass = { name: "surface-edge-aa" };
  const outputPass = { name: "output" };
  const passes = getAurumVideoLivePasses({
    renderPass, gemMaskPass, fxaaPass, surfaceEdgeAaPass,
    surfaceEdgeAaEnabled: true, outputPass,
  });
  expect(passes).toEqual([renderPass, gemMaskPass, fxaaPass, surfaceEdgeAaPass, outputPass]);

  const withoutEdgeAa = getAurumVideoLivePasses({
    renderPass, gemMaskPass, fxaaPass, surfaceEdgeAaPass,
    surfaceEdgeAaEnabled: false, outputPass,
  });
  expect(withoutEdgeAa).toEqual([renderPass, gemMaskPass, fxaaPass, outputPass]);
  expect(passes.some((pass: any) => pass?.name === "taa")).toBe(false);
});
