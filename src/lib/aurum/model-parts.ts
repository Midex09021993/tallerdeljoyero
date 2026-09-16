export type AurumModelPart = {
  id: string;
  nombre: string;
  tipo: "grupo" | "malla";
  nivel: number;
  capa?: string;
  colorCapa?: string;
  categoria: "metal" | "gema" | "otro";
};

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
    const categoria = meta?.categoria ?? clasificarCapa(capa || "", colorCapa);
    const nivel = Math.min(2, Math.max(0, x.parent && x.parent !== object ? 1 : 0));

    result.push({ id: x.uuid, nombre, tipo: isMesh ? "malla" : "grupo", nivel, capa, colorCapa, categoria });
  });

  return result;
}
