import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ExternalLink, Grid2X2, Image as ImageIcon, LayoutList, Plus, Search, Share2, Sparkles } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { CatalogoModeloDialog, type CatalogoProductoEditor } from "@/components/CatalogoModeloDialog";
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
  id: string; codigo: string; nombre: string; categoria: string; descripcion: string;
  imagen: string | null; coleccion: string; destacado: boolean;
  precioDesde: string | null; estado: "Publicado" | "Borrador";
};
type ProductoRow = {
  id: string; codigo: string; nombre: string; categoria: string; descripcion: string | null;
  imagen_principal_url: string | null; precio_desde: number | null; moneda: string;
  publicado: boolean; destacado: boolean; orden: number;
};
type ColeccionRow = {
  producto_id: string; coleccion_id: string; coleccion: { nombre: string } | null;
};
function formatPrice(value: number | null, moneda: string | null) {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat("es-PE", {
    style: "currency", currency: moneda || "PEN", maximumFractionDigits: 0,
  }).format(value);
}

function CatalogoPage() {
  const { data: sesion } = useSesion();
  const queryClient = useQueryClient();
  const [editorAbierto, setEditorAbierto] = useState(false);
  const [modeloEditando, setModeloEditando] = useState<CatalogoProductoEditor | null>(null);
  const [guardandoAccion, setGuardandoAccion] = useState<string | null>(null);
  const puedeGestionar = Boolean(sesion?.esAdmin);
  const abrirNuevo = () => { setModeloEditando(null); setEditorAbierto(true); };
  const abrirEdicion = (producto: Producto) => {
    const row = productoRows.find((item) => item.id === producto.id);
    if (!row) return;
    setModeloEditando(row); setEditorAbierto(true);
  };
  const cambiarFlag = async (id: string, campo: "publicado" | "destacado", valor: boolean) => {
    if (!puedeGestionar || guardandoAccion) return;
    setGuardandoAccion(campo + ":" + id);
    try {
      const { error } = await supabase.from("catalogo_productos").update({ [campo]: valor }).eq("id", id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["catalogo-productos", sesion?.sede?.id] });
    } catch (error) { window.alert(error instanceof Error ? error.message : "No se pudo actualizar el modelo."); }
    finally { setGuardandoAccion(null); }
  };
  const compartir = async (producto: Producto) => {
    if (!catalogoConfig?.slug) return;
    const url = window.location.origin + "/" + catalogoConfig.slug;
    try {
      if (navigator.share) await navigator.share({ title: producto.nombre, text: producto.nombre + " · " + (catalogoConfig.nombre_publico ?? "Catálogo"), url });
      else await navigator.clipboard.writeText(url);
    } catch {}
  };
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

  const { data: productoRows = [], isLoading: productosLoading, error: productosError } = useQuery({
    queryKey: ["catalogo-productos", sesion?.sede?.id],
    enabled: Boolean(sesion?.sede?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("catalogo_productos")
        .select("id, codigo, nombre, categoria, descripcion, imagen_principal_url, precio_desde, moneda, publicado, destacado, orden")
        .eq("sede_id", sesion!.sede!.id).order("orden", { ascending: true }).order("nombre", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProductoRow[];
    },
    staleTime: 30_000,
  });

  const productoIds = useMemo(() => productoRows.map((p) => p.id), [productoRows]);
  const { data: coleccionRows = [] } = useQuery({
    queryKey: ["catalogo-producto-colecciones", sesion?.sede?.id, productoIds],
    enabled: productoIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("catalogo_productos_colecciones")
        .select("producto_id, coleccion_id, coleccion:catalogo_colecciones(nombre)")
        .in("producto_id", productoIds);
      if (error) throw error;
      return (data ?? []) as ColeccionRow[];
    },
    staleTime: 30_000,
  });

  const coleccionesPorProducto = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of coleccionRows) if (row.coleccion?.nombre) map.set(row.producto_id, row.coleccion.nombre);
    return map;
  }, [coleccionRows]);

  const todosLosProductos = useMemo<Producto[]>(
    () => productoRows.map((p) => ({
      id: p.id, codigo: p.codigo, nombre: p.nombre, categoria: p.categoria,
      descripcion: p.descripcion ?? "", imagen: p.imagen_principal_url,
      coleccion: coleccionesPorProducto.get(p.id) ?? "Sin colección",
      destacado: p.destacado, precioDesde: formatPrice(p.precio_desde, p.moneda),
      estado: p.publicado ? "Publicado" : "Borrador",
    })),
    [productoRows, coleccionesPorProducto],
  );
  const categorias = useMemo(
    () => ["Todos", ...new Set(todosLosProductos.map((p) => p.categoria))],
    [todosLosProductos],
  );
  const productos = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return todosLosProductos.filter((p) =>
      (!q || [p.nombre, p.codigo, p.categoria, p.coleccion].join(" ").toLowerCase().includes(q))
      && (categoria === "Todos" || p.categoria === categoria),
    );
  }, [todosLosProductos, busqueda, categoria]);

  if (productosLoading) return (
    <AppShell titulo="Catálogo" subtitulo="Cargando modelos publicados y borradores…">
      <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">Consultando el catálogo maestro de esta sede.</div>
    </AppShell>
  );
  if (productosError) return (
    <AppShell titulo="Catálogo" subtitulo="No se pudo cargar el catálogo maestro">
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8">
        <p className="font-semibold text-destructive">Error al consultar los modelos</p>
        <p className="mt-2 text-sm text-muted-foreground">{productosError.message}</p>
      </div>
    </AppShell>
  );

  return (
    <AppShell
      titulo="Catálogo"
      subtitulo="Portafolio de modelos · gestión interna y publicación externa"
      acciones={
        <div className="flex flex-wrap gap-2">
          {catalogoConfig?.slug ? (
            <a href={`/${catalogoConfig.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold hover:border-gold/40">
              <ExternalLink className="size-4" /> Ver catálogo público
            </a>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-xs font-semibold text-muted-foreground">
              <ExternalLink className="size-4" /> Configurar catálogo público
            </span>
          )}
          {puedeGestionar ? (
            <button type="button" onClick={abrirNuevo} className="inline-flex items-center gap-2 rounded-xl bg-gold px-3.5 py-2.5 text-xs font-semibold text-gold-foreground">
              <Plus className="size-4" /> Nuevo modelo
            </button>
          ) : null}
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Modelos" value={todosLosProductos.length.toString()} icon={BookOpen} />
        <Kpi label="Publicados" value={todosLosProductos.filter((p) => p.estado === "Publicado").length.toString()} icon={ExternalLink} />
        <Kpi label="Colecciones" value={new Set(todosLosProductos.map((p) => p.coleccion)).size.toString()} icon={Sparkles} />
        <Kpi label="Destacados" value={todosLosProductos.filter((p) => p.destacado).length.toString()} icon={Sparkles} />
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

        {productos.length ? (
          <div className={vista === "grid" ? "grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3" : "divide-y divide-border"}>
          {productos.map((p) => (
            <article key={p.id} className={vista === "grid" ? "group bg-card" : "flex gap-4 bg-card p-4"}>
              <div className={vista === "grid" ? "relative aspect-[4/3] overflow-hidden" : "relative size-28 shrink-0 overflow-hidden rounded-xl"}>
                {p.imagen ? <img src={p.imagen} alt={p.nombre} className="size-full object-cover transition-transform duration-700 group-hover:scale-105" /> : <div className="grid size-full place-items-center bg-surface-muted"><ImageIcon className="size-10 text-muted-foreground" /></div>}
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
                  {p.estado === "Publicado" && catalogoConfig?.slug ? <a href={`/${catalogoConfig.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-gold/40"><ExternalLink className="size-3.5" /> Público</a> : null}
                  {puedeGestionar ? <><button type="button" onClick={() => void cambiarFlag(p.id, "publicado", p.estado !== "Publicado")} disabled={guardandoAccion === "publicado:" + p.id} className="inline-flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs font-semibold disabled:opacity-50">{p.estado === "Publicado" ? "Retirar" : "Publicar"}</button><button type="button" onClick={() => void cambiarFlag(p.id, "destacado", !p.destacado)} disabled={guardandoAccion === "destacado:" + p.id} className="inline-flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs font-semibold disabled:opacity-50">{p.destacado ? "Quitar destacado" : "Destacar"}</button></> : null}<button type="button" onClick={() => abrirEdicion(p)} className="inline-flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs font-semibold"><ImageIcon className="size-3.5" /> Ficha</button><button type="button" onClick={() => void compartir(p)} className="inline-flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs font-semibold"><Share2 className="size-3.5" /> Compartir</button>
                </div>
              </div>
            </article>
          ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-card p-10 text-center">
            <p className="font-semibold">No hay modelos para mostrar.</p>
            <p className="mt-1 text-sm text-muted-foreground">Crea el primer modelo desde este catálogo para que pueda publicarse.</p>
          </div>
        )}
      </section>

      <CatalogoModeloDialog open={editorAbierto} producto={modeloEditando} sedeId={sesion?.sede?.id ?? ""} onClose={() => setEditorAbierto(false)} onSaved={() => { if (sesion?.sede?.id) void queryClient.invalidateQueries({ queryKey: ["catalogo-productos", sesion.sede.id] }); }} />

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
