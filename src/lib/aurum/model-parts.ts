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


function matrixLayerSlot(layer:any, index:number, category:"metal"|"gema"|"otro", colorRhinoHex:(color:any)=>string|undefined):number|undefined {
  if (category==="otro" || index<0) return undefined;
  const name=String(layer?.name ?? "").trim().toLowerCase();
  const explicit=name.match(/(?:metal|gema|gem|piedra|stone)[\\s_-]*([1-4])\\b/);
  if (explicit) return Number(explicit[1]);
  const c=colorRhinoHex(layer?.color);
  if (!c) return undefined;
  const m=c.match(/^#([0-9a-f]{6})$/i);
  if (!m) return undefined;
  const n=parseInt(m[1]!,16), r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  const isGreen=category==="metal" && g>r*1.15 && g>b*1.15 && g>90;
  const isBlue=category==="gema" && b>r*1.15 && b>g*1.05 && b>90;
  if (!isGreen && !isBlue) return undefined;
  // MatrixGold commonly uses four tones. Higher chroma = the more intense layer.
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  const chroma=max-min;
  const familyLayers = Array.isArray(layer?._aurumFamilyLayers) ? layer._aurumFamilyLayers : [];
  const ranked=familyLayers
    .map((x:any)=>({idx:x.idx,chroma:x.chroma}))
    .sort((a:any,z:any)=>z.chroma-a.chroma);
  const pos=ranked.findIndex((x:any)=>x.idx===index);
  return pos>=0 && pos<4 ? pos+1 : undefined;
}

export function getAurumModelParts(
  object: any,
  colorRhinoHex: (color: any) => string | undefined,
  clasificarCapa: (capa: string, colorCapa?: string) => "metal" | "gema" | "otro"
): AurumModelPart[] {
  const result: AurumModelPart[] = [];
  const layers = Array.isArray(object?.userData?.layers) ? object.userData.layers : [];
  // Pre-rank the first four MatrixGold metal/gem layers by color intensity.
  // This lets two green (or blue) layers map to different materials instead of one.
  const familyRankData = (category:"metal"|"gema") => layers.map((layer:any,idx:number)=>{
    const c=colorRhinoHex(layer?.color); const m=c?.match(/^#([0-9a-f]{6})$/i);
    if(!m) return null;
    const n=parseInt(m[1]!,16), r=(n>>16)&255, g=(n>>8)&255, b=n&255;
    const ok=category==="metal" ? g>r*1.15 && g>b*1.15 && g>90 : b>r*1.15 && b>g*1.05 && b>90;
    return ok ? {idx,chroma:Math.max(r,g,b)-Math.min(r,g,b)} : null;
  }).filter(Boolean).slice(0,4);
  const metalRanks=familyRankData("metal"), gemRanks=familyRankData("gema");
  (layers as any[]).forEach((layer:any,idx:number)=>{ layer._aurumFamilyLayers = idx<4 ? (metalRanks.length>=1 && metalRanks.some((x:any)=>x.idx===idx) ? metalRanks : gemRanks) : []; });

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
    const categoria = meta?.categoria ?? clasificarCapa(capa || "", colorCapa);
    const nivel = Math.min(2, Math.max(0, x.parent && x.parent !== object ? 1 : 0));

    const ranks = categoria==="metal" ? metalRanks : categoria==="gema" ? gemRanks : [];
    const chroma = colorCapa ? (()=>{ const z=parseInt(colorCapa.slice(1),16); return Math.max((z>>16)&255,(z>>8)&255,z&255)-Math.min((z>>16)&255,(z>>8)&255,z&255); })() : -1;
    const matrixSlot = (layerIndex>=0 && ranks.length) ? (()=>{ const pos=ranks.slice().sort((a:any,b:any)=>b.chroma-a.chroma).findIndex((a:any)=>a.idx===layerIndex); return pos>=0&&pos<4?pos+1:undefined; })() : undefined;
    result.push({ id: x.uuid, nombre, tipo: isMesh ? "malla" : "grupo", nivel, capa, colorCapa, categoria, matrixSlot });
  });

  return result;
}
