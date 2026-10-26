import { createFileRoute } from "@tanstack/react-router";
import { ComunidadPublicaPage } from "@/routes/catalogo-publico";

export const Route = createFileRoute("/directorio")({
  component: ComunidadPublicaPage,
});
