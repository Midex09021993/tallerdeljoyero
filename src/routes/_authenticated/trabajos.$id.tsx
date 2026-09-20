import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, CircleAlert, FileText, Link2, Play, Paperclip } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/lib/auth";

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
        .select("id, pedido_id, area, ubicacion, titulo, descripcion, estado, prioridad, tipo, fecha_planificada, fecha_inicio, fecha_fin, notas, responsable_user_id")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Este trabajo no existe o no está asignado a tu usuario.");
      return data as Trabajo;
    },
  });

  const { data: pedidoTrabajo } = useQuery({
    queryKey: ["pedido-trabajo", trabajo?.pedido_id],
    enabled: Boolean(trabajo?.pedido_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("id, referencia, cliente, trabajo, material, talla, piedras, peso_estimado, cantidad_piezas, fecha_entrega")
        .eq("id", trabajo!.pedido_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: archivosPedido = [] } = useQuery({
    queryKey: ["archivos-pedido-trabajo", trabajo?.pedido_id],
    enabled: Boolean(trabajo?.pedido_id && (sesion?.esAdmin || trabajo?.responsable_user_id === sesion?.user.id)),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedido_archivos")
        .select("id, nombre, tipo, url, es_enlace, grupo")
        .eq("pedido_id", trabajo!.pedido_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; nombre: string; tipo: string; url: string; es_enlace: boolean; grupo: string }>;
    },
  });

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
  const puedeGestionar = Boolean(sesion?.esAdmin || esResponsable);
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
                {pedidoTrabajo?.cliente ? ` · ${pedidoTrabajo.cliente}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void navigate({ to: "/pedidos/$id", params: { id: trabajo.pedido_id }, search: {} })}
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold hover:border-primary/40 hover:text-primary"
            >
              Ver pedido
            </button>
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

        <section className="rounded-2xl border border-gold/25 bg-card p-5 shadow-raised">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Trabajo asignado</p>
              <h1 className="mt-1 text-2xl font-semibold">{trabajo.titulo}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{trabajo.area} · {trabajo.tipo === "externo" ? "Externo" : "Interno"}</p>
            </div>
            <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold">{estadoLabel[trabajo.estado]}</span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface-sunken p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Prioridad</p><p className="mt-1 font-semibold">{trabajo.prioridad}</p></div>
            <div className="rounded-xl border border-border bg-surface-sunken p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ubicación</p><p className="mt-1 font-semibold">{trabajo.ubicacion || "Por definir"}</p></div>
            <div className="rounded-xl border border-border bg-surface-sunken p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fecha planificada</p><p className="mt-1 font-semibold">{trabajo.fecha_planificada || "Sin fecha"}</p></div>
          </div>
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