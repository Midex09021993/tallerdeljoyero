import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, MobileBackButton, StatCard } from "@/components/AppShell";
import { SelectorSedeDueno, useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";
import { fmtFecha } from "@/lib/utils";
import {
  esEstadoFinalPedido,
  estadoClases,
  useActualizarPedido,
  useContratos,
  usePedidos,
  type Contrato,
  type Pedido,
} from "@/lib/taller-db";
import { useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/ventas")({
  head: () => ({
    meta: [
      { title: "Área ventas — Aurum Lab" },
      {
        name: "description",
        content:
          "Pedidos listos para atención comercial, coordinación con cliente y entrega en la joyería.",
      },
      { property: "og:title", content: "Área ventas — Aurum Lab" },
      {
        property: "og:description",
        content: "Seguimiento de pedidos asignados al área comercial.",
      },
    ],
  }),
  component: VentasPage,
});

function VentasPage() {
  const navigate = useNavigate();
  const { data: sesion } = useSesion();
  const { data: pedidos = [] } = usePedidos();
  const { data: contratos = [] } = useContratos();
  const { esDueno, sedeFiltro, setSedeFiltro, sedes, filtrarPedidos, etiquetaSede } =
    useSedeFiltroDueno();
  const actualizar = useActualizarPedido();
  const [busca, setBusca] = useState("");
  const [listoId, setListoId] = useState<string | null>(null);
  const [envioId, setEnvioId] = useState<string | null>(null);
  const [entregaId, setEntregaId] = useState<string | null>(null);
  const esAdmin = Boolean(sesion?.esAdmin);
  const usuarioId = sesion?.user.id ?? null;

  const pedidosPorSede = useMemo(() => filtrarPedidos(pedidos), [filtrarPedidos, pedidos]);
  const enVentas = pedidosPorSede.filter((p) => p.area_actual === "Área ventas");
  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return enVentas;
    return enVentas.filter((p) =>
      [
        p.referencia,
        p.cliente,
        p.contrato,
        p.trabajo,
        p.pieza,
        p.sede_nombre,
        p.medio_envio,
        p.guia_envio,
      ]
        .join(" ")
        .toLowerCase()
        .includes(t),
    );
  }, [busca, enVentas]);

  const pendientesEntrega = filtrados.filter((p) => {
    const estado = estadoVenta(p);
    return (
      p.area_actual === "Área ventas" && ["Área de Ventas", "Listo para Entrega"].includes(estado)
    );
  });
  const enviados = filtrados.filter((p) => estadoVenta(p) === "Enviado");
  const entregados = pedidosPorSede.filter((p) => estadoVenta(p) === "Entregado");
  const contratosPorClave = useMemo(() => crearIndiceContratos(contratos), [contratos]);

  const abrirPedido = (id: string) =>
    navigate({ to: "/pedidos/$id", params: { id }, search: { from: "ventas" } });

  const contenido = (
    <>
      <div className="mb-5 max-sm:hidden">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por REF, cliente, contrato, taller o guía..."
          className="h-11 w-full rounded-xl border border-border bg-card px-4 text-base outline-none focus:ring-1 focus:ring-gold sm:max-w-md sm:text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SeccionVentas titulo="Pendientes de entrega" cantidad={pendientesEntrega.length}>
          {pendientesEntrega.length === 0 ? (
            <Vacio texto="No hay pedidos pendientes de entrega." />
          ) : (
            pendientesEntrega.map((pedido) => {
              const listo = estadoVenta(pedido) === "Listo para Entrega";
              const puedeEditarEntrega = esAdmin || estadoVenta(pedido) !== "Entregado";
              return (
                <PedidoVentaCard
                  key={pedido.id}
                  pedido={pedido}
                  resumenFinanciero={resumenFinancieroPedido(pedido, contratosPorClave)}
                  accionPrincipal={listo ? "Registrar envío" : "Marcar listo para entrega"}
                  {...(listo && puedeEditarEntrega ? { accionSecundaria: "Entregado" } : {})}
                  onAbrir={() => abrirPedido(pedido.id)}
                  onAccion={() => {
                    if (listo) {
                      setEnvioId(pedido.id);
                      setEntregaId(null);
                      setListoId(null);
                    } else {
                      setListoId(pedido.id);
                      setEnvioId(null);
                      setEntregaId(null);
                    }
                  }}
                  onAccionSecundaria={() => {
                    setEntregaId(pedido.id);
                    setEnvioId(null);
                    setListoId(null);
                  }}
                >
                  {listoId === pedido.id ? (
                    <FormularioListoEntrega
                      pedido={pedido}
                      guardando={actualizar.isPending}
                      onCancelar={() => setListoId(null)}
                      onGuardar={(datos) => {
                        const ahora = new Date().toISOString();
                        actualizar.mutate(
                          {
                            id: pedido.id,
                            area_actual: "Área ventas",
                            estado: "Listo para Entrega",
                            ventas_estado: "Listo para Entrega",
                            packing_estado: "Listo para entrega",
                            fecha_listo_entrega: datos.fecha_listo_entrega,
                            listo_entrega_observaciones: datos.listo_entrega_observaciones,
                            usuario_listo_entrega: usuarioId,
                            ventas_actualizado_por: usuarioId,
                            ventas_actualizado_en: ahora,
                          },
                          { onSuccess: () => setListoId(null) },
                        );
                      }}
                    />
                  ) : null}
                  {envioId === pedido.id ? (
                    <FormularioEnvio
                      pedido={pedido}
                      guardando={actualizar.isPending}
                      onCancelar={() => setEnvioId(null)}
                      onGuardar={(datos) => {
                        const ahora = new Date().toISOString();
                        actualizar.mutate(
                          {
                            id: pedido.id,
                            area_actual: "Área ventas",
                            estado: "Enviado",
                            ventas_estado: "Enviado",
                            packing_estado: "Despachado",
                            usuario_envio: usuarioId,
                            enviado_at: ahora,
                            ventas_actualizado_por: usuarioId,
                            ventas_actualizado_en: ahora,
                            ...datos,
                          },
                          { onSuccess: () => setEnvioId(null) },
                        );
                      }}
                    />
                  ) : null}
                  {entregaId === pedido.id ? (
                    <FormularioEntrega
                      pedido={pedido}
                      guardando={actualizar.isPending}
                      onCancelar={() => setEntregaId(null)}
                      onGuardar={(datos) => {
                        const ahora = new Date().toISOString();
                        actualizar.mutate(
                          {
                            id: pedido.id,
                            area_actual: "Área ventas",
                            estado: "Entregado",
                            ventas_estado: "Entregado",
                            packing_estado: "Entregado al cliente",
                            usuario_entrega: usuarioId,
                            entregado_at: ahora,
                            ventas_actualizado_por: usuarioId,
                            ventas_actualizado_en: ahora,
                            ...datos,
                          },
                          { onSuccess: () => setEntregaId(null) },
                        );
                      }}
                    />
                  ) : null}
                </PedidoVentaCard>
              );
            })
          )}
        </SeccionVentas>

        <SeccionVentas titulo="Enviados" cantidad={enviados.length}>
          {enviados.length === 0 ? (
            <Vacio texto="Sin pedidos enviados." />
          ) : (
            enviados.map((pedido) => (
              <PedidoVentaCard
                key={pedido.id}
                pedido={pedido}
                resumenFinanciero={resumenFinancieroPedido(pedido, contratosPorClave)}
                accionPrincipal="Marcar entregado"
                onAbrir={() => abrirPedido(pedido.id)}
                onAccion={() => {
                  setEntregaId(pedido.id);
                  setEnvioId(null);
                  setListoId(null);
                }}
              >
                {entregaId === pedido.id ? (
                  <FormularioEntrega
                    pedido={pedido}
                    guardando={actualizar.isPending}
                    onCancelar={() => setEntregaId(null)}
                    onGuardar={(datos) => {
                      const ahora = new Date().toISOString();
                      actualizar.mutate(
                        {
                          id: pedido.id,
                          area_actual: "Área ventas",
                          estado: "Entregado",
                          ventas_estado: "Entregado",
                          packing_estado: "Entregado al cliente",
                          usuario_entrega: usuarioId,
                          entregado_at: ahora,
                          ventas_actualizado_por: usuarioId,
                          ventas_actualizado_en: ahora,
                          ...datos,
                        },
                        { onSuccess: () => setEntregaId(null) },
                      );
                    }}
                  />
                ) : null}
              </PedidoVentaCard>
            ))
          )}
        </SeccionVentas>

        <SeccionVentas titulo="Entregados" cantidad={entregados.length}>
          {entregados.length === 0 ? (
            <Vacio texto="Todavía no hay entregas cerradas desde ventas." />
          ) : (
            entregados.slice(0, 12).map((pedido) => (
              <PedidoVentaCard
                key={pedido.id}
                pedido={pedido}
                resumenFinanciero={resumenFinancieroPedido(pedido, contratosPorClave)}
                accionPrincipal={esAdmin ? "Corregir entrega" : "Abrir"}
                onAbrir={() => abrirPedido(pedido.id)}
                onAccion={() => {
                  if (esAdmin) {
                    setEntregaId(pedido.id);
                    setEnvioId(null);
                    setListoId(null);
                  } else {
                    abrirPedido(pedido.id);
                  }
                }}
              >
                {esAdmin && entregaId === pedido.id ? (
                  <FormularioEntrega
                    pedido={pedido}
                    guardando={actualizar.isPending}
                    onCancelar={() => setEntregaId(null)}
                    onGuardar={(datos) => {
                      const ahora = new Date().toISOString();
                      actualizar.mutate(
                        {
                          id: pedido.id,
                          area_actual: "Área ventas",
                          estado: "Entregado",
                          ventas_estado: "Entregado",
                          packing_estado: "Entregado al cliente",
                          usuario_entrega: pedido.usuario_entrega || usuarioId,
                          ventas_actualizado_por: usuarioId,
                          ventas_actualizado_en: ahora,
                          ...datos,
                        },
                        { onSuccess: () => setEntregaId(null) },
                      );
                    }}
                  />
                ) : null}
              </PedidoVentaCard>
            ))
          )}
        </SeccionVentas>
      </div>
    </>
  );

  if (sesion?.rolPrincipal === "operario") {
    return (
      <main className="min-h-screen bg-background px-4 py-5 pb-8 text-foreground sm:px-6">
        <header className="sticky top-0 z-30 -mx-4 mb-3 flex items-start justify-between gap-3 bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:mb-5 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cola de trabajo
            </p>
            <h1 className="mt-1 font-display text-3xl">Área ventas</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Entregas, envíos y cierre comercial.
            </p>
          </div>
          <MobileBackButton atrasMovil={{ to: "/inicio" }} />
        </header>
        {contenido}
      </main>
    );
  }

  return (
    <AppShell
      titulo="Área ventas"
      subtitulo={`Recepción comercial, packing, despacho y entrega · ${etiquetaSede}`}
      ocultarAccionesCelular
      acciones={
        <>
          <SelectorSedeDueno
            esDueno={esDueno}
            sedes={sedes}
            value={sedeFiltro}
            onChange={setSedeFiltro}
          />
          <StatCard etiqueta="Pendientes" valor={String(pendientesEntrega.length)} />
          <StatCard etiqueta="Enviados" valor={String(enviados.length)} />
          <StatCard etiqueta="Entregados" valor={String(entregados.length)} />
        </>
      }
    >
      {contenido}
    </AppShell>
  );
}

function estadoVenta(pedido: Pedido) {
  if (["Listo para Entrega", "Enviado", "Entregado"].includes(pedido.estado)) return pedido.estado;
  if (["Listo para Entrega", "Enviado", "Entregado"].includes(pedido.ventas_estado)) {
    return pedido.ventas_estado;
  }
  if (esEstadoFinalPedido(pedido.estado)) return pedido.estado;
  return "Área de Ventas";
}

function formatCurrency(valor: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 2,
  }).format(valor);
}

type ResumenFinanciero = {
  total: number;
  abonado: number;
  saldo: number;
  estado: "Pendiente" | "Abonado parcial" | "Pagado";
  origen: "contrato" | "pedido";
};

function crearIndiceContratos(contratos: Contrato[]) {
  const indice = new Map<string, Contrato>();
  contratos.forEach((contrato) => {
    if (contrato.id) indice.set(contrato.id, contrato);
    if (contrato.numero) indice.set(contrato.numero, contrato);
  });
  return indice;
}

function resumenFinancieroPedido(
  pedido: Pedido,
  contratosPorClave: Map<string, Contrato>,
): ResumenFinanciero {
  const contrato =
    (pedido.contrato_id ? contratosPorClave.get(pedido.contrato_id) : null) ??
    (pedido.contrato ? contratosPorClave.get(pedido.contrato) : null);
  const total = contrato ? Number(contrato.total) || 0 : Number(pedido.importe) || 0;
  const abonado = contrato ? Number(contrato.abonado) || 0 : 0;
  const saldo = Math.max(0, total - abonado);
  const estado: ResumenFinanciero["estado"] =
    saldo <= 0 && total > 0 ? "Pagado" : abonado > 0 ? "Abonado parcial" : "Pendiente";

  return {
    total,
    abonado,
    saldo,
    estado,
    origen: contrato ? "contrato" : "pedido",
  };
}

function SeccionVentas({
  titulo,
  cantidad,
  children,
}: {
  titulo: string;
  cantidad: number;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">{titulo}</h2>
        <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {cantidad}
        </span>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function Vacio({ texto }: { texto: string }) {
  return <p className="px-4 py-8 text-sm text-muted-foreground">{texto}</p>;
}

function fechaHoy() {
  return new Date().toISOString().slice(0, 10);
}

function PedidoVentaCard({
  pedido,
  resumenFinanciero,
  accionPrincipal,
  accionSecundaria,
  onAbrir,
  onAccion,
  onAccionSecundaria,
  children,
}: {
  pedido: Pedido;
  resumenFinanciero: ResumenFinanciero;
  accionPrincipal: string;
  accionSecundaria?: string;
  onAbrir: () => void;
  onAccion: () => void;
  onAccionSecundaria?: () => void;
  children?: ReactNode;
}) {
  const estadoComercial = estadoVenta(pedido);
  const tieneSaldo = resumenFinanciero.saldo > 0;
  return (
    <article className="px-4 py-4">
      <button type="button" onClick={onAbrir} className="block w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{pedido.referencia}</p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{pedido.cliente}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${estadoClases[estadoComercial] ?? "bg-success-soft text-success"}`}
          >
            {estadoComercial}
          </span>
        </div>
        <p className="mt-3 line-clamp-2 text-sm text-foreground">
          {pedido.trabajo || pedido.pieza}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Taller</dt>
            <dd className="mt-0.5 truncate text-foreground">{pedido.sede_nombre || "Sin sede"}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Entrega</dt>
            <dd className="mt-0.5 text-foreground">
              {fmtFecha(pedido.fecha_entrega ?? pedido.entrega) ?? "Sin fecha"}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Envío</dt>
            <dd className="mt-0.5 truncate text-foreground">{pedido.medio_envio || "Pendiente"}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Listo</dt>
            <dd className="mt-0.5 truncate text-foreground">
              {fmtFecha(pedido.fecha_listo_entrega) ?? "Pendiente"}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Entregado
            </dt>
            <dd className="mt-0.5 truncate text-foreground">
              {fmtFecha(pedido.fecha_entregado) ?? "Pendiente"}
            </dd>
          </div>
        </dl>
        <div
          className={`mt-3 rounded-xl border p-3 text-xs ${
            tieneSaldo
              ? "border-warning/25 bg-warning-soft text-warning"
              : "border-success/20 bg-success-soft text-success"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider">
                Estado financiero
              </p>
              <p className="mt-1 font-semibold">{resumenFinanciero.estado}</p>
            </div>
            {tieneSaldo ? (
              <p className="text-right font-semibold">
                Saldo pendiente: {formatCurrency(resumenFinanciero.saldo)}
              </p>
            ) : (
              <p className="text-right font-semibold">Sin saldo pendiente</p>
            )}
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <div>
              <dt className="opacity-75">Total</dt>
              <dd className="mt-0.5 font-medium">{formatCurrency(resumenFinanciero.total)}</dd>
            </div>
            <div>
              <dt className="opacity-75">Abonado</dt>
              <dd className="mt-0.5 font-medium">{formatCurrency(resumenFinanciero.abonado)}</dd>
            </div>
            <div>
              <dt className="opacity-75">Saldo</dt>
              <dd className="mt-0.5 font-medium">{formatCurrency(resumenFinanciero.saldo)}</dd>
            </div>
          </dl>
          {resumenFinanciero.origen === "pedido" ? (
            <p className="mt-2 text-[10px] opacity-75">
              Sin contrato financiero enlazado; se usa el costo del pedido como referencia.
            </p>
          ) : null}
        </div>
      </button>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAccion}
          className="min-w-[140px] flex-1 rounded-xl bg-ink px-3 py-2.5 text-xs font-medium text-ink-foreground"
        >
          {accionPrincipal}
        </button>
        {accionSecundaria && onAccionSecundaria ? (
          <button
            type="button"
            onClick={onAccionSecundaria}
            className="min-w-[110px] flex-1 rounded-xl border border-success/25 bg-success-soft px-3 py-2.5 text-xs font-medium text-success"
          >
            {accionSecundaria}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onAbrir}
          className="rounded-xl border border-border px-3 py-2.5 text-xs font-medium"
        >
          Ficha
        </button>
      </div>
      {children}
    </article>
  );
}

function FormularioListoEntrega({
  pedido,
  guardando,
  onCancelar,
  onGuardar,
}: {
  pedido: Pedido;
  guardando: boolean;
  onCancelar: () => void;
  onGuardar: (datos: { fecha_listo_entrega: string; listo_entrega_observaciones: string }) => void;
}) {
  return (
    <form
      className="mt-4 rounded-xl border border-warning/20 bg-warning-soft/40 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onGuardar({
          fecha_listo_entrega: String(fd.get("fecha_listo_entrega") || fechaHoy()),
          listo_entrega_observaciones: String(fd.get("listo_entrega_observaciones") || ""),
        });
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Fecha listo para entrega
          <input
            name="fecha_listo_entrega"
            type="date"
            defaultValue={pedido.fecha_listo_entrega ?? fechaHoy()}
            className="mt-1 h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground sm:text-sm"
          />
        </label>
      </div>
      <label className="mt-3 block text-[10px] uppercase tracking-wider text-muted-foreground">
        Observaciones
        <textarea
          name="listo_entrega_observaciones"
          defaultValue={pedido.listo_entrega_observaciones}
          rows={3}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-base text-foreground sm:text-sm"
        />
      </label>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={guardando}
          className="flex-1 rounded-lg bg-ink px-4 py-2 text-xs font-medium text-ink-foreground disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Confirmar listo"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function FormularioEnvio({
  pedido,
  guardando,
  onCancelar,
  onGuardar,
}: {
  pedido: Pedido;
  guardando: boolean;
  onCancelar: () => void;
  onGuardar: (datos: {
    medio_envio: string;
    guia_envio: string;
    fecha_envio: string;
    receptor_envio: string;
    notas_ventas: string;
    notas_envio: string;
  }) => void;
}) {
  return (
    <form
      className="mt-4 rounded-xl border border-border bg-surface-muted p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onGuardar({
          medio_envio: String(fd.get("medio_envio") || ""),
          guia_envio: String(fd.get("guia_envio") || ""),
          fecha_envio: String(fd.get("fecha_envio") || new Date().toISOString().slice(0, 10)),
          receptor_envio: String(fd.get("receptor_envio") || ""),
          notas_ventas: String(fd.get("notas_ventas") || ""),
          notas_envio: String(fd.get("notas_ventas") || ""),
        });
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Medio de envío
          <input
            name="medio_envio"
            defaultValue={pedido.medio_envio}
            placeholder="Recojo, motorizado, Olva, Shalom..."
            className="mt-1 h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground sm:text-sm"
          />
        </label>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Guía / comprobante
          <input
            name="guia_envio"
            defaultValue={pedido.guia_envio}
            className="mt-1 h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground sm:text-sm"
          />
        </label>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Fecha de envío
          <input
            name="fecha_envio"
            type="date"
            defaultValue={pedido.fecha_envio ?? new Date().toISOString().slice(0, 10)}
            className="mt-1 h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground sm:text-sm"
          />
        </label>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Recibe / contacto
          <input
            name="receptor_envio"
            defaultValue={pedido.receptor_envio || pedido.cliente}
            className="mt-1 h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground sm:text-sm"
          />
        </label>
      </div>
      <label className="mt-3 block text-[10px] uppercase tracking-wider text-muted-foreground">
        Nota de ventas
        <textarea
          name="notas_ventas"
          defaultValue={pedido.notas_envio || pedido.notas_ventas}
          rows={3}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-base text-foreground sm:text-sm"
        />
      </label>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={guardando}
          className="flex-1 rounded-lg bg-success px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar envío"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-lg border border-border px-4 py-2 text-xs font-medium"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function FormularioEntrega({
  pedido,
  guardando,
  onCancelar,
  onGuardar,
}: {
  pedido: Pedido;
  guardando: boolean;
  onCancelar: () => void;
  onGuardar: (datos: {
    fecha_entregado: string;
    receptor_envio: string;
    notas_ventas: string;
    notas_entrega: string;
  }) => void;
}) {
  return (
    <form
      className="mt-4 rounded-xl border border-success/20 bg-success-soft/40 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onGuardar({
          fecha_entregado: String(
            fd.get("fecha_entregado") || new Date().toISOString().slice(0, 10),
          ),
          receptor_envio: String(
            fd.get("receptor_envio") || pedido.receptor_envio || pedido.cliente,
          ),
          notas_ventas: String(fd.get("notas_ventas") || pedido.notas_ventas || ""),
          notas_entrega: String(fd.get("notas_ventas") || pedido.notas_entrega || ""),
        });
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Fecha entregado
          <input
            name="fecha_entregado"
            type="date"
            defaultValue={pedido.fecha_entregado ?? new Date().toISOString().slice(0, 10)}
            className="mt-1 h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground sm:text-sm"
          />
        </label>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Recibe / contacto
          <input
            name="receptor_envio"
            defaultValue={pedido.receptor_envio || pedido.cliente}
            className="mt-1 h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground sm:text-sm"
          />
        </label>
      </div>
      <label className="mt-3 block text-[10px] uppercase tracking-wider text-muted-foreground">
        Nota de entrega
        <textarea
          name="notas_ventas"
          defaultValue={pedido.notas_entrega || pedido.notas_ventas}
          rows={3}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-base text-foreground sm:text-sm"
        />
      </label>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={guardando}
          className="flex-1 rounded-lg bg-success px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Confirmar entrega"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
