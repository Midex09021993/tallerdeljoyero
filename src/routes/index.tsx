import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { inicioSegunRol, useSesion } from "@/lib/auth";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aurum Lab — Sistema del taller de joyería" },
      {
        name: "description",
        content:
          "Sistema interno del taller de joyería: pedidos por área, producción, inventario, ventas y gestión multi-sede.",
      },
      { property: "og:title", content: "Aurum Lab — Sistema del taller de joyería" },
      {
        property: "og:description",
        content: "Acceso al sistema de producción y gestión del taller de joyería.",
      },
    ],
  }),
  component: Entrada,
});

function Entrada() {
  const navigate = useNavigate();
  const { data: sesion, isLoading } = useSesion();

  useEffect(() => {
    if (isLoading) return;
    navigate({ to: sesion ? inicioSegunRol(sesion) : "/auth" });
  }, [isLoading, sesion, navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-ink text-ink-foreground">
      <p className="font-display text-2xl italic text-gold">Aurum Lab</p>
    </div>
  );
}
