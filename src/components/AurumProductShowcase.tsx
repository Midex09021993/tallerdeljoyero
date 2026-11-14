import { useEffect, useRef, useState } from "react";
import {
  Activity, CalendarDays, CheckCircle2, ChevronRight, CircleAlert, ClipboardList,
  Clock3, FileText, Gem, LayoutDashboard, Mail, Package, PackageCheck,
  Plus, Search, Users, Warehouse,
} from "lucide-react";

type Page = "inicio" | "clientes" | "cotizaciones";

const pages: Array<{ id: Page; label: string; title: string }> = [
  { id: "inicio", label: "INICIO", title: "Centro de control" },
  { id: "clientes", label: "CLIENTES", title: "Directorio comercial" },
  { id: "cotizaciones", label: "COTIZACIONES", title: "Gestión comercial" },
];

function Sidebar({ active }: { active: Page }) {
  const groups = [
    { label: "PRINCIPAL", items: [{ name: "Inicio", icon: LayoutDashboard, id: "inicio" }] },
    { label: "COMERCIAL", items: [
      { name: "Clientes", icon: Users, id: "clientes" },
      { name: "Cotizaciones", icon: ClipboardList, id: "cotizaciones" },
      { name: "Contratos", icon: FileText, id: "none" },
      { name: "Pedidos", icon: Package, id: "none" },
      { name: "Ventas", icon: Activity, id: "none" },
      { name: "Catálogo", icon: Gem, id: "none" },
    ] },
    { label: "PRODUCCIÓN", items: [
      { name: "Diseño 3D", icon: LayoutDashboard, id: "none" },
      { name: "Impresión 3D", icon: Package, id: "none" },
      { name: "Casting", icon: Warehouse, id: "none" },
    ] },
  ];
  return <aside className="hidden w-[15%] shrink-0 flex-col bg-[#192d3d] text-white sm:flex">
    <div className="border-b border-white/10 px-3 py-3"><div className="font-serif text-[17px] italic leading-none text-[#d3ae70]">Aurum Lab</div><div className="mt-1 text-[6px] font-bold tracking-[.24em] text-slate-300">FADILAB</div></div>
    <div className="flex-1 space-y-3 overflow-hidden px-2 py-3">{groups.map(group=><div key={group.label}><p className="mb-1.5 px-2 text-[6px] font-bold tracking-[.16em] text-slate-400">{group.label}</p><div className="space-y-0.5">{group.items.map(item=>{const I=item.icon;const selected=item.id===active;return <div key={item.name} className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[7px] ${selected?"border border-[#c5a36b]/50 bg-white/10 font-semibold text-[#e8d4ad]":"text-slate-300"}`}><I className="size-2.5 shrink-0"/>{item.name}</div>})}</div></div>)}</div>
    <div className="border-t border-white/10 px-3 py-3"><div className="text-[7px] font-semibold">AURUM LAB</div><div className="mt-1 text-[6px] text-slate-400">Espacio de trabajo</div></div>
  </aside>;
}

function Metric({ label, value="—", detail, icon: Icon }: {label:string;value?:string;detail:string;icon:typeof Package}) {
  return <div className="min-w-0 rounded-lg border border-[#293b4a]/10 bg-[#fffefc] p-2 shadow-[0_5px_14px_-12px_rgba(24,40,56,.4)]"><div className="flex items-start justify-between gap-1"><p className="text-[6px] font-bold uppercase tracking-[.12em] text-[#71808d]">{label}</p><Icon className="size-2.5 shrink-0 text-[#b9955d]"/></div><p className="mt-2 font-serif text-[17px] font-semibold leading-none text-[#203142]">{value}</p><p className="mt-1 text-[6px] text-[#71808d]">{detail}</p></div>;
}

function MiniHome() {
  return <div className="space-y-2.5">
    <header className="flex items-center justify-between rounded-lg border border-[#c5a36b]/25 bg-gradient-to-r from-[#fffefc] to-[#f2ebdd] px-3 py-2"><div><p className="text-[6px] font-bold tracking-[.18em] text-[#a98249]">✧ AURUM LAB / OPERACIONES</p><h3 className="mt-1 font-serif text-[17px] font-semibold leading-none text-[#182838]">Centro de control</h3><p className="mt-1 text-[7px] text-[#71808d]">Visión general del taller</p></div><div className="rounded-md border border-[#e8e1d6] bg-white px-2 py-1 text-[6px] text-slate-600">Sede de trabajo</div></header>
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4"><Metric label="Pedidos activos" detail="En seguimiento" icon={PackageCheck}/><Metric label="En producción" detail="Trabajo en curso" icon={Package}/><Metric label="Entregas hoy" detail="Compromisos de hoy" icon={CheckCircle2}/><Metric label="Vencidos" detail="Requieren atención" icon={CircleAlert}/></div>
    <div><p className="text-[6px] font-bold tracking-[.17em] text-[#a98249]">01 / VISIÓN DEL NEGOCIO</p><h4 className="mt-0.5 text-[9px] font-semibold text-[#182838]">Comercial e inventario</h4><p className="text-[6px] text-[#71808d]">Indicadores del taller seleccionado</p></div>
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4"><Metric label="Clientes registrados" detail="Cartera del taller" icon={Users}/><Metric label="Cotizaciones pendientes" detail="Borrador o enviadas" icon={FileText}/><Metric label="Cotizaciones aprobadas" detail="Aprobaciones registradas" icon={CheckCircle2}/><Metric label="Stock bajo o mínimo" detail="Materiales por revisar" icon={Warehouse}/></div>
    <div className="grid grid-cols-2 gap-1.5"><div className="rounded-lg border border-[#293b4a]/10 bg-white p-2"><p className="text-[7px] font-semibold">Cotizaciones próximas a vencer</p><p className="mt-1 text-[6px] text-slate-500">Pendientes con vencimiento en los próximos 7 días</p></div><div className="rounded-lg border border-[#293b4a]/10 bg-white p-2"><p className="text-[7px] font-semibold">Materiales que requieren revisión</p><p className="mt-1 text-[6px] text-slate-500">Revisión de inventario</p></div></div>
    <div className="grid grid-cols-[1.4fr_1fr] gap-1.5"><div className="rounded-lg border border-[#293b4a]/10 bg-white p-2"><p className="text-[7px] font-semibold">Atención prioritaria</p><p className="mt-1 text-[6px] text-slate-500">Seguimiento de pedidos que necesitan una acción</p><div className="mt-2 rounded-md bg-[#f7f5f0] p-2 text-center text-[6px] text-slate-500">Panel de seguimiento</div></div><div className="rounded-lg border border-[#293b4a]/10 bg-white p-2"><p className="text-[7px] font-semibold">Estado de producción</p><p className="mt-2 text-[6px] text-slate-500">Carga actual por área</p>{["Diseño 3D","Impresión","Casting"].map(x=><div key={x} className="mt-2 border-t border-slate-100 pt-1 text-[6px] text-slate-600">{x}<div className="mt-1 h-1 rounded bg-slate-100"/></div>)}</div></div>
  </div>;
}

function MiniClients() {
  return <div className="space-y-2.5">
    <header className="flex items-end justify-between gap-2"><div><h3 className="font-serif text-[18px] leading-none text-[#182838]">Clientes</h3><p className="mt-1 text-[7px] text-[#71808d]">Directorio comercial, historial y relación con cada cliente.</p></div><div className="flex gap-1.5"><div className="rounded-lg border border-[#c5a36b]/20 bg-white px-2 py-1.5"><p className="text-[5px] font-bold tracking-widest text-[#c5a36b]">DIRECTORIO</p><p className="mt-1 text-[10px] font-semibold text-[#203142]">Clientes</p></div><div className="rounded-lg border border-[#c5a36b]/20 bg-white px-2 py-1.5"><p className="text-[5px] font-bold tracking-widest text-[#c5a36b]">ESTADO</p><p className="mt-1 text-[10px] font-semibold text-[#203142]">Activos</p></div></div></header>
    <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1"><span className="rounded-md bg-[#c5a36b] px-3 py-1 text-[7px] font-semibold text-[#182838]">Clientes</span><span className="px-2 py-1 text-[7px] text-slate-500">♧ Cumpleaños</span><span className="px-2 py-1 text-[7px] text-slate-500">✉ Campañas</span></div>
    <div className="grid grid-cols-[1.1fr_1fr] gap-2">
      <div className="overflow-hidden rounded-lg border border-[#293b4a]/10 bg-white"><div className="border-b border-slate-100 bg-[#fbfaf7] p-2"><p className="text-[5px] font-bold tracking-[.18em] text-[#a98249]">CRM / DIRECTORIO</p><div className="mt-1 flex items-center justify-between"><h4 className="text-[9px] font-semibold text-[#182838]">Clientes del taller</h4><span className="rounded-full bg-[#f1eee8] px-1.5 py-0.5 text-[5px] text-slate-500">Directorio</span></div><div className="mt-2 flex h-6 items-center gap-1 rounded-md border border-slate-200 px-2 text-[6px] text-slate-400"><Search className="size-2.5"/> Buscar nombre, documento, teléfono…</div></div><div className="divide-y divide-slate-100"><div className="flex items-center gap-2 p-2"><span className="grid size-5 place-items-center rounded-md border border-[#c5a36b]/30 bg-[#f7f0e4] text-[7px] text-[#a98249]"><Users className="size-3"/></span><div><p className="text-[7px] font-semibold text-slate-700">Ficha de cliente</p><p className="text-[6px] text-slate-400">Datos comerciales</p></div><span className="ml-auto rounded-full bg-emerald-50 px-1.5 py-0.5 text-[5px] text-emerald-600">ACTIVO</span></div><div className="flex items-center gap-2 p-2"><span className="grid size-5 place-items-center rounded-md border border-[#c5a36b]/30 bg-[#f7f0e4] text-[7px] text-[#a98249]"><Users className="size-3"/></span><div><p className="text-[7px] font-semibold text-slate-700">Ficha de cliente</p><p className="text-[6px] text-slate-400">Datos comerciales</p></div><span className="ml-auto rounded-full bg-emerald-50 px-1.5 py-0.5 text-[5px] text-emerald-600">ACTIVO</span></div></div></div>
      <div className="flex min-h-[160px] flex-col items-center justify-center rounded-lg border border-[#293b4a]/10 bg-white p-3 text-center"><div className="grid size-10 place-items-center rounded-full border border-[#c5a36b]/20 text-[#c5a36b]"><Users className="size-4"/></div><p className="mt-2 text-[9px] font-semibold text-[#35495b]">Selecciona un cliente</p><p className="mt-1 max-w-[120px] text-[6px] text-slate-500">Aquí verás sus datos y su relación comercial con el taller.</p></div>
    </div>
  </div>;
}

function MiniQuotes() {
  return <div className="space-y-2.5">
    <header className="flex items-end justify-between"><div><h3 className="font-serif text-[18px] leading-none text-[#182838]">Cotizaciones</h3><p className="mt-1 text-[7px] text-[#71808d]">Presupuestos comerciales conectados con clientes y conceptos de venta.</p></div></header>
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6"><Metric label="Directorio" value="Cotizaciones" detail="Vigentes" icon={FileText}/><Metric label="Estado" value="Enviadas" detail="Al cliente" icon={Activity}/><Metric label="Atención" value="Revisión" detail="Cambios solicitados" icon={Clock3}/><Metric label="Estado" value="Aprobadas" detail="Aprobaciones" icon={CheckCircle2}/><Metric label="Comercial" value="Total aprobado" detail="Valor aprobado" icon={Gem}/><div className="flex min-h-[54px] flex-col justify-between rounded-lg border border-[#c5a36b]/25 bg-white p-2"><Plus className="size-3 text-[#b9955d]"/><p className="text-[7px] font-semibold text-[#35495b]">Nueva cotización</p></div></div>
    <section className="overflow-hidden rounded-lg border border-[#c5a36b]/20 bg-white"><div className="flex items-center justify-between border-b border-slate-100 p-2"><div><p className="text-[5px] font-bold tracking-[.18em] text-[#c5a36b]">ENTRADA COMERCIAL</p><h4 className="mt-0.5 text-[9px] font-semibold text-[#182838]">Solicitudes del catálogo</h4><p className="text-[6px] text-slate-500">Consultas recibidas desde las fichas públicas de tus joyas.</p></div><span className="rounded-full border border-[#c5a36b]/20 px-2 py-1 text-[5px] text-slate-500">Pendientes de cotización</span></div><div className="flex min-h-[54px] flex-col items-center justify-center p-2 text-center"><FileText className="size-4 text-[#c5a36b]"/><p className="mt-1 text-[7px] font-medium">Todavía no hay solicitudes del catálogo</p></div></section>
    <section className="overflow-hidden rounded-lg border border-[#c5a36b]/20 bg-white"><div className="flex items-center justify-between border-b border-slate-100 p-2"><div><p className="text-[5px] font-bold tracking-[.18em] text-[#c5a36b]">GESTIÓN COMERCIAL</p><h4 className="mt-0.5 text-[9px] font-semibold text-[#182838]">Cotizaciones del taller</h4><p className="text-[6px] text-slate-500">Presupuestos vinculados a clientes y conceptos comerciales.</p></div><span className="flex items-center gap-1 text-[5px] text-slate-500"><Clock3 className="size-2"/> Seguimiento comercial</span></div><div className="flex h-6 items-center gap-1 border-b border-slate-100 px-2 text-[6px] text-slate-400"><Search className="size-2.5"/> Buscar por número, cliente o estado…</div><div className="grid grid-cols-5 bg-[#f8f7f3] px-2 py-1.5 text-[5px] font-semibold uppercase text-slate-500">{["Cotización","Cliente","Taller","Estado","Total"].map(x=><span key={x}>{x}</span>)}</div><div className="p-3 text-center text-[6px] text-slate-400">Listado de cotizaciones</div></section>
  </div>;
}

function PageContent({ page }: { page: Page }) {
  if (page === "inicio") return <MiniHome/>;
  if (page === "clientes") return <MiniClients/>;
  return <MiniQuotes/>;
}

export function AurumProductShowcase() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const current = pages[active];

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), { threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setInterval(() => setActive(value => (value + 1) % pages.length), 5200);
    return () => window.clearInterval(timer);
  }, [visible]);

  return <section ref={rootRef} className="relative mx-auto w-full max-w-[760px]" aria-label="Vista previa de las interfaces de AURUM LAB">
    <style>{`
      @keyframes aurum-mini-page { 0% { opacity:0; transform:translate3d(26px,5px,0) } 100% { opacity:1; transform:translate3d(0,0,0) } }
      .aurum-mini-page { animation:aurum-mini-page .68s cubic-bezier(.2,.72,.2,1) both; }
      @media (prefers-reduced-motion: reduce) { .aurum-mini-page { animation:none!important } }
    `}</style>
    <div className="pointer-events-none absolute inset-x-8 top-8 bottom-0 rounded-[28px] bg-gradient-to-br from-[#f6e8c4]/55 via-[#f5f7fa] to-[#e3eaf2] blur-2xl"/>
    <div className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-[#f7f5f0] shadow-[0_24px_70px_rgba(25,39,54,.16)]">
      <div className="flex h-7 items-center justify-between border-b border-slate-200/80 bg-white px-3"><div className="flex gap-1"><span className="size-2 rounded-full bg-[#ff6b63]"/><span className="size-2 rounded-full bg-[#ffce45]"/><span className="size-2 rounded-full bg-[#4ac58b]"/></div><span className="rounded-full bg-slate-100 px-9 py-1 text-[6px] tracking-wide text-slate-400">AURUM LAB · VISTA DEL PRODUCTO</span><span className="w-5"/></div>
      <div className="flex h-[330px] sm:h-[390px]">
        <Sidebar active={current.id}/>
        <main key={current.id} className="aurum-mini-page min-w-0 flex-1 overflow-hidden bg-[#f7f5f0] p-2.5 sm:p-3.5">
          <PageContent page={current}/>
        </main>
      </div>
      <div className="flex h-7 items-center justify-between border-t border-slate-200/80 bg-white px-3"><span className="text-[6px] font-bold tracking-[.17em] text-[#a98249]">AURUM LAB</span><div className="flex items-center gap-1.5"><span className="size-1 rounded-full bg-emerald-500"/><span className="text-[6px] text-slate-500">{current.label} · {String(active+1).padStart(2,"0")} / 03</span></div></div>
    </div>
    <div className="pointer-events-none absolute -bottom-3 right-4 -z-10 h-5 w-[94%] rounded-full bg-slate-300/35 blur-xl"/>
  </section>;
}
