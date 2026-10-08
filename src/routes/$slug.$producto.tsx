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
          <div className="group relative aspect-square overflow-hidden rounded-[32px] bg-[#e9e3da] shadow-[0_30px_80px_-50px_rgba(31,27,24,.5)] ring-1 ring-[#1f1b1815]">
            {item.imagen_principal_url ? <img src={item.imagen_principal_url} alt={item.nombre} className="size-full object-cover transition duration-700 group-hover:scale-[1.025]" /> : <div className="grid size-full place-items-center"><Box className="size-14 text-[#8a6b36]" /></div>}
          </div>
          {imagenes.length ? <div className="mt-3 grid grid-cols-4 gap-2">{imagenes.slice(0, 8).map((url, index) => <img key={url + index} src={url} alt={item.nombre + " " + (index + 1)} className="aspect-square rounded-xl object-cover" />)}</div> : null}
        </div>

        <div className="self-center">
          <p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#8a6b36]">{item.codigo} · {item.categoria}</p>
          <h1 className="mt-2 font-display text-5xl tracking-tight">{item.nombre}</h1>
          <p className="mt-5 text-sm leading-7 text-[#625b54]">{item.descripcion_producto || "Consulta al taller para conocer los detalles de esta pieza."}</p>
          <div className="mt-6 flex items-end gap-3"><p className="text-2xl font-semibold tracking-tight">{precio}</p><span className="mb-1 text-[9px] font-bold uppercase tracking-[.18em] text-[#8a6b36]">Pieza de colección</span></div>

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

          <div className="mt-8 rounded-[24px] border border-[#1f1b1818] bg-white/75 p-3 shadow-[0_20px_60px_-45px_rgba(31,27,24,.45)] backdrop-blur">
            <button type="button" onClick={() => { setSolicitudAbierta(true); setErrorSolicitud(""); }} className="group flex w-full items-center justify-between rounded-[18px] bg-[#1f1b18] px-5 py-4 text-left text-white transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(31,27,24,.55)]">
              <span><span className="block text-[9px] font-bold uppercase tracking-[.2em] text-[#d7b56d]">Atención personalizada</span><span className="mt-1 block text-sm font-semibold">Solicitar cotización</span></span>
              <MessageCircle className="size-4 text-[#d7b56d]" />
            </button>
            <div className="mt-2 flex flex-wrap gap-2 px-1 pb-1 pt-1">
              {whatsappHref ? <a href={whatsappHref + "?text=" + encodeURIComponent("Hola, quisiera información sobre " + item.nombre + " (" + item.codigo + ").")} target="_blank" rel="noreferrer" className="rounded-full border border-[#1f1b1820] px-3 py-2 text-[10px] font-semibold">WhatsApp</a> : null}
              {item.aurum_render_url ? <a href={item.aurum_render_url} target="_blank" rel="noreferrer" className="rounded-full border border-[#1f1b1820] px-3 py-2 text-[10px] font-semibold">AURUM Render</a> : null}
              {item.video_url ? <a href={item.video_url} target="_blank" rel="noreferrer" className="rounded-full border border-[#1f1b1820] px-3 py-2 text-[10px] font-semibold">Ver video</a> : null}
              {item.ficha_tecnica_url ? <a href={item.ficha_tecnica_url} target="_blank" rel="noreferrer" className="rounded-full border border-[#1f1b1820] px-3 py-2 text-[10px] font-semibold">Ficha técnica</a> : null}
            </div>
          </div>
          {solicitudAbierta ? (
            <div className="fixed inset-0 z-50 grid place-items-center bg-[#1f1b18]/55 p-5 backdrop-blur-sm">
              <div className="w-full max-w-lg rounded-[28px] bg-[#f7f4ef] p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#8a6b36]">Solicitud privada</p><h2 className="mt-1 font-display text-3xl">Hablemos de tu pieza</h2><p className="mt-2 text-xs text-[#746b62]">{item.codigo} · {item.nombre}</p></div><button type="button" onClick={() => setSolicitudAbierta(false)} className="rounded-full border border-[#1f1b1820] px-3 py-2 text-xs">Cerrar</button></div>
                {enviada ? <div className="mt-6 rounded-2xl border border-[#8a6b36]/20 bg-white p-5"><p className="font-semibold">Solicitud enviada</p><p className="mt-2 text-sm leading-6 text-[#625b54]">El taller recibió tus datos y la pieza consultada.</p></div> : (
                  <form onSubmit={async (event) => {
                    event.preventDefault(); setEnviando(true); setErrorSolicitud("");
                    try {
                      const { error: rpcError } = await supabase.rpc("registrar_solicitud_catalogo", { _catalogo_slug: slug, _producto_slug: productoSlug, _nombre: formSolicitud.nombre, _telefono: formSolicitud.telefono || null, _email: formSolicitud.email || null, _cantidad: formSolicitud.cantidad, _mensaje: formSolicitud.mensaje || null });
                      if (rpcError) throw rpcError;
                      setEnviada(true);
                    } catch (error) { setErrorSolicitud(error instanceof Error ? error.message : "No se pudo enviar la solicitud."); }
                    finally { setEnviando(false); }
                  }} className="mt-6 grid gap-3">
                    <input required value={formSolicitud.nombre} onChange={(e) => setFormSolicitud({ ...formSolicitud, nombre: e.target.value })} placeholder="Nombre" className="h-11 rounded-xl border border-[#1f1b1820] bg-white px-3 text-sm outline-none focus:border-[#8a6b36]" />
                    <div className="grid gap-3 sm:grid-cols-2"><input value={formSolicitud.telefono} onChange={(e) => setFormSolicitud({ ...formSolicitud, telefono: e.target.value })} placeholder="WhatsApp / teléfono" className="h-11 rounded-xl border border-[#1f1b1820] bg-white px-3 text-sm" /><input type="email" value={formSolicitud.email} onChange={(e) => setFormSolicitud({ ...formSolicitud, email: e.target.value })} placeholder="Correo electrónico" className="h-11 rounded-xl border border-[#1f1b1820] bg-white px-3 text-sm" /></div>
                    <div className="grid gap-3 sm:grid-cols-[100px_1fr]"><input type="number" min="1" value={formSolicitud.cantidad} onChange={(e) => setFormSolicitud({ ...formSolicitud, cantidad: Number(e.target.value) || 1 })} className="h-11 rounded-xl border border-[#1f1b1820] bg-white px-3 text-sm" /><textarea value={formSolicitud.mensaje} onChange={(e) => setFormSolicitud({ ...formSolicitud, mensaje: e.target.value })} placeholder="Talla, acabado o personalización" rows={3} className="rounded-xl border border-[#1f1b1820] bg-white px-3 py-2 text-sm" /></div>
                    {errorSolicitud ? <p className="text-xs text-red-600">{errorSolicitud}</p> : null}
                    <button disabled={enviando} className="mt-2 rounded-xl bg-[#1f1b18] px-4 py-3 text-xs font-semibold text-white disabled:opacity-50">{enviando ? "Enviando…" : "Enviar solicitud"}</button>
                  </form>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><div className="border-t border-[#1f1b1815] pt-6 text-xs text-[#746b62]">© {config.nombre_publico} · Catálogo digital</div></footer>
    </main>
  );
}

function Estado({ titulo, texto }: { titulo: string; texto: string }) {
  return <main className="grid min-h-screen place-items-center bg-[#f7f4ef] px-6 text-center text-[#1f1b18]"><section className="max-w-md"><Sparkles className="mx-auto size-9 text-[#8a6b36]" /><h1 className="mt-5 font-display text-4xl">{titulo}</h1><p className="mt-3 text-sm leading-6 text-[#746b62]">{texto}</p></section></main>;
}
