import { createFileRoute } from "@tanstack/react-router";
import { AppShell, MobileBackButton } from "@/components/AppShell";
import { VectorizadorLaser } from "@/components/VectorizadorLaser";

export const Route = createFileRoute("/_authenticated/vectorizador-laser")({
  head: () => ({
    meta: [
      { title: "Vectorizador Láser — Aurum Lab" },
      { name: "description", content: "Vectorización y preparación de geometría para corte láser de joyería." },
    ],
  }),
  component: VectorizadorLaserPage,
});

function VectorizadorLaserPage() {
  return (
    <AppShell
      titulo="Vectorizador Láser"
      subtitulo="Preparación de geometría para corte y grabado"
      acciones={<MobileBackButton atrasMovil={{ to: "/corte-laser" }} />}
    >
      <VectorizadorLaser />
    </AppShell>
  );
}
