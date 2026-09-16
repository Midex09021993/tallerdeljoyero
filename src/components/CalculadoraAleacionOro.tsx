import { useMemo, useState } from "react";
import { Gem, Sparkles, RotateCcw, Info, Scale, Target, Palette, Check } from "lucide-react";
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
    <div className={`relative overflow-hidden rounded-[28px] border border-gold/20 bg-background shadow-[0_18px_60px_rgba(0,0,0,0.10)] ${compacto ? "p-1" : "p-4 sm:p-6 lg:p-8"}`}>
      <header className="relative mb-5 flex items-start justify-between gap-4 sm:mb-7">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/25 to-gold/5 shadow-inner">
            <Gem className="size-5 text-gold" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">Taller del Joyero</p>
            <h2 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Aleación de oro</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Calcula cuánto metal de liga necesitas agregar.</p>
          </div>
        </div>
        <div className="hidden rounded-full border border-gold/15 bg-gold/5 px-2.5 py-1.5 text-[10px] font-medium text-gold sm:flex sm:items-center sm:gap-1.5">
          <Sparkles className="size-3" aria-hidden="true" /> Cálculo automático
        </div>
      </header>

      <div className="space-y-4">
        <section className="rounded-3xl border border-border bg-card/60 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-gold/10 text-gold">
              <Scale className="size-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">Datos de partida</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Indica exactamente qué tienes en la balanza.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="min-w-0 space-y-2">
              <span className="block text-[11px] font-semibold text-muted-foreground">Masa de oro</span>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={masa}
                  onChange={(e) => setMasa(e.target.value)}
                  placeholder="6.00"
                  aria-label="Masa de oro en gramos"
                  className="h-14 w-full rounded-2xl border border-input bg-background px-3 pr-10 text-lg font-semibold outline-none transition placeholder:text-muted-foreground/40 focus:border-gold focus:ring-4 focus:ring-gold/10"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">g</span>
              </div>
            </label>

            <label className="min-w-0 space-y-2">
              <span className="block text-[11px] font-semibold text-muted-foreground">Ley real del oro</span>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="24"
                  step="0.1"
                  value={inicial}
                  onChange={(e) => setInicial(e.target.value)}
                  placeholder="23.60"
                  aria-label="Ley real del oro en quilates"
                  className="h-14 w-full rounded-2xl border border-input bg-background px-3 pr-10 text-lg font-semibold outline-none transition placeholder:text-muted-foreground/40 focus:border-gold focus:ring-4 focus:ring-gold/10"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">K</span>
              </div>
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/60 p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                <Target className="size-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">Ley final deseada</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">Elige una ley habitual o escribe una específica.</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-gold/25 bg-gold/10 px-2.5 py-1 text-[10px] font-bold text-gold">
              {final ? `${final}K · ${Math.round((Number(final) / 24) * 1000)}‰` : "—"}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {LEYES_OBJETIVO.map((ley) => {
              const seleccionado = !leyPersonalizada && final === String(ley);
              return (
                <button key={ley} type="button" onClick={() => { setLeyPersonalizada(false); setFinal(String(ley)); }} aria-pressed={seleccionado}
                  className={`relative h-11 rounded-2xl border text-sm font-semibold transition active:scale-[0.98] ${seleccionado ? "border-gold bg-gradient-to-b from-gold/25 to-gold/10 text-foreground shadow-[0_6px_18px_rgba(180,140,50,0.12)]" : "border-input bg-background text-muted-foreground hover:border-gold/60 hover:text-foreground"}`}>
                  {ley}K
                  {seleccionado ? <Check className="absolute right-1.5 top-1.5 size-3 text-gold" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>

          <div className="mt-3">
            <button type="button" onClick={() => setLeyPersonalizada((v) => !v)}
              className={`flex min-h-11 w-full items-center justify-center rounded-2xl border px-4 text-xs font-semibold transition ${leyPersonalizada ? "border-gold bg-gold/10 text-foreground" : "border-dashed border-input bg-background text-muted-foreground hover:border-gold/60 hover:text-foreground"}`}>
              {leyPersonalizada ? "Usar ley habitual" : "＋ Introducir ley personalizada"}
            </button>
            {leyPersonalizada ? (
              <div className="relative mt-2">
                <input type="number" inputMode="decimal" min="0" max="24" step="0.01" value={final}
                  onChange={(e) => setFinal(e.target.value)} placeholder="Ej. 16.75" aria-label="Ley final personalizada"
                  autoFocus
                  className="h-12 w-full rounded-2xl border border-gold/40 bg-background px-4 pr-10 text-base font-semibold outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/10" />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">K</span>
              </div>
            ) : null}
          </div>

          {kiNum > 0 && kfNum > 0 ? (
            <div className="mt-3 flex items-center justify-center gap-2 text-[11px] font-medium text-muted-foreground">
              <span>{kiNum}K</span><span className="text-gold">→</span><span className="text-foreground">{kfNum}K</span>
            </div>
          ) : null}
        </section>
      </div>

      <fieldset className="rounded-3xl border border-border bg-card/60 p-4 sm:p-5">
        <legend className="sr-only">Color de la aleación</legend>
        <div className="mb-4 flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-gold/10 text-gold">
            <Palette className="size-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">Color de la aleación</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Selecciona la receta que vas a preparar.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(ETIQUETAS_COLOR) as ColorAleacion[]).map((c) => {
            const seleccionado = color === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-pressed={seleccionado}
                className={`flex h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-semibold transition active:scale-[0.98] ${
                  seleccionado
                    ? "border-gold bg-gradient-to-b from-gold/25 to-gold/10 text-foreground shadow-[0_6px_18px_rgba(180,140,50,0.12)]"
                    : "border-input bg-background text-muted-foreground hover:border-gold/60 hover:text-foreground"
                }`}
              >
                <span className={`size-2.5 shrink-0 rounded-full ${c === "amarillo" ? "bg-[#d9ad35]" : c === "blanco" ? "bg-slate-200" : c === "rosa" ? "bg-[#d7967f]" : "bg-orange-500"}`} aria-hidden="true" />
                {ETIQUETAS_COLOR[c]}
                {seleccionado ? <Check className="size-3.5 text-gold" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </fieldset>

      {resultado ? (
        <div className="space-y-4">
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
