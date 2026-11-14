import * as THREE from "three";

export interface AurumPreparedModel {
  model: THREE.Object3D;
  bounds: THREE.Box3;
  size: THREE.Vector3;
  height: number;
  targetY: number;
}

function getVisibleMeshBounds(model: THREE.Object3D): THREE.Box3 {
  const bounds = new THREE.Box3();
  model.traverse((object) => {
    if (!(object as THREE.Mesh).isMesh || !(object as THREE.Mesh).geometry || !object.visible) return;
    for (let parent = object.parent; parent; parent = parent.parent) {
      if (!parent.visible) return;
    }
    bounds.expandByObject(object);
  });
  return bounds;
}

export function prepareAurumModel(model: THREE.Object3D, scaleTarget = 2.6): AurumPreparedModel {
  model.updateMatrixWorld(true);
  // Preserve the imported 3DM root transform/origin as source metadata before
  // presentation normalization changes the root transform for viewport scale.
  if (!model.userData?.aurumSourceTransform) {
    const sourceWorldPosition = model.getWorldPosition(new THREE.Vector3());
    model.userData = {
      ...(model.userData ?? {}),
      aurumSourceTransform: {
        position: sourceWorldPosition.toArray(),
        localPosition: model.position.toArray(),
        localScale: model.scale.toArray(),
        localQuaternion: model.quaternion.toArray(),
        localMatrix: model.matrix.toArray(),
      },
    };
  }
  // Match PublicCatalogViewer: hidden CAD helpers and invisible Rhino layers
  // must not influence centering, normalization, grounding, or camera composition.
  const source = getVisibleMeshBounds(model);
  if (source.isEmpty()) throw new Error("El modelo no contiene geometría visible para preparar el encuadre.");
  const center = source.getCenter(new THREE.Vector3());
  const size = source.getSize(new THREE.Vector3());
  const max = Math.max(size.x,size.y,size.z) || 1;

  // Normalize around the true visible geometric center.
  const scale = scaleTarget / max;
  model.scale.setScalar(scale);
  model.position.copy(center).multiplyScalar(-scale);
  model.updateMatrixWorld(true);

  const bounds = getVisibleMeshBounds(model);
  const normalizedSize = bounds.getSize(new THREE.Vector3());
  const height = normalizedSize.y || 1;
  // Keep the visible product resting on the ground without hidden CAD helpers
  // changing its vertical placement.
  const groundOffset = -bounds.min.y;
  model.position.y += groundOffset;
  model.updateMatrixWorld(true);
  const groundedBounds = getVisibleMeshBounds(model);
  const targetY = groundedBounds.min.y + (groundedBounds.max.y - groundedBounds.min.y) * .52;

  return { model, bounds: groundedBounds, size: normalizedSize, height, targetY };
}
