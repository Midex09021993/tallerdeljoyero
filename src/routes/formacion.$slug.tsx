import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Box, Calculator, Gem, GraduationCap, MessageCircle, Send, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabasePublic } from "@/integrations/supabase/client";

export const Route = createFileRoute("/formacion/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Cursos y formación | ${params.slug} · Taller del Joyero` },
      { name: "description", content: "Conoce la propuesta formativa y las herramientas para estudiantes de joyería." },
      { name: "robots", content: "index, follow" },
    ],
  }),
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
  const { data, isLoading, error } = useQuery({
    queryKey: ["publicidad-formacion-publica", slug],
    queryFn: async () => {
      const { data, error } = await supabasePublic.rpc("obtener_publicidad_formacion" as never, { _slug: slug } as never);
      if (error) throw error;
      const rows = data as unknown as Publicacion[];
      return Array.isArray(rows) ? rows[0] ?? null : null;
    },
  });

  if (isLoading) return <main className="min-h-screen bg-background px-5 py-16 text-center text-sm text-muted-foreground">Cargando publicación…</main>;
  if (error || !data) return <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-5 text-center"><GraduationCap className="size-10 text-gold-deep" /><h1 className="text-2xl font-semibold">Publicación no disponible</h1><p className="max-w-md text-sm text-muted-foreground">Esta página todavía no está publicada o el enlace no es válido.</p><Link to="/cursos-diseno-3d" className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-black">Conocer Cursos y formación <ArrowRight className="size-4" /></Link></main>;

  const contacto = data.whatsapp?.replace(/[^0-9]/g, "");
  const contactoUrl = contacto ? `https://wa.me/${contacto}` : null;
  const herramientas = [
    { title: "AURUM Render", description: "Explora el diseño y la visualización 3D de joyería.", href: "/auth", icon: Gem },
    { title: "AURUM Transfer", description: "Comparte archivos de práctica de forma sencilla.", href: "/transfer", icon: Send },
    { title: "Calculadoras técnicas", description: "Prueba herramientas de cálculo para el oficio joyero.", href: "/herramientas-publicas", icon: Calculator },
    { title: "Recursos y herramientas", description: "Descubre más utilidades de Taller del Joyero.", href: "/herramientas-publicas", icon: Box },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/80">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-5 sm:px-8">
          {data.logo_url ? <img src={data.logo_url} alt={data.nombre_publico} className="size-16 rounded-2xl border border-border object-cover" /> : <div className="flex size-16 items-center justify-center rounded-2xl border border-gold/25 bg-gold/10 text-gold-deep"><GraduationCap className="size-8" /></div>}
          <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-widest text-gold-deep">Cursos y formación</p><h1 className="mt-1 text-xl font-semibold sm:text-2xl">{data.nombre_publico}</h1><p className="mt-1 text-sm text-muted-foreground">{data.descripcion || "Formación profesional para la comunidad joyera."}</p></div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl space-y-8 px-5 py-8 sm:px-8 sm:py-12">
        <section className="overflow-hidden rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/10 via-card to-card">
          {data.formacion_imagen_url && <img src={data.formacion_imagen_url} alt="" className="max-h-[360px] w-full object-cover" />}
          <div className="p-6 sm:p-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gold-deep"><Sparkles className="size-3.5" /> Propuesta formativa</span>
            <h2 className="mt-5 text-2xl font-semibold sm:text-4xl">{data.formacion_titulo || "Aprende, crea y desarrolla tu talento joyero"}</h2>
            <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-7 text-muted-foreground sm:text-base">{data.formacion_descripcion || "Descubre nuevas técnicas, desarrolla tus habilidades y explora herramientas digitales para el diseño y la creación de joyería."}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {contactoUrl && <a href={contactoUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gold px-5 text-sm font-semibold text-black"><MessageCircle className="size-4" /> Solicitar información</a>}
              <a href="#herramientas" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold"><BookOpen className="size-4" /> Recursos para estudiantes</a>
            </div>
          </div>
        </section>
        <section id="herramientas" className="space-y-4">
          <div><h2 className="text-xl font-semibold">Recursos para estudiantes</h2><p className="mt-1 text-sm text-muted-foreground">Herramientas de Taller del Joyero para explorar y practicar.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {herramientas.map(item => {
              const Icon = item.icon;
              return <a key={item.title} href={item.href} className="group rounded-2xl border border-border bg-card p-5 transition hover:border-gold/40 hover:shadow-sm"><div className="flex items-center gap-3"><Icon className="size-5 text-gold-deep" /><h3 className="font-semibold">{item.title}</h3></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gold-deep">Explorar <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span></a>;
            })}
          </div>
        </section>
        <footer className="border-t border-border pt-5 text-center text-xs text-muted-foreground">Publicado con Taller del Joyero · Formación y herramientas para la comunidad joyera</footer>
      </div>
    </main>
  );
}
