import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SelectorSedeDueno, useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";
import { AREAS, areaCoincide } from "@/lib/auth";
import { esEstadoFinalPedido, pedidoEnEvaluacion, usePedidos } from "@/lib/taller-db";
import { useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/monitor")({
  head: () => ({
    meta: [
      { title: "Monitor de taller — Aurum Lab" },
      {
        name: "description",
        content:
          "Pantalla de producción del taller de joyería: cada área con su cantidad de pedidos y detalle desplegable.",
      },
      { property: "og:title", content: "Monitor de taller — Aurum Lab" },
      { property: "og:description", content: "Producción en vivo por área del taller de joyería." },
    ],
  }),
  component: MonitorPage,
});

function MonitorPage() {
  const { data: pedidos = [], isLoading } = usePedidos();
  const { data: sesion } = useSesion();
  const { esDueno, sedeFiltro, setSedeFiltro, sedes, filtrarPedidos, etiquetaSede } =
    useSedeFiltroDueno();
  const [abierta, setAbierta] = useState<string | null>(null);
  const pedidosPorSede = filtrarPedidos(pedidos);

  return (
    <AppShell
      titulo="Monitor de taller"
      subtitulo={
        isLoading
          ? "Cargando…"
          : sesion?.esDueno
            ? `Vista de producción · ${etiquetaSede}`
            : (sesion?.sede?.nombre ?? "Producción en vivo")
      }
      acciones={
        <SelectorSedeDueno
          esDueno={esDueno}
          sedes={sedes}
          value={sedeFiltro}
          onChange={setSedeFiltro}
        />
      }
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {AREAS.map((area) => {
          const lista = pedidosPorSede.filter(
            (p) =>
              !esEstadoFinalPedido(p.estado) &&
              !pedidoEnEvaluacion(p.estado) &&
              areaCoincide(p.area_actual, area),
          );
          const activa = abierta === area;
          return (
            <button
              key={area}
              type="button"
              onClick={() => setAbierta(activa ? null : area)}
              className={`rounded-2xl border p-6 text-left transition-colors ${
                activa
                  ? "border-gold bg-ink text-ink-foreground"
                  : "border-border bg-card hover:bg-surface-muted"
              }`}
            >
              <p className="text-[10px] uppercase tracking-wider opacity-60">{area}</p>
              <p className="mt-2 font-display text-4xl">{lista.length}</p>
              <p className="mt-1 text-xs opacity-60">
                {lista.length === 1 ? "pedido" : "pedidos"} en área
              </p>

              {activa ? (
                <ul className="mt-4 space-y-2 border-t border-gold/20 pt-4">
                  {lista.length === 0 ? (
                    <li className="text-xs opacity-50">Sin pedidos.</li>
                  ) : (
                    lista.map((p) => (
                      <li key={p.id} className="text-xs">
                        <span className="text-gold">{p.referencia}</span> · {p.pieza}
                        <span className="block opacity-50">
                          {p.cliente}
                          {sesion?.esDueno && p.sede_nombre ? ` · ${p.sede_nombre}` : ""}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
            </button>
          );
        })}
      </div>
    </AppShell>
  );
}
