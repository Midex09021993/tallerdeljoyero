import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Sesion } from "@/lib/auth";
import type { Pedido } from "@/lib/taller-db";

type EstadoPush = "no-soportado" | "sin-clave" | "pendiente" | "activo" | "denegado" | "error";
type PasoPush =
  "validando" | "permiso" | "service-worker" | "push-manager" | "supabase" | "completo";

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

async function obtenerRegistroServiceWorker() {
  diagnosticoPush("service-worker", "Registrando service worker /sw.js");
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  diagnosticoPush("service-worker", "Service worker registrado", {
    scope: registration.scope,
    active: Boolean(registration.active),
    installing: Boolean(registration.installing),
    waiting: Boolean(registration.waiting),
  });

  const ready = await withTimeout(
    navigator.serviceWorker.ready,
    "El service worker no quedó listo a tiempo. Cierra y vuelve a abrir la app instalada.",
  );
  diagnosticoPush("service-worker", "Service worker listo", { scope: ready.scope });
  return ready;
}

export function registrarServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const registrar = () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      diagnosticoPushError("service-worker", "No se pudo registrar el service worker", error);
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
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
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
        permission: Notification.permission,
        userId: sesion.user.id,
        hasVapidKey: Boolean(clavePublica),
      });

      actualizarPaso("permiso", "Solicitando permiso de notificaciones...");
      const permiso = await Notification.requestPermission();
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

      actualizarPaso("push-manager", "Creando suscripción push...");
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await withTimeout(
          registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(clavePublica),
          }),
          "PushManager no respondió a tiempo. Revisa permisos del navegador e intenta nuevamente.",
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
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: sesion.user.id,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: "endpoint" },
      );
      if (error) throw error;

      diagnosticoPush("supabase", "Suscripción guardada correctamente");
      actualizarPaso("completo", "Notificaciones activadas correctamente.");
      setEstado("activo");
      toast.success("Notificaciones activadas para el Dueño");
    } catch (error) {
      const mensajeError =
        error instanceof Error ? error.message : "No se pudieron activar notificaciones";
      diagnosticoPushError(pasoActual, mensajeError, error);
      setEstado("error");
      setMensaje(mensajeError);
      toast.error(mensajeError);
    } finally {
      setCargando(false);
    }
  }

  return { estado, cargando, paso, mensaje, activar };
}

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
