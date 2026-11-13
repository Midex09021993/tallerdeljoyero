# AURUM SMART SCAN 1.0

AURUM SMART SCAN adds a low-cost triage pass to the import pipeline.

## Behavior
- Classifies visible and hidden meshes into metal, gem, or other families.
- Reads existing geometry metadata (position/normal/index counts and precomputed bounds).
- Flags missing normals/materials, missing bounds, and structurally invalid buffers.
- Reuses geometry facts through a session-scoped WeakMap keyed by BufferGeometry.
- Invalidates cached facts when Three.js BufferAttribute.version changes.

## Routing
The scan always runs. Production imports still defer the expensive geometry, surface, solid, and triangle-intersection engines unless diagnostics are explicitly requested. The scan emits a risk summary so the UI/logging layer can recommend a deeper audit without unexpectedly slowing normal imports.

## Safety boundaries
- The scan does not certify watertightness, exact Rhino BREP validity, or absence of intersections.
- It does not modify geometry, materials, transforms, gems, shaders, HDRI, BVH rendering, or metal-union behavior.
- Existing GLB round-trip quality validation remains mandatory.
- Direct typed-array mutation must set the relevant BufferAttribute.needsUpdate flag so the cache version changes.
- Bounds are only read when already computed; the scan does not force a full vertex traversal to compute them.
