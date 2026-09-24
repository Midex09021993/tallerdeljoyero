import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ExternalLink, Grid2X2, Image as ImageIcon, LayoutList, Plus, Search, Share2, Sparkles } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { useSesion } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/catalogo")({
  head: () => ({
    meta: [
      { title: "Catálogo — Taller del Joyero" },
      { name: "description", content: "Catálogo interno y publicación digital de modelos de joyería." },
    ],
  }),
  component: CatalogoPage,
});

type Producto = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  imagen: string;
  coleccion: string;
  destacado?: boolean;
  precioDesde?: string;
  estado: "Publicado" | "Borrador";
};

const DEMO: Producto[] = [
  {
    id: "demo-1",
    codigo: "TDJ-A024",
    nombre: "Aretes Punto de Luz",
    categoria: "Aretes",
    descripcion: "Diseño delicado para uso diario, disponible en diferentes aleaciones y piedras.",
    imagen: "https://images.unsplash.com/photo-1635767798638-3e25273a8236?auto=format&fit=crop&w=900&q=85",
    coleccion: "Esenciales",
    destacado: true,
    precioDesde: "Desde S/ 480",
    estado: "Publicado",
  },
  {
    id: "demo-2",
    codigo: "TDJ-R018",
    nombre: "Anillo Aura",
    categoria: "Anillos",
    descripcion: "Silueta contemporánea preparada para variantes de oro y piedra central.",
    imagen: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=85",
    coleccion: "Esenciales",
    destacado: true,
    precioDesde: "Desde S/ 1,250",
    estado: "Publicado",
  },
  {
    id: "demo-3",
    codigo: "TDJ-C011",
    nombre: "Collar Línea",
    categoria: "Collares",
    descripcion: "Pieza minimalista con lectura limpia y posibilidad de personalización.",
    imagen: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=85",
    coleccion: "Línea Contemporánea",
    destacado: false,
    precioDesde: "Desde S/ 890",
    estado: "Publicado",
  },
  {
    id: "demo-4",
    codigo: "TDJ-R031",
    nombre: "Anillo Prisma",
    categoria: "Anillos",
    descripcion: "Modelo en preparación para publicación. La ficha técnica permanece interna.",
    imagen: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=900&q=85",
    coleccion: "Nueva colección",
    destacado: false,
    estado: "Borrador",
  },
];

function CatalogoPage() {
  const { data: sesion } = useSesion();
  const { data: catalogoConfig } = useQuery({
    queryKey: ["catalogo-config-publico", sesion?.sede?.id],
    enabled: Boolean(sesion?.sede?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalogo_configuracion")
        .select("slug, visible, nombre_publico")
        .eq("sede_id", sesion!.sede!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [vista, setVista] = useState<"grid" | "lista">("grid");
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("Todos");

  const categorias = ["Todos", ...new Set(DEMO.map((p) => p.categoria))];
  const productos = useMemo(() => DEMO.filter((p) => {
    const q = busqueda.trim().toLowerCase();
    return (!q || [p.nombre, p.codigo, p.categoria, p.coleccion].join(" ").toLowerCase().includes(q))
      && (categoria === "Todos" || p.categoria === categoria);
  }), [busqueda, categoria]);

  return (
    <AppShell
      titulo="Catálogo"
      subtitulo="Portafolio de modelos · gestión interna y publicación externa"
      acciones={
        <div className="flex flex-wrap gap-2">
          {catalogoConfig?.slug ? (
            <a href={`/catalogo-publico/${catalogoConfig.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold hover:border-gold/40">
              <ExternalLink className="size-4" /> Ver catálogo público
            </a>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-xs font-semibold text-muted-foreground">
              <ExternalLink className="size-4" /> Configurar catálogo público
            </span>
          )}
          {sesion?.esAdmin ? (
            <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-gold px-3.5 py-2.5 text-xs font-semibold text-gold-foreground">
              <Plus className="size-4" /> Nuevo modelo
            </button>
          ) : null}
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Modelos" value={DEMO.length.toString()} icon={BookOpen} />
        <Kpi label="Publicados" value={DEMO.filter((p) => p.estado === "Publicado").length.toString()} icon={ExternalLink} />
        <Kpi label="Colecciones" value={new Set(DEMO.map((p) => p.coleccion)).size.toString()} icon={Sparkles} />
        <Kpi label="Destacados" value={DEMO.filter((p) => p.destacado).length.toString()} icon={Sparkles} />
      </div>

      <section className="mt-6 overflow-hidden rounded-[26px] border border-gold/15 bg-card shadow-card">
        <div className="border-b border-border p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-gold">Portafolio</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Modelos de joyería</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Una fuente maestra para colecciones, imágenes, variantes, 3D y publicación. Los costos y datos de producción permanecen fuera del catálogo público.</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setVista("grid")} className={vista === "grid" ? "rounded-lg bg-gold/10 p-2 text-gold" : "rounded-lg p-2 text-muted-foreground"} aria-label="Vista de tarjetas"><Grid2X2 className="size-4" /></button>
              <button type="button" onClick={() => setVista("lista")} className={vista === "lista" ? "rounded-lg bg-gold/10 p-2 text-gold" : "rounded-lg p-2 text-muted-foreground"} aria-label="Vista de lista"><LayoutList className="size-4" /></button>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar modelo, código o colección…" className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-gold/40" />
            </div>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="h-11 rounded-xl border border-border bg-background px-3 text-sm">
              {categorias.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className={vista === "grid" ? "grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3" : "divide-y divide-border"}>
          {productos.map((p) => (
            <article key={p.id} className={vista === "grid" ? "group bg-card" : "flex gap-4 bg-card p-4"}>
              <div className={vista === "grid" ? "relative aspect-[4/3] overflow-hidden" : "relative size-28 shrink-0 overflow-hidden rounded-xl"}>
                <img src={p.imagen} alt={p.nombre} className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider">{p.estado}</span>
              </div>
              <div className={vista === "grid" ? "p-5" : "flex flex-1 items-center justify-between gap-4"}>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[.18em] text-gold">{p.codigo} · {p.coleccion}</p>
                  <h3 className="mt-1 text-lg font-semibold">{p.nombre}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{p.descripcion}</p>
                  {p.precioDesde ? <p className="mt-3 text-sm font-semibold">{p.precioDesde}</p> : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.estado === "Publicado" && catalogoConfig?.slug ? <a href={`/catalogo-publico/${catalogoConfig.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-gold/40"><ExternalLink className="size-3.5" /> Público</a> : null}
                  <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs font-semibold"><ImageIcon className="size-3.5" /> Ficha</button>
                  <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs font-semibold"><Share2 className="size-3.5" /> Compartir</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Panel titulo="Arquitectura del catálogo" className="mt-6">
        <div className="grid gap-3 md:grid-cols-3">
          <Arch label="Contenido maestro" text="Modelo, código, categoría, colección, galería, video y enlace a AURUM Render." />
          <Arch label="Interno" text="Ficha técnica, materiales, procesos, costos y notas de producción permanecen en el ERP." />
          <Arch label="Externo" text="Solo información comercial publicada, con CTA a cotización, WhatsApp y enlace compartible." />
        </div>
      </Panel>
    </AppShell>
  );
}

function Kpi({ label, value, icon: Icon }: { label: string; value: string; icon: typeof BookOpen }) {
  return <div className="rounded-2xl border border-border bg-card p-4 shadow-card"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span><Icon className="size-4 text-gold" /></div><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}
function Arch({ label, text }: { label: string; text: string }) {
  return <div className="rounded-xl border border-border bg-surface-muted/40 p-4"><p className="text-xs font-semibold text-gold">{label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></div>;
}
