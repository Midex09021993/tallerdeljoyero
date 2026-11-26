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
  scene.fog = new THREE.Fog("#10161e", 16, 30);
  const group = new THREE.Group();
  scene.add(group);

  const gold = new THREE.MeshPhysicalMaterial({
    color: "#d9ad58", metalness: 0.92, roughness: 0.2,
    clearcoat: 0.72, clearcoatRoughness: 0.12,
  });
  const warmGold = new THREE.MeshPhysicalMaterial({
    color: "#f3d58c", metalness: 0.9, roughness: 0.23,
    clearcoat: 0.65, clearcoatRoughness: 0.15,
  });
  const diamondMaterials = [
    new THREE.MeshPhysicalMaterial({ color: "#f5fbff", metalness: 0.02, roughness: 0.07, transmission: 0.12, thickness: 0.8, ior: 2.35, clearcoat: 1 }),
    new THREE.MeshPhysicalMaterial({ color: "#b8d9f3", metalness: 0.08, roughness: 0.12, clearcoat: 1 }),
    new THREE.MeshPhysicalMaterial({ color: "#dcecff", metalness: 0.02, roughness: 0.08, clearcoat: 1 }),
  ];

  // An elegant tapered shank: slightly slimmer at the shoulders and fuller at the base.
  const ringRadius = 1.48;
  const radialSegments = 144;
  const tubeSegments = 20;
  const shankGeometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= radialSegments; i++) {
    const t = (i / radialSegments) * Math.PI * 2;
    const x = Math.cos(t) * ringRadius;
    const z = Math.sin(t) * ringRadius;
    // Head/shoulder zone is at +Z. Taper toward the setting, keep the lower shank comfortable.
    const shoulder = Math.pow(Math.max(0, Math.sin(t)), 5);
    const tubeR = 0.19 - shoulder * 0.045;
    for (let j = 0; j <= tubeSegments; j++) {
      const a = (j / tubeSegments) * Math.PI * 2;
      const radial = Math.cos(a);
      const vertical = Math.sin(a);
      vertices.push(x + radial * tubeR * Math.cos(t), vertical * tubeR, z + radial * tubeR * Math.sin(t));
      normals.push(radial * Math.cos(t), vertical, radial * Math.sin(t));
    }
  }
  for (let i = 0; i < radialSegments; i++) {
    for (let j = 0; j < tubeSegments; j++) {
      const a = i * (tubeSegments + 1) + j;
      const b = a + tubeSegments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  shankGeometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  shankGeometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  shankGeometry.setIndex(indices);
  group.add(new THREE.Mesh(shankGeometry, gold));

  // Fine inner comfort edge, not a second oversized ring.
  const comfortEdge = new THREE.Mesh(new THREE.TorusGeometry(ringRadius, 0.035, 10, 144), warmGold);
  comfortEdge.rotation.x = Math.PI / 2;
  comfortEdge.position.y = -0.005;
  group.add(comfortEdge);

  // A raised basket with two delicate support rails, aligned with the ring's shoulders.
  const setting = new THREE.Group();
  setting.position.set(0, 0.12, ringRadius - 0.02);
  group.add(setting);
  const basketMaterial = new THREE.MeshStandardMaterial({ color: "#b98535", metalness: 0.82, roughness: 0.28 });
  const basketRail = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 10, 48), basketMaterial);
  basketRail.rotation.x = Math.PI / 2;
  basketRail.position.y = -0.13;
  setting.add(basketRail);
  const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.16, 12), basketMaterial);
  bridge.position.y = -0.24;
  setting.add(bridge);

  // Round brilliant: table, crown, girdle, pavilion and culet are separate facet rings.
  function createBrilliantCut() {
    const geo = new THREE.BufferGeometry();
    const rings = [
      { y: 0.36, r: 0.26, count: 1 },   // table center
      { y: 0.31, r: 0.36, count: 16 },  // table edge
      { y: 0.13, r: 0.43, count: 16 },  // crown
      { y: 0.05, r: 0.43, count: 16 },  // girdle
      { y: -0.20, r: 0.30, count: 16 }, // upper pavilion
      { y: -0.43, r: 0.12, count: 16 }, // lower pavilion
      { y: -0.51, r: 0.025, count: 1 }, // culet
    ];
    const v: number[] = [];
    const idx: number[] = [];
    // Table is a 16-sided flat polygon, with center vertex for clean triangulation.
    v.push(0, rings[0].y, 0);
    for (let r = 1; r <= 5; r++) {
      const ring = rings[r];
      for (let k = 0; k < ring.count; k++) {
        const angle = (k / ring.count) * Math.PI * 2 + Math.PI / 16;
        v.push(Math.cos(angle) * ring.r, ring.y, Math.sin(angle) * ring.r);
      }
    }
    const tableStart = 1;
    for (let k = 0; k < 16; k++) idx.push(0, tableStart + k, tableStart + ((k + 1) % 16));
    for (let r = 1; r < 5; r++) {
      const aStart = 1 + (r - 1) * 16;
      const bStart = aStart + 16;
      for (let k = 0; k < 16; k++) {
        const a = aStart + k, aNext = aStart + ((k + 1) % 16);
        const b = bStart + k, bNext = bStart + ((k + 1) % 16);
        if (r === 1) {
          idx.push(a, b, aNext, aNext, b, bNext);
        } else {
          idx.push(a, b, aNext, aNext, b, bNext);
        }
      }
    }
    const pavilionStart = 1 + 4 * 16;
    const culetIndex = v.length / 3;
    v.push(0, rings[6].y, 0);
    for (let k = 0; k < 16; k++) {
      const a = pavilionStart + k, b = pavilionStart + ((k + 1) % 16);
      idx.push(a, culetIndex, b);
    }
    geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }
  const stone = new THREE.Mesh(createBrilliantCut(), diamondMaterials);
  stone.position.y = 0.16;
  setting.add(stone);

  // Four tapered claws sit around the girdle and finish just above the crown.
  const clawMaterial = warmGold;
  for (let n = 0; n < 4; n++) {
    const angle = Math.PI / 4 + n * Math.PI / 2;
    const x = Math.cos(angle) * 0.35;
    const z = Math.sin(angle) * 0.35;
    const claw = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.20, 4, 8), clawMaterial);
    claw.position.set(x, 0.29, z);
    claw.rotation.z = -x * 0.3;
    claw.rotation.x = z * 0.3;
    setting.add(claw);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 8), clawMaterial);
    tip.position.set(x * 0.88, 0.39, z * 0.88);
    setting.add(tip);
  }

  // Grid and axes remain visual aids, but sit lower and farther away from the piece.
  const grid = new THREE.GridHelper(12, 48, "#56616f", "#293440");
  grid.position.y = -0.58;
  scene.add(grid);
  const axes = new THREE.AxesHelper(2.3);
  axes.position.set(-2.5, -0.52, -2.2);
  scene.add(axes);

  scene.add(new THREE.HemisphereLight("#e5eefb", "#30251a", 1.35));
  const key = new THREE.DirectionalLight("#fff2d5", 3.4);
  key.position.set(4, 6, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight("#b6d4f6", 1.35);
  fill.position.set(-4, 3, -4);
  scene.add(fill);
  const rim = new THREE.PointLight("#f5d18a", 38, 14);
  rim.position.set(0, 3.5, 2.5);
  scene.add(rim);
  return { scene, group };
}
export default function RhinoViewportTrainer3D(props: Props) {
  const hostRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const controlsRefs = useRef<Record<string, OrbitControls | null>>({});
  const cameraRefs = useRef<Record<string, THREE.Camera | null>>({});
  const viewStateRefs = useRef<Record<string, { position: [number, number, number]; target: [number, number, number]; zoom?: number }>>({});
  const onZoomRef = useRef(props.onZoom);
  onZoomRef.current = props.onZoom;
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
        controls.dampingFactor = 0.075;
        controls.enablePan = true;
        controls.enableZoom = true;
        controls.zoomToCursor = true;
        controls.screenSpacePanning = true;
        controls.minDistance = 1.25;
        controls.maxDistance = 24;
        controls.target.set(0, 0, 0);
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
        controls.enableRotate = true;
        controls.enablePan = true;
        controls.enableZoom = true;
        controls.zoomToCursor = true;
        controls.screenSpacePanning = true;
        controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
        controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
        controlsRefs.current[view.id] = controls;
      }
      const savedView = viewStateRefs.current[view.id];
      if (savedView) {
        camera.position.set(...savedView.position);
        if (camera instanceof THREE.OrthographicCamera && savedView.zoom) camera.zoom = savedView.zoom;
        const savedTarget = new THREE.Vector3(...savedView.target);
        camera.lookAt(savedTarget);
        controlsRefs.current[view.id]?.target.copy(savedTarget);
        controlsRefs.current[view.id]?.update();
      }
      cameras[view.id] = camera;
      cameraRefs.current[view.id] = camera;
      const draw = () => {
        if (host.clientWidth > 0 && host.clientHeight > 0) renderer.render(sceneData.scene, camera);
      };
      const controls = controlsRefs.current[view.id];
      const onControlsChange = () => {
        draw();
        if (camera instanceof THREE.PerspectiveCamera && view.id === "Perspective") {
          const distance = camera.position.distanceTo(controls?.target ?? new THREE.Vector3());
          onZoomRef.current(Math.max(0.35, Math.min(2.2, 5.6 / Math.max(0.001, distance))));
        } else if (camera instanceof THREE.OrthographicCamera) {
          onZoomRef.current(Math.max(0.35, Math.min(2.2, camera.zoom)));
        }
      };
      controls?.addEventListener("change", onControlsChange);
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
        if (camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera) camera.updateProjectionMatrix();
        draw();
      });
      observer.observe(host);
      observers.push(observer);
      (observer as ResizeObserver & { __cancel?: () => void }).__cancel = () => cancelAnimationFrame(animationFrame);
    }
    return () => {
      Object.entries(cameraRefs.current).forEach(([id, camera]) => {
        const controls = controlsRefs.current[id];
        if (camera) viewStateRefs.current[id] = {
          position: [camera.position.x, camera.position.y, camera.position.z],
          target: controls ? [controls.target.x, controls.target.y, controls.target.z] : [0, 0, 0],
          zoom: camera instanceof THREE.OrthographicCamera ? camera.zoom : undefined,
        };
      });
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
    const camera = cameraRefs.current["Perspective"];
    if (camera instanceof THREE.PerspectiveCamera) {
      const controls = controlsRefs.current["Perspective"];
      const target = controls?.target ?? new THREE.Vector3(0, 0, 0);
      const direction = camera.position.clone().sub(target).normalize();
      camera.position.copy(target).add(direction.multiplyScalar(5.6 / Math.max(0.35, props.zoom)));
      camera.updateProjectionMatrix();
      controls?.update();
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
      <div ref={el => { hostRefs.current[item.id] = el; }} onPointerDown={(e) => { props.onActivate(item.id); pointerStart.current[item.id] = { x: e.clientX, y: e.clientY, shift: e.shiftKey, button: e.button };
          const controls = controlsRefs.current[item.id];
          if (controls && e.button === 2) {
            if (item.id === "Perspective") controls.mouseButtons.RIGHT = e.shiftKey ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
            else {
              const rotateParallel = e.ctrlKey && e.shiftKey;
              controls.mouseButtons.RIGHT = rotateParallel ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN;
              controls.enableRotate = rotateParallel;
            }
          } }} onContextMenu={(e) => e.preventDefault()} onPointerUp={(e) => { const start = pointerStart.current[item.id]; pointerStart.current[item.id] = null;
          const controls = controlsRefs.current[item.id];
          if (controls && item.id !== "Perspective") { controls.mouseButtons.RIGHT = THREE.MOUSE.PAN; controls.enableRotate = false; }
          if (!start || Math.abs(e.clientX-start.x)+Math.abs(e.clientY-start.y)<5) return;
          if (item.id === "Top" && start.button === 2 && !start.shift) props.onAction("panTop");
          else if (item.id === "Perspective" && start.button === 2 && start.shift) props.onAction("panPerspective");
          else if (item.id === "Perspective" && start.button === 2) props.onAction("orbit");
          else if (item.id !== "Perspective" && start.button === 2 && start.shift && e.ctrlKey) props.onAction("orbit"); }} onDoubleClick={() => { props.onMaximize(item.id); props.onAction("maximize"); }} className="relative min-h-0 flex-1 bg-[#10161e]" style={{ touchAction: "none" }}>
        <div className="pointer-events-none absolute bottom-2 left-3 z-10 text-[10px] font-medium uppercase tracking-wider text-slate-500">{item.id === "Perspective" ? "PERSPECTIVE · ACTIVE CAMERA" : item.id.toUpperCase() + " · ORTHOGRAPHIC"}</div>
        {item.id === "Perspective" && <div className="pointer-events-none absolute right-2 top-2 z-10 rounded-md border border-white/10 bg-black/25 px-2 py-1 text-[9px] text-slate-400">Rhino gestures · RMB orbit · Shift+RMB pan · wheel zoom</div>}
      </div>
    </section>;
  };
  return <div className={"grid min-h-0 gap-2 " + (props.maximized ? "h-[min(84vh,calc(100dvh-150px))] min-h-[360px] grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>{VIEWS.filter(v => !props.maximized || v.id === props.maximized).map(view)}</div>;
}
