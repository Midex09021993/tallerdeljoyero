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
  { key: "segundos", etiqueta: "S" },
] as const;

export function CuentaRegresivaNavidad() {
  const [tiempo, setTiempo] = useState<Tiempo>(() => calcularTiempo());

  useEffect(() => {
    const intervalo = window.setInterval(() => setTiempo(calcularTiempo()), 1000);
    return () => window.clearInterval(intervalo);
  }, []);

  return (
    <aside
      aria-label="Cuenta regresiva para Navidad"
      className="fixed right-3 top-[76px] z-40 select-none sm:right-5"
    >
      <div className="relative rounded-[13px] bg-[#ff3038] px-2.5 py-1.5 text-white shadow-[0_5px_0_rgba(196,25,38,.18),0_8px_18px_rgba(255,48,56,.16)] sm:px-3">
        {/* Side scallops inspired by the reference countdown badge */}
        <span aria-hidden="true" className="absolute -left-[5px] top-1/2 size-3 -translate-y-1/2 rounded-full bg-[#ff3038]" />
        <span aria-hidden="true" className="absolute -right-[5px] top-1/2 size-3 -translate-y-1/2 rounded-full bg-[#ff3038]" />
        {tiempo.terminado ? (
          <div className="relative px-2 py-2 text-center">
            <span className="block text-[11px] font-extrabold tracking-wide">¡FELIZ NAVIDAD!</span>
            <span className="mt-0.5 block text-[9px] font-semibold text-white/85">Que tengas una hermosa Navidad</span>
          </div>
        ) : (
          <div className="relative flex items-center divide-x divide-white/30">
            {UNIDADES.map(({ key, etiqueta }) => (
              <div key={key} className="flex min-w-[37px] flex-col items-center justify-center px-1.5 sm:min-w-[43px] sm:px-2">
                <span className="font-serif text-[23px] font-bold leading-[1] tracking-tight tabular-nums sm:text-[25px]">
                  {String(tiempo[key]).padStart(2, "0")}
                </span>
                <span className="mt-1 text-[7px] font-bold uppercase leading-none tracking-[.12em] text-white/90 sm:text-[8px]">
                  {etiqueta}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
