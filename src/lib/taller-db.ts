import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { normalizarArea } from "@/lib/auth";
import { notificarNuevoPedidoADueno } from "@/lib/pwa-push";

type PedidoUpdate = Database["public"]["Tables"]["pedidos"]["Update"];
type ContratoInsert = Database["public"]["Tables"]["contratos"]["Insert"];

export type Estado =
  | "Recibido"
  | "Evaluación"
  | "En Producción"
  | "Área de Ventas"
  | "Listo para Entrega"
  | "Enviado"
  | "Entregado"
  | "Cancelado";

export const estados: Estado[] = [
  "Recibido",
  "Evaluación",
  "En Producción",
  "Área de Ventas",
  "Listo para Entrega",
  "Enviado",
  "Entregado",
  "Cancelado",
];

export const estadoClases: Record<string, string> = {
  Recibido: "bg-surface-muted text-muted-foreground",
  Evaluación: "bg-info-soft text-info",
  "En Producción": "bg-warning-soft text-warning",
  "Área de Ventas": "bg-success-soft text-success",
  "Listo para Entrega": "bg-accent text-foreground",
  Enviado: "bg-info-soft text-info",
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
  "Área ventas",
  "Área de Ventas",
  "Ventas",
  "Terminado",
]);

export function esEstadoPedido(valor: string | null | undefined): valor is Estado {
  return estados.includes(valor as Estado);
}

export function esEstadoFinalPedido(valor: string | null | undefined) {
  return valor === "Entregado" || valor === "Cancelado";
}

export function pedidoEnEvaluacion(valor: string | null | undefined) {
  return valor === "Recibido" || valor === "Evaluación";
}

export function normalizarEstadoPedido(
  estado: string | null | undefined,
  areaActual: string | null | undefined,
): Estado {
  if (esEstadoPedido(estado)) return estado;
  const area = normalizarArea(areaActual || estado || "");
  if (estado === "Espera material") return "Evaluación";
  if (estado === "En Ventas" || estado === "En packing" || estado === "Recibido en ventas") {
    return "Área de Ventas";
  }
  if (estado === "Despachado") return "Enviado";
  if (estado === "Terminado") return "Entregado";
  if (area === "Pedidos") return "Recibido";
  if (area === "Área ventas") return "Área de Ventas";
  if (estadosObsoletosPorArea.has(estado ?? "")) return "En Producción";
  return "Recibido";
}

function areaOperativa(area: string | null | undefined) {
  return normalizarArea(area || "Pedidos") || "Pedidos";
}

function estadoPorDestino(destino: string, direccion: "avanzar" | "devolver" | "enviar"): Estado {
  const area = areaOperativa(destino);
  if (area === "Pedidos") return direccion === "devolver" ? "Evaluación" : "Recibido";
  if (area === "Área ventas") return "Área de Ventas";
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

export function siguienteReferenciaContrato(numeroContrato: string, refs: string[]) {
  const prefijo = prefijoContrato(numeroContrato);
  const re = new RegExp(`^${prefijo}-(\\d+)$`, "i");
  const max = refs.reduce((acc, ref) => {
    const m = re.exec((ref ?? "").trim());
    return m ? Math.max(acc, Number(m[1])) : acc;
  }, 0);
  return `${prefijo}-${String(max + 1).padStart(3, "0")}`;
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
  "id, referencia, pieza, cliente, material, estado, entrega, importe, sede_id, telefono, origen, contrato, contrato_id, trabajo, fecha_ingreso, fecha_entrega, area_actual, ruta, area_desde, notas, talla, cantidad_piezas, piedras, peso_estimado, sedes(nombre)";

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
        ventas_estado: textoCampo(p, "ventas_estado", "Recibido en ventas"),
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

async function asegurarContratoParaPedido(pedido: PedidoNuevo) {
  const numero = pedido.contrato.trim();
  if (pedido.contrato_id || !numero) return pedido.contrato_id ?? null;

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
    if (esErrorCampoFaltante(existente.error)) return null;
    throw existente.error;
  }
  if (existente.data?.id) return existente.data.id;

  const { data, error } = await supabase.from("contratos").insert(base).select("id").single();
  if (error) {
    if (esErrorCampoFaltante(error)) return null;
    throw error;
  }
  return data.id;
}

export function useContratos() {
  return useQuery({
    queryKey: ["contratos"],
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

export function useContrato(id: string) {
  return useQuery({
    queryKey: ["contrato", id],
    queryFn: async (): Promise<Contrato | null> => {
      const { data, error } = await supabase
        .from("contratos")
        .select(
          "id, numero, cliente, telefono, origen, total, abonado, sede_id, notas, created_at, sedes(nombre)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) {
        if (esErrorCampoFaltante(error)) return null;
        throw error;
      }
      if (!data) return null;
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
      const contratoId = await asegurarContratoParaPedido(pedido);
      const pedidoConContrato = contratoId ? { ...pedido, contrato_id: contratoId } : pedido;
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
      pedido: Omit<
        PedidoNuevo,
        "referencia" | "cliente" | "telefono" | "origen" | "contrato" | "contrato_id" | "sede_id"
      >;
      referenciasExistentes: string[];
    }) => {
      const referencia = siguienteReferenciaContrato(contrato.numero, referenciasExistentes);
      const nuevo: PedidoNuevo = {
        ...pedido,
        referencia,
        cliente: contrato.cliente,
        telefono: contrato.telefono,
        origen: contrato.origen,
        contrato: contrato.numero,
        contrato_id: contrato.id,
        sede_id: contrato.sede_id,
      };
      const { data, error } = await supabase
        .from("pedidos")
        .insert(nuevo)
        .select("id, referencia, cliente")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["pedidos"] });
      void qc.invalidateQueries({ queryKey: ["contratos"] });
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
      const { error } = await supabase.from("pedidos").update(cambios).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedidos"] }),
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
