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
 * Presentación inicial inspirada directamente en la cámara del VJSON iJewel
 * suministrado por el usuario. El VJSON usa FOV 25 y una posición
 * [-1.2292, 9.3674, 3.2772] mirando al origen. AURUM conserva esa dirección
 * y la escala automáticamente al volumen normalizado de cada joya.
 */
export function applyAurumIJEWELPresentationCamera(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void },
  model: THREE.Object3D | null,
) {
  const target = model
    ? new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3())
    : new THREE.Vector3(0, 0, 0);
  const size = model
    ? new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
    : new THREE.Vector3(2.6, 2.6, 2.6);
  const radius = Math.max(size.length() * .5, 1.3);
  const direction = new THREE.Vector3(-1.2292039067094442, 9.367439285321952, 3.2772151274423926).normalize();
  // The supplied VJSON camera sits at roughly 5x its model radius. After
  // AURUM normalizes imported models to a 2.6-unit envelope, 3.25x keeps the
  // same product scale in the viewport while leaving the soft presentation air.
  const distance = Math.max(radius * 3.25, 4.6);
  camera.fov = 25;
  camera.up.set(0, 1, 0);
  controls.target.copy(target);
  camera.position.copy(target).add(direction.multiplyScalar(distance));
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  controls.update();
}

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

  // Encuadre de presentación: un poco más de aire alrededor de la pieza.
  // El mismo factor base se aplica a todas las vistas para conservar
  // proporcionalidad visual entre frontal, perspectiva, superior y lateral.
  const distance = Math.max(radius * 2.95 * profile.distance, 3.6);
  const verticalBias = radius * profile.vertical;

  controls.target.copy(target);
  if (view === "frontal") {
    camera.up.set(0, 1, 0);
    // Elevación mínima: conserva la lectura frontal pero permite que el plano
    // de producto y su sombra de contacto entren en la composición.
    const productLift = radius * 0.06;
    camera.position.set(target.x, target.y + productLift, target.z + distance);
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