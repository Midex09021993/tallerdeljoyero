import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Panel, StatCard } from "@/components/AppShell";
import { inventario } from "@/data/taller";

export const Route = createFileRoute("/inventario")({
  head: () => ({
    meta: [
      { title: "Inventario — Aurum Lab" },
      {
        name: "description",
        content: "Stock de metales, piedras y consumibles del taller con mínimos y alertas de reposición.",
      },
      { property: "og:title", content: "Inventario — Aurum Lab" },
      { property: "og:description", content: "Metales, piedras y consumibles con alertas de stock mínimo." },
    ],
  }),
  component: InventarioPage,
});

function InventarioPage() {
  const bajos = inventario.filter((i) => i.stock < i.minimo);
  return (
    <AppShell
      titulo="Inventario"
      subtitulo={`${inventario.length} referencias · ${bajos.length} bajo mínimo`}
      acciones={
        <>
          <StatCard etiqueta="Referencias" valor={String(inventario.length)} />
          <StatCard etiqueta="Bajo mínimo" valor={String(bajos.length)} tono="negativo" delta="revisar" />
        </>
      }
    >
      <Panel titulo="Materiales">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-surface-muted">
              {["Material", "Stock", "Mínimo", "Nivel"].map((h) => (
                <th key={h} className="px-6 py-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {inventario.map((m) => {
              const bajo = m.stock < m.minimo;
              return (
                <tr key={m.material} className="transition-colors hover:bg-surface-muted/60">
                  <td className="px-6 py-4 text-sm font-medium">{m.material}</td>
                  <td className="px-6 py-4 text-sm tabular-nums">
                    {m.stock} {m.unidad}
                    {bajo ? (
                      <span className="ml-2 rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-danger">
                        bajo
                      </span>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-sm tabular-nums text-muted-foreground">
                    {m.minimo} {m.unidad}
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-1 w-40 overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className={`h-full rounded-full ${bajo ? "bg-danger" : "bg-gold"}`}
                        style={{ width: `${m.pct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}
