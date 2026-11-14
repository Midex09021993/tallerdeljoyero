import { expect, test } from "bun:test";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createAurumCameraControlsContract } from "../src/lib/aurum/core/camera-controls-contract";

function createControls(camera: THREE.PerspectiveCamera) {
  const listeners = new Map<string, Set<EventListener>>();
  const root = {
    addEventListener() {},
    removeEventListener() {},
  };
  const element = {
    style: { touchAction: "", cursor: "auto" },
    ownerDocument: root,
    getRootNode: () => root,
    addEventListener(type: string, listener: EventListener) {
      const group = listeners.get(type) ?? new Set<EventListener>();
      group.add(listener);
      listeners.set(type, group);
    },
    removeEventListener(type: string, listener: EventListener) {
      listeners.get(type)?.delete(listener);
    },
    getBoundingClientRect: () => ({
      left: 0, top: 0, width: 800, height: 600,
      right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}),
    }),
  } as unknown as HTMLElement;
  return new OrbitControls(camera, element);
}

function orientationDistance(a: THREE.Quaternion, b: THREE.Quaternion) {
  return 1 - Math.abs(a.dot(b));
}

test("AURUM CAMERA applies four distinct presets using real Three.js OrbitControls", () => {
  const camera = new THREE.PerspectiveCamera(38, 4 / 3, 0.001, 1000);
  const controls = createControls(camera);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  const model = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), new THREE.MeshBasicMaterial());
  const contract = createAurumCameraControlsContract(camera, controls);

  expect(contract.id).toBe("aurum.camera.controls");
  expect(Object.isFrozen(contract)).toBe(true);

  const poses = new Map<string, { position: THREE.Vector3; quaternion: THREE.Quaternion }>();
  for (const view of ["frontal", "superior", "lateral", "perspectiva"] as const) {
    contract.applyView(model, view, "Anillo");
    camera.updateMatrixWorld(true);
    poses.set(view, { position: camera.position.clone(), quaternion: camera.quaternion.clone() });

    const positionBeforeNextFrame = camera.position.clone();
    const quaternionBeforeNextFrame = camera.quaternion.clone();
    controls.update();
    camera.updateMatrixWorld(true);

    expect(camera.position.distanceTo(positionBeforeNextFrame)).toBeLessThan(1e-7);
    expect(orientationDistance(camera.quaternion, quaternionBeforeNextFrame)).toBeLessThan(1e-7);
    expect(controls.enableDamping).toBe(true);
    expect(controls.target.distanceTo(new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3()))).toBeLessThan(1e-8);
  }

  const frontal = poses.get("frontal")!;
  const superior = poses.get("superior")!;
  const lateral = poses.get("lateral")!;
  const perspective = poses.get("perspectiva")!;
  expect(orientationDistance(frontal.quaternion, superior.quaternion)).toBeGreaterThan(0.05);
  expect(orientationDistance(frontal.quaternion, lateral.quaternion)).toBeGreaterThan(0.05);
  expect(orientationDistance(superior.quaternion, lateral.quaternion)).toBeGreaterThan(0.05);
  expect(orientationDistance(frontal.quaternion, perspective.quaternion)).toBeGreaterThan(0.001);
  expect(Math.abs(superior.position.z - contract.getTarget().z)).toBeGreaterThan(0);
  expect(superior.position.y).toBeGreaterThan(contract.getTarget().y);
  expect(lateral.position.x).toBeGreaterThan(contract.getTarget().x);

  // Exercise the real OrbitControls spherical delta, then ensure the next
  // semantic preset clears it and remains stable on the following update.
  const orbitInternals = controls as unknown as {
    _sphericalDelta: THREE.Spherical;
    _panOffset: THREE.Vector3;
  };
  controls.rotateLeft(0.6);
  const manuallyOrbitedQuaternion = camera.quaternion.clone();
  expect(orientationDistance(manuallyOrbitedQuaternion, perspective.quaternion)).toBeGreaterThan(0.0001);
  const distanceBeforeDolly = controls.getDistance();
  controls.dollyOut(1.1);
  controls.update();
  expect(controls.getDistance()).toBeLessThan(distanceBeforeDolly);

  contract.applyView(model, "lateral", "Anillo");
  const lateralAfterReset = camera.quaternion.clone();
  controls.update();
  expect(orientationDistance(camera.quaternion, lateralAfterReset)).toBeLessThan(1e-7);
  expect(Math.abs(orbitInternals._sphericalDelta.theta) + Math.abs(orbitInternals._sphericalDelta.phi)).toBeLessThan(1e-8);
  expect(orbitInternals._panOffset.length()).toBeLessThan(1e-8);

  const normalDistance = camera.position.distanceTo(controls.target);
  contract.applyView(model, "lateral", "Anillo", { distanceScale: 1.38 });
  expect(camera.position.distanceTo(controls.target)).toBeGreaterThan(normalDistance * 1.3);
  expect(controls.enableDamping).toBe(true);

  const previousOffset = camera.position.clone().sub(controls.target);
  const recenteredTarget = new THREE.Vector3(1, 2, 3);
  contract.centerOn(recenteredTarget);
  expect(controls.target.distanceTo(recenteredTarget)).toBeLessThan(1e-8);
  expect(camera.position.distanceTo(recenteredTarget.clone().add(previousOffset))).toBeLessThan(1e-7);
  const recenteredPosition = camera.position.clone();
  controls.update();
  expect(camera.position.distanceTo(recenteredPosition)).toBeLessThan(1e-7);

  controls.dispose();
  model.geometry.dispose();
  (model.material as THREE.Material).dispose();
});
