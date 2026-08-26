import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell, Panel, StatCard } from "@/components/AppShell";
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
        content:
          "Materiales, stock bajo y movimientos del taller: oro, plata, resina, piedras y soldadura con descuento automático por área.",
      },
      { property: "og:title", content: "Inventario — Aurum Lab" },
      {
        property: "og:description",
        content: "Control de insumos por área con descuento automático del stock general.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InventarioPage,
});

const inputCls =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

type Modulo = "materiales" | "bajo" | "movimientos";

function InventarioPage() {
  const { data: sesion } = useSesion();
  const { data: inventario = [], isLoading } = useInventario();
  const [modulo, setModulo] = useState<Modulo>("materiales");
  const bajos = useMemo(() => inventario.filter((i) => i.stock < i.minimo), [inventario]);

  const puedeGestionar = sesion?.esAdmin ?? false;

  return (
    <AppShell
      titulo="Inventario"
      subtitulo={isLoading ? "Cargando…" : `${inventario.length} materiales · ${bajos.length} bajo mínimo`}
      acciones={
        <>
          <StatCard etiqueta="Materiales" valor={String(inventario.length)} />
          <StatCard etiqueta="Bajo mínimo" valor={String(bajos.length)} tono="negativo" />
        </>
      }
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ["materiales", "Materiales"],
            ["bajo", `Stock bajo${bajos.length ? ` (${bajos.length})` : ""}`],
            ["movimientos", "Movimientos"],
          ] as [Modulo, string][]
        ).map(([id, etiqueta]) => (
          <button
            key={id}
            type="button"
            onClick={() => setModulo(id)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              modulo === id
                ? "bg-primary text-primary-foreground"
                : "bg-surface-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {modulo === "materiales" ? (
        <Materiales inventario={inventario} puedeGestionar={puedeGestionar} sedeId={sesion?.perfil.sede_id ?? null} />
      ) : null}
      {modulo === "bajo" ? <StockBajo bajos={bajos} /> : null}
      {modulo === "movimientos" ? (
        <Movimientos inventario={inventario} areasUsuario={sesion?.areas ?? []} puedeTodo={puedeGestionar} />
      ) : null}
    </AppShell>
  );
}

type MaterialItem = ReturnType<typeof useInventario>["data"] extends (infer T)[] | undefined ? T : never;

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
  const crear = useCrearMaterial();
  const [abierto, setAbierto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("Todas");
  const [nuevo, setNuevo] = useState({
    material: "",
    categoria: "Oro",
    unidad: "g",
    stock: "",
    minimo: "",
    areas: [] as string[],
  });

  const lista = filtro === "Todas" ? inventario : inventario.filter((m) => m.categoria === filtro);

  async function crearMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevo.material.trim()) return;
    try {
      await crear.mutateAsync({
        material: nuevo.material.trim(),
        categoria: nuevo.categoria,
        unidad: nuevo.unidad || "u",
        stock: Number(nuevo.stock) || 0,
        minimo: Number(nuevo.minimo) || 0,
        sede_id: sedeId,
        areas: nuevo.areas,
      });
      toast.success("Material agregado");
      setNuevo({ material: "", categoria: "Oro", unidad: "g", stock: "", minimo: "", areas: [] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo agregar");
    }
  }

  return (
    <div className="space-y-6">
      {puedeGestionar ? (
        <Panel titulo="Nuevo material">
          <form onSubmit={crearMaterial} className="space-y-3 p-6">
            <div className="grid gap-3 md:grid-cols-5">
              <input
                className={inputCls}
                placeholder="Material (ej. Oro 18k)"
                value={nuevo.material}
                onChange={(e) => setNuevo({ ...nuevo, material: e.target.value })}
              />
              <select
                className={inputCls}
                value={nuevo.categoria}
                onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value })}
              >
                {CATEGORIAS_MATERIAL.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                className={inputCls}
                placeholder="Unidad (g, u, ml)"
                value={nuevo.unidad}
                onChange={(e) => setNuevo({ ...nuevo, unidad: e.target.value })}
              />
              <input
                className={inputCls}
                type="number"
                step="0.01"
                placeholder="Stock inicial"
                value={nuevo.stock}
                onChange={(e) => setNuevo({ ...nuevo, stock: e.target.value })}
              />
              <input
                className={inputCls}
                type="number"
                step="0.01"
                placeholder="Mínimo"
                value={nuevo.minimo}
                onChange={(e) => setNuevo({ ...nuevo, minimo: e.target.value })}
              />
            </div>
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                Áreas que pueden usar este material
              </p>
              <div className="flex flex-wrap gap-2">
                {AREAS.map((a) => {
                  const activo = nuevo.areas.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() =>
                        setNuevo({
                          ...nuevo,
                          areas: activo ? nuevo.areas.filter((x) => x !== a) : [...nuevo.areas, a],
                        })
                      }
                      className={`rounded-full px-3 py-1 text-[11px] ${
                        activo ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground"
                      }`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="submit"
              disabled={crear.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {crear.isPending ? "Agregando…" : "Agregar material"}
            </button>
          </form>
        </Panel>
      ) : null}

      <Panel titulo="Materiales">
        <div className="flex flex-wrap gap-2 px-6 pt-4">
          {["Todas", ...CATEGORIAS_MATERIAL].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFiltro(c)}
              className={`rounded-full px-3 py-1 text-[11px] ${
                filtro === c ? "bg-foreground text-background" : "bg-surface-muted text-muted-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-muted">
                {["Material", "Categoría", "Stock", "Mínimo", "Áreas", ""].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.flatMap((m) => {
                const bajo = m.stock < m.minimo;
                const fila = (
                  <tr key={m.id} className="transition-colors hover:bg-surface-muted/60">
                    <td className="px-6 py-4 text-sm font-medium">{m.material}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{m.categoria}</td>
                    <td className="px-6 py-4 text-sm tabular-nums">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={m.stock}
                        disabled={!puedeGestionar}
                        onBlur={(e) => {
                          const stock = Number(e.target.value);
                          if (stock !== m.stock) actualizarStock.mutate({ id: m.id, stock });
                        }}
                        className="w-24 rounded-lg border border-border bg-card px-2 py-1 text-sm tabular-nums"
                      />
                      <span className="ml-2 text-xs text-muted-foreground">{m.unidad}</span>
                      {bajo ? (
                        <span className="ml-2 rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-danger">
                          bajo
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-sm tabular-nums text-muted-foreground">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={m.minimo}
                        disabled={!puedeGestionar}
                        onBlur={(e) => {
                          const minimo = Number(e.target.value);
                          if (minimo !== m.minimo)
                            actualizarMaterial.mutate({ id: m.id, cambios: { minimo } });
                        }}
                        className="w-20 rounded-lg border border-border bg-card px-2 py-1 text-sm tabular-nums"
                      />
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {m.areas.length > 0 ? m.areas.join(", ") : "Sin asignar"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {puedeGestionar ? (
                        <button
                          type="button"
                          onClick={() => setAbierto(abierto === m.id ? null : m.id)}
                          className="rounded-lg border border-border px-3 py-1 text-xs"
                        >
                          {abierto === m.id ? "Cerrar" : "Áreas"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
                if (abierto !== m.id) return [fila];
                return [
                  fila,
                  <tr key={`${m.id}-areas`} className="bg-surface-muted/40">
                    <td colSpan={6} className="px-6 py-4">
                      <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Asignar {m.material} a áreas
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {AREAS.map((a) => {
                          const activo = m.areas.includes(a);
                          return (
                            <button
                              key={a}
                              type="button"
                              onClick={() =>
                                asignar.mutate({ materialId: m.id, area: a, activo: !activo })
                              }
                              className={`rounded-full px-3 py-1 text-[11px] ${
                                activo
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-card text-muted-foreground border border-border"
                              }`}
                            >
                              {a}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Eliminar el material ${m.material}?`)) borrar.mutate(m.id);
                        }}
                        className="mt-4 rounded-lg border border-danger px-3 py-1 text-xs text-danger"
                      >
                        Eliminar material
                      </button>
                    </td>
                  </tr>,
                ];
              })}
              {lista.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-sm text-muted-foreground">
                    Sin materiales registrados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function StockBajo({ bajos }: { bajos: MaterialItem[] }) {
  return (
    <Panel titulo="Stock bajo mínimo">
      <div className="divide-y divide-border">
        {bajos.map((m) => (
          <div key={m.id} className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium">{m.material}</p>
              <p className="text-xs text-muted-foreground">
                {m.categoria} · {m.areas.length > 0 ? m.areas.join(", ") : "sin área asignada"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-danger tabular-nums">
                {m.stock} {m.unidad}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                mínimo {m.minimo} {m.unidad}
              </p>
            </div>
          </div>
        ))}
        {bajos.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">Todo el inventario está por encima del mínimo.</p>
        ) : null}
      </div>
    </Panel>
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
  const registrar = useRegistrarMovimiento();
  const areasDisponibles = puedeTodo || areasUsuario.length === 0 ? [...AREAS] : areasUsuario;
  const [form, setForm] = useState({
    area: areasDisponibles[0] ?? "Taller",
    material_id: "",
    cantidad: "",
    tipo: "consumo" as "consumo" | "entrada",
    motivo: "",
  });

  // Sólo se ofrecen los materiales asignados al área elegida.
  const materialesArea = inventario.filter(
    (m) => m.areas.length === 0 || m.areas.includes(form.area),
  );

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.material_id || !Number(form.cantidad)) {
      toast.error("Elige material y cantidad");
      return;
    }
    try {
      await registrar.mutateAsync({
        material_id: form.material_id,
        cantidad: Number(form.cantidad),
        tipo: form.tipo,
        area: form.area,
        motivo: form.motivo,
      });
      toast.success(form.tipo === "consumo" ? "Consumo descontado del stock" : "Entrada registrada");
      setForm({ ...form, cantidad: "", motivo: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar");
    }
  }

  return (
    <div className="space-y-6">
      <Panel titulo="Registrar movimiento">
        <form onSubmit={enviar} className="grid gap-3 p-6 md:grid-cols-6">
          <select
            className={inputCls}
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value, material_id: "" })}
          >
            {areasDisponibles.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            className={`${inputCls} md:col-span-2`}
            value={form.material_id}
            onChange={(e) => setForm({ ...form, material_id: e.target.value })}
          >
            <option value="">Material…</option>
            {materialesArea.map((m) => (
              <option key={m.id} value={m.id}>
                {m.material} ({m.stock} {m.unidad})
              </option>
            ))}
          </select>
          <select
            className={inputCls}
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value as "consumo" | "entrada" })}
          >
            <option value="consumo">Consumo (resta)</option>
            <option value="entrada">Entrada (suma)</option>
          </select>
          <input
            className={inputCls}
            type="number"
            step="0.01"
            placeholder="Cantidad"
            value={form.cantidad}
            onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder="Motivo / pedido"
            value={form.motivo}
            onChange={(e) => setForm({ ...form, motivo: e.target.value })}
          />
          <button
            type="submit"
            disabled={registrar.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60 md:col-span-2"
          >
            {registrar.isPending ? "Registrando…" : "Registrar y actualizar stock"}
          </button>
        </form>
      </Panel>

      <Panel titulo="Historial de movimientos">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-muted">
                {["Fecha", "Material", "Área", "Tipo", "Cantidad", "Motivo"].map((h) => (
                  <th key={h} className="px-6 py-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movimientos.map((mv) => (
                <tr key={mv.id}>
                  <td className="px-6 py-3 text-xs text-muted-foreground">
                    {new Date(mv.created_at).toLocaleDateString("es-PE")}
                  </td>
                  <td className="px-6 py-3 text-sm">{mv.material}</td>
                  <td className="px-6 py-3 text-xs text-muted-foreground">{mv.area || "—"}</td>
                  <td className="px-6 py-3 text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        mv.tipo === "entrada" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
                      }`}
                    >
                      {mv.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm tabular-nums">
                    {mv.tipo === "entrada" ? "+" : "−"}
                    {mv.cantidad}
                  </td>
                  <td className="px-6 py-3 text-xs text-muted-foreground">{mv.motivo || "—"}</td>
                </tr>
              ))}
              {movimientos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-sm text-muted-foreground">
                    Sin movimientos registrados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
