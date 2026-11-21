import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const PREFIJOS: Record<string, string> = {
  PE: "51", US: "1", CA: "1", MX: "52", ES: "34", CO: "57", CL: "56",
  AR: "54", BR: "55", EC: "593", BO: "591", UY: "598", PY: "595",
  VE: "58", CR: "506", PA: "507", DO: "1", GB: "44", FR: "33",
  DE: "49", IT: "39", PT: "351", NL: "31", CH: "41", AU: "61",
  NZ: "64", JP: "81", CN: "86", IN: "91", AE: "971",
};

function telefonoInternacional(value: string | undefined, pais: string): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) {
    if (digits.length < 7 || digits.length > 15) throw new ToolError("Revisa el teléfono: debe incluir un prefijo internacional válido.");
    return `+${digits}`;
  }
  const prefix = PREFIJOS[pais] ?? PREFIJOS.PE!;
  const national = digits.startsWith(prefix) && digits.length > prefix.length + 4 ? digits.slice(prefix.length) : digits;
  if (national.length < 4 || national.length + prefix.length > 15) throw new ToolError("Revisa el teléfono: el número nacional no es válido.");
  return `+${prefix}${national}`;
}

export default defineTool({
  name: "crear_cliente",
  title: "Crear cliente",
  description: "Registra un cliente nuevo en la sede del usuario autenticado. SOLO ejecutar después de presentar el resumen de todos los datos y recibir una confirmación explícita del usuario. Nunca inventes datos. Los campos opcionales omitidos se guardan vacíos. No sirve para editar clientes existentes.",
  inputSchema: {
    tipo: z.enum(["persona", "empresa"]).describe("persona para Particular; empresa para Empresa."),
    nombre: z.string().trim().min(2).max(160).describe("Nombre completo o razón social."),
    documento: z.string().trim().max(40).optional().describe("DNI, RUC u otro documento; opcional."),
    pais_telefono: z.enum(["PE","US","CA","MX","ES","CO","CL","AR","BR","EC","BO","UY","PY","VE","CR","PA","DO","GB","FR","DE","IT","PT","NL","CH","AU","NZ","JP","CN","IN","AE"]).optional().describe("País del prefijo telefónico; PE por defecto."),
    telefono: z.string().trim().max(30).optional().describe("Teléfono nacional o internacional; opcional."),
    whatsapp: z.string().trim().max(30).optional().describe("WhatsApp nacional o internacional; opcional."),
    email: z.string().trim().email().max(254).optional().describe("Correo electrónico; opcional."),
    ciudad: z.string().trim().max(100).optional().describe("Ciudad; opcional."),
    direccion: z.string().trim().max(240).optional().describe("Dirección; opcional."),
    fecha_nacimiento: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/).optional().describe("Fecha en formato YYYY-MM-DD; opcional."),
    observaciones: z.string().trim().max(1000).optional().describe("Observaciones comerciales; opcional."),
    taller: z.string().trim().max(120).optional().describe("Nombre del taller si el usuario tiene más de un taller activo."),
    confirmacion_explicita: z.literal(true).describe("Debe ser true solo después de que el usuario confirme explícitamente el resumen de registro."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (args, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("No autenticado.");
    const supabase = supabaseForUser(ctx);
    const { data: roles, error: rolesError } = await supabase.from("user_roles").select("role").eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "");
    if (rolesError) throw new ToolError("No se pudo verificar el permiso del usuario.");
    const roleNames = (roles ?? []).map((r) => String(r.role));
    if (!roleNames.includes("dueno") && !roleNames.includes("gerente")) throw new ToolError("No tienes permisos para registrar clientes.");

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new ToolError("La sesión no es válida.");
    const userId = authData.user.id;
    const { data: cuentas, error: cuentasError } = await supabase.from("participante_cuentas")
      .select("participante_id").eq("user_id", userId).eq("estado", "activo");
    if (cuentasError) throw new ToolError("No se pudo determinar el taller activo.");
    const ids = [...new Set((cuentas ?? []).map((x) => x.participante_id).filter((x): x is string => Boolean(x)))];
    const { data: perfil } = await supabase.from("profiles").select("participante_id").eq("id", userId).maybeSingle();
    if (perfil?.participante_id && !ids.includes(perfil.participante_id)) ids.push(perfil.participante_id);
    if (ids.length === 0) throw new ToolError("Tu usuario no tiene un taller activo asociado. Selecciona o configura tu taller antes de registrar clientes.");

    const { data: participantes, error: participantesError } = await supabase.from("ecosistema_participantes")
      .select("id,nombre,sede_id").in("id", ids).eq("estado", "activo");
    if (participantesError) throw new ToolError("No se pudo verificar la sede del taller.");
    const disponibles = (participantes ?? []).filter((p) => Boolean(p.sede_id));
    const taller = typeof args.taller === "string" ? args.taller.trim().toLocaleLowerCase("es") : "";
    const coincidencias = taller
      ? disponibles.filter((p) => p.nombre.toLocaleLowerCase("es") === taller)
      : disponibles;
    if (coincidencias.length !== 1) {
      if (disponibles.length > 1) throw new ToolError(`Tienes varios talleres activos. Indica cuál usar: ${disponibles.map((p) => p.nombre).join(", ")}.`);
      throw new ToolError("No se pudo determinar una única sede activa para este registro.");
    }
    const participante = coincidencias[0]!;
    const tipo = args.tipo === "empresa" ? "empresa" : "persona";
    const nombre = String(args.nombre).trim().replace(/\\s+/g, " ");
    const documento = typeof args.documento === "string" ? args.documento.trim() : "";
    const email = typeof args.email === "string" ? args.email.trim().toLowerCase() : "";
    const pais = typeof args.pais_telefono === "string" ? args.pais_telefono : "PE";
    const telefono = telefonoInternacional(typeof args.telefono === "string" ? args.telefono : undefined, pais);
    const whatsapp = telefonoInternacional(typeof args.whatsapp === "string" ? args.whatsapp : undefined, pais);
    const fecha = typeof args.fecha_nacimiento === "string" ? args.fecha_nacimiento : null;
    if (fecha && (Number.isNaN(Date.parse(`${fecha}T00:00:00Z`)) || new Date(`${fecha}T00:00:00Z`).toISOString().slice(0,10) !== fecha)) {
      throw new ToolError("La fecha de nacimiento no es válida.");
    }
    if (fecha && fecha > new Date().toISOString().slice(0,10)) throw new ToolError("La fecha de nacimiento no puede estar en el futuro.");

    // Detección preventiva de duplicados dentro del alcance RLS del usuario.
    if (documento) {
      const { data: duplicate } = await supabase.from("clientes").select("id").eq("sede_id", participante.sede_id!).eq("documento", documento).limit(1).maybeSingle();
      if (duplicate) throw new ToolError("Ya existe un cliente con ese documento en este taller. No se creó un duplicado.");
    }
    if (email) {
      const { data: duplicate } = await supabase.from("clientes").select("id").eq("sede_id", participante.sede_id!).ilike("email", email).limit(1).maybeSingle();
      if (duplicate) throw new ToolError("Ya existe un cliente con ese correo en este taller. No se creó un duplicado.");
    }

    const { error } = await supabase.from("clientes").insert({
      nombre, tipo, documento: documento || null, telefono, whatsapp, email: email || null,
      ciudad: typeof args.ciudad === "string" ? args.ciudad.trim() || null : null,
      direccion: typeof args.direccion === "string" ? args.direccion.trim() || null : null,
      fecha_nacimiento: fecha,
      notas: typeof args.observaciones === "string" ? args.observaciones.trim() : "",
      sede_id: participante.sede_id,
      participante_id: participante.id,
    });
    if (error) {
      console.error("auri crear_cliente insert failed", { code: error.code });
      if (error.code === "42501") throw new ToolError("Supabase no autorizó el registro para esta sede. Verifica el rol y los permisos RLS.");
      throw new ToolError("No se pudo guardar el cliente. Revisa los datos e inténtalo nuevamente.");
    }
    return {
      content: [{ type: "text", text: "Cliente registrado correctamente." }],
      structuredContent: { creado: true },
    };
  },
});
