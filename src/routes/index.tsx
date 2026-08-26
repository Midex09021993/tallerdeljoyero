import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Panel, StatCard } from "@/components/AppShell";
import { estadoClases, pedidos } from "@/data/taller";
import floral from "@/assets/diseno-floral.jpg";
import colgante from "@/assets/diseno-colgante.jpg";
import gemelos from "@/assets/diseno-gemelos.jpg";
import corona from "@/assets/diseno-corona.jpg";

export const Route = createFileRoute("/")({
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

function PedidosPage() {
  return (
    <AppShell
      titulo="Panel de Producción"
      subtitulo="Lunes, 22 de mayo · 14 pedidos activos"
      acciones={
        <>
          <StatCard etiqueta="Resina 3D" valor="840 ml" delta="-12%" tono="negativo" />
          <StatCard etiqueta="Oro 18k" valor="242 g" delta="+5 g" tono="positivo" />
        </>
      }
    >
      <section className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          titulo="Pedidos recientes"
          className="lg:col-span-2"
          accion={
            <Link to="/gestion" className="text-xs font-medium text-gold hover:underline">
              Ver todos
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-surface-muted">
                  {["ID", "Pieza", "Cliente", "Estado", "Entrega"].map((h, i) => (
                    <th
                      key={h}
                      className={`px-6 py-3 text-[10px] uppercase tracking-wider text-muted-foreground ${
                        i === 4 ? "text-right" : ""
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
                    <td className="px-6 py-4 text-xs font-medium">{p.id}</td>
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
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${estadoClases[p.estado]}`}
                      >
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm tabular-nums">{p.entrega}</td>
                  </tr>
                ))}
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
            <div className="mb-4 flex items-center gap-4">
              <div className="grid size-10 place-items-center rounded-full bg-danger-soft text-xs font-bold text-danger">
                !
              </div>
              <div>
                <p className="text-sm font-medium">Plata de ley 925</p>
                <p className="text-xs text-muted-foreground">Bajo el mínimo (45 g restantes)</p>
              </div>
            </div>
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
