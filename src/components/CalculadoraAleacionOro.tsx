import { useMemo, useState } from "react";
import { Gem } from "lucide-react";

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

export function CalculadoraAleacionOro({ compacto = false }: { compacto?: boolean }) {
  const [masa, setMasa] = useState("");
  const [inicial, setInicial] = useState("24");
  const [final, setFinal] = useState("18");

  const masaNum = Number(masa);
  const kiNum = clampQuilataje(Number(inicial));
  const kfNum = clampQuilataje(Number(final));

  const resultado = useMemo(() => {
    if (!Number.isFinite(masaNum) || masaNum <= 0) return null;
    if (kfNum <= 0 || kfNum >= 24) return null;
    if (kiNum <= kfNum) return null;

    const pi = kiNum / 24;
    const pf = kfNum / 24;
    const aleacion = masaNum * ((pi - pf) / pf);
    const total = masaNum + aleacion;

    return {
      purezaInicial: pi,
      purezaFinal: pf,
      aleacion,
      total,
    };
  }, [kiNum, kfNum, masaNum]);

  return (
    <div className={`space-y-5 ${compacto ? "p-1" : "p-5 sm:p-6 lg:p-8"}`}>
      <div className="flex items-center gap-2">
        <Gem className="size-4 text-gold" aria-hidden="true" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
          Aleación de oro
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-5">
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

      {resultado ? (
        <div
          className={`grid gap-4 ${
            compacto ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5"
          }`}
        >
          <article className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pureza inicial
            </p>
            <p className="mt-2 text-2xl font-semibold leading-none text-foreground">
              {formatearNumero(resultado.purezaInicial)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{kiNum}/24</p>
          </article>

          <article className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pureza final
            </p>
            <p className="mt-2 text-2xl font-semibold leading-none text-foreground">
              {formatearNumero(resultado.purezaFinal)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{kfNum}/24</p>
          </article>

          <article className="rounded-2xl border border-gold bg-accent p-4 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gold">
              Aleación a agregar
            </p>
            <p className="mt-2 text-3xl font-semibold leading-none text-foreground">
              {formatearNumero(resultado.aleacion)}{" "}
              <span className="ml-1 text-sm font-medium text-muted-foreground">g</span>
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Masa total final
            </p>
            <p className="mt-2 text-3xl font-semibold leading-none text-foreground">
              {formatearNumero(resultado.total)}{" "}
              <span className="ml-1 text-sm font-medium text-muted-foreground">g</span>
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
