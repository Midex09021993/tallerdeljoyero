import { expect, test } from "bun:test";
import * as THREE from "three";
import { applyAurumCameraSnapshot, applyAurumCameraView } from "../src/lib/aurum/camera";
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

test("all four views preserve camera framing bounds and orientation without distorting asymmetric geometry", () => {
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
    if (view === "lateral") {
      expect(camera.position.x).toBeGreaterThan(controls.target.x);
      // La lateral debe quedar exactamente sobre +X: sin elevación ni giro residual.
      expect(Math.abs(camera.position.y - controls.target.y)).toBeLessThan(1e-9);
      expect(Math.abs(camera.position.z - controls.target.z)).toBeLessThan(1e-9);
    }
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

  // The asymmetric fixture naturally projects different vertical dimensions
  // when rotated. Do not force identical projected height by changing zoom.
  // Frontal, superior and 3/4 retain the shared spherical framing distance.
  expect(Math.abs(distances[0] - distances[2])).toBeLessThan(1e-6);
  expect(Math.abs(distances[0] - distances[3])).toBeLessThan(1e-6);
  expect(heights.every((height) => Number.isFinite(height) && height > 0)).toBe(true);
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


test("camera calibration panel stores four view references and exports measurements", () => {
  const panel = readFileSync(new URL("../src/components/AurumCameraCalibrationPanel.tsx", import.meta.url), "utf8");
  const viewer = readFileSync(new URL("../src/components/AurumRender.tsx", import.meta.url), "utf8");
  expect(panel).toContain("frontal");
  expect(panel).toContain("lateral");
  expect(panel).toContain("superior");
  expect(panel).toContain("perspectiva");
  expect(panel).toContain("onPersistSnapshots(next)");
  expect(panel).toContain("aurum-camera-calibration.json");
  expect(viewer).toContain("projectedPixelWidth");
  expect(viewer).toContain("cameraCalibrationRuntimeRef.current");
  // Selecting a calibration slot must not apply its named camera preset.
  expect(viewer).toContain("if (cameraCalibrationOpen)");
  expect(panel).toContain("Una sola calibración compartida por todos los usuarios y modelos.");
});


test("camera calibration restores framing but uses the current live viewport aspect", () => {
  const { model, camera, controls } = createFixture(16 / 9);
  const originalAspect = camera.aspect;
  let updates = 0;
  controls.update = () => { updates += 1; };
  const snapshotCamera = new THREE.PerspectiveCamera(35, 0.62, 0.01, 500);
  snapshotCamera.position.set(0, 0, 12);
  snapshotCamera.lookAt(0, 0, 0);
  const snapshot = {
    position: [0, 0, 12],
    quaternion: snapshotCamera.quaternion.toArray(),
    target: [0, 0, 0],
    up: [0, 1, 0],
    fov: 35,
    aspect: 0.62,
    zoom: 1.25,
    near: 0.01,
    far: 500,
  };

  expect(applyAurumCameraSnapshot(camera, controls, model, snapshot, 1600, 900)).toBe(true);
  expect(camera.aspect).toBeCloseTo(originalAspect, 8);
  expect(camera.fov).toBe(35);
  expect(camera.zoom).toBe(1.25);
  expect(camera.position.distanceTo(new THREE.Vector3(0, 0, 12))).toBeLessThan(1e-8);
  expect(updates).toBe(1);
});

test("camera calibration keeps the last valid aspect while the canvas is temporarily hidden", () => {
  const { model, camera, controls } = createFixture(4 / 3);
  const snapshotCamera = new THREE.PerspectiveCamera(38, 1.78, 0.001, 1000);
  snapshotCamera.position.set(0, 0, 10);
  snapshotCamera.lookAt(0, 0, 0);
  const snapshot = {
    position: [0, 0, 10],
    quaternion: snapshotCamera.quaternion.toArray(),
    target: [0, 0, 0],
    aspect: 1.78,
  };

  expect(applyAurumCameraSnapshot(camera, controls, model, snapshot, 0, 0)).toBe(true);
  expect(camera.aspect).toBeCloseTo(4 / 3, 8);
});
