import { useEffect, useMemo, useRef, useState } from "react";
import { Download, ImagePlus, RotateCcw, ScanLine, ShieldCheck, Upload } from "lucide-react";

type Point = { x: number; y: number };
type Contour = { points: Point[]; area: number };

const MAX_SIZE = 720;

function luminance(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function polygonArea(points: Point[]) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

function simplify(points: Point[], tolerance: number) {
  if (points.length < 4) return points;
  const sqTolerance = tolerance * tolerance;

  const sqSegDist = (p: Point, a: Point, b: Point) => {
    let x = a.x;
    let y = a.y;
    let dx = b.x - x;
    let dy = b.y - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = b.x;
        y = b.y;
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }
    dx = p.x - x;
    dy = p.y - y;
    return dx * dx + dy * dy;
  };

  const radial = (input: Point[]) => {
    const prev = input[0];
    const out = [prev];
    let previous = prev;
    for (let i = 1; i < input.length; i++) {
      const point = input[i];
      if (sqSegDist(point, previous, previous) > sqTolerance) {
        out.push(point);
        previous = point;
      }
    }
    if (previous !== input[input.length - 1]) out.push(input[input.length - 1]);
    return out;
  };

  const dp = (input: Point[]) => {
    const marked = new Uint8Array(input.length);
    const stack: [number, number][] = [[0, input.length - 1]];
    marked[0] = marked[input.length - 1] = 1;

    while (stack.length) {
      const [first, last] = stack.pop()!;
      let maxSqDist = 0;
      let index = 0;
      for (let i = first + 1; i < last; i++) {
        const sqDist = sqSegDist(input[i], input[first], input[last]);
        if (sqDist > maxSqDist) {
          index = i;
          maxSqDist = sqDist;
        }
      }
      if (maxSqDist > sqTolerance) {
        marked[index] = 1;
        stack.push([first, index], [index, last]);
      }
    }
    return input.filter((_, i) => marked[i]);
  };

  const radialPoints = radial(points);
  return dp(radialPoints);
}

function traceContours(data: Uint8ClampedArray, width: number, height: number, threshold: number) {
  const foreground = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    foreground[i] = luminance(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) < threshold ? 1 : 0;
  }

  const visited = new Uint8Array(width * height);
  const contours: Contour[] = [];
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]] as const;

  for (let sy = 0; sy < height; sy++) {
    for (let sx = 0; sx < width; sx++) {
      const start = sy * width + sx;
      if (!foreground[start] || visited[start]) continue;

      const queue: Point[] = [{ x: sx, y: sy }];
      visited[start] = 1;
      const component: Point[] = [];

      while (queue.length) {
        const p = queue.pop()!;
        component.push(p);
        for (const [dx, dy] of dirs) {
          const nx = p.x + dx;
          const ny = p.y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = ny * width + nx;
          if (foreground[ni] && !visited[ni]) {
            visited[ni] = 1;
            queue.push({ x: nx, y: ny });
          }
        }
      }

      if (component.length < 12) continue;

      const boundary: Point[] = [];
      for (const p of component) {
        const neighbors = [[1,0],[-1,0],[0,1],[0,-1]];
        if (neighbors.some(([dx,dy]) => {
          const nx = p.x + dx, ny = p.y + dy;
          return nx < 0 || ny < 0 || nx >= width || ny >= height || !foreground[ny * width + nx];
        })) {
          boundary.push(p);
        }
      }

      if (boundary.length < 8) continue;
      const cx = boundary.reduce((s, p) => s + p.x, 0) / boundary.length;
      const cy = boundary.reduce((s, p) => s + p.y, 0) / boundary.length;
      boundary.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));

      contours.push({ points: boundary, area: component.length });
    }
  }

  return contours.sort((a, b) => b.area - a.area);
}

function pathFromPoints(points: Point[]) {
  if (!points.length) return "";
  const n = points.length;
  if (n < 3) return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} Z`;
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < n; i++) {
    const p = points[i];
    d += ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }
  return d + " Z";
}

function svgFile(points: Point[], widthMm: number, heightMm: number) {
  const d = pathFromPoints(points);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${widthMm} ${heightMm}">
  <path d="${d}" fill="none" stroke="#000000" stroke-width="0.01"/>
</svg>`;
}

function dxfFile(points: Point[], widthMm: number, heightMm: number) {
  const sx = widthMm / Math.max(...points.map(p => p.x), 1);
  const sy = heightMm / Math.max(...points.map(p => p.y), 1);
  const body = points.map(p => `10\\n${(p.x * sx).toFixed(4)}\\n20\\n${(heightMm - p.y * sy).toFixed(4)}\\n`).join("");
  return `0\\nSECTION\\n2\\nHEADER\\n0\\nENDSEC\\n0\\nSECTION\\n2\\nENTITIES\\n0\\nLWPOLYLINE\\n8\\nLASER\\n90\\n${points.length}\\n70\\n1\\n${body}0\\nENDSEC\\n0\\nEOF\\n`;
}

export function VectorizadorLaser() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceName, setSourceName] = useState("diseño");
  const [threshold, setThreshold] = useState(150);
  const [simplification, setSimplification] = useState(2);
  const [singleContour, setSingleContour] = useState(true);
  const [contours, setContours] = useState<Contour[]>([]);
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const processImage = (file: File) => {
    setError(null);
    setProcessing(true);
    setSourceName(file.name.replace(/\.[^.]+$/, "") || "diseño");
    const url = URL.createObjectURL(file);
    setImageUrl((previous) => {\n      if (previous) URL.revokeObjectURL(previous);\n      return url;\n    });\n    setSourceFile(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIZE / Math.max(img.naturalWidth, img.naturalHeight));
      const width = Math.max(1, Math.round(img.naturalWidth * scale));
      const height = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const pixels = ctx.getImageData(0, 0, width, height);
      setSourceSize({ width: img.naturalWidth, height: img.naturalHeight });
      setContours(traceContours(pixels.data, width, height, threshold));
      setProcessing(false);
    };
    img.onerror = () => {
      setError("No se pudo leer la imagen.");
      setProcessing(false);
    };
  };

  useEffect(() => {
    if (!sourceFile) return;
    processImage(sourceFile);
    // The source URL is intentionally kept until a new file is selected/reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceFile, threshold]);

  const cleanContours = useMemo(
    () => contours.map(c => ({ ...c, points: simplify(c.points, simplification) })).filter(c => c.points.length >= 3),
    [contours, simplification],
  );
  const outputContours = singleContour ? cleanContours.slice(0, 1) : cleanContours.slice(0, 12);
  const points = outputContours[0]?.points ?? [];
  const widthMm = sourceSize.width ? 30 : 30;
  const heightMm = sourceSize.width && sourceSize.height ? Math.max(0.1, widthMm * sourceSize.height / sourceSize.width) : 20;
  const totalPoints = outputContours.reduce((sum, c) => sum + c.points.length, 0);
  const closed = outputContours.length > 0 && outputContours.every(c => c.points.length >= 3);

  const download = (kind: "svg" | "dxf") => {
    if (!points.length) return;
    const content = kind === "svg" ? svgFile(points, widthMm, heightMm) : dxfFile(points, widthMm, heightMm);
    const blob = new Blob([content], { type: kind === "svg" ? "image/svg+xml" : "application/dxf" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${sourceName}-laser.${kind}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="space-y-5">
      <canvas ref={canvasRef} className="hidden" />
      <div className="rounded-2xl border border-gold/20 bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-gold">
              <ScanLine className="size-5" />
              <span className="text-[10px] font-bold uppercase tracking-[0.22em]">Fabricación</span>
            </div>
            <h1 className="mt-2 font-display text-3xl">Vectorizador Láser</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Convierte una imagen en una geometría cerrada preparada para corte o grabado.
            </p>
          </div>
          <div className="rounded-xl border border-success/20 bg-success-soft px-3 py-2 text-xs text-success">
            Procesamiento local · la imagen no se sube a un servidor
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-gold/40 bg-gold/[.04] px-5 py-10 text-center transition hover:border-gold hover:bg-gold/[.08]"
          >
            <ImagePlus className="size-9 text-gold" />
            <span className="mt-3 text-sm font-semibold">Cargar imagen</span>
            <span className="mt-1 text-xs text-muted-foreground">PNG, JPG o WEBP</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processImage(file);
            }}
          />

          <div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Umbral</span><span className="tabular-nums text-muted-foreground">{threshold}</span>
            </div>
            <input type="range" min="30" max="240" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="mt-2 w-full accent-[hsl(var(--gold))]" />
            <p className="mt-1 text-[10px] text-muted-foreground">Separa el dibujo del fondo.</p>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Reducción de nodos</span><span className="tabular-nums text-muted-foreground">{simplification}px</span>
            </div>
            <input type="range" min="0.5" max="6" step="0.5" value={simplification} onChange={(e) => setSimplification(Number(e.target.value))} className="mt-2 w-full accent-[hsl(var(--gold))]" />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3">
            <input type="checkbox" checked={singleContour} onChange={(e) => setSingleContour(e.target.checked)} className="accent-[hsl(var(--gold))]" />
            <span>
              <span className="block text-xs font-semibold">Una curva principal</span>
              <span className="block text-[10px] text-muted-foreground">Usa el contorno exterior dominante.</span>
            </span>
          </label>

          {error ? <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p> : null}

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => download("svg")} disabled={!closed || processing} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-3 py-2.5 text-xs font-semibold text-gold-foreground disabled:opacity-40">
              <Download className="size-4" /> SVG
            </button>
            <button type="button" onClick={() => download("dxf")} disabled={!closed || processing} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-xs font-semibold disabled:opacity-40">
              <Download className="size-4" /> DXF
            </button>
          </div>

          <button type="button" onClick={() => { setImageUrl(null); setContours([]); setError(null); if (inputRef.current) inputRef.current.value = ""; }} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium">
            <RotateCcw className="size-4" /> Nuevo diseño
          </button>
        </div>

        <div className="min-h-[560px] rounded-2xl border border-border bg-[#111316] p-4">
          {!imageUrl ? (
            <div className="grid h-full min-h-[520px] place-items-center text-center">
              <div>
                <Upload className="mx-auto size-10 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold text-foreground">Carga un diseño para comenzar</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">La herramienta detectará el contorno dominante y lo convertirá en una curva cerrada.</p>
              </div>
            </div>
          ) : (
            <div className="grid h-full gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[.03] p-3">
                <div className="mb-2 text-[10px] uppercase tracking-[.18em] text-white/50">Original</div>
                <div className="grid min-h-[460px] place-items-center overflow-hidden rounded-lg bg-white">
                  <img src={imageUrl} alt="Diseño original" className="max-h-[460px] max-w-full object-contain" />
                </div>
              </div>
              <div className="rounded-xl border border-gold/20 bg-white p-3">
                <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[.18em] text-slate-500">
                  <span>Vector de corte</span>
                  <span className="text-gold">1:1</span>
                </div>
                <svg viewBox={`0 0 ${canvasRef.current?.width || 100} ${canvasRef.current?.height || 100}`} className="h-[460px] w-full" preserveAspectRatio="xMidYMid meet">
                  {outputContours.map((c, i) => <path key={i} d={pathFromPoints(c.points)} fill="none" stroke="#111" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {imageUrl ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Contornos</p><p className="mt-1 text-xl font-semibold">{outputContours.length}</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Nodos</p><p className="mt-1 text-xl font-semibold">{totalPoints}</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Escala</p><p className="mt-1 text-xl font-semibold">30 mm</p></div>
          <div className={`rounded-xl border p-4 ${closed ? "border-success/20 bg-success-soft" : "border-danger/20 bg-danger/10"}`}><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Validación</p><p className="mt-1 flex items-center gap-1 text-sm font-semibold">{closed ? <><ShieldCheck className="size-4 text-success" /> Curva cerrada</> : "Revisar geometría"}</p></div>
        </div>
      ) : null}
    </section>
  );
}
