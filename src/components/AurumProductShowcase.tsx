import { useEffect, useRef, useState } from "react";
import {
  Activity, CalendarDays, CheckCircle2, CircleAlert, ClipboardList, Contact,
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
  return <aside className="hidden w-[17%] shrink-0 flex-col bg-[#192d3d] text-white sm:flex">
    <div className="border-b border-white/10 px-3 py-3"><div className="font-serif text-[17px] italic leading-none text-[#d3ae70]">Aurum Lab</div></div>
    <div className="flex-1 space-y-3 overflow-hidden px-2 py-3">{groups.map(group=><div key={group.label}><p className="mb-1.5 px-2 text-[7px] font-bold tracking-[.16em] text-slate-400">{group.label}</p><div className="space-y-0.5">{group.items.map(item=>{const I=item.icon;const selected=item.id===active;return <div key={item.name} className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[8px] ${selected?"border border-[#c5a36b]/50 bg-white/10 font-semibold text-[#e8d4ad]":"text-slate-300"}`}><I className="size-2.5 shrink-0"/>{item.name}</div>})}</div></div>)}</div>
    <div className="border-t border-white/10 px-3 py-3"><div className="text-[7px] font-semibold">AURUM LAB</div><div className="mt-1 text-[6px] text-slate-400">Espacio de trabajo</div></div>
  </aside>;
}

function Metric({ label, value="—", detail, icon: Icon }: {label:string;value?:string;detail:string;icon:typeof Package}) {
  return <div className="min-w-0 rounded-lg border border-[#293b4a]/10 bg-[#fffefc] p-2 shadow-[0_5px_14px_-12px_rgba(24,40,56,.4)]"><div className="flex items-start justify-between gap-1"><p className="text-[7px] font-bold uppercase tracking-[.12em] text-[#71808d]">{label}</p><Icon className="size-2.5 shrink-0 text-[#b9955d]"/></div><p className="mt-2 font-serif text-[12px] sm:text-[13px] font-semibold leading-tight break-words text-[#203142]">{value}</p><p className="mt-1 text-[7px] text-[#71808d]">{detail}</p></div>;
}

function DemoCount({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [shown, setShown] = useState(value);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || done) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") { setShown(value); setDone(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || done) return;
      setDone(true); observer.disconnect();
      const start = performance.now(), duration = 760;
      const timer = window.setInterval(() => {
        const progress = Math.min((performance.now() - start) / duration, 1);
        setShown(Math.round(value * progress));
        if (progress >= 1) window.clearInterval(timer);
      }, 24);
    }, { threshold: 0.15 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [value, done]);
  return <span ref={ref} aria-label={String(value)}>{shown}</span>;
}
function DemoMetric({ label, value, detail, icon: Icon, alert = false }: { label: string; value: number; detail: string; icon: typeof Package; alert?: boolean }) {
  return <div className={`min-w-0 rounded-lg border p-2 ${alert ? "border-[#e87970]/30 bg-[#fff9f8]" : "border-[#293b4a]/10 bg-[#fffefc]"}`}>
    <div className="flex items-start justify-between gap-1"><p className="text-[7px] font-bold uppercase tracking-[.1em] text-[#71808d]">{label}</p><Icon className={`size-2.5 shrink-0 ${alert ? "text-[#d76b63]" : "text-[#b9955d"}`}/></div>
    <p className={`mt-1.5 font-serif text-[13px] font-semibold leading-tight ${alert ? "text-[#c65e56]" : "text-[#203142"}`}><DemoCount value={value}/></p><p className="mt-0.5 text-[6px] text-[#71808d]">{detail}</p>
  </div>;
}
function MiniHome() {
  const [tab, setTab] = useState<"todos"|"vencidos"|"recibir">("todos");
  const tasks = [
    {name:"Anillo de compromiso · Ana R.",detail:"Entrega: mañana · En producción",type:"todos",tag:"Mañana"},
    {name:"Cadena 18K · Jorge M.",detail:"Vencido hace 1 día",type:"vencidos",tag:"Vencido"},
    {name:"Pendientes de perla · Lucía P.",detail:"Por recibir",type:"recibir",tag:"Recepción"},
  ];
  const visibleTasks = tab==="todos" ? tasks : tasks.filter(x=>x.type===tab);
  return <div className="space-y-2.5" aria-label="Vista previa de demostración del panel de AURUM LAB con datos de ejemplo">
    <header className="flex items-center justify-between gap-2 rounded-lg border border-[#c5a36b]/25 bg-gradient-to-r from-[#fffefc] to-[#f2ebdd] px-3 py-2">
      <div><p className="text-[6px] font-bold tracking-[.18em] text-[#a98249]">✧ AURUM LAB / OPERACIONES</p><div className="mt-1 text-[12px] font-semibold leading-tight text-[#182838]">Centro de control</div><p className="mt-1 text-[6px] text-[#71808d]">Sede: Taller Central</p></div>
      <span className="shrink-0 rounded-full border border-[#c5a36b]/30 bg-white px-2 py-1 text-[6px] text-[#92734b]">Datos de ejemplo</span>
    </header>
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      <DemoMetric label="Pedidos activos" value={12} detail="En seguimiento" icon={PackageCheck}/>
      <DemoMetric label="En producción" value={5} detail="Trabajo en curso" icon={Package}/>
      <DemoMetric label="Entregas hoy" value={3} detail="Compromisos de hoy" icon={CheckCircle2}/>
      <DemoMetric label="Vencidos" value={1} detail="Requieren atención" icon={CircleAlert} alert/>
    </div>
    <section className="space-y-1.5">
      <div className="flex items-end justify-between gap-2 border-b border-slate-200 pb-1.5"><div><p className="text-[6px] font-bold tracking-[.17em] text-[#a98249]">01 / VISIÓN DEL NEGOCIO</p><div className="mt-0.5 text-[9px] font-semibold text-[#182838]">Comercial e inventario</div><p className="text-[6px] text-[#71808d]">Taller Central · Demostración</p></div></div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <DemoMetric label="Clientes registrados" value={48} detail="Cartera del taller" icon={Users}/>
        <DemoMetric label="Cotizaciones pendientes" value={7} detail="Borrador o enviadas" icon={FileText}/>
        <DemoMetric label="Cotizaciones aprobadas" value={15} detail="Aprobaciones registradas" icon={CheckCircle2}/>
        <DemoMetric label="Stock bajo o mínimo" value={3} detail="Materiales por revisar" icon={Warehouse} alert/>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-[#293b4a]/10 bg-white p-2"><div><p className="text-[7px] font-semibold">Próximas a vencer</p><p className="text-[6px] text-slate-500">Cotizaciones · próximos 7 días</p></div><span className="font-serif text-[13px] font-semibold text-[#203142]"><DemoCount value={2}/></span></div>
        <div className="rounded-lg border border-[#293b4a]/10 bg-white p-2"><p className="text-[7px] font-semibold">Materiales en mínimo</p><div className="mt-1 space-y-1 text-[6px] text-slate-600"><div className="flex justify-between"><span>Oro 18K</span><span>12 g <span className="text-slate-400">/ 20 g</span></span></div><div className="flex justify-between"><span>Plata 950</span><span>40 g <span className="text-slate-400">/ 50 g</span></span></div><div className="flex justify-between"><span>Gema 0.25 ct</span><span>2 <span className="text-slate-400">/ 5 unid.</span></span></div></div></div>
      </div>
    </section>
    <div className="grid grid-cols-[1.55fr_1fr] gap-1.5">
      <section className="overflow-hidden rounded-lg border border-[#293b4a]/10 bg-white">
        <div className="border-b border-slate-200 bg-[#fbfaf7] p-2"><div className="flex justify-between gap-1"><div><p className="text-[8px] font-semibold text-[#182838]">Atención prioritaria</p><p className="text-[6px] text-[#71808d]">Seguimiento de pedidos</p></div><span className="text-[5px] text-[#a98249]">Ver pedidos ›</span></div>
          <div className="mt-1.5 flex gap-1">{([{id:"todos",label:"Todos"},{id:"vencidos",label:"Vencidos"},{id:"recibir",label:"Por recibir"}] as const).map(x=><button key={x.id} type="button" onClick={()=>setTab(x.id)} className={`rounded-md border px-1.5 py-0.5 text-[5px] ${tab===x.id?"border-[#c5a36b]/30 bg-[#f5ecdc] font-semibold text-[#92734b]":"border-slate-200 text-slate-500"}`}>{x.label}</button>)}</div>
        </div>
        <div className="space-y-1 p-1.5">{visibleTasks.map(x=><div key={x.name} className="flex items-center justify-between gap-1 rounded-md border border-slate-100 p-1.5"><div className="min-w-0"><p className="truncate text-[6px] font-semibold text-[#203142]">{x.name}</p><p className="text-[5px] text-slate-500">{x.detail}</p></div><span className={`shrink-0 rounded-full px-1 py-0.5 text-[5px] ${x.type==="vencidos"?"bg-[#fff0ed] text-[#c65e56]":"bg-[#f5ecdc] text-[#92734b"}`}>{x.tag}</span></div>)}</div>
      </section>
      <div className="space-y-1.5">
        <section className="overflow-hidden rounded-lg border border-[#293b4a]/10 bg-white"><div className="border-b border-slate-100 p-2"><p className="text-[7px] font-semibold text-[#203142]">Estado de producción</p><p className="text-[6px] text-slate-500">Carga por área</p></div><div className="space-y-1.5 p-2">{[{name:"Diseño 3D",n:4,w:"80%"},{name:"Impresión",n:3,w:"60%"},{name:"Casting",n:2,w:"40%"}].map(x=><div key={x.name}><div className="flex justify-between text-[6px] text-slate-600"><span>{x.name}</span><span><DemoCount value={x.n}/></span></div><div className="mt-0.5 h-1 rounded-full bg-slate-100"><div className="h-1 rounded-full bg-[#c5a36b]" style={{width:x.w}}/></div></div>)}</div></section>
        <section className="rounded-lg border border-[#293b4a]/10 bg-white p-2"><p className="text-[7px] font-semibold text-[#203142]">Resumen del día</p><div className="mt-1.5 space-y-1">{[{name:"En recepción",n:2},{name:"Entregas vencidas",n:1},{name:"Sin fecha de entrega",n:1}].map(x=><div key={x.name} className="flex justify-between gap-1 text-[6px] text-slate-500"><span>{x.name}</span><span className="font-semibold text-slate-700"><DemoCount value={x.n}/></span></div>)}</div></section>
      </div>
    </div>
  </div>;
}
function MiniClients() {
  return <div className="space-y-2">
    <header className="flex items-end justify-between gap-2">
      <div className="min-w-0"><div className="font-serif text-[14px] sm:text-[16px] leading-tight text-[#182838]">Clientes</div><p className="mt-1 text-[7px] text-[#71808d]">Directorio comercial, historial y relación con cada cliente.</p></div>
      <div className="flex shrink-0 gap-1.5">
        <div className="rounded-lg border border-[#c5a36b]/20 bg-white px-2 py-1.5"><p className="text-[5px] font-bold tracking-widest text-[#c5a36b]">DIRECTORIO</p><p className="mt-1 text-[10px] font-semibold text-[#203142]">Clientes</p><p className="text-[5px] text-slate-400">Registrados</p></div>
        <div className="rounded-lg border border-[#c5a36b]/20 bg-white px-2 py-1.5"><p className="text-[5px] font-bold tracking-widest text-[#c5a36b]">ESTADO</p><p className="mt-1 text-[10px] font-semibold text-[#203142]">Activos</p><p className="text-[5px] text-slate-400">Clientes activos</p></div>
        <div className="flex min-w-[52px] flex-col justify-between rounded-lg border border-[#c5a36b]/25 bg-white px-2 py-1.5"><Plus className="size-2.5 text-[#b9955d]"/><p className="text-[6px] font-semibold text-[#203142]">Nuevo cliente</p></div>
      </div>
    </header>

    <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
      <span className="rounded-md bg-[#c5a36b] px-2.5 py-1 text-[6px] font-semibold text-[#182838]">Clientes</span>
      <span className="inline-flex items-center gap-1 px-2 py-1 text-[6px] text-slate-500"><CalendarDays className="size-2"/>Cumpleaños</span>
      <span className="inline-flex items-center gap-1 px-2 py-1 text-[6px] text-slate-500"><Mail className="size-2"/>Campañas</span>
    </div>

    <div className="grid grid-cols-[1.08fr_0.92fr] gap-2">
      <section className="min-w-0 overflow-hidden rounded-lg border border-[#293b4a]/10 bg-white">
        <div className="border-b border-slate-200 bg-[#fbfaf7] p-2">
          <p className="text-[5px] font-bold tracking-[.18em] text-[#a98249]">CRM / DIRECTORIO</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-1"><div className="text-[8px] font-semibold text-[#182838]">Clientes del taller</div><span className="rounded-full bg-[#f1eee8] px-1.5 py-0.5 text-[5px] text-slate-500">Resultados</span></div>
          <div className="mt-1.5 flex gap-1">
            <span className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[5px] text-slate-500">Todos los tipos⌄</span>
            <span className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[5px] text-slate-500">Todos los estados⌄</span>
          </div>
          <div className="mt-1.5 flex h-5 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 text-[5px] text-slate-400"><Search className="size-2 shrink-0"/> Buscar nombre, documento, teléfono, WhatsApp, correo o ciudad…</div>
        </div>
        <div className="flex min-h-[82px] items-center justify-center p-2 text-center">
          <div><Users className="mx-auto size-4 text-[#b9955d]"/><p className="mt-1 text-[6px] font-semibold text-[#203142]">Directorio de clientes</p><p className="mt-0.5 text-[5px] text-slate-400">Particulares y empresas · Estados activo e inactivo</p></div>
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-lg border border-[#293b4a]/10 bg-white">
        <div className="flex min-h-[142px] flex-col items-center justify-center p-3 text-center">
          <span className="grid size-8 place-items-center rounded-full border border-[#c5a36b]/20 bg-[#f8f4eb] text-[#b9955d]"><Contact className="size-4"/></span>
          <p className="mt-2 text-[8px] font-semibold text-[#203142]">Selecciona un cliente</p>
          <p className="mt-1 max-w-[125px] text-[6px] leading-relaxed text-slate-500">Aquí verás sus datos y su relación comercial con el taller.</p>
        </div>
      </section>
    </div>
  </div>;
}
function MiniQuotes() {
  return <div className="space-y-2.5">
    <header className="flex items-end justify-between"><div><div className="font-serif text-[14px] sm:text-[16px] leading-tight text-[#182838]">Cotizaciones</div><p className="mt-1 text-[7px] text-[#71808d]">Presupuestos comerciales conectados con clientes y conceptos de venta.</p></div></header>
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3"><Metric label="Cotizaciones" detail="Presupuestos vigentes" icon={FileText}/><Metric label="Enviadas" detail="Al cliente" icon={Activity}/><Metric label="Requieren revisión" detail="Cambios solicitados" icon={Clock3}/><Metric label="Aprobadas" detail="Aprobaciones registradas" icon={CheckCircle2}/><Metric label="Total aprobado" detail="Valor comercial" icon={Gem}/><div className="flex min-h-[54px] flex-col justify-between rounded-lg border border-[#c5a36b]/25 bg-white p-2"><Plus className="size-3 text-[#b9955d]"/><p className="text-[7px] font-semibold text-[#35495b]">Nueva cotización</p></div></div>
    <section className="overflow-hidden rounded-lg border border-[#c5a36b]/20 bg-white"><div className="flex items-center justify-between border-b border-slate-100 p-2"><div><p className="text-[5px] font-bold tracking-[.18em] text-[#c5a36b]">ENTRADA COMERCIAL</p><div className="mt-0.5 text-[9px] font-semibold text-[#182838]">Solicitudes del catálogo</div><p className="text-[6px] text-slate-500">Consultas recibidas desde las fichas públicas de tus joyas.</p></div><span className="rounded-full border border-[#c5a36b]/20 px-2 py-1 text-[5px] text-slate-500">Pendientes de cotización</span></div><div className="flex min-h-[54px] flex-col items-center justify-center p-2 text-center"><FileText className="size-4 text-[#c5a36b]"/><p className="mt-1 text-[7px] font-medium">Todavía no hay solicitudes del catálogo</p></div></section>
    <section className="overflow-hidden rounded-lg border border-[#c5a36b]/20 bg-white"><div className="flex items-center justify-between border-b border-slate-100 p-2"><div><p className="text-[5px] font-bold tracking-[.18em] text-[#c5a36b]">GESTIÓN COMERCIAL</p><div className="mt-0.5 text-[9px] font-semibold text-[#182838]">Cotizaciones del taller</div><p className="text-[6px] text-slate-500">Presupuestos vinculados a clientes y conceptos comerciales.</p></div><span className="flex items-center gap-1 text-[5px] text-slate-500"><Clock3 className="size-2"/> Seguimiento comercial</span></div><div className="flex h-6 items-center gap-1 border-b border-slate-100 px-2 text-[6px] text-slate-400"><Search className="size-2.5"/> Buscar por número, cliente o estado…</div><div className="grid grid-cols-5 bg-[#f8f7f3] px-2 py-1.5 text-[5px] font-semibold uppercase text-slate-500">{["Cotización","Cliente","Taller","Estado","Total"].map(x=><span key={x}>{x}</span>)}</div><div className="p-3 text-center text-[6px] text-slate-400">Listado de cotizaciones</div></section>
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
  const current = pages[active] ?? pages[0]!;

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), { threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setInterval(() => setActive(value => (value + 1) % pages.length), 6500);
    return () => window.clearInterval(timer);
  }, [visible]);

  return <section ref={rootRef} className="relative mx-auto w-full max-w-[820px]" aria-label="Vista previa de las interfaces de AURUM LAB">
    <style>{`
      @keyframes aurum-mini-page { 0% { opacity:0; transform:translate3d(26px,5px,0) } 100% { opacity:1; transform:translate3d(0,0,0) } }
      .aurum-mini-page { animation:aurum-mini-page .68s cubic-bezier(.2,.72,.2,1) both; }
      @media (prefers-reduced-motion: reduce) { .aurum-mini-page { animation:none!important } }
    `}</style>
    <div className="pointer-events-none absolute inset-x-8 top-8 bottom-0 rounded-[28px] bg-gradient-to-br from-[#f6e8c4]/55 via-[#f5f7fa] to-[#e3eaf2] blur-2xl"/>
    <div className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-[#f7f5f0] shadow-[0_24px_70px_rgba(25,39,54,.16)]">
      <div className="flex h-7 items-center justify-between border-b border-slate-200/80 bg-white px-3"><div className="flex gap-1"><span className="size-2 rounded-full bg-[#ff6b63]"/><span className="size-2 rounded-full bg-[#ffce45]"/><span className="size-2 rounded-full bg-[#4ac58b]"/></div><span className="rounded-full bg-slate-100 px-9 py-1 text-[6px] tracking-wide text-slate-400">AURUM LAB · VISTA DEL PRODUCTO</span><span className="w-5"/></div>
      <div className="flex h-[390px] sm:h-[450px]">
        <Sidebar active={current.id}/>
        <main key={current.id} className="aurum-mini-page min-w-0 flex-1 overflow-hidden bg-[#f7f5f0] p-2.5 sm:p-3.5">
          <PageContent page={current.id}/>
        </main>
      </div>
      <div className="flex min-h-8 items-center justify-between gap-2 border-t border-slate-200/80 bg-white px-3 py-1.5"><span className="text-[7px] font-bold tracking-[.17em] text-[#a98249]">AURUM LAB</span><div className="flex shrink-0 items-center gap-1.5"><span className="size-1 rounded-full bg-emerald-500"/><span className="text-[6px] text-slate-500">{current.label} · {String(active+1).padStart(2,"0")} / 03</span></div></div>
    </div>
    <div className="pointer-events-none absolute -bottom-3 right-4 -z-10 h-5 w-[94%] rounded-full bg-slate-300/35 blur-xl"/>
  </section>;
}
