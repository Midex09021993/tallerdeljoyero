import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { ESTADOS_PEDIDO, supabaseForUser, textoBusqueda } from "../supabase";

export default defineTool({
  name: "listar_pedidos",
  title: "Listar pedidos",
  description: "Busca pedidos por número de referencia, nombre del cliente, nombre de pieza o descripción del trabajo. Usa busqueda para el número o nombre que indique el usuario. Devuelve referencia y cliente para identificar el resultado. Por defecto excluye entregados; usa incluir_entregados=true si piden buscar en todo el historial o no aparece el pedido entre los activos.",
  inputSchema: {
    estado: z.enum(ESTADOS_PEDIDO).optional().describe("Filtra por estado oficial del pedido."),
    busqueda: z.string().min(1).max(80).optional().describe("Número completo o parcial de referencia, nombre completo o parcial del cliente, pieza o trabajo. Ejemplos: SI-001, 001, Juan Pérez."),
    incluir_entregados: z.boolean().optional().describe("Incluye pedidos ya entregados (histórico). Por defecto false."),
    limite: z.number().int().min(1).max(100).optional().describe("Máximo de pedidos a devolver (1-100, por defecto 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ estado, busqueda, incluir_entregados, limite }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("No autenticado.");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("pedidos")
      .select("id, referencia, cliente, pieza, trabajo, estado, area_actual, material, cantidad_piezas, contrato, fecha_ingreso, fecha_entrega, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limite ?? 25);
    if (estado) query = query.eq("estado", estado);
    else if (!incluir_entregados) query = query.neq("estado", "Entregado");
    const q = textoBusqueda(busqueda);
    if (q) query = query.or(`referencia.ilike.*${q}*,cliente.ilike.*${q}*,pieza.ilike.*${q}*,trabajo.ilike.*${q}*`);
    const { data, error } = await query;
    if (error) throw new ToolError(`No se pudieron leer los pedidos: ${error.message}`);
    const pedidos = (data ?? []).map((p) => ({
      id: p.id,
      referencia: p.referencia,
      cliente: p.cliente,
      pieza: p.pieza,
      trabajo: p.trabajo,
      estado: p.estado,
      area_produccion: p.estado === "En Producción" ? p.area_actual : null,
      material: p.material,
      cantidad_piezas: p.cantidad_piezas,
      contrato: p.contrato,
      fecha_ingreso: p.fecha_ingreso,
      fecha_entrega: p.fecha_entrega,
      actualizado: p.updated_at,
    }));
    const texto = pedidos.length === 0
      ? "No hay pedidos que coincidan."
      : pedidos.map((p) => `${p.referencia} · ${p.cliente || "Sin cliente"} · ${p.estado}${p.area_produccion ? ` (${p.area_produccion})` : ""} · entrega ${p.fecha_entrega ?? "sin fecha"} · id ${p.id}`).join("\n");
    return { content: [{ type: "text", text: texto }], structuredContent: { pedidos } };
  },
});
