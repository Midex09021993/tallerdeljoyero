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

test("geometry engine flags missing normals and non-finite positions", () => {
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

test("import pipeline manager sequences import and read-only geometry inspection", async () => {
  const model = new THREE.Group();
  model.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
  const calls: string[] = [];
  const importer = {
    id: "aurum.import",
    version: "1.0.0",
    load: async () => {
      calls.push("import");
      return { sourceObject: model, model, format: "3dm" as const, pipeline: ["source-decoded"] };
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
    onStage: (stage) => stages.push(stage),
  });
  expect(calls).toEqual(["import"]);
  expect(result.geometry.meshCount).toBe(1);
  expect(result.pipeline).toEqual(["source-decoded", "geometry-inspected"]);
  expect(stages).toEqual(["import-started", "geometry-inspected"]);
  model.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) (node as THREE.Mesh).geometry.dispose();
  });
});
