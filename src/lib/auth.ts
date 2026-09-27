import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Rol = "dueno" | "gerente" | "operario" | "monitor" | "cliente";

export const rolEtiqueta: Record<Rol, string> = {
  dueno: "Dueño general",
  gerente: "Gerente / admin de sede",
  operario: "Operario de área",
  monitor: "Monitor de taller",
  cliente: "Cliente / seguimiento",
};

export const AREAS = ["Pedidos","Diseño 3D","Impresión 3D","Casting","Corte Láser","Taller","Área ventas"] as const;

export const areaAliases: Record<string, string> = {
  "Servicio láser": "Corte Láser", "Corte láser": "Corte Láser", "Corte Laser": "Corte Láser",
  "Taller / Engaste": "Taller", "Más alto": "Taller", "Mas alto": "Taller",
  Ventas: "Área ventas", "Área de Ventas": "Área ventas", Terminado: "Área ventas", Entregado: "Área ventas",
};

export function normalizarArea(area: string | null | undefined) {
  if (!area) return "";
  return areaAliases[area] ?? area;
}

export function areaCoincide(areaA: string | null | undefined, areaB: string | null | undefined) {
  return normalizarArea(areaA) === normalizarArea(areaB);
}

export const areaRuta: Record<string, string> = {
  Pedidos: "/pedidos", "Diseño 3D": "/diseno-3d", "Impresión 3D": "/impresion-3d",
  Casting: "/casting", Taller: "/taller", "Área ventas": "/ventas",
  "Corte Láser": "/corte-laser", "Servicio láser": "/corte-laser", Terminado: "/gestion",
};

export type Sesion = {
  user: User;
  perfil: {
    id: string; usuario: string; nombre: string; apellidos: string; dni: string; telefono: string;
    sede_id: string | null; participante_id: string | null;
    activo?: boolean; acceso_desde?: string | null; acceso_hasta?: string | null;
  };
  roles: Rol[];
  areas: string[];
  sede: { id: string; nombre: string; ciudad: string; modo: string } | null;
  participante: { id: string; nombre: string; ciudad: string | null; sede_id: string | null } | null;
  participantes: Array<{ id: string; nombre: string; ciudad: string | null; sede_id: string | null }>;
  esDueno: boolean; esAdmin: boolean; rolPrincipal: Rol;
};

export function useSesion() {
  return useQuery({
    queryKey: ["sesion"], staleTime: 0, gcTime: 5 * 60 * 1000,
    refetchOnMount: "always", refetchOnWindowFocus: true, refetchOnReconnect: true, retry: 1,
    queryFn: async (): Promise<Sesion | null> => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) console.warn("[auth] Error al leer sesión persistida", sessionError.message);
      const user = sessionData.session?.user;
      if (!user) return null;

      const [{ data: perfil }, { data: roles }, { data: areas }, { data: cuentas }] = await Promise.all([
        supabase.from("profiles")
          .select("id, usuario, nombre, apellidos, dni, telefono, sede_id, participante_id, activo, acceso_desde, acceso_hasta")
          .eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("user_areas").select("area").eq("user_id", user.id),
        supabase.from("participante_cuentas").select("participante_id, estado, created_at")
          .eq("user_id", user.id).eq("estado", "activo")
          .order("created_at", { ascending: true }),
      ]);

      const listaRoles = (roles ?? []).map((r) => r.role as Rol);
      const hoy = new Date().toISOString().slice(0, 10);
      const bloqueado = perfil != null && (
        perfil.activo === false ||
        (perfil.acceso_desde != null && hoy < perfil.acceso_desde) ||
        (perfil.acceso_hasta != null && hoy > perfil.acceso_hasta)
      );
      if (bloqueado) { await supabase.auth.signOut(); return null; }

      // Ecosistema es la fuente de verdad de pertenencia. sede_id queda solo
      // como compatibilidad histórica del perfil y nunca se usa para autorizar.
      const participanteIds = Array.from(new Set([
        ...((cuentas ?? []).map((c) => c.participante_id).filter(Boolean) as string[]),
        ...(perfil?.participante_id ? [perfil.participante_id] : []),
      ]));
      let participantes: Sesion["participantes"] = [];
      if (participanteIds.length > 0) {
        const { data } = await supabase.from("ecosistema_participantes")
          .select("id, nombre, ciudad, sede_id")
          .in("id", participanteIds)
          .eq("estado", "activo")
          .order("nombre");
        participantes = (data ?? []) as Sesion["participantes"];
      }

      // Si todavía no existe cuenta explícita en participante_cuentas, usamos
      // temporalmente profiles.participante_id y luego profiles.sede_id para
      // resolver el participante canónico. Esto evita perder la identidad visual
      // durante la migración sin convertir sede_id en fuente de autorización.
      let participanteResuelto = participantes[0] ?? null;

      if (!participanteResuelto && perfil?.participante_id) {
        const { data } = await supabase
          .from("ecosistema_participantes")
          .select("id, nombre, ciudad, sede_id")
          .eq("id", perfil.participante_id)
          .eq("estado", "activo")
          .maybeSingle();
        participanteResuelto = (data ?? null) as Sesion["participante"];
      }

      if (!participanteResuelto && perfil?.sede_id) {
        const { data } = await supabase
          .from("ecosistema_participantes")
          .select("id, nombre, ciudad, sede_id")
          .eq("sede_id", perfil.sede_id)
          .eq("estado", "activo")
          .order("nombre")
          .limit(1)
          .maybeSingle();
        participanteResuelto = (data ?? null) as Sesion["participante"];
      }

      const participanteId = participanteResuelto?.id ?? null;
      const participante = participanteResuelto;

      // Objeto legacy para componentes que aún muestran el nombre del taller.
      // No se consulta sedes: el dato operativo proviene del participante.
      const sede = participante
        ? {
            id: participante.sede_id ?? participante.id,
            nombre: participante.nombre,
            ciudad: participante.ciudad ?? "",
            modo: "ecosistema",
          }
        : null;

      const orden: Rol[] = ["dueno", "gerente", "operario", "monitor", "cliente"];
      const rolPrincipal = orden.find((r) => listaRoles.includes(r)) ?? "cliente";

      // El perfil administrativo es la fuente principal. Si una cuenta Auth
      // todavía no tiene fila en profiles, usamos los metadatos de Auth como
      // identidad de respaldo para no mostrar "Usuario".
      const nombreAuth = typeof user.user_metadata?.nombre === "string" ? user.user_metadata.nombre.trim() : "";
      const apellidosAuth = typeof user.user_metadata?.apellidos === "string" ? user.user_metadata.apellidos.trim() : "";
      const usuarioAuth =
        typeof user.user_metadata?.usuario === "string"
          ? user.user_metadata.usuario.trim()
          : (user.email?.split("@")[0] ?? "").trim();

      return {
        user,
        perfil: perfil ?? {
          id: user.id,
          usuario: usuarioAuth,
          nombre: nombreAuth,
          apellidos: apellidosAuth,
          dni: typeof user.user_metadata?.dni === "string" ? user.user_metadata.dni.trim() : "",
          telefono: typeof user.user_metadata?.telefono === "string" ? user.user_metadata.telefono.trim() : "",
          sede_id: participante?.sede_id ?? null,
          participante_id: participanteId
        },
        roles: listaRoles, areas: (areas ?? []).map((a) => a.area), sede, participante, participantes,
        esDueno: listaRoles.includes("dueno"),
        esAdmin: listaRoles.includes("dueno") || listaRoles.includes("gerente"),
        rolPrincipal,
      };
    },
  });
}

export function esVistaMovilTablet() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}

export function inicioSegunRol(s: Sesion, opciones?: { movilTablet?: boolean }): string {
  if (s.rolPrincipal === "monitor") return "/monitor";
  if (s.rolPrincipal === "cliente") return "/cliente";
  if (s.rolPrincipal === "operario") return opciones?.movilTablet ? "/inicio" : "/operario";
  if (s.esAdmin) return "/inicio";
  return "/inicio";
}

export function correoDesdeUsuario(usuario: string) {
  const limpio = usuario.trim().toLowerCase();
  return limpio.includes("@") ? limpio : `${limpio}@taller.local`;
}

export function useCerrarSesion() {
  const qc = useQueryClient();
  return async () => { await supabase.auth.signOut(); qc.clear(); window.location.href = "/auth"; };
}

export function useSincronizarSesion() {
  const qc = useQueryClient();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") { qc.clear(); return; }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        void qc.invalidateQueries({ queryKey: ["sesion"] });
      }
    });
    return () => subscription.unsubscribe();
  }, [qc]);
}
