import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { supabasePublic } from "@/integrations/supabase/client";
import { AurumRender } from "@/components/AurumRender";
import type { AurumCatalogApi } from "@/lib/aurum/api";
import { GEMAS, MATERIALES } from "@/lib/aurum/catalog";

type Props = { slug: string; producto: string };
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

export function PublicJewelConfigurator({ slug, producto }: Props) {
  const [metalId, setMetalId] = useState<string>("oro-amarillo");
  const [gemaId, setGemaId] = useState<string>("diamante");
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [modelName, setModelName] = useState("modelo.3dm");
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
      setStatus("Buscando el modelo 3D del catálogo…");
      try {
        const { data, error } = await supabasePublic.functions.invoke("catalogo-modelo-3d-publico", { body: { slug, producto } });
        if (error || !data?.ok || typeof data.url !== "string") throw new Error(data?.error || error?.message || "No hay modelo 3D disponible para este producto.");
        if (cancelled) return;
        setModelName(typeof data.nombre === "string" && data.nombre.toLowerCase().endsWith(".3dm") ? data.nombre : "modelo.3dm");
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
  }, [slug, producto]);

  const selectedMetal = metales.find((item) => item.id === metalId) ?? metales[0];
  const selectedGem = gemas.find((item) => item.id === gemaId) ?? gemas[0];
  const aurumMaterial = MATERIALES.find((item) => item.id === selectedMetal.materialId) ?? MATERIALES.find((item) => item.id === "oro18a_pulido")!;
  const aurumGem = GEMAS.find((item) => item.id === selectedGem.gemId) ?? GEMAS.find((item) => item.id === "diamante_natural")!;

  useEffect(() => {
    let cancelled = false;
    if (!modelUrl || !catalogApi?.cargar || loadedModelUrl === modelUrl) return;
    const loadIntoAurum = async () => {
      setStatus("Abriendo modelo en Aurum Render…");
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

  return (
    <section className="mt-5 overflow-hidden rounded-[28px] border border-[#1f1b1818] bg-white/80 shadow-[0_20px_60px_-45px_rgba(31,27,24,.45)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1f1b1810] px-5 py-4">
        <div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#8a6b36]">Experiencia interactiva</p><h2 className="mt-1 font-display text-2xl">Configura tu joya en 3D</h2></div>
        <button type="button" onClick={() => { setMetalId("oro-amarillo"); setGemaId("diamante"); }} className="inline-flex items-center gap-2 rounded-full border border-[#1f1b1820] px-3 py-2 text-xs font-semibold"><RotateCcw className="size-3.5" /> Restablecer</button>
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="relative min-h-[320px] bg-[#f7f6f2] sm:min-h-[440px]">
          {modelUrl && <div className="absolute inset-0"><AurumRender embedded onCatalogApiReady={(api) => setCatalogApi(api)} /></div>}
          {(!modelUrl || loadError || status) && <div className={"absolute inset-0 z-50 grid place-items-center p-6 text-center " + (loadedModelUrl === modelUrl && !loadError && !status ? "pointer-events-none opacity-0" : "bg-[#f7f6f2]/90")}><p className="max-w-sm text-sm text-[#625b54]">{loadError || status || "Preparando visor 3D…"}</p></div>}
        </div>
        <aside className="border-t border-[#1f1b1810] p-4 lg:border-l lg:border-t-0">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8a6b36]">Metal</p>
          <div className="mt-2 grid grid-cols-2 gap-2">{metales.map((metal) => <button key={metal.id} type="button" aria-pressed={metalId === metal.id} onClick={() => setMetalId(metal.id)} className={"rounded-xl border p-2 text-left text-[11px] " + (metalId === metal.id ? "border-[#8a6b36] bg-[#f5eee0]" : "border-[#1f1b1818]")}><span className="mb-1 block size-5 rounded-full border border-black/10" style={{ backgroundColor: "#" + metal.color.toString(16).padStart(6,"0") }} />{metal.label}</button>)}</div>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-[#8a6b36]">Piedra</p>
          <div className="mt-2 space-y-1">{gemas.map((gem) => <button key={gem.id} type="button" aria-pressed={gemaId === gem.id} onClick={() => setGemaId(gem.id)} className={"flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-[11px] " + (gemaId === gem.id ? "border-[#8a6b36] bg-[#f5eee0]" : "border-[#1f1b1818]")}><span className="size-3.5 rounded-full border border-black/10" style={{ backgroundColor: "#" + gem.color.toString(16).padStart(6,"0") }} />{gem.label}</button>)}</div>
          <p className="mt-4 text-[10px] leading-4 text-[#746b62]">Vista del motor Aurum Render; el acabado final depende de la geometría y de las piezas identificadas en el 3DM.</p>
        </aside>
      </div>
    </section>
  );
}
