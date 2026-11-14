/**
 * AURUM OBJECT SELECTION
 *
 * Owns viewport picking (pointer -> camera ray -> candidate mesh -> nearest hit).
 * UI state, material assignment and visual highlighting remain orchestrated by
 * AurumRender through the onSelect/onMiss callbacks.
 */
import * as THREE from "three";
import type { IAurumObjectSelectionContract } from "./module-contracts";

export interface AurumObjectSelectionInput {
  readonly camera: THREE.Camera;
  readonly element: HTMLElement;
  readonly getModel: () => THREE.Object3D | null;
  readonly isBlocked?: () => boolean;
  readonly onSelect: (object: THREE.Object3D, intersection: THREE.Intersection) => void;
  readonly onMiss?: () => void;
  readonly onAfterPick?: () => void;
}

export function createAurumObjectSelectionModule(
  input: AurumObjectSelectionInput,
): IAurumObjectSelectionContract {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const worldSphere = new THREE.Sphere();
  let disposed = false;

  const pick = (event: MouseEvent): THREE.Intersection | null => {
    if (disposed || input.isBlocked?.()) return null;
    const model = input.getModel();
    if (!model) return null;
    const rect = input.element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, input.camera);
    model.updateMatrixWorld(true);

    const candidates: THREE.Object3D[] = [];
    model.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.visible || mesh.userData?.aurumInternalInclusion) return;
      const geometry = mesh.geometry;
      if (geometry && !geometry.boundingSphere) geometry.computeBoundingSphere();
      const sphere = geometry?.boundingSphere;
      if (sphere) {
        worldSphere.copy(sphere).applyMatrix4(mesh.matrixWorld);
        if (!raycaster.ray.intersectsSphere(worldSphere)) return;
      }
      candidates.push(mesh);
    });

    return raycaster.intersectObjects(candidates, false)[0] ?? null;
  };

  const contract: IAurumObjectSelectionContract = {
    id: "aurum.object-selection",
    version: "1.0.0",
    pick,
    handleClick(event) {
      if (disposed || input.isBlocked?.()) return;
      const hit = pick(event);
      if (hit?.object) input.onSelect(hit.object, hit);
      else input.onMiss?.();
      input.onAfterPick?.();
    },
    dispose() {
      disposed = true;
    },
  };
  return Object.freeze(contract);
}
