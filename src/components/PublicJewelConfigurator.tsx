import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
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
    <section className="mt-4 overflow-hidden rounded-[26px] border border-[#e8e1d5] bg-white shadow-[0_24px_70px_-42px_rgba(35,28,18,.32)] sm:mt-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eee9e0] bg-white px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#f6efe0] text-[#92702f]">
              <span className="size-2 rounded-full bg-[#b08a43]" />
            </span>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#92702f]">Visor interactivo</p>
          </div>
          <h2 className="mt-1 truncate font-display text-xl text-[#28231d] sm:text-2xl">Configura tu joya en 3D</h2>
          <p className="mt-1 max-w-xl truncate text-xs text-[#82796e]">{displayName}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-[#e9e2d7] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-[#81786c] sm:inline-flex">Solo visualización</span>
          <button type="button" onClick={() => { setMetalId("oro-amarillo"); setGemaId("diamante"); }} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#e4ddd1] bg-white px-3.5 py-2 text-xs font-semibold text-[#41382d] transition hover:border-[#b28b45] hover:bg-[#fbf8f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b28b45] focus-visible:ring-offset-2"><RotateCcw className="size-3.5" /> Restablecer</button>
        </div>
      </header>
      <div className="isolate grid lg:grid-cols-[minmax(0,1fr)_270px]">
        <div className="relative z-0 min-h-[360px] overflow-hidden bg-[radial-gradient(ellipse_at_50%_42%,#ffffff_0%,#fbfaf7_60%,#f4f0e8_100%)] sm:min-h-[480px] lg:min-h-[540px]">
          {modelUrl && <div className="absolute inset-0"><AurumRender embedded onCatalogApiReady={(api) => setCatalogApi(api)} /></div>}
          {(!modelUrl || loadError || status) && <div className={"absolute inset-0 z-50 grid place-items-center p-6 text-center transition-opacity " + (isReady ? "pointer-events-none opacity-0" : "bg-white/90 backdrop-blur-[2px]")}>
            <div className="max-w-sm">
              {loadError ? <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full border border-[#edd6c7] bg-[#fff6f0] text-[#a85b2d]"><span className="text-lg">!</span></div> : <div className="mx-auto mb-3 size-7 animate-spin rounded-full border-2 border-[#e9dfca] border-t-[#a7833d]" />}
              <p className={"text-sm font-semibold " + (loadError ? "text-[#984a28]" : "text-[#554c40]")}>{loadError || status || "Preparando el visor 3D…"}</p>
              {!loadError && <p className="mt-1 text-xs text-[#8a8175]">Estamos preparando la experiencia interactiva.</p>}
            </div>
          </div>}
          <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-[10px] text-[#766d61] shadow-sm backdrop-blur">Arrastra para girar · Rueda para acercar</div>
        </div>
        <aside className="relative z-10 border-t border-[#eee9e0] bg-white p-4 sm:p-5 lg:border-l lg:border-t-0">
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#92702f]">01 · Metal</p>
            <p className="mt-1 text-xs text-[#8a8175]">Elige el acabado de tu joya</p>
            <div className="mt-3 grid grid-cols-2 gap-2">{metales.map((metal) => <button key={metal.id} type="button" aria-pressed={metalId === metal.id} onClick={() => handleMetalSelect(metal.id)} className={"group min-h-[76px] rounded-xl border p-3 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b28b45] focus-visible:ring-offset-1 " + (metalId === metal.id ? "border-[#a7833d] bg-[#f7f0e2] shadow-[inset_0_0_0_1px_rgba(167,131,61,.12)]" : "border-[#ece7df] bg-white hover:border-[#d1bd96] hover:bg-[#fcfaf5]")}><span className="mb-2 flex items-center justify-between"><span className="size-5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: "#" + metal.color.toString(16).padStart(6,"0") }} />{metalId === metal.id && <span className="text-[9px] font-bold uppercase tracking-wide text-[#8b6b36]">Activo</span>}</span><span className="font-medium text-[#342e26]">{metal.label}</span></button>)}</div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#92702f]">02 · Piedra</p>
            <p className="mt-1 text-xs text-[#8a8175]">Selecciona una gema</p>
            <div className="mt-3 space-y-1.5">{gemas.map((gem) => <button key={gem.id} type="button" aria-pressed={gemaId === gem.id} onClick={() => setGemaId(gem.id)} className={"flex min-h-10 w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b28b45] focus-visible:ring-offset-1 " + (gemaId === gem.id ? "border-[#a7833d] bg-[#f7f0e2] text-[#342e26]" : "border-[#ece7df] bg-white text-[#5f574d] hover:border-[#d1bd96] hover:bg-[#fcfaf5]")}><span className="size-3.5 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: "#" + gem.color.toString(16).padStart(6,"0") }} /><span className="flex-1 font-medium">{gem.label}</span>{gemaId === gem.id && <span className="text-[9px] font-bold uppercase tracking-wide text-[#8b6b36]">Activo</span>}</button>)}</div>
          </div>
          <div className="mt-5 rounded-xl border border-[#eee6d8] bg-[#fcfaf6] p-3">
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#92702f]">Vista previa</p>
            <p className="mt-1 text-[11px] leading-4 text-[#746b62]">La apariencia depende de la geometría y de las piezas identificadas en el modelo 3D.</p>
          </div>
        </aside>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eee9e0] bg-[#fdfcf9] px-5 py-3 text-[10px] text-[#8a8175] sm:px-6">
        <span>Taller del Joyero · Visualizador independiente</span>
        <span>Los cambios son una vista previa y no modifican el archivo original.</span>
      </footer>
    </section>
  );
}
