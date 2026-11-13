/**
 * AURUM EDGE QUALITY — shared runtime policy for LIVE, SETTLED and still capture.
 * Keep the blend intentionally subtle: both preview states use the same value
 * to avoid a visible quality pop when OrbitControls settles.
 */
export type AurumEdgeAaMode = "live" | "settled" | "capture";
export type AurumEdgeAaProfile = {
  mode: AurumEdgeAaMode;
  enabled: boolean;
  strength: number;
};

/** One low-cost policy for every viewer state; no renderer or shader rebuild. */
export function getAurumEdgeAaProfile(
  qualityId: string,
  budgetTier: string,
  mode: AurumEdgeAaMode,
): AurumEdgeAaProfile {
  const quality = String(qualityId ?? "").toLowerCase();
  const tier = String(budgetTier ?? "").toLowerCase();
  const isHighQuality = quality === "high" || quality === "ultra";
  const withinInteractiveBudget = tier !== "extreme";
  const enabled = mode === "capture"
    ? isHighQuality
    : mode === "live"
      ? quality !== "low" && withinInteractiveBudget
      : quality !== "low" && withinInteractiveBudget;

  return { mode, enabled, strength: enabled ? 0.035 : 0 };
}

