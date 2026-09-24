import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
const AREAS_VALIDAS = [
  "Pedidos",
  "Diseño 3D",
  "Impresión 3D",
  "Casting",
  "Corte Láser",
  "Taller",
  "Área ventas",
];

const ALIAS_AREAS: Record<string, string> = {
  "Servicio láser": "Corte Láser",
  "Corte láser": "Corte Láser",
  "Corte Laser": "Corte Láser",
  "Taller / Engaste": "Taller",
  Ventas: "Área ventas",
  "Área de Ventas": "Área ventas",
  Terminado: "Área ventas",
  Entregado: "Área ventas",
};

/** Deja sólo áreas válidas, con el nombre canónico y sin duplicados. */
function normalizarAreas(areas: string[]): string[] {
  const lista = (areas ?? [])
    .map((a) => (a ?? "").trim())
    .map((a) => ALIAS_AREAS[a] ?? a)
    .filter((a) => AREAS_VALIDAS.includes(a));
  return Array.from(new Set(lista));
}

type NuevoUsuario = {
  usuario: string;
  password: string;
  nombre: string;
  apellidos: string;
  dni: string;
  telefono: string;
  rol: "dueno" | "gerente" | "operario" | "monitor" | "cliente";
  sede_id: string | null;
  areas: string[];
  acceso_desde?: string | null;
  acceso_hasta?: string | null;
};

function validar(input: NuevoUsuario): NuevoUsuario {
  if (!input.usuario?.trim()) throw new Error("El usuario es obligatorio");
  if (!/^[a-zA-Z0-9._-]{3,50}$/.test(input.usuario.trim())) throw new Error("El usuario debe tener entre 3 y 50 caracteres y sólo puede usar letras, números, punto, guion y guion bajo");
  if (!input.password || input.password.length < 6)
    throw new Error("La contraseña debe tener al menos 6 caracteres");
  if (!input.nombre?.trim()) throw new Error("El nombre es obligatorio");
  if (!input.apellidos?.trim()) throw new Error("Los apellidos son obligatorios");
  if (!input.dni?.trim()) throw new Error("El DNI es obligatorio");
  if (input.acceso_desde && input.acceso_hasta && input.acceso_hasta < input.acceso_desde)
    throw new Error("La fecha final debe ser posterior a la inicial");
  return input;
}

/** Comprueba server-side si el proyecto todavía no tiene ninguna cuenta. */
export const sistemaSinDuenos = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ count: rolesCount }, { data: usuarios, error: usuariosError }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 }),
    ]);

    if (usuariosError) {
      console.error("[Auth] No se pudo comprobar el estado inicial:", usuariosError);
      return { vacio: false, disponible: false };
    }

    const vacio = (rolesCount ?? 0) === 0 && (usuarios?.users.length ?? 0) === 0;
    return { vacio, disponible: true };
  } catch (error) {
    // El login debe seguir renderizando aunque el entorno local/preview
    // no tenga la service-role key. El alta inicial simplemente queda
    // deshabilitada hasta conectar Supabase en el servidor.
    console.error("[Auth] Estado inicial no disponible:", error);
    return { vacio: false, disponible: false };
  }
});

/** Alta del primer dueño general. Sólo funciona mientras Auth y roles estén vacíos. */
export const registrarPrimerDueno = createServerFn({ method: "POST" })
  .inputValidator(validar)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ count: rolesCount }, { data: usuarios, error: usuariosError }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 }),
    ]);

    if (usuariosError) {
      throw new Error("No se pudo verificar el estado de autenticación del sistema");
    }

    if ((rolesCount ?? 0) > 0 || (usuarios?.users.length ?? 0) > 0) {
      throw new Error("El sistema ya tiene usuarios registrados");
    }

    const { data: sede, error: sedeError } = await supabaseAdmin
      .from("sedes")
      .select("id")
      .eq("nombre", "Gerencia general")
      .maybeSingle();

    if (sedeError) throw new Error("No se pudo preparar la sede inicial");

    const { data: creado, error } = await supabaseAdmin.auth.admin.createUser({
      email: `${data.usuario.trim().toLowerCase()}@taller.local`,
      password: data.password,
      email_confirm: true,
      user_metadata: { usuario: data.usuario.trim().toLowerCase(), nombre: data.nombre, apellidos: data.apellidos, dni: data.dni, telefono: data.telefono },
    });

    if (error || !creado.user) {
      throw new Error(error?.message ?? "No se pudo crear el usuario");
    }

    const { error: perfilError } = await supabaseAdmin.from("profiles").upsert({
      id: creado.user.id,
      usuario: data.usuario.trim().toLowerCase(),
      nombre: data.nombre,
      apellidos: data.apellidos,
      dni: data.dni,
      telefono: data.telefono,
      sede_id: sede?.id ?? null,
    });

    if (perfilError) {
      await supabaseAdmin.auth.admin.deleteUser(creado.user.id);
      throw new Error("No se pudo crear el perfil inicial");
    }

    const { error: rolError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: creado.user.id, role: "dueno", sede_id: sede?.id ?? null });

    if (rolError) {
      await supabaseAdmin.auth.admin.deleteUser(creado.user.id);
      throw new Error("No se pudo asignar el rol inicial");
    }

    return { ok: true };
  });

/** Lista las cuentas reales de Auth y las reconcilia con los datos administrativos. */
export const listarUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: misRolesRaw, error: misRolesError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (misRolesError) throw new Error("No se pudo verificar tu rol administrativo");

    const misRoles = (misRolesRaw ?? []).map((r) => r.role);
    const esDueno = misRoles.includes("dueno");
    const esGerente = misRoles.includes("gerente");
    if (!esDueno && !esGerente) throw new Error("No tienes permiso para consultar usuarios");

    let page = 1;
    const authUsers: NonNullable<Awaited<ReturnType<typeof supabaseAdmin.auth.admin.listUsers>>["data"]>["users"] = [];
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error("No se pudieron consultar las cuentas del sistema");
      authUsers.push(...data.users);
      if (data.users.length < 1000) break;
      page += 1;
    }

    const [{ data: perfiles, error: perfilesError }, { data: roles, error: rolesError }, { data: areas, error: areasError }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, usuario, nombre, apellidos, dni, telefono, sede_id, activo, acceso_desde, acceso_hasta"),
      supabaseAdmin.from("user_roles").select("user_id, role, sede_id"),
      supabaseAdmin.from("user_areas").select("user_id, area"),
    ]);
    if (perfilesError || rolesError || areasError) {
      const detalles = [
        perfilesError ? `profiles: ${perfilesError.message}` : null,
        rolesError ? `user_roles: ${rolesError.message}` : null,
        areasError ? `user_areas: ${areasError.message}` : null,
      ].filter(Boolean).join(" | ");
      console.error("[listarUsuarios] Error al reconciliar usuarios:", detalles);
      throw new Error(`No se pudo reconciliar la información administrativa de los usuarios: ${detalles}`);
    }

    const perfilesMap = new Map((perfiles ?? []).map((p) => [p.id, p]));
    const rolesMap = new Map<string, { role: string; sede_id: string | null }[]>();
    for (const role of roles ?? []) {
      const actuales = rolesMap.get(role.user_id) ?? [];
      actuales.push({ role: role.role, sede_id: role.sede_id ?? null });
      rolesMap.set(role.user_id, actuales);
    }
    const areasMap = new Map<string, string[]>();
    for (const area of areas ?? []) {
      const actuales = areasMap.get(area.user_id) ?? [];
      actuales.push(area.area);
      areasMap.set(area.user_id, actuales);
    }

    let sedeGerente: string | null = null;
    if (esGerente && !esDueno) {
      const { data: perfilGerente } = await supabaseAdmin
        .from("profiles")
        .select("sede_id")
        .eq("id", context.userId)
        .maybeSingle();
      sedeGerente = perfilGerente?.sede_id ?? null;
    }

    return authUsers
      .map((authUser) => {
        const perfil = perfilesMap.get(authUser.id);
        const rolesUsuario = rolesMap.get(authUser.id) ?? [];
        const sedeId = perfil?.sede_id ?? rolesUsuario.find((r) => r.sede_id)?.sede_id ?? null;
        const usuario =
          perfil?.usuario?.trim() ||
          (typeof authUser.user_metadata?.usuario === "string" ? authUser.user_metadata.usuario : "") ||
          authUser.email?.split("@")[0] ||
          authUser.id;
        const nombre =
          perfil?.nombre?.trim() ||
          (typeof authUser.user_metadata?.nombre === "string" ? authUser.user_metadata.nombre : "");
        const apellidos =
          perfil?.apellidos?.trim() ||
          (typeof authUser.user_metadata?.apellidos === "string" ? authUser.user_metadata.apellidos : "");
        const dni =
          perfil?.dni?.trim() ||
          (typeof authUser.user_metadata?.dni === "string" ? authUser.user_metadata.dni : "");
        const telefono =
          perfil?.telefono?.trim() ||
          (typeof authUser.user_metadata?.telefono === "string" ? authUser.user_metadata.telefono : "");

        return {
          id: authUser.id,
          usuario,
          nombre,
          apellidos,
          dni,
          telefono,
          sede_id: sedeId,
          activo: perfil?.activo ?? true,
          acceso_desde: perfil?.acceso_desde ?? null,
          acceso_hasta: perfil?.acceso_hasta ?? null,
          roles: rolesUsuario.map((r) => r.role),
          areas: areasMap.get(authUser.id) ?? [],
          perfil_completo: Boolean(perfil),
        };
      })
      .filter((usuario) => {
        if (esDueno) return true;
        const rolesUsuario = rolesMap.get(usuario.id) ?? [];
        return !rolesUsuario.some((r) => r.role === "dueno" || r.role === "gerente") &&
          usuario.sede_id != null &&
          usuario.sede_id === sedeGerente;
      });
  });

/** Alta de usuarios por parte de un dueño o gerente. */
export const crearUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validar)
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const misRoles = (roles ?? []).map((r) => r.role);
    if (!misRoles.includes("dueno") && !misRoles.includes("gerente")) {
      throw new Error("No tienes permiso para crear usuarios");
    }
    if (data.rol === "dueno" && !misRoles.includes("dueno")) {
      throw new Error("Sólo un dueño puede crear otro dueño");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const usuarioNormalizado = data.usuario.trim().toLowerCase();
    const emailNormalizado = `${usuarioNormalizado}@taller.local`;
    const { data: existente } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (existente.users.some((u) => (u.email ?? "").toLowerCase() === emailNormalizado)) {
      throw new Error("Ese usuario ya existe. Búscalo en Usuarios y usa Editar en lugar de crear otra cuenta.");
    }
    const { data: creado, error } = await supabaseAdmin.auth.admin.createUser({
      email: emailNormalizado,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        usuario: usuarioNormalizado,
        nombre: data.nombre,
        apellidos: data.apellidos,
        dni: data.dni,
        telefono: data.telefono,
      },
    });
    if (error || !creado.user) throw new Error(error?.message ?? "No se pudo crear el usuario");

    const { error: perfilError } = await supabaseAdmin.from("profiles").upsert({
      id: creado.user.id,
      usuario: usuarioNormalizado,
      nombre: data.nombre,
      apellidos: data.apellidos,
      dni: data.dni,
      telefono: data.telefono,
      sede_id: data.sede_id,
      acceso_desde: data.acceso_desde ?? null,
      acceso_hasta: data.acceso_hasta ?? null,
    });
    if (perfilError) {
      await supabaseAdmin.auth.admin.deleteUser(creado.user.id);
      throw new Error("Usuario creado en Auth, pero no se pudo crear el perfil");
    }

    const { error: rolError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: creado.user.id, role: data.rol, sede_id: data.sede_id });
    if (rolError) {
      await supabaseAdmin.auth.admin.deleteUser(creado.user.id);
      throw new Error("Usuario creado, pero no se pudo asignar el rol");
    }

    const areasAlta = data.rol === "operario" ? normalizarAreas(data.areas) : [];
    if (areasAlta.length > 0) {
      const { error: errAreas } = await supabaseAdmin
        .from("user_areas")
        .insert(areasAlta.map((area) => ({ user_id: creado.user!.id, area })));
      if (errAreas) {
        await supabaseAdmin.auth.admin.deleteUser(creado.user.id);
        throw new Error("Usuario creado, pero no se guardaron las áreas");
      }
    }
    return { ok: true, id: creado.user.id };
  });

/** Baja de un usuario: el dueño a cualquiera; el gerente sólo a personal de su sede. */
export const borrarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    if (data.id === context.userId) throw new Error("No puedes eliminar tu propia cuenta");

    const { data: misRolesRaw } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const misRoles = (misRolesRaw ?? []).map((r) => r.role);
    const esDueno = misRoles.includes("dueno");
    const esGerente = misRoles.includes("gerente");
    if (!esDueno && !esGerente) throw new Error("No tienes permiso para eliminar usuarios");

    if (!esDueno) {
      const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
      const { data: rolesDestino } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", data.id);
      const destino = (rolesDestino ?? []).map((r) => r.role);
      if (destino.includes("dueno") || destino.includes("gerente")) {
        throw new Error("No puedes eliminar a un dueño ni a otro gerente");
      }
      const [{ data: yo }, { data: otro }] = await Promise.all([
        admin.from("profiles").select("sede_id").eq("id", context.userId).maybeSingle(),
        admin.from("profiles").select("sede_id").eq("id", data.id).maybeSingle(),
      ]);
      if (!yo?.sede_id || yo.sede_id !== otro?.sede_id) {
        throw new Error("Sólo puedes eliminar usuarios de tu sede");
      }
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

type EdicionUsuario = {
  id: string;
  usuario: string;
  nombre: string;
  apellidos: string;
  dni: string;
  telefono: string;
  sede_id: string | null;
  rol: "dueno" | "gerente" | "operario" | "monitor" | "cliente";
  areas: string[];
  activo: boolean;
  acceso_desde: string | null;
  acceso_hasta: string | null;
  password?: string | null;
};

/** Edición de un usuario existente (dueño o gerente). */
export const actualizarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: EdicionUsuario) => input)
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    if (!data.id) return { ok: false, error: "Usuario no válido" };
    if (!data.usuario?.trim() || !/^[a-zA-Z0-9._-]{3,50}$/.test(data.usuario.trim())) return { ok: false, error: "El usuario no es válido" };
    if (!data.nombre?.trim()) return { ok: false, error: "El nombre es obligatorio" };
    if (!data.apellidos?.trim()) return { ok: false, error: "Los apellidos son obligatorios" };
    if (data.password && data.password.length < 6)
      return { ok: false, error: "La contraseña debe tener al menos 6 caracteres" };
    if (data.acceso_desde && data.acceso_hasta && data.acceso_hasta < data.acceso_desde)
      return { ok: false, error: "La fecha final debe ser posterior a la inicial" };

    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const misRoles = (roles ?? []).map((r) => r.role);
    if (!misRoles.includes("dueno") && !misRoles.includes("gerente")) {
      return { ok: false, error: "No tienes permiso para editar usuarios" };
    }
    if (data.rol === "dueno" && !misRoles.includes("dueno")) {
      return { ok: false, error: "Sólo un dueño puede asignar el rol de dueño" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: destinoRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role, sede_id")
      .eq("user_id", data.id);
    if (!misRoles.includes("dueno")) {
      if ((destinoRoles ?? []).some((r) => r.role === "dueno" || r.role === "gerente")) {
        return { ok: false, error: "Un gerente sólo puede editar personal operativo de su sede" };
      }
      const { data: miPerfil } = await supabaseAdmin.from("profiles").select("sede_id").eq("id", context.userId).maybeSingle();
      const sedeDestino = data.sede_id ?? (destinoRoles ?? []).find((r) => r.sede_id)?.sede_id ?? null;
      if (!miPerfil?.sede_id || sedeDestino !== miPerfil.sede_id) {
        return { ok: false, error: "Sólo puedes editar usuarios de tu sede" };
      }
    }
    const { data: authActual, error: authActualError } = await supabaseAdmin.auth.admin.getUserById(data.id);
    if (authActualError || !authActual.user) return { ok: false, error: "La cuenta de autenticación no existe" };
    const usuarioNormalizado = data.usuario.trim().toLowerCase();
    const emailNormalizado = `${usuarioNormalizado}@taller.local`;
    const { data: todosAuth } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (todosAuth?.users.some((u) => u.id !== data.id && (u.email ?? "").toLowerCase() === emailNormalizado)) {
      return { ok: false, error: "Ese usuario ya pertenece a otra cuenta" };
    }

    const { error: errPerfil } = await supabaseAdmin.from("profiles").upsert({
      id: data.id,
      usuario: usuarioNormalizado,
      nombre: data.nombre,
      apellidos: data.apellidos,
      dni: data.dni,
      telefono: data.telefono,
      sede_id: data.sede_id,
      activo: data.activo,
      acceso_desde: data.acceso_desde,
      acceso_hasta: data.acceso_hasta,
    });
    if (errPerfil) return { ok: false, error: errPerfil.message };

    const { error: errRolDelete } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    if (errRolDelete) return { ok: false, error: errRolDelete.message };
    const { error: errRolInsert } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.id, role: data.rol, sede_id: data.sede_id });
    if (errRolInsert) return { ok: false, error: errRolInsert.message };

    const { error: errAreasDelete } = await supabaseAdmin.from("user_areas").delete().eq("user_id", data.id);
    if (errAreasDelete) return { ok: false, error: errAreasDelete.message };
    const areas = data.rol === "operario" ? normalizarAreas(data.areas) : [];
    if (areas.length > 0) {
      const { error: errAreas } = await supabaseAdmin
        .from("user_areas")
        .insert(areas.map((area) => ({ user_id: data.id, area })));
      if (errAreas) return { ok: false, error: `No se guardaron las áreas: ${errAreas.message}` };
    }

    // El usuario es la credencial estable; el DNI es sólo dato personal.
    const cambios: Record<string, unknown> = {
      email: emailNormalizado,
      email_confirm: true,
      user_metadata: {
        usuario: usuarioNormalizado,
        nombre: data.nombre,
        apellidos: data.apellidos,
        dni: data.dni,
        telefono: data.telefono,
      },
    };
    if (data.password) cambios["password"] = data.password;

    {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, cambios);
      if (error) {
        return {
          ok: false,
          error: /weak/i.test(error.message)
            ? "Esa contraseña es demasiado común. Usa una más segura (letras, números y símbolos)."
            : error.message,
        };
      }
    }
    return { ok: true };
  });
