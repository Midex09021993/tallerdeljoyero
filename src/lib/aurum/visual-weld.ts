import * as THREE from "three";

export interface AurumVisualWeldOptions {
  /** Angle below which coincident corners share a smoothed normal. */
  creaseAngle?: number;
  /** Spatial tolerance used only to match coincident corners; positions are never moved. */
  tolerance?: number;
}

export interface AurumVisualWeldReport {
  readonly inputVertices: number;
  readonly outputVertices: number;
  readonly triangleCount: number;
  readonly matchedCornerCount: number;
  readonly smoothedCornerCount: number;
  readonly creaseAngleRadians: number;
  readonly tolerance: number;
}

/**
 * Rebuilds corner normals across coincident positions while preserving sharp
 * edges, UVs, colors, and the actual triangle positions. This is a visual weld,
 * not a topological/volumetric weld and never bridges geometric gaps.
 */
export function applyAurumVisualWeld(
  source: THREE.BufferGeometry,
  options: AurumVisualWeldOptions = {},
): { geometry: THREE.BufferGeometry; report: AurumVisualWeldReport } {
  const creaseAngle = options.creaseAngle ?? (38 * Math.PI) / 180;
  if (!Number.isFinite(creaseAngle) || creaseAngle <= 0 || creaseAngle >= Math.PI) {
    throw new Error("AURUM VISUAL WELD creaseAngle debe estar entre 0 y PI.");
  }

  const sourcePosition = source.getAttribute("position");
  if (!sourcePosition || sourcePosition.count < 3) {
    throw new Error("AURUM VISUAL WELD requiere un atributo position válido.");
  }

  const working = source.index ? source.toNonIndexed() : source.clone();
  const position = working.getAttribute("position");
  if (!position || position.count % 3 !== 0) {
    working.dispose();
    throw new Error("AURUM VISUAL WELD requiere geometría triangular no indexada.");
  }

  working.computeBoundingBox();
  const diagonal = working.boundingBox?.getSize(new THREE.Vector3()).length() ?? 0;
  const tolerance = options.tolerance ?? Math.max(diagonal * 1e-6, 1e-9);
  if (!Number.isFinite(tolerance) || tolerance <= 0) {
    working.dispose();
    throw new Error("AURUM VISUAL WELD tolerance debe ser positiva y finita.");
  }

  type Corner = {
    index: number;
    face: number;
    x: number;
    y: number;
    z: number;
    nx: number;
    ny: number;
    nz: number;
    weight: number;
  };

  const corners: Corner[] = [];
  const buckets = new Map<string, Corner[]>();
  const cell = (value: number) => Math.floor(value / tolerance);
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const faceA = new THREE.Vector3();
  const faceNormal = new THREE.Vector3();
  const edgeA = new THREE.Vector3();
  const edgeB = new THREE.Vector3();
  const authoredNormal = working.getAttribute("normal");

  for (let i = 0; i < position.count; i += 3) {
    faceA.set(position.getX(i), position.getY(i), position.getZ(i));
    edgeA.set(position.getX(i + 1), position.getY(i + 1), position.getZ(i + 1)).sub(faceA);
    edgeB.set(position.getX(i + 2), position.getY(i + 2), position.getZ(i + 2)).sub(faceA);
    faceNormal.crossVectors(edgeA, edgeB);
    const areaWeight = faceNormal.length();
    const isDegenerate = !Number.isFinite(areaWeight) || areaWeight <= 1e-14;
    if (!isDegenerate) faceNormal.multiplyScalar(1 / areaWeight);

    for (let cornerIndex = 0; cornerIndex < 3; cornerIndex++) {
      const index = i + cornerIndex;
      const x = position.getX(index);
      const y = position.getY(index);
      const z = position.getZ(index);
      if (![x, y, z].every(Number.isFinite)) {
        working.dispose();
        throw new Error("AURUM VISUAL WELD encontró coordenadas no finitas.");
      }
      let nx = faceNormal.x, ny = faceNormal.y, nz = faceNormal.z;
      if (isDegenerate) {
        if (!authoredNormal || authoredNormal.count !== position.count) {
          working.dispose();
          throw new Error("AURUM VISUAL WELD encontró un triángulo degenerado sin normales de respaldo.");
        }
        nx = authoredNormal.getX(index);
        ny = authoredNormal.getY(index);
        nz = authoredNormal.getZ(index);
        const normalLength = Math.hypot(nx, ny, nz);
        if (!Number.isFinite(normalLength) || normalLength <= 1e-14) {
          working.dispose();
          throw new Error("AURUM VISUAL WELD encontró una normal de respaldo inválida.");
        }
        nx /= normalLength; ny /= normalLength; nz /= normalLength;
      }
      const corner: Corner = {
        index, face: i / 3, x, y, z,
        nx, ny, nz,
        weight: isDegenerate ? 1 : areaWeight,
      };
      corners.push(corner);
      const bucketKey = key(cell(x), cell(y), cell(z));
      const bucket = buckets.get(bucketKey);
      if (bucket) bucket.push(corner);
      else buckets.set(bucketKey, [corner]);
    }
  }

  const normals = new Float32Array(position.count * 3);
  const creaseCos = Math.cos(creaseAngle);
  let matchedCornerCount = 0;
  let smoothedCornerCount = 0;
  // Reuse one typed marker array instead of allocating a Set for every corner.
  // A unique stamp per corner preserves the original "one contribution per face"
  // rule while reducing short-lived allocations on large jewelry meshes.
  const visitedFaceStamp = new Uint32Array(position.count / 3);

  for (const corner of corners) {
    const cx = cell(corner.x), cy = cell(corner.y), cz = cell(corner.z);
    const stamp = corner.index + 1;
    let nx = 0, ny = 0, nz = 0;
    let matches = 0;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const nearby = buckets.get(key(cx + dx, cy + dy, cz + dz));
          if (!nearby) continue;
          for (const candidate of nearby) {
            if (visitedFaceStamp[candidate.face] === stamp) continue;
            const px = candidate.x - corner.x;
            const py = candidate.y - corner.y;
            const pz = candidate.z - corner.z;
            if (px * px + py * py + pz * pz > tolerance * tolerance) continue;
            const dot = corner.nx * candidate.nx + corner.ny * candidate.ny + corner.nz * candidate.nz;
            if (dot < creaseCos) continue;
            visitedFaceStamp[candidate.face] = stamp;
            nx += candidate.nx * candidate.weight;
            ny += candidate.ny * candidate.weight;
            nz += candidate.nz * candidate.weight;
            matches++;
          }
        }
      }
    }

    const length = Math.hypot(nx, ny, nz);
    if (!Number.isFinite(length) || length <= 1e-14) {
      nx = corner.nx; ny = corner.ny; nz = corner.nz;
    } else {
      nx /= length; ny /= length; nz /= length;
    }
    normals[corner.index * 3] = nx;
    normals[corner.index * 3 + 1] = ny;
    normals[corner.index * 3 + 2] = nz;
    if (matches > 1) {
      matchedCornerCount++;
      smoothedCornerCount++;
    }
  }

  working.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  working.computeBoundingBox();
  working.computeBoundingSphere();
  working.userData = {
    ...(working.userData ?? {}),
    aurumVisualWeld: {
      version: "1.0.0",
      method: "coincident-corner-crease-aware-normals",
      topologyChanged: false,
      positionsMoved: false,
      creaseAngleRadians: creaseAngle,
      tolerance,
    },
  };

  return {
    geometry: working,
    report: Object.freeze({
      inputVertices: sourcePosition.count,
      outputVertices: position.count,
      triangleCount: position.count / 3,
      matchedCornerCount,
      smoothedCornerCount,
      creaseAngleRadians: creaseAngle,
      tolerance,
    }),
  };
}
