/**
 * AURUM CAMERA — internal OrbitControls contract.
 *
 * OrbitControls is owned by AURUM CAMERA. Application code requests semantic
 * views through this contract instead of mutating camera position/up or
 * calling OrbitControls.update() for presets. GPU and Three.js resources stay
 * owned by the existing viewer lifecycle.
 */
import { MOUSE, type PerspectiveCamera, type Vector3, type Object3D } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { applyAurumCameraView, applyAurumIJEWELPresentationCamera, fitAurumCameraToAspect, centerAurumCameraOn, type AurumCameraView } from "../camera";
import type { IAurumCameraControlsContract } from "./module-contracts";

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
    camera,
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
    update() {
      controls.update();
      camera.updateMatrixWorld(true);
    },
    getTarget() {
      return controls.target;
    },
  };
  return Object.freeze(contract);
}
