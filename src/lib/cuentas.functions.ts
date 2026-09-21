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
  correo: string;
  password: string;
  nombre: string;
  dni: string;
  telefono: string;
  rol: "dueno" | "gerente" | "operario" | "monitor" | "cliente";
  sede_id: string | null;
  areas: string[];
  acceso_desde?: string | null;
  acceso_hasta?: string | null;
};

function validar(input: NuevoUsuario): NuevoUsuario {
  if (!input.correo || !input.correo.includes("@")) throw new Error("Usuario o correo no válido");
  if (!input.password || input.password.length < 6)
    throw new Error("La contraseña debe tener al menos 6 caracteres");
  if (!input.nombre) throw new Error("El nombre es obligatorio");
  return input;
}

/** Comprueba server-side si el proyecto todavía no tiene ninguna cuenta. */
export const sistemaSinDuenos = createServerFn({ method: "GET" }).handler(async () => {
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
  return { vacio, disponible: vacio };
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
      email: data.correo,
      password: data.password,
      email_confirm: true,
      user_metadata: { nombre: data.nombre, dni: data.dni, telefono: data.telefono },
    });

    if (error || !creado.user) {
      throw new Error(error?.message ?? "No se pudo crear el usuario");
    }

    const { error: perfilError } = await supabaseAdmin.from("profiles").upsert({
      id: creado.user.id,
      nombre: data.nombre,
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
    const { data: creado, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.correo,
      password: data.password,
      email_confirm: true,
      user_metadata: { nombre: data.nombre, dni: data.dni, telefono: data.telefono },
    });
    if (error || !creado.user) throw new Error(error?.message ?? "No se pudo crear el usuario");

    await supabaseAdmin.from("profiles").upsert({
      id: creado.user.id,
      nombre: data.nombre,
      dni: data.dni,
      telefono: data.telefono,
      sede_id: data.sede_id,
      acceso_desde: data.acceso_desde ?? null,
      acceso_hasta: data.acceso_hasta ?? null,
    });
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: creado.user.id, role: data.rol, sede_id: data.sede_id });
    const areasAlta = data.rol === "operario" ? normalizarAreas(data.areas) : [];
    if (areasAlta.length > 0) {
      const { error: errAreas } = await supabaseAdmin
        .from("user_areas")
        .insert(areasAlta.map((area) => ({ user_id: creado.user!.id, area })));
      if (errAreas) throw new Error(`Usuario creado, pero no se guardaron las áreas: ${errAreas.message}`);
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
  nombre: string;
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
    if (!data.nombre) return { ok: false, error: "El nombre es obligatorio" };
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

    const { error: errPerfil } = await supabaseAdmin
      .from("profiles")
      .update({
        nombre: data.nombre,
        dni: data.dni,
        telefono: data.telefono,
        sede_id: data.sede_id,
        activo: data.activo,
        acceso_desde: data.acceso_desde,
        acceso_hasta: data.acceso_hasta,
      })
      .eq("id", data.id);
    if (errPerfil) return { ok: false, error: errPerfil.message };

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.id, role: data.rol, sede_id: data.sede_id });

    await supabaseAdmin.from("user_areas").delete().eq("user_id", data.id);
    const areas = data.rol === "operario" ? normalizarAreas(data.areas) : [];
    if (areas.length > 0) {
      const { error: errAreas } = await supabaseAdmin
        .from("user_areas")
        .insert(areas.map((area) => ({ user_id: data.id, area })));
      if (errAreas) return { ok: false, error: `No se guardaron las áreas: ${errAreas.message}` };
    }

    // El acceso se hace con DNI → correo sintético, así que el correo de la
    // cuenta debe seguir siempre al DNI del perfil.
    const cambios: Record<string, unknown> = {
      user_metadata: { nombre: data.nombre, dni: data.dni, telefono: data.telefono },
    };
    if (data.dni) {
      cambios["email"] = `${data.dni.replace(/\s+/g, "")}@taller.local`;
      cambios["email_confirm"] = true;
    }
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
