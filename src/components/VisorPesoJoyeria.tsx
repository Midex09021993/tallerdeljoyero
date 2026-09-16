import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Boxes, RotateCcw, Trash2, Upload } from "lucide-react";
import { CLAVES_CALCULADORAS, DEFAULT_CONFIG_VISUALIZADOR, leerConfigVisualizador } from "@/lib/calculadoras-config";
import { useConfigSistema } from "@/lib/taller-db";

/* ------------------------------------------------------------------ */
/* Metales y densidades (g/cm³) — editables desde Ajustes             */
/* ------------------------------------------------------------------ */

export type MetalId =
  | "oro18a"
  | "oro18b"
  | "oro18r"
  | "oro14"
  | "plata925"
  | "plata950"
  | "plata970"
  | "platino";

type Metal = {
  id: MetalId;
  nombre: string;
  densidad: number;
  /** Apariencia del material en el visor. */
  color: number;
  metalness: number;
  roughness: number;
};

const METALES: Metal[] = [
  { id: "oro18a", nombre: "Oro 18K Amarillo", densidad: 15.5, color: 0xe6c15a, metalness: 1, roughness: 0.22 },
  { id: "oro18b", nombre: "Oro 18K Blanco", densidad: 15.8, color: 0xe8e8ea, metalness: 1, roughness: 0.15 },
  { id: "oro18r", nombre: "Oro 18K Rosa", densidad: 15.3, color: 0xe0a380, metalness: 1, roughness: 0.24 },
  { id: "oro14", nombre: "Oro 14K", densidad: 13.1, color: 0xdcb865, metalness: 1, roughness: 0.26 },
  { id: "plata925", nombre: "Plata 925", densidad: 10.36, color: 0xcfd2d6, metalness: 1, roughness: 0.22 },
  { id: "plata950", nombre: "Plata 950", densidad: 10.4, color: 0xd8dade, metalness: 1, roughness: 0.2 },
  { id: "plata970", nombre: "Plata 970", densidad: 10.43, color: 0xe2e4e6, metalness: 1, roughness: 0.18 },
  { id: "platino", nombre: "Platino", densidad: 21.4, color: 0xcfd3d6, metalness: 1, roughness: 0.3 },
];

const UNIDADES: { id: string; etiqueta: string; aCm: number }[] = [
  { id: "mm", etiqueta: "Milímetros", aCm: 0.1 },
  { id: "cm", etiqueta: "Centímetros", aCm: 1 },
  { id: "in", etiqueta: "Pulgadas", aCm: 2.54 },
];

function num(valor: number, decimales = 2) {
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor);
}

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

export function VisorPesoJoyeria({ compacto = false }: { compacto?: boolean }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);
  const api = useRef<{
    cargar: (file: File) => Promise<number>;
    aplicarMaterial: (m: Metal) => void;
    reset: () => void;
    limpiar: () => void;
  } | null>(null);

  const [listo, setListo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [volumenUnidades, setVolumenUnidades] = useState<number | null>(null);

  const [metalId, setMetalId] = useState<MetalId>("oro18a");
  const [pesoArbol, setPesoArbol] = useState<number | null>(null);
  const [unidad, setUnidad] = useState("mm");
  const { data: configVisualizador } = useConfigSistema(CLAVES_CALCULADORAS.visualizador);
  const configuracion = leerConfigVisualizador(configVisualizador?.valor);
  const [densidades, setDensidades] = useState<Record<MetalId, number>>(() => ({
    ...DEFAULT_CONFIG_VISUALIZADOR.densidades,
  }));

  useEffect(() => {
    setDensidades(configuracion.densidades);
  }, [configVisualizador]);

  const metal = useMemo(
    () => METALES.find((m) => m.id === metalId) ?? METALES[0]!,
    [metalId],
  );

  /* ---------------- Escena three.js (montaje único) ---------------- */
  useEffect(() => {
    let vivo = true;
    let limpiarEscena = () => {};

    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import(
        "three/examples/jsm/controls/OrbitControls.js"
      );
      const { RoomEnvironment } = await import(
        "three/examples/jsm/environments/RoomEnvironment.js"
      );
      const nodo = contenedor.current;
      if (!vivo || !nodo) return;

      const escena = new THREE.Scene();
      escena.background = new THREE.Color(0x0d0f12);

      const camara = new THREE.PerspectiveCamera(45, 1, 0.01, 100000);
      const render = new THREE.WebGLRenderer({ antialias: true });
      render.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      render.toneMapping = THREE.ACESFilmicToneMapping;
      render.toneMappingExposure = 1.45;
      render.shadowMap.enabled = true;
      render.shadowMap.type = THREE.PCFSoftShadowMap;
      nodo.appendChild(render.domElement);
      render.domElement.style.width = "100%";
      render.domElement.style.height = "100%";
      render.domElement.style.display = "block";

      const pmrem = new THREE.PMREMGenerator(render);
      const entorno = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      escena.environment = entorno;

      escena.add(new THREE.AmbientLight(0xfff8e8, 1.35));
      escena.add(new THREE.HemisphereLight(0xf5f7ff, 0x332a24, 1.8));

      const key = new THREE.DirectionalLight(0xfff4d6, 5.2);
      key.position.set(2.5, 3.5, 4);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.bias = -0.0002;
      escena.add(key);
      const fill = new THREE.DirectionalLight(0xcbdcff, 3.1);
      fill.position.set(-3.5, 1.5, 2.2);
      escena.add(fill);
      const rim = new THREE.DirectionalLight(0xffdf9e, 4.2);
      rim.position.set(1.2, 2.6, -4);
      escena.add(rim);

      const controles = new OrbitControls(camara, render.domElement);
      controles.enableDamping = true;
      controles.enablePan = true;
      controles.autoRotate = true;
      controles.autoRotateSpeed = 1.1;

      let modelo: import("three").Object3D | null = null;
      const material = new THREE.MeshStandardMaterial({
        color: METALES[0]!.color,
        metalness: METALES[0]!.metalness,
        roughness: METALES[0]!.roughness,
        envMapIntensity: 1.8,
      });

      const sueloMaterial = new THREE.ShadowMaterial({
        color: 0x000000,
        opacity: 0.28,
        transparent: true,
      });
      const suelo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sueloMaterial);
      suelo.rotation.x = -Math.PI / 2;
      suelo.receiveShadow = true;
      suelo.visible = false;
      escena.add(suelo);

      const ajustarCamara = () => {
        if (!modelo) return;
        const caja = new THREE.Box3().setFromObject(modelo);
        const tamano = caja.getSize(new THREE.Vector3());
        const radio = Math.max(tamano.x, tamano.y, tamano.z) || 1;
        controles.target.set(0, 0, 0);
        camara.near = radio / 500;
        camara.far = radio * 200;
        camara.position.set(radio * 1.2, radio * 0.9, radio * 1.6);
        render.toneMappingExposure = radio > 500 ? 1.6 : 1.45;
        camara.updateProjectionMatrix();
        controles.update();
      };

      const liberar = (objeto: import("three").Object3D) => {
        objeto.traverse((hijo) => {
          const malla = hijo as import("three").Mesh;
          if (malla.geometry) malla.geometry.dispose();
        });
      };

      const quitarModelo = () => {
        if (!modelo) return;
        escena.remove(modelo);
        liberar(modelo);
        modelo = null;
        suelo.visible = false;
      };

      /** Volumen firmado por suma de tetraedros, en unidades del archivo. */
      const calcularVolumen = (raiz: import("three").Object3D) => {
        raiz.updateMatrixWorld(true);
        let volumen = 0;
        const a = new THREE.Vector3();
        const b = new THREE.Vector3();
        const c = new THREE.Vector3();

        raiz.traverse((hijo) => {
          const malla = hijo as import("three").Mesh;
          if (!malla.isMesh || !malla.geometry) return;
          const geo = malla.geometry.index
            ? malla.geometry.toNonIndexed()
            : malla.geometry;
          const pos = geo.getAttribute("position");
          if (!pos) return;
          for (let i = 0; i < pos.count; i += 3) {
            a.fromBufferAttribute(pos, i).applyMatrix4(malla.matrixWorld);
            b.fromBufferAttribute(pos, i + 1).applyMatrix4(malla.matrixWorld);
            c.fromBufferAttribute(pos, i + 2).applyMatrix4(malla.matrixWorld);
            volumen += a.dot(b.clone().cross(c)) / 6;
          }
          if (geo !== malla.geometry) geo.dispose();
        });

        return Math.abs(volumen);
      };

      const aplicarMaterialA = (raiz: import("three").Object3D) => {
        raiz.traverse((hijo) => {
          const malla = hijo as import("three").Mesh;
          if (malla.isMesh) malla.material = material;
        });
      };

      api.current = {
        aplicarMaterial: (m) => {
          material.color.setHex(m.color);
          material.metalness = m.metalness;
          material.roughness = m.roughness;
          material.needsUpdate = true;
        },
        reset: () => ajustarCamara(),
        limpiar: () => quitarModelo(),
        cargar: async (file) => {
          const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
          const buffer = await file.arrayBuffer();
          let objeto: import("three").Object3D;

          if (ext === "stl") {
            const { STLLoader } = await import(
              "three/examples/jsm/loaders/STLLoader.js"
            );
            const geo = new STLLoader().parse(buffer);
            geo.computeVertexNormals();
            objeto = new THREE.Mesh(geo, material);
          } else if (ext === "obj") {
            const { OBJLoader } = await import(
              "three/examples/jsm/loaders/OBJLoader.js"
            );
            objeto = new OBJLoader().parse(new TextDecoder().decode(buffer));
          } else if (ext === "glb" || ext === "gltf") {
            const { GLTFLoader } = await import(
              "three/examples/jsm/loaders/GLTFLoader.js"
            );
            const gltf = await new GLTFLoader().parseAsync(buffer, "");
            objeto = gltf.scene;
          } else if (ext === "fbx") {
            const { FBXLoader } = await import(
              "three/examples/jsm/loaders/FBXLoader.js"
            );
            objeto = new FBXLoader().parse(buffer, "");
          } else {
            throw new Error("Formato no soportado. Usa STL, OBJ, GLB o FBX.");
          }

          quitarModelo();
          const volumen = calcularVolumen(objeto);
          aplicarMaterialA(objeto);
          const grupo = new THREE.Group();
          grupo.add(objeto);
          const cajaInicial = new THREE.Box3().setFromObject(grupo);
          const centro = cajaInicial.getCenter(new THREE.Vector3());
          grupo.position.sub(centro);
          grupo.updateMatrixWorld(true);
          const cajaCentrada = new THREE.Box3().setFromObject(grupo);
          const tamano = cajaCentrada.getSize(new THREE.Vector3());
          const extension = Math.max(tamano.x, tamano.z, tamano.y) * 2.2;
          suelo.scale.set(extension, extension, 1);
          suelo.position.y = cajaCentrada.min.y - Math.max(tamano.y * 0.025, 0.01);
          suelo.visible = true;
          objeto.traverse((hijo) => {
            const malla = hijo as import("three").Mesh;
            if (malla.isMesh) {
              malla.castShadow = true;
              malla.receiveShadow = true;
            }
          });
          modelo = grupo;
          escena.add(grupo);
          ajustarCamara();
          return volumen;
        },
      };

      const redimensionar = () => {
        const w = nodo.clientWidth || 480;
        const h = nodo.clientHeight || 360;
        camara.aspect = w / h;
        camara.updateProjectionMatrix();
        render.setSize(w, h, false);
      };
      redimensionar();
      const observador = new ResizeObserver(redimensionar);
      observador.observe(nodo);

      let frame = 0;
      const animar = () => {
        frame = requestAnimationFrame(animar);
        controles.update();
        render.render(escena, camara);
      };
      animar();
      setListo(true);

      limpiarEscena = () => {
        cancelAnimationFrame(frame);
        observador.disconnect();
        quitarModelo();
        controles.dispose();
        material.dispose();
        suelo.geometry.dispose();
        sueloMaterial.dispose();
        entorno.dispose();
        pmrem.dispose();
        render.dispose();
        render.domElement.remove();
        api.current = null;
      };
    })().catch(() => {
      if (vivo) setError("No se pudo iniciar el visor 3D en este navegador.");
    });

    return () => {
      vivo = false;
      limpiarEscena();
    };
  }, []);

  /* -------- Material visual según metal seleccionado -------- */
  useEffect(() => {
    api.current?.aplicarMaterial(metal);
  }, [metal, listo]);

  /* -------- Carga de archivo (solo en memoria) -------- */
  const cargarArchivo = useCallback(async (file: File) => {
    setError(null);
    setCargando(true);
    try {
      const volumen = await api.current!.cargar(file);
      setVolumenUnidades(volumen);
      setNombreArchivo(file.name);
    } catch (e) {
      setVolumenUnidades(null);
      setNombreArchivo(null);
      setError(e instanceof Error ? e.message : "No se pudo leer el archivo 3D.");
    } finally {
      setCargando(false);
    }
  }, []);

  const limpiar = () => {
    api.current?.limpiar();
    setVolumenUnidades(null);
    setNombreArchivo(null);
    setError(null);
    if (inputArchivo.current) inputArchivo.current.value = "";
  };

  /* -------- Cálculo de peso -------- */
  const escala = UNIDADES.find((u) => u.id === unidad)?.aCm ?? 0.1;
  const factorNum = configuracion.factorSeguridad > 0 ? configuracion.factorSeguridad : 1;
  const densidad = densidades[metalId];
  const pesoArbolPorDefecto = Math.max(0, configuracion.factorEmpuje);
  const empujeEsPorcentaje = configuracion.modoEmpuje === "porcentaje";
  const pesoArbolEfectivo = Math.max(0, pesoArbol ?? pesoArbolPorDefecto);
  const pesoArbolCalculado = empujeEsPorcentaje ? (pesoTeorico ?? 0) * pesoArbolEfectivo / 100 : pesoArbolEfectivo;

  const volumenCm3 =
    volumenUnidades != null ? volumenUnidades * escala ** 3 : null;
  const pesoTeorico =
    volumenCm3 != null ? volumenCm3 * densidad * factorNum : null;
  const pesoConEmpuje = pesoTeorico != null ? pesoTeorico + pesoArbolCalculado : null;
  const pesoFinal = pesoConEmpuje;

  const inputCls =
    "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20";

  return (
    <div className={`space-y-5 ${compacto ? "p-1" : "p-5 sm:p-6 lg:p-8"}`}>
      <div className="flex items-center gap-2">
        <Boxes className="size-4 text-gold" aria-hidden="true" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
          Visualizador y peso 3D
        </span>
      </div>

      {/* Visor */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-viewer shadow-card">
        <div
          ref={contenedor}
          className={compacto ? "h-64 w-full" : "h-[420px] w-full"}
        />
        {!nombreArchivo && !cargando ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-viewer-foreground/50">
            {error ?? "Sube un archivo STL, OBJ, GLB o FBX para visualizarlo."}
          </p>
        ) : null}
        {cargando ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-viewer-foreground/70">
            Procesando modelo…
          </p>
        ) : null}
        {nombreArchivo ? (
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span className="max-w-[60vw] truncate rounded-full bg-viewer/70 px-3 py-1 text-[11px] text-viewer-foreground/80 backdrop-blur">
              {nombreArchivo}
            </span>
          </div>
        ) : null}
        <div className="absolute right-3 top-3 flex gap-2">
          <button
            type="button"
            onClick={() => api.current?.reset()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-viewer/70 text-viewer-foreground/80 backdrop-blur transition hover:text-gold"
            aria-label="Reencuadrar cámara"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </button>
          {nombreArchivo ? (
            <button
              type="button"
              onClick={limpiar}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-viewer/70 text-viewer-foreground/80 backdrop-blur transition hover:text-danger"
              aria-label="Quitar modelo"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Carga + unidad */}
      <div className={`grid gap-3 ${compacto ? "grid-cols-1" : "sm:grid-cols-2"}`}>
        <div className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Archivo 3D
          </span>
          <button
            type="button"
            onClick={() => inputArchivo.current?.click()}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-gold bg-accent px-4 text-sm font-medium text-foreground transition hover:brightness-105"
          >
            <Upload className="size-4" aria-hidden="true" />
            Subir modelo
          </button>
          <input
            ref={inputArchivo}
            type="file"
            accept=".stl,.obj,.glb,.gltf,.fbx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void cargarArchivo(file);
            }}
          />
        </div>

        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Unidad del archivo
          </span>
          <select
            value={unidad}
            onChange={(e) => setUnidad(e.target.value)}
            className={inputCls}
          >
            {UNIDADES.map((u) => (
              <option key={u.id} value={u.id}>
                {u.etiqueta}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Metales */}
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Metal
        </legend>
        <div className={`grid gap-2 ${compacto ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
          {METALES.map((m) => {
            const activo = m.id === metalId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMetalId(m.id)}
                aria-pressed={activo}
                className={`flex h-11 items-center gap-2 rounded-xl border px-3 text-left text-xs font-medium transition ${
                  activo
                    ? "border-gold bg-accent text-foreground shadow-card"
                    : "border-input bg-background text-muted-foreground hover:border-gold/60 hover:text-foreground"
                }`}
              >
                <span
                  className="size-3.5 shrink-0 rounded-full border border-black/10"
                  style={{
                    background: `#${m.color.toString(16).padStart(6, "0")}`,
                  }}
                  aria-hidden="true"
                />
                <span className="truncate">{m.nombre}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Árbol de colada */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Árbol de colada / empuje</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">Introduce el peso adicional real de esta fabricación. Tronco, ramas y botón/reservorio.</p>
          </div>
          <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold text-gold">{empujeEsPorcentaje ? "%" : "g"}</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-medium">Peso adicional</span>
            <div className="flex items-center gap-2">
              <input type="number" min="0" step="0.01" className={inputCls} value={pesoArbol ?? pesoArbolPorDefecto} onChange={(e) => setPesoArbol(Math.max(0, Number(e.target.value) || 0))} />
              <span className="text-xs text-muted-foreground">{empujeEsPorcentaje ? "%" : "g"}</span>
            </div>
          </label>
        </div>
      </section>

      {/* Resultados */}
      {pesoFinal != null && volumenCm3 != null && pesoTeorico != null && pesoConEmpuje != null ? (
        <div
          className={`grid gap-4 ${compacto ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-4"}`}
        >
          <article className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Volumen detectado
            </p>
            <p className="mt-2 text-xl font-semibold leading-none">
              {num(volumenCm3, 3)}{" "}
              <span className="text-sm font-medium text-muted-foreground">cm³</span>
            </p>
          </article>
          <article className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Peso teórico
            </p>
            <p className="mt-2 text-xl font-semibold leading-none">
              {num(pesoTeorico)}{" "}
              <span className="text-sm font-medium text-muted-foreground">g</span>
            </p>
          </article>
          <article className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Peso joyas + árbol
            </p>
            <p className="mt-2 text-xl font-semibold leading-none">
              {num(pesoConEmpuje)}{" "}
              <span className="text-sm font-medium text-muted-foreground">g</span>
            </p>
          </article>
          <article className="rounded-2xl border border-gold bg-accent p-4 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gold">
              Peso final
            </p>
            <p className="mt-2 text-2xl font-semibold leading-none">
              {num(pesoFinal)}{" "}
              <span className="text-sm font-medium text-muted-foreground">g</span>
            </p>
          </article>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-surface-muted p-5 text-center">
          <p className="text-sm text-muted-foreground">
            El peso estimado aparecerá al cargar un modelo 3D.
          </p>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Los archivos se procesan solo en tu navegador: no se guardan en el servidor y se
        eliminan al cerrar o recargar la página.
      </p>
    </div>
  );
}
