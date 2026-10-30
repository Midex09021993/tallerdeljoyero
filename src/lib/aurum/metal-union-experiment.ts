import * as THREE from "three";
import { ADDITION, Brush, Evaluator } from "three-bvh-csg";

type MeshFamily = "metal" | "gema" | "otro";

function getFamily(mesh: THREE.Mesh): MeshFamily {
  const data = (mesh.userData?.aurumRhino ?? {}) as Record<string, unknown>;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const text = [
    mesh.name, data.capa, mesh.userData?.attributes?.layerName,
    ...materials.map((material) => (material as THREE.Material | undefined)?.name),
  ].map((value) => String(value ?? "")).join(" ").toLowerCase();
  if (data.categoria === "gema" || /(gem|gema|piedra|diamond|diamante|sapphire|zafiro|ruby|rub[ií]|esmeralda|emerald|moissanite|moissanita)/.test(text)) return "gema";
  if (data.categoria === "metal" || /(metal|oro|gold|plata|silver|platino|platinum|steel|acero)/.test(text)) return "metal";
  return "otro";
}

function compatibleAttributes(a: THREE.BufferGeometry, b: THREE.BufferGeometry): boolean {
  const aNames = Object.keys(a.attributes).sort();
  const bNames = Object.keys(b.attributes).sort();
  if (aNames.length !== bNames.length || aNames.some((name, i) => name !== bNames[i])) return false;
  return aNames.every((name) => {
    const aa = a.getAttribute(name);
    const bb = b.getAttribute(name);
    return aa.itemSize === bb.itemSize && aa.array.constructor === bb.array.constructor;
  });
}

export type AurumUnionExperimentResult = {
  attempted: number;
  merged: number;
  skipped: number;
  errors: string[];
  preservedSourceMeshes: number;
};

/**
 * Opt-in visual-union prototype. It only processes visible metal siblings that
 * share the same Rhino layer identity and the exact same material instance.
 * CSG receives cloned geometries; original meshes/geometries remain in the
 * scene hidden after a successful result, so the experiment can be reversed.
 */
export function applyAurumMetalUnionExperiment(root: THREE.Object3D, maxMerges = 8): AurumUnionExperimentResult {
  const result: AurumUnionExperimentResult = {
    attempted: 0, merged: 0, skipped: 0, errors: [], preservedSourceMeshes: 0,
  };
  const evaluator = new Evaluator();
  const candidates: THREE.Mesh[] = [];
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh && mesh.visible && mesh.geometry && getFamily(mesh) === "metal"
      && !Array.isArray(mesh.material) && mesh.material) candidates.push(mesh);
  });

  for (let i = 0; i < candidates.length && result.merged < maxMerges; i++) {
    const left = candidates[i]!;
    if (!left.parent || !left.visible) continue;
    const leftMeta = (left.userData?.aurumRhino ?? {}) as Record<string, unknown>;
    const leftLayerKey = typeof leftMeta.layerKey === "string" ? leftMeta.layerKey : "";
    if (!leftLayerKey) continue;

    for (let j = i + 1; j < candidates.length && result.merged < maxMerges; j++) {
      const right = candidates[j]!;
      if (!right.parent || left.parent !== right.parent || !right.visible || left.material !== right.material) continue;
      const rightMeta = (right.userData?.aurumRhino ?? {}) as Record<string, unknown>;
      const rightLayerKey = typeof rightMeta.layerKey === "string" ? rightMeta.layerKey : "";
      // Never union across Rhino layers or unidentified source meshes.
      if (!rightLayerKey || rightLayerKey !== leftLayerKey) continue;
      if (!left.geometry || !right.geometry || !compatibleAttributes(left.geometry, right.geometry)) {
        result.skipped++;
        continue;
      }

      root.updateMatrixWorld(true);
      const leftBox = new THREE.Box3().setFromObject(left);
      const rightBox = new THREE.Box3().setFromObject(right);
      if (!leftBox.intersectsBox(rightBox)) continue;
      result.attempted++;

      try {
        // Both source meshes are siblings, so their local matrices are expressed
        // in the same parent coordinate system. Only detached clones enter CSG.
        const leftGeometry = left.geometry.clone();
        const rightGeometry = right.geometry.clone();
        leftGeometry.applyMatrix4(left.matrix);
        rightGeometry.applyMatrix4(right.matrix);
        leftGeometry.clearGroups();
        rightGeometry.clearGroups();
        leftGeometry.setDrawRange(0, Infinity);
        rightGeometry.setDrawRange(0, Infinity);

        const a = new Brush(leftGeometry, left.material);
        const b = new Brush(rightGeometry, right.material);
        a.position.set(0, 0, 0); a.rotation.set(0, 0, 0); a.scale.set(1, 1, 1); a.updateMatrixWorld(true);
        b.position.set(0, 0, 0); b.rotation.set(0, 0, 0); b.scale.set(1, 1, 1); b.updateMatrixWorld(true);

        const evaluated = evaluator.evaluate(a, b, ADDITION);
        const geometry = evaluated.geometry;
        geometry.setDrawRange(0, Infinity);
        geometry.clearGroups();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        const position = geometry.getAttribute("position");
        const normal = geometry.getAttribute("normal");
        if (!position || position.count < 3 || !normal || normal.count !== position.count
          || !geometry.boundingBox || geometry.boundingBox.isEmpty()
          || !Number.isFinite(geometry.boundingSphere?.radius ?? NaN)) {
          geometry.dispose();
          throw new Error("CSG produjo una geometría incompleta o no válida.");
        }

        const parent = left.parent;
        const visualUnion = new THREE.Mesh(geometry, left.material);
        visualUnion.name = `AURUM · Metal visual union ${result.merged + 1}`;
        visualUnion.position.set(0, 0, 0);
        visualUnion.quaternion.identity();
        visualUnion.scale.set(1, 1, 1);
        visualUnion.castShadow = left.castShadow || right.castShadow;
        visualUnion.receiveShadow = left.receiveShadow || right.receiveShadow;
        visualUnion.userData = {
          aurumMetalUnionExperiment: true,
          aurumUnionSource: [
            { uuid: left.uuid, name: left.name, layerKey: leftLayerKey },
            { uuid: right.uuid, name: right.name, layerKey: rightLayerKey },
          ],
          aurumOriginalMeshesPreserved: true,
        };

        // Add the finished replacement before hiding sources. If anything fails
        // before this point, the original render remains untouched.
        parent.add(visualUnion);
        left.visible = false;
        right.visible = false;
        left.userData = { ...left.userData, aurumMetalUnionSourceHidden: true };
        right.userData = { ...right.userData, aurumMetalUnionSourceHidden: true };
        result.merged++;
        result.preservedSourceMeshes += 2;
      } catch (error) {
        result.errors.push(`${left.name || left.uuid} + ${right.name || right.uuid}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  root.updateMatrixWorld(true);
  return result;
}
