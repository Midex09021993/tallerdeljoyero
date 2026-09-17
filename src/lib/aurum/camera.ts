import * as THREE from "three";

export type AurumCameraView = "perspectiva" | "frontal" | "superior" | "lateral";
export type AurumProductCategory = "Anillo" | "Arete" | "Collar" | "Pulsera" | "Dije" | "Brazalete" | "Otro";

export const AURUM_PRODUCT_CAMERA_PROFILES: Record<AurumProductCategory, {
  distance: number;
  vertical: number;
  preferredView: AurumCameraView;
}> = {
  Anillo:   { distance: 1.00, vertical: 0.40, preferredView: "perspectiva" },
  Arete:    { distance: 1.12, vertical: 0.30, preferredView: "frontal" },
  Collar:   { distance: 1.28, vertical: 0.18, preferredView: "frontal" },
  Pulsera:  { distance: 1.18, vertical: 0.28, preferredView: "perspectiva" },
  Dije:     { distance: 1.08, vertical: 0.32, preferredView: "frontal" },
  Brazalete:{ distance: 1.18, vertical: 0.25, preferredView: "perspectiva" },
  Otro:     { distance: 1.00, vertical: 0.40, preferredView: "perspectiva" },
};

export const getAurumProductCameraProfile = (category: string) =>
  AURUM_PRODUCT_CAMERA_PROFILES[category as AurumProductCategory] ??
  AURUM_PRODUCT_CAMERA_PROFILES.Otro;

/**
 * Calcula la composición de cámara usando el volumen real de la joya.
 * El encuadre mantiene una escala coherente entre todas las vistas.
 */
export function applyAurumCameraView(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void },
  model: THREE.Object3D | null,
  view: AurumCameraView,
  category: string = "Otro"
) {
  const target = model
    ? new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3())
    : new THREE.Vector3(0, 0, 0);
  const size = model
    ? new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
    : new THREE.Vector3(2.6, 2.6, 2.6);
  const radius = Math.max(size.length() * 0.5, 1.3);
  const profile = getAurumProductCameraProfile(category);

  // Un poco más de aire alrededor de la pieza para una presentación de producto.
  // Se aplica por igual a frontal, perspectiva, superior y lateral.
  const distance = Math.max(radius * 2.65 * profile.distance, 3.6);
  const verticalBias = radius * profile.vertical;

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
      target.y + distance * profile.vertical + verticalBias,
      target.z + distance
    );
  }
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  controls.update();
}