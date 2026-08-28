import { useMemo } from "react";
import { areaCoincide, useSesion } from "@/lib/auth";
import { useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";
import { esEstadoFinalPedido, usePedidos, type Pedido } from "@/lib/taller-db";

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
