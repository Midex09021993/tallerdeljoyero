import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ServiciosExternosRecibidos } from "@/components/ServiciosExternosRecibidos";
import { ServiciosExternosEnviadosAdmin } from "@/components/ServiciosExternosEnviadosAdmin";
import { SelectorSedeDueno, TODAS_LAS_SEDES, useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";
import { useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/servicios-externos")({
  head: () => ({
    meta: [
      { title: "Servicios externos — Aurum Lab" },
      {
        name: "description",
        content: "Trabajos productivos recibidos o enviados entre talleres del ecosistema.",
      },
    ],
  }),
  component: ServiciosExternosPage,
});

function ServiciosExternosPage() {
  const { data: sesion } = useSesion();
  const { esDueno, sedeFiltro, setSedeFiltro, sedes, etiquetaSede } = useSedeFiltroDueno();

  const puedeRecibir = Boolean(
    sesion?.roles.includes("operario") ||
      sesion?.roles.includes("gerente") ||
      sesion?.roles.includes("dueno"),
  );
  const puedeEnviar = Boolean(
    sesion?.roles.includes("gerente") || sesion?.roles.includes("dueno"),
  );

  const sedeEnviados =
    esDueno && sedeFiltro !== TODAS_LAS_SEDES ? sedeFiltro : sesion?.sede?.id ?? null;

  return (
    <AppShell
      titulo="Servicios externos"
      subtitulo={
        sesion?.esDueno
          ? `Operaciones compartidas · ${etiquetaSede}`
          : `Operaciones compartidas · ${sesion?.sede?.nombre ?? "tu taller"}`
      }
      acciones={
        <SelectorSedeDueno
          esDueno={esDueno}
          sedes={sedes}
          value={sedeFiltro}
          onChange={setSedeFiltro}
        />
      }
    >
      <div className="space-y-8">
        {puedeRecibir ? (
          <section>
            <div className="mb-4 flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold-deep">
                <ArrowDownToLine className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-gold">
                  Trabajo que llega al taller
                </p>
                <h2 className="mt-1 text-xl font-semibold">Recibidos</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Operaciones que otro taller o profesional solicita ejecutar aquí.
                </p>
              </div>
            </div>
            <ServiciosExternosRecibidos />
          </section>
        ) : null}

        {puedeEnviar ? (
          <section>
            <div className="mb-4 flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold-deep">
                <ArrowUpFromLine className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-gold">
                  Trabajo que sale del taller
                </p>
                <h2 className="mt-1 text-xl font-semibold">Enviados</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Operaciones de este taller encargadas a otro participante del ecosistema.
                </p>
              </div>
            </div>
            <ServiciosExternosEnviadosAdmin sedeId={sedeEnviados} />
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
