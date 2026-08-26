import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pedidos")({
  component: () => <Outlet />,
});
