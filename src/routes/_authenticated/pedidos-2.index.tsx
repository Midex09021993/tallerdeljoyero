import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, CalendarClock, ClipboardList, Factory, PackageCheck, Plus, Search, Trash2, UserRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SelectorSedeDueno, useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";
import { useBorrarPedido, usePedidos, esEstadoFinalPedido, pedidoPendienteAutorizacionProduccion, estadoClases } from "@/lib/taller-db";
import { fmtFecha } from "@/lib/utils";
import { useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/pedidos-2/")({
  head: () => ({ meta: [{ title: "Pedidos 2 — Taller del Joyero" }, { name: "description", content: "Centro operativo de pedidos, producción y entrega del taller." }] }),
  component: Pedidos2Page,
});

type Vista = "todos" | "atencion" | "produccion" | "entrega";

function diasEntrega(fecha: string | null | undefined) {
  if (!fecha) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const d = new Date(fecha); d.setHours(0, 0, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - hoy.getTime()) / 86400000);
}

function Pedidos2Page() {
  const navigate = useNavigate();
  const { data: sesion } = useSesion();
  const { data: pedidos = [], isLoading } = usePedidos();
  const { esDueno, sedeFiltro, setSedeFiltro, sedes, filtrarPedidos, etiquetaSede } = useSedeFiltroDueno();
  const [vista, setVista] = useState<Vista>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [porBorrar, setPorBorrar] = useState<{ id: string; referencia: string } | null>(null);
  const borrar = useBorrarPedido();

  const pedidosSede = useMemo(() => filtrarPedidos(pedidos), [filtrarPedidos, pedidos]);
  const activos = useMemo(() => pedidosSede.filter((p) => !esEstadoFinalPedido(p.estado)), [pedidosSede]);
  const atencion = useMemo(() => activos.filter((p) => {
    const dias = diasEntrega(p.fecha_entrega ?? p.entrega);
    return pedidoPendienteAutorizacionProduccion(p) || (dias !== null && dias < 0);
  }), [activos]);
  const produccion = activos.filter((p) => p.estado === "En Producción");
  const entrega = activos.filter((p) => p.estado === "Listo para Entrega" || p.estado === "En Camino");
  const base = vista === "atencion" ? atencion : vista === "produccion" ? produccion : vista === "entrega" ? entrega : activos;
  const lista = base.filter((p) => {
    const q = busqueda.trim().toLowerCase();
    return !q || [p.referencia, p.cliente, p.trabajo, p.pieza, p.estado, p.area_actual].some((v) => (v ?? "").toLowerCase().includes(q));
  });

  return (
    <AppShell
      titulo="Pedidos 2"
      subtitulo={isLoading ? "Cargando operación…" : `${activos.length} pedidos activos · ${sesion?.esDueno ? etiquetaSede : sesion?.sede?.nombre ?? "Tu sede"}`}
      acciones={<div className="flex flex-wrap items-center gap-2"><SelectorSedeDueno esDueno={esDueno} sedes={sedes} value={sedeFiltro} onChange={setSedeFiltro} />{sesion?.esAdmin ? <button type="button" onClick={() => navigate({ to: "/pedidos-2/nuevo" })} className="inline-flex items-center gap-2 rounded-xl bg-gold px-3.5 py-2.5 text-xs font-semibold text-gold-foreground shadow-card"><Plus className="size-4" /> Nuevo pedido</button> : null}</div>}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={ClipboardList} label="Activos" value={activos.length} />
        <Metric icon={AlertTriangle} label="Requieren atención" value={atencion.length} tone="warning" />
        <Metric icon={Factory} label="En producción" value={produccion.length} />
        <Metric icon={PackageCheck} label="Por entregar" value={entrega.length} tone="positive" />
      </div>

      <section className="mt-6 overflow-hidden rounded-[24px] border border-border bg-card shadow-card">
        <div className="border-b border-border p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-gold">Centro operativo</p><h2 className="mt-1 text-lg font-semibold">Pedidos</h2><p className="mt-1 text-xs text-muted-foreground">Una sola bandeja para saber qué existe, dónde está y qué necesita atención.</p></div>
            <div className="relative w-full lg:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar pedido, cliente o pieza…" className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/15" /></div>
          </div>
          <div className="mt-5 flex flex-wrap gap-1 rounded-xl bg-surface-muted p-1">
            {([["todos", "Todos", activos.length], ["atencion", "Requieren atención", atencion.length], ["produccion", "En producción", produccion.length], ["entrega", "Por entregar", entrega.length]] as const).map(([id, label, count]) => <button key={id} type="button" onClick={() => setVista(id)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${vista === id ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"}`}>{label} <span className="ml-1 opacity-60">{count}</span></button>)}
          </div>
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-left">
            <thead className="border-b border-border bg-surface-muted/60"><tr>{["Pedido", "Cliente", "Pieza", "Estado", "Taller", "Ubicación", "Entrega", ...(sesion?.esDueno ? ["Acciones"] : [""])].map((h, i) => <th key={h || i} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">{lista.map((p) => <PedidoRow key={p.id} pedido={p} esDueno={Boolean(sesion?.esDueno)} onOpen={() => navigate({ to: "/pedidos-2/$id", params: { id: p.id } })} onDelete={() => setPorBorrar({ id: p.id, referencia: p.referencia })} />)}</tbody>
          </table>
        </div>

        <div className="divide-y divide-border lg:hidden">{lista.map((p) => <button key={p.id} type="button" onClick={() => navigate({ to: "/pedidos-2/$id", params: { id: p.id } })} className="w-full p-4 text-left hover:bg-surface-muted/60"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold">{p.referencia}</p><p className="mt-1 text-xs text-muted-foreground">{p.cliente || "Cliente pendiente"}</p></div><Status estado={p.estado} /></div><p className="mt-3 text-sm">{p.trabajo || p.pieza || "Sin descripción"}</p><div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground"><span>{p.sede_nombre || "Taller no asignado"} · {p.area_actual || "Sin ubicación"}</span><span>{fmtFecha(p.fecha_entrega ?? p.entrega) || "Sin fecha"}</span></div></button>)}</div>

        {!isLoading && lista.length === 0 ? <div className="p-12 text-center text-sm text-muted-foreground">No hay pedidos en esta vista.</div> : null}
      </section>

      {porBorrar ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/15 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger"><Trash2 className="size-4" /></span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-danger">Eliminar pedido</p>
                <h2 className="mt-1 text-base font-semibold">¿Eliminar definitivamente {porBorrar.referencia}?</h2>
                <p className="mt-2 text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPorBorrar(null)} disabled={borrar.isPending} className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface-muted">Cancelar</button>
              <button type="button" disabled={borrar.isPending} onClick={() => borrar.mutate(porBorrar.id, { onSuccess: () => setPorBorrar(null) })} className="inline-flex items-center gap-2 rounded-lg bg-danger px-3 py-2 text-xs font-semibold text-surface hover:opacity-90 disabled:opacity-50">
                <Trash2 className="size-3.5" /> {borrar.isPending ? "Eliminando…" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <InfoCard icon={Factory} title="Producción" text="Trabajos, órdenes, materiales, tiempos y calidad conectados al pedido." />
        <InfoCard icon={UserRound} title="Comercial" text="Cliente, cotización, contrato y saldo relacionados sin dominar la operación." />
        <InfoCard icon={CalendarClock} title="Entrega" text="Fecha prometida y estado de entrega visibles desde la bandeja." />
      </section>
    </AppShell>
  );
}

function PedidoRow({ pedido: p, esDueno, onOpen, onDelete }: { pedido: any; esDueno: boolean; onOpen: () => void; onDelete: () => void }) {
  const dias = diasEntrega(p.fecha_entrega ?? p.entrega);
  return <tr onClick={onOpen} className="cursor-pointer hover:bg-surface-muted/60"><td className="px-5 py-4"><span className="font-semibold text-sm">{p.referencia}</span>{p.contrato ? <span className="block text-[10px] text-muted-foreground">Contrato {p.contrato}</span> : null}</td><td className="px-5 py-4 text-sm">{p.cliente || "Cliente pendiente"}</td><td className="px-5 py-4 text-sm text-muted-foreground">{p.trabajo || p.pieza || "Sin descripción"}</td><td className="px-5 py-4"><Status estado={p.estado} /></td><td className="px-5 py-4"><span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[10px] font-semibold">{p.sede_nombre || "Taller no asignado"}</span></td><td className="px-5 py-4"><span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold">{p.area_actual || "Sin ubicación"}</span></td><td className="px-5 py-4 text-xs">{fmtFecha(p.fecha_entrega ?? p.entrega) || "Sin fecha"}{dias !== null && dias < 0 && !esEstadoFinalPedido(p.estado) ? <span className="ml-2 text-[10px] font-semibold text-danger">Atrasado</span> : null}</td><td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>{esDueno ? <div className="flex items-center justify-end gap-2"><button type="button" onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-lg border border-danger/25 px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10" aria-label={`Eliminar pedido ${p.referencia}`}><Trash2 className="size-3.5" /> Eliminar</button><ArrowRight className="size-4 text-muted-foreground" /></div> : <ArrowRight className="ml-auto size-4 text-muted-foreground" />}</td></tr>;
}
function Status({ estado }: { estado: string }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${estadoClases[estado] ?? "bg-surface-muted text-muted-foreground"}`}>{estado}</span>; }
function Metric({ icon: Icon, label, value, tone = "neutral" }: { icon: typeof ClipboardList; label: string; value: number; tone?: "neutral" | "warning" | "positive" }) { return <div className="rounded-2xl border border-border bg-card p-4 shadow-card"><div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-xl bg-surface-muted text-gold"><Icon className="size-4" /></span><span className={`text-2xl font-semibold tabular-nums ${tone === "warning" ? "text-warning" : tone === "positive" ? "text-success" : "text-foreground"}`}>{value}</span></div><p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p></div>; }
function InfoCard({ icon: Icon, title, text }: { icon: typeof Factory; title: string; text: string }) { return <div className="rounded-2xl border border-border bg-card p-5"><Icon className="size-5 text-gold" /><h3 className="mt-3 text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></div>; }
