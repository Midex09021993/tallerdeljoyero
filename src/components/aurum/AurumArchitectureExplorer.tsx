import { useMemo, useState } from "react";
import { Activity, ChevronRight, CircleHelp, GitBranch, Network, Search, ShieldAlert, Workflow } from "lucide-react";

type Estado = "reutilizable" | "legado" | "nuevo" | "pendiente" | "parcial" | "experimental" | "suspendido" | "infraestructura";
type Nodo = { id: string; nombre: string; tipo: string; estado: Estado; detalle: string; evidencia: string; dependencias?: string[]; hijos?: Nodo[] };

const estadoUI: Record<Estado, { label: string; clase: string }> = {
  reutilizable: { label: "Base reutilizable", clase: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-400" },
  legado: { label: "Visor anterior", clase: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300" },
  nuevo: { label: "En nuevo visor", clase: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  pendiente: { label: "Pendiente nuevo visor", clase: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  parcial: { label: "Parcial", clase: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  auditar: { label: "Por auditar", clase: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  experimental: { label: "Experimental", clase: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400" },
  suspendido: { label: "Suspendido", clase: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400" },
  infraestructura: { label: "Infraestructura", clase: "border-border bg-muted text-muted-foreground" },
};

const arbol: Nodo[] = [
  { id: "core", nombre: "AURUM CORE", tipo: "Infraestructura común · contratos y ciclo de vida", estado: "infraestructura", detalle: "Infraestructura que registra módulos, resuelve servicios, distribuye eventos y agrupa tareas de limpieza. No sustituye la propiedad de los controladores productivos.", evidencia: "src/lib/aurum/core/", hijos: [
    { id: "registry", nombre: "Plugin Registry", tipo: "Contratos y dependencias", estado: "legado", detalle: "Conectado al host del visor anterior. El nuevo visor público todavía no arranca plugins mediante este Registry.", evidencia: "src/lib/aurum/core/plugin-registry.ts · src/components/AurumRender.tsx" },
    { id: "services", nombre: "Service Container", tipo: "Servicios registrados · solo lectura", estado: "legado", detalle: "El contenedor está conectado al host anterior. No se ha adoptado como contenedor del nuevo visor.", evidencia: "src/lib/aurum/core/service-container.ts" },
    { id: "events", nombre: "Event Bus", tipo: "Eventos de ciclo de vida", estado: "legado", detalle: "Los eventos de ciclo de vida pertenecen al host anterior; el nuevo visor aún no consume este bus.", evidencia: "src/lib/aurum/core/context.ts" },
    { id: "scope", nombre: "Resource Scope", tipo: "Limpieza por plugin", estado: "legado", detalle: "Disponible para el ciclo de vida del host anterior. La limpieza del nuevo visor conserva su propio teardown hasta diseñar la integración.", evidencia: "src/lib/aurum/core/context.ts" },
    { id: "gpu", nombre: "GPU Resource Manager", tipo: "Ownership explícito de recursos", estado: "parcial", detalle: "El servicio está disponible y probado. La adopción sobre recursos productivos sigue siendo parcial y controlada.", evidencia: "src/lib/aurum/core/gpu-resource-manager.ts" },
  ]},
  { id: "engines", nombre: "MOTORES Y ADAPTADORES", tipo: "Servicios especializados conectados al visor", estado: "infraestructura", detalle: "Varios elementos son adaptadores sobre controladores existentes, no motores autónomos.", evidencia: "src/lib/aurum/core/", hijos: [
    { id: "viewer", nombre: "Viewer Adapter", tipo: "Renderer, cámara y controles compartidos", estado: "legado", detalle: "Adaptador conectado al host anterior. El nuevo visor reutiliza createAurumWebGLViewer directamente y aún no consume este contrato.", evidencia: "src/lib/aurum/core/viewer-adapter.ts · src/components/PublicCatalogViewer.tsx", dependencias: ["AURUM RENDER"] },
    { id: "scene", nombre: "Scene Adapter", tipo: "Controlador de escena", estado: "legado", detalle: "Fachada conectada al controlador de escena del visor anterior; pendiente decidir si el nuevo visor necesita este contrato.", evidencia: "src/lib/aurum/core/scene-adapter.ts", dependencias: ["Viewer"] },
    { id: "lighting", nombre: "Light Engine / HDRI", tipo: "Iluminación base y entornos de metales/gemas", estado: "nuevo", detalle: "El nuevo visor ya reutiliza los helpers HDRI y crea su iluminación de escena. El adaptador Lighting del host anterior no está adoptado; falta formalizar el contrato propio del nuevo visor.", evidencia: "src/components/PublicCatalogViewer.tsx · src/lib/aurum-photographic-scene-engine.ts", dependencias: ["Nuevo Viewer"] },
    { id: "metal", nombre: "Metal Engine · base PBR", tipo: "Perfiles y aplicación de materiales metálicos", estado: "nuevo", detalle: "El nuevo visor reutiliza applyAurumMetal y los perfiles existentes directamente. El adaptador metal del host anterior aún no es el punto de entrada del nuevo visor.", evidencia: "src/components/PublicCatalogViewer.tsx · src/lib/aurum-material-engine.ts", dependencias: ["Lighting / HDRI"] },
    { id: "gem", nombre: "Gem Engine · base óptica", tipo: "Perfiles y aplicación de gemas", estado: "nuevo", detalle: "El nuevo visor reutiliza applyAurumGem y los perfiles ópticos existentes. Se conserva el motor óptico protegido; no se porta el adaptador anterior como integración automática.", evidencia: "src/components/PublicCatalogViewer.tsx · src/lib/aurum-material-engine.ts", dependencias: ["Lighting / HDRI", "Metal"] },
    { id: "diamond", nombre: "Diamond Pipeline / BVH", tipo: "Runtime óptico especializado", estado: "nuevo", detalle: "El nuevo visor público crea y utiliza el runtime BVH de diamante. Se considera reutilización directa del runtime, no un plugin autónomo ni una transferencia de ownership.", evidencia: "src/components/PublicCatalogViewer.tsx · src/lib/aurum/aurum-diamond-bvh-runtime.ts", dependencias: ["Gem Engine"] },
    { id: "transition", nombre: "AURUM GEM TRANSITION", tipo: "Transición progresiva de gemas", estado: "suspendido", detalle: "Permanece suspendido. No reactivar ni modificar durante esta auditoría.", evidencia: "Configuración de transición" },
    { id: "new-viewer", nombre: "AURUM PUBLIC VIEWER · Nueva base", tipo: "Visor gráfico independiente", estado: "nuevo", detalle: "PublicCatalogViewer tiene su propio montaje, carga visual, cámara, escena, HDRI, materiales y teardown. Es la base que se debe modularizar sin arrastrar el host anterior.", evidencia: "src/components/PublicCatalogViewer.tsx", dependencias: ["Viewer Runtime", "Materiales", "HDRI"] },
    { id: "dof", nombre: "AURUM DEPTH OF FIELD", tipo: "Control DOF aislado", estado: "legado", detalle: "La interfaz ya está separada en AurumDepthOfFieldModule, pero hoy se conecta al API del visor anterior. Aún no controla el PublicCatalogViewer.", evidencia: "src/components/AurumDepthOfFieldModule.tsx · src/components/AurumRender.tsx", dependencias: ["Nuevo Viewer", "Post"] },
    { id: "final", nombre: "Final Render Adapter", tipo: "Captura final bajo demanda", estado: "legado", detalle: "Conectado al host del visor anterior. No forma parte del flujo gráfico actual del nuevo visor público.", evidencia: "src/lib/aurum/core/final-render-adapter.ts", dependencias: ["Viewer", "Post"] },
    { id: "edge", nombre: "AURUM EDGE QUALITY", tipo: "MSAA / TAA", estado: "pendiente", detalle: "La configuración MSAA/TAA pertenece al pipeline anterior. El nuevo visor no usa actualmente el compositor de AurumRender; diseñar un perfil específico sin añadir pases ni coste innecesario.", evidencia: "src/lib/aurum/edge-quality.ts · src/components/PublicCatalogViewer.tsx", dependencias: ["Nuevo Viewer", "Post"] },
    { id: "post", nombre: "Post Engine", tipo: "Composición y efectos", estado: "pendiente", detalle: "El nuevo visor realiza render directo y no instancia el EffectComposer del visor anterior. No portar efectos hasta definir qué necesita realmente el visor gráfico.", evidencia: "src/lib/aurum/post.ts · src/components/PublicCatalogViewer.tsx", dependencias: ["Nuevo Viewer", "Edge Quality"] },
  ]},
  { id: "import", nombre: "IMPORTACIÓN Y GEOMETRÍA", tipo: "CAD / 3D · normalización y diagnóstico", estado: "infraestructura", detalle: "Contiene utilidades compartidas y diagnósticos del visor anterior. El nuevo visor reutiliza el parser directamente y no adopta todo el pipeline modular.", evidencia: "src/lib/aurum/core/ · src/lib/aurum/model-loader.ts", hijos: [
    { id: "import-plugin", nombre: "AURUM IMPORT · Parser compartido", tipo: "Lectura y normalización de modelos", estado: "nuevo", detalle: "El nuevo visor usa parseAurumInput y preprocessAurumModel directamente. No consume todavía aurum.import.manager ni su contrato modular; para el visor público la prioridad es mostrar el modelo ya preparado, no duplicar procesamiento.", evidencia: "src/components/PublicCatalogViewer.tsx · src/lib/aurum/model-loader.ts", dependencias: ["Nuevo Viewer"] },
    { id: "manager", nombre: "Import Pipeline Manager", tipo: "Orquestación, cancelación y presupuestos", estado: "legado", detalle: "Integrado en el flujo de importación del visor anterior. El nuevo visor público no consume este manager; no incorporarlo si el alcance es solo visualización.", evidencia: "src/lib/aurum/core/import-pipeline-manager.ts", dependencias: ["AURUM IMPORT"] },
    { id: "geometry", nombre: "AURUM GEOMETRY / Smart Scan", tipo: "Inspección de solo lectura", estado: "pendiente", detalle: "El nuevo visor prepara y presenta geometría, pero no consume Smart Scan como módulo de diagnóstico. Mantenerlo fuera del arranque gráfico salvo necesidad explícita.", evidencia: "src/lib/aurum/core/smart-scan.ts · src/components/PublicCatalogViewer.tsx", dependencias: ["AURUM IMPORT"] },
    { id: "solid", nombre: "Solid · Intersection · Broadphase", tipo: "Diagnósticos geométricos", estado: "pendiente", detalle: "No forman parte de la ruta de visualización del nuevo visor. Solo se integrarán si una función de diagnóstico los requiere.", evidencia: "src/lib/aurum/core/solid-engine.ts · intersection-engine.ts · broadphase.ts" },
    { id: "surface", nombre: "AURUM SURFACE", tipo: "Diagnóstico de aristas", estado: "experimental", detalle: "Solo lectura; no equivale a continuidad G1/G2 CAD/BREP ni a reparación de superficies.", evidencia: "src/lib/aurum/" },
    { id: "weld", nombre: "Metal Union · Visual Weld", tipo: "Unión visual experimental", estado: "experimental", detalle: "No habilitado por defecto. Mantener aislado hasta contar con pruebas geométricas y round-trip.", evidencia: "src/lib/aurum/" },
    { id: "glb", nombre: "GLB Quality Gate", tipo: "Validación round-trip", estado: "reutilizable", detalle: "Es una validación de conversión/exportación, no una dependencia del visor gráfico. El nuevo visor debe consumir el GLB entregado y no ejecutar este gate al visualizarlo.", evidencia: "src/lib/aurum/core/glb-quality-gate.ts · src/lib/aurum/model-loader.ts", dependencias: ["AURUM IMPORT"] },
  ]},
  { id: "media", nombre: "CAPTURA Y EXPORTACIÓN", tipo: "Flujos que deben diseñarse para el nuevo visor", estado: "infraestructura", detalle: "Los flujos actuales pertenecen al visor anterior. No se consideran integrados en el nuevo visor; se crearán contratos y módulos independientes solo cuando entren en su alcance.", evidencia: "src/components/AurumRender.tsx · src/lib/aurum/", hijos: [
    { id: "image", nombre: "AURUM IMAGE EXPORT", tipo: "PNG · JPEG · WebP", estado: "pendiente", detalle: "El flujo pertenece al visor anterior. Si el nuevo visor necesita capturas, se diseñará un módulo propio que refleje exactamente su salida gráfica.", evidencia: "src/components/AurumRender.tsx", dependencias: ["Nuevo Viewer"] },
    { id: "video", nombre: "AURUM VIDEO EXPORT", tipo: "Frames · MediaRecorder", estado: "pendiente", detalle: "La exportación actual está conectada al visor anterior. No se hereda al nuevo visor; primero se define el contrato de captura y después se integra un módulo independiente.", evidencia: "src/lib/aurum/video-frame-pipeline.ts · src/components/AurumRender.tsx", dependencias: ["Nuevo Viewer"] },
    { id: "ratio", nombre: "Aspect Ratio Profiles", tipo: "16:9 · 1:1 · 4:5 · 9:16 · 3:2", estado: "reutilizable", detalle: "Perfiles de encuadre existentes que podrán reutilizarse si el nuevo visor incorpora captura o composición. No están conectados a su viewport actual.", evidencia: "src/lib/aurum/aspect-ratios.ts" },
    { id: "path", nombre: "Final / Path-Traced Capture", tipo: "Captura de alta calidad", estado: "legado", detalle: "Disponible en el host del visor anterior. No se activa ni se traslada al nuevo visor público durante la etapa de visualización gráfica.", evidencia: "src/lib/aurum/core/ · src/components/AurumRender.tsx", dependencias: ["Final Render Adapter"] },
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
  const [seleccion, setSeleccion] = useState("media");
  const [filtro, setFiltro] = useState("");
  const nodos = useMemo(() => todos(arbol), []);
  const actual = nodos.find(n => n.id === seleccion) ?? nodos[0]!;
  const conteo = (estado: Estado) => nodos.filter(n => n.estado === estado).length;
  const seleccionar = (n: Nodo) => setSeleccion(n.id);
  const grupos = arbol.map(group => ({
    ...group,
    visibleChildren: (group.hijos ?? []).filter(n => !filtro || n.nombre.toLowerCase().includes(filtro.toLowerCase()) || n.tipo.toLowerCase().includes(filtro.toLowerCase())),
  })).filter(group => !filtro || group.nombre.toLowerCase().includes(filtro.toLowerCase()) || group.tipo.toLowerCase().includes(filtro.toLowerCase()) || group.visibleChildren.length > 0);

  return <div className="space-y-5 px-4 py-5 sm:px-6">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">AURUM LAB · Architecture Center</p>
        <h3 className="mt-1 text-xl font-semibold tracking-tight">Mapa de arquitectura</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Estado de cada componente respecto al nuevo visor. La integración en el visor anterior no se considera integración en la nueva arquitectura.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {([
          ["overview", "Panorama"],
          ["flow", "Flujo del sistema"],
          ["audit", "Plan de auditoría"],
        ] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setVista(id)} aria-pressed={vista === id} className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${vista === id ? "border-gold/40 bg-gold/10 text-gold shadow-sm" : "border-border bg-card text-muted-foreground hover:border-gold/40 hover:text-foreground"}`}>{label}</button>)}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
      {(["nuevo", "pendiente", "reutilizable", "legado", "parcial", "experimental", "suspendido"] as Estado[]).map(s => <div key={s} className="relative overflow-hidden rounded-xl border border-border bg-card px-3.5 py-3">
        <div className="flex items-center justify-between gap-2"><p className="text-2xl font-semibold tracking-tight tabular-nums">{conteo(s)}</p><span className={`size-2 rounded-full ${s === "nuevo" ? "bg-emerald-500" : s === "pendiente" ? "bg-amber-500" : s === "reutilizable" ? "bg-teal-500" : s === "legado" ? "bg-slate-500" : s === "parcial" ? "bg-sky-500" : s === "experimental" ? "bg-orange-500" : "bg-rose-500"}`}/></div>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{estadoUI[s].label}</p>
      </div>)}
    </div>

    {vista === "overview" ? <>
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-gradient-to-r from-slate-950/[0.04] via-gold/[0.05] to-transparent p-4 dark:from-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">System overview</p><p className="mt-1 text-sm font-semibold">AURUM RENDER · Transición al nuevo visor</p></div>
          <span className="rounded-full border border-border bg-card px-3 py-1 text-[10px] text-muted-foreground">Nuevo visor · Three.js + WebGL</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          {grupos.map((group, index) => <div key={group.id} className="relative min-w-0">
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
            <div><h4 className="text-sm font-semibold">Sistemas y módulos</h4><p className="text-[11px] text-muted-foreground">Selecciona una tarjeta para abrir su ficha técnica.</p></div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3"><Search className="size-3.5 text-muted-foreground"/><input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Filtrar módulos…" className="h-9 w-full min-w-0 bg-transparent text-xs outline-none sm:w-48"/></div>
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
          <div className="mt-4 rounded-xl bg-muted/50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Evidencia técnica</p><p className="mt-1 break-words font-mono text-[10px] leading-4 text-sky-700 dark:text-sky-400">{actual.evidencia || "Requiere localización exacta en auditoría"}</p></div>
          {actual.dependencias?.length ? <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Conexiones conocidas</p><div className="mt-2 flex flex-wrap gap-1.5">{actual.dependencias.map(d => <span key={d} className="rounded-lg border border-border bg-background px-2 py-1 text-[10px]">{d}</span>)}</div></div> : null}
          <div className="mt-4 border-t border-border pt-3"><p className="flex items-center gap-2 text-[10px] font-semibold text-amber-700 dark:text-amber-400"><CircleHelp className="size-3.5"/> Cómo leer los estados</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">“En nuevo visor” confirma uso observado en PublicCatalogViewer. “Visor anterior” identifica conexiones que no se heredan. “Base reutilizable” indica código aprovechable, no integración. Todo pendiente requiere contrato, pruebas y validación antes de certificarse.</p></div>
        </aside>
      </div>
    </> : null}

    {vista === "flow" ? <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2"><Workflow className="size-4 text-gold"/><h4 className="text-sm font-semibold">Flujo de trabajo del visor</h4></div>
        <p className="mt-1 text-xs text-muted-foreground">Vista conceptual de los principales recorridos de AURUM RENDER.</p>
        <div className="mt-4 grid gap-2 md:grid-cols-4">
          {[
            {title:"01 · Entrada CAD",desc:"AURUM IMPORT · Rhino / GLB · normalización",ids:["import-plugin","manager"]},
            {title:"02 · Escena 3D",desc:"Viewer · Scene · Lighting · materiales",ids:["viewer","scene","lighting","metal","gem"]},
            {title:"03 · Procesamiento",desc:"Geometría · BVH · Edge Quality · Post",ids:["geometry","solid","diamond","edge","post"]},
            {title:"04 · Entrega visual",desc:"Imagen · vídeo · render final",ids:["image","video","final","path"]},
          ].map((step,i) => <div key={step.title} className="relative rounded-xl border border-border bg-background p-3">
            <span className="text-[10px] font-bold tracking-wider text-gold">{step.title}</span><p className="mt-2 text-xs font-semibold leading-5">{step.desc}</p>
            <div className="mt-3 flex flex-wrap gap-1">{step.ids.map(id => {const n=nodos.find(x=>x.id===id);return n?<button key={id} type="button" onClick={()=>{seleccionar(n);setVista("overview");}} className="rounded-md border border-border bg-card px-2 py-1 text-[10px] hover:border-gold/40">{n.nombre}</button>:null;})}</div>
            {i<3?<div className="pointer-events-none absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-gold/30 bg-card p-1 text-gold md:block"><ChevronRight className="size-3"/></div>:null}
          </div>)}
        </div>
        <p className="mt-3 rounded-lg bg-sky-500/5 p-3 text-[10px] leading-4 text-muted-foreground"><Network className="mr-1.5 inline size-3.5 text-sky-600"/>Flujo conceptual basado en responsabilidades y consumidores conocidos; las dependencias exactas deben confirmarse durante la auditoría de código.</p>
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

    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[10px] text-muted-foreground"><GitBranch className="size-3.5"/> Inventario técnico actualizado al 14/11/2026 <span>·</span><Workflow className="size-3.5"/> Vista documental, sin modificar el motor óptico</div>
  </div>;
}
