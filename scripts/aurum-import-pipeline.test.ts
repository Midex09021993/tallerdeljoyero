import { expect, test } from "bun:test";
import * as THREE from "three";
import { createAurumGeometryEngine } from "../src/lib/aurum/core/geometry-engine";
import { createAurumImportPipelineManager } from "../src/lib/aurum/core/import-pipeline-manager";
import type { AurumImportPlugin } from "../src/lib/aurum/core/import-plugin";

test("geometry engine reports visible mesh metrics without mutating source buffers", () => {
  const root = new THREE.Group();
  const geometry = new THREE.BoxGeometry(2, 3, 4);
  const before = Array.from(geometry.getAttribute("position").array);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  mesh.name = "Aro";
  root.add(mesh);
  const report = createAurumGeometryEngine().inspect(root);
  expect(report.meshCount).toBe(1);
  expect(report.visibleMeshCount).toBe(1);
  expect(report.vertices).toBe(geometry.getAttribute("position").count);
  expect(report.triangles).toBe(12);
  expect(report.meshesMissingNormals).toBe(0);
  expect(report.bounds?.size).toEqual([2, 3, 4]);
  expect(Array.from(geometry.getAttribute("position").array)).toEqual(before);
  geometry.dispose();
});

test("geometry engine respects hidden ancestors and supports the import fast path", () => {
  const root = new THREE.Group();
  const hiddenParent = new THREE.Group();
  hiddenParent.visible = false;
  const geometry = new THREE.BoxGeometry();
  hiddenParent.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));
  root.add(hiddenParent);
  const report = createAurumGeometryEngine().inspect(root, { includeBounds: false, validatePositions: false });
  expect(report.meshCount).toBe(1);
  expect(report.visibleMeshCount).toBe(0);
  expect(report.meshes[0].visible).toBe(false);
  expect(report.bounds).toBeNull();
  expect(report.meshes[0].finitePositions).toBeNull();
  geometry.dispose();
});

test("geometry engine flags missing normals and non-finite positions in diagnostic mode", () => {
  const root = new THREE.Group();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, Number.NaN, 1, 0], 3));
  root.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));
  const report = createAurumGeometryEngine().inspect(root);
  expect(report.meshesMissingNormals).toBe(1);
  expect(report.meshesWithInvalidPositions).toBe(1);
  expect(report.meshes[0].finitePositions).toBe(false);
  geometry.dispose();
});

test("production import defers expensive geometry diagnostics until explicitly requested", async () => {
  const model = new THREE.Group();
  model.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
  const importer = {
    id: "aurum.import", version: "1.0.0",
    load: async () => ({ sourceObject: model, model, format: "3dm" as const, pipeline: ["source-decoded"] }),
  } as AurumImportPlugin;
  const stages: string[] = [];
  const result = await createAurumImportPipelineManager(importer, createAurumGeometryEngine()).load({
    file: new File(["model"], "ring.3dm"), format: "3dm", fallbackMaterial: new THREE.MeshBasicMaterial(),
    colorRhinoHex: () => undefined, classifyLayer: () => "otro", onStage: (stage) => stages.push(stage),
  });
  expect(result.geometry).toBeUndefined();
  expect(result.solid).toBeUndefined();
  expect(result.intersection).toBeUndefined();
  expect(stages).toContain("diagnostics-deferred");
});

test("import pipeline includes geometry, surface, solid and BVH intersection diagnostics in order", async () => {
  const model = new THREE.Group();
  model.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
  model.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial()));
  const calls: string[] = [];
  const importer = {
    id: "aurum.import",
    version: "1.0.0",
    load: async () => {
      calls.push("import");
      return { sourceObject: model, model, format: "3dm" as const, pipeline: ["source-decoded", "source-converted-to-glb", "converted-model-normalized"] };
    },
  } as AurumImportPlugin;
  const manager = createAurumImportPipelineManager(importer, createAurumGeometryEngine());
  const stages: string[] = [];
  const result = await manager.load({
    file: new File(["model"], "ring.3dm"),
    format: "3dm",
    fallbackMaterial: new THREE.MeshBasicMaterial(),
    colorRhinoHex: () => undefined,
    classifyLayer: () => "otro",
    diagnostics: true,
    onStage: (stage) => stages.push(stage),
  });
  expect(calls).toEqual(["import"]);
  expect(result.geometry.meshCount).toBe(2);
  expect(result.surface.meshCount).toBe(2);
  expect(result.solid.bodyCount).toBe(2);
  expect(result.solid.closedSolidCount).toBe(1);
  expect(result.solid.openSurfaceCount).toBe(1);
  expect(result.intersection.candidatePairCount).toBe(1);
  expect(result.intersection.intersectingPairCount).toBe(1);
  expect(result.pipeline.slice(-4)).toEqual(["geometry-inspected", "surface-inspected", "solid-inspected", "intersection-inspected"]);
  expect(stages).toEqual(["import-started", "geometry-inspected", "surface-inspected", "solid-inspected", "intersection-inspected"]);
  model.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) (node as THREE.Mesh).geometry.dispose();
  });
});
