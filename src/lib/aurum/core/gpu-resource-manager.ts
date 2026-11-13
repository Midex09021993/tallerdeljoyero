/**
 * AURUM CORE — explicit GPU resource ownership.
 *
 * This manager only owns resources that a production controller explicitly
 * hands to it. It never scans a Three.js scene or disposes renderer-owned
 * objects implicitly. Shared resources are disposed after their final owner
 * releases them.
 */

export type AurumGpuResourceKind =
  | "geometry"
  | "material"
  | "texture"
  | "render-target"
  | "buffer"
  | "other";

export interface AurumGpuResourceStats {
  readonly resourceCount: number;
  readonly ownerCount: number;
  readonly referenceCount: number;
  readonly disposed: boolean;
}

type DisposableResource = { dispose: () => void };

type ResourceEntry = {
  readonly resource: DisposableResource;
  readonly kind: AurumGpuResourceKind;
  readonly owners: Set<string>;
};

export interface AurumGpuResourceManager {
  track<T extends DisposableResource>(
    ownerId: string,
    resource: T,
    kind?: AurumGpuResourceKind,
  ): T;
  release(ownerId: string, resource: DisposableResource): boolean;
  releaseOwner(ownerId: string): number;
  dispose(): void;
  stats(): AurumGpuResourceStats;
  resourcesByKind(): Readonly<Record<AurumGpuResourceKind, number>>;
}

const RESOURCE_KINDS: readonly AurumGpuResourceKind[] = [
  "geometry",
  "material",
  "texture",
  "render-target",
  "buffer",
  "other",
];

export function createAurumGpuResourceManager(): AurumGpuResourceManager {
  const entries = new Map<DisposableResource, ResourceEntry>();
  const owners = new Map<string, Set<DisposableResource>>();
  // A resource disposed by this manager must never be reintroduced: Three.js
  // dispose() is not a reset operation and re-tracking would permit double teardown.
  const disposedResources = new WeakSet<DisposableResource>();
  let disposed = false;

  const assertActive = () => {
    if (disposed) throw new Error("AURUM GPU resource manager is disposed.");
  };

  const releaseReference = (ownerId: string, resource: DisposableResource): boolean => {
    const entry = entries.get(resource);
    const ownerResources = owners.get(ownerId);
    if (!entry || !ownerResources?.has(resource) || !entry.owners.has(ownerId)) return false;

    ownerResources.delete(resource);
    if (ownerResources.size === 0) owners.delete(ownerId);
    entry.owners.delete(ownerId);

    if (entry.owners.size === 0) {
      entries.delete(resource);
      // Remove ownership before disposal so a throwing disposer cannot cause
      // a second attempt or leave a phantom reference in the manager.
      disposedResources.add(resource);
      resource.dispose();
    }
    return true;
  };

  return Object.freeze({
    track<T extends DisposableResource>(
      ownerId: string,
      resource: T,
      kind: AurumGpuResourceKind = "other",
    ): T {
      assertActive();
      if (!ownerId.trim()) throw new Error("AURUM GPU resource owner id cannot be empty.");
      if (ownerId !== ownerId.trim()) {
        throw new Error("AURUM GPU resource owner id cannot contain leading or trailing whitespace.");
      }
      if (!resource || typeof resource.dispose !== "function") {
        throw new Error("AURUM GPU resources must expose a dispose() method.");
      }
      if (disposedResources.has(resource)) {
        throw new Error("AURUM GPU resource has already been disposed by this manager.");
      }
      if (!RESOURCE_KINDS.includes(kind)) throw new Error(`Unknown AURUM GPU resource kind "${kind}".`);

      let entry = entries.get(resource);
      if (!entry) {
        entry = { resource, kind, owners: new Set<string>() };
        entries.set(resource, entry);
      } else if (entry.kind !== kind) {
        throw new Error(
          `AURUM GPU resource is already tracked as "${entry.kind}" and cannot be reclassified as "${kind}".`,
        );
      }
      if (!entry.owners.has(ownerId)) {
        entry.owners.add(ownerId);
        const ownerResources = owners.get(ownerId) ?? new Set<DisposableResource>();
        ownerResources.add(resource);
        owners.set(ownerId, ownerResources);
      }
      return resource;
    },

    release(ownerId: string, resource: DisposableResource): boolean {
      assertActive();
      return releaseReference(ownerId, resource);
    },

    releaseOwner(ownerId: string): number {
      assertActive();
      const owned = owners.get(ownerId);
      if (!owned) return 0;
      let released = 0;
      const failures: unknown[] = [];
      for (const resource of [...owned].reverse()) {
        try {
          if (releaseReference(ownerId, resource)) released += 1;
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length) {
        throw new AggregateError(failures, `AURUM GPU owner "${ownerId}" cleanup failed.`);
      }
      return released;
    },

    dispose(): void {
      if (disposed) return;
      // Close the manager before invoking external dispose callbacks so a
      // callback cannot re-enter cleanup or register new resources mid-shutdown.
      disposed = true;
      const ownerIds = [...owners.keys()].reverse();
      const failures: unknown[] = [];
      for (const ownerId of ownerIds) {
        try {
          const owned = owners.get(ownerId);
          if (!owned) continue;
          for (const resource of [...owned].reverse()) {
            try {
              releaseReference(ownerId, resource);
            } catch (error) {
              failures.push(error);
            }
          }
        } catch (error) {
          failures.push(error);
        }
      }
      entries.clear();
      owners.clear();
      if (failures.length) {
        throw new AggregateError(failures, "AURUM GPU resource manager cleanup failed.");
      }
    },

    stats(): AurumGpuResourceStats {
      let referenceCount = 0;
      for (const entry of entries.values()) referenceCount += entry.owners.size;
      return Object.freeze({
        resourceCount: entries.size,
        ownerCount: owners.size,
        referenceCount,
        disposed,
      });
    },

    resourcesByKind(): Readonly<Record<AurumGpuResourceKind, number>> {
      const counts: Record<AurumGpuResourceKind, number> = {
        geometry: 0,
        material: 0,
        texture: 0,
        "render-target": 0,
        buffer: 0,
        other: 0,
      };
      for (const entry of entries.values()) counts[entry.kind] += 1;
      return Object.freeze(counts);
    },
  });
}
