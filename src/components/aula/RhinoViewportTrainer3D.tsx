import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

type ViewId = "Top" | "Perspective" | "Front" | "Right";
type Props = {
  zoom: number;
  orbit: number;
  pan: { x: number; y: number };
  activeView: string;
  maximized: string | null;
  onActivate: (view: string) => void;
  onMaximize: (view: string) => void;
  onAction: (action: string) => void;
  onZoom: (zoom: number) => void;
  onOrbit: (orbit: number) => void;
  onPan: (pan: { x: number; y: number }) => void;
};

const VIEWS: { id: ViewId; title: string; subtitle: string }[] = [
  { id: "Top", title: "TOP · SUPERIOR", subtitle: "XY · PLANTA" },
  { id: "Perspective", title: "PERSPECTIVE · 3D", subtitle: "ORBIT · PERSPECTIVA" },
  { id: "Front", title: "FRONT · FRONTAL", subtitle: "XZ · ELEVACIÓN" },
  { id: "Right", title: "RIGHT · DERECHA", subtitle: "YZ · LATERAL" },
];

function makeJewelryScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#10161e");
  scene.fog = new THREE.Fog("#10161e", 13, 24);
  const group = new THREE.Group();
  scene.add(group);

  const gold = new THREE.MeshPhysicalMaterial({ color: "#d6a84d", metalness: 0.92, roughness: 0.22, clearcoat: 0.55, clearcoatRoughness: 0.18 });
  const innerGold = new THREE.MeshPhysicalMaterial({ color: "#f1cf83", metalness: 0.9, roughness: 0.28 });
  const diamond = new THREE.MeshPhysicalMaterial({ color: "#e7f5ff", metalness: 0.03, roughness: 0.08, transmission: 0.38, thickness: 0.65, ior: 2.1, clearcoat: 1, transparent: true, opacity: 0.94 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.23, 28, 120), gold);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  const innerBand = new THREE.Mesh(new THREE.TorusGeometry(1.43, 0.055, 12, 120), innerGold);
  innerBand.rotation.x = Math.PI / 2;
  innerBand.position.y = -0.02;
  group.add(innerBand);

  const crown = new THREE.Group();
  crown.position.set(0, 0.18, 1.58);
  group.add(crown);
  const stone = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 0), diamond);
  stone.scale.set(0.82, 1.18, 0.82);
  crown.add(stone);
  const girdle = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.39, 0.12, 8, 1), new THREE.MeshPhysicalMaterial({ color: "#d9e8f5", metalness: 0.22, roughness: 0.14 }));
  girdle.position.y = -0.26;
  crown.add(girdle);
  const prongMaterial = new THREE.MeshPhysicalMaterial({ color: "#e4bf72", metalness: 0.88, roughness: 0.2 });
  for (let n = 0; n < 4; n++) {
    const a = n * Math.PI / 2 + Math.PI / 4;
    const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.52, 10), prongMaterial);
    prong.position.set(Math.cos(a) * 0.34, 0.12, Math.sin(a) * 0.34);
    prong.rotation.z = Math.cos(a) * -0.2;
    prong.rotation.x = Math.sin(a) * 0.2;
    crown.add(prong);
  }

  const grid = new THREE.GridHelper(10, 40, "#56616f", "#293440");
  grid.position.y = -0.55;
  scene.add(grid);
  const axes = new THREE.AxesHelper(2.3);
  axes.position.set(-2.5, -0.48, -2.2);
  scene.add(axes);

  scene.add(new THREE.HemisphereLight("#dce8f8", "#28201a", 1.55));
  const key = new THREE.DirectionalLight("#fff1d1", 3.1);
  key.position.set(4, 6, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight("#a8c8f2", 1.7);
  fill.position.set(-4, 3, -4);
  scene.add(fill);
  const rim = new THREE.PointLight("#f0ca7b", 65, 12);
  rim.position.set(0, 3, 2);
  scene.add(rim);
  return { scene, group };
}

export default function RhinoViewportTrainer3D(props: Props) {
  const hostRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const controlsRefs = useRef<Record<string, OrbitControls | null>>({});
  const cameraRefs = useRef<Record<string, THREE.Camera | null>>({});
  useEffect(() => {
    const renderers: THREE.WebGLRenderer[] = [];
    const observers: ResizeObserver[] = [];
    const cameras: Record<string, THREE.Camera> = {};
    const sceneData = makeJewelryScene();

    for (const view of VIEWS) {
      const host = hostRefs.current[view.id];
      if (!host) continue;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.setSize(host.clientWidth, host.clientHeight);
      renderer.domElement.className = "block h-full w-full";
      host.appendChild(renderer.domElement);
      renderers.push(renderer);

      const aspect = Math.max(1, host.clientWidth / Math.max(1, host.clientHeight));
      let camera: THREE.Camera;
      if (view.id === "Perspective") {
        // Framing inicial más cercano: el modelo debe ocupar el viewport incluso al maximizar.
        const perspective = new THREE.PerspectiveCamera(38, aspect, 0.1, 100);
        perspective.position.set(3.8, 2.65, 4.6);
        perspective.lookAt(0, 0, 0);
        camera = perspective;
        const controls = new OrbitControls(perspective, renderer.domElement);
        controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
        controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enablePan = true;
        controls.screenSpacePanning = true;
        controls.minDistance = 2.1;
        controls.maxDistance = 18;
        controlsRefs.current[view.id] = controls;
      } else {
        const ortho = new THREE.OrthographicCamera(-2.8 * aspect, 2.8 * aspect, 2.8, -2.8, 0.1, 100);
        if (view.id === "Top") ortho.position.set(0, 10, 0.01);
        if (view.id === "Front") ortho.position.set(0, 0.01, 10);
        if (view.id === "Right") ortho.position.set(10, 0.01, 0);
        if (view.id === "Top") ortho.up.set(0, 0, 1);
        ortho.lookAt(0, 0, 0);
        camera = ortho;
        const controls = new OrbitControls(ortho, renderer.domElement);
        controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
        controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
        controls.enableRotate = false;
        controls.enablePan = true;
        controls.enableZoom = true;
        controls.screenSpacePanning = true;
        controlsRefs.current[view.id] = controls;
      }
      cameras[view.id] = camera;
      cameraRefs.current[view.id] = camera;
      const draw = () => {
        if (host.clientWidth > 0 && host.clientHeight > 0) renderer.render(sceneData.scene, camera);
      };
      const controls = controlsRefs.current[view.id];
      controls?.addEventListener("change", draw);
      // Damping solo anima mientras el usuario manipula la cámara; no mantiene 4 render loops permanentes.
      let animationFrame = 0;
      const animateControls = () => {
        animationFrame = 0;
        if (controls?.update()) {
          draw();
          animationFrame = requestAnimationFrame(animateControls);
        }
      };
      const startDamping = () => {
        if (!animationFrame) animationFrame = requestAnimationFrame(animateControls);
      };
      controls?.addEventListener("start", startDamping);
      draw();
      const observer = new ResizeObserver(() => {
        const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
        renderer.setSize(w, h, false);
        if (camera instanceof THREE.PerspectiveCamera) camera.aspect = w / h;
        if (camera instanceof THREE.OrthographicCamera) {
          const halfH = 2.8;
          camera.left = -halfH * (w / h); camera.right = halfH * (w / h);
          camera.top = halfH; camera.bottom = -halfH;
        }
        camera.updateProjectionMatrix();
        draw();
      });
      observer.observe(host);
      observers.push(observer);
      (observer as ResizeObserver & { __cancel?: () => void }).__cancel = () => cancelAnimationFrame(animationFrame);
    }
    return () => {
      observers.forEach(o => { (o as ResizeObserver & { __cancel?: () => void }).__cancel?.(); o.disconnect(); });
      Object.values(controlsRefs.current).forEach(c => c?.dispose());
      controlsRefs.current = {};
      cameraRefs.current = {};
      renderers.forEach(r => { r.dispose(); r.domElement.remove(); });
      sceneData.scene.traverse(obj => {
        if (obj instanceof THREE.Mesh) { obj.geometry.dispose(); const m = obj.material; if (Array.isArray(m)) m.forEach(x => x.dispose()); else m.dispose(); }
      });
    };
  }, [props.maximized]);

  useEffect(() => {
    const camera = cameraRefs.current.Perspective;
    if (camera instanceof THREE.PerspectiveCamera) {
      const base = 5.6;
      camera.position.setLength(base / Math.max(0.5, props.zoom));
      camera.updateProjectionMatrix();
    }
    for (const id of ["Top", "Front", "Right"]) {
      const ortho = cameraRefs.current[id];
      if (ortho instanceof THREE.OrthographicCamera) { ortho.zoom = props.zoom; ortho.updateProjectionMatrix(); }
    }
  }, [props.zoom]);
  const pointerStart = useRef<Record<string, { x: number; y: number; shift: boolean; button: number } | null>>({});
  const view = (item: (typeof VIEWS)[number]) => {
    const isActive = props.activeView === item.id;
    const isMax = props.maximized === item.id;
    return <section key={item.id} className={"group flex min-h-[210px] min-w-0 flex-col overflow-hidden rounded-xl border bg-[#171d25] transition " + (isActive ? "border-[#c9a15c] ring-1 ring-[#c9a15c]/20" : "border-white/10")}>
      <button type="button" onClick={() => props.onActivate(item.id)} onDoubleClick={() => { props.onMaximize(item.id); props.onAction("maximize"); }} className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#242b35] px-3 py-2 text-left">
        <span className="text-[10px] font-bold tracking-[.13em] text-slate-200">{item.title}</span><span className="text-[9px] text-slate-500">{item.subtitle}</span>
      </button>
      <div ref={el => { hostRefs.current[item.id] = el; }} onWheel={(e) => { if (item.id === "Perspective") { props.onZoom(Math.min(2.2, props.zoom + (e.deltaY < 0 ? 0.12 : -0.08))); props.onAction("zoom"); } }} onPointerDown={(e) => { e.preventDefault(); props.onActivate(item.id); pointerStart.current[item.id] = { x: e.clientX, y: e.clientY, shift: e.shiftKey, button: e.button };
          const controls = controlsRefs.current[item.id];
          if (controls && item.id === "Perspective" && e.button === 2) controls.mouseButtons.RIGHT = e.shiftKey ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE; }} onContextMenu={(e) => e.preventDefault()} onPointerUp={(e) => { const start = pointerStart.current[item.id]; pointerStart.current[item.id] = null; if (!start || Math.abs(e.clientX-start.x)+Math.abs(e.clientY-start.y)<5) return; if (item.id === "Top" && start.button === 2) props.onAction("panTop"); else if (item.id === "Perspective" && start.button === 2 && start.shift) props.onAction("panPerspective"); else if (item.id === "Perspective" && start.button === 2) { props.onOrbit(props.orbit + (e.clientX-start.x)*0.45); props.onAction("orbit"); } }} onDoubleClick={() => { props.onMaximize(item.id); props.onAction("maximize"); }} className="relative min-h-0 flex-1 bg-[#10161e]">
        <div className="pointer-events-none absolute bottom-2 left-3 z-10 text-[10px] font-medium uppercase tracking-wider text-slate-500">{item.id === "Perspective" ? "PERSPECTIVE · ACTIVE CAMERA" : item.id.toUpperCase() + " · ORTHOGRAPHIC"}</div>
        {item.id === "Perspective" && <div className="pointer-events-none absolute right-2 top-2 z-10 rounded-md border border-white/10 bg-black/25 px-2 py-1 text-[9px] text-slate-400">OrbitControls · zoom · pan</div>}
      </div>
    </section>;
  };
  return <div className={"grid min-h-0 gap-2 " + (props.maximized ? "h-[min(84vh,calc(100dvh-150px))] min-h-[360px] grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>{VIEWS.filter(v => !props.maximized || v.id === props.maximized).map(view)}</div>;
}
