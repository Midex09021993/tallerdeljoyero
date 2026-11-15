import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Award, Calculator, Gem, Globe2, Layers3, Store, UsersRound, type LucideIcon } from "lucide-react";
import { supabasePublic } from "@/integrations/supabase/client";
import { RegistroTaller } from "@/components/RegistroTaller";

type CommunityActivity = {
  id: string;
  actor_name: string;
  activity_type: "publication" | "catalog" | "registration" | "render" | "achievement" | "milestone" | string;
  title: string;
  summary: string | null;
  created_at: string;
};

type CommunityStat = {
  metric_key: string;
  label: string;
  value: number;
  prefix: string | null;
  suffix: string | null;
  display_order: number;
};

const previewActivities: CommunityActivity[] = [
  { id: "preview-1", actor_name: "Ríos & Co.", activity_type: "publication", title: "publicó un nuevo diseño de anillo de compromiso", summary: "Una nueva pieza se suma a la inspiración de la comunidad.", created_at: new Date(Date.now() - 5 * 60_000).toISOString() },
  { id: "preview-2", actor_name: "Siberiana", activity_type: "catalog", title: "actualizó su catálogo digital", summary: "Su colección ya cuenta con nuevos diseños.", created_at: new Date(Date.now() - 2 * 60 * 60_000).toISOString() },
  { id: "preview-3", actor_name: "Comunidad AURUM", activity_type: "registration", title: "nuevo taller registrado en República Dominicana", summary: "La red sigue creciendo y conectando profesionales.", created_at: new Date(Date.now() - 4 * 60 * 60_000).toISOString() },
  { id: "preview-4", actor_name: "FADILAB", activity_type: "render", title: "compartió un render 3D", summary: "Una nueva visualización de joyería para compartir.", created_at: new Date(Date.now() - 7 * 60 * 60_000).toISOString() },
  { id: "preview-5", actor_name: "Comunidad AURUM", activity_type: "achievement", title: "un miembro completó su perfil profesional al 100 %", summary: "Los perfiles completos ayudan a generar confianza.", created_at: new Date(Date.now() - 10 * 60 * 60_000).toISOString() },
  { id: "preview-6", actor_name: "Herramientas técnicas", activity_type: "milestone", title: "18 cálculos realizados hoy", summary: "Las herramientas técnicas acompañan el trabajo diario.", created_at: new Date(Date.now() - 12 * 60 * 60_000).toISOString() },
];

const previewStats: CommunityStat[] = [
  { metric_key: "workshops", label: "Talleres registrados", value: 120, prefix: "+", suffix: null, display_order: 1 },
  { metric_key: "countries", label: "Países representados", value: 8, prefix: "+", suffix: null, display_order: 2 },
  { metric_key: "calculations", label: "Cálculos realizados", value: 15000, prefix: "+", suffix: null, display_order: 3 },
  { metric_key: "designs", label: "Diseños almacenados", value: 500, prefix: "+", suffix: null, display_order: 4 },
  { metric_key: "shared_files", label: "Archivos compartidos", value: 2000, prefix: "+", suffix: null, display_order: 5 },
];

const activityIcons: Record<string, LucideIcon> = {
  publication: Gem,
  catalog: Layers3,
  registration: Store,
  render: Gem,
  achievement: Award,
  milestone: Calculator,
};

function tiempoRelativo(fecha: string) {
  const minutos = Math.max(0, Math.floor((Date.now() - new Date(fecha).getTime()) / 60_000));
  if (minutos < 1) return "Ahora";
  if (minutos < 60) return `Hace ${minutos} ${minutos === 1 ? "minuto" : "minutos"}`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} ${horas === 1 ? "hora" : "horas"}`;
  if (horas < 48) return "Ayer";
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "short" }).format(new Date(fecha));
}

export function ActividadComunidad() {
  const actividadesQuery = useQuery({
    queryKey: ["aurum-community-activity-home"],
    queryFn: async () => {
      const { data, error } = await supabasePublic
        .from("aurum_community_activity")
        .select("id,actor_name,activity_type,title,summary,created_at")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as CommunityActivity[];
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  const statsQuery = useQuery({
    queryKey: ["aurum-community-stats-home"],
    queryFn: async () => {
      const { data, error } = await supabasePublic
        .from("aurum_community_stats")
        .select("metric_key,label,value,prefix,suffix,display_order")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CommunityStat[];
    },
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    retry: 1,
  });

  const hasLiveActivities = (actividadesQuery.data?.length ?? 0) > 0;
  const activities = hasLiveActivities ? actividadesQuery.data! : previewActivities;
  const stats = statsQuery.data?.length ? statsQuery.data : previewStats;
  const previewMode = !hasLiveActivities;

  return (
    <section id="actividad-comunidad" aria-labelledby="actividad-comunidad-titulo" className="relative isolate overflow-hidden border-y border-[#e8e3d9] bg-[#fbfaf7]">
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-0 -z-10 size-[28rem] rounded-full bg-[#f5e8bd]/35 blur-3xl" />
      <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.22em] text-[#96732e]"><span className="size-1.5 rounded-full bg-[#c7a65b]" /> Red de talleres y profesionales</p>
            <h2 id="actividad-comunidad-titulo" className="mt-3 text-2xl font-extrabold tracking-tight text-[#17232d] sm:text-3xl lg:text-4xl">ACTIVIDAD DE LA COMUNIDAD</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#687580] sm:text-base">Descubre lo que está ocurriendo en la red de talleres y profesionales que forman parte de AURUM LAB.</p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e8dfca] bg-white px-3 py-2 text-[10px] font-semibold text-[#69747c]">
            <span className={`size-2 rounded-full ${hasLiveActivities ? "bg-emerald-500" : "bg-[#c7a65b]"}`} />
            {hasLiveActivities ? "Actividad reciente" : "Vista previa del feed"}
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(290px,.85fr)]">
          <div className="overflow-hidden rounded-3xl border border-[#e8e3d9] bg-white shadow-[0_12px_36px_rgba(23,35,45,.045)]">
            <div className="flex items-center justify-between border-b border-[#eeeae2] px-5 py-4 sm:px-6">
              <div>
                <h3 className="text-sm font-bold text-[#17232d]">Lo que está pasando</h3>
                <p className="mt-1 text-xs text-slate-500">Publicaciones, novedades y logros</p>
              </div>
              <span className="rounded-full bg-[#faf5e8] px-2.5 py-1 text-[10px] font-bold text-[#92702d]">Últimos movimientos</span>
            </div>
            <div className="divide-y divide-[#f0ede7]">
              {activities.map((activity, index) => {
                const Icon = activityIcons[activity.activity_type] ?? UsersRound;
                return (
                  <article key={activity.id} data-aurum-reveal className="group flex gap-3.5 px-5 py-4 transition-colors hover:bg-[#fdfbf6] sm:gap-4 sm:px-6">
                    <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl border border-[#eee4cb] bg-[#fbf6e9] text-[#98752f] transition duration-300 group-hover:-translate-y-0.5 group-hover:border-[#d8bd7b] group-hover:bg-[#f7edcf]">
                      <Icon className="size-[18px]" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-6 text-[#4c5861]"><strong className="font-bold text-[#17232d]">{activity.actor_name}</strong> {activity.title}</p>
                      {activity.summary && <p className="mt-1 text-xs leading-5 text-[#899198]">{activity.summary}</p>}
                    </div>
                    <time dateTime={activity.created_at} className="shrink-0 pt-1 text-right text-[10px] font-medium text-[#9aa0a4]">{tiempoRelativo(activity.created_at)}</time>
                  </article>
                );
              })}
            </div>
            {previewMode && <p className="border-t border-[#eeeae2] bg-[#fcfaf5] px-5 py-3 text-[10px] leading-5 text-[#8a7a58] sm:px-6">Contenido de demostración. Las publicaciones y sus fechas se sustituirán por actividad verificada al conectar los registros reales de la comunidad.</p>}
            {actividadesQuery.isError && <p className="px-5 py-2 text-[10px] text-slate-400">No se pudo consultar el feed; se muestra la vista previa.</p>}
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-3xl border border-[#e8e3d9] bg-white p-5 shadow-[0_12px_36px_rgba(23,35,45,.04)] sm:p-6">
              <div className="flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-xl bg-[#fff4d5] text-[#96732e]"><Globe2 className="size-[18px]" /></span>
                <div><h3 className="text-sm font-bold text-[#17232d]">La comunidad en cifras</h3><p className="mt-0.5 text-[10px] text-slate-500">Una red que sigue creciendo</p></div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {stats.map((stat, index) => (
                  <div key={stat.metric_key} className={`rounded-2xl border border-[#eeeae2] bg-[#fdfcf9] p-3 ${index === stats.length - 1 ? "col-span-2" : ""}`}>
                    <p className="text-xl font-extrabold tracking-tight text-[#17232d] sm:text-2xl">{stat.prefix ?? ""}{new Intl.NumberFormat("es").format(stat.value)}{stat.suffix ?? ""}</p>
                    <p className="mt-1 text-[10px] leading-4 text-[#77828a]">{stat.label}</p>
                  </div>
                ))}
              </div>
              {!statsQuery.data?.length && <p className="mt-3 text-[10px] leading-4 text-[#9a8b6b]">Cifras iniciales de referencia, editables desde la tabla de estadísticas.</p>}
            </div>

            <div className="relative overflow-hidden rounded-3xl bg-[#17232d] p-5 text-white shadow-[0_16px_40px_rgba(23,35,45,.14)] sm:p-6">
              <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full border border-[#d4aa19]/20" />
              <div aria-hidden="true" className="pointer-events-none absolute -right-2 -top-4 size-24 rounded-full border border-[#d4aa19]/20" />
              <p className="relative text-[10px] font-bold uppercase tracking-[.18em] text-[#e7cb78]">Tu próximo paso</p>
              <h3 className="relative mt-2 text-xl font-extrabold leading-tight">¿Quieres formar parte de la comunidad?</h3>
              <p className="relative mt-2 text-xs leading-5 text-slate-300">Crea el espacio de tu taller y conecta tu trabajo con una red de profesionales.</p>
              <RegistroTaller className="relative mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#f1d58b] px-4 py-3 text-xs font-extrabold text-[#17232d] transition hover:-translate-y-0.5 hover:bg-[#ffe7a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
