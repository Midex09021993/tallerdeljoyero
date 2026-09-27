import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getSession();
    const user = data.session?.user;

    if (!user) {
      if (error) console.warn("[auth] No se pudo restaurar la sesión", error.message);
      throw redirect({ to: "/auth" });
    }

    // Tener una sesión Auth no es suficiente para entrar al ERP.
    // La cuenta debe pertenecer actualmente a un participante activo del
    // ecosistema. Así una cuenta antigua, huérfana o de un taller eliminado
    // no puede conservar acceso sólo porque su sesión siga viva.
    const [{ data: perfil }, { data: cuentas }] = await Promise.all([
      supabase.from("profiles")
        .select("participante_id")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("participante_cuentas")
        .select("participante_id")
        .eq("user_id", user.id)
        .eq("estado", "activo"),
    ]);

    const participanteIds = Array.from(new Set([
      ...((cuentas ?? []).map((cuenta) => cuenta.participante_id).filter(Boolean) as string[]),
      ...(perfil?.participante_id ? [perfil.participante_id] : []),
    ]));

    if (participanteIds.length === 0) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }

    const { data: participantes } = await supabase
      .from("ecosistema_participantes")
      .select("id")
      .in("id", participanteIds)
      .eq("estado", "activo");

    if ((participantes ?? []).length === 0) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }

    return { user };
  },
  component: () => <Outlet />,
});
