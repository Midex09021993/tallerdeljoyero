import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
  Share2,
  Copy,
  Pencil,
  X,
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

/** Marco visual compartido para que las fichas propias y recibidas evolucionen juntas. */
function FichaProyecto({ portada, nombre, children }: { portada: string | null; nombre: string; children: ReactNode }) {
  return (
    <article className="group overflow-hidden rounded-[1.35rem] border border-border/80 bg-card shadow-[0_2px_8px_rgba(20,20,20,0.035)] transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/35 hover:shadow-[0_12px_32px_rgba(20,20,20,0.075)]">
      {portada ? (
        <img src={portada} alt={`Portada del proyecto ${nombre}`} className="h-36 w-full bg-[#f5f4f1] object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" />
      ) : (
        <div className="grid h-36 place-items-center bg-[#f5f4f1] text-muted-foreground">
          <div className="text-center"><Box className="mx-auto size-8" /><p className="mt-2 text-xs">Sin imagen de portada</p></div>
        </div>
      )}
      {children}
    </article>
  );
}

type Categoria = "fotos" | "videos" | "documentos" | "modelos-3d" | "otros";
type CarpetaCompartida = { id: string; propietario_participante_id: string; propietario_usuario_id: string; carpeta: string; destinatario_participante_id: string; created_at: string; destinatario_nombre?: string };
type TallerCompartir = { id: string; nombre: string; ciudad: string | null };
type CarpetaRecibida = { id: string; nombre: string; propietarioNombre: string; archivos: ArchivoNube[]; portada: string | null };
type ArchivoNube = {
  nombre: string;
  ruta: string;
  carpeta: string;
  bytes: number;
  actualizado: string | null;
  categoria: Categoria;
  urlVista?: string | null;
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

function sugerirNombreProyecto(files: File[]) {
  const genericos = /^(\d+|img[_ -]?\d*|image[_ -]?\d*|scan[_ -]?\d*|untitled|sin título|documento)$/i;
  const candidatos = files.map((file) => {
    const base = file.name.replace(/\.[^.]+$/, "").replace(/^\d{13,}-/, "");
    const limpio = base.replace(/[_.]+/g, " ").replace(/\s+/g, " ").trim();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const prioridad = ext === "3dm" ? 5 : ext === "stl" ? 4 : ["obj", "glb", "gltf", "3mf"].includes(ext) ? 3 : 1;
    return { limpio, prioridad, longitud: limpio.length };
  }).filter((item) => item.limpio && !genericos.test(item.limpio));
  candidatos.sort((a, b) => b.prioridad - a.prioridad || b.longitud - a.longitud);
  return candidatos[0]?.limpio.slice(0, 60) ?? files[0]?.name.replace(/\.[^.]+$/, "").slice(0, 60) ?? "";
}

function MiNubePage() {
  const { data: sesion, isLoading: cargandoSesion } = useSesion();
  const participanteId = sesion?.participante?.id ?? null;
  const usuarioId = sesion?.user.id ?? null;
  const [busqueda, setBusqueda] = useState("");
  const [proyectoAbierto, setProyectoAbierto] = useState<string | null>(null);
  const [modoEdicion, setModoEdicion] = useState<string | null>(null);
  const [compartiendo, setCompartiendo] = useState<string | null>(null);
  const [progresoCompartir, setProgresoCompartir] = useState("");
  const [errorCompartir, setErrorCompartir] = useState<{ proyecto: string; mensaje: string } | null>(null);
  const [enlaceCompartido, setEnlaceCompartido] = useState<{ proyecto: string; url: string } | null>(null);
  const [seccionActiva, setSeccionActiva] = useState<Categoria | "todos">("todos");
  const [carpeta, setCarpeta] = useState("");
  const [carpetas, setCarpetas] = useState<string[]>([]);
  const [archivos, setArchivos] = useState<ArchivoNube[]>([]);
  const [seleccionados, setSeleccionados] = useState<File[]>([]);
  const [carpetaDestinoEdicion, setCarpetaDestinoEdicion] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [proyectoParaCompartir, setProyectoParaCompartir] = useState<string | null>(null);
  const [talleresDisponibles, setTalleresDisponibles] = useState<TallerCompartir[]>([]);
  const [tallerDestino, setTallerDestino] = useState("");
  const [cargandoTalleres, setCargandoTalleres] = useState(false);
  const [guardandoComparticion, setGuardandoComparticion] = useState(false);
  const [compartidas, setCompartidas] = useState<CarpetaCompartida[]>([]);
  const [carpetasRecibidas, setCarpetasRecibidas] = useState<CarpetaRecibida[]>([]);
  const [cargandoCompartidas, setCargandoCompartidas] = useState(false);
  const [anadiendoCatalogo, setAnadiendoCatalogo] = useState<string | null>(null);

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
      const archivosPlanos = resultados.flat();
      const archivosConVistas = await Promise.all(
        archivosPlanos.map(async (archivo) => {
          if (archivo.categoria !== "fotos") return archivo;
          const { data } = await supabase.storage.from(BUCKET).createSignedUrl(archivo.ruta, 60 * 10);
          return { ...archivo, urlVista: data?.signedUrl ?? null };
        }),
      );
      setArchivos(archivosConVistas);
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

  const anadirImagenAlCatalogo = async (archivo: ArchivoNube) => {
    if (!participanteId || !usuarioId) { toast.error("No se encontró tu taller activo."); return; }
    setAnadiendoCatalogo(archivo.ruta);
    try {
      const { data: signed, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(archivo.ruta, 600);
      if (signedError || !signed?.signedUrl) throw signedError ?? new Error("No se pudo leer la imagen original.");
      const response = await fetch(signed.signedUrl);
      if (!response.ok) throw new Error("No se pudo descargar la imagen desde Mi Nube.");
      const blob = await response.blob();
      const destino = participanteId + "/mi-nube/" + crypto.randomUUID() + "-" + nombreSeguro(nombreVisible(archivo.nombre));
      const { error: uploadError } = await supabase.storage.from("catalogo-joyas").upload(destino, blob, { contentType: blob.type || "image/jpeg", upsert: false });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from("catalogo-joyas").getPublicUrl(destino);
      if (!publicData?.publicUrl) throw new Error("No se pudo obtener la imagen para el catálogo.");
      sessionStorage.setItem("mi-nube-catalogo-pendiente", JSON.stringify({ nombre: nombreVisible(archivo.nombre).replace(/\\.[^.]+$/, ""), imagen_principal_url: publicData.publicUrl }));
      toast.success("Imagen preparada. Completa la ficha para añadirla al catálogo.");
      window.location.assign("/catalogo?desde=mi-nube");
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "No se pudo preparar la imagen para el catálogo."); }
    finally { setAnadiendoCatalogo(null); }
  };
  const cargarCompartidas = useCallback(async () => {
    if (!participanteId || !usuarioId) { setCompartidas([]); setCarpetasRecibidas([]); return; }
    setCargandoCompartidas(true);
    try {
      const { data: recibidas, error: errorRecibidas } = await (supabase as any)
        .from("mi_nube_compartidas")
        .select("id, propietario_participante_id, propietario_usuario_id, carpeta, destinatario_participante_id, created_at")
        .eq("destinatario_participante_id", participanteId)
        .is("revoked_at", null);
      if (errorRecibidas) throw errorRecibidas;
      const { data: enviadas, error: errorEnviadas } = await (supabase as any).from("mi_nube_compartidas")
        .select("id, propietario_participante_id, propietario_usuario_id, carpeta, destinatario_participante_id, created_at")
        .eq("propietario_usuario_id", usuarioId)
        .is("revoked_at", null);
      if (errorEnviadas) throw errorEnviadas;

      // Resolver nombres de los talleres receptores para que el propietario
      // identifique cada permiso sin mostrar solo el UUID.
      const idsDestinatarios = [...new Set((enviadas ?? []).map((s: CarpetaCompartida) => s.destinatario_participante_id).filter(Boolean))];
      let nombresDestinatarios = new Map<string, string>();
      if (idsDestinatarios.length > 0) {
        const { data: destinatarios, error: errorDestinatarios } = await (supabase as any)
          .from("ecosistema_participantes")
          .select("id, nombre")
          .in("id", idsDestinatarios);
        if (errorDestinatarios) throw errorDestinatarios;
        nombresDestinatarios = new Map((destinatarios ?? []).map((t: { id: string; nombre: string | null }) => [t.id, t.nombre?.trim() || "Taller sin nombre"]));
      }
      setCompartidas(((enviadas ?? []) as CarpetaCompartida[]).map((s) => ({
        ...s,
        destinatario_nombre: nombresDestinatarios.get(s.destinatario_participante_id) ?? "Taller del ecosistema",
      })));
      const carpetas = await Promise.all((recibidas ?? []).map(async (share) => {
        const ruta = `${share.propietario_participante_id}/${share.propietario_usuario_id}/${share.carpeta}`;
        const { data: entradas, error: listaError } = await supabase.storage.from(BUCKET).list(ruta, { limit: 100, sortBy: { column: "name", order: "asc" } });
        if (listaError) throw listaError;
        // Storage puede devolver metadata nula para objetos heredados; no descartarlos
        // solo por ese motivo. Las entradas que son subcarpetas no tienen extensión
        // de archivo y se excluyen de esta vista de proyecto.
        const base = (entradas ?? [])
          .filter((e) => Boolean(e.name) && !e.name.endsWith("/") && Boolean(e.name.includes(".")))
          .map((e): ArchivoNube => ({
            nombre: e.name, ruta: `${ruta}/${e.name}`, carpeta: share.carpeta,
            bytes: Number(e.metadata?.size ?? 0), actualizado: e.updated_at ?? e.created_at ?? null,
            categoria: clasificarArchivo(nombreVisible(e.name)),
          }));
        const conVistas = await Promise.all(base.map(async (archivo) => {
          if (archivo.categoria !== "fotos") return archivo;
          const { data } = await supabase.storage.from(BUCKET).createSignedUrl(archivo.ruta, 600);
          return { ...archivo, urlVista: data?.signedUrl ?? null };
        }));
        const { data: propietario } = await supabase.from("ecosistema_participantes").select("nombre").eq("id", share.propietario_participante_id).maybeSingle();
        const imagenPortada = conVistas.find((archivo) => archivo.categoria === "fotos" && archivo.urlVista)?.urlVista ?? null;
        return { id: share.id, nombre: share.carpeta, propietarioNombre: propietario?.nombre ?? "Taller del ecosistema", archivos: conVistas, portada: imagenPortada };
      }));
      setCarpetasRecibidas(carpetas);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudieron cargar las carpetas compartidas.");
    } finally { setCargandoCompartidas(false); }
  }, [participanteId, usuarioId]);

  useEffect(() => { void cargarCompartidas(); }, [cargarCompartidas]);

  const abrirCompartirEcosistema = async (proyecto: { nombre: string }) => {
    setProyectoParaCompartir(proyecto.nombre);
    setTallerDestino("");
    setCargandoTalleres(true);
    try {
      const { data, error } = await (supabase as any).rpc("listar_talleres_para_compartir_mi_nube");
      if (error) throw error;
      setTalleresDisponibles((data ?? []) as TallerCompartir[]);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudo cargar el directorio de talleres.");
    } finally { setCargandoTalleres(false); }
  };

  const confirmarCompartirEcosistema = async () => {
    if (!participanteId || !usuarioId || !proyectoParaCompartir || !tallerDestino) {
      toast.error("Selecciona el taller que recibirá la carpeta."); return;
    }
    setGuardandoComparticion(true);
    try {
      const { error } = await (supabase as any).from("mi_nube_compartidas").upsert({
        propietario_participante_id: participanteId,
        propietario_usuario_id: usuarioId,
        carpeta: proyectoParaCompartir,
        destinatario_participante_id: tallerDestino,
        creado_por: usuarioId,
        revoked_at: null,
      }, { onConflict: "propietario_usuario_id,propietario_participante_id,carpeta,destinatario_participante_id" });
      if (error) throw error;
      toast.success("Carpeta compartida sin duplicar archivos.");
      setProyectoParaCompartir(null);
      await cargarCompartidas();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudo compartir la carpeta.");
    } finally { setGuardandoComparticion(false); }
  };

  const revocarComparticion = async (share: CarpetaCompartida) => {
    const { error } = await (supabase as any).from("mi_nube_compartidas").update({ revoked_at: new Date().toISOString() }).eq("id", share.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Se revocó el acceso a la carpeta.");
    await cargarCompartidas();
  };

  const archivosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es");
    return archivos.filter((archivo) => {
      const coincideSeccion = seccionActiva === "todos" || archivo.categoria === seccionActiva;
      const coincideBusqueda = !termino || `${nombreVisible(archivo.nombre)} ${archivo.carpeta}`.toLocaleLowerCase("es").includes(termino);
      return coincideSeccion && coincideBusqueda;
    });
  }, [archivos, busqueda, seccionActiva]);

  const proyectos = useMemo(() => {
    const grupos = new Map<string, ArchivoNube[]>();
    for (const archivo of archivosFiltrados) {
      const actuales = grupos.get(archivo.carpeta) ?? [];
      actuales.push(archivo);
      grupos.set(archivo.carpeta, actuales);
    }
    return Array.from(grupos.entries()).map(([nombre, elementos]) => ({
      nombre,
      archivos: elementos,
      portada: elementos.find((archivo) => archivo.categoria === "fotos" && archivo.urlVista)?.urlVista ?? null,
      tiene3dm: elementos.some((archivo) => archivo.nombre.toLowerCase().endsWith(".3dm")),
      tieneStl: elementos.some((archivo) => archivo.nombre.toLowerCase().endsWith(".stl")),
      stlArchivo: elementos.find((archivo) => archivo.nombre.toLowerCase().endsWith(".stl")) ?? null,
      tienePdf: elementos.some((archivo) => archivo.nombre.toLowerCase().endsWith(".pdf")),
    }));
  }, [archivosFiltrados]);

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
      toast.error("Ponle un nombre al proyecto para guardar juntos todos sus archivos.");
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


  const eliminarArchivoProyecto = async (archivo: ArchivoNube) => {
    if (!window.confirm("¿Eliminar definitivamente " + nombreVisible(archivo.nombre) + "?")) return;
    const { error: removeError } = await supabase.storage.from(BUCKET).remove([archivo.ruta]);
    if (removeError) { toast.error(removeError.message); return; }
    toast.success("Archivo eliminado.");
    await cargarBiblioteca();
  };
  const compartirCarpetaTransfer = async (proyecto: { nombre: string; archivos: ArchivoNube[] }) => {
    if (!proyecto.archivos.length) { toast.error("Esta carpeta no contiene archivos."); return; }
    if (proyecto.archivos.length > 10) { toast.error("AURUM Transfer admite hasta 10 archivos por enlace."); return; }
    setCompartiendo(proyecto.nombre);
    setProgresoCompartir("Preparando acceso seguro a los archivos…");
    setErrorCompartir(null);
    try {
      const fuentes: Array<{ name: string; url: string }> = [];
      for (const archivo of proyecto.archivos) {
        const { data, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(archivo.ruta, 600);
        if (signedError || !data?.signedUrl) throw new Error("No se pudo preparar " + nombreVisible(archivo.nombre) + ".");
        fuentes.push({ name: nombreVisible(archivo.nombre), url: data.signedUrl });
      }
      const destino = new URL("/transfer/", window.location.origin);
      destino.searchParams.set("fromMiNube", JSON.stringify({ proyecto: proyecto.nombre, files: fuentes }));
      window.location.assign(destino.toString());
    } catch (cause) {
      const mensaje = cause instanceof Error ? cause.message : "No se pudo abrir AURUM Transfer.";
      setErrorCompartir({ proyecto: proyecto.nombre, mensaje });
      toast.error(mensaje);
    } finally { setCompartiendo(null); }
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
              <h3 className="font-semibold">Subir un proyecto completo</h3>
              <p className="mt-1 text-sm text-muted-foreground">Agrupa la imagen, el archivo 3DM, el STL y el PDF del mismo diseño en una sola carpeta.</p>
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
                  Nombre del proyecto (se completa automáticamente)
                  <input
                    value={carpeta}
                    onChange={(event) => setCarpeta(event.target.value)}
                    maxLength={60}
                    placeholder="Se obtiene del nombre de tus archivos"
                    className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    disabled={subiendo}
                  />
                </label>
                <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gold/40 bg-gold/5 p-4 text-center transition hover:bg-gold/10">
                  <UploadCloud className="size-7 text-gold" />
                  <span className="mt-2 text-sm font-semibold">Elegir todos los archivos del proyecto</span>
                  <span className="mt-1 text-xs text-muted-foreground">Selecciona juntos los archivos del proyecto. El nombre se toma del archivo más descriptivo · hasta 30 archivos</span>
                  <input
                    id="mi-nube-archivos"
                    type="file"
                    multiple
                    className="sr-only"
                    disabled={subiendo}
                    onChange={(event) => {
                                          const files = Array.from(event.target.files ?? []);
                                          setSeleccionados(files);
                                          if (files.length > 0) setCarpeta(sugerirNombreProyecto(files));
                                        }}
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
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Todos los archivos seleccionados se guardan juntos bajo el nombre de este proyecto.</li>
                  <li className="flex gap-2"><Box className="mt-0.5 size-4 shrink-0 text-gold" /> Ejemplo: “Anillo dos corazones” contiene su imagen, 3DM, STL y PDF.</li>
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

          {proyectos.length > 0 && (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {proyectos.map((proyecto) => (
                <FichaProyecto key={proyecto.nombre} portada={proyecto.portada} nombre={proyecto.nombre}>
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate text-[14px] font-semibold tracking-[-0.015em]">{proyecto.nombre}</h4>
                        <p className="mt-1 text-[11px] text-muted-foreground">{proyecto.archivos.length} archivos <span className="px-1 text-border">·</span> proyecto</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-border/80 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Mi nube</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {proyecto.archivos.some(a => a.categoria === "fotos") && <span className="rounded-md bg-muted/70 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">Imagen</span>}
                      {proyecto.tiene3dm && <span className="rounded-md bg-muted/70 px-2 py-1 text-[10px] font-medium text-muted-foreground">3DM</span>}
                      {proyecto.tieneStl && <span className="rounded-md bg-muted/70 px-2 py-1 text-[10px] font-medium text-muted-foreground">STL</span>}
                      {proyecto.tienePdf && <span className="rounded-md bg-muted/70 px-2 py-1 text-[10px] font-medium text-muted-foreground">PDF</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => void abrirCompartirEcosistema(proyecto)} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[#c5a15d]/60 bg-[#c5a15d]/[0.10] px-2 py-2 text-[11px] font-semibold leading-tight text-foreground transition-colors hover:bg-[#c5a15d]/[0.17]">
                        <Share2 className="size-3.5 shrink-0" /> Compartir taller
                      </button>
                      <button type="button" disabled={compartiendo !== null} onClick={() => void compartirCarpetaTransfer(proyecto)} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2 py-2 text-[11px] font-medium leading-tight text-foreground/90 transition-colors hover:border-gold/45 hover:bg-muted/40 disabled:opacity-50">
                        <UploadCloud className="size-3.5 shrink-0" /> {compartiendo === proyecto.nombre ? "Preparando…" : "Enviar por Transfer"}
                      </button>
                    </div>
                    {compartiendo === proyecto.nombre && <p role="status" className="rounded-lg bg-gold/10 px-3 py-2 text-xs text-muted-foreground">{progresoCompartir || "Preparando transferencia…"}</p>}
                    {errorCompartir?.proyecto === proyecto.nombre && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{errorCompartir.mensaje}<button type="button" onClick={() => setErrorCompartir(null)} className="ml-2 underline">Cerrar</button></div>}
                    <button
                      type="button"
                      aria-expanded={proyectoAbierto === proyecto.nombre}
                      onClick={() => setProyectoAbierto((actual) => actual === proyecto.nombre ? null : proyecto.nombre)}
                      className="w-full rounded-lg border border-border/80 bg-background/70 px-3 py-2 text-[11px] font-medium text-foreground/90 transition-colors hover:border-gold/45 hover:bg-muted/40"
                    >
                      {proyectoAbierto === proyecto.nombre ? "Ocultar archivos del proyecto" : "Ver archivos del proyecto"}
                    </button>
                    {proyectoAbierto === proyecto.nombre && (
                      <div className="space-y-2 border-t border-border pt-3">
                      <button type="button" onClick={() => { setModoEdicion((actual) => actual === proyecto.nombre ? null : proyecto.nombre); setProyectoAbierto(proyecto.nombre); setCarpetaDestinoEdicion(null); setSeleccionados([]); }} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:border-gold/50">
                        <Pencil className="size-3.5" /> {modoEdicion === proyecto.nombre ? "Terminar edición" : "Editar archivos de la carpeta"}
                      </button>
                      {modoEdicion === proyecto.nombre && (
                        <div className="space-y-2 rounded-xl border border-gold/25 bg-gold/5 p-3">
                          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-gold/40 px-3 py-2.5 text-xs font-semibold hover:bg-gold/10">
                            <UploadCloud className="size-4" /> Añadir archivos a esta carpeta
                            <input type="file" multiple className="sr-only" disabled={subiendo} onChange={(event) => {
                              const files = Array.from(event.currentTarget.files ?? []);
                              if (!files.length) return;
                              setCarpeta(proyecto.nombre);
                              setCarpetaDestinoEdicion(proyecto.nombre);
                              setSeleccionados(files);
                              event.currentTarget.value = "";
                            }} />
                          </label>
                          {carpetaDestinoEdicion === proyecto.nombre && seleccionados.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground">{seleccionados.length} archivo(s) seleccionados para {proyecto.nombre}</p>
                              <ul className="max-h-24 space-y-1 overflow-auto text-xs text-muted-foreground">
                                {seleccionados.map((file, index) => <li key={file.name + index} className="truncate">{file.name} · {etiquetaTamano(file.size)}</li>)}
                              </ul>
                              {subiendo && <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full bg-gold transition-all" style={{ width: progreso + "%" }} /></div>}
                              <div className="flex gap-2">
                                <button type="button" disabled={subiendo} onClick={() => { setSeleccionados([]); setCarpetaDestinoEdicion(null); }} className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold">Cancelar</button>
                                <button type="button" disabled={subiendo} onClick={() => void subirSeleccion()} className="flex-1 rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-background disabled:opacity-50">{subiendo ? "Subiendo…" : "Subir a esta carpeta"}</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">{proyecto.archivos.map((archivo) => (
                          <div key={archivo.ruta} className="rounded-xl border border-border/70 bg-background p-3 transition-colors hover:border-border">
                            <div className="flex min-w-0 items-start gap-2.5">
                              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted/70 text-muted-foreground">{archivo.categoria === "fotos" ? <ImageIcon className="size-4" /> : archivo.categoria === "modelos-3d" ? <Box className="size-4" /> : archivo.categoria === "documentos" ? <FileText className="size-4" /> : <File className="size-4" />}</div>
                              <div className="min-w-0 flex-1"><p className="break-words text-xs font-semibold leading-5">{nombreVisible(archivo.nombre)}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{etiquetaTamano(archivo.bytes)} <span className="px-1">·</span> {archivo.nombre.split(".").pop()?.toUpperCase()}</p></div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {archivo.nombre.toLowerCase().endsWith(".stl") && (
                                <button type="button" onClick={async () => {
                                  const { data, error: urlError } = await supabase.storage.from(BUCKET).createSignedUrl(archivo.ruta, 60 * 10);
                                  if (urlError || !data?.signedUrl) { toast.error("No se pudo preparar el STL para el visor."); return; }
                                  const destino = new URL("/herramientas", window.location.origin);
                                  destino.searchParams.set("archivoUrl", data.signedUrl);
                                  destino.searchParams.set("archivoNombre", nombreVisible(archivo.nombre));
                                  destino.searchParams.set("herramienta", "peso");
                                  window.location.assign(destino.toString());
                                }} className="rounded-lg border border-gold/40 px-2.5 py-1.5 text-[11px] font-semibold hover:bg-gold/10">
                                  Abrir en Visualizador y peso 3D
                                </button>
                              )}
                              {archivo.nombre.toLowerCase().endsWith(".3dm") && (
                                <button type="button" onClick={() => toast.info("La apertura directa en Aurum Render aún está pendiente de integrar.")} className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold hover:border-gold/50">
                                  Abrir en Aurum Render
                                </button>
                              )}
                              {archivo.categoria === "fotos" && <button type="button" onClick={() => void anadirImagenAlCatalogo(archivo)} disabled={anadiendoCatalogo === archivo.ruta} className="inline-flex items-center gap-1.5 rounded-lg border border-[#c5a15d]/50 bg-[#c5a15d]/10 px-2.5 py-2 text-[11px] font-semibold hover:bg-[#c5a15d]/15 disabled:opacity-50"><ImageIcon className="size-3.5" /> {anadiendoCatalogo === archivo.ruta ? "Preparando…" : "Añadir al catálogo"}</button>}
                              <button type="button" onClick={() => void abrirArchivo(archivo)} className="rounded-lg border border-border px-2.5 py-2 text-[11px] font-medium hover:border-gold/50">
                                Abrir / descargar
                              </button>
                              {modoEdicion === proyecto.nombre && (
                                <button type="button" onClick={() => void eliminarArchivoProyecto(archivo)} className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 px-2.5 py-1.5 text-[11px] font-semibold text-destructive hover:bg-destructive/5">
                                  Eliminar archivo
                                </button>
                              )}
                            </div>
                          </div>
                        ))}</div>
                      </div>
                    )}

                  </div>
                </FichaProyecto>
              ))}
            </div>
          )}

        </section>
        <section className="space-y-4" aria-label="Carpetas compartidas conmigo">
          <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Colaboración</p><h3 className="mt-1 font-display text-2xl">Compartidas conmigo</h3><p className="mt-1 text-sm text-muted-foreground">Carpetas originales de otros talleres, sin duplicar archivos.</p></div><button type="button" onClick={() => void cargarCompartidas()} disabled={cargandoCompartidas} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">{cargandoCompartidas ? "Actualizando…" : "Actualizar"}</button></div>
          {cargandoCompartidas && carpetasRecibidas.length === 0 ? <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">Buscando carpetas compartidas…</p> : carpetasRecibidas.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-6 text-center"><Folder className="mx-auto size-6 text-muted-foreground" /><p className="mt-2 text-sm font-medium">Todavía no tienes carpetas compartidas</p><p className="mt-1 text-xs text-muted-foreground">Cuando otro taller comparta una carpeta contigo, aparecerá aquí.</p></div> : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {carpetasRecibidas.map((recibida) => {
                const tipos = [...new Set(recibida.archivos.map((a) => {
                  if (a.categoria === "fotos") return "Imagen";
                  if (a.categoria === "modelos-3d") return a.nombre.toLowerCase().endsWith(".3dm") ? "3DM" : a.nombre.toLowerCase().endsWith(".stl") ? "STL" : "3D";
                  if (a.categoria === "documentos") return "PDF";
                  return "Archivo";
                }))];
                return <FichaProyecto key={recibida.id} portada={recibida.portada} nombre={recibida.nombre}>
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate text-[14px] font-semibold tracking-[-0.015em]">{recibida.nombre}</h4>
                        <p className="mt-1 text-[11px] text-muted-foreground">{recibida.archivos.length} archivos <span className="px-1 text-border">·</span> Compartida por {recibida.propietarioNombre}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-border/80 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Compartida</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {tipos.map((tipo) => <span key={tipo} className="rounded-md bg-muted/70 px-2 py-1 text-[10px] font-medium text-muted-foreground">{tipo}</span>)}
                    </div>
                    <button type="button" onClick={() => setProyectoAbierto(proyectoAbierto === "compartida:" + recibida.id ? null : "compartida:" + recibida.id)} className="w-full rounded-lg border border-border/80 bg-background/70 px-3 py-2 text-[11px] font-medium text-foreground/90 transition-colors hover:border-gold/45 hover:bg-muted/40">{proyectoAbierto === "compartida:" + recibida.id ? "Ocultar archivos del proyecto" : "Ver archivos del proyecto"}</button>
                    {proyectoAbierto === "compartida:" + recibida.id && (
                      <div className="space-y-2 border-t border-border pt-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                          {recibida.archivos.map((archivo) => <div key={archivo.ruta} className="rounded-xl border border-border/70 bg-background p-3 transition-colors hover:border-border">
                            <div className="flex min-w-0 items-start gap-2.5">
                              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted/70 text-muted-foreground">{archivo.categoria === "fotos" ? <ImageIcon className="size-4" /> : archivo.categoria === "modelos-3d" ? <Box className="size-4" /> : archivo.categoria === "documentos" ? <FileText className="size-4" /> : <File className="size-4" />}</div>
                              <div className="min-w-0 flex-1"><p className="break-words text-xs font-semibold">{nombreVisible(archivo.nombre)}</p><p className="mt-1 text-[10px] text-muted-foreground">{etiquetaTamano(archivo.bytes)}</p></div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {archivo.categoria === "fotos" && <button type="button" disabled={anadiendoCatalogo === archivo.ruta} onClick={() => void anadirImagenAlCatalogo(archivo)} className="rounded-lg border border-[#c5a15d]/60 bg-[#c5a15d]/[0.10] px-2.5 py-2 text-[11px] font-semibold hover:bg-[#c5a15d]/[0.17] disabled:opacity-50">{anadiendoCatalogo === archivo.ruta ? "Preparando imagen…" : "Añadir a mi catálogo"}</button>}
                              {archivo.nombre.toLowerCase().endsWith(".stl") && <button type="button" onClick={async () => { const { data, error: urlError } = await supabase.storage.from(BUCKET).createSignedUrl(archivo.ruta, 600); if (urlError || !data?.signedUrl) { toast.error("No se pudo preparar el STL para el visor."); return; } const destino = new URL("/herramientas", window.location.origin); destino.searchParams.set("archivoUrl", data.signedUrl); destino.searchParams.set("archivoNombre", nombreVisible(archivo.nombre)); destino.searchParams.set("herramienta", "peso"); window.location.assign(destino.toString()); }} className="rounded-lg border border-[#c5a15d]/60 bg-[#c5a15d]/[0.10] px-2.5 py-2 text-[11px] font-semibold hover:bg-[#c5a15d]/[0.17]">Abrir en Visualizador y peso 3D</button>}
                              {archivo.nombre.toLowerCase().endsWith(".3dm") && <button type="button" onClick={() => void abrirArchivo(archivo)} className="rounded-lg border border-[#c5a15d]/60 bg-[#c5a15d]/[0.10] px-2.5 py-2 text-[11px] font-semibold hover:bg-[#c5a15d]/[0.17]">Abrir en Aurum Render</button>}
                              <button type="button" onClick={() => void abrirArchivo(archivo)} className="rounded-lg border border-border/80 bg-background px-2.5 py-2 text-[11px] font-medium hover:border-gold/45">Abrir / descargar</button>
                            </div>
                          </div>)}
                        </div>
                      </div>
                    )}
                    <p className="border-t border-border pt-3 text-[10px] text-muted-foreground">Solo lectura · acceso vigente hasta que el propietario lo revoque.</p>
                  </div>
                </FichaProyecto>;
              })}
            </div>
          )}
        </section>
        {proyectoParaCompartir && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="mi-nube-compartir-title">
            <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold">Acceso entre talleres</p><h3 id="mi-nube-compartir-title" className="mt-1 text-lg font-semibold">Compartir carpeta</h3><p className="mt-1 text-sm text-muted-foreground">“{proyectoParaCompartir}” seguirá en tu Mi Nube. No se copiarán archivos.</p></div>
                <button type="button" onClick={() => setProyectoParaCompartir(null)} className="rounded-lg p-2 hover:bg-muted" aria-label="Cerrar"><X className="size-4" /></button>
              </div>
              <label className="mt-5 block text-xs font-semibold" htmlFor="mi-nube-taller-destino">Taller receptor</label>
              {cargandoTalleres ? <p className="mt-2 rounded-xl border border-border p-3 text-sm text-muted-foreground">Cargando talleres del ecosistema…</p> : talleresDisponibles.length === 0 ? <p className="mt-2 rounded-xl border border-border p-3 text-sm text-muted-foreground">No hay otros talleres activos disponibles para compartir.</p> : (
                <select id="mi-nube-taller-destino" value={tallerDestino} onChange={(event) => setTallerDestino(event.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm">
                  <option value="">Seleccionar taller…</option>
                  {talleresDisponibles.map((taller) => <option key={taller.id} value={taller.id}>{taller.nombre}{taller.ciudad ? " · " + taller.ciudad : ""}</option>)}
                </select>
              )}
              <div className="mt-4 rounded-xl bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">El taller receptor podrá abrir y consultar los archivos mientras mantengas el permiso. No podrá modificarlos ni eliminarlos.</div>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => setProyectoParaCompartir(null)} className="flex-1 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold">Cancelar</button>
                <button type="button" disabled={!tallerDestino || guardandoComparticion || cargandoTalleres} onClick={() => void confirmarCompartirEcosistema()} className="flex-1 rounded-xl bg-gold px-3 py-2.5 text-sm font-semibold text-black disabled:opacity-50">{guardandoComparticion ? "Compartiendo…" : "Compartir carpeta"}</button>
              </div>
              {compartidas.filter((s) => s.carpeta === proyectoParaCompartir).length > 0 && <div className="mt-5 border-t border-border pt-4"><p className="text-xs font-semibold">Accesos concedidos</p>{compartidas.filter((s) => s.carpeta === proyectoParaCompartir).map((s) => <div key={s.id} className="mt-2 flex items-center justify-between gap-2 text-xs"><span className="truncate">{s.destinatario_nombre ?? "Taller del ecosistema"}</span><button type="button" onClick={() => void revocarComparticion(s)} className="shrink-0 rounded-lg border border-destructive/40 px-2 py-1.5 font-semibold text-destructive">Revocar acceso</button></div>)}</div>}
            </div>
          </div>
        )}
        {enlaceCompartido && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="mi-nube-enlace-title">
            <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div><h3 id="mi-nube-enlace-title" className="text-lg font-semibold">Carpeta lista para compartir</h3><p className="mt-1 text-sm text-muted-foreground">{enlaceCompartido.proyecto} · enlace de un solo uso · expira en 24 horas</p></div>
                <button type="button" onClick={() => setEnlaceCompartido(null)} className="rounded-lg p-2 hover:bg-muted" aria-label="Cerrar"><X className="size-4" /></button>
              </div>
              <div className="mt-4 break-all rounded-xl border border-border bg-background p-3 text-sm">{enlaceCompartido.url}</div>
              <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(enlaceCompartido.url); toast.success("Enlace copiado."); } catch { toast.error("No se pudo copiar el enlace; selecciónalo y cópialo manualmente."); } }} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-black"><Copy className="size-4" /> Copiar enlace</button>
              <p className="mt-3 text-xs text-muted-foreground">Quien reciba el enlace podrá descargar los archivos una sola vez. Compártelo solo con quien deba recibirlos.</p>
            </div>
          </div>
        )}
        <p className="flex items-start gap-2 px-1 text-xs leading-5 text-muted-foreground"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" /> El acceso a carpetas compartidas se mantiene hasta que el propietario lo revoque. Las vistas y descargas usan enlaces temporales; los archivos no se hacen públicos.</p>
      </div>
    </AppShell>
  );
}
