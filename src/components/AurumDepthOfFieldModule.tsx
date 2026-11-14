import { useEffect, useState } from "react";

type DepthOfFieldStrength = "soft" | "medium" | "strong";

type Props = {
  otherPanelOpen?: boolean;
  onChange: (enabled: boolean, strength: DepthOfFieldStrength) => void;
};

/**
 * Controls the live depth-of-field feature.
 * The rendering implementation remains behind Aurum's public API;
 * this module owns the control state and its presentation only.
 */
export function AurumDepthOfFieldModule({ otherPanelOpen = false, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [strength, setStrength] = useState<DepthOfFieldStrength>("soft");

  useEffect(() => {
    if (otherPanelOpen) setOpen(false);
  }, [otherPanelOpen]);

  const changeEnabled = (next: boolean) => {
    setEnabled(next);
    onChange(next, strength);
  };

  const changeStrength = (next: DepthOfFieldStrength) => {
    setStrength(next);
    onChange(enabled, next);
  };

  return (
    <>
      <button
        type="button"
        title="Profundidad de campo en el visor"
        aria-label="Ajustes de profundidad de campo en el visor"
        aria-expanded={open}
        aria-pressed={enabled}
        onClick={() => setOpen((value) => !value)}
        className={"grid size-9 place-items-center rounded-xl text-[10px] font-semibold transition-colors " + (enabled ? "bg-[#d4af37]/20 text-[#92743b]" : open ? "bg-white/80 text-[#92743b]" : "text-black/70 hover:bg-white/70")}
      >
        DOF
      </button>
      {open && (
        <section className="absolute right-[70px] top-[calc(50%+52px)] z-40 w-[min(270px,calc(100%-5rem))] rounded-2xl border border-black/10 bg-[#fbfaf7]/95 p-3 text-[#292824] shadow-xl backdrop-blur-2xl" aria-label="Configuración de profundidad de campo">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#92743b]">Profundidad de campo · visor</div>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-white p-3 text-xs">
            <span>
              <span className="block font-semibold">Previsualizar desenfoque</span>
              <span className="mt-1 block text-[10px] text-[#77756f]">Se aplica al visor al terminar la órbita.</span>
            </span>
            <input type="checkbox" checked={enabled} onChange={(event) => changeEnabled(event.target.checked)} className="size-4 accent-[#b99642]" />
          </label>
          <label className="mt-2 block text-[10px] text-[#66645e]">
            Intensidad
            <select value={strength} onChange={(event) => changeStrength(event.target.value as DepthOfFieldStrength)} className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-2 text-xs text-[#292824]">
              <option value="soft">Suave · recomendado</option>
              <option value="medium">Medio</option>
              <option value="strong">Intenso</option>
            </select>
          </label>
          <p className="mt-2 text-[10px] leading-relaxed text-[#858178]">El efecto se pausa durante el movimiento para conservar fluidez y se recupera al estabilizar la cámara.</p>
        </section>
      )}
    </>
  );
}
