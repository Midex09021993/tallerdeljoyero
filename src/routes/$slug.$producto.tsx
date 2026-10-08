import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Box, ExternalLink, MessageCircle, Play, Share2, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/$slug/$producto")({
  head: () => ({
    meta: [
      { title: "Ficha de joya — Aurum Lab" },
      { name: "description", content: "Ficha pública de una joya del catálogo digital." },
    ],
  }),
  component: CatalogoProductoPublicoPage,
});

type CatalogoRow = {
  slug: string;
  nombre_publico: string;
  descripcion_publica: string | null;
  logo_url: string | null;
  whatsapp: string | null;
  producto_id: string | null;
  producto_slug: string | null;
  codigo: string | null;
  nombre: string | null;
  categoria: string | null;
  descripcion_producto: string | null;
  imagen_principal_url: string | null;
  galeria: unknown;
  video_url: string | null;
  aurum_render_url: string | null;
  precio_desde: number | null;
  moneda: string | null;
  destacado: boolean | null;
  metal_principal: string | null;
  peso_gramos: number | null;
  piedras: string | null;
  medidas: string | null;
  talla: string | null;
  tecnica: string | null;
  acabado: string | null;
  disponibilidad: string | null;
  tiempo_fabricacion_dias: number | null;
  ficha_tecnica_url: string | null;
  mostrar_precio: boolean;
  mostrar_ficha_tecnica: boolean;
};

export function CatalogoProductoPublicoPage() {
  const { slug, producto: productoSlug } = Route.useParams();
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["portal-publico-producto", slug],
    queryFn: async () => {
      const { data, error: rpcError } = await supabase.rpc("obtener_catalogo_publico", { _slug: slug.trim().toLowerCase() });
      if (rpcError) throw rpcError;
      return (data ?? []) as CatalogoRow[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const config = rows[0] ?? null;
  const item = rows.find((row) => row.producto_id && row.producto_slug === productoSlug.toLowerCase());
  const [solicitudAbierta, setSolicitudAbierta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const [errorSolicitud, setErrorSolicitud] = useState("");
  const [formSolicitud, setFormSolicitud] = useState({ nombre: "", telefono: "", email: "", cantidad: 1, mensaje: "" });

  if (isLoading) return <Estado titulo="Cargando ficha…" texto="Estamos preparando la información de la pieza." />;
  if (error || !config || !item?.producto_id || !item.nombre || !item.codigo) {
    return <Estado titulo="Joya no disponible" texto="La pieza no existe, no está publicada o el enlace ya no es válido." />;
  }

  const imagenes = Array.isArray(item.galeria) ? item.galeria.filter((v): v is string => typeof v === "string") : [];
  const whatsappHref = config.whatsapp ? "https://wa.me/" + config.whatsapp.replace(/\D/g, "") : null;
  const precio = item.mostrar_precio && item.precio_desde != null
    ? new Intl.NumberFormat("es-PE", { style: "currency", currency: item.moneda || "PEN", maximumFractionDigits: 2 }).format(item.precio_desde)
    : "Precio a consultar";

  return (
    <main className="min-h-screen bg-[#f7f4ef] text-[#1f1b18]">
      <header className="border-b border-[#1f1b1815] bg-[#f7f4ef]/95 px-5 py-5 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/$slug" params={{ slug }} className="inline-flex items-center gap-2 text-xs font-semibold"><ArrowLeft className="size-4" /> Volver al catálogo</Link>
          <button type="button" onClick={() => void navigator.share?.({ title: item.nombre || "", url: window.location.href })} className="inline-flex items-center gap-2 rounded-full border border-[#1f1b1820] px-3 py-2 text-xs font-semibold"><Share2 className="size-3.5" /> Compartir</button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:py-14">
        <div>
          <div className="aspect-square overflow-hidden rounded-[28px] bg-[#e9e3da]">
            {item.imagen_principal_url ? <img src={item.imagen_principal_url} alt={item.nombre} className="size-full object-cover" /> : <div className="grid size-full place-items-center"><Box className="size-14 text-[#8a6b36]" /></div>}
          </div>
          {imagenes.length ? <div className="mt-3 grid grid-cols-4 gap-2">{imagenes.slice(0, 8).map((url, index) => <img key={url + index} src={url} alt={item.nombre + " " + (index + 1)} className="aspect-square rounded-xl object-cover" />)}</div> : null}
        </div>

        <div className="self-center">
          <p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#8a6b36]">{item.codigo} · {item.categoria}</p>
          <h1 className="mt-2 font-display text-5xl tracking-tight">{item.nombre}</h1>
          <p className="mt-5 text-sm leading-7 text-[#625b54]">{item.descripcion_producto || "Consulta al taller para conocer los detalles de esta pieza."}</p>
          <p className="mt-6 text-xl font-semibold">{precio}</p>

          {item.mostrar_ficha_tecnica ? (
            <div className="mt-7 grid grid-cols-2 gap-3 rounded-2xl border border-[#1f1b1820] bg-white/70 p-4 text-xs">
              {[
                ["Metal", item.metal_principal],
                ["Peso", item.peso_gramos ? item.peso_gramos + " g" : null],
                ["Piedras", item.piedras],
                ["Medidas", item.medidas],
                ["Talla", item.talla],
                ["Técnica", item.tecnica],
                ["Acabado", item.acabado],
                ["Disponibilidad", item.disponibilidad],
                ["Fabricación", item.tiempo_fabricacion_dias ? item.tiempo_fabricacion_dias + " días" : null],
              ].filter((entry): entry is [string, string] => Boolean(entry[1])).map(([label, value]) => (
                <div key={label}><p className="text-[9px] font-bold uppercase tracking-wider text-[#8a6b36]">{label}</p><p className="mt-1">{value}</p></div>
              ))}
            </div>
          ) : null}

          <div className="mt-7 flex flex-wrap gap-2">
            {whatsappHref ? <a href={whatsappHref + "?text=" + encodeURIComponent("Hola, quisiera información sobre " + item.nombre + " (" + item.codigo + ").")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#1f1b18] px-4 py-2.5 text-xs font-semibold text-white"><MessageCircle className="size-3.5" /> Solicitar cotización</a> : null}
            <button type="button" onClick={() => setSolicitudAbierta(true)} className="inline-flex items-center gap-2 rounded-full border border-[#1f1b1830] bg-white px-4 py-2.5 text-xs font-semibold"><MessageCircle className="size-3.5" /> Solicitar desde el catálogo</button>
            {item.aurum_render_url ? <a href={item.aurum_render_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#1f1b1830] bg-white px-4 py-2.5 text-xs font-semibold"><ExternalLink className="size-3.5" /> AURUM Render</a> : null}
            {item.video_url ? <a href={item.video_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#1f1b1830] bg-white px-4 py-2.5 text-xs font-semibold"><Play className="size-3.5" /> Ver video</a> : null}
            {item.ficha_tecnica_url ? <a href={item.ficha_tecnica_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#1f1b1830] bg-white px-4 py-2.5 text-xs font-semibold">Ficha técnica</a> : null}
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><div className="border-t border-[#1f1b1815] pt-6 text-xs text-[#746b62]">© {config.nombre_publico} · Catálogo digital</div></footer>
    </main>
  );
}

function Estado({ titulo, texto }: { titulo: string; texto: string }) {
  return <main className="grid min-h-screen place-items-center bg-[#f7f4ef] px-6 text-center text-[#1f1b18]"><section className="max-w-md"><Sparkles className="mx-auto size-9 text-[#8a6b36]" /><h1 className="mt-5 font-display text-4xl">{titulo}</h1><p className="mt-3 text-sm leading-6 text-[#746b62]">{texto}</p></section></main>;
}
