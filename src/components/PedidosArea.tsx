import { Link, useNavigate } from "@tanstack/react-router";
import { Panel } from "@/components/AppShell";
import { usePedidosDeArea, pedidoEnAreaActual } from "@/hooks/use-pedidos-area";
import { normalizarArea, useSesion } from "@/lib/auth";
import { useMoverPedido } from "@/lib/taller-db";
import { fmtFecha } from "@/lib/utils";

export function PedidosArea({
  area,
  titulo = "Pedidos del área",
}: {
  area: string;
  titulo?: string;
}) {
  const { data: sesion } = useSesion();
  const mover = useMoverPedido();
  const navigate = useNavigate();
  const { pedidos, isLoading } = usePedidosDeArea(area);

  return (
    <Panel titulo={`${titulo} · ${pedidos.length}`}>
      <div className="divide-y divide-border">
        {isLoading ? <p className="px-5 py-8 text-sm text-muted-foreground">Cargando...</p> : null}
        {!isLoading && pedidos.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">
            No hay pedidos asignados a {area}.
          </p>
        ) : null}

        {pedidos.map((pedido) => {
          const enArea = pedidoEnAreaActual(pedido, area);
          return (
            <article key={pedido.id} className="px-4 py-4 sm:px-5">
              <button
                type="button"
                onClick={() => void navigate({ to: "/pedidos/$id", params: { id: pedido.id } })}
                className="block w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {pedido.referencia}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {pedido.cliente}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${
                      enArea
                        ? "bg-success-soft text-success"
                        : "bg-surface-muted text-muted-foreground"
                    }`}
                  >
                    {enArea ? "En trabajo" : normalizarArea(pedido.area_actual)}
                  </span>
                </div>

                <p className="mt-3 line-clamp-2 text-sm text-foreground">
                  {pedido.trabajo || pedido.pieza || "Sin trabajo definido"}
                </p>

                <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Contrato
                    </dt>
                    <dd className="mt-0.5 truncate text-foreground">{pedido.contrato || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Entrega
                    </dt>
                    <dd className="mt-0.5 text-foreground">
                      {fmtFecha(pedido.fecha_entrega ?? pedido.entrega) ?? "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Taller
                    </dt>
                    <dd className="mt-0.5 truncate text-foreground">
                      {pedido.sede_nombre || "Sin sede"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Ruta
                    </dt>
                    <dd className="mt-0.5 truncate text-foreground">
                      {pedido.ruta.map(normalizarArea).join(" -> ") || "-"}
                    </dd>
                  </div>
                </dl>
              </button>

              <div className="mt-4 flex gap-2">
                <Link
                  to="/pedidos/$id"
                  params={{ id: pedido.id }}
                  className="rounded-xl border border-border px-3 py-2.5 text-xs font-medium"
                >
                  Ficha
                </Link>
                {enArea ? (
                  <button
                    type="button"
                    disabled={mover.isPending}
                    onClick={() =>
                      mover.mutate({
                        pedido,
                        direccion: "avanzar",
                        usuarioId: sesion?.user.id ?? null,
                      })
                    }
                    className="flex-1 rounded-xl bg-ink px-3 py-2.5 text-xs font-medium text-ink-foreground disabled:opacity-50"
                  >
                    Avanzar
                  </button>
                ) : (
                  <span className="flex-1 rounded-xl bg-surface-muted px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">
                    Esperando llegada
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}
