import { expect, test } from "bun:test";
import * as THREE from "three";
import { createAurumObjectSelectionModule } from "../src/lib/aurum/core/object-selection-module";

function createClickEvent(canvas: HTMLCanvasElement, x = 50, y = 50): MouseEvent {
  const event = new MouseEvent("click", { clientX: x, clientY: y });
  Object.defineProperty(event, "currentTarget", { configurable: true, value: canvas });
  return event;
}

test("AURUM OBJECT SELECTION returns the nearest visible mesh under the pointer", () => {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  const model = new THREE.Group();
  const back = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  back.position.z = -1;
  const front = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  model.add(back, front);
  const canvas = document.createElement("canvas");
  canvas.width = 100;
  canvas.height = 100;
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
  const selected: THREE.Object3D[] = [];
  const module = createAurumObjectSelectionModule({
    camera,
    getModel: () => model,
    onSelect: object => selected.push(object),
  });

  module.handleClick(createClickEvent(canvas));
  expect(selected).toHaveLength(1);
  expect(selected[0]).toBe(front);
  expect(module.id).toBe("aurum.object-selection");
  expect(Object.isFrozen(module)).toBe(true);
  module.dispose();
  module.handleClick(createClickEvent(canvas));
  expect(selected).toHaveLength(1);
  back.geometry.dispose();
  front.geometry.dispose();
  (back.material as THREE.Material).dispose();
  (front.material as THREE.Material).dispose();
});

test("AURUM OBJECT SELECTION ignores hidden and internal inclusion meshes", () => {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  const model = new THREE.Group();
  const hidden = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  hidden.visible = false;
  const inclusion = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  inclusion.userData.aurumInternalInclusion = true;
  model.add(hidden, inclusion);
  const canvas = document.createElement("canvas");
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
  let missed = 0;
  const module = createAurumObjectSelectionModule({ camera, getModel: () => model, onSelect: () => { throw new Error("Unexpected selection"); }, onMiss: () => { missed += 1; } });
  module.handleClick(createClickEvent(canvas));
  expect(missed).toBe(1);
  hidden.geometry.dispose();
  inclusion.geometry.dispose();
  (hidden.material as THREE.Material).dispose();
  (inclusion.material as THREE.Material).dispose();
});
