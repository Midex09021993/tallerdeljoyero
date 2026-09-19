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

export type Area = (typeof AREAS)[number];

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

/** Ruta de la app por área habilitada. */
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
    nombre: string;
    dni: string;
    telefono: string;
    sede_id: string | null;
    activo?: boolean;
    acceso_desde?: string | null;
    acceso_hasta?: string | null;
  };
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
    // Los permisos (rol y áreas) deben reflejarse de inmediato tras un cambio
    // hecho por el dueño o gerente: no se cachean.
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,

    queryFn: async (): Promise<Sesion | null> => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.warn("[auth] Error al leer sesión persistida", sessionError.message);
      }

      const user = sessionData.session?.user;
      if (!user) return null;

      const [{ data: perfil }, { data: roles }, { data: areas }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, nombre, dni, telefono, sede_id, activo, acceso_desde, acceso_hasta")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("user_areas").select("area").eq("user_id", user.id),
      ]);

      const listaRoles = (roles ?? []).map((r) => r.role as Rol);

      // Ventana de acceso: cuenta desactivada o fuera del periodo permitido.
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

export function esVistaMovilTablet() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}

export function inicioSegunRol(s: Sesion, opciones?: { movilTablet?: boolean }): string {
  if (s.rolPrincipal === "monitor") return "/monitor";
  if (s.rolPrincipal === "cliente") return "/cliente";
  if (s.rolPrincipal === "operario") return opciones?.movilTablet ? "/inicio" : "/operario";
  if (opciones?.movilTablet && s.esAdmin) return "/inicio";
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


export type AccesoRuta =
  | "admin"
  | "owner"
  | "monitor"
  | "operario"
  | "perfil"
  | "inicio"
  | "area:Pedidos"
  | "area:Diseño 3D"
  | "area:Impresión 3D"
  | "area:Casting"
  | "area:Corte Láser"
  | "area:Taller"
  | "area:Área ventas";

const accesoRuta: Record<string, AccesoRuta> = {
  "/inicio": "inicio",
  "/perfil": "perfil",
  "/pedidos": "admin",
  "/cotizaciones": "admin",
  "/contratos/": "admin",
  "/gestion": "admin",
  "/inventario": "admin",
  "/ventas": "admin",
  "/herramientas": "owner",
  "/aurum-render": "admin",
  "/monitor": "monitor",
  "/operario": "operario",
  "/diseno-3d": "area:Diseño 3D",
  "/impresion-3d": "area:Impresión 3D",
  "/casting": "area:Casting",
  "/corte-laser": "area:Corte Láser",
  "/taller": "area:Taller",
};

function rutaRequiere(ruta: string) {
  if (ruta.startsWith("/contratos/")) return "admin" as AccesoRuta;

  const exacta = accesoRuta[ruta];
  if (exacta) return exacta;

  const prefijo = Object.keys(accesoRuta)
    .filter((base) => base !== "/inicio" && ruta.startsWith(base + "/"))
    .sort((a, b) => b.length - a.length)[0];

  return prefijo ? accesoRuta[prefijo] : null;
}

export async function obtenerSesionParaRuta() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.user) return null;

  const user = sessionData.session.user;
  const [{ data: perfil }, { data: roles }, { data: areas }] = await Promise.all([
    supabase.from("profiles").select("id, activo, acceso_desde, acceso_hasta").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("user_areas").select("area").eq("user_id", user.id),
  ]);

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

  const listaRoles = (roles ?? []).map((r) => r.role as Rol);
  const listaAreas = (areas ?? []).map((a) => normalizarArea(a.area));

  return {
    user,
    roles: listaRoles,
    areas: listaAreas,
    esDueno: listaRoles.includes("dueno"),
    esAdmin: listaRoles.includes("dueno") || listaRoles.includes("gerente"),
  };
}

export function puedeAccederRuta(pathname: string, acceso: Awaited<ReturnType<typeof obtenerSesionParaRuta>>) {
  if (!acceso) return false;

  const path = pathname.replace(/\/+$/, "") || "/";
  const requerida = rutaRequiere(path);
  if (!requerida) return true;

  if (requerida === "owner") return acceso.esDueno;
  if (requerida === "admin") return acceso.esAdmin;
  if (requerida === "monitor") return acceso.esAdmin || acceso.roles.includes("monitor");
  if (requerida === "operario") return acceso.esAdmin || acceso.roles.includes("operario");
  if (requerida === "perfil" || requerida === "inicio") {
    return acceso.roles.length > 0;
  }
  if (requerida.startsWith("area:")) {
    const area = requerida.slice(5);
    return acceso.esAdmin || (acceso.roles.includes("operario") && acceso.areas.some((a) => areaCoincide(a, area)));
  }

  return false;
}
