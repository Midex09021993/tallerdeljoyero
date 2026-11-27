import { useState, type ChangeEvent } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { iniciarAnalisisBinarioEnRunner, consultarAnalisisBinarioEnRunner, validarProyectoEnRunner, verificarAccesoAurumIntelligence } from "@/lib/aurum-intelligence.functions";
import { AlertCircle, Check, CheckCircle2, Copy, FileCode2, FileSearch, FlaskConical, FolderOpen, HardDrive, LockKeyhole, ShieldCheck, UploadCloud, X } from "lucide-react";

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

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KiB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MiB";
}

function PanelValidacionProyecto() {
  const [files, setFiles] = useState<Array<{ path: string; content: string }>>([]);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "info">("info");
  const [busy, setBusy] = useState(false);
  const [inputVersion, setInputVersion] = useState(0);
  const totalBytes = files.reduce((sum, file) => sum + new Blob([file.content]).size, 0);
  const limits = { count: 500, perFile: 1024 * 1024, total: 10 * 1024 * 1024 };

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    setFiles([]);
    setStatus("");
    if (selected.length === 0) return;

    if (selected.length > limits.count) {
      setStatusType("error");
      setStatus("Has seleccionado " + selected.length + " archivos. El máximo permitido es " + limits.count + ".");
      event.target.value = "";
      return;
    }
    const allowed = /\.(js|jsx|ts|tsx|mjs|cjs|json)$/i;
    const unsupported = selected.find((file) => !allowed.test(file.name));
    if (unsupported) {
      setStatusType("error");
      setStatus("Formato no permitido: " + unsupported.name + ". Usa JS, JSX, TS, TSX, MJS, CJS o JSON.");
      event.target.value = "";
      return;
    }
    const oversized = selected.find((file) => file.size > limits.perFile);
    if (oversized) {
      setStatusType("error");
      setStatus("El archivo " + oversized.name + " supera el límite de 1 MiB.");
      event.target.value = "";
      return;
    }
    const selectedBytes = selected.reduce((sum, file) => sum + file.size, 0);
    if (selectedBytes > limits.total) {
      setStatusType("error");
      setStatus("El conjunto ocupa " + formatFileSize(selectedBytes) + ". El máximo total es 10 MiB.");
      event.target.value = "";
      return;
    }

    try {
      const manifest = await Promise.all(selected.map(async (file) => ({
        path: file.webkitRelativePath || file.name,
        content: await file.text(),
      })));
      setFiles(manifest);
      setStatusType("success");
      setStatus("Archivos leídos correctamente. Todavía no se han enviado al servicio.");
    } catch {
      setStatusType("error");
      setStatus("No se pudieron leer todos los archivos. Vuelve a seleccionarlos.");
      event.target.value = "";
    }
  }

  function clearFiles() {
    if (busy) return;
    setFiles([]);
    setStatus("");
    setInputVersion((version) => version + 1);
  }

  async function submit() {
    if (!files.length || busy) return;
    setBusy(true);
    setStatusType("info");
    setStatus("Enviando manifiesto para validación… No se ejecutará código REA.");
    try {
      const result = await validarProyectoEnRunner({ data: { files } });
      const info = result as { fileCount?: number; totalBytes?: number; analysis?: string };
      setStatusType("success");
      setStatus("Manifiesto validado y descartado: " + (info.fileCount ?? files.length) + " archivos · " + formatFileSize(info.totalBytes ?? totalBytes) + ". No se ejecutó código; esta etapa solo valida y descarta el manifiesto.");
    } catch (error) {
      setStatusType("error");
      setStatus(error instanceof Error ? error.message : "No se pudo validar el proyecto. El servicio puede no estar conectado todavía.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="grid size-12 place-items-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">
            <FileSearch className="size-5" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="size-3.5" /> Validación segura
          </span>
        </div>

        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Etapa 01 · Ingesta controlada</p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">Validación de archivos fuente</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Selecciona archivos de un proyecto autorizado. Revisamos su manifiesto y contenido en el entorno temporal; no se ejecutan scripts ni se modifica el proyecto original.
          </p>
        </div>

        <div className="mt-5">
          <label htmlFor="aurum-source-files" className="mb-2 block text-sm font-semibold">Archivos del proyecto</label>
          <input
            key={inputVersion}
            id="aurum-source-files"
            className="sr-only"
            type="file"
            multiple
            accept=".js,.jsx,.ts,.tsx,.mjs,.cjs,.json"
            onChange={handleFiles}
            disabled={busy}
          />
          <label
            htmlFor="aurum-source-files"
            className="group flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-amber-500/40 bg-muted/20 px-4 py-5 text-center transition-colors hover:border-amber-500/70 hover:bg-amber-500/5"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-background text-amber-600 shadow-sm transition-transform group-hover:-translate-y-0.5 dark:text-amber-300">
              <UploadCloud className="size-5" />
            </span>
            <span className="mt-3 text-sm font-semibold">Seleccionar archivos fuente</span>
            <span className="mt-1 text-xs text-muted-foreground">Haz clic para explorar tu equipo · Selección múltiple</span>
          </label>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileCode2 className="size-3.5 shrink-0" /> JS · JSX · TS · TSX · MJS · CJS · JSON
          </p>
        </div>

        {files.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-border bg-background/70 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FolderOpen className="size-4 text-amber-600 dark:text-amber-300" />
                Proyecto preparado
              </div>
              <button type="button" onClick={clearFiles} disabled={busy} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50">
                <X className="size-3.5" /> Quitar archivos
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-[11px] text-muted-foreground">Archivos listos</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{files.length}<span className="ml-1 text-xs font-normal text-muted-foreground">/ 500</span></p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><HardDrive className="size-3" /> Tamaño total</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{formatFileSize(totalBytes)}<span className="ml-1 text-xs font-normal text-muted-foreground">/ 10 MiB</span></p>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5">
              {files.slice(0, 3).map((file) => (
                <li key={file.path} className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  <FileCode2 className="size-3.5 shrink-0 text-amber-600 dark:text-amber-300" />
                  <span className="truncate">{file.path}</span>
                </li>
              ))}
              {files.length > 3 ? <li className="pl-5 text-xs text-muted-foreground">y {files.length - 3} archivo(s) más…</li> : null}
            </ul>
          </div>
        ) : (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" />
            <span>Los archivos permanecen en esta sesión hasta iniciar la validación. No se guardan en el catálogo ni en Supabase.</span>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!files.length || busy}
            onClick={submit}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? <><span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> Validando…</> : <><ShieldCheck className="size-4" /> Validar proyecto</>}
          </button>
          <span className="text-xs text-muted-foreground">{files.length ? files.length + " archivo(s) listos para validar" : "A la espera de archivos"}</span>
        </div>

        {status ? (
          <div role="status" aria-live="polite" className={"mt-4 flex items-start gap-2.5 rounded-xl border p-3 text-sm leading-5 " + (statusType === "success" ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300" : statusType === "error" ? "border-destructive/25 bg-destructive/5 text-destructive" : "border-border bg-muted/40 text-muted-foreground")}>
            {statusType === "success" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : statusType === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <LockKeyhole className="mt-0.5 size-4 shrink-0" />}
            <span>{status}</span>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <span>Máx. 500 archivos</span><span>1 MiB por archivo</span><span>10 MiB por proyecto</span>
        </div>
      </div>
    </article>
  );
}

function PanelAnalisisBinario() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"managed" | "native">("native");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [report, setReport] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const maxBytes = 32 * 1024 * 1024;

  async function analyze() {
    if (!file || busy) return;
    setBusy(true);
    setStatus("Preparando análisis estático… El ejecutable no se iniciará.");
    setReport("");
    setCopyStatus("idle");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      const chunkSize = 0x8000;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
      }
      const contentBase64 = btoa(binary);
      const job = await iniciarAnalisisBinarioEnRunner({
        data: { fileName: file.name, contentBase64, mode },
      });
      setStatus("Análisis recibido por REA. Ghidra está trabajando en segundo plano; puedes mantener esta ventana abierta.");
      for (let attempt = 0; attempt < 75; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 7000));
        const state = await consultarAnalisisBinarioEnRunner({ data: { jobId: job.jobId } }) as {
          status: string;
          result?: unknown;
          error?: string | null;
        };
        if (state.status === "complete" && state.result) {
          setReport(JSON.stringify(state.result, null, 2));
          setStatus("Análisis estático completado. El archivo temporal fue eliminado; no se ejecutó ni almacenó.");
          return;
        }
        if (state.status === "failed") {
          const reason = state.error === "analysis_timeout"
            ? "Ghidra superó el tiempo máximo de análisis."
            : state.error === "analysis_busy"
              ? "El motor ya estaba ocupado con otro análisis."
              : "REA no pudo completar una de las etapas de análisis (" + (state.error || "error desconocido") + ").";
          throw new Error(reason);
        }
        setStatus(state.status === "queued"
          ? "Análisis en cola…"
          : "Ghidra está analizando el ejecutable… (" + Math.round(((attempt + 1) * 7) / 60) + " min)");
      }
      throw new Error("El análisis sigue en segundo plano, pero la interfaz alcanzó su límite de espera. Puedes volver a consultar el mismo archivo cuando el trabajo termine.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo completar el análisis.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-card p-5 shadow-sm sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="grid size-12 place-items-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">
            <FileCode2 className="size-5" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="size-3.5" /> REA · Estático
          </span>
        </div>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Etapa 02 · Análisis de binarios</p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight">Inspeccionar EXE / DLL</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Análisis estático con REA. Para ensamblados .NET selecciona «Gestionado»; para ejecutables nativos PE selecciona «Nativo · Ghidra». El archivo se procesa temporalmente y nunca se inicia.
        </p>
        <label className="mt-5 block text-sm font-semibold" htmlFor="aurum-pe-file">Archivo ejecutable</label>
        <input
          id="aurum-pe-file"
          type="file"
          accept=".exe,.dll"
          disabled={busy}
          onChange={(event) => {
            const selected = event.target.files?.[0] ?? null;
            setReport("");
            setCopyStatus("idle");
            if (selected && selected.size > maxBytes) {
              setFile(null);
              setStatus("El archivo supera el límite de 32 MiB.");
              event.target.value = "";
              return;
            }
            setFile(selected);
            setStatus(selected ? selected.name + " · " + formatFileSize(selected.size) : "");
          }}
          className="mt-2 block w-full rounded-xl border border-border bg-background p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-xs file:font-semibold"
        />
        <label className="mt-4 block text-sm font-semibold" htmlFor="aurum-pe-mode">Tipo de análisis</label>
        <select
          id="aurum-pe-mode"
          value={mode}
          disabled={busy}
          onChange={(event) => setMode(event.target.value as "managed" | "native")}
          className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
        >
          <option value="native">Nativo · Ghidra</option>
          <option value="managed">Gestionado · .NET</option>
        </select>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={analyze}
            disabled={!file || busy}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <span className="size-4 animate-spin rounded-full border-2 border-black/30 border-t-black" /> : <FileSearch className="size-4" />}
            {busy ? "Analizando…" : "Iniciar análisis estático"}
          </button>
          <span className="text-xs text-muted-foreground">Máximo 32 MiB · EXE / DLL</span>
        </div>
        {status ? <p role="status" aria-live="polite" className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">{status}</p> : null}
        {report ? (
          <div className="mt-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold">Informe técnico</h4>
                <p className="mt-0.5 text-xs text-muted-foreground">Informe completo · {formatFileSize(new Blob([report]).size)}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(report);
                    setCopyStatus("copied");
                  } catch {
                    setCopyStatus("error");
                  }
                }}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                aria-label="Copiar informe técnico completo"
              >
                {copyStatus === "copied" ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                {copyStatus === "copied" ? "Copiado" : "Copiar informe"}
              </button>
            </div>
            {copyStatus === "error" ? (
              <p role="alert" className="mb-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                El navegador no permitió copiar automáticamente. Haz clic dentro del informe y usa Ctrl+A, luego Ctrl+C.
              </p>
            ) : null}
            <pre
              tabIndex={0}
              aria-label="Contenido completo del informe técnico; también puedes seleccionarlo manualmente"
              className="max-h-[28rem] select-text overflow-auto rounded-xl border border-border bg-muted/50 p-3 text-xs leading-5 whitespace-pre-wrap break-words focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >{report}</pre>
          </div>
        ) : null}
        <p className="mt-4 border-t border-border pt-3 text-[11px] leading-5 text-muted-foreground">
          No hay ejecución dinámica, persistencia ni modificación del original. Los resultados son hallazgos estáticos y no garantizan recuperar el código fuente original.
        </p>
      </div>
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
          <PanelAnalisisBinario />

          <article className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-4 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <FlaskConical className="size-5" />
            </div>
            <h3 className="text-lg font-semibold">Motor REA</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              REA 6.8.0 y Ghidra 12.2 están incorporados al runner para inspección estática. El servicio no inicia los archivos analizados, aplica autenticación de corta duración y protección anti-repetición. Aurum Render y los secretos del ERP permanecen fuera de este entorno.
            </p>
            <span className="mt-5 inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-700 dark:text-amber-300">
              REA + Ghidra · Análisis estático
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
