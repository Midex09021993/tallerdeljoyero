// @ts-nocheck -- tipos generados desfasados respecto al esquema real
import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type CatalogoProductoEditor = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  descripcion: string | null;
  imagen_principal_url: string | null;
  precio_desde: number | null;
  moneda: string;
};

type Props = {
  open: boolean;
  producto: CatalogoProductoEditor | null;
  sedeId: string;
  onClose: () => void;
  onSaved: () => void;
};

function slugify(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export function CatalogoModeloDialog({ open, producto, sedeId, onClose, onSaved }: Props) {
  const [form, setForm] = useState({ codigo: "", nombre: "", slug: "", categoria: "Sin categoría", descripcion: "", imagen_principal_url: "", precio_desde: "", moneda: "PEN" });
  const [guardando, setGuardando] = useState(false);
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
      precio_desde: producto?.precio_desde == null ? "" : String(producto.precio_desde),
      moneda: producto?.moneda || "PEN",
    });
    setError(null);
  }, [open, producto]);

  if (!open) return null;

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
        sede_id: sedeId,
        codigo,
        nombre,
        slug,
        categoria: form.categoria.trim() || "Sin categoría",
        descripcion: form.descripcion.trim() || null,
        imagen_principal_url: form.imagen_principal_url.trim() || null,
        precio_desde: precio,
        moneda: form.moneda.trim().toUpperCase() || "PEN",
      };
      const result = producto
        ? await supabase.from("catalogo_productos").update(payload).eq("id", producto.id)
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
          <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Imagen principal (URL)<input type="url" value={form.imagen_principal_url} onChange={(e) => setForm(v => ({ ...v, imagen_principal_url: e.target.value }))} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-gold/40" /></label>
          <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Descripción<textarea rows={4} value={form.descripcion} onChange={(e) => setForm(v => ({ ...v, descripcion: e.target.value }))} className="rounded-xl border border-border bg-background px-3 py-3 text-sm font-normal outline-none focus:border-gold/40" /></label>
          {error ? <p className="sm:col-span-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold">Cancelar</button><button type="submit" disabled={guardando} className="rounded-xl bg-gold px-4 py-2.5 text-xs font-semibold text-gold-foreground disabled:opacity-50">{guardando ? "Guardando…" : producto ? "Guardar cambios" : "Crear modelo"}</button></div>
        </form>
      </div>
    </div>
  );
}
