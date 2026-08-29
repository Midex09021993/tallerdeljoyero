import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Sesion } from "@/lib/auth";
import type { Pedido } from "@/lib/taller-db";

type EstadoPush = "no-soportado" | "sin-clave" | "pendiente" | "activo" | "denegado" | "error";
type PasoPush =
  | "validando"
  | "notification-api"
  | "permiso"
  | "service-worker"
  | "push-manager"
  | "vapid"
  | "vapid-conversion"
  | "supabase"
  | "completo";

const PUSH_TIMEOUT_MS = 15_000;

// Public VAPID key for the owner push pilot. This key is intentionally public:
// browsers need it to subscribe through PushManager. The matching private key
// must be configured only as a Supabase Edge Function secret.
const VAPID_PUBLIC_KEY_PILOTO =
  "BDtyNNppu4FYnTbkMc_v4RTj__Y7SxKSIB15tlfc7logUjZrOWltTOz6MGmcgoQDtI9BBmyp2N55_vuHZGaBrSc";

function vapidPublicKey() {
  return (
    (import.meta.env["VITE_VAPID_PUBLIC_KEY"] as string | undefined) || VAPID_PUBLIC_KEY_PILOTO
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function diagnosticoPush(paso: PasoPush, mensaje: string, extra?: unknown) {
  if (extra === undefined) {
    console.info(`[push:${paso}] ${mensaje}`);
    return;
  }
  console.info(`[push:${paso}] ${mensaje}`, extra);
}

function diagnosticoPushError(paso: PasoPush, mensaje: string, error?: unknown) {
  console.error(`[push:${paso}] ${mensaje}`, error);
}

function diagnosticoPushOk(paso: PasoPush, mensaje: string, extra?: unknown) {
  if (extra === undefined) {
    console.info(`✓ ${mensaje}`);
    console.info(`[push:${paso}] OK`);
    return;
  }
  console.info(`✓ ${mensaje}`, extra);
  console.info(`[push:${paso}] OK`, extra);
}

function describirError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const mensaje = (error as { message?: unknown }).message;
    if (typeof mensaje === "string") return mensaje;
  }
  return "Error desconocido";
}

function withTimeout<T>(promise: Promise<T>, mensaje: string, timeoutMs = PUSH_TIMEOUT_MS) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(mensaje)), timeoutMs);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

async function ejecutarPaso<T>(
  paso: PasoPush,
  mensajeInicio: string,
  mensajeOk: string,
  tarea: () => Promise<T>,
  timeoutMs = PUSH_TIMEOUT_MS,
) {
  diagnosticoPush(paso, mensajeInicio);
  try {
    const resultado = await withTimeout(
      tarea(),
      `${mensajeInicio} excedió el tiempo de espera.`,
      timeoutMs,
    );
    diagnosticoPushOk(paso, mensajeOk, resumenDiagnostico(resultado));
    return resultado;
  } catch (error) {
    diagnosticoPushError(paso, `Falló: ${mensajeInicio}`, error);
    throw error;
  }
}

function resumenDiagnostico(resultado: unknown) {
  if (!resultado || typeof resultado !== "object") return undefined;
  if ("scope" in resultado) return { scope: (resultado as ServiceWorkerRegistration).scope };
  if ("endpoint" in resultado) {
    const subscription = resultado as PushSubscription;
    const serializada = subscription.toJSON();
    return {
      endpoint: subscription.endpoint,
      hasP256dh: Boolean(serializada.keys?.["p256dh"]),
      hasAuth: Boolean(serializada.keys?.["auth"]),
    };
  }
  return undefined;
}

async function obtenerRegistroServiceWorker() {
  const registration = await ejecutarPaso(
    "service-worker",
    "Registrando Service Worker /sw.js",
    "Service Worker registrado.",
    () => navigator.serviceWorker.register("/sw.js", { scope: "/" }),
  );

  diagnosticoPush("service-worker", "Estado del registro", {
    scope: registration.scope,
    active: Boolean(registration.active),
    installing: Boolean(registration.installing),
    waiting: Boolean(registration.waiting),
  });

  const ready = await ejecutarPaso(
    "service-worker",
    "Esperando Service Worker listo",
    "Service Worker listo.",
    () => navigator.serviceWorker.ready,
  );
  return ready;
}

export function registrarServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const registrar = () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) =>
        diagnosticoPushOk("service-worker", "Service Worker registrado.", {
          scope: registration.scope,
        }),
      )
      .catch((error) => {
        diagnosticoPushError("service-worker", "No se pudo registrar el Service Worker", error);
      });
  };

  if (document.readyState === "complete") {
    registrar();
    return;
  }

  window.addEventListener("load", registrar, { once: true });
}

export function usePushDueno(sesion: Sesion | null | undefined) {
  const [estado, setEstado] = useState<EstadoPush>("pendiente");
  const [cargando, setCargando] = useState(false);
  const [paso, setPaso] = useState<PasoPush | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const esDueno = Boolean(sesion?.esDueno);
  const clavePublica = useMemo(() => vapidPublicKey(), []);

  useEffect(() => {
    if (!esDueno) return;
    if (typeof window === "undefined") return;
    if (
      !window.isSecureContext ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setEstado("no-soportado");
      return;
    }
    if (!clavePublica) {
      setEstado("sin-clave");
      return;
    }
    if (Notification.permission === "denied") {
      setEstado("denegado");
      return;
    }
    obtenerRegistroServiceWorker()
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setEstado(subscription ? "activo" : "pendiente"))
      .catch((error) => {
        diagnosticoPushError("service-worker", "No se pudo verificar suscripción existente", error);
        setEstado("pendiente");
      });
  }, [clavePublica, esDueno]);

  async function activar() {
    if (!sesion?.esDueno || !clavePublica) return;
    if (
      !window.isSecureContext ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      diagnosticoPushError("validando", "Navegador no compatible con push web", {
        secureContext: window.isSecureContext,
        hasNotificationApi: "Notification" in window,
        hasServiceWorker: "serviceWorker" in navigator,
        hasPushManager: "PushManager" in window,
      });
      setEstado("no-soportado");
      setMensaje("Este navegador no soporta notificaciones push web.");
      return;
    }

    let pasoActual: PasoPush = "validando";
    const actualizarPaso = (siguiente: PasoPush, siguienteMensaje: string) => {
      pasoActual = siguiente;
      setPaso(siguiente);
      setMensaje(siguienteMensaje);
    };

    setCargando(true);
    setEstado("pendiente");
    actualizarPaso("validando", "Validando compatibilidad del navegador...");
    try {
      diagnosticoPush("validando", "Iniciando activación de notificaciones", {
        secureContext: window.isSecureContext,
        hasNotificationApi: "Notification" in window,
        hasServiceWorker: "serviceWorker" in navigator,
        hasPushManager: "PushManager" in window,
        permission: Notification.permission,
        userId: sesion.user.id,
        hasVapidKey: Boolean(clavePublica),
      });
      diagnosticoPushOk("validando", "Compatibilidad básica validada.");

      actualizarPaso("notification-api", "Verificando Notification API...");
      diagnosticoPushOk("notification-api", "Notification API disponible.", {
        permission: Notification.permission,
      });

      actualizarPaso("permiso", "Solicitando permiso de notificaciones...");
      const permiso = await ejecutarPaso(
        "permiso",
        "Solicitando permiso de notificaciones",
        "Permiso concedido.",
        () => Notification.requestPermission(),
      );
      diagnosticoPush("permiso", "Resultado del permiso", permiso);
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "denegado" : "pendiente");
        setMensaje(
          permiso === "denied"
            ? "El navegador bloqueó las notificaciones. Actívalas desde los permisos del sitio."
            : "Permiso no concedido. Vuelve a intentar cuando quieras activar notificaciones.",
        );
        return;
      }

      actualizarPaso("service-worker", "Preparando service worker...");
      const registration = await obtenerRegistroServiceWorker();

      actualizarPaso("vapid", "Leyendo clave pública VAPID...");
      diagnosticoPush("vapid", "Clave pública VAPID cargada", {
        source: import.meta.env["VITE_VAPID_PUBLIC_KEY"] ? "env" : "piloto",
        length: clavePublica.length,
      });
      diagnosticoPushOk("vapid", "VAPID cargado.");

      actualizarPaso("vapid-conversion", "Convirtiendo clave VAPID...");
      const applicationServerKey = urlBase64ToUint8Array(clavePublica);
      diagnosticoPushOk("vapid-conversion", "VAPID convertido a Uint8Array.", {
        bytes: applicationServerKey.byteLength,
      });

      actualizarPaso("push-manager", "Creando suscripción push...");
      diagnosticoPushOk("push-manager", "PushManager disponible.");
      const existente = await ejecutarPaso(
        "push-manager",
        "Buscando suscripción Push existente",
        "Búsqueda de suscripción completada.",
        () => registration.pushManager.getSubscription(),
      );
      const subscription =
        existente ??
        (await ejecutarPaso(
          "push-manager",
          "Generando nueva suscripción Push",
          "Suscripción generada.",
          () =>
            registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey,
            }),
        ));

      const serializada = subscription.toJSON();
      const p256dh = serializada.keys?.["p256dh"] ?? "";
      const auth = serializada.keys?.["auth"] ?? "";
      diagnosticoPush("push-manager", "Suscripción push obtenida", {
        endpoint: subscription.endpoint,
        hasP256dh: Boolean(p256dh),
        hasAuth: Boolean(auth),
      });

      if (!subscription.endpoint || !p256dh || !auth) {
        throw new Error("La suscripción push está incompleta. El navegador no entregó sus claves.");
      }

      actualizarPaso("supabase", "Guardando suscripción en Supabase...");
      const resultadoGuardado = await ejecutarPaso(
        "supabase",
        "Guardando suscripción en Supabase",
        "Suscripción guardada.",
        async () =>
          await supabase.from("push_subscriptions").upsert(
            {
              user_id: sesion.user.id,
              endpoint: subscription.endpoint,
              p256dh,
              auth,
              user_agent: navigator.userAgent,
            },
            { onConflict: "endpoint" },
          ),
      );
      if (resultadoGuardado.error) throw resultadoGuardado.error;

      actualizarPaso("completo", "Notificaciones activadas correctamente.");
      diagnosticoPushOk("completo", "Confirmación de registro exitoso.");
      setEstado("activo");
      toast.success("Notificaciones activadas para el Dueño");
    } catch (error) {
      const mensajeError = describirError(error) || "No se pudieron activar notificaciones";
      diagnosticoPushError(pasoActual, mensajeError, error);
      setEstado("error");
      setMensaje(`${etiquetaErrorPaso[pasoActual] ?? "Activación"}: ${mensajeError}`);
      toast.error(mensajeError);
    } finally {
      setCargando(false);
    }
  }

  return { estado, cargando, paso, mensaje, activar };
}

const etiquetaErrorPaso: Partial<Record<PasoPush, string>> = {
  validando: "Validación del navegador",
  "notification-api": "Notification API",
  permiso: "Permiso del navegador",
  "service-worker": "Service Worker",
  "push-manager": "PushManager",
  vapid: "Clave VAPID",
  "vapid-conversion": "Conversión VAPID",
  supabase: "Guardado en Supabase",
};

export async function notificarNuevoPedidoADueno(
  pedido: Pick<Pedido, "id" | "referencia" | "cliente">,
) {
  try {
    const { error } = await supabase.functions.invoke("notify-new-order-owner", {
      body: {
        pedido_id: pedido.id,
        referencia: pedido.referencia,
        cliente: pedido.cliente,
      },
    });
    if (error) console.warn("[push] No se pudo enviar notificación", error.message);
  } catch (error) {
    console.warn("[push] No se pudo invocar la notificación", error);
  }
}

export async function enviarPruebaNotificacionDueno() {
  try {
    diagnosticoPush("supabase", "Invocando prueba de notificación");
    const { data, error } = await supabase.functions.invoke("notify-new-order-owner", {
      body: {
        prueba: true,
        pedido_id: "prueba",
        referencia: "PRUEBA",
        cliente: "Notificación de prueba",
      },
    });
    if (error) throw error;
    diagnosticoPush("supabase", "Prueba de notificación enviada", data);
    toast.success("Notificación de prueba enviada al Dueño");
    return data;
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "No se pudo enviar la notificación de prueba";
    toast.error(mensaje);
    throw error;
  }
}
