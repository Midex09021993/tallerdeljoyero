import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Boxes, Cpu, HardDrive, MessageCircle, Package, Search, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/tienda")({
  head: () => ({
    meta: [
      { title: "Insumos para joyería | Taller del Joyero" },
      { name: "description", content: "Insumos, equipos y tecnología para joyería, diseño 3D y fabricación digital." },
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
  const categoriasBase = ["Resinas", "Cubiletes", "Yesos e inversiones", "Ceras", "Herramientas", "PC para diseño 3D", "Componentes y hardware", "UPS y protección eléctrica", "NAS y almacenamiento", "Monitores y periféricos", "Impresión 3D y fabricación", "Software y licencias", "Consumibles", "Otros"];
  const categorias = useMemo(() => ["Todos", ...categoriasBase, ...productos.map((p) => p.categoria).filter((c) => !categoriasBase.includes(c)).filter((c, i, a) => a.indexOf(c) === i)], [productos]);
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
      <div className="bg-[#ed6b2c] text-white"><div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-5 py-2 text-[10px] font-semibold sm:px-8 sm:text-xs"><span>Insumos y tecnología para joyería y fabricación digital</span><a href="/herramientas-publicas" className="hover:underline">Herramientas gratuitas</a></div></div>
      <header className="sticky top-0 z-30 border-b border-[#e7e7e7] bg-white/95 text-[#252525] shadow-sm backdrop-blur"><div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-5 py-3 sm:px-8 lg:flex-nowrap"><a href="/auth" className="flex shrink-0 items-center gap-2.5" aria-label="Volver a Aurum Lab"><img src="/icon-512.png" alt="" className="size-10 rounded-xl" /><span><strong className="block whitespace-nowrap text-xs font-extrabold tracking-[.11em] sm:text-sm">TALLER DEL JOYERO</strong><small className="text-[10px] text-[#777]">Tecnología para crear</small></span></a><a href="#categorias" className="hidden shrink-0 rounded-full bg-[#ed6b2c] px-5 py-3 text-xs font-bold text-white sm:inline-flex">Categorías</a><label className="order-3 flex h-11 w-full min-w-0 items-center gap-3 rounded-full border border-[#e2e2e2] bg-[#fafafa] px-4 focus-within:border-[#ed6b2c] lg:order-none lg:flex-1"><Search className="size-4 shrink-0 text-[#777]"/><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="¿Qué estás buscando?" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label><a href="/herramientas-publicas" className="ml-auto hidden rounded-full border border-[#ed6b2c] px-4 py-2.5 text-xs font-semibold text-[#d95d22] md:inline-flex">Herramientas</a></div></header>
      <section className="relative overflow-hidden border-b border-[#e7dfd1] bg-[#f0ede5] text-[#24231d]">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(ellipse_at_70%_45%,rgba(200,166,91,.22),transparent_58%)] lg:block" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:py-12">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.24em] text-[#9b7837]"><Sparkles className="size-4" /> Tecnología e insumos profesionales</p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.08] sm:text-5xl lg:text-[3.35rem]">Equipamiento para crear sin límites.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#686257] sm:text-base">Desde resinas y materiales de fundición hasta laptops, estaciones de trabajo 3D, UPS y almacenamiento NAS para tu taller.</p>
            <div className="mt-5 flex flex-wrap gap-3"><a href="#productos" className="inline-flex items-center gap-2 rounded-xl bg-[#25241e] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#484333]">Explorar catálogo <ArrowRight className="size-4" /></a><a href="#categorias" className="inline-flex items-center gap-2 rounded-xl border border-[#d5cbb7] bg-white/70 px-5 py-3 text-xs font-semibold text-[#363329] transition hover:border-[#b99a59]">Ver categorías</a></div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-xs text-[#6f695e]"><span className="inline-flex items-center gap-2"><BadgeCheck className="size-4 text-[#9b7837]" /> Productos especializados</span><span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-[#9b7837]" /> Atención para profesionales</span></div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-[#e1d8c8] bg-white p-5 shadow-sm sm:p-6"><div className="grid size-11 place-items-center rounded-xl bg-[#f4efe3] text-[#96743a]"><Boxes className="size-5" /></div><h2 className="mt-5 text-sm font-semibold">Insumos de joyería</h2><p className="mt-2 text-xs leading-5 text-[#777168]">Resinas, cubiletes, ceras y materiales de fundición.</p></div>
            <div className="rounded-2xl border border-[#e1d8c8] bg-white p-5 shadow-sm sm:p-6"><div className="grid size-11 place-items-center rounded-xl bg-[#f4efe3] text-[#96743a]"><Cpu className="size-5" /></div><h2 className="mt-5 text-sm font-semibold">PC y diseño 3D</h2><p className="mt-2 text-xs leading-5 text-[#777168]">Portátiles, estaciones de trabajo y periféricos.</p></div>
            <div className="rounded-2xl border border-[#e1d8c8] bg-white p-5 shadow-sm sm:p-6"><div className="grid size-11 place-items-center rounded-xl bg-[#f4efe3] text-[#96743a]"><Zap className="size-5" /></div><h2 className="mt-5 text-sm font-semibold">Energía protegida</h2><p className="mt-2 text-xs leading-5 text-[#777168]">UPS y respaldo para equipos importantes.</p></div>
            <div className="rounded-2xl border border-[#e1d8c8] bg-white p-5 shadow-sm sm:p-6"><div className="grid size-11 place-items-center rounded-xl bg-[#f4efe3] text-[#96743a]"><HardDrive className="size-5" /></div><h2 className="mt-5 text-sm font-semibold">NAS y almacenamiento</h2><p className="mt-2 text-xs leading-5 text-[#777168]">Espacio y organización para tus archivos de trabajo.</p></div>
          </div>
        </div>
      </section>
      <section id="productos" className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#9b7b3f]">Tienda profesional</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">Encuentra lo que necesitas</h2><p className="mt-2 text-sm text-[#777168]">Materiales, equipos y tecnología para tu trabajo.</p></div>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-[#ddd5c6] bg-white px-3 sm:w-72"><Search className="size-4 text-[#8c8375]" /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar resina, laptop, UPS, NAS…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
        </div>
        
        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside id="categorias" className="h-fit rounded-2xl border border-[#e5ded1] bg-white p-4">
            <h3 className="text-sm font-bold">Categorías</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {categorias.map((c) => <button key={c} onClick={() => setCategoria(c)} aria-pressed={categoria === c} className={`flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition ${categoria === c ? "bg-[#29271f] font-semibold text-white" : "text-[#625b50] hover:bg-[#f5f2eb]"}`}><span>{c === "Todos" ? "Todos los productos" : c}</span>{categoria === c && <span aria-hidden="true">✓</span>}</button>)}
            </div>
          </aside>
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#777168]">{isLoading ? "Cargando productos…" : `${visibles.length} ${visibles.length === 1 ? "producto" : "productos"}`}{categoria !== "Todos" ? ` en ${categoria}` : ""}</p>
              <label className="flex items-center gap-2 text-xs text-[#777168]">Filtrar por<select value={categoria} onChange={e => setCategoria(e.target.value)} className="h-9 max-w-[220px] rounded-lg border border-[#ddd5c6] bg-white px-2 text-xs text-[#29271f] lg:hidden">{categorias.map(c => <option key={c} value={c}>{c === "Todos" ? "Todos los productos" : c}</option>)}</select></label>
            </div>
            {isLoading ? <div className="mt-0 rounded-2xl border border-[#e4ddcf] bg-white p-8 text-sm text-[#777168]">Cargando catálogo…</div>
                      : error ? <div className="mt-0 rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-700">No se pudo cargar la tienda. Inténtalo nuevamente más tarde.</div>
                      : !tienda ? <div className="mt-0 rounded-2xl border border-[#e4ddcf] bg-white p-8"><Package className="size-7 text-[#9b7b3f]" /><h3 className="mt-3 text-lg font-semibold">Estamos preparando la tienda</h3><p className="mt-2 max-w-xl text-sm leading-6 text-[#777168]">Estamos preparando el catálogo de productos. Pronto encontrarás materiales, equipos y tecnología para tu taller.</p></div>
                      : visibles.length === 0 ? <div className="mt-0 rounded-2xl border border-[#e4ddcf] bg-white p-8 text-sm text-[#777168]">No hay productos que coincidan con tu búsqueda.</div>
                      : <div className="mt-0 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visibles.map((p) => <article key={p.id} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#e5ded1] bg-white shadow-[0_8px_30px_rgba(39,31,18,.035)] transition hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(39,31,18,.09)]"><div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-[#eeebe4]">{p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <div className="grid size-full place-items-center"><Package className="size-12 text-[#c2b9a8]" /></div>}{p.destacado && <span className="absolute left-3 top-3 rounded-full bg-[#d6b66e] px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[#252116]">Destacado</span>}</div><div className="flex flex-1 flex-col p-5"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#9b7b3f]">{p.categoria}</p><h3 className="mt-2 text-base font-semibold">{p.nombre}</h3><p className="mt-2 min-h-10 text-xs leading-5 text-[#777168]">{p.descripcion || "Consulta los detalles y presentaciones disponibles."}</p><div className="mt-auto flex items-end justify-between gap-3 pt-5"><div><p className="text-[9px] uppercase tracking-wider text-[#8a8276]">Precio</p><p className="mt-1 text-sm font-bold">{formatoPrecio(p)}</p>{p.stock != null && <p className="mt-1 text-[10px] text-[#777168]">Disponibilidad: {p.stock} {p.unidad}</p>}</div><a href={whatsappUrl(p)} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#24231d] px-3 py-2.5 text-[10px] font-bold text-white transition hover:bg-[#9b7b3f]"><MessageCircle className="size-4" /> Consultar</a></div></div></article>)}</div>}
          </div>
        </div>
      </section>
      <footer className="border-t border-[#e1d8c8] bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-[#777168] sm:flex-row sm:items-center sm:justify-between sm:px-8"><p>© {new Date().getFullYear()} · Insumos, equipos y tecnología profesional</p><a href="/auth" className="hover:text-[#9b7b3f]">Volver a Aurum Lab</a></div></footer>
    </main>
  );
}
