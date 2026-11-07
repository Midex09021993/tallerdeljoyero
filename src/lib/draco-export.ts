export type AurumDracoCompressionResult = {
  blob: Blob; compressed: boolean; primitiveCount: number; originalBytes: number; outputBytes: number;
};
export async function compressAurumGlbWithDraco(source: ArrayBuffer): Promise<AurumDracoCompressionResult> {
  const originalBlob = new Blob([source], { type: "model/gltf-binary" });
  const fallback = (): AurumDracoCompressionResult => ({ blob: originalBlob, compressed: false, primitiveCount: 0, originalBytes: originalBlob.size, outputBytes: originalBlob.size });
  if (typeof Worker === "undefined") return fallback();
  let worker: Worker;
  try { worker = new Worker("/workers/aurum-draco-compressor.worker.js"); }
  catch (error) { console.warn("[AURUM Draco] No se pudo iniciar el worker; se conserva el GLB original.", error); return fallback(); }
  const id = `aurum-draco-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return await new Promise((resolve) => {
    let settled = false;
    const finish = (result: AurumDracoCompressionResult) => { if (settled) return; settled = true; window.clearTimeout(timeout); worker.terminate(); resolve(result); };
    const timeout = window.setTimeout(() => { console.warn("[AURUM Draco] Tiempo agotado; se conserva el GLB original."); finish(fallback()); }, 120_000);
    worker.onmessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.id !== id) return;
      if (!data.ok || !(data.buffer instanceof ArrayBuffer)) { console.warn("[AURUM Draco] Compresión no aplicada; se conserva el GLB original.", data?.error); finish(fallback()); return; }
      const compressed = data.compressed > 0 && data.outputBytes < data.originalBytes;
      if (!compressed) {
        console.warn("[AURUM Draco] El encoder no comprimió primitivas.", data.diagnostics ?? data);
        finish(fallback());
        return;
      }
      finish({ blob: new Blob([data.buffer as ArrayBuffer], { type: "model/gltf-binary" }), compressed: true, primitiveCount: Number(data.compressed), originalBytes: Number(data.originalBytes) || originalBlob.size, outputBytes: Number(data.outputBytes) || (data.buffer as ArrayBuffer).byteLength });
    };
    worker.onerror = (event) => { console.warn("[AURUM Draco] Error del worker; se conserva el GLB original.", event.message); finish(fallback()); };
    worker.postMessage({ id, buffer: source }, [source]);
  });
}
