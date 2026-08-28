import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fmtFecha } from "@/lib/utils";

export const Route = createFileRoute("/cliente")({
  head: () => ({
    meta: [
      { title: "Seguimiento de tu pedido — Aurum Lab" },
      {
        name: "description",
        content:
          "Consulta el estado de tu joya: área en la que se encuentra, avance real del trabajo y fecha estimada de entrega.",
      },
      { property: "og:title", content: "Seguimiento de tu pedido — Aurum Lab" },
      {
        property: "og:description",
        content: "Introduce tu referencia o número de contrato y conoce el avance de tu joya.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search["ref"] === "string" && search["ref"] ? { ref: search["ref"] as string } : {}),
  }),
  component: SeguimientoCliente,
});

type Seguimiento = {
  referencia: string;
  trabajo: string;
  cliente: string;
  area_actual: string;
  estado: string;
  ventas_estado: string | null;
  ruta: string[];
  fecha_entrega: string | null;
  fecha_envio: string | null;
  fecha_entregado: string | null;
  sede: string | null;
};

const ESTADOS_CLIENTE = [
  "Recibido",
  "Evaluación",
  "En Producción",
  "Área de Ventas",
  "Listo para Entrega",
  "Enviado",
  "Entregado",
] as const;

function estadoCliente(pedido: Seguimiento) {
  const estado = pedido.estado || "";
  const ventas = pedido.ventas_estado || "";

  if (estado === "Cancelado") return "Cancelado";
  if (["Listo para Entrega", "Enviado", "Entregado"].includes(estado)) return estado;
  if (["Listo para Entrega", "Enviado", "Entregado"].includes(ventas)) return ventas;
  if (
    estado === "Área de Ventas" ||
    estado === "En Ventas" ||
    pedido.area_actual === "Área ventas"
  ) {
    return "Área de Ventas";
  }
  if (estado === "En Producción") return "En Producción";
  if (estado === "Evaluación") return "Evaluación";
  return "Recibido";
}

function areaCliente(area: string) {
  if (area === "Área ventas") return "Área de Ventas";
  return area;
}

function SeguimientoCliente() {
  const { ref } = Route.useSearch();
  const [valor, setValor] = useState(ref ?? "");
  const [buscado, setBuscado] = useState(false);

  const consulta = useMutation({
    mutationFn: async (referencia: string): Promise<Seguimiento | null> => {
      const { data, error } = await supabase.rpc("seguimiento_pedido", { _ref: referencia });
      if (error) throw error;
      return ((data as Seguimiento[] | null) ?? [])[0] ?? null;
    },
    onSettled: () => setBuscado(true),
  });

  const pedido = consulta.data ?? null;
  const estadoActual = pedido ? estadoCliente(pedido) : null;
  const indice = estadoActual ? ESTADOS_CLIENTE.findIndex((estado) => estado === estadoActual) : -1;
  const avance = indice >= 0 ? Math.round((indice / (ESTADOS_CLIENTE.length - 1)) * 100) : 0;
  const mostrarAreaActual = pedido != null && estadoActual === "En Producción";

  return (
    <main className="min-h-screen bg-surface px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-gold">Aurum Lab</p>
        <h1 className="mb-6 font-display text-3xl">Seguimiento de tu pedido</h1>

        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (valor.trim()) consulta.mutate(valor.trim());
          }}
        >
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Referencia o número de contrato"
            className="min-h-12 flex-1 rounded-lg border border-border bg-card px-4 py-3 text-base sm:text-sm"
          />
          <button
            type="submit"
            disabled={consulta.isPending}
            className="min-h-12 rounded-lg bg-ink px-5 py-3 text-sm font-medium text-ink-foreground disabled:opacity-50 sm:text-xs"
          >
            {consulta.isPending ? "Buscando…" : "Consultar"}
          </button>
        </form>

        {buscado && !consulta.isPending && !pedido ? (
          <p className="mt-6 text-sm text-muted-foreground">
            No encontramos ningún pedido con esa referencia. Revísala o consúltanos por WhatsApp.
          </p>
        ) : null}

        {pedido ? (
          <article className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-xl">{pedido.trabajo}</h2>
            <p className="text-sm text-muted-foreground">
              {pedido.referencia}
              {pedido.sede ? ` · ${pedido.sede}` : ""}
            </p>

            <div className="mt-5 rounded-xl border border-border bg-surface/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Estado actual
              </p>
              <p className="mt-1 text-lg font-semibold">{estadoActual}</p>
              {mostrarAreaActual ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Actualmente en:{" "}
                  <span className="font-medium text-foreground">
                    {areaCliente(pedido.area_actual)}
                  </span>
                </p>
              ) : null}
            </div>

            <div className="mt-6">
              <div className="mb-2 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>Avance</span>
                <span>{avance}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-gold" style={{ width: `${avance}%` }} />
              </div>
            </div>

            <ol className="mt-6 space-y-2">
              {ESTADOS_CLIENTE.map((estado, i) => (
                <li key={estado} className="flex items-center gap-3 text-sm">
                  <span
                    className={`grid size-6 place-items-center rounded-full text-[10px] font-semibold ${
                      i < indice
                        ? "bg-success-soft text-success"
                        : i === indice
                          ? "bg-ink text-gold-bright"
                          : "bg-surface-muted text-muted-foreground"
                    }`}
                  >
                    {i < indice ? "✓" : i + 1}
                  </span>
                  <span className={i === indice ? "font-medium" : "text-muted-foreground"}>
                    {estado}
                  </span>
                </li>
              ))}
            </ol>

            <section className="mt-6 rounded-xl border border-border bg-surface/60 p-4">
              <h3 className="text-sm font-semibold">Información adicional</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Aquí se mostrarán certificados, guía de envío, observaciones o datos técnicos cuando
                estén disponibles.
              </p>
            </section>

            <div className="mt-6 border-t border-border pt-4 text-sm">
              <span className="text-muted-foreground">Fecha estimada de entrega: </span>
              <span className="font-medium">
                {fmtFecha(pedido.fecha_entrega) ?? "por confirmar"}
              </span>
            </div>
          </article>
        ) : null}
      </div>
    </main>
  );
}
