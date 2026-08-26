import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type NuevoUsuario = {
  correo: string;
  password: string;
  nombre: string;
  dni: string;
  telefono: string;
  rol: "dueno" | "gerente" | "operario" | "monitor" | "cliente";
  sede_id: string | null;
  areas: string[];
};

function validar(input: NuevoUsuario): NuevoUsuario {
  if (!input.correo || !input.correo.includes("@")) throw new Error("Usuario o correo no válido");
  if (!input.password || input.password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres");
  if (!input.nombre) throw new Error("El nombre es obligatorio");
  return input;
}

/** Indica si todavía no existe ningún usuario con rol: permite crear el primer dueño. */
export const sistemaSinDuenos = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return { vacio: (count ?? 0) === 0 };
});

/** Alta del primer dueño general. Sólo funciona mientras no haya ningún rol asignado. */
export const registrarPrimerDueno = createServerFn({ method: "POST" })
  .inputValidator(validar)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) throw new Error("El sistema ya tiene usuarios registrados");

    const { data: sede } = await supabaseAdmin
      .from("sedes")
      .select("id")
      .eq("nombre", "Gerencia general")
      .maybeSingle();

    const { data: creado, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.correo,
      password: data.password,
      email_confirm: true,
      user_metadata: { nombre: data.nombre, dni: data.dni, telefono: data.telefono },
    });
    if (error || !creado.user) throw new Error(error?.message ?? "No se pudo crear el usuario");

    await supabaseAdmin
      .from("profiles")
      .upsert({
        id: creado.user.id,
        nombre: data.nombre,
        dni: data.dni,
        telefono: data.telefono,
        sede_id: sede?.id ?? null,
      });
    await supabaseAdmin.from("user_roles").insert({ user_id: creado.user.id, role: "dueno" });
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
    });
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: creado.user.id, role: data.rol, sede_id: data.sede_id });
    if (data.areas.length > 0) {
      await supabaseAdmin
        .from("user_areas")
        .insert(data.areas.map((area) => ({ user_id: creado.user!.id, area })));
    }
    return { ok: true, id: creado.user.id };
  });

/** Baja de un usuario (sólo dueño). */
export const borrarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: esDueno } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "dueno",
    });
    if (!esDueno) throw new Error("Sólo un dueño puede eliminar usuarios");
    if (data.id === context.userId) throw new Error("No puedes eliminar tu propia cuenta");
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
  .inputValidator((input: EdicionUsuario) => {
    if (!input.id) throw new Error("Usuario no válido");
    if (!input.nombre) throw new Error("El nombre es obligatorio");
    if (input.password && input.password.length < 6)
      throw new Error("La contraseña debe tener al menos 6 caracteres");
    if (input.acceso_desde && input.acceso_hasta && input.acceso_hasta < input.acceso_desde)
      throw new Error("La fecha final debe ser posterior a la inicial");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const misRoles = (roles ?? []).map((r) => r.role);
    if (!misRoles.includes("dueno") && !misRoles.includes("gerente")) {
      throw new Error("No tienes permiso para editar usuarios");
    }
    if (data.rol === "dueno" && !misRoles.includes("dueno")) {
      throw new Error("Sólo un dueño puede asignar el rol de dueño");
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
    if (errPerfil) throw new Error(errPerfil.message);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.id, role: data.rol, sede_id: data.sede_id });

    await supabaseAdmin.from("user_areas").delete().eq("user_id", data.id);
    const areas = data.rol === "operario" ? data.areas : [];
    if (areas.length > 0) {
      await supabaseAdmin.from("user_areas").insert(areas.map((area) => ({ user_id: data.id, area })));
    }

    if (data.password) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
        password: data.password,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
