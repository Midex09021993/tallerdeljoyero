// @ts-nocheck -- AURUM Render engine: strict-mode typing pending; runtime behaviour unchanged.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/lib/auth";
import { PLANES_COMERCIALES, type PlanComercialId } from "@/lib/planes-comerciales";
import { toast } from "sonner";
import {
  applyAurumMetal, applyAurumGem, metalPresetFromConfig, gemPresetFromConfig,
} from "../lib/aurum-material-engine";
import { getAurumScenePreset, getAurumRenderQuality, AURUM_HDRI_GROUND_DEFAULT, type AurumRenderQualityId } from "../lib/aurum-scene-engine";
import { getAurumPhotographicProfile, getAurumHdriUrl, getAurumGemHdriUrl, AURUM_HDRI_URLS, AURUM_GEM_HDRI_URLS, AURUM_AMBIENT_PRESETS, AURUM_GEM_ENVIRONMENT_PRESETS } from "../lib/aurum-photographic-scene-engine";
import { getAurumShadowConfig } from "../lib/aurum-shadow-engine";
import { getAurumPostConfig } from "../lib/aurum-post-engine";
import { getAurumSsaoConfig } from "../lib/aurum-ssao-engine";
import { AURUM_LIGHTING_DEFAULT } from "../lib/aurum-lighting-engine";
import { applyAurumCameraSnapshot, applyAurumCameraView, applyAurumIJEWELPresentationCamera, applyAurumPublicViewerCamera, fitAurumCameraToAspect, calculateAurumFocalDepth, getAurumVisibleProductBounds } from "../lib/aurum/camera";
import { prepareAurumModel } from "../lib/aurum/model-prep";
import { createAurumPostPipeline } from "../lib/aurum/post";
import { getAurumPostControls, setAurumPostControls, subscribeAurumPostControls, type AurumPostControls } from "../lib/aurum/post-engine-controls";
import { createAurumEnvironment } from "../lib/aurum/environment";
import { createAurumGemEnvironment } from "../lib/aurum/gem-environment";
import { createAurumDiamondBvhRuntime, type AurumDiamondBvhRuntime } from "../lib/aurum/aurum-diamond-bvh-runtime";
import { createAurumSceneController } from "../lib/aurum/scene";
import { createAurumGround } from "../lib/aurum/ground";
import { setAurumInclusionsVisible, setAurumEmeraldInclusionsVisible } from "../lib/aurum/gems";
import { setAurumGemShaderQuality, setAurumDiamondSourceDispersion } from "../lib/aurum/scintillation";
import { createAurumDiamondMicroPipeline } from "../lib/aurum/diamond-micro-pipeline";
import { createAurumLightingController } from "../lib/aurum/lighting";
import { frameAurumProduct, disposeAurumViewer, createAurumWebGLViewer, startAurumViewerLoop } from "../lib/aurum/viewer";
import { createAurumImportPlugin } from "../lib/aurum/core/import-plugin";
import { createAurumGeometryEngine } from "../lib/aurum/core/geometry-engine";
import { parseAurumInput, preprocessAurumModel } from "../lib/aurum/model-loader";
import { classifyMesh as classifyPublicMesh, inferGemMeshes } from "./PublicCatalogViewer";
import { compressAurumGlbWithDraco } from "../lib/draco-export";
import { getAurumRhinoGeometryType, isAurumRhinoCsgSurface } from "../lib/aurum/metal-union-experiment";
import { getAurumModelParts } from "../lib/aurum/model-parts";
import { resolveAurumLayerKey } from "../lib/aurum/layer-identity";
import { applyAurumLayerCategoryOverrides, getAurumLayerCategoryOverride, setAurumLayerCategoryOverride, type AurumLayerCategoryOverride } from "../lib/aurum/layer-category-overrides";
import { applyAurumMaterialToModel, applyAurumGemToTarget, clearAurumGemFromTarget, getAurumMaterialAdapterServices, getAurumGemLayerIdentity, isAurumGemTarget, normalizeAurumGemLayerName, prepareAurumGemLayerIndex, invalidateAurumGemLayerIndex } from "../lib/aurum/material-application";
import { captureAurumGemTransitionState, createAurumGemTransition } from "../lib/aurum/gem-transition";
import { inspectAurumMesh } from "../lib/aurum/mesh-preflight";
import { classifyAurumSemanticObject } from "../lib/aurum/semantic-object-recognition";

import { applyAurumInitialModelMaterials } from "../lib/aurum/model-materials";
import { disposeAurumThicknessCacheForTarget } from "../lib/aurum/thickness-map";
import { createAurumApi, createAurumCatalogApi, type AurumCatalogApi } from "../lib/aurum/api";
import { createAurumConfiguratorState } from "../lib/aurum/configurator-state";
import { createAurumViewerAdapter, AURUM_VIEWER_SERVICES } from "../lib/aurum/core/viewer-adapter";
import { createAurumSceneAdapter } from "../lib/aurum/core/scene-adapter";
import { createAurumLightingAdapter } from "../lib/aurum/core/lighting-adapter";
import { createAurumProductionPluginHost } from "../lib/aurum/core/production-plugin-host";
import { createAurumRenderPipelineContract } from "../lib/aurum/core/render-pipeline-contract";
import { createAurumMediaExportContract } from "../lib/aurum/core/media-export-contract";
import { createAurumOpticalContract } from "../lib/aurum/core/optical-contract";
import { captureAurumGlbQualitySnapshot, evaluateAurumGlbQuality } from "../lib/aurum/core/glb-quality-gate";
import { configureAurumEdgeQuality, getAurumEdgeAaProfile } from "../lib/aurum/edge-quality";
import { getAurumAspectRatio, getAurumAspectDimensions, getAurumAspectFrameStyle, type AurumAspectRatioId } from "../lib/aurum/aspect-ratios";
import { countAurumTriangles, getAurumRuntimeBudget, type AurumRuntimeBudget } from "../lib/aurum/runtime-budget";
import { prepareAurumLiveGeometry, setAurumLiveGeometryQuality, disposeAurumLiveGeometry } from "../lib/aurum/live-geometry-lod";
import { Camera, ChevronDown, Copy, Download, Expand, FileJson, Gem, Image as ImageIcon, Maximize2, Minimize2, RotateCcw, RotateCw, SlidersHorizontal, Sparkles, Upload, X, FolderOpen, Cloud, ArrowUpRight } from "lucide-react";

import { GEMAS, MATERIALES, ESCENARIOS, VISTAS, ILUMINACIONES, type MaterialId, type EscenarioId, type VistaId, type IluminacionId, type MaterialGrupo, type CategoriaParte, type GemaId, type GemaConfig, type MaterialConfig, type ParteModelo } from "../lib/aurum/catalog";
import { AurumRenderSidebar } from "./AurumRenderSidebar";
import { AurumCameraCalibrationPanel } from "./AurumCameraCalibrationPanel";
import { AurumPerformanceIndicator, AurumPerformanceMonitorPanel } from "./AurumPerformanceMonitorPanel";
import { AurumLoadingExperience } from "./AurumLoadingExperience";
import { createAurumPerformanceMonitor } from "@/lib/aurum/performance-monitor";
import { runAurumMediaExportCleanup } from "../lib/aurum/media-export-session";
import { captureAurumPathTracedScene } from "../lib/aurum/path-traced-capture";


const normalizarTexto = (v:any) => String(v ?? "").trim().toLowerCase();
const colorRhinoHex = (c:any): string | undefined => {
  if (!c) return undefined;
  const r = Number(c.r ?? c.R), g = Number(c.g ?? c.G), b = Number(c.b ?? c.B);
  if (![r,g,b].every(Number.isFinite)) return undefined;
  const channels = Math.max(r,g,b) <= 1 ? [r*255,g*255,b*255] : [r,g,b];
  return "#" + channels.map(n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,"0")).join("");
};
const clasificarCapa = (nombre:string, color?:string): CategoriaParte => {
  const segments=String(nombre??"").split(/::|[\\/]/).map((part)=>
    normalizarTexto(part).replace(/[_-]+/g," ").replace(/\s+/g," ").trim()
  );
  const gemLayer=/^(?:gem|gems|gemstone|gemstones|gema|gemas|piedra|piedras|stone|stones|diamond|diamonds|diamante|diamantes|zafiro|sapphire|rubi|ruby|esmeralda|emerald|moissanita|moissanite|citrino|amatista|topacio)(?:\s*0*\d+(?:\.\d+)?(?:\s*mm)?(?:\s*[- ]\s*[a-z0-9 .-]+)?)?$/;
  if (segments.some((segment)=>gemLayer.test(segment))) return "gema";
  if (/(metal|oro|gold|plata|silver|platino|platinum|metalico|metálico|acero|steel)/.test(normalizarTexto(nombre))) return "metal";
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

type AurumOriginalSource = { name: string; size: number; lastModified: number; storagePath?: string; contentType?: string };
type AurumProjectDestination = { rutaCarpeta: string; rutaArchivoOriginal?: string | undefined; nombre: string; archivoNombre?: string | undefined; archivoTamano?: number | undefined; archivoModificado?: number | undefined; nombreProyecto?: string | undefined };
const EXPORT_LEGADO_VISIBLE: boolean = true;
// Shared presentation profile must be initialized before the viewer mount effect runs.
const PUBLIC_VIEWER_PRESENTATION_MODE = true;

// Import pipeline is an isolated CORE plugin; optical/rendering engines remain untouched.
const aurumImportPlugin = createAurumImportPlugin();

type AurumRenderProps = { embedded?: boolean; onCatalogApiReady?: (api: AurumCatalogApi | null) => void };

export function AurumRender({ embedded = false, onCatalogApiReady }: AurumRenderProps = {}) {
  const { data: sesion } = useSesion();
  const [aurumConectStatus, setAurumConectStatus] = useState("");
  const [aurumConectBusy, setAurumConectBusy] = useState(false);
  const [aurumConectCanRetry, setAurumConectCanRetry] = useState(false);
  const aurumConectAttemptRef = useRef<string | null>(null);
  const visorRef = useRef<HTMLDivElement>(null), fileRef = useRef<HTMLInputElement>(null);
  const orbitControlsRef = useRef<any>(null);
  const [autoRotate360, setAutoRotate360] = useState(false);
  const [isViewerFullscreen, setIsViewerFullscreen] = useState(false);
  const [lightingOpen, setLightingOpen] = useState(false);
  const [metalHdriId, setMetalHdriId] = useState("ijewelMetal");
  const [gemHdriId, setGemHdriId] = useState("gemUserHdr");
  const [ambienteId, setAmbienteId] = useState<string|null>(null);
  const ambienteIdRef = useRef<string|null>(null);
  ambienteIdRef.current = ambienteId;
  const [ambienteMetalInfluence, setAmbienteMetalInfluence] = useState(45);
  const [fondoId, setFondoId] = useState("blanco");
  const [sombraContactoVisible, setSombraContactoVisible] = useState(true);
  const [sueloVisible, setSueloVisible] = useState(true);
  const [sueloColor, setSueloColor] = useState("#ffffff");
  const [sueloRugosidad, setSueloRugosidad] = useState(1);
  const [sueloMetalness, setSueloMetalness] = useState(0);
  const [intensidadSombra, setIntensidadSombra] = useState(.22);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [libraryMenuOpen, setLibraryMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [rhinoExportBusy, setRhinoExportBusy] = useState(false);
  const [rhinoExportError, setRhinoExportError] = useState<string | null>(null);
  const [rhinoExportReport, setRhinoExportReport] = useState<string | null>(null);
  const [guardarProyectoOpen, setGuardarProyectoOpen] = useState(false);
  const [guardandoProyectoNube, setGuardandoProyectoNube] = useState(false);
  const [nombreProyectoGuardar, setNombreProyectoGuardar] = useState("");
  const [carpetasDestinoProyecto, setCarpetasDestinoProyecto] = useState<string[]>([]);
  const [limiteMiNubeModal, setLimiteMiNubeModal] = useState<{
    plan: string; limite: number; usadas: number;
    siguientePlan?: { nombre: string; precio: string; carpetas: number; almacenamientoMiB: number } | null;
  } | null>(null);
  const [carpetaDestinoSeleccionada, setCarpetaDestinoSeleccionada] = useState("__nueva__");
  const [destinoProyectoGuardado, setDestinoProyectoGuardado] = useState<AurumProjectDestination | null>(null);
  const [sharedLink, setSharedLink] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoCountdown, setVideoCountdown] = useState<number | null>(null);
  const [videoMode, setVideoMode] = useState<"manual"|"automatic"|"orbit180-return"|"cinematic-zoom"|"vertical-sweep"|"slow360"|"catalog">("automatic");
    const [videoFps, setVideoFps] = useState("30");
  const [videoDuration, setVideoDuration] = useState("5");
  const [videoResolution, setVideoResolution] = useState<"native"|"1080"|"1440"|"4k">("native");
  const [videoAspect, setVideoAspect] = useState<AurumAspectRatioId | null>(null);
  const videoAspectCameraSnapshotRef = useRef<any>(null);
  const videoAspectFitFrameRef = useRef<number | null>(null);
  const snapshotAspectCameraSnapshotRef = useRef<any>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const videoAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const invalidateAurumPostModules = () => {
      const controls=getAurumPostControls();
      if(controls.diamondTaaEnabled) viewerLoopRef.current?.converge?.(32);
      else invalidateRenderRef.current?.();
    };
    window.addEventListener("aurum-post-controls-change", invalidateAurumPostModules);
    return () => window.removeEventListener("aurum-post-controls-change", invalidateAurumPostModules);
  }, []);

  useEffect(() => {
    let resizeFrame = 0;
    let settleFrame = 0;
    const syncFullscreenState = () => {
      const isFullscreen = Boolean(visorRef.current && document.fullscreenElement === visorRef.current);
      setIsViewerFullscreen(isFullscreen);

      // Fullscreen transitions can complete before the browser has committed
      // the final layout size. Resize the existing renderer after layout settles
      // instead of recreating the WebGL context or the loaded scene.
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      if (settleFrame) cancelAnimationFrame(settleFrame);
      resizeFrame = requestAnimationFrame(() => {
        settleFrame = requestAnimationFrame(() => {
          viewerLoopRef.current?.resize?.();
          viewerLoopRef.current?.invalidate?.();
          resizeFrame = 0;
          settleFrame = 0;
        });
      });
    };
    document.addEventListener("fullscreenchange", syncFullscreenState);
    syncFullscreenState();
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      if (settleFrame) cancelAnimationFrame(settleFrame);
    };
  }, []);
  const videoExportLockRef = useRef(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  // Default still export: full-screen landscape capture (4K UHD).
  const [snapshotWidth, setSnapshotWidth] = useState("3840");
  const [snapshotHeight, setSnapshotHeight] = useState("2160");
  const [snapshotFormat, setSnapshotFormat] = useState<"png"|"jpeg"|"webp">("png");
  const [snapshotTransparent, setSnapshotTransparent] = useState(false);
  const [snapshotDof, setSnapshotDof] = useState(false);
  const [snapshotDofStrength, setSnapshotDofStrength] = useState<"soft"|"medium"|"strong">("soft");
  const [liveDofOpen, setLiveDofOpen] = useState(false);
  const [liveDof, setLiveDof] = useState(false);
  const [liveDofStrength, setLiveDofStrength] = useState<"soft"|"medium"|"strong">("soft");
  const [snapshotGuide, setSnapshotGuide] = useState<"none"|"thirds"|"complete">("none");
  const [snapshotAspect, setSnapshotAspect] = useState<"16:9"|"1:1"|"4:5"|"9:16"|"3:2"|null>(null);
  const [snapshotResolution, setSnapshotResolution] = useState<"4k"|"8k">("4k");
  const syncSnapshotNativeDimensions = () => {
    // The editor canvas is narrowed by the export sidebar; when no aspect
    // preset is active, use a clean full-screen 16:9 4K UHD output instead.
    const longEdge = snapshotResolution === "8k" ? 7680 : 3840;
    setSnapshotWidth(String(longEdge));
    setSnapshotHeight(String(Math.round(longEdge * 9 / 16)));
  };
  const handleSnapshotAspect = (ratio: "16:9"|"1:1"|"4:5"|"9:16"|"3:2") => {
    if (snapshotAspect === ratio) {
      setSnapshotAspect(null);
      const original = snapshotAspectCameraSnapshotRef.current;
      snapshotAspectCameraSnapshotRef.current = null;
      if (original) apiRef.current?.restoreCameraState?.(original);
      // No preset means the real viewer canvas: restore its native pixel
      // dimensions as well as its camera framing, not the previous preset size.
      syncSnapshotNativeDimensions();
      return;
    }
    if (!snapshotAspectCameraSnapshotRef.current) {
      snapshotAspectCameraSnapshotRef.current = apiRef.current?.captureCameraState?.() ?? null;
    }
    const ratioValue = getAurumAspectRatio(ratio);
    const longEdge = snapshotResolution === "8k" ? 7680 : 3840;
    let width = ratioValue >= 1 ? longEdge : Math.round(longEdge * ratioValue);
    let height = ratioValue >= 1 ? Math.round(longEdge / ratioValue) : longEdge;
    const scale = Math.min(1, Math.sqrt(36_000_000 / (width * height)));
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    setSnapshotAspect(ratio);
    setSnapshotWidth(String(width));
    setSnapshotHeight(String(height));
    requestAnimationFrame(() => apiRef.current?.fitAspect(getAurumAspectRatio(ratio)));
  };
  const [renderQualityId, setRenderQualityId] = useState<AurumRenderQualityId>("high");
  const [performanceOpen, setPerformanceOpen] = useState(false);
  const [performanceRenderer, setPerformanceRenderer] = useState<any>(null);
  const performanceMonitorRef = useRef(createAurumPerformanceMonitor());
  const composerRef = useRef<any>(null);
  const frameRef = useRef<number | null>(null);
  const invalidateRenderRef = useRef<(() => void) | null>(null);
  const viewerLoopRef = useRef<any>(null);
  const resetTemporalAccumulationRef = useRef<(() => void) | null>(null);
  const [ptSamples, setPtSamples] = useState("256");
  const [ptProgress, setPtProgress] = useState<string|null>(null);
  const ptAbortRef = useRef<AbortController|null>(null);
  const [lightingStudio, setLightingStudio] = useState<any>(() => ({...AURUM_LIGHTING_DEFAULT, temperatureK:5500, reflectorPower:2.5, reflectorScale:1.6, largeSoftboxEnabled:false, largeSoftboxPower:1.4, reflectors:{softbox:true,strip:true,kicker:true,edgeLeft:true,edgeRight:true}}));
  const lucesRef = useRef<((patch:any)=>void)|null>(null);
  const [, refrescarLuces] = useState(0);
  const actualizarLucesAurum = useCallback((patch:any) => {
    setLightingStudio((prev:any) => ({
      ...prev,
      ...patch,
      key: patch.key ? {...prev.key, ...patch.key} : prev.key,
      fill: patch.fill ? {...prev.fill, ...patch.fill} : prev.fill,
      rim: patch.rim ? {...prev.rim, ...patch.rim} : prev.rim,
      gem: patch.gem ? {...prev.gem, ...patch.gem} : prev.gem,
      front: patch.front ? {...prev.front, ...patch.front} : prev.front,
      reflectors: patch.reflectors ? {...(prev.reflectors ?? {}), ...patch.reflectors} : prev.reflectors,
    }));
    lucesRef.current?.(patch);
    resetTemporalAccumulationRef.current?.();
    // Lighting controls are direct scene mutations. Render the updated scene
    // immediately so the user never has to orbit to reveal the new light state.
    // renderNow consumes any already queued demand frame, avoiding a duplicate.
    if (viewerLoopRef.current?.renderNow) viewerLoopRef.current.renderNow();
    else invalidateRenderRef.current?.();
    refrescarLuces(n=>n+1);
  }, []);
  const apiRef = useRef<any>(null);
  const onCatalogApiReadyRef = useRef(onCatalogApiReady);
  onCatalogApiReadyRef.current = onCatalogApiReady;
  const [archivo, setArchivo] = useState<string|null>(null), [cargando, setCargando] = useState(false), [estadoCarga, setEstadoCarga] = useState<{ message: string; completed?: number; total?: number } | null>(null), [error, setError] = useState<string|null>(null), [formatoInterno, setFormatoInterno] = useState<string|null>(null);
  const [archivoOriginal, setArchivoOriginal] = useState<File | null>(null);
  const [archivoOriginalInfo, setArchivoOriginalInfo] = useState<AurumOriginalSource | null>(null);
  const [arrastrandoArchivo, setArrastrandoArchivo] = useState(false);

  const [cameraCalibrationOpen, setCameraCalibrationOpen] = useState(false);
  const [cameraCalibrationReferences, setCameraCalibrationReferences] = useState<any>({});
  const cameraCalibrationLoadedRef = useRef(false);
  useEffect(() => {
    if (cameraCalibrationLoadedRef.current) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.from("aurum_camera_calibration_global" as any)
        .select("calibration_data").eq("id", 1).maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("[AURUM camera] No se pudo cargar la calibración maestra:", error.message);
        toast.error("No se pudo cargar la calibración maestra. Comprueba la migración de Supabase.");
        return;
      }
      const references = (data as any)?.calibration_data ?? {};
      setCameraCalibrationReferences(references);
      calibratedCameraViewsRef.current = references;
      cameraCalibrationLoadedRef.current = true;
      // Apply the shared master reference even when the model mounted before
      // the asynchronous global calibration query completed.
      requestAnimationFrame(() => aplicarVistaRef.current?.(vistaRef.current));
    })();
    return () => { cancelled = true; };
  }, []);
  const cameraCalibrationRuntimeRef = useRef<any>(null);
  // Referencias calibradas que sustituyen los presets de cámara durante la sesión del modelo actual.
  const calibratedCameraViewsRef = useRef<Partial<Record<VistaId, any>>>({});
  const [materialAplicarTodos, setMaterialAplicarTodos] = useState(false);
  const [materialId, setMaterialId] = useState<MaterialId>("plata950_pulida"), [gemaId, setGemaId] = useState<GemaId>("diamante_natural"), [escenarioId, setEscenarioId] = useState<EscenarioId>("ijewelReference"), [iluminacionId, setIluminacionId] = useState<IluminacionId>("studioSoft"), [vista, setVista] = useState<VistaId>("frontal");
  // A catalog choice is only armed; the next explicit gem-mesh click consumes it.
  const pendingGemApplicationRef = useRef<GemaConfig | null>(null);
  const vistaRef = useRef<VistaId>("frontal");
  // Puente entre el selector React y la cámara creada dentro del ciclo del visor.
  const aplicarVistaRef = useRef<((id: VistaId) => void) | null>(null);
  const autoVistaPorOrbitaRef = useRef(false);
  vistaRef.current = vista;
  const [nombreProyecto, setNombreProyecto] = useState("Diseño de joyería");
  const [categoriaProyecto, setCategoriaProyecto] = useState("Anillo");
  const categoriaProyectoRef = useRef("Anillo");
  categoriaProyectoRef.current = categoriaProyecto;
  const liveFastPathRef = useRef(true);
  const liveTransmissionScaleRef = useRef(0.42);
  const gemTransitionRef = useRef<any>(null);
  const diamondDispersionFrameRef = useRef<number|null>(null);
  const diamondMicroPipelineRef = useRef<any>(null);
  const diamondBvhRuntimeRef = useRef<any>(null);
  const diamondBvhEnabledRef = useRef(true);
  const diamondMicroEnabledRef = useRef(true);
  const [presentationCover, setPresentationCover] = useState<string | null>(null);
  const [presentationVisible, setPresentationVisible] = useState(false);
  const presentationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [parteSeleccionada, setParteSeleccionada] = useState<string | null>(null);
  const [parteSeleccionadaNombre, setParteSeleccionadaNombre] = useState<string | null>(null);
  const [parteSeleccionadaCapa, setParteSeleccionadaCapa] = useState<string | null>(null);
  const [parteSeleccionadaCategoria, setParteSeleccionadaCategoria] = useState<"metal" | "gema" | "otro">("otro");
  const [layerCategoryOverrides, setLayerCategoryOverrides] = useState<Record<string, AurumLayerCategoryOverride>>({});
  const [diagnosticoSeleccion, setDiagnosticoSeleccion] = useState<any | null>(null);
  const [diagnosticoSeleccionHabilitado, setDiagnosticoSeleccionHabilitado] = useState(false);
  const diagnosticoSeleccionHabilitadoRef = useRef(false);

  useEffect(() => {
    diagnosticoSeleccionHabilitadoRef.current = diagnosticoSeleccionHabilitado;
  }, [diagnosticoSeleccionHabilitado]);

  useEffect(() => {
    const handleDiagnosticShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d")) return;
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || target?.isContentEditable) return;
      event.preventDefault();
      const nextEnabled = !diagnosticoSeleccionHabilitadoRef.current;
      diagnosticoSeleccionHabilitadoRef.current = nextEnabled;
      setDiagnosticoSeleccionHabilitado(nextEnabled);
      if (!nextEnabled) setDiagnosticoSeleccion(null);
    };
    window.addEventListener("keydown", handleDiagnosticShortcut);
    return () => window.removeEventListener("keydown", handleDiagnosticShortcut);
  }, []);
  const [panel, setPanel] = useState<"materiales" | "escenas" | "iluminacion">("materiales");
  const [uxSection, setUxSection] = useState<"materiales"|"gemas"|"ambientes"|"escenas"|"modelstage"|"hdrMetales"|"hdrGemas"|"fondos"|"rhino-export"|"cad-tree"|"positions"|"diamond-control">("materiales");
  const [diamondBvhEnabled, setDiamondBvhEnabled] = useState(true);
  const [diamondMicroEnabled, setDiamondMicroEnabled] = useState(true);
  const [diamondPostControls, setDiamondPostControls] = useState<AurumPostControls>({gemMaskEnabled:false,diamondSsaaEnabled:false,gemFxaaEnabled:false,diamondTaaEnabled:false,surfaceEdgeAaEnabled:false,taaEnabled:false});
  useEffect(() => {
    // Keep the panel in sync with the canonical post-engine state. The engine
    // and UI can update independently (including from other controls/runtime
    // fallbacks), so a one-time read leaves FXAA incorrectly disabled.
    setDiamondPostControls(getAurumPostControls());
    return subscribeAurumPostControls((controls) => {
      setDiamondPostControls(controls);
    });
  }, []);
  const [diamondControlDiagnostics, setDiamondControlDiagnostics] = useState<any>(null);
  const [gemMaskDiagnosticStatus, setGemMaskDiagnosticStatus] = useState<"idle"|"pending"|"ready"|"error"|"unavailable">("idle");
  const gemMaskDiagnosticsRef = useRef<any>(null);
  const refreshDiamondDiagnostics = useCallback(() => {
    setDiamondControlDiagnostics({
      bvh: diamondBvhRuntimeRef.current?.diagnostics?.() ?? null,
      micro: diamondMicroPipelineRef.current?.diagnostics?.() ?? null,
      gemMask: gemMaskDiagnosticsRef.current?.diagnostics?.() ?? null,
    });
  }, []);
  const requestGemMaskDiagnostics = useCallback(() => {
    const maskPass = gemMaskDiagnosticsRef.current;
    if (!maskPass?.requestDiagnostics) {
      setGemMaskDiagnosticStatus("unavailable");
      refreshDiamondDiagnostics();
      return;
    }
    if (!getAurumPostControls().gemMaskEnabled) {
      setGemMaskDiagnosticStatus("idle");
      refreshDiamondDiagnostics();
      return;
    }
    setGemMaskDiagnosticStatus("pending");
    maskPass.requestDiagnostics();
    refreshDiamondDiagnostics();
    // A demand-driven viewer may be asleep after the last stable frame.
    // Render synchronously so Gem Mask consumes the one-shot GPU readback request.
    const loop = viewerLoopRef.current;
    if (loop?.renderNow) loop.renderNow();
    else loop?.invalidate?.();
  }, [refreshDiamondDiagnostics]);
  useEffect(() => {
    const handleGemMaskDiagnosticsReady = (event: Event) => {
      const detail=(event as CustomEvent<any>).detail??{};
      const maskPixels = Number(detail.maskPixels);
      setGemMaskDiagnosticStatus(maskPixels < 0 ? "error" : "ready");
      setDiamondControlDiagnostics((current:any)=>({
        ...(current??{}),
        gemMask:{...(gemMaskDiagnosticsRef.current?.diagnostics?.()??{}),...detail},
      }));
    };
    const handleDiamondControl = (event: Event) => {
      const detail = (event as CustomEvent<{type?:string;enabled?:boolean}>).detail ?? {};
      if (detail.type === "bvh" && typeof detail.enabled === "boolean") {
        diamondBvhEnabledRef.current = detail.enabled;
        // One BVH master switch controls every production family currently enabled.
        // Keep both ruby spellings in sync because CAD/material metadata may carry either form.
        for (const family of ["diamante", "rubí", "rubi"]) {
          diamondBvhRuntimeRef.current?.setFamilyEnabled?.(family, detail.enabled);
        }
        setDiamondBvhEnabled(detail.enabled);
      } else if (detail.type === "micro" && typeof detail.enabled === "boolean") {
        diamondMicroEnabledRef.current = detail.enabled;
        diamondMicroPipelineRef.current?.setEnabled?.(detail.enabled);
        setDiamondMicroEnabled(detail.enabled);
      }
      refreshDiamondDiagnostics();
      viewerLoopRef.current?.invalidate?.();
    };
    window.addEventListener("aurum-diamond-control", handleDiamondControl);
    window.addEventListener("aurum-diamond-control-refresh", requestGemMaskDiagnostics);
    window.addEventListener("aurum-gem-mask-diagnostics-ready", handleGemMaskDiagnosticsReady);
    return () => {
      window.removeEventListener("aurum-diamond-control", handleDiamondControl);
      window.removeEventListener("aurum-diamond-control-refresh", requestGemMaskDiagnostics);
      window.removeEventListener("aurum-gem-mask-diagnostics-ready", handleGemMaskDiagnosticsReady);
    };
  }, [refreshDiamondDiagnostics, requestGemMaskDiagnostics]);
  const [cadTreeItems,setCadTreeItems] = useState<Array<{uuid:string;name:string;type:string;layer:string;visible:boolean;sourceId:string|null}>>([]);
  const [cadModelDiagnostics,setCadModelDiagnostics] = useState<any|null>(null);
  const refreshCadTree = () => {
    setCadTreeItems(apiRef.current?.getCadTree?.() ?? []);
    setCadModelDiagnostics(apiRef.current?.getModelDiagnostics?.() ?? null);
  };

  const exportSettingsRef = useRef({nombreProyecto,categoriaProyecto,archivo,materialId,gemaId,escenarioId,iluminacionId,vista,renderQualityId});
  exportSettingsRef.current={nombreProyecto,categoriaProyecto,archivo,materialId,gemaId,escenarioId,iluminacionId,vista,renderQualityId};
  const actualizarPoster = async () => {
    if (!archivo || !apiRef.current?.exportPNG) {
      setError("Primero carga una joya en Aurum Render.");
      return;
    }
    let destino: { rutaCarpeta?: string; nombre?: string } | null = null;
    try {
      const raw = sessionStorage.getItem("aurum-render-poster-destino");
      if (raw) destino = JSON.parse(raw) as { rutaCarpeta?: string; nombre?: string };
    } catch {
      destino = null;
    }
    const rutaCarpeta = destino?.rutaCarpeta && destino.rutaCarpeta.split("/").filter(Boolean).length >= 2
      ? destino.rutaCarpeta
      : null;
    setExportBusy(true);
    setError(null);
    try {
      await new Promise<void>((resolve, reject) => {
        let terminado = false;
        const timeout = window.setTimeout(() => {
          if (terminado) return;
          terminado = true;
          reject(new Error("La captura tardó demasiado. Inténtalo de nuevo."));
        }, 45000);
        try {
          apiRef.current.exportPNG({
            width: 640,
            format: "png",
            onCapture: (dataUrl: string) => {
              if (terminado) return;
              terminado = true;
              window.clearTimeout(timeout);
              void (async () => {
                try {
                  const response = await fetch(dataUrl);
                  const blob = await response.blob();
                  if (blob.type !== "image/png" || blob.size < 1024) throw new Error("La captura PNG está vacía o no es válida.");
                  setPosterPreview(dataUrl);
                  if (!rutaCarpeta) {
                    toast.success("Póster capturado. Se conserva en esta sesión; guarda la joya en Mi Nube para vincularlo permanentemente.");
                    resolve();
                    return;
                  }
                  const ruta = `${rutaCarpeta}/00-portada-aurum.png`;
                  const { error: uploadError } = await supabase.storage.from("mi-nube").upload(ruta, blob, {
                    contentType: "image/png",
                    upsert: true,
                    cacheControl: "3600",
                  });
                  if (uploadError) throw uploadError;
                  toast.success("Póster guardado en Mi Nube. Vuelve a la carpeta para ver la portada actualizada.");
                  resolve();
                } catch (cause) {
                  reject(cause);
                }
              })();
            },
          });
        } catch (cause) {
          window.clearTimeout(timeout);
          reject(cause);
        }
      });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo generar o guardar el póster.");
    } finally {
      setExportBusy(false);
    }
  };


  const abrirGuardarEnMiNube = async () => {
    const userId = sesion?.user?.id;
    const participanteId = sesion?.participante?.id;
    if (!userId || !participanteId) {
      toast.error("Inicia sesión con un taller activo para guardar el proyecto en Mi Nube.");
      return;
    }
    if (!archivo || !archivoOriginalInfo || !apiRef.current?.exportGLB || !apiRef.current?.exportPNG) {
      toast.error("Carga una joya antes de guardar el proyecto completo.");
      return;
    }
    setGuardandoProyectoNube(false);
    setNombreProyectoGuardar((destinoProyectoGuardado?.nombreProyecto && destinoProyectoGuardado.archivoNombre === archivoOriginalInfo.name)
      ? destinoProyectoGuardado.nombreProyecto
      : (nombreProyecto && nombreProyecto !== "Diseño de joyería" ? nombreProyecto : archivoOriginalInfo.name.replace(/\\.[^.]+$/, "")));
    try {
      const raiz = `${participanteId}/${userId}`;
      const { data, error: listError } = await supabase.storage.from("mi-nube").list(raiz, {
        limit: 1000,
        sortBy: { column: "name", order: "asc" },
      });
      if (listError) throw listError;
      const carpetas = (data ?? [])
        .filter((entrada) => !entrada.id && !entrada.metadata)
        .map((entrada) => entrada.name)
        .filter((name): name is string => Boolean(name));
      setCarpetasDestinoProyecto(carpetas);

      let carpetaRecordada = "";
      try {
        const rawSession = sessionStorage.getItem("aurum-render-poster-destino");
        if (rawSession) {
          const parsed = JSON.parse(rawSession) as Partial<AurumProjectDestination>;
          if (typeof parsed.rutaCarpeta === "string" && parsed.rutaCarpeta.startsWith(raiz + "/") &&
              (!parsed.archivoNombre || parsed.archivoNombre === archivoOriginalInfo.name)) {
            carpetaRecordada = parsed.rutaCarpeta.slice((raiz + "/").length).split("/")[0] ?? "";
          }
        }
        if (!carpetaRecordada) {
          const rawSaved = localStorage.getItem("aurum-render-proyecto-destino");
          if (rawSaved) {
            const parsed = JSON.parse(rawSaved) as Partial<AurumProjectDestination>;
            if (typeof parsed.rutaCarpeta === "string" &&
                parsed.rutaCarpeta.startsWith(raiz + "/") &&
                parsed.archivoNombre === archivoOriginalInfo.name &&
                parsed.archivoTamano === archivoOriginalInfo.size &&
                parsed.archivoModificado === archivoOriginalInfo.lastModified) {
              carpetaRecordada = parsed.rutaCarpeta.slice((raiz + "/").length).split("/")[0] ?? "";
            }
          }
        }
      } catch {
        carpetaRecordada = "";
      }
      if (carpetaRecordada && carpetas.includes(carpetaRecordada)) {
        setCarpetaDestinoSeleccionada(carpetaRecordada);
      } else {
        setCarpetaDestinoSeleccionada("__nueva__");
      }
      setGuardarProyectoOpen(true);
      setExportOpen(false);
      setError(null);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudieron consultar las carpetas de Mi Nube.";
      toast.error(`No se pudo preparar el guardado: ${message}`);
    }
  };

  const guardarProyectoEnMiNube = async () => {
    const userId = sesion?.user?.id;
    const participanteId = sesion?.participante?.id;
    if (!userId || !participanteId || !archivoOriginalInfo || !apiRef.current?.exportGLB || !apiRef.current?.exportPNG) {
      toast.error("La sesión o el modelo ya no están disponibles. Vuelve a cargar la joya e inténtalo de nuevo.");
      return;
    }
    const nombreVisibleProyecto = nombreProyectoGuardar.trim();
    if (!nombreVisibleProyecto) {
      toast.error("Escribe un nombre para el proyecto.");
      return;
    }
    const carpetaNueva = nombreVisibleProyecto
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80);
    const carpetaVinculada = destinoProyectoGuardado?.rutaCarpeta
      && destinoProyectoGuardado.archivoNombre === archivoOriginalInfo.name
      ? destinoProyectoGuardado.rutaCarpeta.split("/").filter(Boolean).pop()
      : null;
    // Si el archivo se abrió desde Mi Nube, actualizar siempre su carpeta vinculada.
    // No permitir que una selección accidental cambie el destino del proyecto.
    const carpeta = carpetaVinculada || (carpetaDestinoSeleccionada === "__nueva__"
      ? carpetaNueva
      : carpetaDestinoSeleccionada);
    if (!carpeta) {
      toast.error("El nombre de la carpeta no contiene caracteres válidos.");
      return;
    }
    if (carpeta.includes("/") || carpeta.includes("\\\\")) {
      toast.error("El nombre de la carpeta no puede contener separadores de ruta.");
      return;
    }

    setGuardandoProyectoNube(true);
    setError(null);
    const raiz = `${participanteId}/${userId}`;
    const rutaCarpeta = `${raiz}/${carpeta}`;
    const base = nombreVisibleProyecto
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "joya-aurum";
    // El 3DM es la fuente original: se conserva en Mi Nube y jamás se sobrescribe.
    // Las actualizaciones escriben solo el GLB de trabajo y el manifiesto de Aurum.
    const rutaGlb = `${rutaCarpeta}/01-modelo.glb`;
    const rutaConfiguracion = `${rutaCarpeta}/02-configuracion-aurum.json`;
    try {
      // Validar la cuota de carpetas justo antes de guardar, no solo al abrir el diálogo.
      // Actualizar una carpeta existente no consume una plaza nueva.
      const [{ data: participantePlan, error: participantePlanError }, { data: carpetasActuales, error: carpetasError }] = await Promise.all([
        supabase
          .from("ecosistema_participantes")
          .select("metadata")
          .eq("id", participanteId)
          .maybeSingle(),
        supabase.storage.from("mi-nube").list(raiz, {
          limit: 1000,
          sortBy: { column: "name", order: "asc" },
        }),
      ]);
      if (participantePlanError) throw participantePlanError;
      if (carpetasError) throw carpetasError;

      const planId = String((participantePlan?.metadata as Record<string, unknown> | null)?.["plan_comercial"] ?? "emprendedor");
      const { data: cuotaCarpetas, error: cuotaError } = await supabase
        .from("aurum_plan_quotas")
        .select("carpetas_mi_nube_max")
        .eq("plan_id", planId)
        .maybeSingle();
      if (cuotaError) throw cuotaError;
      const limiteCarpetas = cuotaCarpetas?.carpetas_mi_nube_max ?? 10;
      const carpetasExistentes = (carpetasActuales ?? [])
        .filter((entrada) => !entrada.id && !entrada.metadata)
        .map((entrada) => entrada.name)
        .filter((name): name is string => Boolean(name));
      const actualizaCarpetaExistente = carpetasExistentes.includes(carpeta);

      if (!actualizaCarpetaExistente && limiteCarpetas !== -1 && carpetasExistentes.length >= limiteCarpetas) {
        const nombrePlan = ({
          emprendedor: "Emprendedor",
          taller: "Taller",
          profesional: "Profesional",
          empresarial: "Empresarial",
        } as Record<string, string>)[planId] ?? planId;
        setGuardarProyectoOpen(false);
        const ordenPlanes: PlanComercialId[] = ["emprendedor", "taller", "profesional", "empresarial"];
        const indicePlanActual = ordenPlanes.indexOf(planId as PlanComercialId);
        let siguientePlan: { nombre: string; precio: string; carpetas: number; almacenamientoMiB: number } | null = null;
        if (indicePlanActual >= 0) {
          const { data: cuotasPlanesSuperiores, error: cuotasPlanesError } = await supabase
            .from("aurum_plan_quotas")
            .select("plan_id,carpetas_mi_nube_max,almacenamiento_mib");
          if (!cuotasPlanesError && cuotasPlanesSuperiores) {
            for (const candidatoId of ordenPlanes.slice(indicePlanActual + 1)) {
              const cuotaSuperior = cuotasPlanesSuperiores.find((q) => q.plan_id === candidatoId);
              const definicion = PLANES_COMERCIALES.find((p) => p.id === candidatoId);
              if (cuotaSuperior && definicion &&
                  cuotaSuperior.carpetas_mi_nube_max > limiteCarpetas &&
                  cuotaSuperior.carpetas_mi_nube_max !== -1) {
                siguientePlan = {
                  nombre: definicion.nombre,
                  precio: definicion.precioEtiqueta,
                  carpetas: cuotaSuperior.carpetas_mi_nube_max,
                  almacenamientoMiB: cuotaSuperior.almacenamiento_mib,
                };
                break;
              }
              if (cuotaSuperior && definicion && cuotaSuperior.carpetas_mi_nube_max === -1) {
                siguientePlan = {
                  nombre: definicion.nombre,
                  precio: definicion.precioEtiqueta,
                  carpetas: -1,
                  almacenamientoMiB: cuotaSuperior.almacenamiento_mib,
                };
                break;
              }
            }
          }
        }
        setLimiteMiNubeModal({
          plan: nombrePlan,
          limite: limiteCarpetas,
          usadas: carpetasExistentes.length,
          siguientePlan,
        });
        return;
      }

      const blobGLB = await apiRef.current.exportGLB({ download: false }) as Blob;
      if (!blobGLB || blobGLB.size < 1024) throw new Error("No se pudo preparar el GLB del visor.");

      // El GLB conserva geometría y materiales compatibles; este manifiesto recupera
      // las opciones propias del visor sin acoplarlas a la portada PNG.
      const configuracionAurum = {
        schemaVersion: 1,
        layerCategoryOverrides,
        nombreProyecto: nombreVisibleProyecto,
        categoriaProyecto,
        materialId,
        gemaId,
        escenarioId,
        iluminacionId,
        vista,
        metalHdriId,
        gemHdriId,
        ambienteId,
        ambienteMetalInfluence,
        fondoId,
        sueloVisible,
        sombraContactoVisible,
        // Guardar los controles visibles del estudio sin acoplarlos a posiciones internas del motor.
        lucesEstudio: {
          key: { enabled: lightingStudio.key.enabled, intensity: lightingStudio.key.intensity },
          fill: { enabled: lightingStudio.fill.enabled, intensity: lightingStudio.fill.intensity },
          rim: { enabled: lightingStudio.rim.enabled, intensity: lightingStudio.rim.intensity },
          gem: { enabled: lightingStudio.gem.enabled, intensity: lightingStudio.gem.intensity },
          front: { enabled: lightingStudio.front.enabled, intensity: lightingStudio.front.intensity },
          temperatureK: lightingStudio.temperatureK,
          reflectorPower: lightingStudio.reflectorPower,
          reflectorScale: lightingStudio.reflectorScale,
          largeSoftboxEnabled: lightingStudio.largeSoftboxEnabled === true,
          largeSoftboxPower: lightingStudio.largeSoftboxPower,
          reflectors: {
            softbox: lightingStudio.reflectors?.softbox !== false,
            strip: lightingStudio.reflectors?.strip !== false,
            kicker: lightingStudio.reflectors?.kicker !== false,
            edgeLeft: lightingStudio.reflectors?.edgeLeft !== false,
            edgeRight: lightingStudio.reflectors?.edgeRight !== false,
          },
        },
        guardadoEn: new Date().toISOString(),
      };
      const blobConfiguracion = new Blob([JSON.stringify(configuracionAurum, null, 2)], { type: "application/json" });

      // Si se capturó un póster antes de guardar el proyecto, vincularlo ahora a esta carpeta.
      const uploads: Array<{ ruta: string; blob: Blob; contentType: string }> = [
        { ruta: rutaGlb, blob: blobGLB, contentType: "model/gltf-binary" },
        { ruta: rutaConfiguracion, blob: blobConfiguracion, contentType: "application/json" },
      ];

      // El archivo fuente debe quedar en la carpeta del proyecto. Si ya existe allí,
      // o el proyecto conserva una ruta de origen guardada, no volver a subirlo ni sobrescribirlo.
      const nombreOriginal = archivoOriginalInfo.name.replace(/[\\/]/g, "_");
      const rutaOriginalEnCarpeta = `${rutaCarpeta}/${nombreOriginal}`;
      const { data: archivosEnCarpeta, error: listarCarpetaError } = await supabase.storage
        .from("mi-nube")
        .list(rutaCarpeta, { limit: 1000 });
      if (listarCarpetaError) throw listarCarpetaError;
      // Dentro de la carpeta exacta, el nombre coincidente basta para reconocer el objeto.
      // Storage puede devolver entradas sin id/metadata en algunos listados; no debemos
      // interpretar esa ausencia como permiso para volver a cargar el 3DM.
      const originalYaEnCarpeta = (archivosEnCarpeta ?? []).some((entrada) =>
        entrada.name === nombreOriginal
      );
      // Si se abrió desde Mi Nube, storagePath identifica el 3DM original.
      // Nunca volver a subirlo durante una actualización.
      const origenYaGuardado = Boolean(
        archivoOriginalInfo.storagePath &&
        (archivoOriginalInfo.storagePath === rutaOriginalEnCarpeta ||
          archivoOriginalInfo.storagePath.startsWith(`${rutaCarpeta}/`))
      ) || Boolean(
        destinoProyectoGuardado?.rutaCarpeta === rutaCarpeta &&
        destinoProyectoGuardado?.archivoNombre === archivoOriginalInfo.name &&
        destinoProyectoGuardado?.rutaArchivoOriginal?.startsWith(`${rutaCarpeta}/`)
      );
      // Una carpeta ya vinculada representa una actualización, no una importación.
      // En ese flujo el 3DM fuente es inmutable y nunca se vuelve a subir, aunque
      // el nombre local del GLB o los metadatos del archivo hayan cambiado.
      const esActualizacionDeProyectoVinculado =
        destinoProyectoGuardado?.rutaCarpeta === rutaCarpeta;
      if (!originalYaEnCarpeta && !origenYaGuardado && !esActualizacionDeProyectoVinculado) {
        let fuenteOriginal: File | null = archivoOriginal;
        if (!fuenteOriginal && archivoOriginalInfo.storagePath) {
          const { data: signed, error: signedError } = await supabase.storage.from("mi-nube").createSignedUrl(archivoOriginalInfo.storagePath, 300);
          if (signedError || !signed?.signedUrl) throw new Error("No se pudo preparar la descarga del 3DM original.");
          const originalResponse = await fetch(signed.signedUrl);
          if (!originalResponse.ok) throw new Error("No se pudo recuperar el 3DM original desde Mi Nube.");
          fuenteOriginal = new File([await originalResponse.blob()], archivoOriginalInfo.name, { type: archivoOriginalInfo.contentType || "application/octet-stream", lastModified: archivoOriginalInfo.lastModified });
        }
        if (!fuenteOriginal) throw new Error("No está disponible el archivo fuente 3DM para guardarlo.");
        uploads.unshift({ ruta: rutaOriginalEnCarpeta, blob: fuenteOriginal, contentType: fuenteOriginal.type || "application/octet-stream" });
      }

      if (posterPreview) {
        const posterResponse = await fetch(posterPreview);
        const posterBlob = await posterResponse.blob();
        if (posterBlob.type !== "image/png" || posterBlob.size < 1024) {
          throw new Error("El póster capturado ya no está disponible. Vuelve a generarlo antes de guardar.");
        }
        uploads.push({
          ruta: `${rutaCarpeta}/00-portada-aurum.png`,
          blob: posterBlob,
          contentType: "image/png",
        });
      }
      for (const item of uploads) {
        const { error: uploadError } = await supabase.storage.from("mi-nube").upload(item.ruta, item.blob, {
          contentType: item.contentType,
          upsert: true,
          cacheControl: "3600",
        });
        if (uploadError) throw new Error(`No se pudo guardar “${item.ruta.split("/").pop()}”: ${uploadError.message}`);
      }

      const destino: AurumProjectDestination = {
        rutaCarpeta,
        rutaArchivoOriginal: archivoOriginalInfo.storagePath ?? destinoProyectoGuardado?.rutaArchivoOriginal ?? rutaOriginalEnCarpeta,
        nombre: carpeta,
        nombreProyecto: nombreVisibleProyecto,
        archivoNombre: archivoOriginalInfo.name,
        archivoTamano: archivoOriginalInfo.size,
        archivoModificado: archivoOriginalInfo.lastModified,
      };
      localStorage.setItem("aurum-render-proyecto-destino", JSON.stringify(destino));
      sessionStorage.setItem("aurum-render-poster-destino", JSON.stringify(destino));
      setDestinoProyectoGuardado(destino);
      setCarpetasDestinoProyecto((actuales) => actuales.includes(carpeta) ? actuales : [...actuales, carpeta].sort((a, b) => a.localeCompare(b, "es")));
      setNombreProyecto(nombreVisibleProyecto);
      setGuardarProyectoOpen(false);
      toast.success(posterPreview
        ? "Proyecto guardado en Mi Nube junto con su archivo original y póster."
        : destinoProyectoGuardado?.rutaCarpeta === rutaCarpeta
          ? "Proyecto actualizado. El archivo original y el póster existente permanecen intactos."
          : "Proyecto guardado en Mi Nube junto con el archivo original.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo guardar el proyecto completo en Mi Nube.";
      setError(message);
      toast.error(message);
    } finally {
      setGuardandoProyectoNube(false);
    }
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
  const [mostrarTodasGemas, setMostrarTodasGemas] = useState(false);
  const [busquedaMateriales, setBusquedaMateriales] = useState("");
  const [familiaMaterialActiva, setFamiliaMaterialActiva] = useState("Todas");
  const [busquedaGemas, setBusquedaGemas] = useState("");
  const [familiaGemaActiva, setFamiliaGemaActiva] = useState("Predeterminadas");
  const familiaPrincipalMaterial = (grupo: string) => {
    const normalizado = grupo.toLocaleLowerCase("es");
    if (normalizado.includes("oro")) return "Oro";
    if (normalizado.includes("plata")) return "Plata";
    if (normalizado.includes("platino")) return "Platino";
    if (normalizado.includes("rodio")) return "Rodio";
    return "Otros";
  };
  const familiasMateriales = useMemo(() => ["Todas", ...Array.from(new Set(MATERIALES.map(m => familiaPrincipalMaterial(m.grupo))))], []);
  const [acabadoMaterialActivo, setAcabadoMaterialActivo] = useState("Todos");
  const filtrosColorOro = [{ label: "Amarillo", grupo: "Oro Amarillo" }, { label: "Blanco", grupo: "Oro Blanco" }, { label: "Rosa", grupo: "Oro Rosa" }];
  const materialesVisibles = useMemo(() => {
    const principales = new Set<MaterialId>(["oro18a_pulido", "oro18b_rodinado", "oro18r_pulido", "oro18_verde_blanco_ijewel", "plata925_pulida", "platino_pulido", "oro18a_ijewel_premium", "oro18b_ijewel_premium", "oro18r_ijewel_premium"]);
    const termino = busquedaMateriales.trim().toLocaleLowerCase("es");
    return MATERIALES.filter((m) =>
      (familiaMaterialActiva === "Todas" || familiaPrincipalMaterial(m.grupo) === familiaMaterialActiva) &&
      (acabadoMaterialActivo === "Todos" || m.grupo === acabadoMaterialActivo) &&
      (familiaMaterialActiva !== "Todas" || principales.has(m.id) || m.id === materialId || !!termino) &&
      (!termino || (m.nombre+" "+m.id+" "+m.grupo).toLocaleLowerCase("es").includes(termino))
    ).sort((a,b) => {
      if (familiaMaterialActiva === "Oro") {
        const ordenColor = (material: typeof a) => material.grupo === "Oro Amarillo" ? 0 : material.grupo === "Oro Blanco" ? 1 : material.grupo === "Oro Rosa" ? 2 : 3;
        const color = ordenColor(a) - ordenColor(b);
        if (color !== 0) return color;
        const quilates = (material: typeof a) => Number(material.id.match(/oro(22|18|14|10|9)/)?.[1] ?? 0);
        const k = quilates(b) - quilates(a);
        if (k !== 0) return k;
        const acabado = (material: typeof a) => {
          const nombre = material.nombre.toLocaleLowerCase("es");
          if (nombre.includes("rodinado")) return 0;
          if (nombre.includes("pulido")) return 1;
          if (nombre.includes("satinado")) return 2;
          if (nombre.includes("mate")) return 3;
          if (nombre.includes("cepillado")) return 4;
          return 5;
        };
        const f = acabado(a) - acabado(b);
        if (f !== 0) return f;
      }
      return Number(principales.has(b.id)) - Number(principales.has(a.id));
    });
  }, [materialId, busquedaMateriales, familiaMaterialActiva, acabadoMaterialActivo]);
  const familiasGemas = useMemo(() => ["Predeterminadas", ...Array.from(new Set(GEMAS.map(g => g.familia))).sort((a, b) => a.localeCompare(b, "es"))], []);
  const conteoGemasPorFamilia = useMemo(() => GEMAS.reduce<Record<string, number>>((conteos, gema) => {
    conteos[gema.familia] = (conteos[gema.familia] ?? 0) + 1;
    return conteos;
  }, {}), []);
  const gemasVisibles = useMemo(() => {
    const principales = new Set<GemaId>(["diamante_natural", "esmeralda_1", "rubi_natural", "zafiro_azul", "amatista_natural", "moissanita_blanca", "aguamarina_brasil", "citrino_natural", "topacio_azul"]);
    const termino = busquedaGemas.trim().toLocaleLowerCase("es");
    const grupoPredeterminado = familiaGemaActiva === "Predeterminadas" && termino.length === 0;
    return GEMAS.filter((g) =>
      (termino.length > 0 || grupoPredeterminado || g.familia === familiaGemaActiva) &&
      (!grupoPredeterminado || mostrarTodasGemas || principales.has(g.id)) &&
      (!termino || (g.nombre + " " + g.id + " " + g.familia + " " + (g.origen ?? "")).toLocaleLowerCase("es").includes(termino))
    ).sort((a, b) => {
      // Mantener el Diamante Azul al final de la familia, sin alterar el orden de otras gemas.
      if (a.familia === "Diamante" && b.familia === "Diamante") {
        if (a.id === "diamante_azul") return 1;
        if (b.id === "diamante_azul") return -1;
      }
      return Number(principales.has(b.id)) - Number(principales.has(a.id)) || a.nombre.localeCompare(b.nombre, "es");
    });
  }, [mostrarTodasGemas, busquedaGemas, familiaGemaActiva]);

  useEffect(() => {
    let vivo = true;
    let cleanup = () => {};
    let cleanupDone = false;
    // Keep deferred shader compilation cancellable when the viewer unmounts.
    let shaderPrecompileIdleId: number | null = null;
    let shaderPrecompileTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const frame = 0;
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
      // Match the Public Viewer drawing-buffer ceiling on every viewport.
      // Quality presets may lower this value, but never exceed 1.25 desktop / 1.0 mobile.
      const getAurumViewportPixelRatio = () => {
        const isCompactViewport = window.matchMedia("(max-width: 767px)").matches;
        return Math.min(window.devicePixelRatio || 1, isCompactViewport ? 1 : 1.25);
      };
      const { scene: escena, camera: camara, renderer, controls: controles } = createAurumWebGLViewer(THREE, nodo, {
        pixelRatio: getAurumViewportPixelRatio(),
        maxDistance: 100,
        controlsClass: (await import("three/examples/jsm/controls/OrbitControls.js")).OrbitControls,
      });
      setPerformanceRenderer(renderer);
      performanceMonitorRef.current.reset();
      // AURUM CORE adapter exposes the existing viewer without taking ownership
      // of its render loop, GPU resources, or disposal lifecycle.
      const viewerAdapter = createAurumViewerAdapter({
        scene: escena,
        camera: camara,
        renderer,
        controls: controles,
        host: nodo,
      });
      const viewerScene = viewerAdapter.get(AURUM_VIEWER_SERVICES.scene);
      const viewerRenderer = viewerAdapter.get(AURUM_VIEWER_SERVICES.renderer);
      orbitControlsRef.current = controles;
      // Match PublicCatalogViewer OrbitControls defaults for scroll and damping.
      // Public viewer keeps OrbitControls zoomSpeed at 1 and dampingFactor at 0.07.
      if (controles) {
        controles.enableDamping = true;
        controles.dampingFactor = 0.07;
        controles.zoomSpeed = 1;
        controles.rotateSpeed = 1;
      }
      // Render Pro se incorporará en una etapa posterior con el pipeline WebGPU
      // estable. Por ahora el visor WebGL interactivo es el motor oficial.
      const shadowConfig=getAurumShadowConfig();
      const postConfig=getAurumPostConfig();
      const ssaoConfig=getAurumSsaoConfig();
       // Exposición inicial; los presets de escena son la fuente de verdad
       // una vez creado el SceneController.
      renderer.setPixelRatio(Math.min(getAurumViewportPixelRatio(), renderQuality.pixelRatio));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      // Exposición calibrada para evitar clipping de blancos en metales pulidos y HDRI de estudio.
      renderer.toneMappingExposure = 1.0;
      // Calibración inicial de fotografía de producto. El preset de escena
      // vuelve a aplicar la exposición final; este valor evita un primer frame
      // excesivamente brillante mientras llegan el HDRI y el modelo.
      // Mantiene suficiente resolución para la transmisión de gemas sin convertirla
      // en un render pesado en equipos normales.
      (renderer as any).transmissionResolutionScale = renderQuality.transmissionScale;
      renderer.shadowMap.enabled = false; // Isolation phase: disable shadow-map rendering.
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      // Lighting and geometry are static between user changes. Build the shadow map only
      // when a light/model/quality change explicitly marks it dirty.
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;
      renderer.domElement.className = "block h-full w-full";
      // La vista ortográfica se conserva mientras el usuario solo hace clic.
      // Al detectar desplazamiento real del puntero, OrbitControls ya está
      // orbitando la cámara; actualizamos únicamente la etiqueta, sin aplicar
      // un preset de perspectiva ni reiniciar el movimiento.
      let orbitPointerStart: { id: number; x: number; y: number } | null = null;
      const handleOrbitPointerDown = (event: PointerEvent) => {
        const startsOrbit = event.pointerType === "touch" || (event.button === 0 && !event.ctrlKey);
        if (startsOrbit) orbitPointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
      };
      const handleOrbitPointerMove = (event: PointerEvent) => {
        if (!orbitPointerStart || event.pointerId !== orbitPointerStart.id || vistaRef.current === "perspectiva") return;
        const dx = event.clientX - orbitPointerStart.x;
        const dy = event.clientY - orbitPointerStart.y;
        if ((dx * dx) + (dy * dy) < 9) return;
        orbitPointerStart = null;
        autoVistaPorOrbitaRef.current = true;
        vistaRef.current = "perspectiva";
        setVista("perspectiva");
      };
      const handleOrbitPointerEnd = (event: PointerEvent) => {
        if (orbitPointerStart?.id === event.pointerId) orbitPointerStart = null;
      };
      renderer.domElement.addEventListener("pointerdown", handleOrbitPointerDown, { passive: true });
      renderer.domElement.addEventListener("pointermove", handleOrbitPointerMove, { passive: true });
      renderer.domElement.addEventListener("pointerup", handleOrbitPointerEnd, { passive: true });
      renderer.domElement.addEventListener("pointercancel", handleOrbitPointerEnd, { passive: true });
      nodo.appendChild(renderer.domElement);
      // SSR is globally disabled in the primary Aurum Render viewer until
      // reflection audits and A/B verification are complete. URL/profile
      // overrides cannot reactivate it during orbit or when the scene settles.
      const aurumSsrOverride = "disabled-until-audit";
      const isAurumSsrDiagnosticEnabled = () => false;
      const syncAurumSsrDiagnosticConfig = () => {
        postRuntimeConfig.ssr = false;
        return false;
      };
      const postRuntimeConfig = {
        ...ssaoConfig, ...postConfig, ssr: false,
        ...(PUBLIC_VIEWER_PRESENTATION_MODE ? {
          ssao: false, bloom: false, lut: false, gradeEnabled: false,
          taa: false, dof: false, vignette: false,
        } : {}),
      };
      syncAurumSsrDiagnosticConfig();
      // Preserve the original scene background while the live Bokeh preview is active.
      let dofSavedSceneBackground: THREE.Scene["background"] | undefined;
      let dofHasSavedSceneBackground = false;
      const { composer, ssaoPass, ssrPass, ssrSavePass, ssrCompositePass, bloomPass, setSSRSelects, applyQuality: applyPostQuality, updateTemporal, resetTemporalAccumulation, setTemporalMotion, setDiamondSupersamplingSettled, setDiamondSupersampleScaleCap, renderDiamondFxaaOverlay, renderDiamondSupersampleOverlay, diamondSupersamplePass, diamondSupersampleCompositePass, diamondTaaSavePass, diamondTaaCompositePass, dofPass, renderPass, taaPass: idleTaaPass, fxaaPass, gemMaskPass, surfaceEdgeAaPass, outputPass } = await createAurumPostPipeline(
        renderer,
        escena,
        camara,
        postRuntimeConfig,
        renderQuality
      );
      resetTemporalAccumulationRef.current = resetTemporalAccumulation;
      gemMaskDiagnosticsRef.current = gemMaskPass;
      // Initialize the optional diamond-only SSAA module in its settled state.
      setDiamondSupersamplingSettled?.(true);

      // The post pipeline loads Three.js passes asynchronously. If the route
      // unmounts while those imports are pending, release the renderer created
      // above instead of continuing to allocate scene/GPU resources off-screen.
      if (!vivo) {
        renderer.domElement.removeEventListener("pointerdown", handleOrbitPointerDown);
        renderer.domElement.removeEventListener("pointermove", handleOrbitPointerMove);
        renderer.domElement.removeEventListener("pointerup", handleOrbitPointerEnd);
        renderer.domElement.removeEventListener("pointercancel", handleOrbitPointerEnd);
        disposeAurumViewer({ node: nodo, renderer, controls: controles, composer });
        if (orbitControlsRef.current === controles) orbitControlsRef.current = null;
        return;
      }

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
      // Calibración HDR de gemas con la escena de referencia iJewel:
      // env-gem-010.exr, rotación 0 e intensidad 1 según el VJSON aportado.
      let gemEnvironmentUrl = getAurumGemHdriUrl("ijewelGem");
      let gemEnvironmentRotation = 0;
      let gemEnvironmentIntensityScale = 1;
      const aplicarEntornoGema = (targets?:readonly THREE.Mesh[]) => {
        if (!modelo || !entornoGema) return;
        if (targets?.length) {
          gemEnvironmentController.applyToTargets(targets, entornoGema, {
            rotation: gemEnvironmentRotation,
            intensityScale: gemEnvironmentIntensityScale,
          });
        } else {
          gemEnvironmentController.applyToModel(modelo, entornoGema, {
            rotation: gemEnvironmentRotation,
            intensityScale: gemEnvironmentIntensityScale,
          });
        }
        const gemEnvironmentDiagnostics = gemEnvironmentController.diagnostics?.();
        console.info("[AURUM][GEM HDR][ASSIGNMENT]", gemEnvironmentDiagnostics ?? {
          loaded: Boolean(entornoGema),
          url: gemEnvironmentUrl,
          note: "El HDR de gemas se informa por separado del envMap del material BVH.",
        });
        invalidateRenderRef.current?.();
      };
      let gemEnvironmentRequestId = 0;
      let metalHdriOverride: string | null = null;
      let gemHdriOverride: string | null = null;
      // Production calibration: 90 degrees was visually preferred in the
      // controlled A/B/C comparison. URL overrides keep the test reversible:
      // ?aurumGemHdriTest=0 (original), =90 or =180.
      const getGemHdriDiagnosticOffset = () => {
        if (typeof window === "undefined") return Math.PI / 2;
        const value = new URLSearchParams(window.location.search).get("aurumGemHdriTest");
        if (value === "0") return 0;
        if (value === "180") return Math.PI;
        return Math.PI / 2;
      };
      const cargarEntornoGema = (key="ijewelGem", rotation=0, intensityScale=1, onLoaded?:()=>void, onError?:()=>void) => {
        gemEnvironmentUrl = AURUM_GEM_ENVIRONMENT_PRESETS[key]?.url ?? getAurumGemHdriUrl(key);
        const baselineRotation = Number.isFinite(rotation) ? rotation : .54;
        const diagnosticOffset = getGemHdriDiagnosticOffset();
        gemEnvironmentRotation = baselineRotation + diagnosticOffset;
        console.info("[AURUM][GEM HDR][A_B_TEST]", {
          mode: diagnosticOffset === Math.PI / 2 ? "C_ROTATED_90" : diagnosticOffset === Math.PI ? "B_ROTATED_180" : "A_BASELINE",
          baselineRotationRadians: baselineRotation,
          diagnosticOffsetRadians: diagnosticOffset,
          diagnosticOffsetDegrees: Math.round(diagnosticOffset * 180 / Math.PI),
          appliedRotationRadians: gemEnvironmentRotation,
          restoresProductionDefault: diagnosticOffset === Math.PI / 2,
          metalEnvironmentUntouched: true,
        });
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
            // The BVH consumes the raw gem HDR URL. Reuse its runtime when
            // only the preset rotation/intensity changes or the same HDR is reselected.
            // Rebuild only when the underlying optical environment actually changes.
            if (diamondBvhRuntime && diamondBvhRuntimeUrl !== gemEnvironmentUrl) {
              diamondBvhRuntime.dispose();
              diamondBvhRuntime = null;
              diamondBvhRuntimeRef.current = null;
              diamondBvhRuntimeUrl = null;
            }
            if (diamondBvhRuntime && diamondBvhRuntimeUrl === gemEnvironmentUrl) {
              diamondBvhRuntime.updateEnvironment(gemEnvironmentRotation, gemEnvironmentIntensityScale);
            } else if (modelo && !diamondBvhRuntime) {
              void asegurarDiamanteBvh();
            }
            onLoaded?.();
          },
          () => {
            console.warn("[Aurum Render] Falló la carga del HDR de gemas seleccionado:", gemEnvironmentUrl);
            onError?.();
          }
        );
      };

      let hdrRequestId = 0;
      let ambientSelectionRequestId = 0;
      const cargarHDRI = (environmentKey:string, urlOverride?:string, rotation?:number, intensity?:number, onLoaded?:()=>void, onError?:()=>void) => {
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
            onLoaded?.();
          },
          () => {
            console.warn("[Aurum Render][HDR metal] No se pudo cargar el HDR solicitado; se mantiene el entorno disponible", {
              perfil: environmentKey,
              urlSolicitada: url,
              urlActiva: environmentController.currentUrl,
              usandoFallback: environmentController.currentUrl === null,
            });
            onError?.();
          }
        );
      };

      const aplicarAmbienteCombinado = (key:string) => {
        const preset = AURUM_AMBIENT_PRESETS[key];
        if (!preset?.metalKey || !(preset.metalKey in AURUM_HDRI_URLS)) {
          console.warn("[AURUM][AMBIENT] Preset sin pareja HDR válida:", key);
          toast.error("Este ambiente no tiene una pareja HDR válida de metales y gemas.");
          return;
        }

        const requestId = ++ambientSelectionRequestId;
        let metalReady = false;
        let gemReady = false;
        let failed = false;
        const finalize = () => {
          if (failed || requestId !== ambientSelectionRequestId || !metalReady || !gemReady) return;
          setMetalHdriId(preset.metalKey!);
          setGemHdriId(key);
          ambienteIdRef.current = key;
          setAmbienteId(key);
          console.info("[AURUM][AMBIENT][ACTIVE]", {
            id: key,
            metalKey: preset.metalKey,
            metalUrl: AURUM_HDRI_URLS[preset.metalKey!],
            gemUrl: preset.url,
            metalReady,
            gemReady,
          });
          toast.success(`${preset.name}: HDR de metales y gemas aplicado`);
        };
        const fail = (kind:"metales"|"gemas") => {
          if (requestId !== ambientSelectionRequestId || failed) return;
          failed = true;
          console.error("[AURUM][AMBIENT][LOAD FAILED]", { id:key, kind, metalReady, gemReady });
          toast.error(`No se pudo completar ${preset.name}: falló el HDR de ${kind}. Se restaurará el último ambiente confirmado.`);
          const previousKey = ambienteIdRef.current;
          if (previousKey && previousKey !== key && AURUM_AMBIENT_PRESETS[previousKey]) {
            // A paired selection can finish one side before the other fails.
            // Reapply the last fully confirmed pair so the UI and renderer agree.
            aplicarAmbienteCombinado(previousKey);
          }
        };

        metalHdriOverride = preset.metalKey;
        gemHdriOverride = key;
        console.info("[AURUM][AMBIENT][REQUEST]", {
          id:key,
          metalKey:preset.metalKey,
          metalUrl:AURUM_HDRI_URLS[preset.metalKey],
          gemUrl:preset.url,
        });
        cargarHDRI(
          preset.metalKey,
          undefined,
          preset.metalRotation ?? 0,
          preset.metalIntensity ?? 1,
          () => { metalReady = true; finalize(); },
          () => fail("metales")
        );
        cargarEntornoGema(
          key,
          preset.rotation,
          preset.intensity,
          () => { gemReady = true; finalize(); },
          () => fail("gemas")
        );
      };

      // El escenario inicial selecciona su propio Environment HDRI.

      let modelo:any = null;
      let diamondBvhRuntime: AurumDiamondBvhRuntime | null = null;
      let diamondBvhRuntimeUrl: string | null = null;
      let diamondBvhRuntimePending = false;
      // Diagnostic modes isolate the source of BVH speckles without changing
      // geometry or the production defaults:
      // ?aurumBvhTest=off | emerald-only | diamond-only
      const getBvhTestMode = () => typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("aurumBvhTest")
        : null;
      const isEmeraldBvhEnabled = () => typeof window !== "undefined"
        && (new URLSearchParams(window.location.search).get("aurumEmeraldBvh") === "1"
          || getBvhTestMode() === "emerald-only");
      let extremeBvhBudgetNoticeLogged = false;
      const asegurarDiamanteBvh = async () => {
        if (!vivo || !modelo || diamondBvhRuntime || diamondBvhRuntimePending) return;
        // Dense CAD models still need the gemstone BVH. Do not disable it
        // solely because the triangle budget is extreme; the runtime filters
        // mixed-material meshes and applies BVH only to consistent gem meshes.
        // Keep a diagnostic notice so performance can be monitored on dense assets.
        if (runtimeBudget.tier === "extreme" && !extremeBvhBudgetNoticeLogged) {
          extremeBvhBudgetNoticeLogged = true;
          console.info("[AURUM][GEM BVH] Modelo CAD extremo: se intenta activar BVH para las gemas compatibles.", {
            triangles: runtimeBudget.triangleCount,
            tier: runtimeBudget.tier,
          });
        }
        diamondBvhRuntimePending = true;
        const requestedEnvironmentUrl = gemEnvironmentUrl;
        let environmentChangedWhileLoading = false;
        try {
          const runtime = await createAurumDiamondBvhRuntime({
            THREE,
            RGBELoader,
            EXRLoader,
            url: requestedEnvironmentUrl,
            environmentRotationRadians: gemEnvironmentRotation,
            camera: camara,
            getViewportHeight: () => renderer.domElement.height,
            quality: "interactive",
            // Production BVH covers every compatible diamond size (MICRO,
            // SMALL and BRILLIANT), plus rubies through their dedicated profile.
            // Screen-space tiers keep secondary melee optics controlled without
            // excluding those meshes from BVH. ?aurumBvhTest=off disables all.
            targetFamilies: getBvhTestMode() === "off" ? [] : ["Diamante", "Rubí", "rubi"],
            diamondCenterOnly: false,
            // First-pass optical calibration is editor-only; the public viewer
            // keeps its established center/secondary BVH values unchanged.
            calibrateSecondaryDiamonds: true,
            onError: (error) => console.warn("[AURUM][GEM BVH] Se conserva el shader anterior para esta malla:", error),
          });
          if (!vivo || requestedEnvironmentUrl !== gemEnvironmentUrl) {
            runtime.dispose();
            environmentChangedWhileLoading = vivo && requestedEnvironmentUrl !== gemEnvironmentUrl;
            return;
          }
          diamondBvhRuntime = runtime;
          diamondBvhRuntimeRef.current = runtime;
          diamondBvhRuntimeUrl = requestedEnvironmentUrl;
          // Resolve the final model and camera transforms before building BVH
          // camera uniforms, so the first visible frame uses the current framing.
          modelo.updateMatrixWorld?.(true);
          camara.updateMatrixWorld?.(true);
          camara.updateProjectionMatrix?.();
          // Publish the same center/secondary decision used by the live diamond
          // optics before BVH target selection. If no unambiguous center exists,
          // BVH fails closed and every stone keeps its physical fallback.
          diamondMicroPipelineRef.current?.refresh?.();
          diamondMicroPipelineRef.current?.update?.();
          runtime.refresh(modelo);
          if (!diamondBvhEnabledRef.current) {
            for (const family of ["diamante", "rubí", "rubi"]) runtime.setFamilyEnabled(family, false);
          }
          runtime.update();
          const diagnostics = runtime.diagnostics();
          setDiamondControlDiagnostics({ bvh: diagnostics, micro: diamondMicroPipelineRef.current?.diagnostics?.() ?? null });
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
      const liveGeometryPreparing=false;
      const lightingControllerBase = createAurumLightingController(THREE, escena, lightingStudio, shadowConfig, renderQuality);
      // Keep the production controller as the sole owner; AURUM CORE provides
      // a stable adapter surface without changing light creation or calibration.
      const lightingController = createAurumLightingAdapter(lightingControllerBase);
      const lucesAurum = (lightingController as any).lights ?? {};
      const aplicarIluminacionPublica = () => {
        if (!PUBLIC_VIEWER_PRESENTATION_MODE) return;
        // Disable the AURUM-only studio rig. Use the exact three-light setup
        // from PublicCatalogViewer instead.
        Object.values(lucesAurum).forEach((light: any) => {
          if (light) light.visible = false;
        });
        if (!escena.userData.aurumPublicViewerLights) {
          const hemisphere = new THREE.HemisphereLight(0xffffff, 0x77716a, 0.6);
          hemisphere.name = "PublicViewer Hemisphere";
          const key = new THREE.DirectionalLight(0xffffff, 2.1);
          key.name = "PublicViewer Key";
          key.position.set(4, 7, 5);
          const fill = new THREE.DirectionalLight(0xffffff, 1.0);
          fill.name = "PublicViewer Fill";
          fill.position.set(-5, 2, -3);
          const rim = new THREE.DirectionalLight(0xffffff, 0.55);
          rim.name = "PublicViewer Rim";
          rim.position.set(-1, 4, -6);
          [hemisphere, key, fill, rim].forEach((light) => {
            light.userData.aurumPublicViewerLight = true;
            escena.add(light);
          });
          escena.userData.aurumPublicViewerLights = [hemisphere, key, fill, rim];
        }
        renderer.shadowMap.enabled = false;
        renderer.shadowMap.autoUpdate = false;
      };
      aplicarIluminacionPublica();

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
        const dpr = PUBLIC_VIEWER_PRESENTATION_MODE
          ? getAurumViewportPixelRatio()
          : Math.min(requestedDpr, runtimeBudget.pixelRatioCap, getAurumViewportPixelRatio());
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
        applyPostQuality?.({...renderQuality, pixelRatio:dpr, qualityId:id, runtimeBudgetTier:runtimeBudget.tier});
        liveTransmissionScaleRef.current=transmissionScale;
        (renderer as any).transmissionResolutionScale=transmissionScale;
        renderer.shadowMap.enabled = PUBLIC_VIEWER_PRESENTATION_MODE ? false : (liveFastPathRef.current ? false : renderQuality.shadows);
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
        aplicarIluminacionPublica();
        renderer.shadowMap.needsUpdate = true;
        if (modelo) {
          setAurumInclusionsVisible(modelo, false);
          // Keep other procedural inclusions hidden during interaction, but allow
          // the dedicated "Esmeralda · Inclusiones" profile as a controlled live test.
          setAurumEmeraldInclusionsVisible(modelo, false);
          // Both Calidad 3 and the dedicated Inclusiones profile carry jardin.
          // Only the active profile's generated meshes exist after material application.
          setAurumEmeraldInclusionsVisible(modelo, true, "esmeralda_3");
          setAurumEmeraldInclusionsVisible(modelo, true, "esmeralda_inclusiones");
          aplicarPerfilLive();
        }
        invalidateRenderRef.current?.();
        setRenderQualityId(id);
      };
      const actualizarLucesAurum = (patch:any) => {
        if (PUBLIC_VIEWER_PRESENTATION_MODE) return;
        lightingController.update(patch);
        // Lighting changes affect both the beauty frame and the shadow map.
        renderer.shadowMap.needsUpdate = true;
        invalidateRenderRef.current?.();
      };
      lucesRef.current = actualizarLucesAurum;
      // Inicializar el controlador, then immediately disable its AURUM-only rig.
      lightingController.create();
      aplicarIluminacionPublica();

      const aplicarIluminacion = (id:IluminacionId) => {
        if (PUBLIC_VIEWER_PRESENTATION_MODE) return;
        lightingController.applyPreset(id);
        renderer.shadowMap.needsUpdate = true;
        resetTemporalAccumulationRef.current?.();
        invalidateRenderRef.current?.();
        // Iluminación solo modifica luces. Scene conserva Environment y exposición.
      };

      // HDRI Ground is managed by groundController and remains disabled for now.
      const groundController = createAurumGround(THREE, escena);
      // Mostrar suelo inicia activado: mantener sincronizados el plano y su sombra de contacto.
      groundController.setVisible(true);
      groundController.setBakedShadowVisible(true);
      const suelo:any = groundController.mesh;
      const sceneController = createAurumSceneController(
        viewerScene,
        viewerRenderer,
        groundController,
        nodo,
        THREE
      );
      // Scene Adapter exposes the established scene controller through AURUM CORE.
      // The underlying presets, background rules and ground behaviour remain unchanged.
      const sceneAdapter = createAurumSceneAdapter(sceneController);
      // Fondo inicial del visor: blanco puro. Los proyectos guardados pueden
      // restaurar después su propio fondo desde la configuración del proyecto.
      sceneAdapter.setBackground("blanco");

      // AURUM CORE owns plugin lifecycle and service discovery only. Production
      // viewer/lighting/material controllers retain ownership of their GPU resources.
      const materialAdapterServices = getAurumMaterialAdapterServices();
      const renderPipelineContract = createAurumRenderPipelineContract({
        composer,renderPass,gemMaskPass,fxaaPass,surfaceEdgeAaPass,outputPass,taaPass:idleTaaPass,
        setTemporalMotion:(active:boolean)=>setTemporalMotion?.(active),
        updateTemporal:(camera:any,options?:any)=>updateTemporal?.(camera,options),
        resetTemporalAccumulation:()=>resetTemporalAccumulation?.(),
        applyQuality:(quality:any,options?:any)=>applyPostQuality?.(quality,options),
      });
      const mediaExportContract = createAurumMediaExportContract();
      const opticalContract = createAurumOpticalContract();
      const geometryEngine = createAurumGeometryEngine();
      const finalRenderLoader = async () => {
        const { createAurumFinalRenderAdapter } = await import("../lib/aurum/core/final-render-adapter");
        return createAurumFinalRenderAdapter();
      };
      // AURUM CAMERA groups the existing production camera actions without
      // creating a second OrbitControls instance or taking ownership of camera resources.
      const cameraModuleContract = Object.freeze({
        centerJewel: () => {
          if (!modelo) return;
          const bounds = getAurumVisibleProductBounds(modelo);
          if (bounds.isEmpty()) return;
          const target = bounds.getCenter(new THREE.Vector3());
          const delta = target.clone().sub(controles.target);
          camara.position.add(delta);
          controles.target.copy(target);
          camara.lookAt(target);
          camara.updateProjectionMatrix?.();
          controles.update?.();
          diamondBvhRuntime?.update();
          invalidateRenderRef.current?.();
        },
        fitAspect: (aspect?: number) => {
          if (!modelo) return false;
          // Keep the camera projection synchronized with the actual visible
          // canvas, including clean/no-frame mode and resizable export panels.
          // The requested aspect is used only to calculate framing; it must
          // never replace the live viewport projection aspect.
          const canvasRect = renderer.domElement.getBoundingClientRect();
          const viewportWidth = canvasRect.width || renderer.domElement.clientWidth || renderer.domElement.width;
          const viewportHeight = canvasRect.height || renderer.domElement.clientHeight || renderer.domElement.height;
          const viewportAspect = viewportWidth > 0 && viewportHeight > 0
            ? viewportWidth / viewportHeight
            : camara.aspect;
          if (Number.isFinite(viewportAspect) && viewportAspect > 0 && Math.abs(camara.aspect - viewportAspect) > 1e-4) {
            camara.aspect = viewportAspect;
            camara.updateProjectionMatrix();
          }
          const targetAspect = Number.isFinite(aspect) && Number(aspect) > 0 ? Number(aspect) : viewportAspect;
          // The composition frame is contained inside an 88% safe area of the
          // live viewport. A landscape frame is often much shorter than the
          // viewport itself; fitting only against its aspect leaves the jewel
          // clipped vertically. Convert the frame's displayed height back to
          // the camera's full-viewport FOV so the product fits inside the
          // actual output rectangle, whether the overlay frame is visible or not.
          const safeWidth = viewportWidth * 0.88;
          const safeHeight = viewportHeight * 0.88;
          const previewFrameWidth = Math.min(safeWidth, safeHeight * targetAspect);
          const previewFrameHeight = previewFrameWidth / targetAspect;
          const previewToFrameScale = previewFrameHeight > 0
            ? viewportHeight / previewFrameHeight
            : 1;
          const framingMargin = THREE.MathUtils.clamp(1.3 * previewToFrameScale, 1.3, 2.35);
          fitAurumCameraToAspect(camara, controles, modelo, targetAspect, framingMargin);
          camara.updateMatrixWorld(true);
          controles.update();
          diamondBvhRuntime?.update();
          resetTemporalAccumulationRef.current?.();
          viewerLoopRef.current?.invalidate?.();
          invalidateRenderRef.current?.();
          return true;
        },
        captureCameraState: () => ({
          position: camara.position.clone(),
          quaternion: camara.quaternion.clone(),
          up: camara.up.clone(),
          target: controles.target?.clone?.() ?? null,
          zoom: camara.zoom,
          aspect: camara.aspect,
          fov: camara.fov,
          near: camara.near,
          far: camara.far,
        }),
        restoreCameraState: (snapshot: any) => {
          if (!snapshot) return;
          camara.position.copy(snapshot.position);
          camara.quaternion.copy(snapshot.quaternion);
          camara.up.copy(snapshot.up);
          if (snapshot.target && controles.target) controles.target.copy(snapshot.target);
          camara.zoom = snapshot.zoom;
          camara.aspect = snapshot.aspect;
          camara.fov = snapshot.fov;
          camara.near = snapshot.near;
          camara.far = snapshot.far;
          camara.updateProjectionMatrix();
          camara.updateMatrixWorld(true);
          controles.update?.();
          diamondBvhRuntime?.update();
          resetTemporalAccumulationRef.current?.();
          viewerLoopRef.current?.invalidate?.();
          invalidateRenderRef.current?.();
        },
      });
      const productionPluginHost = createAurumProductionPluginHost([
        { id: "aurum.glb-quality", description: "Valida la integridad del GLB mediante round-trip real.", dependencies: ["aurum.import"], requiresServices: ["aurum.import.pipeline"], services: new Map([
          ["aurum.glb-quality.snapshot", captureAurumGlbQualitySnapshot],
          ["aurum.glb-quality.evaluate", evaluateAurumGlbQuality],
        ]) },
        { id: "aurum.edge-quality", description: "Coordina capacidades y MSAA del compositor productivo.", dependencies: ["aurum.viewer"], requiresServices: ["aurum.viewer.renderer"], services: new Map([
          ["aurum.edge-quality.configure", configureAurumEdgeQuality],
        ]) },
        { id: "aurum.post", description: "Expone el compositor y controles del pipeline de postprocesado ya activo.", dependencies: ["aurum.viewer", "aurum.edge-quality"], requiresServices: ["aurum.viewer.renderer", "aurum.edge-quality.configure"], services: new Map([
          ["aurum.post.composer", composer],
          ["aurum.post.apply-quality", applyPostQuality],
          ["aurum.post.reset-temporal", resetTemporalAccumulation],
          ["aurum.post.set-temporal-motion", setTemporalMotion],
          ["aurum.post.update-temporal", updateTemporal],
          ["aurum.post.module-contract", renderPipelineContract],
        ]) },
        { id: "aurum.media-export", description: "Servicios de captura de imagen y vídeo sobre el visor y compositor productivos.", dependencies: ["aurum.viewer", "aurum.post", "aurum.final-render"], requiresServices: ["aurum.viewer.renderer", "aurum.post.composer", "aurum.final-render.load-adapter"], services: new Map([
          ["aurum.media.video-frame.create", mediaExportContract.createFramePipeline],
          ["aurum.media.video-recorder", mediaExportContract.recordCanvas],
          ["aurum.media.module-contract", mediaExportContract],
          ["aurum.media.path-traced.capture", captureAurumPathTracedScene],
        ]) },
        { id: "aurum.camera", description: "Controles de cámara y encuadre del visor productivo; reutiliza OrbitControls y la cámara existentes.", dependencies: ["aurum.viewer"], requiresServices: ["aurum.viewer.camera", "aurum.viewer.controls"], services: new Map([
          ["aurum.camera.center-jewel", cameraModuleContract.centerJewel],
          ["aurum.camera.fit-aspect", cameraModuleContract.fitAspect],
          ["aurum.camera.orbit-controls", viewerAdapter.get(AURUM_VIEWER_SERVICES.controls)],
          ["aurum.camera.instance", viewerAdapter.get(AURUM_VIEWER_SERVICES.camera)],
        ]) },
        { id: "aurum.viewer", description: "Referencias read-only al visor WebGL productivo.", services: viewerAdapter.services },
        { id: "aurum.geometry", description: "Diagnóstico geométrico read-only del modelo.", services: new Map([["aurum.geometry.engine", geometryEngine]]) },
        { id: "aurum.import", description: "Orquestación de importación CAD y normalización GLB.", dependencies: ["aurum.geometry"], requiresServices: ["aurum.geometry.engine"], services: new Map([
          ["aurum.import.pipeline", aurumImportPlugin],
        ]) },
        { id: "aurum.scene", description: "Control de escena delegado al controlador productivo.", dependencies: ["aurum.viewer"], requiresServices: ["aurum.viewer.scene", "aurum.viewer.renderer"], services: sceneAdapter.services },
        { id: "aurum.lighting", description: "Control de iluminación delegado al controlador productivo.", dependencies: ["aurum.viewer"], requiresServices: ["aurum.viewer.scene"], services: lightingController.services },
        { id: "aurum.metal", description: "Servicios del motor de metales existente; sin ownership de materiales.", services: materialAdapterServices.metal },
        { id: "aurum.gem", description: "Servicios del motor óptico de gemas existente.", dependencies: ["aurum.metal"], requiresServices: ["aurum.metal.apply"], services: materialAdapterServices.gem },
        { id: "aurum.optical-contract", description: "Fachada tipada que reúne los contratos independientes de metales y gemas.", dependencies: ["aurum.metal", "aurum.gem"], requiresServices: ["aurum.metal.apply", "aurum.gem.apply-base-material"], services: new Map([
          ["aurum.optical.contract", opticalContract],
        ]) },
        { id: "aurum.final-render", description: "Render final bajo demanda mediante el path tracer existente.", dependencies: ["aurum.viewer"], requiresServices: ["aurum.viewer.scene", "aurum.viewer.camera", "aurum.viewer.renderer"], services: new Map([
          ["aurum.final-render.load-adapter", finalRenderLoader],
        ]) },
      ]);
      try {
        await productionPluginHost.registry.start();
        console.info("[AURUM][CORE] Plugins activos:", productionPluginHost.moduleIds);
      } catch (pluginError) {
        // Core composition must never blank the production viewer. If a plugin
        // fails to initialize, roll back its scope and keep the established renderer.
        console.error("[AURUM][CORE] Plugin startup failed; production renderer remains active:", pluginError);
      }
      const photoInicial = getAurumPhotographicProfile("ijewelReference");
      // La escena visual no administra los HDRI ni la exposición: se inicializan
      // aquí una sola vez y permanecen bajo sus controles independientes.
      // Production remains on the established ACES profile. Diagnostic overrides
      // are opt-in through the URL and never affect normal sessions.
      const toneAuditParams = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
      const toneAuditEnabled = toneAuditParams?.get("aurumToneAudit") === "1";
      const requestedToneMode = toneAuditParams?.get("aurumToneMode");
      const toneModeOverride = requestedToneMode === "agx"
        ? THREE.AgXToneMapping
        : requestedToneMode === "none"
          ? THREE.NoToneMapping
          : THREE.ACESFilmicToneMapping;
      renderer.toneMapping = toneModeOverride;
      renderer.toneMappingExposure = PUBLIC_VIEWER_PRESENTATION_MODE ? 1.0 : photoInicial.exposure;
      const toneMappingLabel = (value: number) => value === THREE.ACESFilmicToneMapping
        ? "ACESFilmic"
        : value === THREE.AgXToneMapping
          ? "AgX"
          : value === THREE.NoToneMapping
            ? "None"
            : "Other";
      let lastToneAuditPath: string | null = null;
      if (toneAuditEnabled) {
        console.info("[AURUM][TONE_AUDIT][INITIAL]", {
          requestedToneMode: requestedToneMode ?? "default",
          toneMapping: renderer.toneMapping,
          toneMappingName: toneMappingLabel(renderer.toneMapping),
          toneMappingExposure: renderer.toneMappingExposure,
          outputColorSpace: renderer.outputColorSpace,
          outputPassPresent: Boolean(outputPass),
          outputPassEnabled: Boolean(outputPass?.enabled),
          composerPasses: ((composer as any)?.passes ?? []).map((pass: any) => ({
            type: pass?.constructor?.name ?? "unknown",
            enabled: pass?.enabled !== false,
          })),
          hint: "Compare this report with the [PATH] report after the viewer settles and with a capture using the same jewel, camera and lighting.",
        });
      }
      const ambientInicial = AURUM_AMBIENT_PRESETS.predeterminado;
      let initialMetalReady = false;
      let initialGemReady = false;
      const confirmarAmbienteInicial = () => {
        if (!initialMetalReady || !initialGemReady) return;
        ambienteIdRef.current = "predeterminado";
        setAmbienteId("predeterminado");
        console.info("[AURUM][AMBIENT][INITIAL ACTIVE]", {
          id:"predeterminado",
          metalKey:ambientInicial.metalKey,
          gemUrl:ambientInicial.url,
        });
      };
      cargarHDRI(
        PUBLIC_VIEWER_PRESENTATION_MODE ? "ijewelMetal" : (ambientInicial.metalKey ?? photoInicial.environmentKey),
        undefined,
        PUBLIC_VIEWER_PRESENTATION_MODE ? 0 : (ambientInicial.metalRotation ?? Math.PI * photoInicial.environmentRotation),
        PUBLIC_VIEWER_PRESENTATION_MODE ? 1 : (ambientInicial.metalIntensity ?? photoInicial.environmentIntensity),
        () => { initialMetalReady = true; confirmarAmbienteInicial(); },
        () => toast.error("No se pudo cargar el HDR inicial de metales.")
      );
      const presetInicial = PUBLIC_VIEWER_PRESENTATION_MODE ? null : sceneAdapter.apply("ijewelReference");
      // The initial selected UI preset is confirmed only after both HDR maps load.
      cargarEntornoGema(
        PUBLIC_VIEWER_PRESENTATION_MODE ? "ijewelGem" : "predeterminado",
        PUBLIC_VIEWER_PRESENTATION_MODE ? 0 : ambientInicial.rotation,
        PUBLIC_VIEWER_PRESENTATION_MODE ? 1 : ambientInicial.intensity,
        () => { initialGemReady = true; confirmarAmbienteInicial(); },
        () => toast.error("No se pudo cargar el HDR inicial de gemas.")
      );
      Object.assign(postRuntimeConfig, {
        ssao: PUBLIC_VIEWER_PRESENTATION_MODE ? false : photoInicial.post.ssao,
        ssaoIntensity: photoInicial.post.ssaoIntensity,
        ssaoFalloff: photoInicial.post.ssaoFalloff,
        bloom: PUBLIC_VIEWER_PRESENTATION_MODE ? false : photoInicial.post.bloom,
        bloomIntensity: photoInicial.post.bloomIntensity,
        bloomThreshold: photoInicial.post.bloomThreshold,
        bloomRadius: photoInicial.post.bloomRadius,
        lut: PUBLIC_VIEWER_PRESENTATION_MODE ? false : photoInicial.post.lut,
        lutIntensity: photoInicial.post.lutIntensity,
        gradeEnabled: PUBLIC_VIEWER_PRESENTATION_MODE ? false : photoInicial.post.gradeEnabled,
        gradeContrast: photoInicial.post.gradeContrast,
        gradeSaturation: photoInicial.post.gradeSaturation,
        taa: PUBLIC_VIEWER_PRESENTATION_MODE ? false : photoInicial.post.taa,
        dof: PUBLIC_VIEWER_PRESENTATION_MODE ? false : photoInicial.post.dof,
        dofAperture: photoInicial.post.dofAperture,
        dofMaxBlur: photoInicial.post.dofMaxBlur,
        vignette: PUBLIC_VIEWER_PRESENTATION_MODE ? false : photoInicial.post.vignette,
        vignetteDarkness: photoInicial.post.vignetteDarkness,
      });
      // La escena es la fuente de verdad también para la estrategia de iluminación.
      if (!PUBLIC_VIEWER_PRESENTATION_MODE) lightingController.applyPreset(photoInicial.lighting);
      aplicarIluminacionPublica();
      applyPostQuality?.({...renderQuality, qualityId: renderQualityId, runtimeBudgetTier:runtimeBudget.tier});

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
      const quitar = () => {
        if (modelo) {
          const publicShadow = modelo.userData?.aurumPublicContactShadow;
          if (publicShadow) {
            escena.remove(publicShadow);
            publicShadow.geometry?.dispose?.();
            const shadowMaterial = publicShadow.material;
            shadowMaterial?.map?.dispose?.();
            shadowMaterial?.dispose?.();
          }
          modelo.userData={...(modelo.userData??{}),aurumDisposed:true};
          escena.remove(modelo);
          disposeAurumLiveGeometry(modelo);
          disposeAurumThicknessCacheForTarget(modelo);
          dispose(modelo);
          modelo=null;
        }
        // Keep the ground controller-owned meshes in the scene for the next model;
        // hide them together instead of disposing only the floor and orphaning bakedShadow.
        groundController.setVisible(false);
        groundController.setBakedShadowVisible(false);
        gemMaskPass?.refreshCache?.();
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
              const isGem=Boolean(m.userData?.aurumGemFamily);
              const disableGemTransmission=isGem && Number(m.transmission??0)!==0;
              // Keep the established lightweight LIVE gemstone profile for every
              // family, including diamonds. The authored optical properties are
              // restored exactly when interaction ends.
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
                  const gemFamily=String(m.userData?.aurumGemFamily??"");
                  const isEmerald=gemFamily==="Esmeralda";
                  const liveTransmissionCap=0.35;
                  // Preserve each emerald catalog profile's authored transmission in LIVE.
                  // The BVH shader previously supplied a translucent appearance but
                  // flattened all emerald grades to one fixed green. Native physical
                  // transmission must not be reduced so aggressively or the gem reads
                  // as an opaque faceted solid. Other gem families keep their existing cap.
                  m.transmission=isEmerald
                    ? Math.min(0.95,authoredTransmission)
                    : Math.min(authoredTransmission,liveTransmissionCap);
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

      const aplicarPerfilLive = (forceLive?:boolean) => {
        // Material quality is independent from the renderer path (direct vs composer).
        // FXAA availability must never decide whether LIVE or BEAUTY materials are used.
        // The interactive viewport and standard PNG capture use the LIVE profile.
        // The diamond keeps its dedicated spectral shader; colored gems use the
        // native MeshPhysicalMaterial output path to preserve their catalog body hue.
        const live=forceLive ?? true;
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
        // Keep transmission/refraction sampling identical in LIVE and settled
        // rendering; the interaction-only scale was visibly softening polished metal.
        liveTransmissionScaleRef.current = Math.min(
          renderQuality.transmissionScale,
          runtimeBudget.transmissionScaleCap,
        );
        (renderer as any).transmissionResolutionScale=liveTransmissionScaleRef.current;
      };

      const aplicarGema = (g:GemaConfig, objetivo?:any, aplicarTodas=false, renderImmediately=true) => {
        const target=objetivo||parteActiva;
        const isDiamondSelection=String(g?.familia??"").toLocaleLowerCase()==="diamante";
        let resolvedTargets:any[]=[];
        let dispersionOnlySwitch=false;
        const applied=applyAurumGemToTarget(
          target,
          g,
          aplicarEntornoGema,
          ()=>invalidateRenderRef.current?.(),
          aplicarTodas,
          (targets:any[])=>{
            resolvedTargets=targets;
            // A diamond catalog switch must not wait for an appearance animation:
            // cancel any previous blend and apply the new optical profile directly.
            gemTransitionRef.current?.cancel?.();
            gemTransitionRef.current=null;
            resolvedTargets.forEach((mesh:any)=>{
              const next={...(mesh.userData??{})};
              delete next.aurumGemTransitionSnapshot;
              if(!isDiamondSelection){
                next.aurumGemTransitionSnapshot=captureAurumGemTransitionState(mesh);
              }
              mesh.userData=next;
            });
          },
          (targets:any[],from:number,to:number)=>{
            dispersionOnlySwitch=true;
            if(diamondDispersionFrameRef.current!==null && typeof window!=="undefined"){
              window.cancelAnimationFrame(diamondDispersionFrameRef.current);
              diamondDispersionFrameRef.current=null;
            }
            const started=typeof performance!=="undefined"?performance.now():Date.now();
            const duration=260;
            const update=(now:number)=>{
              const t=Math.max(0,Math.min(1,(now-started)/duration));
              const eased=t*t*(3-2*t);
              const value=from+(to-from)*eased;
              targets.forEach((mesh:any)=>{
                const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
                materials.forEach((material:any)=>setAurumDiamondSourceDispersion(material,value));
                mesh.userData={...(mesh.userData??{}),aurumDiamondSourceDispersion:value};
              });
              diamondBvhRuntime?.setDiamondDispersion?.(targets,value);
              invalidateRenderRef.current?.();
              if(t<1 && typeof window!=="undefined"){
                diamondDispersionFrameRef.current=window.requestAnimationFrame(update);
              }else{
                diamondDispersionFrameRef.current=null;
                targets.forEach((mesh:any)=>{
                  const data={...(mesh.userData??{})};
                  delete data.aurumDiamondDispersionOnlyUpdate;
                  mesh.userData=data;
                });
                invalidateRenderRef.current?.();
              }
            };
            if(typeof window!=="undefined"){
              diamondDispersionFrameRef.current=window.requestAnimationFrame(update);
            }else{
              targets.forEach((mesh:any)=>{
                const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
                materials.forEach((material:any)=>setAurumDiamondSourceDispersion(material,to));
              });
              diamondBvhRuntime?.setDiamondDispersion?.(targets,to);
            }
          },
        );
        if(!applied){
          console.error("[AURUM][GEM APPLICATION FAILED]",{
            requestedId:String(g?.id??""),
            requestedFamily:String(g?.familia??""),
            targetName:target?.name??null,
            targetUuid:target?.uuid??null,
            targetIsMesh:Boolean(target?.isMesh),
            targetCategory:target?.userData?.aurumRhino?.categoria??null,
            targetLayer:target?.userData?.aurumRhino?.capa??null,
            reason:!target?.isMesh?"No active mesh target":"Target is not classified as a gemstone (aurumRhino.categoria !== gema)",
          });
          toast.error("No se aplicó la gema: selecciona una pieza clasificada como gema.");
          return false;
        }

        // Reconcile the screen-space diamond analyzer after gem assignment:
        // a mesh may become a diamond (or cease to be one) during this session.
        diamondMicroPipelineRef.current?.refresh?.();

        // Newly assigned catalog materials are created in BEAUTY by the gem
        // adapter. Reapply the interactive profile immediately so every newly
        // selected stone uses the same color pipeline as the rest of the viewport.
        aplicarPerfilLive();

        // Rebuild the central-diamond mask after catalog identity/material metadata changes.
        gemMaskPass?.refreshCache?.();

        // Preserve the existing procedural-inclusion visibility policy for
        // emerald grades while keeping this work out of the material hot path.
        setAurumInclusionsVisible(target, false);
        setAurumEmeraldInclusionsVisible(target, false);
        const selectedEmeraldId=String(g?.id??"");
        if(selectedEmeraldId==="esmeralda_3" || selectedEmeraldId==="esmeralda_inclusiones"){
          setAurumEmeraldInclusionsVisible(target, true, selectedEmeraldId);
        }

        // Paint the catalog material immediately. BVH shader preparation is an
        // optional refinement and must never sit in front of this first frame.
        if(renderImmediately) viewerLoopRef.current?.renderNow?.();
        else invalidateRenderRef.current?.();

        if(renderImmediately && resolvedTargets.length && !dispersionOnlySwitch){
          // Keep the selected meshes and application token stable across the
          // transition. BVH may replace the physical material, so it must wait
          // until this appearance blend has completed.
          const applicationSnapshot=resolvedTargets.map((mesh:any)=>({
            mesh,
            token:Number(mesh.userData?.aurumGemApplicationToken??0),
            gemId:String(mesh.userData?.aurumActiveGemId??""),
          }));
          const selectedGemFamily=String(g?.familia??"").toLocaleLowerCase();
          const emeraldBvhOptIn=isEmeraldBvhEnabled();
          const refreshChangedTargets=()=>{
            if(!vivo||!modelo)return;
            const currentTargets=applicationSnapshot
              .filter(({mesh,token,gemId})=>
                Number(mesh.userData?.aurumGemApplicationToken??0)===token
                && String(mesh.userData?.aurumActiveGemId??"")===gemId
                && gemId===String(g?.id??"")
              )
              .map(({mesh})=>mesh);
            if(!currentTargets.length)return;
            // Gem assignments can turn previously non-diamond meshes into
            // diamonds. Rebuild the lightweight mesh registry only on this
            // material-change path, then publish tiers before BVH reconciliation.
            diamondMicroPipeline.refresh();
            diamondMicroPipeline.update();
            if(diamondBvhRuntime){
              // O(k) for non-diamond changes; only the selected meshes are
              // reconsidered and unrelated BVH entries remain untouched.
              diamondBvhRuntime.refreshTargets(modelo,currentTargets);
              diamondBvhRuntime.update();
              const targetBvhDiagnostics=diamondBvhRuntime.diagnostics();
              console.info("[AURUM][GEM BVH][TARGET REFRESH]", {
                targetCount:currentTargets.length,
                targets:currentTargets.map((mesh:any)=>({
                  mesh:mesh.name||mesh.uuid,
                  gemId:String(mesh.userData?.aurumActiveGemId??""),
                  family:String(mesh.userData?.aurumActiveGemFamily??""),
                  centerProtected:Boolean(mesh.userData?.aurumDiamondMicroCenterProtected),
                  tier:String(mesh.userData?.aurumDiamondMicroTier??""),
                })),
                activeMeshes:targetBvhDiagnostics.activeMeshes,
                diamondMeshes:targetBvhDiagnostics.diamondMeshes,
                centerTargetDiagnostics:targetBvhDiagnostics.centerTargetDiagnostics,
                skippedTargetMeshes:targetBvhDiagnostics.skippedTargetMeshes,
              });
              setDiamondControlDiagnostics((current:any)=>({...(current??{}),bvh:targetBvhDiagnostics}));
              // BVH swaps the material after the initial micro registry refresh.
              // Re-index from the stable mesh-level diamond identity it publishes.
              diamondMicroPipeline.refresh();
              diamondMicroPipeline.update();
            }else if(selectedGemFamily==="diamante" || (selectedGemFamily==="esmeralda" && emeraldBvhOptIn)){
              // First-time runtime loading remains asynchronous and cannot block
              // the already-painted MeshPhysicalMaterial fallback.
              void asegurarDiamanteBvh();
            }
            invalidateRenderRef.current?.();
          };
          const scheduleIdle=()=>{
            if(typeof window!=="undefined" && typeof (window as any).requestIdleCallback==="function"){
              (window as any).requestIdleCallback(refreshChangedTargets,{timeout:1500});
            }else if(typeof window!=="undefined"){
              window.setTimeout(refreshChangedTargets,100);
            }else{
              refreshChangedTargets();
            }
          };
          // Interpolate appearance only; optical identity and shader/BVH systems stay untouched.
          const previousAppearance=resolvedTargets.flatMap((mesh:any)=>mesh.userData?.aurumGemTransitionSnapshot??[]);
          resolvedTargets.forEach((mesh:any)=>{
            const next={...(mesh.userData??{})};
            delete next.aurumGemTransitionSnapshot;
            mesh.userData=next;
          });
          gemTransitionRef.current=previousAppearance.length
            ? createAurumGemTransition(
                resolvedTargets,
                previousAppearance,
                ()=>invalidateRenderRef.current?.(),
                260,
                ()=>{
                  gemTransitionRef.current=null;
                  scheduleIdle();
                },
              )
            : null;
          // If no compatible material could be blended, proceed without
          // delaying BVH. Otherwise the completion callback schedules it.
          if(!gemTransitionRef.current?.active){
            if(typeof window!=="undefined")window.requestAnimationFrame(scheduleIdle);
            else scheduleIdle();
          }
        }
        return true;
      };
      const aplicarMaterial = (m:MaterialConfig, aplicarTodos=false) => {
        if (!modelo) {
          configurarMaterial(material, m);
          return;
        }
        applyAurumMaterialToModel(modelo, parteActiva, m, material, aplicarTodos);
        // Full-model material audit is intentionally opt-in. Traversing every
        // mesh and building diagnostic objects after each selection blocks dense
        // CAD models even when only one piece's material changed.
        const materialAuditEnabled = typeof window !== "undefined"
          && new URLSearchParams(window.location.search).get("aurumMaterialAudit") === "1";
        if (materialAuditEnabled) {
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
        }
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
        if (PUBLIC_VIEWER_PRESENTATION_MODE) {
          aplicarIluminacionPublica();
          invalidateRenderRef.current?.();
          return;
        }
        // Cambiar la iluminación no debe alterar la ruta de renderizado:
        // el pipeline de belleza se controla exclusivamente por el ciclo del visor.
        const scenePreset = sceneAdapter.apply(id);
        if (Number.isFinite(scenePreset.environmentRotation)) {
          environmentController.setRotation(scenePreset.environmentRotation as number);
        }
        const nextGemRotation = Number.isFinite(scenePreset.gemEnvironmentRotation)
          ? scenePreset.gemEnvironmentRotation as number
          : gemEnvironmentRotation;
        const nextGemIntensity = Number.isFinite(scenePreset.gemEnvironmentIntensity)
          ? Math.max(.75, Math.min(1.35, scenePreset.gemEnvironmentIntensity))
          : gemEnvironmentIntensityScale;
        const nextGemEnvironmentKey = scenePreset.gemEnvironmentKey ?? "ijewelGem";
        // Load the scene's actual gemstone HDRI, then synchronize standard and BVH materials.
        cargarEntornoGema(nextGemEnvironmentKey, nextGemRotation, nextGemIntensity);
        console.info("[AURUM][GEM SCENE CALIBRATION]",{
          scene:id,
          gemEnvironmentKey:nextGemEnvironmentKey,
          gemEnvironmentRotation:nextGemRotation,
          gemEnvironmentIntensityScale:nextGemIntensity,
        });
        // La galería de escenas no modifica cámara, encuadre, distancia ni FOV.
        // Los datos cameraDirection del VJSON se conservan como referencia, no se aplican.
        // Aplicar solo los parámetros de sombra compatibles con la luz Spot de AURUM.
        if (scenePreset.shadowProfile) {
          const applied=lightingController.applyIJEWELShadowProfile(scenePreset.shadowProfile);
          console.info("[AURUM][IJEWEL SCENE]",{
            scene:id,bakeProfile:scenePreset.bakedShadowProfile,runtimeShadowApplied:applied,
            shadowMap:[scenePreset.shadowProfile.mapWidth,scenePreset.shadowProfile.mapHeight],
            radius:scenePreset.shadowProfile.shadowRadius,bias:scenePreset.shadowProfile.bias,
            cameraNearFar:[scenePreset.shadowProfile.near,scenePreset.shadowProfile.far],
            bakeIntensityReferenceOnly:scenePreset.shadowProfile.lightIntensity,
            frustumReferenceOnly:scenePreset.shadowProfile.frustumSize,
            shadowTargetReferenceOnly:scenePreset.shadowTarget,shadowOffsetReferenceOnly:scenePreset.shadowOffset,
          });
        }
        renderer.shadowMap.needsUpdate = true;
        invalidateRenderRef.current?.();
      };
      const encuadrar = () => {
        if (!modelo) return;
        // ModelPreparation + Camera/Lighting se coordinan desde el adaptador de framing.
        // Mantener esta llamada como único punto de encuadre evita duplicar transformaciones.
        frameAurumProduct({
          camera: camara, controls: controles, lights: lucesAurum,
          groundController, lightingController, scene: escena, renderer,
        }, modelo, prepareAurumModel, aplicarEscenario, escenarioId, categoriaProyectoRef.current, "publicViewer", true);
        // Embedded public configurators have a narrower viewport than the
        // full editor. Pull the camera back slightly so the entire jewel has
        // breathing room without changing framing in the main editor.
        if (embedded && controles?.target && camara?.position) {
          const target = controles.target;
          const offset = camara.position.clone().sub(target);
          offset.multiplyScalar(1.16);
          camara.position.copy(target).add(offset);
          camara.updateProjectionMatrix?.();
          controles.update?.();
        }
        renderer.shadowMap.needsUpdate = true;
        invalidateRenderRef.current?.();
      };

      // Adaptadores de entrada: cada formato produce un Object3D común.
      // Rhino 3DM se decodifica con Rhino3dmLoader/WebAssembly y después
      // sigue exactamente el mismo flujo: Object3D -> GLB interno -> WebGL.
      const obtenerPartes = (objeto:any):ParteModelo[] => getAurumModelParts(objeto, colorRhinoHex, clasificarCapa);

      const cargar = async(file:File, informar:(paso:string, completed?:number, total?:number)=>void) => {
        // Opt-in load diagnostics: append ?aurumLoadAudit=1 to measure each stage
        // without changing the production rendering path or model geometry.
        const loadAuditEnabled = typeof window !== "undefined"
          && new URLSearchParams(window.location.search).get("aurumLoadAudit") === "1";
        const loadAuditStarted = performance.now();
        let loadAuditPrevious = loadAuditStarted;
        const loadAuditStep = (stage:string, details:Record<string, unknown> = {}) => {
          if (!loadAuditEnabled) return;
          const now = performance.now();
          console.info("[AURUM][LOAD AUDIT]", {
            file: file.name,
            stage,
            stageMs: Number((now - loadAuditPrevious).toFixed(1)),
            totalMs: Number((now - loadAuditStarted).toFixed(1)),
            ...details,
          });
          loadAuditPrevious = now;
        };
        const ext=file.name.split(".").pop()?.toLowerCase();
        if (!ext || !["stl","obj","glb","fbx","3dm"].includes(ext)) {
          throw new Error("Formato no compatible. Usa STL, OBJ, GLB, FBX o 3DM.");
        }
        // Match PublicCatalogViewer: decode the original file directly and
        // preprocess that Object3D. Do not route through ImportPipelineManager,
        // intermediate GLB conversion, Smart Scan or deep geometry diagnostics.
        const objeto = await parseAurumInput(file, ext, material, (message) => informar(message));
        if (!objeto) throw new Error("No se pudo interpretar la geometría del modelo 3D.");

        // Match the public viewer's Rhino Z-up -> Three.js Y-up correction and
        // its fallback classification for meshes without explicit CAD family.
        if (ext === "3dm") {
          objeto.rotation.x = -Math.PI / 2;
          objeto.updateMatrixWorld(true);
          const rootData = objeto.userData ?? {};
          // Rhino3dmLoader stores the layer manifest on the model root. Mesh
          // attributes usually contain only layerIndex, so resolve that index
          // before classifying the mesh. Otherwise Gem 01 is incorrectly
          // treated as an unknown/default metal during the first-load pass.
          const layerManifest = [
            rootData.layers,
            rootData.rhinoLayers,
            rootData.aurumRhinoSourceLayers,
          ].find((value: any) => Array.isArray(value) && value.length) ?? [];
          const layerById = new Map<string, any>();
          layerManifest.forEach((layer: any) => {
            const id = layer?.id ?? layer?.Id;
            if (id !== null && id !== undefined) layerById.set(String(id), layer);
          });
          let gemLayerMeshes = 0;
          let metalLayerMeshes = 0;
          let defaultMetalMeshes = 0;
          objeto.userData = {
            ...rootData,
            aurumPublicSourceFormat: "3dm",
            aurumSourceFormat: "3dm",
          };
          objeto.traverse((node: any) => {
            if (!node?.isMesh) return;
            const data = node.userData ?? {};
            const meta = data.aurumRhino ?? {};
            const source = data.aurumRhinoSource ?? {};
            const instanceSource = data.aurumRhinoInstanceSource ?? {};
            const instanceReference = data.aurumRhinoInstanceReference ?? {};
            const rhinoLayer = data.rhinoLayer ?? data.RhinoLayer ?? {};
            const attributes = data.attributes ?? {};
            const rawLayerIndex =
              instanceSource.layerIndex ?? instanceReference.layerIndex ??
              source.layerIndex ?? attributes.layerIndex ?? attributes.LayerIndex ??
              data.layerIndex ?? data.LayerIndex ?? meta.layerIndex;
            const layerIndex = rawLayerIndex === null || rawLayerIndex === undefined || rawLayerIndex === ""
              ? -1 : Number(rawLayerIndex);
            const layerId =
              instanceSource.layerId ?? instanceReference.layerId ?? source.layerId ??
              attributes.layerId ?? attributes.LayerId ?? data.layerId ?? data.LayerId ??
              rhinoLayer.id ?? rhinoLayer.Id ?? meta.rhinoLayerId;
            let sourceLayer = Number.isInteger(layerIndex) && layerIndex >= 0
              ? layerManifest[layerIndex]
              : undefined;
            if (!sourceLayer && layerId !== null && layerId !== undefined) {
              sourceLayer = layerById.get(String(layerId));
            }
            const layerName = String(
              sourceLayer?.fullPath ?? sourceLayer?.FullPath ??
              sourceLayer?.name ?? sourceLayer?.Name ??
              rhinoLayer.fullPath ?? rhinoLayer.FullPath ??
              rhinoLayer.name ?? rhinoLayer.Name ??
              instanceSource.layerName ?? instanceReference.layerName ??
              source.layerName ?? attributes.layerName ?? attributes.LayerName ??
              data.layerName ?? data.LayerName ?? meta.capa ?? meta.layerName ?? node.name ?? ""
            ).trim();
            const layerColor = sourceLayer?.color ?? sourceLayer?.Color ??
              source.layerColor ?? attributes.layerColor ?? attributes.LayerColor ?? null;
            const materials = Array.isArray(node.material)
              ? node.material : node.material ? [node.material] : [];
            const materialColor = materials.find((entry: any) => entry?.color)?.color;
            const colorHex = colorRhinoHex(layerColor ?? materialColor);
            const layerFamily = clasificarCapa(layerName, colorHex);
            const manualCategory = meta.aurumManualCategoryAssignment === true &&
              (meta.categoria === "gema" || meta.categoria === "metal" || meta.categoria === "otro")
              ? meta.categoria
              : undefined;
            const publicFamily = classifyPublicMesh(node);
            // The explicit Rhino layer name is authoritative over generic
            // imported material/object names. Manual user overrides remain
            // strongest and are never overwritten by automatic detection.
            const detected = manualCategory ??
              (layerFamily !== "otro" ? layerFamily :
                publicFamily !== "otro" ? publicFamily :
                  meta.categoria === "gema" || meta.categoria === "metal"
                    ? meta.categoria : "otro");
            const resolvedLayerKey = resolveAurumLayerKey({
              layerId: sourceLayer?.id ?? sourceLayer?.Id ?? layerId,
              layerIndex: Number.isInteger(layerIndex) && layerIndex >= 0
                ? layerIndex : sourceLayer ? layerManifest.indexOf(sourceLayer) : meta.layerIndex,
              layerName,
              layerColor: colorHex ?? meta.colorCapa,
              category: detected,
              existingKey: meta.layerKey,
            });
            const finalCategory = detected === "otro" ? "metal" : detected;
            if (finalCategory === "gema") gemLayerMeshes++;
            else if (finalCategory === "metal") metalLayerMeshes++;
            if (detected === "otro") defaultMetalMeshes++;
            node.userData = {
              ...data,
              aurumRhinoSource: {
                ...source,
                layerIndex: Number.isInteger(layerIndex) && layerIndex >= 0
                  ? layerIndex : sourceLayer ? layerManifest.indexOf(sourceLayer) : source.layerIndex ?? null,
                layerId: sourceLayer?.id ?? sourceLayer?.Id ?? layerId ?? source.layerId ?? null,
                layerName: layerName || source.layerName || null,
                layerColor: colorHex ?? source.layerColor ?? null,
              },
              aurumRhino: {
                ...meta,
                categoria: finalCategory,
                capa: layerName || meta.capa || undefined,
                layerName: layerName || meta.layerName || undefined,
                layerIndex: Number.isInteger(layerIndex) && layerIndex >= 0
                  ? layerIndex : sourceLayer ? layerManifest.indexOf(sourceLayer) : meta.layerIndex ?? -1,
                rhinoLayerId: sourceLayer?.id ?? sourceLayer?.Id ?? layerId ?? meta.rhinoLayerId ?? null,
                colorCapa: colorHex ?? meta.colorCapa ?? undefined,
                layerKey: resolvedLayerKey ?? meta.layerKey,
                ...(manualCategory ? { aurumManualCategoryAssignment: true } : {}),
              },
              aurumPublicDefaultMetal: detected === "otro",
            };
          });
          objeto.userData = {
            ...(objeto.userData ?? {}),
            aurum3dmLayerClassificationAudit: {
              sourceLayerCount: layerManifest.length,
              gemLayerMeshes,
              metalLayerMeshes,
              defaultMetalMeshes,
            },
          };
          console.info("[AURUM][3DM LAYER CLASSIFICATION]", objeto.userData.aurum3dmLayerClassificationAudit);
        }

        informar("Archivo leído. Preparando modelo...");
        const preprocessStartedAt = performance.now();
        await preprocessAurumModel(objeto, (message: string, completed: number, total: number) => {
          informar(message, completed, total);
          loadAuditStep("preprocess-progress", { completed, total });
        });
        const interno = objeto;
        // Match PublicCatalogViewer post-parse preparation exactly: isolate each
        // mesh material, infer a central gemstone only when no explicit gem exists,
        // then center the model using visible renderable geometry only.
        interno.traverse((node: any) => {
          if (!node?.isMesh || !node.material) return;
          node.material = Array.isArray(node.material)
            ? node.material.map((entry: any) => entry?.clone ? entry.clone() : entry)
            : (node.material?.clone ? node.material.clone() : node.material);
        });
        interno.updateMatrixWorld(true);
        // Aurum must still resolve an unnamed center diamond when the CAD file
        // already contains explicitly named melee/side gems. The shared public
        // viewer keeps its conservative default inference policy.
        inferGemMeshes(interno,{allowCentralInferenceAlongsideExplicitGems:true});
        interno.traverse((node: any) => {
          if (!node?.isMesh || !node.userData?.aurumPublicInferredGem) return;
          const meta = node.userData?.aurumRhino ?? {};
          node.userData.aurumRhino = { ...meta, categoria: "gema", capa: meta.capa ?? node.name ?? "Gema inferida" };
        });
        const publicVisibleBounds = new THREE.Box3();
        interno.traverse((node: any) => {
          if (!node?.isMesh || !node.geometry || !node.visible) return;
          let ancestor: any = node.parent;
          while (ancestor) {
            if (ancestor.visible === false) return;
            ancestor = ancestor.parent;
          }
          publicVisibleBounds.expandByObject(node);
        });
        if (publicVisibleBounds.isEmpty()) {
          throw new Error("El modelo no contiene mallas visibles para mostrar.");
        }
        const publicCenter = publicVisibleBounds.getCenter(new THREE.Vector3());
        interno.position.sub(publicCenter);
        interno.updateMatrixWorld(true);
        loadAuditStep("public-viewer-preprocess-complete", {
          sourceFormat: ext,
          preprocessMs: Math.round(performance.now() - preprocessStartedAt),
          triangles: countAurumTriangles(interno),
          centeredOnVisibleGeometry: true,
        });
        // Reject empty or fully hidden conversions before replacing the current jewel.
        // Rhino may transfer a valid 3DM container that contains only construction
        // curves/points or objects hidden by their layer visibility.
        let visibleMeshCount = 0;
        let visibleTriangleCount = 0;
        interno?.traverse?.((node:any) => {
          if (!node?.isMesh || !node.geometry) return;
          let isVisible = true;
          for (let parent = node; parent; parent = parent.parent) {
            if (parent.visible === false) {
              isVisible = false;
              break;
            }
          }
          if (!isVisible) return;
          const position = node.geometry.getAttribute?.("position");
          const index = node.geometry.getIndex?.();
          const vertexCount = Number(index?.count ?? position?.count ?? 0);
          const triangles = Math.floor(vertexCount / 3);
          if (!position || triangles < 1) return;
          visibleMeshCount += 1;
          visibleTriangleCount += triangles;
        });
        if (visibleMeshCount === 0 || visibleTriangleCount === 0) {
          throw new Error("El 3DM se recibió, pero no contiene geometría de malla visible y renderizable. Revisa que las piezas estén visibles en Rhino y vuelve a enviar el diseño.");
        }
        loadAuditStep("renderable-geometry-validated", {
          visibleMeshCount,
          visibleTriangleCount,
        });

        // Runtime budget is derived from actual renderable geometry, not source file size.
        // This keeps CAD-heavy jewelry responsive without changing authored geometry.
        informar("Configurando calidad de visualización...");
        runtimeBudget = getAurumRuntimeBudget(countAurumTriangles(interno));
        // The auxiliary 2x target is composited only through the center-diamond mask.
        // Keep the renderer/composer DPR shared cap unchanged for all metal pixels.
        setDiamondSupersampleScaleCap?.(runtimeBudget.diamondSupersampleScaleCap, runtimeBudget.diamondLiveSupersampleScaleCap);
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
          // Unassigned meshes already classified as gems start with the diamond
          // optical profile so the shared BVH is active immediately after GLB load.
          // Saved per-layer assignments and explicit gem metadata take precedence.
          initialGemId:"diamante_natural",
          presentation:{metalEnvironmentScale:1,metalClearcoatScale:1},
        });
        loadAuditStep("initial-materials-applied", { triangles: countAurumTriangles(interno) });
        modelo=interno;
        const embeddedLayerOverrides=interno.userData?.aurumLayerCategoryOverrides;
        if(embeddedLayerOverrides&&typeof embeddedLayerOverrides==="object"&&!Array.isArray(embeddedLayerOverrides)){
          const safeOverrides=Object.fromEntries(Object.entries(embeddedLayerOverrides).filter(([key,value])=>
            typeof key==="string"&&(value==="metal"||value==="gema"||value==="otro")
          )) as Record<string,AurumLayerCategoryOverride>;
          setLayerCategoryOverrides(safeOverrides);
          applyAurumLayerCategoryOverrides(interno,safeOverrides);
        } else {
          setLayerCategoryOverrides({});
        }
        // Layer overrides are applied after the first material pass. A gem layer
        // that was recovered from embedded CAD metadata here must still receive
        // the default natural-white diamond profile before the BVH is prepared.
        // Only touch explicitly classified gem meshes; never guess from position,
        // dimensions, color, or a metal/prong mesh.
        const initialDiamond=GEMAS.find((gem:any)=>gem.id==="diamante_natural");
        if(initialDiamond){
          const gemLayers=new Map<string,{target:any;gemId:string}>();
          const savedGemAssignments=interno.userData?.aurumGemLayerAssignments??{};
          interno.traverse((mesh:any)=>{
            if(!mesh?.isMesh||mesh.userData?.aurumInternalInclusion)return;
            const meta=mesh.userData?.aurumRhino??{};
            if(!isAurumGemTarget(mesh))return;
            const identity=getAurumGemLayerIdentity(mesh);
            const layerName=identity.layerName;
            const layerKey=layerName?"rhino-layer:"+encodeURIComponent(layerName)
              :identity.layerIndex!=null?"rhino-index:"+identity.layerIndex
              :identity.layerId!=null?"rhino-id:"+String(identity.layerId):"mesh:"+mesh.uuid;
            const layerIndex=identity.layerIndex;
            const layerId=identity.layerId==null?"":String(identity.layerId).trim();
            const nameKey=layerName?"rhino-layer:"+encodeURIComponent(layerName):"";
            const indexKey=layerIndex!=null?"rhino-index:"+String(layerIndex):"";
            const idKey=layerId?"rhino-id:"+layerId:"";
            const savedAssignment=savedGemAssignments[layerKey]
              ??(nameKey?savedGemAssignments[nameKey]:undefined)
              ??(indexKey?savedGemAssignments[indexKey]:undefined)
              ??(idKey?savedGemAssignments[idKey]:undefined)
              ??Object.values(savedGemAssignments).find((assignment:any)=>
                (layerName&&normalizeAurumGemLayerName(assignment?.layerName)===layerName.toLocaleLowerCase())
                ||(layerIndex!=null&&assignment?.layerIndex!=null&&String(assignment.layerIndex)===String(layerIndex))
                ||(layerId&&String(assignment?.layerId??"").trim()===layerId)
              );
            const activeGemId=String(mesh.userData?.aurumActiveGemId??"").trim();
            const pendingGemId=String(mesh.userData?.aurumPendingInitialGemId??mesh.userData?.aurumInitialLayerGemId??"").trim();
            const resolvedGemId=String(savedAssignment?.gemId??pendingGemId??activeGemId??meta.gemId??initialDiamond.id);
            const current=gemLayers.get(layerKey);
            if(current)return;
            gemLayers.set(layerKey,{target:mesh,gemId:resolvedGemId});
          });
          let initialDiamondMeshes=0;
          let assignedLayers=0;
          gemLayers.forEach(({target,gemId})=>{
            const selectedGem=GEMAS.find((gem:any)=>gem.id===gemId)||initialDiamond;
            if(aplicarGema(selectedGem,target,false,false)){
              assignedLayers++;
              if(selectedGem.id===initialDiamond.id)initialDiamondMeshes++;
            }
          });
          if(assignedLayers>0){
            console.info("[AURUM][GEM INITIAL]",{
              defaultGemId:initialDiamond.id,
              assignedLayers,
              defaultDiamondLayers:initialDiamondMeshes,
              reason:"official-gem-application-after-layer-classification",
            });
          }
        }
        // Register the loaded model's diamond meshes before BVH setup. The micro
        // pipeline was created with an empty scene, so its initial refresh cannot
        // discover gems that are loaded later.
        diamondMicroPipeline.refresh();
        diamondMicroPipeline.update();
        // Prepare the gemstone optical runtime only after screen-space tiers
        // have been published for the initial BVH material configuration.
        await asegurarDiamanteBvh();
        // BVH replaces the original physical material; refresh the micro registry
        // afterwards so the stable mesh identity keeps the diamond classified.
        diamondMicroPipeline.refresh();
        diamondMicroPipeline.update();
        // Synchronize the newly prepared gemstone BVH with the loaded model
        // before any initial presentation frame can consume its acceleration data.
        diamondBvhRuntime?.update();
        // Hide procedural inclusions by default for performance. The explicit
        // emerald-inclusions profile is re-enabled below for controlled live
        // validation; other emerald grades stay clean.
        setAurumInclusionsVisible(modelo, false);
        setAurumEmeraldInclusionsVisible(modelo, false);
        setAurumEmeraldInclusionsVisible(modelo, true, "esmeralda_3");
        setAurumEmeraldInclusionsVisible(modelo, true, "esmeralda_inclusiones");
        // Keep authored/BEAUTY gemstone materials during the diagnostic rollback.
        // The LIVE material profile is intentionally suspended.

        // Precompile only after the first LIVE frame has had a chance to paint.
        // This avoids competing with the initial interactive render.
        const shaderTarget=modelo;
        const scheduleShaderPrecompile=()=>{
          shaderPrecompileIdleId = null;
          shaderPrecompileTimeoutId = null;
          if (!vivo || shaderTarget!==modelo || typeof (renderer as any).compileAsync !== "function") return;
          void (renderer as any).compileAsync(shaderTarget,camara).then(() => {
            if (perfEnabled) console.info("[AURUM][SHADERS] precompile complete");
          }).catch((error:any) => {
            if (perfEnabled) console.warn("[AURUM][SHADERS] precompile skipped", error);
          });
        };
        if (typeof window !== "undefined" && "requestIdleCallback" in window) {
          shaderPrecompileIdleId = (window as any).requestIdleCallback(scheduleShaderPrecompile,{timeout:1500});
        } else {
          shaderPrecompileTimeoutId = globalThis.setTimeout(scheduleShaderPrecompile,250);
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
        sceneAdapter.apply("ijewelReference");
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
        // Re-apply the settled photographic profile only after its values have
        // been copied into postRuntimeConfig. The previous order configured
        // TAA from stale defaults before the model's iJewel profile was applied.
        applyPostQuality?.(renderQuality);
        renderPipelineContract.setMode("RESTING_SETTLED");

        // The interactive viewport uses direct beauty during motion and a Gem Mask-isolated
        // TAA composer chain while settled; detached SSAA covers the live-motion path.
        const initialGemAaAvailable = Boolean(composer && renderPass && outputPass);
        if (initialGemAaAvailable) {
          const initialWidth = Math.max(1, renderer.domElement.width || renderer.domElement.clientWidth || 1);
          const initialHeight = Math.max(1, renderer.domElement.height || renderer.domElement.clientHeight || 1);
          fxaaPass.material?.uniforms?.resolution?.value?.set?.(1 / initialWidth, 1 / initialHeight);
          // Gem Mask is an independent diagnostic and never enters the beauty composer.
          const initialBeautyPasses = new Set([renderPass, outputPass]);
          if (gemMaskPass) gemMaskPass.enabled = getAurumPostControls().gemMaskEnabled;
          ((composer as any)?.passes ?? []).forEach((pass: any) => {
            pass.enabled = initialBeautyPasses.has(pass);
          });

          // Before the model is attached, keep the preview on direct WebGL. The
          // diamond-only TAA chain is activated after its center mask is indexed.
          const initialTaaRequested = false;
          if (idleTaaPass) {
            idleTaaPass.enabled = false;
            idleTaaPass.accumulate = false;
            idleTaaPass.accumulateIndex = -1;
          }
          liveFastPathRef.current = true;
          console.info("[AURUM][RENDER PIPELINE]", {
            phase: "first-model-frame",
            path: "direct",
            taaConfigured: postRuntimeConfig.taa === true,
            taaEnabled: Boolean(idleTaaPass?.enabled),
            taaAccumulating: Boolean(idleTaaPass?.accumulate),
            gemMaskEnabled: Boolean(gemMaskPass?.enabled),
            gemSoftEdgeEnabled: Boolean(fxaaPass?.enabled),
            outputEnabled: Boolean(outputPass?.enabled),
            progressiveFrames: postRuntimeConfig.progressiveFrameCount ?? 1,
            composerAvailable: Boolean(composer),
          });
        } else {
          console.warn("[AURUM][RENDER PIPELINE] Selective gem AA unavailable on first model frame; keeping direct renderer.", {
            composerAvailable: Boolean(composer),
            renderPassAvailable: Boolean(renderPass),
            gemMaskPassAvailable: Boolean(gemMaskPass),
            softEdgePassAvailable: Boolean(fxaaPass),
            outputPassAvailable: Boolean(outputPass),
          });
        }

        encuadrar();
        setVista("frontal");
        // frameAurumProduct applies the scene preset; reassert direct rendering
        // afterwards so scene setup cannot leave a stale pipeline mode.
        if (initialGemAaAvailable) {
          modelo.updateMatrixWorld?.(true);
          camara.updateMatrixWorld?.(true);
          camara.updateProjectionMatrix?.();
          diamondBvhRuntime?.update();
          // Keep scene-wide post-processing out of the live preview.
          const initialBeautyPasses = new Set([renderPass, outputPass]);
          if (gemMaskPass) gemMaskPass.enabled = getAurumPostControls().gemMaskEnabled;
          if (fxaaPass) fxaaPass.enabled = false;
          ((composer as any)?.passes ?? []).forEach((pass: any) => {
            pass.enabled = initialBeautyPasses.has(pass);
          });
          liveFastPathRef.current = true;
          gemMaskPass?.refreshCache?.();
        } else {
          liveFastPathRef.current = true;
        }
        // Si el GemEnvironment ya terminó de cargar, aplicarlo ahora al modelo.
        // Si todavía está en red, su callback lo aplicará al terminar.
        if (entornoGema) aplicarEntornoGema();
        setParteSeleccionada(null);
        setParteSeleccionadaNombre(null); setParteSeleccionadaCapa(null); setParteSeleccionadaCategoria("otro");
        parteActiva=null;
        limpiarResaltado();
        escena.add(modelo);
        // The micro pipeline is created with the viewer, before a CAD model may
        // be loaded. Re-discover its diamond meshes now that this model is in scene.
        diamondMicroPipelineRef.current?.refresh?.();
        // Pre-index MatrixGold/Rhino gemstone layers during model setup so
        // subsequent catalog changes resolve selected CAD layers in O(k).
        prepareAurumGemLayerIndex(escena);
        gemMaskPass?.refreshCache?.();
        // Initialize the selective diamond AA after the model is in the scene.
        // This makes the first settled frame match the later camera-rest state,
        // without requiring the user to orbit the model to activate the passes.
        setDiamondSupersamplingSettled?.(true);
        const initialDiamondSsaaActive = Boolean(diamondSupersamplePass?.enabled && diamondSupersampleCompositePass?.enabled);
        const initialDiamondTaaActive = Boolean(idleTaaPass?.enabled && diamondTaaSavePass?.enabled && diamondTaaCompositePass?.enabled);
        const initialDiamondFxaaActive = Boolean(fxaaPass?.enabled && gemMaskPass?.enabled && gemMaskPass?.hasDiamondMeshes);
        const initialDiamondBeautyPasses = new Set([renderPass, ...(initialDiamondTaaActive ? [diamondTaaSavePass, idleTaaPass, diamondTaaCompositePass] : []), outputPass]);
        ((composer as any)?.passes ?? []).forEach((pass: any) => {
          pass.enabled = initialDiamondBeautyPasses.has(pass);
        });
        liveFastPathRef.current = true;
        console.info("[AURUM][DIAMOND][INITIAL_QUALITY]", {
          hasCenterDiamond: Boolean(gemMaskPass?.hasDiamondMeshes),
          gemMaskEnabled: Boolean(gemMaskPass?.enabled),
          fxaaEnabled: Boolean(fxaaPass?.enabled),
          diamondSupersamplingEnabled: initialDiamondSsaaActive,
          renderPath: initialDiamondTaaActive ? "composer+diamond-taa" : (initialDiamondFxaaActive ? "direct+diamond-fxaa" : (initialDiamondSsaaActive ? "direct+diamond-overlay" : "direct")),
        });
        // TAA remains enabled only through the masked center-diamond composite.
        // Its accumulation is disabled automatically when camera motion begins.
        viewerLoopRef.current?.converge?.(initialDiamondTaaActive ? 32 : 1);
        loadAuditStep("model-added-to-scene");
        // No reaplicar el metal globalmente al cargar: el paso anterior ya asignó\n        // materiales por categoría y una aplicación con parteActiva=null sobrescribiría\n        // las gemas recién configuradas. El metal se aplica después solo sobre la capa seleccionada.\n        if (ext!=="3dm" && parteActiva) aplicarMaterial(materialActivo);
        // Presentación inicial: usar la geometría real para encuadrar y
        // mostrar el anillo de frente, como referencia de catálogo de joyería.
        // La cámara iJewel de distancia fija dejaba pequeños los modelos Rhino
        // cuyos límites/unidades no coinciden con el modelo de referencia.
        encuadrar();
        camaraVista("frontal");
        setVista("frontal");
        loadAuditStep("load-pipeline-complete", { triangles: countAurumTriangles(modelo) });
        requestAnimationFrame(() => {
          if (modelo) {
            camaraVista("frontal");
            // Do not force LIVE material overrides after initial framing.
            renderer.shadowMap.enabled = false;
            renderer.shadowMap.needsUpdate = false;
            invalidateRenderRef.current?.();
          }
        });
      };
      const camaraVista=(id:VistaId)=>{
        const calibratedSnapshot = calibratedCameraViewsRef.current[id];
        if (calibratedSnapshot && cameraCalibrationRuntimeRef.current?.apply?.(calibratedSnapshot)) {
          // La ficha principal usa la última referencia capturada para esta vista.
        } else if (modelo?.userData?.aurumPublicViewerPresentation && id === "frontal") {
          applyAurumPublicViewerCamera(camara, controles, modelo, { enablePan: true, framingScale: 0.88 });
        } else {
          applyAurumCameraView(camara, controles, modelo, id, categoriaProyectoRef.current, 1.0);
        }
        // The public configurator has a much shorter viewport than the editor.
        // Keep the entire jewel visible after view presets are applied as well
        // as after the initial model framing.
        if (embedded && controles?.target && camara?.position) {
          const target = controles.target;
          const offset = camara.position.clone().sub(target);
          offset.multiplyScalar(1.38);
          camara.position.copy(target).add(offset);
          camara.updateProjectionMatrix?.();
          controles.update?.();
        }
        // Sincronizar matrices, acumulación temporal y siguiente frame visible.
        camara.updateMatrixWorld?.(true);
        resetTemporalAccumulationRef.current?.();
        viewerLoopRef.current?.invalidate?.();
        invalidateRenderRef.current?.();
      };
      cameraCalibrationRuntimeRef.current = {
        capture: (view: string) => {
          if (!modelo) return null;
          modelo.updateWorldMatrix(true, true);
          camara.updateMatrixWorld(true);
          const bounds = getAurumVisibleProductBounds(modelo);
          if (bounds.isEmpty()) return null;
          const corners = [
            new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z), new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
            new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.min.z), new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.max.z),
            new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.min.z), new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
            new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.min.z), new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z),
          ].map((point: THREE.Vector3) => point.project(camara));
          const xs = corners.map((point: THREE.Vector3) => point.x), ys = corners.map((point: THREE.Vector3) => point.y);
          const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
          // Store camera framing relative to the jewel bounds so the same global
          // calibration remains meaningful for models with different origins/scales.
          const calibrationSphere = bounds.getBoundingSphere(new THREE.Sphere());
          const calibrationCenter = calibrationSphere.center;
          const calibrationScale = Math.max(calibrationSphere.radius, 1e-6);
          const snapshot = {
            view, capturedAt: new Date().toISOString(),
            position: camara.position.toArray(), quaternion: camara.quaternion.toArray(),
            target: controles.target.toArray(), up: camara.up.toArray(),
            normalizedPosition: camara.position.clone().sub(calibrationCenter).multiplyScalar(1 / calibrationScale).toArray(),
            normalizedTarget: controles.target.clone().sub(calibrationCenter).multiplyScalar(1 / calibrationScale).toArray(),
            fov: camara.fov, aspect: camara.aspect, zoom: camara.zoom, near: camara.near, far: camara.far,
            distance: camara.position.distanceTo(controles.target),
            projectedWidth: maxX - minX, projectedHeight: maxY - minY,
            viewportWidth: renderer.domElement.clientWidth, viewportHeight: renderer.domElement.clientHeight,
            projectedPixelWidth: (maxX - minX) * renderer.domElement.clientWidth * 0.5,
            projectedPixelHeight: (maxY - minY) * renderer.domElement.clientHeight * 0.5,
            projectedCenter: [(minX + maxX) * 0.5, (minY + maxY) * 0.5],
          };
          return snapshot;
        },
        save: (view: string) => {
          const snapshot = cameraCalibrationRuntimeRef.current?.capture?.(view);
          if (!snapshot) return null;
          calibratedCameraViewsRef.current[view as VistaId] = snapshot;
          return snapshot;
        },
        adjust: (axis: string, delta: number) => {
          if (!modelo || !Number.isFinite(delta)) return false;
          const offset = camara.position.clone().sub(controles.target);
          const distance = Math.max(offset.length(), 1e-6);
          const right = new THREE.Vector3().setFromMatrixColumn(camara.matrixWorld, 0).normalize();
          const up = new THREE.Vector3().setFromMatrixColumn(camara.matrixWorld, 1).normalize();
          if (axis === "distance") {
            const nextDistance = THREE.MathUtils.clamp(distance * Math.exp(delta), distance * 0.1, distance * 10);
            offset.setLength(nextDistance);
            camara.position.copy(controles.target).add(offset);
          } else if (axis === "fov") {
            camara.fov = THREE.MathUtils.clamp(camara.fov + delta, 5, 100);
            camara.updateProjectionMatrix();
          } else if (axis === "azimuth") {
            offset.applyAxisAngle(camara.up.clone().normalize(), THREE.MathUtils.degToRad(delta));
            camara.position.copy(controles.target).add(offset);
          } else if (axis === "elevation") {
            offset.applyAxisAngle(right, THREE.MathUtils.degToRad(delta));
            camara.position.copy(controles.target).add(offset);
          } else if (axis === "centerX" || axis === "centerY") {
            const verticalSpan = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camara.fov) * 0.5);
            const horizontalSpan = verticalSpan * camara.aspect;
            const shift = axis === "centerX"
              ? right.multiplyScalar(delta * horizontalSpan * 0.5)
              : up.multiplyScalar(delta * verticalSpan * 0.5);
            camara.position.add(shift);
            controles.target.add(shift);
          } else {
            return false;
          }
          camara.lookAt(controles.target);
          camara.updateMatrixWorld(true);
          controles.update();
          resetTemporalAccumulationRef.current?.();
          viewerLoopRef.current?.invalidate?.();
          invalidateRenderRef.current?.();
          return true;
        },
        apply: (snapshot: any) => {
          const canvas = renderer.domElement as HTMLCanvasElement;
          const viewportRect = canvas.getBoundingClientRect?.();
          const viewportWidth = Number(viewportRect?.width) || Number(canvas.clientWidth) || 0;
          const viewportHeight = Number(viewportRect?.height) || Number(canvas.clientHeight) || 0;
          const applied = applyAurumCameraSnapshot(
            camara,
            controles,
            modelo,
            snapshot,
            viewportWidth,
            viewportHeight,
          );
          if (!applied) return false;
          resetTemporalAccumulationRef.current?.();
          viewerLoopRef.current?.invalidate?.();
          invalidateRenderRef.current?.();
          return true;
        },
      };
      aplicarVistaRef.current = camaraVista;
      apiRef.current=createAurumApi({
        cargar,
        getJewelTransform:()=>modelo?({position:modelo.position.toArray(),rotation:modelo.rotation.toArray(),scale:modelo.scale.toArray()}):null,
        setJewelTransform:(value:any)=>{if(!modelo||!value)return false;try{if(Array.isArray(value.position)&&value.position.length===3)modelo.position.fromArray(value.position);if(Array.isArray(value.rotation)&&value.rotation.length>=3)modelo.rotation.set(value.rotation[0],value.rotation[1],value.rotation[2],value.rotation[3]||"XYZ");if(Array.isArray(value.scale)&&value.scale.length===3)modelo.scale.fromArray(value.scale);modelo.updateMatrixWorld?.(true);invalidateRenderRef.current?.();return true;}catch{return false;}},
        setLayerCategoryOverride:(identity:any, category:AurumLayerCategoryOverride|null)=>{
          if(!modelo)return {changed:0,overrides:layerCategoryOverrides};
          const result=setAurumLayerCategoryOverride(modelo,identity,category);
          // Category changes alter which CAD meshes belong in the gem index.
          invalidateAurumGemLayerIndex(modelo);
          setLayerCategoryOverrides(result.overrides);
          modelo.updateMatrixWorld?.(true);
          if(parteActiva?.isMesh) seleccionarMalla(parteActiva);
          invalidateRenderRef.current?.();
          return {changed:result.changed,overrides:result.overrides};
        },
        setLayerCategoryOverrides:(overrides:any)=>{
          if(!modelo||!overrides||typeof overrides!=="object"||Array.isArray(overrides))return 0;
          const safe=Object.fromEntries(Object.entries(overrides).filter(([key,value])=>
            typeof key==="string"&&(value==="metal"||value==="gema"||value==="otro")
          )) as Record<string,AurumLayerCategoryOverride>;
          setLayerCategoryOverrides(safe);
          const changed=applyAurumLayerCategoryOverrides(modelo,safe);
          // Rebuild the cached layer membership after bulk category hydration.
          invalidateAurumGemLayerIndex(modelo);
          modelo.updateMatrixWorld?.(true);
          if(parteActiva?.isMesh) seleccionarMalla(parteActiva);
          invalidateRenderRef.current?.();
          return changed;
        },
        getModelDiagnostics:()=>{
          if(!modelo)return null;
          let meshes=0,visibleMeshes=0,hiddenMeshes=0,curves=0,points=0;
          const geometryAudit={analyzedMeshes:0,missingPreflight:0,boundaryEdges:0,nonManifoldEdges:0,degenerateTriangles:0,invalidNormals:0,renderReadyMeshes:0};
          modelo.traverse((node:any)=>{
            if(node.isMesh){
              meshes++;
              if(node.visible!==false)visibleMeshes++;else hiddenMeshes++;
              const preflight=node.userData?.aurumMeshPreflight;
              if(preflight){
                geometryAudit.analyzedMeshes++;
                geometryAudit.boundaryEdges+=Number(preflight.boundaryEdges??0);
                geometryAudit.nonManifoldEdges+=Number(preflight.nonManifoldEdges??0);
                geometryAudit.degenerateTriangles+=Number(preflight.degenerateTriangles??0);
                if(preflight.normalsValid!==true)geometryAudit.invalidNormals++;
                if(preflight.renderReady===true)geometryAudit.renderReadyMeshes++;
              }else geometryAudit.missingPreflight++;
            }
            else if(node.isLine||node.isLineSegments||node.isLineLoop)curves++;
            else if(node.isPoints)points++;
          });
          const bounds=new THREE.Box3().setFromObject(modelo);
          const size=bounds.isEmpty()?new THREE.Vector3():bounds.getSize(new THREE.Vector3());
          const sourceAudit=modelo.userData?.aurumSourceObjectAudit??null;
          const layerAudit=modelo.userData?.aurumLayerMetadataAudit??null;
          return {meshes,visibleMeshes,hiddenMeshes,curves,points,triangles:countAurumTriangles(modelo),bounds:{x:size.x,y:size.y,z:size.z},modelVisible:modelo.visible!==false,geometryAudit,sourceAudit:sourceAudit?{totalSourceObjects:sourceAudit.totalSourceObjects,sourceLayerCount:sourceAudit.sourceLayerCount,byGeometryType:sourceAudit.byGeometryType}:null,layerAudit:layerAudit?{meshes:layerAudit.meshes,meshesWithLayerKey:layerAudit.meshesWithLayerKey,unresolvedMeshes:layerAudit.unresolvedMeshes,duplicateLayerKeys:layerAudit.duplicateLayerKeys?.length??0}:null};
        },
        getCadTree:()=>{
          if(!modelo)return [];
          const items:any[]=[];
          modelo.traverse((node:any)=>{
            if(node===modelo)return;
            const data=node.userData??{};
            const source=data.aurumRhinoSource??{};
            const attrs=data.attributes??{};
            const meta=data.aurumRhino??{};
            const type=String(source.objectType??data.objectType?.name??data.objectType??attrs.geometry?.objectType?.name??attrs.geometry?.objectType??(node.isMesh?"Mesh":node.isLine||node.isLineSegments||node.isLineLoop?"Curve":node.isPoints?"Point":"Unknown"));
            if(type.toLowerCase()==="file3dm")return;
            const sourceId=source.objectId??attrs.id??attrs.Id??data.objectId??data.ObjectId??null;
            const hasCadIdentity=sourceId!=null||source.objectType!=null||data.aurumRhinoSource!=null||meta.rhinoLayerId!=null||attrs.layerIndex!=null||attrs.LayerIndex!=null;
            if(!hasCadIdentity)return;
            const layer=String(source.layerName??meta.capa??attrs.layerName??attrs.LayerName??"Sin capa").trim()||"Sin capa";
            items.push({uuid:node.uuid,name:String(source.objectName??attrs.name??attrs.Name??node.name??"Objeto sin nombre").trim()||"Objeto sin nombre",type,layer,visible:node.visible!==false,sourceId:sourceId!=null?String(sourceId):null});
          });
          return items;
        },
        setCadObjectVisible:(uuid:string,visible:boolean)=>{
          if(!modelo||typeof uuid!=="string")return false;
          let found=false;
          modelo.traverse((node:any)=>{if(node.uuid===uuid){node.visible=Boolean(visible);found=true;}});
          if(found){modelo.updateMatrixWorld?.(true);invalidateRenderRef.current?.();}
          return found;
        },
        setCadLayerVisible:(layerName:string,visible:boolean)=>{
          if(!modelo||typeof layerName!=="string")return 0;
          let changed=0;
          modelo.traverse((node:any)=>{
            const source=node.userData?.aurumRhinoSource??{};
            const meta=node.userData?.aurumRhino??{};
            const attrs=node.userData?.attributes??{};
            const layer=String(source.layerName??meta.capa??attrs.layerName??attrs.LayerName??"Sin capa").trim()||"Sin capa";
            if(layer===layerName&&(source.objectId!=null||source.objectType!=null||node.isMesh||node.isLine||node.isLineSegments||node.isLineLoop||node.isPoints)){
              node.visible=Boolean(visible);changed++;
            }
          });
          if(changed){modelo.updateMatrixWorld?.(true);invalidateRenderRef.current?.();}
          return changed;
        },
        material:aplicarMaterial,
        gema:aplicarGema,
        materialCatalogo:(m:MaterialConfig):boolean=>{
          if(!modelo)return false;
          {
            const gemNamePattern=/(gem|gema|diamond|diamante|emerald|esmerald|ruby|rub[ií]|sapphire|zafiro|amethyst|amatista|stone|piedra)/i;
            let metalCandidates=0;
            let protectedGemMeshes=0;
            let ignoredMeshes=0;
            modelo.traverse((x:any)=>{
              if(!x?.isMesh||x.userData?.aurumInternalInclusion){ignoredMeshes++;return;}
              const meta=x.userData?.aurumRhino??{};
              const attrs=x.userData?.attributes??{};
              const source=x.userData?.aurumRhinoSource??{};
              const instance=x.userData?.aurumRhinoInstanceSource??{};
              const manualOverride=getAurumLayerCategoryOverride(modelo.userData?.aurumLayerCategoryOverrides,{
                layerId:instance.layerId??source.layerId??attrs.layerId??attrs.LayerId??meta.rhinoLayerId,
                layerIndex:instance.layerIndex??source.layerIndex??attrs.layerIndex??attrs.LayerIndex??meta.layerIndex,
                layerName:instance.layerName??source.layerName??attrs.layerName??attrs.LayerName??meta.capa,
              });
              if(manualOverride){
                x.userData={...(x.userData??{}),aurumRhino:{...meta,categoria:manualOverride,aurumManualCategoryAssignment:true,aurumManualGemAssignment:manualOverride==="gema"}};
                if(manualOverride==="metal")metalCandidates++;
                else if(manualOverride==="gema")protectedGemMeshes++;
                else ignoredMeshes++;
                return;
              }
              const name=[x.name,meta.capa,attrs.layerName,attrs.LayerName].filter(Boolean).join(" ");
              const mats=Array.isArray(x.material)?x.material:[x.material];
              const semantic=classifyAurumSemanticObject(x,null);
              const sourceCategory=String(meta.categoria??"").toLowerCase();
              const hasExplicitGemSignal=sourceCategory==="gema"
                || semantic.classification==="gem"&&semantic.confidence>=.7
                || Boolean(x.userData?.aurumActiveGemId)
                || gemNamePattern.test(name)||mats.some((mat:any)=>{
                const materialName=String(mat?.name??"");
                const metalness=Number(mat?.metalness??0);
                const materialData=mat?.userData??{};
                return Boolean(materialData.aurumDiamondShader)||
                  Boolean(materialData.aurumDiamondShaderMode)||
                  Boolean(materialData.aurumGemPhysicalModel)||
                  Boolean(materialData.aurumGemOpticalProfile)||
                  Boolean(materialData.aurumOpticalProfile)||
                  Boolean(materialData.aurumIJEWELActive)||
                  /diamond|gem|gema|diamante|emerald|ruby|sapphire|amethyst|stone|piedra/i.test(materialName)||
                  (metalness<.5&&Number(mat?.transmission??0)>.12);
              });
              if(hasExplicitGemSignal){
                protectedGemMeshes++;
                if(sourceCategory!=="gema")x.userData={...x.userData,aurumRhino:{...meta,categoria:"gema"}};
                return;
              }
              // Metal bodies in exported GLBs may have stale "other" or "gem"
              // categories. In public mode, a positive gem signal is required
              // before excluding a mesh from the global metal selector.
              x.userData={...x.userData,aurumRhino:{...meta,categoria:"metal"}};
              metalCandidates++;
            });
            const applied=applyAurumMaterialToModel(modelo,null,m,material,true);
            console.info("[AURUM][PUBLIC METAL SELECTION]",{
              profileId:String(m?.id??""),
              metalCandidates,
              protectedGemMeshes,
              ignoredMeshes,
              applied,
            });
            if(!applied){
              console.warn("[AURUM][PUBLIC METAL SELECTION] No se aplicó el material; revisar mallas y perfil.",{
                modelMeshes:metalCandidates,
                profileId:String(m?.id??""),
              });
            }
            aplicarPerfilLive();
            invalidateRenderRef.current?.();
            return Boolean(applied);
          }
        },
        gemaCatalogo:(g:GemaConfig):boolean=>{
          if(!modelo)return false;
          const visited=new Set<string>();
          let gemMeshes=0;
          let appliedLayers=0;
          let failedLayers=0;
          modelo.traverse((x:any)=>{
            if(!x.isMesh||x.userData?.aurumInternalInclusion)return;
            const meta=x.userData?.aurumRhino??{};
            // Catalog assignment and the material engine must resolve the same
            // canonical Rhino identity. In particular, source-only GLB metadata
            // and full paths such as "Gem::Gem 02" must resolve to the Gem 02 leaf.
            const identity=getAurumGemLayerIdentity(x);
            const layerName=identity.layerName;
            const manualOverride=getAurumLayerCategoryOverride(modelo.userData?.aurumLayerCategoryOverrides,identity);
            const sourceCategory=String(meta.categoria??"").toLowerCase();
            const layerCategory=clasificarCapa(layerName,colorRhinoHex(meta.colorCapa));
            const semantic=classifyAurumSemanticObject(x,null);
            const semanticCategory=semantic.confidence>=.7
              ? semantic.classification==="gem" ? "gema" : semantic.classification==="metal" ? "metal" : null
              : null;
            const category=manualOverride ?? (isAurumGemTarget(x) || sourceCategory==="gema" || layerCategory==="gema" || semanticCategory==="gema" ? "gema" :
              sourceCategory==="metal" || layerCategory==="metal" || semanticCategory==="metal" ? "metal" :
              sourceCategory || "otro");
            if(category!=="gema")return;
            gemMeshes++;
            const layer=layerName;
            const key=layer || (identity.layerIndex!=null ? "rhino-index:"+identity.layerIndex : identity.layerId!=null ? "rhino-id:"+String(identity.layerId) : String(meta.layerKey??x.uuid));
            // applyAurumGemToTarget resolves and updates every mesh in a layer.
            // Deduplicate here so a CAD layer with many tessellated meshes is
            // assigned once instead of repeating the same full-layer operation.
            if(visited.has(key))return;
            visited.add(key);
            if(aplicarGema(g,x,false,false))appliedLayers++;
            else failedLayers++;
          });
          // An explicit CAD-tree/viewport selection is a safe manual target
          // when an imported GLB has no semantic or Rhino layer metadata.
          // Never fan this fallback out to neighboring meshes.
          if(gemMeshes===0 && parteActiva?.isMesh){
            const selectedMeta=parteActiva.userData?.aurumRhino??{};
            const selectedSemantic=classifyAurumSemanticObject(parteActiva,null);
            const selectedCategory=String(selectedMeta.categoria??"").toLowerCase();
            if(selectedCategory!=="metal" && selectedSemantic.classification!=="metal"){
              parteActiva.userData={
                ...(parteActiva.userData??{}),
                aurumRhino:{...selectedMeta,categoria:"gema",aurumManualGemAssignment:true},
              };
              gemMeshes=1;
              visited.add("manual-selection:"+parteActiva.uuid);
              if(aplicarGema(g,parteActiva,false,false))appliedLayers++;
              else failedLayers++;
            }
          }
          console.info("[AURUM][CATALOG GEM] Selección aplicada", {
            gemId:g.id,
            gemMeshes,
            layers:visited.size,
            appliedLayers,
            failedLayers,
            source:"canonical-rhino-layer-identity",
          });
          viewerLoopRef.current?.renderNow?.();
          // Batch public-catalog BVH reconciliation once, after the new physical
          // materials have painted; do not refresh the full runtime per layer.
          const refreshCatalogBvh=()=>{
            if(!vivo||!modelo)return;
            // Catalog-wide material changes may add/remove diamond meshes.
            // Refresh once per catalog operation, never from the render loop.
            diamondMicroPipeline.refresh();
            diamondMicroPipeline.update();
            if(diamondBvhRuntime) {
              diamondBvhRuntime.refresh(modelo);
              // Re-index after BVH material replacement; the mesh marker is authoritative.
              diamondMicroPipeline.refresh();
              diamondMicroPipeline.update();
            } else void asegurarDiamanteBvh();
            invalidateRenderRef.current?.();
          };
          const scheduleCatalogBvh=()=>{
            if(typeof window!=="undefined" && typeof (window as any).requestIdleCallback==="function"){
              (window as any).requestIdleCallback(refreshCatalogBvh,{timeout:1800});
            }else if(typeof window!=="undefined"){
              window.setTimeout(refreshCatalogBvh,120);
            }
          };
          if(typeof window!=="undefined")window.requestAnimationFrame(scheduleCatalogBvh);
          return gemMeshes > 0;
        },
        escenario:aplicarEscenario,
        hdriGround:(config:any={})=>{
          if (config.enabled!==undefined) groundController.setHdriGroundEnabled(!!config.enabled);
        },
        sombraContacto:(visible:boolean)=>{
          groundController.setBakedShadowVisible(visible);
          const publicContactShadow = modelo?.userData?.aurumPublicContactShadow;
          if (publicContactShadow) publicContactShadow.visible = visible;
          invalidateRenderRef.current?.();
        },
        sueloVisible:(visible:boolean)=>{
          groundController.setVisible(visible);
          // The visible halo in the viewer can be the lightweight contact-shadow
          // plane created by frameAurumProduct, not the AURUM Ground plane.
          const publicContactShadow = modelo?.userData?.aurumPublicContactShadow;
          if (publicContactShadow) publicContactShadow.visible = visible;
          invalidateRenderRef.current?.();
        },
        sueloMaterial:(config:any)=>{
          const color=Number.parseInt(String(config.color??"").replace("#",""),16);
          groundController.setMaterial({
            color:Number.isFinite(color)?color:undefined,
            roughness:Number(config.roughness),
            metalness:Number(config.metalness),
          });
          invalidateRenderRef.current?.();
        },
        intensidadSombra:(value:number)=>{
          groundController.setShadowIntensity(value);
          invalidateRenderRef.current?.();
        },
        iluminacion:aplicarIluminacion,
        metalHdri:(key:string)=>{
          if (!(key in AURUM_HDRI_URLS)) return;
          metalHdriOverride = key;
          ambienteIdRef.current = null;
          setAmbienteId(null);
          setMetalHdriId(key);
          cargarHDRI(key);
        },
        gemHdri:(key:string)=>{
          // Este control es estrictamente gem-only: nunca debe cargar ni
          // modificar el EnvironmentController de metales.
          const gemPreset=AURUM_GEM_ENVIRONMENT_PRESETS[key];
          if (!gemPreset && !(key in AURUM_GEM_HDRI_URLS)) return;
          gemHdriOverride = key;
          ambienteIdRef.current = null;
          setGemHdriId(key);
          setAmbienteId(null);
          cargarEntornoGema(
            key,
            gemPreset?.rotation ?? gemEnvironmentRotation,
            gemPreset?.intensity ?? gemEnvironmentIntensityScale
          );
        },
        ambiente:(key:string)=>{
          aplicarAmbienteCombinado(key);
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
          sceneAdapter.setBackground(key);
          invalidateRenderRef.current?.();
        },
        sceneStudio:(_patch:any)=>{},
        reset:()=>{ controles.autoRotate=false; setAutoRotate360(false); encuadrar(); invalidateRenderRef.current?.(); },
        centerJewel: cameraModuleContract.centerJewel,
        fitAspect: cameraModuleContract.fitAspect,
        autoRotar:(activo:boolean)=>{ controles.autoRotate=activo; controles.autoRotateSpeed=0.65; invalidateRenderRef.current?.(); },
        limpiar:()=>{quitar();parteActiva=null;limpiarResaltado();setParteSeleccionada(null);setParteSeleccionadaNombre(null);},
        partes:()=>modelo?obtenerPartes(modelo):[],
        seleccionarParte:(id:string)=>{
          if (!id) { parteActiva=null; setParteSeleccionada(null); setParteSeleccionadaNombre(null); limpiarResaltado(); return; }
          let encontrado:any=null;
          modelo?.traverse((x:any)=>{if(x.uuid===id) encontrado=x;});
          if(encontrado) { seleccionarMalla(encontrado); invalidateRenderRef.current?.(); }
        },
        fullscreen:()=>{if(document.fullscreenElement===nodo){void document.exitFullscreen();}else{void nodo.requestFullscreen?.();}},
        vista:(id:VistaId)=>{ camaraVista(id); invalidateRenderRef.current?.(); },
        calidad:aplicarCalidadRender,
        exportGLB:async(options:{download?:boolean}={})=>{
          if(!modelo) throw new Error("Carga un modelo antes de exportar.");
          const exporter=new GLTFExporter();
          const result=await new Promise<ArrayBuffer>((resolve,reject)=>{
            exporter.parse(modelo,(output:any)=>{
              if(output instanceof ArrayBuffer) resolve(output);
              else reject(new Error("El exportador no generó un GLB binario."));
            },(error:any)=>reject(error),{binary:true,onlyVisible:true,trs:false,animations:[]});
          });
          const dracoResult = await compressAurumGlbWithDraco(result);
          if (dracoResult.compressed) {
            console.info("[AURUM Draco] GLB comprimido", {
              primitivas: dracoResult.primitiveCount,
              bytesOriginales: dracoResult.originalBytes,
              bytesFinales: dracoResult.outputBytes,
              reduccion: Math.round((1 - dracoResult.outputBytes / dracoResult.originalBytes) * 100),
            });
          } else {
            console.warn("[AURUM Draco] Se exportó GLB sin compresión; el archivo original se conserva.");
          }
          const blob=dracoResult.blob;
          if(options.download===false) return blob;
          const url=URL.createObjectURL(blob);
          const link=document.createElement("a");
          link.href=url;
          link.download=(nombreProyecto||"aurum-modelo").trim().replace(/[^a-z0-9-_]+/gi,"-")+".glb";
          link.click();
          window.setTimeout(()=>URL.revokeObjectURL(url),60_000);
          return blob;
        },
        exportRhino3dm:async()=>{
          if(!modelo) throw new Error("Carga un modelo antes de exportar a Rhino.");
          const loadRemoteModule=(url:string)=>import(/* @vite-ignore */ url);
          const rhinoModule:any=await loadRemoteModule("https://cdn.jsdelivr.net/npm/rhino3dm@8.32.1/rhino3dm.module.min.js");
          const rhinoFactory=rhinoModule.default??rhinoModule;
          const rhino:any=await rhinoFactory({locateFile:(file:string)=>"https://cdn.jsdelivr.net/npm/rhino3dm@8.32.1/"+file});
          const document3dm=new rhino.File3dm();
          document3dm.applicationName="AURUM Render";
          document3dm.applicationDetails="Exportación de malla desde el modelo GLB cargado en AURUM Render.";
          modelo.updateMatrixWorld(true);
          const isWorldVisible=(object:any)=>{for(let current=object;current;current=current.parent)if(!current.visible)return false;return true;};
          let meshCount=0,triangleCount=0;
          modelo.traverse((object:any)=>{
            if(!object.isMesh||!object.geometry||!isWorldVisible(object))return;
            const positions=object.geometry.getAttribute("position");
            if(!positions||positions.count<3)return;
            const sourceIndex=object.geometry.index;
            const sourceCount=sourceIndex?sourceIndex.count:positions.count;
            const faceCount=Math.floor(sourceCount/3);
            if(faceCount<1)return;
            const mesh3dm=new rhino.Mesh(),vertices=mesh3dm.vertices(),worldVertex=new THREE.Vector3();
            for(let i=0;i<positions.count;i++){worldVertex.fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld);vertices.add(worldVertex.x,worldVertex.y,worldVertex.z);}
            const faces=mesh3dm.faces();
            for(let face=0;face<faceCount;face++){const offset=face*3;faces.addTriFace(sourceIndex?sourceIndex.getX(offset):offset,sourceIndex?sourceIndex.getX(offset+1):offset+1,sourceIndex?sourceIndex.getX(offset+2):offset+2);}
            const attributes=new rhino.ObjectAttributes();
            attributes.name=(typeof object.name==="string"&&object.name.trim())?object.name.trim():"AURUM_Mesh_"+(meshCount+1);
            document3dm.objects().addMesh(mesh3dm,attributes);
            meshCount++;triangleCount+=faceCount;
          });
          if(meshCount===0){document3dm.destroy?.();throw new Error("No se encontraron mallas visibles para exportar.");}
          const bytes=document3dm.toByteArray();
          document3dm.destroy?.();
          const blob=new Blob([bytes],{type:"application/octet-stream"}),url=URL.createObjectURL(blob),link=document.createElement("a");
          link.href=url;link.download=(nombreProyecto||"aurum-modelo").trim().replace(/[^a-z0-9-_]+/gi,"-")+".3dm";link.click();
          window.setTimeout(()=>URL.revokeObjectURL(url),60_000);
          return {meshCount,triangleCount};
        },
        exportRhinoNurbs3dm:async(options:{quality?:"high"|"balanced"|"light"}={})=>{
          if(!modelo)throw new Error("Carga un modelo antes de exportar superficies NURBS.");
          const loadRemoteModule=(url:string)=>import(/* @vite-ignore */ url);
          const [{SimplifyModifier},{mergeVertices},rhinoModule]=await Promise.all([import("three/addons/modifiers/SimplifyModifier.js"),import("three/addons/utils/BufferGeometryUtils.js"),loadRemoteModule("https://cdn.jsdelivr.net/npm/rhino3dm@8.32.1/rhino3dm.module.min.js")]);
          const rhinoFactory:any=(rhinoModule as any).default??rhinoModule;
          const rhino:any=await rhinoFactory({locateFile:(file:string)=>"https://cdn.jsdelivr.net/npm/rhino3dm@8.32.1/"+file});
          modelo.updateMatrixWorld(true);
          const visible=(object:any)=>{for(let node=object;node;node=node.parent)if(!node.visible)return false;return true;};
          const meshes:any[]=[];let sourceTriangles=0;
          modelo.traverse((object:any)=>{if(!object.isMesh||!object.geometry||!visible(object))return;const p=object.geometry.getAttribute("position");if(!p||p.count<3)return;const count=Math.floor((object.geometry.index?.count??p.count)/3);if(count<1)return;meshes.push({object,geometry:object.geometry,faceCount:count});sourceTriangles+=count;});
          if(!meshes.length)throw new Error("No se encontraron mallas visibles para convertir a NURBS.");
          const quality=options.quality==="light"?"light":options.quality==="high"?"high":"balanced";
          const MAX_FACES=25000,TARGET=quality==="light"?7000:quality==="high"?20000:14000;
          const modifier=new SimplifyModifier(),prepared:any[]=[];let reducedTriangles=0;
          try{
            for(const entry of meshes){
              const {object,geometry,faceCount}=entry;
              let working=geometry.clone();
              if(!working.index)working=mergeVertices(working);
              if(!working.getAttribute("normal"))working.computeVertexNormals();
              const targetFaces=Math.min(faceCount,Math.max(1,Math.floor(TARGET*faceCount/sourceTriangles)));
              const targetVertices=Math.max(4,Math.min(working.getAttribute("position").count,Math.floor(targetFaces*1.8)));
              const removeCount=Math.max(0,working.getAttribute("position").count-targetVertices);
              let simplified:any=working;
              try{
                if(removeCount>0)simplified=modifier.modify(working,removeCount);
                if(simplified!==working)working.dispose();
                if(!simplified.index)simplified=mergeVertices(simplified);
                const simplifiedFaces=Math.floor((simplified.index?.count??simplified.getAttribute("position").count)/3);
                if(simplifiedFaces<1)throw new Error("La simplificación no conservó caras.");
              }catch{
                if(simplified&&simplified!==working)simplified.dispose?.();
                working.dispose?.();
                simplified=geometry.clone();
                if(!simplified.index)simplified=mergeVertices(simplified);
              }
              const after=Math.floor((simplified.index?.count??simplified.getAttribute("position").count)/3);
              if(after<1){simplified.dispose();throw new Error("La malla original tampoco contiene caras válidas: "+(object.name||"sin nombre")+".");}
              prepared.push({object,geometry:simplified,faceCount:after});reducedTriangles+=after;
            }
            if(reducedTriangles>MAX_FACES)throw new Error("La simplificación produjo "+reducedTriangles.toLocaleString("es-ES")+" caras. Prueba el nivel ligero.");
            const doc=new rhino.File3dm();doc.applicationName="AURUM Render";doc.applicationDetails="NURBS facetadas desde malla simplificada temporalmente. Una superficie planar por triángulo; no reconstruye superficies suaves.";
            let brepCount=0,surfaceCount=0,solidCount=0,manifoldCount=0,closedMeshCount=0;
            try{
              for(const entry of prepared){
                const {object,geometry,faceCount}=entry,p=geometry.getAttribute("position"),index=geometry.index;
                const mesh=new rhino.Mesh(),vertices=mesh.vertices(),v=new THREE.Vector3();
                for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(object.matrixWorld);vertices.add(v.x,v.y,v.z);}
                const faces=mesh.faces();for(let face=0;face<faceCount;face++){const j=face*3;faces.addTriFace(index.getX(j),index.getX(j+1),index.getX(j+2));}
                const meshClosed=Boolean(mesh.isClosed),meshManifold=Boolean(mesh.isManifold);
                const brep=rhino.Brep.createFromMesh(mesh,true);
                if(!brep||!brep.isValid){brep?.destroy?.();mesh.destroy?.();throw new Error("Rhino no pudo crear un BREP válido para "+(object.name||"una malla")+".");}
                const isSolid=Boolean(brep.isSolid),isManifold=Boolean(brep.isManifold);
                const attributes=new rhino.ObjectAttributes();attributes.name=(object.name||"AURUM_MESH_"+(brepCount+1))+"_BREP_FACETADO";doc.objects().add(brep,attributes);
                brepCount++;surfaceCount+=faceCount;if(isSolid)solidCount++;if(isManifold)manifoldCount++;if(meshClosed)closedMeshCount++;
                brep.destroy?.();mesh.destroy?.();
              }
              const bytes=doc.toByteArray(),blob=new Blob([bytes],{type:"application/octet-stream"}),url=URL.createObjectURL(blob),link=document.createElement("a");
              link.href=url;link.download=(nombreProyecto||"aurum-modelo").trim().replace(/[^a-z0-9-_]+/gi,"-")+"_"+quality.toUpperCase()+"_NURBS.3dm";link.click();window.setTimeout(()=>URL.revokeObjectURL(url),60000);
              return {brepCount,surfaceCount,solidCount,manifoldCount,closedMeshCount,sourceTriangles,reducedTriangles,reductionPercent:Math.round((1-reducedTriangles/sourceTriangles)*100),quality};
            }finally{doc.destroy?.();}
          }finally{for(const entry of prepared)entry.geometry.dispose?.();}
        },
        exportPathTraced:async(options:{width?:number;height?:number;format?:"png"|"jpeg"|"webp";samples?:number;signal?:AbortSignal;onProgress?:(d:number,t:number)=>void}={})=>{
          if(!modelo) throw new Error("Carga un modelo antes del render final.");
          const loadFinalRenderAdapter = productionPluginHost.services.get("aurum.final-render.load-adapter");
          if (typeof loadFinalRenderAdapter !== "function") throw new Error("AURUM Final Render service is not registered.");
          const finalRenderAdapter = await loadFinalRenderAdapter();
          const format=options.format==="jpeg"||options.format==="webp"?options.format:"png";
          const mime=format==="jpeg"?"image/jpeg":format==="webp"?"image/webp":"image/png";
          const loop:any=viewerLoopRef.current;
          loop?.pause?.();
          try{
            const dataUrl=await finalRenderAdapter.renderImage(renderer,modelo,camara,{
              width:Number(options.width)||2560,height:Number(options.height)||1440,samples:options.samples??256,mimeType:mime as any,
              environmentUrl:environmentController.currentUrl,environmentIntensity:environmentController.intensity,environmentRotationY:environmentController.rotation,
              gemEnvironmentUrl:gemEnvironmentUrl,studioScene:escena,
              signal:options.signal,onProgress:options.onProgress,
            });
            const link=document.createElement("a");
            link.href=dataUrl;
            link.download="aurum-render-raytrace."+(format==="jpeg"?"jpg":format);
            link.click();
          }finally{
            loop?.resume?.();
            loop?.resize?.();
          }
        },
        exportVideo:async(options:{width?:number;height?:number;aspect?:AurumAspectRatioId;resolution?:"native"|"1080"|"1440"|"4k";fps?:number;duration?:number;mode?:"manual"|"automatic"|"orbit180-return"|"cinematic-zoom"|"vertical-sweep"|"slow360"|"catalog";signal?:AbortSignal;onProgress?:(elapsed:number,total:number)=>void}={})=>{
          if(!modelo) throw new Error("Carga una joya antes de grabar el vídeo.");
          const sourceCanvas=renderer.domElement as HTMLCanvasElement;
          if(!sourceCanvas || sourceCanvas.width<2 || sourceCanvas.height<2) throw new Error("El visor todavía no tiene una imagen para grabar.");
          const originalCameraPosition=camara.position.clone();
          const originalCameraQuaternion=camara.quaternion.clone();
          const originalControlsTarget=controles.target?.clone?.();
          const cameraPosition=camara.position.clone();
          const controlsTarget=controles.target?.clone?.();
          const previousAutoRotate=Boolean(controles.autoRotate);
          const previousAutoRotateSpeed=Number(controles.autoRotateSpeed ?? 0.65);
          const automatic=options.mode!=="manual";
          const loop:any=viewerLoopRef.current;
          const previousFastPath=liveFastPathRef.current;
          const originalRendererSize=renderer.getSize(new THREE.Vector2());
          const originalRendererPixelRatio=renderer.getPixelRatio();
          const originalComposerPixelRatio=composer?.getPixelRatio?.()??originalRendererPixelRatio;
          const originalCameraAspect=camara.aspect;
          const originalFxaaResolution=fxaaPass?.material?.uniforms?.resolution?.value?.clone?.()??null;
          const originalBufferWidth=sourceCanvas.width;
          const originalBufferHeight=sourceCanvas.height;
          // During portrait/landscape export the WebGL drawing buffer changes
          // aspect ratio while the canvas keeps the viewer's wide CSS box.
          // Without object-fit: contain, the browser stretches the portrait
          // bitmap across that wide box, making the jewellery look deformed
          // during recording even though the encoded pixels have the right ratio.
          const originalCanvasObjectFit=sourceCanvas.style.objectFit;
          const originalCanvasObjectPosition=sourceCanvas.style.objectPosition;
          let captureWidth=originalBufferWidth;
          let captureHeight=originalBufferHeight;
          let highResolutionCapture=false;
          let captureResizeLocked=false;
          try{
            const recordVideo = productionPluginHost.services.get("aurum.media.video-recorder") as ((source:HTMLCanvasElement,options:any)=>Promise<void>)|undefined;
            if (!recordVideo) throw new Error("AURUM Media Export Contract is not registered.");
            controles.autoRotate=false;
            {
              // Use the same five aspect presets as still-image export. Resolution
              // defines the longest edge; the selected ratio defines the full frame.
              const aspectId=options.aspect??null;
              // Without an explicit preset, export the full display aspect rather
              // than the editor canvas aspect (which is narrowed by the side panel).
              // The camera projection is updated to this ratio below; pixels are
              // rendered into a matching buffer, never stretched or letterboxed.
              const screenWidth=typeof window!=="undefined"?Number(window.screen?.width):0;
              const screenHeight=typeof window!=="undefined"?Number(window.screen?.height):0;
              const screenAspect=screenWidth>0&&screenHeight>0
                ? screenWidth/screenHeight
                : originalBufferWidth/originalBufferHeight;
              const aspect=aspectId?getAurumAspectRatio(aspectId):screenAspect;
              const originalLongEdge=Math.max(originalBufferWidth,originalBufferHeight);
              const nativeDimensions=aspectId
                ? getAurumAspectDimensions(aspectId,"video")
                : {width:aspect>=1?originalLongEdge:originalLongEdge*aspect,height:aspect>=1?originalLongEdge/aspect:originalLongEdge};
              const requestedLongEdge=options.resolution==="1080"?1920:options.resolution==="1440"?2560:options.resolution==="4k"?3840:Math.max(2,originalBufferWidth,originalBufferHeight);
              const longEdge=Math.min(requestedLongEdge,3840);
              const baseWidth=aspect>=1?longEdge:longEdge*aspect;
              const baseHeight=aspect>=1?longEdge/aspect:longEdge;
              captureWidth=Math.max(2,Math.round(baseWidth/2)*2);
              captureHeight=Math.max(2,Math.round(baseHeight/2)*2);
              // Native mode preserves the current pixel budget while using the
              // selected output aspect (or the full display aspect by default).
              if(options.resolution==="native"){
                const nativeLongEdge=Math.min(3840,Math.max(nativeDimensions.width,nativeDimensions.height,originalBufferWidth,originalBufferHeight));
                captureWidth=Math.max(2,Math.round((aspect>=1?nativeLongEdge:nativeLongEdge*aspect)/2)*2);
                captureHeight=Math.max(2,Math.round((aspect>=1?nativeLongEdge/aspect:nativeLongEdge)/2)*2);
              }
              // Freeze viewport-driven resizing before changing the drawing buffer.
              // Otherwise a window focus/restore event can replace the requested
              // portrait/landscape camera aspect with the editor canvas aspect mid-video.
              loop?.setCaptureResizeLock?.(true);
              captureResizeLocked=true;
              highResolutionCapture=true;
              // Keep the existing WebGL canvas and CSS layout. Only increase its
              // drawing buffer; the same live scene and overlays render at target pixels.
              renderer.setPixelRatio(1);
              renderer.setSize(captureWidth,captureHeight,false);
              // Keep the on-screen preview proportional while its intrinsic
              // WebGL buffer is portrait/landscape and the viewer container is not.
              sourceCanvas.style.objectFit="contain";
              sourceCanvas.style.objectPosition="center";
              composer?.setPixelRatio?.(1);
              composer?.setSize?.(captureWidth,captureHeight);
              gemMaskPass?.setSize?.(captureWidth,captureHeight);
              diamondSupersamplePass?.setSize?.(captureWidth,captureHeight);
              fxaaPass?.material?.uniforms?.resolution?.value?.set?.(1/captureWidth,1/captureHeight);
              camara.aspect=captureWidth/captureHeight;
              camara.updateProjectionMatrix?.();
            }
            loop?.setContinuousRendering?.(true);
            loop?.renderNow?.();
            await recordVideo(sourceCanvas,{
              fps:options.fps,duration:options.duration,
              signal:options.signal,onProgress:options.onProgress,
              // The WebGL canvas is transparent; the selected backdrop belongs
              // to the viewer container and must be composited into every MP4 frame.
              backgroundElement:visorRef.current,
              onFrame:async(elapsed:number,total:number)=>{
                if(automatic && controlsTarget && controles.target){
                  const progress=Math.max(0,Math.min(1,elapsed/total));
                  const smooth=progress*progress*(3-2*progress);
                  const dx=cameraPosition.x-controlsTarget.x;
                  const dz=cameraPosition.z-controlsTarget.z;
                  const radius=Math.hypot(dx,dz);
                  let angle=Math.PI*2*progress;
                  let zoomFactor=1;
                  let targetY=controlsTarget.y;
                  if(options.mode==="orbit180-return"){
                    angle=Math.PI*(1-Math.cos(Math.PI*2*progress))/2;
                  }else if(options.mode==="slow360"){
                    angle=Math.PI*2*smooth;
                  }else if(options.mode==="cinematic-zoom"){
                    zoomFactor=1-0.28*Math.sin(Math.PI*progress);
                    angle=0;
                  }else if(options.mode==="vertical-sweep"){
                    targetY=controlsTarget.y+Math.sin(Math.PI*progress)*radius*0.22;
                    angle=0;
                  }else if(options.mode==="catalog"){
                    angle=(Math.PI/3)*Math.sin(Math.PI*progress);
                    zoomFactor=1-0.18*Math.sin(Math.PI*progress);
                  }
                  const cos=Math.cos(angle),sin=Math.sin(angle);
                  camara.position.set(
                    controlsTarget.x+dx*cos*zoomFactor+dz*sin*zoomFactor,
                    cameraPosition.y+(targetY-controlsTarget.y),
                    controlsTarget.z-dx*sin*zoomFactor+dz*cos*zoomFactor,
                  );
                  controles.target.set(controlsTarget.x,targetY,controlsTarget.z);
                  camara.lookAt(controles.target);
                  controles.update?.();
                }
                // Preserve the requested output pixel dimensions. The expensive
                // part was waiting 32 display frames for EVERY encoded frame,
                // even when temporal diamond TAA was disabled. Only run the full
                // 32-sample convergence when that specific quality option is active.
                setTemporalMotion?.(false);
                setDiamondSupersamplingSettled?.(true);
                controles.update?.();
                const diamondTaaActiveForExport = Boolean(
                  getAurumPostControls().diamondTaaEnabled
                  && idleTaaPass?.enabled
                  && diamondTaaSavePass?.enabled
                  && diamondTaaCompositePass?.enabled
                );
                const progressiveFrameBudget = Math.max(
                  1,
                  Math.min(4, Math.floor(Number(postRuntimeConfig.progressiveFrameCount ?? 2))),
                );
                const settleFrames = diamondTaaActiveForExport ? 32 : progressiveFrameBudget;
                loop?.converge?.(settleFrames);
                // Wait only for the active quality pipeline to settle. Resolution
                // is unchanged; non-TAA exports no longer burn 32 RAFs per frame.
                for(let sample=0;sample<settleFrames;sample++){
                  await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
                }
                loop?.renderNow?.();
              },
            });
          }finally{
            const restoreFailures = runAurumMediaExportCleanup([
              () => {
                if(highResolutionCapture){
                  sourceCanvas.style.objectFit=originalCanvasObjectFit;
                  sourceCanvas.style.objectPosition=originalCanvasObjectPosition;
                  renderer.setPixelRatio(originalRendererPixelRatio);
                  renderer.setSize(originalRendererSize.x,originalRendererSize.y,false);
                  composer?.setPixelRatio?.(originalComposerPixelRatio);
                  composer?.setSize?.(originalRendererSize.x,originalRendererSize.y);
                  gemMaskPass?.setSize?.(originalBufferWidth,originalBufferHeight);
                  diamondSupersamplePass?.setSize?.(originalBufferWidth,originalBufferHeight);
                  if(originalFxaaResolution) fxaaPass?.material?.uniforms?.resolution?.value?.copy?.(originalFxaaResolution);
                  camara.aspect=originalCameraAspect;
                  camara.updateProjectionMatrix?.();
                }
              },
              () => { liveFastPathRef.current=previousFastPath; },
              () => { controles.autoRotate=previousAutoRotate; },
              () => { controles.autoRotateSpeed=previousAutoRotateSpeed; },
              () => camara.position.copy(originalCameraPosition),
              () => camara.quaternion.copy(originalCameraQuaternion),
              () => { if(originalControlsTarget && controles.target) controles.target.copy(originalControlsTarget); },
              () => controles.update?.(),
              () => {
                if(captureResizeLocked){
                  captureResizeLocked=false;
                  loop?.setCaptureResizeLock?.(false);
                }
              },
              () => loop?.invalidate?.(),
              () => loop?.setContinuousRendering?.(false),
              () => loop?.resume?.(),
              () => loop?.converge?.(4),
            ]);
            if(restoreFailures.length){
              console.error("[AURUM][MEDIA][RESTORE] One or more export restoration steps failed; remaining steps were attempted.", restoreFailures);
            }
          }
        },
        setDepthOfField:(enabled:boolean,strength:"soft"|"medium"|"strong"="soft")=>{
          // Previous aperture values were too small for a perceptible live preview.
          // Keep the focused jewelry details restrained while making depth separation visible.
          // Keep the real BokehPass effect photographic, not destructive: once the
          // pass is actually active, the previous aperture values blurred the whole jewel.
          // BokehShader multiplies the difference between focus distance and
          // scene depth by aperture. Values near 0.001 barely change the image
          // at typical jewelry viewing distances, so use a calibrated progression.
          // Keep the depth effect visible but restrained at jewelry-scale camera distances.
          const settings = strength === "strong"
            ? { aperture: 0.008, maxBlur: 0.007 }
            : strength === "medium"
              ? { aperture: 0.005, maxBlur: 0.005 }
              : { aperture: 0.0025, maxBlur: 0.003 };
          Object.assign(postRuntimeConfig,{dof:Boolean(enabled),dofAperture:settings.aperture,dofMaxBlur:settings.maxBlur});
          if (enabled) {
            if (!dofHasSavedSceneBackground) {
              dofSavedSceneBackground = escena.background;
              dofHasSavedSceneBackground = true;
            }
            // RenderPass/Bokeh may clear transparent scenes to black; use an actual
            // white scene background so the blur pass receives the intended studio backdrop.
            escena.background = new THREE.Color(0xffffff);
          } else if (dofHasSavedSceneBackground) {
            escena.background = dofSavedSceneBackground ?? null;
            dofSavedSceneBackground = undefined;
            dofHasSavedSceneBackground = false;
          }
          // Apply the toggle to the actual pass immediately, then reconcile the full
          // post-processing profile. This avoids a UI/runtime state mismatch.
          if (dofPass) dofPass.enabled = Boolean(enabled);
          if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("aurumDofDiag")) {
            console.info("[AURUM][DOF] setDepthOfField", {
              requested: Boolean(enabled),
              passFound: Boolean(dofPass),
              passEnabled: Boolean(dofPass?.enabled),
              aperture: dofPass?.uniforms?.aperture?.value ?? null,
              maxblur: dofPass?.uniforms?.maxblur?.value ?? null,
            });
          }
          applyPostQuality?.({...renderQuality,pixelRatio:renderQuality.pixelRatio,qualityId:measuredQualityId});
          updateTemporal?.(modelo ? calculateAurumFocalDepth(camara, controles, modelo) : undefined);
          invalidateRenderRef.current?.();
          viewerLoopRef.current?.invalidate?.();
        },
        exportPNG:async (options:{width?:number;height?:number;format?:"png"|"jpeg"|"webp";transparent?:boolean;depthOfField?:boolean;dofStrength?:"soft"|"medium"|"strong";focusDistance?:number;onCapture?:(dataUrl:string)=>void}={})=>{
          if(!modelo) throw new Error("Carga un modelo antes de crear el snapshot.");
          const liveCanvas=renderer.domElement as HTMLCanvasElement | null;
          if(!liveCanvas || liveCanvas.width<2 || liveCanvas.height<2) {
            throw new Error("El visor todavía no tiene una imagen disponible para capturar.");
          }
          const isPoster=Boolean(options.onCapture);
          const transparent=Boolean(options.transparent) && !isPoster && (options.format === undefined || options.format === "png");
          if (transparent && !renderer.getContext().getContextAttributes()?.alpha) {
            throw new Error("El renderizador actual no admite canal alfa. No se generó un PNG falso con fondo blanco.");
          }
          const originalBufferWidth=liveCanvas.width;
          const originalBufferHeight=liveCanvas.height;
          const originalPixelRatio=renderer.getPixelRatio?.()||1;
          const originalCssWidth=originalBufferWidth/originalPixelRatio;
          const originalCssHeight=originalBufferHeight/originalPixelRatio;
          const originalAspect=camara.aspect;
          const originalTransmissionResolutionScale=Number((renderer as any).transmissionResolutionScale ?? 1);
          const originalFastPath=liveFastPathRef.current;
          const originalDofConfig = { dof: postRuntimeConfig.dof, dofAperture: postRuntimeConfig.dofAperture, dofMaxBlur: postRuntimeConfig.dofMaxBlur };
          const originalBackground=escena.background;
          const originalClearColor=renderer.getClearColor(new THREE.Color()).clone();
          const originalClearAlpha=renderer.getClearAlpha();
          const width=isPoster
            ? Math.max(1,Math.min(640,Math.round(Number(options.width)||640)))
            : Math.max(320,Math.min(8192,Math.round(Number(options.width)||3840)));
          const requestedHeight=Math.max(320,Math.min(8192,Math.round(Number(options.height)||2160)));
          const height=isPoster
            ? Math.max(1,Math.round(width*originalBufferHeight/originalBufferWidth))
            : requestedHeight;
          if(!isPoster) {
            const gl=renderer.getContext();
            const maxTextureSize=Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)||0);
            const maxRenderbufferSize=Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)||0);
            if(width>maxTextureSize||height>maxTextureSize||width>maxRenderbufferSize||height>maxRenderbufferSize) {
              throw new Error("La GPU de este equipo no admite esta resolución. Prueba 4K o utiliza una GPU con mayor capacidad.");
            }
          }
          if(!isPoster && width*height>36_000_000) {
            throw new Error("La imagen supera 36 megapíxeles. Reduce las dimensiones para proteger la memoria.");
          }
          // PNG capture gets a dedicated supersampling budget: render the
          // faceted diamond above output resolution, then downsample exactly once.
          // Keep the delivered file capped at 12 MP, but allow the temporary
          // WebGL buffer up to 16 MP so small facet edges receive more samples.
          // This affects only still PNG/JPEG/WebP capture, never live orbiting.
          const renderScale=isPoster?1:(width*height>12_000_000?1:Math.min(1.4,Math.sqrt(16_000_000/(width*height))));
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
          const drawAuroraBackground=async(imageSrc:string|null)=>{
            if(!imageSrc?.startsWith("data:image/svg+xml")) {
              throw new Error("Aurora Blue no tiene el recurso de fondo compartido del visor.");
            }
            const backgroundImage=new Image();
            backgroundImage.decoding="async";
            backgroundImage.src=imageSrc;
            try {
              if(typeof backgroundImage.decode==="function") await backgroundImage.decode();
              else await new Promise<void>((resolve,reject)=>{
                backgroundImage.onload=()=>resolve();
                backgroundImage.onerror=()=>reject(new Error("No se pudo decodificar el fondo Aurora Blue."));
              });
            } catch {
              throw new Error("No se pudo decodificar el fondo Aurora Blue compartido con el visor.");
            }
            context.drawImage(backgroundImage,0,0,width,height);
          };

          // Standard still exports are snapshots of the already-composited live
          // viewport. Do not resize the renderer, rerun the scene, or rebuild the
          // diamond mask/AA pipeline: that created visible differences between
          // what the user saw and the exported image. High-resolution dimensions
          // are produced by a single high-quality canvas resample of this exact frame.
          if(!isPoster && !options.depthOfField) {
            if(!transparent) {
              const selectedBackground=sceneAdapter.getBackground();
              const backgroundColor=selectedBackground.color??"#ffffff";
              context.fillStyle=backgroundColor==="transparent"?"#ffffff":backgroundColor;
              context.fillRect(0,0,width,height);

              if(selectedBackground.id==="auroraBlue") {
                await drawAuroraBackground(selectedBackground.image);
              } else if(selectedBackground.id==="degradadoGrisBlanco") {
                const gradient=context.createLinearGradient(0,0,width,height);
                gradient.addColorStop(0,"#ffffff");
                gradient.addColorStop(.48,"#eeeeec");
                gradient.addColorStop(1,"#bfc1c0");
                context.fillStyle=gradient;
                context.fillRect(0,0,width,height);
              } else if(selectedBackground.id==="estudioFotografico" && selectedBackground.image) {
                const backgroundImage=new Image();
                backgroundImage.crossOrigin="anonymous";
                backgroundImage.decoding="async";
                backgroundImage.src=selectedBackground.image;
                try {
                  if(typeof backgroundImage.decode==="function") await backgroundImage.decode();
                  else await new Promise<void>((resolve,reject)=>{
                    backgroundImage.onload=()=>resolve();
                    backgroundImage.onerror=()=>reject(new Error("No se pudo cargar la fotografía de Estudio fotográfico."));
                  });
                } catch {
                  throw new Error("No se pudo incorporar la fotografía de Estudio fotográfico. Comprueba los permisos CORS de la imagen.");
                }
                if(!backgroundImage.naturalWidth||!backgroundImage.naturalHeight) {
                  throw new Error("La fotografía de Estudio fotográfico no devolvió una imagen válida.");
                }
                const scale=Math.max(width/backgroundImage.naturalWidth,height/backgroundImage.naturalHeight);
                const drawWidth=backgroundImage.naturalWidth*scale;
                const drawHeight=backgroundImage.naturalHeight*scale;
                context.drawImage(backgroundImage,(width-drawWidth)/2,(height-drawHeight)/2,drawWidth,drawHeight);
              }
            }

            // Render the same live beauty sequence at the requested output size.
            // This is not an enlarged screenshot: geometry, camera, materials and
            // the diamond-only mask/SSAA/FXAA overlays are rendered at native 4K.
            const captureLoop:any=viewerLoopRef.current;
            const originalFxaaResolution=fxaaPass?.material?.uniforms?.resolution?.value?.clone?.()??null;
            const originalGemMaskEnabled=Boolean(gemMaskPass?.enabled);
            let captureRendered=false;
            captureLoop?.pause?.();
            try {
              renderer.setPixelRatio(1);
              renderer.setSize(width,height,false);
              // The gem mask and isolated diamond SSAA targets are independent
              // render targets; resizing only the WebGL canvas leaves them at the
              // viewport's old dimensions and misaligns the gem composite in 4K.
              gemMaskPass?.setSize?.(width,height);
              diamondSupersamplePass?.setSize?.(width,height);
              const captureFxaaResolution=fxaaPass?.material?.uniforms?.resolution?.value;
              captureFxaaResolution?.set?.(1/width,1/height);
              camara.aspect=width/height;
              camara.updateProjectionMatrix?.();
              diamondBvhRuntime?.update();
              gemMaskPass.enabled=getAurumPostControls().gemMaskEnabled;
              renderer.render(escena,camara);
              if(gemMaskPass.enabled) gemMaskPass.render(renderer);
              const hasCaptureDiamond=Boolean(gemMaskPass?.hasDiamondMeshes);
              const captureSsaaRequested=Boolean(gemMaskPass?.enabled && diamondSupersamplePass?.enabled && diamondSupersampleCompositePass?.enabled);
              const captureFxaaRequested=Boolean(gemMaskPass?.enabled && fxaaPass?.enabled && hasCaptureDiamond);
              if(captureSsaaRequested) renderDiamondSupersampleOverlay?.(renderer);
              if(captureFxaaRequested) {
                const fxaaResolution=fxaaPass?.material?.uniforms?.resolution?.value;
                fxaaResolution?.set?.(1/width,1/height);
                renderDiamondFxaaOverlay?.(renderer);
              }
              context.imageSmoothingEnabled=true;
              context.imageSmoothingQuality="high";
              context.drawImage(renderer.domElement,0,0,width,height);
              captureRendered=true;
              dataUrl=output.toDataURL(mime,0.94);
              console.info("[AURUM][PNG LIVE-PIPELINE EXPORT]",{
                output:{width,height},
                cameraAspect:camara.aspect,
                gemMask:Boolean(gemMaskPass?.enabled),
                diamondSsaa:captureSsaaRequested,
                diamondFxaa:captureFxaaRequested,
                sourceResolution:{width:renderer.domElement.width,height:renderer.domElement.height},
                upscaled:false,
              });
            } finally {
              gemMaskPass.enabled=originalGemMaskEnabled;
              gemMaskPass?.setSize?.(originalBufferWidth,originalBufferHeight);
              diamondSupersamplePass?.setSize?.(originalBufferWidth,originalBufferHeight);
              if(originalFxaaResolution) fxaaPass?.material?.uniforms?.resolution?.value?.copy?.(originalFxaaResolution);
              renderer.setPixelRatio(originalPixelRatio);
              renderer.setSize(originalCssWidth,originalCssHeight,false);
              camara.aspect=originalAspect;
              camara.updateProjectionMatrix?.();
              diamondBvhRuntime?.update();
              resetTemporalAccumulationRef.current?.();
              captureLoop?.resize?.();
              captureLoop?.resume?.();
              captureLoop?.converge?.(4);
            }
            if(!captureRendered||!dataUrl||dataUrl.length<1000) {
              throw new Error("La captura del visor está vacía. Espera a que termine de dibujarse y vuelve a intentar.");
            }
            if(options.onCapture) {
              options.onCapture(dataUrl);
              return;
            }
            const link=document.createElement("a");
            link.download="aurum-render-"+width+"x"+height+"."+format;
            link.href=dataUrl;
            link.click();
            return;
          }
          // Prevent the live animation loop from clearing/replacing the high-resolution
          // capture between progress-frame yields. The browser can still paint React UI.
          const loop:any=viewerLoopRef.current;
          loop?.pause?.();

          // Keep the interactive viewport visually frozen while the shared WebGL
          // renderer temporarily changes its drawing buffer for the high-resolution
          // capture. The overlay is a bitmap of the last live frame; it does not
          // participate in rendering, camera controls, materials or the export.
          const viewportOverlay = document.createElement("canvas");
          const viewportRect = liveCanvas.getBoundingClientRect();
          const viewportParent = nodo;
          const previousParentPosition = viewportParent.style.position;
          const needsRelativeParent = window.getComputedStyle(viewportParent).position === "static";
          if (needsRelativeParent) viewportParent.style.position = "relative";
          viewportOverlay.width = Math.max(1, Math.round(viewportRect.width * (window.devicePixelRatio || 1)));
          viewportOverlay.height = Math.max(1, Math.round(viewportRect.height * (window.devicePixelRatio || 1)));
          viewportOverlay.style.position = "absolute";
          viewportOverlay.style.inset = "0";
          viewportOverlay.style.width = "100%";
          viewportOverlay.style.height = "100%";
          viewportOverlay.style.pointerEvents = "none";
          viewportOverlay.style.zIndex = "2";
          viewportOverlay.setAttribute("aria-hidden", "true");
          const viewportOverlayContext = viewportOverlay.getContext("2d");
          if (viewportOverlayContext) {
            viewportOverlayContext.drawImage(liveCanvas, 0, 0, viewportOverlay.width, viewportOverlay.height);
            viewportParent.appendChild(viewportOverlay);
          } else if (needsRelativeParent) {
            viewportParent.style.position = previousParentPosition;
          }

          const capturePassStates: Array<{pass:any;enabled:boolean}> = [];
          const originalComposerPixelRatio = Number((composer as any)?.getPixelRatio?.() ?? originalPixelRatio);
          const originalFxaaResolution = fxaaPass?.material?.uniforms?.resolution?.value?.clone?.() ?? null;
          const originalRenderPassClearColor = renderPass?.clearColor?.clone?.() ?? renderPass?.clearColor ?? null;
          const originalRenderPassClearAlpha = renderPass?.clearAlpha;
          const originalCameraPosition = camara.position.clone();
          const originalCameraQuaternion = camara.quaternion.clone();
          const originalControlsTarget = controles?.target?.clone?.() ?? null;
          const posterCameraTarget = isPoster && controles?.target?.clone ? controles.target.clone() : null;
          try {
            // Render slightly above the requested dimensions for spatial
            // supersampling; the final file still uses exactly width x height.
            // Camera, materials, lights and both independent HDR environments stay unchanged.
            renderer.setPixelRatio(1);
            // Fidelity-first capture: preserve the established export beauty chain.
            // Native-resolution viewer FXAA is not a Composer pass and is omitted from
            // capture until a matching isolated export path is validated.
            liveFastPathRef.current=false;
            // Give Mi Nube poster captures extra breathing room without changing the live view.
            if (isPoster && posterCameraTarget) {
              camara.position.copy(posterCameraTarget).addScaledVector(
                originalCameraPosition.clone().sub(posterCameraTarget),
                1.3,
              );
              camara.updateMatrixWorld?.();
            }
            renderer.setSize(renderWidth,renderHeight,false);
            if (composer && !options.depthOfField) {
              // Preserve the live diamond mask and SSAA composite. Native FXAA is
              // a viewer final-frame pass and is intentionally not inserted into Composer.
              // TAA and photographic effects remain excluded so the export matches the viewport.
              const liveCapturePasses = new Set([
                renderPass,
                ...(diamondSupersamplePass?.enabled ? [diamondSupersamplePass] : []),
                ...(gemMaskPass?.enabled ? [gemMaskPass] : []),
                ...(diamondSupersampleCompositePass?.enabled ? [diamondSupersampleCompositePass] : []),
                outputPass,
              ]);
              const allComposerPasses = ((composer as any)?.passes ?? []) as any[];
              for (const pass of allComposerPasses) {
                capturePassStates.push({ pass, enabled: Boolean(pass?.enabled) });
                pass.enabled = liveCapturePasses.has(pass);
              }
              composer.setPixelRatio?.(1);
              composer.setSize?.(renderWidth, renderHeight);
              if (renderPass) {
                renderPass.clearColor = transparent ? null : renderPass.clearColor;
                renderPass.clearAlpha = transparent ? 0 : renderPass.clearAlpha;
              }
              const resolution = fxaaPass?.material?.uniforms?.resolution?.value;
              resolution?.set?.(1 / renderWidth, 1 / renderHeight);
            } else if (composer) {
              for (const pass of ((composer as any)?.passes ?? []) as any[]) {
                capturePassStates.push({ pass, enabled: Boolean(pass?.enabled) });
              }
            }
            if(typeof camara.aspect==="number") {
              camara.aspect=renderWidth/renderHeight;
              camara.updateProjectionMatrix?.();
            }
            // Keep the user's exact live camera framing for product snapshots.
            // The on-screen composition frame represents a crop of this view; auto-fitting
            // the whole model here would pull the camera back and export extra whitespace,
            // so the PNG would no longer match what the user composed in the viewer.
            diamondBvhRuntime?.update();
            if(renderer.domElement.width!==renderWidth || renderer.domElement.height!==renderHeight) {
              throw new Error("El canvas WebGL no alcanzó la resolución interna de captura solicitada.");
            }
            const drawingBufferSize = renderer.getDrawingBufferSize(new THREE.Vector2());
            if(Math.round(drawingBufferSize.x)!==renderWidth || Math.round(drawingBufferSize.y)!==renderHeight){
              throw new Error("El búfer de dibujo WebGL no coincide con la resolución interna solicitada.");
            }
            // The normal export uses the same LIVE composer path as the moving viewport.
            // DOF remains an explicit photographic override selected by the user.
            if (options.depthOfField) {
              const strength = options.dofStrength === "strong" ? { aperture: 0.0011, maxBlur: 0.012 } : options.dofStrength === "medium" ? { aperture: 0.0008, maxBlur: 0.008 } : { aperture: 0.0005, maxBlur: 0.004 };
              Object.assign(postRuntimeConfig, { dof: true, dofAperture: strength.aperture, dofMaxBlur: strength.maxBlur });
              applyPostQuality?.({ ...renderQuality, pixelRatio: 1, qualityId: "ultra" }, { capture: true, width: renderWidth, height: renderHeight });
              updateTemporal?.(Number.isFinite(options.focusDistance) ? Number(options.focusDistance) : calculateAurumFocalDepth(camara, controles, modelo));
            }
            if (transparent) {
              escena.background=null;
              renderer.setClearColor(0x000000,0);
            }
            if (composer && options.depthOfField) composer.render();
            else renderer.render(escena,camara);
            renderDiamondSupersampleOverlay?.(renderer);
            const captureComposerBuffer = options.depthOfField && composer ? { width: renderer.domElement.width, height: renderer.domElement.height } : null;
            const captureTaaPass = null as null | { enabled?: boolean; accumulate?: boolean; sampleLevel?: number; accumulateIndex?: number };
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
            if (!transparent) {
              // Export from the scene controller's source-of-truth descriptor.
              // Do not read computed CSS: its serialization is browser-dependent
              // and the renderer effect can outlive the React state that selected it.
              const selectedBackground = sceneAdapter.getBackground();
              const backgroundColor = selectedBackground.color ?? "#ffffff";
              context.fillStyle = backgroundColor === "transparent" ? "#ffffff" : backgroundColor;
              context.fillRect(0, 0, width, height);

              if (selectedBackground.id === "auroraBlue") {
                await drawAuroraBackground(selectedBackground.image);
              } else if (selectedBackground.id === "degradadoGrisBlanco") {
                const gradient = context.createLinearGradient(0, 0, width, height);
                gradient.addColorStop(0, "#ffffff");
                gradient.addColorStop(0.48, "#eeeeec");
                gradient.addColorStop(1, "#bfc1c0");
                context.fillStyle = gradient;
                context.fillRect(0, 0, width, height);
              } else if (selectedBackground.id === "estudioFotografico" && selectedBackground.image) {
                const backgroundImage = new Image();
                backgroundImage.crossOrigin = "anonymous";
                backgroundImage.decoding = "async";
                backgroundImage.src = selectedBackground.image;
                try {
                  if (typeof backgroundImage.decode === "function") {
                    await backgroundImage.decode();
                  } else {
                    await new Promise<void>((resolve, reject) => {
                      backgroundImage.onload = () => resolve();
                      backgroundImage.onerror = () => reject(new Error("No se pudo cargar la fotografía de Estudio fotográfico."));
                    });
                  }
                } catch {
                  throw new Error("No se pudo incorporar la fotografía de Estudio fotográfico. El servidor externo debe permitir CORS para exportar imágenes; el visor puede mostrarla aunque el navegador bloquee su uso en Canvas.");
                }
                if (!backgroundImage.naturalWidth || !backgroundImage.naturalHeight) {
                  throw new Error("La fotografía de Estudio fotográfico no devolvió una imagen válida.");
                }
                const scale = Math.max(width / backgroundImage.naturalWidth, height / backgroundImage.naturalHeight);
                const drawWidth = backgroundImage.naturalWidth * scale;
                const drawHeight = backgroundImage.naturalHeight * scale;
                context.drawImage(backgroundImage, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
              }
            } else {
              context.clearRect(0,0,width,height);
            }
            context.imageSmoothingEnabled=true;
            context.imageSmoothingQuality="high";
            // Downsample only once. The output canvas preserves the exact
            // requested file dimensions while benefiting from extra facet samples.
            context.drawImage(renderer.domElement,0,0,width,height);
            dataUrl=output.toDataURL(mime,0.94);
          } finally {
            viewportOverlay.remove();
            if (needsRelativeParent) viewportParent.style.position = previousParentPosition;
            escena.background=originalBackground;
            Object.assign(postRuntimeConfig, originalDofConfig);
            renderer.setClearColor(originalClearColor,originalClearAlpha);
            // Refresh diamond camera uniforms after restoring the live camera.
            diamondBvhRuntime?.update();
            // Restore the interactive viewport immediately, including DPR and
            // camera projection, even if capture or encoding fails.
            renderer.setPixelRatio(originalPixelRatio);
            (renderer as any).transmissionResolutionScale=originalTransmissionResolutionScale;
            liveFastPathRef.current=originalFastPath;
            renderer.setSize(originalCssWidth,originalCssHeight,false);
            if (composer) {
              composer.setPixelRatio?.(originalComposerPixelRatio);
              composer.setSize?.(originalCssWidth, originalCssHeight);
              if (originalFxaaResolution) {
                fxaaPass?.material?.uniforms?.resolution?.value?.copy?.(originalFxaaResolution);
              }
              if (renderPass) {
                renderPass.clearColor = originalRenderPassClearColor;
                renderPass.clearAlpha = originalRenderPassClearAlpha;
              }
            }
            if(composer && applyPostQuality){
              applyPostQuality({...renderQuality,pixelRatio:originalPixelRatio,qualityId:measuredQualityId});
            }
            // Restore every post-process pass to its pre-capture state, including
            // error/early-exit cases, so the interactive engine is left unchanged.
            for(const state of capturePassStates){
              if(state.pass && "enabled" in state.pass) state.pass.enabled=state.enabled;
            }
            camara.position.copy(originalCameraPosition);
            camara.quaternion.copy(originalCameraQuaternion);
            camara.updateMatrixWorld?.();
            if (originalControlsTarget && controles?.target) {
              controles.target.copy(originalControlsTarget);
              controles.update?.();
            }
            if(typeof originalAspect==="number") {
              camara.aspect=originalAspect;
              camara.updateProjectionMatrix?.();
            }
            // Rebuild the settled viewport image after the temporary high-resolution
            // capture. The export changes composer targets and disables optional
            // passes; restoring their flags alone does not clear stale temporal
            // accumulation or guarantee a fresh beauty frame on a demand-driven loop.
            resetTemporalAccumulationRef.current?.();
            loop?.resize?.();
            loop?.resume?.();
            loop?.converge?.(4);
          }
          if(!dataUrl||dataUrl.length<1000) {
            throw new Error("La captura del visor está vacía. Espera a que termine de dibujarse y vuelve a intentar.");
          }
          if(options.onCapture) {
            options.onCapture(dataUrl);
            return;
          }
          const link=document.createElement("a");
          // Use the product brand for exported still images, independent of the
          // current project/model title (which may be a generic CAD filename).
          link.download="aurum-render-"+width+"x"+height+"."+format;
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
          link.download=(nombreProyecto||"aurum-escena").trim().replace(/[^a-z0-9-_]+/gi,"-")+".json";
          link.click();
          URL.revokeObjectURL(url);
        },
      });
      onCatalogApiReadyRef.current?.(createAurumCatalogApi(apiRef.current));
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
        const sourceAttrsForLayer = obj.userData?.attributes ?? {};
        const sourceIdentityForLayer = obj.userData?.aurumRhinoSource ?? {};
        const sourceInstanceForLayer = obj.userData?.aurumRhinoInstanceSource ?? {};
        const sourceLayerManifest = Array.isArray(modelo?.userData?.aurumRhinoSourceLayers) && modelo.userData.aurumRhinoSourceLayers.length
          ? modelo.userData.aurumRhinoSourceLayers
          : Array.isArray(modelo?.userData?.layers) ? modelo.userData.layers
          : Array.isArray(modelo?.userData?.rhinoLayers) ? modelo.userData.rhinoLayers : [];
        const rawSelectedLayerIndex = sourceInstanceForLayer.layerIndex ?? sourceIdentityForLayer.layerIndex
          ?? sourceAttrsForLayer.layerIndex ?? sourceAttrsForLayer.LayerIndex
          ?? obj.userData?.layerIndex ?? obj.userData?.LayerIndex ?? meta.layerIndex;
        const selectedLayerIndex = rawSelectedLayerIndex !== null && rawSelectedLayerIndex !== undefined
          && rawSelectedLayerIndex !== "" && Number.isInteger(Number(rawSelectedLayerIndex)) && Number(rawSelectedLayerIndex) >= 0
          ? Number(rawSelectedLayerIndex) : null;
        const rawSelectedLayerId = sourceInstanceForLayer.layerId ?? sourceIdentityForLayer.layerId
          ?? sourceAttrsForLayer.layerId ?? sourceAttrsForLayer.LayerId ?? meta.rhinoLayerId;
        const selectedLayerByIndex = selectedLayerIndex !== null ? sourceLayerManifest[selectedLayerIndex] : null;
        const selectedLayerById = rawSelectedLayerId != null
          ? sourceLayerManifest.find((layer:any) => String(layer?.id ?? layer?.Id ?? "") === String(rawSelectedLayerId)) : null;
        const selectedLayerRecord = selectedLayerByIndex ?? selectedLayerById ?? null;
        const capa = String(selectedLayerRecord?.name ?? selectedLayerRecord?.Name
          ?? sourceInstanceForLayer.layerName ?? sourceIdentityForLayer.layerName
          ?? sourceAttrsForLayer.layerName ?? sourceAttrsForLayer.LayerName ?? meta.capa ?? "").trim() || null;
        const selectedLayerId = selectedLayerRecord?.id ?? selectedLayerRecord?.Id ?? rawSelectedLayerId ?? null;
        const selectedLayerColor = selectedLayerRecord?.color ?? selectedLayerRecord?.Color
          ?? sourceIdentityForLayer.layerColor ?? sourceAttrsForLayer.layerColor ?? sourceAttrsForLayer.LayerColor ?? meta.colorCapa ?? null;
        const selectedLayerKey = String(meta.layerKey ?? resolveAurumLayerKey({
          layerId: selectedLayerId, layerIndex: selectedLayerIndex, layerName: capa,
          layerColor: selectedLayerColor, category: meta.categoria ?? clasificarCapa(capa ?? ""),
        }) ?? "");
        const manualLayerOverride = getAurumLayerCategoryOverride(modelo?.userData?.aurumLayerCategoryOverrides, {
          layerId: selectedLayerId, layerIndex: selectedLayerIndex, layerName: capa,
        });
        const sourceCategory = String(meta.categoria ?? "").toLowerCase();
        const layerCategory = clasificarCapa(capa || "", colorRhinoHex(selectedLayerColor) ?? meta.colorCapa);
        // Match the catalog resolver: a stale "otro" tag must not hide an
        // explicitly gem-named Rhino/GLB layer from the one-click workflow.
        const semantic = classifyAurumSemanticObject(obj, selectedLayerRecord ?? (capa ? { name: capa } : null));
        const semanticCategory = semantic.confidence >= .7
          ? semantic.classification === "gem" ? "gema" : semantic.classification === "metal" ? "metal" : null
          : null;
        const categoria = manualLayerOverride ?? (sourceCategory === "gema" || layerCategory === "gema" || semanticCategory === "gema"
          ? "gema"
          : sourceCategory === "metal" || layerCategory === "metal" || semanticCategory === "metal"
            ? "metal"
            : sourceCategory === "otro" || !sourceCategory ? "otro" : sourceCategory) as CategoriaParte;
        setParteSeleccionada(obj.uuid);
        setParteSeleccionadaNombre(nombre);
        setParteSeleccionadaCapa(capa);
        setParteSeleccionadaCategoria(categoria);

        // Full selection diagnostics traverse every mesh and collect nested metadata.
        // Keep this expensive audit opt-in so selecting one piece stays responsive
        // on dense Rhino/CAD models.
        const selectionAuditEnabled = diagnosticoSeleccionHabilitadoRef.current || (typeof window !== "undefined"
          && new URLSearchParams(window.location.search).get("aurumSelectionAudit") === "1");
        if (selectionAuditEnabled) {
          // Diagnostic snapshot of the selected mesh and all gem-layer identities.
          const sourceAttrs = obj.userData?.attributes ?? {};
          const preservedSource = obj.userData?.aurumRhinoSource ?? {};
          const sourceLayerId = selectedLayerId;
          const sourceLayerIndex = selectedLayerIndex;
          const sourceLayerKey = selectedLayerKey;
          const sourceLayerName = String(capa ?? "").trim();
          const diagnosticMeshes:any[] = [];
          modelo?.traverse((mesh:any) => {
            if (!mesh?.isMesh || mesh.userData?.aurumInternalInclusion) return;
            const meshMeta = mesh.userData?.aurumRhino ?? {};
            const sourceMeta = mesh.userData?.aurumRhinoSource ?? {};
            const meshAttrs = mesh.userData?.attributes ?? {};
            const meshInstanceSource = mesh.userData?.aurumRhinoInstanceSource ?? {};
            const meshLayerIndexRaw = meshInstanceSource.layerIndex ?? sourceMeta.layerIndex ?? meshAttrs.layerIndex ?? meshAttrs.LayerIndex ?? mesh.userData?.layerIndex ?? mesh.userData?.LayerIndex ?? meshMeta.layerIndex;
            const meshLayerIndex = meshLayerIndexRaw !== null && meshLayerIndexRaw !== undefined && meshLayerIndexRaw !== ""
              && Number.isInteger(Number(meshLayerIndexRaw)) && Number(meshLayerIndexRaw) >= 0 ? Number(meshLayerIndexRaw) : null;
            const meshLayerIdRaw = meshInstanceSource.layerId ?? sourceMeta.layerId ?? meshMeta.rhinoLayerId ?? meshAttrs.layerId ?? meshAttrs.LayerId ?? null;
            const meshLayerRecord = (meshLayerIndex !== null ? sourceLayerManifest[meshLayerIndex] : null)
              ?? (meshLayerIdRaw != null ? sourceLayerManifest.find((layer:any) => String(layer?.id ?? layer?.Id ?? "") === String(meshLayerIdRaw)) : null);
            const meshLayerName = String(meshLayerRecord?.name ?? meshLayerRecord?.Name ?? meshInstanceSource.layerName
              ?? sourceMeta.layerName ?? meshMeta.capa ?? meshAttrs.layerName ?? meshAttrs.LayerName ?? "").trim();
            const meshLayerId = meshLayerRecord?.id ?? meshLayerRecord?.Id ?? meshLayerIdRaw;
            const meshLayerColor = meshLayerRecord?.color ?? meshLayerRecord?.Color ?? sourceMeta.layerColor
              ?? meshMeta.colorCapa ?? meshAttrs.layerColor ?? meshAttrs.LayerColor ?? null;
            const meshCategory = String(meshMeta.categoria ?? clasificarCapa(meshLayerName, colorRhinoHex(meshLayerColor)));
            const meshLayerKey = String(meshMeta.layerKey ?? resolveAurumLayerKey({
              layerId: meshLayerId, layerIndex: meshLayerIndex, layerName: meshLayerName,
              layerColor: meshLayerColor, category: meshCategory,
            }) ?? "");
            const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).filter(Boolean);
            const sameLayer = sourceLayerKey && meshLayerKey
              ? meshLayerKey === sourceLayerKey
              : sourceLayerId != null && meshLayerId != null
                ? String(meshLayerId) === String(sourceLayerId)
                : sourceLayerIndex !== null && meshLayerIndex !== null
                  ? meshLayerIndex === sourceLayerIndex
                  : Boolean(sourceLayerName && meshLayerName
                    && meshLayerName.toLocaleLowerCase() === sourceLayerName.toLocaleLowerCase());
            diagnosticMeshes.push({
              name: mesh.name || "(sin nombre)", uuid: mesh.uuid, category: meshCategory,
              layer: meshLayerName || null, layerId: meshLayerId == null ? null : String(meshLayerId),
              layerIndex: meshLayerIndex, layerKey: meshLayerKey || null,
              layerColor: meshLayerColor ?? null,
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
                rhinoGeometryType: getAurumRhinoGeometryType(mesh) || null,
                csgEligibility: isAurumRhinoCsgSurface(mesh) ? "PASA FILTRO GEOMÉTRICO" : "EXCLUIDO POR TIPO",
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
              layerColor: selectedLayerColor ?? null,
              layerId: sourceLayerId == null ? null : String(sourceLayerId), layerIndex: sourceLayerIndex,
              layerKey: sourceLayerKey || null, matrixSlot: meta.matrixSlot ?? null,
              metadataResolution: meta.metadataResolution ?? null,
              preservedSource: {
                layerIndex: preservedSource.layerIndex ?? selectedLayerIndex,
                layerName: preservedSource.layerName ?? sourceLayerName ?? null,
                layerId: preservedSource.layerId ?? sourceLayerId ?? null,
                layerColor: preservedSource.layerColor ?? null,
                rawLayerIndex: preservedSource.rawLayerIndex ?? null,
                rawLayerName: preservedSource.rawLayerName ?? null,
                rawLayerId: preservedSource.rawLayerId ?? null,
                materialIndex: preservedSource.materialIndex ?? null,
                objectId: preservedSource.objectId ?? null,
              },
              resolvedLayer: { layerIndex: sourceLayerIndex, layerName: sourceLayerName || null, layerId: sourceLayerId ?? null, layerKey: sourceLayerKey || null, source: selectedLayerRecord ? "tabla original de capas 3DM" : "metadatos del objeto" },
              visible: obj.visible !== false,
              objectType: obj.type ?? null,
              rhinoGeometryType: getAurumRhinoGeometryType(obj) || null,
              csgEligibility: isAurumRhinoCsgSurface(obj) ? "PASA FILTRO GEOMÉTRICO" : "EXCLUIDO POR TIPO",
              geometry: {
                vertices: obj.geometry?.attributes?.position?.count ?? null,
                triangles: obj.geometry?.index ? Math.floor(obj.geometry.index.count / 3) : obj.geometry?.attributes?.position ? Math.floor(obj.geometry.attributes.position.count / 3) : null,
                indexed: Boolean(obj.geometry?.index), normals: Boolean(obj.geometry?.attributes?.normal),
                preflight: obj.geometry ? inspectAurumMesh(obj.geometry) : null,
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
                rhinoGeometryType: getAurumRhinoGeometryType(obj) || null,
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
            sourceLayerTable: (Array.isArray(sourceLayerManifest) ? sourceLayerManifest : []).map((layer:any,index:number) => ({
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
  
        }
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
        limpiarResaltado();
        // Building EdgesGeometry duplicates/inspects every triangle. On dense
        // Rhino meshes this can freeze the main thread right after selection.
        // Keep the precise edge highlight for modest meshes only; material
        // assignment remains available for larger selected components.
        // Consume an armed catalog choice before optional edge highlighting.
        // This keeps selection-to-material feedback ahead of the more expensive
        // EdgesGeometry construction on dense CAD parts.
        const pendingGem = pendingGemApplicationRef.current;
        // A deliberate model click is an explicit target choice. Unknown GLB
        // meshes ("otro") are supported by applyAurumGemToTarget as exact-mesh
        // assignments; never consume the pending gem on a known metal mesh.
        if (pendingGem && (categoria === "gema" || categoria === "otro")) {
          pendingGemApplicationRef.current = null;
          aplicarGema(pendingGem, obj, false, true);
        }
        if (obj.geometry) {
          const positionCount = Number(obj.geometry.attributes?.position?.count ?? 0);
          const indexCount = Number(obj.geometry.index?.count ?? positionCount);
          const triangles = Math.floor(indexCount / 3);
          if (triangles > 0 && triangles <= 30000) {
            const edges = new THREE.EdgesGeometry(obj.geometry, 18);
            resaltado = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color:0xff8a5b,transparent:true,opacity:.95,depthTest:false}));
            resaltado.renderOrder = 20;
            resaltado.position.copy(obj.getWorldPosition(new THREE.Vector3()));
            resaltado.quaternion.copy(obj.getWorldQuaternion(new THREE.Quaternion()));
            resaltado.scale.copy(obj.getWorldScale(new THREE.Vector3()));
            escena.add(resaltado);
          }
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
        const worldSphere = new THREE.Sphere();
        // Broad-phase filtering: only raycast meshes whose existing bounding
        // spheres intersect the click ray. This avoids triangle-level tests
        // against every visible part of a dense CAD assembly.
        modelo.updateMatrixWorld(true);
        modelo.traverse((x:any) => {
          if (!x.isMesh || !x.visible || x.userData?.aurumInternalInclusion) return;
          const sphere = x.geometry?.boundingSphere;
          if (sphere) {
            worldSphere.copy(sphere).applyMatrix4(x.matrixWorld);
            if (!raycaster.ray.intersectsSphere(worldSphere)) return;
          }
          objetivos.push(x);
        });
        const impacto = raycaster.intersectObjects(objetivos, false)[0];
        if (impacto?.object?.uuid) {
          seleccionarMalla(impacto.object);
        } else {
          // Clic fuera de la geometría de la joya: limpiar selección y abrir
          // Ambientes para cambiar la presentación sin buscar el primer icono.
          setUxSection("ambientes");
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
      let perfBvhMs = 0;
      let perfRenderMs = 0;
      let perfFrameMs = 0;
      let perfMaxFrameMs = 0;
      const perfTick = (timings?: { bvhMs?: number; renderMs?: number; frameMs?: number }) => {
        if (!perfEnabled) return;
        perfBvhMs += Number(timings?.bvhMs ?? 0);
        perfRenderMs += Number(timings?.renderMs ?? 0);
        perfFrameMs += Number(timings?.frameMs ?? 0);
        perfMaxFrameMs = Math.max(perfMaxFrameMs, Number(timings?.frameMs ?? 0));
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
          avgBvhCpuMs:Number((perfBvhMs/frames).toFixed(3)),
          avgRenderCpuMs:Number((perfRenderMs/frames).toFixed(3)),
          avgFrameCpuMs:Number((perfFrameMs/frames).toFixed(3)),
          maxFrameCpuMs:Number(perfMaxFrameMs.toFixed(3)),
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
        perfBvhMs=0;
        perfRenderMs=0;
        perfFrameMs=0;
        perfMaxFrameMs=0;
      };

      const diamondMicroPipeline = createAurumDiamondMicroPipeline(escena, camara, () => renderer.domElement.height, { includeMediumTier: true });
      diamondMicroPipelineRef.current = diamondMicroPipeline;
      if (!diamondMicroEnabledRef.current) diamondMicroPipeline.setEnabled(false);

      const viewerLoop = startAurumViewerLoop(
        { node:nodo, camera:camara, renderer, composer, ssaoPass, controls:controles },
        () => {
          const frameStartedAt = performance.now();
          const bvhStartedAt = frameStartedAt;
          // Publish the shared screen-space tier before the BVH runtime consumes it.
          // BVH optics are retuned only when a diamond crosses a tier boundary.
          try {
            diamondMicroPipeline.update();
          } catch (error) {
            console.warn("[AURUM][DIAMOND MICRO PIPELINE] Screen-space analysis skipped for this frame.", error);
          }
          try {
            diamondBvhRuntime?.update();
          } catch (error) {
            console.error("[AURUM][DIAMOND][BVH_UPDATE_ERROR] Skipping BVH update for this frame.", error);
          }
          const bvhCpuMs = performance.now() - bvhStartedAt;
          const renderStartedAt = performance.now();
          // Select exactly one settled/live reconstruction path. TAA runs through
          // the composer only while the camera is still and its diamond-only
          // save/accumulate/mask-composite chain is fully available.
          gemMaskPass.enabled=getAurumPostControls().gemMaskEnabled;
          const hasCenterDiamond = Boolean(gemMaskPass?.hasDiamondMeshes);
          const diamondTaaOverlayRequested = Boolean(
            gemMaskPass?.enabled && hasCenterDiamond
            && idleTaaPass?.enabled && diamondTaaSavePass?.enabled && diamondTaaCompositePass?.enabled
          );
          const diamondFxaaOverlayRequested = Boolean(gemMaskPass?.enabled && fxaaPass?.enabled && hasCenterDiamond);
          const diamondOverlayRequested = Boolean(gemMaskPass?.enabled && diamondSupersamplePass?.enabled && diamondSupersampleCompositePass?.enabled);
          const activeToneAuditPath = diamondTaaOverlayRequested
            ? (diamondFxaaOverlayRequested ? "composer+diamond-taa+diamond-fxaa" : "composer+diamond-taa")
            : diamondOverlayRequested
              ? (diamondFxaaOverlayRequested ? "direct+diamond-ssaa+diamond-fxaa" : "direct+diamond-ssaa")
              : diamondFxaaOverlayRequested ? "direct+diamond-fxaa-overlay" : "direct";
          if (activeToneAuditPath !== lastToneAuditPath) {
            lastToneAuditPath = activeToneAuditPath;
            console.info("[AURUM][DIAMOND_AA][EXECUTION]", {
              path: activeToneAuditPath,
              toneAuditEnabled,
              nativeWidth: renderer.domElement.width,
              nativeHeight: renderer.domElement.height,
              gemMaskEnabled: Boolean(gemMaskPass?.enabled),
              ssaaEnabled: Boolean(diamondSupersamplePass?.enabled && diamondSupersampleCompositePass?.enabled),
              ssaaScale: Number(diamondSupersamplePass?.scale ?? 1),
              ssaaTargetWidth: Number(diamondSupersamplePass?.targetWidth ?? 0),
              ssaaTargetHeight: Number(diamondSupersamplePass?.targetHeight ?? 0),
              ssaaRenderCount: Number(diamondSupersamplePass?.renderCount ?? 0),
              fxaaEnabled: Boolean(fxaaPass?.enabled),
              taaRequested: Boolean(getAurumPostControls().diamondTaaEnabled),
              taaEnabled: Boolean(idleTaaPass?.enabled && diamondTaaSavePass?.enabled && diamondTaaCompositePass?.enabled),
              toneMapping: renderer.toneMapping,
              toneMappingName: toneMappingLabel(renderer.toneMapping),
              toneMappingExposure: renderer.toneMappingExposure,
              outputColorSpace: renderer.outputColorSpace,
            });
          }
          // Refresh the mask before either composer TAA or detached overlays.
          // The TAA composite restores the saved beauty outside this exact mask.
          if(gemMaskPass.enabled) gemMaskPass.render(renderer);
          let diamondTaaRendered=false;
          if(diamondTaaOverlayRequested && composer?.render){
            try{
              composer.render();
              diamondTaaRendered=true;
            }catch(error){
              // A failed temporal frame must never blank the viewer or affect
              // other materials: fall back to the untouched direct beauty frame.
              console.warn("[AURUM][DIAMOND TAA] Composer frame failed; direct beauty fallback retained.",error);
              renderer.render(escena,camara);
              if(gemMaskPass.enabled) gemMaskPass.render(renderer);
            }
          }else{
            renderer.render(escena,camara);
            if(gemMaskPass.enabled) gemMaskPass.render(renderer);
          }
          // SSAA is the live-motion path. At rest TAA owns the diamond; FXAA
          // remains an optional final masked edge pass after either path.
          let diamondSsaaOverlayRendered=false;
          if(!diamondTaaRendered && diamondOverlayRequested){
            diamondSsaaOverlayRendered=Boolean(renderDiamondSupersampleOverlay?.(renderer));
            const ssaaTargetWidth=Number(diamondSupersamplePass?.targetWidth??0);
            const ssaaTargetHeight=Number(diamondSupersamplePass?.targetHeight??0);
            const ssaaRenderCount=Number(diamondSupersamplePass?.renderCount??0);
            if(ssaaRenderCount>0||!diamondSsaaOverlayRendered){
              console.info("[AURUM][DIAMOND_AA][SSAA_RESULT]",{
                requested:true,
                rendered:diamondSsaaOverlayRendered,
                scale:Number(diamondSupersamplePass?.scale??1),
                motionState:String(diamondSupersamplePass?.motionState??"unknown"),
                settledScaleCap:Number(diamondSupersamplePass?.settledScaleCap??0),
                liveScaleCap:Number(diamondSupersamplePass?.liveScaleCap??0),
                activeScaleCap:Number(diamondSupersamplePass?.activeScaleCap??0),
                targetWidth:ssaaTargetWidth,
                targetHeight:ssaaTargetHeight,
                renderCount:ssaaRenderCount,
                maskEnabled:Boolean(gemMaskPass?.enabled),
                compositeEnabled:Boolean(diamondSupersampleCompositePass?.enabled),
                note:"Post-render status; unlike DIAMOND_AA/EXECUTION this is captured after the auxiliary render attempt.",
              });
            }
          }
          if(diamondFxaaOverlayRequested){
            const renderedWithDiamondFxaaOverlay=Boolean(renderDiamondFxaaOverlay?.(renderer));
            if(!renderedWithDiamondFxaaOverlay){
              // Preserve both requested features if FXAA fails after SSAA:
              // repaint beauty, restore the mask, then reapply SSAA. FXAA retries
              // on the next frame without changing the user's stored preference.
              renderer.render(escena,camara);
              if(gemMaskPass.enabled) gemMaskPass.render(renderer);
              if(diamondOverlayRequested){
                diamondSsaaOverlayRendered=Boolean(renderDiamondSupersampleOverlay?.(renderer));
                console.info("[AURUM][DIAMOND_AA][SSAA_RETRY]",{
                  rendered:diamondSsaaOverlayRendered,
                  scale:Number(diamondSupersamplePass?.scale??1),
                  motionState:String(diamondSupersamplePass?.motionState??"unknown"),
                  settledScaleCap:Number(diamondSupersamplePass?.settledScaleCap??0),
                  liveScaleCap:Number(diamondSupersamplePass?.liveScaleCap??0),
                  activeScaleCap:Number(diamondSupersamplePass?.activeScaleCap??0),
                  targetWidth:Number(diamondSupersamplePass?.targetWidth??0),
                  targetHeight:Number(diamondSupersamplePass?.targetHeight??0),
                  renderCount:Number(diamondSupersamplePass?.renderCount??0),
                });
              }
            }
          }
          const renderCpuMs = performance.now() - renderStartedAt;
          const measuredFrameMs = performance.now() - frameStartedAt;
          perfTick({
            bvhMs: bvhCpuMs,
            renderMs: renderCpuMs,
            frameMs: measuredFrameMs,
          });
          performanceMonitorRef.current.recordFrame({
            bvhMs: bvhCpuMs,
            renderMs: renderCpuMs,
            frameMs: measuredFrameMs,
            path: activeToneAuditPath,
            timestamp: performance.now(),
          });
        },
        {
          progressiveFrames: getAurumPostControls().diamondTaaEnabled ? 32 : Math.max(1, Math.min(32, Math.floor(Number(postRuntimeConfig.progressiveFrameCount ?? 1)))),
          onStart: () => {
            setTemporalMotion?.(true);
            renderPipelineContract.setMode("LIVE_MOTION");
            syncAurumSsrDiagnosticConfig();

            // During orbit, disable temporal accumulation and use the lower-cost
            // masked SSAA/FXAA path. Settled TAA is restarted after damping ends.
            const hasCenterDiamond = Boolean(gemMaskPass?.hasDiamondMeshes);
            const livePostControls = getAurumPostControls();
            // Keep native-resolution masked FXAA independent of the SSAA scale cap.
            // Low-end devices therefore never trigger a second high-res scene render.
            const liveDiamondAaEnabled = Boolean(livePostControls.gemFxaaEnabled && hasCenterDiamond);
            // Enable a reduced 1.15x–1.5x reference render while moving.
            // Its full-scene input preserves transmission, but the output is
            // composited only inside the center-diamond mask.
            const liveDiamondSsaaActive = Boolean(livePostControls.diamondSsaaEnabled && hasCenterDiamond);
            setDiamondSupersamplingSettled?.(false);
            // Diamond SSAA must never resize the full-scene drawing buffer.
            // Keep the renderer and composer at the DPR selected by the normal
            // quality controller; only the detached diamond targets may scale.
            const interactionDpr = renderer.getPixelRatio();
            const interactionDprCap = runtimeBudget.pixelRatioCap;
            // Native FXAA sets its inverse texel size from the offscreen
            // beauty target immediately before each final-frame blit.
            const liveEdgeAaProfile = getAurumEdgeAaProfile(measuredQualityId, runtimeBudget.tier, "live");
            if (surfaceEdgeAaPass) {
              const strength = surfaceEdgeAaPass.material?.uniforms?.strength;
              if (strength) strength.value = liveEdgeAaProfile.strength;
              surfaceEdgeAaPass.enabled = false;
            }
            // The existing Gem Mask identifies only center-diamond meshes. FXAA samples
            // the final native-resolution frame and writes no pixels outside that mask.
            const liveBeautyPasses = new Set([renderPass, outputPass]);
            const interactionPasses = ((composer as any)?.passes ?? []) as any[];
            interactionPasses.forEach((pass) => { pass.enabled = liveBeautyPasses.has(pass); });
            // Detached diamond passes are configured by setTemporalMotion() and
            // applyDiamondPostModules(); they never enter the scene-wide composer.
            console.info("[AURUM][DIAMOND][LIVE_QUALITY]", {
              hasCenterDiamond,
              gemMaskEnabled: Boolean(gemMaskPass?.enabled),
              fxaaEnabled: Boolean(fxaaPass?.enabled),
              diamondFxaaRequested: liveDiamondAaEnabled,
              diamondSupersamplingEnabled: liveDiamondSsaaActive,
              diamondLiveSupersampleScaleCap: runtimeBudget.diamondLiveSupersampleScaleCap,
              interactionDpr,
              interactionDprCap,
              runtimeTier: runtimeBudget.tier,
              qualityId: measuredQualityId,
              note: "DPR 1.8 is a controlled first step; DPR 2.0 remains pending performance validation.",
            });
            liveFastPathRef.current = false;

            // Keep catalog-authored gemstone materials unchanged during orbit.
            renderer.shadowMap.enabled = false;
            renderer.shadowMap.needsUpdate = false;
            invalidateRenderRef.current?.();
          },
          onEnd: () => {
            // End temporal motion first: this restarts TAA accumulation for the
            // settled center diamond before the final pass set is assembled.
            setTemporalMotion?.(false);
            // Resume selective 2x diamond supersampling only after camera motion ends.
            setDiamondSupersamplingSettled?.(true);
            const diamondSsaaActive = Boolean(diamondSupersamplePass?.enabled && diamondSupersampleCompositePass?.enabled);
            // Restore the diamond-only settled TAA chain when selected. Other
            // photographic and full-surface passes remain disabled.
            // Restore the ordinary settled camera/pass state only. SSAA is
            // isolated to its own targets and must not alter full-scene DPR.
            // Restore the ordinary settled beauty path; the detached native FXAA module
            // is selected independently on the next frame when explicitly enabled.
            const settledDiamondTaaActive = Boolean(idleTaaPass?.enabled && diamondTaaSavePass?.enabled && diamondTaaCompositePass?.enabled);
            const settledBeautyPasses = new Set([renderPass, ...(settledDiamondTaaActive ? [diamondTaaSavePass, idleTaaPass, diamondTaaCompositePass] : []), outputPass]);
            const settledPasses = ((composer as any)?.passes ?? []) as any[];
            settledPasses.forEach((pass) => { pass.enabled = settledBeautyPasses.has(pass); });
            if (diamondSupersamplePass) diamondSupersamplePass.enabled = diamondSsaaActive;
            if (diamondSupersampleCompositePass) diamondSupersampleCompositePass.enabled = diamondSsaaActive;
            liveFastPathRef.current = false;
            // Restore the normal settled temporal state. There is no active
            // gem transition to coordinate while progressive blending is suspended.
            renderPipelineContract.setMode("RESTING_SETTLED");
            const settledEdgeAaProfile = getAurumEdgeAaProfile(measuredQualityId, runtimeBudget.tier, "settled");
            if (surfaceEdgeAaPass) {
              const strength = surfaceEdgeAaPass.material?.uniforms?.strength;
              if (strength) strength.value = settledEdgeAaProfile.strength;
              surfaceEdgeAaPass.enabled = false;
            }
            // Settled TAA is enabled only for the center-diamond masked composite.
            if (bloomPass) bloomPass.enabled = false;
            if (dofPass) dofPass.enabled = false;
            if (ssrSavePass) ssrSavePass.enabled = false;
            if (ssrPass) ssrPass.enabled = false;
            if (ssrCompositePass) ssrCompositePass.enabled = false;

            if (renderPass) {
              renderPass.clearColor = null;
              renderPass.clearAlpha = 0;
            }
            renderer.shadowMap.enabled = false;
            renderer.shadowMap.needsUpdate = false;

            console.info("[AURUM][RENDER PIPELINE]", {
              phase: "settled",
              path: liveFastPathRef.current ? "direct-fallback" : "shared-beauty-composer",
              sameBeautyPipeline: Boolean(composer && renderPass && outputPass),
              taaEnabled: Boolean(idleTaaPass?.enabled),
              gemMaskEnabled: Boolean(gemMaskPass?.enabled),
              gemSoftEdgeEnabled: Boolean(fxaaPass?.enabled),
              outputEnabled: Boolean(outputPass?.enabled),
              composerAvailable: Boolean(composer),
            });
            invalidateRenderRef.current?.();
          },
        }
      );
      viewerLoopRef.current = viewerLoop;
      frameRef.current = viewerLoop.frame;
      invalidateRenderRef.current = viewerLoop.invalidate;
      // The model may have finished loading before the demand-driven loop was
      // created. Start its bounded beauty convergence now, not on first orbit.
      if (modelo && !liveFastPathRef.current) {
        viewerLoop.converge?.(getAurumPostControls().diamondTaaEnabled ? 32 : (postRuntimeConfig.progressiveFrameCount ?? 1));
      }
      const obs = viewerLoop.observer;

      // Cleanup completo del Viewer: evita listeners, RAF y contextos WebGL acumulados
      // al entrar/salir de Aurum Render o cambiar de ruta.
      cleanup = () => {
        if (cleanupDone) return;
        cleanupDone = true;
        if(diamondDispersionFrameRef.current!==null){ window.cancelAnimationFrame(diamondDispersionFrameRef.current); diamondDispersionFrameRef.current=null; }
        aplicarVistaRef.current = null;
        // Stop RAF, ResizeObserver and host listeners before releasing anything
        // they can still access. This is intentionally the first teardown step.
        try {
          viewerLoop.stop();
        } catch (error) {
          console.error("[AURUM][VIEWER][LOOP_CLEANUP_FAILED]", error);
        }
        diamondMicroPipeline.dispose();
        if (diamondMicroPipelineRef.current === diamondMicroPipeline) diamondMicroPipelineRef.current = null;
        void productionPluginHost.dispose().catch((error) => console.error("[AURUM][CORE] Plugin cleanup failed:", error));
        // Cancel deferred work so it cannot retain the model/renderer after unmount.
        if (shaderPrecompileIdleId !== null && typeof window !== "undefined" && "cancelIdleCallback" in window) {
          (window as any).cancelIdleCallback(shaderPrecompileIdleId);
          shaderPrecompileIdleId = null;
        }
        if (shaderPrecompileTimeoutId !== null) {
          globalThis.clearTimeout(shaderPrecompileTimeoutId);
          shaderPrecompileTimeoutId = null;
        }
        // Release the loaded CAD model before disposing WebGL. A page reload
        // usually destroys the JS realm, but route changes/remounts reuse the
        // same tab and must explicitly release large geometry and material GPU
        // resources to avoid accumulating memory across viewer sessions.
        try {
          diamondBvhRuntime?.dispose();
        } catch (error) {
          console.error("[AURUM][VIEWER][BVH_CLEANUP_FAILED]", error);
        } finally {
          diamondBvhRuntime = null;
          diamondBvhRuntimeRef.current = null;
          diamondBvhRuntimeUrl = null;
        }
        try {
          gemTransitionRef.current?.cancel?.();
        } catch (error) {
          console.error("[AURUM][VIEWER][GEM_TRANSITION_CLEANUP_FAILED]", error);
        } finally {
          gemTransitionRef.current = null;
        }
        renderer.domElement.removeEventListener("pointerdown", handleOrbitPointerDown);
        renderer.domElement.removeEventListener("pointermove", handleOrbitPointerMove);
        renderer.domElement.removeEventListener("pointerup", handleOrbitPointerEnd);
        renderer.domElement.removeEventListener("pointercancel", handleOrbitPointerEnd);
        try {
          quitar();
        } catch (error) {
          console.error("[AURUM][VIEWER][MODEL_CLEANUP_FAILED]", error);
        }
        try {
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
        } catch (error) {
          console.error("[AURUM][VIEWER][GPU_CLEANUP_FAILED]", error);
        } finally {
          invalidateRenderRef.current = null;
        }
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
    onCatalogApiReadyRef.current?.(null);
    viewerLoopRef.current=null;
    setPerformanceRenderer(null);
    performanceMonitorRef.current.reset();
    ptAbortRef.current?.abort();
    composerRef.current=null;
    cleanup();
  };
  },[]);
  useEffect(() => {
    const toggleCameraCalibration = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.altKey && event.code === "KeyC" && !event.repeat) {
        const target = event.target as HTMLElement | null;
        if (target?.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(target?.tagName ?? "")) return;
        event.preventDefault();
        setCameraCalibrationOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", toggleCameraCalibration);
    return () => window.removeEventListener("keydown", toggleCameraCalibration);
  }, []);
  useEffect(()=>{ apiRef.current?.material(materialActivo); invalidateRenderRef.current?.(); },[materialActivo]);
  useEffect(()=>{ apiRef.current?.escenario(escenarioId); invalidateRenderRef.current?.(); },[escenarioId]);
  useEffect(()=>{ apiRef.current?.iluminacion(iluminacionId); invalidateRenderRef.current?.(); },[iluminacionId]);
  useEffect(()=>{
    // Durante la calibración, cambiar la referencia seleccionada solo etiqueta
    // la captura. Nunca debe aplicar un preset ni mover la cámara del usuario.
    if (cameraCalibrationOpen) {
      invalidateRenderRef.current?.();
      return;
    }
    // El cambio automático durante el arrastre solo actualiza el nombre de la
    // vista: no aplicar el preset, porque sobrescribiría la órbita en curso.
    if (autoVistaPorOrbitaRef.current) {
      autoVistaPorOrbitaRef.current = false;
      invalidateRenderRef.current?.();
      return;
    }
    apiRef.current?.vista(vista);
    invalidateRenderRef.current?.();
  },[vista]);

  const cargarArchivo=useCallback(async(file:File, options: { preserveScene?: boolean } = {})=>{
    try {
      const rawDestino = sessionStorage.getItem("aurum-render-poster-destino");
      if (rawDestino) {
        const destino = JSON.parse(rawDestino) as Partial<AurumProjectDestination>;
        if ((destino.archivoNombre && destino.archivoNombre !== file.name) || (typeof destino.archivoTamano === "number" && destino.archivoTamano !== file.size)) {
          sessionStorage.removeItem("aurum-render-poster-destino");
          setDestinoProyectoGuardado(null);
        }
      }
    } catch {
      sessionStorage.removeItem("aurum-render-poster-destino");
    }
    setEstadoCarga(null);
    setCargando(true);
    setError(null);
    setPresentationCover(null);
    setPresentationVisible(false);
    if (presentationTimerRef.current) {
      clearTimeout(presentationTimerRef.current);
      presentationTimerRef.current = null;
    }
    try {
      const cargar = apiRef.current?.cargar;
      if (typeof cargar !== "function") {
        throw new Error("El visor AURUM RENDER todavía está inicializándose. Espera unos segundos y vuelve a intentar la recepción.");
      }
      await cargar(file,(message:string, completed?:number, total?:number)=>{
        setEstadoCarga({ message, completed, total });
      });
      // El GLB guardado ya contiene los materiales del visor: no aplicar el perfil inicial
      // al reabrirlo, porque sobrescribiría el acabado que el usuario había guardado.
      if (!file.name.toLowerCase().endsWith(".glb") && !options.preserveScene) {
        const plataInicial = MATERIALES.find((material) => material.id === "plata950_pulida");
        if (plataInicial) {
          const aplicado = apiRef.current?.materialCatalogo?.(plataInicial);
          if (aplicado === false) {
            console.warn("[AURUM] No se encontró una malla metálica para aplicar Plata 950 Pulida.");
          }
        }
      }
      invalidateRenderRef.current?.();
      setArchivo(file.name);
      setArchivoOriginal(file);
      setArchivoOriginalInfo({ name: file.name, size: file.size, lastModified: file.lastModified, contentType: file.type || "application/octet-stream" });
      setFormatoInterno("GLB");
      // El visor permanece en modo LIVE después de cargar el modelo.
      invalidateRenderRef.current?.();
      return true;
    } catch(e) {
      setError(e instanceof Error?e.message:"No se pudo convertir el modelo");
      setArchivo(null);
      setArchivoOriginal(null);
      setArchivoOriginalInfo(null);
      setFormatoInterno(null);
      return false;
    } finally {
      // Public viewer clears its compact status as soon as setup completes.
      // Do not hold a full-screen loading state after the model is already ready.
      setCargando(false);
    }
  },[]);
  const recibirDesdeRhino = useCallback(async () => {
    const match = window.location.hash.match(/^#aurum-conect=(\d{1,5})\.([a-f0-9]{64})$/i);
    if (!match) {
      aurumConectAttemptRef.current = null;
      setAurumConectCanRetry(false);
      setAurumConectStatus("No hay una transferencia de Rhino pendiente. Vuelve a pulsar ACTUALIZAR DISEÑO.");
      return;
    }
    const handoffKey = match[0];
    if (aurumConectAttemptRef.current === handoffKey) return;
    aurumConectAttemptRef.current = handoffKey;
    const port = Number(match[1]);
    const token = match[2];
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      setAurumConectStatus("El enlace local no es válido. Genera una nueva transferencia desde Rhino.");
      return;
    }

    setAurumConectBusy(true);
    setAurumConectCanRetry(false);
    setAurumConectStatus("Preparando el visor para recibir el documento…");
    try {
      // Start the loopback request synchronously from the retry button's click.
      // Waiting for the WebGL viewer before fetch can consume Chromium's transient
      // user activation and prevent the Local Network Access permission prompt.
      setAurumConectStatus("Conectando con Rhino y solicitando acceso al documento…");
      const endpoint = `http://127.0.0.1:${port}/transfer?token=${token}`;
      const responsePromise = fetch(endpoint, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer",
        targetAddressSpace: "loopback",
      } as RequestInit & { targetAddressSpace: "loopback" });
      const response = await responsePromise;
      if (!response.ok) {
        const message = await response.text().catch(() => "");
        if (response.status === 410) throw new Error("La transferencia expiró o ya fue completada. Vuelve a pulsar ACTUALIZAR DISEÑO en Rhino.");
        if (response.status === 401) throw new Error("El enlace de transferencia ya no es válido. Vuelve a pulsar ACTUALIZAR DISEÑO en Rhino.");
        throw new Error(message || `El canal local respondió ${response.status}.`);
      }
      setAurumConectStatus("Descargando el documento 3DM desde Rhino…");
      const blob = await response.blob();
      if (!blob.size || blob.size > 500 * 1024 * 1024) {
        throw new Error("El archivo recibido está vacío o supera el límite de 500 MiB de AURUM CONECT.");
      }
      const file = new File([blob], "AURUM-CONECT.3dm", {
        type: "application/octet-stream",
        lastModified: Date.now(),
      });

      // The one-time token has now delivered the file. It is safe to wait for
      // the renderer because the network permission request already completed.
      const apiReadyDeadline = Date.now() + 10000;
      while (typeof apiRef.current?.cargar !== "function" && Date.now() < apiReadyDeadline) {
        await new Promise((resolve) => window.setTimeout(resolve, 100));
      }
      if (typeof apiRef.current?.cargar !== "function") {
        throw new Error("El documento llegó desde Rhino, pero AURUM RENDER no terminó de inicializarse. Vuelve a enviar el diseño desde Rhino.");
      }

      setAurumConectStatus("Documento recibido. Preparando la geometría para AURUM RENDER…");
      const loaded = await cargarArchivo(file, { preserveScene: true });
      if (!loaded) throw new Error("Aurum Render no pudo procesar el archivo 3DM.");
      const cleanUrl = new URL(window.location.href);
      cleanUrl.hash = "";
      window.sessionStorage.removeItem("aurum-conect-pending");
      window.history.replaceState({}, "", cleanUrl.pathname + cleanUrl.search);
      setAurumConectCanRetry(false);
      setAurumConectStatus("Diseño recibido correctamente desde Rhino.");
      toast.success("Diseño actualizado desde AURUM CONECT.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "No se pudo recibir el diseño.";
      const networkFailure = /failed to fetch|networkerror|fetch failed/i.test(detail);
      setAurumConectCanRetry(networkFailure);
      setAurumConectStatus(networkFailure
        ? "No se pudo acceder al canal local. Comprueba el permiso de red local del navegador y vuelve a intentar la recepción."
        : detail);
      aurumConectAttemptRef.current = null;
      toast.error("No se pudo recibir el diseño de Rhino.");
    } finally {
      setAurumConectBusy(false);
    }
  }, [cargarArchivo]);

  // Una transferencia enviada desde Rhino se recibe automáticamente al aterrizar
  // en AURUM RENDER. El ref evita dobles descargas por re-render o React StrictMode.
  useEffect(() => {
    if (embedded) return;
    let transferHash = window.location.hash;
    if (!transferHash.startsWith("#aurum-conect=")) {
      transferHash = window.sessionStorage.getItem("aurum-conect-pending") || "";
      if (transferHash.startsWith("#aurum-conect=")) {
        const restoredUrl = new URL(window.location.href);
        restoredUrl.hash = transferHash;
        window.history.replaceState({}, "", restoredUrl.pathname + restoredUrl.search + restoredUrl.hash);
      }
    }
    if (!transferHash.startsWith("#aurum-conect=")) return;
    void recibirDesdeRhino();
  }, [embedded, recibirDesdeRhino]);

  useEffect(() => {
    const visor = visorRef.current;
    if (!visor || embedded) return;
    let dragDepth = 0;
    const contieneArchivos = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes("Files");
    const alEntrar = (event: DragEvent) => {
      if (!contieneArchivos(event)) return;
      event.preventDefault();
      dragDepth += 1;
      setArrastrandoArchivo(true);
    };
    const alMover = (event: DragEvent) => {
      if (!contieneArchivos(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      setArrastrandoArchivo(true);
    };
    const alSalir = (event: DragEvent) => {
      if (!contieneArchivos(event)) return;
      event.preventDefault();
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) setArrastrandoArchivo(false);
    };
    const alSoltar = (event: DragEvent) => {
      if (!contieneArchivos(event)) return;
      event.preventDefault();
      event.stopPropagation();
      dragDepth = 0;
      setArrastrandoArchivo(false);
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (!extension || !["stl", "obj", "glb", "fbx", "3dm"].includes(extension)) {
        setError("Formato no compatible. Arrastra un archivo STL, OBJ, GLB, FBX o Rhino 3DM.");
        return;
      }
      if (cargando) {
        toast.info("Espera a que termine la carga actual antes de abrir otro diseño.");
        return;
      }
      if (fileRef.current) fileRef.current.value = "";
      void cargarArchivo(file);
    };
    visor.addEventListener("dragenter", alEntrar);
    visor.addEventListener("dragover", alMover);
    visor.addEventListener("dragleave", alSalir);
    visor.addEventListener("drop", alSoltar);
    return () => {
      visor.removeEventListener("dragenter", alEntrar);
      visor.removeEventListener("dragover", alMover);
      visor.removeEventListener("dragleave", alSalir);
      visor.removeEventListener("drop", alSoltar);
    };
  }, [embedded, cargarArchivo, cargando]);
  useEffect(() => {
    const params=new URLSearchParams(window.location.search);
    const sharedUrl=params.get("modeloCompartido");
    if(!sharedUrl) return;
    let cancelled=false;
    let timer:number|undefined;
    let attempts=0;
    const loadShared=async()=>{
      if(cancelled)return;
      if(typeof apiRef.current?.cargar!=="function"){
        if(attempts++>=80){setError("El visor tardó demasiado en iniciar. Recarga el enlace compartido.");return;}
        timer=window.setTimeout(loadShared,250);return;
      }
      try{
        const target=new URL(sharedUrl);
        const configured=(import.meta.env as {VITE_SUPABASE_URL?:string}).VITE_SUPABASE_URL;
        if(!configured||target.origin!==new URL(configured).origin||!target.pathname.includes("/storage/v1/object/sign/mi-nube/")) throw new Error("El enlace de la joya no es válido.");
        const response=await fetch(target.toString());
        if(!response.ok) throw new Error(response.status===400||response.status===404?"El enlace venció o la joya ya no está disponible. Pide un enlace nuevo.":"No se pudo descargar la joya compartida.");
        const blob=await response.blob();
        if(cancelled)return;
        const name=(params.get("nombre")||"joya-compartida").replace(/[^a-z0-9-_]/gi,"-").slice(0,80)+".glb";
        await cargarArchivo(new File([blob],name,{type:"model/gltf-binary"}));
        const cleanUrl=new URL(window.location.href);cleanUrl.searchParams.delete("modeloCompartido");cleanUrl.searchParams.delete("nombre");
        window.history.replaceState({},"",cleanUrl.pathname+cleanUrl.search+cleanUrl.hash);
      }catch(cause){if(!cancelled)setError(cause instanceof Error?cause.message:"No se pudo abrir la joya compartida.");}
    };
    void loadShared();
    return()=>{cancelled=true;if(timer)window.clearTimeout(timer);};
  },[cargarArchivo]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = "aurum-render-archivo-pendiente";
    if (params.get("desde-mi-nube") !== "1") {
      sessionStorage.removeItem("aurum-render-poster-destino");
      return;
    }
    const pending = sessionStorage.getItem(key);
    if (!pending) {
      sessionStorage.removeItem("aurum-render-poster-destino");
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
        const datos = JSON.parse(pending) as { url?: string; glbUrl?: string | null; configuracionUrl?: string | null; nombre?: string; rutaArchivoOriginal?: string; rutaCarpeta?: string; archivoTamano?: number };
        if (typeof datos.nombre !== "string" || (!datos.url && !datos.glbUrl)) throw new Error("La referencia del archivo no es válida.");
        setPosterPreview(null);
        if (typeof datos.rutaCarpeta === "string" && datos.rutaCarpeta.trim()) {
          const destino = { rutaCarpeta: datos.rutaCarpeta, rutaArchivoOriginal: datos.rutaArchivoOriginal, nombre: datos.nombre, archivoNombre: datos.nombre, archivoTamano: datos.archivoTamano };
          sessionStorage.setItem("aurum-render-poster-destino", JSON.stringify(destino));
          localStorage.setItem("aurum-render-proyecto-destino", JSON.stringify(destino));
          setDestinoProyectoGuardado({
            rutaCarpeta: datos.rutaCarpeta,
            rutaArchivoOriginal: datos.rutaArchivoOriginal,
            nombre: datos.rutaCarpeta.split("/").filter(Boolean).pop() ?? datos.nombre,
            nombreProyecto: datos.nombre.replace(/\\.[^.]+$/, ""),
            archivoNombre: datos.nombre,
            archivoTamano: datos.archivoTamano,
          });
          // Recuperar la portada ya guardada junto al 3DM, sin generar otra captura.
          const posterPath = `${datos.rutaCarpeta}/00-portada-aurum.png`;
          const { data: posterUrlData, error: posterUrlError } = await supabase.storage.from("mi-nube").createSignedUrl(posterPath, 3600);
          if (!cancelado && !posterUrlError && posterUrlData?.signedUrl) {
            setPosterPreview(posterUrlData.signedUrl);
          }
        }
        let archivoParaAbrir: File | null = null;
        if (typeof datos.glbUrl === "string" && datos.glbUrl) {
          try {
            const responseGlb = await fetch(datos.glbUrl);
            if (responseGlb.ok) {
              const glbBlob = await responseGlb.blob();
              if (glbBlob.size > 1024 && !cancelado) archivoParaAbrir = new File([glbBlob], datos.nombre.replace(/\.3dm$/i, ".glb"), { type: "model/gltf-binary" });
            }
          } catch (glbError) {
            console.warn("[AURUM] No se pudo cargar el GLB guardado; se intentará el 3DM fuente.", glbError);
          }
        }
        let originalFile: File | null = null;
        const recuperarOriginal = async () => {
          if (originalFile) return originalFile;
          if (!datos.url) throw new Error("El GLB no está disponible y falta la referencia del 3DM original.");
          const response = await fetch(datos.url);
          if (!response.ok) throw new Error("No se pudo recuperar el 3DM privado desde Mi Nube.");
          const blob = await response.blob();
          originalFile = new File([blob], datos.nombre!, { type: blob.type || "application/octet-stream" });
          return originalFile;
        };
        if (!archivoParaAbrir) archivoParaAbrir = await recuperarOriginal();
        if (cancelado) return;
        sessionStorage.removeItem(key);
        const url = new URL(window.location.href);
        url.searchParams.delete("desde-mi-nube");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
        let cargado = await cargarArchivo(archivoParaAbrir);
        if (!cargado && archivoParaAbrir !== originalFile) {
          // Si el GLB no se puede interpretar, volver al 3DM fuente en vez de dejar el visor vacío.
          console.warn("[AURUM] Falló la carga del GLB guardado; se intentará el 3DM original.");
          const fuente = await recuperarOriginal();
          cargado = await cargarArchivo(fuente);
        }
        if (!cargado) throw new Error("No se pudo abrir el GLB guardado ni el 3DM original.");
        if (cargado) {
          // La carpeta es la identidad del proyecto. Vincularla DESPUÉS de cargar
          // el modelo evita que los efectos de inicialización del archivo reemplacen
          // el destino por un estado local sin vínculo.
          if (typeof datos.rutaCarpeta === "string" && datos.rutaCarpeta.trim()) {
            const destinoVinculado: AurumProjectDestination = {
              rutaCarpeta: datos.rutaCarpeta,
              rutaArchivoOriginal: datos.rutaArchivoOriginal,
              nombre: datos.rutaCarpeta.split("/").filter(Boolean).pop() ?? datos.nombre,
              nombreProyecto: datos.nombre.replace(/\.3dm$/i, ""),
              archivoNombre: datos.nombre,
              archivoTamano: datos.archivoTamano,
            };
            setDestinoProyectoGuardado(destinoVinculado);
            sessionStorage.setItem("aurum-render-poster-destino", JSON.stringify(destinoVinculado));
            localStorage.setItem("aurum-render-proyecto-destino", JSON.stringify(destinoVinculado));
          }
          if (archivoParaAbrir !== originalFile) {
            // El visor usa GLB; el 3DM queda remoto y solo se recupera al guardar.
            setArchivoOriginal(null);
            setArchivoOriginalInfo({ name: datos.nombre, size: datos.archivoTamano ?? 0, lastModified: 0, storagePath: datos.rutaArchivoOriginal, contentType: "application/octet-stream" });
            setArchivo(datos.nombre);
            setFormatoInterno("GLB");
          }
          // La configuración pertenece al proyecto, no al formato de archivo cargado:
          // restaurarla también si el GLB falta y se abre el 3DM original.
          if (typeof datos.configuracionUrl === "string" && datos.configuracionUrl) {
            try {
              const configResponse = await fetch(datos.configuracionUrl);
              if (configResponse.ok) {
                const config = await configResponse.json() as { schemaVersion?: unknown; nombreProyecto?: unknown; categoriaProyecto?: unknown; materialId?: unknown; gemaId?: unknown; escenarioId?: unknown; iluminacionId?: unknown; vista?: unknown; fondoId?: unknown; sueloVisible?: unknown; sombraContactoVisible?: unknown; ambienteId?: unknown; ambienteMetalInfluence?: unknown; metalHdriId?: unknown; gemHdriId?: unknown; lucesEstudio?: unknown; layerCategoryOverrides?: unknown };
                if (config.schemaVersion === 1) {
                  if (config.layerCategoryOverrides && typeof config.layerCategoryOverrides === "object" && !Array.isArray(config.layerCategoryOverrides)) {
                    apiRef.current?.setLayerCategoryOverrides?.(config.layerCategoryOverrides);
                  }
                  if (typeof config.nombreProyecto === "string") {
                    setNombreProyecto(config.nombreProyecto);
                    setNombreProyectoGuardar(config.nombreProyecto);
                  }
                  if (typeof config.categoriaProyecto === "string") {
                    setCategoriaProyecto(config.categoriaProyecto);
                    categoriaProyectoRef.current = config.categoriaProyecto;
                  }
                  if (typeof config.materialId === "string") {
                    setMaterialId(config.materialId as MaterialId);
                    const materialGuardado = MATERIALES.find((item) => item.id === config.materialId);
                    if (materialGuardado) apiRef.current?.materialCatalogo?.(materialGuardado);
                  }
                  if (typeof config.gemaId === "string") {
                    setGemaId(config.gemaId as GemaId);
                    const gemaGuardada = GEMAS.find((item) => item.id === config.gemaId);
                    if (gemaGuardada) apiRef.current?.gemaCatalogo?.(gemaGuardada);
                  }
                  if (typeof config.escenarioId === "string" && ESCENARIOS.some((item) => item.id === config.escenarioId)) {
                    setEscenarioId(config.escenarioId as EscenarioId);
                    apiRef.current?.escenario(config.escenarioId);
                  }
                  if (typeof config.iluminacionId === "string" && ILUMINACIONES.some((item) => item.id === config.iluminacionId)) {
                    setIluminacionId(config.iluminacionId as IluminacionId);
                    apiRef.current?.iluminacion(config.iluminacionId);
                  }
                  if (typeof config.vista === "string" && VISTAS.some((item) => item.id === config.vista)) {
                    setVista(config.vista as VistaId);
                    apiRef.current?.vista(config.vista);
                  }
                  if (typeof config.fondoId === "string") {
                    setFondoId(config.fondoId);
                    apiRef.current?.fondo(config.fondoId);
                  }
                  if (typeof config.sueloVisible === "boolean") {
                    setSueloVisible(config.sueloVisible);
                    apiRef.current?.sueloVisible?.(config.sueloVisible);
                  }
                  if (typeof config.sombraContactoVisible === "boolean") {
                    setSombraContactoVisible(config.sombraContactoVisible);
                    apiRef.current?.sombraContacto?.(config.sombraContactoVisible);
                  }
                  const ambienteGuardado = typeof config.ambienteId === "string"
                    && Object.prototype.hasOwnProperty.call(AURUM_AMBIENT_PRESETS, config.ambienteId);
                  if (ambienteGuardado) {
                    apiRef.current?.ambiente(config.ambienteId as string);
                  } else if (typeof config.ambienteId === "string" || config.ambienteId === null) {
                    ambienteIdRef.current = null;
                    setAmbienteId(null);
                  }
                  if (typeof config.ambienteMetalInfluence === "number") {
                    setAmbienteMetalInfluence(config.ambienteMetalInfluence);
                    apiRef.current?.influenciaMetalAmbiente?.(config.ambienteMetalInfluence);
                  }
                  if (config.lucesEstudio && typeof config.lucesEstudio === "object") {
                    const guardadas = config.lucesEstudio as Record<string, unknown>;
                    const patch: Record<string, unknown> = {};
                    const limites: Record<string, number> = { key: 12, fill: 8, rim: 8, gem: 8, front: 8 };
                    (["key", "fill", "rim", "gem", "front"] as const).forEach((nombre) => {
                      const valor = guardadas[nombre];
                      if (!valor || typeof valor !== "object") return;
                      const luz = valor as { enabled?: unknown; intensity?: unknown };
                      const cambio: { enabled?: boolean; intensity?: number } = {};
                      if (typeof luz.enabled === "boolean") cambio.enabled = luz.enabled;
                      if (typeof luz.intensity === "number" && Number.isFinite(luz.intensity)) {
                        cambio.intensity = Math.max(0, Math.min(limites[nombre] ?? 8, luz.intensity));
                      }
                      if (Object.keys(cambio).length) patch[nombre] = cambio;
                    });
                    // Version 1 manifests created before the full studio snapshot remain valid.
                    // Missing XL/reflector values deliberately retain the safe default (XL off).
                    if (typeof guardadas.temperatureK === "number" && Number.isFinite(guardadas.temperatureK)) {
                      patch.temperatureK = Math.max(2000, Math.min(12000, guardadas.temperatureK));
                    }
                    if (typeof guardadas.reflectorPower === "number" && Number.isFinite(guardadas.reflectorPower)) {
                      patch.reflectorPower = Math.max(0, Math.min(12, guardadas.reflectorPower));
                    }
                    if (typeof guardadas.reflectorScale === "number" && Number.isFinite(guardadas.reflectorScale)) {
                      patch.reflectorScale = Math.max(0.1, Math.min(5, guardadas.reflectorScale));
                    }
                    if (typeof guardadas.largeSoftboxEnabled === "boolean") {
                      patch.largeSoftboxEnabled = guardadas.largeSoftboxEnabled;
                    }
                    if (typeof guardadas.largeSoftboxPower === "number" && Number.isFinite(guardadas.largeSoftboxPower)) {
                      patch.largeSoftboxPower = Math.max(0, Math.min(4, guardadas.largeSoftboxPower));
                    }
                    if (guardadas.reflectors && typeof guardadas.reflectors === "object") {
                      const reflectores = guardadas.reflectors as Record<string, unknown>;
                      const reflectorsPatch: Record<string, boolean> = {};
                      (["softbox", "strip", "kicker", "edgeLeft", "edgeRight"] as const).forEach((nombre) => {
                        if (typeof reflectores[nombre] === "boolean") reflectorsPatch[nombre] = reflectores[nombre] as boolean;
                      });
                      if (Object.keys(reflectorsPatch).length) patch.reflectors = reflectorsPatch;
                    }
                    if (Object.keys(patch).length) actualizarLucesAurum(patch);
                  }
                  if (!ambienteGuardado) {
                    if (typeof config.metalHdriId === "string" && Object.prototype.hasOwnProperty.call(AURUM_HDRI_URLS, config.metalHdriId)) apiRef.current?.metalHdri(config.metalHdriId);
                    if (typeof config.gemHdriId === "string" && (Object.prototype.hasOwnProperty.call(AURUM_GEM_HDRI_URLS, config.gemHdriId) || Object.prototype.hasOwnProperty.call(AURUM_GEM_ENVIRONMENT_PRESETS, config.gemHdriId))) apiRef.current?.gemHdri(config.gemHdriId);
                  }
                }
              }
            } catch (configError) {
              console.warn("[AURUM] No se pudo restaurar la configuración guardada; se conserva el modelo cargado.", configError);
            }
          }
        }
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

  useEffect(() => {
    if (!archivoOriginalInfo) return;
    try {
      const rawSession = sessionStorage.getItem("aurum-render-poster-destino");
      if (rawSession) {
        const parsed = JSON.parse(rawSession) as Partial<AurumProjectDestination>;
        const nombreOriginalCoincide = !parsed.archivoNombre ||
          parsed.archivoNombre === archivoOriginalInfo.name ||
          (parsed.archivoNombre.toLowerCase().endsWith(".3dm") &&
            parsed.archivoNombre.replace(/\.3dm$/i, ".glb") === archivoOriginalInfo.name);
        if (typeof parsed.rutaCarpeta === "string" && nombreOriginalCoincide) {
          setDestinoProyectoGuardado(parsed.rutaCarpeta && typeof parsed.nombre === "string"
            ? { rutaCarpeta: parsed.rutaCarpeta, rutaArchivoOriginal: parsed.rutaArchivoOriginal,
                nombre: parsed.nombre, nombreProyecto: parsed.nombreProyecto,
                archivoNombre: parsed.archivoNombre, archivoTamano: parsed.archivoTamano, archivoModificado: parsed.archivoModificado }
            : null);
          return;
        }
        sessionStorage.removeItem("aurum-render-poster-destino");
      }
      const rawSaved = localStorage.getItem("aurum-render-proyecto-destino");
      if (!rawSaved) return;
      const saved = JSON.parse(rawSaved) as Partial<AurumProjectDestination>;
      const nombreOriginalCoincide = saved.archivoNombre === archivoOriginalInfo.name ||
        (typeof saved.archivoNombre === "string" &&
          saved.archivoNombre.toLowerCase().endsWith(".3dm") &&
          saved.archivoNombre.replace(/\.3dm$/i, ".glb") === archivoOriginalInfo.name);
      // Al abrir desde Mi Nube se carga el GLB, pero el destino sigue vinculado
      // al 3DM original. En ese caso el tamaño/lastModified del GLB no coinciden.
      const esCargaDesdeMiNube = new URLSearchParams(window.location.search).get("desde-mi-nube") === "1";
      if (!nombreOriginalCoincide ||
          (!esCargaDesdeMiNube && (saved.archivoTamano !== archivoOriginalInfo.size ||
          saved.archivoModificado !== archivoOriginalInfo.lastModified)) ||
          typeof saved.rutaCarpeta !== "string" ||
          typeof saved.nombre !== "string") return;
      const destino: AurumProjectDestination = {
        rutaCarpeta: saved.rutaCarpeta,
        nombre: saved.nombre,
        nombreProyecto: saved.nombreProyecto,
        archivoNombre: saved.archivoNombre,
        rutaArchivoOriginal: saved.rutaArchivoOriginal,
        archivoTamano: saved.archivoTamano,
        archivoModificado: saved.archivoModificado,
      };
      setDestinoProyectoGuardado(destino);
      sessionStorage.setItem("aurum-render-poster-destino", JSON.stringify(destino));
    } catch {
      // Un destino persistido inválido no debe impedir cargar ni renderizar una joya.
    }
  }, [archivoOriginalInfo]);

  const limpiar=()=>{apiRef.current?.limpiar();invalidateRenderRef.current?.();setArchivo(null);setArchivoOriginal(null);setArchivoOriginalInfo(null);setFormatoInterno(null);if(fileRef.current)fileRef.current.value=""};
  const cambiarCalidad=(id:AurumRenderQualityId)=>{
    apiRef.current?.calidad(id);
    setQualityOpen(false);
  };

  const hexColor = (c:number) => "#" + c.toString(16).padStart(6, "0");
  const lightingPanel=(
    <div style={{position:"absolute",right:84,top:72,zIndex:40,width:340,maxHeight:"calc(100% - 88px)",overflowY:"auto",padding:14,borderRadius:14,background:"rgba(12,14,18,.94)",color:"#fff",boxShadow:"0 12px 35px rgba(0,0,0,.35)",border:"1px solid rgba(255,255,255,.10)",fontFamily:"Inter,system-ui"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{fontWeight:700,fontSize:14}}>ESTUDIO DE ILUMINACIÓN AURUM</div>
        <button type="button" aria-label="Cerrar panel de iluminación" onClick={()=>setLightingOpen(false)} style={{background:"none",border:"none",color:"rgba(255,255,255,.5)",cursor:"pointer"}}><X className="size-4"/></button>
      </div>
      <div style={{padding:"10px 0",marginBottom:8,borderTop:"1px solid rgba(255,255,255,.12)",borderBottom:"1px solid rgba(255,255,255,.12)"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#f3d66e",letterSpacing:".08em",textTransform:"uppercase",marginBottom:7}}>Calibración de estudio</div>
        <label style={{display:"block",fontSize:11}}>Temperatura de color <strong style={{float:"right",color:"#f3d66e"}}>{Math.round(lightingStudio.temperatureK ?? 5500)} K</strong>
          <input aria-label="Temperatura de color del estudio" style={{width:"100%"}} type="range" min="3200" max="7500" step="100" value={lightingStudio.temperatureK ?? 5500} onChange={e=>actualizarLucesAurum({temperatureK:+e.target.value})}/>
        </label>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:5,marginTop:7}}>
          {([{label:"Cálida",value:4000},{label:"Neutra",value:5500},{label:"Fría",value:6500}] as const).map(item=><button key={item.value} type="button" onClick={()=>actualizarLucesAurum({temperatureK:item.value})} style={{border:"1px solid rgba(255,255,255,.16)",borderRadius:7,padding:"6px 4px",fontSize:10,color:Math.round(lightingStudio.temperatureK??5500)===item.value?"#171a1f":"#fff",background:Math.round(lightingStudio.temperatureK??5500)===item.value?"#f3d66e":"rgba(255,255,255,.06)"}}>{item.label}</button>)}
        </div>
        <div style={{fontSize:10,fontWeight:700,color:"#f3d66e",letterSpacing:".08em",textTransform:"uppercase",margin:"12px 0 6px"}}>Recetas fotográficas</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:5}}>
          <button type="button" onClick={()=>actualizarLucesAurum({temperatureK:5500,reflectorScale:2.1,key:{...lightingStudio.key,enabled:true,intensity:1.25},fill:{...lightingStudio.fill,enabled:true,intensity:.48},rim:{...lightingStudio.rim,enabled:true,intensity:.7},gem:{...lightingStudio.gem,enabled:true,intensity:1.2},front:{...lightingStudio.front,enabled:true,intensity:.8}})} style={{border:"1px solid rgba(255,255,255,.16)",borderRadius:7,padding:7,fontSize:10,textAlign:"left",background:"rgba(255,255,255,.06)"}}>Diamond Brilliance<small style={{display:"block",opacity:.6}}>Gemas y destellos</small></button>
          <button type="button" onClick={()=>actualizarLucesAurum({temperatureK:4300,reflectorScale:2.2,key:{...lightingStudio.key,enabled:true,intensity:1.1},fill:{...lightingStudio.fill,enabled:true,intensity:.7},rim:{...lightingStudio.rim,enabled:true,intensity:.55},gem:{...lightingStudio.gem,enabled:false},front:{...lightingStudio.front,enabled:true,intensity:.65}})} style={{border:"1px solid rgba(255,255,255,.16)",borderRadius:7,padding:7,fontSize:10,textAlign:"left",background:"rgba(255,255,255,.06)"}}>Gold Luxury<small style={{display:"block",opacity:.6}}>Reflejos cálidos</small></button>
          <button type="button" onClick={()=>actualizarLucesAurum({temperatureK:5500,reflectorScale:2.4,key:{...lightingStudio.key,enabled:true,intensity:.9},fill:{...lightingStudio.fill,enabled:true,intensity:.85},rim:{...lightingStudio.rim,enabled:true,intensity:.45},gem:{...lightingStudio.gem,enabled:true,intensity:.8},front:{...lightingStudio.front,enabled:true,intensity:.9}})} style={{border:"1px solid rgba(255,255,255,.16)",borderRadius:7,padding:7,fontSize:10,textAlign:"left",background:"rgba(255,255,255,.06)"}}>Commercial Catalog<small style={{display:"block",opacity:.6}}>Luz equilibrada</small></button>
          <button type="button" onClick={()=>actualizarLucesAurum({temperatureK:5500,reflectorScale:1.6,key:{...AURUM_LIGHTING_DEFAULT.key},fill:{...AURUM_LIGHTING_DEFAULT.fill},rim:{...AURUM_LIGHTING_DEFAULT.rim},gem:{...AURUM_LIGHTING_DEFAULT.gem},front:{...AURUM_LIGHTING_DEFAULT.front}})} style={{border:"1px solid rgba(255,255,255,.16)",borderRadius:7,padding:7,fontSize:10,textAlign:"left",background:"rgba(255,255,255,.06)"}}>Restablecer<small style={{display:"block",opacity:.6}}>Configuración base</small></button>
        </div>
      </div>
      <label style={{display:"flex",justifyContent:"space-between",fontSize:12}}>Luz principal <input type="checkbox" checked={lightingStudio.key.enabled} onChange={e=>actualizarLucesAurum({key:{...lightingStudio.key,enabled:e.target.checked}})}/></label>
      <label style={{display:"block",fontSize:11}}>Intensidad de luz principal<input aria-label="Intensidad de luz principal" style={{width:"100%"}} type="range" min="0" max="12" step=".05" value={lightingStudio.key.intensity} onChange={e=>actualizarLucesAurum({key:{...lightingStudio.key,intensity:+e.target.value}})}/></label>
      <label style={{display:"flex",justifyContent:"space-between",fontSize:12}}>Luz de relleno <input type="checkbox" checked={lightingStudio.fill.enabled} onChange={e=>actualizarLucesAurum({fill:{...lightingStudio.fill,enabled:e.target.checked}})}/></label>
      <label style={{display:"block",fontSize:11}}>Intensidad de relleno<input aria-label="Intensidad de relleno" style={{width:"100%"}} type="range" min="0" max="8" step=".05" value={lightingStudio.fill.intensity} onChange={e=>actualizarLucesAurum({fill:{...lightingStudio.fill,intensity:+e.target.value}})}/></label>
      <label style={{display:"flex",justifyContent:"space-between",fontSize:12}}>Luz de contorno <input type="checkbox" checked={lightingStudio.rim.enabled} onChange={e=>actualizarLucesAurum({rim:{...lightingStudio.rim,enabled:e.target.checked}})}/></label>
      <label style={{display:"block",fontSize:11}}>Intensidad de contorno<input aria-label="Intensidad de luz de contorno" style={{width:"100%"}} type="range" min="0" max="10" step=".05" value={lightingStudio.rim.intensity} onChange={e=>actualizarLucesAurum({rim:{...lightingStudio.rim,intensity:+e.target.value}})}/></label>
      <label style={{display:"flex",justifyContent:"space-between",fontSize:12}}>Luz de gemas <input type="checkbox" checked={lightingStudio.gem.enabled} onChange={e=>actualizarLucesAurum({gem:{...lightingStudio.gem,enabled:e.target.checked}})}/></label>
      <label style={{display:"block",fontSize:11}}>Intensidad para gemas<input aria-label="Intensidad para gemas" style={{width:"100%"}} type="range" min="0" max="6" step=".05" value={lightingStudio.gem.intensity} onChange={e=>actualizarLucesAurum({gem:{...lightingStudio.gem,intensity:+e.target.value}})}/></label>
      <label style={{display:"flex",justifyContent:"space-between",fontSize:12}}>Luz frontal rectangular <input type="checkbox" checked={lightingStudio.front.enabled} onChange={e=>actualizarLucesAurum({front:{...lightingStudio.front,enabled:e.target.checked}})}/></label>
      <label style={{display:"block",fontSize:11}}>Intensidad frontal<input aria-label="Intensidad de luz frontal" style={{width:"100%"}} type="range" min="0" max="8" step=".05" value={lightingStudio.front.intensity} onChange={e=>actualizarLucesAurum({front:{...lightingStudio.front,intensity:+e.target.value}})}/></label>
      <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(243,214,110,.28)",background:"rgba(243,214,110,.055)",borderRadius:9,padding:9}}>
        <label style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,fontWeight:700,color:"#f3d66e"}}>
          DIFUSOR AÉREO XL
          <input aria-label="Activar difusor aéreo XL" type="checkbox" checked={lightingStudio.largeSoftboxEnabled === true} onChange={e=>actualizarLucesAurum({largeSoftboxEnabled:e.target.checked})}/>
        </label>
        <div style={{fontSize:10,color:"rgba(255,255,255,.68)",margin:"4px 0 7px"}}>Fuente rectangular de gran superficie para reflejos amplios y difusos sobre toda la joya.</div>
        <label style={{display:"block",fontSize:11}}>Potencia XL <strong style={{float:"right",color:"#f3d66e"}}>{(lightingStudio.largeSoftboxPower ?? 1.4).toFixed(1)}×</strong>
          <input aria-label="Potencia del difusor aéreo XL" style={{width:"100%"}} type="range" min="0" max="4" step=".1" value={lightingStudio.largeSoftboxPower ?? 1.4} onChange={e=>actualizarLucesAurum({largeSoftboxPower:+e.target.value})}/>
        </label>
      </div>
      <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,255,255,.12)"}}>
        <div style={{fontSize:12,fontWeight:700,marginBottom:7}}>Reflectores de estudio</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 10px",fontSize:11}}>
          {([{id:"softbox",label:"Reflector Cenital de Estudio"},{id:"strip",label:"Strip lateral"},{id:"kicker",label:"Reflector trasero"},{id:"edgeLeft",label:"Borde izquierdo"},{id:"edgeRight",label:"Borde derecho"}] as const).map(item=><label key={item.id} style={{display:"flex",alignItems:"center",gap:5}}><input type="checkbox" checked={lightingStudio.reflectors?.[item.id] ?? true} onChange={e=>actualizarLucesAurum({reflectors:{...(lightingStudio.reflectors ?? {}),[item.id]:e.target.checked}})}/>{item.label}</label>)}
        </div>
      </div>
      <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,255,255,.12)"}}>
         <label style={{display:"block",fontSize:12,fontWeight:700}}>Potencia global de reflectores <span style={{float:"right",color:"#f3d66e"}}>{(lightingStudio.reflectorPower ?? 2.5).toFixed(1)}×</span>
           <input aria-label="Potencia global de reflectores" style={{width:"100%"}} type="range" min="0" max="6" step=".1" value={lightingStudio.reflectorPower ?? 2.5} onChange={e=>actualizarLucesAurum({reflectorPower:+e.target.value})}/>
         </label>
         <p style={{fontSize:10,color:"rgba(255,255,255,.62)",marginTop:3}}>Multiplica la energía de los seis reflectores rectangulares sin alterar el HDRI ni la exposición global.</p>
       </div>
       <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,255,255,.12)"}}><label style={{display:"block",fontSize:12,fontWeight:600}}>Tamaño de reflectores <span style={{float:"right",color:"#f3d66e"}}>{Math.round((lightingStudio.reflectorScale ?? 1.6)*100)}%</span><input aria-label="Tamaño de reflectores" style={{width:"100%"}} type="range" min=".75" max="3.5" step=".05" value={lightingStudio.reflectorScale ?? 1.6} onChange={e=>actualizarLucesAurum({reflectorScale:+e.target.value})}/></label><p style={{fontSize:10,color:"rgba(255,255,255,.62)",marginTop:3}}>Ajusta el tamaño aparente de los softboxes y strips; fuentes mayores producen reflejos más amplios y suaves.</p></div>
    </div>
  );
  return (<>
    <div className={(embedded ? "relative h-full min-h-0 w-full " : "fixed inset-0 z-40 ") + "flex flex-col overflow-hidden bg-[#eeede8] text-white"}>
      {!embedded && /^#aurum-conect=/.test(window.location.hash) && (
        <div className="absolute left-1/2 top-20 z-[120] w-[min(92vw,520px)] -translate-x-1/2 rounded-2xl border border-[#c6a45a]/50 bg-[#171a1f] p-4 text-white shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#c6a45a]/15 text-[#d9bd78]"><Gem className="size-5"/></div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold tracking-wide">AURUM CONECT</div>
              <div className="text-xs text-white/65">Diseño preparado desde Rhino 7 / MatrixGold</div>
            </div>
            <span className="rounded-xl bg-[#c6a45a]/15 px-3 py-2 text-xs font-semibold text-[#e3c77f]">
              {aurumConectBusy ? "RECIBIENDO AUTOMÁTICAMENTE…" : aurumConectStatus.includes("correctamente") ? "DISEÑO RECIBIDO" : "RECEPCIÓN AUTOMÁTICA"}
            </span>
          </div>
          {aurumConectStatus && <p role="status" aria-live="polite" className="mt-3 text-xs leading-5 text-white/75">{aurumConectStatus}</p>}
          {aurumConectCanRetry && !aurumConectBusy && <button type="button" onClick={() => void recibirDesdeRhino()} className="mt-3 inline-flex items-center justify-center rounded-lg border border-[#d9bd78]/40 bg-[#c6a45a]/15 px-3 py-2 text-[11px] font-semibold tracking-wide text-[#e3c77f] transition hover:bg-[#c6a45a]/25 focus:outline-none focus:ring-2 focus:ring-[#d9bd78]/60">REINTENTAR RECEPCIÓN</button>}

          <p className="mt-2 text-[11px] leading-4 text-white/45">La geometría se transfiere directamente desde Rhino a este visor, sin pasar por almacenamiento en la nube.</p>
        </div>
      )}
      {!embedded && <header className="flex h-[64px] shrink-0 items-center justify-between gap-2 border-b border-black/10 bg-[#f7f6f2]/95 px-3 text-[#242424] shadow-sm backdrop-blur-xl sm:h-[68px] sm:px-4 xl:h-[74px] xl:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/brand/aurum-symbol.svg"
            alt=""
            aria-hidden="true"
            width="42"
            height="42"
            className="size-[42px] shrink-0 object-contain"
            loading="eager"
          />
          <div className="leading-none">
            <div className="font-display text-[23px] font-semibold tracking-[.16em] text-[#92743b]">AURUM <span className="tracking-normal text-[#292824]">RENDER</span></div>
            <div className="mt-1 text-[10px] tracking-[.06em] text-[#77756f]">Estudio profesional de joyería</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-[#b99642]/25 bg-white/95 px-3 text-sm text-[#292824] shadow-sm transition hover:border-[#b99642]/60 hover:shadow-[0_3px_12px_rgba(185,150,66,.12)] focus-within:ring-2 focus-within:ring-[#92743b]/20">
            <Gem className="size-4 text-[#92743b]"/>
            <select aria-label="Seleccionar vista de cámara" value={vista} onChange={e=>{const next=e.target.value as VistaId;vistaRef.current=next;setVista(next);}} className="min-w-0 appearance-none bg-transparent font-medium outline-none cursor-pointer">
              <option className="bg-white" value={VISTAS[0]?.id}>{VISTAS[0]?.nombre || "Vista 3D"}</option>
              {VISTAS.slice(1).map(v=><option className="bg-white" key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none size-4 shrink-0 text-[#a17d38]"/>
          </label>

          <button type="button" disabled={!archivo || cargando || guardandoProyectoNube} onClick={() => void abrirGuardarEnMiNube()} className="flex h-10 items-center gap-2 rounded-xl border border-black/[.10] bg-white/90 px-3 text-sm font-semibold text-[#292824] shadow-sm transition-colors hover:border-[#b99642]/50 hover:bg-[#d4af37]/10 disabled:cursor-not-allowed disabled:opacity-45"><Upload className="size-4 text-[#92743b]"/><span>{destinoProyectoGuardado?.rutaCarpeta ? "Actualizar en Mi Nube" : "Guardar en Mi Nube"}</span></button>
          {destinoProyectoGuardado?.rutaCarpeta && <button type="button" onClick={()=>window.location.assign("/mi-nube")} className="flex h-10 items-center gap-2 rounded-xl border border-[#b99642]/45 bg-[#d4af37]/15 px-3 text-sm font-semibold text-[#6d5523] shadow-sm transition-colors hover:bg-[#d4af37]/25" title="Ir a Mi Nube"><Cloud className="size-4"/><span>Ir a Mi Nube</span></button>}
          <button type="button" aria-controls="aurum-export-title" aria-expanded={exportOpen} onClick={()=>{setExportOpen(v=>!v);setLibraryMenuOpen(false);setQualityOpen(false);setLightingOpen(false);}} className={"flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold shadow-sm transition-colors "+(exportOpen?"border-[#b99642]/50 bg-[#d4af37]/15 text-[#6d5523]":"border-[#d4af37]/45 bg-[#d4af37] text-[#292824] hover:bg-[#e1bf50]")}><Download className="size-4"/><span>Exportar</span></button>
          <div className="hidden text-[11px] uppercase tracking-[.12em] text-[#66645e] lg:block">Taller del Joyero</div>
          <div className="grid size-10 place-items-center rounded-full border border-white/10 text-[#55534d]"><span className="text-lg">♙</span></div>
        </div>
      </header>}

      {!embedded && guardarProyectoOpen && <div className="absolute right-3 top-[72px] z-[85] max-h-[calc(100%-5.5rem)] w-[min(440px,calc(100%-1.25rem))] overflow-y-auto rounded-2xl border border-white/80 bg-[#fbfaf7]/95 p-4 text-[#292824] shadow-[0_16px_44px_rgba(35,32,24,.18)] backdrop-blur-2xl sm:right-4 sm:top-[76px]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div><div className="text-lg font-semibold tracking-tight">{destinoProyectoGuardado?.rutaCarpeta ? "Actualizar proyecto en Mi Nube" : "Guardar proyecto en Mi Nube"}</div><p className="mt-1 text-xs leading-relaxed text-[#77756f]">Se guardarán el archivo original y el GLB actualizado en la carpeta del proyecto. La portada PNG solo se actualizará cuando pulses «Actualizar y guardar póster».</p></div>
          <button type="button" aria-label="Cerrar guardado de proyecto" disabled={guardandoProyectoNube} onClick={() => setGuardarProyectoOpen(false)} className="rounded-lg p-1 text-[#77756f] hover:bg-black/[.05] disabled:opacity-40"><X className="size-4"/></button>
        </div>
        <label className="mb-3 block text-xs font-medium text-[#55534d]">Nombre del proyecto
          <input value={nombreProyectoGuardar} onChange={event => setNombreProyectoGuardar(event.target.value)} maxLength={100} placeholder="Ej. Anillo de compromiso" className="mt-1.5 w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-[#292824] outline-none focus:border-[#b99642]" />
        </label>
        <div className="mb-2 block text-xs font-medium text-[#55534d]">Carpeta del proyecto
          {destinoProyectoGuardado?.rutaCarpeta && destinoProyectoGuardado.archivoNombre === archivoOriginalInfo?.name ? (
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[#c5a15d]/45 bg-[#c5a15d]/[.08] px-3 py-2.5 text-sm text-[#292824]">
              <FolderOpen className="size-4 shrink-0 text-[#92743b]"/>
              <span className="min-w-0 flex-1 truncate">Carpeta vinculada: {destinoProyectoGuardado.rutaCarpeta.split("/").filter(Boolean).pop()}</span>
              <span className="shrink-0 text-[10px] font-semibold text-[#92743b]">FIJA</span>
            </div>
          ) : (
            <select value={carpetaDestinoSeleccionada} onChange={event => setCarpetaDestinoSeleccionada(event.target.value)} className="mt-1.5 w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-[#292824] outline-none focus:border-[#b99642]">
              <option value="__nueva__">Crear una carpeta nueva con este nombre</option>
              {carpetasDestinoProyecto.map(folder => <option key={folder} value={folder}>Carpeta existente: {folder}</option>)}
            </select>
          )}
        </div>
        {destinoProyectoGuardado?.rutaCarpeta && destinoProyectoGuardado.archivoNombre === archivoOriginalInfo?.name && <p className="mb-3 flex items-start gap-2 rounded-lg border border-[#c5a15d]/35 bg-[#c5a15d]/[.08] p-2.5 text-[11px] leading-relaxed text-[#6d5523]"><FolderOpen className="mt-0.5 size-4 shrink-0"/> Esta joya se actualizará en su carpeta vinculada. No se crearán copias ni se cambiará el destino por accidente.</p>}
        <div className="mb-3 rounded-lg border border-black/[.06] bg-white/65 p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.12em] text-[#92743b]">Archivos incluidos</div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-md bg-[#f0eee7]"><FileJson className="size-3.5"/></span><span className="min-w-0 flex-1 truncate">{archivoOriginalInfo?.name ?? "Archivo original"}</span><span className="text-[#77756f]">Original</span></div>
            <div className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-md bg-[#f0eee7]"><Gem className="size-3.5"/></span><span className="flex-1">Modelo GLB actualizado</span><span className="text-[#77756f]">3D</span></div>
            <div className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-md bg-[#f0eee7]"><ImageIcon className="size-3.5"/></span><span className="flex-1">Portada del proyecto</span><span className="text-[#77756f]">Solo con su botón</span></div>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={guardandoProyectoNube} onClick={() => setGuardarProyectoOpen(false)} className="flex-1 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-medium hover:bg-black/[.025] disabled:opacity-45">Cancelar</button>
          <button type="button" disabled={guardandoProyectoNube || !nombreProyectoGuardar.trim()} onClick={() => void guardarProyectoEnMiNube()} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[#c5a15d]/60 bg-[#d4af37] px-3 py-2.5 text-sm font-semibold text-[#292824] hover:bg-[#e1bf50] disabled:cursor-not-allowed disabled:opacity-50">
            {guardandoProyectoNube ? <><RotateCw className="size-4 animate-spin"/> Guardando…</> : <><Upload className="size-4"/> {destinoProyectoGuardado?.rutaCarpeta ? "Actualizar proyecto" : "Guardar proyecto"}</>}
          </button>
        </div>
      </div>}
      
      <div className={embedded ? "flex min-h-0 flex-1 overflow-hidden bg-[#090b0e]" : "flex min-h-0 flex-1 gap-3 overflow-hidden rounded-2xl border border-[#e7e2d9] bg-[#f9f8f5] p-3"}>
        <AurumRenderSidebar activeToolId={uxSection} onAmbientesClick={() => setUxSection("ambientes")} onGemHdrClick={() => setUxSection("hdrGemas")} onBackgroundClick={() => setUxSection("fondos")} onSceneClick={() => setUxSection("escenas")} onMaterialsClick={() => setUxSection("materiales")} onGemsClick={() => {setUxSection("gemas");setBibliotecaTipo("gemas");setFamiliaGemaActiva("Predeterminadas");setMostrarTodasGemas(false);setBusquedaGemas("");}} onCadTreeClick={() => {setUxSection("cad-tree");refreshCadTree();}} onPositionsClick={() => setUxSection("positions")} onRhinoExportClick={() => {setExportOpen(false);setRhinoExportError(null);setRhinoExportReport(null);setUxSection("rhino-export");}} onDiamondControlClick={() => {setUxSection("diamond-control");window.dispatchEvent(new CustomEvent("aurum-diamond-control-refresh"));}} />
        <aside className={"relative z-20 flex h-full min-h-0 w-[min(22vw,336px)] min-w-[240px] shrink-0 flex-col overflow-hidden rounded-r-2xl border border-l-0 border-[#e7e2d9] bg-[#f9f8f5] text-[#292824] " + (embedded ? "" : "-ml-3")}>
          {uxSection==="diamond-control"&&<div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#f9f8f5] px-3 py-3">
            <div className="mb-3">
              <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#92743b]">AURUM RENDER · ÓPTICA</div>
              <h2 className="mt-1 text-base font-semibold text-[#292824]">Control del diamante</h2>
              <p className="mt-1 text-[10px] leading-relaxed text-[#77756f]">Controla el BVH óptico de diamantes de todos los tamaños y rubíes compatibles. No modifica metales ni el ambiente.</p>
            </div>
            <section className="mb-3 rounded-xl border border-[#e6e1d8] bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-2"><div><div className="text-xs font-semibold text-[#292824]">BVH óptico</div><p className="mt-0.5 text-[9px] text-[#77756f]">Sustituye el material físico en diamantes centrales y rubíes compatibles.</p></div>
                <button type="button" role="switch" aria-label="BVH óptico de diamantes y rubíes" aria-checked={diamondBvhEnabled} onClick={()=>window.dispatchEvent(new CustomEvent("aurum-diamond-control",{detail:{type:"bvh",enabled:!diamondBvhEnabled}}))} className={"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors "+(diamondBvhEnabled?"bg-[#a88743]":"bg-[#c9c6bf]")}><span className={"inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform "+(diamondBvhEnabled?"translate-x-[18px]":"translate-x-1")}/></button>
              </div>
              <div className="mt-2 text-[9px] text-[#77756f]">{diamondBvhEnabled?"Solicitado: activado":"Solicitado: desactivado"} · El material original se restaura al desactivar.</div>
            </section>
            <section className="mb-3 rounded-xl border border-[#e6e1d8] bg-white p-3">
              <div className="flex items-center justify-between gap-2"><div><div className="text-xs font-semibold text-[#292824]">Micro Pipeline</div><p className="mt-0.5 text-[9px] text-[#77756f]">Clasificación MICRO / SMALL / BRILLIANT por tamaño en pantalla.</p></div>
                <button type="button" role="switch" aria-label="Micro Pipeline del diamante" aria-checked={diamondMicroEnabled} onClick={()=>window.dispatchEvent(new CustomEvent("aurum-diamond-control",{detail:{type:"micro",enabled:!diamondMicroEnabled}}))} className={"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors "+(diamondMicroEnabled?"bg-[#a88743]":"bg-[#c9c6bf]")}><span className={"inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform "+(diamondMicroEnabled?"translate-x-[18px]":"translate-x-1")}/></button>
              </div>
            </section>
            <section className="mb-3 rounded-xl border border-[#e6e1d8] bg-white p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.12em] text-[#92743b]">Cadena óptica actual</div>
              <div className="space-y-2 text-[10px] text-[#55534d]">
                <div className="flex items-center justify-between gap-2"><span>Material físico + shader iJewel</span><span className="font-semibold">{!diamondControlDiagnostics?.bvh?"Pendiente de diagnóstico":(diamondControlDiagnostics.bvh.diamondMeshes??0)>0?"Reemplazado en mallas BVH":"Ruta física en uso"}</span></div>
                <div className="flex items-center justify-between gap-2"><span>Scintillation</span><span className="font-semibold">{!diamondControlDiagnostics?.bvh?"Pendiente":(diamondControlDiagnostics.bvh.diamondMeshes??0)>0?"No corre en esas mallas":"Disponible en shader físico"}</span></div>
                <div className="flex items-center justify-between gap-2"><span>Dispersión</span><span className="font-semibold">{!diamondControlDiagnostics?.bvh?"Pendiente":(diamondControlDiagnostics.bvh.diamondMeshes??0)>0?"BVH":"Shader físico"}</span></div>
                <div className="flex items-center justify-between gap-2"><span>SSAA / FXAA / TAA dedicado</span><span className="font-semibold">{[diamondPostControls.diamondSsaaEnabled,diamondPostControls.gemFxaaEnabled,diamondPostControls.diamondTaaEnabled].filter(Boolean).length} solicitados</span></div>
              </div>
              <p className="mt-2 border-t border-black/[.06] pt-2 text-[9px] leading-relaxed text-[#8a857b]">El BVH reemplaza el material físico en las mallas que procesa. Por eso Scintillation no debe contarse como activa simultáneamente en esas mismas mallas.</p>
            </section>
            <section className="mb-3 rounded-xl border border-[#e6e1d8] bg-white p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.12em] text-[#92743b]">Antialiasing del diamante</div>
              <p className="mb-3 text-[9px] leading-relaxed text-[#77756f]">Gem Mask protege el área del diamante. Durante el movimiento trabaja SSAA; al detener la cámara, TAA acumula muestras. FXAA puede refinar el borde al final.</p>
              {([
                {key:"gemMaskEnabled",label:"Gem Mask",description:"Máscara interna del diamante central; delimita el área donde puede trabajar FXAA sin modificar metal ni ambiente."},
                {key:"diamondSsaaEnabled",label:"SSAA",description:"Render auxiliar de mayor resolución para el diamante."},
                {key:"gemFxaaEnabled",label:"FXAA",description:"Suavizado selectivo del contorno del diamante, limitado por Gem Mask."},
                {key:"diamondTaaEnabled",label:"TAA",description:"Acumula muestras del diamante cuando la cámara está fija."},
              ] as const).map((item)=>{
                const enabled=diamondPostControls[item.key];
                const blocked=item.key!=="gemMaskEnabled"&&!diamondPostControls.gemMaskEnabled;
                const blockedMessage=item.key==="gemFxaaEnabled"?"Activa Gem Mask para habilitar FXAA.":item.key==="diamondSsaaEnabled"?"Activa Gem Mask para habilitar SSAA.":"Bloqueado hasta completar la validación independiente.";
                return <div key={item.key} className="flex items-center justify-between gap-3 border-t border-black/[.05] py-2 first:border-t-0 first:pt-0">
                  <div className="min-w-0"><div className="text-[11px] font-semibold text-[#292824]">{item.label}</div><p className="mt-0.5 text-[9px] leading-relaxed text-[#77756f]">{item.description}</p>{blocked&&<p className="mt-1 text-[9px] font-semibold text-amber-700">{blockedMessage}</p>}</div>
                  <button type="button" role="switch" aria-label={item.label} aria-checked={enabled} aria-disabled={blocked} disabled={blocked} title={blocked?blockedMessage:"Activar o desactivar "+item.label} onClick={()=>{if(blocked)return;const next=item.key==="gemMaskEnabled"?setAurumPostControls({gemMaskEnabled:!enabled}):item.key==="diamondSsaaEnabled"?setAurumPostControls({diamondSsaaEnabled:!enabled}):item.key==="gemFxaaEnabled"?setAurumPostControls({gemFxaaEnabled:!enabled}):setAurumPostControls({diamondTaaEnabled:!enabled});setDiamondPostControls(next);}} className={"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors "+(blocked?"cursor-not-allowed opacity-50 ":"")+(enabled?"bg-[#a88743]":"bg-[#c9c6bf")}><span className={"inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform "+(enabled?"translate-x-[18px]":"translate-x-1")}/></button>
                </div>;
              })}
              <div className="mt-2 border-t border-black/[.06] pt-2 text-[9px] leading-relaxed text-[#8a857b]">Cadena coordinada: Gem Mask limita el diamante; SSAA trabaja durante el movimiento; TAA acumula hasta 32 muestras con la cámara quieta y toma el relevo de SSAA; FXAA se aplica al final. Los metales y el entorno conservan la imagen base.</div>
            </section>
            <section className="rounded-xl border border-[#e6e1d8] bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-2"><div className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#92743b]">Diagnóstico de ejecución</div><button type="button" onClick={requestGemMaskDiagnostics} disabled={gemMaskDiagnosticStatus==="pending"} className="rounded-lg border border-black/10 px-2 py-1 text-[9px] font-semibold text-[#6d5523]">Actualizar</button></div>
              {diamondControlDiagnostics?.bvh?<>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div><strong className="text-base tabular-nums">{diamondControlDiagnostics.bvh.diamondMeshes??0}</strong><div className="text-[#77756f]">Diamantes BVH</div></div>
                  <div><strong className="text-base tabular-nums">{(diamondControlDiagnostics.bvh.diamondTriangleCount??0).toLocaleString("es-PE")}</strong><div className="text-[#77756f]">Triángulos BVH</div></div>
                  <div><strong className="text-base tabular-nums">{diamondControlDiagnostics.micro?.diamondMeshes??0}</strong><div className="text-[#77756f]">Mallas detectadas</div></div>
                  <div><strong className="text-base tabular-nums">{diamondControlDiagnostics.micro?.materialGroups??0}</strong><div className="text-[#77756f]">Grupos de material</div></div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 border-t border-black/[.06] pt-2 text-[10px]">
                  <div><strong className="text-sm tabular-nums">{diamondControlDiagnostics.gemMask?.diamondCandidates??0}</strong><div className="text-[#77756f]">Candidatos de máscara</div></div>
                  <div><strong className="text-sm tabular-nums">{diamondControlDiagnostics.gemMask?.cachedCenterMeshes??0}</strong><div className="text-[#77756f]">Diamantes centrales</div></div>
                  <div><strong className="text-sm tabular-nums">{diamondControlDiagnostics.gemMask?.maskPixels===null||diamondControlDiagnostics.gemMask?.maskPixels===undefined?"—":diamondControlDiagnostics.gemMask.maskPixels<0?"Error":diamondControlDiagnostics.gemMask.maskPixels.toLocaleString("es-PE")}</strong><div className="text-[#77756f]">Píxeles de máscara</div></div>
                  <div><strong className="text-sm tabular-nums">{diamondControlDiagnostics.gemMask?.maskCoveragePercent===null||diamondControlDiagnostics.gemMask?.maskCoveragePercent===undefined?"—":String(diamondControlDiagnostics.gemMask.maskCoveragePercent)+"%"}</strong><div className="text-[#77756f]">Cobertura GPU</div></div>
                </div>
                <div className="mt-2 text-[9px] text-[#77756f]">BVH diamante: {(diamondControlDiagnostics.bvh.diamondMeshes??0)>0?"activo":"sin entradas activas"} · Micro: {diamondControlDiagnostics.micro?.enabled?"activo":"inactivo"} · Máscara: {(diamondControlDiagnostics.gemMask?.cachedCenterMeshes??0)>0?"centro clasificado":"sin centro clasificado"}</div>
                <div className="mt-1 border-t border-black/[.06] pt-2 text-[9px] leading-relaxed text-[#6d5523]">Cadena AA real: Gem Mask {diamondControlDiagnostics.gemMask?.postModules?.gemMask?"activa":"inactiva"} · SSAA {diamondControlDiagnostics.gemMask?.postModules?.ssaa?"activo":"en espera"} · TAA {diamondControlDiagnostics.gemMask?.postModules?.taa?(diamondControlDiagnostics.gemMask.postModules.taaAccumulating?"acumulando muestras":"convergido"):"en espera"} · FXAA {diamondControlDiagnostics.gemMask?.postModules?.fxaa?"activo":"inactivo"}{diamondControlDiagnostics.gemMask?.postModules?.taa?" · muestra "+Math.max(0,diamondControlDiagnostics.gemMask.postModules.taaSampleIndex+1)+"/32":""}</div>
                <div className="mt-1 text-[9px] leading-relaxed text-[#8a857b]">{gemMaskDiagnosticStatus==="pending"?"Solicitando lectura GPU…":gemMaskDiagnosticStatus==="ready"?"Lectura GPU completada.":gemMaskDiagnosticStatus==="error"?"La lectura GPU falló; revisa la consola WebGL.":gemMaskDiagnosticStatus==="unavailable"?"El pase Gem Mask todavía no está inicializado.":!diamondPostControls.gemMaskEnabled?"Activa Gem Mask para solicitar la lectura GPU.":"Pulsa Actualizar para solicitar una lectura GPU puntual. No se ejecuta en cada fotograma."}</div>
              </>:<p className="text-[10px] text-[#8a857b]">{archivo?"Runtime aún no disponible o pendiente de inicialización. Pulsa Actualizar tras cargar el modelo.":"Carga un modelo para consultar los sistemas en ejecución."}</p>}
            </section>
          </div>}
          {uxSection==="cad-tree"&&<div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/[.06] bg-white/70 px-3 py-2">
            <span className="px-1 text-[10px] font-semibold uppercase tracking-[.12em] text-[#92743b]">Árbol CAD</span>
            <button type="button" onClick={()=>setUxSection("ambientes")} className="rounded-lg border border-black/[.08] bg-white px-2.5 py-2 text-[10px] font-semibold text-[#77756f] hover:bg-[#f8f6f0]">Biblioteca</button>
          </div>}
          {uxSection==="cad-tree"&&<div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [scrollbar-width:thin] bg-[#f9f8f5] px-3 py-3">
            <div className="mb-3 flex items-start justify-between gap-2"><div><div className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#92743b]">AURUM CAD</div><h2 className="mt-1 text-base font-semibold">Estructura del modelo</h2><p className="mt-1 text-[10px] text-[#77756f]">{archivo?.name??"Sin modelo cargado"}</p></div><button type="button" onClick={refreshCadTree} disabled={!archivo} className="rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[10px] font-semibold text-[#6d5523] disabled:opacity-40">Actualizar</button></div>
            {cadModelDiagnostics&&<section className="mb-3 rounded-xl border border-[#b99b5d]/30 bg-white p-3">
              <div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#92743b]">Diagnóstico geométrico</span><span className={"rounded-full px-2 py-0.5 text-[9px] font-semibold "+(cadModelDiagnostics.meshes>0||cadModelDiagnostics.curves>0||cadModelDiagnostics.points>0?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700")}>{cadModelDiagnostics.meshes>0||cadModelDiagnostics.curves>0||cadModelDiagnostics.points>0?"Geometría detectada":"Sin geometría"}</span></div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div><strong className="text-sm tabular-nums">{cadModelDiagnostics.meshes}</strong><div className="text-[#77756f]">Mallas</div></div>
                <div><strong className="text-sm tabular-nums">{cadModelDiagnostics.triangles.toLocaleString("es-PE")}</strong><div className="text-[#77756f]">Triángulos</div></div>
                <div><strong className="text-sm tabular-nums">{cadModelDiagnostics.visibleMeshes}/{cadModelDiagnostics.meshes}</strong><div className="text-[#77756f]">Mallas visibles</div></div>
                <div><strong className="text-sm tabular-nums">{cadModelDiagnostics.curves+cadModelDiagnostics.points}</strong><div className="text-[#77756f]">Curvas y puntos</div></div>
              </div>
              <div className="mt-2 border-t border-black/[.06] pt-2 text-[9px] text-[#77756f]">Dimensiones: {cadModelDiagnostics.bounds.x.toFixed(2)} × {cadModelDiagnostics.bounds.y.toFixed(2)} × {cadModelDiagnostics.bounds.z.toFixed(2)} unidades</div>
            </section>}
            <div className="mb-3 grid grid-cols-3 gap-1.5">
              <div className="rounded-lg border border-black/[.07] bg-white p-2"><div className="text-lg font-semibold tabular-nums">{cadTreeItems.length}</div><div className="text-[9px] text-[#77756f]">Objetos</div></div>
              <div className="rounded-lg border border-black/[.07] bg-white p-2"><div className="text-lg font-semibold tabular-nums">{cadTreeItems.filter(x=>x.visible).length}</div><div className="text-[9px] text-[#77756f]">Visibles</div></div>
              <div className="rounded-lg border border-black/[.07] bg-white p-2"><div className="text-lg font-semibold tabular-nums">{new Set(cadTreeItems.map(x=>x.layer)).size}</div><div className="text-[9px] text-[#77756f]">Capas</div></div>
            </div>
            {!archivo?<div className="grid flex-1 place-items-center text-center text-xs text-[#8a857b]">Carga un modelo para explorar su estructura CAD.</div>:cadTreeItems.length===0?<div className="grid flex-1 place-items-center text-center text-xs text-[#8a857b]">No se encontraron objetos CAD con metadatos. Pulsa Actualizar después de cargar el modelo.</div>:<div className="flex-none space-y-3 pr-1">
              {Array.from(new Set(cadTreeItems.map(x=>x.layer))).map(layer=><section key={layer} className="overflow-hidden rounded-xl border border-black/[.07] bg-white">
                <div className="flex items-center justify-between gap-2 border-b border-black/[.06] bg-[#f3f1eb] px-2.5 py-2"><div className="min-w-0 truncate text-[10px] font-semibold text-[#5e4a22]">{layer}</div><button type="button" onClick={()=>{const next=!cadTreeItems.filter(x=>x.layer===layer).every(x=>x.visible);apiRef.current?.setCadLayerVisible?.(layer,next);refreshCadTree();}} className="shrink-0 rounded-md border border-black/10 bg-white px-2 py-1 text-[9px] font-semibold text-[#6d5523]">Mostrar / ocultar</button></div>
                <div className="divide-y divide-black/[.045]">{cadTreeItems.filter(x=>x.layer===layer).map(item=><div key={item.uuid} className="flex items-center gap-2 px-2.5 py-2"><span className="grid size-6 shrink-0 place-items-center rounded-md bg-[#f1efe9] text-[9px] font-bold text-[#8a7547]">{item.type==="Curve"?"C":item.type==="Brep"?"B":item.type==="Mesh"?"M":"·"}</span><div className="min-w-0 flex-1"><div className="truncate text-[10px] font-medium text-[#45433e]">{item.name}</div><div className="text-[9px] text-[#99968d]">{item.type}{item.sourceId?" · Rhino ID":""}</div></div><button type="button" role="switch" aria-checked={item.visible} aria-label={(item.visible?"Ocultar ":"Mostrar ")+item.name} onClick={()=>{apiRef.current?.setCadObjectVisible?.(item.uuid,!item.visible);refreshCadTree();}} className={"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors "+(item.visible?"bg-[#a88743]":"bg-[#c9c6bf]")}><span className={"inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform "+(item.visible?"translate-x-[18px]":"translate-x-1")}/></button></div>)}</div>
              </section>)}
            </div>}
            <p className="mt-3 border-t border-black/[.06] pt-2 text-[9px] leading-relaxed text-[#8a857b]">La visibilidad no elimina objetos ni geometría. Los cambios afectan únicamente a la escena cargada.</p>
          </div>}
          {uxSection==="positions"&&<AurumPositionsPanel api={apiRef.current} hasModel={Boolean(archivo)} onClose={()=>setUxSection("ambientes")}/>}
           {uxSection==="rhino-export"&&<div className="relative z-20 flex h-full min-h-0 w-full min-w-0 flex-col overflow-y-auto bg-[#f9f8f5] px-3 py-3">
            <div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#92743b]">AURUM CAD</div><h2 className="mt-1 text-base font-semibold text-[#292824]">Exportación Rhinoceros</h2><p className="mt-1 text-[11px] leading-relaxed text-[#77756f]">Exporta la geometría del GLB que está cargado actualmente en el visor.</p></div><button type="button" title="Volver a la biblioteca" aria-label="Volver a la biblioteca" onClick={()=>setUxSection("ambientes")} className="rounded-lg p-1.5 text-[#77756f] hover:bg-black/[.05]"><X className="size-4"/></button></div>
            <div className="mb-3 rounded-xl border border-[#e6e1d8] bg-white p-3"><div className="flex items-center gap-2"><Gem className="size-4 text-[#92743b]"/><span className="text-xs font-semibold text-[#292824]">Modelo del visor</span></div><p className="mt-1 truncate text-[11px] text-[#77756f]">{archivo?.name??(archivo?"Modelo cargado":"No hay un archivo cargado")}</p>{!archivo&&<p className="mt-2 text-[10px] text-[#9a7832]">Carga una joya en el visor para habilitar la exportación.</p>}</div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#77756f]">Formato 3DM</div>
            <div className="flex flex-col gap-2">
              <div className="rounded-xl border border-[#b99642]/60 bg-[#f4efe5] p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-[#5e4a22]">Rhino 3DM · Malla</span><span className="rounded-full bg-[#e8ddc4] px-2 py-0.5 text-[9px] font-semibold text-[#725821]">Disponible</span></div><p className="mt-1 text-[10px] leading-relaxed text-[#766b55]">Conserva los vértices, triángulos, transformaciones y nombres de las mallas visibles del GLB.</p></div>
              <div className="rounded-xl border border-[#b99642]/60 bg-[#f4efe5] p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-[#5e4a22]">Rhino 3DM · Superficies NURBS</span><span className="rounded-full bg-[#e8ddc4] px-2 py-0.5 text-[9px] font-semibold text-[#725821]">Prueba disponible</span></div><p className="mt-1 text-[10px] leading-relaxed text-[#766b55]">Conversión tipo MeshToNURB: crea una superficie NURBS planar por cada triángulo. Mantiene la forma facetada; no reconstruye superficies suaves.</p></div>
              <div className="rounded-xl border border-black/[.08] bg-white/60 p-3 opacity-65"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-[#55534d]">Rhino 3DM · BREP</span><span className="rounded-full bg-[#efede8] px-2 py-0.5 text-[9px] text-[#77756f]">Fase CAD</span></div><p className="mt-1 text-[10px] leading-relaxed text-[#77756f]">Requiere reconstrucción y validación de caras, aristas y sólidos cerrados; no equivale a envolver una malla.</p></div>
            </div>
            {rhinoExportReport&&<div role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-[10px] leading-relaxed text-emerald-900">{rhinoExportReport}<p className="mt-1">Los sólidos cerrados se cuentan solo cuando Rhino confirma isSolid; el resto son BREP facetados abiertos o no-manifold.</p></div>}{rhinoExportError&&<div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-[10px] leading-relaxed text-red-800">{rhinoExportError}</div>}
            <div className="mt-auto flex flex-col gap-2 pt-4"><button type="button" disabled={!archivo||rhinoExportBusy} onClick={async()=>{setRhinoExportBusy(true);setRhinoExportError(null);try{const report=await apiRef.current?.exportRhinoNurbs3dm();if(report)setRhinoExportReport(`Exportado: ${report.brepCount} objetos BREP · ${report.surfaceCount.toLocaleString("es-ES")} caras · ${report.solidCount} sólidos cerrados · ${report.manifoldCount} manifold · ${report.closedMeshCount} mallas cerradas · reducción ${report.reductionPercent}% (${report.quality}).`);}catch(error){setRhinoExportError(error instanceof Error?error.message:"No se pudieron generar las superficies NURBS.");}finally{setRhinoExportBusy(false);}}} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#d4af37] px-3 py-3 text-xs font-semibold text-[#292824] shadow-sm transition hover:bg-[#e1bf50] disabled:cursor-not-allowed disabled:opacity-45">{rhinoExportBusy?<><RotateCw className="size-4 animate-spin"/>Generando NURBS…</>:<><Download className="size-4"/>Exportar superficies NURBS .3dm</>}</button><button type="button" disabled={!archivo||rhinoExportBusy} onClick={async()=>{setRhinoExportBusy(true);setRhinoExportError(null);try{await apiRef.current?.exportRhino3dm();}catch(error){setRhinoExportError(error instanceof Error?error.message:"No se pudo generar el archivo 3DM.");}finally{setRhinoExportBusy(false);}}} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#c9b989] bg-white px-3 py-2.5 text-xs font-semibold text-[#5e4a22] transition hover:bg-[#f8f4ea] disabled:cursor-not-allowed disabled:opacity-45"><Download className="size-4"/>Exportar malla .3dm</button><p className="text-[9px] leading-relaxed text-[#8a857b]">BREP facetado: una cara planar por triángulo. El informe distingue sólidos cerrados, topología manifold y mallas cerradas; no reconstruye superficies CAD suaves. Límite: 25.000 caras.</p></div>
          </div>}
          {uxSection!=="rhino-export"&&uxSection!=="cad-tree"&&uxSection!=="positions"&&uxSection!=="diamond-control"&&<div className="h-full overflow-y-auto">
            <section className="px-4 py-1">


              {uxSection==="materiales"&&<div className="pt-3 pb-5">
                <label className="mb-3 flex h-9 items-center gap-2 rounded-xl border border-black/[.08] bg-white px-3 text-[#77756f] focus-within:border-[#92743b]/50"><ImageIcon className="size-3.5 shrink-0"/><input value={busquedaMateriales} onChange={e=>setBusquedaMateriales(e.target.value)} placeholder="Buscar material o acabado…" className="min-w-0 flex-1 bg-transparent text-xs text-[#292824] outline-none placeholder:text-[#99968d]"/></label>
                <div className="mb-2 grid grid-cols-3 gap-1.5" role="group" aria-label="Familias principales de materiales">{familiasMateriales.map(familia=><button key={familia} type="button" onClick={()=>{setFamiliaMaterialActiva(familia);setAcabadoMaterialActivo("Todos");}} aria-pressed={familiaMaterialActiva===familia} className={"min-w-0 rounded-xl border px-2 py-2 text-[11px] font-semibold transition "+(familiaMaterialActiva===familia?"border-[#b99642]/55 bg-[#b99642]/12 text-[#6d5523] shadow-[0_2px_8px_rgba(50,42,20,.06)]":"border-black/[.07] bg-white/65 text-[#77756f] hover:border-[#d8d1c2] hover:bg-white")}><span className="block truncate">{familia==="Todas"?"Predeterminados":familia}</span><span className="mt-0.5 block text-[9px] font-normal opacity-70">{familia==="Todas"?9:MATERIALES.filter(m=>familiaPrincipalMaterial(m.grupo)===familia).length} {familia==="Todas"?"predeterminados":"materiales"}</span></button>)}</div>
                {familiaMaterialActiva==="Oro"&&<div className="mb-2 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Colores del oro">{filtrosColorOro.map(filtro=><button key={filtro.grupo} type="button" onClick={()=>setAcabadoMaterialActivo(acabadoMaterialActivo===filtro.grupo?"Todos":filtro.grupo)} aria-pressed={acabadoMaterialActivo===filtro.grupo} className={"shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-medium transition "+(acabadoMaterialActivo===filtro.grupo?"border-[#b99642]/60 bg-[#b99642]/15 text-[#6d5523]":"border-black/10 bg-white/50 text-[#77756f] hover:bg-white")}>{filtro.label}</button>)}</div>}
                <div className="mb-2 flex items-center justify-between gap-2"><div className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#77756f]">{familiaMaterialActiva==="Todas"?"Selección de materiales":familiaMaterialActiva+" · "+materialesVisibles.length+" disponibles"}</div><span className="text-[9px] text-[#99968d]">Muestras de acabado</span></div>
                <div className="mb-3 rounded-xl border border-[#e6e1d8] bg-white p-2.5">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.12em] text-[#77756f]">Aplicar acabado a</div>
                  <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Alcance de aplicación del material">
                    <button type="button" aria-pressed={!materialAplicarTodos} onClick={()=>setMaterialAplicarTodos(false)} className={"rounded-lg border px-2 py-2 text-[10px] font-semibold transition "+(!materialAplicarTodos?"border-[#b99642]/60 bg-[#f4efe5] text-[#6d5523]":"border-black/[.08] bg-white text-[#77756f] hover:bg-[#f8f6f0]")}>Pieza seleccionada</button>
                    <button type="button" aria-pressed={materialAplicarTodos} onClick={()=>setMaterialAplicarTodos(true)} className={"rounded-lg border px-2 py-2 text-[10px] font-semibold transition "+(materialAplicarTodos?"border-[#b99642]/60 bg-[#f4efe5] text-[#6d5523]":"border-black/[.08] bg-white text-[#77756f] hover:bg-[#f8f6f0]")}>Todo el modelo</button>
                  </div>
                  <p className="mt-2 text-[9px] leading-relaxed text-[#8a857b]">{materialAplicarTodos?"El acabado se aplicará a todas las piezas metálicas y objetos clasificados como otros; las gemas se conservarán.":"Selecciona primero una pieza metálica en el visor. El acabado se aplicará a esa pieza y a los elementos que compartan su capa CAD."}</p>
                </div>
                <div className="grid grid-cols-4 gap-2.5 pb-1">
                  {materialesVisibles.map(m=><button key={m.id} type="button" title={m.nombre} aria-label={m.nombre}
                    onClick={()=>{setBibliotecaTipo("metales");setMaterialId(m.id);apiRef.current?.material(m,materialAplicarTodos)}}
                    className={"group relative flex flex-col items-center rounded-2xl border p-2.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b99642]/45 "+(materialId===m.id?"border-[#b99642]/60 bg-white shadow-[0_4px_14px_rgba(50,42,20,.10)]":"border-transparent bg-white/25 hover:border-[#d8d1c2] hover:bg-white/85")}>
                    <span className={"relative grid size-14 place-items-center rounded-full border transition "+(materialId===m.id?"border-[#b99642] shadow-[0_0_0_3px_rgba(185,150,66,.10)]":"border-black/10 group-hover:border-black/20")}>
                      <span className={"size-12 rounded-full "+(m.metalness<.5?"shadow-[inset_-3px_-4px_7px_rgba(70,0,0,.20),inset_3px_3px_7px_rgba(255,255,255,.24),0_2px_5px_rgba(0,0,0,.18)]":"shadow-[inset_-5px_-6px_9px_rgba(0,0,0,.45),inset_5px_4px_8px_rgba(255,255,255,.35),0_3px_8px_rgba(0,0,0,.45)]")}
                        style={{background:m.metalness<.5?`radial-gradient(ellipse at 32% 24%,rgba(255,255,255,.42) 0%,rgba(255,255,255,.16) 18%,transparent 42%),radial-gradient(ellipse at 72% 78%,rgba(70,0,0,.16) 0%,transparent 52%),linear-gradient(145deg,rgba(255,255,255,.12),rgba(70,0,0,.10)),${hexColor(m.color)}`:`radial-gradient(ellipse at 30% 23%,rgba(255,255,255,.82) 0%,rgba(255,255,255,.34) 9%,rgba(255,255,255,.08) 22%,transparent 36%),radial-gradient(ellipse at 76% 78%,rgba(0,0,0,.48) 0%,rgba(0,0,0,.20) 24%,transparent 48%),linear-gradient(145deg,rgba(255,255,255,.34) 0%,rgba(255,255,255,.06) 34%,rgba(0,0,0,.10) 62%,rgba(0,0,0,.34) 100%),${hexColor(m.color)}`}}/>
                    </span>
                    {materialId===m.id&&<span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-[#92743b] text-[9px] font-bold text-white shadow-sm" aria-label="Material seleccionado">✓</span>}
                    <span className="mt-2.5 w-full truncate text-center text-[11px] font-medium leading-tight text-[#45433e]">{m.nombre}</span>
                  </button>)}
                </div>
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-black/10 bg-black/[.02] p-2">
                  <span className="size-8 shrink-0 rounded-full border border-black/15 shadow-inner" style={{background:hexColor(materialActivo.color)}}/>
                  <p className="truncate text-[10px] text-[#55534d]">{materialActivo.nombre}</p>
                </div>
              </div>}
              {uxSection==="gemas"&&<div className="pt-3 pb-5">
                <label className="mb-3 flex h-9 items-center gap-2 rounded-xl border border-black/[.08] bg-white px-3 text-[#77756f] focus-within:border-[#92743b]/50"><Gem className="size-3.5 shrink-0"/><input value={busquedaGemas} onChange={e=>{setBusquedaGemas(e.target.value);if(e.target.value.trim())setMostrarTodasGemas(true);}} placeholder="Buscar gema por nombre…" className="min-w-0 flex-1 bg-transparent text-xs text-[#292824] outline-none placeholder:text-[#99968d]"/></label>
                <div className="mb-2 flex items-center justify-between gap-2"><div className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#77756f]">Explorar por familia</div><span className="text-[9px] text-[#99968d]">{GEMAS.length} perfiles</span></div>
                <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]" role="group" aria-label="Familias de gemas">
                  {familiasGemas.map(familia=><button key={familia} type="button" onClick={()=>{setFamiliaGemaActiva(familia);setMostrarTodasGemas(familia!=="Predeterminadas");if(familia==="Predeterminadas")setBusquedaGemas("");}} aria-pressed={familiaGemaActiva===familia} className={"shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition "+(familiaGemaActiva===familia?"border-[#b99642]/65 bg-[#b99642]/15 text-[#6d5523] shadow-sm":"border-black/[.08] bg-white/75 text-[#77756f] hover:border-[#d8d1c2] hover:bg-white")}><span>{familia==="Predeterminadas"?"Predeterminadas":familia}</span><span className="ml-1.5 text-[9px] font-normal opacity-70">{familia==="Predeterminadas"?9:conteoGemasPorFamilia[familia]??0}</span></button>)}
                </div>
                <div className="mb-2 flex items-center justify-between gap-2"><div className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[.12em] text-[#77756f]">{busquedaGemas.trim() ? `Resultados: ${busquedaGemas.trim()}` : familiaGemaActiva==="Predeterminadas"?"Gemas predeterminadas":familiaGemaActiva+" · "+GEMAS.filter(g=>g.familia===familiaGemaActiva).length+" disponibles"}</div><span className="shrink-0 text-[9px] text-[#99968d]">{gemasVisibles.length} visibles</span></div>
                <div className="grid grid-cols-4 gap-2.5 pb-1">
                  {gemasVisibles.map(g=><button key={g.id} type="button" title={g.nombre} aria-label={g.nombre}
                    onClick={()=>{
                      setBibliotecaTipo("gemas");
                      setGemaId(g.id);
                      const hasSelectedGemTarget = parteSeleccionadaCategoria !== "metal" && Boolean(parteSeleccionada);
                      if (hasSelectedGemTarget && typeof apiRef.current?.gema === "function") {
                        // Changing the catalog choice updates the already-selected
                        // gemstone immediately; no second click on the 3D model.
                        pendingGemApplicationRef.current = null;
                        apiRef.current.gema(g);
                      } else {
                        // If no gemstone is selected yet, arm the choice for the
                        // next explicit click on a gemstone in the viewport.
                        pendingGemApplicationRef.current = g;
                      }
                    }}
                    className={"group relative flex flex-col items-center rounded-2xl border p-2.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b99642]/45 "+(gemaId===g.id?"border-[#b99642]/60 bg-white shadow-[0_4px_14px_rgba(50,42,20,.10)]":"border-transparent bg-white/25 hover:border-[#d8d1c2] hover:bg-white/85")}>
                    <span className={"relative grid size-14 place-items-center rounded-full border transition "+(gemaId===g.id?"border-[#b99642] shadow-[0_0_0_3px_rgba(185,150,66,.10)]":"border-black/10 group-hover:border-black/20")}>
                      <span className="relative size-12 overflow-hidden rounded-full shadow-[inset_-4px_-5px_9px_rgba(0,0,0,.5),inset_4px_3px_8px_rgba(255,255,255,.28),0_3px_8px_rgba(0,0,0,.5)]"
                        style={{background:`radial-gradient(circle at 30% 24%,rgba(255,255,255,.82) 0 5%,rgba(255,255,255,.18) 12%,transparent 28%),conic-gradient(from 20deg,rgba(255,255,255,.28),transparent 12%,rgba(0,0,0,.18) 25%,rgba(255,255,255,.22) 38%,transparent 52%,rgba(0,0,0,.2) 67%,rgba(255,255,255,.24) 82%,transparent),${hexColor(g.color)}`}}/>
                    </span>
                    {gemaId===g.id&&<span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-[#92743b] text-[9px] font-bold text-white shadow-sm" aria-label="Gema seleccionada">✓</span>}
                    <span className="mt-2.5 w-full truncate text-center text-[11px] font-medium leading-tight text-[#45433e]">{g.nombre}</span>
                  </button>)}
                </div>
                <button type="button" aria-expanded={mostrarTodasGemas} onClick={()=>setMostrarTodasGemas(v=>!v)} className="mt-3 w-full rounded-lg border border-black/10 bg-black/[.025] px-3 py-2 text-[10px] font-semibold text-[#55534d] transition hover:border-[#92743b]/45 hover:text-[#292824]">
                  {mostrarTodasGemas ? "Mostrar menos gemas" : `Ver más gemas (${familiaGemaActiva==="Predeterminadas"?GEMAS.length:GEMAS.filter(g=>g.familia===familiaGemaActiva).length})`}
                </button>
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-black/10 bg-black/[.02] p-2">
                  <span className="size-8 shrink-0 rounded-full border border-black/15 shadow-inner" style={{background:hexColor(gemaActiva.color)}}/>
                  <p className="truncate text-[10px] text-[#55534d]">{gemaActiva.nombre}</p>
                </div>
              </div>}
              {uxSection==="ambientes"&&<div className="space-y-3 pb-5">
                <div className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-[.14em] text-[#92743b]">Ambientes HDR · {Object.keys(AURUM_AMBIENT_PRESETS).length}</div>
                <div className="grid grid-cols-2 gap-2.5">
                  {Object.values(AURUM_AMBIENT_PRESETS).map(preset=><button key={preset.id} type="button" aria-pressed={ambienteId===preset.id} onClick={()=>apiRef.current?.ambiente(preset.id)} className={"group min-w-0 text-center "+(ambienteId===preset.id?"text-[#292824]":"text-[#45433e]")}>
                    <span className={"relative block aspect-[4/3] overflow-hidden rounded-xl border transition "+(ambienteId===preset.id?"border-[#b99642] shadow-[0_0_14px_rgba(185,150,66,.18)]":"border-transparent group-hover:border-[#d8d1c2]")}>
                      <span className={"block h-full w-full "+preset.previewClass}/>
                      {ambienteId===preset.id&&<span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-[#92743b] text-[10px] font-bold text-white">✓</span>}
                    </span>
                    <span className="mt-2 block text-[10px] leading-tight">{preset.name}</span>
                  </button>)}
                </div>
                <p className="mt-2 px-1 text-[10px] leading-relaxed text-[#77756f]">Ambientes combinados: HDR de metales y gemas independientes de la escena y de los materiales.</p>
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
                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.12em] text-[#92743b]">Entornos HDR de gemas · comparar piedras</div>
                <div className="grid grid-cols-1 gap-2.5">
                  {Object.values(AURUM_GEM_ENVIRONMENT_PRESETS).filter((preset)=>preset.id==="gemUserHdr"||preset.id.startsWith("gemLibrary")).map((preset,index)=>{
                    return <button key={preset.id} type="button" title={preset.name} aria-label={preset.name} aria-pressed={gemHdriId===preset.id} onClick={()=>apiRef.current?.gemHdri(preset.id)} className={"group min-w-0 text-left "+(gemHdriId===preset.id?"text-[#292824]":"text-[#45433e]")}>
                      <span className={"relative mb-1.5 block aspect-[16/5] overflow-hidden rounded-xl border transition "+(gemHdriId===preset.id?"border-[#92743b] shadow-[0_0_12px_rgba(146,116,59,.18)]":"border-[#d8d1c2] group-hover:border-[#92743b]")}>
                        <span className="absolute inset-0" style={{background:"radial-gradient(ellipse at 50% 20%,#fffdf4 0%,#e9dfc5 22%,#9da3a6 48%,#4c5359 72%,#171b20 100%)"}}/>
                        <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent"/>
                        <span className="absolute left-2 top-2 rounded-md border border-white/35 bg-black/25 px-1.5 py-0.5 text-[8px] font-semibold text-white">EXR · HDR</span>
                        {gemHdriId===preset.id&&<span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-[#92743b] text-[10px] text-white">✓</span>}
                        <span className="absolute inset-x-0 bottom-2 text-center text-[9px] font-medium tracking-wide text-white drop-shadow">{String(index+1).padStart(2,"0")} · HDR DE GEMAS</span>
                      </span>
                      <span className="block truncate text-[10px]">{preset.name}</span>
                    </button>;
                  })}
                </div>
                </div>
              </div>}
              {uxSection==="escenas"&&<div className="space-y-4 pb-5">
                <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#92743b]"><span>Escenas de estudio · {ESCENARIOS.length}</span><span className="font-normal tracking-normal text-[#858178]">12 perfiles</span></div>
                <div className="grid grid-cols-2 gap-2.5">
                  {ESCENARIOS.filter(e=>e.activo).map(e=><button key={e.id} type="button" aria-pressed={escenarioId===e.id} title={e.descripcion} onClick={()=>{setEscenarioId(e.id);apiRef.current?.escenario(e.id);}} className={"group min-w-0 text-left "+(escenarioId===e.id?"text-[#292824]":"text-[#45433e]")}>
                    <span className={"relative block aspect-[4/3] overflow-hidden rounded-xl border transition "+(escenarioId===e.id?"border-[#b08d42] shadow-[0_0_14px_rgba(176,141,66,.20)]":"border-transparent group-hover:border-[#d8d1c2]")}><span className={"block h-full w-full "+e.clase}/><span className="absolute left-1.5 top-1.5 rounded-md border border-white/50 bg-black/35 px-1.5 py-0.5 text-[8px] font-semibold text-white">VJSON {e.numero}</span><span className="absolute bottom-1.5 left-1.5 rounded-md bg-white/85 px-1.5 py-0.5 text-[8px] font-semibold text-[#625331]">PERFIL {e.horneado}</span>{escenarioId===e.id&&<span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-[#b08d42] text-[10px] text-white">✓</span>}</span>
                    <span className="mt-2 block text-[10px] leading-tight">Escena {String(e.numero).padStart(2,"0")}</span>
                  </button>)}
                </div>
                <p className="px-1 text-[10px] leading-relaxed text-[#77756f]">Cada tarjeta conserva su rotación de entorno y acabado de suelo. Cada escena aplica cámara y rotación de ambos entornos. A/B ajusta resolución, radio y bias de la sombra dinámica compatible; el horneado original y sus reflejos aún no se reproducen.</p>
              </div>}
              {uxSection==="fondos"&&<div className="space-y-3 pb-5">
                <div className="rounded-xl border border-[#92743b]/20 bg-white/75 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#45433e]">Mostrar suelo</div>
                      <p className="mt-1 text-[10px] leading-relaxed text-[#77756f]">Activa o desactiva el plano del estudio y su sombra de contacto.</p>
                    </div>
                    <button type="button" role="switch" aria-checked={sueloVisible} aria-label="Mostrar suelo"
                      onClick={() => {
                        const next = !sueloVisible;
                        setSueloVisible(next);
                        setSombraContactoVisible(next);
                        apiRef.current?.sueloVisible?.(next);
                        apiRef.current?.sombraContacto?.(next);
                      }}
                      className={"relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b99642]/60 " + (sueloVisible ? "bg-[#a88743]" : "bg-[#c9c6bf]")}>
                      <span className={"inline-block size-4 rounded-full bg-white shadow-sm transition-transform " + (sueloVisible ? "translate-x-6" : "translate-x-1")} />
                    </button>
                  </div>
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#92743b]">Fondo de presentación</div>
                {[{id:"escena",label:"Según la escena",swatch:"linear-gradient(135deg,#fff,#e9e7df)"},{id:"estudioFotografico",label:"Estudio fotográfico",swatch:'url("https://packs.ijewel3d.com/files/bg_1_d37cf7c1d8.jpg") center / cover no-repeat'},{id:"auroraBlue",label:"Aurora Blue",swatch:"radial-gradient(ellipse at 0% 28%,#ff9770 0%,#f2b5a7 38%,transparent 72%),linear-gradient(125deg,#f2b5a7 0%,#b7b1d3 42%,#0751a8 100%)"},{id:"degradadoGrisBlanco",label:"Degradado gris a blanco",swatch:"linear-gradient(135deg,#ffffff 0%,#eeeeec 48%,#bfc1c0 100%)"},{id:"blanco",label:"Blanco puro",swatch:"#ffffff"},{id:"marfil",label:"Marfil cálido",swatch:"#f4f1e9"},{id:"grisClaro",label:"Gris claro",swatch:"#e7e7e4"},{id:"grisMedio",label:"Gris medio",swatch:"#a6a6a3"},{id:"grisOscuro",label:"Gris oscuro",swatch:"#303236"},{id:"negro",label:"Negro",swatch:"#090b0e"},{id:"transparente",label:"Transparente",swatch:"linear-gradient(45deg,#ddd 25%,transparent 25%,transparent 75%,#ddd 75%),linear-gradient(45deg,#ddd 25%,#fff 25%,#fff 75%,#ddd 75%)"}].map(bg=><button key={bg.id} type="button" onClick={()=>apiRef.current?.fondo(bg.id)} className={"flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition "+(fondoId===bg.id?"border-[#92743b]/50 bg-white shadow-sm":"border-black/[.07] bg-white/60 hover:bg-white")}><span className="size-8 shrink-0 rounded-lg border border-black/10" style={{background:bg.swatch}}/><span className="flex-1 text-xs text-[#45433e]">{bg.label}</span>{fondoId===bg.id&&<span className="text-xs font-semibold text-[#92743b]">✓</span>}</button>)}
                <p className="px-1 text-[10px] leading-relaxed text-[#77756f]">Cambiar el fondo no modifica los HDR ni los perfiles de materiales.</p>
              </div>}
            </section>
          </div>}
        </aside>

        <main className={"relative min-w-0 flex-1 overflow-hidden bg-[#090b0e] " + (embedded ? "rounded-none" : "rounded-2xl")}>
          <div
            ref={visorRef}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            style={isViewerFullscreen ? {
              position: "fixed",
              inset: 0,
              width: "100vw",
              height: "100dvh",
              zIndex: 9999,
            } : undefined}
          >
            <AurumPerformanceIndicator
              renderer={performanceRenderer}
              monitor={performanceMonitorRef.current}
              onClick={() => setPerformanceOpen((value) => !value)}
              expanded={performanceOpen}
            />
            <AurumPerformanceMonitorPanel open={performanceOpen} onClose={() => setPerformanceOpen(false)} renderer={performanceRenderer} monitor={performanceMonitorRef.current}/>
            {arrastrandoArchivo && !embedded && <div className="pointer-events-none absolute inset-3 z-[60] grid place-items-center rounded-2xl border border-dashed border-[#d4af37]/80 bg-[#090b0e]/88 text-center shadow-[inset_0_0_90px_rgba(212,175,55,.12),0_18px_55px_rgba(0,0,0,.22)] backdrop-blur-md" aria-live="polite">
              <div className="px-6 py-8">
                <span className="mx-auto grid size-[72px] place-items-center rounded-full border border-[#d4af37]/45 bg-gradient-to-br from-[#d4af37]/15 to-transparent text-[#e3bd55] shadow-[0_0_35px_rgba(212,175,55,.12)]"><Upload className="size-7"/></span>
                <h2 className="mt-5 text-lg font-semibold tracking-tight text-white">Suelta para abrir</h2>
                <p className="mt-2 text-[10px] font-medium uppercase tracking-[.2em] text-white/45">STL · OBJ · GLB · FBX · 3DM</p>
              </div>
            </div>}
            {!embedded&&!archivo&&!cargando&&<div className="absolute inset-0 z-10 grid place-items-center overflow-hidden bg-[#f4f1e9] px-6 py-10 text-center">
              <div className="pointer-events-none absolute inset-0" style={{background:"radial-gradient(ellipse at 50% 42%, rgba(212,175,55,.16) 0%, rgba(212,175,55,.055) 30%, transparent 66%), linear-gradient(145deg,#fbfaf7 0%,#f1eee7 54%,#eae6dc 100%)"}}/>
              <div className="pointer-events-none absolute inset-5 rounded-[26px] border border-[#b9a77d]/25"/>
              <div className="pointer-events-none absolute inset-x-[18%] top-1/2 h-px bg-gradient-to-r from-transparent via-[#b99642]/25 to-transparent"/>
              <div className="relative z-10 flex w-full max-w-md flex-col items-center">
                <div className="mb-7 grid size-[92px] place-items-center rounded-[28px] border border-[#b99642]/35 bg-gradient-to-br from-white/95 to-[#eee7d8]/80 text-[#a88435] shadow-[0_12px_38px_rgba(80,65,35,.10),0_0_32px_rgba(212,175,55,.10)] transition duration-300">
                  <Upload className="size-9 stroke-[1.5]"/>
                </div>
                <p className="text-[9px] font-semibold uppercase tracking-[.34em] text-[#92743b]">AURUM RENDER · STUDIO</p>
                <h2 className="mt-3 text-[25px] font-semibold tracking-[-.035em] text-[#292824]">Tu próximo diseño empieza aquí</h2>
                <p className="mt-2 max-w-xs text-[12px] leading-relaxed text-[#77756f]">Abre un modelo 3D y prepáralo en tu espacio de trabajo.</p>
                <input ref={fileRef} type="file" accept=".stl,.obj,.glb,.fbx,.3dm" className="hidden" onChange={(e)=>{const file=e.target.files?.[0];if(file)cargarArchivo(file)}}/>
                <button type="button" onClick={()=>fileRef.current?.click()} className="mt-7 inline-flex items-center gap-2.5 rounded-xl border border-[#e0b94e]/70 bg-gradient-to-b from-[#e0bd55] to-[#c69b2e] px-7 py-3 text-[11px] font-bold uppercase tracking-[.12em] text-[#17140c] shadow-[0_8px_28px_rgba(0,0,0,.28),0_0_24px_rgba(212,175,55,.12)] transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0">
                  <Upload className="size-4"/> Seleccionar archivo
                </button>
                <p className="mt-5 text-[9px] font-medium uppercase tracking-[.2em] text-[#8a857b]">STL <span className="mx-2 text-[#d4af37]/50">·</span> OBJ <span className="mx-2 text-[#d4af37]/50">·</span> GLB <span className="mx-2 text-[#d4af37]/50">·</span> FBX <span className="mx-2 text-[#d4af37]/50">·</span> RHINO 3DM</p>
                <div className="mt-8 flex items-center gap-2 text-[9px] tracking-wide text-[#9a9488]"><span className="h-px w-8 bg-[#b9a77d]/35"/><span>ARRASTRA Y SUELTA TU ARCHIVO</span><span className="h-px w-8 bg-[#b9a77d]/35"/></div>
              </div>
            </div>}
            {presentationCover && <div className={"pointer-events-none absolute inset-0 z-20 overflow-hidden transition-opacity duration-500 "+(presentationVisible?"opacity-100":"opacity-0")}>
              <img src={presentationCover} alt="Presentación del diseño" className="h-full w-full object-cover" />
            </div>}
            {cargando && estadoCarga && <AurumLoadingExperience message={estadoCarga.message} completed={estadoCarga.completed} total={estadoCarga.total} />}
            {error&&<div className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-red-400/20 bg-red-950/80 px-4 py-2 text-xs text-red-200">{error}</div>}
            {parteSeleccionada&&diagnosticoSeleccion&&diagnosticoSeleccionHabilitado&&<div className="absolute left-3 top-3 z-30 w-[min(430px,calc(100%-24px))] max-h-[78%] overflow-y-auto rounded-xl border border-[#d4af37]/50 bg-[#101214]/95 p-3 text-[10px] leading-relaxed text-white shadow-2xl backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-[.16em] text-[#d4af37]">Diagnóstico de selección <span className="ml-2 text-white/40">Ctrl+Shift+D</span></div>
                  <div className="break-words text-xs font-semibold text-white">{parteSeleccionadaNombre||"Componente"}</div>
                  <div className="mt-1 break-all text-[9px] text-white/45">{diagnosticoSeleccion.selected.uuid}</div>
                </div>
                <button type="button" title="Cerrar diagnóstico" onClick={()=>{setParteSeleccionada(null);setDiagnosticoSeleccion(null);}} className="rounded-md px-2 py-1 text-white/60 hover:bg-white/10 hover:text-white">✕</button>
              </div>
              <div className="mt-2 rounded-lg border border-[#d4af37]/35 bg-[#d4af37]/[.06] p-2">
                <div className="mb-1 font-semibold text-[#e2bd58]">Corregir clasificación de capa</div>
                <p className="mb-2 text-[9px] leading-relaxed text-white/60">La corrección se aplica a todas las mallas de esta capa y prevalece sobre los metadatos importados.</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {([{id:"metal",label:"Metal"},{id:"gema",label:"Gema"},{id:"otro",label:"Otro"}] as const).map(option=><button key={option.id} type="button" aria-pressed={diagnosticoSeleccion.selected.category===option.id} onClick={()=>{
                    const selected=diagnosticoSeleccion.selected;
                    const result=apiRef.current?.setLayerCategoryOverride?.({
                      layerId:selected.layerId,layerIndex:selected.layerIndex,layerName:selected.layer,
                    },option.id);
                    if(!result?.changed){toast.error("No se pudo corregir la capa: falta una identidad de capa válida.");return;}
                    toast.success("Clasificación actualizada en "+result.changed+" mallas.");
                    if(option.id==="metal"){setBibliotecaTipo("metales");setUxSection("materiales");}
                    else if(option.id==="gema"){setBibliotecaTipo("gemas");setUxSection("gemas");}
                  }} className={"rounded-md border px-2 py-2 text-[10px] font-semibold transition "+(diagnosticoSeleccion.selected.category===option.id?"border-[#d4af37] bg-[#d4af37]/20 text-[#f0d88c]":"border-white/10 bg-white/[.04] text-white/75 hover:bg-white/[.09]")}>{option.label}</button>)}
                </div>
                {getAurumLayerCategoryOverride(layerCategoryOverrides,{
                  layerId:diagnosticoSeleccion.selected.layerId,
                  layerIndex:diagnosticoSeleccion.selected.layerIndex,
                  layerName:diagnosticoSeleccion.selected.layer,
                })&&<button type="button" onClick={()=>{
                  const selected=diagnosticoSeleccion.selected;
                  const result=apiRef.current?.setLayerCategoryOverride?.({
                    layerId:selected.layerId,layerIndex:selected.layerIndex,layerName:selected.layer,
                  },null);
                  if(!result?.changed){toast.error("No se pudo restaurar la clasificación original.");return;}
                  toast.success("Se restauró la clasificación original de la capa.");
                }} className="mt-2 w-full rounded-md border border-white/10 px-2 py-1.5 text-[9px] font-medium text-white/65 hover:bg-white/[.07]">Deshacer corrección</button>}
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
                <div><span className="text-white/45">Tipo geométrico Rhino original:</span> <strong>{String(diagnosticoSeleccion.selected.rhinoGeometryType||"NO CAPTURADO")}</strong></div>
                <div><span className="text-white/45">Filtro geométrico CSG:</span> {String(diagnosticoSeleccion.selected.csgEligibility)}</div>
              </div>
              <div className="mt-2 rounded-lg border border-white/10 p-2">
                <div className="mb-1 font-semibold text-[#d4af37]">Geometría y material actual</div>
                <div>Vértices: {String(diagnosticoSeleccion.selected.geometry.vertices??"—")} · Triángulos aprox.: {String(diagnosticoSeleccion.selected.geometry.triangles??"—")}</div>
                <div>Índice de geometría: {String(diagnosticoSeleccion.selected.geometry.indexed)} · Normales: {String(diagnosticoSeleccion.selected.geometry.normals)}</div>
                {diagnosticoSeleccion.selected.geometry.preflight&&<div className="mt-2 rounded-md border border-white/10 bg-white/[.035] p-2">
                  <div className="mb-1 font-semibold text-[#d4af37]">Preflight topológico · solo lectura</div>
                  <div className="grid grid-cols-2 gap-1">
                    <span>Aristas abiertas: <strong>{diagnosticoSeleccion.selected.geometry.preflight.boundaryEdges}</strong></span>
                    <span>No manifold: <strong>{diagnosticoSeleccion.selected.geometry.preflight.nonManifoldEdges}</strong></span>
                    <span>Caras degeneradas: <strong>{diagnosticoSeleccion.selected.geometry.preflight.degenerateTriangles}</strong></span>
                    <span>Normales válidas: <strong>{diagnosticoSeleccion.selected.geometry.preflight.normalsValid?"Sí":"No"}</strong></span>
                  </div>
                  <div className="mt-1 font-semibold">{diagnosticoSeleccion.selected.geometry.preflight.renderReady?"Geometría apta para renderizado":"Revisar geometría antes de procesos topológicos"}</div>
                  <p className="mt-1 text-[9px] text-white/45">Las aristas abiertas no impiden el renderizado; indican que la malla no es cerrada. Este análisis no repara ni modifica el modelo.</p>
                </div>}
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
                    <div className="text-white/60">Rhino: {String(mesh.rawAttributes?.rhinoGeometryType||"NO CAPTURADO")} · Filtro geométrico CSG: {String(mesh.rawAttributes?.csgEligibility||"EXCLUIDO")}</div>
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
            {/* Se oculta la etiqueta técnica del archivo para mantener limpio el visor. */}

            {!embedded && <div className="group absolute bottom-0 left-1/2 z-[70] flex w-max max-w-[calc(100%-1rem)] -translate-x-1/2 translate-y-[calc(100%-10px)] flex-wrap items-center justify-center gap-0.5 rounded-xl border border-white/30 bg-[#242428]/90 px-1.5 py-1.5 opacity-0 shadow-[0_8px_24px_rgba(0,0,0,.24)] backdrop-blur-xl transition-all duration-200 before:absolute before:inset-x-0 before:bottom-0 before:h-12 before:translate-y-full before:content-[''] hover:translate-y-0 hover:opacity-100 focus-within:translate-y-0 focus-within:opacity-100 sm:max-w-[calc(100%-1.5rem)] sm:gap-1 sm:px-2 sm:py-1.5">
              <span title="Clic izquierdo y arrastrar para orbitar" className="group flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[10px] text-white/90 transition-colors hover:bg-white/[.09] hover:text-white sm:px-2"><span className="grid size-6 place-items-center rounded-md border border-white/20 bg-white/[.08] text-[13px] text-white/85 transition-colors group-hover:border-[#d4af37]/40 group-hover:bg-[#d4af37]/15 group-hover:text-[#e7c766]">⟳</span><span className="font-medium">Órbita</span></span>
              <span aria-hidden="true" className="h-5 w-px bg-white/20" />
              <span title="Clic derecho y arrastrar para desplazar la vista" className="group flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[10px] text-white/90 transition-colors hover:bg-white/[.09] hover:text-white sm:px-2"><span className="grid size-6 place-items-center rounded-md border border-white/20 bg-white/[.08] text-[12px] text-white/85 transition-colors group-hover:border-[#d4af37]/40 group-hover:bg-[#d4af37]/15 group-hover:text-[#e7c766]">✥</span><span className="font-medium">Pan</span></span>
              <span aria-hidden="true" className="h-5 w-px bg-white/20" />
              <span title="Usa la rueda del ratón para acercar o alejar" className="group flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[10px] text-white/90 transition-colors hover:bg-white/[.09] hover:text-white sm:px-2"><span className="grid size-6 place-items-center rounded-md border border-white/20 bg-white/[.08] text-[12px] text-white/85 transition-colors group-hover:border-[#d4af37]/40 group-hover:bg-[#d4af37]/15 group-hover:text-[#e7c766]">⌕</span><span className="font-medium">Zoom</span></span>
              <span aria-hidden="true" className="h-5 w-px bg-white/20" />
              <button type="button" title="Centrar la joya sin cambiar el zoom" onClick={()=>apiRef.current?.centerJewel()} className="group flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[10px] text-white/90 transition-colors hover:bg-white/[.09] hover:text-white sm:px-2"><span className="grid size-6 place-items-center rounded-md border border-white/20 bg-white/[.08] text-[12px]">⊙</span><span className="font-medium">Centrar joya</span></button>
              <button type="button" title="Ajustar el encuadre de la joya al canvas visible" onClick={()=>apiRef.current?.fitAspect()} className="group flex items-center gap-1.5 rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/[.06] px-1.5 py-1 text-[10px] text-white/95 transition-colors hover:border-[#d4af37]/45 hover:bg-[#d4af37]/15 hover:text-white sm:px-2"><span className="grid size-6 place-items-center rounded-md bg-[#d4af37]/15 text-[12px] text-[#e7c766]">⌗</span><span className="font-medium">Ajustar a proporción</span></button>
            </div>}
            {!embedded && <div className="absolute bottom-6 right-6 z-20 flex gap-1 rounded-xl border border-white/35 bg-white/75 p-1 text-black/55 shadow-sm backdrop-blur-2xl">
              <span className="rounded-lg border border-black/10 px-2 py-1 text-[9px]">HDRI</span><span className="rounded-lg border border-black/10 px-2 py-1 text-[9px]">PBR</span><span className="rounded-lg border border-black/10 px-2 py-1 text-[9px]">4K</span>
              <button type="button" title={isViewerFullscreen?"Restaurar visor":"Maximizar visor"} aria-label={isViewerFullscreen?"Restaurar visor":"Maximizar visor"} aria-pressed={isViewerFullscreen} onClick={()=>apiRef.current?.fullscreen()} className="grid size-7 place-items-center rounded-lg bg-[#17191c] text-white transition-colors hover:bg-[#b99642] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b99642] focus-visible:ring-offset-2">{isViewerFullscreen?<Minimize2 className="size-3.5"/>:<Maximize2 className="size-3.5"/>}</button>
            </div>}

            {!embedded && <div className={"absolute right-5 top-1/2 z-30 -translate-y-1/2 transition-opacity duration-200 "+(isViewerFullscreen?"opacity-0 hover:opacity-100 focus-within:opacity-100":"opacity-100")}>
              <div className="flex flex-col items-center gap-1 rounded-2xl border border-white/70 bg-white/65 p-1.5 shadow-[0_8px_28px_rgba(36,32,20,.10)] backdrop-blur-2xl">
                <button type="button" title="Biblioteca de ambientes y materiales" aria-label="Abrir biblioteca" aria-expanded={libraryMenuOpen} onClick={()=>{setLibraryMenuOpen(v=>!v);setQualityOpen(false);}} className={"grid size-9 place-items-center rounded-xl transition-colors "+(libraryMenuOpen?"bg-[#d4af37]/15 text-[#92743b]":"text-black/70 hover:bg-white/70")}><SlidersHorizontal className="size-[17px]"/></button>
                <button type="button" title="Calidad de render" onClick={()=>{setQualityOpen(v=>!v);setLibraryMenuOpen(false);}} className={"grid size-9 place-items-center rounded-xl "+(qualityOpen?"bg-[#d4af37]/15 text-[#d4af37]":"text-black/70 hover:bg-white/70")}><Sparkles className="size-[17px]"/></button>
                <button type="button" title="Reiniciar cámara" onClick={()=>apiRef.current?.reset()} className="grid size-9 place-items-center rounded-xl text-black/70 hover:bg-white/70"><RotateCcw className="size-[17px]"/></button>
                <button type="button" title="Profundidad de campo en el visor" aria-label="Ajustes de profundidad de campo en el visor" aria-expanded={liveDofOpen} onClick={()=>{setLiveDofOpen(v=>!v);setLibraryMenuOpen(false);setQualityOpen(false);}} className={"grid size-9 place-items-center rounded-xl text-[10px] font-semibold transition-colors "+(liveDof?"bg-[#d4af37]/20 text-[#92743b]":liveDofOpen?"bg-white/80 text-[#92743b]":"text-black/70 hover:bg-white/70")}>DOF</button>
                <button type="button" title={autoRotate360 ? "Detener rotación 360°" : "Activar rotación 360°"} aria-label={autoRotate360 ? "Detener rotación 360 grados" : "Activar rotación 360 grados"} aria-pressed={autoRotate360} onClick={()=>{const next=!autoRotate360;setAutoRotate360(next);if(orbitControlsRef.current){orbitControlsRef.current.autoRotate=next;orbitControlsRef.current.autoRotateSpeed=0.8;orbitControlsRef.current.update?.();}invalidateRenderRef.current?.();}} className={"grid size-9 place-items-center rounded-xl transition-colors "+(autoRotate360 ? "bg-[#d4af37]/20 text-[#92743b]" : "text-black/70 hover:bg-white/70")}><span className="text-[10px] font-semibold">360°</span></button>
                <button type="button" title={isViewerFullscreen?"Restaurar visor":"Maximizar visor"} aria-label={isViewerFullscreen?"Restaurar visor":"Maximizar visor"} aria-pressed={isViewerFullscreen} onClick={()=>apiRef.current?.fullscreen()} className="grid size-9 place-items-center rounded-xl text-black/70 hover:bg-white/70">{isViewerFullscreen?<Minimize2 className="size-[17px]"/>:<Maximize2 className="size-[17px]"/>}</button>
              </div>
            </div>}
            {!embedded && liveDofOpen&&<div className="absolute right-[70px] top-[calc(50%+52px)] z-40 w-[min(270px,calc(100%-5rem))] rounded-2xl border border-black/10 bg-[#fbfaf7]/95 p-3 text-[#292824] shadow-xl backdrop-blur-2xl">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#92743b]">Profundidad de campo · visor</div>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-white p-3 text-xs"><span><span className="block font-semibold">Previsualizar desenfoque</span><span className="mt-1 block text-[10px] text-[#77756f]">Se aplica al visor al terminar la órbita.</span></span><input type="checkbox" checked={liveDof} onChange={e=>{const enabled=e.target.checked;setLiveDof(enabled);if(typeof window!=="undefined"&&new URLSearchParams(window.location.search).has("aurumDofDiag"))console.info("[AURUM][DOF] UI toggle",{requested:enabled,apiAvailable:Boolean(apiRef.current?.setDepthOfField)});apiRef.current?.setDepthOfField?.(enabled,liveDofStrength);}} className="size-4 accent-[#b99642]"/></label>
              <label className="mt-2 block text-[10px] text-[#66645e]">Intensidad<select value={liveDofStrength} onChange={e=>{const strength=e.target.value as "soft"|"medium"|"strong";setLiveDofStrength(strength);apiRef.current?.setDepthOfField?.(liveDof,strength);}} className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-2 text-xs text-[#292824]"><option value="soft">Suave · recomendado</option><option value="medium">Medio</option><option value="strong">Intenso</option></select></label>
              <p className="mt-2 text-[10px] leading-relaxed text-[#858178]">El efecto se pausa durante el movimiento para conservar fluidez y se recupera al estabilizar la cámara.</p>
            </div>}
            {!embedded && libraryMenuOpen&&<div className="absolute right-[70px] top-1/2 z-40 w-[min(260px,calc(100%-6rem))] -translate-y-1/2 rounded-2xl border border-white/75 bg-[#fbfaf7]/75 p-2.5 text-[#292824] shadow-[0_12px_36px_rgba(35,32,24,.14)] backdrop-blur-2xl">
              <div className="px-2 pb-2 text-[9px] font-semibold uppercase tracking-[.16em] text-[#92743b]">Biblioteca de joyería</div>
              {([{id:"materiales",label:"Materiales",detail:"Metales y acabados",count:MATERIALES.length},{id:"gemas",label:"Gemas",detail:"Piedras y variedades",count:GEMAS.length},{id:"ambientes",label:"Ambientes",detail:"HDR y presentación de metales",count:ESCENARIOS.length},{id:"hdrMetales",label:"HDR Metales",detail:"Reflejos para metales",count:Object.keys(AURUM_HDRI_URLS).length},{id:"hdrGemas",label:"HDR Gemas",detail:"Iluminación de piedras",count:Object.keys(AURUM_GEM_HDRI_URLS).length+Object.keys(AURUM_AMBIENT_PRESETS).length},{id:"lighting",label:"Estudio de iluminación Aurum",detail:"Control de luces del estudio",count:5}] as const).map(item=>{const activo=item.id==="lighting"?lightingOpen:uxSection===item.id;return <button key={item.id} type="button" onClick={()=>{setLibraryMenuOpen(false);if(item.id==="lighting"){setLightingOpen(true);setQualityOpen(false);}else{setLightingOpen(false);setUxSection(item.id);}}} className={"mb-1 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors "+(activo?"border-[#d4af37]/40 bg-[#d4af37]/10":"border-transparent hover:border-white/80 hover:bg-white/65")}><span className={"grid size-8 shrink-0 place-items-center rounded-lg "+(activo?"bg-[#d4af37]/15 text-[#92743b]":"bg-black/[.035] text-[#77756f]")}>{item.id==="materiales"?"◈":item.id==="gemas"?"◇":item.id==="ambientes"?"◉":item.id==="hdrMetales"?"◉":item.id==="hdrGemas"?"✧":"✦"}</span><span className="min-w-0 flex-1"><span className="block text-[11px] font-medium">{item.label}</span><span className="block text-[9px] text-[#858178]">{item.detail}</span></span><span className="text-[9px] tabular-nums text-[#99968d]">{item.count}</span></button>})}
            </div>}

            {!embedded && qualityOpen&&<div className="absolute right-[78px] top-1/2 z-40 w-48 -translate-y-1/2 rounded-2xl border border-black/10 bg-[#fbfaf7]/95 p-2 text-[#292824] shadow-xl backdrop-blur-2xl">
              <div className="px-2 pb-2 text-[9px] font-semibold uppercase tracking-[.16em] text-[#858178]">Calidad de render</div>
              {([["low","Baja","Vista rápida"],["high","Alta","Producción"],["ultra","Ultra","Máximo detalle"]] as const).map(([id,nombre,desc])=><button key={id} type="button" onClick={()=>cambiarCalidad(id)} className={"mb-1 w-full rounded-lg border px-2.5 py-2 text-left "+(renderQualityId===id?"border-[#d4af37]/60 bg-[#d4af37]/10":"border-white/10 bg-white/[.03]")}><span className="block text-[10px] font-semibold">{nombre}</span><span className="text-[8px] text-white/40">{desc}</span></button>)}
            </div>}
            {!embedded && lightingOpen && lightingPanel}
                        {!embedded && snapshotOpen && archivo && snapshotAspect && <div className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center overflow-hidden [container-type:size]" aria-hidden="true"><div className="relative border border-[#e5c76a] shadow-[0_0_0_200vmax_rgba(0,0,0,0.55)]" style={getAurumAspectFrameStyle(Math.max(1,Number(snapshotWidth)||1)/Math.max(1,Number(snapshotHeight)||1))}><div className="absolute inset-0 border border-[#7b612b]/90 drop-shadow-[0_0_1px_rgba(255,255,255,.95)]"/>{snapshotGuide!=="none"&&<><div className="absolute inset-y-0 left-1/3 border-l border-[#7b612b]/90 drop-shadow-[0_0_1px_rgba(255,255,255,.95)]"/><div className="absolute inset-y-0 left-2/3 border-l border-[#7b612b]/90 drop-shadow-[0_0_1px_rgba(255,255,255,.95)]"/><div className="absolute inset-x-0 top-1/3 border-t border-[#7b612b]/90 drop-shadow-[0_0_1px_rgba(255,255,255,.95)]"/><div className="absolute inset-x-0 top-2/3 border-t border-[#7b612b]/90 drop-shadow-[0_0_1px_rgba(255,255,255,.95)]"/></>}{snapshotGuide==="complete"&&<><div className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2"><span className="absolute left-1/2 top-0 h-3 -translate-x-1/2 border-l border-[#6b5120] drop-shadow-[0_0_1px_rgba(255,255,255,1)]"/><span className="absolute left-0 top-1/2 w-3 -translate-y-1/2 border-t border-[#6b5120] drop-shadow-[0_0_1px_rgba(255,255,255,1)]"/></div><div className="absolute inset-[5%] border border-dashed border-[#6b5120]/90 drop-shadow-[0_0_1px_rgba(255,255,255,1)]"/></>}</div></div>}
            {!embedded && videoOpen && archivo && videoAspect && <div className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center overflow-hidden [container-type:size]" aria-hidden="true"><div className="relative border border-[#e5c76a] shadow-[0_0_0_200vmax_rgba(0,0,0,0.55)]" style={getAurumAspectFrameStyle(getAurumAspectRatio(videoAspect))}><div className="absolute inset-0 border border-[#7b612b]/90 drop-shadow-[0_0_1px_rgba(255,255,255,.95)]"/><div className="absolute -top-6 left-0 rounded-t-md border border-[#e5c76a] bg-[#292824]/90 px-2 py-1 text-[9px] font-semibold tracking-wide text-[#f5e6b5]">{videoAspect} · ENCUADRE MP4</div></div></div>}
          </div>
        </main>
         {!embedded && <aside className="hidden w-[min(22vw,360px)] shrink-0 overflow-hidden rounded-2xl border border-[#e6e1d8] bg-[#faf9f6] text-[#292824] shadow-[0_6px_22px_rgba(36,32,20,.035)] xl:flex xl:flex-col">
{exportOpen&&<div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#faf9f6] p-3 text-[#292824]">
      <div>
        <div className="mb-3 flex items-start justify-between gap-3"><div><div id="aurum-export-title" className="text-lg font-semibold tracking-tight text-[#292824]">Centro de exportación</div><div className="mt-1 text-sm text-[#77756f]">Prepara tu joya para presentar, compartir o fabricar.</div></div><button type="button" aria-label="Cerrar exportación" onClick={()=>setExportOpen(false)} className="rounded-lg p-1 text-[#77756f] hover:bg-black/[.05]"><X className="size-4"/></button></div>
        <div className="flex flex-col gap-3">

          {EXPORT_LEGADO_VISIBLE&&(<button type="button" disabled={!archivo||exportBusy} onClick={async()=>{setExportBusy(true);try{await apiRef.current?.exportGLB();}catch(e){setError(e instanceof Error?e.message:"No se pudo exportar el GLB.");}finally{setExportBusy(false);}}} className="flex w-full items-center gap-2.5 rounded-xl border border-[#7168f4]/20 bg-[#7168f4]/85 px-3 py-2.5 text-left text-[13px] font-semibold text-[#292824] shadow-sm transition-colors hover:bg-[#7168f4]/95 disabled:cursor-not-allowed disabled:opacity-40"><Gem className="size-5"/><span><span className="block">Descargar modelo .glb</span><span className="block text-[10px] font-normal text-[#292824]/85">Geometría y materiales exportables</span></span></button>)}

          <button type="button" onClick={()=>setSnapshotOpen(v=>{const next=!v;if(next){setVideoOpen(false);if(snapshotAspect===null)syncSnapshotNativeDimensions();}else{setSnapshotAspect(null);const original=snapshotAspectCameraSnapshotRef.current;snapshotAspectCameraSnapshotRef.current=null;if(original)apiRef.current?.restoreCameraState?.(original);syncSnapshotNativeDimensions();}return next;})} aria-expanded={snapshotOpen} className="flex w-full items-center gap-2.5 rounded-xl border border-white/80 bg-white/35 px-3 py-2.5 text-left text-[13px] text-[#292824] transition-colors hover:bg-white/60"><ImageIcon className="size-5"/><span className="min-w-0 flex-1"><span className="block">Fotografía del producto</span><span className="block text-[10px] text-[#77756f]">Captura profesional · Resolución y formato</span></span><ChevronDown className={"size-4 transition-transform "+(snapshotOpen?"rotate-180":"")}/></button>

          {snapshotOpen&&<div className="rounded-xl border border-black/10 bg-black/[.025] p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#77756f]">Salida de imagen</div>
            <div className="mb-1.5 text-[10px] font-medium text-[#66645e]">Proporción</div>
            <div className="mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              <button type="button" onClick={()=>handleSnapshotAspect("16:9")} aria-pressed={snapshotAspect==="16:9"} className={"rounded-lg border px-2 py-2 text-left text-[10px] transition "+(snapshotAspect==="16:9"?"border-[#92743b] bg-[#d4af37]/15 text-[#725821]":"border-black/10 bg-white text-[#55534d] hover:bg-black/[.025]")}><span className="block font-semibold">16:9</span><span className="mt-0.5 block opacity-75">Horizontal</span></button>
              <button type="button" onClick={()=>handleSnapshotAspect("1:1")} aria-pressed={snapshotAspect==="1:1"} className={"rounded-lg border px-2 py-2 text-left text-[10px] transition "+(snapshotAspect==="1:1"?"border-[#92743b] bg-[#d4af37]/15 text-[#725821]":"border-black/10 bg-white text-[#55534d] hover:bg-black/[.025]")}><span className="block font-semibold">1:1</span><span className="mt-0.5 block opacity-75">Cuadrado</span></button>
              <button type="button" onClick={()=>handleSnapshotAspect("4:5")} aria-pressed={snapshotAspect==="4:5"} className={"rounded-lg border px-2 py-2 text-left text-[10px] transition "+(snapshotAspect==="4:5"?"border-[#92743b] bg-[#d4af37]/15 text-[#725821]":"border-black/10 bg-white text-[#55534d] hover:bg-black/[.025]")}><span className="block font-semibold">4:5</span><span className="mt-0.5 block opacity-75">Catálogo vertical</span></button>
              <button type="button" onClick={()=>handleSnapshotAspect("9:16")} aria-pressed={snapshotAspect==="9:16"} className={"rounded-lg border px-2 py-2 text-left text-[10px] transition "+(snapshotAspect==="9:16"?"border-[#92743b] bg-[#d4af37]/15 text-[#725821]":"border-black/10 bg-white text-[#55534d] hover:bg-black/[.025]")}><span className="block font-semibold">9:16</span><span className="mt-0.5 block opacity-75">Historias / móvil</span></button>
              <button type="button" onClick={()=>handleSnapshotAspect("3:2")} aria-pressed={snapshotAspect==="3:2"} className={"rounded-lg border px-2 py-2 text-left text-[10px] transition "+(snapshotAspect==="3:2"?"border-[#92743b] bg-[#d4af37]/15 text-[#725821]":"border-black/10 bg-white text-[#55534d] hover:bg-black/[.025]")}><span className="block font-semibold">3:2</span><span className="mt-0.5 block opacity-75">Fotografía clásica</span></button>
            </div>
            <div className="mt-2"><div className="mb-1 text-[10px] font-medium text-[#66645e]">Guías de composición</div><div className="grid grid-cols-3 gap-1.5"><button type="button" onClick={()=>setSnapshotGuide("none")} aria-pressed={snapshotGuide==="none"} className={"rounded-lg border px-2 py-1.5 text-[10px] "+(snapshotGuide==="none"?"border-[#92743b] bg-[#d4af37]/15 text-[#725821]":"border-black/10 bg-white text-[#55534d]")}>Sin guías</button><button type="button" onClick={()=>setSnapshotGuide("thirds")} aria-pressed={snapshotGuide==="thirds"} className={"rounded-lg border px-2 py-1.5 text-[10px] "+(snapshotGuide==="thirds"?"border-[#92743b] bg-[#d4af37]/15 text-[#725821]":"border-black/10 bg-white text-[#55534d]")}>Tercios</button><button type="button" onClick={()=>setSnapshotGuide("complete")} aria-pressed={snapshotGuide==="complete"} className={"rounded-lg border px-2 py-1.5 text-[10px] "+(snapshotGuide==="complete"?"border-[#92743b] bg-[#d4af37]/15 text-[#725821]":"border-black/10 bg-white text-[#55534d]")}>Completa</button></div></div>
            <div className="mb-1.5 text-[10px] font-medium text-[#66645e]">Resolución de fotografía</div>
            <div className="mb-2 grid grid-cols-2 gap-1.5">
              <button type="button" onClick={()=>{setSnapshotResolution("4k");const ratio=snapshotAspect?getAurumAspectRatio(snapshotAspect):16/9;const w=ratio>=1?3840:Math.round(3840*ratio);const h=ratio>=1?Math.round(3840/ratio):3840;setSnapshotWidth(String(w));setSnapshotHeight(String(h));}} aria-pressed={snapshotResolution==="4k"} className={"rounded-lg border px-2 py-2 text-left text-[10px] "+(snapshotResolution==="4k"?"border-[#92743b] bg-[#d4af37]/15 text-[#725821]":"border-black/10 bg-white text-[#55534d]")}><span className="block font-semibold">4K UHD</span><span className="mt-0.5 block opacity-75">3840 × 2160</span></button>
              <button type="button" onClick={()=>{setSnapshotResolution("8k");const ratio=snapshotAspect?getAurumAspectRatio(snapshotAspect):16/9;let w=ratio>=1?7680:Math.round(7680*ratio);let h=ratio>=1?Math.round(7680/ratio):7680;const scale=Math.min(1,Math.sqrt(36_000_000/(w*h)));w=Math.round(w*scale);h=Math.round(h*scale);setSnapshotWidth(String(w));setSnapshotHeight(String(h));}} aria-pressed={snapshotResolution==="8k"} className={"rounded-lg border px-2 py-2 text-left text-[10px] "+(snapshotResolution==="8k"?"border-[#92743b] bg-[#d4af37]/15 text-[#725821]":"border-black/10 bg-white text-[#55534d]")}><span className="block font-semibold">8K UHD</span><span className="mt-0.5 block opacity-75">7680 × 4320</span></button>
            </div>
            <div className="mb-1.5 text-[10px] text-[#66645e]">También puedes ajustar las dimensiones manualmente.</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] text-[#66645e]">Ancho (px)<input type="number" min={320} max={8192} step={160} value={snapshotWidth} onChange={e=>setSnapshotWidth(e.target.value)} className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-2 text-xs text-[#292824] outline-none focus:border-[#92743b]"/></label>
              <label className="text-[10px] text-[#66645e]">Alto (px)<input type="number" min={320} max={8192} step={120} value={snapshotHeight} onChange={e=>setSnapshotHeight(e.target.value)} className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-2 text-xs text-[#292824] outline-none focus:border-[#92743b]"/></label>
            </div>
            <label className="mt-2 block text-[10px] text-[#66645e]">Formato
              <select value={snapshotFormat} onChange={e=>setSnapshotFormat(e.target.value as "png"|"jpeg"|"webp")} className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-2 text-xs text-[#292824] outline-none focus:border-[#92743b]">
                <option value="png">PNG · máxima compatibilidad</option><option value="jpeg">JPEG · fotografía ligera</option><option value="webp">WebP · archivo optimizado</option>
              </select>
            </label>
            {snapshotFormat === "png" && <label className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-white p-3 text-xs text-[#292824]"><span><span className="block font-semibold">Fondo transparente</span><span className="mt-1 block text-[10px] text-[#77756f]">PNG con canal alfa, sin cambiar el visor ni el póster.</span></span><input type="checkbox" checked={snapshotTransparent} onChange={e=>setSnapshotTransparent(e.target.checked)} className="size-4 accent-[#b99642]"/></label>}
            <label className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-white p-3 text-xs text-[#292824]"><span><span className="block font-semibold">Profundidad de campo</span><span className="mt-1 block text-[10px] text-[#77756f]">Activa el desenfoque en la vista y en la captura; apagado por defecto.</span></span><input type="checkbox" checked={snapshotDof} onChange={e=>setSnapshotDof(e.target.checked)} className="size-4 accent-[#b99642]"/></label>
            {snapshotDof && <label className="mt-2 block text-[10px] text-[#66645e]">Intensidad del desenfoque<select value={snapshotDofStrength} onChange={e=>setSnapshotDofStrength(e.target.value as "soft"|"medium"|"strong")} className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-2 text-xs text-[#292824]"><option value="soft">Suave · recomendado para joyería</option><option value="medium">Medio</option><option value="strong">Intenso · creativo</option></select></label>}
            <div className="mt-2 text-[10px] leading-relaxed text-[#858178]">{snapshotTransparent && snapshotFormat === "png" ? "Se intentará exportar con canal alfa real; si el renderizador no lo admite, se mostrará un error." : "La captura conserva el color de fondo seleccionado en el visor; también puedes exportar con transparencia."} {snapshotDof ? "Se usará el compositor fotográfico solo para esta captura." : "Se conserva la ruta habitual de captura."}</div>
            <button type="button" disabled={!archivo||exportBusy} onClick={()=>{setExportBusy(true);setError(null);window.setTimeout(async()=>{try{await apiRef.current?.exportPNG({width:Number(snapshotWidth),height:Number(snapshotHeight),format:snapshotFormat,transparent:snapshotFormat==="png"&&snapshotTransparent,depthOfField:snapshotDof,dofStrength:snapshotDofStrength});setSnapshotOpen(false);}catch(e){setError(e instanceof Error?e.message:"No se pudo generar la imagen.");}finally{setExportBusy(false);}},50);}} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#7168f4] px-3 py-2.5 text-xs font-semibold text-[#292824] disabled:cursor-not-allowed disabled:opacity-40"><Download className="size-4"/>{exportBusy?"Procesando imagen…":`Descargar ${snapshotFormat.toUpperCase()} · ${snapshotWidth||"3840"} × ${snapshotHeight||"2160"}`}</button>
            {exportBusy&&<div className="mt-3 rounded-lg border border-[#7168f4]/20 bg-white p-3" role="status" aria-live="polite"><div className="mb-2 flex items-center justify-between gap-2 text-[11px]"><span className="font-medium text-[#292824]">Renderizando imagen de alta resolución</span><RotateCw className="size-4 animate-spin" /><span className="text-[#7168f4]">En proceso</span></div><div className="h-2 overflow-hidden rounded-full bg-[#e8e6f8]"><div className="h-full w-1/3 rounded-full bg-[#7168f4]"/></div><p className="mt-2 text-[10px] leading-relaxed text-[#77756f]">La captura está procesando las facetas del diamante. La interfaz puede quedar temporalmente ocupada.</p></div>}
          </div>}
          <div className="rounded-xl border border-[#d4af37]/35 bg-[#fffaf0]/70 p-3">
            <button type="button" aria-expanded={videoOpen} onClick={()=>setVideoOpen(v=>{const next=!v;if(next){setSnapshotOpen(false);setSnapshotAspect(null);const original=snapshotAspectCameraSnapshotRef.current;snapshotAspectCameraSnapshotRef.current=null;if(original)apiRef.current?.restoreCameraState?.(original);}return next;})} className="flex w-full items-center gap-2.5 text-left">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#d4af37]/15 text-[#92743b]"><RotateCw className="size-4"/></span>
              <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold">Vídeo de giro de joya</span><span className="block text-[10px] text-[#77756f]">Render por fotogramas · MP4</span></span>
              <ChevronDown className={"size-4 transition-transform "+(videoOpen?"rotate-180":"")}/>
            </button>
            {videoOpen&&<div className="mt-3 space-y-2.5 border-t border-black/10 pt-3">
              <label className="block text-[10px] text-[#66645e]">Modo de grabación
                <select value={videoMode} disabled={videoBusy} onChange={e=>setVideoMode(e.target.value as "manual"|"automatic"|"orbit180-return"|"cinematic-zoom"|"vertical-sweep"|"slow360"|"catalog")} className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-2 text-xs text-[#292824]">
                  <option value="manual">Manual · mover la cámara durante la grabación</option>
                  <option value="automatic">Automático · giro 360°</option>
                  <option value="orbit180-return">Órbita 180° · ida y vuelta</option>
                  <option value="cinematic-zoom">Acercamiento cinematográfico</option>
                  <option value="vertical-sweep">Recorrido vertical · diamante y aro</option>
                  <option value="slow360">Órbita 360° lenta</option>
                  <option value="catalog">Presentación automática de catálogo</option>
                </select>
              </label>
              <div>
                <div className="mb-1.5 text-[10px] font-medium text-[#66645e]">Proporción del vídeo</div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {(["16:9","1:1","4:5","9:16","3:2"] as AurumAspectRatioId[]).map((ratio)=>(
                    <button key={ratio} type="button" disabled={videoBusy} onClick={()=>{
                      if(videoAspectFitFrameRef.current!==null){
                        cancelAnimationFrame(videoAspectFitFrameRef.current);
                        videoAspectFitFrameRef.current=null;
                      }
                      if(videoAspect===ratio){
                        setVideoAspect(null);
                        const original=videoAspectCameraSnapshotRef.current;
                        videoAspectCameraSnapshotRef.current=null;
                        if(original){
                          apiRef.current?.restoreCameraState?.(original);
                        }else{
                          apiRef.current?.fitAspect();
                        }
                      }else{
                        if(!videoAspectCameraSnapshotRef.current){
                          videoAspectCameraSnapshotRef.current=apiRef.current?.captureCameraState?.()??null;
                        }
                        setVideoAspect(ratio);
                        videoAspectFitFrameRef.current=requestAnimationFrame(()=>{
                          videoAspectFitFrameRef.current=null;
                          apiRef.current?.fitAspect(getAurumAspectRatio(ratio));
                        });
                      }
                    }} aria-pressed={videoAspect===ratio} className={"rounded-lg border px-2 py-2 text-left text-[10px] transition "+(videoAspect===ratio?"border-[#92743b] bg-[#d4af37]/15 text-[#725821]":"border-black/10 bg-white text-[#55534d] hover:bg-black/[.025]")}>
                      <span className="block font-semibold">{ratio}</span>
                      <span className="mt-0.5 block opacity-75">{ratio==="16:9"?"Horizontal":ratio==="1:1"?"Cuadrado":ratio==="4:5"?"Catálogo vertical":ratio==="9:16"?"Historias / móvil":"Fotografía clásica"}</span>
                    </button>
                  ))}
                </div>
              </div>
              <label className="block text-[10px] text-[#66645e]">Resolución de vídeo
                <select value={videoResolution} disabled={videoBusy} onChange={e=>setVideoResolution(e.target.value as "native"|"1080"|"1440"|"4k")} className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-2 text-xs text-[#292824]">
                  <option value="native">Automática · tamaño actual del visor</option>
                  <option value="1080">Full HD · 1080p</option>
                  <option value="1440">QHD · 1440p</option>
                  <option value="4k">Ultra HD · 4K</option>
                </select>
              </label>
              <div className="rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/[.06] p-2.5 text-[10px] leading-relaxed text-[#6f5b2c]">{videoResolution==="native"?"Usa el presupuesto de píxeles disponible y conserva el formato seleccionado.":videoResolution==="1080"?"Renderiza el lado más largo a 1920 píxeles.":videoResolution==="1440"?"Renderiza el lado más largo a 2560 píxeles.":"Renderiza el lado más largo a 3840 píxeles; requiere más memoria y potencia GPU."} {videoAspect?`Formato ${videoAspect}.`:"Se conserva el encuadre y la proporción actuales del visor."} La cámara y el fondo ocupan todo el encuadre sin deformar la joya.</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] text-[#66645e]">Fotogramas por segundo
                  <select value={videoFps} disabled={videoBusy} onChange={e=>setVideoFps(e.target.value)} className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-2 text-xs text-[#292824]"><option value="24">24 FPS</option><option value="30">30 FPS</option><option value="60">60 FPS</option><option value="120">120 FPS · experimental</option></select>
                </label>
                <label className="text-[10px] text-[#66645e]">Duración
                  <select value={videoDuration} disabled={videoBusy} onChange={e=>setVideoDuration(e.target.value)} className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-2 text-xs text-[#292824]"><option value="5">5 segundos</option><option value="10">10 segundos</option><option value="15">15 segundos</option><option value="20">20 segundos</option></select>
                </label>
              </div>
              {videoBusy&&<div role="status" aria-live="polite" className="rounded-lg border border-[#d4af37]/25 bg-white p-2.5">
                {videoCountdown!==null?<>
                  <div className="text-center">
                    <div className="text-[10px] font-medium text-[#77756f]">PREPARA LA JOYA Y LA CÁMARA</div>
                    <div className="my-1 text-4xl font-semibold tabular-nums text-[#b99642]">{videoCountdown}</div>
                    <div className="text-[10px] text-[#66645e]">La grabación manual comenzará en {videoCountdown} s</div>
                  </div>
                </>:<>
                  <div className="mb-2 flex justify-between text-[10px]"><span>{videoMode==="automatic"?"Grabando giro automático":videoMode==="orbit180-return"?"Grabando órbita 180° de ida y vuelta":videoMode==="cinematic-zoom"?"Grabando acercamiento cinematográfico":videoMode==="vertical-sweep"?"Grabando recorrido vertical":videoMode==="slow360"?"Grabando giro 360° lento":videoMode==="catalog"?"Grabando presentación de catálogo":"Grabando movimientos manuales"}</span><span>{Math.round(videoProgress)}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#eee8d8]"><div className="h-full rounded-full bg-[#b99642] transition-[width]" style={{width:Math.max(0,Math.min(100,videoProgress))+"%"}}/></div>
                </>}
                <button type="button" onClick={()=>videoAbortRef.current?.abort()} className="mt-2 w-full rounded-lg border border-black/15 px-3 py-2 text-xs font-semibold">{videoCountdown!==null?"Cancelar cuenta atrás":"Cancelar grabación"}</button>
              </div>}
              {!videoBusy&&<button type="button" disabled={!archivo||exportBusy||!!ptProgress} onClick={async()=>{
                if(videoExportLockRef.current) return;
                videoExportLockRef.current=true;
                const controller=new AbortController();videoAbortRef.current=controller;setVideoBusy(true);setExportBusy(true);setVideoProgress(0);setError(null);
                try{
                  if(videoMode==="manual"){
                    for(let remaining=10;remaining>0;remaining--){
                      if(controller.signal.aborted) throw new DOMException("Grabación cancelada","AbortError");
                      setVideoCountdown(remaining);
                      await new Promise<void>((resolve,reject)=>{
                        const timer=window.setTimeout(()=>{controller.signal.removeEventListener("abort",onAbort);resolve();},1000);
                        const onAbort=()=>{window.clearTimeout(timer);controller.signal.removeEventListener("abort",onAbort);reject(new DOMException("Cuenta atrás cancelada","AbortError"));};
                        controller.signal.addEventListener("abort",onAbort,{once:true});
                      });
                    }
                    setVideoCountdown(null);
                  }
                  if(controller.signal.aborted) throw new DOMException("Grabación cancelada","AbortError");
                  await apiRef.current?.exportVideo({aspect:videoAspect??undefined,resolution:videoResolution,fps:Number(videoFps),duration:Number(videoDuration),mode:videoMode,signal:controller.signal,onProgress:(elapsed:number,total:number)=>setVideoProgress(total>0?elapsed/total*100:0)});
                  setVideoProgress(100);
                }catch(e:any){if(e?.name!=="AbortError")setError(e instanceof Error?e.message:"No se pudo exportar el vídeo MP4.");}
                finally{videoAbortRef.current=null;videoExportLockRef.current=false;setVideoCountdown(null);setVideoBusy(false);setExportBusy(false);}
              }} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-3 py-2.5 text-xs font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"><Download className="size-4"/>Grabar y descargar .mp4</button>}
              <p className="text-[10px] leading-relaxed text-[#77756f]">En modo manual, mueve la cámara mientras se graba; en automático, la joya gira sola. El archivo conserva los píxeles nativos del canvas y el encuadre del visor. La cámara se restaura al terminar.</p>
            </div>}
          </div>
          {EXPORT_LEGADO_VISIBLE&&(<button type="button" onClick={()=>apiRef.current?.exportSceneSettings()} className="flex w-full items-center gap-3 rounded-xl border border-black/10 bg-black/[.025] px-3 py-3 text-left text-sm text-[#292824] hover:bg-black/[.05]"><FileJson className="size-5"/><span><span className="block">Configuración .json</span><span className="block text-[10px] text-[#77756f]">Escena, cámara, calidad y selección</span></span></button>)}

        </div>
        {sharedLink&&<p className="mt-2 rounded-lg border border-black/[.06] bg-black/[.025] p-2.5 text-[10px] leading-relaxed text-[#77756f]">Al compartir un modelo 3D, los materiales compatibles con glTF se conservan mejor; los shaders personalizados, el HDRI y los efectos pueden variar según el visor.</p>}
      </div></div>}
{!exportOpen && <>
          {<div className="flex h-full flex-col overflow-y-auto">
            <div className="border-b border-[#e7e2d9] bg-white/55 px-4 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#92743b]">Biblioteca visual</div>
              
              
            </div>
            <div className="flex flex-1 flex-col gap-4 p-4">
              <div className="overflow-hidden rounded-xl border border-[#e5e0d7] bg-white">
                <div className="flex items-center justify-between border-b border-[#eee9e0] px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#81796b]">Vista previa</span>
                  <span className="rounded-full bg-[#f2efe8] px-2 py-1 text-[9px] font-medium text-[#82704b]">PNG</span>
                </div>
                <div className="grid aspect-[5/4] place-items-center bg-[#f3f2ef] p-2">
                  {posterPreview ? <img src={posterPreview} alt="Miniatura del póster capturado de la joya" className="h-full w-full object-contain" /> : <div className="flex max-w-[190px] flex-col items-center text-center">
                    <span className="mb-3 grid size-14 place-items-center rounded-2xl border border-[#e4dfd5] bg-white text-[#a18a5c]"><ImageIcon className="size-7"/></span>
                    <span className="text-sm font-medium text-[#55534d]">Todavía no hay póster</span>
                    <span className="mt-1 text-xs leading-relaxed text-[#858178]">Genera una captura para ver aquí la miniatura de tu joya.</span>
                  </div>}
                </div>
              </div>
              <button type="button" disabled={!archivo||exportBusy} onClick={()=>void actualizarPoster()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#c9a85d] bg-[#d4af37] px-3 py-3 text-sm font-semibold text-[#292824] shadow-sm transition-colors hover:bg-[#e1bf50] disabled:cursor-not-allowed disabled:opacity-45">
                {exportBusy ? <><RotateCw className="size-4 animate-spin"/> Capturando póster…</> : <><Camera className="size-4"/> Actualizar póster</>}
              </button>
              
              {posterPreview && <div className="rounded-lg border border-[#d8c9aa] bg-[#f4efe5] px-3 py-2 text-[11px] text-[#795e2e]"><span className="font-semibold">Miniatura generada.</span> Comprueba el encuadre y vuelve a actualizarla cuando quieras guardar una nueva captura.</div>}
              <div className="mt-auto rounded-xl border border-[#e6e1d8] bg-white/70 p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-[#55534d]"><Upload className="size-4 text-[#92743b]"/> Destino del póster</div>
                <p className="mt-1 text-[11px] leading-relaxed text-[#858178]">Si abriste la joya desde Mi Nube, el póster se guarda en su carpeta. Si aún no está guardada, puedes capturarlo ahora y vincularlo cuando guardes el proyecto.</p>
              </div>
            </div>
          </div>}
        </>}
        </aside>}
      </div>
      {cameraCalibrationOpen && <AurumCameraCalibrationPanel
        hasModel={Boolean(archivo && !cargando)}
        onClose={() => setCameraCalibrationOpen(false)}
        onSelectView={(id) => { vistaRef.current = id; setVista(id); }}
        captureSnapshot={(id) => cameraCalibrationRuntimeRef.current?.save?.(id) ?? null}
        readLiveSnapshot={(id) => cameraCalibrationRuntimeRef.current?.capture?.(id) ?? null}
        initialSnapshots={cameraCalibrationReferences}
        canEdit={Boolean(sesion?.esAdmin)}
        onPersistSnapshots={async (references) => {
          if (!sesion?.esAdmin) throw new Error("Solo un dueño o administrador puede modificar las referencias maestras.");
          const { error } = await supabase.from("aurum_camera_calibration_global" as any).upsert({
            id: 1,
            calibration_data: references,
            updated_at: new Date().toISOString(),
          }, { onConflict: "id" });
          if (error) throw error;
          calibratedCameraViewsRef.current = references as Partial<Record<VistaId, any>>;
          setCameraCalibrationReferences(references);
        }}
        applySnapshot={(snapshot) => Boolean(cameraCalibrationRuntimeRef.current?.apply?.(snapshot))}
        adjustCamera={(axis, delta) => Boolean(cameraCalibrationRuntimeRef.current?.adjust?.(axis, delta))}
      />}
      {limiteMiNubeModal && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#171613]/55 p-4 backdrop-blur-md" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLimiteMiNubeModal(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="aurum-nube-limit-title" aria-describedby="aurum-nube-limit-description" className="relative w-full max-w-[440px] overflow-hidden rounded-[26px] border border-[#d7c18b]/60 bg-[#fbfaf7] text-[#292824] shadow-[0_28px_100px_rgba(0,0,0,.34)]">
          <div className="h-1.5 w-full bg-gradient-to-r from-[#9a7832] via-[#e1c36d] to-[#9a7832]" />
          <button type="button" aria-label="Cerrar aviso" onClick={() => setLimiteMiNubeModal(null)} className="absolute right-4 top-4 grid size-9 place-items-center rounded-full border border-[#e9e3d7] bg-white/80 text-[#777166] transition hover:bg-[#f0ece3]"><X className="size-4"/></button>
          <div className="px-7 pb-7 pt-8 text-center sm:px-9">
            <div className="mx-auto mb-5 grid size-[68px] place-items-center rounded-[22px] border border-[#d7c18b]/70 bg-gradient-to-br from-[#fffdf7] to-[#eee4ca] text-[#9a7832] shadow-[inset_0_1px_0_rgba(255,255,255,.9)]"><Cloud className="size-8 stroke-[1.5]"/></div>
            <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#9a7832]">AURUM LAB · MI NUBE</p>
            <h2 id="aurum-nube-limit-title" className="mt-3 text-[23px] font-semibold tracking-[-.035em]">Tu espacio está completo</h2>
            <p id="aurum-nube-limit-description" className="mx-auto mt-2 max-w-[330px] text-sm leading-6 text-[#777166]">Has alcanzado el máximo de carpetas de tu plan. Puedes actualizar un proyecto guardado o revisar las opciones de tu plan.</p>
            <div className="mt-6 rounded-2xl border border-[#e8e0d0] bg-white/80 p-4 text-left">
              <div className="flex items-center justify-between gap-3"><span className="text-xs text-[#827b6f]">Plan actual</span><span className="rounded-full border border-[#d7c18b]/70 bg-[#f7f0dc] px-3 py-1 text-xs font-semibold text-[#7f6329]">{limiteMiNubeModal.plan}</span></div>
              <div className="mt-4 flex items-end justify-between gap-3"><div><p className="text-xs text-[#827b6f]">Carpetas utilizadas</p><p className="mt-1 text-2xl font-semibold tabular-nums">{limiteMiNubeModal.usadas}<span className="mx-1 text-base font-normal text-[#aaa293]">/</span><span className="text-base font-medium text-[#827b6f]">{limiteMiNubeModal.limite}</span></p></div><span className="pb-1 text-[11px] font-semibold text-[#9a7832]">100% ocupado</span></div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eee9df]"><div className="h-full w-full rounded-full bg-gradient-to-r from-[#b99a50] to-[#e0c46d]"/></div>
            </div>
            {limiteMiNubeModal.siguientePlan && <div className="mt-5 rounded-2xl border border-[#d7c18b]/80 bg-gradient-to-br from-[#fffaf0] to-[#f4ead0] p-4 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#9a7832]">Un siguiente paso para tu taller</p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div><p className="text-base font-semibold text-[#302819]">Plan {limiteMiNubeModal.siguientePlan.nombre}</p><p className="mt-1 text-xs leading-relaxed text-[#777166]">Más espacio para guardar los nuevos proyectos de tu taller.</p></div>
                <span className="shrink-0 rounded-lg border border-[#d7c18b]/70 bg-white/75 px-2.5 py-1.5 text-xs font-semibold text-[#7f6329]">{limiteMiNubeModal.siguientePlan.precio}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-medium text-[#6d5a32]">{limiteMiNubeModal.siguientePlan.carpetas < 0 ? "Carpetas ilimitadas" : `${limiteMiNubeModal.siguientePlan.carpetas} carpetas`}</span>
                <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-medium text-[#6d5a32]">{limiteMiNubeModal.siguientePlan.almacenamientoMiB < 0 ? "Almacenamiento ilimitado" : `${(limiteMiNubeModal.siguientePlan.almacenamientoMiB / 1024).toFixed(1)} GB de almacenamiento`}</span>
              </div>
            </div>}
            <div className="mt-5 grid gap-2">
              <button type="button" onClick={() => { setLimiteMiNubeModal(null); window.location.assign("/auth"); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d7c18b] bg-gradient-to-b from-[#e5c95f] to-[#d4af37] px-4 py-3 text-xs font-semibold text-[#302819] shadow-[0_4px_12px_rgba(154,120,50,.18)] transition hover:brightness-[1.03]"><ArrowUpRight className="size-4"/> Ver planes comerciales</button>
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => { setLimiteMiNubeModal(null); window.location.assign("/mi-nube"); }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#e3ded4] bg-white px-3 py-2.5 text-xs font-semibold text-[#625d53] transition hover:bg-[#f4f1eb]"><FolderOpen className="size-4"/> Abrir Mi Nube</button>
                <button type="button" onClick={() => setLimiteMiNubeModal(null)} className="min-h-10 rounded-xl border border-[#e3ded4] bg-white px-3 py-2.5 text-xs font-semibold text-[#625d53] transition hover:bg-[#f4f1eb]">Volver al proyecto</button>
              </div>
            </div>
            <p className="mt-4 text-[10px] leading-relaxed text-[#9a9386]">Tus proyectos existentes siguen disponibles. Actualizar una carpeta no ocupa una plaza adicional.</p>
          </div>
        </section>
      </div>}
    </div>
  </>);
}



function AurumPositionsPanel({api,hasModel,onClose}:{api:any;hasModel:boolean;onClose:()=>void}) {
  type Transform = { position:number[]; rotation:number[]; scale:number[] };
  const clone=(value:any):Transform=>({position:[...(value?.position??[0,0,0])],rotation:[...(value?.rotation??[0,0,0, "XYZ"])],scale:[...(value?.scale??[1,1,1])]});
  const [items,setItems]=useState<Array<{id:string;name:string;transform:Transform}>>(()=>{try{return typeof sessionStorage!=="undefined"?JSON.parse(sessionStorage.getItem("aurum-positions-session")||"[]"):[];}catch{return [];}});
  const [name,setName]=useState("");
  const [active,setActive]=useState<string|null>(null);
  const [originalTransform]=useState<Transform|null>(()=>{const value=api?.getJewelTransform?.();return value?clone(value):null;});
  const [transform,setTransform]=useState<Transform>(()=>{const value=api?.getJewelTransform?.();return value?clone(value):{position:[0,0,0],rotation:[0,0,0,"XYZ"],scale:[1,1,1]};});
  const [uniformScale,setUniformScale]=useState(true);
  useEffect(()=>{try{sessionStorage.setItem("aurum-positions-session",JSON.stringify(items));}catch { /* Ignore unavailable storage or quota errors for session-only positions. */ }},[items]);
  const capture=()=>{const value=api?.getJewelTransform?.();return value?clone(value):null;};
  const applyTransform=(next:Transform)=>{if(api?.setJewelTransform?.(next)){setTransform(clone(next));return true;}return false;};
  const sync=()=>{const value=capture();if(value)setTransform(value);};
  const save=()=>{const value=capture();if(!value)return;const item={id:typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():String(Date.now()),name:name.trim()||"Posición "+(items.length+1),transform:value};setItems(old=>[...old,item]);setActive(item.id);setName("");};
  const apply=(item:any)=>{if(applyTransform(item.transform))setActive(item.id);};
  const update=()=>{if(!active)return;const value=capture();if(!value)return;setItems(old=>old.map(item=>item.id===active?{...item,transform:value}:item));};
  const duplicate=()=>{const item=items.find(x=>x.id===active);if(!item)return;const copy={...item,id:typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():String(Date.now()),name:item.name+" · copia",transform:clone(item.transform)};setItems(old=>[...old,copy]);setActive(copy.id);};
  const setAxis=(group:"position"|"rotation"|"scale",axis:number,value:number)=>{if(!Number.isFinite(value))return;const next=clone(transform);next[group][axis]=group==="rotation"?value*Math.PI/180:value;if(applyTransform(next))setActive(null);};
  const preset=(label:string)=>{const angles:Record<string,number[]>={"Frontal":[0,0,0],"Tres cuartos":[0,45,0],"Lateral":[0,90,0],"Posterior":[0,180,0],"Superior":[-90,0,0],"Inferior":[90,0,0]};const next=clone(transform);next.rotation=angles[label].map(v=>v*Math.PI/180);applyTransform(next);setActive(null);};
  const axisField=(group:"position"|"rotation"|"scale",axis:number,label:string)=>{const value=group==="rotation"?transform[group][axis]*180/Math.PI:transform[group][axis];return <label key={group+axis} className="min-w-0"><span className="mb-1 block text-[9px] font-semibold text-[#77756f]">{label}</span><input type="number" step={group==="rotation"?1:0.1} value={Number.isFinite(value)?Number(value.toFixed(3)):0} onChange={e=>setAxis(group,axis,Number(e.target.value))} className="w-full rounded-lg border border-black/10 bg-white px-2 py-2 text-[11px] tabular-nums text-[#292824] outline-none focus:border-[#b99642]"/></label>;};
  return <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-[#f9f8f5] px-3 py-3">
    <div className="mb-4 flex items-start justify-between gap-2"><div><div className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#92743b]">AURUM POSITIONS</div><h2 className="mt-1 text-base font-semibold text-[#292824]">Transformación de joya</h2><p className="mt-1 text-[10px] text-[#77756f]">Orientaciones rápidas y ajuste preciso por ejes.</p></div><button type="button" onClick={onClose} className="rounded-lg border border-black/10 bg-white px-2 py-1 text-[10px] text-[#77756f]">Cerrar</button></div>
    {!hasModel?<div className="rounded-xl border border-dashed border-black/15 bg-white p-4 text-center text-xs text-[#77756f]">Carga una joya para comenzar.</div>:<>
      <section className="rounded-xl border border-[#e6e1d8] bg-white p-3"><div className="mb-2 text-xs font-semibold text-[#5e4a22]">Orientaciones automáticas</div><div className="grid grid-cols-3 gap-1.5">{["Frontal","Tres cuartos","Lateral","Superior","Inferior","Posterior"].map(label=><button key={label} type="button" onClick={()=>preset(label)} className="rounded-lg border border-[#e6e1d8] bg-[#faf9f6] px-2 py-2 text-[10px] font-medium text-[#62583f] transition hover:border-[#b99642] hover:bg-[#f4efe5]">{label}</button>)}</div><p className="mt-2 text-[9px] leading-relaxed text-[#8a857b]">Son orientaciones de referencia aplicadas a la joya; pueden requerir ajuste según cómo venga orientado el archivo 3D.</p></section>
      <section className="mt-3 rounded-xl border border-[#e6e1d8] bg-white p-3"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold text-[#5e4a22]">Movimiento manual</span><button type="button" onClick={sync} className="text-[9px] font-semibold text-[#92743b]">Leer visor</button></div>
        <div className="space-y-3">
          <div><div className="mb-2 text-[10px] font-semibold text-[#45433e]">Posición · unidades de escena</div><div className="grid grid-cols-3 gap-2">{axisField("position",0,"X")}{axisField("position",1,"Y")}{axisField("position",2,"Z")}</div></div>
          <div className="border-t border-black/[.06] pt-3"><div className="mb-2 text-[10px] font-semibold text-[#45433e]">Rotación · grados</div><div className="grid grid-cols-3 gap-2">{axisField("rotation",0,"X°")}{axisField("rotation",1,"Y°")}{axisField("rotation",2,"Z°")}</div></div>
          <div className="border-t border-black/[.06] pt-3"><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-semibold text-[#45433e]">Escala</span><label className="flex items-center gap-1 text-[9px] text-[#77756f]"><input type="checkbox" checked={uniformScale} onChange={e=>setUniformScale(e.target.checked)}/> Uniforme</label></div><div className="grid grid-cols-3 gap-2">{axisField("scale",0,"X")}{axisField("scale",1,"Y")}{axisField("scale",2,"Z")}</div>{uniformScale&&<input aria-label="Escala uniforme" type="range" min="0.1" max="3" step="0.01" value={transform.scale[0]} onChange={e=>{const value=Number(e.target.value);const next=clone(transform);next.scale=[value,value,value];applyTransform(next);setActive(null);}} className="mt-3 w-full accent-[#b99642]"/>}</div>
        </div>
        <button type="button" onClick={()=>{if(originalTransform)applyTransform(originalTransform);setActive(null);}} disabled={!originalTransform} className="mt-3 w-full rounded-lg border border-black/10 bg-[#faf9f6] px-3 py-2 text-[10px] font-semibold text-[#62583f] disabled:opacity-40">Restaurar transformación original</button>
      </section>
      <section className="mt-3 rounded-xl border border-[#e6e1d8] bg-white p-3"><div className="mb-2 text-xs font-semibold text-[#5e4a22]">Guardar posición personalizada</div><input value={name} onChange={e=>setName(e.target.value)} placeholder={"Nombre · Posición "+(items.length+1)} className="mb-2 w-full rounded-lg border border-black/10 bg-[#faf9f6] px-3 py-2 text-xs text-[#292824] outline-none focus:border-[#b99642]"/><button type="button" onClick={save} className="w-full rounded-lg bg-[#b99642] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#a88743]">Guardar transformación actual</button></section>
      <div className="my-3 flex items-center justify-between gap-2"><span className="text-[10px] font-semibold uppercase tracking-wider text-[#77756f]">Biblioteca de posiciones</span><span className="text-[10px] tabular-nums text-[#92743b]">{items.length} guardadas</span></div>
      {items.length===0?<div className="rounded-xl border border-dashed border-black/15 p-5 text-center text-[11px] text-[#8a857b]">Guarda tus vistas y ajustes para recuperarlos después.</div>:<div className="space-y-2">{items.map((item,index)=><div key={item.id} className={"rounded-xl border p-3 "+(active===item.id?"border-[#b99642]/60 bg-[#f4efe5]":"border-black/[.08] bg-white")}><button type="button" onClick={()=>apply(item)} className="flex w-full items-center gap-2 text-left"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#eee8dc] text-[10px] font-bold text-[#80652e]">{String(index+1).padStart(2,"0")}</span><span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#45433e]">{item.name}</span><span className="text-[9px] text-[#92743b]">{active===item.id?"Activa":"Aplicar"}</span></button><div className="mt-2 flex gap-1.5"><button type="button" onClick={update} disabled={active!==item.id} className="flex-1 rounded-md border border-black/10 bg-white px-2 py-1.5 text-[9px] font-medium text-[#62583f] disabled:opacity-40">Actualizar</button><button type="button" onClick={duplicate} disabled={active!==item.id} className="flex-1 rounded-md border border-black/10 bg-white px-2 py-1.5 text-[9px] font-medium text-[#62583f] disabled:opacity-40">Duplicar</button><button type="button" onClick={()=>{setItems(old=>old.filter(x=>x.id!==item.id));if(active===item.id)setActive(null);}} className="rounded-md border border-red-200 bg-white px-2 py-1.5 text-[9px] font-medium text-red-700">Eliminar</button></div></div>)}</div>}
      <p className="mt-3 border-t border-black/[.06] pt-2 text-[9px] leading-relaxed text-[#8a857b]">Los controles modifican únicamente la transformación raíz de la joya. La cámara y la geometría permanecen independientes. Las posiciones se guardan durante la sesión actual.</p>
    </>}
  </div>;
}
