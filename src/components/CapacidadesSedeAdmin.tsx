// @ts-nocheck -- tipos generados desfasados respecto al esquema real
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Panel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Especialidad = { id: string; nombre: string; categoria: string | null; activa: boolean };
type Relacion = { sede_id: string; especialidad_id: string };

const CAPACIDADES_PRODUCCION = [
  "Diseño 3D",
  "Impresión 3D",
  "Casting",
  "Corte Láser",
  "Taller",
] as const;

const CAPACIDADES_COMERCIALES = [
  "Pedidos",
  "Cotizaciones",
  "Clientes",
  "Ventas",
  "Catálogo",
] as const;

const CAPACIDADES_INVENTARIO = [
  "Inventario",
  "Compras",
] as const;

const CAPACIDADES_HERRAMIENTAS = [
  "Herramientas",
] as const;

const CAPACIDADES_ADMINISTRACION = [
  "Migración",
] as const;

export function CapacidadesSedeAdmin({
  sedeId,
  sedeNombre,
  esDueno = false,
}: {
  sedeId: string | null;
  sedeNombre?: string;
  esDueno?: boolean;
}) {
  const qc = useQueryClient();
  const [seleccionadas, setSeleccionadas] = useState<string[] | null>(null);
  const [guardando, setGuardando] = useState(false);

  const { data: especialidades = [], isLoading: loadingEspecialidades } = useQuery({
    queryKey: ["capacidades-catalogo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("especialidades")
        .select("id,nombre,categoria,activa")
        .eq("activa", true)
        .order("categoria")
        .order("nombre");
      if (error) throw error;
      return (data ?? []) as Especialidad[];
    },
    enabled: Boolean(sedeId),
  });

  const { data: actuales = [], isLoading: loadingActuales } = useQuery({
    queryKey: ["sede-especialidades", sedeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sede_especialidades")
        .select("sede_id,especialidad_id")
        .eq("sede_id", sedeId!);
      if (error) throw error;
      return (data ?? []) as Relacion[];
    },
    enabled: Boolean(sedeId),
  });

  const idsActuales = actuales.map((r) => r.especialidad_id);
  const ids = seleccionadas ?? idsActuales;

  const porCategoria = useMemo(() => {
    const ordenar = (nombres: readonly string[]) => {
      const orden = new Map(nombres.map((nombre, indice) => [nombre, indice]));
      return especialidades
        .filter((e) => orden.has(e.nombre))
        .sort((a, b) => (orden.get(a.nombre) ?? 99) - (orden.get(b.nombre) ?? 99));
    };

    const produccion = ordenar(CAPACIDADES_PRODUCCION);
    const comercial = ordenar(CAPACIDADES_COMERCIALES);
    const inventario = ordenar(CAPACIDADES_INVENTARIO);
    const herramientas = ordenar(CAPACIDADES_HERRAMIENTAS);
    const administracion = ordenar(CAPACIDADES_ADMINISTRACION);

    const conocidas = new Set([
      ...CAPACIDADES_PRODUCCION,
      ...CAPACIDADES_COMERCIALES,
      ...CAPACIDADES_INVENTARIO,
      ...CAPACIDADES_HERRAMIENTAS,
      ...CAPACIDADES_ADMINISTRACION,
    ]);

    const servicios = especialidades
      .filter((e) => !conocidas.has(e.nombre))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    return [
      ...(produccion.length ? [["Producción", produccion] as [string, Especialidad[]]] : []),
      ...(comercial.length ? [["Comercial", comercial] as [string, Especialidad[]]] : []),
      ...(inventario.length ? [["Inventario", inventario] as [string, Especialidad[]]] : []),
      ...(herramientas.length ? [["Herramientas", herramientas] as [string, Especialidad[]]] : []),
      ...(administracion.length ? [["Administración", administracion] as [string, Especialidad[]]] : []),
      ...(servicios.length ? [["Servicios especializados", servicios] as [string, Especialidad[]]] : []),
    ];
  }, [especialidades]);

  function cambiar(id: string, activo: boolean) {
    setSeleccionadas(activo ? ids.filter((x) => x !== id) : [...ids, id]);
  }

  async function guardar() {
    if (!sedeId) return;

    setGuardando(true);
    try {
      const del = await supabase
        .from("sede_especialidades")
        .delete()
        .eq("sede_id", sedeId);

      if (del.error) throw del.error;

      if (ids.length) {
        const { error } = await supabase
          .from("sede_especialidades")
          .insert(ids.map((especialidad_id) => ({ sede_id: sedeId, especialidad_id })));

        if (error) throw error;
      }

      toast.success("Capacidades del taller actualizadas");

      await Promise.all([
        qc.invalidateQueries({ queryKey: ["sede-especialidades", sedeId] }),
        qc.invalidateQueries({ queryKey: ["menu-capacidades"] }),
        qc.invalidateQueries({ queryKey: ["pedidos-capacidades-sede", sedeId] }),
        qc.invalidateQueries({ queryKey: ["preparacion-participantes"] }),
      ]);

      await qc.refetchQueries({ queryKey: ["sede-especialidades", sedeId], type: "active" });
      setSeleccionadas(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron guardar las capacidades");
    } finally {
      setGuardando(false);
    }
  }

  if (!sedeId) {
    return (
      <Panel titulo="Capacidades del taller">
        <p className="p-6 text-sm text-muted-foreground">
          Esta cuenta no tiene una sede asignada.
        </p>
      </Panel>
    );
  }

  const hayCambios = seleccionadas !== null;

  return (
    <Panel titulo="Capacidades del taller">
      <div className="border-b border-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium">{sedeNombre || "Tu taller"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Esta es la configuración real de capacidades de esta sede. Gerente y Dueño
              visualizan y modifican la misma configuración; no existen capacidades
              separadas por rol.
            </p>
          </div>
          <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {esDueno ? "Vista del Dueño" : "Configuración del Gerente"}
          </span>
        </div>

        <div className="mt-4 rounded-lg border border-primary/15 bg-primary/5 p-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Producción:</span>{" "}
          una capacidad habilitada aquí se considera <span className="font-semibold">interna</span>{" "}
          para esta sede. Si se deshabilita, Producción podrá requerir un servicio externo
          con esa misma capacidad.
        </div>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2">
        {porCategoria.map(([categoria, items]) => (
          <div key={categoria} className="rounded-xl border border-border p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {categoria}
            </p>
            <div className="space-y-2">
              {items.map((e) => {
                const activo = ids.includes(e.id);
                return (
                  <label
                    key={e.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-surface-muted"
                  >
                    <input
                      type="checkbox"
                      checked={activo}
                      disabled={guardando}
                      onChange={() => cambiar(e.id, activo)}
                    />
                    <span className="text-sm">{e.nombre}</span>
                    {categoria === "Producción" ? (
                      <span
                        className={
                          activo
                            ? "ml-auto text-[10px] font-semibold uppercase text-success"
                            : "ml-auto text-[10px] font-semibold uppercase text-muted-foreground"
                        }
                      >
                        {activo ? "Interna" : "Externa"}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {!loadingEspecialidades && !especialidades.length ? (
          <p className="text-sm text-muted-foreground">
            El catálogo de capacidades todavía no tiene especialidades activas.
          </p>
        ) : null}
      </div>

      {loadingActuales ? (
        <p className="px-5 pb-3 text-xs text-muted-foreground">
          Cargando configuración actual…
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-5">
        <p className="text-xs text-muted-foreground">
          {ids.length} capacidad{ids.length === 1 ? "" : "es"} interna
          {ids.length === 1 ? "" : "s"}
          {hayCambios ? " · cambios pendientes" : ""}
        </p>
        <Button
          disabled={guardando || loadingActuales || !hayCambios}
          onClick={() => void guardar()}
        >
          {guardando ? "Guardando…" : "Guardar capacidades"}
        </Button>
      </div>
    </Panel>
  );
}
