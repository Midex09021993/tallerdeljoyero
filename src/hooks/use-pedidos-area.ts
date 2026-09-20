import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { areaCoincide, useSesion } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";
import { esEstadoFinalPedido, pedidoEnRecepcion, type Pedido } from "@/lib/taller-db";

export type TrabajoBandeja = {
  id: string;
  pedido_id: string;
  area: string;
  ubicacion: string;
  titulo: string;
  descripcion: string;
  estado: "pendiente" | "en_proceso" | "bloqueado" | "completado" | "cancelado";
  prioridad: "baja" | "normal" | "alta" | "urgente";
  tipo: "interno" | "externo";
  fecha_planificada: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  notas: string;
  responsable_user_id: string | null;
};

const ESTADOS_TRABAJO_ACTIVOS: TrabajoBandeja["estado"][] = [
  "pendiente",
  "en_proceso",
  "bloqueado",
];

export type PedidoOperativo = Pick<Pedido,
  | "id" | "referencia" | "pieza" | "cliente" | "material" | "estado" | "entrega"
  | "sede_id" | "sede_nombre" | "trabajo" | "fecha_entrega" | "area_actual" | "ruta"
  | "area_desde" | "notas" | "talla" | "cantidad_piezas" | "piedras" | "peso_estimado"
  | "corte_texto" | "corte_tipografia" | "corte_ubicacion" | "corte_observaciones"
>;

const CAMPOS_PEDIDO_OPERATIVO =
  "id, referencia, pieza, cliente, material, estado, entrega, sede_id, trabajo, fecha_entrega, area_actual, ruta, area_desde, notas, talla, cantidad_piezas, piedras, peso_estimado, sedes(nombre)";

export function pedidoAsignadoAArea(pedido: Pick<PedidoOperativo, "ruta" | "area_actual">, area: string) {
  const ruta = Array.isArray(pedido.ruta) ? pedido.ruta : [];
  return ruta.some((item) => areaCoincide(item, area)) || areaCoincide(pedido.area_actual, area);
}

export function pedidoEnAreaActual(pedido: Pick<PedidoOperativo, "area_actual">, area: string) {
  return areaCoincide(pedido.area_actual, area);
}

export function usePedidosDeArea(area: string) {
  const { data: sesion } = useSesion();
  const { filtrarPedidos } = useSedeFiltroDueno();

  const query = useQuery({
    queryKey: ["pedidos-area-operativa", area, sesion?.user.id],
    queryFn: async (): Promise<PedidoOperativo[]> => {
      const { data, error } = await supabase
        .from("pedidos")
        .select(CAMPOS_PEDIDO_OPERATIVO)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((pedido) => {
        const sedes = pedido.sedes as { nombre: string } | null;
        return {
          ...pedido,
          sede_nombre: sedes?.nombre ?? null,
          cliente: pedido.cliente ?? "",
          material: pedido.material ?? "",
          trabajo: pedido.trabajo ?? "",
          pieza: pedido.pieza ?? "",
          estado: pedido.estado ?? "",
          entrega: pedido.entrega ?? "",
          fecha_entrega: pedido.fecha_entrega ?? null,
          area_actual: pedido.area_actual ?? "Pedidos",
          ruta: Array.isArray(pedido.ruta) ? pedido.ruta.filter((item): item is string => typeof item === "string") : [],
          area_desde: pedido.area_desde ?? pedido.fecha_entrega ?? new Date().toISOString(),
          notas: pedido.notas ?? "",
          talla: pedido.talla ?? "",
          cantidad_piezas: Number(pedido.cantidad_piezas) || 1,
          piedras: pedido.piedras ?? "",
          peso_estimado: pedido.peso_estimado ?? "",
          corte_texto: pedido.corte_texto ?? "",
          corte_tipografia: pedido.corte_tipografia ?? "",
          corte_ubicacion: pedido.corte_ubicacion ?? "",
          corte_observaciones: pedido.corte_observaciones ?? "",
        } as PedidoOperativo;
      });
    },
  });

  const lista = useMemo(() => {
    const areasUsuario = sesion?.areas ?? [];
    const operarioSinArea =
      sesion?.rolPrincipal === "operario" &&
      areasUsuario.length > 0 &&
      !areasUsuario.some((asignada) => areaCoincide(asignada, area));
    if (operarioSinArea) return [] as PedidoOperativo[];

    return filtrarPedidos(query.data ?? [])
      .filter((pedido) => !esEstadoFinalPedido(pedido.estado))
      .filter((pedido) => !pedidoEnRecepcion(pedido.estado))
      .filter((pedido) => pedido.estado === "En Producción")
      .filter((pedido) => pedidoAsignadoAArea(pedido, area))
      .sort((a, b) => {
        const aEnArea = pedidoEnAreaActual(a, area) ? 0 : 1;
        const bEnArea = pedidoEnAreaActual(b, area) ? 0 : 1;
        if (aEnArea !== bEnArea) return aEnArea - bEnArea;
        return new Date(a.area_desde).getTime() - new Date(b.area_desde).getTime();
      });
  }, [area, filtrarPedidos, query.data, sesion?.areas, sesion?.rolPrincipal]);

  return {
    pedidos: lista,
    enTrabajo: lista.filter((pedido) => pedidoEnAreaActual(pedido, area)),
    programados: lista.filter((pedido) => !pedidoEnAreaActual(pedido, area)),
    isLoading: query.isLoading,
  };
}

export function useTrabajosDelOperario() {
  const { data: sesion } = useSesion();
  const enabled = Boolean(sesion?.rolPrincipal === "operario" && sesion.user.id);

  const query = useQuery({
    queryKey: ["trabajos-operario", sesion?.user.id],
    enabled,
    queryFn: async () => {
      if (!sesion?.user.id) return [] as TrabajoBandeja[];
      const { data, error } = await supabase
        .from("trabajos")
        .select(
          "id, pedido_id, area, ubicacion, titulo, descripcion, estado, prioridad, tipo, fecha_planificada, fecha_inicio, fecha_fin, notas, responsable_user_id",
        )
        .eq("responsable_user_id", sesion.user.id)
        .in("estado", ESTADOS_TRABAJO_ACTIVOS)
        .order("fecha_planificada", { ascending: true, nullsFirst: true });
      if (error) throw error;
      return (data ?? []) as TrabajoBandeja[];
    },
  });

  return {
    trabajos: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
  };
}
