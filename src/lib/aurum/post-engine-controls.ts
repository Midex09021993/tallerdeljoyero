export type AurumPostControls = {
  gemFxaaEnabled: boolean;
  diamondSsaaEnabled: boolean;
  surfaceEdgeAaEnabled: boolean;
  taaEnabled: boolean;
};

const STORAGE_KEY = "aurum:post-engine-controls:v2";
const LEGACY_STORAGE_KEY = "aurum:post-engine-controls:v1";
const DEFAULTS: AurumPostControls = {
  // Selective diamond-only supersampling is enabled by default. Its compositor
  // replaces pixels inside the center-diamond mask only and runs only while settled.
  // FXAA complements diamond SSAA but is restricted to the outer girdle silhouette.
  // It does not filter internal facet boundaries.
  gemFxaaEnabled: false,
  diamondSsaaEnabled: false,
  surfaceEdgeAaEnabled: false,
  taaEnabled: false,
};

export function getAurumPostControls(): AurumPostControls {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const value = JSON.parse(raw);
      return {
        gemFxaaEnabled: value.gemFxaaEnabled === true,
        diamondSsaaEnabled: value.diamondSsaaEnabled === true,
        // Full-surface AA and temporal accumulation are outside the approved
        // diamond-only scope. Ignore stale persisted values from older builds.
        surfaceEdgeAaEnabled: false,
        taaEnabled: false,
      };
    }

    // One-time migration: retain only the diamond-scoped preferences.
    // Full-surface AA and temporal accumulation are deliberately not migrated.
    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyRaw) return DEFAULTS;
    const legacy = JSON.parse(legacyRaw);
    const migrated: AurumPostControls = {
      // The emergency rollback keeps all added diamond treatments disabled.
      // Legacy full-surface AA and TAA preferences are intentionally discarded.
      gemFxaaEnabled: false,
      diamondSsaaEnabled: false,
      surfaceEdgeAaEnabled: false,
      taaEnabled: false,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return DEFAULTS;
  }
}

export function setAurumPostControls(next: Partial<AurumPostControls>): AurumPostControls {
  const value: AurumPostControls = {
    ...getAurumPostControls(),
    ...next,
    // Never allow a stale UI action or saved preference to enable processing
    // that changes metal/environment pixels or accumulates the full image.
    surfaceEdgeAaEnabled: false,
    taaEnabled: false,
  };
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
    callback(detail && typeof detail === "object" ? detail : getAurumPostControls());
  };
  window.addEventListener("aurum-post-controls-change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("aurum-post-controls-change", handler);
    window.removeEventListener("storage", handler);
  };
}
