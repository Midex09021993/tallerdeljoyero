import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { createAurumWebGLViewer, startAurumViewerLoop, disposeAurumViewer } from "@/lib/aurum/viewer";
import { parseAurumInput, preprocessAurumModel } from "@/lib/aurum/model-loader";
import { applyAurumMetal, applyAurumGem, metalPresetFromConfig, gemPresetFromConfig } from "@/lib/aurum-material-engine";
import { MATERIALES, GEMAS } from "@/lib/aurum/catalog";
import { getAurumHdriUrl, getAurumGemHdriUrl } from "@/lib/aurum-photographic-scene-engine";

type Props = { modelUrl: string; modelName: string; materialId: string; gemId: string };
const classifyMesh = (mesh: any): "metal" | "gema" | "otro" => {
  const attrs = mesh?.userData?.attributes ?? {};
  const rhino = mesh?.userData?.aurumRhino ?? {};
  const text = [mesh?.name, rhino?.capa, attrs?.layerName, attrs?.LayerName, mesh?.material?.name]
    .map((value) => String(value ?? "")).join(" ").toLowerCase();
  if (rhino?.categoria === "gema" || /(gema|piedra|gem|diamond|diamante|esmeralda|emerald|rubi|rubí|ruby|zafiro|sapphire|amatista|moissanita)/.test(text)) return "gema";
  if (rhino?.categoria === "metal" || /(metal|oro|gold|plata|silver|platino|platinum|acero|steel)/.test(text)) return "metal";
  return "otro";
};

export function PublicCatalogViewer({ modelUrl, modelName, materialId, gemId }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const renderRef = useRef<(() => void) | null>(null);
  const materialIdRef = useRef(materialId);
  const gemIdRef = useRef(gemId);
  materialIdRef.current = materialId;
  gemIdRef.current = gemId;
  const [status, setStatus] = useState("Cargando diseño 3D…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let renderer: any = null;
    let scene: any = null;
    let camera: any = null;
    let controls: any = null;
    let model: THREE.Object3D | null = null;
    let loop: any = null;
    let resizeObserver: ResizeObserver | null = null;
    let environment: THREE.Texture | null = null;
    let gemEnvironment: THREE.Texture | null = null;
    let pmrem: THREE.PMREMGenerator | null = null;
    let roomEnvironmentTexture: THREE.Texture | null = null;
    const fallbackMaterial = new THREE.MeshPhysicalMaterial({ color: 0xdfe3e7, metalness: 1, roughness: .12 });

    const applyProfiles = () => {
      if (!model) return;
      const metal = MATERIALES.find((item) => item.id === materialIdRef.current) ?? MATERIALES.find((item) => item.id === "oro18a_pulido")!
      const gem = GEMAS.find((item) => item.id === gemIdRef.current) ?? GEMAS.find((item) => item.id === "diamante_natural")!
      model.traverse((object: any) => {
        if (!object.isMesh || !object.material) return;
        const family = classifyMesh(object);
        const originalMaterials = Array.isArray(object.material) ? object.material : [object.material];
        const next = originalMaterials.map((original: any) => {
          const material = original;
          if (family === "metal") {
            applyAurumMetal(material, metalPresetFromConfig(metal));
            material.envMap = environment;
          } else if (family === "gema") {
            applyAurumGem(material, gemPresetFromConfig(gem), Math.max(.015, Number(object.userData?.aurumOpticalProfile?.thickness ?? 1)));
            material.envMap = gemEnvironment ?? environment;
            material.userData = { ...(material.userData ?? {}), aurumOpticalProfile: gemPresetFromConfig(gem), aurumGemFamily: gem.familia, aurumGemEnvIntensity: gem.envMapIntensity };
          }
          material.needsUpdate = true;
          return material;
        });
        object.material = Array.isArray(object.material) ? next : next[0];
      });
      renderRef.current?.();
    };

    const boot = async () => {
      try {
        const viewer = createAurumWebGLViewer(THREE, host, { pixelRatio: Math.min(window.devicePixelRatio || 1, 1.75), controlsClass: OrbitControls, maxDistance: 100 });
        ({ scene, camera, renderer, controls } = viewer);
        scene.background = new THREE.Color("#f7f6f2");
        scene.add(new THREE.HemisphereLight(0xffffff, 0x77716a, 1.5));
        const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(4, 7, 5); scene.add(key);
        const fill = new THREE.DirectionalLight(0xffffff, 1.0); fill.position.set(-5, 2, -3); scene.add(fill);
        const room = new RoomEnvironment();
        pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();
        const roomTarget = pmrem.fromScene(room, .04);
        scene.environment = roomTarget.texture;
        room.dispose();
        roomEnvironmentTexture = roomTarget.texture;
        environment = roomTarget.texture;
        gemEnvironment = environment;

        // Use the same dedicated metal and gem HDR sources as Aurum Render when available.
        const metalUrl = getAurumHdriUrl("ijewelMetal");
        const gemUrl = getAurumGemHdriUrl("ijewelGem");
        const acceptHdr = (texture: THREE.Texture, done: (texture: THREE.Texture) => void) => {
          if (cancelled) { texture.dispose(); return; }
          texture.mapping = THREE.EquirectangularReflectionMapping;
          done(texture);
        };
        const loadHdr = (url: string, done: (texture: THREE.Texture) => void) => {
          if (/\.exr(?:$|[?#])/i.test(url)) {
            new EXRLoader().load(url, (texture) => acceptHdr(texture, done), undefined, () => {});
          } else {
            new RGBELoader().load(url, (texture) => acceptHdr(texture, done), undefined, () => {});
          }
        };
        loadHdr(metalUrl, (texture) => { environment = texture; if (scene) scene.environment = texture; applyProfiles(); renderRef.current?.(); });
        if (gemUrl !== metalUrl) loadHdr(gemUrl, (texture) => { gemEnvironment = texture; applyProfiles(); renderRef.current?.(); });

        const response = await fetch(modelUrl);
        if (!response.ok) throw new Error("No se pudo descargar el 3DM del catálogo.");
        const blob = await response.blob();
        if (cancelled) return;
        model = await parseAurumInput(new File([blob], modelName || "modelo.3dm", { type: "application/octet-stream" }), "3dm", fallbackMaterial);
        if (!model) throw new Error("No se pudo interpretar la geometría del modelo 3D.");
        await preprocessAurumModel(model);
        if (cancelled) return;
        // Give each mesh its own material instance so changing a profile in the
        // public viewer cannot mutate a shared CAD material or another family.
        model.traverse((object: any) => {
          if (!object.isMesh || !object.material) return;
          object.material = Array.isArray(object.material)
            ? object.material.map((material: any) => material?.clone ? material.clone() : material)
            : (object.material?.clone ? object.material.clone() : object.material);
        });
        model.updateMatrixWorld(true);
        const bounds = new THREE.Box3();
        model.traverse((object: any) => { if (object.isMesh && object.geometry && object.visible) bounds.expandByObject(object); });
        if (bounds.isEmpty()) throw new Error("El 3DM no contiene mallas visibles para mostrar.");
        const center = bounds.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.updateMatrixWorld(true);
        const sphere = new THREE.Box3().setFromObject(model).getBoundingSphere(new THREE.Sphere());
        const radius = Math.max(sphere.radius, .001);
        camera.fov = 35;
        const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.2;
        camera.position.copy(new THREE.Vector3(1, .62, 1).normalize().multiplyScalar(distance));
        camera.near = Math.max(radius / 100, .001);
        camera.far = Math.max(distance + radius * 20, 100);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
        controls.target.set(0, 0, 0);
        controls.minDistance = radius * .6;
        controls.maxDistance = radius * 12;
        controls.enablePan = false;
        controls.enableRotate = true;
        controls.enableZoom = true;
        controls.update();
        scene.add(model);
        modelRef.current = model;
        applyProfiles();
        loop = startAurumViewerLoop({ node: host, camera, renderer, controls }, () => renderer.render(scene, camera), { progressiveFrames: 3 });
        renderRef.current = () => loop?.converge?.(3);
        resizeObserver = new ResizeObserver(() => {
          if (!host || !camera || !renderer) return;
          const width = Math.max(host.clientWidth, 1), height = Math.max(host.clientHeight, 1);
          camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); loop?.converge?.(2);
        });
        resizeObserver.observe(host);
        loop.converge(3);
        setStatus("");
      } catch (cause) {
        if (!cancelled) { setError(cause instanceof Error ? cause.message : "No se pudo abrir el diseño 3D."); setStatus(""); }
      }
    };
    void boot();
    return () => {
      cancelled = true;
      loop?.stop?.();
      resizeObserver?.disconnect();
      if (model) model.traverse((object: any) => {
        object.geometry?.dispose?.();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material: any) => material?.dispose?.());
      });
      if (renderer) disposeAurumViewer({ node: host, renderer, controls, observer: resizeObserver ?? undefined });
      if (environment && environment !== roomEnvironmentTexture) environment.dispose?.();
      if (gemEnvironment && gemEnvironment !== environment && gemEnvironment !== roomEnvironmentTexture) gemEnvironment.dispose?.();
      roomEnvironmentTexture?.dispose?.();
      pmrem?.dispose?.();
      fallbackMaterial.dispose();
      modelRef.current = null; renderRef.current = null;
    };
  }, [modelUrl, modelName]);

  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;
    const metal = MATERIALES.find((item) => item.id === materialId) ?? MATERIALES.find((item) => item.id === "oro18a_pulido")!;
    const gem = GEMAS.find((item) => item.id === gemId) ?? GEMAS.find((item) => item.id === "diamante_natural")!;
    model.traverse((object: any) => {
      if (!object.isMesh || !object.material) return;
      const family = classifyMesh(object);
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material: any) => {
        if (family === "metal") applyAurumMetal(material, metalPresetFromConfig(metal));
        if (family === "gema") applyAurumGem(material, gemPresetFromConfig(gem), Math.max(.015, Number(object.userData?.aurumOpticalProfile?.thickness ?? 1)));
        material.needsUpdate = true;
      });
    });
    renderRef.current?.();
  }, [materialId, gemId]);

  return <div className="relative h-full min-h-[280px] w-full overflow-hidden bg-[#f7f6f2]">
    <div ref={hostRef} className="absolute inset-0" />
    {(status || error) && <div className={"absolute inset-x-3 bottom-3 z-20 rounded-xl px-3 py-2 text-xs " + (error ? "border border-red-300 bg-white/95 text-red-800" : "bg-white/90 text-[#625b54]")}>{error || status}</div>}
  </div>;
}
