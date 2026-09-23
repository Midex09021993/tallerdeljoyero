import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Panel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Especialidad = { id: string; nombre: string; categoria: string | null; activa: boolean };
type Relacion = { sede_id: string; especialidad_id: string };

export function CapacidadesSedeAdmin({ sedeId, sedeNombre }: { sedeId: string | null; sedeNombre?: string }) {
  const qc = useQueryClient();
  const CAPACIDADES_PRODUCCION = [
  "Diseño 3D",
  "Impresión 3D",
  "Casting",
  "Corte Láser",
  "Taller",
] as const;

  const [seleccionadas, setSeleccionadas] = useState<string[] | null>(null);
  const [guardando, setGuardando] = useState(false);

  const { data: especialidades = [], isLoading: loadingEspecialidades } = useQuery({
    queryKey: ["capacidades-catalogo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("especialidades").select("id,nombre,categoria,activa").eq("activa", true).order("categoria").order("nombre");
      if (error) throw error;
      return (data ?? []) as Especialidad[];
    },
    enabled: Boolean(sedeId),
  });

  const { data: actuales = [], isLoading: loadingActuales } = useQuery({
    queryKey: ["sede-especialidades", sedeId],
    queryFn: async () => {
      const { data, error } = await supabase.from("sede_especialidades").select("sede_id,especialidad_id").eq("sede_id", sedeId!);
      if (error) throw error;
      return (data ?? []) as Relacion[];
    },
    enabled: Boolean(sedeId),
  });

  const ids = seleccionadas ?? actuales.map(r => r.especialidad_id);
  const porCategoria = useMemo(() => {
    const ordenProduccion = new Map(CAPACIDADES_PRODUCCION.map((nombre, indice) => [nombre, indice]));
    const produccion = especialidades
      .filter((e) => ordenProduccion.has(e.nombre))
      .sort((a, b) => (ordenProduccion.get(a.nombre) ?? 99) - (ordenProduccion.get(b.nombre) ?? 99));
    const servicios = especialidades
      .filter((e) => !ordenProduccion.has(e.nombre))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    return [
      ...(produccion.length ? [["Producción", produccion] as [string, Especialidad[]]] : []),
      ...(servicios.length ? [["Servicios especializados", servicios] as [string, Especialidad[]]] : []),
    ];
  }, [especialidades]);

  async function guardar() {
    if (!sedeId) return;
    setGuardando(true);
    try {
      const del = await supabase.from("sede_especialidades").delete().eq("sede_id", sedeId);
      if (del.error) throw del.error;
      if (ids.length) {
        const { error } = await supabase.from("sede_especialidades").insert(ids.map(especialidad_id => ({ sede_id: sedeId, especialidad_id })));
        if (error) throw error;
      }
      toast.success("Capacidades del taller actualizadas");
      await qc.invalidateQueries({ queryKey: ["sede-especialidades", sedeId] });
      await qc.invalidateQueries({ queryKey: ["menu-capacidades"] });
      setSeleccionadas(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron guardar las capacidades");
    } finally {
      setGuardando(false);
    }
  }

  if (!sedeId) {
    return <Panel titulo="Capacidades del taller"><p className="p-6 text-sm text-muted-foreground">Esta cuenta no tiene una sede asignada.</p></Panel>;
  }

  return <Panel titulo="Capacidades del taller">
    <div className="border-b border-border p-5">
      <p className="font-medium">{sedeNombre || "Tu taller"}</p>
      <p className="mt-1 text-xs text-muted-foreground">Selecciona todas las capacidades que este taller puede ejecutar internamente. Las áreas de producción habilitadas también aparecerán en el menú de este taller. Esto no administra proveedores externos.</p>
    </div>
    <div className="grid gap-3 p-5 sm:grid-cols-2">
      {porCategoria.map(([categoria, items]) => <div key={categoria} className="rounded-xl border border-border p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{categoria}</p>
        <div className="space-y-2">
          {items.map(e => {
            const activo = ids.includes(e.id);
            return <label key={e.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-surface-muted">
              <input type="checkbox" checked={activo} onChange={() => setSeleccionadas(activo ? ids.filter(x => x !== e.id) : [...ids, e.id])} />
              <span className="text-sm">{e.nombre}</span>
            </label>;
          })}
        </div>
      </div>)}
      {!loadingEspecialidades && !especialidades.length ? <p className="text-sm text-muted-foreground">El catálogo de capacidades todavía no tiene especialidades activas.</p> : null}
    </div>
    {loadingActuales ? <p className="px-5 pb-3 text-xs text-muted-foreground">Cargando configuración…</p> : null}
    <div className="flex items-center justify-between gap-3 border-t border-border p-5">
      <p className="text-xs text-muted-foreground">{ids.length} capacidad{ids.length === 1 ? "" : "es"} interna{ids.length === 1 ? "" : "s"}</p>
      <Button disabled={guardando || loadingActuales} onClick={() => void guardar()}>{guardando ? "Guardando…" : "Guardar capacidades"}</Button>
    </div>
  </Panel>;
}
