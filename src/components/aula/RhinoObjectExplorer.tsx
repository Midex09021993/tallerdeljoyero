import { useEffect, useMemo, useRef, useState } from "react";
import { AmbientLight, Box3, Color, DirectionalLight, GridHelper, Mesh, Object3D, PerspectiveCamera, Scene, SRGBColorSpace, Vector3, WebGLRenderer } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Rhino3dmLoader } from "three/addons/loaders/3DMLoader.js";
import { Box, Focus, Layers3, LoaderCircle, RotateCcw, Scan, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type MaterialFile = { nombre_archivo: string; ruta_storage: string; mime_type?: string | null };
type Props = { visible: boolean; materials: MaterialFile[] };
type Entry = { object: Object3D; name: string; type: string; layer: string; category: string };

const CATEGORIES = [
  { id: "all", label: "Todos" }, { id: "curves", label: "Curvas" },
  { id: "surfaces", label: "Superficies" }, { id: "polysurfaces", label: "Polisuperficies" },
  { id: "solids", label: "Sólidos" }, { id: "meshes", label: "Mallas" },
  { id: "points", label: "Puntos" }, { id: "extrusions", label: "Extrusiones" },
  { id: "other", label: "Otros" },
] as const;

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

function getCategory(layer: string, type: string) {
  const name = normalize(layer);
  if (name.includes("PUNTOS DE CONTROL") || type === "Point" || type === "PointSet") return "points";
  if (name.includes("MALLAS") || name.includes("MAYAS") || type === "Mesh") return "meshes";
  if (name.includes("POLISUPERFICIE")) return "polysurfaces";
  if (name.includes("SUPERFICIE")) return "surfaces";
  if (name.includes("SOLIDO")) return "solids";
  if (name.includes("EXTRUSION") || type === "Extrusion") return "extrusions";
  if (name.includes("CURVA") || type === "Curve") return "curves";
  return "other";
}

export default function RhinoObjectExplorer({ visible, materials }: Props) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [fileNotice, setFileNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [wireframe, setWireframe] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<Object3D | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    if (!visible) return;
    let current = true;
    const file = materials.find((item) => normalize(item.nombre_archivo).includes("TIPOS DE OBJETOS RHINOCEROS") && /\.3dm$/i.test(item.nombre_archivo));
    if (!file) {
      setUrl("");
      setFileNotice("Falta publicar TIPOS DE OBJETOS RHINOCEROS.3dm en la Biblioteca del curso. Súbelo como material de la Sesión 01 y publícalo para compartirlo con los alumnos.");
      return () => { current = false; };
    }
    setFileNotice("");
    supabase.storage.from("formacion-academica").createSignedUrl(file.ruta_storage, 3600)
      .then(({ data, error: storageError }) => {
        if (!current) return;
        if (storageError || !data?.signedUrl) { setFileNotice("El archivo está publicado, pero no se pudo abrir desde el almacenamiento."); return; }
        setUrl(data.signedUrl);
      })
      .catch(() => { if (current) setFileNotice("No se pudo acceder al archivo 3DM."); });
    return () => { current = false; };
  }, [visible, materials]);

  const visibleEntries = useMemo(() => entries.filter((entry) => category === "all" || entry.category === category), [entries, category]);
  const selected = entries.find((entry) => entry.object.uuid === selectedId) ?? null;
  const counts = useMemo(() => {
    const result: Record<string, number> = { all: entries.length };
    CATEGORIES.forEach((item) => { if (item.id !== "all") result[item.id] = entries.filter((entry) => entry.category === item.id).length; });
    return result;
  }, [entries]);

  useEffect(() => {
    if (!open || !url || !viewportRef.current) return;
    let disposed = false;
    let frame = 0;
    const host = viewportRef.current;
    const scene = new Scene();
    scene.background = new Color("#141b24");
    const camera = new PerspectiveCamera(42, 1, 0.01, 100000);
    camera.position.set(120, -160, 120);
    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = SRGBColorSpace;
    host.replaceChildren(renderer.domElement);
    scene.add(new AmbientLight(0xffffff, 1.35));
    const key = new DirectionalLight(0xffffff, 2);
    key.position.set(90, -80, 140);
    scene.add(key);
    const fill = new DirectionalLight(0xc5d7ef, 0.7);
    fill.position.set(-90, 40, 60);
    scene.add(fill);
    const grid = new GridHelper(300, 30, 0x536477, 0x293747);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.screenSpacePanning = true;
    cameraRef.current = camera;
    controlsRef.current = controls;
    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const loader = new Rhino3dmLoader();
    loader.setLibraryPath("https://cdn.jsdelivr.net/npm/rhino3dm@8.32.1/");
    setLoading(true);
    setError("");
    fetch(url)
      .then((response) => { if (!response.ok) throw new Error("No se pudo descargar el archivo 3DM."); return response.arrayBuffer(); })
      .then((buffer) => loader.parseAsync(buffer))
      .then((model) => {
        if (disposed) return;
        model.rotation.x = -Math.PI / 2;
        scene.add(model);
        modelRef.current = model;
        const layers = (model.userData.layers ?? []) as Array<{ name?: string }>;
        const found: Entry[] = [];
        model.traverse((object) => {
          const type = String(object.userData.objectType ?? "");
          if (!type) return;
          const attributes = object.userData.attributes as { layerIndex?: number; name?: string } | undefined;
          const layer = layers[attributes?.layerIndex ?? -1]?.name ?? "Sin capa";
          found.push({ object, type, layer, name: object.name || attributes?.name || type + " " + (found.length + 1), category: getCategory(layer, type) });
        });
        setEntries(found);
        setSelectedId(found[0]?.object.uuid ?? "");
        const bounds = new Box3().setFromObject(model);
        const center = bounds.getCenter(new Vector3());
        const size = bounds.getSize(new Vector3());
        const span = Math.max(size.x, size.y, size.z, 10);
        controls.target.copy(center);
        camera.position.copy(center).add(new Vector3(span * 1.45, -span * 1.8, span * 1.25));
        camera.near = Math.max(span / 10000, 0.001);
        camera.far = span * 100;
        camera.updateProjectionMatrix();
        controls.update();
      })
      .catch((reason: unknown) => { if (!disposed) setError(reason instanceof Error ? reason.message : "No se pudo interpretar el archivo 3DM."); })
      .finally(() => { if (!disposed) setLoading(false); });
    const animate = () => { if (disposed) return; frame = window.requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
    animate();
    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      loader.dispose();
      scene.traverse((object) => {
        const item = object as Mesh;
        item.geometry?.dispose?.();
        if (Array.isArray(item.material)) item.material.forEach((material) => material.dispose());
        else item.material?.dispose?.();
      });
      renderer.dispose();
      renderer.domElement.remove();
      modelRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, [open, url]);

  useEffect(() => {
    entries.forEach((entry) => { entry.object.visible = category === "all" || entry.category === category; });
  }, [entries, category]);

  const focus = (entry: Entry | null) => {
    if (!entry || !cameraRef.current || !controlsRef.current) return;
    const bounds = new Box3().setFromObject(entry.object);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const span = Math.max(size.x, size.y, size.z, 5);
    controlsRef.current.target.copy(center);
    cameraRef.current.position.copy(center).add(new Vector3(span * 1.8, -span * 2, span * 1.5));
    controlsRef.current.update();
  };

  const resetView = () => {
    if (!modelRef.current || !cameraRef.current || !controlsRef.current) return;
    const bounds = new Box3().setFromObject(modelRef.current);
    const center = bounds.getCenter(new Vector3());
    const span = Math.max(...bounds.getSize(new Vector3()).toArray(), 10);
    controlsRef.current.target.copy(center);
    cameraRef.current.position.copy(center).add(new Vector3(span * 1.45, -span * 1.8, span * 1.25));
    controlsRef.current.update();
  };

  const toggleWireframe = () => {
    const next = !wireframe;
    setWireframe(next);
    modelRef.current?.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      list.forEach((material) => { if ("wireframe" in material) (material as { wireframe: boolean }).wireframe = next; });
    });
  };

  if (!visible) return null;
  return <>
    <section className="mt-5 overflow-hidden rounded-2xl border border-[#C6A15B]/35 bg-gradient-to-br from-[#222B36] via-[#1D2630] to-[#171C24] p-4 text-white shadow-lg sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#D8B979]">FADILAB · SESIÓN 02 · EXPLORACIÓN 3D</p><h3 className="mt-1 text-lg font-semibold">RHINO OBJECT EXPLORER <span className="font-normal text-[#AAB7C5]">/ Tipos de objetos</span></h3><p className="mt-1 text-sm text-[#C2CCD7]">Explora el modelo, filtra categorías y consulta objetos reales del archivo.</p></div>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-b from-[#E6C77D] to-[#BF9952] px-4 py-2.5 text-sm font-bold text-[#241B0C] shadow-sm transition hover:-translate-y-0.5 hover:brightness-105"><Scan className="size-4"/> Abrir explorador</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[#D0D8E0]">{["Visor 3D real","Filtros por tipo","Selección y enfoque","Modo alámbrico"].map((item) => <span key={item} className="rounded-full border border-white/15 px-3 py-1.5">{item}</span>)}</div>
      {fileNotice && <p className="mt-3 rounded-lg border border-[#C6A15B]/30 bg-[#141B24]/70 px-3 py-2 text-xs leading-5 text-[#E6D5B3]">{fileNotice}</p>}
    </section>
    {open && <div className="fixed inset-0 z-[130] flex h-[100dvh] flex-col overflow-hidden bg-[#141A22] text-[#E8EDF2]" role="dialog" aria-modal="true" aria-label="Rhino Object Explorer">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#202A35] px-4 py-3 sm:px-6">
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#D8B979]">FADILAB · SESIÓN 02 · RHINO 7</p><h2 className="text-lg font-semibold">Object Explorer <span className="font-normal text-[#AAB7C5]">/ Tipos de objetos</span></h2><p className="text-xs text-[#AAB7C5]">{entries.length ? entries.length + " objetos detectados" : "Lectura del modelo 3DM"}</p></div>
        <div className="flex items-center gap-2"><button type="button" onClick={resetView} disabled={!entries.length} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-[#D0D8E0] disabled:opacity-40"><RotateCcw className="size-3.5"/> Encuadre</button><button type="button" onClick={toggleWireframe} disabled={!entries.length} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-[#D0D8E0] disabled:opacity-40"><Layers3 className="size-3.5"/> {wireframe ? "Sombreado" : "Alámbrico"}</button><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-white/15 p-2 text-[#D0D8E0]" aria-label="Cerrar"><X className="size-4"/></button></div>
      </header>
      <nav className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 bg-[#1B242E] px-4 py-2.5 sm:px-6">{CATEGORIES.map((item) => <button key={item.id} type="button" onClick={() => setCategory(item.id)} aria-pressed={category === item.id} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${category === item.id ? "border-[#C6A15B] bg-[#C6A15B]/15 text-[#E5C47C]" : "border-white/10 bg-[#26313D] text-[#B9C5D1]"}`}>{item.label} <span className="ml-1 opacity-70">{counts[item.id] ?? 0}</span></button>)}</nav>
      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="relative min-h-[260px] overflow-hidden rounded-xl border border-white/10 bg-[#141B24]"><div ref={viewportRef} className="absolute inset-0"/>
          {!url && <div className="absolute inset-0 flex items-center justify-center p-6 text-center"><div className="max-w-md"><Box className="mx-auto size-10 text-[#C6A15B]"/><h3 className="mt-3 font-semibold">Modelo 3DM pendiente</h3><p className="mt-2 text-sm leading-6 text-[#AAB7C5]">{fileNotice || "Publica el archivo de tipos de objetos en la Biblioteca del curso."}</p></div></div>}
          {loading && <div className="absolute inset-0 flex items-center justify-center bg-[#141B24]/75"><div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#202A35] px-4 py-3 text-sm"><LoaderCircle className="size-4 animate-spin text-[#D8B979]"/> Leyendo geometría…</div></div>}
          {error && <div className="absolute inset-x-4 bottom-4 rounded-lg border border-red-400/30 bg-red-950/80 p-3 text-xs text-red-100">{error}</div>}
          <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg border border-white/10 bg-[#202A35]/80 px-3 py-2 text-[10px] text-[#AAB7C5]">Arrastra para orbitar · Rueda para zoom</div>
        </section>
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#202A35]">
          <div className="shrink-0 border-b border-white/10 px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#D8B979]">Objetos del modelo</p><p className="mt-1 text-sm font-semibold">{visibleEntries.length} elementos</p></div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">{visibleEntries.map((entry) => <button key={entry.object.uuid} type="button" onClick={() => setSelectedId(entry.object.uuid)} aria-pressed={selectedId === entry.object.uuid} className={`mb-1 w-full rounded-lg border px-3 py-2 text-left ${selectedId === entry.object.uuid ? "border-[#C6A15B] bg-[#C6A15B]/10" : "border-transparent hover:border-white/10 hover:bg-white/5"}`}><span className="block truncate text-xs font-semibold text-[#E8EDF2]">{entry.name}</span><span className="mt-1 block truncate text-[10px] text-[#9EADBC]">{entry.type} · {entry.layer}</span></button>)}{!visibleEntries.length && <p className="p-3 text-xs text-[#9EADBC]">{entries.length ? "No hay objetos en esta categoría." : "Los objetos aparecerán aquí cuando termine la lectura."}</p>}</div>
          <div className="shrink-0 border-t border-white/10 bg-[#19222C] p-3"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#D8B979]">Selección</p>{selected ? <><p className="mt-1 truncate text-sm font-semibold">{selected.name}</p><p className="mt-1 text-[10px] text-[#AAB7C5]">{selected.type} · {selected.layer}</p><button type="button" onClick={() => focus(selected)} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#C6A15B] px-3 py-2 text-xs font-bold text-[#171C24]"><Focus className="size-3.5"/> Enfocar objeto</button></> : <p className="mt-1 text-xs text-[#9EADBC]">Selecciona un objeto.</p>}</div>
        </aside>
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#202A35] px-4 py-2 text-[10px] text-[#9EADBC] sm:px-6"><span>Visor de consulta · No modifica el archivo original</span><span>{entries.length ? visibleEntries.length + " visibles / " + entries.length + " totales" : "Rhino 3DM"}</span></footer>
    </div>}
  </>;
}
