// @ts-nocheck -- la tipificación generada de Supabase puede quedar detrás del esquema vigente
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Factory, PackageCheck, PlayCircle, PauseCircle, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import { AppShell, StatCard } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/produccion")({
  head: () => ({
    meta: [
      { title: "Producción — Taller del Joyero" },
      { name: "description", content: "Control central de órdenes y operaciones de producción." },
    ],
  }),
  component: ProduccionPage,
});

const ESTADOS = [
  "borrador",
  "liberada",
  "en_produccion",
  "pausada",
  "control_calidad",
  "terminada",
  "cancelada",
] as const;

const estadoEtiqueta: Record<string, string> = {
  borrador: "Preparación",
  liberada: "Liberada",
  en_produccion: "En producción",
  pausada: "Pausada",
  control_calidad: "Calidad",
  terminada: "Terminada",
  cancelada: "Cancelada",
};

function ProduccionPage() {
  const [filtro, setFiltro] = useState<string>("todos");

  const { data, isLoading, error } = useQuery({
    queryKey: ["produccion-control-central"],
    queryFn: async () => {
      const { data: ordenes, error: ordenesError } = await supabase
        .from("ordenes_produccion")
        .select("id,numero,pedido_id,sede_id,estado,prioridad,fecha_planificada_inicio,fecha_planificada_fin,fecha_inicio,fecha_fin,created_at")
        .order("created_at", { ascending: false });
      if (ordenesError) throw ordenesError;

      const ids = (ordenes ?? []).map((o) => o.id);
      const pedidoIds = (ordenes ?? []).map((o) => o.pedido_id);

      const [trabajosRes, piezasRes, pedidosRes, calidadRes] = await Promise.all([
        ids.length
          ? supabase.from("trabajos").select("id,orden_produccion_id,pedido_id,secuencia,area,titulo,estado,tipo,responsable_user_id,participante_id").in("orden_produccion_id", ids).order("secuencia")
          : Promise.resolve({ data: [], error: null }),
        ids.length
          ? supabase.from("piezas_terminadas").select("id,orden_produccion_id,numero_pieza,cantidad,estado,peso_final").in("orden_produccion_id", ids)
          : Promise.resolve({ data: [], error: null }),
        pedidoIds.length
          ? supabase.from("pedidos").select("id,referencia,cliente,trabajo,cantidad_piezas,fecha_entrega").in("id", pedidoIds)
          : Promise.resolve({ data: [], error: null }),
        ids.length
          ? supabase.from("control_calidad").select("id,orden_produccion_id,tipo,resultado,created_at").in("orden_produccion_id", ids).order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (trabajosRes.error) throw trabajosRes.error;
      if (piezasRes.error) throw piezasRes.error;
      if (pedidosRes.error) throw pedidosRes.error;
      if (calidadRes.error) throw calidadRes.error;

      const pedidos = new Map((pedidosRes.data ?? []).map((p) => [p.id, p]));
      const trabajos = trabajosRes.data ?? [];
      const piezas = piezasRes.data ?? [];
      const calidad = calidadRes.data ?? [];

      return (ordenes ?? []).map((op) => {
        const ops = trabajos.filter((t) => t.orden_produccion_id === op.id);
        const ps = piezas.filter((p) => p.orden_produccion_id === op.id);
        const qc = calidad.filter((c) => c.orden_produccion_id === op.id);
        const pedido = pedidos.get(op.pedido_id);
        const externosPendientes = ops.filter((t) => t.tipo === "externo" && !t.participante_id).length;
        const completados = ops.filter((t) => t.estado === "completado").length;
        const requeridas = Math.max(Number(pedido?.cantidad_piezas ?? 1), 1);
        const verificadas = ps.filter((p) => ["verificada", "liberada"].includes(p.estado)).reduce((n, p) => n + Number(p.cantidad || 0), 0);
        const calidadFinal = qc.some((c) => c.tipo === "inspeccion_final" && c.resultado === "aprobado");

        return {
          ...op,
          pedido,
          trabajos: ops,
          piezas: ps,
          calidad: qc,
          externosPendientes,
          completados,
          totalTrabajos: ops.length,
          requeridas,
          verificadas,
          calidadFinal,
        };
      });
    },
  });

  const ordenes = data ?? [];
  const visibles = useMemo(
    () => filtro === "todos" ? ordenes : ordenes.filter((op) => op.estado === filtro),
    [filtro, ordenes],
  );

  const conteos = useMemo(
    () => Object.fromEntries(ESTADOS.map((estado) => [estado, ordenes.filter((op) => op.estado === estado).length])),
    [ordenes],
  );

  return (
    <AppShell
      titulo="Producción"
      subtitulo="Control central de órdenes, operaciones, piezas y calidad"
    >
      <div className="space-y-6">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <button type="button" onClick={() => setFiltro("borrador")} className="text-left"><StatCard etiqueta="Preparación" valor={String(conteos.borrador ?? 0)} /></button>
          <button type="button" onClick={() => setFiltro("liberada")} className="text-left"><StatCard etiqueta="Liberadas" valor={String(conteos.liberada ?? 0)} /></button>
          <button type="button" onClick={() => setFiltro("en_produccion")} className="text-left"><StatCard etiqueta="En producción" valor={String(conteos.en_produccion ?? 0)} /></button>
          <button type="button" onClick={() => setFiltro("pausada")} className="text-left"><StatCard etiqueta="Pausadas" valor={String(conteos.pausada ?? 0)} /></button>
          <button type="button" onClick={() => setFiltro("control_calidad")} className="text-left"><StatCard etiqueta="Calidad" valor={String(conteos.control_calidad ?? 0)} /></button>
          <button type="button" onClick={() => setFiltro("terminada")} className="text-left"><StatCard etiqueta="Terminadas" valor={String(conteos.terminada ?? 0)} /></button>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-deep">Centro de producción</p>
            <h2 className="mt-1 text-xl font-semibold">Órdenes de producción</h2>
          </div>
          <button
            type="button"
            onClick={() => setFiltro("todos")}
            className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Ver todas ({ordenes.length})
          </button>
        </section>

        {isLoading ? <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Cargando producción...</div> : null}
        {error ? <div className="rounded-2xl border border-danger/30 bg-danger-soft p-5 text-sm text-danger">No se pudo cargar Producción: {error instanceof Error ? error.message : "Error de consulta"}</div> : null}

        {!isLoading && !error && visibles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <Factory className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-semibold">No hay órdenes en este estado</p>
            <p className="mt-1 text-sm text-muted-foreground">Las órdenes aparecen aquí cuando un pedido entra al flujo productivo.</p>
          </div>
        ) : null}

        <div className="space-y-4">
          {visibles.map((op) => {
            const pedido = op.pedido;
            const progreso = op.totalTrabajos ? Math.round((op.completados / op.totalTrabajos) * 100) : 0;
            const bloqueada = op.estado === "en_produccion" && op.totalTrabajos === 0;

            return (
              <article key={op.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{op.numero}</span>
                      <span className="rounded-full bg-gold/10 px-2.5 py-1 text-[10px] font-bold uppercase text-gold-deep">{estadoEtiqueta[op.estado] ?? op.estado}</span>
                      {op.prioridad !== "normal" ? <span className="rounded-full bg-danger-soft px-2.5 py-1 text-[10px] font-bold uppercase text-danger">{op.prioridad}</span> : null}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {pedido?.referencia ?? "Pedido"} · {pedido?.cliente ?? "Cliente pendiente"}
                    </p>
                    {pedido?.trabajo ? <p className="mt-1 text-xs text-muted-foreground">{pedido.trabajo}</p> : null}
                  </div>
                  <Link to="/pedidos/$id" params={{ id: op.pedido_id }} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:border-gold">
                    Abrir pedido
                  </Link>
                </div>

                <div className="grid gap-4 p-5 xl:grid-cols-[1fr_280px]">
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Ruta / operaciones</p>
                        <p className="mt-1 text-sm font-semibold">{op.completados}/{op.totalTrabajos} completadas</p>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">{progreso}%</span>
                    </div>
                    <div className="mb-4 h-2 overflow-hidden rounded-full bg-surface-muted">
                      <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progreso}%` }} />
                    </div>

                    <div className="space-y-2">
                      {op.trabajos.map((trabajo) => (
                        <Link key={trabajo.id} to="/trabajos/$id" params={{ id: trabajo.id }} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3 hover:border-gold">
                          <span className="grid size-8 place-items-center rounded-lg bg-surface-muted text-xs font-bold">{trabajo.secuencia}</span>
                          <div className="min-w-[160px] flex-1">
                            <p className="text-sm font-semibold">{trabajo.area}</p>
                            <p className="text-xs text-muted-foreground">{trabajo.titulo || "Operación"}</p>
                          </div>
                          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-bold uppercase">{trabajo.tipo === "externo" ? "Servicio externo" : "Taller propio"}</span>
                          <span className="text-xs font-semibold text-muted-foreground">{trabajo.estado.replace("_", " ")}</span>
                          {trabajo.tipo === "externo" && !trabajo.participante_id ? <AlertTriangle className="size-4 text-danger" aria-label="Servicio externo pendiente de asignación" /> : null}
                        </Link>
                      ))}
                    </div>

                    {op.totalTrabajos === 0 ? (
                      <div className="rounded-xl border border-danger/20 bg-danger-soft p-4 text-sm text-danger">
                        Esta OP no tiene operaciones. No debe avanzar a producción.
                      </div>
                    ) : null}
                  </div>

                  <aside className="space-y-3">
                    <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Piezas</p>
                      <div className="mt-2 flex items-center gap-2">
                        <PackageCheck className="size-4 text-gold-deep" />
                        <span className="text-sm font-semibold">{op.verificadas}/{op.requeridas} verificadas</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{op.piezas.length} registro(s) de pieza</p>
                    </div>

                    <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Calidad</p>
                      <div className="mt-2 flex items-center gap-2">
                        {op.calidadFinal ? <ShieldCheck className="size-4 text-success" /> : <AlertTriangle className="size-4 text-muted-foreground" />}
                        <span className="text-sm font-semibold">{op.calidadFinal ? "Inspección final aprobada" : "Pendiente"}</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Control</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <span className="flex items-center gap-1.5"><PlayCircle className="size-3.5" /> {op.estado === "en_produccion" ? "Activa" : "No activa"}</span>
                        <span className="flex items-center gap-1.5"><PauseCircle className="size-3.5" /> {op.estado === "pausada" ? "Pausada" : "Sin pausa"}</span>
                      </div>
                      {op.externosPendientes > 0 ? <p className="mt-3 rounded-lg bg-danger-soft p-2 text-xs font-semibold text-danger">{op.externosPendientes} operación(es) externas pendientes</p> : null}
                      {bloqueada ? <p className="mt-2 text-xs text-danger">Bloqueada: faltan operaciones.</p> : null}
                    </div>

                    {op.estado === "terminada" ? (
                      <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-soft p-3 text-xs font-semibold text-success">
                        <CheckCircle2 className="size-4" /> Producción terminada
                      </div>
                    ) : null}
                  </aside>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
