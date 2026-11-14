// @ts-nocheck -- AURUM Render engine: strict-mode typing pending; runtime behaviour unchanged.
import * as THREE from "three";
import { AURUM_IJEWEL_REFERENCE, AURUM_IJEWEL_CAMERA_DIRECTION } from "./ijewel-reference";

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
 * Synchronize a semantic camera preset with the real OrbitControls state.
 * OrbitControls reads the camera's Cartesian position on update(), then
 * applies its pending spherical/pan deltas. Clear those deltas first so an
 * older gesture cannot overwrite the requested preset on the next frame.
 */
function synchronizeOrbitControlsPreset(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void; enableDamping?: boolean },
  target: THREE.Vector3,
  position: THREE.Vector3,
) {
  const orbit = controls as typeof controls & {
    _sphericalDelta?: THREE.Spherical;
    _panOffset?: THREE.Vector3;
    _scale?: number;
    _zoomChanged?: boolean;
  };
  const previousDamping = controls.enableDamping;
  if (previousDamping !== undefined) controls.enableDamping = false;

  orbit._sphericalDelta?.set(0, 0, 0);
  orbit._panOffset?.set(0, 0, 0);
  if (typeof orbit._scale === "number") orbit._scale = 1;
  if (typeof orbit._zoomChanged === "boolean") orbit._zoomChanged = false;

  controls.target.copy(target);
  camera.position.copy(position);
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
  controls.update();

  if (previousDamping !== undefined) controls.enableDamping = previousDamping;
  camera.updateMatrixWorld(true);
}

/** Recenter the current camera direction on a new target without bypassing OrbitControls. */
export function centerAurumCameraOn(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void; enableDamping?: boolean },
  target: THREE.Vector3,
) {
  const offset = camera.position.clone().sub(controls.target);
  synchronizeOrbitControlsPreset(camera, controls, target, target.clone().add(offset));
}


/**
 * Presentación inicial calibrada con los valores exactos de cámara del VJSON iJewel
 * suministrado. No sustituye la dirección de referencia por un ángulo fotográfico.
 */
export function applyAurumIJEWELPresentationCamera(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void },
  model: THREE.Object3D | null,
) {
  const bounds = model ? new THREE.Box3().setFromObject(model) : null;
  const target = bounds
    ? bounds.getCenter(new THREE.Vector3())
    : new THREE.Vector3(0, 0, 0);
  const size = bounds
    ? bounds.getSize(new THREE.Vector3())
    : new THREE.Vector3(2.6, 2.6, 2.6);
  const radius = Math.max(size.length() * .5, 1.3);
  // The VJSON coordinates are stored in the viewer coordinate system; after
  // AURUM normalizes Rhino/Three models, using them literally produces an
  // excessively top-down shot. The supplied iJewel screenshot shows a gentle
  // 3/4 elevation, so preserve the VJSON FOV while calibrating the direction
  // to that photographed presentation.
  // Direction is normalized from the actual defaultCamera.position in the
  // supplied WebGi VJSON. AURUM keeps its normalized-model distance, but does
  // not invent a different viewing angle for reference mode.
  const direction = new THREE.Vector3(...AURUM_IJEWEL_CAMERA_DIRECTION);
  // Keep generous negative space around the product, as in the reference
  // presentation. The final viewport framing is intentionally not a tight CAD fit.
  // VJSON camera distance is |position| around the origin. Because the
  // reference model is normalized to the documented autoScaleRadius=2,
  // preserve the measured distance instead of re-fitting the camera.
  // Slightly tighter default product framing: about 6% closer while preserving
  // the calibrated iJewel viewing direction and keeping the complete jewel visible.
  const distance = AURUM_IJEWEL_REFERENCE.camera.distance * 0.94;
  camera.fov = AURUM_IJEWEL_REFERENCE.camera.fov;
  // Keep the viewer's Y-up convention stable and synchronize OrbitControls
  // atomically so pending user deltas cannot restore the previous pose.
  const position = target.clone().add(direction.multiplyScalar(distance));
  synchronizeOrbitControlsPreset(camera, controls, target, position);
  camera.updateProjectionMatrix();
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
  category: string = "Otro",
  options: { distanceScale?: number } = {},
) {
  const bounds = model ? new THREE.Box3().setFromObject(model) : null;
  const target = bounds
    ? bounds.getCenter(new THREE.Vector3())
    : new THREE.Vector3(0, 0, 0);
  const size = bounds
    ? bounds.getSize(new THREE.Vector3())
    : new THREE.Vector3(2.6, 2.6, 2.6);
  const radius = Math.max(size.length() * 0.5, 0.01);
  const profile = getAurumProductCameraProfile(category);

  // Encuadre automático por volumen real y campo de visión. La esfera que
  // envuelve la pieza debe caber tanto en vertical como en horizontal; esto
  // evita que modelos altos/anchos se recorten en visores con otra proporción.
  const aspect = Number.isFinite(camera.aspect) && camera.aspect > 0 ? camera.aspect : 1;
  const verticalHalfFov = THREE.MathUtils.degToRad(camera.fov) * 0.5;
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * aspect);
  const limitingHalfFov = Math.max(0.01, Math.min(verticalHalfFov, horizontalHalfFov));
  const fitDistance = radius / Math.sin(limitingHalfFov);
  // Encuadre inicial ligeramente más cercano: elimina el margen extra del
  // 10% que dejaba demasiado espacio vacío alrededor de piezas pequeñas.
  // Los perfiles por categoría siguen añadiendo distancia cuando la necesitan.
  const distanceScale = Number.isFinite(options.distanceScale) ? Math.max(0.1, Math.min(4, Number(options.distanceScale))) : 1;
  const distance = Math.max(fitDistance * 1.00 * profile.distance * distanceScale, 0.1);
  const verticalBias = radius * profile.vertical;

  let position: THREE.Vector3;
  if (view === "frontal") {
    // Frontal on +Z with a slight elevation for the jewelry silhouette.
    const productLift = radius * 0.06;
    position = new THREE.Vector3(target.x, target.y + productLift, target.z + distance);
  } else if (view === "superior") {
    // A tiny +Z offset avoids the polar singularity at phi = 0 while
    // remaining visually indistinguishable from a true top-down view.
    position = new THREE.Vector3(
      target.x,
      target.y + distance,
      target.z + Math.max(distance * 0.0001, 0.00001),
    );
  } else if (view === "lateral") {
    position = new THREE.Vector3(target.x + distance, target.y, target.z);
  } else {
    const perspectiveDirection = new THREE.Vector3(0.62, Math.max(profile.vertical * 2.1, 0.78), 1).normalize();
    position = target.clone().addScaledVector(perspectiveDirection, distance);
  }

  synchronizeOrbitControlsPreset(camera, controls, target, position);
  camera.updateProjectionMatrix();
}
/** Ajusta la cámara a una proporción de salida sin deformar el modelo.
 * Conserva la dirección actual de observación y centra el volumen real.
 */
export function fitAurumCameraToAspect(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void },
  model: THREE.Object3D | null,
  aspect: number,
  margin = 1.18,
) {
  if (!Number.isFinite(aspect) || aspect <= 0) return;
  const bounds = model ? new THREE.Box3().setFromObject(model) : null;
  if (!bounds || bounds.isEmpty()) return;
  const target = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const radius = Math.max(size.length() * 0.5, 0.01);
  const verticalHalfFov = THREE.MathUtils.degToRad(camera.fov) * 0.5;
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * aspect);
  const limitingHalfFov = Math.max(0.01, Math.min(verticalHalfFov, horizontalHalfFov));
  const distance = (radius / Math.sin(limitingHalfFov)) * Math.max(1, margin);
  const direction = camera.position.clone().sub(controls.target);
  if (direction.lengthSq() < 1e-8) direction.set(0, 0, 1);
  direction.normalize();
  const position = target.clone().addScaledVector(direction, distance);
  // Do not change the live viewport's projection aspect when the user is only
  // previewing a different output ratio. The renderer canvas may still be
  // landscape; forcing a portrait camera aspect here visibly stretches the
  // jewel in that landscape canvas. Exporters set their own aspect before
  // calling this helper, so preserving camera.aspect also keeps export correct.
  synchronizeOrbitControlsPreset(camera, controls, target, position);
  camera.updateProjectionMatrix();
}


/**
 * Calcula una distancia focal en espacio de cámara para DOF.
 * Prioriza la superficie visible de la gema de mayor tamaño y, si no hay
 * una gema visible, sondea varias zonas de la pieza para evitar enfocar el fondo.
 */
export function calculateAurumFocalDepth(
  camera: THREE.PerspectiveCamera,
  controls: { target?: THREE.Vector3 } | null | undefined,
  model: THREE.Object3D,
): number {
  camera.updateMatrixWorld(true);
  model.updateWorldMatrix(true, true);

  const meshes: THREE.Mesh[] = [];
  const gemMeshes: THREE.Mesh[] = [];
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    meshes.push(mesh);
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const materialGem = materials.some((material) =>
      Boolean((material as THREE.Material & { userData?: Record<string, unknown> })?.userData?.aurumGemFamily
        || (material as THREE.Material & { userData?: Record<string, unknown> })?.userData?.aurumOpticalProfile),
    );
    const meta = mesh.userData ?? {};
    const layer = String(meta.capa ?? meta.layerName ?? meta.nombreCapa ?? mesh.name ?? "").toLowerCase();
    if (materialGem || meta.aurumGemFamily || meta.aurumOpticalProfile || String(meta.categoria ?? "").toLowerCase() === "gema"
      || /(gem|stone|gema|piedra|diamante|diamond|zafiro|sapphire|rubi|ruby|esmeralda|emerald|moissanita)/.test(layer)) {
      gemMeshes.push(mesh);
    }
  });

  const raycaster = new THREE.Raycaster();
  const projectAndHit = (object: THREE.Object3D): THREE.Intersection | null => {
    const bounds = new THREE.Box3().setFromObject(object);
    if (bounds.isEmpty()) return null;
    const center = bounds.getCenter(new THREE.Vector3());
    const screen = center.project(camera);
    if (!Number.isFinite(screen.x) || !Number.isFinite(screen.y) || screen.z < -1 || screen.z > 1
      || Math.abs(screen.x) > 1 || Math.abs(screen.y) > 1) return null;
    raycaster.setFromCamera(new THREE.Vector2(screen.x, screen.y), camera);
    return raycaster.intersectObject(object, true)[0] ?? null;
  };

  if (gemMeshes.length) {
    gemMeshes.sort((a, b) => {
      const size = (mesh: THREE.Mesh) => {
        const bounds = new THREE.Box3().setFromObject(mesh);
        const dimensions = bounds.getSize(new THREE.Vector3());
        return dimensions.x * dimensions.y * dimensions.z;
      };
      return size(b) - size(a);
    });
    for (const gem of gemMeshes) {
      const hit = projectAndHit(gem);
      if (hit) {
        const viewPoint = hit.point.clone().applyMatrix4(camera.matrixWorldInverse);
        const depth = -viewPoint.z;
        if (Number.isFinite(depth) && depth > camera.near) return depth;
      }
    }
  }

  const probes: Array<[number, number]> = [[0, 0], [0, 0.25], [0, -0.2], [-0.2, 0], [0.2, 0]];
  const hits: THREE.Intersection[] = [];
  for (const [x, y] of probes) {
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    hits.push(...raycaster.intersectObjects(meshes, false));
  }
  hits.sort((a, b) => a.distance - b.distance);
  if (hits.length) {
    const viewPoint = hits[0].point.clone().applyMatrix4(camera.matrixWorldInverse);
    const depth = -viewPoint.z;
    if (Number.isFinite(depth) && depth > camera.near) return depth;
  }

  const bounds = new THREE.Box3().setFromObject(model);
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  const radius = Number.isFinite(sphere.radius) && sphere.radius > 0 ? sphere.radius : 1.3;
  const target = controls?.target ?? sphere.center;
  const fallback = camera.position.distanceTo(target) - radius * 0.7;
  return Math.max(camera.near + 0.001, Math.min(camera.far - 0.001, Number.isFinite(fallback) ? fallback : 4));
}
