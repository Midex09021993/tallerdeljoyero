import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  Box,
  CheckCircle2,
  Cloud,
  File,
  FileText,
  Folder,
  HardDrive,
  Image as ImageIcon,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Search,
  UploadCloud,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useSesion } from "@/lib/auth";
import { nombreSeguro, subirConProgreso } from "@/lib/subir-archivo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/mi-nube")({
  head: () => ({
    meta: [
      { title: "Mi nube — Taller del Joyero" },
      {
        name: "description",
        content: "Centro privado de archivos y multimedia de Taller del Joyero.",
      },
    ],
  }),
  component: MiNubePage,
});

const BUCKET = "mi-nube";
const MAX_FILES_PER_BATCH = 30;

type Categoria = "fotos" | "videos" | "documentos" | "modelos-3d" | "otros";
type ArchivoNube = {
  nombre: string;
  ruta: string;
  carpeta: string;
  bytes: number;
  actualizado: string | null;
  categoria: Categoria;
};

const secciones: Array<{
  id: Categoria | "todos";
  titulo: string;
  descripcion: string;
  formatos: string;
  Icono: typeof ImageIcon;
}> = [
  { id: "fotos", titulo: "Fotos e imágenes", descripcion: "Fotografías de joyas y trabajos terminados.", formatos: "JPG · PNG · WEBP · HEIC", Icono: ImageIcon },
  { id: "videos", titulo: "Videos", descripcion: "Procesos de fabricación y material comercial.", formatos: "MP4 · MOV · WEBM", Icono: Video },
  { id: "documentos", titulo: "Documentos", descripcion: "Contratos, fichas técnicas y PDF.", formatos: "PDF · DOCX · XLSX · TXT", Icono: FileText },
  { id: "modelos-3d", titulo: "Biblioteca 3D", descripcion: "Diseños CAD y modelos para visualizar o renderizar.", formatos: "3DM · STL · OBJ · GLB", Icono: Box },
];

function clasificarArchivo(nombre: string): Categoria {
  const ext = nombre.split(".").pop()?.toLocaleLowerCase("es") ?? "";
  if (["jpg", "jpeg", "png", "webp", "avif", "gif", "heic", "heif"].includes(ext)) return "fotos";
  if (["mp4", "mov", "webm", "m4v", "avi"].includes(ext)) return "videos";
  if (["pdf", "doc", "docx", "xls", "xlsx", "csv", "txt", "rtf", "odt"].includes(ext)) return "documentos";
  if (["3dm", "stl", "obj", "glb", "gltf", "3mf", "ply", "fbx"].includes(ext)) return "modelos-3d";
  return "otros";
}

function etiquetaTamano(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function nombreVisible(nombre: string) {
  return nombre.replace(/^\d{13,}-/, "");
}

function MiNubePage() {
  const { data: sesion, isLoading: cargandoSesion } = useSesion();
  const participanteId = sesion?.participante?.id ?? null;
  const usuarioId = sesion?.user.id ?? null;
  const [busqueda, setBusqueda] = useState("");
  const [seccionActiva, setSeccionActiva] = useState<Categoria | "todos">("todos");
  const [carpeta, setCarpeta] = useState("Diseños");
  const [carpetas, setCarpetas] = useState<string[]>([]);
  const [archivos, setArchivos] = useState<ArchivoNube[]>([]);
  const [seleccionados, setSeleccionados] = useState<File[]>([]);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const cargarBiblioteca = useCallback(async () => {
    if (!participanteId || !usuarioId) {
      setCarpetas([]);
      setArchivos([]);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const raiz = `${participanteId}/${usuarioId}`;
      const { data: entradas, error: errorRaiz } = await supabase.storage
        .from(BUCKET)
        .list(raiz, { limit: 100, sortBy: { column: "name", order: "asc" } });
      if (errorRaiz) throw errorRaiz;

      const nombresCarpetas = (entradas ?? [])
        .filter((entrada) => !entrada.id && !entrada.metadata)
        .map((entrada) => entrada.name)
        .filter(Boolean);
      setCarpetas(nombresCarpetas);

      const resultados = await Promise.all(
        nombresCarpetas.map(async (nombreCarpeta) => {
          const { data, error: errorLista } = await supabase.storage
            .from(BUCKET)
            .list(`${raiz}/${nombreCarpeta}`, {
              limit: 100,
              sortBy: { column: "name", order: "desc" },
            });
          if (errorLista) throw errorLista;
          return (data ?? [])
            .filter((entrada) => Boolean(entrada.id || entrada.metadata))
            .map((entrada): ArchivoNube => {
              const nombre = entrada.name;
              return {
                nombre,
                ruta: `${raiz}/${nombreCarpeta}/${nombre}`,
                carpeta: nombreCarpeta,
                bytes: Number(entrada.metadata?.size ?? 0),
                actualizado: entrada.updated_at ?? entrada.created_at ?? null,
                categoria: clasificarArchivo(nombreVisible(nombre)),
              };
            });
        }),
      );
      setArchivos(resultados.flat());
    } catch (cause) {
      const mensaje = cause instanceof Error ? cause.message : "No se pudo cargar la biblioteca.";
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  }, [participanteId, usuarioId]);

  useEffect(() => {
    void cargarBiblioteca();
  }, [cargarBiblioteca]);

  const archivosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es");
    return archivos.filter((archivo) => {
      const coincideSeccion = seccionActiva === "todos" || archivo.categoria === seccionActiva;
      const coincideBusqueda = !termino || `${nombreVisible(archivo.nombre)} ${archivo.carpeta}`.toLocaleLowerCase("es").includes(termino);
      return coincideSeccion && coincideBusqueda;
    });
  }, [archivos, busqueda, seccionActiva]);

  const subirSeleccion = async () => {
    if (!participanteId || !usuarioId) {
      toast.error("Tu usuario no tiene un taller activo vinculado para Mi Nube.");
      return;
    }
    if (seleccionados.length === 0) {
      toast.error("Selecciona al menos un archivo.");
      return;
    }
    if (seleccionados.length > MAX_FILES_PER_BATCH) {
      toast.error(`Puedes subir hasta ${MAX_FILES_PER_BATCH} archivos por lote.`);
      return;
    }
    const carpetaSegura = nombreSeguro(carpeta.trim()).replace(/^\.+|\.+$/g, "");
    if (!carpetaSegura) {
      toast.error("Escribe un nombre de carpeta válido.");
      return;
    }

    setSubiendo(true);
    setProgreso(0);
    setError(null);
    let completados = 0;
    try {
      for (const file of seleccionados) {
        const nombre = nombreSeguro(file.name);
        if (!nombre) throw new Error(`El nombre de “${file.name}” no es válido.`);
        const ruta = `${participanteId}/${usuarioId}/${carpetaSegura}/${Date.now()}-${nombre}`;
        await subirConProgreso({
          bucket: BUCKET,
          ruta,
          file,
          onProgreso: (porcentaje) => setProgreso(Math.round(((completados + porcentaje / 100) / seleccionados.length) * 100)),
        });
        completados += 1;
        setProgreso(Math.round((completados / seleccionados.length) * 100));
      }
      setSeleccionados([]);
      const selector = document.getElementById("mi-nube-archivos") as HTMLInputElement | null;
      if (selector) selector.value = "";
      setCarpeta(carpetaSegura);
      await cargarBiblioteca();
      toast.success(`${completados} archivo(s) guardados en Mi Nube.`);
    } catch (cause) {
      const mensaje = cause instanceof Error ? cause.message : "No se pudieron subir los archivos.";
      setError(mensaje);
      toast.error(mensaje);
    } finally {
      setSubiendo(false);
    }
  };

  const abrirArchivo = async (archivo: ArchivoNube) => {
    const { data, error: errorUrl } = await supabase.storage.from(BUCKET).createSignedUrl(archivo.ruta, 60 * 10, {
      download: nombreVisible(archivo.nombre),
    });
    if (errorUrl || !data?.signedUrl) {
      toast.error(errorUrl?.message ?? "No se pudo generar el enlace privado.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <AppShell
      titulo="Mi Nube"
      subtitulo="Biblioteca privada de archivos del taller"
      atrasMovil={{ to: "/inicio" }}
    >
      <div className="mx-auto w-full max-w-[1440px] space-y-5">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-card sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-gold/10 blur-3xl" aria-hidden="true" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gold">
                <Cloud className="size-3.5" /> Biblioteca privada
              </span>
              <h2 className="mt-4 font-display text-3xl sm:text-4xl">Tus archivos, en un solo lugar.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Sube imágenes, documentos, videos y modelos 3D. Los archivos quedan privados y separados por taller y usuario.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/80 p-4">
              <div className="grid size-11 place-items-center rounded-xl bg-gold/10 text-gold"><HardDrive className="size-5" /></div>
              <div>
                <p className="text-sm font-semibold">Supabase Storage</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <LockKeyhole className="size-3.5 text-emerald-600" /> Acceso privado
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Filtrar por tipo de archivo">
          {secciones.map(({ id, titulo, descripcion, formatos, Icono }) => {
            const activa = seccionActiva === id;
            const cantidad = archivos.filter((archivo) => archivo.categoria === id).length;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSeccionActiva(activa ? "todos" : id)}
                aria-pressed={activa}
                className={`rounded-2xl border p-4 text-left shadow-card transition hover:border-gold/50 sm:p-5 ${activa ? "border-gold/60 bg-gold/5" : "border-border bg-card"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={`grid size-10 place-items-center rounded-xl ${activa ? "bg-gold/15 text-gold" : "bg-surface-muted text-muted-foreground"}`}><Icono className="size-5" /></div>
                  <span className="rounded-full border border-border px-2 py-1 text-xs font-semibold">{cantidad}</span>
                </div>
                <h3 className="mt-4 text-sm font-semibold">{titulo}</h3>
                <p className="mt-2 hidden min-h-10 text-xs leading-5 text-muted-foreground sm:block">{descripcion}</p>
                <p className="mt-3 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{formatos}</p>
              </button>
            );
          })}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Subir archivos</h3>
              <p className="mt-1 text-sm text-muted-foreground">Selecciona varios archivos y guárdalos juntos en una carpeta.</p>
            </div>
            <UploadCloud className="size-6 shrink-0 text-gold" />
          </div>

          {cargandoSesion ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Comprobando sesión…</p>
          ) : !participanteId || !usuarioId ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <p>No hay un taller activo vinculado a esta sesión. La subida está bloqueada para no guardar archivos sin propietario.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <div className="space-y-3">
                <label className="block text-xs font-semibold">
                  Carpeta
                  <input
                    value={carpeta}
                    onChange={(event) => setCarpeta(event.target.value)}
                    maxLength={60}
                    placeholder="Ej. Anillo esmeralda"
                    className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    disabled={subiendo}
                  />
                </label>
                <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gold/40 bg-gold/5 p-4 text-center transition hover:bg-gold/10">
                  <UploadCloud className="size-7 text-gold" />
                  <span className="mt-2 text-sm font-semibold">Elegir archivos</span>
                  <span className="mt-1 text-xs text-muted-foreground">Imágenes, PDF, STL, 3DM y más · hasta 30 por lote</span>
                  <input
                    id="mi-nube-archivos"
                    type="file"
                    multiple
                    className="sr-only"
                    disabled={subiendo}
                    onChange={(event) => setSeleccionados(Array.from(event.target.files ?? []))}
                  />
                </label>
                {seleccionados.length > 0 && (
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs font-semibold">{seleccionados.length} archivo(s) seleccionados</p>
                    <ul className="mt-2 max-h-24 space-y-1 overflow-auto text-xs text-muted-foreground">
                      {seleccionados.map((file, index) => <li key={`${file.name}-${index}`} className="truncate">{file.name} · {etiquetaTamano(file.size)}</li>)}
                    </ul>
                  </div>
                )}
                {subiendo && (
                  <div>
                    <div className="mb-1 flex justify-between text-xs"><span>Subiendo…</span><span>{progreso}%</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progreso}%` }} /></div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void subirSeleccion()}
                  disabled={subiendo || seleccionados.length === 0}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 text-sm font-semibold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {subiendo ? <LoaderCircle className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                  {subiendo ? `Subiendo ${progreso}%` : "Subir a Mi Nube"}
                </button>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-semibold">Cómo se guardan</p>
                <ul className="mt-3 space-y-3 text-xs leading-5 text-muted-foreground">
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Los archivos quedan en una carpeta con el nombre que elijas.</li>
                  <li className="flex gap-2"><LockKeyhole className="mt-0.5 size-4 shrink-0 text-emerald-600" /> El bucket es privado; no se publican enlaces permanentes.</li>
                  <li className="flex gap-2"><Box className="mt-0.5 size-4 shrink-0 text-gold" /> STL y 3DM se conservan como archivos originales; la apertura en las herramientas se comprobará en la siguiente prueba.</li>
                </ul>
              </div>
            </div>
          )}
          {error && <p role="alert" className="mt-4 rounded-xl border border-danger/25 bg-danger-soft p-3 text-xs text-danger">{error}</p>}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">Mis archivos</h3>
              <p className="mt-1 text-sm text-muted-foreground">{archivos.length} archivo(s) · {carpetas.length} carpeta(s)</p>
            </div>
            <div className="flex gap-2">
              <label className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Buscar archivo o carpeta"
                  aria-label="Buscar archivos"
                  className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold"
                />
              </label>
              <button type="button" onClick={() => void cargarBiblioteca()} disabled={cargando} className="grid size-10 shrink-0 place-items-center rounded-xl border border-border hover:border-gold/50 disabled:opacity-50" aria-label="Actualizar biblioteca">
                <RefreshCw className={`size-4 ${cargando ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {carpetas.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setBusqueda("")} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-gold/50"><Folder className="size-3.5" /> Todas las carpetas</button>
              {carpetas.map((nombre) => (
                <button key={nombre} type="button" onClick={() => setBusqueda(nombre)} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-gold/50"><Folder className="size-3.5" /> {nombre}</button>
              ))}
            </div>
          )}

          {cargando ? (
            <div className="flex justify-center py-12 text-sm text-muted-foreground"><LoaderCircle className="mr-2 size-4 animate-spin" /> Cargando archivos…</div>
          ) : archivosFiltrados.length > 0 ? (
            <div className="mt-4 divide-y divide-border rounded-xl border border-border">
              {archivosFiltrados.map((archivo) => {
                const Icono = archivo.categoria === "fotos" ? ImageIcon : archivo.categoria === "videos" ? Video : archivo.categoria === "documentos" ? FileText : archivo.categoria === "modelos-3d" ? Box : File;
                return (
                  <div key={archivo.ruta} className="flex items-center gap-3 p-3 sm:p-4">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-muted text-muted-foreground"><Icono className="size-5" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{nombreVisible(archivo.nombre)}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{archivo.carpeta} · {etiquetaTamano(archivo.bytes)}</p>
                    </div>
                    <button type="button" onClick={() => void abrirArchivo(archivo)} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold transition hover:border-gold/50" aria-label={`Descargar ${nombreVisible(archivo.nombre)}`}>
                      <ArrowDownToLine className="size-4" /><span className="hidden sm:inline">Abrir / descargar</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-10 text-center">
              <Folder className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-3 text-sm font-semibold">{error ? "No se pudo leer el almacenamiento" : "Tu biblioteca está vacía"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{error ? "Revisa que Lovable haya aplicado la migración de Mi Nube." : "Selecciona la imagen, el STL y el 3DM para hacer la primera prueba."}</p>
            </div>
          )}
        </section>
        <p className="flex items-start gap-2 px-1 text-xs leading-5 text-muted-foreground"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" /> Los enlaces de apertura duran 10 minutos. Los archivos no se hacen públicos.</p>
      </div>
    </AppShell>
  );
}
