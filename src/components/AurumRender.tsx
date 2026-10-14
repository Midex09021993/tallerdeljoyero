import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyAurumMetal, applyAurumGem, metalPresetFromConfig, gemPresetFromConfig,
} from "../lib/aurum-material-engine";
import { getAurumScenePreset, getAurumRenderQuality, AURUM_HDRI_GROUND_DEFAULT, type AurumRenderQualityId } from "../lib/aurum-scene-engine";
import { getAurumPhotographicProfile, getAurumHdriUrl, getAurumGemHdriUrl } from "../lib/aurum-photographic-scene-engine";
import { getAurumShadowConfig } from "../lib/aurum-shadow-engine";
import { getAurumPostConfig } from "../lib/aurum-post-engine";
import { getAurumSsaoConfig } from "../lib/aurum-ssao-engine";
import { AURUM_LIGHTING_DEFAULT } from "../lib/aurum-lighting-engine";
import { applyAurumCameraView, applyAurumIJEWELPresentationCamera } from "../lib/aurum/camera";
import { prepareAurumModel } from "../lib/aurum/model-prep";
import { createAurumPostPipeline } from "../lib/aurum/post";
import { createAurumEnvironment } from "../lib/aurum/environment";
import { createAurumGemEnvironment } from "../lib/aurum/gem-environment";
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
  const [qualityOpen, setQualityOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [snapshotWidth, setSnapshotWidth] = useState("1920");
  const [snapshotHeight, setSnapshotHeight] = useState("1080");
  const [snapshotFormat, setSnapshotFormat] = useState<"png"|"jpeg"|"webp">("png");
  const [renderQualityId, setRenderQualityId] = useState<AurumRenderQualityId>("high");
  const composerRef = useRef<any>(null);
  const frameRef = useRef<number | null>(null);
  const invalidateRenderRef = useRef<(() => void) | null>(null);
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
  const [uxSection, setUxSection] = useState<"materiales"|"gemas"|"escena"|"">("materiales");
  const exportSettingsRef = useRef({nombreProyecto,categoriaProyecto,archivo,materialId,gemaId,escenarioId,iluminacionId,vista,renderQualityId});
  exportSettingsRef.current={nombreProyecto,categoriaProyecto,archivo,materialId,gemaId,escenarioId,iluminacionId,vista,renderQualityId};

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
      let gemEnvironmentRotation = .28;
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
      const cargarEntornoGema = (key="gemNeutral", rotation=.28, intensityScale=.98) => {
        gemEnvironmentUrl = getAurumGemHdriUrl(key);
        gemEnvironmentRotation = Number.isFinite(rotation) ? rotation : .28;
        gemEnvironmentIntensityScale = Number.isFinite(intensityScale) ? intensityScale : .98;
        const requestId = ++gemEnvironmentRequestId;
        gemEnvironmentController.load(
          gemEnvironmentUrl,
          requestId,
          () => vivo && requestId === gemEnvironmentRequestId,
          (next) => {
            entornoGema = next;
            aplicarEntornoGema();
          }
        );
      };
      // Precarga el GemEnvironment una sola vez. El modelo se engancha
      // cuando termina de cargar; así las gemas no quedan negras por falta de
      // environment en el primer frame.
      cargarEntornoGema("gemNeutral", .28, .98);

      let hdrRequestId = 0;
      const cargarHDRI = (id:IluminacionId | EscenarioId) => {
        const requestId = ++hdrRequestId;
        const photo = getAurumPhotographicProfile(id as string);
        const url = getAurumHdriUrl(photo.environmentKey);
        environmentController.load(
          url,
          requestId,
          () => vivo && requestId === hdrRequestId,
          (next) => {
            entorno = next;
            invalidateRenderRef.current?.();
          }
        );

        // The iJewel reference profile has its own gem HDRI, independent from
        // the scene/metal environment. Other profiles retain their existing
        // gem environment unless they explicitly change it here.
        if (id === "ijewelReference" && (
          gemEnvironmentUrl !== getAurumGemHdriUrl(photo.gemEnvironmentKey)
        )) {
          cargarEntornoGema(
            photo.gemEnvironmentKey,
            photo.gemEnvironmentRotation,
            photo.gemEnvironmentIntensity
          );
        }
      };

      // El escenario inicial selecciona su propio Environment HDRI.

      let modelo:any = null;
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
        (id: string) => cargarHDRI(id as EscenarioId),
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
      applyPostQuality?.(renderQuality);

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
            // Keep the focal diamond optically consistent while orbiting and
            // at rest. Other gems retain the existing LIVE performance path.
            if (enabled && m.userData?.aurumGemFamily === "Diamante") {
              // The focal diamond must never inherit the generic LIVE throttle.
              // Restore each optical property independently so a material that
              // entered this path from an older/partial runtime state cannot
              // remain capped at 0.35 transmission or lose its dispersion.
              const ud={...(m.userData??{})};
              let restored=false;
              if (ud.aurumLiveClearcoatStored !== undefined) {
                m.clearcoat=Number(ud.aurumLiveClearcoatStored);
                delete ud.aurumLiveClearcoatStored;
                restored=true;
              }
              if (ud.aurumLiveClearcoatRoughnessStored !== undefined) {
                m.clearcoatRoughness=Number(ud.aurumLiveClearcoatRoughnessStored);
                delete ud.aurumLiveClearcoatRoughnessStored;
                restored=true;
              }
              if (ud.aurumLiveDispersionStored !== undefined) {
                m.dispersion=Number(ud.aurumLiveDispersionStored);
                delete ud.aurumLiveDispersionStored;
                restored=true;
              }
              if (ud.aurumLiveIridescenceStored !== undefined) {
                m.iridescence=Number(ud.aurumLiveIridescenceStored);
                delete ud.aurumLiveIridescenceStored;
                restored=true;
              }
              if (ud.aurumLiveTransmissionStored !== undefined) {
                m.transmission=Number(ud.aurumLiveTransmissionStored);
                delete ud.aurumLiveTransmissionStored;
                restored=true;
              }
              if (restored) {
                m.userData=ud;
                m.needsUpdate=true;
              }
              return;
            }
            if (enabled) {
              if (m.userData?.aurumLiveClearcoatStored === undefined) {
                m.userData={
                  ...(m.userData??{}),
                  aurumLiveClearcoatStored:Number(m.clearcoat??0),
                  aurumLiveClearcoatRoughnessStored:Number(m.clearcoatRoughness??0),
                  aurumLiveDispersionStored:Number(m.dispersion??0),
                  aurumLiveIridescenceStored:Number(m.iridescence??0),
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
              if (
                Number(m.clearcoat??0)!==0 ||
                Number(m.clearcoatRoughness??0)!==0 ||
                Number(m.dispersion??0)!==0 ||
                Number(m.iridescence??0)!==0 ||
                disableGemTransmission
              ) {
                m.clearcoat=0;
                m.clearcoatRoughness=0;
                // Dispersion/iridescence and screen-space transmission add
                // substantial per-fragment and full-screen work. LIVE uses
                // environment reflection; idle convergence restores the optics.
                m.dispersion=0;
                m.iridescence=0;
                if (disableGemTransmission) {
                  // Keep a small amount of physical transmission during orbit.
                  // Dropping to zero made the moving gem look opaque, then the
                  // idle restore caused a visible pop when full transmission returned.
                  const authoredTransmission=Number(m.userData?.aurumLiveTransmissionStored??m.transmission);
                  m.transmission=Math.min(authoredTransmission,0.35);
                }
                m.needsUpdate=true;
              }
            } else if (m.userData?.aurumLiveClearcoatStored !== undefined) {
              m.clearcoat=Number(m.userData.aurumLiveClearcoatStored);
              m.clearcoatRoughness=Number(m.userData.aurumLiveClearcoatRoughnessStored??0);
              m.dispersion=Number(m.userData.aurumLiveDispersionStored??0);
              m.iridescence=Number(m.userData.aurumLiveIridescenceStored??0);
              if (m.userData?.aurumLiveTransmissionStored !== undefined) {
                m.transmission=Number(m.userData.aurumLiveTransmissionStored);
              }
              m.needsUpdate=true;
              const next={...(m.userData??{})};
              delete next.aurumLiveTransmissionStored;
              delete next.aurumLiveClearcoatStored;
              delete next.aurumLiveClearcoatRoughnessStored;
              delete next.aurumLiveDispersionStored;
              delete next.aurumLiveIridescenceStored;
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
        aplicarPerfilLive();
        invalidateRenderRef.current?.();
      };
      const aplicarMaterial = (m:MaterialConfig) => {
        if (!modelo) {
          configurarMaterial(material, m);
          return;
        }
        applyAurumMaterialToModel(modelo, parteActiva, m, material);
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
            m.envMapIntensity=base*photo.metalEnvironmentScale*photo.highlightProtection;
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
        // Change the optical environment for gemstones together with the scene.
        // This prevents the metal HDR from becoming the only reflection source.
        cargarEntornoGema(
          photo.gemEnvironmentKey,
          photo.gemEnvironmentRotation,
          photo.gemEnvironmentIntensity
        );
        calibrarReflejosMetalEscena(photo);
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
          presentation:{metalEnvironmentScale:1,metalClearcoatScale:.9},
        });
        modelo=interno;
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
        exportPNG:(options:{width?:number;height?:number;format?:"png"|"jpeg"|"webp"}={})=>{
          if(!modelo) throw new Error("Carga un modelo antes de crear el snapshot.");
          if(!composer?.readBuffer||typeof composer.render!=="function") throw new Error("El motor fotográfico no está disponible para capturar la imagen.");
          const width=Math.max(320,Math.min(4096,Math.round(Number(options.width)||1920)));
          const height=Math.max(320,Math.min(4096,Math.round(Number(options.height)||1080)));
          if(width*height>12_000_000) throw new Error("La imagen supera 12 megapíxeles. Usa una resolución menor para proteger la memoria.");
          const format=options.format==="jpeg"||options.format==="webp"?options.format:"png";
          const mime=format==="jpeg"?"image/jpeg":format==="webp"?"image/webp":"image/png";
          const oldSize=new THREE.Vector2();
          renderer.getSize(oldSize);
          const oldCameraAspect=camara.aspect;
          const oldComposerPixelRatio=Number(composer.getPixelRatio?.()??1);
          const oldRenderToScreen=composer.renderToScreen;
          const oldLiveMode=liveFastPathRef.current;
          const oldClearColor=new THREE.Color();
          const oldClearAlpha=renderer.getClearAlpha();
          renderer.getClearColor(oldClearColor);
          let dataUrl="";
          try{
            // Use the full photographic post pipeline, but render off-screen.
            // Reading EffectComposer's final buffer avoids the cleared WebGL
            // default framebuffer that caused black downloads with preserveDrawingBuffer=false.
            liveFastPathRef.current=false;
            aplicarPerfilLive();
            applyPostQuality?.(renderQuality,{capture:true});
            composer.renderToScreen=false;
            composer.setPixelRatio(1);
            composer.setSize(width,height);
            camara.aspect=width/height;
            camara.updateProjectionMatrix();
            renderer.setClearColor(0xffffff,1);
            // A few beauty passes let temporal anti-aliasing settle without
            // running the full interactive progressive loop indefinitely.
            const captureFrames=(composer.passes??[]).some((pass:any)=>pass?.enabled&&pass.constructor?.name==="TAARenderPass")?4:1;
            for(let frame=0;frame<captureFrames;frame++) composer.render();
            const target=composer.readBuffer;
            if(!target||target.width!==width||target.height!==height) throw new Error("La resolución interna de captura no coincide con la solicitada.");
            const pixels=new Uint8Array(width*height*4);
            renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
            const output=document.createElement("canvas");
            output.width=width;
            output.height=height;
            const context=output.getContext("2d");
            if(!context) throw new Error("No se pudo preparar la imagen de salida.");
            const image=context.createImageData(width,height);
            const rowSize=width*4;
            // WebGL pixels start at bottom-left; Canvas ImageData starts top-left.
            for(let y=0;y<height;y++){
              const sourceOffset=(height-1-y)*rowSize;
              image.data.set(pixels.subarray(sourceOffset,sourceOffset+rowSize),y*rowSize);
            }
            context.putImageData(image,0,0);
            if(format!=="png"){
              const flattened=document.createElement("canvas");
              flattened.width=width;
              flattened.height=height;
              const flatContext=flattened.getContext("2d");
              if(!flatContext) throw new Error("No se pudo preparar el formato de imagen.");
              flatContext.fillStyle="#ffffff";
              flatContext.fillRect(0,0,width,height);
              flatContext.drawImage(output,0,0);
              dataUrl=flattened.toDataURL(mime,0.94);
            }else{
              dataUrl=output.toDataURL(mime);
            }
            if(!dataUrl||dataUrl.length<1000) throw new Error("La captura está vacía. Inténtalo de nuevo con el visor estable.");
          }finally{
            composer.renderToScreen=oldRenderToScreen;
            composer.setPixelRatio(oldComposerPixelRatio);
            composer.setSize(oldSize.x,oldSize.y);
            camara.aspect=oldCameraAspect;
            camara.updateProjectionMatrix();
            renderer.setClearColor(oldClearColor,oldClearAlpha);
            liveFastPathRef.current=oldLiveMode;
            aplicarPerfilLive();
            applyPostQuality?.(renderQuality);
            renderer.shadowMap.needsUpdate=true;
            invalidateRenderRef.current?.();
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
        const sourceLayerId = meta.rhinoLayerId ?? sourceAttrs.layerId ?? sourceAttrs.LayerId ?? null;
        const sourceLayerIndex = Number.isInteger(Number(meta.layerIndex)) && Number(meta.layerIndex) >= 0
          ? Number(meta.layerIndex)
          : Number.isInteger(Number(sourceAttrs.layerIndex)) && Number(sourceAttrs.layerIndex) >= 0
            ? Number(sourceAttrs.layerIndex) : null;
        const sourceLayerKey = String(meta.layerKey ?? "");
        const sourceLayerName = String(capa ?? sourceAttrs.layerName ?? sourceAttrs.LayerName ?? "").trim();
        const diagnosticMeshes:any[] = [];
        modelo?.traverse((mesh:any) => {
          if (!mesh?.isMesh || mesh.userData?.aurumInternalInclusion) return;
          const meshMeta = mesh.userData?.aurumRhino ?? {};
          const meshAttrs = mesh.userData?.attributes ?? {};
          const meshLayerName = String(meshMeta.capa ?? meshAttrs.layerName ?? meshAttrs.LayerName ?? "").trim();
          const meshLayerId = meshMeta.rhinoLayerId ?? meshAttrs.layerId ?? meshAttrs.LayerId ?? null;
          const meshLayerIndexRaw = meshMeta.layerIndex ?? meshAttrs.layerIndex ?? meshAttrs.LayerIndex;
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
              layerName: meshAttrs.layerName ?? meshAttrs.LayerName ?? null,
              layerId: meshAttrs.layerId ?? meshAttrs.LayerId ?? null,
              layerIndex: meshAttrs.layerIndex ?? meshAttrs.LayerIndex ?? null,
              materialIndex: meshAttrs.materialIndex ?? meshAttrs.MaterialIndex ?? null,
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
            metadataResolution: meta.metadataResolution ?? null, visible: obj.visible !== false,
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
              objectId: sourceAttrs.id ?? sourceAttrs.Id ?? null,
            },
          },
          counts: {
            totalMeshes: diagnosticMeshes.length, gemstoneMeshes: relatedGemMeshes.length,
            sameLayerMeshes: sameLayerMeshes.length,
            gemstoneMeshesOnSameLayer: sameLayerMeshes.filter((mesh:any) => mesh.category === "gema").length,
          },
          relatedGemMeshes: relatedGemMeshes.slice(0, 60),
          sameLayerMeshes: sameLayerMeshes.slice(0, 60),
          sourceLayerTable: (Array.isArray(modelo?.userData?.layers) ? modelo.userData.layers : []).map((layer:any,index:number) => ({
            index,
            name: layer?.name ?? layer?.Name ?? null,
            id: layer?.id ?? layer?.Id ?? null,
            color: layer?.color ? String(JSON.stringify(layer.color)) : layer?.Color ? String(JSON.stringify(layer.Color)) : null,
            visible: layer?.visible ?? layer?.Visible ?? layer?.isVisible ?? null,
            parentLayerId: layer?.parentLayerId ?? layer?.parentId ?? layer?.ParentLayerId ?? null,
            keys: Object.keys(layer ?? {}),
          })),
          sourceRootUserDataKeys: Object.keys(modelo?.userData ?? {}),
          metadataAudit: modelo?.userData?.aurumLayerMetadataAudit ?? null,
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
          updateTemporal?.(controles?.target ? camara.position.distanceTo(controles.target) : undefined);
          // Use the interactive WebGL path at rest as well as during orbit.
          // This avoids a visual handoff to a separate EffectComposer pipeline;
          // keep material/shader tuning separate until the result is visually checked.
          renderer.render(escena,camara);
          perfTick();
        },
        {
          progressiveFrames: 32,
          onStart: () => {
            // Interaction path: cap raster resolution and gem transmission cost.
            // These changes happen only at interaction boundaries, never per frame.
            liveFastPathRef.current = true;
            const interactionDpr = Math.max(0.75, Math.min(1, runtimeBudget.interactionPixelRatio));
            renderer.setPixelRatio(interactionDpr);
            composer?.setPixelRatio?.(interactionDpr);
            liveTransmissionScaleRef.current = runtimeBudget.interactionTransmissionScale;
            (renderer as any).transmissionResolutionScale = runtimeBudget.interactionTransmissionScale;
            aplicarPerfilLive();
            renderer.shadowMap.enabled = false;
            invalidateRenderRef.current?.();
          },
          onEnd: () => {
            // Keep the same LIVE material/shader profile after motion; only raise
            // raster resolution once the camera settles. This avoids a visual
            // handoff to different transmission, dispersion and gem-shader settings.
            const requestedDpr = Math.max(1, Math.min(2, renderQuality.pixelRatio));
            const idleDpr = Math.min(requestedDpr, runtimeBudget.pixelRatioCap);
            renderer.setPixelRatio(idleDpr);
            composer?.setPixelRatio?.(idleDpr);
            applyPostQuality?.({...renderQuality, pixelRatio:idleDpr, qualityId:measuredQualityId});
            liveFastPathRef.current = true;
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
    <div style={{position:"absolute",right:84,top:72,zIndex:40,width:270,maxHeight:"calc(100% - 88px)",overflowY:"auto",padding:14,borderRadius:14,background:"rgba(12,14,18,.94)",color:"#fff",boxShadow:"0 12px 35px rgba(0,0,0,.35)",border:"1px solid rgba(255,255,255,.10)",fontFamily:"Inter,system-ui"}}>
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
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-[#090b0e] text-white">
      <header className="flex h-[74px] shrink-0 items-center justify-between border-b border-white/10 bg-[#101316]/96 px-5 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <div className="leading-none">
            <div className="font-display text-[25px] tracking-[.22em] text-[#e5c77a]">AURUM</div>
            <div className="mt-1 text-[9px] uppercase tracking-[.18em] text-white/35">Render profesional para joyería · AURUM LIVE 2026-09-17</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex items-center gap-1 rounded-xl border border-white/10 bg-white/[.055] p-1">
            <button type="button" title="Restablecer vista" onClick={()=>apiRef.current?.reset()} className="hidden h-9 w-9 items-center justify-center rounded-lg text-white/75 hover:bg-white/10 hover:text-white md:flex"><RotateCcw className="size-[18px]"/></button>
            <button type="button" title="Zoom" onClick={()=>apiRef.current?.reset()} className="hidden h-9 w-9 items-center justify-center rounded-lg text-white/75 hover:bg-white/10 hover:text-white md:flex"><Maximize2 className="size-[18px]"/></button>
            <button type="button" title="Pantalla completa" onClick={()=>apiRef.current?.fullscreen()} className="hidden h-9 w-9 items-center justify-center rounded-lg text-white/75 hover:bg-white/10 hover:text-white md:flex"><Expand className="size-[18px]"/></button>
          </div>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[.07] px-3 text-sm text-white/85">
            <Gem className="size-4 text-white/80"/>
            <select value={vista} onChange={e=>setVista(e.target.value as VistaId)} className="bg-transparent outline-none">
              <option className="bg-[#111416]" value={VISTAS[0]?.id}>{VISTAS[0]?.nombre || "Vista 3D"}</option>
              {VISTAS.slice(1).map(v=><option className="bg-[#111416]" key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
            <ChevronDown className="pointer-events-none -ml-1 size-4 text-white/50"/>
          </label>
          <button type="button" onClick={()=>setExportOpen(v=>!v)} className="flex h-10 items-center gap-2 rounded-xl border border-[#d4af37]/35 bg-[#d4af37]/10 px-3 text-sm font-medium text-[#f0d58b] hover:bg-[#d4af37]/20"><Download className="size-4"/> Exportar</button>
          <div className="hidden text-[11px] uppercase tracking-[.12em] text-white/65 lg:block">Taller del Joyero</div>
          <div className="grid size-10 place-items-center rounded-full border border-white/10 text-white/80"><span className="text-lg">♙</span></div>
        </div>
      </header>

      {exportOpen&&<div className="absolute right-5 top-[82px] z-[80] w-[290px] rounded-2xl border border-white/10 bg-[#171a1e]/[.98] p-4 shadow-2xl backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between"><div><div className="text-sm font-semibold text-white">Exportación AURUM</div><div className="mt-1 text-[10px] text-white/45">Descarga para comparar con iJewel</div></div><button type="button" aria-label="Cerrar exportación" onClick={()=>setExportOpen(false)} className="rounded-lg p-1 text-white/50 hover:bg-white/10"><X className="size-4"/></button></div>
        <div className="space-y-2">
          <button type="button" disabled={!archivo||exportBusy} onClick={async()=>{setExportBusy(true);try{await apiRef.current?.exportGLB();}catch(e){setError(e instanceof Error?e.message:"No se pudo exportar el GLB.");}finally{setExportBusy(false);}}} className="flex w-full items-center gap-3 rounded-xl bg-[#7168f4] px-3 py-3 text-left text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Gem className="size-5"/><span><span className="block">Descargar modelo .glb</span><span className="block text-[10px] font-normal text-white/70">Geometría y materiales exportables</span></span></button>
          <button type="button" onClick={()=>setSnapshotOpen(v=>!v)} aria-expanded={snapshotOpen} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-left text-sm text-white hover:bg-white/[.08]"><ImageIcon className="size-5"/><span className="min-w-0 flex-1"><span className="block">Snapshot de producto</span><span className="block text-[10px] text-white/45">Resolución y formato de imagen</span></span><ChevronDown className={"size-4 transition-transform "+(snapshotOpen?"rotate-180":"")}/></button>
          {snapshotOpen&&<div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-white/50">Salida de imagen</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] text-white/55">Ancho (px)<input type="number" min={320} max={4096} step={160} value={snapshotWidth} onChange={e=>setSnapshotWidth(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-[#111518] px-2 py-2 text-xs text-white outline-none focus:border-[#7168f4]"/></label>
              <label className="text-[10px] text-white/55">Alto (px)<input type="number" min={320} max={4096} step={120} value={snapshotHeight} onChange={e=>setSnapshotHeight(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-[#111518] px-2 py-2 text-xs text-white outline-none focus:border-[#7168f4]"/></label>
            </div>
            <label className="mt-2 block text-[10px] text-white/55">Formato
              <select value={snapshotFormat} onChange={e=>setSnapshotFormat(e.target.value as "png"|"jpeg"|"webp")} className="mt-1 w-full rounded-lg border border-white/15 bg-[#111518] px-2 py-2 text-xs text-white outline-none focus:border-[#7168f4]">
                <option value="png">PNG · máxima compatibilidad</option><option value="jpeg">JPEG · fotografía ligera</option><option value="webp">WebP · archivo optimizado</option>
              </select>
            </label>
            <div className="mt-2 text-[10px] leading-relaxed text-white/35">La captura vuelve a renderizar la joya a la resolución elegida y usa fondo blanco.</div>
            <button type="button" disabled={!archivo||exportBusy} onClick={()=>{setExportBusy(true);try{apiRef.current?.exportPNG({width:Number(snapshotWidth),height:Number(snapshotHeight),format:snapshotFormat});setSnapshotOpen(false);}catch(e){setError(e instanceof Error?e.message:"No se pudo generar la imagen.");}finally{setExportBusy(false);}}} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#7168f4] px-3 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Download className="size-4"/>Descargar {snapshotFormat.toUpperCase()} · {snapshotWidth||"1920"} × {snapshotHeight||"1080"}</button>
          </div>}
          <button type="button" onClick={()=>apiRef.current?.exportSceneSettings()} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-left text-sm text-white hover:bg-white/[.08]"><FileJson className="size-5"/><span><span className="block">Configuración .vjson</span><span className="block text-[10px] text-white/45">Escena, cámara, calidad y selección</span></span></button>
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-white/40">El GLB exporta el modelo y sus materiales compatibles con glTF. Los shaders personalizados, el HDRI y los efectos de pantalla pueden no reproducirse idénticos en otros visores.</p>
      </div>}
      <div className="flex min-h-0 flex-1">
        <aside className="w-[336px] shrink-0 border-r border-white/10 bg-[#111518] shadow-2xl">
          <div className="h-full overflow-y-auto">
            <section className="border-b border-white/10 px-5 py-2">
              <button type="button" onClick={()=>setUxSection(uxSection==="materiales"?"": "materiales")} className="flex w-full items-center justify-between py-4 text-left text-[15px] font-medium">
                <span className="flex items-center gap-2"><ChevronDown className={"size-4 transition-transform "+(uxSection==="materiales"?"rotate-0":"-rotate-90")}/><span>Materiales</span></span>
                <span className="text-[9px] uppercase tracking-[.14em] text-white/25">{MATERIALES.length}</span>
              </button>
              {uxSection==="materiales"&&<div className="pb-5">
                <div className="grid grid-cols-4 gap-2.5 pb-1">
                  {MATERIALES.map(m=><button key={m.id} type="button" title={m.nombre} aria-label={m.nombre}
                    onClick={()=>{setBibliotecaTipo("metales");setMaterialId(m.id);apiRef.current?.material(m)}}
                    className={"group relative flex flex-col items-center rounded-xl p-1.5 transition "+(materialId===m.id?"bg-white/[.06]":"hover:bg-white/[.04]")}>
                    <span className={"relative grid size-12 place-items-center rounded-full border-2 transition "+(materialId===m.id?"border-[#d4af37] shadow-[0_0_14px_rgba(212,175,55,.35)]":"border-white/10 group-hover:border-white/30")}>
                      <span className="size-10 rounded-full shadow-[inset_-5px_-6px_9px_rgba(0,0,0,.45),inset_5px_4px_8px_rgba(255,255,255,.35),0_3px_8px_rgba(0,0,0,.45)]"
                        style={{background:`radial-gradient(circle at 32% 27%,rgba(255,255,255,.78) 0 6%,rgba(255,255,255,.18) 17%,transparent 34%),linear-gradient(145deg,rgba(255,255,255,.42),transparent 34%),${hexColor(m.color)}`}}/>
                    </span>
                    <span className="mt-1.5 w-full truncate text-center text-[8px] text-white/65">{m.nombre}</span>
                  </button>)}
                </div>
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.025] p-2">
                  <span className="size-8 shrink-0 rounded-full border border-white/20 shadow-inner" style={{background:hexColor(materialActivo.color)}}/>
                  <p className="truncate text-[10px] text-white/65">{materialActivo.nombre}</p>
                </div>
              </div>}
            </section>

            <section className="border-b border-white/10 px-5 py-2">
              <button type="button" onClick={()=>setUxSection(uxSection==="gemas"?"":"gemas")} className="flex w-full items-center justify-between py-4 text-left text-[15px] font-medium">
                <span className="flex items-center gap-2"><ChevronDown className={"size-4 transition-transform "+(uxSection==="gemas"?"rotate-0":"-rotate-90")}/><span>Gemas</span></span>
                <span className="text-[9px] uppercase tracking-[.14em] text-white/25">{GEMAS.length}</span>
              </button>
              {uxSection==="gemas"&&<div className="pb-5">
                <div className="grid grid-cols-4 gap-2.5 pb-1">
                  {GEMAS.map(g=><button key={g.id} type="button" title={g.nombre} aria-label={g.nombre}
                    onClick={()=>{setBibliotecaTipo("gemas");setGemaId(g.id);apiRef.current?.gema(g)}}
                    className={"group relative flex flex-col items-center rounded-xl p-1.5 transition "+(gemaId===g.id?"bg-white/[.06]":"hover:bg-white/[.04]")}>
                    <span className={"relative grid size-12 place-items-center rounded-full border-2 transition "+(gemaId===g.id?"border-[#d4af37] shadow-[0_0_14px_rgba(212,175,55,.35)]":"border-white/10 group-hover:border-white/30")}>
                      <span className="relative size-10 overflow-hidden rounded-full shadow-[inset_-4px_-5px_9px_rgba(0,0,0,.5),inset_4px_3px_8px_rgba(255,255,255,.28),0_3px_8px_rgba(0,0,0,.5)]"
                        style={{background:`radial-gradient(circle at 30% 24%,rgba(255,255,255,.82) 0 5%,rgba(255,255,255,.18) 12%,transparent 28%),conic-gradient(from 20deg,rgba(255,255,255,.28),transparent 12%,rgba(0,0,0,.18) 25%,rgba(255,255,255,.22) 38%,transparent 52%,rgba(0,0,0,.2) 67%,rgba(255,255,255,.24) 82%,transparent),${hexColor(g.color)}`}}/>
                    </span>
                    <span className="mt-1.5 w-full truncate text-center text-[8px] text-white/65">{g.nombre}</span>
                  </button>)}
                </div>
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.025] p-2">
                  <span className="size-8 shrink-0 rounded-full border border-white/20 shadow-inner" style={{background:hexColor(gemaActiva.color)}}/>
                  <p className="truncate text-[10px] text-white/65">{gemaActiva.nombre}</p>
                </div>
              </div>}
            </section>

            <section className="border-b border-white/10 px-5 py-2">
              <button type="button" onClick={()=>setUxSection(uxSection==="escena"?"":"escena")} className="flex w-full items-center justify-between py-4 text-left text-[15px] font-medium">
                <span className="flex items-center gap-2"><ChevronDown className={"size-4 transition-transform "+(uxSection==="escena"?"rotate-0":"-rotate-90")}/><span>Escenas</span></span>
                <span className="text-[9px] uppercase tracking-[.14em] text-white/25">{ESCENARIOS.length}</span>
              </button>
              {uxSection==="escena"&&<div className="grid grid-cols-3 gap-3 pb-5">
                {ESCENARIOS.map(e=><button key={e.id} type="button" onClick={()=>{setEscenarioId(e.id)}} className={"group text-center "+(escenarioId===e.id?"text-white":"text-white/75")}>
                  <span className={"block aspect-[1.18] overflow-hidden rounded-xl border-2 transition "+(escenarioId===e.id?"border-[#34c7ff] shadow-[0_0_18px_rgba(52,199,255,.12)]":"border-transparent group-hover:border-white/20")}><span className={"block h-full w-full "+e.clase}/></span>
                  <span className="mt-2 block text-[10px]">{e.nombre}</span>
                </button>)}
              </div>}
            </section>
            <div className="px-5 pb-6">
              <button type="button" onClick={()=>setPanel("iluminacion")} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[.035] px-3 py-3 text-left hover:border-[#d4af37]/40">
                <span><span className="block text-[9px] uppercase tracking-[.16em] text-white/35">Más control</span><span className="mt-1 block text-xs text-white/75">Iluminación y render</span></span>
                <SlidersHorizontal className="size-4 text-[#d4af37]"/>
              </button>
            </div>
          </div>
        </aside>

        <main className="relative min-w-0 flex-1 bg-[#090b0e]">
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
            {parteSeleccionada&&diagnosticoSeleccion&&<div className="absolute left-3 top-3 z-30 w-[min(430px,calc(100%-24px))] max-h-[78%] overflow-y-auto rounded-xl border border-[#d4af37]/50 bg-[#101214]/95 p-3 text-[10px] leading-relaxed text-white shadow-2xl backdrop-blur-xl">
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
                <div className="break-all"><span className="text-white/45">layerId:</span> {String(diagnosticoSeleccion.selected.layerId??"NO DISPONIBLE")} <span className="text-white/45">· layerIndex:</span> {String(diagnosticoSeleccion.selected.layerIndex??"NO DISPONIBLE")}</div>
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
              <details className="mt-2 rounded-lg border border-white/10 p-2">
                <summary className="cursor-pointer font-semibold text-[#d4af37]">Claves del objeto raíz / auditoría GLB</summary>
                <pre className="mt-1 whitespace-pre-wrap break-all text-[9px] text-white/65">{JSON.stringify({rootUserDataKeys:diagnosticoSeleccion.sourceRootUserDataKeys,metadataAudit:diagnosticoSeleccion.metadataAudit},null,2)}</pre>
              </details>
              <details className="mt-2 rounded-lg border border-white/10 p-2">
                <summary className="cursor-pointer font-semibold text-[#d4af37]">Última asignación de gema</summary>
                <pre className="mt-1 whitespace-pre-wrap break-all text-[9px] text-white/65">{JSON.stringify(diagnosticoSeleccion.existingAssignment,null,2)}</pre>
              </details>
            </div>}
            {archivo&&<div className="absolute right-16 top-3 z-20 max-w-[45%] truncate rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-[10px] text-white/60 backdrop-blur">{archivo} <span className="ml-2 text-[#d4af37]/80">· GLB interno</span></div>}

            <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/10 bg-[#111416]/85 px-3 py-2 shadow-2xl backdrop-blur-xl">
              <span className="px-2 text-[10px] text-white/70">◉ &nbsp;Órbita</span><span className="px-2 text-[10px] text-white/70">✋ &nbsp;Pan</span><span className="px-2 text-[10px] text-white/70">⌕ &nbsp;Zoom</span><button type="button" onClick={()=>apiRef.current?.reset()} className="px-2 text-[10px] text-white/70 hover:text-white">⌗ &nbsp;Ajustar</button>
            </div>
            <div className="absolute bottom-6 right-6 z-20 flex gap-1 rounded-xl border border-white/10 bg-white/65 p-1 text-black/55 backdrop-blur">
              <span className="rounded-lg border border-black/10 px-2 py-1 text-[9px]">HDRI</span><span className="rounded-lg border border-black/10 px-2 py-1 text-[9px]">PBR</span><span className="rounded-lg border border-black/10 px-2 py-1 text-[9px]">4K</span>
              <button type="button" onClick={()=>apiRef.current?.fullscreen()} className="grid size-7 place-items-center rounded-lg bg-[#17191c] text-white"><Expand className="size-3.5"/></button>
            </div>

            <div className="absolute right-5 top-1/2 z-30 -translate-y-1/2">
              <div className="flex flex-col items-center gap-1 rounded-2xl border border-[#d4af37]/75 bg-white/90 p-1.5 shadow-[0_0_10px_rgba(212,175,55,.5),0_12px_35px_rgba(0,0,0,.18)]">
                <button type="button" title="Calidad de render" onClick={()=>setQualityOpen(v=>!v)} className={"grid size-10 place-items-center rounded-xl "+(qualityOpen?"bg-[#d4af37]/15 text-[#d4af37]":"text-black/70 hover:bg-black/5")}><Sparkles className="size-[18px]"/></button>
                <button type="button" title="Reiniciar cámara" onClick={()=>apiRef.current?.reset()} className="grid size-10 place-items-center rounded-xl text-black/70 hover:bg-black/5"><RotateCcw className="size-[18px]"/></button>
                <button type="button" title="Pantalla completa" onClick={()=>apiRef.current?.fullscreen()} className="grid size-10 place-items-center rounded-xl text-black/70 hover:bg-black/5"><Expand className="size-[18px]"/></button>
                <div className="my-0.5 h-px w-6 bg-black/10"/>
              </div>
            </div>

            {qualityOpen&&<div className="absolute right-[78px] top-1/2 z-40 w-48 -translate-y-1/2 rounded-xl border border-[#d4af37]/50 bg-[#111416]/96 p-2 text-white shadow-2xl backdrop-blur-xl">
              <div className="px-2 pb-2 text-[8px] font-semibold uppercase tracking-[.18em] text-white/35">Calidad de render</div>
              {([["low","Baja","Vista rápida"],["high","Alta","Producción"],["ultra","Ultra","Máximo detalle"]] as const).map(([id,nombre,desc])=><button key={id} type="button" onClick={()=>cambiarCalidad(id)} className={"mb-1 w-full rounded-lg border px-2.5 py-2 text-left "+(renderQualityId===id?"border-[#d4af37]/60 bg-[#d4af37]/10":"border-white/10 bg-white/[.03]")}><span className="block text-[10px] font-semibold">{nombre}</span><span className="text-[8px] text-white/40">{desc}</span></button>)}
            </div>}
            {lightingOpen && lightingPanel}
          </div>
        </main>
      </div>
    </div>
  </>);
}
