import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pedidos-2")({
  component: () => <Outlet />,
});
