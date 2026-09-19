import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, CircleAlert, Play } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/lib/auth";

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
      subtitulo={`${trabajo.area} · Pedido ${trabajo.pedido_id.slice(0, 8)}…`}
      ocultarNavegacion
      encabezadoMovilCompacto
      atrasMovil={{ to: "/operario" }}
    >
      <div className="mx-auto max-w-3xl space-y-5">
        <button type="button" onClick={() => void navigate({ to: "/operario" })} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Mi trabajo
        </button>

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

        <p className="text-xs text-muted-foreground">El acceso a este trabajo está limitado por las reglas de seguridad de producción.</p>
      </div>
    </AppShell>
  );
}
