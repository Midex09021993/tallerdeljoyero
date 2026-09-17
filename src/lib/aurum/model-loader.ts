import * as THREE from "three";

/**
 * Preprocesado seguro del modelo antes de convertirlo al GLB interno.
 *
 * El CAD de joyería es una fuente de fabricación, no un activo de render.
 * Esta etapa limpia únicamente elementos que no son geometría de producto,
 * valida la malla y genera un diagnóstico interno para el pipeline.
 * No modifica cortes, escala, topología ni normales authored del CAD.
 */
export function preprocessAurumModel(object: THREE.Object3D) {
  object.updateMatrixWorld(true);

  let meshes = 0;
  let triangles = 0;
  let normalsBuilt = 0;
  let lineObjectsRemoved = 0;
  let pointObjectsRemoved = 0;
  let meshesWithoutNormals = 0;
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
    // iJewel explicitly hides Rhino line/point meshes because they are often
    // construction helpers rather than part of the jewelry product.
    if (x !== object && (x.isLine || x.isLineSegments || x.isPoints)) {
      removeQueue.push(x);
      if (x.isPoints) pointObjectsRemoved++;
      else lineObjectsRemoved++;
      return;
    }

    if (!x.isMesh || !x.geometry) return;
    meshes++;

    const geometry = x.geometry as THREE.BufferGeometry;
    geometryRefs.set(geometry, (geometryRefs.get(geometry) ?? 0) + 1);

    const position = geometry.getAttribute("position");
    if (!position || position.count < 3) return;

    const index = geometry.getIndex();
    triangles += index ? Math.floor(index.count / 3) : Math.floor(position.count / 3);

    // Never overwrite authored CAD normals. When they are missing, generate
    // a safe baseline so PBR lighting has valid surface directions. Gemstones
    // are flagged separately because their final treatment should preserve
    // facet/face normals rather than smooth them indiscriminately.
    const normal = geometry.getAttribute("normal");
    const generated = !normal || normal.count !== position.count;
    if (generated) {
      meshesWithoutNormals++;
      geometry.computeVertexNormals();
      normalsBuilt++;
      if (likelyGem(x)) x.userData = {...x.userData, aurumNeedsFacetNormals:true};
    } else {
      geometry.normalizeNormals();
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
      version: 2,
      meshes,
      triangles,
      normalsBuilt,
      meshesWithoutNormals,
      lineObjectsRemoved,
      pointObjectsRemoved,
      repeatedGeometryRefs,
      preserveAuthoredNormals: true,
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
