import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Box, RotateCcw } from "lucide-react";
import { supabasePublic } from "@/integrations/supabase/client";
import { applyAurumMetal, applyAurumGem, metalPresetFromConfig, gemPresetFromConfig } from "@/lib/aurum-material-engine";
import { MATERIALES, GEMAS } from "@/lib/aurum/catalog";
import { createAurumWebGLViewer } from "@/lib/aurum/viewer";

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
  const materialIds: Record<string, string> = { "oro-amarillo": "oro18a_pulido", "oro-blanco": "oro18b_rodinado", "oro-rosa": "oro18r_pulido", plata: "plata925_pulida" };
  const gemIds: Record<string, string> = { diamante: "diamante_natural", esmeralda: "esmeralda_1", rubi: "rubi_natural", zafiro: "zafiro_azul", amatista: "amatista_natural" };
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

        const { scene: aurumScene, camera: aurumCamera, renderer: aurumRenderer, controls: aurumControls } = createAurumWebGLViewer(THREE, host, {
          pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
          maxDistance: 100,
          controlsClass: (await import("three/examples/jsm/controls/OrbitControls.js")).OrbitControls,
        });
        // Reutiliza el núcleo de visor y controles de AURUM RENDER en el catálogo público.
        // Usa las referencias locales no nulas devueltas por el constructor; las variables
        // opcionales externas se reservan para resize, render loop y cleanup.
        scene = aurumScene; camera = aurumCamera; renderer = aurumRenderer; controls = aurumControls;
        aurumScene.background = new THREE.Color("#f2eee7");
        aurumRenderer.setSize(host.clientWidth, host.clientHeight);
        aurumRenderer.toneMappingExposure = 0.82;
        if (aurumControls) { aurumControls.enableDamping = true; aurumControls.dampingFactor = 0.08; aurumControls.zoomSpeed = 0.15; aurumControls.rotateSpeed = 2; aurumControls.enablePan = false; }
        host.replaceChildren(aurumRenderer.domElement);
        Object.assign(aurumRenderer.domElement.style, { width: "100%", height: "100%", display: "block", touchAction: "none" });
        aurumScene.add(new THREE.HemisphereLight(0xffffff, 0x8c8173, 2.1));
        const key = new THREE.DirectionalLight(0xffffff, 3.2); key.position.set(4, 6, 7); aurumScene.add(key);
        const rim = new THREE.DirectionalLight(0xffffff, 2.2); rim.position.set(-5, 3, -4); aurumScene.add(rim);
        let meshCount = 0;
        model.traverse((object: any) => {
          // Respetar la visibilidad original del 3DM: forzar todas las capas visibles
          // expone guías y geometría auxiliar que distorsionan el encuadre.
          if (!object.isMesh || !object.geometry) return;
          if (!object.visible) return;
          meshCount++;
          const original = Array.isArray(object.material) ? object.material : [object.material];
          object.material = original.map((material: any) => {
            if (esGema(object)) {
              const target = material?.isMaterial ? material.clone() : new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide });
              const preset = GEMAS.find((item) => item.id === gemIds[gemaId]) ?? GEMAS[0];
              applyAurumGem(target, gemPresetFromConfig(preset), 0.7);
              return target;
            }
            if (esMetal(object)) {
              const target = material?.isMaterial ? material.clone() : new THREE.MeshStandardMaterial({ side: THREE.DoubleSide });
              const preset = MATERIALES.find((item) => item.id === materialIds[metalId]) ?? MATERIALES[0];
              applyAurumMetal(target, metalPresetFromConfig(preset));
              return target;
            }
            return material?.isMaterial ? material.clone() : new THREE.MeshStandardMaterial({ color: 0xb7b0a5, metalness: 0.25, roughness: 0.34, side: THREE.DoubleSide });
          });
        });
        if (meshCount === 0) throw new Error("El archivo 3DM no contiene mallas visibles para el visor 3D. Revisa las capas y la geometría del archivo.");
        model.updateMatrixWorld(true);
        // Encadrar solo las mallas visibles; las curvas y guías CAD no deben alejar la cámara.
        const bounds = new THREE.Box3();
        model.traverse((object: any) => {
          if (!object.isMesh || !object.geometry || !object.visible) return;
          bounds.expandByObject(object);
        });
        if (bounds.isEmpty()) throw new Error("No pudimos calcular el tamaño de las mallas visibles de la joya.");
        const center = bounds.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.updateMatrixWorld(true);
        const centeredBounds = new THREE.Box3().setFromObject(model);
        const sphere = centeredBounds.getBoundingSphere(new THREE.Sphere());
        const radius = Math.max(sphere.radius, 0.001);
        aurumScene.add(model);
        aurumCamera.fov = 35;
        const distance = (radius / Math.sin(THREE.MathUtils.degToRad(aurumCamera.fov / 2))) * 1.25;
        aurumCamera.position.copy(new THREE.Vector3(1, 0.65, 1).normalize().multiplyScalar(distance));
        aurumCamera.near = Math.max(radius / 100, 0.001);
        aurumCamera.far = Math.max(distance + radius * 20, 100);
        aurumCamera.lookAt(0, 0, 0);
        aurumCamera.updateProjectionMatrix();
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
        controls = new OrbitControls(aurumCamera, aurumRenderer.domElement);
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
    const metalPreset = MATERIALES.find((item) => item.id === materialIds[metalId]) ?? MATERIALES[0];
    const gemPreset = GEMAS.find((item) => item.id === gemIds[gemaId]) ?? GEMAS[0];
    model.traverse((object: any) => {
      if (!object.isMesh) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (esMetal(object)) materials.forEach((material: any) => applyAurumMetal(material, metalPresetFromConfig(metalPreset)));
      if (esGema(object)) materials.forEach((material: any) => applyAurumGem(material, gemPresetFromConfig(gemPreset), 0.7));
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
