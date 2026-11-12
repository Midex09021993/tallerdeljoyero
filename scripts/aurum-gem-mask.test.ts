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
