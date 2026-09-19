import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Mail, MapPin, Pencil, Phone, Plus, Search, UserRound, UsersRound, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { AurumActionCard } from "@/components/AurumActionCard";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Aurum Lab" },
      { name: "description", content: "Clientes y contactos comerciales del taller." },
    ],
  }),
  component: ClientesPage,
});

type Cliente = {
  id: string;
  nombre: string;
  documento: string | null;
  email: string | null;
  telefono: string | null;
  whatsapp: string | null;
  ciudad: string | null;
  direccion: string | null;
  tipo: "persona" | "empresa";
  estado: "activo" | "inactivo";
  notas: string;
  sede_id: string | null;
};

type FormCliente = Omit<Cliente, "id" | "sede_id">;

const vacio: FormCliente = {
  nombre: "",
  documento: "",
  email: "",
  telefono: "",
  whatsapp: "",
  ciudad: "",
  direccion: "",
  tipo: "persona",
  estado: "activo",
  notas: "",
};

function ClientesPage() {
  const { data: sesion } = useSesion();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "activos" | "inactivos">("activos");
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "persona" | "empresa">("todos");
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [form, setForm] = useState<FormCliente>(vacio);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from("clientes")
      .select("id,nombre,documento,email,telefono,whatsapp,ciudad,direccion,tipo,estado,notas,sede_id")
      .order("nombre");
    if (error) {
      toast.error("No se pudieron cargar los clientes.");
      console.error(error);
    } else {
      setClientes((data ?? []) as Cliente[]);
    }
    setCargando(false);
  };

  useEffect(() => {
    void cargar();
  }, []);

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return clientes.filter((cliente) => {
      const okEstado = filtro === "todos" || (filtro === "activos" ? cliente.estado === "activo" : cliente.estado === "inactivo");
      const okTipo = tipoFiltro === "todos" || cliente.tipo === tipoFiltro;
      const texto = [
        cliente.nombre,
        cliente.documento,
        cliente.email,
        cliente.telefono,
        cliente.whatsapp,
        cliente.ciudad,
      ].join(" ").toLowerCase();
      return okEstado && okTipo && (!t || texto.includes(t));
    });
  }, [busca, clientes, filtro, tipoFiltro]);

  const activos = clientes.filter((c) => c.estado === "activo").length;
  const empresas = clientes.filter((c) => c.tipo === "empresa").length;
  const conContacto = clientes.filter((c) => c.telefono || c.whatsapp || c.email).length;

  function abrirNuevo() {
    setEditando(null);
    setForm(vacio);
    setAbierto(true);
  }

  function abrirEdicion(cliente: Cliente) {
    setEditando(cliente);
    setForm({
      nombre: cliente.nombre,
      documento: cliente.documento ?? "",
      email: cliente.email ?? "",
      telefono: cliente.telefono ?? "",
      whatsapp: cliente.whatsapp ?? "",
      ciudad: cliente.ciudad ?? "",
      direccion: cliente.direccion ?? "",
      tipo: cliente.tipo,
      estado: cliente.estado,
      notas: cliente.notas ?? "",
    });
    setAbierto(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!sesion?.esAdmin || !form.nombre.trim()) return;
    setGuardando(true);

    const payload = {
      nombre: form.nombre.trim(),
      documento: form.documento?.trim() || null,
      email: form.email?.trim() || null,
      telefono: form.telefono?.trim() || null,
      whatsapp: form.whatsapp?.trim() || null,
      ciudad: form.ciudad?.trim() || null,
      direccion: form.direccion?.trim() || null,
      tipo: form.tipo,
      estado: form.estado,
      notas: form.notas?.trim() ?? "",
      sede_id: editando?.sede_id ?? sesion.perfil.sede_id ?? null,
    };

    const query = editando
      ? supabase.from("clientes").update(payload).eq("id", editando.id)
      : supabase.from("clientes").insert({ ...payload, creado_por: sesion.user.id });

    const { error } = await query;
    setGuardando(false);

    if (error) {
      toast.error(error.message.includes("documento") ? "Ese documento ya está registrado." : "No se pudo guardar el cliente.");
      return;
    }

    toast.success(editando ? "Cliente actualizado." : "Cliente creado.");
    setAbierto(false);
    setEditando(null);
    await cargar();
  }

  return (
    <AppShell
      titulo="Clientes"
      subtitulo="La relación comercial empieza aquí."
      acciones={
        sesion?.esAdmin ? (
          <button
            type="button"
            onClick={abrirNuevo}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            <Plus className="size-4" />
            Nuevo cliente
          </button>
        ) : null
      }
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-surface-muted/60 p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                <UsersRound className="size-3.5" />
                Área comercial
              </div>
              <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
                Conoce al cliente. <span className="text-muted-foreground">Luego viene la joya.</span>
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Un solo registro para contacto, cotizaciones, proyectos y futuros pedidos. Sin volver a escribir los mismos datos.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-border/70 bg-card/80 px-3 py-2.5"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Clientes</p><p className="mt-1 text-lg font-semibold tabular-nums">{clientes.length}</p></div>
              <div className="rounded-xl border border-border/70 bg-card/80 px-3 py-2.5"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Activos</p><p className="mt-1 text-lg font-semibold tabular-nums">{activos}</p></div>
              <div className="rounded-xl border border-border/70 bg-card/80 px-3 py-2.5"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Empresas</p><p className="mt-1 text-lg font-semibold tabular-nums">{empresas}</p></div>
              <div className="rounded-xl border border-border/70 bg-card/80 px-3 py-2.5"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Con contacto</p><p className="mt-1 text-lg font-semibold tabular-nums">{conContacto}</p></div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <AurumActionCard icon={Plus} title="Nuevo cliente" text="Registra una persona o empresa en pocos pasos." onClick={abrirNuevo} />
          <AurumActionCard icon={Search} title="Buscar clientes" text="Encuentra por nombre, documento, teléfono o ciudad." onClick={() => document.getElementById("clientes-busqueda")?.focus()} />
          <AurumActionCard icon={FileText} title="Preparar una cotización" text="Cuando encuentres al cliente, continúa directamente con su cotización." onClick={() => window.location.assign("/cotizaciones")} />
        </div>

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row">
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input id="clientes-busqueda" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nombre, documento, teléfono o ciudad…" className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </label>
              <select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} className="h-11 rounded-xl border border-border bg-background px-3 text-sm">
                <option value="activos">Activos</option><option value="todos">Todos</option><option value="inactivos">Inactivos</option>
              </select>
              <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value as typeof tipoFiltro)} className="h-11 rounded-xl border border-border bg-background px-3 text-sm">
                <option value="todos">Todos los tipos</option><option value="persona">Personas</option><option value="empresa">Empresas</option>
              </select>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{filtrados.length} de {clientes.length} clientes</p>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-y border-border bg-surface-muted text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Cliente</th><th className="px-5 py-3">Contacto</th><th className="px-5 py-3">Ciudad</th><th className="px-5 py-3">Tipo</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3 text-right">Acción</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {filtrados.map((cliente) => (
                  <tr key={cliente.id} className="group transition-colors hover:bg-surface-muted/50">
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary transition group-hover:bg-primary/12"><UserRound className="size-4" /></div><div><p className="font-semibold">{cliente.nombre}</p><p className="text-xs text-muted-foreground">{cliente.documento || "Sin documento"}</p></div></div></td>
                    <td className="px-5 py-4"><div className="space-y-1 text-xs">{cliente.telefono || cliente.whatsapp ? <span className="flex items-center gap-1.5"><Phone className="size-3.5 text-muted-foreground" />{cliente.telefono || cliente.whatsapp}</span> : null}{cliente.email ? <span className="flex items-center gap-1.5 text-muted-foreground"><Mail className="size-3.5" />{cliente.email}</span> : null}{!cliente.telefono && !cliente.whatsapp && !cliente.email ? <span className="text-muted-foreground">Sin contacto</span> : null}</div></td>
                    <td className="px-5 py-4 text-muted-foreground">{cliente.ciudad || "—"}</td>
                    <td className="px-5 py-4"><span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs">{cliente.tipo === "empresa" ? "Empresa" : "Persona"}</span></td>
                    <td className="px-5 py-4"><span className={cliente.estado === "activo" ? "rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success" : "rounded-full bg-surface-muted px-2.5 py-1 text-xs text-muted-foreground"}>{cliente.estado === "activo" ? "Activo" : "Inactivo"}</span></td>
                    <td className="px-5 py-4 text-right"><button type="button" onClick={() => abrirEdicion(cliente)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold transition hover:border-primary/40 hover:text-primary"><Pencil className="size-3.5" /> Editar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {filtrados.map((cliente) => (
              <button key={cliente.id} type="button" onClick={() => abrirEdicion(cliente)} className="group flex w-full items-center gap-3 p-4 text-left transition hover:bg-surface-muted/50 active:scale-[0.995]">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary group-hover:bg-primary/12"><UserRound className="size-5" /></div>
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{cliente.nombre}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{cliente.telefono || cliente.email || cliente.ciudad || "Sin datos de contacto"}</p></div>
                <span className="text-primary">→</span>
              </button>
            ))}
          </div>

          {!cargando && filtrados.length === 0 ? <div className="px-6 py-14 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-surface-muted text-muted-foreground"><UsersRound className="size-5" /></div><p className="mt-3 font-semibold">{clientes.length === 0 ? "Todavía no hay clientes" : "No encontramos coincidencias"}</p><p className="mt-1 text-sm text-muted-foreground">{clientes.length === 0 ? "Empieza registrando el primer cliente del taller." : "Prueba con otro nombre, teléfono o documento."}</p></div> : null}
        </section>
      </div>

      {abierto ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4" role="dialog" aria-modal="true">
          <form onSubmit={guardar} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{editando ? "Actualizar ficha" : "Nueva ficha"}</p><h2 className="mt-1 font-display text-2xl">{editando ? "Editar cliente" : "Nuevo cliente"}</h2><p className="mt-1 text-sm text-muted-foreground">Estos datos se reutilizan en cotizaciones, proyectos y pedidos.</p></div>
              <button type="button" onClick={() => setAbierto(false)} className="rounded-full border border-border p-2 transition hover:border-primary/40"><X className="size-4" /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-muted-foreground sm:col-span-2">Nombre / razón social<input required autoFocus value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" /></label>
              <label className="text-xs font-medium text-muted-foreground">Tipo<select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as FormCliente["tipo"] })} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"><option value="persona">Persona</option><option value="empresa">Empresa</option></select></label>
              <label className="text-xs font-medium text-muted-foreground">Documento<input value={form.documento ?? ""} onChange={(e) => setForm({ ...form, documento: e.target.value })} placeholder="DNI / RUC / documento" className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" /></label>
              <label className="text-xs font-medium text-muted-foreground"><span className="flex items-center gap-1.5"><Phone className="size-3.5" /> Teléfono</span><input value={form.telefono ?? ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" /></label>
              <label className="text-xs font-medium text-muted-foreground">WhatsApp<input value={form.whatsapp ?? ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" /></label>
              <label className="text-xs font-medium text-muted-foreground"><span className="flex items-center gap-1.5"><Mail className="size-3.5" /> Correo</span><input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" /></label>
              <label className="text-xs font-medium text-muted-foreground"><span className="flex items-center gap-1.5"><MapPin className="size-3.5" /> Ciudad</span><input value={form.ciudad ?? ""} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" /></label>
              <label className="text-xs font-medium text-muted-foreground">Dirección<input value={form.direccion ?? ""} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" /></label>
              <label className="text-xs font-medium text-muted-foreground">Estado<select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as FormCliente["estado"] })} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></label>
              <label className="text-xs font-medium text-muted-foreground sm:col-span-2">Notas<textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={3} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" /></label>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setAbierto(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">Cancelar</button>
              <button type="submit" disabled={guardando} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear cliente"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </AppShell>
  );
}
