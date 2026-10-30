import * as THREE from "three";
import { ADDITION, INTERSECTION, Brush, Evaluator } from "three-bvh-csg";

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

export function getAurumRhinoGeometryType(mesh: THREE.Object3D): string {
  return String(
    mesh.userData?.aurumRhinoGeometryType
      ?? mesh.userData?.aurumRhinoSource?.objectType
      ?? "",
  ).trim();
}

export function isAurumRhinoCsgSurface(mesh: THREE.Object3D): boolean {
  const sourceType = getAurumRhinoGeometryType(mesh).toLowerCase();
  // Only Rhino surface-like source objects enter CSG. Rhino Mesh objects,
  // SubD, and unknown types retain their imported geometry unchanged.
  return sourceType === "surface" || sourceType === "brep" || sourceType === "extrusion";
}

function isRhinoSurfaceMesh(mesh: THREE.Mesh): boolean {
  return isAurumRhinoCsgSurface(mesh);
}

function isClosedManifoldGeometry(geometry: THREE.BufferGeometry): boolean {
  const position = geometry.getAttribute("position");
  if (!position || position.count < 4) return false;
  const index = geometry.getIndex();
  const count = index ? index.count : position.count;
  if (count < 12 || count % 3 !== 0) return false;
  geometry.computeBoundingBox();
  const diagonal = geometry.boundingBox?.getSize(new THREE.Vector3()).length() ?? 0;
  const tolerance = Math.max(diagonal * 1e-7, 1e-9);
  const keyFor = (i: number) => [Math.round(position.getX(i)/tolerance), Math.round(position.getY(i)/tolerance), Math.round(position.getZ(i)/tolerance)].join(",");
  const edges = new Map<string, number>();
  const add = (a: number, b: number) => {
    const ka = keyFor(a), kb = keyFor(b);
    if (ka === kb) return false;
    const key = ka < kb ? ka + "|" + kb : kb + "|" + ka;
    edges.set(key, (edges.get(key) ?? 0) + 1);
    return true;
  };
  for (let i = 0; i < count; i += 3) {
    const a = index ? index.getX(i) : i;
    const b = index ? index.getX(i + 1) : i + 1;
    const d = index ? index.getX(i + 2) : i + 2;
    if (!add(a,b) || !add(b,d) || !add(d,a)) return false;
  }
  return edges.size > 0 && [...edges.values()].every((n) => n === 2);
}

function getClosedGeometryVolume(geometry: THREE.BufferGeometry): number {
  const position = geometry.getAttribute("position");
  if (!position) return 0;
  const index = geometry.getIndex();
  const count = index ? index.count : position.count;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let sixVolume = 0;
  for (let i = 0; i + 2 < count; i += 3) {
    a.fromBufferAttribute(position, index ? index.getX(i) : i);
    b.fromBufferAttribute(position, index ? index.getX(i + 1) : i + 1);
    c.fromBufferAttribute(position, index ? index.getX(i + 2) : i + 2);
    sixVolume += a.dot(b.cross(c));
  }
  return Math.abs(sixVolume / 6);
}

function hasVolumetricPenetration(evaluator: Evaluator, left: THREE.Mesh, right: THREE.Mesh, leftGeometry: THREE.BufferGeometry, rightGeometry: THREE.BufferGeometry): boolean {
  const a = new Brush(leftGeometry, left.material);
  const b = new Brush(rightGeometry, right.material);
  a.position.set(0,0,0); a.rotation.set(0,0,0); a.scale.set(1,1,1); a.updateMatrixWorld(true);
  b.position.set(0,0,0); b.rotation.set(0,0,0); b.scale.set(1,1,1); b.updateMatrixWorld(true);
  const intersection = evaluator.evaluate(a, b, INTERSECTION).geometry;
  try {
    const volume = getClosedGeometryVolume(intersection);
    const leftSize = leftGeometry.boundingBox?.getSize(new THREE.Vector3()).length() ?? 0;
    const rightSize = rightGeometry.boundingBox?.getSize(new THREE.Vector3()).length() ?? 0;
    const scale = Math.max(leftSize, rightSize, 1e-6);
    return Number.isFinite(volume) && volume > scale * scale * scale * 1e-10;
  } finally { intersection.dispose(); }
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

export type AurumUnionExperimentResult = {
  attempted: number;
  tested: number;
  merged: number;
  skipped: number;
  openOrNonManifold: number;
  nonIntersecting: number;
  errors: string[];
  preservedSourceMeshes: number;
};

/**
 * Opt-in GLB boolean union. Builds an accumulated union per connected group:
 * after A+B succeeds, the next operation is (A+B)+C, never A+C in parallel.
 * Original Rhino meshes are kept in the scene hidden for reversibility.
 */
export async function applyAurumMetalUnionExperiment(
  root: THREE.Object3D,
  onProgress?: (message: string, completed: number, total: number) => void,
): Promise<AurumUnionExperimentResult> {
  const result: AurumUnionExperimentResult = {
    attempted: 0, tested: 0, merged: 0, skipped: 0, openOrNonManifold: 0, nonIntersecting: 0, errors: [], preservedSourceMeshes: 0,
  };
  const evaluator = new Evaluator();
  const candidates: THREE.Mesh[] = [];
  const preserved = new Set<string>();
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh && mesh.visible && mesh.geometry && getFamily(mesh) === "metal"
      && isRhinoSurfaceMesh(mesh)
      && !Array.isArray(mesh.material) && mesh.material) candidates.push(mesh);
  });

  let lastYield = performance.now();
  for (let i = 0; i < candidates.length && result.merged < candidates.length - 1; i++) {
    const seed = candidates[i]!;
    if (!seed.parent || !seed.visible) continue;
    const seedMeta = (seed.userData?.aurumRhino ?? {}) as Record<string, unknown>;
    const layerKey = typeof seedMeta.layerKey === "string" ? seedMeta.layerKey : "";
    if (!layerKey) continue;

    let accumulator: THREE.Mesh = seed;
    let sources: UnionSource[] = [{
      uuid: seed.uuid, name: seed.name, layerKey,
    }];

    for (let j = i + 1; j < candidates.length && result.merged < candidates.length - 1; j++) {
      const right = candidates[j]!;
      if (!right.parent || accumulator.parent !== right.parent || !right.visible
        || accumulator.material !== right.material) continue;
      const rightMeta = (right.userData?.aurumRhino ?? {}) as Record<string, unknown>;
      const rightLayerKey = typeof rightMeta.layerKey === "string" ? rightMeta.layerKey : "";
      if (!rightLayerKey || rightLayerKey !== layerKey) continue;
      if (!accumulator.geometry || !right.geometry || !compatibleAttributes(accumulator.geometry, right.geometry)) {
        result.skipped++;
        continue;
      }
      root.updateMatrixWorld(true);
      const accumulatorBox = new THREE.Box3().setFromObject(accumulator);
      const rightBox = new THREE.Box3().setFromObject(right);
      // Bounding boxes are broad-phase only; they never authorize a union.
      if (!accumulatorBox.intersectsBox(rightBox)) continue;

      let leftGeometry: THREE.BufferGeometry | null = null;
      let rightGeometry: THREE.BufferGeometry | null = null;
      try {
        leftGeometry = accumulator.geometry.clone();
        rightGeometry = right.geometry.clone();
        leftGeometry.applyMatrix4(accumulator.matrix);
        rightGeometry.applyMatrix4(right.matrix);
        leftGeometry.clearGroups(); rightGeometry.clearGroups();
        leftGeometry.setDrawRange(0, Infinity); rightGeometry.setDrawRange(0, Infinity);
        leftGeometry.computeBoundingBox(); rightGeometry.computeBoundingBox();

        // Open sheets and non-manifold Breps are preserved; CSG needs closed solids.
        if (!isClosedManifoldGeometry(leftGeometry) || !isClosedManifoldGeometry(rightGeometry)) {
          result.openOrNonManifold++; result.skipped++; continue;
        }
        result.tested++;
        onProgress?.(`Comprobando penetración metálica (${result.tested} pruebas)`, result.tested, candidates.length);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        lastYield = performance.now();

        // Positive intersection volume means the solids penetrate. Mere face/edge contact is rejected.
        if (!hasVolumetricPenetration(evaluator, accumulator, right, leftGeometry, rightGeometry)) {
          result.nonIntersecting++; continue;
        }
        result.attempted++;
        onProgress?.(`Uniendo cuerpos metálicos (${result.attempted} operaciones)`, result.attempted, candidates.length);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        lastYield = performance.now();

        const a = new Brush(leftGeometry, accumulator.material);
        const b = new Brush(rightGeometry, right.material);
        a.position.set(0,0,0); a.rotation.set(0,0,0); a.scale.set(1,1,1); a.updateMatrixWorld(true);
        b.position.set(0,0,0); b.rotation.set(0,0,0); b.scale.set(1,1,1); b.updateMatrixWorld(true);
        const geometry = evaluator.evaluate(a, b, ADDITION).geometry;
        geometry.setDrawRange(0, Infinity);
        geometry.clearGroups();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        const position = geometry.getAttribute("position");
        const normal = geometry.getAttribute("normal");
        if (!position || position.count < 3 || !normal || normal.count !== position.count
          || !geometry.boundingBox || geometry.boundingBox.isEmpty()
          || !Number.isFinite(geometry.boundingSphere?.radius ?? NaN)) {
          geometry.dispose();
          throw new Error("CSG produjo una geometría incompleta o no válida.");
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
        onProgress?.(`Uniones metálicas: ${result.merged} completadas`, result.merged, candidates.length);
      } catch (error) {
        result.errors.push(`${accumulator.name || accumulator.uuid} + ${right.name || right.uuid}: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        leftGeometry?.dispose();
        rightGeometry?.dispose();
      }
      if (performance.now() - lastYield >= 80) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        lastYield = performance.now();
      }
    }
  }

  result.preservedSourceMeshes = preserved.size;
  root.updateMatrixWorld(true);
  return result;
}
