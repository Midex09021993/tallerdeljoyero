import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { modulosAdminMovil } from "@/components/AppShell";
import { esVistaMovilTablet, rolEtiqueta, useCerrarSesion, useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({
    meta: [
      { title: "Inicio — Aurum Lab" },
      {
        name: "description",
        content: "Acceso rápido móvil a los módulos principales del ERP de joyería.",
      },
    ],
  }),
  component: InicioAdminMovil,
});

function InicioAdminMovil() {
  const { data: sesion, isLoading } = useSesion();
  const cerrarSesion = useCerrarSesion();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || !sesion) return;
    if (!sesion.esAdmin) {
      navigate({ to: sesion.rolPrincipal === "operario" ? "/operario" : "/pedidos" });
      return;
    }
    if (!esVistaMovilTablet()) navigate({ to: "/pedidos" });
  }, [isLoading, navigate, sesion]);

  const nombre = sesion?.perfil.nombre?.trim() || "Usuario";

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:hidden">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Panel de acceso
          </p>
          <h1 className="mt-1 truncate font-display text-3xl">Hola {nombre}</h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {sesion ? rolEtiqueta[sesion.rolPrincipal] : "Cargando..."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void cerrarSesion()}
          className="shrink-0 rounded-full border border-danger/25 bg-danger-soft px-3 py-2 text-xs font-semibold text-danger"
        >
          Cerrar sesión
        </button>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {modulosAdminMovil.map((modulo) => {
          const Icono = modulo.icono;
          return (
            <button
              key={modulo.to}
              type="button"
              onClick={() => void navigate({ to: modulo.to as never })}
              className="min-h-[118px] rounded-2xl border border-border bg-card p-4 text-left shadow-card transition active:scale-[0.98] focus-visible:border-gold focus-visible:outline-none"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-ink text-gold">
                  {Icono ? <Icono className="size-5" aria-hidden="true" /> : null}
                </span>
                <ChevronRight className="mt-1 size-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-base font-semibold leading-tight">{modulo.label}</h2>
            </button>
          );
        })}
      </section>
    </main>
  );
}
