import { ArrowUpRight, Building2, CheckCircle2, ChevronDown, Clock3, ExternalLink, FileArchive, PackageCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useServiciosExternosRecibidos } from "@/hooks/use-servicios-externos";

function etiquetaEstado(estado: string) {
  if (estado === "en_proceso") return "En proceso";
  if (estado === "bloqueado") return "Bloqueado";
  return "Pendiente";
}

const requisitosPorArea: Record<string, string[]> = {
  "Diseño 3D": ["3dm"],
  "Impresión 3D": ["stl", "3mf"],
  "Casting": ["stl", "3dm"],
  "Corte Láser": ["dxf"],
  Taller: ["pdf", "png", "jpg", "jpeg"],
};

function extensionArchivo(nombre: string) {
  return nombre.toLowerCase().split(".").pop() ?? "";
}

export function ServiciosExternosRecibidos() {
  const { data: servicios = [], isLoading, error } = useServiciosExternosRecibidos();
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});

  const pedidos = useMemo(() => {
    const grupos = new Map<string, typeof servicios>();
    const ordenFabricacion = ["Diseño 3D", "Impresión 3D", "Casting", "Corte Láser", "Taller"];

    for (const servicio of servicios) {
      const actual = grupos.get(servicio.pedido_id) ?? [];
      actual.push(servicio);
      grupos.set(servicio.pedido_id, actual);
    }

    return Array.from(grupos.values()).map((grupo) =>
      [...grupo].sort((a, b) => {
        const ia = ordenFabricacion.indexOf(a.area);
        const ib = ordenFabricacion.indexOf(b.area);
        return (ia === -1 ? Number.MAX_SAFE_INTEGER : ia) - (ib === -1 ? Number.MAX_SAFE_INTEGER : ib);
      }),
    );
  }, [servicios]);

  if (isLoading) {
    return <section className="rounded-2xl border border-gold/20 bg-card p-5 shadow-card"><p className="text-sm text-muted-foreground">Cargando pedidos recibidos…</p></section>;
  }

  if (error) {
    return <section className="rounded-2xl border border-danger/30 bg-danger-soft p-5"><p className="text-sm font-semibold text-danger">No se pudieron cargar los pedidos recibidos.</p><p className="mt-1 text-xs text-danger/80">{error instanceof Error ? error.message : "Error de comunicación"}</p></section>;
  }

  return (
    <section className="rounded-2xl border border-gold/25 bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <div className="flex items-center gap-2">
            <ExternalLink className="size-5 text-gold-deep" />
            <h2 className="text-lg font-semibold">Pedidos recibidos</h2>
            {pedidos.length > 0 ? <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold-deep">{pedidos.length}</span> : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Un pedido, una ficha técnica. Cada área ejecuta únicamente la operación que le corresponde.</p>
        </div>
      </div>

      {pedidos.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">No hay pedidos externos pendientes.</div>
      ) : (
        <div className="divide-y divide-border">
          {pedidos.map((grupo) => {
            const primero = grupo[0];
            const abierto = abiertos[primero.pedido_id] ?? true;
            const pendientes = grupo.filter((s) => s.estado === "pendiente").length;

            return <PedidoTecnicoRecibido
              key={primero.pedido_id}
              grupo={grupo}
              abierto={abierto}
              pendientes={pendientes}
              onToggle={() => setAbiertos((actual) => ({ ...actual, [primero.pedido_id]: !abierto }))}
            />;
          })}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-border p-4 text-[11px] text-muted-foreground">
        <PackageCheck className="size-4 text-gold-deep" />
        La ficha técnica comparte información operativa y archivos necesarios. Los costos y datos comerciales internos del taller de origen no se comparten.
      </div>
    </section>
  );
}

function PedidoTecnicoRecibido({
  grupo,
  abierto,
  pendientes,
  onToggle,
}: {
  grupo: ReturnType<typeof useServiciosExternosRecibidos>["data"];
  abierto: boolean;
  pendientes: number;
  onToggle: () => void;
}) {
  const servicios = grupo ?? [];
  const primero = servicios[0];

  const { data: ficha, isLoading: cargandoFicha } = useQuery({
    queryKey: ["ficha-tecnica-pedido-recibido", primero?.id],
    enabled: Boolean(abierto && primero?.id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("obtener_ficha_servicio_externo", {
        _trabajo_id: primero.id,
      });
      if (error) throw error;
      return data as {
        pedido?: Record<string, unknown>;
        materiales?: Array<Record<string, unknown>>;
        archivos?: Array<Record<string, unknown>>;
      };
    },
    staleTime: 15_000,
  });

  const archivos = (ficha?.archivos ?? []) as Array<{
    id: string;
    nombre: string;
    tipo: string;
    url: string;
    es_enlace: boolean;
  }>;

  const archivosConUrl = useQuery({
    queryKey: ["ficha-tecnica-archivos-recibidos", primero?.id, archivos.map((a) => a.id).join("|")],
    enabled: archivos.length > 0,
    queryFn: async () => Promise.all(archivos.map(async (archivo) => {
      if (!archivo.url || archivo.es_enlace) return archivo;
      const { data } = await supabase.storage.from("pedidos").createSignedUrl(archivo.url, 3600);
      return { ...archivo, url: data?.signedUrl ?? "" };
    })),
    staleTime: 50 * 60 * 1000,
  });

  const archivosVisibles = archivosConUrl.data ?? archivos;
  const pedido = ficha?.pedido ?? {};

  return (
    <div className="p-4 sm:p-5">
      <button type="button" onClick={onToggle} className="w-full text-left">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold">{primero.referencia_pedido || "Pedido sin referencia"}</p>
              <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gold-deep">Ficha técnica</span>
              <span className="text-xs text-muted-foreground">{servicios.length} operaciones</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Building2 className="size-3.5" /> Solicita: {primero.origen_participante_nombre}</span>
              <span>{primero.pieza || "Pieza sin nombre"}</span>
              <span>{primero.cantidad_piezas ?? "—"} pieza(s)</span>
              {pendientes > 0 ? <span>{pendientes} pendiente(s)</span> : null}
            </div>
          </div>
          <ChevronDown className={`size-5 shrink-0 text-muted-foreground transition-transform ${abierto ? "rotate-180" : ""}`} />
        </div>
      </button>

      {abierto ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-xl border border-border bg-surface-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ficha técnica del pedido</p>
                <p className="mt-1 text-sm font-semibold">{String(pedido.pieza ?? primero.pieza ?? "Pieza sin nombre")}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>Material: <span className="font-medium text-foreground">{String(pedido.material ?? primero.material ?? "—")}</span></p>
                <p>Cantidad: <span className="font-medium text-foreground">{String(pedido.cantidad_piezas ?? primero.cantidad_piezas ?? "—")}</span></p>
              </div>
            </div>
            {pedido.trabajo ? <p className="mt-3 text-xs text-muted-foreground">{String(pedido.trabajo)}</p> : null}
            {pedido.notas ? <p className="mt-2 text-xs text-muted-foreground">{String(pedido.notas)}</p> : null}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Operaciones</p>
                <p className="mt-1 text-xs text-muted-foreground">Cada área toma y ejecuta su operación desde esta misma ficha.</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-border">
              {servicios.map((servicio) => {
                const requisitos = requisitosPorArea[servicio.area] ?? [];
                const disponibles = archivosVisibles.filter((archivo) => requisitos.includes(extensionArchivo(archivo.nombre)));
                const cumpleArchivo = requisitos.length === 0 || disponibles.length > 0;

                return (
                  <div key={servicio.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-4 last:border-b-0">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{servicio.area}</p>
                        <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gold-deep">{etiquetaEstado(servicio.estado)}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Prioridad: {servicio.prioridad}</span>
                        <span>{servicio.cantidad_piezas ?? "—"} pieza(s)</span>
                        {requisitos.length > 0 ? <span>Entrada: {requisitos.map((r) => r.toUpperCase()).join(" / ")}</span> : null}
                        {requisitos.length > 0 ? (
                          <span className={cumpleArchivo ? "inline-flex items-center gap-1 text-emerald-700" : "text-amber-700"}>
                            {cumpleArchivo ? <CheckCircle2 className="size-3.5" /> : <FileArchive className="size-3.5" />}
                            {cumpleArchivo ? "Archivo disponible" : "Falta archivo técnico"}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <Link to="/trabajos/$id" params={{ id: servicio.id }} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-gold/30 hover:bg-gold/5">
                      Gestionar <ArrowUpRight className="size-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-muted/20 p-4">
            <div className="flex items-center gap-2">
              <FileArchive className="size-4 text-gold-deep" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Archivos técnicos del pedido</p>
            </div>
            {cargandoFicha ? (
              <p className="mt-3 text-xs text-muted-foreground">Cargando archivos…</p>
            ) : archivosVisibles.length === 0 ? (
              <p className="mt-3 text-xs text-amber-700">No hay archivos técnicos disponibles.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {archivosVisibles.map((archivo) => (
                  <a
                    key={archivo.id}
                    href={archivo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium hover:border-gold/30"
                  >
                    <FileArchive className="size-3.5" />
                    {archivo.nombre}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
