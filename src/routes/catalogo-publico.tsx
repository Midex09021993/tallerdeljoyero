import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, BookOpen, Search, ArrowRight, Award, Medal, Trophy, Sparkles, Crown } from "lucide-react";
import { supabasePublic } from "@/integrations/supabase/client";

export const Route = createFileRoute("/catalogo-publico")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://www.tallerdeljoyero.com/catalogo-publico" }],
    meta: [
      { title: "Directorio público de talleres y formación | AURUM LAB" },
      { name: "description", content: "Explora talleres, joyerías y propuestas de formación publicadas en el directorio público de AURUM LAB, la plataforma digital especializada en joyería." },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Directorio público de talleres y formación | AURUM LAB" },
      { property: "og:description", content: "Descubre talleres, joyerías y cursos de la comunidad profesional joyera en AURUM LAB." },
      { property: "og:url", content: "https://www.tallerdeljoyero.com/catalogo-publico" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ComunidadPublicaPage,
});

export type EntradaPublica = {
  tipo: "taller" | "curso";
  participante_id: string;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  slug: string | null;
  catalogo_visible: boolean;
  formacion_titulo: string | null;
  formacion_descripcion: string | null;
  productos_publicados: number;
  productos_destacados?: Array<{ nombre: string; imagen_url: string | null; slug: string | null }> | null;
  identidad_nombre: string | null;
  identidad_logo: string | null;
  identidad_ciudad: string | null;
  identidad_pais: string | null;
  identidad_sitio_web: string | null;
  ranking_score?: number | null;
  ranking_level?: "none" | "bronze" | "silver" | "gold" | "diamond" | null;
  ranking_diamond_position?: number | null;
};

export function ComunidadPublicaPage({ initialData }: { initialData?: EntradaPublica[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<"talleres" | "cursos">("talleres");
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["directorio-comunidad-publica"],
    queryFn: async () => {
      const { data, error } = await (supabasePublic as any).rpc("obtener_directorio_comunidad_publica_ranking");
      if (error) throw error;
      return (data ?? []) as EntradaPublica[];
    },
    initialData,
    staleTime: 60_000,
    retry: 1,
  });
  const entradas = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase("es");
    return data.filter((item) => {
      if (filtro === "talleres" && item.tipo !== "taller") return false;
      if (filtro === "cursos" && item.tipo !== "curso") return false;
      return !q || [item.nombre, item.descripcion, item.formacion_titulo, item.formacion_descripcion, item.identidad_nombre, item.identidad_ciudad, item.identidad_pais, item.identidad_sitio_web].filter(Boolean).join(" ").toLocaleLowerCase("es").includes(q);
    });
  }, [data, busqueda, filtro]);
  const paises = [...new Set(data.filter(x => x.tipo === "taller").map(x => x.identidad_pais?.trim()).filter((x): x is string => Boolean(x)))].sort((a,b)=>a.localeCompare(b,"es"));
  const [paisFiltro, setPaisFiltro] = useState("todos");
  const [orden, setOrden] = useState<"alfabetico"|"productos"|"ranking">("ranking");
  const entradasOrdenadas = useMemo(() => {
    const lista = entradas.filter(item => filtro !== "talleres" || paisFiltro === "todos" || item.identidad_pais?.trim() === paisFiltro);
    return [...lista].sort((a,b) => {
      if (orden === "ranking") return Number(b.ranking_score ?? 0) - Number(a.ranking_score ?? 0);
      if (orden === "productos" && a.tipo === "taller" && b.tipo === "taller") return b.productos_publicados - a.productos_publicados;
      const nameA = a.tipo === "curso" ? (a.formacion_titulo || a.nombre) : (a.identidad_nombre || a.nombre);
      const nameB = b.tipo === "curso" ? (b.formacion_titulo || b.nombre) : (b.identidad_nombre || b.nombre);
      return nameA.localeCompare(nameB,"es");
    });
  }, [entradas, filtro, paisFiltro, orden]);

  return <main className="min-h-screen bg-[#f8f9fb] text-[#17232d]">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5 text-sm font-semibold text-[#17232d]"><img src="/brand/aurum-symbol.svg" alt="AURUM LAB" width="36" height="36" className="size-9 shrink-0 object-contain" /><span className="leading-tight">AURUM LAB</span></Link>
        <div className="flex items-center gap-2"><Link to="/" className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#d4aa19] bg-white px-4 py-2 text-xs font-semibold text-[#17232d] transition hover:bg-[#fff8d8]">Volver a AURUM LAB</Link><Link to="/auth" className="rounded-full bg-[#17232d] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#293b49]">Ingresar</Link></div>
      </div>
    </header>
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#987400]">El universo AURUM</p><h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">Directorio de talleres y joyerías de la comunidad joyera</h1><p className="mt-2 text-sm text-slate-600">Identidad, oficio y visión en cada taller.</p></div>
        <label className="flex min-h-12 w-full items-center gap-3 rounded-full border border-slate-200 bg-white px-4 lg:max-w-md"><Search className="size-4 shrink-0 text-[#987400]" /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar talleres, joyerías o cursos…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9a9187]" /></label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {filtro === "talleres" ? <label className="flex items-center gap-2 text-xs text-slate-600">País<select value={paisFiltro} onChange={e=>setPaisFiltro(e.target.value)} className="min-h-10 rounded-full border border-slate-200 bg-white px-3 text-xs text-[#17232d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c9a227]"><option value="todos">Todos los países</option>{paises.map(p=><option key={p} value={p}>{p}</option>)}</select></label> : null}
        <label className="flex items-center gap-2 text-xs text-slate-600">Ordenar<select value={orden} onChange={e=>setOrden(e.target.value as typeof orden)} className="min-h-10 rounded-full border border-slate-200 bg-white px-3 text-xs text-[#17232d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c9a227]"><option value="ranking">Mejor ranking</option><option value="alfabetico">Nombre A–Z</option><option value="productos">Más productos</option></select></label>
        <span className="ml-auto text-xs font-medium text-slate-500" aria-live="polite">{entradasOrdenadas.length} {entradasOrdenadas.length===1?"resultado":"resultados"}</span>
      </div>
      <div className="mt-7 flex flex-wrap gap-2 border-b border-slate-200 pb-5" role="group" aria-label="Filtrar comunidad">
        {([{id:"talleres",label:"Talleres y joyerías"},{id:"cursos",label:"Cursos y formación"}] as const).map((item)=><button key={item.id} type="button" onClick={()=>setFiltro(item.id)} aria-pressed={filtro===item.id} className={"rounded-full border px-5 py-3 text-xs font-semibold transition duration-200 " + (filtro===item.id ? "border-[#17232d] bg-[#17232d] text-white shadow-[0_4px_14px_rgba(23,35,45,.12)]" : "border-slate-200 bg-white/70 text-slate-600 hover:border-[#d4aa19] hover:bg-white")}>{item.label}</button>)}
      </div>
      {isLoading ? <div className="grid gap-5 py-8 sm:grid-cols-2 lg:grid-cols-3">{[0,1,2].map(n=><div key={n} className="h-64 animate-pulse rounded-2xl border border-[#211d1910] bg-white/70" />)}</div>
      : isError ? <div className="mt-8 rounded-2xl border border-[#b453091f] bg-white p-6"><h3 className="font-semibold">No pudimos cargar la comunidad</h3><p className="mt-2 text-sm text-slate-600">La interfaz está preparada; falta habilitar la consulta pública segura en la base de datos. No se muestran datos inventados.</p></div>
      : entradasOrdenadas.length===0 ? <div className="mt-8 rounded-2xl border border-slate-200 bg-white/75 px-6 py-12 text-center"><BookOpen className="mx-auto size-8 text-[#987400]" /><h3 className="mt-4 text-lg font-semibold">Aún no hay resultados para mostrar</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{busqueda?"Prueba con otro término de búsqueda.":"Los talleres y profesores aparecerán aquí cuando haya información pública disponible."}</p></div>
      : <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{entradasOrdenadas.map(item=>{
        const esCurso = item.tipo === "curso";
        const titulo = esCurso ? (item.formacion_titulo || "Cursos y formación") : (item.identidad_nombre?.trim() || item.nombre);
        const descripcion = esCurso ? (item.formacion_descripcion || item.descripcion) : item.descripcion;
        const href = esCurso && item.slug ? `/formacion/${encodeURIComponent(item.slug)}` : item.catalogo_visible && item.slug ? `/${encodeURIComponent(item.slug)}` : null;
        const logo = esCurso ? item.imagen_url : (item.identidad_logo || item.imagen_url);
        const country = item.identidad_pais?.trim() || "";
        const city = item.identidad_ciudad?.trim() || "";
        const website = item.identidad_sitio_web?.trim() || "";
        const initials = titulo.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("es") || "").join("") || "AL";
        const category = esCurso ? "Curso y formación" : "Taller / joyería";
        const count = esCurso ? null : item.productos_publicados;
        return <article key={`${item.tipo}-${item.participante_id}`} className={`group flex h-full flex-col overflow-hidden rounded-[1.35rem] border bg-white shadow-[0_8px_28px_rgba(40,30,20,.045)] transition duration-300 motion-reduce:transition-none hover:-translate-y-1 hover:border-[#d4aa19] hover:shadow-[0_20px_45px_rgba(40,30,20,.10)] ${item.ranking_diamond_position === 1 ? "border-[#d4aa19] shadow-[0_8px_30px_rgba(212,170,25,.13)]" : "border-slate-200"}`}>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-[#fbfaf7] px-5 py-3">
            <span className="inline-flex items-center rounded-full border border-[#d4aa19]/35 bg-[#fff8e7] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-[#8c6800]">{esCurso ? "Formación" : "Comunidad"}</span>
            <span className="text-[10px] font-medium text-slate-500">{category}</span>
          </div>
          <div className="flex flex-1 flex-col p-5 sm:p-6">
            <div className="flex items-center gap-3">
              {logo ? <img src={logo} alt={`Logo de ${titulo}`} loading="lazy" className="size-14 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-2"/> : <div aria-label={`Iniciales de ${titulo}`} className="grid size-14 shrink-0 place-items-center rounded-xl border border-[#d4aa19]/35 bg-[#fff4d2] text-lg font-semibold text-[#987400]">{initials}</div>}
              <div className="min-w-0 flex-1"><h2 className="line-clamp-2 font-display text-xl leading-tight tracking-[-.02em] text-[#17232d]">{titulo}</h2><p className="mt-1 truncate text-xs text-slate-500">{[city,country].filter(Boolean).join(" · ") || "Comunidad joyera"}</p></div>
            </div>
            <p className="mt-4 line-clamp-2 min-h-[3rem] text-sm leading-6 text-slate-600">{descripcion?.trim() || "Descripción pendiente de completar."}</p>
            {(() => {
              const level = item.ranking_level ?? "none";
              const position = item.ranking_diamond_position ?? null;
              const isDiamond = Boolean(position);
              const isFirst = position === 1;
              const isSecond = position === 2;
              const isThird = position === 3;
              const MedalIcon = isFirst ? Crown : isDiamond ? Medal : level === "gold" ? Award : level === "silver" ? Medal : level === "bronze" ? Medal : Sparkles;
              const medalLabel = isFirst ? "LÍDER DEL RANKING · TOP 1" : isDiamond ? `DIAMANTE · TOP ${position}` : level === "gold" ? "ORO" : level === "silver" ? "PLATA" : level === "bronze" ? "BRONCE" : "EN EVALUACIÓN";
              const medalTone = isFirst ? "border-[#c69200] bg-gradient-to-r from-[#fff0b8] via-[#ffe28a] to-[#fff5d1] text-[#765300] shadow-[0_4px_18px_rgba(212,170,25,0.18)]" : isSecond ? "border-slate-300 bg-gradient-to-r from-slate-100 to-white text-slate-600" : isThird ? "border-[#c68a56]/60 bg-gradient-to-r from-[#f8e5d3] to-[#fffaf5] text-[#8a552b]" : isDiamond ? "border-[#d4aa19]/60 bg-[#fff8e7] text-[#8c6800]" : level === "gold" ? "border-[#d4aa19]/50 bg-[#fff8e7] text-[#8c6800]" : level === "silver" ? "border-slate-300 bg-slate-50 text-slate-600" : level === "bronze" ? "border-[#c68a56]/40 bg-[#fbf0e5] text-[#8a552b]" : "border-slate-200 bg-white text-slate-500";
              return <div className={`mt-4 flex items-center gap-3 rounded-xl border p-3 ${isFirst ? "p-3.5" : "p-3"} ${medalTone}`}>
                <span className={`grid shrink-0 place-items-center rounded-lg border border-current/20 bg-white/85 shadow-sm ${isFirst ? "size-11" : "size-10"}`}><MedalIcon className={isFirst ? "size-6" : "size-5"} /></span>
                <div className="min-w-0 flex-1">
                  <p className={`text-[10px] font-bold uppercase tracking-[.14em] ${isFirst ? "text-[#6d4b00]" : ""}`}>{esCurso ? "Formación AURUM" : isFirst ? "Ranking AURUM · CAMPEÓN" : "Ranking AURUM"}</p>
                  <p className={`mt-0.5 text-xs font-bold ${isFirst ? "text-[#765300]" : ""}`}>{esCurso ? "Comunidad formativa" : medalLabel}</p>
                </div>
                {!esCurso && <span className={`shrink-0 rounded-full border border-current/25 bg-white/85 px-2.5 py-1 text-[10px] font-bold tabular-nums ${isFirst ? "px-3 py-1.5 text-[11px]" : ""}`}>{Number(item.ranking_score ?? 0).toFixed(0)}/100</span>}
              </div>;
            })()}
            <div className="mt-4 flex min-h-7 items-center justify-between gap-3 text-xs text-slate-500">
              {count !== null ? <span>{count} {count === 1 ? "producto" : "productos"}</span> : <span>Propuesta formativa</span>}
              {website && /^https?:\/\//i.test(website) ? <a href={website} target="_blank" rel="noopener noreferrer" className="truncate text-[#987400] hover:underline">Sitio web</a> : <span>{esCurso ? "Curso" : "Perfil público"}</span>}
            </div>
            <div className="mt-auto border-t border-slate-200 pt-5">
              {href ? <Link to={href as never} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d4aa19]/70 bg-white px-4 text-xs font-semibold text-[#7c5c00] transition hover:bg-[#fff8e7]">{esCurso ? "Ver formación" : "Ver catálogo"} <ArrowRight className="size-4 transition group-hover:translate-x-1"/></Link> : <span className="inline-flex items-center gap-2 text-xs text-slate-500"><Building2 className="size-3.5 shrink-0"/> Perfil público · catálogo no publicado</span>}
            </div>
          </div>
        </article>;      })}</div>}
    </section>
    <section className="border-y border-slate-200 bg-[#17232d] text-white"><div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8 sm:py-14 lg:flex-row lg:items-center lg:justify-between"><div className="max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[.28em] text-[#f8c928]">Crece con AURUM LAB</p><h2 className="mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl">Tu oficio merece ser descubierto.</h2><p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">Presenta tu taller, comparte tu catálogo y acerca tus creaciones a más personas de la comunidad joyera.</p></div><Link to="/auth" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-full bg-[#f8c928] px-6 py-3 text-xs font-bold text-[#17232d] transition hover:bg-[#ffe36b]">Acceder a AURUM LAB <ArrowRight className="size-4" /></Link></div></section>
    <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8"><span className="font-semibold uppercase tracking-[.18em]">AURUM LAB <span className="mx-2 text-[#b99a62]">·</span> Comunidad joyera</span><Link to="/auth" className="inline-flex items-center gap-2 font-semibold text-slate-600 hover:text-[#987400]">Acceso al ecosistema <ArrowRight className="size-3.5" /></Link></div></footer>
  </main>;
}
