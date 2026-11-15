import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, BookOpen, Gem, Globe2, Layers3, Store, UsersRound, UserRoundCheck, Share2, type LucideIcon } from "lucide-react";
import { supabasePublic } from "@/integrations/supabase/client";
import { RegistroTaller } from "@/components/RegistroTaller";

type ActivityType = "workshop_registered" | "design_published" | "profile_completed" | "catalog_updated" | "render_shared" | "referral_registered";
type CommunityActivity = {
  id: string;
  participante_id: string | null;
  actor_name: string;
  activity_type: ActivityType | string;
  title: string;
  summary: string | null;
  created_at: string;
  target_url?: string | null;
};
type CommunityStat = { metric_key: string; label: string; value: number; prefix: string | null; suffix: string | null; display_order: number };

const filters: { id: "all" | ActivityType; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "workshop_registered", label: "Talleres" },
  { id: "design_published", label: "Diseños" },
  { id: "profile_completed", label: "Perfiles" },
  { id: "catalog_updated", label: "Catálogos" },
  { id: "render_shared", label: "Renders" },
  { id: "referral_registered", label: "Referidos" },
];
const activityIcons: Record<string, LucideIcon> = {
  workshop_registered: Store,
  design_published: Gem,
  profile_completed: UserRoundCheck,
  catalog_updated: Layers3,
  render_shared: Share2,
  referral_registered: UsersRound,
  publication: Gem,
  catalog: Layers3,
  registration: Store,
  render: Share2,
  achievement: Award,
  milestone: BookOpen,
};


function tiempoRelativo(fecha: string) {
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  const minutos = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (minutos < 1) return "Ahora";
  if (minutos < 60) return `Hace ${minutos} ${minutos === 1 ? "minuto" : "minutos"}`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} ${horas === 1 ? "hora" : "horas"}`;
  if (horas < 48) return "Ayer";
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `Hace ${dias} días`;
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "short" }).format(date);
}

export function ActividadComunidad({ slug, compact = false, preview = false }: { slug?: string; compact?: boolean; preview?: boolean }) {
  const [filter, setFilter] = useState<"all" | ActivityType>("all");
  const activitiesQuery = useQuery({
    queryKey: ["aurum-community-activity", slug ?? "global"],
    queryFn: async () => {
      if (slug) {
        const { data, error } = await (supabasePublic as any).rpc("obtener_actividad_comunidad_por_slug", { _slug: slug });
        if (error) throw error;
        return (data ?? []) as CommunityActivity[];
      }
      const { data, error } = await (supabasePublic as any)
        .from("aurum_community_activity")
        .select("id,participante_id,actor_name,activity_type,title,summary,created_at,target_url")
        .eq("is_public", true)
        .not("actor_name", "ilike", "FADILAB")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as CommunityActivity[];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
  const statsQuery = useQuery({
    queryKey: ["aurum-community-stats-home"],
    enabled: !compact,
    queryFn: async () => {
      const { data, error } = await (supabasePublic as any).from("aurum_community_stats")
        .select("metric_key,label,value,prefix,suffix,display_order").order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CommunityStat[];
    },
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    retry: 1,
  });
  const activities = (activitiesQuery.data ?? [])
    .filter(item => item.actor_name.trim().toLocaleLowerCase("es") !== "fadilab")
    .filter(item => filter === "all" || item.activity_type === filter)
    .slice(0, compact ? 30 : 6);
  // No mostrar cifras sembradas como demostración: hasta conectar métricas verificables, se informa que están en preparación.
  const stats = (statsQuery.data ?? []).filter(stat => stat.metric_key.startsWith("verified_"));

  if (preview) {
    return (
      <div className="mt-5 overflow-hidden rounded-2xl border border-[#e8e3d9] bg-white shadow-[0_10px_30px_rgba(23,35,45,.035)]">
        {activitiesQuery.isLoading ? (
          <div className="px-5 py-7 text-center text-xs text-slate-400">Cargando novedades…</div>
        ) : activities.length ? (
          <div className="divide-y divide-[#f0ede7]">
            {activities.slice(0, 3).map(activity => {
              const Icon = activityIcons[activity.activity_type] ?? UsersRound;
              return (
                <article key={activity.id} className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#eee4cb] bg-[#fbf6e9] text-[#98752f]"><Icon className="size-4" strokeWidth={1.8} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs leading-5 text-[#4c5861]"><strong className="font-bold text-[#17232d]">{activity.actor_name}</strong> {activity.title}</p>
                    {activity.summary && <p className="mt-0.5 truncate text-[10px] text-[#899198]">{activity.summary}</p>}
                  </div>
                  <time dateTime={activity.created_at} className="shrink-0 text-[10px] text-[#9aa0a4]">{tiempoRelativo(activity.created_at)}</time>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="px-5 py-6 text-center text-xs text-[#899198]">{activitiesQuery.isError ? "Las novedades no están disponibles en este momento." : "Pronto verás aquí las últimas novedades de los talleres."}</p>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-[#f0ede7] bg-[#fdfcf9] px-4 py-3 sm:px-5">
          <span className="text-[10px] text-[#899198]">Actividad pública de la comunidad</span>
          <Link to="/comunidad" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#876500] hover:text-[#5f4900]">Ver toda la actividad <Share2 className="size-3.5" /></Link>
        </div>
      </div>
    );
  }
  return (
    <section id={compact ? "actividad-taller" : "actividad-comunidad"} aria-label={compact ? "Actividad del taller" : "Actividad reciente de la comunidad"} className={compact ? "border-y border-[#1f1b1815] bg-white/70" : "relative isolate overflow-hidden border-y border-[#e8e3d9] bg-[#fbfaf7]"}>
      <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.22em] text-[#96732e]"><span className="size-1.5 rounded-full bg-[#c7a65b]" /> {compact ? "Comunidad AURUM" : "Red de talleres y profesionales"}</p>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight text-[#17232d] sm:text-2xl">{compact ? "Actividad reciente del taller" : "ACTIVIDAD DE LA COMUNIDAD"}</h2>
            {!compact && <p className="mt-2 max-w-2xl text-sm leading-6 text-[#687580]">Descubre las novedades de los talleres y profesionales que forman parte de AURUM LAB.</p>}
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e8dfca] bg-white px-3 py-2 text-[10px] font-semibold text-[#69747c]">
            <span className={`size-2 rounded-full ${activitiesQuery.isError ? "bg-amber-500" : "bg-emerald-500"}`} />
            {activitiesQuery.isError ? "Feed no disponible" : "Actualización automática"}
          </span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filtrar actividades">
          {filters.map(item => <button key={item.id} type="button" onClick={() => setFilter(item.id)} aria-pressed={filter === item.id} className={`rounded-full border px-3.5 py-2 text-[11px] font-semibold transition ${filter === item.id ? "border-[#17232d] bg-[#17232d] text-white" : "border-[#e5dfd4] bg-white text-[#65717a] hover:border-[#c7a65b] hover:text-[#17232d]"}`}>{item.label}</button>)}
        </div>
        <div className={compact ? "mt-4 overflow-hidden rounded-2xl border border-[#e8e3d9] bg-white" : "mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(290px,.85fr)]"}>
          <div className="overflow-hidden rounded-2xl border border-[#e8e3d9] bg-white shadow-[0_12px_36px_rgba(23,35,45,.035)]">
            <div className="divide-y divide-[#f0ede7]">
              {activitiesQuery.isLoading ? <div className="px-5 py-8 text-center text-xs text-slate-400">Cargando actividad…</div>
                : activities.length ? activities.map(activity => {
                  const Icon = activityIcons[activity.activity_type] ?? UsersRound;
                  return <article key={activity.id} className="group flex gap-3.5 px-5 py-4 transition-colors hover:bg-[#fdfbf6] sm:px-6">
                    <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl border border-[#eee4cb] bg-[#fbf6e9] text-[#98752f]"><Icon className="size-[18px]" strokeWidth={1.8} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-6 text-[#4c5861]"><strong className="font-bold text-[#17232d]">{activity.actor_name}</strong> {activity.title}</p>
                      {activity.summary && <p className="mt-1 text-xs leading-5 text-[#899198]">{activity.summary}</p>}
                    </div>
                    <time dateTime={activity.created_at} title={new Date(activity.created_at).toLocaleString("es-PE")} className="shrink-0 pt-1 text-right text-[10px] font-medium text-[#9aa0a4]">{tiempoRelativo(activity.created_at)}</time>
                  </article>;
                }) : <div className="px-5 py-9 text-center"><UsersRound className="mx-auto size-7 text-[#b59a5b]" /><p className="mt-3 text-sm font-semibold text-[#17232d]">Aún no hay actividades para mostrar</p><p className="mt-1 text-xs text-[#899198]">{filter === "all" ? "Las novedades aparecerán aquí automáticamente cuando los talleres realicen acciones públicas." : "No hay movimientos de esta categoría todavía."}</p></div>}
            </div>
            {activitiesQuery.isError && <p className="border-t border-[#eeeae2] px-5 py-3 text-[10px] text-amber-700">No se pudo conectar con el feed de la comunidad.</p>}
          </div>
          {!compact && <aside className="flex flex-col gap-4">
            <div className="rounded-2xl border border-[#e8e3d9] bg-white p-5 shadow-[0_12px_36px_rgba(23,35,45,.035)]">
              <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-[#fff4d5] text-[#96732e]"><Globe2 className="size-[18px]" /></span><div><h3 className="text-sm font-bold text-[#17232d]">La comunidad en cifras</h3><p className="mt-0.5 text-[10px] text-slate-500">Una red que sigue creciendo</p></div></div>
              {stats.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-2.5">{stats.map((stat,index)=><div key={stat.metric_key} className={`rounded-xl border border-[#eeeae2] bg-[#fdfcf9] p-2.5 ${index === stats.length - 1 ? "col-span-2" : ""}`}><p className="text-lg font-bold leading-tight text-[#17232d]">{stat.prefix ?? ""}{new Intl.NumberFormat("es").format(stat.value)}{stat.suffix ?? ""}</p><p className="mt-1 text-[9px] leading-4 text-[#77828a]">{stat.label}</p></div>)}</div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-[#e8e3d9] bg-[#fdfcf9] px-4 py-5">
                  <p className="text-sm font-semibold text-[#17232d]">Cifras reales en preparación</p>
                  <p className="mt-1 text-[11px] leading-5 text-[#77828a]">Pronto mostraremos datos verificados de talleres, diseños y actividad de la comunidad.</p>
                </div>
              )}
            </div>
            <div className="rounded-2xl bg-[#17232d] p-5 text-white"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#e7cb78]">Tu próximo paso</p><h3 className="mt-2 text-xl font-extrabold">¿Quieres formar parte de la comunidad?</h3><p className="mt-2 text-xs leading-5 text-slate-300">Crea el espacio de tu taller y conecta tu trabajo con una red de profesionales.</p><RegistroTaller className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#f1d58b] px-4 py-3 text-xs font-extrabold text-[#17232d] hover:bg-[#ffe7a8]" /></div>
          </aside>}
        </div>
      </div>
    </section>
  );
}
