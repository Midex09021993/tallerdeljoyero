import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Clock3, Filter, PlayCircle, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/lib/auth";
import { SelectorSedeDueno, TODAS_LAS_SEDES, useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";

type EstadoTrabajo = "pendiente" | "en_proceso" | "bloqueado" | "completado" | "cancelado";
type PrioridadTrabajo = "baja" | "normal" | "alta" | "urgente";

const estados: { value: EstadoTrabajo; label: string }[] = [
  { value: "pendiente", label: "Pendientes" },
  { value: "en_proceso", label: "En proceso" },
  { value: "bloqueado", label: "Bloqueados" },
  { value: "completado", label: "Completados" },
];

const areas = ["Todas", "Diseño 3D", "Impresión 3D", "Casting", "Corte Láser", "Taller", "Área ventas", "Pedidos"];

function fecha(valor: string | null) {
  if (!valor) return "Sin fecha";
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short" }).format(new Date(valor));
}

function prioridadClase(prioridad: PrioridadTrabajo) {
  if (prioridad === "urgente") return "text-danger";
  if (prioridad === "alta") return "text-warning";
  return "text-muted-foreground";
}

export function RadarProduccion() {
  const { data: sesion } = useSesion();
  const { esDueno, sedeFiltro, setSedeFiltro, sedes, etiquetaSede } = useSedeFiltroDueno();
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoTrabajo | "todos">("todos");
  const [areaFiltro, setAreaFiltro] = useState("Todas");
  const [prioridadFiltro, setPrioridadFiltro] = useState<PrioridadTrabajo | "todas">("todas");

  const trabajosQuery = useQuery({
    queryKey: ["radar-trabajos", sesion?.user.id],
    enabled: Boolean(sesion?.user.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trabajos")
        .select("id, pedido_id, sede_id, area, ubicacion, titulo, estado, prioridad, tipo, fecha_planificada, responsable_user_id, participante_id")
        .order("fecha_planificada", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const incidenciasQuery = useQuery({
    queryKey: ["radar-incidencias", sesion?.user.id],
    enabled: Boolean(sesion?.user.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidencias_trabajo")
        .select("id, trabajo_id, estado, tipo");
      if (error) throw error;
      return data ?? [];
    },
  });

  const trabajos = useMemo(() => {
    const sedeActiva = !esDueno ? sesion?.perfil.sede_id ?? null : sedeFiltro;
    return (trabajosQuery.data ?? []).filter((t) => {
      if (sedeActiva !== TODAS_LAS_SEDES && sedeActiva && t.sede_id !== sedeActiva) return false;
      if (estadoFiltro !== "todos" && t.estado !== estadoFiltro) return false;
      if (areaFiltro !== "Todas" && t.area !== areaFiltro) return false;
      if (prioridadFiltro !== "todas" && t.prioridad !== prioridadFiltro) return false;
      return t.estado !== "cancelado";
    });
  }, [trabajosQuery.data, esDueno, sesion?.sede_id, sedeFiltro, estadoFiltro, areaFiltro, prioridadFiltro]);

  const incidenciasAbiertas = useMemo(() => {
    const ids = new Set(
      (incidenciasQuery.data ?? [])
        .filter((i) => i.estado === "abierta" || i.estado === "en_revision")
        .map((i) => i.trabajo_id),
    );
    return ids;
  }, [incidenciasQuery.data]);

  const conteos = useMemo(
    () => ({
      pendiente: trabajos.filter((t) => t.estado === "pendiente").length,
      en_proceso: trabajos.filter((t) => t.estado === "en_proceso").length,
      bloqueado: trabajos.filter((t) => t.estado === "bloqueado").length,
      completado: trabajos.filter((t) => t.estado === "completado").length,
      incidencias: trabajos.filter((t) => incidenciasAbiertas.has(t.id)).length,
    }),
    [trabajos, incidenciasAbiertas],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Radar de producción</p>
          <h2 className="mt-1 font-display text-2xl">Centro de supervisión</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {trabajosQuery.isLoading ? "Cargando trabajos…" : `${trabajos.length} trabajos visibles · ${etiquetaSede}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SelectorSedeDueno esDueno={esDueno} sedes={sedes} value={sedeFiltro} onChange={setSedeFiltro} />
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Estado
            <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value as EstadoTrabajo | "todos")} className="mt-1 block rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium normal-case tracking-normal text-foreground">
              <option value="todos">Todos</option>
              {estados.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </label>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Área
            <select value={areaFiltro} onChange={(e) => setAreaFiltro(e.target.value)} className="mt-1 block rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium normal-case tracking-normal text-foreground">
              {areas.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Prioridad
            <select value={prioridadFiltro} onChange={(e) => setPrioridadFiltro(e.target.value as PrioridadTrabajo | "todas")} className="mt-1 block rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium normal-case tracking-normal text-foreground">
              <option value="todas">Todas</option>
              <option value="urgente">Urgente</option>
              <option value="alta">Alta</option>
              <option value="normal">Normal</option>
              <option value="baja">Baja</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ["pendiente", "Pendientes", conteos.pendiente, Clock3],
          ["en_proceso", "En proceso", conteos.en_proceso, PlayCircle],
          ["bloqueado", "Bloqueados", conteos.bloqueado, ShieldAlert],
          ["incidencias", "Incidencias", conteos.incidencias, AlertTriangle],
          ["completado", "Completados", conteos.completado, CheckCircle2],
        ].map(([key, label, count, Icon]) => (
          <button key={String(key)} type="button" onClick={() => key === "incidencias" ? undefined : setEstadoFiltro(estadoFiltro === key ? "todos" : key as EstadoTrabajo)} className="rounded-2xl border border-border bg-card p-4 text-left transition hover:bg-surface-muted">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 font-display text-3xl">{count}</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Trabajos</span>
          <span className="text-xs text-muted-foreground">seguimiento operativo</span>
        </div>
        <div className="divide-y divide-border">
          {trabajos.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No hay trabajos con estos filtros.</div>
          ) : (
            trabajos.map((t) => (
              <Link key={t.id} to="/trabajos/$id" params={{ id: t.id }} className="block p-4 transition hover:bg-surface-muted">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-gold">{t.area}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs capitalize text-muted-foreground">{t.estado.replace("_", " ")}</span>
                      {incidenciasAbiertas.has(t.id) && <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-semibold text-danger"><AlertTriangle className="h-3 w-3" /> Incidencia</span>}
                    </div>
                    <p className="mt-1 truncate font-medium">{t.titulo}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t.ubicacion || "Sin ubicación"} · {t.tipo === "externo" ? "Externo" : "Interno"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-xs">
                    <span className={prioridadClase(t.prioridad as PrioridadTrabajo)}>{t.prioridad}</span>
                    <span className="text-muted-foreground">{fecha(t.fecha_planificada)}</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
