import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

type LabSettings = {
  caustics: number;
  dispersion: number;
  transmission: number;
  ior: number;
  lightPower: number;
};

function createBrilliantGeometry() {
  // Round brilliant study model: table, star/crown transition, girdle,
  // pavilion break and culet. Each triangle gets its own normal so facets
  // remain optically legible instead of becoming a smooth low-poly shell.
  const sides = 16;
  const rings = [
    { y: 0.48, radius: 0.43, offset: Math.PI / sides },
    { y: 0.18, radius: 0.78, offset: 0 },
    { y: 0.035, radius: 0.82, offset: 0 },
    { y: -0.08, radius: 0.73, offset: Math.PI / sides },
    { y: -0.60, radius: 0.075, offset: Math.PI / sides },
  ];
  const vertices: number[] = [];
  const pushTriangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    vertices.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };
  const points = rings.map((ring) => Array.from({ length: sides }, (_, i) => {
    const angle = (i / sides) * Math.PI * 2 + ring.offset;
    return new THREE.Vector3(Math.cos(angle) * ring.radius, ring.y, Math.sin(angle) * ring.radius);
  }));
  for (let r = 0; r < points.length - 1; r++) {
    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides;
      const a = points[r][i];
      const b = points[r][next];
      const c = points[r + 1][next];
      const d = points[r + 1][i];
      // Alternating diagonals avoid a repetitive, belt-like triangulation.
      if ((i + r) % 2 === 0) {
        pushTriangle(a, b, d);
        pushTriangle(b, c, d);
      } else {
        pushTriangle(a, b, c);
        pushTriangle(a, c, d);
      }
    }
  }
  const tableCenter = new THREE.Vector3(0, rings[0].y, 0);
  const culet = new THREE.Vector3(0, -0.68, 0);
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    pushTriangle(tableCenter, points[0][i], points[0][next]);
    pushTriangle(points[points.length - 1][i], culet, points[points.length - 1][next]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createGemMaterial(settings: LabSettings) {
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#f4f8ff"),
    metalness: 0,
    roughness: 0.025,
    transmission: settings.transmission,
    thickness: 1.8,
    ior: settings.ior,
    dispersion: settings.dispersion,
    specularIntensity: 1,
    specularColor: new THREE.Color("#ffffff"),
    envMapIntensity: 2.0,
    flatShading: true,
    clearcoat: 1,
    clearcoatRoughness: 0.015,
    side: THREE.DoubleSide,
    transparent: false,
  });
  material.customProgramCacheKey = () => "aurum-caustics-gem-lab-v1";
  material.onBeforeCompile = (shader) => {
    shader.uniforms.aurumCausticStrength = { value: settings.caustics };
    shader.uniforms.aurumCausticLight = { value: new THREE.Vector3(-0.55, 0.8, 0.42).normalize() };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vAurumWorldPosition;\nvarying vec3 vAurumWorldNormal;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvAurumWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvAurumWorldNormal = normalize(mat3(modelMatrix) * objectNormal);");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float aurumCausticStrength;\nuniform vec3 aurumCausticLight;\nvarying vec3 vAurumWorldPosition;\nvarying vec3 vAurumWorldNormal;")
      .replace("#include <color_fragment>", `#include <color_fragment>
        // Isolated artistic previsualization of concentrated refracted energy.
        // It is deliberately not presented as a physically solved ray-traced caustic.
        vec3 causticN = normalize(vAurumWorldNormal);
        float causticFacing = pow(max(dot(causticN, normalize(aurumCausticLight)), 0.0), 2.0);
        vec2 causticP = vAurumWorldPosition.xz * 17.0 + causticN.xy * 2.7;
        float causticA = sin(causticP.x * 2.1 + sin(causticP.y * 1.7));
        float causticB = sin(causticP.y * 2.8 - cos(causticP.x * 1.3));
        float causticFilament = pow(max(0.0, 1.0 - abs(causticA * causticB)), 9.0);
        float causticEnergy = causticFilament * causticFacing * aurumCausticStrength;
        vec3 causticSpectrum = vec3(0.55, 0.82, 1.0) * 0.42
          + vec3(1.0, 0.55, 0.28) * (0.18 + 0.12 * sin(causticP.x + causticP.y));
        diffuseColor.rgb += causticSpectrum * causticEnergy;
      `);
  };
  return material;
}

export function AurumCausticsLab() {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneObjectsRef = useRef<{ renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; gem: THREE.Mesh; material: THREE.MeshPhysicalMaterial; frame: number; observer: ResizeObserver } | null>(null);
  const [settings, setSettings] = useState<LabSettings>({ caustics: 0.65, dispersion: 0.018, transmission: 0.98, ior: 2.417, lightPower: 4.2 });
  const [isRotating, setIsRotating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch {
      setError("No se pudo iniciar WebGL. Comprueba la aceleración por hardware del navegador.");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setClearColor("#10151d", 1);
    renderer.domElement.className = "block h-full w-full";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#10151d");
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04).texture;
    scene.environment = environment;
    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 50);
    camera.position.set(2.65, 1.45, 4.9);
    camera.lookAt(0, 0, 0);

    const gemMaterial = createGemMaterial(settings);
    const gem = new THREE.Mesh(createBrilliantGeometry(), gemMaterial);
    gem.rotation.set(0.02, 0.12, 0);
    scene.add(gem);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.5, 64),
      new THREE.MeshStandardMaterial({ color: "#171c25", roughness: 0.88, metalness: 0.02 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.82;
    scene.add(floor);

    const ambient = new THREE.HemisphereLight("#dce9ff", "#1c2430", 0.85);
    scene.add(ambient);
    const key = new THREE.DirectionalLight("#ffffff", settings.lightPower);
    key.position.set(-3.5, 4.5, 3.2);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#8bbcff", 3.2);
    rim.position.set(3, 1.2, -3);
    scene.add(rim);
    const strip = new THREE.PointLight("#ffd9a0", 38, 12, 2);
    strip.position.set(2.4, 2.3, 2.6);
    scene.add(strip);

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    renderer.render(scene, camera);
    const frame = 0;
    sceneObjectsRef.current = { renderer, scene, camera, gem, material: gemMaterial, frame, observer };

    return () => {
      observer.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((item) => item.dispose());
        }
      });
      environment.dispose();
      room.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      sceneObjectsRef.current = null;
    };
    // Scene lifetime is intentionally independent from slider changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const current = sceneObjectsRef.current;
    if (!current) return;
    current.material.dispose();
    const nextMaterial = createGemMaterial(settings);
    current.gem.material = nextMaterial;
    current.material = nextMaterial;
    const key = current.scene.children.find((child) => child instanceof THREE.DirectionalLight && child.intensity > 3) as THREE.DirectionalLight | undefined;
    if (key) key.intensity = settings.lightPower;
    current.renderer.render(current.scene, current.camera);
  }, [settings]);

  useEffect(() => {
    const current = sceneObjectsRef.current;
    if (!current) return;
    const loop = () => {
      if (!isRotating) return;
      current.gem.rotation.y += 0.0035;
      current.renderer.render(current.scene, current.camera);
      current.frame = requestAnimationFrame(loop);
    };
    cancelAnimationFrame(current.frame);
    if (isRotating) current.frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(current.frame);
  }, [isRotating]);

  const update = (key: keyof LabSettings, value: number) => setSettings((previous) => ({ ...previous, [key]: value }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-500">Laboratorio óptico · Prototipo aislado</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">AURUM CAUSTICS · Diamante</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Diamante de talla brillante con facetas planas, entorno de estudio y controles ópticos independientes.</p>
        </div>
        <button type="button" onClick={() => setIsRotating((value) => !value)} className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition hover:border-gold/50">
          {isRotating ? "Pausar giro" : "Reanudar giro"}
        </button>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_290px]">
        <div ref={hostRef} className="relative h-[420px] min-w-0 overflow-hidden rounded-2xl border border-border bg-[#10151d] sm:h-[540px]">
          {error ? <div role="alert" className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-red-300">{error}</div> : null}
          <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white/70">TALLA BRILLANTE · IOR 2.417</div>
          <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-[10px] text-white/60">Previsualización óptica experimental</div>
        </div>
        <aside className="space-y-4 rounded-2xl border border-border bg-background p-4">
          <div>
            <h4 className="text-sm font-semibold">Parámetros de prueba</h4>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Ajustes locales; no cambian los presets guardados.</p>
          </div>
          <label className="block space-y-2">
            <span className="flex justify-between text-xs text-muted-foreground"><span>Energía experimental</span><strong className="text-foreground">{settings.caustics.toFixed(2)}</strong></span>
            <input aria-label="Intensidad del campo experimental" type="range" min="0" max="1.5" step="0.05" value={settings.caustics} onChange={(event) => update("caustics", Number(event.target.value))} className="w-full accent-amber-500" />
          </label>
          <label className="block space-y-2">
            <span className="flex justify-between text-xs text-muted-foreground"><span>Dispersión</span><strong className="text-foreground">{settings.dispersion.toFixed(3)}</strong></span>
            <input aria-label="Dispersión" type="range" min="0" max="0.04" step="0.001" value={settings.dispersion} onChange={(event) => update("dispersion", Number(event.target.value))} className="w-full accent-amber-500" />
          </label>
          <label className="block space-y-2">
            <span className="flex justify-between text-xs text-muted-foreground"><span>Transmisión</span><strong className="text-foreground">{settings.transmission.toFixed(2)}</strong></span>
            <input aria-label="Transmisión" type="range" min="0.2" max="1" step="0.02" value={settings.transmission} onChange={(event) => update("transmission", Number(event.target.value))} className="w-full accent-amber-500" />
          </label>
          <label className="block space-y-2">
            <span className="flex justify-between text-xs text-muted-foreground"><span>Índice de refracción</span><strong className="text-foreground">{settings.ior.toFixed(3)}</strong></span>
            <input aria-label="Índice de refracción" type="range" min="2.35" max="2.55" step="0.001" value={settings.ior} onChange={(event) => update("ior", Number(event.target.value))} className="w-full accent-amber-500" />
          </label>
          <label className="block space-y-2">
            <span className="flex justify-between text-xs text-muted-foreground"><span>Potencia de luz</span><strong className="text-foreground">{settings.lightPower.toFixed(1)}</strong></span>
            <input aria-label="Potencia de luz" type="range" min="0.5" max="8" step="0.1" value={settings.lightPower} onChange={(event) => update("lightPower", Number(event.target.value))} className="w-full accent-amber-500" />
          </label>
          <button type="button" onClick={() => setSettings({ caustics: 0.65, dispersion: 0.018, transmission: 0.98, ior: 2.417, lightPower: 4.2 })} className="w-full rounded-xl border border-border px-3 py-2 text-xs font-semibold transition hover:border-gold/50">Restablecer parámetros</button>
        </aside>
      </div>
      <div className="grid gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 sm:grid-cols-2">
        <div><p className="text-xs font-semibold text-foreground">Qué estamos evaluando</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Respuesta de transmisión, refracción y separación espectral en una geometría facetada de diamante.</p></div>
        <div><p className="text-xs font-semibold text-foreground">Límite de esta versión</p><p className="mt-1 text-xs leading-5 text-muted-foreground">El campo coloreado es una previsualización procedural experimental, no un cálculo de caústicas por trazado de rayos. No modifica AURUM RENDER ni sustituye su shader/BVH.</p></div>
      </div>
    </div>
  );
}
