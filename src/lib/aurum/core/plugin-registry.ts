import { AurumEventBus, AurumResourceScope } from "./context";

/**
 * AURUM CORE — plugin contracts.
 *
 * This contract layer is deliberately renderer-agnostic: production adapters
 * are composed by the AURUM production plugin host and receive an
 * application-owned context. Plugins must release only resources they create;
 * existing renderer, scene, lighting and material controllers retain ownership
 * of their production resources until an explicit hand-off is implemented.
 */
export type AurumPluginId = string;

export interface AurumPluginContext {
  readonly appId: "aurum-render";
  readonly version: string;
  readonly services: ReadonlyMap<string, unknown>;
  readonly signal: AbortSignal;
  readonly events: AurumEventBus;
  readonly resources: AurumResourceScope;
}

export interface AurumPluginRuntime {
  activate?: () => void | Promise<void>;
  deactivate?: () => void | Promise<void>;
  dispose?: () => void | Promise<void>;
}

export interface AurumPluginDefinition {
  readonly id: AurumPluginId;
  readonly version: string;
  /** Human-readable responsibility for architecture reviews and diagnostics. */
  readonly description?: string;
  /** Service identifiers this plugin exposes through the application container. */
  readonly providesServices?: readonly string[];
  /** Service identifiers that must exist before this plugin can initialize. */
  readonly requiresServices?: readonly string[];
  readonly dependencies?: readonly AurumPluginId[];
  initialize: (context: AurumPluginContext) => void | AurumPluginRuntime | Promise<void | AurumPluginRuntime>;
}

export type AurumPluginRegistryState = "idle" | "starting" | "running" | "stopping" | "disposed";

type RegisteredPlugin = {
  definition: AurumPluginDefinition;
  runtime: AurumPluginRuntime;
  resources: AurumResourceScope;
};

function validatePluginId(id: string): void {
  if (!/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/.test(id)) {
    throw new Error(`Invalid AURUM plugin id "${id}". Use lowercase names separated by dots or hyphens.`);
  }
}

export class AurumPluginRegistry {
  private readonly definitions = new Map<AurumPluginId, AurumPluginDefinition>();
  private readonly initialized: RegisteredPlugin[] = [];
  private state: AurumPluginRegistryState = "idle";
  private abortController: AbortController | null = null;
  private readonly events = new AurumEventBus();

  constructor(private readonly context: Omit<AurumPluginContext, "signal" | "events" | "resources">) {}

  getState(): AurumPluginRegistryState {
    return this.state;
  }

  getRegisteredIds(): readonly AurumPluginId[] {
    return [...this.definitions.keys()];
  }

  register(definition: AurumPluginDefinition): void {
    if (this.state !== "idle") {
      throw new Error("AURUM plugins can only be registered while the registry is idle.");
    }
    validatePluginId(definition.id);
    if (!definition.version.trim()) {
      throw new Error(`AURUM plugin "${definition.id}" must declare a version.`);
    }
    if (this.definitions.has(definition.id)) {
      throw new Error(`AURUM plugin "${definition.id}" is already registered.`);
    }
    if (definition.dependencies?.includes(definition.id)) {
      throw new Error(`AURUM plugin "${definition.id}" cannot depend on itself.`);
    }
    for (const serviceId of [...(definition.providesServices ?? []), ...(definition.requiresServices ?? [])]) {
      if (!serviceId.trim()) throw new Error(`AURUM plugin "${definition.id}" declares an empty service identifier.`);
    }
    if (new Set(definition.providesServices ?? []).size !== (definition.providesServices ?? []).length) {
      throw new Error(`AURUM plugin "${definition.id}" declares duplicate provided services.`);
    }
    // Keep the registry contract stable after registration. TypeScript's
    // readonly modifiers do not prevent callers from mutating the original
    // arrays/objects at runtime, which could otherwise alter dependency and
    // service validation after the plugin has been registered.
    const snapshot: AurumPluginDefinition = Object.freeze({
      ...definition,
      ...(definition.dependencies
        ? { dependencies: Object.freeze([...definition.dependencies]) }
        : {}),
      ...(definition.providesServices
        ? { providesServices: Object.freeze([...definition.providesServices]) }
        : {}),
      ...(definition.requiresServices
        ? { requiresServices: Object.freeze([...definition.requiresServices]) }
        : {}),
    });
    this.definitions.set(snapshot.id, snapshot);
  }

  private resolveOrder(): AurumPluginDefinition[] {
    const order: AurumPluginDefinition[] = [];
    const temporary = new Set<AurumPluginId>();
    const permanent = new Set<AurumPluginId>();

    const visit = (id: AurumPluginId) => {
      if (permanent.has(id)) return;
      if (temporary.has(id)) {
        throw new Error(`Circular AURUM plugin dependency detected at "${id}".`);
      }
      const definition = this.definitions.get(id);
      if (!definition) {
        throw new Error(`Required AURUM plugin "${id}" is not registered.`);
      }
      temporary.add(id);
      for (const dependency of definition.dependencies ?? []) visit(dependency);
      temporary.delete(id);
      permanent.add(id);
      order.push(definition);
    };

    for (const id of this.definitions.keys()) visit(id);

    // Validate service contracts before any plugin initializes. This prevents
    // partially starting a module graph with missing or falsely declared APIs.
    const providedBy = new Map<string, AurumPluginId>();
    for (const definition of order) {
      for (const serviceId of definition.providesServices ?? []) {
        if (!this.context.services.has(serviceId)) {
          throw new Error(`Plugin "${definition.id}" declares service "${serviceId}" but it is not registered in the application container.`);
        }
        const previous = providedBy.get(serviceId);
        if (previous) {
          throw new Error(`Service "${serviceId}" is declared by both "${previous}" and "${definition.id}".`);
        }
        providedBy.set(serviceId, definition.id);
      }
    }
    for (const definition of order) {
      for (const serviceId of definition.requiresServices ?? []) {
        if (!this.context.services.has(serviceId)) {
          throw new Error(`Plugin "${definition.id}" requires missing service "${serviceId}".`);
        }
      }
    }
    return order;
  }

  async start(): Promise<void> {
    if (this.state === "running") return;
    if (this.state !== "idle") {
      throw new Error(`Cannot start AURUM plugin registry from state "${this.state}".`);
    }

    // Validate the entire graph before initializing any plugin.
    const order = this.resolveOrder();
    this.state = "starting";
    this.abortController = new AbortController();
    const pluginContext = {
      ...this.context,
      signal: this.abortController.signal,
    };

    try {
      for (const definition of order) {
        const resources = new AurumResourceScope();
        const scopedContext: AurumPluginContext = { ...pluginContext, resources, events: this.events };
        let runtime: AurumPluginRuntime;
        try {
          runtime = (await definition.initialize(scopedContext)) ?? {};
        } catch (error) {
          await resources.dispose();
          throw error;
        }
        const registered = { definition, runtime, resources };
        this.initialized.push(registered);
        await runtime.activate?.();
      }
      this.state = "running";
    } catch (error) {
      this.abortController.abort();
      let cleanupError: unknown;
      try {
        await this.cleanupInitialized();
      } catch (failure) {
        cleanupError = failure;
      } finally {
        this.events.reset();
        this.state = "idle";
        this.abortController = null;
      }
      if (cleanupError) {
        throw new AggregateError([error, cleanupError], "AURUM plugin startup failed and rollback reported cleanup errors.");
      }
      throw error;
    }
  }

  private async cleanupInitialized(): Promise<void> {
    const failures: unknown[] = [];
    for (const plugin of [...this.initialized].reverse()) {
      try {
        await plugin.runtime.deactivate?.();
      } catch (error) {
        failures.push(error);
      }
      try {
        await plugin.runtime.dispose?.();
      } catch (error) {
        failures.push(error);
      }
      try {
        await plugin.resources.dispose();
      } catch (error) {
        failures.push(error);
      }
    }
    this.initialized.length = 0;
    if (failures.length > 0) {
      throw new AggregateError(failures, "One or more AURUM plugins failed to clean up.");
    }
  }

  async dispose(): Promise<void> {
    if (this.state === "disposed") return;
    if (this.state === "starting" || this.state === "stopping") {
      throw new Error(`Cannot dispose AURUM plugin registry while "${this.state}".`);
    }
    if (this.state === "idle") {
      this.state = "disposed";
      return;
    }

    this.state = "stopping";
    this.abortController?.abort();
    try {
      await this.cleanupInitialized();
    } finally {
      this.events.clear();
      this.abortController = null;
      this.state = "disposed";
    }
  }
}
