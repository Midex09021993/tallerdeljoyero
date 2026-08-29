import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Sesion } from "@/lib/auth";
import type { Pedido } from "@/lib/taller-db";

type EstadoPush = "no-soportado" | "sin-clave" | "pendiente" | "activo" | "denegado";

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

export function registrarServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[pwa] No se pudo registrar el service worker", error);
    });
  });
}

export function usePushDueno(sesion: Sesion | null | undefined) {
  const [estado, setEstado] = useState<EstadoPush>("pendiente");
  const [cargando, setCargando] = useState(false);
  const esDueno = Boolean(sesion?.esDueno);
  const clavePublica = useMemo(() => vapidPublicKey(), []);

  useEffect(() => {
    if (!esDueno) return;
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
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setEstado(subscription ? "activo" : "pendiente"))
      .catch(() => setEstado("pendiente"));
  }, [clavePublica, esDueno]);

  async function activar() {
    if (!sesion?.esDueno || !clavePublica) return;
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setEstado("no-soportado");
      return;
    }

    setCargando(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "denegado" : "pendiente");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(clavePublica),
        }));

      const serializada = subscription.toJSON();
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: sesion.user.id,
          endpoint: subscription.endpoint,
          p256dh: serializada.keys?.["p256dh"] ?? "",
          auth: serializada.keys?.["auth"] ?? "",
          user_agent: navigator.userAgent,
        },
        { onConflict: "endpoint" },
      );
      if (error) throw error;
      setEstado("activo");
      toast.success("Notificaciones activadas para el Dueño");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron activar notificaciones");
    } finally {
      setCargando(false);
    }
  }

  return { estado, cargando, activar };
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
    const { data, error } = await supabase.functions.invoke("notify-new-order-owner", {
      body: {
        prueba: true,
        pedido_id: "prueba",
        referencia: "PRUEBA",
        cliente: "Notificación de prueba",
      },
    });
    if (error) throw error;
    toast.success("Notificación de prueba enviada al Dueño");
    return data;
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "No se pudo enviar la notificación de prueba";
    toast.error(mensaje);
    throw error;
  }
}
