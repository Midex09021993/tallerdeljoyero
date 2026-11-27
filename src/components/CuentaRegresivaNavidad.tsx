import { useEffect, useState } from "react";

type Tiempo = { dias: number; horas: number; minutos: number; segundos: number; terminado: boolean };

function calcularTiempo(): Tiempo {
  const ahora = new Date();
  let navidad = new Date(ahora.getFullYear(), 11, 25, 0, 0, 0);
  if (ahora >= navidad) navidad = new Date(ahora.getFullYear() + 1, 11, 25, 0, 0, 0);
  const diferencia = Math.max(0, navidad.getTime() - ahora.getTime());
  const totalSegundos = Math.floor(diferencia / 1000);
  return {
    dias: Math.floor(totalSegundos / 86400),
    horas: Math.floor((totalSegundos % 86400) / 3600),
    minutos: Math.floor((totalSegundos % 3600) / 60),
    segundos: totalSegundos % 60,
    terminado: diferencia === 0,
  };
}

const UNIDADES = [
  { key: "dias", etiqueta: "DÍAS" },
  { key: "horas", etiqueta: "H" },
  { key: "minutos", etiqueta: "MIN" },
  { key: "segundos", etiqueta: "SEG" },
] as const;

export function CuentaRegresivaNavidad() {
  const [tiempo, setTiempo] = useState<Tiempo>(() => calcularTiempo());

  useEffect(() => {
    const intervalo = window.setInterval(() => setTiempo(calcularTiempo()), 1000);
    return () => window.clearInterval(intervalo);
  }, []);

  return (
    <aside aria-label="Cuenta regresiva para Navidad" className="fixed right-3 top-[78px] z-20 rounded-2xl border border-[#e5c66c] bg-[#17232d]/95 px-3 py-2 text-white shadow-lg shadow-[#17232d]/15 backdrop-blur-sm sm:right-5 sm:px-4">
      <div className="mb-1 flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase tracking-[.2em] text-[#f5d77d]">
        <span aria-hidden="true">✦</span> {tiempo.terminado ? "¡Feliz Navidad!" : "Cuenta regresiva · Navidad"}
      </div>
      {tiempo.terminado ? (
        <p className="px-2 py-1 text-center text-sm font-semibold text-[#fff3cc]">¡Que tengas una hermosa Navidad!</p>
      ) : (
        <div className="flex items-center gap-1.5 sm:gap-2">
          {UNIDADES.map(({ key, etiqueta }) => (
            <div key={key} className="min-w-[34px] rounded-lg bg-white/10 px-1.5 py-1 text-center sm:min-w-[42px] sm:px-2">
              <span className="block font-serif text-lg font-bold leading-none tabular-nums text-white sm:text-xl">{String(tiempo[key]).padStart(2, "0")}</span>
              <span className="mt-1 block text-[8px] font-semibold tracking-[.12em] text-[#f5d77d]">{etiqueta}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
