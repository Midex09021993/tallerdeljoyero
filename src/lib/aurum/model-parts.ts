import { resolveAurumLayerKey } from "./layer-identity";

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

function matrixLayerSlot(layer:any, index:number, category:"metal"|"gema"|"otro"):number|undefined {
  if (category==="otro" || index<0) return undefined;
  const name=String(layer?.name ?? "").trim().toLowerCase();
  const explicit=name.match(/(?:metal|gema|gem|piedra|stone)[\s_-]*([1-4])\b/);
  if (explicit) return Number(explicit[1]);

  // Slots must come from an explicit layer name; raw layer indices are not
  // stable across Rhino documents and must never cause cross-layer material edits.
  return undefined;
}

export function getAurumModelParts(
  object: any,
  colorRhinoHex: (color: any) => string | undefined,
  clasificarCapa: (capa: string, colorCapa?: string) => "metal" | "gema" | "otro"
): AurumModelPart[] {
  const result: AurumModelPart[] = [];
  const layers = Array.isArray(object?.userData?.layers) ? object.userData.layers : [];

  object.traverse((x: any) => {
    if (x === object) return;
    const isMesh = !!x.isMesh;
    const hasChildren = Array.isArray(x.children) && x.children.length > 0;
    if (!isMesh && !hasChildren) return;

    const nombre = typeof x.name === "string" && x.name.trim()
      ? x.name.trim()
      : (isMesh ? "Malla" : "Componente");

    const attrs = x.userData?.attributes || {};
    const meta = x.userData?.aurumRhino;
    // Resolve the first VALID index instead of trusting a non-null sentinel
    // such as -1 from partially hydrated GLB extras.
    const indexCandidates=[meta?.layerIndex,attrs.layerIndex,attrs.LayerIndex,x.userData?.layerIndex,x.userData?.LayerIndex];
    const layerIndex=indexCandidates.map((value:any)=>value===null||value===undefined||value===""?-1:Number(value))
      .find((value:number)=>Number.isInteger(value)&&value>=0)??-1;
    const layer = layerIndex >= 0 ? layers[layerIndex] : undefined;
    const capa = String(meta?.capa||layer?.name||attrs.layerName||attrs.LayerName||x.userData?.layerName||"").trim()||undefined;
    const colorCapa = meta?.colorCapa||colorRhinoHex(layer?.color)||colorRhinoHex(attrs.layerColor??attrs.LayerColor);
    const layerId = meta?.rhinoLayerId ?? attrs.layerId ?? attrs.LayerId ?? x.userData?.layerId ?? x.userData?.LayerId ?? layer?.id ?? layer?.Id;
    const hasLayerClassification=Boolean(layer||capa||colorCapa);
    const categoria = hasLayerClassification
      ? (layer ? matrixFamilyCategory(layer,layerIndex,colorCapa,clasificarCapa) : clasificarCapa(capa||"",colorCapa))
      : (meta?.categoria==="metal"||meta?.categoria==="gema" ? meta.categoria : "otro");
    const nivel = Math.min(2, Math.max(0, x.parent && x.parent !== object ? 1 : 0));
    const matrixSlot = Number.isFinite(Number(meta?.matrixSlot))
      ? Number(meta.matrixSlot)
      : (layerIndex>=0 && layer ? matrixLayerSlot(layer,layerIndex,categoria) : undefined);

    const layerKey=resolveAurumLayerKey({layerId,layerIndex,layerName:capa,layerColor:colorCapa,category:categoria,existingKey:meta?.layerKey});
    result.push({ id: x.uuid, nombre, tipo: isMesh ? "malla" : "grupo", nivel, capa, colorCapa, categoria, layerIndex, ...(layerId != null ? { layerId } : {}), ...(layerKey ? { layerKey } : {}), ...(matrixSlot !== undefined ? { matrixSlot } : {}) });
  });

  return result;
}
