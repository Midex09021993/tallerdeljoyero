import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Boxes, ChevronRight, Hammer, LayoutGrid, UserRound, Wrench } from "lucide-react";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { areaCoincide, areaRuta, normalizarArea, useSesion } from "@/lib/auth";
import { usePedidosSelector, type PedidoSelector } from "@/lib/taller-db";
import { useTrabajosDelOperario } from "@/hooks/use-pedidos-area";
import { useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";

export const Route = createFileRoute("/_authenticated/operario")({
  head: () => ({
    meta: [
      { title: "Mi trabajo — Aurum Lab" },
      {
        name: "description",
        content: "Inicio rápido del operario con áreas asignadas y trabajos pendientes.",
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

function diasHastaEntrega(pedido: PedidoSelector) {
  const fechaIso = pedido.fecha_entrega ?? pedido.entrega;
  if (!fechaIso) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const entrega = new Date(fechaIso);
  if (Number.isNaN(entrega.getTime())) return null;
  entrega.setHours(0, 0, 0, 0);
  return Math.ceil((entrega.getTime() - hoy.getTime()) / 86_400_000);
}

function esUrgenteTrabajo(
  trabajo: { prioridad: string; pedido_id: string },
  pedidosPorId: Map<string, PedidoSelector>,
) {
  if (trabajo.prioridad === "urgente") return true;
  const pedido = pedidosPorId.get(trabajo.pedido_id);
  const dias = pedido ? diasHastaEntrega(pedido) : null;
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
  const { data: pedidos = [], isLoading: isLoadingPedidos } = usePedidosSelector();
  const { trabajos, isLoading: isLoadingTrabajos, error: errorTrabajos } = useTrabajosDelOperario();
  const navigate = useNavigate();
  const { filtrarPedidos } = useSedeFiltroDueno();

  const areas = useMemo(() => areasAsignadasUnicas(sesion?.areas ?? []), [sesion?.areas]);
  const pedidosPorId = useMemo(
    () => new Map(filtrarPedidos(pedidos).map((pedido) => [pedido.id, pedido])),
    [filtrarPedidos, pedidos],
  );

  const conteos = useMemo(
    () =>
      areas.map((area) => {
        const asignados = trabajos.filter((trabajo) => areaCoincide(trabajo.area, area));
        const urgentes = asignados.filter((trabajo) => esUrgenteTrabajo(trabajo, pedidosPorId));
        return { area, asignados, urgentes };
      }),
    [areas, pedidosPorId, trabajos],
  );

  const isLoading = isLoadingPedidos || isLoadingTrabajos;
  const nombre = sesion?.perfil.nombre?.trim() || "Operario";
  const puedeHerramientas = areas.some((area) => areaCoincide(area, "Taller"));

  return (
    <AppShell
      titulo={`Hola ${nombre}`}
      subtitulo="Tus trabajos asignados"
      atrasMovil={false}
    >
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-card">
            Cargando tus trabajos...
          </div>
        ) : null}

        {errorTrabajos ? (
          <div className="rounded-2xl border border-danger/30 bg-danger-soft p-5 text-sm text-danger">
            <p className="font-semibold">No se pudieron cargar tus trabajos</p>
            <p className="mt-1 break-words text-xs opacity-90">{errorTrabajos}</p>
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

        {conteos.map(({ area, asignados, urgentes }) => {
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
                  {asignados.length} pendiente{asignados.length === 1 ? "" : "s"}
                </span>
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

      <section className="mt-5 lg:hidden">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-deep">Producción</p>
            <h2 className="mt-1 text-xl font-semibold">Fichas técnicas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Aquí tienes directamente los trabajos que te corresponden.
            </p>
          </div>
          <span className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-bold">
            {trabajos.length}
          </span>
        </div>

        {trabajos.length === 0 && !isLoadingTrabajos ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
            No tienes fichas técnicas activas en este momento. Si ya te asignaron un trabajo,
            actualiza la pantalla o revisa con administración que tu área y sede coincidan con la operación.
          </div>
        ) : (
          <div className="space-y-3">
            {trabajos.map((trabajo) => {
              const pedido = pedidosPorId.get(trabajo.pedido_id);
              const asignado = trabajo.responsable_user_id === sesion?.user.id;
              const material = pedido?.material?.trim() || "—";
              const piedras = pedido?.piedras?.trim() || "—";
              const talla = pedido?.talla?.trim() || "—";
              const peso = pedido?.peso_estimado?.trim() || "—";
              const cantidad = pedido?.cantidad_piezas || 1;
              const entrega = pedido ? diasHastaEntrega(pedido) : null;

              return (
                <article
                  key={trabajo.id}
                  className="rounded-2xl border border-gold/20 bg-card p-4 shadow-card"
                >
                  <button
                    type="button"
                    onClick={() => void navigate({ to: "/trabajos/$id", params: { id: trabajo.id } })}
                    className="w-full text-left"
                    aria-label={`Abrir ficha técnica de ${trabajo.titulo || "trabajo sin título"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold">
                          {trabajo.titulo || pedido?.referencia || "Trabajo sin título"}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {pedido?.referencia || "Pedido"} · {trabajo.area}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-gold/10 px-2.5 py-1 text-[10px] font-bold uppercase text-gold-deep">
                        {trabajo.estado === "en_proceso"
                          ? "En proceso"
                          : trabajo.estado === "bloqueado"
                            ? "Bloqueado"
                            : "Pendiente"}
                      </span>
                    </div>

                    <div className="mt-3 rounded-2xl border border-border bg-surface-muted/50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold-deep">
                        Ficha técnica
                      </p>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-card p-2.5">
                          <dt className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Material
                          </dt>
                          <dd className="mt-1 truncate font-medium">{material}</dd>
                        </div>
                        <div className="rounded-xl bg-card p-2.5">
                          <dt className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Piedras
                          </dt>
                          <dd className="mt-1 truncate font-medium">{piedras}</dd>
                        </div>
                        <div className="rounded-xl bg-card p-2.5">
                          <dt className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Talla
                          </dt>
                          <dd className="mt-1 truncate font-medium">{talla}</dd>
                        </div>
                        <div className="rounded-xl bg-card p-2.5">
                          <dt className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Peso
                          </dt>
                          <dd className="mt-1 truncate font-medium">{peso}</dd>
                        </div>
                        <div className="rounded-xl bg-card p-2.5">
                          <dt className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Cantidad
                          </dt>
                          <dd className="mt-1 truncate font-medium">{cantidad}</dd>
                        </div>
                        <div className="rounded-xl bg-card p-2.5">
                          <dt className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Entrega
                          </dt>
                          <dd className="mt-1 truncate font-medium">
                            {entrega === null ? "—" : entrega < 0 ? "Vencida" : entrega === 0 ? "Hoy" : `En ${entrega} días`}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {trabajo.descripcion ? (
                      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                        {trabajo.descripcion}
                      </p>
                    ) : null}

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-muted-foreground">
                        {asignado ? "Asignado a ti" : "Disponible para tu área"}
                      </span>
                      <span className="rounded-full bg-gold px-3 py-2 text-xs font-bold text-gold-foreground">
                        Abrir ficha técnica
                      </span>
                    </div>
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>      </section>
    </AppShell>
  );
}
