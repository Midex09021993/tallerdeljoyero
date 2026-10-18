import type { Material, Mesh } from "three";
const sourceMaterialsByMesh = new WeakMap<object, Material[]>();
const sourceMaterialArrayShapeByMesh = new WeakMap<object, boolean>();

/** Capture the imported material once, before AURUM applies its preview preset. */
export function captureAurumSourceMaterials(mesh: Mesh): Material[] {
  if (!mesh || typeof mesh !== "object") return [];
  const existing = sourceMaterialsByMesh.get(mesh);
  if (existing) return existing;
  const wasArray = Array.isArray(mesh.material);
  const sourceMaterials: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const materials = sourceMaterials.map((material) => material.clone ? material.clone() : material);
  sourceMaterialsByMesh.set(mesh, materials);
  sourceMaterialArrayShapeByMesh.set(mesh, wasArray);
  return materials;
}

/** Always start a material change from the original imported GLB/CAD material. */
export function getAurumSourceMaterials(mesh: Mesh): Material[] {
  return captureAurumSourceMaterials(mesh);
}

/** Preserve whether the imported mesh used a material array, even after previews replace mesh.material. */
export function hadAurumSourceMaterialArray(mesh: Mesh): boolean {
  captureAurumSourceMaterials(mesh);
  return sourceMaterialArrayShapeByMesh.get(mesh) ?? false;
}
