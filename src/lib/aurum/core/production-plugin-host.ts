import { AurumPluginRegistry, type AurumPluginDefinition } from "./plugin-registry";
import { AurumServiceContainer } from "./service-container";
import { createAurumGpuResourceManager } from "./gpu-resource-manager";
import { createAurumReadonlyMap } from "./readonly-map";

export const AURUM_GPU_RESOURCE_SERVICE = "aurum.gpu.resources" as const;

export interface AurumProductionModule {
  readonly id: string;
  readonly version?: string;
  readonly services: ReadonlyMap<string, unknown>;
  readonly dependencies?: readonly string[];
  readonly requiresServices?: readonly string[];
  readonly description?: string;
}

export interface AurumProductionPluginHost {
  readonly services: ReadonlyMap<string, unknown>;
  readonly registry: AurumPluginRegistry;
  readonly moduleIds: readonly string[];
  dispose(): Promise<void>;
}

/**
 * Composes already-created production adapters as managed AURUM plugins.
 * The host owns plugin lifecycle scopes only; adapter/Three.js resources remain
 * owned by their existing production controllers.
 */
export function createAurumProductionPluginHost(
  modules: readonly AurumProductionModule[],
  appVersion = "1.0.0",
): AurumProductionPluginHost {
  if (!appVersion.trim()) throw new Error("AURUM production host version cannot be empty.");

  const moduleIds = new Set<string>();
  for (const module of modules) {
    if (!/^[a-z][a-z0-9-]*(?:\\.[a-z][a-z0-9-]*)*$/.test(module.id)) {
      throw new Error(`Invalid AURUM production module id "${module.id}". Use lowercase names separated by dots or hyphens.`);
    }
    if (moduleIds.has(module.id)) {
      throw new Error(`AURUM production module "${module.id}" is duplicated.`);
    }
    moduleIds.add(module.id);
    if (!module.services || typeof module.services[Symbol.iterator] !== "function") {
      throw new Error(`AURUM production module "${module.id}" must provide a service map.`);
    }
    if (module.dependencies?.includes(module.id)) {
      throw new Error(`AURUM production module "${module.id}" cannot depend on itself.`);
    }
    if (new Set(module.dependencies ?? []).size !== (module.dependencies ?? []).length) {
      throw new Error(`AURUM production module "${module.id}" declares duplicate dependencies.`);
    }
    if (new Set(module.requiresServices ?? []).size !== (module.requiresServices ?? []).length) {
      throw new Error(`AURUM production module "${module.id}" declares duplicate required services.`);
    }
    for (const serviceId of [...module.services.keys(), ...(module.requiresServices ?? [])]) {
      if (!serviceId.trim() || serviceId !== serviceId.trim()) {
        throw new Error(`AURUM production module "${module.id}" declares a non-canonical service identifier "${serviceId}".`);
      }
    }
  }

  const container = new AurumServiceContainer();
  const gpuResources = createAurumGpuResourceManager();
  container.register(AURUM_GPU_RESOURCE_SERVICE, gpuResources);
  const definitions: AurumPluginDefinition[] = [];
  // Snapshot caller-owned module metadata and service maps at composition time.
  // A host must not change its dependency graph if a caller later mutates an
  // input array or Map retained outside this boundary.
  const moduleSnapshots = modules.map((module) => ({
    ...module,
    services: createAurumReadonlyMap(module.services),
    ...(module.dependencies ? { dependencies: Object.freeze([...module.dependencies]) } : {}),
    ...(module.requiresServices ? { requiresServices: Object.freeze([...module.requiresServices]) } : {}),
  }));

  for (const module of moduleSnapshots) {
    const adapterServiceId = `aurum.plugin.${module.id.replace(/\./g, "-")}`;
    container.register(adapterServiceId, module.services);
    container.registerMany(module.services);

    definitions.push({
      id: module.id,
      version: module.version ?? appVersion,
      ...(module.description ? { description: module.description } : {}),
      providesServices: [...module.services.keys()],
      ...(module.requiresServices ? { requiresServices: module.requiresServices } : {}),
      ...(module.dependencies ? { dependencies: module.dependencies } : {}),
      initialize: (context) => {
        for (const serviceId of module.services.keys()) {
          if (!context.services.has(serviceId)) {
            throw new Error(`Plugin "${module.id}" is missing service "${serviceId}".`);
          }
        }
        return {
          activate: () => context.events.emit("aurum.plugin.activated", { id: module.id }),
          deactivate: () => context.events.emit("aurum.plugin.deactivated", { id: module.id }),
        };
      },
    });
  }

  const services = container.seal();
  const registry = new AurumPluginRegistry({
    appId: "aurum-render",
    version: appVersion,
    services,
  });
  for (const definition of definitions) registry.register(definition);

  return Object.freeze({
    services,
    registry,
    moduleIds: Object.freeze(definitions.map(({ id }) => id)),
    async dispose() {
      const failures: unknown[] = [];
      // Plugins release their own resources first. The host then disposes any
      // resources left registered, including shared GPU allocations.
      try {
        await registry.dispose();
      } catch (error) {
        failures.push(error);
      }
      try {
        gpuResources.dispose();
      } catch (error) {
        failures.push(error);
      }
      if (failures.length) {
        throw new AggregateError(failures, "AURUM production host cleanup failed.");
      }
    },
  });
}
