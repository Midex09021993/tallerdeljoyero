import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, BookOpen, Box, Calculator, Gem, GraduationCap, MessageCircle, Send, Sparkles, Share2, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabasePublic } from "@/integrations/supabase/client";

export const Route = createFileRoute("/formacion/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabasePublic.rpc(
      "obtener_publicidad_formacion" as never,
      { _slug: params.slug } as never,
    );
    if (error) return null;
    const result = data as unknown as Publicacion | Publicacion[] | null;
    return Array.isArray(result) ? result[0] ?? null : result;
  },
  head: ({ params, loaderData }) => {
    const publicacion = loaderData as Publicacion | null | undefined;
    const titulo = publicacion?.formacion_titulo?.trim() || "Cursos y formación";
    const descripcion = publicacion?.formacion_descripcion?.trim()
      || "Conoce cursos y propuestas formativas para la comunidad joyera.";
    const imagen = publicacion?.formacion_imagen_url || publicacion?.logo_url;
    const url = `https://www.tallerdeljoyero.com/formacion/${params.slug}`;
    const esPublicacionDisponible = Boolean(publicacion?.slug && publicacion?.nombre_publico?.trim());
    return {
      links: esPublicacionDisponible ? [{ rel: "canonical", href: url }] : [],
      meta: [
        { title: `${titulo} | ${publicacion?.nombre_publico || "Taller del Joyero"}` },
        { name: "description", content: descripcion },
        { name: "robots", content: esPublicacionDisponible ? "index, follow" : "noindex, follow" },
        { property: "og:title", content: `${titulo} | ${publicacion?.nombre_publico || "Taller del Joyero"}` },
        { property: "og:description", content: descripcion },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        ...(imagen ? [{ property: "og:image", content: imagen }, { property: "og:image:alt", content: titulo }] : []),
        { name: "twitter:card", content: imagen ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: `${titulo} | ${publicacion?.nombre_publico || "Taller del Joyero"}` },
        { name: "twitter:description", content: descripcion },
        ...(imagen ? [{ name: "twitter:image", content: imagen }] : []),
      ],
    };
  },
  component: PublicidadFormacionPage,
});

type Publicacion = {
  slug: string;
  nombre_publico: string;
  descripcion: string | null;
  logo_url: string | null;
  whatsapp: string | null;
  formacion_titulo: string | null;
  formacion_descripcion: string | null;
  formacion_imagen_url: string | null;
};

function PublicidadFormacionPage() {
  const { slug } = Route.useParams();
  const publicacionInicial = Route.useLoaderData();
  const [mensajeCompartir, setMensajeCompartir] = useState("");
  const compartirPagina = async () => {
    const url = window.location.href;
    if (!data) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${data.formacion_titulo || "Cursos y formación"} | ${data.nombre_publico}`,
          text: `${data.formacion_descripcion || "Conoce esta propuesta de formación para la comunidad joyera."} ${data.nombre_publico}`,
          url,
        });
        setMensajeCompartir("Enlace compartido.");
        return;
      }
      await navigator.clipboard.writeText(url);
      setMensajeCompartir("Enlace copiado. Ya puedes compartirlo.");
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      setMensajeCompartir("No se pudo compartir automáticamente. Copia el enlace desde la barra del navegador.");
    }
  };
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["publicidad-formacion-publica", slug],
    queryFn: async () => {
      const { data, error } = await supabasePublic.rpc(
        "obtener_publicidad_formacion" as never,
        { _slug: slug } as never,
      );
      if (error) throw error;
      const result = data as unknown as Publicacion | Publicacion[] | null;
      return Array.isArray(result) ? result[0] ?? null : result;
    },
    initialData: publicacionInicial,
    retry: 1,
  });

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="text-center">
          <GraduationCap className="mx-auto size-9 animate-pulse text-gold-deep" />
          <p className="mt-3 text-sm text-muted-foreground">Cargando publicación…</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-5 py-16 text-center">
        <div aria-hidden="true" className="pointer-events-none absolute -top-28 size-80 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative max-w-md">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-gold/25 bg-gold/10 text-gold-deep">
            <GraduationCap className="size-8" />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-gold-deep">Cursos y formación</p>
          <h1 className="mt-3 text-2xl font-semibold">Esta publicación aún no está disponible</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            La profesora todavía no ha activado esta página o el enlace necesita revisión. Puedes volver a intentarlo más tarde o conocer la propuesta general de formación.
          </p>
          <Link to="/cursos-diseno-3d" className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gold px-5 text-sm font-semibold text-black transition hover:brightness-105">
            Conocer Cursos y formación <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>
    );
  }

  const contacto = data.whatsapp?.replace(/[^0-9]/g, "");
  const mensajeContacto = `Hola, vi la página de cursos y formación de ${data.nombre_publico} y quisiera recibir más información. ${window.location.href}`;
  const contactoUrl = contacto
    ? `https://wa.me/${contacto}?text=${encodeURIComponent(mensajeContacto)}`
    : null;
  const herramientas = [
    { title: "AURUM Render", description: "Para usar el visor 3D, inicia sesión con tu cuenta o regístrate si todavía no tienes una.", href: "/auth", icon: Gem },
    { title: "AURUM Transfer", description: "Comparte archivos de práctica de forma sencilla.", href: "/transfer", icon: Send },
    { title: "Calculadoras técnicas", description: "Prueba herramientas de cálculo para el oficio joyero.", href: "/herramientas", icon: Calculator },
    { title: "Más herramientas", description: "Explora calculadoras y utilidades gratuitas para practicar.", href: "/herramientas", icon: Box },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/80">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-4 sm:flex-nowrap sm:gap-4 sm:px-8 sm:py-5">
          {data.logo_url ? (
            <img src={data.logo_url} alt={data.nombre_publico} className="size-16 shrink-0 rounded-2xl border border-border bg-background object-cover" />
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-gold/25 bg-gold/10 text-gold-deep"><GraduationCap className="size-8" /></div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-gold-deep">Cursos y formación</p>
            <h1 className="mt-1 text-xl font-semibold sm:text-2xl">{data.nombre_publico}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{data.descripcion || "Formación profesional para la comunidad joyera."}</p>
          </div>
          <button type="button" onClick={() => void compartirPagina()} className="ml-auto inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold transition hover:border-gold/40 hover:bg-gold/5">
            <Share2 className="size-4" /> <span className="hidden sm:inline">Compartir página</span><span className="sm:hidden">Compartir</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-8 sm:py-12">
        <section className="relative overflow-hidden rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/10 via-card to-card shadow-sm">
          {data.formacion_imagen_url ? (
            <img src={data.formacion_imagen_url} alt={`Imagen promocional de ${data.nombre_publico}`} loading="eager" fetchPriority="high" className="aspect-[16/9] max-h-[420px] w-full bg-surface-muted object-cover sm:aspect-[2/1]" />
          ) : null}
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-gold/10 blur-3xl" />
          <div className="relative p-5 sm:p-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-gold-deep">
              <Sparkles className="size-3.5" /> Propuesta formativa
            </span>
            <h2 className="mt-5 max-w-3xl break-words text-2xl font-semibold leading-tight sm:text-4xl">
              {data.formacion_titulo || "Aprende, crea y desarrolla tu talento joyero"}
            </h2>
            <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-7 text-muted-foreground sm:text-base">
              {data.formacion_descripcion || "Descubre nuevas técnicas, desarrolla tus habilidades y explora herramientas digitales para el diseño y la creación de joyería."}
            </p>
            <div className="mt-7 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
              {contactoUrl ? (
                <a href={contactoUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold px-5 text-sm font-semibold text-black transition hover:brightness-105 sm:w-auto">
                  <MessageCircle className="size-4" /> Solicitar información
                </a>
              ) : null}
              <a href="#herramientas" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-5 text-sm font-semibold transition hover:bg-surface-muted sm:w-auto">
                <BookOpen className="size-4" /> Recursos para estudiantes
              </a>
            </div>
          </div>
        </section>

        <section id="herramientas" className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-gold-deep">Aprende practicando</p>
            <h2 className="mt-2 text-xl font-semibold sm:text-2xl">Recursos para estudiantes</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Explora las herramientas de Taller del Joyero para poner en práctica tus ideas y conocer el flujo digital del trabajo joyero.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {herramientas.map(item => {
              const Icon = item.icon;
              return (
                <a key={item.title} href={item.href} className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold-deep"><Icon className="size-5" /></span>
                    <h3 className="font-semibold">{item.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gold-deep">Abrir herramienta <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
                </a>
              );
            })}
          </div>
        </section>
      </div>
      {mensajeCompartir ? <div role="status" className="mx-auto max-w-5xl px-5 pb-3 text-center text-sm text-muted-foreground sm:px-8"><Check className="mr-1 inline size-4 text-gold-deep" />{mensajeCompartir}</div> : null}
      <footer className="border-t border-border bg-card/50">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-6 text-center text-xs text-muted-foreground sm:px-8">
          <span>Publicado con Taller del Joyero</span>
          <span>Formación y herramientas para la comunidad joyera</span>
        </div>
      </footer>
    </main>
  );
}
