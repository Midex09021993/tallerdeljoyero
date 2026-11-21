// Reutiliza las herramientas MCP existentes. Solo se envían a Gemini campos operativos no identificables.
import { ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import listarPedidos from "../mcp/tools/listar-pedidos";
import verPedido from "../mcp/tools/ver-pedido";
import resumenProduccion from "../mcp/tools/resumen-produccion";
import listarContratos from "../mcp/tools/listar-contratos";
import buscarClientes from "../mcp/tools/buscar-clientes";

type AnyTool = {
  name: string;
  description: string;
  inputSchema?: Record<string, z.ZodType> | undefined;
  annotations?: { readOnlyHint?: boolean };
  handler: (args: Record<string, unknown>, ctx: ToolContext) => unknown;
};

export const AURI_TOOLS: readonly AnyTool[] = [
  listarPedidos, verPedido, resumenProduccion, listarContratos, buscarClientes,
] as unknown as AnyTool[];

// Lista positiva: ningún identificador, nombre, referencia, dato de contacto o campo financiero
// puede salir hacia Gemini. Los valores operativos se conservan para resumir el trabajo.
const CAMPOS_PERMITIDOS = new Set([
  "estado", "area_produccion", "pieza", "trabajo", "material", "piedras", "talla",
  "peso_estimado", "cantidad_piezas", "fecha_ingreso", "fecha_entrega",
  "fecha_listo_entrega", "fecha_envio", "fecha_entregado", "medio_envio",
  "actualizado", "pedidos", "activos", "atrasados", "por_estado", "por_area",
  "fecha", "tipo", "ciudad",
]);

export function filtrarParaModelo(value: unknown): unknown {
  if (Array.isArray(value)) return value.slice(0, 25).map(filtrarParaModelo);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (CAMPOS_PERMITIDOS.has(key.toLowerCase())) out[key] = filtrarParaModelo(item);
    }
    return out;
  }
  if (typeof value === "string") return value.slice(0, 240);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  return null;
}

export function declaracionesParaModelo() {
  return AURI_TOOLS.map((tool) => {
    const schema = z.toJSONSchema(z.object(tool.inputSchema ?? {}), { target: "draft-7", io: "input" }) as Record<string, unknown>;
    const { $schema: _omit, ...parameters } = schema;
    return { name: tool.name, description: tool.description, parameters };
  });
}

export type ResultadoHerramienta = { ok: true; datos: unknown } | { ok: false; error: string };

/**
 * Adaptador mínimo para las herramientas MCP existentes.
 * El token procede del middleware requireSupabaseAuth, que ya verificó sus claims.
 * No se inventa un principal OAuth ni se simula una autorización MCP.
 */
export async function ejecutarHerramienta(
  nombre: string,
  args: unknown,
  sesion: { token: string },
): Promise<ResultadoHerramienta> {
  const tool = AURI_TOOLS.find((item) => item.name === nombre);
  if (!tool || tool.annotations?.readOnlyHint !== true) return { ok: false, error: "Herramienta no disponible." };
  if (!sesion.token) return { ok: false, error: "No autenticado." };
  const parsed = z.object(tool.inputSchema ?? {}).strict().safeParse(args ?? {});
  if (!parsed.success) return { ok: false, error: "Argumentos no válidos." };

  // supabaseForUser solo requiere getToken(); los handlers también verifican isAuthenticated().
  const context = {
    isAuthenticated: () => true,
    getToken: () => sesion.token,
  } as unknown as ToolContext;

  try {
    const result = (await tool.handler(parsed.data, context)) as { structuredContent?: unknown; isError?: boolean };
    if (result?.isError) return { ok: false, error: "La consulta no se pudo completar." };
    return { ok: true, datos: filtrarParaModelo(result?.structuredContent ?? null) };
  } catch (error) {
    // No propagar mensajes de base de datos ni valores que puedan contener información privada.
    console.error("auri-interno tool failed", { tool: nombre, error: error instanceof Error ? error.message : "unknown" });
    return { ok: false, error: "La consulta no se pudo completar." };
  }
}
