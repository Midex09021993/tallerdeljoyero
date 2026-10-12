import { Fragment, useState } from "react";
import { Printer, X } from "lucide-react";
import { calcularMezclaYeso, type ConfigYeso } from "@/lib/calculadoras-config";

export type CilindroFicha = {
  id: string;
  nombre: string;
  diametroCm: number;
  alturaCm: number;
  tipoTarro: "liso" | "perforado";
};

type IdentidadTaller = {
  nombre?: string | null;
  logoUrl?: string | null;
};

type Props = {
  cilindros: CilindroFicha[];
  configuracion: ConfigYeso;
  identidad?: IdentidadTaller;
};

const numero = (value: number) =>
  new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(value);

const recetas = [
  { agua: 38, yeso: 62 },
  { agua: 40, yeso: 60 },
  { agua: 42, yeso: 58 },
] as const;

export function FichaCilindrosTallerA4({ cilindros, configuracion, identidad }: Props) {
  const [abierta, setAbierta] = useState(false);
  const nombreTaller = identidad?.nombre?.trim() || "Mi taller";
  const filas = cilindros.map((cilindro) => {
    const volumenBase = Math.PI * (cilindro.diametroCm / 2) ** 2 * cilindro.alturaCm;
    const volumen = volumenBase * (1 + configuracion.tolerancias[cilindro.tipoTarro] / 100);
    const mezclas = recetas.map((receta) => calcularMezclaYeso(
      volumen,
      receta.agua,
      receta.yeso,
      configuracion.volumenPorGramo,
      configuracion.factorCorreccion,
    ));
    return { ...cilindro, mezclas };
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        disabled={cilindros.length === 0}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-semibold text-foreground transition hover:border-gold hover:bg-gold/15 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Printer className="size-4" aria-hidden="true" />
        Imprimir ficha de pared A4
      </button>

      {abierta ? (
        <div className="fixed inset-0 z-[110] overflow-y-auto bg-slate-950/75 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Ficha de cilindros del taller">
          <style>{`
            @page { size: A4 portrait; margin: 0; }
            @media print {
              body * { visibility: hidden !important; }
              .ficha-cilindros-a4-print, .ficha-cilindros-a4-print * { visibility: visible !important; }
              .ficha-cilindros-a4-print { position: absolute !important; inset: 0 auto auto 0 !important; width: 210mm !important; min-height: 297mm !important; margin: 0 !important; padding: 9mm !important; box-shadow: none !important; }
              .ficha-cilindros-a4-toolbar { display: none !important; }
            }
          `}</style>
          <div className="ficha-cilindros-a4-toolbar mx-auto mb-3 flex max-w-[210mm] justify-end gap-2">
            <button type="button" onClick={() => window.print()} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#d8bd7b] px-4 py-2 text-sm font-bold text-slate-950">
              <Printer className="size-4" /> Imprimir / Guardar PDF
            </button>
            <button type="button" onClick={() => setAbierta(false)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800">
              <X className="size-4" /> Cerrar
            </button>
          </div>

          <article className="ficha-cilindros-a4-print mx-auto flex min-h-[297mm] w-full max-w-[210mm] flex-col bg-white p-5 text-slate-950 shadow-2xl sm:p-8" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
            <header className="flex items-center gap-4 border-b-[3px] border-slate-900 pb-4">
              {identidad?.logoUrl ? (
                <img src={identidad.logoUrl} alt={`Logotipo de ${nombreTaller}`} className="max-h-16 w-20 shrink-0 object-contain" />
              ) : (
                <div className="grid size-16 shrink-0 place-items-center border-2 border-slate-900 text-center text-[9px] font-black">LOGO<br />TALLER</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold uppercase tracking-[.22em] text-slate-600">Protocolo de fundición · Referencia rápida</p>
                <h1 className="mt-1 break-words text-xl font-black uppercase leading-tight">{nombreTaller}</h1>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider">Ficha de preparación de cilindros</p>
              </div>
              <div className="hidden text-right text-[9px] font-bold uppercase sm:block">Agua +<br />revestimiento</div>
            </header>

            <section className="mt-4">
              <div className="mb-2 flex items-end justify-between gap-3">
                <h2 className="text-sm font-black uppercase">Tabla de medidas y mezcla</h2>
                <p className="text-[9px] text-slate-600">Medidas en cm · agua en ml · yeso en g</p>
              </div>
              <table className="w-full table-fixed border-collapse text-center text-[8px] leading-tight">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th rowSpan={2} className="w-[19%] border border-slate-900 px-1.5 py-2 text-left">Cilindro</th>
                    <th colSpan={3} className="border border-slate-900 px-1 py-1.5">Medidas</th>
                    {recetas.map((receta) => <th key={receta.agua} colSpan={2} className="border border-slate-900 px-1 py-1.5">{receta.agua}/{receta.yeso}</th>)}
                  </tr>
                  <tr className="bg-slate-200 font-bold">
                    <th className="border border-slate-400 px-1 py-1.5">Ø</th>
                    <th className="border border-slate-400 px-1 py-1.5">Alt.</th>
                    <th className="border border-slate-400 px-1 py-1.5">Tarro</th>
                    {recetas.map((receta) => (
                      <Fragment key={receta.agua}>
                        <th className="border border-slate-400 px-1 py-1.5">Agua</th>
                        <th className="border border-slate-400 px-1 py-1.5">Yeso</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filas.map((fila) => (
                    <tr key={fila.id} className="break-inside-avoid odd:bg-white even:bg-slate-100">
                      <th className="border border-slate-300 px-1.5 py-2 text-left font-bold">{fila.nombre}</th>
                      <td className="border border-slate-300 px-1 py-2">{numero(fila.diametroCm)}</td>
                      <td className="border border-slate-300 px-1 py-2">{numero(fila.alturaCm)}</td>
                      <td className="border border-slate-300 px-1 py-2">{fila.tipoTarro === "liso" ? "Liso" : "Perforado"}</td>
                      {fila.mezclas.map((mezcla, index) => (
                        <Fragment key={`${index}-${mezcla.partesYeso}`}>
                          <td className="border border-slate-300 px-1 py-2 font-semibold">{Math.round(mezcla.agua)}</td>
                          <td className="border border-slate-300 px-1 py-2 font-semibold">{Math.round(mezcla.yeso)}</td>
                        </Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[8px] leading-relaxed text-slate-600">Los valores son estimaciones calculadas con la configuración vigente de la calculadora. Comprueba siempre las proporciones, tolerancias y cantidades con la ficha técnica del revestimiento utilizado.</p>
            </section>

            <section className="mt-4 rounded-md border-2 border-slate-900 p-3">
              <h2 className="text-xs font-black uppercase tracking-wide">Protocolo de vacío y fraguado</h2>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div className="border-l-2 border-slate-900 pl-2">
                  <p className="text-[8px] font-bold uppercase text-slate-600">1 · Mezcla</p>
                  <p className="mt-1 text-[10px] font-black">Según fabricante</p>
                  <p className="mt-1 text-[8px] leading-snug">Cronometra el mezclado y respeta el tiempo de trabajo indicado.</p>
                </div>
                <div className="border-l-2 border-slate-900 pl-2">
                  <p className="text-[8px] font-bold uppercase text-slate-600">2 · Vacío</p>
                  <p className="mt-1 text-[10px] font-black">Equipo calibrado</p>
                  <p className="mt-1 text-[8px] leading-snug">Usa el nivel y la duración indicados por el fabricante y el equipo.</p>
                </div>
                <div className="border-l-2 border-slate-900 pl-2">
                  <p className="text-[8px] font-bold uppercase text-slate-600">3 · Reposo</p>
                  <p className="mt-1 text-[10px] font-black">Antes del horno</p>
                  <p className="mt-1 text-[8px] leading-snug">Respeta el fraguado y el ciclo de quemado recomendado.</p>
                </div>
              </div>
              <p className="mt-3 border-t border-slate-300 pt-2 text-[8px] font-bold leading-relaxed">SEGURIDAD: no tomes estos tiempos como universales. La proporción agua/polvo, el vacío, el fraguado y el ciclo de horno cambian según el revestimiento y las instrucciones del fabricante.</p>
            </section>

            <footer className="mt-auto flex items-end justify-between gap-3 border-t border-slate-300 pt-3 text-[8px] text-slate-600">
              <span>Ficha de uso interno · Taller de joyería</span>
              <span className="text-right font-bold uppercase">Verificar antes de cada colada</span>
            </footer>
          </article>
        </div>
      ) : null}
    </>
  );
}
