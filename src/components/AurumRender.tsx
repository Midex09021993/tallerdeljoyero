import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Expand, Gem, Maximize2, RotateCcw, Upload, X } from "lucide-react";

type MaterialId = "oro18a" | "oro18b" | "oro18r" | "plata950" | "platino";
type EscenarioId = "oscuro" | "claro" | "luxury" | "marmol" | "transparente";

type MaterialConfig = {
  id: MaterialId;
  nombre: string;
  color: number;
  metalness: number;
  roughness: number;
  envMapIntensity: number;
  clearcoat: number;
};

const MATERIALES: MaterialConfig[] = [
  { id: "oro18a", nombre: "Oro 18K Amarillo", color: 0xd7ad48, metalness: 1, roughness: 0.2, envMapIntensity: 2.15, clearcoat: 0.35 },
  { id: "oro18b", nombre: "Oro 18K Blanco", color: 0xdfe3e7, metalness: 1, roughness: 0.16, envMapIntensity: 2.35, clearcoat: 0.28 },
  { id: "oro18r", nombre: "Oro 18K Rosa", color: 0xd99078, metalness: 1, roughness: 0.21, envMapIntensity: 2.1, clearcoat: 0.35 },
  { id: "plata950", nombre: "Plata 950", color: 0xbfc5ca, metalness: 1, roughness: 0.18, envMapIntensity: 2.4, clearcoat: 0.2 },
  { id: "platino", nombre: "Platino", color: 0xb7bdc2, metalness: 1, roughness: 0.24, envMapIntensity: 2.25, clearcoat: 0.18 },
];

const ESCENARIOS: { id: EscenarioId; nombre: string }[] = [
  { id: "oscuro", nombre: "Estudio Oscuro" },
  { id: "claro", nombre: "Estudio Claro" },
  { id: "luxury", nombre: "Luxury" },
  { id: "marmol", nombre: "Mármol" },
  { id: "transparente", nombre: "Transparente" },
];

const EXTENSIONES = ".stl,.obj,.glb,.fbx";

export function AurumRender() {
  const visorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const apiRef = useRef<{
    cargar: (file: File) => Promise<void>;
    material: (config: MaterialConfig) => void;
    escenario: (id: EscenarioId) => void;
    reset: () => void;
    capturar: () => void;
    limpiar: () => void;
    fullscreen: () => Promise<void>;
  } | null>(null);

  const [archivo, setArchivo] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [materialId, setMaterialId] = useState<MaterialId>("oro18a");
  const [escenarioId, setEscenarioId] = useState<EscenarioId>("oscuro");

  const materialActivo = MATERIALES.find((m) => m.id === materialId) ?? MATERIALES[0]!;

  useEffect(() => {
    let vivo = true;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      const nodo = visorRef.current;
      if (!vivo || !nodo) return;

      const escena = new THREE.Scene();
      const camara = new THREE.PerspectiveCamera(38, 1, 0.001, 1000);
      camara.position.set(3.2, 2.3, 4.2);

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.45;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.className = "block h-full w-full";
      nodo.appendChild(renderer.domElement);

      const pmrem = new THREE.PMREMGenerator(renderer);
      const entorno = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      escena.environment = entorno;

      escena.add(new THREE.HemisphereLight(0xfff8e8, 0x332a24, 2.2));

      const key = new THREE.DirectionalLight(0xfff1cc, 5.5);
      key.position.set(4, 6, 5);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.bias = -0.0002;
      escena.add(key);

      const fill = new THREE.DirectionalLight(0xdbe7ff, 3.5);
      fill.position.set(-5, 2.5, 3);
      escena.add(fill);

      const rim = new THREE.DirectionalLight(0xffd99a, 4.5);
      rim.position.set(2, 4, -5);
      escena.add(rim);

      const top = new THREE.RectAreaLight(0xffffff, 5, 4, 2);
      top.position.set(0, 5, 0);
      top.lookAt(0, 0, 0);
      escena.add(top);

      const controles = new OrbitControls(camara, renderer.domElement);
      controles.enableDamping = true;
      controles.dampingFactor = 0.075;
      controles.enablePan = true;
      controles.minDistance = 0.15;
      controles.maxDistance = 100;
      controles.target.set(0, 0, 0);

      let modelo: import("three").Object3D | null = null;
      let suelo: import("three").Mesh | null = null;
      const material = new THREE.MeshPhysicalMaterial({
        color: MATERIALES[0]!.color,
        metalness: 1,
        roughness: MATERIALES[0]!.roughness,
        envMapIntensity: MATERIALES[0]!.envMapIntensity,
        clearcoat: MATERIALES[0]!.clearcoat,
        clearcoatRoughness: 0.18,
      });

      const disposeObject = (obj: import("three").Object3D) => {
        obj.traverse((child) => {
          const mesh = child as import("three").Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
        });
      };

      const quitar = () => {
        if (modelo) {
          escena.remove(modelo);
          disposeObject(modelo);
          modelo = null;
        }
        if (suelo) {
          escena.remove(suelo);
          suelo.geometry.dispose();
          (suelo.material as import("three").Material).dispose();
          suelo = null;
        }
      };

      const aplicarMaterial = (config: MaterialConfig) => {
        material.color.setHex(config.color);
        material.metalness = config.metalness;
        material.roughness = config.roughness;
        material.envMapIntensity = config.envMapIntensity;
        material.clearcoat = config.clearcoat;
        material.needsUpdate = true;
      };

      const aplicarEscenario = (id: EscenarioId) => {
        const transparent = id === "transparente";
        renderer.setClearColor(0x000000, transparent ? 0 : 1);

        if (transparent) {
          escena.background = null;
        } else {
          const backgrounds: Record<Exclude<EscenarioId, "transparente">, number> = {
            oscuro: 0x0b0d10,
            claro: 0xe9e7e2,
            luxury: 0x17100a,
            marmol: 0xd5d2cc,
          };
          escena.background = new THREE.Color(backgrounds[id]);
        }

        if (suelo) {
          suelo.visible = !transparent && (id === "marmol" || id === "luxury" || id === "oscuro");
          const sueloMat = suelo.material as import("three").MeshStandardMaterial;
          if (id === "marmol") {
            sueloMat.color.setHex(0xc8c5bf);
            sueloMat.roughness = 0.28;
          } else if (id === "luxury") {
            sueloMat.color.setHex(0x20150c);
            sueloMat.roughness = 0.24;
          } else {
            sueloMat.color.setHex(0x15181c);
            sueloMat.roughness = 0.32;
          }
        }
      };

      const encuadrar = () => {
        if (!modelo) return;
        modelo.updateMatrixWorld(true);
        const caja = new THREE.Box3().setFromObject(modelo);
        const centro = caja.getCenter(new THREE.Vector3());
        const tamano = caja.getSize(new THREE.Vector3());
        const maxDim = Math.max(tamano.x, tamano.y, tamano.z) || 1;

        modelo.position.sub(centro);
        modelo.scale.multiplyScalar(2.5 / maxDim);
        modelo.updateMatrixWorld(true);

        const cajaFinal = new THREE.Box3().setFromObject(modelo);
        const alto = cajaFinal.getSize(new THREE.Vector3()).y || 1;

        if (!suelo) {
          suelo = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 20),
            new THREE.MeshStandardMaterial({ color: 0x15181c, metalness: 0.05, roughness: 0.3 }),
          );
          suelo.rotation.x = -Math.PI / 2;
          suelo.receiveShadow = true;
          escena.add(suelo);
        }

        suelo.position.y = cajaFinal.min.y - Math.max(alto * 0.035, 0.015);
        aplicarEscenario(escenarioId);

        camara.near = 0.01;
        camara.far = 100;
        camara.position.set(3.5, 2.4, 4.6);
        controles.target.set(0, 0, 0);
        controles.update();
        camara.updateProjectionMatrix();
      };

      const cargar = async (file: File) => {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!ext || !["stl", "obj", "glb", "fbx"].includes(ext)) {
          throw new Error("Formato no compatible. AURUM RENDER admite STL, OBJ, GLB y FBX.");
        }

        const buffer = await file.arrayBuffer();
        let objeto: import("three").Object3D;

        if (ext === "stl") {
          const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
          const geo = new STLLoader().parse(buffer);
          geo.computeVertexNormals();
          objeto = new THREE.Mesh(geo, material);
        } else if (ext === "obj") {
          const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
          objeto = new OBJLoader().parse(new TextDecoder().decode(buffer));
        } else if (ext === "glb") {
          const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
          const gltf = await new GLTFLoader().parseAsync(buffer, "");
          objeto = gltf.scene;
        } else {
          const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
          objeto = new FBXLoader().parse(buffer, "");
        }

        quitar();
        objeto.traverse((child) => {
          const mesh = child as import("three").Mesh;
          if (!mesh.isMesh) return;
          mesh.material = material;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        });

        modelo = objeto;
        escena.add(modelo);
        aplicarMaterial(materialActivo);
        encuadrar();
      };

      const capturar = () => {
        renderer.render(escena, camara);
        const data = renderer.domElement.toDataURL("image/png");
        const enlace = document.createElement("a");
        enlace.href = data;
        enlace.download = "aurum-render-" + Date.now() + ".png";
        enlace.click();
      };

      apiRef.current = {
        cargar,
        material: aplicarMaterial,
        escenario: aplicarEscenario,
        reset: encuadrar,
        capturar,
        limpiar: quitar,
        fullscreen: async () => {
          await nodo.requestFullscreen?.();
        },
      };

      const resize = () => {
        const width = nodo.clientWidth || 900;
        const height = nodo.clientHeight || 600;
        camara.aspect = width / height;
        camara.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      };

      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(nodo);

      let frame = 0;
      const animate = () => {
        frame = requestAnimationFrame(animate);
        controles.update();
        renderer.render(escena, camara);
      };
      animate();

      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        quitar();
        controles.dispose();
        material.dispose();
        entorno.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        apiRef.current = null;
      };
    })().catch((e) => {
      if (vivo) setError(e instanceof Error ? e.message : "No se pudo iniciar AURUM RENDER.");
    });

    return () => {
      vivo = false;
      cleanup();
    };
  }, []);

  useEffect(() => {
    apiRef.current?.material(materialActivo);
  }, [materialActivo]);

  useEffect(() => {
    apiRef.current?.escenario(escenarioId);
  }, [escenarioId]);

  const cargarArchivo = useCallback(async (file: File) => {
    setCargando(true);
    setError(null);
    try {
      await apiRef.current?.cargar(file);
      setArchivo(file.name);
    } catch (e) {
      setArchivo(null);
      setError(e instanceof Error ? e.message : "No se pudo cargar el modelo.");
    } finally {
      setCargando(false);
    }
  }, []);

  const limpiar = () => {
    apiRef.current?.limpiar();
    setArchivo(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border bg-ink px-5 py-5 text-ink-foreground sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <Gem className="size-5 text-gold" aria-hidden="true" />
                <p className="font-display text-2xl italic text-gold">AURUM RENDER</p>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-ink-foreground/60">
                Visualización profesional de joyería 3D en tiempo real. Carga tu modelo,
                prueba materiales y presenta la pieza en distintos escenarios.
              </p>
            </div>
            <div className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
              Fase 1
            </div>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div ref={visorRef} className="relative min-h-[520px] overflow-hidden bg-[#0b0d10] lg:min-h-[680px]">
            {!archivo && !cargando ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-8 text-center">
                <div className="max-w-md">
                  <div className="mx-auto grid size-16 place-items-center rounded-2xl border border-gold/20 bg-gold/10 text-gold">
                    <Upload className="size-7" aria-hidden="true" />
                  </div>
                  <h2 className="mt-5 text-lg font-semibold text-white">Carga una pieza 3D</h2>
                  <p className="mt-2 text-sm text-white/50">
                    STL, OBJ, GLB o FBX. El modelo se procesa localmente en tu navegador.
                  </p>
                  {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
                </div>
              </div>
            ) : null}

            {cargando ? (
              <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-black/20 backdrop-blur-[2px]">
                <p className="rounded-full border border-white/10 bg-black/50 px-4 py-2 text-sm text-white/80">
                  Procesando modelo…
                </p>
              </div>
            ) : null}

            {archivo ? (
              <div className="absolute left-4 top-4 z-20 flex max-w-[65%] items-center gap-2">
                <span className="truncate rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-xs text-white/80 backdrop-blur">
                  {archivo}
                </span>
              </div>
            ) : null}

            <div className="absolute right-4 top-4 z-20 flex gap-2">
              <button type="button" onClick={() => apiRef.current?.reset()} title="Auto centrar y escalar" className="grid size-9 place-items-center rounded-full border border-white/10 bg-black/45 text-white/80 backdrop-blur transition hover:text-gold">
                <Maximize2 className="size-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => apiRef.current?.fullscreen()} title="Pantalla completa" className="grid size-9 place-items-center rounded-full border border-white/10 bg-black/45 text-white/80 backdrop-blur transition hover:text-gold">
                <Expand className="size-4" aria-hidden="true" />
              </button>
              {archivo ? (
                <button type="button" onClick={limpiar} title="Quitar modelo" className="grid size-9 place-items-center rounded-full border border-white/10 bg-black/45 text-white/80 backdrop-blur transition hover:text-gold">
                  <X className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>

            <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/45 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-white/45 backdrop-blur">
              Arrastra para rotar · rueda para zoom · botón central para pan
            </div>
          </div>

          <aside className="border-t border-border bg-background p-5 lg:border-l lg:border-t-0 lg:p-6">
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Modelo</p>
                <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-105">
                  <Upload className="size-4" aria-hidden="true" />
                  {archivo ? "Cambiar modelo" : "Cargar modelo 3D"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept={EXTENSIONES}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void cargarArchivo(file);
                  }}
                />
                <p className="mt-2 text-[11px] text-muted-foreground">STL · OBJ · GLB · FBX</p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Material PBR</p>
                <div className="mt-3 space-y-2">
                  {MATERIALES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMaterialId(m.id)}
                      aria-pressed={materialId === m.id}
                      className={"flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition " + (materialId === m.id ? "border-gold bg-accent text-foreground" : "border-input bg-card text-muted-foreground hover:border-gold/50 hover:text-foreground")}
                    >
                      <span className="size-4 shrink-0 rounded-full border border-black/10" style={{ background: "#" + m.color.toString(16).padStart(6, "0") }} />
                      {m.nombre}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Escenario</p>
                <select
                  value={escenarioId}
                  onChange={(event) => setEscenarioId(event.target.value as EscenarioId)}
                  className="mt-3 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                >
                  {ESCENARIOS.map((escenario) => (
                    <option key={escenario.id} value={escenario.id}>{escenario.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => apiRef.current?.reset()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-input bg-card px-3 text-xs font-semibold hover:border-gold">
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Restablecer
                </button>
                <button type="button" onClick={() => apiRef.current?.capturar()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground hover:brightness-105">
                  <Camera className="size-4" aria-hidden="true" />
                  Capturar PNG
                </button>
              </div>

              <div className="rounded-xl border border-border bg-surface-muted p-4">
                <p className="text-xs font-semibold">Controles del visor</p>
                <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                  <li>• Rotación libre y zoom</li>
                  <li>• Pan y auto centrado</li>
                  <li>• Auto escala de la pieza</li>
                  <li>• Pantalla completa</li>
                  <li>• Captura PNG con transparencia cuando se selecciona ese escenario</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <p className="text-[11px] text-muted-foreground">
        AURUM RENDER Fase 1 se concentra exclusivamente en visualización. No calcula
        costos, precios ni cotizaciones. Los modelos se procesan en memoria dentro del navegador.
      </p>
    </div>
  );
}
