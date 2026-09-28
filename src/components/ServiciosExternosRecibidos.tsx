import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Building2, Clock3, ExternalLink, PackageCheck } from "lucide-react";
import { useServiciosExternosRecibidos } from "@/hooks/use-servicios-externos";

function etiquetaEstado(estado: string) {
  if (estado === "en_proceso") return "En proceso";
  if (estado === "bloqueado") return "Bloqueado";
  return "Pendiente";
}

export function ServiciosExternosRecibidos() {
  const { data: servicios = [], isLoading, error } = useServiciosExternosRecibidos();

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-gold/20 bg-card p-5 shadow-card">
        <p className="text-sm text-muted-foreground">Cargando servicios recibidos…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-danger/30 bg-danger-soft p-5">
        <p className="text-sm font-semibold text-danger">No se pudieron cargar los servicios recibidos.</p>
        <p className="mt-1 text-xs text-danger/80">{error instanceof Error ? error.message : "Error de comunicación"}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gold/25 bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <div className="flex items-center gap-2">
            <ExternalLink className="size-5 text-gold-deep" />
            <h2 className="text-lg font-semibold">Servicios recibidos</h2>
            {servicios.length > 0 ? (
              <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold-deep">{servicios.length}</span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Trabajos que otro taller envió a este taller para ejecutar.
          </p>
        </div>
      </div>

      {servicios.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">
          No hay servicios externos pendientes.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {servicios.map((servicio) => (
            <Link
              key={servicio.id}
              to="/trabajos/$id"
              params={{ id: servicio.id }}
              className="block p-5 transition hover:bg-gold/5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">
                      {servicio.titulo || servicio.pieza || "Servicio sin título"}
                    </p>
                    <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gold-deep">
                      Servicio externo
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="size-3.5" />
                      Solicita: {servicio.origen_participante_nombre}
                    </span>
                    <span>{servicio.referencia_pedido || "Pedido sin referencia"}</span>
                    <span>{servicio.area}</span>
                  </div>
                </div>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                <div className="rounded-xl bg-surface-muted/60 p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Estado</p>
                  <p className="mt-1 text-xs font-semibold">{etiquetaEstado(servicio.estado)}</p>
                </div>
                <div className="rounded-xl bg-surface-muted/60 p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Prioridad</p>
                  <p className="mt-1 text-xs font-semibold">{servicio.prioridad}</p>
                </div>
                <div className="rounded-xl bg-surface-muted/60 p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Piezas</p>
                  <p className="mt-1 text-xs font-semibold">{servicio.cantidad_piezas ?? "—"}</p>
                </div>
                <div className="rounded-xl bg-surface-muted/60 p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Planificado</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold">
                    <Clock3 className="size-3.5" />
                    {servicio.fecha_planificada || "—"}
                  </p>
                </div>
              </div>

              {servicio.descripcion ? (
                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{servicio.descripcion}</p>
              ) : null}
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-border p-4 text-[11px] text-muted-foreground">
        <PackageCheck className="size-4 text-gold-deep" />
        La información mostrada es operativa. Los costos y datos comerciales internos del taller de origen no se comparten.
      </div>
    </section>
  );
}
