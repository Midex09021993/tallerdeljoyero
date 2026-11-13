/**
 * AURUM CORE — shared plugin services.
 *
 * These primitives do not create or own a Three.js renderer. They provide
 * safe communication and explicit resource ownership for independently
 * developed AURUM modules.
 */
export type AurumDisposer = () => void | Promise<void>;
export type AurumEventHandler<T = unknown> = (payload: T) => void;

export class AurumEventBus {
  private readonly listeners = new Map<string, Set<AurumEventHandler<any>>>();
  private disposed = false;

  on<T>(event: string, handler: AurumEventHandler<T>): AurumDisposer {
    if (this.disposed) throw new Error("AURUM event bus is disposed.");
    if (!event.trim()) throw new Error("AURUM event name cannot be empty.");
    const handlers = this.listeners.get(event) ?? new Set<AurumEventHandler<any>>();
    handlers.add(handler);
    this.listeners.set(event, handlers);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) this.listeners.delete(event);
    };
  }

  emit<T>(event: string, payload: T): void {
    if (this.disposed) return;
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of [...handlers]) handler(payload);
  }

  clear(): void {
    this.listeners.clear();
    this.disposed = true;
  }

  reset(): void {
    this.listeners.clear();
    this.disposed = false;
  }
}

export class AurumResourceScope {
  private readonly disposers: AurumDisposer[] = [];
  private disposed = false;

  add<T extends AurumDisposer>(disposer: T): T {
    if (this.disposed) throw new Error("Cannot add resources to a disposed AURUM scope.");
    this.disposers.push(disposer);
    return disposer;
  }

  track<T extends { dispose?: () => void }>(resource: T): T {
    if (typeof resource.dispose === "function") {
      this.add(() => resource.dispose?.());
    }
    return resource;
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    const failures: unknown[] = [];
    for (const disposer of this.disposers.splice(0).reverse()) {
      try {
        await disposer();
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length) {
      throw new AggregateError(failures, "One or more AURUM resources failed to dispose.");
    }
  }

  get size(): number {
    return this.disposers.length;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }
}
