import { useEffect, useState } from "react";
import { ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Coleccion = {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  imagen_url: string | null;
  orden: number;
  publicado: boolean;
};

type Producto = { id: string; nombre: string; codigo: string };

function slugify(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export function CatalogoColeccionesDialog({
  open,
  participanteId,
  productos,
  onClose,
  onChanged,
}: {
  open: boolean;
  participanteId: string;
  productos: Producto[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [colecciones, setColecciones] = useState<Coleccion[]>([]);
  const [asignaciones, setAsignaciones] = useState<Record<string, Set<string>>>({});
  const [editando, setEditando] = useState<Coleccion | null>(null);
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [orden, setOrden] = useState("0");
  const [publicado, setPublicado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    if (!participanteId) return;
    const { data, error: collectionError } = await supabase
      .from("catalogo_colecciones")
      .select("id, nombre, slug, descripcion, imagen_url, orden, publicado")
      .eq("participante_id", participanteId)
      .order("orden", { ascending: true })
      .order("nombre", { ascending: true });
    if (collectionError) throw collectionError;

    const ids = (data ?? []).map((item) => item.id);
    let relationRows: { producto_id: string; coleccion_id: string }[] = [];
    if (ids.length) {
      const { data: relations, error: relationError } = await supabase
        .from("catalogo_productos_colecciones")
        .select("producto_id, coleccion_id")
        .in("coleccion_id", ids);
      if (relationError) throw relationError;
      relationRows = relations ?? [];
    }

    const next: Record<string, Set<string>> = {};
    for (const row of relationRows) {
      if (!next[row.coleccion_id]) next[row.coleccion_id] = new Set();
      next[row.coleccion_id].add(row.producto_id);
    }
    setColecciones((data ?? []) as Coleccion[]);
    setAsignaciones(next);
  }

  useEffect(() => {
    if (!open) return;
    setError(null);
    void cargar().catch((e) => setError(e instanceof Error ? e.message : "No se pudieron cargar las colecciones."));
  }, [open, participanteId]);

  function resetForm() {
    setEditando(null);
    setNombre("");
    setSlug("");
    setDescripcion("");
    setImagenUrl("");
    setOrden("0");
    setPublicado(false);
    setError(null);
  }

  function editar(collection: Coleccion) {
    setEditando(collection);
    setNombre(collection.nombre);
    setSlug(collection.slug);
    setDescripcion(collection.descripcion ?? "");
    setImagenUrl(collection.imagen_url ?? "");
    setOrden(String(collection.orden));
    setPublicado(collection.publicado);
    setError(null);
  }

  async function subirImagenPortada(event: any) {
    const file = (event.target.files?.[0] ?? null) as File | null;
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Selecciona un archivo de imagen."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("La imagen debe pesar como máximo 8 MB."); return; }
    setSubiendoImagen(true);
    setError(null);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const destino = participanteId + "/colecciones/" + crypto.randomUUID() + "." + extension;
      const { error: uploadError } = await supabase.storage.from("catalogo-joyas").upload(destino, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("catalogo-joyas").getPublicUrl(destino);
      if (!data?.publicUrl) throw new Error("No se pudo obtener la URL pública de la imagen.");
      setImagenUrl(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally { setSubiendoImagen(false); }
  }

  async function guardar() {
    if (!participanteId || !nombre.trim()) {
      setError("El nombre de la colección es obligatorio.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const payload = {
        participante_id: participanteId,
        nombre: nombre.trim(),
        slug: slugify(slug || nombre),
        descripcion: descripcion.trim() || null,
        imagen_url: imagenUrl.trim() || null,
        orden: Number(orden) || 0,
        publicado,
      };
      const result = editando
        ? await supabase.from("catalogo_colecciones").update(payload).eq("id", editando.id).eq("participante_id", participanteId)
        : await supabase.from("catalogo_colecciones").insert(payload);
      if (result.error) throw result.error;
      resetForm();
      await cargar();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la colección.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(collection: Coleccion) {
    if (!window.confirm(`¿Eliminar la colección "${collection.nombre}"? Los modelos no se eliminarán.`)) return;
    setGuardando(true);
    setError(null);
    try {
      const { error: relationError } = await supabase
        .from("catalogo_productos_colecciones")
        .delete()
        .eq("coleccion_id", collection.id);
      if (relationError) throw relationError;
      const { error: deleteError } = await supabase
        .from("catalogo_colecciones")
        .delete()
        .eq("id", collection.id)
        .eq("participante_id", participanteId);
      if (deleteError) throw deleteError;
      await cargar();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar la colección.");
    } finally {
      setGuardando(false);
    }
  }

  async function alternarProducto(collectionId: string, productoId: string, checked: boolean) {
    setError(null);
    if (checked) {
      const { error } = await supabase.from("catalogo_productos_colecciones").insert({ producto_id: productoId, coleccion_id: collectionId });
      if (error && error.code !== "23505") setError(error.message);
    } else {
      const { error } = await supabase.from("catalogo_productos_colecciones").delete().eq("producto_id", productoId).eq("coleccion_id", collectionId);
      if (error) setError(error.message);
    }
    await cargar();
    onChanged();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-3xl border border-gold/20 bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-5">
          <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-gold">Catálogo</p><h2 className="mt-1 text-xl font-semibold">Colecciones</h2><p className="mt-1 text-xs text-muted-foreground">Agrupa modelos y publica escaparates específicos.</p></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-surface-muted"><X className="size-5" /></button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[.85fr_1.15fr]">
          <section className="rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">{editando ? "Editar colección" : "Nueva colección"}</h3>
              {editando ? <button type="button" onClick={resetForm} className="text-xs font-semibold text-muted-foreground">Nueva</button> : null}
            </div>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-xs font-semibold">Nombre<input value={nombre} onChange={(e) => { const value = e.target.value; setNombre(value); if (!editando || !slug || slug === slugify(nombre)) setSlug(slugify(value)); }} placeholder="Pareja" className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-normal" /></label>
              <label className="grid gap-1.5 text-xs font-semibold">Slug público<input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="pareja" className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-normal" /><span className="text-[10px] font-normal text-muted-foreground">Se genera desde el nombre y puedes personalizarlo.</span></label>
              <label className="grid gap-1.5 text-xs font-semibold">Descripción<textarea rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal" /></label>
              <div className="grid gap-2"><span className="text-xs font-semibold">Imagen de portada</span>{imagenUrl ? <div className="relative overflow-hidden rounded-xl border border-border"><img src={imagenUrl} alt="Vista previa de portada" className="h-36 w-full object-cover" /><button type="button" onClick={() => setImagenUrl("")} className="absolute right-2 top-2 rounded-lg bg-background/90 px-2 py-1 text-[10px] font-semibold">Quitar imagen</button></div> : null}<label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gold/40 bg-background px-3 py-3 text-xs font-semibold hover:bg-surface-muted"><ImagePlus className="size-4" />{subiendoImagen ? "Subiendo imagen…" : imagenUrl ? "Cambiar imagen" : "Subir imagen desde el dispositivo"}<input type="file" accept="image/*" className="sr-only" disabled={subiendoImagen || guardando} onChange={(event) => void subirImagenPortada(event)} /></label><span className="text-[10px] font-normal text-muted-foreground">JPG, PNG o WebP · máximo 8 MB.</span></div>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs font-semibold">Orden<input type="number" min="0" value={orden} onChange={(e) => setOrden(e.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-normal" /></label>
                <label className="flex items-center gap-2 self-end rounded-xl border border-border p-3 text-xs font-semibold"><input type="checkbox" checked={publicado} onChange={(e) => setPublicado(e.target.checked)} /> Publicar</label>
              </div>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
              <button type="button" disabled={guardando || subiendoImagen} onClick={() => void guardar()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs font-semibold disabled:opacity-50"><Plus className="size-4" /> {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear colección"}</button>
            </div>
          </section>

          <section className="grid gap-3">
            {colecciones.length ? colecciones.map((collection) => {
              const selected = asignaciones[collection.id] ?? new Set<string>();
              return (
                <article key={collection.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-[10px] font-bold uppercase tracking-wider text-gold">{collection.publicado ? "Publicada" : "Borrador"} · /{collection.slug}</p><h3 className="mt-1 font-semibold">{collection.nombre}</h3><p className="mt-1 text-xs text-muted-foreground">{selected.size} modelo(s) asignado(s)</p></div>
                    <div className="flex gap-1"><button type="button" onClick={() => editar(collection)} className="rounded-lg p-2 hover:bg-surface-muted" aria-label="Editar colección"><Pencil className="size-4" /></button><button type="button" onClick={() => void eliminar(collection)} className="rounded-lg p-2 text-destructive hover:bg-destructive/5" aria-label="Eliminar colección"><Trash2 className="size-4" /></button></div>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {productos.length ? productos.map((producto) => (
                      <label key={producto.id} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs">
                        <input type="checkbox" checked={selected.has(producto.id)} onChange={(e) => void alternarProducto(collection.id, producto.id, e.target.checked)} />
                        <span className="min-w-0 truncate">{producto.codigo} · {producto.nombre}</span>
                      </label>
                    )) : <p className="text-xs text-muted-foreground">Crea modelos primero para asignarlos.</p>}
                  </div>
                </article>
              );
            }) : <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Todavía no hay colecciones.</div>}
          </section>
        </div>
      </div>
    </div>
  );
}
