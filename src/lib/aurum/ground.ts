export interface AurumGroundController {
  mesh: any;
  setVisible: (visible: boolean) => void;
  updateFromPreset: (preset: any) => void;
  positionUnderModel: (box: any) => void;
  dispose: () => void;
}

export function createAurumGround(THREE: any, scene: any): AurumGroundController {
  const material = new THREE.MeshStandardMaterial({
    color: 0xc9c7c2, metalness: .02, roughness: .4
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -.02;
  mesh.renderOrder = -1;
  mesh.receiveShadow = true;
  scene.add(mesh);

  return {
    mesh,
    setVisible(visible) { mesh.visible = visible; },
    updateFromPreset(preset) {
      if (!preset) return;
      mesh.visible = preset.groundVisible !== false;
      if (preset.ground != null) mesh.material.color.setHex(preset.ground);
      if (preset.groundRoughness != null) mesh.material.roughness = preset.groundRoughness;
      if (preset.groundMetalness != null) mesh.material.metalness = preset.groundMetalness;
    },
    positionUnderModel(box) {
      if (!box) return;
      const size = new THREE.Vector3();
      box.getSize(size);
      mesh.position.y = box.min.y - Math.max(size.y * .035, .015);
    },
    dispose() {
      scene.remove(mesh);
      mesh.geometry?.dispose?.();
      mesh.material?.dispose?.();
    }
  };
}
