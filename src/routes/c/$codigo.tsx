import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/c/$codigo")({
  head: () => ({
    meta: [
      { title: "Consulta de cotización — Taller del Joyero" },
      {
        name: "description",
        content: "Acceso seguro a la cotización compartida por Taller del Joyero.",
      },
    ],
  }),
  component: CotizacionCorta,
});

function CotizacionCorta() {
  const { codigo } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (codigo.trim()) {
      navigate({
        to: "/cliente",
        search: { codigo: codigo.trim().toUpperCase() },
        replace: true,
      });
    }
  }, [codigo, navigate]);

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-6">
      <p className="text-sm text-muted-foreground">Cargando tu cotización…</p>
    </main>
  );
}
