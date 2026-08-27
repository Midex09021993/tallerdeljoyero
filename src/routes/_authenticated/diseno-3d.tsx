import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SeguimientoArea } from "@/components/SeguimientoArea";
import { AppShell, ColaProcesos, Panel, StatCard } from "@/components/AppShell";
import { VisorSTL } from "@/components/VisorSTL";
import { VisorIframe } from "@/components/VisorIframe";
import { urlEmbedVisor } from "@/lib/visor-embed";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useActualizarProceso, useArchivosPedidos, useProcesos, type ArchivoPedido } from "@/lib/taller-db";

export const Route = createFileRoute("/_authenticated/diseno-3d")({
  head: () => ({
    meta: [
      { title: "Diseño 3D — Aurum Lab" },
      {
        name: "description",
        content: "Cola de modelado CAD del taller: piezas en diseño, versiones y biblioteca de archivos STL.",
      },
      { property: "og:title", content: "Diseño 3D — Aurum Lab" },
      { property: "og:description", content: "Modelado CAD, versiones y biblioteca de piezas del taller." },
    ],
  }),
  component: Diseno3D,
});

const es3D = (nombre: string) => /\.stl$/i.test(nombre);
const esImagen = (nombre: string) => /\.(png|jpe?g|webp|gif|avif)$/i.test(nombre);

function Diseno3D() {
  const { data: cola = [], isLoading } = useProcesos("diseno");
  const actualizar = useActualizarProceso("diseno");
  const { data: archivos = [], isLoading: cargandoArchivos } = useArchivosPedidos();
  const [busca, setBusca] = useState("");
  const [modelo, setModelo] = useState<ArchivoPedido | null>(null);

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

  const filtrados = useMemo(() => {
    const ultimas = [...porGrupo.values()].map((lista) => lista[0]!);
    const q = busca.trim().toLowerCase();
    if (!q) return ultimas;
    return ultimas.filter((a) =>
      [a.nombre, a.referencia, a.cliente, a.trabajo].join(" ").toLowerCase().includes(q),
    );
  }, [porGrupo, busca]);

  const atendidos = useMemo(() => {
    const mapa = new Map<
      string,
      { pedido_id: string; referencia: string; cliente: string; trabajo: string; area_actual: string; total: number; modelos: number; ultima: string }
    >();
    for (const a of archivos) {
      const prev = mapa.get(a.pedido_id);
      if (prev) {
        prev.total += 1;
        prev.modelos += es3D(a.nombre) ? 1 : 0;
      } else {
        mapa.set(a.pedido_id, {
          pedido_id: a.pedido_id,
          referencia: a.referencia,
          cliente: a.cliente,
          trabajo: a.trabajo,
          area_actual: a.area_actual,
          total: 1,
          modelos: es3D(a.nombre) ? 1 : 0,
          ultima: a.created_at,
        });
      }
    }
    return [...mapa.values()];
  }, [archivos]);

  const totalModelos = archivos.filter((a) => es3D(a.nombre)).length;

  return (
    <AppShell
      titulo="Diseño 3D"
      subtitulo="Modelado CAD y validación de piezas antes de impresión"
      acciones={
        <>
          <StatCard etiqueta="En modelado" valor={String(cola.length)} />
          <StatCard etiqueta="Pedidos atendidos" valor={String(atendidos.length)} />
          <StatCard etiqueta="Modelos STL" valor={String(totalModelos)} />
        </>
      }
    >
      <SeguimientoArea area="Diseño 3D" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel titulo="Cola de modelado" className="lg:col-span-1">
          <ColaProcesos
            items={cola}
            cargando={isLoading}
            onProgreso={(id, progreso) => actualizar.mutate({ id, progreso })}
          />
        </Panel>

        <Panel titulo="Modelados atendidos" className="lg:col-span-2">
          <div className="overflow-x-auto">
            {cargandoArchivos ? (
              <p className="p-6 text-sm text-muted-foreground">Cargando…</p>
            ) : atendidos.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                Todavía no hay pedidos con archivos subidos por el equipo.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">REF</th>
                    <th className="px-4 py-3 text-left">Cliente</th>
                    <th className="px-4 py-3 text-left">Trabajo</th>
                    <th className="px-4 py-3 text-left">Área actual</th>
                    <th className="px-4 py-3 text-right">Archivos</th>
                  </tr>
                </thead>
                <tbody>
                  {atendidos.map((p) => (
                    <tr key={p.pedido_id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">
                        <Link to="/pedidos/$id" params={{ id: p.pedido_id }} className="hover:underline">
                          {p.referencia}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{p.cliente}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.trabajo}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.area_actual}</td>
                      <td className="px-4 py-3 text-right">
                        {p.total} {p.modelos > 0 ? <span className="text-xs text-muted-foreground">({p.modelos} STL)</span> : null}
                      </td>
                    </tr>
                  ))}
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
            {filtrados.map((a) => (
              <article key={a.id} className="rounded-xl border border-border p-3">
                <div className="mb-3 aspect-square w-full overflow-hidden rounded-lg bg-surface-muted">
                  {a.poster ? (
                    a.tipo === "visor3d" && urlEmbedVisor(a.url) ? (
                      <button type="button" onClick={() => setModelo(a)} className="block h-full w-full">
                        <img src={a.poster} alt={a.nombre} loading="lazy" className="h-full w-full object-cover" />
                      </button>
                    ) : (
                      <a href={a.url} target="_blank" rel="noreferrer" className="block h-full w-full">
                        <img src={a.poster} alt={a.nombre} loading="lazy" className="h-full w-full object-cover" />
                      </a>
                    )
                  ) : esImagen(a.nombre) ? (
                    <img src={a.url} alt={a.nombre} loading="lazy" className="h-full w-full object-cover" />
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
                    v{a.version}
                  </span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.referencia} · {a.cliente}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  {a.tipo === "visor3d" ? (
                    <button type="button" onClick={() => setModelo(a)} className="font-medium text-info hover:underline">
                      Visor realista
                    </button>
                  ) : es3D(a.nombre) ? (
                    <button type="button" onClick={() => setModelo(a)} className="font-medium text-info hover:underline">
                      Visor 3D
                    </button>
                  ) : null}
                  <a href={a.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:underline">
                    Abrir
                  </a>
                  <Link
                    to="/pedidos/$id"
                    params={{ id: a.pedido_id }}
                    className="text-muted-foreground hover:underline"
                  >
                    Pedido
                  </Link>
                </div>
              </article>
            ))}
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
                    <a href={modelo.url} target="_blank" rel="noreferrer" className="text-info hover:underline">
                      abrirlo en pestaña nueva
                    </a>
                    .
                  </p>
                </>
              ) : (
                <>
                  <VisorSTL url={modelo.url} />
                  <p className="text-xs text-muted-foreground">Arrastra para girar, rueda para acercar.</p>
                </>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
