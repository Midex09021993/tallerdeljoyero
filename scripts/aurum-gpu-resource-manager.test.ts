import { expect, test } from "bun:test";
import { createAurumGpuResourceManager } from "../src/lib/aurum/core/gpu-resource-manager";

function disposable() {
  let disposeCount = 0;
  return {
    dispose() { disposeCount += 1; },
    get disposeCount() { return disposeCount; },
  };
}

test("shared GPU resource is disposed only after its final owner releases it", () => {
  const manager = createAurumGpuResourceManager();
  const texture = disposable();

  manager.track("gem-engine", texture, "texture");
  manager.track("final-render", texture, "texture");
  manager.track("gem-engine", texture, "texture");

  expect(manager.stats()).toEqual({
    resourceCount: 1,
    ownerCount: 2,
    referenceCount: 2,
    disposed: false,
  });
  expect(manager.releaseOwner("gem-engine")).toBe(1);
  expect(texture.disposeCount).toBe(0);
  expect(manager.release("final-render", texture)).toBe(true);
  expect(texture.disposeCount).toBe(1);
  expect(manager.stats().resourceCount).toBe(0);
  expect(manager.release("final-render", texture)).toBe(false);
});

test("owner cleanup releases only its resources and preserves shared resources", () => {
  const manager = createAurumGpuResourceManager();
  const geometry = disposable();
  const material = disposable();
  const sharedTexture = disposable();

  manager.track("viewer", geometry, "geometry");
  manager.track("viewer", sharedTexture, "texture");
  manager.track("gem", material, "material");
  manager.track("gem", sharedTexture, "texture");

  expect(manager.releaseOwner("viewer")).toBe(2);
  expect(geometry.disposeCount).toBe(1);
  expect(sharedTexture.disposeCount).toBe(0);
  expect(material.disposeCount).toBe(0);
  expect(manager.resourcesByKind()).toEqual({
    geometry: 0,
    material: 1,
    texture: 1,
    "render-target": 0,
    buffer: 0,
    other: 0,
  });

  manager.releaseOwner("gem");
  expect(material.disposeCount).toBe(1);
  expect(sharedTexture.disposeCount).toBe(1);
});

test("manager disposal is idempotent and rejects new ownership", () => {
  const manager = createAurumGpuResourceManager();
  const renderTarget = disposable();
  manager.track("capture", renderTarget, "render-target");

  manager.dispose();
  manager.dispose();

  expect(renderTarget.disposeCount).toBe(1);
  expect(manager.stats()).toEqual({
    resourceCount: 0,
    ownerCount: 0,
    referenceCount: 0,
    disposed: true,
  });
  expect(() => manager.track("late", disposable())).toThrow("disposed");
});

test("invalid ownership and non-disposable resources are rejected", () => {
  const manager = createAurumGpuResourceManager();
  expect(() => manager.track(" ", disposable())).toThrow("owner id");
  expect(() => manager.track("viewer", {} as { dispose: () => void })).toThrow("dispose()");
});

test("shutdown closes ownership before invoking external dispose callbacks", () => {
  const manager = createAurumGpuResourceManager();
  let disposeCount = 0;
  manager.track("viewer", {
    dispose() {
      disposeCount += 1;
      expect(() => manager.track("late", disposable())).toThrow("disposed");
      manager.dispose();
    },
  }, "render-target");

  manager.dispose();
  expect(disposeCount).toBe(1);
  expect(manager.stats().disposed).toBe(true);
});


test("GPU manager rejects non-canonical owner ids and resource kind changes", () => {
  const manager = createAurumGpuResourceManager();
  const texture = disposable();

  expect(() => manager.track(" viewer ", disposable())).toThrow("leading or trailing whitespace");
  manager.track("viewer", texture, "texture");
  expect(() => manager.track("final-render", texture, "render-target")).toThrow("cannot be reclassified");
  expect(manager.stats()).toEqual({
    resourceCount: 1,
    ownerCount: 1,
    referenceCount: 1,
    disposed: false,
  });
  expect(manager.releaseOwner("viewer")).toBe(1);
  expect(texture.disposeCount).toBe(1);
});


test("GPU manager never re-tracks a resource after its final disposal", () => {
  const manager = createAurumGpuResourceManager();
  const texture = disposable();

  manager.track("viewer", texture, "texture");
  expect(manager.releaseOwner("viewer")).toBe(1);
  expect(texture.disposeCount).toBe(1);
  expect(() => manager.track("viewer", texture, "texture")).toThrow("already been disposed");
  expect(texture.disposeCount).toBe(1);
  expect(manager.stats().resourceCount).toBe(0);
});

test("GPU manager marks a resource disposed even when its disposer throws", () => {
  const manager = createAurumGpuResourceManager();
  let disposeCount = 0;
  const target = {
    dispose() {
      disposeCount += 1;
      throw new Error("GPU teardown failed");
    },
  };

  manager.track("capture", target, "render-target");
  expect(() => manager.releaseOwner("capture")).toThrow("cleanup failed");
  expect(disposeCount).toBe(1);
  expect(() => manager.track("capture", target, "render-target")).toThrow("already been disposed");
  expect(disposeCount).toBe(1);
});
