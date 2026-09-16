# AURUM RENDER — Lovable repair task

## Purpose
This branch intentionally contains a deterministic initialization failure so Lovable Agent can diagnose and repair the viewer instead of guessing.

## Required outcome
Restore the 3D viewport so a jewelry model loads and renders reliably, while preserving the current professional Aurum UX shell already present on `main`.

## UX that must remain
- Left library: Material, Gemas, Escena.
- Main 3D viewport with orbit / pan / zoom / fit controls.
- Right-side render controls and quality selector.
- HDRI / PBR / 4K indicators.
- Clean jewelry-photography presentation.
- Do not expose technical render configuration to normal users.

## Rendering architecture to preserve
- Separate material, gem, scene, lighting and photographic-profile engines.
- Independent metal HDRI and gem environment.
- Professional PBR / MeshPhysicalMaterial workflow.
- Scene presets including Producto, Gema Clara, Estudio Oscuro, Luxury and the existing catalog.
- Render quality tiers Baja / Alta / Ultra.
- Camera framing based on model bounds, not fixed world dimensions.
- Graceful fallback when HDRI/network assets fail.
- Proper cleanup of Three.js resources and animation loop.

## First diagnostic targets
Inspect `src/components/AurumRender.tsx` and the imported Aurum engines. Check:
1. WebGL renderer initialization and DOM mounting.
2. EffectComposer/post-processing initialization and fallback behavior.
3. Environment/HDRI loading and asynchronous race conditions.
4. Scene controller initialization order.
5. Gem environment initialization order.
6. Model loading / normalization / framing.
7. Duplicate renderer mounting or lifecycle cleanup.
8. React effect cleanup and stale async callbacks.
9. Any runtime exception swallowed by broad catch blocks.
10. Verify the viewer actually paints a frame after initialization.

## Important
Remove the intentional throw in `src/lib/aurum-scene-engine.ts` only after the real initialization problem is fixed.

## Verification
- Preview opens without a blank viewport.
- Load a GLB/3DM test model.
- Change Material, Gema and Escena.
- Change render quality.
- Orbit / pan / zoom / fit.
- Capture image.
- Switch scenes without destroying the viewer.
- No uncaught console error.
