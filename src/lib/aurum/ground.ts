export interface AurumGroundController {
  mesh: any;
  hdriGround?: any;
  setVisible: (visible: boolean) => void;
  setHdriGroundTexture: (texture:any) => void;
  setHdriGroundEnabled: (enabled:boolean) => void;
  updateFromPreset: (preset: any) => void;
  positionUnderModel: (box: any) => void;
  dispose: () => void;
}

export function createAurumGround(THREE: any, scene: any): AurumGroundController {
  const material = new THREE.MeshStandardMaterial({
    color: 0xe3e1dd,
    metalness: .02,
    roughness: .82,
    transparent: true,
    opacity: .96,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -.02;
  mesh.renderOrder = -1;
  mesh.receiveShadow = true;
  scene.add(mesh);

  let hdriGround:any = null;
  let hdriGroundTexture:any = null;
  let hdriGroundEnabled = false;

  const updateHdriGround = () => {
    if (hdriGround) {
      scene.remove(hdriGround);
      hdriGround.geometry?.dispose?.();
      hdriGround.material?.dispose?.();
      hdriGround = null;
    }
    if (!hdriGroundEnabled || !hdriGroundTexture) return;
    const radius = 20;
    const geometry = new THREE.SphereGeometry(radius, 64, 32, 0, Math.PI * 2, 0, Math.PI * .5);
    const materialHdri = new THREE.MeshBasicMaterial({
      map: hdriGroundTexture,
      side: THREE.BackSide,
      transparent: true,
      opacity: .9,
      depthWrite: false
    });
    hdriGround = new THREE.Mesh(geometry, materialHdri);
    hdriGround.rotation.x = Math.PI;
    hdriGround.renderOrder = -10;
    scene.add(hdriGround);
  };

  return {
    mesh,
    get hdriGround() { return hdriGround; },
    setVisible(visible) { mesh.visible = visible; },
    setHdriGroundTexture(texture) {
      hdriGroundTexture = texture;
      updateHdriGround();
    },
    setHdriGroundEnabled(enabled) {
      hdriGroundEnabled = enabled;
      updateHdriGround();
    },
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
      if (hdriGround) {
        scene.remove(hdriGround);
        hdriGround.geometry?.dispose?.();
        hdriGround.material?.dispose?.();
        hdriGround = null;
      }
      hdriGroundTexture?.dispose?.();
      hdriGroundTexture = null;
    }
  };
}
