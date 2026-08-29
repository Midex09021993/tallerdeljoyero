import { createFileRoute } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { MobileBackButton } from "@/components/AppShell";
import { useCerrarSesion, useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [{ title: "Perfil — Aurum Lab" }],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const { data: sesion } = useSesion();
  const cerrarSesion = useCerrarSesion();

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6">
      <div className="mb-5 flex justify-end">
        <MobileBackButton atrasMovil={{ to: "/inicio" }} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Perfil
        </p>
        <h1 className="mt-2 font-display text-3xl">
          {sesion?.perfil.nombre || "Usuario del taller"}
        </h1>
        <dl className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Sede
            </dt>
            <dd className="mt-1">{sesion?.sede?.nombre ?? "Sin sede"}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Rol
            </dt>
            <dd className="mt-1">{sesion?.rolPrincipal ?? "usuario"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Áreas asignadas
            </dt>
            <dd className="mt-1">{sesion?.areas.join(", ") || "Sin áreas asignadas"}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => void cerrarSesion()}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-ink-foreground sm:w-auto"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Cerrar sesión
        </button>
      </section>
    </main>
  );
}
