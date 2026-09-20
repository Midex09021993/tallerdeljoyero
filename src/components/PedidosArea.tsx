import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { AppShell, MobileBackButton, Panel } from "@/components/AppShell";
import { usePedidosDeArea, pedidoEnAreaActual, useTrabajosDelOperario, type PedidoOperativo, type TrabajoBandeja } from "@/hooks/use-pedidos-area";
import { areaCoincide, normalizarArea, useSesion } from "@/lib/auth";
import { destinosMovimientoPedido, useEnviarAArea } from "@/lib/taller-db";
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
  variante?: "completa" | "operario" | "ficha-dorada";
}) {
  const { data: sesion } = useSesion();
  const navigate = useNavigate();
  const { pedidos, isLoading } = usePedidosDeArea(area);
  const { trabajos: trabajosOperario, isLoading: isLoadingTrabajos } = useTrabajosDelOperario();
  const trabajosArea = trabajosOperario.filter((trabajo) => areaCoincide(trabajo.area, area));
  const origen = from ?? area;

  if (variante === "operario") {
    return (
      <ListaTrabajosOperario
        area={area}
        trabajos={trabajosArea}
        pedidos={pedidos}
        isLoading={isLoadingTrabajos || isLoading}
        onAbrir={(id) =>
          void navigate({
            to: "/trabajos/$id",
            params: { id },
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
                <article key={pedido.id} className={`px-4 py-4 sm:px-5 ${variante === "ficha-dorada" ? "mx-3 my-3 rounded-2xl border border-gold/25 bg-card shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-raised" : ""}`}>
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

                    <DetallesTecnicosArea pedido={pedido} area={area} />

                    <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                      <div>
                        <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Sede
                        </dt>
                        <dd className="mt-0.5 truncate text-foreground">
                          {pedido.sede_nombre || "-"}
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

                  <div className="mt-4 flex items-start gap-3">
                    <Link
                      to="/pedidos/$id"
                      params={{ id: pedido.id }}
                      search={{ from: origen }}
                      className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-border px-5 text-xs font-medium"
                    >
                      Ficha
                    </Link>
                    {enArea ? (
                      <MovimientoPedidoInline pedido={pedido} />
                    ) : (
                      <span className="inline-flex h-10 shrink-0 items-center rounded-full bg-surface-muted px-4 text-xs font-medium text-muted-foreground">
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

function MovimientoPedidoInline({ pedido }: { pedido: PedidoOperativo }) {
  const { data: sesion } = useSesion();
  const enviar = useEnviarAArea();
  const [destino, setDestino] = useState("");
  const [motivo, setMotivo] = useState("");
  const destinos = destinosMovimientoPedido(pedido, {
    esAdmin: Boolean(sesion?.esAdmin),
    areasUsuario: sesion?.areas ?? [],
  });
  const reiniciaFlujo = areaCoincide(destino, "Pedidos");

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <label className="sr-only" htmlFor={`mover-${pedido.id}`}>
          Área destino
        </label>
        <select
          id={`mover-${pedido.id}`}
          value={destino}
          onChange={(e) => {
            setDestino(e.target.value);
            if (!areaCoincide(e.target.value, "Pedidos")) setMotivo("");
          }}
          disabled={enviar.isPending}
          className="h-10 min-w-0 rounded-xl border border-border bg-card px-3 text-xs text-foreground disabled:opacity-50"
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
          disabled={enviar.isPending || !destino || (reiniciaFlujo && !motivo.trim())}
          onClick={() => {
            enviar.mutate(
              {
                pedido,
                destino,
                usuarioId: sesion?.user.id ?? null,
                motivo,
              },
              {
                onSuccess: () => {
                  setDestino("");
                  setMotivo("");
                },
              },
            );
          }}
          className="h-10 shrink-0 rounded-xl bg-ink px-5 text-xs font-medium text-ink-foreground disabled:opacity-50"
        >
          Mover
        </button>
      </div>
      {reiniciaFlujo ? (
        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          disabled={enviar.isPending}
          placeholder="Motivo del retorno a Pedidos"
          className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground disabled:opacity-50"
        />
      ) : null}
    </div>
  );
}

function detallesTecnicosArea(pedido: PedidoOperativo, area: string) {
  const normalizada = normalizarArea(area);
  if (areaCoincide(normalizada, "Diseño 3D")) {
    return [
      ["Talla", pedido.talla || "—"],
      ["Material", pedido.material || "—"],
      ["Piedras", pedido.piedras || "—"],
      ["Peso", pedido.peso_estimado || "—"],
    ] as const;
  }
  if (areaCoincide(normalizada, "Impresión 3D")) {
    return [
      ["Material", pedido.material || "—"],
      ["Cantidad", String(pedido.cantidad_piezas || 1)],
      ["Peso", pedido.peso_estimado || "—"],
      ["Talla", pedido.talla || "—"],
    ] as const;
  }
  if (areaCoincide(normalizada, "Casting")) {
    return [
      ["Metal", pedido.material || "—"],
      ["Peso", pedido.peso_estimado || "—"],
      ["Cantidad", String(pedido.cantidad_piezas || 1)],
      ["Piedras", pedido.piedras || "—"],
    ] as const;
  }
  if (areaCoincide(normalizada, "Corte Láser")) {
    return [
      ["Texto", pedido.corte_texto || "—"],
      ["Ubicación", pedido.corte_ubicacion || "—"],
      ["Tipografía", pedido.corte_tipografia || "—"],
      ["Observaciones", pedido.corte_observaciones || "—"],
    ] as const;
  }
  return [
    ["Material", pedido.material || "—"],
    ["Talla", pedido.talla || "—"],
    ["Piedras", pedido.piedras || "—"],
    ["Peso", pedido.peso_estimado || "—"],
  ] as const;
}

function DetallesTecnicosArea({ pedido, area }: { pedido: PedidoOperativo; area: string }) {
  return (
    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
      {detallesTecnicosArea(pedido, area).map(([etiqueta, valor]) => (
        <div key={etiqueta} className="rounded-xl bg-surface-muted p-2.5">
          <dt className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            {etiqueta}
          </dt>
          <dd className="mt-1 truncate font-medium text-foreground">{valor}</dd>
        </div>
      ))}
    </dl>
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

function estadoTrabajoOperario(estado: TrabajoBandeja["estado"]) {
  if (estado === "en_proceso") return "En proceso";
  if (estado === "bloqueado") return "Bloqueado";
  return "Pendiente";
}

function clasesEstadoTrabajoOperario(estado: TrabajoBandeja["estado"]) {
  if (estado === "en_proceso") return "bg-info-soft text-info";
  if (estado === "bloqueado") return "bg-danger-soft text-danger";
  return "bg-surface-muted text-muted-foreground";
}

function ListaTrabajosOperario({
  area,
  trabajos,
  pedidos,
  isLoading,
  onAbrir,
}: {
  area: string;
  trabajos: TrabajoBandeja[];
  pedidos: ReturnType<typeof usePedidosDeArea>["pedidos"];
  isLoading: boolean;
  onAbrir: (id: string) => void;
}) {
  const pedidosPorId = new Map(pedidos.map((pedido) => [pedido.id, pedido]));

  return (
    <section className="space-y-3">
      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-card">
          Cargando trabajos...
        </div>
      ) : null}

      {!isLoading && trabajos.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-base font-semibold">Sin trabajos asignados en {area}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuando Daniela te asigne un trabajo aparecerá aquí.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        {trabajos.map((trabajo) => {
          const pedido = pedidosPorId.get(trabajo.pedido_id);
          const estado = estadoTrabajoOperario(trabajo.estado);
          return (
            <button
              key={trabajo.id}
              type="button"
              onClick={() => onAbrir(trabajo.id)}
              className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-card transition-all duration-300 hover:border-gold active:border-gold active:bg-surface-muted focus-visible:border-gold focus-visible:outline-none"
              aria-label={`Abrir trabajo ${trabajo.titulo || "sin título"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-foreground">
                    {trabajo.titulo || "Trabajo sin título"}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {pedido?.cliente || "Pedido del taller"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${clasesEstadoTrabajoOperario(trabajo.estado)}`}
                >
                  {estado}
                </span>
              </div>

              <p className="mt-3 line-clamp-2 text-sm text-foreground">
                {trabajo.descripcion || trabajo.titulo || "Sin descripción"}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-surface-muted p-3">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Pedido</p>
                  <p className="mt-1 truncate font-medium text-foreground">
                    {pedido?.referencia || trabajo.pedido_id.slice(0, 8)}
                  </p>
                </div>
                <div className="rounded-xl bg-surface-muted p-3">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Prioridad</p>
                  <p className="mt-1 truncate font-medium text-foreground">
                    {trabajo.prioridad}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="truncate text-xs text-muted-foreground">
                  {pedido?.contrato ? `Contrato ${pedido.contrato}` : area}
                </span>
                <span className="rounded-full bg-ink px-3 py-2 text-xs font-semibold text-ink-foreground">
                  Abrir trabajo
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {!isLoading && trabajos.length > 0 ? (
        <p className="px-1 text-xs text-muted-foreground">
          {trabajos.length} trabajo{trabajos.length === 1 ? "" : "s"} pendiente{trabajos.length === 1 ? "" : "s"} en esta área.
        </p>
      ) : null}
    </section>
  );
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

              <DetallesTecnicosArea pedido={pedido} area={area} />

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
                  {pedido.sede_nombre || area}
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

/** Escritorio = mismo umbral que la barra lateral del AppShell (lg). */
function useEscritorio() {
  const [escritorio, setEscritorio] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const aplicar = () => setEscritorio(mql.matches);
    aplicar();
    mql.addEventListener("change", aplicar);
    return () => mql.removeEventListener("change", aplicar);
  }, []);
  return escritorio;
}

export function AreaOperario({ area, children }: { area: string; children?: ReactNode }) {
  const { data: sesion, isLoading } = useSesion();
  const navigate = useNavigate();
  const escritorio = useEscritorio();

  const asignadas = sesion?.areas ?? [];
  const autorizado = asignadas.some((asignada) => areaCoincide(asignada, area));

  useEffect(() => {
    if (isLoading || !sesion) return;
    if (sesion.rolPrincipal === "operario" && !autorizado) {
      void navigate({ to: "/operario", replace: true });
    }
  }, [autorizado, isLoading, navigate, sesion]);

  if (sesion && sesion.rolPrincipal === "operario" && !autorizado) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-6 text-center text-foreground">
        <div>
          <h1 className="font-display text-2xl">Área no asignada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ya no tienes acceso a {area}. Te llevamos a tus áreas de trabajo.
          </p>
        </div>
      </main>
    );
  }

  if (escritorio) {
    // En PC el operario usa la misma estructura visual que dueño y gerente.
    return (
      <AppShell titulo={area} subtitulo="Trabajos asignados" atrasMovil={false}>
        <PedidosArea area={area} from={area} variante="operario" />
        {children ? <div className="mt-5">{children}</div> : null}
      </AppShell>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-8 text-foreground sm:px-6">
      <header className="sticky top-0 z-30 -mx-4 mb-3 flex items-center justify-between gap-3 bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
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
