import { useCallback, useEffect, useState } from "react";
import { Download, ImagePlus, LoaderCircle, RotateCcw, ShieldCheck, Sparkles, Ruler } from "lucide-react";
import * as ort from "onnxruntime-web/webgpu";
import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { VisorPesoJoyeria } from "@/components/VisorPesoJoyeria";

const MODEL_BASE = "https://huggingface.co/cgb/triposr-onnx-webgpu/resolve/main/";
const GRID = 64;
const BATCH = 2048;

async function readTripoModelWithProgress(
  response: Response,
  onProgress: (loaded: number, total: number | null) => void,
): Promise<ArrayBuffer> {
  if (!response.body) {
    const buffer = await response.arrayBuffer();
    onProgress(buffer.byteLength, buffer.byteLength);
    return buffer;
  }
  const header = Number(response.headers.get("content-length"));
  const total = Number.isFinite(header) && header > 0 ? header : null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  const output = total === null ? null : new Uint8Array(total);
  let loaded = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    if (result.value) {
      if (output) output.set(result.value, loaded);
      else chunks.push(result.value);
      loaded += result.value.byteLength;
      onProgress(loaded, total);
    }
  }
  if (output) {
    if (loaded !== output.byteLength) return output.slice(0, loaded).buffer;
    return output.buffer;
  }
  const combined = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined.buffer;
}

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
  // El decodificador espera coordenadas normalizadas a [-1, 1]; la rejilla
  // geométrica se consulta dentro del radio original de TripoSR (0.87).
  const nx = Math.max(-1, Math.min(1, x / 0.87));
  const ny = Math.max(-1, Math.min(1, y / 0.87));
  const fx = Math.max(0, Math.min(63, ((nx + 1) * 64 - 1) / 2));
  const fy = Math.max(0, Math.min(63, ((ny + 1) * 64 - 1) / 2));
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
  let lastProgressUpdate = 0;
  const weightsPromise = readTripoModelWithProgress(weightsResponse, (loaded, total) => {
    const now = Date.now();
    if (now - lastProgressUpdate < 150 && total !== null && loaded < total) return;
    lastProgressUpdate = now;
    const loadedMb = (loaded / (1024 * 1024)).toFixed(1);
    const detail = total === null
      ? loadedMb + " MB descargados"
      : Math.min(100, Math.round((loaded / total) * 100)) + "% · " + loadedMb + " de " + (total / (1024 * 1024)).toFixed(1) + " MB";
    report("loading", "Descargando los pesos del modelo: " + detail + ". La descarga inicial puede rondar los 485 MB…");
  });
  const [graph, weights, decoder] = await Promise.all([
    graphResponse.arrayBuffer(),
    weightsPromise,
    decoderResponse.arrayBuffer(),
  ]);
  report("preparing", "Descarga completa. Preparando la imagen localmente…");
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
      density.set(d, start);
    }
    let occupied = 0;
    for (let i = 0; i < density.length; i += 1) {
      const value = density[i]!;
      if (!Number.isFinite(value)) throw new Error("El modelo devolvió valores de densidad no válidos.");
      if (value >= 25) occupied += 1;
    }
    const occupancy = occupied / count;
    if (occupancy < 0.0001 || occupancy > 0.35) {
      throw new Error("La reconstrucción no produjo una superficie 3D fiable. Prueba una imagen con la joya aislada, centrada y sobre fondo gris; no se generó un STL.");
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
  const [generatedSTL, setGeneratedSTL] = useState<File | null>(null);
  const [dimensionMm, setDimensionMm] = useState(25);
  const busy = ["loading", "preparing", "generating", "meshing"].includes(stage);


  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const chooseFile = useCallback((next: File | null) => {
    if (!next) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(next.type)) { setMessage("Usa una imagen PNG, JPG o WebP."); return; }
    if (next.size > 15 * 1024 * 1024) { setMessage("La imagen debe pesar 15 MB o menos."); return; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next); setPreviewUrl(URL.createObjectURL(next)); setGeneratedSTL(null); setStage("idle");
    setMessage("Imagen cargada. Para mejores resultados, usa un diseño centrado y fondo transparente.");
  }, [previewUrl]);

  const generate = async () => {
    if (!previewUrl) return;
    setGeneratedSTL(null);
    setStage("loading");
    try {
      const image = new Image();
      image.src = previewUrl;
      await image.decode();
      const result = await reconstruct(image, (nextStage, nextMessage) => { setStage(nextStage); setMessage(nextMessage); });
      result.computeBoundingBox();
      const position = result.getAttribute("position");
      const dimensions = result.boundingBox?.getSize(new THREE.Vector3());
      if (!position || position.count < 3 || !dimensions || ![dimensions.x, dimensions.y, dimensions.z].every(Number.isFinite) || Math.max(dimensions.x, dimensions.y, dimensions.z) <= 1e-5 || Math.min(dimensions.x, dimensions.y, dimensions.z) < 0) {
        result.dispose();
        throw new Error("La malla generada está vacía o degenerada. No se creó un STL.");
      }
      // Convención de exportación: la dimensión mayor del STL se expresa en milímetros.
      // Esto corrige la escala física, pero no valida la fidelidad ni la fabricabilidad de la geometría.
      const dimensionMaxima = Math.max(dimensions.x, dimensions.y, dimensions.z);
      if (!Number.isFinite(dimensionMm) || dimensionMm < 1 || dimensionMm > 200) {
        result.dispose();
        throw new Error("Indica una dimensión mayor entre 1 y 200 mm.");
      }
      const factorEscala = dimensionMm / dimensionMaxima;
      result.scale(factorEscala, factorEscala, factorEscala);
      result.computeBoundingBox();
      const material = new THREE.MeshStandardMaterial();
      const exportMesh = new THREE.Mesh(result, material);
      const data = new STLExporter().parse(exportMesh, { binary: true });
      const blob = new Blob([data], { type: "model/stl" });
      const baseName = file?.name.replace(/\\.[^.]+$/, "") || "joya-generada";
      const outputFile = new File([blob], `${baseName}.stl`, { type: "model/stl" });
      material.dispose();
      result.dispose();
      setGeneratedSTL(outputFile);
      setStage("done");
      setMessage("Modelo generado localmente. La vista previa usa el Visualizador y peso 3D existente. El peso es solo orientativo hasta definir la escala física en CAD.");
    } catch (error) {
      setStage("error");
      setMessage(error instanceof Error ? error.message : "No se pudo generar el modelo.");
    }
  };

  const downloadSTL = () => {
    if (!generatedSTL) return;
    const url = URL.createObjectURL(generatedSTL);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = generatedSTL.name;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
            <label htmlFor="stl-dimension-mm" className="mt-4 flex items-center gap-2 text-sm font-medium text-white/80"><Ruler className="size-4 text-[#d8bd7b]" /> Dimensión mayor del modelo (mm)</label>
            <div className="mt-2 flex items-center gap-3">
              <input id="stl-dimension-mm" type="number" min={1} max={200} step={0.5} value={dimensionMm} disabled={busy} onChange={(event) => setDimensionMm(Number(event.target.value))} className="h-11 w-full rounded-xl border border-white/15 bg-black/25 px-3 text-sm text-white outline-none focus:border-[#d8bd7b] disabled:opacity-50" aria-describedby="stl-dimension-help" />
              <span className="text-sm text-white/50">mm</span>
            </div>
            <p id="stl-dimension-help" className="mt-1 text-xs leading-5 text-white/45">Escala uniformemente la dimensión más larga. Rango: 1–200 mm.</p>
            <button type="button" onClick={generate} disabled={!file || busy || !Number.isFinite(dimensionMm) || dimensionMm < 1 || dimensionMm > 200} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#d8bd7b] px-4 py-3 text-sm font-semibold text-[#17160f] transition hover:bg-[#ead6a3] disabled:cursor-not-allowed disabled:opacity-45">
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{busy ? "Procesando en tu equipo…" : "Generar modelo 3D"}
            </button>
          </div>
          <div className="min-h-64 overflow-hidden rounded-xl border border-white/10 bg-[#171815]">
            {generatedSTL ? <div className="min-w-0 p-2 sm:p-3"><VisorPesoJoyeria compacto archivoInicial={generatedSTL} /></div> : <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 p-6 text-center text-white/45"><Sparkles className="size-8 text-[#d8bd7b]/70" /><p className="max-w-xs text-sm">Aquí aparecerá la vista previa del STL usando el Visualizador y peso 3D existente.</p></div>}
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
