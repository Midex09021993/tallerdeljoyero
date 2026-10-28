import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Box, CreditCard, FileImage, FileText, Gem, LoaderCircle, RefreshCw, ShieldCheck, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { supabase, supabasePublic } from "@/integrations/supabase/client";

type ArchivoDigital = {
  archivo_id: string;
  titulo: string;
  descripcion: string | null;
  categoria: string;
  formatos: string[];
  precio: number;
  moneda: "PEN" | "USD";
  imagen_portada_url: string | null;
  nombre_vendedor: string;
  creado_en: string;
};

const obtenerArchivosPublicos = async (): Promise<ArchivoDigital[]> => {
  const clientePublico = supabasePublic as unknown as {
    rpc: (nombre: string) => Promise<{
      data: unknown;
      error: { message: string } | null;
    }>;
  };
  const { data, error } = await clientePublico.rpc("obtener_marketplace_archivos_publico");
  if (error) {
    console.error("[Marketplace de archivos] No se pudo consultar el marketplace:", error.message);
    throw error;
  }
  return Array.isArray(data) ? data as ArchivoDigital[] : [];
};

export const Route = createFileRoute("/galeria-joyas")({
  head: () => ({
    meta: [
      { title: "Tienda 3D · Archivos digitales para joyería | AURUM LAB" },
      {
        name: "description",
        content: "Tienda de modelos 3D, archivos CAD, imágenes y planos técnicos para profesionales de la joyería.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Tienda 3D · Archivos digitales para joyería | AURUM LAB" },
      {
        property: "og:description",
        content: "Archivos digitales para profesionales de la joyería: modelos 3D, archivos CAD y planos técnicos.",
      },
    ],
  }),
  component: MarketplaceArchivosPage,
});

function formatoPrecio(precio: number, moneda: string) {
  try {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: moneda,
      maximumFractionDigits: 2,
    }).format(precio);
  } catch {
    return `${moneda} ${precio.toFixed(2)}`;
  }
}

function iconoCategoria(categoria: string) {
  if (/plano|técnic/i.test(categoria)) return FileText;
  if (/imagen/i.test(categoria)) return FileImage;
  return Box;
}

function MarketplaceArchivosPage() {
  const [comprandoId, setComprandoId] = useState<string | null>(null);
  const { data: archivos = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["marketplace-archivos-digitales"],
    queryFn: obtenerArchivosPublicos,
    staleTime: 60_000,
    retry: 1,
  });

  const iniciarCompra = async (archivo: ArchivoDigital) => {
    if (archivo.moneda !== "PEN") {
      toast.info("Los pagos en USD estarán disponibles cuando definamos la conversión de moneda.");
      return;
    }
    setComprandoId(archivo.archivo_id);
    try {
      const { data: sesionData, error: sesionError } = await supabase.auth.getSession();
      if (sesionError) throw sesionError;
      if (!sesionData.session) {
        toast.info("Inicia sesión para continuar con tu compra.");
        window.location.assign("/auth");
        return;
      }
      const { data, error } = await supabase.functions.invoke("marketplace-iniciar-pago", {
        body: { archivo_id: archivo.archivo_id },
      });
      if (error) throw error;
      if (typeof data?.init_point !== "string" || !data.init_point.startsWith("https://")) {
        throw new Error(data?.error || "No se recibió un enlace seguro de pago.");
      }
      window.location.assign(data.init_point);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo iniciar el pago.");
    } finally {
      setComprandoId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#211d19]">
      <header className="border-b border-[#b89b5e]/25 bg-[#211d19] text-[#f7f2e8]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link to="/auth" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-[#b89b5e]/40 bg-white/5"><Gem className="size-5 text-[#d7bd86]" /></span>
            <span><strong className="block text-xs font-extrabold tracking-[.13em] sm:text-sm">TALLER DEL JOYERO</strong><span className="mt-0.5 block text-[10px] tracking-[.1em] text-white/55">TIENDA 3D · ARCHIVOS DIGITALES</span></span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4" aria-label="Navegación principal">
            <Link to="/guias" className="rounded-full px-3 py-2 text-xs text-white/75 transition hover:bg-white/10 hover:text-white">Guías técnicas</Link><Link to="/directorio" className="rounded-full px-3 py-2 text-xs text-white/75 transition hover:bg-white/10 hover:text-white">Directorio</Link>
            <Link to="/auth" className="rounded-full bg-[#c9ad73] px-4 py-2.5 text-xs font-semibold text-[#211d19] transition hover:bg-[#dfc994]">Acceder</Link>
          </nav>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b border-[#b89b5e]/20">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_20%,rgba(190,159,96,.2),transparent_38%),radial-gradient(ellipse_at_5%_90%,rgba(190,159,96,.1),transparent_35%)]" />
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.26em] text-[#96733d] sm:text-xs"><ShoppingBag className="size-4" /> Tienda 3D · Archivos digitales para joyeros</p>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-medium leading-tight tracking-[-.04em] sm:text-6xl">Diseños digitales <span className="text-[#9a7944]">para crear</span></h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#746b62] sm:text-base sm:leading-8">Encuentra modelos 3D, archivos CAD, imágenes y planos técnicos publicados por otros profesionales. Compra cada recurso de forma individual y conserva tus archivos en un espacio privado.</p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-[#746b62]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#b89b5e]/30 bg-white/70 px-3 py-2"><Box className="size-4 text-[#96733d]" /> STL · 3DM · GLB · OBJ · STEP</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#b89b5e]/30 bg-white/70 px-3 py-2"><FileText className="size-4 text-[#96733d]" /> Imágenes y planos técnicos</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#b89b5e]/30 bg-white/70 px-3 py-2"><ShieldCheck className="size-4 text-[#96733d]" /> Archivos originales protegidos</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#96733d]">Selección digital</p><h2 className="mt-2 font-display text-2xl sm:text-3xl">Modelos y recursos digitales</h2></div>
          {!isLoading && !isError ? <span className="text-xs text-[#81766a]">{archivos.length} {archivos.length === 1 ? "archivo publicado" : "archivos publicados"}</span> : null}
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="overflow-hidden rounded-2xl border border-[#b89b5e]/20 bg-white/70"><div className="aspect-square animate-pulse bg-[#e9e3da]" /><div className="space-y-3 p-5"><div className="h-3 w-1/3 animate-pulse rounded bg-[#e9e3da]" /><div className="h-5 w-2/3 animate-pulse rounded bg-[#e9e3da]" /></div></div>)}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-[#b89b5e]/25 bg-white/80 px-6 py-12 text-center">
            <ShoppingBag className="mx-auto size-9 text-[#96733d]" />
            <h3 className="mt-4 text-lg font-semibold">El marketplace se está preparando</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#746b62]">No se pudo consultar la lista de archivos digitales. Comprueba que el SQL del marketplace se haya ejecutado en Lovable Cloud.</p>
            <button type="button" onClick={() => void refetch()} disabled={isFetching} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#211d19] px-5 py-3 text-xs font-semibold text-white disabled:opacity-60"><RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} /> Volver a intentar</button>
          </div>
        ) : archivos.length === 0 ? (
          <div className="rounded-2xl border border-[#b89b5e]/25 bg-white/80 px-6 py-14 text-center">
            <Box className="mx-auto size-9 text-[#96733d]" />
            <h3 className="mt-4 text-lg font-semibold">Todavía no hay archivos publicados</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#746b62]">Los archivos aparecerán aquí cuando un taller publique sus recursos digitales para la venta.</p>
            <Link to="/auth" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#211d19] px-5 py-3 text-xs font-semibold text-white">Acceder a mi taller <ArrowRight className="size-4" /></Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {archivos.map((archivo) => {
              const Icono = iconoCategoria(archivo.categoria);
              const comprando = comprandoId === archivo.archivo_id;
              return (
                <article key={archivo.archivo_id} className="group overflow-hidden rounded-2xl border border-[#b89b5e]/25 bg-white/80 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#b89b5e]/60 hover:shadow-xl">
                  <div className="relative aspect-square overflow-hidden bg-[radial-gradient(ellipse_at_50%_42%,#fff,#e7dfd1)]">
                    {archivo.imagen_portada_url ? <img src={archivo.imagen_portada_url} alt={`Vista previa de ${archivo.titulo}`} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <div className="grid h-full place-items-center text-[#a88952]"><Icono className="size-16" strokeWidth={1} /><span className="mt-2 text-xs text-[#81766a]">Recurso digital</span></div>}
                    <span className="absolute left-3 top-3 rounded-full bg-[#211d19]/90 px-3 py-1.5 text-[10px] font-semibold tracking-wide text-[#e8d3a4]">{archivo.categoria}</span>
                  </div>
                  <div className="p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#96733d]">{archivo.nombre_vendedor}</p>
                    <h3 className="mt-2 line-clamp-2 text-lg font-semibold">{archivo.titulo}</h3>
                    <p className="mt-2 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-[#746b62]">{archivo.descripcion || "Archivo digital para profesionales de la joyería."}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">{archivo.formatos.map((formato) => <span key={formato} className="rounded-md border border-[#b89b5e]/30 bg-[#f7f2e8] px-2 py-1 text-[10px] font-semibold text-[#5b4930]">{formato}</span>)}</div>
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#b89b5e]/20 pt-4">
                      <span className="text-lg font-bold text-[#8c6c38]">{formatoPrecio(archivo.precio, archivo.moneda)}</span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#b89b5e]/35 px-3 py-2 text-[10px] font-semibold text-[#5b4930]"><ShieldCheck className="size-3.5" /> Archivo privado</span>
                    </div>
                    <button type="button" onClick={() => void iniciarCompra(archivo)} disabled={comprandoId !== null || archivo.moneda !== "PEN"} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#211d19] px-4 py-3 text-xs font-semibold text-[#f7f2e8] transition hover:bg-[#3b3329] disabled:cursor-not-allowed disabled:opacity-55">
                      {comprando ? <LoaderCircle className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                      {comprando ? "Preparando pago..." : archivo.moneda !== "PEN" ? "Pago en USD próximamente" : "Comprar ahora"}
                    </button>
                    {archivo.moneda === "USD" ? <p className="mt-2 text-[11px] text-[#81766a]">Los cobros están habilitados únicamente en soles (PEN).</p> : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="border-y border-[#b89b5e]/20 bg-white/55">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8 sm:py-14 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#96733d]">¿Tienes archivos para vender?</p>
            <h2 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">Publica tus recursos digitales.</h2>
            <p className="mt-3 text-sm leading-7 text-[#746b62]">Selecciona únicamente los archivos que quieras ofrecer. Los originales de tu Mi Nube seguirán privados.</p>
          </div>
          <Link to="/auth" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#211d19] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#3b3329]">Acceder a mi taller <ArrowRight className="size-4" /></Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-[10px] text-[#81766a] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© {new Date().getFullYear()} Taller del Joyero · Marketplace Digital</span>
        <div className="flex flex-wrap gap-4"><Link to="/comunidad" className="hover:text-[#96733d]">Biblioteca</Link><Link to="/directorio" className="hover:text-[#96733d]">Directorio</Link><Link to="/auth" className="hover:text-[#96733d]">Acceso al ERP</Link></div>
      </footer>
    </main>
  );
}
