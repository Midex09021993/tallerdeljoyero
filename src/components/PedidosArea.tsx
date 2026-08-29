import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { MobileBackButton, Panel } from "@/components/AppShell";
import { usePedidosDeArea, pedidoEnAreaActual } from "@/hooks/use-pedidos-area";
import { areaCoincide, normalizarArea, useSesion } from "@/lib/auth";
import { destinosMovimientoPedido, useEnviarAArea, type Pedido } from "@/lib/taller-db";
import { fmtFecha } from "@/lib/utils";

export function PedidosArea({
  area,
  titulo = "Pedidos del área",
  from,
  variante = "completa",
}: {
  area: string;
  titulo?: string;
  from?: string;
  variante?: "completa" | "operario";
}) {
  const { data: sesion } = useSesion();
  const navigate = useNavigate();
  const { pedidos, isLoading } = usePedidosDeArea(area);
  const origen = from ?? area;

  if (variante === "operario") {
    return (
      <ListaTrabajosMovil
        area={area}
        pedidos={pedidos}
        isLoading={isLoading}
        onAbrir={(id) =>
          void navigate({
            to: "/pedidos/$id",
            params: { id },
            search: { from: origen },
          })
        }
      />
    );
  }

  return (
    <>
      <div className="lg:hidden">
        <ListaTrabajosMovil
          area={area}
          pedidos={pedidos}
          isLoading={isLoading}
          onAbrir={(id) =>
            void navigate({
              to: "/pedidos/$id",
              params: { id },
              search: { from: origen },
            })
          }
        />
      </div>

      <div className="hidden lg:block">
        <Panel titulo={`${titulo} · ${pedidos.length}`}>
          <div className="divide-y divide-border">
            {isLoading ? (
              <p className="px-5 py-8 text-sm text-muted-foreground">Cargando...</p>
            ) : null}
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
                    onClick={() =>
                      void navigate({
                        to: "/pedidos/$id",
                        params: { id: pedido.id },
                        search: { from: origen },
                      })
                    }
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
                        <dd className="mt-0.5 truncate text-foreground">
                          {pedido.contrato || "-"}
                        </dd>
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
                      search={{ from: origen }}
                      className="rounded-xl border border-border px-3 py-2.5 text-xs font-medium"
                    >
                      Ficha
                    </Link>
                    {enArea ? (
                      <MovimientoPedidoInline pedido={pedido} />
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
      </div>
    </>
  );
}

function MovimientoPedidoInline({ pedido }: { pedido: Pedido }) {
  const { data: sesion } = useSesion();
  const enviar = useEnviarAArea();
  const [destino, setDestino] = useState("");
  const destinos = destinosMovimientoPedido(pedido, {
    esAdmin: Boolean(sesion?.esAdmin),
    areasUsuario: sesion?.areas ?? [],
  });

  return (
    <div className="grid flex-1 grid-cols-[minmax(0,1fr)_auto] gap-2">
      <label className="sr-only" htmlFor={`mover-${pedido.id}`}>
        Área destino
      </label>
      <select
        id={`mover-${pedido.id}`}
        value={destino}
        onChange={(e) => setDestino(e.target.value)}
        disabled={enviar.isPending}
        className="min-w-0 rounded-xl border border-border bg-card px-3 py-2.5 text-xs text-foreground disabled:opacity-50"
      >
        <option value="">Mover pedido...</option>
        {destinos.map((area) => (
          <option key={area} value={area}>
            {normalizarArea(area)}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={enviar.isPending || !destino}
        onClick={() => {
          enviar.mutate(
            {
              pedido,
              destino,
              usuarioId: sesion?.user.id ?? null,
            },
            { onSuccess: () => setDestino("") },
          );
        }}
        className="rounded-xl bg-ink px-3 py-2.5 text-xs font-medium text-ink-foreground disabled:opacity-50"
      >
        Mover
      </button>
    </div>
  );
}

function estadoTrabajoArea(pedido: { area_actual: string; ruta: string[] }, area: string) {
  if (areaCoincide(pedido.area_actual, area)) return "En trabajo";
  const ruta = Array.isArray(pedido.ruta) ? pedido.ruta.map(normalizarArea) : [];
  const indiceArea = ruta.findIndex((item) => areaCoincide(item, area));
  const indiceActual = ruta.findIndex((item) => areaCoincide(item, pedido.area_actual));
  if (indiceArea >= 0 && indiceActual > indiceArea) return "Terminado";
  if (areaCoincide(pedido.area_actual, "Área ventas") && indiceArea >= 0) return "Terminado";
  return "Asignado";
}

function clasesEstadoTrabajo(estado: string) {
  if (estado === "En trabajo") return "bg-info-soft text-info";
  if (estado === "Terminado") return "bg-success-soft text-success";
  return "bg-surface-muted text-muted-foreground";
}

function ListaTrabajosMovil({
  area,
  pedidos,
  isLoading,
  onAbrir,
}: {
  area: string;
  pedidos: ReturnType<typeof usePedidosDeArea>["pedidos"];
  isLoading: boolean;
  onAbrir: (id: string) => void;
}) {
  const pendientes = pedidos.filter((pedido) => estadoTrabajoArea(pedido, area) !== "Terminado");

  return (
    <section className="space-y-3">
      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-card">
          Cargando trabajos...
        </div>
      ) : null}

      {!isLoading && pedidos.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-base font-semibold">Sin trabajos en {area}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuando se asigne un pedido a esta área aparecerá aquí.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        {pedidos.map((pedido) => {
          const estado = estadoTrabajoArea(pedido, area);
          const entrega = fmtFecha(pedido.fecha_entrega ?? pedido.entrega) ?? "-";
          return (
            <button
              key={pedido.id}
              type="button"
              onClick={() => onAbrir(pedido.id)}
              className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-card transition hover:border-gold active:border-gold active:bg-surface-muted focus-visible:border-gold focus-visible:outline-none"
              aria-label={`Abrir pedido ${pedido.referencia}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-foreground">
                    {pedido.referencia}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {pedido.cliente || "Sin cliente"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${clasesEstadoTrabajo(
                    estado,
                  )}`}
                >
                  {estado}
                </span>
              </div>

              <p className="mt-3 line-clamp-2 text-sm text-foreground">
                {pedido.trabajo || pedido.pieza || "Sin trabajo definido"}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-surface-muted p-3">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Área</p>
                  <p className="mt-1 truncate font-medium text-foreground">
                    {normalizarArea(pedido.area_actual)}
                  </p>
                </div>
                <div className="rounded-xl bg-surface-muted p-3">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                    Entrega
                  </p>
                  <p className="mt-1 truncate font-medium text-foreground">{entrega}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="truncate text-xs text-muted-foreground">
                  {pedido.contrato ? `Contrato ${pedido.contrato}` : pedido.sede_nombre || ""}
                </span>
                <span className="rounded-full bg-ink px-3 py-2 text-xs font-semibold text-ink-foreground">
                  Abrir
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {!isLoading && pedidos.length > 0 ? (
        <p className="px-1 text-xs text-muted-foreground">
          {pendientes.length} pendiente{pendientes.length === 1 ? "" : "s"} en esta área.
        </p>
      ) : null}
    </section>
  );
}

export function AreaOperario({ area, children }: { area: string; children?: ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-8 text-foreground sm:px-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-3xl">{area}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Trabajos asignados</p>
        </div>
        <MobileBackButton atrasMovil={{ to: "/inicio" }} />
      </header>
      <PedidosArea area={area} from={area} variante="operario" />
      {children ? <div className="mt-5">{children}</div> : null}
    </main>
  );
}
