import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Copy, FileUp, Link2, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";

export const Route = createFileRoute("/transfer/")({
  head: () => ({
    meta: [
      { title: "AURUM Transfer — Envía archivos de joyería" },
      {
        name: "description",
        content: "Transfiere archivos de joyería con un enlace privado de un solo uso.",
      },
    ],
  }),
  component: TransferPage,
});

const MAX_BYTES = 2 * 1024 * 1024 * 1024;
const SUPABASE_URL = (import.meta.env as { VITE_SUPABASE_URL?: string }).VITE_SUPABASE_URL ?? "";
const SUPABASE_KEY = (import.meta.env as { VITE_SUPABASE_PUBLISHABLE_KEY?: string }).VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function callCreate(body: unknown) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/aurum-transfer-create`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "No se pudo crear la transferencia.");
  return data;
}

function putFile(url: string, file: File, onProgress: (loaded: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`No se pudo subir ${file.name}.`)));
    xhr.onerror = () => reject(new Error("Fallo de red al subir el archivo."));
    xhr.send(file);
  });
}

async function createTransfer(files: File[], onProgress: (pct: number) => void) {
  const meta = files.map((f) => ({ name: f.name, size: f.size, type: f.type }));
  const prep = (await callCreate({ action: "prepare", files: meta })) as {
    token: string;
    uploads: Array<{ name: string; size: number; type: string; path: string; signedUrl: string }>;
  };
  const total = files.reduce((s, f) => s + f.size, 0) || 1;
  const loaded = files.map(() => 0);
  for (let i = 0; i < files.length; i++) {
    await putFile(prep.uploads[i]!.signedUrl, files[i]!, (l) => {
      loaded[i] = l;
      onProgress(Math.min(99, Math.round((loaded.reduce((a, b) => a + b, 0) / total) * 100)));
    });
  }
  const done = await callCreate({
    action: "finalize",
    token: prep.token,
    files: prep.uploads.map(({ name, size, type, path }) => ({ name, size, type, path })),
  });
  onProgress(100);
  return done as { token: string };
}

function TransferPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  const total = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  const addFiles = (incoming: FileList | File[]) => {
    setError("");
    const next = [...files, ...Array.from(incoming)];
    const unique = next.filter((file, index, all) =>
      all.findIndex((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified) === index,
    ).slice(0, 10);

    if (unique.reduce((sum, file) => sum + file.size, 0) > MAX_BYTES) {
      setError("La transferencia no puede superar 2 GB.");
      return;
    }
    setFiles(unique);
  };

  const generate = async () => {
    if (!files.length) return;
    setBusy(true);
    setProgress(0);
    setError("");
    try {
      const data = await createTransfer(files, setProgress);
      setLink(`${window.location.origin}/transfer/${data.token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el enlace.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#08090b] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(215,173,72,.16),transparent_30%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,.06),transparent_25%)]" />
      <div className="relative mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.28em] text-[#d7ad48]">AURUM LAB</p>
            <h1 className="mt-2 font-display text-3xl sm:text-5xl">AURUM Transfer</h1>
            <p className="mt-2 max-w-xl text-sm text-white/55 sm:text-base">
              Envía modelos y archivos de fabricación con un enlace privado que desaparece después de una descarga.
            </p>
          </div>
          <Sparkles className="hidden size-10 text-[#d7ad48] sm:block" />
        </header>

        {!link ? (
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
            <section
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files); }}
              className="rounded-3xl border border-white/10 bg-white/[.04] p-6 shadow-2xl backdrop-blur-xl sm:p-8"
            >
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="group flex min-h-[300px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#d7ad48]/40 bg-[#d7ad48]/[.04] px-6 text-center transition hover:border-[#d7ad48] hover:bg-[#d7ad48]/[.07]"
              >
                <div className="grid size-16 place-items-center rounded-2xl border border-[#d7ad48]/30 bg-[#d7ad48]/10 text-[#d7ad48] transition group-hover:scale-105">
                  <UploadCloud className="size-8" />
                </div>
                <h2 className="mt-5 text-xl font-semibold">Suelta tus archivos aquí</h2>
                <p className="mt-2 text-sm text-white/50">o selecciónalos desde tu equipo · hasta 10 archivos · 2 GB</p>
                <span className="mt-5 rounded-xl bg-[#d7ad48] px-5 py-2.5 text-sm font-semibold text-black">
                  Seleccionar archivos
                </span>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.currentTarget.value = ""; }}
                />
              </button>

              {files.length > 0 && (
                <div className="mt-5 space-y-2">
                  {files.map((file) => (
                    <div key={file.name + file.size} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                      <FileUp className="size-4 shrink-0 text-[#d7ad48]" />
                      <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                      <span className="text-xs text-white/40">{formatBytes(file.size)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 text-xs text-white/40">
                    <span>{files.length} archivo{files.length === 1 ? "" : "s"}</span>
                    <span>{formatBytes(total)} / 2 GB</span>
                  </div>
                </div>
              )}

              {error && <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}

              <button
                type="button"
                disabled={!files.length || busy}
                onClick={generate}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#d7ad48] px-5 py-3.5 text-sm font-bold text-black transition hover:bg-[#e5c46d] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? `Subiendo… ${progress}%` : <>Crear enlace de un solo uso <ArrowRight className="size-4" /></>}
              </button>
            </section>

            <aside className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/[.04] p-6">
                <ShieldCheck className="size-6 text-[#d7ad48]" />
                <h2 className="mt-4 text-lg font-semibold">Diseñado para archivos de joyería</h2>
                <ul className="mt-4 space-y-3 text-sm text-white/55">
                  <li>• 3DM, STL, 3MF, DXF, PDF, renders y más</li>
                  <li>• Enlace privado, no listado públicamente</li>
                  <li>• Una sola descarga por transferencia</li>
                  <li>• Eliminación del archivo después de descargar</li>
                  <li>• Expiración automática en 24 horas</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-[#d7ad48]/20 bg-[#d7ad48]/[.06] p-6">
                <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#d7ad48]">Conoce AURUM LAB</p>
                <p className="mt-3 text-sm leading-6 text-white/65">
                  Si trabajas con joyería, aquí también puedes visualizar modelos, preparar fabricación y conectar el trabajo entre talleres.
                </p>
                <a href="/auth?conoce=plataforma" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#d7ad48]">
                  Conoce la plataforma <ArrowRight className="size-4" />
                </a>
              </div>
            </aside>
          </div>
        ) : (
          <section className="mx-auto mt-12 max-w-2xl rounded-3xl border border-[#d7ad48]/25 bg-white/[.04] p-7 text-center shadow-2xl">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#d7ad48]/10 text-[#d7ad48]">
              <Check className="size-8" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold">Transferencia lista</h2>
            <p className="mt-2 text-sm text-white/50">Este enlace se puede descargar una sola vez y después desaparece.</p>
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-2 text-left">
              <Link2 className="ml-2 size-4 shrink-0 text-[#d7ad48]" />
              <span className="min-w-0 flex-1 truncate px-2 text-sm text-white/70">{link}</span>
              <button type="button" onClick={copy} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15">
                {copied ? "Copiado" : <><Copy className="mr-1 inline size-3.5" /> Copiar</>}
              </button>
            </div>
            <p className="mt-5 text-xs text-white/35">Comparte el enlace por WhatsApp, correo o mensajería.</p>
            <a href="/aurum-render-public" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#d7ad48] px-5 py-3 text-sm font-bold text-black">
              Ahora prueba AURUM Render <ArrowRight className="size-4" />
            </a>
          </section>
        )}
      </div>
    </main>
  );
}
