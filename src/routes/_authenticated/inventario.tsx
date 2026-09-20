import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  CircleAlert,
  FilePlus2,
  Gem,
  History,
  MapPin,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { FichaDorada } from "@/components/FichaDorada";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/inventario")({
  head: () => ({
    meta: [
      { title: "Inventario — Aurum Lab" },
      { name: "description", content: "Inventario profesional de materiales, movimientos y joyas terminadas." },
    ],
  }),
  component: InventarioPage,
});

type Tab = "resumen" | "materiales" | "movimientos" | "joyas";
type Material = {
  id: string; sede_id: string | null; codigo: string; material: string; categoria: string;
  unidad: string; stock: number; minimo: number; lote: string; ubicacion: string;
  proveedor: string; costo_unitario: number; activo: boolean;
};
type Movimiento = {
  id: string; material_id: string; tipo: string; cantidad: number;
  stock_anterior: number | null; stock_posterior: number | null; motivo: string;
  referencia_externa: string; pedido_id: string | null; created_at: string; inventario?: { material: string; unidad: string } | null;
};
type Joya = {
  id: string; codigo: string; nombre: string; metal: string; ley: string; peso: number | null;
  talla: string; piedras: string; cantidad: number; estado: string;
};

const CATEGORIAS = ["Oro", "Plata", "Piedras", "Resina", "Soldadura", "Herramientas", "Otros insumos"];
const TIPOS: [string, string][] = [
  ["entrada", "Entrada"],
  ["consumo", "Consumo"],
  ["devolucion", "Devolución"],
  ["merma", "Merma"],
  ["ajuste_positivo", "Ajuste positivo"],
  ["ajuste_negativo", "Ajuste negativo"],
];

function InventarioPage() {
  const { data: sesion } = useSesion();
  const sedeId = sesion?.perfil.sede_id ?? null;
  const esAdmin = Boolean(sesion?.esAdmin);
  const puedeMover = esAdmin;

  if (sesion && !esAdmin) {
    return (
      <AppShell titulo="Inventario" subtitulo="Acceso restringido">
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 text-center shadow-card">
          <p className="text-base font-semibold">Inventario restringido</p>
          <p className="mt-2 text-sm text-muted-foreground">Tu cuenta operativa no tiene acceso al inventario general ni al Kardex.</p>
        </div>
      </AppShell>
    );
  }

  const [tab, setTab] = useState<Tab>("resumen");
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [joyas, setJoyas] = useState<Joya[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [movBusqueda, setMovBusqueda] = useState("");
  const [movTipo, setMovTipo] = useState("Todos");
  const [movMaterial, setMovMaterial] = useState("Todos");
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState<"material" | "movimiento" | "joya" | null>(null);
  const [editando, setEditando] = useState<Material | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [materialForm, setMaterialForm] = useState({
    codigo: "", material: "", categoria: "Oro", unidad: "g", stock: "", minimo: "",
    lote: "", ubicacion: "", proveedor: "", costo_unitario: "",
  });
  const [movimientoForm, setMovimientoForm] = useState({
    material_id: "", tipo: "entrada", cantidad: "", motivo: "", referencia_externa: "",
  });
  const [joyaForm, setJoyaForm] = useState({
    nombre: "", metal: "", ley: "", peso: "", talla: "", piedras: "", cantidad: "1", estado: "disponible",
  });

  async function cargar() {
    if (!sedeId) return;
    setCargando(true);
    const [a, b, c] = await Promise.all([
      supabase.from("inventario").select("*").eq("sede_id", sedeId).order("material"),
      supabase.from("inventario_movimientos")
        .select("id,material_id,tipo,cantidad,stock_anterior,stock_posterior,motivo,referencia_externa,pedido_id,created_at,inventario(material,unidad)")
        .order("created_at", { ascending: false }).limit(100),
      supabase.from("inventario_joyas")
        .select("id,codigo,nombre,metal,ley,peso,talla,piedras,cantidad,estado")
        .eq("sede_id", sedeId).order("nombre"),
    ]);
    if (a.error) toast.error(a.error.message);
    if (b.error) toast.error(b.error.message);
    if (c.error) toast.error(c.error.message);
    setMateriales((a.data ?? []) as Material[]);
    setMovimientos((b.data ?? []) as unknown as Movimiento[]);

    const joyasCargadas = (c.data ?? []) as Joya[];
    const normalizadas = normalizarCodigosJoyas(joyasCargadas, sesion?.sede?.nombre);

    if (normalizadas.cambios.length > 0) {
      const resultados = await Promise.all(
        normalizadas.cambios.map(({ id, codigo }) =>
          supabase.from("inventario_joyas").update({ codigo }).eq("id", id).eq("sede_id", sedeId),
        ),
      );
      if (resultados.some((resultado) => resultado.error)) {
        toast.error("No se pudieron actualizar algunos códigos de joyas.");
      }
    }

    setJoyas(normalizadas.joyas);
    setCargando(false);
  }

  useEffect(() => { void cargar(); }, [sedeId]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return materiales.filter((m) => {
      const texto = [m.codigo, m.material, m.categoria, m.lote, m.ubicacion, m.proveedor].join(" ").toLowerCase();
      return (!q || texto.includes(q)) && (categoria === "Todas" || m.categoria === categoria);
    });
  }, [materiales, busqueda, categoria]);

  const activos = materiales.filter((m) => m.activo);
  const bajos = activos.filter((m) => m.stock <= m.minimo);
  const valor = activos.reduce((s, m) => s + Number(m.stock) * Number(m.costo_unitario), 0);
  const movimientosVisibles = useMemo(() => {
    const q = movBusqueda.trim().toLowerCase();
    return movimientos.filter((m) => {
      const material = m.inventario?.material ?? "";
      return (!q || [material, m.motivo, m.referencia_externa, m.pedido_id ?? ""].join(" ").toLowerCase().includes(q))
        && (movTipo === "Todos" || m.tipo === movTipo)
        && (movMaterial === "Todos" || m.material_id === movMaterial);
    });
  }, [movimientos, movBusqueda, movTipo, movMaterial]);

  function nuevoMaterial() {
    setEditando(null);
    setMaterialForm({ codigo: "", material: "", categoria: "Oro", unidad: "g", stock: "", minimo: "", lote: "", ubicacion: "", proveedor: "", costo_unitario: "" });
    setModal("material");
  }

  function editarMaterial(m: Material) {
    setEditando(m);
    setMaterialForm({
      codigo: m.codigo, material: m.material, categoria: m.categoria, unidad: m.unidad,
      stock: String(m.stock), minimo: String(m.minimo), lote: m.lote, ubicacion: m.ubicacion,
      proveedor: m.proveedor, costo_unitario: String(m.costo_unitario),
    });
    setModal("material");
  }

  async function guardarMaterial(e: FormEvent) {
    e.preventDefault();
    if (!sedeId || !materialForm.material.trim()) return;
    setGuardando(true);

    const payload = {
      sede_id: sedeId,
      codigo: materialForm.codigo.trim(),
      material: materialForm.material.trim(),
      categoria: materialForm.categoria,
      unidad: materialForm.unidad.trim() || "g",
      minimo: Number(materialForm.minimo) || 0,
      lote: materialForm.lote.trim(),
      ubicacion: materialForm.ubicacion.trim(),
      proveedor: materialForm.proveedor.trim(),
      costo_unitario: Number(materialForm.costo_unitario) || 0,
    };

    if (editando) {
      const r = await supabase.from("inventario").update(payload).eq("id", editando.id);
      if (r.error) toast.error(r.error.message);
      else {
        toast.success("Material actualizado");
        setModal(null);
        await cargar();
      }
      setGuardando(false);
      return;
    }

    const r = await supabase.from("inventario").insert(payload).select("id").single();
    if (r.error || !r.data) {
      toast.error(r.error?.message ?? "No se pudo crear el material");
      setGuardando(false);
      return;
    }

    const stockInicial = Number(materialForm.stock) || 0;
    if (stockInicial > 0) {
      const movimiento = await supabase.from("inventario_movimientos").insert({
        material_id: r.data.id,
        tipo: "entrada",
        cantidad: stockInicial,
        motivo: "Stock inicial",
        referencia_externa: "",
      });

      if (movimiento.error) {
        await supabase.from("inventario").delete().eq("id", r.data.id);
        toast.error(`No se pudo registrar el stock inicial: ${movimiento.error.message}`);
        setGuardando(false);
        return;
      }
    }

    toast.success(stockInicial > 0 ? "Material creado y stock inicial registrado" : "Material creado");
    setModal(null);
    await cargar();
    setGuardando(false);
  }

  async function borrarMaterial(m: Material) {
    if (!esAdmin || !window.confirm(`¿Eliminar “${m.material}”? Esta acción solo será posible si no tiene movimientos.`)) return;
    const r = await supabase.from("inventario").delete().eq("id", m.id);
    if (r.error) toast.error(r.error.message); else { toast.success("Material eliminado"); await cargar(); }
  }

  async function guardarMovimiento(e: FormEvent) {
    e.preventDefault();
    const cantidad = Number(movimientoForm.cantidad);
    const motivo = movimientoForm.motivo.trim();
    if (!movimientoForm.material_id) {
      toast.error("Selecciona un material");
      return;
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      toast.error("La cantidad debe ser mayor que cero");
      return;
    }
    if (!motivo) {
      toast.error("El motivo del movimiento es obligatorio");
      return;
    }
    setGuardando(true);
    const r = await supabase.from("inventario_movimientos").insert({
      material_id: movimientoForm.material_id, tipo: movimientoForm.tipo,
      cantidad, motivo,
      referencia_externa: movimientoForm.referencia_externa.trim(),
    });
    if (r.error) toast.error(r.error.message);
    else { toast.success("Movimiento registrado y stock actualizado"); setModal(null); await cargar(); }
    setGuardando(false);
  }

  async function guardarJoya(e: FormEvent) {
    e.preventDefault();
    if (!sedeId || !joyaForm.nombre.trim()) return;
    setGuardando(true);
    const codigoNuevo = siguienteCodigoJoya(sesion.sede?.nombre, joyas);
    const r = await supabase.from("inventario_joyas").insert({
      sede_id: sedeId, codigo: codigoNuevo, nombre: joyaForm.nombre.trim(),
      metal: joyaForm.metal.trim(), ley: joyaForm.ley.trim(),
      peso: joyaForm.peso ? Number(joyaForm.peso) : null, talla: joyaForm.talla.trim(),
      piedras: joyaForm.piedras.trim(), cantidad: Number(joyaForm.cantidad) || 1,
      estado: joyaForm.estado, origen: "app",
    }).select("id,codigo").single();
    if (r.error) toast.error(r.error.message);
    else {
      toast.success(r.data?.codigo ? `Joya creada · ${r.data.codigo}` : "Joya agregada");
      await cargar();
      setModal(null);
    }
    setGuardando(false);
  }

  async function cambiarEstado(id: string, estado: string) {
    const r = await supabase.from("inventario_joyas").update({ estado }).eq("id", id);
    if (r.error) toast.error(r.error.message); else await cargar();
  }

  if (!sesion) return null;

  return (
    <AppShell
      titulo="Inventario"
      subtitulo="Control profesional de materiales, trazabilidad y joyas terminadas."
      acciones={
        <div className="flex flex-wrap items-stretch gap-3">
          <FichaDorada indicador="Catálogo" titulo="Materiales" valor={activos.length} descripcion="Insumos activos" disabled icono={<Boxes className="size-5" strokeWidth={1.7} />} />
          <FichaDorada indicador="Atención" titulo="Stock bajo" valor={bajos.length} descripcion={bajos.length ? "Requieren revisión" : "Todo estable"} disabled icono={<CircleAlert className="size-5" strokeWidth={1.7} />} />
          <FichaDorada indicador="Valorización" titulo="Stock" valor={money(valor)} descripcion="Costo registrado" disabled icono={<Package className="size-5" strokeWidth={1.7} />} />
          <button type="button" onClick={nuevoMaterial} className="group relative min-h-[150px] min-w-[170px] overflow-visible rounded-2xl border border-gold/25 bg-card p-5 text-left text-foreground shadow-[0_18px_45px_-28px_hsl(var(--gold)/0.28)] transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_24px_50px_-24px_hsl(var(--gold)/0.38)]">
            <span className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-gold/10 blur-2xl" />
            <span className="relative flex h-full flex-col justify-between">
              <span className="grid size-10 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold"><Plus className="size-5" /></span>
              <span><span className="block text-[10px] font-semibold uppercase tracking-[.18em] text-gold/80">Acción</span><span className="mt-1 block text-lg font-semibold">Nuevo material</span></span>
            </span>
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <nav className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-gold/15 bg-card p-2 shadow-[0_14px_40px_-32px_hsl(var(--gold)/.4)]">
          <Tab active={tab === "resumen"} onClick={() => setTab("resumen")} icon={<Boxes className="size-4" />} label="Resumen" />
          <Tab active={tab === "materiales"} onClick={() => setTab("materiales")} icon={<Package className="size-4" />} label="Materiales" badge={activos.length} />
          <Tab active={tab === "movimientos"} onClick={() => setTab("movimientos")} icon={<History className="size-4" />} label="Movimientos" badge={movimientos.length} />
          <Tab active={tab === "joyas"} onClick={() => setTab("joyas")} icon={<Gem className="size-4" />} label="Joyas terminadas" badge={joyas.length} />
          <span className="ml-auto hidden items-center gap-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground sm:flex"><MapPin className="size-3.5 text-gold" />{sesion.sede?.nombre ?? "Sede"}</span>
        </nav>

        {tab === "resumen" ? (
          <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
            <section className="rounded-2xl border border-gold/15 bg-card p-6 shadow-[0_18px_50px_-35px_rgba(0,0,0,.25)]">
              <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-gold/80">Centro de control</p>
              <h2 className="mt-1 text-xl font-semibold">Estado del inventario</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Una vista limpia para controlar existencias, reposición y trazabilidad sin mezclar el inventario nuevo con el sistema anterior.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <MiniCard label="Materiales activos" value={activos.length} onClick={() => setTab("materiales")} />
                <MiniCard label="Stock bajo" value={bajos.length} warning={bajos.length > 0} onClick={() => setTab("materiales")} />
                <MiniCard label="Joyas terminadas" value={joyas.length} onClick={() => setTab("joyas")} />
              </div>
              <div className="mt-5 rounded-2xl border border-gold/10 bg-gold/[.025] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Valor estimado de materiales</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums">{money(valor)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Stock actual × costo unitario registrado.</p>
              </div>
              <div className="mt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">Acciones rápidas</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <button type="button" onClick={nuevoMaterial} className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-3 text-left transition hover:-translate-y-0.5 hover:border-gold/30 hover:bg-gold/[.03]">
                    <span className="grid size-9 place-items-center rounded-lg bg-gold/[.08] text-gold"><Plus className="size-4" /></span>
                    <span><span className="block text-xs font-semibold">Nuevo material</span><span className="text-[10px] text-muted-foreground">Crear ficha</span></span>
                  </button>
                  <button type="button" onClick={() => { setMovimientoForm({ material_id: "", tipo: "entrada", cantidad: "", motivo: "", referencia_externa: "" }); setModal("movimiento"); }} className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-3 text-left transition hover:-translate-y-0.5 hover:border-gold/30 hover:bg-gold/[.03]">
                    <span className="grid size-9 place-items-center rounded-lg bg-gold/[.08] text-gold"><ArrowDownLeft className="size-4" /></span>
                    <span><span className="block text-xs font-semibold">Registrar entrada</span><span className="text-[10px] text-muted-foreground">Actualizar stock</span></span>
                  </button>
                  <button type="button" onClick={() => setTab("movimientos")} className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-3 text-left transition hover:-translate-y-0.5 hover:border-gold/30 hover:bg-gold/[.03]">
                    <span className="grid size-9 place-items-center rounded-lg bg-gold/[.08] text-gold"><History className="size-4" /></span>
                    <span><span className="block text-xs font-semibold">Ver kardex</span><span className="text-[10px] text-muted-foreground">Trazabilidad</span></span>
                  </button>
                </div>
              </div>
            </section>
            <section className="rounded-2xl border border-gold/15 bg-card p-6 shadow-[0_18px_50px_-35px_rgba(0,0,0,.25)]">
              <div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-gold/80">Kardex</p><h2 className="mt-1 text-lg font-semibold">Actividad reciente</h2></div><History className="size-5 text-gold/60" /></div>
              <div className="mt-4 divide-y divide-border">
                {movimientos.slice(0, 6).map((m) => (
                  <div key={m.id} className="flex items-center gap-3 py-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gold/[.05] text-gold">{positive(m.tipo) ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}</span>
                    <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{m.inventario?.material ?? "Material"}</p><p className="text-[10px] text-muted-foreground">{labelTipo(m.tipo)} · {new Date(m.created_at).toLocaleDateString("es-PE")}</p></div>
                    <span className="text-xs font-semibold tabular-nums">{num(m.cantidad)} {m.inventario?.unidad ?? ""}</span>
                  </div>
                ))}
                {movimientos.length === 0 ? <p className="py-12 text-center text-xs text-muted-foreground">Aún no hay movimientos registrados.</p> : null}
              </div>
              <button type="button" onClick={() => setTab("movimientos")} className="mt-3 w-full rounded-xl border border-border px-3 py-2.5 text-xs font-medium transition hover:border-gold/30 hover:bg-gold/[.03]">Ver kardex completo</button>
              {bajos.length > 0 ? <button type="button" onClick={() => setTab("materiales")} className="mt-2 w-full rounded-xl border border-warning/20 bg-warning-soft px-3 py-2.5 text-left text-xs font-medium text-warning transition hover:border-warning/35">⚠ {bajos.length} material{bajos.length === 1 ? "" : "es"} con stock igual o inferior al mínimo</button> : null}
            </section>
          </div>
        ) : null}

        {tab === "materiales" ? (
          <section className="overflow-hidden rounded-2xl border border-gold/15 bg-card shadow-[0_18px_50px_-35px_rgba(0,0,0,.25)]">
            <div className="border-b border-border p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                <div className="flex-1"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-gold/80">Catálogo</p><h2 className="mt-1 text-lg font-semibold">Materiales del taller</h2><p className="mt-1 text-xs text-muted-foreground">Oro, plata, piedras, resina, soldadura, herramientas y otros insumos.</p></div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="relative min-w-[260px]"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar material, código, lote..." className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/15" /></label>
                  <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/40">{["Todas", ...CATEGORIAS].map((c) => <option key={c}>{c}</option>)}</select>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">
                <thead><tr className="border-b border-border bg-gold/[.02]">{["Material", "Código", "Stock", "Mínimo", "Ubicación", "Proveedor", "Estado", ""].map((h) => <th key={h} className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-border">
                  {cargando ? <tr><td colSpan={8} className="px-5 py-14 text-center text-sm text-muted-foreground">Cargando inventario nuevo…</td></tr> : visibles.length === 0 ? <tr><td colSpan={8} className="px-5 py-16 text-center"><Boxes className="mx-auto size-7 text-gold/45" /><p className="mt-3 text-sm font-medium">Todavía no hay materiales</p><p className="mt-1 text-xs text-muted-foreground">El inventario está limpio. Registra el primer material del taller.</p></td></tr> : visibles.map((m) => {
                    const bajo = m.activo && m.stock <= m.minimo;
                    return <tr key={m.id} className="group transition-colors hover:bg-gold/[.02]">
                      <td className="px-5 py-4"><p className="text-sm font-semibold">{m.material}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{m.categoria} · {m.lote || "Sin lote"}</p></td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{m.codigo || "—"}</td>
                      <td className="px-5 py-4 text-sm font-semibold tabular-nums">{num(m.stock)} <span className="text-[10px] font-normal text-muted-foreground">{m.unidad}</span></td>
                      <td className="px-5 py-4 text-xs tabular-nums text-muted-foreground">{num(m.minimo)} {m.unidad}</td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{m.ubicacion || "—"}</td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{m.proveedor || "—"}</td>
                      <td className="px-5 py-4">{bajo ? <Badge text="Stock bajo" warning /> : <Badge text={m.activo ? "Activo" : "Inactivo"} />}</td>
                      <td className="px-5 py-4"><div className="flex justify-end gap-1"><button type="button" onClick={() => editarMaterial(m)} className="grid size-8 place-items-center rounded-lg border border-border transition hover:border-gold/30 hover:bg-gold/[.03] hover:text-gold" title="Editar"><Pencil className="size-3.5" /></button><button type="button" disabled={!esAdmin} onClick={() => void borrarMaterial(m)} className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition hover:border-danger/25 hover:text-danger disabled:opacity-30" title="Eliminar"><Trash2 className="size-3.5" /></button></div></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {tab === "movimientos" ? (
          <section className="overflow-hidden rounded-2xl border border-gold/15 bg-card shadow-[0_18px_50px_-35px_rgba(0,0,0,.25)]">
            <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center">
              <div className="flex-1"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-gold/80">Kardex</p><h2 className="mt-1 text-lg font-semibold">Movimientos de inventario</h2><p className="mt-1 text-xs text-muted-foreground">Cada movimiento actualiza el stock de forma atómica.</p></div>
              {puedeMover ? <button type="button" onClick={() => { setMovimientoForm({ material_id: "", tipo: "entrada", cantidad: "", motivo: "", referencia_externa: "" }); setModal("movimiento"); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gold/25 bg-card px-4 py-2.5 text-xs font-semibold hover:bg-gold/[.03]"><Plus className="size-4 text-gold" /> Registrar movimiento</button> : null}
            </div>
            <div className="grid gap-2 border-b border-border bg-gold/[.015] p-4 md:grid-cols-[1.4fr_.8fr_.9fr]">
              <label className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={movBusqueda} onChange={(e) => setMovBusqueda(e.target.value)} placeholder="Buscar material, motivo, pedido o referencia..." className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/15" /></label>
              <select value={movTipo} onChange={(e) => setMovTipo(e.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/40">
                <option value="Todos">Todos los movimientos</option>{TIPOS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select value={movMaterial} onChange={(e) => setMovMaterial(e.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/40">
                <option value="Todos">Todos los materiales</option>{materiales.filter((m) => m.activo).map((m) => <option key={m.id} value={m.id}>{m.material}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-[10px] text-muted-foreground">
              <span>Mostrando {movimientosVisibles.length} de {movimientos.length} movimientos cargados</span>
              {(movBusqueda || movTipo !== "Todos" || movMaterial !== "Todos") ? <button type="button" onClick={() => { setMovBusqueda(""); setMovTipo("Todos"); setMovMaterial("Todos"); }} className="font-semibold text-gold hover:underline">Limpiar filtros</button> : null}
            </div>
            <TableWrap><table className="w-full min-w-[1120px] text-left"><thead><tr className="border-b border-border bg-gold/[.02]">{["Fecha", "Material", "Tipo", "Cantidad", "Stock anterior", "Stock resultante", "Pedido", "Motivo", "Referencia"].map((h) => <th key={h} className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>)}</tr></thead><tbody className="divide-y divide-border">
              {movimientosVisibles.length === 0 ? <tr><td colSpan={9} className="px-5 py-16 text-center text-sm text-muted-foreground">{movimientos.length === 0 ? "Todavía no hay movimientos." : "No hay movimientos que coincidan con los filtros."}</td></tr> : movimientosVisibles.map((m) => <tr key={m.id} className="transition-colors hover:bg-gold/[.02]"><td className="px-5 py-4 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</td><td className="px-5 py-4 text-sm font-medium">{m.inventario?.material ?? "Material"}</td><td className="px-5 py-4"><Badge text={labelTipo(m.tipo)} warning={!positive(m.tipo)} /></td><td className="px-5 py-4 text-sm font-semibold tabular-nums">{positive(m.tipo) ? "+" : "−"}{num(m.cantidad)} {m.inventario?.unidad ?? ""}</td><td className="px-5 py-4 text-xs tabular-nums text-muted-foreground">{m.stock_anterior == null ? "—" : num(m.stock_anterior)} {m.inventario?.unidad ?? ""}</td><td className="px-5 py-4 text-xs font-semibold tabular-nums">{m.stock_posterior == null ? "—" : num(m.stock_posterior)} {m.inventario?.unidad ?? ""}</td><td className="px-5 py-4">{m.pedido_id ? <Link to="/pedidos/$id" params={{ id: m.pedido_id }} search={{ from: undefined }} className="inline-flex items-center rounded-lg border border-gold/20 bg-gold/[.04] px-2.5 py-1.5 text-[10px] font-semibold text-gold transition hover:border-gold/40 hover:bg-gold/[.08]">Pedido · {m.pedido_id.slice(0, 8).toUpperCase()}</Link> : <span className="text-xs text-muted-foreground">Sin pedido</span>}</td><td className="px-5 py-4 text-xs text-muted-foreground">{m.motivo || "—"}</td><td className="px-5 py-4 text-xs text-muted-foreground">{m.referencia_externa || "—"}</td></tr>)}
            </tbody></table></TableWrap>
          </section>
        ) : null}

        {tab === "joyas" ? (
          <section className="overflow-hidden rounded-2xl border border-gold/15 bg-card shadow-[0_18px_50px_-35px_rgba(0,0,0,.25)]">
            <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center"><div className="flex-1"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-gold/80">Stock terminado</p><h2 className="mt-1 text-lg font-semibold">Joyas terminadas</h2><p className="mt-1 text-xs text-muted-foreground">Piezas terminadas separadas del inventario de insumos.</p></div>{esAdmin ? <button type="button" onClick={() => { setJoyaForm({ nombre: "", metal: "", ley: "", peso: "", talla: "", piedras: "", cantidad: "1", estado: "disponible" }); setModal("joya"); }} className="inline-flex items-center gap-2 rounded-xl border border-gold/25 bg-card px-4 py-2.5 text-xs font-semibold hover:bg-gold/[.03]"><Plus className="size-4 text-gold" /> Nueva joya</button> : null}</div>
            <TableWrap><table className="w-full min-w-[900px] text-left"><thead><tr className="border-b border-border bg-gold/[.02]">{["Código", "Joya", "Metal / ley", "Peso", "Talla", "Piedras", "Cantidad", "Estado"].map((h) => <th key={h} className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>)}</tr></thead><tbody className="divide-y divide-border">
              {joyas.length === 0 ? <tr><td colSpan={8} className="px-5 py-16 text-center"><Gem className="mx-auto size-7 text-gold/45" /><p className="mt-3 text-sm font-medium">Sin joyas terminadas</p><p className="mt-1 text-xs text-muted-foreground">Este inventario parte completamente limpio.</p></td></tr> : joyas.map((j) => <tr key={j.id} className="transition-colors hover:bg-gold/[.02]"><td className="px-5 py-4"><span className="inline-flex items-center rounded-lg border border-gold/25 bg-gold/[.06] px-2.5 py-1.5 font-mono text-[11px] font-bold tracking-wide text-gold">{j.codigo || "Sin código"}</span></td><td className="px-5 py-4 text-sm font-medium">{j.nombre}</td><td className="px-5 py-4 text-xs text-muted-foreground">{[j.metal, j.ley].filter(Boolean).join(" · ") || "—"}</td><td className="px-5 py-4 text-xs">{j.peso == null ? "—" : num(j.peso) + " g"}</td><td className="px-5 py-4 text-xs">{j.talla || "—"}</td><td className="px-5 py-4 text-xs text-muted-foreground">{j.piedras || "—"}</td><td className="px-5 py-4 text-sm font-semibold tabular-nums">{num(j.cantidad)}</td><td className="px-5 py-4"><select disabled={!esAdmin} value={j.estado} onChange={(e) => void cambiarEstado(j.id, e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1 text-[10px] uppercase"><option value="disponible">Disponible</option><option value="reservada">Reservada</option><option value="vendida">Vendida</option><option value="en_produccion">En producción</option><option value="apartada">Apartada</option><option value="otro">Otro</option></select></td></tr>)}
            </tbody></table></TableWrap>
          </section>
        ) : null}
      </div>

      {modal ? <Modal title={modal === "material" ? (editando ? "Editar material" : "Nuevo material") : modal === "movimiento" ? "Registrar movimiento" : "Nueva joya"} onClose={() => setModal(null)}>
        {modal === "material" ? <form onSubmit={guardarMaterial} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Material" value={materialForm.material} onChange={(v) => setMaterialForm({ ...materialForm, material: v })} required /><Field label="Código" value={materialForm.codigo} onChange={(v) => setMaterialForm({ ...materialForm, codigo: v })} /></div>
          <div className="grid gap-3 sm:grid-cols-3"><Field label="Categoría" value={materialForm.categoria} onChange={(v) => setMaterialForm({ ...materialForm, categoria: v })} select options={CATEGORIAS} /><Field label="Unidad" value={materialForm.unidad} onChange={(v) => setMaterialForm({ ...materialForm, unidad: v })} /><Field label="Costo unitario" value={materialForm.costo_unitario} onChange={(v) => setMaterialForm({ ...materialForm, costo_unitario: v })} type="number" /></div>
          <div className={editando ? "grid gap-3" : "grid gap-3 sm:grid-cols-2"}>
            {!editando ? <Field label="Stock inicial (entrada)" value={materialForm.stock} onChange={(v) => setMaterialForm({ ...materialForm, stock: v })} type="number" /> : null}
            <Field label="Stock mínimo" value={materialForm.minimo} onChange={(v) => setMaterialForm({ ...materialForm, minimo: v })} type="number" />
          </div>
          {!editando ? <p className="rounded-xl border border-gold/10 bg-gold/[.025] px-3 py-2.5 text-[11px] leading-5 text-muted-foreground">El stock inicial se registra automáticamente como una entrada en el kardex. El stock actual no se edita directamente.</p> : <p className="rounded-xl border border-gold/10 bg-gold/[.025] px-3 py-2.5 text-[11px] leading-5 text-muted-foreground">El stock actual no se edita desde la ficha. Para cambiarlo, registra un movimiento en el kardex.</p>}
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Lote" value={materialForm.lote} onChange={(v) => setMaterialForm({ ...materialForm, lote: v })} /><Field label="Ubicación" value={materialForm.ubicacion} onChange={(v) => setMaterialForm({ ...materialForm, ubicacion: v })} /></div>
          <Field label="Proveedor" value={materialForm.proveedor} onChange={(v) => setMaterialForm({ ...materialForm, proveedor: v })} />
          <Actions saving={guardando} cancel={() => setModal(null)} />
        </form> : null}
        {modal === "movimiento" ? <form onSubmit={guardarMovimiento} className="space-y-4">
          <Field label="Material" value={movimientoForm.material_id} onChange={(v) => setMovimientoForm({ ...movimientoForm, material_id: v })} select options={materiales.filter((m) => m.activo).map((m) => m.material)} optionValues={materiales.filter((m) => m.activo).map((m) => m.id)} />
          <Field label="Tipo de movimiento" value={movimientoForm.tipo} onChange={(v) => setMovimientoForm({ ...movimientoForm, tipo: v })} select options={TIPOS.map((t) => t[1])} optionValues={TIPOS.map((t) => t[0])} />
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Cantidad" value={movimientoForm.cantidad} onChange={(v) => setMovimientoForm({ ...movimientoForm, cantidad: v })} type="number" /><Field label="Referencia" value={movimientoForm.referencia_externa} onChange={(v) => setMovimientoForm({ ...movimientoForm, referencia_externa: v })} /></div>
          <Field label="Motivo / detalle" value={movimientoForm.motivo} onChange={(v) => setMovimientoForm({ ...movimientoForm, motivo: v })} required />
          <p className="rounded-xl border border-gold/10 bg-gold/[.025] px-3 py-2.5 text-[11px] leading-5 text-muted-foreground">El stock se actualiza en la base de datos y nunca puede quedar negativo. El motivo queda en el historial para auditoría.</p>
          <Actions saving={guardando} cancel={() => setModal(null)} />
        </form> : null}
        {modal === "joya" ? <form onSubmit={guardarJoya} className="space-y-4">
          <p className="rounded-xl border border-gold/10 bg-gold/[.02] px-3.5 py-2.5 text-[11px] leading-5 text-muted-foreground">El sistema asignará automáticamente el código único de esta joya al guardarla.</p>
          <Field label="Nombre de pieza" value={joyaForm.nombre} onChange={(v) => setJoyaForm({ ...joyaForm, nombre: v })} required />
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Metal" value={joyaForm.metal} onChange={(v) => setJoyaForm({ ...joyaForm, metal: v })} /><Field label="Ley" value={joyaForm.ley} onChange={(v) => setJoyaForm({ ...joyaForm, ley: v })} /></div>
          <div className="grid gap-3 sm:grid-cols-3"><Field label="Peso (g)" value={joyaForm.peso} onChange={(v) => setJoyaForm({ ...joyaForm, peso: v })} type="number" step="0.001" inputMode="decimal" /><Field label="Talla" value={joyaForm.talla} onChange={(v) => setJoyaForm({ ...joyaForm, talla: v })} /><Field label="Cantidad" value={joyaForm.cantidad} onChange={(v) => setJoyaForm({ ...joyaForm, cantidad: v })} type="number" step="1" inputMode="numeric" /></div>
          <Field label="Piedras" value={joyaForm.piedras} onChange={(v) => setJoyaForm({ ...joyaForm, piedras: v })} />
          <Field label="Estado" value={joyaForm.estado} onChange={(v) => setJoyaForm({ ...joyaForm, estado: v })} select options={["disponible", "reservada", "vendida", "en_produccion", "apartada", "otro"]} />
          <Actions saving={guardando} cancel={() => setModal(null)} />
        </form> : null}
      </Modal> : null}
    </AppShell>
  );
}

function Tab({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: ReactNode; label: string; badge?: number }) {
  return <button type="button" onClick={onClick} className={active ? "inline-flex items-center gap-2 rounded-xl bg-gold/[.10] px-3.5 py-2.5 text-xs font-semibold text-foreground ring-1 ring-gold/20" : "inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-medium text-muted-foreground transition hover:bg-gold/[.04] hover:text-foreground"}>{icon}{label}{badge !== undefined ? <span className="rounded-full bg-background px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-muted-foreground ring-1 ring-border">{badge}</span> : null}</button>;
}

function MiniCard({ label, value, onClick, warning = false }: { label: string; value: number; onClick: () => void; warning?: boolean }) {
  return <button type="button" onClick={onClick} className="rounded-2xl border border-border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-gold/30 hover:shadow-[0_16px_34px_-26px_hsl(var(--gold)/.55)]"><p className={warning ? "text-danger" : "text-gold"}><span className="text-2xl font-semibold tabular-nums">{value}</span></p><p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p></button>;
}

function Badge({ text, warning = false }: { text: string; warning?: boolean }) {
  return <span className={warning ? "rounded-full border border-warning/20 bg-warning-soft px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-warning" : "rounded-full border border-gold/15 bg-gold/[.035] px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"}>{text}</span>;
}

function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/10 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
    <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gold/15 bg-card shadow-[0_30px_80px_-35px_hsl(var(--gold)/.35)]">
      <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-gold/75">Inventario nuevo</p><h2 className="mt-1 text-lg font-semibold">{title}</h2></div><button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl border border-border hover:border-gold/30 hover:text-gold"><X className="size-4" /></button></div>
      <div className="p-5">{children}</div>
    </div>
  </div>;
}

function Actions({ saving, cancel }: { saving: boolean; cancel: () => void }) {
  return <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={cancel} className="rounded-xl border border-border px-4 py-2.5 text-xs transition hover:border-gold/30 hover:bg-gold/[.03]">Cancelar</button><button type="submit" disabled={saving} className="rounded-xl border border-gold/25 bg-gold/[.08] px-4 py-2.5 text-xs font-semibold transition hover:bg-gold/[.12] disabled:opacity-50">{saving ? "Guardando…" : "Guardar"}</button></div>;
}

function Field({ label, value, onChange, type = "text", required = false, select = false, options = [], optionValues = [], step, inputMode }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; select?: boolean; options?: string[]; optionValues?: string[]; step?: string; inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search" }) {
  const cls = "mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/15";
  return <label className="block text-xs font-medium">{label}{select ? <select required={required} value={value} onChange={(e) => onChange(e.target.value)} className={cls}>{options.map((o, i) => <option key={o} value={optionValues[i] ?? o}>{o}</option>)}</select> : <input required={required} min={type === "number" ? 0 : undefined} step={type === "number" ? step ?? "any" : undefined} inputMode={inputMode} type={type} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />}</label>;
}

function prefijoSede(nombreSede: string | null | undefined) {
  return (
    (nombreSede ?? "Sede").trim().slice(0, 3).replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "SED"
  );
}

function numeroCodigo(codigo: string, prefijo: string) {
  const inicio = `J-${prefijo}-`;
  if (!codigo.startsWith(inicio)) return null;
  const parte = codigo.slice(inicio.length);
  if (parte.length !== 3 || [...parte].some((caracter) => caracter < "0" || caracter > "9")) return null;
  return Number(parte);
}

function siguienteCodigoJoya(nombreSede: string | null | undefined, joyas: Joya[]) {
  const prefijo = prefijoSede(nombreSede);
  const usados = new Set(
    joyas
      .map((j) => numeroCodigo(j.codigo?.trim() ?? "", prefijo))
      .filter((numero): numero is number => numero !== null),
  );

  let siguiente = 1;
  while (usados.has(siguiente)) siguiente += 1;
  return `J-${prefijo}-${String(siguiente).padStart(3, "0")}`;
}

function normalizarCodigosJoyas(joyas: Joya[], nombreSede: string | null | undefined) {
  const prefijo = prefijoSede(nombreSede);
  const usados = new Set(
    joyas
      .map((j) => numeroCodigo(j.codigo?.trim() ?? "", prefijo))
      .filter((numero): numero is number => numero !== null),
  );

  let siguiente = 1;
  const cambios: { id: string; codigo: string }[] = [];

  const resultado = joyas.map((joya) => {
    const codigo = joya.codigo?.trim() ?? "";
    const partesAntiguas = codigo.split("-");
    const esCodigoAntiguo = partesAntiguas.length === 4
      && partesAntiguas[0] === "JY"
      && partesAntiguas[2].length === 6
      && partesAntiguas[3].length === 8;

    if (codigo && !esCodigoAntiguo) return joya;

    while (usados.has(siguiente)) siguiente += 1;

    const nuevoCodigo = `J-${prefijo}-${String(siguiente).padStart(3, "0")}`;
    usados.add(siguiente);
    siguiente += 1;
    cambios.push({ id: joya.id, codigo: nuevoCodigo });

    return { ...joya, codigo: nuevoCodigo };
  });

  return { joyas: resultado, cambios };
}

function positive(tipo: string) {
  return ["entrada", "devolucion", "ajuste_positivo"].includes(tipo);
}
function labelTipo(tipo: string) {
  return TIPOS.find((t) => t[0] === tipo)?.[1] ?? tipo.replaceAll("_", " ");
}
function num(value: number) {
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 }).format(Number(value) || 0);
}
function money(value: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 2 }).format(Number(value) || 0);
}
