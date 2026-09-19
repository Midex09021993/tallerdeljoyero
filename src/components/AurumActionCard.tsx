import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

export function AurumActionCard({
  icon: Icon,
  title,
  text,
  action = "Abrir",
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:border-primary/45 hover:shadow-lg hover:shadow-primary/10 active:translate-y-0 active:scale-[0.995]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent transition-all duration-300 group-hover:via-primary/70" />
      <div className="mb-5 grid size-10 place-items-center rounded-xl bg-primary/8 text-primary transition-all duration-200 group-hover:scale-105 group-hover:bg-primary/12 group-hover:shadow-sm group-hover:shadow-primary/15">
        <Icon className="size-5 transition-transform duration-200 group-hover:scale-110" />
      </div>
      <p className="font-semibold transition-colors duration-200 group-hover:text-primary">{title}</p>
      <p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">{text}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary transition-all duration-200 group-hover:gap-2">
        {action}
        <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}
