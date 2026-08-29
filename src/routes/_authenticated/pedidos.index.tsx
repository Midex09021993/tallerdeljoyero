import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell, Panel, StatCard } from "@/components/AppShell";
import { PedidoFormCampos } from "@/components/PedidoFormCampos";
import {
  SelectorSedeDueno,
  TODAS_LAS_SEDES,
  useSedeFiltroDueno,
} from "@/hooks/use-sede-filtro-dueno";
import { fmtFecha } from "@/lib/utils";
import { areaCoincide, normalizarArea, useSesion } from "@/lib/auth";
import { pedidoFormVacio, type PedidoFormState } from "@/lib/pedido-form";
import {
  useBorrarPedido,
  useAutorizarProduccion,
  useCrearPedido,
  useEnviarAArea,
  usePedidos,
  useSedes,
  esEstadoFinalPedido,
  estadoClases,
  estados,
  pedidoEnEvaluacion,
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

const AREAS_SEGUIMIENTO = [
  "Diseño 3D",
  "Impresión 3D",
  "Casting",
  "Corte Láser",
  "Taller",
  "Área ventas",
] as const;
const FILTROS_ENTREGA = ["Todas", "Hoy", "Esta semana", "Este mes", "Vencidos"] as const;
type FiltroEntrega = (typeof FILTROS_ENTREGA)[number];

const hoy = () => new Date().toISOString().slice(0, 10);

const nuevoPedidoVacio = (): PedidoFormState => ({ ...pedidoFormVacio, fecha_ingreso: hoy() });

function areaClase(area: string) {
  const mapa: Record<string, string> = {
    Pedidos: "bg-surface-muted text-muted-foreground",
    "Diseño 3D": "bg-info-soft text-info",
    "Impresión 3D": "bg-accent text-foreground",
    Casting: "bg-warning-soft text-warning",
    Taller: "bg-warning-soft text-warning",
    "Área ventas": "bg-success-soft text-success",
    "Corte Láser": "bg-surface-muted text-muted-foreground",
    "Servicio láser": "bg-surface-muted text-muted-foreground",
    Terminado: "bg-info-soft text-info",
    Entregado: "bg-success-soft text-success",
  };
  return mapa[area] ?? "bg-surface-muted";
}

function etiquetaAreaSeguimiento(area: string) {
  const normalizada = normalizarArea(area);
  return areaCoincide(normalizada, "Área ventas") ? "Área de Ventas" : normalizada;
}

function inicioDia(fecha = new Date()) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

function finDia(fecha = new Date()) {
  const d = new Date(fecha);
  d.setHours(23, 59, 59, 999);
  return d;
}

function coincideEntrega(fechaIso: string | null | undefined, filtro: FiltroEntrega) {
  if (filtro === "Todas") return true;
  if (!fechaIso) return false;

  const fecha = new Date(`${fechaIso}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return false;

  const hoyInicio = inicioDia();
  const hoyFin = finDia();

  if (filtro === "Hoy") {
    return fecha >= hoyInicio && fecha <= hoyFin;
  }

  if (filtro === "Vencidos") {
    return fecha < hoyInicio;
  }

  if (filtro === "Esta semana") {
    const finSemana = finDia();
    finSemana.setDate(hoyInicio.getDate() + 6);
    return fecha >= hoyInicio && fecha <= finSemana;
  }

  if (filtro === "Este mes") {
    return (
      fecha.getFullYear() === hoyInicio.getFullYear() && fecha.getMonth() === hoyInicio.getMonth()
    );
  }

  return true;
}

/** Prefijo de referencia: dos primeras iniciales del taller (sede). */
function prefijoSede(nombre: string | null | undefined) {
  const limpio = (nombre ?? "").replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]/g, "").trim();
  const palabras = limpio.split(/\s+/).filter(Boolean);
  const base =
    palabras.length >= 2
      ? palabras[0]!.charAt(0) + palabras[1]!.charAt(0)
      : (palabras[0] ?? "TA").slice(0, 2);
  return (base || "TA").toUpperCase();
}

/** Genera la siguiente referencia tipo GG-001 para esa sede. */
function siguienteReferencia(nombreSede: string | null | undefined, refs: string[]) {
  const prefijo = prefijoSede(nombreSede);
  const re = new RegExp(`^${prefijo}-(\\d+)$`, "i");
  const max = refs.reduce((acc, r) => {
    const m = re.exec((r ?? "").trim());
    return m ? Math.max(acc, Number(m[1])) : acc;
  }, 0);
  return `${prefijo}-${String(max + 1).padStart(3, "0")}`;
}

function TarjetaResumen({
  etiqueta,
  valor,
  tono = "neutro",
  porArea,
  subtitulo,
}: {
  etiqueta: string;
  valor: number;
  tono?: "neutro" | "positivo" | "negativo" | "warning";
  porArea?: Record<string, number>;
  subtitulo?: string;
}) {
  const colorClase =
    tono === "negativo"
      ? "text-danger"
      : tono === "positivo"
        ? "text-success"
        : tono === "warning"
          ? "text-warning"
          : "text-foreground";
  const badgeClase =
    tono === "negativo"
      ? "bg-danger/10 text-danger"
      : tono === "positivo"
        ? "bg-success/10 text-success"
        : tono === "warning"
          ? "bg-warning/10 text-warning"
          : "bg-surface-muted text-muted-foreground";
  return (
    <div className="flex min-w-[150px] flex-col rounded-xl border border-border bg-card p-4 shadow-card">
      <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{etiqueta}</p>
      <p className={`text-xl font-medium ${colorClase}`}>{String(valor)}</p>
      {subtitulo ? <p className="mt-1 text-[10px] text-muted-foreground">{subtitulo}</p> : null}
      {porArea && Object.keys(porArea).length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {Object.entries(porArea).map(([area, n]) => (
            <span
              key={area}
              className={`rounded-md px-1.5 py-0.5 text-[9px] leading-tight ${badgeClase}`}
              title={area}
            >
              {area}: {n}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PedidosPage() {
  const navigate = useNavigate();
  const { data: sesion } = useSesion();
  const { data: pedidos = [], isLoading } = usePedidos();
  const { data: sedes = [] } = useSedes();
  const {
    sedeFiltro,
    setSedeFiltro,
    sedes: sedesFiltro,
    filtrarPedidos,
    etiquetaSede,
  } = useSedeFiltroDueno();
  const crear = useCrearPedido();
  const borrar = useBorrarPedido();
  const enviar = useEnviarAArea();
  const autorizar = useAutorizarProduccion();

  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<PedidoFormState>(() => nuevoPedidoVacio());
  const [ruta, setRuta] = useState<string[]>([]);
  const [sedeId, setSedeId] = useState<string>("");
  const [filtroArea, setFiltroArea] = useState("Todas");
  const [filtroEstado, setFiltroEstado] = useState("Todas");
  const [filtroEntrega, setFiltroEntrega] = useState<FiltroEntrega>("Todas");
  const [busca, setBusca] = useState("");
  const [estadisticasMovilAbiertas, setEstadisticasMovilAbiertas] = useState(false);
  const [porBorrar, setPorBorrar] = useState<{ id: string; referencia: string } | null>(null);

  const puedeCrear = Boolean(sesion?.esAdmin);
  const sedeFiltradaParaCrear = sesion?.esDueno && sedeFiltro !== TODAS_LAS_SEDES ? sedeFiltro : "";
  const sedePorDefecto =
    sedeId || sedeFiltradaParaCrear || sesion?.perfil.sede_id || sedes[0]?.id || "";

  // Los operarios solo ven los pedidos que están en sus áreas asignadas.
  // Al buscar por texto pueden encontrar cualquier pedido, aunque ya haya avanzado.
  const soloSusAreas = Boolean(sesion && !sesion.esAdmin && (sesion.areas?.length ?? 0) > 0);
  const misAreas = useMemo(() => sesion?.areas ?? [], [sesion?.areas]);
  const pedidosPorSede = useMemo(() => filtrarPedidos(pedidos), [filtrarPedidos, pedidos]);

  const lista = useMemo(
    () =>
      pedidosPorSede.filter((p) => {
        const okArea = filtroArea === "Todas" || areaCoincide(p.area_actual, filtroArea);
        const okEstado = filtroEstado === "Todas" || p.estado === filtroEstado;
        const okEntrega = coincideEntrega(p.fecha_entrega ?? p.entrega, filtroEntrega);
        const t = busca.trim().toLowerCase();
        const okTexto =
          !t ||
          [
            p.referencia,
            p.cliente,
            p.contrato,
            p.origen,
            p.trabajo,
            p.pieza,
            p.estado,
            p.area_actual,
          ].some((v) => (v ?? "").toLowerCase().includes(t));
        const okOperario =
          !soloSusAreas || Boolean(t) || misAreas.some((area) => areaCoincide(area, p.area_actual));
        return okArea && okEstado && okEntrega && okTexto && okOperario;
      }),
    [pedidosPorSede, filtroArea, filtroEstado, filtroEntrega, busca, soloSusAreas, misAreas],
  );

  const activos = pedidosPorSede.filter((p) => !esEstadoFinalPedido(p.estado));
  const entregados = pedidosPorSede.filter((p) => p.estado === "Entregado");

  const diasHastaEntrega = (fechaIso: string | null | undefined): number | null => {
    if (!fechaIso) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const entrega = new Date(fechaIso);
    entrega.setHours(0, 0, 0, 0);
    return Math.ceil((entrega.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  };

  const atrasados = activos.filter((p) => {
    const d = diasHastaEntrega(p.fecha_entrega);
    return d !== null && d < 0;
  });

  const proximos = activos.filter((p) => {
    const d = diasHastaEntrega(p.fecha_entrega);
    return d !== null && d >= 0 && d <= 3;
  });

  const contarPorArea = (items: typeof pedidos) =>
    items.reduce(
      (acc, p) => {
        acc[p.area_actual] = (acc[p.area_actual] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

  const activosPorArea = contarPorArea(activos);
  const entregadosPorArea = contarPorArea(entregados);
  const atrasadosPorArea = contarPorArea(atrasados);
  const proximosPorArea = contarPorArea(proximos);
  const tarjetasResumen = (
    <>
      <TarjetaResumen etiqueta="Activos" valor={activos.length} porArea={activosPorArea} />
      <TarjetaResumen
        etiqueta="Entregados"
        valor={entregados.length}
        tono="positivo"
        porArea={entregadosPorArea}
      />
      <TarjetaResumen
        etiqueta="Atrasados"
        valor={atrasados.length}
        tono="negativo"
        porArea={atrasadosPorArea}
      />
      <TarjetaResumen
        etiqueta="Entrega próxima"
        valor={proximos.length}
        tono={proximos.length > 0 ? "warning" : "positivo"}
        porArea={proximosPorArea}
        subtitulo="Próximos 3 días"
      />
    </>
  );

  return (
    <AppShell
      titulo="Pedidos"
      subtitulo={
        isLoading
          ? "Cargando…"
          : `${pedidosPorSede.length} pedidos · ${sesion?.esDueno ? etiquetaSede : (sesion?.sede?.nombre ?? "tu sede")}`
      }
      acciones={
        <div className="w-full sm:w-auto">
          {sesion?.esAdmin ? (
            <div className="sm:hidden">
              <button
                type="button"
                onClick={() => setEstadisticasMovilAbiertas((v) => !v)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left text-xs font-semibold text-foreground shadow-card"
                aria-expanded={estadisticasMovilAbiertas}
              >
                {estadisticasMovilAbiertas ? "Ocultar estadísticas ▲" : "Ver estadísticas ▼"}
              </button>
              {estadisticasMovilAbiertas ? (
                <div className="mt-2 grid grid-cols-2 gap-2">{tarjetasResumen}</div>
              ) : null}
            </div>
          ) : null}
          <div
            className={`${sesion?.esAdmin ? "hidden sm:flex" : "flex"} flex-wrap items-stretch gap-3`}
          >
            {tarjetasResumen}
          </div>
        </div>
      }
    >
      <Panel
        titulo="Seguimiento general"
        accion={
          <div className="flex flex-wrap items-end gap-3">
            <SelectorSedeDueno
              esDueno={Boolean(sesion?.esDueno)}
              sedes={sedesFiltro}
              value={sedeFiltro}
              onChange={setSedeFiltro}
            />
            {puedeCrear ? (
              <button
                type="button"
                onClick={() => setAbierto((v) => !v)}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-surface-muted"
              >
                {abierto ? "Cancelar" : "Nuevo pedido"}
              </button>
            ) : null}
          </div>
        }
      >
        {sesion?.esDueno ? (
          <div className="border-b border-border bg-surface-muted/35 px-4 py-3 text-xs text-muted-foreground sm:px-6">
            Mostrando: <span className="font-medium text-foreground">{etiquetaSede}</span>
          </div>
        ) : null}
        {abierto ? (
          <form
            className="border-b border-border bg-surface-muted/40 p-4 sm:p-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (ruta.length === 0) {
                alert("Marca al menos un área en la ruta del pedido.");
                return;
              }
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
                peso_estimado: form.peso_estimado,
                estado: "Recibido",
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
                  setForm(nuevoPedidoVacio());
                  setRuta([]);
                  setAbierto(false);
                },
              });
            }}
          >
            <PedidoFormCampos
              form={form}
              onChange={setForm}
              ruta={ruta}
              onRutaChange={setRuta}
              sedeSelect={
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Sede
                  <select
                    value={sedePorDefecto}
                    onChange={(e) => setSedeId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground sm:py-2 sm:text-sm"
                  >
                    {sedes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              }
            />

            <button
              type="submit"
              disabled={crear.isPending}
              className="mt-5 w-full rounded-lg bg-ink px-4 py-3 text-sm font-medium text-ink-foreground disabled:opacity-50 sm:w-auto sm:py-2 sm:text-xs"
            >
              {crear.isPending ? "Guardando…" : "Guardar pedido"}
            </button>
          </form>
        ) : null}

        <div className="border-b border-border px-4 py-3 sm:px-6">
          <input
            placeholder={
              soloSusAreas
                ? "Buscar en todos los pedidos (aunque ya se movieron)…"
                : "Buscar cliente, contrato o referencia…"
            }
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full min-w-0 rounded-lg border border-border bg-card px-3 py-3 text-base outline-none focus:ring-1 focus:ring-gold sm:py-2 sm:text-sm"
          />
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Estado
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground sm:py-2 sm:text-sm"
              >
                {["Todas", ...estados].map((estado) => (
                  <option key={estado}>{estado}</option>
                ))}
              </select>
            </label>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Área actual
              <select
                value={filtroArea}
                onChange={(e) => setFiltroArea(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground sm:py-2 sm:text-sm"
              >
                {["Todas", ...(soloSusAreas ? misAreas : AREAS_SEGUIMIENTO)].map((area) => (
                  <option key={area} value={area}>
                    {area === "Todas" ? "Todas" : etiquetaAreaSeguimiento(area)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Entrega
              <select
                value={filtroEntrega}
                onChange={(e) => setFiltroEntrega(e.target.value as FiltroEntrega)}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground sm:py-2 sm:text-sm"
              >
                {FILTROS_ENTREGA.map((entrega) => (
                  <option key={entrega}>{entrega}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {soloSusAreas && !busca.trim() ? (
          <p className="px-6 pt-3 text-[11px] text-muted-foreground">
            Ves los pedidos que están en tus áreas: {misAreas.join(", ")}. Usa el buscador para
            encontrar pedidos que ya se movieron a otra área.
          </p>
        ) : null}

        <div className="block divide-y divide-border lg:hidden">
          {lista.map((p) => (
            <article
              key={p.id}
              onClick={() =>
                navigate({ to: "/pedidos/$id", params: { id: p.id }, search: { from: "pedidos" } })
              }
              className="group cursor-pointer px-4 py-4 transition-colors hover:bg-surface-muted/70 active:bg-surface-muted"
              role="button"
              aria-label={`Abrir ficha del pedido ${p.referencia}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate({
                    to: "/pedidos/$id",
                    params: { id: p.id },
                    search: { from: "pedidos" },
                  });
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{p.referencia}</p>
                  {p.contrato ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      Contrato {p.contrato}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${areaClase(p.area_actual)}`}
                >
                  {etiquetaAreaSeguimiento(p.area_actual)}
                </span>
              </div>
              <span
                className={`mt-2 inline-flex w-fit rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
                  estadoClases[p.estado] ?? "bg-surface-muted text-muted-foreground"
                }`}
              >
                {p.estado}
              </span>
              <p className="mt-2 truncate text-sm font-medium">{p.cliente}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {p.trabajo || p.pieza}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="truncate">
                  {sesion?.esDueno && p.sede_nombre ? p.sede_nombre : p.origen || "Sin origen"}
                </span>
                <span className="shrink-0 tabular-nums">
                  {fmtFecha(p.fecha_entrega ?? p.entrega) ?? "Sin fecha"}
                </span>
              </div>
              {puedeCrear ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {pedidoEnEvaluacion(p.estado) ? (
                    <button
                      type="button"
                      disabled={autorizar.isPending || p.ruta.length === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        autorizar.mutate({
                          pedido: p,
                          usuarioId: sesion?.user.id ?? null,
                        });
                      }}
                      className="rounded-lg bg-ink px-3 py-2 text-xs font-medium text-ink-foreground disabled:opacity-50"
                    >
                      Autorizar Producción
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPorBorrar({ id: p.id, referencia: p.referencia });
                    }}
                    className="ml-auto rounded-lg border border-danger/30 px-3 py-2 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
                    aria-label={`Eliminar pedido ${p.referencia}`}
                  >
                    Eliminar
                  </button>
                </div>
              ) : null}
            </article>
          ))}
          {!isLoading && lista.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">No hay pedidos que coincidan.</p>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-muted">
                {["Ref", "Cliente", "Trabajo", "Estado", "Área actual", "Entrega", "Acciones"].map(
                  (h, i) => (
                    <th
                      key={h || i}
                      className={`px-6 py-3 text-[10px] uppercase tracking-wider text-muted-foreground ${
                        i >= 5 ? "text-right" : ""
                      }`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((p) => (
                <tr
                  key={p.id}
                  onClick={() =>
                    navigate({
                      to: "/pedidos/$id",
                      params: { id: p.id },
                      search: { from: "pedidos" },
                    })
                  }
                  className="group cursor-pointer transition-colors hover:bg-surface-muted/80 active:bg-surface-muted"
                  role="button"
                  aria-label={`Abrir ficha del pedido ${p.referencia}`}
                  title={`Abrir ficha del pedido ${p.referencia}`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate({
                        to: "/pedidos/$id",
                        params: { id: p.id },
                        search: { from: "pedidos" },
                      });
                    }
                  }}
                >
                  <td className="px-6 py-4 text-xs font-medium">
                    <span className="rounded-md bg-surface-muted px-2 py-1 group-hover:bg-gold/10 group-hover:text-gold">
                      {p.referencia}
                    </span>
                    {p.contrato ? (
                      <span className="block text-[10px] text-muted-foreground">
                        Contrato {p.contrato}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {p.cliente}
                    {sesion?.esDueno && p.sede_nombre ? (
                      <span className="block text-[10px] text-muted-foreground">
                        {p.sede_nombre}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {p.trabajo || p.pieza}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex w-fit rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
                        estadoClases[p.estado] ?? "bg-surface-muted text-muted-foreground"
                      }`}
                    >
                      {p.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className="flex flex-col gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <span
                        className={`inline-flex w-fit rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${areaClase(p.area_actual)}`}
                      >
                        {etiquetaAreaSeguimiento(p.area_actual)}
                      </span>
                      <select
                        value=""
                        onChange={(e) => {
                          const destino = e.target.value;
                          if (destino)
                            enviar.mutate({
                              pedido: p,
                              destino,
                              usuarioId: sesion?.user.id ?? null,
                            });
                        }}
                        disabled={enviar.isPending || pedidoEnEvaluacion(p.estado)}
                        className="w-fit rounded-md border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground disabled:opacity-40"
                      >
                        <option value="" disabled>
                          Enviar a…
                        </option>
                        {p.ruta
                          .filter((a) => !areaCoincide(a, p.area_actual))
                          .map((a) => (
                            <option key={a} value={a}>
                              {normalizarArea(a)}
                            </option>
                          ))}
                        {p.ruta.filter((a) => !areaCoincide(a, p.area_actual)).length === 0 ? (
                          <option value="" disabled>
                            Sin áreas siguientes
                          </option>
                        ) : null}
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm tabular-nums">
                    {fmtFecha(p.fecha_entrega ?? p.entrega) ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                      {puedeCrear && pedidoEnEvaluacion(p.estado) ? (
                        <button
                          type="button"
                          disabled={autorizar.isPending || p.ruta.length === 0}
                          onClick={() =>
                            autorizar.mutate({
                              pedido: p,
                              usuarioId: sesion?.user.id ?? null,
                            })
                          }
                          className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-ink-foreground disabled:opacity-50"
                        >
                          Autorizar Producción
                        </button>
                      ) : null}
                      {puedeCrear ? (
                        <button
                          type="button"
                          onClick={() => setPorBorrar({ id: p.id, referencia: p.referencia })}
                          className="rounded-md border border-danger/25 px-2.5 py-1.5 text-xs font-medium text-danger opacity-80 transition-colors hover:bg-danger/10 hover:opacity-100"
                          aria-label={`Eliminar pedido ${p.referencia}`}
                        >
                          Eliminar
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && lista.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-sm text-muted-foreground">
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
                onClick={() => borrar.mutate(porBorrar.id, { onSettled: () => setPorBorrar(null) })}
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
