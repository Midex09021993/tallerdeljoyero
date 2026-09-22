import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell, Panel } from "@/components/AppShell";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FichaDorada } from "@/components/FichaDorada";
import { BadgeDollarSign, CheckCircle2, FileText, Plus, Search, Clock3, Trash2, X, Send, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { areaCoincide, useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/cotizaciones/")({
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
type TipoPartida = "modelo" | "metal" | "piedras" | "fundicion" | "ajustes" | "acabado" | "mano_obra" | "render" | "otro";
type ConceptoCotizacion = { id: string; tipo: TipoPartida; descripcion: string; cantidad: number; costo: number; precio: number; };

const tiposPartida: Array<{ value: TipoPartida; label: string }> = [
  { value: "modelo", label: "Joya / Producto" },
  { value: "metal", label: "Metal" },
  { value: "piedras", label: "Piedra / Gema" },
  { value: "fundicion", label: "Fundición" },
  { value: "ajustes", label: "Ajustes" },
  { value: "acabado", label: "Acabado" },
  { value: "mano_obra", label: "Mano de obra" },
  { value: "render", label: "Renderizado 3D" },
  { value: "otro", label: "Otro" },
];

type Cotizacion = {
  id: string; numero: string; version: number; estado: string; fecha_emision: string;
  fecha_vencimiento: string | null; fecha_entrega_solicitada: string | null; moneda: string; subtotal: number; descuento: number;
  impuestos: number; total: number; cliente_id: string | null; proyecto_joya_id: string | null; sede_id: string | null;
  cliente?: { nombre: string } | null;
};

type Sede = { id: string; nombre: string };


function money(n: number, moneda = "PEN") {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: moneda, maximumFractionDigits: 2 }).format(n);
}

function fechaVencimientoPorDefecto() {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 7);
  return fecha.toISOString().slice(0, 10);
}

function CotizacionesPage() {
  const { data: sesion } = useSesion();
  const navigate = useNavigate();
  const puedeGestionarCotizaciones =
    Boolean(sesion?.esAdmin) ||
    Boolean(sesion?.areas.some((area) => areaCoincide(area, "Área ventas")));
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [busca, setBusca] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [cotizacionPorEliminar, setCotizacionPorEliminar] = useState<Cotizacion | null>(null);
  const [errorEliminacion, setErrorEliminacion] = useState("");
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [nuevoCliente, setNuevoCliente] = useState({ telefono: "", email: "" });
  const [errorCliente, setErrorCliente] = useState("");
  const [conceptos, setConceptos] = useState<ConceptoCotizacion[]>([{ id: crypto.randomUUID(), tipo: "modelo", descripcion: "", cantidad: 1, costo: 0, precio: 0 }]);
  const [impuestoActivo, setImpuestoActivo] = useState(true);
  const [form, setForm] = useState({ cliente_id: "", descuento: 0, moneda: "PEN", fecha_vencimiento: fechaVencimientoPorDefecto(), notas_cliente: "", notas_internas: "", tasaImpuesto: 18 });

  const cargar = async () => {
    const [{ data: p }, { data: q }, { data: s }] = await Promise.all([
      supabase.from("proyectos_joya").select("id,codigo,nombre,cliente_id").order("created_at", { ascending: false }),
      supabase.from("cotizaciones").select("id,numero,version,estado,fecha_emision,fecha_vencimiento,fecha_entrega_solicitada,moneda,subtotal,descuento,impuestos,total,cliente_id,proyecto_joya_id,sede_id,cliente:clientes!cotizaciones_cliente_id_fkey(nombre)").order("created_at", { ascending: false }),
      supabase.from("sedes").select("id,nombre").order("nombre"),
    ]);
    if (p) setProyectos(p);
    if (q) setCotizaciones(q);
    if (s) setSedes(s);
  };

  useEffect(() => {
    if (puedeGestionarCotizaciones) void cargar();
  }, [puedeGestionarCotizaciones]);

  useEffect(() => {
    if (!puedeGestionarCotizaciones || !sesion?.sede?.id) return;
    const termino = busquedaCliente.trim();
    if (form.cliente_id && !termino) return;

    const timer = window.setTimeout(async () => {
      setBuscandoClientes(true);
      try {
        let query = supabase
          .from("clientes")
          .select("id,nombre,telefono,email")
          .eq("estado", "activo")
          .eq("sede_id", sesion?.sede?.id ?? "")
          .order("nombre")
          .limit(20);

        if (termino) {
          const limpio = termino.replace(/[%_,]/g, "");
          const patron = "%" + limpio + "%";
          query = query.or("nombre.ilike." + patron + ",telefono.ilike." + patron + ",email.ilike." + patron);
        } else {
          query = query.limit(0);
        }

        const { data, error } = await query;
        if (!error) setClientes(data ?? []);
      } finally {
        setBuscandoClientes(false);
      }
    }, termino ? 250 : 0);

    return () => window.clearTimeout(timer);
  }, [busquedaCliente, puedeGestionarCotizaciones, sesion?.sede?.id, form.cliente_id]);

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return cotizaciones;
    return cotizaciones.filter((q) => {
      const cliente = q.cliente?.nombre ?? "";
      return [q.numero, q.estado, cliente].join(" ").toLowerCase().includes(t);
    });
  }, [busca, cotizaciones]);

  const clientePredictivo = useMemo(() => {
    const termino = busquedaCliente.trim().toLowerCase();
    if (!termino || form.cliente_id) return null;
    const coincidencias = clientes.filter((cliente) =>
      [cliente.nombre, cliente.telefono, cliente.email]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termino)),
    );
    if (coincidencias.length === 1) return coincidencias[0];
    const exacto = coincidencias.find((cliente) =>
      [cliente.nombre, cliente.telefono, cliente.email]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase() === termino),
    );
    return exacto ?? null;
  }, [busquedaCliente, clientes, form.cliente_id]);

  const coincidenciasCliente = useMemo(() => {
    const termino = busquedaCliente.trim().toLowerCase();
    if (!termino || form.cliente_id) return 0;
    return clientes.filter((cliente) =>
      [cliente.nombre, cliente.telefono, cliente.email]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termino)),
    ).length;
  }, [busquedaCliente, clientes, form.cliente_id]);

  const subtotalConceptos = conceptos.reduce((sum, item) => sum + Math.max(0, item.precio * item.cantidad), 0);
  const costoConceptos = conceptos.reduce((sum, item) => sum + Math.max(0, item.costo * item.cantidad), 0);
  const impuestoCalculado = impuestoActivo ? Math.max(0, subtotalConceptos - form.descuento) * (Number(form.tasaImpuesto) || 0) / 100 : 0;
  const totalAprobadas = cotizaciones.filter((q) => q.estado === "aprobada").reduce((s, q) => s + Number(q.total), 0);
  const irALista = () => document.getElementById("lista-cotizaciones")?.scrollIntoView({ behavior: "smooth", block: "start" });

  async function eliminarCotizacion(cotizacion: Cotizacion) {
    if (!sesion?.esDueno || eliminandoId) return;

    setEliminandoId(cotizacion.id);
    setErrorEliminacion("");
    try {
      const { count, error: contratoError } = await supabase
        .from("contratos")
        .select("id", { count: "exact", head: true })
        .eq("cotizacion_id", cotizacion.id);

      if (contratoError) throw contratoError;
      if ((count ?? 0) > 0) {
        throw new Error(
          "No se puede eliminar esta cotización porque ya está vinculada a un contrato. Primero debe gestionarse ese contrato.",
        );
      }

      const { error } = await supabase.from("cotizaciones").delete().eq("id", cotizacion.id);
      if (error) throw error;

      setCotizaciones((actuales) => actuales.filter((item) => item.id !== cotizacion.id));
    } catch (error) {
      setErrorEliminacion(
        error instanceof Error ? error.message : "No se pudo eliminar la cotización.",
      );
    } finally {
      setEliminandoId(null);
      setCotizacionPorEliminar(null);
    }
  }

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
    if ((!form.cliente_id && !busquedaCliente.trim()) || conceptos.some((item) => !item.descripcion.trim() || item.cantidad <= 0 || item.precio <= 0)) return;
    setGuardando(true);
    setErrorCliente("");
    try {
      const primero = conceptos[0];
      if (!primero) return;
      const argumentos = {
        _cliente_id: form.cliente_id || null,
        _cliente_nombre: form.cliente_id ? null : busquedaCliente.trim(),
        _cliente_telefono: form.cliente_id ? null : nuevoCliente.telefono.trim() || null,
        _cliente_email: form.cliente_id ? null : nuevoCliente.email.trim() || null,
        _proyecto_joya_id: null,
        _sede_id: sesion?.sede?.id ?? null,
        _moneda: form.moneda,
        _cantidad: primero.cantidad,
        _costo_unitario: primero.costo,
        _precio_unitario: primero.precio,
        _descuento: form.descuento,
        _impuestos: impuestoCalculado,
        _fecha_vencimiento: form.fecha_vencimiento || null,
        _fecha_entrega_solicitada: null,
        _notas_cliente: form.notas_cliente,
        _notas_internas: form.notas_internas,
        _descripcion: primero.descripcion,
      };
      const { data: cotizacionCreadaId, error: creacionError } = await supabase.rpc(
        "crear_cotizacion_comercial",
        argumentos as unknown as Parameters<typeof supabase.rpc<"crear_cotizacion_comercial">>[1],
      );
      if (creacionError || !cotizacionCreadaId) {
        throw creacionError ?? new Error("No se pudo crear la cotización.");
      }

      const { error: detallesError } = await supabase.rpc("guardar_detalles_cotizacion", { _cotizacion_id: cotizacionCreadaId, _detalles: conceptos.map((item, index) => ({ orden: index + 1, tipo: item.tipo, descripcion: item.descripcion.trim(), cantidad: item.cantidad, unidad: "und", costo_unitario: item.costo, precio_unitario: item.precio })) });
      if (detallesError) throw detallesError;

      setAbierto(false);
      setBusquedaCliente("");
      setNuevoCliente({ telefono: "", email: "" });
      setImpuestoActivo(true);
      setForm({ cliente_id: "", descuento: 0, moneda: "PEN", fecha_vencimiento: fechaVencimientoPorDefecto(), notas_cliente: "", notas_internas: "", tasaImpuesto: 18 });
      setConceptos([{ id: crypto.randomUUID(), tipo: "modelo", descripcion: "", cantidad: 1, costo: 0, precio: 0 }]);
      setBusquedaCliente("");
      await cargar();
      await navigate({ to: "/cotizaciones/$id", params: { id: cotizacionCreadaId } });
    } catch (error) {
      const mensaje =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : error instanceof Error
            ? error.message
            : "";
      setErrorCliente(mensaje || "No se pudo guardar la cotización.");
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
          <FichaDorada indicador="Directorio" titulo="Cotizaciones" valor={cotizaciones.length} descripcion="Presupuestos registrados" onClick={() => { setBusca(""); irALista(); }} icono={<FileText className="size-5" strokeWidth={1.7} />} />
          <FichaDorada indicador="Estado" titulo="Enviadas" valor={cotizaciones.filter(q => q.estado === "enviada").length} descripcion="Cotizaciones enviadas al cliente" onClick={() => { setBusca("enviada"); irALista(); }} icono={<Send className="size-5" strokeWidth={1.7} />} />
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
              {errorEliminacion ? <p className="mt-2 text-xs text-danger">{errorEliminacion}</p> : null}
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
                {["Cotización","Cliente","Proyecto","Taller","Estado","Emisión","Total",...(sesion?.esDueno ? ["Acciones"] : [])].map(h => <th key={h} className="px-4 py-3">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-border">
                {filtradas.map(q => {
                  const cliente = q.cliente;
                  const proyecto = proyectos.find(p => p.id === q.proyecto_joya_id);
                  return <tr key={q.id} className="group transition-colors hover:bg-gold/[0.06]">
                    <td className="p-0 font-medium">
                      <Link to="/cotizaciones/$id" params={{ id: q.id }} className="block px-5 py-4 focus:bg-gold/[0.08] focus:outline-none">{q.numero} <span className="text-xs text-muted-foreground">v{q.version}</span></Link>
                    </td>
                    <td className="p-0"><Link to="/cotizaciones/$id" params={{ id: q.id }} className="block px-5 py-4 focus:bg-gold/[0.08] focus:outline-none"><span className="font-medium">{cliente?.nombre ?? "—"}</span></Link></td>
                    <td className="p-0 text-muted-foreground"><Link to="/cotizaciones/$id" params={{ id: q.id }} className="block px-5 py-4 focus:bg-gold/[0.08] focus:outline-none">{proyecto ? `${proyecto.codigo} · ${proyecto.nombre}` : "Sin proyecto"}</Link></td>
                    <td className="p-0"><Link to="/cotizaciones/$id" params={{ id: q.id }} className="block px-5 py-4 text-muted-foreground focus:bg-gold/[0.08] focus:outline-none">{sedes.find(s => s.id === q.sede_id)?.nombre ?? "Taller no asignado"}</Link></td>
                    <td className="p-0"><Link to="/cotizaciones/$id" params={{ id: q.id }} className="block px-5 py-4 focus:bg-gold/[0.08] focus:outline-none"><span className="rounded-full border border-gold/15 bg-gold/[0.035] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{q.estado}</span></Link></td>
                    <td className="p-0 text-xs text-muted-foreground"><Link to="/cotizaciones/$id" params={{ id: q.id }} className="block px-5 py-4 focus:bg-gold/[0.08] focus:outline-none">{q.fecha_emision}</Link></td>
                    <td className="p-0 text-right font-semibold tabular-nums"><Link to="/cotizaciones/$id" params={{ id: q.id }} className="block px-5 py-4 focus:bg-gold/[0.08] focus:outline-none">{money(Number(q.total), q.moneda)}</Link></td>
                    {sesion?.esDueno ? (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          title={eliminandoId === q.id ? "Eliminando…" : "Eliminar cotización"}
                          aria-label={eliminandoId === q.id ? `Eliminando ${q.numero}` : `Eliminar ${q.numero}`}
                          disabled={eliminandoId !== null}
                          onClick={() => { setErrorEliminacion(""); setCotizacionPorEliminar(q); }}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-danger/20 text-danger transition hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    ) : null}
                  </tr>;
                })}
                {filtradas.length === 0 && <tr><td colSpan={sesion?.esDueno ? 8 : 7} className="px-5 py-14 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl border border-gold/15 bg-gold/[0.025] text-gold/70"><FileText className="size-6" /></span><p className="mt-3 text-sm font-medium">Todavía no hay cotizaciones</p><p className="mt-1 text-xs text-muted-foreground">Crea la primera para iniciar el seguimiento comercial.</p></td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <AlertDialog open={cotizacionPorEliminar !== null} onOpenChange={(open) => {
          if (!open && !eliminandoId) setCotizacionPorEliminar(null);
        }}>
          <AlertDialogContent className="mx-4 max-w-sm rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar cotización</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Deseas eliminar la cotización "{cotizacionPorEliminar?.numero}"?
                <span className="mt-2 block font-medium text-destructive">Esta acción no se puede deshacer.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={eliminandoId !== null}>Cancelar</AlertDialogCancel>
              <AlertDialogAction disabled={!cotizacionPorEliminar || eliminandoId !== null}
                onClick={() => { if (cotizacionPorEliminar) void eliminarCotizacion(cotizacionPorEliminar); }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {eliminandoId ? "Eliminando..." : "Eliminar cotización"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {abierto && <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/10 p-4 backdrop-blur-sm">
          <form onSubmit={guardar} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gold/15 bg-card p-5 shadow-[0_30px_80px_-35px_hsl(var(--gold)/0.35)]">
            <div className="mb-5 flex items-start justify-between"><div><h2 className="font-display text-2xl">Nueva cotización</h2><p className="text-sm text-muted-foreground">Costo interno separado del precio al cliente.</p></div><button type="button" onClick={() => setAbierto(false)} className="rounded-full border border-border px-3 py-1">×</button></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="relative">
  <label className="text-xs text-muted-foreground">Cliente</label>
  <input
    value={busquedaCliente}
    onChange={e => {
      setBusquedaCliente(e.target.value);
      if (form.cliente_id) setForm({...form, cliente_id:""});
    }}
    placeholder="Escribe nombre, teléfono o correo…"
    className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-gold/40 focus:ring-1 focus:ring-gold/15"
  />
  {form.cliente_id ? (
    <button type="button" onClick={() => { setForm({...form, cliente_id:""}); setBusquedaCliente(""); }} className="absolute right-3 top-8 text-muted-foreground">
      <X className="size-4" />
    </button>
  ) : null}
  {!form.cliente_id && busquedaCliente.trim() ? (
    <div className="mt-1 min-h-5 text-[11px]">
      {clientePredictivo ? (
        <button
          type="button"
          onClick={() => { setForm({...form, cliente_id:clientePredictivo.id}); setBusquedaCliente(clientePredictivo.nombre); }}
          className="text-left text-muted-foreground transition hover:text-foreground"
        >
          <span className="font-medium text-foreground">Coincidencia:</span> {clientePredictivo.nombre}
          {clientePredictivo.telefono || clientePredictivo.email ? <span className="ml-2 opacity-70">{clientePredictivo.telefono || clientePredictivo.email}</span> : null}
        </button>
      ) : coincidenciasCliente > 1 ? (
        <span className="text-muted-foreground">Hay {coincidenciasCliente} coincidencias. Continúa escribiendo para precisar.</span>
      ) : (
        <span className="text-muted-foreground">No hay una coincidencia exacta todavía. Puedes registrar este nombre como nuevo cliente.</span>
      )}
    </div>
  ) : null}
  {form.cliente_id ? <p className="mt-1 text-[11px] text-muted-foreground">Cliente seleccionado: {clientes.find(c => c.id === form.cliente_id)?.nombre ?? "—"}</p> : null}
</div>
              <section className="sm:col-span-2 overflow-hidden rounded-2xl border border-gold/15 bg-gradient-to-b from-gold/[0.035] to-transparent">
  <div className="flex items-center justify-between gap-4 border-b border-gold/10 px-4 py-4 sm:px-5">
    <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl border border-gold/20 bg-card text-gold"><FileText className="size-4" /></span><div><p className="text-sm font-semibold tracking-tight">Conceptos de la cotización</p><p className="mt-0.5 text-[11px] text-muted-foreground">Añade productos, servicios o trabajos y define su precio.</p></div></div>
    <button type="button" onClick={() => setConceptos(items => [...items, { id: crypto.randomUUID(), tipo: "modelo", descripcion: "", cantidad: 1, costo: 0, precio: 0 }])} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-gold/25 bg-card px-3 text-xs font-semibold text-foreground shadow-sm transition hover:border-gold/45 hover:bg-gold/5"><Plus className="size-3.5 text-gold" /> Agregar</button>
  </div>
  <div className="hidden grid-cols-[minmax(0,1.15fr)_76px_128px_128px_34px] gap-2 px-5 pb-2 pt-4 sm:grid"><span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Concepto y descripción</span><span className="text-center text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Cant.</span><span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Costo interno</span><span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Precio cliente</span><span /></div>
  <div className="space-y-2 px-4 pb-4 pt-2 sm:px-5 sm:pt-0">
    {conceptos.map((item, index) => (
      <div key={item.id} className="group rounded-xl border border-border/80 bg-card p-3 transition hover:border-gold/20 hover:shadow-sm sm:grid sm:grid-cols-[minmax(0,1fr)_76px_128px_128px_34px] sm:items-end sm:gap-2">
        <div><div className="mb-1.5 flex items-center gap-2 sm:hidden"><span className="grid size-5 place-items-center rounded-md bg-gold/10 text-[9px] font-bold text-gold">{index + 1}</span><span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Concepto</span></div><label className="text-[10px] font-medium text-muted-foreground">Tipo<select value={item.tipo} onChange={e => setConceptos(items => items.map(x => x.id === item.id ? { ...x, tipo: e.target.value as TipoPartida } : x))} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">{tiposPartida.map(tipo => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}</select></label><label className="mt-2 block text-[10px] font-medium text-muted-foreground">Descripción<input required value={item.descripcion} onChange={e => setConceptos(items => items.map(x => x.id === item.id ? { ...x, descripcion: e.target.value } : x))} placeholder="Ej. Anillo de oro 18K" className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground/55 focus:border-gold/45 focus:ring-2 focus:ring-gold/10" /></label></div>
        <label className="text-[10px] font-medium text-muted-foreground">Cantidad<input required type="number" min="1" step="1" value={item.cantidad} onChange={e => setConceptos(items => items.map(x => x.id === item.id ? { ...x, cantidad: Number(e.target.value) || 1 } : x))} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-center outline-none focus:border-gold/45 focus:ring-2 focus:ring-gold/10" /></label>
        <label className="text-[10px] font-medium text-muted-foreground">Costo interno<input type="number" min="0" step="0.01" value={item.costo} onChange={e => setConceptos(items => items.map(x => x.id === item.id ? { ...x, costo: Number(e.target.value) || 0 } : x))} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-gold/45 focus:ring-2 focus:ring-gold/10" placeholder="0.00" /></label>
        <label className="text-[10px] font-medium text-muted-foreground">Precio cliente<input required type="number" min="0.01" step="0.01" value={item.precio} onChange={e => setConceptos(items => items.map(x => x.id === item.id ? { ...x, precio: Number(e.target.value) || 0 } : x))} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium outline-none focus:border-gold/45 focus:ring-2 focus:ring-gold/10" placeholder="0.00" /></label>
        <div className="flex items-center justify-between pt-2 sm:block sm:pb-1"><span className="text-[10px] text-muted-foreground sm:hidden">Total de partida</span>{conceptos.length > 1 ? <button type="button" onClick={() => setConceptos(items => items.filter(x => x.id !== item.id))} title="Quitar concepto" aria-label={`Quitar concepto ${index + 1}`} className="ml-auto grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-danger-soft hover:text-danger"><Trash2 className="size-3.5" /></button> : <span className="block size-8" />}</div>
        <div className="col-span-full flex items-center justify-end border-t border-border/60 pt-2 text-xs sm:col-start-3 sm:col-span-2 sm:mt-1 sm:border-0"><span className="text-muted-foreground">Total&nbsp;</span><strong className="tabular-nums text-foreground">{money(item.precio * item.cantidad, form.moneda)}</strong></div>
      </div>
    ))}
  </div>
</section>
<label className="text-xs text-muted-foreground">Moneda<select value={form.moneda} onChange={e => setForm({...form,moneda:e.target.value})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"><option value="PEN">Soles (PEN)</option><option value="USD">Dólares (USD)</option></select></label>
              <div className="hidden sm:block" />
              <div className="text-xs text-muted-foreground"><div className="flex items-center justify-between gap-3"><span>Impuesto (%)</span><button type="button" onClick={() => setImpuestoActivo(v => !v)} aria-pressed={impuestoActivo} title={impuestoActivo ? "Desactivar impuesto" : "Activar impuesto"} className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-semibold transition ${impuestoActivo ? "border-gold/25 bg-gold/10 text-gold" : "border-border bg-background text-muted-foreground"}`}>{impuestoActivo ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}{impuestoActivo ? "Activo" : "Desactivado"}</button></div><input type="number" min="0" max="100" step="0.01" value={form.tasaImpuesto} disabled={!impuestoActivo} onChange={e => setForm({...form,tasaImpuesto:Number(e.target.value) || 0})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50" /><span className="mt-1 block text-[10px] text-muted-foreground">{impuestoActivo ? "Se aplicará sobre el subtotal después del descuento." : "El impuesto no se aplicará a esta cotización."}</span></div>
              <label className="text-xs text-muted-foreground">Válida hasta<input type="date" min={new Date().toISOString().slice(0, 10)} value={form.fecha_vencimiento} onChange={e => setForm({...form,fecha_vencimiento:e.target.value})} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" /><span className="mt-1 block text-[10px] text-muted-foreground">7 días por defecto. Puedes ajustarla según el acuerdo comercial.</span></label>
              <label className="text-xs text-muted-foreground sm:col-span-2">Nota para cliente<textarea value={form.notas_cliente} onChange={e => setForm({...form,notas_cliente:e.target.value})} rows={2} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
              <label className="text-xs text-muted-foreground sm:col-span-2">Nota interna<textarea value={form.notas_internas} onChange={e => setForm({...form,notas_internas:e.target.value})} rows={2} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
            </div>
            {errorCliente ? <div className="mb-3 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-xs text-danger">{errorCliente}</div> : null}
            <div className="mt-5 rounded-xl border border-gold/15 bg-gold/[0.025] p-4"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>Subtotal</span><strong className="text-foreground">{money(subtotalConceptos, form.moneda)}</strong></div><div className="mt-2 flex items-center justify-between text-xs text-muted-foreground"><span>Costo interno</span><strong className="text-foreground">{money(costoConceptos, form.moneda)}</strong></div><div className="mt-2 flex items-center justify-between text-xs text-muted-foreground"><span>Descuento</span><strong className="text-foreground">{money(form.descuento, form.moneda)}</strong></div><div className="mt-2 flex items-center justify-between text-xs text-muted-foreground"><span>Impuesto</span><strong className="text-foreground">{money(impuestoCalculado, form.moneda)}</strong></div><div className="mt-3 flex items-center justify-between border-t border-gold/10 pt-3"><span className="text-sm font-semibold">Total al cliente</span><strong className="text-xl">{money(Math.max(0, subtotalConceptos-form.descuento+impuestoCalculado), form.moneda)}</strong></div></div>
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setAbierto(false)} className="rounded-xl border border-border px-4 py-2 text-sm transition hover:border-gold/30 hover:bg-gold/5">Cancelar</button><button type="submit" disabled={guardando} className="rounded-xl border border-gold/25 bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-gold/5 disabled:opacity-50">{guardando ? "Guardando…" : "Crear cotización"}</button></div>
          </form>
        </div>}
      </div>
    </AppShell>
  );
}
