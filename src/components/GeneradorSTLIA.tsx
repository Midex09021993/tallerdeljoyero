import { useCallback, useEffect, useRef, useState } from "react";
import { Download, ImagePlus, LoaderCircle, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import * as ort from "onnxruntime-web/webgpu";
import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

const MODEL_BASE = "https://huggingface.co/cgb/triposr-onnx-webgpu/resolve/main/";
const GRID = 64;
const BATCH = 2048;

type Stage = "idle" | "loading" | "preparing" | "generating" | "meshing" | "done" | "error";

function prepareImage(image: HTMLImageElement): ort.Tensor {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("El navegador no pudo preparar la imagen.");
  const source = document.createElement("canvas");
  source.width = image.naturalWidth;
  source.height = image.naturalHeight;
  const sourceCtx = source.getContext("2d", { willReadFrequently: true });
  if (!sourceCtx) throw new Error("No se pudo leer la imagen.");
  sourceCtx.drawImage(image, 0, 0);
  const pixels = sourceCtx.getImageData(0, 0, source.width, source.height);

  // TripoSR needs the subject isolated. Remove near-white background connected
  // to the image edges (common in product photos) while preserving white/silver
  // highlights that are enclosed inside the silhouette.
  const pixelCount = source.width * source.height;
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0, tail = 0;
  const isBackground = (index: number) => {
    const offset = index * 4;
    const r = pixels.data[offset]!, g = pixels.data[offset + 1]!, b = pixels.data[offset + 2]!;
    return r > 218 && g > 218 && b > 218 && Math.max(r, g, b) - Math.min(r, g, b) < 38;
  };
  const enqueue = (index: number) => {
    if (index < 0 || index >= pixelCount || visited[index] || !isBackground(index)) return;
    visited[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < source.width; x += 1) {
    enqueue(x);
    enqueue((source.height - 1) * source.width + x);
  }
  for (let y = 0; y < source.height; y += 1) {
    enqueue(y * source.width);
    enqueue(y * source.width + source.width - 1);
  }
  while (head < tail) {
    const index = queue[head++]!;
    pixels.data[index * 4 + 3] = 0;
    const x = index % source.width;
    const y = Math.floor(index / source.width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < source.width) enqueue(index + 1);
    if (y > 0) enqueue(index - source.width);
    if (y + 1 < source.height) enqueue(index + source.width);
  }
  sourceCtx.putImageData(pixels, 0, 0);

  let minX = source.width, minY = source.height, maxX = -1, maxY = -1;
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      if (pixels.data[(y * source.width + x) * 4 + 3]! > 8) {
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < minX || maxY < minY) throw new Error("La imagen está vacía o es transparente.");
  const w = maxX - minX + 1, h = maxY - minY + 1;
  const side = Math.max(w, h) / 0.85;
  const crop = document.createElement("canvas");
  crop.width = 512; crop.height = 512;
  const cropCtx = crop.getContext("2d", { willReadFrequently: true });
  if (!cropCtx) throw new Error("No se pudo preparar la imagen.");
  cropCtx.fillStyle = "rgb(128,128,128)";
  cropCtx.fillRect(0, 0, 512, 512);
  const scale = 512 / side;
  const dw = w * scale, dh = h * scale;
  const temp = document.createElement("canvas");
  temp.width = w; temp.height = h;
  const tempCtx = temp.getContext("2d", { willReadFrequently: true });
  if (!tempCtx) throw new Error("No se pudo recortar la imagen.");
  tempCtx.putImageData(sourceCtx.getImageData(minX, minY, w, h), 0, 0);
  cropCtx.drawImage(temp, (512 - dw) / 2, (512 - dh) / 2, dw, dh);
  ctx.drawImage(crop, 0, 0);
  const data = ctx.getImageData(0, 0, 512, 512).data;
  const rgb = new Float32Array(3 * 512 * 512);
  for (let i = 0; i < 512 * 512; i += 1) {
    rgb[i] = data[i * 4]! / 255;
    rgb[512 * 512 + i] = data[i * 4 + 1]! / 255;
    rgb[2 * 512 * 512 + i] = data[i * 4 + 2]! / 255;
  }
  return new ort.Tensor("float32", rgb, [1, 3, 512, 512]);
}

function samplePlane(plane: Float32Array, channel: number, x: number, y: number): number {
  const fx = Math.max(0, Math.min(63, ((x + 1) * 64 - 1) / 2));
  const fy = Math.max(0, Math.min(63, ((y + 1) * 64 - 1) / 2));
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const x1 = Math.min(63, x0 + 1), y1 = Math.min(63, y0 + 1);
  const dx = fx - x0, dy = fy - y0;
  const at = (yy: number, xx: number) => plane[channel * 4096 + yy * 64 + xx]!;
  return (at(y0, x0) * (1 - dx) + at(y0, x1) * dx) * (1 - dy)
    + (at(y1, x0) * (1 - dx) + at(y1, x1) * dx) * dy;
}

async function reconstruct(image: HTMLImageElement, report: (stage: Stage, message: string) => void) {
  report("loading", "Comprobando WebGPU y descargando el modelo (aprox. 485 MB, solo la primera vez)…");
  if (!("gpu" in navigator)) throw new Error("Este navegador no ofrece WebGPU. Prueba Chrome o Edge actualizado en un equipo compatible.");
  const adapter = await (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu?.requestAdapter();
  if (!adapter) throw new Error("No se encontró una GPU compatible con WebGPU.");
  const [graphResponse, weightsResponse, decoderResponse] = await Promise.all([
    fetch(MODEL_BASE + "triplane_q8.onnx"),
    fetch(MODEL_BASE + "triplane_q8.onnx.data"),
    fetch(MODEL_BASE + "decoder.onnx"),
  ]);
  if (!graphResponse.ok || !weightsResponse.ok || !decoderResponse.ok) throw new Error("No se pudieron descargar los archivos del modelo. Inténtalo de nuevo más tarde.");
  const [graph, weights, decoder] = await Promise.all([graphResponse.arrayBuffer(), weightsResponse.arrayBuffer(), decoderResponse.arrayBuffer()]);
  report("preparing", "Preparando la imagen localmente…");
  const input = prepareImage(image);
  report("generating", "La GPU está reconstruyendo la forma 3D. Puede tardar varios minutos…");
  const triplaneSession = await ort.InferenceSession.create(graph, {
    executionProviders: ["webgpu"],
    externalData: [{ path: "triplane_q8.onnx.data", data: new Uint8Array(weights) }],
    graphOptimizationLevel: "all",
  });
  const decoderSession = await ort.InferenceSession.create(decoder, {
    executionProviders: ["webgpu"],
    graphOptimizationLevel: "all",
  });
  try {
    const inputName = triplaneSession.inputNames[0];
    const outputName = triplaneSession.outputNames[0];
    if (!inputName || !outputName) throw new Error("El modelo de reconstrucción no contiene entradas o salidas válidas.");
    const encoded = await triplaneSession.run({ [inputName]: input });
    const planesTensor = encoded[outputName];
    if (!planesTensor) throw new Error("El modelo no devolvió los planos 3D esperados.");
    const planes = planesTensor.data as Float32Array;
    const count = GRID * GRID * GRID;
    const density = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    for (let start = 0; start < count; start += BATCH) {
      const end = Math.min(count, start + BATCH);
      const features = new Float32Array((end - start) * 120);
      for (let p = start; p < end; p += 1) {
        const x = (p % GRID) / (GRID - 1) * 1.74 - 0.87;
        const y = (Math.floor(p / GRID) % GRID) / (GRID - 1) * 1.74 - 0.87;
        const z = Math.floor(p / (GRID * GRID)) / (GRID - 1) * 1.74 - 0.87;
        const row = (p - start) * 120;
        for (let c = 0; c < 40; c += 1) {
          features[row + c] = samplePlane(planes, c, x, y);
          features[row + 40 + c] = samplePlane(planes.subarray(40 * 4096, 80 * 4096), c, x, z);
          features[row + 80 + c] = samplePlane(planes.subarray(80 * 4096, 120 * 4096), c, y, z);
        }
      }
      const decoderInputName = decoderSession.inputNames[0];
      if (!decoderInputName) throw new Error("El decodificador no tiene una entrada válida.");
      const decoded = await decoderSession.run({
        [decoderInputName]: new ort.Tensor("float32", features, [end - start, 120]),
      });
      const densityName = decoderSession.outputNames.find((name) => name.toLowerCase().includes("density")) ?? decoderSession.outputNames[0];
      if (!densityName) throw new Error("El decodificador no devolvió una salida de densidad.");
      const densityTensor = decoded[densityName];
      if (!densityTensor) throw new Error("El decodificador no devolvió densidad.");
      const d = densityTensor.data as Float32Array;
      const colorName = decoderSession.outputNames.find((name) => name.toLowerCase().includes("color"));
      const c = colorName ? decoded[colorName].data as Float32Array : null;
      density.set(d, start);
      if (c) colors.set(c, start * 3);
    }
    report("meshing", "Extrayendo la superficie y preparando el STL…");
    const material = new THREE.MeshStandardMaterial({ color: 0xc7bda9, metalness: 0.18, roughness: 0.34 });
    const surface = new MarchingCubes(GRID, material, false, false, 300000);
    surface.isolation = 25;
    surface.field = density;
    surface.update();
    const geometry = surface.geometry.clone();
    const generatedTriangles = geometry.getAttribute("position").count / 3;
    geometry.computeVertexNormals();
    surface.geometry.dispose();
    material.dispose();
    if (generatedTriangles >= 300000) {
      geometry.dispose();
      throw new Error("La reconstrucción produjo una malla saturada y no fiable. Usa una imagen con la joya aislada y vuelve a intentarlo; no se ha ofrecido un STL defectuoso.");
    }
    triplaneSession.release();
    decoderSession.release();
    return geometry;
  } catch (error) {
    triplaneSession.release();
    decoderSession.release();
    throw error;
  }
}

export function GeneradorSTLIA() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [message, setMessage] = useState("La imagen se procesa en tu navegador; no se envía a un servicio de generación.");
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const busy = ["loading", "preparing", "generating", "meshing"].includes(stage);

  useEffect(() => {
    if (!geometry || !viewerRef.current) return;
    const host = viewerRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#171815");
    const camera = new THREE.PerspectiveCamera(40, host.clientWidth / Math.max(host.clientHeight, 1), 0.01, 100);
    camera.position.set(2.7, 2.1, 3.1);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.replaceChildren(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x48443b, 2.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(3, 5, 4); scene.add(key);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xd5c6a5, metalness: 0.2, roughness: 0.3 }));
    mesh.geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    mesh.geometry.boundingBox?.getCenter(center);
    mesh.position.sub(center);
    scene.add(mesh);
    const size = new THREE.Vector3();
    mesh.geometry.boundingBox?.getSize(size);
    const max = Math.max(size.x, size.y, size.z, 1);
    mesh.scale.setScalar(2 / max);
    const animate = () => { renderer.render(scene, camera); };
    animate();
    const resize = () => { camera.aspect = host.clientWidth / Math.max(host.clientHeight, 1); camera.updateProjectionMatrix(); renderer.setSize(host.clientWidth, host.clientHeight); animate(); };
    const observer = new ResizeObserver(resize); observer.observe(host);
    let down = false, lastX = 0, lastY = 0;
    const pointerDown = (event: PointerEvent) => { down = true; lastX = event.clientX; lastY = event.clientY; renderer.domElement.setPointerCapture(event.pointerId); };
    const pointerMove = (event: PointerEvent) => { if (!down) return; mesh.rotation.y += (event.clientX - lastX) * 0.01; mesh.rotation.x += (event.clientY - lastY) * 0.01; lastX = event.clientX; lastY = event.clientY; animate(); };
    const pointerUp = () => { down = false; };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("pointercancel", pointerUp);
    return () => { observer.disconnect(); renderer.domElement.removeEventListener("pointerdown", pointerDown); renderer.domElement.removeEventListener("pointermove", pointerMove); renderer.domElement.removeEventListener("pointerup", pointerUp); renderer.domElement.removeEventListener("pointercancel", pointerUp); renderer.dispose(); geometry.dispose(); host.replaceChildren(); };
  }, [geometry]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const chooseFile = useCallback((next: File | null) => {
    if (!next) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(next.type)) { setMessage("Usa una imagen PNG, JPG o WebP."); return; }
    if (next.size > 15 * 1024 * 1024) { setMessage("La imagen debe pesar 15 MB o menos."); return; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next); setPreviewUrl(URL.createObjectURL(next)); setGeometry(null); setStage("idle");
    setMessage("Imagen cargada. Para mejores resultados, usa un diseño centrado y fondo transparente.");
  }, [previewUrl]);

  const generate = async () => {
    if (!previewUrl) return;
    setStage("loading");
    try {
      const image = new Image();
      image.src = previewUrl;
      await image.decode();
      const result = await reconstruct(image, (nextStage, nextMessage) => { setStage(nextStage); setMessage(nextMessage); });
      setGeometry(result);
      setStage("done");
      setMessage("Modelo generado en este dispositivo. Revisa la geometría antes de fabricar la pieza.");
    } catch (error) {
      setStage("error");
      setMessage(error instanceof Error ? error.message : "No se pudo generar el modelo.");
    }
  };

  const downloadSTL = () => {
    if (!geometry) return;
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    const data = new STLExporter().parse(mesh, { binary: true });
    const blob = new Blob([data], { type: "model/stl" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = (file?.name.replace(/\.[^.]+$/, "") || "joya-generada") + ".stl";
    anchor.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 text-white">
      <div className="rounded-2xl border border-[#d8bd7b]/25 bg-[#11120f] p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-[#d8bd7b]/25 bg-[#d8bd7b]/10 text-[#d8bd7b]"><Sparkles className="size-6" /></div>
          <div><h3 className="text-xl font-semibold">Generador STL con IA</h3><p className="mt-1 text-sm leading-6 text-white/60">Reconstrucción 3D local con TripoSR y WebGPU. Sin cuenta, API de pago ni envío de tu imagen a un servidor de generación.</p></div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1.1fr]">
          <div className="rounded-xl border border-dashed border-white/20 bg-black/20 p-4">
            <label htmlFor="stl-image" className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 text-center">
              {previewUrl ? <img src={previewUrl} alt="Imagen de referencia" className="max-h-56 max-w-full rounded-lg object-contain" /> : <><ImagePlus className="size-9 text-[#d8bd7b]" /><span className="font-medium">Seleccionar imagen</span><span className="text-xs text-white/45">PNG, JPG o WebP · máximo 15 MB</span></>}
            </label>
            <input id="stl-image" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy} onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
            {file && <p className="mt-3 break-all text-xs text-white/50">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>}
            <button type="button" onClick={generate} disabled={!file || busy} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#d8bd7b] px-4 py-3 text-sm font-semibold text-[#17160f] transition hover:bg-[#ead6a3] disabled:cursor-not-allowed disabled:opacity-45">
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{busy ? "Procesando en tu equipo…" : "Generar modelo 3D"}
            </button>
          </div>
          <div className="min-h-64 overflow-hidden rounded-xl border border-white/10 bg-[#171815]">
            {geometry ? <div ref={viewerRef} className="h-72 w-full touch-none sm:h-96" aria-label="Vista 3D del modelo generado" /> : <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 p-6 text-center text-white/45"><Sparkles className="size-8 text-[#d8bd7b]/70" /><p className="max-w-xs text-sm">Aquí aparecerá la malla 3D generada. Podrás girarla con el ratón o el dedo.</p></div>}
          </div>
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[.025] p-3 text-sm text-white/65" role="status" aria-live="polite">
          {busy ? <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-[#d8bd7b]" /> : <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#d8bd7b]" />}
          <span>{message}</span>
        </div>
        {stage === "done" && <button type="button" onClick={downloadSTL} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d8bd7b]/35 px-4 py-3 text-sm font-semibold text-[#e4ce94] transition hover:bg-[#d8bd7b]/10"><Download className="size-4" /> Descargar STL binario</button>}
        {stage === "error" && <button type="button" onClick={() => { setStage("idle"); setMessage("Corrige el problema indicado e inténtalo de nuevo."); }} className="ml-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm text-white/75"><RotateCcw className="size-4" /> Volver a intentar</button>}
        <p className="mt-4 text-xs leading-5 text-white/40">Importante: la primera descarga del modelo ronda los 485 MB. Requiere Chrome o Edge actualizado con WebGPU compatible y memoria suficiente. El STL no incorpora unidades físicas; esta reconstrucción es una referencia inicial, no CAD listo para fundición. Verifica escala, espesor, cierre de malla y engastes en tu software de modelado.</p>
      </div>
    </div>
  );
}
