import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AURI_TOOLS, ejecutarHerramienta } from "./tool-registry";

export type AuriDirectoRespuesta = { reply: string; herramientas: string[]; error?: string };

const ESTADOS = ["Recibido", "En Producción", "Listo para Entrega", "En Camino", "Entregado"] as const;
const buckets = new Map<string, { n: number; reset: number }>();

function limitado(userId: string) {
  const now = Date.now();
  const bucket = buckets.get(userId);
  if (!bucket || bucket.reset < now) {
    buckets.set(userId, { n: 1, reset: now + 60_000 });
    return false;
  }
  bucket.n += 1;
  return bucket.n > 20;
}

function textoSeguro(value: unknown, max = 180): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
}

function objeto(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function extraerEstado(message: string): typeof ESTADOS[number] | undefined {
  const normalized = message.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return ESTADOS.find((estado) => normalized.includes(estado.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()));
}

function referenciaEn(message: string): string | undefined {
  const match = message.match(/\b[A-ZÁÉÍÓÚÑ]{1,8}[-\s]\d{1,10}\b/i) ?? message.match(/\bPED(?:IDO)?[-\s]?\d{1,10}\b/i);
  return match?.[0]?.replace(/\s+/g, "").toUpperCase();
}

function formatearResumen(data: unknown): string {
  const root = objeto(data);
  const activos = numero(root.activos);
  const atrasados = numero(root.atrasados);
  const estados = objeto(root.por_estado);
  const areas = objeto(root.por_area);
  const lineas = [
    "**Resumen de producción**",
    `Pedidos activos: **${activos}**`,
    `Pedidos atrasados: **${atrasados}**`,
    "",
    "**Por estado**",
    ...Object.entries(estados).map(([estado, cantidad]) => `- ${textoSeguro(estado)}: ${numero(cantidad)}`),
    "",
    "**En producción por área**",
    ...Object.entries(areas).map(([area, cantidad]) => `- ${textoSeguro(area)}: ${numero(cantidad)}`),
  ];
  return lineas.join("\n");
}

function formatearPedidos(data: unknown): string {
  const root = objeto(data);
  const pedidos = Array.isArray(root.pedidos) ? root.pedidos : [];
  if (!pedidos.length) return "No encontré pedidos con esos filtros o no tienes acceso a ellos.";
  const lineas = pedidos.slice(0, 25).map((item) => {
    const p = objeto(item);
    const referencia = textoSeguro(p.referencia) || "Referencia no registrada";
    const estado = textoSeguro(p.estado) || "Estado no registrado";
    const pieza = textoSeguro(p.pieza) || "Pieza no especificada";
    const entrega = textoSeguro(p.fecha_entrega) || "Sin fecha";
    return `- **${referencia}** · ${pieza} · ${estado} · entrega: ${entrega}`;
  });
  return `Encontré ${pedidos.length} pedido(s):\n${lineas.join("\n")}`;
}

function formatearPedido(data: unknown, referenciaSolicitada?: string): string {
  const root = objeto(data);
  const p = objeto(root.pedido);
  if (!Object.keys(p).length) return "No encontré ese pedido o no tienes permiso para consultarlo.";
  const fields: Array<[string, unknown]> = [
    ["Referencia", referenciaSolicitada],
    ["Pieza", p.pieza],
    ["Trabajo", p.trabajo],
    ["Estado", p.estado],
    ["Área", p.area_produccion],
    ["Material", p.material],
    ["Piedras", p.piedras],
    ["Talla", p.talla],
    ["Peso estimado", p.peso_estimado],
    ["Cantidad", p.cantidad_piezas],
    ["Ruta de fabricación", Array.isArray(p.ruta) ? p.ruta.join(" → ") : ""],
    ["Fecha de ingreso", p.fecha_ingreso],
    ["Fecha de entrega", p.fecha_entrega],
  ];
  const valueFor = (key: string) => p[key];
  const required = [
    ["Trabajo / descripción", "trabajo"],
    ["Material", "material"],
    ["Cantidad de piezas", "cantidad_piezas"],
  ] as const;
  const sinRegistrar = required.filter(([, key]) => valueFor(key) === null || valueFor(key) === undefined || valueFor(key) === "").map(([label]) => label);
  const ruta = Array.isArray(p.ruta) ? p.ruta.map((item) => textoSeguro(item)).filter(Boolean) : [];
  const esCorteLaser = ruta.some((area) => area.toLowerCase().includes("corte láser") || area.toLowerCase().includes("corte laser"));
  const laserFields: Array<[string, string]> = [
    ["Texto a grabar o cortar", "corte_texto"],
    ["Ubicación", "corte_ubicacion"],
    ["Tipografía", "corte_tipografia"],
    ["Observaciones de corte", "corte_observaciones"],
  ];
  const laserPendientes = esCorteLaser
    ? laserFields.filter(([, key]) => !textoSeguro(p[key])).map(([label]) => label)
    : [];
  return [
    "**Ficha técnica del pedido**",
    ...fields.map(([label, value]) => `- **${label}:** ${value === null || value === undefined || value === "" ? "No registrado" : textoSeguro(value)}`),
    "",
    "**Revisión de información**",
    sinRegistrar.length
      ? `- Datos básicos sin registrar: ${sinRegistrar.join(", ")}.`
      : "- Los campos básicos de trabajo, material y cantidad están registrados.",
    esCorteLaser
      ? (laserPendientes.length ? `- Detalles de Corte Láser sin registrar: ${laserPendientes.join(", ")}.` : "- Los campos específicos de Corte Láser están registrados.")
      : "- No se detecta una ruta de Corte Láser en este pedido.",
    "",
    "Los campos no registrados son puntos para revisar con el taller; no significan automáticamente que sean obligatorios para toda pieza.",
  ].join("\n");
}

export const auriDirecto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { message: string }) => {
    const message = textoSeguro(input?.message, 500);
    if (message.length < 2) throw new Error("Escribe una consulta para AURI.");
    return { message };
  })
  .handler(async ({ data, context }): Promise<AuriDirectoRespuesta> => {
    if (limitado(context.userId)) return { reply: "", herramientas: [], error: "Has enviado muchas consultas seguidas. Espera un minuto." };
    const authorization = getRequestHeader("authorization") ?? "";
    const token = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
    if (!token) return { reply: "", herramientas: [], error: "Tu sesión expiró. Vuelve a iniciar sesión." };

    const normalized = data.message.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const refPedido = referenciaEn(data.message);
    let toolName: string;
    let args: Record<string, unknown>;
    let format: (value: unknown, reference?: string) => string;

    if (refPedido) {
      toolName = "ver_pedido";
      args = { referencia: refPedido };
      format = formatearPedido;
    } else if (/\b(resumen|produccion|producción|atrasad|por area|por área|cuantos pedidos activos|cuantos pedidos pendientes)\b/.test(normalized)) {
      toolName = "resumen_produccion";
      args = {};
      format = formatearResumen;
    } else if (/\b(pedido|pedidos|pendiente|pendientes|recibido|en produccion|listo para entrega|en camino|entregado|listar|mostrar)\b/.test(normalized)) {
      toolName = "listar_pedidos";
      const estado = extraerEstado(data.message);
      args = { limite: 25, ...(estado ? { estado } : {}) };
      format = formatearPedidos;
    } else {
      return {
        reply: "Estoy en **AURI Directo**, sin inteligencia artificial. Por ahora puedo:\n- Consultar el resumen de producción y pedidos atrasados.\n- Listar pedidos activos o filtrarlos por estado.\n- Mostrar la ficha de un pedido si escribes su referencia, por ejemplo **SI-0001** (o la referencia exacta de tu pedido).\n\nNo interpreto preguntas abiertas; necesito una de esas consultas concretas.",
        herramientas: [],
      };
    }

    const tool = AURI_TOOLS.find((item) => item.name === toolName);
    if (!tool || tool.annotations?.readOnlyHint !== true) {
      return { reply: "", herramientas: [], error: "La consulta solicitada no está habilitada en modo de solo lectura." };
    }

    const result = await ejecutarHerramienta(toolName, args, { token });
    if (!result.ok) return { reply: "", herramientas: [toolName], error: result.error };
    return { reply: format(result.datos, refPedido), herramientas: [toolName] };
  });
