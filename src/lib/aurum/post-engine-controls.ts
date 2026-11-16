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

const STORAGE_KEY = "aurum:post-engine-controls:v3";
const LEGACY_STORAGE_KEYS = ["aurum:post-engine-controls:v2", "aurum:post-engine-controls:v1"];
const DEFAULTS: AurumPostControls = {
  gemMaskEnabled: false,
  diamondSsaaEnabled: false,
  gemFxaaEnabled: false,
  diamondTaaEnabled: false,
  surfaceEdgeAaEnabled: false,
  taaEnabled: false,
};

// Gem Mask is the safety boundary for diamond-only reconstruction.
// SSAA remains fail-closed globally until visual regression testing signs it off; FXAA stays independently user-toggleable behind Gem Mask.
const normalize = (value: any): AurumPostControls => ({
  gemMaskEnabled: value?.gemMaskEnabled === true,
  diamondSsaaEnabled: false,
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
      // Old builds had no independently controlled mask/TAA-diamond switches.
      // Legacy SSAA/FXAA preferences remain disabled during schema migration;
      // the new isolated controls can be enabled explicitly after migration.
      migrated.gemMaskEnabled = false;
      migrated.diamondSsaaEnabled = false;
      migrated.gemFxaaEnabled = false;
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
