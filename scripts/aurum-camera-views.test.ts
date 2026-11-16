import { expect, test } from "bun:test";
import * as THREE from "three";
import { applyAurumCameraView } from "../src/lib/aurum/camera";
import { readFileSync } from "node:fs";

function createFixture(aspect = 16 / 9) {
  const model = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 1), new THREE.MeshBasicMaterial());
  mesh.position.set(2, 3, -1);
  model.add(mesh);
  model.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera(38, aspect, 0.001, 1000);
  const controls = { target: new THREE.Vector3(), update() {} };
  return { model, camera, controls };
}

function projectedFootprint(model: THREE.Object3D, camera: THREE.PerspectiveCamera) {
  model.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const corners = [
    new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
    new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
    new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.min.z),
    new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.max.z),
    new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.min.z),
    new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
    new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.min.z),
    new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z),
  ];
  return corners.reduce((max, point) => {
    point.project(camera);
    return Math.max(max, Math.abs(point.x), Math.abs(point.y));
  }, 0);
}

test("all four camera views use exactly the same scale and differ only by orientation", () => {
  const views = ["frontal", "lateral", "superior", "perspectiva"] as const;
  const distances: number[] = [];

  for (const view of views) {
    const { model, camera, controls } = createFixture();
    applyAurumCameraView(camera, controls, model, view, "Anillo", 1);
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());

    expect(controls.target.distanceTo(center)).toBeLessThan(1e-6);
    const distance = camera.position.distanceTo(controls.target);
    expect(Number.isFinite(distance)).toBe(true);
    expect(distance).toBeGreaterThan(0);
    distances.push(distance);

    if (view === "frontal") expect(camera.position.z).toBeGreaterThan(controls.target.z);
    if (view === "lateral") expect(camera.position.x).toBeGreaterThan(controls.target.x);
    if (view === "superior") expect(camera.position.y).toBeGreaterThan(controls.target.y);
    if (view === "perspectiva") {
      expect(camera.position.x).toBeGreaterThan(controls.target.x);
      expect(camera.position.y).toBeGreaterThan(controls.target.y);
      expect(camera.position.z).toBeGreaterThan(controls.target.z);
    }

    const footprint = projectedFootprint(model, camera);
    expect(footprint).toBeGreaterThan(0);
    expect(footprint).toBeLessThan(0.75);
  }

  // Every preset is a pure camera rotation around the same target and scale.
  expect(Math.max(...distances) - Math.min(...distances)).toBeLessThan(1e-6);
});

test("camera view framing adapts to portrait, square and landscape viewport ratios", () => {
  for (const aspect of [0.62, 1, 1.78]) {
    const { model, camera, controls } = createFixture(aspect);
    applyAurumCameraView(camera, controls, model, "frontal", "Anillo", 1);
    const footprint = projectedFootprint(model, camera);
    expect(footprint).toBeGreaterThan(0);
    expect(footprint).toBeLessThan(0.75);
  }
});

test("the UI applies the neutral framing scale to every manual camera view", () => {
  const source = readFileSync(new URL("../src/components/AurumRender.tsx", import.meta.url), "utf8");
  expect(source).toContain('applyAurumCameraView(camara, controles, modelo, id, categoriaProyectoRef.current, 1.0)');
});
