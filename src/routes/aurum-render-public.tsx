import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Box, AlertCircle } from "lucide-react";
import { PublicJewelConfigurator } from "@/components/PublicJewelConfigurator";

export const Route = createFileRoute("/aurum-render-public")({
  head: () => ({
    meta: [
      { title: "Visor 3D compartido — Taller del Joyero" },
      {
        name: "description",
        content: "Visualizador 3D público para revisar una joya compartida.",
      },
      { property: "og:title", content: "Visor 3D compartido — Taller del Joyero" },
      {
        property: "og:description",
        content: "Abre y gira el modelo 3D compartido sin entrar a Aurum Render.",
      },
    ],
  }),
  component: VisorJoyaCompartidaPage,
});

function VisorJoyaCompartidaPage() {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [modelName, setModelName] = useState("joya-compartida");
  const [linkInvalido, setLinkInvalido] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get("modeloCompartido");
    const name = (params.get("nombre") || "joya-compartida")
      .replace(/[^a-z0-9-_]/gi, "-")
      .slice(0, 80) || "joya-compartida";

    // This route is a dedicated viewer, not the Aurum Render editor.
    // A model can only be loaded when the full share URL includes its signed storage URL.
    if (!sharedUrl) {
      setLinkInvalido(true);
      return;
    }

    try {
      const target = new URL(sharedUrl);
      const configured = (import.meta.env as { VITE_SUPABASE_URL?: string }).VITE_SUPABASE_URL;
      const expectedOrigin = configured ? new URL(configured).origin : null;
      const validStoragePath = target.pathname.includes("/storage/v1/object/sign/mi-nube/");
      const hasSignature = target.searchParams.has("token") || target.searchParams.has("signature");
      if (!expectedOrigin || target.origin !== expectedOrigin || !validStoragePath || !hasSignature) {
        setLinkInvalido(true);
        return;
      }
      setModelName(name.toLowerCase().endsWith(".glb") ? name : `${name}.glb`);
      setModelUrl(sharedUrl);
      setLinkInvalido(false);
    } catch {
      setLinkInvalido(true);
    }
  }, []);

  const displayName = modelName
    .replace(/\\.(glb|gltf|3dm|obj|stl|fbx)$/i, "")
    .replace(/^[0-9a-f]{8}-[0-9a-f-]{27,}[-_]?/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\\s+/g, " ")
    .trim() || "Joya compartida";

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#292824]">
      <header className="flex min-h-[68px] items-center justify-between gap-3 border-b border-[#e7e2d8] bg-white px-4 py-3 sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d4af37]/15 text-[#8b6b16]">
            <Box className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold sm:text-base">{modelName.replace(/\.glb$/i, "")}</h1>
            <p className="text-[11px] text-[#77756f]">Visor 3D compartido · Taller del Joyero</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-[#e7e2d8] px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-[#77756f]">
          Solo visualización
        </span>
      </header>
      <section className="mx-auto max-w-7xl p-3 sm:p-5">
        {linkInvalido ? (
          <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-[#e7e2d8] bg-white p-6 text-center shadow-sm">
            <AlertCircle className="mx-auto size-8 text-[#a66b26]" />
            <h2 className="mt-3 text-base font-semibold">Enlace no válido</h2>
            <p className="mt-2 text-sm text-[#77756f]">Abriste la dirección general del visor, sin el enlace privado de una joya. Entra a Mi Nube, pulsa “Crear enlace del visor 3D” en el archivo GLB y abre o copia ese enlace completo. Aurum Render y este visualizador son independientes.</p>
          </div>
        ) : modelUrl ? (
          <div className="mx-auto max-w-5xl">
            <PublicJewelConfigurator
              sharedModelUrl={modelUrl}
              sharedModelName={modelName}
            />
          </div>
        ) : (
          <div className="grid h-[65vh] min-h-[360px] place-items-center rounded-2xl border border-[#e7e2d8] bg-white text-sm text-[#77756f]">
            Preparando el visor 3D…
          </div>
        )}
      </section>
      <footer className="px-4 pb-4 text-center text-[11px] text-[#8a857c]">
        Visualización independiente · No necesitas acceder a Aurum Render
      </footer>
    </main>
  );
}
