import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, BookOpen, GraduationCap, Search, Sparkles, ArrowRight, Store, UsersRound } from "lucide-react";
import { supabasePublic } from "@/integrations/supabase/client";

export const Route = createFileRoute("/catalogo-publico")({
  head: () => ({ meta: [
    { title: "Comunidad | Taller del Joyero" },
    { name: "description", content: "Descubre talleres, joyerías y propuestas de formación de la comunidad de Taller del Joyero." },
    { name: "robots", content: "index, follow" },
    { property: "og:title", content: "Comunidad | Taller del Joyero" },
    { property: "og:description", content: "Conecta con talleres y descubre catálogos y cursos publicados por la comunidad joyera." },
  ]}),
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
  identidad_nombre: string | null;
  identidad_logo: string | null;
  identidad_ciudad: string | null;
  identidad_sitio_web: string | null;
};

function ComunidadPublicaPage() {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "talleres" | "cursos">("todos");
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
      return !q || [item.nombre, item.descripcion, item.formacion_titulo, item.formacion_descripcion].filter(Boolean).join(" ").toLocaleLowerCase("es").includes(q);
    });
  }, [data, busqueda, filtro]);
  const talleres = data.filter((x) => x.tipo === "taller").length;
  const cursos = data.filter((x) => x.tipo === "curso").length;

  return <main className="min-h-screen bg-[#f7f4ef] text-[#211d19]">
    <header className="border-b border-[#211d1912]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link to="/auth" className="flex items-center gap-2 text-sm font-semibold"><span className="grid size-9 place-items-center rounded-full border border-[#a8895240] bg-white"><Sparkles className="size-4 text-[#96733d]" /></span>Taller del Joyero</Link>
        <Link to="/auth" className="rounded-full bg-[#211d19] px-4 py-2.5 text-xs font-semibold text-white">Acceso al ERP</Link>
      </div>
    </header>
    <section className="relative overflow-hidden border-b border-[#a8895220]">
      <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-36 size-[28rem] rounded-full bg-[#c5a66c]/15 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-12 sm:px-8 sm:pb-14 sm:pt-16">
        <div className="max-w-3xl">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.28em] text-[#96733d]"><UsersRound className="size-4" /> Comunidad joyera</p>
          <h1 className="mt-4 font-display text-4xl leading-[1.08] tracking-tight sm:text-6xl">Talento, talleres y nuevas ideas para descubrir.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#746b62] sm:text-base">Conoce a los participantes de nuestro ecosistema, visita los catálogos que han publicado y encuentra cursos para seguir aprendiendo el oficio.</p>
        </div>
        <div className="mt-8 grid max-w-xl grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-[#a8895225] bg-white/75 p-4 sm:p-5"><Store className="size-5 text-[#96733d]" /><p className="mt-3 text-2xl font-semibold">{isLoading ? "—" : talleres}</p><p className="mt-1 text-xs text-[#746b62]">Talleres y joyerías</p></div>
          <div className="rounded-2xl border border-[#a8895225] bg-white/75 p-4 sm:p-5"><GraduationCap className="size-5 text-[#96733d]" /><p className="mt-3 text-2xl font-semibold">{isLoading ? "—" : cursos}</p><p className="mt-1 text-xs text-[#746b62]">Propuestas formativas</p></div>
        </div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#96733d]">Explora el ecosistema</p><h2 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">Encuentra tu próxima conexión</h2></div>
        <label className="flex min-h-12 w-full items-center gap-3 rounded-full border border-[#211d1920] bg-white px-4 lg:max-w-md"><Search className="size-4 shrink-0 text-[#96733d]" /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar talleres, joyerías o cursos…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9a9187]" /></label>
      </div>
      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filtrar comunidad">
        {([{id:"todos",label:"Todo"},{id:"talleres",label:"Talleres y joyerías"},{id:"cursos",label:"Cursos y formación"}] as const).map((item)=><button key={item.id} type="button" onClick={()=>setFiltro(item.id)} aria-pressed={filtro===item.id} className={`rounded-full border px-4 py-2.5 text-xs font-semibold transition ${filtro===item.id?"border-[#211d19] bg-[#211d19] text-white":"border-[#211d1920] bg-white text-[#5e554c] hover:border-[#a88952]"}`}>{item.label}</button>)}
      </div>
      {isLoading ? <div className="grid gap-5 py-8 sm:grid-cols-2 lg:grid-cols-3">{[0,1,2].map(n=><div key={n} className="h-64 animate-pulse rounded-2xl border border-[#211d1910] bg-white/70" />)}</div>
      : isError ? <div className="mt-8 rounded-2xl border border-[#b453091f] bg-white p-6"><h3 className="font-semibold">No pudimos cargar la comunidad</h3><p className="mt-2 text-sm text-[#746b62]">La interfaz está preparada; falta habilitar la consulta pública segura en la base de datos. No se muestran datos inventados.</p></div>
      : entradas.length===0 ? <div className="mt-8 rounded-2xl border border-[#211d1915] bg-white/75 px-6 py-12 text-center"><BookOpen className="mx-auto size-8 text-[#96733d]" /><h3 className="mt-4 text-lg font-semibold">Aún no hay resultados para mostrar</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#746b62]">{busqueda?"Prueba con otro término de búsqueda.":"Los talleres y profesores aparecerán aquí cuando haya información pública disponible."}</p></div>
      : <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{entradas.map(item=>{
        const esCurso=item.tipo==="curso";
        const titulo=esCurso?(item.formacion_titulo||"Cursos y formación"):item.nombre;
        const identidadNombre = item.identidad_nombre?.trim() || null;
        const descripcion=esCurso?(item.formacion_descripcion||item.descripcion):item.descripcion;
        const href=esCurso&&item.slug?`/formacion/${encodeURIComponent(item.slug)}`:item.catalogo_visible&&item.slug?`/${encodeURIComponent(item.slug)}`:null;
        return <article key={`${item.tipo}-${item.participante_id}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#211d1915] bg-white shadow-[0_8px_30px_rgba(40,30,20,.035)] transition duration-300 hover:-translate-y-1 hover:border-[#a8895255] hover:shadow-[0_18px_45px_rgba(40,30,20,.09)]">
          <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-[#f5f0e7] via-[#fcfaf6] to-[#e9deca]">{item.imagen_url?<img src={item.imagen_url} alt="" loading="lazy" className="size-full object-contain p-5 sm:p-6 transition duration-500 group-hover:scale-[1.02]" />:<div className="flex size-20 items-center justify-center rounded-2xl border border-[#a8895235] bg-white/70">{esCurso?<GraduationCap className="size-9 text-[#96733d]" />:<Building2 className="size-9 text-[#96733d]" />}</div>}<span className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[10px] font-semibold text-[#5e554c]">{esCurso?"Formación":"Taller / joyería"}</span></div>
          <div className="flex flex-1 flex-col p-5"><h3 className="line-clamp-2 min-h-[3.5rem] font-display text-2xl leading-tight">{titulo}</h3>{!esCurso&&(identidadNombre||item.identidad_logo||item.identidad_ciudad||item.identidad_sitio_web)?<div className="mt-3 flex items-center gap-3 rounded-xl border border-[#a8895225] bg-[#fbf9f5] p-3">{item.identidad_logo?<img src={item.identidad_logo} alt="" loading="lazy" className="size-11 shrink-0 rounded-lg border border-[#a8895225] bg-white object-contain p-1.5"/>:<div className="grid size-11 shrink-0 place-items-center rounded-lg border border-[#a8895225] bg-white"><Store className="size-5 text-[#96733d]"/></div>}<div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#96733d]">Identidad comercial</p>{identidadNombre?<p className="truncate text-sm font-semibold text-[#211d19]">{identidadNombre}</p>:null}{item.identidad_ciudad?<p className="truncate text-xs text-[#746b62]">{item.identidad_ciudad}</p>:null}{item.identidad_sitio_web?<a href={item.identidad_sitio_web} target="_blank" rel="noreferrer" className="mt-1 inline-block truncate text-xs font-medium text-[#96733d] hover:underline">{item.identidad_sitio_web.replace(/^https?:\/\//,"")}</a>:null}</div></div>:null}<p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-[#746b62]">{descripcion||(esCurso?"Conoce esta propuesta de aprendizaje para la comunidad joyera.":"Conoce a este participante de la comunidad joyera.")}</p>
            {!esCurso&&item.catalogo_visible&&item.productos_publicados>0&&<p className="mt-3 text-xs text-[#96733d]">{item.productos_publicados} {item.productos_publicados===1?"producto publicado":"productos publicados"}</p>}
            <div className="mt-auto border-t border-[#211d190d] pt-4">{href?<Link to={href as never} className="inline-flex items-center gap-2 text-xs font-semibold text-[#211d19] transition group-hover:text-[#96733d]">{esCurso?"Conocer cursos":"Explorar catálogo"} <ArrowRight className="size-4 transition group-hover:translate-x-1" /></Link>:<span className="inline-flex items-center gap-2 text-xs text-[#92887d]"><Building2 className="size-3.5 shrink-0" /> Perfil de comunidad · catálogo no publicado</span>}</div>
          </div>
        </article>;
      })}</div>}
    </section>
    <footer className="border-t border-[#211d1912]"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-xs text-[#8b8176] sm:flex-row sm:items-center sm:justify-between sm:px-8"><span>Comunidad · Taller del Joyero</span><Link to="/auth" className="inline-flex items-center gap-2 font-semibold text-[#5e554c] hover:text-[#96733d]">Forma parte del ecosistema <ArrowRight className="size-3.5" /></Link></div></footer>
  </main>;
}
