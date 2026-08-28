import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Panel } from "@/components/AppShell";
import { fmtFecha } from "@/lib/utils";
import { areaCoincide, useSesion } from "@/lib/auth";
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

  const areasVisibles = useMemo(() => {
    const misAreas = sesion?.areas ?? [];
    return misAreas.length > 0 ? misAreas : [area];
  }, [area, sesion?.areas]);

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return pedidos.filter((p) => {
      const okTexto =
        !t ||
        [p.referencia, p.cliente, p.contrato, p.trabajo, p.pieza].some((v) =>
          (v ?? "").toLowerCase().includes(t),
        );
      // Al buscar se puede encontrar cualquier pedido, incluso si ya avanzó.
      const okArea = Boolean(t) || areasVisibles.some((a) => areaCoincide(a, p.area_actual));
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
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:ring-1 focus:ring-gold sm:w-72 sm:text-sm"
        />
      }
    >
      <div className="block divide-y divide-border md:hidden">
        {lista.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => navigate({ to: "/pedidos/$id", params: { id: p.id } })}
            className="w-full px-4 py-4 text-left transition-colors active:bg-surface-muted"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{p.referencia}</p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{p.cliente}</p>
              </div>
              <span className="shrink-0 rounded-full bg-accent px-2 py-1 text-[10px] font-semibold uppercase text-foreground">
                {p.area_actual}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-foreground">{p.trabajo || p.pieza}</p>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>{p.contrato ? `Contrato ${p.contrato}` : "Sin contrato"}</span>
              <span className="tabular-nums">
                {fmtFecha(p.fecha_entrega ?? p.entrega) ?? "Sin fecha"}
              </span>
            </div>
          </button>
        ))}
        {lista.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">
            {busca.trim()
              ? "Sin resultados para esa búsqueda."
              : "No hay pedidos en tus áreas asignadas."}
          </p>
        ) : null}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-surface-muted">
              {["REF", "Cliente", "Trabajo", "Área actual", "Entrega"].map((h) => (
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
