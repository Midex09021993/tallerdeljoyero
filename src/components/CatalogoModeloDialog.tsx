import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { nombreSeguro, subirConProgreso } from "@/lib/subir-archivo";

export type CatalogoProductoEditor = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  descripcion: string | null;
  imagen_principal_url: string | null;
  galeria: unknown;
  video_url: string | null;
  aurum_render_url: string | null;
  precio_desde: number | null;
  moneda: string;
};

type Props = {
  open: boolean;
  producto: CatalogoProductoEditor | null;
  participanteId: string;
  onClose: () => void;
  onSaved: () => void;
};

function slugify(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export function CatalogoModeloDialog({ open, producto, participanteId, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    codigo: "", nombre: "", slug: "", categoria: "Sin categoría", descripcion: "",
    imagen_principal_url: "", galeria: "", video_url: "", aurum_render_url: "",
    precio_desde: "", moneda: "PEN"
  });
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [progresoSubida, setProgresoSubida] = useState(0);
  const [carpetaSubida, setCarpetaSubida] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      codigo: producto?.codigo ?? "",
      nombre: producto?.nombre ?? "",
      slug: producto ? slugify(producto.nombre) : "",
      categoria: producto?.categoria ?? "Sin categoría",
      descripcion: producto?.descripcion ?? "",
      imagen_principal_url: producto?.imagen_principal_url ?? "",
      galeria: Array.isArray(producto?.galeria) ? producto.galeria.join("\n") : "",
      video_url: producto?.video_url ?? "",
      aurum_render_url: producto?.aurum_render_url ?? "",
      precio_desde: producto?.precio_desde == null ? "" : String(producto.precio_desde),
      moneda: producto?.moneda || "PEN",
    });
    setCarpetaSubida(producto?.id ?? "");
    setProgresoSubida(0);
    setError(null);
  }, [open, producto]);

  if (!open) return null;

  async function subirImagen(file: File, tipo: "principal" | "galeria") {
    if (!participanteId || !file.type.startsWith("image/")) {
      setError("Selecciona una imagen válida.");
      return;
    }

    const carpeta = carpetaSubida || crypto.randomUUID();
    setCarpetaSubida(carpeta);
    const ruta = `${participanteId}/${carpeta}/${tipo}-${Date.now()}-${nombreSeguro(file.name)}`;

    setSubiendo(true);
    setProgresoSubida(0);
    setError(null);
    try {
      await subirConProgreso({
        bucket: "catalogo-joyas",
        ruta,
        file,
        onProgreso: setProgresoSubida,
      });
      const { data } = supabase.storage.from("catalogo-joyas").getPublicUrl(ruta);
      if (!data.publicUrl) throw new Error("No se pudo obtener la URL pública de la imagen.");

      setForm((actual) => ({
        ...actual,
        ...(tipo === "principal"
          ? { imagen_principal_url: data.publicUrl }
          : { galeria: actual.galeria ? `${actual.galeria}\n${data.publicUrl}` : data.publicUrl }),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setSubiendo(false);
    }
  }

  async function guardar(event: FormEvent) {
    event.preventDefault();
    const codigo = form.codigo.trim();
    const nombre = form.nombre.trim();
    const slug = slugify(form.slug || nombre);
    const precio = form.precio_desde.trim() === "" ? null : Number(form.precio_desde);
    if (!codigo || !nombre || !slug) return setError("Código, nombre y slug son obligatorios.");
    if (precio !== null && (!Number.isFinite(precio) || precio < 0)) return setError("El precio debe ser un número mayor o igual a 0.");

    setGuardando(true);
    setError(null);
    try {
      const payload = {
        participante_id: participanteId,
        codigo,
        nombre,
        slug,
        categoria: form.categoria.trim() || "Sin categoría",
        descripcion: form.descripcion.trim() || null,
        imagen_principal_url: form.imagen_principal_url.trim() || null,
        galeria: form.galeria.split(/\n|,/).map((value) => value.trim()).filter(Boolean),
        video_url: form.video_url.trim() || null,
        aurum_render_url: form.aurum_render_url.trim() || null,
        precio_desde: precio,
        moneda: form.moneda.trim().toUpperCase() || "PEN",
      };
      const result = producto
        ? await supabase.from("catalogo_productos").update(payload).eq("id", producto.id).eq("participante_id", participanteId)
        : await supabase.from("catalogo_productos").insert(payload);
      if (result.error) throw result.error;
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el modelo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-gold/20 bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-gold">Catálogo maestro</p><h2 className="mt-1 text-xl font-semibold">{producto ? "Editar modelo" : "Nuevo modelo"}</h2></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-surface-muted" aria-label="Cerrar"><X className="size-5" /></button>
        </div>
        <form onSubmit={guardar} className="grid gap-4 p-6 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-semibold">Código<input required value={form.codigo} onChange={(e) => setForm(v => ({ ...v, codigo: e.target.value }))} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-gold/40" placeholder="TDJ-A024" /></label>
          <label className="grid gap-1.5 text-xs font-semibold">Nombre<input required value={form.nombre} onChange={(e) => setForm(v => ({ ...v, nombre: e.target.value, slug: v.slug || slugify(e.target.value) }))} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-gold/40" placeholder="Anillo Aura" /></label>
          <label className="grid gap-1.5 text-xs font-semibold">Slug<input required value={form.slug} onChange={(e) => setForm(v => ({ ...v, slug: slugify(e.target.value) }))} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-gold/40" /></label>
          <label className="grid gap-1.5 text-xs font-semibold">Categoría<input value={form.categoria} onChange={(e) => setForm(v => ({ ...v, categoria: e.target.value }))} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-gold/40" /></label>
          <label className="grid gap-1.5 text-xs font-semibold">Precio desde<input type="number" min="0" step="0.01" value={form.precio_desde} onChange={(e) => setForm(v => ({ ...v, precio_desde: e.target.value }))} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-gold/40" /></label>
          <label className="grid gap-1.5 text-xs font-semibold">Moneda<input maxLength={3} value={form.moneda} onChange={(e) => setForm(v => ({ ...v, moneda: e.target.value.toUpperCase() }))} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-gold/40" /></label>
          <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Imagen principal
            <div className="flex flex-col gap-2 sm:flex-row">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={subiendo} onChange={(e) => { const file = e.target.files?.[0]; e.currentTarget.value = ""; if (file) void subirImagen(file, "principal"); }} className="h-11 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal" />
              <input type="url" value={form.imagen_principal_url} onChange={(e) => setForm(v => ({ ...v, imagen_principal_url: e.target.value }))} className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-gold/40" placeholder="O pega una URL externa" />
            </div>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Galería
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={subiendo} onChange={(e) => { const files = Array.from(e.target.files ?? []); e.currentTarget.value = ""; void Promise.all(files.map((file) => subirImagen(file, "galeria"))); }} className="h-11 rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal" />
            <textarea rows={3} value={form.galeria} onChange={(e) => setForm(v => ({ ...v, galeria: e.target.value }))} className="rounded-xl border border-border bg-background px-3 py-3 text-sm font-normal outline-none focus:border-gold/40" placeholder="También puedes pegar URLs externas, una por línea." />
            {subiendo ? <span className="text-[11px] text-muted-foreground">Subiendo imágenes… {progresoSubida}%</span> : null}
          </label>
          <label className="grid gap-1.5 text-xs font-semibold">Video (URL)<input type="url" value={form.video_url} onChange={(e) => setForm(v => ({ ...v, video_url: e.target.value }))} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-gold/40" placeholder="https://..." /></label>
          <label className="grid gap-1.5 text-xs font-semibold">AURUM Render (URL)<input type="url" value={form.aurum_render_url} onChange={(e) => setForm(v => ({ ...v, aurum_render_url: e.target.value }))} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-gold/40" placeholder="https://..." /></label>
          <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Descripción<textarea rows={4} value={form.descripcion} onChange={(e) => setForm(v => ({ ...v, descripcion: e.target.value }))} className="rounded-xl border border-border bg-background px-3 py-3 text-sm font-normal outline-none focus:border-gold/40" /></label>
          {error ? <p className="sm:col-span-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={onClose} disabled={guardando || subiendo} className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold disabled:opacity-50">Cancelar</button><button type="submit" disabled={guardando || subiendo} className="rounded-xl bg-gold px-4 py-2.5 text-xs font-semibold text-gold-foreground disabled:opacity-50">{subiendo ? "Subiendo imágenes…" : guardando ? "Guardando…" : producto ? "Guardar cambios" : "Crear modelo"}</button></div>
        </form>
      </div>
    </div>
  );
}
