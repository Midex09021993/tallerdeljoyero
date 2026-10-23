import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Box, Gem, RefreshCw, Sparkles } from "lucide-react";
import { supabasePublic } from "@/integrations/supabase/client";

type JoyaPublicada = {
  participante_id: string;
  catalogo_slug: string;
  taller: string;
  producto_id: string;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  imagen_principal_url: string | null;
  galeria: unknown;
  precio_desde: number | null;
  moneda: string;
  destacado: boolean;
};

const obtenerGaleriaPublica = async (): Promise<JoyaPublicada[]> => {
  const rpc = supabasePublic.rpc as unknown as (
    nombre: string,
    args?: Record<string, never>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await rpc("obtener_galeria_joyas_publica");
  if (error) throw error;
  return Array.isArray(data) ? data as JoyaPublicada[] : [];
};

export const Route = createFileRoute("/galeria-joyas")({
  head: () => ({
    meta: [
      { title: "Galería de Joyas | Taller del Joyero" },
      {
        name: "description",
        content: "Descubre joyas publicadas por talleres, consulta sus detalles y explora modelos 3D disponibles.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Galería de Joyas | Taller del Joyero" },
      {
        property: "og:description",
        content: "Una selección de joyas publicadas por sus talleres, con fichas comerciales y visualización 3D cuando esté disponible.",
      },
    ],
  }),
  component: GaleriaJoyasPage,
});

function GaleriaJoyasPage() {
  const { data: joyas = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["galeria-joyas-publica"],
    queryFn: obtenerGaleriaPublica,
    staleTime: 60_000,
    retry: 1,
  });

  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#211d19]">
      <header className="border-b border-[#b89b5e]/25 bg-[#211d19] text-[#f7f2e8]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-[#b89b5e]/40 bg-white/5"><Gem className="size-5 text-[#d7bd86]" /></span>
            <span><strong className="block text-xs font-extrabold tracking-[.13em] sm:text-sm">TALLER DEL JOYERO</strong><span className="mt-0.5 block text-[10px] tracking-[.1em] text-white/55">GALERÍA DE JOYAS</span></span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4" aria-label="Navegación principal">
            <Link to="/" className="rounded-full px-3 py-2 text-xs text-white/75 transition hover:bg-white/10 hover:text-white">Inicio</Link>
            <Link to="/catalogo-publico" className="rounded-full px-3 py-2 text-xs text-white/75 transition hover:bg-white/10 hover:text-white">Comunidad</Link>
            <Link to="/auth" className="rounded-full bg-[#c9ad73] px-4 py-2.5 text-xs font-semibold text-[#211d19] transition hover:bg-[#dfc994]">Acceder</Link>
          </nav>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b border-[#b89b5e]/20">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_20%,rgba(190,159,96,.2),transparent_38%),radial-gradient(ellipse_at_5%_90%,rgba(190,159,96,.1),transparent_35%)]" />
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.26em] text-[#96733d] sm:text-xs"><Sparkles className="size-4" /> Diseños publicados por sus talleres</p>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-medium leading-tight tracking-[-.04em] sm:text-6xl">Galería de <span className="text-[#9a7944]">Joyas</span></h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#746b62] sm:text-base sm:leading-8">Descubre piezas, conoce sus detalles y abre las fichas para explorar el modelo 3D cuando el taller lo haya vinculado.</p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-[#746b62]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#b89b5e]/30 bg-white/70 px-3 py-2"><Box className="size-4 text-[#96733d]" /> Visor 3D en modelos disponibles</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#b89b5e]/30 bg-white/70 px-3 py-2"><Gem className="size-4 text-[#96733d]" /> Solo publicaciones públicas</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#96733d]">Selección abierta</p><h2 className="mt-2 font-display text-2xl sm:text-3xl">Joyas para descubrir</h2></div>
          {!isLoading && !isError ? <span className="text-xs text-[#81766a]">{joyas.length} {joyas.length === 1 ? "joya publicada" : "joyas publicadas"}</span> : null}
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="overflow-hidden rounded-2xl border border-[#b89b5e]/20 bg-white/70"><div className="aspect-square animate-pulse bg-[#e9e3da]" /><div className="space-y-3 p-5"><div className="h-3 w-1/3 animate-pulse rounded bg-[#e9e3da]" /><div className="h-5 w-2/3 animate-pulse rounded bg-[#e9e3da]" /></div></div>)}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-[#b89b5e]/25 bg-white/80 px-6 py-12 text-center">
            <Gem className="mx-auto size-9 text-[#96733d]" />
            <h3 className="mt-4 text-lg font-semibold">La galería todavía no está disponible</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#746b62]">No se pudo cargar el catálogo público. Puede faltar aplicar la configuración SQL de esta galería en Lovable Cloud.</p>
            <button type="button" onClick={() => void refetch()} disabled={isFetching} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#211d19] px-5 py-3 text-xs font-semibold text-white disabled:opacity-60"><RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} /> Volver a intentar</button>
          </div>
        ) : joyas.length === 0 ? (
          <div className="rounded-2xl border border-[#b89b5e]/25 bg-white/80 px-6 py-14 text-center">
            <Gem className="mx-auto size-9 text-[#96733d]" />
            <h3 className="mt-4 text-lg font-semibold">Pronto habrá nuevas piezas aquí</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#746b62]">Esta galería muestra únicamente productos publicados por talleres con su catálogo público activado.</p>
            <Link to="/catalogo-publico" className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#b89b5e]/45 px-5 py-3 text-xs font-semibold text-[#5b4930] transition hover:bg-[#f7f2e8]">Explorar la comunidad <ArrowRight className="size-4" /></Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {joyas.map((joya) => {
              const imagenes = Array.isArray(joya.galeria) ? joya.galeria : [];
              const imagenSecundaria = imagenes.find((value): value is string => typeof value === "string" && /^https?:\/\//i.test(value));
              const imagen = joya.imagen_principal_url || imagenSecundaria || null;
              return (
                <article key={joya.producto_id} className="group overflow-hidden rounded-2xl border border-[#b89b5e]/25 bg-white/80 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#b89b5e]/60 hover:shadow-xl">
                  <Link to="/$slug/$producto" params={{ slug: joya.catalogo_slug, producto: joya.producto_id }} className="block">
                    <div className="relative aspect-square overflow-hidden bg-[radial-gradient(ellipse_at_50%_42%,#fff,#e7dfd1)]">
                      {imagen ? <img src={imagen} alt={joya.nombre} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <div className="grid h-full place-items-center text-[#a88952]"><Gem className="size-16" strokeWidth={1} /><span className="mt-2 text-xs text-[#81766a]">Ver detalles de la pieza</span></div>}
                      {joya.destacado ? <span className="absolute left-3 top-3 rounded-full bg-[#211d19]/90 px-3 py-1.5 text-[10px] font-semibold tracking-wide text-[#e8d3a4]">Destacada</span> : null}
                      <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-[#211d19]/90 px-3 py-2 text-[10px] font-semibold text-white"><Box className="size-3.5" /> Ver ficha</span>
                    </div>
                    <div className="p-5">
                      <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#96733d]">{joya.categoria || "Joyería"}</p>
                      <h3 className="mt-2 text-lg font-semibold tracking-tight">{joya.nombre}</h3>
                      <p className="mt-1 text-xs text-[#81766a]">Por {joya.taller}</p>
                      {joya.descripcion ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#746b62]">{joya.descripcion}</p> : null}
                      {joya.precio_desde != null && joya.precio_desde > 0 ? <p className="mt-4 text-sm font-semibold text-[#5b4930]">{new Intl.NumberFormat("es-PE", { style: "currency", currency: joya.moneda || "PEN", maximumFractionDigits: 2 }).format(joya.precio_desde)}</p> : <p className="mt-4 text-xs text-[#81766a]">Precio por consultar</p>}
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="border-t border-[#b89b5e]/20 bg-white/55">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#96733d]">¿Eres joyero?</p><h2 className="mt-2 font-display text-2xl">Presenta tus diseños al mundo.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#746b62]">Administra tus fichas comerciales y decide qué piezas quieres publicar en tu catálogo.</p></div>
          <Link to="/auth" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#211d19] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#3b3329]">Acceder a mi taller <ArrowRight className="size-4" /></Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-[10px] text-[#81766a] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© {new Date().getFullYear()} Taller del Joyero · AURUM LAB</span>
        <div className="flex gap-4"><Link to="/" className="hover:text-[#96733d]">Inicio</Link><Link to="/catalogo-publico" className="hover:text-[#96733d]">Comunidad</Link><Link to="/auth" className="hover:text-[#96733d]">Acceso al ERP</Link></div>
      </footer>
    </main>
  );
}
