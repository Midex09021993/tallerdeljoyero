import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "ver_pedido",
  title: "Ver pedido",
  description: "Muestra el detalle de un pedido por su id o su referencia (sin costes ni notas internas).",
  inputSchema: {
    id: z.string().uuid().optional().describe("Id del pedido (devuelto por listar_pedidos)."),
    referencia: z.string().min(1).max(60).optional().describe("Referencia visible del pedido, por ejemplo PED-0001."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, referencia }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("No autenticado.");
    if (!id && !referencia) throw new ToolError("Indica el id o la referencia del pedido.");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("pedidos")
      .select("id, referencia, cliente, pieza, trabajo, estado, area_actual, material, piedras, talla, peso_estimado, cantidad_piezas, ruta, corte_texto, corte_tipografia, corte_ubicacion, corte_observaciones, contrato, fecha_ingreso, fecha_entrega, fecha_listo_entrega, fecha_envio, fecha_entregado, medio_envio, guia_envio, updated_at")
      .limit(2);
    query = id ? query.eq("id", id) : query.eq("referencia", referencia!.trim());
    const { data, error } = await query;
    if (error) throw new ToolError(`No se pudo leer el pedido: ${error.message}`);
    if (!data || data.length === 0) throw new ToolError("Pedido no encontrado o sin acceso.");
    if (data.length > 1) throw new ToolError("Hay varios pedidos con esa referencia; usa el id.");
    const p = data[0]!;
    const pedido = {
      id: p.id,
      referencia: p.referencia,
      cliente: p.cliente,
      pieza: p.pieza,
      trabajo: p.trabajo,
      estado: p.estado,
      area_produccion: p.estado === "En Producción" ? p.area_actual : null,
      material: p.material,
      piedras: p.piedras,
      talla: p.talla,
      peso_estimado: p.peso_estimado,
      cantidad_piezas: p.cantidad_piezas,
      ruta: Array.isArray(p.ruta) ? p.ruta : [],
      corte_texto: p.corte_texto,
      corte_tipografia: p.corte_tipografia,
      corte_ubicacion: p.corte_ubicacion,
      corte_observaciones: p.corte_observaciones,
      contrato: p.contrato,
      fecha_ingreso: p.fecha_ingreso,
      fecha_entrega: p.fecha_entrega,
      fecha_listo_entrega: p.fecha_listo_entrega,
      fecha_envio: p.fecha_envio,
      fecha_entregado: p.fecha_entregado,
      medio_envio: p.medio_envio,
      guia_envio: p.guia_envio,
      actualizado: p.updated_at,
    };
    const texto = [
      `${pedido.referencia} — ${pedido.cliente || "Sin cliente"}`,
      `Estado: ${pedido.estado}${pedido.area_produccion ? ` (área: ${pedido.area_produccion})` : ""}`,
      `Pieza: ${pedido.pieza || "—"} · Trabajo: ${pedido.trabajo || "—"}`,
      `Material: ${pedido.material || "—"} · Piedras: ${pedido.piedras || "—"} · Talla: ${pedido.talla || "—"}`,
      `Ruta de fabricación: ${pedido.ruta.join(" → ") || "sin definir"}`,
      `Ingreso: ${pedido.fecha_ingreso} · Entrega prevista: ${pedido.fecha_entrega ?? "sin fecha"}`,
    ].join("\n");
    return { content: [{ type: "text", text: texto }], structuredContent: { pedido } };
  },
});
