import { useEffect, useMemo, useRef, useState } from "react";
import {
  AmbientLight, AxesHelper, Box3, BoxGeometry, BoxHelper, BufferGeometry, CircleGeometry,
  Color, DirectionalLight, ExtrudeGeometry, GridHelper, HemisphereLight, IcosahedronGeometry,
  Line, LineBasicMaterial, Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera,
  PlaneGeometry, Points, PointsMaterial, Raycaster, Scene, Shape, Sphere, SphereGeometry,
  SRGBColorSpace, Vector2, Vector3, WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Box, Focus, Layers3, RotateCcw, Scan, X } from "lucide-react";

type Props = { visible: boolean; materials: { nombre_archivo: string; ruta_storage: string; mime_type?: string | null }[] };
type Entry = { object: Object3D; name: string; type: string; category: string; description: string; jewelryUse: string };
const CATEGORIES = [
  { id: "all", label: "Todos" }, { id: "points", label: "Puntos" },
  { id: "curves", label: "Curvas" }, { id: "surfaces", label: "Superficies" },
  { id: "polysurfaces", label: "Polisuperficies" }, { id: "solids", label: "Sólidos" },
  { id: "meshes", label: "Mallas" }, { id: "extrusions", label: "Extrusiones" },
];
const material = (color: string, roughness = 0.48) =>
  new MeshStandardMaterial({ color, roughness, metalness: 0.1, side: 2 });
const lineFrom = (points: Vector3[], color = "#E6C77D") =>
  new Line(new BufferGeometry().setFromPoints(points), new LineBasicMaterial({ color }));

function createTeachingObjects(root: Object3D): Entry[] {
  const result: Entry[] = [];
  const add = (object: Object3D, name: string, type: string, category: string, description: string, jewelryUse: string) => {
    object.name = name;
    root.add(object);
    result.push({ object, name, type, category, description, jewelryUse });
  };

  const point = new Mesh(new SphereGeometry(0.16, 18, 12), material("#E6C77D", 0.3));
  point.position.set(-8, -2.5, 0.16);
  add(point, "Punto de control", "Point", "points",
    "Una posición exacta en el espacio 3D, definida por coordenadas X, Y y Z.",
    "Ubicar vértices, referencias y puntos de construcción.");

  const profile = lineFrom([
    new Vector3(-6.5, -2.5, 0.12), new Vector3(-5.8, -1.5, 0.12),
    new Vector3(-4.8, -1.15, 0.12), new Vector3(-3.8, -1.7, 0.12),
    new Vector3(-3.2, -2.5, 0.12),
  ]);
  add(profile, "Curva de perfil", "Curve", "curves",
    "Entidad lineal sin grosor ni volumen. Puede ser abierta o cerrada.",
    "Dibujar contornos, perfiles de anillos y trayectorias.");

  const circlePts = Array.from({ length: 97 }, (_, i) => {
    const a = i / 96 * Math.PI * 2;
    return new Vector3(-1.6 + Math.cos(a), -2.1 + Math.sin(a), 0.12);
  });
  add(lineFrom(circlePts, "#F3D99A"), "Círculo", "Circle / Curve", "curves",
    "Curva cerrada cuyos puntos mantienen la misma distancia respecto a un centro.",
    "Crear aros, alianzas y perfiles circulares.");

  const surface = new Mesh(new PlaneGeometry(2.7, 2), material("#8FB8D8", 0.58));
  surface.position.set(-4.6, 2, 0.12);
  add(surface, "Superficie plana", "Surface", "surfaces",
    "Cara geométrica que define largo y ancho, pero no encierra un volumen por sí sola.",
    "Representar caras, paños y superficies de transición.");

  const polysurface = new Object3D();
  const faceMat = material("#A8BDD1", 0.52);
  const base = new Mesh(new PlaneGeometry(2.2, 1.8), faceMat);
  base.position.set(0, 0, 0.12);
  const back = new Mesh(new PlaneGeometry(2.2, 1.5), faceMat);
  back.position.set(0, 0.9, 0.87);
  back.rotation.x = Math.PI / 2;
  const side = new Mesh(new PlaneGeometry(1.8, 1.5), faceMat);
  side.position.set(-1.1, 0, 0.87);
  side.rotation.y = -Math.PI / 2;
  polysurface.add(base, back, side);
  polysurface.position.set(-0.3, 2, 0);
  add(polysurface, "Polisuperficie abierta", "Brep · varias caras", "polysurfaces",
    "Dos o más superficies unidas por sus bordes. Este ejemplo está abierto y no encierra volumen.",
    "Construir formas complejas uniendo distintas caras de una joya.");

  const solid = new Mesh(new BoxGeometry(2, 2, 1.8), material("#B7D0E8", 0.38));
  solid.position.set(3.2, 2, 0.95);
  add(solid, "Sólido cerrado", "Closed Brep", "solids",
    "Geometría cerrada que delimita un volumen y tiene interior y exterior.",
    "Modelar cuerpos de anillos, engastes, placas y componentes fabricables.");

  const mesh = new Mesh(new IcosahedronGeometry(1.2, 1), new MeshStandardMaterial({
    color: "#9EBBD6", roughness: 0.55, flatShading: true, metalness: 0.08,
  }));
  mesh.position.set(6.5, 2, 1.25);
  add(mesh, "Malla poligonal", "Mesh", "meshes",
    "Superficie representada mediante vértices, aristas y caras poligonales.",
    "Visualización, escultura digital, impresión y formatos de intercambio.");

  const shape = new Shape();
  shape.moveTo(-1, -0.65); shape.lineTo(0.75, -0.65); shape.lineTo(1, 0);
  shape.lineTo(0.55, 0.75); shape.lineTo(-0.85, 0.75); shape.closePath();
  const extrusion = new Mesh(new ExtrudeGeometry(shape, { depth: 1.55, bevelEnabled: false }), material("#D1DCE8", 0.4));
  extrusion.position.set(9.6, 2, 0.1);
  add(extrusion, "Extrusión lineal", "Extrusion", "extrusions",
    "Perfil 2D extendido en una dirección para generar un cuerpo con longitud.",
    "Crear perfiles, barras, biseles y elementos repetitivos.");
  return result;
}

export default function RhinoObjectExplorer({ visible }: Props) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [wireframe, setWireframe] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<Object3D | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const selectionRef = useRef<BoxHelper | null>(null);
  const visibleEntries = useMemo(() => entries.filter(e => category === "all" || e.category === category), [entries, category]);
  const selected = entries.find(e => e.object.uuid === selectedId) ?? null;
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: entries.length };
    CATEGORIES.forEach(item => { if (item.id !== "all") c[item.id] = entries.filter(e => e.category === item.id).length; });
    return c;
  }, [entries]);

  useEffect(() => {
    if (!open || !viewportRef.current) return;
    let disposed = false;
    let frame = 0;
    const host = viewportRef.current;
    const scene = new Scene();
    scene.background = new Color("#141B24");
    const camera = new PerspectiveCamera(42, 1, 0.01, 1000);
    camera.up.set(0, 0, 1);
    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = SRGBColorSpace;
    host.replaceChildren(renderer.domElement);
    scene.add(new AmbientLight(0xffffff, 1.05));
    scene.add(new HemisphereLight(0xeaf2ff, 0x536477, 1.45));
    const key = new DirectionalLight(0xffffff, 2.3); key.position.set(-8, -12, 18); scene.add(key);
    const fill = new DirectionalLight(0xc5d7ef, 1.15); fill.position.set(10, 8, 12); scene.add(fill);
    const grid = new GridHelper(28, 28, 0x536477, 0x293747); grid.rotation.x = Math.PI / 2; scene.add(grid);
    scene.add(new AxesHelper(4.5));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.075; controls.screenSpacePanning = true;
    controls.target.set(1, 0, 0.5);
    camera.position.set(15, -22, 17); camera.lookAt(controls.target);
    cameraRef.current = camera; controlsRef.current = controls; sceneRef.current = scene;

    const resize = () => {
      const w = Math.max(host.clientWidth, 1), h = Math.max(host.clientHeight, 1);
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false);
    };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();

    const model = new Object3D(); model.name = "Laboratorio de geometrías Rhino"; scene.add(model);
    const created = createTeachingObjects(model);
    modelRef.current = model; setEntries(created); setSelectedId(created[0]?.object.uuid ?? "");
    const bounds = new Box3().setFromObject(model);
    const center = bounds.getCenter(new Vector3());
    const radius = Math.max(bounds.getBoundingSphere(new Sphere()).radius, 6);
    controls.target.copy(center);
    camera.position.copy(center).add(new Vector3(1, -1.35, 0.95).normalize().multiplyScalar(radius * 2.35));
    camera.near = Math.max(radius / 1000, 0.01); camera.far = radius * 20;
    camera.updateProjectionMatrix(); controls.update();

    const raycaster = new Raycaster(), pointer = new Vector2();
    const handlePick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(created.map(e => e.object), true);
      if (!hits.length) return;
      let target: Object3D | null = hits[0].object;
      while (target && !created.some(e => e.object === target)) target = target.parent;
      const match = created.find(e => e.object === target);
      if (match) setSelectedId(match.object.uuid);
    };
    renderer.domElement.addEventListener("click", handlePick);
    const animate = () => {
      if (disposed) return;
      frame = window.requestAnimationFrame(animate);
      controls.update(); selectionRef.current?.update(); renderer.render(scene, camera);
    };
    animate();
    return () => {
      disposed = true; window.cancelAnimationFrame(frame);
      renderer.domElement.removeEventListener("click", handlePick);
      observer.disconnect(); controls.dispose();
      scene.traverse(object => {
        const item = object as Mesh;
        item.geometry?.dispose?.();
        if (Array.isArray(item.material)) item.material.forEach(m => m.dispose());
        else item.material?.dispose?.();
      });
      renderer.dispose(); renderer.domElement.remove();
      modelRef.current = null; cameraRef.current = null; controlsRef.current = null;
      sceneRef.current = null; selectionRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    entries.forEach(e => { e.object.visible = category === "all" || e.category === category; });
  }, [entries, category]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (selectionRef.current) {
      scene.remove(selectionRef.current);
      selectionRef.current.geometry.dispose(); selectionRef.current.material.dispose();
      selectionRef.current = null;
    }
    if (selected) {
      const helper = new BoxHelper(selected.object, new Color("#E6C77D"));
      scene.add(helper); selectionRef.current = helper;
    }
  }, [selectedId, selected]);

  const focus = (entry: Entry | null) => {
    if (!entry || !cameraRef.current || !controlsRef.current) return;
    const bounds = new Box3().setFromObject(entry.object);
    const center = bounds.getCenter(new Vector3());
    const radius = Math.max(bounds.getBoundingSphere(new Sphere()).radius, 1.2);
    const camera = cameraRef.current;
    const vfov = camera.fov * Math.PI / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    controlsRef.current.target.copy(center);
    camera.position.copy(center).add(new Vector3(1.2, -1.6, 1.1).normalize().multiplyScalar(radius / Math.sin(Math.min(vfov, hfov) / 2) * 1.25));
    controlsRef.current.update();
  };
  const resetView = () => {
    if (!modelRef.current || !cameraRef.current || !controlsRef.current) return;
    const bounds = new Box3().setFromObject(modelRef.current);
    const center = bounds.getCenter(new Vector3());
    const radius = Math.max(bounds.getBoundingSphere(new Sphere()).radius, 6);
    const camera = cameraRef.current, vfov = camera.fov * Math.PI / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * Math.max(camera.aspect, 0.1));
    controlsRef.current.target.copy(center);
    camera.position.copy(center).add(new Vector3(1, -1.35, 0.95).normalize().multiplyScalar(radius / Math.sin(Math.min(vfov, hfov) / 2) * 1.18));
    controlsRef.current.update();
  };
  const toggleWireframe = () => {
    const next = !wireframe; setWireframe(next);
    modelRef.current?.traverse(object => {
      const mesh = object as Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => {
        if ("wireframe" in m) (m as MeshStandardMaterial).wireframe = next;
      });
    });
  };

  if (!visible) return null;
  return <>
    <section className="mt-5 overflow-hidden rounded-2xl border border-[#C6A15B]/35 bg-gradient-to-br from-[#222B36] via-[#1D2630] to-[#171C24] p-4 text-white shadow-lg sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#D8B979]">FADILAB · SESIÓN 02 · LABORATORIO 3D</p><h3 className="mt-1 text-lg font-semibold">GEOMETRÍAS DE RHINO <span className="font-normal text-[#AAB7C5]">/ Aprende explorando</span></h3><p className="mt-1 text-sm text-[#C2CCD7]">Escena didáctica preparada para reconocer ocho familias de geometría.</p></div>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-b from-[#E6C77D] to-[#BF9952] px-4 py-2.5 text-sm font-bold text-[#241B0C] shadow-sm transition hover:-translate-y-0.5 hover:brightness-105"><Scan className="size-4"/> Abrir laboratorio</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[#D0D8E0]">{["8 familias geométricas","Selección directa en 3D","Ejes X · Y · Z","Modo alámbrico"].map(item => <span key={item} className="rounded-full border border-white/15 px-3 py-1.5">{item}</span>)}</div>
    </section>
    {open && <div className="fixed inset-0 z-[130] flex h-[100dvh] flex-col overflow-hidden bg-[#141A22] text-[#E8EDF2]" role="dialog" aria-modal="true" aria-label="Laboratorio de geometrías Rhino">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#202A35] px-4 py-3 sm:px-6">
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#D8B979]">FADILAB · SESIÓN 02 · RHINO 7</p><h2 className="text-lg font-semibold">Geometry Lab <span className="font-normal text-[#AAB7C5]">/ Tipos de geometría</span></h2><p className="text-xs text-[#AAB7C5]">{entries.length} objetos didácticos · Escena independiente del archivo 3DM</p></div>
        <div className="flex items-center gap-2"><button type="button" onClick={resetView} disabled={!entries.length} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-[#D0D8E0] disabled:opacity-40"><RotateCcw className="size-3.5"/> Encuadre</button><button type="button" onClick={toggleWireframe} disabled={!entries.length} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-[#D0D8E0] disabled:opacity-40"><Layers3 className="size-3.5"/> {wireframe ? "Sombreado" : "Alámbrico"}</button><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-white/15 p-2 text-[#D0D8E0]" aria-label="Cerrar"><X className="size-4"/></button></div>
      </header>
      <nav className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 bg-[#1B242E] px-4 py-2.5 sm:px-6">{CATEGORIES.map(item => <button key={item.id} type="button" onClick={() => setCategory(item.id)} aria-pressed={category === item.id} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${category === item.id ? "border-[#C6A15B] bg-[#C6A15B]/15 text-[#E5C47C]" : "border-white/10 bg-[#26313D] text-[#B9C5D1]"}`}>{item.label} <span className="ml-1 opacity-70">{counts[item.id] ?? 0}</span></button>)}</nav>
      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="relative min-h-[260px] overflow-hidden rounded-xl border border-white/10 bg-[#141B24]"><div ref={viewportRef} className="absolute inset-0"/>
          <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-xl border border-white/10 bg-[#202A35]/85 px-3 py-2 shadow-lg">
            <svg viewBox="0 0 76 64" className="h-12 w-14" aria-label="Ejes globales X Y Z"><circle cx="25" cy="39" r="3" fill="#E8EDF2"/><path d="M25 39 L57 39" stroke="#EF4444" strokeWidth="2.5"/><path d="M25 39 L7 19" stroke="#22C55E" strokeWidth="2.5"/><path d="M25 39 L25 5" stroke="#3B82F6" strokeWidth="2.5"/><g fontSize="10" fontWeight="700"><text x="62" y="43" fill="#F87171">X</text><text x="1" y="15" fill="#4ADE80">Y</text><text x="30" y="10" fill="#60A5FA">Z</text></g></svg>
            <span className="text-[10px] leading-4 text-[#C4CED8]">Ejes del mundo<br/><b className="font-semibold text-[#E8EDF2]">X · Y · Z</b></span>
          </div>
          <button type="button" onClick={resetView} title="Restablecer vista isométrica" aria-label="Restablecer orientación" className="absolute right-4 top-4 z-10 flex size-[68px] items-center justify-center rounded-full border border-[#D8B979]/55 bg-[#202A35]/90 shadow-xl backdrop-blur transition hover:border-[#E6C77D] hover:bg-[#293542]"><svg viewBox="0 0 76 76" className="size-[60px]" aria-hidden="true"><circle cx="38" cy="38" r="31" fill="none" stroke="#718096" strokeWidth="1.5" strokeDasharray="3 3"/><circle cx="38" cy="38" r="23" fill="#263342" stroke="#D8B979" strokeWidth="1.2"/><path d="M38 12 L38 25 M38 51 L38 64 M12 38 L25 38 M51 38 L64 38" stroke="#AAB7C5" strokeWidth="1.5"/><path d="M38 17 L32 27 L44 27 Z" fill="#3B82F6"/><path d="M59 38 L49 32 L49 44 Z" fill="#EF4444"/><path d="M38 59 L32 49 L44 49 Z" fill="#22C55E"/><circle cx="38" cy="38" r="5" fill="#D8B979"/><g fill="#E8EDF2" fontSize="8" fontWeight="700" textAnchor="middle"><text x="38" y="9">Z</text><text x="69" y="41">X</text><text x="38" y="73">Y</text></g></svg></button>
          <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg border border-white/10 bg-[#202A35]/80 px-3 py-2 text-[10px] text-[#AAB7C5]">Arrastra para orbitar · Rueda para zoom · Clic para seleccionar</div>
        </section>
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#202A35]">
          <div className="shrink-0 border-b border-white/10 px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#D8B979]">Geometrías de la escena</p><p className="mt-1 text-sm font-semibold">{visibleEntries.length} objetos</p></div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">{visibleEntries.map(entry => <button key={entry.object.uuid} type="button" onClick={() => setSelectedId(entry.object.uuid)} aria-pressed={selectedId === entry.object.uuid} className={`mb-1 w-full rounded-lg border px-3 py-2 text-left ${selectedId === entry.object.uuid ? "border-[#C6A15B] bg-[#C6A15B]/10" : "border-transparent hover:border-white/10 hover:bg-white/5"}`}><span className="block truncate text-xs font-semibold text-[#E8EDF2]">{entry.name}</span><span className="mt-1 block truncate text-[10px] text-[#9EADBC]">{entry.type}</span></button>)}</div>
          <div className="shrink-0 border-t border-white/10 bg-[#19222C] p-3"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#D8B979]">Ficha didáctica</p>{selected ? <><p className="mt-1 truncate text-sm font-semibold">{selected.name}</p><p className="mt-1 text-[10px] font-semibold text-[#D8B979]">{selected.type}</p><p className="mt-2 text-xs leading-5 text-[#C3CDD8]">{selected.description}</p><p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-[#9EADBC]">Aplicación en joyería</p><p className="mt-1 text-xs leading-5 text-[#C3CDD8]">{selected.jewelryUse}</p><button type="button" onClick={() => focus(selected)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#C6A15B] px-3 py-2 text-xs font-bold text-[#171C24]"><Focus className="size-3.5"/> Enfocar objeto</button></> : <p className="mt-1 text-xs text-[#9EADBC]">Selecciona una geometría en la escena o en la lista.</p>}</div>
        </aside>
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#202A35] px-4 py-2 text-[10px] text-[#9EADBC]"><span>Escena didáctica propia · No modifica archivos del alumno</span><span>{visibleEntries.length} visibles / {entries.length} totales</span></footer>
    </div>}
  </>;
}
