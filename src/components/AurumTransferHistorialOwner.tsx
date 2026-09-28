import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Files, HardDrive, Send, Clock3 } from "lucide-react";
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

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function estadoTransferencia(item: TransferUsage) {
  if (item.status === "consumed") return { label: "Descargado", tone: "text-emerald-600" };
  if (item.expires_at && new Date(item.expires_at) <= new Date()) {
    return { label: "Expirado", tone: "text-muted-foreground" };
  }
  return { label: "Disponible", tone: "text-primary" };
}

export function AurumTransferHistorialOwner() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["aurum-transfer-usage-owner"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aurum_transfer_usage")
        .select("id,transfer_id,created_at,file_count,total_bytes,status,consumed_at,expires_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as TransferUsage[];
    },
    staleTime: 30_000,
  });

  const stats = useMemo(() => {
    const total = data.length;
    const descargadas = data.filter((x) => x.status === "consumed").length;
    const bytes = data.reduce((sum, x) => sum + Number(x.total_bytes || 0), 0);
    const disponibles = data.filter((x) => x.status === "available" && (!x.expires_at || new Date(x.expires_at) > new Date())).length;
    const expiradas = data.filter((x) => x.status !== "consumed" && x.expires_at && new Date(x.expires_at) <= new Date()).length;
    return { total, descargadas, bytes, disponibles, expiradas };
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">AURUM Transfer</p>
        <h2 className="mt-1 text-2xl font-semibold">Historial de uso</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Métricas globales de la herramienta pública. Solo registra uso y metadatos operativos; no guarda ni muestra el contenido de los archivos.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard etiqueta="Transferencias" valor={String(stats.total)} />
        <StatCard etiqueta="Descargadas" valor={String(stats.descargadas)} tono="positivo" />
        <StatCard etiqueta="Datos transferidos" valor={formatBytes(stats.bytes)} />
        <StatCard etiqueta="Disponibles" valor={String(stats.disponibles)} />
        <StatCard etiqueta="Expiradas" valor={String(stats.expiradas)} />
      </div>

      <Panel titulo="Actividad reciente">
        {isLoading ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">Cargando historial…</p>
        ) : error ? (
          <p className="px-6 py-8 text-sm text-danger">No se pudo cargar el historial.</p>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <Send className="mb-3 h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">Aún no hay transferencias registradas.</p>
            <p className="mt-1 text-xs text-muted-foreground">Cuando alguien utilice AURUM Transfer aparecerá aquí.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Fecha</th>
                  <th className="px-6 py-3 font-medium">Transferencia</th>
                  <th className="px-6 py-3 font-medium">Archivos</th>
                  <th className="px-6 py-3 font-medium">Tamaño</th>
                  <th className="px-6 py-3 font-medium">Estado</th>
                  <th className="px-6 py-3 font-medium">Descarga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((item) => {
                  const estado = estadoTransferencia(item);
                  return (
                    <tr key={item.id} className="hover:bg-surface-muted/40">
                      <td className="whitespace-nowrap px-6 py-4">
                        {new Date(item.created_at).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Send className="h-4 w-4 text-primary" />
                          <span className="font-mono text-xs">{item.transfer_id.slice(0, 8)}…</span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">Uso público</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5"><Files className="h-4 w-4" />{item.file_count}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5"><HardDrive className="h-4 w-4" />{formatBytes(Number(item.total_bytes))}</span>
                      </td>
                      <td className={`px-6 py-4 font-medium ${estado.tone}`}>{estado.label}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {item.consumed_at ? new Date(item.consumed_at).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }) : (
                          <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
