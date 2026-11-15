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

test("all four camera views preserve the same product scale and center", () => {
  const views = ["frontal", "lateral", "superior", "perspectiva"] as const;
  const distances: number[] = [];

  for (const view of views) {
    const { model, camera, controls } = createFixture();
    applyAurumCameraView(camera, controls, model, view, "Anillo", 1);
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getBoundingSphere(new THREE.Sphere()).center;

    expect(controls.target.distanceTo(center)).toBeLessThan(1e-6);
    expect(camera.position.distanceTo(controls.target)).toBeGreaterThan(0);
    distances.push(camera.position.distanceTo(controls.target));

    if (view === "frontal") expect(camera.position.z).toBeGreaterThan(controls.target.z);
    if (view === "lateral") expect(camera.position.x).toBeGreaterThan(controls.target.x);
    if (view === "superior") expect(camera.position.y).toBeGreaterThan(controls.target.y);
  }

  for (const distance of distances) {
    expect(Math.abs(distance - distances[0]!)).toBeLessThan(1e-6);
  }
});

test("camera view framing respects narrow and wide viewport aspect ratios", () => {
  const distances = [0.62, 1, 1.78].map((aspect) => {
    const { model, camera, controls } = createFixture(aspect);
    applyAurumCameraView(camera, controls, model, "frontal", "Anillo", 1);
    return camera.position.distanceTo(controls.target);
  });

  // Portrait/square layouts must not be framed tighter than the landscape layout.
  expect(distances[0]).toBeGreaterThan(distances[1]!);
  expect(distances[1]).toBeGreaterThan(distances[2]!);
});

test("the UI applies the neutral framing scale to every manual camera view", () => {
  const source = readFileSync(new URL("../src/components/AurumRender.tsx", import.meta.url), "utf8");
  expect(source).toContain('applyAurumCameraView(camara, controles, modelo, id, categoriaProyectoRef.current, 1.0)');
});
