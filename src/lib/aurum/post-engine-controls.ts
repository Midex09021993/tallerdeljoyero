export type AurumPostControls = {
  gemMaskEnabled: boolean;
  diamondSsaaEnabled: boolean;
  gemFxaaEnabled: boolean;
  diamondTaaEnabled: boolean;
  /** Full-surface processing is intentionally excluded from diamond controls. */
  surfaceEdgeAaEnabled: boolean;
  /** Legacy full-frame TAA remains permanently disabled. */
  taaEnabled: boolean;
};

const STORAGE_KEY = "aurum:post-engine-controls:v4";
const LEGACY_STORAGE_KEYS = ["aurum:post-engine-controls:v3", "aurum:post-engine-controls:v2", "aurum:post-engine-controls:v1"];
const DEFAULTS: AurumPostControls = {
  gemMaskEnabled: true,
  diamondSsaaEnabled: true,
  gemFxaaEnabled: true,
  diamondTaaEnabled: false,
  surfaceEdgeAaEnabled: false,
  taaEnabled: false,
};

// Gem Mask is the safety boundary for diamond-only reconstruction.
// SSAA is explicitly user-toggleable only behind Gem Mask; TAA remains fail-closed.
const normalize = (value: any): AurumPostControls => ({
  gemMaskEnabled: value?.gemMaskEnabled === true,
  diamondSsaaEnabled: value?.gemMaskEnabled === true && value?.diamondSsaaEnabled === true,
  gemFxaaEnabled: value?.gemMaskEnabled === true && value?.gemFxaaEnabled === true,
  diamondTaaEnabled: false,
  surfaceEdgeAaEnabled: false,
  taaEnabled: false,
});

export function getAurumPostControls(): AurumPostControls {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const current = window.localStorage.getItem(STORAGE_KEY);
    if (current) return normalize(JSON.parse(current));

    for (const key of LEGACY_STORAGE_KEYS) {
      const legacy = window.localStorage.getItem(key);
      if (!legacy) continue;
      const migrated = normalize(JSON.parse(legacy));
      // v3 introduced the isolated diamond-only controls but shipped them
      // opt-in. Promote an untouched all-off v3 state to the approved default;
      // preserve any explicit partial/user selection.
      const isV3 = key === "aurum:post-engine-controls:v3";
      if (isV3 && !migrated.gemMaskEnabled && !migrated.diamondSsaaEnabled && !migrated.gemFxaaEnabled) {
        migrated.gemMaskEnabled = true;
        migrated.diamondSsaaEnabled = true;
        migrated.gemFxaaEnabled = true;
      }
      migrated.diamondTaaEnabled = false;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function setAurumPostControls(next: Partial<AurumPostControls>): AurumPostControls {
  const value: AurumPostControls = normalize({
    ...getAurumPostControls(),
    ...next,
  });
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* storage may be unavailable */ }
    window.dispatchEvent(new CustomEvent("aurum-post-controls-change", { detail: value }));
  }
  return value;
}

export function subscribeAurumPostControls(callback: (value: AurumPostControls) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<AurumPostControls>).detail;
    callback(detail && typeof detail === "object" ? normalize(detail) : getAurumPostControls());
  };
  window.addEventListener("aurum-post-controls-change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("aurum-post-controls-change", handler);
    window.removeEventListener("storage", handler);
  };
}
