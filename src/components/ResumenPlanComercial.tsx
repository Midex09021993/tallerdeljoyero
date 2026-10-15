import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Gauge, Package, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { obtenerPlanComercial } from "@/lib/planes-comerciales";
import { useSesion } from "@/lib/auth";

type Cuota = {
  plan_id: string;
  productos_catalogo_max: number;
  operaciones_comerciales_mes: number;
  almacenamiento_mib: number;
  usos_render_mes: number;
};

function porcentaje(usado: number, limite: number) {
  return limite < 0 ? 0 : Math.min(100, Math.round((usado / Math.max(1, limite)) * 100));
}

export function ResumenPlanComercial() {
  const { data: sesion } = useSesion();
  const participanteId = sesion?.participante?.id ?? null;
  const resumen = useQuery({
    queryKey: ["resumen-plan-comercial", participanteId],
    enabled: Boolean(participanteId && sesion?.esAdmin),
    queryFn: async () => {
      const { data: participante, error: participanteError } = await supabase
        .from("ecosistema_participantes")
        .select("id, metadata")
        .eq("id", participanteId!)
        .maybeSingle();
      if (participanteError) throw participanteError;

      const metadata = participante?.metadata as Record<string, unknown> | null;
      const planId = obtenerPlanComercial(metadata?.["plan_comercial"])?.id ?? "emprendedor";
      const [{ data: cuota, error: cuotaError }, { count, error: countError }] = await Promise.all([
        supabase
          .from("aurum_plan_quotas")
          .select("plan_id,productos_catalogo_max,operaciones_comerciales_mes,almacenamiento_mib,usos_render_mes")
          .eq("plan_id", planId)
          .maybeSingle(),
        supabase
          .from("catalogo_productos")
          .select("id", { count: "exact", head: true })
          .eq("participante_id", participanteId!),
      ]);
      if (cuotaError) throw cuotaError;
      if (countError) throw countError;
      return { planId, cuota: cuota as Cuota | null, productos: count ?? 0 };
    },
  });

  if (!sesion?.esAdmin || !participanteId) return null;

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
              No se pudo cargar la información del plan. Vuelve a intentarlo más tarde.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const { planId, cuota, productos } = resumen.data;
  const plan = obtenerPlanComercial(planId);
  const limite = cuota?.productos_catalogo_max ?? null;
  const pct = limite === null ? 0 : porcentaje(productos, limite);
  const precio = plan?.precioEtiqueta ?? "Consultar plan";

  return (
    <section
      className="mx-4 mb-4 overflow-hidden rounded-2xl border border-[#d6b56d] bg-[#fffdf8] text-[#25231f] shadow-card"
      aria-label="Resumen del plan comercial"
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#d6b56d] bg-[#f8efd9] text-[#946b18]">
            <Gauge className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#66645e]">
              Suscripción y consumo
            </p>
            <h2 className="mt-1 text-xl font-bold leading-tight text-[#25231f]">
              Plan {plan?.nombre ?? "Emprendedor"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#946b18]">{precio}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-[#dfc98f] bg-[#f8efd9] px-3 py-1.5 text-xs font-semibold text-[#25231f] sm:self-center">
          <Sparkles className="size-3.5 text-[#946b18]" />
          Plan asignado
        </div>
      </div>

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
    </section>
  );
}
