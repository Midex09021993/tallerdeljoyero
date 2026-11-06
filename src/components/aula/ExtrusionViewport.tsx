import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type ProfileMode = "closed" | "open" | "nonplanar";
type Point2 = { x: number; y: number };

const initialPoints: Point2[] = [
  { x: -2.1, y: -1.25 },
  { x: -2.1, y: 1.25 },
  { x: 2.1, y: 1.25 },
  { x: 2.1, y: -1.25 },
];

export default function ExtrusionViewport({ profile, height }: { profile: ProfileMode; height: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<Point2[]>(initialPoints);
  const [selected, setSelected] = useState(0);
  const [showSource, setShowSource] = useState(true);
  const [showResult, setShowResult] = useState(true);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0d141b");
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.up.set(0, 0, 1);
    camera.position.set(7.5, -8.5, 7);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.className = "block h-full w-full touch-none";
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xdce8f5, 0x26313d, 2.1));
    const key = new THREE.DirectionalLight(0xffe2ad, 3.2);
    key.position.set(-4, -5, 9);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9bbbd8, 1.1);
    fill.position.set(5, 4, 3);
    scene.add(fill);

    const grid = new THREE.GridHelper(14, 28, 0x526170, 0x26323e);
    grid.rotation.x = Math.PI / 2;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.34;
    scene.add(grid);
    const axes = new THREE.AxesHelper(2.3);
    axes.position.set(-3.3, -2.2, 0.02);
    scene.add(axes);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.target.set(0, 0, Math.max(0.5, height / 20));
    controls.minDistance = 4;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI * 0.49;

    const pointHandles: THREE.Mesh[] = [];
    const pointGeometry = new THREE.SphereGeometry(0.085, 18, 12);
    const pointMaterial = new THREE.MeshStandardMaterial({ color: 0xf0d69f, emissive: 0x4b3517, roughness: 0.35, metalness: 0.15 });
    const sourceMaterial = new THREE.LineBasicMaterial({ color: 0xf2d69b });
    const movedMaterial = new THREE.LineDashedMaterial({ color: 0x9fb2c5, dashSize: 0.12, gapSize: 0.08 });
    const surfaceMaterial = new THREE.MeshStandardMaterial({ color: 0xb88f50, metalness: 0.28, roughness: 0.42, side: THREE.DoubleSide, transparent: profile !== "closed", opacity: profile === "closed" ? 1 : 0.78 });
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xf0d69f });
    const resultGroup = new THREE.Group();
    const sourceGroup = new THREE.Group();
    scene.add(resultGroup, sourceGroup);

    const heightUnits = height / 10;
    const sourcePoints = points.map((p, i) => new THREE.Vector3(p.x, p.y, profile === "nonplanar" ? (i % 2 === 0 ? 0.45 : -0.35) : 0));
    const isClosed = profile !== "open";
    const curvePoints = [...sourcePoints];
    if (isClosed && curvePoints.length > 2) curvePoints.push(curvePoints[0].clone());
    if (showSource && curvePoints.length > 1) {
      const sourceLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curvePoints), sourceMaterial);
      sourceGroup.add(sourceLine);
      sourcePoints.forEach((p, index) => {
        const handle = new THREE.Mesh(pointGeometry, pointMaterial.clone());
        handle.position.copy(p);
        handle.userData.pointIndex = index;
        pointHandles.push(handle);
        sourceGroup.add(handle);
      });
    }

    if (showResult && sourcePoints.length >= 2) {
      if (profile === "closed" && sourcePoints.length >= 3) {
        const shape = new THREE.Shape();
        shape.moveTo(sourcePoints[0].x, sourcePoints[0].y);
        sourcePoints.slice(1).forEach(p => shape.lineTo(p.x, p.y));
        shape.closePath();
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: heightUnits, bevelEnabled: false, curveSegments: 1, steps: 1 });
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(geometry, surfaceMaterial);
        mesh.position.z = 0;
        resultGroup.add(mesh);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 22), edgeMaterial);
        resultGroup.add(edges);
      } else {
        const vertices: number[] = [];
        const indices: number[] = [];
        const count = sourcePoints.length;
        sourcePoints.forEach((p, i) => {
          const q = sourcePoints[(i + 1) % count];
          if (!q || (!isClosed && i === count - 1)) return;
          const base = vertices.length / 3;
          vertices.push(p.x, p.y, p.z, q.x, q.y, q.z, q.x, q.y, q.z + heightUnits, p.x, p.y, p.z + heightUnits);
          indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
        });
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        resultGroup.add(new THREE.Mesh(geometry, surfaceMaterial));
        const translated = sourcePoints.map(p => new THREE.Vector3(p.x, p.y, p.z + heightUnits));
        const baseLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curvePoints), edgeMaterial);
        const topLinePoints = [...translated];
        if (isClosed) topLinePoints.push(topLinePoints[0].clone());
        const topLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(topLinePoints), edgeMaterial);
        resultGroup.add(baseLine, topLine);
        sourcePoints.forEach(p => {
          const connector = new THREE.Line(new THREE.BufferGeometry().setFromPoints([p, new THREE.Vector3(p.x, p.y, p.z + heightUnits)]), edgeMaterial);
          resultGroup.add(connector);
        });
        const moved = new THREE.Line(new THREE.BufferGeometry().setFromPoints(topLinePoints), movedMaterial);
        moved.computeLineDistances();
        resultGroup.add(moved);
      }
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const dragPoint = new THREE.Vector3();
    let activeHandle: THREE.Mesh | null = null;
    const onPointerDown = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(pointHandles, false)[0];
      if (!hit) return;
      activeHandle = hit.object as THREE.Mesh;
      controls.enabled = false;
      renderer.domElement.setPointerCapture(event.pointerId);
      setSelected(Number(activeHandle.userData.pointIndex));
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!activeHandle) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) activeHandle.position.set(dragPoint.x, dragPoint.y, profile === "nonplanar" ? activeHandle.position.z : 0);
    };
    const onPointerUp = () => {
      if (!activeHandle) return;
      const index = Number(activeHandle.userData.pointIndex);
      const next = points.map((p, i) => i === index ? { x: Number(activeHandle!.position.x.toFixed(2)), y: Number(activeHandle!.position.y.toFixed(2)) } : p);
      activeHandle = null;
      controls.enabled = true;
      setPoints(next);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const heightPx = Math.max(1, host.clientHeight);
      camera.aspect = width / heightPx;
      camera.updateProjectionMatrix();
      renderer.setSize(width, heightPx, false);
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
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      controls.dispose();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [profile, height, points, showSource, showResult]);

  const addPoint = () => {
    if (points.length >= 8) return;
    const last = points[points.length - 1];
    setPoints([...points, { x: Number((last.x + 0.8).toFixed(2)), y: Number((last.y - 0.35).toFixed(2)) }]);
    setSelected(points.length);
  };
  const removePoint = () => {
    if (points.length <= (profile === "closed" ? 3 : 2)) return;
    setPoints(points.filter((_, i) => i !== selected));
    setSelected(Math.max(0, selected - 1));
  };
  const updatePoint = (axis: "x" | "y", value: number) => {
    setPoints(points.map((p, i) => i === selected ? { ...p, [axis]: value } : p));
  };

  return <div className="relative z-10 flex h-full min-h-[360px] w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0d141b]/80">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#151e27]/95 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-300">
        <span className="font-semibold uppercase tracking-wider text-[#e6c887]">Curva de entrada</span>
        <span className="text-slate-500">{points.length} puntos · {profile === "open" ? "abierta" : profile === "nonplanar" ? "cerrada · no plana" : "cerrada"}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setShowSource(v => !v)} className={`rounded-md border px-2 py-1.5 text-[10px] ${showSource ? "border-[#d2ad68]/50 bg-[#d2ad68]/10 text-[#f0d69f]" : "border-white/10 text-slate-400"}`}>{showSource ? "Ocultar curva" : "Mostrar curva"}</button>
        <button type="button" onClick={() => setShowResult(v => !v)} className={`rounded-md border px-2 py-1.5 text-[10px] ${showResult ? "border-[#d2ad68]/50 bg-[#d2ad68]/10 text-[#f0d69f]" : "border-white/10 text-slate-400"}`}>{showResult ? "Ocultar resultado" : "Mostrar resultado"}</button>
        <button type="button" onClick={addPoint} disabled={points.length >= 8} className="rounded-md border border-white/10 px-2 py-1.5 text-[10px] text-slate-300 disabled:opacity-40">+ Punto</button>
        <button type="button" onClick={removePoint} disabled={points.length <= (profile === "closed" ? 3 : 2)} className="rounded-md border border-white/10 px-2 py-1.5 text-[10px] text-slate-300 disabled:opacity-40">− Punto</button>
        <button type="button" onClick={() => { setPoints(initialPoints); setSelected(0); }} className="rounded-md border border-white/10 px-2 py-1.5 text-[10px] text-slate-300">Restablecer</button>
      </div>
    </div>
    <div className="relative min-h-0 flex-1">
      <div ref={hostRef} className="absolute inset-0"/>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-white/10 bg-[#101820]/85 px-2.5 py-1.5 text-[9px] text-slate-400">Arrastra los nodos para editar · arrastra el fondo para orbitar · rueda para zoom</div>
      <div className="absolute right-3 top-3 rounded-md border border-white/10 bg-[#101820]/90 px-2.5 py-1.5 text-[9px] font-semibold text-[#e6c887]">{height.toFixed(1)} mm · {profile === "closed" ? "Sólido" : profile === "open" ? "Superficie abierta" : "Superficie sin tapa"}</div>
    </div>
    <div className="flex flex-wrap items-center gap-3 border-t border-white/10 bg-[#151e27]/95 px-3 py-2">
      <span className="text-[10px] font-semibold text-slate-300">Punto {selected + 1}</span>
      <label className="flex items-center gap-1.5 text-[10px] text-slate-400">X <input type="number" step="0.1" value={points[selected]?.x ?? 0} onChange={e => updatePoint("x", Number(e.target.value))} className="w-16 rounded border border-white/10 bg-[#0d141b] px-2 py-1 text-right text-slate-100"/></label>
      <label className="flex items-center gap-1.5 text-[10px] text-slate-400">Y <input type="number" step="0.1" value={points[selected]?.y ?? 0} onChange={e => updatePoint("y", Number(e.target.value))} className="w-16 rounded border border-white/10 bg-[#0d141b] px-2 py-1 text-right text-slate-100"/></label>
      <span className="ml-auto text-[9px] text-slate-500">Geometría 3D · Three.js</span>
    </div>
  </div>;
}
