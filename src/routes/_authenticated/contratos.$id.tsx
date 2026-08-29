import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { AppShell, Panel } from "@/components/AppShell";
import { FechaInput } from "@/components/FechaInput";
import { AREAS, normalizarArea, useSesion } from "@/lib/auth";
import {
  estadoClases,
  useContrato,
  useCrearTrabajoContrato,
  usePedidosContrato,
  type PedidoNuevo,
} from "@/lib/taller-db";
import { fmtFecha } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/contratos/$id")({
  head: () => ({
    meta: [
      { title: "Contrato — Aurum Lab" },
      {
        name: "description",
        content: "Contrato comercial con varios trabajos productivos independientes.",
      },
    ],
  }),
  component: ContratoPage,
});

const AREAS_PRODUCTIVAS = AREAS.filter((area) => area !== "Pedidos" && area !== "Área ventas");

const formularioVacio = {
  nombre: "",
  tipo: "",
  descripcion: "",
  fecha_entrega: "",
};

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(valor: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 2,
  }).format(valor);
}

function ContratoPage() {
  const { id } = useParams({ from: "/_authenticated/contratos/$id" });
  const navigate = useNavigate();
  const { data: sesion } = useSesion();
  const { data: contrato, isLoading } = useContrato(id);
  const { pedidos, isLoading: cargandoPedidos } = usePedidosContrato(contrato);
  const crearTrabajo = useCrearTrabajoContrato();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState(formularioVacio);
  const [ruta, setRuta] = useState<string[]>([]);

  const resumen = useMemo(() => {
    const totalTrabajos = pedidos.reduce((acc, pedido) => acc + Number(pedido.importe || 0), 0);
    const total = contrato?.total && contrato.total > 0 ? contrato.total : totalTrabajos;
    const abonado = contrato?.abonado ?? 0;
    return {
      total,
      abonado,
      saldo: Math.max(0, total - abonado),
    };
  }, [contrato?.abonado, contrato?.total, pedidos]);

  const puedeCrearTrabajo = Boolean(sesion?.esAdmin);

  if (isLoading) {
    return (
      <AppShell titulo="Contrato" subtitulo="Cargando…" atrasMovil={{ to: "/pedidos" }}>
        <p className="text-sm text-muted-foreground">Cargando contrato…</p>
      </AppShell>
    );
  }

  if (!contrato) {
    return (
      <AppShell titulo="Contrato no encontrado" atrasMovil={{ to: "/pedidos" }}>
        <p className="text-sm text-muted-foreground">
          Este contrato no existe o todavía no fue migrado desde pedidos.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell
      titulo={`Contrato ${contrato.numero}`}
      subtitulo={`${contrato.cliente}${contrato.sede_nombre ? ` · ${contrato.sede_nombre}` : ""}`}
      atrasMovil={{ to: "/pedidos" }}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Panel
            titulo={`Contrato ${contrato.numero}`}
            accion={
              <button
                type="button"
                onClick={() => navigate({ to: "/pedidos" })}
                className="hidden rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
              >
                ← Atrás
              </button>
            }
          >
            <div className="grid gap-4 p-4 sm:grid-cols-2 lg:p-6">
              <Dato label="Cliente" valor={contrato.cliente} />
              <Dato label="Teléfono" valor={contrato.telefono || "—"} />
              <Dato label="Origen" valor={contrato.origen || "—"} />
              <Dato label="Sede" valor={contrato.sede_nombre || "—"} />
            </div>
          </Panel>

          <Panel
            titulo="Trabajos asociados"
            accion={
              puedeCrearTrabajo ? (
                <button
                  type="button"
                  onClick={() => setModalAbierto(true)}
                  className="rounded-lg bg-ink px-3 py-2 text-xs font-medium text-ink-foreground"
                >
                  + Agregar trabajo
                </button>
              ) : null
            }
          >
            <div className="divide-y divide-border">
              {pedidos.map((pedido) => (
                <Link
                  key={pedido.id}
                  to="/pedidos/$id"
                  params={{ id: pedido.id }}
                  search={{ from: "pedidos" }}
                  className="block px-4 py-4 transition-colors hover:bg-surface-muted/70 lg:px-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{pedido.referencia}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {pedido.trabajo || pedido.pieza}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {pedido.cliente} · {normalizarArea(pedido.area_actual)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Entrega: {fmtFecha(pedido.fecha_entrega ?? pedido.entrega) ?? "Sin fecha"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${
                        estadoClases[pedido.estado] ?? "bg-surface-muted text-muted-foreground"
                      }`}
                    >
                      {pedido.estado}
                    </span>
                  </div>
                </Link>
              ))}
              {!cargandoPedidos && pedidos.length === 0 ? (
                <p className="px-4 py-8 text-sm text-muted-foreground lg:px-6">
                  Este contrato todavía no tiene trabajos asociados.
                </p>
              ) : null}
            </div>
            {puedeCrearTrabajo ? (
              <div className="border-t border-border p-4 lg:p-6">
                <button
                  type="button"
                  onClick={() => setModalAbierto(true)}
                  className="w-full rounded-xl border border-dashed border-border bg-surface-muted px-4 py-4 text-sm font-semibold text-foreground transition-colors hover:bg-card"
                >
                  + Agregar trabajo
                </button>
              </div>
            ) : null}
          </Panel>
        </div>

        <aside className="rounded-xl border border-border bg-card p-5 shadow-card lg:rounded-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Resumen comercial
          </p>
          <div className="mt-4 space-y-4">
            <Dato label="Total" valor={formatCurrency(resumen.total)} />
            <Dato label="Abonado" valor={formatCurrency(resumen.abonado)} />
            <Dato label="Saldo" valor={formatCurrency(resumen.saldo)} />
          </div>
        </aside>
      </div>

      {modalAbierto ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-lg"
            onSubmit={(e) => {
              e.preventDefault();
              if (ruta.length === 0) return;
              const nuevo: Omit<
                PedidoNuevo,
                | "referencia"
                | "cliente"
                | "telefono"
                | "origen"
                | "contrato"
                | "contrato_id"
                | "sede_id"
              > = {
                pieza: form.nombre,
                trabajo: form.nombre,
                material: "",
                estado: "Recibido",
                entrega: form.fecha_entrega,
                importe: 0,
                fecha_ingreso: hoy(),
                fecha_entrega: form.fecha_entrega || null,
                area_actual: "Pedidos",
                ruta,
                notas: [form.tipo, form.descripcion].filter(Boolean).join(" · "),
                talla: "",
                cantidad_piezas: 1,
                piedras: "",
                peso_estimado: "",
              };
              crearTrabajo.mutate(
                {
                  contrato,
                  pedido: nuevo,
                  referenciasExistentes: pedidos.map((pedido) => pedido.referencia),
                },
                {
                  onSuccess: () => {
                    setForm(formularioVacio);
                    setRuta([]);
                    setModalAbierto(false);
                  },
                },
              );
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Agregar trabajo</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Se creará un nuevo pedido dentro del contrato {contrato.numero}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                Cancelar
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Nombre del trabajo
                <input
                  required
                  value={form.nombre}
                  onChange={(e) => setForm((actual) => ({ ...actual, nombre: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base normal-case text-foreground sm:py-2 sm:text-sm"
                />
              </label>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Tipo de trabajo
                <input
                  value={form.tipo}
                  onChange={(e) => setForm((actual) => ({ ...actual, tipo: e.target.value }))}
                  placeholder="Anillo, argolla, dije…"
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base normal-case text-foreground sm:py-2 sm:text-sm"
                />
              </label>
              <label className="sm:col-span-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                Descripción
                <textarea
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm((actual) => ({ ...actual, descripcion: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base normal-case text-foreground sm:py-2 sm:text-sm"
                />
              </label>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Fecha estimada de entrega
                <FechaInput
                  value={form.fecha_entrega}
                  onChangeIso={(iso) => setForm((actual) => ({ ...actual, fecha_entrega: iso }))}
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground sm:py-2 sm:text-sm"
                />
              </label>
            </div>

            <fieldset className="mt-5">
              <legend className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                Áreas requeridas
              </legend>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {AREAS_PRODUCTIVAS.map((area) => {
                  const activa = ruta.includes(area);
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() =>
                        setRuta((actual) =>
                          activa
                            ? actual.filter((x) => x !== area)
                            : AREAS_PRODUCTIVAS.filter((x) => [...actual, area].includes(x)),
                        )
                      }
                      className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                        activa ? "border-transparent bg-ink text-gold-bright" : "border-border"
                      }`}
                    >
                      {area}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={crearTrabajo.isPending || !form.nombre.trim() || ruta.length === 0}
                className="rounded-lg bg-ink px-4 py-2 text-xs font-medium text-ink-foreground disabled:opacity-50"
              >
                {crearTrabajo.isPending ? "Creando…" : "Crear trabajo"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </AppShell>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{valor}</p>
    </div>
  );
}
