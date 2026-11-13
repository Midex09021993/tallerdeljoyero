import { expect, test } from "bun:test";
import { createAurumGemAdapter, AURUM_GEM_SERVICES } from "../src/lib/aurum/core/gem-adapter";

test("AURUM Gem Adapter exposes the production gemstone optical services", () => {
  const adapter = createAurumGemAdapter();
  const diamond = adapter.getOpticalProfile("Diamante");

  expect(adapter.services.has(AURUM_GEM_SERVICES.applyBaseMaterial)).toBe(true);
  expect(adapter.services.has(AURUM_GEM_SERVICES.applyOpticalProfile)).toBe(true);
  expect(adapter.services.has(AURUM_GEM_SERVICES.applyDiamondOptics)).toBe(true);
  expect(adapter.services.has(AURUM_GEM_SERVICES.applyReferenceOptics)).toBe(true);
  expect(adapter.services.has(AURUM_GEM_SERVICES.getOpticalProfile)).toBe(true);
  expect(diamond).toBeTruthy();
  expect(typeof adapter.applyBaseMaterial).toBe("function");
  expect(typeof adapter.applyDiamondOptics).toBe("function");
});

test("AURUM Gem Adapter preserves distinct family optical profiles", () => {
  const adapter = createAurumGemAdapter();
  const diamond = adapter.getOpticalProfile("Diamante");
  const emerald = adapter.getOpticalProfile("Esmeralda");

  expect(diamond).toBeTruthy();
  expect(emerald).toBeTruthy();
  expect(diamond).not.toEqual(emerald);
});
