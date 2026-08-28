import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, StatCard } from "@/components/AppShell";
import { SelectorSedeDueno, useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";
import { fmtFecha } from "@/lib/utils";
import { useActualizarPedido, usePedidos, type Pedido } from "@/lib/taller-db";

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
  const { data: pedidos = [] } = usePedidos();
  const { esDueno, sedeFiltro, setSedeFiltro, sedes, filtrarPedidos, etiquetaSede } =
    useSedeFiltroDueno();
  const actualizar = useActualizarPedido();
  const [busca, setBusca] = useState("");
  const [envioId, setEnvioId] = useState<string | null>(null);

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

  const recibidos = filtrados.filter(
    (p) => !["En packing", "Enviado", "Entregado"].includes(p.ventas_estado),
  );
  const packing = filtrados.filter((p) => ["En packing", "Enviado"].includes(p.ventas_estado));
  const cerrados = pedidosPorSede.filter(
    (p) => p.area_actual === "Entregado" && ["Enviado", "Entregado"].includes(p.ventas_estado),
  );

  const abrirPedido = (id: string) =>
    navigate({ to: "/pedidos/$id", params: { id }, search: { from: "ventas" } });

  return (
    <AppShell
      titulo="Área ventas"
      subtitulo={`Recepción comercial, packing, despacho y entrega · ${etiquetaSede}`}
      acciones={
        <>
          <SelectorSedeDueno
            esDueno={esDueno}
            sedes={sedes}
            value={sedeFiltro}
            onChange={setSedeFiltro}
          />
          <StatCard etiqueta="En ventas" valor={String(enVentas.length)} />
          <StatCard etiqueta="En packing" valor={String(packing.length)} />
          <StatCard
            etiqueta="Enviados"
            valor={String(packing.filter((p) => p.ventas_estado === "Enviado").length)}
          />
        </>
      }
    >
      <div className="mb-5">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por REF, cliente, contrato, taller o guía..."
          className="h-11 w-full rounded-xl border border-border bg-card px-4 text-base outline-none focus:ring-1 focus:ring-gold sm:max-w-md sm:text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SeccionVentas titulo="Trabajos recibidos" cantidad={recibidos.length}>
          {recibidos.length === 0 ? (
            <Vacio texto="No hay trabajos nuevos en ventas." />
          ) : (
            recibidos.map((pedido) => (
              <PedidoVentaCard
                key={pedido.id}
                pedido={pedido}
                accionPrincipal="Iniciar packing"
                onAbrir={() => abrirPedido(pedido.id)}
                onAccion={() =>
                  actualizar.mutate({
                    id: pedido.id,
                    ventas_estado: "En packing",
                    packing_estado: "Preparando",
                  })
                }
              />
            ))
          )}
        </SeccionVentas>

        <SeccionVentas titulo="Packing y envío" cantidad={packing.length}>
          {packing.length === 0 ? (
            <Vacio texto="Sin pedidos en preparación o envío." />
          ) : (
            packing.map((pedido) => (
              <PedidoVentaCard
                key={pedido.id}
                pedido={pedido}
                accionPrincipal={
                  pedido.ventas_estado === "Enviado" ? "Marcar entregado" : "Registrar envío"
                }
                onAbrir={() => abrirPedido(pedido.id)}
                onAccion={() => {
                  if (pedido.ventas_estado === "Enviado") {
                    actualizar.mutate({
                      id: pedido.id,
                      area_actual: "Entregado",
                      ventas_estado: "Entregado",
                      packing_estado: "Entregado al cliente",
                    });
                  } else {
                    setEnvioId(pedido.id);
                  }
                }}
              >
                {envioId === pedido.id ? (
                  <FormularioEnvio
                    pedido={pedido}
                    guardando={actualizar.isPending}
                    onCancelar={() => setEnvioId(null)}
                    onGuardar={(datos) =>
                      actualizar.mutate(
                        {
                          id: pedido.id,
                          ventas_estado: "Enviado",
                          packing_estado: "Despachado",
                          ...datos,
                        },
                        { onSuccess: () => setEnvioId(null) },
                      )
                    }
                  />
                ) : null}
              </PedidoVentaCard>
            ))
          )}
        </SeccionVentas>

        <SeccionVentas titulo="Enviados / entregados" cantidad={cerrados.length}>
          {cerrados.length === 0 ? (
            <Vacio texto="Todavía no hay entregas cerradas desde ventas." />
          ) : (
            cerrados
              .slice(0, 12)
              .map((pedido) => (
                <PedidoVentaCard
                  key={pedido.id}
                  pedido={pedido}
                  accionPrincipal="Abrir"
                  onAbrir={() => abrirPedido(pedido.id)}
                  onAccion={() => abrirPedido(pedido.id)}
                />
              ))
          )}
        </SeccionVentas>
      </div>
    </AppShell>
  );
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

function PedidoVentaCard({
  pedido,
  accionPrincipal,
  onAbrir,
  onAccion,
  children,
}: {
  pedido: Pedido;
  accionPrincipal: string;
  onAbrir: () => void;
  onAccion: () => void;
  children?: ReactNode;
}) {
  return (
    <article className="px-4 py-4">
      <button type="button" onClick={onAbrir} className="block w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{pedido.referencia}</p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{pedido.cliente}</p>
          </div>
          <span className="shrink-0 rounded-full bg-success-soft px-2 py-1 text-[10px] font-semibold uppercase text-success">
            {pedido.ventas_estado || "Recibido"}
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
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Medio</dt>
            <dd className="mt-0.5 truncate text-foreground">{pedido.medio_envio || "Pendiente"}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Guía</dt>
            <dd className="mt-0.5 truncate text-foreground">{pedido.guia_envio || "Pendiente"}</dd>
          </div>
        </dl>
      </button>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onAccion}
          className="flex-1 rounded-xl bg-ink px-3 py-2.5 text-xs font-medium text-ink-foreground"
        >
          {accionPrincipal}
        </button>
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
          defaultValue={pedido.notas_ventas}
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
