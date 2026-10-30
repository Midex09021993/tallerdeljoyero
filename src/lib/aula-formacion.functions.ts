import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type DirectorioInput = { participanteDocenteId: string; cursoId: string };

export const listarDirectorioAlumnosFormacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: DirectorioInput) => input)
  .handler(async ({ data, context }) => {
    const { participanteDocenteId, cursoId } = data;
    const { supabase } = context;

    if (!participanteDocenteId || !cursoId) throw new Error("Selecciona un curso válido.");

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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
    if (!tallerIds.length || !roles?.length) return { talleres: [], alumnos: [] };

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
    if (!userIds.length) return { talleres: talleres ?? [], alumnos: [] };

    const [{ data: perfiles, error: perfilesError }] = await Promise.all([
      supabaseAdmin.from("profiles")
        .select("id,usuario,nombre,apellidos,activo")
        .in("id", userIds),
    ]);
    if (perfilesError) throw new Error("No se pudieron consultar los perfiles de los alumnos.");

    const perfilById = new Map((perfiles ?? []).map((p: any) => [p.id, p]));
    const tallerById = new Map((talleres ?? []).map((t: any) => [t.id, t]));
    const membresiasPorUsuario = new Map<string, any[]>();
    for (const membresia of candidatas as any[]) {
      const lista = membresiasPorUsuario.get(membresia.user_id) ?? [];
      lista.push(membresia);
      membresiasPorUsuario.set(membresia.user_id, lista);
    }
    const alumnos = await Promise.all([...membresiasPorUsuario.entries()].map(async ([userId, membresiasUsuario]) => {
      const perfil = perfilById.get(userId);
      if (!perfil || perfil.activo === false) return null;
      const { data: authResult, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (authError || !authResult.user) return null;
      const talleresUsuario = membresiasUsuario
        .map((m: any) => tallerById.get(m.participante_id))
        .filter(Boolean);
      return {
        userId,
        participanteIds: membresiasUsuario.map((m: any) => m.participante_id),
        taller: talleresUsuario.map((t: any) => t.nombre).join(" · "),
        nombre: [perfil.nombre, perfil.apellidos].filter(Boolean).join(" ").trim() || perfil.usuario || "Usuario",
        usuario: perfil.usuario || authResult.user.email?.split("@")[0] || "—",
        email: authResult.user.email || "",
        roles: roleByUser.get(userId) ?? [],
      };
    }));

    return {
      talleres: talleres ?? [],
      alumnos: alumnos.filter(Boolean),
    };
  });
