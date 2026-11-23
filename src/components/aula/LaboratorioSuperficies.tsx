import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ArrowRight, Check, Eye, Grid3X3, RotateCcw, ScanLine, Waves, X } from "lucide-react";

type Operacion = "barrido" | "carril" | "organica";
type Perfil = "circular" | "ovalado" | "rectangular";
type Analisis = "sombreado" | "isocurvas" | "zebra" | "curvatura";

const operaciones: Array<{ id: Operacion; nombre: string; comando: string; objetivo: string }> = [
  { id: "barrido", nombre: "Barrido por carril", comando: "Sweep1", objetivo: "Construye una superficie desplazando una sección a lo largo de una curva guía." },
  { id: "carril", nombre: "Revolución por carril", comando: "RailRevolve", objetivo: "Estudia la relación entre perfil, eje y carril para controlar una forma de revolución." },
  { id: "organica", nombre: "Forma orgánica", comando: "Sweep1 · secciones", objetivo: "Explora una transición variable mediante perfiles y secciones distribuidas sobre una trayectoria." }
];

type SurfaceParams = { sections: number; curvature: number; twist: number; profile: Perfil; taper: number; operation: Operacion };

function surfacePoint(t: number, v: number, p: SurfaceParams) {
  const x = (t - 0.5) * 5.2;
  const bend = p.curvature / 100;
  const y = Math.sin(t * Math.PI * 1.65) * bend * 1.45 + (p.operation === "carril" ? Math.sin(t * Math.PI * 3) * 0.16 : 0);
  const z = Math.cos(t * Math.PI * 1.35) * bend * 0.42;
  const taper = 1 - p.taper / 100 * Math.sin(t * Math.PI * 0.5);
  const angle = v * Math.PI * 2;
  const twist = (p.twist * Math.PI / 180) * t;
  let a = Math.cos(angle);
  let b = Math.sin(angle);
  if (p.profile === "ovalado") { a *= 1.32; b *= 0.68; }
  if (p.profile === "rectangular") {
    const power = 0.42;
    a = Math.sign(a) * Math.pow(Math.abs(a), power);
    b = Math.sign(b) * Math.pow(Math.abs(b), power);
    a *= 1.08; b *= 0.82;
  }
  const radius = (p.operation === "organica" ? 0.48 + 0.18 * Math.sin(t * Math.PI) : 0.52) * taper;
  const ry = a * radius;
  const rz = b * radius;
  const c = Math.cos(twist), s = Math.sin(twist);
  return new THREE.Vector3(x, y + ry * c - rz * s, z + ry * s + rz * c);
}

function buildSurface(p: SurfaceParams, mode: Analisis) {
  const uCount = 72;
  const vCount = 40;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const base = new THREE.Color("#c99d52");
  const hot = new THREE.Color("#e7d5ad");
  const cool = new THREE.Color("#527d9c");
  for (let i = 0; i <= uCount; i++) {
    const t = i / uCount;
    for (let j = 0; j <= vCount; j++) {
      const v = j / vCount;
      const point = surfacePoint(t, v, p);
      positions.push(point.x, point.y, point.z);
      const bend = Math.abs(Math.sin(t * Math.PI * 2.4)) * 0.65 + Math.abs(Math.cos(v * Math.PI * 2)) * 0.35;
      const color = mode === "curvatura" ? cool.clone().lerp(hot, Math.min(1, bend)) : base.clone().lerp(hot, 0.12 + bend * 0.12);
      colors.push(color.r, color.g, color.b);
    }
  }
  for (let i = 0; i < uCount; i++) for (let j = 0; j < vCount; j++) {
    const a = i * (vCount + 1) + j, b = a + vCount + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true, metalness: 0.62, roughness: 0.31,
    side: THREE.DoubleSide, wireframe: mode === "isocurvas"
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.add(mesh);

  if (mode === "isocurvas" || mode === "zebra") {
    const lineMaterial = new THREE.LineBasicMaterial({ color: mode === "zebra" ? "#e9edf2" : "#7fa7bd", transparent: true, opacity: mode === "zebra" ? 0.78 : 0.72 });
    const darkMaterial = new THREE.LineBasicMaterial({ color: "#1a2530", transparent: true, opacity: 0.9 });
    const uLines = mode === "zebra" ? 30 : 14;
    for (let i = 0; i <= uLines; i++) {
      const points: THREE.Vector3[] = [];
      const t = i / uLines;
      for (let j = 0; j <= 80; j++) points.push(surfacePoint(t, j / 80, p));
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mode === "zebra" && i % 2 ? darkMaterial : lineMaterial));
    }
    for (let j = 0; j < (mode === "zebra" ? 14 : 10); j++) {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 100; i++) points.push(surfacePoint(i / 100, j / (mode === "zebra" ? 14 : 10), p));
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial));
    }
  }

  const railPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const point = surfacePoint(t, 0, p);
    point.y -= 0.58;
    point.z -= 0.12;
    railPoints.push(point);
  }
  const rail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(railPoints), new THREE.LineDashedMaterial({ color: "#65c7a1", dashSize: 0.12, gapSize: 0.08, linewidth: 1.5 }));
  rail.computeLineDistances();
  group.add(rail);

  for (let i = 0; i < p.sections; i++) {
    const t = p.sections === 1 ? 0.5 : i / (p.sections - 1);
    const points: THREE.Vector3[] = [];
    for (let j = 0; j <= 64; j++) points.push(surfacePoint(t, j / 64, p));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: "#b9d8e8", transparent: true, opacity: 0.9 })));
    const center = surfacePoint(t, 0, p);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), new THREE.MeshStandardMaterial({ color: "#f1d8a4", emissive: "#6b4b1d", emissiveIntensity: 0.25 }));
    marker.position.copy(center);
    group.add(marker);
  }
  return group;
}

export default function LaboratorioSuperficies() {
  const [abierto, setAbierto] = useState(false);
  const [operacion, setOperacion] = useState<Operacion>("barrido");
  const [secciones, setSecciones] = useState(5);
  const [curvatura, setCurvatura] = useState(42);
  const [giro, setGiro] = useState(18);
  const [perfil, setPerfil] = useState<Perfil>("circular");
  const [conicidad, setConicidad] = useState(18);
  const [analisis, setAnalisis] = useState<Analisis>("sombreado");
  const [pasos, setPasos] = useState<string[]>([]);
  const [respuesta, setRespuesta] = useState("");
  const [verificado, setVerificado] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const actual = operaciones.find(x => x.id === operacion)!;
  const progreso = pasos.length;

  const reset = () => {
    setOperacion("barrido"); setSecciones(5); setCurvatura(42); setGiro(18);
    setPerfil("circular"); setConicidad(18); setAnalisis("sombreado");
    setPasos([]); setRespuesta(""); setVerificado(false);
    if (cameraRef.current) { cameraRef.current.position.set(5.8, 4.2, 7.2); cameraRef.current.lookAt(0, 0, 0); rendererRef.current?.render(sceneRef.current!, cameraRef.current); }
  };

  useEffect(() => {
    if (!abierto || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0b1219");
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(5.8, 4.2, 7.2);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    scene.add(new THREE.HemisphereLight("#dce8f2", "#26303b", 2.1));
    const key = new THREE.DirectionalLight("#ffe0a1", 3.1); key.position.set(3, 6, 5); scene.add(key);
    const rim = new THREE.DirectionalLight("#78a9c8", 2.2); rim.position.set(-5, 2, -4); scene.add(rim);
    const grid = new THREE.GridHelper(12, 24, "#34495a", "#1b2a36"); grid.position.y = -1.15; scene.add(grid);
    const axes = new THREE.AxesHelper(1.2); axes.position.set(-2.9, -1.13, -1.4); scene.add(axes);
    sceneRef.current = scene; rendererRef.current = renderer; cameraRef.current = camera;
    let dragging = false, lastX = 0, lastY = 0;
    let theta = Math.atan2(camera.position.x, camera.position.z);
    let phi = Math.acos(camera.position.y / camera.position.length());
    let radius = camera.position.length();
    const updateCamera = () => {
      phi = THREE.MathUtils.clamp(phi, 0.22, Math.PI - 0.22);
      radius = THREE.MathUtils.clamp(radius, 4.2, 13);
      camera.position.set(radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta));
      camera.lookAt(0, 0, 0); renderer.render(scene, camera);
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
      scene.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Line) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(material => material.dispose()); } });
      renderer.dispose(); sceneRef.current = null; rendererRef.current = null; cameraRef.current = null; modelRef.current = null;
    };
  }, [abierto]);

  useEffect(() => {
    const scene = sceneRef.current, renderer = rendererRef.current, camera = cameraRef.current;
    if (!scene || !renderer || !camera) return;
    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => material.dispose());
        }
      });
    }
    const model = buildSurface({ sections: secciones, curvature: curvatura, twist: giro, profile: perfil, taper: conicidad, operation: operacion }, analisis);
    scene.add(model); modelRef.current = model;
    renderer.render(scene, camera);
  }, [abierto, operacion, secciones, curvatura, giro, perfil, conicidad, analisis]);

  const togglePaso = (id: string) => setPasos(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const slider = (label: string, value: number, min: number, max: number, suffix: string, onChange: (value: number) => void) => (
    <div><label className="flex justify-between gap-3 text-xs text-slate-200"><span>{label}</span><b className="text-[#f1d9a6]">{value}{suffix}</b></label><input type="range" min={min} max={max} value={value} onChange={e => { onChange(+e.target.value); setVerificado(false); }} className="mt-2 w-full accent-[#C6A15B]" /></div>
  );

  return <>
    <section className="mt-7 overflow-hidden rounded-2xl border border-[#344352] bg-[#171F28] text-[#E8EDF2]">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-300">FADILAB · SESIÓN 07 · LABORATORIO INDEPENDIENTE</p><h4 className="mt-1 text-xl font-semibold">SURFACE STUDIO PRO</h4><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">Construcción paramétrica de superficies, edición de secciones y análisis visual de continuidad y curvatura.</p><div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-300"><span className="rounded-full border border-white/15 px-3 py-1.5">Viewport 3D</span><span className="rounded-full border border-white/15 px-3 py-1.5">Secciones paramétricas</span><span className="rounded-full border border-white/15 px-3 py-1.5">Isocurvas · Zebra</span></div></div>
        <button type="button" onClick={() => setAbierto(true)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-b from-amber-200 to-amber-500 px-5 py-3 text-sm font-bold text-[#21180A] shadow-lg hover:brightness-105"><Waves className="size-4" /> Abrir laboratorio <ArrowRight className="size-4" /></button>
      </div>
      <p className="border-t border-white/10 px-5 py-3 text-[11px] leading-5 text-[#9EADBA]">Simulación paramétrica 3D para aprendizaje. No genera ni valida superficies NURBS nativas y no sustituye la inspección del modelo en Rhino.</p>
    </section>

    {abierto && <div className="fixed inset-0 z-[160] flex h-[100dvh] flex-col overflow-hidden bg-[#10141A] text-white" role="dialog" aria-modal="true" aria-label="Surface Studio Pro · Sesión 07">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#1C2129] px-4 py-3 sm:px-6">
        <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-300">FADILAB / AURUM LAB / SESIÓN 07</p><h2 className="text-lg font-semibold">Surface Studio Pro</h2><p className="text-[11px] text-slate-400">Parametric Surface Lab · viewport interactivo</p></div>
        <div className="flex gap-2"><button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/5"><RotateCcw className="size-3.5" /> Reiniciar</button><button type="button" onClick={() => setAbierto(false)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold hover:border-amber-300/60"><X className="size-4" /> Cerrar</button></div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_370px] lg:overflow-hidden">
        <main className="flex min-h-[430px] min-w-0 flex-col border-b border-white/10 lg:min-h-0 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
            <div><p className="text-xs font-semibold">Viewport de superficie 3D</p><p className="text-[10px] text-slate-400">Arrastra para orbitar · rueda para zoom · malla paramétrica en tiempo real</p></div>
            <div className="flex flex-wrap gap-1.5">{([{ id: "sombreado", label: "Sombreado", icon: Eye }, { id: "isocurvas", label: "Isocurvas", icon: Grid3X3 }, { id: "zebra", label: "Zebra", icon: ScanLine }, { id: "curvatura", label: "Curvatura", icon: Waves }] as const).map(item => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => setAnalisis(item.id)} aria-pressed={analisis === item.id} className={\`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] \${analisis === item.id ? "border-[#D2AD68] bg-[#D2AD68]/15 text-[#F1D9A6]" : "border-white/15 text-slate-300 hover:bg-white/5"}\`}><Icon className="size-3.5" />{item.label}</button>; })}</div>
          </div>
          <div className="relative min-h-[330px] flex-1 bg-[#0b1219]">
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" aria-label="Modelo paramétrico tridimensional de una superficie" />
            <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-white/10 bg-[#111a23]/85 px-3 py-2 text-[10px] text-slate-300 backdrop-blur"><span className="text-[#e4c17e]">{actual.comando}</span><span className="mx-2 text-slate-600">/</span>{analisis.toUpperCase()}</div>
            <div className="pointer-events-none absolute bottom-4 left-4 flex flex-wrap gap-3 rounded-lg border border-white/10 bg-[#111a23]/85 px-3 py-2 text-[9px] text-slate-300 backdrop-blur"><span><i className="mr-1.5 inline-block size-2 rounded-full bg-[#c99d52]" />Superficie</span><span><i className="mr-1.5 inline-block size-2 rounded-full bg-[#b9d8e8]" />Secciones</span><span><i className="mr-1.5 inline-block size-2 rounded-full bg-[#65c7a1]" />Carril</span></div>
          </div>
          <div className="grid grid-cols-4 divide-x divide-white/10 border-t border-white/10 bg-[#151E27]">
            <div className="px-3 py-3"><p className="text-[9px] uppercase text-slate-500">Operación</p><p className="mt-1 text-[11px] font-semibold">{actual.nombre}</p></div>
            <div className="px-3 py-3"><p className="text-[9px] uppercase text-slate-500">Perfil</p><p className="mt-1 text-[11px] font-semibold capitalize">{perfil}</p></div>
            <div className="px-3 py-3"><p className="text-[9px] uppercase text-slate-500">Secciones</p><p className="mt-1 text-[11px] font-semibold text-amber-200">{secciones}</p></div>
            <div className="px-3 py-3"><p className="text-[9px] uppercase text-slate-500">Torsión</p><p className="mt-1 text-[11px] font-semibold">{giro}°</p></div>
          </div>
        </main>

        <aside className="min-h-0 space-y-4 overflow-y-auto bg-[#151E27] p-4 sm:p-5">
          <section><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#D2AD68]">01 · Método de construcción</p><div className="mt-3 grid gap-2">{operaciones.map(op => <button key={op.id} type="button" onClick={() => { setOperacion(op.id); setVerificado(false); }} aria-pressed={operacion === op.id} className={\`rounded-xl border p-3 text-left \${operacion === op.id ? "border-[#D2AD68]/70 bg-[#D2AD68]/15" : "border-white/10 bg-[#101820] hover:border-white/25"}\`}><span className="block text-xs font-semibold">{op.nombre}<span className="float-right text-[9px] text-[#D8B979]">{op.comando}</span></span><span className="mt-1 block text-[10px] leading-4 text-slate-400">{op.objetivo}</span></button>)}</div></section>

          <section className="space-y-4 border-t border-white/10 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#D2AD68]">02 · Parámetros geométricos</p>
            {slider("Número de secciones", secciones, 2, 12, "", setSecciones)}
            {slider("Curvatura de trayectoria", curvatura, 0, 90, "%", setCurvatura)}
            {slider("Torsión longitudinal", giro, -90, 90, "°", setGiro)}
            {slider("Conicidad / variación de sección", conicidad, 0, 65, "%", setConicidad)}
            <div><label className="block text-xs text-slate-200">Geometría del perfil</label><div className="mt-2 grid grid-cols-3 gap-2">{(["circular", "ovalado", "rectangular"] as const).map(v => <button key={v} type="button" onClick={() => { setPerfil(v); setVerificado(false); }} aria-pressed={perfil === v} className={\`rounded-lg border px-2 py-2 text-[10px] capitalize \${perfil === v ? "border-[#C6A15B] bg-[#C6A15B]/15 text-[#F1D9A6]" : "border-white/15 text-slate-300 hover:bg-white/5"}\`}>{v}</button>)}</div></div>
          </section>

          <section className="rounded-xl border border-white/10 bg-[#222B36] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#D2AD68]">03 · Lectura técnica</p>
            <div className="mt-3 space-y-3 text-xs">
              <div className="flex items-center justify-between"><span className="text-slate-400">Distribución de secciones</span><b>{secciones} estaciones</b></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#c99d52]" style={{ width: \`\${secciones / 12 * 100}%\` }} /></div>
              <div className="flex items-center justify-between"><span className="text-slate-400">Intensidad de curvatura</span><b>{curvatura < 30 ? "Suave" : curvatura < 65 ? "Media" : "Pronunciada"}</b></div>
              <div className="flex items-center justify-between"><span className="text-slate-400">Variación de sección</span><b>{conicidad < 20 ? "Baja" : conicidad < 45 ? "Media" : "Alta"}</b></div>
              <p className="border-t border-white/10 pt-3 leading-5 text-slate-400">{analisis === "zebra" ? "Las bandas ayudan a observar visualmente cambios de reflexión y posibles quiebres de transición." : analisis === "curvatura" ? "El mapa cromático representa una lectura didáctica de variación; no es un análisis diferencial NURBS." : analisis === "isocurvas" ? "La retícula permite estudiar la distribución y dirección de las líneas sobre la superficie." : "La vista sombreada permite evaluar volumen, silueta y proporción general."}</p>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-[#222B36] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#D2AD68]">04 · Continuidad entre superficies</p>
            <div className="mt-3 space-y-2 text-xs leading-5">
              <div className="rounded-lg bg-[#101820] p-3"><b className="text-[#e4c17e]">G0 · Posición</b><p className="mt-1 text-slate-400">Las superficies se encuentran en un mismo borde.</p></div>
              <div className="rounded-lg bg-[#101820] p-3"><b className="text-[#e4c17e]">G1 · Tangencia</b><p className="mt-1 text-slate-400">La dirección tangente coincide en la unión.</p></div>
              <div className="rounded-lg bg-[#101820] p-3"><b className="text-[#e4c17e]">G2 · Curvatura</b><p className="mt-1 text-slate-400">La curvatura también mantiene una transición continua.</p></div>
            </div>
            <p className="mt-3 text-[10px] leading-4 text-slate-500">Referencia conceptual. Esta escena contiene una superficie paramétrica y no calcula continuidad matemática entre dos superficies NURBS.</p>
          </section>

          <section className="rounded-xl border border-white/10 bg-[#222B36] p-4">
            <h3 className="text-sm font-semibold">Procedimiento en Rhino</h3>
            <ol className="mt-3 space-y-2 text-xs leading-5 text-slate-300"><li>1. Dibuja el carril y prepara perfiles transversales.</li><li>2. Comprueba dirección, posición y orientación de las curvas.</li><li>3. Ejecuta {actual.comando} y selecciona las geometrías en el orden requerido.</li><li>4. Activa isocurvas y analiza la distribución de la superficie.</li><li>5. Comprueba continuidad y reflexiones con las herramientas de análisis de Rhino.</li></ol>
          </section>

          <section className="rounded-xl border border-[#C6A15B]/25 bg-[#C6A15B]/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D8B979]">05 · Evaluación de práctica</p>
            <p className="mt-2 text-xs leading-5 text-slate-300">En un barrido por carril, ¿qué función cumple la curva guía?</p>
            <div className="mt-2 space-y-2">{[{ v: "perfil", l: "Define la sección transversal" }, { v: "guia", l: "Controla el recorrido de la sección" }, { v: "capa", l: "Organiza los objetos por capas" }].map(o => <label key={o.v} className="flex cursor-pointer items-center gap-2 text-xs text-slate-300"><input type="radio" name="surfaceProQuiz" value={o.v} checked={respuesta === o.v} onChange={() => { setRespuesta(o.v); setVerificado(false); }} className="accent-[#C6A15B]" />{o.l}</label>)}</div>
            <button type="button" disabled={!respuesta} onClick={() => setVerificado(true)} className="mt-3 w-full rounded-lg bg-[#C6A15B] px-3 py-2.5 text-xs font-bold text-[#17130B] disabled:opacity-40">Comprobar respuesta</button>
            {verificado && <p className={\`mt-2 flex items-center gap-2 text-xs \${respuesta === "guia" ? "text-emerald-300" : "text-amber-200"}\`}>{respuesta === "guia" ? <><Check className="size-4" /> Correcto: la guía define el recorrido.</> : "Repasa la diferencia entre perfil y carril."}</p>}
          </section>

          <section className="rounded-xl border border-[#C6A15B]/25 bg-[#C6A15B]/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D8B979]">Registro de práctica</p><p className="mt-1 text-xs leading-5 text-slate-300">{progreso} de 3 operaciones revisadas en esta ventana.</p>
            {operaciones.map(op => <label key={op.id} className="mt-2 flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={pasos.includes(op.id)} onChange={() => togglePaso(op.id)} className="accent-[#C6A15B]" />{op.nombre}</label>)}
          </section>
          <p className="text-[10px] leading-5 text-slate-500">Los parámetros y el registro son locales a esta ventana. No se guarda un archivo 3DM ni se envían resultados al expediente académico.</p>
        </aside>
      </div>
    </div>}
  </>;
}
