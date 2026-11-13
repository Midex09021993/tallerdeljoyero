import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const AurumStudioShell = lazy(() => import("@/components/aurum-studio/AurumStudioShell"));

export const Route = createFileRoute("/_authenticated/aurum-studio")({
  head: () => ({
    meta: [
      { title: "AURUM STUDIO — Espacio de trabajo 3D" },
      { name: "description", content: "Editor 3D independiente para preparar escenas y modelos de joyería." },
    ],
  }),
  component: AurumStudioPage,
});

function AurumStudioPage() {
  return (
    <main className="fixed inset-0 z-50 overflow-hidden bg-[#10141b]">
      <Suspense fallback={<div className="grid h-full place-items-center text-sm text-white/65">Preparando AURUM STUDIO…</div>}>
        <AurumStudioShell />
      </Suspense>
    </main>
  );
}
