const sourceMaterialsByMesh = new WeakMap<object, any[]>();
const sourceMaterialArrayShapeByMesh = new WeakMap<object, boolean>();

/** Capture the imported material once, before AURUM applies its preview preset. */
export function captureAurumSourceMaterials(mesh: any): any[] {
  if (!mesh || typeof mesh !== "object") return [];
  const existing = sourceMaterialsByMesh.get(mesh);
  if (existing) return existing;
  const wasArray = Array.isArray(mesh.material);
  const materials = (wasArray ? mesh.material : [mesh.material])
    .map((material: any) => material?.clone ? material.clone() : material);
  sourceMaterialsByMesh.set(mesh, materials);
  sourceMaterialArrayShapeByMesh.set(mesh, wasArray);
  return materials;
}

/** Always start a material change from the original imported GLB/CAD material. */
export function getAurumSourceMaterials(mesh: any): any[] {
  return captureAurumSourceMaterials(mesh);
}

/** Preserve whether the imported mesh used a material array, even after previews replace mesh.material. */
export function hadAurumSourceMaterialArray(mesh: any): boolean {
  captureAurumSourceMaterials(mesh);
  return sourceMaterialArrayShapeByMesh.get(mesh) ?? false;
}
