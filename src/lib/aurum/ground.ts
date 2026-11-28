import { Reflector } from "three/examples/jsm/objects/Reflector.js";

export interface AurumGroundController {
  mesh: any;
  hdriGround?: any;
  setVisible: (visible: boolean) => void;
  setBakedShadowVisible: (visible: boolean) => void;
  setMaterial: (config: { color?: number; roughness?: number; metalness?: number }) => void;
  setShadowIntensity: (intensity: number) => void;
  setSurfacePreset: (preset: "matte" | "porcelain" | "satin" | "mirror", strength?: number) => void;
  setHdriGroundTexture: (texture:any) => void;
  setHdriGroundEnabled: (enabled:boolean) => void;
  updateFromPreset: (preset: any) => void;
  positionUnderModel: (box: any) => void;
  positionBakedShadow: (box:any) => void;
  dispose: () => void;
}

export function createAurumGround(THREE: any, scene: any): AurumGroundController {
  // Seamless studio floor: on the standard white presentation backdrop the
  // finite plane must not reveal a hard polygon edge. Reflection presets can
  // explicitly restore their authored floor appearance below.
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 1,
    transparent: true,
    opacity: .06,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -.02;
  mesh.renderOrder = -1;
  mesh.receiveShadow = true;
  scene.add(mesh);

  let hdriGround:any = null;
  let mirrorSurface:any = null;
  const textureLoader = new THREE.TextureLoader();
  const porcelainBaseColor = textureLoader.load('/aurum/textures/ground/porcelain/porcelanato_basecolor.png');
  const porcelainRoughness = textureLoader.load('/aurum/textures/ground/porcelain/porcelanato_roughness.png');
  const porcelainNormal = textureLoader.load('/aurum/textures/ground/porcelain/porcelanato_normal.png');
  porcelainBaseColor.colorSpace = THREE.SRGBColorSpace;
  porcelainRoughness.colorSpace = THREE.NoColorSpace;
  porcelainNormal.colorSpace = THREE.NoColorSpace;
  for (const texture of [porcelainBaseColor, porcelainRoughness, porcelainNormal]) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    texture.anisotropy = 8;
  }
  let mirrorStrength = 0.72;
  const removeMirror = () => { if (!mirrorSurface) return; scene.remove(mirrorSurface); mirrorSurface.geometry?.dispose?.(); mirrorSurface.material?.dispose?.(); mirrorSurface = null; };
  const createMirror = () => { removeMirror(); mirrorSurface = new Reflector(new THREE.PlaneGeometry(40,40), {clipBias:0.003, textureWidth:1024, textureHeight:1024, color:new THREE.Color(Math.round(255*mirrorStrength)*0x010101)}); mirrorSurface.rotation.x=-Math.PI/2; mirrorSurface.position.y=mesh.position.y+0.001; mirrorSurface.renderOrder=-0.25; mirrorSurface.visible=mesh.visible; scene.add(mirrorSurface); };
  let hdriGroundTexture:any = null;
  let bakedShadowUserVisible = true;
  let bakedShadowPositioned = false;
  let presetGroundVisible = true;
  let presetShadowVisible = false;
  let groundVisibilityOverride: boolean | null = null;
  let hdriGroundEnabled = false;
  const syncGroundVisibility = () => {
    const visible = groundVisibilityOverride ?? presetGroundVisible;
    mesh.visible = visible;
    // Never reveal the procedural shadow until it has been positioned against real model bounds.
    bakedShadow.visible = visible && bakedShadowPositioned && bakedShadowUserVisible && presetShadowVisible;
    // The HDRI studio floor is a separate mesh; keep it under the same user toggle.
    if (hdriGround) hdriGround.visible = visible;
    if (mirrorSurface) mirrorSurface.visible = visible;
  };
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
  const bakedShadowMaterial = new THREE.MeshBasicMaterial({map:bakedShadowTexture,color:0x000000,transparent:true,opacity:.26,depthWrite:false,depthTest:true,toneMapped:false});
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
    syncGroundVisibility();
  };

  return {
    mesh,
    get hdriGround() { return hdriGround; },
    setVisible(visible) {
      groundVisibilityOverride = visible;
      syncGroundVisibility();
    },
    setBakedShadowVisible(visible) {
      bakedShadowUserVisible = visible;
      syncGroundVisibility();
    },
    setMaterial(config) {
      if (config.color !== undefined) mesh.material.color.setHex(config.color);
      if (config.roughness !== undefined) mesh.material.roughness = Math.max(0, Math.min(1, config.roughness));
      if (config.metalness !== undefined) mesh.material.metalness = Math.max(0, Math.min(1, config.metalness));
      mesh.material.needsUpdate = true;
    },
    setSurfacePreset(preset, strength = 0.72) {
      mirrorStrength = Math.max(0, Math.min(1, Number(strength) || 0));
      removeMirror();
      mesh.material.map = null;
      mesh.material.roughnessMap = null;
      mesh.material.normalMap = null;
      mesh.material.normalScale?.set?.(1, 1);
      mesh.material.transparent = false;
      mesh.material.opacity = 1;
      mesh.material.depthWrite = true;
      if (preset === "mirror") {
        mesh.material.color.setHex(0xffffff);
        mesh.material.roughness = 0;
        mesh.material.metalness = 0;
        createMirror();
      } else if (preset === "porcelain") {
        mesh.material.color.setHex(0xffffff);
        mesh.material.map = porcelainBaseColor;
        mesh.material.roughnessMap = porcelainRoughness;
        mesh.material.normalMap = porcelainNormal;
        mesh.material.normalScale?.set?.(0.18, 0.18);
        mesh.material.roughness = 0.32;
        mesh.material.metalness = 0;
      } else {
        mesh.material.color.setHex(preset === "satin" ? 0xecebe8 : 0xffffff);
        mesh.material.roughness = preset === "matte" ? 1 : 0.58;
        mesh.material.metalness = 0;
        mesh.material.opacity = preset === "matte" ? 0.06 : 1;
        mesh.material.transparent = preset === "matte";
        mesh.material.depthWrite = preset !== "matte";
      }
      mesh.material.needsUpdate = true;
      syncGroundVisibility();
    },
    setShadowIntensity(intensity) {
      const strength = Math.max(0, Math.min(1, Number(intensity) || 0));
      bakedShadowMaterial.opacity = Math.max(.12, Math.min(.32, .12 + strength * .48));
    },
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
      const sx=Math.max(size.x*1.12,.12), sz=Math.max(size.z*1.12,.12);
      bakedShadow.scale.set(sx,sz,1);
      bakedShadowPositioned = size.x > .001 && size.z > .001;
      syncGroundVisibility();
    },
    updateFromPreset(preset) {
      if (!preset) return;
      presetGroundVisible = preset.groundVisible !== false;
      const reflectionRequested = preset.groundReflection === true;
      mesh.userData.aurumGroundReflectionRequested = reflectionRequested;
      // Match the authored iJewel floor footprint (8 for matte, 10 for reflective).
      const groundSize = Number(preset.groundSize);
      mesh.scale.setScalar(Number.isFinite(groundSize) && groundSize > 0 ? groundSize / 40 : 1);
      const shadowStrength = Number.isFinite(Number(preset.shadowIntensity)) ? Number(preset.shadowIntensity) : .22;
      // Contact shadow remains an independent photographic layer. Non-reflective
      // scenes use a nearly invisible seamless floor instead of a gray polygon.
      bakedShadowMaterial.opacity = Math.max(.12, Math.min(.32, .12 + shadowStrength * .48));
      presetShadowVisible = shadowStrength > .03;
      if (reflectionRequested) {
        mesh.material.color.setHex(preset.ground ?? 0xffffff);
        mesh.material.roughness = preset.groundRoughness ?? .82;
        mesh.material.metalness = preset.groundMetalness ?? 0;
        mesh.material.opacity = .96;
      } else {
        mesh.material.color.setHex(0xffffff);
        mesh.material.roughness = 1;
        mesh.material.metalness = 0;
        mesh.material.opacity = .06;
      }
      mesh.material.needsUpdate = true;
      syncGroundVisibility();
    },
    positionUnderModel(box) {
      if (!box) return;
      const size = new THREE.Vector3();
      box.getSize(size);
      mesh.position.y = box.min.y - Math.max(size.y * .035, .015);
      if (mirrorSurface) mirrorSurface.position.y=mesh.position.y+0.001;
    },
    dispose() {
      removeMirror();
      scene.remove(mesh);
      mesh.geometry?.dispose?.();
      mesh.material?.dispose?.();
      porcelainBaseColor.dispose?.();
      porcelainRoughness.dispose?.();
      porcelainNormal.dispose?.();
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
