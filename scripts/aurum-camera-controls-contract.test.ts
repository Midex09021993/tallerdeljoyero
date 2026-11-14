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

  // Navigation is configured by AURUM CAMERA, not left to OrbitControls defaults.
  expect(controls.enablePan).toBe(true);
  expect(controls.screenSpacePanning).toBe(true);
  expect(controls.panSpeed).toBe(1);
  expect(controls.mouseButtons.RIGHT).toBe(THREE.MOUSE.PAN);
  expect(controls.mouseButtons.LEFT).toBe(THREE.MOUSE.ROTATE);
  expect(controls.mouseButtons.MIDDLE).toBe(THREE.MOUSE.DOLLY);
  contract.configure({ fov: 35, minDistance: 0.5, maxDistance: 20, enablePan: false });
  expect(camera.fov).toBe(35);
  expect(controls.minDistance).toBe(0.5);
  expect(controls.maxDistance).toBe(20);
  expect(controls.enablePan).toBe(false);
  contract.configure({ enablePan: true, screenSpacePanning: true });
  contract.setPose(new THREE.Vector3(0, 0, 8), new THREE.Vector3(0, 0, 0));
  expect(contract.getDistance()).toBeCloseTo(8, 8);
  contract.setDistance(6);
  expect(contract.getDistance()).toBeCloseTo(6, 8);
  contract.setAutoRotate(true, 0.8);
  expect(controls.autoRotate).toBe(true);
  expect(controls.autoRotateSpeed).toBe(0.8);
  contract.setAutoRotate(false);
  expect(controls.autoRotate).toBe(false);
  const cameraState = contract.captureState();
  contract.setAspect(9 / 16);
  contract.setPose(new THREE.Vector3(4, 3, 7), new THREE.Vector3(1, 1, 1));
  contract.setAutoRotate(true, 1.2);
  contract.restoreState(cameraState);
  expect(contract.getDistance()).toBeCloseTo(cameraState.position.distanceTo(cameraState.target), 8);
  expect(contract.getTarget().distanceTo(cameraState.target)).toBeLessThan(1e-8);
  expect(contract.getPosition().distanceTo(cameraState.position)).toBeLessThan(1e-7);
  expect(contract.getUp().distanceTo(cameraState.up)).toBeLessThan(1e-8);
  expect(camera.aspect).toBe(cameraState.aspect);
  expect(controls.autoRotate).toBe(cameraState.autoRotate);
  expect(controls.autoRotateSpeed).toBe(cameraState.autoRotateSpeed);
  expect(contract.id).toBe("aurum.camera.controls");
  expect(Object.isFrozen(contract)).toBe(true);

  const poses = new Map<string, { position: THREE.Vector3; quaternion: THREE.Quaternion }>();
  for (const view of ["frontal", "superior", "lateral", "perspectiva"] as const) {
    controls.autoRotate = true;
    contract.applyView(model, view, "Anillo");
    expect(controls.autoRotate).toBe(false);
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
    if (view === "superior") {
      const viewDirection = controls.target.clone().sub(camera.position).normalize();
      expect(camera.up.distanceTo(new THREE.Vector3(0, 0, -1))).toBeLessThan(1e-8);
      expect(Math.abs(viewDirection.dot(camera.up))).toBeLessThan(1e-5);
    }
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

  // Simulate stale transient input state from an interrupted r185 gesture.
  const r185 = controls as unknown as {
    state: number;
    _controlActive: boolean;
    _scale: number;
    _performCursorZoom: boolean;
    _dollyDirection: THREE.Vector3;
  };
  r185.state = 0;
  r185._controlActive = true;
  r185._scale = 1.25;
  r185._performCursorZoom = true;
  r185._dollyDirection.set(1, 0, 0);

  contract.applyView(model, "lateral", "Anillo");
  expect(r185.state).toBe(-1);
  expect(r185._controlActive).toBe(false);
  expect(r185._scale).toBe(1);
  expect(r185._performCursorZoom).toBe(false);
  expect(r185._dollyDirection.length()).toBeLessThan(1e-8);
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
