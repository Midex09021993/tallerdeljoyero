import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { registrarEvento } from "@/lib/analytics";
import { Boxes, RotateCcw, Trash2, Upload, Save, CheckCircle2 } from "lucide-react";
import { CLAVES_CALCULADORAS, DEFAULT_CONFIG_VISUALIZADOR, leerConfigVisualizador } from "@/lib/calculadoras-config";
import { useConfigSistema } from "@/lib/taller-db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  | "plataPd900"
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
  { id: "plataPd900", nombre: "Plata-Paladio 900 (Ag 90 / Pd 10)", densidad: 10.6, color: 0xd9dde1, metalness: 1, roughness: 0.17 },
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

export function VisorPesoJoyeria({ compacto = false, archivoInicial = null, archivoOrigen = null, modoPublico = false }: { compacto?: boolean; archivoInicial?: File | null; archivoOrigen?: { ruta: string; proyecto: string } | null; modoPublico?: boolean }) {
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
  const [arrastrandoArchivo, setArrastrandoArchivo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [volumenUnidades, setVolumenUnidades] = useState<number | null>(null);
  const [guardandoAnalisis, setGuardandoAnalisis] = useState(false);
  const [analisisGuardado, setAnalisisGuardado] = useState(false);
  const [analisisPendiente, setAnalisisPendiente] = useState<{ nombre: string; pesoFinal: number; volumenCm3: number; metal: string; unidad: string; guardadoEn: number } | null>(null);

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

  useEffect(() => {
    if (listo && archivoInicial) void cargarArchivo(archivoInicial);
  }, [listo, archivoInicial]);

  /* -------- Material visual según metal seleccionado -------- */
  useEffect(() => {
    api.current?.aplicarMaterial(metal);
  }, [metal, listo]);

  /* -------- Carga de archivo (solo en memoria) -------- */
  const cargarArchivo = useCallback(async (file: File) => {
    registrarEvento("tool_started", { tool_id: "peso", file_type: file.name.split(".").pop()?.toLowerCase() || "unknown" });
    setError(null);
    setCargando(true);
    try {
      const volumen = await api.current!.cargar(file);
      setVolumenUnidades(volumen);
      setNombreArchivo(file.name);
      setAnalisisGuardado(false);
      registrarEvento("tool_completed", { tool_id: "peso" });
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
  const volumenCm3 =
    volumenUnidades != null ? volumenUnidades * escala ** 3 : null;
  const pesoTeorico =
    volumenCm3 != null ? volumenCm3 * densidad * factorNum : null;
  const pesoArbolEfectivo = Math.max(0, pesoArbol ?? pesoArbolPorDefecto);
  const pesoArbolCalculado = empujeEsPorcentaje
    ? (pesoTeorico ?? 0) * pesoArbolEfectivo / 100
    : pesoArbolEfectivo;
  const pesoConEmpuje = pesoTeorico != null ? pesoTeorico + pesoArbolCalculado : null;
  const pesoFinal = pesoConEmpuje;

  useEffect(() => {
    if (modoPublico || typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem("aurum_peso_draft");
      if (!raw) return;
      const draft = JSON.parse(raw) as { nombre?: unknown; pesoFinal?: unknown; volumenCm3?: unknown; metal?: unknown; unidad?: unknown; guardadoEn?: unknown };
      if (typeof draft.nombre === "string" && typeof draft.pesoFinal === "number" && typeof draft.volumenCm3 === "number" && typeof draft.metal === "string" && typeof draft.unidad === "string" && typeof draft.guardadoEn === "number") {
        setAnalisisPendiente({ nombre: draft.nombre, pesoFinal: draft.pesoFinal, volumenCm3: draft.volumenCm3, metal: draft.metal, unidad: draft.unidad, guardadoEn: draft.guardadoEn });
      }
    } catch {
      window.sessionStorage.removeItem("aurum_peso_draft");
    }
  }, [modoPublico]);

  useEffect(() => {
    setAnalisisGuardado(false);
  }, [volumenUnidades, unidad, metalId, pesoArbol, configuracion.factorSeguridad, configuracion.factorEmpuje, configuracion.modoEmpuje]);

  const guardarAnalisis = async () => {
    if (!archivoOrigen?.ruta || volumenUnidades == null || volumenCm3 == null || pesoTeorico == null || pesoFinal == null) return;
    setGuardandoAnalisis(true);
    try {
      const { data: usuarioData, error: usuarioError } = await supabase.auth.getUser();
      if (usuarioError) throw usuarioError;
      const usuario = usuarioData.user;
      if (!usuario) throw new Error("Inicia sesión para guardar el análisis en Mi Nube.");

      const cliente = supabase as unknown as {
        from: (tabla: string) => {
          insert: (valores: Record<string, string | number>) => Promise<{ error: { message: string } | null }>;
        };
      };
      const { error: guardadoError } = await cliente.from("analisis_peso_joyeria").insert({
        user_id: usuario.id,
        archivo_ruta: archivoOrigen.ruta,
        archivo_nombre: nombreArchivo ?? archivoInicial?.name ?? "modelo.stl",
        proyecto_nombre: archivoOrigen.proyecto,
        volumen_archivo: volumenUnidades,
        unidad_archivo: unidad,
        volumen_cm3: volumenCm3,
        metal_id: metalId,
        metal_nombre: metal.nombre,
        densidad_g_cm3: densidad,
        factor_seguridad: factorNum,
        peso_joya_g: pesoTeorico,
        modo_arbol: empujeEsPorcentaje ? "porcentaje" : "gramos",
        valor_arbol: pesoArbol ?? pesoArbolPorDefecto,
        peso_arbol_g: pesoArbolCalculado,
        peso_final_g: pesoFinal,
        version_calculo: 1,
      });
      if (guardadoError) throw new Error(guardadoError.message);
      setAnalisisGuardado(true);
      toast.success("Análisis guardado en Mi Nube.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudo guardar el análisis.");
    } finally {
      setGuardandoAnalisis(false);
    }
  };

  const inputCls =
    "h-12 w-full rounded-2xl border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/10";

  return (
    <div className={`space-y-5 ${compacto ? "p-1" : "p-5 sm:p-6 lg:p-8"}`}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="size-4 text-gold-deep" aria-hidden="true" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-deep">
              Visualizador y peso 3D
            </span>
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Peso estimado de la joya</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Carga tu modelo, selecciona el material y añade el peso real del árbol de colada.
          </p>
        </div>
        {nombreArchivo ? (
          <span className="max-w-full truncate rounded-full border border-border bg-card px-3 py-1.5 text-[10px] font-medium text-muted-foreground sm:max-w-[280px]">
            {nombreArchivo}
          </span>
        ) : null}
      </div>

      {analisisPendiente ? (
        <div className="mb-3 rounded-2xl border border-gold/35 bg-accent/30 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Recuperamos tu cálculo anterior</p>
              <p className="mt-1 text-xs text-muted-foreground">{analisisPendiente.nombre} · {analisisPendiente.metal} · {num(analisisPendiente.pesoFinal)} g estimados · {num(analisisPendiente.volumenCm3, 4)} cm³</p>
              <p className="mt-1 text-xs text-muted-foreground">Conservamos el resultado durante el registro. Para guardarlo permanentemente, carga el STL en Mi Nube y ábrelo desde allí.</p>
            </div>
            <button type="button" onClick={() => { window.sessionStorage.removeItem("aurum_peso_draft"); setAnalisisPendiente(null); }} className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-semibold">Cerrar aviso</button>
          </div>
        </div>
      ) : null}

      {nombreArchivo ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/25 bg-accent/20 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Guardar cálculo de peso</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {archivoOrigen?.ruta
                ? "Guarda los resultados vinculados al STL original de Mi Nube, sin duplicar el archivo."
                : "Para vincular el cálculo a Mi Nube, abre el STL desde tu carpeta en Mi Nube."}
            </p>
          </div>
          {modoPublico ? (
            <a href="/auth" onClick={() => {
              if (pesoFinal == null || volumenCm3 == null || !nombreArchivo) return;
              try {
                window.sessionStorage.setItem("aurum_peso_draft", JSON.stringify({ nombre: nombreArchivo, pesoFinal, volumenCm3, metal: metal.nombre, unidad, guardadoEn: Date.now() }));
              } catch {
                toast.error("No se pudo conservar el cálculo en este navegador. Mantén esta página abierta mientras te registras.");
              }
            }} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-black transition hover:brightness-105">
              <Save className="size-4" /> Crear cuenta para guardar
            </a>
          ) : (
            <button
              type="button"
              onClick={() => void guardarAnalisis()}
              disabled={!archivoOrigen?.ruta || pesoFinal == null || guardandoAnalisis || analisisGuardado}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {analisisGuardado ? <CheckCircle2 className="size-4" /> : <Save className="size-4" />}
              {guardandoAnalisis ? "Guardando…" : analisisGuardado ? "Cálculo guardado" : "Guardar cálculo"}
            </button>
          )}
        </div>
      ) : null}

      {/* Visor y zona de carga por clic o arrastre */}
      <div
        className={`relative overflow-hidden rounded-3xl border bg-viewer shadow-card transition-colors ${
          arrastrandoArchivo ? "border-gold ring-2 ring-gold/40" : "border-border"
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          setArrastrandoArchivo(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setArrastrandoArchivo(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setArrastrandoArchivo(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setArrastrandoArchivo(false);
          const file = event.dataTransfer.files?.[0];
          if (!file) return;
          const extension = file.name.split(".").pop()?.toLowerCase();
          if (!["stl", "obj", "glb", "gltf", "fbx"].includes(extension ?? "")) {
            setError("Formato no compatible. Usa STL, OBJ, GLB o FBX.");
            return;
          }
          void cargarArchivo(file);
        }}
      >
        <div
          ref={contenedor}
          className={compacto ? "h-[480px] w-full" : "h-[560px] w-full sm:h-[680px]"}
        />
        {!nombreArchivo && !cargando ? (
          <button
            type="button"
            onClick={() => inputArchivo.current?.click()}
            className={`absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold ${
              arrastrandoArchivo ? "bg-gold/10 text-gold" : "text-viewer-foreground/70 hover:bg-white/[0.03] hover:text-viewer-foreground"
            }`}
          >
            <span className="flex size-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-gold">
              <Upload className="size-6" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-viewer-foreground">
              {arrastrandoArchivo ? "Suelta el archivo para cargarlo" : "Sube o arrastra tu modelo 3D aquí"}
            </span>
            <span className="text-xs text-viewer-foreground/50">STL · OBJ · GLB · FBX</span>
            {error ? <span className="text-xs text-red-300">{error}</span> : null}
          </button>
        ) : null}
        {cargando ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35 text-sm text-viewer-foreground/90">
            Procesando modelo…
          </p>
        ) : null}
        <div className="absolute right-3 top-3 z-10 flex gap-2">
          <button
            type="button"
            onClick={() => api.current?.reset()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-viewer/70 text-viewer-foreground/80 backdrop-blur transition hover:text-gold-deep"
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
          <p className="text-xs text-muted-foreground">
            Puedes hacer clic en el visor o arrastrar un archivo directamente al recuadro.
          </p>
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
      <fieldset className="space-y-3 rounded-3xl border border-border bg-card/60 p-4 sm:p-5">
        <legend className="sr-only">Metal de la joya</legend>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-deep">01 · Metal</p>
            <p className="mt-1 text-xs text-muted-foreground">Elige el acabado de tu joya</p>
          </div>
          <span className="max-w-[48%] text-right text-[11px] leading-5 text-muted-foreground">
            {metal.nombre} · {num(densidad, 2)} g/cm³
          </span>
        </div>
        <div className="space-y-3">
          {([
            { titulo: "Oro", ids: ["oro18a", "oro18b", "oro18r", "oro14"] },
            { titulo: "Plata y aleaciones de plata", ids: ["plata925", "plata950", "plata970", "plataPd900"] },
            { titulo: "Metales del grupo del platino", ids: ["platino"] },
          ] as const).map((familia) => (
            <section key={familia.titulo} className="space-y-1.5">
              <h3 className="px-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{familia.titulo}</h3>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {METALES.filter((m) => (familia.ids as readonly string[]).includes(m.id)).map((m) => {
                  const activo = m.id === metalId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMetalId(m.id)}
                      aria-pressed={activo}
                      className={`flex min-h-9 w-full items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${
                        activo
                          ? "border-gold bg-accent text-foreground shadow-[0_3px_10px_rgba(180,140,50,0.08)]"
                          : "border-input bg-background text-foreground hover:border-gold/50 hover:bg-accent/30"
                      }`}
                    >
                      <span
                        className="size-3 shrink-0 rounded-full border border-black/10 shadow-sm"
                        style={{
                          background: `#${m.color.toString(16).padStart(6, "0")}`,
                        }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate">{m.nombre}</span>
                      {activo ? (
                        <span className="shrink-0 text-[8px] font-bold uppercase tracking-[0.12em] text-gold-deep">Activo</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </fieldset>

      {/* Árbol de colada */}
      <section className="rounded-3xl border border-border bg-card/60 p-4 shadow-card sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Árbol de colada / empuje</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Introduce el peso adicional real de esta fabricación: tronco, ramas y botón/reservorio.
            </p>
          </div>
          <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold text-gold-deep">{empujeEsPorcentaje ? "%" : "g"}</span>
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
        <section className="space-y-3">
          <article className="relative overflow-hidden rounded-3xl border border-gold/35 bg-gradient-to-br from-accent via-card to-card p-5 shadow-card sm:p-6">
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-deep">
                  Peso final estimado
                </p>
                <p className="mt-2 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  {num(pesoFinal)}
                  <span className="ml-2 text-base font-medium text-muted-foreground">g</span>
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Joya + {num(pesoArbolCalculado)} g de árbol de colada
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 px-4 py-3 backdrop-blur">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Material</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{metal.nombre}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Densidad {num(densidad, 2)} g/cm³</p>
              </div>
            </div>
          </article>

          <div className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Volumen</p>
              <p className="mt-2 text-xl font-semibold">{num(volumenCm3, 3)} <span className="text-xs font-medium text-muted-foreground">cm³</span></p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Peso de la joya</p>
              <p className="mt-2 text-xl font-semibold">{num(pesoTeorico)} <span className="text-xs font-medium text-muted-foreground">g</span></p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Árbol / empuje</p>
              <p className="mt-2 text-xl font-semibold">{num(pesoArbolCalculado)} <span className="text-xs font-medium text-muted-foreground">g</span></p>
            </article>
          </div>
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-surface-muted p-5 text-center">
          <p className="text-sm font-medium">Carga un modelo 3D para calcular su peso.</p>
          <p className="mt-1 text-xs text-muted-foreground">El resultado aparecerá automáticamente al procesar el volumen.</p>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Los archivos se procesan solo en tu navegador: no se guardan en el servidor y se
        eliminan al cerrar o recargar la página.
      </p>
    </div>
  );
}
