import { useEffect, useMemo, useState } from "react";
import { Check, CircleDot, Ruler, Search } from "lucide-react";
import { CLAVES_CALCULADORAS, leerConfigTallasAnillo, formatearTallaAmericana, type TallaAnillo } from "@/lib/calculadoras-config";
import { useConfigSistema } from "@/lib/taller-db";

type ModoBusqueda = "diametro" | "espanola" | "europea" | "americana";
type ModoVista = "buscar" | "medir";

const modos: { id: ModoBusqueda; label: string; placeholder: string }[] = [
  { id: "diametro", label: "Diámetro interno", placeholder: "Ej. 19,6 mm" },
  { id: "espanola", label: "Talla España", placeholder: "Ej. 22" },
  { id: "europea", label: "Talla europea (ISO)", placeholder: "Ej. 62" },
  { id: "americana", label: "Talla americana (USA)", placeholder: "Ej. 9 3/4" },
];

const REFERENCIAS = { moneda: { label: "Moneda S/1", mm: 25.5 }, tarjeta: { label: "Tarjeta bancaria", mm: 85.6 } } as const;
type ReferenciaCalibracion = keyof typeof REFERENCIAS;

function normalizar(valor: string) {
  return Number(valor.replace(",", ".").trim());
}

function normalizarAmericana(valor: string) {
  return formatearTallaAmericana(valor);
}

function diferencia(a: number, b: number) {
  return Math.abs(a - b);
}

function buscarPorDiametro(tabla: TallaAnillo[], diametro: number) {
  if (!Number.isFinite(diametro) || !tabla.length) return null;
  return tabla.reduce((mejor, fila) =>
    diferencia(fila.diametroMm, diametro) < diferencia(mejor.diametroMm, diametro) ? fila : mejor,
  );
}

export function ConversorTallasAnillo({ compacto = false }: { compacto?: boolean }) {
  const { data: config } = useConfigSistema(CLAVES_CALCULADORAS.tallasAnillo);
  const configuracion = leerConfigTallasAnillo(config?.valor);
  const [vista, setVista] = useState<ModoVista>("buscar");
  const [modo, setModo] = useState<ModoBusqueda>("diametro");
  const [valor, setValor] = useState("");
  const [calibrada, setCalibrada] = useState(false);
  const [anchoCalibracion, setAnchoCalibracion] = useState(320);
  const [diametroPx, setDiametroPx] = useState(210);
  const [referencia, setReferencia] = useState<ReferenciaCalibracion>("tarjeta");

  useEffect(() => {
    const actualizarReferencia = () => {
      setReferencia(window.innerWidth < 768 ? "moneda" : "tarjeta");
      setCalibrada(false);
    };
    actualizarReferencia();
    window.addEventListener("resize", actualizarReferencia);
    return () => window.removeEventListener("resize", actualizarReferencia);
  }, []);

  const referenciaMm = REFERENCIAS[referencia].mm;
  const mmPorPx = referenciaMm / anchoCalibracion;
  const diametroMedido = diametroPx * mmPorPx;

  const resultadoBusqueda = useMemo(() => {
    if (!valor.trim()) return null;
    const tabla = configuracion.tabla;
    if (!tabla.length) return null;

    if (modo === "americana") {
      const buscado = normalizarAmericana(valor);
      if (!buscado) return null;
      return tabla.find((fila) => fila.americana === buscado) ?? null;
    }

    const buscado = normalizar(valor);
    if (!Number.isFinite(buscado)) return null;

    if (modo === "diametro") {
      const exacto = tabla.find((fila) => Math.abs(fila.diametroMm - buscado) < 0.051);
      return exacto ?? buscarPorDiametro(tabla, buscado);
    }

    if (modo === "espanola") return tabla.find((fila) => fila.espanola === buscado) ?? null;
    if (modo === "europea") return tabla.find((fila) => fila.europeaIso === buscado) ?? null;
    return null;
  }, [configuracion, modo, valor]);

  const resultadoMedicion = useMemo(
    () => (calibrada ? buscarPorDiametro(configuracion.tabla, diametroMedido) : null),
    [calibrada, configuracion.tabla, diametroMedido],
  );

    const cambiarVista = (nueva: ModoVista) => {
    setVista(nueva);
    if (nueva === "buscar") {
      setValor("");
    } else {
      setCalibrada(false);
      const esCelular = window.innerWidth < 768;
      setReferencia(esCelular ? "moneda" : "tarjeta");
      setAnchoCalibracion(esCelular ? 150 : 320);
      setDiametroPx(210);
    }
  };

  return (
    <section className={`overflow-hidden rounded-2xl border border-border bg-card shadow-card ${compacto ? "" : "max-w-3xl"}`}>
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Ruler className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-semibold">Conversor Profesional de Tallas de Anillo</h2>
          <p className="text-xs text-muted-foreground">Buscar equivalencias · medir anillo en pantalla</p>
        </div>
      </header>

      <div className="space-y-5 p-5">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => cambiarVista("buscar")} className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${vista === "buscar" ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:border-primary"}`}>
            Buscar talla
          </button>
          <button type="button" onClick={() => cambiarVista("medir")} className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${vista === "medir" ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:border-primary"}`}>
            Medir anillo
          </button>
        </div>

        {vista === "buscar" ? (
          <>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {modos.map((item) => (
                <button key={item.id} type="button" onClick={() => { setModo(item.id); setValor(""); }} className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${modo === item.id ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:border-primary"}`}>
                  {item.label}
                </button>
              ))}
            </div>

            <label className="block space-y-2">
              <span className="text-xs font-medium">{modos.find((m) => m.id === modo)?.label}</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input type="text" inputMode={modo === "americana" ? "text" : "decimal"} className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary" placeholder={modos.find((m) => m.id === modo)?.placeholder} value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>
            </label>

            {resultadoBusqueda ? <Resultado fila={resultadoBusqueda} /> : valor.trim() ? <div className="rounded-xl border border-border p-4 text-center text-sm text-muted-foreground">No se encontró una equivalencia para esa talla.</div> : <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">Selecciona el sistema e ingresa el valor.</div>}
          </>
        ) : (
          <MedidorAnillo
            calibrada={calibrada}
            anchoCalibracion={anchoCalibracion}
            diametroPx={diametroPx}
            diametroMedido={diametroMedido}
            onAnchoChange={setAnchoCalibracion}
            onDiametroChange={setDiametroPx}
            onCalibrar={() => setCalibrada(true)}
            onReferenciaChange={(value) => {
              setReferencia(value);
              setAnchoCalibracion(value === "moneda" ? 150 : 320);
              setCalibrada(false);
            }}
            referencia={referencia}
            referenciaMm={referenciaMm}
            resultado={resultadoMedicion}
          />
        )}

        {vista === "buscar" && resultadoBusqueda ? (
          <p className="text-center text-[10px] text-muted-foreground">Circunferencia interior calculada: {(resultadoBusqueda.diametroMm * Math.PI).toFixed(1)} mm</p>
        ) : null}

        <div className="border-t border-border pt-3 text-center text-[10px] leading-relaxed text-muted-foreground">
          Referencias técnicas: tabla de tallaje España (joyería española) · ISO 8653:2016 · GIA.
        </div>
      </div>
    </section>
  );
}

function MedidorAnillo({
  calibrada,
  anchoCalibracion,
  diametroPx,
  diametroMedido,
  onAnchoChange,
  onDiametroChange,
  onCalibrar,
  onReferenciaChange,
  referencia,
  referenciaMm,
  resultado,
}: {
  calibrada: boolean;
  anchoCalibracion: number;
  diametroPx: number;
  diametroMedido: number;
  onAnchoChange: (value: number) => void;
  onDiametroChange: (value: number) => void;
  onCalibrar: () => void;
  onReferenciaChange: (value: ReferenciaCalibracion) => void;
  referencia: ReferenciaCalibracion;
  referenciaMm: number;
  resultado: TallaAnillo | null;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-info/20 bg-info-soft/40 p-3 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">1. Calibra tu pantalla</p>
        <p className="mt-1">Coloca la referencia física sobre la guía y ajusta el control hasta que coincida exactamente. En celular recomendamos la moneda peruana de S/1 (25,5 mm), porque cabe completa en la pantalla. La tarjeta bancaria de 85,6 mm queda disponible para pantallas más grandes.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(REFERENCIAS) as ReferenciaCalibracion[]).map((id) => (
          <button
            key={id}
            type="button"
            disabled={id === "tarjeta" && typeof window !== "undefined" && window.innerWidth < 768}
            onClick={() => {
              if (id === "tarjeta" && typeof window !== "undefined" && window.innerWidth < 768) return;
              onReferenciaChange(id);
            }}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${referencia === id ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:border-primary"} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {REFERENCIAS[id].label}
            <span className="mt-0.5 block text-[10px] font-normal">{REFERENCIAS[id].mm.toFixed(1)} mm</span>
          </button>
        ))}

      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-background p-4">
        <div className="mx-auto flex max-w-full justify-center">
          <div className="relative flex min-h-40 items-center justify-center overflow-visible">
            <div
              className={referencia === "moneda" ? "relative rounded-full border-2 border-dashed border-primary/60" : "relative rounded border-2 border-dashed border-primary/60"}
              style={{
                width: Math.min(anchoCalibracion, 520),
                height: referencia === "moneda" ? Math.min(anchoCalibracion, 520) : 56,
              }}
            >
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-background px-2 text-[10px] font-semibold whitespace-nowrap">
                {referenciaMm.toFixed(1)} mm
              </span>
            </div>
          </div>
        </div>
        <div className="mt-2 space-y-1">
          <input aria-label="Ajuste de calibración de pantalla" type="range" min={referencia === "moneda" ? 80 : 180} max={referencia === "moneda" ? 360 : 520} step="0.5" value={anchoCalibracion} onChange={(e) => onAnchoChange(Number(e.target.value))} className="w-full" />
          <div className="flex items-center justify-between px-1 text-[10px] text-muted-foreground">
            <span>Más pequeño</span>
            <span>{anchoCalibracion.toFixed(1)} px · {referenciaMm.toFixed(1)} mm</span>
            <span>Más grande</span>
          </div>
        </div>
        <button type="button" onClick={onCalibrar} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground">
          <Check className="size-4" aria-hidden="true" /> Confirmar calibración
        </button>
      </div>

      {calibrada ? (
        <>
          <div className="rounded-xl border border-border bg-surface-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">2. Coloca el anillo</p>
            <p className="mt-1">Apoya el anillo sobre la pantalla y alinea el círculo con el borde interior. Usa el control para que coincida exactamente con el diámetro interno.</p>
          </div>

          <div className="flex min-h-[320px] items-center justify-center overflow-hidden rounded-2xl border border-border bg-background p-4">
            <div className="relative flex items-center justify-center" style={{ width: Math.min(diametroPx, 520), height: Math.min(diametroPx, 520) }}>
              <div className="absolute inset-0 rounded-full border-2 border-primary" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background/90 px-3 py-1.5 text-sm font-semibold shadow-sm">
                {diametroMedido.toFixed(1)} mm
              </div>
              <CircleDot className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-primary/60" aria-hidden="true" />
            </div>
          </div>

          <input
            aria-label="Ajuste del diámetro del anillo"
            type="range"
            min="60"
            max="520"
            step="0.5"
            value={diametroPx}
            onInput={(e) => onDiametroChange(Number(e.currentTarget.value))}
            className="w-full touch-pan-x"
          />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Menor</span>
            <span>{diametroMedido.toFixed(1)} mm · Talla {resultado?.espanola ?? "—"}</span>
            <span>Mayor</span>
          </div>

          {resultado ? (
            <>
              <Resultado fila={resultado} />
              <div className="rounded-xl border border-success/20 bg-success-soft/40 p-3 text-center text-xs">
                <p className="font-semibold">Medición en pantalla calibrada</p>
                <p className="mt-1 text-muted-foreground">Diámetro interno {diametroMedido.toFixed(1)} mm · Circunferencia {(diametroMedido * Math.PI).toFixed(1)} mm</p>
              </div>
            </>
          ) : null}

          <p className="text-[10px] leading-relaxed text-muted-foreground">La medición depende de la calibración y del ajuste visual del usuario. En celular utiliza preferentemente la moneda S/1 como referencia. Es una referencia orientativa; para una medida de producción o venta, verifica con un medidor físico.</p>
        </>
      ) : null}
    </div>
  );
}

function Resultado({ fila }: { fila: TallaAnillo }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-background p-4 text-center"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Diámetro</p><p className="mt-1 text-lg font-semibold">{fila.diametroMm.toFixed(1)} <span className="text-xs font-normal">mm</span></p></div>
        <div className="rounded-2xl border border-border bg-background p-4 text-center"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">España</p><p className="mt-1 text-lg font-semibold">{fila.espanola}</p></div>
        <div className="rounded-2xl border border-border bg-background p-4 text-center"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Europa ISO</p><p className="mt-1 text-lg font-semibold">{fila.europeaIso}</p></div>
        <div className="rounded-2xl border border-border bg-background p-4 text-center"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">USA</p><p className="mt-1 text-lg font-semibold">{fila.americana ?? "—"}</p></div>
      </div>
    </div>
  );
}
