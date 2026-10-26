import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/taller")({
  beforeLoad: () => {
    throw redirect({ to: "/taller/herramientas" });
  },
});
