import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, CircleAlert, FileText, Link2, Play, Paperclip } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { areaCoincide, useSesion } from "@/lib/auth";

type ArchivoTecnico = {
  id: string;
  pedido_archivo_id: string;
  nombre: string;
  tipo: string;
  url: string;
  es_enlace: boolean;
  grupo: string;
};

type Trabajo = {
  id: string;
  pedido_id: string;
  area: string;
  ubicacion: string;
  titulo: string;
  descripcion: string;
  estado: "pendiente" | "en_proceso" | "bloqueado" | "completado" | "cancelado";
  prioridad: "baja" | "normal" | "alta" | "urgente";
  tipo: "interno" | "externo";
  fecha_planificada: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  notas: string;
  responsable_user_id: string | null;
  especialidad_id: string | null;
};

export const Route = createFileRoute("/_authenticated/trabajos/$id")({
  head: () => ({ meta: [{ title: "Trabajo — Aurum Lab" }] }),
  component: TrabajoOperativoPage,
});

const estadoLabel: Record<Trabajo["estado"], string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  bloqueado: "Bloqueado",
  completado: "Completado",
  cancelado: "Cancelado",
};

function TrabajoOperativoPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: sesion } = useSesion();
  const qc = useQueryClient();
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState("");
  const [guardandoArchivo, setGuardandoArchivo] = useState(false);
  const [incidencia, setIncidencia] = useState({ tipo: "general", descripcion: "" });
  const [reportandoIncidencia, setReportandoIncidencia] = useState(false);
  const [relojAhora, setRelojAhora] = useState(Date.now());
  const [especialidadSeleccionada, setEspecialidadSeleccionada] = useState("");
  const [guardandoEspecialidad, setGuardandoEspecialidad] = useState(false);

  const { data: sesionesTiempo = [] } = useQuery({
    queryKey: ["trabajo-tiempos", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("trabajo_tiempos")
        .select("id,usuario_id,inicio,fin,segundos_acumulados,motivo_pausa")
        .eq("trabajo_id", id).order("inicio", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const timer = window.setInterval(() => setRelojAhora(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const sesionActiva = sesionesTiempo.find((s) => !s.fin && s.usuario_id === sesion?.user.id);
  const segundosTotales = useMemo(() => sesionesTiempo.reduce((total, s) => {
    const extra = s.fin ? 0 : Math.max(0, Math.floor((relojAhora - new Date(s.inicio).getTime()) / 1000));
    return total + Number(s.segundos_acumulados || 0) + extra;
  }, 0), [sesionesTiempo, relojAhora]);

  const iniciarReloj = async () => {
    if (!sesion?.user.id || sesionActiva) return;
    const { error } = await supabase.from("trabajo_tiempos").insert({ trabajo_id: id, usuario_id: sesion.user.id });
    if (error) setErrorAccion(error.message);
    else { await qc.invalidateQueries({ queryKey: ["trabajo-tiempos", id] }); await qc.invalidateQueries({ queryKey: ["trabajo-operativo", id] }); }
  };

  const detenerReloj = async () => {
    if (!sesionActiva) return;
    const segundos = Math.max(0, Math.floor((Date.now() - new Date(sesionActiva.inicio).getTime()) / 1000));
    const { error } = await supabase.from("trabajo_tiempos").update({ fin: new Date().toISOString(), segundos_acumulados: segundos }).eq("id", sesionActiva.id);
    if (error) setErrorAccion(error.message);
    else await qc.invalidateQueries({ queryKey: ["trabajo-tiempos", id] });
  };

  const { data: archivosTecnicos = [] } = useQuery({
    queryKey: ["trabajo-archivos", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trabajo_archivos")
        .select("id, pedido_archivo_id, pedido_archivos(nombre, tipo, url, es_enlace, grupo)")
        .eq("trabajo_id", id);
      if (error) throw error;
      return ((data ?? []) as Array<{ id: string; pedido_archivo_id: string; pedido_archivos: ArchivoTecnico | ArchivoTecnico[] | null }>).map((row) => {
        const archivo = Array.isArray(row.pedido_archivos) ? row.pedido_archivos[0] : row.pedido_archivos;
        return archivo ? { ...archivo, id: row.id, pedido_archivo_id: row.pedido_archivo_id } : null;
      }).filter(Boolean) as ArchivoTecnico[];
    },
  });

  const { data: incidencias = [] } = useQuery({
    queryKey: ["incidencias-trabajo", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidencias_trabajo")
        .select("id, tipo, descripcion, estado, resolucion, created_at")
        .eq("trabajo_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const reportarIncidencia = async () => {
    if (!incidencia.descripcion.trim() || !sesion?.user.id) return;
    setReportandoIncidencia(true);
    const { error } = await supabase.from("incidencias_trabajo").insert({
      trabajo_id: id,
      reportado_por: sesion.user.id,
      tipo: incidencia.tipo,
      descripcion: incidencia.descripcion.trim(),
    });
    setReportandoIncidencia(false);
    if (error) {
      setErrorAccion(error.message);
      return;
    }
    setIncidencia({ tipo: "general", descripcion: "" });
    await qc.invalidateQueries({ queryKey: ["incidencias-trabajo", id] });
  };

  const cambiarIncidencia = async (incidenciaId: string, estado: "en_revision" | "resuelta" | "descartada") => {
    const { error } = await supabase
      .from("incidencias_trabajo")
      .update({
        estado,
        ...(estado === "resuelta" ? { resuelto_por: sesion?.user.id ?? null, resuelto_at: new Date().toISOString() } : {}),
      })
      .eq("id", incidenciaId);
    if (error) {
      setErrorAccion(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["incidencias-trabajo", id] });
  };

  const adjuntarArchivo = async () => {
    if (!archivoSeleccionado) return;
    setGuardandoArchivo(true);
    const { error } = await supabase.from("trabajo_archivos").insert({
      trabajo_id: id,
      pedido_archivo_id: archivoSeleccionado,
    });
    setGuardandoArchivo(false);
    if (error) {
      setErrorAccion(error.code === "23505" ? "Ese archivo ya está vinculado." : error.message);
      return;
    }
    setArchivoSeleccionado("");
    await qc.invalidateQueries({ queryKey: ["trabajo-archivos", id] });
  };


  const { data: trabajo, isLoading } = useQuery({
    queryKey: ["trabajo-operativo", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trabajos")
        .select("id, pedido_id, area, ubicacion, titulo, descripcion, estado, prioridad, tipo, fecha_planificada, fecha_inicio, fecha_fin, notas, responsable_user_id, especialidad_id")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Este trabajo no existe o no está asignado a tu usuario.");
      return data as Trabajo;
    },
  });

  const { data: especialidades = [] } = useQuery({
    queryKey: ["especialidades-trabajo", trabajo?.area],
    enabled: Boolean(sesion?.esAdmin && trabajo),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("especialidades")
        .select("id,nombre,categoria")
        .eq("activa", true)
        .order("categoria", { ascending: true, nullsFirst: true })
        .order("nombre", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: pedidoTrabajo } = useQuery({
    queryKey: ["pedido-trabajo", trabajo?.pedido_id],
    enabled: Boolean(trabajo?.pedido_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("id, referencia, trabajo, material, talla, piedras, peso_estimado, cantidad_piezas, fecha_entrega, notas, ruta, corte_texto, corte_tipografia, corte_ubicacion, corte_observaciones")
        .eq("id", trabajo!.pedido_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: materialesPlanificados = [] } = useQuery({
    queryKey: ["pedido-materiales-trabajo", trabajo?.pedido_id],
    enabled: Boolean(trabajo?.pedido_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedido_materiales")
        .select("id,cantidad_planificada,unidad,notas,inventario(material,codigo,unidad)")
        .eq("pedido_id", trabajo!.pedido_id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: archivosPedido = [] } = useQuery({
    queryKey: ["archivos-pedido-trabajo", trabajo?.pedido_id],
    enabled: Boolean(
        trabajo?.pedido_id &&
        (
          sesion?.esAdmin ||
          trabajo?.responsable_user_id === sesion?.user.id ||
          (sesion?.rolPrincipal === "operario" && (sesion.areas ?? []).some((area) => areaCoincide(area, trabajo.area)))
        )
      ),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedido_archivos")
        .select("id, nombre, tipo, url, es_enlace, grupo, version, es_vigente_fabricacion")
        .eq("pedido_id", trabajo!.pedido_id)
        .eq("es_enlace", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string; nombre: string; tipo: string; url: string; es_enlace: boolean;
        grupo: string; version: number; es_vigente_fabricacion: boolean;
      }>;
    },
  });

  const archivosVigentes = useMemo(
    () => archivosPedido.filter((a) => a.es_vigente_fabricacion),
    [archivosPedido],
  );

  const guardarEspecialidad = async () => {
    if (!sesion?.esAdmin || !trabajo || guardandoEspecialidad) return;
    setGuardandoEspecialidad(true);
    setErrorAccion(null);
    const { error } = await supabase
      .from("trabajos")
      .update({ especialidad_id: especialidadSeleccionada || null })
      .eq("id", trabajo.id);
    setGuardandoEspecialidad(false);
    if (error) {
      setErrorAccion(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["trabajo-operativo", id] });
  };
  const cambiarEstado = useMutation({
    mutationFn: async (estado: "en_proceso" | "completado" | "bloqueado") => {
      setErrorAccion(null);
      const { error } = await supabase.rpc("cambiar_estado_trabajo", {
        _trabajo_id: id,
        _nuevo_estado: estado,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trabajo-operativo", id] });
      qc.invalidateQueries({ queryKey: ["mis-trabajos-operario"] });
      qc.invalidateQueries({ queryKey: ["trabajos-pedido", trabajo?.pedido_id] });
    },
    onError: (error) => setErrorAccion(error instanceof Error ? error.message : "No se pudo actualizar el trabajo."),
  });

  if (isLoading) {
    return <AppShell titulo="Trabajo" subtitulo="Cargando…" ocultarNavegacion encabezadoMovilCompacto><p className="text-sm text-muted-foreground">Cargando trabajo…</p></AppShell>;
  }

  if (!trabajo) {
    return <AppShell titulo="Trabajo no disponible" subtitulo="Acceso operativo" ocultarNavegacion encabezadoMovilCompacto><p className="text-sm text-muted-foreground">Este trabajo no está disponible para tu usuario.</p></AppShell>;
  }

  const esResponsable = trabajo.responsable_user_id === sesion?.user.id;
  const puedeTomar = Boolean(
    sesion?.rolPrincipal === "operario" &&
    !trabajo.responsable_user_id &&
    (sesion.areas ?? []).some((area) => areaCoincide(area, trabajo.area)),
  );
  const puedeGestionar = Boolean(sesion?.esAdmin || esResponsable);

  const tomarTrabajo = async () => {
    if (!puedeTomar) return;
    setErrorAccion(null);
    const { error } = await supabase.rpc("tomar_trabajo", { _trabajo_id: trabajo.id });
    if (error) {
      setErrorAccion(error.message);
      return;
    }
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["trabajo-operativo", id] }),
      qc.invalidateQueries({ queryKey: ["trabajos-operario", sesion?.user.id] }),
      qc.invalidateQueries({ queryKey: ["trabajos-pedido", trabajo.pedido_id] }),
    ]);
  };
  const activo = !["completado", "cancelado"].includes(trabajo.estado);

  return (
    <AppShell
      titulo={trabajo.titulo}
      subtitulo={`${trabajo.area} · Pedido ${pedidoTrabajo?.referencia ?? trabajo.pedido_id.slice(0, 8) + "…"}`}
      ocultarNavegacion
      encabezadoMovilCompacto
      atrasMovil={{ to: "/operario" }}
    >
      <div className="mx-auto max-w-3xl space-y-5">
        <button type="button" onClick={() => void navigate({ to: "/operario" })} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Mi trabajo
        </button>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-raised">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Pedido asociado</p>
              <h2 className="mt-1 text-lg font-semibold">{pedidoTrabajo?.referencia ?? "Pedido"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {pedidoTrabajo?.trabajo || "Trabajo sin descripción"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {puedeTomar ? (
                <button
                  type="button"
                  onClick={() => void tomarTrabajo()}
                  className="rounded-xl bg-gold px-3 py-2 text-xs font-bold text-gold-foreground"
                >
                  Tomar este trabajo
                </button>
              ) : null}
              {sesion?.esAdmin ? (
                <button
                  type="button"
                  onClick={() => void navigate({ to: "/pedidos/$id", params: { id: trabajo.pedido_id }, search: { from: undefined } })}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold hover:border-primary/40 hover:text-primary"
                >
                  Ver pedido
                </button>
              ) : null}
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              ["Material", pedidoTrabajo?.material || "—"],
              ["Talla", pedidoTrabajo?.talla || "—"],
              ["Piedras", pedidoTrabajo?.piedras || "—"],
              ["Peso", pedidoTrabajo?.peso_estimado || "—"],
              ["Cantidad", String(pedidoTrabajo?.cantidad_piezas ?? "—")],
            ].map(([etiqueta, valor]) => (
              <div key={etiqueta} className="rounded-xl bg-surface-sunken p-3">
                <dt className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{etiqueta}</dt>
                <dd className="mt-1 truncate text-sm font-medium">{valor}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-3xl border-2 border-gold/30 bg-gradient-to-br from-card to-gold/[0.04] p-5 shadow-raised">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-deep">Ficha técnica de fabricación</p>
              <h2 className="mt-1 text-xl font-semibold">Qué se debe fabricar</h2>
              <p className="mt-1 text-xs text-muted-foreground">Información técnica necesaria para ejecutar este trabajo. Los datos comerciales no forman parte de esta ficha.</p>
            </div>
            <span className="rounded-full border border-gold/20 bg-gold/[0.08] px-3 py-1.5 text-[10px] font-bold text-gold-deep">{trabajo.area}</span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Trabajo", pedidoTrabajo?.trabajo || trabajo.titulo || "—"],
              ["Material / metal", pedidoTrabajo?.material || "—"],
              ["Talla", pedidoTrabajo?.talla || "—"],
              ["Piedras", pedidoTrabajo?.piedras || "—"],
              ["Peso estimado", pedidoTrabajo?.peso_estimado || "—"],
              ["Cantidad", String(pedidoTrabajo?.cantidad_piezas ?? "—")],
              ["Entrega", pedidoTrabajo?.fecha_entrega || "—"],
              ["Referencia", pedidoTrabajo?.referencia || "—"],
            ].map(([etiqueta, valor]) => (
              <div key={etiqueta} className="rounded-2xl border border-border bg-background p-4">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{etiqueta}</p>
                <p className="mt-1 text-sm font-semibold">{valor}</p>
              </div>
            ))}
          </div>

          {pedidoTrabajo?.notas ? (
            <div className="mt-4 rounded-2xl border border-border bg-background p-4">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Especificaciones / notas</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{pedidoTrabajo.notas}</p>
            </div>
          ) : null}

          {Array.isArray(pedidoTrabajo?.ruta) && pedidoTrabajo.ruta.length > 0 ? (
            <div className="mt-4">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Ruta de producción</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {pedidoTrabajo.ruta.map((area) => (
                  <span key={area} className={area === trabajo.area ? "rounded-full bg-gold px-3 py-1.5 text-[10px] font-bold text-gold-foreground" : "rounded-full bg-surface-muted px-3 py-1.5 text-[10px] font-semibold text-muted-foreground"}>
                    {area}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {materialesPlanificados.length > 0 ? (
            <div className="mt-4">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Materiales previstos para este trabajo</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {materialesPlanificados.map((item: any) => (
                  <div key={item.id} className="rounded-2xl border border-border bg-background p-3">
                    <p className="text-sm font-semibold">{item.inventario?.material || "Material"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.cantidad_planificada} {item.unidad || item.inventario?.unidad || ""}{item.inventario?.codigo ? ` · ${item.inventario.codigo}` : ""}</p>
                    {item.notas ? <p className="mt-1 text-xs text-muted-foreground">{item.notas}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {trabajo.area === "Corte Láser" && (pedidoTrabajo?.corte_texto || pedidoTrabajo?.corte_tipografia || pedidoTrabajo?.corte_ubicacion || pedidoTrabajo?.corte_observaciones) ? (
            <div className="mt-4 rounded-2xl border border-border bg-background p-4">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Especificaciones de Corte Láser</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 text-sm">
                <p><span className="font-semibold">Texto:</span> {pedidoTrabajo.corte_texto || "—"}</p>
                <p><span className="font-semibold">Tipografía:</span> {pedidoTrabajo.corte_tipografia || "—"}</p>
                <p><span className="font-semibold">Ubicación:</span> {pedidoTrabajo.corte_ubicacion || "—"}</p>
                <p className="sm:col-span-2"><span className="font-semibold">Observaciones:</span> {pedidoTrabajo.corte_observaciones || "—"}</p>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border-2 border-success/20 bg-success/[0.03] p-5 shadow-raised">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-success">Archivo vigente para fabricación</p>
              <h2 className="mt-1 text-lg font-semibold">Diseño aprobado</h2>
              <p className="mt-1 text-xs text-muted-foreground">Esta es la versión que debe utilizarse para ejecutar el trabajo.</p>
            </div>
            <span className="rounded-full bg-success/10 px-3 py-1.5 text-[10px] font-bold text-success">
              {archivosVigentes.length > 0 ? "APROBADO" : "PENDIENTE"}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {archivosVigentes.length > 0 ? archivosVigentes.map((archivo) => (
              <a key={archivo.id} href={archivo.url} target="_blank" rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl border border-success/20 bg-background p-3 hover:border-success/40">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{archivo.nombre}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Versión {archivo.version} · {archivo.grupo}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-success">Abrir</span>
              </a>
            )) : (
              <p className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                Aún no hay un archivo aprobado para fabricación. El administrador debe marcar una versión vigente.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gold/25 bg-card p-5 shadow-raised">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Trabajo asignado</p>
              <h1 className="mt-1 text-2xl font-semibold">{trabajo.titulo}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{trabajo.area} · {trabajo.tipo === "externo" ? "Externo" : "Interno"}</p>
            </div>
            <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold">{estadoLabel[trabajo.estado]}</span>
          </div>

          <div className="mt-4 rounded-2xl border border-gold/20 bg-gold/[0.03] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Especialidad de la operación</p>
                <p className="mt-1 text-sm font-semibold">{trabajo.especialidad_id ? (especialidades.find((e: any) => e.id === trabajo.especialidad_id)?.nombre ?? "Especialidad asignada") : "Sin especialidad asignada"}</p>
              </div>
              {sesion?.esAdmin ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select value={especialidadSeleccionada || trabajo.especialidad_id || ""} onChange={(e) => setEspecialidadSeleccionada(e.target.value)} className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm">
                    <option value="">Sin especialidad</option>
                    {especialidades.map((especialidad: any) => <option key={especialidad.id} value={especialidad.id}>{especialidad.categoria ? `${especialidad.categoria} · ` : ""}{especialidad.nombre}</option>)}
                  </select>
                  <button type="button" disabled={guardandoEspecialidad || (especialidadSeleccionada || "") === (trabajo.especialidad_id || "")} onClick={() => void guardarEspecialidad()} className="rounded-xl bg-ink px-4 py-2.5 text-xs font-semibold text-ink-foreground disabled:opacity-50">
                    {guardandoEspecialidad ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface-sunken p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Prioridad</p><p className="mt-1 font-semibold">{trabajo.prioridad}</p></div>
            <div className="rounded-xl border border-border bg-surface-sunken p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ubicación</p><p className="mt-1 font-semibold">{trabajo.ubicacion || "Por definir"}</p></div>
            <div className="rounded-xl border border-border bg-surface-sunken p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fecha planificada</p><p className="mt-1 font-semibold">{trabajo.fecha_planificada || "Sin fecha"}</p></div>
          </div>
        </section>

        <section className="rounded-2xl border border-gold/25 bg-card p-5 shadow-raised">
          <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-deep">Tiempo de producción</p><h2 className="mt-1 text-lg font-semibold">{Math.floor(segundosTotales / 3600)}h {Math.floor((segundosTotales % 3600) / 60)}m</h2></div><span className={sesionActiva ? "rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-semibold text-success" : "rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground"}>{sesionActiva ? "Reloj activo" : "Pausado"}</span></div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full w-1/3 rounded-full bg-gold" /></div>
          <p className="mt-3 text-xs text-muted-foreground">{sesionesTiempo.length} sesión{sesionesTiempo.length === 1 ? "" : "es"} registrada{sesionesTiempo.length === 1 ? "" : "s"}. El tiempo queda asociado al operario.</p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-raised">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em]">Instrucciones</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{trabajo.descripcion || "No hay instrucciones adicionales registradas."}</p>
          {trabajo.notas ? <div className="mt-4 rounded-xl border border-border bg-surface-sunken p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notas</p><p className="mt-2 whitespace-pre-wrap text-sm">{trabajo.notas}</p></div> : null}
        </section>

        {activo && puedeGestionar ? (
          <section className="rounded-2xl border border-border bg-card p-5 shadow-raised">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em]">Acciones</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {trabajo.estado === "en_proceso" && !sesionActiva ? <button type="button" onClick={() => void iniciarReloj()} className="rounded-lg border border-gold/30 bg-gold/10 px-4 py-2.5 text-xs font-semibold text-gold-deep">▶ Iniciar reloj</button> : null}
              {sesionActiva ? <button type="button" onClick={() => void detenerReloj()} className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5 text-xs font-semibold text-warning">⏸ Pausar reloj</button> : null}
              {trabajo.estado === "pendiente" ? <button type="button" disabled={cambiarEstado.isPending} onClick={() => cambiarEstado.mutate("en_proceso")} className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-xs font-semibold text-ink-foreground disabled:opacity-50"><Play className="size-4" /> Iniciar trabajo</button> : null}
              {trabajo.estado === "en_proceso" ? <button type="button" disabled={cambiarEstado.isPending} onClick={() => cambiarEstado.mutate("completado")} className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2.5 text-xs font-semibold text-success-foreground disabled:opacity-50"><Check className="size-4" /> Completar trabajo</button> : null}
              {trabajo.estado !== "bloqueado" ? <button type="button" disabled={cambiarEstado.isPending} onClick={() => cambiarEstado.mutate("bloqueado")} className="inline-flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5 text-xs font-semibold text-warning disabled:opacity-50"><CircleAlert className="size-4" /> Bloquear</button> : null}
              {trabajo.estado === "bloqueado" ? <button type="button" disabled={cambiarEstado.isPending} onClick={() => cambiarEstado.mutate("en_proceso")} className="rounded-lg bg-ink px-4 py-2.5 text-xs font-semibold text-ink-foreground disabled:opacity-50">Reanudar</button> : null}
            </div>
            {errorAccion ? <p className="mt-3 text-xs text-danger">{errorAccion}</p> : null}
          </section>
        ) : null}

        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Material de trabajo</p>
              <h2 className="mt-1 text-lg font-semibold">Archivos técnicos</h2>
            </div>
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold">{archivosTecnicos.length}</span>
          </div>
          <div className="mt-4 space-y-2">
            {archivosPedido.map((archivo) => (
              <a key={archivo.id} href={archivo.url} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-2xl border border-border bg-background p-3 transition hover:border-primary/40 hover:bg-primary/[0.03]">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary"><Link2 className="size-4" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium group-hover:text-primary">{archivo.nombre}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">{archivo.tipo} · {archivo.grupo || "Técnico"}</span></span>
                <ArrowLeft className="size-3.5 rotate-180 text-muted-foreground" />
              </a>
            ))}
            {archivosPedido.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">Todavía no hay archivos técnicos en el pedido.</p> : null}
          </div>
          {archivosTecnicos.length > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {archivosTecnicos.length} archivo{archivosTecnicos.length === 1 ? "" : "s"} vinculado{archivosTecnicos.length === 1 ? "" : "s"} específicamente a este trabajo.
            </p>
          ) : null}
          {(sesion?.esAdmin || esResponsable) && archivosPedido.length > 0 ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <select value={archivoSeleccionado} onChange={(e) => setArchivoSeleccionado(e.target.value)} className="min-h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm">
                <option value="">Vincular archivo a este trabajo…</option>
                {archivosPedido.filter((archivo) => !archivosTecnicos.some((vinculado) => vinculado.pedido_archivo_id === archivo.id)).map((archivo) => <option key={archivo.id} value={archivo.id}>{archivo.nombre}</option>)}
              </select>
              <button type="button" disabled={!archivoSeleccionado || guardandoArchivo} onClick={() => void adjuntarArchivo()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-xs font-semibold text-ink-foreground disabled:opacity-50"><Paperclip className="size-3.5" /> Vincular</button>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Seguimiento</p>
              <h2 className="mt-1 text-lg font-semibold">Incidencias</h2>
            </div>
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold">{incidencias.length}</span>
          </div>
          <div className="mt-4 space-y-3">
            {incidencias.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-sm font-semibold">{item.tipo}</p><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{item.descripcion}</p></div>
                  <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold uppercase">{item.estado}</span>
                </div>
                {item.resolucion ? <p className="mt-3 rounded-xl bg-success-soft p-3 text-xs text-success">Resolución: {item.resolucion}</p> : null}
                {sesion?.esAdmin && item.estado !== "resuelta" && item.estado !== "descartada" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void cambiarIncidencia(item.id, "resuelta")} className="rounded-lg bg-success px-3 py-2 text-xs font-semibold text-success-foreground">Marcar resuelta</button>
                    <button type="button" onClick={() => void cambiarIncidencia(item.id, "descartada")} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">Descartar</button>
                  </div>
                ) : null}
              </div>
            ))}
            {incidencias.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">No hay incidencias registradas.</p> : null}
          </div>
          {activo ? (
            <div className="mt-4 rounded-2xl border border-warning/20 bg-warning-soft/40 p-4">
              <p className="text-xs font-semibold">¿Hay algo que impida continuar?</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
                <select value={incidencia.tipo} onChange={(e) => setIncidencia((v) => ({ ...v, tipo: e.target.value }))} className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm">
                  <option value="general">General</option><option value="material">Material</option><option value="diseño">Diseño</option><option value="máquina">Máquina</option><option value="cliente">Cliente</option>
                </select>
                <input value={incidencia.descripcion} onChange={(e) => setIncidencia((v) => ({ ...v, descripcion: e.target.value }))} placeholder="Describe brevemente el problema…" className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm" />
                <button type="button" disabled={!incidencia.descripcion.trim() || reportandoIncidencia} onClick={() => void reportarIncidencia()} className="rounded-xl bg-warning px-4 py-2.5 text-xs font-semibold text-warning-foreground disabled:opacity-50">{reportandoIncidencia ? "Enviando…" : "Reportar"}</button>
              </div>
            </div>
          ) : null}
        </section>

                <p className="text-xs text-muted-foreground">El acceso a este trabajo está limitado por las reglas de seguridad de producción.</p>
      </div>
    </AppShell>
  );
}