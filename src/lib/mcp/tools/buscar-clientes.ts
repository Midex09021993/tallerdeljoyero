import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, textoBusqueda } from "../supabase";

export default defineTool({
  name: "buscar_clientes",
  title: "Buscar clientes",
  description: "Busca clientes del taller por nombre o ciudad. No uses teléfonos, correos ni documentos como filtros desde AURI.",
  inputSchema: {
    busqueda: z.string().max(80).optional().describe("Texto a buscar. Vacío lista los clientes más recientes."),
    limite: z.number().int().min(1).max(50).optional().describe("Máximo de clientes (1-50, por defecto 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ busqueda, limite }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("No autenticado.");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("clientes")
      .select("id, nombre, tipo, ciudad, telefono, email, estado")
      .order("created_at", { ascending: false })
      .limit(limite ?? 20);
    const q = textoBusqueda(busqueda);
    if (q) query = query.or(`nombre.ilike.*${q}*,ciudad.ilike.*${q}*,telefono.ilike.*${q}*,email.ilike.*${q}*`);
    const { data, error } = await query;
    if (error) throw new ToolError(`No se pudieron leer los clientes: ${error.message}`);
    const clientes = (data ?? []).map((c) => ({ id: c.id, nombre: c.nombre, tipo: c.tipo, ciudad: c.ciudad, telefono: c.telefono, email: c.email, estado: c.estado }));
    const texto = clientes.length === 0
      ? "No hay clientes que coincidan."
      : clientes.map((c) => `${c.nombre} · ${c.ciudad ?? "—"} · ${c.telefono ?? "sin teléfono"}`).join("\n");
    return { content: [{ type: "text", text: texto }], structuredContent: { clientes } };
  },
});
