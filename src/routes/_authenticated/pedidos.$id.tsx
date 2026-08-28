import { useState, type ReactNode } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, Panel } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { AREAS, areaCoincide, normalizarArea, useSesion } from "@/lib/auth";
import {
  estadoClases,
  pedidoEnEvaluacion,
  useActualizarPedido,
  useAutorizarProduccion,
  useEnviarAArea,
  usePedidos,
} from "@/lib/taller-db";
import { FechaInput } from "@/components/FechaInput";
import { fmtFecha } from "@/lib/utils";
import { leerMetadatosEnlace } from "@/lib/enlaces.functions";
import { urlEmbedVisor } from "@/lib/visor-embed";
import { VisorIframe } from "@/components/VisorIframe";

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
          "Ficha rápida y ficha técnica del pedido: área actual, tiempo en área, avanzar o devolver, QR, WhatsApp y archivos de diseño.",
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

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <h2 className="text-sm font-medium">{titulo}</h2>
        <span className="text-xs text-muted-foreground">{abierta ? "−" : "+"}</span>
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
  if (["Listo para Entrega", "Enviado", "Entregado"].includes(pedido.estado)) return pedido.estado;
  if (["Listo para Entrega", "Enviado", "Entregado"].includes(pedido.ventas_estado)) {
    return pedido.ventas_estado;
  }
  if (pedido.estado === "Área de Ventas" || pedido.estado === "En Ventas") return "Área de Ventas";
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
  const actualizar = useActualizarPedido();
  const autorizar = useAutorizarProduccion();
  const enviar = useEnviarAArea();
  const qc = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [rutaEdit, setRutaEdit] = useState<string[]>([]);
  const [enlace, setEnlace] = useState({ nombre: "", url: "" });
  const [grupoDestino, setGrupoDestino] = useState("");
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(null);
  const regresoBase = regresoDesde(from);
  const regreso =
    sesion?.rolPrincipal === "operario" && regresoBase.ruta === "/pedidos"
      ? regresosFicha.operario
      : regresoBase;
  const esFichaOperario = sesion?.rolPrincipal === "operario";
  const volver = () => void navigate({ to: regreso.ruta as never });

  const pedido = pedidos.find((p) => p.id === id);

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
      const ruta = `${id}/${tipo}-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("pedidos").upload(ruta, file);
      if (error) throw error;
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
      <AppShell titulo="Ficha del pedido" subtitulo="Cargando…" ocultarNavegacion={esFichaOperario}>
        <p className="text-sm text-muted-foreground">Cargando pedido…</p>
      </AppShell>
    );
  }

  if (!pedido) {
    return (
      <AppShell titulo="Pedido no encontrado" ocultarNavegacion={esFichaOperario}>
        <p className="text-sm text-muted-foreground">
          Este pedido no existe o no pertenece a tu sede.{" "}
          <button type="button" onClick={volver} className="text-info hover:underline">
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
  const requiereAutorizacion = pedidoEnEvaluacion(pedido.estado);
  const puedeAutorizar = Boolean(sesion?.esAdmin) && requiereAutorizacion;

  return (
    <AppShell
      titulo={`${pedido.referencia} · ${pedido.trabajo || pedido.pieza}`}
      subtitulo={`${pedido.cliente}${pedido.sede_nombre ? ` · ${pedido.sede_nombre}` : ""}`}
      ocultarNavegacion={esFichaOperario}
    >
      {!esFichaOperario ? (
        <div className="mb-6">
          <button
            type="button"
            onClick={volver}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            ← Volver a {regreso.etiqueta}
          </button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel titulo="Ficha rápida">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-6 lg:grid-cols-3">
              {[
                ["Código del pedido", pedido.referencia],
                ["Tipo de trabajo", pedido.trabajo || pedido.pieza || "—"],
                ["N° de contrato", pedido.contrato || "—"],
                ["Estado general", pedido.estado || "—"],
                ["Área de proceso", normalizarArea(pedido.area_actual)],
                ["Fecha de entrega", fmtFecha(pedido.fecha_entrega ?? pedido.entrega) ?? "—"],
                ["Tiempo en área", tiempoEnArea(pedido.area_desde)],
                ["Estado ventas", mostrarEstadoVentas(pedido)],
                ["Medio de envío", pedido.medio_envio || "—"],
                ["Guía de envío", pedido.guia_envio || "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p>
                  {k === "Estado general" ? (
                    <p
                      className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${estadoClases[pedido.estado] ?? "bg-surface-muted"}`}
                    >
                      {v}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-sm">{v}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-border px-6 py-5">
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
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Mover a área
                <select
                  value=""
                  onChange={(e) => {
                    const destino = e.target.value;
                    if (destino)
                      enviar.mutate({ pedido, destino, usuarioId: sesion?.user.id ?? null });
                  }}
                  disabled={enviar.isPending || !puedeMover || requiereAutorizacion}
                  className="mt-1 block w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground disabled:opacity-40"
                >
                  <option value="" disabled>
                    Selecciona el área destino…
                  </option>
                  {rutaPedido
                    .filter((a) => !areaCoincide(a, pedido.area_actual))
                    .map((a) => (
                      <option key={a} value={a}>
                        {normalizarArea(a)}
                      </option>
                    ))}
                  {rutaPedido.filter((a) => !areaCoincide(a, pedido.area_actual)).length === 0 ? (
                    <option value="" disabled>
                      Sin áreas siguientes en la ruta
                    </option>
                  ) : null}
                </select>
              </label>
            </div>
          </Panel>

          <Panel titulo="Seguimiento del pedido">
            <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-6">
              <div className="rounded-xl bg-surface-muted p-4">
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
              <div className="rounded-xl bg-surface-muted p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Área actual
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {normalizarArea(pedido.area_actual)}
                </p>
              </div>
              <div className="rounded-xl bg-surface-muted p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Estado de ventas
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {mostrarEstadoVentas(pedido)}
                </p>
              </div>
            </div>
          </Panel>

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
                      ["Fecha de envío", fmtFecha(pedido.fecha_envio) ?? "—"],
                      ["Fecha entregado", fmtFecha(pedido.fecha_entregado) ?? "—"],
                      ["Recibe / contacto", pedido.receptor_envio || "—"],
                      ["Nota de ventas", pedido.notas_ventas || "—"],
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
                            onClick={() => {
                              if (confirm(`¿Eliminar la vista ${vista}?`)) {
                                borrarArchivo.mutate(img.id);
                              }
                            }}
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
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-muted px-4 py-4 text-xs text-muted-foreground">
                      {subir.isPending
                        ? "Subiendo..."
                        : "Subir archivo del trabajo (STL, 3MF, PDF, foto...)"}
                      <input
                        type="file"
                        className="hidden"
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
                                onClick={() => borrarArchivo.mutate(actual.id)}
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
                                    onClick={() => borrarArchivo.mutate(v.id)}
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
                    <TarjetaEnlace key={a.id} a={a} onQuitar={(id) => borrarArchivo.mutate(id)} />
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

        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
          <p className="mb-4 text-[10px] uppercase tracking-wider text-muted-foreground">
            QR de seguimiento
          </p>
          {urlSeguimiento ? (
            <img
              src={qr}
              alt={`Código QR de seguimiento del pedido ${pedido.referencia}`}
              width={220}
              height={220}
              className="mx-auto rounded-xl border border-border bg-white p-2"
            />
          ) : null}
          <p className="mt-4 break-all text-[10px] text-muted-foreground">{urlSeguimiento}</p>
        </div>
      </div>
    </AppShell>
  );
}
