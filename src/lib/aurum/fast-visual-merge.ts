import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export interface AurumFastVisualMergeReport {
  readonly candidates: number;
  readonly mergedGroups: number;
  readonly mergedMeshes: number;
  readonly preservedSources: number;
  readonly skippedGroups: number;
  readonly errors: readonly string[];
}

type MergeGroup = {
  parent: THREE.Object3D;
  material: THREE.Material;
  meshes: THREE.Mesh[];
};

/**
 * Consolidates only explicitly classified metal meshes that share the same
 * parent and exact material instance. Source CAD meshes remain recoverable:
 * they are hidden only after a merged replacement has been validated and added.
 *
 * This is draw-call consolidation, not CSG, welding, remeshing or a BREP union.
 * It does not move vertices, recompute normals, alter UVs, or touch gemstones.
 */
export function applyAurumFastVisualMerge(root: THREE.Object3D): AurumFastVisualMergeReport {
  const groups = new Map<string, MergeGroup>();
  let candidates = 0;
  const errors: string[] = [];

  root.updateMatrixWorld(true);
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible || !mesh.geometry || !mesh.material || Array.isArray(mesh.material)) return;
    if (mesh.userData?.aurumRhino?.categoria !== "metal") return;
    // Keep only ordinary, static BufferGeometry meshes with a complete triangle list.
    const position = mesh.geometry.getAttribute("position");
    if (!position || position.count < 3 || position.count % 3 !== 0 && !mesh.geometry.index) return;
    const drawRange = mesh.geometry.drawRange;
    const elementCount = mesh.geometry.index?.count ?? position.count;
    if (drawRange.start !== 0 || (Number.isFinite(drawRange.count) && drawRange.count < elementCount)) return;
    candidates++;

    const key = `${mesh.parent?.uuid ?? "root"}::${mesh.material.uuid}`;
    const existing = groups.get(key);
    if (existing) existing.meshes.push(mesh);
    else if (mesh.parent) groups.set(key, { parent: mesh.parent, material: mesh.material, meshes: [mesh] });
  });

  let mergedGroups = 0;
  let mergedMeshes = 0;
  let preservedSources = 0;
  let skippedGroups = 0;

  for (const group of groups.values()) {
    if (group.meshes.length < 2) continue;
    const clones: THREE.BufferGeometry[] = [];
    let merged: THREE.BufferGeometry | null = null;
    try {
      group.parent.updateWorldMatrix(true, false);
      const inverseParent = group.parent.matrixWorld.clone().invert();
      for (const mesh of group.meshes) {
        if (mesh.parent !== group.parent || mesh.material !== group.material || !mesh.visible) {
          throw new Error("El grupo cambió durante la consolidación.");
        }
        const geometry = mesh.geometry.clone();
        const meshToParent = inverseParent.clone().multiply(mesh.matrixWorld);
        geometry.applyMatrix4(meshToParent);
        geometry.clearGroups();
        geometry.setDrawRange(0, Infinity);
        clones.push(geometry);
      }

      merged = mergeGeometries(clones, false);
      if (!merged) throw new Error("Las geometrías no comparten atributos compatibles.");
      const mergedPosition = merged.getAttribute("position");
      if (!mergedPosition || mergedPosition.count < 3) throw new Error("La geometría consolidada está vacía.");
      for (let i = 0; i < mergedPosition.count; i++) {
        if (![mergedPosition.getX(i), mergedPosition.getY(i), mergedPosition.getZ(i)].every(Number.isFinite)) {
          throw new Error("La geometría consolidada contiene coordenadas no finitas.");
        }
      }
      merged.computeBoundingBox();
      merged.computeBoundingSphere();
      if (!merged.boundingBox || merged.boundingBox.isEmpty() || !Number.isFinite(merged.boundingSphere?.radius ?? NaN)) {
        throw new Error("La geometría consolidada no tiene límites válidos.");
      }

      const replacement = new THREE.Mesh(merged, group.material);
      replacement.name = `AURUM · Fast Visual Merge (${group.meshes.length})`;
      replacement.castShadow = group.meshes.some((mesh) => mesh.castShadow);
      replacement.receiveShadow = group.meshes.some((mesh) => mesh.receiveShadow);
      replacement.frustumCulled = group.meshes.every((mesh) => mesh.frustumCulled);
      replacement.userData = {
        aurumRhino: { categoria: "metal", capa: "AURUM FAST VISUAL MERGE" },
        aurumFastVisualMerge: true,
        aurumFastVisualMergeSources: group.meshes.map((mesh) => ({
          uuid: mesh.uuid,
          name: mesh.name,
          layerKey: mesh.userData?.aurumRhino?.layerKey ?? null,
        })),
        aurumOriginalMeshesPreserved: true,
      };

      // Commit only after the merged mesh is attached successfully.
      group.parent.add(replacement);
      for (const mesh of group.meshes) mesh.visible = false;
      mergedGroups++;
      mergedMeshes += group.meshes.length;
      preservedSources += group.meshes.length;
      merged = null; // Ownership transferred to replacement.
    } catch (error) {
      skippedGroups++;
      errors.push(error instanceof Error ? error.message : String(error));
      if (merged) merged.dispose();
    } finally {
      for (const geometry of clones) geometry.dispose();
    }
  }

  return Object.freeze({
    candidates,
    mergedGroups,
    mergedMeshes,
    preservedSources,
    skippedGroups,
    errors: Object.freeze(errors),
  });
}
