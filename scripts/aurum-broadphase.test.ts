import { expect, test } from "bun:test";
import * as THREE from "three";
import { buildAurumBroadphase } from "../src/lib/aurum/core/broadphase";

test("sweep-and-prune podas AABB separados y conserva los solapados", () => {
 const boxes=[
  new THREE.Box3(new THREE.Vector3(0,0,0),new THREE.Vector3(1,1,1)),
  new THREE.Box3(new THREE.Vector3(5,0,0),new THREE.Vector3(6,1,1)),
  new THREE.Box3(new THREE.Vector3(.5,.5,.5),new THREE.Vector3(2,2,2)),
 ];
 const r=buildAurumBroadphase(boxes,1e-5);
 expect(r.totalPossiblePairs).toBe(3);
 expect(r.candidatePairs.map(p=>[p.a,p.b])).toEqual([[0,2]]);
 expect(r.prunedPairs).toBe(2);
 expect(r.fallbackPairs).toBe(0);
});

test("límites vacíos se conservan en modo fallback, nunca se podan", () => {
 const valid=new THREE.Box3(new THREE.Vector3(0,0,0),new THREE.Vector3(1,1,1));
 const invalid=new THREE.Box3().makeEmpty();
 const other=new THREE.Box3(new THREE.Vector3(9,9,9),new THREE.Vector3(10,10,10));
 const r=buildAurumBroadphase([valid,invalid,other],0);
 expect(r.candidatePairs.map(p=>[p.a,p.b,p.fallback])).toEqual([[0,1,true],[1,2,true]]);
 expect(r.fallbackPairs).toBe(2);
 expect(r.prunedPairs).toBe(1);
});

test("broadphase valida tolerancia", () => {
 expect(()=>buildAurumBroadphase([],Number.NaN)).toThrow();
});
