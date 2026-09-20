export interface AurumGroundController {
  mesh: any;
  hdriGround?: any;
  setVisible: (visible: boolean) => void;
  setHdriGroundTexture: (texture:any) => void;
  setHdriGroundEnabled: (enabled:boolean) => void;
  updateFromPreset: (preset: any) => void;
  positionUnderModel: (box: any) => void;
  positionBakedShadow: (box:any) => void;
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
  const shadowSize=128;
  const shadowData=new Uint8Array(shadowSize*shadowSize*4);
  for(let sy=0;sy<shadowSize;sy++) for(let sx=0;sx<shadowSize;sx++){
    const dx=(sx/(shadowSize-1))*.5-.25, dy=(sy/(shadowSize-1))-.5;
    const radial=Math.max(0,1-Math.sqrt((dx/.25)*(dx/.25)+(dy/.5)*(dy/.5)));
    const alpha=Math.pow(radial,1.8)*255;
    const i=(sy*shadowSize+sx)*4; shadowData[i]=0; shadowData[i+1]=0; shadowData[i+2]=0; shadowData[i+3]=Math.round(alpha);
  }
  const bakedShadowTexture=new THREE.DataTexture(shadowData,shadowSize,shadowSize,THREE.RGBAFormat,THREE.UnsignedByteType);
  bakedShadowTexture.colorSpace=THREE.NoColorSpace; bakedShadowTexture.minFilter=THREE.LinearFilter; bakedShadowTexture.magFilter=THREE.LinearFilter; bakedShadowTexture.needsUpdate=true;
  const bakedShadowMaterial = new THREE.MeshBasicMaterial({map:bakedShadowTexture,color:0x000000,transparent:true,opacity:.22,depthWrite:false,depthTest:true});
  const bakedShadow = new THREE.Mesh(new THREE.PlaneGeometry(1,1),bakedShadowMaterial);
  bakedShadow.rotation.x = -Math.PI / 2;
  bakedShadow.renderOrder = -0.5;
  bakedShadow.visible = false;
  scene.add(bakedShadow);

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
    positionBakedShadow(box) {
      if (!box) return;
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);
      bakedShadow.position.set(center.x, mesh.position.y + .002, center.z);
      const sx=Math.max(size.x*1.45,.12), sz=Math.max(size.z*1.45,.12);
      bakedShadow.scale.set(sx,sz,1);
      bakedShadow.visible = mesh.visible && size.x > .001 && size.z > .001;
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
      scene.remove(bakedShadow);
      bakedShadow.geometry?.dispose?.();
      bakedShadow.material?.dispose?.();
      bakedShadowTexture.dispose?.();
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
