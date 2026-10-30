import { useMemo, useState, type FormEvent, type ChangeEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, GraduationCap, Users, Plus, Upload, FileText, Download, CalendarDays, ShieldCheck } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { useSesion } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/aula-formacion")({
  head: () => ({ meta: [{ title: "Aula de formación — Taller del Joyero" }, { name: "description", content: "Aula académica para cursos, materiales y seguimiento de formación." }] }),
  component: AulaFormacionPage,
});

type Curso = { id: string; participante_id: string; titulo: string; descripcion: string | null; duracion_horas: number; estado: string };
type Inscripcion = { id: string; curso_id: string; email_alumno: string; nombre_alumno: string | null; estado: string; formacion_cursos: Curso | null };
type Material = { id: string; curso_id: string; titulo: string; descripcion: string | null; nombre_archivo: string; ruta_storage: string; mime_type: string; tamano_bytes: number; created_at: string };
type SesionCurso = { id: string; curso_id: string; numero: number; titulo: string; descripcion: string | null; duracion_horas: number; fecha_programada: string | null; publicada: boolean };

function AulaFormacionPage() {
  const { data: sesion, isLoading: cargandoSesion } = useSesion();
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState("Rhino para Joyería · Nivel 1");
  const [descripcion, setDescripcion] = useState("Formación presencial de modelado 3D para joyería.");
  const [duracion, setDuracion] = useState("20");
  const [cursoSeleccionado, setCursoSeleccionado] = useState("");
  const [nombreAlumno, setNombreAlumno] = useState("");
  const [emailAlumno, setEmailAlumno] = useState("");
  const [numeroSesion, setNumeroSesion] = useState("1");
  const [tituloSesion, setTituloSesion] = useState("");
  const [detalleSesion, setDetalleSesion] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [tituloMaterial, setTituloMaterial] = useState("");
  const [cursoMaterial, setCursoMaterial] = useState("");
  const [publicarMaterial, setPublicarMaterial] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const rolAlumno = Boolean(sesion?.roles.some((r) => r === "gerente" || r === "operario"));
  const fadilabCandidate = sesion?.participantes.find((p) => /fadilab/i.test(p.nombre)) ?? null;
  const permisoDocente = useQuery({
    queryKey: ["aula-formacion-docente-fadilab", sesion?.user.id, fadilabCandidate?.id],
    enabled: Boolean(sesion?.esAdmin && fadilabCandidate?.id),
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("formacion_es_docente", { _participante_id: fadilabCandidate!.id });
      if (error) throw error;
      return data === true;
    },
  });
  const esDocente = Boolean(sesion?.esAdmin && fadilabCandidate?.id && permisoDocente.data === true);
  const participanteId = esDocente ? fadilabCandidate!.id : null;

  const cursosQuery = useQuery({
    queryKey: ["aula-formacion-cursos-docente", participanteId],
    enabled: Boolean(esDocente && participanteId),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_cursos")
        .select("id,participante_id,titulo,descripcion,duracion_horas,estado")
        .eq("participante_id", participanteId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Curso[];
    },
  });
  const cursos = cursosQuery.data ?? [];
  const cursoActivoId = cursoSeleccionado || cursos[0]?.id || "";

  const inscripcionesQuery = useQuery({
    queryKey: ["aula-formacion-inscripciones", participanteId, cursoActivoId],
    enabled: Boolean(esDocente && participanteId && cursoActivoId),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_inscripciones")
        .select("id,curso_id,email_alumno,nombre_alumno,estado")
        .eq("participante_id", participanteId).eq("curso_id", cursoActivoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Omit<Inscripcion, "formacion_cursos">[];
    },
  });
  const sesionesQuery = useQuery({
    queryKey: ["aula-formacion-sesiones", cursoActivoId],
    enabled: Boolean(esDocente && cursoActivoId),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_sesiones")
        .select("id,curso_id,numero,titulo,descripcion,duracion_horas,fecha_programada,publicada")
        .eq("curso_id", cursoActivoId).order("numero");
      if (error) throw error;
      return (data ?? []) as SesionCurso[];
    },
  });

  const alumnoQuery = useQuery({
    queryKey: ["aula-formacion-alumno", sesion?.user.id],
    enabled: Boolean(sesion?.user.id && !esDocente && rolAlumno),
    queryFn: async () => {
      const { error: vincularError } = await (supabase as any).rpc("vincular_inscripciones_formacion");
      if (vincularError) throw vincularError;
      const { data, error } = await (supabase as any).from("formacion_inscripciones")
        .select("id,curso_id,email_alumno,nombre_alumno,estado,formacion_cursos(id,participante_id,titulo,descripcion,duracion_horas,estado)")
        .eq("alumno_user_id", sesion!.user.id).in("estado", ["activo", "finalizado"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Inscripcion[];
    },
  });
  const inscripcionesAlumno = alumnoQuery.data ?? [];
  const idsCursosAlumno = useMemo(() => [...new Set(inscripcionesAlumno.map((i) => i.curso_id))], [inscripcionesAlumno]);
  const materialesAlumnoQuery = useQuery({
    queryKey: ["aula-formacion-materiales-alumno", sesion?.user.id, idsCursosAlumno.join(",")],
    enabled: Boolean(!esDocente && idsCursosAlumno.length),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_materiales")
        .select("id,curso_id,titulo,descripcion,nombre_archivo,ruta_storage,mime_type,tamano_bytes,created_at")
        .in("curso_id", idsCursosAlumno).eq("publicado", true).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Material[];
    },
  });

  async function crearCurso(e: FormEvent) {
    e.preventDefault();
    if (!participanteId || !titulo.trim()) return;
    setOcupado(true); setMensaje("");
    try {
      const slug = titulo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { data, error } = await (supabase as any).from("formacion_cursos").insert({
        participante_id: participanteId, titulo: titulo.trim(), slug, descripcion: descripcion.trim() || null,
        modalidad: "presencial", duracion_horas: Number(duracion) || 0, estado: "borrador", creado_por: sesion?.user.id,
      }).select("id").single();
      if (error) throw error;
      setCursoSeleccionado(data.id);
      await qc.invalidateQueries({ queryKey: ["aula-formacion-cursos-docente", participanteId] });
      setMensaje("Curso creado como borrador. Añade alumnos, sesiones y materiales antes de publicarlo.");
    } catch (err) { setMensaje(err instanceof Error ? err.message : "No se pudo crear el curso."); }
    finally { setOcupado(false); }
  }

  async function matricularAlumno(e: FormEvent) {
    e.preventDefault();
    if (!participanteId || !cursoActivoId || !emailAlumno.trim()) return;
    setOcupado(true); setMensaje("");
    try {
      const email = emailAlumno.trim().toLowerCase();
      const { error } = await (supabase as any).from("formacion_inscripciones").insert({
        participante_id: participanteId, curso_id: cursoActivoId, email_alumno: email,
        nombre_alumno: nombreAlumno.trim() || null, estado: "pendiente",
      });
      if (error) throw error;
      setNombreAlumno(""); setEmailAlumno("");
      await qc.invalidateQueries({ queryKey: ["aula-formacion-inscripciones", participanteId, cursoActivoId] });
      setMensaje("Alumno inscrito. Al ingresar con ese mismo correo, su inscripción se vinculará automáticamente.");
    } catch (err) { setMensaje(err instanceof Error ? err.message : "No se pudo inscribir al alumno."); }
    finally { setOcupado(false); }
  }

  async function crearSesion(e: FormEvent) {
    e.preventDefault();
    if (!participanteId || !cursoActivoId || !tituloSesion.trim()) return;
    setOcupado(true); setMensaje("");
    try {
      const { error } = await (supabase as any).from("formacion_sesiones").insert({
        participante_id: participanteId, curso_id: cursoActivoId, numero: Number(numeroSesion),
        titulo: tituloSesion.trim(), descripcion: detalleSesion.trim() || null, duracion_horas: 2, orden: Number(numeroSesion), publicada: false,
      });
      if (error) throw error;
      setTituloSesion(""); setDetalleSesion("");
      await qc.invalidateQueries({ queryKey: ["aula-formacion-sesiones", cursoActivoId] });
      setMensaje("Sesión creada como borrador.");
    } catch (err) { setMensaje(err instanceof Error ? err.message : "No se pudo crear la sesión."); }
    finally { setOcupado(false); }
  }

  async function publicarSesion(s: SesionCurso) {
    const { error } = await (supabase as any).from("formacion_sesiones").update({ publicada: !s.publicada }).eq("id", s.id).eq("participante_id", participanteId);
    if (error) setMensaje(error.message);
    else { await qc.invalidateQueries({ queryKey: ["aula-formacion-sesiones", cursoActivoId] }); setMensaje(s.publicada ? "Sesión retirada del aula." : "Sesión publicada para los alumnos inscritos."); }
  }

  async function subirMaterial(e: FormEvent) {
    e.preventDefault();
    if (!participanteId || !cursoActivoId || !archivo || !tituloMaterial.trim()) return;
    if (archivo.size > 50 * 1024 * 1024) { setMensaje("El archivo supera el límite de 50 MB."); return; }
    setOcupado(true); setMensaje("");
    try {
      const extension = archivo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      const ruta = participanteId + "/" + cursoActivoId + "/" + crypto.randomUUID() + "." + extension;
      const { error: uploadError } = await supabase.storage.from("formacion-academica").upload(ruta, archivo, { contentType: archivo.type || "application/octet-stream", upsert: false });
      if (uploadError) throw uploadError;
      const { error } = await (supabase as any).from("formacion_materiales").insert({
        participante_id: participanteId, curso_id: cursoActivoId, titulo: tituloMaterial.trim(),
        nombre_archivo: archivo.name, ruta_storage: ruta, mime_type: archivo.type || "application/octet-stream",
        tamano_bytes: archivo.size, publicado: publicarMaterial, subido_por: sesion?.user.id,
      });
      if (error) {
        await supabase.storage.from("formacion-academica").remove([ruta]);
        throw error;
      }
      setArchivo(null); setTituloMaterial("");
      const input = document.getElementById("aula-material-file") as HTMLInputElement | null;
      if (input) input.value = "";
      setMensaje(publicarMaterial ? "Material publicado en el aula." : "Material guardado como borrador.");
    } catch (err) { setMensaje(err instanceof Error ? err.message : "No se pudo subir el material."); }
    finally { setOcupado(false); }
  }

  async function descargarMaterial(m: Material) {
    const { data, error } = await supabase.storage.from("formacion-academica").createSignedUrl(m.ruta_storage, 60);
    if (error || !data?.signedUrl) { setMensaje(error?.message || "No se pudo generar el enlace del archivo."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (cargandoSesion) return <AppShell titulo="Aula de formación" subtitulo="Cargando acceso"><Panel titulo="Verificando cuenta"><p className="p-5 text-sm text-muted-foreground">Comprobando tu sesión…</p></Panel></AppShell>;
  if (!sesion || !rolAlumno) return <AppShell titulo="Aula de formación" subtitulo="Acceso restringido"><Panel titulo="Cuenta no habilitada"><p className="p-5 text-sm text-muted-foreground">El aula de alumnos está disponible para cuentas de gerente u operario. La docencia se administra exclusivamente desde FADILAB.</p></Panel></AppShell>;

  return <AppShell titulo="Aula de formación" subtitulo={esDocente ? "FADILAB · Administración académica" : "Tus cursos, materiales y actividades"}>
    <div className="mx-auto max-w-6xl space-y-5">
      {esDocente ? (
        <>
          <section className="flex flex-col gap-3 rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/10 via-card to-card p-5 sm:flex-row sm:items-center">
            <div className="grid size-12 place-items-center rounded-xl bg-gold/15 text-gold-deep"><ShieldCheck className="size-6" /></div>
            <div><p className="text-sm font-semibold">Panel docente · FADILAB</p><p className="mt-1 text-xs text-muted-foreground">Crea cursos, matricula alumnos y publica sesiones y archivos académicos.</p></div>
          </section>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel titulo="Crear curso">
              <form onSubmit={(e) => void crearCurso(e)} className="space-y-3 p-5">
                <label className="block text-xs font-medium">Nombre del curso<input value={titulo} onChange={e => setTitulo(e.target.value)} required maxLength={140} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" /></label>
                <label className="block text-xs font-medium">Descripción<textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" /></label>
                <label className="block text-xs font-medium">Duración total (horas)<input type="number" min="0" step="0.5" value={duracion} onChange={e => setDuracion(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" /></label>
                <button disabled={ocupado} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"><Plus className="size-4" /> Crear curso</button>
              </form>
            </Panel>
            <Panel titulo="Cursos de FADILAB">
              <div className="space-y-2 p-5">
                {cursosQuery.isLoading ? <p className="text-sm text-muted-foreground">Cargando cursos…</p> : cursos.length === 0 ? <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Todavía no hay cursos. Crea el primero desde el formulario.</p> : cursos.map(c => <button key={c.id} type="button" onClick={() => { setCursoSeleccionado(c.id); setCursoMaterial(c.id); }} className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left ${cursoActivoId === c.id ? "border-gold bg-gold/10" : "border-border"}`}><span className="min-w-0"><span className="block truncate text-sm font-semibold">{c.titulo}</span><span className="text-xs text-muted-foreground">{c.duracion_horas} horas · {c.estado}</span></span><BookOpen className="size-4 shrink-0 text-gold-deep" /></button>)}
              </div>
            </Panel>
          </div>
          {cursoActivoId && <div className="grid gap-5 lg:grid-cols-2">
            <Panel titulo="Inscribir alumnos">
              <form onSubmit={(e) => void matricularAlumno(e)} className="space-y-3 p-5">
                <label className="block text-xs font-medium">Nombre del alumno<input value={nombreAlumno} onChange={e => setNombreAlumno(e.target.value)} maxLength={120} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" placeholder="Nombre completo" /></label>
                <label className="block text-xs font-medium">Correo de su cuenta<input type="email" required value={emailAlumno} onChange={e => setEmailAlumno(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" placeholder="alumno@correo.com" /></label>
                <button disabled={ocupado} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"><Users className="size-4" /> Inscribir alumno</button>
                <p className="text-xs text-muted-foreground">El alumno debe ingresar con el mismo correo ya registrado en Taller del Joyero.</p>
              </form>
              <div className="border-t border-border p-5"><h3 className="mb-3 text-sm font-semibold">Alumnos inscritos</h3>{inscripcionesQuery.isLoading ? <p className="text-xs text-muted-foreground">Cargando…</p> : (inscripcionesQuery.data ?? []).length === 0 ? <p className="text-xs text-muted-foreground">Aún no hay alumnos inscritos.</p> : (inscripcionesQuery.data ?? []).map(i => <div key={i.id} className="flex justify-between gap-3 border-b border-border py-2 text-xs"><span>{i.nombre_alumno || i.email_alumno}<span className="block text-muted-foreground">{i.email_alumno}</span></span><span className="text-muted-foreground">{i.estado}</span></div>)}</div>
            </Panel>
            <Panel titulo="Sesiones del curso">
              <form onSubmit={(e) => void crearSesion(e)} className="space-y-3 p-5">
                <div className="grid grid-cols-[90px_1fr] gap-2"><label className="text-xs font-medium">N.º<input type="number" min="1" value={numeroSesion} onChange={e => setNumeroSesion(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" /></label><label className="text-xs font-medium">Título<input required value={tituloSesion} onChange={e => setTituloSesion(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" placeholder="Interfaz y navegación" /></label></div>
                <label className="block text-xs font-medium">Descripción<textarea value={detalleSesion} onChange={e => setDetalleSesion(e.target.value)} rows={2} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" /></label>
                <button disabled={ocupado} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold"><CalendarDays className="size-4" /> Añadir sesión</button>
              </form>
              <div className="border-t border-border px-5">{sesionesQuery.isLoading ? <p className="py-4 text-xs text-muted-foreground">Cargando…</p> : (sesionesQuery.data ?? []).map(s => <div key={s.id} className="flex items-center justify-between gap-3 border-b border-border py-3"><div><p className="text-sm font-medium">{s.numero}. {s.titulo}</p><p className="text-xs text-muted-foreground">{s.publicada ? "Visible para alumnos" : "Borrador"}</p></div><button type="button" onClick={() => void publicarSesion(s)} className="rounded-lg border border-border px-3 py-1.5 text-xs">{s.publicada ? "Ocultar" : "Publicar"}</button></div>)}</div>
            </Panel>
            <Panel titulo="Materiales de estudio">
              <form onSubmit={(e) => void subirMaterial(e)} className="space-y-3 p-5">
                <label className="block text-xs font-medium">Título del material<input required value={tituloMaterial} onChange={e => setTituloMaterial(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" placeholder="Guía de la sesión 1" /></label>
                <label className="block text-xs font-medium">Archivo (PDF, documentos, imágenes, ZIP o STL)<input id="aula-material-file" type="file" required onChange={(e: ChangeEvent<HTMLInputElement>) => setArchivo(e.target.files?.[0] ?? null)} className="mt-1.5 block w-full text-xs" /></label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={publicarMaterial} onChange={e => setPublicarMaterial(e.target.checked)} /> Publicar inmediatamente para los alumnos</label>
                <button disabled={ocupado || !archivo} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"><Upload className="size-4" /> Subir material</button>
                <p className="text-xs text-muted-foreground">Almacenamiento privado · máximo 50 MB por archivo.</p>
              </form>
            </Panel>
          </div>}
          {cursosQuery.error && <p className="rounded-xl border border-red-300 p-3 text-sm text-red-700">{cursosQuery.error.message}</p>}
        </>
      ) : (
        <>
          <section className="rounded-2xl border border-gold/20 bg-card p-5"><p className="text-sm font-semibold">Bienvenido al aula</p><p className="mt-1 text-xs text-muted-foreground">Aquí aparecen únicamente los cursos en los que FADILAB te ha inscrito. Los archivos permanecen privados.</p></section>
          {alumnoQuery.isLoading ? <Panel titulo="Cargando tus cursos"><p className="p-5 text-sm text-muted-foreground">Vinculando tu inscripción y recuperando tus cursos…</p></Panel> : alumnoQuery.error ? <Panel titulo="No se pudo cargar el aula"><p className="p-5 text-sm text-red-700">{alumnoQuery.error.message}</p></Panel> : inscripcionesAlumno.length === 0 ? <Panel titulo="Aún no tienes cursos asignados"><p className="p-5 text-sm text-muted-foreground">Cuando FADILAB te inscriba con el correo de tu cuenta, el curso aparecerá aquí automáticamente.</p></Panel> : inscripcionesAlumno.map(i => <Panel key={i.id} titulo={i.formacion_cursos?.titulo ?? "Curso de formación"}>
            <div className="p-5"><p className="text-sm text-muted-foreground">{i.formacion_cursos?.descripcion || "Materiales y actividades de tu formación."}</p><div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground"><span>{i.formacion_cursos?.duracion_horas ?? 0} horas</span><span>Inscripción: {i.estado}</span></div>
              <h3 className="mb-2 mt-5 text-sm font-semibold">Materiales publicados</h3>
              {(materialesAlumnoQuery.data ?? []).filter(m => m.curso_id === i.curso_id).length === 0 ? <p className="text-xs text-muted-foreground">Todavía no hay materiales publicados.</p> : (materialesAlumnoQuery.data ?? []).filter(m => m.curso_id === i.curso_id).map(m => <div key={m.id} className="flex items-center justify-between gap-3 border-t border-border py-3"><div className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0 text-gold-deep" /><span className="min-w-0"><span className="block truncate text-sm font-medium">{m.titulo}</span><span className="text-xs text-muted-foreground">{m.nombre_archivo} · {(m.tamano_bytes / 1024 / 1024).toFixed(1)} MB</span></span></div><button type="button" onClick={() => void descargarMaterial(m)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs"><Download className="size-3.5" /> Descargar</button></div>)}
            </div>
          </Panel>)}
        </>
      )}
      {permisoDocente.isLoading && sesion?.esAdmin && fadilabCandidate ? <p className="text-xs text-muted-foreground">Comprobando autorización docente de FADILAB…</p> : null}
      {permisoDocente.error ? <p className="rounded-xl border border-red-300 p-3 text-sm text-red-700">No se pudo validar el acceso docente: {permisoDocente.error.message}</p> : null}
      {mensaje && <p role="status" className="rounded-xl border border-border bg-card p-3 text-sm">{mensaje}</p>}
    </div>
  </AppShell>;
}
