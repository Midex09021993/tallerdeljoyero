import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, MessageCircle, Package, Search, ShoppingBag, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/tienda")({
  head: () => ({
    meta: [
      { title: "Insumos para joyería | Taller del Joyero" },
      { name: "description", content: "Resinas, cubiletes y materiales para el trabajo profesional de joyería." },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: TiendaInsumosPage,
});

type Tienda = { id: string; nombre_publico: string; descripcion: string | null; whatsapp: string | null; moneda: string };
type Producto = { id: string; nombre: string; categoria: string; descripcion: string | null; imagen_url: string | null; precio: number | null; moneda: string; stock: number | null; unidad: string; destacado: boolean };

function TiendaInsumosPage() {
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("Todos");
  const { data, isLoading, error } = useQuery({
    queryKey: ["tienda-insumos-publica", "fadilab-insumos"],
    queryFn: async () => {
      const { data: tienda, error: tiendaError } = await supabase
        .from("tiendas_insumos")
        .select("id, nombre_publico, descripcion, whatsapp, moneda")
        .eq("slug", "fadilab-insumos")
        .eq("visible", true)
        .maybeSingle();
      if (tiendaError) throw tiendaError;
      if (!tienda) return { tienda: null as Tienda | null, productos: [] as Producto[] };
      const { data: productos, error: productosError } = await supabase
        .from("tienda_insumos_productos")
        .select("id, nombre, categoria, descripcion, imagen_url, precio, moneda, stock, unidad, destacado")
        .eq("tienda_id", tienda.id)
        .eq("publicado", true)
        .order("destacado", { ascending: false })
        .order("orden", { ascending: true })
        .order("nombre", { ascending: true });
      if (productosError) throw productosError;
      return { tienda: tienda as Tienda, productos: (productos ?? []) as Producto[] };
    },
    staleTime: 60_000,
  });
  const productos = data?.productos ?? [];
  const categorias = useMemo(() => ["Todos", ...Array.from(new Set(productos.map((p) => p.categoria)))], [productos]);
  const visibles = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase("es");
    return productos.filter((p) => (categoria === "Todos" || p.categoria === categoria) && (!q || [p.nombre, p.categoria, p.descripcion ?? ""].join(" ").toLocaleLowerCase("es").includes(q)));
  }, [productos, busqueda, categoria]);
  const tienda = data?.tienda;
  const formatoPrecio = (p: Producto) => p.precio == null
    ? "Consultar precio"
    : new Intl.NumberFormat("es-PE", { style: "currency", currency: p.moneda || tienda?.moneda || "PEN", maximumFractionDigits: 2 }).format(p.precio);
  const whatsappUrl = (p: Producto) => {
    const mensaje = encodeURIComponent(`Hola. Quisiera consultar por ${p.nombre}.`);
    return tienda?.whatsapp ? `https://wa.me/${tienda.whatsapp.replace(/\D/g, "")}?text=${mensaje}` : `https://wa.me/?text=${mensaje}`;
  };

  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#211f1a]">
      <header className="border-b border-[#d8c7a1]/50 bg-[#171713] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href="/auth" className="flex items-center gap-3" aria-label="Volver a Aurum Lab">
            <img src="/icon-512.png" alt="" className="size-10 rounded-xl" />
            <span><strong className="block text-sm tracking-[.16em] text-[#dec587]">TALLER DEL JOYERO</strong><small className="text-[10px] text-white/55">Insumos para profesionales</small></span>
          </a>
          <a href="/herramientas-publicas" className="text-xs text-white/70 transition hover:text-[#dec587]">Herramientas</a>
        </div>
      </header>
      <section className="relative overflow-hidden bg-[#22221c] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_20%,rgba(211,177,103,.2),transparent_45%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 sm:py-20 md:grid-cols-[1.3fr_.7fr] md:items-center">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.28em] text-[#d9bd7b]"><Sparkles className="size-4" /> Tienda especializada</p>
            <h1 className="mt-5 max-w-2xl font-display text-4xl leading-tight sm:text-6xl">Insumos para crear con precisión.</h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/65 sm:text-base">Resinas, cubiletes y materiales seleccionados para acompañar cada etapa de tu trabajo joyero.</p>
            <a href="#productos" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#d6b66e] px-5 py-3 text-xs font-bold text-[#201d15] transition hover:brightness-105">Explorar productos <ArrowRight className="size-4" /></a>
          </div>
          <div className="hidden rounded-[2rem] border border-white/10 bg-white/[.04] p-8 md:block">
            <div className="grid size-20 place-items-center rounded-3xl border border-[#d9bd7b]/35 bg-[#d9bd7b]/10"><ShoppingBag className="size-9 text-[#d9bd7b]" /></div>
            <p className="mt-6 text-xl font-semibold">Para el taller, de verdad.</p>
            <p className="mt-2 text-sm leading-6 text-white/55">Consulta disponibilidad y coordina tu pedido directamente con nuestro equipo.</p>
          </div>
        </div>
      </section>
      <section id="productos" className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#9b7b3f]">Catálogo de insumos</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">Productos para tu taller</h2><p className="mt-2 text-sm text-[#777168]">Consulta presentaciones, stock y precios actualizados.</p></div>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-[#ddd5c6] bg-white px-3 sm:w-72"><Search className="size-4 text-[#8c8375]" /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar resina, cubilete…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
        </div>
        {categorias.length > 1 && <div className="mt-6 flex gap-2 overflow-x-auto pb-2">{categorias.map((c) => <button key={c} onClick={() => setCategoria(c)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${categoria === c ? "border-[#29271f] bg-[#29271f] text-white" : "border-[#ddd5c6] bg-white text-[#625b50] hover:border-[#b79a5b]"}`}>{c}</button>)}</div>}
        {isLoading ? <div className="mt-8 rounded-2xl border border-[#e4ddcf] bg-white p-8 text-sm text-[#777168]">Cargando catálogo…</div>
          : error ? <div className="mt-8 rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-700">No se pudo cargar la tienda. Inténtalo nuevamente más tarde.</div>
          : !tienda ? <div className="mt-8 rounded-2xl border border-[#e4ddcf] bg-white p-8"><Package className="size-7 text-[#9b7b3f]" /><h3 className="mt-3 text-lg font-semibold">Estamos preparando la tienda</h3><p className="mt-2 max-w-xl text-sm leading-6 text-[#777168]">El catálogo de FADILAB se está configurando. Vuelve pronto para consultar los primeros insumos.</p></div>
          : visibles.length === 0 ? <div className="mt-8 rounded-2xl border border-[#e4ddcf] bg-white p-8 text-sm text-[#777168]">No hay productos que coincidan con tu búsqueda.</div>
          : <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visibles.map((p) => <article key={p.id} className="group overflow-hidden rounded-2xl border border-[#e5ded1] bg-white shadow-[0_8px_30px_rgba(39,31,18,.035)] transition hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(39,31,18,.09)]"><div className="relative aspect-[4/3] overflow-hidden bg-[#eeebe4]">{p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <div className="grid size-full place-items-center"><Package className="size-12 text-[#c2b9a8]" /></div>}{p.destacado && <span className="absolute left-3 top-3 rounded-full bg-[#d6b66e] px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[#252116]">Destacado</span>}</div><div className="p-5"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#9b7b3f]">{p.categoria}</p><h3 className="mt-2 text-base font-semibold">{p.nombre}</h3><p className="mt-2 min-h-10 text-xs leading-5 text-[#777168]">{p.descripcion || "Consulta los detalles y presentaciones disponibles."}</p><div className="mt-5 flex items-end justify-between gap-3"><div><p className="text-[9px] uppercase tracking-wider text-[#8a8276]">Precio</p><p className="mt-1 text-sm font-bold">{formatoPrecio(p)}</p>{p.stock != null && <p className="mt-1 text-[10px] text-[#777168]">Disponibilidad: {p.stock} {p.unidad}</p>}</div><a href={whatsappUrl(p)} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#24231d] px-3 py-2.5 text-[10px] font-bold text-white transition hover:bg-[#9b7b3f]"><MessageCircle className="size-4" /> Consultar</a></div></div></article>)}</div>}
      </section>
      <footer className="border-t border-[#e1d8c8] bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-[#777168] sm:flex-row sm:items-center sm:justify-between sm:px-8"><p>© {new Date().getFullYear()} · Insumos para joyería</p><a href="/auth" className="hover:text-[#9b7b3f]">Volver a Aurum Lab</a></div></footer>
    </main>
  );
}
