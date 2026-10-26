import { createFileRoute } from "@tanstack/react-router";
import { ComunidadPublicaPage } from "@/routes/catalogo-publico";

export const Route = createFileRoute("/directorio")({
  head: () => ({
    meta: [
      { title: "Directorio de talleres y joyerías | AURUM LAB" },
      {
        name: "description",
        content: "Explora talleres, joyerías y propuestas formativas de la comunidad AURUM LAB.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: ComunidadPublicaPage,
});
