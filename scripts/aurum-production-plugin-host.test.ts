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
  const calls: string[] = [];
  const viewerServices = new Map([["aurum.viewer.renderer", { id: "renderer" }]]);
  const sceneServices = new Map([["aurum.scene.controller", { id: "scene" }]]);
  const host = createAurumProductionPluginHost([
    { id: "aurum.viewer", services: viewerServices },
    { id: "aurum.scene", dependencies: ["aurum.viewer"], services: sceneServices },
  ]);
  host.registry["events"]?.on?.("aurum.plugin.activated", ({ id }: { id: string }) => calls.push(`+${id}`));
  host.registry["events"]?.on?.("aurum.plugin.deactivated", ({ id }: { id: string }) => calls.push(`-${id}`));

  await host.registry.start();
  expect(host.registry.getState()).toBe("running");
  expect(host.moduleIds).toEqual(["aurum.viewer", "aurum.scene"]);
  expect(host.services.get("aurum.viewer.renderer")).toEqual({ id: "renderer" });
  expect(host.services.get("aurum.scene.controller")).toEqual({ id: "scene" });
  await host.dispose();
  expect(host.registry.getState()).toBe("disposed");
  expect(calls).toEqual(["+aurum.viewer", "+aurum.scene", "-aurum.scene", "-aurum.viewer"]);
});
