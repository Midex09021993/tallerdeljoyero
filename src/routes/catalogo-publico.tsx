import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, BookOpen, GraduationCap, Search, Sparkles, ArrowRight, Store, UsersRound } from "lucide-react";
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

type Entrada = {
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
};

export function ComunidadPublicaPage() {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<"talleres" | "cursos">("talleres");
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["directorio-comunidad-publica"],
    queryFn: async () => {
      const { data, error } = await (supabasePublic as any).rpc("obtener_directorio_comunidad_publica");
      if (error) throw error;
      return (data ?? []) as Entrada[];
    },
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
  const talleres = data.filter((x) => x.tipo === "taller").length;
  const cursos = data.filter((x) => x.tipo === "curso").length;

  return <main className="min-h-screen bg-[#f8f9fb] text-[#17232d]">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-[#17232d]"><span className="grid size-9 place-items-center rounded-xl bg-[#f8c928] text-[#17232d]"><Sparkles className="size-4" /></span>AURUM LAB</Link>
        <div className="flex items-center gap-2"><Link to="/" className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#d4aa19] bg-white px-4 py-2 text-xs font-semibold text-[#17232d] transition hover:bg-[#fff8d8]">Volver a AURUM LAB</Link><Link to="/auth" className="rounded-full bg-[#17232d] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#293b49]">Ingresar</Link></div>
      </div>
    </header>
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#987400]">El universo AURUM</p><h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">Directorio de talleres y joyerías de la comunidad joyera</h1><p className="mt-2 text-sm text-slate-600">Identidad, oficio y visión en cada taller.</p></div>
        <label className="flex min-h-12 w-full items-center gap-3 rounded-full border border-slate-200 bg-white px-4 lg:max-w-md"><Search className="size-4 shrink-0 text-[#987400]" /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar talleres, joyerías o cursos…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9a9187]" /></label>
      </div>
      <div className="mt-7 flex flex-wrap gap-2 border-b border-slate-200 pb-5" role="group" aria-label="Filtrar comunidad">
        {([{id:"talleres",label:"Talleres y joyerías"},{id:"cursos",label:"Cursos y formación"}] as const).map((item)=><button key={item.id} type="button" onClick={()=>setFiltro(item.id)} aria-pressed={filtro===item.id} className={"rounded-full border px-5 py-3 text-xs font-semibold transition duration-200 " + (filtro===item.id ? "border-[#17232d] bg-[#17232d] text-white shadow-[0_4px_14px_rgba(23,35,45,.12)]" : "border-slate-200 bg-white/70 text-slate-600 hover:border-[#d4aa19] hover:bg-white")}>{item.label}</button>)}
      </div>
      {isLoading ? <div className="grid gap-5 py-8 sm:grid-cols-2 lg:grid-cols-3">{[0,1,2].map(n=><div key={n} className="h-64 animate-pulse rounded-2xl border border-[#211d1910] bg-white/70" />)}</div>
      : isError ? <div className="mt-8 rounded-2xl border border-[#b453091f] bg-white p-6"><h3 className="font-semibold">No pudimos cargar la comunidad</h3><p className="mt-2 text-sm text-slate-600">La interfaz está preparada; falta habilitar la consulta pública segura en la base de datos. No se muestran datos inventados.</p></div>
      : entradas.length===0 ? <div className="mt-8 rounded-2xl border border-slate-200 bg-white/75 px-6 py-12 text-center"><BookOpen className="mx-auto size-8 text-[#987400]" /><h3 className="mt-4 text-lg font-semibold">Aún no hay resultados para mostrar</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{busqueda?"Prueba con otro término de búsqueda.":"Los talleres y profesores aparecerán aquí cuando haya información pública disponible."}</p></div>
      : <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{entradas.map(item=>{
        const esCurso=item.tipo==="curso";
        const titulo=esCurso?(item.formacion_titulo||"Cursos y formación"):item.nombre;
        const identidadNombre = item.identidad_nombre?.trim() || null;
        const descripcion=esCurso?(item.formacion_descripcion||item.descripcion):item.descripcion;
        const href=esCurso&&item.slug?`/formacion/${encodeURIComponent(item.slug)}`:item.catalogo_visible&&item.slug?`/${encodeURIComponent(item.slug)}`:null;
        return <article key={`${item.tipo}-${item.participante_id}`} className="group flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_10px_35px_rgba(40,30,20,.035)] transition duration-300 hover:-translate-y-1 hover:border-[#d4aa19] hover:shadow-[0_24px_55px_rgba(40,30,20,.10)]">
          <div className="relative flex h-52 items-center justify-center overflow-hidden border-b border-slate-200 bg-[radial-gradient(ellipse_at_50%_42%,rgba(255,255,255,1),rgba(248,249,251,.96)_62%,rgba(238,242,246,.9))] sm:h-56">{item.imagen_url?<img src={item.imagen_url} alt="" loading="lazy" className="size-full object-contain p-6 sm:p-8 transition duration-700 group-hover:scale-[1.035]" />:<div className="flex size-20 items-center justify-center rounded-full border border-[#d4aa19]/40 bg-white/75 shadow-[0_5px_20px_rgba(23,35,45,.06)]">{esCurso?<GraduationCap className="size-8 text-[#987400]" />:<Building2 className="size-8 text-[#987400]" />}</div>}<span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-[#d4aa19]/50 bg-white/95 px-3 py-2 text-[9px] font-bold uppercase tracking-[.13em] text-slate-600"><span className="size-1.5 rounded-full bg-[#f8c928]" />{esCurso?"Formación":"Taller / joyería"}</span><span className="absolute bottom-4 right-4 text-[9px] font-semibold uppercase tracking-[.2em] text-slate-500">AURUM LAB</span></div>
          <div className="flex flex-1 flex-col p-6 sm:p-7"><h3 className="line-clamp-2 min-h-[3.5rem] font-display text-[1.7rem] leading-tight tracking-[-.025em]">{titulo}</h3>{!esCurso&&(identidadNombre||item.identidad_logo||item.identidad_ciudad||item.identidad_pais||item.identidad_sitio_web)?<div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">{item.identidad_logo?<img src={item.identidad_logo} alt="" loading="lazy" className="size-11 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-1.5"/>:<div className="grid size-11 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white"><Store className="size-5 text-[#987400]"/></div>}<div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[.19em] text-[#987400]">Casa de joyería</p>{identidadNombre?<p className="truncate text-sm font-semibold text-[#17232d]">{identidadNombre}</p>:null}{item.identidad_ciudad||item.identidad_pais?<p className="truncate text-xs text-slate-600">{[item.identidad_ciudad,item.identidad_pais].filter(Boolean).join(" · ")}</p>:null}{item.identidad_sitio_web&&/^https?:\/\//i.test(item.identidad_sitio_web.trim())?<a href={item.identidad_sitio_web.trim()} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block max-w-full truncate text-xs font-medium text-[#987400] hover:underline">{item.identidad_sitio_web.trim().replace(/^https?:\/\//i,"")}</a>:null}</div></div>:null}<p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-600">{descripcion||(esCurso?"Conoce esta propuesta de aprendizaje para la comunidad joyera.":"Conoce a este participante de la comunidad joyera.")}</p>
            {!esCurso&&item.catalogo_visible&&item.productos_publicados>0&&<><p className="mt-3 text-xs text-[#987400]">{item.productos_publicados} {item.productos_publicados===1?"producto publicado":"productos publicados"}</p>{(item.productos_destacados??[]).length>0&&<div className="mt-3 grid grid-cols-3 gap-2" aria-label="Selección de joyas publicadas">{(item.productos_destacados??[]).slice(0,3).map((producto,index)=><div key={producto.slug||producto.nombre||index} className="overflow-hidden rounded-lg border border-slate-200 bg-white transition-colors hover:border-[#d4aa19]">{producto.imagen_url?<img src={producto.imagen_url} alt={producto.nombre} loading="lazy" className="aspect-square w-full bg-white object-contain"/>:<div className="grid aspect-square place-items-center"><Store className="size-5 text-[#b99a62]"/></div>}<p className="truncate px-2 pb-2 text-[10px] text-slate-600">{producto.nombre}</p></div>)}</div>}</>}
            <div className="mt-auto border-t border-slate-200 pt-5">{href?<Link to={href as never} className="inline-flex items-center gap-2 text-xs font-semibold text-[#987400] transition hover:text-[#987400]">{esCurso?"Descubrir formación":"Descubrir el taller"} <ArrowRight className="size-4 transition group-hover:translate-x-1" /></Link>:<span className="inline-flex items-center gap-2 text-xs text-slate-500"><Building2 className="size-3.5 shrink-0" /> Perfil de comunidad · catálogo no publicado</span>}</div>
          </div>
        </article>;
      })}</div>}
    </section>
    <section className="border-y border-slate-200 bg-[#17232d] text-white"><div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8 sm:py-14 lg:flex-row lg:items-center lg:justify-between"><div className="max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[.28em] text-[#f8c928]">Crece con AURUM LAB</p><h2 className="mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl">Tu oficio merece ser descubierto.</h2><p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">Presenta tu taller, comparte tu catálogo y acerca tus creaciones a más personas de la comunidad joyera.</p></div><Link to="/auth" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-full bg-[#f8c928] px-6 py-3 text-xs font-bold text-[#17232d] transition hover:bg-[#ffe36b]">Acceder a AURUM LAB <ArrowRight className="size-4" /></Link></div></section>
    <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8"><span className="font-semibold uppercase tracking-[.18em]">AURUM LAB <span className="mx-2 text-[#b99a62]">·</span> Comunidad joyera</span><Link to="/auth" className="inline-flex items-center gap-2 font-semibold text-slate-600 hover:text-[#987400]">Acceso al ecosistema <ArrowRight className="size-3.5" /></Link></div></footer>
  </main>;
}
