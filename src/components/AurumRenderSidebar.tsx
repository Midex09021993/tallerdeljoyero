import {
  Blend,
  Box,
  CircleDot,
  Code2,
  Diamond,
  Image,
  Layers2,
  ScanEye,
  SlidersHorizontal,
  Sparkles,
  Tags,
  Timer,
  Upload,
  AudioWaveform,
} from "lucide-react";

const toolbarItems = [
  { id: "metal-hdr", label: "HDR", icon: CircleDot, active: true },
  { id: "gem-hdr", label: "HDR", icon: Diamond },
  { id: "stripes", label: "", icon: AudioWaveform },
  { id: "effects", label: "", icon: Sparkles },
  { id: "images", label: "", icon: Image },
  { id: "layers", label: "", icon: Layers2 },
  { id: "timing", label: "", icon: Timer },
  { id: "export", label: "", icon: Upload },
  { id: "boolean", label: "B×", icon: Blend, beta: true },
  { id: "code", label: "", icon: Code2 },
  { id: "tags", label: "", icon: Tags },
  { id: "controls", label: "", icon: SlidersHorizontal },
  { id: "ar", label: "AR", icon: ScanEye, beta: true },
];

/**
 * Barra lateral visual de Aurum Render.
 * Los accesos son deliberadamente presentacionales: sus acciones se definirán
 * después, cuando se establezca el comportamiento de cada herramienta.
 */
export function AurumRenderSidebar() {
  return (
    <nav
      aria-label="Herramientas de Aurum Render"
      className="flex h-full w-14 shrink-0 flex-col items-center gap-1 border-r border-black/[.07] bg-[#f1f1f0] py-2 text-[#292929] shadow-[2px_0_10px_rgba(0,0,0,.035)]"
    >
      {toolbarItems.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            title={item.label || item.id}
            aria-current={item.active ? "page" : undefined}
            className={
              "relative flex h-[54px] w-full flex-col items-center justify-center gap-0.5 " +
              (item.active
                ? "text-[#5365ff]"
                : "text-[#292929]")
            }
          >
            {item.active && (
              <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-[#6675ff]" />
            )}
            <span
              className={
                "grid size-8 place-items-center rounded-lg " +
                (item.active ? "bg-[#e7eaff]" : "")
              }
            >
              <Icon strokeWidth={1.75} className="size-[19px]" />
            </span>
            {item.label && (
              <span className="text-[9px] font-medium leading-none tracking-[.01em]">
                {item.label}
              </span>
            )}
            {item.beta && (
              <span className="absolute bottom-[5px] right-[5px] rounded-[2px] bg-[#6574ff] px-[2px] py-[1px] text-[6px] font-bold leading-none text-white">
                BETA
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
