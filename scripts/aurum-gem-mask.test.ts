import { expect, test } from "bun:test";
import { configureAurumGemMaskTexture } from "../src/lib/aurum/post";

test("gem classification mask uses categorical sampling without mipmaps or color conversion", () => {
  const texture: Record<string, unknown> = {};
  const three = {
    NearestFilter: "nearest",
    NoColorSpace: "none",
  };

  const configured = configureAurumGemMaskTexture(texture, three);

  expect(configured).toBe(texture);
  expect(texture.minFilter).toBe("nearest");
  expect(texture.magFilter).toBe("nearest");
  expect(texture.generateMipmaps).toBe(false);
  expect(texture.colorSpace).toBe("none");
  expect(texture.needsUpdate).toBe(true);
});


test("diamond live tuning stays restrained and isolated from physical calibration", async () => {
  const { AURUM_DIAMOND_LIVE_TUNING } = await import("../src/lib/aurum/scintillation");

  expect(AURUM_DIAMOND_LIVE_TUNING.internalContrast).toBe(1.04);
  expect(AURUM_DIAMOND_LIVE_TUNING.highlightShoulder).toBe(0.85);
  expect(AURUM_DIAMOND_LIVE_TUNING.faceBrightness).toBe(1.00);
  expect(AURUM_DIAMOND_LIVE_TUNING.rimEnergy).toBe(0.025);
  expect(AURUM_DIAMOND_LIVE_TUNING.fireMax).toBe(0.065);
});
