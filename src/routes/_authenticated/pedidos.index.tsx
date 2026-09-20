import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, Panel } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
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
  const hoyInicio = inicioDia();  const hoyFin = finDia();

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

function diasHastaEntrega(fechaIso: string | null | undefined): number | null {
  if (!fechaIso) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const entrega = new Date(fechaIso);
  entrega.setHours(0, 0, 0, 0);
  if (Number.isNaN(entrega.getTime())) return null;
  return Math.ceil((entrega.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
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

function PedidosPage() {  const navigate = useNavigate();
  const { data: sesion } = useSesion();  const { data: pedidos = [], isLoading } = usePedidos();
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-pedido-selector"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("id,nombre,telefono").eq("estado", "activo").order("nombre");
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(sesion?.esAdmin),
  });
  const { data: sedes = [] } = useSedes();
  const {
    sedeFiltro,
    setSedeFiltro,
    sedes: sedesFiltro,
    filtrarPedidos,
    etiquetaSede,
  } = useSedeFiltroDueno();  const crear = useCrearPedido();
  const borrar = useBorrarPedido();
  const enviar = useEnviarAArea();
  const autorizar = useAutorizarProduccion();

  const [abierto, setAbierto] = useState(false);
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [clientesSelectorAbierto, setClientesSelectorAbierto] = useState(false);
  const [form, setForm] = useState<PedidoFormState>(() => nuevoPedidoVacio());
  const { data: proyectos = [] } = useQuery({
    queryKey: ["proyectos-pedido-selector", form.cliente_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proyectos_joya")
        .select("id,codigo,nombre,cliente_id,metal,ley,peso_estimado,talla,cantidad_piezas,piedras")
        .eq("cliente_id", form.cliente_id)
        .eq("estado", "activo")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(sesion?.esAdmin && form.cliente_id),
  });
  const [ruta, setRuta] = useState<string[]>([]);
  const [sedeId, setSedeId] = useState<string>("");
  const [filtroArea, setFiltroArea] = useState("Todas");
  const [filtroEstado, setFiltroEstado] = useState("Todas");
  const [filtroEntrega, setFiltroEntrega] = useState<FiltroEntrega>("Todas");
  const [filtroVista, setFiltroVista] = useState<"todos" | "atencion" | "produccion" | "entrega">("todos");
  const soloPendientesAutorizacion = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("autorizacion") === "pendientes",
  )[0];
  const [busca, setBusca] = useState("");
  const [estadisticasMovilAbiertas, setEstadisticasMovilAbiertas] = useState(false);
  const [porBorrar, setPorBorrar] = useState<{ id: string; referencia: string } | null>(null);
  const [ultimoContrato, setUltimoContrato] = useState<PedidoFormState | null>(null);
  const [datosVinculadosAbiertos, setDatosVinculadosAbiertos] = useState(false);

  const puedeCrear = Boolean(sesion?.esAdmin);
  const clientesCoincidentes = useMemo(() => {
    const termino = clienteBusqueda.trim().toLowerCase();
    if (!termino) return clientes.slice(0, 8);
    return clientes
      .filter((cliente) =>
        [cliente.nombre, cliente.telefono].some((valor) =>
          (valor ?? "").toLowerCase().includes(termino),
        ),
      )
      .slice(0, 8);
  }, [clienteBusqueda, clientes]);
  const clienteSeleccionado = clientes.find((cliente) => cliente.id === form.cliente_id);
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
        const diasEntrega = diasHastaEntrega(p.fecha_entrega ?? p.entrega);
        const requiereAtencion =
          pedidoPendienteAutorizacionProduccion(p) ||
          (diasEntrega !== null && diasEntrega < 0 && !esEstadoFinalPedido(p.estado));
        const okVista =
          filtroVista === "todos" ||
          (filtroVista === "atencion" && requiereAtencion) ||
          (filtroVista === "produccion" && p.estado === "En Producción") ||
          (filtroVista === "entrega" && (p.estado === "Listo para Entrega" || p.estado === "En Camino"));
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
        const okOperario =          !soloSusAreas || Boolean(t) || misAreas.some((area) => areaCoincide(area, p.area_actual));
        // Los pedidos entregados salen del flujo activo: solo aparecen al buscarlos
        // o al filtrar expresamente por ese estado (el archivo está en Gestión).
        const okArchivo = p.estado !== "Entregado" || Boolean(t) || filtroEstado === "Entregado";
        const okAutorizacion = !soloPendientesAutorizacion || pedidoPendienteAutorizacionProduccion(p);
        return okVista && okArea && okEstado && okEntrega && okTexto && okOperario && okArchivo && okAutorizacion;
      }),
    [pedidosPorSede, filtroArea, filtroEstado, filtroEntrega, filtroVista, busca, soloSusAreas, misAreas, soloPendientesAutorizacion],
  );

  const activos = pedidosPorSede.filter((p) => !esEstadoFinalPedido(p.estado));
  const entregados = pedidosPorSede.filter((p) => p.estado === "Entregado");

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
  const pedidosAtencion = pedidosPorSede.filter((p) => {
    const dias = diasHastaEntrega(p.fecha_entrega ?? p.entrega);
    return pedidoPendienteAutorizacionProduccion(p) || (dias !== null && dias < 0 && !esEstadoFinalPedido(p.estado));
  });
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
          </div>        </div>
      }
    >
      {soloPendientesAutorizacion ? (        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/25 bg-warning-soft/50 px-4 py-3 text-sm">
          <div>
            <p className="font-semibold text-warning">Pedidos pendientes de autorización</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Mostrando únicamente pedidos que todavía no han ingresado a Producción.
            </p>
          </div>
          <button type="button" onClick={() => window.location.assign("/pedidos")} className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground">
            Ver todos
          </button>
        </div>
      ) : null}

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
        {ultimoContrato?.contrato ? (
          <div className="border-b border-border bg-success-soft/50 px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Pedido creado correctamente
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Contrato {ultimoContrato.contrato} · {ultimoContrato.cliente || "Cliente"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {                  setForm(ultimoContrato);
                  setRuta([]);
                  setAbierto(true);
                  setUltimoContrato(null);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-gold-foreground shadow-card transition hover:shadow-raised"
              >
                <span aria-hidden="true" className="text-base leading-none">＋</span>
                Otro pedido mismo contrato
              </button>
            </div>
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
              const clienteNombre = form.cliente.trim() || "Cliente pendiente de registrar";
              const documentosExternos = {
                ...(form.cotizacion_externa.trim()
                  ? { cotizacion: form.cotizacion_externa.trim() }
                  : {}),
                ...(form.contrato_externo.trim()
                  ? { contrato: form.contrato_externo.trim() }
                  : {}),
                estado: "externos",
              };
              const nuevo: PedidoNuevo = {
                referencia: siguienteReferencia(
                  nombreSede,
                  pedidos.map((p) => p.referencia),
                ),
                pieza: form.trabajo,
                trabajo: form.trabajo,
                cliente: clienteNombre,
                cliente_id: form.cliente_id || null,
                proyecto_joya_id: form.proyecto_joya_id || null,
                telefono: form.telefono,
                origen: form.origen,
                contrato: form.contrato,
                cotizacion_detalles: documentosExternos,                material: form.material,
                peso_estimado: form.peso_estimado,
                estado: "Recibido",
                entrega: form.fecha_entrega,
                importe: Number(form.importe) || 0,                a_cuenta: Number(form.a_cuenta) || 0,
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
                  setUltimoContrato({
                    ...nuevoPedidoVacio(),
                    cliente: form.cliente,
                    telefono: form.telefono,
                    origen: form.origen,
                    contrato: form.contrato,
                  });
                  setForm(nuevoPedidoVacio());
                  setRuta([]);
                  setAbierto(false);
                },
              });
            }}
          >
            <div className="mb-4 max-w-xl">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Cliente <span className="normal-case tracking-normal">(opcional)</span>
              </div>
              <div className="relative mt-1">
                <input
                  value={clienteSeleccionado?.nombre ?? clienteBusqueda}
                  onFocus={() => setClientesSelectorAbierto(true)}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setClienteBusqueda(valor);
                    setClientesSelectorAbierto(true);
                    if (form.cliente_id) {
                      setForm({ ...form, cliente_id: "", proyecto_joya_id: "", cliente: valor });
                    } else {
                      setForm({ ...form, cliente: valor });
                    }
                  }}
                  placeholder="Buscar cliente por nombre o teléfono…"
                  className="w-full rounded-lg border border-border bg-card px-3 py-3 pr-10 text-base text-foreground outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 sm:py-2 sm:text-sm"
                  autoComplete="off"
                  aria-label="Buscar cliente registrado"
                />
                {form.cliente_id ? (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setForm({ ...form, cliente_id: "", proyecto_joya_id: "" });
                      setClienteBusqueda("");
                      setClientesSelectorAbierto(true);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                    aria-label="Quitar cliente seleccionado"
                  >
                    Limpiar
                  </button>
                ) : null}
                {clientesSelectorAbierto && !form.cliente_id ? (
                  <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-raised">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setForm({ ...form, cliente_id: "", proyecto_joya_id: "", cliente: "" });
                        setClienteBusqueda("");
                        setClientesSelectorAbierto(false);
                      }}
                      className="flex w-full items-center px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-gold/5"
                    >
                      Sin registrar todavía
                    </button>
                    {clientesCoincidentes.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setForm({
                            ...form,
                            cliente_id: cliente.id,
                            proyecto_joya_id: "",
                            cliente: cliente.nombre,
                            telefono: cliente.telefono ?? "",                          });
                          setClienteBusqueda(cliente.nombre);
                          setClientesSelectorAbierto(false);
                        }}
                        className="flex w-full items-center justify-between gap-3 border-t border-border px-3 py-2.5 text-left hover:bg-gold/5"
                      >                        <span className="min-w-0 truncate text-sm font-medium text-foreground">{cliente.nombre}</span>
                        {cliente.telefono ? (
                          <span className="shrink-0 text-xs text-muted-foreground">{cliente.telefono}</span>
                        ) : null}
                      </button>
                    ))}
                    {clientesCoincidentes.length === 0 ? (
                      <div className="border-t border-border px-3 py-3 text-xs text-muted-foreground">
                        No encontramos clientes con esa búsqueda.
                      </div>
                    ) : null}
                    {clientes.length > clientesCoincidentes.length && clienteBusqueda.trim() === "" ? (
                      <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
                        Escribe para filtrar. Mostrando los primeros {clientesCoincidentes.length} resultados.
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {form.cliente_id ? (
                <div className="mt-3 rounded-lg border border-gold/15 bg-gold/[.03] px-3 py-2 text-xs text-muted-foreground">
                  Cliente registrado seleccionado · teléfono tomado de su ficha.
                </div>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Nombre del cliente
                    <input
                      value={form.cliente}
                      onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                      placeholder="Puede quedar pendiente"
                      className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-sm text-foreground"
                    />
                  </label>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    WhatsApp / teléfono
                    <input
                      value={form.telefono}
                      onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                      placeholder="Opcional"
                      className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-sm text-foreground"
                    />
                  </label>
                </div>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground">
                Puedes crear el pedido hoy y registrar al cliente después. Si no lo registras todavía, quedará como pendiente sin bloquear el flujo.
              </p>
            </div>
            <PedidoFormCampos
              form={form}
              onChange={setForm}
              camposBloqueados={["cliente"]}
              ruta={ruta}
              onRutaChange={setRuta}
              sedeSelect={
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Sede del pedido
                  <select
                    value={sedePorDefecto}
                    onChange={(e) => setSedeId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground sm:py-2 sm:text-sm"
                  >
                    {sedes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>                    ))}
                  </select>
                </label>
              }
            />

            <div className="mt-4 rounded-xl border border-border bg-card">
              <button
                type="button"
                onClick={() => setDatosVinculadosAbiertos((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                aria-expanded={datosVinculadosAbiertos}
              >
                <span>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Datos vinculados <span className="normal-case tracking-normal">(opcional)</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Proyecto y documentación comercial relacionada.
                  </span>
                </span>
                <span className="text-xs text-muted-foreground" aria-hidden="true">
                  {datosVinculadosAbiertos ? "Ocultar" : "Mostrar"}
                </span>
              </button>
              {datosVinculadosAbiertos ? (
                <div className="border-t border-border px-4 py-4">
            <div className="mb-4 max-w-xl">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Proyecto de joyería
                <select
                  value={form.proyecto_joya_id}
                  onChange={(e) => {
                    const proyecto = proyectos.find((item) => item.id === e.target.value);
                    if (!proyecto) {
                      setForm({ ...form, proyecto_joya_id: "" });
                      return;
                    }
                    setForm({
                      ...form,
                      proyecto_joya_id: proyecto.id,
                      trabajo: proyecto.nombre || form.trabajo,
                      material: proyecto.metal || form.material,
                      peso_estimado:
                        proyecto.peso_estimado != null
                          ? String(proyecto.peso_estimado)
                          : form.peso_estimado,
                      talla: proyecto.talla || form.talla,
                      cantidad_piezas: String(proyecto.cantidad_piezas || 1),
                      piedras: proyecto.piedras || form.piedras,
                    });
                  }}
                  disabled={!form.cliente_id}
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground disabled:cursor-not-allowed disabled:bg-surface-muted sm:py-2 sm:text-sm"
                >
                  <option value="">Sin proyecto asociado</option>
                  {proyectos.map((proyecto) => (
                    <option key={proyecto.id} value={proyecto.id}>
                      {proyecto.codigo} · {proyecto.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Si eliges un proyecto, sus datos técnicos se copian al pedido como snapshot.
              </p>
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Cotización externa <span className="normal-case tracking-normal">(opcional)</span>
                <input
                  value={form.cotizacion_externa}                  onChange={(e) => setForm({ ...form, cotizacion_externa: e.target.value })}
                  placeholder="N.º, WhatsApp, archivo o referencia"
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-sm text-foreground"
                />
              </label>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">                Contrato externo <span className="normal-case tracking-normal">(opcional)</span>
                <input
                  value={form.contrato_externo}
                  onChange={(e) => setForm({ ...form, contrato_externo: e.target.value })}
                  placeholder="N.º o referencia de su contrato"
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-sm text-foreground"
                />
              </label>
            </div>
            <div className="mb-4 rounded-lg border border-dashed border-border bg-card px-3 py-2 text-[11px] text-muted-foreground">
              Documentación externa: Aurum Lab no obliga a reemplazar el formato actual del taller. Puedes seguir usando su cotización y contrato y conectarlos al pedido.
            </div>

                </div>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={crear.isPending}
              className="mt-5 w-full rounded-lg bg-gold px-4 py-3 text-sm font-medium text-gold-foreground shadow-card transition hover:shadow-raised disabled:opacity-50 sm:w-auto sm:py-2 sm:text-xs"
            >
              {crear.isPending ? "Guardando…" : "Guardar pedido"}
            </button>
          </form>
        ) : null}

        <div className="border-b border-border px-4 py-3 sm:px-6">
          <div className="mb-3 flex flex-wrap gap-1.5 rounded-xl bg-surface-muted p-1">
            {([
              ["todos", "Todos", pedidosPorSede.length],
              ["atencion", "Requieren atención", pedidosAtencion.length],
              ["produccion", "En producción", pedidosPorSede.filter((p) => p.estado === "En Producción").length],
              ["entrega", "Por entregar", pedidosPorSede.filter((p) => p.estado === "Listo para Entrega" || p.estado === "En Camino").length],
            ] as const).map(([valor, etiqueta, cantidad]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setFiltroVista(valor)}
                className={`rounded-lg px-3 py-2 text-[11px] font-semibold transition ${filtroVista === valor ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"}`}
              >
                {etiqueta} <span className="ml-1 text-[10px] opacity-60">{cantidad}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 lg:flex-row">
            <input
              placeholder={
                soloSusAreas
                  ? "Buscar en todos los pedidos (aunque ya se movieron)…"
                  : "Buscar referencia, cliente o trabajo…"
              }
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-3 text-base outline-none focus:ring-1 focus:ring-gold sm:py-2 sm:text-sm"
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:w-[660px]">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Estado
                <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground">
                  {["Todas", ...estados].map((estado) => <option key={estado}>{estado}</option>)}
                </select>
              </label>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Área actual
                <select value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground">
                  {["Todas", ...(soloSusAreas ? misAreas : AREAS_SEGUIMIENTO)].map((area) => (
                    <option key={area} value={area}>{area === "Todas" ? "Todas" : etiquetaAreaSeguimiento(area)}</option>
                  ))}
                </select>
              </label>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Entrega
                <select value={filtroEntrega} onChange={(e) => setFiltroEntrega(e.target.value as FiltroEntrega)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground">
                  {FILTROS_ENTREGA.map((entrega) => <option key={entrega}>{entrega}</option>)}
                </select>
              </label>
            </div>
          </div>
        </div>
        {soloSusAreas && !busca.trim() ? (
          <p className="px-6 pt-3 text-[11px] text-muted-foreground">
            Ves los pedidos que están en tus áreas: {misAreas.join(", ")}. Usa el buscador para
            encontrar pedidos que ya se movieron a otra área.          </p>
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
                  {pedidoEnRecepcion(p.estado) ? (
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
                      className="rounded-lg bg-gold px-3 py-2 text-xs font-medium text-gold-foreground disabled:opacity-50"
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

        <div className="hidden overflow-x-auto lg:block">          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-muted">
                {["Ref", "Cliente", "Trabajo", "Estado", "Área actual", "Entrega", "Acciones"].map(
                  (h, i) => (
                    <th
                      key={h || i}
                      className={`px-6 py-3 text-[10px] uppercase tracking-wider text-muted-foreground ${                        i >= 5 ? "text-right" : ""
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
                      <span className="block text-[10px] text-muted-foreground">                        Contrato {p.contrato}
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
                        disabled={enviar.isPending || pedidoEnRecepcion(p.estado)}
                        className="w-fit rounded-md border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground disabled:opacity-40"
                      >
                        <option value="" disabled>
                          Enviar a…
                        </option>
                        {(sesion?.esAdmin ? [...AREAS] : p.ruta)
                          .filter((a) => !areaCoincide(a, p.area_actual))
                          .map((a) => (
                            <option key={a} value={a}>
                              {normalizarArea(a)}
                            </option>
                          ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm tabular-nums">
                    {fmtFecha(p.fecha_entrega ?? p.entrega) ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                      {puedeCrear && pedidoEnRecepcion(p.estado) ? (
                        <button
                          type="button"
                          disabled={autorizar.isPending || p.ruta.length === 0}
                          onClick={() =>
                            autorizar.mutate({
                              pedido: p,
                              usuarioId: sesion?.user.id ?? null,
                            })
                          }
                          className="rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-gold-foreground disabled:opacity-50"
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
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/15 p-4 backdrop-blur-sm"
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
