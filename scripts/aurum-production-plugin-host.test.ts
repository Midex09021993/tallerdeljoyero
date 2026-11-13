import { expect, test } from "bun:test";
import { AurumServiceContainer } from "../src/lib/aurum/core/service-container";
import { createAurumProductionPluginHost } from "../src/lib/aurum/core/production-plugin-host";

test("AURUM service container rejects collisions and seals an immutable snapshot", () => {
  const container = new AurumServiceContainer();
  const renderer = { id: "production-renderer" };
  container.register("aurum.viewer.renderer", renderer);
  expect(() => container.register("aurum.viewer.renderer", {})).toThrow("already registered");
  const services = container.seal();
  expect(services.get("aurum.viewer.renderer")).toBe(renderer);
  expect(container.isSealed).toBe(true);
  expect(() => container.register("aurum.scene.controller", {})).toThrow("sealed");
  expect(typeof (services as any).set).toBe("undefined");
});

test("AURUM production plugin host registers adapters and manages lifecycle without taking resource ownership", async () => {
  const viewerServices = new Map([["aurum.viewer.renderer", { id: "renderer" }]]);
  const sceneServices = new Map([["aurum.scene.controller", { id: "scene" }]]);
  const host = createAurumProductionPluginHost([
    { id: "aurum.viewer", services: viewerServices },
    { id: "aurum.scene", dependencies: ["aurum.viewer"], services: sceneServices },
  ]);

  await host.registry.start();
  expect(host.registry.getState()).toBe("running");
  expect(host.moduleIds).toEqual(["aurum.viewer", "aurum.scene"]);
  expect(host.services.get("aurum.viewer.renderer")).toEqual({ id: "renderer" });
  expect(host.services.get("aurum.scene.controller")).toEqual({ id: "scene" });
  const gpuResources = host.services.get("aurum.gpu.resources") as ReturnType<typeof import("../src/lib/aurum/core/gpu-resource-manager").createAurumGpuResourceManager>;
  let gpuDisposed = 0;
  gpuResources.track("gem-engine", { dispose: () => { gpuDisposed += 1; } }, "texture");
  await host.dispose();
  expect(gpuDisposed).toBe(1);
  expect(gpuResources.stats().disposed).toBe(true);
  expect(host.registry.getState()).toBe("disposed");
});
