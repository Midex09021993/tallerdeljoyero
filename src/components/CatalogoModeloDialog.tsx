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
  metal_principal: string | null;
  peso_gramos: number | null;
  piedras: string | null;
  medidas: string | null;
  talla: string | null;
  tecnica: string | null;
  acabado: string | null;
  disponibilidad: string;
  tiempo_fabricacion_dias: number | null;
  ficha_tecnica_url: string | null;
  mostrar_precio: boolean;
  mostrar_ficha_tecnica: boolean;
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
    precio_desde: "", moneda: "PEN",
    metal_principal: "", peso_gramos: "", piedras: "", medidas: "", talla: "",
    tecnica: "", acabado: "", disponibilidad: "Consultar", tiempo_fabricacion_dias: "",
    ficha_tecnica_url: "", mostrar_precio: true, mostrar_ficha_tecnica: true,
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
      metal_principal: producto?.metal_principal ?? "",
      peso_gramos: producto?.peso_gramos == null ? "" : String(producto.peso_gramos),
      piedras: producto?.piedras ?? "",
      medidas: producto?.medidas ?? "",
      talla: producto?.talla ?? "",
      tecnica: producto?.tecnica ?? "",
      acabado: producto?.acabado ?? "",
      disponibilidad: producto?.disponibilidad ?? "Consultar",
      tiempo_fabricacion_dias: producto?.tiempo_fabricacion_dias == null ? "" : String(producto.tiempo_fabricacion_dias),
      ficha_tecnica_url: producto?.ficha_tecnica_url ?? "",
      mostrar_precio: producto?.mostrar_precio ?? true,
      mostrar_ficha_tecnica: producto?.mostrar_ficha_tecnica ?? true,
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
      await subirConProgreso({ bucket: "catalogo-joyas", ruta, file, onProgreso: setProgresoSubida });
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
    const nombre = form.nombre.trim();
    const slug = slugify(form.slug || nombre);
    const precio = form.precio_desde.trim() === "" ? null : Number(form.precio_desde);
    const peso = form.peso_gramos.trim() === "" ? null : Number(form.peso_gramos);
    const tiempo = form.tiempo_fabricacion_dias.trim() === "" ? null : Number(form.tiempo_fabricacion_dias);

    if (!nombre || !slug) return setError("Nombre y slug son obligatorios.");
    if (precio !== null && (!Number.isFinite(precio) || precio <= 0)) return setError("El precio debe ser mayor que 0 o dejarse vacío para mostrar 'Consultar'.");
    if (peso !== null && (!Number.isFinite(peso) || peso <= 0)) return setError("El peso debe ser mayor que 0.");
    if (tiempo !== null && (!Number.isInteger(tiempo) || tiempo <= 0)) return setError("El tiempo de fabricación debe ser un número entero mayor que 0.");

    setGuardando(true);
    setError(null);
    try {
      const payload = {
        participante_id: participanteId,
        nombre,
        slug,
        categoria: form.categoria.trim() || "Sin categoría",
        descripcion: form.descripcion.trim() || null,
        imagen_principal_url: form.imagen_principal_url.trim() || null,
        galeria: form.galeria.split(/\n/).map((value) => value.trim()).filter(Boolean),
        video_url: form.video_url.trim() || null,
        aurum_render_url: form.aurum_render_url.trim() || null,
        precio_desde: precio,
        moneda: form.moneda.trim().toUpperCase() || "PEN",
        metal_principal: form.metal_principal.trim() || null,
        peso_gramos: peso,
        piedras: form.piedras.trim() || null,
        medidas: form.medidas.trim() || null,
        talla: form.talla.trim() || null,
        tecnica: form.tecnica.trim() || null,
        acabado: form.acabado.trim() || null,
        disponibilidad: form.disponibilidad.trim() || "Consultar",
        tiempo_fabricacion_dias: tiempo,
        ficha_tecnica_url: form.ficha_tecnica_url.trim() || null,
        mostrar_precio: form.mostrar_precio,
        mostrar_ficha_tecnica: form.mostrar_ficha_tecnica,
      };

      const result = producto
        ? await supabase.from("catalogo_productos").update(payload).eq("id", producto.id).eq("participante_id", participanteId)
        : await supabase.from("catalogo_productos").insert(payload).select("id, codigo, nombre, participante_id").single();

      if (result.error) {
        const detalle = [result.error.message, result.error.details, result.error.hint, result.error.code ? `Código: ${result.error.code}` : ""].filter(Boolean).join(" · ");
        throw new Error(detalle || "Supabase rechazó el guardado del modelo.");
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el modelo.");
    } finally {
      setGuardando(false);
    }
  }

  const input = "h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-gold/40";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-gold/20 bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-5">
          <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-gold">Catálogo maestro</p><h2 className="mt-1 text-xl font-semibold">{producto ? "Editar ficha de joya" : "Nueva ficha de joya"}</h2></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-surface-muted" aria-label="Cerrar"><X className="size-5" /></button>
        </div>

        <form onSubmit={guardar} className="grid gap-5 p-6">
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-gold">Identidad</p><p className="mt-1 text-xs text-muted-foreground">Datos que identifican la pieza en el catálogo.</p></div>
            <label className="grid gap-1.5 text-xs font-semibold">Código
              <input value={form.codigo} readOnly className={`${input} bg-surface-muted font-mono font-semibold text-muted-foreground`} placeholder="Se genera automáticamente" />
              <span className="text-[10px] font-normal text-muted-foreground">{producto ? "Código permanente." : "Se asignará automáticamente al crearla."}</span>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">Nombre<input required value={form.nombre} onChange={(e) => setForm(v => ({ ...v, nombre: e.target.value, slug: v.slug || slugify(e.target.value) }))} className={input} placeholder="Anillo Aura" /></label>
            <label className="grid gap-1.5 text-xs font-semibold">Slug público<input required value={form.slug} onChange={(e) => setForm(v => ({ ...v, slug: slugify(e.target.value) }))} className={input} /><span className="text-[10px] font-normal text-muted-foreground">Será la identificación pública de la pieza.</span></label>
            <label className="grid gap-1.5 text-xs font-semibold">Categoría<input value={form.categoria} onChange={(e) => setForm(v => ({ ...v, categoria: e.target.value }))} className={input} /></label>
          </section>

          <section className="grid gap-4 rounded-2xl border border-border bg-surface-muted/30 p-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-gold">Ficha técnica</p><p className="mt-1 text-xs text-muted-foreground">Información descriptiva de la pieza. No contiene costos internos.</p></div>
            <label className="grid gap-1.5 text-xs font-semibold">Metal principal<input value={form.metal_principal} onChange={e => setForm(v => ({ ...v, metal_principal: e.target.value }))} className={input} placeholder="Oro 18K" /></label>
            <label className="grid gap-1.5 text-xs font-semibold">Peso (g)<input type="number" min="0" step="0.001" value={form.peso_gramos} onChange={e => setForm(v => ({ ...v, peso_gramos: e.target.value }))} className={input} placeholder="5.250" /></label>
            <label className="grid gap-1.5 text-xs font-semibold">Piedras<input value={form.piedras} onChange={e => setForm(v => ({ ...v, piedras: e.target.value }))} className={input} placeholder="Diamante · 0.20 ct" /></label>
            <label className="grid gap-1.5 text-xs font-semibold">Medidas<input value={form.medidas} onChange={e => setForm(v => ({ ...v, medidas: e.target.value }))} className={input} placeholder="18 × 12 mm" /></label>
            <label className="grid gap-1.5 text-xs font-semibold">Talla<input value={form.talla} onChange={e => setForm(v => ({ ...v, talla: e.target.value }))} className={input} placeholder="16 · ajustable" /></label>
            <label className="grid gap-1.5 text-xs font-semibold">Técnica<input value={form.tecnica} onChange={e => setForm(v => ({ ...v, tecnica: e.target.value }))} className={input} placeholder="Cera perdida / 3D" /></label>
            <label className="grid gap-1.5 text-xs font-semibold">Acabado<input value={form.acabado} onChange={e => setForm(v => ({ ...v, acabado: e.target.value }))} className={input} placeholder="Pulido espejo" /></label>
            <label className="grid gap-1.5 text-xs font-semibold">Disponibilidad<select value={form.disponibilidad} onChange={e => setForm(v => ({ ...v, disponibilidad: e.target.value }))} className={input}><option>Consultar</option><option>Disponible</option><option>Por encargo</option><option>No disponible</option></select></label>
            <label className="grid gap-1.5 text-xs font-semibold">Fabricación (días)<input type="number" min="1" step="1" value={form.tiempo_fabricacion_dias} onChange={e => setForm(v => ({ ...v, tiempo_fabricacion_dias: e.target.value }))} className={input} placeholder="7" /></label>
            <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Ficha técnica externa (URL)<input type="url" value={form.ficha_tecnica_url} onChange={e => setForm(v => ({ ...v, ficha_tecnica_url: e.target.value }))} className={input} placeholder="https://..." /></label>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-gold">Comercial</p></div>
            <label className="grid gap-1.5 text-xs font-semibold">Precio desde<input type="number" min="0" step="0.01" value={form.precio_desde} onChange={(e) => setForm(v => ({ ...v, precio_desde: e.target.value }))} className={input} placeholder="Dejar vacío = Consultar" /></label>
            <label className="grid gap-1.5 text-xs font-semibold">Moneda<input maxLength={3} value={form.moneda} onChange={(e) => setForm(v => ({ ...v, moneda: e.target.value.toUpperCase() }))} className={input} /></label>
            <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-xs sm:col-span-2"><input type="checkbox" checked={form.mostrar_precio} onChange={e => setForm(v => ({ ...v, mostrar_precio: e.target.checked }))} /> Mostrar precio en el catálogo público</label>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-gold">Multimedia</p></div>
            <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Imagen principal
              <div className="flex flex-col gap-2 sm:flex-row"><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={subiendo} onChange={(e) => { const file = e.target.files?.[0]; e.currentTarget.value = ""; if (file) void subirImagen(file, "principal"); }} className={`${input} flex-1 py-2`} /><input type="url" value={form.imagen_principal_url} onChange={e => setForm(v => ({ ...v, imagen_principal_url: e.target.value }))} className={`${input} flex-1`} placeholder="O pega una URL externa" /></div>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Galería
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={subiendo} onChange={(e) => { const files = Array.from(e.target.files ?? []); e.currentTarget.value = ""; void Promise.all(files.map((file) => subirImagen(file, "galeria"))); }} className={`${input} py-2`} />
              <textarea rows={3} value={form.galeria} onChange={e => setForm(v => ({ ...v, galeria: e.target.value }))} className="rounded-xl border border-border bg-background px-3 py-3 text-sm font-normal outline-none focus:border-gold/40" placeholder="Una URL por línea." />
              {subiendo ? <span className="text-[11px] text-muted-foreground">Subiendo imágenes… {progresoSubida}%</span> : null}
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">Video (URL)<input type="url" value={form.video_url} onChange={e => setForm(v => ({ ...v, video_url: e.target.value }))} className={input} placeholder="https://..." /></label>
            <label className="grid gap-1.5 text-xs font-semibold">AURUM Render (URL)<input type="url" value={form.aurum_render_url} onChange={e => setForm(v => ({ ...v, aurum_render_url: e.target.value }))} className={input} placeholder="https://..." /></label>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-gold">Descripción y publicación</p></div>
            <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Descripción pública<textarea rows={4} value={form.descripcion} onChange={e => setForm(v => ({ ...v, descripcion: e.target.value }))} className="rounded-xl border border-border bg-background px-3 py-3 text-sm font-normal outline-none focus:border-gold/40" /></label>
            <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-xs sm:col-span-2"><input type="checkbox" checked={form.mostrar_ficha_tecnica} onChange={e => setForm(v => ({ ...v, mostrar_ficha_tecnica: e.target.checked }))} /> Mostrar ficha técnica pública</label>
            <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Notas internas<textarea rows={3} value={""} readOnly className="rounded-xl border border-border bg-surface-muted px-3 py-3 text-sm text-muted-foreground" placeholder="Reservado para una próxima sección interna de gestión." /></label>
          </section>

          {error ? <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2"><button type="button" onClick={onClose} disabled={guardando || subiendo} className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold disabled:opacity-50">Cancelar</button><button type="submit" disabled={guardando || subiendo} className="rounded-xl bg-gold px-4 py-2.5 text-xs font-semibold text-gold-foreground disabled:opacity-50">{subiendo ? "Subiendo imágenes…" : guardando ? "Guardando…" : producto ? "Guardar cambios" : "Crear ficha"}</button></div>
        </form>
      </div>
    </div>
  );
}
