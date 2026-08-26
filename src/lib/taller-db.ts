import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Estado =
  | "Diseño 3D"
  | "Impresión 3D"
  | "Corte láser"
  | "Taller / Engaste"
  | "Entregado"
  | "Espera material";

export const estados: Estado[] = [
  "Diseño 3D",
  "Impresión 3D",
  "Corte láser",
  "Taller / Engaste",
  "Entregado",
  "Espera material",
];

export const estadoClases: Record<string, string> = {
  "Diseño 3D": "bg-info-soft text-info",
  "Impresión 3D": "bg-accent text-foreground",
  "Corte láser": "bg-surface-muted text-muted-foreground",
  "Taller / Engaste": "bg-warning-soft text-warning",
  Entregado: "bg-success-soft text-success",
  "Espera material": "bg-danger-soft text-danger",
};

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
};

export type Proceso = {
  id: string;
  fase: string;
  referencia: string;
  pieza: string;
  cliente: string;
  detalle: string;
  progreso: number;
};

export type Tarea = {
  id: string;
  tarea: string;
  responsable: string;
  banco: string;
  estado: string;
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
};

const CAMPOS_PEDIDO =
  "id, referencia, pieza, cliente, material, estado, entrega, importe, sede_id, telefono, origen, contrato, trabajo, fecha_ingreso, fecha_entrega, area_actual, ruta, area_desde, notas, talla, cantidad_piezas, piedras, sedes(nombre)";

export function usePedidos() {
  return useQuery({
    queryKey: ["pedidos"],
    queryFn: async (): Promise<Pedido[]> => {
      const { data, error } = await supabase
        .from("pedidos")
        .select(CAMPOS_PEDIDO)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(({ sedes, ...p }) => ({
        ...p,
        importe: Number(p.importe),
        sede_nombre: (sedes as { nombre: string } | null)?.nombre ?? null,
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
    mutationFn: async ({ id, ...cambios }: Partial<PedidoNuevo> & { id: string; area_desde?: string }) => {
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
      const secuencia = ["Pedidos", ...pedido.ruta, "Entregado"];
      const i = secuencia.indexOf(pedido.area_actual);
      const destino =
        direccion === "avanzar"
          ? secuencia[Math.min(secuencia.length - 1, i + 1)]
          : secuencia[Math.max(0, i - 1)];
      if (!destino || destino === pedido.area_actual) return;

      const { error } = await supabase
        .from("pedidos")
        .update({ area_actual: destino, area_desde: new Date().toISOString() })
        .eq("id", pedido.id);
      if (error) throw error;
      await supabase.from("pedido_movimientos").insert({
        pedido_id: pedido.id,
        area_origen: pedido.area_actual,
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
      const { error } = await supabase
        .from("pedidos")
        .update({ area_actual: destino, area_desde: new Date().toISOString() })
        .eq("id", pedido.id);
      if (error) throw error;
      await supabase.from("pedido_movimientos").insert({
        pedido_id: pedido.id,
        area_origen: pedido.area_actual,
        area_destino: destino,
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
        : await supabase.from("sedes").insert({ nombre: sede.nombre, ciudad: sede.ciudad, modo: sede.modo });
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
          .select("id, nombre, dni, telefono, sede_id, activo, acceso_desde, acceso_hasta")
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
        .select("id, material, stock, unidad, minimo")
        .order("material");
      if (error) throw error;
      return (data ?? []).map((m) => ({ ...m, stock: Number(m.stock), minimo: Number(m.minimo) }));
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

export function useProcesos(fase: string) {
  return useQuery({
    queryKey: ["procesos", fase],
    queryFn: async (): Promise<Proceso[]> => {
      const { data, error } = await supabase
        .from("procesos")
        .select("id, fase, referencia, pieza, cliente, detalle, progreso")
        .eq("fase", fase)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useActualizarProceso(fase: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, progreso }: { id: string; progreso: number }) => {
      const { error } = await supabase.from("procesos").update({ progreso }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["procesos", fase] }),
  });
}

export function useTareas() {
  return useQuery({
    queryKey: ["tareas"],
    queryFn: async (): Promise<Tarea[]> => {
      const { data, error } = await supabase
        .from("tareas_taller")
        .select("id, tarea, responsable, banco, estado")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useActualizarTarea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: string }) => {
      const { error } = await supabase.from("tareas_taller").update({ estado }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tareas"] }),
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
