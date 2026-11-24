import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { registrarVisitaAfiliado } from "@/lib/aurum-afiliados-referral";

export const Route = createFileRoute("/r/$codigo")({
  component: EnlaceAfiliadoPage,
});

function EnlaceAfiliadoPage() {
  const { codigo } = Route.useParams();

  useEffect(() => {
    let cancelled = false;
    void registrarVisitaAfiliado(codigo)
      .catch((error) => console.warn("[afiliados] No se pudo registrar la visita:", error))
      .finally(() => {
        if (!cancelled) window.location.replace("/cursos-diseno-3d");
      });
    return () => { cancelled = true; };
  }, [codigo]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f6f2] px-5 text-[#1d2b39]">
      <div className="w-full max-w-sm rounded-2xl border border-[#e8dfca] bg-white p-7 text-center shadow-sm">
        <img src="/brand/aurum-symbol.svg" alt="AURUM LAB" width="48" height="42" className="mx-auto h-11 w-12 object-contain" />
        <p className="mt-4 text-xs font-bold uppercase tracking-[.2em] text-[#a17a2e]">AURUM LAB PARTNERS</p>
        <h1 className="mt-2 text-lg font-semibold">Preparando tu acceso al curso</h1>
        <p className="mt-2 text-sm text-[#64778a]">Estamos registrando tu recomendación. En un momento continuarás a la página del curso.</p>
      </div>
    </main>
  );
}
