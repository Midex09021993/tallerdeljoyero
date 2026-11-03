import { useEffect, useMemo, useRef, useState } from "react";
import {
  AmbientLight, AxesHelper, Box3, BoxGeometry, BufferGeometry, EdgesGeometry,
  Color, DirectionalLight, Float32BufferAttribute, ExtrudeGeometry, GridHelper, Group, HemisphereLight, IcosahedronGeometry,
  Line, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera,
  PlaneGeometry, Points, PointsMaterial, Raycaster, Scene, Shape, Sphere, SphereGeometry, TorusGeometry,
  SRGBColorSpace, Vector2, Vector3, WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Rhino3dmLoader } from "three/addons/loaders/3DMLoader.js";
import { supabase } from "@/integrations/supabase/client";
import { Focus, Layers3, RotateCcw, Scan, X } from "lucide-react";

type Props = { visible: boolean; materials: { nombre_archivo: string; ruta_storage: string; mime_type?: string | null }[] };
type Entry = { object: Object3D; name: string; type: string; category: string; description: string; jewelryUse: string };
const CATEGORIES = [
  { id: "all", label: "Todos" }, { id: "points", label: "Puntos" },
  { id: "curves", label: "Curvas" }, { id: "surfaces", label: "Superficies" },
  { id: "polysurfaces", label: "Polisuperficies" }, { id: "extrusions", label: "Extrusiones" },
  { id: "meshes", label: "Mallas" }, { id: "subd", label: "SubD" },
  { id: "pointclouds", label: "Nubes de puntos" }, { id: "others", label: "Otros" },
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
  const gold = "#E6C77D";
  const pale = "#B7D0E8";
  const place = (object: Object3D, x: number, y: number, z = 0) => object.position.set(x, y, z);

  // Cada unidad de la escena equivale a 1 mm. El área útil es de 40 × 40 mm.
  const point = new Mesh(new SphereGeometry(0.28, 18, 12), material(gold, 0.3));
  place(point, -14, -12, 0.28);
  add(point, "Punto", "Point", "points",
    "Ubicación geométrica definida por coordenadas X, Y y Z. No debe confundirse con un punto de control, que sirve para editar la forma de una curva o superficie.",
    "Marcar centros, referencias, posiciones de engastes y puntos de construcción.");

  const profile = lineFrom([
    new Vector3(-9, -13, 0.08), new Vector3(-8, -11.8, 0.08),
    new Vector3(-6.8, -11.3, 0.08), new Vector3(-5.5, -12, 0.08),
    new Vector3(-4.8, -13, 0.08),
  ]);
  add(profile, "Curva de perfil", "Curve · abierta", "curves",
    "Curva abierta que define un recorrido sin grosor físico. En Rhino las curvas también pueden ser líneas, arcos, círculos, policurvas o curvas libres.",
    "Dibujar perfiles de anillos, contornos, recorridos y secciones para extruir.");

  const circlePts = Array.from({ length: 97 }, (_, i) => {
    const a = i / 96 * Math.PI * 2;
    return new Vector3(-1.5 + Math.cos(a) * 1.8, -12 + Math.sin(a) * 1.8, 0.08);
  });
  add(lineFrom(circlePts, "#F3D99A"), "Círculo", "Curve · cerrada", "curves",
    "Curva plana cerrada cuyos puntos están a la misma distancia del centro. En Rhino, el círculo pertenece a la familia de curvas; no es una familia independiente.",
    "Construir aros, alianzas, perfiles circulares y trayectorias concéntricas.");

  const surface = new Mesh(new PlaneGeometry(5.2, 4.2), material("#8FB8D8", 0.58));
  place(surface, 6, -12, 0.08);
  add(surface, "Superficie plana", "Surface · NURBS", "surfaces",
    "Superficie que define largo y ancho, pero no encierra volumen por sí sola. Rhino representa sus superficies mediante geometría NURBS; también existen superficies recortadas y de forma libre.",
    "Crear caras, paños, asientos y superficies de transición en una joya.");

  const openBrep = new Group();
  const faceMat = material("#A8BDD1", 0.52);
  const base = new Mesh(new PlaneGeometry(4.8, 3.8), faceMat);
  base.position.set(0, 0, 0.12);
  const back = new Mesh(new PlaneGeometry(4.8, 2.8), faceMat);
  back.position.set(0, 1.9, 1.5);
  back.rotation.x = Math.PI / 2;
  const side = new Mesh(new PlaneGeometry(3.8, 2.8), faceMat);
  side.position.set(-2.4, 0, 1.5);
  side.rotation.y = -Math.PI / 2;
  openBrep.add(base, back, side);
  place(openBrep, 14, -11.5, 0);
  add(openBrep, "Polisuperficie abierta", "Brep · abierta", "polysurfaces",
    "Conceptualmente representa varias superficies unidas que dejan una abertura y no encierran volumen. La escena es una ilustración visual; no es un Brep nativo editable de Rhino.",
    "Construir cuerpos complejos a partir de varias caras unidas.");

  const closedBrep = new Mesh(new BoxGeometry(4.5, 4.5, 3.6), material(pale, 0.38));
  place(closedBrep, -10, 6, 1.8);
  add(closedBrep, "Polisuperficie cerrada", "Closed Brep · sólido", "polysurfaces",
    "Polisuperficie cuyas caras forman un límite cerrado y encierran un volumen. En Rhino suele denominarse sólido; no es una familia separada. La caja mostrada es una analogía visual, no un Brep nativo.",
    "Modelar cuerpos de anillos, placas, engastes y componentes cerrados.");

  const mesh = new Mesh(new IcosahedronGeometry(2.15, 1), new MeshStandardMaterial({
    color: "#9EBBD6", roughness: 0.55, flatShading: true, metalness: 0.08,
  }));
  place(mesh, -2.5, 6, 2.1);
  add(mesh, "Malla poligonal", "Mesh", "meshes",
    "Objeto formado por vértices, aristas y caras poligonales. Su densidad y distribución de polígonos influyen en la suavidad y el detalle.",
    "Escultura digital, visualización, impresión 3D e intercambio de modelos.");

  const shape = new Shape();
  shape.moveTo(-2.2, -1.4); shape.lineTo(1.8, -1.4); shape.lineTo(2.2, 0);
  shape.lineTo(1.4, 1.4); shape.lineTo(-1.8, 1.4); shape.closePath();
  const extrusion = new Mesh(new ExtrudeGeometry(shape, { depth: 2.8, bevelEnabled: false }), material("#D1DCE8", 0.4));
  place(extrusion, 6.5, 6, 0.08);
  add(extrusion, "Extrusión lineal", "Extrusion · ligera", "extrusions",
    "Objeto generado al extender un perfil en una dirección. Rhino puede conservarlo como extrusión ligera o convertirlo en superficies/polisuperficie; puede ser abierto o cerrado.",
    "Crear barras, perfiles repetitivos, biseles y cuerpos de sección constante.");

  const subd = new Mesh(new IcosahedronGeometry(2.25, 2), new MeshStandardMaterial({
    color: "#B7A6D8", roughness: 0.34, metalness: 0.06,
  }));
  place(subd, 14, 6, 2.25);
  add(subd, "SubD", "Subdivision Surface", "subd",
    "Geometría de subdivisión Catmull–Clark de Rhino 7, diseñada para modelar formas orgánicas con control fluido. La forma suave mostrada es una ilustración; no es un objeto SubD nativo ni editable de Rhino.",
    "Diseñar volúmenes orgánicos, monturas escultóricas y formas suaves.");

  const cloudGeometry = new BufferGeometry();
  const cloudPositions: number[] = [];
  for (let i = 0; i < 90; i++) {
    const a = i * 2.399963;
    const r = 0.45 + (i % 9) * 0.13;
    cloudPositions.push(-14 + Math.cos(a) * r, Math.sin(a) * r, 0.35 + (i % 7) * 0.12);
  }
  cloudGeometry.setAttribute("position", new Float32BufferAttribute(cloudPositions, 3));
  const cloud = new Points(cloudGeometry, new PointsMaterial({ color: "#E6C77D", size: 0.13, sizeAttenuation: true }));
  place(cloud, 0, 0, 0);
  add(cloud, "Nube de puntos", "PointCloud", "pointclouds",
    "Conjunto de numerosos puntos agrupados como un solo objeto para representar datos de escaneo o captura espacial. No equivale a colocar puntos individuales uno por uno.",
    "Consultar escaneos de piezas, comparar medidas y reconstruir referencias de modelos reales.");

  const other = new Group();
  const blockBody = new Mesh(new BoxGeometry(3.4, 2.4, 0.18), material("#B8C5D3", 0.65));
  blockBody.position.z = 0.12;
  const blockMark = lineFrom([
    new Vector3(-1.1, -0.55, 0.24), new Vector3(0, 0.65, 0.24), new Vector3(1.1, -0.55, 0.24),
  ], gold);
  other.add(blockBody, blockMark);
  place(other, 0, 12, 0);
  add(other, "Otros objetos", "Bloques · cotas · textos…", "others",
    "Grupo de objetos que no son geometría principal: bloques, anotaciones, cotas, textos, luces, sombreados y otros elementos del documento.",
    "Organizar componentes reutilizables, rotular planos y documentar medidas del diseño.");
  return result;
}


export default function RhinoObjectExplorer({ visible, materials }: Props) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [wireframe, setWireframe] = useState(false);
  const [orientationStatus, setOrientationStatus] = useState("Esperando archivo");
  const viewportRef = useRef<HTMLDivElement>(null);
  const orientationRef = useRef<HTMLDivElement>(null);
  const orientationSceneRef = useRef<Scene | null>(null);
  const orientationCameraRef = useRef<PerspectiveCamera | null>(null);
  const orientationRendererRef = useRef<WebGLRenderer | null>(null);
  const orientationObjectRef = useRef<Object3D | null>(null);
  const orientationLoaderRef = useRef<Rhino3dmLoader | null>(null);
  const modelRef = useRef<Object3D | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const selectionRef = useRef<Object3D[]>([]);
  const visibleEntries = useMemo(() => entries.filter(e => category === "all" || e.category === category), [entries, category]);
  const selected = entries.find(e => e.object.uuid === selectedId) ?? null;
  const ringStoragePath = useMemo(
    () => materials.find(item => item.nombre_archivo.trim().toLocaleLowerCase() === "ring.3dm")?.ruta_storage ?? "",
    [materials],
  );
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
    const orientationHost = orientationRef.current;
    const orientationScene = new Scene();
    orientationScene.background = new Color("#202A35");
    const orientationCamera = new PerspectiveCamera(34, 1, 0.01, 100);
    orientationCamera.up.set(0, 0, 1);
    orientationCamera.position.set(0, -8, 4.8);
    orientationCamera.lookAt(0, 0, 0);
    const orientationRenderer = new WebGLRenderer({ antialias: true, alpha: true });
    orientationRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    orientationRenderer.outputColorSpace = SRGBColorSpace;
    orientationRenderer.setClearColor(0x202A35, 0);
    if (orientationHost) {
      orientationHost.replaceChildren(orientationRenderer.domElement);
      orientationRenderer.setSize(Math.max(orientationHost.clientWidth, 1), Math.max(orientationHost.clientHeight, 1), false);
    }
    orientationScene.add(new AmbientLight(0xffffff, 1.5));
    const orientationKey = new DirectionalLight(0xffffff, 2.2);
    orientationKey.position.set(-3, -4, 6);
    orientationScene.add(orientationKey);
    const orientationFill = new DirectionalLight(0xc5d7ef, 1.2);
    orientationFill.position.set(4, 3, 2);
    orientationScene.add(orientationFill);
    orientationSceneRef.current = orientationScene;
    orientationCameraRef.current = orientationCamera;
    orientationRendererRef.current = orientationRenderer;
    orientationObjectRef.current = null;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = SRGBColorSpace;
    host.replaceChildren(renderer.domElement);
    scene.add(new AmbientLight(0xffffff, 1.05));
    scene.add(new HemisphereLight(0xeaf2ff, 0x536477, 1.45));
    const key = new DirectionalLight(0xffffff, 2.3); key.position.set(-8, -12, 18); scene.add(key);
    const fill = new DirectionalLight(0xc5d7ef, 1.15); fill.position.set(10, 8, 12); scene.add(fill);
    const grid = new GridHelper(40, 40, 0x64778B, 0x293747); grid.rotation.x = Math.PI / 2; scene.add(grid);
    const workArea = new Line(new BufferGeometry().setFromPoints([new Vector3(-20,-20,0.025),new Vector3(20,-20,0.025),new Vector3(20,20,0.025),new Vector3(-20,20,0.025),new Vector3(-20,-20,0.025)]), new LineBasicMaterial({color:0xC6A15B})); scene.add(workArea);
    scene.add(new AxesHelper(3));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.075; controls.screenSpacePanning = true;
    controls.target.set(0, 0, 0);
    camera.position.set(42, -56, 43); camera.lookAt(controls.target);
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
    const radius = Math.max(bounds.getBoundingSphere(new Sphere()).radius, 21);
    controls.target.copy(center);
    camera.position.copy(center).add(new Vector3(1, -1.35, 1.0).normalize().multiplyScalar(radius * 2.25));
    camera.near = Math.max(radius / 1000, 0.01); camera.far = radius * 20;
    camera.updateProjectionMatrix(); controls.update();

    const raycaster = new Raycaster(), pointer = new Vector2();
    const handlePick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(created.map(e => e.object), true);
      if (!hits.length) return;
      const firstHit = hits[0];
      if (!firstHit) return;
      let target: Object3D | null = firstHit.object;
      while (target && !created.some(e => e.object === target)) target = target.parent;
      const match = created.find(e => e.object === target);
      if (match) setSelectedId(match.object.uuid);
    };
    renderer.domElement.addEventListener("click", handlePick);
    const animate = () => {
      if (disposed) return;
      frame = window.requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      if (orientationObjectRef.current) {
        orientationObjectRef.current.quaternion.copy(orientationCamera.quaternion).multiply(camera.quaternion.clone().invert());
        orientationRenderer.render(orientationScene, orientationCamera);
      }
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
      orientationLoaderRef.current?.dispose();
      orientationLoaderRef.current = null;
      orientationScene.traverse(object => {
        const item = object as Mesh;
        item.geometry?.dispose?.();
        if (Array.isArray(item.material)) item.material.forEach(m => m.dispose());
        else item.material?.dispose?.();
      });
      orientationRenderer.dispose();
      orientationRenderer.domElement.remove();
      orientationSceneRef.current = null;
      orientationCameraRef.current = null;
      orientationRendererRef.current = null;
      orientationObjectRef.current = null;
      modelRef.current = null; cameraRef.current = null; controlsRef.current = null;
      sceneRef.current = null; selectionRef.current = [];
    };
  }, [open]);

  useEffect(() => {
    if (!open || !orientationSceneRef.current) return;
    let cancelled = false;
    let loadedObject: Object3D | null = null;
    if (!ringStoragePath) {
      setOrientationStatus("Ring.3dm no encontrado");
      return;
    }
    setOrientationStatus("Cargando anillo…");
    const loadRing = async () => {
      try {
        const { data, error } = await supabase.storage.from("formacion-academica").createSignedUrl(ringStoragePath, 3600);
        if (error || !data?.signedUrl) throw new Error(error?.message || "No se pudo obtener el archivo Ring.3dm.");
        const response = await fetch(data.signedUrl);
        if (!response.ok) throw new Error("No se pudo descargar Ring.3dm desde la biblioteca de la sesión.");
        const buffer = await response.arrayBuffer();
        if (cancelled) return;
        const loader = new Rhino3dmLoader();
        loader.setLibraryPath("https://cdn.jsdelivr.net/npm/rhino3dm@8.32.1/");
        loader.setWorkerLimit(1);
        orientationLoaderRef.current = loader;
        loadedObject = await new Promise<Object3D>((resolve, reject) => loader.parse(buffer, resolve, reject));
        if (cancelled || !orientationSceneRef.current) return;
        loadedObject.updateMatrixWorld(true);
        const bounds = new Box3().setFromObject(loadedObject);
        const center = bounds.getCenter(new Vector3());
        const size = bounds.getSize(new Vector3());
        const fitScale = 3.25 / Math.max(size.x, size.y, size.z, 0.001);
        loadedObject.scale.setScalar(fitScale);
        loadedObject.position.set(-center.x * fitScale, -center.y * fitScale, -center.z * fitScale);
        loadedObject.updateMatrixWorld(true);
        const orientationRoot = new Group();
        orientationRoot.name = "Ring.3dm · orientación sincronizada";
        orientationRoot.add(loadedObject);
        orientationSceneRef.current.add(orientationRoot);
        orientationObjectRef.current = orientationRoot;
        setOrientationStatus("Sincronizado con perspectiva");
      } catch (error) {
        if (!cancelled) {
          setOrientationStatus("No se pudo cargar el anillo");
          console.error("No se pudo integrar Ring.3dm:", error);
        }
      }
    };
    void loadRing();
    return () => {
      cancelled = true;
      if (loadedObject && orientationObjectRef.current?.children.includes(loadedObject)) {
        orientationSceneRef.current?.remove(orientationObjectRef.current);
        orientationObjectRef.current = null;
        loadedObject.traverse(object => {
          const item = object as Mesh;
          item.geometry?.dispose?.();
          if (Array.isArray(item.material)) item.material.forEach(m => m.dispose());
          else item.material?.dispose?.();
        });
      }
    };
  }, [open, ringStoragePath]);

  useEffect(() => {
    entries.forEach(e => { e.object.visible = category === "all" || e.category === category; });
  }, [entries, category]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    selectionRef.current.forEach(item => {
      item.parent?.remove(item);
      const mesh = item as LineSegments;
      mesh.geometry?.dispose?.();
      (mesh.material as MeshBasicMaterial | undefined)?.dispose?.();
    });
    selectionRef.current = [];
    if (selected) {
      selected.object.updateWorldMatrix(true, true);
      selected.object.traverse(child => {
        const mesh = child as Mesh;
        if (!mesh.isMesh || !mesh.geometry) return;
        const outline = new LineSegments(
          new EdgesGeometry(mesh.geometry, 22),
          new LineBasicMaterial({ color: "#F0CC78", transparent: true, opacity: 0.98, depthTest: false }),
        );
        outline.position.set(0, 0, 0);
        outline.renderOrder = 20;
        mesh.add(outline);
        selectionRef.current.push(outline);
      });
      const bounds = new Box3().setFromObject(selected.object);
      const center = bounds.getCenter(new Vector3());
      const marker = new Mesh(
        new TorusGeometry(0.42, 0.025, 6, 40),
        new MeshBasicMaterial({ color: "#F0CC78", transparent: true, opacity: 0.9, depthTest: false }),
      );
      marker.position.set(center.x, center.y, Math.max(0.05, bounds.min.z + 0.06));
      marker.renderOrder = 21;
      scene.add(marker);
      selectionRef.current.push(marker);
    }
  }, [selectedId, selected]);


  const focus = (entry: Entry | null) => {
    if (!entry || !cameraRef.current || !controlsRef.current) return;
    const bounds = new Box3().setFromObject(entry.object);
    const center = bounds.getCenter(new Vector3());
    const radius = Math.max(bounds.getBoundingSphere(new Sphere()).radius, 1.8);
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
    const radius = Math.max(bounds.getBoundingSphere(new Sphere()).radius, 21);
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
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#D8B979]">FADILAB · SESIÓN 02 · LABORATORIO 3D</p><h3 className="mt-1 text-lg font-semibold">GEOMETRÍAS DE RHINO <span className="font-normal text-[#AAB7C5]">/ Aprende explorando</span></h3><p className="mt-1 text-sm text-[#C2CCD7]">Explora las familias de objetos de Rhino en un área de trabajo de 40 × 40 mm.</p></div>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-b from-[#E6C77D] to-[#BF9952] px-4 py-2.5 text-sm font-bold text-[#241B0C] shadow-sm transition hover:-translate-y-0.5 hover:brightness-105"><Scan className="size-4"/> Abrir laboratorio</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[#D0D8E0]">{["Área 40 × 40 mm","Cuadrícula de 1 mm","Selección directa en 3D","Ejes X · Y · Z"].map(item => <span key={item} className="rounded-full border border-white/15 px-3 py-1.5">{item}</span>)}</div>
    </section>
    {open && <div className="fixed inset-0 z-[130] flex h-[100dvh] flex-col overflow-hidden bg-[#141A22] text-[#E8EDF2]" role="dialog" aria-modal="true" aria-label="Laboratorio de geometrías Rhino">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#202A35] px-4 py-3 sm:px-6">
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#D8B979]">FADILAB · SESIÓN 02 · RHINO 7</p><h2 className="text-lg font-semibold">Geometry Lab <span className="font-normal text-[#AAB7C5]">/ Tipos de geometría</span></h2><p className="text-xs text-[#AAB7C5]">{entries.length} ejemplos didácticos · Área de trabajo 40 × 40 mm · Escena independiente del archivo 3DM</p></div>
        <div className="flex items-center gap-2"><button type="button" onClick={resetView} disabled={!entries.length} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-[#D0D8E0] disabled:opacity-40"><RotateCcw className="size-3.5"/> Encuadre</button><button type="button" onClick={toggleWireframe} disabled={!entries.length} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-[#D0D8E0] disabled:opacity-40"><Layers3 className="size-3.5"/> {wireframe ? "Sombreado" : "Alámbrico"}</button><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-white/15 p-2 text-[#D0D8E0]" aria-label="Cerrar"><X className="size-4"/></button></div>
      </header>
      <nav className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 bg-[#1B242E] px-4 py-2.5 sm:px-6">{CATEGORIES.map(item => <button key={item.id} type="button" onClick={() => setCategory(item.id)} aria-pressed={category === item.id} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${category === item.id ? "border-[#C6A15B] bg-[#C6A15B]/15 text-[#E5C47C]" : "border-white/10 bg-[#26313D] text-[#B9C5D1]"}`}>{item.label} <span className="ml-1 opacity-70">{counts[item.id] ?? 0}</span></button>)}</nav>
      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="relative min-h-[260px] overflow-hidden rounded-xl border border-white/10 bg-[#141B24]"><div ref={viewportRef} className="absolute inset-0"/><div className="pointer-events-none absolute left-4 top-4 z-10 rounded-lg border border-white/15 bg-[#202A35]/90 px-3 py-2 shadow-lg"><p className="text-[10px] font-bold tracking-[.16em] text-[#E6C77D]">PERSPECTIVA</p><p className="mt-0.5 text-[9px] text-[#AAB7C5]">Área de trabajo · 40 × 40 mm</p></div>
          <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-xl border border-white/10 bg-[#202A35]/85 px-3 py-2 shadow-lg">
            <svg viewBox="0 0 76 64" className="h-12 w-14" aria-label="Ejes globales X Y Z"><circle cx="25" cy="39" r="3" fill="#E8EDF2"/><path d="M25 39 L57 39" stroke="#EF4444" strokeWidth="2.5"/><path d="M25 39 L7 19" stroke="#22C55E" strokeWidth="2.5"/><path d="M25 39 L25 5" stroke="#3B82F6" strokeWidth="2.5"/><g fontSize="10" fontWeight="700"><text x="62" y="43" fill="#F87171">X</text><text x="1" y="15" fill="#4ADE80">Y</text><text x="30" y="10" fill="#60A5FA">Z</text></g></svg>
            <span className="text-[10px] leading-4 text-[#C4CED8]">Ejes del mundo<br/><b className="font-semibold text-[#E8EDF2]">X · Y · Z</b></span>
          </div>
          <div className="pointer-events-none absolute right-3 top-3 z-10 flex h-[128px] w-[128px] flex-col items-center justify-center gap-0.5 overflow-hidden rounded-full border border-[#D8B979]/50 bg-[#202A35]/90 shadow-xl"><div ref={orientationRef} className="h-[86px] w-[86px]" /><span className="text-[8px] font-bold tracking-[.12em] text-[#D8B979]">ORIENTACIÓN</span><span className="max-w-[112px] truncate text-center text-[7px] text-[#AAB7C5]">{orientationStatus}</span></div>
          <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg border border-white/10 bg-[#202A35]/80 px-3 py-2 text-[10px] text-[#AAB7C5]">Arrastra para orbitar · Rueda para zoom · Clic para seleccionar</div>
        </section>
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#202A35]">
          <div className="shrink-0 border-b border-white/10 px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#D8B979]">Geometrías de la escena</p><p className="mt-1 text-sm font-semibold">{visibleEntries.length} objetos</p></div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">{visibleEntries.map(entry => <button key={entry.object.uuid} type="button" onClick={() => setSelectedId(entry.object.uuid)} aria-pressed={selectedId === entry.object.uuid} className={`mb-1 w-full rounded-lg border px-3 py-2 text-left ${selectedId === entry.object.uuid ? "border-[#C6A15B] bg-[#C6A15B]/10" : "border-transparent hover:border-white/10 hover:bg-white/5"}`}><span className="block truncate text-xs font-semibold text-[#E8EDF2]">{entry.name}</span><span className="mt-1 block truncate text-[10px] text-[#9EADBC]">{entry.type}</span></button>)}</div>
          <div className="shrink-0 border-t border-white/10 bg-[#19222C] p-3"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#D8B979]">Ficha didáctica</p>{selected ? <><p className="mt-1 truncate text-sm font-semibold">{selected.name}</p><p className="mt-1 text-[10px] font-semibold text-[#D8B979]">{selected.type}</p><p className="mt-2 text-xs leading-5 text-[#C3CDD8]">{selected.description}</p><p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-[#9EADBC]">Aplicación en joyería</p><p className="mt-1 text-xs leading-5 text-[#C3CDD8]">{selected.jewelryUse}</p><button type="button" onClick={() => focus(selected)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#C6A15B] px-3 py-2 text-xs font-bold text-[#171C24]"><Focus className="size-3.5"/> Enfocar objeto</button></> : <p className="mt-1 text-xs text-[#9EADBC]">Selecciona una geometría en la escena o en la lista.</p>}</div>
        </aside>
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#202A35] px-4 py-2 text-[10px] text-[#9EADBC]"><span>Modelos visuales ilustrativos · No son objetos nativos editables de Rhino · 40 × 40 mm</span><span>{visibleEntries.length} visibles / {entries.length} totales</span></footer>
    </div>}
  </>;
}
