import { useMemo, useState } from "react";
import { Gem, Sparkles, RotateCcw, Info } from "lucide-react";
import { CLAVES_CALCULADORAS, leerConfigAleacion } from "@/lib/calculadoras-config";
import { useConfigSistema } from "@/lib/taller-db";

function formatearNumero(valor: number, decimales = 2) {
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor);
}

function clampQuilataje(valor: number) {
  if (!Number.isFinite(valor)) return 0;
  return Math.max(0, Math.min(24, valor));
}

type ColorAleacion = "amarillo" | "blanco" | "rosa" | "naranja";

type MetalReceta = { nombre: string; porcentaje: number };

const LEYES_OBJETIVO = [8, 9, 10, 12, 14, 18, 20, 22] as const;

const ETIQUETAS_COLOR: Record<ColorAleacion, string> = {
  amarillo: "Amarillo",
  blanco: "Blanco",
  rosa: "Rosa",
  naranja: "Naranja",
};

export function CalculadoraAleacionOro({ compacto = false }: { compacto?: boolean }) {
  const { data: configAleacion } = useConfigSistema(CLAVES_CALCULADORAS.aleacion);
  const configuracion = leerConfigAleacion(configAleacion?.valor);
  const [masa, setMasa] = useState("");
  const [inicial, setInicial] = useState("24");
  const [final, setFinal] = useState("18");
  const [leyPersonalizada, setLeyPersonalizada] = useState(false);
  const [color, setColor] = useState<ColorAleacion>("rosa");

  const masaNum = Number(masa);
  const kiNum = clampQuilataje(Number(inicial));
  const kfNum = clampQuilataje(Number(final));

  const resultado = useMemo(() => {
    if (!Number.isFinite(masaNum) || masaNum <= 0) return null;
    if (kfNum <= 0 || kfNum >= 24) return null;
    if (kiNum <= kfNum) return null;

    const pi = kiNum / 24;
    const pf = kfNum / 24;
    const aleacion = masaNum * ((pi - pf) / pf) * Math.max(0, configuracion.factorCalculo);
    const total = masaNum + aleacion;

    const receta = configuracion.recetas[color];
    const metales = receta.metales.map((m) => ({
      nombre: `${m.nombre} de liga`,
      gramos: aleacion * m.porcentaje,
      porcentaje: m.porcentaje,
    }));

    return {
      purezaInicial: pi,
      purezaFinal: pf,
      aleacion,
      total,
      metales,
    };
  }, [kiNum, kfNum, masaNum, color, configuracion]);

  return (
    <div className={`relative overflow-hidden rounded-[28px] border border-gold/20 bg-background shadow-[0_18px_60px_rgba(0,0,0,0.12)] ${compacto ? "p-1" : "p-4 sm:p-6 lg:p-8"}`}>
      <header className="relative mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/25 to-gold/5 shadow-inner">
            <Gem className="size-5 text-gold" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">Taller del Joyero</p>
            <h2 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Aleación de oro</h2>
            <p className="mt-1 text-xs text-muted-foreground">Calcula la liga necesaria con precisión.</p>
          </div>
        </div>
        <Sparkles className="mt-1 size-5 text-gold/60" aria-hidden="true" />
      </header>

      <div className={`relative grid grid-cols-1 gap-4 ${compacto ? "" : "sm:grid-cols-3 lg:gap-5"}`}>
        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Masa de oro (g)
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={masa}
            onChange={(e) => setMasa(e.target.value)}
            placeholder="Ej. 6"
            className="h-14 w-full rounded-2xl border border-input bg-card px-4 text-lg font-semibold outline-none transition placeholder:text-muted-foreground/50 focus:border-gold focus:ring-4 focus:ring-gold/10"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Ley real del oro
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="24"
            step="0.1"
            value={inicial}
            onChange={(e) => setInicial(e.target.value)}
            placeholder="Ej. 23.60"
            className="h-14 w-full rounded-2xl border border-input bg-card px-4 text-lg font-semibold outline-none transition placeholder:text-muted-foreground/50 focus:border-gold focus:ring-4 focus:ring-gold/10"
          />
        </label>

        <div className="space-y-3 sm:col-span-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Ley final deseada</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Selecciona una ley habitual o introduce una personalizada.</p>
            </div>
            <span className="rounded-full border border-gold/20 bg-gold/5 px-2.5 py-1 text-[10px] font-medium text-gold">
              {final ? `${final}K · ${Math.round((Number(final) / 24) * 1000)}‰` : "—"}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {LEYES_OBJETIVO.map((ley) => {
              const seleccionado = !leyPersonalizada && final === String(ley);
              return (
                <button key={ley} type="button" onClick={() => { setLeyPersonalizada(false); setFinal(String(ley)); }} aria-pressed={seleccionado}
                  className={`h-12 rounded-2xl border text-sm font-semibold transition ${seleccionado ? "border-gold bg-gradient-to-b from-gold/25 to-gold/10 text-foreground shadow-[0_8px_24px_rgba(180,140,50,0.14)]" : "border-input bg-background text-muted-foreground hover:border-gold/60 hover:text-foreground"}`}>
                  {ley}K
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => setLeyPersonalizada((v) => !v)}
              className={`h-11 rounded-2xl border px-4 text-xs font-semibold transition ${leyPersonalizada ? "border-gold bg-gold/10 text-foreground" : "border-input bg-background text-muted-foreground hover:border-gold/60 hover:text-foreground"}`}>
              Ley personalizada
            </button>
            {leyPersonalizada ? (
              <input type="number" inputMode="decimal" min="0" max="24" step="0.01" value={final}
                onChange={(e) => setFinal(e.target.value)} placeholder="Ej. 16.75" aria-label="Ley final personalizada"
                className="h-11 w-full rounded-2xl border border-input bg-card px-4 text-sm font-semibold outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/10 sm:max-w-xs" />
            ) : null}
          </div>
        </div>
      </div>

      <fieldset className="relative space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Color de la aleación
        </legend>
        <div className={`grid gap-2 ${compacto ? "grid-cols-3" : "grid-cols-3 sm:max-w-md"}`}>
          {(Object.keys(ETIQUETAS_COLOR) as ColorAleacion[]).map((c) => {
            const seleccionado = color === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-pressed={seleccionado}
                className={`h-12 rounded-2xl border text-sm font-semibold transition ${
                  seleccionado
                    ? "border-gold bg-gradient-to-b from-gold/25 to-gold/10 text-foreground shadow-[0_8px_24px_rgba(180,140,50,0.14)]"
                    : "border-input bg-background text-muted-foreground hover:border-gold/60 hover:text-foreground"
                }`}
              >
                <span className={`mr-2 inline-block size-2.5 rounded-full ${c === "amarillo" ? "bg-[#d9ad35]" : c === "blanco" ? "bg-slate-200" : c === "rosa" ? "bg-[#d7967f]" : "bg-orange-500"}`} aria-hidden="true" />
                {ETIQUETAS_COLOR[c]}
              </button>
            );
          })}
        </div>
      </fieldset>

      {resultado ? (
        <div className="space-y-5">
          <article className="relative overflow-hidden rounded-[24px] border border-gold/40 bg-gradient-to-br from-gold/20 via-gold/8 to-transparent p-5 shadow-[0_14px_40px_rgba(180,140,50,0.12)]">
            <div className="flex items-center justify-between gap-3"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Aleación a agregar</p><Sparkles className="size-4 text-gold/70" aria-hidden="true" /></div>
            <p className="mt-2 text-3xl font-semibold leading-none text-foreground">
              {formatearNumero(resultado.aleacion)}{" "}
              <span className="ml-1 text-base font-medium text-muted-foreground">g</span>
            </p>
          </article>

          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
              Composición de la aleación · Oro {ETIQUETAS_COLOR[color]}
            </p>
            <div
              className={`grid gap-4 ${
                compacto
                  ? "grid-cols-1"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5"
              }`}
            >
              {resultado.metales.map((m) => (
                <article
                  key={m.nombre}
                  className="rounded-2xl border border-border bg-card p-4 shadow-card"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {m.nombre}
                  </p>
                  <p className="mt-2 text-2xl font-semibold leading-none text-foreground">
                    {formatearNumero(m.gramos)}{" "}
                    <span className="ml-1 text-sm font-medium text-muted-foreground">g</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatearNumero(m.porcentaje * 100, 0)}% de la aleación
                  </p>
                </article>
              ))}
            </div>
          </div>

          <article className="relative overflow-hidden rounded-[24px] border border-gold/40 bg-gradient-to-br from-gold/20 via-gold/8 to-transparent p-5 shadow-[0_14px_40px_rgba(180,140,50,0.12)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gold" aria-hidden="true" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
              Resultado final
            </p>
            <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
              <span className="text-3xl font-semibold text-foreground">
                {formatearNumero(resultado.total)} g
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                Oro {kfNum}K {ETIQUETAS_COLOR[color]}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {formatearNumero(masaNum)} g de oro + {formatearNumero(resultado.aleacion)} g de aleación
            </p>
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-gold/15 bg-background/40 p-3">
              <Info className="mt-0.5 size-3.5 shrink-0 text-gold" aria-hidden="true" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">La receta utilizada proviene de la configuración técnica de la calculadora.</p>
            </div>
          </article>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-gold/20 bg-gold/5">
            <RotateCcw className="size-6 text-gold/70" aria-hidden="true" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">
            Introduce la masa y el quilataje final
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
            Indica la ley real de tu oro, elige la ley final y obtén la cantidad de liga necesaria.
          </p>
          {Number.isFinite(masaNum) && masaNum > 0 && kiNum <= kfNum ? (
            <p className="mt-2 text-xs text-warning">
              El quilataje final debe ser menor que el inicial.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
