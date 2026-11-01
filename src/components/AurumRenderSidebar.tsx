import {
  Blend,
  CircleDot,
  Code2,
  Diamond,
  Image,
  Gem,
  Layers2,
  ScanEye,
  SlidersHorizontal,
  Sparkles,
  Tags,
  Timer,
  Upload,
  Wallpaper,
} from "lucide-react";

const toolbarItems = [
  { id: "ambientes", label: "Ambientes", icon: CircleDot },
  { id: "gem-hdr", label: "HDR", icon: Diamond },
  { id: "fondos", label: "Fondo", icon: Wallpaper },
  { id: "escenas", label: "Escena", icon: Sparkles },
  { id: "materiales", label: "Materiales", icon: Tags },
  { id: "gemas", label: "Gemas", icon: Gem },
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
 * Escena agrupa los controles del suelo y las sombras de contacto.
 */
export function AurumRenderSidebar({ activeToolId, onAmbientesClick, onGemHdrClick, onBackgroundClick, onSceneClick, onMaterialsClick, onGemsClick, onRhinoExportClick }: { activeToolId: string; onAmbientesClick: () => void; onGemHdrClick: () => void; onBackgroundClick: () => void; onSceneClick: () => void; onMaterialsClick: () => void; onGemsClick: () => void; onRhinoExportClick: () => void }) {
  return (
    <nav
      aria-label="Herramientas de Aurum Render"
      className="flex h-full w-14 shrink-0 flex-col items-center gap-1 rounded-l-2xl border border-r-0 border-[#e7e2d9] bg-[#f9f8f5] py-2 text-[#45433e]"
    >
      {toolbarItems.map((item) => {
        const Icon = item.icon;
        const isAmbientes = item.id === "ambientes";
        const isGemHdr = item.id === "gem-hdr";
        const isBackground = item.id === "fondos";
        const isScene = item.id === "escenas";
        const isMaterials = item.id === "materiales";
        const isGems = item.id === "gemas";
        const isRhinoExport = item.id === "export";
        const active = (isAmbientes && (activeToolId === "ambientes" || activeToolId === "hdrMetales")) || (isGemHdr && activeToolId === "hdrGemas") || (isBackground && activeToolId === "fondos") || (isScene && activeToolId === "escenas") || (isMaterials && activeToolId === "materiales") || (isGems && activeToolId === "gemas") || (isRhinoExport && activeToolId === "rhino-export");
        const contents = (
          <>
            {active && (
              <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-[#b99642]" />
            )}
            <span className={"grid size-8 place-items-center rounded-lg " + (active ? "bg-[#f4efe5]" : "")}>
              <Icon strokeWidth={1.75} className="size-[19px]" />
            </span>
            {item.label && (
              <span className="text-[9px] font-medium leading-none tracking-[.01em]">
                {item.label}
              </span>
            )}
            {item.beta && (
              <span className="absolute bottom-[5px] right-[5px] rounded-[2px] bg-[#92743b] px-[2px] py-[1px] text-[6px] font-bold leading-none text-white">
                BETA
              </span>
            )}
          </>
        );
        const className = "relative flex h-[54px] w-full flex-col items-center justify-center gap-0.5 " + (active ? "text-[#92743b]" : "text-[#45433e]");
        if (isAmbientes || isGemHdr || isBackground || isScene || isMaterials || isGems || isRhinoExport) {
          const title = isAmbientes ? "Ambientes" : isGemHdr ? "HDR Entorno de Gemas" : isBackground ? "Fondos de escena" : isScene ? "Escenas" : isMaterials ? "Materiales" : isGems ? "Gemas" : "Exportar para Rhinoceros";
          const onClick = isAmbientes ? onAmbientesClick : isGemHdr ? onGemHdrClick : isBackground ? onBackgroundClick : isScene ? onSceneClick : isMaterials ? onMaterialsClick : isGems ? onGemsClick : onRhinoExportClick;
          return (
            <button key={item.id} type="button" title={title} aria-label={title} aria-pressed={active} onClick={onClick} className={className}>
              {contents}
            </button>
          );
        }
        return (
          <div key={item.id} title={item.label || item.id} className={className}>
            {contents}
          </div>
        );
      })}
    </nav>
  );
}
