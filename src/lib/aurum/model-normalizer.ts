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
        .map(p=>({nombre:p.nombre,capa:p.capa,colorCapa:p.colorCapa,categoria:p.categoria}))
    : [];

  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  const interno = (await new GLTFLoader().parseAsync(glb,"")).scene;

  if (metadataCapas.length) {
    let i = 0;
    interno.traverse((x:any) => {
      if (!x.isMesh) return;
      const meta = metadataCapas[i++];
      if (!meta) return;
      x.userData = {...x.userData, aurumRhino: meta};
    });
  }
  return interno;
}
