import { useState, type FormEvent, type ReactNode } from "react";
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
  useInventario,
} from "@/lib/taller-db";
import { toast } from "sonner";
import { FechaInput } from "@/components/FechaInput";
import { fmtFecha } from "@/lib/utils";
import { leerMetadatosEnlace } from "@/lib/enlaces.functions";
import { urlEmbedVisor } from "@/lib/visor-embed";
import { VisorIframe } from "@/components/VisorIframe";
import { FichaAurum } from "@/components/FichaDorada";
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

function QuickStatus({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface-sunken p-3">
      <div className="flex items-center gap-2">
        <span className={`size-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-gold"}`} />
        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="mt-1 truncate text-xs font-semibold">{value}</p>
    </div>
  );
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
  const { data: historialPedido = [] } = useQuery({
    queryKey: ["pedido-historial", id],
    queryFn: async () => {
      const [movimientos, consumos] = await Promise.all([
        supabase.from("pedido_movimientos").select("id, area_origen, area_destino, accion, usuario_id, nota, created_at").eq("pedido_id", id).order("created_at", { ascending: false }).limit(100),
        supabase.from("inventario_movimientos").select("id, tipo, cantidad, motivo, area, usuario_id, created_at, inventario(material,unidad)").eq("pedido_id", id).order("created_at", { ascending: false }).limit(100),
      ]);
      if (movimientos.error) throw movimientos.error;
      if (consumos.error) throw consumos.error;
      const eventos = [
        ...(movimientos.data ?? []).map((m) => ({
          id: `area-${m.id}`, fecha: m.created_at, tipo: "Área",
          titulo: m.accion === "reiniciar_flujo" ? "Flujo reiniciado" : "Pedido movido de área",
          detalle: m.area_origen ? `${m.area_origen} → ${m.area_destino}` : m.area_destino,
          nota: m.nota, usuario: m.usuario_id,
        })),
        ...(consumos.data ?? []).map((m) => {
          const material = Array.isArray(m.inventario) ? m.inventario[0] : m.inventario;
          return {
            id: `material-${m.id}`, fecha: m.created_at, tipo: "Inventario",
            titulo: "Material consumido",
            detalle: `${m.cantidad} ${material?.unidad ?? ""} · ${material?.material ?? "Material"}`,
            nota: m.motivo, usuario: m.usuario_id,
          };
        }),
      ];
      return eventos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    },
  });

  const { data: trabajosPedido = [] } = useQuery({
    queryKey: ["trabajos-pedido", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trabajos")
        .select("id, orden_produccion_id, area, titulo, estado, prioridad, responsable_user_id")
        .eq("pedido_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: materialesInventario = [] } = useInventario();
  const { data: materialesPlanificados = [] } = useQuery({
    queryKey: ["pedido-materiales-planificados", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedido_materiales")
        .select("id,material_id,cantidad_planificada,unidad,notas,inventario(material,unidad,stock)")
        .eq("pedido_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string; material_id: string; cantidad_planificada: number; unidad: string; notas: string;
        inventario: { material: string; unidad: string; stock: number } | null;
      }>;
    },
  });
  const { data: ordenProduccion } = useQuery({
    queryKey: ["orden-produccion-pedido", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordenes_produccion")
        .select("id,numero,estado,prioridad,fecha_planificada_inicio,fecha_planificada_fin,fecha_inicio,fecha_fin,notas,responsable_user_id,created_at")
        .eq("pedido_id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: piezasTerminadas = [] } = useQuery({
    queryKey: ["piezas-terminadas-op", ordenProduccion?.id],
    enabled: Boolean(ordenProduccion?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("piezas_terminadas").select("id,numero_pieza,cantidad,peso_estimado,peso_final,unidad_peso,metal_estimado,metal_real,piedras_estimadas,piedras_reales,estado,observaciones,created_at").eq("orden_produccion_id", ordenProduccion!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const registrarPiezaTerminada = async () => {
    if (!ordenProduccion || !sesion?.user.id || !pedido) return;
    const numero = "P-" + Date.now().toString().slice(-6);
    const { error } = await supabase.from("piezas_terminadas").insert({ orden_produccion_id: ordenProduccion.id, pedido_id: pedido.id, numero_pieza: numero, cantidad: Number(pedido.cantidad_piezas) || 1, peso_estimado: Number(pedido.peso_estimado) || null, metal_estimado: pedido.material || "", piedras_estimadas: pedido.piedras || "", estado: "recibida", registrado_por: sesion.user.id } as never);
    if (error) toast.error(error.message); else { toast.success("Pieza terminada registrada"); void qc.invalidateQueries({ queryKey: ["piezas-terminadas-op", ordenProduccion.id] }); }
  };
  const { data: entregasProduccion = [] } = useQuery({
    queryKey: ["orden-produccion-entregas", ordenProduccion?.id],
    enabled: Boolean(ordenProduccion?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orden_produccion_entregas")
        .select("id,material_id,cantidad,unidad,area_destino,notas,created_at,inventario(material,unidad)")
        .eq("orden_produccion_id", ordenProduccion!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: movimientosPedido = [] } = useQuery({
    queryKey: ["inventario-movimientos-pedido", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventario_movimientos")
        .select("id,material_id,tipo,cantidad,stock_anterior,stock_posterior,motivo,area,created_at,inventario(material,unidad)")
        .eq("pedido_id", id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        material_id: string;
        tipo: string;
        cantidad: number;
        stock_anterior: number | null;
        stock_posterior: number | null;
        motivo: string;
        area: string;
        created_at: string;
        inventario: { material: string; unidad: string } | null;
      }>;
    },
  });

  const actualizar = useActualizarPedido();
  const autorizar = useAutorizarProduccion();
  const enviar = useEnviarAArea();
  const pedido = pedidos.find((p) => p.id === id);
  const { data: contextoComercial } = useQuery({
    queryKey: ["pedido-contexto-comercial", id, pedido?.cliente_id, pedido?.cotizacion_id, pedido?.proyecto_joya_id],
    enabled: Boolean(pedido),
    queryFn: async () => {
      const [clienteRes, cotizacionRes, proyectoRes] = await Promise.all([
        pedido?.cliente_id
          ? supabase.from("clientes").select("id,nombre,telefono,email").eq("id", pedido.cliente_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        pedido?.cotizacion_id
          ? supabase.from("cotizaciones").select("id,numero,version,estado,total,moneda").eq("id", pedido.cotizacion_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        pedido?.proyecto_joya_id
          ? supabase.from("proyectos_joya").select("id,codigo,nombre,descripcion,metal,ley,peso_estimado,talla,piedras").eq("id", pedido.proyecto_joya_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      return {
        cliente: clienteRes.data,
        cotizacion: cotizacionRes.data,
        proyecto: proyectoRes.data,
      };
    },
  });

  const crearContrato = useCrearContratoDesdePedido();
  const puedeVerComercial =
    Boolean(sesion?.esAdmin) ||
    Boolean(sesion?.areas.some((area) => areaCoincide(area, "Área ventas")));
  const contratoRef = pedido?.contrato_id || pedido?.contrato || "";
  const { data: contratoFinanciero } = useContrato(contratoRef, puedeVerComercial);
  const { data: pagosContrato = [] } = usePagosContrato(contratoFinanciero, puedeVerComercial);
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
  const [materialConsumo, setMaterialConsumo] = useState("");
  const [cantidadConsumo, setCantidadConsumo] = useState("");
  const [motivoConsumo, setMotivoConsumo] = useState("");
  const [tipoMovimientoProduccion, setTipoMovimientoProduccion] = useState<"consumo" | "merma" | "devolucion">("consumo");
  const [materialPlan, setMaterialPlan] = useState("");
  const [cantidadPlan, setCantidadPlan] = useState("");
  const [notasPlan, setNotasPlan] = useState("");
  const [guardandoPlan, setGuardandoPlan] = useState(false);
  const [guardandoOrden, setGuardandoOrden] = useState(false);
  const [guardandoEntrega, setGuardandoEntrega] = useState(false);
  const [materialEntrega, setMaterialEntrega] = useState("");
  const [cantidadEntrega, setCantidadEntrega] = useState("");
  const [notasEntrega, setNotasEntrega] = useState("");
  const [guardandoConsumo, setGuardandoConsumo] = useState(false);
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
  const siguienteAccion = pedidoEnRecepcion(pedido.estado)
    ? "Autorizar ingreso a producción"
    : pedido.estado === "Listo para Entrega"
      ? "Preparar entrega"
      : normalizarArea(pedido.area_actual) === "Área ventas"
        ? "Revisar venta y saldo"
        : `Trabajar en ${normalizarArea(pedido.area_actual)}`;
  const estadoEntrega = mostrarEstadoVentas(pedido);
  const tieneContextoCliente = Boolean(contextoComercial?.cliente || pedido.cliente_id);
  const tieneCotizacion = Boolean(contextoComercial?.cotizacion || pedido.cotizacion_id);
  const documentosExternos =
    pedido.cotizacion_detalles && typeof pedido.cotizacion_detalles === "object"
      ? (pedido.cotizacion_detalles as { cotizacion?: string; contrato?: string })
      : {};
  const tieneCotizacionExterna = Boolean(documentosExternos.cotizacion);
  const tieneContratoExterno = Boolean(documentosExternos.contrato);
  const tieneContrato = Boolean(contratoRef || tieneContratoExterno);
  const tieneFichaTecnica = Boolean(
    pedido.trabajo?.trim() &&
    pedido.material?.trim() &&
    pedido.cantidad_piezas &&
    Number(pedido.cantidad_piezas) > 0,
  );
  const tieneRutaProduccion = rutaPedido.length > 0;
  const tieneEntrega = Boolean(pedido.fecha_entrega || pedido.entrega);
  const pendientesPedido = [
    !tieneContextoCliente ? "Registrar cliente" : null,
    !tieneCotizacion && !tieneCotizacionExterna ? "Asociar cotización" : null,
    !tieneContrato ? "Completar contrato" : null,
    !tieneFichaTecnica ? "Completar ficha técnica" : null,
    !tieneRutaProduccion ? "Definir ruta de producción" : null,
    !tieneEntrega ? "Definir fecha de entrega" : null,
  ].filter(Boolean) as string[];
  const avancePedido = Math.round(((6 - pendientesPedido.length) / 6) * 100);

  async function crearOrdenProduccion() {
    if (!pedido) return;
    setGuardandoOrden(true);
    try {
      const { error } = await supabase.from("ordenes_produccion").insert({
        pedido_id: pedido.id,
        sede_id: pedido.sede_id,
        numero: `OP-${pedido.referencia}`,
        estado: "liberada",
        prioridad: "normal",
        notas: "",
      } as never);
      if (error) throw error;
      toast.success("Orden de producción creada");
      void qc.invalidateQueries({ queryKey: ["orden-produccion-pedido", id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la orden de producción");
    } finally {
      setGuardandoOrden(false);
    }
  }

  async function registrarEntregaProduccion(e: FormEvent) {
    e.preventDefault();
    if (!pedido || !ordenProduccion) return;
    const cantidad = Number(cantidadEntrega);
    const material = materialesInventario.find((item: { id: string }) => item.id === materialEntrega);
    if (!material || !Number.isFinite(cantidad) || cantidad <= 0) {
      toast.error("Selecciona un material y una cantidad válida");
      return;
    }
    setGuardandoEntrega(true);
    try {
      const { error } = await supabase.from("orden_produccion_entregas").insert({
        orden_produccion_id: ordenProduccion.id,
        material_id: material.id,
        cantidad,
        unidad: material.unidad,
        area_destino: normalizarArea(pedido.area_actual),
        notas: notasEntrega.trim(),
      } as never);
      if (error) throw error;
      toast.success(`Entrega registrada: ${cantidad} ${material.unidad} de ${material.material}`);
      setMaterialEntrega("");
      setCantidadEntrega("");
      setNotasEntrega("");
      void qc.invalidateQueries({ queryKey: ["orden-produccion-entregas", ordenProduccion.id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar la entrega");
    } finally {
      setGuardandoEntrega(false);
    }
  }

  async function registrarMaterialPlanificado(e: FormEvent) {
    e.preventDefault();
    if (!pedido) return;
    const cantidad = Number(cantidadPlan);
    const material = materialesInventario.find((item: { id: string }) => item.id === materialPlan);
    if (!material || !Number.isFinite(cantidad) || cantidad <= 0) {
      toast.error("Selecciona un material y una cantidad válida");
      return;
    }
    setGuardandoPlan(true);
    try {
      const { error } = await supabase.from("pedido_materiales").upsert({
        pedido_id: pedido.id,
        material_id: material.id,
        cantidad_planificada: cantidad,
        unidad: material.unidad,
        notas: notasPlan.trim(),
      }, { onConflict: "pedido_id,material_id" });
      if (error) throw error;
      toast.success(`${material.material} añadido al plan de producción`);
      setMaterialPlan("");
      setCantidadPlan("");
      setNotasPlan("");
      void qc.invalidateQueries({ queryKey: ["pedido-materiales-planificados", id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo planificar el material");
    } finally {
      setGuardandoPlan(false);
    }
  }

  async function eliminarMaterialPlanificado(planId: string) {
    const { error } = await supabase.from("pedido_materiales").delete().eq("id", planId);
    if (error) toast.error(error.message);
    else {
      toast.success("Material retirado del plan");
      void qc.invalidateQueries({ queryKey: ["pedido-materiales-planificados", id] });
    }
  }

  async function registrarConsumo(e: FormEvent) {
    e.preventDefault();
    if (!pedido) return;
    const cantidad = Number(cantidadConsumo);
    const material = materialesInventario.find((item: { id: string }) => item.id === materialConsumo);
    if (!material || !Number.isFinite(cantidad) || cantidad <= 0) return;
    setGuardandoConsumo(true);
    try {
      const etiquetas = { consumo: "Consumo", merma: "Merma", devolucion: "Devolución" } as const;
      const motivo = motivoConsumo.trim();
      if (!motivo) {
        toast.error("El motivo es obligatorio");
        return;
      }
      const { error } = await supabase.from("inventario_movimientos").insert({
        material_id: material.id,
        tipo: tipoMovimientoProduccion,
        cantidad,
        motivo,
        area: normalizarArea(pedido.area_actual),
        pedido_id: pedido.id,
        referencia_externa: `Pedido ${pedido.referencia}`,
      } as never);
      if (error) throw error;
      const verbo = tipoMovimientoProduccion === "devolucion" ? "devueltos al stock" : "registrados";
      toast.success(`${etiquetas[tipoMovimientoProduccion]}: ${cantidad} ${material.unidad} de ${material.material} ${verbo}`);
      setMaterialConsumo("");
      setCantidadConsumo("");
      setMotivoConsumo("");
      void qc.invalidateQueries({ queryKey: ["inventario"] });
      void qc.invalidateQueries({ queryKey: ["inventario-movimientos"] });
      void qc.invalidateQueries({ queryKey: ["inventario-movimientos-pedido", id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el consumo");
    } finally {
      setGuardandoConsumo(false);
    }
  }

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

      <FichaAurum className="mb-6 p-5 shadow-raised">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold">Completar pedido</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">{pendientesPedido.length === 0 ? "Pedido listo para trabajar" : "Información pendiente"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{pendientesPedido.length === 0 ? "La información comercial, técnica y productiva principal ya está conectada." : "Aurum Lab detectó los datos que todavía pueden completarse sin bloquear el trabajo."}</p>
          </div>
          <div className="min-w-[150px] text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Completitud</p>
            <p className="mt-1 text-2xl font-bold text-gold-deep">{avancePedido}%</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-gold transition-all" style={{ width: `${avancePedido}%` }} /></div>
        {pendientesPedido.length > 0 ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {!tieneContextoCliente ? <Link to="/clientes" className="rounded-xl border border-gold/25 bg-card p-3 transition hover:border-gold/50 hover:shadow-card"><p className="text-xs font-semibold text-foreground">Registrar cliente</p><p className="mt-1 text-[10px] text-muted-foreground">Convierte el cliente pendiente en un registro real.</p></Link> : null}
            {!tieneCotizacion && !tieneCotizacionExterna ? <Link to="/cotizaciones" className="rounded-xl border border-gold/25 bg-card p-3 transition hover:border-gold/50 hover:shadow-card"><p className="text-xs font-semibold text-foreground">Asociar cotización</p><p className="mt-1 text-[10px] text-muted-foreground">Busca o crea la cotización del pedido.</p></Link> : null}
            {!tieneContrato ? <button type="button" onClick={() => crearContrato.mutate(pedido)} disabled={crearContrato.isPending || !puedeVerComercial} className="rounded-xl border border-gold/25 bg-card p-3 text-left transition hover:border-gold/50 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-50"><p className="text-xs font-semibold text-foreground">{crearContrato.isPending ? "Generando contrato…" : "Completar contrato"}</p><p className="mt-1 text-[10px] text-muted-foreground">Genera el contrato desde los datos actuales del pedido.</p></button> : null}
            {!tieneFichaTecnica ? <button type="button" onClick={() => { document.getElementById("ficha-tecnica-pedido")?.scrollIntoView({ behavior: "smooth", block: "start" }); setEditando(true); setRutaEdit(pedido.ruta ?? []); }} className="rounded-xl border border-gold/25 bg-card p-3 text-left transition hover:border-gold/50 hover:shadow-card"><p className="text-xs font-semibold text-foreground">Completar ficha técnica</p><p className="mt-1 text-[10px] text-muted-foreground">Revisa trabajo, material y cantidad.</p></button> : null}
            {!tieneRutaProduccion ? <button type="button" onClick={() => { document.getElementById("ficha-tecnica-pedido")?.scrollIntoView({ behavior: "smooth", block: "start" }); setEditando(true); setRutaEdit(pedido.ruta ?? []); }} className="rounded-xl border border-gold/25 bg-card p-3 text-left transition hover:border-gold/50 hover:shadow-card"><p className="text-xs font-semibold text-foreground">Definir ruta de producción</p><p className="mt-1 text-[10px] text-muted-foreground">Indica las áreas que necesita esta pieza.</p></button> : null}
            {!tieneEntrega ? <button type="button" onClick={() => { document.getElementById("ficha-tecnica-pedido")?.scrollIntoView({ behavior: "smooth", block: "start" }); setEditando(true); setRutaEdit(pedido.ruta ?? []); }} className="rounded-xl border border-gold/25 bg-card p-3 text-left transition hover:border-gold/50 hover:shadow-card"><p className="text-xs font-semibold text-foreground">Definir fecha de entrega</p><p className="mt-1 text-[10px] text-muted-foreground">Completa la fecha comprometida del pedido.</p></button> : null}
          </div>
        ) : <div className="mt-4 rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-xs font-medium text-success">✓ Pedido preparado para continuar su flujo operativo.</div>}
      </FichaAurum>

      <Seccion titulo="Historial operativo">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Trazabilidad del pedido</p>
              <p className="mt-1 text-xs text-muted-foreground">Movimientos de área y consumos de inventario registrados desde la ficha del pedido.</p>
            </div>
            <span className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-deep">{historialPedido.length} eventos</span>
          </div>
          {historialPedido.length ? (
            <div className="relative ml-2 border-l border-gold/20 pl-6">
              <div className="space-y-5">
                {historialPedido.map((evento) => (
                  <div key={evento.id} className="relative">
                    <span className="absolute -left-[31px] top-1.5 size-2.5 rounded-full border-2 border-card bg-gold" />
                    <div className="rounded-2xl border border-border bg-surface-sunken p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold">{evento.tipo}</span>
                          <p className="mt-1 text-sm font-semibold text-foreground">{evento.titulo}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{evento.detalle}</p>
                        </div>
                        <time className="text-[10px] font-medium text-muted-foreground">
                          {new Date(evento.fecha).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </time>
                      </div>
                      {evento.nota ? <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">{evento.nota}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gold/25 bg-surface-sunken p-5 text-center">
              <p className="text-sm font-semibold text-foreground">Todavía no hay movimientos registrados.</p>
              <p className="mt-1 text-xs text-muted-foreground">El historial aparecerá automáticamente al mover el pedido entre áreas o consumir materiales.</p>
            </div>
          )}
        </div>
      </Seccion>

      <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border bg-surface-sunken px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Ciclo del pedido</p>
          <p className="mt-1 text-sm font-semibold">Seguimiento del pedido de principio a fin</p>
        </div>
        <div className="overflow-x-auto p-4">
          <div className="flex min-w-[680px] items-start">
            {[
              ["Cliente", contextoComercial?.cliente?.nombre ?? pedido.cliente ?? "Origen comercial"],
              ["Cotización", contextoComercial?.cotizacion
                ? `${contextoComercial.cotizacion.numero} · v${contextoComercial.cotizacion.version}`
                : "Pedido directo"],
              ["Pedido", pedido.referencia],
              ["Producción", normalizarArea(pedido.area_actual)],
              ["Entrega", mostrarEstadoVentas(pedido)],
            ].map(([label, value], index) => (
              <div key={label} className="flex min-w-[130px] flex-1 items-start">
                <div className="flex flex-col items-center text-center">
                  <span className="grid size-9 place-items-center rounded-full border border-gold/40 bg-gold/10 text-xs font-bold text-gold-deep">{index + 1}</span>
                  <span className="mt-2 text-xs font-semibold">{label}</span>
                  <span className="mt-1 max-w-[120px] truncate text-[10px] text-muted-foreground">{value}</span>
                </div>
                {index < 4 ? <span className="mx-2 mt-4 h-px flex-1 bg-border" /> : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <FichaAurum className="rounded-[24px] p-6 shadow-raised">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-gold/10 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold">Estado operativo</p>
                <h2 className="mt-2 font-display text-2xl italic sm:text-3xl">{siguienteAccion}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Área actual · {normalizarArea(pedido.area_actual)}
                </p>
              </div>
              <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gold">
                {pedido.estado}
              </span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {pedidoEnRecepcion(pedido.estado) && puedeAutorizar ? (
                <button
                  type="button"
                  onClick={() => autorizar.mutate({ pedido, usuarioId: sesion?.user.id ?? null })}
                  disabled={autorizar.isPending}
                  className="rounded-lg bg-gold px-4 py-2.5 text-xs font-bold text-gold-foreground transition hover:brightness-110 disabled:opacity-50"
                >
                  {autorizar.isPending ? "Autorizando…" : "Autorizar producción"}
                </button>
              ) : null}
              {!pedidoEnRecepcion(pedido.estado) && !["Entregado"].includes(pedido.estado) ? (
                <button
                  type="button"
                  onClick={() => setDestinoMovimiento(normalizarArea(pedido.area_actual))}
                  className="rounded-lg border border-gold/25 bg-card px-4 py-2.5 text-xs font-semibold text-gold-deep shadow-card transition hover:border-gold/50 hover:bg-gold/5"
                >
                  Gestionar área
                </button>
              ) : null}
              {tieneCotizacion ? (
                <Link
                  to="/cotizaciones/$id"
                  params={{ id: contextoComercial?.cotizacion?.id ?? pedido.cotizacion_id! }}
                  className="rounded-lg border border-gold/25 bg-card px-4 py-2.5 text-xs font-semibold text-gold-deep shadow-card transition hover:border-gold/50 hover:bg-gold/5"
                >
                  Ver cotización
                </Link>
              ) : null}
              <Link
                to="/ventas"
                className="rounded-lg border border-gold/25 bg-card px-4 py-2.5 text-xs font-semibold text-gold-deep shadow-card transition hover:border-gold/50 hover:bg-gold/5"
              >
                Ver ventas
              </Link>
            </div>
          </div>
        </FichaAurum>

        <div className="rounded-[24px] border border-border bg-card p-5 shadow-card">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Control rápido</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <QuickStatus label="Cliente" value={tieneContextoCliente ? "Conectado" : "Pendiente"} ok={tieneContextoCliente} />
            <QuickStatus label="Cotización" value={tieneCotizacion ? "Conectada" : "Externa / directa"} ok={tieneCotizacion} />
            <QuickStatus label="Producción" value={normalizarArea(pedido.area_actual)} ok={!pedidoEnRecepcion(pedido.estado)} />
            <QuickStatus label="Entrega" value={estadoEntrega} ok={estadoEntrega === "Entregado"} />
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Control de calidad</p><h2 className="mt-1 text-lg font-semibold">Inspecciones y liberación</h2><p className="mt-1 text-xs text-muted-foreground">Historial permanente de aprobaciones, observaciones, rechazos y retrabajos.</p></div>
          <span className="rounded-full bg-surface-muted px-3 py-1.5 text-[10px] font-bold">{controlesCalidad.length} registro{controlesCalidad.length===1?"":"s"}</span>
        </div>
        <div className="mt-4 space-y-2">
          {controlesCalidad.slice(0,6).map((c) => <div key={c.id} className="rounded-xl border border-border bg-background p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold">{c.tipo.replace("_"," ")}</span><span className="rounded-full bg-surface-muted px-2 py-1 text-[10px] font-bold uppercase">{c.resultado}</span></div>{c.motivo ? <p className="mt-1 text-xs text-muted-foreground">{c.motivo}</p> : null}</div>)}
          {controlesCalidad.length===0 ? <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">Todavía no hay inspecciones registradas.</p> : null}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-gold/25 bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-gold-deep">Pieza terminada</p><h2 className="mt-1 text-lg font-semibold">Recepción y verificación física</h2><p className="mt-1 text-xs text-muted-foreground">Registra la pieza fabricada y conserva estimados frente a datos reales.</p></div>{ordenProduccion ? <button type="button" onClick={() => void registrarPiezaTerminada()} className="rounded-xl bg-ink px-4 py-2.5 text-xs font-semibold text-ink-foreground">Registrar pieza</button> : null}</div>
        <div className="mt-4 space-y-2">{piezasTerminadas.map((p) => <div key={p.id} className="rounded-xl border border-border bg-background p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">{p.numero_pieza}</p><p className="text-[10px] text-muted-foreground">{p.cantidad} pieza{p.cantidad===1?"":"s"} · {p.metal_real || p.metal_estimado || "Metal por verificar"}</p></div><span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-bold uppercase">{p.estado}</span></div><div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><span>Peso est. <b>{p.peso_estimado ?? "—"} g</b></span><span>Peso real <b>{p.peso_final ?? "Pendiente"} g</b></span><span>Piedras <b>{p.piedras_reales || p.piedras_estimadas || "—"}</b></span><span>Metal <b>{p.metal_real || p.metal_estimado || "—"}</b></span></div></div>)}{piezasTerminadas.length===0 ? <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">Todavía no hay pieza terminada registrada.</p> : null}</div>
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-gold-deep">Orden de producción</p>
            <h2 className="mt-1 text-lg font-semibold">{ordenProduccion?.numero ?? "Sin orden de producción"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">La OP coordina la fabricación; los trabajos existentes serán sus operaciones.</p>
          </div>
          {ordenProduccion ? (
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-gold/20 bg-gold/[.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gold-deep">{ordenProduccion.estado.replaceAll("_", " ")}</span>
              <span className="rounded-full border border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Prioridad {ordenProduccion.prioridad}</span>
            </div>
          ) : (
            <button type="button" onClick={() => void crearOrdenProduccion()} disabled={guardandoOrden} className="rounded-xl border border-gold/25 bg-gold/[.08] px-4 py-2.5 text-xs font-bold text-gold-deep disabled:opacity-50">
              {guardandoOrden ? "Creando…" : "Crear orden de producción"}
            </button>
          )}
        </div>
        {ordenProduccion ? (
          <>
          <div className="mb-5 rounded-2xl border border-border bg-surface-sunken p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">Operaciones de fabricación</p><p className="mt-1 text-xs text-muted-foreground">Los trabajos del pedido forman parte de esta orden.</p></div>
              <div className="flex gap-2"><span className="rounded-full border border-border px-2.5 py-1 text-[9px] font-semibold">{trabajosPedido.length} operaciones</span><span className="rounded-full border border-gold/20 bg-gold/[.06] px-2.5 py-1 text-[9px] font-semibold text-gold-deep">{trabajosPedido.filter((t) => t.estado === "completado").length}/{trabajosPedido.length || 0} completas</span></div>
            </div>
            {trabajosPedido.length ? <div className="mt-3 grid gap-2 md:grid-cols-2">{trabajosPedido.map((trabajo) => <button key={trabajo.id} type="button" onClick={() => void navigate({ to: "/trabajos/$id", params: { id: trabajo.id } })} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left transition hover:border-gold/30"><div className="min-w-0"><p className="truncate text-xs font-semibold">{trabajo.titulo || "Operación"}</p><p className="mt-1 text-[10px] text-muted-foreground">{normalizarArea(trabajo.area)} · {trabajo.prioridad}</p></div><span className="shrink-0 rounded-full bg-surface-muted px-2 py-1 text-[9px] font-semibold text-muted-foreground">{trabajo.estado === "en_proceso" ? "En proceso" : trabajo.estado === "completado" ? "Completado" : trabajo.estado === "bloqueado" ? "Bloqueado" : "Pendiente"}</span></button>)}</div> : <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-5 text-center text-xs text-muted-foreground">Aún no hay operaciones.</p>}
          </div>
          <div className="grid gap-5 xl:grid-cols-[1fr_.85fr]">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">Entrega de materiales</p><p className="mt-1 text-xs text-muted-foreground">Registra quién recibe material para trabajar en la OP.</p></div>
                <span className="rounded-full border border-border px-2.5 py-1 text-[9px] font-semibold text-muted-foreground">{entregasProduccion.length} entregas</span>
              </div>
              <form onSubmit={registrarEntregaProduccion} className="rounded-2xl border border-border bg-surface-sunken p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                  <select value={materialEntrega} onChange={(e) => setMaterialEntrega(e.target.value)} className="h-10 rounded-xl border border-border bg-card px-3 text-sm" required>
                    <option value="">Material a entregar...</option>
                    {materialesInventario.filter((m) => m.activo).map((m) => <option key={m.id} value={m.id}>{m.material} · {m.stock} {m.unidad}</option>)}
                  </select>
                  <input type="number" min="0.001" step="any" value={cantidadEntrega} onChange={(e) => setCantidadEntrega(e.target.value)} placeholder="Cantidad" className="h-10 rounded-xl border border-border bg-card px-3 text-sm" required />
                </div>
                <div className="mt-3 flex gap-3">
                  <input value={notasEntrega} onChange={(e) => setNotasEntrega(e.target.value)} placeholder="Lote, responsable, observación..." className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 text-sm" />
                  <button type="submit" disabled={guardandoEntrega} className="h-10 rounded-xl border border-gold/25 bg-gold/[.08] px-4 text-xs font-bold text-gold-deep disabled:opacity-50">{guardandoEntrega ? "Guardando…" : "Registrar entrega"}</button>
                </div>
              </form>
            </div>
            <div className="rounded-2xl border border-border overflow-hidden">
              <div className="border-b border-border bg-surface-sunken px-4 py-2.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Últimas entregas</div>
              <div className="divide-y divide-border">
                {entregasProduccion.length ? entregasProduccion.slice(0, 6).map((entrega: any) => (
                  <div key={entrega.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0"><p className="truncate text-xs font-semibold">{entrega.inventario?.material ?? "Material"}</p><p className="text-[10px] text-muted-foreground">{entrega.area_destino || "Producción"} · {new Date(entrega.created_at).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</p></div>
                    <span className="shrink-0 text-xs font-bold tabular-nums">{entrega.cantidad} {entrega.unidad}</span>
                  </div>
                )) : <p className="px-4 py-6 text-center text-xs text-muted-foreground">Todavía no hay materiales entregados.</p>}
              </div>
            </div>
          </div>
          </>
        ) : null}
      </div>

      <div className="mb-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel titulo="Materiales utilizados en el pedido">
          <div className="p-5">
            <form onSubmit={registrarMaterialPlanificado} className="rounded-2xl border border-border bg-surface-sunken p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-gold-deep">Plan de producción</p><p className="mt-1 text-xs text-muted-foreground">Define lo previsto antes de descontar stock.</p></div>
                <span className="rounded-full border border-gold/15 bg-gold/[.05] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{materialesPlanificados.length} materiales</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
                <select value={materialPlan} onChange={(e) => setMaterialPlan(e.target.value)} className="h-10 rounded-xl border border-border bg-card px-3 text-sm" required>
                  <option value="">Añadir material al plan...</option>
                  {materialesInventario.filter((m) => m.activo && !materialesPlanificados.some((p) => p.material_id === m.id)).map((m) => (
                    <option key={m.id} value={m.id}>{m.material} · stock {m.stock} {m.unidad}</option>
                  ))}
                </select>
                <input type="number" min="0.001" step="any" value={cantidadPlan} onChange={(e) => setCantidadPlan(e.target.value)} placeholder="Cantidad prevista" className="h-10 rounded-xl border border-border bg-card px-3 text-sm" required />
              </div>
              <div className="mt-3 flex gap-3">
                <input value={notasPlan} onChange={(e) => setNotasPlan(e.target.value)} placeholder="Nota: tolerancia, piedra, lote..." className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 text-sm" />
                <button type="submit" disabled={guardandoPlan || !materialPlan || !cantidadPlan} className="h-10 shrink-0 rounded-xl border border-gold/25 bg-gold/[.08] px-4 text-xs font-bold text-gold-deep disabled:opacity-50">{guardandoPlan ? "Guardando…" : "Añadir al plan"}</button>
              </div>
            </form>
            {materialesPlanificados.length ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-border">
                <div className="grid grid-cols-[1.4fr_.8fr_.8fr_auto] gap-3 border-b border-border bg-surface-sunken px-4 py-2.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground"><span>Material</span><span>Plan</span><span>Consumido</span><span /></div>
                <div className="divide-y divide-border">
                  {materialesPlanificados.map((plan) => {
                    const consumido = movimientosPedido.filter((mov) => mov.material_id === plan.material_id && mov.tipo === "consumo").reduce((sum, mov) => sum + Number(mov.cantidad || 0), 0);
                    const diferencia = Number(plan.cantidad_planificada) - consumido;
                    return <div key={plan.id} className="grid grid-cols-[1.4fr_.8fr_.8fr_auto] items-center gap-3 px-4 py-3">
                      <div className="min-w-0"><p className="truncate text-xs font-semibold">{plan.inventario?.material ?? "Material"}</p><p className="text-[10px] text-muted-foreground">{plan.notas || "Sin nota"}</p></div>
                      <span className="text-xs tabular-nums">{plan.cantidad_planificada} {plan.unidad}</span>
                      <div><p className="text-xs font-semibold tabular-nums">{consumido} {plan.unidad}</p><p className={diferencia < 0 ? "text-[9px] text-danger" : "text-[9px] text-muted-foreground"}>{diferencia >= 0 ? `${diferencia} ${plan.unidad} pendientes` : `${Math.abs(diferencia)} ${plan.unidad} sobre plan`}</p></div>
                      <button type="button" onClick={() => void eliminarMaterialPlanificado(plan.id)} className="rounded-lg border border-border px-2 py-1 text-[9px] text-muted-foreground hover:border-danger/25 hover:text-danger">Quitar</button>
                    </div>;
                  })}
                </div>
              </div>
            ) : null}
            <div className="my-4 flex items-center gap-3"><span className="h-px flex-1 bg-border" /><span className="text-[9px] font-bold uppercase tracking-[.16em] text-muted-foreground">Consumo real</span><span className="h-px flex-1 bg-border" /></div>
            <form onSubmit={registrarConsumo} className="rounded-2xl border border-gold/15 bg-gold/[.025] p-4">
              <div className="mb-3 grid gap-3 sm:grid-cols-[150px_1fr_150px]">
                <select value={tipoMovimientoProduccion} onChange={(e) => setTipoMovimientoProduccion(e.target.value as "consumo" | "merma" | "devolucion")} className="h-10 rounded-xl border border-gold/20 bg-card px-3 text-sm">
                  <option value="consumo">Consumo real</option>
                  <option value="merma">Merma</option>
                  <option value="devolucion">Devolución</option>
                </select>
                <select value={materialConsumo} onChange={(e) => setMaterialConsumo(e.target.value)} className="h-10 rounded-xl border border-gold/20 bg-card px-3 text-sm" required>
                  <option value="">Seleccionar material...</option>
                  {materialesInventario.filter((m) => m.activo && (tipoMovimientoProduccion === "devolucion" || m.stock > 0)).map((m) => (
                    <option key={m.id} value={m.id}>{m.material} · {m.stock} {m.unidad} disponibles</option>
                  ))}
                </select>
                <input type="number" min="0.001" step="any" value={cantidadConsumo} onChange={(e) => setCantidadConsumo(e.target.value)} placeholder="Cantidad" className="h-10 rounded-xl border border-gold/20 bg-card px-3 text-sm" required />
              </div>
              <div className="mt-3 flex gap-3">
                <input value={motivoConsumo} onChange={(e) => setMotivoConsumo(e.target.value)} placeholder={`Motivo del consumo en ${normalizarArea(pedido.area_actual)}`} className="h-10 min-w-0 flex-1 rounded-xl border border-gold/20 bg-card px-3 text-sm" required />
                <button type="submit" disabled={guardandoConsumo || !materialConsumo || !cantidadConsumo} className="h-10 shrink-0 rounded-xl bg-gold px-4 text-xs font-bold text-gold-deep shadow-card disabled:opacity-50">
                  {guardandoConsumo ? "Registrando…" : "Registrar consumo"}
                </button>
              </div>
            </form>

            <div className="mt-4 divide-y divide-border">
              {movimientosPedido.map((mov) => (
                <div key={mov.id} className="flex items-center gap-3 py-3">
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${mov.tipo === "devolucion" ? "bg-emerald-500/10 text-emerald-600" : mov.tipo === "merma" ? "bg-danger/10 text-danger" : "bg-gold/10 text-gold-deep"}`}>
                    <span className="text-xs font-bold">{mov.tipo === "devolucion" ? "+" : "−"}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{mov.inventario?.material ?? "Material"}</p>
                    <p className="text-[10px] text-muted-foreground">{mov.tipo === "devolucion" ? "Devolución" : mov.tipo === "merma" ? "Merma" : "Consumo"} · {mov.area || "Producción"} · {new Date(mov.created_at).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold tabular-nums">{mov.tipo === "devolucion" ? "+" : "−"}{mov.cantidad} {mov.inventario?.unidad ?? ""}</p>
                    <p className="text-[10px] text-muted-foreground">Stock {mov.stock_posterior ?? "—"}</p>
                  </div>
                </div>
              ))}
              {!movimientosPedido.length ? <p className="py-8 text-center text-xs text-muted-foreground">Todavía no hay consumos registrados para este pedido.</p> : null}
            </div>
          </div>
        </Panel>

        <Panel titulo="Trazabilidad de materiales">
          <div className="p-5">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold-deep">Resumen</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Cada consumo, merma o devolución queda asociado al pedido y al área que lo realizó. El inventario actualiza el stock automáticamente.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <DatoClave etiqueta="Movimientos" valor={String(movimientosPedido.length)} />
                <DatoClave etiqueta="Área actual" valor={normalizarArea(pedido.area_actual)} destacado />
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Si el stock disponible no alcanza, Aurum rechazará el consumo para evitar inventario negativo.
            </p>
          </div>
        </Panel>
      </div>

      <FichaAurum className="mb-6 p-5" interactiva>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Contexto comercial</p>
            <p className="mt-1 text-sm font-semibold">Relaciones del pedido</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
            <span className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-gold-deep">
              {contextoComercial?.cliente?.nombre ?? pedido.cliente ?? "Cliente pendiente"}
            </span>
            <span className="rounded-full border border-border bg-surface-sunken px-3 py-1 text-muted-foreground">
              {contextoComercial?.cotizacion ? `Cotización ${contextoComercial.cotizacion.numero}` : tieneCotizacionExterna ? "Cotización externa" : "Pedido directo"}
            </span>
            <span className="rounded-full border border-border bg-surface-sunken px-3 py-1 text-muted-foreground">
              {pedido.contrato || (tieneContratoExterno ? "Contrato externo" : "Sin contrato")}
            </span>
          </div>
        </div>
      </FichaAurum>
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
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border border-gold/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${estadoClases[pedido.estado] ?? "bg-accent text-foreground"}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {pedido.estado || "—"}
                  </span>
                </div>
              </div>

              <BloqueDatos
                titulo="Ficha técnica"
                datos={[
                  ["Descripción / trabajo", pedido.trabajo || pedido.pieza || "—"],
                  ["Peso", pedido.peso_estimado ? `${pedido.peso_estimado}` : "—"],
                  ["Material", pedido.material || "—"],
                  ["Piedras", pedido.piedras || "—"],
                  ["Talla", pedido.talla || "—"],
                  ["Cantidad", String(pedido.cantidad_piezas ?? "—")],
                ]}
              />
              <BloqueDatos
                titulo="Datos comerciales"
                datos={[
                  ["Contrato", pedido.contrato || "—"],
                  ["Origen / lugar", pedido.origen || "—"],
                  ["Precio", new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(pedido.importe) || 0)],
                  ["A cuenta", new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(pedido.a_cuenta) || 0)],
                  ["Saldo", new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(pedido.saldo) || 0)],
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
                            className="rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-gold-foreground hover:opacity-90"
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
                          className="rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-gold-foreground disabled:opacity-50"
                        >
                          {crearContrato.isPending ? "Creando…" : "Crear contrato"}
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </Panel>

  

              <Panel titulo="Estado de pagos del contrato">
                <div className="grid gap-4 p-5 sm:grid-cols-3 lg:p-6">
                  <DatoClave etiqueta="Total contrato" valor={new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(totalFinanciero)} />
                  <DatoClave etiqueta="Abonado contrato" valor={new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(abonadoFinanciero)} />
                  <DatoClave etiqueta="Saldo contrato" valor={new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(saldoFinanciero)} destacado />
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
                titulo="Seguimiento"
                datos={[
                  ["Área actual", normalizarArea(pedido.area_actual)],
                  ["Tiempo en área", tiempoEnArea(pedido.area_desde)],
                  ["Taller", pedido.sede_nombre || "—"],
                  ["Entrega", fmtFecha(pedido.fecha_entrega ?? pedido.entrega) ?? "—"],
                ]}
              />

              {pedido.cotizacion_id ? (
                <Panel titulo="Detalle de cotización">
                  <div className="space-y-4 p-5 lg:p-6">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        Pedido generado desde una cotización.
                      </span>
                      {pedido.proyecto_joya_id ? (
                        <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1">
                          Proyecto de joya vinculado
                        </span>
                      ) : null}
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
                    className="mt-3 w-full rounded-lg bg-gold px-4 py-3 text-sm font-medium text-gold-foreground shadow-card transition hover:shadow-raised disabled:opacity-50 sm:w-auto sm:py-2 sm:text-xs"
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
                  className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-gold-foreground disabled:opacity-40"
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
              </div>
            </Panel>
          </div>

          <div id="ficha-tecnica-pedido"><Seccion titulo="Ficha técnica general">
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
                      a_cuenta: Number(fd.get("a_cuenta")) || 0,
                      saldo: Math.max(
                        0,
                        (Number(fd.get("importe")) || 0) - (Number(fd.get("a_cuenta")) || 0),
                      ),
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
                    ["contrato", "Contrato", pedido.contrato, "text"],
                    ["cliente", "Nombre", pedido.cliente, "text"],
                    ["origen", "Origen / lugar", pedido.origen, "text"],
                    ["trabajo", "Descripción / trabajo", pedido.trabajo || pedido.pieza, "text"],
                    ["peso_estimado", "Peso", pedido.peso_estimado, "text"],
                    ["material", "Material", pedido.material, "text"],
                    ["piedras", "Piedras", pedido.piedras, "text"],
                    ["talla", "Talla", pedido.talla, "text"],
                    [
                      "cantidad_piezas",
                      "Cantidad",
                      String(pedido.cantidad_piezas),
                      "number",
                    ],
                    ["importe", "Precio", String(pedido.importe), "number"],
                    ["a_cuenta", "A cuenta", String(pedido.a_cuenta), "number"],
                  ] as const
                ).map(([name, label, val, tipo]) => (
                  <label
                    key={name}
                    className="text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    {label}
                    {(tipo as string) === "date" ? (
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

                <div className="rounded-lg border border-border bg-surface-sunken px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Saldo</span>
                  {" "}se calcula automáticamente como Precio − A cuenta al guardar.
                </div>

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
                              ? "border-transparent bg-gold text-gold-foreground"
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
                    className="rounded-lg bg-gold px-4 py-2 text-xs text-gold-foreground"
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
          </Seccion></div>

          <Seccion titulo="Documentación comercial">
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-gold/20 bg-surface-sunken p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold">Cotización</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {tieneCotizacion ? "Vinculada a Aurum Lab" : tieneCotizacionExterna ? "Documento externo" : "Pendiente"}
                      </p>
                    </div>
                    <span className="rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-gold-deep">
                      {tieneCotizacion ? "Aurum" : tieneCotizacionExterna ? "Externa" : "Pendiente"}
                    </span>
                  </div>
                  {contextoComercial?.cotizacion ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {contextoComercial.cotizacion.numero} · v{contextoComercial.cotizacion.version} · {contextoComercial.cotizacion.estado}
                    </p>
                  ) : documentosExternos.cotizacion ? (
                    <p className="mt-3 break-all text-xs text-muted-foreground">{documentosExternos.cotizacion}</p>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">Este pedido puede continuar aunque la cotización todavía no esté formalizada.</p>
                  )}
                  {!tieneCotizacion && puedeEditar ? (
                    <label className="mt-3 inline-flex cursor-pointer items-center rounded-xl border border-gold/25 bg-card px-3 py-2 text-xs font-semibold text-gold-deep transition hover:border-gold/50">
                      Adjuntar cotización
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) subir.mutate({ file, tipo: "cotizacion", grupo: "cotizacion" });
                          e.target.value = "";
                        }}
                      />
                    </label>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-gold/20 bg-surface-sunken p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold">Contrato</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {contratoRef ? "Vinculado a Aurum Lab" : tieneContratoExterno ? "Documento externo" : "Pendiente"}
                      </p>
                    </div>
                    <span className="rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-gold-deep">
                      {contratoRef ? "Aurum" : tieneContratoExterno ? "Externo" : "Pendiente"}
                    </span>
                  </div>
                  {contratoRef ? (
                    <p className="mt-3 text-xs text-muted-foreground">Contrato {pedido.contrato || contratoRef}</p>
                  ) : documentosExternos.contrato ? (
                    <p className="mt-3 break-all text-xs text-muted-foreground">{documentosExternos.contrato}</p>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">Puedes conservar el contrato propio del taller y formalizarlo después.</p>
                  )}
                  {!contratoRef && puedeEditar ? (
                    <label className="mt-3 inline-flex cursor-pointer items-center rounded-xl border border-gold/25 bg-card px-3 py-2 text-xs font-semibold text-gold-deep transition hover:border-gold/50">
                      Adjuntar contrato
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) subir.mutate({ file, tipo: "contrato", grupo: "contrato" });
                          e.target.value = "";
                        }}
                      />
                    </label>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Documentos conservados del taller</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Los documentos externos permanecen dentro del pedido durante la transición a Aurum Lab.
                    </p>
                  </div>
                  <span className="rounded-full border border-border bg-surface-sunken px-2.5 py-1 text-[9px] font-semibold text-muted-foreground">
                    {archivos.filter((a) => a.tipo === "cotizacion" || a.tipo === "contrato").length} documentos
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {archivos.filter((a) => a.tipo === "cotizacion" || a.tipo === "contrato").map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-sunken p-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">{a.nombre}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{a.tipo} · v{a.version}</p>
                      </div>
                      <a href={a.url} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-info hover:underline">Abrir</a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
                className="rounded-lg bg-gold px-4 py-2 text-xs text-gold-foreground"
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