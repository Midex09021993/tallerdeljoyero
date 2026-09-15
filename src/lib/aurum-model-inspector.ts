/**
 * AURUM MODEL INSPECTOR v1.0
 * Diagnóstico técnico de modelos 3D antes de aplicar materiales y render.
 * No modifica la geometría: solo analiza la estructura recibida.
 */
export type AurumModelInspection = {
  meshes: number;
  groups: number;
  vertices: number;
  triangles: number;
  materials: number;
  meshesWithoutNormals: number;
  dimensions: [number, number, number];
  warnings: string[];
};

export const inspectAurumModel = (root: any): AurumModelInspection => {
  let meshes = 0;
  let groups = 0;
  let vertices = 0;
  let triangles = 0;
  let meshesWithoutNormals = 0;
  const materialIds = new Set<string>();

  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  const includePoint = (x: number, y: number, z: number) => {
    if (![x, y, z].every(Number.isFinite)) return;
    min.x = Math.min(min.x, x); min.y = Math.min(min.y, y); min.z = Math.min(min.z, z);
    max.x = Math.max(max.x, x); max.y = Math.max(max.y, y); max.z = Math.max(max.z, z);
  };

  root?.updateMatrixWorld?.(true);
  root?.traverse?.((node: any) => {
    if (node === root) return;
    if (node.isMesh) {
      meshes++;
      const geometry = node.geometry;
      const position = geometry?.getAttribute?.("position");
      const normal = geometry?.getAttribute?.("normal");
      const vertexCount = Number(position?.count ?? 0);
      vertices += vertexCount;
      triangles += geometry?.index?.count ? geometry.index.count / 3 : vertexCount / 3;
      if (position && !normal) meshesWithoutNormals++;

      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material: any) => {
        if (material) materialIds.add(material.uuid || material.type || "material");
      });

      if (position?.getX) {
        const world = node.matrixWorld;
        const p = { x: 0, y: 0, z: 0 };
        const vector = { x: 0, y: 0, z: 0 };
        for (let i = 0; i < position.count; i++) {
          vector.x = position.getX(i); vector.y = position.getY(i); vector.z = position.getZ(i);
          if (world?.elements) {
            const e = world.elements;
            p.x = e[0] * vector.x + e[4] * vector.y + e[8] * vector.z + e[12];
            p.y = e[1] * vector.x + e[5] * vector.y + e[9] * vector.z + e[13];
            p.z = e[2] * vector.x + e[6] * vector.y + e[10] * vector.z + e[14];
          } else {
            p.x = vector.x; p.y = vector.y; p.z = vector.z;
          }
          includePoint(p.x, p.y, p.z);
        }
      }
    } else if (node.children?.length) {
      groups++;
    }
  });

  const dimensions: [number, number, number] = [
    Number.isFinite(min.x) ? Number((max.x - min.x).toFixed(3)) : 0,
    Number.isFinite(min.y) ? Number((max.y - min.y).toFixed(3)) : 0,
    Number.isFinite(min.z) ? Number((max.z - min.z).toFixed(3)) : 0,
  ];

  const warnings: string[] = [];
  if (!meshes) warnings.push("No se encontraron mallas renderizables.");
  if (meshesWithoutNormals) warnings.push(`${meshesWithoutNormals} malla(s) no tienen normales.`);
  if (triangles > 2000000) warnings.push("El modelo tiene una carga geométrica muy alta (> 2 M de triángulos).");
  if (meshes > 250) warnings.push("El modelo contiene muchas mallas; conviene revisar la estructura antes de configurar materiales.");
  if (dimensions.some(v => v === 0)) warnings.push("El modelo tiene al menos un eje con tamaño cero.");

  return {
    meshes,
    groups,
    vertices,
    triangles: Math.round(triangles),
    materials: materialIds.size,
    meshesWithoutNormals,
    dimensions,
    warnings,
  };
};
