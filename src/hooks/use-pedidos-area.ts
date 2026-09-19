import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { areaCoincide, useSesion } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";
import { esEstadoFinalPedido, pedidoEnRecepcion, usePedidos, type Pedido } from "@/lib/taller-db";

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

export function pedidoAsignadoAArea(pedido: Pedido, area: string) {
  const ruta = Array.isArray(pedido.ruta) ? pedido.ruta : [];
  return ruta.some((item) => areaCoincide(item, area)) || areaCoincide(pedido.area_actual, area);
}

export function pedidoEnAreaActual(pedido: Pedido, area: string) {
  return areaCoincide(pedido.area_actual, area);
}

export function usePedidosDeArea(area: string) {
  const { data: pedidos = [], isLoading } = usePedidos();
  const { data: sesion } = useSesion();
  const { filtrarPedidos } = useSedeFiltroDueno();

  const lista = useMemo(() => {
    const areasUsuario = sesion?.areas ?? [];
    const operarioSinArea =
      sesion?.rolPrincipal === "operario" &&
      areasUsuario.length > 0 &&
      !areasUsuario.some((asignada) => areaCoincide(asignada, area));

    if (operarioSinArea) return [];

    return filtrarPedidos(pedidos)
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
  }, [area, filtrarPedidos, pedidos, sesion?.areas, sesion?.rolPrincipal]);

  return {
    pedidos: lista,
    enTrabajo: lista.filter((pedido) => pedidoEnAreaActual(pedido, area)),
    programados: lista.filter((pedido) => !pedidoEnAreaActual(pedido, area)),
    isLoading,
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
  };
}
