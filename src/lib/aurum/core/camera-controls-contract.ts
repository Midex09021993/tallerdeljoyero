/**
 * AURUM CAMERA — internal control contract.
 *
 * OrbitControls is an implementation detail owned by the camera subsystem.
 * Callers request semantic views; they never mutate OrbitControls directly
 * when changing a camera preset. The contract does not own/dispose Three.js
 * resources and leaves manual orbit/zoom available between preset changes.
 */
import type { PerspectiveCamera, Vector3, Object3D } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { AurumCameraView } from "../camera";

export interface IAurumCameraControlsContract {
  readonly id: "aurum.camera.controls";
  readonly version: "1.0.0";
  readonly camera: PerspectiveCamera;
  readonly controls: OrbitControls;
  applyView(model: Object3D | null, view: AurumCameraView, category?: string): void;
  update(): void;
  getTarget(): Vector3;
}

import { applyAurumCameraView } from "../camera";
import type { IAurumCameraControlsContract } from "./module-contracts";

export function createAurumCameraControlsContract(
  camera: PerspectiveCamera,
  controls: OrbitControls,
): IAurumCameraControlsContract {
  const contract: IAurumCameraControlsContract = {
    id: "aurum.camera.controls",
    version: "1.0.0",
    camera,
    controls,
    applyView(model, view, category = "Otro") {
      applyAurumCameraView(camera, controls, model, view, category);
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
