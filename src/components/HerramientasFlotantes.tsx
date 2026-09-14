import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Boxes, Calculator, ChevronLeft, Droplets, Gem, Ruler, Scale, Wrench } from "lucide-react";
import { CalculadoraAleacionOro } from "@/components/CalculadoraAleacionOro";
import { ConversorTallasAnillo } from "@/components/ConversorTallasAnillo";
import { VisorPesoJoyeria } from "@/components/VisorPesoJoyeria";
import { CalculadoraYeso } from "@/routes/_authenticated/taller";

type Herramienta = {
  id: string;
  nombre: string;
  icono: typeof Calculator;
  disponible: boolean;
};

const HERRAMIENTAS: Herramienta[] = [
  { id: "aurum-render", nombre: "AURUM RENDER · Estudio 3D", icono: Gem, disponible: true },
  { id: "yeso", nombre: "Calculadora Yeso/Agua", icono: Droplets, disponible: true },
  { id: "oro", nombre: "Calculadora de Aleación de Oro", icono: Gem, disponible: true },
  { id: "peso3d", nombre: "Visualizador y Peso 3D", icono: Boxes, disponible: true },
  { id: "volumen", nombre: "Calculadora de Volumen", icono: Calculator, disponible: false },
  { id: "peso", nombre: "Calculadora de Peso", icono: Scale, disponible: false },
  { id: "medidas", nombre: "Conversor de Medidas", icono: Ruler, disponible: false },
  { id: "tallas", nombre: "Conversor de Tallas de Anillo", icono: Ruler, disponible: true },
];

/** Menú lateral flotante de herramientas públicas para la pantalla de acceso. */
export function HerramientasFlotantes() {
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState<string>("yeso");

  return (
    <div className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 items-center">
      {/* Pestaña colapsada */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={abierto ? "Cerrar herramientas" : "Abrir herramientas"}
        className="flex h-36 w-10 flex-col items-center justify-center gap-2 rounded-l-2xl border border-r-0 border-ink-foreground/15 bg-ink text-ink-foreground/70 shadow-lg backdrop-blur transition-colors hover:text-gold"
      >
        <Wrench className="size-4" aria-hidden="true" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] [writing-mode:vertical-rl]">
          Herramientas
        </span>
      </button>

      {/* Panel desplegable */}
      <div
        className={`overflow-hidden border-y border-l border-ink-foreground/15 bg-ink/95 shadow-2xl backdrop-blur transition-all duration-300 ease-out ${
          abierto ? "w-[min(94vw,440px)] opacity-100" : "w-0 opacity-0"
        }`}
      >
        <div className="max-h-[80vh] w-[min(94vw,440px)] overflow-y-auto rounded-l-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">
              Herramientas
            </p>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-ink-foreground/15 text-ink-foreground/60 transition hover:border-gold hover:text-gold"
              aria-label="Cerrar herramientas"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
          </div>

          <nav className="space-y-1">
            {HERRAMIENTAS.map((h) => {
              const Icono = h.icono;
              const seleccionada = activa === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  disabled={!h.disponible}
                  onClick={() => {
                    if (h.id === "aurum-render") {
                      navigate({ to: "/aurum-render-public" });
                      return;
                    }
                    setActiva(h.id);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs transition ${
                    seleccionada
                      ? "bg-gold/15 text-gold"
                      : h.disponible
                        ? "text-ink-foreground/75 hover:bg-ink-foreground/5 hover:text-ink-foreground"
                        : "cursor-not-allowed text-ink-foreground/30"
                  }`}
                >
                  <Icono className="size-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{h.nombre}</span>
                  {!h.disponible ? (
                    <span className="text-[9px] uppercase tracking-wider text-ink-foreground/30">
                      Próximamente
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {activa === "yeso" ? (
            <div className="mt-4 rounded-xl bg-background p-1.5 text-foreground">
              <CalculadoraYeso compacto />
            </div>
          ) : null}
          {activa === "oro" ? (
            <div className="mt-4 rounded-xl bg-background p-1.5 text-foreground">
              <CalculadoraAleacionOro compacto />
            </div>
          ) : null}
          {activa === "tallas" ? (
            <div className="mt-4 rounded-xl bg-background p-1.5 text-foreground">
              <ConversorTallasAnillo compacto />
            </div>
          ) : null}
          {activa === "peso3d" ? (
            <div className="mt-4 rounded-xl bg-background p-1.5 text-foreground">
              <VisorPesoJoyeria compacto />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
