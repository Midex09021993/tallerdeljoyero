import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Box, Instagram, MessageCircle, Search, Share2, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/$slug")({
  head: () => ({
    meta: [
      { title: "Showroom digital" },
      { name: "description", content: "Showroom digital público de una joyería o taller." },
    ],
  }),
  component: CatalogoPublicoPage,
});

type CatalogoRow = {
  sede_id: string;
  slug: string;
  nombre_publico: string;
  descripcion_publica: string | null;
  logo_url: string | null;
  portada_url: string | null;
  whatsapp: string | null;
  instagram_url: string | null;
  producto_id: string | null;
  codigo: string | null;
  nombre: string | null;
  categoria: string | null;
  descripcion: string | null;
  imagen_principal_url: string | null;
  galeria: unknown;
  video_url: string | null;
  aurum_render_url: string | null;
  precio_desde: number | null;
  moneda: string | null;
  destacado: boolean | null;
};

type Producto = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  imagen: string | null;
  videoUrl: string | null;
  aurumRenderUrl: string | null;
  precioDesde: number | null;
  moneda: string;
  destacado: boolean;
};

function CatalogoPublicoPage() {
  const { slug } = Route.useParams();
  const [categoria, setCategoria] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["catalogo-publico", slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("obtener_catalogo_publico", { _slug: slug });
      if (error) throw error;
      return (data ?? []) as CatalogoRow[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const config = rows[0] ?? null;
  const productos = useMemo<Producto[]>(() => rows
    .filter((row) => row.producto_id && row.codigo && row.nombre && row.categoria)
    .map((row) => ({
      id: row.producto_id!,
      codigo: row.codigo!,
      nombre: row.nombre!,
      categoria: row.categoria!,
      descripcion: row.descripcion ?? "",
      imagen: row.imagen_principal_url,
      videoUrl: row.video_url,
      aurumRenderUrl: row.aurum_render_url,
      precioDesde: row.precio_desde,
      moneda: row.moneda ?? "PEN",
      destacado: Boolean(row.destacado),
    })), [rows]);

  const categorias = useMemo(
    () => ["Todos", ...new Set(productos.map((producto) => producto.categoria))],
    [productos],
  );

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((producto) =>
      (!q || [producto.nombre, producto.codigo, producto.categoria, producto.descripcion].join(" ").toLowerCase().includes(q))
      && (categoria === "Todos" || producto.categoria === categoria),
    );
  }, [busqueda, categoria, productos]);

  const destacado = productos.find((producto) => producto.destacado) ?? productos[0] ?? null;
  const whatsappHref = config?.whatsapp
    ? `https://wa.me/${config.whatsapp.replace(/\D/g, "")}`
    : null;

  if (isLoading) {
    return <EstadoCatalogo titulo="Cargando catálogo…" texto="Estamos preparando la publicación de esta joyería." />;
  }

  if (error || !config) {
    return (
      <EstadoCatalogo
        titulo="Catálogo no disponible"
        texto="El enlace no corresponde a un catálogo público activo o la publicación todavía no está configurada."
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] text-[#1f1b18]">
      <header className="border-b border-[#1f1b1815] bg-[#f7f4ef]/95 px-5 py-5 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {config.logo_url ? (
              <img src={config.logo_url} alt={config.nombre_publico} className="size-10 rounded-full object-cover" />
            ) : null}
            <div className="min-w-0">
              <p className="truncate font-display text-2xl italic tracking-tight">{config.nombre_publico}</p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[.25em] text-[#8a6b36]">Showroom digital</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void navigator.share?.({ title: config.nombre_publico, url: window.location.href })}
              className="hidden rounded-full border border-[#1f1b1820] px-3 py-2 text-xs font-semibold sm:inline-flex"
            >
              <Share2 className="mr-1.5 size-3.5" /> Compartir
            </button>
            {whatsappHref ? (
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="rounded-full bg-[#1f1b18] px-3.5 py-2 text-xs font-semibold text-white">
                WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[#1f1b1815]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(180,145,75,.16),transparent_38%)]" />
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-24">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.3em] text-[#8a6b36]">Showroom · {config.slug}</p>
            <h1 className="mt-4 max-w-xl font-display text-5xl leading-[.95] tracking-tight">{config.descripcion_publica || "Joyas hechas para quedarse."}</h1>
            <p className="mt-6 max-w-lg text-sm leading-7 text-[#625b54]">
              Explora los modelos publicados por {config.nombre_publico} y solicita una propuesta personalizada directamente con el taller.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <a href="#coleccion" className="rounded-full bg-[#1f1b18] px-5 py-3 text-xs font-semibold text-white">
                Explorar colección <ArrowRight className="ml-1 inline size-3.5" />
              </a>
              {config.instagram_url ? (
                <a href={config.instagram_url} target="_blank" rel="noreferrer" className="rounded-full border border-[#1f1b1830] bg-white/50 px-5 py-3 text-xs font-semibold">
                  <Instagram className="mr-1.5 inline size-3.5" /> Instagram
                </a>
              ) : null}
            </div>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-[#e9e3da] shadow-2xl">
            {destacado?.imagen || config.portada_url ? (
              <img src={destacado?.imagen ?? config.portada_url!} alt={destacado?.nombre ?? config.nombre_publico} className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_50%_35%,rgba(180,145,75,.28),transparent_55%)]">
                <Sparkles className="size-12 text-[#8a6b36]" />
              </div>
            )}
            {destacado ? (
              <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/90 p-4 backdrop-blur">
                <p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#8a6b36]">{destacado.codigo} · destacado</p>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <h2 className="text-lg font-semibold">{destacado.nombre}</h2>
                  <span className="text-sm font-semibold">{formatPrice(destacado.precioDesde, destacado.moneda)}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section id="coleccion" className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#8a6b36]">Catálogo</p>
            <h2 className="mt-1 font-display text-4xl">Explora los modelos</h2>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8b8178]" />
              <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar modelo…" className="h-10 w-full rounded-full border border-[#1f1b1820] bg-white pl-9 pr-4 text-sm outline-none sm:w-64" />
            </div>
            <select value={categoria} onChange={(event) => setCategoria(event.target.value)} className="h-10 rounded-full border border-[#1f1b1820] bg-white px-4 text-xs font-semibold">
              {categorias.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
        </div>

        {productosFiltrados.length ? (
          <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {productosFiltrados.map((producto) => (
              <article key={producto.id} className="group">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-[#e9e3da]">
                  {producto.imagen ? (
                    <img src={producto.imagen} alt={producto.nombre} className="size-full object-cover transition duration-700 group-hover:scale-[1.035]" />
                  ) : (
                    <div className="grid size-full place-items-center"><Box className="size-10 text-[#8a6b36]" /></div>
                  )}
                  {producto.destacado ? <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider">Destacado</span> : null}
                </div>
                <div className="px-1 pt-4">
                  <p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#8a6b36]">{producto.codigo} · {producto.categoria}</p>
                  <h3 className="mt-1 text-lg font-semibold">{producto.nombre}</h3>
                  <p className="mt-1 text-xs leading-5 text-[#746b62]">{producto.descripcion}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">{formatPrice(producto.precioDesde, producto.moneda)}</span>
                    {whatsappHref ? (
                      <a
                        href={`${whatsappHref}?text=${encodeURIComponent(`Hola, quisiera información sobre ${producto.nombre} (${producto.codigo}).`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold underline underline-offset-4"
                      >
                        Solicitar cotización
                      </a>
                    ) : (
                      <span className="text-xs text-[#746b62]">Consultar</span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-[#1f1b1820] bg-white/60 p-10 text-center">
            <p className="font-semibold">No encontramos modelos con esos criterios.</p>
            <p className="mt-1 text-sm text-[#746b62]">Prueba otra búsqueda o categoría.</p>
          </div>
        )}
      </section>

      <section className="border-y border-[#1f1b1815] bg-white/60">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 md:grid-cols-3">
          <Feature icon={Box} title="Experiencias 3D" text="Los modelos publicados pueden enlazar a una experiencia AURUM Render cuando esté disponible." />
          <Feature icon={BookOpen} title="Colecciones" text="La estructura del catálogo queda preparada para organizar modelos por colecciones y futuras publicaciones." />
          <Feature icon={MessageCircle} title="Habla con el taller" text="Cada pieza puede llevar directamente a WhatsApp para solicitar información o una cotización." />
        </div>
      </section>

      <footer className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="flex flex-col gap-3 border-t border-[#1f1b1815] pt-6 text-xs text-[#746b62] sm:flex-row sm:items-center sm:justify-between">
          <span>© {config.nombre_publico} · Catálogo digital</span>
          <Link to="/auth" className="font-semibold text-[#1f1b18]">Acceso al ERP</Link>
        </div>
      </footer>
    </main>
  );
}

function formatPrice(value: number | null, moneda: string) {
  if (value == null) return "Consultar";
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: moneda || "PEN", maximumFractionDigits: 2 }).format(value);
}

function EstadoCatalogo({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f4ef] px-6 text-center text-[#1f1b18]">
      <section className="max-w-md">
        <Sparkles className="mx-auto size-9 text-[#8a6b36]" />
        <h1 className="mt-5 font-display text-4xl">{titulo}</h1>
        <p className="mt-3 text-sm leading-6 text-[#746b62]">{texto}</p>
        <Link to="/auth" className="mt-7 inline-flex rounded-full bg-[#1f1b18] px-5 py-3 text-xs font-semibold text-white">Acceso al ERP</Link>
      </section>
    </main>
  );
}

function Feature({ icon: Icon, title, text }: { icon: typeof Box; title: string; text: string }) {
  return <div><Icon className="size-5 text-[#8a6b36]" /><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-[#746b62]">{text}</p></div>;
}
