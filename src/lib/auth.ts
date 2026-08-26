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
  "Taller",
  "Servicio láser",
  "Área ventas",
  "Entregado",
] as const;

export type Area = (typeof AREAS)[number];

/** Ruta de la app por área habilitada. */
export const areaRuta: Record<string, string> = {
  Pedidos: "/pedidos",
  "Diseño 3D": "/diseno-3d",
  "Impresión 3D": "/impresion-3d",
  Casting: "/taller",
  Taller: "/taller",
  "Servicio láser": "/corte-laser",
  "Área ventas": "/gestion",
};

export type Sesion = {
  user: User;
  perfil: { id: string; nombre: string; dni: string; telefono: string; sede_id: string | null };
  roles: Rol[];
  areas: string[];
  sede: { id: string; nombre: string; ciudad: string; modo: string } | null;
  esDueno: boolean;
  esAdmin: boolean;
  rolPrincipal: Rol;
};

export function useSesion() {
  return useQuery({
    queryKey: ["sesion"],
    staleTime: 60_000,
    queryFn: async (): Promise<Sesion | null> => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;

      const [{ data: perfil }, { data: roles }, { data: areas }] = await Promise.all([
        supabase.from("profiles").select("id, nombre, dni, telefono, sede_id").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("user_areas").select("area").eq("user_id", user.id),
      ]);

      const listaRoles = (roles ?? []).map((r) => r.role as Rol);
      let sede = null as Sesion["sede"];
      if (perfil?.sede_id) {
        const { data } = await supabase
          .from("sedes")
          .select("id, nombre, ciudad, modo")
          .eq("id", perfil.sede_id)
          .maybeSingle();
        sede = data ?? null;
      }

      const orden: Rol[] = ["dueno", "gerente", "operario", "monitor", "cliente"];
      const rolPrincipal = orden.find((r) => listaRoles.includes(r)) ?? "cliente";

      return {
        user,
        perfil: perfil ?? { id: user.id, nombre: "", dni: "", telefono: "", sede_id: null },
        roles: listaRoles,
        areas: (areas ?? []).map((a) => a.area),
        sede,
        esDueno: listaRoles.includes("dueno"),
        esAdmin: listaRoles.includes("dueno") || listaRoles.includes("gerente"),
        rolPrincipal,
      };
    },
  });
}

export function inicioSegunRol(s: Sesion): string {
  if (s.rolPrincipal === "monitor") return "/monitor";
  if (s.rolPrincipal === "cliente") return "/cliente";
  if (s.rolPrincipal === "operario") {
    const primera = s.areas.find((a) => areaRuta[a]);
    return primera ? areaRuta[primera]! : "/pedidos";
  }
  return "/pedidos";
}

/** Permite entrar con DNI o correo. El DNI se convierte en un correo interno. */
export function correoDesdeUsuario(usuario: string) {
  const limpio = usuario.trim().toLowerCase();
  return limpio.includes("@") ? limpio : `${limpio.replace(/\s+/g, "")}@taller.local`;
}

export function useCerrarSesion() {
  const qc = useQueryClient();
  return async () => {
    await supabase.auth.signOut();
    qc.clear();
    window.location.href = "/auth";
  };
}
