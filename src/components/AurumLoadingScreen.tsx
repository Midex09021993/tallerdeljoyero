export type AurumLoadingScreenProps = {
  /** True while the viewer is actively loading a model. */
  loading: boolean;
  /** Current stage reported by the real loading pipeline. */
  message: string;
  /** Optional presentation image shown after a model is ready. */
  presentationCover?: string | null;
  /** Controls the presentation image's entrance transition. */
  presentationVisible?: boolean;
};

/**
 * AURUM LOADING SCREEN
 *
 * Presentation-only module. It does not load, parse, convert, or process models.
 * The viewer owns the loading lifecycle and supplies its real state and message.
 * Progress is intentionally indeterminate: no percentage is fabricated.
 */
export function AurumLoadingScreen({
  loading,
  message,
  presentationCover = null,
  presentationVisible = false,
}: AurumLoadingScreenProps) {
  if (!loading && !presentationCover) return null;

  const visible = loading || presentationVisible;
  return (
    <div
      className={
        "absolute inset-0 z-40 overflow-hidden transform-gpu transition-[opacity,transform] duration-[1000ms] ease-[cubic-bezier(0.22,1,0.36,1)] " +
        (visible ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-[0.992] opacity-0")
      }
      aria-live="polite"
      aria-busy={loading}
      role="status"
      data-module="aurum-loading-screen"
    >
      {presentationCover ? (
        <img
          src={presentationCover}
          alt="Presentación del diseño"
          className={
            "absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] " +
            (presentationVisible ? "scale-100" : "scale-[1.015]")
          }
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,#ffffff_0%,#f2f2f0_48%,#d8d9d7_100%)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/10" />
      {!presentationCover && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_43%,rgba(255,255,255,.35)_0%,transparent_54%)]" />
      )}
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className={"flex w-full max-w-sm flex-col items-center text-center " + (presentationCover ? "opacity-0" : "opacity-100")}>
          <div className="relative mb-7 grid size-[92px] place-items-center">
            <div className="absolute inset-0 rounded-full bg-[#d8bd7c]/20 blur-2xl" />
            <div className="absolute inset-0 rounded-full border border-[#c8a45b]/25" />
            <div className="absolute inset-[-5px] animate-spin rounded-full border border-transparent border-t-[#b99642] [animation-duration:2.8s]" />
            <div className="relative grid size-[76px] place-items-center rounded-full border border-[#c9a65e]/35 bg-white shadow-[0_8px_24px_rgba(123,91,31,.10)]">
              <img src="/brand/aurum-symbol.svg" alt="" aria-hidden="true" width="54" height="54" className="size-[54px] object-contain" />
            </div>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#a18443]">AURUM RENDER</p>
          <h2 className="mt-3 text-lg font-medium tracking-[-.02em] text-[#292824] sm:text-xl">{message}</h2>
          <div className="mt-7 h-[2px] w-32 overflow-hidden rounded-full bg-[#e7e3da]" aria-hidden="true">
            <div className="h-full w-2/5 animate-pulse rounded-full bg-gradient-to-r from-[#b99642] via-[#e4cb83] to-[#b99642]" />
          </div>
        </div>
      </div>
    </div>
  );
}
