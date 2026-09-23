import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, CircleAlert, ChevronDown, FileText, Link2, Play, Paperclip } from "lucide-react";
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
      // Usamos la misma bandeja segura que alimenta /operario.
      // Esto evita que una operación disponible para el área quede oculta
      // por una política RLS que solo permita leer directamente trabajos asignados.
      const { data, error } = await supabase.rpc("listar_trabajos_operario");
      if (error) throw error;
      const encontrado = (data ?? []).find((item: Trabajo) => item.id === id);
      if (!encontrado) throw new Error("Este trabajo no existe, ya no está activo o no está disponible para tu área.");
      return encontrado as Trabajo;
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
        .select("id, referencia, pieza, trabajo, material, talla, piedras, peso_estimado, cantidad_piezas, fecha_ingreso, fecha_entrega, origen, area_actual, area_desde, notas, ruta, corte_texto, corte_tipografia, corte_ubicacion, corte_observaciones, sede_id, sedes(nombre)")
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
  const sedeNombre = (pedidoTrabajo?.sedes as { nombre?: string } | null)?.nombre ?? "";
  const nombrePieza = pedidoTrabajo?.pieza || pedidoTrabajo?.trabajo || trabajo.titulo || "—";

  return (
    <AppShell
      titulo={trabajo.titulo}
      subtitulo={`${trabajo.area} · Pedido ${pedidoTrabajo?.referencia ?? trabajo.pedido_id.slice(0, 8) + "…"}`}
      ocultarNavegacion
      encabezadoMovilCompacto
      atrasMovil={{ to: "/operario" }}
    >
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => void navigate({ to: "/operario" })} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Mi trabajo
          </button>
          <span className="rounded-full border border-gold/20 bg-gold/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase text-gold-deep">{trabajo.area}</span>
        </div>

        <section className="rounded-3xl border-2 border-gold/30 bg-gradient-to-br from-card to-gold/[0.05] p-5 shadow-raised">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-deep">Ficha técnica de fabricación</p>
          <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><h1 className="text-2xl font-semibold">{nombrePieza}</h1><p className="mt-1 text-sm text-muted-foreground">{pedidoTrabajo?.referencia ?? "Pedido"} · {trabajo.area}</p></div>
            <span className="rounded-full border border-border bg-surface-muted px-3 py-1.5 text-xs font-bold">{estadoLabel[trabajo.estado]}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {puedeTomar ? <button type="button" onClick={() => void tomarTrabajo()} className="rounded-xl bg-gold px-4 py-2.5 text-xs font-bold text-gold-foreground">Tomar este trabajo</button> : null}
            {trabajo.estado === "pendiente" && puedeGestionar ? <button type="button" disabled={cambiarEstado.isPending} onClick={() => cambiarEstado.mutate("en_proceso")} className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-xs font-semibold text-ink-foreground disabled:opacity-50"><Play className="size-4" /> Iniciar trabajo</button> : null}
          </div>
        </section>

        <details open className="group overflow-hidden rounded-2xl border border-border bg-card shadow-raised">
          <summary className="flex cursor-pointer list-none items-center justify-between bg-surface-sunken px-5 py-4 [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-gold/10 text-xs font-bold text-gold-deep">1</span><span className="text-sm font-bold">Identificación completa</span></span><ChevronDown className="size-5 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
          <div className="border-t border-border p-5"><dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              ["Trabajo / pieza", nombrePieza], ["Referencia", pedidoTrabajo?.referencia || "—"], ["Área actual", pedidoTrabajo?.area_actual || trabajo.area],
              ["Sede / taller", sedeNombre || "—"], ["Origen", pedidoTrabajo?.origen || "—"], ["Cantidad", String(pedidoTrabajo?.cantidad_piezas ?? "—")],
              ["Fecha de ingreso", pedidoTrabajo?.fecha_ingreso || "—"], ["Área desde", pedidoTrabajo?.area_desde || "—"], ["Fecha de entrega", pedidoTrabajo?.fecha_entrega || "—"], ["Prioridad", trabajo.prioridad],
              ["Ubicación", trabajo.ubicacion || "Por definir"], ["Fecha planificada", trabajo.fecha_planificada || "Sin fecha"], ["Tipo de trabajo", trabajo.tipo === "externo" ? "Externo" : "Interno"],
            ].map(([etiqueta, valor]) => <div key={etiqueta} className="rounded-xl border border-border bg-surface-sunken p-3"><dt className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{etiqueta}</dt><dd className="mt-1 text-sm font-semibold">{valor}</dd></div>)}
          </dl></div>
        </details>

        <details open className="group overflow-hidden rounded-2xl border border-border bg-card shadow-raised">
          <summary className="flex cursor-pointer list-none items-center justify-between bg-surface-sunken px-5 py-4 [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-gold/10 text-xs font-bold text-gold-deep">2</span><span className="text-sm font-bold">Especificaciones de la pieza</span></span><ChevronDown className="size-5 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
          <div className="border-t border-border p-5">
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ["Trabajo", pedidoTrabajo?.trabajo || "—"], ["Pieza", pedidoTrabajo?.pieza || "—"], ["Material / metal", pedidoTrabajo?.material || "—"],
                ["Talla", pedidoTrabajo?.talla || "—"], ["Piedras", pedidoTrabajo?.piedras || "—"], ["Peso estimado", pedidoTrabajo?.peso_estimado || "—"], ["Cantidad de piezas", String(pedidoTrabajo?.cantidad_piezas ?? "—")],
              ].map(([etiqueta, valor]) => <div key={etiqueta} className="rounded-xl border border-border bg-background p-4"><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{etiqueta}</p><p className="mt-1 text-sm font-semibold">{valor}</p></div>)}
            </div>
            {pedidoTrabajo?.notas ? <div className="mt-3 rounded-2xl border border-border bg-background p-4"><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Notas y especificaciones del pedido</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{pedidoTrabajo.notas}</p></div> : null}
          </div>
        </details>

        <details open className="group overflow-hidden rounded-2xl border border-border bg-card shadow-raised">
          <summary className="flex cursor-pointer list-none items-center justify-between bg-surface-sunken px-5 py-4 [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-gold/10 text-xs font-bold text-gold-deep">3</span><span className="text-sm font-bold">Instrucciones de fabricación</span></span><ChevronDown className="size-5 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
          <div className="border-t border-border p-5">
            <div className="rounded-2xl border border-gold/20 bg-gold/[0.03] p-4"><p className="whitespace-pre-wrap text-sm leading-6">{trabajo.descripcion || "No hay instrucciones adicionales registradas."}</p></div>
            {trabajo.notas ? <div className="mt-3 rounded-2xl border border-border bg-background p-4"><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Notas de la operación</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{trabajo.notas}</p></div> : null}
          </div>
        </details>

        <details className="group overflow-hidden rounded-2xl border border-success/20 bg-card shadow-raised">
          <summary className="flex cursor-pointer list-none items-center justify-between bg-success/[0.04] px-5 py-4 [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-success/10 text-xs font-bold text-success">4</span><span className="text-sm font-bold">Diseño y archivos <span className="ml-1 text-xs text-muted-foreground">({archivosPedido.length})</span></span></span><ChevronDown className="size-5 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
          <div className="border-t border-success/20 p-5">
            <div className="rounded-2xl border border-success/20 bg-success/[0.03] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-wider text-success">Archivo vigente para fabricación</p><p className="mt-1 text-sm font-semibold">Diseño aprobado</p></div><span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-bold text-success">{archivosVigentes.length > 0 ? "APROBADO" : "PENDIENTE"}</span></div>
              {archivosVigentes.length > 0 ? <div className="mt-3 space-y-2">{archivosVigentes.map((archivo) => <a key={archivo.id} href={archivo.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-success/20 bg-background p-3"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{archivo.nombre}</span><span className="mt-1 block text-[10px] text-muted-foreground">Versión {archivo.version} · {archivo.grupo || "Técnico"}</span></span><span className="shrink-0 text-xs font-semibold text-success">Abrir</span></a>)}</div> : <p className="mt-3 text-sm text-muted-foreground">Aún no hay un archivo aprobado para fabricación.</p>}
            </div>
            <div className="mt-4 space-y-2">{archivosPedido.map((archivo) => <a key={archivo.id} href={archivo.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary"><Link2 className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{archivo.nombre}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">{archivo.tipo} · {archivo.grupo || "Técnico"} · v{archivo.version}</span></span><span className="text-xs font-semibold text-muted-foreground">Abrir</span></a>)}{archivosPedido.length === 0 ? <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">Todavía no hay archivos técnicos en el pedido.</p> : null}</div>
          </div>
        </details>

        <details className="group overflow-hidden rounded-2xl border border-border bg-card shadow-raised">
          <summary className="flex cursor-pointer list-none items-center justify-between bg-surface-sunken px-5 py-4 [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-gold/10 text-xs font-bold text-gold-deep">5</span><span className="text-sm font-bold">Ruta de producción</span></span><ChevronDown className="size-5 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
          <div className="border-t border-border p-5">{Array.isArray(pedidoTrabajo?.ruta) && pedidoTrabajo.ruta.length > 0 ? <div className="flex flex-wrap gap-2">{pedidoTrabajo.ruta.map((area) => <span key={area} className={area === trabajo.area ? "rounded-full bg-gold px-3 py-1.5 text-[10px] font-bold text-gold-foreground" : "rounded-full bg-surface-muted px-3 py-1.5 text-[10px] font-semibold text-muted-foreground"}>{area === trabajo.area ? "→ " + area + " · AQUÍ" : area}</span>)}</div> : <p className="text-sm text-muted-foreground">No hay una ruta de producción registrada.</p>}</div>
        </details>

        <details className="group overflow-hidden rounded-2xl border border-border bg-card shadow-raised">
          <summary className="flex cursor-pointer list-none items-center justify-between bg-surface-sunken px-5 py-4 [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-gold/10 text-xs font-bold text-gold-deep">6</span><span className="text-sm font-bold">Materiales previstos <span className="ml-1 text-xs text-muted-foreground">({materialesPlanificados.length})</span></span></span><ChevronDown className="size-5 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
          <div className="border-t border-border p-5">{materialesPlanificados.length > 0 ? <div className="space-y-2">{materialesPlanificados.map((item) => <div key={item.id} className="rounded-xl border border-border bg-background p-3"><p className="text-sm font-semibold">{item.inventario?.material || "Material"}</p><p className="mt-1 text-xs text-muted-foreground">{item.cantidad_planificada} {item.unidad || item.inventario?.unidad || ""}{item.inventario?.codigo ? " · " + item.inventario.codigo : ""}</p>{item.notas ? <p className="mt-1 text-xs text-muted-foreground">{item.notas}</p> : null}</div>)}</div> : <p className="text-sm text-muted-foreground">No hay materiales planificados para este pedido.</p>}</div>
        </details>

        <details className="group overflow-hidden rounded-2xl border border-border bg-card shadow-raised">
          <summary className="flex cursor-pointer list-none items-center justify-between bg-surface-sunken px-5 py-4 [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-gold/10 text-xs font-bold text-gold-deep">7</span><span className="text-sm font-bold">Planificación</span></span><ChevronDown className="size-5 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
          <div className="border-t border-border p-5"><dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">{[
            ["Entrega", pedidoTrabajo?.fecha_entrega || "—"], ["Ingreso", pedidoTrabajo?.fecha_ingreso || "—"], ["Fecha planificada", trabajo.fecha_planificada || "—"],
            ["Inicio real", trabajo.fecha_inicio ? new Date(trabajo.fecha_inicio).toLocaleString() : "—"], ["Fin real", trabajo.fecha_fin ? new Date(trabajo.fecha_fin).toLocaleString() : "—"], ["Prioridad", trabajo.prioridad],
          ].map(([etiqueta, valor]) => <div key={etiqueta} className="rounded-xl border border-border bg-surface-sunken p-3"><dt className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{etiqueta}</dt><dd className="mt-1 text-sm font-semibold">{valor}</dd></div>)}</dl></div>
        </details>

        {trabajo.area === "Corte Láser" && (pedidoTrabajo?.corte_texto || pedidoTrabajo?.corte_tipografia || pedidoTrabajo?.corte_ubicacion || pedidoTrabajo?.corte_observaciones) ? <details open className="group overflow-hidden rounded-2xl border border-border bg-card shadow-raised">
          <summary className="flex cursor-pointer list-none items-center justify-between bg-surface-sunken px-5 py-4 [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-gold/10 text-xs font-bold text-gold-deep">8</span><span className="text-sm font-bold">Especificaciones especiales · Corte Láser</span></span><ChevronDown className="size-5 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
          <div className="border-t border-border p-5 grid gap-2 sm:grid-cols-2 text-sm"><p><span className="font-semibold">Texto:</span> {pedidoTrabajo.corte_texto || "—"}</p><p><span className="font-semibold">Tipografía:</span> {pedidoTrabajo.corte_tipografia || "—"}</p><p><span className="font-semibold">Ubicación:</span> {pedidoTrabajo.corte_ubicacion || "—"}</p><p className="sm:col-span-2"><span className="font-semibold">Observaciones:</span> {pedidoTrabajo.corte_observaciones || "—"}</p></div>
        </details> : null}

        <details className="group overflow-hidden rounded-2xl border border-gold/25 bg-card shadow-raised">
          <summary className="flex cursor-pointer list-none items-center justify-between bg-surface-sunken px-5 py-4 [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-gold/10 text-xs font-bold text-gold-deep">9</span><span className="text-sm font-bold">Tiempo de producción</span></span><ChevronDown className="size-5 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
          <div className="border-t border-border p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tiempo acumulado</p><h2 className="mt-1 text-xl font-semibold">{Math.floor(segundosTotales / 3600)}h {Math.floor((segundosTotales % 3600) / 60)}m</h2></div><span className={sesionActiva ? "rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-semibold text-success" : "rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground"}>{sesionActiva ? "Reloj activo" : "Pausado"}</span></div>{puedeGestionar ? <div className="mt-4 flex flex-wrap gap-2">{trabajo.estado === "en_proceso" && !sesionActiva ? <button type="button" onClick={() => void iniciarReloj()} className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-2.5 text-xs font-semibold text-gold-deep">▶ Iniciar reloj</button> : null}{sesionActiva ? <button type="button" onClick={() => void detenerReloj()} className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-xs font-semibold text-warning">⏸ Pausar reloj</button> : null}</div> : null}</div>
        </details>

        <details className="group overflow-hidden rounded-2xl border border-border bg-card shadow-raised">
          <summary className="flex cursor-pointer list-none items-center justify-between bg-surface-sunken px-5 py-4 [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-gold/10 text-xs font-bold text-gold-deep">10</span><span className="text-sm font-bold">Incidencias</span></span><ChevronDown className="size-5 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
          <div className="border-t border-border p-5"><div className="space-y-3">{incidencias.map((item) => <div key={item.id} className="rounded-xl border border-border bg-background p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold">{item.tipo}</p><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{item.descripcion}</p></div><span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold uppercase">{item.estado}</span></div>{item.resolucion ? <p className="mt-3 rounded-xl bg-success-soft p-3 text-xs text-success">Resolución: {item.resolucion}</p> : null}</div>)}{incidencias.length === 0 ? <p className="text-sm text-muted-foreground">No hay incidencias registradas.</p> : null}</div>
            {activo ? <div className="mt-4 rounded-2xl border border-warning/20 bg-warning-soft/40 p-4"><p className="text-xs font-semibold">¿Hay algo que impida continuar?</p><div className="mt-3 grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_auto]"><select value={incidencia.tipo} onChange={(e) => setIncidencia((v) => ({ ...v, tipo: e.target.value }))} className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm"><option value="general">General</option><option value="material">Material</option><option value="diseño">Diseño</option><option value="máquina">Máquina</option><option value="cliente">Cliente</option></select><input value={incidencia.descripcion} onChange={(e) => setIncidencia((v) => ({ ...v, descripcion: e.target.value }))} placeholder="Describe brevemente el problema…" className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm" /><button type="button" disabled={!incidencia.descripcion.trim() || reportandoIncidencia} onClick={() => void reportarIncidencia()} className="rounded-xl bg-warning px-4 py-2.5 text-xs font-semibold text-warning-foreground disabled:opacity-50">{reportandoIncidencia ? "Enviando…" : "Reportar"}</button></div></div> : null}
          </div>
        </details>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-raised">
          <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Acciones</p><h2 className="mt-1 text-lg font-semibold">Ejecutar trabajo</h2></div><span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold">{estadoLabel[trabajo.estado]}</span></div>
          {activo && puedeGestionar ? <div className="mt-4 flex flex-wrap gap-2">
            {trabajo.estado === "pendiente" ? <button type="button" disabled={cambiarEstado.isPending} onClick={() => cambiarEstado.mutate("en_proceso")} className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-3 text-xs font-semibold text-ink-foreground disabled:opacity-50"><Play className="size-4" /> Iniciar trabajo</button> : null}
            {trabajo.estado === "en_proceso" ? <button type="button" disabled={cambiarEstado.isPending} onClick={() => cambiarEstado.mutate("completado")} className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-3 text-xs font-semibold text-success-foreground disabled:opacity-50"><Check className="size-4" /> Completar trabajo</button> : null}
            {trabajo.estado !== "bloqueado" ? <button type="button" disabled={cambiarEstado.isPending} onClick={() => cambiarEstado.mutate("bloqueado")} className="inline-flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs font-semibold text-warning disabled:opacity-50"><CircleAlert className="size-4" /> Bloquear</button> : null}
            {trabajo.estado === "bloqueado" ? <button type="button" disabled={cambiarEstado.isPending} onClick={() => cambiarEstado.mutate("en_proceso")} className="rounded-xl bg-ink px-4 py-3 text-xs font-semibold text-ink-foreground disabled:opacity-50">Reanudar</button> : null}
          </div> : null}
          {errorAccion ? <p className="mt-3 text-xs text-danger">{errorAccion}</p> : null}
        </section>

        <p className="text-xs text-muted-foreground">El acceso a este trabajo está limitado por las reglas de seguridad de producción.</p>
      </div>
    </AppShell>
  );
}