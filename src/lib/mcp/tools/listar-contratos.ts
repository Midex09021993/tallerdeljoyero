import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, textoBusqueda } from "../supabase";

export default defineTool({
  name: "listar_contratos",
  title: "Listar contratos",
  description: "Lista los contratos del taller con el número de pedidos que contiene cada uno.",
  inputSchema: {
    busqueda: z.string().max(80).optional().describe("Texto a buscar en el número de contrato o el cliente."),
    limite: z.number().int().min(1).max(50).optional().describe("Máximo de contratos (1-50, por defecto 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ busqueda, limite }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("No autenticado.");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("contratos")
      .select("id, numero, cliente, created_at")
      .order("created_at", { ascending: false })
      .limit(limite ?? 20);
    const q = textoBusqueda(busqueda);
    if (q) query = query.or(`numero.ilike.*${q}*,cliente.ilike.*${q}*`);
    const { data, error } = await query;
    if (error) throw new ToolError(`No se pudieron leer los contratos: ${error.message}`);
    const ids = (data ?? []).map((c) => c.id);
    const conteo: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: pedidos, error: errPedidos } = await supabase.from("pedidos").select("contrato_id").in("contrato_id", ids).limit(2000);
      if (errPedidos) throw new ToolError(`No se pudieron contar los pedidos: ${errPedidos.message}`);
      for (const p of pedidos ?? []) if (p.contrato_id) conteo[p.contrato_id] = (conteo[p.contrato_id] ?? 0) + 1;
    }
    const contratos = (data ?? []).map((c) => ({ id: c.id, numero: c.numero, cliente: c.cliente, creado: c.created_at, pedidos: conteo[c.id] ?? 0 }));
    const texto = contratos.length === 0
      ? "No hay contratos que coincidan."
      : contratos.map((c) => `${c.numero} · ${c.cliente || "Sin cliente"} · ${c.pedidos} pedido(s) · ${c.creado.slice(0, 10)}`).join("\n");
    return { content: [{ type: "text", text: texto }], structuredContent: { contratos } };
  },
});
