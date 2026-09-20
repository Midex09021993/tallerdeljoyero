import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell, Panel } from "@/components/AppShell";
import { FichaDorada } from "@/components/FichaDorada";
import { BadgeDollarSign, CheckCircle2, FileText, Plus, Search, Clock3, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { areaCoincide, useSesion } from "@/lib/auth";

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
  const navigate = useNavigate();
  const puedeGestionarCotizaciones =
    Boolean(sesion?.esAdmin) ||
    Boolean(sesion?.areas.some((area) => areaCoincide(area, "Área ventas")));
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [busca, setBusca] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [nuevoCliente, setNuevoCliente] = useState({ telefono: "", email: "" });
  const [errorCliente, setErrorCliente] = useState("");
  const [form, setForm] = useState({
    cliente_id: "", proyecto_joya_id: "", descripcion: "", cantidad: 1,
    costo: 0, precio: 0, descuento: 0, impuestos: 0, moneda: "PEN", fecha_vencimiento: "", fecha_entrega_solicitada: "",
    notas_cliente: "", notas_internas: "", tasaImpuesto: 18,
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

  useEffect(() => {
    if (puedeGestionarCotizaciones) void cargar();
  }, [puedeGestionarCotizaciones]);

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return cotizaciones;
    return cotizaciones.filter((q) => {
      const cliente = clientes.find((c) => c.id === q.cliente_id)?.nombre ?? "";
      return [q.numero, q.estado, cliente].join(" ").toLowerCase().includes(t);
    });
  }, [busca, clientes, cotizaciones]);

  const clientesFiltrados = useMemo(() => {
    const t = busquedaCliente.trim().toLowerCase();
    if (!t) return clientes.slice(0, 20);
    return clientes.filter((c) => [c.nombre, c.telefono ?? "", c.email ?? ""].join(" ").toLowerCase().includes(t)).slice(0, 20);
  }, [busquedaCliente, clientes]);
  const impuestoCalculado = Math.max(0, form.precio * form.cantidad - form.descuento) * (Number(form.tasaImpuesto) || 0) / 100;
  const totalAprobadas = cotizaciones.filter((q) => q.estado === "aprobada").reduce((s, q) => s + Number(q.total), 0);
  const irALista = () => document.getElementById("lista-cotizaciones")?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (!puedeGestionarCotizaciones) {
    return (
      <AppShell titulo="Cotizaciones" subtitulo="Acceso restringido al área comercial.">
        <Panel titulo="Acceso restringido">
          <p className="p-6 text-sm text-muted-foreground">
            Esta sección contiene información comercial y financiera.
          </p>
        </Panel>
      </AppShell>
    );
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if ((!form.cliente_id && !busquedaCliente.trim()) || !form.descripcion.trim() || form.precio <= 0) return;
    setGuardando(true);
    setErrorCliente("");
    try {
      let clienteId = form.cliente_id;
      if (!clienteId) {
        if (!sesion?.sede?.id) throw new Error("No hay un taller/sede activo para registrar el cliente.");
        const { data: clienteNuevo, error: clienteError } = await supabase.from("clientes").insert({
          nombre: busquedaCliente.trim(),
          telefono: nuevoCliente.telefono.trim() || null,
          email: nuevoCliente.email.trim() || null,
          sede_id: sesion.sede.id,
          estado: "activo",
        }).select("id,nombre,telefono,email").single();
        if (clienteError || !clienteNuevo) throw clienteError ?? new Error("No se pudo registrar automáticamente el cliente.");
        clienteId = clienteNuevo.id;
        setClientes((actuales) => [clienteNuevo, ...actuales.filter((c) => c.id !== clienteNuevo.id)]);
      }

      const { data: q, error } = await supabase.from("cotizaciones").insert({
        cliente_id: clienteId,
        proyecto_joya_id: form.proyecto_joya_id || null,
        sede_id: sesion?.sede?.id ?? null,
        estado: "borrador",
        moneda: form.moneda,
        subtotal_costo: form.costo * form.cantidad,
        subtotal: form.precio * form.cantidad,
        descuento: form.descuento,
        impuestos: impuestoCalculado,
        total: Math.max(0, form.precio * form.cantidad - form.descuento + impuestoCalculado),
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
      setBusquedaCliente("");
      setNuevoCliente({ telefono: "", email: "" });
      const cotizacionCreadaId = q.id;
      setForm({ cliente_id: "", proyecto_joya_id: "", descripcion: "", cantidad: 1, costo: 0, precio: 0, descuento: 0, tasaImpuesto: 18, moneda: "PEN", fecha_vencimiento: "", fecha_entrega_solicitada: "", notas_cliente: "", notas_internas: "" });
      setBusquedaCliente("");
      await cargar();
      await navigate({ to: "/cotizaciones/$id", params: { id: cotizacionCreadaId } });
    } catch (error) {
      setErrorCliente(error instanceof Error ? error.message : "No se pudo guardar la cotización.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <AppShell
      titulo="Cotizaciones"
      subtitulo="Presupuestos comerciales conectados con clientes y proyectos de joyería."
      acciones={
        <>
          <FichaDorada indicador="Directorio" titulo="Cotizaciones" valor={cotizaciones.length} descripcion="Presupuestos registrados" onClick={irALista} icono={<FileText className="size-5" strokeWidth={1.7} />} />
          <FichaDorada indicador="Estado" titulo="Aprobadas" valor={cotizaciones.filter(q => q.estado === "aprobada").length} descripcion="Cotizaciones aprobadas" onClick={() => { setBusca("aprobada"); irALista(); }} icono={<CheckCircle2 className="size-5" strokeWidth={1.7} />} />
          <FichaDorada indicador="Comercial" titulo="Total aprobado" valor={money(totalAprobadas)} descripcion="Valor de cotizaciones aprobadas" onClick={() => { setBusca("aprobada"); irALista(); }} icono={<BadgeDollarSign className="size-5" strokeWidth={1.7} />} />
          <button type="button" onClick={() => setAbierto(true)} className="group relative min-h-[150px] min-w-[170px] overflow-hidden rounded-2xl border border-gold/25 bg-card px-5 py-5 text-left text-foreground shadow-[0_18px_45px_-28px_hsl(var(--gold)/0.28)] transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_24px_50px_-24px_hsl(var(--gold)/0.38)]">
            <span className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-gold/10 blur-2xl transition-all group-hover:bg-gold/15" />
            <span className="relative flex h-full flex-col justify-between">
              <span className="grid size-10 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110"><Plus className="size-5" /></span>
              <span><span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-gold/80">Acción</span><span className="mt-1 block text-lg font-semibold">Nueva cotización</span></span>
            </span>
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <section id="lista-cotizaciones" className="scroll-mt-6 overflow-hidden rounded-2xl border border-gold/15 bg-card shadow-[0_18px_50px_-35px_rgba(0,0,0,.28)]">
          <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold/80">Gestión comercial</p>
              <h2 className="mt-1 text-lg font-semibold">Cotizaciones del taller</h2>
              <p className="mt-1 text-xs text-muted-foreground">Presupuestos vinculados a clientes y proyectos de joyería.</p>
            </div>
            <div className="hidden items-center gap-2 rounded-xl border border-gold/15 bg-gold/[0.025] px-3 py-2 text-[10px] text-muted-foreground sm:flex"><Clock3 className="size-3.5 text-gold/65" /> Seguimiento comercial</div>
          </div>
          <div className="border-b border-border p-4 sm:p-5">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por número, cliente o estado..." className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-4 text-sm outline-none transition focus:border-gold/40 focus:ring-1 focus:ring-gold/15" />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-y border-border bg-surface-muted/45 text-[10px] uppercase tracking-wider text-muted-foreground">
                {["Cotización","Cliente","Proyecto","Estado","Emisión","Total"].map(h => <th key={h} className="px-4 py-3">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-border">
                {filtradas.map(q => {
                  const cliente = clientes.find(c => c.id === q.cliente_id);
                  const proyecto = proyectos.find(p => p.id === q.proyecto_joya_id);
                  return <tr
                    key={q.id}
                    tabIndex={0}
                    role="link"
                    onClick={() => {
                      void navigate({ to: "/cotizaciones/$id", params: { id: q.id } }).catch(() => {
                        window.location.assign(`/cotizaciones/${q.id}`);
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void navigate({ to: "/cotizaciones/$id", params: { id: q.id } }).catch(() => {
                          window.location.assign(`/cotizaciones/${q.id}`);
                        });
                      }
                    }}
                    className="group cursor-pointer transition-colors hover:bg-gold/[0.06] focus:outline-none focus:bg-gold/[0.06]"
                  >
                    <td className="px-5 py-4 font-medium">{q.numero} <span className="text-xs text-muted-foreground">v{q.version}</span></td>
                    <td className="px-5 py-4"><span className="font-medium">{cliente?.nombre ?? "—"}</span></td>
                    <td className="px-5 py-4 text-muted-foreground">{proyecto ? `${proyecto.codigo} · ${proyecto.nombre}` : "Sin proyecto"}</td>
                    <td className="px-5 py-4"><span className="rounded-full border border-gold/15 bg-gold/[0.035] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{q.estado}</span></td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">{q.fecha_emision}</td>
                    <td className="px-5 py-4 text-right font-semibold tabular-nums">{money(Number(q.total), q.moneda)}</td>
                  </tr>;
                })}
                {filtradas.length === 0 && <tr><td colSpan={6} className="px-5 py-14 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl border border-gold/15 bg-gold/[0.025] text-gold/70"><FileText className="size-6" /></span><p className="mt-3 text-sm font-medium">Todavía no hay cotizaciones</p><p className="mt-1 text-xs text-muted-foreground">Crea la primera para iniciar el seguimiento comercial.</p></td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {abierto && <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/10 p-4 backdrop-blur-sm">
          <form onSubmit={guardar} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gold/15 bg-card p-5 shadow-[0_30px_80px_-35px_hsl(var(--gold)/0.35)]">
            <div className="mb-5 flex items-start justify-between"><div><h2 className="font-display text-2xl">Nueva cotización</h2><p className="text-sm text-muted-foreground">Costo interno separado del precio al cliente.</p></div><button type="button" onClick={() => setAbierto(false)} className="rounded-full border border-border px-3 py-1">×</button></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="relative">
  <label className="text-xs text-muted-foreground">Cliente</label>
  <input value={busquedaCliente} onChange={e => setBusquedaCliente(e.target.value)} placeholder="Buscar por nombre, teléfono o correo…" className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" />
  {form.cliente_id ? <button type="button" onClick={() => { setForm({...form, cliente_id:"", proyecto_joya_id:""}); setBusquedaCliente(""); }} className="absolute right-3 top-8 text-muted-foreground"><X className="size-4" /></button> : null}
  {!form.cliente_id && busquedaCliente ? <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
    {clientesFiltrados.map(c => <button type="button" key={c.id} onClick={() => { setForm({...form, cliente_id:c.id, proyecto_joya_id:""}); setBusquedaCliente(c.nombre); }} className="block w-full border-b border-border px-3 py-3 text-left hover:bg-surface-muted">
      <span className="block text-sm font-medium">{c.nombre}</span><span className="text-xs text-muted-foreground">{c.telefono || c.email || "Sin contacto"}</span>
    </button>)}
  </div> : null}
  {form.cliente_id ? <p className="mt-1 text-[11px] text-muted-foreground">Cliente seleccionado: {clientes.find(c => c.id === form.cliente_id)?.nombre ?? "—"}</p> : null}
</div>
              <label className="text-xs text-muted-foreground">Proyecto (opcional)<select value={form.proyecto_joya_id} onChange={e => setForm({...form, proyecto_joya_id:e.target.value})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"><option value="">Sin proyecto</option>{proyectos.filter(p => !form.cliente_id || p.cliente_id === form.cliente_id).map(p => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}</select></label>
              <label className="text-xs text-muted-foreground sm:col-span-2">Concepto<input required value={form.descripcion} onChange={e => setForm({...form, descripcion:e.target.value})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm px-3" /></label>
              <label className="text-xs text-muted-foreground">Cantidad<input type="number" min="1" step="1" value={form.cantidad} onChange={e => setForm({...form,cantidad:Number(e.target.value) || 1})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm px-3" /></label>
              <label className="text-xs text-muted-foreground">Moneda<select value={form.moneda} onChange={e => setForm({...form,moneda:e.target.value})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"><option value="PEN">Soles (PEN)</option><option value="USD">Dólares (USD)</option></select></label>
              <label className="text-xs text-muted-foreground">Costo interno / unidad<input type="number" min="0" step="0.01" value={form.costo} onChange={e => setForm({...form,costo:Number(e.target.value) || 0})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
              <label className="text-xs text-muted-foreground">Precio al cliente / unidad<input required type="number" min="0.01" step="0.01" value={form.precio} onChange={e => setForm({...form,precio:Number(e.target.value) || 0})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
              <label className="text-xs text-muted-foreground">Descuento<input type="number" min="0" step="0.01" value={form.descuento} onChange={e => setForm({...form,descuento:Number(e.target.value) || 0})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
              <label className="text-xs text-muted-foreground">Impuesto (%)<input type="number" min="0" max="100" step="0.01" value={form.tasaImpuesto} onChange={e => setForm({...form,tasaImpuesto:Number(e.target.value) || 0})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" /><span className="mt-1 block text-[10px] text-muted-foreground">Configurado para el país/sede. Inicial: Perú 18%.</span></label>
              <label className="text-xs text-muted-foreground">Válida hasta<input type="date" value={form.fecha_vencimiento} onChange={e => setForm({...form,fecha_vencimiento:e.target.value})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
                            <label className="text-xs text-muted-foreground">Entrega solicitada<input type="date" value={form.fecha_entrega_solicitada} onChange={e => setForm({...form,fecha_entrega_solicitada:e.target.value})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
              <label className="text-xs text-muted-foreground sm:col-span-2">Nota para cliente<textarea value={form.notas_cliente} onChange={e => setForm({...form,notas_cliente:e.target.value})} rows={2} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
              <label className="text-xs text-muted-foreground sm:col-span-2">Nota interna<textarea value={form.notas_internas} onChange={e => setForm({...form,notas_internas:e.target.value})} rows={2} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
            </div>
            {errorCliente ? <div className="mb-3 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-xs text-danger">{errorCliente}</div> : null}
            <div className="mt-5 flex items-center justify-between rounded-xl border border-gold/15 bg-gold/[0.025] p-4"><span className="text-sm text-muted-foreground">Total al cliente</span><strong className="text-xl">{money(Math.max(0, form.precio*form.cantidad-form.descuento+impuestoCalculado), form.moneda)}</strong></div>
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setAbierto(false)} className="rounded-xl border border-border px-4 py-2 text-sm transition hover:border-gold/30 hover:bg-gold/5">Cancelar</button><button type="submit" disabled={guardando} className="rounded-xl border border-gold/25 bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-gold/5 disabled:opacity-50">{guardando ? "Guardando…" : "Crear cotización"}</button></div>
          </form>
        </div>}
      </div>
    </AppShell>
  );
}
