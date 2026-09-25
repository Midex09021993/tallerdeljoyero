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
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
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
    const prev = input[0]!;
    const out: Point[] = [prev];
    let previous = prev;
    for (let i = 1; i < input.length; i++) {
      const point = input[i]!;
      if (sqSegDist(point, previous, previous) > sqTolerance) {
        out.push(point);
        previous = point;
      }
    }
    if (previous !== input[input.length - 1]) out.push(input[input.length - 1]!);
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
        const sqDist = sqSegDist(input[i]!, input[first]!, input[last]!);
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
  return dp(radialPoints as Point[]);
}

function traceBoundary(component: Point[], width: number, height: number, foreground: Uint8Array) {
  const set = new Set(component.map((p) => p.y * width + p.x));
  const has = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && set.has(y * width + x);
  const dirs = [
    [1, 0], [1, 1], [0, 1], [-1, 1],
    [-1, 0], [-1, -1], [0, -1], [1, -1],
  ] as const;

  const boundary = component.filter((p) =>
    dirs.some(([dx, dy]) => {
      const nx = p.x + dx;
      const ny = p.y + dy;
      return nx < 0 || ny < 0 || nx >= width || ny >= height || !foreground[ny * width + nx];
    }),
  );
  if (boundary.length < 8) return [];

  const boundarySet = new Set(boundary.map((p) => p.y * width + p.x));
  const start = boundary.reduce((best, p) =>
    p.y < best.y || (p.y === best.y && p.x < best.x) ? p : best, boundary[0]!);

  const ordered: Point[] = [];
  let current = start;
  let previousDir = 4;
  const maxSteps = boundary.length * 8 + 32;

  for (let step = 0; step < maxSteps; step++) {
    ordered.push(current);
    let found: Point | null = null;
    let foundDir = previousDir;

    for (let offset = 0; offset < 8; offset++) {
      const dir = (previousDir + offset + 6) % 8;
      const [dx, dy] = dirs[dir]!;
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (boundarySet.has(ny * width + nx)) {
        found = { x: nx, y: ny };
        foundDir = dir;
        break;
      }
    }

    if (!found) break;
    const sameStart = found.x === start.x && found.y === start.y;
    const nextAfterStart = ordered.length > 2 && found.x === ordered[1]?.x && found.y === ordered[1]?.y;
    if (sameStart) break;
    if (nextAfterStart) break;
    current = found;
    previousDir = foundDir;
  }

  // Remove consecutive duplicates and keep only a genuine closed boundary.
  const clean: Point[] = [];
  for (const p of ordered) {
    const last = clean[clean.length - 1];
    if (!last || last.x !== p.x || last.y !== p.y) clean.push(p);
  }
  return clean.length >= 8 ? clean : boundary;
}

function traceContours(data: Uint8ClampedArray, width: number, height: number, cutoff: number, threshold: number, ignoreLessThan = 12, useAlpha = false) {
  const foreground = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const value = luminance(data[i * 4]!, data[i * 4 + 1]!, data[i * 4 + 2]!);\n    const alpha = data[i * 4 + 3]!;\n    foreground[i] = (useAlpha ? alpha >= threshold : value >= cutoff && value <= threshold) ? 1 : 0;
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

      if (component.length < ignoreLessThan) continue;
      const points = traceBoundary(component, width, height, foreground);
      if (points.length < 8) continue;
      contours.push({ points, area: component.length });
    }
  }

  return contours.sort((a, b) => b.area - a.area);
}

function smoothClosedPath(points: Point[], amount: number) {
  if (points.length < 4 || amount <= 0) return points;
  const passes = Math.min(3, Math.max(0, Math.round(amount * 2)));
  let current = points;
  for (let pass = 0; pass < passes; pass++) {
    const next: Point[] = [];
    for (let i = 0; i < current.length; i++) {
      const p = current[i]!;
      const q = current[(i + 1) % current.length]!;
      next.push(
        { x: p.x * 0.75 + q.x * 0.25, y: p.y * 0.75 + q.y * 0.25 },
        { x: p.x * 0.25 + q.x * 0.75, y: p.y * 0.25 + q.y * 0.75 },
      );
    }
    current = next;
  }
  return current;
}

function pathFromPoints(points: Point[]) {
  if (!points.length) return "";
  const n = points.length;
  if (n < 3) return `M ${points[0]!.x.toFixed(2)} ${points[0]!.y.toFixed(2)} Z`;
  let d = `M ${points[0]!.x.toFixed(2)} ${points[0]!.y.toFixed(2)}`;
  for (let i = 1; i < n; i++) {
    const p = points[i]!;
    d += ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }
  return d + " Z";
}

function normalizeContours(contours: Contour[], widthMm: number, heightMm: number) {
  const all = contours.flatMap((c) => c.points);
  if (!all.length) return [];
  const minX = Math.min(...all.map((p) => p.x));
  const minY = Math.min(...all.map((p) => p.y));
  const maxX = Math.max(...all.map((p) => p.x));
  const maxY = Math.max(...all.map((p) => p.y));
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  return contours.map((contour) => ({
    ...contour,
    points: contour.points.map((p) => ({
      x: ((p.x - minX) / spanX) * widthMm,
      y: ((p.y - minY) / spanY) * heightMm,
    })),
  }));
}

function svgFile(contours: Contour[], widthMm: number, heightMm: number, outputMode: "cut" | "engrave") {
  const normalized = normalizeContours(contours, widthMm, heightMm);
  const paths = normalized.map((c) => `<path d="${pathFromPoints(c.points)}" />`).join("\n  ");\n  const label = outputMode === "cut" ? "CORTE" : "GRABADO";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${widthMm} ${heightMm}">
  <g id="${label}" fill="none" fill-rule="evenodd" stroke="#000000" stroke-width="0.01">
    ${paths}
  </g>
</svg>
`;
}

function dxfFile(contours: Contour[], widthMm: number, heightMm: number, outputMode: "cut" | "engrave") {
  const normalized = normalizeContours(contours, widthMm, heightMm);
  const layer = outputMode === "cut" ? "CORTE" : "GRABADO";\n  const entities = normalized.map((contour) => {
    const vertices = contour.points.map((p) =>
      `10\n${p.x.toFixed(4)}\n20\n${(heightMm - p.y).toFixed(4)}\n`,
    ).join("");
    return `0\nLWPOLYLINE\n8\n${layer}\n90\n${contour.points.length}\n70\n1\n${vertices}`;
  }).join("\n");
  return `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${entities}\n0\nENDSEC\n0\nEOF\n`;
}

function hasSelfIntersection(points: Point[]) {
  if (points.length < 4) return false;
  const orient = (a: Point, b: Point, c: Point) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const onSegment = (a: Point, b: Point, p: Point) =>
    Math.min(a.x, b.x) <= p.x && p.x <= Math.max(a.x, b.x) &&
    Math.min(a.y, b.y) <= p.y && p.y <= Math.max(a.y, b.y);
  const intersects = (a: Point, b: Point, c: Point, d: Point) => {
    const o1 = orient(a,b,c), o2 = orient(a,b,d), o3 = orient(c,d,a), o4 = orient(c,d,b);
    if (((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) &&
        ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))) return true;
    return (Math.abs(o1) < 1e-8 && onSegment(a,b,c)) ||
      (Math.abs(o2) < 1e-8 && onSegment(a,b,d)) ||
      (Math.abs(o3) < 1e-8 && onSegment(c,d,a)) ||
      (Math.abs(o4) < 1e-8 && onSegment(c,d,b));
  };
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!, b = points[(i + 1) % points.length]!;
    for (let j = i + 1; j < points.length; j++) {
      if (j === i + 1 || (i === 0 && j === points.length - 1)) continue;
      if (intersects(a,b,points[j]!,points[(j + 1) % points.length]!)) return true;
    }
  }
  return false;
}

export function VectorizadorLaser() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceName, setSourceName] = useState("diseño");
  const [cutoff, setCutoff] = useState(0);\n  const [threshold, setThreshold] = useState(150);\n  const [smoothness, setSmoothness] = useState(0);\n  const [useAlpha, setUseAlpha] = useState(false);\n  const [outputMode, setOutputMode] = useState<"cut" | "engrave">("cut");\n  const [unit, setUnit] = useState<"mm" | "in">("mm");
  const [simplification, setSimplification] = useState(2);\n  const [ignoreLessThan, setIgnoreLessThan] = useState(24);\n  const [singleContour, setSingleContour] = useState(true);
  const [widthMm, setWidthMm] = useState(30);
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
    setImageUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return url;
    });
    setSourceFile(file);
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
      setContours(traceContours(pixels.data, width, height, cutoff, threshold, ignoreLessThan, useAlpha));
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
    // Reprocess only when the source or threshold changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceFile, cutoff, threshold, ignoreLessThan, useAlpha]);

  const cleanContours = useMemo(
    () => contours
      .map(c => ({ ...c, points: smoothClosedPath(simplify(c.points, simplification), smoothness) }))
      .filter(c => c.points.length >= 3),
    [contours, simplification, smoothness],
  );
  const outputContours = singleContour ? cleanContours.slice(0, 1) : cleanContours.slice(0, 12);
  const points = outputContours[0]?.points ?? [];
  const aspect = sourceSize.width && sourceSize.height ? sourceSize.height / sourceSize.width : 0.667;
  const heightMm = Math.max(0.1, widthMm * aspect);
  const totalPoints = outputContours.reduce((sum, c) => sum + c.points.length, 0);
  const selfIntersecting = outputContours.some((c) => hasSelfIntersection(c.points));
  const duplicatePoints = outputContours.some((c) => c.points.some((p, i) => {
    const q = c.points[(i + 1) % c.points.length]!;
    return p.x === q.x && p.y === q.y;
  }));
  const closed = outputContours.length > 0 && outputContours.every(c => c.points.length >= 3) && !selfIntersecting && !duplicatePoints;

  const download = (kind: "svg" | "dxf") => {
    if (!points.length) return;
    const exportContours = outputContours;\n    const content = kind === "svg" ? svgFile(exportContours, widthMm, heightMm, outputMode) : dxfFile(exportContours, widthMm, heightMm, outputMode);
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
              <span>Rango de brillo</span><span className="tabular-nums text-muted-foreground">{cutoff}–{threshold}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input aria-label="Corte inferior" type="range" min="0" max="240" value={cutoff} onChange={(e) => setCutoff(Math.min(Number(e.target.value), threshold))} className="w-full accent-[hsl(var(--gold))]" />
              <input aria-label="Umbral superior" type="range" min="30" max="255" value={threshold} onChange={(e) => setThreshold(Math.max(Number(e.target.value), cutoff))} className="w-full accent-[hsl(var(--gold))]" />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">Controla qué tonos entran al trazado, como en los trazadores profesionales.</p>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3">
            <input type="checkbox" checked={useAlpha} onChange={(e) => setUseAlpha(e.target.checked)} className="accent-[hsl(var(--gold))]" />
            <span>
              <span className="block text-xs font-semibold">Usar transparencia</span>
              <span className="block text-[10px] text-muted-foreground">Útil para PNG con fondo transparente.</span>
            </span>
          </label>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Reducción de nodos</span><span className="tabular-nums text-muted-foreground">{simplification}px</span>
            </div>
            <input type="range" min="0.5" max="6" step="0.5" value={simplification} onChange={(e) => setSimplification(Number(e.target.value))} className="mt-2 w-full accent-[hsl(var(--gold))]" />
            <p className="mt-1 text-[10px] text-muted-foreground">Optimiza la ruta sin perder el contorno.</p>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Ignorar detalles menores</span><span className="tabular-nums text-muted-foreground">{ignoreLessThan}px</span>
            </div>
            <input type="range" min="12" max="500" step="4" value={ignoreLessThan} onChange={(e) => setIgnoreLessThan(Number(e.target.value))} className="mt-2 w-full accent-[hsl(var(--gold))]" />
            <p className="mt-1 text-[10px] text-muted-foreground">Elimina ruido y pequeños fragmentos del trazado.</p>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Suavizado de curvas</span><span className="tabular-nums text-muted-foreground">{smoothness.toFixed(1)}</span>
            </div>
            <input type="range" min="0" max="1" step="0.25" value={smoothness} onChange={(e) => setSmoothness(Number(e.target.value))} className="mt-2 w-full accent-[hsl(var(--gold))]" />
            <p className="mt-1 text-[10px] text-muted-foreground">Convierte trazos muy dentados en curvas más limpias. Verifica esquinas pequeñas.</p>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Operación</span>
              <span className="text-muted-foreground">{outputMode === "cut" ? "CORTE" : "GRABADO"}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setOutputMode("cut")} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${outputMode === "cut" ? "border-gold bg-gold/10 text-gold" : "border-border"}`}>Corte</button>
              <button type="button" onClick={() => setOutputMode("engrave")} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${outputMode === "engrave" ? "border-gold bg-gold/10 text-gold" : "border-border"}`}>Grabado</button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Ancho real de fabricación</span><span className="tabular-nums text-muted-foreground">{displayWidth.toFixed(2)} {unit}</span>
            </div>
            <input type="range" min="1" max="150" step="0.5" value={widthMm} onChange={(e) => setWidthMm(Number(e.target.value))} className="mt-2 w-full accent-[hsl(var(--gold))]" />
            <p className="mt-1 text-[10px] text-muted-foreground">La geometría exportada queda en milímetros y conserva la proporción del vector.</p>\n            <div className="mt-2 flex gap-2">\n              <button type="button" onClick={() => setUnit("mm")} className={`rounded-md px-2.5 py-1 text-[10px] font-semibold ${unit === "mm" ? "bg-gold text-gold-foreground" : "border border-border"}`}>mm</button>\n              <button type="button" onClick={() => setUnit("in")} className={`rounded-md px-2.5 py-1 text-[10px] font-semibold ${unit === "in" ? "bg-gold text-gold-foreground" : "border border-border"}`}>in</button>\n            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3">
            <input type="checkbox" checked={singleContour} onChange={(e) => setSingleContour(e.target.checked)} className="accent-[hsl(var(--gold))]" />
            <span>
              <span className="block text-xs font-semibold">Un contorno exterior</span>
              <span className="block text-[10px] text-muted-foreground">Ignora islas menores y conserva el contorno dominante.</span>
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
          <div className="rounded-xl border border-border bg-card p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tamaño</p><p className="mt-1 text-xl font-semibold">{displayWidth.toFixed(2)} × {displayHeight.toFixed(2)} {unit}</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Modo</p><p className="mt-1 text-xl font-semibold">{outputMode === "cut" ? "Corte" : "Grabado"}</p></div>\n          <div className={`rounded-xl border p-4 ${closed ? "border-success/20 bg-success-soft" : "border-danger/20 bg-danger/10"}`}><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Validación</p><p className="mt-1 flex items-center gap-1 text-sm font-semibold">{closed ? <><ShieldCheck className="size-4 text-success" /> Geometría válida</> : selfIntersecting ? "Autocruce detectado" : duplicatePoints ? "Segmentos duplicados" : "Revisar geometría"}</p></div>
        </div>
      ) : null}
    </section>
  );
}
