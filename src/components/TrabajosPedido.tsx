import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AREAS } from "@/lib/auth";

type Trabajo = {
  id: string;
  area: string;
  ubicacion: string;
  titulo: string;
  descripcion: string;
  estado: "pendiente" | "en_proceso" | "bloqueado" | "completado" | "cancelado";
  prioridad: "baja" | "normal" | "alta" | "urgente";
  tipo: "interno" | "externo";
  fecha_planificada: string | null;
  responsable_user_id: string | null;
  participante_id: string | null;
  created_at: string;
};

const ESTADOS: Trabajo["estado"][] = [
  "pendiente",
  "en_proceso",
  "bloqueado",
  "completado",
  "cancelado",
];

const estadoLabel: Record<Trabajo["estado"], string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  bloqueado: "Bloqueado",
  completado: "Completado",
  cancelado: "Cancelado",
};

const estadoClase: Record<Trabajo["estado"], string> = {
  pendiente: "border-border bg-surface-muted text-muted-foreground",
  en_proceso: "border-info/30 bg-info/10 text-info",
  bloqueado: "border-warning/30 bg-warning/10 text-warning",
  completado: "border-success/30 bg-success/10 text-success",
  cancelado: "border-danger/30 bg-danger/10 text-danger",
};

const prioridadLabel: Record<Trabajo["prioridad"], string> = {
  baja: "Baja",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

export function TrabajosPedido({
  pedidoId,
  proyectoJoyaId,
  sedeId,
  canManage,
}: {
  pedidoId: string;
  proyectoJoyaId?: string | null;
  sedeId?: string | null;
  canManage: boolean;
}) {
  const qc = useQueryClient();
  const [nuevo, setNuevo] = useState({
    area: "Diseño 3D",
    titulo: "",
    descripcion: "",
    tipo: "interno" as "interno" | "externo",
    prioridad: "normal" as Trabajo["prioridad"],
    fecha_planificada: "",
  });

  const { data: trabajos = [], isLoading } = useQuery({
    queryKey: ["trabajos-pedido", pedidoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trabajos")
        .select("id, area, ubicacion, titulo, descripcion, estado, prioridad, tipo, fecha_planificada, responsable_user_id, participante_id, created_at")
        .eq("pedido_id", pedidoId)
        .order("secuencia", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Trabajo[];
    },
  });

  const crear = useMutation({
    mutationFn: async () => {
      if (!nuevo.titulo.trim()) throw new Error("Escribe el nombre del trabajo.");
      const { data: max } = await supabase
        .from("trabajos")
        .select("secuencia")
        .eq("pedido_id", pedidoId)
        .order("secuencia", { ascending: false })
        .limit(1);
      const secuencia = Number(max?.[0]?.secuencia ?? 0) + 1;
      const { error } = await supabase.from("trabajos").insert({
        pedido_id: pedidoId,
        proyecto_joya_id: proyectoJoyaId ?? null,
        sede_id: sedeId ?? null,
        secuencia,
        tipo: nuevo.tipo,
        area: nuevo.area,
        titulo: nuevo.titulo.trim(),
        descripcion: nuevo.descripcion.trim(),
        prioridad: nuevo.prioridad,
        fecha_planificada: nuevo.fecha_planificada || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNuevo({
        area: "Diseño 3D",
        titulo: "",
        descripcion: "",
        tipo: "interno",
        prioridad: "normal",
        fecha_planificada: "",
      });
      qc.invalidateQueries({ queryKey: ["trabajos-pedido", pedidoId] });
    },
  });

  const cambiarEstado = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: Trabajo["estado"] }) => {
      const patch: Record<string, unknown> = { estado };
      if (estado === "en_proceso") patch.fecha_inicio = new Date().toISOString();
      if (estado === "completado" || estado === "cancelado") patch.fecha_fin = new Date().toISOString();
      const { error } = await supabase.from("trabajos").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trabajos-pedido", pedidoId] }),
  });

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gold/20 bg-surface-sunken p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Flujo de producción
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cada trabajo representa una etapa, responsable y ubicación independientes.
            </p>
          </div>
          <span className="rounded-full border border-border bg-card px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {trabajos.length} {trabajos.length === 1 ? "trabajo" : "trabajos"}
          </span>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando trabajos…</p>
        ) : trabajos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-5 text-center">
            <p className="text-sm font-medium text-foreground">Este pedido todavía no tiene trabajos.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Puedes crear la primera etapa de producción sin modificar el flujo antiguo del pedido.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {trabajos.map((trabajo) => (
              <div key={trabajo.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {trabajo.area}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${estadoClase[trabajo.estado]}`}>
                        {estadoLabel[trabajo.estado]}
                      </span>
                      {trabajo.tipo === "externo" ? (
                        <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold-deep">
                          Externo
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-1 text-sm font-semibold text-foreground">{trabajo.titulo}</h3>
                    {trabajo.descripcion ? (
                      <p className="mt-1 text-xs text-muted-foreground">{trabajo.descripcion}</p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Prioridad</p>
                    <p className="mt-1 text-xs font-semibold text-foreground">{prioridadLabel[trabajo.prioridad]}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
                  <span>📍 {trabajo.ubicacion || "Sin ubicación"}</span>
                  <span>📅 {trabajo.fecha_planificada || "Sin fecha"}</span>
                  {trabajo.participante_id ? <span>◇ Colaborador externo asignado</span> : null}
                </div>
                {canManage ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select
                      value={trabajo.estado}
                      onChange={(e) =>
                        cambiarEstado.mutate({
                          id: trabajo.id,
                          estado: e.target.value as Trabajo["estado"],
                        })
                      }
                      disabled={cambiarEstado.isPending}
                      className="rounded-lg border border-border bg-surface-muted px-3 py-1.5 text-xs"
                    >
                      {ESTADOS.map((estado) => (
                        <option key={estado} value={estado}>{estadoLabel[estado]}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {canManage ? (
        <form
          className="rounded-xl border border-border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            crear.mutate();
          }}
        >
          <div className="mb-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">Nuevo trabajo</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              La asignación a un colaborador externo la conectaremos en el siguiente paso.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={nuevo.area}
              onChange={(e) => setNuevo((v) => ({ ...v, area: e.target.value }))}
              className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm"
            >
              {AREAS.filter((area) => area !== "Pedidos" && area !== "Área ventas").map((area) => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
            <input
              value={nuevo.titulo}
              onChange={(e) => setNuevo((v) => ({ ...v, titulo: e.target.value }))}
              placeholder="Ej. Modelar anillo en 3D"
              className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm"
            />
            <select
              value={nuevo.tipo}
              onChange={(e) => setNuevo((v) => ({ ...v, tipo: e.target.value as "interno" | "externo" }))}
              className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm"
            >
              <option value="interno">Trabajo interno</option>
              <option value="externo">Trabajo externo</option>
            </select>
            <select
              value={nuevo.prioridad}
              onChange={(e) => setNuevo((v) => ({ ...v, prioridad: e.target.value as Trabajo["prioridad"] }))}
              className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm"
            >
              <option value="baja">Prioridad baja</option>
              <option value="normal">Prioridad normal</option>
              <option value="alta">Prioridad alta</option>
              <option value="urgente">Urgente</option>
            </select>
            <input
              type="date"
              value={nuevo.fecha_planificada}
              onChange={(e) => setNuevo((v) => ({ ...v, fecha_planificada: e.target.value }))}
              className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm"
            />
            <input
              value={nuevo.descripcion}
              onChange={(e) => setNuevo((v) => ({ ...v, descripcion: e.target.value }))}
              placeholder="Indicaciones (opcional)"
              className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm"
            />
          </div>
          {crear.isError ? (
            <p className="mt-3 text-xs text-danger">{crear.error instanceof Error ? crear.error.message : "No se pudo crear el trabajo."}</p>
          ) : null}
          <button
            type="submit"
            disabled={crear.isPending || !nuevo.titulo.trim()}
            className="mt-3 rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-ink-foreground disabled:opacity-50"
          >
            {crear.isPending ? "Creando…" : "＋ Crear trabajo"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
