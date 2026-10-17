import { useQuery } from "@tanstack/react-query";
import { Building2, CheckCircle2, Clock3, ExternalLink, PackageCheck, TriangleAlert } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fmtFecha } from "@/lib/utils";

function estadoLabel(estado: string) {
  if (estado === "en_proceso") return "En proceso";
  if (estado === "bloqueado") return "Bloqueado";
  if (estado === "completado") return "Completado";
  if (estado === "cancelado") return "Cancelado";
  return "Pendiente";
}

function estadoClase(estado: string) {
  if (estado === "completado") return "border-success/30 bg-success/10 text-success";
  if (estado === "bloqueado") return "border-danger/30 bg-danger-soft text-danger";
  if (estado === "en_proceso") return "border-gold/30 bg-gold/10 text-gold-deep";
  return "border-border bg-surface-muted text-muted-foreground";
}

export function ServiciosExternosEnviadosAdmin({ sedeId }: { sedeId: string | null }) {
  const { data: servicios = [], isLoading, error } = useQuery({
    queryKey: ["servicios-externos-enviados-admin", sedeId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("listar_servicios_externos_enviados", {
        _sede_id: sedeId,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const pendientes = servicios.filter((s: any) => ["pendiente", "en_proceso", "bloqueado"].includes(s.estado)).length;
  const completados = servicios.filter((s: any) => s.estado === "completado").length;
  const bloqueados = servicios.filter((s: any) => s.estado === "bloqueado").length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gold/20 bg-card p-4">
          <p className="text-[9px] font-bold uppercase tracking-[.16em] text-muted-foreground">Pendientes / en curso</p>
          <p className="mt-1 font-display text-2xl">{pendientes}</p>
        </div>
        <div className="rounded-2xl border border-success/20 bg-card p-4">
          <p className="text-[9px] font-bold uppercase tracking-[.16em] text-muted-foreground">Completados</p>
          <p className="mt-1 font-display text-2xl">{completados}</p>
        </div>
        <div className="rounded-2xl border border-danger/20 bg-card p-4">
          <p className="text-[9px] font-bold uppercase tracking-[.16em] text-muted-foreground">Bloqueados</p>
          <p className="mt-1 font-display text-2xl">{bloqueados}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <div className="flex items-center gap-2">
              <ExternalLink className="size-5 text-gold-deep" />
              <h2 className="text-lg font-semibold">Servicios externos enviados</h2>
              <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold-deep">{servicios.length}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Seguimiento de trabajos que este taller encargó a otro participante del ecosistema.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Cargando servicios externos…</div>
        ) : error ? (
          <div className="p-6">
            <p className="text-sm font-semibold text-danger">No se pudieron cargar los servicios externos.</p>
            <p className="mt-1 text-xs text-danger/80">{error instanceof Error ? error.message : "Error de comunicación"}</p>
          </div>
        ) : servicios.length === 0 ? (
          <div className="p-8 text-center">
            <ExternalLink className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No hay servicios externos enviados.</p>
            <p className="mt-1 text-xs text-muted-foreground">Cuando una operación sea derivada a otro taller aparecerá aquí.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {servicios.map((servicio: any) => (
              <Link
                key={servicio.id}
                to="/trabajos/$id"
                params={{ id: servicio.id }}
                className="block p-5 transition hover:bg-gold/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{servicio.titulo || servicio.pieza || "Servicio sin título"}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${estadoClase(servicio.estado)}`}>
                        {estadoLabel(servicio.estado)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="size-3.5" />
                        Ejecuta: {servicio.destino_participante_nombre || "Sin asignar"}
                      </span>
                      <span>{servicio.referencia_pedido || "Pedido sin referencia"}</span>
                      <span>{servicio.area}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {servicio.fecha_planificada ? fmtFecha(servicio.fecha_planificada) : "Sin fecha planificada"}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  <div className="rounded-xl bg-surface-muted/60 p-3">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Pedido</p>
                    <p className="mt-1 text-xs font-semibold">{servicio.referencia_pedido || "—"}</p>
                  </div>
                  <div className="rounded-xl bg-surface-muted/60 p-3">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Ejecutor</p>
                    <p className="mt-1 text-xs font-semibold">{servicio.destino_participante_nombre || "—"}</p>
                  </div>
                  <div className="rounded-xl bg-surface-muted/60 p-3">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Responsable</p>
                    <p className="mt-1 text-xs font-semibold">{servicio.responsable_nombre || "Aún no tomado"}</p>
                  </div>
                  <div className="rounded-xl bg-surface-muted/60 p-3">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Piezas</p>
                    <p className="mt-1 text-xs font-semibold">{servicio.cantidad_piezas ?? "—"}</p>
                  </div>
                </div>

                {servicio.estado === "bloqueado" ? (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-danger/20 bg-danger-soft p-3 text-xs text-danger">
                    <TriangleAlert className="size-4 shrink-0" />
                    Servicio bloqueado. Revisar la ficha del trabajo.
                  </div>
                ) : servicio.estado === "completado" ? (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-success/20 bg-success/10 p-3 text-xs text-success">
                    <CheckCircle2 className="size-4 shrink-0" />
                    El taller receptor marcó la operación como completada.
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Clock3 className="size-3.5" />
                    El estado se actualiza sobre el mismo trabajo operativo.
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 border-t border-border p-4 text-[11px] text-muted-foreground">
          <PackageCheck className="size-4 text-gold-deep" />
          El administrador controla el envío y seguimiento; el taller receptor solo recibe la información técnica necesaria para ejecutar.
        </div>
      </section>
    </div>
  );
}
