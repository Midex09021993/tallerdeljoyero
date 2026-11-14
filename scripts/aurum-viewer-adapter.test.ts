import { expect, test } from "bun:test";
import { AURUM_VIEWER_SERVICES, createAurumViewerAdapter } from "../src/lib/aurum/core/viewer-adapter";

test("AURUM Viewer Adapter exposes existing viewer references without taking ownership", () => {
  const scene = { name: "production-scene" };
  const camera = { name: "production-camera" };
  const renderer = { name: "production-renderer" };
  const controls = { name: "production-controls" };
  const cameraControls = {
    id: "aurum.camera.controls",
    version: "1.0.0",
    applyView: () => undefined,
    applyReferencePresentation: () => undefined,
    fitAspect: () => undefined,
    update: () => undefined,
    getTarget: () => ({}),
  } as any;
  const host = {} as HTMLElement;

  const adapter = createAurumViewerAdapter({ scene, camera, renderer, controls, cameraControls, host });

  expect(adapter.ready).toBe(true);
  expect(adapter.get(AURUM_VIEWER_SERVICES.scene)).toBe(scene);
  expect(adapter.get(AURUM_VIEWER_SERVICES.camera)).toBe(camera);
  expect(adapter.get(AURUM_VIEWER_SERVICES.renderer)).toBe(renderer);
  expect(adapter.get(AURUM_VIEWER_SERVICES.controls)).toBe(controls);
  expect(adapter.get(AURUM_VIEWER_SERVICES.cameraControls)).toBe(cameraControls);
  expect(adapter.get(AURUM_VIEWER_SERVICES.host)).toBe(host);
  expect(adapter.get("aurum.unknown")).toBeUndefined();
});
