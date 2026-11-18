import { expect, test } from "bun:test";
import { createAurumSceneAdapter, AURUM_SCENE_SERVICES } from "../src/lib/aurum/core/scene-adapter";
import type { AurumSceneController } from "../src/lib/aurum/scene";

test("AURUM Scene Adapter forwards scene and background operations without changing controller ownership", () => {
  const calls: unknown[][] = [];
  const background = { id: "blanco", color: "#ffffff", image: null };
  const preset = { id: "studio" } as any;
  const controller: AurumSceneController = {
    apply: (id, options) => { calls.push(["apply", id, options]); return preset; },
    setBackground: (id) => { calls.push(["setBackground", id]); },
    getBackground: () => background,
  };
  const adapter = createAurumSceneAdapter(controller);

  expect(adapter.services.get(AURUM_SCENE_SERVICES.controller)).toBe(controller);
  expect(adapter.controller).toBe(controller);
  expect(adapter.apply("studio", { transparent: true })).toBe(preset);
  adapter.setBackground("blanco");
  expect(adapter.getBackground()).toBe(background);
  expect(calls).toEqual([
    ["apply", "studio", { transparent: true }],
    ["setBackground", "blanco"],
  ]);
});
