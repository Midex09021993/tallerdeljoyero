export type AurumPostControls = {
  gemFxaaEnabled: boolean;
  surfaceEdgeAaEnabled: boolean;
  taaEnabled: boolean;
};

const STORAGE_KEY = "aurum:post-engine-controls:v2";
const LEGACY_STORAGE_KEY = "aurum:post-engine-controls:v1";
const DEFAULTS: AurumPostControls = {
  // Gem Mask + FXAA are disabled by default. Surface AA and TAA remain off.
  gemFxaaEnabled: false,
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
        surfaceEdgeAaEnabled: value.surfaceEdgeAaEnabled === true,
        taaEnabled: value.taaEnabled === true,
      };
    }

    // One-time migration: activate the requested gem-only AA path while
    // preserving the user's independent Surface Edge AA and TAA preferences.
    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyRaw) return DEFAULTS;
    const legacy = JSON.parse(legacyRaw);
    const migrated: AurumPostControls = {
      gemFxaaEnabled: false,
      surfaceEdgeAaEnabled: legacy.surfaceEdgeAaEnabled === true,
      taaEnabled: legacy.taaEnabled === true,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return DEFAULTS;
  }
}

export function setAurumPostControls(next: Partial<AurumPostControls>): AurumPostControls {
  const value = { ...getAurumPostControls(), ...next };
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
