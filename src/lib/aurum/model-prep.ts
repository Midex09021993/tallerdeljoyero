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
  const source = new THREE.Box3().setFromObject(model);
  const center = source.getCenter(new THREE.Vector3());
  const size = source.getSize(new THREE.Vector3());
  const max = Math.max(size.x,size.y,size.z) || 1;

  model.position.set(0,0,0);
  model.scale.setScalar(scaleTarget / max);
  model.position.sub(center);
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
