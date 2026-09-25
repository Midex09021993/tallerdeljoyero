import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, Banknote, Box, CheckCircle2, ClipboardList, CreditCard, PackageCheck, Search, Truck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SelectorSedeDueno, useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";
import { areaCoincide, useSesion } from "@/lib/auth";
import { estadoClases, esEstadoFinalPedido, resumenFinancieroContrato, useContratos, usePagosContratos, usePedidos, type Pedido } from "@/lib/taller-db";
import { fmtFecha } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ventas")({
  head: () => ({ meta: [{ title: "Ventas — Taller del Joyero" }, { name: "description", content: "Centro comercial de cobros, cartera, despacho y entrega del taller." }] }),
  component: Ventas2Page,
});

type Vista = "cartera" | "cobros" | "despacho" | "entregados";

function Ventas2Page() {
  const navigate = useNavigate();
  const { data: sesion } = useSesion();
  const puedeGestionar = Boolean(sesion?.esAdmin || sesion?.areas.some((a) => areaCoincide(a, "Área ventas")));
  const { data: pedidos = [], isLoading: loadingPedidos } = usePedidos();
  const { data: contratos = [], isLoading: loadingContratos } = useContratos(puedeGestionar);
  const { data: pagos = [] } = usePagosContratos(contratos, puedeGestionar);
  const { esDueno, sedeFiltro, setSedeFiltro, sedes, filtrarPedidos, etiquetaSede } = useSedeFiltroDueno();
  const [vista, setVista] = useState<Vista>("cartera");
  const [busqueda, setBusqueda] = useState("");

  const pedidosSede = useMemo(() => filtrarPedidos(pedidos), [filtrarPedidos, pedidos]);
  const pedidosVenta = pedidosSede.filter((p) => p.area_actual === "Área ventas" || ["Listo para Entrega", "En Camino", "Entregado"].includes(p.estado));
  const activos = pedidosVenta.filter((p) => !esEstadoFinalPedido(p.estado));
  const porEntregar = pedidosVenta.filter((p) => p.estado === "Listo para Entrega" || p.ventas_estado === "Listo para Entrega");
  const enCamino = pedidosVenta.filter((p) => p.estado === "En Camino" || p.ventas_estado === "En Camino");
  const entregados = pedidosVenta.filter((p) => p.estado === "Entregado" || p.ventas_estado === "Entregado");

  const finanzas = useMemo(() => contratos.map((c) => ({ contratoId: c.id, ...resumenFinancieroContrato(c, pagos.filter((p) => p.contrato_id === c.id)) })), [contratos, pagos]);
  const finanzasPorContrato = useMemo(() => new Map(finanzas.map((f) => [f.contratoId, f])), [finanzas]);
  const saldoPedido = (p: Pedido) => {
    const financiero = p.contrato_id ? finanzasPorContrato.get(p.contrato_id) : undefined;
    return financiero ? financiero.saldo : p.saldo;
  };
  const totalVenta = finanzas.reduce((s, f) => s + f.total, 0);
  const totalCobrado = finanzas.reduce((s, f) => s + f.abonado, 0);
  const totalPendiente = finanzas.reduce((s, f) => s + f.saldo, 0);
  const cobrosPendientes = finanzas.filter((f) => f.saldo > 0).length;

  const base = vista === "cobros" ? pedidosVenta.filter((p) => saldoPedido(p) > 0 || !p.contrato_id) : vista === "despacho" ? [...porEntregar, ...enCamino] : vista === "entregados" ? entregados : activos;
  const lista = base.filter((p) => {
    const q = busqueda.trim().toLowerCase();
    return !q || [p.referencia, p.cliente, p.trabajo, p.pieza, p.contrato, p.guia_envio, p.medio_envio].some((v) => (v ?? "").toLowerCase().includes(q));
  });

  return (
    <AppShell
      titulo="Ventas"
      subtitulo={loadingPedidos || loadingContratos ? "Sincronizando cartera…" : "Control comercial y cierre de pedidos"}
      acciones={<SelectorSedeDueno esDueno={esDueno} sedes={sedes} value={sedeFiltro} onChange={setSedeFiltro} />}
    >
      <section className="overflow-hidden rounded-[28px] border border-gold/20 bg-card shadow-raised">
        <div className="relative p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-24 -top-32 size-80 rounded-full bg-gold/10 blur-3xl" />
          <div className="relative grid gap-7 xl:grid-cols-[1fr_420px] xl:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-gold">Centro comercial</p>
              <h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">Dinero, entrega y cierre</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Una vista operativa para saber qué está pendiente de cobro, qué puede entregarse y qué pedidos ya cerraron.</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-muted/70 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">Saldo de cartera</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{money(totalPendiente)}</p>
              <div className="mt-3 flex items-center justify-between text-xs"><span className="text-muted-foreground">{cobrosPendientes} contratos pendientes</span><span className="font-semibold">{money(totalCobrado)} cobrado</span></div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={ClipboardList} label="Cartera activa" value={activos.length} />
        <Metric icon={CreditCard} label="Pendiente de cobro" value={money(totalPendiente)} tone="warning" />
        <Metric icon={Banknote} label="Cobrado" value={money(totalCobrado)} tone="positive" />
        <Metric icon={Truck} label="Listos para entregar" value={porEntregar.length} />
        <Metric icon={PackageCheck} label="En camino" value={enCamino.length} />
      </div>

      <section className="mt-5 overflow-hidden rounded-[24px] border border-border bg-card shadow-card">
        <div className="border-b border-border p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-lg font-semibold">Flujo comercial</h2><p className="mt-1 text-xs text-muted-foreground">Selecciona el momento del ciclo que quieres gestionar.</p></div>
            <div className="relative w-full lg:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar pedido, cliente, contrato o guía…" className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-gold/50" /></div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([["cartera","Cartera",activos.length],["cobros","Cobros",cobrosPendientes],["despacho","Despacho",porEntregar.length+enCamino.length],["entregados","Cerrados",entregados.length]] as const).map(([id,label,count]) => (
              <button key={id} type="button" onClick={() => setVista(id)} className={`rounded-xl border px-3 py-3 text-left transition ${vista===id ? "border-gold/30 bg-gold/[.07] shadow-card" : "border-border bg-surface-muted hover:border-gold/20"}`}>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
                <span className="mt-1 block text-xl font-semibold tabular-nums">{count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-left">
            <thead className="border-b border-border bg-surface-muted/60"><tr>{["Pedido","Cliente","Taller","Venta","Estado","Compromiso","Saldo",""] .map((h)=><th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">{lista.map((p)=><VentaRow key={p.id} pedido={{...p, saldo: saldoPedido(p)}} onOpen={()=>navigate({to:"/ventas/$id",params:{id:p.id}})}/>)}</tbody>
          </table>
        </div>
        <div className="divide-y divide-border lg:hidden">{lista.map((p)=>(
          <button key={p.id} type="button" onClick={()=>navigate({to:"/ventas/$id",params:{id:p.id}})} className="w-full p-4 text-left transition hover:bg-surface-muted/50">
            <div className="flex items-start justify-between gap-3"><div><b className="text-sm">{p.referencia}</b><p className="mt-1 text-xs text-muted-foreground">{p.cliente || "Cliente pendiente"}</p></div><Status estado={p.estado}/></div>
            <p className="mt-4 text-sm font-medium">{p.trabajo || p.pieza || "Pedido"}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold"><span className="rounded-lg bg-gold/10 px-2 py-1 text-gold-deep">{p.sede_nombre || "Taller no asignado"}</span><span className="rounded-lg bg-surface-muted px-2 py-1">{money(saldoPedido(p))} pendiente</span></div>
            <div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>{p.medio_envio || "Entrega en taller"}</span><span>{fmtFecha(p.fecha_entrega) || "Sin fecha"}</span></div>
          </button>
        ))}</div>
        {!lista.length ? <div className="p-12 text-center text-sm text-muted-foreground">No hay registros en esta vista.</div> : null}
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-3">
        <AreaCard icon={CreditCard} title="Cobranza" text={`${cobrosPendientes} contratos tienen saldo pendiente por ${money(totalPendiente)}.`} />
        <AreaCard icon={Truck} title="Despacho" text={`${porEntregar.length} pedidos esperan preparación o entrega y ${enCamino.length} están en camino.`} />
        <AreaCard icon={CheckCircle2} title="Cierre" text={`${entregados.length} pedidos aparecen como entregados en la vista actual.`} />
      </section>
    </AppShell>
  );
}

function VentaRow({ pedido:p, onOpen }: { pedido:Pedido; onOpen:()=>void }) {
  const dias = p.fecha_entrega ? Math.ceil((new Date(p.fecha_entrega).getTime()-new Date().setHours(0,0,0,0))/86400000) : null;
  const estado = p.estado === "Entregado" || p.ventas_estado === "Entregado" ? "Entregado" : p.estado === "En Camino" || p.ventas_estado === "En Camino" ? "En Camino" : p.estado === "Listo para Entrega" || p.ventas_estado === "Listo para Entrega" ? "Listo para Entrega" : p.ventas_estado || p.estado;
  return <tr onClick={onOpen} className="cursor-pointer hover:bg-surface-muted/60"><td className="px-5 py-4"><b className="text-sm">{p.referencia}</b>{p.contrato?<span className="block text-[10px] text-muted-foreground">{p.contrato}</span>:null}</td><td className="px-5 py-4 text-sm">{p.cliente||"Cliente pendiente"}</td><td className="px-5 py-4"><span className="inline-flex rounded-lg border border-border bg-surface-muted px-2.5 py-1 text-xs font-semibold">{p.sede_nombre||"Taller no asignado"}</span></td><td className="px-5 py-4 text-sm">{money(p.importe)}</td><td className="px-5 py-4"><Status estado={estado}/></td><td className="px-5 py-4 text-xs">{fmtFecha(p.fecha_entrega)||"—"}{dias!==null&&dias<0&&!esEstadoFinalPedido(p.estado)?<span className="ml-2 font-semibold text-danger">Vencido</span>:null}</td><td className="px-5 py-4 text-sm font-semibold">{money(p.saldo)}</td><td className="px-5 py-4 text-right"><ArrowRight className="ml-auto size-4 text-muted-foreground"/></td></tr>;
}
function Status({estado}:{estado:string}){return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${estadoClases[estado]??"bg-surface-muted text-muted-foreground"}`}>{estado}</span>}
function Metric({icon:Icon,label,value,tone="neutral"}:{icon:typeof ClipboardList;label:string;value:number|string;tone?:"neutral"|"warning"|"positive"}){return <div className="rounded-2xl border border-border bg-card p-4 shadow-card"><div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-xl bg-surface-muted text-gold"><Icon className="size-4"/></span><span className={`text-xl font-semibold tabular-nums ${tone==="warning"?"text-warning":tone==="positive"?"text-success":"text-foreground"}`}>{value}</span></div><p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p></div>}
function AreaCard({icon:Icon,title,text}:{icon:typeof CreditCard;title:string;text:string}){return <div className="rounded-2xl border border-border bg-card p-5"><Icon className="size-5 text-gold"/><h3 className="mt-3 text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></div>}
function money(v:number|null|undefined){return new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN"}).format(Number(v)||0)}
