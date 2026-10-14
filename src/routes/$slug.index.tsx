import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Box, ChevronLeft, ChevronRight, Gem, HeartHandshake, MessageCircle, Search, Share2, ShoppingBag, Sparkles, Minus, Plus, Trash2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabasePublic as supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/$slug/")({
  head: ({ params }) => ({
    meta: [
      { title: `Catálogo de joyería | ${params.slug} · Taller del Joyero` },
      { name: "description", content: `Explora las joyas y colecciones publicadas por ${params.slug} en su catálogo digital de Taller del Joyero.` },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Taller del Joyero" },
      { property: "og:title", content: `Catálogo de joyería | ${params.slug}` },
      { property: "og:description", content: `Descubre joyas y colecciones del catálogo digital ${params.slug}.` },
    ],
    links: [{ rel: "canonical", href: `https://www.tallerdeljoyero.com/${encodeURIComponent(params.slug)}` }],
  }),
  component: CatalogoPublicoPage,
});

type CatalogoRow = {
  slug: string;
  nombre_publico: string;
  descripcion_publica: string | null;
  logo_url: string | null;
  whatsapp: string | null;
  frase_portada: string | null;
  imagenes_portada: unknown;
  intervalo_portada_segundos: number | null;
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
  coleccion_slug: string | null;
  coleccion_nombre: string | null;
};

type Producto = {
  id: string;
  slug: string;
  codigo: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  imagen: string | null;
  videoUrl: string | null;
  aurumRenderUrl: string | null;
  galeria: unknown;
  precioDesde: number | null;
  moneda: string;
  destacado: boolean;
  metalPrincipal: string | null;
  pesoGramos: number | null;
  piedras: string | null;
  medidas: string | null;
  talla: string | null;
  tecnica: string | null;
  acabado: string | null;
  disponibilidad: string | null;
  tiempoFabricacionDias: number | null;
  fichaTecnicaUrl: string | null;
  mostrarPrecio: boolean;
  mostrarFichaTecnica: boolean;
};

type LineaCarrito = {
  id: string;
  cantidad: number;
  slug?: string;
  codigo?: string;
  nombre?: string;
  precio?: number | null;
  moneda?: string;
  imagen?: string | null;
  talla?: string | null;
  tipoEnvio?: string;
  plazoEntrega?: string;
  fechaEntregaDesde?: string;
  fechaEntregaHasta?: string;
};

const RESERVED_SLUGS = new Set([
  "auth", "c", "api", "catalogo", "catalogo-publico", "inicio", "pedidos", "pedidos-2",
  "cotizaciones", "gestion", "operario", "taller", "herramientas", "perfil",
  "joya", "aurum-render", "aurum-render-public", "transfer", "lovable",
]);

function CatalogoPublicoPage() {
  const { slug } = Route.useParams();
  const slugNormalizado = slug.trim().toLowerCase();
  const slugReservado = RESERVED_SLUGS.has(slugNormalizado);
  const [categoria, setCategoria] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [carritoCargadoPara, setCarritoCargadoPara] = useState("");
  const [indicePortada, setIndicePortada] = useState(0);
  const [portadaVisible, setPortadaVisible] = useState(true);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("carrito-joyas-" + slugNormalizado);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCarrito(parsed.filter((x) => x && typeof x.id === "string" && Number.isInteger(x.cantidad) && x.cantidad > 0));
        } else {
          setCarrito([]);
        }
      } else {
        setCarrito([]);
      }
    } catch {
      setCarrito([]);
      try { window.localStorage.removeItem("carrito-joyas-" + slugNormalizado); } catch { /* Almacenamiento no disponible. */ }
    } finally {
      setCarritoCargadoPara(slugNormalizado);
    }
  }, [slugNormalizado]);
  useEffect(() => {
    if (carritoCargadoPara !== slugNormalizado) return;
    try { window.localStorage.setItem("carrito-joyas-" + slugNormalizado, JSON.stringify(carrito)); } catch { /* Carrito temporal durante esta visita. */ }
  }, [carrito, carritoCargadoPara, slugNormalizado]);
  const agregarAlCarrito = (p: Producto) => { setCarrito((actual) => { const found = actual.find((x) => x.id === p.id && !x.talla); return found ? actual.map((x) => x.id === p.id && !x.talla ? { ...x, cantidad: x.cantidad + 1 } : x) : [...actual, { id: p.id, slug: p.slug, codigo: p.codigo, nombre: p.nombre, precio: p.mostrarPrecio ? p.precioDesde : null, moneda: p.moneda, imagen: p.imagen, cantidad: 1 }]; }); setCarritoAbierto(true); };
  const cantidadCarrito = carrito.reduce((n, x) => n + x.cantidad, 0);
  const totalCarrito = carrito.reduce((n, x) => n + (x.precio ?? 0) * x.cantidad, 0);
  const carritoConPrecio = carrito.length > 0 && carrito.every((x) => x.precio != null);

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["portal-publico", slugNormalizado],
    enabled: !slugReservado,
    queryFn: async () => {
      const [catalogoResult, portadaResult] = await Promise.all([
        supabase.rpc("obtener_catalogo_publico", { _slug: slugNormalizado }),
        supabase.rpc("obtener_configuracion_portada_publica", { _slug: slugNormalizado }),
      ]);
      if (catalogoResult.error) throw catalogoResult.error;
      const productosCatalogo = (catalogoResult.data ?? []) as CatalogoRow[];
      // Si la migración de portada aún no se ha aplicado, el catálogo existente sigue funcionando.
      const portada = portadaResult.error ? undefined : ((portadaResult.data ?? [])[0] as {
        frase_portada: string | null;
        imagenes_portada: unknown;
        intervalo_portada_segundos: number | null;
      } | undefined);
      return productosCatalogo.map((row) => ({
        ...row,
        frase_portada: portada?.frase_portada ?? null,
        imagenes_portada: portada?.imagenes_portada ?? [],
        intervalo_portada_segundos: portada?.intervalo_portada_segundos ?? 5,
      })) as CatalogoRow[];
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const config = rows[0] ?? null;
  const mensajePedido = "Hola, quisiera solicitar este pedido a " + (config?.nombre_publico ?? "") + ":\n\n" + carrito.map((x) => x.cantidad + " x " + x.nombre + " (" + x.codigo + ")" + (x.talla ? " — Talla americana US " + x.talla : "") + (x.tipoEnvio ? " — " + (x.tipoEnvio === "rapido" ? "Envío rápido" : "Hecho a pedido") + " (" + x.plazoEntrega + ", llegada estimada " + x.fechaEntregaDesde + " a " + x.fechaEntregaHasta + ")" : "") + (x.precio != null ? " — " + formatPrice(x.precio * x.cantidad, x.moneda ?? "PEN") : " — precio por confirmar")).join("\n") + "\n\n" + (carritoConPrecio ? "Total referencial: " + formatPrice(totalCarrito, carrito[0]?.moneda ?? "PEN") : "Por favor, confirmen los precios finales.");
  const productos = useMemo<Producto[]>(() => rows
    .filter((row) => row.producto_id && row.codigo && row.nombre && row.categoria)
    .map((row) => ({
      id: row.producto_id!,
      slug: row.producto_slug ?? row.producto_id!,
      codigo: row.codigo!,
      nombre: row.nombre!,
      categoria: row.categoria!,
      descripcion: row.descripcion_producto ?? "",
      imagen: row.imagen_principal_url,
      videoUrl: row.video_url,
      aurumRenderUrl: row.aurum_render_url,
      galeria: Array.isArray(row.galeria) ? row.galeria.filter((item): item is string => typeof item === "string") : [],
      precioDesde: row.precio_desde,
      moneda: row.moneda ?? "PEN",
      destacado: Boolean(row.destacado),
      metalPrincipal: row.metal_principal,
      pesoGramos: row.peso_gramos,
      piedras: row.piedras,
      medidas: row.medidas,
      talla: row.talla,
      tecnica: row.tecnica,
      acabado: row.acabado,
      disponibilidad: row.disponibilidad,
      tiempoFabricacionDias: row.tiempo_fabricacion_dias,
      fichaTecnicaUrl: row.ficha_tecnica_url,
      mostrarPrecio: row.mostrar_precio,
      mostrarFichaTecnica: row.mostrar_ficha_tecnica,
    })), [rows]);

  useEffect(() => {
    if (isLoading || error || !config) return;
    const productosPublicados = new Map<string, Producto>();
    for (const producto of productos) productosPublicados.set(producto.id, producto);
    setCarrito((actual) => actual.flatMap((linea) => {
      const producto = productosPublicados.get(linea.id);
      if (!producto) return [];
      return [{
        ...linea,
        slug: producto.slug,
        codigo: producto.codigo,
        nombre: producto.nombre,
        precio: producto.mostrarPrecio ? producto.precioDesde : null,
        moneda: producto.moneda,
        imagen: producto.imagen,
      }];
    }));
  }, [isLoading, error, config, productos]);

  const categorias = useMemo(
    () => ["Todos", ...new Set(productos.map((producto) => producto.categoria))],
    [productos],
  );
  const colecciones = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rows) {
      if (row.coleccion_slug && row.coleccion_nombre) map.set(row.coleccion_slug, row.coleccion_nombre);
    }
    return Array.from(map.entries());
  }, [rows]);

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const unique = new Map<string, Producto>();
    for (const producto of productos) if (!unique.has(producto.id)) unique.set(producto.id, producto);
    return Array.from(unique.values()).filter((producto) =>
      (!q || [producto.nombre, producto.codigo, producto.categoria, producto.descripcion].join(" ").toLowerCase().includes(q))
      && (categoria === "Todos" || producto.categoria === categoria),
    );
  }, [busqueda, categoria, productos]);

  const destacado = productos.find((producto) => producto.destacado) ?? productos[0] ?? null;
  const imagenesPortada = useMemo(() => Array.isArray(config?.imagenes_portada)
    ? config.imagenes_portada.filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url)).slice(0, 10)
    : [], [config?.imagenes_portada]);
  useEffect(() => {
    setIndicePortada(0);
    if (imagenesPortada.length < 2) return;
    const intervalo = Math.min(30, Math.max(2, Number(config?.intervalo_portada_segundos ?? 5)));
    const timer = window.setInterval(() => {
      setPortadaVisible(false);
      window.setTimeout(() => {
        setIndicePortada(actual => (actual + 1) % imagenesPortada.length);
        setPortadaVisible(true);
      }, 280);
    }, intervalo * 1000);
    return () => window.clearInterval(timer);
  }, [imagenesPortada, config?.intervalo_portada_segundos]);

  const whatsappHref = config?.whatsapp
    ? `https://wa.me/${config.whatsapp.replace(/\D/g, "")}`
    : null;

  if (isLoading) {
    return <EstadoCatalogo titulo="Cargando catálogo…" texto="Estamos preparando la publicación de esta joyería." />;
  }

  if (slugReservado || error || !config) {
    return (
      <EstadoCatalogo
        titulo="Catálogo no disponible"
        texto="El enlace no corresponde a un catálogo público activo o la publicación todavía no está configurada."
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] text-[#1f1b18]">
      <header className="border-b border-[#1f1b1815] bg-[#f7f4ef]/95 px-4 py-3 backdrop-blur sm:px-8 sm:py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 sm:flex-nowrap sm:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {config.logo_url ? (
              <img src={config.logo_url} alt={config.nombre_publico} className="block h-auto max-h-12 w-auto max-w-[min(52vw,220px)] shrink object-contain object-left sm:max-w-[220px]" onError={(event) => { event.currentTarget.style.display = "none"; }} />
            ) : (
              <p className="truncate font-display text-2xl italic tracking-tight">{config.nombre_publico}</p>
            )}
            <div className="min-w-0">
              <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[.16em] text-[#8a6b36] sm:text-[9px] sm:tracking-[.25em]">Showroom digital</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void navigator.share?.({ title: config.nombre_publico, url: window.location.href })}
              className="hidden rounded-full border border-[#1f1b1820] px-3 py-2 text-xs font-semibold sm:inline-flex"
            >
              <Share2 className="mr-1.5 size-3.5" /> Compartir
            </button>
            <button type="button" onClick={() => setCarritoAbierto(true)} className="relative inline-flex items-center gap-2 rounded-full border border-[#1f1b1820] px-3.5 py-2 text-xs font-semibold" aria-label={"Carrito de compras, " + cantidadCarrito + " artículos"}><ShoppingBag className="size-4" /> Carrito {cantidadCarrito > 0 ? <span className="rounded-full bg-[#8a6b36] px-1.5 py-0.5 text-[10px] text-white">{cantidadCarrito}</span> : null}</button>
            {whatsappHref ? <a href={whatsappHref} target="_blank" rel="noreferrer" className="rounded-full bg-[#1f1b18] px-3.5 py-2 text-xs font-semibold text-white">WhatsApp</a> : null}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[#1f1b1815]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(180,145,75,.16),transparent_38%)]" />
        <div className="mx-auto grid max-w-7xl gap-7 px-5 py-10 sm:px-8 sm:py-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-8 lg:py-24">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[.22em] text-[#8a6b36] sm:text-[10px] sm:tracking-[.3em]">Showroom · {config.nombre_publico}</p>
            <h1 className="mt-3 max-w-xl break-words font-display text-4xl leading-[1.08] tracking-tight sm:mt-4 sm:text-5xl">{config.frase_portada?.trim() || "Joyas hechas para quedarse."}</h1>
            {config.descripcion_publica?.trim() ? (
              <p className="mt-5 max-w-xl font-sans text-sm leading-7 text-[#625b54] sm:text-base">{config.descripcion_publica}</p>
            ) : (
              <p className="mt-5 max-w-xl font-sans text-sm leading-7 text-[#625b54] sm:text-base">
                Explora los modelos publicados por {config.nombre_publico} y solicita una propuesta personalizada directamente con el taller.
              </p>
            )}
            <div className="mt-7 flex flex-wrap gap-2">
              <a href="#coleccion" className="rounded-full bg-[#1f1b18] px-5 py-3 text-xs font-semibold text-white">
                Explorar colección <ArrowRight className="ml-1 inline size-3.5" />
              </a>
            </div>
          </div>

          <div className="group relative aspect-[4/3] w-full min-w-0 overflow-hidden rounded-[26px] border border-white/70 bg-[radial-gradient(ellipse_at_50%_42%,#ffffff_0%,#fffdfa_54%,#eee7dc_100%)] shadow-[0_24px_70px_-30px_rgba(39,30,19,0.35)] sm:rounded-[32px]">
            {imagenesPortada.length ? (
              <img key={imagenesPortada[indicePortada]} src={imagenesPortada[indicePortada]} alt={"Imagen de portada " + (indicePortada + 1)} className={"size-full object-cover will-change-transform transition-[opacity,transform] duration-700 ease-in-out " + (portadaVisible ? "scale-[1.015] opacity-100" : "scale-100 opacity-0")} onError={(event) => { event.currentTarget.style.display = "none"; }} />
            ) : destacado?.imagen ? (
              <img src={destacado.imagen} alt={destacado.nombre} className="size-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.02]" onError={(event) => { event.currentTarget.style.display = "none"; }} />
            ) : (
              <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_50%_35%,rgba(180,145,75,.28),transparent_55%)]">
                <Sparkles className="size-12 text-[#8a6b36]" />
              </div>
            )}
            {imagenesPortada.length > 1 ? (
              <>
                <button type="button" onClick={() => { setPortadaVisible(false); window.setTimeout(() => { setIndicePortada(actual => (actual - 1 + imagenesPortada.length) % imagenesPortada.length); setPortadaVisible(true); }, 180); }} aria-label="Fotografía anterior" className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-white/60 bg-white/65 text-[#30271e] opacity-100 shadow-sm backdrop-blur-md transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100">
                  <ChevronLeft className="size-4" />
                </button>
                <button type="button" onClick={() => { setPortadaVisible(false); window.setTimeout(() => { setIndicePortada(actual => (actual + 1) % imagenesPortada.length); setPortadaVisible(true); }, 180); }} aria-label="Fotografía siguiente" className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-white/60 bg-white/65 text-[#30271e] opacity-100 shadow-sm backdrop-blur-md transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100">
                  <ChevronRight className="size-4" />
                </button>

              </>
            ) : null}
          </div>
        </div>
      </section>

      <section id="coleccion" className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        {colecciones.length ? (
          <div className="mb-5 flex flex-wrap gap-2">
            {colecciones.map(([collectionSlug, collectionName]) => (
              <Link key={collectionSlug} to="/$slug/coleccion/$coleccion" params={{ slug: slugNormalizado, coleccion: collectionSlug }} className="rounded-full border border-[#1f1b1820] bg-white px-4 py-2 text-xs font-semibold hover:border-[#8a6b36]">
                {collectionName}
              </Link>
            ))}
          </div>
        ) : null}
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
              <article key={producto.id} className="group min-w-0">
                <Link
                  to="/$slug/$producto"
                  params={{ slug: slugNormalizado, producto: producto.slug }}
                  aria-label={`Ver joya: ${producto.nombre}`}
                  className="relative block aspect-[4/5] overflow-hidden rounded-[24px] bg-white ring-1 ring-[#1f1b18]/[0.06] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_-28px_rgba(31,27,24,.38)]"
                >
                  {producto.imagen ? (
                    <img src={producto.imagen} alt={producto.nombre} loading="lazy" className="size-full scale-[1.22] object-contain p-1 transition-transform duration-500 group-hover:scale-[1.28] sm:p-2" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                  ) : (
                    <div className="grid size-full place-items-center"><Box className="size-10 text-[#b19a70]" /></div>
                  )}
                  {producto.destacado ? <span className="absolute left-3 top-3 rounded-full border border-[#8a6b36]/20 bg-[#fbf8f2]/95 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[.16em] text-[#806331]">Selección</span> : null}
                  <span className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-full bg-[#1f1b18]/90 px-4 py-3 text-[11px] font-semibold text-white backdrop-blur transition-colors duration-300 hover:bg-[#8a6b36]">
                    <span>Descubrir la joya</span><ArrowRight className="size-3.5" />
                  </span>
                </Link>
                <div className="px-0.5 pt-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[.18em] text-[#8a6b36]">{producto.categoria}</p>
                  <Link to="/$slug/$producto" params={{ slug: slugNormalizado, producto: producto.slug }} className="mt-1.5 block text-[17px] font-medium leading-snug tracking-[-.02em] text-[#29231d] transition-colors hover:text-[#8a6b36]">{producto.nombre}</Link>
                  {producto.descripcion?.trim() ? <p className="mt-1.5 line-clamp-2 text-[12px] leading-5 text-[#746b62]">{producto.descripcion}</p> : null}
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#1f1b18]/[.09] pt-3">
                    {producto.mostrarPrecio ? <span className="text-sm font-semibold tracking-tight">{formatPrice(producto.precioDesde, producto.moneda)}</span> : <span className="text-xs text-[#746b62]">Precio a consultar</span>}
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => agregarAlCarrito(producto)}
                        aria-label={`Añadir ${producto.nombre} al carrito`}
                        title={producto.mostrarPrecio ? "Añadir al carrito" : "Consultar en carrito"}
                        className="inline-flex size-9 items-center justify-center rounded-full border border-[#1f1b1820] bg-white text-[#1f1b18] transition-colors hover:border-[#8a6b36] hover:text-[#8a6b36]"
                      >
                        <ShoppingBag className="size-4" />
                      </button>
                      <Link to="/$slug/$producto" params={{ slug: slugNormalizado, producto: producto.slug }} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#1f1b18] px-3.5 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-[#8a6b36]">
                        Ver joya <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-[#8b8178]">Ref. {producto.codigo}</p>
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

      <section className="border-y border-[#1f1b1815] bg-[#fbf9f5]">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-10 sm:grid-cols-3 sm:gap-8 sm:px-8 sm:py-14">
          <article className="group rounded-2xl border border-[#8a6b36]/10 bg-white/70 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#8a6b36]/25 hover:shadow-[0_16px_36px_-24px_rgba(60,43,19,.35)] sm:border-transparent sm:bg-transparent sm:p-4">
            <div className="mb-5 grid size-11 place-items-center rounded-full border border-[#b89a62]/35 bg-[#f3ecdf] text-[#987640]"><Gem className="size-5 stroke-[1.5]" /></div>
            <h2 className="font-display text-xl tracking-tight text-[#29231d]">Diseño con identidad</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#766d63]">Piezas que reflejan tu estilo, creadas para acompañar momentos únicos.</p>
          </article>
          <article className="group rounded-2xl border border-[#8a6b36]/10 bg-white/70 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#8a6b36]/25 hover:shadow-[0_16px_36px_-24px_rgba(60,43,19,.35)] sm:border-transparent sm:bg-transparent sm:p-4">
            <div className="mb-5 grid size-11 place-items-center rounded-full border border-[#b89a62]/35 bg-[#f3ecdf] text-[#987640]"><Sparkles className="size-5 stroke-[1.5]" /></div>
            <h2 className="font-display text-xl tracking-tight text-[#29231d]">La belleza está en los detalles</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#766d63]">Cada acabado, cada piedra y cada forma cuentan una historia.</p>
          </article>
          <article className="group rounded-2xl border border-[#8a6b36]/10 bg-white/70 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#8a6b36]/25 hover:shadow-[0_16px_36px_-24px_rgba(60,43,19,.35)] sm:border-transparent sm:bg-transparent sm:p-4">
            <div className="mb-5 grid size-11 place-items-center rounded-full border border-[#b89a62]/35 bg-[#f3ecdf] text-[#987640]"><HeartHandshake className="size-5 stroke-[1.5]" /></div>
            <h2 className="font-display text-xl tracking-tight text-[#29231d]">Una experiencia personal</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#766d63]">Conversa directamente con el taller y encuentra la joya ideal para ti.</p>
          </article>
        </div>
      </section>

      {carritoAbierto ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#1f1b18]/45 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Carrito de compras">
          <section className="flex h-full w-full max-w-md flex-col bg-[#f7f4ef] text-[#1f1b18] shadow-2xl">
            <header className="flex items-center justify-between border-b border-[#1f1b1815] px-5 py-5"><div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#8a6b36]">Tu selección</p><h2 className="mt-1 font-display text-2xl">Carrito de compras ({cantidadCarrito})</h2></div><button type="button" onClick={() => setCarritoAbierto(false)} aria-label="Cerrar carrito" className="rounded-full border border-[#1f1b1820] p-2"><X className="size-4" /></button></header>
            {carrito.length === 0 ? (
              <div className="grid flex-1 place-items-center p-8 text-center"><div><ShoppingBag className="mx-auto size-9 text-[#8a6b36]" /><p className="mt-3 font-semibold">Tu carrito está vacío</p><p className="mt-1 text-sm text-[#746b62]">Añade piezas desde el catálogo.</p><button type="button" onClick={() => setCarritoAbierto(false)} className="mt-5 rounded-full bg-[#1f1b18] px-5 py-3 text-xs font-semibold text-white">Seguir explorando</button></div></div>
            ) : (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto p-5">{carrito.map((x) => <article key={x.id + "-" + (x.talla ?? "sin-talla")} className="flex gap-3 rounded-2xl border border-[#1f1b1815] bg-white/70 p-3">{x.imagen ? <img src={x.imagen} alt={x.nombre} className="size-20 rounded-xl object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <div className="grid size-20 place-items-center rounded-xl bg-[#e9e3da]"><ShoppingBag className="size-5 text-[#8a6b36]" /></div>}<div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase tracking-wider text-[#8a6b36]">{x.codigo}</p><p className="mt-1 font-semibold">{x.nombre}</p>{x.talla ? <p className="mt-1 text-xs text-[#746b62]">Talla americana (US): {x.talla}</p> : null}{x.tipoEnvio ? <p className="mt-1 text-xs text-[#746b62]">{x.tipoEnvio === "rapido" ? "Envío rápido" : "Hecho a pedido"} · {x.plazoEntrega}</p> : null}{x.fechaEntregaDesde && x.fechaEntregaHasta ? <p className="mt-1 text-xs text-[#746b62]">Llegada estimada: {x.fechaEntregaDesde} – {x.fechaEntregaHasta}</p> : null}{(!x.talla || !x.tipoEnvio || !x.fechaEntregaDesde || !x.fechaEntregaHasta) ? <div className="mt-2 rounded-lg bg-[#f5ead4] p-2"><p className="text-[11px] font-medium text-[#755a2b]">Falta completar talla y entrega.</p><Link to="/$slug/$producto" params={{ slug: slugNormalizado, producto: x.slug || x.id }} className="mt-1 inline-block text-[11px] font-semibold text-[#755a2b] underline underline-offset-2">Completar opciones de esta joya</Link></div> : null}<p className="mt-1 text-xs text-[#746b62]">{x.precio != null ? formatPrice(x.precio * x.cantidad, x.moneda ?? "PEN") : "Precio por confirmar"}</p><div className="mt-2 flex items-center gap-2"><button type="button" onClick={() => setCarrito((a) => a.map((v) => v.id === x.id && (v.talla ?? "") === (x.talla ?? "") ? { ...v, cantidad: Math.max(1, v.cantidad - 1) } : v))} aria-label="Reducir cantidad" className="rounded-full border border-[#1f1b1820] p-1.5"><Minus className="size-3" /></button><span className="min-w-5 text-center text-xs">{x.cantidad}</span><button type="button" onClick={() => setCarrito((a) => a.map((v) => v.id === x.id && (v.talla ?? "") === (x.talla ?? "") ? { ...v, cantidad: v.cantidad + 1 } : v))} aria-label="Aumentar cantidad" className="rounded-full border border-[#1f1b1820] p-1.5"><Plus className="size-3" /></button><button type="button" onClick={() => setCarrito((a) => a.filter((v) => !(v.id === x.id && (v.talla ?? "") === (x.talla ?? ""))))} aria-label="Eliminar producto" className="ml-auto rounded-full p-1.5 text-[#8a5145]"><Trash2 className="size-3.5" /></button></div></div></article>)}</div>
                <div className="border-t border-[#1f1b1815] bg-white/60 p-5"><div className="flex items-center justify-between gap-3"><span className="text-sm text-[#746b62]">{carritoConPrecio ? "Total referencial" : "Total"}</span><strong className="text-lg">{carritoConPrecio ? formatPrice(totalCarrito, carrito[0]?.moneda ?? "PEN") : "A confirmar"}</strong></div><p className="mt-2 text-[11px] leading-5 text-[#746b62]">El pedido se enviará al taller por WhatsApp para confirmar disponibilidad, precio final y entrega. Este carrito no procesa pagos en línea.</p>{whatsappHref ? <a href={whatsappHref + "?text=" + encodeURIComponent(mensajePedido)} target="_blank" rel="noreferrer" className="mt-4 block rounded-full bg-[#1f1b18] px-5 py-3.5 text-center text-xs font-semibold text-white">Enviar pedido por WhatsApp</a> : <p className="mt-3 rounded-xl bg-[#e9e3da] p-3 text-xs">Este taller todavía no configuró WhatsApp para recibir pedidos.</p>}<button type="button" onClick={() => setCarrito([])} className="mt-3 w-full rounded-full border border-[#1f1b1820] px-4 py-2.5 text-xs font-semibold">Vaciar carrito</button></div>
              </>
            )}
          </section>
        </div>
      ) : null}

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
