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

export const AREAS = [
  "Pedidos",
  "Diseño 3D",
  "Impresión 3D",
  "Casting",
  "Corte Láser",
  "Taller",
  "Área ventas",
] as const;

export const areaAliases: Record<string, string> = {
  "Servicio láser": "Corte Láser",
  "Corte láser": "Corte Láser",
  "Corte Laser": "Corte Láser",
  "Taller / Engaste": "Taller",
  "Más alto": "Taller",
  "Mas alto": "Taller",
  Ventas: "Área ventas",
  "Área de Ventas": "Área ventas",
  Terminado: "Área ventas",
  Entregado: "Área ventas",
};

export function normalizarArea(area: string | null | undefined) {
  if (!area) return "";
  return areaAliases[area] ?? area;
}

export function areaCoincide(areaA: string | null | undefined, areaB: string | null | undefined) {
  return normalizarArea(areaA) === normalizarArea(areaB);
}

export const areaRuta: Record<string, string> = {
  Pedidos: "/pedidos",
  "Diseño 3D": "/diseno-3d",
  "Impresión 3D": "/impresion-3d",
  Casting: "/casting",
  Taller: "/taller",
  "Área ventas": "/ventas",
  "Corte Láser": "/corte-laser",
  "Servicio láser": "/corte-laser",
  Terminado: "/gestion",
};

export type Sesion = {
  user: User;
  perfil: {
    id: string;
    usuario: string;
    nombre: string;
    apellidos: string;
    dni: string;
    telefono: string;
    sede_id: string | null;
    participante_id: string | null;
    activo?: boolean;
    acceso_desde?: string | null;
    acceso_hasta?: string | null;
  };
  roles: Rol[];
  areas: string[];
  sede: { id: string; nombre: string; ciudad: string; modo: string } | null;
  participante: { id: string; nombre: string; ciudad: string | null } | null;
  esDueno: boolean;
  esAdmin: boolean;
  rolPrincipal: Rol;
};

export function useSesion() {
  return useQuery({
    queryKey: ["sesion"],
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,

    queryFn: async (): Promise<Sesion | null> => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) console.warn("[auth] Error al leer sesión persistida", sessionError.message);

      const user = sessionData.session?.user;
      if (!user) return null;

      const [{ data: perfil }, { data: roles }, { data: areas }, { data: cuenta }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, usuario, nombre, apellidos, dni, telefono, sede_id, participante_id, activo, acceso_desde, acceso_hasta")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("user_areas").select("area").eq("user_id", user.id),
        supabase
          .from("participante_cuentas")
          .select("participante_id, estado")
          .eq("user_id", user.id)
          .eq("estado", "activo")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      const listaRoles = (roles ?? []).map((r) => r.role as Rol);
      const hoy = new Date().toISOString().slice(0, 10);
      const bloqueado =
        perfil != null &&
        (perfil.activo === false ||
          (perfil.acceso_desde != null && hoy < perfil.acceso_desde) ||
          (perfil.acceso_hasta != null && hoy > perfil.acceso_hasta));
      if (bloqueado) {
        await supabase.auth.signOut();
        return null;
      }

      const participanteId = cuenta?.participante_id ?? perfil?.participante_id ?? null;
      let participante = null as Sesion["participante"];
      if (participanteId) {
        const { data } = await supabase
          .from("ecosistema_participantes")
          .select("id, nombre, ciudad")
          .eq("id", participanteId)
          .eq("estado", "activo")
          .maybeSingle();
        participante = data ?? null;
      }

      let sede = null as Sesion["sede"];
      if (perfil?.sede_id) {
        const { data } = await supabase
          .from("sedes")
          .select("id, nombre, ciudad, modo")
          .eq("id", perfil.sede_id)
          .maybeSingle();
        sede = data ?? null;
      } else if (participanteId) {
        const { data } = await supabase
          .from("ecosistema_participantes")
          .select("sede_id, sedes!left(id, nombre, ciudad, modo)")
          .eq("id", participanteId)
          .maybeSingle();
        const linked = Array.isArray(data?.sedes) ? data.sedes[0] : data?.sedes;
        sede = linked ?? null;
      }

      const orden: Rol[] = ["dueno", "gerente", "operario", "monitor", "cliente"];
      const rolPrincipal = orden.find((r) => listaRoles.includes(r)) ?? "cliente";

      return {
        user,
        perfil: perfil ?? {
          id: user.id, usuario: "", nombre: "", apellidos: "", dni: "", telefono: "",
          sede_id: null, participante_id: participanteId
        },
        roles: listaRoles,
        areas: (areas ?? []).map((a) => a.area),
        sede,
        participante,
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
  return async () => {
    await supabase.auth.signOut();
    qc.clear();
    window.location.href = "/auth";
  };
}

export function useSincronizarSesion() {
  const qc = useQueryClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        qc.clear();
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        void qc.invalidateQueries({ queryKey: ["sesion"] });
      }
    });

    return () => subscription.unsubscribe();
  }, [qc]);
}
