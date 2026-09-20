import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Box, CalendarClock, CheckCircle2, ClipboardList, Factory, FileText, History, PackageCheck, UserRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { usePedidos, estadoClases, esEstadoFinalPedido } from "@/lib/taller-db";
import { fmtFecha } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pedidos-2/$id")({
  head: () => ({ meta: [{ title: "Pedido 2 — Taller del Joyero" }, { name: "description", content: "Ficha operativa del pedido." }] }),
  component: Pedido2Detalle,
});

type Tab = "resumen" | "produccion" | "comercial" | "archivos" | "historial";

function Pedido2Detalle() {
  const { id } = useParams({ from: "/_authenticated/pedidos-2/$id" });
  const navigate = useNavigate();
  const { data: pedidos = [] } = usePedidos();
  const pedido = pedidos.find((p) => p.id === id);
  const [tab, setTab] = useState<Tab>("resumen");

  const { data: trabajos = [], isLoading: loadingTrabajos } = useQuery({
    queryKey: ["pedidos-2-trabajos", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("trabajos").select("id,titulo,area,estado,prioridad,responsable_user_id,created_at").eq("pedido_id", id).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: ordenes = [] } = useQuery({
    queryKey: ["pedidos-2-op", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("ordenes_produccion").select("id,numero,estado,prioridad,fecha_planificada_inicio,fecha_planificada_fin,fecha_inicio,fecha_fin,responsable_user_id,created_at").eq("pedido_id", id).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: resumenCosto } = useQuery({
    queryKey: ["pedidos-2-costos", ordenes[0]?.id],
    enabled: Boolean(ordenes[0]?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("orden_produccion_resumen_costos").select("costo_estimado,costo_materiales,costo_mano_obra,costo_externo,costo_indirecto,costo_ajustes,costo_real,venta,margen,margen_porcentaje,moneda,calculado_at").eq("orden_produccion_id", ordenes[0].id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: controles = [] } = useQuery({
    queryKey: ["pedidos-2-qc", id, ordenes.map((o) => o.id).join(",")],
    enabled: Boolean(id) && ordenes.length > 0,
    queryFn: async () => {
      const ordenIds = ordenes.map((o) => o.id);
      const { data, error } = await supabase
        .from("control_calidad")
        .select("id,orden_produccion_id,trabajo_id,tipo,resultado,descripcion,motivo,evidencia_url,created_at,inspeccionado_por")
        .in("orden_produccion_id", ordenIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: piezas = [] } = useQuery({
    queryKey: ["pedidos-2-piezas", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("piezas_terminadas").select("id,numero_pieza,estado,peso_final,created_at").eq("pedido_id", id).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: archivos = [] } = useQuery({
    queryKey: ["pedidos-2-archivos", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("pedido_archivos").select("id,nombre,tipo,grupo,version,poster,es_vigente_fabricacion,created_at").eq("pedido_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: eventos = [] } = useQuery({
    queryKey: ["pedidos-2-eventos", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("produccion_eventos").select("id,tipo,estado_anterior,estado_nuevo,usuario_id,datos,created_at").eq("pedido_id", id).order("created_at", { ascending: false }).limit(150);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: movimientos = [] } = useQuery({
    queryKey: ["pedidos-2-movimientos", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("pedido_movimientos").select("id,area_origen,area_destino,accion,usuario_id,nota,created_at").eq("pedido_id", id).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!pedido) {
    return <AppShell titulo="Pedido 2"><div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No se encontró el pedido.</div></AppShell>;
  }

  const estado = pedido.estado;
  const dias = pedido.fecha_entrega ? Math.ceil((new Date(pedido.fecha_entrega).getTime() - new Date().setHours(0,0,0,0)) / 86400000) : null;
  const alertas = [
    dias !== null && dias < 0 && !esEstadoFinalPedido(estado) ? "La fecha prometida está vencida." : null,
    !pedido.cliente ? "El pedido no tiene cliente asociado." : null,
    trabajos.length === 0 && estado === "En Producción" ? "Está en producción pero no tiene trabajos registrados." : null,
    ordenes.length === 0 && estado === "En Producción" ? "Está en producción pero no tiene orden de producción." : null,
  ].filter(Boolean) as string[];

  return (
    <AppShell
      titulo={pedido.referencia}
      subtitulo={pedido.cliente ? `${pedido.cliente} · ${pedido.sede_nombre ?? "Sede"}` : "Pedido sin cliente asociado"}
      acciones={<div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => navigate({ to: "/pedidos-2" })} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold"><ArrowLeft className="size-4" /> Pedidos 2</button><Link to="/pedidos/$id" params={{ id }} search={{ from: "pedidos" }} className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold text-muted-foreground">Ficha anterior</Link></div>}
    >
      <section className="overflow-hidden rounded-[26px] border border-gold/20 bg-card shadow-raised">
        <div className="relative p-5 sm:p-7">
          <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-gold/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${estadoClases[estado] ?? "bg-surface-muted text-muted-foreground"}`}>{estado}</span>{pedido.area_actual ? <span className="rounded-full bg-surface-muted px-3 py-1 text-[10px] font-semibold">{pedido.area_actual}</span> : null}{dias !== null && dias < 0 && !esEstadoFinalPedido(estado) ? <span className="rounded-full bg-danger-soft px-3 py-1 text-[10px] font-bold text-danger">Atrasado</span> : null}</div>
              <h2 className="mt-4 font-display text-3xl tracking-tight sm:text-4xl">{pedido.trabajo || pedido.pieza || "Pedido"}</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{pedido.notas || "Sin notas generales."}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[520px]"><Dato label="Ingreso" value={fmtFecha(pedido.fecha_ingreso) || "—"} /><Dato label="Entrega" value={fmtFecha(pedido.fecha_entrega) || "—"} /><Dato label="Sede" value={pedido.sede_nombre || "—"} /><Dato label="Cantidad" value={String(pedido.cantidad_piezas ?? "—")} /></div>
          </div>
        </div>
        {alertas.length ? <div className="border-t border-warning/20 bg-warning-soft/50 px-5 py-3 sm:px-7"><div className="flex flex-wrap gap-2">{alertas.map((a) => <span key={a} className="inline-flex items-center gap-2 text-xs font-semibold text-warning"><AlertTriangle className="size-3.5" /> {a}</span>)}</div></div> : null}
      </section>

      <div className="mt-5 flex gap-1 overflow-x-auto rounded-xl bg-surface-muted p-1">
        {([["resumen","Resumen",ClipboardList],["produccion","Producción",Factory],["comercial","Comercial",UserRound],["archivos","Archivos",FileText],["historial","Historial",History]] as const).map(([idTab,label,Icon]) => <button key={idTab} type="button" onClick={() => setTab(idTab)} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold ${tab === idTab ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"}`}><Icon className="size-4" />{label}</button>)}
      </div>

      {tab === "resumen" ? <Resumen pedido={pedido} trabajos={trabajos} ordenes={ordenes} controles={controles} piezas={piezas} dias={dias} /> : null}
      {tab === "produccion" ? <Produccion trabajos={trabajos} ordenes={ordenes} controles={controles} piezas={piezas} costo={resumenCosto} loading={loadingTrabajos} /> : null}
      {tab === "comercial" ? <Comercial pedido={pedido} /> : null}
      {tab === "archivos" ? <Archivos archivos={archivos} /> : null}
      {tab === "historial" ? <Historial eventos={eventos} movimientos={movimientos} /> : null}
    </AppShell>
  );
}

function Dato({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-surface-muted px-3 py-3"><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold truncate">{value}</p></div>; }

function Resumen({ pedido, trabajos, ordenes, controles, piezas, dias }: { pedido: any; trabajos: any[]; ordenes: any[]; controles: any[]; piezas: any[]; dias: number | null }) {
  const completados = trabajos.filter((t) => t.estado === "completado").length;
  return <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Dato label="Trabajo" value={pedido.trabajo || pedido.pieza || "—"} /><Dato label="Material" value={pedido.material || "—"} /><Dato label="Piedras" value={pedido.piedras || "—"} /><Dato label="Talla" value={pedido.talla || "—"} /></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Mini icon={Factory} title="Producción" value={ordenes.length ? ordenes[0].estado : "No configurada"} detail={`${completados}/${trabajos.length} trabajos completados`} /><Mini icon={PackageCheck} title="Calidad" value={controles[0]?.estado || "Pendiente"} detail={controles.length ? `${controles.length} inspecciones` : "Sin inspecciones"} /><Mini icon={Box} title="Piezas" value={`${piezas.filter((p) => ["verificada","liberada"].includes(p.estado)).length}/${piezas.length}`} detail="Verificadas o liberadas" /><Mini icon={CalendarClock} title="Entrega" value={dias === null ? "Sin fecha" : dias < 0 ? "Atrasado" : dias === 0 ? "Hoy" : `${dias} días`} detail={fmtFecha(pedido.fecha_entrega) || "Sin fecha"} /></div><section className="rounded-2xl border border-border bg-card p-5"><h3 className="text-xs font-bold uppercase tracking-[.16em]">Ficha técnica</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Dato label="Peso estimado" value={pedido.peso_estimado ? `${pedido.peso_estimado} g` : "—"} /><Dato label="Cantidad" value={String(pedido.cantidad_piezas ?? "—")} /><Dato label="Origen" value={pedido.origen || "—"} /><Dato label="Sede" value={pedido.sede_nombre || "—"} /></div></section></div>;
}
function Mini({ icon: Icon, title, value, detail }: { icon: typeof Factory; title: string; value: string; detail: string }) { return <div className="rounded-2xl border border-border bg-card p-5"><Icon className="size-5 text-gold" /><p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p><p className="mt-1 text-base font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>; }

function Produccion({ trabajos, ordenes, controles, piezas, costo, loading }: { trabajos: any[]; ordenes: any[]; controles: any[]; piezas: any[]; costo: any; loading: boolean }) {
  return <div className="space-y-5">{loading ? <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Cargando producción…</div> : null}<section className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><div><h3 className="text-xs font-bold uppercase tracking-[.16em]">Trabajos</h3><p className="mt-1 text-xs text-muted-foreground">{trabajos.length} operaciones registradas</p></div><Factory className="size-5 text-gold" /></div><div className="mt-4 space-y-2">{trabajos.length ? trabajos.map((t) => <div key={t.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface-sunken p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">{t.titulo}</p><p className="mt-1 text-xs text-muted-foreground">{t.area} · {t.prioridad || "normal"} · Responsable {t.responsable_user_id ? "asignado" : "pendiente"}</p></div><span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-bold uppercase">{t.estado}</span></div>) : <Empty text="No hay trabajos registrados." />}</div></section><section className="rounded-2xl border border-border bg-card p-5"><h3 className="text-xs font-bold uppercase tracking-[.16em]">Órdenes de producción</h3><div className="mt-4 space-y-2">{ordenes.length ? ordenes.map((o) => <div key={o.id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">{o.numero}</p><p className="mt-1 text-xs text-muted-foreground">{o.estado} · Prioridad {o.prioridad || "normal"}</p></div><span className="text-xs text-muted-foreground">{o.fecha_planificada_fin ? fmtFecha(o.fecha_planificada_fin) : "Sin fecha planificada"}</span></div></div>) : <Empty text="No hay orden de producción." />}</div></section><div className="grid gap-4 md:grid-cols-2"><section className="rounded-2xl border border-border bg-card p-5"><h3 className="text-xs font-bold uppercase tracking-[.16em]">Calidad</h3><div className="mt-4 space-y-2">{controles.length ? controles.map((c) => <div key={c.id} className="rounded-xl border border-border p-3"><div className="flex justify-between gap-3"><span className="text-xs font-semibold">{c.tipo}</span><span className="text-[10px] font-bold uppercase">{c.estado}</span></div><p className="mt-1 text-xs text-muted-foreground">{c.observaciones || "Sin observaciones"}</p></div>) : <Empty text="Sin inspecciones." />}</div></section><section className="rounded-2xl border border-border bg-card p-5"><h3 className="text-xs font-bold uppercase tracking-[.16em]">Piezas terminadas</h3><div className="mt-4 space-y-2">{piezas.length ? piezas.map((p) => <div key={p.id} className="flex items-center justify-between rounded-xl border border-border p-3"><span className="text-xs font-semibold">Pieza {p.numero_pieza}</span><span className="text-[10px] font-bold uppercase">{p.estado}</span></div>) : <Empty text="Sin piezas registradas." />}</div></section></div>{costo ? <section className="rounded-2xl border border-border bg-card p-5"><h3 className="text-xs font-bold uppercase tracking-[.16em]">Costeo real</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Dato label="Materiales" value={money(costo.costo_materiales,costo.moneda)} /><Dato label="Mano de obra" value={money(costo.costo_mano_obra,costo.moneda)} /><Dato label="Costo real" value={money(costo.costo_real,costo.moneda)} /><Dato label="Margen" value={money(costo.margen,costo.moneda)} /></div></section> : null}</div>;
}
function Comercial({ pedido }: { pedido: any }) { return <div className="grid gap-4 md:grid-cols-2"><section className="rounded-2xl border border-border bg-card p-5"><UserRound className="size-5 text-gold" /><h3 className="mt-3 text-xs font-bold uppercase tracking-[.16em]">Cliente</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><Dato label="Cliente" value={pedido.cliente || "Sin cliente"} /><Dato label="Contrato" value={pedido.contrato || "Sin contrato"} /><Dato label="Origen" value={pedido.origen || "—"} /><Dato label="Sede" value={pedido.sede_nombre || "—"} /></div></section><section className="rounded-2xl border border-border bg-card p-5"><FileText className="size-5 text-gold" /><h3 className="mt-3 text-xs font-bold uppercase tracking-[.16em]">Importes</h3><div className="mt-4 grid gap-3 sm:grid-cols-3"><Dato label="Importe" value={money(pedido.importe,"PEN")} /><Dato label="A cuenta" value={money(pedido.a_cuenta,"PEN")} /><Dato label="Saldo" value={money((Number(pedido.importe)||0)-(Number(pedido.a_cuenta)||0),"PEN")} /></div></section></div>; }
function Archivos({ archivos }: { archivos: any[] }) { return <section className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><div><h3 className="text-xs font-bold uppercase tracking-[.16em]">Documentos del pedido</h3><p className="mt-1 text-xs text-muted-foreground">{archivos.length} archivos registrados</p></div><FileText className="size-5 text-gold" /></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{archivos.map((a) => <div key={a.id} className="overflow-hidden rounded-xl border border-border"><div className="grid aspect-video place-items-center bg-surface-muted">{a.poster ? <img src={a.poster} alt="" className="size-full object-cover" /> : <FileText className="size-8 text-muted-foreground" />}</div><div className="p-3"><p className="truncate text-sm font-semibold">{a.nombre}</p><p className="mt-1 text-[10px] text-muted-foreground">{a.grupo || a.tipo || "Archivo"} · v{a.version ?? 1}{a.es_vigente_fabricacion ? " · Vigente" : ""}</p></div></div>)}</div>{!archivos.length ? <Empty text="No hay archivos registrados." /> : null}</section>; }
function Historial({ eventos, movimientos }: { eventos: any[]; movimientos: any[] }) { const items = useMemo(() => [...eventos.map((e) => ({ id: e.id, fecha: e.created_at, tipo: "Producción", titulo: e.tipo, detalle: e.estado_anterior && e.estado_nuevo ? `${e.estado_anterior} → ${e.estado_nuevo}` : "Evento registrado", usuario: e.usuario_id })), ...movimientos.map((m) => ({ id: m.id, fecha: m.created_at, tipo: "Área", titulo: m.accion || "Movimiento", detalle: m.area_origen ? `${m.area_origen} → ${m.area_destino}` : m.area_destino, usuario: m.usuario_id }))].sort((a,b) => new Date(b.fecha).getTime()-new Date(a.fecha).getTime()), [eventos,movimientos]); return <section className="rounded-2xl border border-border bg-card p-5"><h3 className="text-xs font-bold uppercase tracking-[.16em]">Trazabilidad</h3><div className="mt-5 space-y-0">{items.length ? items.map((e) => <div key={`${e.tipo}-${e.id}`} className="relative border-l border-border pb-5 pl-5 last:pb-0"><span className="absolute -left-1.5 top-1 size-3 rounded-full bg-gold ring-4 ring-card" /><p className="text-sm font-semibold">{e.titulo}</p><p className="mt-1 text-xs text-muted-foreground">{e.detalle}</p><p className="mt-1 text-[10px] text-muted-foreground">{new Date(e.fecha).toLocaleString("es-PE")} · {e.usuario ? e.usuario.slice(0,8).toUpperCase() : "Sistema"}</p></div>) : <Empty text="Aún no hay eventos registrados." />}</div></section>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">{text}</div>; }
function money(value: number | null | undefined, currency = "PEN") { if (value == null || Number.isNaN(Number(value))) return "—"; return new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(Number(value)); }
