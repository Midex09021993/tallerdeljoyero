import { useEffect, useRef, useState } from "react";
import { Gem, RotateCcw, Maximize, Minimize } from "lucide-react";
import { supabasePublic } from "@/integrations/supabase/client";
import { AurumRender } from "@/components/AurumRender";
import type { AurumCatalogApi } from "@/lib/aurum/api";
import { GEMAS, MATERIALES } from "@/lib/aurum/catalog";

type Props = { slug?: string; producto?: string; sharedModelUrl?: string; sharedModelName?: string; localFile?: File };
const metales = [
  { id: "oro-amarillo", label: "Oro amarillo", color: 0xd5a63d, materialId: "oro18a_pulido" },
  { id: "oro-blanco", label: "Oro blanco", color: 0xd7d9dc, materialId: "oro18b_rodinado" },
  { id: "oro-rosa", label: "Oro rosa", color: 0xc98576, materialId: "oro18r_pulido" },
  { id: "plata", label: "Plata", color: 0xe0e2e4, materialId: "plata925_pulida" },
] as const;
const gemas = [
  { id: "diamante", label: "Diamante", color: 0xeaf4ff, gemId: "diamante_natural" },
  { id: "esmeralda", label: "Esmeralda", color: 0x138b54, gemId: "esmeralda_1" },
  { id: "rubi", label: "Rubí", color: 0xb91c3b, gemId: "rubi_natural" },
  { id: "zafiro", label: "Zafiro", color: 0x2858bd, gemId: "zafiro_azul" },
  { id: "amatista", label: "Amatista", color: 0x8952c8, gemId: "amatista_natural" },
] as const;

export function PublicJewelConfigurator({ slug, producto, sharedModelUrl, sharedModelName, localFile }: Props) {
  const [metalId, setMetalId] = useState<string>("oro-amarillo");
  const [gemaId, setGemaId] = useState<string>("diamante");
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [modelName, setModelName] = useState(sharedModelName || "modelo.3dm");
  const [status, setStatus] = useState("Preparando modelo 3D…");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [catalogApi, setCatalogApi] = useState<AurumCatalogApi | null>(null);
  const [loadedModelUrl, setLoadedModelUrl] = useState<string | null>(null);
  const [downloadedModel, setDownloadedModel] = useState<{ key: string; file: File } | null>(null);
  const modelKey = localFile ? `local:${localFile.name}:${localFile.size}:${localFile.lastModified}` : modelUrl;
  const [aplicacionEstado, setAplicacionEstado] = useState<string>("");
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
      setLoadedModelUrl(null);
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
  const selectedGem = gemas.find((item) => item.id === gemaId) ?? gemas[0];
  const aurumMaterial = MATERIALES.find((item) => item.id === selectedMetal.materialId) ?? MATERIALES.find((item) => item.id === "oro18a_pulido")!;
  const aurumGem = GEMAS.find((item) => item.id === selectedGem.gemId) ?? GEMAS.find((item) => item.id === "diamante_natural")!;

  // Descarga el GLB tan pronto está disponible, en paralelo con la inicialización del visor.
  // Así no esperamos a que el motor termine de montar para empezar la transferencia.
  useEffect(() => {
    let cancelled = false;
    setDownloadedModel(null);
    setLoadedModelUrl(null);
    if (!modelKey || (!localFile && !modelUrl)) return;

    const downloadModel = async () => {
      try {
        if (localFile) {
          setDownloadedModel({ key: modelKey, file: localFile });
          return;
        }
        setStatus("Descargando modelo 3D…");
        const response = await fetch(modelUrl!);
        if (!response.ok) throw new Error("No se pudo descargar el modelo 3D del catálogo.");
        const blob = await response.blob();
        if (cancelled) return;
        const file = new File([blob], modelName || "modelo.glb", { type: blob.type || "model/gltf-binary" });
        setDownloadedModel({ key: modelKey, file });
        setStatus("Modelo descargado. Preparando el visor…");
      } catch (cause) {
        if (!cancelled) {
          setLoadError(cause instanceof Error ? cause.message : "No se pudo descargar el modelo 3D.");
          setStatus("");
        }
      }
    };
    void downloadModel();
    return () => { cancelled = true; };
  }, [modelUrl, modelName, localFile, modelKey]);

  // La carga del modelo en el motor comienza cuando están listos tanto el archivo como su API.
  useEffect(() => {
    let cancelled = false;
    if (!catalogApi?.cargar || !downloadedModel || downloadedModel.key !== modelKey || loadedModelUrl === modelKey) return;

    const loadIntoAurum = async () => {
      setStatus("Preparando el visor interactivo…");
      setLoadError(null);
      try {
        await catalogApi.cargar?.(downloadedModel.file, (progress: string) => {
          if (!cancelled && progress) setStatus(progress);
        });
        if (cancelled) return;
        setLoadedModelUrl(modelKey);
        setStatus("");
      } catch (cause) {
        if (!cancelled) {
          setLoadError(cause instanceof Error ? cause.message : "No se pudo abrir el modelo 3D.");
          setStatus("");
        }
      }
    };
    void loadIntoAurum();
    return () => { cancelled = true; };
  }, [catalogApi, downloadedModel, modelKey, loadedModelUrl]);

  const modeloInicializadoRef = useRef<{ key: string; api: AurumCatalogApi } | null>(null);

  useEffect(() => {
    if (!catalogApi || !modelKey || loadedModelUrl !== modelKey) {
      setAplicacionEstado("");
      return;
    }
    // Aplicar los valores iniciales una sola vez por modelo/API.
    // Los cambios posteriores se aplican directamente desde cada selector.
    if (modeloInicializadoRef.current?.key === modelKey && modeloInicializadoRef.current.api === catalogApi) return;
    modeloInicializadoRef.current = { key: modelKey, api: catalogApi };

    const metalAplicado = catalogApi.materialCatalogo?.(aurumMaterial);
    const gemaAplicada = catalogApi.gemaCatalogo?.(aurumGem);
    if (metalAplicado === false && gemaAplicada === false) {
      setAplicacionEstado("No se identificaron piezas de metal ni de gema compatibles en este modelo.");
    } else if (metalAplicado === false) {
      setAplicacionEstado("La gema se aplicó, pero no se identificaron piezas de metal para cambiar el acabado.");
    } else if (gemaAplicada === false) {
      setAplicacionEstado("El metal se aplicó, pero no se identificaron piezas de gema para cambiar la piedra.");
    } else if (metalAplicado === true && gemaAplicada === true) {
      setAplicacionEstado("Metal y gema aplicados al modelo 3D.");
    } else {
      setAplicacionEstado("No se pudo confirmar la aplicación de todos los cambios en el modelo.");
    }
  }, [catalogApi, loadedModelUrl, modelKey, aurumMaterial, aurumGem]);

  const handleMetalSelect = (id: string) => {
    // Evita recalcular el material si el usuario vuelve a pulsar la opción activa.
    if (id === metalId) return;
    setMetalId(id);
    const selected = metales.find((item) => item.id === id) ?? metales[0];
    const material = MATERIALES.find((item) => item.id === selected.materialId)
      ?? MATERIALES.find((item) => item.id === "oro18a_pulido");
    if (catalogApi && loadedModelUrl === modelKey && material) {
      const applied = catalogApi.materialCatalogo?.(material);
      setAplicacionEstado(applied === true ? "Metal aplicado al modelo 3D." : applied === false ? "No se identificaron piezas de metal compatibles en este modelo." : "Cambio de metal enviado al visor.");
    } else {
      console.warn("[PUBLIC VIEWER] El motor todavía no está listo para cambiar el metal", {
        hasCatalogApi: Boolean(catalogApi),
        modelReady: loadedModelUrl === modelKey,
        requestedMetal: id,
      });
    }
  };

  const handleGemSelect = (id: string) => {
    // Evita volver a aplicar la gema cuando no hay un cambio real de selección.
    if (id === gemaId) return;
    setGemaId(id);
    const selected = gemas.find((item) => item.id === id) ?? gemas[0];
    const gem = GEMAS.find((item) => item.id === selected.gemId)
      ?? GEMAS.find((item) => item.id === "diamante_natural");
    if (catalogApi && loadedModelUrl === modelKey && gem) {
      const applied = catalogApi.gemaCatalogo?.(gem);
      setAplicacionEstado(applied === true ? "Gema aplicada al modelo 3D." : applied === false ? "No se identificaron piezas de gema compatibles en este modelo." : "Cambio de gema enviado al visor.");
    } else {
      console.warn("[PUBLIC VIEWER] El motor todavía no está listo para cambiar la gema", {
        hasCatalogApi: Boolean(catalogApi),
        modelReady: loadedModelUrl === modelKey,
        requestedGem: id,
      });
    }
  };

  const isReady = Boolean((modelUrl || localFile) && loadedModelUrl === modelKey && !loadError && !status);
  const displayName = (sharedModelName || modelName || "Joya compartida")
    .replace(/\.(glb|gltf|3dm|obj|stl|fbx)$/i, "")
    .replace(/^[0-9a-f]{8}-[0-9a-f-]{27,}[-_]?/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\\s+/g, " ")
    .trim() || "Joya compartida";

  return (
    <section className="mx-auto w-full min-w-0 overflow-hidden rounded-xl border border-[#e8e1d5] bg-white shadow-[0_16px_44px_-30px_rgba(49,39,24,.28)] sm:mt-4 sm:rounded-2xl md:mt-0 lg:mx-auto lg:flex lg:h-[min(76vh,680px)] lg:min-h-[540px] lg:max-h-[680px] lg:flex-col lg:rounded-2xl lg:max-w-[1440px]">
      <header className="flex shrink-0 flex-col items-stretch justify-between gap-2 border-b border-[#eee9e0] bg-[linear-gradient(110deg,#fffefa_0%,#ffffff_58%,#fbf7ef_100%)] px-3.5 py-2.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-3 [@media(max-height:800px)]:py-1.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-[#eadfc9] bg-[#f8f1e3] text-[#92702f]">
              <Gem className="size-4" strokeWidth={1.7} />
            </span>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#92702f]">Visor interactivo</p>
          </div>
          <h2 className="mt-1 truncate font-display text-lg leading-tight tracking-[-.025em] text-[#28231d] sm:text-xl lg:text-2xl [@media(max-height:800px)]:text-lg">Configura tu joya en 3D</h2>

        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className="inline-flex rounded-full border border-[#e9e2d7] px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[.1em] text-[#81786c] sm:px-3 sm:text-[10px]">Solo visualización</span>
          <button type="button" onClick={() => { setMetalId("oro-amarillo"); setGemaId("diamante"); catalogApi?.reset?.(); const defaultMetal = MATERIALES.find((item) => item.id === "oro18a_pulido"); const defaultGem = GEMAS.find((item) => item.id === "diamante_natural"); if (defaultMetal) catalogApi?.materialCatalogo?.(defaultMetal); if (defaultGem) catalogApi?.gemaCatalogo?.(defaultGem); }} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#e4ddd1] bg-white px-3.5 py-2 text-xs font-semibold text-[#41382d] shadow-sm transition hover:border-[#b28b45] hover:bg-[#fbf8f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b28b45] focus-visible:ring-offset-2"><RotateCcw className="size-3.5" /> Restablecer</button>
        </div>
      </header>
      <div className="isolate grid min-w-0 grid-cols-1 lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_250px] 2xl:grid-cols-[minmax(0,1fr)_270px]">
        <div ref={visorRef} className={"relative z-0 h-[clamp(340px,56svh,500px)] min-h-[340px] min-w-0 overflow-hidden bg-[radial-gradient(ellipse_at_50%_42%,#ffffff_0%,#fbfaf7_60%,#f4f0e8_100%)] sm:h-[clamp(400px,62vh,600px)] sm:min-h-[400px] lg:h-full lg:min-h-0 " + (pantallaCompleta ? "h-screen min-h-0 w-screen sm:h-screen sm:min-h-0 2xl:h-screen 2xl:min-h-0" : "")}>
          <div className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-full border border-[#e8e3db] bg-white/90 p-1 shadow-sm backdrop-blur sm:right-3 sm:top-3 sm:gap-1.5 sm:p-1.5" aria-label="Controles informativos del visor">
            <span title="Iluminación HDR" className="rounded-full border border-[#e8e3db] px-2 py-1 text-[9px] font-medium text-[#81786c] sm:text-[10px]">HDRI</span>
            <span title="Materiales PBR" className="rounded-full border border-[#e8e3db] px-2 py-1 text-[9px] font-medium text-[#81786c] sm:text-[10px]">PBR</span>
            <span title="Referencia de resolución 4K" className="rounded-full border border-[#e8e3db] px-2 py-1 text-[9px] font-medium text-[#81786c] sm:text-[10px]">4K</span>
            <button type="button" onClick={() => void alternarPantallaCompleta()} aria-label={pantallaCompleta ? "Salir de pantalla completa" : "Ver en pantalla completa"} title={pantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"} className="grid size-7 place-items-center rounded-full bg-[#171717] text-white transition hover:bg-[#3a3021] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b28b45] focus-visible:ring-offset-2 sm:size-8">
              {pantallaCompleta ? <Minimize className="size-3.5 sm:size-4" /> : <Maximize className="size-3.5 sm:size-4" />}
            </button>
          </div>
          {(modelUrl || localFile) && <div className="absolute inset-0"><AurumRender embedded onCatalogApiReady={(api) => setCatalogApi(api)} /></div>}
          {(!(modelUrl || localFile) || loadError || status) && <div className={"absolute inset-0 z-50 grid place-items-center p-6 text-center transition-opacity " + (isReady ? "pointer-events-none opacity-0" : "bg-white/90 backdrop-blur-[2px]")}>
            <div className="max-w-sm">
              {loadError ? <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full border border-[#edd6c7] bg-[#fff6f0] text-[#a85b2d]"><span className="text-lg">!</span></div> : <div className="mx-auto mb-3 size-7 animate-spin rounded-full border-2 border-[#e9dfca] border-t-[#a7833d]" />}
              <p className={"text-sm font-semibold " + (loadError ? "text-[#984a28]" : "text-[#554c40]")}>{loadError || status || "Preparando el visor 3D…"}</p>
              {!loadError && <p className="mt-1 text-xs text-[#8a8175]">Estamos preparando la experiencia interactiva.</p>}
            </div>
          </div>}
          <div className="pointer-events-none absolute bottom-2 left-2 z-10 max-w-[calc(100%-1rem)] rounded-full border border-white/80 bg-white/85 px-2.5 py-1.5 text-[9px] text-[#766d61] shadow-sm backdrop-blur sm:bottom-3 sm:left-3 sm:px-3 sm:text-[10px]">Toca y arrastra para girar · Pellizca para acercar</div>
        </div>
        <aside className="relative z-10 min-w-0 border-t border-[#eee9e0] bg-[#fffefa] p-2.5 sm:p-4 lg:h-full lg:min-h-0 lg:max-h-full lg:overflow-x-hidden lg:overflow-y-auto lg:border-l lg:border-t-0 lg:p-3 2xl:p-4 [@media(max-height:800px)]:p-2">
          <div className="mb-2.5 sm:mb-4 [@media(max-height:800px)]:mb-2">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#92702f]">01 · Metal</p>
            <p className="mt-0.5 hidden text-xs text-[#8a8175] sm:block">Elige el acabado de tu joya</p>
            <div className="mt-2 grid grid-cols-4 gap-1.5 sm:mt-3 sm:grid-cols-2 sm:gap-2 [@media(max-height:800px)]:mt-2">{metales.map((metal) => <button key={metal.id} type="button" aria-pressed={metalId === metal.id} onClick={() => handleMetalSelect(metal.id)} className={"group flex min-h-11 items-center gap-1.5 rounded-lg border px-2 py-2 text-left text-[11px] transition sm:min-h-[76px] sm:block sm:rounded-xl sm:p-3 sm:text-xs [@media(max-height:800px)]:min-h-[60px] [@media(max-height:800px)]:p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b28b45] focus-visible:ring-offset-1 " + (metalId === metal.id ? "border-[#a7833d] bg-[#f7f0e2] shadow-[inset_0_0_0_1px_rgba(167,131,61,.12)]" : "border-[#ece7df] bg-white hover:border-[#d1bd96] hover:bg-[#fcfaf5]")}><span className="flex shrink-0 items-center justify-between sm:mb-2"><span className="size-4 rounded-full border border-black/10 shadow-sm sm:size-5" style={{ backgroundColor: "#" + metal.color.toString(16).padStart(6,"0") }} />{metalId === metal.id && <span className="text-[9px] font-bold uppercase tracking-wide text-[#8b6b36]">Activo</span>}</span><span className="min-w-0 truncate font-medium text-[#342e26] sm:whitespace-normal">{metal.label}</span></button>)}</div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#92702f]">02 · Piedra</p>
            <p className="mt-0.5 hidden text-xs text-[#8a8175] sm:block">Selecciona una gema</p>
            <div className="mt-2 grid grid-cols-3 gap-1 sm:grid-cols-2 sm:gap-1.5 md:grid-cols-1 [@media(max-height:800px)]:mt-1">{gemas.map((gem) => <button key={gem.id} type="button" aria-pressed={gemaId === gem.id} onClick={() => handleGemSelect(gem.id)} className={"flex min-h-9 w-full items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] transition sm:min-h-10 sm:gap-2 sm:rounded-xl sm:px-2.5 sm:py-2 sm:text-xs [@media(max-height:800px)]:min-h-8 [@media(max-height:800px)]:py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b28b45] focus-visible:ring-offset-1 " + (gemaId === gem.id ? "border-[#a7833d] bg-[#f7f0e2] text-[#342e26]" : "border-[#ece7df] bg-white text-[#5f574d] hover:border-[#d1bd96] hover:bg-[#fcfaf5]")}><span className="size-3 shrink-0 rounded-full border border-black/10 sm:size-3.5" style={{ backgroundColor: "#" + gem.color.toString(16).padStart(6,"0") }} /><span className="min-w-0 flex-1 truncate font-medium">{gem.label}</span>{gemaId === gem.id && <span className="text-[9px] font-bold uppercase tracking-wide text-[#8b6b36]">Activo</span>}</button>)}</div>
          </div>
          <details className="mt-2.5 rounded-lg border border-[#eee6d8] bg-[linear-gradient(135deg,#fcfaf6_0%,#fffdf9_100%)] p-2.5 sm:mt-4 sm:rounded-xl sm:p-3 [@media(max-height:800px)]:mt-2 [@media(max-height:800px)]:p-2.5" aria-live="polite">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-[#6f572d] [&::-webkit-details-marker]:hidden">
              <span className="truncate">Tu combinación</span>
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="size-3 rounded-full border border-black/10" style={{ backgroundColor: "#" + selectedMetal.color.toString(16).padStart(6, "0") }} />
                <span className="size-3 rounded-full border border-black/10" style={{ backgroundColor: "#" + selectedGem.color.toString(16).padStart(6, "0") }} />
                <span className="text-[10px]">Detalles⌄</span>
              </span>
            </summary>
            <div className="mt-2 flex items-center gap-2 sm:mt-3 sm:gap-2.5">
              <span className="size-5 shrink-0 rounded-full border border-black/10 shadow-sm sm:size-7" style={{ backgroundColor: "#" + selectedMetal.color.toString(16).padStart(6, "0") }} />
              <div className="min-w-0">
                <p className="text-[10px] text-[#8a8175]">Metal</p>
                <p className="truncate text-xs font-semibold text-[#342e26]">{selectedMetal.label}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 sm:mt-2.5 sm:gap-2.5">
              <span className="size-7 shrink-0 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: "#" + selectedGem.color.toString(16).padStart(6, "0") }} />
              <div className="min-w-0">
                <p className="text-[10px] text-[#8a8175]">Piedra</p>
                <p className="truncate text-xs font-semibold text-[#342e26]">{selectedGem.label}</p>
              </div>
            </div>
            {aplicacionEstado && <p className={"mt-3 border-t border-[#eee6d8] pt-2 text-[10px] leading-4 " + (aplicacionEstado.startsWith("Metal y gema aplicados") ? "text-emerald-700" : "text-amber-700")} role="status">{aplicacionEstado}</p>}
            <p className="mt-2 hidden text-[10px] leading-4 text-[#746b62] sm:block">La apariencia final depende de la geometría y de las piezas identificadas en el modelo 3D.</p>
          </details>
        </aside>
      </div>
      <footer className="hidden border-t border-[#eee9e0] bg-[#fdfcf9] px-4 py-2 text-[10px] leading-4 text-[#8a8175] md:flex md:items-center md:justify-between">
        <span>Taller del Joyero · Visualizador independiente</span>
        <span>Los cambios son una vista previa y no modifican el archivo original.</span>
      </footer>
    </section>
  );
}
