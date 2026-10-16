// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, ExternalLink, Grid2X2, Image as ImageIcon, LayoutList, Pencil, Plus, Search, Share2, Sparkles, Settings, Tags, X } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { CatalogoCategoriasDialog } from "@/components/CatalogoCategoriasDialog";
import { CatalogoColeccionesDialog } from "@/components/CatalogoColeccionesDialog";
import { CatalogoModeloDialog, type CatalogoProductoEditor, type ProyectoNubeInicial } from "@/components/CatalogoModeloDialog";
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
  id: string; codigo: string; nombre: string; slug: string; categoria: string; descripcion: string;
  imagen: string | null; coleccion: string; destacado: boolean;
  precioDesde: string | null; estado: "Publicado" | "Borrador";
};
type ProductoRow = {
  id: string; codigo: string; nombre: string; slug: string; categoria: string; descripcion: string | null;
  imagen_principal_url: string | null; galeria: unknown; video_url: string | null; aurum_render_url: string | null; precio_desde: number | null; moneda: string;
  publicado: boolean; destacado: boolean; orden: number;
  metal_principal: string | null; peso_gramos: number | null; piedras: string | null; medidas: string | null; talla: string | null; modalidad_talla: string | null; sistema_tallas: string | null; tallas_disponibles: string | null;
  tecnica: string | null; acabado: string | null; disponibilidad: string; tiempo_fabricacion_dias: number | null; ficha_tecnica_url: string | null;
  mostrar_precio: boolean; mostrar_ficha_tecnica: boolean; notas_internas: string | null;
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

function normalizarSlugCatalogo(value: string) {
  let limpio = value.trim();
  if (!limpio) return "";

  // Acepta slug o URL completa y conserva solo la ruta pública.
  limpio = limpio
    .replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+\/?/i, "")
    .replace(/^www\.[^/]+\/?/i, "")
    .replace(/[?#].*$/, "")
    .replace(/^\/+|\/+$/g, "");

  return limpio
    .split("/")
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function CatalogoPage() {
  const { data: sesion } = useSesion();
  const queryClient = useQueryClient();
  const [editorAbierto, setEditorAbierto] = useState(false);
  const [configAbierta, setConfigAbierta] = useState(false);
  const [categoriasAbierta, setCategoriasAbierta] = useState(false);
  const [coleccionesAbierta, setColeccionesAbierta] = useState(false);
  const [modeloEditando, setModeloEditando] = useState<CatalogoProductoEditor | null>(null);
  const [imagenDesdeMiNube, setImagenDesdeMiNube] = useState<{ nombre: string; imagen_principal_url: string } | null>(null);
  const [proyectoDesdeMiNube, setProyectoDesdeMiNube] = useState<ProyectoNubeInicial | null>(null);
  const [pdfDesdeMiNube, setPdfDesdeMiNube] = useState<{ nombre: string; ruta: string } | null>(null);
  const [guardandoAccion, setGuardandoAccion] = useState<string | null>(null);
  const puedeGestionar = Boolean(sesion?.esAdmin);

  useEffect(() => {
    try {
      const pendiente = sessionStorage.getItem("mi-nube-catalogo-pendiente");
      if (!pendiente) return;
      const parsed = JSON.parse(pendiente);
      if (typeof parsed?.imagen_principal_url === "string" && typeof parsed?.nombre === "string") {
        setImagenDesdeMiNube(parsed);
        const pdf = parsed?.pdf_nube;
        if (pdf && typeof pdf.nombre === "string" && typeof pdf.ruta === "string" && pdf.ruta.toLowerCase().endsWith(".pdf")) setPdfDesdeMiNube({ nombre: pdf.nombre, ruta: pdf.ruta });
        else setPdfDesdeMiNube(null);
        const proyecto = parsed?.proyecto_nube;
        if (proyecto && typeof proyecto.carpeta === "string" && Array.isArray(proyecto.archivos)) {
          const archivos = proyecto.archivos.filter((archivo: any) =>
            archivo && typeof archivo.nombre === "string" && typeof archivo.ruta === "string" &&
            typeof archivo.categoria === "string" && typeof archivo.bytes === "number" &&
            (archivo.origen === "nas" || archivo.origen === "supabase"),
          );
          setProyectoDesdeMiNube({ carpeta: proyecto.carpeta, archivos });
        } else setProyectoDesdeMiNube(null);
        setModeloEditando(null);
        setEditorAbierto(true);
      }
    } catch { sessionStorage.removeItem("mi-nube-catalogo-pendiente"); }
  }, []);

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
      const { error } = await supabase.from("catalogo_productos").update({ [campo]: valor }).eq("id", id).eq("participante_id", sesion!.participante!.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["catalogo-productos", sesion?.participante?.id] });
    } catch (error) { window.alert(error instanceof Error ? error.message : "No se pudo actualizar el modelo."); }
    finally { setGuardandoAccion(null); }
  };
  const eliminarProducto = async (producto: Producto) => {
    if (!puedeGestionar || guardandoAccion) return;
    const confirmado = window.confirm(
      `¿Eliminar el modelo "${producto.nombre}"? Esta acción elimina el registro del catálogo y no se puede deshacer.`,
    );
    if (!confirmado) return;

    setGuardandoAccion("eliminar:" + producto.id);
    try {
      const { error } = await supabase
        .from("catalogo_productos")
        .delete()
        .eq("id", producto.id)
        .eq("participante_id", sesion!.participante!.id);
      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catalogo-productos", sesion?.participante?.id] }),
        queryClient.invalidateQueries({ queryKey: ["catalogo-producto-colecciones", sesion?.participante?.id] }),
      ]);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo eliminar el modelo.");
    } finally {
      setGuardandoAccion(null);
    }
  };

  const compartir = async (producto: Producto) => {
    if (!catalogoConfig?.slug) return;
    const row = productoRows.find((item) => item.id === producto.id);
    const url = window.location.origin + "/" + catalogoConfig.slug + "/" + (row?.slug ?? producto.id);
    try {
      if (navigator.share) await navigator.share({ title: producto.nombre, text: producto.nombre + " · " + (catalogoConfig.nombre_publico ?? "Catálogo"), url });
      else await navigator.clipboard.writeText(url);
    } catch {}
  };
  const { data: catalogoConfig } = useQuery({
    queryKey: ["catalogo-config-publico", sesion?.participante?.id],
    enabled: Boolean(sesion?.participante?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalogo_configuracion")
        .select("slug, visible, nombre_publico")
        .eq("participante_id", sesion!.participante!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [vista, setVista] = useState<"grid" | "lista">("grid");
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("Todos");

  const { data: categoriasRows = [] } = useQuery({
    queryKey: ["catalogo-categorias", sesion?.participante?.id],
    enabled: Boolean(sesion?.participante?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalogo_categorias")
        .select("id, nombre, slug, orden, activo")
        .eq("participante_id", sesion!.participante!.id)
        .eq("activo", true)
        .order("orden", { ascending: true })
        .order("nombre", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
  const categoriasDisponibles = useMemo(() => categoriasRows.map((item) => item.nombre), [categoriasRows]);

  const { data: productoRows = [], isLoading: productosLoading, error: productosError } = useQuery({
    queryKey: ["catalogo-productos", sesion?.participante?.id],
    enabled: Boolean(sesion?.participante?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("catalogo_productos")
        .select("id, codigo, nombre, slug, categoria, descripcion, imagen_principal_url, galeria, video_url, aurum_render_url, precio_desde, moneda, publicado, destacado, orden, metal_principal, peso_gramos, piedras, medidas, talla, tecnica, acabado, disponibilidad, tiempo_fabricacion_dias, ficha_tecnica_url, mostrar_precio, mostrar_ficha_tecnica, notas_internas")
        .eq("participante_id", sesion!.participante!.id).order("orden", { ascending: true }).order("nombre", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProductoRow[];
    },
    staleTime: 30_000,
  });

  const productoIds = useMemo(() => productoRows.map((p) => p.id), [productoRows]);
  const { data: coleccionRows = [] } = useQuery({
    queryKey: ["catalogo-producto-colecciones", sesion?.participante?.id, productoIds],
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
      id: p.id, codigo: p.codigo, nombre: p.nombre, slug: p.slug, categoria: p.categoria,
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
          {puedeGestionar ? (
            <>
              {catalogoConfig?.slug ? (
                <a href={`/${catalogoConfig.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold hover:border-gold/40">
                  <ExternalLink className="size-4" /> Ver catálogo público
                </a>
              ) : null}
              <button type="button" onClick={() => setConfigAbierta(true)} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold hover:border-gold/40">
                <Settings className="size-4" /> Configurar catálogo público
              </button>
              <button type="button" onClick={() => setCategoriasAbierta(true)} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold hover:border-gold/40">
                <Tags className="size-4" /> Categorías
              </button>
              <button type="button" onClick={() => setColeccionesAbierta(true)} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold hover:border-gold/40">
                <Sparkles className="size-4" /> Colecciones
              </button>
            </>
          ) : null}
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
                  {p.estado === "Publicado" && catalogoConfig?.slug ? <a href={`/${catalogoConfig.slug}/${p.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-gold/40"><ExternalLink className="size-3.5" /> Público</a> : null}
                  {puedeGestionar ? <><button type="button" onClick={() => void cambiarFlag(p.id, "publicado", p.estado !== "Publicado")} disabled={guardandoAccion === "publicado:" + p.id} className="inline-flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs font-semibold disabled:opacity-50">{p.estado === "Publicado" ? "Retirar" : "Publicar"}</button><button type="button" onClick={() => void cambiarFlag(p.id, "destacado", !p.destacado)} disabled={guardandoAccion === "destacado:" + p.id} className="inline-flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs font-semibold disabled:opacity-50">{p.destacado ? "Quitar destacado" : "Destacar"}</button></> : null}<button type="button" onClick={() => abrirEdicion(p)} className="inline-flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs font-semibold"><Pencil className="size-3.5" /> Editar</button><button type="button" onClick={() => void compartir(p)} className="inline-flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs font-semibold"><Share2 className="size-3.5" /> Compartir</button>{puedeGestionar ? <button type="button" onClick={() => void eliminarProducto(p)} disabled={guardandoAccion === "eliminar:" + p.id} className="inline-flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive disabled:opacity-50">{guardandoAccion === "eliminar:" + p.id ? "Eliminando…" : "Eliminar"}</button> : null}
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

      <CatalogoModeloDialog open={editorAbierto} producto={modeloEditando} participanteId={sesion?.participante?.id ?? ""} categorias={categoriasDisponibles} initialImageUrl={imagenDesdeMiNube?.imagen_principal_url} initialName={imagenDesdeMiNube?.nombre} initialProject={proyectoDesdeMiNube} initialPdf={pdfDesdeMiNube} onClose={() => { sessionStorage.removeItem("mi-nube-catalogo-pendiente"); setEditorAbierto(false); setImagenDesdeMiNube(null); setProyectoDesdeMiNube(null); setPdfDesdeMiNube(null); }} onSaved={() => { sessionStorage.removeItem("mi-nube-catalogo-pendiente"); setImagenDesdeMiNube(null); setProyectoDesdeMiNube(null); setPdfDesdeMiNube(null); if (sesion?.participante?.id) void queryClient.invalidateQueries({ queryKey: ["catalogo-productos", sesion.participante.id] }); }} />
      <CatalogoConfiguracionDialog open={configAbierta} participanteId={sesion?.participante?.id ?? ""} initial={catalogoConfig} onClose={() => setConfigAbierta(false)} onSaved={() => { if (sesion?.participante?.id) void queryClient.invalidateQueries({ queryKey: ["catalogo-config-publico", sesion.participante.id] }); }} />
      <CatalogoCategoriasDialog open={categoriasAbierta} participanteId={sesion?.participante?.id ?? ""} onClose={() => setCategoriasAbierta(false)} onChanged={() => { if (sesion?.participante?.id) void queryClient.invalidateQueries({ queryKey: ["catalogo-categorias", sesion.participante.id] }); }} />
      <CatalogoColeccionesDialog open={coleccionesAbierta} participanteId={sesion?.participante?.id ?? ""} productos={productoRows.map((p) => ({ id: p.id, nombre: p.nombre, codigo: p.codigo }))} onClose={() => setColeccionesAbierta(false)} onChanged={() => { if (sesion?.participante?.id) { void queryClient.invalidateQueries({ queryKey: ["catalogo-producto-colecciones", sesion.participante.id] }); void queryClient.invalidateQueries({ queryKey: ["catalogo-productos", sesion.participante.id] }); } }} />

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

function CatalogoConfiguracionDialog({ open, participanteId, initial, onClose, onSaved }: any) {
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [telefonoContacto, setTelefonoContacto] = useState("");
  const [emailContacto, setEmailContacto] = useState("");
  const [direccionContacto, setDireccionContacto] = useState("");
  const [redesSociales, setRedesSociales] = useState({ instagram: "", tiktok: "", youtube: "", facebook: "", pinterest: "" });
  const [descripcion, setDescripcion] = useState("");
  const [frasePortada, setFrasePortada] = useState("");
  const [textoSuperiorPortada, setTextoSuperiorPortada] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [imagenesPortada, setImagenesPortada] = useState<string[]>([]);
  const [intervaloPortada, setIntervaloPortada] = useState(5);
  const [enlacesCarrusel, setEnlacesCarrusel] = useState<{ imagen_url: string; url_imagen_externa: string; enlace_url: string; texto: string; nueva_pestana: boolean }[]>([]);
  const [subiendoCarrusel, setSubiendoCarrusel] = useState(false);
  const [progresoCarrusel, setProgresoCarrusel] = useState("");
  const [progresoCarruselPorcentaje, setProgresoCarruselPorcentaje] = useState(0);
  const [urlNuevaImagenCarrusel, setUrlNuevaImagenCarrusel] = useState("");
  const [subiendoImagenes, setSubiendoImagenes] = useState(false);
  const [visible, setVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNombre(initial?.nombre_publico ?? "");
    setSlug(initial?.slug ?? "");
    setVisible(Boolean(initial?.visible));
    setError(null);
    void Promise.all([
      supabase.from("catalogo_configuracion").select("whatsapp, telefono_contacto, email_contacto, direccion_contacto, descripcion, logo_url, frase_portada, texto_superior_portada, imagenes_portada, intervalo_portada_segundos, redes_sociales, enlaces_carrusel").eq("participante_id", participanteId).maybeSingle(),
      supabase.from("identidades_comerciales").select("logo_url, activa").eq("participante_id", participanteId).not("logo_url", "is", null).order("activa", { ascending: false }).limit(1).maybeSingle(),
    ]).then(([configResult, identidadResult]) => {
      setWhatsapp(configResult.data?.whatsapp ?? "");
      setTelefonoContacto(configResult.data?.telefono_contacto ?? "");
      setEmailContacto(configResult.data?.email_contacto ?? "");
      setDireccionContacto(configResult.data?.direccion_contacto ?? "");
      const redes = configResult.data?.redes_sociales && typeof configResult.data.redes_sociales === "object" ? configResult.data.redes_sociales : {};
      setRedesSociales({ instagram: redes.instagram ?? "", tiktok: redes.tiktok ?? "", youtube: redes.youtube ?? "", facebook: redes.facebook ?? "", pinterest: redes.pinterest ?? "" });
      setDescripcion(configResult.data?.descripcion ?? "");
      setFrasePortada(configResult.data?.frase_portada ?? "");
      setTextoSuperiorPortada(configResult.data?.texto_superior_portada ?? "");
      // The showroom may use its own logo, independent from the workshop identity.
      setLogoUrl(configResult.data?.logo_url ?? identidadResult.data?.logo_url ?? null);
      setImagenesPortada(Array.isArray(configResult.data?.imagenes_portada) ? configResult.data.imagenes_portada.filter((url: unknown) => typeof url === "string").slice(0, 10) : []);
      setIntervaloPortada(Math.min(30, Math.max(2, Number(configResult.data?.intervalo_portada_segundos ?? 5))));
      setEnlacesCarrusel(Array.isArray(configResult.data?.enlaces_carrusel) ? configResult.data.enlaces_carrusel.filter((slide: any) => slide && typeof slide.imagen_url === "string").slice(0, 10).map((slide: any) => ({ imagen_url: slide.imagen_url, url_imagen_externa: typeof slide.url_imagen_externa === "string" ? slide.url_imagen_externa : "", enlace_url: typeof slide.enlace_url === "string" ? slide.enlace_url : "", texto: typeof slide.texto === "string" ? slide.texto : "", nueva_pestana: slide.nueva_pestana !== false, tipo_media: slide.tipo_media === "video" ? "video" : "imagen" })) : []);
    });
  }, [open, initial, participanteId]);

  if (!open) return null;

  async function subirImagenesPortada(event: any) {
    const files = Array.from(event.target.files ?? []) as File[];
    event.target.value = "";
    if (!files.length) return;
    if (imagenesPortada.length + files.length > 10) {
      setError("Puedes tener como máximo 10 imágenes de portada. Quita alguna antes de subir más.");
      return;
    }
    setSubiendoImagenes(true);
    setError(null);
    try {
      const nuevas: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) throw new Error("Solo puedes subir archivos de imagen.");
        if (file.size > 8 * 1024 * 1024) throw new Error("Cada imagen debe pesar como máximo 8 MB.");
        const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const destino = participanteId + "/portadas/" + crypto.randomUUID() + "." + extension;
        const { error: uploadError } = await supabase.storage.from("catalogo-joyas").upload(destino, file, { upsert: false, contentType: file.type });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("catalogo-joyas").getPublicUrl(destino);
        if (!data?.publicUrl) throw new Error("No se pudo obtener la URL pública de una imagen.");
        nuevas.push(data.publicUrl);
      }
      setImagenesPortada(actual => [...actual, ...nuevas].slice(0, 10));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron subir las imágenes.");
    } finally {
      setSubiendoImagenes(false);
    }
  }

  function agregarImagenPorUrl() {
    const url = urlNuevaImagenCarrusel.trim();
    if (!/^https?:\/\//i.test(url)) { setError("Introduce una URL HTTP o HTTPS válida para la imagen o el video."); return; }
    if (enlacesCarrusel.length >= 10) { setError("El carrusel admite como máximo 10 imágenes."); return; }
    setEnlacesCarrusel(actual => [...actual, { imagen_url: url, url_imagen_externa: "", enlace_url: "", texto: "", nueva_pestana: true, tipo_media: /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url) ? "video" : "imagen" }]);
    setUrlNuevaImagenCarrusel("");
    setError(null);
  }

  async function subirImagenesCarrusel(event: any) {
    const files = Array.from(event.target.files ?? []) as File[];
    event.target.value = "";
    if (!files.length) return;
    if (enlacesCarrusel.length + files.length > 10) { setError("El carrusel admite como máximo 10 elementos entre imágenes y videos."); return; }
    const totalBytes = files.reduce((total, file) => total + file.size, 0);
    let bytesCompletados = 0;
    setSubiendoCarrusel(true);
    setProgresoCarruselPorcentaje(0);
    setProgresoCarrusel(`Preparando ${files.length} archivo${files.length === 1 ? "" : "s"}…`);
    setError(null);
    try {
      const nuevas: { imagen_url: string; url_imagen_externa: string; enlace_url: string; texto: string; nueva_pestana: boolean; tipo_media: "imagen" | "video" }[] = [];
      for (const [indice, file] of files.entries()) {
        setProgresoCarrusel(`Subiendo ${indice + 1} de ${files.length}: ${file.name} · 0%`);
        const esVideo = file.type.startsWith("video/");
        if (!file.type.startsWith("image/") && !esVideo) throw new Error("Selecciona imágenes o videos compatibles.");
        const limiteBytes = (esVideo ? 50 : 15) * 1024 * 1024;
        if (file.size > limiteBytes) throw new Error(esVideo ? "Cada video debe pesar como máximo 50 MB." : "Cada imagen debe pesar como máximo 15 MB.");
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) throw new Error("Tu sesión ha caducado. Inicia sesión de nuevo para subir archivos.");
        const supabaseUrl = (import.meta.env as { VITE_SUPABASE_URL?: string }).VITE_SUPABASE_URL;
        const publishableKey = (import.meta.env as { VITE_SUPABASE_PUBLISHABLE_KEY?: string }).VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !publishableKey) throw new Error("Falta la configuración de Supabase para subir el archivo.");
        const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || (esVideo ? "mp4" : "jpg");
        const destino = participanteId + "/carrusel-enlaces/" + crypto.randomUUID() + "." + extension;
        const endpoint = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/catalogo-joyas/${destino.split("/").map(encodeURIComponent).join("/")}`;
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", endpoint);
          xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
          xhr.setRequestHeader("apikey", publishableKey);
          xhr.setRequestHeader("Content-Type", file.type || (esVideo ? "video/mp4" : "application/octet-stream"));
          xhr.setRequestHeader("x-upsert", "false");
          xhr.upload.onprogress = (progressEvent) => {
            if (!progressEvent.lengthComputable) return;
            const loaded = Math.min(progressEvent.loaded, file.size);
            const percentFile = file.size ? Math.round((loaded / file.size) * 100) : 100;
            const percentTotal = totalBytes ? Math.min(99, Math.round(((bytesCompletados + loaded) / totalBytes) * 100)) : 0;
            setProgresoCarruselPorcentaje(percentTotal);
            setProgresoCarrusel(`Subiendo ${indice + 1} de ${files.length}: ${file.name} · ${percentFile}% (${etiquetaTamano(loaded)} de ${etiquetaTamano(file.size)})`);
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else {
              let message = `Supabase Storage respondió con el estado ${xhr.status}.`;
              try { const body = JSON.parse(xhr.responseText); if (typeof body?.message === "string") message = body.message; else if (typeof body?.error === "string") message = body.error; } catch { /* Mantener el mensaje HTTP si la respuesta no es JSON. */ }
              reject(new Error(message));
            }
          };
          xhr.onerror = () => reject(new Error("No se pudo conectar con Supabase Storage durante la subida."));
          xhr.onabort = () => reject(new Error("La subida se interrumpió antes de terminar."));
          xhr.send(file);
        });
        bytesCompletados += file.size;
        setProgresoCarruselPorcentaje(totalBytes ? Math.round((bytesCompletados / totalBytes) * 100) : 100);
        const { data } = supabase.storage.from("catalogo-joyas").getPublicUrl(destino);
        if (!data?.publicUrl) throw new Error("No se pudo obtener la URL pública del archivo.");
        nuevas.push({ imagen_url: data.publicUrl, url_imagen_externa: "", enlace_url: "", texto: "", nueva_pestana: true, tipo_media: esVideo ? "video" : "imagen" });
      }
      setEnlacesCarrusel(actual => [...actual, ...nuevas].slice(0, 10));
      setProgresoCarruselPorcentaje(100);
      setProgresoCarrusel(`${nuevas.length} archivo${nuevas.length === 1 ? "" : "s"} cargado${nuevas.length === 1 ? "" : "s"} correctamente.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron subir los archivos del carrusel.");
      setProgresoCarrusel("");
      setProgresoCarruselPorcentaje(0);
    } finally { setSubiendoCarrusel(false); }
  }
  async function subirLogoShowroom(event: any) {
    const file = (event.target.files?.[0] ?? null) as File | null;
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecciona un archivo de imagen para el logo.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("El logo debe pesar como máximo 8 MB.");
      return;
    }
    setSubiendoLogo(true);
    setError(null);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      const destino = participanteId + "/showroom-logo/" + crypto.randomUUID() + "." + extension;
      const { error: uploadError } = await supabase.storage.from("catalogo-joyas").upload(destino, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("catalogo-joyas").getPublicUrl(destino);
      if (!data?.publicUrl) throw new Error("No se pudo obtener la URL pública del logo.");
      setLogoUrl(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el logo personalizado.");
    } finally {
      setSubiendoLogo(false);
    }
  }

  async function eliminarLogoShowroom() {
    if (!logoUrl) return;
    setGuardando(true);
    setError(null);
    try {
      const { error: catalogoError } = await supabase
        .from("catalogo_configuracion")
        .update({ logo_url: null })
        .eq("participante_id", participanteId);
      if (catalogoError) throw catalogoError;
      setLogoUrl(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el logo.");
    } finally {
      setGuardando(false);
    }
  }

  async function guardar(event: any) {
    event.preventDefault();
    if (!participanteId || !nombre.trim()) return setError("El nombre público es obligatorio.");
    setGuardando(true); setError(null);
    try {
      const slugNormalizado = normalizarSlugCatalogo(slug || nombre);
      if (!slugNormalizado) throw new Error("El slug público no puede quedar vacío.");
      const { error } = await supabase.from("catalogo_configuracion").upsert({
        participante_id: participanteId,
        nombre_publico: nombre.trim(),
        slug: slugNormalizado,
        descripcion: descripcion.trim() || null,
        frase_portada: frasePortada.trim() || null,
        texto_superior_portada: textoSuperiorPortada.trim() || null,
        whatsapp: whatsapp.trim() || null,
        telefono_contacto: telefonoContacto.trim() || null,
        email_contacto: emailContacto.trim() || null,
        direccion_contacto: direccionContacto.trim() || null,
        redes_sociales: Object.fromEntries(Object.entries(redesSociales).map(([key, value]) => [key, value.trim() || null])),
        logo_url: logoUrl,
        imagenes_portada: imagenesPortada,
        intervalo_portada_segundos: intervaloPortada,
        enlaces_carrusel: enlacesCarrusel.map(slide => ({ ...slide, enlace_url: slide.enlace_url.trim(), url_imagen_externa: slide.url_imagen_externa.trim(), texto: slide.texto.trim() })),
        visible
      }, { onConflict: "participante_id" });
      if (error) throw error;
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la configuración.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[#17130f]/45 px-3 py-3 backdrop-blur-md sm:px-4 sm:py-5">
      <div className="mx-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-[#c8a96b]/35 bg-[#fffdfa] shadow-[0_30px_100px_-28px_rgba(28,20,10,.55)] ring-1 ring-white/70 sm:max-h-[calc(100dvh-2.5rem)]">
        <div className="relative flex shrink-0 items-center justify-between overflow-hidden border-b border-[#d9c59f]/35 bg-gradient-to-r from-[#fffaf0] via-white to-[#f5ead7] px-5 py-5 sm:px-7 sm:py-6">
          <div className="pointer-events-none absolute -right-8 -top-14 size-36 rounded-full border border-[#b9975b]/15" /><div className="pointer-events-none absolute -right-1 -top-8 size-24 rounded-full border border-[#b9975b]/20" />
          <div className="relative"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.24em] text-[#9a773d]"><span className="h-px w-5 bg-[#b9975b]" /> Catálogo público · Personalización</p><h2 className="mt-1.5 text-xl font-semibold tracking-tight text-[#26211a] sm:text-2xl">Configurar catálogo</h2><p className="mt-1 text-xs text-[#7b7265]">Construye una experiencia de marca cuidada y lista para tus clientes.</p></div>
          <button type="button" onClick={onClose} aria-label="Cerrar configuración" className="relative rounded-full border border-[#d8c7a8]/60 bg-white/80 p-2 text-[#766b5b] transition hover:border-[#b9975b] hover:bg-white"><X className="size-5" /></button>
        </div>
        <form onSubmit={guardar} className="min-h-0 flex-1 overflow-y-auto overscroll-contain grid content-start gap-5 bg-[linear-gradient(180deg,#fffdfa_0%,#ffffff_100%)] p-4 sm:grid-cols-2 sm:gap-6 sm:p-7">
          <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Nombre público<input required value={nombre} onChange={e => { const nuevoNombre = e.target.value; setNombre(nuevoNombre); if (!slug.trim() || slug === normalizarSlugCatalogo(nombre)) setSlug(normalizarSlugCatalogo(nuevoNombre)); }} className="h-11 rounded-xl border border-[#e5dfd4] bg-white px-3.5 text-sm font-normal text-[#29251f] shadow-[0_1px_2px_rgba(32,24,12,.025)] outline-none transition focus:border-[#b9975b] focus:ring-4 focus:ring-[#b9975b]/10" /></label>
          <label className="grid gap-1.5 text-xs font-semibold">Slug público<input value={slug} onChange={e => setSlug(normalizarSlugCatalogo(e.target.value))} placeholder="siberiana" className="h-11 rounded-xl border border-[#e5dfd4] bg-white px-3.5 text-sm font-normal text-[#29251f] shadow-[0_1px_2px_rgba(32,24,12,.025)] outline-none transition focus:border-[#b9975b] focus:ring-4 focus:ring-[#b9975b]/10" /><span className="text-[11px] font-normal text-muted-foreground">Puedes personalizar la dirección pública. Usa letras, números y guiones.</span><span className="text-[11px] font-medium text-gold">URL: /{normalizarSlugCatalogo(slug) || "tu-taller"}</span></label>
          <label className="grid gap-1.5 text-xs font-semibold">WhatsApp<input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="51987654321" className="h-11 rounded-xl border border-[#e5dfd4] bg-white px-3.5 text-sm font-normal text-[#29251f] shadow-[0_1px_2px_rgba(32,24,12,.025)] outline-none transition focus:border-[#b9975b] focus:ring-4 focus:ring-[#b9975b]/10" /></label>
          <details className="group rounded-2xl border border-[#e8e0d2] bg-white shadow-[0_2px_10px_rgba(38,29,14,.025)] transition-colors hover:border-[#d7c39c] sm:col-span-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
              <span><span className="block text-sm font-semibold">Datos de contacto</span><span className="mt-1 block text-xs font-normal text-muted-foreground">Teléfono, correo y dirección que aparecerán en el catálogo público.</span></span>
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[#e7dcc8] bg-[#fffdf8] text-[#8b7755] transition-all group-open:rotate-180 group-open:border-[#c5a66c] group-open:bg-[#f8f0e1]" aria-hidden="true">⌄</span>
            </summary>
            <div className="grid gap-4 border-t border-[#eee7dc] bg-[#fdfbf7] p-4 sm:p-5">
              <label className="grid gap-1.5 text-xs font-semibold">Teléfono de contacto<input type="tel" value={telefonoContacto} onChange={e => setTelefonoContacto(e.target.value)} placeholder="+51 999 999 999" className="h-10 rounded-xl border border-[#e5dfd4] bg-white px-3.5 text-sm font-normal text-[#29251f] outline-none transition focus:border-[#b9975b] focus:ring-4 focus:ring-[#b9975b]/10" /></label>
              <label className="grid gap-1.5 text-xs font-semibold">Correo electrónico<input type="email" value={emailContacto} onChange={e => setEmailContacto(e.target.value)} placeholder="ventas@tujoyeria.com" className="h-10 rounded-xl border border-[#e5dfd4] bg-white px-3.5 text-sm font-normal text-[#29251f] outline-none transition focus:border-[#b9975b] focus:ring-4 focus:ring-[#b9975b]/10" /></label>
              <label className="grid gap-1.5 text-xs font-semibold">Dirección física<textarea rows={2} value={direccionContacto} onChange={e => setDireccionContacto(e.target.value)} placeholder="Dirección, distrito, ciudad" className="rounded-xl border border-[#e5dfd4] bg-white px-3.5 py-3 text-sm font-normal text-[#29251f] outline-none transition focus:border-[#b9975b] focus:ring-4 focus:ring-[#b9975b]/10" /></label>
            </div>
          </details>
          <details className="group rounded-2xl border border-[#e8e0d2] bg-white shadow-[0_2px_10px_rgba(38,29,14,.025)] transition-colors hover:border-[#d7c39c] sm:col-span-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
              <span><span className="block text-sm font-semibold">Carrusel de imágenes y videos con enlaces</span><span className="mt-1 block text-xs font-normal text-muted-foreground">Aparece debajo de Explora los modelos. Cada imagen o video puede dirigir a una colección, joya, WhatsApp, Maps o web externa.</span></span>
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[#e7dcc8] bg-[#fffdf8] text-[#8b7755] transition-all group-open:rotate-180 group-open:border-[#c5a66c] group-open:bg-[#f8f0e1]" aria-hidden="true">⌄</span>
            </summary>
            <div className="grid gap-4 border-t border-[#eee7dc] bg-[#fdfbf7] p-4 sm:p-5">
              <label className={`inline-flex w-fit items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${subiendoCarrusel ? "cursor-wait border-[#c5a66c] bg-[#fbf3e3] text-[#86652e]" : "cursor-pointer border-border hover:border-[#c5a66c] hover:bg-[#fbf7ef]"}`}>
                {subiendoCarrusel ? <span className="size-4 animate-spin rounded-full border-2 border-[#c5a66c]/30 border-t-[#9a773d]" aria-hidden="true" /> : <ImageIcon className="size-4" />} {subiendoCarrusel ? "Subiendo archivos…" : "Añadir imágenes o videos"}
                <input type="file" accept="image/*,video/mp4,video/webm,video/ogg,video/quicktime" multiple disabled={subiendoCarrusel || enlacesCarrusel.length >= 10} onChange={subirImagenesCarrusel} className="sr-only" />
              </label>
              {progresoCarrusel ? <div role="status" aria-live="polite" className={`space-y-2 rounded-xl border px-3 py-3 text-xs ${subiendoCarrusel ? "border-[#e8d8b8] bg-[#fff9ed] text-[#72572d]" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                <div className="flex items-start gap-3">
                  {subiendoCarrusel ? <span className="mt-0.5 size-2 shrink-0 animate-pulse rounded-full bg-[#b9975b]" /> : <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 font-bold">✓</span>}
                  <span className="min-w-0 flex-1 break-words">{progresoCarrusel}</span>
                  {subiendoCarrusel ? <span className="shrink-0 font-semibold tabular-nums">{progresoCarruselPorcentaje}%</span> : null}
                </div>
                {subiendoCarrusel ? <div
                  className="h-2.5 w-full overflow-hidden rounded-full bg-[#eadfca]"
                  role="progressbar"
                  aria-label="Progreso de subida de imágenes y videos"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progresoCarruselPorcentaje}
                ><div className="h-full rounded-full bg-[#b9975b] transition-[width] duration-150 ease-out" style={{ width: `${progresoCarruselPorcentaje}%` }} /></div> : null}
              </div> : null}
              <p className="text-xs text-muted-foreground">Hasta 10 elementos en total. Imágenes: máximo 15 MB; videos: máximo 50 MB. Los videos se reproducen sin sonido; si un elemento no tiene enlace, no será clicable.</p>
              <div className="grid gap-2 rounded-xl bg-background p-3">
                <p className="text-xs font-semibold">O pega una URL directa de imagen o video</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input type="url" value={urlNuevaImagenCarrusel} onChange={e => setUrlNuevaImagenCarrusel(e.target.value)} placeholder="https://sitio.com/foto.jpg o video.mp4" className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-sm font-normal" />
                  <button type="button" onClick={agregarImagenPorUrl} disabled={enlacesCarrusel.length >= 10} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">Añadir por enlace</button>
                </div>
                <p className="text-[10px] text-muted-foreground">Usa una URL directa al archivo de imagen o video. Los enlaces a publicaciones de redes sociales no siempre sirven como archivo multimedia directo.</p>
              </div>
              {enlacesCarrusel.map((slide, index) => <div key={slide.imagen_url} className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[112px_1fr]">
                <div className="relative">{(slide.tipo_media === "video" || /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(slide.imagen_url)) ? <video src={slide.imagen_url} muted playsInline controls className="aspect-[4/3] w-full rounded-lg bg-black object-contain" /> : <img src={slide.url_imagen_externa.trim() || slide.imagen_url} alt={slide.texto || "Imagen del carrusel"} className="aspect-[4/3] w-full rounded-lg object-cover" onError={event => { event.currentTarget.style.opacity = "0.35"; }} /> }<button type="button" onClick={() => setEnlacesCarrusel(actual => actual.filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded-full bg-background/90 p-1.5" aria-label={"Quitar elemento " + (index + 1)}><X className="size-3.5" /></button></div>
                <div className="grid gap-2">
                  <label className="grid gap-1 text-xs font-semibold">Texto opcional<input value={slide.texto} onChange={e => setEnlacesCarrusel(actual => actual.map((item, i) => i === index ? { ...item, texto: e.target.value } : item))} placeholder="Descubre nuestra colección" className="h-9 rounded-lg border border-border bg-background px-3 text-sm font-normal" /></label>
                  <label className="grid gap-1 text-xs font-semibold">URL directa de la imagen (opcional)<input type="url" value={slide.url_imagen_externa} onChange={e => setEnlacesCarrusel(actual => actual.map((item, i) => i === index ? { ...item, url_imagen_externa: e.target.value } : item))} placeholder="https://sitio.com/imagen.jpg" className="h-9 rounded-lg border border-border bg-background px-3 text-sm font-normal" /><span className="text-[10px] font-normal text-muted-foreground">Usa un enlace directo al archivo de imagen, no a la página de Instagram.</span></label>
                  <label className="grid gap-1 text-xs font-semibold">Enlace de destino<input type="url" value={slide.enlace_url} onChange={e => setEnlacesCarrusel(actual => actual.map((item, i) => i === index ? { ...item, enlace_url: e.target.value } : item))} placeholder="https://…" className="h-9 rounded-lg border border-border bg-background px-3 text-sm font-normal" /></label>
                  <label className="flex items-center gap-2 text-xs font-normal"><input type="checkbox" checked={slide.nueva_pestana} onChange={e => setEnlacesCarrusel(actual => actual.map((item, i) => i === index ? { ...item, nueva_pestana: e.target.checked } : item))} /> Abrir enlace en una pestaña nueva</label>
                </div>
              </div>)}
              {!enlacesCarrusel.length ? <p className="text-xs text-muted-foreground">Todavía no hay imágenes. Añade fotografías para crear el carrusel.</p> : null}
            </div>
          </details>
          <details className="group rounded-2xl border border-[#e8e0d2] bg-white shadow-[0_2px_10px_rgba(38,29,14,.025)] transition-colors hover:border-[#d7c39c] sm:col-span-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
              <span><span className="block text-sm font-semibold">Redes sociales</span><span className="mt-1 block text-xs font-normal text-muted-foreground">Configura los perfiles que aparecerán en tu catálogo público.</span></span>
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[#e7dcc8] bg-[#fffdf8] text-[#8b7755] transition-all group-open:rotate-180 group-open:border-[#c5a66c] group-open:bg-[#f8f0e1]" aria-hidden="true">⌄</span>
            </summary>
            <div className="grid gap-4 border-t border-[#eee7dc] bg-[#fdfbf7] p-4 sm:p-5">
              <p className="text-xs text-muted-foreground">Pega el enlace completo de cada perfil. Los campos vacíos no aparecerán en tu catálogo.</p>
              {([["instagram", "Instagram", "https://instagram.com/tuusuario"], ["tiktok", "TikTok", "https://tiktok.com/@tuusuario"], ["youtube", "YouTube", "https://youtube.com/@tuusuario"], ["facebook", "Facebook", "https://facebook.com/tuusuario"], ["pinterest", "Pinterest", "https://pinterest.com/tuusuario"]] as const).map(([key, label, placeholder]) => <label key={key} className="grid gap-1.5 text-xs font-semibold">{label}<input type="url" value={redesSociales[key]} onChange={e => setRedesSociales(actual => ({ ...actual, [key]: e.target.value }))} placeholder={placeholder} className="h-10 rounded-xl border border-[#e5dfd4] bg-white px-3.5 text-sm font-normal text-[#29251f] outline-none transition focus:border-[#b9975b] focus:ring-4 focus:ring-[#b9975b]/10" /></label>)}
            </div>
          </details>
          <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Descripción pública<textarea rows={3} value={descripcion} onChange={e => setDescripcion(e.target.value)} className="rounded-xl border border-[#e5dfd4] bg-white px-3.5 py-3 text-sm font-normal text-[#29251f] outline-none transition focus:border-[#b9975b] focus:ring-4 focus:ring-[#b9975b]/10" /></label>
          <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Texto superior de portada
            <input maxLength={100} value={textoSuperiorPortada} onChange={e => setTextoSuperiorPortada(e.target.value)} placeholder="SHOWROOM · SIBERIANA JOYERÍA" className="h-11 rounded-xl border border-[#e5dfd4] bg-white px-3.5 text-sm font-normal text-[#29251f] shadow-[0_1px_2px_rgba(32,24,12,.025)] outline-none transition focus:border-[#b9975b] focus:ring-4 focus:ring-[#b9975b]/10" />
            <span className="text-[11px] font-normal text-muted-foreground">Texto pequeño sobre el título principal. Déjalo vacío para ocultarlo y evitar repetir el nombre de la joyería.</span>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Frase principal de portada
            <input maxLength={120} value={frasePortada} onChange={e => setFrasePortada(e.target.value)} placeholder="Joyas hechas para quedarse." className="h-11 rounded-xl border border-[#e5dfd4] bg-white px-3.5 text-sm font-normal text-[#29251f] shadow-[0_1px_2px_rgba(32,24,12,.025)] outline-none transition focus:border-[#b9975b] focus:ring-4 focus:ring-[#b9975b]/10" />
            <span className="text-[11px] font-normal text-muted-foreground">Se muestra en la portada pública. Si lo dejas vacío, se usa la frase predeterminada.</span>
          </label>
          <section className="grid gap-4 rounded-2xl border border-[#e6dac5] bg-gradient-to-br from-[#fffdf8] to-[#faf5eb] p-4 sm:col-span-2 sm:p-5">
            <div><p className="text-sm font-semibold">Imágenes de portada</p><p className="mt-1 text-xs font-normal text-muted-foreground">Sube hasta 10 fotografías. Se alternarán automáticamente en la portada pública.</p></div>
            <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-semibold">
              <ImageIcon className="size-4" /> {subiendoImagenes ? "Subiendo imágenes…" : "Añadir imágenes"}
              <input type="file" accept="image/*" multiple disabled={subiendoImagenes || imagenesPortada.length >= 10} onChange={subirImagenesPortada} className="sr-only" />
            </label>
            {imagenesPortada.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {imagenesPortada.map((url: string, index: number) => <div key={url} className="relative overflow-hidden rounded-xl border border-border">
                <img src={url} alt={"Imagen de portada " + (index + 1)} className="aspect-square w-full object-cover" />
                <button type="button" onClick={() => setImagenesPortada(actual => actual.filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded-full bg-background/90 p-1.5" aria-label={"Quitar imagen " + (index + 1)}><X className="size-3.5" /></button>
                <span className="block px-2 py-1 text-[10px] text-muted-foreground">Imagen {index + 1}</span>
              </div>)}
            </div> : <p className="text-xs font-normal text-muted-foreground">Todavía no has añadido imágenes; se mostrará la joya destacada como hasta ahora.</p>}
            <label className="grid max-w-xs gap-1.5 text-xs font-semibold">Tiempo visible por imagen
              <select value={intervaloPortada} onChange={e => setIntervaloPortada(Number(e.target.value))} className="h-10 rounded-xl border border-[#e5dfd4] bg-white px-3.5 text-sm font-normal text-[#29251f] outline-none transition focus:border-[#b9975b] focus:ring-4 focus:ring-[#b9975b]/10">
                {[2,3,4,5,6,8,10,12,15,20,30].map(seconds => <option key={seconds} value={seconds}>{seconds} segundos</option>)}
              </select>
            </label>
          </section>
          <div className="grid gap-2 text-xs font-semibold sm:col-span-2">
            <span>Logo personalizado del showroom</span>
            <div className="grid gap-3 rounded-xl border border-border bg-background p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="flex min-h-16 items-center gap-4">
                {logoUrl ? <img src={logoUrl} alt="Logo que se mostrará en el showroom" className="max-h-16 max-w-[240px] object-contain object-left" /> : <span className="text-xs font-normal text-muted-foreground">Puedes subir un logo exclusivo para el catálogo, sin cambiar el logo del taller.</span>}
                {logoUrl ? <span className="text-[11px] font-normal text-muted-foreground">Logo del catálogo público.</span> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border px-4 py-2.5 text-xs font-semibold hover:border-gold/50">
                  {subiendoLogo ? "Subiendo…" : logoUrl ? "Cambiar logo" : "Subir logo personalizado"}
                  <input type="file" accept="image/*" disabled={subiendoLogo || guardando} onChange={subirLogoShowroom} className="sr-only" />
                </label>
                {logoUrl ? <button type="button" onClick={eliminarLogoShowroom} disabled={guardando || subiendoLogo} className="rounded-xl border border-destructive/30 px-3 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-50">{guardando ? "Eliminando…" : "Eliminar logo"}</button> : null}
              </div>
            </div>
            <span className="text-[11px] font-normal text-muted-foreground">Guarda la configuración para publicar el logo. Se mantiene independiente de Identidad comercial.</span>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-border p-4 sm:col-span-2"><input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} /><span><b className="block text-xs">Publicar catálogo</b><span className="text-[11px] text-muted-foreground">Hace visible el enlace público.</span></span></label>
          {error ? <p className="sm:col-span-2 text-xs text-destructive">{error}</p> : null}
          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-[#e9e0d2] bg-[#fffdfa]/95 py-4 backdrop-blur sm:col-span-2"><button type="button" onClick={onClose} className="rounded-xl border border-[#ded5c6] bg-white px-4 py-2.5 text-xs font-semibold text-[#655c4e] transition hover:bg-[#f8f4ed]">Cancelar</button><button type="submit" disabled={guardando} className="rounded-xl bg-gradient-to-r from-[#9a773d] via-[#b9975b] to-[#9a773d] px-5 py-2.5 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(154,119,61,.24)] transition hover:brightness-105 disabled:opacity-60">{guardando ? "Guardando…" : "Guardar configuración"}</button></div>
        </form>
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon }: { label: string; value: string; icon: typeof BookOpen }) {
  return <div className="rounded-2xl border border-border bg-card p-4 shadow-card"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span><Icon className="size-4 text-gold" /></div><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}
function Arch({ label, text }: { label: string; text: string }) {
  return <div className="rounded-xl border border-border bg-surface-muted/40 p-4"><p className="text-xs font-semibold text-gold">{label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></div>;
}
