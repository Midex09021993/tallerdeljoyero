import { expect, test } from "bun:test";
import {
  applyAurumLayerCategoryOverrides,
  getAurumLayerCategoryOverride,
  setAurumLayerCategoryOverride,
} from "../src/lib/aurum/layer-category-overrides";

function mesh(layerIndex: number, category: string, layerName = "Uho26") {
  return {
    isMesh: true,
    userData: {
      aurumRhino: { categoria: category, capa: layerName, layerIndex },
      aurumRhinoSource: { layerIndex, layerName },
    },
  };
}

function model(meshes: any[]) {
  return {
    userData: {},
    traverse(callback: (node: any) => void) { meshes.forEach(callback); },
  };
}

test("manual layer category correction updates every mesh on that layer only", () => {
  const selectedLayer = mesh(26, "gema");
  const siblingMesh = mesh(26, "gema");
  const otherLayer = mesh(27, "metal", "OtraCapa");
  const root = model([selectedLayer, siblingMesh, otherLayer]);

  const result = setAurumLayerCategoryOverride(root, {
    layerIndex: 26,
    layerName: "Uho26",
  }, "metal");

  expect(result.changed).toBe(2);
  expect(selectedLayer.userData.aurumRhino.categoria).toBe("metal");
  expect(siblingMesh.userData.aurumRhino.categoria).toBe("metal");
  expect(otherLayer.userData.aurumRhino.categoria).toBe("metal");
  expect(otherLayer.userData.aurumRhino.aurumManualCategoryAssignment).toBeUndefined();
});

test("manual layer category correction can be undone to the original category", () => {
  const selectedLayer = mesh(26, "gema");
  const root = model([selectedLayer]);

  setAurumLayerCategoryOverride(root, { layerIndex: 26, layerName: "Uho26" }, "metal");
  const undone = setAurumLayerCategoryOverride(root, { layerIndex: 26, layerName: "Uho26" }, null);

  expect(undone.changed).toBe(1);
  expect(selectedLayer.userData.aurumRhino.categoria).toBe("gema");
  expect(selectedLayer.userData.aurumRhino.aurumManualCategoryAssignment).toBeUndefined();
  expect(root.userData.aurumLayerCategoryOverrides).toEqual({});
});

test("saved layer overrides are reapplied after model reload", () => {
  const firstMesh = mesh(26, "gema");
  const firstModel = model([firstMesh]);
  const saved = setAurumLayerCategoryOverride(firstModel, {
    layerIndex: 26,
    layerName: "Uho26",
  }, "metal").overrides;

  const reloadedMesh = mesh(26, "gema");
  const reloadedModel = model([reloadedMesh]);
  expect(applyAurumLayerCategoryOverrides(reloadedModel, saved)).toBe(1);
  expect(reloadedMesh.userData.aurumRhino.categoria).toBe("metal");
  expect(getAurumLayerCategoryOverride(saved, { layerIndex: 26, layerName: "Uho26" })).toBe("metal");
});

test("a conflicting stable layer ID never falls through to a duplicate name", () => {
  const overrides = { "id:layer-a": "metal", "name:uho26": "metal" } as const;
  expect(getAurumLayerCategoryOverride(overrides, {
    layerId: "layer-b",
    layerName: "Uho26",
  })).toBeUndefined();
});
