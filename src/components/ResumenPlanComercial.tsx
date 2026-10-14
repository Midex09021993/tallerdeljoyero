import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Gauge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { obtenerPlanComercial } from "@/lib/planes-comerciales";
import { useSesion } from "@/lib/auth";

type Cuota = { plan_id: string; productos_catalogo_max: number; operaciones_comerciales_mes: number; almacenamiento_mib: number; usos_render_mes: number };

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
        supabase.from("aurum_plan_quotas").select("plan_id,productos_catalogo_max,operaciones_comerciales_mes,almacenamiento_mib,usos_render_mes").eq("plan_id", planId).maybeSingle(),
        supabase.from("catalogo_productos").select("id", { count: "exact", head: true }).eq("participante_id", participanteId!),
      ]);
      if (cuotaError) throw cuotaError;
      if (countError) throw countError;
      return { planId, cuota: cuota as Cuota | null, productos: count ?? 0 };
    },
  });

  if (!sesion?.esAdmin || !participanteId || resumen.isLoading || resumen.isError || !resumen.data?.cuota) return null;
  const { planId, cuota, productos } = resumen.data;
  const limite = cuota.productos_catalogo_max;
  const pct = porcentaje(productos, limite);
  const plan = obtenerPlanComercial(planId);

  return (
    <section className="mx-4 mb-4 rounded-xl border border-ink-foreground/10 bg-ink-foreground/[0.04] p-3 text-ink-foreground" aria-label="Uso del plan comercial">
      <div className="mb-2 flex items-center gap-2">
        <Gauge className="size-4 text-gold" />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-foreground/60">Tu plan</p>
      </div>
      <p className="text-sm font-semibold">{plan?.nombre ?? "Emprendedor"}</p>
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
        <span className="text-ink-foreground/60">Productos del catálogo</span>
        <span className="font-medium tabular-nums">{productos} / {limite < 0 ? "∞" : limite}</span>
      </div>
      {limite >= 0 ? <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-foreground/10"><div className={`h-full rounded-full ${pct >= 90 ? "bg-amber-400" : "bg-gold"}`} style={{ width: `${pct}%` }} /></div> : null}
      <Link to="/catalogo" className="mt-3 block text-[11px] font-medium text-gold-bright hover:underline">Administrar catálogo →</Link>
    </section>
  );
}
