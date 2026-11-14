import { useCallback, useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { PublicCatalogViewer } from "@/components/PublicCatalogViewer";

const ACCEPTED = /\\.(3dm|glb|gltf|stl|obj|fbx)$/i;

export function AurumPublicViewerTest() {
  const [file, setFile] = useState<File | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const dragDepth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);

  const selectFile = useCallback((nextFile: File | null) => {
    if (!nextFile || !ACCEPTED.test(nextFile.name)) return;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const nextUrl = URL.createObjectURL(nextFile);
    urlRef.current = nextUrl;
    setFile(nextFile);
    setModelUrl(nextUrl);
  }, []);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }, []);

  return (
    <main className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-white text-[#514b3e]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#e8e3d9] bg-[#faf9f6] px-5">
        <div className="text-[10px] font-semibold uppercase tracking-[.18em]">AURUM RENDER · Visor público original</div>
        {file && (
          <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-[#d8cba9] bg-white px-3 py-2 text-xs font-semibold hover:bg-[#f7f1e3]">
            <Upload className="size-4" /> Cambiar archivo
          </button>
        )}
        <input ref={inputRef} type="file" accept=".3dm,.glb,.gltf,.stl,.obj,.fbx" className="hidden" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} />
      </header>
      <section
        className="relative min-h-0 flex-1"
        onDragEnter={(event) => {
          event.preventDefault();
          dragDepth.current += 1;
          setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          dragDepth.current = 0;
          setDragActive(false);
          const dropped = Array.from(event.dataTransfer.files).find((candidate) => ACCEPTED.test(candidate.name));
          if (dropped) selectFile(dropped);
        }}
      >
        {modelUrl && file ? (
          <PublicCatalogViewer
            key={file.name + ":" + file.size + ":" + file.lastModified}
            modelUrl={modelUrl}
            modelName={file.name}
            materialId="oro18a_ijewel_premium"
            gemId="diamante_natural"
            hideControls={false}
          />
        ) : (
          <div className="grid h-full place-items-center p-8 text-center">
            <div className="max-w-md">
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl border border-[#d8cba9] bg-[#faf7ef] text-[#a48643]"><Upload className="size-7" /></div>
              <h1 className="text-base font-semibold">Carga tu diseño de joyería</h1>
              <p className="mt-2 text-sm text-[#827a6d]">Selecciona un archivo o arrástralo a esta misma ventana para abrirlo en el visor público original.</p>
              <button type="button" onClick={() => inputRef.current?.click()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#d4af37] px-5 py-3 text-sm font-semibold text-[#292824] shadow-sm hover:bg-[#e1bf50]"><Upload className="size-4" /> Seleccionar archivo</button>
              <p className="mt-3 text-[10px] uppercase tracking-[.14em] text-[#aaa18f]">3DM · GLB · STL · OBJ · FBX</p>
              <p className="mt-2 text-xs text-[#a49b8d]">También puedes arrastrar y soltar el archivo aquí</p>
            </div>
          </div>
        )}
        {dragActive && (
          <div className="pointer-events-none absolute inset-3 z-30 grid place-items-center rounded-2xl border-2 border-dashed border-[#d4af37] bg-white/90 text-center shadow-[0_12px_45px_rgba(90,70,25,.12)] backdrop-blur-sm">
            <div className="px-6 py-8">
              <Upload className="mx-auto size-10 text-[#a48643]" />
              <div className="mt-4 text-lg font-semibold">Suelta el archivo para abrirlo</div>
              <p className="mt-2 text-xs uppercase tracking-[.14em] text-[#93866d]">3DM · GLB · STL · OBJ · FBX</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
