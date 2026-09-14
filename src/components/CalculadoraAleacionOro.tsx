import { useMemo, useState } from "react";
import { Gem } from "lucide-react";
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

type ColorAleacion = "amarillo" | "blanco" | "rosa";

type MetalReceta = { nombre: string; porcentaje: number };

const ETIQUETAS_COLOR: Record<ColorAleacion, string> = {
  amarillo: "Amarillo",
  blanco: "Blanco",
  rosa: "Rosa",
};

export function CalculadoraAleacionOro({ compacto = false }: { compacto?: boolean }) {
  const { data: configAleacion } = useConfigSistema(CLAVES_CALCULADORAS.aleacion);
  const configuracion = leerConfigAleacion(configAleacion?.valor);
  const [masa, setMasa] = useState("");
  const [inicial, setInicial] = useState("24");
  const [final, setFinal] = useState("18");
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
    <div className={`space-y-5 ${compacto ? "p-1" : "p-5 sm:p-6 lg:p-8"}`}>
      <div className="flex items-center gap-2">
        <Gem className="size-4 text-gold" aria-hidden="true" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
          Aleación de oro
        </span>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${compacto ? "" : "sm:grid-cols-3 lg:gap-5"}`}>
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
            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Quilataje inicial
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="24"
            step="0.1"
            value={inicial}
            onChange={(e) => setInicial(e.target.value)}
            placeholder="Ej. 24"
            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Quilataje final
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="24"
            step="0.1"
            value={final}
            onChange={(e) => setFinal(e.target.value)}
            placeholder="Ej. 18"
            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
          />
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Color de aleación
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
                className={`h-11 rounded-xl border text-sm font-medium transition ${
                  seleccionado
                    ? "border-gold bg-accent text-foreground shadow-card"
                    : "border-input bg-background text-muted-foreground hover:border-gold/60 hover:text-foreground"
                }`}
              >
                {ETIQUETAS_COLOR[c]}
              </button>
            );
          })}
        </div>
      </fieldset>

      {resultado ? (
        <div className="space-y-5">
          <article className="rounded-2xl border border-gold bg-accent p-4 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gold">
              Aleación a agregar
            </p>
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

          <article className="relative overflow-hidden rounded-2xl border border-gold bg-gradient-to-br from-gold/15 to-gold/5 p-5 shadow-card">
            <div className="absolute inset-x-0 top-0 h-1 bg-gold" aria-hidden="true" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
              Resultado final
            </p>
            <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
              <span className="text-3xl font-semibold text-foreground">
                {formatearNumero(resultado.total)} g
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                Oro {kfNum}K {resultado.colorEtiqueta}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {formatearNumero(masaNum)} g de oro + {formatearNumero(resultado.aleacion)} g de
              aleación
            </p>
          </article>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Ingresa una masa de oro y un quilataje final menor al inicial para calcular la aleación.
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
