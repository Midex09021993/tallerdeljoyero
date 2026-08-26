import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Panel, StatCard } from "@/components/AppShell";
import {
  estadoClases,
  estados,
  useActualizarPedido,
  useBorrarPedido,
  useCrearPedido,
  useInventario,
  usePedidos,
} from "@/lib/taller-db";
import floral from "@/assets/diseno-floral.jpg";
import colgante from "@/assets/diseno-colgante.jpg";
import gemelos from "@/assets/diseno-gemelos.jpg";
import corona from "@/assets/diseno-corona.jpg";

export const Route = createFileRoute("/_authenticated/pedidos")({
  head: () => ({
    meta: [
      { title: "Panel de producción — Aurum Lab" },
      {
        name: "description",
        content:
          "Panel del taller de joyería Aurum Lab: pedidos activos, colas de diseño e impresión 3D, estado de impresoras y stock de materiales.",
      },
      { property: "og:title", content: "Panel de producción — Aurum Lab" },
      {
        property: "og:description",
        content: "Pedidos activos, producción y stock del taller de joyería en una sola vista.",
      },
    ],
  }),
  component: PedidosPage,
});

const disenos = [
  { img: floral, nombre: 'Anillo orgánico "Orchid"', meta: "Modificado hace 2 h", archivo: "Floral_V1.stl" },
  { img: colgante, nombre: "Colgante hexagonal", meta: "Modificado hace 5 h", archivo: "Geom_Pendant.stl" },
  { img: gemelos, nombre: "Gemelos iniciales 'B'", meta: "Modificado ayer", archivo: "Cufflink_04.stl" },
  { img: corona, nombre: "Corona Imperial v2", meta: "Modificado hace 3 d", archivo: "Crown_Final.stl" },
];

const vacio = {
  referencia: "",
  pieza: "",
  cliente: "",
  material: "Oro blanco 18k",
  estado: estados[0] as string,
  entrega: "",
  importe: "0",
};

function PedidosPage() {
  const { data: pedidos = [], isLoading } = usePedidos();
  const { data: inventario = [] } = useInventario();
  const crear = useCrearPedido();
  const actualizar = useActualizarPedido();
  const borrar = useBorrarPedido();
  const [form, setForm] = useState(vacio);
  const [abierto, setAbierto] = useState(false);

  const bajos = inventario.filter((m) => m.stock < m.minimo);
  const resina = inventario.find((m) => m.material.toLowerCase().includes("resina"));
  const oro = inventario.find((m) => m.material.toLowerCase().includes("oro 18k"));

  return (
    <AppShell
      titulo="Panel de Producción"
      subtitulo={isLoading ? "Cargando pedidos…" : `${pedidos.length} pedidos en la base de datos`}
      acciones={
        <>
          <StatCard
            etiqueta="Resina 3D"
            valor={resina ? `${resina.stock} ${resina.unidad}` : "—"}
            tono={resina && resina.stock < resina.minimo ? "negativo" : "neutro"}
          />
          <StatCard etiqueta="Oro 18k" valor={oro ? `${oro.stock} ${oro.unidad}` : "—"} />
        </>
      }
    >
      <section className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          titulo="Pedidos"
          className="lg:col-span-2"
          accion={
            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-muted"
            >
              {abierto ? "Cancelar" : "Nuevo pedido"}
            </button>
          }
        >
          {abierto ? (
            <form
              className="grid grid-cols-2 gap-3 border-b border-border bg-surface-muted/40 p-6 lg:grid-cols-4"
              onSubmit={(e) => {
                e.preventDefault();
                crear.mutate(
                  {
                    referencia: form.referencia || `#${Math.floor(Math.random() * 9000 + 1000)}`,
                    pieza: form.pieza,
                    cliente: form.cliente,
                    material: form.material,
                    estado: form.estado,
                    entrega: form.entrega,
                    importe: Number(form.importe) || 0,
                  },
                  {
                    onSuccess: () => {
                      setForm(vacio);
                      setAbierto(false);
                    },
                  },
                );
              }}
            >
              {(
                [
                  ["referencia", "Referencia"],
                  ["pieza", "Pieza"],
                  ["cliente", "Cliente"],
                  ["material", "Material"],
                  ["entrega", "Entrega"],
                  ["importe", "Importe (€)"],
                ] as const
              ).map(([campo, etiqueta]) => (
                <label key={campo} className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {etiqueta}
                  <input
                    required={campo === "pieza" || campo === "cliente"}
                    value={form[campo]}
                    onChange={(e) => setForm((f) => ({ ...f, [campo]: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                  />
                </label>
              ))}
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Estado
                <select
                  value={form.estado}
                  onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                >
                  {estados.map((e) => (
                    <option key={e}>{e}</option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={crear.isPending}
                  className="w-full rounded-lg bg-ink px-3 py-2 text-xs font-medium text-ink-foreground disabled:opacity-50"
                >
                  {crear.isPending ? "Guardando…" : "Guardar pedido"}
                </button>
              </div>
            </form>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-surface-muted">
                  {["Ref", "Pieza", "Cliente", "Estado", "Entrega", ""].map((h, i) => (
                    <th
                      key={h || i}
                      className={`px-6 py-3 text-[10px] uppercase tracking-wider text-muted-foreground ${
                        i >= 4 ? "text-right" : ""
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pedidos.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-surface-muted/60">
                    <td className="px-6 py-4 text-xs font-medium">{p.referencia}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid size-10 shrink-0 place-items-center rounded border border-border bg-surface-muted text-[8px] font-medium text-muted-foreground">
                          {p.material.slice(0, 3).toUpperCase()}
                        </div>
                        <span className="text-sm">{p.pieza}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{p.cliente}</td>
                    <td className="px-6 py-4">
                      <select
                        value={p.estado}
                        onChange={(e) => actualizar.mutate({ id: p.id, estado: e.target.value })}
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${estadoClases[p.estado] ?? "bg-surface-muted"}`}
                      >
                        {estados.map((e) => (
                          <option key={e}>{e}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right text-sm tabular-nums">{p.entrega}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => borrar.mutate(p.id)}
                        className="text-xs text-muted-foreground transition-colors hover:text-danger"
                      >
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
                {!isLoading && pedidos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-sm text-muted-foreground">
                      No hay pedidos todavía.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-ink p-6 text-ink-foreground shadow-card">
            <div className="relative z-10">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">
                Estado impresoras
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-foreground/80">Formlabs 3B+ (A)</span>
                  <span className="rounded border border-success/30 bg-success/20 px-2 py-0.5 text-[10px] text-success">
                    ACTIVA
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-ink-foreground/10">
                  <div className="h-full w-[72%] bg-gold" />
                </div>
                <div className="flex justify-between text-[10px] text-ink-foreground/40">
                  <span>Anillo compromiso v2</span>
                  <span>1 h 14 m restante</span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-8 -right-8 opacity-10">
              <div className="size-32 rotate-45 border-4 border-ink-foreground" />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Alertas de stock
            </h2>
            {bajos.length === 0 ? (
              <p className="mb-4 text-sm text-muted-foreground">Todo el material por encima del mínimo.</p>
            ) : (
              bajos.map((m) => (
                <div key={m.id} className="mb-4 flex items-center gap-4">
                  <div className="grid size-10 place-items-center rounded-full bg-danger-soft text-xs font-bold text-danger">
                    !
                  </div>
                  <div>
                    <p className="text-sm font-medium">{m.material}</p>
                    <p className="text-xs text-muted-foreground">
                      Bajo el mínimo ({m.stock} {m.unidad} restantes)
                    </p>
                  </div>
                </div>
              ))
            )}
            <Link
              to="/inventario"
              className="block w-full rounded-lg border border-border bg-surface-muted py-2 text-center text-xs font-medium transition-colors hover:bg-accent"
            >
              Pedir suministros
            </Link>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-6 font-display text-xl">Últimos diseños 3D</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {disenos.map((d) => (
            <article key={d.archivo}>
              <img
                src={d.img}
                alt={d.nombre}
                loading="lazy"
                width={512}
                height={512}
                className="mb-3 aspect-square w-full rounded-xl border border-border object-cover"
              />
              <p className="text-sm font-medium">{d.nombre}</p>
              <p className="text-xs text-muted-foreground">{d.meta}</p>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
