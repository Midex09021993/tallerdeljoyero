import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type DirectorioInput = { participanteDocenteId: string; cursoId: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validarDirectorioInput(input: DirectorioInput): DirectorioInput {
  const participanteDocenteId = typeof input?.participanteDocenteId === "string" ? input.participanteDocenteId : "";
  const cursoId = typeof input?.cursoId === "string" ? input.cursoId : "";
  if (!UUID_RE.test(participanteDocenteId) || !UUID_RE.test(cursoId)) throw new Error("Selecciona un curso válido.");
  return { participanteDocenteId, cursoId };
}

/** Comprueba con la sesión del usuario que es docente del espacio y que el curso le pertenece. */
async function verificarDocenteCurso(supabase: any, participanteDocenteId: string, cursoId: string) {
  const { data: autorizado, error: permisoError } = await supabase.rpc(
    "formacion_es_docente",
    { _participante_id: participanteDocenteId },
  );
  if (permisoError || autorizado !== true) {
    throw new Error("No tienes autorización para consultar el directorio académico.");
  }

  const { data: curso, error: cursoError } = await supabase
    .from("formacion_cursos")
    .select("id,participante_id")
    .eq("id", cursoId)
    .eq("participante_id", participanteDocenteId)
    .maybeSingle();
  if (cursoError || !curso) throw new Error("El curso no pertenece al espacio docente autorizado.");
}

/**
 * Directorio de candidatos (sin datos de contacto). Sólo devuelve nombre visible,
 * usuario, taller y roles; los correos nunca salen del servidor.
 */
async function construirDirectorio(supabaseAdmin: any, participanteDocenteId: string) {
  const [{ data: talleres, error: talleresError }, { data: roles, error: rolesError }] = await Promise.all([
    supabaseAdmin.from("ecosistema_participantes")
      .select("id,nombre,estado")
      .eq("estado", "activo")
      .neq("id", participanteDocenteId)
      .order("nombre"),
    supabaseAdmin.from("user_roles")
      .select("user_id,role")
      .in("role", ["gerente", "operario"]),
  ]);
  if (talleresError) throw new Error("No se pudieron consultar los talleres activos.");
  if (rolesError) throw new Error("No se pudieron consultar los roles de los usuarios.");

  const tallerIds = (talleres ?? []).map((t: any) => t.id);
  if (!tallerIds.length || !roles?.length) return { talleres: [] as any[], alumnos: [] as any[] };

  const roleByUser = new Map<string, string[]>();
  for (const role of roles as any[]) {
    const current = roleByUser.get(role.user_id) ?? [];
    current.push(role.role);
    roleByUser.set(role.user_id, current);
  }

  const { data: membresias, error: membresiasError } = await supabaseAdmin
    .from("participante_cuentas")
    .select("participante_id,user_id,estado")
    .in("participante_id", tallerIds)
    .eq("estado", "activo");
  if (membresiasError) throw new Error("No se pudieron consultar las vinculaciones de los talleres.");

  const candidatas = (membresias ?? []).filter((m: any) => roleByUser.has(m.user_id));
  const userIds = [...new Set(candidatas.map((m: any) => m.user_id))];
  if (!userIds.length) return { talleres: talleres ?? [], alumnos: [] as any[] };

  const { data: perfiles, error: perfilesError } = await supabaseAdmin.from("profiles")
    .select("id,usuario,nombre,apellidos,activo")
    .in("id", userIds);
  if (perfilesError) throw new Error("No se pudieron consultar los perfiles de los alumnos.");

  const perfilById = new Map((perfiles ?? []).map((p: any) => [p.id, p]));
  const tallerById = new Map((talleres ?? []).map((t: any) => [t.id, t]));
  const membresiasPorUsuario = new Map<string, any[]>();
  for (const membresia of candidatas as any[]) {
    const lista = membresiasPorUsuario.get(membresia.user_id) ?? [];
    lista.push(membresia);
    membresiasPorUsuario.set(membresia.user_id, lista);
  }
  const alumnos = [...membresiasPorUsuario.entries()].map(([userId, membresiasUsuario]) => {
    const perfil: any = perfilById.get(userId);
    if (!perfil || perfil.activo === false) return null;
    const talleresUsuario = membresiasUsuario
      .map((m: any) => tallerById.get(m.participante_id))
      .filter(Boolean);
    return {
      userId,
      participanteIds: membresiasUsuario.map((m: any) => m.participante_id),
      taller: talleresUsuario.map((t: any) => t.nombre).join(" · "),
      nombre: [perfil.nombre, perfil.apellidos].filter(Boolean).join(" ").trim() || perfil.usuario || "Usuario",
      usuario: perfil.usuario || "—",
      roles: roleByUser.get(userId) ?? [],
    };
  }).filter(Boolean) as Array<{ userId: string; participanteIds: string[]; taller: string; nombre: string; usuario: string; roles: string[] }>;

  return { talleres: talleres ?? [], alumnos };
}

export const listarDirectorioAlumnosFormacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validarDirectorioInput)
  .handler(async ({ data, context }) => {
    const { participanteDocenteId, cursoId } = data;
    await verificarDocenteCurso(context.supabase, participanteDocenteId, cursoId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return construirDirectorio(supabaseAdmin, participanteDocenteId);
  });

type MatricularInput = DirectorioInput & { userIds: string[] };

/**
 * Matricula en el curso a cuentas elegidas del directorio. El correo de cada alumno
 * se resuelve en el servidor y sólo se guarda en la inscripción del propio curso;
 * la inserción se hace con la sesión del docente para que apliquen sus permisos.
 */
export const matricularAlumnosFormacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: MatricularInput) => {
    const base = validarDirectorioInput(input);
    const userIds = Array.isArray(input?.userIds) ? [...new Set(input.userIds)] : [];
    if (!userIds.length) throw new Error("Selecciona al menos un alumno.");
    if (userIds.length > 200 || userIds.some((id) => typeof id !== "string" || !UUID_RE.test(id))) {
      throw new Error("Selección de alumnos no válida.");
    }
    return { ...base, userIds };
  })
  .handler(async ({ data, context }) => {
    const { participanteDocenteId, cursoId, userIds } = data;
    const { supabase } = context;
    await verificarDocenteCurso(supabase, participanteDocenteId, cursoId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { alumnos } = await construirDirectorio(supabaseAdmin, participanteDocenteId);
    const permitidos = new Map(alumnos.map((a) => [a.userId, a]));
    const seleccionados = userIds.map((id) => permitidos.get(id)).filter(Boolean) as typeof alumnos;
    if (!seleccionados.length) throw new Error("Los alumnos seleccionados no están disponibles en el directorio.");

    const { data: existentes, error: existentesError } = await supabase
      .from("formacion_inscripciones")
      .select("email_alumno,alumno_user_id")
      .eq("participante_id", participanteDocenteId)
      .eq("curso_id", cursoId);
    if (existentesError) throw new Error("No se pudieron consultar las inscripciones del curso.");
    const usuariosInscritos = new Set((existentes ?? []).map((i: any) => i.alumno_user_id).filter(Boolean));
    const correosInscritos = new Set((existentes ?? []).map((i: any) => String(i.email_alumno ?? "").toLowerCase()));

    const filas: any[] = [];
    for (const alumno of seleccionados) {
      if (usuariosInscritos.has(alumno.userId)) continue;
      const { data: authResult, error: authError } = await supabaseAdmin.auth.admin.getUserById(alumno.userId);
      const email = authResult?.user?.email?.toLowerCase();
      if (authError || !email || correosInscritos.has(email)) continue;
      filas.push({
        participante_id: participanteDocenteId,
        curso_id: cursoId,
        email_alumno: email,
        nombre_alumno: alumno.nombre,
        alumno_user_id: alumno.userId,
        estado: "activo",
      });
    }
    if (!filas.length) return { inscritos: 0 };

    const { error } = await supabase.from("formacion_inscripciones").insert(filas);
    if (error) throw new Error("No se pudo completar la inscripción.");
    return { inscritos: filas.length };
  });

type InscripcionesAlumnoInput = Record<string, never>;

/**
 * Recupera las matrículas propias con los datos canónicos del curso.
 * La identidad procede del JWT validado por requireSupabaseAuth; nunca del cliente.
 * La lectura de cursos con service role se limita a los IDs obtenidos de esas matrículas.
 */
export const listarInscripcionesAlumnoFormacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: InscripcionesAlumnoInput) => input)
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: inscripciones, error: inscripcionesError } = await supabase
      .from("formacion_inscripciones")
      .select("id,curso_id,participante_id,email_alumno,nombre_alumno,estado,created_at")
      .eq("alumno_user_id", userId)
      .in("estado", ["activo", "finalizado"])
      .order("created_at", { ascending: false });

    if (inscripcionesError) {
      throw new Error("No se pudieron recuperar tus matrículas: " + inscripcionesError.message);
    }

    if (!inscripciones?.length) return [];

    const cursoIds = [...new Set(inscripciones.map((inscripcion) => inscripcion.curso_id))];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cursos, error: cursosError } = await supabaseAdmin
      .from("formacion_cursos")
      .select("id,participante_id,titulo,descripcion,duracion_horas,estado")
      .in("id", cursoIds);

    if (cursosError) {
      throw new Error("No se pudieron recuperar los datos académicos de tus cursos: " + cursosError.message);
    }

    const cursoPorId = new Map((cursos ?? []).map((curso) => [curso.id, curso]));

    return inscripciones.map((inscripcion) => {
      const curso = cursoPorId.get(inscripcion.curso_id);
      // La matrícula debe corresponder también al mismo espacio docente.
      const cursoValidado = curso?.participante_id === inscripcion.participante_id ? curso : null;

      return {
        id: inscripcion.id,
        curso_id: inscripcion.curso_id,
        email_alumno: inscripcion.email_alumno,
        nombre_alumno: inscripcion.nombre_alumno,
        estado: inscripcion.estado,
        formacion_cursos: cursoValidado,
      };
    });
  });

