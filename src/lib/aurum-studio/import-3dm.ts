import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { parseAurumInput, preprocessAurumModel } from "@/lib/aurum/model-loader";

export type AurumStudioImportProgress = (message: string) => void;

/**
 * Convert a Rhino 3DM into an in-memory GLB for AURUM STUDIO.
 *
 * Reuses AURUM RENDER's existing Rhino parser and geometry preparation without
 * creating or sharing its renderer, scene, camera, materials, shaders or WebGL
 * context. The original 3DM stays local and is never uploaded by this adapter.
 */
export async function prepareAurumStudio3dm(
  file: File,
  onProgress?: AurumStudioImportProgress,
): Promise<Blob> {
  if (!/\.3dm$/i.test(file.name)) {
    throw new Error("Selecciona un archivo Rhino .3dm.");
  }

  const fallbackMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xdfe3e7,
    metalness: 1,
    roughness: 0.12,
  });
  let model: THREE.Object3D | null = null;

  try {
    onProgress?.("Leyendo archivo Rhino 3DM…");
    model = await parseAurumInput(file, "3dm", fallbackMaterial);
    if (!model) throw new Error("Rhino no devolvió geometría para procesar.");

    // Match the established AURUM RENDER Rhino Z-up to Three.js Y-up convention.
    model.rotation.x = -Math.PI / 2;
    model.updateMatrixWorld(true);

    onProgress?.("Preparando mallas, normales y capas…");
    await preprocessAurumModel(model, (message) => onProgress?.(message));
    model.updateMatrixWorld(true);

    onProgress?.("Generando GLB temporal para AURUM STUDIO…");
    const exporter = new GLTFExporter();
    const glb = await new Promise<ArrayBuffer>((resolve, reject) => {
      exporter.parse(
        model!,
        (result) => {
          if (result instanceof ArrayBuffer) resolve(result);
          else reject(new Error("El exportador no generó un GLB binario."));
        },
        (error) => reject(error),
        { binary: true, onlyVisible: true, trs: false },
      );
    });

    return new Blob([glb], { type: "model/gltf-binary" });
  } finally {
    // The exported GLB owns the geometry data now; release the temporary Rhino
    // object so repeated imports do not retain CPU-side CAD buffers.
    model?.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      materials.forEach((material) => material.dispose());
    });
    fallbackMaterial.dispose();
  }
}
