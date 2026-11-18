import * as THREE from "three";
export interface AurumBroadphasePair { readonly a: number; readonly b: number; readonly fallback: boolean; }
export interface AurumBroadphaseResult { readonly totalPossiblePairs: number; readonly candidatePairs: readonly AurumBroadphasePair[]; readonly prunedPairs: number; readonly fallbackPairs: number; }
function reliable(box: THREE.Box3): boolean { return !box.isEmpty() && [box.min.x,box.min.y,box.min.z,box.max.x,box.max.y,box.max.z].every(Number.isFinite); }
/** Sweep-and-prune conservador en X, con solapamiento Y/Z en espacio mundo. */
export function buildAurumBroadphase(bounds: readonly THREE.Box3[], tolerance: number): AurumBroadphaseResult {
 if (!Number.isFinite(tolerance) || tolerance < 0) throw new Error("AURUM BROADPHASE tolerance must be finite and non-negative.");
 const n=bounds.length,totalPossiblePairs=n*(n-1)/2,valid:Array<{index:number;box:THREE.Box3}>=[],invalid:number[]=[];
 bounds.forEach((box,index)=>{if(reliable(box))valid.push({index,box});else invalid.push(index);});
 valid.sort((a,b)=>a.box.min.x-b.box.min.x||a.index-b.index);
 const pairs=new Map<string,AurumBroadphasePair>();
 for(let i=0;i<valid.length;i++){const a=valid[i]!;for(let j=i+1;j<valid.length;j++){const b=valid[j]!;if(b.box.min.x>a.box.max.x+tolerance)break;
 if(a.box.min.y<=b.box.max.y+tolerance&&a.box.max.y+tolerance>=b.box.min.y&&a.box.min.z<=b.box.max.z+tolerance&&a.box.max.z+tolerance>=b.box.min.z){const x=Math.min(a.index,b.index),y=Math.max(a.index,b.index);pairs.set(x+":"+y,Object.freeze({a:x,b:y,fallback:false}));}}}
 for(const i of invalid)for(let j=0;j<n;j++){if(i===j)continue;const a=Math.min(i,j),b=Math.max(i,j);pairs.set(a+":"+b,Object.freeze({a,b,fallback:true}));}
 const candidatePairs=[...pairs.values()].sort((a,b)=>a.a-b.a||a.b-b.b),fallbackPairs=candidatePairs.filter(p=>p.fallback).length;
 return Object.freeze({totalPossiblePairs,candidatePairs:Object.freeze(candidatePairs),prunedPairs:totalPossiblePairs-candidatePairs.length,fallbackPairs});
}