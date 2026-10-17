import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyAurumMetal, applyAurumGem, metalPresetFromConfig, gemPresetFromConfig,
} from "../lib/aurum-material-engine";
import { getAurumScenePreset, getAurumRenderQuality, AURUM_HDRI_GROUND_DEFAULT, type AurumRenderQualityId } from "../lib/aurum-scene-engine";
import { getAurumPhotographicProfile, getAurumHdriUrl, getAurumGemHdriUrl, AURUM_HDRI_URLS, AURUM_GEM_HDRI_URLS, AURUM_AMBIENT_PRESETS } from "../lib/aurum-photographic-scene-engine";
import { getAurumShadowConfig } from "../lib/aurum-shadow-engine";
import { getAurumPostConfig } from "../lib/aurum-post-engine";
import { getAurumSsaoConfig } from "../lib/aurum-ssao-engine";
import { AURUM_LIGHTING_DEFAULT } from "../lib/aurum-lighting-engine";
import { applyAurumCameraView, applyAurumIJEWELPresentationCamera } from "../lib/aurum/camera";
import { prepareAurumModel } from "../lib/aurum/model-prep";
import { createAurumPostPipeline } from "../lib/aurum/post";
import { createAurumEnvironment } from "../lib/aurum/environment";
import { createAurumGemEnvironment } from "../lib/aurum/gem-environment";
import { createAurumDiamondBvhRuntime, type AurumDiamondBvhRuntime } from "../lib/aurum/aurum-diamond-bvh-runtime";
import { createAurumSceneController } from "../lib/aurum/scene";
import { createAurumGround } from "../lib/aurum/ground";
import { setAurumInclusionsVisible } from "../lib/aurum/gems";
import { setAurumGemShaderQuality } from "../lib/aurum/scintillation";
import { createAurumLightingController } from "../lib/aurum/lighting";
import { frameAurumProduct, disposeAurumViewer, createAurumWebGLViewer, startAurumViewerLoop } from "../lib/aurum/viewer";
import { parseAurumInput, convertAurumToGlb } from "../lib/aurum/model-loader";
import { getAurumModelParts } from "../lib/aurum/model-parts";
import { applyAurumMaterialToModel, applyAurumGemToTarget, clearAurumGemFromTarget } from "../lib/aurum/material-application";
import { normalizeAurumModel } from "../lib/aurum/model-normalizer";
import { applyAurumInitialModelMaterials } from "../lib/aurum/model-materials";
import { disposeAurumThicknessCacheForTarget } from "../lib/aurum/thickness-map";
import { createAurumApi } from "../lib/aurum/api";
import { createAurumConfiguratorState } from "../lib/aurum/configurator-state";
import { countAurumTriangles, getAurumRuntimeBudget, type AurumRuntimeBudget } from "../lib/aurum/runtime-budget";
import { prepareAurumLiveGeometry, setAurumLiveGeometryQuality, disposeAurumLiveGeometry } from "../lib/aurum/live-geometry-lod";
import { ChevronDown, Download, Expand, FileJson, Gem, Image as ImageIcon, Maximize2, RotateCcw, RotateCw, SlidersHorizontal, Sparkles, Upload, X } from "lucide-react";

import { GEMAS, MATERIALES, ESCENARIOS, VISTAS, ILUMINACIONES, type MaterialId, type EscenarioId, type VistaId, type IluminacionId, type MaterialGrupo, type CategoriaParte, type GemaId, type GemaConfig, type MaterialConfig, type ParteModelo } from "../lib/aurum/catalog";

const normalizarTexto = (v:any) => String(v ?? "").trim().toLowerCase();
const colorRhinoHex = (c:any): string | undefined => {
  if (!c) return undefined;
  const r = Number(c.r ?? c.R), g = Number(c.g ?? c.G), b = Number(c.b ?? c.B);
  if (![r,g,b].every(Number.isFinite)) return undefined;
  const channels = Math.max(r,g,b) <= 1 ? [r*255,g*255,b*255] : [r,g,b];
  return "#" + channels.map(n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,"0")).join("");
};
const clasificarCapa = (nombre:string, color?:string): CategoriaParte => {
  const n = normalizarTexto(nombre);
  if (/(piedra|gema|gem|diamante|diamond|zafiro|sapphire|rubi|rubí|ruby|esmeralda|emerald|moissanita|moissanite|citrino|amatista|topacio)/.test(n)) return "gema";
  if (/(metal|oro|gold|plata|silver|platino|platinum|metalico|metálico|acero|steel)/.test(n)) return "metal";
  // RGB is retained as source metadata only. Do not infer a material family by color.
  void color;
  return "otro";
};

const GemSwatch = ({ g, selected, onClick }: { g:GemaConfig; selected:boolean; onClick:()=>void }) => {
  const hex = "#" + g.color.toString(16).padStart(6,"0");
  const light = g.familia==="Diamante" || g.familia==="Moissanita" ? "#ffffff" : "#ffffff";
  const gradId = "gem-grad-" + g.id;
  return <button
    type="button"
    title={g.nombre}
    aria-label={g.nombre}
    onClick={onClick}
    className={"group rounded-xl p-1.5 transition "+(selected?"bg-gold/10 ring-1 ring-gold":"hover:bg-white/[.045]")}
  >
    <div className="relative mx-auto aspect-square w-full max-w-[68px]">
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible drop-shadow-[0_5px_10px_rgba(0,0,0,.35)]" aria-hidden="true">
        <defs>
          <radialGradient id={gradId} cx="32%" cy="25%" r="78%">
            <stop offset="0%" stopColor={light} stopOpacity=".98"/>
            <stop offset="22%" stopColor={hex} stopOpacity=".95"/>
            <stop offset="66%" stopColor={hex}/>
            <stop offset="100%" stopColor="#050609" stopOpacity=".72"/>
          </radialGradient>
          <clipPath id={"gem-clip-"+g.id}><circle cx="50" cy="50" r="45"/></clipPath>
        </defs>
        <circle cx="50" cy="50" r="46" fill="#090b0e" stroke="rgba(255,255,255,.18)" strokeWidth="2"/>
        <circle cx="50" cy="50" r="45" fill={"url(#"+gradId+")"}/>
        <g clipPath={"url(#gem-clip-"+g.id+")"} stroke="#fff" strokeOpacity=".22" strokeWidth=".8">
          <polygon points="50,6 73,18 92,40 82,70 59,92 34,86 10,65 8,39 27,17" fill={hex} fillOpacity=".45"/>
          <polygon points="50,6 50,50 73,18" fill="#fff" fillOpacity=".24"/>
          <polygon points="50,50 73,18 92,40" fill="#fff" fillOpacity=".08"/>
          <polygon points="50,50 92,40 82,70" fill="#000" fillOpacity=".16"/>
          <polygon points="50,50 82,70 59,92" fill="#fff" fillOpacity=".10"/>
          <polygon points="50,50 59,92 34,86" fill="#000" fillOpacity=".18"/>
          <polygon points="50,50 34,86 10,65" fill="#fff" fillOpacity=".08"/>
          <polygon points="50,50 10,65 8,39" fill="#000" fillOpacity=".12"/>
          <polygon points="50,50 8,39 27,17" fill="#fff" fillOpacity=".10"/>
          <polygon points="50,50 27,17 50,6" fill="#fff" fillOpacity=".34"/>
          <polygon points="35,20 50,12 62,21 53,38 37,34" fill="#fff" fillOpacity=".16" strokeOpacity=".28"/>
          <polygon points="37,34 53,38 50,50 31,43" fill="#000" fillOpacity=".14"/>
          <polygon points="53,38 68,29 78,43 50,50" fill="#fff" fillOpacity=".10"/>
        </g>
        <circle cx="36" cy="27" r="8" fill="#fff" opacity=".28"/>
        <circle cx="32" cy="23" r="3" fill="#fff" opacity=".7"/>
        <circle cx="67" cy="73" r="2.2" fill="#fff" opacity=".5"/>
      </svg>
      {selected&&<span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-gold text-[9px] font-bold text-black">✓</span>}
    </div>
    <span className="mt-1.5 block truncate text-center text-[9px] font-medium text-white/70 group-hover:text-white">{g.nombre}</span>
  </button>;
};

export function AurumRender() {
  const visorRef = useRef<HTMLDivElement>(null), fileRef = useRef<HTMLInputElement>(null);
  const [lightingOpen, setLightingOpen] = useState(false);
  const [metalHdriId, setMetalHdriId] = useState("ijewelMetal");
  const [gemHdriId, setGemHdriId] = useState("ijewelGem");
  const [ambienteId, setAmbienteId] = useState<string|null>(null);
  const [ambienteMetalInfluence, setAmbienteMetalInfluence] = useState(45);
  const [fondoId, setFondoId] = useState("escena");
  const [qualityOpen, setQualityOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [snapshotWidth, setSnapshotWidth] = useState("3840");
  const [snapshotHeight, setSnapshotHeight] = useState("2160");
  const [snapshotFormat, setSnapshotFormat] = useState<"png"|"jpeg"|"webp">("png");
  const [renderQualityId, setRenderQualityId] = useState<AurumRenderQualityId>("high");
  const composerRef = useRef<any>(null);
  const frameRef = useRef<number | null>(null);
  const invalidateRenderRef = useRef<(() => void) | null>(null);
  const viewerLoopRef = useRef<any>(null);
  const [ptSamples, setPtSamples] = useState("256");
  const [ptProgress, setPtProgress] = useState<string|null>(null);
  const ptAbortRef = useRef<AbortController|null>(null);
  const [lightingStudio, setLightingStudio] = useState<any>(() => ({...AURUM_LIGHTING_DEFAULT}));
  const lucesRef = useRef<((patch:any)=>void)|null>(null);
  const [, refrescarLuces] = useState(0);
  const actualizarLucesAurum = useCallback((patch:any) => {
    lucesRef.current?.(patch);
    refrescarLuces(n=>n+1);
  }, []);
  const apiRef = useRef<any>(null);
  const [archivo, setArchivo] = useState<string|null>(null), [cargando, setCargando] = useState(false), [error, setError] = useState<string|null>(null), [paso, setPaso] = useState<string|null>(null), [formatoInterno, setFormatoInterno] = useState<string|null>(null);
  const [materialId, setMaterialId] = useState<MaterialId>("plata925_pulida"), [gemaId, setGemaId] = useState<GemaId>("diamante_natural"), [escenarioId, setEscenarioId] = useState<EscenarioId>("ijewelReference"), [iluminacionId, setIluminacionId] = useState<IluminacionId>("studioSoft"), [vista, setVista] = useState<VistaId>("frontal");
  const [nombreProyecto, setNombreProyecto] = useState("Diseño de joyería");
  const [categoriaProyecto, setCategoriaProyecto] = useState("Anillo");
  const categoriaProyectoRef = useRef("Anillo");
  categoriaProyectoRef.current = categoriaProyecto;
  const liveFastPathRef = useRef(true);
  const liveTransmissionScaleRef = useRef(0.42);
  const [presentationCover, setPresentationCover] = useState<string | null>(null);
  const [presentationVisible, setPresentationVisible] = useState(false);
  const presentationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [parteSeleccionada, setParteSeleccionada] = useState<string | null>(null);
  const [parteSeleccionadaNombre, setParteSeleccionadaNombre] = useState<string | null>(null);
  const [parteSeleccionadaCapa, setParteSeleccionadaCapa] = useState<string | null>(null);
  const [parteSeleccionadaCategoria, setParteSeleccionadaCategoria] = useState<"metal" | "gema" | "otro">("otro");
  const [diagnosticoSeleccion, setDiagnosticoSeleccion] = useState<any | null>(null);
  const [panel, setPanel] = useState<"materiales" | "escenas" | "iluminacion">("materiales");
  const [uxSection, setUxSection] = useState<"materiales"|"gemas"|"escena"|"hdrMetales"|"hdrGemas"|"fondos">("materiales");
  const exportSettingsRef = useRef({nombreProyecto,categoriaProyecto,archivo,materialId,gemaId,escenarioId,iluminacionId,vista,renderQualityId});
  exportSettingsRef.current={nombreProyecto,categoriaProyecto,archivo,materialId,gemaId,escenarioId,iluminacionId,vista,renderQualityId};
  const actualizarPoster = () => {
    // Fail safely until a truly isolated/off-screen capture path is available.
    // Never invoke the live viewer's photographic export from this UI action.
    setError("La actualización del póster está pausada temporalmente para proteger el visor. No se ha realizado ninguna captura.");
  };

  // Estado central del configurador: una única fuente de verdad.
  const {
    configuration: aurumConfiguration,
    variations: aurumVariations,
    layers: aurumConfiguratorLayers,
  } = useMemo(() => createAurumConfiguratorState({
    material: materialId, gem: gemaId, scene: escenarioId, lighting: iluminacionId, camera: vista,
    materials: MATERIALES, gems: GEMAS,
  }), [materialId, gemaId, escenarioId, iluminacionId, vista]);

  const materialActivo = useMemo(() => MATERIALES.find(m=>m.id===materialId)!, [materialId]);
  const gemaActiva = useMemo(() => GEMAS.find(g=>g.id===gemaId)!, [gemaId]);
  const [bibliotecaTipo, setBibliotecaTipo] = useState<"metales"|"gemas">("metales");
  const [mostrarTodosMateriales, setMostrarTodosMateriales] = useState(false);
  const [mostrarTodasGemas, setMostrarTodasGemas] = useState(false);
  const [busquedaMateriales, setBusquedaMateriales] = useState("");
  const [busquedaGemas, setBusquedaGemas] = useState("");
  const materialesVisibles = useMemo(() => {
    const principales = new Set<MaterialId>(["oro18a_pulido", "oro18b_rodinado", "oro18r_pulido", "oro18_verde_blanco_ijewel", "plata925_pulida", "platino_pulido"]);
    const termino = busquedaMateriales.trim().toLocaleLowerCase("es");
    return MATERIALES.filter((m) => (mostrarTodosMateriales || principales.has(m.id) || m.id === materialId) && (!termino || (m.nombre+" "+m.id).toLocaleLowerCase("es").includes(termino))).sort((a,b)=>Number(principales.has(b.id))-Number(principales.has(a.id)));
  }, [mostrarTodosMateriales, materialId, busquedaMateriales]);
  const gemasVisibles = useMemo(() => {
    const principales = new Set<GemaId>(["diamante_natural", "esmeralda_1", "rubi_natural", "zafiro_azul", "amatista_natural", "moissanita_blanca", "aguamarina_brasil", "citrino_natural", "topacio_azul"]);
    const termino = busquedaGemas.trim().toLocaleLowerCase("es");
    return GEMAS.filter((g) => (mostrarTodasGemas || principales.has(g.id) || g.id === gemaId) && (!termino || (g.nombre+" "+g.id).toLocaleLowerCase("es").includes(termino))).sort((a,b)=>Number(principales.has(b.id))-Number(principales.has(a.id)));
  }, [mostrarTodasGemas, gemaId, busquedaGemas]);

  useEffect(() => {
    let vivo = true;
    let cleanup = () => {};
    let frame = 0;
    (async () => {
      const THREE = await import("three");
            const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      const [{ RGBELoader }, { EXRLoader }] = await Promise.all([
        import("three/examples/jsm/loaders/RGBELoader.js"),
        import("three/examples/jsm/loaders/EXRLoader.js"),
      ]);
      const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
      const nodo = visorRef.current;      if (!vivo || !nodo) return;
      let renderQuality = getAurumRenderQuality(renderQualityId);
      let measuredQualityId: AurumRenderQualityId = renderQualityId;
      const { scene: escena, camera: camara, renderer, controls: controles } = createAurumWebGLViewer(THREE, nodo, {
        pixelRatio: renderQuality.pixelRatio,
        maxDistance: 100,
        controlsClass: (await import("three/examples/jsm/controls/OrbitControls.js")).OrbitControls,
      });
      // Orbit controls calibrated to the supplied iJewel VJSON reference.
      if (controles) {
        controles.enableDamping = true;
        controles.dampingFactor = 0.08;
        controles.zoomSpeed = 0.15;
        controles.rotateSpeed = 2;
      }
      // Render Pro se incorporará en una etapa posterior con el pipeline WebGPU
      // estable. Por ahora el visor WebGL interactivo es el motor oficial.
      const shadowConfig=getAurumShadowConfig();
      const postConfig=getAurumPostConfig();
      const ssaoConfig=getAurumSsaoConfig();
       // Exposición inicial; los presets de escena son la fuente de verdad
       // una vez creado el SceneController.
      renderer.setPixelRatio(Math.min(devicePixelRatio,renderQuality.pixelRatio));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.AgXToneMapping;
      // Exposición calibrada para evitar clipping de blancos en metales pulidos y HDRI de estudio.
      renderer.toneMappingExposure = 0.82;
      // Calibración inicial de fotografía de producto. El preset de escena
      // vuelve a aplicar la exposición final; este valor evita un primer frame
      // excesivamente brillante mientras llegan el HDRI y el modelo.
      // Mantiene suficiente resolución para la transmisión de gemas sin convertirla
      // en un render pesado en equipos normales.
      (renderer as any).transmissionResolutionScale = renderQuality.transmissionScale;
      renderer.shadowMap.enabled = renderQuality.shadows;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      // Lighting and geometry are static between user changes. Build the shadow map only
      // when a light/model/quality change explicitly marks it dirty.
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;
      renderer.domElement.className = "block h-full w-full";
      nodo.appendChild(renderer.domElement);
      const postRuntimeConfig = { ...ssaoConfig, ...postConfig };
      const { composer, ssaoPass, setSSRSelects, applyQuality: applyPostQuality, updateTemporal } = await createAurumPostPipeline(
        renderer,
        escena,
        camara,
        postRuntimeConfig,
        renderQuality
      );

      const environmentController = createAurumEnvironment(renderer, escena, THREE, RoomEnvironment, RGBELoader, EXRLoader);
      let entorno = environmentController.current;
      // El EnvironmentController es la única autoridad para HDRI,
      // intensidad y rotación. El componente no escribe estado de entorno directamente.
      // Biblioteca HDRI profesional centralizada en el motor fotográfico.
      // El mapa de entorno y el GemEnvironment son independientes: el metal
      // necesita bandas de reflexión controladas y la gema necesita un entorno
      // óptico limpio para refracción/dispersion.
      const gemEnvironmentController = createAurumGemEnvironment(environmentController, RGBELoader, EXRLoader);
      let entornoGema:any = null;
      let gemEnvironmentUrl = getAurumGemHdriUrl("gemNeutral");
      let gemEnvironmentRotation = .54;
      let gemEnvironmentIntensityScale = .98;
      const aplicarEntornoGema = () => {
        if (!modelo || !entornoGema) return;
        gemEnvironmentController.applyToModel(modelo, entornoGema, {
          rotation: gemEnvironmentRotation,
          intensityScale: gemEnvironmentIntensityScale,
        });
        invalidateRenderRef.current?.();
      };
      let gemEnvironmentRequestId = 0;
      let metalHdriOverride: string | null = null;
      let gemHdriOverride: string | null = null;
      const cargarEntornoGema = (key="gemNeutral", rotation=.54, intensityScale=.98) => {
        gemEnvironmentUrl = AURUM_AMBIENT_PRESETS[key]?.url ?? getAurumGemHdriUrl(key);
        gemEnvironmentRotation = Number.isFinite(rotation) ? rotation : .54;
        gemEnvironmentIntensityScale = Number.isFinite(intensityScale) ? intensityScale : .98;
        const requestId = ++gemEnvironmentRequestId;
        gemEnvironmentController.load(
          gemEnvironmentUrl,
          requestId,
          () => vivo && requestId === gemEnvironmentRequestId,
          (next) => {
            entornoGema = next;
            aplicarEntornoGema();

            // The BVH material owns a raw HDR texture separate from the
            // standard gem environment. Rebuild it after the selected gem HDRI
            // changes so diamonds do not keep reflecting the previous scene.
            if (diamondBvhRuntime) {
              diamondBvhRuntime.dispose();
              diamondBvhRuntime = null;
            }
            if (modelo) {
              void asegurarDiamanteBvh();
            }
          }
        );
      };
      // Precarga el GemEnvironment una sola vez. El modelo se engancha
      // cuando termina de cargar; así las gemas no quedan negras por falta de
      // environment en el primer frame.
      cargarEntornoGema("gemNeutral", .54, .98);

      let hdrRequestId = 0;
      const cargarHDRI = (environmentKey:string, urlOverride?:string, rotation?:number, intensity?:number) => {
        const requestId = ++hdrRequestId;
        const url = urlOverride ?? getAurumHdriUrl(environmentKey);
        if (Number.isFinite(rotation)) environmentController.setRotation(rotation as number);
        if (Number.isFinite(intensity)) environmentController.setIntensity(intensity as number);
        console.info("[AURUM][HDR METAL][REQUEST]", {
          perfil: environmentKey,
          urlSolicitada: url,
          requestId,
        });
        environmentController.load(
          url,
          requestId,
          () => vivo && requestId === hdrRequestId,
          (next) => {
            entorno = next;
            console.info("[Aurum Render][HDR metal] Carga completada", {
              perfil: environmentKey,
              urlSolicitada: url,
              urlActiva: environmentController.currentUrl,
              usandoFallback: environmentController.currentUrl === null,
            });
            invalidateRenderRef.current?.();
          },
          () => {
            console.warn("[Aurum Render][HDR metal] No se pudo cargar el HDR solicitado; se mantiene el entorno disponible", {
              perfil: environmentKey,
              urlSolicitada: url,
              urlActiva: environmentController.currentUrl,
              usandoFallback: environmentController.currentUrl === null,
            });
          }
        );
      };

      // El escenario inicial selecciona su propio Environment HDRI.

      let modelo:any = null;
      let diamondBvhRuntime: AurumDiamondBvhRuntime | null = null;
      let diamondBvhRuntimePending = false;
      const asegurarDiamanteBvh = async () => {
        if (!vivo || !modelo || diamondBvhRuntime || diamondBvhRuntimePending) return;
        diamondBvhRuntimePending = true;
        const requestedEnvironmentUrl = gemEnvironmentUrl;
        let environmentChangedWhileLoading = false;
        try {
          const runtime = await createAurumDiamondBvhRuntime({
            THREE,
            RGBELoader,
            EXRLoader,
            url: requestedEnvironmentUrl,
            camera: camara,
            quality: "interactive",
            targetFamilies: ["Diamante", "Esmeralda", "Rubí", "Rubi", "Zafiro", "Sapphire", "Amatista", "Amethyst", "Aguamarina", "Aquamarine", "Citrino", "Citrine", "Topacio", "Topacio Azul", "topacio_azul", "Blue Topaz", "BlueTopaz", "Moissanita", "Moissanite", "Turmalina Paraíba", "Turmalina Paraiba", "turmalina_paraiba", "Paraiba Tourmaline", "Paraiba", "Tanzanita", "Tanzanite"],
            onError: (error) => console.warn("[AURUM][GEM BVH] Se conserva el shader anterior para esta malla:", error),
          });
          if (!vivo || requestedEnvironmentUrl !== gemEnvironmentUrl) {
            runtime.dispose();
            environmentChangedWhileLoading = vivo && requestedEnvironmentUrl !== gemEnvironmentUrl;
            return;
          }
          diamondBvhRuntime = runtime;
          runtime.refresh(modelo);
          const diagnostics = runtime.diagnostics();
          console.info("[AURUM][GEM BVH]", diagnostics);
          invalidateRenderRef.current?.();
        } catch (error) {
          // Safe fallback: current MeshPhysicalMaterial + AURUM scintillation remain active.
          console.warn("[AURUM][DIAMOND BVH] No se pudo activar; se conserva el render anterior:", error);
        } finally {
          diamondBvhRuntimePending = false;
          if (environmentChangedWhileLoading) void asegurarDiamanteBvh();
        }
      };
      let runtimeBudget:AurumRuntimeBudget = getAurumRuntimeBudget(0);
      let liveGeometryPreparing=false;
      const lightingController = createAurumLightingController(THREE, escena, lightingStudio, shadowConfig, renderQuality);
      const lucesAurum = (lightingController as any).lights ?? {};

      // Render Quality changes the actual GPU workload, not just a label:
      // drawing-buffer resolution, shadow-map precision and gem transmission
      // resolution are updated together. EffectComposer receives the same DPR.
      composerRef.current = composer;

      const aplicarCalidadRender = (id:AurumRenderQualityId) => {
        renderQuality = getAurumRenderQuality(id);
        measuredQualityId = id;
        // Quality is an intentional render scale. Do not clamp it to devicePixelRatio:
        // otherwise Alta/Ultra are almost identical to Baja on a 1x monitor.
        const requestedDpr = Math.max(1, Math.min(2, renderQuality.pixelRatio));
        const dpr = Math.min(requestedDpr, runtimeBudget.pixelRatioCap);
        const transmissionScale = Math.min(renderQuality.transmissionScale, runtimeBudget.transmissionScaleCap);
        if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("aurumDiag") === "environment") {
          console.info("[AURUM][QUALITY][DIAGNOSTIC]", {
            selectedQuality: id,
            triangleCount: runtimeBudget.triangleCount,
            budgetTier: runtimeBudget.tier,
            requestedPixelRatio: requestedDpr,
            pixelRatioCap: runtimeBudget.pixelRatioCap,
            effectivePixelRatio: dpr,
            requestedTransmissionScale: renderQuality.transmissionScale,
            transmissionScaleCap: runtimeBudget.transmissionScaleCap,
            effectiveTransmissionScale: transmissionScale,
          });
        }
        renderer.setPixelRatio(dpr);
        composer?.setPixelRatio?.(dpr);
        applyPostQuality?.({...renderQuality, pixelRatio:dpr, qualityId:id});
        liveTransmissionScaleRef.current=transmissionScale;
        (renderer as any).transmissionResolutionScale=transmissionScale;
        renderer.shadowMap.enabled=liveFastPathRef.current ? false : renderQuality.shadows;
        // Existing shadow maps must be rebuilt at the selected precision.
        // create() is intentionally called only after disposing the previous maps;
        // the controller itself is idempotent and does not need the redundant call.
        Object.values(lucesAurum).forEach((light:any) => {
          if (light?.shadow?.map) {
            light.shadow.map.dispose?.();
            light.shadow.map = null;
          }
        });
        lightingController.create();
        renderer.shadowMap.needsUpdate = true;
        if (modelo) {
          setAurumInclusionsVisible(modelo, false);
          aplicarPerfilLive();
        }
        invalidateRenderRef.current?.();
        setRenderQualityId(id);
      };
      const actualizarLucesAurum = (patch:any) => {
        lightingController.update(patch);
        // Lighting changes affect both the beauty frame and the shadow map.
        renderer.shadowMap.needsUpdate = true;
        invalidateRenderRef.current?.();
      };
      lucesRef.current = actualizarLucesAurum;
      // Inicializar las luces configurables desde el arranque del visor.
      lightingController.create();

      const aplicarIluminacion = (id:IluminacionId) => {
        lightingController.applyPreset(id);
        renderer.shadowMap.needsUpdate = true;
        invalidateRenderRef.current?.();
        // Iluminación solo modifica luces. Scene conserva Environment y exposición.
      };

      // HDRI Ground is managed by groundController and remains disabled for now.
      const groundController = createAurumGround(THREE, escena);
      let suelo:any = groundController.mesh;
      const sceneController = createAurumSceneController(
        escena,
        renderer,
        groundController,
        environmentController,
        (id: string) => cargarHDRI(metalHdriOverride ?? id),
        nodo
      );
      // Aplicar el preset inicial mediante la única fuente de verdad de escena.
      const presetInicial = sceneController.apply("ijewelReference");
      const photoInicial = getAurumPhotographicProfile("ijewelReference");
      // Product scene starts with the same independent Gem Environment used by
      // the active photographic profile, rather than inheriting the metal HDRI.
      cargarEntornoGema(
        photoInicial.gemEnvironmentKey,
        photoInicial.gemEnvironmentRotation,
        photoInicial.gemEnvironmentIntensity
      );
      Object.assign(postRuntimeConfig, {
        ssao: photoInicial.post.ssao,
        ssaoIntensity: photoInicial.post.ssaoIntensity,
        ssaoFalloff: photoInicial.post.ssaoFalloff,
        bloom: photoInicial.post.bloom,
        bloomIntensity: photoInicial.post.bloomIntensity,
        bloomThreshold: photoInicial.post.bloomThreshold,
        bloomRadius: photoInicial.post.bloomRadius,
        lut: photoInicial.post.lut,
        lutIntensity: photoInicial.post.lutIntensity,
        gradeEnabled: photoInicial.post.gradeEnabled,
        gradeContrast: photoInicial.post.gradeContrast,
        gradeSaturation: photoInicial.post.gradeSaturation,
        taa: photoInicial.post.taa,
        dof: photoInicial.post.dof,
        dofAperture: photoInicial.post.dofAperture,
        dofMaxBlur: photoInicial.post.dofMaxBlur,
        vignette: photoInicial.post.vignette,
        vignetteDarkness: photoInicial.post.vignetteDarkness,
      });
      // La escena es la fuente de verdad también para la estrategia de iluminación.
      lightingController.applyPreset(photoInicial.lighting);
      applyPostQuality?.({...renderQuality, qualityId: renderQualityId});

      let parteActiva:any = null;
      let resaltado:any = null;
      const material = new THREE.MeshPhysicalMaterial({
        color: 0xd7ad48, metalness: 1, roughness: .12, envMapIntensity: 1.15,
        clearcoat: .08, clearcoatRoughness: .055
      });

      const dispose = (o:any) => o?.traverse((x:any) => {
        if (x.geometry) x.geometry.dispose();
        if (Array.isArray(x.material)) x.material.forEach((m:any)=>m.dispose?.());
        else x.material?.dispose?.();
      });
      const quitar = () => {        if (modelo) { modelo.userData={...(modelo.userData??{}),aurumDisposed:true}; escena.remove(modelo); disposeAurumLiveGeometry(modelo); disposeAurumThicknessCacheForTarget(modelo); dispose(modelo); modelo=null; }
        if (suelo) { escena.remove(suelo); suelo.geometry.dispose(); suelo.material.dispose(); suelo=null; }
      };
      const configurarMaterial = (mat:any, m:MaterialConfig) => {
        applyAurumMetal(mat, metalPresetFromConfig(m));
      };
      const limpiarInclusiones = (target:any) => clearAurumGemFromTarget(target);

      // LIVE material profile: iJewel's interactive view is environment-driven.
      // Clearcoat is an additional physical layer and is not required for the
      // reference metal/gem look. We disable it only in LIVE and restore the
      // authored value for CAPTURE.
      const aplicarPerfilMaterialLive = (target:any, enabled:boolean) => {
        target?.traverse?.((x:any) => {
          if (!x.isMesh) return;
          const materials=Array.isArray(x.material) ? x.material : [x.material];
          materials.forEach((m:any) => {
            if (!m?.isMeshPhysicalMaterial) return;
            // The LIVE path stays lightweight for every gemstone, including the focal diamond.
            // Full clearcoat, dispersion, iridescence and authored transmission return only for capture.
            if (enabled) {
              if (m.userData?.aurumLiveClearcoatStored === undefined) {
                m.userData={
                  ...(m.userData??{}),
                  aurumLiveClearcoatStored:Number(m.clearcoat??0),
                  aurumLiveClearcoatRoughnessStored:Number(m.clearcoatRoughness??0),
                };
              }
              // Avoid Three.js' full-screen transmission path while interacting.
              // The native environment reflection keeps facet contrast readable;
              // the exact authored transmission is restored for idle convergence.
              if (m.userData?.aurumGemFamily && m.userData?.aurumLiveTransmissionStored === undefined) {
                m.userData={
                  ...(m.userData??{}),
                  aurumLiveTransmissionStored:Number(m.transmission??0),
                };
              }
              const disableGemTransmission=Boolean(m.userData?.aurumGemFamily) && Number(m.transmission??0)!==0;
              // Official metal profile: metals keep their validated clearcoat in LIVE.
              // Only gemstones use the lightweight live clearcoat/transmission path.
              const isGem=Boolean(m.userData?.aurumGemFamily);
              if (
                isGem && (
                Number(m.clearcoat??0)!==0 ||
                Number(m.clearcoatRoughness??0)!==0 ||
                disableGemTransmission)
              ) {
                m.clearcoat=0;
                m.clearcoatRoughness=0;
                // The shader-quality controller owns dispersion/iridescence
                // storage and restoration. Keep this function limited to
                // clearcoat and transmission so capture never loses authored fire.
                if (disableGemTransmission) {
                  // Keep a lightweight but more faithful live transmission.
                  // The diamond gets the same moderate cap used by the recent PNG
                  // comparison; other gem families keep their existing live cap.
                  // Dispersion and clearcoat remain disabled while orbiting.
                  const authoredTransmission=Number(m.userData?.aurumLiveTransmissionStored??m.transmission);
                  const liveTransmissionCap=m.userData?.aurumGemFamily==="Diamante" ? 0.35 : 0.35;
                  m.transmission=Math.min(authoredTransmission,liveTransmissionCap);
                }
                m.needsUpdate=true;
              }
            } else if (m.userData?.aurumLiveClearcoatStored !== undefined) {
              m.clearcoat=Number(m.userData.aurumLiveClearcoatStored);
              m.clearcoatRoughness=Number(m.userData.aurumLiveClearcoatRoughnessStored??0);
              if (m.userData?.aurumLiveTransmissionStored !== undefined) {
                m.transmission=Number(m.userData.aurumLiveTransmissionStored);
              }
              m.needsUpdate=true;
              const next={...(m.userData??{})};
              delete next.aurumLiveTransmissionStored;
              delete next.aurumLiveClearcoatStored;
              delete next.aurumLiveClearcoatRoughnessStored;
              m.userData=next;
            }
          });
        });
      };

      const aplicarPerfilLive = () => {
        const live=liveFastPathRef.current;
        if (!modelo) {
          renderer.shadowMap.enabled=!live && renderQuality.shadows;
          return;
        }
        aplicarPerfilMaterialLive(modelo,live);
        // LIVE uses the lean native gemstone shader; CAPTURE restores the full
        // photographic shader. This avoids paying the custom optical layer on
        // every interactive fragment while preserving the beauty pipeline.
        setAurumGemShaderQuality(modelo,live ? "live" : "beauty");
        if (live) {
          renderer.shadowMap.enabled=false;
          renderer.shadowMap.needsUpdate=false;
        } else {
          renderer.shadowMap.enabled=renderQuality.shadows;
          renderer.shadowMap.needsUpdate=true;
        }
        liveTransmissionScaleRef.current=live
          ? runtimeBudget.interactionTransmissionScale
          : Math.min(renderQuality.transmissionScale, runtimeBudget.transmissionScaleCap);
        (renderer as any).transmissionResolutionScale=liveTransmissionScaleRef.current;
      };

      const aplicarGema = (g:GemaConfig, objetivo?:any) => {
        const target=objetivo||parteActiva;
        applyAurumGemToTarget(target,g,aplicarEntornoGema,()=>invalidateRenderRef.current?.());
        if (String(g?.familia ?? "").toLocaleLowerCase() === "diamante") {
          void asegurarDiamanteBvh().then(() => diamondBvhRuntime?.refresh(modelo));
        } else {
          diamondBvhRuntime?.refresh(modelo);
        }
        aplicarPerfilLive();
        invalidateRenderRef.current?.();
      };
      const aplicarMaterial = (m:MaterialConfig) => {
        if (!modelo) {
          configurarMaterial(material, m);
          return;
        }
        applyAurumMaterialToModel(modelo, parteActiva, m, material);
        const materialPostApplyAudit:any[]=[];
        modelo.traverse((x:any)=>{
          if(!x.isMesh||!x.material)return;
          const list=Array.isArray(x.material)?x.material:[x.material];
          for(const mat of list){
            if(!mat?.userData?.aurumMetalRenderProfile)continue;
            materialPostApplyAudit.push({
              mesh:x.name||x.uuid,
              material:mat.name||null,
              profileId:mat.userData?.aurumIJEWELMetalReference?.materialId??null,
              referenceSource:mat.userData?.aurumIJEWELMetalReference?.sourceRootPath??null,
              baseEnvironmentIntensity:mat.userData?.aurumMetalBaseEnvMapIntensity??null,
              finalEnvironmentIntensity:mat.envMapIntensity??null,
              roughness:mat.roughness??null,
              metalness:mat.metalness??null,
              clearcoat:mat.clearcoat??null,
              clearcoatRoughness:mat.clearcoatRoughness??null,
              calibrationMode:mat.userData?.aurumMetalCalibrationMode??"unknown",
              effectiveOptics:mat.userData?.aurumMetalEffectiveOptics??null,
              colorHex:mat.color?.getHexString?.()??null,
            });
          }
        });
        console.info("[AURUM][METAL POST-APPLY STATE]",{
          requestedProfile:String(m?.id??""),
          label:String(m?.nombre??""),
          materialCount:materialPostApplyAudit.length,
          materials:materialPostApplyAudit.slice(0,12),
        });
        aplicarPerfilLive();
        renderer.shadowMap.needsUpdate = true;
        invalidateRenderRef.current?.();
      };

      const calibrarReflejosMetalEscena = (photo:any) => {
        if (!modelo) return;
        modelo.traverse((x:any) => {
          if (!x.isMesh || !x.material) return;
          const ajustar=(m:any)=>{
            if (!m?.userData?.aurumMetalRenderProfile) return m;
            const base=Number(m.userData.aurumMetalBaseEnvMapIntensity);
            if (!Number.isFinite(base)) return m;
            // The URL calibration mode is a controlled comparison against
            // the selected catalog preset. Do not re-scale its authored HDR
            // intensity when a photographic scene is applied; normal rendering
            // keeps the existing scene-specific reflection response.
            const catalogCalibration=m.userData?.aurumMetalCalibrationMode==="catalog-reference";
            const ambientInfluence=Number(m.userData?.aurumAmbientInfluence);
            // The user's Ambientes slider has priority over scene presets.
            // Keep a non-zero floor because metallic PBR surfaces need
            // environment reflections to retain a convincing metal appearance.
            const ambientScale=Number.isFinite(ambientInfluence)
              ? 0.25+(Math.max(0,Math.min(100,ambientInfluence))/100)*0.75
              : null;
            m.envMapIntensity=ambientScale!==null
              ? base*ambientScale
              : catalogCalibration
                ? base
                : base*photo.metalEnvironmentScale*photo.highlightProtection;
            m.needsUpdate=true;
            return m;
          };
          x.material=Array.isArray(x.material)?x.material.map(ajustar):ajustar(x.material);
        });
      };

      const aplicarEscenario = (id:EscenarioId) => {
        // LIVE universal: ninguna escena ejecuta postprocesado pesado durante la interacción.
        liveFastPathRef.current = true;
        const preset = sceneController.apply(id);
        const photo = getAurumPhotographicProfile(id);
        const activeMetalHdri = metalHdriOverride ?? photo.environmentKey;
        const activeGemHdri = gemHdriOverride ?? photo.gemEnvironmentKey;
        setMetalHdriId(activeMetalHdri);
        setGemHdriId(activeGemHdri);
        // Keep metal and gemstone HDR controls independent from the scene preset.
        cargarEntornoGema(
          activeGemHdri,
          photo.gemEnvironmentRotation,
          photo.gemEnvironmentIntensity
        );
        calibrarReflejosMetalEscena(photo);
        const metalReflectionAudit:any[]=[];
        if(modelo) modelo.traverse((x:any)=>{
          if(!x.isMesh||!x.material)return;
          const list=Array.isArray(x.material)?x.material:[x.material];
          for(const m of list){
            if(!m?.userData?.aurumMetalRenderProfile)continue;
            metalReflectionAudit.push({
              mesh:x.name||x.uuid,
              material:m.name||null,
              baseEnvironmentIntensity:m.userData?.aurumMetalBaseEnvMapIntensity??null,
              finalEnvironmentIntensity:m.envMapIntensity??null,
              roughness:m.roughness??null,
              metalness:m.metalness??null,
              clearcoat:m.clearcoat??null,
              clearcoatRoughness:m.clearcoatRoughness??null,
              calibrationMode:m.userData?.aurumMetalCalibrationMode??"unknown",
              colorHex:m.color?.getHexString?.()??null,
              referenceKey:m.userData?.aurumIJEWELMetalReference?.sourceRootPath??null,
            });
          }
        });
        console.info("[AURUM][METAL REFLECTION STATE]",{
          sceneId:id,
          sceneEnvironmentKey:photo.environmentKey,
          activeMetalHdri,
          activeUrl:environmentController.currentUrl,
          fallback:environmentController.currentUrl===null,
          environmentIntensity:environmentController.intensity,
          environmentRotationRadians:environmentController.rotation,
          sceneEnvironmentIntensity:photo.environmentIntensity,
          sceneEnvironmentRotation:photo.environmentRotation,
          metalEnvironmentScale:photo.metalEnvironmentScale,
          highlightProtection:photo.highlightProtection,
          exposure:renderer.toneMappingExposure,
          toneMapping:renderer.toneMapping,
          metalMaterialCount:metalReflectionAudit.length,
          metalMaterials:metalReflectionAudit.slice(0,12),
        });
        // Scene, lighting and post are one photographic preset. This prevents
        // the previous behavior where changing only the background left the
        // same reflection rig and color response on every material.
        lightingController.applyPreset(photo.lighting);
        Object.assign(postRuntimeConfig, {
          ssao: photo.post.ssao,
          ssaoIntensity: photo.post.ssaoIntensity,
          ssaoFalloff: photo.post.ssaoFalloff,
          bloom: photo.post.bloom,
          bloomIntensity: photo.post.bloomIntensity,
          bloomThreshold: photo.post.bloomThreshold,
          bloomRadius: photo.post.bloomRadius,
          lut: photo.post.lut,
          lutIntensity: photo.post.lutIntensity,
          gradeEnabled: photo.post.gradeEnabled,
          gradeContrast: photo.post.gradeContrast,
          gradeSaturation: photo.post.gradeSaturation,
          taa: photo.post.taa,
          progressiveFrameCount: photo.post.progressiveFrameCount,
          ssr: photo.post.ssr,
          ssrIntensity: photo.post.ssrIntensity,
          ssrMaxDistance: photo.post.ssrMaxDistance,
          ssrThickness: photo.post.ssrThickness,
          dof: photo.post.dof,
          dofAperture: photo.post.dofAperture,
          dofMaxBlur: photo.post.dofMaxBlur,
          vignette: photo.post.vignette,
          vignetteDarkness: photo.post.vignetteDarkness,
        });
        applyPostQuality?.(renderQuality);
        aplicarPerfilLive();
        invalidateRenderRef.current?.();
      };
       const encuadrar = () => {
        if (!modelo) return;
        // ModelPreparation + Camera/Lighting se coordinan desde el adaptador de framing.
        // Mantener esta llamada como único punto de encuadre evita duplicar transformaciones.
        frameAurumProduct({
          camera: camara, controls: controles, lights: lucesAurum,
          groundController, lightingController, scene: escena, renderer,
        }, modelo, prepareAurumModel, aplicarEscenario, escenarioId);
        renderer.shadowMap.needsUpdate = true;
        invalidateRenderRef.current?.();
      };

      // Adaptadores de entrada: cada formato produce un Object3D común.
      // Rhino 3DM se decodifica con Rhino3dmLoader/WebAssembly y después
      // sigue exactamente el mismo flujo: Object3D -> GLB interno -> WebGL.
      const obtenerPartes = (objeto:any):ParteModelo[] => getAurumModelParts(objeto, colorRhinoHex, clasificarCapa);

      const cargar = async(file:File, informar:(paso:string)=>void) => {
        const ext=file.name.split(".").pop()?.toLowerCase();
        if (!ext || !["stl","obj","glb","fbx","3dm"].includes(ext)) {
          throw new Error("Formato no compatible. Usa STL, OBJ, GLB, FBX o 3DM.");
        }
        informar("Procesando archivo...");
        const objeto = await parseAurumInput(file,ext,material);
        // Rhino trabaja con Z como eje vertical, mientras que AURUM RENDER/Three.js
        // usa Y como eje vertical. Convertimos únicamente los 3DM para conservar
        // la orientación "de pie" con la que el modelo fue diseñado en Rhino.
        if (ext==="3dm") {
          objeto.rotation.x = -Math.PI / 2;
          objeto.updateMatrixWorld(true);
        }

        // GLB ya es una representación render-ready: conserva índices, normales
        // y materiales authored. Evitamos el round-trip GLB -> THREE -> GLB ->
        // THREE, que clonaba geometría, recalculaba/creaseaba normales y consumía
        // CPU/RAM antes de que el modelo llegara al visor.
        informar(ext==="glb" ? "Preparando visualización..." : "Convirtiendo a GLB...");
        let interno:any;
        if (ext==="glb") {
          interno = await normalizeAurumModel(
            objeto, null, ext, colorRhinoHex, clasificarCapa
          );
        } else {
          const glb = await convertAurumToGlb(objeto, colorRhinoHex, clasificarCapa);
          interno = await normalizeAurumModel(
            objeto, glb, ext, colorRhinoHex, clasificarCapa
          );
        }
        // Runtime budget is derived from actual renderable geometry, not source file size.
        // This keeps CAD-heavy jewelry responsive without changing authored geometry.
        runtimeBudget = getAurumRuntimeBudget(countAurumTriangles(interno));
        if (perfEnabled) {
          console.warn("[AURUM][RUNTIME BUDGET]", runtimeBudget);
        }
        // Re-apply the selected quality after the model is known so the GPU cap
        // is active before the first steady frame.
        const selectedQuality = renderQualityId;
        aplicarCalidadRender(selectedQuality);

        quitar();
        applyAurumInitialModelMaterials(interno,{
          gems:GEMAS,
          metals:MATERIALES,
          fallbackMaterial:material,
          applyGem:applyAurumGem,
          gemPresetFromConfig,
          configureMetal:configurarMaterial,
          createInclusions:()=>{},
          applyGemEnvironment:aplicarEntornoGema,
          initialMetalId:"plata950_pulida",
          initialGemId:"diamante_natural",
          presentation:{metalEnvironmentScale:1,metalClearcoatScale:1},
        });
        modelo=interno;
        // Opt-in experimental per-pixel BVH ray tracing for diamond meshes only.
        // The helper leaves every other gem and every metal on the existing pipeline.
        void asegurarDiamanteBvh();
        // LIVE MODE: procedural inclusions are intentionally hidden. They add
        // dozens of transparent draw calls and are not required for the base
        // product preview. CAPTURE enables them temporarily for the final image.
        setAurumInclusionsVisible(modelo, false);
        liveFastPathRef.current=true;
        aplicarPerfilLive();

        // Precompile only after the first LIVE frame has had a chance to paint.
        // This avoids competing with the initial interactive render.
        const shaderTarget=modelo;
        const scheduleShaderPrecompile=()=>{
          if (!vivo || shaderTarget!==modelo || typeof (renderer as any).compileAsync !== "function") return;
          void (renderer as any).compileAsync(shaderTarget,camara).then(() => {
            if (perfEnabled) console.info("[AURUM][SHADERS] precompile complete");
          }).catch((error:any) => {
            if (perfEnabled) console.warn("[AURUM][SHADERS] precompile skipped", error);
          });
        };
        if (typeof window !== "undefined" && "requestIdleCallback" in window) {
          (window as any).requestIdleCallback(scheduleShaderPrecompile,{timeout:1500});
        } else {
          globalThis.setTimeout(scheduleShaderPrecompile,250);
        }
        // SSR iJewel: only authored metal meshes participate in screen-space
        // reflection. Gemstones keep their own environment/refraction path.
        const ssrMetalMeshes:any[]=[];
        modelo.traverse((x:any)=>{
          if(!x.isMesh||x.userData?.aurumInternalInclusion)return;
          const meta=x.userData?.aurumRhino||{};
          const category=String(meta.categoria??"").toLowerCase();
          const materialMetal=Array.isArray(x.material)
            ? x.material.some((m:any)=>Number(m?.metalness??0)>=.9)
            : Number(x.material?.metalness??0)>=.9;
          if(category==="metal"||materialMetal)ssrMetalMeshes.push(x);
        });
        setSSRSelects?.(ssrMetalMeshes);
        // Presentación inicial determinista: producto + studioSoft + framing.
        // iJewel separates scene, camera and material configuration; Aurum does
        // the same at load time so the user sees a finished product preview.
        const presetInicialModelo = sceneController.apply("ijewelReference");
        lightingController.applyPreset(presetInicialModelo.lighting);
        const photoInicialModelo = getAurumPhotographicProfile("ijewelReference");
        calibrarReflejosMetalEscena(photoInicialModelo);
        Object.assign(postRuntimeConfig, {
          ssao: photoInicialModelo.post.ssao,
          ssaoIntensity: photoInicialModelo.post.ssaoIntensity,
          bloom: photoInicialModelo.post.bloom,
          bloomIntensity: photoInicialModelo.post.bloomIntensity,
          bloomThreshold: photoInicialModelo.post.bloomThreshold,
          bloomRadius: photoInicialModelo.post.bloomRadius,
          lut: photoInicialModelo.post.lut,
          lutIntensity: photoInicialModelo.post.lutIntensity,
          gradeEnabled: photoInicialModelo.post.gradeEnabled,
          gradeContrast: photoInicialModelo.post.gradeContrast,
          gradeSaturation: photoInicialModelo.post.gradeSaturation,
          taa: photoInicialModelo.post.taa,
          progressiveFrameCount: photoInicialModelo.post.progressiveFrameCount,
          ssr: photoInicialModelo.post.ssr,
          ssrIntensity: photoInicialModelo.post.ssrIntensity,
          ssrMaxDistance: photoInicialModelo.post.ssrMaxDistance,
          ssrThickness: photoInicialModelo.post.ssrThickness,
          dof: photoInicialModelo.post.dof,
          vignette: photoInicialModelo.post.vignette,
          vignetteDarkness: photoInicialModelo.post.vignetteDarkness,
          radius: 1,
          ssaoFalloff: 1.3,
          bias: 0.001,
        });
        applyPostQuality?.(renderQuality);
        encuadrar();
        setVista("frontal");
        // Si el GemEnvironment ya terminó de cargar, aplicarlo ahora al modelo.
        // Si todavía está en red, su callback lo aplicará al terminar.
        if (entornoGema) aplicarEntornoGema();
        setParteSeleccionada(null);
        setParteSeleccionadaNombre(null); setParteSeleccionadaCapa(null); setParteSeleccionadaCategoria("otro");
        parteActiva=null;
        limpiarResaltado();
        escena.add(modelo);
        // No reaplicar el metal globalmente al cargar: el paso anterior ya asignó\n        // materiales por categoría y una aplicación con parteActiva=null sobrescribiría\n        // las gemas recién configuradas. El metal se aplica después solo sobre la capa seleccionada.\n        if (ext!=="3dm" && parteActiva) aplicarMaterial(materialActivo);
        // Presentación inicial: usar la geometría real para encuadrar y
        // mostrar el anillo de frente, como referencia de catálogo de joyería.
        // La cámara iJewel de distancia fija dejaba pequeños los modelos Rhino
        // cuyos límites/unidades no coinciden con el modelo de referencia.
        encuadrar();
        camaraVista("frontal");
        setVista("frontal");
        requestAnimationFrame(() => {
          if (modelo) {
            camaraVista("frontal");
            // Keep the interactive preview lightweight after initial framing.
            // Full photographic post-processing is reserved for image capture.
            liveFastPathRef.current = true;
            aplicarPerfilLive();
            renderer.shadowMap.enabled = false;
            renderer.shadowMap.needsUpdate = false;
            invalidateRenderRef.current?.();
          }
        });
      };
      const camaraVista=(id:VistaId)=>{
        applyAurumCameraView(camara, controles, modelo, id, categoriaProyectoRef.current);
      };
      apiRef.current=createAurumApi({
        cargar,
        material:aplicarMaterial,
        gema:aplicarGema,
        escenario:aplicarEscenario,
        hdriGround:(config:any={})=>{
          if (config.enabled!==undefined) groundController.setHdriGroundEnabled(!!config.enabled);
        },
        iluminacion:aplicarIluminacion,
        metalHdri:(key:string)=>{
          if (!(key in AURUM_HDRI_URLS)) return;
          metalHdriOverride = key;
          setMetalHdriId(key);
          cargarHDRI(key);
        },
        gemHdri:(key:string)=>{
          const ambientPreset=AURUM_AMBIENT_PRESETS[key];
          if (ambientPreset) {
            // The ten supplied iJewel VJSON environments are first-class gem
            // HDR options. Preserve their exact URL, rotation and intensity.
            setGemHdriId(key);
            setAmbienteId(key);
            cargarEntornoGema(key,ambientPreset.rotation,ambientPreset.intensity);
            invalidateRenderRef.current?.();
            return;
          }
          if (!(key in AURUM_GEM_HDRI_URLS)) return;
          gemHdriOverride = key;
          setGemHdriId(key);
          setAmbienteId(null);
          cargarEntornoGema(key, gemEnvironmentRotation, gemEnvironmentIntensityScale);
        },
        ambiente:(key:string)=>{
          const preset=AURUM_AMBIENT_PRESETS[key];
          if (!preset) return;
          // Backwards-compatible entry point for the existing Ambientes grid.
          setAmbienteId(key);
          setGemHdriId(key);
          cargarEntornoGema(key,preset.rotation,preset.intensity);
          invalidateRenderRef.current?.();
        },
        influenciaMetalAmbiente:(percent:number)=>{
          const value=Math.max(0,Math.min(100,Number.isFinite(percent)?percent:45));
          // Keep enough environment contribution for metallic PBR to remain
          // visually metallic; the slider adjusts between 25% and 100%.
          const scale=0.25+(value/100)*0.75;
          if (!modelo) {
            console.warn("[AURUM][AMBIENT METAL] No hay modelo cargado para aplicar el control.");
            return;
          }
          let adjusted=0;
          modelo.traverse((x:any)=>{
            if(!x.isMesh||!x.material||x.userData?.aurumInternalInclusion)return;
            const adjust=(m:any)=>{
              if(!m || m.userData?.aurumOpticalProfile || m.userData?.aurumGemPhysicalModel) return m;
              const materialName=String(m.name??"").toLowerCase();
              const isAurumMetal=Boolean(m.userData?.aurumMetalRenderProfile);
              const isPbrMetal=Number(m.metalness)>=0.5;
              const looksLikeMetal=/gold|oro|metal|silver|platinum|white.?gold|yellow.?gold|greengold|whitegold/i.test(materialName);
              if(!isAurumMetal&&!isPbrMetal&&!looksLikeMetal)return m;
              if(!Number.isFinite(m.userData.aurumAmbientBaseEnvMapIntensity)){
                const authored=Number(m.userData.aurumMetalBaseEnvMapIntensity);
                m.userData.aurumAmbientBaseEnvMapIntensity=Number.isFinite(authored)
                  ? authored
                  : (Number.isFinite(m.envMapIntensity)?m.envMapIntensity:1);
              }
              const base=Number(m.userData.aurumAmbientBaseEnvMapIntensity);
              m.envMapIntensity=base*scale;
              m.userData.aurumAmbientInfluence=value;
              adjusted++;
              return m;
            };
            x.material=Array.isArray(x.material)?x.material.map(adjust):adjust(x.material);
          });
          console.info("[AURUM][AMBIENT METAL] Influencia aplicada", {percent:value,scale,materialsAdjusted:adjusted});
          invalidateRenderRef.current?.();
        },
        fondo:(key:string)=>{
          setFondoId(key);
          sceneController.setBackground(key);
          invalidateRenderRef.current?.();
        },
        sceneStudio:(_patch:any)=>{},
        reset:()=>{ controles.autoRotate=false; encuadrar(); invalidateRenderRef.current?.(); },
        autoRotar:(activo:boolean)=>{ controles.autoRotate=activo; controles.autoRotateSpeed=0.65; invalidateRenderRef.current?.(); },
        limpiar:()=>{quitar();parteActiva=null;limpiarResaltado();setParteSeleccionada(null);setParteSeleccionadaNombre(null);},
        partes:()=>modelo?obtenerPartes(modelo):[],
        seleccionarParte:(id:string)=>{
          if (!id) { parteActiva=null; setParteSeleccionada(null); setParteSeleccionadaNombre(null); limpiarResaltado(); return; }
          let encontrado:any=null;
          modelo?.traverse((x:any)=>{if(x.uuid===id) encontrado=x;});
          if(encontrado) { seleccionarMalla(encontrado); invalidateRenderRef.current?.(); }
        },
        fullscreen:()=>nodo.requestFullscreen?.(),
        vista:(id:VistaId)=>{ camaraVista(id); invalidateRenderRef.current?.(); },
        calidad:aplicarCalidadRender,
        exportGLB:async()=>{
          if(!modelo) throw new Error("Carga un modelo antes de exportar.");
          const exporter=new GLTFExporter();
          const result=await new Promise<ArrayBuffer>((resolve,reject)=>{
            exporter.parse(modelo,(output:any)=>{
              if(output instanceof ArrayBuffer) resolve(output);
              else reject(new Error("El exportador no generó un GLB binario."));
            },(error:any)=>reject(error),{binary:true,onlyVisible:true,trs:false,animations:[]});
          });
          const blob=new Blob([result],{type:"model/gltf-binary"});
          const url=URL.createObjectURL(blob);
          const link=document.createElement("a");
          link.href=url;
          link.download=(nombreProyecto||"aurum-modelo").trim().replace(/[^a-z0-9-_]+/gi,"-")+".glb";
          link.click();
          URL.revokeObjectURL(url);
        },
        exportPathTraced:async(options:{width?:number;height?:number;format?:"png"|"jpeg"|"webp";samples?:number;signal?:AbortSignal;onProgress?:(d:number,t:number)=>void}={})=>{
          if(!modelo) throw new Error("Carga un modelo antes del render final.");
          const { renderAurumPathTracedImage } = await import("../lib/aurum/path-tracer-final");
          const format=options.format==="jpeg"||options.format==="webp"?options.format:"png";
          const mime=format==="jpeg"?"image/jpeg":format==="webp"?"image/webp":"image/png";
          const loop:any=viewerLoopRef.current;
          loop?.pause?.();
          try{
            const dataUrl=await renderAurumPathTracedImage(renderer,modelo,camara,{
              width:Number(options.width)||2560,height:Number(options.height)||1440,samples:options.samples??256,mimeType:mime as any,
              environmentUrl:environmentController.currentUrl,environmentIntensity:environmentController.intensity,environmentRotationY:environmentController.rotation,
              gemEnvironmentUrl:gemEnvironmentUrl,studioScene:escena,
              signal:options.signal,onProgress:options.onProgress,
            });
            const link=document.createElement("a");
            link.href=dataUrl;
            link.download=(nombreProyecto||"aurum-render").trim().replace(/[^a-z0-9-_]+/gi,"-")+"-raytrace."+(format==="jpeg"?"jpg":format);
            link.click();
          }finally{
            loop?.resume?.();
            loop?.resize?.();
          }
        },
        exportPNG:(options:{width?:number;height?:number;format?:"png"|"jpeg"|"webp";onCapture?:(dataUrl:string)=>void}={})=>{
          if(!modelo) throw new Error("Carga un modelo antes de crear el snapshot.");
          const liveCanvas=renderer.domElement as HTMLCanvasElement | null;
          if(!liveCanvas || liveCanvas.width<2 || liveCanvas.height<2) {
            throw new Error("El visor todavía no tiene una imagen disponible para capturar.");
          }
          const isPoster=Boolean(options.onCapture);
          const originalBufferWidth=liveCanvas.width;
          const originalBufferHeight=liveCanvas.height;
          const originalPixelRatio=renderer.getPixelRatio?.()||1;
          const originalCssWidth=originalBufferWidth/originalPixelRatio;
          const originalCssHeight=originalBufferHeight/originalPixelRatio;
          const originalAspect=camara.aspect;
          const originalTransmissionResolutionScale=Number((renderer as any).transmissionResolutionScale ?? 1);
          const width=isPoster
            ? Math.max(1,Math.min(640,Math.round(Number(options.width)||640)))
            : Math.max(320,Math.min(4096,Math.round(Number(options.width)||3840)));
          const requestedHeight=Math.max(320,Math.min(4096,Math.round(Number(options.height)||2160)));
          const height=isPoster
            ? Math.max(1,Math.round(width*originalBufferHeight/originalBufferWidth))
            : requestedHeight;
          if(!isPoster && width*height>12_000_000) {
            throw new Error("La imagen supera 12 megapíxeles. Usa una resolución menor para proteger la memoria.");
          }
          // PNG capture gets a dedicated supersampling budget: render the
          // faceted diamond above output resolution, then downsample exactly once.
          // Keep the delivered file capped at 12 MP, but allow the temporary
          // WebGL buffer up to 16 MP so small facet edges receive more samples.
          // This affects only still PNG/JPEG/WebP capture, never live orbiting.
          const renderScale=isPoster?1:Math.min(1.4,Math.sqrt(16_000_000/(width*height)));
          const renderWidth=Math.max(width,Math.floor(width*renderScale));
          const renderHeight=Math.max(height,Math.floor(height*renderScale));
          const format=options.format==="jpeg"||options.format==="webp"?options.format:"png";
          const mime=format==="jpeg"?"image/jpeg":format==="webp"?"image/webp":"image/png";
          const output=document.createElement("canvas");
          output.width=width;
          output.height=height;
          const context=output.getContext("2d");
          if(!context) throw new Error("No se pudo preparar la imagen de salida.");
          let dataUrl="";
          // Prevent the live animation loop from clearing/replacing the high-resolution
          // capture between progress-frame yields. The browser can still paint React UI.
          const loop:any=viewerLoopRef.current;
          loop?.pause?.();
          try {
            // Render slightly above the requested dimensions for spatial
            // supersampling; the final file still uses exactly width x height.
            // Camera, materials, lights and both independent HDR environments stay unchanged.
            renderer.setPixelRatio(1);
            // Gems can inherit a low transmission buffer scale from the live
            // interaction budget. Restore full-resolution refraction only for
            // this isolated capture, without changing the interactive preview.
            (renderer as any).transmissionResolutionScale=1;
            renderer.setSize(renderWidth,renderHeight,false);
            if(typeof camara.aspect==="number") {
              camara.aspect=renderWidth/renderHeight;
              camara.updateProjectionMatrix?.();
            }
            // Still PNG needs the diamond-only final optical budget; the live
            // budget (3 bounces) is tuned for interaction and visibly loses facet
            // contrast/fire in a high-resolution still. Restore it in finally.
            if(!isPoster) diamondBvhRuntime?.setDiamondQuality("final");
            diamondBvhRuntime?.update();
            if(renderer.domElement.width!==renderWidth || renderer.domElement.height!==renderHeight) {
              throw new Error("El canvas WebGL no alcanzó la resolución interna de captura solicitada.");
            }
            const drawingBufferSize = renderer.getDrawingBufferSize(new THREE.Vector2());
            if(Math.round(drawingBufferSize.x)!==renderWidth || Math.round(drawingBufferSize.y)!==renderHeight){
              throw new Error("El búfer de dibujo WebGL no coincide con la resolución interna solicitada.");
            }
            let captureComposerBuffer: { width: number; height: number } | null = null;
            let captureTaaPass: any = null;
            if(composer && applyPostQuality){
              // Capture-only photographic pass: enable temporal AA and size the
              // composer to the supersampled target, not the small viewer CSS box.
              applyPostQuality({...renderQuality,pixelRatio:1,qualityId:"ultra"},{capture:true,width:renderWidth,height:renderHeight});
              captureComposerBuffer = composer.readBuffer
                ? { width: Number(composer.readBuffer.width), height: Number(composer.readBuffer.height) }
                : null;
              if(!captureComposerBuffer || captureComposerBuffer.width!==renderWidth || captureComposerBuffer.height!==renderHeight){
                throw new Error("El búfer interno del compositor no coincide con la resolución de captura solicitada.");
              }
              captureTaaPass = composer.passes?.find((pass:any)=>pass && "sampleLevel" in pass && "accumulateIndex" in pass && "accumulate" in pass) ?? null;
              if(captureTaaPass){
                // A previous viewer frame may have left TAA halfway through its
                // accumulation sequence. Every still capture must start clean.
                captureTaaPass.enabled=true;
                captureTaaPass.accumulate=true;
                captureTaaPass.sampleLevel=5; // 32 jitter samples
                captureTaaPass.accumulateIndex=-1;
              }
              // TAA converges across a fresh 32-sample sequence. This work is
              // exclusive to export; camera movement keeps the fast live path.
              for(let sample=0;sample<32;sample++){
                diamondBvhRuntime?.update();
                composer.render();
              }
            }else{
              renderer.render(escena,camara);
            }
            console.info("[AURUM][PNG CAPTURE DIAGNOSTICS]", {
              requestedOutput: { width, height },
              internalRender: { width: renderer.domElement.width, height: renderer.domElement.height },
              drawingBuffer: { width: Math.round(drawingBufferSize.x), height: Math.round(drawingBufferSize.y) },
              composerBuffer: captureComposerBuffer,
              taa: captureTaaPass ? {
                enabled: Boolean(captureTaaPass.enabled),
                accumulate: Boolean(captureTaaPass.accumulate),
                sampleLevel: Number(captureTaaPass.sampleLevel ?? -1),
                accumulateIndex: Number(captureTaaPass.accumulateIndex ?? -1),
              } : null,
              outputCanvas: { width: output.width, height: output.height },
              supersamplingScale: renderScale,
              diamondBvh: diamondBvhRuntime?.diagnostics() ?? {
                activeMeshes: 0,
                triangleCount: 0,
                diamondMeshes: 0,
                diamondTriangleCount: 0,
                enabled: false,
              },
            });
            context.fillStyle="#ffffff";
            context.fillRect(0,0,width,height);
            context.imageSmoothingEnabled=true;
            context.imageSmoothingQuality="high";
            // Downsample only once. The output canvas preserves the exact
            // requested file dimensions while benefiting from extra facet samples.
            context.drawImage(renderer.domElement,0,0,width,height);
            dataUrl=output.toDataURL(mime,0.94);
          } finally {
            // Restore the interactive diamond budget after the still capture,
            // including on failures, so orbit performance remains unchanged.
            if(!isPoster) diamondBvhRuntime?.setDiamondQuality("interactive");
            // Refresh diamond camera uniforms after restoring the live camera.
            diamondBvhRuntime?.update();
            // Restore the interactive viewport immediately, including DPR and
            // camera projection, even if capture or encoding fails.
            renderer.setPixelRatio(originalPixelRatio);
            (renderer as any).transmissionResolutionScale=originalTransmissionResolutionScale;
            renderer.setSize(originalCssWidth,originalCssHeight,false);
            if(composer && applyPostQuality){
              applyPostQuality({...renderQuality,pixelRatio:originalPixelRatio,qualityId:measuredQualityId});
            }
            if(typeof originalAspect==="number") {
              camara.aspect=originalAspect;
              camara.updateProjectionMatrix?.();
            }
            invalidateRenderRef.current?.();
            loop?.resume?.();
            loop?.resize?.();
          }
          if(!dataUrl||dataUrl.length<1000) {
            throw new Error("La captura del visor está vacía. Espera a que termine de dibujarse y vuelve a intentar.");
          }
          if(options.onCapture) {
            options.onCapture(dataUrl);
            return;
          }
          const link=document.createElement("a");
          const baseName=(nombreProyecto||"aurum-render").trim().replace(/[^a-z0-9-_]+/gi,"-");
          link.download=baseName+"-"+width+"x"+height+"."+format;
          link.href=dataUrl;
          link.click();
        },
        exportSceneSettings:()=>{
          const current=exportSettingsRef.current;
          const settings={
            format:"AURUM_SCENE_SETTINGS",
            schemaVersion:1,
            exportedAt:new Date().toISOString(),
            project:{name:current.nombreProyecto,category:current.categoriaProyecto,sourceFile:current.archivo??null},
            configuration:{materialId:current.materialId,gemaId:current.gemaId,sceneId:current.escenarioId,lightingId:current.iluminacionId,cameraView:current.vista,renderQuality:current.renderQualityId},
            reference:{renderer:"Aurum Render",comparisonTarget:"iJewel/WebGi",note:"GLB contiene el modelo y materiales exportables; luces, HDRI y postprocesado se describen como configuración y pueden requerir reconstrucción en otro visor."},
          };
          const blob=new Blob([JSON.stringify(settings,null,2)],{type:"application/json"});
          const url=URL.createObjectURL(blob);
          const link=document.createElement("a");
          link.href=url;
          link.download=(nombreProyecto||"aurum-escena").trim().replace(/[^a-z0-9-_]+/gi,"-")+".vjson";
          link.click();
          URL.revokeObjectURL(url);
        },
      });
      const limpiarResaltado = () => {
        if (!resaltado) return;
        escena.remove(resaltado);
        resaltado.geometry?.dispose?.();
        resaltado.material?.dispose?.();
        resaltado = null;
      };
      const seleccionarMalla = (obj:any) => {
        if (!obj?.isMesh) return;
        parteActiva = obj;
        const nombre = (typeof obj.name === "string" && obj.name.trim()) ? obj.name.trim() : "Componente seleccionado";
        const meta = obj.userData?.aurumRhino || {};
        const capa = meta.capa || obj.userData?.attributes?.layerName || null;
        const categoria = (meta.categoria || clasificarCapa(capa || "", meta.colorCapa)) as CategoriaParte;
        setParteSeleccionada(obj.uuid);
        setParteSeleccionadaNombre(nombre);
        setParteSeleccionadaCapa(capa);
        setParteSeleccionadaCategoria(categoria);

        // Diagnostic snapshot of the selected mesh and all gem-layer identities.
        const sourceAttrs = obj.userData?.attributes ?? {};
        const preservedSource = obj.userData?.aurumRhinoSource ?? {};
        const sourceLayerId = preservedSource.layerId ?? sourceAttrs.layerId ?? sourceAttrs.LayerId ?? meta.rhinoLayerId ?? null;
        const sourceLayerIndexRaw = preservedSource.layerIndex ?? sourceAttrs.layerIndex ?? sourceAttrs.LayerIndex ?? obj.userData?.layerIndex ?? obj.userData?.LayerIndex ?? meta.layerIndex;
        const sourceLayerIndex = sourceLayerIndexRaw !== null && sourceLayerIndexRaw !== undefined && sourceLayerIndexRaw !== "" && Number.isInteger(Number(sourceLayerIndexRaw)) && Number(sourceLayerIndexRaw) >= 0
          ? Number(sourceLayerIndexRaw) : null;
        const sourceLayerKey = String(meta.layerKey ?? "");
        const sourceLayerName = String(preservedSource.layerName ?? sourceAttrs.layerName ?? sourceAttrs.LayerName ?? capa ?? "").trim();
        const diagnosticMeshes:any[] = [];
        modelo?.traverse((mesh:any) => {
          if (!mesh?.isMesh || mesh.userData?.aurumInternalInclusion) return;
          const meshMeta = mesh.userData?.aurumRhino ?? {};
          const sourceMeta = mesh.userData?.aurumRhinoSource ?? {};
          const meshAttrs = mesh.userData?.attributes ?? {};
          const meshLayerName = String(sourceMeta.layerName ?? meshMeta.capa ?? meshAttrs.layerName ?? meshAttrs.LayerName ?? "").trim();
          const meshLayerId = sourceMeta.layerId ?? meshMeta.rhinoLayerId ?? meshAttrs.layerId ?? meshAttrs.LayerId ?? null;
          const meshLayerIndexRaw = sourceMeta.layerIndex ?? meshAttrs.layerIndex ?? meshAttrs.LayerIndex ?? mesh.userData?.layerIndex ?? mesh.userData?.LayerIndex ?? meshMeta.layerIndex;
          const meshLayerIndex = Number.isInteger(Number(meshLayerIndexRaw)) && Number(meshLayerIndexRaw) >= 0 ? Number(meshLayerIndexRaw) : null;
          const meshCategory = String(meshMeta.categoria ?? clasificarCapa(meshLayerName, meshMeta.colorCapa));
          const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).filter(Boolean);
          const sameLayer = sourceLayerName
            ? meshLayerName.toLocaleLowerCase() === sourceLayerName.toLocaleLowerCase()
            : sourceLayerKey
              ? String(meshMeta.layerKey ?? "") === sourceLayerKey
              : sourceLayerId != null
                ? String(meshLayerId ?? "") === String(sourceLayerId)
                : sourceLayerIndex != null && meshLayerIndex === sourceLayerIndex;
          diagnosticMeshes.push({
            name: mesh.name || "(sin nombre)", uuid: mesh.uuid, category: meshCategory,
            layer: meshLayerName || null, layerId: meshLayerId == null ? null : String(meshLayerId),
            layerIndex: meshLayerIndex, layerKey: meshMeta.layerKey ?? null,
            layerColor: meshMeta.colorCapa ?? meshAttrs.layerColor ?? meshAttrs.LayerColor ?? null,
            rawAttributes: {
              preservedSource: sourceMeta,
              layerName: meshAttrs.layerName ?? meshAttrs.LayerName ?? null,
              layerId: meshAttrs.layerId ?? meshAttrs.LayerId ?? null,
              layerIndex: meshAttrs.layerIndex ?? meshAttrs.LayerIndex ?? null,
              materialIndex: meshAttrs.materialIndex ?? meshAttrs.MaterialIndex ?? null,
              materialSource: meshAttrs.materialSource ?? meshAttrs.MaterialSource ?? null,
              drawColor: meshAttrs.drawColor ?? meshAttrs.DrawColor ?? null,
              objectColor: meshAttrs.objectColor ?? meshAttrs.ObjectColor ?? null,
              colorSource: meshAttrs.colorSource ?? meshAttrs.ColorSource ?? null,
              objectType: mesh.userData?.objectType ?? meshAttrs.objectType ?? meshAttrs.ObjectType ?? null,
              objectId: meshAttrs.id ?? meshAttrs.Id ?? null,
              objectName: meshAttrs.name ?? meshAttrs.Name ?? null,
              mode: meshAttrs.mode ?? meshAttrs.Mode ?? null,
              keys: Object.keys(meshAttrs),
            },
            userDataKeys: Object.keys(mesh.userData ?? {}),
            metaKeys: Object.keys(meshMeta ?? {}),
            sameSelectedLayer: sameLayer,
            vertices: mesh.geometry?.attributes?.position?.count ?? null,
            triangles: mesh.geometry?.index ? Math.floor(mesh.geometry.index.count / 3) : mesh.geometry?.attributes?.position ? Math.floor(mesh.geometry.attributes.position.count / 3) : null,
            materials: materials.map((material:any) => ({
              name: material.name || null, type: material.type || material.constructor?.name || null,
              color: material.color?.getHexString ? "#" + material.color.getHexString() : null,
            })),
          });
        });
        const relatedGemMeshes = diagnosticMeshes.filter((mesh:any) => mesh.category === "gema");
        const sameLayerMeshes = diagnosticMeshes.filter((mesh:any) => mesh.sameSelectedLayer);
        const layerAssignments = modelo?.userData?.aurumGemLayerAssignments ?? {};
        const relatedAssignment = Object.values(layerAssignments).find((assignment:any) =>
          String(assignment?.layerName ?? "").trim().toLocaleLowerCase() === sourceLayerName.toLocaleLowerCase()
        ) ?? null;
        setDiagnosticoSeleccion({
          selected: {
            name: nombre, uuid: obj.uuid, category: categoria,
            layer: sourceLayerName || null,
            layerColor: meta.colorCapa ?? sourceAttrs.layerColor ?? sourceAttrs.LayerColor ?? null,
            layerId: sourceLayerId == null ? null : String(sourceLayerId), layerIndex: sourceLayerIndex,
            layerKey: meta.layerKey ?? null, matrixSlot: meta.matrixSlot ?? null,
            metadataResolution: meta.metadataResolution ?? null,
            preservedSource: {
              layerIndex: preservedSource.layerIndex ?? null,
              layerName: preservedSource.layerName ?? null,
              layerId: preservedSource.layerId ?? null,
              layerColor: preservedSource.layerColor ?? null,
              rawLayerIndex: preservedSource.rawLayerIndex ?? null,
              rawLayerName: preservedSource.rawLayerName ?? null,
              rawLayerId: preservedSource.rawLayerId ?? null,
              materialIndex: preservedSource.materialIndex ?? null,
              objectId: preservedSource.objectId ?? null,
            },
            resolvedLayer: { layerIndex: meta.layerIndex ?? null, layerName: meta.capa ?? null, layerId: meta.rhinoLayerId ?? null, layerKey: meta.layerKey ?? null },
            visible: obj.visible !== false,
            objectType: obj.type ?? null,
            geometry: {
              vertices: obj.geometry?.attributes?.position?.count ?? null,
              triangles: obj.geometry?.index ? Math.floor(obj.geometry.index.count / 3) : obj.geometry?.attributes?.position ? Math.floor(obj.geometry.attributes.position.count / 3) : null,
              indexed: Boolean(obj.geometry?.index), normals: Boolean(obj.geometry?.attributes?.normal),
            },
            materials: (Array.isArray(obj.material) ? obj.material : [obj.material]).filter(Boolean).map((material:any) => ({
              name: material.name || null, type: material.type || material.constructor?.name || null,
              color: material.color?.getHexString ? "#" + material.color.getHexString() : null,
              transmission: material.transmission ?? null, ior: material.ior ?? null,
            })),
            rawAttributes: {
              layerName: sourceAttrs.layerName ?? sourceAttrs.LayerName ?? null,
              layerId: sourceAttrs.layerId ?? sourceAttrs.LayerId ?? null,
              layerIndex: sourceAttrs.layerIndex ?? sourceAttrs.LayerIndex ?? null,
              materialIndex: sourceAttrs.materialIndex ?? sourceAttrs.MaterialIndex ?? null,
              materialSource: sourceAttrs.materialSource ?? sourceAttrs.MaterialSource ?? null,
              drawColor: sourceAttrs.drawColor ?? sourceAttrs.DrawColor ?? null,
              objectColor: sourceAttrs.objectColor ?? sourceAttrs.ObjectColor ?? null,
              colorSource: sourceAttrs.colorSource ?? sourceAttrs.ColorSource ?? null,
              objectType: obj.userData?.objectType ?? sourceAttrs.objectType ?? sourceAttrs.ObjectType ?? null,
              objectId: sourceAttrs.id ?? sourceAttrs.Id ?? null,
              attributesKeys: Object.keys(sourceAttrs),
            },
          },
          counts: {
            totalMeshes: diagnosticMeshes.length, gemstoneMeshes: relatedGemMeshes.length,
            sameLayerMeshes: sameLayerMeshes.length,
            gemstoneMeshesOnSameLayer: sameLayerMeshes.filter((mesh:any) => mesh.category === "gema").length,
          },
          relatedGemMeshes: relatedGemMeshes.slice(0, 60),
          sameLayerMeshes: sameLayerMeshes.slice(0, 60),
          sourceLayerTable: (Array.isArray(modelo?.userData?.aurumRhinoSourceLayers) && modelo.userData.aurumRhinoSourceLayers.length
            ? modelo.userData.aurumRhinoSourceLayers
            : Array.isArray(modelo?.userData?.layers) ? modelo.userData.layers : []).map((layer:any,index:number) => ({
            index: layer?.index ?? index,
            name: layer?.name ?? layer?.Name ?? null,
            id: layer?.id ?? layer?.Id ?? null,
            color: layer?.color ? String(JSON.stringify(layer.color)) : layer?.Color ? String(JSON.stringify(layer.Color)) : null,
            visible: layer?.visible ?? layer?.Visible ?? layer?.isVisible ?? null,
            parentLayerId: layer?.parentLayerId ?? layer?.parentId ?? layer?.ParentLayerId ?? null,
            keys: Object.keys(layer ?? {}),
          })),
          sourceRootUserDataKeys: Object.keys(modelo?.userData ?? {}),
          metadataAudit: modelo?.userData?.aurumLayerMetadataAudit ?? null,
          instanceLayerHydration: modelo?.userData?.aurumInstanceLayerHydration ?? null,
          selectedInstanceSource: obj.userData?.aurumRhinoInstanceSource ?? null,
          existingAssignment: relatedAssignment,
        });
        // MatrixGold drives the library: green/metal layers open Materials,
        // blue/gem layers open Gems automatically.
        if (categoria === "metal") {
          setBibliotecaTipo("metales");
          setUxSection("materiales");
        } else if (categoria === "gema") {
          setBibliotecaTipo("gemas");
          setUxSection("gemas");
        }
        setPanel("materiales");
        limpiarResaltado();        if (obj.geometry) {
          const edges = new THREE.EdgesGeometry(obj.geometry, 18);
          resaltado = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color:0xff8a5b,transparent:true,opacity:.95,depthTest:false}));
          resaltado.renderOrder = 20;
          resaltado.position.copy(obj.getWorldPosition(new THREE.Vector3()));
          resaltado.quaternion.copy(obj.getWorldQuaternion(new THREE.Quaternion()));
          resaltado.scale.copy(obj.getWorldScale(new THREE.Vector3()));
          escena.add(resaltado);
        }
      };
      const seleccionarPorClick = (event: MouseEvent) => {
        if (!modelo || cargando) return;
        const rect = renderer.domElement.getBoundingClientRect();
        const pointer = new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(pointer, camara);
        const objetivos:any[] = [];
        modelo.traverse((x:any) => { if (x.isMesh && x.visible && !x.userData?.aurumInternalInclusion) objetivos.push(x); });
        const impacto = raycaster.intersectObjects(objetivos, false)[0];
        if (impacto?.object?.uuid) {
          seleccionarMalla(impacto.object);
        } else {
          // Clic en espacio vacío = quitar selección y devolver la biblioteca
          // a su estado neutro. El último material elegido no queda "pegado".
          parteActiva = null;
          setParteSeleccionada(null);
          setParteSeleccionadaNombre(null);
          setParteSeleccionadaCapa(null);
          setParteSeleccionadaCategoria("otro");
          limpiarResaltado();
        }
        invalidateRenderRef.current?.();
      };
      renderer.domElement.addEventListener("click", seleccionarPorClick);

      // Optional performance diagnostics. Production remains silent unless
      // ?aurumPerf=1 is explicitly added to the URL.
      // With EffectComposer, renderer.info.render otherwise resets after each
      // pass and the final snapshot can describe only a fullscreen pass.
      const perfEnabled = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("aurumPerf") === "1"
        : false;
      const perfInfo=(renderer as any).info;
      if(perfEnabled && perfInfo){
        perfInfo.autoReset=false;
        perfInfo.reset?.();
      }
      let perfLast = performance.now();
      let perfFrames = 0;
      let perfCalls = 0;
      let perfTriangles = 0;
      let perfLines = 0;
      let perfPoints = 0;
      const perfTick = () => {
        if (!perfEnabled) return;
        perfFrames++;
        const now=performance.now();
        const info=(renderer as any).info;

        // One composed frame includes RenderPass plus every EffectComposer pass.
        // Read the complete frame, then reset so the next frame starts at zero.
        perfCalls += Number(info?.render?.calls??0);
        perfTriangles += Number(info?.render?.triangles??0);
        perfLines += Number(info?.render?.lines??0);
        perfPoints += Number(info?.render?.points??0);
        info?.reset?.();

        if(now-perfLast<2000) return;
        const seconds=(now-perfLast)/1000;
        const fps=perfFrames/seconds;
        const frames=Math.max(1,perfFrames);
        console.warn("[AURUM][PERF]",{
          fps:Number(fps.toFixed(1)),
          frameMs:Number((1000/fps).toFixed(2)),
          avgCalls:Number((perfCalls/frames).toFixed(1)),
          avgTriangles:Number((perfTriangles/frames).toFixed(1)),
          avgLines:Number((perfLines/frames).toFixed(1)),
          avgPoints:Number((perfPoints/frames).toFixed(1)),
          geometries:info?.memory?.geometries??null,
          textures:info?.memory?.textures??null,
          pixelRatio:renderer.getPixelRatio?.(),
          transmissionScale:(renderer as any).transmissionResolutionScale??null,
          quality:measuredQualityId,
          measurement:"complete-composer-frame",
        });
        perfLast=now;
        perfFrames=0;
        perfCalls=0;
        perfTriangles=0;
        perfLines=0;
        perfPoints=0;
      };

      const viewerLoop = startAurumViewerLoop(
        { node:nodo, camera:camara, renderer, composer, ssaoPass, controls:controles },
        () => {
          diamondBvhRuntime?.update();
          updateTemporal?.(controles?.target ? camara.position.distanceTo(controles.target) : undefined);
          // Keep the direct renderer during orbit, but use the photographic
          // EffectComposer pipeline once settled so configured TAA/SSR/SSAO
          // actually reach the interactive preview.
          if (liveFastPathRef.current || !composer) renderer.render(escena,camara);
          else composer.render();
          perfTick();
        },
        {
          progressiveFrames: 32,
          onStart: () => {
            // Interaction path: cap raster resolution and gem transmission cost.
            // These changes happen only at interaction boundaries, never per frame.
            liveFastPathRef.current = true;
            const interactionDpr = Math.max(0.75, Math.min(1, runtimeBudget.interactionPixelRatio));
      viewerLoopRef.current = viewerLoop;
            renderer.setPixelRatio(interactionDpr);
            composer?.setPixelRatio?.(interactionDpr);
            liveTransmissionScaleRef.current = runtimeBudget.interactionTransmissionScale;
            (renderer as any).transmissionResolutionScale = runtimeBudget.interactionTransmissionScale;
            aplicarPerfilLive();
            renderer.shadowMap.enabled = false;
            invalidateRenderRef.current?.();
          },
          onEnd: () => {
            // Agreed behavior: interactive preview remains lightweight after
            // orbit settles. Full photographic gem optics, transmission,
            // dispersion, clearcoat, shadows and post-processing are capture-only.
            // Raise resolution for a sharper live view without enabling beauty effects.
            const requestedDpr = Math.max(1, Math.min(2, renderQuality.pixelRatio));
            const idleDpr = Math.min(requestedDpr, runtimeBudget.pixelRatioCap);
            renderer.setPixelRatio(idleDpr);
            composer?.setPixelRatio?.(idleDpr);
            liveFastPathRef.current = true;
            aplicarPerfilLive();
            renderer.shadowMap.enabled = false;
            renderer.shadowMap.needsUpdate = false;
            invalidateRenderRef.current?.();
          },
        }
      );
      frameRef.current = viewerLoop.frame;
      invalidateRenderRef.current = viewerLoop.invalidate;
      const obs = viewerLoop.observer;

      // Cleanup completo del Viewer: evita listeners, RAF y contextos WebGL acumulados
      // al entrar/salir de Aurum Render o cambiar de ruta.
      cleanup = () => {
        diamondBvhRuntime?.dispose();
        diamondBvhRuntime = null;
        disposeAurumViewer({
          node:nodo,
          renderer,
          controls:controles,
          observer:obs,
          clickHandler:seleccionarPorClick,
          lightingController,
          groundController,
          clearSelection:limpiarResaltado,
          environmentController,
          gemEnvironment:entornoGema,
          gemEnvironmentController,
          composer,
        });
        viewerLoop.stop();
        invalidateRenderRef.current = null;
      };

      // startAurumViewerLoop ya inicia el RAF/render loop.
      // No llamar a un animate() local inexistente: provocaba "animate is not defined".
    })().catch(e=>vivo&&setError(e?.message||"No se pudo iniciar AURUM RENDER"));
    return()=>{
    vivo=false;
    if (presentationTimerRef.current) {
      clearTimeout(presentationTimerRef.current);
      presentationTimerRef.current = null;
    }
    if(frameRef.current!==null){
      cancelAnimationFrame(frameRef.current);
      frameRef.current=null;
    }
    apiRef.current=null;
    viewerLoopRef.current=null;
    ptAbortRef.current?.abort();
    composerRef.current=null;
    cleanup();
  };
  },[]);
  useEffect(()=>{ apiRef.current?.material(materialActivo); invalidateRenderRef.current?.(); },[materialActivo]);
  useEffect(()=>{ apiRef.current?.escenario(escenarioId); invalidateRenderRef.current?.(); },[escenarioId]);
  useEffect(()=>{ apiRef.current?.iluminacion(iluminacionId); invalidateRenderRef.current?.(); },[iluminacionId]);
  useEffect(()=>{ apiRef.current?.vista(vista); invalidateRenderRef.current?.(); },[vista]);

  const cargarArchivo=useCallback(async(file:File)=>{
    setCargando(true);
    setError(null);
    setPaso("Procesando archivo...");
    setPresentationCover(null);
    setPresentationVisible(false);
    if (presentationTimerRef.current) {
      clearTimeout(presentationTimerRef.current);
      presentationTimerRef.current = null;
    }
    try {
      await apiRef.current?.cargar(file,(p:string)=>setPaso(p));
      invalidateRenderRef.current?.();
      setArchivo(file.name);
      setFormatoInterno("GLB");
      // El visor permanece en modo LIVE después de cargar el modelo.
      invalidateRenderRef.current?.();
    } catch(e) {
      setError(e instanceof Error?e.message:"No se pudo convertir el modelo");
      setArchivo(null);
      setFormatoInterno(null);
    } finally {
      setCargando(false);
      setPaso(null);
    }
  },[]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("desde-mi-nube") !== "1") return;
    const key = "aurum-render-archivo-pendiente";
    const pending = sessionStorage.getItem(key);
    if (!pending) {
      setError("No se encontró el archivo pendiente de Mi Nube. Vuelve a seleccionarlo desde la nube.");
      return;
    }
    let cancelado = false;
    let timer: number | undefined;
    let intentos = 0;
    const procesar = async () => {
      if (cancelado) return;
      if (typeof apiRef.current?.cargar !== "function") {
        if (intentos++ >= 60) {
          setError("Aurum Render tardó demasiado en inicializarse. Vuelve a abrir el archivo desde Mi Nube.");
          return;
        }
        timer = window.setTimeout(procesar, 250);
        return;
      }
      try {
        const datos = JSON.parse(pending) as { url?: string; nombre?: string };
        if (typeof datos.url !== "string" || typeof datos.nombre !== "string") throw new Error("La referencia del archivo no es válida.");
        const response = await fetch(datos.url);
        if (!response.ok) throw new Error("No se pudo descargar el 3DM privado desde Mi Nube.");
        const blob = await response.blob();
        if (cancelado) return;
        const file = new File([blob], datos.nombre, { type: blob.type || "application/octet-stream" });
        sessionStorage.removeItem(key);
        const url = new URL(window.location.href);
        url.searchParams.delete("desde-mi-nube");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
        await cargarArchivo(file);
      } catch (cause) {
        if (!cancelado) {
          sessionStorage.removeItem(key);
          setError(cause instanceof Error ? cause.message : "No se pudo abrir el archivo desde Mi Nube.");
        }
      }
    };
    void procesar();
    return () => {
      cancelado = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [cargarArchivo]);

  const limpiar=()=>{apiRef.current?.limpiar();invalidateRenderRef.current?.();setArchivo(null);setFormatoInterno(null);setPaso(null);if(fileRef.current)fileRef.current.value=""};
  const cambiarCalidad=(id:AurumRenderQualityId)=>{
    apiRef.current?.calidad(id);
    setQualityOpen(false);
  };

  const hexColor = (c:number) => "#" + c.toString(16).padStart(6, "0");
  const lightingPanel=(
    <div style={{position:"absolute",right:84,top:72,zIndex:40,width:290,maxHeight:"calc(100% - 88px)",overflowY:"auto",padding:14,borderRadius:14,background:"rgba(12,14,18,.94)",color:"#fff",boxShadow:"0 12px 35px rgba(0,0,0,.35)",border:"1px solid rgba(255,255,255,.10)",fontFamily:"Inter,system-ui"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{fontWeight:700,fontSize:14}}>AURUM LIGHTING STUDIO</div>
        <button type="button" aria-label="Cerrar" onClick={()=>setLightingOpen(false)} style={{background:"none",border:"none",color:"rgba(255,255,255,.5)",cursor:"pointer"}}><X className="size-4"/></button>
      </div>
      <label style={{display:"flex",justifyContent:"space-between",fontSize:12}}>Key <input type="checkbox" checked={lightingStudio.key.enabled} onChange={e=>actualizarLucesAurum({key:{...lightingStudio.key,enabled:e.target.checked}})}/></label>
      <label style={{display:"block",fontSize:11}}>Key intensity<input style={{width:"100%"}} type="range" min="0" max="4" step=".05" value={lightingStudio.key.intensity} onChange={e=>actualizarLucesAurum({key:{...lightingStudio.key,intensity:+e.target.value}})}/></label>
      <label style={{display:"flex",justifyContent:"space-between",fontSize:12}}>Fill <input type="checkbox" checked={lightingStudio.fill.enabled} onChange={e=>actualizarLucesAurum({fill:{...lightingStudio.fill,enabled:e.target.checked}})}/></label>
      <label style={{display:"block",fontSize:11}}>Fill intensity<input style={{width:"100%"}} type="range" min="0" max="3" step=".05" value={lightingStudio.fill.intensity} onChange={e=>actualizarLucesAurum({fill:{...lightingStudio.fill,intensity:+e.target.value}})}/></label>
      <label style={{display:"flex",justifyContent:"space-between",fontSize:12}}>Rim <input type="checkbox" checked={lightingStudio.rim.enabled} onChange={e=>actualizarLucesAurum({rim:{...lightingStudio.rim,enabled:e.target.checked}})}/></label>
      <label style={{display:"block",fontSize:11}}>Rim intensity<input style={{width:"100%"}} type="range" min="0" max="3" step=".05" value={lightingStudio.rim.intensity} onChange={e=>actualizarLucesAurum({rim:{...lightingStudio.rim,intensity:+e.target.value}})}/></label>
      <label style={{display:"flex",justifyContent:"space-between",fontSize:12}}>Gem Light <input type="checkbox" checked={lightingStudio.gem.enabled} onChange={e=>actualizarLucesAurum({gem:{...lightingStudio.gem,enabled:e.target.checked}})}/></label>
      <label style={{display:"block",fontSize:11}}>Gem intensity<input style={{width:"100%"}} type="range" min="0" max="2" step=".05" value={lightingStudio.gem.intensity} onChange={e=>actualizarLucesAurum({gem:{...lightingStudio.gem,intensity:+e.target.value}})}/></label>
    </div>
  );
  return (<>
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-[#eeede8] text-white">
      <header className="flex h-[74px] shrink-0 items-center justify-between border-b border-black/10 bg-[#f7f6f2]/95 px-5 text-[#242424] shadow-sm backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <div className="leading-none">
            <div className="font-display text-[23px] font-semibold tracking-[.16em] text-[#92743b]">AURUM <span className="tracking-normal text-[#292824]">RENDER</span></div>
            <div className="mt-1 text-[10px] tracking-[.06em] text-[#77756f]">Estudio profesional de joyería</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-black/[.08] bg-white/85 px-3 text-sm text-[#292824] shadow-sm transition hover:border-black/15 focus-within:ring-2 focus-within:ring-[#92743b]/15">
            <Gem className="size-4 text-[#55534d]"/>
            <select value={vista} onChange={e=>setVista(e.target.value as VistaId)} className="bg-transparent outline-none">
              <option className="bg-white" value={VISTAS[0]?.id}>{VISTAS[0]?.nombre || "Vista 3D"}</option>
              {VISTAS.slice(1).map(v=><option className="bg-white" key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
            <ChevronDown className="pointer-events-none -ml-1 size-4 text-[#77756f]"/>
          </label>
          <div className="hidden text-[11px] uppercase tracking-[.12em] text-[#66645e] lg:block">Taller del Joyero</div>
          <div className="grid size-10 place-items-center rounded-full border border-white/10 text-[#55534d]"><span className="text-lg">♙</span></div>
        </div>
      </header>

      {exportOpen&&<div className="absolute right-5 top-[82px] z-[80] w-[290px] rounded-2xl border border-black/10 bg-[#fbfaf7]/[.98] text-[#292824] p-4 shadow-2xl backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between"><div><div className="text-sm font-semibold text-[#292824]">Exportación AURUM</div><div className="mt-1 text-[10px] text-[#77756f]">Descarga para comparar con iJewel</div></div><button type="button" aria-label="Cerrar exportación" onClick={()=>setExportOpen(false)} className="rounded-lg p-1 text-[#77756f] hover:bg-black/[.05]"><X className="size-4"/></button></div>
        <div className="space-y-2">
          <button type="button" disabled={!archivo||exportBusy} onClick={async()=>{setExportBusy(true);try{await apiRef.current?.exportGLB();}catch(e){setError(e instanceof Error?e.message:"No se pudo exportar el GLB.");}finally{setExportBusy(false);}}} className="flex w-full items-center gap-3 rounded-xl bg-[#7168f4] px-3 py-3 text-left text-sm font-semibold text-[#292824] disabled:cursor-not-allowed disabled:opacity-40"><Gem className="size-5"/><span><span className="block">Descargar modelo .glb</span><span className="block text-[10px] font-normal text-[#292824]/85">Geometría y materiales exportables</span></span></button>
          <button type="button" onClick={()=>setSnapshotOpen(v=>!v)} aria-expanded={snapshotOpen} className="flex w-full items-center gap-3 rounded-xl border border-black/10 bg-black/[.025] px-3 py-3 text-left text-sm text-[#292824] hover:bg-black/[.05]"><ImageIcon className="size-5"/><span className="min-w-0 flex-1"><span className="block">Snapshot de producto</span><span className="block text-[10px] text-[#77756f]">Resolución y formato de imagen</span></span><ChevronDown className={"size-4 transition-transform "+(snapshotOpen?"rotate-180":"")}/></button>
          {snapshotOpen&&<div className="rounded-xl border border-black/10 bg-black/[.025] p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#77756f]">Salida de imagen</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] text-[#66645e]">Ancho (px)<input type="number" min={320} max={4096} step={160} value={snapshotWidth} onChange={e=>setSnapshotWidth(e.target.value)} className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-2 text-xs text-[#292824] outline-none focus:border-[#92743b]"/></label>
              <label className="text-[10px] text-[#66645e]">Alto (px)<input type="number" min={320} max={4096} step={120} value={snapshotHeight} onChange={e=>setSnapshotHeight(e.target.value)} className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-2 text-xs text-[#292824] outline-none focus:border-[#92743b]"/></label>
            </div>
            <label className="mt-2 block text-[10px] text-[#66645e]">Formato
              <select value={snapshotFormat} onChange={e=>setSnapshotFormat(e.target.value as "png"|"jpeg"|"webp")} className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-2 text-xs text-[#292824] outline-none focus:border-[#92743b]">
                <option value="png">PNG · máxima compatibilidad</option><option value="jpeg">JPEG · fotografía ligera</option><option value="webp">WebP · archivo optimizado</option>
              </select>
            </label>
            <div className="mt-2 text-[10px] leading-relaxed text-[#858178]">La captura vuelve a renderizar la joya a la resolución elegida y usa fondo blanco.</div>
            <button type="button" disabled={!archivo||exportBusy} onClick={()=>{setExportBusy(true);setError(null);window.setTimeout(()=>{try{apiRef.current?.exportPNG({width:Number(snapshotWidth),height:Number(snapshotHeight),format:snapshotFormat});setSnapshotOpen(false);}catch(e){setError(e instanceof Error?e.message:"No se pudo generar la imagen.");}finally{setExportBusy(false);}},50);}} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#7168f4] px-3 py-2.5 text-xs font-semibold text-[#292824] disabled:cursor-not-allowed disabled:opacity-40"><Download className="size-4"/>{exportBusy?"Procesando imagen…":`Descargar ${snapshotFormat.toUpperCase()} · ${snapshotWidth||"3840"} × ${snapshotHeight||"2160"}`}</button>
            {exportBusy&&<div className="mt-3 rounded-lg border border-[#7168f4]/20 bg-white p-3" role="status" aria-live="polite"><div className="mb-2 flex items-center justify-between gap-2 text-[11px]"><span className="font-medium text-[#292824]">Renderizando imagen de alta resolución</span><RotateCw className="size-4 animate-spin" /><span className="text-[#7168f4]">En proceso</span></div><div className="h-2 overflow-hidden rounded-full bg-[#e8e6f8]"><div className="h-full w-1/3 rounded-full bg-[#7168f4]"/></div><p className="mt-2 text-[10px] leading-relaxed text-[#77756f]">La captura está procesando las facetas del diamante. La interfaz puede quedar temporalmente ocupada.</p></div>}
            <div className="mt-3 border-t border-black/10 pt-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[.14em] text-[#92743b]">Render final · Ray tracing real</div>
              <div className="mb-2 text-[10px] leading-relaxed text-[#77756f]">Trazado de rayos progresivo: refracción y reflejos internos reales en gemas. Más lento; la dispersión de color aún no se traza.</div>
              <label className="block text-[10px] text-[#66645e]">Muestras
                <select value={ptSamples} disabled={!!ptProgress} onChange={e=>setPtSamples(e.target.value)} className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-2 text-xs text-[#292824] outline-none">
                  <option value="64">64 · borrador</option><option value="256">256 · alta</option><option value="1024">1024 · máxima</option>
                </select>
              </label>
              {ptProgress?<button type="button" onClick={()=>ptAbortRef.current?.abort()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-black/15 px-3 py-2.5 text-xs font-semibold text-[#292824]">Cancelar · {ptProgress}</button>
              :<button type="button" disabled={!archivo||exportBusy} onClick={async()=>{const ac=new AbortController();ptAbortRef.current=ac;setPtProgress("preparando…");setError(null);try{await apiRef.current?.exportPathTraced({width:Number(snapshotWidth),height:Number(snapshotHeight),format:snapshotFormat,samples:Number(ptSamples),signal:ac.signal,onProgress:(d:number,t:number)=>setPtProgress(d+" / "+t)});}catch(e:any){if(e?.name!=="AbortError")setError(e instanceof Error?e.message+" Se mantiene el render actual.":"No se pudo completar el render final.");}finally{ptAbortRef.current=null;setPtProgress(null);}}} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-3 py-2.5 text-xs font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"><Download className="size-4"/>Render final con ray tracing</button>}
            </div>
          </div>}
          <button type="button" onClick={()=>apiRef.current?.exportSceneSettings()} className="flex w-full items-center gap-3 rounded-xl border border-black/10 bg-black/[.025] px-3 py-3 text-left text-sm text-[#292824] hover:bg-black/[.05]"><FileJson className="size-5"/><span><span className="block">Configuración .vjson</span><span className="block text-[10px] text-[#77756f]">Escena, cámara, calidad y selección</span></span></button>
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-[#77756f]">El GLB exporta el modelo y sus materiales compatibles con glTF. Los shaders personalizados, el HDRI y los efectos de pantalla pueden no reproducirse idénticos en otros visores.</p>
      </div>}
      <div className="flex min-h-0 flex-1 gap-3 bg-[#eeede8] p-3">
        <aside className="w-[336px] shrink-0 overflow-hidden rounded-2xl border border-black/[.07] bg-[#f9f8f5] text-[#292824] shadow-[0_8px_28px_rgba(36,32,20,.045)]">
          <div className="h-full overflow-y-auto">
            <section className="border-b border-black/10 bg-black/[.02] px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#77756f]">Proyecto</div>
                <span className="rounded-full border border-black/10 px-2 py-1 text-[9px] text-[#77756f]">AURUM STUDIO</span>
              </div>
              <label className="mb-3 block text-[10px] font-medium text-[#66645e]">Nombre del proyecto
                <input value={nombreProyecto} onChange={e=>setNombreProyecto(e.target.value)} maxLength={100} placeholder="Nombre de tu diseño" className="mt-1.5 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-[#292824] outline-none transition placeholder:text-[#99968d] focus:border-[#92743b]/65 focus:ring-2 focus:ring-[#92743b]/10"/>
              </label>
              <label className="block text-[10px] font-medium text-[#66645e]">Tipo de joya
                <select value={categoriaProyecto} onChange={e=>setCategoriaProyecto(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-[#292824] outline-none transition focus:border-[#92743b]/65">
                  {["Anillo","Collar","Dije","Aretes","Pulsera","Brazalete","Broche","Otro"].map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </section>
            <div className="mx-4 mt-3 mb-2 grid grid-cols-3 gap-1 rounded-xl border border-black/[.07] bg-[#eeede8] p-1" role="tablist" aria-label="Biblioteca de joyería">
              {([{id:"materiales",label:"Materiales",count:MATERIALES.length},{id:"gemas",label:"Gemas",count:GEMAS.length},{id:"escena",label:"Escenas",count:ESCENARIOS.length},{id:"hdrMetales",label:"HDR Metales",count:Object.keys(AURUM_HDRI_URLS).length},{id:"hdrGemas",label:"HDR Gemas",count:Object.keys(AURUM_GEM_HDRI_URLS).length+Object.keys(AURUM_AMBIENT_PRESETS).length},{id:"fondos",label:"Fondos",count:8}] as const).map(tab=><button key={tab.id} type="button" role="tab" aria-selected={uxSection===tab.id} onClick={()=>setUxSection(tab.id)} className={"min-w-0 rounded-lg px-1.5 py-2 text-[11px] font-medium transition-all "+(uxSection===tab.id?"bg-white text-[#292824] shadow-sm":"text-[#77756f] hover:text-[#292824]")}><span className="block truncate">{tab.label}</span><span className={"mt-0.5 block text-[9px] "+(uxSection===tab.id?"text-[#92743b]":"text-[#99968d]")}>{tab.count}</span></button>)}
            </div>
            <section className="px-4 py-1">
              {uxSection==="materiales"&&<div className="pb-5">
                <label className="mb-3 flex h-9 items-center gap-2 rounded-xl border border-black/[.08] bg-white px-3 text-[#77756f] focus-within:border-[#92743b]/50"><ImageIcon className="size-3.5 shrink-0"/><input value={busquedaMateriales} onChange={e=>{setBusquedaMateriales(e.target.value);if(e.target.value.trim())setMostrarTodosMateriales(true);}} placeholder="Buscar material o acabado…" className="min-w-0 flex-1 bg-transparent text-xs text-[#292824] outline-none placeholder:text-[#99968d]"/></label>
                <div className="grid grid-cols-4 gap-2.5 pb-1">
                  {materialesVisibles.map(m=><button key={m.id} type="button" title={m.nombre} aria-label={m.nombre}
                    onClick={()=>{setBibliotecaTipo("metales");setMaterialId(m.id);apiRef.current?.material(m)}}
                    className={"group relative flex flex-col items-center rounded-2xl border p-2 transition-all duration-200 "+(materialId===m.id?"border-[#92743b]/35 bg-white shadow-[0_3px_12px_rgba(50,42,20,.07)]":"border-transparent hover:border-black/[.07] hover:bg-white/70")}>
                    <span className={"relative grid size-12 place-items-center rounded-full border-2 transition "+(materialId===m.id?"border-[#92743b] shadow-[0_0_10px_rgba(146,116,59,.16)]":"border-black/10 group-hover:border-black/20")}>
                      <span className="size-10 rounded-full shadow-[inset_-5px_-6px_9px_rgba(0,0,0,.45),inset_5px_4px_8px_rgba(255,255,255,.35),0_3px_8px_rgba(0,0,0,.45)]"
                        style={{background:`radial-gradient(circle at 32% 27%,rgba(255,255,255,.78) 0 6%,rgba(255,255,255,.18) 17%,transparent 34%),linear-gradient(145deg,rgba(255,255,255,.42),transparent 34%),${hexColor(m.color)}`}}/>
                    </span>
                    <span className="mt-2 w-full truncate text-center text-[10px] leading-tight text-[#55534d]">{m.nombre}</span>
                  </button>)}
                </div>
                <button type="button" aria-expanded={mostrarTodosMateriales} onClick={()=>setMostrarTodosMateriales(v=>!v)} className="mt-3 w-full rounded-lg border border-black/10 bg-black/[.025] px-3 py-2 text-[10px] font-semibold text-[#55534d] transition hover:border-[#92743b]/45 hover:text-[#292824]">
                  {mostrarTodosMateriales ? "Mostrar menos materiales" : `Ver más materiales (${MATERIALES.length})`}
                </button>
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-black/10 bg-black/[.02] p-2">
                  <span className="size-8 shrink-0 rounded-full border border-black/15 shadow-inner" style={{background:hexColor(materialActivo.color)}}/>
                  <p className="truncate text-[10px] text-[#55534d]">{materialActivo.nombre}</p>
                </div>
              </div>}
              {uxSection==="gemas"&&<div className="pb-5">
                <label className="mb-3 flex h-9 items-center gap-2 rounded-xl border border-black/[.08] bg-white px-3 text-[#77756f] focus-within:border-[#92743b]/50"><Gem className="size-3.5 shrink-0"/><input value={busquedaGemas} onChange={e=>{setBusquedaGemas(e.target.value);if(e.target.value.trim())setMostrarTodasGemas(true);}} placeholder="Buscar gema por nombre…" className="min-w-0 flex-1 bg-transparent text-xs text-[#292824] outline-none placeholder:text-[#99968d]"/></label>
                <div className="grid grid-cols-4 gap-2.5 pb-1">
                  {gemasVisibles.map(g=><button key={g.id} type="button" title={g.nombre} aria-label={g.nombre}
                    onClick={()=>{setBibliotecaTipo("gemas");setGemaId(g.id);apiRef.current?.gema(g)}}
                    className={"group relative flex flex-col items-center rounded-2xl border p-2 transition-all duration-200 "+(gemaId===g.id?"border-[#92743b]/35 bg-white shadow-[0_3px_12px_rgba(50,42,20,.07)]":"border-transparent hover:border-black/[.07] hover:bg-white/70")}>
                    <span className={"relative grid size-12 place-items-center rounded-full border-2 transition "+(gemaId===g.id?"border-[#92743b] shadow-[0_0_10px_rgba(146,116,59,.16)]":"border-black/10 group-hover:border-white/30")}>
                      <span className="relative size-10 overflow-hidden rounded-full shadow-[inset_-4px_-5px_9px_rgba(0,0,0,.5),inset_4px_3px_8px_rgba(255,255,255,.28),0_3px_8px_rgba(0,0,0,.5)]"
                        style={{background:`radial-gradient(circle at 30% 24%,rgba(255,255,255,.82) 0 5%,rgba(255,255,255,.18) 12%,transparent 28%),conic-gradient(from 20deg,rgba(255,255,255,.28),transparent 12%,rgba(0,0,0,.18) 25%,rgba(255,255,255,.22) 38%,transparent 52%,rgba(0,0,0,.2) 67%,rgba(255,255,255,.24) 82%,transparent),${hexColor(g.color)}`}}/>
                    </span>
                    <span className="mt-1.5 w-full truncate text-center text-[10px] text-[#292824]/70">{g.nombre}</span>
                  </button>)}
                </div>
                <button type="button" aria-expanded={mostrarTodasGemas} onClick={()=>setMostrarTodasGemas(v=>!v)} className="mt-3 w-full rounded-lg border border-black/10 bg-black/[.025] px-3 py-2 text-[10px] font-semibold text-[#55534d] transition hover:border-[#92743b]/45 hover:text-[#292824]">
                  {mostrarTodasGemas ? "Mostrar menos gemas" : `Ver más gemas (${GEMAS.length})`}
                </button>
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-black/10 bg-black/[.02] p-2">
                  <span className="size-8 shrink-0 rounded-full border border-black/15 shadow-inner" style={{background:hexColor(gemaActiva.color)}}/>
                  <p className="truncate text-[10px] text-[#55534d]">{gemaActiva.nombre}</p>
                </div>
              </div>}
              {uxSection==="escena"&&<div className="grid grid-cols-3 gap-3 pb-5">
                {ESCENARIOS.map(e=><button key={e.id} type="button" onClick={()=>{setEscenarioId(e.id)}} className={"group text-center "+(escenarioId===e.id?"text-[#292824]":"text-[#45433e]")}>
                  <span className={"block aspect-[1.18] overflow-hidden rounded-xl border-2 transition "+(escenarioId===e.id?"border-[#34c7ff] shadow-[0_0_18px_rgba(52,199,255,.12)]":"border-transparent group-hover:border-black/15")}><span className={"block h-full w-full "+e.clase}/></span>
                  <span className="mt-2 block text-[10px]">{e.nombre}</span>
                </button>)}
              </div>}
              {uxSection==="hdrMetales"&&<div className="space-y-4 pb-5">
                <div className="rounded-xl border border-black/[.07] bg-white p-3">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#92743b]">Entorno HDR de metales</div>
                  <select value={metalHdriId} onChange={e=>apiRef.current?.metalHdri(e.target.value)} className="w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2 text-xs text-[#292824] outline-none">
                    {Object.keys(AURUM_HDRI_URLS).map(key=><option key={key} value={key}>{({ijewelMetal:"Estudio premium de metales",studioSoft:"Estudio suave",studioHard:"Estudio contrastado",jewelry:"Estudio joyería",luxury:"Estudio lujo",monochrome:"Monocromo",warm:"Cálido",white:"Estudio blanco"} as Record<string,string>)[key]??key}</option>)}
                  </select>
                  <p className="mt-2 text-[10px] leading-relaxed text-[#77756f]">Controla los reflejos del oro, plata y demás metales sin cambiar el HDR de las gemas.</p>
                </div>
              </div>}
              {uxSection==="hdrGemas"&&<div className="space-y-4 pb-5">
                <div className="rounded-xl border border-black/[.07] bg-white p-3">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#92743b]">Entorno HDR de gemas</div>
                  <select value={gemHdriId} onChange={e=>apiRef.current?.gemHdri(e.target.value)} className="w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2 text-xs text-[#292824] outline-none">
                    {[
                      ...Object.keys(AURUM_GEM_HDRI_URLS).map(key=>({key,label:({ijewelGem:"Estudio premium de gemas",gemDiamond:"Estudio diamante",gemWhite:"Estudio blanco",gemNeutral:"Estudio neutro",gemColor:"Estudio cálido",gemLuxury:"Estudio lujo"} as Record<string,string>)[key]??key})),
                      ...Object.values(AURUM_AMBIENT_PRESETS).map(preset=>({key:preset.id,label:preset.name})),
                    ].map(option=><option key={option.key} value={option.key}>{option.label}</option>)}
                  </select>
                  <p className="mt-2 text-[10px] leading-relaxed text-[#77756f]">Selecciona un HDR de estudio o uno de los diez ambientes importados. Los metales permanecen independientes.</p>
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.12em] text-[#92743b]">10 ambientes importados · comparar gemas</div>
                <div className="grid grid-cols-3 gap-3">
                  {Object.values(AURUM_AMBIENT_PRESETS).map((preset,index)=>{
                    const looks=[
                      "radial-gradient(ellipse at 30% 24%,#fff9df 0 8%,transparent 32%),linear-gradient(125deg,#d9d1b7 0%,#f7f5ed 34%,#77766d 58%,#f3e5bd 78%,#343630 100%)",
                      "radial-gradient(ellipse at 70% 22%,#ffffff 0 7%,transparent 30%),linear-gradient(135deg,#f4f4f1 0%,#aeb6bd 30%,#f9fafb 47%,#5d6670 69%,#e3e7e8 100%)",
                      "radial-gradient(ellipse at 24% 30%,#fff4d9 0 9%,transparent 31%),linear-gradient(115deg,#3c454b 0%,#d8d5c9 25%,#f9f6e9 43%,#4e555b 64%,#b5a47e 100%)",
                      "radial-gradient(ellipse at 72% 25%,#ffffff 0 8%,transparent 30%),linear-gradient(135deg,#d5d9dc 0%,#f9faf9 25%,#747f8a 50%,#e8e9e6 72%,#353c43 100%)",
                      "radial-gradient(ellipse at 30% 20%,#fff2c6 0 8%,transparent 30%),linear-gradient(125deg,#4d3b2b 0%,#c8a96c 25%,#fff0c9 43%,#5d5040 66%,#d8d0bb 100%)",
                      "radial-gradient(ellipse at 60% 18%,#ffffff 0 7%,transparent 30%),linear-gradient(120deg,#f0eee6 0%,#8b939a 27%,#ffffff 45%,#59636d 69%,#d3d5d4 100%)",
                      "radial-gradient(ellipse at 24% 22%,#fff9e8 0 8%,transparent 30%),linear-gradient(130deg,#3e4146 0%,#aeb4b8 25%,#f8f6ee 45%,#737a80 68%,#c6b58d 100%)",
                      "radial-gradient(ellipse at 75% 20%,#fff3d5 0 8%,transparent 31%),linear-gradient(130deg,#8d7150 0%,#f6e3b5 27%,#fffdf5 45%,#4d4b46 68%,#b3a28a 100%)",
                      "radial-gradient(ellipse at 32% 22%,#ffffff 0 8%,transparent 30%),linear-gradient(130deg,#d9dedf 0%,#ffffff 26%,#7e878d 48%,#f3f3ef 70%,#454b50 100%)",
                      "radial-gradient(ellipse at 72% 24%,#fff3c9 0 8%,transparent 30%),linear-gradient(130deg,#514637 0%,#dfc58b 25%,#fff8e8 44%,#565b5e 68%,#e4dfd0 100%)"
                    ];
                    return <button key={preset.id} type="button" title={preset.name} aria-label={preset.name} aria-pressed={ambienteId===preset.id} onClick={()=>apiRef.current?.gemHdri(preset.id)} className={"group min-w-0 text-center "+(ambienteId===preset.id?"text-[#292824]":"text-[#45433e]")}>
                      <span className={"relative mb-1.5 block aspect-[1.12] overflow-hidden rounded-xl border-2 transition "+(ambienteId===preset.id?"border-[#92743b] shadow-[0_0_12px_rgba(146,116,59,.18)]":"border-transparent group-hover:border-black/15")}>
                        <span className="absolute inset-0" style={{background:looks[index]}}/>
                        <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent"/>
                        <span className="absolute left-1.5 top-1.5 rounded-md border border-white/35 bg-black/25 px-1.5 py-0.5 text-[8px] font-semibold text-white">HDR</span>
                        {ambienteId===preset.id&&<span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-[#92743b] text-[9px] text-white">✓</span>}
                        <span className="absolute inset-x-0 bottom-1.5 text-[9px] font-medium tracking-wide text-white drop-shadow">{String(index+1).padStart(2,"0")}</span>
                      </span>
                      <span className="block truncate text-[10px]">{preset.name}</span>
                    </button>;
                  })}
                </div>

                </div>
              </div>}
              {uxSection==="fondos"&&<div className="space-y-3 pb-5">
                <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#92743b]">Fondo de presentación</div>
                {[{id:"escena",label:"Según la escena",swatch:"linear-gradient(135deg,#fff,#e9e7df)"},{id:"blanco",label:"Blanco puro",swatch:"#ffffff"},{id:"marfil",label:"Marfil cálido",swatch:"#f4f1e9"},{id:"grisClaro",label:"Gris claro",swatch:"#e7e7e4"},{id:"grisMedio",label:"Gris medio",swatch:"#a6a6a3"},{id:"grisOscuro",label:"Gris oscuro",swatch:"#303236"},{id:"negro",label:"Negro",swatch:"#090b0e"},{id:"transparente",label:"Transparente",swatch:"linear-gradient(45deg,#ddd 25%,transparent 25%,transparent 75%,#ddd 75%),linear-gradient(45deg,#ddd 25%,#fff 25%,#fff 75%,#ddd 75%)"}].map(bg=><button key={bg.id} type="button" onClick={()=>apiRef.current?.fondo(bg.id)} className={"flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition "+(fondoId===bg.id?"border-[#92743b]/50 bg-white shadow-sm":"border-black/[.07] bg-white/60 hover:bg-white")}><span className="size-8 shrink-0 rounded-lg border border-black/10" style={{background:bg.swatch}}/><span className="flex-1 text-xs text-[#45433e]">{bg.label}</span>{fondoId===bg.id&&<span className="text-xs font-semibold text-[#92743b]">✓</span>}</button>)}
                <p className="px-1 text-[10px] leading-relaxed text-[#77756f]">Cambiar el fondo no modifica los HDR ni los perfiles de materiales.</p>
              </div>}
            </section>
            <div className="px-5 pb-6">
              <button type="button" onClick={()=>setPanel("iluminacion")} className="flex w-full items-center justify-between rounded-xl border border-black/10 bg-black/[.025] px-3 py-3 text-left hover:border-[#92743b]/45">
                <span><span className="block text-[9px] uppercase tracking-[.16em] text-[#858178]">Más control</span><span className="mt-1 block text-xs text-[#45433e]">Iluminación y render</span></span>
                <SlidersHorizontal className="size-4 text-[#92743b]"/>
              </button>
            </div>
          </div>
        </aside>

        <main className="relative min-w-0 flex-1 overflow-hidden rounded-2xl bg-[#090b0e]">
          <div ref={visorRef} className="absolute inset-0">
            {!archivo&&!cargando&&<div className="absolute inset-0 z-10 grid place-items-center p-8 text-center"><div><input ref={fileRef} type="file" accept=".stl,.obj,.glb,.fbx,.3dm" className="hidden" onChange={(e)=>{const file=e.target.files?.[0];if(file)cargarArchivo(file)}}/><button type="button" onClick={()=>fileRef.current?.click()} className="group rounded-2xl px-8 py-6 transition hover:bg-white/[.025]"><span className="mx-auto grid size-20 place-items-center rounded-3xl border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37] shadow-[0_0_30px_rgba(212,175,55,.08)] transition group-hover:border-[#d4af37]/60 group-hover:bg-[#d4af37]/15"><Upload className="size-8"/></span><h2 className="mt-5 text-xl font-semibold text-white">Carga tu diseño de joyería</h2><p className="mt-2 text-sm text-white/40">STL · OBJ · GLB · FBX · Rhino 3DM</p><span className="mt-4 inline-flex rounded-lg bg-[#d4af37] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-black">Seleccionar archivo</span></button></div></div>}
            {(cargando || presentationCover) && <div
              className={"absolute inset-0 z-40 overflow-hidden transition-opacity duration-700 "+((cargando || presentationVisible)?"pointer-events-auto opacity-100":"pointer-events-none opacity-0")}
              aria-live="polite"
            >
              {presentationCover
                ? <img src={presentationCover} alt="Presentación del diseño" className={"absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] "+(presentationVisible?"scale-100":"scale-[1.015]")} />
                : <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,#ffffff_0%,#f2f2f0_48%,#d8d9d7_100%)]" />
              }
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/10" />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/15 to-transparent" />
              <div className="absolute bottom-5 left-5 flex items-center gap-2.5 rounded-full border border-black/10 bg-white/72 px-3 py-2 shadow-lg backdrop-blur-md">
                <span className="grid size-7 place-items-center rounded-full border border-[#b99642]/40 bg-white/80">
                  <span className="text-[11px] font-semibold tracking-[.16em] text-[#b99642]">A</span>
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-[.24em] text-black/55">AURUM RENDER</span>
              </div>
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
                <div className={"mx-auto mb-3 grid size-10 place-items-center rounded-full border border-black/10 bg-white/65 shadow-xl backdrop-blur-sm "+(presentationCover?"opacity-0":"opacity-100")}>
                  <div className="size-4 animate-spin rounded-full border-2 border-black/10 border-t-[#b99642]" />
                </div>
                <div className={"text-[10px] font-medium uppercase tracking-[.34em] text-black/45 transition-opacity duration-500 "+(presentationCover?"opacity-0":"opacity-100")}>
                  {paso || "Preparando presentación"}
                </div>
              </div>
              <div className="absolute bottom-5 right-5 h-1 w-28 overflow-hidden rounded-full bg-black/10">
                <div className={"h-full rounded-full bg-[#b99642] transition-all duration-[1000ms] "+(presentationCover?"w-full":"w-2/5")} />
              </div>
            </div>}
            {error&&<div className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-red-400/20 bg-red-950/80 px-4 py-2 text-xs text-red-200">{error}</div>}
            {false&&parteSeleccionada&&diagnosticoSeleccion&&<div className="absolute left-3 top-3 z-30 w-[min(430px,calc(100%-24px))] max-h-[78%] overflow-y-auto rounded-xl border border-[#d4af37]/50 bg-[#101214]/95 p-3 text-[10px] leading-relaxed text-white shadow-2xl backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-[.16em] text-[#d4af37]">Diagnóstico de selección</div>
                  <div className="break-words text-xs font-semibold text-white">{parteSeleccionadaNombre||"Componente"}</div>
                  <div className="mt-1 break-all text-[9px] text-white/45">{diagnosticoSeleccion.selected.uuid}</div>
                </div>
                <button type="button" title="Cerrar diagnóstico" onClick={()=>{setParteSeleccionada(null);setDiagnosticoSeleccion(null);}} className="rounded-md px-2 py-1 text-white/60 hover:bg-white/10 hover:text-white">✕</button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <div className="rounded-lg bg-white/[.06] p-2"><div className="text-white/45">Categoría</div><div className="font-semibold">{diagnosticoSeleccion.selected.category}</div></div>
                <div className="rounded-lg bg-white/[.06] p-2"><div className="text-white/45">Capa</div><div className="break-words font-semibold">{diagnosticoSeleccion.selected.layer||"NO RESUELTA"}</div></div>
                <div className="rounded-lg bg-white/[.06] p-2"><div className="text-white/45">Mallas totales / gemas</div><div className="font-semibold">{diagnosticoSeleccion.counts.totalMeshes} / {diagnosticoSeleccion.counts.gemstoneMeshes}</div></div>
                <div className="rounded-lg bg-white/[.06] p-2"><div className="text-white/45">Gemas en esta capa</div><div className="font-semibold">{diagnosticoSeleccion.counts.gemstoneMeshesOnSameLayer}</div></div>
              </div>
              <div className="mt-2 rounded-lg border border-white/10 p-2">
                <div className="mb-1 font-semibold text-[#d4af37]">Identidad de capa (dato clave)</div>
                <div className="break-all"><span className="text-white/45">layerKey:</span> {String(diagnosticoSeleccion.selected.layerKey??"NO DISPONIBLE")}</div>
                <div className="break-all"><span className="text-white/45">ID capa origen:</span> {String(diagnosticoSeleccion.selected.layerId??"NO DISPONIBLE")} <span className="text-white/45">· índice origen:</span> {String(diagnosticoSeleccion.selected.layerIndex??"NO DISPONIBLE")}</div>
                <div className="mt-1 rounded bg-white/[.04] p-1.5">
                  <div className="font-semibold text-white/80">Origen conservado antes del GLB</div>
                  <div className="break-all">Nombre: {String(diagnosticoSeleccion.selected.preservedSource?.layerName??"NO CAPTURADO")} · índice: {String(diagnosticoSeleccion.selected.preservedSource?.layerIndex??"NO CAPTURADO")}</div>
                  <div className="break-all">ID: {String(diagnosticoSeleccion.selected.preservedSource?.layerId??"NO CAPTURADO")}</div>
                  <div className="break-all">Atributos brutos: índice {String(diagnosticoSeleccion.selected.preservedSource?.rawLayerIndex??"—")} · nombre {String(diagnosticoSeleccion.selected.preservedSource?.rawLayerName??"—")} · ID {String(diagnosticoSeleccion.selected.preservedSource?.rawLayerId??"—")}</div>
                </div>
                <div className="mt-1 break-all text-white/45">Resolución final: {JSON.stringify(diagnosticoSeleccion.selected.resolvedLayer??{})}</div>
                <div><span className="text-white/45">Color capa:</span> {String(diagnosticoSeleccion.selected.layerColor??"NO DISPONIBLE")} <span className="text-white/45">· Slot MatrixGold:</span> {String(diagnosticoSeleccion.selected.matrixSlot??"NO DISPONIBLE")}</div>
                <div><span className="text-white/45">Resolución metadatos:</span> {String(diagnosticoSeleccion.selected.metadataResolution??"NO INDICADA")}</div>
                <div><span className="text-white/45">Tipo de objeto:</span> {String(diagnosticoSeleccion.selected.objectType)} <span className="text-white/45">· Visible:</span> {String(diagnosticoSeleccion.selected.visible)}</div>
              </div>
              <div className="mt-2 rounded-lg border border-white/10 p-2">
                <div className="mb-1 font-semibold text-[#d4af37]">Geometría y material actual</div>
                <div>Vértices: {String(diagnosticoSeleccion.selected.geometry.vertices??"—")} · Triángulos aprox.: {String(diagnosticoSeleccion.selected.geometry.triangles??"—")}</div>
                <div>Índice de geometría: {String(diagnosticoSeleccion.selected.geometry.indexed)} · Normales: {String(diagnosticoSeleccion.selected.geometry.normals)}</div>
                {diagnosticoSeleccion.selected.materials.map((material:any,index:number)=><div key={index} className="mt-1 break-words text-white/75">Material {index+1}: {material.type} · {material.name||"sin nombre"} · {material.color||"sin color"}{material.transmission!==null?" · transmisión "+material.transmission:""}{material.ior!==null?" · IOR "+material.ior:""}</div>)}
              </div>
              <details className="mt-2 rounded-lg border border-white/10 p-2" open>
                <summary className="cursor-pointer font-semibold text-[#d4af37]">Mallas gema detectadas ({diagnosticoSeleccion.relatedGemMeshes.length}; mostrando hasta 60)</summary>
                <div className="mt-1 space-y-1">
                  {diagnosticoSeleccion.relatedGemMeshes.map((mesh:any,index:number)=><div key={mesh.uuid||index} className={"rounded-md p-1.5 "+(mesh.sameSelectedLayer?"bg-emerald-400/10":"bg-white/[.035]")}>
                    <div className="break-words font-medium">{mesh.name} {mesh.sameSelectedLayer?"· MISMA CAPA":""}</div>
                    <div className="break-all text-white/45">capa: {mesh.layer||"—"} · ID: {mesh.layerId||"—"} · índice: {String(mesh.layerIndex??"—")}</div>
                    <div className="break-all text-white/45">key: {String(mesh.layerKey??"—")} · {String(mesh.vertices??"?")} vértices</div>
                    <div className="break-all text-white/60">UUID: {mesh.uuid}</div>
                    <div className="break-words text-white/60">{mesh.materials.map((m:any)=>String(m.type)+(m.color?" "+m.color:"")).join(", ")||"sin material"}</div>
                    <details className="mt-1 rounded border border-white/10 p-1.5">
                      <summary className="cursor-pointer text-[#d4af37]">Atributos originales de esta gema</summary>
                      <pre className="mt-1 whitespace-pre-wrap break-all text-[9px] text-white/60">{JSON.stringify({rawAttributes:mesh.rawAttributes,userDataKeys:mesh.userDataKeys,metaKeys:mesh.metaKeys},null,2)}</pre>
                    </details>
                  </div>)}
                </div>
              </details>
              <details className="mt-2 rounded-lg border border-white/10 p-2">
                <summary className="cursor-pointer font-semibold text-[#d4af37]">Atributos originales del archivo</summary>
                <pre className="mt-1 whitespace-pre-wrap break-all text-[9px] text-white/65">{JSON.stringify(diagnosticoSeleccion.selected.rawAttributes,null,2)}</pre>
              </details>
              <details className="mt-2 rounded-lg border border-white/10 p-2" open>
                <summary className="cursor-pointer font-semibold text-[#d4af37]">Tabla completa de capas leída del archivo ({diagnosticoSeleccion.sourceLayerTable.length})</summary>
                <pre className="mt-1 whitespace-pre-wrap break-all text-[9px] text-white/65">{JSON.stringify(diagnosticoSeleccion.sourceLayerTable,null,2)}</pre>
              </details>
              <details className="mt-2 rounded-lg border border-white/10 p-2" open>
                <summary className="cursor-pointer font-semibold text-[#d4af37]">Diagnóstico de instancias Rhino / capas heredadas</summary>
                <pre className="mt-1 whitespace-pre-wrap break-all text-[9px] text-white/65">{JSON.stringify({instanceLayerHydration:diagnosticoSeleccion.instanceLayerHydration,selectedInstanceSource:diagnosticoSeleccion.selectedInstanceSource,rootUserDataKeys:diagnosticoSeleccion.sourceRootUserDataKeys,metadataAudit:diagnosticoSeleccion.metadataAudit},null,2)}</pre>
              </details>
              <details className="mt-2 rounded-lg border border-white/10 p-2">
                <summary className="cursor-pointer font-semibold text-[#d4af37]">Última asignación de gema</summary>
                <pre className="mt-1 whitespace-pre-wrap break-all text-[9px] text-white/65">{JSON.stringify(diagnosticoSeleccion.existingAssignment,null,2)}</pre>
              </details>
            </div>}
            {archivo&&<div className="absolute right-16 top-3 z-20 max-w-[45%] truncate rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-[10px] text-white/60 backdrop-blur">{archivo} <span className="ml-2 text-[#d4af37]/80">· GLB interno</span></div>}

            <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/15 bg-[#202124]/80 px-3 py-2 shadow-lg backdrop-blur-2xl">
              <span title="Clic izquierdo + arrastrar para orbitar" className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-[10px] text-white/85"><span className="grid size-5 place-items-center rounded-md bg-white/10">◉</span><span>Órbita</span><span className="text-[9px] text-white/45">Clic izq.</span></span><span title="Clic derecho + arrastrar para desplazar la vista" className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-[10px] text-white/85"><span className="grid size-5 place-items-center rounded-md bg-white/10">✋</span><span>Pan</span><span className="text-[9px] text-white/45">Clic der.</span></span><span title="Usa la rueda del ratón para acercar o alejar" className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-[10px] text-white/85"><span className="grid size-5 place-items-center rounded-md bg-white/10">⌕</span><span>Zoom</span><span className="text-[9px] text-white/45">Rueda</span></span><button type="button" title="Restablecer el encuadre inicial" onClick={()=>apiRef.current?.reset()} className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-[10px] text-white/85 transition hover:bg-white/10 hover:text-white"><span className="grid size-5 place-items-center rounded-md bg-white/10">⌗</span><span>Ajustar</span></button>
            </div>
            <div className="absolute bottom-6 right-6 z-20 flex gap-1 rounded-xl border border-white/35 bg-white/75 p-1 text-black/55 shadow-sm backdrop-blur-2xl">
              <span className="rounded-lg border border-black/10 px-2 py-1 text-[9px]">HDRI</span><span className="rounded-lg border border-black/10 px-2 py-1 text-[9px]">PBR</span><span className="rounded-lg border border-black/10 px-2 py-1 text-[9px]">4K</span>
              <button type="button" onClick={()=>apiRef.current?.fullscreen()} className="grid size-7 place-items-center rounded-lg bg-[#17191c] text-white"><Expand className="size-3.5"/></button>
            </div>

            <div className="absolute right-5 top-1/2 z-30 -translate-y-1/2">
              <div className="flex flex-col items-center gap-1 rounded-2xl border border-black/[.08] bg-white/90 p-1.5 shadow-[0_8px_28px_rgba(0,0,0,.12)] backdrop-blur-2xl">
                <button type="button" title="Calidad de render" onClick={()=>setQualityOpen(v=>!v)} className={"grid size-10 place-items-center rounded-xl "+(qualityOpen?"bg-[#d4af37]/15 text-[#d4af37]":"text-black/70 hover:bg-black/5")}><Sparkles className="size-[18px]"/></button>
                <button type="button" title="Reiniciar cámara" onClick={()=>apiRef.current?.reset()} className="grid size-10 place-items-center rounded-xl text-black/70 hover:bg-black/5"><RotateCcw className="size-[18px]"/></button>
                <button type="button" title="Pantalla completa" onClick={()=>apiRef.current?.fullscreen()} className="grid size-10 place-items-center rounded-xl text-black/70 hover:bg-black/5"><Expand className="size-[18px]"/></button>
                <div className="my-0.5 h-px w-6 bg-black/10"/>
              </div>
            </div>

            {qualityOpen&&<div className="absolute right-[78px] top-1/2 z-40 w-48 -translate-y-1/2 rounded-2xl border border-black/10 bg-[#fbfaf7]/95 p-2 text-[#292824] shadow-xl backdrop-blur-2xl">
              <div className="px-2 pb-2 text-[9px] font-semibold uppercase tracking-[.16em] text-[#858178]">Calidad de render</div>
              {([["low","Baja","Vista rápida"],["high","Alta","Producción"],["ultra","Ultra","Máximo detalle"]] as const).map(([id,nombre,desc])=><button key={id} type="button" onClick={()=>cambiarCalidad(id)} className={"mb-1 w-full rounded-lg border px-2.5 py-2 text-left "+(renderQualityId===id?"border-[#d4af37]/60 bg-[#d4af37]/10":"border-white/10 bg-white/[.03]")}><span className="block text-[10px] font-semibold">{nombre}</span><span className="text-[8px] text-white/40">{desc}</span></button>)}
            </div>}
            {lightingOpen && lightingPanel}
          </div>
        </main>
        <aside className="hidden w-[260px] shrink-0 overflow-hidden rounded-2xl border border-black/[.07] bg-[#f9f8f5] text-[#292824] shadow-[0_8px_28px_rgba(36,32,20,.045)] xl:block">
          <div className="h-full overflow-y-auto">
            <div className="border-b border-black/10 px-4 py-5">
              <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#92743b]">Inspector</div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">Ajustes de estudio</h2>
              <p className="mt-1 text-xs leading-relaxed text-[#77756f]">Controla la presentación sin perder de vista tu joya.</p>
            </div>
            <section className="border-b border-black/10 p-4">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[.14em] text-[#858178]">Escena activa</div>
              <label className="block text-xs font-medium text-[#55534d]">Ambiente
                <select value={escenarioId} onChange={e=>setEscenarioId(e.target.value as EscenarioId)} className="mt-1.5 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-[#292824] outline-none focus:border-[#92743b]/60">
                  {ESCENARIOS.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </label>
              <label className="mt-3 block text-xs font-medium text-[#55534d]">Vista de cámara
                <select value={vista} onChange={e=>setVista(e.target.value as VistaId)} className="mt-1.5 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-[#292824] outline-none focus:border-[#92743b]/60">
                  {VISTAS.map(v=><option key={v.id} value={v.id}>{v.nombre}</option>)}
                </select>
              </label>
            </section>
            <section className="border-b border-black/10 p-4">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[.14em] text-[#858178]">Renderizado</div>
              <div className="grid grid-cols-3 gap-1.5">
                {([["low","Baja"],["high","Alta"],["ultra","Ultra"]] as const).map(([id,label])=><button key={id} type="button" aria-pressed={renderQualityId===id} onClick={()=>cambiarCalidad(id)} className={"rounded-lg border px-1 py-2 text-xs font-semibold transition "+(renderQualityId===id?"border-[#92743b]/60 bg-[#92743b]/10 text-[#795e2e]":"border-black/10 bg-white text-[#66645e] hover:border-[#92743b]/40")}>{label}</button>)}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-[#858178]">Ultra puede exigir más memoria y potencia gráfica.</p>
            </section>
            <section className="p-4">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[.14em] text-[#858178]">Herramientas</div>
              <button type="button" onClick={()=>setLightingOpen(true)} className="flex w-full items-center gap-3 rounded-xl border border-black/10 bg-white p-3 text-left transition hover:border-[#92743b]/45 hover:bg-[#fbfaf7]">
                <span className="grid size-9 place-items-center rounded-lg bg-[#92743b]/10 text-[#92743b]"><SlidersHorizontal className="size-4"/></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium">Iluminación</span><span className="mt-0.5 block text-[10px] text-[#858178]">Key · Fill · Rim · Gem</span></span>
                <ChevronDown className="size-4 -rotate-90 text-[#99968d]"/>
              </button>
              <button type="button" onClick={()=>apiRef.current?.reset()} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-black/10 bg-white p-3 text-left transition hover:border-[#92743b]/45 hover:bg-[#fbfaf7]">
                <span className="grid size-9 place-items-center rounded-lg bg-black/[.035] text-[#55534d]"><RotateCcw className="size-4"/></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium">Restablecer vista</span><span className="mt-0.5 block text-[10px] text-[#858178]">Volver al encuadre inicial</span></span>
              </button>
              <button type="button" onClick={()=>setExportOpen(true)} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-[#92743b]/25 bg-[#92743b]/[.06] p-3 text-left transition hover:bg-[#92743b]/10">
                <span className="grid size-9 place-items-center rounded-lg bg-[#92743b]/10 text-[#92743b]"><Download className="size-4"/></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium">Exportar diseño</span><span className="mt-0.5 block text-[10px] text-[#858178]">Imagen, modelo o configuración</span></span>
              </button>
            </section>
          </div>
        </aside>
      </div>
    </div>
  </>);
}
