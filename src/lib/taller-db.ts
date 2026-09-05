import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { normalizarArea } from "@/lib/auth";
import { notificarNuevoPedidoADueno } from "@/lib/pwa-push";

type PedidoUpdate = Database["public"]["Tables"]["pedidos"]["Update"];
type ContratoInsert = Database["public"]["Tables"]["contratos"]["Insert"];
type PagoContratoInsert = Database["public"]["Tables"]["contrato_pagos"]["Insert"];

export type Estado =
  "Recibido" | "En Producción" | "Listo para Entrega" | "En Camino" | "Entregado" | "Cancelado";

export const estados: Estado[] = [
  "Recibido",
  "En Producción",
  "Listo para Entrega",
  "En Camino",
  "Entregado",
  "Cancelado",
];

/** Estados que el cliente ve en el seguimiento público (sin "Cancelado"). */
export const ESTADOS_FLUJO: Estado[] = [
  "Recibido",
  "En Producción",
  "Listo para Entrega",
  "En Camino",
  "Entregado",
];

export const estadoClases: Record<string, string> = {
  Recibido: "bg-surface-muted text-muted-foreground",
  "En Producción": "bg-warning-soft text-warning",
  "Listo para Entrega": "bg-accent text-foreground",
  "En Camino": "bg-info-soft text-info",
  Entregado: "bg-success-soft text-success",
  Cancelado: "bg-danger-soft text-danger",
};

const estadosObsoletosPorArea = new Set([
  "Pedidos",
  "Diseño 3D",
  "Impresión 3D",
  "Casting",
  "Corte Láser",
  "Servicio láser",
  "Corte láser",
  "Corte Laser",
  "Taller",
  "Taller / Engaste",
]);

export function esEstadoPedido(valor: string | null | undefined): valor is Estado {
  return estados.includes(valor as Estado);
}

export function esEstadoFinalPedido(valor: string | null | undefined) {
  return valor === "Entregado" || valor === "Cancelado";
}

/** Pedido registrado que todavía no ha entrado a producción. */
export function pedidoEnRecepcion(valor: string | null | undefined) {
  return valor === "Recibido";
}

/**
 * Normaliza estados antiguos al modelo oficial:
 * Evaluación → Recibido · Área de Ventas → Listo para Entrega · Enviado → En Camino
 */
export function normalizarEstadoPedido(
  estado: string | null | undefined,
  areaActual: string | null | undefined,
): Estado {
  if (esEstadoPedido(estado)) return estado;
  const area = normalizarArea(areaActual || estado || "");
  if (estado === "Evaluación" || estado === "Espera material") return "Recibido";
  if (
    estado === "Área de Ventas" ||
    estado === "En Ventas" ||
    estado === "En packing" ||
    estado === "Recibido en ventas" ||
    estado === "Terminado" ||
    estado === "Área ventas" ||
    estado === "Ventas"
  ) {
    return "Listo para Entrega";
  }
  if (estado === "Enviado" || estado === "Despachado") return "En Camino";
  if (area === "Pedidos") return "Recibido";
  if (area === "Área ventas") return "Listo para Entrega";
  if (estadosObsoletosPorArea.has(estado ?? "")) return "En Producción";
  return "Recibido";
}

/** Sub-estado interno del área de ventas, con los nombres oficiales nuevos. */
export function normalizarEstadoVentas(valor: string | null | undefined) {
  const v = (valor ?? "").trim();
  if (!v) return "Pendiente";
  if (
    ["Área de Ventas", "En Ventas", "En packing", "Recibido en ventas", "Terminado"].includes(v)
  ) {
    return "Pendiente";
  }
  if (["Enviado", "Despachado"].includes(v)) return "En Camino";
  return v;
}

function areaOperativa(area: string | null | undefined) {
  return normalizarArea(area || "Pedidos") || "Pedidos";
}

function estadoPorDestino(destino: string, _direccion: "avanzar" | "devolver" | "enviar"): Estado {
  const area = areaOperativa(destino);
  if (area === "Pedidos") return "Recibido";
  if (area === "Área ventas") return "Listo para Entrega";
  return "En Producción";
}

function cambiosMovimientoDirecto(
  destino: string,
  ahora: string,
): Partial<PedidoNuevo> & {
  area_desde: string;
} {
  const area = areaOperativa(destino);
  if (area !== "Pedidos") {
    return {
      area_actual: area,
      estado: estadoPorDestino(area, "enviar"),
      area_desde: ahora,
    };
  }

  return {
    area_actual: "Pedidos",
    estado: "Recibido",
    area_desde: ahora,
    ventas_estado: "",
    packing_estado: "",
    medio_envio: "",
    guia_envio: "",
    fecha_envio: null,
    fecha_entregado: null,
    fecha_listo_entrega: null,
    listo_entrega_observaciones: "",
    receptor_envio: "",
    notas_ventas: "",
    notas_envio: "",
    notas_entrega: "",
    usuario_listo_entrega: null,
    usuario_envio: null,
    usuario_entrega: null,
    ventas_actualizado_por: null,
    ventas_actualizado_en: null,
    enviado_at: null,
    entregado_at: null,
  };
}

const camposVentasTrazables = new Set([
  "fecha_listo_entrega",
  "listo_entrega_observaciones",
  "notas_envio",
  "notas_entrega",
  "usuario_listo_entrega",
  "usuario_envio",
  "usuario_entrega",
  "ventas_actualizado_por",
  "ventas_actualizado_en",
  "enviado_at",
  "entregado_at",
]);

const camposVentasBase = new Set([
  "ventas_estado",
  "packing_estado",
  "medio_envio",
  "guia_envio",
  "fecha_envio",
  "fecha_entregado",
  "receptor_envio",
  "notas_ventas",
]);

function omitirCampos(objeto: PedidoUpdate, campos: Set<string>): PedidoUpdate {
  return Object.fromEntries(Object.entries(objeto).filter(([campo]) => !campos.has(campo)));
}

function detalleErrorSupabase(error: { message?: string; code?: string; details?: string }) {
  return [error.code, error.message, error.details].filter(Boolean).join(" · ");
}

async function actualizarPedidoConReinicioFlexible(
  pedidoId: string,
  cambios: Partial<PedidoNuevo> & { area_desde: string },
) {
  const intentos = [
    cambios as PedidoUpdate,
    omitirCampos(cambios as PedidoUpdate, camposVentasTrazables),
    omitirCampos(omitirCampos(cambios as PedidoUpdate, camposVentasTrazables), camposVentasBase),
  ];

  let ultimoError: { message?: string; code?: string; details?: string } | null = null;

  for (const payload of intentos) {
    const { error } = await supabase.from("pedidos").update(payload).eq("id", pedidoId);
    if (!error) return;
    ultimoError = error;

    if (!esErrorCampoFaltante(error)) {
      throw new Error(`No se pudo reiniciar el flujo: ${detalleErrorSupabase(error)}`);
    }

    console.warn("[pedidos:reinicio-flujo] Reintentando sin columnas no disponibles", {
      error: detalleErrorSupabase(error),
      campos: Object.keys(payload),
    });
  }

  if (ultimoError) {
    throw new Error(`No se pudo reiniciar el flujo: ${detalleErrorSupabase(ultimoError)}`);
  }
}

function secuenciaPedido(pedido: Pedido) {
  const ruta = (Array.isArray(pedido.ruta) ? pedido.ruta : [])
    .map(areaOperativa)
    .filter((area) => area !== "Pedidos" && area !== "Área ventas");
  const unicas = [...new Set(ruta)];
  return ["Pedidos", ...unicas, "Área ventas"];
}

function primeraAreaProduccion(pedido: Pick<Pedido, "ruta">) {
  return (Array.isArray(pedido.ruta) ? pedido.ruta : [])
    .map(areaOperativa)
    .find((area) => area !== "Pedidos" && area !== "Área ventas");
}

function actualizarPedidoEnCache(
  pedidos: Pedido[] | undefined,
  id: string,
  cambios: Partial<Pedido>,
) {
  if (!pedidos) return pedidos;
  return pedidos.map((pedido) => (pedido.id === id ? { ...pedido, ...cambios } : pedido));
}

function invalidarPedidosActivos(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: ["pedidos"], refetchType: "active" });
}

function prefijoContrato(numero: string) {
  const limpio = numero.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return limpio.slice(-2) || "YA";
}

function prefijoContratoAutomatico() {
  return `CTR-${new Date().getFullYear()}-`;
}

function esUuid(valor: string | null | undefined) {
  return Boolean(
    valor?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
  );
}

export function siguienteReferenciaContrato(numeroContrato: string, refs: string[]) {
  const prefijo = prefijoContrato(numeroContrato);
  const re = new RegExp(`^${prefijo}-(\\d+)$`, "i");
  const max = refs.reduce((acc, ref) => {
    const m = re.exec((ref ?? "").trim());
    return m ? Math.max(acc, Number(m[1])) : acc;
  }, 0);
  return `${prefijo}-${String(max + 1).padStart(3, "0")}`;
}

function siguienteNumeroContrato(numeros: string[]) {
  const prefijo = prefijoContratoAutomatico();
  const re = new RegExp(`^${prefijo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)$`, "i");
  const max = numeros.reduce((acc, numero) => {
    const m = re.exec((numero ?? "").trim());
    return m ? Math.max(acc, Number(m[1])) : acc;
  }, 0);
  return `${prefijo}${String(max + 1).padStart(4, "0")}`;
}

export type Pedido = {
  id: string;
  referencia: string;
  pieza: string;
  cliente: string;
  material: string;
  estado: string;
  entrega: string;
  importe: number;
  sede_id: string | null;
  sede_nombre: string | null;
  telefono: string;
  origen: string;
  contrato: string;
  contrato_id: string | null;
  trabajo: string;
  fecha_ingreso: string;
  fecha_entrega: string | null;
  area_actual: string;
  ruta: string[];
  area_desde: string;
  notas: string;
  talla: string;
  cantidad_piezas: number;
  piedras: string;
  peso_estimado: string;
  corte_texto: string;
  corte_tipografia: string;
  corte_ubicacion: string;
  corte_observaciones: string;
  ventas_estado: string;
  packing_estado: string;
  medio_envio: string;
  guia_envio: string;
  fecha_envio: string | null;
  fecha_entregado: string | null;
  fecha_listo_entrega: string | null;
  listo_entrega_observaciones: string;
  receptor_envio: string;
  notas_ventas: string;
  notas_envio: string;
  notas_entrega: string;
  usuario_listo_entrega: string | null;
  usuario_envio: string | null;
  usuario_entrega: string | null;
  ventas_actualizado_por: string | null;
  ventas_actualizado_en: string | null;
  enviado_at: string | null;
  entregado_at: string | null;
};

export type Contrato = {
  id: string;
  numero: string;
  cliente: string;
  telefono: string;
  origen: string;
  total: number;
  abonado: number;
  saldo: number;
  sede_id: string | null;
  sede_nombre: string | null;
  notas: string;
  created_at: string;
};

export type EstadoFinanciero = "Pendiente" | "Pago parcial" | "Pagado";

export type PagoContrato = {
  id: string;
  contrato_id: string;
  contrato_numero: string;
  fecha: string;
  concepto: string;
  monto: number;
  usuario_id: string | null;
  usuario_nombre: string | null;
  created_at: string;
};

export type ResumenFinancieroContrato = {
  total: number;
  abonado: number;
  saldo: number;
  estado: EstadoFinanciero;
  origen: "contrato" | "sin_contrato";
};

export type Sede = {
  id: string;
  nombre: string;
  ciudad: string;
  modo: string;
  activa: boolean;
};

export type Material = {
  id: string;
  material: string;
  stock: number;
  unidad: string;
  minimo: number;
  categoria: string;
  sede_id: string | null;
  areas: string[];
};

export const CATEGORIAS_MATERIAL = [
  "Oro",
  "Plata",
  "Resina",
  "Piedras",
  "Soldadura",
  "Herramientas",
  "Otros insumos",
] as const;

export type MovimientoInventario = {
  id: string;
  material_id: string;
  material: string;
  cantidad: number;
  tipo: string;
  motivo: string;
  area: string;
  created_at: string;
};

export type PedidoNuevo = {
  referencia: string;
  pieza: string;
  cliente: string;
  material: string;
  estado: string;
  entrega: string;
  importe: number;
  sede_id: string | null;
  telefono: string;
  origen: string;
  contrato: string;
  contrato_id?: string | null;
  trabajo: string;
  fecha_ingreso: string;
  fecha_entrega: string | null;
  area_actual: string;
  ruta: string[];
  notas: string;
  talla: string;
  cantidad_piezas: number;
  piedras: string;
  peso_estimado: string;
  corte_texto?: string;
  corte_tipografia?: string;
  corte_ubicacion?: string;
  corte_observaciones?: string;
  ventas_estado?: string;
  packing_estado?: string;
  medio_envio?: string;
  guia_envio?: string;
  fecha_envio?: string | null;
  fecha_entregado?: string | null;
  fecha_listo_entrega?: string | null;
  listo_entrega_observaciones?: string;
  receptor_envio?: string;
  notas_ventas?: string;
  notas_envio?: string;
  notas_entrega?: string;
  usuario_listo_entrega?: string | null;
  usuario_envio?: string | null;
  usuario_entrega?: string | null;
  ventas_actualizado_por?: string | null;
  ventas_actualizado_en?: string | null;
  enviado_at?: string | null;
  entregado_at?: string | null;
};

const CAMPOS_PEDIDO_BASE =
  "id, referencia, pieza, cliente, material, estado, entrega, importe, sede_id, telefono, origen, contrato, contrato_id, trabajo, fecha_ingreso, fecha_entrega, area_actual, ruta, area_desde, notas, talla, cantidad_piezas, piedras, peso_estimado, corte_texto, corte_tipografia, corte_ubicacion, corte_observaciones, sedes(nombre)";

const CAMPOS_PEDIDO_VENTAS =
  "ventas_estado, packing_estado, medio_envio, guia_envio, fecha_envio, fecha_entregado, receptor_envio, notas_ventas";

const CAMPOS_PEDIDO = `${CAMPOS_PEDIDO_BASE}, ${CAMPOS_PEDIDO_VENTAS}, fecha_listo_entrega, listo_entrega_observaciones, notas_envio, notas_entrega, usuario_listo_entrega, usuario_envio, usuario_entrega, ventas_actualizado_por, ventas_actualizado_en, enviado_at, entregado_at`;

function esErrorCampoFaltante(error: { message?: string; code?: string }) {
  const mensaje = (error.message ?? "").toLowerCase();
  return (
    error.code === "42703" ||
    mensaje.includes("could not find") ||
    mensaje.includes("schema cache") ||
    mensaje.includes("column") ||
    mensaje.includes("ventas_estado") ||
    mensaje.includes("packing_estado") ||
    mensaje.includes("contrato_id") ||
    mensaje.includes("contratos")
  );
}

function textoCampo(registro: Record<string, unknown>, campo: string, fallback = "") {
  const valor = registro[campo];
  return typeof valor === "string" ? valor : fallback;
}

export function usePedidos() {
  return useQuery({
    queryKey: ["pedidos"],
    queryFn: async (): Promise<Pedido[]> => {
      const respuesta = await supabase
        .from("pedidos")
        .select(CAMPOS_PEDIDO)
        .order("created_at", { ascending: false });

      const camposBaseCompat =
        "id, referencia, pieza, cliente, material, estado, entrega, importe, sede_id, telefono, origen, contrato, trabajo, fecha_ingreso, fecha_entrega, area_actual, ruta, area_desde, notas, talla, cantidad_piezas, piedras, peso_estimado, sedes(nombre)";

      const respuestaContratos =
        respuesta.error && esErrorCampoFaltante(respuesta.error)
          ? await supabase
              .from("pedidos")
              .select(`${camposBaseCompat}, ${CAMPOS_PEDIDO_VENTAS}`)
              .order("created_at", { ascending: false })
          : respuesta;

      const respuestaVentas =
        respuestaContratos.error && esErrorCampoFaltante(respuestaContratos.error)
          ? await supabase
              .from("pedidos")
              .select(`${camposBaseCompat}, ${CAMPOS_PEDIDO_VENTAS}`)
              .order("created_at", { ascending: false })
          : respuestaContratos;

      const { data, error } =
        respuestaVentas.error && esErrorCampoFaltante(respuestaVentas.error)
          ? await supabase
              .from("pedidos")
              .select(camposBaseCompat)
              .order("created_at", { ascending: false })
          : respuestaVentas;

      if (error) throw error;
      return ((data ?? []) as Array<Record<string, unknown>>).map(({ sedes, ...p }) => ({
        ...p,
        id: textoCampo(p, "id"),
        referencia: textoCampo(p, "referencia"),
        pieza: textoCampo(p, "pieza"),
        cliente: textoCampo(p, "cliente"),
        material: textoCampo(p, "material"),
        estado: normalizarEstadoPedido(
          textoCampo(p, "estado"),
          textoCampo(p, "area_actual", "Pedidos"),
        ),
        entrega: textoCampo(p, "entrega"),
        importe: Number(p["importe"]) || 0,
        sede_nombre: (sedes as { nombre: string } | null)?.nombre ?? null,
        sede_id: typeof p["sede_id"] === "string" ? p["sede_id"] : null,
        telefono: textoCampo(p, "telefono"),
        origen: textoCampo(p, "origen"),
        contrato: textoCampo(p, "contrato"),
        contrato_id: typeof p["contrato_id"] === "string" ? p["contrato_id"] : null,
        trabajo: textoCampo(p, "trabajo"),
        fecha_ingreso: textoCampo(p, "fecha_ingreso"),
        fecha_entrega: typeof p["fecha_entrega"] === "string" ? p["fecha_entrega"] : null,
        area_actual: areaOperativa(textoCampo(p, "area_actual", "Pedidos")),
        ruta: Array.isArray(p["ruta"])
          ? p["ruta"]
              .filter((area) => typeof area === "string")
              .map(areaOperativa)
              .filter((area) => area !== "Pedidos" && area !== "Área ventas")
          : [],
        area_desde: textoCampo(
          p,
          "area_desde",
          textoCampo(p, "fecha_ingreso", new Date().toISOString()),
        ),
        notas: textoCampo(p, "notas"),
        talla: textoCampo(p, "talla"),
        cantidad_piezas: Number(p["cantidad_piezas"]) || 1,
        piedras: textoCampo(p, "piedras"),
        peso_estimado: textoCampo(p, "peso_estimado"),
        corte_texto: textoCampo(p, "corte_texto"),
        corte_tipografia: textoCampo(p, "corte_tipografia"),
        corte_ubicacion: textoCampo(p, "corte_ubicacion"),
        corte_observaciones: textoCampo(p, "corte_observaciones"),
        ventas_estado: normalizarEstadoVentas(textoCampo(p, "ventas_estado")),
        packing_estado: textoCampo(p, "packing_estado", "Pendiente"),
        medio_envio: textoCampo(p, "medio_envio"),
        guia_envio: textoCampo(p, "guia_envio"),
        fecha_envio: typeof p["fecha_envio"] === "string" ? p["fecha_envio"] : null,
        fecha_entregado: typeof p["fecha_entregado"] === "string" ? p["fecha_entregado"] : null,
        fecha_listo_entrega:
          typeof p["fecha_listo_entrega"] === "string" ? p["fecha_listo_entrega"] : null,
        listo_entrega_observaciones: textoCampo(p, "listo_entrega_observaciones"),
        receptor_envio: textoCampo(p, "receptor_envio"),
        notas_ventas: textoCampo(p, "notas_ventas"),
        notas_envio: textoCampo(p, "notas_envio"),
        notas_entrega: textoCampo(p, "notas_entrega"),
        usuario_listo_entrega:
          typeof p["usuario_listo_entrega"] === "string" ? p["usuario_listo_entrega"] : null,
        usuario_envio: typeof p["usuario_envio"] === "string" ? p["usuario_envio"] : null,
        usuario_entrega: typeof p["usuario_entrega"] === "string" ? p["usuario_entrega"] : null,
        ventas_actualizado_por:
          typeof p["ventas_actualizado_por"] === "string" ? p["ventas_actualizado_por"] : null,
        ventas_actualizado_en:
          typeof p["ventas_actualizado_en"] === "string" ? p["ventas_actualizado_en"] : null,
        enviado_at: typeof p["enviado_at"] === "string" ? p["enviado_at"] : null,
        entregado_at: typeof p["entregado_at"] === "string" ? p["entregado_at"] : null,
      }));
    },
  });
}

async function generarNumeroContratoAutomatico() {
  const prefijo = prefijoContratoAutomatico();
  const [contratos, pedidos] = await Promise.all([
    supabase.from("contratos").select("numero").ilike("numero", `${prefijo}%`),
    supabase.from("pedidos").select("contrato").ilike("contrato", `${prefijo}%`),
  ]);

  if (contratos.error && !esErrorCampoFaltante(contratos.error)) throw contratos.error;
  if (pedidos.error && !esErrorCampoFaltante(pedidos.error)) throw pedidos.error;

  return siguienteNumeroContrato([
    ...((contratos.data ?? []) as Array<{ numero?: string }>).map((c) => c.numero ?? ""),
    ...((pedidos.data ?? []) as Array<{ contrato?: string }>).map((p) => p.contrato ?? ""),
  ]);
}

async function asegurarContratoParaPedido(pedido: PedidoNuevo) {
  const numero = pedido.contrato.trim() || (await generarNumeroContratoAutomatico());
  if (pedido.contrato_id) return { id: pedido.contrato_id, numero, creado: false };

  const base: ContratoInsert = {
    numero,
    cliente: pedido.cliente,
    telefono: pedido.telefono,
    origen: pedido.origen,
    total: pedido.importe,
    abonado: 0,
    sede_id: pedido.sede_id,
    notas: "",
  };

  const existente = await supabase
    .from("contratos")
    .select("id")
    .eq("numero", numero)
    .maybeSingle();

  if (existente.error) {
    if (esErrorCampoFaltante(existente.error)) return { id: null, numero, creado: false };
    throw existente.error;
  }
  if (existente.data?.id) return { id: existente.data.id, numero, creado: false };

  const { data, error } = await supabase.from("contratos").insert(base).select("id").single();
  if (error) {
    if (error.code === "23505") {
      const relectura = await supabase
        .from("contratos")
        .select("id")
        .eq("numero", numero)
        .maybeSingle();
      if (relectura.error) throw relectura.error;
      if (relectura.data?.id) return { id: relectura.data.id, numero, creado: false };
    }
    if (esErrorCampoFaltante(error)) return { id: null, numero, creado: false };
    throw error;
  }
  return { id: data.id, numero, creado: true };
}

async function asegurarContratoComercial({
  numero,
  cliente,
  telefono,
  origen,
  importe,
  sede_id,
  notas,
}: {
  numero: string;
  cliente: string;
  telefono: string;
  origen: string;
  importe: number;
  sede_id: string | null;
  notas: string;
}) {
  const numeroLimpio = numero.trim();
  if (!numeroLimpio) return { id: null, numero: "", creado: false };

  const base: ContratoInsert = {
    numero: numeroLimpio,
    cliente,
    telefono,
    origen,
    total: Math.max(0, importe),
    abonado: 0,
    sede_id,
    notas,
  };

  const existente = await supabase
    .from("contratos")
    .select("id, cliente, telefono, origen, sede_id")
    .eq("numero", numeroLimpio)
    .maybeSingle();

  if (existente.error) {
    if (esErrorCampoFaltante(existente.error))
      return { id: null, numero: numeroLimpio, creado: false };
    throw existente.error;
  }

  if (existente.data?.id) {
    const actualizacion: Partial<ContratoInsert> = {
      cliente: textoCampo(existente.data as Record<string, unknown>, "cliente") || cliente,
      telefono: textoCampo(existente.data as Record<string, unknown>, "telefono") || telefono,
      origen: textoCampo(existente.data as Record<string, unknown>, "origen") || origen,
      sede_id:
        typeof (existente.data as Record<string, unknown>)["sede_id"] === "string"
          ? ((existente.data as Record<string, unknown>)["sede_id"] as string)
          : sede_id,
    };
    const { error } = await supabase
      .from("contratos")
      .update(actualizacion)
      .eq("id", existente.data.id);
    if (error && !esErrorCampoFaltante(error)) throw error;
    return { id: existente.data.id, numero: numeroLimpio, creado: false };
  }

  const { data, error } = await supabase.from("contratos").insert(base).select("id").single();
  if (error) {
    if (error.code === "23505") {
      const relectura = await supabase
        .from("contratos")
        .select("id")
        .eq("numero", numeroLimpio)
        .maybeSingle();
      if (relectura.error) throw relectura.error;
      if (relectura.data?.id) return { id: relectura.data.id, numero: numeroLimpio, creado: false };
    }
    if (esErrorCampoFaltante(error)) return { id: null, numero: numeroLimpio, creado: false };
    throw error;
  }

  return { id: data.id, numero: numeroLimpio, creado: true };
}

export function useContratos() {
  return useQuery({
    queryKey: ["contratos"],
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Contrato[]> => {
      const { data, error } = await supabase
        .from("contratos")
        .select(
          "id, numero, cliente, telefono, origen, total, abonado, sede_id, notas, created_at, sedes(nombre)",
        )
        .order("created_at", { ascending: false });
      if (error) {
        if (esErrorCampoFaltante(error)) return [];
        throw error;
      }
      return ((data ?? []) as Array<Record<string, unknown>>).map(({ sedes, ...c }) => {
        const total = Number(c["total"]) || 0;
        const abonado = Number(c["abonado"]) || 0;
        return {
          id: textoCampo(c, "id"),
          numero: textoCampo(c, "numero"),
          cliente: textoCampo(c, "cliente"),
          telefono: textoCampo(c, "telefono"),
          origen: textoCampo(c, "origen"),
          total,
          abonado,
          saldo: Math.max(0, total - abonado),
          sede_id: typeof c["sede_id"] === "string" ? c["sede_id"] : null,
          sede_nombre: (sedes as { nombre: string } | null)?.nombre ?? null,
          notas: textoCampo(c, "notas"),
          created_at: textoCampo(c, "created_at"),
        };
      });
    },
  });
}

export function calcularEstadoFinanciero(total: number, abonado: number): EstadoFinanciero {
  const saldo = Math.max(0, total - abonado);
  if (total > 0 && saldo <= 0) return "Pagado";
  if (abonado > 0 && saldo > 0) return "Pago parcial";
  return "Pendiente";
}

export function resumenFinancieroContrato(
  contrato: Pick<Contrato, "id" | "total" | "abonado"> | null | undefined,
  pagos: PagoContrato[] = [],
): ResumenFinancieroContrato {
  if (!contrato || !esUuid(contrato.id)) {
    return {
      total: 0,
      abonado: 0,
      saldo: 0,
      estado: "Pendiente",
      origen: "sin_contrato",
    };
  }
  const total = Number(contrato.total) || 0;
  const abonadoPagos = pagos.reduce((acc, pago) => acc + (Number(pago.monto) || 0), 0);
  const abonado = pagos.length > 0 ? abonadoPagos : Number(contrato.abonado) || 0;
  const saldo = Math.max(0, total - abonado);
  return {
    total,
    abonado,
    saldo,
    estado: calcularEstadoFinanciero(total, abonado),
    origen: "contrato",
  };
}

function pagosDesdeRows(rows: Array<Record<string, unknown>>): PagoContrato[] {
  return rows.map(({ profiles, ...p }) => ({
    id: textoCampo(p, "id"),
    contrato_id: textoCampo(p, "contrato_id"),
    contrato_numero: textoCampo(p, "contrato_numero"),
    fecha: textoCampo(p, "fecha"),
    concepto: textoCampo(p, "concepto"),
    monto: Number(p["monto"]) || 0,
    usuario_id: typeof p["usuario_id"] === "string" ? p["usuario_id"] : null,
    usuario_nombre:
      ((profiles as { nombre?: string } | null | undefined)?.nombre as string | undefined) ?? null,
    created_at: textoCampo(p, "created_at"),
  }));
}

export function usePagosContrato(contrato: Pick<Contrato, "id" | "numero"> | null | undefined) {
  return useQuery({
    queryKey: ["contrato_pagos", contrato?.id, contrato?.numero],
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<PagoContrato[]> => {
      if (!contrato) return [];
      const selector = esUuid(contrato.id) ? "contrato_id" : "contrato_numero";
      const valor = esUuid(contrato.id) ? contrato.id : contrato.numero;
      const { data, error } = await supabase
        .from("contrato_pagos")
        .select(
          "id, contrato_id, contrato_numero, fecha, concepto, monto, usuario_id, created_at, profiles(nombre)",
        )
        .eq(selector, valor)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) {
        if (esErrorCampoFaltante(error)) return [];
        throw error;
      }
      return pagosDesdeRows((data ?? []) as Array<Record<string, unknown>>);
    },
    enabled: Boolean(contrato),
  });
}

export function usePagosContratos(contratos: Pick<Contrato, "id" | "numero">[]) {
  const ids = contratos.map((c) => c.id).filter(esUuid);
  const numeros = contratos.map((c) => c.numero).filter(Boolean);
  return useQuery({
    queryKey: ["contrato_pagos", ids.slice().sort(), numeros.slice().sort()],
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<PagoContrato[]> => {
      if (ids.length === 0 && numeros.length === 0) return [];
      const consultas = await Promise.all([
        ids.length > 0
          ? supabase
              .from("contrato_pagos")
              .select(
                "id, contrato_id, contrato_numero, fecha, concepto, monto, usuario_id, created_at, profiles(nombre)",
              )
              .in("contrato_id", ids)
          : Promise.resolve({ data: [], error: null }),
        numeros.length > 0
          ? supabase
              .from("contrato_pagos")
              .select(
                "id, contrato_id, contrato_numero, fecha, concepto, monto, usuario_id, created_at, profiles(nombre)",
              )
              .in("contrato_numero", numeros)
          : Promise.resolve({ data: [], error: null }),
      ]);
      const error = consultas.find((r) => r.error)?.error;
      if (error) {
        if (esErrorCampoFaltante(error)) return [];
        throw error;
      }
      const porId = new Map<string, Record<string, unknown>>();
      consultas.forEach((r) => {
        ((r.data ?? []) as Array<Record<string, unknown>>).forEach((p) => {
          const id = textoCampo(p, "id");
          if (id) porId.set(id, p);
        });
      });
      return pagosDesdeRows([...porId.values()]).sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
      );
    },
    enabled: contratos.length > 0,
  });
}

export function useRegistrarPagoContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      contrato,
      fecha,
      concepto,
      monto,
      usuarioId,
    }: {
      contrato: Contrato;
      fecha: string;
      concepto: string;
      monto: number;
      usuarioId: string | null;
    }) => {
      if (monto <= 0) throw new Error("El monto del pago debe ser mayor que cero.");
      if (!esUuid(contrato.id)) {
        throw new Error("No existe un documento comercial asociado.");
      }
      const pago: PagoContratoInsert = {
        contrato_id: contrato.id,
        contrato_numero: contrato.numero,
        fecha,
        concepto,
        monto,
        usuario_id: usuarioId,
      };
      const { error } = await supabase.from("contrato_pagos").insert(pago);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success("Pago registrado en el contrato");
      void qc.invalidateQueries({ queryKey: ["contratos"] });
      void qc.invalidateQueries({ queryKey: ["contrato", variables.contrato.id] });
      void qc.invalidateQueries({ queryKey: ["contrato", variables.contrato.numero] });
      void qc.invalidateQueries({ queryKey: ["contrato_pagos"] });
      void qc.invalidateQueries({ queryKey: ["pedidos"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el pago");
    },
  });
}

async function sumarImporteAContrato(contratoId: string | null | undefined, importe: number) {
  if (!contratoId || !esUuid(contratoId) || importe <= 0) return;
  const { data, error } = await supabase
    .from("contratos")
    .select("total")
    .eq("id", contratoId)
    .maybeSingle();
  if (error) {
    if (esErrorCampoFaltante(error)) return;
    throw error;
  }
  const totalActual = Number((data as { total?: number } | null)?.total) || 0;
  const { error: errorUpdate } = await supabase
    .from("contratos")
    .update({ total: totalActual + importe })
    .eq("id", contratoId);
  if (errorUpdate) {
    if (esErrorCampoFaltante(errorUpdate)) return;
    throw errorUpdate;
  }
}

async function recalcularTotalContrato(numero: string, contratoId: string | null | undefined) {
  if (!numero.trim() || !contratoId || !esUuid(contratoId)) return;

  const { data, error } = await supabase
    .from("pedidos")
    .select("importe")
    .eq("contrato", numero.trim());

  if (error) {
    if (esErrorCampoFaltante(error)) return;
    throw error;
  }

  const total = ((data ?? []) as Array<{ importe?: number }>).reduce(
    (acc, pedido) => acc + (Number(pedido.importe) || 0),
    0,
  );

  const { error: errorUpdate } = await supabase
    .from("contratos")
    .update({ total })
    .eq("id", contratoId);

  if (errorUpdate && !esErrorCampoFaltante(errorUpdate)) throw errorUpdate;
}

async function vincularPedidosPorNumeroContrato(numero: string, contratoId: string | null) {
  if (!numero.trim() || !contratoId || !esUuid(contratoId)) return;
  const { error } = await supabase
    .from("pedidos")
    .update({ contrato_id: contratoId })
    .eq("contrato", numero.trim());

  if (error && !esErrorCampoFaltante(error)) throw error;
}

export function useCrearContratoDesdePedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pedido: Pedido) => {
      const numero = pedido.contrato.trim() || `DOC-${pedido.referencia || Date.now()}`;
      const contrato = await asegurarContratoComercial({
        numero,
        cliente: pedido.cliente,
        telefono: pedido.telefono,
        origen: pedido.origen,
        importe: pedido.importe,
        sede_id: pedido.sede_id,
        notas: "Contrato creado desde un pedido existente.",
      });

      if (!contrato.id) {
        throw new Error("No se pudo crear el contrato financiero.");
      }

      const { error: errorPedido } = await supabase
        .from("pedidos")
        .update({ contrato: contrato.numero, contrato_id: contrato.id })
        .eq(
          pedido.contrato.trim() ? "contrato" : "id",
          pedido.contrato.trim() ? contrato.numero : pedido.id,
        );
      if (errorPedido) {
        if (!esErrorCampoFaltante(errorPedido)) throw errorPedido;
        const { error: errorCompat } = await supabase
          .from("pedidos")
          .update({ contrato: contrato.numero })
          .eq(
            pedido.contrato.trim() ? "contrato" : "id",
            pedido.contrato.trim() ? contrato.numero : pedido.id,
          );
        if (errorCompat) throw errorCompat;
      }

      await vincularPedidosPorNumeroContrato(contrato.numero, contrato.id);
      await recalcularTotalContrato(contrato.numero, contrato.id);

      return { contratoId: contrato.id, numero: contrato.numero };
    },
    onSuccess: (resultado, pedido) => {
      toast.success(`Contrato ${resultado.numero || pedido.contrato} creado y asociado`);
      void qc.invalidateQueries({ queryKey: ["contratos"] });
      void qc.invalidateQueries({ queryKey: ["contrato", resultado.numero || pedido.contrato] });
      void qc.invalidateQueries({ queryKey: ["contrato_pagos"] });
      void qc.invalidateQueries({ queryKey: ["pedidos"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el contrato");
    },
  });
}

export function useContrato(id: string) {
  return useQuery({
    queryKey: ["contrato", id],
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Contrato | null> => {
      const selector = esUuid(id) ? "id" : "numero";
      const { data, error } = await supabase
        .from("contratos")
        .select(
          "id, numero, cliente, telefono, origen, total, abonado, sede_id, notas, created_at, sedes(nombre)",
        )
        .eq(selector, id)
        .maybeSingle();
      if (error) {
        if (esErrorCampoFaltante(error)) return contratoDesdePedidos(id);
        throw error;
      }
      if (!data) return contratoDesdePedidos(id);
      const row = data as Record<string, unknown> & { sedes?: { nombre: string } | null };
      const total = Number(row["total"]) || 0;
      const abonado = Number(row["abonado"]) || 0;
      return {
        id: textoCampo(row, "id"),
        numero: textoCampo(row, "numero"),
        cliente: textoCampo(row, "cliente"),
        telefono: textoCampo(row, "telefono"),
        origen: textoCampo(row, "origen"),
        total,
        abonado,
        saldo: Math.max(0, total - abonado),
        sede_id: typeof row["sede_id"] === "string" ? row["sede_id"] : null,
        sede_nombre: row.sedes?.nombre ?? null,
        notas: textoCampo(row, "notas"),
        created_at: textoCampo(row, "created_at"),
      };
    },
    enabled: Boolean(id),
  });
}

async function contratoDesdePedidos(numeroContrato: string): Promise<Contrato | null> {
  if (!numeroContrato || esUuid(numeroContrato)) return null;

  const { data, error } = await supabase
    .from("pedidos")
    .select("contrato, cliente, telefono, origen, importe, sede_id, sedes(nombre), created_at")
    .eq("contrato", numeroContrato);

  if (error) {
    if (esErrorCampoFaltante(error)) {
      const { data: dataSinSede, error: errorSinSede } = await supabase
        .from("pedidos")
        .select("contrato, cliente, telefono, origen, importe, sede_id, created_at")
        .eq("contrato", numeroContrato);
      if (errorSinSede) throw errorSinSede;
      return construirContratoTemporal(numeroContrato, dataSinSede ?? []);
    }
    throw error;
  }

  return construirContratoTemporal(numeroContrato, data ?? []);
}

function construirContratoTemporal(
  numeroContrato: string,
  pedidos: Array<Record<string, unknown>>,
) {
  if (pedidos.length === 0) return null;
  const primero = pedidos[0]!;
  const total = pedidos.reduce((acc, pedido) => acc + (Number(pedido["importe"]) || 0), 0);
  return {
    id: numeroContrato,
    numero: numeroContrato,
    cliente: textoCampo(primero, "cliente"),
    telefono: textoCampo(primero, "telefono"),
    origen: textoCampo(primero, "origen"),
    total,
    abonado: 0,
    saldo: total,
    sede_id: typeof primero["sede_id"] === "string" ? primero["sede_id"] : null,
    sede_nombre:
      ((primero["sedes"] as { nombre?: string } | null | undefined)?.nombre as
        string | undefined) ?? null,
    notas: "Contrato reconstruido desde pedidos existentes.",
    created_at: textoCampo(primero, "created_at", new Date().toISOString()),
  };
}

export function usePedidosContrato(contrato: Pick<Contrato, "id" | "numero"> | null | undefined) {
  const { data: pedidos = [], isLoading } = usePedidos();
  return {
    isLoading,
    pedidos: pedidos.filter((pedido) =>
      contrato ? pedido.contrato_id === contrato.id || pedido.contrato === contrato.numero : false,
    ),
  };
}

export function useCrearPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pedido: PedidoNuevo) => {
      const contrato = await asegurarContratoParaPedido(pedido);
      const pedidoConContrato = {
        ...pedido,
        contrato: contrato.numero,
        contrato_id: contrato.id,
      };
      const respuesta = await supabase
        .from("pedidos")
        .insert(pedidoConContrato)
        .select("id, referencia, cliente")
        .single();

      const { contrato_id: _contratoIdOmitido, ...sinContratoId } = pedidoConContrato;
      const { data, error } =
        respuesta.error &&
        esErrorCampoFaltante(respuesta.error) &&
        "contrato_id" in pedidoConContrato
          ? await supabase
              .from("pedidos")
              .insert(sinContratoId)
              .select("id, referencia, cliente")
              .single()
          : respuesta;
      if (error) throw error;
      if (!contrato.creado) await sumarImporteAContrato(contrato.id, pedido.importe);
      return data;
    },
    onSuccess: (pedido) => {
      void qc.invalidateQueries({ queryKey: ["pedidos"] });
      void qc.invalidateQueries({ queryKey: ["contratos"] });
      if (pedido) void notificarNuevoPedidoADueno(pedido);
    },
  });
}

export function useCrearTrabajoContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      contrato,
      pedido,
      referenciasExistentes,
    }: {
      contrato: Contrato;
      pedido: Omit<PedidoNuevo, "referencia" | "contrato_id">;
      referenciasExistentes: string[];
    }) => {
      const referencia = siguienteReferenciaContrato(contrato.numero, referenciasExistentes);
      const nuevo: PedidoNuevo = {
        ...pedido,
        referencia,
        cliente: contrato.cliente,
        contrato: contrato.numero,
        contrato_id: esUuid(contrato.id) ? contrato.id : null,
        sede_id: contrato.sede_id,
      };
      const respuesta = await supabase
        .from("pedidos")
        .insert(nuevo)
        .select("id, referencia, cliente")
        .single();

      const { contrato_id: _contratoIdOmitido, ...sinContratoId } = nuevo;
      const { data, error } =
        respuesta.error &&
        (esErrorCampoFaltante(respuesta.error) || respuesta.error.code === "22P02")
          ? await supabase
              .from("pedidos")
              .insert(sinContratoId)
              .select("id, referencia, cliente")
              .single()
          : respuesta;
      if (error) throw error;
      await sumarImporteAContrato(esUuid(contrato.id) ? contrato.id : null, nuevo.importe);
      return data;
    },
    onSuccess: (pedido) => {
      void qc.invalidateQueries({ queryKey: ["pedidos"] });
      void qc.invalidateQueries({ queryKey: ["contratos"] });
      if (pedido) void notificarNuevoPedidoADueno(pedido);
    },
  });
}

export function useActualizarPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...cambios
    }: Partial<PedidoNuevo> & { id: string; area_desde?: string }) => {
      let payload = cambios as PedidoUpdate;
      let contratoVinculado: { id: string | null; numero: string } | null = null;

      if (Object.prototype.hasOwnProperty.call(cambios, "contrato")) {
        const numero = String(cambios.contrato ?? "").trim();

        if (numero) {
          const { data: pedidoActual, error: errorPedido } = await supabase
            .from("pedidos")
            .select("cliente, telefono, origen, importe, sede_id")
            .eq("id", id)
            .maybeSingle();
          if (errorPedido) throw errorPedido;

          const base = (pedidoActual ?? {}) as Record<string, unknown>;
          const contrato = await asegurarContratoComercial({
            numero,
            cliente: String(cambios.cliente ?? base["cliente"] ?? ""),
            telefono: String(cambios.telefono ?? base["telefono"] ?? ""),
            origen: String(cambios.origen ?? base["origen"] ?? ""),
            importe: Number(cambios.importe ?? base["importe"] ?? 0) || 0,
            sede_id:
              typeof (cambios.sede_id ?? base["sede_id"]) === "string"
                ? String(cambios.sede_id ?? base["sede_id"])
                : null,
            notas: "Documento comercial creado o vinculado desde ficha técnica.",
          });

          payload = {
            ...payload,
            contrato: contrato.numero,
            contrato_id: contrato.id,
          } as PedidoUpdate;
          contratoVinculado = { id: contrato.id, numero: contrato.numero };
        } else {
          payload = { ...payload, contrato: "", contrato_id: null } as PedidoUpdate;
        }
      }

      const respuesta = await supabase.from("pedidos").update(payload).eq("id", id);
      const { contrato_id: _contratoIdOmitido, ...payloadSinContratoId } = payload;
      const { error } =
        respuesta.error && esErrorCampoFaltante(respuesta.error) && "contrato_id" in payload
          ? await supabase.from("pedidos").update(payloadSinContratoId).eq("id", id)
          : respuesta;
      if (error) throw error;

      if (contratoVinculado?.id) {
        await vincularPedidosPorNumeroContrato(contratoVinculado.numero, contratoVinculado.id);
        await recalcularTotalContrato(contratoVinculado.numero, contratoVinculado.id);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["pedidos"] });
      void qc.invalidateQueries({ queryKey: ["contratos"] });
      void qc.invalidateQueries({ queryKey: ["contrato_pagos"] });
    },
  });
}

export function useBorrarPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pedidos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedidos"] }),
  });
}

/** Avanza o devuelve el pedido siguiendo su propia ruta. */
export function useMoverPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pedido,
      direccion,
      usuarioId,
    }: {
      pedido: Pedido;
      direccion: "avanzar" | "devolver";
      usuarioId: string | null;
    }) => {
      const secuencia = secuenciaPedido(pedido);
      const areaActual = areaOperativa(pedido.area_actual);
      const i = Math.max(0, secuencia.indexOf(areaActual));
      const destino =
        direccion === "avanzar"
          ? secuencia[Math.min(secuencia.length - 1, i + 1)]
          : secuencia[Math.max(0, i - 1)];
      if (!destino || destino === areaActual) return null;

      const ahora = new Date().toISOString();
      const estado = estadoPorDestino(destino, direccion);
      const { error } = await supabase
        .from("pedidos")
        .update({
          area_actual: destino,
          estado,
          area_desde: ahora,
        })
        .eq("id", pedido.id);
      if (error) throw error;
      await supabase.from("pedido_movimientos").insert({
        pedido_id: pedido.id,
        area_origen: areaActual,
        area_destino: destino,
        accion: direccion,
        usuario_id: usuarioId,
      });
      return { pedido, destino, estado, area_desde: ahora };
    },
    onMutate: async ({ pedido, direccion }) => {
      await qc.cancelQueries({ queryKey: ["pedidos"] });
      const anterior = qc.getQueryData<Pedido[]>(["pedidos"]);
      const secuencia = secuenciaPedido(pedido);
      const areaActual = areaOperativa(pedido.area_actual);
      const i = Math.max(0, secuencia.indexOf(areaActual));
      const destino =
        direccion === "avanzar"
          ? secuencia[Math.min(secuencia.length - 1, i + 1)]
          : secuencia[Math.max(0, i - 1)];
      if (destino && destino !== areaActual) {
        qc.setQueryData<Pedido[]>(["pedidos"], (pedidos) =>
          actualizarPedidoEnCache(pedidos, pedido.id, {
            area_actual: destino,
            estado: estadoPorDestino(destino, direccion),
            area_desde: new Date().toISOString(),
          }),
        );
      }
      return { anterior };
    },
    onError: (error, _variables, contexto) => {
      if (contexto?.anterior) qc.setQueryData(["pedidos"], contexto.anterior);
      toast.error(error instanceof Error ? error.message : "No se pudo mover el pedido");
    },
    onSuccess: (resultado) => {
      if (resultado) toast.success(`Pedido movido a ${normalizarArea(resultado.destino)}`);
    },
    onSettled: () => {
      void invalidarPedidosActivos(qc);
    },
  });
}

/** Autoriza el pedido para entrar a producción y lo ubica en la primera área de su ruta. */
export function useAutorizarProduccion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pedido, usuarioId }: { pedido: Pedido; usuarioId: string | null }) => {
      const destino = primeraAreaProduccion(pedido);
      if (!destino) throw new Error("El pedido no tiene áreas productivas asignadas.");

      const areaActual = areaOperativa(pedido.area_actual);
      const ahora = new Date().toISOString();
      const { error } = await supabase
        .from("pedidos")
        .update({
          area_actual: destino,
          estado: "En Producción",
          area_desde: ahora,
        })
        .eq("id", pedido.id);
      if (error) throw error;

      await supabase.from("pedido_movimientos").insert({
        pedido_id: pedido.id,
        area_origen: areaActual,
        area_destino: destino,
        accion: "autorizar_produccion",
        usuario_id: usuarioId,
      });
      return { pedido, destino, area_desde: ahora };
    },
    onMutate: async ({ pedido }) => {
      await qc.cancelQueries({ queryKey: ["pedidos"] });
      const anterior = qc.getQueryData<Pedido[]>(["pedidos"]);
      const destino = primeraAreaProduccion(pedido);
      if (destino) {
        qc.setQueryData<Pedido[]>(["pedidos"], (pedidos) =>
          actualizarPedidoEnCache(pedidos, pedido.id, {
            area_actual: destino,
            estado: "En Producción",
            area_desde: new Date().toISOString(),
          }),
        );
      }
      return { anterior };
    },
    onError: (error, _variables, contexto) => {
      if (contexto?.anterior) qc.setQueryData(["pedidos"], contexto.anterior);
      toast.error(error instanceof Error ? error.message : "No se pudo autorizar producción");
    },
    onSuccess: (resultado) => {
      toast.success(`Producción autorizada en ${normalizarArea(resultado.destino)}`);
    },
    onSettled: () => {
      void invalidarPedidosActivos(qc);
    },
  });
}

export function destinosMovimientoPedido(
  pedido: Pick<Pedido, "area_actual" | "ruta">,
  opciones?: { esAdmin?: boolean; areasUsuario?: string[] },
) {
  const areaActual = areaOperativa(pedido.area_actual);
  const rutaPedido = (Array.isArray(pedido.ruta) ? pedido.ruta : [])
    .map(areaOperativa)
    .filter((area) => area !== "Pedidos");
  const destinosBase = opciones?.esAdmin
    ? ["Pedidos", ...rutaPedido, "Área ventas"]
    : [...rutaPedido, "Área ventas"];
  const areasUsuario = (opciones?.areasUsuario ?? []).map(areaOperativa);
  const permitidos = opciones?.esAdmin
    ? destinosBase
    : destinosBase.filter(
        (area) =>
          area === "Área ventas" || areasUsuario.length === 0 || areasUsuario.includes(area),
      );

  return [...new Set(permitidos)].filter((area) => area && area !== areaActual);
}

/** Mueve el pedido directamente a un área seleccionada. */
export function useEnviarAArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pedido,
      destino,
      usuarioId,
      motivo,
    }: {
      pedido: Pedido;
      destino: string;
      usuarioId: string | null;
      motivo?: string;
    }) => {
      if (!destino || destino === pedido.area_actual) return null;
      const destinoNormalizado = areaOperativa(destino);
      const areaActual = areaOperativa(pedido.area_actual);
      if (!destinoNormalizado || destinoNormalizado === areaActual) return null;
      const ahora = new Date().toISOString();
      const reiniciaFlujo = destinoNormalizado === "Pedidos";
      const cambios = cambiosMovimientoDirecto(destinoNormalizado, ahora);
      if (reiniciaFlujo) {
        await actualizarPedidoConReinicioFlexible(pedido.id, cambios);
      } else {
        const { error } = await supabase.from("pedidos").update(cambios).eq("id", pedido.id);
        if (error) {
          console.error("[pedidos:mover] Error al actualizar pedido", {
            pedidoId: pedido.id,
            destino: destinoNormalizado,
            error: detalleErrorSupabase(error),
          });
          throw new Error(`No se pudo mover el pedido: ${detalleErrorSupabase(error)}`);
        }
      }
      await supabase.from("pedido_movimientos").insert({
        pedido_id: pedido.id,
        area_origen: areaActual,
        area_destino: destinoNormalizado,
        accion: reiniciaFlujo ? "reiniciar_flujo" : "mover",
        usuario_id: usuarioId,
        nota: reiniciaFlujo
          ? motivo?.trim() || "Retorno a Pedidos para reiniciar flujo operativo."
          : motivo?.trim() || "",
      });
      return {
        pedido,
        destino: destinoNormalizado,
        estado: cambios.estado ?? estadoPorDestino(destinoNormalizado, "enviar"),
        area_desde: ahora,
        reiniciaFlujo,
      };
    },
    onMutate: async ({ pedido, destino }) => {
      await qc.cancelQueries({ queryKey: ["pedidos"] });
      const anterior = qc.getQueryData<Pedido[]>(["pedidos"]);
      const destinoNormalizado = areaOperativa(destino);
      const areaActual = areaOperativa(pedido.area_actual);
      if (destinoNormalizado && destinoNormalizado !== areaActual) {
        const ahora = new Date().toISOString();
        const cambios = cambiosMovimientoDirecto(destinoNormalizado, ahora);
        qc.setQueryData<Pedido[]>(["pedidos"], (pedidos) =>
          actualizarPedidoEnCache(pedidos, pedido.id, cambios as Partial<Pedido>),
        );
      }
      return { anterior };
    },
    onError: (error, _variables, contexto) => {
      if (contexto?.anterior) qc.setQueryData(["pedidos"], contexto.anterior);
      console.error("[pedidos:mover] Movimiento fallido", error);
      toast.error(error instanceof Error ? error.message : "No se pudo mover el pedido");
    },
    onSuccess: (resultado) => {
      if (!resultado) return;
      toast.success(
        resultado.reiniciaFlujo
          ? "Pedido devuelto a Pedidos y flujo reiniciado"
          : `Pedido movido a ${normalizarArea(resultado.destino)}`,
      );
    },
    onSettled: () => {
      void invalidarPedidosActivos(qc);
    },
  });
}

export function useSedes() {
  return useQuery({
    queryKey: ["sedes"],
    queryFn: async (): Promise<Sede[]> => {
      const { data, error } = await supabase
        .from("sedes")
        .select("id, nombre, ciudad, modo, activa")
        .order("nombre");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useGuardarSede() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sede: { id?: string; nombre: string; ciudad: string; modo: string }) => {
      const { error } = sede.id
        ? await supabase
            .from("sedes")
            .update({ nombre: sede.nombre, ciudad: sede.ciudad, modo: sede.modo })
            .eq("id", sede.id)
        : await supabase
            .from("sedes")
            .insert({ nombre: sede.nombre, ciudad: sede.ciudad, modo: sede.modo });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sedes"] }),
  });
}

export type Usuario = {
  id: string;
  nombre: string;
  dni: string;
  telefono: string;
  sede_id: string | null;
  activo: boolean;
  acceso_desde: string | null;
  acceso_hasta: string | null;
  clave_visible: string | null;
  roles: string[];
  areas: string[];
};

export function useUsuarios() {
  return useQuery({
    queryKey: ["usuarios"],
    queryFn: async (): Promise<Usuario[]> => {
      const [{ data: perfiles, error }, { data: roles }, { data: areas }] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, nombre, dni, telefono, sede_id, activo, acceso_desde, acceso_hasta, clave_visible",
          )
          .order("nombre"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("user_areas").select("user_id, area"),
      ]);
      if (error) throw error;
      return (perfiles ?? []).map((p) => ({
        ...p,
        roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as string),
        areas: (areas ?? []).filter((a) => a.user_id === p.id).map((a) => a.area),
      }));
    },
  });
}

export function useInventario() {
  return useQuery({
    queryKey: ["inventario"],
    queryFn: async (): Promise<Material[]> => {
      const { data, error } = await supabase
        .from("inventario")
        .select("id, material, stock, unidad, minimo, categoria, sede_id")
        .order("material");
      if (error) throw error;
      const { data: asignaciones } = await supabase
        .from("material_areas")
        .select("material_id, area");
      return (data ?? []).map((m) => ({
        ...m,
        stock: Number(m.stock),
        minimo: Number(m.minimo),
        areas: (asignaciones ?? []).filter((a) => a.material_id === m.id).map((a) => a.area),
      }));
    },
  });
}

export function useActualizarStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stock }: { id: string; stock: number }) => {
      const { error } = await supabase.from("inventario").update({ stock }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventario"] }),
  });
}

export type Gasto = {
  id: string;
  sede_id: string | null;
  concepto: string;
  categoria: string;
  importe: number;
  fecha: string;
};

export function useGastos() {
  return useQuery({
    queryKey: ["gastos"],
    queryFn: async (): Promise<Gasto[]> => {
      const { data, error } = await supabase
        .from("gastos")
        .select("id, sede_id, concepto, categoria, importe, fecha")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((g) => ({ ...g, importe: Number(g.importe) }));
    },
  });
}

export function useCrearGasto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (gasto: Omit<Gasto, "id">) => {
      const { error } = await supabase.from("gastos").insert(gasto);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gastos"] }),
  });
}

export function useBorrarGasto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gastos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gastos"] }),
  });
}

export type ConfigArea = {
  id: string;
  sede_id: string | null;
  area: string;
  horas_objetivo: number;
  alerta_activa: boolean;
};

export type ConfigSistema = {
  clave: string;
  valor: Json;
};

export function useConfigAreas() {
  return useQuery({
    queryKey: ["config_areas"],
    queryFn: async (): Promise<ConfigArea[]> => {
      const { data, error } = await supabase
        .from("config_areas")
        .select("id, sede_id, area, horas_objetivo, alerta_activa");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useGuardarConfigArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cfg: {
      sede_id: string | null;
      area: string;
      horas_objetivo: number;
      alerta_activa: boolean;
    }) => {
      const { error } = await supabase
        .from("config_areas")
        .upsert(cfg, { onConflict: "sede_id,area" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["config_areas"] }),
  });
}

export function useConfigSistema(clave: string) {
  return useQuery({
    queryKey: ["config_sistema", clave],
    queryFn: async (): Promise<ConfigSistema | null> => {
      const { data, error } = await supabase
        .from("config_sistema")
        .select("clave, valor")
        .eq("clave", clave)
        .maybeSingle();
      if (error) {
        const mensaje = (error.message ?? "").toLowerCase();
        if (error.code === "42P01" || mensaje.includes("config_sistema")) return null;
        throw error;
      }
      return (data as ConfigSistema | null) ?? null;
    },
  });
}

export function useGuardarConfigSistema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cfg: ConfigSistema) => {
      const { error } = await supabase.from("config_sistema").upsert(cfg, { onConflict: "clave" });
      if (error) throw error;
    },
    onSuccess: (_data, cfg) => qc.invalidateQueries({ queryKey: ["config_sistema", cfg.clave] }),
  });
}

/** Alta de un material del inventario. */
export function useCrearMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nuevo: {
      material: string;
      categoria: string;
      unidad: string;
      stock: number;
      minimo: number;
      sede_id: string | null;
      areas: string[];
    }) => {
      const { data, error } = await supabase
        .from("inventario")
        .insert({
          material: nuevo.material,
          categoria: nuevo.categoria,
          unidad: nuevo.unidad,
          stock: nuevo.stock,
          minimo: nuevo.minimo,
          sede_id: nuevo.sede_id,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (nuevo.areas.length > 0) {
        await supabase
          .from("material_areas")
          .insert(nuevo.areas.map((area) => ({ material_id: data.id, area })));
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventario"] }),
  });
}

/** Actualiza los datos base de un material. */
export function useActualizarMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      cambios,
    }: {
      id: string;
      cambios: Partial<{ material: string; categoria: string; unidad: string; minimo: number }>;
    }) => {
      const { error } = await supabase.from("inventario").update(cambios).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventario"] }),
  });
}

/** Asigna o quita un material de un área del taller. */
export function useAsignarArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      materialId,
      area,
      activo,
    }: {
      materialId: string;
      area: string;
      activo: boolean;
    }) => {
      if (activo) {
        const { error } = await supabase
          .from("material_areas")
          .insert({ material_id: materialId, area });
        if (error && !/duplicate/i.test(error.message)) throw error;
      } else {
        const { error } = await supabase
          .from("material_areas")
          .delete()
          .eq("material_id", materialId)
          .eq("area", area);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventario"] }),
  });
}

export function useBorrarMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventario").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventario"] }),
  });
}

export function useMovimientosInventario() {
  return useQuery({
    queryKey: ["inventario-movimientos"],
    queryFn: async (): Promise<MovimientoInventario[]> => {
      const { data, error } = await supabase
        .from("inventario_movimientos")
        .select("id, material_id, cantidad, tipo, motivo, area, created_at, inventario(material)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((m) => {
        const { inventario, ...resto } = m as typeof m & {
          inventario: { material: string } | null;
        };
        return {
          ...resto,
          cantidad: Number(resto.cantidad),
          material: inventario?.material ?? "",
        };
      });
    },
  });
}

/** Registra un consumo o entrada: el stock general se ajusta en automático. */
export function useRegistrarMovimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mov: {
      material_id: string;
      cantidad: number;
      tipo: "entrada" | "consumo";
      area: string;
      motivo: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("inventario_movimientos").insert({
        material_id: mov.material_id,
        cantidad: Math.abs(mov.cantidad),
        tipo: mov.tipo,
        area: mov.area,
        motivo: mov.motivo,
        usuario_id: userData.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventario"] });
      qc.invalidateQueries({ queryKey: ["inventario-movimientos"] });
    },
  });
}

export type ArchivoPedido = {
  id: string;
  pedido_id: string;
  tipo: string;
  nombre: string;
  url: string;
  es_enlace: boolean;
  created_at: string;
  grupo: string;
  version: number;
  poster: string;
  referencia: string;
  cliente: string;
  trabajo: string;
  area_actual: string;
};

/** Archivos subidos en todos los pedidos visibles (biblioteca del taller). */
export function useArchivosPedidos() {
  return useQuery({
    queryKey: ["archivos-pedidos"],
    queryFn: async (): Promise<ArchivoPedido[]> => {
      const { data, error } = await supabase
        .from("pedido_archivos")
        .select(
          "id, pedido_id, tipo, nombre, url, es_enlace, created_at, grupo, version, poster, pedidos(referencia, cliente, trabajo, area_actual)",
        )
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;

      return (data ?? []).map((a) => {
        const { pedidos, ...resto } = a as typeof a & {
          pedidos: {
            referencia: string;
            cliente: string;
            trabajo: string;
            area_actual: string;
          } | null;
        };
        return {
          ...resto,
          referencia: pedidos?.referencia ?? "",
          cliente: pedidos?.cliente ?? "",
          trabajo: pedidos?.trabajo ?? "",
          area_actual: pedidos?.area_actual ?? "",
        };
      });
    },
  });
}
