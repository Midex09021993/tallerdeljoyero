import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, FileText, Mail, MapPin, Pencil, Phone, Plus, Search, ShoppingBag, UserRound, UsersRound, X } from "lucide-react";
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

type HistorialCliente = {
  cotizaciones: Array<{ id: string; numero: string; version: number; estado: string; total: number; moneda: string; fecha_emision: string }>;
  proyectos: Array<{ id: string; codigo: string; nombre: string; descripcion: string; metal: string | null; ley: string | null; piedras: string | null; talla: string | null }>;
  contratos: Array<{ id: string; numero: string; origen: string; total: number; abonado: number; created_at: string }>;
  pedidos: Array<{ id: string; referencia: string; pieza: string; trabajo: string; estado: string; area_actual: string; fecha_entrega: string | null; contrato: string }>;
};

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

function moneyLocal(n: number, moneda = "PEN") {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: moneda, maximumFractionDigits: 2 }).format(Number(n) || 0);
}

function FichaStat({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/80 px-3 py-2.5">
      <div className="flex items-center gap-2 text-muted-foreground"><Icon className="size-3.5" /><span className="text-[10px] uppercase tracking-wider">{label}</span></div>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function HistoriaPanel({ titulo, icon: Icon, empty, children }: { titulo: string; icon: typeof FileText; empty: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface-muted/30 p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2"><div className="grid size-8 place-items-center rounded-lg bg-primary/8 text-primary"><Icon className="size-4" /></div><h3 className="font-semibold">{titulo}</h3></div>
      <div className="space-y-2">{children ? children : <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">{empty}</p>}</div>
    </section>
  );
}

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
  const [ficha, setFicha] = useState<Cliente | null>(null);
  const [historial, setHistorial] = useState<HistorialCliente | null>(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

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

  async function abrirFicha(cliente: Cliente) {
    setFicha(cliente);
    setHistorial(null);
    setCargandoHistorial(true);

    const [cotizaciones, proyectos, contratos, pedidos] = await Promise.all([
      supabase.from("cotizaciones").select("id,numero,version,estado,total,moneda,fecha_emision").eq("cliente_id", cliente.id).order("created_at", { ascending: false }),
      supabase.from("proyectos_joya").select("id,codigo,nombre,descripcion,metal,ley,piedras,talla").eq("cliente_id", cliente.id).order("created_at", { ascending: false }),
      supabase.from("contratos").select("id,numero,origen,total,abonado,created_at").eq("cliente", cliente.nombre).order("created_at", { ascending: false }),
      supabase.from("pedidos").select("id,referencia,pieza,trabajo,estado,area_actual,fecha_entrega,contrato").eq("cliente", cliente.nombre).order("created_at", { ascending: false }),
    ]);

    const error = cotizaciones.error ?? proyectos.error ?? contratos.error ?? pedidos.error;
    if (error) {
      console.error(error);
      toast.error("No se pudo cargar toda la historia del cliente.");
    }

    setHistorial({
      cotizaciones: (cotizaciones.data ?? []) as HistorialCliente["cotizaciones"],
      proyectos: (proyectos.data ?? []) as HistorialCliente["proyectos"],
      contratos: (contratos.data ?? []) as HistorialCliente["contratos"],
      pedidos: (pedidos.data ?? []) as HistorialCliente["pedidos"],
    });
    setCargandoHistorial(false);
  }

  function cerrarFicha() {
    setFicha(null);
    setHistorial(null);
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
                  <tr key={cliente.id} onClick={() => void abrirFicha(cliente)} className="group cursor-pointer transition-colors hover:bg-surface-muted/50">
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary transition group-hover:bg-primary/12"><UserRound className="size-4" /></div><div><p className="font-semibold">{cliente.nombre}</p><p className="text-xs text-muted-foreground">{cliente.documento || "Sin documento"}</p></div></div></td>
                    <td className="px-5 py-4"><div className="space-y-1 text-xs">{cliente.telefono || cliente.whatsapp ? <span className="flex items-center gap-1.5"><Phone className="size-3.5 text-muted-foreground" />{cliente.telefono || cliente.whatsapp}</span> : null}{cliente.email ? <span className="flex items-center gap-1.5 text-muted-foreground"><Mail className="size-3.5" />{cliente.email}</span> : null}{!cliente.telefono && !cliente.whatsapp && !cliente.email ? <span className="text-muted-foreground">Sin contacto</span> : null}</div></td>
                    <td className="px-5 py-4 text-muted-foreground">{cliente.ciudad || "—"}</td>
                    <td className="px-5 py-4"><span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs">{cliente.tipo === "empresa" ? "Empresa" : "Persona"}</span></td>
                    <td className="px-5 py-4"><span className={cliente.estado === "activo" ? "rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success" : "rounded-full bg-surface-muted px-2.5 py-1 text-xs text-muted-foreground"}>{cliente.estado === "activo" ? "Activo" : "Inactivo"}</span></td>
                    <td className="px-5 py-4 text-right"><button type="button" onClick={(e) => { e.stopPropagation(); abrirEdicion(cliente); }} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold transition hover:border-primary/40 hover:text-primary"><Pencil className="size-3.5" /> Editar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {filtrados.map((cliente) => (
              <button key={cliente.id} type="button" onClick={() => void abrirFicha(cliente)} className="group flex w-full items-center gap-3 p-4 text-left transition hover:bg-surface-muted/50 active:scale-[0.995]">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary group-hover:bg-primary/12"><UserRound className="size-5" /></div>
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{cliente.nombre}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{cliente.telefono || cliente.email || cliente.ciudad || "Sin datos de contacto"}</p></div>
                <span className="text-primary">→</span>
              </button>
            ))}
          </div>

          {!cargando && filtrados.length === 0 ? <div className="px-6 py-14 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-surface-muted text-muted-foreground"><UsersRound className="size-5" /></div><p className="mt-3 font-semibold">{clientes.length === 0 ? "Todavía no hay clientes" : "No encontramos coincidencias"}</p><p className="mt-1 text-sm text-muted-foreground">{clientes.length === 0 ? "Empieza registrando el primer cliente del taller." : "Prueba con otro nombre, teléfono o documento."}</p></div> : null}
        </section>
      </div>

      {ficha ? (
        <div className="fixed inset-0 z-50 bg-ink/60 p-3 sm:p-6" role="dialog" aria-modal="true">
          <div className="mx-auto flex h-full max-h-[900px] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
            <div className="shrink-0 border-b border-border bg-gradient-to-r from-card via-card to-surface-muted/60 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><UserRound className="size-6" /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Ficha comercial</p>
                    <h2 className="mt-1 truncate font-display text-2xl sm:text-3xl">{ficha.nombre}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{[ficha.documento, ficha.ciudad, ficha.telefono || ficha.whatsapp].filter(Boolean).join(" · ") || "Sin datos de contacto"}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {sesion?.esAdmin ? <button type="button" onClick={() => { cerrarFicha(); abrirEdicion(ficha); }} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition hover:border-primary/40 hover:text-primary"><Pencil className="size-3.5" /> Editar</button> : null}
                  <button type="button" onClick={cerrarFicha} className="rounded-xl border border-border p-2 transition hover:border-primary/40"><X className="size-4" /></button>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <FichaStat icon={FileText} label="Cotizaciones" value={historial?.cotizaciones.length ?? 0} />
                <FichaStat icon={BriefcaseBusiness} label="Proyectos" value={historial?.proyectos.length ?? 0} />
                <FichaStat icon={CheckCircle2} label="Contratos" value={historial?.contratos.length ?? 0} />
                <FichaStat icon={ShoppingBag} label="Pedidos" value={historial?.pedidos.length ?? 0} />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {cargandoHistorial ? <div className="grid min-h-[300px] place-items-center text-sm text-muted-foreground">Cargando historia comercial…</div> : (
                <div className="grid gap-5 lg:grid-cols-2">
                  <HistoriaPanel titulo="Cotizaciones" icon={FileText} empty="Todavía no hay cotizaciones para este cliente.">
                    {historial?.cotizaciones.map((q) => (
                      <Link key={q.id} to="/cotizaciones/$id" params={{ id: q.id }} onClick={cerrarFicha} className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm">
                        <div className="min-w-0 flex-1"><p className="font-semibold">{q.numero} <span className="text-xs font-normal text-muted-foreground">v{q.version}</span></p><p className="mt-1 text-xs text-muted-foreground">{q.fecha_emision} · {q.estado}</p></div>
                        <p className="text-sm font-semibold">{moneyLocal(q.total, q.moneda)}</p><ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                      </Link>
                    ))}
                  </HistoriaPanel>

                  <HistoriaPanel titulo="Proyectos de joyería" icon={BriefcaseBusiness} empty="Todavía no hay proyectos vinculados.">
                    {historial?.proyectos.map((p) => (
                      <div key={p.id} className="rounded-xl border border-border bg-card p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0"><p className="font-semibold">{p.nombre}</p><p className="mt-1 text-xs text-muted-foreground">{p.codigo}{p.metal ? " · " + p.metal : ""}{p.ley ? " " + p.ley : ""}</p></div>
                          {p.talla ? <span className="rounded-full bg-surface-muted px-2 py-1 text-[10px]">{p.talla}</span> : null}
                        </div>
                        {p.descripcion ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{p.descripcion}</p> : null}
                        {p.piedras ? <p className="mt-2 text-[11px] text-muted-foreground">Piedras: {p.piedras}</p> : null}
                      </div>
                    ))}
                  </HistoriaPanel>

                  <HistoriaPanel titulo="Contratos" icon={CheckCircle2} empty="Todavía no hay contratos registrados con este cliente.">
                    {historial?.contratos.map((c) => (
                      <Link key={c.id} to="/contratos/$id" params={{ id: c.id }} onClick={cerrarFicha} className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm">
                        <div className="min-w-0 flex-1"><p className="font-semibold">{c.numero}</p><p className="mt-1 text-xs text-muted-foreground">{c.origen || "Contrato comercial"}</p></div>
                        <div className="text-right"><p className="text-sm font-semibold">{moneyLocal(c.total, "PEN")}</p><p className="text-[10px] text-muted-foreground">Abonado {moneyLocal(c.abonado, "PEN")}</p></div>
                        <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                      </Link>
                    ))}
                  </HistoriaPanel>

                  <HistoriaPanel titulo="Pedidos" icon={ShoppingBag} empty="Todavía no hay pedidos registrados con este cliente.">
                    {historial?.pedidos.map((p) => (
                      <Link key={p.id} to="/pedidos/$id" params={{ id: p.id }} search={{ from: "pedidos" }} onClick={cerrarFicha} className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm">
                        <div className="min-w-0 flex-1"><p className="font-semibold">{p.referencia}</p><p className="mt-1 truncate text-xs text-muted-foreground">{p.trabajo || p.pieza || "Trabajo de joyería"}</p><p className="mt-1 text-[10px] text-muted-foreground">{p.area_actual || "Pedidos"} · {p.estado}</p></div>
                        {p.fecha_entrega ? <span className="hidden rounded-full bg-surface-muted px-2 py-1 text-[10px] sm:inline">{p.fecha_entrega}</span> : null}
                        <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                      </Link>
                    ))}
                  </HistoriaPanel>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-border bg-surface-muted/40 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Link to="/cotizaciones" onClick={cerrarFicha} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"><Plus className="size-4" /> Nueva cotización</Link>
                <button type="button" onClick={cerrarFicha} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
