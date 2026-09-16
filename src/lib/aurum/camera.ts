import * as THREE from "three";

export type AurumCameraView = "perspectiva" | "frontal" | "superior" | "lateral";

/**
 * Calcula la composición de cámara usando el volumen real de la joya.
 * Este módulo no conoce React ni modifica el Viewer.
 */
export function applyAurumCameraView(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void },
  model: THREE.Object3D | null,
  view: AurumCameraView
) {
  const target = model
    ? new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3())
    : new THREE.Vector3(0, 0, 0);
  const size = model
    ? new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
    : new THREE.Vector3(2.6, 2.6, 2.6);
  const radius = Math.max(size.length() * 0.5, 1.3);
  const distance = Math.max(radius * 1.75, 3.6);

  controls.target.copy(target);
  if (view === "frontal") {
    camera.up.set(0, 1, 0);
    camera.position.set(target.x, target.y, target.z + distance);
  } else if (view === "superior") {
    camera.up.set(0, 0, -1);
    camera.position.set(target.x, target.y + distance, target.z);
  } else if (view === "lateral") {
    camera.up.set(0, 1, 0);
    camera.position.set(target.x + distance, target.y, target.z);
  } else {
    camera.up.set(0, 1, 0);
    camera.position.set(
      target.x + distance * 0.72,
      target.y + distance * 0.40,
      target.z + distance
    );
  }
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  controls.update();
}