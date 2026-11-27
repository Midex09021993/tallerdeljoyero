import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

type MiniAurumRenderProps = {
  className?: string;
};

export function MiniAurumRender({ className = "" }: MiniAurumRenderProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [estadoModelo, setEstadoModelo] = useState<"cargando" | "listo" | "error">("cargando");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = null;

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
    camera.position.set(0, 0.65, 4.9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.setAttribute("aria-label", "Modelo 3D de anillo con diamante. Arrastra para girarlo.");
    renderer.domElement.className = "block h-full w-full touch-pan-y";
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xeaf3ff, 0x241a08, 2.1));

    const keyLight = new THREE.DirectionalLight(0xffe5a0, 4.5);
    keyLight.position.set(-3, 4, 4);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x8abfff, 3.2);
    rimLight.position.set(3, 1, -3);
    scene.add(rimLight);
    const frontLight = new THREE.PointLight(0xffffff, 22, 8);
    frontLight.position.set(0, 1.5, 3);
    scene.add(frontLight);

    const jewel = new THREE.Group();
    jewel.rotation.x = -0.12;
    jewel.rotation.y = -0.2;
    scene.add(jewel);

    let disposed = false;
    let diamondBvhRuntime: { update: () => void; dispose: () => void } | null = null;

    // Cargar directamente el archivo GLB oficial; no generar una joya alternativa.
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      "/models/diseno-de-joyeria.glb",
      (gltf) => {
        if (disposed) {
          gltf.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              object.geometry.dispose();
              const materials = Array.isArray(object.material) ? object.material : [object.material];
              materials.forEach((material) => material.dispose());
            }
          });
          return;
        }

        const model = gltf.scene;
        model.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z);

        if (Number.isFinite(maxDimension) && maxDimension > 0) {
          const fitScale = 2.05 / maxDimension;
          model.scale.setScalar(fitScale);
          model.position.set(
            -center.x * fitScale,
            -center.y * fitScale,
            -center.z * fitScale,
          );
        }

        jewel.add(model);
        setEstadoModelo("listo");

        // Solo activar el BVH de AURUM para mallas identificadas explícitamente como piedra.
        // El modelo completo y los materiales del metal permanecen intactos.
        const diamondMeshes: THREE.Mesh[] = [];
        model.traverse((object) => {
          if (!(object instanceof THREE.Mesh) || !object.geometry?.getAttribute("position")) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          if (materials.length !== 1) return;
          const material = materials[0];
          const identity = `${object.name} ${material.name}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
          if (!/(diamond|diamante|brilliant|brillante|gem|gema|piedra|stone)/.test(identity)) return;
          material.userData = { ...(material.userData ?? {}), aurumGemFamily: "diamante" };
          object.userData = {
            ...(object.userData ?? {}),
            aurumActiveGemId: "diamante_natural",
            aurumActiveGemFamily: "diamante",
          };
          diamondMeshes.push(object);
        });

        if (diamondMeshes.length === 0) {
          // Algunos GLB exportados desde CAD nombran todas las piezas de forma genérica.
          // En ese caso, buscar una malla compacta y facetada en la zona superior central
          // de la joya; no aplicar el shader a toda la escena ni a las piezas del aro.
          const modelBounds = new THREE.Box3().setFromObject(model);
          const modelSize = modelBounds.getSize(new THREE.Vector3());
          const modelCenter = modelBounds.getCenter(new THREE.Vector3());
          const candidates: Array<{ mesh: THREE.Mesh; score: number }> = [];
          model.traverse((object) => {
            if (!(object instanceof THREE.Mesh) || !object.geometry?.getAttribute("position")) return;
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            if (materials.length !== 1) return;
            object.updateWorldMatrix(true, false);
            const bounds = new THREE.Box3().setFromObject(object);
            const size = bounds.getSize(new THREE.Vector3());
            const center = bounds.getCenter(new THREE.Vector3());
            const heightRatio = size.y / Math.max(modelSize.y, 1e-6);
            const xOffset = Math.abs(center.x - modelCenter.x) / Math.max(modelSize.x, 1e-6);
            const zOffset = Math.abs(center.z - modelCenter.z) / Math.max(modelSize.z, 1e-6);
            const topRatio = (center.y - modelBounds.min.y) / Math.max(modelSize.y, 1e-6);
            const triangles = Math.floor(
              (object.geometry.getIndex()?.count ?? object.geometry.getAttribute("position").count) / 3,
            );
            const widthRatio = size.x / Math.max(modelSize.x, 1e-6);
            const depthRatio = size.z / Math.max(modelSize.z, 1e-6);
            // Excluir garritas y alambres: el diamante debe tener volumen y anchura
            // en ambos ejes horizontales, además de estar en la zona superior central.
            if (
              heightRatio > 0.48 ||
              topRatio < 0.62 ||
              xOffset > 0.24 ||
              zOffset > 0.24 ||
              widthRatio < 0.075 ||
              depthRatio < 0.075 ||
              triangles < 8
            ) return;
            const compactness = Math.max(size.x, size.y, size.z) / Math.max(Math.min(size.x, size.y, size.z), 1e-5);
            if (compactness > 4.2) return;
            const footprint = widthRatio * depthRatio;
            const score = topRatio * 3 - xOffset * 2 - zOffset * 2 + footprint * 5 - Math.abs(heightRatio - 0.22) - Math.max(0, compactness - 2.2) * 0.16;
            candidates.push({ mesh: object, score });
          });
          candidates.sort((a, b) => b.score - a.score);
          const inferredDiamond = candidates[0]?.mesh;
          if (inferredDiamond) {
            const material = Array.isArray(inferredDiamond.material) ? inferredDiamond.material[0] : inferredDiamond.material;
            if (material) material.userData = { ...(material.userData ?? {}), aurumGemFamily: "diamante" };
            inferredDiamond.userData = {
              ...(inferredDiamond.userData ?? {}),
              aurumActiveGemId: "diamante_natural",
              aurumActiveGemFamily: "diamante",
            };
            diamondMeshes.push(inferredDiamond);
            console.info("[AURUM mini] Diamante identificado por geometría", {
              mesh: inferredDiamond.name || inferredDiamond.uuid,
              candidatos: candidates.length,
            });
          } else {
            console.warn("[AURUM mini] No se encontró una malla de diamante aislada en la parte superior del GLB.");
          }
        }

        if (diamondMeshes.length > 0) {
          void (async () => {
            try {
              const { createAurumDiamondBvhRuntime } = await import("../lib/aurum/aurum-diamond-bvh-runtime");
              if (disposed) return;
              const runtime = await createAurumDiamondBvhRuntime({
                THREE,
                RGBELoader,
                EXRLoader,
                url: "https://playground.ijewel3d.com/assetspro/hdrmaps/gem/env-gem-010.exr",
                camera,
                quality: "interactive",
                targetFamilies: ["diamante"],
                onError: (error) => console.warn("[AURUM mini] El BVH del diamante no se pudo aplicar; se conserva el material original.", error),
              });
              if (disposed) {
                runtime.dispose();
                return;
              }
              diamondBvhRuntime = runtime;
              runtime.refresh(model);
              if (!runtime.diagnostics().enabled) {
                runtime.dispose();
                diamondBvhRuntime = null;
              }
            } catch (error) {
              console.warn("[AURUM mini] No se pudo inicializar el BVH del diamante; se conserva el material GLB.", error);
            }
          })();
        }
      },
      undefined,
      (error) => {
        console.error("No se pudo cargar el modelo oficial /models/diseno-de-joyeria.glb.", error);
        if (!disposed) setEstadoModelo("error");
      },
    );

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.minDistance = 3.5;
    controls.maxDistance = 7;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.1;
    controls.target.set(0, 0.12, 0);
    controls.update();

    const resizeObserver = new ResizeObserver(() => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    });
    resizeObserver.observe(host);

    let frame = 0;
    const render = () => {
      if (disposed) return;
      frame = window.requestAnimationFrame(render);
      controls.update();
      diamondBvhRuntime?.update();
      renderer.render(scene, camera);
    };
    render();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      controls.dispose();
      diamondBvhRuntime?.dispose();
      diamondBvhRuntime = null;
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className={`relative isolate overflow-hidden rounded-xl border border-white/[.08] bg-[#031a14] bg-[url(/backgrounds/navidad-esmeralda.svg)] bg-cover bg-center ${className}`}>
      <div ref={hostRef} className="absolute inset-0" />
      {estadoModelo !== "listo" && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6 text-center">
          <div className="rounded-2xl border border-white/10 bg-[#10161d]/90 px-5 py-4 shadow-xl backdrop-blur">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#f3d66e]">AURUM RENDER</p>
            <p className="mt-2 text-sm font-medium text-white">{estadoModelo === "cargando" ? "Cargando modelo de joyería…" : "No se pudo cargar el modelo 3D"}</p>
            {estadoModelo === "error" && <p className="mt-1 text-xs leading-5 text-slate-300">Comprueba que el archivo oficial esté disponible e inténtalo de nuevo.</p>}
          </div>
        </div>
      )}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_36%,rgba(248,201,40,.18),transparent_48%),linear-gradient(145deg,rgba(3,26,20,.12),rgba(3,26,20,.38))]" />
      <div className="pointer-events-none absolute inset-5 rounded-xl border border-white/[.06]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f8c928]/10 sm:size-60" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f8c928]/15 sm:size-44" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#090d11]/95 via-[#090d11]/70 to-transparent px-4 pb-4 pt-16 text-center sm:px-6 sm:pb-5">
        <p className="text-[9px] font-bold uppercase tracking-[.24em] text-[#f3d66e]">Tu estudio de joyería digital</p>
        <h3 className="mt-1 text-xl font-semibold tracking-wide text-white sm:text-2xl">AURUM RENDER</h3>
        <p className="mx-auto mt-1 max-w-sm text-[10px] leading-4 text-slate-300 sm:text-xs">Arrastra la joya para girarla · Rueda del ratón para acercar</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-[9px] font-medium text-slate-200">Oro · Plata · Platino</span>
          <span className="rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-[9px] font-medium text-slate-200">Gemas e iluminación</span>
          <span className="rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-[9px] font-medium text-slate-200">Modo fotográfico</span>
        </div>
      </div>
    </div>
  );
}
