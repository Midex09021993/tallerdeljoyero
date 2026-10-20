import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Gem, GraduationCap, Sparkles } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/cursos-formacion")({
  head: () => ({
    meta: [
      { title: "Cursos y formación — Taller del Joyero" },
      { name: "description", content: "Conoce la próxima oferta de cursos y formación para la comunidad joyera." },
    ],
  }),
  component: CursosFormacionPage,
});

function CursosFormacionPage() {
  return (
    <AppShell
      titulo="Cursos y formación"
      subtitulo="Aprende, crea y desarrolla tu talento en joyería"
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/10 via-card to-card p-6 sm:p-10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-gold/10 blur-3xl" />
          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-gold-deep">
              <Sparkles className="size-3.5" /> Próximamente
            </span>
            <div className="mt-5 flex size-12 items-center justify-center rounded-xl border border-gold/25 bg-gold/10 text-gold-deep">
              <GraduationCap className="size-6" />
            </div>
            <h2 className="mt-5 font-display text-2xl sm:text-3xl">La próxima generación de talento joyero empieza aquí</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Estamos preparando un espacio para descubrir cursos, aprender nuevas técnicas y desarrollar habilidades para el oficio joyero, desde los fundamentos hasta herramientas digitales de diseño.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/cursos-diseno-3d"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gold px-5 text-sm font-semibold text-black transition hover:brightness-105"
              >
                Conocer la propuesta <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/herramientas-publicas"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold transition hover:bg-surface-muted"
              >
                Explorar herramientas
              </Link>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Esta página es informativa. La oferta de cursos e inscripciones se anunciará cuando esté confirmada.
            </p>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <Panel titulo="Técnicas de joyería">
            <div className="p-5">
              <BookOpen className="size-5 text-gold-deep" />
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Formación orientada al oficio, los materiales y los procesos de taller.</p>
              <span className="mt-3 inline-flex rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">En preparación</span>
            </div>
          </Panel>
          <Panel titulo="Diseño y herramientas 3D">
            <div className="p-5">
              <Gem className="size-5 text-gold-deep" />
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Recursos para explorar el diseño digital y la presentación de piezas.</p>
              <span className="mt-3 inline-flex rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">En preparación</span>
            </div>
          </Panel>
          <Panel titulo="Aprendizaje profesional">
            <div className="p-5">
              <GraduationCap className="size-5 text-gold-deep" />
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Contenidos para estudiantes, artesanos y profesionales del sector joyero.</p>
              <span className="mt-3 inline-flex rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">Próximamente</span>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
