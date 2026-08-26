import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
    ref: typeof search['ref'] === "string" ? (search['ref'] as string) : "",
  }),
  component: SeguimientoCliente,
});

type Seguimiento = {
  referencia: string;
  trabajo: string;
  cliente: string;
  area_actual: string;
  ruta: string[];
  fecha_entrega: string | null;
  sede: string | null;
};

function SeguimientoCliente() {
  const { ref } = Route.useSearch();
  const [valor, setValor] = useState(ref);
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
  const secuencia = pedido ? ["Pedidos", ...pedido.ruta, "Entregado"] : [];
  const indice = pedido ? secuencia.indexOf(pedido.area_actual) : -1;
  const avance = secuencia.length > 1 ? Math.round((indice / (secuencia.length - 1)) * 100) : 0;

  return (
    <main className="min-h-screen bg-surface px-6 py-16">
      <div className="mx-auto w-full max-w-xl">
        <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-gold">Aurum Lab</p>
        <h1 className="mb-6 font-display text-3xl">Seguimiento de tu pedido</h1>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (valor.trim()) consulta.mutate(valor.trim());
          }}
        >
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Referencia o número de contrato"
            className="flex-1 rounded-lg border border-border bg-card px-4 py-3 text-sm"
          />
          <button
            type="submit"
            disabled={consulta.isPending}
            className="rounded-lg bg-ink px-5 py-3 text-xs font-medium text-ink-foreground disabled:opacity-50"
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
              {secuencia.map((a, i) => (
                <li key={a} className="flex items-center gap-3 text-sm">
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
                  <span className={i === indice ? "font-medium" : "text-muted-foreground"}>{a}</span>
                </li>
              ))}
            </ol>

            <p className="mt-6 text-sm">
              <span className="text-muted-foreground">Fecha estimada de entrega: </span>
              {pedido.fecha_entrega ?? "por confirmar"}
            </p>
          </article>
        ) : null}
      </div>
    </main>
  );
}
