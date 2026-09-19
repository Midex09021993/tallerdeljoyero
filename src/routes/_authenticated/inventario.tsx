import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  ChevronRight,
  CircleDollarSign,
  FileSpreadsheet,
  Upload,
  Gem,
  History,
  Package,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Warehouse,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { AurumActionCard } from "@/components/AurumActionCard";
import { AREAS, useSesion } from "@/lib/auth";
import {
  CATEGORIAS_MATERIAL,
  useActualizarMaterial,
  useActualizarStock,
  useAsignarArea,
  useBorrarMaterial,
  useCrearMaterial,
  useInventario,
  useMovimientosInventario,
  useRegistrarMovimiento,
} from "@/lib/taller-db";

export const Route = createFileRoute("/_authenticated/inventario")({
  head: () => ({
    meta: [
      { title: "Inventario — Aurum Lab" },
      {
        name: "description",
        content: "Control profesional de materiales, consumos, movimientos y producción del taller joyero.",
      },
    ],
  }),
  component: InventarioPage,
});

const inputCls =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";

type Vista = "resumen" | "materiales" | "joyas" | "produccion" | "movimientos";


type Joya = { id: string; codigo: string; nombre: string; metal: string; ley: string; peso: number | null; talla: string; piedras: string; cantidad: number; estado: string; origen: string; metadata: Record<string, unknown> };
const excelAliases: Record<string, string[]> = { codigo: ["codigo","código","code","sku","ref","referencia"], nombre: ["nombre","joya","pieza","producto","descripcion","descripción"], metal: ["metal","material"], ley: ["ley","quilataje","karat","k"], peso: ["peso","peso g","peso_g","peso (g)"], talla: ["talla","talla us","size"], piedras: ["piedras","gemas","stones"], cantidad: ["cantidad","stock","existencia","qty"], estado: ["estado","status"] };
function normalizarExcelHeader(v: unknown) { return String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase(); }
function excelValue(row: Record<string, unknown>, key: string) { const found = Object.keys(row).find(k => (excelAliases[key] ?? []).includes(normalizarExcelHeader(k))); return found ? row[found] : ""; }
function numeroExcel(v: unknown) { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : null; }

type Proyecto = {
  id: string;
  codigo: string;
  nombre: string;
  estado: string;
  metal: string | null;
  ley: string | null;
  peso_estimado: number | null;
  talla: string | null;
  piedras: string | null;
  cantidad_piezas: number;
};

function InventarioPage() {
  const { data: sesion } = useSesion();
  const { data: inventario = [], isLoading } = useInventario();
  const { data: movimientos = [] } = useMovimientosInventario();
  const [vista, setVista] = useState<Vista>("resumen");
  const [buscar, setBuscar] = useState("");
  const [movimientoAbierto, setMovimientoAbierto] = useState(false);
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [joyas, setJoyas] = useState<Joya[]>([]);
  const [joyasCargando, setJoyasCargando] = useState(false);
  const [importarExcel, setImportarExcel] = useState(false);
  const [cargandoProduccion, setCargandoProduccion] = useState(false);

  const puedeGestionar = sesion?.esAdmin ?? false;
  const bajos = useMemo(() => inventario.filter((i) => i.stock < i.minimo), [inventario]);
  const categorias = useMemo(
    () => new Set(inventario.map((i) => i.categoria)).size,
    [inventario],
  );
  const movimientosHoy = useMemo(() => {
    const hoy = new Date().toDateString();
    return movimientos.filter((m) => new Date(m.created_at).toDateString() === hoy).length;
  }, [movimientos]);

  const materialesFiltrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    if (!q) return inventario;
    return inventario.filter(
      (m) =>
        m.material.toLowerCase().includes(q) ||
        m.categoria.toLowerCase().includes(q) ||
        m.areas.some((a) => a.toLowerCase().includes(q)),
    );
  }, [buscar, inventario]);

  async function abrirJoyas() {
    setVista("joyas");
    if (joyasCargando) return;
    setJoyasCargando(true);
    const { data, error } = await (supabase as any).from("inventario_joyas").select("id,codigo,nombre,metal,ley,peso,talla,piedras,cantidad,estado,origen,metadata").order("created_at", { ascending: false }).limit(500);
    setJoyasCargando(false);
    if (error) { toast.error("No se pudo cargar el stock de joyas"); return; }
    setJoyas((data ?? []) as Joya[]);
  }

  async function abrirProduccion() {
    setVista("produccion");
    if (proyectos.length > 0 || cargandoProduccion) return;
    setCargandoProduccion(true);
    const { data, error } = await supabase
      .from("proyectos_joya")
      .select("id,codigo,nombre,estado,metal,ley,peso_estimado,talla,piedras,cantidad_piezas")
      .order("updated_at", { ascending: false })
      .limit(50);
    setCargandoProduccion(false);
    if (error) {
      toast.error("No se pudo cargar la producción");
      return;
    }
    setProyectos((data ?? []) as Proyecto[]);
  }

  const nav = [
    { id: "resumen" as const, label: "Resumen", icon: Sparkles },
    { id: "materiales" as const, label: "Insumos", icon: Package },
    { id: "joyas" as const, label: "Joyas", icon: Gem },
    { id: "produccion" as const, label: "En producción", icon: Gem },
    { id: "movimientos" as const, label: "Movimientos", icon: History },
  ];

  return (
    <AppShell
      titulo="Inventario"
      subtitulo="El control silencioso que mantiene el taller bajo control."
      acciones={
        puedeGestionar ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMovimientoAbierto(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:border-primary/40"
            >
              <ArrowUpFromLine className="size-4" />
              Registrar movimiento
            </button>
            <button
              type="button"
              onClick={() => setImportarExcel(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:border-primary/40"
            >
              <Upload className="size-4" />
              Importar Excel
            </button>
            <button
              type="button"
              onClick={() => setNuevoAbierto(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              <Plus className="size-4" />
              Nuevo material
            </button>
          </div>
        ) : null
      }
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-surface-muted/60 p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                <Warehouse className="size-3.5" />
                Control de taller
              </div>
              <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
                Sabe qué tienes. <span className="text-muted-foreground">Y dónde se está usando.</span>
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Registra entradas, consumos y recuperaciones sin llevar cuentas a mano.
                El stock se actualiza con los movimientos del taller.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MiniStat icon={Boxes} label="Materiales" value={inventario.length} />
              <MiniStat icon={Gem} label="Categorías" value={categorias} />
              <MiniStat icon={AlertCircle} label="Stock bajo" value={bajos.length} danger />
              <MiniStat icon={History} label="Hoy" value={movimientosHoy} />
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-surface-muted p-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const activo = vista === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => item.id === "produccion" ? void abrirProduccion() : item.id === "joyas" ? void abrirJoyas() : setVista(item.id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${activo ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                  {item.id === "bajo" ? null : null}
                </button>
              );
            })}
          </div>
          {vista !== "resumen" && vista !== "produccion" ? (
            <div className="relative w-full lg:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className={`${inputCls} pl-9`}
                placeholder="Buscar material, categoría o área…"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
              />
            </div>
          ) : null}
        </div>

        {vista === "resumen" ? (
          <Resumen
            inventario={inventario}
            bajos={bajos}
            movimientos={movimientos}
            onMateriales={() => setVista("materiales")}
            onMovimientos={() => setVista("movimientos")}
            onProduccion={() => void abrirProduccion()}
            onNuevo={() => setNuevoAbierto(true)}
          />
        ) : null}

        {vista === "materiales" ? (
          <Materiales
            inventario={materialesFiltrados}
            puedeGestionar={puedeGestionar}
            sedeId={sesion?.perfil.sede_id ?? null}
          />
        ) : null}

        {vista === "joyas" ? <Joyas items={joyas} loading={joyasCargando} /> : null}

        {vista === "produccion" ? (
          <Produccion proyectos={proyectos} loading={cargandoProduccion} />
        ) : null}

        {vista === "movimientos" ? (
          <Movimientos
            inventario={inventario}
            areasUsuario={sesion?.areas ?? []}
            puedeTodo={puedeGestionar}
          />
        ) : null}
      </div>

      {nuevoAbierto ? (
        <NuevoMaterialDialog
          sedeId={sesion?.perfil.sede_id ?? null}
          onClose={() => setNuevoAbierto(false)}
        />
      ) : null}
      {importarExcel ? <ImportarExcel sedeId={sesion?.perfil.sede_id ?? null} onClose={() => setImportarExcel(false)} onDone={() => { setImportarExcel(false); void abrirJoyas(); }} /> : null}
      {movimientoAbierto ? (
        <MovimientoDialog
          inventario={inventario}
          areasUsuario={sesion?.areas ?? []}
          puedeTodo={puedeGestionar}
          onClose={() => setMovimientoAbierto(false)}
        />
      ) : null}
    </AppShell>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  danger = false,
}: {
  icon: typeof Boxes;
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/80 px-3 py-2.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className={`size-3.5 ${danger ? "text-danger" : ""}`} />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${danger ? "text-danger" : ""}`}>{value}</p>
    </div>
  );
}

type MaterialItem = ReturnType<typeof useInventario>["data"] extends (infer T)[] | undefined ? T : never;

function Resumen({
  inventario,
  bajos,
  movimientos,
  onMateriales,
  onMovimientos,
  onProduccion,
  onNuevo,
}: {
  inventario: MaterialItem[];
  bajos: MaterialItem[];
  movimientos: Awaited<ReturnType<typeof useMovimientosInventario>>["data"] extends (infer T)[] | undefined ? T[] : never;
  onMateriales: () => void;
  onMovimientos: () => void;
  onProduccion: () => void;
  onNuevo: () => void;
}) {
  const recientes = movimientos.slice(0, 5);
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AurumActionCard icon={Package} title="Materiales" text={`${inventario.length} insumos registrados`} action="Ver materiales" onClick={onMateriales} />
        <AurumActionCard icon={ArrowDownToLine} title="Registrar entrada" text="Oro, plata, piedras, resina, yeso…" action="Registrar" onClick={onNuevo} />
        <AurumActionCard icon={Gem} title="Producción" text="Piezas y proyectos en curso" action="Ver producción" onClick={onProduccion} />
        <AurumActionCard icon={History} title="Trazabilidad" text="Revisa qué entró y qué se consumió" action="Ver movimientos" onClick={onMovimientos} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <section className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <p className="text-sm font-semibold">Actividad reciente</p>
              <p className="text-xs text-muted-foreground">Últimos movimientos registrados</p>
            </div>
            <button type="button" onClick={onMovimientos} className="text-xs font-semibold text-primary">Ver todo</button>
          </div>
          <div className="divide-y divide-border">
            {recientes.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className={`grid size-9 place-items-center rounded-full ${m.tipo === "entrada" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
                  {m.tipo === "entrada" ? <ArrowDownToLine className="size-4" /> : <ArrowUpFromLine className="size-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.material}</p>
                  <p className="text-xs text-muted-foreground">{m.area || "Taller"} · {m.motivo || "Sin motivo indicado"}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums">{m.tipo === "entrada" ? "+" : "−"}{m.cantidad}</p>
              </div>
            ))}
            {recientes.length === 0 ? (
              <EmptyState icon={History} title="Todavía no hay movimientos" text="El primer ingreso o consumo aparecerá aquí." />
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <p className="text-sm font-semibold">Atención del taller</p>
            <p className="text-xs text-muted-foreground">Lo que requiere una acción</p>
          </div>
          <div className="p-5">
            {bajos.length > 0 ? (
              <div className="space-y-3">
                {bajos.slice(0, 5).map((m) => (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl bg-danger-soft/50 p-3">
                    <AlertCircle className="size-4 shrink-0 text-danger" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.material}</p>
                      <p className="text-xs text-muted-foreground">Mínimo {m.minimo} {m.unidad}</p>
                    </div>
                    <span className="text-sm font-bold text-danger">{m.stock} {m.unidad}</span>
                  </div>
                ))}
                <button type="button" onClick={onMateriales} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-danger">
                  Revisar stock bajo <ChevronRight className="size-3.5" />
                </button>
              </div>
            ) : (
              <EmptyState icon={Sparkles} title="Todo en orden" text="No hay materiales por debajo del mínimo." />
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function Materiales({
  inventario,
  puedeGestionar,
  sedeId,
}: {
  inventario: MaterialItem[];
  puedeGestionar: boolean;
  sedeId: string | null;
}) {
  const actualizarStock = useActualizarStock();
  const actualizarMaterial = useActualizarMaterial();
  const asignar = useAsignarArea();
  const borrar = useBorrarMaterial();
  const [abierto, setAbierto] = useState<string | null>(null);
  const [eliminar, setEliminar] = useState<MaterialItem | null>(null);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Materiales e insumos</p>
          <p className="text-xs text-muted-foreground">El stock se mueve mediante entradas y consumos.</p>
        </div>
        <span className="text-xs text-muted-foreground">{inventario.length} registros</span>
      </div>
      <div className="divide-y divide-border">
        {inventario.map((m) => {
          const bajo = m.stock < m.minimo;
          const activo = abierto === m.id;
          return (
            <div key={m.id}>
              <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-muted">
                    {m.categoria.toLowerCase().includes("pied") ? <Gem className="size-5" /> : <Package className="size-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{m.material}</p>
                    <p className="text-xs text-muted-foreground">{m.categoria} · {m.areas.length ? m.areas.join(" · ") : "Disponible para el taller"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:w-[360px]">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Disponible</p>
                    <p className={`mt-1 text-sm font-bold tabular-nums ${bajo ? "text-danger" : ""}`}>{m.stock} <span className="font-normal text-muted-foreground">{m.unidad}</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Mínimo</p>
                    <p className="mt-1 text-sm tabular-nums">{m.minimo} <span className="text-muted-foreground">{m.unidad}</span></p>
                  </div>
                  <div className="flex items-end justify-end">
                    <button type="button" onClick={() => setAbierto(activo ? null : m.id)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">
                      {activo ? "Cerrar" : "Gestionar"} <ChevronRight className={`size-3.5 transition ${activo ? "rotate-90" : ""}`} />
                    </button>
                  </div>
                </div>
              </div>
              {activo && puedeGestionar ? (
                <div className="bg-surface-muted/50 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {AREAS.map((area) => {
                      const on = m.areas.includes(area);
                      return (
                        <button key={area} type="button" onClick={() => asignar.mutate({ materialId: m.id, area, activo: !on })} className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${on ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>
                          {area}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                    <input type="number" step="0.01" defaultValue={m.stock} className={`${inputCls} max-w-36`} onBlur={(e) => { const stock = Number(e.target.value); if (stock !== m.stock) actualizarStock.mutate({ id: m.id, stock }); }} />
                    <input type="number" step="0.01" defaultValue={m.minimo} className={`${inputCls} max-w-32`} onBlur={(e) => { const minimo = Number(e.target.value); if (minimo !== m.minimo) actualizarMaterial.mutate({ id: m.id, cambios: { minimo } }); }} />
                    <button type="button" onClick={() => setEliminar(m)} className="ml-auto inline-flex items-center gap-1 rounded-xl border border-danger/30 px-3 py-2 text-xs font-semibold text-danger">
                      <Trash2 className="size-3.5" /> Eliminar
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
        {inventario.length === 0 ? <EmptyState icon={Package} title="Inventario vacío" text="Registra tu primer material y empieza a construir la trazabilidad del taller." /> : null}
      </div>
      {eliminar ? (
        <ConfirmDelete material={eliminar} pending={borrar.isPending} onCancel={() => setEliminar(null)} onConfirm={() => borrar.mutate(eliminar.id, { onSettled: () => setEliminar(null) })} />
      ) : null}
    </section>
  );
}


function Joyas({ items, loading }: { items: Joya[]; loading: boolean }) {
  const [buscar, setBuscar] = useState("");
  const filtradas = useMemo(() => { const q = buscar.trim().toLowerCase(); if (!q) return items; return items.filter(j => [j.codigo,j.nombre,j.metal,j.ley,j.talla,j.piedras].some(v => String(v ?? "").toLowerCase().includes(q))); }, [items,buscar]);
  return <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Joyas terminadas</p><p className="text-xs text-muted-foreground">Stock que ya existía en el taller y ahora puedes controlar aquí.</p></div><div className="flex items-center gap-3"><input className={inputCls + " max-w-xs"} placeholder="Buscar código, joya, metal…" value={buscar} onChange={e => setBuscar(e.target.value)} /><span className="text-xs text-muted-foreground">{filtradas.length} registros</span></div></div>{loading ? <EmptyState icon={Gem} title="Cargando joyas…" text="Estamos leyendo tu stock." /> : filtradas.length ? <div className="divide-y divide-border">{filtradas.map(j => <div key={j.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1.3fr_1fr_.6fr_.7fr] md:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{j.nombre}</p><span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold">{j.codigo}</span></div><p className="mt-1 text-xs text-muted-foreground">{[j.metal,j.ley,j.talla ? "Talla " + j.talla : "",j.piedras].filter(Boolean).join(" · ") || "Sin especificaciones"}</p></div><div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Peso</p><p className="text-sm font-semibold">{j.peso != null ? j.peso + " g" : "—"}</p></div><div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cantidad</p><p className="text-sm font-semibold">{j.cantidad}</p></div><div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Estado</p><p className="text-sm font-semibold">{j.estado}</p><p className="text-[10px] text-muted-foreground">Origen: {j.origen === "excel" ? "Excel" : "App"}</p></div></div>)}</div> : <div className="p-8"><div className="rounded-2xl border border-dashed border-border bg-surface-muted/30 p-8 text-center"><FileSpreadsheet className="mx-auto size-8 text-primary"/><p className="mt-3 text-sm font-semibold">¿Tu stock está en Excel?</p><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">No necesitas transcribirlo pieza por pieza. Usa “Importar Excel” para traer tu stock actual.</p></div></div>}</section>;
}

function Produccion({ proyectos, loading }: { proyectos: Proyecto[]; loading: boolean }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <p className="text-sm font-semibold">Proyectos de joya</p>
        <p className="text-xs text-muted-foreground">Base de la futura salida de producción hacia joyas terminadas.</p>
      </div>
      {loading ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Cargando producción…</div>
      ) : proyectos.length === 0 ? (
        <EmptyState icon={Gem} title="Todavía no hay proyectos" text="Cuando una joya entre al flujo comercial aparecerá aquí." />
      ) : (
        <div className="divide-y divide-border">
          {proyectos.map((p) => (
            <div key={p.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary"><Gem className="size-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{p.nombre}</p>
                  {p.codigo ? <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold">{p.codigo}</span> : null}
                  {p.estado ? <span className="rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-semibold text-primary">{p.estado}</span> : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[p.metal, p.ley, p.talla ? `Talla ${p.talla}` : null, p.peso_estimado != null ? `${p.peso_estimado} g estimados` : null].filter(Boolean).join(" · ") || "Sin especificaciones"}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-muted-foreground">Piezas</p>
                <p className="text-sm font-bold tabular-nums">{p.cantidad_piezas || 1}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Movimientos({
  inventario,
  areasUsuario,
  puedeTodo,
}: {
  inventario: MaterialItem[];
  areasUsuario: string[];
  puedeTodo: boolean;
}) {
  const { data: movimientos = [] } = useMovimientosInventario();
  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <p className="text-sm font-semibold">Historial de movimientos</p>
          <p className="text-xs text-muted-foreground">Cada entrada y consumo queda registrado.</p>
        </div>
        <div className="divide-y divide-border">
          {movimientos.map((m) => (
            <div key={m.id} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center">
              <div className={`grid size-9 shrink-0 place-items-center rounded-full ${m.tipo === "entrada" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
                {m.tipo === "entrada" ? <ArrowDownToLine className="size-4" /> : <ArrowUpFromLine className="size-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{m.material}</p>
                <p className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("es-PE")} · {m.area || "Taller"} · {m.motivo || "Sin motivo"}</p>
              </div>
              <p className="text-sm font-bold tabular-nums">{m.tipo === "entrada" ? "+" : "−"}{m.cantidad}</p>
            </div>
          ))}
          {movimientos.length === 0 ? <EmptyState icon={History} title="Sin movimientos" text="Registra la primera entrada o consumo del taller." /> : null}
        </div>
      </section>
      <MovimientoInline inventario={inventario} areasUsuario={areasUsuario} puedeTodo={puedeTodo} />
    </div>
  );
}

function MovimientoInline({ inventario, areasUsuario, puedeTodo }: { inventario: MaterialItem[]; areasUsuario: string[]; puedeTodo: boolean }) {
  const registrar = useRegistrarMovimiento();
  const areas = puedeTodo || areasUsuario.length === 0 ? [...AREAS] : areasUsuario;
  const [form, setForm] = useState({ area: areas[0] ?? "Taller", material_id: "", cantidad: "", tipo: "consumo" as "consumo" | "entrada", motivo: "" });
  const materiales = inventario.filter((m) => m.areas.length === 0 || m.areas.includes(form.area));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.material_id || !Number(form.cantidad)) return toast.error("Elige material y cantidad");
    try {
      await registrar.mutateAsync({ ...form, cantidad: Number(form.cantidad) });
      toast.success(form.tipo === "consumo" ? "Consumo registrado" : "Entrada registrada");
      setForm((f) => ({ ...f, cantidad: "", motivo: "" }));
    } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo registrar"); }
  }
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4"><p className="text-sm font-semibold">Registrar rápido</p><p className="text-xs text-muted-foreground">Para cuando estés dentro del taller y no quieras abrir otra pantalla.</p></div>
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-5">
        <select className={inputCls} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value, material_id: "" })}>{areas.map((a) => <option key={a}>{a}</option>)}</select>
        <select className={`${inputCls} md:col-span-2`} value={form.material_id} onChange={(e) => setForm({ ...form, material_id: e.target.value })}><option value="">Material…</option>{materiales.map((m) => <option key={m.id} value={m.id}>{m.material} · {m.stock} {m.unidad}</option>)}</select>
        <input className={inputCls} type="number" min="0" step="0.01" placeholder="Cantidad" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
        <select className={inputCls} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as "consumo" | "entrada" })}><option value="consumo">Consumo</option><option value="entrada">Entrada</option></select>
        <input className={`${inputCls} md:col-span-4`} placeholder="Motivo / pedido (ej. PED-0250)" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
        <button disabled={registrar.isPending} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{registrar.isPending ? "Guardando…" : "Registrar movimiento"}</button>
      </form>
    </section>
  );
}

function NuevoMaterialDialog({ sedeId, onClose }: { sedeId: string | null; onClose: () => void }) {
  const crear = useCrearMaterial();
  const [form, setForm] = useState({ material: "", categoria: "Oro", unidad: "g", stock: "", minimo: "", areas: [] as string[] });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.material.trim()) return toast.error("Escribe el nombre del material");
    try {
      await crear.mutateAsync({ material: form.material.trim(), categoria: form.categoria, unidad: form.unidad || "u", stock: Number(form.stock) || 0, minimo: Number(form.minimo) || 0, sede_id: sedeId, areas: form.areas });
      toast.success("Material creado");
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo crear"); }
  }
  return (
    <Modal title="Nuevo material" subtitle="Registra lo que realmente entra al taller." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <input className={inputCls} placeholder="Ej. Oro 18K amarillo" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <select className={inputCls} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>{CATEGORIAS_MATERIAL.map((c) => <option key={c}>{c}</option>)}</select>
          <input className={inputCls} placeholder="Unidad: g, u, ml…" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} />
          <input className={inputCls} type="number" min="0" step="0.01" placeholder="Stock inicial" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          <input className={inputCls} type="number" min="0" step="0.01" placeholder="Stock mínimo" value={form.minimo} onChange={(e) => setForm({ ...form, minimo: e.target.value })} />
        </div>
        <div><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Áreas que pueden usarlo</p><div className="flex flex-wrap gap-2">{AREAS.map((a) => { const on = form.areas.includes(a); return <button key={a} type="button" onClick={() => setForm({ ...form, areas: on ? form.areas.filter((x) => x !== a) : [...form.areas, a] })} className={`rounded-full px-3 py-1.5 text-[11px] ${on ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>{a}</button>; })}</div></div>
        <ModalActions onClose={onClose} pending={crear.isPending} label="Crear material" />
      </form>
    </Modal>
  );
}

function MovimientoDialog({ inventario, areasUsuario, puedeTodo, onClose }: { inventario: MaterialItem[]; areasUsuario: string[]; puedeTodo: boolean; onClose: () => void }) {
  const registrar = useRegistrarMovimiento();
  const areas = puedeTodo || areasUsuario.length === 0 ? [...AREAS] : areasUsuario;
  const [form, setForm] = useState({ area: areas[0] ?? "Taller", material_id: "", cantidad: "", tipo: "consumo" as "consumo" | "entrada", motivo: "" });
  const materiales = inventario.filter((m) => m.areas.length === 0 || m.areas.includes(form.area));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.material_id || !Number(form.cantidad)) return toast.error("Elige material y cantidad");
    try { await registrar.mutateAsync({ ...form, cantidad: Number(form.cantidad) }); toast.success("Movimiento registrado"); onClose(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo registrar"); }
  }
  return <Modal title="Registrar movimiento" subtitle="Una acción sencilla: entra, sale o se consume." onClose={onClose}><form onSubmit={submit} className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2">
      <select className={inputCls} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as "consumo" | "entrada" })}><option value="entrada">Entrada al inventario</option><option value="consumo">Consumo del taller</option></select>
      <select className={inputCls} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value, material_id: "" })}>{areas.map((a) => <option key={a}>{a}</option>)}</select>
      <select className={`${inputCls} sm:col-span-2`} value={form.material_id} onChange={(e) => setForm({ ...form, material_id: e.target.value })}><option value="">Selecciona material…</option>{materiales.map((m) => <option key={m.id} value={m.id}>{m.material} · {m.stock} {m.unidad}</option>)}</select>
      <input className={inputCls} type="number" min="0" step="0.01" placeholder="Cantidad" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
      <input className={inputCls} placeholder="Motivo / pedido" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
    </div>
    <ModalActions onClose={onClose} pending={registrar.isPending} label="Guardar movimiento" />
  </form></Modal>;
}


function ImportarExcel({ sedeId, onClose, onDone }: { sedeId: string | null; onClose: () => void; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null); const [filas,setFilas]=useState<Record<string,unknown>[]>([]); const [nombre,setNombre]=useState(""); const [error,setError]=useState(""); const [guardando,setGuardando]=useState(false);
  async function leer(file: File) { try { const wb=XLSX.read(await file.arrayBuffer(),{type:"array"}); const hoja=wb.Sheets[wb.SheetNames[0]]; const raw=XLSX.utils.sheet_to_json<Record<string,unknown>>(hoja,{defval:""}); const valid=raw.filter(r=>String(excelValue(r,"codigo")).trim()); setFilas(valid); setNombre(file.name); setError(raw.length-valid.length ? String(raw.length-valid.length) + " filas no tienen código ni nombre y no se importarán." : ""); if(!valid.length) toast.error("No encontramos registros con código o nombre"); } catch { toast.error("No se pudo leer el Excel"); } }
  async function guardar() { if(!sedeId)return toast.error("Tu usuario no tiene sede asignada"); if(!filas.length)return toast.error("Selecciona un Excel"); setGuardando(true); const user=(await supabase.auth.getUser()).data.user; const {data:lote,error:loteError}=await (supabase as any).from("inventario_joyas_importaciones").insert({sede_id:sedeId,nombre_archivo:nombre,filas_detectadas:filas.length,creado_por:user?.id}).select("id").single(); if(loteError){setGuardando(false);toast.error(loteError.message);return;} const payload=filas.map(r=>({sede_id:sedeId,importacion_id:lote.id,codigo:String(excelValue(r,"codigo")||"").trim(),nombre:String(excelValue(r,"nombre")||excelValue(r,"codigo")||"Joya sin nombre").trim(),metal:String(excelValue(r,"metal")||""),ley:String(excelValue(r,"ley")||""),peso:numeroExcel(excelValue(r,"peso")),talla:String(excelValue(r,"talla")||""),piedras:String(excelValue(r,"piedras")||""),cantidad:numeroExcel(excelValue(r,"cantidad")) ?? 1,estado:String(excelValue(r,"estado")||"disponible").trim().toLowerCase().replace(/\\s+/g,"_"),origen:"excel",metadata:{archivo_origen:nombre}})).filter(r=>r.codigo); const {error}=await (supabase as any).from("inventario_joyas").upsert(payload,{onConflict:"sede_id,codigo"}); if(error){setGuardando(false);toast.error(error.message);return;} await (supabase as any).from("inventario_joyas_importaciones").update({filas_importadas:payload.length,filas_con_revision:error?1:0}).eq("id",lote.id); setGuardando(false); toast.success(payload.length + " joyas importadas"); onDone(); }
  return <Modal title="Importar stock desde Excel" subtitle="Trae tu stock actual y migra progresivamente, sin borrar tu Excel." onClose={onClose}><div className="space-y-4"><div onClick={()=>input.current?.click()} className="cursor-pointer rounded-2xl border-2 border-dashed border-border bg-surface-muted/30 p-8 text-center hover:border-primary/40"><FileSpreadsheet className="mx-auto size-9 text-primary"/><p className="mt-3 text-sm font-semibold">{nombre || "Selecciona tu archivo Excel"}</p><p className="mt-1 text-xs text-muted-foreground">.xlsx o .xls · se utiliza la primera hoja</p><input ref={input} type="file" accept=".xlsx,.xls" className="hidden" onChange={e=>e.target.files?.[0] && void leer(e.target.files[0])}/></div>{filas.length ? <div className="rounded-xl border border-border p-4"><p className="text-sm font-semibold">{filas.length} registros encontrados</p><p className="mt-1 text-xs text-muted-foreground">Código · nombre · metal · ley · peso · talla · piedras · cantidad · estado</p><div className="mt-3 max-h-48 overflow-auto rounded-lg border border-border"><table className="w-full text-xs"><tbody>{filas.slice(0,10).map((r,i)=><tr key={i} className="border-b border-border"><td className="p-2 font-semibold">{String(excelValue(r,"codigo")||"—")}</td><td className="p-2">{String(excelValue(r,"nombre")||"—")}</td><td className="p-2">{String(excelValue(r,"metal")||"—")}</td><td className="p-2">{String(excelValue(r,"cantidad")||"1")}</td></tr>)}</tbody></table></div>{filas.length>10?<p className="mt-2 text-[10px] text-muted-foreground">Vista previa de 10 de {filas.length} registros.</p>:null}</div>:null}{error?<div className="rounded-xl bg-warning-soft p-3 text-xs text-warning">{error}</div>:null}<ModalActions onClose={onClose} pending={guardando} label="Importar stock"/></div></Modal>;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between gap-4"><div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{subtitle}</p></div><button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-muted-foreground hover:bg-surface-muted">✕</button></div>{children}</div></div>;
}

function ModalActions({ onClose, pending, label }: { onClose: () => void; pending: boolean; label: string }) {
  return <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground">Cancelar</button><button disabled={pending} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{pending ? "Guardando…" : label}</button></div>;
}

function ConfirmDelete({ material, pending, onCancel, onConfirm }: { material: MaterialItem; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal title="Eliminar material" subtitle={`Esta acción eliminará “${material.material}”.`} onClose={onCancel}>
      <div className="rounded-xl bg-danger-soft p-4 text-sm text-danger">
        Si el material ya tiene movimientos, la base de datos puede impedir su eliminación para proteger la trazabilidad.
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
        <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground">Cancelar</button>
        <button type="button" disabled={pending} onClick={onConfirm} className="rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Eliminando…" : "Eliminar material"}
        </button>
      </div>
    </Modal>
  );
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof History; title: string; text: string }) {
  return <div className="grid place-items-center px-6 py-12 text-center"><div className="mb-3 grid size-11 place-items-center rounded-2xl bg-surface-muted text-muted-foreground"><Icon className="size-5" /></div><p className="text-sm font-semibold">{title}</p><p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{text}</p></div>;
}
