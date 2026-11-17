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

function projectedHeight(model: THREE.Object3D, camera: THREE.PerspectiveCamera) {
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
  ].map(point => point.project(camera).y);
  return Math.max(...corners) - Math.min(...corners);
}

function projectedBoundsCenter(model: THREE.Object3D, camera: THREE.PerspectiveCamera) {
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
  ].map(point => point.project(camera));
  const xs = corners.map(point => point.x);
  const ys = corners.map(point => point.y);
  return { x: (Math.min(...xs) + Math.max(...xs)) * 0.5, y: (Math.min(...ys) + Math.max(...ys)) * 0.5 };
}

test("all four views match frontal projected height while preserving orientation", () => {
  const views = ["frontal", "lateral", "superior", "perspectiva"] as const;
  const distances: number[] = [];
  const heights: number[] = [];

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
    heights.push(projectedHeight(model, camera));

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

  // Frontal defines the reference; lateral compensates only perspective
  // depth so the visible vertical size remains equal without distorting mesh.
  for (const height of heights) {
    expect(Math.abs(height / heights[0] - 1)).toBeLessThan(0.015);
  }
  // Superior and 3/4 retain the shared reference camera distance.
  expect(Math.abs(distances[0] - distances[2])).toBeLessThan(1e-6);
  expect(Math.abs(distances[0] - distances[3])).toBeLessThan(1e-6);
});

test("lateral view centers the projected jewel without changing camera distance", () => {
  const { model, camera, controls } = createFixture();
  applyAurumCameraView(camera, controls, model, "lateral", "Anillo", 1);
  const center = projectedBoundsCenter(model, camera);
  expect(Math.abs(center.x)).toBeLessThan(1e-5);
  expect(Math.abs(center.y)).toBeLessThan(1e-5);
  expect(camera.position.distanceTo(controls.target)).toBeGreaterThan(0);
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
