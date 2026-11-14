import { expect, test } from "bun:test";
import { createAurumMetalAdapter, AURUM_METAL_SERVICES } from "../src/lib/aurum/core/metal-adapter";

test("AURUM Metal Adapter exposes the existing metal engine functions and preserves preset calibration", () => {
  const adapter = createAurumMetalAdapter();
  const config = {
    id: "oro18_verde_blanco_ijewel",
    color: 0xd9b35c,
    metalness: 1,
    roughness: 0.1,
    envMapIntensity: 1.7,
    clearcoat: 0.15,
    anisotropy: 0,
  };
  const preset = adapter.createPreset(config);
  const response = adapter.getReflectionResponse(preset);
  const colorState = { value: 0 };
  const material = {
    color: { setHex(value: number) { colorState.value = value; }, getHex() { return colorState.value; } },
    emissive: { setHex(_value: number) {} },
    userData: {},
  } as any;

  expect(adapter.services.has(AURUM_METAL_SERVICES.apply)).toBe(true);
  expect(adapter.services.has(AURUM_METAL_SERVICES.presetFromConfig)).toBe(true);
  expect(preset.id).toBe("oro18_verde_blanco_ijewel");
  expect(response.family).toBe("green-gold");
  expect(adapter.apply(material, preset)).toBe(material);
  expect(material.metalness).toBe(preset.metalness);
  expect(material.roughness).toBe(preset.roughness);
  expect(material.envMapIntensity).toBe(preset.envMapIntensity);
  expect(material.userData.aurumMetalCalibrationMode).toBe("catalog-reference");
});
