import { expect, test } from "bun:test";
import { disposeAurumViewer } from "../src/lib/aurum/viewer";

function createViewerHarness(calls: string[]) {
  const node = {
    removeChild(element: unknown) {
      calls.push("remove-canvas");
      (element as { parentElement?: unknown }).parentElement = null;
    },
  };
  const canvas = {
    parentElement: node,
    removeEventListener() { calls.push("remove-click"); },
  };
  const renderer = {
    domElement: canvas,
    renderLists: { dispose() { calls.push("render-lists"); } },
    dispose() { calls.push("renderer"); },
  };

  return {
    node,
    renderer,
    loop: { stop() { calls.push("loop"); } },
    observer: { disconnect() { calls.push("observer"); } },
    clickHandler: () => undefined,
    controls: { dispose() { calls.push("controls"); } },
    clearSelection() { calls.push("selection"); },
    lightingController: { dispose() { calls.push("lighting"); } },
    groundController: { dispose() { calls.push("ground"); } },
    hdriGroundTexture: { dispose() { calls.push("ground-hdri"); } },
    gemEnvironmentController: { dispose() { calls.push("gem-environment"); } },
    environmentController: { dispose() { calls.push("metal-environment"); } },
    composer: { dispose() { calls.push("composer"); } },
  };
}

test("viewer teardown stops producers first and releases dependent GPU owners in order", () => {
  const calls: string[] = [];
  const viewer = createViewerHarness(calls);

  disposeAurumViewer(viewer);

  expect(calls).toEqual([
    "loop",
    "observer",
    "remove-click",
    "controls",
    "selection",
    "lighting",
    "ground",
    "ground-hdri",
    "gem-environment",
    "metal-environment",
    "composer",
    "render-lists",
    "renderer",
    "remove-canvas",
  ]);
});

test("viewer teardown is idempotent for a renderer, including after a disposer fails", () => {
  const calls: string[] = [];
  const viewer = createViewerHarness(calls);
  viewer.controls.dispose = () => {
    calls.push("controls");
    throw new Error("controls teardown failed");
  };

  expect(() => disposeAurumViewer(viewer)).toThrow(AggregateError);
  expect(calls).toContain("renderer");
  expect(calls).toContain("remove-canvas");
  const firstPass = [...calls];

  expect(() => disposeAurumViewer(viewer)).not.toThrow();
  expect(calls).toEqual(firstPass);
});

test("viewer cleanup attempts later owners when an earlier controller throws", () => {
  const calls: string[] = [];
  const viewer = createViewerHarness(calls);
  viewer.lightingController.dispose = () => {
    calls.push("lighting");
    throw new Error("lighting teardown failed");
  };
  viewer.gemEnvironmentController.dispose = () => {
    calls.push("gem-environment");
    throw new Error("gem environment teardown failed");
  };

  expect(() => disposeAurumViewer(viewer)).toThrow("cleanup completed");
  expect(calls).toContain("ground");
  expect(calls).toContain("metal-environment");
  expect(calls).toContain("composer");
  expect(calls).toContain("renderer");
});
