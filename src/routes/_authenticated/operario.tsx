import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Boxes, ChevronRight, Hammer, LayoutGrid, UserRound, Wrench } from "lucide-react";
import { useMemo } from "react";
import { areaCoincide, areaRuta, normalizarArea, useCerrarSesion, useSesion } from "@/lib/auth";
import { usePedidos, type Pedido } from "@/lib/taller-db";
import { pedidoAsignadoAArea, pedidoEnAreaActual } from "@/hooks/use-pedidos-area";

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
  const cerrarSesion = useCerrarSesion();
  const navigate = useNavigate();

  const areas = useMemo(() => areasAsignadasUnicas(sesion?.areas ?? []), [sesion?.areas]);
  const conteos = useMemo(
    () =>
      areas.map((area) => {
        const asignados = pedidos.filter(
          (pedido) =>
            pedido.estado !== "Entregado" &&
            pedido.estado !== "Cancelado" &&
            pedidoAsignadoAArea(pedido, area),
        );
        const enTrabajo = asignados.filter((pedido) => pedidoEnAreaActual(pedido, area));
        const urgentes = asignados.filter(esUrgente);
        return { area, asignados, enTrabajo, urgentes };
      }),
    [areas, pedidos],
  );

  const nombre = sesion?.perfil.nombre?.trim() || "Operario";
  const puedeHerramientas = areas.some((area) => areaCoincide(area, "Taller"));

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mi trabajo
          </p>
          <h1 className="mt-1 truncate font-display text-3xl">Hola {nombre}</h1>
          <p className="mt-1 text-base text-muted-foreground">¿Qué deseas hacer?</p>
        </div>
        <button
          type="button"
          onClick={() => void cerrarSesion()}
          className="shrink-0 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground"
        >
          Salir
        </button>
      </header>

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

        {conteos.map(({ area, asignados, enTrabajo, urgentes }) => {
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
                  {asignados.length} pendientes
                </span>
                {enTrabajo.length > 0 ? (
                  <span className="rounded-full bg-info-soft px-3 py-1.5 text-info">
                    {enTrabajo.length} en área
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
    </main>
  );
}
