import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Box, Camera, Download, FolderOpen, Layers3, LoaderCircle, Maximize2, RotateCcw, Sun, Upload, X } from "lucide-react";
import { Link } from "@tanstack/react-router";

type ThreepipeViewer = {
  load: (url: string, options?: { autoCenter?: boolean; autoScale?: boolean }) => Promise<unknown>;
  dispose: () => void;
};

const THREEPIPE_URL = "https://unpkg.com/threepipe@0.6.0/dist/index.mjs";

export default function AurumStudioShell() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<ThreepipeViewer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [status, setStatus] = useState("Preparando visor 3D…");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  const [engineReady, setEngineReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let activeViewer: ThreepipeViewer | null = null;

    async function initialize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        setStatus("Cargando Threepipe 0.6.0…");
        // Keep Threepipe isolated from the existing Three.js/AURUM RENDER bundle.
        const module = await import(/* @vite-ignore */ THREEPIPE_URL) as {
          ThreeViewer: new (options: { canvas: HTMLCanvasElement }) => ThreepipeViewer;
        };
        if (cancelled) return;
        activeViewer = new module.ThreeViewer({ canvas });
        viewerRef.current = activeViewer;
        setEngineReady(true);
        setStatus("Visor listo · Importa un modelo GLB");
      } catch (cause) {
        console.error("[AURUM STUDIO] No se pudo inicializar Threepipe", cause);
        if (!cancelled) {
          setError("No se pudo cargar Threepipe. Comprueba la conexión y que el CDN permita cargar módulos.");
          setStatus("No se pudo iniciar el motor");
        }
      }
    }

    void initialize();
    return () => {
      cancelled = true;
      activeViewer?.dispose();
      if (viewerRef.current === activeViewer) viewerRef.current = null;
      setEngineReady(false);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    };
  }, []);

  async function importModel(file?: File) {
    if (!file || !viewerRef.current) return;
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["glb", "gltf", "3dm"].includes(extension)) {
      setError("Formato no compatible. Selecciona un archivo .3DM, .GLB o .GLTF.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus(extension === "3dm" ? "Preparando archivo Rhino…" : "Cargando modelo…");
    let url: string | null = null;
    try {
      let modelBlob: Blob = file;
      if (extension === "3dm") {
        // Load the shared AURUM CAD pipeline only when a Rhino file is selected.
        // The conversion produces an in-memory GLB; STUDIO keeps its own renderer.
        const { prepareAurumStudio3dm } = await import("@/lib/aurum-studio/import-3dm");
        modelBlob = await prepareAurumStudio3dm(file, (message) => setStatus(message));
      }
      if (!viewerRef.current) throw new Error("El visor se cerró antes de terminar la importación.");
      url = URL.createObjectURL(modelBlob);
      await viewerRef.current.load(url, { autoCenter: true, autoScale: true });
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = url;
      url = null;
      setFileName(file.name);
      setStatus(extension === "3dm" ? "3DM procesado · GLB temporal cargado" : "Modelo cargado correctamente");
    } catch (cause) {
      console.error("[AURUM STUDIO] Error importando modelo", cause);
      setError(cause instanceof Error ? cause.message : "No se pudo importar el modelo. Verifica el archivo e inténtalo nuevamente.");
      setStatus("Error al importar");
    } finally {
      if (url) URL.revokeObjectURL(url);
      setBusy(false);
    }
  }
  function capture() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const anchor = document.createElement("a");
      anchor.download = "aurum-studio-captura.png";
      anchor.href = canvas.toDataURL("image/png");
      anchor.click();
    } catch {
      setError("El navegador no permitió capturar el canvas. Comprueba la política de origen del contenido cargado.");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#11151c] text-white">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#171c25] px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/herramientas" aria-label="Volver a Herramientas internas" className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 text-white/65 transition hover:bg-white/5 hover:text-white">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#c7a45b]/30 bg-[#c7a45b]/10 text-[#d8b66c]">
            <Box className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-wide sm:text-base">AURUM STUDIO</h1>
            <p className="text-[10px] uppercase tracking-[.18em] text-[#c7a45b]">Jewelry 3D workspace · Prototype 01</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-white/45 md:inline">Threepipe 0.6.0 · Modo aislado</span>
          <button type="button" onClick={capture} disabled={!engineReady} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-medium text-white/75 transition hover:bg-white/5 disabled:opacity-40">
            <Camera className="size-4" /><span className="hidden sm:inline">Capturar</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-16 shrink-0 flex-col items-center gap-3 border-r border-white/10 bg-[#171c25] py-4 sm:flex">
          <button title="Importar modelo" onClick={() => fileInputRef.current?.click()} className="grid size-10 place-items-center rounded-xl bg-[#c7a45b] text-[#17130b] transition hover:bg-[#d8b66c]"><Upload className="size-5"/></button>
          <span className="h-px w-8 bg-white/10"/>
          <span title="Escena" className="grid size-10 place-items-center rounded-xl text-[#d8b66c]"><Layers3 className="size-5"/></span>
          <span title="Iluminación" className="grid size-10 place-items-center rounded-xl text-white/40"><Sun className="size-5"/></span>
          <span title="Cámara" className="grid size-10 place-items-center rounded-xl text-white/40"><Camera className="size-5"/></span>
        </aside>

        <section className="relative flex min-w-0 flex-1 flex-col bg-[#e9eaec]">
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-black/10 bg-[#f6f6f5] px-4 text-[11px] text-[#555b64]">
            <span className="font-semibold tracking-[.12em]">VIEWPORT 3D · PERSPECTIVE</span>
            <span className="flex items-center gap-2"><span className={engineReady ? "size-2 rounded-full bg-emerald-500" : "size-2 rounded-full bg-amber-500"}/>{engineReady ? "MOTOR ACTIVO" : "INICIALIZANDO"}</span>
          </div>
          <div className="relative min-h-0 flex-1">
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none outline-none" />
            {!fileName && !error && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                <div className="max-w-sm text-center text-[#454b55]">
                  <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl border border-black/10 bg-white/65 shadow-sm"><Box className="size-8 text-[#a18449]"/></div>
                  <h2 className="text-lg font-semibold">Tu espacio de diseño 3D</h2>
                  <p className="mt-2 text-sm text-[#68707b]">Importa un modelo Rhino 3DM, GLB o GLTF para comenzar a explorar AURUM STUDIO.</p>
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!engineReady} className="pointer-events-auto mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[#b99652] px-5 text-sm font-semibold text-[#17130b] shadow-sm transition hover:bg-[#c9aa6c] disabled:opacity-50"><FolderOpen className="size-4"/> Importar modelo</button>
                </div>
              </div>
            )}
            {busy && <div className="absolute inset-0 grid place-items-center bg-black/25 backdrop-blur-[2px]"><div className="flex items-center gap-3 rounded-xl bg-[#171c25] px-4 py-3 text-sm"><LoaderCircle className="size-4 animate-spin text-[#d8b66c]"/> Cargando modelo…</div></div>}
          </div>
          <div className="flex h-9 shrink-0 items-center justify-between border-t border-black/10 bg-[#f6f6f5] px-4 text-[11px] text-[#626873]">
            <span className="truncate">{fileName || status}</span>
            <span className="hidden sm:inline">Orbit · Zoom · Pan</span>
          </div>
        </section>

        <aside className="hidden w-64 shrink-0 flex-col border-l border-white/10 bg-[#1b212b] lg:flex">
          <div className="border-b border-white/10 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#c7a45b]">Inspector</p>
            <h2 className="mt-1 text-sm font-semibold">Propiedades</h2>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-white/80">Proyecto</p>
              <div className="rounded-lg border border-white/10 bg-white/[.03] p-3">
                <p className="truncate text-xs text-white/75">{fileName || "Sin modelo cargado"}</p>
                <p className="mt-1 text-[10px] text-white/35">3DM / GLB / GLTF · Local</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-white/80">Motor 3D</p>
              <div className="rounded-lg border border-white/10 bg-white/[.03] p-3 text-xs text-white/65">Threepipe · {engineReady ? "Conectado" : "Conectando…"}</div>
            </div>
            <div className="rounded-lg border border-[#c7a45b]/20 bg-[#c7a45b]/5 p-3">
              <p className="text-xs font-semibold text-[#d8b66c]">Siguiente evolución</p>
              <p className="mt-1 text-[11px] leading-5 text-white/55">Árbol de escena, materiales, iluminación HDRI y presets de fotografía.</p>
            </div>
          </div>
          <div className="mt-auto border-t border-white/10 p-4 text-[10px] leading-4 text-white/35">Entorno experimental independiente. No comparte recursos con AURUM RENDER.</div>
        </aside>
      </div>

      {error && <div role="alert" className="flex shrink-0 items-center gap-3 border-t border-red-400/20 bg-red-950/70 px-4 py-3 text-xs text-red-100"><X className="size-4 shrink-0"/><span className="flex-1">{error}</span><button onClick={() => setError("")} aria-label="Cerrar aviso"><X className="size-4"/></button></div>}
      <input ref={fileInputRef} type="file" accept=".3dm,.glb,.gltf,model/gltf-binary,model/gltf+json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importModel(file); event.currentTarget.value = ""; }}/>
    </div>
  );
}
