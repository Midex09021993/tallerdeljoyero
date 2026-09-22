import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fmtFecha } from "@/lib/utils";

export const Route = createFileRoute("/cliente")({
  head: () => ({
    meta: [
      { title: "Consulta de tu cotización o pedido — Taller del Joyero" },
      {
        name: "description",
        content:
          "Consulta de forma segura el estado de tu cotización o pedido.",
      },
      {
        property: "og:title",
        content: "Consulta de tu cotización o pedido — Taller del Joyero",
      },
      {
        property: "og:description",
        content: "Consulta de forma segura el estado de tu cotización o pedido.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search["token"] === "string" && search["token"]
      ? { token: search["token"] as string }
      : {}),
    ...(typeof search["codigo"] === "string" && search["codigo"]
      ? { codigo: search["codigo"] as string }
      : {}),
  }),
  component: SeguimientoCliente,
});

type SeguimientoPedido = {
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
  medio_envio: string | null;
  guia_envio: string | null;
  receptor_envio: string | null;
  sede: string | null;
};

type SeguimientoCotizacion = {
  numero: string;
  version: number;
  cliente: string;
  trabajo: string;
  sede: string | null;
  estado: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  fecha_entrega_solicitada: string | null;
  moneda: string;
  subtotal: number;
  descuento: number;
  impuestos: number;
  total: number;
  anticipo: number;
  notas_cliente: string;
  identidad_comercial: Record<string, unknown> | null;
  especificaciones: {
    nombre: string | null;
    descripcion: string | null;
    metal: string | null;
    ley: string | null;
    piedras: string | null;
    talla: string | null;
    peso_estimado: number | null;
    cantidad_piezas: number | null;
  } | null;
  detalles: Array<{
    orden: number;
    tipo: string;
    descripcion: string;
    cantidad: number;
    unidad: string;
    precio_unitario: number;
    total_precio: number;
    metadata: Record<string, unknown>;
  }>;
};

const ESTADOS_CLIENTE = [
  "Recibido",
  "En Producción",
  "Listo para Entrega",
  "En Camino",
  "Entregado",
] as const;

function estadoCliente(pedido: SeguimientoPedido) {
  const estado = pedido.estado || "";
  const ventas = pedido.ventas_estado || "";

  if (estado === "Cancelado") return "Cancelado";
  if (["Listo para Entrega", "En Camino", "Entregado"].includes(estado)) return estado;
  if (["Listo para Entrega", "En Camino", "Entregado"].includes(ventas)) return ventas;
  if (["Enviado", "Despachado"].includes(estado) || ["Enviado", "Despachado"].includes(ventas)) {
    return "En Camino";
  }
  if (
    ["Área de Ventas", "En Ventas", "Terminado", "En packing"].includes(estado) ||
    pedido.area_actual === "Área ventas"
  ) {
    return "Listo para Entrega";
  }
  if (estado === "En Producción") return "En Producción";
  return "Recibido";
}

const AREAS_PRODUCCION = ["Diseño 3D", "Impresión 3D", "Casting", "Corte Láser", "Taller"];

function areaCliente(area: string) {
  if (area === "Área ventas") return "Listo para Entrega";
  return area;
}

function etiquetaEstadoCotizacion(estado: string) {
  const etiquetas: Record<string, string> = {
    enviada: "Enviada",
    aprobada: "Aprobada",
    rechazada: "Rechazada",
    vencida: "Vencida",
  };
  return etiquetas[estado] ?? estado;
}

function moneda(valor: number, codigo: string) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: codigo,
    minimumFractionDigits: 2,
  }).format(valor);
}

function SeguimientoCliente() {
  const { token, codigo } = Route.useSearch();
  const [valor, setValor] = useState(token ?? codigo ?? "");
  const [buscado, setBuscado] = useState(false);

  const consulta = useMutation({
    mutationFn: async (
      seguimientoToken: string,
    ): Promise<{ tipo: "cotizacion"; data: SeguimientoCotizacion } | { tipo: "pedido"; data: SeguimientoPedido } | null> => {
      const db = supabase as any;

      const esCodigoCorto = /^[A-Z0-9]{8}$/i.test(seguimientoToken);
      const { data: cotizacion, error: cotizacionError } = await db.rpc(
        esCodigoCorto ? "seguimiento_cotizacion_codigo" : "seguimiento_cotizacion",
        esCodigoCorto ? { _codigo: seguimientoToken } : { _token: seguimientoToken },
      );

      if (cotizacionError) throw cotizacionError;

      if (cotizacion?.[0]) {
        return { tipo: "cotizacion", data: cotizacion[0] as SeguimientoCotizacion };
      }

      const { data: pedido, error: pedidoError } = await supabase.rpc("seguimiento_pedido", {
        _ref: seguimientoToken,
      });

      if (pedidoError) throw pedidoError;
      if (pedido?.[0]) {
        return { tipo: "pedido", data: pedido[0] as SeguimientoPedido };
      }

      return null;
    },
    onSettled: () => setBuscado(true),
  });

  const resultado = consulta.data ?? null;

  const pedido = resultado?.tipo === "pedido" ? resultado.data : null;
  const cotizacion = resultado?.tipo === "cotizacion" ? resultado.data : null;

  const estadoActual = pedido ? estadoCliente(pedido) : null;
  const indice = estadoActual ? ESTADOS_CLIENTE.findIndex((estado) => estado === estadoActual) : -1;
  const avance = indice >= 0 ? Math.round((indice / (ESTADOS_CLIENTE.length - 1)) * 100) : 0;
  const mostrarAreaActual =
    pedido != null &&
    estadoActual === "En Producción" &&
    AREAS_PRODUCCION.some((a) => a === areaCliente(pedido.area_actual));

  return (
    <main className="min-h-screen bg-surface px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-gold">Taller del Joyero</p>
        <h1 className="mb-2 font-display text-3xl">Consulta tu cotización o pedido</h1>
        <p className="mb-6 max-w-xl text-sm text-muted-foreground">
          Ingresa tu código seguro de consulta. Puedes usar el enlace que te enviamos por WhatsApp o correo.
        </p>

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
            placeholder="Código seguro de consulta"
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

        {buscado && !consulta.isPending && !resultado ? (
          <p className="mt-6 text-sm text-muted-foreground">
            No encontramos ninguna cotización o pedido con ese código. Revísalo o consúltanos por WhatsApp.
          </p>
        ) : null}

        {cotizacion ? (
          <article className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="border-b border-border bg-surface/60 p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
                    Cotización
                  </p>
                  <h2 className="mt-1 font-display text-2xl">
                    {cotizacion.numero} <span className="text-muted-foreground">v{cotizacion.version}</span>
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {cotizacion.trabajo}
                    {cotizacion.sede ? ` · ${cotizacion.sede}` : ""}
                  </p>
                </div>
                <span className="w-fit rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
                  {etiquetaEstadoCotizacion(cotizacion.estado)}
                </span>
              </div>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto]">
              <section>
                <h3 className="text-sm font-semibold">Propuesta</h3>
                <div className="mt-4 space-y-3">
                  {cotizacion.detalles.map((detalle) => (
                    <div key={`${detalle.orden}-${detalle.descripcion}`} className="flex justify-between gap-4 border-b border-border pb-3 text-sm last:border-0">
                      <div>
                        <p className="font-medium">{detalle.descripcion}</p>
                        <p className="text-xs text-muted-foreground">
                          {detalle.cantidad} {detalle.unidad}
                        </p>
                      </div>
                      <p className="font-medium">{moneda(detalle.total_precio, cotizacion.moneda)}</p>
                    </div>
                  ))}
                </div>

                {cotizacion.especificaciones?.descripcion ? (
                  <div className="mt-5 rounded-xl border border-border bg-surface/60 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Detalles de la joya
                    </p>
                    <p className="mt-2 text-sm">{cotizacion.especificaciones.descripcion}</p>
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      {cotizacion.especificaciones.metal ? <span>Metal: {cotizacion.especificaciones.metal}</span> : null}
                      {cotizacion.especificaciones.ley ? <span>Ley: {cotizacion.especificaciones.ley}</span> : null}
                      {cotizacion.especificaciones.piedras ? <span>Piedras: {cotizacion.especificaciones.piedras}</span> : null}
                      {cotizacion.especificaciones.talla ? <span>Talla: {cotizacion.especificaciones.talla}</span> : null}
                      {cotizacion.especificaciones.cantidad_piezas ? <span>Cantidad: {cotizacion.especificaciones.cantidad_piezas}</span> : null}
                    </div>
                  </div>
                ) : null}

                {cotizacion.notas_cliente ? (
                  <div className="mt-5 rounded-xl border border-border bg-surface/60 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Observaciones
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{cotizacion.notas_cliente}</p>
                  </div>
                ) : null}
              </section>

              <aside className="min-w-[220px] rounded-xl border border-border bg-surface/60 p-5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cliente</p>
                <p className="mt-1 font-medium">{cotizacion.cliente}</p>

                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Emisión</dt>
                    <dd>{fmtFecha(cotizacion.fecha_emision) ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Vigencia</dt>
                    <dd>{fmtFecha(cotizacion.fecha_vencimiento) ?? "—"}</dd>
                  </div>
                  {cotizacion.fecha_entrega_solicitada ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Entrega solicitada</dt>
                      <dd>{fmtFecha(cotizacion.fecha_entrega_solicitada) ?? "—"}</dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-6 border-t border-border pt-4">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{moneda(cotizacion.subtotal, cotizacion.moneda)}</span>
                  </div>
                  {cotizacion.descuento > 0 ? (
                    <div className="mt-2 flex justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Descuento</span>
                      <span>-{moneda(cotizacion.descuento, cotizacion.moneda)}</span>
                    </div>
                  ) : null}
                  <div className="mt-2 flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Impuestos</span>
                    <span>{moneda(cotizacion.impuestos, cotizacion.moneda)}</span>
                  </div>
                  <div className="mt-4 flex justify-between gap-4 border-t border-border pt-4">
                    <span className="font-semibold">Total</span>
                    <span className="text-lg font-semibold">{moneda(cotizacion.total, cotizacion.moneda)}</span>
                  </div>
                </div>
              </aside>
            </div>
          </article>
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
                  <span className="font-medium text-foreground">{areaCliente(pedido.area_actual)}</span>
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
                  <span className={i === indice ? "font-medium" : "text-muted-foreground"}>{estado}</span>
                </li>
              ))}
            </ol>

            <section className="mt-6 rounded-xl border border-border bg-surface/60 p-4">
              <h3 className="text-sm font-semibold">Información adicional</h3>
              {estadoActual === "En Camino" || estadoActual === "Entregado" ? (
                <dl className="mt-3 grid gap-3 text-sm">
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Medio de envío</dt>
                    <dd className="mt-1 font-medium">{pedido.medio_envio || "Por confirmar"}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Guía / comprobante</dt>
                    <dd className="mt-1 font-medium">{pedido.guia_envio || "Por confirmar"}</dd>
                  </div>
                  {estadoActual === "En Camino" ? (
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Fecha de envío</dt>
                      <dd className="mt-1 font-medium">{fmtFecha(pedido.fecha_envio) ?? "Por confirmar"}</dd>
                    </div>
                  ) : null}
                  {estadoActual === "Entregado" ? (
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Fecha de entrega</dt>
                      <dd className="mt-1 font-medium">{fmtFecha(pedido.fecha_entregado) ?? "Por confirmar"}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Aquí se mostrarán certificados, guía de envío, observaciones o datos técnicos cuando estén disponibles.
                </p>
              )}
            </section>

            <div className="mt-6 border-t border-border pt-4 text-sm">
              <span className="text-muted-foreground">Fecha estimada de entrega: </span>
              <span className="font-medium">{fmtFecha(pedido.fecha_entrega) ?? "por confirmar"}</span>
            </div>
          </article>
        ) : null}
      </div>
    </main>
  );
}
