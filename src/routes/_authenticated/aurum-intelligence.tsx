import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { puedeAccederAurumIntelligence } from "@/lib/aurum-intelligence-access";
import { FileSearch, FlaskConical, LockKeyhole, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/aurum-intelligence")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    if (!puedeAccederAurumIntelligence(data.user.id)) {
      throw redirect({ to: "/inicio" });
    }
  },
  head: () => ({
    meta: [
      { title: "AURUM INTELLIGENCE · FADILAB" },
      {
        name: "description",
        content: "Laboratorio privado de análisis e ingeniería inversa de software.",
      },
    ],
  }),
  component: AurumIntelligencePage,
});

function AurumIntelligencePage() {
  return (
    <AppShell
      titulo="AURUM INTELLIGENCE"
      subtitulo="Laboratorio privado de ingeniería inversa · FADILAB"
      atrasMovil={{ to: "/inicio" }}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-9">
          <div className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
                <ShieldCheck className="size-3.5" />
                Acceso privado del propietario
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  FADILAB · Research & Engineering
                </p>
                <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
                  Comprender. Auditar. Reconstruir.
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Espacio de trabajo para inspeccionar archivos y proyectos autorizados,
                documentar su arquitectura y generar informes técnicos verificables.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/80 px-4 py-3">
              <div className="grid size-11 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                <LockKeyhole className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Entorno restringido</p>
                <p className="text-xs text-muted-foreground">Cuenta propietaria validada</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-4 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <FileSearch className="size-5" />
            </div>
            <h3 className="text-lg font-semibold">Análisis de archivos</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Preparado para revisar estructura, formatos, dependencias y componentes
              de proyectos que tengas autorización para analizar.
            </p>
            <span className="mt-5 inline-flex rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              Módulo en preparación
            </span>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-4 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <FlaskConical className="size-5" />
            </div>
            <h3 className="text-lg font-semibold">Motor REA</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              La integración con REA todavía no está conectada. Primero aislaremos
              su ejecución en un servicio independiente, sin acceso al motor de
              renderizado ni a secretos del ERP.
            </p>
            <span className="mt-5 inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-700 dark:text-amber-300">
              Sin ejecutar código externo
            </span>
          </article>
        </div>

        <section className="rounded-2xl border border-border bg-muted/30 p-5 sm:p-6">
          <h3 className="text-sm font-semibold">Límites de seguridad de esta primera etapa</h3>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground sm:grid-cols-2">
            <li>• Acceso de interfaz limitado al UID propietario configurado.</li>
            <li>• No se suben ni ejecutan archivos en esta etapa.</li>
            <li>• No se realizan cambios en Supabase ni en el repositorio analizado.</li>
            <li>• Aurum Render permanece fuera del alcance de este laboratorio.</li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
