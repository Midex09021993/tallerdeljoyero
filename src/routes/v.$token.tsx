import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Gem } from "lucide-react";
import { PublicJewelConfigurator } from "@/components/PublicJewelConfigurator";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/v/$token")({
  head: () => ({
    meta: [
      { title: "Visor 3D compartido — Taller del Joyero" },
      { name: "description", content: "Visualizador 3D público para revisar una joya compartida." },
    ],
  }),
  component: VisorCortoPage,
});

type EnlaceVisor = { modelo_url: string; nombre: string; expira_en: string };

function VisorCortoPage() {
  const { token } = Route.useParams();
  const [enlace, setEnlace] = useState<EnlaceVisor | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let activo = true;
    void supabase.rpc("resolver_enlace_visor_3d", { _token: token })
      .then(({ data, error: rpcError }) => {
        if (!activo) return;
        const fila = Array.isArray(data) ? (data[0] as EnlaceVisor | undefined) : undefined;
        if (rpcError || !fila || new Date(fila.expira_en).getTime() <= Date.now()) {
          setError(true);
        } else {
          setEnlace(fila);
        }
        setCargando(false);
      })
      .catch(() => {
        if (activo) { setError(true); setCargando(false); }
      });
    return () => { activo = false; };
  }, [token]);

  if (cargando) {
    return <main className="grid min-h-screen place-items-center bg-[#f7f6f2] text-sm text-[#77756f]">Preparando el visor 3D…</main>;
  }

  if (error || !enlace) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f6f2] px-4 text-[#292824]">
        <section className="w-full max-w-md rounded-2xl border border-[#e7e2d8] bg-white p-7 text-center shadow-sm">
          <AlertCircle className="mx-auto size-8 text-[#a66b26]" />
          <h1 className="mt-3 text-base font-semibold">Enlace caducado o no válido</h1>
          <p className="mt-2 text-sm text-[#77756f]">Pide a quien compartió la joya que genere un nuevo enlace desde Mi Nube.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#292824] md:h-[100svh] md:min-h-0 md:overflow-hidden md:p-3 lg:p-4">
      <div className="mx-auto w-full max-w-none md:h-full md:min-h-0">
        <PublicJewelConfigurator sharedModelUrl={enlace.modelo_url} sharedModelName={enlace.nombre} />
      </div>
    </main>
  );
}
