import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { normalizarArea } from "@/lib/auth";

export type Estado =
  | "Recibido"
  | "Evaluación"
  | "En Producción"
  | "En Ventas"
  | "Listo para Entrega"
  | "Enviado"
  | "Entregado"
  | "Cancelado";

export const estados: Estado[] = [
  "Recibido",
  "Evaluación",
  "En Producción",
  "En Ventas",
  "Listo para Entrega",
  "Enviado",
  "Entregado",
  "Cancelado",
];

export const estadoClases: Record<string, string> = {
  Recibido: "bg-surface-muted text-muted-foreground",
  Evaluación: "bg-info-soft text-info",
  "En Producción": "bg-warning-soft text-warning",
  "En Ventas": "bg-success-soft text-success",
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

export function normalizarEstadoPedido(
  estado: string | null | undefined,
  areaActual: string | null | undefined,
): Estado {
  if (esEstadoPedido(estado)) return estado;
  const area = normalizarArea(areaActual || estado || "");
  if (estado === "Espera material") return "Evaluación";
  if (estado === "En packing" || estado === "Recibido en ventas") return "En Ventas";
  if (estado === "Despachado") return "Enviado";
  if (estado === "Terminado") return "Entregado";
  if (area === "Pedidos") return "Recibido";
  if (area === "Área ventas") return "En Ventas";
  if (estadosObsoletosPorArea.has(estado ?? "")) return "En Producción";
  return "Recibido";
}

function areaOperativa(area: string | null | undefined) {
  return normalizarArea(area || "Pedidos") || "Pedidos";
}

function estadoPorDestino(destino: string, direccion: "avanzar" | "devolver" | "enviar"): Estado {
  const area = areaOperativa(destino);
  if (area === "Pedidos") return direccion === "devolver" ? "Evaluación" : "Recibido";
  if (area === "Área ventas") return "En Ventas";
  return "En Producción";
}

function secuenciaPedido(pedido: Pedido) {
  const ruta = (Array.isArray(pedido.ruta) ? pedido.ruta : [])
    .map(areaOperativa)
    .filter((area) => area !== "Pedidos" && area !== "Área ventas");
  const unicas = [...new Set(ruta)];
  return ["Pedidos", ...unicas, "Área ventas"];
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
  receptor_envio: string;
  notas_ventas: string;
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
  receptor_envio?: string;
  notas_ventas?: string;
};

const CAMPOS_PEDIDO_BASE =
  "id, referencia, pieza, cliente, material, estado, entrega, importe, sede_id, telefono, origen, contrato, trabajo, fecha_ingreso, fecha_entrega, area_actual, ruta, area_desde, notas, talla, cantidad_piezas, piedras, peso_estimado, sedes(nombre)";

const CAMPOS_PEDIDO = `${CAMPOS_PEDIDO_BASE}, ventas_estado, packing_estado, medio_envio, guia_envio, fecha_envio, receptor_envio, notas_ventas`;

function esErrorCampoFaltante(error: { message?: string; code?: string }) {
  const mensaje = (error.message ?? "").toLowerCase();
  return (
    error.code === "42703" ||
    mensaje.includes("could not find") ||
    mensaje.includes("schema cache") ||
    mensaje.includes("column") ||
    mensaje.includes("ventas_estado") ||
    mensaje.includes("packing_estado")
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

      const { data, error } =
        respuesta.error && esErrorCampoFaltante(respuesta.error)
          ? await supabase
              .from("pedidos")
              .select(CAMPOS_PEDIDO_BASE)
              .order("created_at", { ascending: false })
          : respuesta;

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
        receptor_envio: textoCampo(p, "receptor_envio"),
        notas_ventas: textoCampo(p, "notas_ventas"),
      }));
    },
  });
}

export function useCrearPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pedido: PedidoNuevo) => {
      const { error } = await supabase.from("pedidos").insert(pedido);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedidos"] }),
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
      if (!destino || destino === areaActual) return;

      const { error } = await supabase
        .from("pedidos")
        .update({
          area_actual: destino,
          estado: estadoPorDestino(destino, direccion),
          area_desde: new Date().toISOString(),
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
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedidos"] }),
  });
}

/** Envía el pedido directamente a cualquier área, sin seguir la ruta. */
export function useEnviarAArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pedido,
      destino,
      usuarioId,
    }: {
      pedido: Pedido;
      destino: string;
      usuarioId: string | null;
    }) => {
      if (!destino || destino === pedido.area_actual) return;
      const destinoNormalizado = areaOperativa(destino);
      const areaActual = areaOperativa(pedido.area_actual);
      if (!destinoNormalizado || destinoNormalizado === areaActual) return;
      const { error } = await supabase
        .from("pedidos")
        .update({
          area_actual: destinoNormalizado,
          estado: estadoPorDestino(destinoNormalizado, "enviar"),
          area_desde: new Date().toISOString(),
        })
        .eq("id", pedido.id);
      if (error) throw error;
      await supabase.from("pedido_movimientos").insert({
        pedido_id: pedido.id,
        area_origen: areaActual,
        area_destino: destinoNormalizado,
        accion: "enviar",
        usuario_id: usuarioId,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedidos"] }),
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
