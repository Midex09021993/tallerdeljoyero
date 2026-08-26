import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Panel, StatCard } from "@/components/AppShell";
import { estadoClases, useActualizarPedido, usePedidos } from "@/lib/taller-db";

export const Route = createFileRoute("/_authenticated/gestion")({
  head: () => ({
    meta: [
      { title: "Gestión — Aurum Lab" },
      {
        name: "description",
        content: "Facturación, clientes y rendimiento del taller de joyería: importes por pedido y estado de cobro.",
      },
      { property: "og:title", content: "Gestión — Aurum Lab" },
      { property: "og:description", content: "Facturación, clientes y rendimiento del taller." },
    ],
  }),
  component: GestionPage,
});

const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function GestionPage() {
  const { data: pedidos = [], isLoading } = usePedidos();
  const actualizar = useActualizarPedido();

  const total = pedidos.reduce((acc, p) => acc + p.importe, 0);
  const entregado = pedidos.filter((p) => p.estado === "Entregado").reduce((a, p) => a + p.importe, 0);

  return (
    <AppShell
      titulo="Gestión"
      subtitulo={isLoading ? "Cargando…" : "Facturación y cartera de pedidos guardada en la base de datos"}
      acciones={
        <>
          <StatCard etiqueta="Cartera" valor={eur.format(total)} />
          <StatCard etiqueta="Facturado" valor={eur.format(entregado)} tono="positivo" />
        </>
      }
    >
      <Panel titulo="Detalle económico">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-muted">
                {["Ref", "Cliente", "Pieza", "Estado", "Importe"].map((h, i) => (
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
                  <td className="px-6 py-4 text-xs font-medium">{p.referencia}</td>
                  <td className="px-6 py-4 text-sm">{p.cliente}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{p.pieza}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${estadoClases[p.estado] ?? "bg-surface-muted"}`}
                    >
                      {p.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <input
                      type="number"
                      defaultValue={p.importe}
                      onBlur={(e) => {
                        const importe = Number(e.target.value);
                        if (importe !== p.importe) actualizar.mutate({ id: p.id, importe });
                      }}
                      className="w-28 rounded-lg border border-border bg-card px-2 py-1 text-right text-sm tabular-nums"
                    />
                  </td>
                </tr>
              ))}
              {!isLoading && pedidos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-sm text-muted-foreground">
                    Sin pedidos registrados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
