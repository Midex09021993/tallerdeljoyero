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
  if (model) model.updateWorldMatrix(true, true);
  const productSphere = getAurumVisibleProductSphere(model);
  const target = productSphere.center.clone();
  const profile = getAurumProductCameraProfile(category);

  // Define las vistas en los ejes propios del modelo, no en los globales.
  // Los modelos Rhino/GLB pueden llegar con una orientación distinta; usar
  // +X global producía una lateral incorrecta aunque el selector funcionara.
  const modelWorldQuaternion = model
    ? model.getWorldQuaternion(new THREE.Quaternion())
    : new THREE.Quaternion();
  const modelAxis = (x: number, y: number, z: number) =>
    new THREE.Vector3(x, y, z).applyQuaternion(modelWorldQuaternion).normalize();
  const frontalDirection = modelAxis(0, 0, 1);
  const lateralDirection = modelAxis(1, 0, 0);
  const superiorDirection = modelAxis(0, 1, 0);
  const direction = view === "frontal"
    ? frontalDirection
    : view === "superior"
      ? superiorDirection
      : view === "lateral"
        ? lateralDirection
        : modelAxis(0.62, Math.max(profile.vertical * 2.1, 0.78), 1);

  const requestedUp = view === "superior"
    ? modelAxis(0, 0, -1)
    : superiorDirection;

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
  // La escala de referencia nace en frontal. En una cámara perspectiva,
  // la profundidad de cada punto puede cambiar unos píxeles la altura aparente
  // al girar 90°. Calibramos lateral contra la proyección frontal del MISMO
  // volumen, sin escalar ni deformar la geometría.
  const referenceDistance = radius / (limitingTangent * targetNdc);
  let distance = referenceDistance;
  if (view === "lateral" && model) {
    const bounds = getAurumVisibleProductBounds(model);
    if (!bounds.isEmpty()) {
      const corners = [
        new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
        new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
        new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.min.z),
        new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.max.z),
        new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.min.z),
        new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
        new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.min.z),
        new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z),
      ];
      const projectedHeight = (viewDirection: THREE.Vector3, cameraDistance: number) => {
        const probe = new THREE.PerspectiveCamera(camera.fov, aspect, camera.near, camera.far);
        probe.up.copy(superiorDirection);
        probe.position.copy(target).addScaledVector(viewDirection, cameraDistance);
        probe.lookAt(target);
        probe.updateMatrixWorld(true);
        const ys = corners.map(point => point.clone().project(probe).y);
        return Math.max(...ys) - Math.min(...ys);
      };
      const frontalHeight = projectedHeight(frontalDirection, referenceDistance);
      const lateralHeight = projectedHeight(lateralDirection, referenceDistance);
      if (frontalHeight > 1e-6 && lateralHeight > 1e-6) {
        // Repetir la corrección una vez reduce el error de perspectiva residual.
        distance = referenceDistance * THREE.MathUtils.clamp(lateralHeight / frontalHeight, 0.8, 1.2);
        const correctedHeight = projectedHeight(lateralDirection, distance);
        if (correctedHeight > 1e-6) {
          distance *= THREE.MathUtils.clamp(correctedHeight / frontalHeight, 0.95, 1.05);
        }
      }
    }
  }

  // Asegurar planos de recorte válidos para modelos de distintas unidades.
  camera.near = Math.max(radius * 0.001, 0.001);
  camera.far = Math.max(distance + radius * 20, 100);
  camera.up.copy(requestedUp);
  controls.target.copy(target);
  camera.position.copy(target).addScaledVector(direction, distance);
  camera.lookAt(target);
  camera.updateProjectionMatrix();

  // En lateral, la silueta proyectada del anillo no queda simétrica respecto
  // al centro geométrico (la montura y el brazo cargan más volumen arriba).
  // Corregimos solo el encuadre: desplazamos cámara y target juntos en el
  // plano de imagen, sin cambiar distancia, orientación ni escala.
  if (view === "lateral" && model) {
    camera.updateMatrixWorld(true);
    const bounds = getAurumVisibleProductBounds(model);
    if (!bounds.isEmpty()) {
      const corners = [
        new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
        new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
        new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.min.z),
        new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.max.z),
        new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.min.z),
        new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
        new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.min.z),
        new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z),
      ];
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      let depthSum = 0;
      for (const corner of corners) {
        const viewPoint = corner.clone().applyMatrix4(camera.matrixWorldInverse);
        const projected = corner.clone().project(camera);
        minX = Math.min(minX, projected.x);
        maxX = Math.max(maxX, projected.x);
        minY = Math.min(minY, projected.y);
        maxY = Math.max(maxY, projected.y);
        depthSum += -viewPoint.z;
      }
      const centerNdcX = (minX + maxX) * 0.5;
      const centerNdcY = (minY + maxY) * 0.5;
      const depth = Math.max(depthSum / corners.length, camera.near);
      const verticalHalfFov = THREE.MathUtils.degToRad(camera.fov) * 0.5;
      const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * aspect);
      const shiftRight = centerNdcX * depth * Math.tan(horizontalHalfFov);
      const shiftUp = centerNdcY * depth * Math.tan(verticalHalfFov);
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
      const framingShift = right.multiplyScalar(shiftRight).add(up.multiplyScalar(shiftUp));
      camera.position.add(framingShift);
      target.add(framingShift);
      controls.target.copy(target);
      camera.lookAt(target);
      camera.updateMatrixWorld(true);
    }
  }

  controls.update();
}
/**
 * Restaura una referencia de cámara sin imponer la proporción de pantalla
 * con la que fue capturada. El encuadre pertenece a la calibración; el aspect
 * pertenece al viewport vivo y puede cambiar al redimensionar el visor.
 */
export function applyAurumCameraSnapshot(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void },
  model: THREE.Object3D | null,
  snapshot: any,
  viewportWidth = 0,
  viewportHeight = 0,
) {
  if (!snapshot || !Array.isArray(snapshot.position) || !Array.isArray(snapshot.quaternion) || !Array.isArray(snapshot.target)) return false;

  if (model && Array.isArray(snapshot.normalizedPosition) && Array.isArray(snapshot.normalizedTarget)) {
    model.updateWorldMatrix(true, true);
    const currentBounds = getAurumVisibleProductBounds(model);
    if (!currentBounds.isEmpty()) {
      const currentSphere = currentBounds.getBoundingSphere(new THREE.Sphere());
      const scale = Math.max(currentSphere.radius, 1e-6);
      camera.position.fromArray(snapshot.normalizedPosition).multiplyScalar(scale).add(currentSphere.center);
      controls.target.fromArray(snapshot.normalizedTarget).multiplyScalar(scale).add(currentSphere.center);
    } else {
      camera.position.fromArray(snapshot.position);
      controls.target.fromArray(snapshot.target);
    }
  } else {
    // Backward compatibility for calibration snapshots captured before normalization.
    camera.position.fromArray(snapshot.position);
    controls.target.fromArray(snapshot.target);
  }

  camera.quaternion.fromArray(snapshot.quaternion);
  if (Array.isArray(snapshot.up)) camera.up.fromArray(snapshot.up);
  if (Number.isFinite(snapshot.fov)) camera.fov = snapshot.fov;
  // Never restore snapshot.aspect: it belongs to the old capture viewport.
  const measuredAspect = viewportWidth >= 2 && viewportHeight >= 2
    ? viewportWidth / viewportHeight
    : camera.aspect;
  if (Number.isFinite(measuredAspect) && measuredAspect > 0) camera.aspect = measuredAspect;
  if (Number.isFinite(snapshot.zoom) && snapshot.zoom > 0) camera.zoom = snapshot.zoom;
  if (Number.isFinite(snapshot.near) && snapshot.near > 0) camera.near = snapshot.near;
  if (Number.isFinite(snapshot.far) && snapshot.far > camera.near) camera.far = snapshot.far;

  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  controls.update();
  return true;
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
  if (!Number.isFinite(aspect) || aspect <= 0 || !model) return;
  const bounds = getAurumVisibleProductBounds(model);
  if (bounds.isEmpty()) return;

  // Fit the actual visible world-space bounds against the REQUESTED output
  // aspect, not the live canvas aspect. A bounding-sphere approximation can
  // leave a portrait export excessively zoomed out and can hide the fact that
  // the action was applied. Project all eight AABB corners onto the current
  // camera's right/up axes and solve the minimum perspective distance.
  const target = bounds.getCenter(new THREE.Vector3());
  const corners = [
    new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
    new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
    new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.min.z),
    new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.max.z),
    new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.min.z),
    new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
    new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.min.z),
    new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z),
  ];
  const direction = camera.position.clone().sub(controls.target);
  if (direction.lengthSq() < 1e-8) direction.set(0, 0, 1);
  direction.normalize();

  camera.updateMatrixWorld(true);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
  const halfVerticalFov = Math.atan(
    Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5) / Math.max(camera.zoom, 1e-6),
  );
  const halfHorizontalFov = Math.atan(Math.tan(halfVerticalFov) * aspect);
  const tanVertical = Math.max(Math.tan(halfVerticalFov), 1e-6);
  const tanHorizontal = Math.max(Math.tan(halfHorizontalFov), 1e-6);

  let requiredDistance = 0;
  for (const corner of corners) {
    const relative = corner.clone().sub(target);
    const depthOffset = relative.dot(direction);
    const horizontal = Math.abs(relative.dot(right));
    const vertical = Math.abs(relative.dot(up));
    requiredDistance = Math.max(
      requiredDistance,
      depthOffset + horizontal / tanHorizontal,
      depthOffset + vertical / tanVertical,
    );
  }

  const safeMargin = Number.isFinite(margin) ? THREE.MathUtils.clamp(margin, 1, 2) : 1.18;
  const distance = Math.max(requiredDistance * safeMargin, 0.01);
  controls.target.copy(target);
  camera.position.copy(target).addScaledVector(direction, distance);
  // Keep camera.aspect tied to the live canvas. The requested output aspect is
  // used only for framing; changing projection aspect here would distort the
  // live preview whenever the output is portrait or square.
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
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
