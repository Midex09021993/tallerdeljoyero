import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Upload, FileBox } from "lucide-react";
import { PublicJewelConfigurator } from "@/components/PublicJewelConfigurator";

export const Route = createFileRoute("/aurum-render-public")({
  head: () => ({
    meta: [
      { title: "Visor 3D compartido — Taller del Joyero" },
      { name: "robots", content: "noindex, follow" },
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
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get("modeloCompartido");
    const name = (params.get("nombre") || "joya-compartida")
      .replace(/[^a-z0-9-_]/gi, "-")
      .slice(0, 80) || "joya-compartida";

    // This route is a dedicated viewer, not the Aurum Render editor.
    // A model can only be loaded when the full share URL includes its signed storage URL.
    if (!sharedUrl) {
      setLinkInvalido(false);
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

  const handleLocalFile = (file?: File) => {
    setFileError(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".3dm")) {
      setFileError("Selecciona un archivo Rhino .3dm.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setFileError("El archivo supera el límite de 100 MB para el visor público.");
      return;
    }
    setLocalFile(file);
  };

  const displayName = modelName
    .replace(/\\.(glb|gltf|3dm|obj|stl|fbx)$/i, "")
    .replace(/^[0-9a-f]{8}-[0-9a-f-]{27,}[-_]?/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\\s+/g, " ")
    .trim() || "Joya compartida";

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#292824] md:h-[100svh] md:min-h-0 md:overflow-hidden md:p-3 lg:p-4">

      <section className="mx-auto w-full max-w-none p-0 md:h-full md:min-h-0">
        {linkInvalido ? (
          <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-[#e7e2d8] bg-white p-6 text-center shadow-sm">
            <AlertCircle className="mx-auto size-8 text-[#a66b26]" />
            <h2 className="mt-3 text-base font-semibold">Enlace no válido</h2>
            <p className="mt-2 text-sm text-[#77756f]">Abriste la dirección general del visor, sin el enlace privado de una joya. Entra a Mi Nube, pulsa “Crear enlace del visor 3D” en el archivo GLB y abre o copia ese enlace completo. Aurum Render y este visualizador son independientes.</p>
          </div>
        ) : modelUrl || localFile ? (
          <div className="mx-auto w-full max-w-none">
            <PublicJewelConfigurator
              {...(localFile ? { localFile } : { sharedModelUrl: modelUrl!, sharedModelName: modelName })}
            />
            {localFile && (
              <div className="mx-auto mt-3 flex max-w-3xl items-center justify-between gap-3 rounded-xl border border-[#e7e2d8] bg-white px-4 py-3 text-sm">
                <span className="min-w-0 truncate text-[#625b54]">Archivo temporal: <strong>{localFile.name}</strong></span>
                <button type="button" onClick={() => { setLocalFile(null); setFileError(null); }} className="shrink-0 rounded-lg border border-[#e7e2d8] px-3 py-2 text-xs font-semibold hover:bg-[#f7f6f2]">Quitar modelo</button>
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-[#e7e2d8] bg-white p-6 text-center shadow-sm sm:mt-14 sm:p-10">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-[#eadfc9] bg-[#f8f1e3] text-[#92702f]"><FileBox className="size-7" /></div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#292824]">Visualiza tu joya en 3D</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#77756f]">Carga un archivo Rhino .3dm y explóralo en el navegador. El archivo se procesa localmente y no se guarda en tu cuenta ni en la nube.</p>
            <label className="mt-6 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#b28b45] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#987336]">
              <Upload className="size-4" /> Seleccionar archivo .3dm
              <input type="file" accept=".3dm,application/octet-stream" className="sr-only" onChange={(event) => { handleLocalFile(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
            </label>
            <p className="mt-3 text-xs text-[#8a857c]">Máximo 100 MB · No requiere iniciar sesión</p>
            {fileError && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{fileError}</p>}
            <div className="mt-6 rounded-xl bg-[#f7f6f2] p-3 text-left text-xs leading-relaxed text-[#77756f]">
              <strong className="text-[#625b54]">Privacidad:</strong> al recargar o cerrar esta página, tendrás que seleccionar el archivo otra vez. No se crea un enlace compartido ni se sube el archivo a Mi Nube.
            </div>
          </div>
        )}
      </section>
      <footer className="px-4 pb-4 text-center text-[11px] text-[#8a857c]">
        Visualización independiente · No necesitas acceder a Aurum Render
      </footer>
    </main>
  );
}
