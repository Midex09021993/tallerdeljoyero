import { useState, type ChangeEvent } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { validarProyectoEnRunner, verificarAccesoAurumIntelligence } from "@/lib/aurum-intelligence.functions";
import { FileSearch, FlaskConical, LockKeyhole, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/aurum-intelligence")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/auth" });

    try {
      await verificarAccesoAurumIntelligence();
    } catch {
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

function PanelValidacionProyecto() {
  const [files, setFiles] = useState<Array<{ path: string; content: string }>>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    setFiles([]);
    setStatus("");
    if (selected.length === 0) return;
    if (selected.length > 500 || selected.some((file) => file.size > 1024 * 1024) || selected.reduce((sum, file) => sum + file.size, 0) > 10 * 1024 * 1024) {
      setStatus("Límite excedido: máximo 500 archivos, 1 MiB por archivo y 10 MiB en total.");
      event.target.value = "";
      return;
    }
    const allowed = /\\.(js|jsx|ts|tsx|mjs|cjs|json)$/i;
    if (selected.some((file) => !allowed.test(file.name))) {
      setStatus("Solo se permiten archivos JS, JSX, TS, TSX, MJS, CJS y JSON.");
      event.target.value = "";
      return;
    }
    try {
      const manifest = await Promise.all(selected.map(async (file) => ({
        path: file.webkitRelativePath || file.name,
        content: await file.text(),
      })));
      setFiles(manifest);
      setStatus(manifest.length + " archivo(s) preparados. Aún no se han enviado.");
    } catch {
      setStatus("No se pudieron leer los archivos seleccionados.");
    }
  }

  async function submit() {
    if (!files.length || busy) return;
    setBusy(true);
    setStatus("Validando manifiesto en el servicio aislado…");
    try {
      const result = await validarProyectoEnRunner({ data: { files } });
      const info = result as { fileCount?: number; totalBytes?: number; analysis?: string };
      setStatus("Validación completada: " + (info.fileCount ?? files.length) + " archivos, " + (info.totalBytes ?? "tamaño no informado") + " bytes. REA aún no se ejecutó.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo validar el proyecto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-4 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><FileSearch className="size-5" /></div>
      <h3 className="text-lg font-semibold">Validación de archivos fuente</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Selecciona archivos de un proyecto autorizado. Se validan en un espacio temporal y se eliminan al terminar. Este paso todavía no ejecuta REA.</p>
      <label className="mt-4 block text-sm font-medium">Archivos del proyecto
        <input className="mt-2 block w-full rounded-xl border border-border bg-background p-3 text-sm" type="file" multiple accept=".js,.jsx,.ts,.tsx,.mjs,.cjs,.json" onChange={handleFiles} />
      </label>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={!files.length || busy} onClick={submit} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Validando…" : "Validar proyecto"}</button>
        <span className="text-xs text-muted-foreground">{files.length} archivo(s) preparados</span>
      </div>
      {status ? <p role="status" aria-live="polite" className="mt-3 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">{status}</p> : null}
    </article>
  );
}
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
          <PanelValidacionProyecto />

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
            <li>• Los archivos se validan temporalmente; no se ejecuta código externo.</li>
            <li>• No se realizan cambios en Supabase ni en el repositorio analizado.</li>
            <li>• Aurum Render permanece fuera del alcance de este laboratorio.</li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
