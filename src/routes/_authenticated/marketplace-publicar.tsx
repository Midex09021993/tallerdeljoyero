import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useSesion } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/marketplace-publicar")({
  head: () => ({ meta: [{ title: "Publicar archivo digital — Taller del Joyero" }] }),
  component: PublicarArchivoPage,
});

const FORMATOS = ["STL", "3DM", "GLB", "OBJ", "STEP", "IMAGEN", "PDF", "PLANO"] as const;
const CATEGORIAS = ["Anillos", "Pendientes", "Collares", "Dijes", "Pulseras", "Modelos 3D", "Planos técnicos", "Imágenes", "Otros"] as const;
const EXTENSIONES: Record<string, (typeof FORMATOS)[number]> = { stl: "STL", "3dm": "3DM", glb: "GLB", obj: "OBJ", step: "STEP", stp: "STEP", jpg: "IMAGEN", jpeg: "IMAGEN", png: "IMAGEN", webp: "IMAGEN", pdf: "PDF", dxf: "PLANO", dwg: "PLANO" };
type ArchivoDisponible = { ruta: string; nombre: string; bytes: number };

function PublicarArchivoPage() {
  const sesion = useSesion();
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]>("Modelos 3D");
  const [formato, setFormato] = useState<(typeof FORMATOS)[number]>("STL");
  const [precio, setPrecio] = useState("");
  const [moneda, setMoneda] = useState<"PEN" | "USD">("PEN");
  const [rutasSeleccionadas, setRutasSeleccionadas] = useState<string[]>([]);
  const [archivosDisponibles, setArchivosDisponibles] = useState<ArchivoDisponible[]>([]);
  const [cargandoArchivos, setCargandoArchivos] = useState(false);
  const [errorArchivos, setErrorArchivos] = useState<string | null>(null);
  const [carpetaProyecto, setCarpetaProyecto] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const carpeta = params.get("carpeta") ?? "";
    setCarpetaProyecto(carpeta);
    if (carpeta) setTitulo(carpeta);
  }, []);

  const raizCarpetaSeleccionada = carpetaProyecto.trim();
  const archivosVisibles = archivosDisponibles.filter((item) => {
    if (item.nombre.toLowerCase() === "00-portada-aurum.png") return false;
    if (!raizCarpetaSeleccionada) return true;
    const partesRuta = item.ruta.split("/");
    return partesRuta.length >= 3 && partesRuta[partesRuta.length - 2] === raizCarpetaSeleccionada;
  });

  useEffect(() => {
    if (!raizCarpetaSeleccionada || cargandoArchivos) return;
    const compatibles = archivosDisponibles.filter((item) => {
      if (item.nombre.toLowerCase() === "00-portada-aurum.png") return false;
      const partesRuta = item.ruta.split("/");
      return partesRuta.length >= 3 && partesRuta[partesRuta.length - 2] === raizCarpetaSeleccionada;
    });
    if (compatibles.length === 1) setRutasSeleccionadas([compatibles[0].ruta]);
  }, [archivosDisponibles, cargandoArchivos, raizCarpetaSeleccionada]);

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      const userId = sesion.data?.user.id;
      const participanteId = sesion.data?.participante?.id;
      if (!userId || !participanteId) { setArchivosDisponibles([]); return; }
      setCargandoArchivos(true);
      setErrorArchivos(null);
      try {
        const raiz = participanteId + "/" + userId;
        const { data: entradas, error } = await supabase.storage.from("mi-nube").list(raiz, { limit: 1000, sortBy: { column: "name", order: "asc" } });
        if (error) throw error;
        const carpetas = (entradas ?? []).filter((item) => !item.id && !item.metadata && item.name).map((item) => item.name);
        const encontrados: ArchivoDisponible[] = (entradas ?? []).filter((item) => Boolean(item.id || item.metadata || item.name.includes("."))).flatMap((item) => {
          const extension = item.name.split(".").pop()?.toLowerCase() ?? "";
          if (!EXTENSIONES[extension] || item.name.startsWith(".")) return [];
          return [{ ruta: raiz + "/" + item.name, nombre: item.name, bytes: Number(item.metadata?.size ?? 0) }];
        });
        for (let inicio = 0; inicio < carpetas.length; inicio += 2) {
          const lote = carpetas.slice(inicio, inicio + 2);
          const resultados = await Promise.all(lote.map(async (carpeta) => {
            const { data, error: listaError } = await supabase.storage.from("mi-nube").list(raiz + "/" + carpeta, { limit: 1000, sortBy: { column: "name", order: "asc" } });
            if (listaError) throw listaError;
            return (data ?? []).filter((item) => Boolean(item.id || item.metadata || item.name.includes("."))).flatMap((item) => {
              const extension = item.name.split(".").pop()?.toLowerCase() ?? "";
              if (!EXTENSIONES[extension] || item.name.startsWith(".")) return [];
              return [{ ruta: raiz + "/" + carpeta + "/" + item.name, nombre: item.name, bytes: Number(item.metadata?.size ?? 0) }];
            });
          }));
          encontrados.push(...resultados.flat());
        }
        if (!cancelado) setArchivosDisponibles(encontrados.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
      } catch (error) {
        if (!cancelado) { setArchivosDisponibles([]); setErrorArchivos(error instanceof Error ? error.message : "No se pudo leer Mi Nube."); }
      } finally { if (!cancelado) setCargandoArchivos(false); }
    };
    void cargar();
    return () => { cancelado = true; };
  }, [sesion.data?.user.id, sesion.data?.participante?.id]);

  const archivosSeleccionados = archivosVisibles.filter((item) => rutasSeleccionadas.includes(item.ruta));

  const publicar = useMutation({
    mutationFn: async () => {
      const user = sesion.data?.user;
      const participanteId = sesion.data?.participante?.id;
      if (!user || !participanteId) throw new Error("Tu cuenta no tiene un taller activo vinculado.");
      const valor = Number(precio);
      if (!Number.isFinite(valor) || valor <= 0) throw new Error("Indica un precio mayor que cero.");
      if (archivosSeleccionados.length === 0) throw new Error("Selecciona al menos un archivo para vender.");
      const ruta = archivosSeleccionados[0].ruta;
      let imagenPortadaUrl: string | null = null;
      const carpetaRuta = ruta.split("/").slice(0, -1).join("/");
      const imagenProyecto = archivosDisponibles.find((item) => item.ruta.startsWith(carpetaRuta + "/") && /\.(jpe?g|png|webp)$/i.test(item.nombre));
      if (imagenProyecto) {
        const { data: imagenFirmada, error: errorFirma } = await supabase.storage.from("mi-nube").createSignedUrl(imagenProyecto.ruta, 600);
        if (!errorFirma && imagenFirmada?.signedUrl) {
          const respuestaImagen = await fetch(imagenFirmada.signedUrl);
          if (respuestaImagen.ok) {
            const blobImagen = await respuestaImagen.blob();
            const extensionImagen = imagenProyecto.nombre.split(".").pop()?.toLowerCase() ?? "jpg";
            const rutaPortada = "marketplace-portadas/" + user.id + "/" + crypto.randomUUID() + "." + extensionImagen;
            const { error: errorSubida } = await supabase.storage.from("catalogo-joyas").upload(rutaPortada, blobImagen, { contentType: blobImagen.type || "image/jpeg", upsert: false });
            if (!errorSubida) {
              imagenPortadaUrl = supabase.storage.from("catalogo-joyas").getPublicUrl(rutaPortada).data.publicUrl;
            }
          }
        }
      }
      const seleccionado = archivosSeleccionados[0];
      const prefijoPrivado = participanteId + "/" + user.id + "/";
      if (!seleccionado || !seleccionado.ruta.startsWith(prefijoPrivado) || seleccionado.ruta.split("/").some((parte) => parte === "..")) throw new Error("Selecciona un archivo válido de tu propia Mi Nube.");
      const extension = seleccionado.nombre.split(".").pop()?.toLowerCase() ?? "";
      if (EXTENSIONES[extension] !== formato) throw new Error("El formato seleccionado no coincide con el archivo.");
      const marketplaceClient = supabase as unknown as { from: (table: string) => { insert: (values: Record<string, unknown>) => Promise<{ error: { message: string } | null }> } };
      const { error } = await marketplaceClient.from("archivos_digitales_marketplace").insert({
        participante_id: participanteId,
        vendedor_usuario_id: user.id,
        titulo: titulo.trim(),
        descripcion: "",
        categoria,
        formatos: [...new Set(archivosSeleccionados.map((item) => EXTENSIONES[item.nombre.split(".").pop()?.toLowerCase() ?? ""]).filter(Boolean))],
        archivos_adjuntos: archivosSeleccionados.map((item) => ({ ruta: item.ruta, nombre: item.nombre, bytes: item.bytes })),
        precio: valor,
        moneda,
        imagen_portada_url: imagenPortadaUrl,
        bucket_archivo: "mi-nube",
        ruta_archivo: seleccionado.ruta,
        nombre_archivo: seleccionado.nombre,
        bytes_archivo: seleccionado.bytes,
        estado: "borrador",
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Borrador guardado. Revisa el archivo y publícalo cuando esté listo.");
      await queryClient.invalidateQueries({ queryKey: ["marketplace-mis-publicaciones"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "No se pudo guardar el borrador."),
  });

  return (
    <AppShell titulo="Publicar archivo">
      <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        <Link to="/mi-nube" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Volver a Mi Nube</Link>
        <header className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-gold">Marketplace digital</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Preparar publicación</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Elegimos los datos que ya existen en Mi Nube automáticamente. Solo confirma el archivo y define el precio; esta primera versión guarda la publicación como borrador, sin cobros ni descargas.</p>
        </header>

        {!sesion.isLoading && !sesion.data?.participante ? <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">Tu cuenta todavía no tiene un taller activo vinculado. Vincula el taller para poder publicar.</div> : null}

        <form className="grid gap-5 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 sm:p-7" onSubmit={(event) => { event.preventDefault(); publicar.mutate(); }}>
          <label className="space-y-2 text-sm font-medium sm:col-span-2">Nombre de publicación
            <input required minLength={3} maxLength={140} value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal" placeholder="Se completará con el proyecto o archivo" />
            <span className="block text-xs font-normal text-muted-foreground">Se completa automáticamente con el nombre del proyecto o archivo. Puedes ajustarlo si lo necesitas.</span>
          </label>
          <div className="space-y-1 text-sm sm:col-span-2"><p className="font-medium">Categoría y formato</p><p className="rounded-lg border border-border bg-muted/30 px-3 py-3 text-sm font-normal">{categoria} · {formato} <span className="text-xs text-muted-foreground">· detectados automáticamente</span></p></div>
          <label className="space-y-2 text-sm font-medium">Precio
            <input required type="number" min="0.01" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal" placeholder="25.00" />
          </label>
          <label className="space-y-2 text-sm font-medium">Moneda
            <select value={moneda} onChange={(e) => setMoneda(e.target.value as typeof moneda)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal"><option value="PEN">Soles (PEN)</option><option value="USD">Dólares (USD)</option></select>
          </label>
          <fieldset className="space-y-3 text-sm sm:col-span-2">
            <legend className="font-medium">Archivos incluidos en la publicación</legend>
            {cargandoArchivos ? <p className="rounded-lg border border-border bg-muted/30 p-4 text-muted-foreground">Cargando archivos de Mi Nube…</p> : null}
            {!cargandoArchivos && archivosVisibles.length === 0 ? <p className="rounded-lg border border-border bg-muted/30 p-4 text-muted-foreground">{carpetaProyecto ? `No hay archivos compatibles en la carpeta “${carpetaProyecto}”.` : "No hay archivos compatibles en tus carpetas."}</p> : null}
            <div className="grid gap-2">
              {archivosVisibles.map((item) => {
                const extension = item.nombre.split(".").pop()?.toLowerCase() ?? "";
                const seleccionado = rutasSeleccionadas.includes(item.ruta);
                return <label key={item.ruta} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${seleccionado ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:bg-muted/30"}`}>
                  <input type="checkbox" name="archivos-mi-nube" checked={seleccionado} onChange={(event) => setRutasSeleccionadas((actual) => event.target.checked ? [...actual, item.ruta] : actual.filter((ruta) => ruta !== item.ruta))} className="size-4 shrink-0 accent-current" />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words font-medium">{item.nombre}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{EXTENSIONES[extension]} · {item.bytes ? (item.bytes / 1048576).toFixed(2) + " MB" : "tamaño no disponible"}</span>
                  </span>
                  {seleccionado ? <span className="shrink-0 text-xs font-semibold text-primary">Incluido</span> : null}
                </label>;
              })}
            </div>
            <p className="text-xs text-muted-foreground">{archivosSeleccionados.length} archivo(s) seleccionado(s). El nombre de publicación no cambia al seleccionar archivos.</p>
            {errorArchivos ? <p className="text-xs text-destructive">No se pudo cargar Mi Nube: {errorArchivos}</p> : null}
          </fieldset>
          <div className="space-y-1 text-sm sm:col-span-2"><p className="font-medium">Imagen de portada</p><p className="text-xs text-muted-foreground">Se reutiliza automáticamente la portada guardada en la carpeta. No necesitas cargarla otra vez.</p></div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 sm:col-span-2">
            <p className="max-w-md text-xs leading-5 text-muted-foreground">El borrador no aparece públicamente y no activa ningún cobro.</p>
            <button disabled={publicar.isPending || !sesion.data?.participante || archivosSeleccionados.length === 0} type="submit" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"><FilePlus2 className="size-4" /> {publicar.isPending ? "Guardando..." : "Guardar borrador"}</button>
          </div>
        </form>
      </main>
    </AppShell>
  );
}
