const sourceMaterialsByMesh = new WeakMap<object, any[]>();

/** Capture the imported material once, before AURUM applies its preview preset. */
export function captureAurumSourceMaterials(mesh: any): any[] {
  if (!mesh || typeof mesh !== "object") return [];
  const existing = sourceMaterialsByMesh.get(mesh);
  if (existing) return existing;
  const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material])
    .map((material: any) => material?.clone ? material.clone() : material);
  sourceMaterialsByMesh.set(mesh, materials);
  return materials;
}

/** Always start a material change from the original imported GLB/CAD material. */
export function getAurumSourceMaterials(mesh: any): any[] {
  return captureAurumSourceMaterials(mesh);
}
