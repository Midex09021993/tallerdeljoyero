import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Panel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Especialidad = { id: string; nombre: string; categoria: string | null; activa: boolean };
type Participante = { id: string; nombre: string; razon_social: string | null };
type Relacion = { participante_id: string; especialidad_id: string };

export function EspecialidadesOwner() {
  const qc = useQueryClient();
  const [buscar, setBuscar] = useState("");
  const [edit, setEdit] = useState<Especialidad | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState({ nombre: "", categoria: "", activa: true });
  const [asignar, setAsignar] = useState<Participante | null>(null);

  const { data: especialidades = [], isLoading } = useQuery({
    queryKey: ["ecosistema-especialidades"],
    queryFn: async () => {
      const { data, error } = await supabase.from("especialidades").select("*").order("categoria").order("nombre");
      if (error) throw error;
      return (data ?? []) as Especialidad[];
    },
  });
  const { data: participantes = [] } = useQuery({
    queryKey: ["ecosistema-participantes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ecosistema_participantes").select("id,nombre,razon_social").order("nombre");
      if (error) throw error;
      return (data ?? []) as Participante[];
    },
  });
  const lista = useMemo(() => especialidades.filter(e => {
    const q = buscar.trim().toLowerCase();
    return !q || e.nombre.toLowerCase().includes(q) || (e.categoria ?? "").toLowerCase().includes(q);
  }), [especialidades, buscar]);

  function abrirNuevo() { setEdit(null); setForm({ nombre: "", categoria: "", activa: true }); setNuevo(true); }
  function editar(e: Especialidad) { setNuevo(false); setEdit(e); setForm({ nombre: e.nombre, categoria: e.categoria ?? "", activa: e.activa }); }

  async function guardar() {
    if (!form.nombre.trim()) { toast.error("El nombre es obligatorio"); return; }
    const payload = { nombre: form.nombre.trim(), categoria: form.categoria.trim() || null, activa: form.activa };
    const query = edit
      ? supabase.from("especialidades").update(payload).eq("id", edit.id)
      : supabase.from("especialidades").insert(payload);
    const { error } = await query;
    if (error) { toast.error(error.message); return; }
    toast.success(edit ? "Especialidad actualizada" : "Especialidad creada");
    setEdit(null); setNuevo(false);
    await qc.invalidateQueries({ queryKey: ["ecosistema-especialidades"] });
  }

  async function eliminar(e: Especialidad) {
    if (!confirm(`¿Eliminar la especialidad "${e.nombre}"?`)) return;
    const { error } = await supabase.from("especialidades").delete().eq("id", e.id);
    if (error) toast.error("No se puede eliminar: puede estar asignada a participantes.");
    else { toast.success("Especialidad eliminada"); await qc.invalidateQueries({ queryKey: ["ecosistema-especialidades"] }); }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Especialidades</p><p className="mt-1 text-2xl font-semibold">{especialidades.length}</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Activas</p><p className="mt-1 text-2xl font-semibold">{especialidades.filter(e => e.activa).length}</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Participantes</p><p className="mt-1 text-2xl font-semibold">{participantes.length}</p></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel titulo="Catálogo de especialidades">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row">
            <Input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar especialidad o categoría…" />
            <Button onClick={abrirNuevo}>+ Nueva</Button>
          </div>
          {isLoading ? <p className="p-6 text-sm text-muted-foreground">Cargando…</p> : null}
          <div className="divide-y divide-border">
            {lista.map(e => (
              <div key={e.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div><p className="text-sm font-medium">{e.nombre}</p><p className="text-xs text-muted-foreground">{e.categoria || "Sin categoría"} · {e.activa ? "Activa" : "Inactiva"}</p></div>
                <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => editar(e)}>Editar</Button><Button variant="ghost" size="sm" onClick={() => void eliminar(e)}>Eliminar</Button></div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel titulo="Especialidades por participante">
          <div className="divide-y divide-border">
            {participantes.map(p => <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3"><div><p className="text-sm font-medium">{p.nombre}</p><p className="text-xs text-muted-foreground">{p.razon_social || "Participante"}</p></div><Button variant="outline" size="sm" onClick={() => setAsignar(p)}>Gestionar</Button></div>)}
            {!participantes.length ? <p className="p-6 text-sm text-muted-foreground">Primero crea un participante en Ecosistema.</p> : null}
          </div>
        </Panel>
      </div>

      {(edit || nuevo) ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={e => { if (e.target === e.currentTarget) { setEdit(null); setNuevo(false); } }}>
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl">
            <div className="border-b border-border p-5"><p className="text-lg font-semibold">{edit ? "Editar especialidad" : "Nueva especialidad"}</p><p className="text-xs text-muted-foreground">Solo el Dueño puede modificar este catálogo.</p></div>
            <div className="space-y-4 p-5">
              <label className="text-xs text-muted-foreground">Nombre<Input className="mt-1" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></label>
              <label className="text-xs text-muted-foreground">Categoría<Input className="mt-1" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} placeholder="Ej. Engaste, Diseño, Producción…" /></label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={form.activa} onChange={e => setForm({ ...form, activa: e.target.checked })} /> Especialidad activa</label>
            </div>
            <div className="flex justify-end gap-2 border-t border-border p-5"><Button variant="outline" onClick={() => { setEdit(null); setNuevo(false); }}>Cancelar</Button><Button onClick={() => void guardar()}>Guardar</Button></div>
          </div>
        </div>
      ) : null}

      {asignar ? <Asignador participante={asignar} especialidades={especialidades} onClose={() => setAsignar(null)} /> : null}
    </div>
  );
}

export function Asignador({ participante, especialidades, onClose }: { participante: Participante; especialidades?: Especialidad[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [seleccionadas, setSeleccionadas] = useState<string[] | null>(null);
  const [guardando, setGuardando] = useState(false);
  const { data: actuales = [], isLoading } = useQuery({
    queryKey: ["participante-especialidades", participante.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("participante_especialidades").select("participante_id,especialidad_id").eq("participante_id", participante.id);
      if (error) throw error;
      return (data ?? []) as Relacion[];
    },
  });
  const { data: catalogo = [] } = useQuery({\n    queryKey: ["ecosistema-especialidades"],\n    queryFn: async () => {\n      const { data, error } = await supabase.from("especialidades").select("id,nombre,categoria,activa").eq("activa", true).order("categoria").order("nombre");\n      if (error) throw error;\n      return (data ?? []) as Especialidad[];\n    },\n    enabled: !especialidades?.length,\n  });\n  const opciones = especialidades?.length ? especialidades : catalogo;\n  const ids = seleccionadas ?? actuales.map(r => r.especialidad_id);

  async function guardar() {
    setGuardando(true);
    try {
      const del = await supabase.from("participante_especialidades").delete().eq("participante_id", participante.id);
      if (del.error) throw del.error;
      if (ids.length) {
        const { error } = await supabase.from("participante_especialidades").insert(ids.map(especialidad_id => ({ participante_id: participante.id, especialidad_id })));
        if (error) throw error;
      }
      toast.success("Especialidades asignadas");
      await qc.invalidateQueries({ queryKey: ["participante-especialidades", participante.id] });
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudieron guardar"); }
    finally { setGuardando(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-xl">
      <div className="border-b border-border p-5"><p className="text-lg font-semibold">Especialidades · {participante.nombre}</p><p className="text-xs text-muted-foreground">Selecciona las capacidades que este participante puede ofrecer.</p></div>
      <div className="grid gap-2 p-5 sm:grid-cols-2">{opciones.filter(e => e.activa).map(e => <label key={e.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-surface-muted"><input type="checkbox" checked={ids.includes(e.id)} onChange={ev => setSeleccionadas((ids.includes(e.id) ? ids.filter(x => x !== e.id) : [...ids, e.id]))} /><span><span className="block text-sm">{e.nombre}</span><span className="text-xs text-muted-foreground">{e.categoria || "Sin categoría"}</span></span></label>)}</div>
      {isLoading ? <p className="px-5 pb-3 text-xs text-muted-foreground">Cargando asignaciones…</p> : null}
      <div className="flex justify-end gap-2 border-t border-border p-5"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={guardando || isLoading} onClick={() => void guardar()}>{guardando ? "Guardando…" : `Guardar (${ids.length})`}</Button></div>
    </div>
  </div>;
}
