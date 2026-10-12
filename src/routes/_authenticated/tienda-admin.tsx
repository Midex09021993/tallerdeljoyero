import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, EyeOff, ImagePlus, PackagePlus, Pencil, Plus, Save, Store, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/tienda-admin")({
  head: () => ({ meta: [{ title: "Gestión de tienda de insumos — Taller del Joyero" }] }),
  component: GestionTiendaInsumos,
});

type Producto = { id: string; nombre: string; slug: string; codigo: string | null; categoria: string; descripcion: string | null; imagen_url: string | null; precio: number | null; moneda: string; stock: number | null; unidad: string; publicado: boolean; destacado: boolean };
type Formulario = { nombre: string; codigo: string; categoria: string; descripcion: string; imagen_url: string; precio: string; stock: string; unidad: string; moneda: string; publicado: boolean; destacado: boolean };
const VACIO: Formulario = { nombre: "", codigo: "", categoria: "Resinas", descripcion: "", imagen_url: "", precio: "", stock: "", unidad: "unidad", moneda: "PEN", publicado: false, destacado: false };
const slugify = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

function GestionTiendaInsumos() {
  const { data: sesion, isLoading: cargandoSesion } = useSesion();
  const qc = useQueryClient();
  const [mensaje, setMensaje] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState<Formulario>(VACIO);
  const [imagenArchivo, setImagenArchivo] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const esFadilab = /fadilab/i.test(sesion?.participante?.nombre ?? "");
  const autorizado = Boolean(esFadilab && sesion?.esAdmin && sesion?.participante?.id);
  const { data: tienda, isLoading: cargandoTienda, error: errorTienda } = useQuery({
    queryKey: ["tienda-insumos-admin", sesion?.participante?.id],
    enabled: autorizado,
    queryFn: async () => {
      const { data, error } = await supabase.from("tiendas_insumos").select("id, slug, nombre_publico, descripcion, whatsapp, moneda, visible").eq("participante_id", sesion!.participante!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: productos = [], isLoading: cargandoProductos } = useQuery({
    queryKey: ["tienda-insumos-productos-admin", tienda?.id],
    enabled: Boolean(tienda?.id && autorizado),
    queryFn: async () => {
      const { data, error } = await supabase.from("tienda_insumos_productos").select("id, nombre, slug, codigo, categoria, descripcion, imagen_url, precio, moneda, stock, unidad, publicado, destacado").eq("tienda_id", tienda!.id).order("orden", { ascending: true }).order("nombre", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Producto[];
    },
  });

  async function activarTienda() {
    if (!autorizado || !sesion?.participante?.id) return;
    setGuardando(true); setMensaje("");
    try {
      const { error } = await supabase.from("tiendas_insumos").upsert({
        participante_id: sesion.participante.id,
        slug: "fadilab-insumos",
        nombre_publico: "FADILAB · Insumos para joyería",
        descripcion: "Resinas, cubiletes y materiales seleccionados para el trabajo profesional de joyería.",
        moneda: "PEN",
        visible: true,
      }, { onConflict: "participante_id" });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["tienda-insumos-admin", sesion.participante.id] });
      setMensaje("Tienda activada. Ya puedes registrar y publicar productos.");
    } catch (e) { setMensaje(e instanceof Error ? e.message : "No se pudo activar la tienda."); }
    finally { setGuardando(false); }
  }

  function editar(p: Producto) {
    setEditando(p.id);
    setForm({ nombre: p.nombre, codigo: p.codigo ?? "", categoria: p.categoria, descripcion: p.descripcion ?? "", imagen_url: p.imagen_url ?? "", precio: p.precio == null ? "" : String(p.precio), stock: p.stock == null ? "" : String(p.stock), unidad: p.unidad, moneda: p.moneda || "PEN", publicado: p.publicado, destacado: p.destacado });
    setImagenArchivo(null);
    setMensaje("");
  }
  function nuevo() { setEditando("nuevo"); setForm(VACIO); setImagenArchivo(null); setMensaje(""); }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!autorizado || !tienda?.id) return;
    const nombre = form.nombre.trim();
    const precio = form.precio.trim() ? Number(form.precio) : null;
    const stock = form.stock.trim() ? Number(form.stock) : null;
    if (!nombre) { setMensaje("El nombre del producto es obligatorio."); return; }
    if (precio !== null && (!Number.isFinite(precio) || precio < 0)) { setMensaje("El precio debe ser un número válido igual o mayor que cero."); return; }
    if (stock !== null && (!Number.isFinite(stock) || stock < 0)) { setMensaje("El stock debe ser un número válido igual o mayor que cero."); return; }
    setGuardando(true); setMensaje("");
    try {
      let imagenUrl = form.imagen_url.trim() || null;
      if (imagenArchivo) {
        if (!imagenArchivo.type.startsWith("image/")) throw new Error("Selecciona un archivo de imagen válido.");
        if (imagenArchivo.size > 5 * 1024 * 1024) throw new Error("La imagen no puede superar los 5 MB.");
        const extension = imagenArchivo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const rutaImagen = `${sesion!.participante!.id}/tienda-insumos/${crypto.randomUUID()}.${extension}`;
        const { error: errorSubida } = await supabase.storage.from("catalogo-joyas").upload(rutaImagen, imagenArchivo, { contentType: imagenArchivo.type, upsert: false });
        if (errorSubida) throw new Error(`No se pudo subir la imagen: ${errorSubida.message}`);
        const { data: imagenPublica } = supabase.storage.from("catalogo-joyas").getPublicUrl(rutaImagen);
        if (!imagenPublica?.publicUrl) throw new Error("No se pudo obtener la dirección pública de la imagen subida.");
        imagenUrl = imagenPublica.publicUrl;
      }
      const payload = { tienda_id: tienda.id, nombre, slug: slugify(nombre), codigo: form.codigo.trim() || null, categoria: form.categoria.trim() || "Otros", descripcion: form.descripcion.trim() || null, imagen_url: imagenUrl, precio, stock, unidad: form.unidad.trim() || "unidad", moneda: form.moneda.trim().toUpperCase() || "PEN", publicado: form.publicado, destacado: form.destacado };
      const result = editando && editando !== "nuevo"
        ? await supabase.from("tienda_insumos_productos").update(payload).eq("id", editando).eq("tienda_id", tienda.id)
        : await supabase.from("tienda_insumos_productos").insert(payload);
      if (result.error) throw result.error;
      setEditando(null); setForm(VACIO); setImagenArchivo(null);
      await qc.invalidateQueries({ queryKey: ["tienda-insumos-productos-admin", tienda.id] });
      setMensaje("Producto guardado correctamente.");
    } catch (e) { setMensaje(e instanceof Error ? e.message : "No se pudo guardar el producto."); }
    finally { setGuardando(false); }
  }

  async function eliminar(p: Producto) {
    if (!tienda?.id || !autorizado || !window.confirm(`¿Eliminar “${p.nombre}”? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("tienda_insumos_productos").delete().eq("id", p.id).eq("tienda_id", tienda.id);
    if (error) { setMensaje(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["tienda-insumos-productos-admin", tienda.id] });
    setMensaje("Producto eliminado.");
  }

  async function cambiarPublicado(p: Producto) {
    if (!tienda?.id || !autorizado) return;
    const { error } = await supabase.from("tienda_insumos_productos").update({ publicado: !p.publicado }).eq("id", p.id).eq("tienda_id", tienda.id);
    if (error) { setMensaje(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["tienda-insumos-productos-admin", tienda.id] });
  }

  if (cargandoSesion) return <AppShell titulo="Tienda de insumos" subtitulo="Verificando permisos…"><p className="rounded-xl border border-border p-5 text-sm">Cargando sesión…</p></AppShell>;
  if (!autorizado) return <AppShell titulo="Tienda de insumos" subtitulo="Acceso restringido"><section className="rounded-2xl border border-border bg-card p-6"><h2 className="font-semibold">Módulo reservado para FADILAB</h2><p className="mt-2 text-sm text-muted-foreground">La gestión de esta tienda solo está disponible para una cuenta administradora vinculada al participante FADILAB.</p><Link to="/inicio" className="mt-4 inline-flex items-center gap-2 text-sm text-gold"><ArrowLeft className="size-4" /> Volver al inicio</Link></section></AppShell>;

  return <AppShell titulo="Tienda de insumos" subtitulo="FADILAB · Gestión interna de productos">
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-gold/20 bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3"><div className="grid size-11 place-items-center rounded-xl bg-gold/10 text-gold"><Store className="size-5" /></div><div><h2 className="font-semibold">FADILAB · Insumos para joyería</h2><p className="mt-1 max-w-xl text-sm text-muted-foreground">Administra resinas, cubiletes y otros materiales. Los productos publicados aparecen en la tienda pública.</p></div></div>
        {tienda?.visible ? <a href="/tienda" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm hover:border-gold/50"><Eye className="size-4" /> Ver tienda pública</a> : <button type="button" disabled={guardando} onClick={() => void activarTienda()} className="rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-50">{guardando ? "Activando…" : "Activar tienda FADILAB"}</button>}
      </div>
      {errorTienda && <p className="rounded-xl border border-red-300 p-4 text-sm text-red-700">No se pudo consultar la tienda: {String(errorTienda.message ?? errorTienda)}</p>}
      {mensaje && <p role="status" className="rounded-xl border border-border bg-card p-3 text-sm">{mensaje}</p>}
      {tienda && <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Inventario de la tienda</h2><p className="mt-1 text-xs text-muted-foreground">{productos.length} productos registrados · {productos.filter(p => p.publicado).length} publicados</p></div><button type="button" onClick={nuevo} className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-ink"><Plus className="size-4" /> Nuevo producto</button></div>
        {cargandoTienda || cargandoProductos ? <p className="mt-5 text-sm text-muted-foreground">Cargando productos…</p> : productos.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-border p-8 text-center"><PackagePlus className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Todavía no hay productos</p><p className="mt-1 text-xs text-muted-foreground">Añade el primer producto para comenzar el catálogo.</p></div> : <div className="mt-5 divide-y divide-border">{productos.map(p => <article key={p.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3">{p.imagen_url ? <img src={p.imagen_url} alt="" className="size-14 rounded-xl object-cover" /> : <div className="grid size-14 place-items-center rounded-xl bg-surface-muted"><Store className="size-5 text-muted-foreground" /></div>}<div className="min-w-0"><p className="truncate text-sm font-semibold">{p.nombre}</p><p className="mt-1 text-xs text-muted-foreground">{p.categoria} · {p.precio == null ? "Consultar precio" : new Intl.NumberFormat("es-PE", { style: "currency", currency: p.moneda || "PEN" }).format(p.precio)} · {p.stock == null ? "Stock no indicado" : `${p.stock} ${p.unidad}`}</p><span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] ${p.publicado ? "bg-emerald-500/10 text-emerald-700" : "bg-surface-muted text-muted-foreground"}`}>{p.publicado ? "Publicado" : "Borrador"}</span></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => editar(p)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs"><Pencil className="size-3.5" /> Editar</button><button type="button" onClick={() => void cambiarPublicado(p)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs">{p.publicado ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}{p.publicado ? "Ocultar" : "Publicar"}</button><button type="button" onClick={() => void eliminar(p)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700"><Trash2 className="size-3.5" /> Eliminar</button></div></article>)}</div>}
      </section>}
      {editando && <section className="rounded-2xl border border-gold/25 bg-card p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">{editando === "nuevo" ? "Nuevo producto" : "Editar producto"}</h2><button type="button" onClick={() => { setEditando(null); setForm(VACIO); setImagenArchivo(null); }} className="text-xs text-muted-foreground">Cancelar</button></div><form onSubmit={(e) => void guardar(e)} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium">Nombre del producto *<input required maxLength={140} value={form.nombre} onChange={e => setForm({...form,nombre:e.target.value})} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" placeholder="Resina castable 1 kg" /></label>
        <label className="text-xs font-medium">Código interno<input maxLength={60} value={form.codigo} onChange={e => setForm({...form,codigo:e.target.value})} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" placeholder="RES-001" /></label>
        <label className="text-xs font-medium">Categoría<select value={form.categoria} onChange={e => setForm({...form,categoria:e.target.value})} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm">{["Resinas","Cubiletes","Yesos e inversiones","Ceras","Herramientas","Consumibles","Otros"].map(c => <option key={c}>{c}</option>)}</select></label>
        <label className="text-xs font-medium">Precio (PEN)<input type="number" min="0" step="0.01" value={form.precio} onChange={e => setForm({...form,precio:e.target.value})} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" placeholder="Dejar vacío para consultar" /></label>
        <label className="text-xs font-medium">Stock disponible<input type="number" min="0" step="0.001" value={form.stock} onChange={e => setForm({...form,stock:e.target.value})} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" placeholder="Opcional" /></label>
        <label className="text-xs font-medium">Unidad de venta<input maxLength={30} value={form.unidad} onChange={e => setForm({...form,unidad:e.target.value})} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" placeholder="unidad, kg, litro…" /></label>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium">Imagen del producto
            <span className="mt-2 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-3 text-sm transition hover:border-gold/60">
              <ImagePlus className="size-4" /> {imagenArchivo ? imagenArchivo.name : "Elegir imagen desde tu dispositivo"}
              <input type="file" accept="image/*" className="sr-only" onChange={e => { const archivo = e.target.files?.[0] ?? null; setImagenArchivo(archivo); if (archivo) setForm({...form, imagen_url: ""}); }} />
            </span>
          </label>
          <p className="mt-2 text-xs text-muted-foreground">Formatos de imagen compatibles · máximo 5 MB. Se guardará en el almacenamiento de la web.</p>
          {(imagenArchivo || form.imagen_url) && <div className="mt-3 flex items-center gap-3">
            <img src={imagenArchivo ? URL.createObjectURL(imagenArchivo) : form.imagen_url} alt="Vista previa del producto" className="size-20 rounded-xl border border-border object-cover" />
            <button type="button" onClick={() => { setImagenArchivo(null); setForm({...form, imagen_url: ""}); }} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs"><X className="size-3.5" /> Quitar imagen</button>
          </div>}
        </div>
        <label className="text-xs font-medium sm:col-span-2">Descripción<textarea value={form.descripcion} onChange={e => setForm({...form,descripcion:e.target.value})} rows={3} maxLength={1500} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" placeholder="Presentación, compatibilidad, recomendaciones…" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.destacado} onChange={e => setForm({...form,destacado:e.target.checked})} /> Destacar en la tienda</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.publicado} onChange={e => setForm({...form,publicado:e.target.checked})} /> Publicar en la web</label>
        <div className="flex flex-wrap gap-2 sm:col-span-2"><button disabled={guardando} className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-ink disabled:opacity-50"><Save className="size-4" />{guardando ? "Guardando…" : "Guardar producto"}</button><button type="button" onClick={() => { setEditando(null); setForm(VACIO); }} className="rounded-xl border border-border px-5 py-3 text-sm">Cancelar</button></div>
      </form></section>}
      <p className="text-xs text-muted-foreground">La tienda utiliza datos y permisos separados del catálogo de joyas. La arquitectura permite incorporar otros participantes en una etapa posterior.</p>
    </div>
  </AppShell>;
}
