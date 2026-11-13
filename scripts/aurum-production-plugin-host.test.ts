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
  expect(host.services.has("aurum.plugin.aurum-viewer")).toBe(true);
  expect(host.services.has("aurum.plugin.aurum\\.viewer")).toBe(false);
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


test("AURUM production host snapshots module metadata and service maps", async () => {
  const services = new Map([["aurum.viewer.renderer", { id: "renderer" }]]);
  const dependencies: string[] = [];
  const modules = [{
    id: "aurum.viewer",
    services,
    dependencies,
  }];
  const host = createAurumProductionPluginHost(modules);

  // Mutations to caller-owned input after composition must not alter the host.
  services.set("aurum.late.service", {});
  dependencies.push("aurum.missing");
  modules.push({ id: "aurum.late", services: new Map(), dependencies: [] });

  expect(host.moduleIds).toEqual(["aurum.viewer"]);
  expect(host.services.has("aurum.late.service")).toBe(false);
  await host.registry.start();
  expect(host.registry.getState()).toBe("running");
  await host.dispose();
});


test("AURUM production host protects the published module service map at runtime", async () => {
  const source = new Map([["aurum.viewer.renderer", { id: "renderer" }]]);
  const host = createAurumProductionPluginHost([
    { id: "aurum.viewer", services: source },
  ]);
  const published = host.services.get("aurum.plugin.aurum-viewer") as ReadonlyMap<string, unknown>;

  source.set("aurum.injected", {});
  expect(published.has("aurum.injected")).toBe(false);
  expect(typeof (published as any).set).toBe("undefined");
  expect(typeof (published as any).delete).toBe("undefined");
  expect(typeof (published as any).clear).toBe("undefined");

  await host.registry.start();
  await host.dispose();
  await host.dispose();
});

test("AURUM production host rejects invalid or duplicate module contracts before composition", () => {
  const services = new Map([["aurum.viewer.renderer", {}]]);
  expect(() => createAurumProductionPluginHost([
    { id: "Aurum.Viewer", services },
  ])).toThrow("Invalid AURUM production module id");
  expect(() => createAurumProductionPluginHost([
    { id: "aurum.viewer", services },
    { id: "aurum.viewer", services },
  ])).toThrow("is duplicated");
  expect(() => createAurumProductionPluginHost([
    { id: "aurum.viewer", services, dependencies: ["aurum.viewer"] },
  ])).toThrow("cannot depend on itself");
  expect(() => createAurumProductionPluginHost([
    { id: "aurum.viewer", services: new Map([[" aurum.viewer.renderer ", {}]]) },
  ])).toThrow("non-canonical service identifier");
  expect(() => createAurumProductionPluginHost([], "   ")).toThrow("version cannot be empty");
});

test("AURUM production host requires module dependencies for services supplied by other modules", async () => {
  const viewerServices = new Map([["aurum.viewer.renderer", {}]]);
  const sceneServices = new Map([["aurum.scene.controller", {}]]);

  expect(() => createAurumProductionPluginHost([
    { id: "aurum.viewer", services: viewerServices },
    {
      id: "aurum.scene",
      services: sceneServices,
      requiresServices: ["aurum.viewer.renderer"],
    },
  ])).toThrow('does not declare that module as a dependency');

  const host = createAurumProductionPluginHost([
    { id: "aurum.viewer", services: viewerServices },
    { id: "aurum.scene", services: sceneServices, dependencies: ["aurum.viewer"], requiresServices: ["aurum.viewer.renderer"] },
  ]);
  await host.registry.start();
  expect(host.registry.getState()).toBe("running");
  await host.dispose();
});

test("AURUM production host accepts transitive module dependencies for required services", async () => {
  const viewerServices = new Map([["aurum.viewer.renderer", {}]]);
  const sceneServices = new Map([["aurum.scene.controller", {}]]);
  const lightingServices = new Map([["aurum.lighting.controller", {}]]);
  const host = createAurumProductionPluginHost([
    { id: "aurum.viewer", services: viewerServices },
    { id: "aurum.scene", services: sceneServices, dependencies: ["aurum.viewer"] },
    { id: "aurum.lighting", services: lightingServices, dependencies: ["aurum.scene"], requiresServices: ["aurum.viewer.renderer"] },
  ]);
  await host.registry.start();
  expect(host.registry.getState()).toBe("running");
  await host.dispose();
});

test("AURUM production host rejects duplicate service ownership and unresolved module requirements", async () => {
  const sharedService = { id: "shared" };
  expect(() => createAurumProductionPluginHost([
    { id: "aurum.viewer", services: new Map([["aurum.shared.api", sharedService]]) },
    { id: "aurum.scene", services: new Map([["aurum.shared.api", sharedService]]) },
  ])).toThrow("already registered");

  const host = createAurumProductionPluginHost([
    {
      id: "aurum.scene",
      services: new Map([["aurum.scene.controller", {}]]),
      requiresServices: ["aurum.viewer.renderer"],
    },
  ]);
  await expect(host.registry.start()).rejects.toThrow('requires missing service "aurum.viewer.renderer"');
  expect(host.registry.getState()).toBe("idle");
  await host.dispose();
});
