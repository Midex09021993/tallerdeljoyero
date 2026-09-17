import * as THREE from "three";

/**
 * Detecta normales CAD que existen pero no son coherentes con la geometría.
 *
 * No reemplaza normales authored por defecto. Solo considera sospechosa una
 * malla cuando una proporción significativa de sus normales apunta en una
 * dirección incompatible con las caras que comparten ese vértice.
 */
function inspectMeshNormals(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  if (!position || !normal || normal.count !== position.count) {
    return { valid: false, suspiciousRatio: 1, vertices: position?.count ?? 0 };
  }

  const accumulated = new Float32Array(position.count * 3);
  const index = geometry.getIndex();
  const addFace = (ia: number, ib: number, ic: number) => {
    const ax = position.getX(ia), ay = position.getY(ia), az = position.getZ(ia);
    const bx = position.getX(ib), by = position.getY(ib), bz = position.getZ(ib);
    const cx = position.getX(ic), cy = position.getY(ic), cz = position.getZ(ic);
    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const acx = cx - ax, acy = cy - ay, acz = cz - az;
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    const len = Math.hypot(nx, ny, nz);
    if (!Number.isFinite(len) || len < 1e-12) return;
    accumulated[ia * 3] += nx;
    accumulated[ia * 3 + 1] += ny;
    accumulated[ia * 3 + 2] += nz;
    accumulated[ib * 3] += nx;
    accumulated[ib * 3 + 1] += ny;
    accumulated[ib * 3 + 2] += nz;
    accumulated[ic * 3] += nx;
    accumulated[ic * 3 + 1] += ny;
    accumulated[ic * 3 + 2] += nz;
  };

  if (index) {
    for (let i = 0; i + 2 < index.count; i += 3) {
      addFace(index.getX(i), index.getX(i + 1), index.getX(i + 2));
    }
  } else {
    for (let i = 0; i + 2 < position.count; i += 3) addFace(i, i + 1, i + 2);
  }

  let comparable = 0;
  let suspicious = 0;
  for (let i = 0; i < position.count; i++) {
    const ax = accumulated[i * 3];
    const ay = accumulated[i * 3 + 1];
    const az = accumulated[i * 3 + 2];
    const al = Math.hypot(ax, ay, az);
    const nx = normal.getX(i);
    const ny = normal.getY(i);
    const nz = normal.getZ(i);
    const nl = Math.hypot(nx, ny, nz);
    if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(nz) || !Number.isFinite(nl) || nl < 1e-8) {
      suspicious++;
      comparable++;
      continue;
    }
    if (al < 1e-10) continue;
    const dot = (nx * ax + ny * ay + nz * az) / (nl * al);
    comparable++;
    if (!Number.isFinite(dot) || dot < 0.15) suspicious++;
  }

  return {
    valid: true,
    suspiciousRatio: comparable ? suspicious / comparable : 0,
    vertices: position.count,
  };
}

/**
 * Preprocesado seguro del modelo antes de convertirlo al GLB interno.
 *
 * El CAD de joyería es una fuente de fabricación, no un activo de render.
 * Esta etapa limpia únicamente elementos que no son geometría de producto,
 * valida la malla y corrige únicamente normales claramente inconsistentes.
 * No modifica cortes, escala ni topología.
 */
export function preprocessAurumModel(object: THREE.Object3D) {
  object.updateMatrixWorld(true);

  let meshes = 0;
  let triangles = 0;
  let normalsBuilt = 0;
  let normalsRepaired = 0;
  let lineObjectsRemoved = 0;
  let pointObjectsRemoved = 0;
  let meshesWithoutNormals = 0;
  let meshesWithSuspiciousNormals = 0;
  let repeatedGeometryRefs = 0;
  const geometryRefs = new Map<any, number>();

  const likelyGem = (x:any) => {
    const text = [
      x?.name,
      x?.userData?.aurumRhino?.capa,
      x?.userData?.attributes?.layerName,
    ].map((v:any) => String(v ?? "").toLowerCase()).join(" ");
    return /(gem|gema|piedra|diamond|diamante|zafiro|sapphire|rubi|rubí|ruby|esmeralda|emerald|moissanita|citrino|amatista|topacio)/.test(text);
  };

  const removeQueue:any[] = [];
  object.traverse((x:any) => {
    if (x !== object && (x.isLine || x.isLineSegments || x.isPoints)) {
      removeQueue.push(x);
      if (x.isPoints) pointObjectsRemoved++;
      else lineObjectsRemoved++;
      return;
    }

    if (!x.isMesh || !x.geometry) return;
    meshes++;

    let geometry = x.geometry as THREE.BufferGeometry;
    geometryRefs.set(geometry, (geometryRefs.get(geometry) ?? 0) + 1);

    const position = geometry.getAttribute("position");
    if (!position || position.count < 3) return;

    const index = geometry.getIndex();
    triangles += index ? Math.floor(index.count / 3) : Math.floor(position.count / 3);

    const normal = geometry.getAttribute("normal");
    const generated = !normal || normal.count !== position.count;
    if (generated) {
      meshesWithoutNormals++;
      geometry.computeVertexNormals();
      normalsBuilt++;
      if (likelyGem(x)) x.userData = {...x.userData, aurumNeedsFacetNormals:true};
    } else {
      const inspection = inspectMeshNormals(geometry);
      if (!inspection.valid || inspection.suspiciousRatio >= 0.12) {
        // Clone before repair because Rhino can reuse one geometry object in
        // several parts. This keeps the correction local to the bad mesh.
        geometry = geometry.clone();
        geometry.computeVertexNormals();
        x.geometry = geometry;
        normalsRepaired++;
        meshesWithSuspiciousNormals++;
        x.userData = {
          ...x.userData,
          aurumNormalsRepaired: true,
          aurumNormalRepairRatio: Number(inspection.suspiciousRatio.toFixed(3)),
        };
      } else {
        geometry.normalizeNormals();
      }
    }

    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    x.castShadow = true;
    x.receiveShadow = true;
    x.userData = {
      ...x.userData,
      aurumPreprocessed: true,
      aurumNormalsGenerated: generated,
    };
  });

  removeQueue.forEach((x:any) => {
    x.parent?.remove(x);
  });

  geometryRefs.forEach((count) => {
    if (count > 1) repeatedGeometryRefs += count;
  });

  object.updateMatrixWorld(true);
  object.userData = {
    ...object.userData,
    aurumPreprocess: {
      version: 3,
      meshes,
      triangles,
      normalsBuilt,
      normalsRepaired,
      meshesWithoutNormals,
      meshesWithSuspiciousNormals,
      lineObjectsRemoved,
      pointObjectsRemoved,
      repeatedGeometryRefs,
      preserveAuthoredNormals: true,
      repairThreshold: 0.12,
      facetNormalsRequiredForGems: true,
      renderReadyChecks: {
        constructionLinesRemoved: lineObjectsRemoved > 0,
        constructionPointsRemoved: pointObjectsRemoved > 0,
        normalsAvailable: meshesWithoutNormals === 0,
        geometryStatsAvailable: true,
      },
    },
  };

  return object;
}

export async function parseAurumInput(file: File, ext: string, fallbackMaterial: THREE.Material) {
  const buffer = await file.arrayBuffer();

  if (ext === "stl") {
    const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
    const geo = new STLLoader().parse(buffer);
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, fallbackMaterial);
  }

  if (ext === "obj") {
    const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
    return new OBJLoader().parse(new TextDecoder().decode(buffer));
  }

  if (ext === "fbx") {
    const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
    return new FBXLoader().parse(buffer, "");
  }

  if (ext === "glb") {
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
    return (await new GLTFLoader().parseAsync(buffer, "")).scene;
  }

  if (ext === "3dm") {
    const { Rhino3dmLoader } = await import("three/examples/jsm/loaders/3DMLoader.js");
    const loader = new Rhino3dmLoader();
    loader.setLibraryPath("https://cdn.jsdelivr.net/npm/rhino3dm@8.32.2/");
    loader.setWorkerLimit(2);
    return await new Promise<any>((resolve, reject) => {
      loader.parse(buffer, resolve, reject);
    });
  }

  throw new Error("Formato no compatible.");
}

export function convertAurumToGlb(object: THREE.Object3D) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    preprocessAurumModel(object);

    import("three/examples/jsm/exporters/GLTFExporter.js").then(({ GLTFExporter }) => {
      const exporter = new GLTFExporter();
      exporter.parse(
        object,
        (result: ArrayBuffer | { [key: string]: unknown }) => {
          if (result instanceof ArrayBuffer) resolve(result);
          else reject(new Error("No se pudo generar el GLB interno."));
        },
        (error: unknown) => reject(error),
        { binary: true, onlyVisible: true, trs: false }
      );
    }).catch(reject);
  });
}
