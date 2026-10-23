import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Gauge, Package, Sparkles, Cloud, FolderOpen, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { obtenerPlanComercial } from "@/lib/planes-comerciales";
import { useSesion } from "@/lib/auth";

type Cuota = {
  plan_id: string;
  productos_catalogo_max: number;
  operaciones_comerciales_mes: number;
  almacenamiento_mib: number;
  usos_render_mes: number;
  carpetas_mi_nube_max: number;
};

// Ocultación temporal de la tarjeta para las cuentas existentes.
// No modifica planes, cuotas ni permisos; se puede reactivar cambiando esta constante.
const MOSTRAR_RESUMEN_PLAN_COMERCIAL = true;

function porcentaje(usado: number, limite: number) {
  return limite < 0 ? 0 : Math.min(100, Math.round((usado / Math.max(1, limite)) * 100));
}

function formatoBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function ResumenPlanComercial() {
  const [expandido, setExpandido] = useState(false);
  const { data: sesion } = useSesion();
  const participanteId = sesion?.participante?.id ?? null;
  const resumen = useQuery({
    queryKey: ["resumen-plan-comercial", participanteId],
    enabled: MOSTRAR_RESUMEN_PLAN_COMERCIAL && Boolean(participanteId && sesion?.esAdmin),
    queryFn: async () => {
      const { data: participante, error: participanteError } = await supabase
        .from("ecosistema_participantes")
        .select("id, metadata")
        .eq("id", participanteId!)
        .maybeSingle();
      if (participanteError) {
        console.warn("[plan-comercial] Falló la consulta del participante", participanteError);
        throw new Error("No se pudieron consultar los datos del taller.");
      }
      if (!participante) {
        throw new Error("No se encontró el registro del taller en el ecosistema.");
      }

      const metadata = participante?.metadata as Record<string, unknown> | null;
      const planConfigurado = obtenerPlanComercial(metadata?.["plan_comercial"]);
      if (!planConfigurado) {
        console.warn("[plan-comercial] Plan comercial ausente o no reconocido", {
          participanteId,
          tieneMetadata: Boolean(metadata),
          planComercial: metadata?.["plan_comercial"] ?? null,
        });
        throw new Error("El taller no tiene un plan comercial válido configurado.");
      }
      const planId = planConfigurado.id;
      const [{ data: cuota, error: cuotaError }, { count, error: countError }, { data: nubeData, error: nubeError }] = await Promise.all([
        supabase
          .from("aurum_plan_quotas")
          .select("plan_id,productos_catalogo_max,operaciones_comerciales_mes,almacenamiento_mib,usos_render_mes,carpetas_mi_nube_max")
          .eq("plan_id", planId)
          .maybeSingle(),
        supabase
          .from("catalogo_productos")
          .select("id", { count: "exact", head: true })
          .eq("participante_id", participanteId!),
        supabase.rpc("aurum_resumen_mi_nube_owner", { p_participante_id: participanteId! }),
      ]);
      if (cuotaError) {
        console.warn("[plan-comercial] Falló la consulta de cuotas", { planId, error: cuotaError });
        throw new Error("No se pudieron consultar las cuotas del plan.");
      }
      if (countError) {
        console.warn("[plan-comercial] Falló el conteo del catálogo", countError);
        throw new Error("No se pudo consultar el catálogo de productos.");
      }
      if (nubeError) {
        console.warn("[plan-comercial] Falló el resumen de Mi Nube", nubeError);
        throw new Error("No se pudo consultar el resumen de Mi Nube.");
      }
      const nube = Array.isArray(nubeData) ? nubeData[0] : nubeData;
      const bytesPropios = Number(nube?.bytes_propios);
      const carpetasPropias = Number(nube?.carpetas_propias);
      if (!nube || !Number.isFinite(bytesPropios) || !Number.isInteger(carpetasPropias)) {
        console.warn("[plan-comercial] Respuesta de Mi Nube con formato inesperado", {
          participanteId,
          esArray: Array.isArray(nubeData),
          tieneDatos: Boolean(nube),
        });
        throw new Error("El resumen de Mi Nube devolvió datos incompletos.");
      }
      return { planId, cuota: cuota as Cuota | null, productos: count ?? 0, nube: {
        carpetasPropias,
        bytesPropios,
        carpetasCompartidas: Number(nube.carpetas_compartidas ?? 0),
        bytesCompartidos: Number(nube.bytes_compartidos ?? 0),
      } };
    },
  });

  if (!MOSTRAR_RESUMEN_PLAN_COMERCIAL || !sesion?.esAdmin || !participanteId) return null;

  if (resumen.isLoading) {
    return (
      <section
        className="mx-4 mb-4 rounded-2xl border border-[#dfc98f] bg-[#fffdf8] p-4 text-[#25231f] shadow-card sm:p-5"
        aria-label="Plan comercial"
        aria-live="polite"
      >
        <p className="text-sm text-[#66645e]">Cargando información de tu plan…</p>
      </section>
    );
  }

  if (resumen.isError || !resumen.data) {
    return (
      <section
        className="mx-4 mb-4 rounded-2xl border border-amber-500/30 bg-[#fffdf8] p-4 text-[#25231f] shadow-card sm:p-5"
        aria-label="Plan comercial"
        role="status"
      >
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-700">
            <Gauge className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#25231f]">Tu plan comercial</h2>
            <p className="mt-1 text-sm text-[#66645e]">
              {resumen.error instanceof Error
                ? resumen.error.message
                : "No se pudo cargar la información del plan."}
            </p>
            <button
              type="button"
              className="mt-3 inline-flex min-h-9 items-center rounded-lg border border-[#d6b56d] px-3 py-1.5 text-xs font-semibold text-[#6f5216] transition hover:bg-[#f8efd9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b99a50]"
              onClick={() => void resumen.refetch()}
            >
              Reintentar
            </button>
          </div>
        </div>
      </section>
    );
  }

  const { planId, cuota, productos, nube } = resumen.data;
  const plan = obtenerPlanComercial(planId);
  const limite = cuota?.productos_catalogo_max ?? null;
  const pct = limite === null ? 0 : porcentaje(productos, limite);
  const precio = plan?.precioEtiqueta ?? "Consultar plan";

  return (
    <section
      className="mx-4 mb-4 overflow-hidden rounded-2xl border border-[#d6b56d] bg-[#fffdf8] text-[#25231f] shadow-card"
      aria-label="Resumen del plan comercial"
    >
      <button
        type="button"
        className="flex w-full flex-col gap-4 p-4 text-left transition hover:bg-[#fbf7ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#b99a50] sm:flex-row sm:items-center sm:justify-between sm:p-5"
        onClick={() => setExpandido((actual) => !actual)}
        aria-expanded={expandido}
        aria-controls="resumen-plan-comercial-detalle"
      >
        <span className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#d6b56d] bg-[#f8efd9] text-[#946b18]">
            <Gauge className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#66645e]">
              Suscripción y consumo
            </span>
            <span className="mt-1 block text-xl font-bold leading-tight text-[#25231f]">
              Plan {plan?.nombre ?? "Emprendedor"}
            </span>
            <span className="mt-1 block text-sm font-semibold text-[#946b18]">{precio}</span>
          </span>
        </span>
        <span className="flex items-center gap-3 self-start sm:self-center">
          <span className="flex items-center gap-2 rounded-full border border-[#dfc98f] bg-[#f8efd9] px-3 py-1.5 text-xs font-semibold text-[#25231f]">
            <Sparkles className="size-3.5 text-[#946b18]" />
            Plan asignado
          </span>
          <ChevronDown className={`size-5 shrink-0 text-[#946b18] transition-transform duration-200 ${expandido ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </button>

      {expandido && <div id="resumen-plan-comercial-detalle">
      <div className="border-t border-[#e5dfd2] bg-[#f5f2eb] px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-[#25231f]">
            <Package className="size-4 text-[#946b18]" />
            Productos del catálogo
          </div>
          <span className="text-sm font-bold tabular-nums text-[#25231f]">
            {productos} / {limite === null ? "Límite no disponible" : limite < 0 ? "Ilimitado" : limite}
          </span>
        </div>
        {limite !== null && limite >= 0 ? (
          <>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-border"
              role="progressbar"
              aria-label="Uso del límite de productos"
              aria-valuemin={0}
              aria-valuemax={limite || 1}
              aria-valuenow={productos}
            >
              <div
                className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-amber-500" : "bg-gold"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-[#66645e]">{pct}% del límite utilizado</p>
          </>
        ) : (
          <p className="mt-1.5 text-xs text-[#66645e]">
            {limite === null ? "No hay un límite de catálogo configurado para este plan." : "Este plan no tiene un límite fijo de productos."}
          </p>
        )}
        <Link
          to="/catalogo"
          className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-[#9a741f] px-4 py-2 text-xs font-bold text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Administrar catálogo →
        </Link>
      </div>
      <div className="border-t border-[#e5dfd2] bg-[#fffdf8] px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2 text-sm font-medium text-[#25231f]"><Cloud className="size-4 text-[#946b18]"/>Mi Nube · capacidad del plan</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#e5dfd2] bg-white p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#25231f]"><FolderOpen className="size-4 text-[#946b18]"/>Mis archivos</div>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs"><span className="text-[#66645e]">Carpetas propias</span><span className="font-semibold tabular-nums">{nube.carpetasPropias}{cuota?.carpetas_mi_nube_max != null && cuota.carpetas_mi_nube_max >= 0 ? ` / ${cuota.carpetas_mi_nube_max}` : cuota?.carpetas_mi_nube_max === -1 ? " / Ilimitado" : ""}</span></div>
            <div className="mt-1 flex items-center justify-between gap-2 text-xs"><span className="text-[#66645e]">Espacio ocupado</span><span className="font-semibold tabular-nums">{formatoBytes(nube.bytesPropios)}</span></div>
          </div>
          <div className="rounded-xl border border-[#e5dfd2] bg-white p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#25231f]"><Cloud className="size-4 text-[#946b18]"/>Capacidad de almacenamiento</div>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs"><span className="text-[#66645e]">Capacidad del plan</span><span className="font-semibold tabular-nums">{cuota?.almacenamiento_mib === -1 ? "Ilimitada" : cuota?.almacenamiento_mib != null ? formatoBytes(cuota.almacenamiento_mib * 1024 * 1024) : "No configurada"}</span></div>
            <div className="mt-1 flex items-center justify-between gap-2 text-xs"><span className="text-[#66645e]">Disponible</span><span className="font-semibold tabular-nums">{cuota?.almacenamiento_mib === -1 ? "Ilimitado" : cuota?.almacenamiento_mib != null ? formatoBytes(Math.max(0, cuota.almacenamiento_mib * 1024 * 1024 - nube.bytesPropios)) : "—"}</span></div>
            {cuota?.almacenamiento_mib != null && cuota.almacenamiento_mib >= 0 && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e8e3d9]" role="progressbar" aria-label="Uso de almacenamiento de Mi Nube" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(nube.bytesPropios / Math.max(1, cuota.almacenamiento_mib * 1024 * 1024) * 100))}><div className={`h-full rounded-full ${nube.bytesPropios / Math.max(1, cuota.almacenamiento_mib * 1024 * 1024) >= .9 ? "bg-amber-500" : "bg-[#b99a50]"}`} style={{ width: `${Math.min(100, Math.round(nube.bytesPropios / Math.max(1, cuota.almacenamiento_mib * 1024 * 1024) * 100))}%` }}/></div>}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#66645e]"><span>Carpetas compartidas contigo</span><span className="font-semibold tabular-nums">{nube.carpetasCompartidas} · {formatoBytes(nube.bytesCompartidos)} accesibles</span></div>
      </div>
      </div>}
    </section>
  );
}
