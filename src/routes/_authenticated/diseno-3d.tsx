import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PedidosArea } from "@/components/PedidosArea";
import { SelectorSedeDueno, useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";
import { usePedidosDeArea } from "@/hooks/use-pedidos-area";
import { AppShell, Panel, StatCard } from "@/components/AppShell";
import { VisorSTL } from "@/components/VisorSTL";
import { VisorIframe } from "@/components/VisorIframe";
import { urlEmbedVisor } from "@/lib/visor-embed";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { areaCoincide } from "@/lib/auth";
import { useArchivosPedidos, usePedidos, type ArchivoPedido, type Pedido } from "@/lib/taller-db";

export const Route = createFileRoute("/_authenticated/diseno-3d")({
  head: () => ({
    meta: [
      { title: "Diseño 3D — Aurum Lab" },
      {
        name: "description",
        content:
          "Cola de modelado CAD del taller: piezas en diseño, versiones y biblioteca de archivos STL.",
      },
      { property: "og:title", content: "Diseño 3D — Aurum Lab" },
      {
        property: "og:description",
        content: "Modelado CAD, versiones y biblioteca de piezas del taller.",
      },
    ],
  }),
  component: Diseno3D,
});

const es3D = (nombre: string) => /\.(stl|3mf)$/i.test(nombre);
const esImagen = (nombre: string) => /\.(png|jpe?g|webp|gif|avif)$/i.test(nombre);
const esModelo = (a: ArchivoPedido) => a.tipo === "visor3d" || es3D(a.nombre);
const prioridadPortada = (a: ArchivoPedido) => {
  if (a.poster || esImagen(a.nombre)) return 0;
  if (esModelo(a)) return 1;
  return 2;
};
const archivoValido = (archivo: ArchivoPedido | undefined): archivo is ArchivoPedido =>
  Boolean(archivo);

function Diseno3D() {
  const { data: pedidos = [], isLoading: cargandoPedidos } = usePedidos();
  const { data: archivos = [], isLoading: cargandoArchivos } = useArchivosPedidos();
  const { esDueno, sedeFiltro, setSedeFiltro, sedes, filtrarPedidos, etiquetaSede } =
    useSedeFiltroDueno();
  const { enTrabajo, pedidos: pedidosArea } = usePedidosDeArea("Diseño 3D");
  const [busca, setBusca] = useState("");
  const [modelo, setModelo] = useState<ArchivoPedido | null>(null);
  const navigate = useNavigate();
  const pedidosFiltrados = useMemo(() => filtrarPedidos(pedidos), [filtrarPedidos, pedidos]);

  /** Agrupa todos los archivos por pedido. */
  const archivosPorPedido = useMemo(() => {
    const mapa = new Map<string, ArchivoPedido[]>();
    for (const a of archivos) {
      const lista = mapa.get(a.pedido_id) ?? [];
      lista.push(a);
      mapa.set(a.pedido_id, lista);
    }
    return mapa;
  }, [archivos]);

  /** Pedidos que están en Diseño 3D y aún no tienen modelo cargado. */
  const cola = useMemo(() => {
    return pedidosFiltrados
      .filter((p) => areaCoincide(p.area_actual, "Diseño 3D"))
      .filter((p) => !(archivosPorPedido.get(p.id) ?? []).some(esModelo));
  }, [pedidosFiltrados, archivosPorPedido]);

  /** Pedidos con al menos un modelo (STL/3MF/visor 3D). */
  const atendidos = useMemo(() => {
    const vistos = new Set<string>();
    const lista: Pedido[] = [];
    for (const a of archivos) {
      if (!esModelo(a) || vistos.has(a.pedido_id)) continue;
      const pedido = pedidosFiltrados.find((p) => p.id === a.pedido_id);
      if (pedido) {
        vistos.add(a.pedido_id);
        lista.push(pedido);
      }
    }
    return lista;
  }, [archivos, pedidosFiltrados]);

  /** Todas las versiones agrupadas por pedido + grupo, más recientes primero. */
  const porGrupo = useMemo(() => {
    const mapa = new Map<string, ArchivoPedido[]>();
    for (const a of archivos) {
      const clave = `${a.pedido_id}::${a.grupo || a.nombre.toLowerCase()}`;
      const lista = mapa.get(clave) ?? [];
      lista.push(a);
      mapa.set(clave, lista);
    }
    for (const lista of mapa.values()) lista.sort((x, y) => y.version - x.version);
    return mapa;
  }, [archivos]);

  const claveDe = (a: ArchivoPedido) => `${a.pedido_id}::${a.grupo || a.nombre.toLowerCase()}`;

  /** Biblioteca compacta: una sola portada por pedido. */
  const bibliotecaPorPedido = useMemo(() => {
    const pedidosVisibles = new Set(pedidosFiltrados.map((pedido) => pedido.id));
    return [...archivosPorPedido.values()]
      .filter((lista) => lista[0]?.pedido_id && pedidosVisibles.has(lista[0].pedido_id))
      .map(
        (lista) =>
          [...lista].sort((a, b) => {
            const prioridad = prioridadPortada(a) - prioridadPortada(b);
            if (prioridad !== 0) return prioridad;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          })[0],
      )
      .filter(archivoValido);
  }, [archivosPorPedido, pedidosFiltrados]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return bibliotecaPorPedido;
    return bibliotecaPorPedido.filter((portada) =>
      (archivosPorPedido.get(portada.pedido_id) ?? []).some((archivo) =>
        [archivo.nombre, archivo.referencia, archivo.cliente, archivo.trabajo, archivo.area_actual]
          .join(" ")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [archivosPorPedido, bibliotecaPorPedido, busca]);

  const totalModelos = archivos.filter(esModelo).length;

  return (
    <AppShell
      titulo="Diseño 3D"
      subtitulo={`Modelado CAD y validación de piezas · ${etiquetaSede}`}
      acciones={
        <>
          <SelectorSedeDueno
            esDueno={esDueno}
            sedes={sedes}
            value={sedeFiltro}
            onChange={setSedeFiltro}
          />
          <StatCard etiqueta="En modelado" valor={String(cola.length)} />
          <StatCard etiqueta="Asignados" valor={String(pedidosArea.length)} />
          <StatCard etiqueta="En trabajo" valor={String(enTrabajo.length)} />
          <StatCard etiqueta="Modelos STL" valor={String(totalModelos)} />
        </>
      }
    >
      <PedidosArea area="Diseño 3D" titulo="Pedidos asignados a Diseño 3D" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel titulo="Cola de modelado" className="lg:col-span-1">
          <ColaModelado
            items={cola}
            cargando={cargandoPedidos || cargandoArchivos}
            contarModelos={(pedidoId) =>
              (archivosPorPedido.get(pedidoId) ?? []).filter(esModelo).length
            }
          />
        </Panel>

        <Panel titulo="Modelos atendidos" className="lg:col-span-2">
          <div className="overflow-x-auto">
            {cargandoPedidos || cargandoArchivos ? (
              <p className="p-6 text-sm text-muted-foreground">Cargando…</p>
            ) : atendidos.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                Todavía no hay pedidos con modelos subidos por el equipo.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">REF</th>
                    <th className="px-4 py-3 text-left">Cliente</th>
                    <th className="px-4 py-3 text-left">Trabajo</th>
                    <th className="px-4 py-3 text-left">Área actual</th>
                    <th className="px-4 py-3 text-right">Modelos</th>
                  </tr>
                </thead>
                <tbody>
                  {atendidos.map((p) => {
                    const modelosPedido = (archivosPorPedido.get(p.id) ?? []).filter(
                      esModelo,
                    ).length;
                    return (
                      <tr
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          void navigate({
                            to: "/pedidos/$id",
                            params: { id: p.id },
                            search: { from: "diseno-3d" },
                          })
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            void navigate({
                              to: "/pedidos/$id",
                              params: { id: p.id },
                              search: { from: "diseno-3d" },
                            });
                          }
                        }}
                        className="cursor-pointer border-t border-border transition-colors hover:bg-surface-muted/70 focus-visible:bg-surface-muted/70 focus-visible:outline-none"
                        aria-label={`Abrir pedido ${p.referencia}`}
                      >
                        <td className="px-4 py-3 font-medium">{p.referencia}</td>
                        <td className="px-4 py-3">{p.cliente}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.trabajo}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.area_actual}</td>
                        <td className="px-4 py-3 text-right">{modelosPedido}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Panel>
      </div>

      <Panel
        titulo="Biblioteca de archivos"
        accion={
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por REF, cliente o archivo…"
            className="h-9 w-56 rounded-lg border border-border bg-background px-3 text-sm"
          />
        }
      >
        {cargandoArchivos ? (
          <p className="p-6 text-sm text-muted-foreground">Cargando biblioteca…</p>
        ) : filtrados.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No hay archivos que coincidan.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 p-6 md:grid-cols-3 lg:grid-cols-4">
            {filtrados.map((a) => {
              const totalPedido = archivosPorPedido.get(a.pedido_id)?.length ?? 1;
              return (
                <article key={a.pedido_id} className="rounded-xl border border-border p-3">
                  <div className="mb-3 aspect-square w-full overflow-hidden rounded-lg bg-surface-muted">
                    {a.poster ? (
                      a.tipo === "visor3d" && urlEmbedVisor(a.url) ? (
                        <button
                          type="button"
                          onClick={() => setModelo(a)}
                          className="block h-full w-full"
                        >
                          <img
                            src={a.poster}
                            alt={a.nombre}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ) : (
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block h-full w-full"
                        >
                          <img
                            src={a.poster}
                            alt={a.nombre}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </a>
                      )
                    ) : esImagen(a.nombre) ? (
                      <img
                        src={a.url}
                        alt={a.nombre}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => es3D(a.nombre) && setModelo(a)}
                        className="flex h-full w-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground"
                      >
                        <span className="text-2xl">{es3D(a.nombre) ? "◈" : "▤"}</span>
                        {es3D(a.nombre) ? "Ver en 3D" : a.nombre.split(".").pop()?.toUpperCase()}
                      </button>
                    )}
                  </div>
                  <p className="flex items-center gap-2 text-xs font-medium">
                    <span className="truncate" title={a.nombre}>
                      {a.nombre}
                    </span>
                    <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {totalPedido} archivo{totalPedido === 1 ? "" : "s"}
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.referencia} · {a.cliente}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    {a.tipo === "visor3d" ? (
                      <button
                        type="button"
                        onClick={() => setModelo(a)}
                        className="font-medium text-info hover:underline"
                      >
                        Visor realista
                      </button>
                    ) : es3D(a.nombre) ? (
                      <button
                        type="button"
                        onClick={() => setModelo(a)}
                        className="font-medium text-info hover:underline"
                      >
                        Visor 3D
                      </button>
                    ) : null}
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:underline"
                    >
                      Abrir
                    </a>
                    <Link
                      to="/pedidos/$id"
                      params={{ id: a.pedido_id }}
                      search={{ from: "diseno-3d" }}
                      className="text-muted-foreground hover:underline"
                    >
                      Pedido
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Panel>

      <Dialog open={modelo !== null} onOpenChange={(o) => !o && setModelo(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {modelo?.nombre} — {modelo?.referencia}
            </DialogTitle>
          </DialogHeader>
          {modelo ? (
            <>
              {(porGrupo.get(claveDe(modelo)) ?? []).length > 1 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Versión:</span>
                  {(porGrupo.get(claveDe(modelo)) ?? []).map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setModelo(v)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        v.id === modelo.id
                          ? "border-info bg-info/10 text-info"
                          : "border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      v{v.version}
                    </button>
                  ))}
                </div>
              ) : null}
              {modelo.tipo === "visor3d" && urlEmbedVisor(modelo.url) ? (
                <>
                  <VisorIframe url={urlEmbedVisor(modelo.url)!} titulo={modelo.nombre} />
                  <p className="text-xs text-muted-foreground">
                    Visor realista interactivo — también puedes{" "}
                    <a
                      href={modelo.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-info hover:underline"
                    >
                      abrirlo en pestaña nueva
                    </a>
                    .
                  </p>
                </>
              ) : (
                <>
                  <VisorSTL url={modelo.url} />
                  <p className="text-xs text-muted-foreground">
                    Arrastra para girar, rueda para acercar.
                  </p>
                </>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function ColaModelado({
  items,
  cargando,
  contarModelos,
}: {
  items: Pedido[];
  cargando?: boolean;
  contarModelos: (pedidoId: string) => number;
}) {
  if (cargando) {
    return <p className="px-6 py-8 text-sm text-muted-foreground">Cargando…</p>;
  }
  if (items.length === 0) {
    return (
      <p className="px-6 py-8 text-sm text-muted-foreground">
        No hay pedidos pendientes de modelado.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            to="/pedidos/$id"
            params={{ id: item.id }}
            search={{ from: "diseno-3d" }}
            className="block px-5 py-4 transition-colors hover:bg-surface-muted/70 focus-visible:bg-surface-muted/70 focus-visible:outline-none sm:px-6"
            aria-label={`Abrir pedido ${item.referencia}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{item.referencia}</p>
                <p className="mt-1 truncate text-sm text-foreground">{item.cliente}</p>
              </div>
              <span className="shrink-0 rounded-full bg-info-soft px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-info">
                {item.area_actual}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
              {item.trabajo || item.pieza || "Sin trabajo definido"}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <span>
                <strong className="block font-medium text-foreground">Trabajo</strong>
                <span className="line-clamp-1">{item.pieza || "Pedido"}</span>
              </span>
              <span className="text-right">
                <strong className="block font-medium text-foreground">Modelos</strong>
                {contarModelos(item.id)}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
