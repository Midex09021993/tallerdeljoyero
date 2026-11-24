/* eslint-disable-next-line @typescript-eslint/ban-ts-comment -- excepción temporal: corregir tipos heredados requiere una tarea separada */
// @ts-nocheck -- tipos generados desfasados respecto al esquema real
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


/**
 * Inicia sesión con el nombre de usuario visible en el login.
 * El correo de Auth se resuelve y se usa sólo en el servidor: nunca se devuelve
 * al navegador, de modo que nadie puede averiguar el correo de una cuenta a
 * partir de su nombre de usuario. Sólo se devuelven tokens si la contraseña es válida.
 */
export const iniciarSesionUsuario = createServerFn({ method: "POST" })
  .inputValidator((input: { usuario: string; password: string }) => {
    const usuario = typeof input?.usuario === "string" ? input.usuario.trim() : "";
    const password = typeof input?.password === "string" ? input.password : "";
    if (!usuario || usuario.length > 120) throw new Error("Ingresa tu usuario.");
    // El login acepta exclusivamente el nombre registrado, nunca el correo.
    if (usuario.includes("@")) throw new Error("Ingresa tu nombre de usuario, no tu correo electrónico.");
    if (!password || password.length > 256) throw new Error("Usuario o contraseña incorrectos");
    return { usuario, password };
  })
  .handler(async ({ data }) => {
    const { usuario, password } = data;
    const credencialesInvalidas = "Usuario o contraseña incorrectos";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Resolver únicamente por la credencial guardada en profiles.usuario.
    // No usar profiles.nombre como alternativa: dos personas pueden compartir nombre
    // y una coincidencia ambigua nunca debe decidir qué cuenta se autentica.
    const { data: perfilesUsuario, error: errorUsuario } = await supabaseAdmin
      .from("profiles")
      .select("id, usuario, activo")
      .ilike("usuario", usuario)
      .limit(3);
    if (errorUsuario) throw new Error("No se pudo verificar el usuario. Inténtalo de nuevo.");
    // ilike puede interpretar % y _ como comodines; validar igualdad literal y
    // sin distinguir mayúsculas antes de aceptar una sola cuenta activa.
    const usuarioNormalizado = usuario.toLocaleLowerCase();
    const coincidencias = (perfilesUsuario ?? []).filter((perfil: any) =>
      perfil.activo !== false &&
      typeof perfil.usuario === "string" &&
      perfil.usuario.trim().toLocaleLowerCase() === usuarioNormalizado
    );
    if (coincidencias.length !== 1) throw new Error(credencialesInvalidas);

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(coincidencias[0].id);
    const email = authUser?.user?.email;
    if (authError || !email) throw new Error(credencialesInvalidas);

    const SUPABASE_URL = process.env["SUPABASE_URL"];
    const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) throw new Error("El acceso no está disponible en este momento.");

    const { createClient } = await import("@supabase/supabase-js");
    const authClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storage: undefined },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (headers.get("Authorization") === `Bearer ${SUPABASE_PUBLISHABLE_KEY}`) headers.delete("Authorization");
          headers.set("apikey", SUPABASE_PUBLISHABLE_KEY);
          return fetch(input, { ...init, headers });
        },
      },
    });
    const { data: sesion, error: loginError } = await authClient.auth.signInWithPassword({ email, password });
    if (loginError || !sesion.session) throw new Error(credencialesInvalidas);

    return {
      access_token: sesion.session.access_token,
      refresh_token: sesion.session.refresh_token,
    };
  });

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
  email: string;
  password: string;
  nombre: string;
  apellidos: string;
  dni: string;
  telefono: string;
  rol: "dueno" | "gerente" | "operario" | "monitor" | "cliente";
  sede_id: string | null;
  participante_id?: string | null;
  areas: string[];
  acceso_desde?: string | null;
  acceso_hasta?: string | null;
};

async function resolverParticipantePorSede(supabaseAdmin: any, sedeId: string | null, participanteId: string | null = null) {
  if (!sedeId && !participanteId) return null;
  let query = supabaseAdmin
    .from("ecosistema_participantes")
    .select("id, sede_id, estado")
    .eq("estado", "activo");
  query = participanteId ? query.eq("id", participanteId) : query.eq("sede_id", sedeId);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error("No se pudo resolver el taller del usuario");
  return data ?? null;
}

async function usuarioComparteParticipante(
  supabaseAdmin: any,
  actorUserId: string,
  targetUserId: string,
) {
  const [{ data: actor }, { data: target }] = await Promise.all([
    supabaseAdmin
      .from("participante_cuentas")
      .select("participante_id")
      .eq("user_id", actorUserId)
      .eq("estado", "activo"),
    supabaseAdmin
      .from("participante_cuentas")
      .select("participante_id")
      .eq("user_id", targetUserId)
      .eq("estado", "activo"),
  ]);
  const propios = new Set((actor ?? []).map((x: any) => x.participante_id));
  return (target ?? []).some((x: any) => propios.has(x.participante_id));
}

async function asegurarCuentaParticipantePrincipal(
  supabaseAdmin: any,
  userId: string,
  participanteId: string,
) {
  const { error } = await supabaseAdmin
    .from("participante_cuentas")
    .upsert(
      {
        participante_id: participanteId,
        user_id: userId,
        relacion: "principal",
        estado: "activo",
      },
      { onConflict: "participante_id,user_id" },
    );
  if (error) throw new Error("No se pudo vincular la cuenta con el taller");
}

function validar(input: NuevoUsuario): NuevoUsuario {
  if (!input.usuario?.trim()) throw new Error("El usuario es obligatorio");
  if (!input.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) throw new Error("Ingresa un correo electrónico válido");
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
/**
 * El alta del primer dueño sólo está habilitada si el servidor tiene configurado
 * un código de instalación (AURUM_BOOTSTRAP_TOKEN) y quien llama lo conoce.
 * Sin ese código, nadie puede reclamar el rol de dueño aunque el sistema esté vacío.
 */
function codigoInstalacionConfigurado(): string | null {
  const token = process.env["AURUM_BOOTSTRAP_TOKEN"];
  return token && token.length >= 16 ? token : null;
}

export const sistemaSinDuenos = createServerFn({ method: "GET" }).handler(async () => {
  try {
    if (!codigoInstalacionConfigurado()) return { vacio: false, disponible: false };
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

type RegistroTaller = {
  nombre: string;
  taller: string;
  email: string;
  telefono?: string;
  ciudad?: string;
  pais?: string;
  password: string;
};

/**
 * Alta pública simple de un taller.
 * Una sola operación crea Auth + perfil + sede + participante + rol + cuenta principal.
 * El rol es gerente del propio taller; el dueño general de Aurum Lab permanece separado.
 */
export const registrarTaller = createServerFn({ method: "POST" })
  .inputValidator((input: RegistroTaller) => input)
  .handler(async ({ data }) => {
    const nombre = data.nombre?.trim();
    const taller = data.taller?.trim();
    const email = data.email?.trim().toLowerCase();
    const telefono = data.telefono?.trim() ?? "";
    const ciudad = data.ciudad?.trim() ?? "";
    const pais = data.pais?.trim() ?? "";

    if (!nombre || nombre.length > 120) throw new Error("Ingresa tu nombre.");
    if (!taller || taller.length > 160) throw new Error("Ingresa el nombre de tu taller.");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Ingresa un correo válido.");
    if (telefono.length > 30) throw new Error("El teléfono es demasiado largo.");
    if (ciudad.length > 80) throw new Error("La ciudad es demasiado larga.");
    if (!pais || pais.length > 80) throw new Error("Selecciona tu país.");
    if (!data.password || data.password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
    if (data.password.length > 128) throw new Error("La contraseña es demasiado larga.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: authUsers, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authUsersError) throw new Error("No se pudo comprobar el correo.");
    if ((authUsers.users ?? []).some((u) => (u.email ?? "").toLowerCase() === email)) {
      throw new Error("Ese correo ya tiene una cuenta. Puedes entrar con él desde el acceso principal.");
    }

    // El nombre de la persona es también el usuario de acceso del registro público.
    // Evitar duplicados activos para que el login no quede ambiguo por nombres iguales.
    const { data: usuariosExistentes, error: usuariosExistentesError } = await supabaseAdmin
      .from("profiles")
      .select("usuario, activo")
      .ilike("usuario", nombre)
      .limit(10);
    if (usuariosExistentesError) throw new Error("No se pudo comprobar la disponibilidad del usuario.");
    const nombreNormalizado = nombre.toLocaleLowerCase();
    if ((usuariosExistentes ?? []).some((perfil: any) =>
      perfil.activo !== false &&
      typeof perfil.usuario === "string" &&
      perfil.usuario.trim().toLocaleLowerCase() === nombreNormalizado
    )) {
      throw new Error("Ese nombre de usuario ya está registrado. Usa un nombre que te identifique de forma única.");
    }

    const { data: tallerExistente } = await supabaseAdmin
      .from("ecosistema_participantes")
      .select("id")
      .eq("tipo_participante", "organizacion")
      .ilike("nombre", taller)
      .eq("estado", "activo")
      .limit(1)
      .maybeSingle();
    if (tallerExistente) throw new Error("Ya existe un taller con ese nombre en Aurum Lab.");

    const { data: sedeExistente } = await supabaseAdmin
      .from("sedes")
      .select("id")
      .ilike("nombre", taller)
      .maybeSingle();
    if (sedeExistente) throw new Error("Ese nombre de taller ya está registrado. Usa otro nombre.");

    const { data: creado, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        usuario: nombre,
        nombre,
        apellidos: "",
        telefono,
        pais,
        ciudad,
      },
    });
    if (authError || !creado.user) {
      throw new Error(/already been registered/i.test(authError?.message ?? "") ? "Ese correo ya tiene una cuenta." : /weak|easy to guess/i.test(authError?.message ?? "") ? "La contraseña es demasiado fácil de adivinar. Usa una contraseña más segura, con letras, números y símbolos." : (authError?.message ?? "No se pudo crear la cuenta."));
    }

    const userId = creado.user.id;
    let sedeId: string | null = null;
    let participanteId: string | null = null;

    const rollback = async () => {
      // Limpiar primero las tablas hijas para evitar dejar referencias huérfanas
      // si falla una etapa intermedia del alta pública.
      await supabaseAdmin.from("participante_cuentas").delete().eq("user_id", userId);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      await supabaseAdmin.from("user_areas").delete().eq("user_id", userId);
      await supabaseAdmin.from("profiles").delete().eq("id", userId);
      if (participanteId) {
        await supabaseAdmin.from("ecosistema_participantes").delete().eq("id", participanteId);
      }
      if (sedeId) {
        await supabaseAdmin.from("sedes").delete().eq("id", sedeId);
      }
      await supabaseAdmin.auth.admin.deleteUser(userId);
    };

    const { data: sede, error: sedeError } = await supabaseAdmin
      .from("sedes")
      .insert({ nombre: taller, ciudad, modo: "completo", activa: true })
      .select("id")
      .single();
    if (sedeError || !sede) {
      await rollback();
      throw new Error("No se pudo crear el espacio de trabajo del taller.");
    }
    sedeId = sede.id;

    const { data: participante, error: participanteError } = await supabaseAdmin
      .from("ecosistema_participantes")
      .insert({
        tipo_participante: "organizacion",
        nombre: taller,
        email,
        telefono: telefono || null,
        ciudad: ciudad || null,
        estado: "activo",
        sede_id: sedeId,
        metadata: { origen: "registro_publico", plan_comercial: "emprendedor", pais },
      })
      .select("id")
      .single();
    if (participanteError || !participante) {
      console.error("[registrarTaller] Error al crear participante:", participanteError);
      await rollback();
      const detalle = participanteError
        ? [participanteError.message, participanteError.code, participanteError.details, participanteError.hint]
            .filter(Boolean)
            .join(" | ")
        : "La inserción no devolvió ningún participante.";
      throw new Error(`No se pudo crear el taller en el ecosistema: ${detalle}`);
    }
    participanteId = participante.id;

    const { error: perfilError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      usuario: nombre,
      nombre,
      apellidos: "",
      dni: "",
      telefono,
      sede_id: sedeId,
      participante_id: participanteId,
      activo: true,
    });
    if (perfilError) {
      await rollback();
      throw new Error("No se pudo preparar el perfil del responsable.");
    }

    const { error: rolError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: "gerente",
      sede_id: sedeId,
      participante_id: participanteId,
    });
    if (rolError) {
      await rollback();
      throw new Error("No se pudo asignar el acceso del taller.");
    }

    try {
      await asegurarCuentaParticipantePrincipal(supabaseAdmin, userId, participanteId);
    } catch (error) {
      await rollback();
      throw error;
    }

    let correoEnviado = false;
    try {
      const origin = process.env.AURUM_SITE_URL || "https://www.tallerdeljoyero.com";
      const { data: emailResult, error: emailError } = await supabaseAdmin.functions.invoke("aurum-welcome-email", {
        body: {
          nombre,
          taller,
          email,
          loginUrl: `${origin}/auth`,
        },
      });
      correoEnviado = !emailError && emailResult?.ok === true;
      if (emailError || !correoEnviado) {
        console.error("[registrarTaller] No se pudo enviar el correo de bienvenida:", emailError ?? emailResult);
      }
    } catch (emailError) {
      console.error("[registrarTaller] Error enviando correo de bienvenida:", emailError);
    }

    return { ok: true, email, participanteId, sedeId, correoEnviado };
  });

/** Alta del primer dueño general. Sólo funciona mientras Auth y roles estén vacíos. */
export const registrarPrimerDueno = createServerFn({ method: "POST" })
  .inputValidator((input: NuevoUsuario & { codigoInstalacion?: string }) => {
    const validado = validar(input);
    const codigoInstalacion = typeof input?.codigoInstalacion === "string" ? input.codigoInstalacion.trim() : "";
    if (!codigoInstalacion || codigoInstalacion.length > 256) throw new Error("Ingresa el código de instalación.");
    return { ...validado, codigoInstalacion };
  })
  .handler(async ({ data }) => {
    const codigoEsperado = codigoInstalacionConfigurado();
    if (!codigoEsperado || data.codigoInstalacion !== codigoEsperado) {
      throw new Error("El alta inicial no está habilitada o el código de instalación no es válido.");
    }
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

    const { data: participante, error: participanteError } = await supabaseAdmin
      .from("ecosistema_participantes")
      .select("id, sede_id, estado")
      .eq("nombre", "FADILAB")
      .eq("estado", "activo")
      .maybeSingle();

    if (participanteError || !participante?.id) throw new Error("No se pudo preparar el taller inicial");
    if (!participante?.id) {
      throw new Error("El taller FADILAB todavía no está vinculado al ecosistema. Primero debe aplicarse la migración de talleres.");
    }

    const email = data.email.trim().toLowerCase();
    const usuario = data.usuario.trim().toLowerCase();
    const { data: existentes, error: errorExistentes } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (errorExistentes) throw new Error("No se pudo comprobar si el correo ya está registrado");
    if ((existentes?.users ?? []).some((u) => (u.email ?? "").toLowerCase() === email)) {
      throw new Error("Ese correo ya está registrado. Utiliza otro correo.");
    }
    if ((existentes?.users ?? []).some((u) => (u.user_metadata?.usuario ?? "").toLowerCase() === usuario)) {
      throw new Error("Ese nombre de usuario ya está registrado. Elige otro.");
    }

    const { data: creado, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { usuario, nombre: data.nombre, apellidos: data.apellidos, dni: data.dni, telefono: data.telefono },
    });

    if (error || !creado.user) {
      throw new Error(/already been registered/i.test(error?.message ?? "") ? "Ya existe una cuenta con ese usuario o correo." : (error?.message ?? "No se pudo crear el usuario"));
    }

    const { error: perfilError } = await supabaseAdmin.from("profiles").upsert({
      id: creado.user.id,
      usuario,
      nombre: data.nombre,
      apellidos: data.apellidos,
      dni: data.dni,
      telefono: data.telefono,
      sede_id: participante.sede_id ?? null,
      participante_id: participante.id,
    });

    if (perfilError) {
      await supabaseAdmin.auth.admin.deleteUser(creado.user.id);
      throw new Error("No se pudo crear el perfil inicial");
    }

    const { error: rolError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: creado.user.id, role: "dueno", sede_id: participante.sede_id, participante_id: participante.id });

    if (rolError) {
      await supabaseAdmin.auth.admin.deleteUser(creado.user.id);
      throw new Error("No se pudo asignar el rol inicial");
    }

    try {
      await asegurarCuentaParticipantePrincipal(supabaseAdmin, creado.user.id, participante.id);
    } catch (error) {
      await supabaseAdmin.auth.admin.deleteUser(creado.user.id);
      throw error;
    }

    return { ok: true };
  });

/**
 * Aprueba una solicitud pública y la convierte en una identidad operativa del Ecosistema.
 * No crea credenciales: la cuenta de acceso se vincula después de forma explícita.
 */
export const aprobarSolicitudAcceso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { solicitudId: string }) => input)
  .handler(async ({ data, context }) => {
    if (!data.solicitudId) throw new Error("Solicitud no válida");

    const { data: roles, error: rolesError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (rolesError) throw new Error("No se pudo verificar tu rol");
    if (!(roles ?? []).some((r) => r.role === "dueno")) {
      throw new Error("Sólo el Dueño puede aprobar solicitudes de acceso");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: solicitud, error: solicitudError } = await supabaseAdmin
      .from("solicitudes_acceso")
      .select("id, tipo_solicitante, nombre, empresa, email, telefono, ciudad, especialidades, descripcion, estado, participante_id")
      .eq("id", data.solicitudId)
      .maybeSingle();
    if (solicitudError) throw new Error("No se pudo consultar la solicitud");
    if (!solicitud) throw new Error("La solicitud ya no existe");
    if (solicitud.participante_id) {
      if (solicitud.estado !== "aprobada") {
        const { error } = await supabaseAdmin.from("solicitudes_acceso").update({
          estado: "aprobada",
          revisado_por: context.userId,
          revisado_at: new Date().toISOString(),
        }).eq("id", solicitud.id);
        if (error) throw new Error("La solicitud ya tenía participante, pero no se pudo actualizar su estado");
      }
      return { ok: true, participanteId: solicitud.participante_id, creado: false };
    }
    if (solicitud.estado !== "pendiente") throw new Error("Sólo se pueden aprobar solicitudes pendientes");

    const tipoParticipante = solicitud.tipo_solicitante === "taller" ? "organizacion" : solicitud.tipo_solicitante;
    const nombreBase = (solicitud.empresa?.trim() || solicitud.nombre.trim()).slice(0, 160);
    const ciudad = (solicitud.ciudad?.trim() || "").slice(0, 80);

    // Sede legacy de compatibilidad: se crea una sola vez y queda enlazada al participante canónico.
    let sedeId: string | null = null;
    let sedeCreada = false;
    const { data: sedeExistente } = await supabaseAdmin
      .from("sedes")
      .select("id, nombre, ciudad")
      .eq("nombre", nombreBase)
      .maybeSingle();
    if (sedeExistente) {
      sedeId = sedeExistente.id;
    } else {
      const { data: sedeNueva, error: sedeError } = await supabaseAdmin
        .from("sedes")
        .insert({ nombre: nombreBase, ciudad, modo: "completo", activa: true })
        .select("id")
        .single();
      if (sedeError || !sedeNueva) throw new Error("No se pudo crear la sede del nuevo participante");
      sedeId = sedeNueva.id;
      sedeCreada = true;
    }

    const { data: participante, error: participanteError } = await supabaseAdmin
      .from("ecosistema_participantes")
      .insert({
        tipo_participante: tipoParticipante,
        nombre: nombreBase,
        email: solicitud.email.trim().toLowerCase(),
        telefono: solicitud.telefono?.trim() || null,
        ciudad: ciudad || null,
        descripcion: solicitud.descripcion?.trim() || null,
        estado: "activo",
        sede_id: sedeId,
        metadata: { solicitud_acceso_id: solicitud.id, especialidades: solicitud.especialidades ?? [] },
      })
      .select("id")
      .single();

    if (participanteError || !participante) {
      if (sedeCreada && sedeId) await supabaseAdmin.from("sedes").delete().eq("id", sedeId);
      throw new Error("No se pudo crear el participante del Ecosistema");
    }

    const { error: solicitudUpdateError } = await supabaseAdmin
      .from("solicitudes_acceso")
      .update({
        estado: "aprobada",
        participante_id: participante.id,
        revisado_por: context.userId,
        revisado_at: new Date().toISOString(),
      })
      .eq("id", solicitud.id)
      .is("participante_id", null);

    if (solicitudUpdateError) {
      await supabaseAdmin.from("ecosistema_participantes").delete().eq("id", participante.id);
      if (sedeCreada && sedeId) await supabaseAdmin.from("sedes").delete().eq("id", sedeId);
      throw new Error("No se pudo cerrar la aprobación de la solicitud");
    }

    return { ok: true, participanteId: participante.id, creado: true };
  });


/**
 * Invita al responsable de una solicitud aprobada y deja su cuenta
 * vinculada al participante. El responsable recibe el enlace de alta
 * por correo y queda como gerente del taller, no como dueño global.
 */
export const invitarResponsableSolicitudAcceso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { solicitudId: string }) => input)
  .handler(async ({ data, context }) => {
    if (!data.solicitudId) throw new Error("Solicitud no válida");

    const { data: roles, error: rolesError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (rolesError) throw new Error("No se pudo verificar tu rol");
    if (!(roles ?? []).some((r) => r.role === "dueno")) {
      throw new Error("Sólo el Dueño puede invitar al responsable de un taller");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: solicitud, error: solicitudError } = await supabaseAdmin
      .from("solicitudes_acceso")
      .select("id, nombre, email, telefono, estado, participante_id")
      .eq("id", data.solicitudId)
      .maybeSingle();

    if (solicitudError) throw new Error("No se pudo consultar la solicitud");
    if (!solicitud) throw new Error("La solicitud ya no existe");
    if (solicitud.estado !== "aprobada" || !solicitud.participante_id) {
      throw new Error("Primero debes aprobar la solicitud y crear su participante");
    }

    const email = solicitud.email?.trim().toLowerCase();
    if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
      throw new Error("La solicitud no tiene un correo válido para enviar la invitación");
    }

    const { data: participante, error: participanteError } = await supabaseAdmin
      .from("ecosistema_participantes")
      .select("id, sede_id, nombre, estado")
      .eq("id", solicitud.participante_id)
      .maybeSingle();
    if (participanteError || !participante) throw new Error("El participante de la solicitud no existe");
    if (participante.estado !== "activo") throw new Error("El participante del taller no está activo");

    const { data: authUsers, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authUsersError) throw new Error("No se pudo comprobar si el correo ya tiene una cuenta");
    const existente = authUsers.users.find((u) => (u.email ?? "").toLowerCase() === email);

    if (existente) {
      const { data: cuentaExistente } = await supabaseAdmin
        .from("participante_cuentas")
        .select("id, estado")
        .eq("participante_id", participante.id)
        .eq("user_id", existente.id)
        .maybeSingle();
      if (cuentaExistente?.estado === "activo") {
        throw new Error("El responsable ya tiene una cuenta activa vinculada a este taller");
      }
      throw new Error("Ese correo ya pertenece a una cuenta del sistema. Debe vincularse o editarse desde Usuarios, no crear otra cuenta.");
    }

    const { data: invitado, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        nombre: solicitud.nombre,
        telefono: solicitud.telefono ?? null,
        participante_id: participante.id,
        sede_id: participante.sede_id ?? null,
        rol: "gerente",
      },
    });

    if (inviteError || !invitado.user) {
      throw new Error(inviteError?.message ?? "No se pudo enviar la invitación");
    }

    const userId = invitado.user.id;
    const cleanup = async () => {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    };

    const { error: perfilError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      usuario: email.split("@")[0].slice(0, 50),
      nombre: solicitud.nombre,
      apellidos: "",
      dni: "",
      telefono: solicitud.telefono ?? "",
      sede_id: participante.sede_id ?? null,
      participante_id: participante.id,
      activo: true,
    });

    if (perfilError) {
      await cleanup();
      throw new Error("Se envió la invitación, pero no se pudo crear el perfil del responsable");
    }

    const { error: rolError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: "gerente",
      sede_id: participante.sede_id ?? null,
      participante_id: participante.id,
    });

    if (rolError) {
      await supabaseAdmin.from("profiles").delete().eq("id", userId);
      await cleanup();
      throw new Error("Se envió la invitación, pero no se pudo asignar el rol del responsable");
    }

    try {
      await asegurarCuentaParticipantePrincipal(supabaseAdmin, userId, participante.id);
    } catch (error) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      await supabaseAdmin.from("profiles").delete().eq("id", userId);
      await cleanup();
      throw error;
    }

    return { ok: true, userId, participanteId: participante.id, email };
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

    const { data: cuentasParticipantes, error: cuentasParticipantesError } = await supabaseAdmin
      .from("participante_cuentas")
      .select("user_id, participante_id, estado")
      .eq("estado", "activo");
    if (cuentasParticipantesError) {
      throw new Error("No se pudo reconciliar la pertenencia de los usuarios a los talleres");
    }

    const participantesPorUsuario = new Map<string, Set<string>>();
    for (const cuenta of cuentasParticipantes ?? []) {
      const actuales = participantesPorUsuario.get(cuenta.user_id) ?? new Set<string>();
      actuales.add(cuenta.participante_id);
      participantesPorUsuario.set(cuenta.user_id, actuales);
    }

    const participantesDelGerente = participantesPorUsuario.get(context.userId) ?? new Set<string>();

    return authUsers
      .map((authUser) => {
        const perfil = perfilesMap.get(authUser.id);
        const rolesUsuario = rolesMap.get(authUser.id) ?? [];
        const participanteIds = participantesPorUsuario.get(authUser.id) ?? new Set<string>();
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
          email: authUser.email ?? "",
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
        const participantesUsuario = participantesPorUsuario.get(usuario.id) ?? new Set<string>();
        return !rolesUsuario.some((r) => r.role === "dueno" || r.role === "gerente") &&
          [...participantesUsuario].some((id) => participantesDelGerente.has(id));
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
    if (data.rol === "gerente" && !misRoles.includes("dueno")) {
      throw new Error("Sólo un dueño puede crear cuentas de gerente");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const participanteDestino = await resolverParticipantePorSede(supabaseAdmin, data.sede_id, data.participante_id ?? null);
    if (!participanteDestino?.id) {
      throw new Error("El taller seleccionado no está vinculado al ecosistema");
    }

    if (!misRoles.includes("dueno")) {
      const pertenece = await usuarioComparteParticipante(supabaseAdmin, context.userId, context.userId);
      if (!pertenece) throw new Error("Tu cuenta no está vinculada a ningún taller");
      const { data: misCuentas } = await supabaseAdmin
        .from("participante_cuentas")
        .select("participante_id")
        .eq("user_id", context.userId)
        .eq("estado", "activo");
      if (!(misCuentas ?? []).some((c: any) => c.participante_id === participanteDestino.id)) {
        throw new Error("No puedes crear usuarios fuera de tu taller");
      }
    }

    const usuarioNormalizado = data.usuario.trim().toLowerCase();
    const emailNormalizado = data.email.trim().toLowerCase();
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
        email: emailNormalizado,
        nombre: data.nombre,
        apellidos: data.apellidos,
        dni: data.dni,
        telefono: data.telefono,
      },
    });
    if (error || !creado.user) throw new Error(/already been registered/i.test(error?.message ?? "") ? "Ya existe una cuenta con ese usuario o correo." : (error?.message ?? "No se pudo crear el usuario"));

    const { error: perfilError } = await supabaseAdmin.from("profiles").upsert({
      id: creado.user.id,
      usuario: usuarioNormalizado,
      nombre: data.nombre,
      apellidos: data.apellidos,
      dni: data.dni,
      telefono: data.telefono,
      sede_id: participanteDestino.sede_id ?? data.sede_id,
      participante_id: participanteDestino.id,
      acceso_desde: data.acceso_desde ?? null,
      acceso_hasta: data.acceso_hasta ?? null,
    });
    if (perfilError) {
      await supabaseAdmin.auth.admin.deleteUser(creado.user.id);
      throw new Error("Usuario creado en Auth, pero no se pudo crear el perfil");
    }

    const { error: rolError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: creado.user.id, role: data.rol, sede_id: participanteDestino.sede_id ?? data.sede_id, participante_id: participanteDestino.id });
    if (rolError) {
      await supabaseAdmin.auth.admin.deleteUser(creado.user.id);
      throw new Error("Usuario creado, pero no se pudo asignar el rol");
    }

    try {
      await asegurarCuentaParticipantePrincipal(supabaseAdmin, creado.user.id, participanteDestino.id);
    } catch (error) {
      await supabaseAdmin.auth.admin.deleteUser(creado.user.id);
      throw error;
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
      if (!(await usuarioComparteParticipante(admin, context.userId, data.id))) {
        throw new Error("Sólo puedes eliminar usuarios de un taller al que perteneces");
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
  email: string;
  nombre: string;
  apellidos: string;
  dni: string;
  telefono: string;
  sede_id: string | null;
  participante_id?: string | null;
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
    if (!data.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) return { ok: false, error: "Ingresa un correo electrónico válido" };
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
    if (data.rol === "gerente" && !misRoles.includes("dueno")) {
      return { ok: false, error: "Sólo un dueño puede asignar el rol de gerente" };
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
      if (!(await usuarioComparteParticipante(supabaseAdmin, context.userId, data.id))) {
        return { ok: false, error: "Sólo puedes editar usuarios de un taller al que perteneces" };
      }
    }
    const { data: authActual, error: authActualError } = await supabaseAdmin.auth.admin.getUserById(data.id);
    if (authActualError || !authActual.user) return { ok: false, error: "La cuenta de autenticación no existe" };
    const usuarioNormalizado = data.usuario.trim().toLowerCase();
    const emailNormalizado = data.email.trim().toLowerCase();
    const { data: todosAuth } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (todosAuth?.users.some((u) => u.id !== data.id && (u.email ?? "").toLowerCase() === emailNormalizado)) {
      return { ok: false, error: "Ese usuario ya pertenece a otra cuenta" };
    }

    const participanteDestino = await resolverParticipantePorSede(supabaseAdmin, data.sede_id, data.participante_id ?? null);
    if (!participanteDestino?.id) {
      return { ok: false, error: "El taller seleccionado no está vinculado al ecosistema" };
    }
    if (!misRoles.includes("dueno")) {
      const { data: misCuentas, error: misCuentasError } = await supabaseAdmin
        .from("participante_cuentas")
        .select("participante_id")
        .eq("user_id", context.userId)
        .eq("estado", "activo");
      if (misCuentasError || !(misCuentas ?? []).some((cuenta: any) => cuenta.participante_id === participanteDestino.id)) {
        return { ok: false, error: "No puedes asignar usuarios fuera de tu taller" };
      }
    }

    const { error: errPerfil } = await supabaseAdmin.from("profiles").upsert({
      id: data.id,
      usuario: usuarioNormalizado,
      nombre: data.nombre,
      apellidos: data.apellidos,
      dni: data.dni,
      telefono: data.telefono,
      sede_id: participanteDestino.sede_id ?? data.sede_id,
      participante_id: participanteDestino.id,
      activo: data.activo,
      acceso_desde: data.acceso_desde,
      acceso_hasta: data.acceso_hasta,
    });
    if (errPerfil) return { ok: false, error: errPerfil.message };

    const { error: errRolDelete } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    if (errRolDelete) return { ok: false, error: errRolDelete.message };

    const { error: errRolInsert } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.id, role: data.rol, sede_id: participanteDestino.sede_id ?? data.sede_id, participante_id: participanteDestino.id });
    if (errRolInsert) return { ok: false, error: errRolInsert.message };

    try {
      await asegurarCuentaParticipantePrincipal(supabaseAdmin, data.id, participanteDestino.id);
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "No se pudo vincular el usuario al taller" };
    }

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
        email: emailNormalizado,
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
