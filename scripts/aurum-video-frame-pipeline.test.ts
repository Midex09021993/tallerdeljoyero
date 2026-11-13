import { expect, test } from "bun:test";
import { createAurumVideoFramePipeline } from "../src/lib/aurum/video-frame-pipeline";

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
