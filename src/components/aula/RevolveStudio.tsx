import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Play, Pause, RotateCcw, X, CircleHelp } from "lucide-react";

type ProfileKey = "cylinder" | "cone" | "vase" | "ring";
type AxisKey = "y" | "x" | "z";
type DisplayKey = "solid" | "wireframe" | "transparent";

const profileOptions: Record<ProfileKey, { label: string; points: [number, number][]; explanation: string }> = {
  cylinder: {
    label: "Cilindro",
    points: [[0, 0], [23, 0], [23, 38], [0, 38], [0, 0]],
    explanation: "Un perfil rectangular que llega al eje genera un cilindro.",
  },
  cone: {
    label: "Cono",
    points: [[0, 0], [25, 0], [0, 42], [0, 0]],
    explanation: "Un perfil triangular que toca el eje genera un cono.",
  },
  vase: {
    label: "Copa",
    points: [[0, 0], [11, 0], [13, 12], [23, 28], [18, 42], [0, 42], [0, 0]],
    explanation: "Un perfil escalonado crea un cuerpo con cambios de diámetro.",
  },
  ring: {
    label: "Anillo",
    points: [[17, 0], [24, 0], [24, 6], [17, 6], [17, 0]],
    explanation: "Un perfil rectangular separado del eje genera un anillo hueco.",
  },
};

function RevolveViewport({ profile, angle, axis, display, showProfile, showResult }: {
  profile: ProfileKey; angle: number; axis: AxisKey; display: DisplayKey; showProfile: boolean; showResult: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const profilePoints = useMemo(() => profileOptions[profile].points, [profile]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0d141b");
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    camera.up.set(0, 0, 1);
    camera.position.set(78, -92, 76);
    camera.lookAt(0, 0, 20);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.className = "block h-full w-full touch-none";
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xe3edf7, 0x29313a, 2.0));
    const key = new THREE.DirectionalLight(0xffe1ad, 3.2);
    key.position.set(-45, -55, 85);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9dbbd8, 1.1);
    fill.position.set(50, 35, 35);
    scene.add(fill);

    const grid = new THREE.GridHelper(120, 24, 0x526170, 0x26323e);
    grid.rotation.x = Math.PI / 2;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.28;
    scene.add(grid);

    const model = new THREE.Group();
    if (axis === "x") model.rotation.z = -Math.PI / 2;
    if (axis === "z") model.rotation.x = Math.PI / 2;
    scene.add(model);

    const axisLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -8, 0), new THREE.Vector3(0, 52, 0)]),
      new THREE.LineDashedMaterial({ color: 0x73c9b2, dashSize: 2.2, gapSize: 1.4, linewidth: 1 })
    );
    axisLine.computeLineDistances();
    model.add(axisLine);

    if (showProfile) {
      const source = profilePoints.map(([radius, height]) => new THREE.Vector3(radius, height, 0));
      const sourceLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(source),
        new THREE.LineBasicMaterial({ color: 0xf4d99e })
      );
      model.add(sourceLine);
      source.forEach(point => {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.75, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0xf5dba4, emissive: 0x59401c, roughness: 0.35 })
        );
        dot.position.copy(point);
        model.add(dot);
      });
    }

    if (showResult && angle > 0) {
      const points = profilePoints.map(([radius, height]) => new THREE.Vector2(radius, height));
      const geometry = new THREE.LatheGeometry(points, 96, 0, Math.max(0.001, angle * Math.PI / 180));
      geometry.computeVertexNormals();
      const material = new THREE.MeshStandardMaterial({
        color: 0xb88f50,
        metalness: 0.28,
        roughness: 0.38,
        side: THREE.DoubleSide,
        transparent: display === "transparent",
        opacity: display === "transparent" ? 0.34 : 1,
        wireframe: display === "wireframe",
      });
      const mesh = new THREE.Mesh(geometry, material);
      model.add(mesh);
      if (display !== "wireframe" && display !== "transparent") {
        model.add(new THREE.LineSegments(
          new THREE.EdgesGeometry(geometry, 28),
          new THREE.LineBasicMaterial({ color: 0xf0d69f, transparent: true, opacity: 0.55 })
        ));
      }
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.target.set(0, 0, 20);
    controls.minDistance = 65;
    controls.maxDistance = 190;
    controls.maxPolarAngle = Math.PI;

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
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
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(item => item.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [profilePoints, angle, axis, display, showProfile, showResult]);

  return <div ref={hostRef} className="h-full min-h-[320px] w-full overflow-hidden rounded-xl bg-[#0d141b]" />;
}

export default function RevolveStudio({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [profile, setProfile] = useState<ProfileKey>("cylinder");
  const [angle, setAngle] = useState(360);
  const [axis, setAxis] = useState<AxisKey>("y");
  const [display, setDisplay] = useState<DisplayKey>("solid");
  const [showProfile, setShowProfile] = useState(true);
  const [showResult, setShowResult] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setAngle(current => {
        if (current >= 360) {
          setPlaying(false);
          return 360;
        }
        return Math.min(360, current + 3);
      });
    }, 28);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (!open) setPlaying(false);
  }, [open]);

  if (!open) return null;

  const fullTurn = angle === 360;
  const profileName = profileOptions[profile].label;
  const axisName = axis.toUpperCase();
  const reset = () => {
    setProfile("cylinder");
    setAngle(360);
    setAxis("y");
    setDisplay("solid");
    setShowProfile(true);
    setShowResult(true);
    setPlaying(false);
  };

  return <div className="fixed inset-0 z-[160] flex items-center justify-center bg-[#080C11]/95 p-2 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label="Revolve Studio">
    <section className="flex h-[min(96dvh,980px)] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-[#465565] bg-[#111820] text-[#E8EDF2] shadow-[0_30px_100px_rgba(0,0,0,.65)]">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-[#19232D] px-5 py-3 sm:px-7">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#D2AD68]">FADILAB <span className="px-1 text-slate-500">/</span> AURUM LAB <span className="px-1 text-slate-500">/</span> SESIÓN 06</p>
          <div className="mt-1 flex flex-wrap items-center gap-3"><h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">Revolve Studio</h2><span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">Laboratorio interactivo</span></div>
        </div>
        <button type="button" onClick={onClose} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-[#D2AD68]/60 hover:bg-white/5"><X size={15}/> Salir</button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_340px] lg:overflow-hidden">
        <main className="flex min-h-[440px] min-w-0 flex-col border-b border-white/10 lg:min-h-0 lg:border-b-0 lg:border-r">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#111820] px-5 py-3 sm:px-7">
            <div><p className="text-xs font-semibold text-white">Área de construcción</p><p className="mt-0.5 text-[10px] text-slate-400">Observa cómo gira el perfil alrededor del eje</p></div>
            <span className="rounded-full border border-[#D2AD68]/25 bg-[#D2AD68]/10 px-3 py-1.5 text-[10px] font-semibold text-[#E6C887]">VISTA 3D · {angle}°</span>
          </div>
          <div className="relative flex min-h-[340px] flex-1 items-center justify-center overflow-hidden bg-[#0D141B] p-3 sm:p-5">
            <div className="pointer-events-none absolute inset-0 opacity-[.15]" style={{ backgroundImage: "linear-gradient(rgba(148,163,184,.2) 1px, transparent 1px),linear-gradient(90deg,rgba(148,163,184,.2) 1px,transparent 1px)", backgroundSize: "32px 32px" }}/>
            <RevolveViewport profile={profile} angle={angle} axis={axis} display={display} showProfile={showProfile} showResult={showResult}/>
            <div className="absolute bottom-4 left-5 rounded-lg border border-white/10 bg-[#111820]/90 px-3 py-2 text-[10px] text-slate-400 backdrop-blur">Arrastra para orbitar · rueda para acercar</div>
          </div>
          <div className="grid shrink-0 grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-[#151E27]">
            <div className="px-4 py-3 sm:px-6"><p className="text-[9px] uppercase tracking-wider text-slate-500">Perfil</p><p className="mt-1 text-xs font-semibold text-slate-200">{profileName}</p></div>
            <div className="px-4 py-3 sm:px-6"><p className="text-[9px] uppercase tracking-wider text-slate-500">Eje</p><p className="mt-1 text-xs font-semibold text-slate-200">{axisName}</p></div>
            <div className="px-4 py-3 sm:px-6"><p className="text-[9px] uppercase tracking-wider text-slate-500">Giro</p><p className="mt-1 text-xs font-semibold text-[#E6C887]">{angle}°</p></div>
          </div>
        </main>

        <aside className="flex min-h-0 flex-col overflow-y-auto bg-[#151E27]">
          <div className="border-b border-white/10 px-5 py-5">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#D2AD68]">Aprende paso a paso</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Crea una forma por revolución</h3>
            <p className="mt-1 text-[11px] leading-5 text-slate-400">Elige un perfil y observa cómo se convierte en una superficie 3D al girar.</p>
          </div>
          <div className="flex-1 space-y-5 p-5">
            <section>
              <h4 className="text-xs font-semibold text-slate-200">1. Elige un perfil</h4>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(Object.keys(profileOptions) as ProfileKey[]).map(key => <button key={key} type="button" onClick={() => { setProfile(key); setPlaying(false); }} aria-pressed={profile === key} className={"rounded-xl border p-3 text-left transition " + (profile === key ? "border-[#D2AD68]/70 bg-[#D2AD68]/15 text-[#F0D69F]" : "border-white/10 bg-[#101820] text-slate-300 hover:border-white/25")}>
                  <span className="block text-xs font-semibold">{profileOptions[key].label}</span>
                  <span className="mt-1 block text-[10px] leading-4 opacity-70">{key === "cylinder" ? "Cuerpo recto" : key === "cone" ? "Punta cónica" : key === "vase" ? "Forma curva" : "Perfil hueco"}</span>
                </button>)}
              </div>
              <p className="mt-2 rounded-lg bg-[#101820] px-3 py-2 text-[10px] leading-5 text-slate-400">{profileOptions[profile].explanation}</p>
            </section>

            <section className="border-t border-white/10 pt-5">
              <div className="flex items-center justify-between gap-2"><h4 className="text-xs font-semibold text-slate-200">2. Define el ángulo</h4><span className="rounded-md bg-[#D2AD68]/10 px-2.5 py-1 text-sm font-bold tabular-nums text-[#E6C887]">{angle}°</span></div>
              <input aria-label="Ángulo de revolución" type="range" min="0" max="360" step="1" value={angle} onChange={event => { setPlaying(false); setAngle(Number(event.target.value)); }} className="mt-4 w-full accent-[#C6A15B]"/>
              <div className="mt-1 flex justify-between text-[9px] text-slate-500"><span>0° · Sin giro</span><span>360° · Completo</span></div>
              <button type="button" onClick={() => { if (angle >= 360) setAngle(0); setPlaying(value => !value); }} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#D2AD68]/35 bg-[#D2AD68]/10 px-3 py-2.5 text-xs font-semibold text-[#E6C887] transition hover:bg-[#D2AD68]/15">{playing ? <Pause size={14}/> : <Play size={14}/>} {playing ? "Pausar giro" : "Animar revolución"}</button>
            </section>

            <section className="border-t border-white/10 pt-5">
              <h4 className="text-xs font-semibold text-slate-200">3. Elige el eje</h4>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(["x", "y", "z"] as AxisKey[]).map(value => <button key={value} type="button" onClick={() => setAxis(value)} aria-pressed={axis === value} className={"rounded-lg border px-3 py-2 text-xs font-semibold transition " + (axis === value ? "border-[#D2AD68]/70 bg-[#D2AD68]/15 text-[#F0D69F]" : "border-white/10 bg-[#101820] text-slate-400 hover:border-white/25")}>Eje {value.toUpperCase()}</button>)}
              </div>
            </section>

            <details className="border-t border-white/10 pt-4">
              <summary className="cursor-pointer text-[11px] font-semibold text-slate-400 hover:text-[#E6C887]">Opciones avanzadas</summary>
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-3 gap-1">
                  {(["solid", "wireframe", "transparent"] as DisplayKey[]).map(value => <button key={value} type="button" onClick={() => setDisplay(value)} className={"rounded-lg border px-2 py-2 text-[10px] " + (display === value ? "border-[#D2AD68]/60 bg-[#D2AD68]/10 text-[#E6C887]" : "border-white/10 text-slate-400")}>{value === "solid" ? "Sólido" : value === "wireframe" ? "Alámbrico" : "Transparente"}</button>)}
                </div>
                <label className="flex items-center justify-between gap-3 text-[11px] text-slate-300"><span>Mostrar perfil original</span><input type="checkbox" checked={showProfile} onChange={event => setShowProfile(event.target.checked)} className="accent-[#C6A15B]"/></label>
                <label className="flex items-center justify-between gap-3 text-[11px] text-slate-300"><span>Mostrar resultado</span><input type="checkbox" checked={showResult} onChange={event => setShowResult(event.target.checked)} className="accent-[#C6A15B]"/></label>
                <p className="rounded-lg border border-white/10 bg-[#101820] p-3 text-[10px] leading-5 text-slate-400">En Rhino: ejecuta <code className="rounded bg-white/5 px-1 text-slate-200">Revolve</code>, selecciona la curva, define el eje y establece el ángulo inicial y final.</p>
              </div>
            </details>

            <section className={"rounded-xl border p-3 " + (angle === 0 ? "border-amber-400/30 bg-amber-400/[.06]" : fullTurn ? "border-emerald-400/25 bg-emerald-400/[.06]" : "border-[#D2AD68]/25 bg-[#D2AD68]/[.06]")}>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-100"><CircleHelp size={15} className="text-[#E6C887]"/> ¿Qué está ocurriendo?</div>
              <p className="mt-2 text-[11px] leading-5 text-slate-300">{angle === 0 ? "El perfil permanece en su posición inicial: todavía no se ha generado una superficie." : fullTurn ? "El perfil ha completado una vuelta. La superficie vuelve a su punto de partida; el resultado depende de que el perfil sea adecuado y esté bien cerrado." : "La superficie solo ha recorrido una parte del giro. Los extremos angulares permanecen abiertos."}</p>
            </section>
            <button type="button" onClick={reset} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-[#D2AD68]/50 hover:text-white"><RotateCcw size={14}/> Reiniciar ejercicio</button>
          </div>
          <div className="mt-auto border-t border-white/10 px-5 py-3"><p className="text-[9px] leading-4 text-slate-500">Simulador didáctico con geometría 3D interactiva. Comprueba la geometría final en Rhino 7 / MatrixGold.</p></div>
        </aside>
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-[#19232D] px-5 py-3 sm:px-7"><p className="text-[10px] text-slate-500">AURUM LAB · Revolución de perfiles</p><button type="button" onClick={onClose} className="rounded-lg bg-gradient-to-b from-[#E6CB8C] to-[#B88D48] px-4 py-2.5 text-xs font-bold text-[#21190D] shadow transition hover:brightness-105">Volver a la sesión 06</button></footer>
    </section>
  </div>;
}
