import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, ChevronDown, MessageCircle, Search, Share2, Sparkles, Box } from "lucide-react";

export const Route = createFileRoute("/catalogo-publico")({
  head: () => ({
    meta: [
      { title: "Catálogo · Taller del Joyero" },
      { name: "description", content: "Catálogo digital de modelos de Taller del Joyero." },
    ],
  }),
  component: CatalogoPublicoPage,
});

const PRODUCTOS = [
  { id:"1", codigo:"TDJ-A024", nombre:"Aretes Punto de Luz", categoria:"Aretes", coleccion:"Esenciales", precio:"Desde S/ 480", image:"https://images.unsplash.com/photo-1635767798638-3e25273a8236?auto=format&fit=crop&w=1200&q=90", descripcion:"Una pieza delicada pensada para acompañar todos los días.", destacado:true },
  { id:"2", codigo:"TDJ-R018", nombre:"Anillo Aura", categoria:"Anillos", coleccion:"Esenciales", precio:"Desde S/ 1,250", image:"https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1200&q=90", descripcion:"Volumen limpio y contemporáneo, disponible en distintas combinaciones.", destacado:true },
  { id:"3", codigo:"TDJ-C011", nombre:"Collar Línea", categoria:"Collares", coleccion:"Línea Contemporánea", precio:"Desde S/ 890", image:"https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1200&q=90", descripcion:"Una silueta minimalista que puede adaptarse a diferentes materiales.", destacado:false },
  { id:"4", codigo:"TDJ-A031", nombre:"Aros Prisma", categoria:"Aretes", coleccion:"Línea Contemporánea", precio:"Consultar", image:"https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1200&q=90", descripcion:"Geometría ligera y acabado artesanal.", destacado:false },
  { id:"5", codigo:"TDJ-R031", nombre:"Anillo Prisma", categoria:"Anillos", coleccion:"Nueva colección", precio:"Consultar", image:"https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1200&q=90", descripcion:"Modelo de nueva colección con variantes de personalización.", destacado:false },
  { id:"6", codigo:"TDJ-P007", nombre:"Pulsera Esencial", categoria:"Pulseras", coleccion:"Esenciales", precio:"Desde S/ 720", image:"https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1200&q=90", descripcion:"Diseño sobrio para combinar con otras piezas.", destacado:false },
];

function CatalogoPublicoPage() {
  const [categoria, setCategoria] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [coleccion, setColeccion] = useState("Todas");
  const categorias = ["Todos", ...new Set(PRODUCTOS.map(p => p.categoria))];
  const colecciones = ["Todas", ...new Set(PRODUCTOS.map(p => p.coleccion))];
  const productos = useMemo(() => PRODUCTOS.filter(p => {
    const q = busqueda.trim().toLowerCase();
    return (!q || [p.nombre,p.codigo,p.categoria,p.coleccion].join(" ").toLowerCase().includes(q))
      && (categoria === "Todos" || p.categoria === categoria)
      && (coleccion === "Todas" || p.coleccion === coleccion);
  }), [busqueda,categoria,coleccion]);

  return (
    <main className="min-h-screen bg-[#f7f4ef] text-[#1f1b18]">
      <header className="border-b border-[#1f1b1815] bg-[#f7f4ef]/95 px-5 py-5 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="font-display text-2xl italic tracking-tight">Taller del Joyero</p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[.25em] text-[#8a6b36]">Catálogo digital</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="hidden rounded-full border border-[#1f1b1820] px-3 py-2 text-xs font-semibold sm:inline-flex"><Share2 className="mr-1.5 size-3.5" /> Compartir</button>
            <a href="https://wa.me/" className="rounded-full bg-[#1f1b18] px-3.5 py-2 text-xs font-semibold text-white">WhatsApp</a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[#1f1b1815]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(180,145,75,.16),transparent_38%)]" />
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-24">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.3em] text-[#8a6b36]">Colección · 2026</p>
            <h1 className="mt-4 max-w-xl font-display text-5xl leading-[.95] tracking-tight sm:text-6xl">Joyas hechas para quedarse.</h1>
            <p className="mt-6 max-w-lg text-sm leading-7 text-[#625b54]">Descubre nuestros modelos, explora sus detalles y solicita una propuesta personalizada directamente con el taller.</p>
            <div className="mt-7 flex flex-wrap gap-2">
              <a href="#coleccion" className="rounded-full bg-[#1f1b18] px-5 py-3 text-xs font-semibold text-white">Explorar colección <ArrowRight className="ml-1 inline size-3.5" /></a>
              <button type="button" className="rounded-full border border-[#1f1b1830] bg-white/50 px-5 py-3 text-xs font-semibold"><Box className="mr-1.5 inline size-3.5" /> Ver experiencias 3D</button>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] shadow-2xl">
            <img src={PRODUCTOS[1].image} alt="Anillo Aura" className="size-full object-cover" />
            <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/90 p-4 backdrop-blur">
              <p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#8a6b36]">{PRODUCTOS[1].codigo} · destacado</p>
              <div className="mt-1 flex items-end justify-between gap-3"><h2 className="text-lg font-semibold">{PRODUCTOS[1].nombre}</h2><span className="text-sm font-semibold">{PRODUCTOS[1].precio}</span></div>
            </div>
          </div>
        </div>
      </section>

      <section id="coleccion" className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#8a6b36]">Catálogo</p><h2 className="mt-1 font-display text-4xl">Explora los modelos</h2></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8b8178]" /><input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar modelo…" className="h-10 w-full rounded-full border border-[#1f1b1820] bg-white pl-9 pr-4 text-sm outline-none sm:w-64" /></div>
            <select value={categoria} onChange={e=>setCategoria(e.target.value)} className="h-10 rounded-full border border-[#1f1b1820] bg-white px-4 text-xs font-semibold"><option>Todos</option>{categorias.slice(1).map(c=><option key={c}>{c}</option>)}</select>
            <select value={coleccion} onChange={e=>setColeccion(e.target.value)} className="h-10 rounded-full border border-[#1f1b1820] bg-white px-4 text-xs font-semibold"><option>Todas</option>{colecciones.slice(1).map(c=><option key={c}>{c}</option>)}</select>
          </div>
        </div>

        <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {productos.map(p => (
            <article key={p.id} className="group">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-[#e9e3da]">
                <img src={p.image} alt={p.nombre} className="size-full object-cover transition duration-700 group-hover:scale-[1.035]" />
                {p.destacado ? <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider">Destacado</span> : null}
                <button type="button" className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-full bg-white/90 shadow-lg" aria-label="Vista rápida"><ArrowRight className="size-4" /></button>
              </div>
              <div className="px-1 pt-4">
                <p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#8a6b36]">{p.codigo} · {p.coleccion}</p>
                <h3 className="mt-1 text-lg font-semibold">{p.nombre}</h3>
                <p className="mt-1 text-xs leading-5 text-[#746b62]">{p.descripcion}</p>
                <div className="mt-3 flex items-center justify-between"><span className="text-sm font-semibold">{p.precio}</span><button type="button" className="text-xs font-semibold underline underline-offset-4">Solicitar cotización</button></div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[#1f1b1815] bg-white/60">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 md:grid-cols-3">
          <Feature icon={Box} title="Explora en 3D" text="Conecta cada modelo con AURUM Render cuando la pieza tenga experiencia 3D disponible." />
          <Feature icon={BookOpen} title="Colecciones" text="Navega por líneas y lanzamientos sin convertir el catálogo en un PDF estático." />
          <Feature icon={MessageCircle} title="Habla con el taller" text="Cada pieza puede llevar directamente a WhatsApp o a una solicitud de cotización." />
        </div>
      </section>

      <footer className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="flex flex-col gap-3 border-t border-[#1f1b1815] pt-6 text-xs text-[#746b62] sm:flex-row sm:items-center sm:justify-between">
          <span>© Taller del Joyero · Catálogo digital</span>
          <Link to="/inicio" className="font-semibold text-[#1f1b18]">Acceso al ERP</Link>
        </div>
      </footer>
    </main>
  );
}

function Feature({ icon: Icon, title, text }: { icon: typeof Box; title: string; text: string }) {
  return <div><Icon className="size-5 text-[#8a6b36]" /><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-[#746b62]">{text}</p></div>;
}
