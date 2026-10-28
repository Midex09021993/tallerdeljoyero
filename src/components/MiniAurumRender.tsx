import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

type MiniAurumRenderProps = {
  className?: string;
};

function crearDiamante() {
  const geometry = new THREE.BufferGeometry();
  const vertices = [
    // Crown: table and girdle
    0, 0.42, 0,
    0.28, 0.22, 0,
    0, 0.22, 0.28,
    -0.28, 0.22, 0,
    0, 0.22, -0.28,
    // Pavilion girdle points
    0.28, 0.12, 0,
    0, 0.12, 0.28,
    -0.28, 0.12, 0,
    0, 0.12, -0.28,
    // Culet
    0, -0.34, 0,
  ];
  const indices = [
    0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1,
    1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3,
    3, 7, 8, 3, 8, 4, 4, 8, 5, 4, 5, 1,
    5, 9, 6, 6, 9, 7, 7, 9, 8, 8, 9, 5,
  ];
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function MiniAurumRender({ className = "" }: MiniAurumRenderProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#111820");
    scene.fog = new THREE.Fog("#111820", 5, 11);

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
    camera.position.set(0, 0.65, 4.9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
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
    scene.add(jewel);

    const gold = new THREE.MeshStandardMaterial({
      color: "#d9a92e",
      metalness: 0.92,
      roughness: 0.2,
    });
    const polishedGold = new THREE.MeshStandardMaterial({
      color: "#f4d477",
      metalness: 0.88,
      roughness: 0.14,
    });

    const band = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.13, 18, 112), gold);
    jewel.add(band);

    const innerBand = new THREE.Mesh(new THREE.TorusGeometry(0.73, 0.035, 10, 112), polishedGold);
    innerBand.position.z = -0.035;
    jewel.add(innerBand);

    const shoulders = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.075, 14, 80, Math.PI), polishedGold);
    shoulders.rotation.z = Math.PI;
    shoulders.position.y = 0.03;
    shoulders.position.z = 0.015;
    jewel.add(shoulders);

    const diamondMaterial = new THREE.MeshPhysicalMaterial({
      color: "#d9f5ff",
      metalness: 0.02,
      roughness: 0.08,
      transmission: 0.18,
      thickness: 0.8,
      ior: 2.1,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      flatShading: true,
    });
    const diamond = new THREE.Mesh(crearDiamante(), diamondMaterial);
    diamond.position.set(0, 0.47, 0.04);
    jewel.add(diamond);

    const prongsMaterial = polishedGold;
    for (let i = 0; i < 4; i += 1) {
      const angle = (Math.PI / 4) + (i * Math.PI / 2);
      const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.24, 8), prongsMaterial);
      prong.position.set(Math.cos(angle) * 0.25, 0.36, Math.sin(angle) * 0.25 + 0.04);
      prong.rotation.z = -Math.cos(angle) * 0.22;
      prong.rotation.x = Math.sin(angle) * 0.22;
      jewel.add(prong);
    }

    jewel.rotation.x = -0.12;
    jewel.rotation.y = -0.2;

    let disposed = false;
    let diamondBvhRuntime: { update: () => void; dispose: () => void } | null = null;

    // Cargar el modelo real de la joya; la pieza procedural queda como respaldo si falla la carga.
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

        const oldObjects = [...jewel.children];
        oldObjects.forEach((object) => {
          jewel.remove(object);
          object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose();
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              materials.forEach((material) => material.dispose());
            }
          });
        });
        jewel.add(model);

        // Solo activar el BVH de AURUM para mallas identificadas explícitamente como piedra.
        // El modelo completo y los materiales del metal permanecen intactos.
        const diamondMeshes: THREE.Mesh[] = [];
        model.traverse((object) => {
          if (!(object instanceof THREE.Mesh) || !object.geometry?.getAttribute("position")) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          if (materials.length !== 1) return;
          const material = materials[0];
          const identity = `${object.name} ${material.name}`.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase();
          if (!/(diamond|diamante|brilliant|brillante|gem|gema|piedra|stone)/.test(identity)) return;
          material.userData = { ...(material.userData ?? {}), aurumGemFamily: "diamante" };
          object.userData = {
            ...(object.userData ?? {}),
            aurumActiveGemId: "diamante_natural",
            aurumActiveGemFamily: "diamante",
          };
          diamondMeshes.push(object);
        });

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
        console.warn("No se pudo cargar /models/diseno-de-joyeria.glb; se mantiene el modelo de respaldo.", error);
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
    <div className={`relative isolate overflow-hidden rounded-xl border border-white/[.08] bg-[#111820] ${className}`}>
      <div ref={hostRef} className="absolute inset-0" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_36%,rgba(248,201,40,.13),transparent_48%),linear-gradient(145deg,rgba(32,43,53,.08),rgba(9,13,17,.45))]" />
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
