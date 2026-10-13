import { useNuevaVersion } from "@/hooks/use-nueva-version";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  Box,
  CheckCircle2,
  Cloud,
  File as FileIcon,
  FileText,
  Folder,
  HardDrive,
  Image as ImageIcon,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Search,
  Share2,
  Server,
  Copy,
  Pencil,
  Power,
  X,
  UploadCloud,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useSesion } from "@/lib/auth";
import { nombreSeguro, subirConProgreso } from "@/lib/subir-archivo";
import { encolarArchivo, listarColaArchivos, quitarDeCola, type ArchivoEnCola } from "@/lib/cola-subidas-local";
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
  origen?: "supabase" | "nas";
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
  if (["mp4", "mov", "webm", "m4v", "avi", "mkv"].includes(ext)) return "videos";
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
  const [colaLocal, setColaLocal] = useState<ArchivoEnCola[]>([]);
  const [guardandoCola, setGuardandoCola] = useState(false);
  const [carpetaDestinoEdicion, setCarpetaDestinoEdicion] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const nuevaVersion = useNuevaVersion();

  const actualizarColaLocal = useCallback(async () => {
    if (!usuarioId) { setColaLocal([]); return; }
    try { setColaLocal(await listarColaArchivos(usuarioId)); }
    catch (cause) { console.warn("[Mi Nube] No se pudo leer la cola local.", cause); }
  }, [usuarioId]);

  useEffect(() => { void actualizarColaLocal(); }, [actualizarColaLocal]);

  const guardarSeleccionEnCola = async () => {
    if (!usuarioId) { toast.error("Inicia sesión para guardar archivos en este dispositivo."); return; }
    if (seleccionados.length === 0) { toast.error("Selecciona primero los archivos que quieres guardar."); return; }
    if (seleccionados.length > MAX_FILES_PER_BATCH) { toast.error(`Puedes guardar hasta ${MAX_FILES_PER_BATCH} archivos por lote.`); return; }
    setGuardandoCola(true);
    try {
      const actuales = await listarColaArchivos(usuarioId);
      let agregados = 0;
      for (const file of seleccionados) {
        const yaGuardado = actuales.some((item) => item.nombre === file.name && item.tamano === file.size && item.modificado === file.lastModified);
        if (!yaGuardado) { await encolarArchivo(usuarioId, file); agregados += 1; }
      }
      await actualizarColaLocal();
      toast.success(agregados ? `${agregados} archivo(s) guardados en la cola local de este dispositivo.` : "Estos archivos ya estaban en la cola local.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudieron guardar los archivos en este dispositivo.");
    } finally { setGuardandoCola(false); }
  };

  const recuperarArchivoDeCola = (item: ArchivoEnCola) => {
    const file = new File([item.blob], item.nombre, { type: item.tipo, lastModified: item.modificado });
    setSeleccionados((actuales) => actuales.some((actual) => actual.name === file.name && actual.size === file.size && actual.lastModified === file.lastModified) ? actuales : [...actuales, file]);
    setCarpeta((actual) => actual || nombreSeguro(item.nombre.replace(/\.[^.]+$/, "")));
    toast.success("Archivo recuperado. Revisa la carpeta de destino y pulsa Subir a Mi Nube.");
  };

  const eliminarDeColaLocal = async (item: ArchivoEnCola) => {
    if (!usuarioId) return;
    try { await quitarDeCola(usuarioId, item.id); await actualizarColaLocal(); toast.success("Archivo quitado de la cola local; no se borró de Mi Nube."); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "No se pudo quitar el archivo de la cola."); }
  };
  const [progreso, setProgreso] = useState(0);
  const [estadoSubida, setEstadoSubida] = useState("Preparando subida…");
  const [error, setError] = useState<string | null>(null);
  const [proyectoParaCompartir, setProyectoParaCompartir] = useState<string | null>(null);
  const [opcionesCompartir, setOpcionesCompartir] = useState<{ nombre: string; archivos: ArchivoNube[] } | null>(null);
  const [talleresDisponibles, setTalleresDisponibles] = useState<TallerCompartir[]>([]);
  const [tallerDestino, setTallerDestino] = useState("");
  const [cargandoTalleres, setCargandoTalleres] = useState(false);
  const [guardandoComparticion, setGuardandoComparticion] = useState(false);
  const [compartidas, setCompartidas] = useState<CarpetaCompartida[]>([]);
  const [carpetasRecibidas, setCarpetasRecibidas] = useState<CarpetaRecibida[]>([]);
  const [cargandoCompartidas, setCargandoCompartidas] = useState(false);
  const [anadiendoCatalogo, setAnadiendoCatalogo] = useState<string | null>(null);

  type EstadoNas = "checking" | "online" | "offline" | "misconfigured" | "not_configured" | "unknown";
  const [estadoNas, setEstadoNas] = useState<EstadoNas>("checking");
  // Pausa local de la integración. No apaga físicamente el servidor.
  const [nasPausado, setNasPausado] = useState(false);
  useEffect(() => {
    try {
      setNasPausado(window.localStorage.getItem("mi-nube-nas-pausado") === "true");
    } catch {
      // Si el navegador bloquea el almacenamiento local, se mantiene el estado predeterminado.
    }
  }, []);
  const [mensajeNas, setMensajeNas] = useState("Comprobando conexión segura…");
  const [errorListadoNas, setErrorListadoNas] = useState<string | null>(null);
  const comprobarNas = useCallback(async () => {
    if (!participanteId || !usuarioId) {
      setEstadoNas("unknown");
      setMensajeNas("Inicia sesión con un taller activo");
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("nextcloud-status", { body: {} });
      if (error) throw error;
      const estado = data?.status as EstadoNas | undefined;
      if (estado && ["online", "offline", "misconfigured", "not_configured", "unknown"].includes(estado)) {
        setEstadoNas(estado);
        setMensajeNas(typeof data?.message === "string" ? data.message : "Estado actualizado");
      } else {
        setEstadoNas("unknown");
        setMensajeNas("No se pudo confirmar el estado");
      }
    } catch (cause) {
      setEstadoNas("unknown");
      let detalle = cause instanceof Error ? cause.message : "Error inesperado";
      let codigoHttp: number | null = null;
      if (cause && typeof cause === "object" && "context" in cause && cause.context instanceof Response) {
        codigoHttp = cause.context.status;
        try {
          const respuesta = await cause.context.clone().json() as { error?: unknown; message?: unknown };
          const mensajeServidor = typeof respuesta.message === "string" ? respuesta.message : typeof respuesta.error === "string" ? respuesta.error : null;
          if (mensajeServidor) detalle = mensajeServidor;
        } catch {
          // La respuesta puede no ser JSON; conservamos el diagnóstico original.
        }
      }
      const detalleSeguro = detalle.replace(/https?:\/\/\S+/gi, "[servidor]").replace(/[\r\n]+/g, " ").slice(0, 140);
      setMensajeNas(`No se pudo consultar el estado${codigoHttp ? ` (HTTP ${codigoHttp})` : ""}: ${detalleSeguro}`);
      console.warn("[Mi Nube] Falló la comprobación de Mi NAS.", { status: codigoHttp, error: detalleSeguro });
    }
  }, [participanteId, usuarioId]);

  useEffect(() => {
    void comprobarNas();
    const intervalo = window.setInterval(() => void comprobarNas(), 60_000);
    return () => window.clearInterval(intervalo);
  }, [comprobarNas]);

  const cargarBiblioteca = useCallback(async () => {
    if (!participanteId || !usuarioId) {
      setCarpetas([]);
      setArchivos([]);
      return;
    }
    setCargando(true);
    setError(null);
    setErrorListadoNas(null);
    try {
      const raiz = `${participanteId}/${usuarioId}`;
      const { data: entradas, error: errorRaiz } = await supabase.storage
        .from(BUCKET)
        .list(raiz, { limit: 1000, sortBy: { column: "name", order: "asc" } });
      if (errorRaiz) throw errorRaiz;

      const nombresCarpetas = (entradas ?? [])
        .filter((entrada) => !entrada.id && !entrada.metadata)
        .map((entrada) => entrada.name)
        .filter(Boolean);
      const resultados = await Promise.all(
        nombresCarpetas.map(async (nombreCarpeta) => {
          const { data, error: errorLista } = await supabase.storage
            .from(BUCKET)
            .list(`${raiz}/${nombreCarpeta}`, {
              limit: 1000,
              sortBy: { column: "name", order: "desc" },
            });
          if (errorLista) throw errorLista;
          return (data ?? [])
            .filter((entrada) => Boolean(entrada.id || entrada.metadata || entrada.name.includes(".")))
            .map((entrada): ArchivoNube => {
              const nombre = entrada.name;
              return {
                nombre,
                ruta: `${raiz}/${nombreCarpeta}/${nombre}`,
                carpeta: nombreCarpeta,
                bytes: Number(entrada.metadata?.size ?? 0),
                actualizado: entrada.updated_at ?? entrada.created_at ?? null,
                categoria: clasificarArchivo(nombreVisible(nombre)),
                origen: "supabase",
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
      let archivosNas: ArchivoNube[] = [];
      let carpetasNas: string[] = [];
      if (estadoNas === "online" && !nasPausado) {
        const { data: nasData, error: nasError } = await supabase.functions.invoke("nextcloud-video-files", { body: { action: "list", participantId: participanteId } });
        if (nasError) {
          console.warn("[Mi Nube] No se pudieron listar los vídeos del NAS.", nasError);
          setErrorListadoNas(nasError.message || "No se pudo consultar el NAS.");
        } else if (Array.isArray(nasData?.files)) {
          archivosNas = nasData.files.map((item: { name: string; folder: string; bytes: number; updated: string | null }): ArchivoNube => ({
            nombre: item.name,
            ruta: `${item.folder}/${item.name}`,
            carpeta: item.folder,
            bytes: Number(item.bytes ?? 0),
            actualizado: item.updated ? new Date(item.updated).toISOString() : null,
            categoria: "videos",
            origen: "nas",
          }));
          carpetasNas = [...new Set(archivosNas.map((archivo) => archivo.carpeta))];
        }
      }
      setCarpetas([...new Set([...nombresCarpetas, ...carpetasNas])]);
      setArchivos([...archivosConVistas, ...archivosNas]);
    } catch (cause) {
      const mensaje = cause instanceof Error ? cause.message : "No se pudo cargar la biblioteca.";
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  }, [participanteId, usuarioId, estadoNas, nasPausado]);

  const [importandoTransferencia, setImportandoTransferencia] = useState(false);

  useEffect(() => {
    const importTransfer = new URLSearchParams(window.location.search).get("importTransfer");
    if (!importTransfer || !sesion || importandoTransferencia || !/^[A-Za-z0-9_-]{30,100}$/.test(importTransfer)) return;
    setImportandoTransferencia(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("importTransfer");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    void (async () => {
      try {
        const { data, error: importError } = await supabase.functions.invoke("aurum-transfer-import", {
          body: { token: importTransfer },
        });
        if (importError) throw importError;
        if (data?.error) throw new Error(data.error);
        toast.success(`Se guardaron ${data?.file_count ?? 0} archivo(s) en Mi Nube, en la carpeta ${data?.folder ?? "de la transferencia"}.`);
        await cargarBiblioteca();
      } catch (cause) {
        toast.error(cause instanceof Error ? cause.message : "No se pudieron importar los archivos. Revisa que la transferencia siga disponible.");
      } finally {
        setImportandoTransferencia(false);
      }
    })();
  }, [sesion, importandoTransferencia, cargarBiblioteca]);

  useEffect(() => {
    const proyectoSolicitado = new URLSearchParams(window.location.search).get("proyecto")?.trim().slice(0, 120);
    if (!proyectoSolicitado) return;
    setBusqueda(proyectoSolicitado);
    setProyectoAbierto(proyectoSolicitado);
  }, []);

  useEffect(() => {
    void cargarBiblioteca();
  }, [cargarBiblioteca]);

  const anadirImagenAlCatalogo = async (
    archivo: ArchivoNube | null,
    proyecto?: { nombre: string; archivos: ArchivoNube[] },
    pdf?: ArchivoNube | null,
  ) => {
    if (!participanteId || !usuarioId) { toast.error("No se encontró tu taller activo."); return; }
    const imagen = archivo ?? proyecto?.archivos.find((item) => item.categoria === "fotos") ?? null;
    if (!imagen && !proyecto && !pdf) { toast.error("Selecciona una imagen, un PDF o un proyecto."); return; }
    if (imagen && imagen.origen !== "supabase") { toast.error("La portada debe ser una imagen guardada en Mi Nube."); return; }
    setAnadiendoCatalogo(proyecto?.nombre ?? imagen?.ruta ?? "proyecto");
    try {
      let imagenPrincipalUrl = "";
      if (imagen) {
        const { data: signed, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(imagen.ruta, 600);
        if (signedError || !signed?.signedUrl) throw signedError ?? new Error("No se pudo leer la imagen original.");
        const response = await fetch(signed.signedUrl);
        if (!response.ok) throw new Error("No se pudo descargar la imagen desde Mi Nube.");
        const blob = await response.blob();
        const destino = participanteId + "/mi-nube/" + crypto.randomUUID() + "-" + nombreSeguro(nombreVisible(imagen.nombre));
        const { error: uploadError } = await supabase.storage.from("catalogo-joyas").upload(destino, blob, { contentType: blob.type || "image/jpeg", upsert: false });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from("catalogo-joyas").getPublicUrl(destino);
        if (!publicData?.publicUrl) throw new Error("No se pudo obtener la imagen para el catálogo.");
        imagenPrincipalUrl = publicData.publicUrl;
      }
      const nombreProyecto = proyecto?.nombre ?? nombreVisible((imagen ?? pdf)!.nombre).replace(/\.[^.]+$/, "");
      const proyectoNube = proyecto ? {
        carpeta: proyecto.nombre,
        archivos: proyecto.archivos.map((item) => ({
          nombre: nombreVisible(item.nombre), ruta: item.ruta, categoria: item.categoria,
          bytes: item.bytes, origen: item.origen ?? "supabase", actualizado: item.actualizado,
        })),
      } : null;
      sessionStorage.setItem("mi-nube-catalogo-pendiente", JSON.stringify({
        nombre: nombreProyecto, imagen_principal_url: imagenPrincipalUrl, proyecto_nube: proyectoNube,
        pdf_nube: pdf ? { nombre: nombreVisible(pdf.nombre), ruta: pdf.ruta } : null,
      }));
      toast.success(pdf ? "PDF privado preparado para analizar con IA. Revisa la ficha antes de guardar." : proyecto ? "Proyecto preparado. Revisa la ficha y sus archivos antes de guardar." : "Imagen preparada. Completa la ficha para añadirla al catálogo.");
      window.location.assign("/catalogo?desde=mi-nube");
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "No se pudo preparar el proyecto para el catálogo."); }
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
      const carpetas = await Promise.all(((recibidas ?? []) as CarpetaCompartida[]).map(async (share) => {
        const ruta = `${share.propietario_participante_id}/${share.propietario_usuario_id}/${share.carpeta}`;
        const { data: entradas, error: listaError } = await supabase.storage.from(BUCKET).list(ruta, { limit: 1000, sortBy: { column: "name", order: "asc" } });
        if (listaError) throw listaError;
        // Storage puede devolver metadata nula para objetos heredados; no descartarlos
        // solo por ese motivo. Las entradas que son subcarpetas no tienen extensión
        // de archivo y se excluyen de esta vista de proyecto.
        const base = (entradas ?? [])
          .filter((e) => Boolean(e.name) && !e.name.endsWith("/") && Boolean(e.id || e.metadata || e.name.includes(".")))
          .map((e): ArchivoNube => ({
            nombre: e.name, ruta: `${ruta}/${e.name}`, carpeta: share.carpeta,
            bytes: Number(e.metadata?.size ?? 0), actualizado: e.updated_at ?? e.created_at ?? null,
            categoria: clasificarArchivo(nombreVisible(e.name)),
          }));
        const conVistas = await Promise.all(base.map(async (archivo) => {
          if (archivo.categoria !== "fotos") return archivo;
          const { data } = await supabase.storage.from(BUCKET).createSignedUrl(archivo.ruta, 60);
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
    return Array.from(grupos.entries()).map(([nombre]) => {
      // Los filtros afectan qué proyectos se muestran, no los archivos vinculados.
      const elementos = archivos.filter((archivo) => archivo.carpeta === nombre);
      return {
        nombre, archivos: elementos,
        portada: elementos.find((archivo) => archivo.categoria === "fotos" && archivo.urlVista)?.urlVista ?? null,
        tiene3dm: elementos.some((archivo) => archivo.nombre.toLowerCase().endsWith(".3dm")),
        tieneStl: elementos.some((archivo) => archivo.nombre.toLowerCase().endsWith(".stl")),
        stlArchivo: elementos.find((archivo) => archivo.nombre.toLowerCase().endsWith(".stl")) ?? null,
        tienePdf: elementos.some((archivo) => archivo.nombre.toLowerCase().endsWith(".pdf")),
      };
    });
  }, [archivosFiltrados]);

  const subirSeleccion = async () => {
    if (nuevaVersion) {
      toast.error("Hay una versión nueva de Mi Nube. Recarga la página antes de subir archivos.");
      return;
    }
    if (!participanteId || !usuarioId) {
      toast.error("Tu usuario no tiene un taller activo vinculado para Mi Nube.");
      return;
    }
    if (seleccionados.length === 0) {
      toast.error("Selecciona al menos un archivo.");
      return;
    }
    if (nasPausado && seleccionados.some((archivo) => clasificarArchivo(archivo.name) === "videos")) {
      toast.error("La conexión con el NAS está pausada. Reconéctala desde Mi NAS antes de subir vídeos.");
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

    // Persistir antes de subir. Si el almacenamiento local no está disponible,
    // la subida normal continúa para no romper el flujo existente.
    try {
      const actuales = await listarColaArchivos(usuarioId);
      for (const file of seleccionados) {
        if (!actuales.some((item) => item.nombre === file.name && item.tamano === file.size && item.modificado === file.lastModified)) {
          await encolarArchivo(usuarioId, file);
        }
      }
      await actualizarColaLocal();
    } catch (cause) {
      console.warn("[Mi Nube] No se pudo persistir la selección; se intentará la subida directa.", cause);
      toast.warning("No se pudo guardar una copia local de seguridad. Se intentará la subida normal.");
    }

    setSubiendo(true);
    setProgreso(0);
    setEstadoSubida("Preparando subida…");
    setError(null);
    let completados = 0;
    try {
      for (const file of seleccionados) {
        const nombre = nombreSeguro(file.name);
        if (!nombre) throw new Error(`El nombre de “${file.name}” no es válido.`);
        const ruta = `${participanteId}/${usuarioId}/${carpetaSegura}/${Date.now()}-${nombre}`;
        if (clasificarArchivo(nombre) === "videos") {
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !sessionData.session?.access_token) throw new Error("Tu sesión caducó. Vuelve a entrar e inténtalo de nuevo.");
          const uploadId = crypto.randomUUID();
          const filename = `${Date.now()}-${nombre}`;
          const chunkSize = 4 * 1024 * 1024;
          const totalChunks = Math.ceil(file.size / chunkSize);
          for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const formData = new FormData();
            formData.append("action", "chunk");
            formData.append("uploadId", uploadId);
            formData.append("folder", carpetaSegura);
            formData.append("participantId", participanteId);
            formData.append("filename", filename);
            formData.append("chunkIndex", String(chunkIndex));
            formData.append("totalChunks", String(totalChunks));
            formData.append("chunk", file.slice(chunkIndex * chunkSize, Math.min(file.size, (chunkIndex + 1) * chunkSize)), `chunk-${chunkIndex}`);
            const { error: chunkError } = await supabase.functions.invoke("nextcloud-video-files", { body: formData });
            if (chunkError) throw new Error(`Falló la subida del vídeo (fragmento ${chunkIndex + 1} de ${totalChunks}). ${chunkError.message}`);
            setProgreso(Math.round(((completados + (chunkIndex + 1) / totalChunks) / seleccionados.length) * 100));
          }
          const { data: finalized, error: finalizeError } = await supabase.functions.invoke("nextcloud-video-files", {
            body: { action: "finalize", uploadId, folder: carpetaSegura, filename, totalBytes: file.size, participantId: participanteId },
          });
          if (finalizeError) throw new Error(`No se pudo finalizar el vídeo en el NAS. ${finalizeError.message}`);
          if (finalized?.error) throw new Error(String(finalized.error));
          if (!finalized?.ok || Number(finalized.bytes) !== file.size) throw new Error("Nextcloud no confirmó el guardado del vídeo.");
          setEstadoSubida(`Verificando ${nombre} en el NAS…`);
          // Verificación real en Nextcloud: dar tiempo a que WebDAV refleje el archivo.
          // Nunca mostramos éxito hasta encontrar nombre, carpeta y tamaño exactos.
          let existe = false;
          let ultimoError: string | null = null;
          const intentosVerificacion = 5;
          for (let intento = 1; intento <= intentosVerificacion; intento++) {
            if (intento > 1) await new Promise((resolve) => window.setTimeout(resolve, 1500 * (intento - 1)));
            const { data: verificado, error: verificarError } = await supabase.functions.invoke("nextcloud-video-files", {
              body: { action: "list", participantId: participanteId },
            });
            if (verificarError) {
              ultimoError = verificarError.message;
              continue;
            }
            if (verificado?.error) {
              ultimoError = String(verificado.error);
              continue;
            }
            existe = Array.isArray(verificado?.files) && verificado.files.some(
              (f: { name: string; folder: string; bytes: number }) =>
                f.folder === carpetaSegura && f.name === filename && Number(f.bytes) === file.size,
            );
            if (existe) break;
          }
          if (!existe) {
            const detalle = ultimoError ? ` Detalle: ${ultimoError}` : "";
            throw new Error(`El vídeo se envió, pero no pudimos confirmar que esté guardado en el NAS tras ${intentosVerificacion} comprobaciones. No lo damos por guardado.${detalle}`);
          }
        } else {
          await subirConProgreso({
            bucket: BUCKET,
            ruta,
            file,
            onProgreso: (porcentaje) => setProgreso(Math.round(((completados + porcentaje / 100) / seleccionados.length) * 100)),
          });
        }
        try {
          const pendientes = await listarColaArchivos(usuarioId);
          const registro = pendientes.find((item) => item.nombre === file.name && item.tamano === file.size && item.modificado === file.lastModified);
          if (registro) await quitarDeCola(usuarioId, registro.id);
          await actualizarColaLocal();
        } catch (cause) {
          console.warn("[Mi Nube] La subida terminó, pero no se pudo actualizar la cola local.", cause);
        }
        completados += 1;
        setProgreso(Math.round((completados / seleccionados.length) * 100));
        setEstadoSubida(completados < seleccionados.length ? "Preparando siguiente archivo…" : "Confirmado; actualizando biblioteca…");
      }
      setSeleccionados([]);
      const selector = document.getElementById("mi-nube-archivos") as HTMLInputElement | null;
      if (selector) selector.value = "";
      setCarpeta(carpetaSegura);
      await cargarBiblioteca();
      setEstadoSubida("Guardado y verificado.");
      toast.success(`${completados} archivo(s) guardados en Mi Nube.`);
    } catch (cause) {
      const mensaje = cause instanceof Error ? cause.message : "No se pudieron subir los archivos.";
      setError(mensaje);
      toast.error(mensaje);
    } finally {
      setSubiendo(false);
      setEstadoSubida("Preparando subida…");
      await actualizarColaLocal();
    }
  };


  const eliminarArchivoProyecto = async (archivo: ArchivoNube) => {
    if (!participanteId || !usuarioId) { toast.error("No se encontró tu taller activo."); return; }
    const nombreLogico = nombreVisible(archivo.nombre).toLocaleLowerCase("es");
    const esVideo = archivo.categoria === "videos";
    if (!window.confirm(esVideo
      ? `¿Eliminar definitivamente “${nombreVisible(archivo.nombre)}” de Mi Nube y del NAS si existe una copia?`
      : `¿Eliminar definitivamente “${nombreVisible(archivo.nombre)}”?`)) return;

    try {
      // Para vídeos, localizar la copia hermana antes de borrar nada. Si el NAS
      // no responde, abortar para no dejar una copia huérfana sin avisar.
      let copiaNas: { name: string; folder: string } | null = null;
      let copiaSupabase: ArchivoNube | null = null;
      if (esVideo && archivo.origen === "supabase" && estadoNas === "online" && !nasPausado) {
        const { data, error } = await supabase.functions.invoke("nextcloud-video-files", {
          body: { action: "list", participantId: participanteId },
        });
        if (error || data?.error || !Array.isArray(data?.files)) {
          toast.error("No se pudo comprobar la copia del NAS. No se eliminó nada; vuelve a comprobar el almacenamiento.");
          return;
        }
        copiaNas = data.files.find((f: { name: string; folder: string }) =>
          f.folder === archivo.carpeta && nombreVisible(f.name).toLocaleLowerCase("es") === nombreLogico,
        ) ?? null;
      } else if (esVideo && archivo.origen === "supabase" && (estadoNas !== "online" || nasPausado)) {
        toast.error("El NAS no está disponible para comprobar la copia. Reconéctalo antes de eliminar este vídeo.");
        return;
      }

      if (esVideo && archivo.origen === "nas") {
        const { data, error } = await supabase.functions.invoke("nextcloud-video-files", {
          body: { action: "list", participantId: participanteId },
        });
        if (error || data?.error || !Array.isArray(data?.files)) {
          toast.error("No se pudo comprobar el almacenamiento web. No se eliminó nada.");
          return;
        }
        // La lista del NAS no contiene Supabase; localizamos la copia web en el estado
        // cargado, limitado al mismo proyecto y al mismo nombre lógico.
        copiaSupabase = archivos.find((f) => f.origen === "supabase" && f.carpeta === archivo.carpeta &&
          f.categoria === "videos" && nombreVisible(f.nombre).toLocaleLowerCase("es") === nombreLogico) ?? null;
      }

      // Borrar primero el NAS: si falla, se conserva la copia de Supabase.
      if (archivo.origen === "nas" || copiaNas) {
        const destino = archivo.origen === "nas" ? { name: archivo.nombre, folder: archivo.carpeta } : copiaNas!;
        const { data, error } = await supabase.functions.invoke("nextcloud-video-files", {
          body: { action: "delete", folder: destino.folder, name: destino.name, participantId: participanteId },
        });
        if (error || data?.error || data?.ok !== true) {
          toast.error(data?.error ?? error?.message ?? "No se pudo eliminar la copia del NAS; se conservó el original web.");
          return;
        }
      }

      const rutaWeb = archivo.origen === "supabase" ? archivo.ruta : copiaSupabase?.ruta;
      if (rutaWeb) {
        const { error } = await supabase.storage.from(BUCKET).remove([rutaWeb]);
        if (error) {
          toast.error("La copia del NAS se eliminó, pero la copia web no: " + error.message);
          await cargarBiblioteca();
          return;
        }
      }
      toast.success(esVideo ? "Archivo y copias encontradas eliminados." : "Archivo eliminado.");
      await cargarBiblioteca();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudo completar la eliminación.");
    }
  };
  const eliminarProyectoCompleto = async (proyecto: { nombre: string; archivos: ArchivoNube[] }) => {
    if (!participanteId || !usuarioId) {
      toast.error("No se encontró tu taller activo.");
      return;
    }
    if (subiendo || compartiendo !== null) {
      toast.error("Espera a que termine la operación en curso.");
      return;
    }
    // La lista visible puede estar filtrada o incompleta. Exigimos que el NAS
    // responda antes de borrar para descubrir también vídeos no visibles.
    if (estadoNas !== "online" || nasPausado) {
      toast.error("Conecta el NAS antes de eliminar un proyecto. Así podemos verificar todos los archivos y evitar copias huérfanas.");
      return;
    }

    try {
      const raizProyecto = `${participanteId}/${usuarioId}/${proyecto.nombre}`;
      const rutasWeb: string[] = [];
      // Storage admite paginación; no limitar la eliminación a los archivos
      // que estén cargados en pantalla o que sobrevivan a los filtros.
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.storage.from(BUCKET).list(raizProyecto, {
          limit: 1000,
          offset,
          sortBy: { column: "name", order: "asc" },
        });
        if (error) {
          toast.error("No se pudo verificar todo el contenido web. No se eliminó ningún archivo.");
          return;
        }
        const entradas = data ?? [];
        rutasWeb.push(...entradas
          .filter((entrada) => Boolean(entrada.id || entrada.metadata || entrada.name.includes(".")))
          .map((entrada) => `${raizProyecto}/${entrada.name}`));
        if (entradas.length < 1000) break;
      }

      const { data: nasData, error: nasError } = await supabase.functions.invoke("nextcloud-video-files", {
        body: { action: "list", participantId: participanteId },
      });
      if (nasError || nasData?.error || !Array.isArray(nasData?.files)) {
        toast.error("No se pudo verificar el contenido completo del NAS. No se eliminó ningún archivo.");
        return;
      }
      const archivosNas = (nasData.files as Array<{ name: string; folder: string }>)
        .filter((archivo) => archivo.folder === proyecto.nombre);

      const confirmacion = window.confirm(
        `¿Eliminar TODO el proyecto “${proyecto.nombre}”, incluidos ${rutasWeb.length} archivo(s) web y ${archivosNas.length} vídeo(s) del NAS? Esta acción no se puede deshacer.`,
      );
      if (!confirmacion) return;

      // Eliminar primero el NAS. Si falla una operación, conservamos Storage.
      for (const archivo of archivosNas) {
        const { data, error } = await supabase.functions.invoke("nextcloud-video-files", {
          body: { action: "delete", folder: proyecto.nombre, name: archivo.name, participantId: participanteId },
        });
        if (error || data?.error || data?.ok !== true) {
          toast.error(data?.error ?? error?.message ?? `No se pudo eliminar “${archivo.name}” del NAS. Los archivos web se conservaron.`);
          await cargarBiblioteca();
          return;
        }
      }

      if (rutasWeb.length > 0) {
        // Storage remove acepta lotes; dividir evita exceder límites de petición.
        for (let i = 0; i < rutasWeb.length; i += 100) {
          const { error } = await supabase.storage.from(BUCKET).remove(rutasWeb.slice(i, i + 100));
          if (error) {
            toast.error("El NAS se limpió, pero quedaron archivos web sin eliminar. Detalle: " + error.message);
            await cargarBiblioteca();
            return;
          }
        }
      }

      setProyectoAbierto(null);
      setModoEdicion(null);
      const { error: errorRevocarComparticiones } = await (supabase as any)
        .from("mi_nube_compartidas")
        .update({ revoked_at: new Date().toISOString() })
        .eq("propietario_usuario_id", usuarioId)
        .eq("propietario_participante_id", participanteId)
        .eq("carpeta", proyecto.nombre)
        .is("revoked_at", null);
      if (errorRevocarComparticiones) {
        toast.warning(`Proyecto eliminado, pero no se pudo revocar automáticamente el permiso compartido de “${proyecto.nombre}”. Revisa Compartir proyecto.`);
      } else {
        toast.success(`Proyecto “${proyecto.nombre}” eliminado: ${rutasWeb.length} archivo(s) web y ${archivosNas.length} vídeo(s) del NAS.`);
      }
      await cargarBiblioteca();
      await cargarCompartidas();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudo eliminar el proyecto completo.");
      await cargarBiblioteca();
    }
  };

  const compartirCarpetaTransfer = async (proyecto: { nombre: string; archivos: ArchivoNube[] }) => {
    if (proyecto.archivos.some((archivo) => archivo.origen === "nas")) {
      toast.error("Los vídeos guardados en el NAS aún no están habilitados para AURUM Transfer.");
      return;
    }
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
    if (archivo.origen === "nas") {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session?.access_token) throw new Error("Tu sesión caducó. Vuelve a entrar.");
        const env = import.meta.env as { VITE_SUPABASE_URL?: string; VITE_SUPABASE_PUBLISHABLE_KEY?: string };
        if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) throw new Error("Falta la configuración de conexión segura.");
        const params = new URLSearchParams({ folder: archivo.carpeta, name: archivo.nombre, participantId: participanteId ?? "" });
        const response = await fetch(`${env.VITE_SUPABASE_URL.replace(/\/$/, "")}/functions/v1/nextcloud-video-files?${params.toString()}`, {
          headers: { Authorization: `Bearer ${sessionData.session.access_token}`, apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? "No se pudo descargar el vídeo del NAS.");
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = nombreVisible(archivo.nombre);
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch (cause) {
        toast.error(cause instanceof Error ? cause.message : "No se pudo descargar el vídeo del NAS.");
      }
      return;
    }
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
        {nuevaVersion && (
          <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-gold/60 bg-gold/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p>
              <strong>Hay una versión nueva de Mi Nube.</strong>{" "}
              {subiendo ? "Espera a que termine la subida en curso y luego recarga la página." : "Recarga la página antes de subir archivos."}
            </p>
            <button type="button" disabled={subiendo} onClick={() => window.location.reload()} className="shrink-0 rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-background disabled:opacity-50">
              Recargar ahora
            </button>
          </div>
        )}
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
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/80 p-4">
                <div className="grid size-11 place-items-center rounded-xl bg-gold/10 text-gold"><HardDrive className="size-5" /></div>
                <div>
                  <p className="text-sm font-semibold">Supabase Storage</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <LockKeyhole className="size-3.5 text-emerald-600" /> Acceso privado
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/80 p-4" aria-label={`Estado del NAS: ${nasPausado ? "Conexión pausada desde Mi Nube" : mensajeNas}`}>
                <div className="grid size-11 place-items-center rounded-xl bg-gold/10 text-gold"><Server className="size-5" /></div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Mi NAS</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
                    <span className={`relative flex size-2.5 shrink-0 rounded-full ${nasPausado ? "bg-amber-500" : estadoNas === "online" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.65)]" : estadoNas === "offline" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.55)]" : estadoNas === "misconfigured" ? "bg-red-500" : "bg-amber-500"}`} aria-hidden="true" />
                    {nasPausado ? "Conexión pausada" : estadoNas === "online" ? "Conectado" : estadoNas === "offline" ? "Desconectado" : estadoNas === "misconfigured" ? "Revisar credenciales" : estadoNas === "checking" ? "Comprobando…" : estadoNas === "not_configured" ? "Pendiente de configurar" : "Estado no confirmado"}
                  </p>
                  <p className="mt-1 max-w-48 text-[10px] text-muted-foreground">{nasPausado ? "Los vídeos del NAS quedan ocultos y no se pueden subir nuevos." : mensajeNas}</p>
                  <button type="button" disabled={subiendo || estadoNas === "checking"} onClick={() => {
                    if (nasPausado) {
                      try { window.localStorage.setItem("mi-nube-nas-pausado", "false"); } catch { /* pausa solo en memoria */ }
                      setNasPausado(false);
                      toast.info("Revisando la conexión con el NAS…");
                      void comprobarNas();
                    } else if (estadoNas !== "online") {
                      toast.info("Reintentando la conexión con el NAS…");
                      void comprobarNas();
                    } else {
                      try { window.localStorage.setItem("mi-nube-nas-pausado", "true"); } catch { /* pausa solo en memoria */ }
                      setNasPausado(true);
                      toast.success("Conexión con el NAS pausada en Mi Nube. El equipo sigue encendido.");
                    }
                  }} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-semibold hover:border-gold/50 disabled:cursor-not-allowed disabled:opacity-50">
                    <Power className="size-3" /> {nasPausado ? "Reconectar" : estadoNas === "online" ? "Desconectar" : "Reintentar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5" aria-label="Verificación de almacenamiento">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Ubicación de tus archivos</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">El recuento se basa en los archivos que cada almacenamiento devuelve al consultar su contenido.</p>
            </div>
            <button type="button" onClick={() => void cargarBiblioteca()} disabled={cargando || subiendo} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-gold/50 disabled:opacity-50">
              <RefreshCw className={`size-3.5 ${cargando ? "animate-spin" : ""}`} /> {cargando ? "Comprobando…" : "Comprobar almacenamiento"}
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/80 bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs font-semibold"><HardDrive className="size-4 text-gold" /> Supabase Storage</span>
                <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold">{archivos.filter((archivo) => archivo.origen === "supabase").length} archivo(s)</span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Confirmados por el listado del almacenamiento web.</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs font-semibold"><Server className="size-4 text-gold" /> NAS · Nextcloud</span>
                <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold">{archivos.filter((archivo) => archivo.origen === "nas").length} archivo(s)</span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">{nasPausado ? "Conexión pausada desde Mi Nube; el NAS físico sigue encendido." : errorListadoNas ? "No verificado: falló la consulta al NAS." : estadoNas === "online" ? "Videos confirmados por el listado del NAS." : "No se pudo confirmar el contenido del NAS en este momento."}</p>
              {errorListadoNas && <p className="mt-1 text-[10px] text-destructive">{errorListadoNas}</p>}
            </div>
          </div>
          {error && <p className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"><AlertCircle className="mt-0.5 size-3.5 shrink-0" /> No se pudo completar la comprobación: {error}</p>}
        </section>

        {seccionActiva !== "todos" && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/25 bg-gold/[0.045] px-4 py-3" role="status">
            <p className="text-xs text-muted-foreground">
              Filtro activo: <span className="font-semibold text-foreground">{secciones.find((seccion) => seccion.id === seccionActiva)?.titulo}</span>
              <span className="ml-2">· {archivosFiltrados.length} archivo(s)</span>
            </p>
            <button
              type="button"
              onClick={() => setSeccionActiva("todos")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold transition-colors hover:border-gold/50 hover:bg-gold/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
            >
              <X className="size-3.5" /> Quitar filtro · Ver todos
            </button>
          </div>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Filtrar por tipo de archivo">
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
                {seleccionados.length > 0 && (
                  <button type="button" onClick={() => void guardarSeleccionEnCola()} disabled={subiendo || guardandoCola} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:border-gold/50 disabled:opacity-50">
                    {guardandoCola ? <LoaderCircle className="size-4 animate-spin" /> : <HardDrive className="size-4" />}
                    {guardandoCola ? "Guardando en este dispositivo…" : "Guardar selección para subir después"}
                  </button>
                )}
                {colaLocal.length > 0 && (
                  <div className="space-y-2 rounded-xl border border-gold/25 bg-gold/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold">Cola local de este dispositivo</p>
                      <span className="rounded-full bg-background px-2 py-1 text-[10px]">{colaLocal.length} pendiente(s)</span>
                    </div>
                    <p className="text-[11px] leading-5 text-muted-foreground">Se conservan en este navegador para recuperarlos manualmente. No se suben en segundo plano. Si borras los datos del navegador, podrías perder esta copia local.</p>
                    <ul className="space-y-2">
                      {colaLocal.map((item) => (
                        <li key={item.id} className="flex items-center gap-2 text-xs">
                          <span className="min-w-0 flex-1 truncate">{item.nombre} · {etiquetaTamano(item.tamano)}{item.ultimoError ? " · requiere revisión" : ""}</span>
                          <button type="button" onClick={() => recuperarArchivoDeCola(item)} disabled={subiendo} className="shrink-0 rounded-lg border border-border px-2 py-1.5 font-semibold hover:border-gold/50 disabled:opacity-50">Recuperar</button>
                          <button type="button" onClick={() => void eliminarDeColaLocal(item)} disabled={subiendo} aria-label={`Quitar ${item.nombre} de la cola local`} className="shrink-0 rounded-lg border border-border px-2 py-1.5 text-muted-foreground hover:text-destructive disabled:opacity-50"><X className="size-3.5" /></button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {subiendo && (
                  <div>
                    <div className="mb-1 flex justify-between gap-3 text-xs"><span aria-live="polite">{estadoSubida}</span><span className="shrink-0">{progreso}%</span></div>
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
                    <button type="button" onClick={() => void anadirImagenAlCatalogo(proyecto.archivos.find((item) => item.categoria === "fotos") ?? null, proyecto, proyecto.archivos.find((item) => item.nombre.toLowerCase().endsWith(".pdf") && item.origen === "supabase") ?? null)} disabled={anadiendoCatalogo !== null} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#c5a15d]/60 bg-[#c5a15d]/[0.10] px-3 py-2 text-xs font-semibold leading-tight text-foreground transition-colors hover:bg-[#c5a15d]/[0.17] disabled:opacity-50">
                      {anadiendoCatalogo === proyecto.nombre ? "Preparando ficha…" : "Crear ficha en catálogo"}
                    </button>
                    <button type="button" disabled={compartiendo !== null} onClick={() => setOpcionesCompartir(proyecto)} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold leading-tight text-foreground transition-colors hover:border-gold/40 disabled:opacity-50">
                      <Share2 className="size-3.5 shrink-0" /> {compartiendo === proyecto.nombre ? "Preparando transferencia…" : "Compartir proyecto"}
                    </button>
                    <button type="button" onClick={() => void eliminarProyectoCompleto(proyecto)} disabled={subiendo || compartiendo !== null} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-destructive/50 px-3 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50">
                      <X className="size-3.5 shrink-0" /> Eliminar todo el proyecto
                    </button>
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
                              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted/70 text-muted-foreground">{archivo.categoria === "fotos" ? <ImageIcon className="size-4" /> : archivo.categoria === "modelos-3d" ? <Box className="size-4" /> : archivo.categoria === "documentos" ? <FileText className="size-4" /> : <FileIcon className="size-4" />}</div>
                              <div className="min-w-0 flex-1"><p className="break-words text-xs font-semibold leading-5">{nombreVisible(archivo.nombre)}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{etiquetaTamano(archivo.bytes)} <span className="px-1">·</span> {archivo.nombre.split(".").pop()?.toUpperCase()}</p><span className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${archivo.origen === "nas" ? "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}><CheckCircle2 className="size-3" /> {archivo.origen === "nas" ? "NAS · Nextcloud" : "Supabase Storage"}</span></div>
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
                                <button type="button" onClick={async () => {
                                  if (archivo.origen !== "supabase") { toast.error("Este archivo 3DM no está disponible en el almacenamiento privado de Mi Nube."); return; }
                                  const { data, error: urlError } = await supabase.storage.from(BUCKET).createSignedUrl(archivo.ruta, 600);
                                  if (urlError || !data?.signedUrl) { toast.error("No se pudo preparar el 3DM para Aurum Render."); return; }
                                  sessionStorage.setItem("aurum-render-archivo-pendiente", JSON.stringify({ url: data.signedUrl, nombre: nombreVisible(archivo.nombre) }));
                                  window.location.assign("/aurum-render?desde-mi-nube=1");
                                }} className="rounded-lg border border-gold/40 bg-gold/5 px-2.5 py-1.5 text-[11px] font-semibold hover:bg-gold/10">
                                  Abrir en Aurum Render
                                </button>
                              )}
                              {archivo.categoria === "fotos" && <button type="button" onClick={() => void anadirImagenAlCatalogo(archivo)} disabled={anadiendoCatalogo === archivo.ruta} className="inline-flex items-center gap-1.5 rounded-lg border border-[#c5a15d]/50 bg-[#c5a15d]/10 px-2.5 py-2 text-[11px] font-semibold hover:bg-[#c5a15d]/15 disabled:opacity-50"><ImageIcon className="size-3.5" /> {anadiendoCatalogo === archivo.ruta ? "Preparando…" : "Añadir al catálogo"}</button>}
                              {archivo.categoria === "documentos" && archivo.nombre.toLowerCase().endsWith(".pdf") && archivo.origen === "supabase" && <button type="button" onClick={() => void anadirImagenAlCatalogo(proyecto.archivos.find((item) => item.categoria === "fotos") ?? null, proyecto, archivo)} disabled={anadiendoCatalogo !== null} className="inline-flex items-center gap-1.5 rounded-lg border border-[#c5a15d]/50 bg-[#c5a15d]/10 px-2.5 py-2 text-[11px] font-semibold hover:bg-[#c5a15d]/15 disabled:opacity-50"><FileText className="size-3.5" /> {anadiendoCatalogo === archivo.ruta ? "Preparando PDF…" : "Analizar PDF con IA"}</button>}
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
                              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted/70 text-muted-foreground">{archivo.categoria === "fotos" ? <ImageIcon className="size-4" /> : archivo.categoria === "modelos-3d" ? <Box className="size-4" /> : archivo.categoria === "documentos" ? <FileText className="size-4" /> : <FileIcon className="size-4" />}</div>
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
        {opcionesCompartir && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="mi-nube-opciones-title">
            <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold">Compartir desde Mi Nube</p>
                  <h3 id="mi-nube-opciones-title" className="mt-1 text-lg font-semibold">Compartir proyecto</h3>
                  <p className="mt-1 text-sm text-muted-foreground">“{opcionesCompartir.nombre}” · elige cómo quieres compartirlo.</p>
                </div>
                <button type="button" onClick={() => setOpcionesCompartir(null)} className="rounded-lg p-2 hover:bg-muted" aria-label="Cerrar"><X className="size-4" /></button>
              </div>
              <div className="mt-5 grid gap-3">
                <button type="button" onClick={() => { const proyecto = opcionesCompartir; setOpcionesCompartir(null); void abrirCompartirEcosistema(proyecto); }} className="flex items-start gap-3 rounded-xl border border-[#c5a15d]/50 bg-[#c5a15d]/[0.08] p-4 text-left transition-colors hover:bg-[#c5a15d]/[0.14]">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#c5a15d]/15 text-gold"><Share2 className="size-5" /></div>
                  <div><span className="block text-sm font-semibold">Compartir con un taller registrado</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">La carpeta original aparecerá en “Compartidas conmigo” de su Mi Nube. Sin duplicar archivos; puedes revocar el acceso.</span></div>
                </button>
                <button type="button" disabled={compartiendo !== null} onClick={() => { const proyecto = opcionesCompartir; setOpcionesCompartir(null); void compartirCarpetaTransfer(proyecto); }} className="flex items-start gap-3 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-gold/45 hover:bg-muted/40 disabled:opacity-50">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"><UploadCloud className="size-5" /></div>
                  <div><span className="block text-sm font-semibold">Generar enlace temporal · AURUM Transfer</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Para alguien externo al ecosistema. Enlace de un solo uso, con vencimiento de 24 horas y hasta 10 archivos.</span></div>
                </button>
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">Elige compartir permanentemente con un taller registrado o enviar una copia descargable mediante Transfer. Los originales de Mi Nube no se eliminan.</p>
              <button type="button" onClick={() => setOpcionesCompartir(null)} className="mt-4 w-full rounded-xl border border-border px-3 py-2.5 text-sm font-semibold">Cancelar</button>
            </div>
          </div>
        )}
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
