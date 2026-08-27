import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Panel } from "@/components/AppShell";
import { fmtFecha } from "@/lib/utils";
import { useSesion } from "@/lib/auth";
import { usePedidos } from "@/lib/taller-db";

/**
 * Seguimiento general para las pantallas de área (mismo formato que Pedidos:
 * REF · Cliente · Trabajo · Área actual · Entrega).
 *
 * Solo se muestra a los operarios: el gerente y el dueño ven el seguimiento
 * completo en la pantalla de Pedidos, no repetido en cada área.
 */
export function SeguimientoArea({ area }: { area: string }) {
  const { data: sesion } = useSesion();
  const { data: pedidos = [] } = usePedidos();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");

  const misAreas = sesion?.areas ?? [];
  const areasVisibles = misAreas.length > 0 ? misAreas : [area];

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return pedidos.filter((p) => {
      const okTexto =
        !t ||
        [p.referencia, p.cliente, p.contrato, p.trabajo, p.pieza].some((v) =>
          (v ?? "").toLowerCase().includes(t),
        );
      // Al buscar se puede encontrar cualquier pedido, incluso si ya avanzó.
      const okArea = Boolean(t) || areasVisibles.includes(p.area_actual);
      return okTexto && okArea;
    });
  }, [pedidos, busca, areasVisibles]);

  if (!sesion || sesion.esAdmin || sesion.rolPrincipal === "monitor") return null;

  return (
    <Panel
      titulo="Seguimiento general"
      className="mb-6"
      accion={
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por referencia, cliente, contrato…"
          className="w-64 rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-gold"
        />
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-surface-muted">
              {["REF", "Cliente", "Trabajo", "Área actual", "Entrega"].map((h) => (
                <th key={h} className="px-6 py-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lista.map((p) => (
              <tr
                key={p.id}
                onClick={() => navigate({ to: "/pedidos/$id", params: { id: p.id } })}
                className="cursor-pointer transition-colors hover:bg-surface-muted/70"
              >
                <td className="px-6 py-4 text-sm font-medium">{p.referencia}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{p.cliente}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{p.trabajo || p.pieza}</td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-accent px-2 py-1 text-[10px] font-semibold uppercase">
                    {p.area_actual}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm tabular-nums text-muted-foreground">
                  {fmtFecha(p.fecha_entrega ?? p.entrega) ?? "—"}
                </td>
              </tr>
            ))}
            {lista.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-sm text-muted-foreground">
                  {busca.trim()
                    ? "Sin resultados para esa búsqueda."
                    : "No hay pedidos en tus áreas asignadas. Usa el buscador para localizar cualquier pedido."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
