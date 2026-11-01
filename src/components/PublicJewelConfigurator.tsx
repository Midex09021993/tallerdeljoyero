import { useEffect, useRef, useState } from "react";
import { Gem, RotateCcw, Maximize, Minimize } from "lucide-react";
import { supabasePublic } from "@/integrations/supabase/client";
import { PublicCatalogViewer } from "@/components/PublicCatalogViewer";
import { GEMAS, MATERIALES } from "@/lib/aurum/catalog";

type Props = { slug?: string; producto?: string; sharedModelUrl?: string; sharedModelName?: string; localFile?: File };
const metales = [
  { id: "oro-amarillo", label: "Oro amarillo", color: 0xe5b377, materialId: "oro18a_ijewel_premium" },
  { id: "oro-blanco", label: "Oro blanco", color: 0xc2c2c3, materialId: "oro18b_ijewel_premium" },
  { id: "oro-rosa", label: "Oro rosa", color: 0xf2af83, materialId: "oro18r_ijewel_premium" },
  { id: "plata", label: "Plata", color: 0xe0e2e4, materialId: "plata925_pulida" },
] as const;
// Keep the public viewer's original five gemstone choices; do not expose
// the rest of the internal AURUM gemstone catalog in this configurator.
const gemasPublicas = [
  { id: "diamante_natural", label: "Diamante", color: 0xeaf4ff },
  { id: "esmeralda_1", label: "Esmeralda", color: 0x138b54 },
  { id: "rubi_natural", label: "Rubí", color: 0xb91c3b },
  { id: "zafiro_azul", label: "Zafiro", color: 0x2858bd },
  { id: "amatista_natural", label: "Amatista", color: 0x8952c8 },
] as const;

const colorHex = (color: number) => "#" + color.toString(16).padStart(6, "0");

export function PublicJewelConfigurator({ slug, producto, sharedModelUrl, sharedModelName, localFile }: Props) {
  const [metalId, setMetalId] = useState<string>("oro-amarillo");
  const [gemaId, setGemaId] = useState<string>("diamante_natural");
  const [activeCategory, setActiveCategory] = useState<"metal" | "gem">("metal");
  const [showMaterialOptions, setShowMaterialOptions] = useState(true);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [modelName, setModelName] = useState(sharedModelName || "modelo.3dm");
  const [status, setStatus] = useState("Preparando modelo 3D…");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [aplicacionEstado, setAplicacionEstado] = useState<string>("");
  const [localModelUrl, setLocalModelUrl] = useState<string | null>(null);
  const viewerModelUrl = localFile ? localModelUrl : modelUrl;
  const [loadedModelReady, setLoadedModelReady] = useState(false);
  const visorRef = useRef<HTMLDivElement>(null);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);

  useEffect(() => {
    const actualizarPantallaCompleta = () => setPantallaCompleta(document.fullscreenElement === visorRef.current);
    document.addEventListener("fullscreenchange", actualizarPantallaCompleta);
    return () => document.removeEventListener("fullscreenchange", actualizarPantallaCompleta);
  }, []);

  // Diagnóstico opcional de fluidez del visor público. Solo se activa con ?aurumPerf=1.
  // No cambia DPR, resolución, materiales, iluminación ni el motor de renderizado.
  useEffect(() => {
    if (typeof window === "undefined" || new URLSearchParams(window.location.search).get("aurumPerf") !== "1") return;

    let rafId = 0;
    let previousFrame = 0;
    let windowStartedAt = 0;
    let frames = 0;
    let intervalsTotal = 0;
    let over33ms = 0;
    let over50ms = 0;

    const sampleFrame = (now: number) => {
      if (document.visibilityState !== "visible") {
        previousFrame = 0;
        windowStartedAt = now;
        frames = 0;
        intervalsTotal = 0;
        over33ms = 0;
        over50ms = 0;
        rafId = window.requestAnimationFrame(sampleFrame);
        return;
      }

      if (previousFrame > 0) {
        const interval = now - previousFrame;
        intervalsTotal += interval;
        frames += 1;
        if (interval > 33.4) over33ms += 1;
        if (interval > 50) over50ms += 1;
      } else {
        windowStartedAt = now;
      }
      previousFrame = now;

      if (now - windowStartedAt >= 5000 && frames > 0) {
        console.info("[PUBLIC VIEWER PERF] Cadencia RAF (no mide por separado GPU/BVH)", {
          windowMs: Math.round(now - windowStartedAt),
          frames,
          averageFrameMs: Number((intervalsTotal / frames).toFixed(2)),
          averageFps: Number((1000 * frames / intervalsTotal).toFixed(1)),
          intervalsOver33ms: over33ms,
          intervalsOver50ms: over50ms,
          note: "Mide la cadencia del hilo principal; no modifica la resolución."
        });
        windowStartedAt = now;
        frames = 0;
        intervalsTotal = 0;
        over33ms = 0;
        over50ms = 0;
      }
      rafId = window.requestAnimationFrame(sampleFrame);
    };

    rafId = window.requestAnimationFrame(sampleFrame);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  const alternarPantallaCompleta = async () => {
    const visor = visorRef.current;
    if (!visor) return;
    try {
      if (document.fullscreenElement === visor) await document.exitFullscreen();
      else {
        if (document.fullscreenElement) await document.exitFullscreen();
        await visor.requestFullscreen();
      }
    } catch (error) {
      console.error("No se pudo cambiar el modo de pantalla completa del visor 3D.", error);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadModelReference = async () => {
      setModelUrl(null);
      setLoadError(null);
      if (localFile) {
        setModelName(localFile.name);
        setStatus("");
        return;
      }
      if (sharedModelUrl) {
        setModelName(sharedModelName || "joya-compartida.glb");
        setModelUrl(sharedModelUrl);
        setStatus("");
        return;
      }
      if (!slug || !producto) {
        setLoadError("No se ha indicado un modelo válido para visualizar.");
        setStatus("");
        return;
      }
      setStatus("Buscando el modelo 3D del catálogo…");
      try {
        const { data, error } = await supabasePublic.functions.invoke("catalogo-modelo-3d-publico", { body: { slug, producto } });
        if (error || !data?.ok || typeof data.url !== "string") throw new Error(data?.error || error?.message || "No hay modelo 3D disponible para este producto.");
        if (cancelled) return;
        setModelName(typeof data.nombre === "string" && /\.(glb|3dm)$/i.test(data.nombre) ? data.nombre : "modelo.glb");
        setModelUrl(data.url);
        setStatus("");
      } catch (cause) {
        if (!cancelled) {
          setLoadError(cause instanceof Error ? cause.message : "No se pudo preparar el modelo 3D.");
          setStatus("");
        }
      }
    };
    void loadModelReference();
    return () => { cancelled = true; };
  }, [slug, producto, sharedModelUrl, sharedModelName, localFile]);

  const selectedMetal = metales.find((item) => item.id === metalId) ?? metales[0];
  const selectedGem = gemasPublicas.find((item) => item.id === gemaId) ?? gemasPublicas[0];
  const aurumMaterial = MATERIALES.find((item) => item.id === selectedMetal.materialId) ?? MATERIALES.find((item) => item.id === "oro18a_pulido")!;
  const aurumGem = GEMAS.find((item) => item.id === selectedGem.id) ?? GEMAS.find((item) => item.id === "diamante_natural")!;

  useEffect(() => {
    if (!localFile) {
      setLocalModelUrl(null);
      return;
    }
    const url = URL.createObjectURL(localFile);
    setLocalModelUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [localFile]);

  useEffect(() => {
    setLoadedModelReady(false);
    setAplicacionEstado("");
    setLoadError(null);
    if (localFile || modelUrl) setStatus("Preparando visor 3D…");
  }, [modelUrl, localFile]);

  const handleMetalSelect = (id: string) => {
    if (id === metalId) return;
    setMetalId(id);
  };

  const handleGemSelect = (id: string) => {
    if (id === gemaId || !gemasPublicas.some((gem) => gem.id === id)) return;
    setGemaId(id);
  };

  const isReady = Boolean(viewerModelUrl && loadedModelReady && !loadError && !status);
  const displayName = (sharedModelName || modelName || "Joya compartida")
    .replace(/\.(glb|gltf|3dm|obj|stl|fbx)$/i, "")
    .replace(/^[0-9a-f]{8}-[0-9a-f-]{27,}[-_]?/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\\s+/g, " ")
    .trim() || "Joya compartida";

  return (
    <section className="mx-auto w-full min-w-0 overflow-hidden rounded-xl border border-[#e8e1d5] bg-white shadow-[0_16px_44px_-30px_rgba(49,39,24,.28)] sm:mt-4 sm:rounded-2xl md:mt-0 lg:mx-auto lg:flex lg:h-[min(76vh,680px)] lg:min-h-[540px] lg:max-h-[680px] lg:flex-col lg:rounded-2xl lg:max-w-[1440px] 2xl:h-[min(84vh,900px)] 2xl:min-h-[680px] 2xl:max-h-[900px] 2xl:max-w-[1720px] 2xl:w-[calc(100vw-64px)]">
      <header className="flex shrink-0 flex-col items-stretch justify-between gap-2 border-b border-[#eee9e0] bg-[linear-gradient(110deg,#fffefa_0%,#ffffff_58%,#fbf7ef_100%)] px-3.5 py-2.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-3 [@media(max-height:800px)]:py-1.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#eadfc9] bg-[#f8f1e3] text-[#92702f]">
              <Gem className="size-[18px]" strokeWidth={1.7} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[.24em] text-[#806027]">AURUM LAB</p>
              <p className="mt-0.5 text-[9px] font-medium tracking-[.08em] text-[#9a907f]">EL ARTE DE CREAR · LA INTELIGENCIA DE GESTIONAR</p>
            </div>
          </div>
          <h2 className="mt-2 truncate font-display text-lg leading-tight tracking-[-.025em] text-[#28231d] sm:text-xl lg:text-2xl [@media(max-height:800px)]:text-lg">Configura tu joya en 3D</h2>

        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className="inline-flex rounded-full border border-[#e9e2d7] px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[.1em] text-[#81786c] sm:px-3 sm:text-[10px]">Solo visualización</span>
          <button type="button" onClick={() => { setMetalId("oro-amarillo"); setGemaId("diamante_natural"); }} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#e4ddd1] bg-white px-3.5 py-2 text-xs font-semibold text-[#41382d] shadow-sm transition hover:border-[#b28b45] hover:bg-[#fbf8f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b28b45] focus-visible:ring-offset-2"><RotateCcw className="size-3.5" /> Restablecer</button>
        </div>
      </header>
      <div className="isolate grid min-w-0 grid-cols-1 lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)] 2xl:grid-cols-[minmax(0,1fr)]">
        <div ref={visorRef} className={"relative z-0 h-[clamp(340px,56svh,500px)] min-h-[340px] min-w-0 overflow-hidden bg-white sm:h-[clamp(400px,62vh,600px)] sm:min-h-[400px] lg:h-full lg:min-h-0 2xl:min-h-[680px] " + (pantallaCompleta ? "h-screen min-h-0 w-screen sm:h-screen sm:min-h-0 2xl:h-screen 2xl:min-h-0" : "")}>
          <div className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-full border border-[#e8e3db] bg-white/90 p-1 shadow-sm backdrop-blur sm:right-3 sm:top-3 sm:gap-1.5 sm:p-1.5" aria-label="Controles informativos del visor">
            <span title="Iluminación HDR" className="rounded-full border border-[#e8e3db] px-2 py-1 text-[9px] font-medium text-[#81786c] sm:text-[10px]">HDRI</span>
            <span title="Materiales PBR" className="rounded-full border border-[#e8e3db] px-2 py-1 text-[9px] font-medium text-[#81786c] sm:text-[10px]">PBR</span>
            <span title="Referencia de resolución 4K" className="rounded-full border border-[#e8e3db] px-2 py-1 text-[9px] font-medium text-[#81786c] sm:text-[10px]">4K</span>
            <button type="button" onClick={() => void alternarPantallaCompleta()} aria-label={pantallaCompleta ? "Salir de pantalla completa" : "Ver en pantalla completa"} title={pantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"} className="grid size-7 place-items-center rounded-full bg-[#171717] text-white transition hover:bg-[#3a3021] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b28b45] focus-visible:ring-offset-2 sm:size-8">
              {pantallaCompleta ? <Minimize className="size-3.5 sm:size-4" /> : <Maximize className="size-3.5 sm:size-4" />}
            </button>
          </div>
          {viewerModelUrl && <div className="absolute inset-0 cursor-grab active:cursor-grabbing"><PublicCatalogViewer modelUrl={viewerModelUrl} modelName={modelName || localFile?.name || "modelo.glb"} materialId={aurumMaterial.id} gemId={aurumGem.id} onReady={() => { setLoadedModelReady(true); setStatus(""); setAplicacionEstado("Visor 3D listo."); }} onError={(message) => { setLoadError(message); setStatus(""); }} /></div>}
          {(!viewerModelUrl || loadError || status || !loadedModelReady) && <div className={"absolute inset-0 z-50 grid place-items-center p-6 text-center transition-opacity " + (isReady ? "pointer-events-none opacity-0" : "bg-white/90 backdrop-blur-[2px]")}>
            <div className="max-w-sm">
              {loadError ? <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full border border-[#edd6c7] bg-[#fff6f0] text-[#a85b2d]"><span className="text-lg">!</span></div> : <div className="mx-auto mb-3 size-7 animate-spin rounded-full border-2 border-[#e9dfca] border-t-[#a7833d]" />}
              <p className={"text-sm font-semibold " + (loadError ? "text-[#984a28]" : "text-[#554c40]")}>{loadError || status || "Preparando el visor 3D…"}</p>
              {!loadError && <p className="mt-1 text-xs text-[#8a8175]">Estamos preparando la experiencia interactiva.</p>}
            </div>
          </div>}
          <div className="absolute bottom-4 left-1/2 z-30 flex w-[min(92%,420px)] -translate-x-1/2 flex-col items-center gap-2.5 sm:bottom-5 sm:gap-3" aria-label="Selector de materiales de la joya">
            <div className={"overflow-hidden transition-all duration-300 ease-out " + (showMaterialOptions ? "max-h-20 translate-y-0 opacity-100" : "pointer-events-none max-h-0 -translate-y-2 opacity-0")} aria-hidden={!showMaterialOptions}>
            <div className="flex max-w-full items-center justify-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 py-2 shadow-[0_8px_28px_rgba(35,29,20,.12)] backdrop-blur-md sm:gap-3 sm:px-4">
              {(activeCategory === "metal" ? metales : gemasPublicas).map((item) => {
                const selected = activeCategory === "metal" ? metalId === item.id : gemaId === item.id;
                const swatch = activeCategory === "metal"
                  ? { background: `linear-gradient(135deg, #ffffff 0%, ${colorHex(item.color)} 42%, #6f6250 100%)` }
                  : { background: `radial-gradient(circle at 32% 28%, #ffffff 0%, ${colorHex(item.color)} 38%, #25212a 100%)` };
                return <button
                  key={item.id}
                  type="button"
                  aria-label={`Seleccionar ${item.label}`}
                  aria-pressed={selected}
                  title={item.label}
                  onClick={() => { activeCategory === "metal" ? handleMetalSelect(item.id) : handleGemSelect(item.id); setShowMaterialOptions(false); }}
                  className={"grid size-10 shrink-0 place-items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b28b45] focus-visible:ring-offset-2 sm:size-11 " + (selected ? "ring-2 ring-[#8b9cf4] ring-offset-2 ring-offset-white" : "opacity-90 hover:scale-105 hover:opacity-100")}
                >
                  <span className="size-8 rounded-full border border-black/10 shadow-[inset_0_1px_2px_rgba(255,255,255,.7),0_2px_5px_rgba(0,0,0,.18)] sm:size-9" style={swatch} />
                </button>;
              })}
            </div>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-white/80 bg-white/90 p-1 shadow-[0_8px_28px_rgba(35,29,20,.10)] backdrop-blur-md">
              <button type="button" aria-pressed={activeCategory === "metal"} onClick={() => { setActiveCategory("metal"); setShowMaterialOptions(true); }} className={"min-w-[76px] rounded-full px-4 py-2 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b28b45] " + (activeCategory === "metal" ? "bg-white text-[#29251f] shadow-sm" : "text-[#77716a] hover:text-[#29251f]")}>Metal</button>
              <button type="button" aria-pressed={activeCategory === "gem"} onClick={() => { setActiveCategory("gem"); setShowMaterialOptions(true); }} className={"min-w-[76px] rounded-full px-4 py-2 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b28b45] " + (activeCategory === "gem" ? "bg-white text-[#29251f] shadow-sm" : "text-[#77716a] hover:text-[#29251f]")}>Gem</button>
            </div>
            
          </div>
          <div className="pointer-events-none absolute bottom-2 left-2 z-10 max-w-[calc(100%-1rem)] rounded-full border border-white/80 bg-white/85 px-2.5 py-1.5 text-[9px] text-[#766d61] shadow-sm backdrop-blur sm:bottom-3 sm:left-3 sm:px-3 sm:text-[10px]">Toca y arrastra para girar · Pellizca para acercar</div>
        </div>

      </div>
      <footer className="hidden border-t border-[#eee9e0] bg-[#fdfcf9] px-4 py-2 text-[10px] leading-4 text-[#8a8175] md:flex md:items-center md:justify-between">
        <span>Taller del Joyero · Visualizador independiente</span>
        <span>Los cambios son una vista previa y no modifican el archivo original.</span>
      </footer>
    </section>
  );
}
