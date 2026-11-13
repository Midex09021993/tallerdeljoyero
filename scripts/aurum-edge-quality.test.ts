import { expect, test } from "bun:test";
import { inspectAurumEdgeCapabilities } from "../src/lib/aurum/edge-quality/edge-capabilities";
import { configureAurumComposerMsaa } from "../src/lib/aurum/edge-quality/edge-msaa";
import { setAurumEdgeAaResolution, setAurumSurfaceEdgeAaStrength, shouldEnableAurumEdgeAa } from "../src/lib/aurum/edge-quality/edge-surface-aa";
import { getAurumEdgeAaProfile } from "../src/lib/aurum/edge-quality/edge-aa-profiles";

test("AURUM edge capabilities clamp requested MSAA to WebGL2 device limits", () => {
  expect(inspectAurumEdgeCapabilities({ capabilities: { isWebGL2: true, maxSamples: 8 } }, 4)).toEqual({
    webgl2: true,
    maxSamples: 8,
    requestedSamples: 4,
    supportedSamples: 4,
  });
  expect(inspectAurumEdgeCapabilities({ capabilities: { isWebGL2: true, maxSamples: 2 } }, 8).supportedSamples).toBe(2);
  expect(inspectAurumEdgeCapabilities({ capabilities: { isWebGL2: false, maxSamples: 8 } }, 4).supportedSamples).toBe(0);
  expect(inspectAurumEdgeCapabilities({ capabilities: { isWebGL2: true, maxSamples: 0 } }, 4).supportedSamples).toBe(0);
});

test("AURUM composer MSAA configures both ping-pong targets consistently", () => {
  const composer = { renderTarget1: { samples: 0 }, renderTarget2: { samples: 0 } };
  const result = configureAurumComposerMsaa(
    { capabilities: { isWebGL2: true, maxSamples: 4 } },
    composer,
    4,
  );
  expect(result).toEqual({ activeSamples: 4, targetCount: 2, supported: true });
  expect(composer.renderTarget1.samples).toBe(4);
  expect(composer.renderTarget2.samples).toBe(4);
});

test("AURUM composer MSAA leaves native targets unchanged when unsupported", () => {
  const composer = { renderTarget1: { samples: 0 }, renderTarget2: { samples: 0 } };
  const result = configureAurumComposerMsaa(
    { capabilities: { isWebGL2: false, maxSamples: 0 } },
    composer,
    4,
  );
  expect(result).toEqual({ activeSamples: 0, targetCount: 0, supported: false });
  expect(composer.renderTarget1.samples).toBe(0);
  expect(composer.renderTarget2.samples).toBe(0);
});

test("AURUM composer MSAA does not partially configure ping-pong targets", () => {
  const first = { samples: 0 };
  const second = Object.defineProperty({}, "samples", {
    configurable: true,
    get: () => 0,
    set: () => { throw new Error("target unavailable"); },
  });
  const warn = console.warn;
  console.warn = () => undefined;
  try {
    const result = configureAurumComposerMsaa(
      { capabilities: { isWebGL2: true, maxSamples: 4 } },
      { renderTarget1: first, renderTarget2: second },
      4,
    );
    expect(result).toEqual({ activeSamples: 0, targetCount: 0, supported: false });
    expect(first.samples).toBe(0);
  } finally {
    console.warn = warn;
  }
});

test("AURUM composer MSAA safely falls back when composer targets are missing", () => {
  const result = configureAurumComposerMsaa(
    { capabilities: { isWebGL2: true, maxSamples: 4 } },
    { renderTarget1: { samples: 0 }, renderTarget2: null },
    4,
  );
  expect(result).toEqual({ activeSamples: 0, targetCount: 0, supported: false });
});


test("AURUM surface edge AA is enabled only for settled high-quality frames or still captures", () => {
  expect(shouldEnableAurumEdgeAa(true, false, false)).toBe(true);
  expect(shouldEnableAurumEdgeAa(true, true, false)).toBe(false);
  expect(shouldEnableAurumEdgeAa(false, false, false)).toBe(false);
  expect(shouldEnableAurumEdgeAa(true, true, true)).toBe(true);
});

test("AURUM edge AA resolution uses physical target dimensions", () => {
  const value = { x: 0, y: 0, set(x: number, y: number) { this.x = x; this.y = y; } };
  setAurumEdgeAaResolution({ material: { uniforms: { resolution: { value } } } }, 2400, 1600);
  expect(value.x).toBeCloseTo(1 / 2400);
  expect(value.y).toBeCloseTo(1 / 1600);
});


test("AURUM interactive surface edge AA uses a capped low blend strength", () => {
  const pass = { material: { uniforms: { strength: { value: 0.075 } } } };
  setAurumSurfaceEdgeAaStrength(pass, 0.035);
  expect(pass.material.uniforms.strength.value).toBe(0.035);
  setAurumSurfaceEdgeAaStrength(pass, 0.5);
  expect(pass.material.uniforms.strength.value).toBe(0.1);
});


test("AURUM LIVE and SETTLED profiles share a stable low-strength blend", () => {
  const live = getAurumEdgeAaProfile("high", "dense", "live");
  const settled = getAurumEdgeAaProfile("high", "dense", "settled");
  expect(live).toEqual({ mode: "live", enabled: true, strength: 0.035 });
  expect(settled).toEqual({ mode: "settled", enabled: true, strength: 0.035 });
});

test("AURUM edge AA respects quality and runtime budget gates", () => {
  expect(getAurumEdgeAaProfile("low", "web", "live").enabled).toBe(false);
  expect(getAurumEdgeAaProfile("high", "extreme", "live").enabled).toBe(false);
  expect(getAurumEdgeAaProfile("high", "extreme", "settled").enabled).toBe(false);
  expect(getAurumEdgeAaProfile("high", "extreme", "capture").enabled).toBe(true);
  expect(getAurumEdgeAaProfile("medium", "web", "settled").enabled).toBe(false);
});
