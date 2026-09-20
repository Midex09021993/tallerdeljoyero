import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Panel, StatCard } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { areaCoincide, useSesion } from "@/lib/auth";

type Cliente = {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  estado: string;
  created_at: string;
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
  const [form, setForm] = useState({ nombre: "", telefono: "", email: "" });

  const cargar = async () => {
    const { data } = await supabase.from("clientes").select("id,nombre,telefono,email,estado,created_at").order("nombre");
    if (data) {
      setClientes(data);
      if (seleccionado) setSeleccionado(data.find((c) => c.id === seleccionado.id) ?? null);
    }
  };

  useEffect(() => { if (puedeVer) void cargar(); }, [puedeVer]);

  useEffect(() => {
    if (!seleccionado) { setPedidos([]); setCotizaciones([]); return; }
    void (async () => {
      const [ped, cot] = await Promise.all([
        supabase.from("pedidos").select("id,referencia,estado,importe,fecha_entrega").eq("cliente", seleccionado.nombre).order("created_at", { ascending: false }).limit(8),
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

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setGuardando(true);
    try {
      const payload = { nombre: form.nombre.trim(), telefono: form.telefono.trim() || null, email: form.email.trim() || null };
      const result = seleccionado
        ? await supabase.from("clientes").update(payload).eq("id", seleccionado.id)
        : await supabase.from("clientes").insert(payload);
      if (result.error) throw result.error;
      setModal(false);
      await cargar();
      if (!seleccionado) {
        const { data } = await supabase.from("clientes").select("id,nombre,telefono,email,estado,created_at").eq("nombre", payload.nombre).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (data) setSeleccionado(data);
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo guardar el cliente. Verifica tus permisos.");
    } finally { setGuardando(false); }
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
          <StatCard etiqueta="Clientes" valor={String(clientes.length)} />
          <StatCard etiqueta="Activos" valor={String(activos)} />
          <button type="button" onClick={nuevoCliente} className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-ink-foreground hover:opacity-90">+ Nuevo cliente</button>
        </>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
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
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nombre, teléfono o correo..." className="mt-4 h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20" />
          </div>
          <div className="divide-y divide-border">
            {filtrados.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No encontramos clientes con esos filtros.</p> : filtrados.map((cliente) => (
              <button key={cliente.id} type="button" onClick={() => setSeleccionado(cliente)} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted sm:px-5 ${seleccionado?.id === cliente.id ? "bg-gold/5" : ""}`}>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-sm font-semibold text-gold">{cliente.nombre.charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{cliente.nombre}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{cliente.telefono || cliente.email || "Sin contacto registrado"}</span>
                </span>
                <span className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${cliente.estado === "activo" ? "bg-success-soft text-success" : "bg-surface-muted text-muted-foreground"}`}>{cliente.estado}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card shadow-card">
          {seleccionado ? (
            <div>
              <div className="border-b border-border bg-ink px-5 py-6 text-ink-foreground">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 place-items-center rounded-full bg-gold text-lg font-semibold text-ink">{seleccionado.nombre.charAt(0).toUpperCase()}</span>
                    <div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Ficha de cliente</p><h2 className="mt-1 text-xl font-semibold">{seleccionado.nombre}</h2></div>
                  </div>
                  <span className="rounded-full border border-white/15 px-2.5 py-1 text-[9px] font-semibold uppercase">{seleccionado.estado}</span>
                </div>
              </div>
              <div className="p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Info label="Teléfono" value={seleccionado.telefono || "No registrado"} />
                  <Info label="Correo" value={seleccionado.email || "No registrado"} />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <MiniMetric label="Pedidos" value={pedidos.length} />
                  <MiniMetric label="Cotizaciones" value={cotizaciones.length} />
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <button type="button" onClick={editarCliente} className="rounded-xl bg-ink px-3.5 py-2 text-xs font-medium text-ink-foreground">Editar ficha</button>
                  <button type="button" onClick={cambiarEstado} className="rounded-xl border border-border px-3.5 py-2 text-xs font-medium">{seleccionado.estado === "activo" ? "Desactivar" : "Activar"}</button>
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
            <div className="flex min-h-[520px] items-center justify-center p-8 text-center">
              <div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-surface-muted text-2xl">♢</span><h2 className="mt-4 text-lg font-semibold">Selecciona un cliente</h2><p className="mt-1 max-w-xs text-sm text-muted-foreground">Aquí verás sus datos y su relación comercial con el taller.</p></div>
            </div>
          )}
        </section>
      </div>

      {modal ? <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4" role="dialog" aria-modal="true">
        <form onSubmit={guardar} className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-raised">
          <div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">Ficha comercial</p><h2 className="mt-1 text-xl font-semibold">{seleccionado ? "Editar cliente" : "Nuevo cliente"}</h2></div><button type="button" onClick={() => setModal(false)} className="rounded-lg px-2 py-1 text-muted-foreground">✕</button></div>
          <div className="mt-5 space-y-4">
            <Field label="Nombre completo" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} required />
            <Field label="Teléfono" value={form.telefono} onChange={(v) => setForm({ ...form, telefono: v })} />
            <Field label="Correo electrónico" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          </div>
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setModal(false)} className="rounded-xl border border-border px-4 py-2 text-sm">Cancelar</button><button type="submit" disabled={guardando} className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-ink-foreground disabled:opacity-50">{guardando ? "Guardando..." : "Guardar cliente"}</button></div>
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
