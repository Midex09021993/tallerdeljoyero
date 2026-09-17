import * as THREE from "three";
import { inspectAurumMesh } from "./mesh-preflight";

function getAurumNormalExperimentMode(): "authored" | "diagnostic" | "recompute-metal" {
  try {
    const value = new URLSearchParams(window.location.search).get("aurumNormals");
    if (value === "diagnostic" || value === "recompute-metal") return value;
  } catch {}
  return "authored";
}

function isLikelyGem(x: any) {
  const text = [x?.name, x?.userData?.aurumRhino?.capa, x?.userData?.attributes?.layerName]
    .map((v: any) => String(v ?? "").toLowerCase()).join(" ");
  return /(gem|gema|piedra|diamond|diamante|zafiro|sapphire|rubi|rubí|ruby|esmeralda|emerald|moissanita|citrino|amatista|topacio)/.test(text);
}

function inspectMeshNormals(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  if (!position || !normal || normal.count !== position.count) return { valid: false, suspiciousRatio: 1, vertices: position?.count ?? 0 };
  const accumulated = new Float32Array(position.count * 3);
  const index = geometry.getIndex();
  const addFace = (ia: number, ib: number, ic: number) => {
    const ax = position.getX(ia), ay = position.getY(ia), az = position.getZ(ia);
    const bx = position.getX(ib), by = position.getY(ib), bz = position.getZ(ib);
    const cx = position.getX(ic), cy = position.getY(ic), cz = position.getZ(ic);
    const abx = bx - ax, aby = by - ay, abz = bz - az, acx = cx - ax, acy = cy - ay, acz = cz - az;
    const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
    if (!Number.isFinite(Math.hypot(nx, ny, nz)) || Math.hypot(nx, ny, nz) < 1e-12) return;
    for (const i of [ia, ib, ic]) { accumulated[i * 3] += nx; accumulated[i * 3 + 1] += ny; accumulated[i * 3 + 2] += nz; }
  };
  if (index) for (let i = 0; i + 2 < index.count; i += 3) addFace(index.getX(i), index.getX(i + 1), index.getX(i + 2));
  else for (let i = 0; i + 2 < position.count; i += 3) addFace(i, i + 1, i + 2);
  let comparable = 0, suspicious = 0;
  for (let i = 0; i < position.count; i++) {
    const ax = accumulated[i * 3], ay = accumulated[i * 3 + 1], az = accumulated[i * 3 + 2], al = Math.hypot(ax, ay, az);
    const nx = normal.getX(i), ny = normal.getY(i), nz = normal.getZ(i), nl = Math.hypot(nx, ny, nz);
    if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(nz) || !Number.isFinite(nl) || nl < 1e-8) { suspicious++; comparable++; continue; }
    if (al < 1e-10) continue;
    const dot = (nx * ax + ny * ay + nz * az) / (nl * al); comparable++;
    if (!Number.isFinite(dot) || dot < 0.15) suspicious++;
  }
  return { valid: true, suspiciousRatio: comparable ? suspicious / comparable : 0, vertices: position.count };
}

function repairMeshWindingAndNormals(geometry: THREE.BufferGeometry) {
  const index = geometry.getIndex(), position = geometry.getAttribute("position");
  if (!index || !position || index.count < 3 || index.count % 3 !== 0) { geometry.computeVertexNormals(); return { flippedFaces: 0, components: 0 }; }
  const faceCount = Math.floor(index.count / 3), edges = new Map<string, Array<{ face: number; dir: number }>>();
  const edgeInfo = (a: number, b: number) => { const lo = Math.min(a, b); return { key: `${lo}:${Math.max(a, b)}`, dir: a === lo ? 1 : -1 }; };
  for (let f = 0; f < faceCount; f++) {
    const a = index.getX(f * 3), b = index.getX(f * 3 + 1), c = index.getX(f * 3 + 2);
    for (const edge of [edgeInfo(a, b), edgeInfo(b, c), edgeInfo(c, a)]) { const list = edges.get(edge.key) ?? []; list.push({ face: f, dir: edge.dir }); edges.set(edge.key, list); }
  }
  const adjacency = new Map<number, Array<{ face: number; sameDirection: boolean }>>();
  edges.forEach((list) => {
    if (list.length < 2) return;
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j], sameDirection = a.dir === b.dir;
      const aList = adjacency.get(a.face) ?? [], bList = adjacency.get(b.face) ?? [];
      aList.push({ face: b.face, sameDirection }); bList.push({ face: a.face, sameDirection }); adjacency.set(a.face, aList); adjacency.set(b.face, bList);
    }
  });
  const flip = new Array<boolean>(faceCount).fill(false), visited = new Array<boolean>(faceCount).fill(false), components: number[][] = [];
  for (let start = 0; start < faceCount; start++) {
    if (visited[start]) continue;
    const queue = [start], component: number[] = []; visited[start] = true;
    while (queue.length) { const face = queue.shift()!; component.push(face); for (const link of adjacency.get(face) ?? []) { if (visited[link.face]) continue; flip[link.face] = link.sameDirection ? !flip[face] : flip[face]; visited[link.face] = true; queue.push(link.face); } }
    components.push(component);
  }
  const authoredNormal = geometry.getAttribute("normal");
  const faceNormal = (face: number, useFlip: boolean) => {
    let a = index.getX(face * 3), b = index.getX(face * 3 + 1), c = index.getX(face * 3 + 2); if (useFlip) [b, c] = [c, b];
    const ax = position.getX(a), ay = position.getY(a), az = position.getZ(a), bx = position.getX(b), by = position.getY(b), bz = position.getZ(b), cx = position.getX(c), cy = position.getY(c), cz = position.getZ(c);
    return new THREE.Vector3((by - ay) * (cz - az) - (bz - az) * (cy - ay), (bz - az) * (cx - ax) - (bx - ax) * (cz - az), (bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
  };
  if (authoredNormal && authoredNormal.count === position.count) for (const component of components) {
    const face = component[0], candidate = faceNormal(face, flip[face]).normalize(), a = index.getX(face * 3), b = index.getX(face * 3 + 1), c = index.getX(face * 3 + 2);
    const reference = new THREE.Vector3().set(authoredNormal.getX(a), authoredNormal.getY(a), authoredNormal.getZ(a)).add(new THREE.Vector3(authoredNormal.getX(b), authoredNormal.getY(b), authoredNormal.getZ(b))).add(new THREE.Vector3(authoredNormal.getX(c), authoredNormal.getY(c), authoredNormal.getZ(c))).normalize();
    if (reference.lengthSq() > 1e-8 && candidate.dot(reference) < 0) for (const f of component) flip[f] = !flip[f];
  }
  const nextIndex = index.array.slice(); let flippedFaces = 0;
  for (let f = 0; f < faceCount; f++) if (flip[f]) { const base = f * 3, tmp = nextIndex[base + 1]; nextIndex[base + 1] = nextIndex[base + 2]; nextIndex[base + 2] = tmp; flippedFaces++; }
  if (flippedFaces > 0) geometry.setIndex(new THREE.BufferAttribute(nextIndex, 1)); geometry.computeVertexNormals();
  return { flippedFaces, components: components.length };
}

export function preprocessAurumModel(object: THREE.Object3D) {
  object.updateMatrixWorld(true);
  const experimentMode = getAurumNormalExperimentMode();
  let meshes = 0, triangles = 0, normalsBuilt = 0, normalsRepaired = 0, windingFacesFlipped = 0, normalsRecomputedForTest = 0;
  let lineObjectsRemoved = 0, pointObjectsRemoved = 0, meshesWithoutNormals = 0, meshesWithSuspiciousNormals = 0, repeatedGeometryRefs = 0, meshesWithBoundaryEdges = 0, meshesWithNonManifoldEdges = 0, meshesWithDegenerateTriangles = 0;
  const geometryRefs = new Map<any, number>(), removeQueue: any[] = [];
  object.traverse((x: any) => {
    if (x !== object && (x.isLine || x.isLineSegments || x.isPoints)) { removeQueue.push(x); if (x.isPoints) pointObjectsRemoved++; else lineObjectsRemoved++; return; }
    if (!x.isMesh || !x.geometry) return;
    meshes++; let geometry = x.geometry as THREE.BufferGeometry; geometryRefs.set(geometry, (geometryRefs.get(geometry) ?? 0) + 1);
    const position = geometry.getAttribute("position"); if (!position || position.count < 3) return;
    const index = geometry.getIndex(); triangles += index ? Math.floor(index.count / 3) : Math.floor(position.count / 3);
    const preflight = inspectAurumMesh(geometry); if (preflight.boundaryEdges > 0) meshesWithBoundaryEdges++; if (preflight.nonManifoldEdges > 0) meshesWithNonManifoldEdges++; if (preflight.degenerateTriangles > 0) meshesWithDegenerateTriangles++;
    const normal = geometry.getAttribute("normal"), generated = !normal || normal.count !== position.count, gem = isLikelyGem(x), normalInspection = generated ? null : inspectMeshNormals(geometry);
    if (experimentMode === "recompute-metal" && !gem) { geometry = geometry.clone(); geometry.computeVertexNormals(); x.geometry = geometry; normalsRecomputedForTest++; }
    else if (generated) { meshesWithoutNormals++; geometry.computeVertexNormals(); normalsBuilt++; if (gem) x.userData = { ...x.userData, aurumNeedsFacetNormals: true }; }
    else {
      // iJewel's documented workflow expects the Rhino render mesh to arrive
      // already prepared. It explicitly recommends fixing wrong normals in the
      // modelling file rather than silently rebuilding production geometry at
      // runtime. Preserve authored Rhino normals by default; only the explicit
      // ?aurumNormals=recompute-metal experiment rebuilds them for comparison.
      geometry.normalizeNormals();
      if (normalInspection?.suspiciousRatio >= 0.12) {
        meshesWithSuspiciousNormals++;
        x.userData = {
          ...x.userData,
          aurumNormalsSuspicious:true,
          aurumNormalRepairAvailable:true,
          aurumNormalRepairRatio:Number(normalInspection.suspiciousRatio.toFixed(3)),
        };
      }
    }
    geometry.computeBoundingBox(); geometry.computeBoundingSphere(); x.castShadow = true; x.receiveShadow = true;
    x.userData = { ...x.userData, aurumPreprocessed: true, aurumNormalsGenerated: generated, aurumMeshPreflight: preflight, aurumNormalExperiment: experimentMode, aurumNormalDiagnostics: normalInspection };
  });
  removeQueue.forEach((x: any) => x.parent?.remove(x)); geometryRefs.forEach((count) => { if (count > 1) repeatedGeometryRefs += count; }); object.updateMatrixWorld(true);
  object.userData = { ...object.userData, aurumPreprocess: { version: 7, experimentMode, meshes, triangles, normalsBuilt, normalsRepaired, normalsRecomputedForTest, windingFacesFlipped, meshesWithoutNormals, meshesWithSuspiciousNormals, meshesWithBoundaryEdges, meshesWithNonManifoldEdges, meshesWithDegenerateTriangles, lineObjectsRemoved, pointObjectsRemoved, repeatedGeometryRefs, preserveAuthoredNormals: true, autoRepairNormals: false, repairThreshold: 0.12, facetNormalsRequiredForGems: true, renderReadyChecks: { constructionLinesRemoved: lineObjectsRemoved > 0, constructionPointsRemoved: pointObjectsRemoved > 0, normalsAvailable: meshesWithoutNormals === 0, geometryStatsAvailable: true } } };
  return object;
}

export async function parseAurumInput(file: File, ext: string, fallbackMaterial: THREE.Material) {
  const buffer = await file.arrayBuffer();
  if (ext === "stl") { const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js"); const geo = new STLLoader().parse(buffer); geo.computeVertexNormals(); return new THREE.Mesh(geo, fallbackMaterial); }
  if (ext === "obj") { const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js"); return new OBJLoader().parse(new TextDecoder().decode(buffer)); }
  if (ext === "fbx") { const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js"); return new FBXLoader().parse(buffer, ""); }
  if (ext === "glb") { const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js"); return (await new GLTFLoader().parseAsync(buffer, "")).scene; }
  if (ext === "3dm") { const { Rhino3dmLoader } = await import("three/examples/jsm/loaders/3DMLoader.js"); const loader = new Rhino3dmLoader(); loader.setLibraryPath("https://cdn.jsdelivr.net/npm/rhino3dm@8.32.2/"); loader.setWorkerLimit(2); return await new Promise<any>((resolve, reject) => loader.parse(buffer, resolve, reject)); }
  throw new Error("Formato no compatible.");
}

export function convertAurumToGlb(object: THREE.Object3D) {
  return new Promise<ArrayBuffer>((resolve, reject) => { preprocessAurumModel(object); import("three/examples/jsm/exporters/GLTFExporter.js").then(({ GLTFExporter }) => { const exporter = new GLTFExporter(); exporter.parse(object, (result: ArrayBuffer | { [key: string]: unknown }) => { if (result instanceof ArrayBuffer) resolve(result); else reject(new Error("No se pudo generar el GLB interno.")); }, (error: unknown) => reject(error), { binary: true, onlyVisible: true, trs: false }); }).catch(reject); });
}
