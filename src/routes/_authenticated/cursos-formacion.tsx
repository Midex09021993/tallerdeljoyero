import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Clock3, ShieldCheck } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/cursos-formacion")({
  head: () => ({
    meta: [
      { title: "Cursos y formación — Taller del Joyero" },
      { name: "description", content: "Gestiona cursos y formación profesional en joyería." },
    ],
  }),
  component: CursosFormacionPage,
});

function CursosFormacionPage() {
  return (
    <AppShell
      titulo="Cursos y formación"
      subtitulo="Creación y publicación de cursos con revisión comercial"
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/10 via-card to-card p-6 sm:p-8">
          <div className="flex size-12 items-center justify-center rounded-xl border border-gold/25 bg-gold/10 text-gold-deep">
            <BookOpen className="size-6" />
          </div>
          <h2 className="mt-5 text-xl font-semibold">Formación para la comunidad joyera</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Este espacio permitirá preparar cursos, administrar su información y enviarlos a revisión antes de publicarlos en el catálogo público.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Panel titulo="Flujo de publicación">
            <div className="space-y-4 p-5">
              <div className="flex gap-3">
                <Clock3 className="mt-0.5 size-5 shrink-0 text-gold-deep" />
                <div>
                  <p className="text-sm font-medium">Revisión comercial obligatoria</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Los cursos no aparecerán públicamente hasta que sean revisados y aprobados.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-gold-deep" />
                <div>
                  <p className="text-sm font-medium">Acceso según capacidad del taller</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">La opción del menú depende de que «Cursos y formación» esté habilitada en Gestión → Capacidades.</p>
                </div>
              </div>
            </div>
          </Panel>
          <Panel titulo="Preparación del módulo">
            <div className="p-5">
              <p className="text-sm leading-6 text-muted-foreground">
                La navegación ya está preparada. Antes de habilitar la creación y publicación de cursos, falta conectar el modelo de datos y sus permisos en Supabase.
              </p>
              <p className="mt-3 rounded-lg border border-border bg-surface-muted p-3 text-xs leading-5 text-muted-foreground">
                Por seguridad, todavía no se habilita un formulario que guarde información sin las reglas de aprobación correspondientes.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
