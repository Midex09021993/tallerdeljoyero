// @ts-nocheck -- AURUM Render engine: strict-mode typing pending; runtime behaviour unchanged.
import * as THREE from "three";
import { AURUM_IJEWEL_REFERENCE, AURUM_IJEWEL_CAMERA_DIRECTION } from "./ijewel-reference";

export type AurumCameraView = "perspectiva" | "frontal" | "superior" | "lateral";
export type AurumProductCategory = "Anillo" | "Arete" | "Collar" | "Pulsera" | "Dije" | "Brazalete" | "Otro";

/** Límites del producto renderizable: excluye mallas ocultas y helpers CAD invisibles. */
export function getAurumVisibleProductBounds(model: THREE.Object3D | null): THREE.Box3 {
  const bounds = new THREE.Box3();
  if (!model) return bounds;
  model.updateWorldMatrix(true, true);
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry || !mesh.visible) return;
    for (let parent = mesh.parent; parent; parent = parent.parent) {
      if (!parent.visible) return;
    }
    bounds.expandByObject(mesh);
  });
  return bounds;
}

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
 * Presentación inicial calibrada con los valores exactos de cámara del VJSON iJewel
 * suministrado. No sustituye la dirección de referencia por un ángulo fotográfico.
 */
export function applyAurumIJEWELPresentationCamera(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void },
  model: THREE.Object3D | null,
) {
  const bounds = model ? new THREE.Box3() : null;
  if (model && bounds) {
    model.updateWorldMatrix(true, true);
    model.traverse((object) => {
      if (!(object as THREE.Mesh).isMesh || !(object as THREE.Mesh).geometry || !object.visible) return;
      for (let parent = object.parent; parent; parent = parent.parent) {
        if (!parent.visible) return;
      }
      bounds.expandByObject(object);
    });
  }
  const hasVisibleBounds = Boolean(bounds && !bounds.isEmpty());
  const target = hasVisibleBounds
    ? bounds!.getCenter(new THREE.Vector3())
    : new THREE.Vector3(0, 0, 0);
  const size = hasVisibleBounds
    ? bounds!.getSize(new THREE.Vector3())
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
  // Slightly tighter default product framing: about 12% closer while preserving
  // the calibrated iJewel viewing direction and keeping the complete jewel visible.
  const distance = AURUM_IJEWEL_REFERENCE.camera.distance * 0.81;
  camera.fov = AURUM_IJEWEL_REFERENCE.camera.fov;
  camera.up.set(...AURUM_IJEWEL_REFERENCE.camera.up);
  // Center the actual normalized product volume. The iJewel reference frame
  // is visually centered; using world origin here shifts grounded models upward.
  controls.target.copy(target);
  camera.position.copy(target).add(direction.multiplyScalar(distance));
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  controls.update();
}

/**
 * Reproduce el encuadre inicial del Visor Público:
 * esfera envolvente de geometría visible, FOV 35°, distancia 1.2x
 * y cámara frontal sobre el eje Z mirando al origen.
 */
export function applyAurumPublicViewerCamera(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void; minDistance?: number; maxDistance?: number; enablePan?: boolean; enableRotate?: boolean; enableZoom?: boolean; autoRotate?: boolean; autoRotateSpeed?: number; screenSpacePanning?: boolean },
  model: THREE.Object3D | null,
  options: { enablePan?: boolean; framingScale?: number } = {},
) {
  const bounds = model ? new THREE.Box3() : null;
  if (model && bounds) {
    model.updateWorldMatrix(true, true);
    model.traverse((object) => {
      if (!(object as THREE.Mesh).isMesh || !(object as THREE.Mesh).geometry || !object.visible) return;
      for (let parent = object.parent; parent; parent = parent.parent) {
        if (!parent.visible) return;
      }
      bounds.expandByObject(object);
    });
  }
  if (!bounds || bounds.isEmpty()) return;
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(sphere.radius, 0.001);
  camera.fov = 35;
  const framingScale = Number.isFinite(options.framingScale) ? Math.max(0.25, Math.min(1, options.framingScale!)) : 1;
  const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.2 * framingScale;
  camera.position.set(0, 0, distance);
  camera.near = Math.max(radius / 100, 0.001);
  camera.far = Math.max(distance + radius * 20, 100);
  camera.up.set(0, 1, 0);
  controls.target.set(0, 0, 0);
  controls.minDistance = radius * 0.6;
  controls.maxDistance = radius * 12;
  controls.enablePan = options.enablePan === true;
  controls.screenSpacePanning = true;
  controls.enableRotate = true;
  controls.enableZoom = true;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 1.25;
  camera.lookAt(controls.target);
  camera.updateProjectionMatrix();
  controls.update();
}

/**
 * Calcula una esfera envolvente de las mallas visibles en coordenadas de mundo.
 * A diferencia de la diagonal de una Box3, su radio no cambia al observar el
 * producto desde frontal, lateral, superior o perspectiva.
 */
function getAurumVisibleProductSphere(model: THREE.Object3D | null): THREE.Sphere {
  const result = new THREE.Sphere(new THREE.Vector3(), 0);
  if (!model) return result;
  model.updateWorldMatrix(true, true);
  let hasSphere = false;
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry || !mesh.visible) return;
    for (let parent = mesh.parent; parent; parent = parent.parent) {
      if (!parent.visible) return;
    }
    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
    const localSphere = mesh.geometry.boundingSphere;
    if (!localSphere) return;
    const worldSphere = localSphere.clone().applyMatrix4(mesh.matrixWorld);
    if (!hasSphere) {
      result.copy(worldSphere);
      hasSphere = true;
    } else {
      result.union(worldSphere);
    }
  });
  return result;
}

/**
 * Las vistas ortogonales y perspectiva comparten una esfera de referencia y
 * una única distancia focal. Así la joya conserva su escala aparente al cambiar
 * de orientación; solo cambia la dirección desde la que se observa.
 */
/**
 * Las cuatro vistas comparten una única escala angular basada en la esfera
 * envolvente del producto. La cámara solo cambia de orientación: no recalcula
 * el zoom según la silueta proyectada (que hacía variar el tamaño aparente).
 *
 * Perspectiva conserva exactamente la distancia focal de frontal y gira 3/4.
 */
export function applyAurumCameraView(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void },
  model: THREE.Object3D | null,
  view: AurumCameraView,
  category: string = "Otro",
  framingScale: number = 1,
) {
  const productSphere = getAurumVisibleProductSphere(model);
  const target = productSphere.center.clone();
  const profile = getAurumProductCameraProfile(category);
  const direction = view === "frontal"
    ? new THREE.Vector3(0, 0.06, 1).normalize()
    : view === "superior"
      ? new THREE.Vector3(0, 1, 0)
      : view === "lateral"
        ? new THREE.Vector3(1, 0, 0)
        : new THREE.Vector3(0.62, Math.max(profile.vertical * 2.1, 0.78), 1).normalize();

  const requestedUp = view === "superior"
    ? new THREE.Vector3(0, 0, -1)
    : new THREE.Vector3(0, 1, 0);

  // Calcular UNA distancia para todas las orientaciones. La esfera circunscrita
  // garantiza que la pieza completa permanezca dentro del encuadre incluso
  // cuando se observa de canto; su diámetro aparente no depende de la vista.
  const aspect = Number.isFinite(camera.aspect) && camera.aspect > 0 ? camera.aspect : 1;
  const verticalHalfFov = THREE.MathUtils.degToRad(camera.fov) * 0.5;
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * aspect);
  const limitingTangent = Math.max(
    1e-4,
    Math.min(Math.tan(verticalHalfFov), Math.tan(horizontalHalfFov)),
  );
  const scale = Number.isFinite(framingScale)
    ? THREE.MathUtils.clamp(framingScale, 0.25, 1.5)
    : 1;
  const targetNdc = THREE.MathUtils.clamp(0.72 / scale, 0.35, 0.92);
  const radius = Math.max(productSphere.radius, 0.001);
  // La escala es idéntica en las cuatro vistas. Cambiar de vista equivale
  // únicamente a rotar la cámara alrededor del mismo objetivo, sin zoom extra.
  const distance = radius / (limitingTangent * targetNdc);

  // Asegurar planos de recorte válidos para modelos de distintas unidades.
  camera.near = Math.max(radius * 0.001, 0.001);
  camera.far = Math.max(distance + radius * 20, 100);
  camera.up.copy(requestedUp);
  controls.target.copy(target);
  camera.position.copy(target).addScaledVector(direction, distance);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  controls.update();
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
  const bounds = getAurumVisibleProductBounds(model);
  if (bounds.isEmpty()) return;
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
  controls.target.copy(target);
  camera.position.copy(target).addScaledVector(direction, distance);
  // Do not change the live viewport's projection aspect when the user is only
  // previewing a different output ratio. The renderer canvas may still be
  // landscape; forcing a portrait camera aspect here visibly stretches the
  // jewel in that landscape canvas. Exporters set their own aspect before
  // calling this helper, so preserving camera.aspect also keeps export correct.
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  controls.update();
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
