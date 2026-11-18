/**
 * AURUM CORE — shared plugin services.
 *
 * These primitives do not create or own a Three.js renderer. They provide
 * safe communication and explicit resource ownership for independently
 * developed AURUM modules.
 */
export type AurumDisposer = () => void | Promise<void>;
export type AurumEventHandler<T = unknown> = (payload: T) => void;

function validateEventName(event: string): void {
  if (!event.trim()) throw new Error("AURUM event name cannot be empty.");
  if (event !== event.trim()) {
    throw new Error("AURUM event name cannot have leading or trailing whitespace.");
  }
}

export class AurumEventBus {
  private readonly listeners = new Map<string, Set<AurumEventHandler<any>>>();
  private disposed = false;

  on<T>(event: string, handler: AurumEventHandler<T>): AurumDisposer {
    if (this.disposed) throw new Error("AURUM event bus is disposed.");
    validateEventName(event);
    if (typeof handler !== "function") {
      throw new Error("AURUM event handler must be a function.");
    }

    const handlers = this.listeners.get(event) ?? new Set<AurumEventHandler<any>>();
    handlers.add(handler);
    this.listeners.set(event, handlers);
    let subscribed = true;

    return () => {
      if (!subscribed) return;
      subscribed = false;
      handlers.delete(handler);
      // Do not let a stale disposer delete a newer listener set created
      // after clear/reset for the same event name.
      if (handlers.size === 0 && this.listeners.get(event) === handlers) {
        this.listeners.delete(event);
      }
    };
  }

  emit<T>(event: string, payload: T): void {
    if (this.disposed) return;
    validateEventName(event);
    const handlers = this.listeners.get(event);
    if (!handlers) return;

    // One faulty subscriber must not prevent other modules from receiving
    // the same lifecycle event. Preserve observability by reporting all
    // handler failures after the complete listener snapshot has been called.
    const failures: unknown[] = [];
    for (const handler of [...handlers]) {
      try {
        handler(payload);
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length) {
      throw new AggregateError(failures, `AURUM event "${event}" had failing subscribers.`);
    }
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

  track<T extends { dispose?: () => void | Promise<void> }>(resource: T): T {
    if (typeof resource.dispose === "function") {
      // Preserve async disposal so the scope can await GPU/resource teardown
      // before the owning plugin or viewer completes its shutdown.
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
