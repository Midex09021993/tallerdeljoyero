import { useMemo, useState } from "react";
import { Search, Ruler } from "lucide-react";
import { CLAVES_CALCULADORAS, leerConfigTallasAnillo, formatearTallaAmericana, type TallaAnillo } from "@/lib/calculadoras-config";
import { useConfigSistema } from "@/lib/taller-db";

type ModoBusqueda = "diametro" | "espanola" | "europea" | "americana";

const modos: { id: ModoBusqueda; label: string; placeholder: string }[] = [
  { id: "diametro", label: "Diámetro interno", placeholder: "Ej. 19,6 mm" },
  { id: "espanola", label: "Talla España", placeholder: "Ej. 22" },
  { id: "europea", label: "Talla europea (ISO)", placeholder: "Ej. 62" },
  { id: "americana", label: "Talla americana (USA)", placeholder: "Ej. 9 3/4" },
];

function normalizar(valor: string) {
  return Number(valor.replace(",", ".").trim());
}

function normalizarAmericana(valor: string) {
  return formatearTallaAmericana(valor);
}

function diferencia(a: number, b: number) {
  return Math.abs(a - b);
}

export function ConversorTallasAnillo({ compacto = false }: { compacto?: boolean }) {
  const { data: config } = useConfigSistema(CLAVES_CALCULADORAS.tallasAnillo);
  const configuracion = leerConfigTallasAnillo(config?.valor);
  const [modo, setModo] = useState<ModoBusqueda>("diametro");
  const [valor, setValor] = useState("");

  const resultado = useMemo(() => {
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
      return exacto ?? tabla.reduce((mejor, fila) =>
        diferencia(fila.diametroMm, buscado) < diferencia(mejor.diametroMm, buscado) ? fila : mejor,
      );
    }

    if (modo === "espanola") {
      return tabla.find((fila) => fila.espanola === buscado) ?? null;
    }

    if (modo === "europea") {
      return tabla.find((fila) => fila.europeaIso === buscado) ?? null;
    }

    return null;
  }, [configuracion, modo, valor]);

  const mostrar = (fila: TallaAnillo | null) => fila?.americana ?? "—";

  return (
    <section className={`overflow-hidden rounded-2xl border border-border bg-card shadow-card ${compacto ? "" : "max-w-3xl"}`}>
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Ruler className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-semibold">Conversor Profesional de Tallas de Anillo</h2>
          <p className="text-xs text-muted-foreground">Diámetro · España · Europa ISO · USA</p>
        </div>
      </header>

      <div className="space-y-5 p-5">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {modos.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { setModo(item.id); setValor(""); }}
              className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${modo === item.id ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:border-primary"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-medium">{modos.find((m) => m.id === modo)?.label}</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="text"
              inputMode={modo === "americana" ? "text" : "decimal"}
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary"
              placeholder={modos.find((m) => m.id === modo)?.placeholder}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
        </label>

        {resultado ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-2xl border border-border bg-background p-4 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Diámetro</p>
                <p className="mt-1 text-lg font-semibold">{resultado.diametroMm.toFixed(1)} <span className="text-xs font-normal">mm</span></p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">España</p>
                <p className="mt-1 text-lg font-semibold">{resultado.espanola}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Europa ISO</p>
                <p className="mt-1 text-lg font-semibold">{resultado.europeaIso}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">USA</p>
                <p className="mt-1 text-lg font-semibold">{mostrar(resultado)}</p>
              </div>
            </div>
            <p className="text-center text-[10px] text-muted-foreground">
              Circunferencia interior calculada: {(resultado.diametroMm * Math.PI).toFixed(1)} mm
            </p>
          </>
        ) : valor.trim() ? (
          <div className="rounded-xl border border-border p-4 text-center text-sm text-muted-foreground">
            No se encontró una equivalencia para esa talla.
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            Selecciona el sistema e ingresa el valor.
          </div>
        )}

        <div className="border-t border-border pt-3 text-center text-[10px] leading-relaxed text-muted-foreground">
          Referencias técnicas: tabla de tallaje España (joyería española) · ISO 8653:2016 · GIA 4Cs.
        </div>
      </div>
    </section>
  );
}
