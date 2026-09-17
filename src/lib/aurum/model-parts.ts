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
};

function explicitLayerCategory(name:string): "metal" | "gema" | "otro" | undefined {
  const n=String(name||"").trim().toLowerCase();
  if (/(metal|oro|gold|plata|silver|platino|platinum|met[aá]lico)/.test(n)) return "metal";
  if (/(gema|gem|piedra|stone|diamante|diamond|zafiro|sapphire|rubi|rub[ií]|esmeralda|emerald|moissanita|moissanite)/.test(n)) return "gema";
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

  // Backward-compatible fallback for unnamed/legacy MatrixGold files:
  // first four slots are metals, next four are gems, later layers are other.
  if(index>=0 && index<4) return "metal";
  if(index>=4 && index<8) return "gema";
  return "otro";
}

function matrixLayerSlot(layer:any, index:number, category:"metal"|"gema"|"otro"):number|undefined {
  if (category==="otro" || index<0) return undefined;
  const name=String(layer?.name ?? "").trim().toLowerCase();
  const explicit=name.match(/(?:metal|gema|gem|piedra|stone)[\s_-]*([1-4])\b/);
  if (explicit) return Number(explicit[1]);

  // Positional slot is only a fallback when the layer name does not encode it.
  if(category==="metal" && index<4) return index+1;
  if(category==="gema" && index>=4 && index<8) return index-3;
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
    const layerIndex = Number.isInteger(attrs.layerIndex) ? attrs.layerIndex : -1;
    const layer = layerIndex >= 0 ? layers[layerIndex] : undefined;
    const capa = meta?.capa ?? (layer?.name ? String(layer.name) : undefined);
    const colorCapa = meta?.colorCapa ?? colorRhinoHex(layer?.color);
    const categoria = meta?.categoria ?? (layer
      ? matrixFamilyCategory(layer,layerIndex,colorCapa,clasificarCapa)
      : clasificarCapa(capa || "",colorCapa));
    const nivel = Math.min(2, Math.max(0, x.parent && x.parent !== object ? 1 : 0));
    const matrixSlot = layerIndex>=0 && layer
      ? matrixLayerSlot(layer,layerIndex,categoria)
      : undefined;

    result.push({ id: x.uuid, nombre, tipo: isMesh ? "malla" : "grupo", nivel, capa, colorCapa, categoria, matrixSlot, layerIndex });
  });

  return result;
}
