import assert from "node:assert/strict";
import * as THREE from "three";
import { createServer } from "vite";

const server = await createServer({
  configFile: "vite.config.ts",
  logLevel: "error",
  server: { middlewareMode: true },
  appType: "custom",
});

try {
  const { trimOpenBrepSurfacesAgainstSolids } = await server.ssrLoadModule(
    "/src/lib/geometry/open-brep-solid-trim.ts",
  );

  const root = new THREE.Group();
  const metal = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });

  // Closed 2×2×2 solid centered at the origin.
  const solidGeometry = new THREE.BoxGeometry(2, 2, 2);
  const solid = new THREE.Mesh(solidGeometry, metal);
  solid.name = "DIAGNOSTIC · Cubo cerrado";
  solid.userData = {
    aurumRhinoGeometryType: "brep",
    aurumRhino: { categoria: "metal", layerKey: "diagnostic-solid" },
  };
  root.add(solid);

  // Open 6×6 sheet crossing the cube through its center.
  const openGeometry = new THREE.PlaneGeometry(6, 6, 12, 12);
  const open = new THREE.Mesh(openGeometry, metal);
  open.name = "DIAGNOSTIC · Superficie abierta";
  open.userData = {
    aurumRhinoGeometryType: "surface",
    aurumRhino: { categoria: "metal", layerKey: "diagnostic-sheet" },
  };
  root.add(open);
  root.updateMatrixWorld(true);

  const originalPositionCount = open.geometry.getAttribute("position").count;
  const originalSolidGeometry = solid.geometry;
  const result = trimOpenBrepSurfacesAgainstSolids(root);

  const replacement = root.children.find(
    (object) => object.userData?.aurumOpenBrepTrimmed === true,
  );
  assert.ok(replacement?.isMesh, "Debe generarse una superficie recortada.");
  assert.equal(result.trimmedSurfaces, 1, "Debe recortarse exactamente una superficie.");
  assert.ok(result.removedTriangles > 0, "Debe eliminarse geometría interior.");
  assert.ok(result.retainedTriangles > 0, "Deben conservarse los fragmentos exteriores.");
  assert.equal(open.visible, false, "La malla fuente debe ocultarse, no destruirse.");
  assert.equal(
    open.geometry.getAttribute("position").count,
    originalPositionCount,
    "La geometría fuente debe permanecer intacta.",
  );
  assert.equal(solid.visible, true, "El sólido debe permanecer visible.");
  assert.equal(solid.geometry, originalSolidGeometry, "La geometría del sólido no debe reemplazarse.");

  const trimmedMesh = replacement;
  trimmedMesh.updateMatrixWorld(true);
  const trimmedGeometry = trimmedMesh.geometry;
  const position = trimmedGeometry.getAttribute("position");
  let area = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i + 2 < position.count; i += 3) {
    a.fromBufferAttribute(position, i);
    b.fromBufferAttribute(position, i + 1);
    c.fromBufferAttribute(position, i + 2);
    const center = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    assert.ok(
      !(Math.abs(center.x) < 1 - 1e-5 && Math.abs(center.y) < 1 - 1e-5),
      "No debe quedar ningún triángulo cuyo centro esté dentro del cubo.",
    );
    area += b.clone().sub(a).cross(c.clone().sub(a)).length() * 0.5;
  }

  // Original sheet area is 36; the 2×2 portion inside the cube (area 4) is removed.
  assert.ok(
    Math.abs(area - 32) < 0.05,
    `El área exterior conservada debe ser 32; se obtuvo ${area.toFixed(4)}.`,
  );

  const bounds = new THREE.Box3().setFromObject(trimmedMesh);
  assert.ok(bounds.min.x < -2.99 && bounds.max.x > 2.99, "Deben sobrevivir ambos extremos exteriores.");
  assert.ok(bounds.min.y < -2.99 && bounds.max.y > 2.99, "Deben sobrevivir los extremos exteriores en Y.");

  console.log(
    JSON.stringify(
      {
        passed: true,
        testedPairs: result.testedPairs,
        trimmedSurfaces: result.trimmedSurfaces,
        removedTriangles: result.removedTriangles,
        retainedTriangles: result.retainedTriangles,
        retainedArea: Number(area.toFixed(4)),
        expectedArea: 32,
        solidPreserved: true,
        sourcePreserved: true,
      },
      null,
      2,
    ),
  );
} finally {
  await server.close();
}
