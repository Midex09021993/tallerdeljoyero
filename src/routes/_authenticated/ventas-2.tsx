import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, Banknote, Box, CheckCircle2, ClipboardList, CreditCard, PackageCheck, Search, Truck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SelectorSedeDueno, useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";
import { areaCoincide, useSesion } from "@/lib/auth";
import { estadoClases, esEstadoFinalPedido, resumenFinancieroContrato, useContratos, usePagosContratos, usePedidos, type Pedido } from "@/lib/taller-db";
import { fmtFecha } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ventas-2")({
  head: () => ({ meta: [{ title: "Ventas 2 — Taller del Joyero" }, { name: "description", content: "Centro comercial de cobros, cartera, despacho y entrega del taller." }] }),
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

  const finanzas = useMemo(() => contratos.map((c) => resumenFinancieroContrato(c, pagos.filter((p) => p.contrato_id === c.id))), [contratos, pagos]);
  const finanzasPorContrato = useMemo(() => new Map(finanzas.map((f) => [f.contrato_id ?? "", f])), [finanzas]);
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
      titulo="Ventas 2"
      subtitulo={loadingPedidos || loadingContratos ? "Sincronizando cartera…" : `Centro comercial · ${sesion?.esDueno ? etiquetaSede : sesion?.sede?.nombre ?? "Tu sede"}`}
      acciones={<div className="flex flex-wrap items-center gap-2"><SelectorSedeDueno esDueno={esDueno} sedes={sedes} value={sedeFiltro} onChange={setSedeFiltro} /><Link to="/ventas" className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold text-muted-foreground">Ventas anterior</Link></div>}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={ClipboardList} label="Cartera activa" value={activos.length} />
        <Metric icon={CreditCard} label="Por cobrar" value={money(totalPendiente)} tone="warning" />
        <Metric icon={Banknote} label="Cobrado" value={money(totalCobrado)} tone="positive" />
        <Metric icon={Truck} label="Por entregar" value={porEntregar.length} />
        <Metric icon={PackageCheck} label="En camino" value={enCamino.length} />
      </div>

      <section className="mt-6 rounded-[24px] border border-border bg-card shadow-card">
        <div className="border-b border-border p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-gold">Centro comercial</p><h2 className="mt-1 text-xl font-semibold">Cartera y cumplimiento</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Ventas controla la relación económica y el cierre del pedido: cobro, preparación, despacho, entrega y trazabilidad.</p></div>
            <div className="relative w-full lg:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar cliente, pedido, contrato o guía…" className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-gold/50" /></div>
          </div>
          <div className="mt-5 flex flex-wrap gap-1 rounded-xl bg-surface-muted p-1">
            {([["cartera","Cartera",activos.length],["cobros","Cobros",cobrosPendientes],["despacho","Despacho",porEntregar.length+enCamino.length],["entregados","Entregados",entregados.length]] as const).map(([id,label,count]) => <button key={id} type="button" onClick={() => setVista(id)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${vista===id ? "bg-card text-foreground shadow-card" : "text-muted-foreground"}`}>{label} <span className="ml-1 opacity-60">{count}</span></button>)}
          </div>
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-left">
            <thead className="border-b border-border bg-surface-muted/60"><tr>{["Pedido","Cliente","Taller","Venta","Estado","Entrega","Saldo","Acción"].map((h)=><th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">{lista.map((p)=><VentaRow key={p.id} pedido={{...p, saldo: saldoPedido(p)}} onOpen={()=>navigate({to:"/ventas-2/$id",params:{id:p.id}})}/>)}</tbody>
          </table>
        </div>
        <div className="divide-y divide-border lg:hidden">{lista.map((p)=><button key={p.id} type="button" onClick={()=>navigate({to:"/ventas-2/$id",params:{id:p.id}})} className="w-full p-4 text-left"><div className="flex justify-between gap-3"><div><b className="text-sm">{p.referencia}</b><p className="mt-1 text-xs text-muted-foreground">{p.cliente || "Cliente pendiente"}</p></div><Status estado={p.estado}/></div><p className="mt-3 text-sm">{p.trabajo || p.pieza || "Pedido"}</p><div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>{p.medio_envio || "Entrega"}</span><span>{fmtFecha(p.fecha_entrega) || "Sin fecha"}</span></div></button>)}</div>
        {!lista.length ? <div className="p-12 text-center text-sm text-muted-foreground">No hay registros en esta vista.</div> : null}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <AreaCard icon={CreditCard} title="Cobranza" text={`${cobrosPendientes} contratos con saldo pendiente · ${money(totalPendiente)} por cobrar.`} />
        <AreaCard icon={Truck} title="Logística" text={`${porEntregar.length} pedidos por preparar/entregar y ${enCamino.length} en camino.`} />
        <AreaCard icon={CheckCircle2} title="Cierre" text={`${entregados.length} pedidos entregados en la vista actual.`} />
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
