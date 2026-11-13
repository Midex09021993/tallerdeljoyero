import * as THREE from "three";

export interface AurumGlbQualitySnapshot {
  readonly meshCount: number;
  readonly triangleCount: number;
  readonly invalidPositionMeshes: number;
  readonly meshesWithoutMaterial: number;
  readonly gemMeshCount: number;
  readonly gemSourceCount: number;
  readonly gemSourceKeys: readonly string[];
  /** Visible CSG union meshes carrying source provenance. */
  readonly metalUnionMeshCount: number;
  /** Number of original metal bodies represented by those union meshes. */
  readonly metalUnionSourceCount: number;
  readonly metalUnionSourceKeys: readonly string[];
  readonly bounds: readonly [number, number, number, number, number, number] | null;
  readonly namedMaterials: readonly string[];
}

export interface AurumGlbQualityIssue {
  readonly code: string;
  readonly severity: "error" | "warning";
  readonly message: string;
}

export interface AurumGlbQualityReport {
  readonly version: "2.1.0";
  readonly status: "passed" | "warning" | "failed";
  readonly source: AurumGlbQualitySnapshot;
  readonly reopened: AurumGlbQualitySnapshot;
  readonly triangleRetention: number;
  readonly boundsRelativeDelta: number | null;
  readonly missingNamedMaterials: readonly string[];
  readonly metalUnionSourceCount: number;
  readonly issues: readonly AurumGlbQualityIssue[];
}

export interface AurumGlbQualityOptions {
  readonly minimumTriangleRetention?: number;
  readonly maximumBoundsRelativeDelta?: number;
}

function isVisibleInTree(node: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

function isGemMesh(mesh: THREE.Mesh): boolean {
  const metadata = (mesh.userData?.["aurumRhino"] ?? {}) as Record<string, unknown>;
  const source = (mesh.userData?.["aurumRhinoSource"] ?? {}) as Record<string, unknown>;
  const materialNames = (Array.isArray(mesh.material) ? mesh.material : [mesh.material])
    .map((material) => material?.name ?? "")
    .join(" ");
  const identity = [
    mesh.name,
    metadata["categoria"],
    metadata["capa"],
    source["layerName"],
    materialNames,
  ].join(" ").toLowerCase();
  return metadata["categoria"] === "gema"
    || /(gem|gema|piedra|diamond|diamante|zafiro|sapphire|rubi|rubí|ruby|esmeralda|emerald|moissanita|citrino|amatista|topacio)/.test(identity);
}

function materialIdentity(material: THREE.Material): string {
  return String(material.name ?? "").trim();
}

/** Captures visible GLB-relevant facts without changing the source scene. */
export function captureAurumGlbQualitySnapshot(root: THREE.Object3D): AurumGlbQualitySnapshot {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().makeEmpty();
  const namedMaterials = new Set<string>();
  let meshCount = 0;
  let triangleCount = 0;
  let invalidPositionMeshes = 0;
  let meshesWithoutMaterial = 0;
  let gemMeshCount = 0;
  const gemSourceKeys = new Set<string>();
  let metalUnionMeshCount = 0;
  let metalUnionSourceCount = 0;
  const metalUnionSourceKeys = new Set<string>();

  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !isVisibleInTree(mesh)) return;
    meshCount += 1;
    if (isGemMesh(mesh)) gemMeshCount += 1;
    const gemSource = mesh.userData?.["aurumGlbGemSource"] as Record<string, unknown> | undefined;
    const gemSourceKey = String(gemSource?.["sourceKey"] ?? "").trim();
    if (gemSourceKey) gemSourceKeys.add(gemSourceKey);
    const unionSources = Array.isArray(mesh.userData?.["aurumUnionSource"]) ? (mesh.userData["aurumUnionSource"] as unknown[]) : null;
    if (mesh.userData?.["aurumMetalUnionExperiment"] === true && unionSources?.length) {
      metalUnionMeshCount += 1;
      metalUnionSourceCount += unionSources.length;
      for (const source of unionSources) {
        const record = source as Record<string, unknown>;
        const key = String(record["uuid"] ?? record["objectId"] ?? record["name"] ?? "").trim();
        if (key) metalUnionSourceKeys.add(key);
      }
    }
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    if (!materials.length) meshesWithoutMaterial += 1;
    for (const material of materials) {
      if (!material) continue;
      const identity = materialIdentity(material);
      if (identity) namedMaterials.add(identity);
    }

    const position = mesh.geometry?.getAttribute("position");
    if (!position || position.count < 3) {
      invalidPositionMeshes += 1;
      return;
    }
    const index = mesh.geometry.getIndex();
    triangleCount += Math.floor((index?.count ?? position.count) / 3);
    let finite = true;
    for (let i = 0; i < position.count; i += 1) {
      if (!Number.isFinite(position.getX(i)) || !Number.isFinite(position.getY(i)) || !Number.isFinite(position.getZ(i))) {
        finite = false;
        break;
      }
    }
    if (!finite) {
      invalidPositionMeshes += 1;
      return;
    }
    const geometryBounds = new THREE.Box3().setFromBufferAttribute(position as THREE.BufferAttribute);
    geometryBounds.applyMatrix4(mesh.matrixWorld);
    if (!geometryBounds.isEmpty()) bounds.union(geometryBounds);
  });

  const boundsTuple = bounds.isEmpty()
    ? null
    : Object.freeze([
      bounds.min.x, bounds.min.y, bounds.min.z,
      bounds.max.x, bounds.max.y, bounds.max.z,
    ] as const);

  return Object.freeze({
    meshCount,
    triangleCount,
    invalidPositionMeshes,
    meshesWithoutMaterial,
    gemMeshCount,
    gemSourceCount: gemSourceKeys.size,
    gemSourceKeys: Object.freeze([...gemSourceKeys].sort()),
    metalUnionMeshCount,
    metalUnionSourceCount,
    metalUnionSourceKeys: Object.freeze([...metalUnionSourceKeys].sort()),
    bounds: boundsTuple,
    namedMaterials: Object.freeze([...namedMaterials].sort()),
  });
}

function relativeBoundsDelta(
  source: AurumGlbQualitySnapshot["bounds"],
  reopened: AurumGlbQualitySnapshot["bounds"],
): number | null {
  if (!source || !reopened) return source === reopened ? 0 : Number.POSITIVE_INFINITY;
  const sourceSize = [
    source[3] - source[0], source[4] - source[1], source[5] - source[2],
  ];
  const sourceDiagonal = Math.max(Math.hypot(...sourceSize), 1e-9);
  const coordinateDelta = Math.max(...source.map((value, index) => Math.abs(value - reopened[index]!)));
  return coordinateDelta / sourceDiagonal;
}

/**
 * Compares the original export scene with the GLB after a real GLTFLoader
 * round-trip. This is a quality gate, not an automatic repair or CSG operation.
 */
export function evaluateAurumGlbQuality(
  source: AurumGlbQualitySnapshot,
  reopened: AurumGlbQualitySnapshot,
  options: AurumGlbQualityOptions = {},
): AurumGlbQualityReport {
  const minimumTriangleRetention = options.minimumTriangleRetention ?? 0.98;
  const maximumBoundsRelativeDelta = options.maximumBoundsRelativeDelta ?? 0.005;
  if (!Number.isFinite(minimumTriangleRetention) || minimumTriangleRetention <= 0 || minimumTriangleRetention > 1) {
    throw new Error("AURUM GLB quality gate minimumTriangleRetention must be in (0, 1].");
  }
  if (!Number.isFinite(maximumBoundsRelativeDelta) || maximumBoundsRelativeDelta < 0) {
    throw new Error("AURUM GLB quality gate maximumBoundsRelativeDelta must be non-negative and finite.");
  }

  const issues: AurumGlbQualityIssue[] = [];
  const add = (code: string, severity: "error" | "warning", message: string) => {
    issues.push(Object.freeze({ code, severity, message }));
  };
  if (source.meshCount > 0 && reopened.meshCount === 0) {
    add("NO_MESHES_AFTER_ROUNDTRIP", "error", "El GLB reabierto no contiene mallas visibles.");
  }
  if (reopened.invalidPositionMeshes > 0) {
    add("INVALID_OUTPUT_GEOMETRY", "error", "El GLB reabierto contiene geometría vacía o posiciones no finitas.");
  }
  if (reopened.meshesWithoutMaterial > 0) {
    add("MISSING_OUTPUT_MATERIAL", "error", "Una o más mallas del GLB reabierto no tienen material asignado.");
  }

  const triangleRetention = source.triangleCount === 0
    ? (reopened.triangleCount === 0 ? 1 : 0)
    : reopened.triangleCount / source.triangleCount;
  if (source.triangleCount > 0 && triangleRetention < minimumTriangleRetention) {
    add("TRIANGLE_LOSS", "error", `El GLB conserva ${(triangleRetention * 100).toFixed(2)}% de los triángulos; el mínimo configurado es ${(minimumTriangleRetention * 100).toFixed(2)}%.`);
  }

  const boundsDelta = relativeBoundsDelta(source.bounds, reopened.bounds);
  if (boundsDelta === null || !Number.isFinite(boundsDelta) || boundsDelta > maximumBoundsRelativeDelta) {
    add("BOUNDS_CHANGED", "error", "Los límites espaciales del GLB difieren del modelo previo a la exportación.");
  }
  if (source.gemMeshCount > 0 && reopened.gemMeshCount < source.gemMeshCount) {
    add("GEM_MESH_LOSS", "error", `Se detectaron ${source.gemMeshCount} mallas de gema antes de exportar y ${reopened.gemMeshCount} después de reabrir el GLB.`);
  }

  const sourceGemKeys = [...source.gemSourceKeys].sort();
  const reopenedGemKeys = [...reopened.gemSourceKeys].sort();
  const missingGemSourceKeys = sourceGemKeys.filter((key) => !reopenedGemKeys.includes(key));
  const unexpectedGemSourceKeys = reopenedGemKeys.filter((key) => !sourceGemKeys.includes(key));
  if (sourceGemKeys.length > 0 && (missingGemSourceKeys.length > 0 || unexpectedGemSourceKeys.length > 0)) {
    add("GEM_SOURCE_PROVENANCE_LOSS", "error",
      `La trazabilidad de gemas cambió al reabrir el GLB: ${missingGemSourceKeys.length} identidades faltantes y ${unexpectedGemSourceKeys.length} inesperadas.`);
  }

  const sourceUnionKeys = [...source.metalUnionSourceKeys].sort();
  const reopenedUnionKeys = [...reopened.metalUnionSourceKeys].sort();
  const unionProvenancePreserved = source.metalUnionMeshCount === reopened.metalUnionMeshCount
    && source.metalUnionSourceCount === reopened.metalUnionSourceCount
    && sourceUnionKeys.length === reopenedUnionKeys.length
    && sourceUnionKeys.every((key, index) => key === reopenedUnionKeys[index]);
  if (source.metalUnionMeshCount > 0 && !unionProvenancePreserved) {
    add("METAL_UNION_PROVENANCE_LOSS", "error", "El GLB no conservó la trazabilidad de los cuerpos metálicos que formaron las uniones visuales.");
  }

  const reopenedMaterials = new Set(reopened.namedMaterials);
  const missingNamedMaterials = source.namedMaterials.filter((name) => !reopenedMaterials.has(name));
  if (missingNamedMaterials.length > 0) {
    add("NAMED_MATERIALS_MISSING", "warning", `No se recuperaron los nombres de estos materiales: ${missingNamedMaterials.join(", ")}.`);
  }
  // The source snapshot is intentionally captured AFTER Metal Union. Therefore
  // its reduced visible mesh count already includes every accepted fusion.
  // Any additional reduction during GLB serialization is still unexpected loss.
  if (source.meshCount > 0 && reopened.meshCount < source.meshCount) {
    add("MESH_COUNT_REDUCED", "error", "El GLB reabierto contiene menos mallas que la escena posterior a Metal Union; se bloquea para evitar pérdida adicional de cuerpos.");
  }

  const hasErrors = issues.some((issue) => issue.severity === "error");
  return Object.freeze({
    version: "2.0.0",
    status: hasErrors ? "failed" : issues.length ? "warning" : "passed",
    source,
    reopened,
    triangleRetention,
    boundsRelativeDelta: boundsDelta,
    missingNamedMaterials: Object.freeze(missingNamedMaterials),
    metalUnionSourceCount: reopened.metalUnionSourceCount,
    issues: Object.freeze(issues),
  });
}
