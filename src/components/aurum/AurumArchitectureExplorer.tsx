import { useMemo, useState } from "react";
import { Activity, ChevronRight, CircleHelp, GitBranch, Network, Search, ShieldAlert, Workflow, Power } from "lucide-react";
import { getAurumPostControls, setAurumPostControls } from "@/lib/aurum/post-engine-controls";

type Estado = "conectado" | "parcial" | "registrado" | "auditar" | "experimental" | "suspendido" | "infraestructura";
type Nodo = { id: string; nombre: string; tipo: string; estado: Estado; detalle: string; evidencia?: string; dependencias?: string[]; hijos?: Nodo[] };

const estadoUI: Record<Estado, { label: string; clase: string }> = {
  conectado: { label: "Conectado", clase: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  parcial: { label: "Parcial", clase: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  registrado: { label: "Registrado · sin consumo directo", clase: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400" },
  auditar: { label: "Por auditar", clase: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  experimental: { label: "Experimental", clase: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400" },
  suspendido: { label: "Suspendido", clase: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400" },
  infraestructura: { label: "Infraestructura", clase: "border-border bg-muted text-muted-foreground" },
};

const arbol: Nodo[] = [
  { id: "core", nombre: "AURUM CORE", tipo: "Infraestructura común · contratos y ciclo de vida", estado: "infraestructura", detalle: "Infraestructura que registra módulos, resuelve servicios, distribuye eventos y agrupa tareas de limpieza. No sustituye la propiedad de los controladores productivos.", evidencia: "src/lib/aurum/core/", hijos: [
    { id: "registry", nombre: "Plugin Registry", tipo: "Contratos y dependencias", estado: "conectado", detalle: "Resuelve dependencias y ciclo de vida de plugins antes de inicializarlos.", evidencia: "src/lib/aurum/core/plugin-registry.ts" },
    { id: "services", nombre: "Service Container", tipo: "Servicios registrados · solo lectura", estado: "conectado", detalle: "Publica un mapa sellado de servicios para los módulos.", evidencia: "src/lib/aurum/core/service-container.ts" },
    { id: "events", nombre: "Event Bus", tipo: "Eventos de ciclo de vida", estado: "conectado", detalle: "Entrega eventos a suscriptores y reporta fallos aislados.", evidencia: "src/lib/aurum/core/context.ts" },
    { id: "scope", nombre: "Resource Scope", tipo: "Limpieza por plugin", estado: "conectado", detalle: "Agrupa funciones de limpieza; no infiere ownership GPU.", evidencia: "src/lib/aurum/core/context.ts" },
    { id: "gpu", nombre: "GPU Resource Manager", tipo: "Servicio registrado · ownership no transferido", estado: "parcial", detalle: "Está implementado, registrado y probado como servicio. No administra todavía la propiedad ni liberación general de renderer, geometrías, materiales, texturas, HDRI o BVH; esos recursos siguen bajo sus controladores productivos.", evidencia: "src/lib/aurum/core/gpu-resource-manager.ts · src/lib/aurum/viewer.ts" },
  ]},
  { id: "engines", nombre: "MOTORES Y ADAPTADORES", tipo: "Servicios especializados conectados al visor", estado: "infraestructura", detalle: "Arquitectura simplificada: varios elementos son adaptadores sobre controladores productivos existentes, no motores autónomos. Se conserva el pipeline óptico y la calidad visual; la simplificación reduce duplicaciones y separa responsabilidades.", hijos: [
    { id: "viewer", nombre: "Viewer Adapter", tipo: "Renderer, cámara y controles compartidos", estado: "conectado", detalle: "Expone referencias al visor productivo. El teardown sigue bajo disposeAurumViewer().", evidencia: "src/lib/aurum/core/viewer-adapter.ts", dependencias: ["AURUM RENDER"] },
    { id: "camera", nombre: "AURUM CAMERA", tipo: "Órbita · Pan · Zoom · Centrado · Proporción", estado: "conectado", detalle: "Módulo registrado en AURUM CORE. Agrupa OrbitControls, órbita, pan, zoom y centrado. “Ajustar a proporción” recalcula únicamente el encuadre de la joya respecto al canvas visible; no selecciona ni modifica perfiles de exportación.", evidencia: "src/components/AurumRender.tsx · src/lib/aurum/core/viewer-adapter.ts · src/lib/aurum/api.ts", dependencias: ["Viewer"] },
    { id: "scene", nombre: "Scene Adapter", tipo: "Controlador de escena", estado: "conectado", detalle: "Fachada al controlador de escena existente.", evidencia: "src/lib/aurum/core/scene-adapter.ts", dependencias: ["Viewer"] },
    { id: "floor", nombre: "Studio Floor · Contact Shadow", tipo: "Plano de estudio · sombra de contacto", estado: "conectado", detalle: "Controlador de suelo integrado en la escena. El interruptor Mostrar suelo inicia activado y gobierna el plano y la sombra de contacto; la sombra solo aparece después de posicionarse con los límites reales del modelo. El suelo HDRI permanece desactivado.", evidencia: "src/lib/aurum/ground.ts · src/components/AurumRender.tsx", dependencias: ["Scene Adapter", "Viewer"] },
    { id: "lighting", nombre: "Light Engine", tipo: "Adaptador registrado · consumo directo del controlador", estado: "parcial", detalle: "El adaptador y sus servicios están registrados. La iluminación productiva continúa ejecutándose principalmente mediante el controlador existente; no es un motor autónomo ni se ha transferido su ownership.", evidencia: "src/lib/aurum/core/lighting-adapter.ts · src/lib/aurum/lighting.ts · environment.ts · gem-environment.ts", dependencias: ["Viewer", "Scene"] },
    { id: "metal", nombre: "Metal Engine", tipo: "Adaptador de materiales PBR", estado: "conectado", detalle: "Delegación al motor de materiales productivo; no reemplaza perfiles ni calibraciones.", evidencia: "src/lib/aurum/material-application.ts", dependencias: ["Lighting"] },
    { id: "gem", nombre: "Gem Engine", tipo: "Adaptador al motor óptico", estado: "conectado", detalle: "Delega en el motor óptico productivo. No implica cambios a shaders, BVH ni calibración.", evidencia: "src/lib/aurum/material-application.ts", dependencias: ["Lighting", "Metal"] },
    { id: "diamond", nombre: "Diamond Pipeline / BVH", tipo: "Runtime óptico productivo · no plugin autónomo", estado: "parcial", detalle: "El runtime especializado participa en el procesamiento óptico de diamantes y se integra con el clasificador DIAMOND SIZE ANALYZER para estabilizar los tiers MICRO / SMALL / BRILLIANT usados por BVH. No es un plugin autónomo del Registry; la activación y el ownership siguen en los controladores ópticos.", evidencia: "src/lib/aurum/aurum-diamond-bvh-runtime.ts · aurum-diamond-pipeline.ts · scintillation.ts", dependencias: ["Gem Engine"] },
    { id: "transition", nombre: "AURUM GEM TRANSITION", tipo: "Transición progresiva por capa / malla", estado: "conectado", detalle: "Conectado al flujo de aplicación de gemas para interpolar canales visuales compatibles. La identidad óptica se conserva y el refresco BVH se difiere hasta terminar la transición; validación visual amplia aún pendiente.", evidencia: "src/components/AurumRender.tsx · src/lib/aurum/material-application.ts", dependencias: ["Gem Engine", "Diamond Pipeline / BVH"] },
    { id: "final", nombre: "Final Render Adapter", tipo: "Adaptador registrado · carga bajo demanda", estado: "parcial", detalle: "El host registra el loader y AurumRender resuelve el adaptador al solicitar la captura final. El path tracer existe; falta certificar fidelidad, restauración de estado, coste y limpieza con escenas de referencia.", evidencia: "src/lib/aurum/core/final-render-adapter.ts · src/lib/aurum/path-traced-capture.ts · src/components/AurumRender.tsx", dependencias: ["Viewer", "Post"] },
    { id: "edge", nombre: "AURUM EDGE QUALITY", tipo: "MSAA en compositor · TAA fuera del visor en vivo", estado: "parcial", detalle: "MSAA está conectado a los targets ping-pong del compositor con fallback. TAA permanece fuera del visor en vivo y se reserva para capturas explícitas. El supermuestreo selectivo del diamante pertenece a DIAMOND SSAA y continúa experimental; no se debe confundir con una mejora general de resolución.", evidencia: "src/lib/aurum/edge-quality.ts · src/lib/aurum/post.ts · src/components/AurumRender.tsx", dependencias: ["Post"] },
    { id: "post", nombre: "Post Engine", tipo: "Composición y efectos", estado: "parcial", detalle: "Usa el compositor productivo del visor. Mantener una sola cadena de postprocesado y evitar duplicar pases o loops entre interacción en vivo y renderizado en reposo.", evidencia: "src/lib/aurum/ · post pipeline", dependencias: ["Viewer", "Edge Quality"] },
    { id: "diamond-ssaa", nombre: "DIAMOND SSAA · hasta 2×", tipo: "Supermuestreo selectivo · solo diamante central", estado: "experimental", detalle: "Módulo habilitable de forma controlada únicamente con Gem Mask activa. El render auxiliar conserva transmisión y refracción y la composición final queda limitada a la máscara nativa del diamante. La calidad y el coste deben validarse en modelos reales; la capa Rhino por sí sola nunca clasifica una malla como diamante.", evidencia: "src/lib/aurum/post.ts · src/lib/aurum/post-engine-controls.ts · src/components/AurumRender.tsx", dependencias: ["Post Engine", "Gem Mask"] },
    { id: "diamond-size-analyzer", nombre: "DIAMOND SIZE ANALYZER", tipo: "Clasificador óptico por talla proyectada · MICRO / SMALL / BRILLIANT", estado: "conectado", detalle: "Clasifica cada diamante por diámetro proyectado y aplica perfiles ópticos por malla mediante uniforms justo antes del dibujo, incluso cuando varias piedras comparten material. Incorpora histéresis en los límites MICRO / SMALL / BRILLIANT para evitar cambios repetitivos al orbitar o hacer zoom; protege el diamante central único, el mayor claramente dominante y las piedras marcadas como centrales. El BVH consume el mismo tier estabilizado durante la actualización y el refresco; al pausar o destruir el analizador se publica BRILLIANT y se restauran los uniforms base para evitar perfiles MICRO/SMALL residuales. No modifica geometría, normales, IOR ni materiales metálicos.", evidencia: "src/lib/aurum/diamond-micro-pipeline.ts · src/lib/aurum/aurum-diamond-bvh-runtime.ts · src/lib/aurum/scintillation.ts · scripts/aurum-diamond-micro-pipeline.test.ts · src/components/AurumRender.tsx", dependencias: ["Gem Adapter", "Scintillation", "Viewer"] },
  ]},
  { id: "import", nombre: "IMPORTACIÓN Y GEOMETRÍA", tipo: "CAD / 3D · loader directo y diagnósticos opt-in", estado: "parcial", detalle: "AurumRender decodifica los formatos compatibles y prepara directamente el modelo, siguiendo la misma ruta base del Visor Público. La ruta normal omite el Import Pipeline Manager, Smart Scan y los diagnósticos profundos para evitar trabajo redundante; esas herramientas permanecen disponibles como flujo opt-in.", evidencia: "src/components/AurumRender.tsx · src/lib/aurum/model-loader.ts · src/lib/aurum/core/", hijos: [
    { id: "import-plugin", nombre: "AURUM IMPORT", tipo: "Decodificación directa activa · plugin registrado fuera de la ruta normal", estado: "parcial", detalle: "La ruta productiva de AurumRender usa parseAurumInput() y preprocessAurumModel() directamente, alineada con PublicCatalogViewer. Admite STL, OBJ, GLB, FBX y 3DM; en 3DM resuelve metadatos e índices de capas Rhino, orientación Z-up, clasificación de metal/gema y asignaciones manuales antes de preparar y centrar la geometría visible. El plugin AurumImport existe, pero no gobierna esta ruta normal.", evidencia: "src/components/AurumRender.tsx · src/lib/aurum/model-loader.ts · src/lib/aurum/core/import-plugin.ts", dependencias: ["Viewer"] },
    { id: "manager", nombre: "Import Pipeline Manager", tipo: "Orquestador opt-in · fuera de la carga directa normal", estado: "registrado", detalle: "Orquesta la importación mediante plugin, Smart Scan, presupuesto de recursos y diagnósticos opcionales. Tiene cancelación por etapas y limpieza de geometría importada; no participa en la ruta normal de AurumRender, que prioriza la decodificación y preparación directa alineada con el Visor Público.", evidencia: "src/lib/aurum/core/import-pipeline-manager.ts · src/components/AurumRender.tsx", dependencias: ["AURUM IMPORT"] },
    { id: "geometry", nombre: "AURUM GEOMETRY / Smart Scan", tipo: "Inspección de solo lectura · opt-in", estado: "registrado", detalle: "El motor inspecciona mallas, vértices, triángulos, normales, posiciones finitas, visibilidad y límites espaciales. No modifica buffers, normales, índices, transformaciones ni materiales. Se ejecuta mediante el Import Pipeline Manager cuando se solicitan diagnósticos; no se activa en la carga directa normal.", evidencia: "src/lib/aurum/core/geometry-engine.ts · src/lib/aurum/core/import-pipeline-manager.ts · src/components/AurumRender.tsx", dependencias: ["AURUM IMPORT"] },
    { id: "solid", nombre: "Solid · Intersection · Broadphase", tipo: "Diagnósticos geométricos", estado: "auditar", detalle: "Motores de inspección de sólidos e intersecciones disponibles en el pipeline diagnóstico. Mantenerlos opt-in y validar tolerancias, precisión y escalabilidad con modelos CAD representativos antes de elevar su estado.", evidencia: "src/lib/aurum/geometry/" },
    { id: "surface", nombre: "AURUM SURFACE", tipo: "Diagnóstico de aristas", estado: "experimental", detalle: "Inspección de aristas y relaciones entre superficies, solo lectura. No certifica continuidad G1/G2 NURBS/BREP ni repara superficies; los resultados dependen de tolerancias y límites de análisis.", evidencia: "src/lib/aurum/" },
    { id: "weld", nombre: "Metal Union · Visual Weld", tipo: "Unión visual experimental", estado: "experimental", detalle: "Experimento de unión visual de geometría metálica. Está desactivado por defecto y separado de la importación normal; no realiza una reparación CAD ni sustituye una operación booleana exacta. Mantener aislado hasta validar superficies, materiales y round-trip.", evidencia: "src/lib/aurum/" },
    { id: "glb", nombre: "GLB Quality Gate", tipo: "Validación condicional · solo conversión GLB", estado: "parcial", detalle: "Valida el GLB generado mediante conversión: compara la escena previa con una reapertura real y revisa mallas, triángulos, geometría inválida, materiales, gemas y bounds antes de continuar con la compresión. No se ejecuta al cargar directamente un GLB ni certifica equivalencia NURBS/BREP; tampoco es una validación global de todas las importaciones.", evidencia: "src/lib/aurum/model-loader.ts · src/lib/aurum/core/glb-quality-gate.ts", dependencias: ["AURUM IMPORT"] },
  ]},
  { id: "media", nombre: "CAPTURA Y EXPORTACIÓN", tipo: "Flujos productivos · no son plugins independientes del Registry", estado: "auditar", detalle: "Flujos de captura conectados al visor productivo. La validación de fidelidad visual, límites de resolución y restauración de estado se mantiene separada de la existencia del flujo.", evidencia: "src/components/AurumRender.tsx · src/lib/aurum/", hijos: [
    { id: "image", nombre: "AURUM IMAGE EXPORT", tipo: "PNG · JPEG · WebP", estado: "parcial", detalle: "Captura de fotografía PNG · JPEG · WebP integrada en AurumRender. La interfaz ofrece perfiles de resolución 4K y 8K y dimensiones manuales; el presupuesto de captura limita el tamaño a 36 MP y comprueba los límites de la GPU. La fidelidad de color, nitidez del diamante y restauración deben certificarse con imágenes de referencia; la disponibilidad de la opción 8K no equivale a validación visual completa.", evidencia: "src/components/AurumRender.tsx · src/lib/aurum/", dependencias: ["Viewer", "Post"] },
    { id: "video", nombre: "AURUM VIDEO EXPORT", tipo: "Frame Pipeline · MediaRecorder", estado: "parcial", detalle: "Exportación MP4 con plan de fotogramas de paso fijo y captura del canvas existente; usa requestFrame cuando está disponible y fallback en tiempo real. MediaRecorder/canvas-record realiza la codificación. El codificador H.264 impone un presupuesto aproximado de 9,4 MP por fotograma; no se debe presentar como exportación 8K. Pendiente validar estabilidad de FPS, fidelidad del diamante, fondo y restauración en sesiones largas.", evidencia: "src/lib/aurum/video-frame-pipeline.ts · src/components/AurumRender.tsx", dependencias: ["Viewer", "Post"] },
    { id: "ratio", nombre: "Aspect Ratio Profiles", tipo: "16:9 · 1:1 · 4:5 · 9:16 · 3:2", estado: "parcial", detalle: "Perfiles de salida 16:9 · 1:1 · 4:5 · 9:16 · 3:2. La selección de perfil ajusta automáticamente el encuadre de exportación; el botón AURUM CAMERA “Ajustar a proporción” es independiente y solo ajusta la joya al canvas visible.", evidencia: "src/lib/aurum/" },
    { id: "path", nombre: "Final / Path-Traced Capture", tipo: "Path tracer disponible · invocación por servicio no confirmada", estado: "parcial", detalle: "La ruta path-traced y sus utilidades existen; el adaptador final se resuelve bajo demanda. No se ha confirmado que todas las exportaciones consuman el servicio path-traced del host, por lo que no se presenta como conexión completa.", evidencia: "src/lib/aurum/path-traced-capture.ts · src/lib/aurum/path-tracer-final.ts · src/lib/aurum/core/final-render-adapter.ts", dependencias: ["Final Render Adapter"] },
  ]},
];

const todos = (nodes: Nodo[]): Nodo[] => nodes.flatMap(n => [n, ...(n.hijos ? todos(n.hijos) : [])]);
const badge = (estado: Estado) => <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${estadoUI[estado].clase}`}>{estadoUI[estado].label}</span>;
const sectionIcon = (id: string) => {
  if (id === "core") return <Workflow className="size-5"/>;
  if (id === "engines") return <Activity className="size-5"/>;
  if (id === "import") return <Network className="size-5"/>;
  return <GitBranch className="size-5"/>;
};

export function AurumArchitectureExplorer() {
  const [vista, setVista] = useState<"overview" | "flow" | "audit">("overview");
  const [seleccion, setSeleccion] = useState("core");
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [postControls, setPostControls] = useState(getAurumPostControls);
  const updatePostControl = (key: "gemMaskEnabled" | "gemFxaaEnabled" | "diamondSsaaEnabled" | "surfaceEdgeAaEnabled" | "taaEnabled", enabled: boolean) => setPostControls(setAurumPostControls({ [key]: enabled, ...(enabled && (key === "gemFxaaEnabled" || key === "diamondSsaaEnabled") ? { gemMaskEnabled: true } : {}) }));
  const nodos = useMemo(() => todos(arbol), []);
  const actual = nodos.find(n => n.id === seleccion) ?? nodos[0]!;
  const modulos = useMemo(() => nodos.filter(n => !n.hijos?.length), [nodos]);
  const conteo = (estado: Estado) => modulos.filter(n => n.estado === estado).length;
  const seleccionar = (n: Nodo) => { setSeleccion(n.id); setMostrarTodas(false); };
  const grupoSeleccionado = arbol.find(group => group.id === seleccion) ?? arbol.find(group => group.hijos?.some(child => child.id === seleccion));
  const gruposBase = mostrarTodas ? arbol : grupoSeleccionado ? [grupoSeleccionado] : arbol;
  const grupos = gruposBase.map(group => ({
    ...group,
    visibleChildren: (group.hijos ?? []).filter(n => !filtro || n.nombre.toLowerCase().includes(filtro.toLowerCase()) || n.tipo.toLowerCase().includes(filtro.toLowerCase())),
  })).filter(group => !filtro || group.nombre.toLowerCase().includes(filtro.toLowerCase()) || group.tipo.toLowerCase().includes(filtro.toLowerCase()) || group.visibleChildren.length > 0);

  return <div className="space-y-5 px-4 py-5 sm:px-6">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">AURUM LAB · Architecture Center</p>
        <h3 className="mt-1 text-xl font-semibold tracking-tight">Mapa de arquitectura</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Inventario actualizado al 19/11/2026: documenta la ruta de importación directa alineada con el Visor Público, la clasificación de capas Rhino, la preparación de mallas y los diagnósticos geométricos opt-in. Se mantienen separados los flujos productivos y las herramientas experimentales.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {([
          ["overview", "Panorama"],
          ["flow", "Flujo del sistema"],
          ["audit", "Plan de auditoría"],
        ] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setVista(id)} aria-pressed={vista === id} className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${vista === id ? "border-gold/40 bg-gold/10 text-gold shadow-sm" : "border-border bg-card text-muted-foreground hover:border-gold/40 hover:text-foreground"}`}>{label}</button>)}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {(["conectado", "parcial", "registrado", "auditar", "experimental", "suspendido"] as Estado[]).map(s => <div key={s} className="relative overflow-hidden rounded-xl border border-border bg-card px-3.5 py-3">
        <div className="flex items-center justify-between gap-2"><p className="text-2xl font-semibold tracking-tight tabular-nums">{conteo(s)}</p><span className={`size-2 rounded-full ${s === "conectado" ? "bg-emerald-500" : s === "parcial" ? "bg-sky-500" : s === "registrado" ? "bg-violet-500" : s === "auditar" ? "bg-amber-500" : s === "experimental" ? "bg-orange-500" : "bg-rose-500"}`}/></div>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{estadoUI[s].label}</p>
      </div>)}
    </div>

    {vista === "overview" ? <>
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-gradient-to-r from-slate-950/[0.04] via-gold/[0.05] to-transparent p-4 dark:from-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">System overview</p><p className="mt-1 text-sm font-semibold">AURUM RENDER · Plataforma de visualización</p></div>
          <span className="rounded-full border border-border bg-card px-3 py-1 text-[10px] text-muted-foreground">Three.js + WebGL</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          {arbol.map((group, index) => <div key={group.id} className="relative min-w-0">
            <button type="button" onClick={() => seleccionar(group)} className={`group flex h-full w-full flex-col rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${seleccion === group.id ? "border-gold/50 bg-gold/10 ring-1 ring-gold/20" : "border-border bg-card hover:border-gold/40"}`}>
              <div className="flex items-center justify-between gap-2"><span className="grid size-9 place-items-center rounded-xl border border-gold/20 bg-gold/10 text-gold">{sectionIcon(group.id)}</span><span className="text-[10px] text-muted-foreground">{String(index + 1).padStart(2, "0")}</span></div>
              <p className="mt-3 text-xs font-bold leading-4">{group.nombre}</p>
              <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted-foreground">{group.tipo}</p>
              <div className="mt-3 flex items-center justify-between gap-2"><span className="text-[10px] text-muted-foreground">{group.hijos?.length ?? 0} componentes</span><ChevronRight className="size-3.5 text-gold transition-transform group-hover:translate-x-0.5"/></div>
            </button>
            {index < grupos.length - 1 ? <div className="pointer-events-none absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 text-gold/60 sm:block"><ChevronRight className="size-4"/></div> : null}
          </div>)}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(270px,.75fr)]">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold">Sistemas y módulos</h4>
              <p className="text-[11px] text-muted-foreground">{mostrarTodas ? "Vista completa del inventario." : "Mostrando únicamente la sección seleccionada."}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!mostrarTodas ? (
                <button type="button" onClick={() => { setMostrarTodas(true); setFiltro(""); }} className="rounded-xl border border-border bg-card px-3 py-2 text-[11px] font-semibold text-muted-foreground transition hover:border-gold/40 hover:text-foreground">
                  Ver todas
                </button>
              ) : (
                <button type="button" onClick={() => { setMostrarTodas(false); setSeleccion("core"); setFiltro(""); }} className="rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-[11px] font-semibold text-gold">
                  Volver a sección
                </button>
              )}
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3">
                <Search className="size-3.5 text-muted-foreground"/>
                <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Filtrar módulos…" className="h-9 w-full min-w-0 bg-transparent text-xs outline-none sm:w-48"/>
              </div>
            </div>
          </div>
          {grupos.map(group => <section key={group.id} className="overflow-hidden rounded-xl border border-border bg-card">
            <button type="button" onClick={() => seleccionar(group)} className={`flex w-full items-center gap-3 border-b border-border px-3.5 py-3 text-left transition ${seleccion === group.id ? "bg-gold/10" : "bg-muted/20 hover:bg-muted/40"}`}>
              <span className="grid size-8 place-items-center rounded-lg bg-gold/10 text-gold">{sectionIcon(group.id)}</span>
              <span className="min-w-0 flex-1"><span className="block text-xs font-bold">{group.nombre}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">{group.tipo}</span></span>
              <span className="text-[10px] text-muted-foreground">{group.visibleChildren.length} módulos</span>
            </button>
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              {group.visibleChildren.map(n => <button key={n.id} type="button" onClick={() => seleccionar(n)} className={`min-w-0 rounded-xl border p-3 text-left transition hover:border-gold/40 hover:shadow-sm ${seleccion === n.id ? "border-gold/50 bg-gold/5 ring-1 ring-gold/20" : "border-border bg-background/70"}`}>
                <div className="flex items-start justify-between gap-2"><span className="text-xs font-semibold leading-5">{n.nombre}</span>{badge(n.estado)}</div>
                <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted-foreground">{n.tipo}</p>
                {n.dependencias?.length ? <p className="mt-2 truncate text-[10px] text-muted-foreground">Depende de: {n.dependencias.join(" · ")}</p> : null}
              </button>)}
              {!group.visibleChildren.length ? <p className="col-span-full py-3 text-center text-xs text-muted-foreground">No hay módulos que coincidan con el filtro.</p> : null}
            </div>
          </section>)}
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-4 xl:sticky xl:top-4">
          <div className="flex items-center justify-between gap-2"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Module brief</p>{badge(actual.estado)}</div>
          <h4 className="mt-3 text-base font-semibold leading-6">{actual.nombre}</h4>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{actual.detalle}</p>
          {actual.id === "diamond-ssaa" ? <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0"><p className="text-xs font-semibold">Supermuestreo selectivo hasta 2×</p><p className="text-[10px] leading-4 text-muted-foreground">Render auxiliar con transmisión y refracción; la máscara limita la escritura al diamante.</p></div>
              <button type="button" role="switch" aria-checked={postControls.diamondSsaaEnabled} aria-disabled={!postControls.gemMaskEnabled} disabled={!postControls.gemMaskEnabled} title={postControls.gemMaskEnabled ? "Activar o desactivar SSAA" : "Activa Gem Mask primero"} onClick={()=>updatePostControl("diamondSsaaEnabled",!postControls.diamondSsaaEnabled)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${postControls.diamondSsaaEnabled ? "bg-gold" : "bg-muted-foreground/20"}`}><span className={"absolute top-0.5 size-5 rounded-full bg-white shadow transition-all " + (postControls.diamondSsaaEnabled ? "left-[22px]" : "left-0.5")}/></button>
            </div>
            <div className="rounded-lg border border-border bg-background/60 p-2 text-[10px] leading-4 text-muted-foreground">
              <p><span className="font-semibold text-foreground">Estado:</span> experimental y activable con Gem Mask.</p>
              <p><span className="font-semibold text-foreground">Protección:</span> la composición queda recortada por la máscara nativa; la GPU aplica límites de resolución.</p>
            </div>
            <p className="text-[10px] leading-4 text-muted-foreground"><Power className="mr-1 inline size-3"/> SSAA y FXAA son independientes y requieren Gem Mask. TAA permanece bloqueado.</p>
          </div> : null}
          {actual.id === "post" ? <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0"><p className="text-xs font-semibold">Gem Mask + FXAA</p><p className="text-[10px] leading-4 text-muted-foreground">FXAA procesa el fotograma normal una sola vez y suaviza solo el borde dentro de la máscara.</p></div>
              <button type="button" role="switch" aria-checked={postControls.gemFxaaEnabled} aria-disabled={!postControls.gemMaskEnabled} disabled={!postControls.gemMaskEnabled} title={postControls.gemMaskEnabled ? "Activar o desactivar FXAA" : "Activa Gem Mask primero"} onClick={()=>updatePostControl("gemFxaaEnabled",!postControls.gemFxaaEnabled)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${postControls.gemFxaaEnabled ? "bg-gold" : "bg-muted-foreground/20"}`}><span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${postControls.gemFxaaEnabled ? "left-[22px]" : "left-0.5"}`}/></button>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <div className="min-w-0"><p className="text-xs font-semibold">Surface Edge AA</p><p className="text-[10px] leading-4 text-muted-foreground">Suspendido para impedir cualquier postprocesado global de metal y ambiente.</p></div>
              <button type="button" role="switch" aria-checked={false} aria-disabled="true" disabled title="Procesado global suspendido" className="relative h-6 w-11 shrink-0 cursor-not-allowed rounded-full bg-muted-foreground/20 opacity-60"><span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${postControls.surfaceEdgeAaEnabled ? "left-[22px]" : "left-0.5"}`}/></button>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <div className="min-w-0"><p className="text-xs font-semibold">TAA</p><p className="text-[10px] leading-4 text-muted-foreground">Suspendido hasta reconstruir la composición exclusiva del diamante.</p></div>
              <button type="button" role="switch" aria-checked={false} aria-disabled="true" disabled title="TAA suspendido hasta validar el compositor" className="relative h-6 w-11 shrink-0 cursor-not-allowed rounded-full bg-muted-foreground/20 opacity-60"><span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${postControls.taaEnabled ? "left-[22px]" : "left-0.5"}`}/></button>
            </div>
            <p className="text-[10px] leading-4 text-muted-foreground"><Power className="mr-1 inline size-3"/> Los cambios quedan guardados. Cada módulo mantiene su propio control y ciclo de ejecución.</p>
          </div> : null}
          <div className="mt-4 rounded-xl bg-muted/50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Evidencia técnica</p><p className="mt-1 break-words font-mono text-[10px] leading-4 text-sky-700 dark:text-sky-400">{actual.evidencia || "Requiere localización exacta en auditoría"}</p></div>
          {actual.dependencias?.length ? <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Conexiones conocidas</p><div className="mt-2 flex flex-wrap gap-1.5">{actual.dependencias.map(d => <span key={d} className="rounded-lg border border-border bg-background px-2 py-1 text-[10px]">{d}</span>)}</div></div> : null}
          <div className="mt-4 border-t border-border pt-3"><p className="flex items-center gap-2 text-[10px] font-semibold text-amber-700 dark:text-amber-400"><CircleHelp className="size-3.5"/> Cómo leer los estados</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">“Conectado” significa que existe un consumidor en el flujo productivo; no equivale a certificación visual. “Parcial” indica conexión limitada o condicional. “Registrado” significa que existe en CORE, pero no participa directamente en el flujo normal.</p></div>
        </aside>
      </div>
    </> : null}

    {vista === "flow" ? <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2"><Workflow className="size-4 text-gold"/><h4 className="text-sm font-semibold">Flujo de trabajo del visor</h4></div>
        <p className="mt-1 text-xs text-muted-foreground">Vista conceptual de los principales recorridos de AURUM RENDER.</p>
        <div className="mt-4 grid gap-2 md:grid-cols-4">
          {[
            {title:"01 · Entrada CAD",desc:"Carga directa · Rhino / GLB · normalización",ids:["import-plugin","glb"]},
            {title:"02 · Escena 3D",desc:"Viewer · Scene · Lighting · materiales",ids:["viewer","scene","lighting","metal","gem"]},
            {title:"03 · Procesamiento",desc:"BVH y calidad de imagen · diagnósticos opt-in",ids:["diamond","edge","post","geometry","solid"]},
            {title:"04 · Entrega visual",desc:"Captura de imagen/vídeo · render final opcional",ids:["image","video","final","path"]},
          ].map((step,i) => <div key={step.title} className="relative rounded-xl border border-border bg-background p-3">
            <span className="text-[10px] font-bold tracking-wider text-gold">{step.title}</span><p className="mt-2 text-xs font-semibold leading-5">{step.desc}</p>
            <div className="mt-3 flex flex-wrap gap-1">{step.ids.map(id => {const n=nodos.find(x=>x.id===id);return n?<button key={id} type="button" onClick={()=>{seleccionar(n);setVista("overview");}} className="rounded-md border border-border bg-card px-2 py-1 text-[10px] hover:border-gold/40">{n.nombre}</button>:null;})}</div>
            {i<3?<div className="pointer-events-none absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-gold/30 bg-card p-1 text-gold md:block"><ChevronRight className="size-3"/></div>:null}
          </div>)}
        </div>
        <p className="mt-3 rounded-lg bg-sky-500/5 p-3 text-[10px] leading-4 text-muted-foreground"><Network className="mr-1.5 inline size-3.5 text-sky-600"/>Flujo resumido según los consumidores identificados en el código. Los módulos registrados o de uso opt-in no se presentan como etapas obligatorias de la carga normal.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4"><h4 className="text-xs font-semibold">Infraestructura transversal</h4><div className="mt-3 grid gap-2 sm:grid-cols-5">{(arbol[0]?.hijos ?? []).map(n=><button key={n.id} onClick={()=>{seleccionar(n);setVista("overview");}} className="rounded-lg border border-border bg-muted/30 p-2 text-left hover:border-gold/40"><p className="text-[11px] font-semibold">{n.nombre}</p><div className="mt-1">{badge(n.estado)}</div></button>)}</div></div>
    </div> : null}

    {vista === "audit" ? <div className="space-y-3">
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4"><div className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert className="size-4 text-amber-600"/> Auditoría pendiente de ejecución</div><p className="mt-1 text-xs leading-5 text-muted-foreground">Este panel organiza prioridades; no simula resultados ni marca controles como aprobados sin evidencia verificable.</p></div>
      {[
        ["P0 · Fidelidad de exportación","Comparar imagen y vídeo exportados contra el visor en tiempo real."],
        ["P1 · Contratos y consumidores","Confirmar servicios registrados, consumidores reales y dependencias entre módulos."],
        ["P1 · Calidad GLB","Validar round-trip con modelos CAD representativos y limpieza de recursos."],
        ["P1 · Restauración y ownership","Comprobar restauración de renderer/composer y ausencia de doble dispose."],
        ["P2 · Rendimiento y escala","Probar modelos grandes, sesiones largas y cancelación de importaciones."],
        ["P2 · CI completa","Ejecutar Bun tests, TypeScript, ESLint, build y workflows de Edge Functions."]
      ].map(([title,desc]) => <div key={title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"><Activity className="mt-0.5 size-4 shrink-0 text-gold"/><div className="min-w-0 flex-1"><p className="text-xs font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{desc}</p></div><span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-700 dark:text-amber-400">Pendiente</span></div>)}
    </div> : null}

    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[10px] text-muted-foreground"><GitBranch className="size-3.5"/> Inventario de conexiones revisado al 19/11/2026 <span>·</span><Workflow className="size-3.5"/> Vista documental, sin modificar el motor óptico</div>
  </div>;
}
