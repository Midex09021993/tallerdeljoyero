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

    return { user };
  },
  component: () => <Outlet />,
});
