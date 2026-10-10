// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Box, MessageCircle, Share2, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  slug: string;
  nombre_publico: string;
  descripcion_publica: string | null;
  whatsapp: string | null;
  producto_id: string | null;
  producto_slug: string | null;
  codigo: string | null;
  nombre: string | null;
  categoria: string | null;
  descripcion_producto: string | null;
  imagen_principal_url: string | null;
  precio_desde: number | null;
  moneda: string | null;
  destacado: boolean | null;
  coleccion_slug: string | null;
  coleccion_nombre: string | null;
};

export const Route = createFileRoute("/$slug/coleccion/$coleccion")({
  head: () => ({ meta: [{ title: "Colección · Catálogo" }] }),
  component: ColeccionPublicaPage,
});

function ColeccionPublicaPage() {
  const { slug, coleccion } = Route.useParams();
  const catalogoSlug = slug.toLowerCase();
  const coleccionSlug = coleccion.toLowerCase();

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["catalogo-coleccion-publica", catalogoSlug, coleccionSlug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("obtener_catalogo_publico", { _slug: catalogoSlug });
      if (error) throw error;
      return ((data ?? []) as Row[]).filter((row) => row.coleccion_slug?.toLowerCase() === coleccionSlug);
    },
    staleTime: 60_000,
  });

  if (isLoading) return <Estado titulo="Cargando colección…" texto="Estamos preparando el escaparate." />;
  if (error || !rows.length) return <Estado titulo="Colección no disponible" texto="La colección no existe, está oculta o todavía no tiene modelos publicados." />;

  const config = rows[0];
  const productos = Array.from(new Map(rows.filter((row) => row.producto_id).map((row) => [row.producto_id, row])).values());
  const whatsappHref = config.whatsapp ? `https://wa.me/${config.whatsapp.replace(/\D/g, "")}` : null;

  return (
    <main className="min-h-screen bg-[#f7f4ef] text-[#1f1b18]">
      <header className="border-b border-[#1f1b1815] bg-[#f7f4ef]/95 px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link to="/$slug" params={{ slug: catalogoSlug }} className="inline-flex items-center gap-2 text-xs font-semibold"><ArrowLeft className="size-4" /> {config.nombre_publico}</Link>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void navigator.share?.({ title: config.coleccion_nombre ?? "Colección", url: window.location.href })} className="rounded-full border border-[#1f1b1820] px-3 py-2 text-xs font-semibold"><Share2 className="mr-1.5 inline size-3.5" /> Compartir</button>
            {whatsappHref ? <a href={whatsappHref} target="_blank" rel="noreferrer" className="rounded-full bg-[#1f1b18] px-3.5 py-2 text-xs font-semibold text-white">WhatsApp</a> : null}
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <p className="text-[10px] font-bold uppercase tracking-[.3em] text-[#8a6b36]">Colección</p>
        <h1 className="mt-3 font-display text-5xl">{config.coleccion_nombre}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#625b54]">Modelos publicados de {config.nombre_publico} dentro de esta colección.</p>

        <div className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {productos.map((producto) => (
            <article key={producto.producto_id} className="group">
              <Link to="/$slug/$producto" params={{ slug: catalogoSlug, producto: producto.producto_slug ?? producto.producto_id! }} className="block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-[#e9e3da]">
                  {producto.imagen_principal_url ? <img src={producto.imagen_principal_url} alt={producto.nombre ?? ""} className="size-full object-cover transition duration-700 group-hover:scale-[1.035]" /> : <div className="grid size-full place-items-center"><Box className="size-10 text-[#8a6b36]" /></div>}
                </div>
                <p className="mt-4 text-[9px] font-bold uppercase tracking-[.18em] text-[#8a6b36]">{producto.codigo} · {producto.categoria}</p>
                <h2 className="mt-1 text-lg font-semibold">{producto.nombre}</h2>
                <p className="mt-1 text-xs leading-5 text-[#746b62]">{producto.descripcion_producto}</p>
              </Link>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{producto.precio_desde == null ? "Consultar" : new Intl.NumberFormat("es-PE", { style: "currency", currency: producto.moneda ?? "PEN", maximumFractionDigits: 2 }).format(producto.precio_desde)}</span>
                {whatsappHref ? <a href={`${whatsappHref}?text=${encodeURIComponent(`Hola, quisiera información sobre ${producto.nombre} (${producto.codigo}).`)}`} target="_blank" rel="noreferrer" className="text-xs font-semibold underline underline-offset-4">Solicitar cotización</a> : null}
              </div>
            </article>
          ))}
        </div>
      </section>
      <footer className="mx-auto max-w-7xl px-5 py-10 sm:px-8 text-xs text-[#746b62]"><Sparkles className="size-4 text-[#8a6b36]" /></footer>
    </main>
  );
}

function Estado({ titulo, texto }: { titulo: string; texto: string }) {
  return <main className="grid min-h-screen place-items-center bg-[#f7f4ef] px-6 text-center text-[#1f1b18]"><section className="max-w-md"><Sparkles className="mx-auto size-9 text-[#8a6b36]" /><h1 className="mt-5 font-display text-4xl">{titulo}</h1><p className="mt-3 text-sm leading-6 text-[#746b62]">{texto}</p><Link to="/auth" className="mt-7 inline-flex rounded-full bg-[#1f1b18] px-5 py-3 text-xs font-semibold text-white">Acceso al ERP</Link></section></main>;
}
