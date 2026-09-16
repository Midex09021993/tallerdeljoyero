import * as THREE from "three";

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
