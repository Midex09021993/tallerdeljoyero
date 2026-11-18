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
      // Compression success is determined by encoded primitives, not by file-size
      // comparison. Draco can be valid even when tiny meshes do not save bytes.
      const compressed = Number(data.compressed) > 0 && (data.buffer as ArrayBuffer).byteLength > 0;
      if (!compressed) {
        console.warn("[AURUM Draco] No se aplicó compresión Draco; se conserva el GLB original.", data.diagnostics ?? data);
        finish(fallback());
        return;
      }
      const outputBytes = Number(data.outputBytes) || (data.buffer as ArrayBuffer).byteLength;
      if (outputBytes >= originalBlob.size) {
        console.warn("[AURUM Draco] Draco se aplicó, pero el archivo no redujo su tamaño.", { originalBytes: originalBlob.size, outputBytes, compressed: data.compressed });
      }
      finish({ blob: new Blob([data.buffer as ArrayBuffer], { type: "model/gltf-binary" }), compressed: true, primitiveCount: Number(data.compressed), originalBytes: Number(data.originalBytes) || originalBlob.size, outputBytes });
    };
    worker.onerror = (event) => { console.warn("[AURUM Draco] Error del worker; se conserva el GLB original.", event.message); finish(fallback()); };
    worker.postMessage({ id, buffer: source }, [source]);
  });
}
