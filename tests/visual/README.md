# AURUM visual regression baselines

This folder defines the capture protocol for approved jewelry reference images.

## Required fixture families

| Fixture ID | Subject | Baseline | Status |
|---|---|---|---|
| `ring` | Anillo real importado desde 3DM/GLB | Not committed | Pending approved capture |
| `earrings` | Aretes reales importados desde 3DM/GLB | Not committed | Pending approved capture |
| `pendant` | Dije real importado desde 3DM/GLB | Not committed | Pending approved capture |

No synthetic image is accepted as a product baseline. The repository currently has no approved, reproducible ring, earrings and pendant captures. Do not generate or approve baselines from placeholders.

## Capture protocol

1. Use the same source 3DM/GLB, camera transform, viewport, DPR, render quality, environment maps, material catalog and color-space configuration for reference and candidate.
2. Wait for import completion, shader compilation, environment readiness and the SETTLED viewer state.
3. Hide transient UI and cursor elements; prefer a dedicated clean viewer viewport instead of masking jewelry pixels.
4. Capture the WebGL canvas with `captureAurumCanvasRgba(canvas)`.
5. Store the reference capture only after a human visual review confirms it matches the intended product appearance.
6. Compare candidate and reference with `compareAurumVisualCaptures`. Start with channel tolerance 8 and changed-pixel ratio 0.002; calibrate only after collecting repeat captures on the same GPU/browser profile.
7. Keep the capture metadata next to each baseline: source asset checksum, camera, width/height, DPR, browser/WebGL renderer, quality profile, environment/material preset and baseline approval date.

## Important limitations

- The RGBA comparator is deterministic, but WebGL output can vary across GPU vendors, drivers, browsers and color-management paths. Baselines must be grouped by a controlled capture profile.
- Do not compare screenshots containing dynamic controls, hover states, loading overlays, timestamps or cursor artifacts.
- A passing pixel threshold is not proof of optical correctness. Human review remains required for reflections, facet sparkle, metal continuity and gemstone transmission.
- Until real product baselines are approved, CI validates comparator behavior only; it does not certify the visual quality of ring, earrings or pendant models.
