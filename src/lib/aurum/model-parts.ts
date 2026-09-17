export type AurumModelPart = {
  id: string;
  nombre: string;
  tipo: "grupo" | "malla";
  nivel: number;
  capa?: string;
  colorCapa?: string;
  categoria: "metal" | "gema" | "otro";
  matrixSlot?: number;
};

function explicitLayerCategory(name:string): "metal" | "gema" | "otro" | undefined {
  const n=String(name||"").trim().toLowerCase();
  if (/(metal|oro|gold|plata|silver|platino|platinum|met[aá]lico)/.test(n)) return "metal";
  if (/(gema|gem|piedra|stone|diamante|diamond|zafiro|sapphire|rubi|rub[ií]|esmeralda|emerald|moissanita|moissanite)/.test(n)) return "gema";
  return undefined;
}

function matrixFamilyCategory(layer:any,index:number,clasificarCapa:(capa:string,colorCapa?:string)=>"metal"|"gema"|"otro",colorRhinoHex:(color:any)=>string|undefined):"metal"|"gema"|"otro" {
  const name=String(layer?.name??"").trim();
  const explicit=explicitLayerCategory(name);
  if(explicit) return explicit;

  // MatrixGold convention used by AURUM: first four green layers are metal,
  // next four blue layers are gemstones. Everything after those families is
  // intentionally "other" and must never be auto-promoted to a gemstone.
  if(index>=0 && index<4) return "metal";
  if(index>=4 && index<8) return "gema";

  // For files that do not follow the MatrixGold ordering, retain semantic
  // classification by name/color only after the reserved first eight layers.
  return clasificarCapa(name,colorRhinoHex(layer?.color));
}

function matrixLayerSlot(layer:any, index:number, category:"metal"|"gema"|"otro", colorRhinoHex:(color:any)=>string|undefined):number|undefined {
  if (category==="otro" || index<0) return undefined;
  const name=String(layer?.name ?? "").trim().toLowerCase();
  const explicit=name.match(/(?:metal|gema|gem|piedra|stone)[\s_-]*([1-4])\b/);
  if (explicit) return Number(explicit[1]);

  // Preserve the physical MatrixGold order: Metal 01-04, then Gem 01-04.
  if(category==="metal" && index<4) return index+1;
  if(category==="gema" && index>=4 && index<8) return index-3;

  const c=colorRhinoHex(layer?.color);
  if (!c) return undefined;
  const m=c.match(/^#([0-9a-f]{6})$/i);
  if (!m) return undefined;
  const n=parseInt(m[1]!,16), r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  const isGreen=category==="metal" && g>r*1.15 && g>b*1.15 && g>90;
  const isBlue=category==="gema" && b>r*1.15 && b>g*1.05 && b>90;
  if (!isGreen && !isBlue) return undefined;
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
      ? matrixFamilyCategory(layer,layerIndex,clasificarCapa,colorRhinoHex)
      : clasificarCapa(capa || "",colorCapa));
    const nivel = Math.min(2, Math.max(0, x.parent && x.parent !== object ? 1 : 0));
    const matrixSlot = layerIndex>=0 && layer
      ? matrixLayerSlot(layer,layerIndex,categoria,colorRhinoHex)
      : undefined;

    result.push({ id: x.uuid, nombre, tipo: isMesh ? "malla" : "grupo", nivel, capa, colorCapa, categoria, matrixSlot });
  });

  return result;
}
