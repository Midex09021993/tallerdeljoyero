// Reutiliza las cinco herramientas MCP existentes para AURI interno, sin duplicar su lógica.
// Server-only en la práctica: se importa solo desde handlers de createServerFn.
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
  inputSchema?: Record<string, z.ZodTypeAny> | undefined;
  annotations?: { readOnlyHint?: boolean };
  handler: (args: Record<string, unknown>, ctx: ToolContext) => unknown;
};

export const AURI_TOOLS: readonly AnyTool[] = [listarPedidos, verPedido, resumenProduccion, listarContratos, buscarClientes] as unknown as AnyTool[];

// Campos que nunca salen hacia el modelo, aunque una herramienta los devuelva.
const CAMPOS_EXCLUIDOS = new Set(["telefono", "email", "correo", "costo", "coste", "costos", "precio", "importe", "saldo", "total", "notas", "notas_internas", "guia_envio"]);

export function filtrarParaModelo(value: unknown): unknown {
  if (Array.isArray(value)) return value.slice(0, 25).map(filtrarParaModelo);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (CAMPOS_EXCLUIDOS.has(k.toLowerCase())) continue;
      out[k] = filtrarParaModelo(v);
    }
    return out;
  }
  return value;
}

function zodToJson(schema: z.ZodTypeAny): Record<string, unknown> {
  const def = schema._def as { typeName?: string; innerType?: z.ZodTypeAny; values?: string[]; description?: string };
  const desc = schema.description ? { description: schema.description } : {};
  switch (def.typeName) {
    case "ZodOptional":
    case "ZodDefault":
    case "ZodNullable":
      return { ...zodToJson(def.innerType as z.ZodTypeAny), ...desc };
    case "ZodString": return { type: "string", ...desc };
    case "ZodNumber": return { type: "number", ...desc };
    case "ZodBoolean": return { type: "boolean", ...desc };
    case "ZodEnum": return { type: "string", enum: def.values ?? [], ...desc };
    default: return { type: "string", ...desc };
  }
}

export function declaracionesParaModelo() {
  return AURI_TOOLS.map((t) => {
    const shape = t.inputSchema ?? {};
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [k, v] of Object.entries(shape)) {
      properties[k] = zodToJson(v);
      if (!v.isOptional()) required.push(k);
    }
    return { type: "function" as const, function: { name: t.name, description: t.description, parameters: { type: "object", properties, required } } };
  });
}

export type ResultadoHerramienta = { ok: true; datos: unknown } | { ok: false; error: string };

/** Ejecuta un handler MCP con el token de sesión ya verificado del usuario; RLS aplica como él. */
export async function ejecutarHerramienta(
  nombre: string,
  args: unknown,
  sesion: { token: string; userId: string; claims: Record<string, unknown> },
): Promise<ResultadoHerramienta> {
  const tool = AURI_TOOLS.find((t) => t.name === nombre);
  if (!tool || tool.annotations?.readOnlyHint !== true) return { ok: false, error: "Herramienta no disponible." };
  if (!sesion.token) return { ok: false, error: "No autenticado." };
  const parsed = z.object(tool.inputSchema ?? {}).strict().safeParse(args ?? {});
  if (!parsed.success) return { ok: false, error: "Argumentos no válidos." };
  const ctx = new ToolContext({
    type: "oauth",
    principal: { claims: sesion.claims as never, issuer: "app-session", resource: "auri-interno", acceptedAudiences: ["authenticated"], scopes: [], sub: sesion.userId },
    bearer: { token: sesion.token },
  });
  try {
    const res = (await tool.handler(parsed.data, ctx)) as { structuredContent?: unknown; isError?: boolean };
    if (res?.isError) return { ok: false, error: "La consulta no se pudo completar." };
    return { ok: true, datos: res?.structuredContent ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "Error al consultar." };
  }
}
