import * as THREE from "three";

type VoxelResult = { enabled: boolean; metalMeshes: number; excludedGems: number; voxels: number; triangles: number; resolution: number; error?: string };

function family(mesh: THREE.Mesh): "metal" | "gem" | "other" {
  const data = (mesh.userData?.aurumRhino ?? {}) as Record<string, unknown>;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const text = [mesh.name, data.capa, mesh.userData?.attributes?.layerName, mesh.userData?.attributes?.LayerName,
    ...materials.map((m) => (m as THREE.Material | undefined)?.name)]
    .map((v) => String(v ?? "")).join(" ").toLowerCase();
  if (data.categoria === "gema" || /(gem|gema|piedra|diamond|diamante|sapphire|zafiro|ruby|rub[ií]|esmeralda|emerald|moissanite|moissanita|citrino|amatista|topacio)/.test(text)) return "gem";
  if (data.categoria === "metal" || /(metal|oro|gold|plata|silver|platino|platinum|steel|acero)/.test(text)) return "metal";
  return "other";
}

function key(x: number, y: number, z: number) { return x + "," + y + "," + z; }

/**
 * Experimental surface voxel remesh: rasterizes metal triangle surfaces into a
 * shared grid and emits only exposed voxel faces. This is deliberately not CSG.
 * Source meshes remain untouched and are hidden only after a complete mesh exists.
 */
export function applyAurumVoxelRemeshExperiment(root: THREE.Object3D, resolution = 88): VoxelResult {
  const result: VoxelResult = { enabled: false, metalMeshes: 0, excludedGems: 0, voxels: 0, triangles: 0, resolution };
  const meshes: THREE.Mesh[] = [];
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible || !mesh.geometry?.getAttribute("position")) return;
    const kind = family(mesh);
    if (kind === "gem") { result.excludedGems++; return; }
    if (kind === "metal" && !Array.isArray(mesh.material) && mesh.material) meshes.push(mesh);
  });
  if (meshes.length < 1) return { ...result, error: "No se identificaron mallas metálicas con material único." };

  const rootInverse = root.matrixWorld.clone().invert();
  const box = new THREE.Box3();
  const metalGeometries = meshes.map((mesh) => {
    const geometry = mesh.geometry;
    const pos = geometry.getAttribute("position");
    const index = geometry.getIndex();
    const worldToRoot = new THREE.Matrix4().multiplyMatrices(rootInverse, mesh.matrixWorld);
    const vertices: THREE.Vector3[] = [];
    for (let i = 0; i < pos.count; i++) vertices.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(worldToRoot));
    for (const v of vertices) box.expandByPoint(v);
    return { vertices, index, count: index ? index.count : pos.count, material: mesh.material as THREE.Material };
  });
  if (box.isEmpty()) return { ...result, error: "Las mallas metálicas no tienen límites válidos." };

  const size = box.getSize(new THREE.Vector3());
  const longest = Math.max(size.x, size.y, size.z);
  if (!(longest > 0) || !Number.isFinite(longest)) return { ...result, error: "Dimensiones metálicas inválidas." };
  const cell = longest / resolution;
  const origin = box.min.clone().addScalar(-cell * 1.5);
  const dims = [Math.ceil(size.x / cell) + 4, Math.ceil(size.y / cell) + 4, Math.ceil(size.z / cell) + 4];
  const occupied = new Set<string>();
  const maxVoxels = 1_100_000;
  const toGrid = (v: THREE.Vector3) => new THREE.Vector3(
    (v.x - origin.x) / cell, (v.y - origin.y) / cell, (v.z - origin.z) / cell
  );
  let sampleBudget = 0;
  const maxSamples = 1_800_000;

  for (const item of metalGeometries) {
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let t = 0; t + 2 < item.count; t += 3) {
      const ia = item.index ? item.index.getX(t) : t;
      const ib = item.index ? item.index.getX(t + 1) : t + 1;
      const ic = item.index ? item.index.getX(t + 2) : t + 2;
      a.copy(item.vertices[ia]!); b.copy(item.vertices[ib]!); c.copy(item.vertices[ic]!);
      const ga = toGrid(a), gb = toGrid(b), gc = toGrid(c);
      const longestEdge = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a));
      const steps = Math.max(1, Math.min(48, Math.ceil(longestEdge / (cell * 0.7))));
      const estimated = (steps + 1) * (steps + 2) / 2;
      if (sampleBudget + estimated > maxSamples) break;
      sampleBudget += estimated;
      for (let i = 0; i <= steps; i++) {
        for (let j = 0; j <= steps - i; j++) {
          const u = i / steps, v = j / steps, w = 1 - u - v;
          const gx = Math.floor(ga.x * w + gb.x * u + gc.x * v);
          const gy = Math.floor(ga.y * w + gb.y * u + gc.y * v);
          const gz = Math.floor(ga.z * w + gb.z * u + gc.z * v);
          occupied.add(key(gx, gy, gz));
          if (occupied.size > maxVoxels) return { ...result, error: "El modelo supera el límite seguro de voxeles; no se modificó la vista." };
        }
      }
      result.triangles++;
    }
    if (sampleBudget >= maxSamples) break;
  }
  if (occupied.size < 8) return { ...result, error: "La rasterización no produjo suficientes voxeles." };

  // One-cell closing bridges small cracks between touching prongs while retaining
  // a grid-defined surface; it does not calculate a Boolean union.
  const dilated = new Set(occupied);
  for (const value of occupied) {
    const [x, y, z] = value.split(",").map(Number) as [number, number, number];
    for (const [dx, dy, dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]) {
      const nx=x+dx, ny=y+dy, nz=z+dz;
      if (nx >= 0 && ny >= 0 && nz >= 0 && nx < dims[0]! && ny < dims[1]! && nz < dims[2]!) dilated.add(key(nx,ny,nz));
    }
  }
  if (dilated.size > maxVoxels * 2) return { ...result, error: "El cierre voxel supera el límite seguro; no se modificó la vista." };

  const positions: number[] = [];
  const faces: { n: [number,number,number]; corners: [number,number,number][] }[] = [
    { n:[1,0,0], corners:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
    { n:[-1,0,0], corners:[[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
    { n:[0,1,0], corners:[[0,1,0],[0,1,1],[1,1,1],[1,1,0]] },
    { n:[0,-1,0], corners:[[0,0,1],[0,0,0],[1,0,0],[1,0,1]] },
    { n:[0,0,1], corners:[[1,0,1],[1,1,1],[0,1,1],[0,0,1]] },
    { n:[0,0,-1], corners:[[0,0,0],[0,1,0],[1,1,0],[1,0,0]] },
  ];
  for (const value of dilated) {
    const [x,y,z] = value.split(",").map(Number) as [number,number,number];
    for (const face of faces) {
      if (dilated.has(key(x+face.n[0], y+face.n[1], z+face.n[2]))) continue;
      const corners = face.corners.map(([dx,dy,dz]) => [
        origin.x+(x+dx)*cell, origin.y+(y+dy)*cell, origin.z+(z+dz)*cell
      ] as [number,number,number]);
      for (const i of [0,1,2,0,2,3]) positions.push(...corners[i]!);
    }
  }
  if (positions.length < 9) return { ...result, error: "No se pudo reconstruir una superficie visible." };

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const material = meshes[0]!.material as THREE.Material;
  const remesh = new THREE.Mesh(geometry, material);
  remesh.name = "AURUM · Voxel Remesh experimental (metal)";
  remesh.castShadow = true;
  remesh.receiveShadow = true;
  remesh.userData = { aurumVoxelRemeshExperiment: true, sourceMetalMeshes: meshes.length, excludedGemMeshes: result.excludedGems, resolution, cellSize: cell, voxelCount: dilated.size };
  root.add(remesh);
  meshes.forEach((mesh) => {
    mesh.userData = { ...mesh.userData, aurumVoxelRemeshSourceHidden: true };
    mesh.visible = false;
  });
  root.updateMatrixWorld(true);
  return { ...result, enabled: true, metalMeshes: meshes.length, voxels: dilated.size };
}
