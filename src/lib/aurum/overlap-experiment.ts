import * as THREE from "three";

/**
 * Safe, non-destructive first stage for the optional metal-overlap experiment.
 * Reports bounding-box candidates only. A candidate is NOT proof of a surface
 * intersection and this module deliberately never changes source geometry.
 */
export type AurumOverlapCandidate = {
  a: string;
  b: string;
  categoryA: "metal" | "gema" | "otro";
  categoryB: "metal" | "gema" | "otro";
  intersectionVolume: number;
};

function categoryOf(mesh: THREE.Mesh): "metal" | "gema" | "otro" {
  const data = (mesh.userData?.aurumRhino ?? {}) as Record<string, unknown>;
  const text = [
    mesh.name,
    data.capa,
    mesh.userData?.attributes?.layerName,
    ...(Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m: any) => m?.name),
  ].map((value) => String(value ?? "")).join(" ").toLowerCase();

  if (data.categoria === "gema" || /(gem|gema|piedra|diamond|diamante|sapphire|zafiro|ruby|rub[ií]|esmeralda|emerald|moissanite|moissanita)/.test(text)) return "gema";
  if (data.categoria === "metal" || /(metal|oro|gold|plata|silver|platino|platinum|steel|acero)/.test(text)) return "metal";
  return "otro";
}

/**
 * Finds spatial candidates for later triangle-level/CSG validation.
 * Never merges, disposes, or mutates any mesh or material.
 */
export function findAurumOverlapCandidates(
  root: THREE.Object3D,
  options: { metalOnly?: boolean; minIntersectionVolume?: number } = {},
): AurumOverlapCandidate[] {
  const meshes: Array<{ mesh: THREE.Mesh; box: THREE.Box3; category: "metal" | "gema" | "otro" }> = [];
  root.updateMatrixWorld(true);

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry || !mesh.visible) return;
    const position = mesh.geometry.getAttribute("position");
    if (!position || position.count < 3) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const box = new THREE.Box3().setFromObject(mesh);
    if (box.isEmpty()) return;
    const category = categoryOf(mesh);
    if (options.metalOnly && category !== "metal") return;
    meshes.push({ mesh, box, category });
  });

  const minVolume = Math.max(0, options.minIntersectionVolume ?? 1e-9);
  const candidates: AurumOverlapCandidate[] = [];
  for (let i = 0; i < meshes.length; i++) {
    const left = meshes[i]!;
    for (let j = i + 1; j < meshes.length; j++) {
      const right = meshes[j]!;
      if (!left.box.intersectsBox(right.box)) continue;
      const overlap = left.box.clone().intersect(right.box);
      const size = overlap.getSize(new THREE.Vector3());
      const volume = size.x * size.y * size.z;
      if (!Number.isFinite(volume) || volume <= minVolume) continue;
      candidates.push({
        a: left.mesh.name || left.mesh.uuid,
        b: right.mesh.name || right.mesh.uuid,
        categoryA: left.category,
        categoryB: right.category,
        intersectionVolume: volume,
      });
    }
  }
  return candidates.sort((a, b) => b.intersectionVolume - a.intersectionVolume);
}
