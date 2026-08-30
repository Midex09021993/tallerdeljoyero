import { Bell } from "lucide-react";
import type { Sesion } from "@/lib/auth";
import { enviarPruebaNotificacionDueno, usePushDueno } from "@/lib/pwa-push";

const etiquetaPasoPush = {
  validando: "Validación",
  "notification-api": "Notification API",
  permiso: "Permiso del navegador",
  "service-worker": "Service worker",
  "push-manager": "Suscripción PushManager",
  vapid: "Clave pública VAPID",
  "vapid-conversion": "Conversión VAPID",
  supabase: "Guardado en Supabase",
  "edge-function": "Edge Function",
  completo: "Completado",
} as const;

export function PushDuenoCard({ sesion }: { sesion: Sesion | null | undefined }) {
  const pushDueno = usePushDueno(sesion);
  if (!sesion?.esDueno) return null;

  return (
    <section className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-ink text-gold">
          <Bell className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Notificaciones del dueño</p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            Recibe un aviso push en la app instalada cada vez que se registre un nuevo pedido.
          </p>
          {pushDueno.estado === "sin-clave" ? (
            <p className="mt-2 text-xs font-medium text-warning">
              Falta configurar la clave pública VAPID.
            </p>
          ) : null}
          {pushDueno.estado === "no-soportado" ? (
            <p className="mt-2 text-xs font-medium text-warning">
              Este navegador no soporta notificaciones push web.
            </p>
          ) : null}
          {pushDueno.estado === "denegado" ? (
            <p className="mt-2 text-xs font-medium text-danger">
              El permiso está bloqueado en el navegador.
            </p>
          ) : null}
          {pushDueno.mensaje ? (
            <p
              className={`mt-2 rounded-xl px-3 py-2 text-xs font-medium ${
                pushDueno.estado === "error"
                  ? "bg-danger-soft text-danger"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {pushDueno.mensaje}
            </p>
          ) : null}
          {pushDueno.cargando && pushDueno.paso ? (
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Paso actual: {etiquetaPasoPush[pushDueno.paso]}
            </p>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        disabled={pushDueno.cargando || pushDueno.estado === "activo"}
        onClick={() => void pushDueno.activar()}
        className="mt-3 w-full rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-gold transition active:scale-[0.99] disabled:opacity-60"
      >
        {pushDueno.estado === "activo"
          ? "Notificaciones activas"
          : pushDueno.cargando
            ? "Activando..."
            : "Activar notificaciones"}
      </button>
      {pushDueno.estado === "activo" ? (
        <button
          type="button"
          onClick={() => void enviarPruebaNotificacionDueno()}
          className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition active:scale-[0.99]"
        >
          Enviar prueba
        </button>
      ) : null}
    </section>
  );
}
