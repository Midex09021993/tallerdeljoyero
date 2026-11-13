import { expect, test } from "bun:test";
import { createAurumFinalRenderAdapter, AURUM_FINAL_RENDER_SERVICES } from "../src/lib/aurum/core/final-render-adapter";

test("AURUM Final Render Adapter delegates capability checks and final image rendering", async () => {
  const calls: unknown[][] = [];
  const renderer = {} as any;
  const model = {} as any;
  const camera = {} as any;
  const options = { width: 1920, height: 1080, samples: 64 } as any;
  const engine = {
    supported: (value: any) => { calls.push(["supported", value]); return true; },
    renderImage: async (r: any, m: any, c: any, o: any) => {
      calls.push(["renderImage", r, m, c, o]);
      return "data:image/png;base64,aurum";
    },
  };
  const adapter = createAurumFinalRenderAdapter(engine);

  expect(adapter.services.get(AURUM_FINAL_RENDER_SERVICES.supported)).toBe(engine.supported);
  expect(adapter.services.get(AURUM_FINAL_RENDER_SERVICES.renderImage)).toBe(engine.renderImage);
  expect(adapter.supported(renderer)).toBe(true);
  await expect(adapter.renderImage(renderer, model, camera, options)).resolves.toBe("data:image/png;base64,aurum");
  expect(calls).toEqual([
    ["supported", renderer],
    ["renderImage", renderer, model, camera, options],
  ]);
});
