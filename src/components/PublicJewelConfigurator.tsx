import { useEffect, useState } from "react";
import { Gem, RotateCcw } from "lucide-react";
import { supabasePublic } from "@/integrations/supabase/client";
import { AurumRender } from "@/components/AurumRender";
import type { AurumCatalogApi } from "@/lib/aurum/api";
import { GEMAS, MATERIALES } from "@/lib/aurum/catalog";

type Props = { slug?: string; producto?: string; sharedModelUrl?: string; sharedModelName?: string };
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

export function PublicJewelConfigurator({ slug, producto, sharedModelUrl, sharedModelName }: Props) {
  const [metalId, setMetalId] = useState<string>("oro-amarillo");
  const [gemaId, setGemaId] = useState<string>("diamante");
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [modelName, setModelName] = useState(sharedModelName || "modelo.3dm");
  const [status, setStatus] = useState("Preparando modelo 3D…");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [catalogApi, setCatalogApi] = useState<AurumCatalogApi | null>(null);
  const [loadedModelUrl, setLoadedModelUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadModelReference = async () => {
      setModelUrl(null);
      setLoadedModelUrl(null);
      setLoadError(null);
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
        setModelName(typeof data.nombre === "string" && /\\.3dm$/i.test(data.nombre) ? data.nombre : "modelo.3dm");
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
  }, [slug, producto, sharedModelUrl, sharedModelName]);

  const selectedMetal = metales.find((item) => item.id === metalId) ?? metales[0];
  const selectedGem = gemas.find((item) => item.id === gemaId) ?? gemas[0];
  const aurumMaterial = MATERIALES.find((item) => item.id === selectedMetal.materialId) ?? MATERIALES.find((item) => item.id === "oro18a_pulido")!;
  const aurumGem = GEMAS.find((item) => item.id === selectedGem.gemId) ?? GEMAS.find((item) => item.id === "diamante_natural")!;

  useEffect(() => {
    let cancelled = false;
    if (!modelUrl || !catalogApi?.cargar || loadedModelUrl === modelUrl) return;
    const loadIntoAurum = async () => {
      setStatus("Preparando el visor interactivo…");
      setLoadError(null);
      try {
        const response = await fetch(modelUrl);
        if (!response.ok) throw new Error("No se pudo descargar el modelo 3D del catálogo.");
        const blob = await response.blob();
        if (cancelled) return;
        const file = new File([blob], modelName || "modelo.3dm", { type: blob.type || "application/octet-stream" });
        await catalogApi.cargar?.(file, (progress: string) => { if (!cancelled && progress) setStatus(progress); });
        if (cancelled) return;
        setLoadedModelUrl(modelUrl);
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
  }, [modelUrl, modelName, catalogApi, loadedModelUrl]);

  useEffect(() => {
    if (!catalogApi || loadedModelUrl !== modelUrl) return;
    catalogApi.materialCatalogo?.(aurumMaterial);
    catalogApi.gemaCatalogo?.(aurumGem);
  }, [catalogApi, loadedModelUrl, modelUrl, aurumMaterial, aurumGem]);

  const handleMetalSelect = (id: string) => {
    setMetalId(id);
    const selected = metales.find((item) => item.id === id) ?? metales[0];
    const material = MATERIALES.find((item) => item.id === selected.materialId)
      ?? MATERIALES.find((item) => item.id === "oro18a_pulido");
    if (catalogApi && loadedModelUrl === modelUrl && material) {
      console.info("[PUBLIC VIEWER] Metal seleccionado", { id, materialId: material.id });
      catalogApi.materialCatalogo?.(material);
    } else {
      console.warn("[PUBLIC VIEWER] El motor todavía no está listo para cambiar el metal", {
        hasCatalogApi: Boolean(catalogApi),
        modelReady: loadedModelUrl === modelUrl,
        requestedMetal: id,
      });
    }
  };

  const isReady = Boolean(modelUrl && loadedModelUrl === modelUrl && !loadError && !status);
  const displayName = (sharedModelName || modelName || "Joya compartida")
    .replace(/\\.(glb|gltf|3dm|obj|stl|fbx)$/i, "")
    .replace(/^[0-9a-f]{8}-[0-9a-f-]{27,}[-_]?/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\\s+/g, " ")
    .trim() || "Joya compartida";

  return (
    <section className="mx-auto w-full min-w-0 overflow-hidden rounded-xl border border-[#e8e1d5] bg-white shadow-[0_16px_44px_-30px_rgba(49,39,24,.28)] sm:mt-4 sm:rounded-2xl md:mt-0 md:flex md:h-full md:min-h-0 md:max-h-full md:flex-col lg:mx-auto lg:max-w-[1440px]">
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
      <div className="isolate grid min-w-0 grid-cols-1 md:min-h-0 md:flex-1 md:grid-rows-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_250px] lg:grid-cols-[minmax(0,1fr)_270px]">
        <div className="relative z-0 h-[clamp(300px,48svh,430px)] min-h-[300px] min-w-0 overflow-hidden bg-[radial-gradient(ellipse_at_50%_42%,#ffffff_0%,#fbfaf7_60%,#f4f0e8_100%)] sm:h-[clamp(360px,58vh,520px)] sm:min-h-[360px] md:h-full md:min-h-0">
          {modelUrl && <div className="absolute inset-0"><AurumRender embedded onCatalogApiReady={(api) => setCatalogApi(api)} /></div>}
          {(!modelUrl || loadError || status) && <div className={"absolute inset-0 z-50 grid place-items-center p-6 text-center transition-opacity " + (isReady ? "pointer-events-none opacity-0" : "bg-white/90 backdrop-blur-[2px]")}>
            <div className="max-w-sm">
              {loadError ? <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full border border-[#edd6c7] bg-[#fff6f0] text-[#a85b2d]"><span className="text-lg">!</span></div> : <div className="mx-auto mb-3 size-7 animate-spin rounded-full border-2 border-[#e9dfca] border-t-[#a7833d]" />}
              <p className={"text-sm font-semibold " + (loadError ? "text-[#984a28]" : "text-[#554c40]")}>{loadError || status || "Preparando el visor 3D…"}</p>
              {!loadError && <p className="mt-1 text-xs text-[#8a8175]">Estamos preparando la experiencia interactiva.</p>}
            </div>
          </div>}
          <div className="pointer-events-none absolute bottom-2 left-2 z-10 max-w-[calc(100%-1rem)] rounded-full border border-white/80 bg-white/85 px-2.5 py-1.5 text-[9px] text-[#766d61] shadow-sm backdrop-blur sm:bottom-3 sm:left-3 sm:px-3 sm:text-[10px]">Toca y arrastra para girar · Pellizca para acercar</div>
        </div>
        <aside className="relative z-10 min-w-0 border-t border-[#eee9e0] bg-[#fffefa] p-3.5 sm:p-4 md:h-full md:min-h-0 md:max-h-full md:overflow-x-hidden md:overflow-y-auto md:border-l md:border-t-0 lg:p-4 [@media(max-height:800px)]:p-2">
          <div className="mb-3 sm:mb-4 [@media(max-height:800px)]:mb-2">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#92702f]">01 · Metal</p>
            <p className="mt-1 text-xs text-[#8a8175]">Elige el acabado de tu joya</p>
            <div className="mt-3 grid grid-cols-2 gap-2 [@media(max-height:800px)]:mt-2">{metales.map((metal) => <button key={metal.id} type="button" aria-pressed={metalId === metal.id} onClick={() => handleMetalSelect(metal.id)} className={"group min-h-[76px] rounded-xl border p-3 text-left text-xs transition [@media(max-height:800px)]:min-h-[60px] [@media(max-height:800px)]:p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b28b45] focus-visible:ring-offset-1 " + (metalId === metal.id ? "border-[#a7833d] bg-[#f7f0e2] shadow-[inset_0_0_0_1px_rgba(167,131,61,.12)]" : "border-[#ece7df] bg-white hover:border-[#d1bd96] hover:bg-[#fcfaf5]")}><span className="mb-2 flex items-center justify-between"><span className="size-5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: "#" + metal.color.toString(16).padStart(6,"0") }} />{metalId === metal.id && <span className="text-[9px] font-bold uppercase tracking-wide text-[#8b6b36]">Activo</span>}</span><span className="font-medium text-[#342e26]">{metal.label}</span></button>)}</div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#92702f]">02 · Piedra</p>
            <p className="mt-1 text-xs text-[#8a8175]">Selecciona una gema</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-2 md:grid-cols-1 [@media(max-height:800px)]:mt-1">{gemas.map((gem) => <button key={gem.id} type="button" aria-pressed={gemaId === gem.id} onClick={() => setGemaId(gem.id)} className={"flex min-h-10 w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs transition [@media(max-height:800px)]:min-h-8 [@media(max-height:800px)]:py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b28b45] focus-visible:ring-offset-1 " + (gemaId === gem.id ? "border-[#a7833d] bg-[#f7f0e2] text-[#342e26]" : "border-[#ece7df] bg-white text-[#5f574d] hover:border-[#d1bd96] hover:bg-[#fcfaf5]")}><span className="size-3.5 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: "#" + gem.color.toString(16).padStart(6,"0") }} /><span className="min-w-0 flex-1 truncate font-medium">{gem.label}</span>{gemaId === gem.id && <span className="text-[9px] font-bold uppercase tracking-wide text-[#8b6b36]">Activo</span>}</button>)}</div>
          </div>
          <div className="mt-3 rounded-xl border border-[#eee6d8] bg-[linear-gradient(135deg,#fcfaf6_0%,#fffdf9_100%)] p-2.5 sm:mt-4 sm:p-3 [@media(max-height:800px)]:mt-2 [@media(max-height:800px)]:p-2">
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#92702f]">Vista previa</p>
            <p className="mt-1 text-[11px] leading-4 text-[#746b62]">La apariencia depende de la geometría y de las piezas identificadas en el modelo 3D.</p>
          </div>
        </aside>
      </div>
      <footer className="hidden border-t border-[#eee9e0] bg-[#fdfcf9] px-4 py-2 text-[10px] leading-4 text-[#8a8175] md:flex md:items-center md:justify-between">
        <span>Taller del Joyero · Visualizador independiente</span>
        <span>Los cambios son una vista previa y no modifican el archivo original.</span>
      </footer>
    </section>
  );
}
