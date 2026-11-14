export type AurumManagedModuleId = "gem-edge-aa" | "surface-edge-aa" | "dof" | "lut" | "vignette" | "grading";

export const AURUM_MODULE_CONTROL_EVENT = "aurum:module-control";
const STORAGE_KEY = "aurum-render-module-controls";

export const AURUM_MODULE_DEFAULTS: Record<AurumManagedModuleId, boolean> = {
  "gem-edge-aa": true,
  "surface-edge-aa": true,
  dof: false,
  lut: true,
  vignette: true,
  grading: false,
};

export function readAurumModuleControls(): Record<AurumManagedModuleId, boolean> {
  const defaults = { ...AURUM_MODULE_DEFAULTS };
  if (typeof window === "undefined") return defaults;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as Partial<Record<AurumManagedModuleId, unknown>>;
    for (const id of Object.keys(defaults) as AurumManagedModuleId[]) {
      if (typeof saved[id] === "boolean") defaults[id] = saved[id] as boolean;
    }
  } catch {
    // Invalid or unavailable local storage must never prevent the viewer from starting.
  }
  return defaults;
}

export function setAurumModuleControl(id: AurumManagedModuleId, enabled: boolean): void {
  if (typeof window === "undefined") return;
  const next = { ...readAurumModuleControls(), [id]: Boolean(enabled) };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // The current session still receives the event even if persistence is unavailable.
  }
  window.dispatchEvent(new CustomEvent(AURUM_MODULE_CONTROL_EVENT, { detail: { id, enabled: Boolean(enabled) } }));
}
