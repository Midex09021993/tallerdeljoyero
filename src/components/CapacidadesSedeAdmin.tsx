// @ts-nocheck -- tipos generados desfasados respecto al esquema real
import { useEffect, useMemo, useState } from "react";
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
  "Contratos",
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

const SUBCAPACIDADES_TALLER = ["Engaste", "Pulido", "Grabado"] as const;

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
  const [modalidades, setModalidades] = useState<{
    produccion_activa: boolean;
    servicios_externos_activos: boolean;
  } | null>(null);
  const [modalidadesIniciales, setModalidadesIniciales] = useState<{
    produccion_activa: boolean;
    servicios_externos_activos: boolean;
  } | null>(null);

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

  const { data: modalidadesActuales, isLoading: loadingModalidades } = useQuery({
    queryKey: ["sede-modalidades", sedeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sede_modalidades")
        .select("produccion_activa,servicios_externos_activos")
        .eq("sede_id", sedeId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? {
        produccion_activa: false,
        servicios_externos_activos: false,
      }) as {
        produccion_activa: boolean;
        servicios_externos_activos: boolean;
      };
    },
    enabled: Boolean(sedeId),
  });

  useEffect(() => {
    if (!modalidadesActuales) return;
    setModalidadesIniciales((prev) => prev ?? modalidadesActuales);
    setModalidades((prev) => prev ?? modalidadesActuales);
  }, [modalidadesActuales]);

  const estadoModalidades = modalidades ?? modalidadesActuales ?? {
    produccion_activa: false,
    servicios_externos_activos: false,
  };
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
    const especialidad = especialidades.find((e) => e.id === id)?.nombre ?? "";
    const idsSubtaller = new Set(
      especialidades
        .filter((e) => SUBCAPACIDADES_TALLER.includes(e.nombre as (typeof SUBCAPACIDADES_TALLER)[number]))
        .map((e) => e.id),
    );

    if (activo) {
      if (especialidad === "Taller") {
        setSeleccionadas(ids.filter((x) => x !== id && !idsSubtaller.has(x)));
        return;
      }

      const taller = especialidades.find((e) => e.nombre === "Taller");
      if (taller && !ids.includes(taller.id) && idsSubtaller.has(id)) return;
    }

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

      const { error: modalidadesError } = await supabase
        .from("sede_modalidades")
        .upsert({
          sede_id: sedeId,
          produccion_activa: estadoModalidades.produccion_activa,
          servicios_externos_activos: estadoModalidades.servicios_externos_activos,
        }, { onConflict: "sede_id" });

      if (modalidadesError) throw modalidadesError;

      toast.success("Configuración del taller actualizada");

      await Promise.all([
        qc.invalidateQueries({ queryKey: ["sede-especialidades", sedeId] }),
        qc.invalidateQueries({ queryKey: ["sede-modalidades", sedeId] }),
        qc.invalidateQueries({ queryKey: ["menu-capacidades"] }),
        qc.invalidateQueries({ queryKey: ["pedidos-capacidades-sede", sedeId] }),
        qc.invalidateQueries({ queryKey: ["preparacion-participantes"] }),
      ]);

      await Promise.all([
        qc.refetchQueries({ queryKey: ["sede-especialidades", sedeId], type: "active" }),
        qc.refetchQueries({ queryKey: ["sede-modalidades", sedeId], type: "active" }),
      ]);
      setSeleccionadas(null);
      setModalidadesIniciales(estadoModalidades);
      setModalidades(estadoModalidades);
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

  const hayCambios =
    seleccionadas !== null ||
    !modalidadesIniciales ||
    modalidadesIniciales.produccion_activa !== estadoModalidades.produccion_activa ||
    modalidadesIniciales.servicios_externos_activos !== estadoModalidades.servicios_externos_activos;

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
          <span className="font-semibold text-foreground">Capacidades:</span>{" "}
          una capacidad seleccionada se considera <span className="font-semibold">interna</span>{" "}
          para esta sede. Si Servicios externos está activo, una capacidad no seleccionada
          puede derivarse a un proveedor externo; si está apagado, esa operación queda bloqueada.
        </div>
      </div>

      <div className="border-b border-border p-5">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Modalidades de trabajo
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-4">
            <input
              type="checkbox"
              checked={estadoModalidades.produccion_activa}
              disabled={guardando || loadingModalidades}
              onChange={(e) =>
                setModalidades({
                  ...estadoModalidades,
                  produccion_activa: e.target.checked,
                })
              }
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Producción</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Activa las áreas productivas del taller. Las capacidades seleccionadas debajo
                determinan qué procesos son internos.
              </span>
            </span>
            <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase text-muted-foreground">
              {estadoModalidades.produccion_activa ? "Activa" : "Inactiva"}
            </span>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-4">
            <input
              type="checkbox"
              checked={estadoModalidades.servicios_externos_activos}
              disabled={guardando || loadingModalidades}
              onChange={(e) =>
                setModalidades({
                  ...estadoModalidades,
                  servicios_externos_activos: e.target.checked,
                })
              }
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Servicios externos</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Permite enviar o recibir operaciones que el taller no realiza internamente.
              </span>
            </span>
            <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase text-muted-foreground">
              {estadoModalidades.servicios_externos_activos ? "Activa" : "Inactiva"}
            </span>
          </label>
        </div>
      </div>

      <div className="grid gap-3 p-5">
        {porCategoria.map(([categoria, items]) => (
          <div key={categoria} className="rounded-xl border border-border p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {categoria}
            </p>
            <div className="space-y-2">
              {items.map((e) => {
                const activo = ids.includes(e.id);
                const esSubcapacidadTaller = SUBCAPACIDADES_TALLER.includes(
                  e.nombre as (typeof SUBCAPACIDADES_TALLER)[number],
                );
                const taller = especialidades.find((item) => item.nombre === "Taller");
                const tallerActivo = taller ? ids.includes(taller.id) : false;
                const subcapacidadBloqueada = esSubcapacidadTaller && !tallerActivo;

                return (
                  <label
                    key={e.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-surface-muted"
                  >
                    <input
                      type="checkbox"
                      checked={activo}
                      disabled={guardando || subcapacidadBloqueada}
                      onChange={() => cambiar(e.id, activo)}
                    />
                    <span className="text-sm">{e.nombre}</span>
                    {esSubcapacidadTaller ? (
                      <span className="ml-auto text-[10px] font-semibold uppercase text-muted-foreground">
                        {subcapacidadBloqueada ? "Requiere Taller" : "Subcapacidad"}
                      </span>
                    ) : categoria === "Producción" ? (
                      <span
                        className={
                          activo
                            ? "ml-auto text-[10px] font-semibold uppercase text-success"
                            : "ml-auto text-[10px] font-semibold uppercase text-muted-foreground"
                        }
                      >
                        {activo
                          ? "Interna"
                          : estadoModalidades.servicios_externos_activos
                            ? "Externa"
                            : "No disponible"}
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
