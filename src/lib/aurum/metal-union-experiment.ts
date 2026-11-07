// @ts-nocheck -- AURUM Render engine: strict-mode typing pending; runtime behaviour unchanged.
import * as THREE from "three";
import { ADDITION, Brush, Evaluator } from "three-bvh-csg";

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
};

/**
 * Rhino 3DM import CSG pass (invoked during internal GLB conversion).
 * Builds an accumulated union per compatible layer: after A+B succeeds,
 * the next operation is (A+B)+C. Original Rhino meshes remain hidden,
 * not destroyed, so the operation can be rolled back.
 *
 * This is a visual mesh union, not a native Rhino/NURBS BREP Boolean.
 */
export function applyAurumMetalUnionExperiment(root: THREE.Object3D, maxMerges = 8): AurumUnionExperimentResult {
  const result: AurumUnionExperimentResult = {
    attempted: 0, merged: 0, skipped: 0, errors: [], preservedSourceMeshes: 0,
  };
  const evaluator = new Evaluator();
  const candidates: THREE.Mesh[] = [];
  const preserved = new Set<string>();
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh && mesh.visible && mesh.geometry && getFamily(mesh) === "metal"
      && isAurumRhinoCsgSurface(mesh)
      && !Array.isArray(mesh.material) && mesh.material) candidates.push(mesh);
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
      if (!right.parent || accumulator.parent !== right.parent || !right.visible
        || accumulator.material !== right.material) continue;
      const rightMeta = (right.userData?.aurumRhino ?? {}) as Record<string, unknown>;
      const rightLayerKey = typeof rightMeta.layerKey === "string" ? rightMeta.layerKey : "";
      if (!rightLayerKey || rightLayerKey !== layerKey) continue;
      if (!accumulator.geometry || !right.geometry
        || !compatibleAttributes(accumulator.geometry, right.geometry)) {
        result.skipped++;
        continue;
      }

      root.updateMatrixWorld(true);
      const accumulatorBox = new THREE.Box3().setFromObject(accumulator);
      const rightBox = new THREE.Box3().setFromObject(right);
      if (!accumulatorBox.intersectsBox(rightBox)) continue;
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

        const geometry = evaluator.evaluate(a, b, ADDITION).geometry;
        geometry.setDrawRange(0, Infinity);
        geometry.clearGroups();
        geometry.computeBoundingSphere();
        const outputError = validateUnionOutput(geometry, expectedBounds);
        const position = geometry.getAttribute("position");
        const normal = geometry.getAttribute("normal");
        if (outputError || !normal || normal.count !== position.count
          || !Number.isFinite(geometry.boundingSphere?.radius ?? NaN)) {
          geometry.dispose();
          throw new Error(outputError || "CSG produjo normales o límites incompletos.");
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
