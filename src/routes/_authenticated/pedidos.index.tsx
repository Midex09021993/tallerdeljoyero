import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell, Panel, StatCard } from "@/components/AppShell";
import { AREAS, useSesion } from "@/lib/auth";
import {
  useBorrarPedido,
  useCrearPedido,
  useEnviarAArea,
  usePedidos,
  useSedes,
  type PedidoNuevo,
} from "@/lib/taller-db";

export const Route = createFileRoute("/_authenticated/pedidos/")({
  head: () => ({
    meta: [
      { title: "Pedidos — Aurum Lab" },
      {
        name: "description",
        content:
          "Seguimiento general de los pedidos del taller de joyería: área actual, ruta del trabajo, cliente, contrato y fecha de entrega.",
      },
      { property: "og:title", content: "Pedidos — Aurum Lab" },
      { property: "og:description", content: "Todos los pedidos de la sede y su área actual." },
    ],
  }),
  component: PedidosPage,
});

const RUTA_AREAS = AREAS.filter((a) => a !== "Pedidos" && a !== "Entregado");

const hoy = () => new Date().toISOString().slice(0, 10);

const vacio = {
  cliente: "",
  telefono: "",
  origen: "",
  contrato: "",
  trabajo: "",
  material: "Oro 18k",
  importe: "0",
  fecha_ingreso: hoy(),
  fecha_entrega: "",
  talla: "",
  cantidad_piezas: "1",
  piedras: "",
  notas: "",
};

export function areaClase(area: string) {
  const mapa: Record<string, string> = {
    Pedidos: "bg-surface-muted text-muted-foreground",
    "Diseño 3D": "bg-info-soft text-info",
    "Impresión 3D": "bg-accent text-foreground",
    Casting: "bg-warning-soft text-warning",
    Taller: "bg-warning-soft text-warning",
    "Servicio láser": "bg-surface-muted text-muted-foreground",
    "Área ventas": "bg-info-soft text-info",
    Entregado: "bg-success-soft text-success",
  };
  return mapa[area] ?? "bg-surface-muted";
}

/** Prefijo de referencia: dos primeras iniciales del taller (sede). */
export function prefijoSede(nombre: string | null | undefined) {
  const limpio = (nombre ?? "").replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]/g, "").trim();
  const palabras = limpio.split(/\s+/).filter(Boolean);
  const base =
    palabras.length >= 2
      ? palabras[0]!.charAt(0) + palabras[1]!.charAt(0)
      : (palabras[0] ?? "TA").slice(0, 2);
  return (base || "TA").toUpperCase();
}

/** Genera la siguiente referencia tipo GG-001 para esa sede. */
export function siguienteReferencia(nombreSede: string | null | undefined, refs: string[]) {
  const prefijo = prefijoSede(nombreSede);
  const re = new RegExp(`^${prefijo}-(\\d+)$`, "i");
  const max = refs.reduce((acc, r) => {
    const m = re.exec((r ?? "").trim());
    return m ? Math.max(acc, Number(m[1])) : acc;
  }, 0);
  return `${prefijo}-${String(max + 1).padStart(3, "0")}`;
}

function PedidosPage() {
  const navigate = useNavigate();
  const { data: sesion } = useSesion();
  const { data: pedidos = [], isLoading } = usePedidos();
  const { data: sedes = [] } = useSedes();
  const crear = useCrearPedido();
  const borrar = useBorrarPedido();
  const enviar = useEnviarAArea();

  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(vacio);
  const [ruta, setRuta] = useState<string[]>(["Diseño 3D", "Impresión 3D", "Casting", "Taller", "Área ventas"]);
  const [sedeId, setSedeId] = useState<string>("");
  const [filtro, setFiltro] = useState("Todas");
  const [busca, setBusca] = useState("");
  const [porBorrar, setPorBorrar] = useState<{ id: string; referencia: string } | null>(null);

  const puedeCrear = Boolean(sesion?.esAdmin);
  const sedePorDefecto = sedeId || sesion?.perfil.sede_id || sedes[0]?.id || "";

  const lista = useMemo(
    () =>
      pedidos.filter((p) => {
        const okArea = filtro === "Todas" || p.area_actual === filtro;
        const t = busca.trim().toLowerCase();
        const okTexto =
          !t ||
          [p.referencia, p.cliente, p.contrato, p.trabajo, p.pieza].some((v) =>
            (v ?? "").toLowerCase().includes(t),
          );
        return okArea && okTexto;
      }),
    [pedidos, filtro, busca],
  );

  const activos = pedidos.filter((p) => p.area_actual !== "Entregado").length;

  return (
    <AppShell
      titulo="Pedidos"
      subtitulo={
        isLoading
          ? "Cargando…"
          : `${pedidos.length} pedidos · ${sesion?.esDueno ? "todas las sedes" : (sesion?.sede?.nombre ?? "tu sede")}`
      }
      acciones={
        <>
          <StatCard etiqueta="Activos" valor={String(activos)} />
          <StatCard
            etiqueta="Entregados"
            valor={String(pedidos.length - activos)}
            tono="positivo"
          />
        </>
      }
    >
      <Panel
        titulo="Seguimiento general"
        accion={
          puedeCrear ? (
            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-muted"
            >
              {abierto ? "Cancelar" : "Nuevo pedido"}
            </button>
          ) : null
        }
      >
        {abierto ? (
          <form
            className="border-b border-border bg-surface-muted/40 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              const nombreSede = sedes.find((s) => s.id === sedePorDefecto)?.nombre ?? null;
              const nuevo: PedidoNuevo = {
                referencia: siguienteReferencia(
                  nombreSede,
                  pedidos.map((p) => p.referencia),
                ),
                pieza: form.trabajo,
                trabajo: form.trabajo,
                cliente: form.cliente,
                telefono: form.telefono,
                origen: form.origen,
                contrato: form.contrato,
                material: form.material,
                estado: "Diseño 3D",
                entrega: form.fecha_entrega,
                importe: Number(form.importe) || 0,
                fecha_ingreso: form.fecha_ingreso || hoy(),
                fecha_entrega: form.fecha_entrega || null,
                sede_id: sedePorDefecto || null,
                area_actual: "Pedidos",
                ruta,
                notas: form.notas,
                talla: form.talla,
                cantidad_piezas: Math.max(1, Number(form.cantidad_piezas) || 1),
                piedras: form.piedras,
              };
              crear.mutate(nuevo, {
                onSuccess: () => {
                  setForm(vacio);
                  setAbierto(false);
                },
              });
            }}
          >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {(
                [
                  ["cliente", "Cliente", "text"],
                  ["telefono", "WhatsApp", "tel"],
                  ["origen", "Origen / lugar", "text"],
                  ["contrato", "N° contrato", "text"],
                  ["trabajo", "Trabajo solicitado", "text"],
                  ["material", "Material", "text"],
                  ["importe", "Costo (S/)", "number"],
                  ["fecha_ingreso", "Fecha de ingreso", "date"],
                  ["fecha_entrega", "Fecha de entrega", "date"],
                  ["talla", "Talla / medida", "text"],
                  ["cantidad_piezas", "Cantidad de piezas", "number"],
                  ["piedras", "Piedras / componentes", "text"],
                ] as const
              ).map(([campo, etiqueta, tipo]) => (
                <label key={campo} className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {etiqueta}
                  <input
                    type={tipo}
                    min={campo === "cantidad_piezas" ? 1 : undefined}
                    required={campo === "cliente" || campo === "trabajo"}
                    value={form[campo]}
                    onChange={(e) => setForm((f) => ({ ...f, [campo]: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                  />
                </label>
              ))}

              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Sede
                <select
                  value={sedePorDefecto}
                  onChange={(e) => setSedeId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                >
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="col-span-2 text-[10px] uppercase tracking-wider text-muted-foreground lg:col-span-2">
                Referencias / notas del diseño
                <input
                  value={form.notas}
                  onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                />
              </label>
            </div>

            <fieldset className="mt-5">
              <legend className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                Ruta del pedido (marca sólo las áreas que necesita)
              </legend>
              <div className="flex flex-wrap gap-2">
                {RUTA_AREAS.map((a) => {
                  const activa = ruta.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() =>
                        setRuta((r) =>
                          activa ? r.filter((x) => x !== a) : RUTA_AREAS.filter((x) => [...r, a].includes(x)),
                        )
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        activa ? "border-transparent bg-ink text-gold-bright" : "border-border bg-card"
                      }`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={crear.isPending}
              className="mt-5 rounded-lg bg-ink px-4 py-2 text-xs font-medium text-ink-foreground disabled:opacity-50"
            >
              {crear.isPending ? "Guardando…" : "Guardar pedido"}
            </button>
          </form>
        ) : null}

        <div className="flex flex-wrap gap-2 border-b border-border px-6 py-3">
          <input
            placeholder="Buscar cliente, contrato o referencia…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="min-w-[220px] flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs"
          />
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs"
          >
            {["Todas", ...AREAS].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-muted">
                {["Ref", "Cliente", "Trabajo", "Área actual", "Entrega", ""].map((h, i) => (
                  <th
                    key={h || i}
                    className={`px-6 py-3 text-[10px] uppercase tracking-wider text-muted-foreground ${
                      i >= 4 ? "text-right" : ""
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate({ to: "/pedidos/$id", params: { id: p.id } })}
                  className="group cursor-pointer transition-colors hover:bg-surface-muted/80 active:bg-surface-muted"
                  role="button"
                  aria-label={`Abrir ficha del pedido ${p.referencia}`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate({ to: "/pedidos/$id", params: { id: p.id } });
                    }
                  }}
                >
                  <td className="px-6 py-4 text-xs font-medium">
                    <span className="rounded-md bg-surface-muted px-2 py-1 group-hover:bg-gold/10 group-hover:text-gold">
                      {p.referencia}
                    </span>
                    {p.contrato ? (
                      <span className="block text-[10px] text-muted-foreground">Contrato {p.contrato}</span>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {p.cliente}
                    {sesion?.esDueno && p.sede_nombre ? (
                      <span className="block text-[10px] text-muted-foreground">{p.sede_nombre}</span>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{p.trabajo || p.pieza}</td>
                  <td className="px-6 py-4">
                    <div
                      className="flex flex-col gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <span
                        className={`inline-flex w-fit rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${areaClase(p.area_actual)}`}
                      >
                        {p.area_actual}
                      </span>
                      <select
                        value=""
                        onChange={(e) => {
                          const destino = e.target.value;
                          if (destino) enviar.mutate({ pedido: p, destino, usuarioId: sesion?.user.id ?? null });
                        }}
                        disabled={enviar.isPending}
                        className="w-fit rounded-md border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground disabled:opacity-40"
                      >
                        <option value="" disabled>
                          Enviar a…
                        </option>
                        {AREAS.filter((a) => a !== p.area_actual).map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm tabular-nums">
                    {p.fecha_entrega ?? p.entrega ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs font-medium text-info opacity-0 transition-opacity group-hover:opacity-100">
                        Abrir ficha →
                      </span>
                      {puedeCrear ? (
                        <button
                          type="button"
                          onClick={() => setPorBorrar({ id: p.id, referencia: p.referencia })}
                          className="text-xs text-muted-foreground transition-colors hover:text-danger"
                        >
                          Borrar
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && lista.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-sm text-muted-foreground">
                    No hay pedidos que coincidan.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>

      {porBorrar ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-lg">
            <h2 className="text-base font-semibold">Eliminar pedido</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              ¿Seguro que quieres eliminar el pedido {porBorrar.referencia}? Esta acción no se puede
              deshacer.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPorBorrar(null)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={borrar.isPending}
                onClick={() =>
                  borrar.mutate(porBorrar.id, { onSettled: () => setPorBorrar(null) })
                }
                className="rounded-lg bg-danger px-3 py-1.5 text-xs font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {borrar.isPending ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>

  );
}
