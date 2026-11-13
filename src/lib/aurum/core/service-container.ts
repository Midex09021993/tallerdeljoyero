/**
 * AURUM CORE — application service container.
 *
 * Services are registered once during viewer composition. The registry receives
 * a read-only snapshot; plugins never receive a mutable reference to this map.
 */
export type AurumServiceId = string;

export class AurumServiceContainer {
  private readonly entries = new Map<AurumServiceId, unknown>();
  private sealed = false;

  register<T>(id: AurumServiceId, service: T): T {
    if (this.sealed) throw new Error("AURUM service container is sealed.");
    if (!id.trim()) throw new Error("AURUM service id cannot be empty.");
    if (service === undefined || service === null) {
      throw new Error(`AURUM service "${id}" cannot be null or undefined.`);
    }
    if (this.entries.has(id)) throw new Error(`AURUM service "${id}" is already registered.`);
    this.entries.set(id, service);
    return service;
  }

  registerMany(services: ReadonlyMap<AurumServiceId, unknown>): void {
    if (this.sealed) throw new Error("AURUM service container is sealed.");
    for (const [id, service] of services) {
      if (!id.trim()) throw new Error("AURUM service id cannot be empty.");
      if (service === undefined || service === null) {
        throw new Error(`AURUM service "${id}" cannot be null or undefined.`);
      }
      if (this.entries.has(id)) throw new Error(`AURUM service "${id}" is already registered.`);
    }
    for (const [id, service] of services) this.entries.set(id, service);
  }

  get<T>(id: AurumServiceId): T | undefined {
    return this.entries.get(id) as T | undefined;
  }

  require<T>(id: AurumServiceId): T {
    const service = this.get<T>(id);
    if (service === undefined) throw new Error(`Required AURUM service "${id}" is not registered.`);
    return service;
  }

  has(id: AurumServiceId): boolean {
    return this.entries.has(id);
  }

  seal(): ReadonlyMap<AurumServiceId, unknown> {
    this.sealed = true;
    const snapshot = new Map(this.entries);
    const readonlyServices = Object.freeze({
      get size() { return snapshot.size; },
      get: <T>(id: AurumServiceId) => snapshot.get(id) as T | undefined,
      has: (id: AurumServiceId) => snapshot.has(id),
      entries: () => snapshot.entries(),
      keys: () => snapshot.keys(),
      values: () => snapshot.values(),
      forEach: (callback: (value: unknown, key: AurumServiceId, map: ReadonlyMap<AurumServiceId, unknown>) => void, thisArg?: unknown) => {
        snapshot.forEach((value, key) => callback.call(thisArg, value, key, readonlyServices));
      },
      [Symbol.iterator]: () => snapshot[Symbol.iterator](),
    });
    return readonlyServices as ReadonlyMap<AurumServiceId, unknown>;
  }

  get size(): number {
    return this.entries.size;
  }

  get isSealed(): boolean {
    return this.sealed;
  }
}
