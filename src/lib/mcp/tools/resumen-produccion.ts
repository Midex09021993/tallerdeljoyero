import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

function hoyLima(): string {
  // Lima es UTC−5 sin horario de verano.
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

export default defineTool({
  name: "resumen_produccion",
  title: "Resumen de producción",
  description: "Cuenta los pedidos activos por estado y por área de producción, e indica cuántos están atrasados.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("No autenticado.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("pedidos")
      .select("estado, area_actual, fecha_entrega")
      .neq("estado", "Entregado")
      .limit(2000);
    if (error) throw new ToolError(`No se pudo leer la producción: ${error.message}`);
    const hoy = hoyLima();
    const porEstado: Record<string, number> = {};
    const porArea: Record<string, number> = {};
    let atrasados = 0;
    for (const p of data ?? []) {
      porEstado[p.estado] = (porEstado[p.estado] ?? 0) + 1;
      if (p.estado === "En Producción") {
        const area = p.area_actual || "Sin área";
        porArea[area] = (porArea[area] ?? 0) + 1;
      }
      if (p.fecha_entrega && p.fecha_entrega.slice(0, 10) < hoy) atrasados += 1;
    }
    const activos = data?.length ?? 0;
    const texto = [
      `Pedidos activos: ${activos} · Atrasados: ${atrasados}`,
      `Por estado: ${Object.entries(porEstado).map(([k, v]) => `${k} ${v}`).join(", ") || "—"}`,
      `En producción por área: ${Object.entries(porArea).map(([k, v]) => `${k} ${v}`).join(", ") || "—"}`,
    ].join("\n");
    return { content: [{ type: "text", text: texto }], structuredContent: { activos, atrasados, por_estado: porEstado, por_area: porArea, fecha: hoy } };
  },
});
