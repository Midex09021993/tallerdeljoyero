import { expect, test } from "bun:test";
import * as THREE from "three";
import { consolidateAurumMetalMaterialsByLayer } from "../src/lib/aurum/model-loader";

function addMesh(root: THREE.Group, material: THREE.Material, category: "metal" | "gema", layerKey: string) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.userData.aurumRhino = { categoria: category, layerKey };
  root.add(mesh);
  return mesh;
}

test("consolidates optically identical metals across Rhino layers", () => {
  const root = new THREE.Group();
  const firstMaterial = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 });
  firstMaterial.name = "Yellow Gold-18k";
  const equivalentMaterial = firstMaterial.clone();
  equivalentMaterial.name = firstMaterial.name;
  const differentMaterial = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.35 });
  differentMaterial.name = firstMaterial.name;

  const first = addMesh(root, firstMaterial, "metal", "layer:band");
  const equivalent = addMesh(root, equivalentMaterial, "metal", "layer:bezel");
  const different = addMesh(root, differentMaterial, "metal", "layer:shank");
  const audit = consolidateAurumMetalMaterialsByLayer(root);

  expect(equivalent.material).toBe(first.material);
  expect(different.material).not.toBe(first.material);
  expect(audit.metalMeshes).toBe(3);
  expect(audit.distinctLayerKeys).toBe(3);
  expect(audit.materialInstancesBefore).toBe(3);
  expect(audit.materialInstancesAfter).toBe(2);
  expect(audit.consolidatedMaterialReferences).toBe(1);
  expect(audit.skippedWithoutLayerIdentity).toBe(0);

  root.traverse((node) => { if ((node as THREE.Mesh).isMesh) (node as THREE.Mesh).geometry.dispose(); });
});

test("does not consolidate gem materials with metal materials", () => {
  const root = new THREE.Group();
  const metalMaterial = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 });
  const gemMaterial = new THREE.MeshPhysicalMaterial({ color: 0x16a34a, transmission: 0.8, roughness: 0.08 });
  const metal = addMesh(root, metalMaterial, "metal", "layer:metal");
  const gem = addMesh(root, gemMaterial, "gema", "layer:gem");
  const audit = consolidateAurumMetalMaterialsByLayer(root);

  expect(metal.material).toBe(metalMaterial);
  expect(gem.material).toBe(gemMaterial);
  expect(audit.metalMeshes).toBe(1);
  expect(audit.materialInstancesAfter).toBe(1);

  root.traverse((node) => { if ((node as THREE.Mesh).isMesh) (node as THREE.Mesh).geometry.dispose(); });
});
