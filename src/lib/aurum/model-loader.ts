import * as THREE from "three";
import { inspectAurumMesh } from "./mesh-preflight";
import { getAurumModelParts } from "./model-parts";
import { findAurumOverlapCandidates } from "./overlap-experiment";
import { applyAurumMetalUnionExperiment } from "./metal-union-experiment";
import { applyAurumVoxelRemeshExperiment } from "./voxel-remesh-experiment";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type AurumNormalMode = "authored" | "diagnostic" | "recompute-metal" | "crease-metal";

function getAurumNormalExperimentMode(): AurumNormalMode {
  try {
    const value = new URLSearchParams(window.location.search).get("aurumNormals");
    if (value === "authored" || value === "diagnostic" || value === "recompute-metal" || value === "crease-metal") return value;
  } catch {
    // URL diagnostics are optional; preserve the authored CAD normals by default.
  }
  // Preserve authored CAD normals by default. The crease-normal path remains
  // available as an explicit diagnostic experiment via ?aurumNormals=crease-metal;
  // forcing it on every metal mesh can introduce visible shading seams on polished
  // jewelry even when the source normals are already correct.
  return "authored";
}

function getAurumMeshFamily(x: any): "metal" | "gema" | "otro" {
  const layer = x?.userData?.aurumRhino ?? {};
  const text = [
    x?.name,
    layer?.capa,
    x?.userData?.attributes?.layerName,
    x?.userData?.attributes?.LayerName,
    ...(Array.isArray(x?.material) ? x.material : [x?.material]).map((m: any) => m?.name),
  ].map((v: any) => String(v ?? "").toLowerCase()).join(" ");
  if (layer?.categoria === "gema" || /(gem|gema|piedra|diamond|diamante|zafiro|sapphire|rubi|rubí|ruby|esmeralda|emerald|moissanita|citrino|amatista|topacio)/.test(text)) return "gema";
  if (layer?.categoria === "metal" || /(metal|oro|gold|plata|silver|platino|platinum|acero|steel)/.test(text)) return "metal";
  return "otro";
}

function isLikelyGem(x: any) {
  return getAurumMeshFamily(x) === "gema";
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
    for (const i of [ia, ib, ic]) { accumulated[i * 3]! += nx; accumulated[i * 3 + 1]! += ny; accumulated[i * 3 + 2]! += nz; }
  };
  if (index) for (let i = 0; i + 2 < index.count; i += 3) addFace(index.getX(i), index.getX(i + 1), index.getX(i + 2));
  else for (let i = 0; i + 2 < position.count; i += 3) addFace(i, i + 1, i + 2);
  let comparable = 0, suspicious = 0;
  for (let i = 0; i < position.count; i++) {
    const ax = accumulated[i * 3] ?? 0, ay = accumulated[i * 3 + 1] ?? 0, az = accumulated[i * 3 + 2] ?? 0, al = Math.hypot(ax, ay, az);
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

export async function preprocessAurumModel(
  object: THREE.Object3D,
  onProgress?: (message: string, completed: number, total: number) => void,
) {
  object.updateMatrixWorld(true);
  const experimentMode = getAurumNormalExperimentMode();
  let meshes = 0, triangles = 0, normalsBuilt = 0, normalsRecomputedForTest = 0, creasedNormalsForTest = 0;
  const normalsRepaired = 0, windingFacesFlipped = 0;
  let lineObjectsRemoved = 0, pointObjectsRemoved = 0, meshesWithoutNormals = 0, meshesWithSuspiciousNormals = 0, repeatedGeometryRefs = 0, meshesWithBoundaryEdges = 0, meshesWithNonManifoldEdges = 0, meshesWithDegenerateTriangles = 0;
  const geometryRefs = new Map<any, number>(), removeQueue: any[] = [];
  const queuedObjects: any[] = [];
  object.traverse((x: any) => queuedObjects.push(x));
  for (let objectIndex = 0; objectIndex < queuedObjects.length; objectIndex++) {
    // Yield between small batches so large CAD assemblies do not monopolize
    // the main thread for the entire preprocessing pass.
    if (objectIndex > 0 && objectIndex % 32 === 0) {
      onProgress?.(`Preparando geometría (${objectIndex}/${queuedObjects.length})`, objectIndex, queuedObjects.length);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    const x = queuedObjects[objectIndex];

    if (x !== object && (x.isLine || x.isLineSegments || x.isPoints)) { removeQueue.push(x); if (x.isPoints) pointObjectsRemoved++; else lineObjectsRemoved++; continue; }
    if (!x.isMesh || !x.geometry) continue;
    meshes++; let geometry = x.geometry as THREE.BufferGeometry; geometryRefs.set(geometry, (geometryRefs.get(geometry) ?? 0) + 1);
    const position = geometry.getAttribute("position"); if (!position || position.count < 3) continue;
    const index = geometry.getIndex(); triangles += index ? Math.floor(index.count / 3) : Math.floor(position.count / 3);
    // Full mesh preflight and per-vertex normal inspection are diagnostic tools,
    // not part of the production 3DM -> GLB path. On jewelry meshes with hundreds
    // of thousands of triangles they duplicate most of the CPU work of export.
    const diagnostic = experimentMode === "diagnostic";
    const preflight = diagnostic ? inspectAurumMesh(geometry) : null;
    if (preflight) {
      if (preflight.boundaryEdges > 0) meshesWithBoundaryEdges++;
      if (preflight.nonManifoldEdges > 0) meshesWithNonManifoldEdges++;
      if (preflight.degenerateTriangles > 0) meshesWithDegenerateTriangles++;
    }
    const normal = geometry.getAttribute("normal");
    const generated = !normal || normal.count !== position.count;
    const gem = isLikelyGem(x);
    const normalInspection = diagnostic && !generated ? inspectMeshNormals(geometry) : null;
    if (generated) {
      meshesWithoutNormals++;
      const family = getAurumMeshFamily(x);
      if (family === "metal") {
        // Rhino/mesh imports without authored normals can look faceted when plain
        // per-triangle vertex normals are generated. Repair only these metal meshes
        // with a crease-aware pass; keep gem facets and unknown parts untouched.
        geometry = geometry.clone();
        geometry = toCreasedNormals(geometry, 50 * Math.PI / 180);
        x.geometry = geometry;
        x.userData = { ...x.userData, aurumMetalNormalsGeneratedWithCreases: true };
        creasedNormalsForTest++;
      } else {
        geometry.computeVertexNormals();
        if (gem) x.userData = { ...x.userData, aurumNeedsFacetNormals: true };
      }
      normalsBuilt++;
    } else if ((experimentMode === "crease-metal" || experimentMode === "recompute-metal") && getAurumMeshFamily(x) === "metal") {
      // Controlled repair experiment: touch only meshes positively identified as
      // metal, never gemstones or unknown/ornamental geometry. Clone first so
      // shared CAD geometries and other layer instances remain unchanged.
      geometry = geometry.clone();
      if (experimentMode === "crease-metal") {
        geometry = toCreasedNormals(geometry, 35 * Math.PI / 180);
        creasedNormalsForTest++;
      } else {
        geometry.computeVertexNormals();
        normalsRecomputedForTest++;
      }
      x.geometry = geometry;
      x.userData = { ...x.userData, aurumMetalNormalsExperimentApplied: experimentMode };
    } else if (normalInspection && normalInspection.suspiciousRatio >= 0.12) {
      meshesWithSuspiciousNormals++;
      x.userData = {
        ...x.userData,
        aurumNormalsSuspicious:true,
        aurumNormalRepairAvailable:true,
        aurumNormalRepairRatio:Number(normalInspection.suspiciousRatio.toFixed(3))
      };
    }
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    // Gemstone transmission already costs a full optical pass. Casting a shadow
    // from every facet duplicates that work in the shadow pass and adds little
    // visible information at jewelry scale. Keep metal/opaque parts as shadow
    // casters; gems still receive shadows for contact/readability.
    x.castShadow = !gem;
    x.receiveShadow = true;
    x.userData = { ...x.userData, aurumPreprocessed: true, aurumNormalsGenerated: generated, aurumMeshPreflight: preflight, aurumNormalExperiment: experimentMode, aurumNormalDiagnostics: normalInspection };
  }
  onProgress?.("Finalizando preparación de geometría", queuedObjects.length, queuedObjects.length);
  removeQueue.forEach((x: any) => x.parent?.remove(x)); geometryRefs.forEach((count) => { if (count > 1) repeatedGeometryRefs += count; }); object.updateMatrixWorld(true);
  object.userData = { ...object.userData, aurumPreprocess: { version: 9, experimentMode, meshes, triangles, normalsBuilt, normalsRepaired, normalsRecomputedForTest, creasedNormalsForTest, windingFacesFlipped, meshesWithoutNormals, meshesWithSuspiciousNormals, meshesWithBoundaryEdges, meshesWithNonManifoldEdges, meshesWithDegenerateTriangles, lineObjectsRemoved, pointObjectsRemoved, repeatedGeometryRefs, preserveAuthoredNormals: experimentMode === "authored" || experimentMode === "diagnostic", autoRepairNormals: false, metalNormalsExperimentOnly: experimentMode === "crease-metal" || experimentMode === "recompute-metal", creaseAngleDegrees: 60, facetNormalsRequiredForGems: true, renderReadyChecks: { constructionLinesRemoved: lineObjectsRemoved > 0, constructionPointsRemoved: pointObjectsRemoved > 0, normalsAvailable: meshesWithoutNormals === 0, geometryStatsAvailable: true } } };
  if (experimentMode === "diagnostic") {
    const suspiciousMeshes: any[] = [];
    object.traverse((x: any) => {
      if (!x.isMesh) return;
      const diagnostic = x.userData?.aurumNormalDiagnostics;
      if (diagnostic?.valid && Number(diagnostic.suspiciousRatio) >= 0.12) {
        suspiciousMeshes.push({
          mesh: String(x.name || x.uuid),
          family: getAurumMeshFamily(x),
          vertices: diagnostic.vertices,
          suspiciousNormalRatio: Number(Number(diagnostic.suspiciousRatio).toFixed(3)),
          triangles: x.geometry?.index ? Math.floor(x.geometry.index.count / 3) : Math.floor((x.geometry?.attributes?.position?.count ?? 0) / 3),
          material: Array.isArray(x.material) ? x.material.map((m: any) => m?.name || m?.type) : (x.material?.name || x.material?.type || null),
        });
      }
    });
    console.info("[AURUM][NORMALS AUDIT]", { ...object.userData["aurumPreprocess"], suspiciousMeshes });
  }
  // Explicit, opt-in geometry audit. Never changes meshes; use ?aurumOverlap=1 in the viewer.
  try {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("aurumOverlap") === "1") {
      const overlapCandidates = findAurumOverlapCandidates(object, {
        metalOnly: true,
        maxTrianglesPerMesh: 12000,
        maxTrianglePairTests: 1500000,
      });
      console.info("[AURUM][METAL OVERLAP AUDIT]", {
        totalCandidates: overlapCandidates.length,
        confirmedSurfaceIntersections: overlapCandidates.filter((item) => item.status === "surface-intersection").length,
        boundsOnly: overlapCandidates.filter((item) => item.status === "bounds-only").length,
        budgetExceeded: overlapCandidates.filter((item) => item.status === "budget-exceeded").length,
        candidates: overlapCandidates,
      });
    }
  } catch (error) {
    console.warn("[AURUM][METAL OVERLAP AUDIT] Diagnostic failed safely", error);
  }
  // Opt-in voxel remesh experiment. This is independent from the legacy Boolean/CSG test.
  // Original metal meshes are only hidden after a complete voxel surface is built.
  try {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("aurumWrap") === "1") {
      const voxelResult = applyAurumVoxelRemeshExperiment(object, 88);
      console.info("[AURUM][VOXEL REMESH EXPERIMENT]", voxelResult);
    }
  } catch (error) {
    console.warn("[AURUM][VOXEL REMESH EXPERIMENT] Failed safely; source meshes retained", error);
  }
  return object;
}

export async function parseAurumInput(file: File, ext: string, fallbackMaterial: THREE.Material) {
  const loadAuditEnabled = typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("aurumLoadAudit") === "1";
  const auditStarted = performance.now();
  let auditPrevious = auditStarted;
  const auditStep = (stage:string, details:Record<string, unknown> = {}) => {
    if (!loadAuditEnabled) return;
    const now = performance.now();
    console.info("[AURUM][3DM AUDIT]", {
      file: file.name,
      stage,
      stageMs: Number((now - auditPrevious).toFixed(1)),
      totalMs: Number((now - auditStarted).toFixed(1)),
      ...details,
    });
    auditPrevious = now;
  };
  const buffer = await file.arrayBuffer();
  auditStep("file-arraybuffer-ready", { bytes: buffer.byteLength, format: ext });
  if (ext === "stl") {
    const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
    const geometry = new STLLoader().parse(buffer);
    geometry.computeBoundingBox();
    const size = geometry.boundingBox?.getSize(new THREE.Vector3()) ?? new THREE.Vector3();
    const model = new THREE.Mesh(geometry, fallbackMaterial);
    // STL has no up-axis metadata. Correct only a clearly thin Y-axis model.
    const yIsClearlyThin = size.y > 0 && size.y < size.x * 0.65 && size.y < size.z * 0.65;
    if (yIsClearlyThin) {
      // This STL's thin axis is Y, so the ring lies in the source XZ plane.
      // Map source +Z to viewer +Y: a positive X quarter-turn maps +Z to -Y
      // and places the head below the shank. The negative quarter-turn keeps
      // the source's positive-Z setting above the band.
      model.rotation.set(-Math.PI / 2, 0, 0);
      model.userData["aurumStlOrientation"] = "heuristic-upright-setting-up";
    } else {
      model.userData["aurumStlOrientation"] = "unchanged";
    }
    model.userData["aurumSourceFormat"] = "stl";
    model.userData["aurumRhino"] = { categoria: "otro", capa: "STL sin capas", layerKey: "stl-unclassified" };
    model.userData["aurumStlDimensions"] = { x: size.x, y: size.y, z: size.z };
    return model;
  }
  if (ext === "obj") { const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js"); return new OBJLoader().parse(new TextDecoder().decode(buffer)); }
  if (ext === "fbx") { const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js"); return new FBXLoader().parse(buffer, ""); }
  if (ext === "glb") { const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js"); return (await new GLTFLoader().parseAsync(buffer, "")).scene; }
  if (ext === "3dm") {
    const { Rhino3dmLoader } = await import("three/examples/jsm/loaders/3DMLoader.js");
    auditStep("rhino-loader-module-ready");
    const loader:any = new Rhino3dmLoader();
    loader.setLibraryPath("https://cdn.jsdelivr.net/npm/rhino3dm@8.32.2/");
    // Rhino3dmLoader expands block instances by cloning definition meshes, but
    // its stock implementation drops the InstanceReference's own attributes.
    // That makes a stone placed on layer 6 inherit its definition mesh's layer 5.
    // Patch the conversion boundary: match each generated instance group to its
    // source InstanceReference transform and carry the reference layer onto the
    // cloned meshes before the GLB metadata snapshot is taken.
    // Break down Rhino's main-thread geometry conversion by source object.
    // The upstream loader parses BufferGeometry JSON synchronously inside _createObject.
    const createObject = loader._createObject.bind(loader);
    let objectBuildCalls = 0;
    let objectBuildMs = 0;
    loader._createObject = (data:any, material:any) => {
      const started = performance.now();
      const result = createObject(data, material);
      // Preserve Rhino's source geometry class: THREE.Mesh is also used to
      // represent tessellated Breps/Surfaces, so it cannot identify Rhino Mesh.
      const sourceGeometryType = String(data?.objectType ?? "").trim();
      if (sourceGeometryType) {
        result.traverse((child: any) => {
          if (!child?.isMesh) return;
          child.userData = {
            ...(child.userData ?? {}),
            aurumRhinoGeometryType: sourceGeometryType,
          };
        });
      }
      const elapsed = performance.now() - started;
      objectBuildCalls++;
      objectBuildMs += elapsed;
      if (loadAuditEnabled && elapsed >= 25) {
        const geometry = data?.geometry;
        const attributes = geometry?.data?.attributes ?? geometry?.attributes ?? {};
        const geometrySummary = Object.fromEntries(
          Object.entries(attributes).map(([key,value]:[string,any]) => [
            key,
            { itemSize: value?.itemSize ?? null, count: Array.isArray(value?.array) ? value.array.length : null, componentType: value?.type ?? null },
          ])
        );
        console.info("[AURUM][3DM AUDIT]", {
          file: file.name,
          stage: "rhino-create-object",
          objectType: data?.objectType ?? null,
          objectName: data?.attributes?.name ?? null,
          stageMs: Number(elapsed.toFixed(1)),
          cumulativeObjectMs: Number(objectBuildMs.toFixed(1)),
          geometryAttributes: geometrySummary,
        });
      }
      return result;
    };
    const createGeometry = loader._createGeometry.bind(loader);
    let geometryBuildCalls = 0;
    let geometryBuildMs = 0;
    loader._createGeometry = (data:any) => {
      const geometryStarted = performance.now();
      const root:THREE.Object3D = createGeometry(data);
      const geometryElapsed = performance.now() - geometryStarted;
      geometryBuildCalls++;
      geometryBuildMs += geometryElapsed;
      if (loadAuditEnabled) {
        let meshCount = 0, triangles = 0, vertices = 0;
        root.traverse((child:any) => {
          if (!child.isMesh || !child.geometry) return;
          meshCount++;
          const position = child.geometry.getAttribute("position");
          const index = child.geometry.getIndex();
          vertices += position?.count ?? 0;
          triangles += index ? Math.floor(index.count / 3) : Math.floor((position?.count ?? 0) / 3);
        });
        console.info("[AURUM][3DM AUDIT]", {
          file: file.name,
          stage: "rhino-create-geometry",
          call: geometryBuildCalls,
          stageMs: Number(geometryElapsed.toFixed(1)),
          cumulativeGeometryMs: Number(geometryBuildMs.toFixed(1)),
          objectsInPayload: Array.isArray(data?.objects) ? data.objects.length : null,
          meshes: meshCount,
          vertices,
          triangles,
        });
      }
      const references = (Array.isArray(data?.objects) ? data.objects : []).filter((item:any) =>
        item?.objectType === "InstanceReference" && item?.geometry?.xform?.array
      );
      const instanceGroups = root.children.filter((child:any) =>
        !child.isMesh && !child.isLine && !child.isPoints && child.children?.length
      );
      const used = new Set<THREE.Object3D>();
      let patchedReferences = 0;
      const closeMatrix = (a:THREE.Matrix4,b:THREE.Matrix4) =>
        a.elements.every((value,index) => Math.abs(value-(b.elements[index] ?? value)) < 1e-5);
      for (const reference of references) {
        const values = reference.geometry.xform.array;
        if (!Array.isArray(values) && !ArrayBuffer.isView(values)) continue;
        if ((values as ArrayLike<number>).length !== 16) continue;
        const expected = new THREE.Matrix4();
        expected.set(...Array.from(values as ArrayLike<number>).map(Number) as [number,number,number,number,number,number,number,number,number,number,number,number,number,number,number,number]);
        let group:THREE.Object3D | undefined;
        for (const candidate of instanceGroups) {
          if (used.has(candidate)) continue;
          candidate.updateMatrix();
          if (closeMatrix(candidate.matrix,expected)) { group = candidate; break; }
        }
        if (!group) continue;
        used.add(group);
        const attrs = reference.attributes ?? {};
        const rawIndex = attrs.layerIndex ?? attrs.LayerIndex;
        const layerIndex = rawIndex !== null && rawIndex !== undefined && rawIndex !== "" && Number.isInteger(Number(rawIndex)) && Number(rawIndex) >= 0
          ? Number(rawIndex) : null;
        const sourceLayers = Array.isArray(root.userData?.["layers"]) ? root.userData["layers"] as any[] : [];
        const sourceLayer = layerIndex !== null ? sourceLayers[layerIndex] : null;
        const referenceIdentity = {
          objectId: attrs.id ?? attrs.Id ?? null,
          objectName: attrs.name ?? attrs.Name ?? null,
          layerIndex,
          layerId: sourceLayer?.id ?? sourceLayer?.Id ?? null,
          layerName: sourceLayer?.name ?? sourceLayer?.Name ?? null,
          layerColor: sourceLayer?.color ?? sourceLayer?.Color ?? null,
          materialSource: attrs.materialSource ?? null,
        };
        group.userData = { ...group.userData, aurumRhinoInstanceReference: referenceIdentity };
        group.traverse((child:any) => {
          if (!child.isMesh) return;
          const definitionAttributes = child.userData?.attributes ?? {};
          child.userData = {
            ...child.userData,
            aurumRhinoInstanceSource: {
              ...referenceIdentity,
              definitionObjectId: definitionAttributes.id ?? definitionAttributes.Id ?? null,
              definitionObjectName: definitionAttributes.name ?? definitionAttributes.Name ?? child.name ?? null,
              definitionLayerIndex: definitionAttributes.layerIndex ?? definitionAttributes.LayerIndex ?? null,
            },
            attributes: layerIndex === null ? definitionAttributes : {
              ...definitionAttributes,
              definitionLayerIndex: definitionAttributes.layerIndex ?? definitionAttributes.LayerIndex ?? null,
              layerIndex,
              instanceReferenceId: attrs.id ?? attrs.Id ?? null,
              instanceReferenceName: attrs.name ?? attrs.Name ?? null,
            },
          };
        });
        patchedReferences++;
      }
      root.userData = {
        ...root.userData,
        aurumInstanceLayerHydration: {
          detectedReferences: references.length,
          generatedInstanceGroups: instanceGroups.length,
          patchedReferences,
          unmatchedReferences: references.length - patchedReferences,
        },
      };
      return root;
    };
    // One 3DM is normally decoded by one worker. A small adaptive pool avoids
    // unnecessarily serializing heavy WASM work on capable desktops while
    // preventing mobile/low-core devices from spawning excessive workers.
    const cores = typeof navigator !== "undefined" ? Number(navigator.hardwareConcurrency || 2) : 2;
    const workerLimit = Math.max(1, Math.min(4, Math.floor(cores / 2) || 1));
    loader.setWorkerLimit(workerLimit);
    auditStep("rhino-parse-start", { workerLimit, hardwareConcurrency: cores });
    return await new Promise<any>((resolve, reject) => loader.parse(buffer, (model:any) => {
      auditStep("rhino-parse-complete", {
        geometryBuildCalls,
        geometryBuildMs: Number(geometryBuildMs.toFixed(1)),
        objectBuildCalls,
        objectBuildMs: Number(objectBuildMs.toFixed(1)),
        workerLimit,
      });
      resolve(model);
    }, (error:any) => {
      auditStep("rhino-parse-error", { message: String(error?.message ?? error) });
      reject(error);
    }));
  }
  throw new Error("Formato no compatible.");
}

type AurumMaterialConsolidationAudit = {
  metalMeshes: number;
  distinctLayerKeys: number;
  materialInstancesBefore: number;
  materialInstancesAfter: number;
  consolidatedMaterialReferences: number;
  skippedWithoutLayerIdentity: number;
};

/**
 * Share only visually identical material instances within the same Rhino metal
 * layer. Geometry, transforms, source materials and every non-metal mesh remain
 * untouched. The material JSON fingerprint retains all serialized render
 * properties; only the per-instance UUID is excluded.
 */
function consolidateAurumMetalMaterialsByLayer(root: THREE.Object3D): AurumMaterialConsolidationAudit {
  const groups = new Map<string, THREE.Material>();
  const layerKeys = new Set<string>();
  const audit: AurumMaterialConsolidationAudit = {
    metalMeshes: 0,
    distinctLayerKeys: 0,
    materialInstancesBefore: 0,
    materialInstancesAfter: 0,
    consolidatedMaterialReferences: 0,
    skippedWithoutLayerIdentity: 0,
  };
  const fingerprint = (material: THREE.Material): string => {
    const serialized = material.toJSON() as Record<string, any>;
    const normalized = { ...serialized };
    delete normalized.uuid;
    return JSON.stringify(normalized);
  };

  root.traverse((node: any) => {
    if (!node?.isMesh || !node.material) return;
    const meta = node.userData?.aurumRhino ?? {};
    if (meta.categoria !== "metal") return;
    audit.metalMeshes++;
    const layerKey = String(meta.layerKey ?? "").trim();
    if (!layerKey) {
      audit.skippedWithoutLayerIdentity++;
      audit.materialInstancesBefore += Array.isArray(node.material) ? node.material.length : 1;
      audit.materialInstancesAfter += Array.isArray(node.material) ? node.material.length : 1;
      return;
    }
    layerKeys.add(layerKey);
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    const consolidated = materials.map((material: THREE.Material) => {
      if (!material?.isMaterial) return material;
      audit.materialInstancesBefore++;
      const key = layerKey + "::" + fingerprint(material);
      const existing = groups.get(key);
      if (existing) {
        if (existing !== material) audit.consolidatedMaterialReferences++;
        return existing;
      }
      groups.set(key, material);
      return material;
    });
    node.material = Array.isArray(node.material) ? consolidated : consolidated[0];
  });

  audit.distinctLayerKeys = layerKeys.size;
  audit.materialInstancesAfter += groups.size;
  return audit;
}

export async function convertAurumToGlb(
  object: THREE.Object3D,
  colorRhinoHex?: (color:any) => string | undefined,
  clasificarCapa?: (capa:string,colorCapa?:string) => "metal" | "gema" | "otro",
  onProgress?: (message: string, completed?: number, total?: number) => void,
) {
  // Preserve the original Rhino layer table and each mesh's own source
  // attributes as explicit GLB extras. Do not rely on traversal order or on
  // reconstructed metadata after GLTFExporter/GLTFLoader round-tripping.
  const sourceLayers = Array.isArray((object as any)?.userData?.layers)
    ? (object as any).userData.layers
    : Array.isArray((object as any)?.userData?.rhinoLayers)
      ? (object as any).userData.rhinoLayers : [];
  (object as any).userData = {
    ...((object as any).userData ?? {}),
    aurumRhinoSourceLayers: sourceLayers.map((layer:any,index:number) => ({
      index,
      id: layer?.id ?? layer?.Id ?? null,
      name: layer?.name ?? layer?.Name ?? null,
      color: layer?.color ?? layer?.Color ?? null,
      parentLayerId: layer?.parentLayerId ?? layer?.parentId ?? layer?.ParentLayerId ?? null,
    })),
  };
  object.traverse((x:any) => {
    if (!x?.isMesh) return;
    const attrs = x.userData?.attributes ?? {};
    const rawIndex = attrs.layerIndex ?? attrs.LayerIndex ?? x.userData?.layerIndex ?? x.userData?.LayerIndex;
    const index = rawIndex !== null && rawIndex !== undefined && rawIndex !== "" && Number.isInteger(Number(rawIndex)) && Number(rawIndex) >= 0
      ? Number(rawIndex) : null;
    const sourceLayer = index !== null ? sourceLayers[index] : null;
    x.userData = {
      ...(x.userData ?? {}),
      aurumRhinoSource: {
        layerIndex: index,
        layerId: sourceLayer?.id ?? sourceLayer?.Id ?? attrs.layerId ?? attrs.LayerId ?? x.userData?.layerId ?? x.userData?.LayerId ?? null,
        layerName: sourceLayer?.name ?? sourceLayer?.Name ?? attrs.layerName ?? attrs.LayerName ?? x.userData?.layerName ?? x.userData?.LayerName ?? null,
        layerColor: sourceLayer?.color ?? sourceLayer?.Color ?? attrs.layerColor ?? attrs.LayerColor ?? null,
        materialIndex: attrs.materialIndex ?? attrs.MaterialIndex ?? null,
        objectId: attrs.id ?? attrs.Id ?? null,
        objectName: x.name ?? null,
        rawLayerIndex: rawIndex ?? null,
        rawLayerName: attrs.layerName ?? attrs.LayerName ?? null,
        rawLayerId: attrs.layerId ?? attrs.LayerId ?? null,
      },
    };
  });
  if (colorRhinoHex && clasificarCapa) {
    const parts = getAurumModelParts(object, colorRhinoHex, clasificarCapa);
    const byId = new Map<string, any>();
    parts.filter((part:any) => part.tipo === "malla").forEach((part:any) => byId.set(part.id, part));
    object.traverse((x:any) => {
      if (!x.isMesh) return;
      const part:any = byId.get(x.uuid);
      if (!part) return;
      x.userData = {
        ...(x.userData ?? {}),
        aurumRhino: {
          ...(x.userData?.aurumRhino ?? {}),
          capa: part.capa,
          colorCapa: part.colorCapa,
          categoria: part.categoria,
          layerIndex: part.layerIndex ?? -1,
          rhinoLayerId: part.layerId ?? x.userData?.aurumRhino?.rhinoLayerId ?? null,
          matrixSlot: part.matrixSlot,
          layerKey: part.layerKey,
        },
      };
    });
  }
  enforceRhinoLayerVisibilityBeforeExport(object);
  onProgress?.("Preparando geometría y normales");
  await preprocessAurumModel(object, onProgress);
  onProgress?.("Consolidando materiales");
  const materialConsolidation = consolidateAurumMetalMaterialsByLayer(object);
  console.info("[AURUM][METAL MATERIAL CONSOLIDATION]", materialConsolidation);

  // Consolidate compatible overlapping metal bodies in the derived GLB
  // after Rhino classification and material consolidation. The 3DM source
  // geometry is never written back; gem and non-metal meshes are excluded by
  // the union pass. A failed CSG operation leaves its source meshes visible.
  try {
    onProgress?.("Analizando uniones metálicas");
    const unionResult = await applyAurumMetalUnionExperiment(object, (message, completed, total) => onProgress?.(message, completed, total));
    console.info("[AURUM][METAL UNION]", unionResult);
  } catch (error) {
    console.warn("[AURUM][METAL UNION] Failed safely; keeping source meshes", error);
  }
  onProgress?.("Generando archivo 3D interno");
  const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(object, (result: ArrayBuffer | { [key: string]: unknown }) => {
      if (result instanceof ArrayBuffer) resolve(result);
      else reject(new Error("No se pudo generar el GLB interno."));
    }, (error: unknown) => reject(error), { binary: true, onlyVisible: true, trs: false });
  });
}
