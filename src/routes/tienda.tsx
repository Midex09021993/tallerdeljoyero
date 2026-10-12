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
      <div className="bg-[#b89b5e] text-white"><div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-5 py-2 text-[10px] font-semibold sm:px-8 sm:text-xs"><span>Insumos y tecnología para joyería y fabricación digital</span><a href="/herramientas-publicas" className="hover:underline">Herramientas gratuitas</a></div></div>
      <header className="sticky top-0 z-30 border-b border-[#e7e7e7] bg-white/95 text-[#252525] shadow-sm backdrop-blur"><div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-5 py-3 sm:px-8 lg:flex-nowrap"><a href="/auth" className="flex shrink-0 items-center gap-2.5" aria-label="Volver a Aurum Lab"><img src="/icon-512.png" alt="" className="size-10 rounded-xl" /><span><strong className="block whitespace-nowrap text-xs font-extrabold tracking-[.11em] sm:text-sm">TALLER DEL JOYERO</strong><small className="text-[10px] text-[#777]">Tecnología para crear</small></span></a><a href="#categorias" className="hidden shrink-0 rounded-full bg-[#b89b5e] px-5 py-3 text-xs font-bold text-white sm:inline-flex">Categorías</a><label className="order-3 flex h-11 w-full min-w-0 items-center gap-3 rounded-full border border-[#e2e2e2] bg-[#fafafa] px-4 focus-within:border-[#b89b5e] lg:order-none lg:flex-1"><Search className="size-4 shrink-0 text-[#777]"/><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="¿Qué estás buscando?" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label><a href="/herramientas-publicas" className="ml-auto hidden rounded-full border border-[#b89b5e] px-4 py-2.5 text-xs font-semibold text-[#8e7848] md:inline-flex">Herramientas</a></div></header>
      <section className="relative isolate overflow-hidden bg-[#073d47] text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_20%,rgba(29,191,187,.55),transparent_38%),radial-gradient(ellipse_at_20%_100%,rgba(184,155,94,.22),transparent_42%),linear-gradient(115deg,#062d3a_0%,#08727a_52%,#063944_100%)]"/>
        <div className="absolute inset-0 -z-10 opacity-15" style={{backgroundImage:"linear-gradient(rgba(255,255,255,.15) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.15) 1px,transparent 1px)",backgroundSize:"44px 44px"}}/>
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:py-16">
          <div><p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#a9f3ed] sm:text-xs"><Sparkles className="size-4"/> El siguiente nivel de tu taller</p><h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-[1.03] tracking-tight sm:text-5xl lg:text-6xl">Tecnología e insumos para <span className="text-[#d8c18a]">crear sin límites.</span></h1><p className="mt-5 max-w-xl text-sm leading-7 text-white/75 sm:text-base">Todo para diseñar, producir y llevar tus ideas más lejos: materiales de joyería, impresión 3D, estaciones de trabajo y equipamiento para tu taller.</p><div className="mt-7 flex flex-wrap gap-3"><a href="#productos" className="inline-flex items-center gap-2 rounded-full bg-[#b89b5e] px-6 py-3.5 text-xs font-bold text-white transition hover:bg-[#d0b779]">Explorar catálogo <ArrowRight className="size-4"/></a><a href="#categorias-visuales" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3.5 text-xs font-semibold text-white transition hover:bg-white/10">Ver categorías</a></div><div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-xs text-white/70"><span className="inline-flex items-center gap-2"><BadgeCheck className="size-4 text-[#d8c18a]"/> Selección especializada</span><span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-[#d8c18a]"/> Atención para profesionales</span></div></div>
          <div className="relative min-h-[280px] sm:min-h-[350px]"><div className="absolute left-[10%] top-[7%] h-[78%] w-[78%] rounded-full border border-white/15"/><div className="absolute left-[19%] top-[16%] h-[60%] w-[60%] rounded-full border border-white/10"/><div className="absolute right-[4%] top-[4%] rounded-2xl border border-white/20 bg-[#092f3a]/80 p-4 shadow-2xl backdrop-blur sm:right-[7%] sm:p-5"><Cpu className="size-7 text-[#d8c18a] sm:size-9"/><p className="mt-3 text-xs font-bold sm:text-sm">Diseño 3D</p><p className="mt-1 text-[10px] text-white/55">Potencia para crear</p></div><div className="absolute left-[2%] top-[28%] rounded-2xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur sm:left-[4%] sm:p-5"><Boxes className="size-7 text-[#a9f3ed] sm:size-9"/><p className="mt-3 text-xs font-bold sm:text-sm">Insumos</p><p className="mt-1 text-[10px] text-white/60">Materiales profesionales</p></div><div className="absolute bottom-[4%] left-[25%] rounded-2xl border border-white/20 bg-[#b89b5e] p-4 shadow-2xl sm:left-[28%] sm:p-5"><Zap className="size-7 text-white sm:size-9"/><p className="mt-3 text-xs font-bold sm:text-sm">Equipamiento</p><p className="mt-1 text-[10px] text-white/75">Tu taller, mejor preparado</p></div><div className="absolute bottom-[15%] right-[1%] rounded-2xl border border-white/20 bg-[#0b5961]/90 p-4 shadow-2xl backdrop-blur sm:right-[3%] sm:p-5"><HardDrive className="size-7 text-[#a9f3ed] sm:size-9"/><p className="mt-3 text-xs font-bold sm:text-sm">Almacenamiento</p><p className="mt-1 text-[10px] text-white/60">Tus proyectos protegidos</p></div><div className="absolute left-[38%] top-[30%] grid size-24 place-items-center rounded-full border border-white/20 bg-white/[.07] shadow-[0_0_80px_rgba(90,235,224,.18)] sm:size-36"><Sparkles className="size-10 text-white/90 sm:size-14"/></div></div>
        </div>
      </section>
      <section id="categorias-visuales" className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#b89b5e]">Explora por categoría</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#252525] sm:text-3xl">Encuentra tu próximo imprescindible</h2></div><a href="#productos" className="hidden items-center gap-1 text-xs font-bold text-[#8e7848] sm:inline-flex">Ver catálogo <ArrowRight className="size-4"/></a></div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{[
          {label:"Impresión 3D",match:["Impresión 3D y fabricación"],icon:Package,tone:"from-[#153d4c] to-[#347d87]"},
          {label:"Resinas",match:["Resinas"],icon:Sparkles,tone:"from-[#3c384f] to-[#77708e]"},
          {label:"Insumos de fundición",match:["Cubiletes","Yesos e inversiones","Ceras"],icon:Boxes,tone:"from-[#384b4a] to-[#9b9277]"},
          {label:"PC y diseño 3D",match:["PC para diseño 3D","Componentes y hardware","Monitores y periféricos"],icon:Cpu,tone:"from-[#243746] to-[#5e8499]"},
          {label:"Energía y UPS",match:["UPS y protección eléctrica"],icon:Zap,tone:"from-[#725321] to-[#c49b43]"},
          {label:"NAS y almacenamiento",match:["NAS y almacenamiento"],icon:HardDrive,tone:"from-[#17554f] to-[#3b9a88]"}
        ].map((item)=>{const Icon=item.icon;const imagen=productos.find((p)=>item.match.includes(p.categoria)&&p.imagen_url)?.imagen_url;return <button key={item.label} onClick={()=>{setCategoria(item.match.find((c)=>categorias.includes(c))??"Todos");document.getElementById("productos")?.scrollIntoView({behavior:"smooth"});}} className="group relative flex min-h-[148px] flex-col justify-between overflow-hidden rounded-2xl text-left text-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:min-h-[172px]">{imagen?<img src={imagen} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105"/>:<div className={`absolute inset-0 bg-gradient-to-br ${item.tone}`}/>}<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/5"/><div className="relative flex justify-end p-3"><span className="grid size-9 place-items-center rounded-xl border border-white/25 bg-black/15 backdrop-blur"><Icon className="size-4"/></span></div><div className="relative p-3 sm:p-4"><p className="text-xs font-extrabold leading-tight sm:text-sm">{item.label}</p><p className="mt-1 inline-flex items-center gap-1 text-[10px] text-white/75">Explorar <ArrowRight className="size-3"/></p></div></button>;})}</div>
      </section>
      <section id="productos" className="scroll-mt-28 border-t border-[#e7e7e7] bg-white px-5 py-9 sm:px-8 sm:py-12"><div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#9b7b3f]">Tienda profesional</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">Encuentra lo que necesitas</h2><p className="mt-2 text-sm text-[#777168]">Materiales, equipos y tecnología para tu trabajo.</p></div>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-[#ddd5c6] bg-white px-3 sm:w-72"><Search className="size-4 text-[#8c8375]" /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar resina, laptop, UPS, NAS…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
        </div>
        
        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-[#e7e7e7] bg-[#fafafa] p-4">
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
      </div></section>
      <footer className="border-t border-[#e1e1e1] bg-[#f8f8f8]"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-[#777168] sm:flex-row sm:items-center sm:justify-between sm:px-8"><p>© {new Date().getFullYear()} · Insumos, equipos y tecnología profesional</p><a href="/auth" className="hover:text-[#9b7b3f]">Volver a Aurum Lab</a></div></footer>
    </main>
  );
}
