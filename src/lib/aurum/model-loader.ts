import * as THREE from "three";
import { inspectAurumMesh } from "./mesh-preflight";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type AurumNormalMode = "authored" | "diagnostic" | "recompute-metal" | "crease-metal";

function getAurumNormalExperimentMode(): AurumNormalMode {
  try {
    const value = new URLSearchParams(window.location.search).get("aurumNormals");
    if (value === "diagnostic" || value === "recompute-metal" || value === "crease-metal") return value;
  } catch {}
  return "crease-metal";
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

function isRhinoObjectHiddenForExport(attributes: any): boolean {
  if (!attributes) return false;
  const mode = attributes.mode ?? attributes.Mode ?? attributes.objectMode ?? attributes.ObjectMode;
  const modeText = typeof mode === "string" ? mode.toLowerCase() : "";
  return attributes.visible === false || attributes.Visible === false || attributes.isVisible === false
    || mode === 1 || modeText === "hidden" || modeText === "hidden_object" || modeText === "hiddenobject";
}

function enforceRhinoLayerVisibilityBeforeExport(object: THREE.Object3D) {
  const layers = Array.isArray((object as any)?.userData?.layers) ? (object as any).userData.layers : [];
  if (!layers.length) return;
  const byId = new Map<string, any>(), byName = new Map<string, any>();
  for (const layer of layers) {
    const id = layer?.id ?? layer?.Id;
    if (id != null) byId.set(String(id), layer);
    const name = String(layer?.name ?? layer?.Name ?? "").trim().toLowerCase();
    if (name) byName.set(name, layer);
  }
  const cache = new Map<number, boolean>();
  const directVisible = (layer: any) => {
    if (!layer) return true;
    const mode = layer.mode ?? layer.Mode ?? layer.visibilityMode ?? layer.VisibilityMode;
    const modeText = typeof mode === "string" ? mode.toLowerCase() : "";
    return layer.visible !== false && layer.Visible !== false && layer.isVisible !== false && layer.visibility !== false
      && mode !== 1 && modeText !== "hidden" && modeText !== "hidden_layer" && modeText !== "hiddenlayer";
  };
  const effectiveVisible = (index: number, trail = new Set<number>()): boolean => {
    if (index < 0 || index >= layers.length) return true;
    if (cache.has(index)) return cache.get(index)!;
    if (trail.has(index)) return true;
    const layer = layers[index];
    if (!directVisible(layer)) { cache.set(index, false); return false; }
    const parentId = layer?.parentLayerId ?? layer?.parentId ?? layer?.parentLayerID ?? layer?.ParentLayerId;
    if (parentId != null && String(parentId) && String(parentId) !== "00000000-0000-0000-0000-000000000000") {
      const parent = byId.get(String(parentId));
      if (parent) {
        const parentIndex = layers.indexOf(parent);
        if (parentIndex >= 0) {
          const nextTrail = new Set(trail); nextTrail.add(index);
          const visible = effectiveVisible(parentIndex, nextTrail);
          cache.set(index, visible); return visible;
        }
      }
    }
    cache.set(index, true); return true;
  };
  const resolveLayerIndex = (x: any) => {
    const candidates = [x?.userData?.attributes?.layerIndex, x?.userData?.attributes?.LayerIndex, x?.userData?.layerIndex, x?.userData?.LayerIndex];
    for (const value of candidates) { const n = Number(value); if (Number.isInteger(n) && n >= 0) return n; }
    return -1;
  };
  object.traverse((x: any) => {
    if (!x.isMesh) return;
    const attrs = x.userData?.attributes || {};
    const index = resolveLayerIndex(x);
    let layerVisible = true;
    if (index >= 0) layerVisible = effectiveVisible(index);
    else {
      const layerName = String(x.userData?.attributes?.layerName ?? x.userData?.layerName ?? "").trim().toLowerCase();
      if (layerName && byName.has(layerName)) layerVisible = effectiveVisible(layers.indexOf(byName.get(layerName)));
    }
    const objectVisible = !isRhinoObjectHiddenForExport(attrs);
    const visible = objectVisible && layerVisible;
    if (!visible) x.visible = false;
    x.userData = { ...x.userData, aurumRhinoVisibility: { enforcedBeforeExport:true, layerIndex:index, layerVisible, objectVisible, visible } };
  });
  object.updateMatrixWorld(true);
}

export function preprocessAurumModel(object: THREE.Object3D) {
  object.updateMatrixWorld(true);
  const experimentMode = getAurumNormalExperimentMode();
  let meshes = 0, triangles = 0, normalsBuilt = 0, normalsRepaired = 0, windingFacesFlipped = 0, normalsRecomputedForTest = 0, creasedNormalsForTest = 0;
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
    if (gem) {
      if (generated) { meshesWithoutNormals++; geometry.computeVertexNormals(); normalsBuilt++; x.userData = { ...x.userData, aurumNeedsFacetNormals: true }; }
      else geometry.normalizeNormals();
    } else if (experimentMode === "crease-metal") {
      geometry = toCreasedNormals(geometry.clone(), Math.PI / 3); x.geometry = geometry; creasedNormalsForTest++;
    } else if (experimentMode === "recompute-metal") {
      geometry = geometry.clone(); geometry.computeVertexNormals(); x.geometry = geometry; normalsRecomputedForTest++;
    } else if (generated) {
      meshesWithoutNormals++; geometry.computeVertexNormals(); normalsBuilt++;
    } else {
      geometry.normalizeNormals();
      if (normalInspection?.suspiciousRatio >= 0.12) {
        meshesWithSuspiciousNormals++;
        x.userData = { ...x.userData, aurumNormalsSuspicious:true, aurumNormalRepairAvailable:true, aurumNormalRepairRatio:Number(normalInspection.suspiciousRatio.toFixed(3)) };
      }
    }
    geometry.computeBoundingBox(); geometry.computeBoundingSphere(); x.castShadow = true; x.receiveShadow = true;
    x.userData = { ...x.userData, aurumPreprocessed: true, aurumNormalsGenerated: generated, aurumMeshPreflight: preflight, aurumNormalExperiment: experimentMode, aurumNormalDiagnostics: normalInspection };
  });
  removeQueue.forEach((x: any) => x.parent?.remove(x)); geometryRefs.forEach((count) => { if (count > 1) repeatedGeometryRefs += count; }); object.updateMatrixWorld(true);
  object.userData = { ...object.userData, aurumPreprocess: { version: 8, experimentMode, meshes, triangles, normalsBuilt, normalsRepaired, normalsRecomputedForTest, creasedNormalsForTest, windingFacesFlipped, meshesWithoutNormals, meshesWithSuspiciousNormals, meshesWithBoundaryEdges, meshesWithNonManifoldEdges, meshesWithDegenerateTriangles, lineObjectsRemoved, pointObjectsRemoved, repeatedGeometryRefs, preserveAuthoredNormals: experimentMode === "authored" || experimentMode === "diagnostic", autoRepairNormals: false, creaseAngleDegrees: 60, facetNormalsRequiredForGems: true, renderReadyChecks: { constructionLinesRemoved: lineObjectsRemoved > 0, constructionPointsRemoved: pointObjectsRemoved > 0, normalsAvailable: meshesWithoutNormals === 0, geometryStatsAvailable: true } } };
  return object;
}

export async function parseAurumInput(file: File, ext: string, fallbackMaterial: THREE.Material) {
  const buffer = await file.arrayBuffer();
  if (ext === "stl") { const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js"); const geo = new STLLoader().parse(buffer); geo.computeVertexNormals(); return new THREE.Mesh(geo, fallbackMaterial); }
  if (ext === "obj") { const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js"); return new OBJLoader().parse(new TextDecoder().decode(buffer)); }
  if (ext === "fbx") { const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js"); return (await new FBXLoader().parseAsync(buffer, "")).scene; }
  if (ext === "glb") { const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js"); return (await new GLTFLoader().parseAsync(buffer, "")).scene; }
  if (ext === "3dm") { const { Rhino3dmLoader } = await import("three/examples/jsm/loaders/3DMLoader.js"); const loader = new Rhino3dmLoader(); loader.setLibraryPath("https://cdn.jsdelivr.net/npm/rhino3dm@8.32.2/"); loader.setWorkerLimit(2); return await new Promise<any>((resolve, reject) => loader.parse(buffer, resolve, reject)); }
  throw new Error("Formato no compatible.");
}

export function convertAurumToGlb(object: THREE.Object3D) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    enforceRhinoLayerVisibilityBeforeExport(object);
    preprocessAurumModel(object);
    import("three/examples/jsm/exporters/GLTFExporter.js").then(({ GLTFExporter }) => {
      const exporter = new GLTFExporter();
      exporter.parse(object, (result: ArrayBuffer | { [key: string]: unknown }) => {
        if (result instanceof ArrayBuffer) resolve(result);
        else reject(new Error("No se pudo generar el GLB interno."));
      }, (error: unknown) => reject(error), { binary: true, onlyVisible: true, trs: false });
    }).catch(reject);
  });
}
