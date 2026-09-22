import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Panel } from "@/components/AppShell";
import { FichaDorada } from "@/components/FichaDorada";
import { Mail, Phone, ShoppingBag, FileText, UserRound, ChevronRight, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { areaCoincide, useSesion } from "@/lib/auth";

type Cliente = {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  estado: string;
  created_at: string;
  sede_id: string;
  sede_nombre: string;
};

type PedidoRef = { id: string; referencia: string; estado: string; importe: number | null; fecha_entrega: string | null };
type CotRef = { id: string; numero: string; estado: string; total: number | null };

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Aurum Lab" },
      { name: "description", content: "Directorio comercial y ficha de clientes del taller." },
    ],
  }),
  component: ClientesPage,
});

function money(n: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 2 }).format(n);
}

function ClientesPage() {
  const { data: sesion } = useSesion();
  const puedeVer = Boolean(sesion?.esAdmin) || Boolean(sesion?.areas.some((area) => areaCoincide(area, "Área ventas")));
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [seleccionado, setSeleccionado] = useState<Cliente | null>(null);
  const [pedidos, setPedidos] = useState<PedidoRef[]>([]);
  const [cotizaciones, setCotizaciones] = useState<CotRef[]>([]);
  const [busca, setBusca] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [confirmarEliminacion, setConfirmarEliminacion] = useState(false);
  const [form, setForm] = useState({ nombre: "", telefono: "", email: "" });

  const cargar = async () => {
    if (!sesion?.sede?.id) return;
    const esDueno = Boolean(sesion.esDueno);
    const clientesQuery = supabase
      .from("clientes")
      .select("id,nombre,telefono,email,estado,created_at,sede_id")
      .order("nombre");
    const { data: clientesData, error: clientesError } = esDueno
      ? await clientesQuery
      : await clientesQuery.eq("sede_id", sesion.sede.id);
    if (clientesError) throw clientesError;

    const sedeIds = [...new Set((clientesData ?? []).map((cliente) => cliente.sede_id).filter(Boolean))];
    const { data: sedesData, error: sedesError } = sedeIds.length
      ? await supabase.from("sedes").select("id,nombre").in("id", sedeIds)
      : { data: [], error: null };
    if (sedesError) throw sedesError;

    const sedeNombrePorId = new Map((sedesData ?? []).map((sede) => [sede.id, sede.nombre]));
    const clientesConSede = (clientesData ?? []).map((cliente) => ({
      ...cliente,
      sede_nombre: sedeNombrePorId.get(cliente.sede_id) ?? "Sede no identificada",
    })) as Cliente[];

    setClientes(clientesConSede);
    if (seleccionado) setSeleccionado(clientesConSede.find((c) => c.id === seleccionado.id) ?? null);
  };

  useEffect(() => { if (puedeVer) void cargar(); }, [puedeVer]);

  useEffect(() => {
    if (!seleccionado) { setPedidos([]); setCotizaciones([]); return; }
    void (async () => {
      const [ped, cot] = await Promise.all([
        supabase.from("pedidos").select("id,referencia,estado,importe,fecha_entrega").eq("cliente_id", seleccionado.id).order("created_at", { ascending: false }).limit(8),
        supabase.from("cotizaciones").select("id,numero,estado,total").eq("cliente_id", seleccionado.id).order("created_at", { ascending: false }).limit(8),
      ]);
      setPedidos((ped.data ?? []) as PedidoRef[]);
      setCotizaciones((cot.data ?? []) as CotRef[]);
    })();
  }, [seleccionado?.id, seleccionado?.nombre]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return clientes.filter((c) => {
      const texto = [c.nombre, c.telefono ?? "", c.email ?? ""].join(" ").toLowerCase();
      return (!q || texto.includes(q)) && (estadoFiltro === "todos" || c.estado === estadoFiltro);
    });
  }, [clientes, busca, estadoFiltro]);

  const activos = clientes.filter((c) => c.estado === "activo").length;

  function nuevoCliente() {
    setForm({ nombre: "", telefono: "", email: "" });
    setModal(true);
  }

  function editarCliente() {
    if (!seleccionado) return;
    setForm({ nombre: seleccionado.nombre, telefono: seleccionado.telefono ?? "", email: seleccionado.email ?? "" });
    setModal(true);
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setGuardando(true);
    try {
      if (!sesion?.sede?.id) throw new Error("No hay una sede activa para guardar el cliente.");
      const payload = { nombre: form.nombre.trim(), telefono: form.telefono.trim() || null, email: form.email.trim() || null, sede_id: sesion.sede.id };
      const result = seleccionado
        ? await supabase.from("clientes").update(payload).eq("id", seleccionado.id)
        : await supabase.from("clientes").insert(payload);
      if (result.error) throw result.error;
      setModal(false);
      await cargar();
      if (!seleccionado) {
        const { data } = await supabase
          .from("clientes")
          .select("id,nombre,telefono,email,estado,created_at,sede_id")
          .eq("sede_id", sesion.sede.id)
          .eq("nombre", payload.nombre)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) setSeleccionado({ ...data, sede_nombre: sesion.sede.nombre });
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo guardar el cliente. Verifica tus permisos.");
    } finally { setGuardando(false); }
  }

  async function eliminarCliente() {
    if (!seleccionado || !sesion?.esDueno || eliminando) return;

    setEliminando(true);
    try {
      const clienteId = seleccionado.id;
      const { error } = await supabase.from("clientes").delete().eq("id", clienteId);
      if (error) throw error;

      // Actualización inmediata de la interfaz: no esperamos a una recarga completa.
      setClientes((actuales) => actuales.filter((cliente) => cliente.id !== clienteId));
      setSeleccionado(null);
      setConfirmarEliminacion(false);
      await cargar();
    } catch (error) {
      console.error(error);
      alert("No se pudo eliminar el cliente. Puede tener información relacionada que debe conservarse.");
    } finally {
      setEliminando(false);
    }
  }

  async function cambiarEstado() {
    if (!seleccionado) return;
    const nuevo = seleccionado.estado === "activo" ? "inactivo" : "activo";
    const { error } = await supabase.from("clientes").update({ estado: nuevo }).eq("id", seleccionado.id);
    if (error) { alert("No se pudo actualizar el estado."); return; }
    await cargar();
  }

  if (!puedeVer) {
    return <AppShell titulo="Clientes" subtitulo="Directorio comercial"><Panel titulo="Acceso restringido"><p className="p-6 text-sm text-muted-foreground">Esta sección contiene información comercial de clientes.</p></Panel></AppShell>;
  }

  return (
    <AppShell
      titulo="Clientes"
      subtitulo="Directorio comercial, historial y relación con cada cliente."
      acciones={
        <>
          <FichaDorada
            indicador="Directorio"
            titulo="Clientes"
            valor={clientes.length}
            descripcion="Clientes registrados"
            disabled
            icono={<UserRound className="size-5" strokeWidth={1.7} />}
          />
          <FichaDorada
            indicador="Estado"
            titulo="Activos"
            valor={activos}
            descripcion="Clientes activos"
            disabled
            icono={<UserRound className="size-5" strokeWidth={1.7} />}
          />
          <button type="button" onClick={nuevoCliente} className="group relative min-h-[150px] overflow-hidden rounded-2xl border border-gold/25 bg-card px-5 py-5 text-left text-foreground shadow-[0_18px_45px_-28px_rgba(0,0,0,0.65)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_-24px_rgba(0,0,0,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60">
            <span className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-gold/10 blur-2xl transition-all duration-500 group-hover:bg-gold/20" />
            <span className="relative flex h-full flex-col justify-between">
              <span className="grid size-10 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110">+</span>
              <span><span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-gold/80">Acción</span><span className="mt-1 block text-lg font-semibold">Nuevo cliente</span></span>
            </span>
          </button>
        </>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
        <section className="overflow-hidden rounded-2xl border border-gold/15 bg-card shadow-[0_18px_50px_-35px_rgba(0,0,0,0.35)]">
          <div className="border-b border-border p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">Directorio</p>
                <h2 className="mt-1 text-lg font-semibold">Clientes del taller</h2>
              </div>
              <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
                <option value="todos">Todos</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option>
              </select>
            </div>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nombre, teléfono o correo..." className="mt-4 h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/15" />
          </div>
          <div className="divide-y divide-border">
            {filtrados.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No encontramos clientes con esos filtros.</p> : filtrados.map((cliente) => (
              <button key={cliente.id} type="button" onClick={() => setSeleccionado(cliente)} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted sm:px-5 ${seleccionado?.id === cliente.id ? "bg-gold/5" : ""}`}>
                <span className="grid size-10 shrink-0 place-items-center rounded-full border border-gold/20 bg-gold/10 text-sm font-semibold text-gold">{cliente.nombre.charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{cliente.nombre}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{cliente.sede_nombre} · {cliente.telefono || cliente.email || "Sin contacto registrado"}</span>
                </span>
                <span className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${cliente.estado === "activo" ? "bg-success-soft text-success" : "bg-surface-muted text-muted-foreground"}`}>{cliente.estado}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gold/15 bg-card shadow-[0_18px_50px_-35px_rgba(0,0,0,0.35)]">
          {seleccionado ? (
            <div>
              <div className="relative overflow-hidden border-b border-gold/10 bg-gradient-to-br from-card via-card to-gold/[0.035] px-5 py-6 text-foreground sm:px-6">
                <span className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-gold/10 blur-3xl" />
                <span className="pointer-events-none absolute -bottom-20 left-1/3 size-40 rounded-full bg-gold/5 blur-3xl" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-gold/30 bg-gold/10 text-lg font-semibold text-gold shadow-[0_10px_30px_-15px_hsl(var(--gold)/0.8)]">{seleccionado.nombre.charAt(0).toUpperCase()}</span>
                    <div className="min-w-0"><p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-gold/80">Ficha de cliente</p><h2 className="mt-1 truncate text-xl font-semibold tracking-tight">{seleccionado.nombre}</h2><p className="mt-1 text-[11px] text-muted-foreground">Relación comercial · Aurum Lab</p><p className="mt-1 text-[11px] font-medium text-gold/80">Sede · {seleccionado.sede_nombre}</p></div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider ${seleccionado.estado === "activo" ? "border-success/30 bg-success/10 text-success" : "border-border bg-surface-muted text-muted-foreground"}`}>{seleccionado.estado}</span>
                </div>
              </div>
              <div className="p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="group rounded-2xl border border-border bg-surface-muted/45 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/25 hover:shadow-[0_12px_28px_-20px_hsl(var(--gold)/0.5)]"><div className="flex items-center justify-between"><span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Teléfono</span><Phone className="size-4 text-gold/60" strokeWidth={1.6} /></div><p className="mt-2 truncate text-sm font-medium">{seleccionado.telefono || "No registrado"}</p></div>
                  <div className="group rounded-2xl border border-border bg-surface-muted/45 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/25 hover:shadow-[0_12px_28px_-20px_hsl(var(--gold)/0.5)]"><div className="flex items-center justify-between"><span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Correo electrónico</span><Mail className="size-4 text-gold/60" strokeWidth={1.6} /></div><p className="mt-2 truncate text-sm font-medium">{seleccionado.email || "No registrado"}</p></div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Link to="/pedidos" className="group rounded-2xl border border-border bg-card p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-gold/35 hover:shadow-[0_16px_34px_-22px_hsl(var(--gold)/0.7)]"><div className="flex items-center justify-between"><span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Pedidos</span><ShoppingBag className="size-4 text-gold/65" strokeWidth={1.6} /></div><div className="mt-5 flex items-end justify-between"><span className="text-3xl font-semibold tabular-nums tracking-tight">{pedidos.length}</span><ChevronRight className="size-4 text-muted-foreground/40 group-hover:translate-x-1 group-hover:text-gold" /></div><span className="mt-1 block text-[10px] text-muted-foreground">Pedidos registrados</span></Link>
                  <Link to="/cotizaciones" className="group rounded-2xl border border-border bg-card p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-gold/35 hover:shadow-[0_16px_34px_-22px_hsl(var(--gold)/0.7)]"><div className="flex items-center justify-between"><span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cotizaciones</span><FileText className="size-4 text-gold/65" strokeWidth={1.6} /></div><div className="mt-5 flex items-end justify-between"><span className="text-3xl font-semibold tabular-nums tracking-tight">{cotizaciones.length}</span><ChevronRight className="size-4 text-muted-foreground/40 group-hover:translate-x-1 group-hover:text-gold" /></div><span className="mt-1 block text-[10px] text-muted-foreground">Ver cotizaciones</span></Link>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <button type="button" onClick={editarCliente} className="group inline-flex items-center gap-2 rounded-xl border border-gold/25 bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-gold/5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-16px_rgba(0,0,0,0.65)]">Editar ficha <ChevronRight className="size-3.5 group-hover:translate-x-0.5" /></button>
                  <button type="button" onClick={cambiarEstado} className="rounded-xl border border-border px-4 py-2.5 text-xs font-medium transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/30 hover:bg-gold/5">{seleccionado.estado === "activo" ? "Desactivar" : "Activar"}</button>
                  {sesion?.esDueno ? <button type="button" onClick={() => setConfirmarEliminacion(true)} disabled={guardando || eliminando} className="inline-flex items-center gap-2 rounded-xl border border-danger/25 px-4 py-2.5 text-xs font-semibold text-danger transition-all duration-300 hover:-translate-y-0.5 hover:bg-danger/5 disabled:opacity-50"><Trash2 className="size-3.5" /> Eliminar cliente</button> : null}
                </div>
                <div className="mt-7">
                  <SectionTitle title="Cotizaciones recientes" />
                  <div className="mt-2 divide-y divide-border rounded-xl border border-border">
                    {cotizaciones.length ? cotizaciones.map((q) => <div key={q.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs"><span><b>{q.numero}</b><span className="ml-2 text-muted-foreground">{q.estado}</span></span><b>{money(Number(q.total) || 0)}</b></div>) : <p className="p-4 text-xs text-muted-foreground">Sin cotizaciones registradas.</p>}
                  </div>
                </div>
                <div className="mt-6">
                  <SectionTitle title="Pedidos recientes" />
                  <div className="mt-2 divide-y divide-border rounded-xl border border-border">
                    {pedidos.length ? pedidos.map((p) => <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs"><span><b>{p.referencia}</b><span className="ml-2 text-muted-foreground">{p.estado}</span></span><b>{p.importe == null ? "—" : money(Number(p.importe))}</b></div>) : <p className="p-4 text-xs text-muted-foreground">Sin pedidos registrados.</p>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative flex min-h-[620px] items-center justify-center overflow-hidden p-8 text-center"><span className="pointer-events-none absolute size-64 rounded-full bg-gold/[0.035] blur-3xl" />
              <div><span className="relative mx-auto grid size-20 place-items-center rounded-full border border-gold/15 bg-gold/[0.025] text-2xl text-gold shadow-[0_20px_60px_-35px_hsl(var(--gold)/0.7)] before:absolute before:inset-[-14px] before:rounded-full before:border before:border-gold/10 after:absolute after:inset-[-28px] after:rounded-full after:border after:border-gold/5">◇</span><h2 className="mt-4 text-lg font-semibold">Selecciona un cliente</h2><p className="mt-1 max-w-xs text-sm text-muted-foreground">Aquí verás sus datos y su relación comercial con el taller.</p></div>
            </div>
          )}
        </section>
      </div>

      {confirmarEliminacion && seleccionado ? <div className="fixed inset-0 z-[60] grid place-items-center bg-foreground/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="confirmar-eliminacion-titulo">
        <div className="w-full max-w-md rounded-2xl border border-danger/20 bg-card p-6 shadow-raised">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger"><Trash2 className="size-5" /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-danger/80">Eliminar cliente</p>
              <h2 id="confirmar-eliminacion-titulo" className="mt-1 text-lg font-semibold">¿Eliminar definitivamente a {seleccionado.nombre}?</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Esta acción no se puede deshacer. Se eliminará la ficha del cliente y la información relacionada que permita la base de datos.</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmarEliminacion(false)} disabled={eliminando} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface-muted disabled:opacity-50">Cancelar</button>
            <button type="button" onClick={() => void eliminarCliente()} disabled={eliminando} className="inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              <Trash2 className="size-4" /> {eliminando ? "Eliminando..." : "Sí, eliminar cliente"}
            </button>
          </div>
        </div>
      </div> : null}

      {modal ? <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/10 p-4" role="dialog" aria-modal="true">
        <form onSubmit={guardar} className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-raised">
          <div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">Ficha comercial</p><h2 className="mt-1 text-xl font-semibold">{seleccionado ? "Editar cliente" : "Nuevo cliente"}</h2></div><button type="button" onClick={() => setModal(false)} className="rounded-lg px-2 py-1 text-muted-foreground">✕</button></div>
          <div className="mt-5 space-y-4">
            <Field label="Nombre completo" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} required />
            <Field label="Teléfono" value={form.telefono} onChange={(v) => setForm({ ...form, telefono: v })} />
            <Field label="Correo electrónico" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          </div>
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setModal(false)} className="rounded-xl border border-border px-4 py-2 text-sm">Cancelar</button><button type="submit" disabled={guardando} className="rounded-xl border border-gold/25 bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-gold/5 disabled:opacity-50">{guardando ? "Guardando..." : "Guardar cliente"}</button></div>
        </form>
      </div> : null}
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-surface-muted p-3"><p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm">{value}</p></div>;
}
function MiniMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-border p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>;
}
function SectionTitle({ title }: { title: string }) { return <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h3>; }
function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return <label className="block text-xs font-medium text-foreground">{label}<input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20" /></label>;
}
