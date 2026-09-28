import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, FileArchive, Loader2, ShieldCheck, Sparkles, Zap } from "lucide-react";

export const Route = createFileRoute("/transfer/$token")({
  head: () => ({
    meta: [
      { title: "Descargar transferencia — AURUM Lab" },
      { name: "description", content: "Descarga segura de una transferencia AURUM de un solo uso." },
    ],
  }),
  component: TransferDownloadPage,
});

const SUPABASE_URL = (import.meta.env as { VITE_SUPABASE_URL?: string }).VITE_SUPABASE_URL ?? "";
const SUPABASE_KEY = (import.meta.env as { VITE_SUPABASE_PUBLISHABLE_KEY?: string }).VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

type TransferInfo = {
  file_count: number;
  total_bytes: number;
  expires_at: string;
  files: Array<{ name: string; size: number; type: string }>;
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function TransferDownloadPage() {
  const { token } = Route.useParams();
  const [info, setInfo] = useState<TransferInfo | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "downloading" | "done" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`${SUPABASE_URL}/functions/v1/aurum-transfer-download?token=${encodeURIComponent(token)}`, {
      headers: { apikey: SUPABASE_KEY },
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Transferencia no disponible.");
        if (!cancelled) { setInfo(data); setState("ready"); }
      })
      .catch((error) => {
        if (!cancelled) { setMessage(error instanceof Error ? error.message : "Transferencia no disponible."); setState("error"); }
      });
    return () => { cancelled = true; };
  }, [token]);

  const [links, setLinks] = useState<Array<{ name: string; size: number; url: string }>>([]);
  const [clicked, setClicked] = useState<Set<string>>(new Set());

  const download = async () => {
    setState("downloading");
    setMessage("");
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/aurum-transfer-download`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo descargar la transferencia.");
      const files = (data.files ?? []) as Array<{ name: string; size: number; url: string }>;
      setLinks(files);
      setState("done");
      // Descarga directa del primer archivo (el navegador la gestiona sin cargarla en memoria).
      if (files[0]) { window.location.href = files[0].url; setClicked(new Set([files[0].url])); }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo descargar.");
      setState("error");
    }
  };

  const finish = async () => {
    await fetch(`${SUPABASE_URL}/functions/v1/aurum-transfer-download`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "finish" }),
    }).catch(() => undefined);
    setLinks([]);
  };

  return (
    <main className="min-h-screen bg-[#08090b] px-5 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <header className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[.28em] text-[#d7ad48]">AURUM LAB</p>
          <h1 className="mt-3 font-display text-4xl">AURUM Transfer</h1>
        </header>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/[.04] p-7 text-center shadow-2xl backdrop-blur-xl sm:p-10">
          {state === "loading" && <Loader2 className="mx-auto size-10 animate-spin text-[#d7ad48]" />}
          {state === "ready" && info && (
            <>
              <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#d7ad48]/10 text-[#d7ad48]">
                <FileArchive className="size-8" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold">Tienes una transferencia</h2>
              <p className="mt-2 text-sm text-white/50">{info.file_count} archivo{info.file_count === 1 ? "" : "s"} · {formatBytes(info.total_bytes)}</p>
              <div className="mt-6 space-y-2 text-left">
                {info.files.map((file) => (
                  <div key={file.name} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                    <span className="text-xs text-white/35">{formatBytes(file.size)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/40">
                <ShieldCheck className="size-4 text-[#d7ad48]" /> Enlace privado · una sola descarga
              </div>
              <button type="button" onClick={download} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#d7ad48] px-7 py-3.5 text-sm font-bold text-black hover:bg-[#e5c46d]">
                <Download className="size-4" /> Descargar transferencia
              </button>
            </>
          )}

          {state === "downloading" && (
            <>
              <Loader2 className="mx-auto size-10 animate-spin text-[#d7ad48]" />
              <h2 className="mt-5 text-xl font-semibold">Preparando tus archivos…</h2>
              <p className="mt-2 text-sm text-white/45">El enlace quedará consumido al iniciar la descarga.</p>
            </>
          )}

          {state === "done" && (
            <>
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#d7ad48]/10 text-[#d7ad48]"><Zap className="size-8" /></div>
              <h2 className="mt-5 text-2xl font-semibold">{links.length ? "Tus archivos están listos" : "Transferencia finalizada"}</h2>
              <p className="mt-2 text-sm text-white/50">
                {links.length
                  ? "El enlace ya fue consumido. Descarga cada archivo y pulsa Finalizar para eliminarlos."
                  : "Los archivos fueron eliminados y el enlace dejó de estar disponible."}
              </p>
              {links.length > 0 && (
                <>
                  <div className="mt-6 space-y-2 text-left">
                    {links.map((file) => (
                      <a key={file.url} href={file.url} onClick={() => setClicked((c) => new Set(c).add(file.url))}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 hover:border-[#d7ad48]/40">
                        <Download className="size-4 text-[#d7ad48]" />
                        <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                        <span className="text-xs text-white/35">{clicked.has(file.url) ? "Descargando…" : formatBytes(file.size)}</span>
                      </a>
                    ))}
                  </div>
                  <button type="button" onClick={finish} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#d7ad48] px-6 py-3 text-sm font-bold text-black hover:bg-[#e5c46d]">
                    Finalizar y eliminar archivos
                  </button>
                  <p className="mt-3 text-xs text-white/35">Si no finalizas, se eliminarán automáticamente en unas horas.</p>
                </>
              )}
              <div>
                <Link to="/transfer" className="mt-7 inline-flex items-center gap-2 rounded-xl border border-[#d7ad48]/30 px-5 py-3 text-sm font-semibold text-[#d7ad48]">
                  Crear mi propia transferencia
                </Link>
              </div>
            </>
          )}

          {state === "error" && (
            <>
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-red-400/10 text-red-300"><Sparkles className="size-8" /></div>
              <h2 className="mt-5 text-2xl font-semibold">Transferencia no disponible</h2>
              <p className="mt-2 text-sm text-white/50">{message}</p>
              <Link to="/transfer" className="mt-7 inline-flex rounded-xl bg-[#d7ad48] px-5 py-3 text-sm font-bold text-black">
                Crear una transferencia
              </Link>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
