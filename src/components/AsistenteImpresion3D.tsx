import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleDollarSign, FileUp, Printer, RotateCcw, Ruler, Waves } from "lucide-react";
import { toast } from "sonner";
import { VisorPesoJoyeria } from "@/components/VisorPesoJoyeria";

type Inspeccion = {
  volumenMm3: number;
  dimensionesMm: [number, number, number];
  bordesAbiertos: number;
  triangulos: number;
};

const formato = (valor: number, decimales = 2) =>
  new Intl.NumberFormat("es-PE", { maximumFractionDigits: decimales }).format(valor);

function inspeccionarGeometria(geometria: import("three").BufferGeometry): Inspeccion {
  const posicion = geometria.getAttribute("position");
  if (!posicion || posicion.count < 3 || posicion.count % 3 !== 0) {
    throw new Error("La malla STL no contiene una geometría triangular válida.");
  }

  geometria.computeBoundingBox();
  const caja = geometria.boundingBox;
  if (!caja) throw new Error("No se pudieron calcular las dimensiones del modelo.");

  const dimensiones = caja.getSize(new (geometria.boundingBox!.min.constructor as typeof import("three").Vector3)());
  let volumenFirmado = 0;
  const conteoBordes = new Map<string, number>();
  const punto = (i: number) => [
    posicion.getX(i), posicion.getY(i), posicion.getZ(i),
  ] as const;
  const clavePunto = (p: readonly number[]) => p.map((v) => Math.round(v * 10000)).join(",");
  const registrarBorde = (a: readonly number[], b: readonly number[]) => {
    const ka = clavePunto(a);
    const kb = clavePunto(b);
    const clave = ka < kb ? ka + "|" + kb : kb + "|" + ka;
    conteoBordes.set(clave, (conteoBordes.get(clave) ?? 0) + 1);
  };

  for (let i = 0; i < posicion.count; i += 3) {
    const a = punto(i);
    const b = punto(i + 1);
    const c = punto(i + 2);
    volumenFirmado += (
      a[0] * (b[1] * c[2] - b[2] * c[1]) +
      a[1] * (b[2] * c[0] - b[0] * c[2]) +
      a[2] * (b[0] * c[1] - b[1] * c[0])
    ) / 6;
    registrarBorde(a, b);
    registrarBorde(b, c);
    registrarBorde(c, a);
  }

  const bordesAbiertos = Array.from(conteoBordes.values()).filter((n) => n === 1).length;
  return {
    volumenMm3: Math.abs(volumenFirmado),
    dimensionesMm: [dimensiones.x, dimensiones.y, dimensiones.z],
    bordesAbiertos,
    triangulos: posicion.count / 3,
  };
}

export function AsistenteImpresion3D() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [inspeccion, setInspeccion] = useState<Inspeccion | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [precioMl, setPrecioMl] = useState("1.80");
  const [desperdicio, setDesperdicio] = useState("15");
  const [cantidad, setCantidad] = useState("1");
  const [horasMaquina, setHorasMaquina] = useState("3");
  const [costeHora, setCosteHora] = useState("2.50");
  const [unidad, setUnidad] = useState<"mm" | "cm" | "in">("mm");

  useEffect(() => {
    let cancelado = false;
    if (!archivo) {
      setInspeccion(null);
      return;
    }
    setProcesando(true);
    (async () => {
      try {
        if (!archivo.name.toLowerCase().endsWith(".stl")) {
          throw new Error("La inspección geométrica inicial admite STL. Puedes seguir usando otros formatos en el visualizador general.");
        }
        const [{ STLLoader }] = await Promise.all([
          import("three/examples/jsm/loaders/STLLoader.js"),
        ]);
        const geometria = new STLLoader().parse(await archivo.arrayBuffer());
        try {
          const resultado = inspeccionarGeometria(geometria);
          if (!cancelado) setInspeccion(resultado);
        } finally {
          geometria.dispose();
        }
      } catch (error) {
        if (!cancelado) {
          setInspeccion(null);
          toast.error(error instanceof Error ? error.message : "No se pudo inspeccionar el STL.");
        }
      } finally {
        if (!cancelado) setProcesando(false);
      }
    })();
    return () => { cancelado = true; };
  }, [archivo]);

  const calculo = useMemo(() => {
    if (!inspeccion) return null;
    const factorUnidad = unidad === "mm" ? 1 : unidad === "cm" ? 10 : 25.4;
    const volumenMl = (inspeccion.volumenMm3 / factorUnidad ** 3);
    const precio = Math.max(0, Number(precioMl) || 0);
    const factorDesperdicio = Math.max(0, Number(desperdicio) || 0) / 100;
    const piezas = Math.max(1, Math.floor(Number(cantidad) || 1));
    const horas = Math.max(0, Number(horasMaquina) || 0);
    const maquina = Math.max(0, Number(costeHora) || 0);
    const resinaMl = volumenMl * piezas * (1 + factorDesperdicio);
    const costeResina = resinaMl * precio;
    const costeMaquina = horas * maquina;
    return {
      volumenMl,
      resinaMl,
      costeResina,
      costeMaquina,
      total: costeResina + costeMaquina,
      porPieza: (costeResina + costeMaquina) / piezas,
      piezas,
      dimensiones: inspeccion.dimensionesMm.map((v) => v / factorUnidad) as [number, number, number],
    };
  }, [inspeccion, unidad, precioMl, desperdicio, cantidad, horasMaquina, costeHora]);

  const reiniciar = () => {
    setArchivo(null);
    setInspeccion(null);
    setUnidad("mm");
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Taller del Joyero · Fabricación digital</p>
            <h2 className="mt-2 text-2xl font-semibold">Asistente de impresión 3D</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Inspecciona tu STL y estima el coste de resina calcinable antes de preparar la microfusión.</p>
          </div>
          {archivo && <button type="button" onClick={reiniciar} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:border-gold/50"><RotateCcw className="size-4" /> Nuevo modelo</button>}
        </div>

        <label className="mt-5 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gold/50 bg-gold/[0.04] px-4 py-5 text-center transition hover:bg-gold/[0.08]">
          <FileUp className="size-6 text-gold" />
          <span className="mt-2 text-sm font-semibold">{archivo ? archivo.name : "Seleccionar modelo STL"}</span>
          <span className="mt-1 text-xs text-muted-foreground">La inspección inicial analiza STL en milímetros por defecto. No sube el archivo a la nube.</span>
          <input type="file" accept=".stl,model/stl,application/sla" className="sr-only" onChange={(event) => setArchivo(event.target.files?.[0] ?? null)} />
        </label>

        {procesando && <p className="mt-4 text-sm text-muted-foreground">Analizando triángulos y bordes de la malla…</p>}

        {inspeccion && calculo && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-background p-4"><Ruler className="size-4 text-gold" /><p className="mt-3 text-xs text-muted-foreground">Dimensiones ({unidad})</p><p className="mt-1 font-semibold tabular-nums">{calculo.dimensiones.map((v) => formato(v)).join(" × ")}</p></div>
              <div className="rounded-xl border border-border bg-background p-4"><Waves className="size-4 text-gold" /><p className="mt-3 text-xs text-muted-foreground">Volumen geométrico</p><p className="mt-1 font-semibold tabular-nums">{formato(calculo.volumenMl, 4)} ml</p><p className="mt-1 text-xs text-muted-foreground">{formato(inspeccion.triangulos, 0)} triángulos</p></div>
              <div className="rounded-xl border border-border bg-background p-4">{inspeccion.bordesAbiertos === 0 ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertTriangle className="size-4 text-amber-600" />}<p className="mt-3 text-xs text-muted-foreground">Bordes detectados</p><p className="mt-1 font-semibold">{inspeccion.bordesAbiertos === 0 ? "Sin bordes abiertos detectados" : `${formato(inspeccion.bordesAbiertos, 0)} bordes abiertos`}</p></div>
            </div>
            <p className="rounded-lg border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">Esta comprobación es orientativa: un STL sin bordes abiertos detectados no garantiza que la pieza sea imprimible, esté orientada correctamente o sea adecuada para la resina elegida. Verifica escala y unidades antes de fabricar.</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold"><CircleDollarSign className="size-5" /></span><div><h3 className="text-lg font-semibold">Estimador de coste</h3><p className="text-sm text-muted-foreground">Ajusta los valores a tu proveedor y a tu impresora.</p></div></div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1.5 text-sm"><span className="font-medium">Precio de resina por ml (S/)</span><input type="number" min="0" step="0.01" value={precioMl} onChange={(e) => setPrecioMl(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3" /></label>
          <label className="space-y-1.5 text-sm"><span className="font-medium">Desperdicio estimado (%)</span><input type="number" min="0" max="300" step="1" value={desperdicio} onChange={(e) => setDesperdicio(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3" /></label>
          <label className="space-y-1.5 text-sm"><span className="font-medium">Cantidad de piezas</span><input type="number" min="1" step="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3" /></label>
          <label className="space-y-1.5 text-sm"><span className="font-medium">Tiempo estimado de máquina (h)</span><input type="number" min="0" step="0.25" value={horasMaquina} onChange={(e) => setHorasMaquina(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3" /></label>
          <label className="space-y-1.5 text-sm"><span className="font-medium">Coste por hora de máquina (S/)</span><input type="number" min="0" step="0.1" value={costeHora} onChange={(e) => setCosteHora(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3" /></label>
          <label className="space-y-1.5 text-sm"><span className="font-medium">Unidades del STL</span><select value={unidad} onChange={(e) => setUnidad(e.target.value as "mm" | "cm" | "in")} className="h-10 w-full rounded-lg border border-border bg-background px-3"><option value="mm">Milímetros (mm)</option><option value="cm">Centímetros (cm)</option><option value="in">Pulgadas (in)</option></select></label>
        </div>
        {calculo ? <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl bg-muted/40 p-4"><p className="text-xs text-muted-foreground">Resina estimada</p><p className="mt-1 text-xl font-semibold">{formato(calculo.resinaMl, 2)} ml</p></div>
          <div className="rounded-xl bg-muted/40 p-4"><p className="text-xs text-muted-foreground">Coste de resina</p><p className="mt-1 text-xl font-semibold">S/ {formato(calculo.costeResina)}</p></div>
          <div className="rounded-xl bg-muted/40 p-4"><p className="text-xs text-muted-foreground">Coste de máquina</p><p className="mt-1 text-xl font-semibold">S/ {formato(calculo.costeMaquina)}</p></div>
          <div className="rounded-xl border border-gold/40 bg-gold/[0.07] p-4"><p className="text-xs text-muted-foreground">Total estimado</p><p className="mt-1 text-xl font-semibold">S/ {formato(calculo.total)}</p><p className="mt-1 text-xs text-muted-foreground">S/ {formato(calculo.porPieza)} por pieza</p></div>
        </div> : <p className="mt-5 rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">Carga un STL para calcular el volumen y estimar el coste.</p>}
        <p className="mt-4 text-xs leading-5 text-muted-foreground">El coste es una estimación preliminar: no incluye automáticamente soportes reales, lavado, curado, fallos de impresión, mano de obra ni parámetros del laminador. El volumen se calcula sobre la malla STL; el selector de unidades debe coincidir con las unidades reales del archivo.</p>
      </section>

      {archivo && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
          <div className="mb-4 flex items-center gap-3"><Printer className="size-5 text-gold" /><div><h3 className="font-semibold">Visualizador compartido</h3><p className="text-sm text-muted-foreground">La vista previa utiliza el mismo visor 3D de Taller del Joyero.</p></div></div>
          <VisorPesoJoyeria compacto archivoInicial={archivo} />
        </section>
      )}
    </div>
  );
}
