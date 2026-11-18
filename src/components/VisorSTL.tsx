import { useEffect, useRef, useState } from "react";

/** Visor 3D ligero para archivos STL (binario o ASCII). */
export function VisorSTL({ url, className }: { url: string; className?: string }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    let limpiar = () => {};

    (async () => {
      try {
        const THREE = await import("three");
        const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
        const nodo = contenedor.current;
        if (!vivo || !nodo) return;

        const ancho = nodo.clientWidth || 480;
        const alto = nodo.clientHeight || 360;

        const escena = new THREE.Scene();
        const camara = new THREE.PerspectiveCamera(45, ancho / alto, 0.1, 5000);
        const render = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        render.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        render.setSize(ancho, alto);
        nodo.appendChild(render.domElement);

        escena.add(new THREE.HemisphereLight(0xffffff, 0x554433, 2.2));
        const luz = new THREE.DirectionalLight(0xffffff, 1.6);
        luz.position.set(1, 1, 1);
        escena.add(luz);

        const geometria = await new STLLoader().loadAsync(url);
        if (!vivo) return;
        geometria.computeVertexNormals();
        geometria.center();

        const malla = new THREE.Mesh(
          geometria,
          new THREE.MeshStandardMaterial({ color: 0xd9c08a, metalness: 0.75, roughness: 0.32 }),
        );
        escena.add(malla);

        const esfera = geometria.boundingSphere ?? new THREE.Sphere(new THREE.Vector3(), 50);
        const radio = esfera.radius || 50;
        camara.position.set(radio * 2, radio * 1.4, radio * 2.2);
        camara.lookAt(0, 0, 0);

        const controles = new OrbitControls(camara, render.domElement);
        controles.enableDamping = true;
        controles.autoRotate = true;
        controles.autoRotateSpeed = 1.4;

        setCargando(false);

        let frame = 0;
        const animar = () => {
          frame = requestAnimationFrame(animar);
          controles.update();
          render.render(escena, camara);
        };
        animar();

        const redimensionar = () => {
          const w = nodo.clientWidth || ancho;
          const h = nodo.clientHeight || alto;
          camara.aspect = w / h;
          camara.updateProjectionMatrix();
          render.setSize(w, h);
        };
        window.addEventListener("resize", redimensionar);

        limpiar = () => {
          cancelAnimationFrame(frame);
          window.removeEventListener("resize", redimensionar);
          controles.dispose();
          geometria.dispose();
          render.dispose();
          render.domElement.remove();
        };
      } catch {
        if (vivo) {
          setCargando(false);
          setError("No se pudo cargar el modelo 3D.");
        }
      }
    })();

    return () => {
      vivo = false;
      limpiar();
    };
  }, [url]);

  return (
    <div
      className={
        className ?? "relative h-[420px] w-full rounded-xl border border-border bg-surface-muted"
      }
    >
      <div ref={contenedor} className="h-full w-full [&>canvas]:rounded-xl" />
      {cargando || error ? (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          {error ?? "Cargando modelo…"}
        </p>
      ) : null}
    </div>
  );
}
