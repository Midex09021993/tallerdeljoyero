import { resolveAurumLayerKey } from "./layer-identity";
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

function explicitLayerCategory(name:string): "metal" | "gema" | "otro" | undefined {
  const n=String(name||"").trim().toLowerCase();
  if (/(metal|oro|gold|plata|silver|platino|platinum|met[aá]lico|^head[s]?\b)/.test(n)) return "metal";
  if (/(gema|gem|piedra|stone|diamante|diamond|zafiro|sapphire|rubi|rub[ií]|ruby|esmeralda|emerald|moissanita|moissanite|citrino|amatista|topacio)/.test(n)) return "gema";
  return undefined;
}

function matrixFamilyCategory(layer:any,index:number,colorCapa:string|undefined,clasificarCapa:(capa:string,colorCapa?:string)=>"metal"|"gema"|"otro"):"metal"|"gema"|"otro" {
  const name=String(layer?.name??"").trim();

  // Rhino/iJewel-compatible rule: an explicit layer name is authoritative.
  // The layer itself defines which material family it represents. Positional
  // MatrixGold conventions are only a fallback for files whose layers carry
  // no recognizable material name.
  const explicit=explicitLayerCategory(name);
  if(explicit) return explicit;

  const classified=clasificarCapa(name,colorCapa);
  if(classified!=="otro") return classified;

  // Never infer a material family from traversal/layer position alone.
  // If name and color are unavailable, keep the part neutral instead of
  // assigning the wrong metal/gem to an unrelated layer.
  return "otro";
}

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
  const rootData = object?.userData ?? {};
  // Use the same source-layer manifest in both classification and post-GLB
  // hydration. This is the exact table captured before GLTFExporter runs.
  const sourceLayerManifest = Array.isArray(rootData.aurumRhinoSourceLayers) && rootData.aurumRhinoSourceLayers.length
    ? rootData.aurumRhinoSourceLayers
    : Array.isArray(rootData.layers) ? rootData.layers
    : Array.isArray(rootData.rhinoLayers) ? rootData.rhinoLayers : [];
  const layers = sourceLayerManifest;

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
    const matrixSlot = Number.isFinite(Number(meta?.matrixSlot))
      ? Number(meta.matrixSlot)
      : (layerIndex>=0 && layer ? matrixLayerSlot(layer,layerIndex,categoria,colorCapa) : undefined);

    const layerKey=resolveAurumLayerKey({layerId,layerIndex,layerName:capa,layerColor:colorCapa,category:categoria,existingKey:meta?.layerKey});
    result.push({ id: x.uuid, nombre, tipo: isMesh ? "malla" : "grupo", nivel, ...(sourceId != null ? { sourceId: String(sourceId) } : {}), ...(capa ? { capa } : {}), ...(colorCapa ? { colorCapa } : {}), categoria, layerIndex, ...(layerId != null ? { layerId } : {}), ...(layerKey ? { layerKey } : {}), ...(matrixSlot !== undefined ? { matrixSlot } : {}) });
  });

  return result;
}
