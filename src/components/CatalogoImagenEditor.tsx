import { useEffect, useRef, useState } from "react";
import { Check, RotateCcw, RotateCw, X } from "lucide-react";

type Props = {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

type Guia = "ninguna" | "tercios" | "completa";

export function CatalogoImagenEditor({ file, onCancel, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const dragRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [dimensiones, setDimensiones] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotacion, setRotacion] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [guia, setGuia] = useState<Guia>("tercios");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let activo = true;
    void createImageBitmap(file, { imageOrientation: "from-image" }).then((bitmap) => {
      if (!activo) {
        bitmap.close();
        return;
      }
      bitmapRef.current?.close();
      bitmapRef.current = bitmap;
      setDimensiones({ width: bitmap.width, height: bitmap.height });
      setZoom(1);
      setRotacion(0);
      setOffset({ x: 0, y: 0 });
    }).catch(() => setError("No se pudo abrir esta fotografía. Prueba con JPG, PNG o WebP."));
    return () => {
      activo = false;
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const bitmap = bitmapRef.current;
    if (!canvas || !bitmap || !dimensiones) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    const quarterTurn = Math.abs(rotacion % 180) === 90;
    const visualWidth = quarterTurn ? dimensiones.height : dimensiones.width;
    const visualHeight = quarterTurn ? dimensiones.width : dimensiones.height;
    const scale = Math.min((size - 80) / visualWidth, (size - 80) / visualHeight) * zoom;
    ctx.save();
    ctx.translate(size / 2 + offset.x, size / 2 + offset.y);
    ctx.rotate((rotacion * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, -dimensiones.width / 2, -dimensiones.height / 2);
    ctx.restore();

    if (guia !== "ninguna") {
      ctx.save();
      ctx.strokeStyle = "rgba(110, 85, 42, 0.62)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      const divisions = guia === "tercios" ? [1 / 3, 2 / 3] : Array.from({ length: 9 }, (_, i) => (i + 1) / 10);
      divisions.forEach((position) => {
        const point = position * size;
        ctx.beginPath(); ctx.moveTo(point, 0); ctx.lineTo(point, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, point); ctx.lineTo(size, point); ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(110, 85, 42, 0.28)";
      ctx.strokeRect(40, 40, size - 80, size - 80);
      ctx.restore();
    }
  }, [dimensiones, zoom, rotacion, offset, guia]);

  function mover(event: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset({
      x: drag.offsetX + event.clientX - drag.x,
      y: drag.offsetY + event.clientY - drag.y,
    });
  }

  async function confirmar() {
    const canvas = canvasRef.current;
    if (!canvas || !bitmapRef.current || !dimensiones) return;
    setGuardando(true);
    setError(null);
    try {
      const output = document.createElement("canvas");
      output.width = 1200;
      output.height = 1200;
      const ctx = output.getContext("2d");
      if (!ctx) throw new Error("No se pudo preparar la imagen final.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 1200, 1200);
      const quarterTurn = Math.abs(rotacion % 180) === 90;
      const visualWidth = quarterTurn ? dimensiones.height : dimensiones.width;
      const visualHeight = quarterTurn ? dimensiones.width : dimensiones.height;
      const scale = Math.min(1056 / visualWidth, 1056 / visualHeight) * zoom;
      ctx.save();
      ctx.translate(600 + offset.x * 2, 600 + offset.y * 2);
      ctx.rotate((rotacion * Math.PI) / 180);
      ctx.scale(scale, scale);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmapRef.current, -dimensiones.width / 2, -dimensiones.height / 2);
      ctx.restore();
      const blob = await new Promise<Blob>((resolve, reject) => output.toBlob((value) => value ? resolve(value) : reject(new Error("No se pudo generar el WebP.")), "image/webp", 0.9));
      const base = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80) || "joya";
      onConfirm(new File([blob], base + "-1200.webp", { type: "image/webp", lastModified: Date.now() }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo preparar la fotografía.");
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="catalogo-editor-title">
      <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div><h2 id="catalogo-editor-title" className="text-base font-semibold">Encuadrar fotografía</h2><p className="mt-1 text-xs text-muted-foreground">Arrastra la joya para posicionarla dentro del cuadro.</p></div>
          <button type="button" onClick={onCancel} disabled={guardando} className="rounded-lg p-2 text-muted-foreground hover:bg-surface-muted" aria-label="Cerrar editor"><X className="size-5" /></button>
        </div>
        <div className="grid gap-4 p-5">
          <div className="mx-auto w-full max-w-[520px]">
            <canvas
              ref={canvasRef}
              width={600}
              height={600}
              className="block aspect-square w-full touch-none cursor-grab rounded-xl border border-border bg-white active:cursor-grabbing"
              onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y }; }}
              onPointerMove={mover}
              onPointerUp={() => { dragRef.current = null; }}
              onPointerCancel={() => { dragRef.current = null; }}
              aria-label="Lienzo cuadrado para encuadrar la fotografía"
            />
            <p className="mt-2 text-center text-[11px] text-muted-foreground">Vista cuadrada 1:1 · Fondo blanco · 1200 × 1200 px</p>
          </div>
          <section className="grid gap-3 rounded-xl border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold">Guías de composición</span><span className="text-[10px] text-muted-foreground">No se exportan</span></div>
            <div className="grid grid-cols-3 gap-2">
              {([{ value: "ninguna", label: "Sin guías" }, { value: "tercios", label: "Tercios" }, { value: "completa", label: "Completa" }] as const).map((item) => (
                <button key={item.value} type="button" onClick={() => setGuia(item.value)} aria-pressed={guia === item.value} className={`rounded-full border px-3 py-2 text-xs font-medium transition ${guia === item.value ? "border-gold bg-gold/10 text-foreground" : "border-border hover:bg-surface-muted"}`}>{item.label}</button>
              ))}
            </div>
          </section>
          <section className="grid gap-3 rounded-xl border border-border p-3">
            <div className="flex items-center justify-between"><label htmlFor="catalogo-editor-zoom" className="text-xs font-semibold">Tamaño de la joya</label><span className="text-xs tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span></div>
            <input id="catalogo-editor-zoom" type="range" min="0.5" max="2.5" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full accent-amber-600" />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setRotacion((value) => (value + 270) % 360)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface-muted"><RotateCcw className="size-4" /> Girar izquierda</button>
              <button type="button" onClick={() => setRotacion((value) => (value + 90) % 360)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface-muted"><RotateCw className="size-4" /> Girar derecha</button>
              <button type="button" onClick={() => { setZoom(1); setRotacion(0); setOffset({ x: 0, y: 0 }); }} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface-muted"><RotateCcw className="size-4" /> Restablecer</button>
            </div>
          </section>
          {error ? <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">{error}</p> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} disabled={guardando} className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold">Cancelar</button>
            <button type="button" onClick={() => void confirmar()} disabled={!dimensiones || guardando} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs font-semibold text-gold-foreground disabled:opacity-50"><Check className="size-4" />{guardando ? "Preparando WebP…" : "Usar esta fotografía"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
