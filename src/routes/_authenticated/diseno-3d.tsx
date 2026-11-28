import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/diseno-3d")({
  head: () => ({
    meta: [{ title: "Diseño 3D — Aurum Lab" }],
  }),
  component: Diseo3DPage,
});

function Diseo3DPage() {
  const [nivelEscrito, setNivelEscrito] = useState(0);

  useEffect(() => {
    // Copiado del efecto funcional de la landing pública del curso.
    setNivelEscrito(0);
    let letras = 0;
    let escritura: number | undefined;
    let pausa: number | undefined;
    const inicio = window.setTimeout(() => {
      escritura = window.setInterval(() => {
        if (letras < 7) {
          letras += 1;
          setNivelEscrito(letras);
          if (letras === 7) {
            pausa = window.setTimeout(() => {
              letras = 0;
              setNivelEscrito(0);
            }, 1400);
          }
        }
      }, 850);
    }, 500);
    return () => {
      window.clearTimeout(inicio);
      if (escritura !== undefined) window.clearInterval(escritura);
      if (pausa !== undefined) window.clearTimeout(pausa);
    };
  }, []);

  return (
    <AppShell titulo="Diseño 3D" subtitulo="Módulo en preparación">
      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-2xl border border-[#e7d8b4] bg-gradient-to-br from-white via-[#fffdf8] to-[#f5f7f9] p-6 shadow-sm sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#a17a2e]">AURUM LAB · Formación</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#203243] sm:text-4xl">
            Diseño 3D <span className="text-[#b58b37]">– <span className="inline-block min-w-[1ch] whitespace-nowrap border-r-2 border-[#b58b37] pr-[.08em] align-bottom animate-pulse" style={{ borderRightColor: nivelEscrito >= 7 ? "transparent" : "#b58b37" }}>{ "Nivel 1".slice(0, nivelEscrito) }<span className="sr-only">Nivel 1</span></span></span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#627487]">El módulo de formación en diseño CAD 3D para joyería se encuentra en preparación.</p>
        </div>
      </section>
    </AppShell>
  );
}
