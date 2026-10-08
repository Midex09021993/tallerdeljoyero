import { useQuery } from "@tanstack/react-query";
import { Eye, MousePointerClick, MessageCircle, Send, Sparkles, Users, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Panel } from "@/components/AppShell";

type AnalyticsSummary = {
  dias: number;
  desde: string;
  total_eventos: number;
  sesiones: number;
  eventos: Record<string, number>;
  diario: Array<{ fecha: string; eventos: number; sesiones: number }>;
};

const EVENT_LABELS: Record<string, string> = {
  page_view: "Visitas",
  tool_opened: "Herramientas abiertas",
  render_opened: "AURUM Render",
  platform_opened: "Conocer plataforma",
  catalog_opened: "Catálogo",
  product_viewed: "Productos vistos",
  whatsapp_clicked: "WhatsApp",
  access_request_started: "Solicitudes iniciadas",
  access_request_submitted: "Solicitudes enviadas",
  login_started: "Login iniciado",
  login_completed: "Login completado",
};

const EVENT_ICONS: Record<string, typeof Eye> = {
  page_view: Eye,
  tool_opened: Wrench,
  render_opened: Sparkles,
  platform_opened: MousePointerClick,
  catalog_opened: Eye,
  product_viewed: Eye,
  whatsapp_clicked: MessageCircle,
  access_request_started: Send,
  access_request_submitted: Send,
  login_started: Users,
  login_completed: Users,
};

export function AnaliticaAurumLab() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<AnalyticsSummary>({
    queryKey: ["analitica-aurum-lab", 30],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("obtener_analitica_aurum_lab", { _dias: 30 });
      if (error) throw new Error(error.message);
      return data as AnalyticsSummary;
    },
    staleTime: 60_000,
  });

  const eventos = data?.eventos ?? {};
  const visitas = eventos["page_view"] ?? 0;
  const solicitudes = eventos["access_request_submitted"] ?? 0;
  const logins = eventos["login_completed"] ?? 0;
  const whatsapp = eventos["whatsapp_clicked"] ?? 0;
  const herramientas = eventos["tool_opened"] ?? 0;
  const conversionSolicitud = visitas ? ((solicitudes / visitas) * 100).toFixed(1) : "0.0";
  const conversionLogin = visitas ? ((logins / visitas) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Aurum Lab · Datos reales</p>
          <h2 className="mt-1 text-xl font-semibold">Analítica del embudo público</h2>
          <p className="mt-1 text-sm text-muted-foreground">Últimos 30 días · sin IP ni datos personales.</p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-surface-muted disabled:opacity-50"
        >
          {isFetching ? "Actualizando…" : "Actualizar"}
        </button>
      </div>

      {isLoading ? <Panel titulo="Analítica"><div className="p-6 text-sm text-muted-foreground">Cargando datos…</div></Panel> : null}

      {error ? (
        <Panel titulo="Analítica">
          <div className="p-6">
            <p className="text-sm text-destructive">No se pudo cargar la analítica.</p>
            <p className="mt-1 text-xs text-muted-foreground">{error instanceof Error ? error.message : "Error desconocido"}</p>
          </div>
        </Panel>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi icon={Eye} label="Visitas" value={visitas} />
            <Kpi icon={Users} label="Sesiones" value={data.sesiones} />
            <Kpi icon={Wrench} label="Herramientas usadas" value={herramientas} />
            <Kpi icon={MessageCircle} label="WhatsApp" value={whatsapp} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel titulo="Conversión">
              <div className="grid gap-3 p-5 sm:grid-cols-2">
                <Conversion label="Visita → solicitud" value={conversionSolicitud + "%"} detail={`${solicitudes} solicitudes enviadas`} />
                <Conversion label="Visita → acceso" value={conversionLogin + "%"} detail={`${logins} accesos completados`} />
              </div>
            </Panel>

            <Panel titulo="Recorrido">
              <div className="divide-y divide-border">
                {Object.entries(EVENT_LABELS)
                  .filter(([key]) => key !== "page_view")
                  .map(([key, label]) => {
                    const Icon = EVENT_ICONS[key] ?? MousePointerClick;
                    const value = eventos[key] ?? 0;
                    return (
                      <div key={key} className="flex items-center justify-between gap-3 px-5 py-2.5">
                        <span className="flex items-center gap-2 text-xs">
                          <Icon className="size-3.5 text-primary" />
                          {label}
                        </span>
                        <span className="text-xs font-semibold tabular-nums">{value}</span>
                      </div>
                    );
                  })}
              </div>
            </Panel>
          </div>

          <Panel titulo="Actividad diaria">
            <div className="overflow-x-auto p-5">
              {data.diario.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todavía no hay eventos registrados.</p>
              ) : (
                <div className="space-y-2">
                  {data.diario.slice(-14).map((dia) => {
                    const max = Math.max(...data.diario.slice(-14).map((d) => d.eventos), 1);
                    const width = Math.max(2, (dia.eventos / max) * 100);
                    return (
                      <div key={dia.fecha} className="grid grid-cols-[82px_1fr_55px] items-center gap-3 text-xs">
                        <span className="text-muted-foreground">{dia.fecha.slice(5)}</span>
                        <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                        </div>
                        <span className="text-right tabular-nums">{dia.eventos}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Panel>
        </>
      ) : null}
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className="size-4 text-primary" />
      <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString("es-PE")}</p>
    </div>
  );
}

function Conversion({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-primary">{value}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{detail}</p>
    </div>
  );
}
