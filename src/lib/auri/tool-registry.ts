// Reutiliza las herramientas MCP existentes. Solo se envían a Gemini campos operativos no identificables.
import { ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import listarPedidos from "../mcp/tools/listar-pedidos";
import verPedido from "../mcp/tools/ver-pedido";
import resumenProduccion from "../mcp/tools/resumen-produccion";
import listarContratos from "../mcp/tools/listar-contratos";
import buscarClientes from "../mcp/tools/buscar-clientes";
import crearCliente from "../mcp/tools/crear-cliente";

type AnyTool = {
  name: string;
  description: string;
  inputSchema?: Record<string, z.ZodType> | undefined;
  annotations?: { readOnlyHint?: boolean };
  handler: (args: Record<string, unknown>, ctx: ToolContext) => unknown;
};

export const AURI_TOOLS: readonly AnyTool[] = [
  listarPedidos, verPedido, resumenProduccion, listarContratos, buscarClientes, crearCliente,
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
      if (CAMPOS_PERMITIDOS.has(key.toLowerCase())) {
        if ((key === "por_estado" || key === "por_area") && item && typeof item === "object" && !Array.isArray(item)) {
          out[key] = Object.fromEntries(Object.entries(item).slice(0, 20).map(([label, count]) => [label.slice(0, 80), typeof count === "number" ? count : 0]));
        } else {
          out[key] = filtrarParaModelo(item);
        }
      }
    }
    return out;
  }
  if (typeof value === "string") return value.slice(0, 240);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  return null;
}

// Gemini FunctionDeclaration acepta un subconjunto de OpenAPI Schema, no JSON Schema completo.
// Zod 4 emite additionalProperties, const, pattern y límites de longitud que pueden provocar HTTP 400.
// Las reglas omitidas siguen aplicándose en el servidor mediante safeParse() antes de ejecutar cada herramienta.
// Lista exacta de campos admitidos por Gemini FunctionDeclaration Schema.
const GEMINI_SCHEMA_KEYS = new Set([
  "type", "nullable", "required", "format", "description", "properties",
  "items", "enum", "anyOf", "$ref", "$defs",
]);

export function adaptarEsquemaGemini(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(adaptarEsquemaGemini);
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(source)) {
    if (!GEMINI_SCHEMA_KEYS.has(key)) continue;
    if (key === "properties" && item && typeof item === "object" && !Array.isArray(item)) {
      out.properties = Object.fromEntries(
        Object.entries(item as Record<string, unknown>).map(([name, schema]) => [name, adaptarEsquemaGemini(schema)]),
      );
    } else {
      out[key] = adaptarEsquemaGemini(item);
    }
  }
  return out;
}

export function declaracionesParaModelo() {
  return AURI_TOOLS.map((tool) => {
    const schema = z.toJSONSchema(z.object(tool.inputSchema ?? {}), { target: "draft-7", io: "input" }) as Record<string, unknown>;
    const parameters = adaptarEsquemaGemini(schema) as Record<string, unknown>;
    return { name: tool.name, description: tool.description, parameters };
  });
}

export function esConfirmacionExplicita(value: string): boolean {
  return /^(?:s[ií],? )?confirmo el registro[.! ]*$/i.test(value.trim());
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
  confirmacionUsuario = false,
): Promise<ResultadoHerramienta> {
  const tool = AURI_TOOLS.find((item) => item.name === nombre);
  if (!tool || (tool.annotations?.readOnlyHint !== true && nombre !== "crear_cliente")) return { ok: false, error: "Herramienta no disponible." };
  if (!sesion.token) return { ok: false, error: "No autenticado." };
  const parsed = z.object(tool.inputSchema ?? {}).strict().safeParse(args ?? {});
  if (!parsed.success) return { ok: false, error: "Argumentos no válidos." };
  if (nombre === "crear_cliente" && !confirmacionUsuario) return { ok: false, error: "Antes de guardar, presenta el resumen y espera una confirmación explícita del usuario." };

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
    return { ok: false, error: error instanceof Error && error.name === "ToolError" ? error.message : "La consulta no se pudo completar." };
  }
}
