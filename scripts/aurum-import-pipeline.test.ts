import { expect, test } from "bun:test";
import * as THREE from "three";
import { createAurumGeometryEngine } from "../src/lib/aurum/core/geometry-engine";
import { createAurumImportPipelineManager } from "../src/lib/aurum/core/import-pipeline-manager";
import { disposeAurumImportSourceGeometry, type AurumImportPlugin } from "../src/lib/aurum/core/import-plugin";
import { enforceRhinoLayerVisibilityBeforeExport } from "../src/lib/aurum/model-loader";

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
  expect(result.geometry?.meshCount).toBe(2);
  expect(result.surface?.meshCount).toBe(2);
  expect(result.solid?.bodyCount).toBe(2);
  expect(result.solid?.closedSolidCount).toBe(1);
  expect(result.solid?.openSurfaceCount).toBe(1);
  expect(result.intersection?.candidatePairCount).toBe(1);
  expect(result.intersection?.intersectingPairCount).toBe(1);
  expect(result.pipeline.slice(-4)).toEqual(["geometry-inspected", "surface-inspected", "solid-inspected", "intersection-inspected"]);
  expect(stages).toEqual(["import-started", "smart-scan-complete", "geometry-inspected", "surface-inspected", "solid-inspected", "intersection-inspected"]);
  model.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) (node as THREE.Mesh).geometry.dispose();
  });
});


test("import pipeline rejects an already-aborted request before invoking the importer", async () => {
  const controller = new AbortController();
  controller.abort();
  let importerCalls = 0;
  const importer = {
    id: "aurum.import",
    version: "1.0.0",
    load: async () => {
      importerCalls++;
      throw new Error("Importer must not run");
    },
  } as AurumImportPlugin;
  await expect(createAurumImportPipelineManager(importer, createAurumGeometryEngine()).load({
    file: new File(["model"], "cancelled.3dm"),
    format: "3dm",
    fallbackMaterial: new THREE.MeshBasicMaterial(),
    colorRhinoHex: () => undefined,
    classifyLayer: () => "otro",
    signal: controller.signal,
  })).rejects.toMatchObject({ name: "AbortError" });
  expect(importerCalls).toBe(0);
});

test("import pipeline releases decoded geometry when cancellation arrives after decoding", async () => {
  const controller = new AbortController();
  const geometry = new THREE.BoxGeometry();
  let geometryDisposed = false;
  geometry.addEventListener("dispose", () => { geometryDisposed = true; });
  const model = new THREE.Group();
  model.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));
  const importer = {
    id: "aurum.import",
    version: "1.0.0",
    load: async () => ({ sourceObject: model, model, format: "3dm" as const, pipeline: ["source-decoded"] }),
  } as AurumImportPlugin;
  const stages: string[] = [];
  await expect(createAurumImportPipelineManager(importer, createAurumGeometryEngine()).load({
    file: new File(["model"], "cancelled.3dm"),
    format: "3dm",
    fallbackMaterial: new THREE.MeshBasicMaterial(),
    colorRhinoHex: () => undefined,
    classifyLayer: () => "otro",
    signal: controller.signal,
    onStage: (stage) => {
      stages.push(stage);
      if (stage === "import-started") controller.abort();
    },
  })).rejects.toMatchObject({ name: "AbortError" });
  expect(geometryDisposed).toBe(true);
  expect(stages).toContain("import-failed");
});

test("import pipeline observes cancellation between Smart Scan and deep diagnostics", async () => {
  const controller = new AbortController();
  const geometry = new THREE.BoxGeometry();
  let geometryDisposed = false;
  geometry.addEventListener("dispose", () => { geometryDisposed = true; });
  const model = new THREE.Group();
  model.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));
  const importer = {
    id: "aurum.import",
    version: "1.0.0",
    load: async () => ({ sourceObject: model, model, format: "3dm" as const, pipeline: ["source-decoded"] }),
  } as AurumImportPlugin;
  await expect(createAurumImportPipelineManager(importer, createAurumGeometryEngine()).load({
    file: new File(["model"], "cancelled.3dm"),
    format: "3dm",
    fallbackMaterial: new THREE.MeshBasicMaterial(),
    colorRhinoHex: () => undefined,
    classifyLayer: () => "otro",
    diagnostics: true,
    signal: controller.signal,
    onStage: (stage) => {
      if (stage === "smart-scan-complete") controller.abort();
    },
  })).rejects.toMatchObject({ name: "AbortError" });
  expect(geometryDisposed).toBe(true);
});


test("import pipeline reports advisory file and geometry budgets without rejecting the model", async () => {
  const model = new THREE.Group();
  const geometry = new THREE.BoxGeometry();
  model.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));
  const importer = {
    id: "aurum.import", version: "1.0.0",
    load: async () => ({ sourceObject: model, model, format: "3dm" as const, pipeline: ["source-decoded"] }),
  } as AurumImportPlugin;
  const result = await createAurumImportPipelineManager(importer, createAurumGeometryEngine()).load({
    file: new File(["12345678"], "large-ring.3dm"),
    format: "3dm",
    fallbackMaterial: new THREE.MeshBasicMaterial(),
    colorRhinoHex: () => undefined,
    classifyLayer: () => "otro",
    geometryBudget: { maxMeshes: 0, maxVertices: 1, maxTriangles: 1 },
  });
  expect(result.resourceBudget.fileBytes).toBe(8);
  expect(result.resourceBudget.meshes).toBe(1);
  expect(result.resourceBudget.vertices).toBe(geometry.getAttribute("position").count);
  expect(result.resourceBudget.triangles).toBe(12);
  expect(result.resourceBudget.exceeded).toEqual(["meshes", "vertices", "triangles"]);
  geometry.dispose();
});

test("import pipeline enforces an explicitly configured file-size ceiling before decoding", async () => {
  let importerCalls = 0;
  const importer = {
    id: "aurum.import", version: "1.0.0",
    load: async () => {
      importerCalls++;
      throw new Error("Decoder must not run");
    },
  } as AurumImportPlugin;
  await expect(createAurumImportPipelineManager(importer, createAurumGeometryEngine()).load({
    file: new File(["123456"], "too-large.3dm"),
    format: "3dm",
    fallbackMaterial: new THREE.MeshBasicMaterial(),
    colorRhinoHex: () => undefined,
    classifyLayer: () => "otro",
    maxFileBytes: 4,
  })).rejects.toMatchObject({ name: "AurumImportBudgetError" });
  expect(importerCalls).toBe(0);
});


test("source geometry cleanup releases only decoder buffers not retained by normalized model", () => {
  const source = new THREE.Group();
  const retainedModel = new THREE.Group();
  const sourceOnlyGeometry = new THREE.BoxGeometry();
  const sharedGeometry = new THREE.SphereGeometry();
  let sourceOnlyDisposals = 0;
  let sharedDisposals = 0;
  sourceOnlyGeometry.addEventListener("dispose", () => { sourceOnlyDisposals += 1; });
  sharedGeometry.addEventListener("dispose", () => { sharedDisposals += 1; });
  source.add(new THREE.Mesh(sourceOnlyGeometry, new THREE.MeshBasicMaterial()));
  source.add(new THREE.Mesh(sharedGeometry, new THREE.MeshBasicMaterial()));
  retainedModel.add(new THREE.Mesh(sharedGeometry, new THREE.MeshBasicMaterial()));

  const released = disposeAurumImportSourceGeometry(source, retainedModel);

  expect(released).toBe(1);
  expect(sourceOnlyDisposals).toBe(1);
  expect(sharedDisposals).toBe(0);
  sourceOnlyGeometry.dispose();
  sharedGeometry.dispose();
});

test("source geometry cleanup is a no-op when GLB source and viewer model are the same object", () => {
  const model = new THREE.Group();
  const geometry = new THREE.BoxGeometry();
  let disposals = 0;
  geometry.addEventListener("dispose", () => { disposals += 1; });
  model.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));

  expect(disposeAurumImportSourceGeometry(model, model)).toBe(0);
  expect(disposals).toBe(0);
  geometry.dispose();
});


test("Rhino hidden layers remain hidden when the layer table is exposed as rhinoLayers", () => {
  const root = new THREE.Group();
  root.userData.rhinoLayers = [
    { id: "hidden-layer", name: "Gemas ocultas", visible: false },
    { id: "visible-layer", name: "Engaste", visible: true },
  ];
  const hidden = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  hidden.userData.attributes = { layerIndex: 0 };
  const visible = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  visible.userData.attributes = { layerIndex: 1 };
  root.add(hidden, visible);

  enforceRhinoLayerVisibilityBeforeExport(root);

  expect(hidden.visible).toBe(false);
  expect(hidden.userData.aurumRhinoVisibility).toMatchObject({
    enforcedBeforeExport: true, layerIndex: 0, layerVisible: false, visible: false,
  });
  expect(visible.visible).toBe(true);
  expect(root.userData.aurumRhinoVisibilityAudit).toMatchObject({ layerCount: 2, hiddenByLayer: 1 });
  hidden.geometry.dispose();
  visible.geometry.dispose();
});

test("a visible Rhino child layer remains hidden when its parent layer is hidden", () => {
  const root = new THREE.Group();
  root.userData.layers = [
    { id: "parent", name: "Conjunto", visible: false },
    { id: "child", name: "Piedras", visible: true, parentLayerId: "parent" },
  ];
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  mesh.userData.attributes = { layerIndex: 1 };
  root.add(mesh);

  enforceRhinoLayerVisibilityBeforeExport(root);

  expect(mesh.visible).toBe(false);
  expect(mesh.userData.aurumRhinoVisibility).toMatchObject({
    layerIndex: 1, layerVisible: false, visible: false,
  });
  mesh.geometry.dispose();
});

test("hidden Rhino block instances remain hidden even when their definition meshes are on visible layers", () => {
  const root = new THREE.Group();
  root.userData.layers = [
    { id: "definition", name: "Definición", visible: true },
    { id: "instance", name: "Instancia oculta", visible: true },
  ];
  const instance = new THREE.Group();
  instance.userData.aurumRhinoInstanceReference = {
    layerIndex: 1,
    objectVisibility: { visible: false, mode: 1 },
  };
  const definitionMesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  definitionMesh.userData.attributes = { layerIndex: 0 };
  instance.add(definitionMesh);
  root.add(instance);

  enforceRhinoLayerVisibilityBeforeExport(root);

  expect(instance.visible).toBe(false);
  expect(definitionMesh.visible).toBe(true);
  expect(instance.userData.aurumRhinoVisibility).toMatchObject({
    layerIndex: 1, objectVisible: false, visible: false,
  });
  definitionMesh.geometry.dispose();
});

test("hidden Rhino objects are excluded even when no layer table is available", () => {
  const root = new THREE.Group();
  const hidden = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  hidden.userData.attributes = { visible: false };
  root.add(hidden);

  enforceRhinoLayerVisibilityBeforeExport(root);

  expect(hidden.visible).toBe(false);
  expect(root.userData.aurumRhinoVisibilityAudit).toMatchObject({ layerCount: 0, hiddenByObject: 1 });
  hidden.geometry.dispose();
});
