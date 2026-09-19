import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Boxes, ChevronRight, Hammer, LayoutGrid, UserRound, Wrench } from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { areaCoincide, areaRuta, normalizarArea, useSesion } from "@/lib/auth";
import {
  esEstadoFinalPedido,
  pedidoEnRecepcion,
  usePedidos,
  type Pedido,
} from "@/lib/taller-db";
import { pedidoAsignadoAArea, pedidoEnAreaActual } from "@/hooks/use-pedidos-area";
import { useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";

export const Route = createFileRoute("/_authenticated/operario")({
  head: () => ({
    meta: [
      { title: "Mi trabajo — Aurum Lab" },
      {
        name: "description",
        content: "Inicio rápido del operario con áreas asignadas y pedidos pendientes.",
      },
    ],
  }),
  component: OperarioPage,
});

const iconosArea: Record<string, typeof Hammer> = {
  "Diseño 3D": LayoutGrid,
  "Impresión 3D": Boxes,
  "Corte Láser": Wrench,
  Casting: Hammer,
  Taller: Hammer,
  "Área ventas": Boxes,
  Pedidos: LayoutGrid,
};

function diasHastaEntrega(pedido: Pedido) {
  const fechaIso = pedido.fecha_entrega ?? pedido.entrega;
  if (!fechaIso) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const entrega = new Date(fechaIso);
  if (Number.isNaN(entrega.getTime())) return null;
  entrega.setHours(0, 0, 0, 0);
  return Math.ceil((entrega.getTime() - hoy.getTime()) / 86_400_000);
}

function esUrgente(pedido: Pedido) {
  const dias = diasHastaEntrega(pedido);
  return dias !== null && dias <= 1;
}

function areasAsignadasUnicas(areas: string[]) {
  const vistas = new Set<string>();
  return areas
    .map(normalizarArea)
    .filter((area) => areaRuta[area])
    .filter((area) => {
      if (vistas.has(area)) return false;
      vistas.add(area);
      return true;
    });
}

function OperarioPage() {
  const { data: sesion } = useSesion();
  const { data: pedidos = [], isLoading } = usePedidos();

  const { data: misTrabajos = [] } = useQuery({
    queryKey: ["mis-trabajos-operario"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trabajos")
        .select("id, pedido_id, area, titulo, descripcion, estado, prioridad, fecha_planificada")
        .in("estado", ["pendiente", "en_proceso", "bloqueado"])
        .order("fecha_planificada", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  const navigate = useNavigate();
  const { filtrarPedidos } = useSedeFiltroDueno();

  const areas = useMemo(() => areasAsignadasUnicas(sesion?.areas ?? []), [sesion?.areas]);
  const conteos = useMemo(() => {
    // Misma base que la vista de cada área: solo trabajo activo en producción y de mi sede.
    const activos = filtrarPedidos(pedidos).filter(
      (pedido) =>
        !esEstadoFinalPedido(pedido.estado) &&
        !pedidoEnRecepcion(pedido.estado) &&
        pedido.estado === "En Producción",
    );

    return areas.map((area) => {
      const asignados = activos.filter((pedido) => pedidoAsignadoAArea(pedido, area));
      // Pendientes = lo que está realmente en el área ahora.
      const enTrabajo = asignados.filter((pedido) => pedidoEnAreaActual(pedido, area));
      const programados = asignados.filter((pedido) => !pedidoEnAreaActual(pedido, area));
      const urgentes = enTrabajo.filter(esUrgente);
      return { area, enTrabajo, programados, urgentes };
    });
  }, [areas, filtrarPedidos, pedidos]);

  const nombre = sesion?.perfil.nombre?.trim() || "Operario";
  const puedeHerramientas = areas.some((area) => areaCoincide(area, "Taller"));

  return (
    <AppShell
      titulo={`Hola ${nombre}`}
      subtitulo="Tus áreas de trabajo asignadas"
      atrasMovil={false}
    >
      <section className="mb-6 rounded-2xl border border-gold/25 bg-surface-sunken p-5 shadow-raised">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Trabajos asignados</p>
            <h2 className="mt-1 text-lg font-semibold">Lo que tienes que hacer</h2>
            <p className="mt-1 text-xs text-muted-foreground">Solo aparecen trabajos asignados directamente a ti.</p>
          </div>
          <span className="rounded-full border border-border bg-card px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {misTrabajos.length} activo{misTrabajos.length === 1 ? "" : "s"}
          </span>
        </div>

        {misTrabajos.length > 0 ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {misTrabajos.map((trabajo) => (
              <button
                key={trabajo.id}
                type="button"
                onClick={() => void navigate({ to: "/pedidos/$id", params: { id: trabajo.pedido_id }, search: { from: "operario" } })}
                className="rounded-xl border border-border bg-card p-4 text-left shadow-card transition hover:border-gold"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{trabajo.area}</p>
                    <p className="mt-1 font-semibold text-foreground">{trabajo.titulo}</p>
                    {trabajo.descripcion ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{trabajo.descripcion}</p> : null}
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${trabajo.estado === "en_proceso" ? "border-info/30 bg-info/10 text-info" : trabajo.estado === "bloqueado" ? "border-warning/30 bg-warning/10 text-warning" : "border-border bg-surface-muted text-muted-foreground"}`}>
                    {trabajo.estado === "en_proceso" ? "En proceso" : trabajo.estado === "bloqueado" ? "Bloqueado" : "Pendiente"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
                  <span>Pedido: {trabajo.pedido_id.slice(0, 8)}…</span>
                  <span>Fecha: {trabajo.fecha_planificada || "Sin fecha"}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
            No tienes trabajos asignados pendientes. Cuando un administrador te asigne uno aparecerá aquí.
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-card">
            Cargando tus áreas...
          </div>
        ) : null}

        {!isLoading && conteos.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <p className="text-base font-semibold">Sin áreas asignadas</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Pide a un administrador que asigne tus áreas de trabajo.
            </p>
          </div>
        ) : null}

        {conteos.map(({ area, programados, enTrabajo, urgentes }) => {
          const Icono = iconosArea[area] ?? Hammer;
          return (
            <button
              key={area}
              type="button"
              onClick={() => void navigate({ to: areaRuta[area] as never })}
              className="min-h-[132px] rounded-2xl border border-border bg-card p-5 text-left shadow-card transition hover:border-gold focus-visible:border-gold focus-visible:outline-none"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-ink text-gold">
                  <Icono className="size-5" aria-hidden="true" />
                </span>
                <ChevronRight className="mt-1 size-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-xl font-semibold">{area}</h2>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-surface-muted px-3 py-1.5 text-muted-foreground">
                  {enTrabajo.length} pendiente{enTrabajo.length === 1 ? "" : "s"}
                </span>
                {programados.length > 0 ? (
                  <span className="rounded-full bg-info-soft px-3 py-1.5 text-info">
                    {programados.length} por llegar
                  </span>
                ) : null}
                {urgentes.length > 0 ? (
                  <span className="rounded-full bg-danger-soft px-3 py-1.5 text-danger">
                    {urgentes.length} urgente{urgentes.length === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}

        {puedeHerramientas ? (
          <button
            type="button"
            onClick={() => void navigate({ to: "/taller" })}
            className="min-h-[116px] rounded-2xl border border-border bg-card p-5 text-left shadow-card transition hover:border-gold focus-visible:border-gold focus-visible:outline-none"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-warning-soft text-warning">
                <Wrench className="size-5" aria-hidden="true" />
              </span>
              <ChevronRight className="mt-1 size-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-xl font-semibold">Herramientas</h2>
            <p className="mt-2 text-sm text-muted-foreground">Calculadoras técnicas del taller.</p>
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => void navigate({ to: "/perfil" })}
          className="min-h-[116px] rounded-2xl border border-border bg-card p-5 text-left shadow-card transition hover:border-gold focus-visible:border-gold focus-visible:outline-none"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-surface-muted text-muted-foreground">
              <UserRound className="size-5" aria-hidden="true" />
            </span>
            <ChevronRight className="mt-1 size-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">Perfil</h2>
          <p className="mt-2 text-sm text-muted-foreground">Tus datos, sede y cierre de sesión.</p>
        </button>
      </section>
    </AppShell>
  );
}
