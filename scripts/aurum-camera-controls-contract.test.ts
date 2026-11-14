import { expect, test } from "bun:test";
import * as THREE from "three";
import { createAurumCameraControlsContract } from "../src/lib/aurum/core/camera-controls-contract";

test("AURUM CAMERA contract applies semantic presets through its owned OrbitControls", () => {
  const camera = new THREE.PerspectiveCamera(38, 1.5, 0.001, 1000);
  const controls = {
    target: new THREE.Vector3(),
    enableDamping: true,
    updateCalls: 0,
    update() { this.updateCalls += 1; },
  } as any;
  const model = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), new THREE.MeshBasicMaterial());
  const contract = createAurumCameraControlsContract(camera, controls);

  expect(contract.id).toBe("aurum.camera.controls");
  expect(Object.isFrozen(contract)).toBe(true);

  contract.applyView(model, "frontal", "Anillo");
  const frontalPosition = camera.position.clone();
  expect(controls.enableDamping).toBe(true);
  expect(controls.target.distanceTo(new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3()))).toBeLessThan(1e-8);

  contract.applyView(model, "superior", "Anillo");
  expect(camera.position.y).toBeGreaterThan(frontalPosition.y);
  expect(Math.abs(camera.position.z - frontalPosition.z)).toBeGreaterThan(0.1);

  const superiorPosition = camera.position.clone();
  contract.applyView(model, "lateral", "Anillo");
  expect(camera.position.x).toBeGreaterThan(superiorPosition.x);
  const lateralDistance = camera.position.distanceTo(controls.target);
  contract.applyView(model, "lateral", "Anillo", { distanceScale: 1.38 });
  expect(camera.position.distanceTo(controls.target)).toBeGreaterThan(lateralDistance * 1.3);
  expect(controls.enableDamping).toBe(true);

  contract.applyView(model, "perspectiva", "Anillo");
  expect(camera.position.x).not.toBe(controls.target.x);
  expect(controls.updateCalls).toBeGreaterThanOrEqual(8);

  model.geometry.dispose();
  (model.material as THREE.Material).dispose();
});
