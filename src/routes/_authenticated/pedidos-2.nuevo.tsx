import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, ClipboardList, Factory, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useCrearPedido, usePedidos, useSedes, type PedidoNuevo } from "@/lib/taller-db";
import { useSesion } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pedidos-2/nuevo")({
  head: () => ({ meta: [{ title: "Nuevo pedido — Pedidos 2" }] }),
  component: NuevoPedido2,
});

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function prefijoSede(nombre: string) {
  const palabras = nombre.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]/g, "").trim().split(/\s+/).filter(Boolean);
  return (palabras.length > 1 ? palabras[0][0] + palabras[1][0] : (palabras[0] ?? "TA").slice(0, 2)).toUpperCase();
}

function siguienteReferencia(sede: string, refs: string[]) {
  const prefijo = prefijoSede(sede);
  const re = new RegExp(`^${prefijo}-(\\d+)$`, "i");
  const max = refs.reduce((n, ref) => {
    const match = re.exec(ref ?? "");
    return match ? Math.max(n, Number(match[1])) : n;
  }, 0);
  return `${prefijo}-${String(max + 1).padStart(3, "0")}`;
}

const rutas = ["Diseño 3D", "Impresión 3D", "Casting", "Corte Láser", "Taller", "Área ventas"];

function Campo({ label, value, onChange, placeholder, type = "text", required = false }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}{required ? " *" : ""}</span>
      <input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/10" />
    </label>
  );
}

function NuevoPedido2() {
  const navigate = useNavigate();
  const { data: sesion } = useSesion();
  const { data: pedidos = [] } = usePedidos();
  const { data: sedes = [] } = useSedes();
  const crear = useCrearPedido();
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const { data: clientes = [] } = useQuery({
    queryKey: ["pedidos-2-nuevo-clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("id,nombre,telefono").eq("estado", "activo").order("nombre");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [clienteId, setClienteId] = useState("");
  const [sedeId, setSedeId] = useState(sesion?.perfil.sede_id ?? sedes[0]?.id ?? "");
  const [form, setForm] = useState({
    cliente: "", telefono: "", trabajo: "", material: "", talla: "", piedras: "",
    peso_estimado: "", cantidad_piezas: "1", fecha_ingreso: hoy(), fecha_entrega: "",
    importe: "", a_cuenta: "", origen: "", contrato: "", notas: "",
  });
  const [ruta, setRuta] = useState<string[]>([]);

  const sede = sedes.find((s) => s.id === sedeId);
  const clientesFiltrados = useMemo(() => {
    const q = clienteBusqueda.trim().toLowerCase();
    return (q ? clientes.filter((c) => [c.nombre, c.telefono].some((v) => (v ?? "").toLowerCase().includes(q))) : clientes).slice(0, 6);
  }, [clienteBusqueda, clientes]);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const toggleRuta = (area: string) => setRuta((actual) => actual.includes(area) ? actual.filter((x) => x !== area) : [...actual, area]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sesion?.esAdmin) {
      toast.error("No tienes permisos para registrar pedidos.");
      return;
    }
    if (!sedeId) {
      toast.error("Selecciona el taller donde se recibe el pedido.");
      return;
    }
    if (!form.trabajo.trim()) {
      toast.error("Indica qué joya o trabajo se está recibiendo.");
      return;
    }
    if (!ruta.length) {
      toast.error("Selecciona al menos un área de la ruta.");
      return;
    }

    const nuevo: PedidoNuevo = {
      referencia: siguienteReferencia(sede?.nombre ?? "Taller", pedidos.map((p) => p.referencia)),
      pieza: form.trabajo.trim(),
      trabajo: form.trabajo.trim(),
      cliente: form.cliente.trim() || "Cliente pendiente de registrar",
      cliente_id: clienteId || null,
      material: form.material.trim(),
      estado: "Recibido",
      entrega: form.fecha_entrega || "",
      importe: Number(form.importe) || 0,
      a_cuenta: Number(form.a_cuenta) || 0,
      sede_id: sedeId,
      telefono: form.telefono.trim(),
      origen: form.origen.trim(),
      contrato: form.contrato.trim(),
      fecha_ingreso: form.fecha_ingreso || hoy(),
      fecha_entrega: form.fecha_entrega || null,
      area_actual: "Pedidos",
      ruta,
      notas: form.notas.trim(),
      talla: form.talla.trim(),
      cantidad_piezas: Math.max(1, Number(form.cantidad_piezas) || 1),
      piedras: form.piedras.trim(),
      peso_estimado: form.peso_estimado.trim(),
    };

    try {
      const resultado = await crear.mutateAsync(nuevo);
      toast.success(`Pedido ${resultado?.referencia ?? nuevo.referencia} creado correctamente.`);
      navigate({ to: "/pedidos-2/$id", params: { id: resultado.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el pedido.");
    }
  };

  if (!sesion?.esAdmin) {
    return <AppShell titulo="Nuevo pedido" subtitulo="Permisos"><div className="rounded-2xl border border-warning/30 bg-warning-soft p-6 text-sm">Solo un usuario con rol de dueño o gerente puede registrar un pedido.</div></AppShell>;
  }

  return (
    <AppShell titulo="Nuevo pedido" subtitulo="Registrar una joya desde recepción y dejarla lista para su recorrido operativo"
      acciones={<button type="button" onClick={() => navigate({ to: "/pedidos-2" })} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold"><ArrowLeft className="size-4" /> Volver a Pedidos 2</button>}>
      <form onSubmit={submit} className="mx-auto max-w-6xl">
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <section className="rounded-[24px] border border-border bg-card p-5 shadow-card sm:p-6">
              <div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-gold/10 text-gold"><ClipboardList className="size-5" /></span><div><h2 className="text-base font-semibold">Identificación del pedido</h2><p className="mt-1 text-xs text-muted-foreground">Define qué joya entra al sistema y a quién pertenece.</p></div></div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><label className="block"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cliente</span><input value={clienteBusqueda || form.cliente} onChange={(e) => { setClienteBusqueda(e.target.value); set("cliente", e.target.value); setClienteId(""); }} placeholder="Buscar por nombre o teléfono" className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/50" /></label>{clientesFiltrados.length ? <div className="mt-1 rounded-xl border border-border bg-card p-1 shadow-raised">{clientesFiltrados.map((c) => <button key={c.id} type="button" onClick={() => { setClienteId(c.id); set("cliente", c.nombre); set("telefono", c.telefono ?? ""); setClienteBusqueda(""); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-muted"><span>{c.nombre}</span><span className="text-muted-foreground">{c.telefono || ""}</span></button>)}</div> : null}</div>
                <Campo label="Trabajo / joya" value={form.trabajo} onChange={(v) => set("trabajo", v)} placeholder="Ej. Anillo de compromiso" required />
                <Campo label="Teléfono" value={form.telefono} onChange={(v) => set("telefono", v)} placeholder="Contacto" />
                <Campo label="Material" value={form.material} onChange={(v) => set("material", v)} placeholder="Ej. Oro 18K amarillo" />
                <Campo label="Talla" value={form.talla} onChange={(v) => set("talla", v)} placeholder="Ej. 18" />
                <Campo label="Piedras" value={form.piedras} onChange={(v) => set("piedras", v)} placeholder="Diamantes, zafiros…" />
                <Campo label="Peso estimado" value={form.peso_estimado} onChange={(v) => set("peso_estimado", v)} placeholder="Ej. 4.20 g" />
                <Campo label="Cantidad de piezas" value={form.cantidad_piezas} onChange={(v) => set("cantidad_piezas", v)} type="number" />
              </div>
            </section>

            <section className="rounded-[24px] border border-border bg-card p-5 shadow-card sm:p-6">
              <div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-gold/10 text-gold"><Factory className="size-5" /></span><div><h2 className="text-base font-semibold">Ruta de fabricación</h2><p className="mt-1 text-xs text-muted-foreground">Selecciona las áreas que deberán intervenir en esta joya.</p></div></div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{rutas.map((area) => <button key={area} type="button" onClick={() => toggleRuta(area)} className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left text-xs font-semibold ${ruta.includes(area) ? "border-gold bg-gold/10 text-foreground" : "border-border bg-background text-muted-foreground hover:bg-surface-muted"}`}><span>{area}</span>{ruta.includes(area) ? <Check className="size-4 text-gold" /> : null}</button>)}</div>
            </section>

            <section className="rounded-[24px] border border-border bg-card p-5 shadow-card sm:p-6">
              <h2 className="text-base font-semibold">Fechas y documentación</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Campo label="Fecha de ingreso" value={form.fecha_ingreso} onChange={(v) => set("fecha_ingreso", v)} type="date" required />
                <Campo label="Fecha prometida de entrega" value={form.fecha_entrega} onChange={(v) => set("fecha_entrega", v)} type="date" />
                <Campo label="Contrato / referencia comercial" value={form.contrato} onChange={(v) => set("contrato", v)} placeholder="Opcional" />
                <Campo label="Origen" value={form.origen} onChange={(v) => set("origen", v)} placeholder="Web, tienda, referido…" />
              </div>
              <label className="mt-4 block"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notas de recepción</span><textarea value={form.notas} onChange={(e) => set("notas", e.target.value)} rows={4} placeholder="Detalles importantes para fabricación o atención al cliente…" className="mt-1.5 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-gold/50" /></label>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-[24px] border border-gold/20 bg-card p-5 shadow-card">
              <div className="flex items-start gap-3"><UserRound className="mt-0.5 size-5 text-gold" /><div><h2 className="text-sm font-semibold">Taller responsable</h2><p className="mt-1 text-xs text-muted-foreground">La sede queda asociada al pedido desde su creación.</p></div></div>
              <select value={sedeId} onChange={(e) => setSedeId(e.target.value)} className="mt-4 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/50"><option value="">Seleccionar taller</option>{sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}{s.ciudad ? ` · ${s.ciudad}` : ""}</option>)}</select>
            </section>

            <section className="rounded-[24px] border border-border bg-card p-5 shadow-card">
              <h2 className="text-sm font-semibold">Condición comercial</h2>
              <div className="mt-4 space-y-4">
                <Campo label="Importe de venta" value={form.importe} onChange={(v) => set("importe", v)} type="number" placeholder="0.00" />
                <Campo label="A cuenta" value={form.a_cuenta} onChange={(v) => set("a_cuenta", v)} type="number" placeholder="0.00" />
              </div>
              <div className="mt-4 rounded-xl bg-surface-muted p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo inicial</p><p className="mt-1 text-lg font-semibold">S/ {Math.max((Number(form.importe) || 0) - (Number(form.a_cuenta) || 0), 0).toFixed(2)}</p></div>
            </section>

            <button disabled={crear.isPending} type="submit" className="w-full rounded-2xl bg-gold px-4 py-3.5 text-sm font-bold text-gold-foreground shadow-raised disabled:cursor-not-allowed disabled:opacity-50">{crear.isPending ? "Creando pedido…" : "Crear pedido"}</button>
            <p className="px-2 text-center text-[11px] leading-5 text-muted-foreground">Al crear, el pedido queda en <strong>Recibido</strong>, asociado al taller y visible inmediatamente en Pedidos 2.</p>
          </aside>
        </div>
      </form>
    </AppShell>
  );
}
