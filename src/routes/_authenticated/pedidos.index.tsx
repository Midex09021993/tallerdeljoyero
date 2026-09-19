import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, Panel } from "@/components/AppShell";
import { ClipboardList } from "lucide-react";
import { PedidoFormCampos } from "@/components/PedidoFormCampos";
import {
  SelectorSedeDueno,
  TODAS_LAS_SEDES,
  useSedeFiltroDueno,
} from "@/hooks/use-sede-filtro-dueno";
import { fmtFecha } from "@/lib/utils";
import { AREAS, areaCoincide, normalizarArea, useSesion } from "@/lib/auth";
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
  pedidoEnRecepcion,
  pedidoPendienteAutorizacionProduccion,
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
  return areaCoincide(normalizada, "Área ventas") ? "Área ventas" : normalizada;
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
  const soloPendientesAutorizacion = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("autorizacion") === "pendientes",
  )[0];
  const [busca, setBusca] = useState("");
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
        // Los pedidos entregados salen del flujo activo: solo aparecen al buscarlos
        // o al filtrar expresamente por ese estado (el archivo está en Gestión).
        const okArchivo = p.estado !== "Entregado" || Boolean(t) || filtroEstado === "Entregado";
        const okAutorizacion = !soloPendientesAutorizacion || pedidoPendienteAutorizacionProduccion(p);
        return okArea && okEstado && okEntrega && okTexto && okOperario && okArchivo && okAutorizacion;
      }),
    [pedidosPorSede, filtroArea, filtroEstado, filtroEntrega, busca, soloSusAreas, misAreas, soloPendientesAutorizacion],
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


  return (
    <AppShell titulo="Pedidos" ocultarTitulo>
      <div className="space-y-5">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                <ClipboardList className="size-3.5" />
                Flujo de trabajo
              </div>
              <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
                Cada pedido tiene un camino.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Aquí ves dónde está cada trabajo, qué sigue y cuándo debe entregarse.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[330px]">
              {[
                ["Activos", activos.length, ""],
                ["Próximos", proximos.length, ""],
                ["Atrasados", atrasados.length, atrasados.length ? "text-danger" : ""],
              ].map(([label, value, tone]) => (
                <div key={label} className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                  <p className={`mt-1 text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {soloPendientesAutorizacion ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/25 bg-warning-soft/50 px-4 py-3 text-sm">
            <div>
              <p className="font-semibold text-warning">Pedidos pendientes de autorización</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Mostrando pedidos que todavía no han ingresado a Producción.
              </p>
            </div>
            <button type="button" onClick={() => window.location.assign("/pedidos")} className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold">
              Ver todos
            </button>
          </div>
        ) : null}

        <section className="rounded-3xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="relative">
                  <input
                    placeholder={soloSusAreas ? "Buscar en todos los pedidos…" : "Buscar cliente, pedido o contrato…"}
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
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
                    className="rounded-xl bg-ink px-4 py-3 text-xs font-semibold text-ink-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                  >
                    {abierto ? "Cerrar" : "+ Nuevo pedido"}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Estado
                <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal text-foreground outline-none focus:border-primary/50">
                  {["Todas", ...estados].map((estado) => <option key={estado}>{estado}</option>)}
                </select>
              </label>
              <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Área
                <select value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal text-foreground outline-none focus:border-primary/50">
                  {["Todas", ...(soloSusAreas ? misAreas : AREAS_SEGUIMIENTO)].map((area) => (
                    <option key={area} value={area}>{area === "Todas" ? "Todas" : etiquetaAreaSeguimiento(area)}</option>
                  ))}
                </select>
              </label>
              <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Entrega
                <select value={filtroEntrega} onChange={(e) => setFiltroEntrega(e.target.value as FiltroEntrega)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal text-foreground outline-none focus:border-primary/50">
                  {FILTROS_ENTREGA.map((entrega) => <option key={entrega}>{entrega}</option>)}
                </select>
              </label>
            </div>
          </div>

          {abierto ? (
            <form
              className="border-b border-border bg-surface-muted/35 p-4 sm:p-6"
              onSubmit={(e) => {
                e.preventDefault();
                if (ruta.length === 0) {
                  alert("Marca al menos un área en la ruta del pedido.");
                  return;
                }
                const nombreSede = sedes.find((s) => s.id === sedePorDefecto)?.nombre ?? null;
                const nuevo: PedidoNuevo = {
                  referencia: siguienteReferencia(nombreSede, pedidos.map((p) => p.referencia)),
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
                  corte_texto: form.corte_texto,
                  corte_tipografia: form.corte_tipografia,
                  corte_ubicacion: form.corte_ubicacion,
                  corte_observaciones: form.corte_observaciones,
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
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Nuevo pedido</p>
                  <p className="mt-1 text-xs text-muted-foreground">Registra lo necesario para poner el trabajo en marcha.</p>
                </div>
              </div>
              <PedidoFormCampos
                form={form}
                onChange={setForm}
                ruta={ruta}
                onRutaChange={setRuta}
                sedeSelect={
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Sede
                    <select value={sedePorDefecto} onChange={(e) => setSedeId(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground sm:py-2 sm:text-sm">
                      {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </label>
                }
              />
              <button type="submit" disabled={crear.isPending} className="mt-5 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-ink-foreground disabled:opacity-50">
                {crear.isPending ? "Guardando…" : "Crear pedido"}
              </button>
            </form>
          ) : null}

          {soloSusAreas && !busca.trim() ? (
            <p className="border-b border-border px-5 py-3 text-[11px] text-muted-foreground">
              Mostrando los pedidos de tus áreas: {misAreas.join(", ")}.
            </p>
          ) : null}

          <div className="hidden lg:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface-muted/50">
                  {["Pedido", "Cliente", "Trabajo", "Estado", "Área actual", "Entrega"].map((h) => (
                    <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((p) => (
                  <tr key={p.id} onClick={() => navigate({ to: "/pedidos/$id", params: { id: p.id }, search: { from: "pedidos" } })} className="group cursor-pointer transition-colors hover:bg-primary/[0.035]">
                    <td className="px-5 py-4">
                      <span className="font-semibold text-sm group-hover:text-primary">{p.referencia}</span>
                      {p.contrato ? <span className="mt-0.5 block text-[10px] text-muted-foreground">Contrato {p.contrato}</span> : null}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium">{p.cliente || "Sin cliente"}</td>
                    <td className="max-w-[260px] px-5 py-4 text-sm text-muted-foreground">
                      <span className="line-clamp-2">{p.trabajo || p.pieza || "Sin descripción"}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${estadoClases[p.estado] ?? "bg-surface-muted text-muted-foreground"}`}>{p.estado}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${areaClase(p.area_actual)}`}>{etiquetaAreaSeguimiento(p.area_actual)}</span>
                    </td>
                    <td className="px-5 py-4 text-sm tabular-nums text-muted-foreground">{fmtFecha(p.fecha_entrega ?? p.entrega) ?? "Sin fecha"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border lg:hidden">
            {lista.map((p) => (
              <article key={p.id} onClick={() => navigate({ to: "/pedidos/$id", params: { id: p.id }, search: { from: "pedidos" } })} className="cursor-pointer px-4 py-4 transition-colors hover:bg-surface-muted/70 active:bg-surface-muted">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p.referencia}</p>
                    <p className="mt-1 truncate text-sm font-medium">{p.cliente || "Sin cliente"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${areaClase(p.area_actual)}`}>{etiquetaAreaSeguimiento(p.area_actual)}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.trabajo || p.pieza || "Sin descripción"}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${estadoClases[p.estado] ?? "bg-surface-muted text-muted-foreground"}`}>{p.estado}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{fmtFecha(p.fecha_entrega ?? p.entrega) ?? "Sin fecha"}</span>
                </div>
              </article>
            ))}
          </div>

          {!isLoading && lista.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <ClipboardList className="mx-auto size-8 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium">No encontramos pedidos con estos filtros.</p>
              <p className="mt-1 text-xs text-muted-foreground">Prueba otra búsqueda o cambia los filtros.</p>
            </div>
          ) : null}
        </section>

        {porBorrar ? (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-lg">
              <h2 className="text-base font-semibold">Eliminar pedido</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                ¿Seguro que quieres eliminar el pedido {porBorrar.referencia}? Esta acción no se puede deshacer.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setPorBorrar(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-muted">
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
      </div>
    </AppShell>
  );
}
