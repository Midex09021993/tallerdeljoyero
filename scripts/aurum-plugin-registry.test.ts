import { expect, test } from "bun:test";
import { AurumPluginRegistry, type AurumPluginContext } from "../src/lib/aurum/core/plugin-registry";

function createContext() {
  return {
    appId: "aurum-render" as const,
    version: "0.1.0",
    services: new Map<string, unknown>(),
  };
}

test("AURUM plugin registry initializes dependencies before dependents and disposes in reverse order", async () => {
  const calls: string[] = [];
  const registry = new AurumPluginRegistry(createContext());

  registry.register({
    id: "aurum.gem",
    version: "1.0.0",
    initialize: (_context: AurumPluginContext) => {
      calls.push("gem:init");
      return {
        activate: () => { calls.push("gem:activate"); },
        deactivate: () => { calls.push("gem:deactivate"); },
        dispose: () => { calls.push("gem:dispose"); },
      };
    },
  });
  registry.register({
    id: "aurum.diamond",
    version: "1.0.0",
    dependencies: ["aurum.gem"],
    initialize: () => {
      calls.push("diamond:init");
      return {
        activate: () => { calls.push("diamond:activate"); },
        deactivate: () => { calls.push("diamond:deactivate"); },
        dispose: () => { calls.push("diamond:dispose"); },
      };
    },
  });

  await registry.start();
  expect(registry.getState()).toBe("running");
  await registry.dispose();
  expect(registry.getState()).toBe("disposed");
  expect(calls).toEqual([
    "gem:init", "gem:activate",
    "diamond:init", "diamond:activate",
    "diamond:deactivate", "diamond:dispose",
    "gem:deactivate", "gem:dispose",
  ]);
});

test("AURUM plugin registry rejects duplicate ids and missing dependencies before initialization", async () => {
  const registry = new AurumPluginRegistry(createContext());
  registry.register({ id: "aurum.gem", version: "1.0.0", initialize: () => undefined });
  expect(() => registry.register({ id: "aurum.gem", version: "2.0.0", initialize: () => undefined })).toThrow("already registered");

  const incomplete = new AurumPluginRegistry(createContext());
  incomplete.register({
    id: "aurum.diamond",
    version: "1.0.0",
    dependencies: ["aurum.gem"],
    initialize: () => { throw new Error("must not initialize"); },
  });
  await expect(incomplete.start()).rejects.toThrow('Required AURUM plugin "aurum.gem" is not registered');
  expect(incomplete.getState()).toBe("idle");
});

test("AURUM plugin registry detects circular dependencies before initializing", async () => {
  const registry = new AurumPluginRegistry(createContext());
  registry.register({ id: "aurum.gem", version: "1.0.0", dependencies: ["aurum.diamond"], initialize: () => undefined });
  registry.register({ id: "aurum.diamond", version: "1.0.0", dependencies: ["aurum.gem"], initialize: () => undefined });
  await expect(registry.start()).rejects.toThrow("Circular AURUM plugin dependency");
  expect(registry.getState()).toBe("idle");
});

test("AURUM plugin registry rolls back already initialized plugins when a later plugin fails", async () => {
  const calls: string[] = [];
  const registry = new AurumPluginRegistry(createContext());
  registry.register({
    id: "aurum.gem",
    version: "1.0.0",
    initialize: () => ({
      activate: () => { calls.push("gem:activate"); },
      deactivate: () => { calls.push("gem:deactivate"); },
      dispose: () => { calls.push("gem:dispose"); },
    }),
  });
  registry.register({
    id: "aurum.diamond",
    version: "1.0.0",
    dependencies: ["aurum.gem"],
    initialize: () => { throw new Error("diamond init failed"); },
  });

  await expect(registry.start()).rejects.toThrow("diamond init failed");
  expect(registry.getState()).toBe("idle");
  expect(calls).toEqual(["gem:activate", "gem:deactivate", "gem:dispose"]);
});


test("AURUM plugin contexts share events and dispose owned resources in reverse order", async () => {
  const registry = new AurumPluginRegistry(createContext());
  const calls: string[] = [];
  let received = 0;

  registry.register({
    id: "aurum.gem",
    version: "1.0.0",
    initialize: (context) => {
      context.events.on<{ value: number }>("gem.updated", (payload) => {
        received += payload.value;
      });
      context.resources.add(() => { calls.push("first"); });
      context.resources.add(() => { calls.push("second"); });
      return {
        activate: () => context.events.emit("gem.updated", { value: 2 }),
      };
    },
  });

  await registry.start();
  expect(received).toBe(2);
  await registry.dispose();
  expect(calls).toEqual(["second", "first"]);
});

test("AURUM resource scopes reject new resources after disposal and dispose only once", async () => {
  const { AurumResourceScope } = await import("../src/lib/aurum/core/context");
  const scope = new AurumResourceScope();
  let disposed = 0;
  scope.add(() => { disposed++; });
  await scope.dispose();
  await scope.dispose();
  expect(disposed).toBe(1);
  expect(scope.isDisposed).toBe(true);
  expect(() => scope.add(() => undefined)).toThrow("disposed");
});


test("AURUM Event Bus delivers to every subscriber and reports failures together", async () => {
  const { AurumEventBus } = await import("../src/lib/aurum/core/context");
  const bus = new AurumEventBus();
  const calls: string[] = [];
  bus.on("viewer.ready", () => { calls.push("first"); throw new Error("first failed"); });
  bus.on("viewer.ready", () => { calls.push("second"); });
  bus.on("viewer.ready", () => { calls.push("third"); throw new Error("third failed"); });

  expect(() => bus.emit("viewer.ready", {})).toThrow("failing subscribers");
  expect(calls).toEqual(["first", "second", "third"]);
  bus.clear();
  expect(() => bus.on("viewer.ready", () => undefined)).toThrow("disposed");
});


test("AURUM plugin service contracts reject missing requirements before initialization", async () => {
  let initialized = false;
  const registry = new AurumPluginRegistry(createContext());
  registry.register({
    id: "aurum.viewer",
    version: "1.0.0",
    requiresServices: ["aurum.scene.api"],
    initialize: () => { initialized = true; },
  });

  await expect(registry.start()).rejects.toThrow('requires missing service "aurum.scene.api"');
  expect(initialized).toBe(false);
  expect(registry.getState()).toBe("idle");
});

test("AURUM plugin service contracts verify declared providers against the container", async () => {
  let initialized = false;
  const registry = new AurumPluginRegistry(createContext());
  registry.register({
    id: "aurum.scene",
    version: "1.0.0",
    providesServices: ["aurum.scene.api"],
    initialize: () => { initialized = true; },
  });

  await expect(registry.start()).rejects.toThrow('declares service "aurum.scene.api" but it is not registered');
  expect(initialized).toBe(false);
});

test("AURUM plugin service contracts reject duplicate service providers", async () => {
  const services = new Map<string, unknown>([["aurum.shared.api", {}]]);
  const registry = new AurumPluginRegistry({ ...createContext(), services });
  registry.register({ id: "aurum.scene", version: "1.0.0", providesServices: ["aurum.shared.api"], initialize: () => undefined });
  registry.register({ id: "aurum.viewer", version: "1.0.0", providesServices: ["aurum.shared.api"], initialize: () => undefined });

  await expect(registry.start()).rejects.toThrow('declared by both "aurum.scene" and "aurum.viewer"');
});


test("AURUM plugin registry snapshots mutable contract arrays at registration", async () => {
  const services = new Map<string, unknown>([["aurum.ready", {}]]);
  const dependencies = ["aurum.base"];
  const requiredServices = ["aurum.ready"];
  const providedServices = ["aurum.plugin.api"];
  services.set("aurum.plugin.api", {});
  const registry = new AurumPluginRegistry({ ...createContext(), services });

  registry.register({
    id: "aurum.base",
    version: "1.0.0",
    initialize: () => undefined,
  });
  registry.register({
    id: "aurum.feature",
    version: "1.0.0",
    dependencies,
    requiresServices: requiredServices,
    providesServices: providedServices,
    initialize: () => undefined,
  });

  // Mutating caller-owned arrays after registration must not rewrite the
  // validated dependency graph or the declared service contract.
  dependencies.push("aurum.missing");
  requiredServices.push("aurum.missing.service");
  providedServices.push("aurum.duplicate.api");

  await registry.start();
  expect(registry.getState()).toBe("running");
  await registry.dispose();
});


test("AURUM resource scopes await asynchronous tracked resource disposal in reverse order", async () => {
  const { AurumResourceScope } = await import("../src/lib/aurum/core/context");
  const scope = new AurumResourceScope();
  const calls: string[] = [];

  scope.track({
    async dispose() {
      await Promise.resolve();
      calls.push("first");
    },
  });
  scope.track({
    async dispose() {
      await Promise.resolve();
      calls.push("second");
    },
  });

  await scope.dispose();
  expect(calls).toEqual(["second", "first"]);
  expect(scope.size).toBe(0);
  expect(scope.isDisposed).toBe(true);
});


test("AURUM service container rejects non-canonical identifiers and keeps registerMany atomic", async () => {
  const { AurumServiceContainer } = await import("../src/lib/aurum/core/service-container");
  const container = new AurumServiceContainer();

  expect(() => container.register(" aurum.viewer ", {})).toThrow("leading or trailing whitespace");
  expect(() => container.registerMany(new Map([
    ["aurum.scene", {}],
    [" aurum.gem ", {}],
  ]))).toThrow("leading or trailing whitespace");
  expect(container.has("aurum.scene")).toBe(false);
  expect(container.size).toBe(0);
});


test("AURUM Event Bus validates canonical names and callable handlers", async () => {
  const { AurumEventBus } = await import("../src/lib/aurum/core/context");
  const bus = new AurumEventBus();

  expect(() => bus.on(" viewer.ready", () => undefined)).toThrow("leading or trailing whitespace");
  expect(() => bus.on("viewer.ready ", () => undefined)).toThrow("leading or trailing whitespace");
  expect(() => bus.on("   ", () => undefined)).toThrow("cannot be empty");
  expect(() => bus.on("viewer.ready", null as unknown as () => void)).toThrow("must be a function");
  expect(() => bus.emit(" viewer.ready", {})).toThrow("leading or trailing whitespace");
});

test("AURUM Event Bus unsubscribe is idempotent and stale disposers cannot remove reset listeners", async () => {
  const { AurumEventBus } = await import("../src/lib/aurum/core/context");
  const bus = new AurumEventBus();
  let received = 0;

  const staleDisposer = bus.on("viewer.ready", () => { received += 1; });
  staleDisposer();
  staleDisposer();

  bus.clear();
  bus.reset();
  bus.on("viewer.ready", () => { received += 10; });
  staleDisposer();
  bus.emit("viewer.ready", {});

  expect(received).toBe(10);
});


test("AURUM CORE completes the full plugin lifecycle with dependency order, events, abort and resource release", async () => {
  const calls: string[] = [];
  const registry = new AurumPluginRegistry(createContext());

  registry.register({
    id: "aurum.scene",
    version: "1.0.0",
    initialize: (context) => {
      calls.push("scene:initialize");
      const unsubscribe = context.events.on<{ id: string }>("aurum.module.activated", ({ id }) => {
        calls.push(`scene:event:${id}`);
      });
      context.resources.add(unsubscribe);
      context.resources.track({
        async dispose() {
          await Promise.resolve();
          calls.push("scene:resource-dispose");
        },
      });
      return {
        activate: () => {
          calls.push("scene:activate");
          context.events.emit("aurum.module.activated", { id: "scene" });
        },
        deactivate: () => {
          calls.push(`scene:deactivate:aborted=${context.signal.aborted}`);
          context.events.emit("aurum.module.deactivated", { id: "scene" });
        },
        dispose: () => { calls.push("scene:runtime-dispose"); },
      };
    },
  });

  registry.register({
    id: "aurum.viewer",
    version: "1.0.0",
    dependencies: ["aurum.scene"],
    initialize: (context) => {
      calls.push("viewer:initialize");
      const unsubscribe = context.events.on<{ id: string }>("aurum.module.deactivated", ({ id }) => {
        calls.push(`viewer:event:${id}`);
      });
      context.resources.add(unsubscribe);
      return {
        activate: () => {
          calls.push("viewer:activate");
          context.events.emit("aurum.module.activated", { id: "viewer" });
        },
        deactivate: () => {
          calls.push(`viewer:deactivate:aborted=${context.signal.aborted}`);
        },
        dispose: () => { calls.push("viewer:runtime-dispose"); },
      };
    },
  });

  await registry.start();
  expect(registry.getState()).toBe("running");
  expect(calls).toEqual([
    "scene:initialize",
    "scene:activate",
    "scene:event:scene",
    "viewer:initialize",
    "viewer:activate",
    "scene:event:viewer",
  ]);

  await registry.dispose();
  expect(registry.getState()).toBe("disposed");
  expect(calls.slice(6)).toEqual([
    "viewer:deactivate:aborted=true",
    "viewer:runtime-dispose",
    "scene:deactivate:aborted=true",
    "viewer:event:scene",
    "scene:runtime-dispose",
    "scene:resource-dispose",
  ]);
});

test("AURUM CORE rolls back a plugin whose activation fails and remains restart-safe", async () => {
  const calls: string[] = [];
  const registry = new AurumPluginRegistry(createContext());

  registry.register({
    id: "aurum.scene",
    version: "1.0.0",
    initialize: (context) => {
      context.resources.add(() => { calls.push("scene:resource-dispose"); });
      return {
        activate: () => { calls.push("scene:activate"); },
        deactivate: () => { calls.push("scene:deactivate"); },
        dispose: () => { calls.push("scene:runtime-dispose"); },
      };
    },
  });
  registry.register({
    id: "aurum.viewer",
    version: "1.0.0",
    dependencies: ["aurum.scene"],
    initialize: () => ({
      activate: () => { calls.push("viewer:activate"); throw new Error("viewer activation failed"); },
      deactivate: () => { calls.push("viewer:deactivate"); },
      dispose: () => { calls.push("viewer:runtime-dispose"); },
    }),
  });

  await expect(registry.start()).rejects.toThrow("viewer activation failed");
  expect(registry.getState()).toBe("idle");
  expect(calls).toEqual([
    "scene:activate",
    "viewer:activate",
    "viewer:deactivate",
    "viewer:runtime-dispose",
    "scene:deactivate",
    "scene:runtime-dispose",
    "scene:resource-dispose",
  ]);

  await expect(registry.start()).rejects.toThrow("viewer activation failed");
  expect(registry.getState()).toBe("idle");
});
