import { expect, test } from "bun:test";
import * as THREE from "three";
import { createAurumMaterialEquivalenceChecker } from "../src/lib/aurum/metal-union-experiment";

test("Metal Union compares equivalent materials and ignores generated UUIDs", () => {
  const first = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 1, roughness: 0.24 });
  const second = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 1, roughness: 0.24 });
  const different = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 1, roughness: 0.42 });
  const equivalent = createAurumMaterialEquivalenceChecker();

  expect(equivalent(first, second)).toBe(true);
  expect(equivalent(first, different)).toBe(false);

  first.dispose();
  second.dispose();
  different.dispose();
});

test("Metal Union serializes each material at most once during one comparison pass", () => {
  const first = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 1, roughness: 0.24 });
  const second = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 1, roughness: 0.24 });
  const firstToJSON = first.toJSON.bind(first);
  const secondToJSON = second.toJSON.bind(second);
  let firstCalls = 0;
  let secondCalls = 0;
  first.toJSON = () => { firstCalls++; return firstToJSON(); };
  second.toJSON = () => { secondCalls++; return secondToJSON(); };
  const equivalent = createAurumMaterialEquivalenceChecker();

  expect(equivalent(first, second)).toBe(true);
  expect(equivalent(first, second)).toBe(true);
  expect(equivalent(first, second)).toBe(true);
  expect(firstCalls).toBe(1);
  expect(secondCalls).toBe(1);

  first.dispose();
  second.dispose();
});

test("Metal Union refreshes material fingerprints for a later pass", () => {
  const first = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 1, roughness: 0.24 });
  const second = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 1, roughness: 0.24 });

  const firstPass = createAurumMaterialEquivalenceChecker();
  expect(firstPass(first, second)).toBe(true);

  second.roughness = 0.7;
  const nextPass = createAurumMaterialEquivalenceChecker();
  expect(nextPass(first, second)).toBe(false);

  first.dispose();
  second.dispose();
});
