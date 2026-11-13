// @ts-nocheck -- AURUM Render engine: strict-mode typing pending; runtime behaviour unchanged.
import * as THREE from "three";
import { ADDITION, Brush, Evaluator } from "three-bvh-csg";
import { applyAurumVisualWeld } from "./visual-weld";

type MeshFamily = "metal" | "gema" | "otro";

function getFamily(mesh: THREE.Mesh): MeshFamily {
  const data = (mesh.userData?.aurumRhino ?? {}) as Record<string, unknown>;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const text = [
    mesh.name, data.capa, mesh.userData?.attributes?.layerName,
    ...materials.map((material) => (material as THREE.Material | undefined)?.name),
  ].map((value) => String(value ?? "")).join(" ").toLowerCase();
  if (data.categoria === "gema" || /(gem|gema|piedra|diamond|diamante|sapphire|zafiro|ruby|rub[ií]|esmeralda|emerald|moissanite|moissanita)/.test(text)) return "gema";
  if (data.categoria === "metal" || /(metal|oro|gold|plata|silver|platino|platinum|steel|acero)/.test(text)) return "metal";
  return "otro";
}


const materialFingerprintCache = new WeakMap<THREE.Material, string>();

function areEquivalentMaterials(a: THREE.Material, b: THREE.Material): boolean {
  if (a === b) return true;
  const fingerprint = (material: THREE.Material): string => {
    const cached = materialFingerprintCache.get(material);
    if (cached) return cached;
    const serialized = material.toJSON() as Record<string, unknown>;
    const normalized = { ...serialized };
    delete normalized.uuid;
    const value = JSON.stringify(normalized);
    materialFingerprintCache.set(material, value);
    return value;
  };
  try {
    return fingerprint(a) === fingerprint(b);
  } catch {
    return false;
  }
}

function compatibleAttributes(a: THREE.BufferGeometry, b: THREE.BufferGeometry): boolean {
  const aNames = Object.keys(a.attributes).sort();
  const bNames = Object.keys(b.attributes).sort();
  if (aNames.length !== bNames.length || aNames.some((name, i) => name !== bNames[i])) return false;
  return aNames.every((name) => {
    const aa = a.getAttribute(name);
    const bb = b.getAttribute(name);
    return aa.itemSize === bb.itemSize && aa.array.constructor === bb.array.constructor;
  });
}

type UnionSource = { uuid: string; name: string; layerKey: string };

/**
 * Reject malformed CSG output before it can replace any source mesh.
 * Bounds are only a sanity envelope here; they do not claim that two inputs
 * intersect or that the result is a watertight CAD solid.
 */
function validateUnionOutput(
  geometry: THREE.BufferGeometry,
  expectedBounds: THREE.Box3,
): string | null {
  const position = geometry.getAttribute("position");
  if (!position || position.count < 3) return "CSG no produjo vértices suficientes.";

  for (let i = 0; i < position.count; i++) {
    if (!Number.isFinite(position.getX(i)) || !Number.isFinite(position.getY(i)) || !Number.isFinite(position.getZ(i))) {
      return "CSG produjo coordenadas no finitas.";
    }
  }

  const index = geometry.getIndex();
  const elementCount = index ? index.count : position.count;
  if (elementCount < 3 || elementCount % 3 !== 0) return "CSG produjo una cantidad inválida de índices o vértices.";
  if (index) {
    for (let i = 0; i < index.count; i++) {
      const vertexIndex = index.getX(i);
      if (!Number.isInteger(vertexIndex) || vertexIndex < 0 || vertexIndex >= position.count) {
        return "CSG produjo un índice fuera del rango de vértices.";
      }
    }
  }

  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds || bounds.isEmpty()) return "CSG produjo límites vacíos.";
  const size = expectedBounds.getSize(new THREE.Vector3());
  const tolerance = Math.max(size.x, size.y, size.z, 1) * 1e-4;
  for (const axis of ["x", "y", "z"] as const) {
    if (bounds.min[axis] < expectedBounds.min[axis] - tolerance
      || bounds.max[axis] > expectedBounds.max[axis] + tolerance) {
      return "CSG produjo geometría fuera de los límites de las piezas originales.";
    }
  }

  return null;
}

export type AurumUnionExperimentResult = {
  attempted: number;
  merged: number;
  skipped: number;
  errors: string[];
  preservedSourceMeshes: number;
  audit: {
    visibleMetalMeshes: number;
    eligibleBrepSurfaceExtrusion: number;
    excludedGeometryType: Record<string, number>;
    excludedArrayMaterial: number;
    excludedMissingLayerKey: number;
    pairChecks: number;
    rejectedMissingParent: number;
    rejectedDifferentParent: number;
    rejectedInvisibleCandidate: number;
    rejectedMissingLayerKey: number;
    rejectedMaterialMismatch: number;
    rejectedLayerMismatch: number;
    rejectedAttributesMismatch: number;
    rejectedNoBoundsIntersection: number;
    csgFailures: number;
    visualWeldFailures: number;
    visualWeldedMeshes: number;\n    mergedAcrossLayers: number;
  };
};

/**
 * Rhino 3DM import CSG pass (invoked during internal GLB conversion).
 * Builds an accumulated union for metal bodies with equivalent serialized materials.
 * Different Rhino layers are allowed after both candidates pass metal-family checks.
 * After A+B succeeds, the next operation is (A+B)+C. Original Rhino meshes remain hidden,
 * not destroyed, so the operation can be rolled back.
 *
 * This is a visual mesh union, not a native Rhino/NURBS BREP Boolean.
 */
export function applyAurumMetalUnionExperiment(root: THREE.Object3D, maxMerges = 8): AurumUnionExperimentResult {
  const result: AurumUnionExperimentResult = {
    attempted: 0, merged: 0, skipped: 0, errors: [], preservedSourceMeshes: 0,
    audit: {
      visibleMetalMeshes: 0,
      eligibleBrepSurfaceExtrusion: 0,
      excludedGeometryType: {},
      excludedArrayMaterial: 0,
      excludedMissingLayerKey: 0,
      pairChecks: 0,
      rejectedMissingParent: 0,
      rejectedDifferentParent: 0,
      rejectedInvisibleCandidate: 0,
      rejectedMissingLayerKey: 0,
      rejectedMaterialMismatch: 0,
      rejectedLayerMismatch: 0,
      rejectedAttributesMismatch: 0,
      rejectedNoBoundsIntersection: 0,
      csgFailures: 0,
      visualWeldFailures: 0,
      visualWeldedMeshes: 0,\n      mergedAcrossLayers: 0,
    },
  };
  const evaluator = new Evaluator();
  const candidates: THREE.Mesh[] = [];
  const preserved = new Set<string>();
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible || !mesh.geometry || getFamily(mesh) !== "metal") return;
    result.audit.visibleMetalMeshes++;
    const geometryType = getAurumRhinoGeometryType(mesh) || "(unknown)";
    if (!isAurumRhinoCsgSurface(mesh)) {
      result.audit.excludedGeometryType[geometryType] = (result.audit.excludedGeometryType[geometryType] ?? 0) + 1;
      return;
    }
    if (Array.isArray(mesh.material) || !mesh.material) {
      result.audit.excludedArrayMaterial++;
      return;
    }
    result.audit.eligibleBrepSurfaceExtrusion++;
    const meta = (mesh.userData?.aurumRhino ?? {}) as Record<string, unknown>;
    if (typeof meta.layerKey !== "string" || !meta.layerKey) result.audit.excludedMissingLayerKey++;
    candidates.push(mesh);
  });

  for (let i = 0; i < candidates.length && result.merged < maxMerges; i++) {
    const seed = candidates[i]!;
    if (!seed.parent || !seed.visible) continue;
    const seedMeta = (seed.userData?.aurumRhino ?? {}) as Record<string, unknown>;
    const layerKey = typeof seedMeta.layerKey === "string" ? seedMeta.layerKey : "";
    if (!layerKey) continue;

    let accumulator: THREE.Mesh = seed;
    let sources: UnionSource[] = [{
      uuid: seed.uuid, name: seed.name, layerKey,
    }];

    for (let j = i + 1; j < candidates.length && result.merged < maxMerges; j++) {
      const right = candidates[j]!;
      result.audit.pairChecks++;
      if (!right.parent || !accumulator.parent) {
        result.audit.rejectedMissingParent++;
        continue;
      }
      if (accumulator.parent !== right.parent) {
        result.audit.rejectedDifferentParent++;
        continue;
      }
      if (!right.visible) {
        result.audit.rejectedInvisibleCandidate++;
        continue;
      }
      if (!areEquivalentMaterials(accumulator.material as THREE.Material, right.material as THREE.Material)) {
        result.audit.rejectedMaterialMismatch++;
        continue;
      }
      const rightMeta = (right.userData?.aurumRhino ?? {}) as Record<string, unknown>;
      const rightLayerKey = typeof rightMeta.layerKey === "string" ? rightMeta.layerKey : "";
      if (!rightLayerKey) {
        result.audit.rejectedMissingLayerKey++;
        continue;
      }
      // Layer names are organizational metadata, not a geometric/material boundary.
      // Both candidates already passed metal-family and equivalent-material checks.
      // Permit compatible metals across Rhino layers (e.g. brazo, bisel y cuerpo).\n      if (rightLayerKey !== layerKey) result.audit.mergedAcrossLayers++;
      if (!accumulator.geometry || !right.geometry
        || !compatibleAttributes(accumulator.geometry, right.geometry)) {
        result.skipped++;
        result.audit.rejectedAttributesMismatch++;
        continue;
      }

      root.updateMatrixWorld(true);
      const accumulatorBox = new THREE.Box3().setFromObject(accumulator);
      const rightBox = new THREE.Box3().setFromObject(right);
      if (!accumulatorBox.intersectsBox(rightBox)) {
        result.audit.rejectedNoBoundsIntersection++;
        continue;
      }
      result.attempted++;

      try {
        // Geometry is transformed into the common parent-local coordinate space.
        // Only clones enter CSG; the source geometries remain untouched.
        const leftGeometry = accumulator.geometry.clone();
        const rightGeometry = right.geometry.clone();
        leftGeometry.applyMatrix4(accumulator.matrix);
        rightGeometry.applyMatrix4(right.matrix);
        leftGeometry.clearGroups();
        rightGeometry.clearGroups();
        leftGeometry.setDrawRange(0, Infinity);
        rightGeometry.setDrawRange(0, Infinity);
        leftGeometry.computeBoundingBox();
        rightGeometry.computeBoundingBox();
        if (!leftGeometry.boundingBox || !rightGeometry.boundingBox
          || leftGeometry.boundingBox.isEmpty() || rightGeometry.boundingBox.isEmpty()) {
          throw new Error("Una pieza no tiene límites geométricos válidos.");
        }
        const expectedBounds = leftGeometry.boundingBox.clone().union(rightGeometry.boundingBox);

        const a = new Brush(leftGeometry, accumulator.material);
        const b = new Brush(rightGeometry, right.material);
        a.position.set(0, 0, 0); a.rotation.set(0, 0, 0); a.scale.set(1, 1, 1); a.updateMatrixWorld(true);
        b.position.set(0, 0, 0); b.rotation.set(0, 0, 0); b.scale.set(1, 1, 1); b.updateMatrixWorld(true);

        const csgGeometry = evaluator.evaluate(a, b, ADDITION).geometry;
        csgGeometry.setDrawRange(0, Infinity);
        csgGeometry.clearGroups();
        csgGeometry.computeBoundingSphere();
        const outputError = validateUnionOutput(csgGeometry, expectedBounds);
        if (outputError || !Number.isFinite(csgGeometry.boundingSphere?.radius ?? NaN)) {
          csgGeometry.dispose();
          throw new Error(outputError || "CSG produjo límites incompletos.");
        }

        // Rebuild crease-aware normals on CSG output only. Source meshes, gems,
        // shaders and optical calibration remain untouched.
        let geometry: THREE.BufferGeometry;
        try {
          const welded = applyAurumVisualWeld(csgGeometry, { creaseAngle: (38 * Math.PI) / 180 });
          geometry = welded.geometry;
          result.audit.visualWeldedMeshes++;
          csgGeometry.dispose();
          geometry.computeBoundingSphere();
        } catch (weldError) {
          result.audit.visualWeldFailures++;
          csgGeometry.dispose();
          throw new Error(`Visual Weld falló: ${weldError instanceof Error ? weldError.message : String(weldError)}`);
        }

        const nextSources = [...sources, {
          uuid: right.uuid, name: right.name, layerKey: rightLayerKey,
        }];
        const visualUnion = new THREE.Mesh(geometry, accumulator.material);
        visualUnion.name = `AURUM · Metal visual union ${result.merged + 1}`;
        visualUnion.position.set(0, 0, 0);
        visualUnion.quaternion.identity();
        visualUnion.scale.set(1, 1, 1);
        visualUnion.castShadow = accumulator.castShadow || right.castShadow;
        visualUnion.receiveShadow = accumulator.receiveShadow || right.receiveShadow;
        visualUnion.userData = {
          ...seed.userData,
          aurumRhino: {
            ...seedMeta,
            categoria: "metal",
            layerKey,
          },
          aurumRhinoSource: { ...(seed.userData?.aurumRhinoSource ?? {}) },
          aurumMetalUnionExperiment: true,
          aurumUnionSource: nextSources,
          aurumOriginalMeshesPreserved: true,
        };

        // Commit this step only after the replacement geometry is fully valid.
        const parent = accumulator.parent;
        parent.add(visualUnion);
        accumulator.visible = false;
        right.visible = false;
        if (accumulator === seed) {
          seed.userData = { ...seed.userData, aurumMetalUnionSourceHidden: true };
          preserved.add(seed.uuid);
        } else {
          // Intermediate CSG output is disposable; original Rhino source meshes
          // remain hidden and recoverable independently.
          accumulator.parent?.remove(accumulator);
          accumulator.geometry.dispose();
        }
        right.userData = { ...right.userData, aurumMetalUnionSourceHidden: true };
        preserved.add(right.uuid);
        accumulator = visualUnion;
        sources = nextSources;
        result.merged++;
      } catch (error) {
        result.audit.csgFailures++;
        result.errors.push(`${accumulator.name || accumulator.uuid} + ${right.name || right.uuid}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  result.preservedSourceMeshes = preserved.size;
  root.updateMatrixWorld(true);
  return result;
}

/** Rhino source geometry type (e.g. "Brep", "Extrusion", "Mesh") stored on the mesh, if any. */
export function getAurumRhinoGeometryType(object: THREE.Object3D): string {
  const ud = (object.userData ?? {}) as Record<string, any>;
  const rhino = (ud["aurumRhino"] ?? {}) as Record<string, any>;
  const attrs = (ud["attributes"] ?? {}) as Record<string, any>;
  const value = ud["aurumRhinoGeometryType"]
    ?? rhino["geometryType"]
    ?? rhino["objectType"]
    ?? ud["objectType"]
    ?? attrs["objectType"]
    ?? attrs["ObjectType"]
    ?? "";
  return String(value ?? "").trim();
}

/**
 * Only Rhino Breps, Surfaces and Extrusions may enter the metal CSG union.
 * Rhino Mesh objects are tessellated source geometry, not boolean operands:
 * keep them visible and untouched. Unknown source types are excluded safely.
 */
export function isAurumRhinoCsgSurface(object: THREE.Object3D): boolean {
  if (!(object as THREE.Mesh).isMesh) return false;
  const type = getAurumRhinoGeometryType(object).toLowerCase().replace(/[\s_-]/g, "");
  return type === "brep" || type === "surface" || type === "extrusion";
}
