# AURUM SURFACE 1.0.0

## Purpose

AURUM SURFACE inspects visible mesh bodies for coincident boundary edges in world space. It is a read-only diagnostic stage in the AURUM import pipeline.

## Report

- Boundary edges and non-manifold edges per mesh and across the inspected model.
- Candidate seams where boundary edges from separate mesh bodies coincide within a configurable tolerance.
- A local triangle-normal comparison that reports approximately aligned or discontinuous tangent planes.
- A hard edge-record budget and a `truncated` flag so incomplete reports are never mistaken for complete analysis.

## Continuity limits

Coincident boundary edges are evidence of positional contact (a G0-like candidate), not proof that the underlying CAD surfaces are joined. The normal comparison is a mesh-level tangent-plane hint only; it does not certify parametric G1 continuity. G2 curvature continuity and native Rhino BREP topology are not inferred by this engine.

Different tessellations, partial edge overlaps, T-junctions, and surfaces with different sampling can evade exact edge matching. A zero match count does not prove that bodies are disconnected.

## Import and GLB safety

The import manager records the surface report after the geometry report. The report never edits source geometry, transforms, normals, materials, or visibility.

The experimental CSG metal union is now opt-in through `AurumImportRequest.metalUnion: true`. It remains a visual mesh approximation and must be used only for controlled comparisons. It is disabled by default because bounding-box overlap is not proof of a valid solid intersection. Original Rhino geometry remains the reference source.

## Validation required before production fusion

Use representative real 3DM jewelry assemblies with different body counts, layer structures, metal finishes, stones, and intentional gaps. Compare source and exported GLB visually and geometrically. Do not treat synthetic unit tests as production certification.
