import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";

const CLOSE_DELAY_MS = 150;

type NavDropdownProps = {
  label: ReactNode;
  /** Render the menu items; call close() after selecting one. */
  children: (close: () => void) => ReactNode;
  panelClassName?: string;
};

/** Desktop navigation dropdown: hover (with cancelable close delay) + click + keyboard. */
export function NavDropdown({ label, children, panelClassName = "w-[320px]" }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const hoverOpened = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();
  const panelId = `nav-dropdown-${id.replace(/:/g, "")}`;
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const cancelClose = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const close = useCallback(() => {
    cancelClose();
    hoverOpened.current = false;
    setOpen(false);
  }, [cancelClose]);
  const scheduleClose = useCallback(() => {
    cancelClose();
    timer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [cancelClose]);

  useEffect(() => () => cancelClose(), [cancelClose]);
  useEffect(() => { close(); }, [pathname, close]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") { close(); buttonRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const items = () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  const focusItem = (index: number) => {
    const list = items();
    if (!list.length) return;
    list[(index + list.length) % list.length]?.focus();
  };

  const onButtonKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      const first = e.key === "ArrowDown";
      requestAnimationFrame(() => focusItem(first ? 0 : -1));
    }
  };
  const onPanelKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") { e.preventDefault(); focusItem(i + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); focusItem(i - 1); }
    else if (e.key === "Home") { e.preventDefault(); focusItem(0); }
    else if (e.key === "End") { e.preventDefault(); focusItem(-1); }
    else if (e.key === "Tab") close();
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      onPointerEnter={(e) => { if (e.pointerType === "mouse") { cancelClose(); if (!open) hoverOpened.current = true; setOpen(true); } }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") scheduleClose(); }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) close(); }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={panelId}
        onClick={() => {
          cancelClose();
          // A click right after hover-opening keeps the menu open instead of toggling it shut.
          if (hoverOpened.current) { hoverOpened.current = false; setOpen(true); return; }
          setOpen((v) => !v);
        }}
        onKeyDown={onButtonKey}
        className="inline-flex items-center gap-1.5 rounded transition hover:text-[#a77a00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19] aria-expanded:text-[#a77a00]"
      >
        {label}
        <ChevronDown aria-hidden="true" className={"size-3.5 transition-transform duration-200 " + (open ? "rotate-180" : "")} />
      </button>
      {/* pt-2 acts as an invisible hover bridge between trigger and panel */}
      <div
        className={
          "absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 transition duration-150 ease-out " +
          (open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0 pointer-events-none")
        }
      >
        <div
          ref={panelRef}
          id={panelId}
          role="menu"
          aria-label={typeof label === "string" ? label : undefined}
          onKeyDown={onPanelKey}
          className={"overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,.14)] " + panelClassName}
        >
          {children(close)}
        </div>
      </div>
    </div>
  );
}
