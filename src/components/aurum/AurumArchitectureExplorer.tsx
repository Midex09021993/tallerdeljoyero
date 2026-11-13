import { useMemo, useState, type ReactNode } from "react";
import { Activity, ChevronDown, ChevronRight, CircleHelp, GitBranch, Network, Search, ShieldAlert, Workflow } from "lucide-react";

type Estado = "integrado" | "parcial" | "auditar" | "experimental" | "suspendido" | "infraestructura";
type Nodo = { id: string; nombre: string; tipo: string; estado: Estado; detalle: string; evidencia: string; dependencias?: string[]; hijos?: Nodo[] };

const estadoUI: Record<Estado, { label: string; clase: string }> = {
  integrado: { label: "Integrado", clase: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  parcial: { label: "Parcial", clase: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  auditar: { label: "Por auditar", clase: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  experimental: { label: "Experimental", clase: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400" },
  suspendido: { label: "Suspendido", clase: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400" },
  infraestructura: { label: "Infraestructura", clase: "border-border bg-muted text-muted-foreground" },
};

const arbol: Nodo[] = [
  { id: "core", nombre: "AURUM CORE", tipo: "Infraestructura común · contratos y ciclo de vida", estado: "infraestructura", detalle: "Infraestructura que registra módulos, resuelve servicios, distribuye eventos y agrupa tareas de limpieza. No sustituye la propiedad de los controladores productivos.", evidencia: "src/lib/aurum/core/", hijos: [
    { id: "registry", nombre: "Plugin Registry", tipo: "Contratos y dependencias", estado: "integrado", detalle: "Resuelve dependencias y ciclo de vida de plugins antes de inicializarlos.", evidencia: "src/lib/aurum/core/plugin-registry.ts" },
    { id: "services", nombre: "Service Container", tipo: "Servicios registrados · solo lectura", estado: "integrado", detalle: "Publica un mapa sellado de servicios para los módulos.", evidencia: "src/lib/aurum/core/service-container.ts" },
    { id: "events", nombre: "Event Bus", tipo: "Eventos de ciclo de vida", estado: "integrado", detalle: "Entrega eventos a suscriptores y reporta fallos aislados.", evidencia: "src/lib/aurum/core/context.ts" },
    { id: "scope", nombre: "Resource Scope", tipo: "Limpieza por plugin", estado: "integrado", detalle: "Agrupa funciones de limpieza; no infiere ownership GPU.", evidencia: "src/lib/aurum/core/context.ts" },
    { id: "gpu", nombre: "GPU Resource Manager", tipo: "Ownership explícito de recursos", estado: "parcial", detalle: "El servicio está disponible y probado. La adopción sobre recursos productivos sigue siendo parcial y controlada.", evidencia: "src/lib/aurum/core/gpu-resource-manager.ts" },
  ]},
  { id: "engines", nombre: "MOTORES Y ADAPTADORES", tipo: "Servicios especializados conectados al visor", estado: "infraestructura", detalle: "Varios elementos son adaptadores sobre controladores existentes, no motores autónomos.", hijos: [
    { id: "viewer", nombre: "Viewer Adapter", tipo: "Renderer, cámara y controles compartidos", estado: "integrado", detalle: "Expone referencias al visor productivo. El teardown sigue bajo disposeAurumViewer().", evidencia: "src/lib/aurum/core/viewer-adapter.ts", dependencias: ["AURUM RENDER"] },
    { id: "scene", nombre: "Scene Adapter", tipo: "Controlador de escena", estado: "integrado", detalle: "Fachada al controlador de escena existente.", evidencia: "src/lib/aurum/core/scene-adapter.ts", dependencias: ["Viewer"] },
    { id: "lighting", nombre: "Light Engine", tipo: "Rigs y entornos HDRI", estado: "parcial", detalle: "Adaptador registrado; el controlador productivo conserva la responsabilidad de iluminación y HDRI.", evidencia: "src/lib/aurum/core/lighting-adapter.ts · src/lib/aurum/lighting.ts", dependencias: ["Viewer", "Scene"] },
    { id: "metal", nombre: "Metal Engine", tipo: "Adaptador de materiales PBR", estado: "integrado", detalle: "Delegación al motor de materiales productivo; no reemplaza perfiles ni calibraciones.", evidencia: "src/lib/aurum/material-application.ts", dependencias: ["Lighting"] },
    { id: "gem", nombre: "Gem Engine", tipo: "Adaptador al motor óptico", estado: "integrado", detalle: "Delega en el motor óptico productivo. No implica cambios a shaders, BVH ni calibración.", evidencia: "src/lib/aurum/material-application.ts", dependencias: ["Lighting", "Metal"] },
    { id: "diamond", nombre: "Diamond Pipeline / BVH", tipo: "Runtime óptico especializado", estado: "auditar", detalle: "Existe en el runtime especializado. Su frontera con los contratos modulares se debe auditar; no declararlo plugin autónomo.", evidencia: "src/lib/aurum/ · pipeline óptico existente", dependencias: ["Gem Engine"] },
    { id: "transition", nombre: "AURUM GEM TRANSITION", tipo: "Transición progresiva de gemas", estado: "suspendido", detalle: "Permanece suspendido. No reactivar ni modificar durante esta auditoría.", evidencia: "Configuración de transición" },
    { id: "final", nombre: "Final Render Adapter", tipo: "Captura final bajo demanda", estado: "auditar", detalle: "Adaptador bajo demanda. La captura real, restauración de estado y coste deben validarse con escenas de referencia.", evidencia: "src/lib/aurum/core/final-render-adapter.ts", dependencias: ["Viewer", "Post"] },
    { id: "edge", nombre: "AURUM EDGE QUALITY", tipo: "MSAA / TAA", estado: "parcial", detalle: "MSAA integrado en targets del compositor; TAA permanece en el pipeline existente; SSAA no está implementado.", evidencia: "src/lib/aurum/edge-quality.ts", dependencias: ["Post"] },
    { id: "post", nombre: "Post Engine", tipo: "Composición y efectos", estado: "parcial", detalle: "Usa el compositor productivo. Confirmar consumidores y contratos sin duplicar pases ni loops.", evidencia: "src/lib/aurum/ · post pipeline", dependencias: ["Viewer", "Edge Quality"] },
  ]},
  { id: "import", nombre: "IMPORTACIÓN Y GEOMETRÍA", tipo: "CAD / 3D · normalización y diagnóstico", estado: "integrado", detalle: "Pipeline de importación integrado en el visor; decodificadores y normalización siguen siendo los motores productivos.", evidencia: "src/lib/aurum/core/import-plugin.ts · src/lib/aurum/model-loader.ts", hijos: [
    { id: "import-plugin", nombre: "AURUM IMPORT", tipo: "Formatos CAD / 3D", estado: "integrado", detalle: "El visor consume aurum.import.manager. Incluye checkpoints de cancelación y limpieza de geometría.", evidencia: "src/lib/aurum/core/import-plugin.ts", dependencias: ["Viewer"] },
    { id: "manager", nombre: "Import Pipeline Manager", tipo: "Orquestación, cancelación y presupuestos", estado: "integrado", detalle: "Coordina etapas y presupuestos informativos; la cancelación de decodificadores externos ocurre en puntos seguros.", evidencia: "src/lib/aurum/core/import-pipeline-manager.ts", dependencias: ["AURUM IMPORT"] },
    { id: "geometry", nombre: "AURUM GEOMETRY / Smart Scan", tipo: "Inspección de solo lectura", estado: "integrado", detalle: "Triaje ligero y diagnóstico geométrico; no modifica ni repara buffers.", evidencia: "src/lib/aurum/geometry/ · src/lib/aurum/core/", dependencias: ["AURUM IMPORT"] },
    { id: "solid", nombre: "Solid · Intersection · Broadphase", tipo: "Diagnósticos geométricos", estado: "auditar", detalle: "Revisar tolerancias, precisión y escalabilidad con modelos CAD representativos.", evidencia: "src/lib/aurum/geometry/" },
    { id: "surface", nombre: "AURUM SURFACE", tipo: "Diagnóstico de aristas", estado: "experimental", detalle: "Solo lectura; no equivale a continuidad G1/G2 CAD/BREP ni a reparación de superficies.", evidencia: "src/lib/aurum/" },
    { id: "weld", nombre: "Metal Union · Visual Weld", tipo: "Unión visual experimental", estado: "experimental", detalle: "No habilitado por defecto. Mantener aislado hasta contar con pruebas geométricas y round-trip.", evidencia: "src/lib/aurum/" },
    { id: "glb", nombre: "GLB Quality Gate", tipo: "Validación round-trip", estado: "auditar", detalle: "La validación se invoca durante convertAurumToGlb(); revisar cobertura de rutas, fidelidad y limpieza de recursos.", evidencia: "src/lib/aurum/model-loader.ts", dependencias: ["AURUM IMPORT"] },
  ]},
  { id: "media", nombre: "CAPTURA Y EXPORTACIÓN", tipo: "Flujos productivos · no son plugins independientes del Registry", estado: "auditar", detalle: "Prioridad de auditoría: la salida debe reflejar fielmente el visor en tiempo real y restaurar su estado después de capturar.", evidencia: "src/components/AurumRender.tsx · src/lib/aurum/", hijos: [
    { id: "image", nombre: "AURUM IMAGE EXPORT", tipo: "PNG · JPEG · WebP", estado: "auditar", detalle: "Verificar viewport, resolución, color, composición y correspondencia con la imagen del visor.", evidencia: "src/components/AurumRender.tsx", dependencias: ["Viewer", "Post"] },
    { id: "video", nombre: "AURUM VIDEO EXPORT", tipo: "Frames · MediaRecorder", estado: "auditar", detalle: "Frame Pipeline reutiliza compositor y pases existentes, restaura estado y no es propietario del renderer/composer.", evidencia: "src/lib/aurum/video-frame-pipeline.ts · src/components/AurumRender.tsx", dependencias: ["Viewer", "Post"] },
    { id: "ratio", nombre: "Aspect Ratio Profiles", tipo: "16:9 · 1:1 · 4:5 · 9:16 · 3:2", estado: "parcial", detalle: "Perfiles compartidos; verificar que visor, captura de imagen y vídeo interpreten igual el encuadre.", evidencia: "src/lib/aurum/" },
    { id: "path", nombre: "Final / Path-Traced Capture", tipo: "Captura de alta calidad", estado: "auditar", detalle: "Servicio de captura path-traced expuesto por el host; consumidor productivo por confirmar.", evidencia: "src/lib/aurum/core/ · src/components/AurumRender.tsx", dependencias: ["Final Render Adapter"] },
  ]},
];

const todos = (nodes: Nodo[]): Nodo[] => nodes.flatMap(n => [n, ...(n.hijos ? todos(n.hijos) : [])]);
const badge = (estado: Estado) => <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${estadoUI[estado].clase}`}>{estadoUI[estado].label}</span>;

export function AurumArchitectureExplorer() {
  const [vista, setVista] = useState<"tree" | "dependencies" | "audit">("tree");
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set(["core", "engines", "import", "media"]));
  const [seleccion, setSeleccion] = useState("media");
  const [filtro, setFiltro] = useState("");
  const nodos = useMemo(() => todos(arbol), []);
  const actual = nodos.find(n => n.id === seleccion) ?? nodos[0];
  const conteo = (estado: Estado) => nodos.filter(n => n.estado === estado).length;
  const alternar = (id: string) => setAbiertos(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const renderNodo = (n: Nodo, nivel = 0): ReactNode => {
    const coincide = !filtro || n.nombre.toLowerCase().includes(filtro.toLowerCase()) || n.tipo.toLowerCase().includes(filtro.toLowerCase());
    const hijosCoinciden = n.hijos?.some(h => h.nombre.toLowerCase().includes(filtro.toLowerCase()) || h.tipo.toLowerCase().includes(filtro.toLowerCase()));
    if (!coincide && !hijosCoinciden && filtro) return null;
    const tieneHijos = Boolean(n.hijos?.length);
    const expandido = abiertos.has(n.id) || Boolean(filtro);
    return <div key={n.id} className="min-w-0">
      <div className={`flex items-center gap-2 rounded-lg px-2 py-2 transition ${seleccion === n.id ? "bg-gold/10 ring-1 ring-gold/30" : "hover:bg-muted/60"}`} style={{ marginLeft: nivel * 13 }}>
        {tieneHijos ? <button type="button" onClick={() => alternar(n.id)} aria-label={expandido ? "Contraer rama" : "Expandir rama"} className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted">{expandido ? <ChevronDown className="size-4"/> : <ChevronRight className="size-4"/>}</button> : <span className="w-6 shrink-0 text-center text-muted-foreground">·</span>}
        <button type="button" onClick={() => setSeleccion(n.id)} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-xs font-semibold text-foreground">{n.nombre}</span>
          <span className="block truncate text-[10px] text-muted-foreground">{n.tipo}</span>
        </button>
        {badge(n.estado)}
      </div>
      {tieneHijos && expandido ? <div className="ml-3 border-l border-border pl-1">{n.hijos!.map(h => renderNodo(h, nivel + 1))}</div> : null}
    </div>;
  };

  return <div className="space-y-4 px-4 py-5 sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Architecture Center · Vista interactiva</p><h3 className="mt-1 text-xl font-semibold">Explorador de arquitectura</h3><p className="mt-1 text-xs text-muted-foreground">Selecciona una rama para consultar su responsabilidad, evidencia y dependencias.</p></div>
      <div className="flex flex-wrap gap-2">
        {(["tree", "dependencies", "audit"] as const).map(v => <button key={v} type="button" onClick={() => setVista(v)} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${vista === v ? "border-gold/40 bg-gold/10 text-gold" : "border-border text-muted-foreground hover:border-gold/40"}`}>{v === "tree" ? "Árbol" : v === "dependencies" ? "Dependencias" : "Auditoría"}</button>)}
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {(["integrado", "parcial", "auditar", "experimental", "suspendido"] as Estado[]).map(s => <div key={s} className="rounded-lg border border-border bg-card px-3 py-2"><p className="text-lg font-semibold tabular-nums">{conteo(s)}</p><p className="text-[10px] text-muted-foreground">{estadoUI[s].label}</p></div>)}
    </div>
    {vista === "tree" ? <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,.9fr)]">
      <div className="min-w-0 rounded-xl border border-border bg-card p-3">
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-border px-3"><Search className="size-4 text-muted-foreground"/><input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Buscar módulo o responsabilidad…" className="h-10 min-w-0 flex-1 bg-transparent text-xs outline-none"/></div>
        <div className="space-y-1">{arbol.map(n => renderNodo(n))}</div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3 text-[10px] text-muted-foreground"><span>Los estados describen integración conocida, no aprobación de pruebas.</span></div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Ficha del componente</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><h4 className="text-base font-semibold">{actual.nombre}</h4>{badge(actual.estado)}</div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{actual.detalle}</p>
        <div className="mt-4 rounded-lg bg-muted/50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Evidencia / punto de entrada</p><p className="mt-1 break-words font-mono text-[10px] text-sky-700 dark:text-sky-400">{actual.evidencia || "Requiere localización exacta en auditoría"}</p></div>
        {actual.dependencias?.length ? <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dependencias conocidas</p><div className="mt-2 flex flex-wrap gap-2">{actual.dependencias.map(d => <span key={d} className="rounded-md border border-border px-2 py-1 text-[10px]">{d}</span>)}</div></div> : null}
        <div className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3"><p className="flex items-center gap-2 text-[10px] font-semibold text-amber-700 dark:text-amber-400"><CircleHelp className="size-3.5"/> Criterio de lectura</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">“Integrado” indica conexión productiva conocida. La certificación requiere pruebas ejecutadas y evidencia en GitHub Actions o validación funcional.</p></div>
      </div>
    </div> : null}
    {vista === "dependencies" ? <div className="grid gap-3 md:grid-cols-2">
      {[{title:"Visor y materiales",items:["AURUM RENDER","Viewer Adapter","Scene Adapter","Light Engine","Metal Engine","Gem Engine","Diamond Pipeline / BVH"]},{title:"Importación y salida",items:["AURUM IMPORT","Import Pipeline Manager","Smart Scan / Geometry","GLB Quality Gate","Post Engine","Edge Quality","Image Export","Video Export","Final Render"]}].map(group => <div key={group.title} className="rounded-xl border border-border bg-card p-4"><h4 className="text-sm font-semibold">{group.title}</h4><div className="mt-3 space-y-1">{group.items.map((item,i) => <div key={item}><div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs"><span className="grid size-5 place-items-center rounded-full bg-gold/10 text-[10px] font-bold text-gold">{i+1}</span>{item}</div>{i < group.items.length-1 ? <div className="ml-5 h-3 border-l border-border"/> : null}</div>)}</div></div>)}
      <div className="md:col-span-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs leading-5 text-muted-foreground"><Network className="mr-2 inline size-4"/>Vista de dependencias conceptual basada en consumidores y contratos conocidos; no es todavía un grafo extraído automáticamente de imports. La auditoría debe confirmar cada arista y detectar ciclos.</div>
    </div> : null}
    {vista === "audit" ? <div className="space-y-3">
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4"><div className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert className="size-4 text-amber-600"/> Auditoría pendiente de ejecución</div><p className="mt-1 text-xs leading-5 text-muted-foreground">No se marca ningún control como aprobado sin una ejecución verificable. Esta vista organiza el trabajo; no simula resultados de pruebas.</p></div>
      {[
        ["P0 · Fidelidad de exportación","Comparar imagen y vídeo exportados contra el visor en tiempo real."],
        ["P1 · Contratos y consumidores","Confirmar servicios registrados, consumidores reales y dependencias entre módulos."],
        ["P1 · Calidad GLB","Validar round-trip con modelos CAD representativos y limpieza de recursos."],
        ["P1 · Restauración y ownership","Comprobar restauración de renderer/composer y ausencia de doble dispose."],
        ["P2 · Rendimiento y escala","Probar modelos grandes, sesiones largas y cancelación de importaciones."],
        ["P2 · CI completa","Ejecutar Bun tests, TypeScript, ESLint, build y workflows de Edge Functions."]
      ].map(([title,desc]) => <div key={title} className="flex gap-3 rounded-xl border border-border bg-card p-3"><Activity className="mt-0.5 size-4 shrink-0 text-gold"/><div><p className="text-xs font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{desc}</p></div><span className="ml-auto h-fit rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-700 dark:text-amber-400">Pendiente</span></div>)}
    </div> : null}
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[10px] text-muted-foreground"><GitBranch className="size-3.5"/> Fuente: inventario técnico revisado el 13/11/2026 <span>·</span><Workflow className="size-3.5"/> Vista documental, sin modificar el motor óptico</div>
  </div>;
}
