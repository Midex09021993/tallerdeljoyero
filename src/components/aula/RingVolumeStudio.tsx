// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RotateCcw, X, CircleHelp, Eye, EyeOff, Box, Layers3 } from "lucide-react";

type RingProfile = "rectangular" | "comfort" | "half-round";
type CameraView = "iso" | "top" | "front" | "side";

const profileLabels: Record<RingProfile, string> = {
  rectangular: "Recto",
  comfort: "Confort",
  "half-round": "Media caña",
};

function createSection(innerDiameter: number, width: number, thickness: number, profile: RingProfile) {
  const innerRadius = innerDiameter / 2;
  const outerRadius = innerRadius + thickness;
  const halfWidth = width / 2;
  if (profile === "rectangular") {
    return [
      new THREE.Vector2(innerRadius, -halfWidth),
      new THREE.Vector2(outerRadius, -halfWidth),
      new THREE.Vector2(outerRadius, halfWidth),
      new THREE.Vector2(innerRadius, halfWidth),
      new THREE.Vector2(innerRadius, -halfWidth),
    ];
  }
  if (profile === "comfort") {
    const pts: THREE.Vector2[] = [new THREE.Vector2(innerRadius, -halfWidth + Math.min(0.45, width * 0.12))];
    const corner = Math.min(thickness * 0.42, width * 0.28);
    pts.push(new THREE.Vector2(innerRadius + corner * 0.25, -halfWidth + corner * 0.15));
    pts.push(new THREE.Vector2(outerRadius - corner, -halfWidth));
    pts.push(new THREE.Vector2(outerRadius - corner * 0.15, -halfWidth + corner * 0.18));
    pts.push(new THREE.Vector2(outerRadius, -halfWidth + corner));
    pts.push(new THREE.Vector2(outerRadius, halfWidth - corner));
    pts.push(new THREE.Vector2(outerRadius - corner * 0.15, halfWidth - corner * 0.18));
    pts.push(new THREE.Vector2(outerRadius - corner, halfWidth));
    pts.push(new THREE.Vector2(innerRadius + corner * 0.25, halfWidth - corner * 0.15));
    pts.push(new THREE.Vector2(innerRadius, halfWidth - Math.min(0.45, width * 0.12)));
    pts.push(new THREE.Vector2(innerRadius, -halfWidth + Math.min(0.45, width * 0.12)));
    return pts;
  }
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const angle = -Math.PI / 2 + (Math.PI * i) / 24;
    pts.push(new THREE.Vector2(innerRadius + thickness * Math.cos(angle), halfWidth * Math.sin(angle)));
  }
  pts.push(new THREE.Vector2(innerRadius, -halfWidth));
  return pts;
}

function getSectionMetrics(points: THREE.Vector2[]) {
  let twiceArea = 0, centroidNumerator = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const cross = a.x * b.y - b.x * a.y;
    twiceArea += cross;
    centroidNumerator += (a.x + b.x) * cross;
  }
  const area = Math.abs(twiceArea) / 2;
  const centroidRadius = Math.abs(twiceArea) > 1e-8 ? centroidNumerator / (3 * twiceArea) : 0;
  return { area, centroidRadius, volume: area > 0 && centroidRadius > 0 ? area * 2 * Math.PI * centroidRadius : 0 };
}
function SectionDrawing({ points, width, thickness }: { points: THREE.Vector2[]; width: number; thickness: number }) {
  const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y)), maxY = Math.max(...points.map(p => p.y));
  const scale = Math.min(210 / Math.max(0.1, maxX), 88 / Math.max(0.1, maxY - minY));
  const ox = 22, oy = 91 + ((minY + maxY) / 2) * scale;
  const polygon = points.map(p => (ox + p.x * scale).toFixed(1) + "," + (oy - p.y * scale).toFixed(1)).join(" ");
  const left = ox + minX * scale, right = ox + maxX * scale, top = oy - maxY * scale, bottom = oy - minY * scale;
  return <svg viewBox="0 0 320 180" className="h-[170px] w-full" role="img" aria-label={"Sección de " + width + " mm de ancho y " + thickness + " mm de espesor"}>
    <line x1="22" y1="14" x2="22" y2="157" stroke="#72CBB4" strokeDasharray="4 4" opacity=".7"/>
    <text x="29" y="20" fill="#72CBB4" fontSize="8">Eje de revolución</text>
    <polygon points={polygon} fill="#C49A54" fillOpacity=".82" stroke="#F0D69F" strokeWidth="1.8" strokeLinejoin="round"/>
    <line x1={left} y1={Math.min(150,bottom+15)} x2={right} y2={Math.min(150,bottom+15)} stroke="#D2AD68"/>
    <text x={(left+right)/2} y={Math.min(165,bottom+29)} textAnchor="middle" fill="#E6C887" fontSize="9">{thickness.toFixed(1)} mm · espesor radial</text>
    <line x1={Math.min(292,right+17)} y1={top} x2={Math.min(292,right+17)} y2={bottom} stroke="#D2AD68"/>
    <text x={Math.min(300,right+24)} y={(top+bottom)/2+3} fill="#E6C887" fontSize="9">{width.toFixed(1)} mm · ancho</text>
    <text x="14" y="169" fill="#718096" fontSize="8">Corte radial esquemático · no a escala de fabricación</text>
  </svg>;
}

function RingViewport({ innerDiameter, width, thickness, profile, cameraView, showSection }: {
  innerDiameter: number; width: number; thickness: number; profile: RingProfile; cameraView: CameraView; showSection: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const section = useMemo(() => createSection(innerDiameter, width, thickness, profile), [innerDiameter, width, thickness, profile]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0d141b");
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 300);
    const radius = Math.max(24, innerDiameter + thickness * 2.8);
    const setCamera = () => {
      if (cameraView === "top") camera.position.set(0, radius * 2.8, 0.01);
      else if (cameraView === "front") camera.position.set(0, 0, radius * 3.1);
      else if (cameraView === "side") camera.position.set(radius * 3.1, 0, 0);
      else camera.position.set(radius * 2.25, radius * 1.8, radius * 2.4);
      camera.lookAt(0, 0, 0);
    };
    setCamera();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.domElement.className = "block h-full w-full touch-none";
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xe6edf5, 0x26313d, 2.15));
    const key = new THREE.DirectionalLight(0xffe2b1, 3.4);
    key.position.set(-34, 46, 42);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9bbbd8, 1.25);
    fill.position.set(35, -18, -30);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xfff0cf, 1.1);
    rim.position.set(0, 24, -45);
    scene.add(rim);

    const grid = new THREE.GridHelper(100, 40, 0x526170, 0x26323e);
    grid.position.y = -width / 2 - 1.5;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.22;
    scene.add(grid);

    const axis = new THREE.Group();
    const axisLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -width * 1.7, 0), new THREE.Vector3(0, width * 1.7, 0)]),
      new THREE.LineDashedMaterial({ color: 0x73c9b2, dashSize: 1.8, gapSize: 1.2 })
    );
    axisLine.computeLineDistances();
    axis.add(axisLine);
    scene.add(axis);

    const points = section.map(p => new THREE.Vector2(p.x, p.y));
    const geometry = new THREE.LatheGeometry(points, 128);
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      color: 0xc49a54, metalness: 0.72, roughness: 0.24,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(geometry, material);
    scene.add(ring);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xf3d99e, transparent: true, opacity: 0.38 });
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 32), edgeMaterial);
    scene.add(edges);

    if (showSection) {
      const sourcePoints = section.map(p => new THREE.Vector3(p.x, p.y, 0));
      const source = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(sourcePoints),
        new THREE.LineBasicMaterial({ color: 0x72cbb4 })
      );
      scene.add(source);
      sourcePoints.forEach(point => {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 12, 8),
          new THREE.MeshStandardMaterial({ color: 0x72cbb4, emissive: 0x164d43 })
        );
        dot.position.copy(point);
        scene.add(dot);
      });
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.minDistance = radius * 1.35;
    controls.maxDistance = radius * 6;
    controls.maxPolarAngle = Math.PI;
    controls.target.set(0, 0, 0);

    const resize = () => {
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const mats = Array.isArray(object.material) ? object.material : [object.material];
          mats.forEach(m => m.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [innerDiameter, width, thickness, profile, cameraView, showSection, section]);

  return <div ref={hostRef} className="absolute inset-0" />;
}

export default function RingVolumeStudio({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [innerDiameter, setInnerDiameter] = useState(17);
  const [width, setWidth] = useState(5);
  const [thickness, setThickness] = useState(2);
  const [profile, setProfile] = useState<RingProfile>("rectangular");
  const [cameraView, setCameraView] = useState<CameraView>("iso");
  const [showSection, setShowSection] = useState(false);
  const [challengeChecked, setChallengeChecked] = useState(false);
  const sectionPoints = useMemo(() => createSection(innerDiameter, width, thickness, profile), [innerDiameter, width, thickness, profile]);
  const sectionMetrics = useMemo(() => getSectionMetrics(sectionPoints), [sectionPoints]);
  const challengePassed = profile === "comfort" && Math.abs(innerDiameter - 17) <= 0.5 && Math.abs(width - 5) <= 0.5 && Math.abs(thickness - 2) <= 0.5;

  const reset = () => {
    setInnerDiameter(17);
    setWidth(5);
    setThickness(2);
    setProfile("rectangular");
    setCameraView("iso");
    setShowSection(false);
    setChallengeChecked(false);
  };
  const outerDiameter = innerDiameter + thickness * 2;
  const geometryStatus = sectionMetrics.area > 0 && sectionMetrics.centroidRadius > innerDiameter / 2 ? "Perfil cerrado y apto para la simulación" : "Revisa la sección antes de continuar";

  if (!open) return null;

  return <div className="fixed inset-0 z-[160] flex items-center justify-center bg-[#080C11]/95 p-2 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label="Ring Volume Studio">
    <section className="flex h-[min(96dvh,980px)] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-[#465565] bg-[#111820] text-[#E8EDF2] shadow-[0_30px_100px_rgba(0,0,0,.65)]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#19232D] px-5 py-3 sm:px-7">
        <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#D2AD68]">FADILAB <span className="px-1 text-slate-500">/</span> AURUM LAB <span className="px-1 text-slate-500">/</span> SESIÓN 06</p><div className="mt-1 flex flex-wrap items-center gap-3"><h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">Ring Volume Studio</h2><span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">Laboratorio interactivo</span></div></div>
        <button type="button" onClick={onClose} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-[#D2AD68]/60 hover:bg-white/5"><X size={15}/> Salir</button>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_350px] lg:overflow-hidden">
        <main className="flex min-h-[440px] min-w-0 flex-col border-b border-white/10 lg:min-h-0 lg:border-b-0 lg:border-r">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#111820] px-5 py-3 sm:px-7">
            <div><p className="text-xs font-semibold text-white">Área de construcción</p><p className="mt-0.5 text-[10px] text-slate-400">Modelo 3D paramétrico · unidades en milímetros</p></div>
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#D2AD68]/25 bg-[#D2AD68]/10 px-3 py-1.5 text-[10px] font-semibold text-[#E6C887]">VISTA 3D · {profileLabels[profile]}</span><button type="button" onClick={() => setShowSection(v => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-semibold text-slate-300 hover:border-[#D2AD68]/50">{showSection ? <EyeOff size={13}/> : <Eye size={13}/>} {showSection ? "Ocultar sección" : "Ver sección"}</button></div>
          </div>
          <div className="relative min-h-[360px] flex-1 overflow-hidden bg-[#0D141B]">
            <RingViewport innerDiameter={innerDiameter} width={width} thickness={thickness} profile={profile} cameraView={cameraView} showSection={showSection}/>
            <div className="pointer-events-none absolute bottom-4 left-5 rounded-lg border border-white/10 bg-[#111820]/90 px-3 py-2 text-[10px] text-slate-400 backdrop-blur">Arrastra para orbitar · rueda para acercar</div>
            <div className="pointer-events-none absolute right-4 top-4 rounded-lg border border-white/10 bg-[#111820]/90 px-3 py-2 text-[10px] font-semibold text-[#E6C887]">Ø interior {innerDiameter.toFixed(1)} mm</div>
          </div>
          <div className="grid shrink-0 grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-[#151E27]">
            <div className="px-4 py-3 sm:px-6"><p className="text-[9px] uppercase tracking-wider text-slate-500">Perfil</p><p className="mt-1 text-xs font-semibold text-slate-200">{profileLabels[profile]}</p></div>
            <div className="px-4 py-3 sm:px-6"><p className="text-[9px] uppercase tracking-wider text-slate-500">Ancho</p><p className="mt-1 text-xs font-semibold text-slate-200">{width.toFixed(1)} mm</p></div>
            <div className="px-4 py-3 sm:px-6"><p className="text-[9px] uppercase tracking-wider text-slate-500">Espesor</p><p className="mt-1 text-xs font-semibold text-[#E6C887]">{thickness.toFixed(1)} mm</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-[#101820] px-4 py-2.5">
            <span className="mr-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Cámara</span>
            {(["iso", "top", "front", "side"] as CameraView[]).map(v => <button key={v} type="button" onClick={() => setCameraView(v)} aria-pressed={cameraView === v} className={"rounded-md border px-3 py-1.5 text-[10px] font-semibold " + (cameraView === v ? "border-[#D2AD68]/60 bg-[#D2AD68]/10 text-[#E6C887]" : "border-white/10 text-slate-400 hover:border-white/25")}>{v === "iso" ? "Isométrica" : v === "top" ? "Superior" : v === "front" ? "Frontal" : "Lateral"}</button>)}
          </div>
          <section className="shrink-0 border-t border-white/10 bg-[#111820] px-5 py-3 sm:px-7">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-semibold text-slate-200">Sección técnica del perfil</p><p className="text-[9px] text-slate-500">La sección que gira alrededor del eje para formar el aro</p></div><span className="rounded-md border border-[#D2AD68]/20 bg-[#D2AD68]/10 px-2 py-1 text-[9px] font-semibold text-[#E6C887]">{profileLabels[profile]}</span></div>
            <SectionDrawing points={sectionPoints} width={width} thickness={thickness}/>
            <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-2 text-center">
              <div><p className="text-[9px] text-slate-500">Área sección</p><p className="text-[11px] font-semibold text-slate-200">{sectionMetrics.area.toFixed(1)} mm²</p></div>
              <div><p className="text-[9px] text-slate-500">Radio medio</p><p className="text-[11px] font-semibold text-slate-200">{sectionMetrics.centroidRadius.toFixed(1)} mm</p></div>
              <div><p className="text-[9px] text-slate-500">Volumen estimado</p><p className="text-[11px] font-semibold text-[#E6C887]">{(sectionMetrics.volume / 1000).toFixed(2)} cm³</p></div>
            </div>
          </section>
        </main>
        <aside className="flex min-h-0 flex-col overflow-y-auto bg-[#151E27]">
          <div className="border-b border-white/10 px-5 py-5"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#D2AD68]">Aprende paso a paso</p><h3 className="mt-1 text-lg font-semibold text-white">Construye tu aro en 3D</h3><p className="mt-1 text-[11px] leading-5 text-slate-400">Ajusta las medidas y observa cómo cambia el modelo en tiempo real.</p></div>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            <section><h4 className="text-xs font-semibold text-slate-200">1. Elige la sección</h4><div className="mt-3 grid grid-cols-3 gap-2">{(["rectangular", "comfort", "half-round"] as RingProfile[]).map(value => <button key={value} type="button" aria-pressed={profile === value} onClick={() => { setProfile(value); setChallengeChecked(false); }} className={"rounded-lg border px-2 py-2.5 text-[10px] font-semibold transition " + (profile === value ? "border-[#D2AD68]/70 bg-[#D2AD68]/15 text-[#F0D69F]" : "border-white/10 bg-[#101820] text-slate-300 hover:border-white/25")}>{profileLabels[value]}</button>)}</div><p className="mt-2 rounded-lg bg-[#101820] px-3 py-2 text-[10px] leading-5 text-slate-400">{profile === "rectangular" ? "Caras planas y aristas definidas." : profile === "comfort" ? "Interior y cantos suavizados para una forma más cómoda." : "Exterior redondeado con una cara interior plana."}</p></section>
            <section className="space-y-4 border-t border-white/10 pt-5"><h4 className="text-xs font-semibold text-slate-200">2. Ajusta las dimensiones</h4>
              {([{label:"Diámetro interior",value:innerDiameter,set:setInnerDiameter,min:12,max:24,step:0.5},{label:"Ancho del aro",value:width,set:setWidth,min:2,max:10,step:0.5},{label:"Espesor radial",value:thickness,set:setThickness,min:1,max:5,step:0.5}] as const).map(item => <label key={item.label} className="block text-xs text-slate-300"><span className="flex justify-between gap-2"><span>{item.label}</span><strong className="text-[#E6C887] tabular-nums">{item.value.toFixed(1)} mm</strong></span><input aria-label={item.label} type="range" min={item.min} max={item.max} step={item.step} value={item.value} onChange={e => { item.set(Number(e.target.value)); setChallengeChecked(false); }} className="mt-3 w-full accent-[#C6A15B]"/><div className="mt-1 flex items-center justify-between gap-3"><span className="text-[9px] text-slate-500">{item.min}–{item.max} mm</span><span className="flex items-center gap-1 rounded-md border border-white/10 bg-[#101820] px-2 py-1"><input aria-label={"Valor exacto de " + item.label} type="number" min={item.min} max={item.max} step={item.step} value={item.value} onChange={e => { item.set(Math.min(item.max, Math.max(item.min, Number(e.target.value) || item.min))); setChallengeChecked(false); }} className="w-14 bg-transparent text-right text-[11px] font-semibold text-white outline-none"/><span className="text-[9px] text-slate-500">mm</span></span></div></label>)}
            </section>
            <section className="rounded-xl border border-emerald-400/20 bg-emerald-400/[.06] p-3">
              <div className="flex items-center gap-2"><CircleHelp size={15} className="text-emerald-300"/><h4 className="text-xs font-semibold text-slate-100">Diagnóstico geométrico</h4></div>
              <p className="mt-2 text-[10px] font-semibold text-emerald-200">{geometryStatus}</p>
              <p className="mt-1 text-[10px] leading-5 text-slate-300">Espesor/ancho: {(thickness / width * 100).toFixed(0)}%. Es una lectura de proporción visual; no certifica resistencia ni tolerancias de fabricación.</p>
            </section>
            <details className="rounded-xl border border-white/10 bg-[#101820] p-3">
              <summary className="cursor-pointer text-xs font-semibold text-slate-200">Comparar los tres perfiles</summary>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(["rectangular", "comfort", "half-round"] as RingProfile[]).map(value => <button key={value} type="button" onClick={() => { setProfile(value); setChallengeChecked(false); }} aria-pressed={profile === value} className={"rounded-lg border p-2 text-center " + (profile === value ? "border-[#D2AD68]/60 bg-[#D2AD68]/10" : "border-white/10 bg-[#151E27]")}>
                  <svg viewBox="0 0 64 42" className="h-10 w-full"><path d={value === "rectangular" ? "M16 8 H48 V34 H16 Z" : value === "comfort" ? "M19 8 Q16 8 16 12 V30 Q16 34 20 34 H44 Q48 34 48 30 V12 Q48 8 44 8 Z" : "M16 34 Q16 8 32 8 Q48 8 48 34 Z"} fill="#C49A54" stroke="#F0D69F" strokeWidth="1.5"/></svg>
                  <span className="mt-1 block text-[9px] font-semibold text-slate-300">{profileLabels[value]}</span>
                </button>)}
              </div>
              <p className="mt-2 text-[9px] leading-4 text-slate-500">Selecciona un perfil para aplicarlo al modelo y a la sección técnica.</p>
            </details>
            <section className="rounded-xl border border-[#D2AD68]/25 bg-[#D2AD68]/[.06] p-3">
              <div className="flex items-center justify-between gap-2"><h4 className="text-xs font-semibold text-slate-100">Reto práctico</h4><span className="rounded-full bg-[#D2AD68]/10 px-2 py-1 text-[9px] text-[#E6C887]">Nivel inicial</span></div>
              <p className="mt-2 text-[10px] leading-5 text-slate-300">Construye un aro Confort con diámetro interior de 17 mm, ancho de 5 mm y espesor de 2 mm.</p>
              <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[9px]"><span className="rounded-md bg-[#101820] p-2 text-slate-300">Ø 17 mm</span><span className="rounded-md bg-[#101820] p-2 text-slate-300">5 mm ancho</span><span className="rounded-md bg-[#101820] p-2 text-slate-300">2 mm espesor</span></div>
              <button type="button" onClick={() => setChallengeChecked(true)} className="mt-3 w-full rounded-lg border border-[#D2AD68]/40 bg-[#D2AD68]/10 px-3 py-2 text-[10px] font-semibold text-[#F0D69F] hover:bg-[#D2AD68]/20">Comprobar mi modelo</button>
              {challengeChecked && <p role="status" className={"mt-2 rounded-lg p-2 text-[10px] leading-4 " + (challengePassed ? "bg-emerald-400/10 text-emerald-200" : "bg-amber-400/10 text-amber-200")}>{challengePassed ? "¡Reto conseguido! Tus dimensiones y perfil coinciden con el objetivo." : "Aún no coincide. Ajusta el perfil a Confort y aproxima las tres dimensiones al objetivo."}</p>}
            </section>
            <section className="rounded-xl border border-[#D2AD68]/20 bg-[#D2AD68]/[.06] p-3"><div className="flex items-center gap-2"><CircleHelp size={15} className="text-[#E6C887]"/><h4 className="text-xs font-semibold text-slate-100">Lectura del modelo</h4></div><div className="mt-2 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-lg bg-[#101820] p-2"><span className="text-slate-500">Diámetro exterior</span><strong className="mt-1 block text-[#E6C887]">{outerDiameter.toFixed(1)} mm</strong></div><div className="rounded-lg bg-[#101820] p-2"><span className="text-slate-500">Radio interior</span><strong className="mt-1 block text-[#E6C887]">{(innerDiameter/2).toFixed(1)} mm</strong></div></div><p className="mt-2 text-[10px] leading-5 text-slate-300">El diámetro interior define el espacio para el dedo. El ancho recorre el aro y el espesor radial determina cuánto material tiene.</p></section>
            <section className="border-t border-white/10 pt-5"><h4 className="text-xs font-semibold text-slate-200">3. Repite la operación en Rhinoceros</h4><div className="mt-3 rounded-xl border border-[#D2AD68]/25 bg-[#101820] p-3"><div className="flex items-center justify-between gap-2"><span className="text-[10px] text-slate-400">Comando principal</span><code className="rounded-md border border-[#D2AD68]/30 bg-[#D2AD68]/10 px-2.5 py-1 text-xs font-bold text-[#F0D69F]">_Revolve</code></div><ol className="mt-3 space-y-2 text-[10px] leading-5 text-slate-300"><li><span className="mr-2 font-bold text-[#D2AD68]">01</span>Traza la sección en una vista lateral: usa <code className="text-[#F0D69F]">_Rectangle</code> para el perfil recto o <code className="text-[#F0D69F]">_Polyline</code> para dibujar otros contornos.</li><li><span className="mr-2 font-bold text-[#D2AD68]">02</span>Si dibujaste segmentos separados, únelos con <code className="text-[#F0D69F]">_Join</code> y confirma que el contorno esté cerrado.</li><li><span className="mr-2 font-bold text-[#D2AD68]">03</span><code className="text-[#F0D69F]">_Revolve</code>: selecciona el perfil y marca dos puntos del eje central.</li><li><span className="mr-2 font-bold text-[#D2AD68]">04</span>Define 360° para completar la revolución.</li><li><span className="mr-2 font-bold text-[#D2AD68]">05</span><code className="text-[#F0D69F]">_ShowEdges</code>: revisa si existen bordes desnudos.</li></ol><p className="mt-3 border-t border-white/10 pt-2 text-[10px] leading-4 text-slate-500">Comprueba el resultado como polisuperficie cerrada antes de continuar el modelado.</p></div></section>
            <details className="border-t border-white/10 pt-4"><summary className="cursor-pointer text-[11px] font-semibold text-slate-400 hover:text-[#E6C887]">Consejo técnico</summary><p className="mt-3 rounded-lg bg-[#101820] p-3 text-[10px] leading-5 text-slate-400">La sección debe ser una curva plana y cerrada. Evita que cruce el eje de revolución. El simulador es didáctico y no sustituye la comprobación de geometría en Rhinoceros / MatrixGold.</p></details>
            <button type="button" onClick={reset} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-[#D2AD68]/50 hover:text-white"><RotateCcw size={14}/> Restablecer ejercicio</button>
          </div>
          <div className="mt-auto border-t border-white/10 px-5 py-3"><p className="text-[9px] leading-4 text-slate-500">Simulador didáctico · valida el perfil y el sólido final en Rhino 7 / MatrixGold.</p></div>
        </aside>
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-[#19232D] px-5 py-3 sm:px-7"><p className="text-[10px] text-slate-500"><Layers3 className="mr-1 inline" size={13}/> AURUM LAB · Modelado de anillos</p><button type="button" onClick={onClose} className="rounded-lg bg-gradient-to-b from-[#E6CB8C] to-[#B88D48] px-4 py-2.5 text-xs font-bold text-[#21190D] shadow transition hover:brightness-105">Volver a la sesión 06</button></footer>
    </section>
  </div>;
}
