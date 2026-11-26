import { useNuevaVersion } from "@/hooks/use-nueva-version";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  Box,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
  ShoppingBag,
  Server,
  Store,
  Users,
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

type EnlaceVisor3d = { token: string; expira_en: string; nombre: string };
const rpcObtenerEnlaceVisor3d = (args: { _modelo_ruta: string; _nombre: string }) =>
  (supabase.rpc as unknown as (fn: string, a: typeof args) => Promise<{ data: EnlaceVisor3d[] | null; error: Error | null }>)("obtener_enlace_visor_3d", args);

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

/** Reduce el peso de imágenes de catálogo sin alterar el archivo privado original. */
async function optimizarImagenCatalogo(blob: Blob): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/i.test(blob.type) || blob.size < 400 * 1024) return blob;
  if (typeof createImageBitmap !== "function") return blob;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(blob);
    const maxDimension = 2000;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return blob;
    context.drawImage(bitmap, 0, 0, width, height);
    const optimizada = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    return optimizada && optimizada.size < blob.size ? optimizada : blob;
  } catch {
    // La optimización es opcional: si el navegador no puede procesar la imagen,
    // conservar la subida original en lugar de bloquear el flujo del catálogo.
    return blob;
  } finally {
    bitmap?.close();
  }
}

/** Marco visual compartido para que las fichas propias y recibidas evolucionen juntas. */
function FichaProyecto({ portada, nombre, children, portadaModo = "cover", accionesPortada, superpuesto = false }: { portada: string | null; nombre: string; children: ReactNode; portadaModo?: "cover" | "contain"; accionesPortada?: ReactNode; superpuesto?: boolean }) {
  return (
    <article className={`group relative overflow-hidden rounded-[1.35rem] border border-border/80 bg-card shadow-[0_2px_8px_rgba(20,20,20,0.035)] transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/35 hover:shadow-[0_12px_32px_rgba(20,20,20,0.075)] ${superpuesto ? "z-30" : ""}`}>
      <div className="relative">
        {portada ? (
          <div className="grid h-36 w-full place-items-center overflow-hidden bg-[#f5f4f1]">
            <img src={portada} alt={`Portada del proyecto ${nombre}`} className={portadaModo === "contain" ? "h-full w-full object-contain" : "h-36 w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]"} loading="lazy" />
          </div>
        ) : (
          <div className="grid h-36 place-items-center bg-[#f5f4f1] text-muted-foreground">
            <div className="text-center"><Box className="mx-auto size-8" /><p className="mt-2 text-xs">Sin imagen de portada</p></div>
          </div>
        )}
        {accionesPortada && <div className="absolute inset-x-2 bottom-2 flex justify-end gap-2 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">{accionesPortada}</div>}
      </div>
      {children}
    </article>
  );
}

type Categoria = "fotos" | "videos" | "documentos" | "modelos-3d" | "otros";
type CarpetaCompartida = { id: string; propietario_participante_id: string; propietario_usuario_id: string; carpeta: string; destinatario_participante_id: string; created_at: string; destinatario_nombre?: string };
type TallerCompartir = { id: string; nombre: string; ciudad?: string | null };
type CarpetaRecibida = { id: string; nombre: string; propietarioNombre: string; ruta: string; archivos: ArchivoNube[]; portada: string | null; archivosCargados: boolean; cargandoArchivos: boolean };
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
  { id: "modelos-3d", titulo: "Biblioteca 3D", descripcion: "Diseños CAD y modelos para visualizar o renderizar.", formatos: "3DM · STL · OBJ · GLB · STEP", Icono: Box },
];

function clasificarArchivo(nombre: string): Categoria {
  const ext = nombre.split(".").pop()?.toLocaleLowerCase("es") ?? "";
  if (["jpg", "jpeg", "png", "webp", "avif", "gif", "heic", "heif"].includes(ext)) return "fotos";
  if (["mp4", "mov", "webm", "m4v", "avi", "mkv"].includes(ext)) return "videos";
  if (["pdf", "doc", "docx", "xls", "xlsx", "csv", "txt", "rtf", "odt"].includes(ext)) return "documentos";
  if (["3dm", "stl", "obj", "glb", "gltf", "3mf", "ply", "fbx", "step", "stp"].includes(ext)) return "modelos-3d";
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


function etiquetaTipoArchivo(nombre: string) {
  const visible = nombreVisible(nombre);
  const punto = visible.lastIndexOf(".");
  return punto > 0 && punto < visible.length - 1
    ? visible.slice(punto + 1).toLocaleUpperCase("es")
    : "ARCHIVO";
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
  const [mostrarMisVentas, setMostrarMisVentas] = useState(false);
  const [filtroMisVentas, setFiltroMisVentas] = useState<"todas" | "borrador" | "publicado" | "pausado">("todas");
  const [misVentas, setMisVentas] = useState<Array<{ id: string; titulo: string; categoria: string; formatos: string[]; precio: number; moneda: string; estado: string; created_at: string; nombre_archivo: string; ruta_archivo: string; imagen_portada_url: string | null }>>([]);
  const [cargandoMisVentas, setCargandoMisVentas] = useState(false);
  const [errorMisVentas, setErrorMisVentas] = useState<string | null>(null);
  const [ventaEnEdicion, setVentaEnEdicion] = useState<{ id: string; titulo: string; precio: string } | null>(null);
  const [guardandoVenta, setGuardandoVenta] = useState(false);
  const [proyectoAbierto, setProyectoAbierto] = useState<string | null>(null);
  const [proyectoPendienteEliminar, setProyectoPendienteEliminar] = useState<{ nombre: string; archivos: ArchivoNube[] } | null>(null);
  const [proyectoRenombrando, setProyectoRenombrando] = useState<string | null>(null);
  const [nuevoNombreCarpeta, setNuevoNombreCarpeta] = useState("");
  const [guardandoNombreCarpeta, setGuardandoNombreCarpeta] = useState(false);
  const [archivoPendienteEliminar, setArchivoPendienteEliminar] = useState<ArchivoNube | null>(null);
  const [comparticionPendienteRevocar, setComparticionPendienteRevocar] = useState<CarpetaCompartida | null>(null);
  const [modoEdicion, setModoEdicion] = useState<string | null>(null);
  const [compartiendo, setCompartiendo] = useState<string | null>(null);
  const [progresoCompartir, setProgresoCompartir] = useState("");
  const [errorCompartir, setErrorCompartir] = useState<{ proyecto: string; mensaje: string } | null>(null);
  const [enlaceCompartido, setEnlaceCompartido] = useState<{ proyecto: string; url: string } | null>(null);
  const [enlacesVisorArchivo, setEnlacesVisorArchivo] = useState<Array<{ ruta: string; url: string }>>([]);
  const [generandoEnlaceVisor, setGenerandoEnlaceVisor] = useState<string | null>(null);
  const [revocandoEnlaceVisor, setRevocandoEnlaceVisor] = useState<string | null>(null);
  const [seccionActiva, setSeccionActiva] = useState<Categoria | "todos">("todos");
  const [carpeta, setCarpeta] = useState("");
  const [carpetas, setCarpetas] = useState<string[]>([]);
  const [archivos, setArchivos] = useState<ArchivoNube[]>([]);
  const [cuotaMiNube, setCuotaMiNube] = useState<{ plan: string; almacenamientoMiB: number; carpetasMax: number } | null>(null);
  const [errorCuotaMiNube, setErrorCuotaMiNube] = useState<string | null>(null);
  const [bytesSupabaseUsados, setBytesSupabaseUsados] = useState<number | null>(null);
  const [carpetasSupabaseUsadas, setCarpetasSupabaseUsadas] = useState<number | null>(null);
  const cargaBibliotecaEnCurso = useRef(false);
  const cargaBibliotecaPendiente = useRef(false);
  useEffect(() => {
    setCarpetas([...new Set(archivos.map((archivo) => archivo.carpeta))]);
  }, [archivos]);

  useEffect(() => {
    let cancelado = false;
    if (!participanteId) { setCuotaMiNube(null); setErrorCuotaMiNube(null); return; }
    void (async () => {
      try {
        const { data: participante, error: errorParticipante } = await supabase.from("ecosistema_participantes").select("metadata").eq("id", participanteId).maybeSingle();
        if (errorParticipante) throw errorParticipante;
        const metadata = (participante?.metadata ?? {}) as Record<string, unknown>;
        const plan = typeof metadata.plan_comercial === "string" && metadata.plan_comercial.trim() ? metadata.plan_comercial.trim() : "emprendedor";
        const { data: cuota, error: errorPlan } = await supabase.from("aurum_plan_quotas").select("almacenamiento_mib,carpetas_mi_nube_max").eq("plan_id", plan).maybeSingle();
        if (errorPlan) throw errorPlan;
        if (!cuota) throw new Error("No se encontró la cuota del plan comercial.");
        if (!cancelado) { setCuotaMiNube({ plan, almacenamientoMiB: cuota.almacenamiento_mib, carpetasMax: cuota.carpetas_mi_nube_max }); setErrorCuotaMiNube(null); }
      } catch (cause) {
        if (!cancelado) { setCuotaMiNube(null); setErrorCuotaMiNube(cause instanceof Error ? cause.message : "No se pudo consultar la cuota del plan."); }
      }
    })();
    return () => { cancelado = true; };
  }, [participanteId]);


  const cargarMisVentas = useCallback(async () => {
    if (!usuarioId) { setMisVentas([]); return; }
    setCargandoMisVentas(true);
    setErrorMisVentas(null);
    try {
      const marketplaceClient = supabase as unknown as {
        from: (table: string) => {
          select: (columns: string) => {
            eq: (column: string, value: string) => {
              order: (column: string, options: { ascending: boolean }) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
            };
          };
        };
      };
      const { data, error } = await marketplaceClient.from("archivos_digitales_marketplace")
        .select("id,titulo,categoria,formatos,precio,moneda,estado,created_at,nombre_archivo,ruta_archivo,imagen_portada_url")
        .eq("vendedor_usuario_id", usuarioId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      setMisVentas((data ?? []) as typeof misVentas);
    } catch (cause) {
      setErrorMisVentas(cause instanceof Error ? cause.message : "No se pudieron cargar tus publicaciones.");
    } finally {
      setCargandoMisVentas(false);
    }
  }, [usuarioId]);

  const actualizarVentaPropia = async (id: string, valores: Record<string, unknown>) => {
    if (!usuarioId) throw new Error("Inicia sesión para gestionar tus publicaciones.");
    const client = supabase as unknown as {
      from: (table: string) => {
        update: (values: Record<string, unknown>) => {
          eq: (column: string, value: string) => {
            eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
          };
        };
        delete: () => {
          eq: (column: string, value: string) => {
            eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
    };
    const { error } = await client.from("archivos_digitales_marketplace").update(valores).eq("id", id).eq("vendedor_usuario_id", usuarioId);
    if (error) throw new Error(error.message);
  };

  const guardarEdicionVenta = async () => {
    if (!ventaEnEdicion) return;
    const titulo = ventaEnEdicion.titulo.trim();
    const precio = Number(ventaEnEdicion.precio);
    if (titulo.length < 3 || titulo.length > 140) { toast.error("El nombre debe tener entre 3 y 140 caracteres."); return; }
    if (!Number.isFinite(precio) || precio <= 0) { toast.error("Introduce un precio mayor que cero."); return; }
    setGuardandoVenta(true);
    try {
      await actualizarVentaPropia(ventaEnEdicion.id, { titulo, precio, updated_at: new Date().toISOString() });
      setVentaEnEdicion(null);
      await cargarMisVentas();
      toast.success("Publicación actualizada.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudo actualizar la publicación.");
    } finally { setGuardandoVenta(false); }
  };

  const regenerarPortadaVenta = async (venta: { id: string; ruta_archivo: string; titulo: string }) => {
    if (!usuarioId || !participanteId) { toast.error("Inicia sesión y verifica que tu taller esté activo."); return; }
    const prefijoPropio = participanteId + "/" + usuarioId + "/";
    if (!venta.ruta_archivo.startsWith(prefijoPropio)) { toast.error("El archivo de origen no pertenece a tu Mi Nube."); return; }
    setGuardandoVenta(true);
    try {
      const carpetaRuta = venta.ruta_archivo.split("/").slice(0, -1).join("/");
      const { data: entradas, error: listaError } = await supabase.storage.from("mi-nube").list(carpetaRuta, { limit: 1000, sortBy: { column: "name", order: "asc" } });
      if (listaError) throw listaError;
      const imagenes = (entradas ?? []).filter((item) => item.name && /\.(jpe?g|png|webp)$/i.test(item.name));
      const portada = imagenes.find((item) => item.name.toLowerCase() === "00-portada-aurum.png")
        ?? imagenes.find((item) => /portada|poster|cover/i.test(item.name))
        ?? imagenes[0];
      if (!portada) throw new Error("No encontramos una imagen en la carpeta del proyecto. Guarda primero el póster desde el visor 3D o añade una imagen JPG, PNG o WebP a esa carpeta.");
      const rutaImagen = carpetaRuta + "/" + portada.name;
      const { data: firmada, error: firmaError } = await supabase.storage.from("mi-nube").createSignedUrl(rutaImagen, 600);
      if (firmaError || !firmada?.signedUrl) throw firmaError ?? new Error("No se pudo leer la imagen desde Mi Nube.");
      const respuesta = await fetch(firmada.signedUrl);
      if (!respuesta.ok) throw new Error("No se pudo descargar la imagen de portada.");
      const blob = await respuesta.blob();
      const extension = portada.name.split(".").pop()?.toLowerCase() ?? "png";
      const destino = participanteId + "/marketplace-portadas/" + usuarioId + "/" + crypto.randomUUID() + "." + extension;
      const { error: subidaError } = await supabase.storage.from("catalogo-joyas").upload(destino, blob, { contentType: blob.type || "image/png", upsert: false });
      if (subidaError) throw new Error("No se pudo publicar la portada. Revisa los permisos del bucket catalogo-joyas en Lovable Cloud.");
      const url = supabase.storage.from("catalogo-joyas").getPublicUrl(destino).data.publicUrl;
      if (!url) throw new Error("No se pudo obtener la URL pública de la portada.");
      await actualizarVentaPropia(venta.id, { imagen_portada_url: url, updated_at: new Date().toISOString() });
      await cargarMisVentas();
      toast.success("Portada actualizada para “" + venta.titulo + "”.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudo actualizar la portada.", { duration: 9000 });
    } finally { setGuardandoVenta(false); }
  };

  const cambiarEstadoVenta = async (venta: { id: string; titulo: string; estado: string }, estado: "publicado" | "pausado") => {
    if (estado === "publicado" && !window.confirm("Esto hará visible la publicación en la Tienda 3D. La compra y descarga automatizada todavía no están habilitadas. ¿Quieres hacerla visible de todos modos?")) return;
    if (estado === "pausado" && !window.confirm("La publicación dejará de aparecer en la Tienda 3D. ¿Continuar?")) return;
    setGuardandoVenta(true);
    try {
      await actualizarVentaPropia(venta.id, { estado, updated_at: new Date().toISOString() });
      await cargarMisVentas();
      toast.success(estado === "publicado" ? "Publicación visible en la Tienda 3D. Recuerda que la compra automatizada aún no está habilitada." : "Publicación pausada.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudo cambiar el estado.");
    } finally { setGuardandoVenta(false); }
  };

  const eliminarBorradorVenta = async (venta: { id: string; titulo: string; estado: string }) => {
    if (venta.estado !== "borrador") { toast.error("Solo puedes eliminar borradores desde aquí."); return; }
    if (!window.confirm(`¿Eliminar el borrador “${venta.titulo}”? Esto no elimina los archivos originales de Mi Nube.`)) return;
    if (!usuarioId) return;
    setGuardandoVenta(true);
    try {
      const client = supabase as unknown as {
        from: (table: string) => {
          delete: () => {
            eq: (column: string, value: string) => {
              eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
            };
          };
        };
      };
      const { error } = await client.from("archivos_digitales_marketplace").delete().eq("id", venta.id).eq("vendedor_usuario_id", usuarioId);
      if (error) throw new Error(error.message);
      await cargarMisVentas();
      toast.success("Borrador eliminado. Los archivos originales siguen en Mi Nube.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudo eliminar el borrador.");
    } finally { setGuardandoVenta(false); }
  };

  const [seleccionados, setSeleccionados] = useState<File[]>([]);
  const [colaLocal, setColaLocal] = useState<ArchivoEnCola[]>([]);
  const [guardandoCola, setGuardandoCola] = useState(false);
  const [carpetaDestinoEdicion, setCarpetaDestinoEdicion] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const nuevaVersion = useNuevaVersion(!subiendo);

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
  const [errorSubida, setErrorSubida] = useState<string | null>(null);
  const [proyectoParaCompartir, setProyectoParaCompartir] = useState<string | null>(null);
  const [opcionesCompartir, setOpcionesCompartir] = useState<{ nombre: string; archivos: ArchivoNube[] } | null>(null);
  const [mostrarTalleresCompartidos, setMostrarTalleresCompartidos] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const glb = opcionesCompartir?.archivos.filter((archivo) => archivo.origen === "supabase" && archivo.nombre.toLowerCase().endsWith(".glb")) ?? [];
    if (!glb.length) return;
    void Promise.all(glb.map(async (archivo) => {
      const { data, error } = await rpcObtenerEnlaceVisor3d({ _modelo_ruta: archivo.ruta, _nombre: nombreVisible(archivo.nombre) });
      if (error || !Array.isArray(data) || !data[0]?.token || !data[0]?.expira_en || new Date(data[0].expira_en).getTime() <= Date.now()) return null;
      return { ruta: archivo.ruta, url: new URL("/v/" + data[0].token, window.location.origin).toString() };
    })).then((enlaces) => {
      if (cancelado) return;
      const validos = enlaces.filter((enlace): enlace is { ruta: string; url: string } => enlace !== null);
      setEnlacesVisorArchivo((actuales) => {
        const rutas = new Set(glb.map((archivo) => archivo.ruta));
        return [...actuales.filter((enlace) => !rutas.has(enlace.ruta)), ...validos];
      });
    });
    return () => { cancelado = true; };
  }, [opcionesCompartir]);
  const [talleresDisponibles, setTalleresDisponibles] = useState<TallerCompartir[]>([]);
  const [talleresDisponiblesParaParticipante, setTalleresDisponiblesParaParticipante] = useState<string | null>(null);
  const cargaTalleresEnCurso = useRef(false);
  const [tallerDestino, setTallerDestino] = useState("");
  const [cargandoTalleres, setCargandoTalleres] = useState(false);
  const [guardandoComparticion, setGuardandoComparticion] = useState(false);
  const [compartidas, setCompartidas] = useState<CarpetaCompartida[]>([]);
  const [carpetasRecibidas, setCarpetasRecibidas] = useState<CarpetaRecibida[]>([]);
  const [cargandoCompartidas, setCargandoCompartidas] = useState(false);
  const cargaCompartidasEnCurso = useRef(false);
  const cargaCompartidasPendiente = useRef(false);
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
  const comprobarNas = useCallback(async (): Promise<EstadoNas> => {
    if (!participanteId || !usuarioId) {
      setEstadoNas("unknown");
      setMensajeNas("Inicia sesión con un taller activo");
      return "unknown";
    }
    try {
      const { data, error } = await supabase.functions.invoke("nextcloud-status", { body: {} });
      if (error) throw error;
      const estado = data?.status as EstadoNas | undefined;
      if (estado && ["online", "offline", "misconfigured", "not_configured", "unknown"].includes(estado)) {
        setEstadoNas(estado);
        setMensajeNas(typeof data?.message === "string" ? data.message : "Estado actualizado");
        return estado;
      } else {
        setEstadoNas("unknown");
        setMensajeNas("No se pudo confirmar el estado");
        return "unknown";
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
      return "offline";
    }
  }, [participanteId, usuarioId]);

  useEffect(() => {
    // Comprobar al entrar; las acciones de NAS tienen comprobación explícita
    // y el usuario puede volver a comprobar desde el control de estado.
    if (nasPausado) {
      setMensajeNas("Conexión pausada manualmente.");
      return;
    }
    void comprobarNas();
  }, [comprobarNas, nasPausado]);

  // Carga exclusiva de Supabase Storage. No consulta ni depende del estado del NAS.
  const cargarBiblioteca = useCallback(async () => {
    if (cargaBibliotecaEnCurso.current) {
      cargaBibliotecaPendiente.current = true;
      return;
    }
    if (!participanteId || !usuarioId) {
      setCarpetas([]);
      setArchivos([]);
      return;
    }
    cargaBibliotecaEnCurso.current = true;
    setCargando(true);
    setError(null);
    try {
      const raiz = `${participanteId}/${usuarioId}`;
      const listarStorage = async (ruta: string, etapa: string) => {
        let ultimoError: Error | null = null;
        for (let intento = 0; intento < 2; intento++) {
          const { data, error: errorLista } = await supabase.storage
            .from(BUCKET)
            .list(ruta, { limit: 1000, sortBy: { column: "name", order: "asc" } });
          if (!errorLista) return data ?? [];
          ultimoError = new Error(errorLista.message);
          if (intento === 0 && /timeout|timed out|temporar|fetch/i.test(errorLista.message)) {
            await new Promise((resolve) => window.setTimeout(resolve, 700));
            continue;
          }
          break;
        }
        throw new Error(`Supabase Storage · ${etapa}: ${ultimoError?.message ?? "No se pudo listar la carpeta."}`);
      };

      const entradas = await listarStorage(raiz, "carpeta raíz");
      const nombresCarpetas = (entradas ?? [])
        .filter((entrada) => !entrada.id && !entrada.metadata)
        .map((entrada) => entrada.name)
        .filter(Boolean);
      const resultados: ArchivoNube[][] = [];
      const carpetasConError: string[] = [];
      // Limitar concurrencia para que una biblioteca grande no sature Storage.
      for (let inicio = 0; inicio < nombresCarpetas.length; inicio += 2) {
        const lote = nombresCarpetas.slice(inicio, inicio + 2);
        const respuestas = await Promise.all(lote.map(async (nombreCarpeta) => {
          try {
            const data = await listarStorage(`${raiz}/${nombreCarpeta}`, `carpeta "${nombreCarpeta}"`);
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
                  origen: "supabase",
                };
              });
          } catch (folderCause) {
            const detalle = folderCause instanceof Error ? folderCause.message : "Error desconocido";
            carpetasConError.push(nombreCarpeta);
            console.warn(`[Mi Nube] No se pudo consultar la carpeta "${nombreCarpeta}".`, detalle);
            return [];
          }
        }));
        resultados.push(...respuestas);
      }

      // Métricas de cuota: sumar todos los objetos listados, incluidos artefactos
      // internos de Aurum que se ocultan del explorador visual. El NAS queda excluido.
      setBytesSupabaseUsados(resultados.flat().reduce((total, archivo) => total + Math.max(0, archivo.bytes), 0));
      setCarpetasSupabaseUsadas(nombresCarpetas.length);

      // Archivos internos de Aurum: permanecen en Supabase Storage y se usan
      // al reabrir/actualizar proyectos, pero no se muestran como archivos del usuario.
      const archivosPlanos = resultados.flat().filter((archivo) => {
        const nombreInterno = archivo.nombre.toLowerCase();
        return nombreInterno !== "01-modelo.glb" && nombreInterno !== "02-configuracion-aurum.json";
      });
      // Preparar solo las portadas necesarias antes de firmar URLs; los demás
      // archivos no deben entrar en lotes de trabajo de vistas previas.
      const primeraFotoPorCarpeta = new Map<string, ArchivoNube>();
      for (const archivo of archivosPlanos) {
        if (archivo.categoria === "fotos" && !primeraFotoPorCarpeta.has(archivo.carpeta)) {
          primeraFotoPorCarpeta.set(archivo.carpeta, archivo);
        }
      }
      const portadas = [...primeraFotoPorCarpeta.values()];
      const urlPorRuta = new Map<string, string | null>();
      // Firmar como máximo cuatro portadas en paralelo, independientemente
      // del número total de archivos que tenga la biblioteca.
      const concurrenciaVistas = 4;
      for (let inicio = 0; inicio < portadas.length; inicio += concurrenciaVistas) {
        const lote = portadas.slice(inicio, inicio + concurrenciaVistas);
        await Promise.all(lote.map(async (archivo) => {
          try {
            const { data, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(archivo.ruta, 60 * 10);
            if (signedError) console.warn("[Mi Nube] No se pudo generar vista previa.", archivo.nombre, signedError.message);
            urlPorRuta.set(archivo.ruta, data?.signedUrl ?? null);
          } catch (previewCause) {
            console.warn("[Mi Nube] Falló una vista previa; se conserva el archivo en el listado.", archivo.nombre, previewCause);
            urlPorRuta.set(archivo.ruta, null);
          }
        }));
      }
      const archivosConVistas = archivosPlanos.map((archivo) => {
        if (archivo.categoria !== "fotos" || primeraFotoPorCarpeta.get(archivo.carpeta)?.ruta !== archivo.ruta) return archivo;
        return { ...archivo, urlVista: urlPorRuta.get(archivo.ruta) ?? null };
      });

      setArchivos((actuales) => [
        ...archivosConVistas,
        ...actuales.filter((archivo) => archivo.origen === "nas"),
      ]);
      if (carpetasConError.length) {
        setError(`No se pudieron consultar ${carpetasConError.length} carpeta(s) de Supabase Storage: ${carpetasConError.join(", ")}. El resto de la biblioteca se ha cargado; vuelve a comprobar más tarde.`);
      }
    } catch (cause) {
      const mensaje = cause instanceof Error ? cause.message : "No se pudo cargar la biblioteca de Supabase Storage.";
      setError(mensaje);
      console.error("[Mi Nube] Falló la carga de Supabase Storage.", mensaje);
    } finally {
      cargaBibliotecaEnCurso.current = false;
      setCargando(false);
      if (cargaBibliotecaPendiente.current) {
        cargaBibliotecaPendiente.current = false;
        window.setTimeout(() => { void cargarBiblioteca(); }, 0);
      }
    }
  }, [participanteId, usuarioId]);

  // Consulta Nextcloud por separado: su disponibilidad no dispara ni bloquea el listado web.
  const cargarArchivosNas = useCallback(async (forzarTrasComprobacion = false) => {
    if (!participanteId || !usuarioId) return;
    if (nasPausado || (!forzarTrasComprobacion && estadoNas !== "online")) {
      setErrorListadoNas(null);
      setArchivos((actuales) => actuales.filter((archivo) => archivo.origen !== "nas"));
      return;
    }
    try {
      const { data: nasData, error: nasError } = await supabase.functions.invoke("nextcloud-video-files", {
        body: { action: "list", participantId: participanteId },
      });
      if (nasError) throw new Error(nasError.message || "No se pudo consultar el NAS.");
      if (nasData?.error) throw new Error(String(nasData.error));
      if (!Array.isArray(nasData?.files)) throw new Error("Nextcloud devolvió una respuesta de archivos no válida.");
      const archivosNas: ArchivoNube[] = nasData.files.map((item: { name: string; folder: string; bytes: number; updated: string | null }): ArchivoNube => ({
        nombre: item.name,
        ruta: `${item.folder}/${item.name}`,
        carpeta: item.folder,
        bytes: Number(item.bytes ?? 0),
        actualizado: item.updated && Number.isFinite(Date.parse(item.updated)) ? new Date(item.updated).toISOString() : null,
        categoria: "videos",
        origen: "nas",
      }));
      setErrorListadoNas(null);
      setArchivos((actuales) => [
        ...actuales.filter((archivo) => archivo.origen !== "nas"),
        ...archivosNas,
      ]);
    } catch (nasCause) {
      const mensajeNasError = nasCause instanceof Error ? nasCause.message : "No se pudo consultar el NAS.";
      setErrorListadoNas(mensajeNasError);
      console.warn("[Mi Nube] Falló el listado opcional del NAS.", mensajeNasError);
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
          body: { token: importTransfer, participantId: participanteId ?? undefined },
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
  }, [sesion, participanteId, importandoTransferencia, cargarBiblioteca]);

  useEffect(() => {
    const proyectoSolicitado = new URLSearchParams(window.location.search).get("proyecto")?.trim().slice(0, 120);
    if (!proyectoSolicitado) return;
    setBusqueda(proyectoSolicitado);
    setProyectoAbierto(proyectoSolicitado);
  }, []);

  useEffect(() => {
    void cargarBiblioteca();
  }, [cargarBiblioteca]);

  useEffect(() => {
    void cargarArchivosNas();
  }, [cargarArchivosNas]);

  const anadirImagenAlCatalogo = async (
    archivo: ArchivoNube | null,
    proyecto?: { nombre: string; archivos: ArchivoNube[] },
    pdf?: ArchivoNube | null,
  ) => {
    if (!participanteId || !usuarioId) { toast.error("No se encontró tu taller activo."); return; }
    const imagen = archivo ?? proyecto?.archivos.find((item) => item.categoria === "fotos") ?? null;
    if (!imagen && !proyecto && !pdf) { toast.error("Selecciona una imagen, un PDF o un proyecto."); return; }
    if (imagen && imagen.origen === "nas") { toast.error("Esta imagen está en Nextcloud y debe descargarse a Mi Nube antes de usarla como portada."); return; }
    setAnadiendoCatalogo(proyecto?.nombre ?? imagen?.ruta ?? "proyecto");
    try {
      let imagenPrincipalUrl = "";
      if (imagen) {
        const { data: signed, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(imagen.ruta, 60);
        if (signedError || !signed?.signedUrl) throw signedError ?? new Error("No se pudo leer la imagen original.");
        const response = await fetch(signed.signedUrl);
        if (!response.ok) throw new Error("No se pudo descargar la imagen desde Mi Nube.");
        const blobOriginal = await response.blob();
        const blob = await optimizarImagenCatalogo(blobOriginal);
        const extension = blob.type === "image/webp" ? ".webp" : "";
        const nombreBase = nombreSeguro(nombreVisible(imagen.nombre)).replace(/\.[^.]+$/, "");
        const destino = participanteId + "/mi-nube/" + crypto.randomUUID() + "-" + nombreBase + (extension || "." + (imagen.nombre.split(".").pop() || "jpg"));
        const { error: uploadError } = await supabase.storage.from("catalogo-joyas").upload(destino, blob, { contentType: blob.type || "image/jpeg", cacheControl: "31536000", upsert: false });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from("catalogo-joyas").getPublicUrl(destino);
        if (!publicData?.publicUrl) throw new Error("No se pudo obtener la imagen para el catálogo.");
        imagenPrincipalUrl = publicData.publicUrl;
      }
      let pdfParaCatalogo = pdf ?? null;
      if (pdfParaCatalogo && pdfParaCatalogo.origen !== "nas") {
        const prefijoPrivado = `${participanteId}/${usuarioId}/`;
        if (!pdfParaCatalogo.ruta.startsWith(prefijoPrivado)) {
          const { data: signedPdf, error: signedPdfError } = await supabase.storage.from(BUCKET).createSignedUrl(pdfParaCatalogo.ruta, 60);
          if (signedPdfError || !signedPdf?.signedUrl) throw signedPdfError ?? new Error("No se pudo leer el PDF compartido.");
          const respuestaPdf = await fetch(signedPdf.signedUrl);
          if (!respuestaPdf.ok) throw new Error("No se pudo descargar el PDF compartido.");
          const blobPdf = await respuestaPdf.blob();
          if (blobPdf.size > 10 * 1024 * 1024) throw new Error("El PDF supera el límite de 10 MB para análisis con IA.");
          const rutaPdfPropia = `${participanteId}/${usuarioId}/compartidos/${crypto.randomUUID()}-${nombreSeguro(nombreVisible(pdfParaCatalogo.nombre))}`;
          const { error: copiaPdfError } = await supabase.storage.from(BUCKET).upload(rutaPdfPropia, blobPdf, { contentType: "application/pdf", upsert: false });
          if (copiaPdfError) throw copiaPdfError;
          pdfParaCatalogo = { ...pdfParaCatalogo, ruta: rutaPdfPropia, origen: "supabase" };
        }
      }
      const nombreProyecto = proyecto?.nombre ?? nombreVisible((imagen ?? pdfParaCatalogo)!.nombre).replace(/\.[^.]+$/, "");
      const proyectoNube = proyecto ? {
        carpeta: proyecto.nombre,
        archivos: proyecto.archivos.map((item) => ({
          nombre: nombreVisible(item.nombre), ruta: item.ruta, categoria: item.categoria,
          bytes: item.bytes, origen: item.origen ?? "supabase", actualizado: item.actualizado,
        })),
      } : null;
      sessionStorage.setItem("mi-nube-catalogo-pendiente", JSON.stringify({
        nombre: nombreProyecto, imagen_principal_url: imagenPrincipalUrl, proyecto_nube: proyectoNube,
        pdf_nube: pdfParaCatalogo ? { nombre: nombreVisible(pdfParaCatalogo.nombre), ruta: pdfParaCatalogo.ruta } : null,
      }));
      toast.success(pdf ? "PDF privado preparado para analizar con IA. Revisa la ficha antes de guardar." : proyecto ? "Proyecto preparado. Revisa la ficha y sus archivos antes de guardar." : "Imagen preparada. Completa la ficha para añadirla al catálogo.");
      window.location.assign("/catalogo?desde=mi-nube");
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "No se pudo preparar el proyecto para el catálogo."); }
    finally { setAnadiendoCatalogo(null); }
  };
  const cargarCompartidas = useCallback(async () => {
    if (cargaCompartidasEnCurso.current) {
      cargaCompartidasPendiente.current = true;
      return;
    }
    if (!participanteId || !usuarioId) { setCompartidas([]); setCarpetasRecibidas([]); return; }
    cargaCompartidasEnCurso.current = true;
    setCargandoCompartidas(true);
    try {
      const { data: recibidas, error: errorRecibidas } = await supabase
        .from("mi_nube_compartidas")
        .select("id, propietario_participante_id, propietario_usuario_id, carpeta, destinatario_participante_id, created_at")
        .eq("destinatario_participante_id", participanteId)
        .is("revoked_at", null);
      if (errorRecibidas) throw errorRecibidas;
      const { data: enviadas, error: errorEnviadas } = await supabase.from("mi_nube_compartidas")
        .select("id, propietario_participante_id, propietario_usuario_id, carpeta, destinatario_participante_id, created_at")
        .eq("propietario_usuario_id", usuarioId)
        .is("revoked_at", null);
      if (errorEnviadas) throw errorEnviadas;

      // Resolver nombres de los talleres receptores para que el propietario
      // identifique cada permiso sin mostrar solo el UUID.
      const idsDestinatarios = [...new Set((enviadas ?? []).map((s) => s.destinatario_participante_id).filter(Boolean))];
      let nombresDestinatarios = new Map<string, string>();
      if (idsDestinatarios.length > 0) {
        const { data: destinatarios, error: errorDestinatarios } = await supabase
          .from("ecosistema_participantes")
          .select("id, nombre")
          .in("id", idsDestinatarios);
        if (errorDestinatarios) throw errorDestinatarios;
        nombresDestinatarios = new Map((destinatarios ?? []).map((t) => [t.id, t.nombre?.trim() || "Taller sin nombre"]));
      }
      setCompartidas((enviadas ?? []).map((s) => ({
        ...s,
        destinatario_nombre: nombresDestinatarios.get(s.destinatario_participante_id) ?? "Taller del ecosistema",
      })));

      // Resolver los propietarios de todas las carpetas recibidas en una sola
      // consulta, en vez de ejecutar una consulta por cada carpeta compartida.
      const idsPropietarios = [...new Set((recibidas ?? [])
        .map((share) => share.propietario_participante_id)
        .filter(Boolean))];
      const nombresPropietarios = new Map<string, string>();
      if (idsPropietarios.length > 0) {
        const { data: propietarios, error: errorPropietarios } = await supabase
          .from("ecosistema_participantes")
          .select("id, nombre")
          .in("id", idsPropietarios);
        if (errorPropietarios) {
          console.warn("[Mi Nube] No se pudieron resolver los nombres de los propietarios.", errorPropietarios.message);
        } else {
          for (const propietario of propietarios ?? []) {
            nombresPropietarios.set(propietario.id, propietario.nombre?.trim() || "Taller del ecosistema");
          }
        }
      }
      // Solo cargar metadatos de las carpetas compartidas al entrar en Mi Nube.
      // El contenido de Storage y las URLs firmadas se solicitan al abrir cada carpeta.
      const recibidasNormalizadas = recibidas ?? [];
      const carpetasIniciales: CarpetaRecibida[] = recibidasNormalizadas.map((share) => ({
        id: share.id,
        nombre: share.carpeta,
        propietarioNombre: nombresPropietarios.get(share.propietario_participante_id) ?? "Taller del ecosistema",
        ruta: `${share.propietario_participante_id}/${share.propietario_usuario_id}/${share.carpeta}`,
        archivos: [],
        portada: null,
        archivosCargados: false,
        cargandoArchivos: false,
      }));
      setCarpetasRecibidas(carpetasIniciales);

      // Cargar únicamente la portada de cada carpeta compartida.
      // El resto de archivos continúa bajo demanda para no cargar toda la nube.
      void Promise.all(carpetasIniciales.map(async (carpeta) => {
        try {
          const { data: entradas, error: listaError } = await supabase.storage.from(BUCKET).list(carpeta.ruta, {
            limit: 1000,
            sortBy: { column: "name", order: "asc" },
          });
          if (listaError) throw listaError;
          const primeraFoto = (entradas ?? []).find((entrada) =>
            Boolean(entrada.name)
            && !entrada.name.endsWith("/")
            && clasificarArchivo(entrada.name) === "fotos"
            && Boolean(entrada.id || entrada.metadata || entrada.name.includes(".")),
          );
          if (!primeraFoto) return;
          const rutaPortada = `${carpeta.ruta}/${primeraFoto.name}`;
          const { data: urlFirmada, error: errorFirma } = await supabase.storage.from(BUCKET).createSignedUrl(rutaPortada, 60);
          if (errorFirma || !urlFirmada?.signedUrl) throw errorFirma ?? new Error("No se pudo generar la URL de portada.");
          setCarpetasRecibidas((actuales) => actuales.map((actual) =>
            actual.id === carpeta.id ? { ...actual, portada: urlFirmada.signedUrl } : actual,
          ));
        } catch (cause) {
          console.warn("[Mi Nube] No se pudo cargar la portada de una carpeta compartida.", {
            carpeta: carpeta.nombre,
            error: cause instanceof Error ? cause.message : String(cause),
          });
        }
      }));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudieron cargar las carpetas compartidas.");
    } finally {
      cargaCompartidasEnCurso.current = false;
      setCargandoCompartidas(false);
      if (cargaCompartidasPendiente.current) {
        cargaCompartidasPendiente.current = false;
        window.setTimeout(() => { void cargarCompartidas(); }, 0);
      }
    }
  }, [participanteId, usuarioId]);

  useEffect(() => { void cargarCompartidas(); }, [cargarCompartidas]);

  const cargasArchivosCompartidos = useRef(new Map<string, Promise<ArchivoNube[]>>());

  const cargarArchivosCarpetaRecibida = useCallback(async (id: string): Promise<ArchivoNube[]> => {
    const carpetaActual = carpetasRecibidas.find((carpeta) => carpeta.id === id);
    if (!carpetaActual) return [];
    if (carpetaActual.archivosCargados) return carpetaActual.archivos;
    const cargaExistente = cargasArchivosCompartidos.current.get(id);
    if (cargaExistente) return cargaExistente;

    const carga = Promise.resolve().then(async (): Promise<ArchivoNube[]> => {
      setCarpetasRecibidas((actuales) => actuales.map((carpeta) => carpeta.id === id ? { ...carpeta, cargandoArchivos: true } : carpeta));
      try {
        const { data: entradas, error: listaError } = await supabase.storage.from(BUCKET).list(carpetaActual.ruta, {
          limit: 1000, sortBy: { column: "name", order: "asc" },
        });
        if (listaError) throw listaError;
        // Los artefactos de Aurum se conservan en Storage, pero no se exponen
        // en el listado de carpetas compartidas ni como documentos descargables.
        const archivos = (entradas ?? [])
          .filter((e) => Boolean(e.name) && !e.name.endsWith("/") && Boolean(e.id || e.metadata || e.name.includes(".")))
          .filter((e) => !["01-modelo.glb", "02-configuracion-aurum.json"].includes(e.name.toLowerCase()))
          .map((e): ArchivoNube => ({
            nombre: e.name, ruta: `${carpetaActual.ruta}/${e.name}`, carpeta: carpetaActual.nombre,
            bytes: Number(e.metadata?.size ?? 0), actualizado: e.updated_at ?? e.created_at ?? null,
            categoria: clasificarArchivo(nombreVisible(e.name)), origen: "supabase",
          }));
        const primeraFoto = archivos.find((archivo) => archivo.categoria === "fotos");
        let portada: string | null = null;
        if (primeraFoto) {
          const { data: urlFirmada, error: errorFirma } = await supabase.storage.from(BUCKET).createSignedUrl(primeraFoto.ruta, 60);
          if (errorFirma) console.warn("[Mi Nube] No se pudo firmar la portada compartida.", errorFirma.message);
          else portada = urlFirmada?.signedUrl ?? null;
        }
        setCarpetasRecibidas((actuales) => actuales.map((carpeta) => carpeta.id === id
          ? { ...carpeta, archivos, portada, archivosCargados: true, cargandoArchivos: false }
          : carpeta));
        return archivos;
      } catch (cause) {
        setCarpetasRecibidas((actuales) => actuales.map((carpeta) => carpeta.id === id ? { ...carpeta, cargandoArchivos: false } : carpeta));
        toast.error(cause instanceof Error ? cause.message : "No se pudieron cargar los archivos de esta carpeta compartida.");
        return [];
      } finally {
        cargasArchivosCompartidos.current.delete(id);
      }
    });
    cargasArchivosCompartidos.current.set(id, carga);
    return carga;
  }, [carpetasRecibidas]);

  const prepararFichaCompartida = async (recibida: CarpetaRecibida) => {
    let carpeta = recibida;
    if (!carpeta.archivosCargados) {
      const archivos = await cargarArchivosCarpetaRecibida(recibida.id);
      if (archivos.length === 0) return;
      carpeta = { ...recibida, archivos, archivosCargados: true };
    }
    await anadirImagenAlCatalogo(
      carpeta.archivos.find((item) => item.categoria === "fotos") ?? null,
      { nombre: carpeta.nombre, archivos: carpeta.archivos },
      carpeta.archivos.find((item) => item.categoria === "documentos" && item.nombre.toLowerCase().endsWith(".pdf")) ?? null,
    );
  };



  const abrirCompartirEcosistema = async (proyecto: { nombre: string }) => {
    setProyectoParaCompartir(proyecto.nombre);
    setTallerDestino("");
    if (!participanteId || !usuarioId) {
      toast.error("No se encontró tu taller activo.");
      return;
    }
    // Reutilizar el directorio solo para el taller que lo cargó. Si cambia
    // el taller activo, volver a consultar para no mostrar destinatarios obsoletos.
    if (talleresDisponiblesParaParticipante === participanteId) return;
    if (cargaTalleresEnCurso.current) return;
    cargaTalleresEnCurso.current = true;
    setCargandoTalleres(true);
    const participanteConsultado = participanteId;
    try {
      const { data, error } = await supabase.rpc("listar_talleres_para_compartir_mi_nube");
      if (error) throw error;
      if (participanteId === participanteConsultado) {
        setTalleresDisponibles(data ?? []);
        setTalleresDisponiblesParaParticipante(participanteConsultado);
      }
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudo cargar el directorio de talleres.");
    } finally {
      cargaTalleresEnCurso.current = false;
      setCargandoTalleres(false);
    }
  };

  const confirmarCompartirEcosistema = async () => {
    if (!participanteId || !usuarioId || !proyectoParaCompartir || !tallerDestino) {
      toast.error("Selecciona el taller que recibirá la carpeta."); return;
    }
    setGuardandoComparticion(true);
    try {
      const { error } = await supabase.from("mi_nube_compartidas").upsert({
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
    const { error } = await supabase.from("mi_nube_compartidas").update({ revoked_at: new Date().toISOString() }).eq("id", share.id);
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
    const contieneVideos = seleccionados.some((archivo) => clasificarArchivo(archivo.name) === "videos");
    if (contieneVideos && nasPausado) {
      toast.error("La conexión con el NAS está pausada. Reconéctala desde Mi NAS antes de subir vídeos. Los demás archivos no dependen del NAS.");
      return;
    }
    if (contieneVideos) {
      setMensajeNas("Comprobando el NAS antes de subir vídeos…");
      const estadoActual = await comprobarNas();
      if (estadoActual !== "online") {
        toast.error(`No se inició la subida de vídeos porque el NAS no está disponible (${estadoActual}). Los archivos que usan Supabase siguen siendo independientes.`);
        return;
      }
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
    setErrorSubida(null);
    let completados = 0;
    let almacenamientoEnProceso: "nas" | "supabase" = "supabase";
    try {
      for (const file of seleccionados) {
        const nombre = nombreSeguro(file.name);
        if (!nombre) throw new Error(`El nombre de “${file.name}” no es válido.`);
        const ruta = `${participanteId}/${usuarioId}/${carpetaSegura}/${Date.now()}-${nombre}`;
        if (clasificarArchivo(nombre) === "videos") {
          almacenamientoEnProceso = "nas";
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
          if (!finalized?.ok || finalized.verified !== true || finalized.folder !== carpetaSegura || finalized.name !== filename || Number(finalized.bytes) !== file.size) {
            throw new Error("Nextcloud no confirmó la existencia y el tamaño exacto del vídeo.");
          }
          // La función verifica la ruta final mediante PROPFIND y confirma bytes exactos.
          // Así evitamos repetir hasta cinco listados completos de todas las carpetas del NAS.
          setEstadoSubida(`Vídeo verificado en el NAS: ${nombre}`);
        } else {
          almacenamientoEnProceso = "supabase";
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
      const codigoCuota = /23514/.test(mensaje);
      const mensajeVisible = codigoCuota
        ? "No se pudo completar la subida porque tu plan pudo alcanzar el límite de almacenamiento o de proyectos de Mi Nube. Revisa el espacio disponible o conoce un plan con mayor capacidad."
        : mensaje;
      if (almacenamientoEnProceso === "nas") {
        setErrorListadoNas(mensaje);
        console.warn("[Mi Nube] Falló una operación de subida al NAS.", mensaje);
      } else {
        setErrorSubida(mensajeVisible);
        console.warn("[Mi Nube] Falló una subida a Supabase Storage.", mensaje);
      }
      if (almacenamientoEnProceso === "supabase" && codigoCuota) {
        toast.warning("Tu plan puede haber alcanzado el límite de Mi Nube. Revisa las opciones de almacenamiento.");
      } else {
        toast.error(mensaje);
      }
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
  const guardarNombreCarpeta = async (proyecto: { nombre: string; archivos: ArchivoNube[] }) => {
    if (!participanteId || !usuarioId) { toast.error("No se encontró tu taller activo."); return; }
    const nombreNuevo = nuevoNombreCarpeta.trim().normalize("NFKC").replace(/[/\\]/g, "-").split("").filter((c) => c.charCodeAt(0) > 31).join("").replace(/\s+/g, " ").slice(0, 60);
    if (!nombreNuevo) { toast.error("Escribe un nombre para la carpeta."); return; }
    if (nombreNuevo === proyecto.nombre) { setProyectoRenombrando(null); return; }
    if (archivos.some((archivo) => archivo.carpeta === nombreNuevo)) { toast.error("Ya existe una carpeta con ese nombre."); return; }
    if (subiendo || compartiendo !== null || guardandoNombreCarpeta) { toast.error("Espera a que termine la operación en curso."); return; }

    setGuardandoNombreCarpeta(true);
    const raizAnterior = `${participanteId}/${usuarioId}/${proyecto.nombre}`;
    const raizNueva = `${participanteId}/${usuarioId}/${nombreNuevo}`;
    const movidos: Array<{ origen: string; destino: string }> = [];
    try {
      // Renombrado aislado de Mi Nube: solo Supabase Storage y sus permisos.
      // Nextcloud/NAS no se consulta, modifica ni revierte desde esta operación.

      // Verificar colisiones en Storage antes de mover cualquier archivo.
      const { data: carpetasRaiz, error: errorRaiz } = await supabase.storage.from(BUCKET).list(`${participanteId}/${usuarioId}`, { limit: 1000 });
      if (errorRaiz) throw new Error("No se pudo verificar el nombre de destino en Mi Nube.");
      if ((carpetasRaiz ?? []).some((entrada) => entrada.name === nombreNuevo)) {
        throw new Error("Ya existe una carpeta con ese nombre en Mi Nube.");
      }

      const entradas: Array<{ name: string; id?: string; metadata?: Record<string, unknown> | null }> = [];
      for (let offset = 0; ; offset += 1000) {
        const { data: pagina, error: errorLista } = await supabase.storage.from(BUCKET).list(raizAnterior, {
          limit: 1000,
          offset,
          sortBy: { column: "name", order: "asc" },
        });
        if (errorLista) throw new Error("No se pudo verificar todo el contenido de la carpeta. No se cambió el nombre.");
        const items = pagina ?? [];
        entradas.push(...items);
        if (items.length < 1000) break;
      }
      // Solo mover objetos reales. Una carpeta puede contener un punto en el nombre
      // sin ser un archivo; no se usa el nombre/extensión como heurística.
      const archivosWeb = entradas.filter((entrada) => Boolean(entrada.id || entrada.metadata));
      for (const entrada of archivosWeb) {
        const origen = `${raizAnterior}/${entrada.name}`;
        const destino = `${raizNueva}/${entrada.name}`;
        const { error: moveError } = await supabase.storage.from(BUCKET).move(origen, destino);
        if (!moveError) {
          movidos.push({ origen, destino });
          continue;
        }

        // Si el origen desapareció entre el listado y el movimiento, comprobar si
        // ya quedó en destino antes de decidir si la operación debe revertirse.
        if (/object not found|not found|404/i.test(moveError.message)) {
          const [{ data: origenActual, error: errorOrigenActual }, { data: destinoActual, error: errorDestinoActual }] = await Promise.all([
            supabase.storage.from(BUCKET).list(raizAnterior, { limit: 1000 }),
            supabase.storage.from(BUCKET).list(raizNueva, { limit: 1000 }),
          ]);
          if (errorOrigenActual || errorDestinoActual) {
            throw new Error(`No se pudo verificar el estado de “${entrada.name}” tras el movimiento fallido. No vuelvas a intentarlo hasta revisar la carpeta.`);
          }
          const sigueEnOrigen = (origenActual ?? []).some((item) => item.name === entrada.name && Boolean(item.id || item.metadata));
          const yaEstaEnDestino = (destinoActual ?? []).some((item) => item.name === entrada.name && Boolean(item.id || item.metadata));
          if (!sigueEnOrigen && yaEstaEnDestino) {
            movidos.push({ origen, destino });
            continue;
          }
          if (!sigueEnOrigen && !yaEstaEnDestino) {
            throw new Error(`El archivo “${entrada.name}” ya no aparece ni en el origen ni en el destino. No se completó el renombrado; revisa la carpeta antes de volver a intentarlo.`);
          }

          // Storage puede devolver "Object not found" por una lectura desactualizada.
          // Si el objeto sigue en origen y no aparece en destino, reintentar una sola vez.
          if (sigueEnOrigen && !yaEstaEnDestino) {
            const { error: retryMoveError } = await supabase.storage.from(BUCKET).move(origen, destino);
            if (!retryMoveError) {
              movidos.push({ origen, destino });
              continue;
            }

            const [{ data: origenTrasReintento, error: errorOrigenTrasReintento }, { data: destinoTrasReintento, error: errorDestinoTrasReintento }] = await Promise.all([
              supabase.storage.from(BUCKET).list(raizAnterior, { limit: 1000 }),
              supabase.storage.from(BUCKET).list(raizNueva, { limit: 1000 }),
            ]);
            if (errorOrigenTrasReintento || errorDestinoTrasReintento) {
              throw new Error(`No se pudo confirmar el estado de “${entrada.name}” después del reintento. No vuelvas a renombrar la carpeta hasta revisar sus archivos.`);
            }
            const permaneceEnOrigen = (origenTrasReintento ?? []).some((item) => item.name === entrada.name && Boolean(item.id || item.metadata));
            const apareceEnDestino = (destinoTrasReintento ?? []).some((item) => item.name === entrada.name && Boolean(item.id || item.metadata));
            if (!permaneceEnOrigen && apareceEnDestino) {
              movidos.push({ origen, destino });
              continue;
            }
            throw new Error(`No se pudo mover “${entrada.name}”: ${retryMoveError.message}. El archivo ${permaneceEnOrigen ? "sigue en la carpeta original" : "no aparece en el origen"}${apareceEnDestino ? " y ya está en el destino" : ""}.`);
          }
        }
        throw new Error(`No se pudo mover “${entrada.name}”: ${moveError.message}`);
      }

      const { error: errorCompartidas } = await supabase.from("mi_nube_compartidas")
        .update({ carpeta: nombreNuevo })
        .eq("propietario_usuario_id", usuarioId)
        .eq("propietario_participante_id", participanteId)
        .eq("carpeta", proyecto.nombre)
        .is("revoked_at", null);
      if (errorCompartidas) throw new Error("Los archivos se movieron, pero no se pudo actualizar el nombre compartido. Se intentará revertir el cambio.");

      toast.success(`Carpeta renombrada a “${nombreNuevo}” en Mi Nube. El NAS no se consultó ni se modificó.`);
      setProyectoRenombrando(null);
      setProyectoAbierto(null);
      await Promise.all([cargarBiblioteca(), cargarCompartidas()]);
    } catch (cause) {
      let rollbackFallido = false;
      for (const movido of [...movidos].reverse()) {
        const { error } = await supabase.storage.from(BUCKET).move(movido.destino, movido.origen);
        if (error) rollbackFallido = true;
      }
      const mensaje = cause instanceof Error ? cause.message : "No se pudo renombrar la carpeta.";
      toast.error(rollbackFallido ? `${mensaje} Además, la reversión en Mi Nube quedó incompleta; revisa la carpeta antes de volver a intentarlo.` : mensaje);
      await Promise.all([cargarBiblioteca(), cargarCompartidas()]);
    } finally {
      setGuardandoNombreCarpeta(false);
    }
  };

  const eliminarProyectoCompleto = async (proyecto: { nombre: string; archivos: ArchivoNube[] }) => {
    if (!participanteId || !usuarioId) {
      toast.error("No se encontró tu taller activo.");
      return;
    }
    if (subiendo || compartiendo !== null || guardandoNombreCarpeta) {
      toast.error("Espera a que termine la operación en curso.");
      return;
    }

    try {
      const raizProyecto = `${participanteId}/${usuarioId}/${proyecto.nombre}`;
      const rutasWeb: string[] = [];
      // Enumeración completa y verificable: no usar extensiones para distinguir
      // archivos de carpetas, porque nombres como "Proyecto.V2" pueden ser carpetas.
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
          .filter((entrada) => Boolean(entrada.id || entrada.metadata))
          .map((entrada) => `${raizProyecto}/${entrada.name}`));
        if (entradas.length < 1000) break;
      }

      // Revocar accesos compartidos antes de borrar datos. Si no se puede,
      // abortar para no dejar enlaces activos durante una eliminación parcial.
      const { error: errorRevocarComparticiones } = await supabase
        .from("mi_nube_compartidas")
        .update({ revoked_at: new Date().toISOString() })
        .eq("propietario_usuario_id", usuarioId)
        .eq("propietario_participante_id", participanteId)
        .eq("carpeta", proyecto.nombre)
        .is("revoked_at", null);
      if (errorRevocarComparticiones) {
        toast.error("No se pudo revocar el acceso compartido. Se canceló la eliminación para proteger los archivos.");
        return;
      }

      // NAS no disponible: se preserva y se informa; nunca se asume que está vacío.
      let archivosNas: Array<{ name: string; folder: string }> = [];
      let nasPendiente = estadoNas !== "online" || nasPausado;
      if (!nasPendiente) {
        try {
          const { data: nasData, error: nasError } = await supabase.functions.invoke("nextcloud-video-files", {
            body: { action: "list", participantId: participanteId },
          });
          if (nasError || nasData?.error || !Array.isArray(nasData?.files)) nasPendiente = true;
          else archivosNas = (nasData.files as Array<{ name: string; folder: string }>).filter((archivo) => archivo.folder === proyecto.nombre);
        } catch {
          nasPendiente = true;
        }
      }

      let videosNasEliminados = 0;
      if (!nasPendiente) {
        for (const archivo of archivosNas) {
          try {
            const { data, error } = await supabase.functions.invoke("nextcloud-video-files", {
              body: { action: "delete", folder: proyecto.nombre, name: archivo.name, participantId: participanteId },
            });
            if (error || data?.error || data?.ok !== true) { nasPendiente = true; break; }
            videosNasEliminados += 1;
          } catch {
            nasPendiente = true;
            break;
          }
        }
      }

      let webEliminados = 0;
      if (rutasWeb.length > 0) {
        for (let i = 0; i < rutasWeb.length; i += 100) {
          const lote = rutasWeb.slice(i, i + 100);
          const { error } = await supabase.storage.from(BUCKET).remove(lote);
          if (error) {
            toast.error(`Eliminación parcial: ${webEliminados} de ${rutasWeb.length} archivos web eliminados. Los accesos compartidos ya fueron revocados. Revisa Mi Nube y vuelve a intentarlo. Detalle: ${error.message}`);
            await cargarBiblioteca();
            await cargarCompartidas();
            return;
          }
          webEliminados += lote.length;
        }
      }

      setProyectoAbierto(null);
      setModoEdicion(null);
      await cargarBiblioteca();
      await cargarCompartidas();
      if (nasPendiente) {
        toast.warning(`Proyecto eliminado de Mi Nube: ${webEliminados} archivo(s) web. Limpieza NAS incompleta (${videosNasEliminados}/${archivosNas.length}); revisa cuando vuelva a estar disponible.`);
      } else {
        toast.success(`Proyecto “${proyecto.nombre}” eliminado: ${webEliminados} archivo(s) web y ${videosNasEliminados} vídeo(s) NAS.`);
      }
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudo eliminar el proyecto completo.");
      await cargarBiblioteca();
      await cargarCompartidas();
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

  
  const crearEnlaceVisorArchivo = async (archivo: ArchivoNube, forzarRenovacion = false) => {
    if (archivo.origen !== "supabase" || !archivo.nombre.toLowerCase().endsWith(".glb")) {
      toast.error("El visor compartido necesita un archivo GLB guardado en Mi Nube.");
      return;
    }
    setGenerandoEnlaceVisor(archivo.ruta);
    try {
      const { data: existente, error: existenteError } = await rpcObtenerEnlaceVisor3d({ _modelo_ruta: archivo.ruta, _nombre: nombreVisible(archivo.nombre) });
      if (existenteError) throw existenteError;
      if (!forzarRenovacion && Array.isArray(existente) && existente[0]?.token && existente[0]?.expira_en && new Date(existente[0].expira_en).getTime() > Date.now()) {
        const urlExistente = new URL("/v/" + existente[0].token, window.location.origin).toString();
        setEnlacesVisorArchivo((actuales) => [...actuales.filter((enlace) => enlace.ruta !== archivo.ruta), { ruta: archivo.ruta, url: urlExistente }]);
        try { await navigator.clipboard.writeText(urlExistente); toast.success("Enlace existente reutilizado y copiado."); }
        catch { toast.info("Enlace existente recuperado. Puedes copiarlo desde la carpeta."); }
        return;
      }
      const { data, error: createError } = await supabase.functions.invoke("crear-enlace-visor-3d", {
        body: { modelo_ruta: archivo.ruta, nombre: nombreVisible(archivo.nombre) },
      });
      if (createError || data?.ok !== true || typeof data?.token !== "string" || !/^[a-f0-9]{24}$/.test(data.token)) {
        const mensajeServidor = typeof data?.error === "string" ? data.error : "";
        const detalleServidor = typeof data?.detail === "string" ? data.detail : "";
        const codigoServidor = typeof data?.code === "string" ? data.code : "";
        const mensajeTransporte = createError?.message || "";
        const mensaje = [mensajeServidor || mensajeTransporte || "La función no devolvió un enlace válido.", detalleServidor, codigoServidor].filter(Boolean).join(" · ");
        throw new Error(mensaje);
      }
      const token = data.token;
      const url = new URL("/v/" + token, window.location.origin).toString();
      setEnlacesVisorArchivo((actuales) => [...actuales.filter((enlace) => enlace.ruta !== archivo.ruta), { ruta: archivo.ruta, url }]);
      try { await navigator.clipboard.writeText(url); toast.success("Enlace protegido del visor copiado. Vence en 3 días."); }
      catch { toast.info("Enlace preparado. Puedes copiarlo desde la carpeta."); }
    } catch (cause) {
      // Los errores PostgREST suelen ser objetos planos, no instancias de Error.
      // Leer sus campos evita ocultar la causa real detrás de un mensaje genérico.
      const detalle = cause && typeof cause === "object"
        ? cause as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown }
        : null;
      const codigo = typeof detalle?.code === "string" ? detalle.code : "";
      const mensaje = cause instanceof Error
        ? cause.message
        : typeof detalle?.message === "string"
          ? detalle.message
          : "Error desconocido al preparar el enlace."; 
      if (/failed to send a request|failed to fetch|edge function.*(not found|unavailable)|fetch failed/i.test(mensaje)) {
        toast.error("La función crear-enlace-visor-3d no respondió. Lovable debe desplegar la función actualizada y verificar su configuración.");
      } else if (codigo === "PGRST202" || /could not find the function|function .* does not exist/i.test(mensaje)) {
        toast.error("Falta aplicar en Lovable la migración SQL de los enlaces del visor 3D.");
      } else {
        const contexto = [codigo, typeof detalle?.details === "string" ? detalle.details : "", typeof detalle?.hint === "string" ? detalle.hint : ""]
          .filter(Boolean)
          .join(" · ");
        toast.error(`No se pudo crear el enlace del visor: ${mensaje}${contexto ? ` (${contexto})` : ""}`);
      }
      console.error("[Mi Nube] Falló la creación del enlace del visor 3D.", cause);
    }
    finally { setGenerandoEnlaceVisor(null); }
  };

  const revocarEnlaceVisorArchivo = async (archivo: ArchivoNube) => {
    const enlace = enlacesVisorArchivo.find((item) => item.ruta === archivo.ruta);
    if (!enlace) return;
    if (!window.confirm("¿Revocar este enlace público? Dejará de funcionar inmediatamente y tendrás que crear uno nuevo para volver a compartirlo.")) return;
    let token = "";
    try { token = new URL(enlace.url).pathname.split("/").filter(Boolean).pop() ?? ""; }
    catch { toast.error("No se pudo identificar el enlace que deseas revocar."); return; }
    if (!/^[a-f0-9]{24}$/.test(token)) { toast.error("El identificador del enlace no es válido."); return; }

    setRevocandoEnlaceVisor(archivo.ruta);
    try {
      const { data, error } = await supabase.functions.invoke("revocar-enlace-visor-3d", { body: { token } });
      if (error || data?.ok !== true) throw new Error(data?.error || error?.message || "No se pudo revocar el enlace.");
      setEnlacesVisorArchivo((actuales) => actuales.filter((item) => item.ruta !== archivo.ruta));
      toast.success("Enlace revocado. El acceso al GLB queda invalidado.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudo revocar el enlace del visor.");
    } finally {
      setRevocandoEnlaceVisor(null);
    }
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
    const { data, error: errorUrl } = await supabase.storage.from(BUCKET).createSignedUrl(archivo.ruta, 60, {
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
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3" aria-label="Estado rápido de Mi Nube">
          <p className="text-sm font-medium text-muted-foreground">Archivos privados del taller</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
              <HardDrive className="size-3.5 text-gold" /> Nube privada
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground" aria-label={`Estado del NAS: ${nasPausado ? "Conexión pausada desde Mi Nube" : mensajeNas}`}>
              <span className={`size-2 rounded-full ${nasPausado ? "bg-amber-500" : estadoNas === "online" ? "bg-emerald-500" : estadoNas === "offline" || estadoNas === "misconfigured" ? "bg-red-500" : "bg-amber-500"}`} aria-hidden="true" />
              {nasPausado ? "NAS pausado" : estadoNas === "online" ? "NAS conectado" : estadoNas === "checking" ? "NAS comprobando…" : estadoNas === "misconfigured" ? "Revisar NAS" : estadoNas === "not_configured" ? "NAS sin configurar" : "NAS desconectado"}
            </span>
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
            }} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-gold/50 disabled:opacity-50">
              <Power className="size-3.5" /> {nasPausado ? "Reconectar" : estadoNas === "online" ? "Pausar NAS" : "Reintentar NAS"}
            </button>
          </div>
        </section>

        <details className="rounded-xl border border-border bg-card px-4 py-3" aria-label="Verificación de almacenamiento">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
            <span className="flex items-center gap-2"><HardDrive className="size-4 text-gold" /> Estado del almacenamiento</span>
            <span className="text-xs text-muted-foreground">Ver detalles</span>
          </summary>
          <div className="pt-3">
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
              <button
                type="button"
                disabled={subiendo || nasPausado}
                onClick={() => void (async () => {
                  const estado = await comprobarNas();
                  if (estado === "online" && !nasPausado) await cargarArchivosNas(true);
                })()}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-semibold hover:border-gold/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className="size-3" /> Comprobar NAS
              </button>
            </div>
          </div>
          {error && <p className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"><AlertCircle className="mt-0.5 size-3.5 shrink-0" /> No se pudo completar la comprobación: {error}</p>}
          <div className="mt-4 rounded-xl border border-gold/25 bg-gold/[0.045] p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><h3 className="text-sm font-semibold">Cuota de Mi Nube · {cuotaMiNube?.plan ? cuotaMiNube.plan.charAt(0).toUpperCase() + cuotaMiNube.plan.slice(1) : "Plan comercial"}</h3><p className="mt-1 text-xs text-muted-foreground">Uso listado de esta cuenta en Supabase Storage; otros usuarios del taller podrían consumir cuota. Los vídeos del NAS no consumen esta cuota.</p></div>
              {cuotaMiNube && <span className="rounded-full border border-gold/25 bg-background px-2.5 py-1 text-[10px] font-semibold">{cuotaMiNube.almacenamientoMiB === -1 ? "Sin límite de espacio" : `${etiquetaTamano(cuotaMiNube.almacenamientoMiB * 1024 * 1024)} disponibles en plan`}</span>}
            </div>
            {errorCuotaMiNube ? <p className="mt-3 text-xs text-destructive">No se pudo leer la cuota: {errorCuotaMiNube}</p> : !cuotaMiNube || bytesSupabaseUsados === null || carpetasSupabaseUsadas === null ? <p className="mt-3 text-xs text-muted-foreground">Calculando uso y límites…</p> : <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-background p-3"><div className="flex items-center justify-between gap-2 text-xs"><span className="font-medium">Espacio utilizado</span><span className="font-semibold tabular-nums">{etiquetaTamano(bytesSupabaseUsados)}{cuotaMiNube.almacenamientoMiB === -1 ? " · ilimitado" : ` / ${etiquetaTamano(cuotaMiNube.almacenamientoMiB * 1024 * 1024)}`}</span></div>{cuotaMiNube.almacenamientoMiB !== -1 && <><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${bytesSupabaseUsados / Math.max(1, cuotaMiNube.almacenamientoMiB * 1024 * 1024) >= 0.9 ? "bg-red-500" : bytesSupabaseUsados / Math.max(1, cuotaMiNube.almacenamientoMiB * 1024 * 1024) >= 0.75 ? "bg-amber-500" : "bg-gold"}`} style={{ width: `${Math.min(100, Math.max(0, bytesSupabaseUsados / Math.max(1, cuotaMiNube.almacenamientoMiB * 1024 * 1024) * 100))}%` }} /></div><p className="mt-1.5 text-[10px] text-muted-foreground">Restante: {etiquetaTamano(Math.max(0, cuotaMiNube.almacenamientoMiB * 1024 * 1024 - bytesSupabaseUsados))}</p></>}</div>
              <div className="rounded-lg border border-border bg-background p-3"><div className="flex items-center justify-between gap-2 text-xs"><span className="font-medium">Carpetas de proyectos</span><span className="font-semibold tabular-nums">{carpetasSupabaseUsadas}{cuotaMiNube.carpetasMax === -1 ? " · ilimitadas" : ` / ${cuotaMiNube.carpetasMax}`}</span></div>{cuotaMiNube.carpetasMax !== -1 && <><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${carpetasSupabaseUsadas >= cuotaMiNube.carpetasMax ? "bg-red-500" : carpetasSupabaseUsadas / Math.max(1, cuotaMiNube.carpetasMax) >= 0.75 ? "bg-amber-500" : "bg-gold"}`} style={{ width: `${Math.min(100, Math.max(0, carpetasSupabaseUsadas / Math.max(1, cuotaMiNube.carpetasMax) * 100))}%` }} /></div><p className="mt-1.5 text-[10px] text-muted-foreground">Restantes: {Math.max(0, cuotaMiNube.carpetasMax - carpetasSupabaseUsadas)}</p></>}</div>
            </div>}
            {error && <p className="mt-2 text-[10px] text-amber-700 dark:text-amber-400">Uso parcial: algunas carpetas no pudieron consultarse; el total puede ser menor al real.</p>}
          </div>
          </div>
        </details>

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

        <nav className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-2" aria-label="Categorías de archivos">
          <button type="button" onClick={() => setSeccionActiva("todos")} aria-pressed={seccionActiva === "todos"} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${seccionActiva === "todos" ? "bg-gold text-black" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            <Folder className="size-4" /> Todos
            <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px]">{archivos.length}</span>
          </button>
          {secciones.map(({ id, titulo, Icono }) => {
            const activa = seccionActiva === id;
            const cantidad = archivos.filter((archivo) => archivo.categoria === id).length;
            return (
              <button key={id} type="button" onClick={() => setSeccionActiva(activa ? "todos" : id)} aria-pressed={activa}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${activa ? "bg-gold text-black" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <Icono className="size-4" /> {titulo === "Fotos e imágenes" ? "Fotos" : titulo === "Biblioteca 3D" ? "Biblioteca 3D" : titulo}
                <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px]">{cantidad}</span>
              </button>
            );
          })}
          <button type="button" onClick={() => document.getElementById("mi-nube-subir-proyecto")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:border-gold/50">
            <UploadCloud className="size-4" /> Subir proyecto
          </button>
        </nav>

        <section id="mi-nube-subir-proyecto" className="scroll-mt-24 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
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
                  <span className="mt-2 text-sm font-semibold">{seleccionados.length > 0 ? "Agregar más archivos al proyecto" : "Elegir archivos del proyecto"}</span>
                  <span className="mt-1 text-xs text-muted-foreground">Añade archivos en varias tandas sin perder la selección anterior · máximo 30</span>
                  <input
                    id="mi-nube-archivos"
                    type="file"
                    multiple
                    className="sr-only"
                    disabled={subiendo || seleccionados.length >= MAX_FILES_PER_BATCH}
                    onChange={(event) => {
                      const filesNuevos = Array.from(event.currentTarget.files ?? []);
                      event.currentTarget.value = "";
                      if (filesNuevos.length === 0) return;

                      const existentes = new Set(seleccionados.map((file) => `${file.name}::${file.size}::${file.lastModified}`));
                      const unicos = filesNuevos.filter((file) => {
                        const clave = `${file.name}::${file.size}::${file.lastModified}`;
                        if (existentes.has(clave)) return false;
                        existentes.add(clave);
                        return true;
                      });
                      const disponibles = MAX_FILES_PER_BATCH - seleccionados.length;
                      const agregados = unicos.slice(0, disponibles);
                      const combinados = [...seleccionados, ...agregados];

                      if (unicos.length === 0) {
                        toast.info("Los archivos seleccionados ya están en la lista.");
                        return;
                      }
                      if (unicos.length > disponibles) {
                        toast.warning(`Solo se agregaron ${disponibles} archivo(s): el límite del proyecto es ${MAX_FILES_PER_BATCH}.`);
                      }
                      setSeleccionados(combinados);
                      if (seleccionados.length === 0 && !carpeta.trim() && combinados.length > 0) {
                        setCarpeta(sugerirNombreProyecto(combinados));
                      }
                    }}
                  />
                </label>
                {seleccionados.length > 0 && (
                  <div className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold">{seleccionados.length} de {MAX_FILES_PER_BATCH} archivos seleccionados</p><span className="text-[11px] text-muted-foreground">{MAX_FILES_PER_BATCH - seleccionados.length} disponibles</span></div>
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
          {errorSubida && (/23514/.test(errorSubida) || /límite de almacenamiento o de proyectos/i.test(errorSubida)) ? (
            <div role="alert" className="mt-4 flex flex-col gap-3 rounded-2xl border border-gold/35 bg-gold/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold"><HardDrive className="size-5" /></span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Tu espacio de Mi Nube podría estar completo</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{errorSubida}</p>
                </div>
              </div>
              <a href="/#planes" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gold px-4 py-2.5 text-xs font-semibold text-black transition hover:brightness-105">Ver planes y ampliar espacio</a>
            </div>
          ) : errorSubida ? (
            <p role="alert" className="mt-4 rounded-xl border border-danger/25 bg-danger-soft p-3 text-xs text-danger">{errorSubida}</p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">Mis archivos</h3>
              <p className="mt-1 text-sm text-muted-foreground">{archivos.length} archivo(s) · {carpetas.length} carpeta(s)</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/marketplace-mis-compras" className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted">
                <HardDrive className="size-4" /> Mis compras
              </Link>
              <button type="button" onClick={() => { const siguiente = !mostrarMisVentas; setMostrarMisVentas(siguiente); if (siguiente) void cargarMisVentas(); }} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted">
                <Store className="size-4" /> Mis ventas
              </button>
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

          {mostrarMisVentas ? (
            <section className="mt-5 rounded-xl border border-gold/25 bg-background p-4 sm:p-5" aria-label="Mis ventas">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold">Mis ventas</h4>
                  <p className="mt-1 text-sm text-muted-foreground">Tus publicaciones y borradores de la Tienda 3D.</p>
                  <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar mis ventas">
                    {([
                      { id: "todas", label: "Todas" },
                      { id: "borrador", label: "Borradores" },
                      { id: "publicado", label: "Publicadas" },
                      { id: "pausado", label: "Pausadas" },
                    ] as const).map((filtro) => <button key={filtro.id} type="button" onClick={() => setFiltroMisVentas(filtro.id)} aria-pressed={filtroMisVentas === filtro.id} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${filtroMisVentas === filtro.id ? "border-gold bg-gold/10 text-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}>{filtro.label}</button>)}
                  </div>
                </div>
                <button type="button" onClick={() => void cargarMisVentas()} disabled={cargandoMisVentas} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium disabled:opacity-50"><RefreshCw className={`size-3.5 ${cargandoMisVentas ? "animate-spin" : ""}`} /> Actualizar</button>
              </div>
              {cargandoMisVentas ? <p className="py-5 text-sm text-muted-foreground">Cargando tus publicaciones…</p> : null}
              {errorMisVentas ? <p role="alert" className="mt-3 rounded-lg border border-danger/25 bg-danger-soft p-3 text-sm text-danger">No se pudieron cargar tus ventas: {errorMisVentas}</p> : null}
              {!cargandoMisVentas && !errorMisVentas && misVentas.length === 0 ? <div className="py-6 text-center"><Store className="mx-auto size-7 text-muted-foreground" /><p className="mt-2 text-sm font-medium">Todavía no tienes publicaciones</p><p className="mt-1 text-xs text-muted-foreground">Los borradores que guardes aparecerán aquí.</p><Link to="/marketplace-publicar" className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Crear publicación</Link></div> : null}
              <div className="mt-3 space-y-2">
                {(filtroMisVentas === "todas" ? misVentas : misVentas.filter((venta) => venta.estado === filtroMisVentas)).map((venta) => <article key={venta.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      {ventaEnEdicion?.id === venta.id ? (
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
                          <label className="space-y-1 text-xs text-muted-foreground">Nombre de publicación<input value={ventaEnEdicion.titulo} maxLength={140} onChange={(event) => setVentaEnEdicion((actual) => actual ? { ...actual, titulo: event.target.value } : actual)} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground" /></label>
                          <label className="space-y-1 text-xs text-muted-foreground">Precio ({venta.moneda})<input type="number" min="0.01" step="0.01" value={ventaEnEdicion.precio} onChange={(event) => setVentaEnEdicion((actual) => actual ? { ...actual, precio: event.target.value } : actual)} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground" /></label>
                          <div className="flex items-end gap-2"><button type="button" disabled={guardandoVenta} onClick={() => void guardarEdicionVenta()} className="h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50">Guardar</button><button type="button" disabled={guardandoVenta} onClick={() => setVentaEnEdicion(null)} className="h-9 rounded-lg border border-border px-3 text-xs">Cancelar</button></div>
                        </div>
                      ) : (
                        <>
                          <p className="break-words text-sm font-semibold">{venta.titulo}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{venta.formatos?.join(" · ") || venta.nombre_archivo} · {new Date(venta.created_at).toLocaleDateString("es-PE")}</p>
                        </>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold">{new Intl.NumberFormat("es-PE", { style: "currency", currency: venta.moneda || "PEN" }).format(Number(venta.precio))}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${venta.estado === "publicado" ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{venta.estado === "borrador" ? "Borrador" : venta.estado === "publicado" ? "Publicado" : venta.estado === "pausado" ? "Pausado" : venta.estado}</span>
                    </div>
                  </div>
                  {ventaEnEdicion?.id !== venta.id ? <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={guardandoVenta} onClick={() => setVentaEnEdicion({ id: venta.id, titulo: venta.titulo, precio: String(venta.precio) })} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"><Pencil className="size-3.5" /> Editar</button>
                    {venta.estado === "borrador" || venta.estado === "pausado" ? <button type="button" disabled={guardandoVenta} onClick={() => void cambiarEstadoVenta(venta, "publicado")} className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold hover:bg-gold/15 disabled:opacity-50"><Store className="size-3.5" /> Publicar</button> : null}
                    {venta.estado === "publicado" ? <button type="button" disabled={guardandoVenta} onClick={() => void cambiarEstadoVenta(venta, "pausado")} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"><Power className="size-3.5" /> Pausar</button> : null}
                    {!venta.imagen_portada_url ? <button type="button" disabled={guardandoVenta} onClick={() => void regenerarPortadaVenta(venta)} className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold hover:bg-gold/15 disabled:opacity-50"><ImageIcon className="size-3.5" /> Recuperar portada</button> : null}
                    {venta.estado === "borrador" ? <button type="button" disabled={guardandoVenta} onClick={() => void eliminarBorradorVenta(venta)} className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50"><X className="size-3.5" /> Eliminar borrador</button> : null}
                  </div> : null}
                </article>)}
              </div>
            </section>
          ) : null}

          {proyectos.length > 0 && (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
              {proyectos.map((proyecto) => (
                <FichaProyecto
                  key={proyecto.nombre}
                  portada={proyecto.portada}
                  nombre={proyecto.nombre}
                  superpuesto={proyectoAbierto === proyecto.nombre}
                  accionesPortada={
                    <>
                      <button type="button" title="Editar nombre de carpeta" aria-label={`Editar nombre de carpeta ${proyecto.nombre}`} onClick={() => { setNuevoNombreCarpeta(proyecto.nombre); setProyectoRenombrando(proyecto.nombre); }} disabled={guardandoNombreCarpeta || subiendo || compartiendo !== null} className="grid size-9 place-items-center rounded-full border border-white/80 bg-white/90 text-gray-800 shadow-sm transition hover:bg-white disabled:opacity-50"><Pencil className="size-4" /></button>
                      <button type="button" title="Compartir proyecto" aria-label={`Compartir proyecto ${proyecto.nombre}`} disabled={compartiendo !== null} onClick={async () => {
                        const glbVisible = proyecto.archivos.some((archivo) => archivo.origen === "supabase" && archivo.nombre.toLowerCase().endsWith(".glb"));
                        if (glbVisible) { setOpcionesCompartir(proyecto); return; }
                        const original3dm = proyecto.archivos.find((archivo) => archivo.origen === "supabase" && archivo.nombre.toLowerCase().endsWith(".3dm"));
                        if (!original3dm) { setOpcionesCompartir(proyecto); return; }
                        try {
                          const rutaCarpeta = original3dm.ruta.slice(0, original3dm.ruta.lastIndexOf("/"));
                          const { data: internos, error: errorLista } = await supabase.storage.from(BUCKET).list(rutaCarpeta, { limit: 1000 });
                          if (errorLista) throw errorLista;
                          const glbInterno = (internos ?? []).find((entrada) => entrada.name === "01-modelo.glb");
                          const archivos = glbInterno
                            ? [...proyecto.archivos, { nombre: glbInterno.name, ruta: `${rutaCarpeta}/${glbInterno.name}`, carpeta: original3dm.carpeta, bytes: Number(glbInterno.metadata?.size ?? 0), actualizado: glbInterno.updated_at ?? null, categoria: "modelos-3d" as Categoria, origen: "supabase" as const }]
                            : proyecto.archivos;
                          setOpcionesCompartir({ ...proyecto, archivos });
                        } catch (cause) {
                          toast.error(cause instanceof Error ? cause.message : "No se pudo comprobar el GLB guardado.");
                          setOpcionesCompartir(proyecto);
                        }
                      }} className="grid size-9 place-items-center rounded-full border border-white/80 bg-white/90 text-gray-800 shadow-sm transition hover:bg-white disabled:opacity-50"><Share2 className="size-4" /></button>
                      <button type="button" title="Eliminar proyecto" aria-label={`Eliminar proyecto ${proyecto.nombre}`} onClick={() => setProyectoPendienteEliminar(proyecto)} disabled={subiendo || compartiendo !== null} className="grid size-9 place-items-center rounded-full border border-white/80 bg-white/90 text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-50"><X className="size-4" /></button>
                    </>
                  }
                >
                  <div className="space-y-2.5 p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {proyectoRenombrando === proyecto.nombre ? (
                          <form onSubmit={(event) => { event.preventDefault(); void guardarNombreCarpeta(proyecto); }} className="space-y-2">
                            <label className="sr-only" htmlFor={`nombre-carpeta-${proyecto.nombre}`}>Nuevo nombre de carpeta</label>
                            <input id={`nombre-carpeta-${proyecto.nombre}`} autoFocus value={nuevoNombreCarpeta} onChange={(event) => setNuevoNombreCarpeta(event.target.value)} maxLength={60} disabled={guardandoNombreCarpeta} className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold" />
                            <div className="flex gap-2">
                              <button type="submit" disabled={guardandoNombreCarpeta} className="rounded-lg border border-gold/50 bg-gold/10 px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-50">{guardandoNombreCarpeta ? "Guardando…" : "Guardar nombre"}</button>
                              <button type="button" disabled={guardandoNombreCarpeta} onClick={() => setProyectoRenombrando(null)} className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium disabled:opacity-50">Cancelar</button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <h4 className="truncate text-[14px] font-semibold tracking-[-0.015em]">{proyecto.nombre}</h4>
                            <p className="mt-1 text-[11px] text-muted-foreground">{proyecto.archivos.length} archivos <span className="px-1 text-border">·</span> proyecto</p>
                          </>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full border border-border/80 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Mi nube</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {proyecto.archivos.some(a => a.categoria === "fotos") && <span className="rounded-md bg-muted/70 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">Imagen</span>}
                      {proyecto.tiene3dm && <span className="rounded-md bg-muted/70 px-2 py-1 text-[10px] font-medium text-muted-foreground">3DM</span>}
                      {proyecto.tieneStl && <span className="rounded-md bg-muted/70 px-2 py-1 text-[10px] font-medium text-muted-foreground">STL</span>}
                      {proyecto.tienePdf && <span className="rounded-md bg-muted/70 px-2 py-1 text-[10px] font-medium text-muted-foreground">PDF</span>}
                    </div>
                    <button type="button" onClick={async () => {
                      const original3dm = proyecto.archivos.find((item) => item.origen === "supabase" && item.nombre.toLowerCase().endsWith(".3dm"));
                      if (!original3dm) { toast.error("Este proyecto no contiene un 3DM original disponible para Aurum Render."); return; }
                      try {
                        const { data, error: urlError } = await supabase.storage.from(BUCKET).createSignedUrl(original3dm.ruta, 600);
                        if (urlError || !data?.signedUrl) throw urlError ?? new Error("No se pudo preparar el 3DM para Aurum Render.");
                        const rutaCarpeta = original3dm.ruta.slice(0, original3dm.ruta.lastIndexOf("/"));
                        const { data: glbData } = await supabase.storage.from(BUCKET).createSignedUrl(`${rutaCarpeta}/01-modelo.glb`, 600);
                        const { data: configuracionData } = await supabase.storage.from(BUCKET).createSignedUrl(`${rutaCarpeta}/02-configuracion-aurum.json`, 600);
                        sessionStorage.setItem("aurum-render-archivo-pendiente", JSON.stringify({
                          url: data.signedUrl,
                          glbUrl: glbData?.signedUrl ?? null,
                          configuracionUrl: configuracionData?.signedUrl ?? null,
                          nombre: nombreVisible(original3dm.nombre),
                          rutaArchivoOriginal: original3dm.ruta,
                          rutaCarpeta,
                          archivoTamano: original3dm.bytes,
                        }));
                        window.location.assign("/aurum-render?desde-mi-nube=1");
                      } catch (cause) {
                        toast.error(cause instanceof Error ? cause.message : "No se pudo abrir el proyecto en Aurum Render.");
                      }
                    }} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#c5a15d]/60 bg-[#c5a15d]/[0.10] px-3 py-2 text-xs font-semibold leading-tight text-foreground transition-colors hover:bg-[#c5a15d]/[0.17]">
                      Abrir en Aurum Render
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
                    {proyectoAbierto === proyecto.nombre && typeof document !== "undefined" && createPortal((
                      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#171612]/55 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProyectoAbierto(null); }}><section className="flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gold/35 bg-card shadow-[0_24px_80px_rgba(20,18,12,0.32)]" role="dialog" aria-modal="true" aria-label={"Archivos del proyecto " + proyecto.nombre}>
                        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5">
                          <div className="flex min-w-0 items-center gap-2"><Folder className="size-4 shrink-0 text-gold" /><div className="min-w-0"><h4 className="truncate text-sm font-semibold">{proyecto.nombre}</h4><p className="text-[10px] text-muted-foreground">{proyecto.archivos.length} archivos</p></div></div>
                          <button type="button" aria-label={`Cerrar archivos de ${proyecto.nombre}`} title="Cerrar ficha" onClick={() => setProyectoAbierto(null)} className="grid size-7 shrink-0 place-items-center rounded-lg border border-border hover:bg-muted"><X className="size-4" /></button>
                        </div>
                        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                      <button type="button" onClick={() => { setModoEdicion((actual) => actual === proyecto.nombre ? null : proyecto.nombre); setProyectoAbierto(proyecto.nombre); setCarpetaDestinoEdicion(null); setSeleccionados([]); }} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:border-gold/50">
                        <Pencil className="size-3.5" /> {modoEdicion === proyecto.nombre ? "Terminar edición" : "Editar archivos de la carpeta"}
                      </button>
                      {modoEdicion === proyecto.nombre && (
                        <div className="space-y-2 rounded-xl border border-gold/25 bg-gold/5 p-3">
                          <p className="text-[11px] text-muted-foreground">Puedes eliminar un archivo concreto desde su botón «Eliminar archivo». Tras confirmar, se borra ese archivo; los demás de la carpeta se conservan.</p>
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
                              <div className="min-w-0 flex-1"><p className="text-sm font-semibold leading-5">{etiquetaTipoArchivo(archivo.nombre)}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{etiquetaTamano(archivo.bytes)}</p><span className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${archivo.origen === "nas" ? "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}><CheckCircle2 className="size-3" /> {archivo.origen === "nas" ? "NAS · Nextcloud" : "Supabase Storage"}</span></div>
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
                              {archivo.nombre.toLowerCase().endsWith(".glb") && archivo.origen === "supabase" && (
                                <button type="button" disabled={generandoEnlaceVisor !== null} onClick={() => void crearEnlaceVisorArchivo(archivo)} className="rounded-lg border border-gold/40 bg-gold/5 px-2.5 py-1.5 text-[11px] font-semibold hover:bg-gold/10 disabled:opacity-50">
                                  {generandoEnlaceVisor === archivo.ruta ? "Preparando visor…" : "Crear enlace del visor 3D"}
                                </button>
                              )}
                              {enlacesVisorArchivo.some((enlace) => enlace.ruta === archivo.ruta) && (
                                <div className="mt-2 w-full space-y-2 rounded-lg border border-gold/30 bg-gold/5 p-2.5">
                                  <p className="text-[11px] font-semibold">Enlace del visor · caduca en 3 días</p>
                                  <input aria-label="Enlace público del visor 3D" readOnly value={enlacesVisorArchivo.find((enlace) => enlace.ruta === archivo.ruta)?.url ?? ""} onFocus={(event) => event.currentTarget.select()} className="w-full rounded-lg border border-[#e6e0d5] bg-[#faf9f6] px-3 py-2.5 text-[11px] text-[#48453e]" />
                                  <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(enlacesVisorArchivo.find((enlace) => enlace.ruta === archivo.ruta)?.url ?? ""); toast.success("Enlace copiado."); } catch { toast.error("No se pudo copiar automáticamente. Selecciona el enlace y cópialo."); } }} className="inline-flex items-center gap-1.5 rounded-lg border border-[#e1dbd0] bg-white px-3 py-2 text-[11px] font-semibold text-[#39372f] transition hover:border-[#c5a15d] hover:bg-[#faf6ed]"><Copy className="size-3.5" /> Copiar enlace</button>
                                    <button type="button" onClick={() => { const enlace = enlacesVisorArchivo.find((item) => item.ruta === archivo.ruta); if (enlace) window.open(enlace.url, "_blank", "noopener,noreferrer"); }} className="rounded-lg border border-[#c5a15d] bg-[#c5a15d] px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-[#ad8b4c]">Abrir visor</button>
                                    <button type="button" disabled={revocandoEnlaceVisor === archivo.ruta} onClick={() => void revocarEnlaceVisorArchivo(archivo)} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-[11px] font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50">{revocandoEnlaceVisor === archivo.ruta ? "Revocando…" : "Revocar enlace"}</button>
                                  </div>
                                </div>
                              )}
                              {archivo.nombre.toLowerCase().endsWith(".3dm") && (
                                <button type="button" onClick={async () => {
                                  if (archivo.origen !== "supabase") { toast.error("Este archivo 3DM no está disponible en el almacenamiento privado de Mi Nube."); return; }
                                  const { data, error: urlError } = await supabase.storage.from(BUCKET).createSignedUrl(archivo.ruta, 600);
                                  if (urlError || !data?.signedUrl) { toast.error("No se pudo preparar el 3DM para Aurum Render."); return; }
                                  const rutaCarpeta = archivo.ruta.slice(0, archivo.ruta.lastIndexOf("/"));
                                  const { data: glbData } = await supabase.storage.from(BUCKET).createSignedUrl(`${rutaCarpeta}/01-modelo.glb`, 600);
                                  const { data: configuracionData } = await supabase.storage.from(BUCKET).createSignedUrl(`${rutaCarpeta}/02-configuracion-aurum.json`, 600);
                                  sessionStorage.setItem("aurum-render-archivo-pendiente", JSON.stringify({ url: data.signedUrl, glbUrl: glbData?.signedUrl ?? null, configuracionUrl: configuracionData?.signedUrl ?? null, nombre: nombreVisible(archivo.nombre), rutaArchivoOriginal: archivo.ruta, rutaCarpeta, archivoTamano: archivo.bytes }));
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
                                <button type="button" onClick={() => setArchivoPendienteEliminar(archivo)} className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 px-2.5 py-1.5 text-[11px] font-semibold text-destructive hover:bg-destructive/5">
                                  Eliminar archivo
                                </button>
                              )}
                            </div>
                          </div>
                        ))}</div>
                        </div>
                      </section></div>
                    ), document.body)}

                  </div>
                </FichaProyecto>
              ))}
            </div>
          )}

        </section>
        <section className="space-y-4" aria-label="Carpetas compartidas conmigo">
          <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Colaboración</p><h3 className="mt-1 font-display text-2xl">Compartidas conmigo</h3><p className="mt-1 text-sm text-muted-foreground">Carpetas originales de otros talleres, sin duplicar archivos.</p></div><button type="button" onClick={() => void cargarCompartidas()} disabled={cargandoCompartidas} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">{cargandoCompartidas ? "Actualizando…" : "Actualizar"}</button></div>
          {cargandoCompartidas && carpetasRecibidas.length === 0 ? <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">Buscando carpetas compartidas…</p> : carpetasRecibidas.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-6 text-center"><Folder className="mx-auto size-6 text-muted-foreground" /><p className="mt-2 text-sm font-medium">Todavía no tienes carpetas compartidas</p><p className="mt-1 text-xs text-muted-foreground">Cuando otro taller comparta una carpeta contigo, aparecerá aquí.</p></div> : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
              {carpetasRecibidas.map((recibida) => {
                return <div key={recibida.id} className="relative min-w-0">
                  <FichaProyecto portada={recibida.portada} nombre={recibida.nombre} portadaModo="contain">
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate text-[14px] font-semibold tracking-[-0.015em]">{recibida.nombre}</h4>

                      </div>
                      <span className="shrink-0 rounded-full border border-border/80 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Compartida</span>
                    </div>
                    <button type="button" disabled={recibida.cargandoArchivos} onClick={() => { const abierto = proyectoAbierto === "compartida:" + recibida.id; setProyectoAbierto(abierto ? null : "compartida:" + recibida.id); if (!abierto) void cargarArchivosCarpetaRecibida(recibida.id); }} className="w-full rounded-lg border border-border/80 bg-background/70 px-3 py-2 text-[11px] font-medium text-foreground/90 transition-colors hover:border-gold/45 hover:bg-muted/40 disabled:opacity-50">{recibida.cargandoArchivos ? "Cargando archivos…" : proyectoAbierto === "compartida:" + recibida.id ? "Ocultar archivos del proyecto" : recibida.archivosCargados ? "Ver archivos del proyecto" : "Cargar y ver archivos"}</button>

                    <p className="border-t border-border pt-3 text-[10px] text-muted-foreground">Solo lectura · acceso vigente hasta que el propietario lo revoque.</p>
                  </div>
                  </FichaProyecto>
                  {proyectoAbierto === "compartida:" + recibida.id && typeof document !== "undefined" && createPortal((
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#171612]/55 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProyectoAbierto(null); }}>
            <section className="flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gold/35 bg-card shadow-[0_24px_80px_rgba(20,18,12,0.32)]" role="dialog" aria-modal="true" aria-label={"Archivos del proyecto " + recibida.nombre}>
              <div className="sticky top-0 z-20 flex min-w-0 items-center justify-between gap-2 border-b border-border bg-card/95 px-3 py-2.5 shadow-sm backdrop-blur">
                <div className="flex min-w-0 items-center gap-2">
                  <Folder className="size-4 shrink-0 text-gold" />
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold">{recibida.nombre}</h4>
                    <p className="text-[10px] text-muted-foreground">{recibida.cargandoArchivos ? "Cargando…" : recibida.archivos.length + " archivos"}</p>
                  </div>
                </div>
                <button type="button" aria-label="Cerrar ficha" title="Cerrar ficha" onClick={() => setProyectoAbierto(null)} className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-4" /></button>
              </div>
              <div className="p-2.5">
                <div className="grid grid-cols-1 gap-2">
                          {recibida.archivos.map((archivo) => <div key={archivo.ruta} className="rounded-xl border border-border/70 bg-background p-3 transition-colors hover:border-border">
                            <div className="flex min-w-0 items-start gap-2.5">
                              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted/70 text-muted-foreground">{archivo.categoria === "fotos" ? <ImageIcon className="size-4" /> : archivo.categoria === "modelos-3d" ? <Box className="size-4" /> : archivo.categoria === "documentos" ? <FileText className="size-4" /> : <FileIcon className="size-4" />}</div>
                              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{etiquetaTipoArchivo(archivo.nombre)}</p><p className="mt-1 text-[10px] text-muted-foreground">{etiquetaTamano(archivo.bytes)}</p></div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {archivo.categoria === "fotos" && <button type="button" disabled={anadiendoCatalogo === archivo.ruta} onClick={() => void anadirImagenAlCatalogo(archivo)} className="rounded-lg border border-[#c5a15d]/60 bg-[#c5a15d]/[0.10] px-2.5 py-2 text-[11px] font-semibold hover:bg-[#c5a15d]/[0.17] disabled:opacity-50">{anadiendoCatalogo === archivo.ruta ? "Preparando imagen…" : "Añadir a mi catálogo"}</button>}
                              {archivo.categoria === "documentos" && archivo.nombre.toLowerCase().endsWith(".pdf") && archivo.origen === "supabase" && <button type="button" disabled={anadiendoCatalogo !== null} onClick={async () => { if (!participanteId || !usuarioId) { toast.error("No se encontró tu taller activo."); return; } setAnadiendoCatalogo(archivo.ruta); try { const { data: signed, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(archivo.ruta, 60); if (signedError || !signed?.signedUrl) throw signedError ?? new Error("No se pudo leer el PDF compartido."); const response = await fetch(signed.signedUrl); if (!response.ok) throw new Error("No se pudo descargar el PDF compartido."); const blob = await response.blob(); if (blob.size > 10 * 1024 * 1024) throw new Error("El PDF supera el límite de 10 MB para análisis con IA."); const destino = `${participanteId}/${usuarioId}/compartidos/${crypto.randomUUID()}-${nombreSeguro(nombreVisible(archivo.nombre))}`; const { error: uploadError } = await supabase.storage.from(BUCKET).upload(destino, blob, { contentType: "application/pdf", upsert: false }); if (uploadError) throw uploadError; await anadirImagenAlCatalogo(null, undefined, { ...archivo, ruta: destino, origen: "supabase" }); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "No se pudo preparar el PDF compartido para el catálogo."); } finally { setAnadiendoCatalogo(null); } }} className="rounded-lg border border-[#c5a15d]/60 bg-[#c5a15d]/[0.10] px-2.5 py-2 text-[11px] font-semibold hover:bg-[#c5a15d]/[0.17] disabled:opacity-50">{anadiendoCatalogo === archivo.ruta ? "Preparando PDF…" : "Analizar PDF con IA / catálogo"}</button>}
                              {archivo.nombre.toLowerCase().endsWith(".stl") && <button type="button" onClick={async () => { const { data, error: urlError } = await supabase.storage.from(BUCKET).createSignedUrl(archivo.ruta, 60); if (urlError || !data?.signedUrl) { toast.error("No se pudo preparar el STL para el visor."); return; } const destino = new URL("/herramientas", window.location.origin); destino.searchParams.set("archivoUrl", data.signedUrl); destino.searchParams.set("archivoNombre", nombreVisible(archivo.nombre)); destino.searchParams.set("archivoRuta", archivo.ruta); destino.searchParams.set("proyectoNombre", archivo.carpeta); destino.searchParams.set("herramienta", "peso"); window.location.assign(destino.toString()); }} className="rounded-lg border border-[#c5a15d]/60 bg-[#c5a15d]/[0.10] px-2.5 py-2 text-[11px] font-semibold hover:bg-[#c5a15d]/[0.17]">Abrir en Visualizador y peso 3D</button>}
                              {archivo.nombre.toLowerCase().endsWith(".stl") && <button type="button" onClick={async () => { const { data, error: urlError } = await supabase.storage.from(BUCKET).createSignedUrl(archivo.ruta, 60); if (urlError || !data?.signedUrl) { toast.error("No se pudo preparar el STL para inspección."); return; } const destino = new URL("/herramientas", window.location.origin); destino.searchParams.set("archivoUrl", data.signedUrl); destino.searchParams.set("archivoNombre", nombreVisible(archivo.nombre)); destino.searchParams.set("asistente", "1"); window.location.assign(destino.toString()); }} className="rounded-lg border border-gold/50 bg-gold/[0.08] px-2.5 py-2 text-[11px] font-semibold hover:bg-gold/[0.14]">Inspeccionar para impresión 3D</button>}
                              {archivo.nombre.toLowerCase().endsWith(".3dm") && <button type="button" onClick={async () => { try { const { data, error: urlError } = await supabase.storage.from(BUCKET).createSignedUrl(archivo.ruta, 60); if (urlError || !data?.signedUrl) throw urlError ?? new Error("No se pudo preparar el 3DM compartido para Aurum Render."); sessionStorage.setItem("aurum-render-archivo-pendiente", JSON.stringify({ url: data.signedUrl, nombre: nombreVisible(archivo.nombre), rutaArchivoOriginal: archivo.ruta, rutaCarpeta: archivo.ruta.slice(0, archivo.ruta.lastIndexOf("/")) })); window.location.assign("/aurum-render?desde-mi-nube=1"); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "No se pudo abrir el 3DM en Aurum Render."); } }} className="rounded-lg border border-[#c5a15d]/60 bg-[#c5a15d]/[0.10] px-2.5 py-2 text-[11px] font-semibold hover:bg-[#c5a15d]/[0.17]">Abrir en Aurum Render</button>}
                              <button type="button" onClick={() => void abrirArchivo(archivo)} className="rounded-lg border border-border/80 bg-background px-2.5 py-2 text-[11px] font-medium hover:border-gold/45">Abrir / descargar</button>
                            </div>
                          </div>)}
                </div>
              </div>
            </section>
            </div>
                  ), document.body)}
                </div>;
              })}
            </div>
          )}

        </section>
        {opcionesCompartir && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171612]/55 p-3 backdrop-blur-[3px] sm:p-6" role="dialog" aria-modal="true" aria-labelledby="mi-nube-opciones-title">
            <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-[1.4rem] border border-[#e7dfd0] bg-[#fffefa] p-4 shadow-[0_24px_80px_rgba(20,18,12,0.28)] sm:p-6">
              <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-5 flex items-start justify-between gap-4 border-b border-[#eee8dc] bg-[#fffefa]/95 px-4 pb-4 pt-4 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a77d35]">AURUM LAB · MI NUBE</p>
                  <h3 id="mi-nube-opciones-title" className="mt-1 text-xl font-semibold tracking-tight text-[#24231f]">Compartir proyecto</h3>
                  <p className="mt-1 truncate text-sm text-[#77746d]">“{opcionesCompartir.nombre}” · elige una acción.</p>
                {(() => {
                  const talleresDeCarpeta = compartidas.filter((share) => share.carpeta === opcionesCompartir.nombre);
                  return (
                    <section className="mt-4 overflow-hidden rounded-xl border border-[#e7dfd0] bg-white">
                      <button
                        type="button"
                        onClick={() => setMostrarTalleresCompartidos((visible) => !visible)}
                        aria-expanded={mostrarTalleresCompartidos}
                        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-[#fcfaf5] sm:px-4"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f4ead7] text-[#9a702b]"><Users className="size-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold text-[#292720]">Talleres con acceso a esta carpeta</span>
                          <span className="mt-0.5 block text-[11px] text-[#77746d]">
                            {talleresDeCarpeta.length === 0
                              ? "Ningún taller tiene acceso"
                              : `${talleresDeCarpeta.length} ${talleresDeCarpeta.length === 1 ? "taller con acceso" : "talleres con acceso"}`}
                          </span>
                        </span>
                        <span className="rounded-full border border-[#e7dfd0] bg-[#faf8f3] px-2.5 py-1 text-[10px] font-semibold tabular-nums text-[#655b49]">{talleresDeCarpeta.length}</span>
                        {mostrarTalleresCompartidos ? <ChevronUp className="size-4 shrink-0 text-[#77746d]" /> : <ChevronDown className="size-4 shrink-0 text-[#77746d]" />}
                      </button>
                      {mostrarTalleresCompartidos && (
                        <div className="border-t border-[#eee8dc] p-2.5 sm:p-3">
                          {talleresDeCarpeta.length > 0 ? (
                            <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                              {talleresDeCarpeta.map((share) => (
                                <div key={share.id} className="flex items-center gap-3 rounded-lg border border-[#eee8dc] px-3 py-2.5">
                                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f7f4ed] text-[#8c754c]"><Store className="size-3.5" /></span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-semibold text-[#292720]">{share.destinatario_nombre ?? "Taller del ecosistema"}</p>
                                    <p className="mt-0.5 text-[10px] text-[#77746d]">Acceso activo · carpeta compartida</p>
                                  </div>
                                  <button type="button" disabled={guardandoComparticion} onClick={() => setComparticionPendienteRevocar(share)} className="shrink-0 rounded-lg border border-red-200 px-2.5 py-1.5 text-[10px] font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50">Quitar acceso</button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="rounded-lg border border-dashed border-[#e7dfd0] px-3 py-4 text-center text-xs text-[#77746d]">Esta carpeta todavía no está compartida con ningún taller registrado.</p>
                          )}
                        </div>
                      )}
                    </section>
                  );
                })()}
                </div>
                <button type="button" onClick={() => setOpcionesCompartir(null)} className="shrink-0 rounded-full border border-[#e7dfd0] p-2.5 text-[#5d594f] transition hover:border-[#c5a15d] hover:bg-[#f7f1e5]" aria-label="Cerrar"><X className="size-4" /></button>
              </div>
              <div className="space-y-3">
                <section className="rounded-2xl border border-[#dfc99f] bg-gradient-to-br from-[#fbf7ed] to-white p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[#ead9b7] bg-[#f3e8d1] text-[#9a702b]"><Box className="size-5" /></div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-[#292720]">Enlace del visor 3D</h4>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">Comparte una vista privada de la joya. Los enlaces caducan a los 3 días.</p>
                    </div>
                  </div>
                  {opcionesCompartir.archivos.filter((archivo) => archivo.origen === "supabase" && archivo.nombre.toLowerCase().endsWith(".glb")).length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {opcionesCompartir.archivos.filter((archivo) => archivo.origen === "supabase" && archivo.nombre.toLowerCase().endsWith(".glb")).map((archivo) => {
                        const enlace = enlacesVisorArchivo.find((item) => item.ruta === archivo.ruta);
                        return (
                          <div key={archivo.ruta} className="mt-3 rounded-xl border border-[#e8e2d7] bg-white p-3.5 shadow-[0_2px_8px_rgba(30,25,15,0.035)]">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold">{nombreVisible(archivo.nombre)}</p>
                                <p className="mt-0.5 text-[10px] text-muted-foreground">{etiquetaTamano(archivo.bytes)}</p>
                              </div>
                              <button type="button" disabled={generandoEnlaceVisor !== null} onClick={() => void crearEnlaceVisorArchivo(archivo, Boolean(enlace))} className="shrink-0 rounded-lg border border-[#d9c49b] bg-[#fbf7ed] px-3 py-2 text-[11px] font-semibold text-[#73531d] transition hover:bg-[#f2e6cd] disabled:opacity-50">
                                {generandoEnlaceVisor === archivo.ruta ? "Renovando…" : enlace ? "Renovar enlace" : "Crear enlace"}
                              </button>
                            </div>
                            {enlace && (
                              <div className="mt-2 space-y-2">
                                <input aria-label={`Enlace del visor para ${nombreVisible(archivo.nombre)}`} readOnly value={enlace.url} onFocus={(event) => event.currentTarget.select()} className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-[11px]" />
                                <div className="flex flex-wrap gap-2">
                                  <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(enlace.url); toast.success("Enlace copiado."); } catch { toast.error("No se pudo copiar automáticamente. Selecciona el enlace y cópialo."); } }} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-[11px] font-medium"><Copy className="size-3.5" /> Copiar enlace</button>
                                  <button type="button" onClick={() => window.open(enlace.url, "_blank", "noopener,noreferrer")} className="rounded-lg border border-gold/40 px-2.5 py-2 text-[11px] font-semibold">Abrir visor</button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <p className="rounded-lg border border-dashed border-border p-3 text-xs leading-5 text-muted-foreground">Aún no hay un modelo listo para compartir. Guarda el proyecto desde Aurum Render.</p>
                      {opcionesCompartir.archivos.filter((archivo) => archivo.origen === "supabase" && archivo.nombre.toLowerCase().endsWith(".3dm")).length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold">Preparar desde 3DM</p>
                          {opcionesCompartir.archivos.filter((archivo) => archivo.origen === "supabase" && archivo.nombre.toLowerCase().endsWith(".3dm")).map((archivo) => (
                            <div key={archivo.ruta} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background p-3">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold">{nombreVisible(archivo.nombre)}</p>
                                <p className="mt-0.5 text-[10px] text-muted-foreground">Abrir en Aurum Render y guardar GLB</p>
                              </div>
                              <button type="button" onClick={async () => {
                                try {
                                  const { data, error: urlError } = await supabase.storage.from(BUCKET).createSignedUrl(archivo.ruta, 600);
                                  if (urlError || !data?.signedUrl) throw urlError ?? new Error("No se pudo preparar el 3DM para Aurum Render.");
                                  sessionStorage.setItem("aurum-render-archivo-pendiente", JSON.stringify({
                                    url: data.signedUrl,
                                    nombre: nombreVisible(archivo.nombre),
                                    rutaArchivoOriginal: archivo.ruta,
                                    rutaCarpeta: archivo.ruta.slice(0, archivo.ruta.lastIndexOf("/")),
                                  }));
                                  setOpcionesCompartir(null);
                                  window.location.assign("/aurum-render?desde-mi-nube=1");
                                } catch (cause) {
                                  toast.error(cause instanceof Error ? cause.message : "No se pudo abrir el 3DM en Aurum Render.");
                                }
                              }} className="shrink-0 rounded-lg border border-gold/45 bg-gold/5 px-2.5 py-2 text-[11px] font-semibold hover:bg-gold/10">Preparar GLB</button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs leading-5 text-muted-foreground">No hay archivos 3DM en esta carpeta.</p>
                      )}
                    </div>
                  )}
                </section>
                <button
                  type="button"
                  onClick={() => {
                    const proyecto = opcionesCompartir;
                    if (!proyecto) return;
                    setOpcionesCompartir(null);
                    window.location.assign("/marketplace-publicar?carpeta=" + encodeURIComponent(proyecto.nombre));
                  }}
                  className="flex items-start gap-3 rounded-2xl border border-[#e7dfd0] bg-white p-4 text-left transition hover:-translate-y-px hover:border-[#c5a15d]/70 hover:bg-[#fcfaf5] hover:shadow-sm"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f4ead7] text-[#9a702b]"><ShoppingBag className="size-5" /></div>
                  <div>
                    <span className="block text-sm font-semibold">Vender archivos digitales</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">Seleccionar archivos de este proyecto, fijar un precio y preparar su publicación en el marketplace. No modifica los originales.</span>
                  </div>
                </button>
                <button
                  type="button"
                  disabled={anadiendoCatalogo !== null}
                  onClick={() => {
                    const proyecto = opcionesCompartir;
                    if (!proyecto) return;
                    setOpcionesCompartir(null);
                    void anadirImagenAlCatalogo(
                      proyecto.archivos.find((item) => item.categoria === "fotos") ?? null,
                      proyecto,
                      proyecto.archivos.find((item) => item.nombre.toLowerCase().endsWith(".pdf") && item.origen === "supabase") ?? null,
                    );
                  }}
                  className="flex items-start gap-3 rounded-2xl border border-[#e7dfd0] bg-white p-4 text-left transition hover:-translate-y-px hover:border-[#c5a15d]/70 hover:bg-[#fcfaf5] hover:shadow-sm disabled:opacity-50"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#c5a15d]/15 text-gold"><FileText className="size-5" /></div>
                  <div>
                    <span className="block text-sm font-semibold">{anadiendoCatalogo === opcionesCompartir.nombre ? "Preparando ficha…" : "Crear ficha para catálogo"}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">Preparar este proyecto para el catálogo con su imagen y archivos disponibles. Podrás revisar y completar la ficha antes de guardarla.</span>
                  </div>
                </button>
                <button type="button" onClick={() => { const proyecto = opcionesCompartir; setOpcionesCompartir(null); void abrirCompartirEcosistema(proyecto); }} className="flex items-start gap-3 rounded-2xl border border-[#e7dfd0] bg-white p-4 text-left transition hover:-translate-y-px hover:border-[#c5a15d]/70 hover:bg-[#fcfaf5] hover:shadow-sm">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#c5a15d]/15 text-gold"><Share2 className="size-5" /></div>
                  <div><span className="block text-sm font-semibold">Compartir con un taller registrado</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">La carpeta original aparecerá en “Compartidas conmigo” de su Mi Nube. Sin duplicar archivos; puedes revocar el acceso.</span></div>
                </button>
                <button type="button" disabled={compartiendo !== null} onClick={() => { const proyecto = opcionesCompartir; setOpcionesCompartir(null); void compartirCarpetaTransfer(proyecto); }} className="flex items-start gap-3 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-gold/45 hover:bg-muted/40 disabled:opacity-50">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"><UploadCloud className="size-5" /></div>
                  <div><span className="block text-sm font-semibold">Generar enlace temporal · AURUM Transfer</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Para alguien externo al ecosistema. Enlace de un solo uso, con vencimiento de 24 horas y hasta 10 archivos.</span></div>
                </button>
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">El enlace del visor muestra únicamente el modelo GLB seleccionado. Para compartir la carpeta completa con otro taller, usa el acceso entre talleres o AURUM Transfer.</p>
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

        {proyectoPendienteEliminar && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="mi-nube-eliminar-proyecto-title">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive"><AlertCircle className="size-5" /></div>
                <div className="min-w-0">
                  <h3 id="mi-nube-eliminar-proyecto-title" className="text-base font-semibold">Eliminar proyecto</h3>
                  <p className="mt-1 break-words text-sm text-muted-foreground">Vas a eliminar los archivos web del proyecto “{proyectoPendienteEliminar.nombre}”. Esta acción no se puede deshacer.</p>
                  <p className="mt-2 text-sm text-muted-foreground">{estadoNas === "online" && !nasPausado ? "Si el NAS está disponible, también intentaremos limpiar sus archivos. Si falla, te indicaremos qué quedó pendiente." : "El NAS no está disponible o está pausado. Sus archivos se conservarán; la eliminación de los archivos web podrá continuar."}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setProyectoPendienteEliminar(null)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">Cancelar</button>
                <button type="button" onClick={() => { const proyecto = proyectoPendienteEliminar; setProyectoPendienteEliminar(null); void eliminarProyectoCompleto(proyecto); }} className="rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-white hover:bg-destructive/90">Eliminar proyecto</button>
              </div>
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
      {archivoPendienteEliminar && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="mi-nube-eliminar-archivo-title">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <h3 id="mi-nube-eliminar-archivo-title" className="text-base font-semibold">Eliminar archivo</h3>
            <p className="mt-2 break-words text-sm text-muted-foreground">¿Eliminar definitivamente “{nombreVisible(archivoPendienteEliminar.nombre)}” de Mi Nube{archivoPendienteEliminar.categoria === "videos" ? " y de su copia del NAS si está disponible" : ""}?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setArchivoPendienteEliminar(null)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Cancelar</button>
              <button type="button" onClick={() => { const archivo = archivoPendienteEliminar; setArchivoPendienteEliminar(null); void eliminarArchivoProyecto(archivo); }} className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-white">Eliminar</button>
            </div>
          </div>
        </div>
      )}
      {comparticionPendienteRevocar && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="mi-nube-revocar-title">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <h3 id="mi-nube-revocar-title" className="text-base font-semibold">Revocar acceso</h3>
            <p className="mt-2 text-sm text-muted-foreground">¿Quitar el acceso de {comparticionPendienteRevocar.destinatario_nombre ?? "este taller"} a la carpeta “{comparticionPendienteRevocar.carpeta}”?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setComparticionPendienteRevocar(null)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Cancelar</button>
              <button type="button" onClick={() => { const share = comparticionPendienteRevocar; setComparticionPendienteRevocar(null); void revocarComparticion(share); }} className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-white">Revocar acceso</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
