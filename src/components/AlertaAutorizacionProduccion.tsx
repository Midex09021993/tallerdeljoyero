import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { usePedidosSelector, pedidoPendienteAutorizacionProduccion } from "@/lib/taller-db";
import { useSesion } from "@/lib/auth";

const CLAVE = "aurum-alerta-autorizacion-produccion-v1";

export function AlertaAutorizacionProduccion() {
  const { data: sesion } = useSesion();
  const { data: pedidos = [] } = usePedidosSelector();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  const pendientes = useMemo(
    () => pedidos.filter(pedidoPendienteAutorizacionProduccion),
    [pedidos],
  );

  useEffect(() => {
    if (!sesion?.esAdmin || pendientes.length === 0) {
      setVisible(false);
      return;
    }

    const claveUsuario = `${CLAVE}:${sesion.user.id}`;
    if (sessionStorage.getItem(claveUsuario) !== "mostrada") {
      setVisible(true);
      sessionStorage.setItem(claveUsuario, "mostrada");
    }
  }, [pendientes.length, sesion]);

  if (!visible || pendientes.length === 0 || !sesion?.esAdmin) return null;

  const revisar = () => {
    setVisible(false);
    window.location.assign("/pedidos?autorizacion=pendientes");
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/45 px-4 py-6 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="alerta-autorizacion-titulo"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-warning/30 bg-card text-foreground shadow-2xl"
      >
        <div className="flex items-start gap-4 border-b border-border bg-warning-soft/60 p-5 sm:p-6">
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-warning/15 text-warning">
            <AlertTriangle className="size-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-warning">
              Producción pendiente de autorización
            </p>
            <h2 id="alerta-autorizacion-titulo" className="mt-1 text-xl font-semibold">
              Tienes {pendientes.length} pedido{pendientes.length === 1 ? "" : "s"} esperando autorización.
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="shrink-0 rounded-full p-2 text-muted-foreground transition hover:bg-background/60 hover:text-foreground"
            aria-label="Cerrar aviso"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <p className="text-sm leading-6 text-muted-foreground">
            Estos pedidos aún no aparecen en Producción porque no han sido autorizados.
          </p>

          <div className="rounded-xl border border-border bg-surface-muted/50 p-4">
            <p className="text-xs font-semibold text-foreground">
              Mientras permanezcan en este estado:
            </p>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>• No ingresarán al flujo productivo.</li>
              <li>• No podrán moverse entre áreas.</li>
              <li>• No serán visibles para los operarios.</li>
            </ul>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setVisible(false)}
              className="rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
            >
              Recordármelo después
            </button>
            <button
              type="button"
              onClick={revisar}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-ink-foreground transition hover:opacity-90"
            >
              Revisar pedidos
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
