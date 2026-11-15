import { useMemo } from "react";

type AurumLoadingExperienceProps = {
  message: string;
  completed?: number;
  total?: number;
};

export function AurumLoadingExperience({ message, completed, total }: AurumLoadingExperienceProps) {
  const progress = useMemo(() => {
    if (!Number.isFinite(completed) || !Number.isFinite(total) || (total ?? 0) <= 0 || (completed ?? -1) < 0) return null;
    return Math.max(0, Math.min(100, Math.round(((completed as number) / (total as number)) * 100)));
  }, [completed, total]);

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="absolute inset-0 z-40 grid place-items-center bg-[#080a0d]/82 px-5 py-8 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-2xl border border-[#d4af37]/25 bg-[#11151a]/95 px-6 py-7 text-center shadow-[0_24px_80px_rgba(0,0,0,.45)]">
        <img src="/brand/aurum-symbol.svg" alt="AURUM LAB" width="72" height="64" className="mx-auto h-16 w-[72px] object-contain" />
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[.28em] text-[#d4af37]">AURUM LAB</p>
        <p className="mt-2 text-sm font-medium leading-relaxed text-white/90">{message}</p>
        {progress !== null && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-[10px] tabular-nums text-white/55">
              <span>Progreso real</span>
              <span>{progress}%</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-label="Progreso de preparación del modelo"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div className="h-full rounded-full bg-gradient-to-r from-[#9c7626] via-[#e5c45d] to-[#f8e6a0] transition-[width] duration-150" style={{ width: progress + "%" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
