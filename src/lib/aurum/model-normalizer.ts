import * as THREE from "three";
import { getAurumModelParts } from "./model-parts";

export async function normalizeAurumModel(
  object:any,
  glb:ArrayBuffer,
  extension:string,
  colorRhinoHex:(color:any)=>string|undefined,
  clasificarCapa:(capa:string,colorCapa?:string)=> "metal"|"gema"|"otro"
) {
  const metadataCapas = extension === "3dm"
    ? getAurumModelParts(object,colorRhinoHex,clasificarCapa)
        .filter(p=>p.tipo==="malla")
        .map(p=>({nombre:p.nombre,capa:p.capa,colorCapa:p.colorCapa,categoria:p.categoria,matrixSlot:p.matrixSlot}))
    : [];

  // En 3DM conservamos directamente el render mesh producido por
  // Rhino3dmLoader. Esto elimina el round-trip 3DM -> GLB -> GLTFLoader
  // durante el render y permite comparar el shading de la malla Rhino original.
  // iJewel/Threepipe soporta 3DM como formato nativo de entrada y recomienda
  // conservar las render meshes de Rhino para el flujo de joyería.
  if (extension === "3dm") {
    let i = 0;
    object?.traverse?.((x:any) => {
      if (!x.isMesh) return;
      const meta = metadataCapas[i++];
      if (!meta) return;
      x.userData = {...x.userData, aurumRhino: meta};
    });
    object?.updateMatrixWorld?.(true);
    return object;
  }

  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  const interno = (await new GLTFLoader().parseAsync(glb,"")).scene;
  return interno;
}
