import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, FileText } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { useContratos } from "@/lib/taller-db";
import { useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";
import { fmtFecha } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/contratos/")({
  head: () => ({ meta: [{ title: "Contratos — Aurum Lab" }] }),
  component: ContratosPage,
});

function money(value: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);
}

function ContratosPage() {
  const { data: contratos = [], isLoading } = useContratos();
  const { filtrarPedidos, etiquetaSede } = useSedeFiltroDueno();
  const contratosVisibles = filtrarPedidos(contratos);

  return (
    <AppShell
      titulo="Contratos"
      subtitulo={`Documentos comerciales propios de Aurum Lab · ${etiquetaSede}` }
      atrasMovil={{ to: "/ventas" }}
      acciones={
        <Link
          to="/contratos/nuevo"
          search={{}}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="size-4" /> Nuevo contrato
        </Link>
      }
    >
      <Panel titulo="Contratos registrados">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Cargando contratos…</p>
        ) : contratosVisibles.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-semibold">Aún no hay contratos</p>
            <p className="mt-1 text-xs text-muted-foreground">Puedes crear un contrato sin tener una cotización o un pedido previo.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {contratosVisibles.map((contrato) => (
              <Link
                key={contrato.id}
                to="/contratos/$id"
                params={{ id: contrato.id }}
                search={{ nuevoPedido: false }}
                className="block px-4 py-4 transition-colors hover:bg-surface-muted/60 lg:px-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{contrato.numero}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{contrato.cliente}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {contrato.origen || "Contrato Aurum"} · {fmtFecha(contrato.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{money(contrato.total)}</p>
                    <p className="text-xs text-muted-foreground">Saldo {money(contrato.saldo)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </AppShell>
  );
}
