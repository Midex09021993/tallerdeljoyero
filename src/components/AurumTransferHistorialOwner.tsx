import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Files, HardDrive, Send, Clock3, CheckCircle2, CircleDashed, TimerReset, Search, Filter, BarChart3 } from "lucide-react";
import { Panel, StatCard } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

type TransferUsage = {
  id: string;
  transfer_id: string;
  created_at: string;
  file_count: number;
  total_bytes: number;
  status: "available" | "consumed" | "expired";
  consumed_at: string | null;
  expires_at: string | null;
};

type TransferMetrics = {
  transfer_count: number;
  downloaded_count: number;
  total_bytes: number;
  available_count: number;
  expired_count: number;
  file_count: number;
  last_activity: string | null;
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function estadoTransferencia(item: TransferUsage) {
  if (item.status === "consumed") return { label: "Descargada", tone: "text-emerald-600", dot: "bg-emerald-500" };
  if (item.status === "expired" || (item.expires_at && new Date(item.expires_at) <= new Date())) {
    return { label: "Expirada", tone: "text-muted-foreground", dot: "bg-muted-foreground" };
  }
  return { label: "Disponible", tone: "text-primary", dot: "bg-primary" };
}

function relativeTime(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `Hace ${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${Math.round(hours / 24)} d`;
}

export function AurumTransferHistorialOwner() {
  const [filtro, setFiltro] = useState<"todas" | "disponibles" | "descargadas" | "expiradas">("todas");
  const [busqueda, setBusqueda] = useState("");

  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ["aurum-transfer-usage-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_aurum_transfer_usage_metrics");
      if (error) throw error;
      return (data?.[0] ?? {
        transfer_count: 0,
        downloaded_count: 0,
        total_bytes: 0,
        available_count: 0,
        expired_count: 0,
        file_count: 0,
        last_activity: null,
      }) as TransferMetrics;
    },
    staleTime: 30_000,
  });

  const { data = [], isLoading: activityLoading, error: activityError } = useQuery({
    queryKey: ["aurum-transfer-usage-owner"],
    queryFn: async () => {
      const { data, error } = await supabase.from("aurum_transfer_usage")
        .select("id,transfer_id,created_at,file_count,total_bytes,status,consumed_at,expires_at")
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as TransferUsage[];
    },
    staleTime: 30_000,
  });

  const actividad = useMemo(() => data.filter((item) => {
    const expirada = item.status === "expired" || (item.status === "available" && !!item.expires_at && new Date(item.expires_at) <= new Date());
    const matchesFilter =
      filtro === "todas" ||
      (filtro === "disponibles" && item.status === "available" && !expirada) ||
      (filtro === "descargadas" && item.status === "consumed") ||
      (filtro === "expiradas" && expirada);
    const matchesSearch = !busqueda.trim() || item.transfer_id.toLowerCase().includes(busqueda.trim().toLowerCase());
    return matchesFilter && matchesSearch;
  }), [data, filtro, busqueda]);

  const m = metrics ?? {
    transfer_count: 0,
    downloaded_count: 0,
    total_bytes: 0,
    available_count: 0,
    expired_count: 0,
    file_count: 0,
    last_activity: null,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">AURUM Transfers</p>
          <h2 className="mt-1 text-2xl font-semibold">Historial de uso</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Métricas globales de la herramienta pública. Solo registra uso y metadatos operativos; no guarda ni muestra el contenido de los archivos.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Uso acumulado</p>
          <p className="mt-1 text-lg font-semibold">{formatBytes(Number(m.total_bytes))}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{Number(m.file_count)} archivos transferidos</p>
        </div>
      </div>

      {metricsError ? (
        <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          No se pudieron cargar las métricas globales.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard etiqueta="Transferencias" valor={metricsLoading ? "…" : String(Number(m.transfer_count))} />
        <StatCard etiqueta="Descargadas" valor={metricsLoading ? "…" : String(Number(m.downloaded_count))} tono="positivo" />
        <StatCard etiqueta="Datos transferidos" valor={metricsLoading ? "…" : formatBytes(Number(m.total_bytes))} />
        <StatCard etiqueta="Disponibles" valor={metricsLoading ? "…" : String(Number(m.available_count))} />
        <StatCard etiqueta="Expiradas" valor={metricsLoading ? "…" : String(Number(m.expired_count))} />
      </div>

      <Panel titulo="Actividad reciente">
        <div className="border-b border-border px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por ID de transferencia"
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" />
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                ["todas", "Todas"], ["disponibles", "Pendientes"], ["descargadas", "Descargadas"], ["expiradas", "Expiradas"],
              ] as const).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setFiltro(id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${filtro === id ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-surface-muted"}`}>
                  {id === "todas" ? <Filter className="size-3.5" /> : null}{label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activityLoading ? <p className="px-6 py-10 text-sm text-muted-foreground">Cargando actividad…</p>
        : activityError ? <p className="px-6 py-10 text-sm text-danger">No se pudo cargar la actividad.</p>
        : actividad.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <Send className="mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">{data.length ? "No hay resultados para este filtro." : "Aún no hay actividad registrada."}</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">{data.length ? "Prueba otro estado o limpia la búsqueda." : "Cuando se cree una transferencia pública aparecerá aquí."}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {actividad.map((item) => {
              const estado = estadoTransferencia(item);
              const Icon = item.status === "consumed" ? CheckCircle2 : estado.label === "Expirada" ? TimerReset : CircleDashed;
              return (
                <div key={item.id} className="flex flex-col gap-4 px-4 py-4 transition hover:bg-surface-muted/30 sm:px-6 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted ${item.status === "consumed" ? "text-emerald-600" : estado.label === "Expirada" ? "text-muted-foreground" : "text-primary"}`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-medium">{item.transfer_id.slice(0, 8)}…</span>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${estado.tone}`}><span className={`size-1.5 rounded-full ${estado.dot}`} />{estado.label}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Creada {relativeTime(item.created_at)} · {new Date(item.created_at).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pl-12 text-xs sm:grid-cols-4 sm:pl-0 lg:w-[430px]">
                    <div><p className="text-muted-foreground">Archivos</p><p className="mt-1 flex items-center gap-1 font-medium"><Files className="size-3.5" />{item.file_count}</p></div>
                    <div><p className="text-muted-foreground">Tamaño</p><p className="mt-1 flex items-center gap-1 font-medium"><HardDrive className="size-3.5" />{formatBytes(Number(item.total_bytes))}</p></div>
                    <div><p className="text-muted-foreground">Creada</p><p className="mt-1 font-medium">{new Date(item.created_at).toLocaleDateString("es-PE")}</p></div>
                    <div className="hidden sm:block">
                      <p className="text-muted-foreground">{item.consumed_at ? "Descargada" : "Expira"}</p>
                      <p className="mt-1 flex items-center gap-1 font-medium"><Clock3 className="size-3.5" />
                        {item.consumed_at ? new Date(item.consumed_at).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }) : item.expires_at ? new Date(item.expires_at).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }) : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><BarChart3 className="size-3.5" />Métricas acumuladas desde el inicio del registro.</span>
        {m.last_activity ? <span>Última actividad: {new Date(m.last_activity).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</span> : null}
      </div>
    </div>
  );
}
