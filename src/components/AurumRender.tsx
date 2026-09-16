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
import { applyAurumCameraView } from "../lib/aurum/camera";
import { prepareAurumModel } from "../lib/aurum/model-prep";
import { createAurumPostPipeline } from "../lib/aurum/post";
import { createAurumEnvironment } from "../lib/aurum/environment";
import { createAurumGemEnvironment } from "../lib/aurum/gem-environment";
import { createAurumSceneController } from "../lib/aurum/scene";
import { createAurumGround } from "../lib/aurum/ground";
import { clearAurumInclusions, renderAurumInclusions } from "../lib/aurum/gems";
import { createAurumLightingController } from "../lib/aurum/lighting";
import { frameAurumProduct, disposeAurumViewer, createAurumWebGLViewer, startAurumViewerLoop } from "../lib/aurum/viewer";
import { parseAurumInput, convertAurumToGlb } from "../lib/aurum/model-loader";
import { getAurumModelParts } from "../lib/aurum/model-parts";
import { applyAurumMaterialToModel, applyAurumGemToTarget, clearAurumGemFromTarget } from "../lib/aurum/material-application";
import { normalizeAurumModel } from "../lib/aurum/model-normalizer";
import { applyAurumInitialModelMaterials } from "../lib/aurum/model-materials";
import { createAurumApi } from "../lib/aurum/api";
import { createAurumConfiguratorState } from "../lib/aurum/configurator-state";
import { Camera, ChevronDown, Expand, Gem, Image as ImageIcon, Maximize2, RotateCcw, RotateCw, SlidersHorizontal, Sparkles, Upload, X } from "lucide-react";

import { GEMAS, MATERIALES, ESCENARIOS, VISTAS, ILUMINACIONES, type MaterialId, type EscenarioId, type VistaId, type IluminacionId, type MaterialGrupo, type CategoriaParte, type GemaId, type GemaConfig, type MaterialConfig, type ParteModelo } from "../lib/aurum/catalog";

const normalizarTexto = (v:any) => String(v ?? "").trim().toLowerCase();
const colorRhinoHex = (c:any): string | undefined => {
  if (!c) return undefined;
  const r = Number(c.r ?? c.R), g = Number(c.g ?? c.G), b = Number(c.b ?? c.B);
  if (![r,g,b].every(Number.isFinite)) return undefined;
  return "#" + [r,g,b].map(n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,"0")).join("");
};
const clasificarCapa = (nombre:string, color?:string): CategoriaParte => {
  const n = normalizarTexto(nombre);
  if (/(piedra|gema|diamante|zafiro|rubi|rubí|esmeralda|moissanita|citrino|amatista|topacio)/.test(n)) return "gema";
  if (/(metal|oro|plata|platino|metalico|metálico)/.test(n)) return "metal";
  if (color) {
    const m = color.match(/^#([0-9a-f]{6})$/i);
    if (m) {
      const x=parseInt(m[1]!,16), rr=(x>>16)&255, gg=(x>>8)&255, bb=x&255;
      if (gg > rr*1.15 && gg > bb*1.15 && gg > 90) return "metal";
      if (bb > rr*1.15 && bb > gg*1.05 && bb > 90) return "gema";
    }
  }
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
  const [renderQualityId, setRenderQualityId] = useState<AurumRenderQualityId>("high");
  const composerRef = useRef<any>(null);
  const frameRef = useRef<number | null>(null);
  const [lightingStudio, setLightingStudio] = useState<any>(() => ({...AURUM_LIGHTING_DEFAULT}));
  const lucesRef = useRef<((patch:any)=>void)|null>(null);
  const [, refrescarLuces] = useState(0);
  const actualizarLucesAurum = useCallback((patch:any) => {
    lucesRef.current?.(patch);
    refrescarLuces(n=>n+1);
  }, []);
  const apiRef = useRef<any>(null);
  const [archivo, setArchivo] = useState<string|null>(null), [cargando, setCargando] = useState(false), [error, setError] = useState<string|null>(null), [paso, setPaso] = useState<string|null>(null), [formatoInterno, setFormatoInterno] = useState<string|null>(null);
  const [materialId, setMaterialId] = useState<MaterialId>("plata925_pulida"), [gemaId, setGemaId] = useState<GemaId>("diamante_natural"), [escenarioId, setEscenarioId] = useState<EscenarioId>("producto"), [iluminacionId, setIluminacionId] = useState<IluminacionId>("studioSoft"), [vista, setVista] = useState<VistaId>("perspectiva");
  const [nombreProyecto, setNombreProyecto] = useState("Diseño de joyería");
  const [categoriaProyecto, setCategoriaProyecto] = useState("Anillo");
  const categoriaProyectoRef = useRef("Anillo");
  categoriaProyectoRef.current = categoriaProyecto;
  const [captura, setCaptura] = useState<string | null>(null);
  const [parteSeleccionada, setParteSeleccionada] = useState<string | null>(null);
  const [parteSeleccionadaNombre, setParteSeleccionadaNombre] = useState<string | null>(null);
  const [parteSeleccionadaCapa, setParteSeleccionadaCapa] = useState<string | null>(null);
  const [parteSeleccionadaCategoria, setParteSeleccionadaCategoria] = useState<"metal" | "gema" | "otro">("otro");
  const [panel, setPanel] = useState<"materiales" | "escenas" | "iluminacion">("materiales");
  const [uxSection, setUxSection] = useState<"materiales"|"gemas"|"escena">("materiales");
  const abrirSeccion = useCallback((seccion: "materiales"|"gemas"|"escena") => {
    setUxSection(seccion);
  }, []);
  // La biblioteca del visor muestra el catálogo completo para evitar clics innecesarios.
  // Los desplegables siguen controlando qué familia está abierta.
  const [mostrarTodasEscenas, setMostrarTodasEscenas] = useState(true);

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
      const { RGBELoader } = await import("three/examples/jsm/loaders/RGBELoader.js");
      const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
      const nodo = visorRef.current;      if (!vivo || !nodo) return;
      let renderQuality = getAurumRenderQuality(renderQualityId);
      const { scene: escena, camera: camara, renderer, controls: controles } = createAurumWebGLViewer(THREE, nodo, {
        pixelRatio: renderQuality.pixelRatio,
        maxDistance: 100,
        controlsClass: (await import("three/examples/jsm/controls/OrbitControls.js")).OrbitControls,
      });
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
      renderer.shadowMap.autoUpdate = true;
      renderer.domElement.className = "block h-full w-full";
      nodo.appendChild(renderer.domElement);
      const postRuntimeConfig = { ...ssaoConfig, ...postConfig };
      const { composer, ssaoPass, applyQuality: applyPostQuality, updateTemporal } = await createAurumPostPipeline(
        renderer,
        escena,
        camara,
        postRuntimeConfig,
        renderQuality
      );

      const environmentController = createAurumEnvironment(renderer, escena, THREE, RoomEnvironment, RGBELoader);
      let entorno = environmentController.current;
      // El EnvironmentController es la única autoridad para HDRI,
      // intensidad y rotación. El componente no escribe estado de entorno directamente.
      // Biblioteca HDRI profesional centralizada en el motor fotográfico.
      // El mapa de entorno y el GemEnvironment son independientes: el metal
      // necesita bandas de reflexión controladas y la gema necesita un entorno
      // óptico limpio para refracción/dispersion.
      const gemEnvironmentController = createAurumGemEnvironment(environmentController, RGBELoader);
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
          }
        );
      };

      // El escenario inicial selecciona su propio Environment HDRI.

      let modelo:any = null;
      const lightingController = createAurumLightingController(THREE, escena, lightingStudio, shadowConfig, renderQuality);
      const lucesAurum = (lightingController as any).lights ?? {};

      // Render Quality changes the actual GPU workload, not just a label:
      // drawing-buffer resolution, shadow-map precision and gem transmission
      // resolution are updated together. EffectComposer receives the same DPR.
      const aplicarCalidadRender = (id:AurumRenderQualityId) => {
        renderQuality = getAurumRenderQuality(id);
        // Quality is an intentional render scale. Do not clamp it to devicePixelRatio:
        // otherwise Alta/Ultra are almost identical to Baja on a 1x monitor.
        const dpr = Math.max(1, Math.min(2, renderQuality.pixelRatio));
        renderer.setPixelRatio(dpr);
        composer?.setPixelRatio?.(dpr);
        applyPostQuality?.(renderQuality);
        (renderer as any).transmissionResolutionScale = renderQuality.transmissionScale;
        renderer.shadowMap.enabled = renderQuality.shadows;
        lightingController.create();
        // Existing shadow maps must be rebuilt at the selected precision.
        Object.values(lucesAurum).forEach((light:any) => {
          if (light?.shadow?.map) {
            light.shadow.map.dispose?.();
            light.shadow.map = null;
          }
        });
        lightingController.create();
        setRenderQualityId(id);
      };
      const actualizarLucesAurum = (patch:any) => lightingController.update(patch);
      lucesRef.current = actualizarLucesAurum;
      // Inicializar las luces configurables desde el arranque del visor.
      lightingController.create();

      const aplicarIluminacion = (id:IluminacionId) => {
        lightingController.applyPreset(id);
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
      const presetInicial = sceneController.apply("producto");
      const photoInicial = getAurumPhotographicProfile("producto");
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
        bloom: photoInicial.post.bloom,
        bloomIntensity: photoInicial.post.bloomIntensity,
        bloomThreshold: photoInicial.post.bloomThreshold,
        lut: photoInicial.post.lut,
        lutIntensity: photoInicial.post.lutIntensity,
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

      let glbInterno:Blob|null = null;
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
      const quitar = () => {        if (modelo) { escena.remove(modelo); dispose(modelo); modelo=null; }
        if (suelo) { escena.remove(suelo); suelo.geometry.dispose(); suelo.material.dispose(); suelo=null; }
        glbInterno = null;
      };
      const configurarMaterial = (mat:any, m:MaterialConfig) => {
        applyAurumMetal(mat, metalPresetFromConfig(m));
      };
      const limpiarInclusiones = (target:any) => clearAurumGemFromTarget(target);
      const crearInclusiones = (target:any, g:GemaConfig) => renderAurumInclusions(THREE,target,g,9173);
      const aplicarGema = (g:GemaConfig, objetivo?:any) => {
        const target=objetivo||parteActiva;
        applyAurumGemToTarget(target,g,aplicarEntornoGema);
      };
      const aplicarMaterial = (m:MaterialConfig) => {
        if (!modelo) {
          configurarMaterial(material, m);
          return;
        }
        applyAurumMaterialToModel(modelo, parteActiva, m, material);
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
          bloom: photo.post.bloom,
          bloomIntensity: photo.post.bloomIntensity,
          bloomThreshold: photo.post.bloomThreshold,
          lut: photo.post.lut,
          lutIntensity: photo.post.lutIntensity,
          taa: photo.post.taa,
          dof: photo.post.dof,
          dofAperture: photo.post.dofAperture,
          dofMaxBlur: photo.post.dofMaxBlur,
          vignette: photo.post.vignette,
          vignetteDarkness: photo.post.vignetteDarkness,
        });
        applyPostQuality?.(renderQuality);
      };
       const encuadrar = () => {
        if (!modelo) return;
        // ModelPreparation + Camera/Lighting se coordinan desde el adaptador de framing.
        // Mantener esta llamada como único punto de encuadre evita duplicar transformaciones.
        frameAurumProduct({
          camera: camara, controls: controles, lights: lucesAurum,
          groundController, lightingController, scene: escena, renderer,
        }, modelo, prepareAurumModel, aplicarEscenario, escenarioId);
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
        // Rhino trabaja con Z como eje vertical, mientras que AURUM RENDER/Three.js        // usa Y como eje vertical. Convertimos únicamente los 3DM para conservar
        // la orientación "de pie" con la que el modelo fue diseñado en Rhino.
        if (ext==="3dm") {
          objeto.rotation.x = -Math.PI / 2;
          objeto.updateMatrixWorld(true);
        }
        informar("Convirtiendo a GLB...");
        const glb = await convertAurumToGlb(objeto);
        informar("Preparando visualización...");
        const interno = await normalizeAurumModel(
          objeto, glb, ext, colorRhinoHex, clasificarCapa
        );
        quitar();
        applyAurumInitialModelMaterials(interno,{
          gems:GEMAS,
          metals:MATERIALES,
          fallbackMaterial:material,
          applyGem:applyAurumGem,
          gemPresetFromConfig,
          configureMetal:configurarMaterial,
          createInclusions:crearInclusiones,
          applyGemEnvironment:aplicarEntornoGema,
          initialMetalId:"plata925_pulida",
          initialGemId:"diamante_natural",
          presentation:{metalEnvironmentScale:1,metalClearcoatScale:.9},
        });
        modelo=interno;
        // Presentación inicial determinista: producto + studioSoft + framing.
        // iJewel separates scene, camera and material configuration; Aurum does
        // the same at load time so the user sees a finished product preview.
        const presetProducto = sceneController.apply("producto");
        lightingController.applyPreset(presetProducto.lighting);
        calibrarReflejosMetalEscena(getAurumPhotographicProfile("producto"));
        encuadrar();
        setVista("perspectiva");
        // Si el GemEnvironment ya terminó de cargar, aplicarlo ahora al modelo.
        // Si todavía está en red, su callback lo aplicará al terminar.
        if (entornoGema) aplicarEntornoGema();
        setParteSeleccionada(null);
        setParteSeleccionadaNombre(null); setParteSeleccionadaCapa(null); setParteSeleccionadaCategoria("otro");
        parteActiva=null;
        limpiarResaltado();
        glbInterno=new Blob([glb],{type:"model/gltf-binary"});
        escena.add(modelo);
        if (ext!=="3dm") aplicarMaterial(materialActivo);
        // Presentación inicial: encuadrar siempre después de añadir el modelo.
        encuadrar();
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
        reset:()=>{ controles.autoRotate=false; encuadrar(); },
        autoRotar:(activo:boolean)=>{ controles.autoRotate=activo; controles.autoRotateSpeed=0.65; },
        capturar:()=>{composerRef.current?.render();return renderer.domElement.toDataURL("image/png")},
        limpiar:()=>{quitar();parteActiva=null;limpiarResaltado();setParteSeleccionada(null);setParteSeleccionadaNombre(null);},
        partes:()=>modelo?obtenerPartes(modelo):[],
        seleccionarParte:(id:string)=>{
          if (!id) { parteActiva=null; setParteSeleccionada(null); setParteSeleccionadaNombre(null); limpiarResaltado(); return; }
          let encontrado:any=null;
          modelo?.traverse((x:any)=>{if(x.uuid===id) encontrado=x;});
          if(encontrado) seleccionarMalla(encontrado);
        },
        fullscreen:()=>nodo.requestFullscreen?.(),
        vista:camaraVista,
        calidad:aplicarCalidadRender,
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
        // La selección de una capa gobierna directamente la familia visible.
        // Una capa de metal abre Material; una capa de piedra/gema abre Gemas.
        // No basta con cambiar bibliotecaTipo: la UI se renderiza con uxSection.
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
      };
      renderer.domElement.addEventListener("click", seleccionarPorClick);

      const viewerLoop = startAurumViewerLoop(
        { node:nodo, camera:camara, renderer, composer, ssaoPass, controls:controles },
        () => {
          updateTemporal?.(controles?.target ? camara.position.distanceTo(controles.target) : undefined);
          if (composer) composer.render(); else renderer.render(escena,camara);
        }
      );
      frameRef.current = viewerLoop.frame;
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
      };

      // startAurumViewerLoop ya inicia el RAF/render loop.
      // No llamar a un animate() local inexistente: provocaba "animate is not defined".
    })().catch(e=>vivo&&setError(e?.message||"No se pudo iniciar AURUM RENDER"));
    return()=>{
    vivo=false;
    if(frameRef.current!==null){
      cancelAnimationFrame(frameRef.current);
      frameRef.current=null;
    }
    apiRef.current=null;
    composerRef.current=null;
    cleanup();
  };
  },[]);
  useEffect(()=>apiRef.current?.material(materialActivo),[materialActivo]);
  useEffect(()=>apiRef.current?.escenario(escenarioId),[escenarioId]);
  useEffect(()=>apiRef.current?.iluminacion(iluminacionId),[iluminacionId]);
  useEffect(()=>apiRef.current?.vista(vista),[vista]);

  const cargarArchivo=useCallback(async(file:File)=>{setCargando(true);setError(null);setPaso("Procesando archivo...");try{await apiRef.current?.cargar(file,(p:string)=>setPaso(p));setArchivo(file.name);setFormatoInterno("GLB");setCaptura(null)}catch(e){setError(e instanceof Error?e.message:"No se pudo convertir el modelo");setArchivo(null);setFormatoInterno(null)}finally{setCargando(false);setPaso(null)}},[]);
  const limpiar=()=>{apiRef.current?.limpiar();setArchivo(null);setFormatoInterno(null);setCaptura(null);setPaso(null);if(fileRef.current)fileRef.current.value=""};
  const capturarImagen=()=>{const d=apiRef.current?.capturar();if(d)setCaptura(d)};
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
            <div className="font-display text-[25px] tracking-[.18em] text-[#e5c77a]">AURUM RENDER</div>
            <div className="mt-1 text-[9px] uppercase tracking-[.18em] text-white/35">Render profesional para joyería</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 rounded-xl border border-white/10 bg-white/[.055] p-1 md:flex">
            <button type="button" title="Capturar" onClick={capturarImagen} className="grid size-9 place-items-center rounded-lg text-white/75 hover:bg-white/10 hover:text-white"><Camera className="size-[18px]"/></button>
            <button type="button" title="Restablecer vista" onClick={()=>apiRef.current?.reset()} className="grid size-9 place-items-center rounded-lg text-white/75 hover:bg-white/10 hover:text-white"><RotateCcw className="size-[18px]"/></button>
            <button type="button" title="Zoom" onClick={()=>apiRef.current?.reset()} className="grid size-9 place-items-center rounded-lg text-white/75 hover:bg-white/10 hover:text-white"><Maximize2 className="size-[18px]"/></button>
            <button type="button" title="Pantalla completa" onClick={()=>apiRef.current?.fullscreen()} className="grid size-9 place-items-center rounded-lg text-white/75 hover:bg-white/10 hover:text-white"><Expand className="size-[18px]"/></button>
          </div>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[.07] px-3 text-sm text-white/85">
            <Gem className="size-4 text-white/80"/>
            <select value={vista} onChange={e=>setVista(e.target.value as VistaId)} className="bg-transparent outline-none">
              <option className="bg-[#111416]" value={VISTAS[0]?.id}>{VISTAS[0]?.nombre || "Vista 3D"}</option>
              {VISTAS.slice(1).map(v=><option className="bg-[#111416]" key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
            <ChevronDown className="pointer-events-none -ml-1 size-4 text-white/50"/>
          </label>
          <div className="hidden text-[11px] uppercase tracking-[.12em] text-white/65 lg:block">Taller del Joyero</div>
          <div className="grid size-10 place-items-center rounded-full border border-white/10 text-white/80"><span className="text-lg">♙</span></div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-[336px] shrink-0 border-r border-white/10 bg-[#111518] shadow-2xl">
          <div className="h-full overflow-y-auto">
            <section className="border-b border-white/10 px-5 py-5">
              <button type="button" aria-expanded={uxSection==="materiales"} onClick={()=>abrirSeccion("materiales")} className={"mb-4 flex w-full items-center justify-between text-left text-[16px] font-medium "+(uxSection==="materiales"?"text-white":"text-white/55")}>
                <span className="flex items-center gap-2"><ChevronDown className={"size-4 transition-transform "+(uxSection==="materiales"?"":"-rotate-90")}/><span>Material</span><span className="text-[10px] font-normal text-white/30">{MATERIALES.filter(m=>m.grupo!=="Especiales").length}</span></span>
                <span className={"text-[9px] uppercase tracking-[.12em] "+(uxSection==="materiales"?"text-[#d4af37]":"text-white/25")}>{uxSection==="materiales"?"Abierto":"Abrir"}</span>
              </button>
              {uxSection==="materiales"&&<div className="grid grid-cols-5 gap-2">
                {MATERIALES.map(m=><button key={m.id} type="button" title={m.nombre} onClick={()=>{abrirSeccion("materiales");setBibliotecaTipo("metales");setMaterialId(m.id);apiRef.current?.material(m)}} className={"group text-center "+(materialId===m.id?"text-white":"text-white/70")}>
                  <span className={"mx-auto grid size-[58px] place-items-center rounded-xl border-2 transition "+(materialId===m.id?"border-[#34c7ff] bg-white/10 shadow-[0_0_18px_rgba(52,199,255,.12)]":"border-white/10 bg-white/[.05] group-hover:border-white/25")}><span className="size-9 rounded-full border border-white/25 shadow-inner" style={{background:hexColor(m.color)}}/></span>
                  <span className="mt-2 block truncate text-[10px]">{m.nombre}</span>
                </button>)}

              </div>}
            </section>

            <section className="border-b border-white/10 px-5 py-5">
              <button type="button" aria-expanded={uxSection==="gemas"} onClick={()=>abrirSeccion("gemas")} className={"mb-4 flex w-full items-center justify-between text-left text-[16px] font-medium "+(uxSection==="gemas"?"text-white":"text-white/55")}>
                <span className="flex items-center gap-2"><ChevronDown className={"size-4 transition-transform "+(uxSection==="gemas"?"":"-rotate-90")}/><span>Gemas</span><span className="text-[10px] font-normal text-white/30">{GEMAS.length}</span></span>
                <span className={"text-[9px] uppercase tracking-[.12em] "+(uxSection==="gemas"?"text-[#d4af37]":"text-white/25")}>{uxSection==="gemas"?"Abierto":"Abrir"}</span>
              </button>
              {uxSection==="gemas"&&<div className="grid grid-cols-5 gap-2">
                {GEMAS.map(g=><button key={g.id} type="button" title={g.nombre} onClick={()=>{abrirSeccion("gemas");setBibliotecaTipo("gemas");setGemaId(g.id);apiRef.current?.gema(g)}} className={"group text-center "+(gemaId===g.id?"text-white":"text-white/70")}>
                  <span className={"mx-auto grid size-[58px] place-items-center rounded-xl border-2 transition "+(gemaId===g.id?"border-[#34c7ff] bg-white/10":"border-transparent bg-transparent group-hover:border-white/15")}><span className="size-9 rounded-full border border-white/20 shadow-inner" style={{background:hexColor(g.color)}}/></span>
                  <span className="mt-2 block truncate text-[10px]">{g.nombre}</span>
                </button>)}

              </div>}
            </section>

            <section className="px-5 py-5">
              <button type="button" aria-expanded={uxSection==="escena"} onClick={()=>abrirSeccion("escena")} className={"mb-4 flex w-full items-center justify-between text-left text-[16px] font-medium "+(uxSection==="escena"?"text-white":"text-white/55")}>
                <span className="flex items-center gap-2"><ChevronDown className={"size-4 transition-transform "+(uxSection==="escena"?"":"-rotate-90")}/><span>Escena</span><span className="text-[10px] font-normal text-white/30">{ESCENARIOS.length}</span></span>
                <span className={"text-[9px] uppercase tracking-[.12em] "+(uxSection==="escena"?"text-[#d4af37]":"text-white/25")}>{uxSection==="escena"?"Abierto":"Abrir"}</span>
              </button>
              {uxSection==="escena"&&<div className="grid grid-cols-3 gap-3">
                {ESCENARIOS.map(e=><button key={e.id} type="button" onClick={()=>{abrirSeccion("escena");setEscenarioId(e.id)}} className={"group text-center "+(escenarioId===e.id?"text-white":"text-white/75")}>
                  <span className={"block aspect-[1.18] overflow-hidden rounded-xl border-2 transition "+(escenarioId===e.id?"border-[#34c7ff] shadow-[0_0_18px_rgba(52,199,255,.12)]":"border-transparent group-hover:border-white/20")}>
                    <span className={"block h-full w-full "+e.clase}/>
                  </span>
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
          <div
            ref={visorRef}
            className="absolute inset-0"
            onDragOver={(e)=>{e.preventDefault();e.dataTransfer.dropEffect="copy";}}
            onDrop={(e)=>{e.preventDefault();const file=e.dataTransfer.files?.[0];if(file)cargarArchivo(file);}}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".stl,.obj,.glb,.fbx,.3dm,model/stl,model/obj,model/gltf-binary,model/gltf+json,application/octet-stream"
              className="hidden"
              onChange={(e)=>{const file=e.target.files?.[0];if(file)cargarArchivo(file);}}
            />
            {!archivo&&!cargando&&<button
              type="button"
              className="absolute inset-0 z-10 grid place-items-center p-8 text-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/70"
              onClick={()=>fileRef.current?.click()}
              onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();fileRef.current?.click();}}}
              aria-label="Cargar diseño de joyería"
            >
              <span className="block rounded-3xl border border-[#d4af37]/20 bg-[#d4af37]/10 px-8 py-7 transition hover:border-[#d4af37]/45 hover:bg-[#d4af37]/15">
                <span className="mx-auto grid size-20 place-items-center rounded-3xl border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37]"><Upload className="size-8"/></span>
                <span className="mt-5 block text-xl font-semibold text-white">Carga tu diseño de joyería</span>
                <span className="mt-2 block text-sm text-white/40">STL · OBJ · GLB · FBX · Rhino 3DM</span>
                <span className="mt-3 block text-[10px] uppercase tracking-[.16em] text-[#d4af37]/65">Haz clic o arrastra tu archivo aquí</span>
              </span>
            </button>}
            {cargando&&<div className="absolute inset-0 z-30 grid place-items-center bg-black/35 backdrop-blur-sm"><div className="rounded-2xl border border-[#d4af37]/20 bg-black/70 px-7 py-5 text-center text-sm text-white/80"><div className="mx-auto mb-3 size-5 animate-spin rounded-full border-2 border-white/20 border-t-[#d4af37]"/>{paso||"Preparando visualización..."}</div></div>}
            {error&&<div className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-red-400/20 bg-red-950/80 px-4 py-2 text-xs text-red-200">{error}</div>}
            {parteSeleccionada&&<div className="absolute left-5 top-5 z-20 max-w-[65%] rounded-xl border border-[#d4af37]/40 bg-black/65 px-3 py-2 text-[10px] text-white shadow-xl backdrop-blur-xl"><span className="text-[#d4af37]">Seleccionado:</span> {parteSeleccionadaNombre||"Componente"}<div className="mt-1 text-white/35">Elige un material para este componente</div></div>}
            {archivo&&<div className="absolute left-5 top-5 z-20 max-w-[45%] truncate rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[10px] text-white/50 backdrop-blur">{archivo} <span className="ml-2 text-[#d4af37]/80">· GLB interno</span></div>}

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
                <button type="button" title="Capturar imagen" onClick={capturarImagen} className="grid size-10 place-items-center rounded-xl text-[#d4af37] hover:bg-[#d4af37]/10"><Camera className="size-[18px]"/></button>
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
