import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Box, RotateCcw } from "lucide-react";
import { supabasePublic } from "@/integrations/supabase/client";

type Props = { slug: string; producto: string };
const metales = [
  { id: "oro-amarillo", label: "Oro amarillo", color: 0xd5a63d, metalness: 0.92, roughness: 0.2 },
  { id: "oro-blanco", label: "Oro blanco", color: 0xd7d9dc, metalness: 0.95, roughness: 0.18 },
  { id: "oro-rosa", label: "Oro rosa", color: 0xc98576, metalness: 0.9, roughness: 0.22 },
  { id: "plata", label: "Plata", color: 0xe0e2e4, metalness: 0.9, roughness: 0.2 },
] as const;
const gemas = [
  { id: "diamante", label: "Diamante", color: 0xeaf4ff },
  { id: "esmeralda", label: "Esmeralda", color: 0x138b54 },
  { id: "rubi", label: "Rubí", color: 0xb91c3b },
  { id: "zafiro", label: "Zafiro", color: 0x2858bd },
  { id: "amatista", label: "Amatista", color: 0x8952c8 },
] as const;

function layerText(object: THREE.Object3D) {
  const data = object.userData ?? {}, attrs = data["attributes"] ?? {};
  return [object.name, attrs["layerName"], attrs["LayerName"], data["layerName"], data["aurumRhino"]?.capa]
    .map((value) => String(value ?? "").toLowerCase()).join(" ");
}
function esGema(object: THREE.Object3D) {
  return /(gem|gema|piedra|diamond|diamante|zafiro|sapphire|rubi|rubí|ruby|esmeralda|emerald|moissanita|citrino|amatista|topacio)/.test(layerText(object));
}
function esMetal(object: THREE.Object3D) {
  return /(metal|oro|gold|plata|silver|platino|platinum)/.test(layerText(object));
}

export function PublicJewelConfigurator({ slug, producto }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const [metalId, setMetalId] = useState<string>("oro-amarillo");
  const [gemaId, setGemaId] = useState<string>("diamante");
  const [status, setStatus] = useState("Preparando modelo 3D…");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false, frame = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let controls: any = null, model: THREE.Object3D | null = null, observer: ResizeObserver | null = null;
    const host = hostRef.current;
    if (!host) return;
    const start = async () => {
      try {
        const { data, error } = await supabasePublic.functions.invoke("catalogo-modelo-3d-publico", { body: { slug, producto } });
        if (error || !data?.ok || typeof data.url !== "string") throw new Error(data?.error || error?.message || "No hay modelo 3D disponible.");
        const response = await fetch(data.url);
        if (!response.ok) throw new Error("No se pudo cargar el modelo 3D.");
        const buffer = await response.arrayBuffer();
        if (disposed) return;
        const { Rhino3dmLoader } = await import("three/examples/jsm/loaders/3DMLoader.js");
        const loader = new Rhino3dmLoader();
        loader.setLibraryPath("https://cdn.jsdelivr.net/npm/rhino3dm@8.32.2/");
        loader.setWorkerLimit(2);
        model = await new Promise<THREE.Object3D>((resolve, reject) => loader.parse(buffer, resolve, reject));
        if (disposed) return;

        scene = new THREE.Scene(); scene.background = new THREE.Color("#f2eee7");
        camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100000);
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "low-power" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setSize(host.clientWidth, host.clientHeight);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1;
        host.replaceChildren(renderer.domElement);
        Object.assign(renderer.domElement.style, { width: "100%", height: "100%", display: "block", touchAction: "none" });
        scene.add(new THREE.HemisphereLight(0xffffff, 0x8c8173, 2.1));
        const key = new THREE.DirectionalLight(0xffffff, 3.2); key.position.set(4, 6, 7); scene.add(key);
        const rim = new THREE.DirectionalLight(0xffffff, 2.2); rim.position.set(-5, 3, -4); scene.add(rim);
        let meshCount = 0;
        model.traverse((object: any) => {
          // Rhino files can preserve hidden layer/object flags; the public preview must show the published jewel.
          object.visible = true;
          if (!object.isMesh || !object.geometry) return;
          meshCount++;
          const original = Array.isArray(object.material) ? object.material : [object.material];
          object.material = original.map((material: any) => esGema(object)
            ? new THREE.MeshPhysicalMaterial({ color: 0xeaf4ff, metalness: 0, roughness: 0.08, transmission: 0.18, thickness: 0.7, ior: 2, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide })
            : esMetal(object)
              ? new THREE.MeshStandardMaterial({ color: 0xd5a63d, metalness: 0.78, roughness: 0.24, side: THREE.DoubleSide })
              : material?.isMaterial ? material.clone() : new THREE.MeshStandardMaterial({ color: 0xb7b0a5, metalness: 0.25, roughness: 0.34, side: THREE.DoubleSide }));
        });
        if (meshCount === 0) throw new Error("El archivo 3DM no contiene geometría visible compatible para el visor.");
        model.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(model);
        if (bounds.isEmpty()) throw new Error("No pudimos calcular el tamaño de la joya dentro del archivo 3DM.");
        const center = bounds.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.updateMatrixWorld(true);
        const centeredBounds = new THREE.Box3().setFromObject(model);
        const sphere = centeredBounds.getBoundingSphere(new THREE.Sphere());
        const radius = Math.max(sphere.radius, 0.001);
        scene.add(model);
        camera.fov = 35;
        const distance = (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.25;
        camera.position.copy(new THREE.Vector3(1, 0.65, 1).normalize().multiplyScalar(distance));
        camera.near = Math.max(radius / 100, 0.001);
        camera.far = Math.max(distance + radius * 20, 100);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; controls.dampingFactor = 0.06;
        controls.minDistance = radius * 0.6; controls.maxDistance = radius * 12; controls.target.set(0, 0, 0); controls.update();
        modelRef.current = model;
        observer = new ResizeObserver(() => {
          if (!host || !camera || !renderer) return;
          const width = Math.max(host.clientWidth, 1), height = Math.max(host.clientHeight, 1);
          camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height);
        });
        observer.observe(host);
        const render = () => { if (disposed || !renderer || !scene || !camera) return; frame = requestAnimationFrame(render); controls?.update(); renderer.render(scene, camera); };
        render(); setReady(true); setStatus("");
      } catch (cause) {
        if (!disposed) setStatus(cause instanceof Error ? cause.message : "No se pudo cargar el modelo 3D.");
      }
    };
    void start();
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer?.disconnect(); controls?.dispose?.();
      if (model) model.traverse((object: any) => {
        object.geometry?.dispose?.();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material: any) => material?.dispose?.());
      });
      renderer?.dispose(); renderer?.domElement.remove(); modelRef.current = null;
    };
  }, [slug, producto]);

  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;
    const metal = metales.find((item) => item.id === metalId) ?? metales[0];
    const gem = gemas.find((item) => item.id === gemaId) ?? gemas[0];
    model.traverse((object: any) => {
      if (!object.isMesh) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (esMetal(object)) materials.forEach((material: any) => {
        if (material?.color) material.color.setHex(metal.color);
        if ("metalness" in material) material.metalness = metal.metalness;
        if ("roughness" in material) material.roughness = metal.roughness;
        material.needsUpdate = true;
      });
      if (esGema(object)) materials.forEach((material: any) => { if (material?.color) material.color.setHex(gem.color); material.needsUpdate = true; });
    });
  }, [metalId, gemaId, ready]);

  return (
    <section className="mt-5 overflow-hidden rounded-[28px] border border-[#1f1b1818] bg-white/80 shadow-[0_20px_60px_-45px_rgba(31,27,24,.45)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1f1b1810] px-5 py-4">
        <div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#8a6b36]">Experiencia interactiva</p><h2 className="mt-1 font-display text-2xl">Configura tu joya en 3D</h2></div>
        <button type="button" onClick={() => { setMetalId("oro-amarillo"); setGemaId("diamante"); }} className="inline-flex items-center gap-2 rounded-full border border-[#1f1b1820] px-3 py-2 text-xs font-semibold"><RotateCcw className="size-3.5" /> Restablecer</button>
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="relative min-h-[320px] bg-[#f2eee7] sm:min-h-[440px]"><div ref={hostRef} className="absolute inset-0" />{!ready && <div className="absolute inset-0 grid place-items-center bg-[#f2eee7]/90 p-6 text-center"><div><Box className="mx-auto size-8 text-[#8a6b36]" /><p className="mt-3 max-w-sm text-sm text-[#625b54]">{status}</p></div></div>}{ready && <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/80 px-3 py-1.5 text-[10px] text-[#625b54]">Arrastra para girar · Rueda para acercar</span>}</div>
        <aside className="border-t border-[#1f1b1810] p-4 lg:border-l lg:border-t-0">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8a6b36]">Metal</p>
          <div className="mt-2 grid grid-cols-2 gap-2">{metales.map((metal) => <button key={metal.id} type="button" onClick={() => setMetalId(metal.id)} className={"rounded-xl border p-2 text-left text-[11px] " + (metalId === metal.id ? "border-[#8a6b36] bg-[#f5eee0]" : "border-[#1f1b1818]")}><span className="mb-1 block size-5 rounded-full border border-black/10" style={{ backgroundColor: "#" + metal.color.toString(16).padStart(6,"0") }} />{metal.label}</button>)}</div>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-[#8a6b36]">Piedra</p>
          <div className="mt-2 space-y-1">{gemas.map((gem) => <button key={gem.id} type="button" onClick={() => setGemaId(gem.id)} className={"flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-[11px] " + (gemaId === gem.id ? "border-[#8a6b36] bg-[#f5eee0]" : "border-[#1f1b1818]")}><span className="size-3.5 rounded-full border border-black/10" style={{ backgroundColor: "#" + gem.color.toString(16).padStart(6,"0") }} />{gem.label}</button>)}</div>
          <p className="mt-4 text-[10px] leading-4 text-[#746b62]">Vista orientativa; el acabado y el color final pueden variar según iluminación y material real.</p>
        </aside>
      </div>
    </section>
  );
}
