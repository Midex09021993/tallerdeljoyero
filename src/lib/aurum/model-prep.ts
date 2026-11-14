import * as THREE from "three";

export interface AurumPreparedModel {
  model: THREE.Object3D;
  bounds: THREE.Box3;
  size: THREE.Vector3;
  height: number;
  targetY: number;
}

export function prepareAurumModel(model: THREE.Object3D, scaleTarget = 2.6): AurumPreparedModel {
  model.updateMatrixWorld(true);
  // Match PublicCatalogViewer: hidden CAD helpers and invisible Rhino layers
  // must not influence centering, normalization, or camera composition.
  const source = new THREE.Box3();
  model.traverse((object) => {
    if (!(object as THREE.Mesh).isMesh || !(object as THREE.Mesh).geometry || !object.visible) return;
    for (let parent = object.parent; parent; parent = parent.parent) {
      if (!parent.visible) return;
    }
    source.expandByObject(object);
  });
  if (source.isEmpty()) throw new Error("El modelo no contiene geometría visible para preparar el encuadre.");
  const center = source.getCenter(new THREE.Vector3());
  const size = source.getSize(new THREE.Vector3());
  const max = Math.max(size.x,size.y,size.z) || 1;

  // Normalize around the true geometric center. The center must be scaled
  // together with the model; subtracting the unscaled center causes a visible
  // offset that becomes more pronounced on imported 3DM files.
  const scale = scaleTarget / max;
  model.scale.setScalar(scale);
  model.position.copy(center).multiplyScalar(-scale);
  model.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(model);
  const normalizedSize = bounds.getSize(new THREE.Vector3());
  const height = normalizedSize.y || 1;
  // Keep the model resting on the ground while preserving its normalized scale.
  const groundOffset = -bounds.min.y;
  model.position.y += groundOffset;
  model.updateMatrixWorld(true);
  const groundedBounds = new THREE.Box3().setFromObject(model);
  const targetY = groundedBounds.min.y + (groundedBounds.max.y - groundedBounds.min.y) * .52;

  return { model, bounds: groundedBounds, size: normalizedSize, height, targetY };
}
