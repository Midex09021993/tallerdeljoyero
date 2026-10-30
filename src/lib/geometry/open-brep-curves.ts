import * as THREE from "three";
import type { OpenBrepIntersectionSegment } from "./open-brep-intersection";

export type OpenBrepIntersectionCurve = {
  points: THREE.Vector3[];
  closed: boolean;
  segmentCount: number;
};

export type OpenBrepCurveAssemblyResult = {
  curves: OpenBrepIntersectionCurve[];
  discardedDegenerateSegments: number;
  branchVertices: number;
};

type Edge = { a: number; b: number; used: boolean };

function pointKey(point: THREE.Vector3, tolerance: number): string {
  return [
    Math.round(point.x / tolerance),
    Math.round(point.y / tolerance),
    Math.round(point.z / tolerance),
  ].join(":");
}

/**
 * Joins triangle-pair intersection segments into ordered polylines.
 * The returned curves are constraints for the later surface cutting stage.
 * This function never changes source geometry.
 */
export function assembleOpenBrepIntersectionCurves(
  segments: OpenBrepIntersectionSegment[],
  tolerance = 1e-7,
): OpenBrepCurveAssemblyResult {
  const safeTolerance = Math.max(1e-9, tolerance);
  const points: THREE.Vector3[] = [];
  const pointIds = new Map<string, number>();
  const edges: Edge[] = [];
  let discardedDegenerateSegments = 0;

  const intern = (point: THREE.Vector3): number => {
    const key = pointKey(point, safeTolerance);
    const existing = pointIds.get(key);
    if (existing !== undefined && points[existing]!.distanceTo(point) <= safeTolerance * Math.sqrt(3)) return existing;
    const id = points.length;
    points.push(point.clone());
    pointIds.set(key, id);
    return id;
  };

  const edgeKeys = new Set<string>();
  for (const segment of segments) {
    if (!segment.start || !segment.end || !segment.start.toArray().every(Number.isFinite)
      || !segment.end.toArray().every(Number.isFinite)
      || segment.start.distanceTo(segment.end) <= safeTolerance) {
      discardedDegenerateSegments++;
      continue;
    }
    const a = intern(segment.start);
    const b = intern(segment.end);
    if (a === b) { discardedDegenerateSegments++; continue; }
    const key = a < b ? a + ":" + b : b + ":" + a;
    if (edgeKeys.has(key)) continue;
    edgeKeys.add(key);
    edges.push({ a, b, used: false });
  }

  const adjacency: number[][] = Array.from({ length: points.length }, () => []);
  edges.forEach((edge, index) => {
    adjacency[edge.a]!.push(index);
    adjacency[edge.b]!.push(index);
  });
  const branchVertices = adjacency.filter((links) => links.length > 2).length;

  const walk = (start: number, firstEdge: number): OpenBrepIntersectionCurve => {
    const curvePoints = [points[start]!.clone()];
    let current = start;
    let edgeIndex = firstEdge;
    let closed = false;
    let traversed = 0;
    while (traversed <= edges.length) {
      const edge = edges[edgeIndex]!;
      if (edge.used) break;
      edge.used = true;
      traversed++;
      const next = edge.a === current ? edge.b : edge.a;
      if (next === start) { closed = true; break; }
      curvePoints.push(points[next]!.clone());
      current = next;
      const nextEdge = adjacency[current]!.find((candidate) => !edges[candidate]!.used);
      if (nextEdge === undefined) break;
      edgeIndex = nextEdge;
    }
    return { points: curvePoints, closed, segmentCount: traversed };
  };

  const curves: OpenBrepIntersectionCurve[] = [];
  // Start open paths at endpoints and branch nodes, preserving branch points
  // as explicit curve boundaries rather than choosing an arbitrary continuation.
  for (let vertex = 0; vertex < adjacency.length; vertex++) {
    if (adjacency[vertex]!.length === 2) continue;
    for (const edgeIndex of adjacency[vertex]!) {
      if (!edges[edgeIndex]!.used) curves.push(walk(vertex, edgeIndex));
    }
  }
  // Remaining edges belong to closed loops.
  for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
    if (!edges[edgeIndex]!.used) curves.push(walk(edges[edgeIndex]!.a, edgeIndex));
  }

  return { curves, discardedDegenerateSegments, branchVertices };
}
