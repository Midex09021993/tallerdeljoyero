import { useCallback, useEffect, useState } from "react";
import { Plus, Tags, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Categoria = {
  id: string;
  nombre: string;
  slug: string;
  orden: number;
  activo: boolean;
  parent_id: string | null;
};

type Props = {
  open: boolean;
  participanteId: string;
  onClose: () => void;
  onChanged: () => void;
};

function slugify(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export function CatalogoCategoriasDialog({ open, participanteId, onClose, onChanged }: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nombre, setNombre] = useState("");
  const [parentId, setParentId] = useState("");
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoriaPendienteEliminar, setCategoriaPendienteEliminar] = useState<Categoria | null>(null);

  const cargar = useCallback(async () => {
    if (!participanteId) return;
    setCargando(true);
    setError(null);
    // Match the Fadilab master catalog for every workshop. Older catalogs may
    // predate the standard-category seed and contain only custom categories.
    // Upsert is idempotent and never overwrites an existing category's status/order.
    const categoriasBase = [
      { participante_id: participanteId, nombre: "Anillos", slug: "anillos", orden: 10 },
      { participante_id: participanteId, nombre: "Aretes", slug: "aretes", orden: 20 },
      { participante_id: participanteId, nombre: "Collares", slug: "collares", orden: 30 },
      { participante_id: participanteId, nombre: "Pulseras", slug: "pulseras", orden: 40 },
      { participante_id: participanteId, nombre: "Dijes", slug: "dijes", orden: 50 },
      { participante_id: participanteId, nombre: "Broches", slug: "broches", orden: 60 },
      { participante_id: participanteId, nombre: "Sets / Conjuntos", slug: "sets-conjuntos", orden: 80 },
      { participante_id: participanteId, nombre: "Otros", slug: "otros", orden: 90 },
    ];
    const { error: seedError } = await supabase
      .from("catalogo_categorias")
      .upsert(categoriasBase, { onConflict: "participante_id,slug", ignoreDuplicates: true });
    if (seedError) {
      setError(seedError.message);
      setCargando(false);
      return;
    }
    const { data, error: queryError } = await supabase
      .from("catalogo_categorias")
      .select("id, nombre, slug, orden, activo, parent_id")
      .eq("participante_id", participanteId)
      .order("orden", { ascending: true })
      .order("nombre", { ascending: true });
    if (queryError) setError(queryError.message);
    else setCategorias((data ?? []) as Categoria[]);
    setCargando(false);
  }, [participanteId]);

  useEffect(() => {
    if (open) void cargar();
  }, [open, cargar]);

  async function crear() {
    const limpio = nombre.trim();
    if (!limpio) return setError("Escribe el nombre de la categoría.");
    setGuardando(true);
    setError(null);
    const parent = parentId ? categorias.find((item) => item.id === parentId) : null;
    if (parentId && (!parent || parent.parent_id)) {
      setError("Las subcategorías deben depender de una categoría principal, sin más niveles.");
      setGuardando(false);
      return;
    }
    const maxOrden = categorias.filter((item) => item.parent_id === (parent?.id ?? null)).reduce((max, item) => Math.max(max, item.orden), 0);
    const slugBase = slugify(limpio);
    const slug = parent ? `${parent.slug}-${slugBase}`.slice(0, 80).replace(/-+$/g, "") : slugBase;
    const { error: insertError } = await supabase.from("catalogo_categorias").insert({
      participante_id: participanteId,
      nombre: limpio,
      slug,
      parent_id: parent?.id ?? null,
      orden: maxOrden + 10,
    });
    if (insertError) setError(insertError.message);
    else {
      setNombre("");
      setParentId("");
      await cargar();
      onChanged();
    }
    setGuardando(false);
  }

  async function cambiarActivo(item: Categoria) {
    const { error: updateError } = await supabase
      .from("catalogo_categorias")
      .update({ activo: !item.activo })
      .eq("id", item.id)
      .eq("participante_id", participanteId);
    if (updateError) setError(updateError.message);
    else {
      await cargar();
      onChanged();
    }
  }

  async function eliminar(item: Categoria) {
    setError(null);
    const { count, error: countError } = await supabase
      .from("catalogo_productos")
      .select("id", { count: "exact", head: true })
      .eq("participante_id", participanteId)
      .eq("categoria", item.parent_id ? `${categorias.find((parent) => parent.id === item.parent_id)?.nombre ?? ""} / ${item.nombre}` : item.nombre);
    if (countError) {
      setError(countError.message);
      return;
    }
    if ((count ?? 0) > 0) {
      setError(`No puedes eliminar "${item.nombre}" porque tiene ${count} modelo(s) asociado(s). Ocúltala para conservar el historial.`);
      return;
    }
    const { error: deleteError } = await supabase
      .from("catalogo_categorias")
      .delete()
      .eq("id", item.id)
      .eq("participante_id", participanteId);
    if (deleteError) setError(deleteError.message);
    else {
      await cargar();
      onChanged();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[55] grid place-items-center bg-background/70 p-3 sm:p-5 backdrop-blur-sm">
      <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-gold/20 bg-card shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-7 sm:py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-gold">Catálogo maestro</p>
            <h2 className="mt-1 text-xl font-semibold">Categorías</h2>
            <p className="mt-1 text-xs text-muted-foreground">Controla las opciones disponibles al crear una ficha.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-surface-muted" aria-label="Cerrar"><X className="size-5" /></button>
        </div>

        <div className="grid min-h-0 gap-5 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_auto] md:items-center">
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/40">
              <option value="">Categoría principal</option>
              {categorias.filter((item) => !item.parent_id).map((item) => <option key={item.id} value={item.id}>Subcategoría de: {item.nombre}</option>)}
            </select>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void crear(); } }}
              placeholder={parentId ? "Nueva subcategoría, por ejemplo: Compromiso" : "Nueva categoría, por ejemplo: Brazaletes"}
              className="h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/40"
            />
            <button type="button" onClick={() => void crear()} disabled={guardando} className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gold px-4 py-2 text-xs font-semibold text-gold-foreground disabled:opacity-50">
              <Plus className="size-4" /> Agregar
            </button>
          </div>

          {error ? <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">{error}</p> : null}

          {cargando ? (
            <p className="text-sm text-muted-foreground">Cargando categorías…</p>
          ) : categorias.length ? (
            <div className="divide-y divide-border rounded-2xl border border-border">
              {categorias.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3">
                  <Tags className="size-4 text-gold" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{item.parent_id ? <span className="text-muted-foreground">{categorias.find((parent) => parent.id === item.parent_id)?.nombre} / </span> : null}{item.nombre}</p>
                    <p className="text-[10px] text-muted-foreground">/{item.slug}{item.parent_id ? " · Subcategoría" : " · Principal"}</p>
                  </div>
                  <button type="button" onClick={() => void cambiarActivo(item)} className="rounded-lg bg-surface-muted px-2.5 py-1.5 text-[10px] font-semibold">
                    {item.activo ? "Activa" : "Oculta"}
                  </button>
                  <button type="button" onClick={() => setCategoriaPendienteEliminar(item)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/5 hover:text-destructive" aria-label={`Eliminar ${item.nombre}`}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">Todavía no hay categorías.</p>
          )}

          {categoriaPendienteEliminar && (
            <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="categoria-eliminar-title">
              <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
                <h3 id="categoria-eliminar-title" className="text-base font-semibold">Eliminar categoría</h3>
                <p className="mt-2 text-sm text-muted-foreground">¿Eliminar la categoría “{categoriaPendienteEliminar.nombre}”? Esta acción no se puede deshacer.</p>
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={() => setCategoriaPendienteEliminar(null)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Cancelar</button>
                  <button type="button" onClick={() => { const item = categoriaPendienteEliminar; setCategoriaPendienteEliminar(null); void eliminar(item); }} className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-white">Eliminar</button>
                </div>
              </div>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            Las categorías principales pueden tener subcategorías. Ocultar una categoría no borra los modelos existentes; cada subcategoría usa la ruta de su categoría principal.
          </p>
        </div>
      </div>
    </div>
  );
}
