import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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

function PublicarArchivoPage() {
  const sesion = useSesion();
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]>("Modelos 3D");
  const [formato, setFormato] = useState<(typeof FORMATOS)[number]>("STL");
  const [precio, setPrecio] = useState("");
  const [moneda, setMoneda] = useState<"PEN" | "USD">("PEN");
  const [ruta, setRuta] = useState("");
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [portada, setPortada] = useState("");

  const publicar = useMutation({
    mutationFn: async () => {
      const user = sesion.data?.user;
      const participanteId = sesion.data?.participante?.id;
      if (!user || !participanteId) throw new Error("Tu cuenta no tiene un taller activo vinculado.");
      const valor = Number(precio);
      if (!Number.isFinite(valor) || valor <= 0) throw new Error("Indica un precio mayor que cero.");
      if (!ruta.trim() || !nombreArchivo.trim()) throw new Error("Indica la ruta privada de Mi Nube y el nombre del archivo.");
      const marketplaceClient = supabase as unknown as { from: (table: string) => { insert: (values: Record<string, unknown>) => Promise<{ error: { message: string } | null }> } };
      const { error } = await marketplaceClient.from("archivos_digitales_marketplace").insert({
        participante_id: participanteId,
        vendedor_usuario_id: user.id,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        categoria,
        formatos: [formato],
        precio: valor,
        moneda,
        imagen_portada_url: portada.trim() || null,
        bucket_archivo: "mi-nube",
        ruta_archivo: ruta.trim(),
        nombre_archivo: nombreArchivo.trim(),
        estado: "borrador",
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Borrador guardado. Revisa el archivo y publícalo cuando esté listo.");
      setTitulo(""); setDescripcion(""); setRuta(""); setNombreArchivo(""); setPortada(""); setPrecio("");
      await queryClient.invalidateQueries({ queryKey: ["marketplace-mis-publicaciones"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "No se pudo guardar el borrador."),
  });

  return (
    <AppShell>
      <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        <Link to="/mi-nube" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Volver a Mi Nube</Link>
        <header className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-gold">Marketplace digital</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Preparar publicación</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Selecciona un archivo que ya esté guardado en Mi Nube. Por seguridad, esta primera versión guarda publicaciones como borrador; no cobra ni libera descargas todavía.</p>
        </header>

        {!sesion.isLoading && !sesion.data?.participante ? <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">Tu cuenta todavía no tiene un taller activo vinculado. Vincula el taller para poder publicar.</div> : null}

        <form className="grid gap-5 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 sm:p-7" onSubmit={(event) => { event.preventDefault(); publicar.mutate(); }}>
          <label className="space-y-2 text-sm font-medium sm:col-span-2">Título del archivo
            <input required minLength={3} maxLength={140} value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal" placeholder="Ej. Anillo sello modelo 3D" />
          </label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2">Descripción
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={5000} rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal" placeholder="Qué incluye y para qué sirve el archivo" />
          </label>
          <label className="space-y-2 text-sm font-medium">Categoría
            <select value={categoria} onChange={(e) => setCategoria(e.target.value as typeof categoria)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal">{CATEGORIAS.map((item) => <option key={item}>{item}</option>)}</select>
          </label>
          <label className="space-y-2 text-sm font-medium">Formato del archivo
            <select value={formato} onChange={(e) => setFormato(e.target.value as typeof formato)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal">{FORMATOS.map((item) => <option key={item}>{item}</option>)}</select>
          </label>
          <label className="space-y-2 text-sm font-medium">Precio
            <input required type="number" min="0.01" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal" placeholder="25.00" />
          </label>
          <label className="space-y-2 text-sm font-medium">Moneda
            <select value={moneda} onChange={(e) => setMoneda(e.target.value as typeof moneda)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal"><option value="PEN">Soles (PEN)</option><option value="USD">Dólares (USD)</option></select>
          </label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2">Ruta exacta del archivo dentro de Mi Nube
            <input required value={ruta} onChange={(e) => setRuta(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal" placeholder="Ej. modelos/anillo-sello.stl" />
            <span className="block text-xs font-normal text-muted-foreground">No pegues una URL pública. Usa la ruta interna exacta del objeto en el bucket privado.</span>
          </label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2">Nombre del archivo descargable
            <input required maxLength={255} value={nombreArchivo} onChange={(e) => setNombreArchivo(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal" placeholder="anillo-sello.stl" />
          </label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2">URL de imagen de muestra (opcional)
            <input type="url" value={portada} onChange={(e) => setPortada(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-normal" placeholder="https://..." />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 sm:col-span-2">
            <p className="max-w-md text-xs leading-5 text-muted-foreground">El borrador no aparece públicamente y no activa ningún cobro.</p>
            <button disabled={publicar.isPending || !sesion.data?.participante} type="submit" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"><FilePlus2 className="size-4" /> {publicar.isPending ? "Guardando..." : "Guardar borrador"}</button>
          </div>
        </form>
      </main>
    </AppShell>
  );
}
