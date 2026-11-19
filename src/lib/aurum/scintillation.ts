import * as THREE from "three";
import type { AurumOpticalProfile } from "../aurum-material-engine";

/**
 * Conservative live-view tuning for brilliant diamonds.
 * These values shape only the diamond shader; they do not alter metal materials,
 * physical IOR, dispersion calibration, BVH geometry, or post-processing cost.
 */
export const AURUM_DIAMOND_LIVE_TUNING = Object.freeze({
  internalContrast: 1.04,
  highlightShoulder: 0.85,
  faceBrightness: 1.00,
  rimEnergy: 0.025,
  fireMax: 0.065,
});

/**
 * Dynamic scintillation + runtime gemstone optics for AURUM.
 *
 * The gemstone continues to use Three.js MeshPhysicalMaterial for the actual
 * IOR, transmission, thickness, framebuffer refraction and dispersion. This
 * layer only modulates dispersion at runtime from the real facet/view angle,
 * so the spectral separation follows the optical geometry instead of using an
 * artificial RGB sparkle overlay.
 */
export const applyAurumDynamicScintillation=(material:any,profile:AurumOpticalProfile)=>{
  if(!material) return material;

  const family=String(material.userData?.aurumGemFamily??"");
  const isDiamond=family.trim().toLowerCase()==="diamante";
  const brilliance=Math.max(0,Math.min(1.2,Number(profile.brilliance??.75)));
  const facetContrast=Math.max(0,Math.min(1.2,Number(profile.facetContrast??.9)));
  const baseDispersion=Math.max(0,Number(profile.dispersion??material.dispersion??0));

  // Diamonds and moissanite naturally show stronger spectral separation;
  // colored stones stay deliberately restrained so body color remains dominant.
  const familyDispersionScale=isDiamond
    ? 0.88
    : family==="Moissanita"
      ? 1.00
      : family==="Esmeralda"
        ? .72
        : family==="Rubí"
          ? .78
          : family==="Zafiro"
            ? .76
            : .80;

  const strength=isDiamond
    ? .16*brilliance
    : family==="Moissanita"
      ? .20*brilliance
      : .045*brilliance;
  const contrastStrength=(isDiamond ? .88 : .075)*facetContrast;
  const colorChange:any=(profile as any).colorChange;
  const oilDrop:any=(profile as any).oilDrop;
  const oilDropEnabled=Boolean(oilDrop?.enabled);
  const colorChangeEnabled=Boolean(colorChange?.enabled);
  const pleochroism:any=(profile as any).pleochroism;
  const pleochroismEnabled=Boolean(pleochroism?.enabled);
  const pleochroismStrength=Math.max(0,Math.min(.65,Number(pleochroism?.strength??0)));
  const pleochroismThirdStrength=Math.max(0,Math.min(.20,Number(pleochroism?.thirdAxisStrength??0)));
  const fluorescence:any=(profile as any).fluorescence;
  const fluorescenceEnabled=Boolean(fluorescence?.enabled);
  const fluorescenceStrength=Math.max(0,Math.min(1,Number(fluorescence?.strength??0)));
  const phenomenon:any=(profile as any).phenomenon;
  const physicalModel:any=(profile as any).crystal ? {crystal:(profile as any).crystal,structure:(profile as any).structure} : material.userData?.aurumGemPhysicalModel;
  const phenomenonEnabled=Boolean(phenomenon?.enabled);
  const phenomenonType=String(phenomenon?.type??"");
  const phenomenonStrength=Math.max(0,Math.min(1,Number(phenomenon?.strength??0)));
  const pleoBlue=new THREE.Color(0x315fd0);
  const pleoThirdKey=String(pleochroism?.axisC??"");
  const pleoViolet=pleoThirdKey==="deepGreen" ? new THREE.Color(0x3f8f75)
    : pleoThirdKey==="deepRose" ? new THREE.Color(0xc56a9a)
    : pleoThirdKey==="deepBlue" ? new THREE.Color(0x3f79a8)
    : pleoThirdKey==="palePink" ? new THREE.Color(0xc9829f)
    : pleoThirdKey==="golden" ? new THREE.Color(0xe4c15d)
    : pleoThirdKey==="salmon" ? new THREE.Color(0xf0a080)
    : pleoThirdKey==="pink" ? new THREE.Color(0xe06a9a)
    : new THREE.Color(0x7650c8);
  const pleoThird=pleoThirdKey==="yellowGreen"
    ? new THREE.Color(0x7d8b4a)
    : pleoThirdKey==="deepGreen"
      ? new THREE.Color(0x0e4d2f)
      : pleoThirdKey==="deepRose"
        ? new THREE.Color(0x8e294f)
        : pleoThirdKey==="deepBlue"
          ? new THREE.Color(0x164b70)
          : pleoThirdKey==="palePink"
            ? new THREE.Color(0xf0c4cf)
            : pleoThirdKey==="golden"
              ? new THREE.Color(0xd2a83e)
              : pleoThirdKey==="salmon"
                ? new THREE.Color(0xe69a7c)
                : new THREE.Color(0xd7799b);

  const ijewel=material.userData?.aurumIJEWELParameters ?? {};
  // Controlled diamond A/B laboratory. It is read once when the material
  // shader is prepared; the normal production path has no extra per-frame work.
  const diamondTestMode=isDiamond && typeof window!=="undefined"
    ? (new URLSearchParams(window.location.search).get("aurumDiamondTest") ?? "source")
    : "source";
  const diamondTestProfiles:Record<string,{label:string;ior:number;dispersion:number;rayBounces:number}>={
    b:{label:"iJewel reference · physical IOR",ior:2.417,dispersion:0.01,rayBounces:5},
    c:{label:"Higher dispersion · physical IOR",ior:2.417,dispersion:0.02,rayBounces:5},
    d:{label:"iJewel source IOR experiment",ior:2.6,dispersion:0.01,rayBounces:5},
  };
  const diamondTestProfile=diamondTestMode ? diamondTestProfiles[diamondTestMode] : undefined;
  // A explicitly restores the unmodified AURUM shader. B-D enable the
  // iJewel-inspired environment-ray approximation with isolated parameters.
  const ijewelEnabled=isDiamond && diamondTestMode!=="a"
    && (Boolean(material.userData?.aurumIJEWELActive) || Boolean(diamondTestProfile));
  const effectiveIewel=diamondTestProfile ?? {
    label:"Source material defaults",
    ior:Number(ijewel?.refractiveIndex??2.417),
    dispersion:Number(ijewel?.dispersion??baseDispersion),
    rayBounces:Number(ijewel?.rayBounces??5),
  };
  const ijewelDispersionScale=Math.max(0,Math.min(4,effectiveIewel.dispersion/0.01));
  const gemCompareEnabled=typeof window!=="undefined"
    && new URLSearchParams(window.location.search).get("aurumGemCompare")==="1";
  if((diamondTestMode && ["a","b","c","d"].includes(diamondTestMode)) || gemCompareEnabled){
    const diagnosticKey=`aurumGemCompareLogged:${family}:${String(material.uuid??material.id??"material")}`;
    const alreadyLogged=Boolean(material.userData?.[diagnosticKey]);
    if(!alreadyLogged){
      material.userData={...(material.userData??{}),[diagnosticKey]:true};
      console.info("[AURUM][GEM_COMPARISON]",{
        family,
        presetId:material.userData?.aurumGemPresetId??material.userData?.aurumGemId??material.userData?.aurumDiamondPresetId??null,
        shaderTestMode:diamondTestMode??"production",
        shaderTestLabel:diamondTestProfile?.label??"AURUM production baseline",
        physicalMaterial:{
          ior:Number(material.ior??0),
          transmission:Number(material.transmission??0),
          dispersion:Number(material.dispersion??0),
          roughness:Number(material.roughness??0),
          iridescence:Number(material.iridescence??0),
          envMapIntensity:Number(material.envMapIntensity??0),
          hasGemEnvironment:Boolean(material.envMap),
        },
        opticalProfile:{
          ior:Number(profile.ior??material.ior??0),
          transmission:Number(profile.transmission??material.transmission??0),
          dispersion:baseDispersion,
          brilliance,
          facetContrast,
          fire:Number(profile.fire??0),
        },
        iJewelApproximation:{
          enabled:ijewelEnabled,
          refractiveIndex:diamondTestProfile?.ior??Number(ijewel?.refractiveIndex??2.417),
          dispersion:diamondTestProfile?.dispersion??Number(ijewel?.dispersion??baseDispersion),
          rayBounces:diamondTestProfile?.rayBounces??Number(ijewel?.rayBounces??5),
        },
        gemEnvironment:material.userData?.aurumGemEnvironmentIntensity??null,
        note:"Lectura diagnóstica del material realmente aplicado; no modifica geometría, BVH, cámara ni presets guardados.",
      });
    }
  }
  // Reduce the experimental virtual-facet energy for standard diamond profiles
  // to stabilize small stones during orbit. Keep the blue-diamond profile unchanged.
  const diamondPresetId=String(
    material.userData?.aurumDiamondPresetId ??
    material.userData?.aurumDiamondMaterial?.presetId ??
    ijewel?.presetId ??
    ""
  ).toLocaleLowerCase();
  const isBlueDiamondProfile=diamondPresetId.includes("diamante_azul")
    || diamondPresetId.includes("blue_diamond")
    || diamondPresetId==="azul";
  const virtualFacetWeight=isBlueDiamondProfile?0.10:0.06;
  material.userData={
    ...(material.userData??{}),
    aurumDynamicScintillation:{
      family,
      strength,
      contrastStrength,
      mode:"physical-facet-contrast",
    },
    aurumRuntimeGemOptics:{
      mode:"facet-angle-dispersion",
      familyDispersionScale,
      baseDispersion,
      version:"v1",
    },
  };

  // Three.js caches compiled shader programs. The iJewel-inspired block is
  // emitted conditionally, so the cache key must distinguish an activated
  // diamond from the ordinary physical-gem shader; otherwise a cached program
  // can make the dedicated optics appear inactive or inconsistent.
  const priorProgramCacheKey=typeof material.customProgramCacheKey==="function"
    ? material.customProgramCacheKey.bind(material)
    : ()=>"";
  material.customProgramCacheKey=()=>[
    priorProgramCacheKey(),
    "aurum-dynamic-scintillation-v1",
    family,
    ijewelEnabled?"ijewel-diamond-active":"physical-gem-only",
    diamondTestMode??"no-diamond-ab-test",
    diamondTestProfile?.ior??"source-ior",
    diamondTestProfile?.dispersion??"source-dispersion",
    diamondTestProfile?.rayBounces??"source-bounces",
    oilDropEnabled?"oil-drop":"no-oil-drop",
    colorChangeEnabled?"color-change":"no-color-change",
    phenomenonEnabled?"phenomenon":"no-phenomenon",
    pleochroismEnabled?"pleochroism":"no-pleochroism",
  ].join("|");

  material.onBeforeCompile=(shader:any)=>{
    shader.uniforms.aurumScintillationStrength={value:strength};
    shader.uniforms.aurumScintillationContrast={value:contrastStrength};
    const compileTimeSourceDispersion=Number(material.userData?.aurumIJEWELParameters?.dispersion??baseDispersion);
    shader.uniforms.aurumRuntimeDispersion={value:(diamondTestProfile?.dispersion??compileTimeSourceDispersion)*familyDispersionScale};
    shader.uniforms.aurumDiamondMicroVirtualFacetWeight={value:virtualFacetWeight};
    shader.uniforms.aurumDiamondMicroFireScale={value:1};
    material.userData={...(material.userData??{}),aurumDiamondMicroUniforms:{
      scintillationStrength:shader.uniforms.aurumScintillationStrength,
      baseScintillationStrength:strength,
      facetContrast:shader.uniforms.aurumScintillationContrast,
      baseFacetContrast:contrastStrength,
      dispersion:shader.uniforms.aurumRuntimeDispersion,
      iJewelDispersionScale:shader.uniforms.aurumIJEWELDispersionScale,
      baseDispersion:(diamondTestProfile?.dispersion??baseDispersion)*familyDispersionScale,
      virtualFacetWeight:shader.uniforms.aurumDiamondMicroVirtualFacetWeight,
      baseVirtualFacetWeight:virtualFacetWeight,
      fireScale:shader.uniforms.aurumDiamondMicroFireScale,
    }};
    shader.uniforms.aurumGemEnvironmentIntensity={value:Math.max(.55,Math.min(2.35,Number(material.envMapIntensity??1)))};
    shader.uniforms.aurumDiamondCatalogTint={value:material.color?.clone?.()??new THREE.Color(0xffffff)};
    material.userData={...(material.userData??{}),aurumGemEnvironmentUniforms:shader.uniforms.aurumGemEnvironmentIntensity,aurumDiamondCatalogTintUniform:shader.uniforms.aurumDiamondCatalogTint};
    const gemLightState=material.userData?.aurumGemLightState??{};
    shader.uniforms.aurumGemLightPosition={value:new THREE.Vector3(...(gemLightState.position??[0,0,0]))};
    shader.uniforms.aurumGemLightIntensity={value:gemLightState.enabled?Math.max(0,Number(gemLightState.intensity??0)):0};
    shader.uniforms.aurumGemLightRadius={value:Math.max(.001,Number(gemLightState.radius??1))};
    material.userData={...(material.userData??{}),aurumGemLightUniforms:{
      position:shader.uniforms.aurumGemLightPosition,
      intensity:shader.uniforms.aurumGemLightIntensity,
      radius:shader.uniforms.aurumGemLightRadius,
    }};
    if(ijewelEnabled){
      // Keep the two optical models separate:
      // MeshPhysicalMaterial.ior remains the physical diamond IOR (2.417),
      // while this custom iJewel-inspired environment-ray path consumes the
      // source DiamondMaterial refractiveIndex (2.6) from calibration metadata.
      // This does not change the physical PBR material or claim shader parity.
      shader.uniforms.aurumIJEWELRefractiveIndex={value:Math.max(1.01,Math.min(2.65,Number(effectiveIewel.ior??2.417)))};
      shader.uniforms.aurumIJEWELRayBounces={value:Math.max(1,Math.min(8,Math.floor(Number(effectiveIewel.rayBounces??5))))};
      shader.uniforms.aurumIJEWELDispersionScale={value:Math.max(0,Math.min(4,Number(material.userData?.aurumIJEWELParameters?.dispersion??baseDispersion)/0.01))};
      if(material.userData?.aurumDiamondMicroUniforms){ material.userData.aurumDiamondMicroUniforms.iJewelDispersionScale=shader.uniforms.aurumIJEWELDispersionScale; }
      shader.uniforms.aurumIJEWELReflectivity={value:Number(ijewel.reflectivity??.5)};
      shader.uniforms.aurumIJEWELGeometryFactor={value:Number(ijewel.geometryFactor??.5)};
      shader.uniforms.aurumIJEWELSQUASHFactor={value:Number(ijewel.squashFactor??.98)};
      shader.uniforms.aurumIJEWELAbsorptionFactor={value:Number(ijewel.absorptionFactor??1)};
      shader.uniforms.aurumIJEWELGammaFactor={value:Number(ijewel.gammaFactor??1)};
      shader.uniforms.aurumIJEWELTransmissionParameter={value:Number(ijewel.transmissionParameter??0)};
      shader.uniforms.aurumIJEWELBoostFactors={value:new THREE.Vector3(Number(ijewel.boostFactors?.x??1),Number(ijewel.boostFactors?.y??1),Number(ijewel.boostFactors?.z??1))};
      material.userData={...(material.userData??{}),aurumIJEWELUniforms:{boostFactors:shader.uniforms.aurumIJEWELBoostFactors}};
      // Experimental virtual-facet reflection samples; disabled by metadata for A/B.
      shader.uniforms.aurumIJEWELVirtualFacets={value:ijewel.virtualFacetReflections===true?1:0};
    }
    if(oilDropEnabled){
      shader.uniforms.aurumOilDropStrength={value:Number(oilDrop.strength??.1)};
    }
    if(oilDropEnabled){
      shader.fragmentShader=shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        // Gota de aceite is modeled as soft internal light diffusion tied to
        // viewing direction, not as a painted texture or calcite particles.
        float aurumOilAxis=pow(abs(normalize(vViewPosition).z),2.2);
        float aurumOilSoft=smoothstep(.18,.82,aurumOilAxis)*aurumOilDropStrength;
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*(1.0+aurumOilSoft*.16),aurumOilSoft);
        `
      );
    }
    if(colorChangeEnabled){
      shader.uniforms.aurumColorChangeFluorescent={value:colorChange.fluorescent};
      shader.uniforms.aurumColorChangeIncandescent={value:colorChange.incandescent};
      shader.uniforms.aurumColorChangeStrength={value:Number(colorChange.strength??.5)};
    }
    if(colorChangeEnabled){
      shader.fragmentShader=shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float aurumWarm=clamp(dot(normalize(vViewPosition),vec3(0.0,0.0,-1.0)),0.0,1.0);
        float aurumCool=1.0-aurumWarm;
        vec3 aurumChangeTint=mix(aurumColorChangeIncandescent,aurumColorChangeFluorescent,aurumCool);
        diffuseColor.rgb*=mix(vec3(1.0),aurumChangeTint,aurumColorChangeStrength);
        `
      );
    }
    if(phenomenonEnabled){
      shader.uniforms.aurumFluorescenceColorLW={value:fluorescenceEnabled?fluorescence.lw:new THREE.Color(0,0,0)};
    shader.uniforms.aurumFluorescenceColorSW={value:fluorescenceEnabled?fluorescence.sw:new THREE.Color(0,0,0)};
    shader.uniforms.aurumFluorescenceStrength={value:fluorescenceStrength};
    shader.uniforms.aurumUVMode={value:Number(material.userData?.aurumUVMode??0)};
    shader.uniforms.aurumPhenomenonStrength={value:phenomenonStrength};
      const crystal=physicalModel?.crystal;
      const axisA=Array.isArray(crystal?.axisA)?new THREE.Vector3().fromArray(crystal.axisA):crystal?.axisA?.clone?.()??new THREE.Vector3(1,0,0);
      const axisB=Array.isArray(crystal?.axisB)?new THREE.Vector3().fromArray(crystal.axisB):crystal?.axisB?.clone?.()??new THREE.Vector3(.5,.8660254,0);
      const axisC=Array.isArray(crystal?.axisC)?new THREE.Vector3().fromArray(crystal.axisC):crystal?.axisC?.clone?.()??new THREE.Vector3(-.5,.8660254,0);
      shader.uniforms.aurumPhenomenonAxisA={value:axisA.normalize()};
      shader.uniforms.aurumPhenomenonAxisB={value:axisB.normalize()};
      shader.uniforms.aurumPhenomenonAxisC={value:axisC.normalize()};
      shader.uniforms.aurumPhenomenonScaleNm={value:Number((phenomenon as any).scaleNm??170)};
      shader.uniforms.aurumPhenomenonMode={value:phenomenonType==="chatoyancy"?1:phenomenonType==="asterism"?2:phenomenonType==="adularescence"?3:phenomenonType==="aventurescence"?4:phenomenonType==="labradorescence"?5:phenomenonType==="schiller"?7:phenomenonType==="peristerescence"?8:phenomenonType==="iridescence"?9:phenomenonType==="opalescence"?11:phenomenonType==="overtone"?12:10};
    }
    if(pleochroismEnabled){
      shader.uniforms.aurumPleoBlue={value:pleoBlue};
      shader.uniforms.aurumPleoViolet={value:pleoViolet};
      shader.uniforms.aurumPleoThird={value:pleoThird};
      shader.uniforms.aurumPleoStrength={value:pleochroismStrength};
      shader.uniforms.aurumPleoThirdStrength={value:pleochroismThirdStrength};
    }

    shader.fragmentShader=`
      uniform float aurumScintillationStrength;
      uniform float aurumScintillationContrast;
      uniform float aurumRuntimeDispersion;
      uniform float aurumDiamondMicroVirtualFacetWeight;
      uniform float aurumDiamondMicroFireScale;
      uniform float aurumGemEnvironmentIntensity;
      uniform vec3 aurumDiamondCatalogTint;
      uniform vec3 aurumColorChangeFluorescent;
      uniform vec3 aurumColorChangeIncandescent;
      uniform float aurumColorChangeStrength;
      uniform float aurumOilDropStrength;
      uniform vec3 aurumPleoBlue;
      uniform vec3 aurumPleoViolet;
      uniform vec3 aurumPleoThird;
      uniform float aurumPleoStrength;
      uniform float aurumPleoThirdStrength;
      uniform vec3 aurumFluorescenceColorLW;
      uniform vec3 aurumFluorescenceColorSW;
      uniform float aurumFluorescenceStrength;
      uniform float aurumUVMode;
      uniform float aurumPhenomenonStrength;
      uniform float aurumPhenomenonMode;
      uniform float aurumIJEWELRefractiveIndex;
      uniform float aurumIJEWELRayBounces;
      uniform float aurumIJEWELDispersionScale;
      uniform float aurumIJEWELReflectivity;
      uniform float aurumIJEWELGeometryFactor;
      uniform float aurumIJEWELSQUASHFactor;
      uniform float aurumIJEWELAbsorptionFactor;
      uniform float aurumIJEWELGammaFactor;
      uniform float aurumIJEWELTransmissionParameter;
      uniform vec3 aurumIJEWELBoostFactors;
      uniform float aurumIJEWELVirtualFacets;
      uniform vec3 aurumPhenomenonAxisA;
      uniform vec3 aurumPhenomenonAxisB;
      uniform vec3 aurumPhenomenonAxisC;
      uniform float aurumPhenomenonScaleNm;
    `+shader.fragmentShader;
    if(pleochroismEnabled){
      shader.vertexShader=`
        varying vec3 vAurumLocalViewDir;
      `+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>\n        vec3 aurumWorldToLocal= cameraPosition-modelMatrix[3].xyz;\n        mat3 aurumModel3=mat3(modelMatrix);\n        vAurumLocalViewDir=normalize(vec3(dot(aurumWorldToLocal,aurumModel3[0]),dot(aurumWorldToLocal,aurumModel3[1]),dot(aurumWorldToLocal,aurumModel3[2])));`
      );
      shader.fragmentShader=shader.fragmentShader.replace(
        "#include <common>",
        `varying vec3 vAurumLocalViewDir;\n#include <common>`
      );
      shader.fragmentShader=shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        vec3 aurumPleoDir=normalize(vAurumLocalViewDir);
        vec3 aurumPleoW=pow(abs(aurumPleoDir),vec3(2.0));
        aurumPleoW/=max(dot(aurumPleoW,vec3(1.0)),0.0001);
        vec3 aurumPleoTint=aurumPleoW.x*aurumPleoBlue+aurumPleoW.y*aurumPleoViolet+aurumPleoW.z*aurumPleoThird;
        float aurumPleoAxis=mix(aurumPleoStrength,aurumPleoThirdStrength,aurumPleoW.z);
        diffuseColor.rgb*=mix(vec3(1.0),aurumPleoTint,aurumPleoAxis);
        `
      );
    }

    // The gem-only studio light is evaluated inside this gemstone shader.
    // This avoids illuminating polished metal with the control intended for stones.
    shader.vertexShader=shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
      varying vec3 vAurumGemWorldPosition;
      varying vec3 vAurumGemWorldNormal;`
    );
    shader.vertexShader=shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vAurumGemWorldPosition=(modelMatrix*vec4(transformed,1.0)).xyz;
      vAurumGemWorldNormal=normalize(mat3(modelMatrix)*objectNormal);`
    );
    shader.fragmentShader=shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
      varying vec3 vAurumGemWorldPosition;
      varying vec3 vAurumGemWorldNormal;
      uniform vec3 aurumGemLightPosition;
      uniform float aurumGemLightIntensity;
      uniform float aurumGemLightRadius;`
    );

    // Three.js already performs physical volume refraction and RGB dispersion
    // inside getIBLVolumeRefraction(). Replace only its dispersion input with
    // a runtime value derived from the current facet/view geometry.
    shader.fragmentShader=shader.fragmentShader.replace(
      "material.dispersion, material.ior, material.thickness,",
      `(
        aurumRuntimeDispersion * mix(0.86, 1.14, pow(1.0 - max(dot(normalize(n), normalize(v)), 0.0), 1.35))
      ), material.ior, material.thickness,`
    );

    // Optical environment samples are linear HDR values. The custom
    // gemstone response must run BEFORE tone mapping and output color-space
    // conversion; running it at dithering_fragment mixed linear HDR with
    // already tone-mapped/sRGB pixels and clipped the diamond's central facets.
    shader.fragmentShader=shader.fragmentShader.replace(
      /#include <(tonemapping_fragment|colorspace_fragment|fog_fragment|premultiplied_alpha_fragment)>/g,
      ""
    );
    shader.fragmentShader=shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `
        #ifdef USE_ENVMAP
        #ifdef ENVMAP_TYPE_CUBE_UV
        // Native iJewel parameter path is conditionally emitted at shader
        // generation time, so non-iJewel gems do not execute it.
${ijewelEnabled ? `\n        // Native iJewel parameter path. This source file emits the block only
        // when the material carries the supplied DiamondMaterial parameters.
        vec3 ijView=normalize(-vViewPosition);
        vec3 ijNormal=normalize(normal);
        float ijEta=1.0/max(aurumIJEWELRefractiveIndex,1.0001);
        // Dispersion approximation based on diamond's wavelength-dependent IOR.
        // Three channel rays share this fragment and sample the existing PMREM;
        // no screen-sized transmission target or extra render pass is created.
        float ijIor=max(aurumIJEWELRefractiveIndex,1.0001);
        // Approximate the visible-band spread around the physical sodium-D
        // IOR (2.417): red ~2.407, green 2.417, blue ~2.451.
        // The previous narrower spread barely produced visible fire in the
        // central stone under a neutral studio environment.
        // Slightly widen visible-band separation for live diamond fire.
        // Keep the change restrained: dispersion is an approximation in this
        // single-pass shader, not wavelength-resolved spectral path tracing.
        float ijDispersionScale=max(aurumIJEWELDispersionScale,0.0);
        float ijEtaR=1.0/max(ijIor-0.010*ijDispersionScale,1.0001);
        float ijEtaG=1.0/ijIor;
        float ijEtaB=1.0/min(ijIor+0.034*ijDispersionScale,2.65);
        // Preserve the last visually working direction while isolating the
        // blank-render regression from the recent view-vector change.
        vec3 ijDirR=refract(ijView,ijNormal,ijEtaR);
        vec3 ijDirG=refract(ijView,ijNormal,ijEtaG);
        vec3 ijDirB=refract(ijView,ijNormal,ijEtaB);
        vec3 ijAccum=vec3(0.0);
        float ijWeight=0.67;
        float ijDepth=1.0;
        // First internal path: sample wavelength-separated rays in the HDRI.
        vec3 ijWorldR=inverseTransformDirection(normalize(ijDirR),viewMatrix);
        vec3 ijWorldG=inverseTransformDirection(normalize(ijDirG),viewMatrix);
        vec3 ijWorldB=inverseTransformDirection(normalize(ijDirB),viewMatrix);
        vec3 ijEnvR=textureCubeUV(envMap,envMapRotation*ijWorldR,0.0).rgb;
        vec3 ijEnvG=textureCubeUV(envMap,envMapRotation*ijWorldG,0.0).rgb;
        vec3 ijEnvB=textureCubeUV(envMap,envMapRotation*ijWorldB,0.0).rgb;
        ijAccum+=vec3(ijEnvR.r,ijEnvG.g,ijEnvB.b)*ijWeight;
        // Approximate a pavilion bounce with a tilted internal-facet normal.
        // Using the entry normal again repeats the same path and produces little
        // facet separation. This tangent-space normal is a real-time approximation,
        // not a claim of geometric multi-bounce tracing.
        vec3 ijPavilionAxis=abs(ijNormal.y)<0.9?vec3(0.0,1.0,0.0):vec3(1.0,0.0,0.0);
        vec3 ijPavilionTangent=normalize(cross(ijNormal,ijPavilionAxis));
        vec3 ijPavilionNormal=normalize(ijNormal*0.75+ijPavilionTangent*0.66);
        ijDirR=reflect(ijDirR,ijPavilionNormal);
        ijDirG=reflect(ijDirG,ijPavilionNormal);
        ijDirB=reflect(ijDirB,ijPavilionNormal);
        ijDirR=normalize(mix(ijDirR,ijNormal,clamp(1.0-aurumIJEWELSQUASHFactor,0.0,.08)));
        ijDirG=normalize(mix(ijDirG,ijNormal,clamp(1.0-aurumIJEWELSQUASHFactor,0.0,.08)));
        ijDirB=normalize(mix(ijDirB,ijNormal,clamp(1.0-aurumIJEWELSQUASHFactor,0.0,.08)));
        ijWorldR=inverseTransformDirection(ijDirR,viewMatrix);
        ijWorldG=inverseTransformDirection(ijDirG,viewMatrix);
        ijWorldB=inverseTransformDirection(ijDirB,viewMatrix);
        ijEnvR=textureCubeUV(envMap,envMapRotation*ijWorldR,0.0).rgb;
        ijEnvG=textureCubeUV(envMap,envMapRotation*ijWorldG,0.0).rgb;
        ijEnvB=textureCubeUV(envMap,envMapRotation*ijWorldB,0.0).rgb;
        ijDepth=exp(-max(aurumIJEWELAbsorptionFactor,0.001)*.12);
        ijAccum+=vec3(ijEnvR.r,ijEnvG.g,ijEnvB.b)*(.46*ijDepth);

        // Optional third environment sample: approximate a second pavilion
        // interaction without claiming geometric multi-bounce ray tracing.
        // Gate it with the source-authored bounce setting and keep its energy
        // restrained so this refinement cannot overwhelm the visible PBR facets.
        if(aurumIJEWELRayBounces>=3.0){
          ijDirR=reflect(ijDirR,ijPavilionNormal);
          ijDirG=reflect(ijDirG,ijPavilionNormal);
          ijDirB=reflect(ijDirB,ijPavilionNormal);
          ijWorldR=inverseTransformDirection(normalize(ijDirR),viewMatrix);
          ijWorldG=inverseTransformDirection(normalize(ijDirG),viewMatrix);
          ijWorldB=inverseTransformDirection(normalize(ijDirB),viewMatrix);
          ijEnvR=textureCubeUV(envMap,envMapRotation*ijWorldR,0.0).rgb;
          ijEnvG=textureCubeUV(envMap,envMapRotation*ijWorldG,0.0).rgb;
          ijEnvB=textureCubeUV(envMap,envMapRotation*ijWorldB,0.0).rgb;
          float ijThirdBounceWeight=0.14*ijDepth;
          ijAccum+=vec3(ijEnvR.r,ijEnvG.g,ijEnvB.b)*ijThirdBounceWeight;
        }
        // Bounces 4 and 5: low-energy, geometry-guided environment samples.
        // These extend the source-authored bounce count without pretending to
        // trace rays through the actual pavilion geometry. They use the existing
        // HDRI and small facet-adjacent offsets to avoid repeating the same
        // reflect(direction, normal) path, which would simply oscillate.
        if(aurumIJEWELRayBounces>=4.0){
          vec3 ijBounceAxis4=abs(ijNormal.y)<0.9?vec3(0.0,1.0,0.0):vec3(1.0,0.0,0.0);
          vec3 ijBounceTangent4=normalize(cross(ijNormal,ijBounceAxis4));
          vec3 ijBounceDir4=normalize(ijDirG+ijBounceTangent4*0.045);
          vec3 ijBounceWorld4=inverseTransformDirection(ijBounceDir4,viewMatrix);
          vec3 ijBounceEnv4=textureCubeUV(envMap,envMapRotation*ijBounceWorld4,0.0).rgb;
          ijAccum+=ijBounceEnv4*(0.050*ijDepth);
        }
        if(aurumIJEWELRayBounces>=5.0){
          vec3 ijBounceAxis5=abs(ijNormal.y)<0.9?vec3(0.0,1.0,0.0):vec3(1.0,0.0,0.0);
          vec3 ijBounceTangent5=normalize(cross(ijNormal,ijBounceAxis5));
          vec3 ijBounceBitangent5=normalize(cross(ijNormal,ijBounceTangent5));
          vec3 ijBounceDir5=normalize(ijDirG-ijBounceBitangent5*0.065);
          vec3 ijBounceWorld5=inverseTransformDirection(ijBounceDir5,viewMatrix);
          vec3 ijBounceEnv5=textureCubeUV(envMap,envMapRotation*ijBounceWorld5,0.0).rgb;
          ijAccum+=ijBounceEnv5*(0.025*ijDepth);
        }
        // Experimental virtual internal-facet reflections.
        // These are additional directional PMREM samples, not added triangles:
        // the imported CAD facets and normals remain untouched. Two nearby
        // reflected directions approximate light arriving from adjacent pavilion
        // facets. Keep the contribution low and switchable for visual A/B tests.
        if(aurumIJEWELVirtualFacets>0.5){
          vec3 ijFacetAxis=abs(ijNormal.y)<0.9?vec3(0.0,1.0,0.0):vec3(1.0,0.0,0.0);
          vec3 ijFacetTangent=normalize(cross(ijNormal,ijFacetAxis));
          vec3 ijFacetBitangent=normalize(cross(ijNormal,ijFacetTangent));
          // Keep the wider virtual-facet sampling that the user preferred
          // during visual review; only samples the existing gem HDRI.
          vec3 ijVirtualDirA=normalize(ijDirG+ijFacetTangent*0.070);
          vec3 ijVirtualDirB=normalize(ijDirG-ijFacetBitangent*0.070);
          vec3 ijVirtualWorldA=inverseTransformDirection(ijVirtualDirA,viewMatrix);
          vec3 ijVirtualWorldB=inverseTransformDirection(ijVirtualDirB,viewMatrix);
          vec3 ijVirtualEnvA=textureCubeUV(envMap,envMapRotation*ijVirtualWorldA,0.0).rgb;
          vec3 ijVirtualEnvB=textureCubeUV(envMap,envMapRotation*ijVirtualWorldB,0.0).rgb;
          ijAccum+=(ijVirtualEnvA+ijVirtualEnvB)*(aurumDiamondMicroVirtualFacetWeight*ijDepth);
        }
        // The custom internal-ray samples bypass MeshPhysicalMaterial's
        // envMapIntensity uniform. Apply a restrained diamond-only energy lift
        // here as well, otherwise changing the gem HDR intensity brightens only
        // the outer PBR layer and leaves the internal facets comparatively dull.
        // Match the energy of the active gem HDRI, including environment
        // changes, instead of using the former fixed 1.06 multiplier.
        ijAccum*=aurumIJEWELBoostFactors*aurumGemEnvironmentIntensity;
        ijAccum=pow(max(ijAccum,vec3(0.0)),vec3(max(aurumIJEWELGammaFactor,.01)));
        float ijCosTheta=clamp(abs(dot(ijNormal,ijView)),0.0,1.0);
        float ijF0=pow((ijIor-1.0)/(ijIor+1.0),2.0);
        float ijFresnel=ijF0+(1.0-ijF0)*pow(1.0-ijCosTheta,5.0);
        float ijFacet=clamp(.5+.5*dot(ijNormal,ijView),0.0,1.0);
        float ijGeometry=mix(1.0,ijFacet,clamp(aurumIJEWELGeometryFactor,0.0,1.0));
        float ijReflect=clamp(aurumIJEWELReflectivity,0.0,1.0);
        // Blend the dedicated environment-ray estimate with the physical PBR
        // surface. HDR samples can be dark on some directions; replacing the
        // surface outright made the diamond nearly opaque/black. Keep enough
        // PBR energy for readable crown facets and a restrained transmission path.
        vec3 ijInternal=mix(ijAccum,ijAccum*1.18,ijFresnel);
        // Diamond-only microcontrast: separate adjacent bright/dark facets
        // without increasing the scene exposure. Keep the pivot near mid-grey
        // and clamp negative energy so this cannot create invalid HDR values.
        vec3 ijAmbientFloor=vec3(0.18);
        ijInternal=mix(ijAmbientFloor,ijInternal,smoothstep(0.0,0.55,ijInternal));
        ijInternal=pow(max(ijInternal,vec3(0.0)),vec3(0.96));

        // Internal fire from the wavelength-separated environment rays above.
        // Use the actual R/G/B ray samples and their energy spread as a mask;
        // do not paint a fixed rainbow texture or emit color on every facet.
        // The Fresnel/view-angle gate keeps the fire small and concentrated
        // near optically active facets, while preserving neutral diamond body.
        float ijSpectralPeak=max(max(ijAccum.r,ijAccum.g),ijAccum.b);
        float ijSpectralFloor=min(min(ijAccum.r,ijAccum.g),ijAccum.b);
        float ijSpectralSpread=max(ijSpectralPeak-ijSpectralFloor,0.0);
        // Broaden the low-energy response so fire transitions across adjacent facets
        // instead of breaking into isolated RGB specks.
        float ijFireEnergy=smoothstep(0.025,0.22,ijSpectralSpread)
          *smoothstep(0.015,0.12,ijSpectralPeak);
        // Keep a restrained spectral-fire contribution on face-on crown facets.
        // The previous view-angle gate suppressed fire almost entirely when
        // ijCosTheta approached 1.0, which explains the grey top-view result.
        // Grazing facets retain the full response; face-on facets receive 55%.
        float ijFaceOnFire=mix(0.55,1.0,1.0-smoothstep(0.78,0.98,ijCosTheta));
        float ijFireFacet=smoothstep(0.10,0.42,ijFresnel)*ijFaceOnFire;
        float ijFireMask=clamp(ijFireEnergy*ijFireFacet*0.13*aurumDiamondMicroFireScale,0.0,${AURUM_DIAMOND_LIVE_TUNING.fireMax.toFixed(3)});
        float ijSpectralLuma=dot(ijAccum,vec3(0.2126,0.7152,0.0722));
        vec3 ijFireColor=max(ijAccum-vec3(ijSpectralLuma*0.88),vec3(0.0));
        float ijFireColorPeak=max(max(ijFireColor.r,ijFireColor.g),ijFireColor.b);
        ijFireColor/=max(ijFireColorPeak,0.0001);
        ijInternal+=ijFireColor*ijFireMask*min(ijSpectralPeak,1.0);
        // Apply the selected catalog hue only to the environment-ray contribution.
        // The PBR contribution already contains material.color; tinting only this
        // branch prevents HDR reflections from washing blue/pink profiles to white.
        ijInternal*=aurumDiamondCatalogTint;
        // Live-view anti-milky calibration: let the dedicated internal gem-HDR
        // estimate carry more of the final diamond color while retaining a
        // controlled share of the physical PBR/Fresnel surface for highlights.
        // This is still an environment-sampling approximation, not geometric tracing.
        float ijInternalWeight=clamp(ijReflect*0.82,0.57,0.67);
        gl_FragColor.rgb=mix(gl_FragColor.rgb,ijInternal,ijInternalWeight);
        // Keep geometry shading restrained: a strong normal-based multiplier
        // was making broad crown facets look uniformly grey.
        gl_FragColor.rgb*=mix(0.96,1.0,ijGeometry);
        // Diamond-only HDR highlight shoulder: reduce clipped white reflections
        // while preserving the RGB ratios that carry the subtle spectral fire.
        float ijHighlightPeak=max(max(gl_FragColor.r,gl_FragColor.g),gl_FragColor.b);
        // Engage the shoulder before the display ceiling to retain central
        // table-facet edges instead of allowing them to collapse to flat white.
        float ijHighlightExcess=max(ijHighlightPeak-0.86,0.0);
        float ijHighlightCompression=1.0/(1.0+pow(ijHighlightExcess,1.12)*${AURUM_DIAMOND_LIVE_TUNING.highlightShoulder.toFixed(2)}*1.35);
        gl_FragColor.rgb*=ijHighlightCompression;
        // Selective real-time glint response for very bright diamond facets.
        // This is a lightweight shader highlight, not a screen-space bloom pass.
        float ijGemGlint=smoothstep(1.8,2.8,ijHighlightPeak)*clamp(ijFresnel*2.0,0.0,1.0);
        gl_FragColor.rgb+=gl_FragColor.rgb*ijGemGlint*0.030;\n        ` : ``}
        #endif
        #endif
      // Use the physical surface normal and view direction already present
        // in the PBR pipeline. No synthetic RGB sparkle or emissive overlay.
        vec3 aurumN=normalize(normal);
        // vViewPosition points from the surface toward the camera. A reflected
        // viewing ray must therefore start in the opposite direction.
        vec3 aurumV=normalize(vViewPosition);
        vec3 aurumR=normalize(reflect(-aurumV,aurumN));

        // Compare the reflected incident ray against the surface-to-camera
        // direction. Using reflect(+V,N) here reverses the ray and suppresses
        // the facet response on crown faces that look toward the camera.
        float aurumFacing=max(dot(aurumR,aurumV),0.0);
        // Derivative-aware facet coverage is compiled only for diamonds. The
        // normal footprint estimates sub-pixel facet transitions; the small
        // bounded expansion prevents temporal edge popping without a scene pass.
        float aurumDiamondFacetAA=${isDiamond ? "clamp(max(fwidth(aurumFacing), max(max(fwidth(aurumN.x), fwidth(aurumN.y)), fwidth(aurumN.z))) * 0.75, 0.0005, 0.03)" : "0.0"};
        // Broader angular transition reduces abrupt sparkle popping during camera orbit.
        float aurumFlash=smoothstep(${isDiamond ? "0.92" : "0.94"}-aurumDiamondFacetAA,0.997+aurumDiamondFacetAA,aurumFacing)*aurumScintillationStrength;

        // Keep scintillation energy bounded: additive white flashes can clip
        // the crown facets in bright studio environments. Modulate existing
        // reflected energy instead of adding an unbounded white contribution.
        gl_FragColor.rgb *= 1.0 + aurumFlash * 0.08;

        // Apply the same bounded pixel-footprint correction to the facet
        // contrast ramp. Colored gemstones receive zero correction and retain
        // their existing response exactly.
        float aurumFacetContrast=smoothstep(0.56-aurumDiamondFacetAA,0.92+aurumDiamondFacetAA,aurumFacing);
        // Stronger diamond-only facet separation addresses the washed-out crown
        // seen against the iJewel reference. This is contrast, not extra exposure:
        // preserve the colored-gem response and leave PBR refraction untouched.
        float aurumFacetFloor=${isDiamond ? "0.93" : "0.992"};
        float aurumContrast=mix(aurumFacetFloor,1.0,aurumScintillationContrast*aurumFacetContrast);
        gl_FragColor.rgb*=aurumContrast;
        ${isDiamond ? `
        // Slightly lift diamond face brightness without raising scene exposure.
        gl_FragColor.rgb *= ${AURUM_DIAMOND_LIVE_TUNING.faceBrightness.toFixed(2)};
        // Restrained angelic diamond aura: a cool-white grazing-angle lift on the
        // gemstone surface, not a screen-space bloom or an emissive shell.
        float aurumAngelRim=pow(1.0-clamp(abs(dot(aurumN,aurumV)),0.0,1.0),2.9);
        float aurumAngelFacetGate=smoothstep(0.08,0.72,aurumFacetContrast);
        gl_FragColor.rgb+=vec3(1.0,0.91,0.82)*aurumAngelRim*aurumAngelFacetGate*${AURUM_DIAMOND_LIVE_TUNING.rimEnergy.toFixed(3)};
        ` : ""}

        if(aurumPhenomenonStrength>0.0){
          vec3 aurumPhenN=normalize(normal);
          vec3 aurumPhenV=normalize(-vViewPosition);
          vec3 aurumPhenR=normalize(reflect(-aurumPhenV,aurumPhenN));
          vec3 aurumAxisA=normalize(aurumPhenomenonAxisA);
          vec3 aurumAxisB=normalize(aurumPhenomenonAxisB);
          vec3 aurumAxisC=normalize(aurumPhenomenonAxisC);
          float aurumBandA=pow(max(abs(dot(aurumPhenR,aurumAxisA)),0.0),42.0);
          float aurumBandB=pow(max(abs(dot(aurumPhenR,aurumAxisB)),0.0),42.0);
          float aurumBandC=pow(max(abs(dot(aurumPhenR,aurumAxisC)),0.0),42.0);
          float aurumPhenBand=aurumPhenomenonMode<1.5 ? aurumBandA : (aurumBandA+aurumBandB+aurumBandC)*0.72;
          float aurumAngle=clamp(dot(aurumPhenR,aurumPhenV),0.0,1.0);
          float aurumSoft=smoothstep(.0,.65,1.0-aurumAngle);
          float aurumIri=0.5+0.5*sin(dot(aurumPhenR,vec3(17.0,31.0,13.0))*mix(7.0,12.0,clamp((aurumPhenomenonScaleNm-100.0)/120.0,0.0,1.0))+aurumPhenV.z*11.0);
          if(aurumPhenomenonMode>2.5 && aurumPhenomenonMode<3.5) aurumPhenBand=aurumSoft;
          if(aurumPhenomenonMode>3.5 && aurumPhenomenonMode<4.5) aurumPhenBand=pow(max(aurumIri,0.0),3.0);
          if(aurumPhenomenonMode>4.5 && aurumPhenomenonMode<5.5) aurumPhenBand=pow(max(aurumIri,0.0),2.0);
          if(aurumPhenomenonMode>5.5 && aurumPhenomenonMode<6.5) aurumPhenBand=pow(max(aurumIri,0.0),1.35);
          if(aurumPhenomenonMode>6.5 && aurumPhenomenonMode<7.5) aurumPhenBand=pow(max(dot(aurumPhenR,aurumPhenV),0.0),4.0);
          if(aurumPhenomenonMode>7.5 && aurumPhenomenonMode<8.5) aurumPhenBand=pow(max(aurumIri,0.0),2.2);
          if(aurumPhenomenonMode>8.5 && aurumPhenomenonMode<10.5) aurumPhenBand=pow(max(aurumIri,0.0),1.15);
          if(aurumPhenomenonMode>10.5 && aurumPhenomenonMode<11.5) aurumPhenBand=.32+.18*sin(dot(aurumPhenV,vec3(9.0,17.0,23.0))*4.0);
          if(aurumPhenomenonMode>11.5) aurumPhenBand=.55+.45*aurumIri;
          float aurumPhenMask=smoothstep(.18,.82,aurumPhenBand)*aurumPhenomenonStrength;
          vec3 aurumPhenColor=vec3(1.0);
          if(aurumPhenomenonMode>2.5 && aurumPhenomenonMode<3.5) aurumPhenColor=vec3(.72,.82,1.0);
          if(aurumPhenomenonMode>3.5 && aurumPhenomenonMode<4.5) aurumPhenColor=vec3(1.0,.72,.32);
          if(aurumPhenomenonMode>4.5 && aurumPhenomenonMode<5.5) aurumPhenColor=vec3(.25,.68,1.0)+vec3(.35,.12,.02)*aurumIri;
          if(aurumPhenomenonMode>5.5 && aurumPhenomenonMode<6.5) aurumPhenColor=mix(vec3(.15,.65,1.0),vec3(1.0,.18,.05),aurumIri);
          if(aurumPhenomenonMode>6.5 && aurumPhenomenonMode<7.5) aurumPhenColor=vec3(1.0,.68,.25);
          if(aurumPhenomenonMode>7.5 && aurumPhenomenonMode<8.5) aurumPhenColor=mix(vec3(.55,.75,1.0),vec3(1.0,.72,.82),aurumIri);
          if(aurumPhenomenonMode>8.5 && aurumPhenomenonMode<10.5) aurumPhenColor=mix(vec3(.2,.8,1.0),vec3(1.0,.22,.55),aurumIri);
          if(aurumPhenomenonMode>10.5 && aurumPhenomenonMode<11.5) aurumPhenColor=vec3(.82,.88,.9);
          if(aurumPhenomenonMode>11.5) aurumPhenColor=vec3(1.0,.72,.52);
          gl_FragColor.rgb+=gl_FragColor.rgb*aurumPhenColor*aurumPhenMask*.22;
        }
        if(aurumUVMode>0.5){
          vec3 aurumUVColor=aurumUVMode<1.5?aurumFluorescenceColorLW:aurumFluorescenceColorSW;
          float aurumUVFalloff=smoothstep(.05,.9,max(dot(normalize(normal),normalize(vViewPosition)),0.0));
          float aurumFluorescence=aurumFluorescenceStrength*aurumUVFalloff;
          gl_FragColor.rgb+=aurumUVColor*aurumFluorescence;
        }
                // Controlled direct response for the gem-light slider. The
                // contribution is restricted to gemstone materials and follows
                // the imported facet normals; it does not light the metal meshes.
                float aurumGemLightSafeRadius=max(aurumGemLightRadius,0.001);
                vec3 aurumGemLightDelta=aurumGemLightPosition-vAurumGemWorldPosition;
                float aurumGemLightDistance=length(aurumGemLightDelta);
                vec3 aurumGemLightDir=aurumGemLightDelta/max(aurumGemLightDistance,0.0001);
                float aurumGemLightAttenuation=1.0/(1.0+pow(aurumGemLightDistance/(aurumGemLightSafeRadius*1.8),2.0));
                vec3 aurumGemN=normalize(vAurumGemWorldNormal);
                vec3 aurumGemViewDir=normalize(cameraPosition-vAurumGemWorldPosition);
                vec3 aurumGemHalfDir=normalize(aurumGemLightDir+aurumGemViewDir);
                float aurumGemNdotL=max(dot(aurumGemN,aurumGemLightDir),0.0);
                float aurumGemNdotV=clamp(abs(dot(aurumGemN,aurumGemViewDir)),0.0,1.0);
                // Broader facet highlight plus a restrained grazing-angle response:
                // this keeps the gem-light control visible on cut stones without
                // turning the whole diamond into a white emissive surface.
                float aurumGemFacetSpecular=pow(max(dot(aurumGemN,aurumGemHalfDir),0.0),24.0);
                float aurumGemFacetEdge=pow(1.0-aurumGemNdotV,2.0)*aurumGemNdotL;
                float aurumGemLightEnergy=aurumGemLightIntensity*aurumGemLightAttenuation;
                float aurumGemLightResponse=aurumGemNdotL*0.18+aurumGemFacetSpecular*0.42+aurumGemFacetEdge*0.12;
                gl_FragColor.rgb+=vec3(1.0)*aurumGemLightEnergy*aurumGemLightResponse;

        ${isDiamond ? `
                // Diamond-only overhead studio softbox. Keep it independent from
                // the scene HDRI and physical RectAreaLights: this broad, fixed
                // source gives the crown a stable white reflection while the
                // environment rays continue to provide rotation-dependent fire.
                // A wide lobe models the large diffuser; a restrained core adds
                // definition without washing the neighboring facets to white.
                // The source is fixed in world space (not camera space): orbiting the
                // product changes the facet/view relationship, never the light position.
                // Large warm overhead softbox: lower exponents broaden the
                // reflected source across more crown facets without moving it
                // with the camera or adding another scene/area light.
                vec3 aurumGemSunDir=vec3(0.0,1.0,0.0);
                float aurumGemSunNdotL=max(dot(aurumGemN,aurumGemSunDir),0.0);
                vec3 aurumGemSunHalf=normalize(aurumGemSunDir+aurumGemViewDir);
                float aurumGemSunHalfDot=max(dot(aurumGemN,aurumGemSunHalf),0.0);
                float aurumGemSoftbox=pow(aurumGemSunHalfDot,1.25);
                float aurumGemSoftboxCore=pow(aurumGemSunHalfDot,6.0);
                float aurumGemSunEdge=pow(1.0-aurumGemNdotV,2.0)*aurumGemSunNdotL;
                float aurumGemSunResponse=aurumGemSunNdotL*0.16
                    +aurumGemSoftbox*0.60+aurumGemSoftboxCore*0.09
                    +aurumGemSunEdge*0.10;
                // Broad warm-neutral overhead reflection, fixed in world space.
                // This reuses the existing diamond-only shader source: no extra
                // Three.js light, shadow map, render pass or per-frame CPU work.
                gl_FragColor.rgb+=vec3(1.0,0.88,0.78)*0.60*aurumGemSunResponse;
        ` : ``}

                #include <tonemapping_fragment>
                #include <colorspace_fragment>
                #include <fog_fragment>
                #include <premultiplied_alpha_fragment>
                #include <dithering_fragment>
      `
    );
  };

  // Keep the cache key aligned with every compile-time shader branch.
  // This final assignment intentionally replaces the earlier material key,
  // so include all relevant feature flags here rather than losing them.
  material.customProgramCacheKey=()=>[
    "aurum-scintillation-v17-diamond-facet-aa",
    family,
    familyDispersionScale,
    ijewelEnabled?"ijewel-diamond-active":"physical-gem-only",
    oilDropEnabled?"oil-drop":"no-oil-drop",
    colorChangeEnabled?"color-change":"no-color-change",
    phenomenonEnabled?phenomenonType:"no-phenomenon",
    pleochroismEnabled?"pleochroism":"no-pleochroism",
    String((physicalModel as any)?.crystal?.symmetry??"unknown"),
  ].join("-");

  // Keep the complete photographic shader available for capture, but allow the
  // interactive viewer to switch to a lean native MeshPhysicalMaterial shader.
  // This is the key distinction from a naive "lower quality" toggle: geometry,
  // IOR, transmission and authored facet normals remain intact while the
  // additional per-fragment optical effects are deferred to the beauty render.
  material.userData={
    ...(material.userData??{}),
    aurumBeautyOnBeforeCompile:material.onBeforeCompile,
    aurumBeautyProgramCacheKey:material.customProgramCacheKey,
    aurumLiveShaderQuality:"beauty",
    aurumLiveDispersionStored:Number(material.dispersion??0),
    aurumLiveIridescenceStored:Number(material.iridescence??0),
  };
  material.needsUpdate=true;
  return material;
};

/** Update only the dispersion uniforms on an already-compiled diamond material. No shader rebuild or material replacement. */
export const setAurumDiamondSourceDispersion=(material:any,sourceDispersion:number)=>{
  if(!material || String(material.userData?.aurumGemFamily??"").trim().toLowerCase()!=="diamante") return false;
  const dispersion=Math.max(0,Math.min(0.1,Number(sourceDispersion)||0));
  const parameters={...(material.userData?.aurumIJEWELParameters??{}),dispersion};
  material.userData={...(material.userData??{}),aurumIJEWELParameters:parameters};
  const uniforms=material.userData?.aurumDiamondMicroUniforms;
  const familyScale=0.88;
  if(uniforms?.dispersion){
    uniforms.dispersion.value=dispersion*familyScale;
    uniforms.baseDispersion=dispersion*familyScale;
  }
  if(uniforms?.iJewelDispersionScale){
    uniforms.iJewelDispersionScale.value=dispersion/0.01;
  }
  material.dispersion=dispersion;
  material.userData.aurumDiamondSourceDispersion=dispersion;
  return true;
};

export type AurumGemShaderQuality = "live"|"beauty";

export const setAurumGemShaderQuality=(target:any,quality:AurumGemShaderQuality)=>{
  const apply=(material:any)=>{
    if(!material?.isMeshPhysicalMaterial || !material.userData?.aurumBeautyOnBeforeCompile)return;
    const ud=material.userData;
    // Keep the dedicated spectral path for diamonds. Colored gems, including
    // emeralds, use Three.js' native physical shader in LIVE: the photographic
    // custom shader bypasses the normal tone-mapping/color-space output path,
    // which can flatten catalog hue and absorption differences under HDR.
    // Authored MeshPhysicalMaterial properties remain intact; CAPTURE restores
    // the full custom shader from aurumBeautyOnBeforeCompile.
    if(quality==="live" && String(ud.aurumGemFamily??"").trim().toLowerCase()==="diamante"){
      return;
    }
    if(quality==="live"){
      if(ud.aurumLiveShaderQuality!=="live"){
        ud.aurumLiveDispersionStored=Number(material.dispersion??ud.aurumLiveDispersionStored??0);
        ud.aurumLiveIridescenceStored=Number(material.iridescence??ud.aurumLiveIridescenceStored??0);
        material.dispersion=0;
        material.iridescence=0;
        material.onBeforeCompile=()=>{};
        material.customProgramCacheKey=()=>`aurum-gem-live-v1-${String(ud.aurumGemFamily??"gem")}`;
        ud.aurumLiveShaderQuality="live";
        material.needsUpdate=true;
      }
    }else if(ud.aurumLiveShaderQuality!=="beauty"){
      material.dispersion=Number(ud.aurumLiveDispersionStored??0);
      material.iridescence=Number(ud.aurumLiveIridescenceStored??0);
      material.onBeforeCompile=ud.aurumBeautyOnBeforeCompile;
      material.customProgramCacheKey=ud.aurumBeautyProgramCacheKey;
      ud.aurumLiveShaderQuality="beauty";
      material.needsUpdate=true;
    }
  };
  if(target?.isMaterial) apply(target);
  else target?.traverse?.((o:any)=>{
    if(!o?.isMesh)return;
    if(Array.isArray(o.material))o.material.forEach(apply);
    else apply(o.material);
  });
};

/** Runtime UV excitation: 0=normal, 1=LWUV 365nm, 2=SWUV 254nm. */
export const setAurumUVMode=(target:any,mode:0|1|2=0)=>{
  const apply=(material:any)=>{ if(!material) return; material.userData={...(material.userData??{}),aurumUVMode:mode}; material.needsUpdate=true; };
  if(target?.isMaterial) apply(target);
  else target?.traverse?.((o:any)=>{ if(o.material) { if(Array.isArray(o.material)) o.material.forEach(apply); else apply(o.material); } });
};
