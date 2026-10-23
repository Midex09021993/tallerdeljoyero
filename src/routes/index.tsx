import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/auth", replace: true });
  },
  head: () => ({
    meta: [
      { title: "Aurum Lab | Plataforma digital para talleres de joyería" },
      {
        name: "description",
        content: "Accede a Aurum Lab, la plataforma digital de Taller del Joyero para gestionar tu taller y utilizar herramientas especializadas.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
