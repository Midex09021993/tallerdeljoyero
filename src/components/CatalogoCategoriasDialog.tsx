import { useEffect, useState } from "react";
import { Plus, Tags, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Categoria = {
  id: string;
  nombre: string;
  slug: string;
  orden: number;
  activo: boolean;
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
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    if (!participanteId) return;
    setCargando(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("catalogo_categorias")
      .select("id, nombre, slug, orden, activo")
      .eq("participante_id", participanteId)
      .order("orden", { ascending: true })
      .order("nombre", { ascending: true });
    if (queryError) setError(queryError.message);
    else setCategorias((data ?? []) as Categoria[]);
    setCargando(false);
  }

  useEffect(() => {
    if (open) void cargar();
  }, [open, participanteId]);

  async function crear() {
    const limpio = nombre.trim();
    if (!limpio) return setError("Escribe el nombre de la categoría.");
    setGuardando(true);
    setError(null);
    const maxOrden = categorias.reduce((max, item) => Math.max(max, item.orden), 0);
    const { error: insertError } = await supabase.from("catalogo_categorias").insert({
      participante_id: participanteId,
      nombre: limpio,
      slug: slugify(limpio),
      orden: maxOrden + 10,
    });
    if (insertError) setError(insertError.message);
    else {
      setNombre("");
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
      .eq("categoria", item.nombre);
    if (countError) {
      setError(countError.message);
      return;
    }
    if ((count ?? 0) > 0) {
      setError(`No puedes eliminar "${item.nombre}" porque tiene ${count} modelo(s) asociado(s). Ocúltala para conservar el historial.`);
      return;
    }
    if (!window.confirm(`¿Eliminar la categoría "${item.nombre}"?`)) return;
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
    <div className="fixed inset-0 z-[55] grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-gold/20 bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-gold">Catálogo maestro</p>
            <h2 className="mt-1 text-xl font-semibold">Categorías</h2>
            <p className="mt-1 text-xs text-muted-foreground">Controla las opciones disponibles al crear una ficha.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-surface-muted" aria-label="Cerrar"><X className="size-5" /></button>
        </div>

        <div className="grid gap-5 p-6">
          <div className="flex gap-2">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void crear(); } }}
              placeholder="Nueva categoría, por ejemplo: Brazaletes"
              className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/40"
            />
            <button type="button" onClick={() => void crear()} disabled={guardando} className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-xs font-semibold text-gold-foreground disabled:opacity-50">
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
                    <p className="text-sm font-semibold">{item.nombre}</p>
                    <p className="text-[10px] text-muted-foreground">/{item.slug}</p>
                  </div>
                  <button type="button" onClick={() => void cambiarActivo(item)} className="rounded-lg bg-surface-muted px-2.5 py-1.5 text-[10px] font-semibold">
                    {item.activo ? "Activa" : "Oculta"}
                  </button>
                  <button type="button" onClick={() => void eliminar(item)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/5 hover:text-destructive" aria-label={`Eliminar ${item.nombre}`}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">Todavía no hay categorías.</p>
          )}

          <p className="text-[11px] text-muted-foreground">
            Las categorías ocultas dejan de aparecer en el desplegable, pero no borran modelos existentes.
          </p>
        </div>
      </div>
    </div>
  );
}
