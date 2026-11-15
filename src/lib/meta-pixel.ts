// Píxel de Meta (Aurum Lab). Solo navegador; se carga de forma diferida.
const PIXEL_ID = "1122971420341238";

type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; callMethod?: (...a: unknown[]) => void; push?: unknown };

function ensurePixel(): Fbq | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { fbq?: Fbq; _fbq?: Fbq };
  if (w.fbq) return w.fbq;
  const fbq: Fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue!.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  w.fbq = fbq;
  w._fbq = fbq;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  fbq("init", PIXEL_ID);
  return fbq;
}

export function metaPageView(): void {
  ensurePixel()?.("track", "PageView");
}

export function metaCompleteRegistration(): void {
  ensurePixel()?.("track", "CompleteRegistration");
}
