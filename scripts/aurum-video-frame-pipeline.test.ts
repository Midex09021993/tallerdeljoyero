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

test("AURUM video beauty passes respect diamond FXAA preference and settled Surface Edge AA without TAA", () => {
  const renderPass = { name: "render" };
  const gemMaskPass = { name: "gem-mask" };
  const fxaaPass = { name: "fxaa" };
  const surfaceEdgeAaPass = { name: "surface-edge-aa" };
  const outputPass = { name: "output" };

  const defaultPasses = getAurumVideoLivePasses({
    renderPass, gemMaskPass, fxaaPass, surfaceEdgeAaPass, outputPass,
  });
  expect(defaultPasses).toEqual([renderPass, gemMaskPass, outputPass]);

  const passes = getAurumVideoLivePasses({
    renderPass, gemMaskPass, fxaaPass, surfaceEdgeAaPass,
    gemFxaaEnabled: true, surfaceEdgeAaEnabled: true, outputPass,
  });
  expect(passes).toEqual([renderPass, gemMaskPass, fxaaPass, surfaceEdgeAaPass, outputPass]);

  const withoutEdgeAa = getAurumVideoLivePasses({
    renderPass, gemMaskPass, fxaaPass, surfaceEdgeAaPass,
    gemFxaaEnabled: true, surfaceEdgeAaEnabled: false, outputPass,
  });
  expect(withoutEdgeAa).toEqual([renderPass, gemMaskPass, fxaaPass, outputPass]);

  const withFxaaDisabled = getAurumVideoLivePasses({
    renderPass, gemMaskPass, fxaaPass, surfaceEdgeAaPass,
    gemFxaaEnabled: false, surfaceEdgeAaEnabled: false, outputPass,
  });
  expect(withFxaaDisabled).toEqual([renderPass, gemMaskPass, outputPass]);
  expect(withFxaaDisabled).not.toContain(fxaaPass);
  expect(passes.some((pass: any) => pass?.name === "taa")).toBe(false);
});


test("AURUM video frame plan uses fixed timestamps and an exact frame count", async () => {
  const { createAurumVideoFramePlan } = await import("../src/lib/aurum/video-exporter");
  const plan = createAurumVideoFramePlan(2, 30);
  expect(plan).toHaveLength(60);
  expect(plan[0]).toEqual({ index: 0, timestampSeconds: 0 });
  expect(plan[1]?.timestampSeconds).toBeCloseTo(1 / 30);
  expect(plan[59]?.timestampSeconds).toBeCloseTo(59 / 30);
  expect(Object.isFrozen(plan)).toBe(true);
  expect(Object.isFrozen(plan[0])).toBe(true);
});

test("AURUM video frame plan clamps unsafe duration and frame-rate inputs", async () => {
  const { createAurumVideoFramePlan } = await import("../src/lib/aurum/video-exporter");
  // Invalid duration falls back to 5 seconds and FPS is clamped to 15.
  expect(createAurumVideoFramePlan(0, 1)).toHaveLength(75);
  expect(createAurumVideoFramePlan(100, 240)).toHaveLength(2400);
});


test("AURUM WebCodecs bitrate is a positive integer and matches the 1080p30 target", async () => {
  const { calculateAurumVideoBitrate } = await import("../src/lib/aurum/video-exporter");
  const bitrate = calculateAurumVideoBitrate(1920, 1080, 30);
  expect(bitrate).toBe(13_000_000);
  expect(Number.isSafeInteger(bitrate)).toBe(true);
  expect(bitrate).toBeGreaterThan(0);
});

test("AURUM WebCodecs bitrate rejects invalid dimensions and frame rates", async () => {
  const { calculateAurumVideoBitrate } = await import("../src/lib/aurum/video-exporter");
  expect(() => calculateAurumVideoBitrate(0, 1080, 30)).toThrow(/tasa de bits válida/);
  expect(() => calculateAurumVideoBitrate(1920, 1080, 0)).toThrow(/tasa de bits válida/);
});

test("AURUM background parser keeps CSS gradients intact without SVG foreignObject", async () => {
  const { parseAurumBackgroundLayers } = await import("../src/lib/aurum/video-exporter");
  const layers = parseAurumBackgroundLayers("linear-gradient(135deg, #ffffff 0%, #eeeeec 48%, #bfc1c0 100%)");
  expect(layers).toEqual([{ kind: "gradient", value: "linear-gradient(135deg, #ffffff 0%, #eeeeec 48%, #bfc1c0 100%)" }]);
});

test("AURUM background parser recognizes local and embedded SVG image layers", async () => {
  const { parseAurumBackgroundLayers } = await import("../src/lib/aurum/video-exporter");
  const layers = parseAurumBackgroundLayers('url("/backgrounds/aurum-estudio-fotografico.svg")');
  expect(layers).toEqual([{ kind: "image", value: "/backgrounds/aurum-estudio-fotografico.svg" }]);
  expect(parseAurumBackgroundLayers("none")).toEqual([]);
});

test("AURUM MP4 encoder accepts standard 4K landscape and portrait frames", async () => {
  const { assertAurumVideoFrameBudget } = await import("../src/lib/aurum/video-exporter");
  expect(() => assertAurumVideoFrameBudget(3840, 2160)).not.toThrow();
  expect(() => assertAurumVideoFrameBudget(2160, 3840)).not.toThrow();
});

test("AURUM MP4 encoder rejects frame sizes above the documented H.264 WebCodecs budget", async () => {
  const { assertAurumVideoFrameBudget } = await import("../src/lib/aurum/video-exporter");
  expect(() => assertAurumVideoFrameBudget(3840, 3840)).toThrow(/9,437,184/);
  expect(() => assertAurumVideoFrameBudget(0, 1080)).toThrow(/dimensiones válidas/);
});


test("AURUM video background loader identifies SVG by MIME type", async () => {
  const { isAurumSvgBlob } = await import("../src/lib/aurum/video-exporter");
  expect(await isAurumSvgBlob(new Blob(["<svg/>"], { type: "image/svg+xml" }))).toBe(true);
});

test("AURUM video background loader identifies SVG content without a MIME type", async () => {
  const { isAurumSvgBlob } = await import("../src/lib/aurum/video-exporter");
  const svg = new Blob(['<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'], { type: "application/octet-stream" });
  expect(await isAurumSvgBlob(svg)).toBe(true);
  expect(await isAurumSvgBlob(new Blob(["plain image payload"], { type: "application/octet-stream" }))).toBe(false);
});
