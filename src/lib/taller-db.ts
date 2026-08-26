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

export function usePedidos() {
  return useQuery({
    queryKey: ["pedidos"],
    queryFn: async (): Promise<Pedido[]> => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("id, referencia, pieza, cliente, material, estado, entrega, importe")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p) => ({ ...p, importe: Number(p.importe) }));
    },
  });
}

export function useCrearPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pedido: Omit<Pedido, "id">) => {
      const { error } = await supabase.from("pedidos").insert(pedido);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedidos"] }),
  });
}

export function useActualizarPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...cambios }: Partial<Pedido> & { id: string }) => {
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
