import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { obtenerSesionParaRuta, puedeAccederRuta } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const acceso = await obtenerSesionParaRuta();

    if (!acceso) {
      throw redirect({ to: "/auth" });
    }

    if (!puedeAccederRuta(location.pathname, acceso)) {
      const destino = acceso.esDueno || acceso.roles.includes("gerente")
        ? "/pedidos"
        : acceso.roles.includes("monitor")
          ? "/monitor"
          : acceso.roles.includes("operario")
            ? "/operario"
            : "/auth";

      throw redirect({ to: destino });
    }

    return { user: acceso.user };
  },
  component: () => <Outlet />,
});
