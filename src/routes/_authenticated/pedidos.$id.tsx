import { useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, Panel } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { AREAS, areaCoincide, normalizarArea, useSesion } from "@/lib/auth";
import {
  estadoClases,
  destinosMovimientoPedido,
  pedidoEnRecepcion,
  useActualizarPedido,
  useCrearContratoDesdePedido,
  useContrato,
  usePagosContrato,
  useAutorizarProduccion,
  useEnviarAArea,
  usePedidos,
} from "@/lib/taller-db";
import { FechaInput } from "@/components/FechaInput";
import { fmtFecha } from "@/lib/utils";
import { leerMetadatosEnlace } from "@/lib/enlaces.functions";
import { urlEmbedVisor } from "@/lib/visor-embed";
import { VisorIframe } from "@/components/VisorIframe";
import { nombreSeguro, subirConProgreso } from "@/lib/subir-archivo";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/pedidos/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    from: typeof search["from"] === "string" ? search["from"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Ficha del pedido — Aurum Lab" },
      {
        name: "description",
        content:
          "Ficha rápida y ficha técnica del pedido: área actual, tiempo en área, movimiento entre áreas, QR, WhatsApp y archivos de diseño.",
      },
      { property: "og:title", content: "Ficha del pedido — Aurum Lab" },
      {
        property: "og:description",
        content: "Pantalla de trabajo diaria del pedido en el taller.",
      },
    ],
  }),
  component: FichaPedido,
});

const VISTAS = ["Perspectiva", "Superior", "Frontal", "Derecha"] as const;
const RUTA_AREAS = AREAS.filter((a) => a !== "Pedidos" && a !== "Área ventas");

type ArchivoPorEliminar = {
  id: string;
  titulo: string;
  descripcion: string;
  accion: string;
};

const regresosFicha = {
  operario: { etiqueta: "Mi trabajo", ruta: "/operario" },
  pedidos: { etiqueta: "Pedidos", ruta: "/pedidos" },
  "Diseño 3D": { etiqueta: "Diseño 3D", ruta: "/diseno-3d" },
  "diseno-3d": { etiqueta: "Diseño 3D", ruta: "/diseno-3d" },
  "Impresión 3D": { etiqueta: "Impresión 3D", ruta: "/impresion-3d" },
  "impresion-3d": { etiqueta: "Impresión 3D", ruta: "/impresion-3d" },
  "Corte Láser": { etiqueta: "Corte Láser", ruta: "/corte-laser" },
  "corte-laser": { etiqueta: "Corte Láser", ruta: "/corte-laser" },
  Casting: { etiqueta: "Casting", ruta: "/casting" },
  casting: { etiqueta: "Casting", ruta: "/casting" },
  Taller: { etiqueta: "Taller", ruta: "/taller" },
  taller: { etiqueta: "Taller", ruta: "/taller" },
  "Área ventas": { etiqueta: "Área ventas", ruta: "/ventas" },
  ventas: { etiqueta: "Área ventas", ruta: "/ventas" },
  gestion: { etiqueta: "Gestión", ruta: "/gestion" },
} as const;

type RegresoFicha = (typeof regresosFicha)[keyof typeof regresosFicha];

function regresoDesde(origen: string | undefined): RegresoFicha {
  if (!origen) return regresosFicha.pedidos;
  return regresosFicha[origen as keyof typeof regresosFicha] ?? regresosFicha.pedidos;
}

function DatoClave({
  etiqueta,
  valor,
  destacado = false,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-card">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {etiqueta}
      </p>
      <p
        className={`mt-1.5 truncate text-base font-semibold ${
          destacado ? "text-gold-deep" : "text-foreground"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}

function BloqueDatos({ titulo, datos }: { titulo: string; datos: Array<[string, string]> }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">
          {titulo}
        </h3>
        <span className="h-px flex-1 bg-gradient-to-r from-gold/50 to-transparent" />
      </div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border shadow-card lg:grid-cols-3">
        {datos.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="bg-surface-sunken px-4 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {etiqueta}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-raised">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-center justify-between bg-surface-sunken px-6 py-4 text-left transition-colors hover:bg-accent/60"
      >
        <span className="flex items-center gap-3">
          <span className="h-4 w-px bg-gold" />
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">
            {titulo}
          </h2>
        </span>
        <span className="text-sm font-semibold text-gold-deep">{abierta ? "−" : "+"}</span>
      </button>
      {abierta ? <div className="border-t border-border p-6">{children}</div> : null}
    </section>
  );
}

function tiempoEnArea(desde: string) {
  const fecha = new Date(desde);
  const base = Number.isNaN(fecha.getTime()) ? Date.now() : fecha.getTime();
  const ms = Date.now() - base;
  const horas = Math.floor(ms / 3_600_000);
  if (horas < 1) return `${Math.max(1, Math.floor(ms / 60_000))} min`;
  if (horas < 48) return `${horas} h`;
  return `${Math.floor(horas / 24)} días`;
}

function mostrarEstadoVentas(pedido: { estado: string; ventas_estado: string }) {
  if (["Listo para Entrega", "En Camino", "Entregado"].includes(pedido.estado))
    return pedido.estado;
  if (["Listo para Entrega", "En Camino", "Entregado"].includes(pedido.ventas_estado)) {
    return pedido.ventas_estado;
  }
  return "Pendiente";
}

interface EnlaceArchivo {
  id: string;
  tipo: string;
  nombre: string;
  url: string;
  poster: string | null;
}

function TarjetaEnlace({ a, onQuitar }: { a: EnlaceArchivo; onQuitar: (id: string) => void }) {
  const [incrustado, setIncrustado] = useState(false);
  const embed = a.tipo === "visor3d" ? urlEmbedVisor(a.url) : null;
  return (
    <li className="overflow-hidden rounded-xl border border-border">
      {embed && incrustado ? (
        <VisorIframe url={embed} titulo={a.nombre} />
      ) : (
        <a href={a.url} target="_blank" rel="noreferrer" className="block">
          {a.poster ? (
            <img
              src={a.poster}
              alt={`Vista previa de ${a.nombre}`}
              loading="lazy"
              className="aspect-video w-full bg-surface-muted object-cover"
            />
          ) : (
            <div className="grid aspect-video w-full place-items-center bg-surface-muted text-2xl text-muted-foreground">
              {a.tipo === "visor3d" ? "◈" : "🔗"}
            </div>
          )}
        </a>
      )}
      <div className="flex items-center justify-between gap-3 p-3 text-sm">
        <div className="min-w-0">
          <a
            href={a.url}
            target="_blank"
            rel="noreferrer"
            className="block truncate font-medium text-info hover:underline"
          >
            {a.nombre}
          </a>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {a.tipo === "visor3d" ? "Visor 3D realista" : "Enlace externo"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {embed ? (
            <button
              type="button"
              onClick={() => setIncrustado((v) => !v)}
              className="text-xs font-medium text-info hover:underline"
            >
              {incrustado ? "Ver portada" : "Ver aquí"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onQuitar(a.id)}
            className="text-xs text-muted-foreground hover:text-danger"
          >
            Quitar
          </button>
        </div>
      </div>
    </li>
  );
}

function useArchivos(pedidoId: string) {
  return useQuery({
    queryKey: ["pedido-archivos", pedidoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedido_archivos")
        .select("id, tipo, nombre, url, es_enlace, grupo, version, poster, created_at")
        .eq("pedido_id", pedidoId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function FichaPedido() {
  const { id } = useParams({ from: "/_authenticated/pedidos/$id" });
  const { from } = Route.useSearch();
  const navigate = useNavigate();
  const { data: sesion } = useSesion();
  const { data: pedidos = [], isLoading } = usePedidos();
  const { data: archivos = [] } = useArchivos(id);
  const { data: trabajosPedido = [] } = useQuery({
    queryKey: ["trabajos-pedido", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trabajos")
        .select("id, area, titulo, estado, prioridad, responsable_user_id")
        .eq("pedido_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  const actualizar = useActualizarPedido();
  const autorizar = useAutorizarProduccion();
  const enviar = useEnviarAArea();
  const pedido = pedidos.find((p) => p.id === id);

  const crearContrato = useCrearContratoDesdePedido();
  const contratoRef = pedido?.contrato_id || pedido?.contrato || "";
  const { data: contratoFinanciero } = useContrato(contratoRef);
  const { data: pagosContrato = [] } = usePagosContrato(contratoFinanciero);
  const totalFinanciero = Number(contratoFinanciero?.total ?? pedido?.importe ?? 0) || 0;
  const abonadoFinanciero = pagosContrato.length > 0
    ? pagosContrato.reduce((s, p) => s + (Number(p.monto) || 0), 0)
    : Number(contratoFinanciero?.abonado ?? 0) || 0;
  const saldoFinanciero = Math.max(0, totalFinanciero - abonadoFinanciero);
  const estadoFinanciero = totalFinanciero > 0 && saldoFinanciero <= 0
    ? "Pagado"
    : abonadoFinanciero > 0
      ? "Pago parcial"
      : "Pendiente";
  const qc = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [rutaEdit, setRutaEdit] = useState<string[]>([]);
  const [enlace, setEnlace] = useState({ nombre: "", url: "" });
  const [grupoDestino, setGrupoDestino] = useState("");
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(null);
  const [destinoMovimiento, setDestinoMovimiento] = useState("");
  const [motivoRetornoPedidos, setMotivoRetornoPedidos] = useState("");
  const [archivoPorEliminar, setArchivoPorEliminar] = useState<ArchivoPorEliminar | null>(null);
  const [progreso, setProgreso] = useState<{ nombre: string; valor: number } | null>(null);
  const [zonaActiva, setZonaActiva] = useState(false);

  const regresoBase = regresoDesde(from);
  const regreso =
    sesion?.rolPrincipal === "operario" && regresoBase.ruta === "/pedidos"
      ? regresosFicha.operario
      : regresoBase;
  const esFichaOperario = sesion?.rolPrincipal === "operario";
  const volver = () => void navigate({ to: regreso.ruta as never });

  const subir = useMutation({
    mutationFn: async ({
      file,
      tipo,
      grupo,
    }: {
      file: File;
      tipo: string;
      grupo?: string | undefined;
    }) => {
      const ruta = `${id}/${tipo}-${Date.now()}-${nombreSeguro(file.name)}`;
      setProgreso({ nombre: file.name, valor: 0 });
      await subirConProgreso({
        bucket: "pedidos",
        ruta,
        file,
        onProgreso: (valor) => setProgreso({ nombre: file.name, valor }),
      });

      const { data } = await supabase.storage
        .from("pedidos")
        .createSignedUrl(ruta, 60 * 60 * 24 * 365);
      const claveGrupo = (grupo || file.name).toLowerCase();
      const { data: previas } = await supabase
        .from("pedido_archivos")
        .select("version")
        .eq("pedido_id", id)
        .eq("grupo", claveGrupo)
        .order("version", { ascending: false })
        .limit(1);
      const siguiente = (previas?.[0]?.version ?? 0) + 1;
      const { error: e2 } = await supabase.from("pedido_archivos").insert({
        pedido_id: id,
        tipo,
        nombre: file.name,
        url: data?.signedUrl ?? ruta,
        es_enlace: false,
        grupo: claveGrupo,
        version: siguiente,
      });
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedido-archivos", id] });
      qc.invalidateQueries({ queryKey: ["archivos-pedidos"] });
    },
    onSettled: () => {
      setArchivoPorEliminar(null);
      setProgreso(null);
    },
  });

  const guardarEnlace = useMutation({
    mutationFn: async () => {
      const meta = await leerMetadatosEnlace({ data: { url: enlace.url } }).catch(() => ({
        titulo: "",
        poster: "",
      }));
      const esVisor = /ijewel\.design|sketchfab\.com|p3d\.in|vectary\.com/i.test(enlace.url);
      const nombre =
        enlace.nombre || meta.titulo || (esVisor ? "Visor 3D realista" : "Archivo externo");
      const { error } = await supabase.from("pedido_archivos").insert({
        pedido_id: id,
        tipo: esVisor ? "visor3d" : "enlace",
        nombre,
        url: enlace.url,
        es_enlace: true,
        poster: meta.poster,
        grupo: nombre.toLowerCase(),
        version: 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setEnlace({ nombre: "", url: "" });
      qc.invalidateQueries({ queryKey: ["pedido-archivos", id] });
    },
  });

  const borrarArchivo = useMutation({
    mutationFn: async (archivoId: string) => {
      const { error } = await supabase.from("pedido_archivos").delete().eq("id", archivoId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedido-archivos", id] });
      qc.invalidateQueries({ queryKey: ["archivos-pedidos"] });
    },
  });

  if (isLoading) {
    return (
      <AppShell
        titulo="Ficha del pedido"
        subtitulo="Cargando…"
        ocultarNavegacion={esFichaOperario}
        encabezadoMovilCompacto
        atrasMovil={{ to: regreso.ruta }}
      >
        <p className="text-sm text-muted-foreground">Cargando pedido…</p>
      </AppShell>
    );
  }

  if (!pedido) {
    return (
      <AppShell
        titulo="Pedido no encontrado"
        ocultarNavegacion={esFichaOperario}
        encabezadoMovilCompacto
        atrasMovil={{ to: regreso.ruta }}
      >
        <p className="text-sm text-muted-foreground">
          Este pedido no existe o no pertenece a tu sede.{" "}
          <button
            type="button"
            onClick={volver}
            className="hidden text-info hover:underline lg:inline"
          >
            Volver a {regreso.etiqueta}
          </button>
        </p>
      </AppShell>
    );
  }

  const puedeEditar = Boolean(sesion?.esAdmin);
  const telefonoWhatsapp = (pedido.telefono ?? "").replace(/\D/g, "");
  const urlSeguimiento =
    typeof window !== "undefined"
      ? `${window.location.origin}/cliente?ref=${encodeURIComponent(pedido.referencia)}`
      : "";
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(urlSeguimiento)}`;
  const wa = telefonoWhatsapp
    ? `https://wa.me/${telefonoWhatsapp}?text=${encodeURIComponent(
        `Hola ${pedido.cliente}, su pedido ${pedido.referencia} está en ${normalizarArea(pedido.area_actual)}.`,
      )}`
    : "";
  const rutaPedido = Array.isArray(pedido.ruta) ? pedido.ruta : [];
  const puedeMover =
    Boolean(sesion?.esAdmin) ||
    (sesion?.areas ?? []).some((area) => areaCoincide(area, pedido.area_actual));
  const requiereAutorizacion = pedidoEnRecepcion(pedido.estado);
  const puedeAutorizar = Boolean(sesion?.esAdmin) && requiereAutorizacion;
  const destinosMovimiento = destinosMovimientoPedido(pedido, {
    esAdmin: Boolean(sesion?.esAdmin),
    areasUsuario: sesion?.areas ?? [],
  });
  const reiniciaFlujo = areaCoincide(destinoMovimiento, "Pedidos");
  const motivoRequerido = reiniciaFlujo && !motivoRetornoPedidos.trim();
  const tieneCorteLaser =
    rutaPedido.some((area) => areaCoincide(area, "Corte Láser")) ||
    areaCoincide(pedido.area_actual, "Corte Láser") ||
    Boolean(pedido.corte_texto || pedido.corte_observaciones);
  const infoCorteLaser: Array<[string, string]> = [
    ["Texto a grabar o cortar", pedido.corte_texto || "—"],
    ["Tipografía", pedido.corte_tipografia || "—"],
    ["Ubicación", pedido.corte_ubicacion || "—"],
    ["Observaciones", pedido.corte_observaciones || "—"],
  ];

  return (
    <AppShell
      titulo={`${pedido.referencia} · ${pedido.trabajo || pedido.pieza}`}
      subtitulo={`${pedido.cliente}${pedido.sede_nombre ? ` · ${pedido.sede_nombre}` : ""}`}
      ocultarNavegacion={esFichaOperario}
      encabezadoMovilCompacto
      atrasMovil={{ to: regreso.ruta }}
    >
      {!esFichaOperario ? (
        <div className="mb-6">
          <button
            type="button"
            onClick={volver}
            className="hidden items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground lg:inline-flex"
          >
            ← Volver a {regreso.etiqueta}
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="space-y-4 sm:space-y-6 lg:col-span-2">
          <Panel titulo="Ficha rápida">
            <div className="space-y-5 p-5 lg:p-6">
              <div className="rounded-2xl border border-gold/30 bg-surface-sunken p-5 shadow-raised">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Pedido
                    </p>
                    <p className="mt-1 font-display text-3xl leading-tight text-foreground">
                      {pedido.referencia}
                    </p>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      {pedido.cliente || "Sin cliente"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border border-gold/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${estadoClases[pedido.estado] ?? "bg-accent text-foreground"}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {pedido.estado || "—"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <DatoClave etiqueta="Contrato" valor={pedido.contrato || "—"} />
                  <DatoClave etiqueta="Área actual" valor={normalizarArea(pedido.area_actual)} destacado />
                  <DatoClave etiqueta="Entrega" valor={fmtFecha(pedido.fecha_entrega ?? pedido.entrega) ?? "—"} />
                </div>
              </div>

              <BloqueDatos
                titulo="Trabajo solicitado"
                datos={[
                  ["Descripción / trabajo", pedido.trabajo || pedido.pieza || "—"],
                  ["Origen / lugar", pedido.origen || "—"],
                  ["Peso", pedido.peso_estimado ? `${pedido.peso_estimado}` : "—"],
                  ["Material", pedido.material || "—"],
                  ["Piedras", pedido.piedras || "—"],
                  ["Talla", pedido.talla || "—"],
                  ["Cantidad", String(pedido.cantidad_piezas ?? "—")],
                ]}
              />

              <section>
                <div className="mb-3 flex items-center gap-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">
                    Producción
                  </h3>
                  <span className="h-px flex-1 bg-gradient-to-r from-gold/50 to-transparent" />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <DatoClave
                    etiqueta="Trabajos"
                    valor={String(trabajosPedido.length)}
                    destacado
                  />
                  <DatoClave
                    etiqueta="Pendientes"
                    valor={String(trabajosPedido.filter((t) => ["pendiente", "en_proceso", "bloqueado"].includes(t.estado)).length)}
                  />
                  <DatoClave
                    etiqueta="Completados"
                    valor={String(trabajosPedido.filter((t) => t.estado === "completado").length)}
                  />
                </div>

                {trabajosPedido.length > 0 ? (
                  <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border">
                    {trabajosPedido.map((trabajo) => (
                      <button
                        key={trabajo.id}
                        type="button"
                        onClick={() => void navigate({ to: "/trabajos/$id", params: { id: trabajo.id } })}
                        className="flex w-full items-center justify-between gap-3 bg-card px-4 py-3 text-left transition hover:bg-surface-muted"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {trabajo.titulo || "Trabajo sin título"}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {normalizarArea(trabajo.area)} · {trabajo.prioridad}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                          {trabajo.estado === "en_proceso" ? "En proceso" : trabajo.estado === "completado" ? "Completado" : trabajo.estado === "bloqueado" ? "Bloqueado" : "Pendiente"}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-border bg-surface-sunken px-4 py-4 text-sm text-muted-foreground">
                    Todavía no hay trabajos registrados para este pedido.
                  </div>
                )}
              </section>

              <section>
                <div className="mb-3 flex items-center gap-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">
                    Ficha técnica
                  </h3>
                  <span className="h-px flex-1 bg-gradient-to-r from-gold/50 to-transparent" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DatoClave etiqueta="Archivos técnicos" valor={String(archivos.length)} destacado={archivos.length > 0} />
                  <DatoClave etiqueta="Tiempo en área" valor={tiempoEnArea(pedido.area_desde)} />
                </div>
                {archivos.length > 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Los archivos de diseño y ficha técnica están disponibles en la sección de archivos del pedido.
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Este pedido todavía no tiene archivos técnicos asociados.
                  </p>
                )}
              </section>

              <section>
                <div className="mb-3 flex items-center gap-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">
                    Resumen financiero
                  </h3>
                  <span className="h-px flex-1 bg-gradient-to-r from-gold/50 to-transparent" />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <DatoClave
                    etiqueta="Precio"
                    valor={new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(pedido.importe) || 0)}
                  />
                  <DatoClave
                    etiqueta="A cuenta"
                    valor={new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(pedido.a_cuenta) || 0)}
                  />
                  <DatoClave
                    etiqueta="Saldo"
                    valor={new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(pedido.saldo) || 0)}
                    destacado
                  />
                </div>
              </section>
            </div>
          </Panel>

          <Panel titulo="Documento comercial">
                <div className="space-y-4 p-5 lg:p-6">
                  {pedido.contrato_id ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Contrato {pedido.contrato || "vinculado"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          El pedido ya está conectado con su documento comercial y sus pagos.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to="/contratos/$id"
                          params={{ id: pedido.contrato_id }}
                          search={{ nuevoPedido: false }}
                          className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface-muted"
                        >
                          Ver contrato
                        </Link>
                        {sesion?.esAdmin ? (
                          <Link
                            to="/contratos/$id"
                            params={{ id: pedido.contrato_id }}
                            search={{ nuevoPedido: true }}
                            className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-ink-foreground hover:opacity-90"
                          >
                            + Nuevo pedido
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Sin contrato asociado</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Puedes crear el documento comercial con los datos de este pedido.
                        </p>
                      </div>
                      {sesion?.esAdmin ? (
                        <button
                          type="button"
                          onClick={() => crearContrato.mutate(pedido)}
                          disabled={crearContrato.isPending}
                          className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-ink-foreground disabled:opacity-50"
                        >
                          {crearContrato.isPending ? "Creando…" : "Crear contrato"}
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </Panel>

  

              <Panel titulo="Resumen del pedido">
                <div className="grid gap-4 p-5 sm:grid-cols-3 lg:p-6">
                  <DatoClave
                    etiqueta="Precio"
                    valor={new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(pedido.importe) || 0)}
                  />
                  <DatoClave
                    etiqueta="A cuenta"
                    valor={new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(pedido.a_cuenta) || 0)}
                  />
                  <DatoClave
                    etiqueta="Saldo"
                    valor={new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(pedido.saldo) || 0)}
                    destacado
                  />
                </div>
              </Panel>

              <Panel titulo="Estado financiero">
                <div className="grid gap-4 p-5 sm:grid-cols-3 lg:p-6">
                  <DatoClave etiqueta="Total" valor={new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(totalFinanciero)} />
                  <DatoClave etiqueta="Abonado" valor={new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(abonadoFinanciero)} />
                  <DatoClave etiqueta="Saldo" valor={new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(saldoFinanciero)} destacado />
                </div>
                <div className="border-t border-border px-5 py-3 text-xs lg:px-6">
                  <span className="text-muted-foreground">Estado: </span>
                  <span className="font-semibold">{estadoFinanciero}</span>
                  {contratoFinanciero ? (
                    <span className="ml-2 text-muted-foreground">· {pagosContrato.length} pago{pagosContrato.length === 1 ? "" : "s"} registrado{pagosContrato.length === 1 ? "" : "s"}</span>
                  ) : null}
                </div>
              </Panel>

            <BloqueDatos
                titulo="Información general"
                datos={[
                  ["Tipo de trabajo", pedido.trabajo || pedido.pieza || "—"],
                  ["Tiempo en área", tiempoEnArea(pedido.area_desde)],
                  ["Taller", pedido.sede_nombre || "—"],
                ]}
              />

              {pedido.cotizacion_id ? (
                <Panel titulo="Origen comercial">
                  <div className="space-y-4 p-5 lg:p-6">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <DatoClave etiqueta="Origen" valor={pedido.origen || "Cotización"} destacado />
                      <DatoClave etiqueta="Proyecto" valor={pedido.proyecto_joya_id ? "Proyecto de joya vinculado" : "Sin proyecto"} />
                      <DatoClave etiqueta="Importe vendido" valor={new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(pedido.importe || 0)} />
                    </div>
                    {Array.isArray(pedido.cotizacion_detalles) && pedido.cotizacion_detalles.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full min-w-[640px] text-left text-sm">
                          <thead className="bg-surface-muted text-[10px] uppercase tracking-wider text-muted-foreground">
                            <tr>
                              <th className="px-4 py-3">Tipo</th>
                              <th className="px-4 py-3">Descripción</th>
                              <th className="px-4 py-3">Cantidad</th>
                              <th className="px-4 py-3">Precio</th>
                              <th className="px-4 py-3">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {pedido.cotizacion_detalles.map((item, index) => {
                              const d = item as any;
                              const cantidad = Number(d.cantidad) || 0;
                              const precio = Number(d.precio_unitario) || 0;
                              const total = Number(d.total_precio) || cantidad * precio;
                              return (
                                <tr key={String(d.id ?? index)}>
                                  <td className="px-4 py-3 text-xs uppercase text-muted-foreground">{String(d.tipo ?? "otro")}</td>
                                  <td className="px-4 py-3 font-medium">{String(d.descripcion ?? "—")}</td>
                                  <td className="px-4 py-3">{cantidad} {String(d.unidad ?? "und")}</td>
                                  <td className="px-4 py-3">{precio.toFixed(2)}</td>
                                  <td className="px-4 py-3 font-semibold">{total.toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Este pedido no tiene partidas comerciales registradas.</p>
                    )}
                  </div>
                </Panel>
              ) : null}

              <BloqueDatos
                titulo="Información de ventas y envío"
                datos={[
                  ["Estado ventas", mostrarEstadoVentas(pedido)],
                  ["Listo para entrega", fmtFecha(pedido.fecha_listo_entrega) ?? "—"],
                  ["Medio de envío", pedido.medio_envio || "—"],
                  ["Guía de envío", pedido.guia_envio || "—"],
                  ["Fecha de envío", fmtFecha(pedido.fecha_envio) ?? "—"],
                  ["Fecha entregado", fmtFecha(pedido.fecha_entregado) ?? "—"],
                ]}
              />

              {tieneCorteLaser ? (
                <BloqueDatos titulo="Información de corte láser" datos={infoCorteLaser} />
              ) : null}

              {pedido.contrato_id || pedido.contrato ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/25 bg-accent/50 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      Contrato asociado
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">
                      {pedido.contrato || "Contrato del pedido"}
                    </p>
                  </div>
                  <Link
                    to="/contratos/$id"
                    params={{ id: pedido.contrato_id || pedido.contrato }}
                    search={{ nuevoPedido: false }}
                    className="inline-flex items-center rounded-lg border border-gold/40 bg-card px-4 py-2 text-xs font-semibold text-gold-deep shadow-card transition-colors hover:bg-surface-sunken"
                  >
                    Ver contrato
                  </Link>
                </div>
              ) : null}

            <div className="border-t-2 border-gold/25 bg-surface-sunken px-6 py-5">
              {puedeAutorizar ? (
                <div className="mb-4 rounded-xl border border-warning/20 bg-warning-soft p-4">
                  <p className="text-sm font-semibold text-warning">
                    Pedido pendiente de autorización
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    No aparecerá en las colas de producción hasta iniciar el trabajo.
                  </p>
                  <button
                    type="button"
                    disabled={autorizar.isPending || rutaPedido.length === 0}
                    onClick={() =>
                      autorizar.mutate({
                        pedido,
                        usuarioId: sesion?.user.id ?? null,
                      })
                    }
                    className="mt-3 w-full rounded-lg bg-ink px-4 py-3 text-sm font-medium text-ink-foreground disabled:opacity-50 sm:w-auto sm:py-2 sm:text-xs"
                  >
                    {autorizar.isPending ? "Autorizando..." : "Autorizar Producción"}
                  </button>
                </div>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Mover pedido
                  <select
                    value={destinoMovimiento}
                    onChange={(e) => {
                      setDestinoMovimiento(e.target.value);
                      if (!areaCoincide(e.target.value, "Pedidos")) setMotivoRetornoPedidos("");
                    }}
                    disabled={enviar.isPending || !puedeMover || requiereAutorizacion}
                    className="mt-1 block w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground disabled:opacity-40"
                  >
                    <option value="" disabled>
                      Selecciona el área destino…
                    </option>
                    {destinosMovimiento.map((a) => (
                      <option key={a} value={a}>
                        {normalizarArea(a)}
                      </option>
                    ))}
                    {destinosMovimiento.length === 0 ? (
                      <option value="" disabled>
                        Sin áreas disponibles
                      </option>
                    ) : null}
                  </select>
                </label>
                {reiniciaFlujo ? (
                  <label className="sm:col-span-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Motivo del retorno a Pedidos
                    <textarea
                      value={motivoRetornoPedidos}
                      onChange={(e) => setMotivoRetornoPedidos(e.target.value)}
                      disabled={enviar.isPending}
                      rows={3}
                      placeholder="Ejemplo: Corrección solicitada por cliente."
                      className="mt-1 block w-full rounded-lg border border-border bg-card px-3 py-2 text-sm normal-case text-foreground placeholder:text-muted-foreground disabled:opacity-40"
                    />
                  </label>
                ) : null}
                <button
                  type="button"
                  disabled={
                    enviar.isPending ||
                    !puedeMover ||
                    requiereAutorizacion ||
                    !destinoMovimiento ||
                    motivoRequerido
                  }
                  onClick={() => {
                    enviar.mutate(
                      {
                        pedido,
                        destino: destinoMovimiento,
                        usuarioId: sesion?.user.id ?? null,
                        motivo: motivoRetornoPedidos,
                      },
                      {
                        onSuccess: () => {
                          setDestinoMovimiento("");
                          setMotivoRetornoPedidos("");
                          if (esFichaOperario) volver();
                          else volver();
                        },
                      },
                    );
                  }}
                  className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-ink-foreground disabled:opacity-40"
                >
                  {enviar.isPending ? "Moviendo..." : "Confirmar movimiento"}
                </button>
              </div>
            </div>

          <div className="hidden sm:block">
            <Panel titulo="Seguimiento del pedido">
              <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-6">
                <div className="rounded-xl border border-border bg-surface-sunken p-4 shadow-card">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Estado general
                  </p>
                  <p
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${
                      estadoClases[pedido.estado] ?? "bg-card text-foreground"
                    }`}
                  >
                    {pedido.estado}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface-sunken p-4 shadow-card">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Área actual
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {normalizarArea(pedido.area_actual)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface-sunken p-4 shadow-card">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Estado de ventas
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {mostrarEstadoVentas(pedido)}
                  </p>
                </div>
              </div>
            </Panel>
          </div>

          <Seccion titulo="Ficha técnica general">
            {editando && puedeEditar ? (
              <form
                className="grid grid-cols-2 gap-3 lg:grid-cols-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  actualizar.mutate(
                    {
                      id: pedido.id,
                      cliente: String(fd.get("cliente")),
                      telefono: String(fd.get("telefono")),
                      origen: String(fd.get("origen")),
                      contrato: String(fd.get("contrato")),
                      trabajo: String(fd.get("trabajo")),
                      pieza: String(fd.get("trabajo")),
                      material: String(fd.get("material")),
                      peso_estimado: String(fd.get("peso_estimado")),
                      talla: String(fd.get("talla")),
                      cantidad_piezas: Number(fd.get("cantidad_piezas")) || 1,
                      piedras: String(fd.get("piedras")),
                      importe: Number(fd.get("importe")) || 0,
                      fecha_entrega: String(fd.get("fecha_entrega")) || null,
                      notas: String(fd.get("notas")),
                      corte_texto: String(fd.get("corte_texto") ?? pedido.corte_texto),
                      corte_tipografia: String(
                        fd.get("corte_tipografia") ?? pedido.corte_tipografia,
                      ),
                      corte_ubicacion: String(fd.get("corte_ubicacion") ?? pedido.corte_ubicacion),
                      corte_observaciones: String(
                        fd.get("corte_observaciones") ?? pedido.corte_observaciones,
                      ),
                      ruta: rutaEdit.length > 0 ? rutaEdit : pedido.ruta,
                    },
                    { onSuccess: () => setEditando(false) },
                  );
                }}
              >
                {(
                  [
                    ["cliente", "Cliente", pedido.cliente, "text"],
                    ["telefono", "WhatsApp", pedido.telefono, "tel"],
                    ["origen", "Origen", pedido.origen, "text"],
                    ["contrato", "Contrato", pedido.contrato, "text"],
                    ["trabajo", "Trabajo", pedido.trabajo || pedido.pieza, "text"],
                    ["material", "Material", pedido.material, "text"],
                    ["peso_estimado", "Peso estimado (g)", pedido.peso_estimado, "text"],
                    ["talla", "Talla / Medida", pedido.talla, "text"],
                    [
                      "cantidad_piezas",
                      "Cantidad de piezas",
                      String(pedido.cantidad_piezas),
                      "number",
                    ],
                    ["piedras", "Piedras / Componentes", pedido.piedras, "text"],
                    ["notas", "Notas generales", pedido.notas, "text"],
                    ["importe", "Costo", String(pedido.importe), "number"],
                    ["fecha_entrega", "Entrega", pedido.fecha_entrega ?? "", "date"],
                  ] as const
                ).map(([name, label, val, tipo]) => (
                  <label
                    key={name}
                    className="text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    {label}
                    {tipo === "date" ? (
                      <FechaInput
                        name={name}
                        defaultValue={val}
                        className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                      />
                    ) : (
                      <input
                        name={name}
                        type={tipo}
                        defaultValue={val}
                        className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                      />
                    )}
                  </label>
                ))}
                <fieldset className="col-span-2 lg:col-span-3">
                  <legend className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Ruta del pedido (marca las áreas a las que se destinará)
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {RUTA_AREAS.map((a) => {
                      const activa = rutaEdit.includes(a);
                      return (
                        <button
                          key={a}
                          type="button"
                          onClick={() =>
                            setRutaEdit((r) =>
                              activa
                                ? r.filter((x) => x !== a)
                                : RUTA_AREAS.filter((x) => [...r, a].includes(x)),
                            )
                          }
                          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                            activa
                              ? "border-transparent bg-ink text-gold-bright"
                              : "border-border bg-card"
                          }`}
                        >
                          {a}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                {(rutaEdit.some((a) => areaCoincide(a, "Corte Láser")) || tieneCorteLaser) && (
                  <fieldset className="col-span-2 lg:col-span-3">
                    <legend className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Información de Corte Láser
                    </legend>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      {(
                        [
                          ["corte_texto", "Texto a grabar o cortar", pedido.corte_texto],
                          ["corte_tipografia", "Tipografía", pedido.corte_tipografia],
                          ["corte_ubicacion", "Ubicación", pedido.corte_ubicacion],
                          ["corte_observaciones", "Observaciones", pedido.corte_observaciones],
                        ] as const
                      ).map(([name, label, val]) => (
                        <label
                          key={name}
                          className="text-[10px] uppercase tracking-wider text-muted-foreground"
                        >
                          {label}
                          <input
                            name={name}
                            type="text"
                            defaultValue={val}
                            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                          />
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
                <div className="col-span-2 flex items-end gap-2 lg:col-span-3">
                  <button
                    type="submit"
                    className="rounded-lg bg-ink px-4 py-2 text-xs text-ink-foreground"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditando(false)}
                    className="rounded-lg border border-border px-4 py-2 text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {(
                    [
                      ["Talla / Medida", pedido.talla || "—"],
                      ["Cantidad de piezas", String(pedido.cantidad_piezas || 1)],
                      ["Piedras / Componentes", pedido.piedras || "—"],
                      ["Notas generales", pedido.notas || "Sin notas técnicas."],
                      ["Material", pedido.material || "—"],
                      ["Peso estimado", pedido.peso_estimado || "—"],
                      ["Packing", pedido.packing_estado || "Pendiente"],
                      ["Listo para entrega", fmtFecha(pedido.fecha_listo_entrega) ?? "—"],
                      [
                        "Observación listo",
                        pedido.listo_entrega_observaciones || "Sin observaciones.",
                      ],
                      ["Fecha de envío", fmtFecha(pedido.fecha_envio) ?? "—"],
                      ["Fecha entregado", fmtFecha(pedido.fecha_entregado) ?? "—"],
                      ["Recibe / contacto", pedido.receptor_envio || "—"],
                      ["Nota de envío", pedido.notas_envio || "—"],
                      ["Nota de entrega", pedido.notas_entrega || pedido.notas_ventas || "—"],
                      [
                        "Última actualización ventas",
                        fmtFecha(pedido.ventas_actualizado_en) ?? "—",
                      ],
                    ] as const
                  ).map(([label, valor]) => (
                    <div key={label}>
                      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-foreground">{valor}</dd>
                    </div>
                  ))}
                </dl>
                {tieneCorteLaser ? (
                  <dl className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-border bg-surface-muted p-4 lg:grid-cols-4">
                    {infoCorteLaser.map(([label, valor]) => (
                      <div key={label}>
                        <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {label}
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-foreground">{valor}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {puedeEditar ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRutaEdit(pedido.ruta ?? []);
                      setEditando(true);
                    }}
                    className="mt-4 rounded-lg border border-border px-4 py-2 text-xs font-medium"
                  >
                    Editar pedido
                  </button>
                ) : null}
              </div>
            )}
          </Seccion>

          <Seccion titulo="Referencias del diseño">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {VISTAS.map((vista) => {
                const img = archivos.find((a) => a.tipo === vista && !a.es_enlace);
                return (
                  <div key={vista}>
                    <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {vista}
                    </p>
                    {img ? (
                      <div className="overflow-hidden rounded-xl border border-border bg-surface-muted">
                        <a href={img.url} target="_blank" rel="noreferrer" className="block">
                          <img
                            src={img.url}
                            alt={`Vista ${vista} del pedido ${pedido.referencia}`}
                            loading="lazy"
                            className="aspect-square w-full object-cover"
                          />
                        </a>
                        <div className="grid grid-cols-2 border-t border-border text-xs">
                          <label className="cursor-pointer px-3 py-2 text-center font-medium text-info hover:bg-card">
                            Reemplazar
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) subir.mutate({ file, tipo: vista });
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setArchivoPorEliminar({
                                id: img.id,
                                titulo: "Eliminar referencia",
                                descripcion: `¿Deseas eliminar la imagen de referencia "Vista ${vista}"?`,
                                accion: "Eliminar imagen",
                              })
                            }
                            disabled={borrarArchivo.isPending}
                            className="border-l border-border px-3 py-2 text-muted-foreground hover:bg-card hover:text-danger disabled:opacity-60"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="grid aspect-square w-full cursor-pointer place-items-center rounded-xl border border-dashed border-border bg-surface-muted text-[10px] text-muted-foreground">
                        Subir
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) subir.mutate({ file, tipo: vista });
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </Seccion>

          <Seccion titulo="Archivos del pedido">
            {(() => {
              const trabajo = archivos.filter(
                (a) => !a.es_enlace && !VISTAS.includes(a.tipo as (typeof VISTAS)[number]),
              );
              const grupos = new Map<string, typeof trabajo>();
              for (const a of trabajo) {
                const lista = grupos.get(a.grupo) ?? [];
                lista.push(a);
                grupos.set(a.grupo, lista);
              }
              const entradas = [...grupos.entries()].map(
                ([grupo, lista]) =>
                  [grupo, [...lista].sort((x, y) => y.version - x.version)] as const,
              );
              return (
                <>
                  <div className="mb-4 space-y-2">
                    {entradas.length > 0 ? (
                      <select
                        value={grupoDestino}
                        onChange={(e) => setGrupoDestino(e.target.value)}
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs"
                      >
                        <option value="">Subir como archivo nuevo</option>
                        {entradas.map(([grupo, lista]) => (
                          <option key={grupo} value={grupo}>
                            Nueva versión de: {lista[0]!.nombre} (v{lista[0]!.version})
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <label
                      onDragOver={(e) => {
                        e.preventDefault();
                        setZonaActiva(true);
                      }}
                      onDragLeave={() => setZonaActiva(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setZonaActiva(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file && !subir.isPending)
                          subir.mutate({
                            file,
                            tipo: "archivo",
                            grupo: grupoDestino || undefined,
                          });
                      }}
                      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center text-xs transition-colors ${
                        zonaActiva
                          ? "border-info bg-info/10 text-info"
                          : "border-border bg-surface-muted text-muted-foreground"
                      }`}
                    >
                      {subir.isPending ? (
                        <div className="w-full max-w-sm">
                          <p className="mb-2 truncate font-medium text-foreground">
                            Subiendo {progreso?.nombre ?? "archivo"}…
                          </p>
                          <div
                            role="progressbar"
                            aria-valuenow={progreso?.valor ?? 0}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            className="h-2 w-full overflow-hidden rounded-full bg-border"
                          >
                            <div
                              className="h-full rounded-full bg-info transition-[width] duration-200"
                              style={{ width: `${progreso?.valor ?? 0}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {progreso?.valor ?? 0}%
                            {(progreso?.valor ?? 0) >= 100 ? " · procesando…" : ""}
                          </p>
                        </div>
                      ) : (
                        <>
                          <span className="text-2xl">⬆</span>
                          <span className="font-medium text-foreground">
                            Arrastra aquí tu archivo o haz clic para seleccionarlo
                          </span>
                          <span>STL, 3MF, OBJ, PDF, fotos… (archivos pesados soportados)</span>
                        </>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        disabled={subir.isPending}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            subir.mutate({
                              file,
                              tipo: "archivo",
                              grupo: grupoDestino || undefined,
                            });
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {subir.isError ? (
                      <p className="text-xs text-danger">
                        No se pudo subir:{" "}
                        {subir.error instanceof Error ? subir.error.message : "error desconocido"}
                      </p>
                    ) : null}
                  </div>
                  <ul className="mb-4 space-y-2">
                    {entradas.map(([grupo, lista]) => {
                      const actual = lista[0]!;
                      const abierto = grupoAbierto === grupo;
                      return (
                        <li key={grupo} className="rounded-xl border border-border p-3">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <a
                              href={actual.url}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate text-info hover:underline"
                            >
                              {actual.nombre}
                            </a>
                            <div className="flex shrink-0 items-center gap-3">
                              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                                v{actual.version}
                              </span>
                              {lista.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => setGrupoAbierto(abierto ? null : grupo)}
                                  className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                  {abierto ? "Ocultar historial" : `Historial (${lista.length})`}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() =>
                                  setArchivoPorEliminar({
                                    id: actual.id,
                                    titulo: "Eliminar archivo",
                                    descripcion: `¿Deseas eliminar "${actual.nombre}" de este pedido?`,
                                    accion: "Eliminar archivo",
                                  })
                                }
                                className="text-xs text-muted-foreground hover:text-danger"
                              >
                                Quitar
                              </button>
                            </div>
                          </div>
                          {abierto ? (
                            <ul className="mt-3 space-y-1 border-t border-border pt-2">
                              {lista.slice(1).map((v) => (
                                <li
                                  key={v.id}
                                  className="flex items-center justify-between gap-3 text-xs"
                                >
                                  <a
                                    href={v.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="truncate text-muted-foreground hover:underline"
                                  >
                                    v{v.version} · {v.nombre}
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setArchivoPorEliminar({
                                        id: v.id,
                                        titulo: "Eliminar versión",
                                        descripcion: `¿Deseas eliminar la versión ${v.version} de "${v.nombre}"?`,
                                        accion: "Eliminar versión",
                                      })
                                    }
                                    className="text-muted-foreground hover:text-danger"
                                  >
                                    Quitar
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      );
                    })}
                    {entradas.length === 0 ? (
                      <li className="text-sm text-muted-foreground">Sin archivos subidos.</li>
                    ) : null}
                  </ul>
                </>
              );
            })()}

            {(() => {
              const enlaces = archivos.filter((a) => a.es_enlace);
              if (enlaces.length === 0) {
                return <p className="mb-4 text-sm text-muted-foreground">Sin enlaces guardados.</p>;
              }
              return (
                <ul className="mb-4 grid gap-3 sm:grid-cols-2">
                  {enlaces.map((a) => (
                    <TarjetaEnlace
                      key={a.id}
                      a={a}
                      onQuitar={() =>
                        setArchivoPorEliminar({
                          id: a.id,
                          titulo: "Eliminar enlace",
                          descripcion: `¿Deseas eliminar el enlace "${a.nombre}" de este pedido?`,
                          accion: "Eliminar enlace",
                        })
                      }
                    />
                  ))}
                </ul>
              );
            })()}
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (enlace.url) guardarEnlace.mutate();
              }}
            >
              <input
                placeholder="Nombre (iJewel, Drive, Dropbox…)"
                value={enlace.nombre}
                onChange={(e) => setEnlace((v) => ({ ...v, nombre: e.target.value }))}
                className="min-w-[160px] flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm"
              />
              <input
                type="url"
                placeholder="https://ijewel.design/… o cualquier enlace"
                value={enlace.url}
                onChange={(e) => setEnlace((v) => ({ ...v, url: e.target.value }))}
                className="min-w-[200px] flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg bg-ink px-4 py-2 text-xs text-ink-foreground"
              >
                Añadir enlace
              </button>
            </form>
          </Seccion>
        </div>

        <div className="h-fit overflow-hidden rounded-2xl border border-gold/25 bg-surface-sunken shadow-raised">
          <div className="flex items-center gap-3 border-b border-gold/20 px-5 py-3">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">
              QR de seguimiento
            </p>
          </div>
          <div className="p-5 text-center">
            {urlSeguimiento ? (
              <img
                src={qr}
                alt={`Código QR de seguimiento del pedido ${pedido.referencia}`}
                width={220}
                height={220}
                className="mx-auto rounded-xl border border-border bg-card p-3 shadow-card"
              />
            ) : null}
            <p className="mt-4 text-xs font-medium text-foreground">
              Escanea para ver el avance del pedido
            </p>
            <p className="mt-1 break-all text-[10px] text-muted-foreground">{urlSeguimiento}</p>
          </div>
        </div>
      </div>
      <AlertDialog
        open={archivoPorEliminar !== null}
        onOpenChange={(open) => {
          if (!open && !borrarArchivo.isPending) setArchivoPorEliminar(null);
        }}
      >
        <AlertDialogContent className="mx-4 max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{archivoPorEliminar?.titulo ?? "Eliminar archivo"}</AlertDialogTitle>
            <AlertDialogDescription>
              {archivoPorEliminar?.descripcion}
              <span className="mt-2 block font-medium text-destructive">
                Esta acción no se puede deshacer.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={borrarArchivo.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!archivoPorEliminar || borrarArchivo.isPending}
              onClick={() => {
                if (archivoPorEliminar) borrarArchivo.mutate(archivoPorEliminar.id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {borrarArchivo.isPending
                ? "Eliminando..."
                : (archivoPorEliminar?.accion ?? "Eliminar archivo")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
