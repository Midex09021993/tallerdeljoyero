import { AurumPluginRegistry, type AurumPluginDefinition } from "./plugin-registry";
import { AurumServiceContainer } from "./service-container";
import { createAurumGpuResourceManager } from "./gpu-resource-manager";

export const AURUM_GPU_RESOURCE_SERVICE = "aurum.gpu.resources" as const;

export interface AurumProductionModule {
  readonly id: string;
  readonly version?: string;
  readonly services: ReadonlyMap<string, unknown>;
  readonly dependencies?: readonly string[];
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
  const container = new AurumServiceContainer();
  const gpuResources = createAurumGpuResourceManager();
  container.register(AURUM_GPU_RESOURCE_SERVICE, gpuResources);
  const definitions: AurumPluginDefinition[] = [];

  for (const module of modules) {
    const adapterServiceId = `aurum.plugin.${module.id.replace(/\./g, "-")}`;
    container.register(adapterServiceId, module.services);
    container.registerMany(module.services);

    definitions.push({
      id: module.id,
      version: module.version ?? appVersion,
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
