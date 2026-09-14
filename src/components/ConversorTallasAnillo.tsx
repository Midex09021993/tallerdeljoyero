import { useMemo, useState } from "react";
import { Search, Ruler } from "lucide-react";
import { CLAVES_CALCULADORAS, leerConfigTallasAnillo, formatearTallaAmericana, type TallaAnillo } from "@/lib/calculadoras-config";
import { useConfigSistema } from "@/lib/taller-db";

type ModoBusqueda = "diametro" | "europea" | "americana";

const modos: { id: ModoBusqueda; label: string; placeholder: string }[] = [
  { id: "diametro", label: "Diámetro interno", placeholder: "Ej. 18,1 mm" },
  { id: "europea", label: "Talla europea", placeholder: "Ej. 17" },
  { id: "americana", label: "Talla americana (USA)", placeholder: "Ej. 6 1/2" },
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
      return tabla.find((f) => f.americana === buscado) ?? null;
    }

    const buscado = normalizar(valor);
    if (!Number.isFinite(buscado)) return null;
    if (!tabla.length) return null;

    if (modo === "diametro") {
      const exacto = tabla.find((f) => Math.abs(f.diametroMm - buscado) < 0.051);
      return exacto ?? tabla.reduce((mejor, fila) =>
        diferencia(fila.diametroMm, buscado) < diferencia(mejor.diametroMm, buscado) ? fila : mejor,
      );
    }
    if (modo === "europea") {
      return tabla.find((f) => f.europea === buscado) ?? null;
    }
    return null;
  }, [configuracion, modo, valor]);

  const mostrar = (fila: TallaAnillo | null) => fila?.americana ?? "—";

  return (
    <section className={`overflow-hidden rounded-2xl border border-border bg-card shadow-card ${compacto ? "" : "max-w-2xl"}`}>
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Ruler className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-semibold">Conversor Profesional de Tallas de Anillo</h2>
          <p className="text-xs text-muted-foreground">Diámetro interno · Europa · USA</p>
        </div>
      </header>

      <div className="space-y-5 p-5">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-background p-4 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Diámetro</p>
              <p className="mt-1 text-lg font-semibold">{resultado.diametroMm.toFixed(1)} <span className="text-xs font-normal">mm</span></p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Europa</p>
              <p className="mt-1 text-lg font-semibold">{resultado.europea}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">USA</p>
              <p className="mt-1 text-lg font-semibold">{mostrar(resultado)}</p>
            </div>
          </div>
        ) : valor.trim() ? (
          <div className="rounded-xl border border-border p-4 text-center text-sm text-muted-foreground">
            No se encontró una equivalencia para esa talla.
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            Selecciona el tipo de búsqueda e ingresa el valor.
          </div>
        )}
      </div>
    </section>
  );
}
