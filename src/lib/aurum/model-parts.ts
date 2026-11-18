import { resolveAurumMeshLayerContext } from "./mesh-layer-context";

export type AurumModelPart = {
  id: string;
  nombre: string;
  tipo: "grupo" | "malla";
  nivel: number;
  capa?: string;
  colorCapa?: string;
  categoria: "metal" | "gema" | "otro";
  matrixSlot?: number;
  layerIndex?: number;
  layerId?: string | number;
  layerKey?: string;
  /** Stable Rhino source identity; id remains the Three.js UUID for selection compatibility. */
  sourceId?: string;
};

function matrixLayerSlot(layer:any, index:number, category:"metal"|"gema"|"otro", colorCapa?:string):number|undefined {
  if (category==="otro" || index<0) return undefined;
  const name=String(layer?.name ?? "").trim().toLowerCase();
  const explicit=name.match(/(?:metal|gema|gem|piedra|stone)[\s_-]*(0?[1-4])\b/);
  if (explicit) return Number(explicit[1]);

  // Recognize zero-padded Rhino names such as Capa Metal 01 through 04.
  // Do not infer slot order from layer index or RGB without exact template rules.
  void colorCapa;
  return undefined;
}

export function getAurumModelParts(
  object: any,
  colorRhinoHex: (color: any) => string | undefined,
  clasificarCapa: (capa: string, colorCapa?: string) => "metal" | "gema" | "otro"
): AurumModelPart[] {
  const result: AurumModelPart[] = [];
  object.traverse((x: any) => {
    if (x === object) return;
    const isMesh = !!x.isMesh;
    const hasChildren = Array.isArray(x.children) && x.children.length > 0;
    if (!isMesh && !hasChildren) return;

    const context=resolveAurumMeshLayerContext(x,object);
    const attrs=x.userData?.attributes||{};
    const sourceMeta=context.source;
    const sourceId=sourceMeta.objectId??attrs.id??attrs.Id??x.userData?.objectId??x.userData?.ObjectId;
    const sourceName=sourceMeta.objectName??attrs.name??attrs.Name??x.userData?.objectName??x.userData?.ObjectName;
    const nombre=typeof x.name==="string"&&x.name.trim()
      ? x.name.trim()
      : (typeof sourceName==="string"&&sourceName.trim()
        ? sourceName.trim()
        : (sourceId?`${isMesh ? "Objeto" : "Grupo"} ${String(sourceId).slice(0,8)}` : (isMesh?"Malla":"Componente")));
    const layerIndex=context.layerIndex??-1;
    const capa=context.layerName||undefined;
    const colorCapa=colorRhinoHex(context.layerColor)||undefined;
    const layerId=context.layerId;
    const categoria=context.category;
    const matrixSlot=Number.isFinite(Number(context.metadata?.matrixSlot))
      ? Number(context.metadata.matrixSlot)
      : (layerIndex>=0&&context.layer?matrixLayerSlot(context.layer,layerIndex,categoria,colorCapa):undefined);
    const layerKey=context.layerKey;
    const nivel = Math.min(2, Math.max(0, x.parent && x.parent !== object ? 1 : 0));
    result.push({ id: x.uuid, nombre, tipo: isMesh ? "malla" : "grupo", nivel, ...(sourceId != null ? { sourceId: String(sourceId) } : {}), ...(capa ? { capa } : {}), ...(colorCapa ? { colorCapa } : {}), categoria, layerIndex, ...(layerId != null ? { layerId } : {}), ...(layerKey ? { layerKey } : {}), ...(matrixSlot !== undefined ? { matrixSlot } : {}) });
  });

  return result;
}
