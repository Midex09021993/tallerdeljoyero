import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, ExternalLink, UserRound, Wrench } from "lucide-react";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { ServiciosExternosRecibidos } from "@/components/ServiciosExternosRecibidos";
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
        content: "Bandeja de trabajos del operario con acceso directo a sus fichas técnicas.",
      },
    ],
  }),
  component: OperarioPage,
});

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
  const { data: pedidos = [] } = usePedidosSelector();
  const { trabajos, isLoading: isLoadingTrabajos, error: errorTrabajos } = useTrabajosDelOperario();
  const navigate = useNavigate();
  const { filtrarPedidos } = useSedeFiltroDueno();

  const areas = useMemo(() => areasAsignadasUnicas(sesion?.areas ?? []), [sesion?.areas]);
  const pedidosPorId = useMemo(
    () => new Map(filtrarPedidos(pedidos).map((pedido) => [pedido.id, pedido])),
    [filtrarPedidos, pedidos],
  );

  const trabajosOrdenados = useMemo(() => {
    return [...trabajos].sort((a, b) => {
      const aUrgente = esUrgenteTrabajo(a, pedidosPorId);
      const bUrgente = esUrgenteTrabajo(b, pedidosPorId);
      if (aUrgente !== bUrgente) return aUrgente ? -1 : 1;

      const aPedido = pedidosPorId.get(a.pedido_id);
      const bPedido = pedidosPorId.get(b.pedido_id);
      const aDias = aPedido ? diasHastaEntrega(aPedido) : null;
      const bDias = bPedido ? diasHastaEntrega(bPedido) : null;
      if (aDias === null && bDias === null) return 0;
      if (aDias === null) return 1;
      if (bDias === null) return -1;
      return aDias - bDias;
    });
  }, [pedidosPorId, trabajos]);

  const resumen = useMemo(() => {
    const urgentes = trabajos.filter((trabajo) => esUrgenteTrabajo(trabajo, pedidosPorId)).length;
    const enProceso = trabajos.filter((trabajo) => trabajo.estado === "en_proceso").length;
    const pendientes = trabajos.filter((trabajo) => trabajo.estado === "pendiente").length;
    return { urgentes, enProceso, pendientes };
  }, [pedidosPorId, trabajos]);

  const nombre = sesion?.perfil.nombre?.trim() || "Operario";
  const puedeHerramientas = areas.some((area) => areaCoincide(area, "Taller"));

  return (
    <AppShell
      titulo={`Hola ${nombre}`}
      subtitulo="Tu trabajo de hoy"
      atrasMovil={false}
    >
      <div className="space-y-5">
        <section className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Resumen de trabajo">
          <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Pendientes</p>
            <p className="mt-1 text-2xl font-semibold">{resumen.pendientes}</p>
          </div>
          <div className={`rounded-2xl border p-3 shadow-card ${resumen.urgentes > 0 ? "border-danger/30 bg-danger-soft" : "border-border bg-card"}`}>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Urgentes</p>
            <p className={`mt-1 text-2xl font-semibold ${resumen.urgentes > 0 ? "text-danger" : ""}`}>{resumen.urgentes}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">En proceso</p>
            <p className="mt-1 text-2xl font-semibold">{resumen.enProceso}</p>
          </div>
        </section>

        <section aria-labelledby="mis-trabajos">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-deep">Tu bandeja</p>
              <h2 id="mis-trabajos" className="mt-1 text-xl font-semibold">Mis trabajos</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Abre una ficha para saber exactamente qué hacer.
              </p>
            </div>
            <span className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-bold">
              {trabajosOrdenados.length}
            </span>
          </div>

          {isLoadingTrabajos ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-card">
              Cargando tus trabajos...
            </div>
          ) : null}

          {errorTrabajos ? (
            <div className="rounded-2xl border border-danger/30 bg-danger-soft p-5 text-sm text-danger">
              <p className="font-semibold">No se pudieron cargar tus trabajos</p>
              <p className="mt-1 break-words text-xs opacity-90">{errorTrabajos}</p>
            </div>
          ) : null}

          {!isLoadingTrabajos && !errorTrabajos && trabajosOrdenados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center shadow-card">
              <p className="text-base font-semibold">No tienes trabajos pendientes</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Cuando te asignen un trabajo aparecerá aquí con su ficha técnica.
              </p>
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-2">
            {trabajosOrdenados.map((trabajo) => {
              const pedido = pedidosPorId.get(trabajo.pedido_id);
              const asignado = trabajo.responsable_user_id === sesion?.user.id;
              const material = pedido?.material?.trim() || "—";
              const piedras = pedido?.piedras?.trim() || "—";
              const talla = pedido?.talla?.trim() || "—";
              const peso = pedido?.peso_estimado?.trim() || "—";
              const cantidad = pedido?.cantidad_piezas || 1;
              const entrega = pedido ? diasHastaEntrega(pedido) : null;
              const urgente = esUrgenteTrabajo(trabajo, pedidosPorId);

              return (
                <article
                  key={trabajo.id}
                  className={`rounded-2xl border bg-card p-4 shadow-card transition ${urgente ? "border-danger/30" : "border-border"}`}
                >
                  <button
                    type="button"
                    onClick={() => void navigate({ to: "/trabajos/$id", params: { id: trabajo.id } })}
                    className="w-full text-left focus-visible:outline-none"
                    aria-label={`Abrir ficha técnica de ${trabajo.titulo || "trabajo sin título"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold">
                          {trabajo.titulo || pedido?.referencia || "Trabajo sin título"}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{pedido?.referencia || "Pedido"}</span>
                          <span>·</span>
                          <span>{trabajo.area}</span>
                          {trabajo.tipo === "externo" ? (
                            <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gold-deep">
                              Externo
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                      <span className={`rounded-full px-2.5 py-1 ${urgente ? "bg-danger-soft text-danger" : "bg-surface-muted text-muted-foreground"}`}>
                        {urgente ? "Prioridad alta" : trabajo.estado === "en_proceso" ? "En proceso" : "Pendiente"}
                      </span>
                      {entrega !== null ? (
                        <span className={`rounded-full bg-surface-muted px-2.5 py-1 ${entrega <= 0 ? "text-danger" : "text-muted-foreground"}`}>
                          {entrega < 0 ? "Entrega vencida" : entrega === 0 ? "Entrega hoy" : entrega === 1 ? "Entrega mañana" : `Entrega en ${entrega} días`}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {[
                        ["Material", material],
                        ["Piedras", piedras],
                        ["Talla", talla],
                        ["Peso", peso],
                        ["Cantidad", cantidad],
                        ["Responsable", asignado ? "Tú" : "Tu área"],
                      ].map(([etiqueta, valor]) => (
                        <div key={String(etiqueta)} className="rounded-xl bg-surface-muted/50 p-2.5">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{etiqueta}</p>
                          <p className="mt-1 truncate text-xs font-medium">{String(valor)}</p>
                        </div>
                      ))}
                    </div>

                    {trabajo.descripcion ? (
                      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{trabajo.descripcion}</p>
                    ) : null}

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-muted-foreground">
                        La ficha contiene instrucciones y archivos técnicos.
                      </span>
                      <span className="shrink-0 rounded-lg bg-gold px-3 py-2 text-xs font-bold text-gold-foreground">
                        Ver ficha
                      </span>
                    </div>
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <details className="rounded-2xl border border-border bg-card shadow-card">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Segundo nivel</p>
              <h2 className="mt-1 text-base font-semibold">Servicios externos</h2>
              <p className="mt-1 text-xs text-muted-foreground">Pedidos recibidos de otros talleres o áreas.</p>
            </div>
            <ExternalLink className="size-5 shrink-0 text-gold-deep" aria-hidden="true" />
          </summary>
          <div className="border-t border-border p-2">
            <ServiciosExternosRecibidos />
          </div>
        </details>

        <section className="grid gap-2 sm:grid-cols-2">
          {puedeHerramientas ? (
            <button
              type="button"
              onClick={() => void navigate({ to: "/herramientas" })}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-card transition hover:border-gold focus-visible:outline-none"
            >
              <span>
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Wrench className="size-4 text-gold-deep" aria-hidden="true" />
                  Herramientas
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">Calculadoras y utilidades técnicas.</span>
              </span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => void navigate({ to: "/perfil" })}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-card transition hover:border-gold focus-visible:outline-none"
          >
            <span>
              <span className="flex items-center gap-2 text-sm font-semibold">
                <UserRound className="size-4 text-gold-deep" aria-hidden="true" />
                Mi perfil
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">Datos de acceso y sesión.</span>
            </span>
            <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
          </button>
        </section>
      </div>
    </AppShell>
  );
}
