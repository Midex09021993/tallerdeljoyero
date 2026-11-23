import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Eye, Grid3X3, RotateCcw, ScanLine, ShieldCheck, X } from "lucide-react";

type Escenario = "cerrado" | "abierto" | "duplicado" | "delgado";
type ModoVista = "sombreado" | "alambre" | "defectos";
const escenarios: Array<{ id: Escenario; nombre: string; detalle: string; hallazgo: string; accion: string }> = [
  { id: "cerrado", nombre: "Volumen cerrado", detalle: "Las caras forman un volumen continuo.", hallazgo: "Condición geométrica favorable. Confirma el estado de sólido cerrado en Rhino.", accion: "Ejecuta ShowEdges y comprueba que no existan bordes desnudos." },
  { id: "abierto", nombre: "Borde desnudo", detalle: "Existe una abertura en la geometría.", hallazgo: "La geometría presenta una abertura conceptual; no debe tratarse como sólido cerrado.", accion: "Localiza los bordes desnudos, revisa tolerancias y encuentra la causa antes de unir." },
  { id: "duplicado", nombre: "Geometría duplicada", detalle: "Dos elementos coinciden o se superponen.", hallazgo: "Hay dos cuerpos superpuestos. Pueden provocar problemas al mallar o fabricar.", accion: "Utiliza SelDup y revisa intersecciones y superficies coincidentes." },
  { id: "delgado", nombre: "Detalle muy fino", detalle: "Una zona del modelo tiene una sección reducida.", hallazgo: "La zona marcada requiere revisión dimensional. La viabilidad depende del proceso y material.", accion: "Mide la sección real y contrástala con las especificaciones del fabricante." }
];
const checks = [
  { id: "solid", label: "He comprobado si el objeto es un sólido cerrado" },
  { id: "edges", label: "He revisado bordes desnudos y superficies abiertas" },
  { id: "duplicates", label: "He buscado objetos duplicados o solapados" },
  { id: "thickness", label: "He revisado espesores, uniones y detalles pequeños" },
  { id: "backup", label: "He conservado una copia antes de reparar" }
];

function buildInspectionModel(escenario: Escenario, modo: ModoVista, espesor: number) {
  const group = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: "#c99d52", metalness: 0.68, roughness: 0.28, side: THREE.DoubleSide });
  const goldLight = new THREE.MeshStandardMaterial({ color: "#e4c17e", metalness: 0.58, roughness: 0.24, side: THREE.DoubleSide });
  const warning = new THREE.MeshStandardMaterial({ color: "#f08a42", emissive: "#7d3210", emissiveIntensity: 0.35, metalness: 0.25, roughness: 0.38 });
  const wire = modo !== "sombreado";
  const material = wire ? new THREE.MeshStandardMaterial({ color: modo === "defectos" ? "#e9a06c" : "#9fc5d8", wireframe: true, metalness: 0.1, roughness: 0.65 }) : gold;
  const addEdges = (mesh: THREE.Mesh, color = "#e8c987") => {
    if (modo === "sombreado") {
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 24), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 }));
      edges.position.copy(mesh.position); edges.rotation.copy(mesh.rotation); edges.scale.copy(mesh.scale); group.add(edges);
    }
  };
  const addMesh = (geometry: THREE.BufferGeometry, mat = material, position = new THREE.Vector3()) => {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.copy(position); mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh); addEdges(mesh); return mesh;
  };

  if (escenario === "cerrado") {
    addMesh(new THREE.TorusGeometry(1.18, 0.22, 28, 100), material);
    addMesh(new THREE.CylinderGeometry(0.26, 0.26, 0.18, 48), goldLight, new THREE.Vector3(0, 1.12, 0));
    addMesh(new THREE.SphereGeometry(0.32, 32, 24), goldLight, new THREE.Vector3(0, 1.42, 0));
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      addMesh(new THREE.CylinderGeometry(0.045, 0.055, 0.45, 10), goldLight, new THREE.Vector3(Math.cos(a) * 0.29, 1.36, Math.sin(a) * 0.29));
    }
  } else if (escenario === "abierto") {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.22, 28, 100, Math.PI * 1.72), material);
    arc.rotation.x = Math.PI / 2; arc.rotation.z = -Math.PI * 0.36; group.add(arc);
    const tip1 = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), warning);
    tip1.position.set(-0.9, 0.04, -0.72); group.add(tip1);
    const tip2 = tip1.clone(); tip2.position.set(0.9, 0.04, 0.72); group.add(tip2);
    const gap = new THREE.Line(new THREE.BufferGeometry().setFromPoints([tip1.position, tip2.position]), new THREE.LineDashedMaterial({ color: "#f08a42", dashSize: 0.1, gapSize: 0.07 }));
    gap.computeLineDistances(); group.add(gap);
  } else if (escenario === "duplicado") {
    const first = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.23, 24, 80), material);
    first.rotation.x = Math.PI / 2; group.add(first);
    const second = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.23, 24, 80), new THREE.MeshStandardMaterial({ color: "#f08a42", wireframe: modo !== "sombreado", transparent: true, opacity: 0.72, metalness: 0.3, roughness: 0.35 }));
    second.rotation.x = Math.PI / 2; second.position.set(0.2, 0.12, 0.05); group.add(second);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), warning); marker.position.set(0.1, 0.3, 0.95); group.add(marker);
  } else {
    addMesh(new THREE.TorusGeometry(1.15, Math.max(0.045, espesor * 0.095), 18, 96), material);
    addMesh(new THREE.CylinderGeometry(0.045, 0.07, 0.9, 12), warning, new THREE.Vector3(0, 0.65, 0));
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14), warning);
    marker.position.set(0, 1.2, 0); group.add(marker);
    const dimension = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.55, 0.2, 0), new THREE.Vector3(0.55, 0.2, 0)]), new THREE.LineDashedMaterial({ color: "#f08a42", dashSize: 0.08, gapSize: 0.05 }));
    dimension.computeLineDistances(); group.add(dimension);
  }
  if (modo === "defectos") {
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12), warning);
    marker.position.set(0, escenario === "delgado" ? 1.45 : 0.9, 1.25); group.add(marker);
  }
  return group;
}

export default function LaboratorioValidacionModelo() {
  const [abierto, setAbierto] = useState(false);
  const [escenario, setEscenario] = useState<Escenario>("cerrado");
  const [modoVista, setModoVista] = useState<ModoVista>("sombreado");
  const [espesor, setEspesor] = useState(1.2);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [nota, setNota] = useState("");
  const [resultado, setResultado] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const actual = escenarios.find(x => x.id === escenario)!;
  const completo = checks.every(x => seleccion.includes(x.id));
  const reset = () => {
    setEscenario("cerrado"); setModoVista("sombreado"); setEspesor(1.2);
    setSeleccion([]); setNota(""); setResultado(false);
    if (cameraRef.current && rendererRef.current && sceneRef.current) {
      cameraRef.current.position.set(4.8, 3.2, 5.8); cameraRef.current.lookAt(0, 0.15, 0);
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  };
  const toggle = (id: string) => { setSeleccion(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]); setResultado(false); };

  useEffect(() => {
    if (!abierto || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const scene = new THREE.Scene(); scene.background = new THREE.Color("#0b1219");
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(4.8, 3.2, 5.8); camera.lookAt(0, 0.15, 0);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
    scene.add(new THREE.HemisphereLight("#dce8f2", "#26303b", 2.0));
    const key = new THREE.DirectionalLight("#ffe0a1", 3.2); key.position.set(3, 6, 5); scene.add(key);
    const rim = new THREE.DirectionalLight("#78a9c8", 2.0); rim.position.set(-5, 2, -4); scene.add(rim);
    const grid = new THREE.GridHelper(10, 20, "#34495a", "#1b2a36"); grid.position.y = -1.2; scene.add(grid);
    sceneRef.current = scene; rendererRef.current = renderer; cameraRef.current = camera;
    let dragging = false, lastX = 0, lastY = 0;
    let theta = Math.atan2(camera.position.x, camera.position.z);
    let phi = Math.acos(camera.position.y / camera.position.length());
    let radius = camera.position.length();
    const updateCamera = () => {
      phi = THREE.MathUtils.clamp(phi, 0.22, Math.PI - 0.22);
      radius = THREE.MathUtils.clamp(radius, 3.2, 12);
      camera.position.set(radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta));
      camera.lookAt(0, 0.15, 0); renderer.render(scene, camera);
    };
    const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => { if (!dragging) return; theta -= (e.clientX - lastX) * 0.008; phi -= (e.clientY - lastY) * 0.008; lastX = e.clientX; lastY = e.clientY; updateCamera(); };
    const up = () => { dragging = false; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); radius += e.deltaY * 0.006; updateCamera(); };
    canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up); canvas.addEventListener("wheel", wheel, { passive: false });
    const resize = () => { const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return; renderer.setSize(rect.width, rect.height, false); camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix(); renderer.render(scene, camera); };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    return () => {
      observer.disconnect();
      canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up); canvas.removeEventListener("wheel", wheel);
      scene.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(m => m.dispose()); } });
      renderer.dispose(); sceneRef.current = null; rendererRef.current = null; cameraRef.current = null; modelRef.current = null;
    };
  }, [abierto]);

  useEffect(() => {
    const scene = sceneRef.current, renderer = rendererRef.current, camera = cameraRef.current;
    if (!scene || !renderer || !camera) return;
    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(m => m.dispose()); } });
    }
    const model = buildInspectionModel(escenario, modoVista, espesor);
    scene.add(model); modelRef.current = model; renderer.render(scene, camera);
  }, [abierto, escenario, modoVista, espesor]);

  const vistas = [
    { id: "sombreado" as const, label: "Sombreado", Icon: Eye },
    { id: "alambre" as const, label: "Alambre", Icon: Grid3X3 },
    { id: "defectos" as const, label: "Defectos", Icon: ScanLine }
  ];

  return <>
    <section className="mt-7 overflow-hidden rounded-2xl border border-[#344352] bg-[#171F28] text-[#E8EDF2]">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-300">FADILAB · SESIÓN 08 · LABORATORIO INDEPENDIENTE</p><h4 className="mt-1 text-xl font-semibold">MODEL VALIDATION LAB PRO</h4><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">Inspección tridimensional de geometría, detección de incidencias y preparación del modelo antes de fabricación.</p><div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-300"><span className="rounded-full border border-white/15 px-3 py-1.5">Viewport 3D</span><span className="rounded-full border border-white/15 px-3 py-1.5">Bordes y duplicados</span><span className="rounded-full border border-white/15 px-3 py-1.5">Detalles críticos</span></div></div>
        <button type="button" onClick={() => setAbierto(true)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-b from-amber-200 to-amber-500 px-5 py-3 text-sm font-bold text-[#21180A] shadow-lg hover:brightness-105"><ShieldCheck className="size-4" /> Abrir laboratorio <span aria-hidden="true">→</span></button>
      </div>
      <p className="border-t border-white/10 px-5 py-3 text-[11px] leading-5 text-[#9EADBA]">Simulación didáctica 3D. No analiza archivos 3DM ni sustituye ShowEdges, SelDup o la validación dimensional en Rhino. La aptitud de fabricación depende del proceso, material y especificaciones del fabricante.</p>
    </section>

    {abierto && <div className="fixed inset-0 z-[160] flex h-[100dvh] flex-col overflow-hidden bg-[#10141A] text-white" role="dialog" aria-modal="true" aria-label="Model Validation Lab Pro · Sesión 08">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#1C2129] px-4 py-3 sm:px-6">
        <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-300">FADILAB / AURUM LAB / SESIÓN 08</p><h2 className="text-lg font-semibold">Model Validation Lab Pro</h2><p className="text-[11px] text-slate-400">3D inspection · pre-manufacturing review</p></div>
        <div className="flex gap-2"><button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/5"><RotateCcw className="size-3.5" /> Reiniciar</button><button type="button" onClick={() => setAbierto(false)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold hover:border-amber-300/60"><X className="size-4" /> Cerrar</button></div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_390px] lg:overflow-hidden">
        <main className="flex min-h-[430px] min-w-0 flex-col border-b border-white/10 lg:min-h-0 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3"><div><p className="text-xs font-semibold">Viewport de inspección 3D</p><p className="text-[10px] text-slate-400">Arrastra para orbitar · rueda para zoom · modelo conceptual interactivo</p></div><div className="flex gap-1.5">{vistas.map(({ id, label, Icon }) => <button key={id} type="button" onClick={() => setModoVista(id)} aria-pressed={modoVista === id} className={\`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] \${modoVista === id ? "border-[#D2AD68] bg-[#D2AD68]/15 text-[#F1D9A6]" : "border-white/15 text-slate-300 hover:bg-white/5"}\`}><Icon className="size-3.5" />{label}</button>)}</div></div>
          <div className="relative min-h-[330px] flex-1 bg-[#0b1219]"><canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" aria-label={\`Modelo tridimensional de inspección: \${actual.nombre}\`} /><div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-white/10 bg-[#111a23]/85 px-3 py-2 text-[10px] text-slate-300 backdrop-blur"><span className="text-[#e4c17e]">CASO 0{escenarios.findIndex(s => s.id === escenario) + 1}</span><span className="mx-2 text-slate-600">/</span>{modoVista.toUpperCase()}</div><div className="pointer-events-none absolute bottom-4 left-4 flex flex-wrap gap-3 rounded-lg border border-white/10 bg-[#111a23]/85 px-3 py-2 text-[9px] text-slate-300 backdrop-blur"><span><i className="mr-1.5 inline-block size-2 rounded-full bg-[#c99d52]" />Geometría</span><span><i className="mr-1.5 inline-block size-2 rounded-full bg-[#f08a42]" />Zona a revisar</span><span><i className="mr-1.5 inline-block size-2 rounded-full bg-[#9fc5d8]" />Alambre</span></div></div>
          <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-[#151E27]"><div className="px-4 py-3"><p className="text-[9px] uppercase text-slate-500">Escenario</p><p className="mt-1 text-xs font-semibold">{actual.nombre}</p></div><div className="px-4 py-3"><p className="text-[9px] uppercase text-slate-500">Visualización</p><p className="mt-1 text-xs font-semibold capitalize">{modoVista}</p></div><div className="px-4 py-3"><p className="text-[9px] uppercase text-slate-500">Referencia visual</p><p className="mt-1 text-xs font-semibold text-amber-200">{escenario === "delgado" ? \`\${espesor.toFixed(1)} mm\` : "N/A"}</p></div></div>
        </main>

        <aside className="min-h-0 space-y-4 overflow-y-auto bg-[#151E27] p-4 sm:p-5">
          <section><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#D2AD68]">01 · Selecciona un caso</p><div className="mt-3 grid grid-cols-2 gap-2">{escenarios.map((s, i) => <button key={s.id} type="button" onClick={() => { setEscenario(s.id); setResultado(false); }} aria-pressed={escenario === s.id} className={\`rounded-xl border p-3 text-left \${escenario === s.id ? "border-[#D2AD68]/70 bg-[#D2AD68]/15" : "border-white/10 bg-[#101820] hover:border-white/25"}\`}><span className="block text-[9px] font-bold tracking-wider text-[#D8B979]">CASO 0{i + 1}</span><span className="mt-1 block text-xs font-semibold">{s.nombre}</span><span className="mt-1 block text-[10px] leading-4 text-slate-400">{s.detalle}</span></button>)}</div></section>

          {escenario === "delgado" && <section className="rounded-xl border border-white/10 bg-[#222B36] p-4"><label className="flex justify-between text-xs">Espesor de referencia <b className="text-[#f1d9a6]">{espesor.toFixed(1)} mm</b></label><input type="range" min=".3" max="3" step=".1" value={espesor} onChange={e => { setEspesor(+e.target.value); setResultado(false); }} className="mt-3 w-full accent-[#C6A15B]" /><p className="mt-2 text-[10px] leading-5 text-slate-400">Este control modifica la geometría ilustrativa. No establece un espesor mínimo universal ni determina la viabilidad de fabricación.</p></section>}

          <section className="rounded-xl border border-white/10 bg-[#222B36] p-4"><div className="flex items-center gap-2"><AlertTriangle className="size-4 text-[#D8B979]" /><h3 className="text-sm font-semibold">Hallazgo del escenario</h3></div><p className="mt-2 text-xs leading-5 text-slate-300">{actual.hallazgo}</p><div className="mt-3 rounded-lg border border-white/10 bg-[#101820] p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-[#D8B979]">Acción recomendada en Rhino</p><p className="mt-1 text-[11px] leading-5 text-slate-300">{actual.accion}</p></div></section>

          <section className="rounded-xl border border-white/10 bg-[#222B36] p-4"><div className="flex items-center gap-2"><ClipboardCheck className="size-4 text-[#D8B979]" /><h3 className="text-sm font-semibold">02 · Lista de inspección</h3></div><div className="mt-3 space-y-3">{checks.map(c => <label key={c.id} className="flex cursor-pointer items-start gap-2.5 text-xs leading-5 text-slate-300"><input type="checkbox" checked={seleccion.includes(c.id)} onChange={() => toggle(c.id)} className="mt-0.5 accent-[#C6A15B]" /><span>{c.label}</span></label>)}</div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gradient-to-r from-amber-300 to-[#B99552] transition-all" style={{ width: \`\${seleccion.length / checks.length * 100}%\` }} /></div><p className="mt-2 text-[10px] text-slate-400">{seleccion.length} de {checks.length} verificaciones marcadas</p></section>

          <section className="rounded-xl border border-[#C6A15B]/25 bg-[#C6A15B]/5 p-4"><h3 className="text-sm font-semibold">03 · Registro de revisión</h3><textarea value={nota} onChange={e => setNota(e.target.value)} rows={3} placeholder="Anota defectos encontrados, causa probable y correcciones…" className="mt-3 w-full rounded-lg border border-white/10 bg-[#101820] px-3 py-2 text-xs text-white placeholder:text-slate-500" /><button type="button" disabled={!completo} onClick={() => setResultado(true)} className="mt-3 w-full rounded-lg bg-[#C6A15B] px-3 py-2.5 text-xs font-bold text-[#17130B] disabled:cursor-not-allowed disabled:opacity-40">Finalizar inspección</button>{resultado && <p className="mt-2 flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 className="size-4" /> Revisión completada en esta ventana. Conserva tus observaciones en tu archivo de práctica.</p>}</section>
          <section className="rounded-xl border border-white/10 bg-[#222B36] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#D8B979]">Flujo de control de calidad</p><ol className="mt-2 space-y-2 text-[11px] leading-5 text-slate-300"><li>1. Inspeccionar la geometría y detectar anomalías.</li><li>2. Identificar la causa antes de modificar el modelo.</li><li>3. Corregir en Rhino y volver a verificar.</li><li>4. Preparar la exportación según el proceso de fabricación.</li></ol></section>
          <p className="text-[10px] leading-5 text-slate-500">La lista y las notas son locales a esta ventana. Esta simulación no lee ni valida un archivo 3DM y no envía resultados al expediente académico.</p>
        </aside>
      </div>
    </div>}
  </>;
}
