import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Panel } from "@/components/AppShell";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Clock3, FileText, Plus, Sparkles, WalletCards, WandSparkles, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/cotizaciones")({
  head: () => ({
    meta: [
      { title: "Cotizaciones — Aurum Lab" },
      { name: "description", content: "Gestión comercial de cotizaciones para talleres y joyerías." },
    ],
  }),
  component: CotizacionesPage,
});

type Cliente = { id: string; nombre: string; telefono: string | null; email: string | null };
type Proyecto = { id: string; codigo: string; nombre: string; cliente_id: string | null };
type Cotizacion = {
  id: string; numero: string; version: number; estado: string; fecha_emision: string;
  fecha_vencimiento: string | null; fecha_entrega_solicitada: string | null; moneda: string; subtotal: number; descuento: number;
  impuestos: number; total: number; cliente_id: string | null; proyecto_joya_id: string | null;
};


function money(n: number, moneda = "PEN") {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: moneda, maximumFractionDigits: 2 }).format(n);
}

function CotizacionesPage() {
  const { data: sesion } = useSesion();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [busca, setBusca] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [modoAsistido, setModoAsistido] = useState(false);
  const [textoAsistente, setTextoAsistente] = useState("");
  const [form, setForm] = useState({
    cliente_id: "", proyecto_joya_id: "", descripcion: "Servicio de joyería", cantidad: 1,
    costo: 0, precio: 0, descuento: 0, impuestos: 0, moneda: "PEN", fecha_vencimiento: "", fecha_entrega_solicitada: "",
    notas_cliente: "", notas_internas: "",
  });

  const cargar = async () => {
    const [{ data: c }, { data: p }, { data: q }] = await Promise.all([
      supabase.from("clientes").select("id,nombre,telefono,email").eq("estado", "activo").order("nombre"),
      supabase.from("proyectos_joya").select("id,codigo,nombre,cliente_id").order("created_at", { ascending: false }),
      supabase.from("cotizaciones").select("id,numero,version,estado,fecha_emision,fecha_vencimiento,fecha_entrega_solicitada,moneda,subtotal,descuento,impuestos,total,cliente_id,proyecto_joya_id").order("created_at", { ascending: false }),
    ]);
    if (c) setClientes(c);
    if (p) setProyectos(p);
    if (q) setCotizaciones(q);
  };

  useEffect(() => { void cargar(); }, []);

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return cotizaciones;
    return cotizaciones.filter((q) => {
      const cliente = clientes.find((c) => c.id === q.cliente_id)?.nombre ?? "";
      return [q.numero, q.estado, cliente].join(" ").toLowerCase().includes(t);
    });
  }, [busca, clientes, cotizaciones]);

  const totalAprobadas = cotizaciones.filter((q) => q.estado === "aprobada").reduce((s, q) => s + Number(q.total), 0);
  const borradores = cotizaciones.filter((q) => q.estado === "borrador").length;
  const pendientes = cotizaciones.filter((q) => ["enviada", "pendiente", "en_revision"].includes(q.estado)).length;

  function prepararAsistido() {
    const texto = textoAsistente.trim();
    if (!texto) return;
    const textoNormalizado = texto.toLowerCase();
    const cliente = clientes.find((c) => textoNormalizado.includes(c.nombre.toLowerCase()));
    const cantidadMatch = texto.match(/\b(\d+)\s*(?:unidades?|piezas?|anillos?|joyas?)/i);
    setForm((prev) => ({ ...prev, cliente_id: cliente?.id ?? prev.cliente_id, cantidad: cantidadMatch ? Math.max(1, Number(cantidadMatch[1])) : prev.cantidad, descripcion: texto }));
    setModoAsistido(false);
    setAbierto(true);
    toast.success(cliente ? "Encontré el cliente y preparé el borrador." : "Preparé el borrador. Revisa los datos antes de crear.");
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cliente_id || form.precio <= 0) return;
    setGuardando(true);
    try {
      const { data: q, error } = await supabase.from("cotizaciones").insert({
        cliente_id: form.cliente_id,
        proyecto_joya_id: form.proyecto_joya_id || null,
        sede_id: sesion?.sede?.id ?? null,
        estado: "borrador",
        moneda: form.moneda,
        subtotal_costo: form.costo * form.cantidad,
        subtotal: form.precio * form.cantidad,
        descuento: form.descuento,
        impuestos: form.impuestos,
        total: Math.max(0, form.precio * form.cantidad - form.descuento + form.impuestos),
        fecha_vencimiento: form.fecha_vencimiento || null,
        fecha_entrega_solicitada: form.fecha_entrega_solicitada || null,
        notas_cliente: form.notas_cliente,
        notas_internas: form.notas_internas,
        creado_por: sesion?.user.id ?? null,
      }).select("id").single();
      if (error || !q) throw error ?? new Error("No se pudo crear la cotización");
      const { error: detalleError } = await supabase.from("cotizacion_detalles").insert({
        cotizacion_id: q.id, orden: 1, tipo: "otro", descripcion: form.descripcion,
        cantidad: form.cantidad, unidad: "und", costo_unitario: form.costo,
        precio_unitario: form.precio, total_costo: form.costo * form.cantidad,
        total_precio: form.precio * form.cantidad,
      });
      if (detalleError) throw detalleError;
      setAbierto(false);
      setForm({ cliente_id: "", proyecto_joya_id: "", descripcion: "Servicio de joyería", cantidad: 1, costo: 0, precio: 0, descuento: 0, impuestos: 0, moneda: "PEN", fecha_vencimiento: "", fecha_entrega_solicitada: "", notas_cliente: "", notas_internas: "" });
      await cargar();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <AppShell
      titulo="Cotizaciones"
      subtitulo="El punto donde una idea del cliente empieza a convertirse en trabajo para el taller."
      acciones={<div className="flex gap-2">
        <button type="button" onClick={() => setModoAsistido(true)} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:border-primary/40"><WandSparkles className="size-4" /> Preparar con asistente</button>
        <button type="button" onClick={() => setAbierto(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"><Plus className="size-4" /> Nueva cotización</button>
      </div>}
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-surface-muted/60 p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary"><Sparkles className="size-3.5" /> Área comercial</div>
              <h2 className="font-display text-3xl tracking-tight sm:text-4xl">Cotiza sin perder el hilo. <span className="text-muted-foreground">Del cliente al taller.</span></h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Centraliza clientes, proyectos, precios y fechas. Cuando el cliente aprueba, la cotización puede convertirse en contrato y pedido sin volver a escribir todo.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-border/70 bg-card/80 px-3 py-2.5"><div className="flex items-center gap-2 text-muted-foreground"><FileText className="size-3.5" /><span className="text-[10px] uppercase tracking-wider">Total</span></div><p className="mt-1 text-lg font-semibold tabular-nums">{cotizaciones.length}</p></div>
              <div className="rounded-xl border border-border/70 bg-card/80 px-3 py-2.5"><div className="flex items-center gap-2 text-muted-foreground"><Clock3 className="size-3.5" /><span className="text-[10px] uppercase tracking-wider">Borradores</span></div><p className="mt-1 text-lg font-semibold tabular-nums">{borradores}</p></div>
              <div className="rounded-xl border border-border/70 bg-card/80 px-3 py-2.5"><div className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="size-3.5" /><span className="text-[10px] uppercase tracking-wider">Aprobadas</span></div><p className="mt-1 text-lg font-semibold tabular-nums">{cotizaciones.filter((q) => q.estado === "aprobada").length}</p></div>
              <div className="rounded-xl border border-border/70 bg-card/80 px-3 py-2.5"><div className="flex items-center gap-2 text-muted-foreground"><WalletCards className="size-3.5" /><span className="text-[10px] uppercase tracking-wider">Pendientes</span></div><p className="mt-1 text-lg font-semibold tabular-nums">{pendientes}</p></div>
            </div>
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-3">
          <button type="button" onClick={() => setAbierto(true)} className="group rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:border-primary/40 hover:bg-card hover:shadow-lg hover:shadow-primary/5 active:translate-y-0 active:scale-[0.995]"><div className="mb-5 grid size-10 place-items-center rounded-xl bg-primary/8 text-primary transition-all duration-200 group-hover:scale-105 group-hover:bg-primary/12 group-hover:shadow-sm"><Plus className="size-5 transition-transform duration-200 group-hover:rotate-90" /></div><p className="font-semibold">Nueva cotización</p><p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">Empieza con cliente, pieza y precio.</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary transition-all duration-200 group-hover:gap-2">Abrir <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" /></span></button>
          <button type="button" onClick={() => setModoAsistido(true)} className="group rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"><div className="mb-5 grid size-10 place-items-center rounded-xl bg-primary/8 text-primary transition-all duration-200 group-hover:scale-105 group-hover:bg-primary/12 group-hover:shadow-sm"><WandSparkles className="size-5 transition-transform duration-200 group-hover:rotate-6 group-hover:scale-110" /></div><p className="font-semibold">Cuéntaselo al asistente</p><p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">Escribe lo que pidió el cliente y prepara un borrador.</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary">Abrir <ArrowRight className="size-3.5" /></span></button>
          <button type="button" onClick={() => setBusca("aprobada")} className="group rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"><div className="mb-5 grid size-10 place-items-center rounded-xl bg-primary/8 text-primary transition-all duration-200 group-hover:scale-105 group-hover:bg-primary/12 group-hover:shadow-sm"><WalletCards className="size-5 transition-transform duration-200 group-hover:-rotate-3 group-hover:scale-110" /></div><p className="font-semibold">Aprobadas</p><p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">{totalAprobadas > 0 ? "Total aprobado: " + money(totalAprobadas) : "Todavía no hay ventas aprobadas."}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary">Abrir <ArrowRight className="size-3.5" /></span></button>
        </div>
        <Panel titulo="Cotizaciones comerciales" accion={<span className="text-xs text-muted-foreground">{filtradas.length} registros</span>}>
          <div className="p-4">
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por número, cliente o estado..." className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-1 focus:ring-gold" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-y border-border bg-surface-muted text-[10px] uppercase tracking-wider text-muted-foreground">
                {["Cotización","Cliente","Proyecto","Estado","Emisión","Total"].map(h => <th key={h} className="px-4 py-3">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-border">
                {filtradas.map(q => {
                  const cliente = clientes.find(c => c.id === q.cliente_id);
                  const proyecto = proyectos.find(p => p.id === q.proyecto_joya_id);
                  return <tr key={q.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-4 font-medium"><Link to="/cotizaciones/$id" params={{ id: q.id }} className="hover:text-gold">{q.numero}</Link> <span className="text-xs text-muted-foreground">v{q.version}</span></td>
                    <td className="px-4 py-4">{cliente?.nombre ?? "—"}</td>
                    <td className="px-4 py-4 text-muted-foreground">{proyecto ? `${proyecto.codigo} · ${proyecto.nombre}` : "Sin proyecto"}</td>
                    <td className="px-4 py-4"><span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs">{q.estado}</span></td>
                    <td className="px-4 py-4 text-muted-foreground">{q.fecha_emision}</td>
                    <td className="px-4 py-4 font-semibold">{money(Number(q.total), q.moneda)}</td>
                  </tr>;
                })}
                {filtradas.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Todavía no hay cotizaciones.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>

        {modoAsistido && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary"><WandSparkles className="size-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div><h2 className="font-display text-2xl">Preparar cotización</h2><p className="mt-1 text-sm text-muted-foreground">Escribe como se lo dirías a una persona del taller. No se crea nada hasta que tú confirmes.</p></div>
                  <button type="button" onClick={() => setModoAsistido(false)} className="rounded-full border border-border p-2"><XCircle className="size-4" /></button>
                </div>
                <textarea autoFocus value={textoAsistente} onChange={e => setTextoAsistente(e.target.value)} rows={5} placeholder="Ejemplo: Juan quiere 2 anillos de oro amarillo 18K, talla 8, con diamante. Entrega en 15 días." className="mt-5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                <div className="mt-4 rounded-xl bg-surface-muted p-4 text-xs text-muted-foreground"><p className="font-semibold text-foreground">Primera etapa del asistente</p><p className="mt-1">Reconoce datos básicos como un cliente registrado y cantidad, y prepara el borrador. Más adelante este mismo espacio podrá entender piezas, metales, piedras, tallas, fechas y datos faltantes.</p></div>
                <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setModoAsistido(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm">Cancelar</button><button type="button" onClick={prepararAsistido} disabled={!textoAsistente.trim()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">Preparar borrador <ArrowRight className="size-4" /></button></div>
              </div>
            </div>
          </div>
        </div>}

        {abierto && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form onSubmit={guardar} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between"><div><h2 className="font-display text-2xl">Nueva cotización</h2><p className="text-sm text-muted-foreground">Costo interno separado del precio al cliente.</p></div><button type="button" onClick={() => setAbierto(false)} className="rounded-full border border-border px-3 py-1">×</button></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-muted-foreground">Cliente<select required value={form.cliente_id} onChange={e => setForm({...form, cliente_id:e.target.value, proyecto_joya_id:""})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"><option value="">Seleccionar cliente</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
              <label className="text-xs text-muted-foreground">Proyecto (opcional)<select value={form.proyecto_joya_id} onChange={e => setForm({...form, proyecto_joya_id:e.target.value})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"><option value="">Sin proyecto</option>{proyectos.filter(p => !form.cliente_id || p.cliente_id === form.cliente_id).map(p => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}</select></label>
              <label className="text-xs text-muted-foreground sm:col-span-2">Concepto<input required value={form.descripcion} onChange={e => setForm({...form, descripcion:e.target.value})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm px-3" /></label>
              <label className="text-xs text-muted-foreground">Cantidad<input type="number" min="1" step="1" value={form.cantidad} onChange={e => setForm({...form,cantidad:Number(e.target.value) || 1})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm px-3" /></label>
              <label className="text-xs text-muted-foreground">Moneda<select value={form.moneda} onChange={e => setForm({...form,moneda:e.target.value})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"><option value="PEN">Soles (PEN)</option><option value="USD">Dólares (USD)</option></select></label>
              <label className="text-xs text-muted-foreground">Costo interno / unidad<input type="number" min="0" step="0.01" value={form.costo} onChange={e => setForm({...form,costo:Number(e.target.value) || 0})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
              <label className="text-xs text-muted-foreground">Precio al cliente / unidad<input required type="number" min="0.01" step="0.01" value={form.precio} onChange={e => setForm({...form,precio:Number(e.target.value) || 0})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
              <label className="text-xs text-muted-foreground">Descuento<input type="number" min="0" step="0.01" value={form.descuento} onChange={e => setForm({...form,descuento:Number(e.target.value) || 0})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
              <label className="text-xs text-muted-foreground">Impuestos<input type="number" min="0" step="0.01" value={form.impuestos} onChange={e => setForm({...form,impuestos:Number(e.target.value) || 0})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
              <label className="text-xs text-muted-foreground">Válida hasta<input type="date" value={form.fecha_vencimiento} onChange={e => setForm({...form,fecha_vencimiento:e.target.value})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>\n              <label className="text-xs text-muted-foreground">Entrega solicitada<input type="date" value={form.fecha_entrega_solicitada} onChange={e => setForm({...form,fecha_entrega_solicitada:e.target.value})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
              <label className="text-xs text-muted-foreground sm:col-span-2">Nota para cliente<textarea value={form.notas_cliente} onChange={e => setForm({...form,notas_cliente:e.target.value})} rows={2} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
              <label className="text-xs text-muted-foreground sm:col-span-2">Nota interna<textarea value={form.notas_internas} onChange={e => setForm({...form,notas_internas:e.target.value})} rows={2} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
            </div>
            <div className="mt-5 flex items-center justify-between rounded-xl bg-surface-muted p-4"><span className="text-sm text-muted-foreground">Total al cliente</span><strong className="text-xl">{money(Math.max(0, form.precio*form.cantidad-form.descuento+form.impuestos), form.moneda)}</strong></div>
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setAbierto(false)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button><button type="submit" disabled={guardando} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{guardando ? "Guardando…" : "Crear cotización"}</button></div>
          </form>
        </div>}
      </div>
    </AppShell>
  );
}
