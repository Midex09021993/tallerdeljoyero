import { expect, test } from "bun:test";
import { inspectAurumEdgeCapabilities } from "../src/lib/aurum/edge-quality/edge-capabilities";
import { configureAurumComposerMsaa } from "../src/lib/aurum/edge-quality/edge-msaa";

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
