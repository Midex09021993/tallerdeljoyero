import * as THREE from "three";

export type AurumSmartFamily = "metal" | "gema" | "otro";
export type AurumSmartRisk = "green" | "yellow" | "red";
export interface AurumSmartMeshRecord {
  readonly name: string; readonly family: AurumSmartFamily; readonly risk: AurumSmartRisk;
  readonly reasons: readonly string[]; readonly vertices: number; readonly triangles: number;
  readonly hasNormals: boolean; readonly hasMaterial: boolean; readonly boundsKnown: boolean;
}
export interface AurumSmartScanReport {
  readonly version: "1.0.0"; readonly meshCount: number; readonly visibleMeshCount: number;
  readonly cachedGeometryHits: number; readonly scannedGeometries: number;
  readonly greenCount: number; readonly yellowCount: number; readonly redCount: number;
  readonly meshes: readonly AurumSmartMeshRecord[]; readonly deepDiagnosticsRecommended: boolean;
}
interface GeometryFacts {
  readonly signature: string; readonly vertices: number; readonly triangles: number;
  readonly hasNormals: boolean; readonly boundsKnown: boolean; readonly invalidStructure: boolean;
}
const geometryCache = new WeakMap<THREE.BufferGeometry, GeometryFacts>();
function geometrySignature(geometry: THREE.BufferGeometry): string {
  const p = geometry.getAttribute("position"), n = geometry.getAttribute("normal"), i = geometry.getIndex();
  const version = (attr: unknown): number => (attr as { version?: number } | undefined)?.version ?? -1;
  return [geometry.uuid, version(p), p?.count ?? -1, p?.itemSize ?? -1,
    version(n), n?.count ?? -1, n?.itemSize ?? -1, i?.version ?? -1, i?.count ?? -1,
    geometry.groups.length].join(":");
}
function inspectGeometry(geometry: THREE.BufferGeometry): GeometryFacts {
  const signature = geometrySignature(geometry), cached = geometryCache.get(geometry);
  if (cached?.signature === signature) return cached;
  const position = geometry.getAttribute("position"), normal = geometry.getAttribute("normal"), index = geometry.getIndex();
  const vertices = position?.count ?? 0, elementCount = index?.count ?? vertices;
  const facts: GeometryFacts = Object.freeze({
    signature, vertices, triangles: Math.floor(elementCount / 3),
    hasNormals: Boolean(normal && normal.count === vertices && normal.itemSize >= 3),
    boundsKnown: Boolean(geometry.boundingBox && !geometry.boundingBox.isEmpty()),
    // Structural checks only: no full index/vertex scan in this fast path.
    invalidStructure: !position || position.itemSize < 3 || vertices < 3 || elementCount < 3 || elementCount % 3 !== 0,
  });
  geometryCache.set(geometry, facts);
  return facts;
}
function classifyFamily(mesh: THREE.Mesh): AurumSmartFamily {
  const rhino = (mesh.userData?.["aurumRhino"] ?? {}) as Record<string, unknown>;
  const names = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => m?.name ?? "").join(" ");
  const value = [mesh.name, rhino["capa"], rhino["categoria"], names].join(" ").toLowerCase();
  if (rhino["categoria"] === "gema" || /(gem|gema|piedra|diamond|diamante|zafiro|sapphire|rubi|rubí|ruby|esmeralda|emerald|moissanita|citrino|amatista|topacio)/.test(value)) return "gema";
  if (rhino["categoria"] === "metal" || /(metal|oro|gold|plata|silver|platino|platinum|acero|steel)/.test(value)) return "metal";
  return "otro";
}
function isVisible(mesh: THREE.Mesh): boolean {
  for (let node: THREE.Object3D | null = mesh; node; node = node.parent) if (!node.visible) return false;
  return true;
}
/** Lightweight triage, not BREP/solid/intersection certification. Direct buffer edits must set needsUpdate=true. */
export function createAurumSmartScan() {
  return Object.freeze({
    id: "aurum.smart-scan" as const, version: "1.0.0" as const,
    inspect(root: THREE.Object3D): AurumSmartScanReport {
      let cachedGeometryHits = 0, scannedGeometries = 0, visibleMeshCount = 0;
      const records: AurumSmartMeshRecord[] = [], seen = new WeakSet<THREE.BufferGeometry>();
      root.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh || !mesh.geometry) return;
        const visible = isVisible(mesh);
        if (visible) visibleMeshCount += 1;
        const geometry = mesh.geometry, signature = geometrySignature(geometry);
        const cached = geometryCache.get(geometry);
        if (seen.has(geometry) || cached?.signature === signature) cachedGeometryHits += 1;
        else scannedGeometries += 1;
        seen.add(geometry);
        const facts = inspectGeometry(geometry), reasons: string[] = [];
        if (facts.invalidStructure) reasons.push("invalid-geometry-structure");
        if (!facts.hasNormals) reasons.push("missing-or-mismatched-normals");
        if (!facts.boundsKnown) reasons.push("bounds-not-precomputed");
        if (!mesh.material || (Array.isArray(mesh.material) && mesh.material.length === 0)) reasons.push("missing-material");
        if (!visible) reasons.push("hidden-mesh");
        const risk: AurumSmartRisk = facts.invalidStructure ? "red"
          : reasons.some((reason) => reason !== "hidden-mesh") ? "yellow" : "green";
        records.push(Object.freeze({ name: mesh.name || `Mesh ${records.length + 1}`,
          family: classifyFamily(mesh), risk, reasons: Object.freeze(reasons), vertices: facts.vertices,
          triangles: facts.triangles, hasNormals: facts.hasNormals, hasMaterial: Boolean(mesh.material),
          boundsKnown: facts.boundsKnown }));
      });
      const greenCount = records.filter((item) => item.risk === "green").length;
      const yellowCount = records.filter((item) => item.risk === "yellow").length;
      const redCount = records.filter((item) => item.risk === "red").length;
      return Object.freeze({ version: "1.0.0" as const, meshCount: records.length, visibleMeshCount,
        cachedGeometryHits, scannedGeometries, greenCount, yellowCount, redCount,
        meshes: Object.freeze(records), deepDiagnosticsRecommended: redCount > 0 || yellowCount > 0 });
    },
  });
}
