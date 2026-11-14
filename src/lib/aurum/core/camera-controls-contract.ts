/**
 * AURUM CAMERA — internal OrbitControls contract.
 *
 * OrbitControls is owned by AURUM CAMERA. Application code requests semantic
 * views through this contract instead of mutating camera position/up or
 * calling OrbitControls.update() for presets. GPU and Three.js resources stay
 * owned by the existing viewer lifecycle.
 */
import * as THREE from "three";
import { MOUSE, type PerspectiveCamera, type Vector3, type Object3D } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { applyAurumCameraView, applyAurumIJEWELPresentationCamera, fitAurumCameraToAspect, centerAurumCameraOn, type AurumCameraView } from "../camera";
import type { IAurumCameraControlsContract, IAurumCameraState } from "./module-contracts";

export function createAurumCameraControlsContract(
  camera: PerspectiveCamera,
  controls: OrbitControls,
): IAurumCameraControlsContract {
  // AURUM CAMERA owns navigation semantics. Keep left-drag for orbit and
  // explicitly bind right-drag to pan so the behavior never depends on the
  // upstream OrbitControls defaults or another viewer's configuration.
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.panSpeed = 1;
  controls.mouseButtons = {
    ...controls.mouseButtons,
    RIGHT: MOUSE.PAN,
  };

  const contract: IAurumCameraControlsContract = {
    id: "aurum.camera.controls",
    version: "1.0.0",
    applyView(model: Object3D | null, view: AurumCameraView, category = "Otro", options = {}) {
      applyAurumCameraView(camera, controls, model, view, category, options);
    },
    applyReferencePresentation(model: Object3D | null) {
      applyAurumIJEWELPresentationCamera(camera, controls, model);
    },
    fitAspect(model: Object3D | null, aspect: number, margin = 1.18) {
      fitAurumCameraToAspect(camera, controls, model, aspect, margin);
    },
    centerOn(target: Vector3) {
      centerAurumCameraOn(camera, controls, target);
    },
    configure(options) {
      if (typeof options.fov === "number" && Number.isFinite(options.fov)) camera.fov = options.fov;
      if (typeof options.near === "number" && Number.isFinite(options.near)) camera.near = Math.max(0.0001, options.near);
      if (typeof options.far === "number" && Number.isFinite(options.far)) camera.far = Math.max(camera.near + 0.001, options.far);
      if (typeof options.minDistance === "number" && Number.isFinite(options.minDistance)) controls.minDistance = Math.max(0, options.minDistance);
      if (typeof options.maxDistance === "number" && Number.isFinite(options.maxDistance)) controls.maxDistance = Math.max(controls.minDistance, options.maxDistance);
      if (typeof options.enablePan === "boolean") controls.enablePan = options.enablePan;
      if (typeof options.enableRotate === "boolean") controls.enableRotate = options.enableRotate;
      if (typeof options.enableZoom === "boolean") controls.enableZoom = options.enableZoom;
      if (typeof options.screenSpacePanning === "boolean") controls.screenSpacePanning = options.screenSpacePanning;
      if (typeof options.panSpeed === "number" && Number.isFinite(options.panSpeed)) controls.panSpeed = options.panSpeed;
      if (typeof options.rotateSpeed === "number" && Number.isFinite(options.rotateSpeed)) controls.rotateSpeed = options.rotateSpeed;
      if (typeof options.zoomSpeed === "number" && Number.isFinite(options.zoomSpeed)) controls.zoomSpeed = options.zoomSpeed;
      if (typeof options.enableDamping === "boolean") controls.enableDamping = options.enableDamping;
      if (typeof options.dampingFactor === "number" && Number.isFinite(options.dampingFactor)) controls.dampingFactor = options.dampingFactor;
      if (typeof options.autoRotateSpeed === "number" && Number.isFinite(options.autoRotateSpeed)) controls.autoRotateSpeed = options.autoRotateSpeed;
      camera.updateProjectionMatrix();
      controls.update();
      camera.updateMatrixWorld(true);
    },
    setPose(position, target = controls.target, up = camera.up) {
      synchronizeOrbitControlsPreset(camera, controls, target, position, up, true);
      camera.updateProjectionMatrix();
    },
    setDistance(distance) {
      if (!Number.isFinite(distance) || distance <= 0) return;
      const offset = camera.position.clone().sub(controls.target);
      if (offset.lengthSq() < 1e-12) offset.set(0, 0, 1);
      offset.setLength(THREE.MathUtils.clamp(distance, controls.minDistance, controls.maxDistance));
      synchronizeOrbitControlsPreset(camera, controls, controls.target.clone(), controls.target.clone().add(offset));
    },
    getDistance() {
      return camera.position.distanceTo(controls.target);
    },
    getAspect() {
      return camera.aspect;
    },
    setAutoRotate(enabled, speed) {
      controls.autoRotate = enabled;
      if (typeof speed === "number" && Number.isFinite(speed)) controls.autoRotateSpeed = speed;
      controls.update();
    },
    setAspect(aspect) {
      if (!Number.isFinite(aspect) || aspect <= 0) return;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    },
    captureState(): IAurumCameraState {
      return {
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
        target: controls.target.clone(),
        up: camera.up.clone(),
        aspect: camera.aspect,
        fov: camera.fov,
        near: camera.near,
        far: camera.far,
        autoRotate: controls.autoRotate,
        autoRotateSpeed: controls.autoRotateSpeed,
      };
    },
    restoreState(state) {
      // Prevent auto-rotation from advancing one extra step while restoring
      // the captured pose; restore its enabled state only after synchronization.
      controls.autoRotate = false;
      synchronizeOrbitControlsPreset(camera, controls, state.target, state.position, state.up);
      camera.quaternion.copy(state.quaternion);
      camera.aspect = state.aspect;
      camera.fov = state.fov;
      camera.near = state.near;
      camera.far = state.far;
      controls.autoRotate = state.autoRotate;
      controls.autoRotateSpeed = state.autoRotateSpeed;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
    },
    update() {
      const changed = controls.update();
      camera.updateMatrixWorld(true);
      return changed;
    },
    getTarget() {
      return controls.target.clone();
    },
    getPosition() {
      return camera.position.clone();
    },
    getUp() {
      return camera.up.clone();
    },
    getAutoRotate() {
      return controls.autoRotate;
    },
    getAutoRotateSpeed() {
      return controls.autoRotateSpeed;
    },
    addEventListener(type, listener) {
      controls.addEventListener(type, listener as (event: any) => void);
    },
    removeEventListener(type, listener) {
      controls.removeEventListener(type, listener as (event: any) => void);
    },
    dispose() {
      controls.dispose();
    },
  };
  return Object.freeze(contract);
}
