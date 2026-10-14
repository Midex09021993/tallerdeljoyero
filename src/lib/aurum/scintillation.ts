import * as THREE from "three";
import type { AurumOpticalProfile } from "../aurum-material-engine";

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
  const brilliance=Math.max(0,Math.min(1.2,Number(profile.brilliance??.75)));
  const facetContrast=Math.max(0,Math.min(1.2,Number(profile.facetContrast??.9)));
  const baseDispersion=Math.max(0,Number(profile.dispersion??material.dispersion??0));

  // Diamonds and moissanite naturally show stronger spectral separation;
  // colored stones stay deliberately restrained so body color remains dominant.
  const familyDispersionScale=family==="Diamante"
    ? 1.00
    : family==="Moissanita"
      ? 1.00
      : family==="Esmeralda"
        ? .72
        : family==="Rubí"
          ? .78
          : family==="Zafiro"
            ? .76
            : .80;

  const strength=family==="Diamante"
    ? .16*brilliance
    : family==="Moissanita"
      ? .20*brilliance
      : .045*brilliance;
  const contrastStrength=(family==="Diamante" ? .88 : .075)*facetContrast;
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

  const ijewel=material.userData?.aurumIJEWELParameters;
  // iJewel source parameters are retained for calibration, but the custom
  // multi-bounce shader is opt-in. Physical MeshPhysicalMaterial transmission
  // remains the default path for every gemstone.
  const ijewelEnabled=Boolean(material.userData?.aurumIJEWELActive) && family==="Diamante";
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

  material.onBeforeCompile=(shader:any)=>{
    shader.uniforms.aurumScintillationStrength={value:strength};
    shader.uniforms.aurumScintillationContrast={value:contrastStrength};
    shader.uniforms.aurumRuntimeDispersion={value:baseDispersion*familyDispersionScale};
    if(ijewelEnabled){
      // Use the real gemstone IOR for the rendered ray directions.
      // The iJewel 2.6 value is retained as source-reference metadata only;
      // applying it here made the diamond refract more strongly than diamond.
      shader.uniforms.aurumIJEWELRefractiveIndex={value:Math.max(1.01,Math.min(2.65,Number(material.ior??2.417)))};
      shader.uniforms.aurumIJEWELRayBounces={value:Math.max(1,Math.min(8,Math.floor(Number(ijewel.rayBounces??5))))};
      shader.uniforms.aurumIJEWELReflectivity={value:Number(ijewel.reflectivity??.5)};
      shader.uniforms.aurumIJEWELGeometryFactor={value:Number(ijewel.geometryFactor??.5)};
      shader.uniforms.aurumIJEWELSQUASHFactor={value:Number(ijewel.squashFactor??.98)};
      shader.uniforms.aurumIJEWELAbsorptionFactor={value:Number(ijewel.absorptionFactor??1)};
      shader.uniforms.aurumIJEWELGammaFactor={value:Number(ijewel.gammaFactor??1)};
      shader.uniforms.aurumIJEWELTransmissionParameter={value:Number(ijewel.transmissionParameter??0)};
      shader.uniforms.aurumIJEWELBoostFactors={value:new THREE.Vector3(Number(ijewel.boostFactors?.x??1),Number(ijewel.boostFactors?.y??1),Number(ijewel.boostFactors?.z??1))};
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
        float ijEtaR=1.0/max(ijIor-0.010,1.0001);
        float ijEtaG=1.0/ijIor;
        float ijEtaB=1.0/min(ijIor+0.034,2.65);
        // Preserve the last visually working direction while isolating the
        // blank-render regression from the recent view-vector change.
        vec3 ijDirR=refract(ijView,ijNormal,ijEtaR);
        vec3 ijDirG=refract(ijView,ijNormal,ijEtaG);
        vec3 ijDirB=refract(ijView,ijNormal,ijEtaB);
        vec3 ijAccum=vec3(0.0);
        float ijWeight=0.58;
        float ijDepth=1.0;
        // First internal path: sample wavelength-separated rays in the HDRI.
        vec3 ijWorldR=inverseTransformDirection(normalize(ijDirR),viewMatrix);
        vec3 ijWorldG=inverseTransformDirection(normalize(ijDirG),viewMatrix);
        vec3 ijWorldB=inverseTransformDirection(normalize(ijDirB),viewMatrix);
        vec3 ijEnvR=textureCubeUV(envMap,envMapRotation*ijWorldR,0.0).rgb;
        vec3 ijEnvG=textureCubeUV(envMap,envMapRotation*ijWorldG,0.0).rgb;
        vec3 ijEnvB=textureCubeUV(envMap,envMapRotation*ijWorldB,0.0).rgb;
        ijAccum+=vec3(ijEnvR.r,ijEnvG.g,ijEnvB.b)*ijWeight;
        // One low-cost reflected internal path approximates a pavilion bounce.
        // The source mesh's facet normals still control the primary PBR result;
        // this is deliberately an approximation, not full geometric ray tracing.
        ijDirR=reflect(ijDirR,ijNormal);
        ijDirG=reflect(ijDirG,ijNormal);
        ijDirB=reflect(ijDirB,ijNormal);
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
        ijAccum+=vec3(ijEnvR.r,ijEnvG.g,ijEnvB.b)*(.42*ijDepth);

        // Optional third environment sample: approximate a second pavilion
        // interaction without claiming geometric multi-bounce ray tracing.
        // Gate it with the source-authored bounce setting and keep its energy
        // restrained so this refinement cannot overwhelm the visible PBR facets.
        if(aurumIJEWELRayBounces>=3.0){
          ijDirR=reflect(ijDirR,ijNormal);
          ijDirG=reflect(ijDirG,ijNormal);
          ijDirB=reflect(ijDirB,ijNormal);
          ijWorldR=inverseTransformDirection(normalize(ijDirR),viewMatrix);
          ijWorldG=inverseTransformDirection(normalize(ijDirG),viewMatrix);
          ijWorldB=inverseTransformDirection(normalize(ijDirB),viewMatrix);
          ijEnvR=textureCubeUV(envMap,envMapRotation*ijWorldR,0.0).rgb;
          ijEnvG=textureCubeUV(envMap,envMapRotation*ijWorldG,0.0).rgb;
          ijEnvB=textureCubeUV(envMap,envMapRotation*ijWorldB,0.0).rgb;
          float ijThirdBounceWeight=0.12*ijDepth;
          ijAccum+=vec3(ijEnvR.r,ijEnvG.g,ijEnvB.b)*ijThirdBounceWeight;
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
          vec3 ijVirtualDirA=normalize(ijDirG+ijFacetTangent*0.045);
          vec3 ijVirtualDirB=normalize(ijDirG-ijFacetBitangent*0.045);
          vec3 ijVirtualWorldA=inverseTransformDirection(ijVirtualDirA,viewMatrix);
          vec3 ijVirtualWorldB=inverseTransformDirection(ijVirtualDirB,viewMatrix);
          vec3 ijVirtualEnvA=textureCubeUV(envMap,envMapRotation*ijVirtualWorldA,0.0).rgb;
          vec3 ijVirtualEnvB=textureCubeUV(envMap,envMapRotation*ijVirtualWorldB,0.0).rgb;
          ijAccum+=(ijVirtualEnvA+ijVirtualEnvB)*(0.07*ijDepth);
        }
        // The custom internal-ray samples bypass MeshPhysicalMaterial's
        // envMapIntensity uniform. Apply a restrained diamond-only energy lift
        // here as well, otherwise changing the gem HDR intensity brightens only
        // the outer PBR layer and leaves the internal facets comparatively dull.
        ijAccum*=aurumIJEWELBoostFactors*1.06;
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
        vec3 ijInternal=mix(ijAccum,ijAccum*1.12,ijFresnel);
        // Diamond-only microcontrast: separate adjacent bright/dark facets
        // without increasing the scene exposure. Keep the pivot near mid-grey
        // and clamp negative energy so this cannot create invalid HDR values.
        ijInternal=max((ijInternal-vec3(0.45))*1.26+vec3(0.45),vec3(0.0));
        // Blend the environment rays with the physical PBR surface. A bounded
        // weight preserves crown highlights and avoids a dark HDR map swallowing
        // the diamond; this remains an environment-sampling approximation.
        float ijInternalWeight=clamp(ijReflect*0.82,0.34,0.46);
        gl_FragColor.rgb=mix(gl_FragColor.rgb,ijInternal,ijInternalWeight);
        // Keep geometry shading restrained: a strong normal-based multiplier
        // was making broad crown facets look uniformly grey.
        gl_FragColor.rgb*=mix(0.96,1.0,ijGeometry);\n        ` : ``}
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
        float aurumFlash=smoothstep(0.985,0.9995,aurumFacing)*aurumScintillationStrength;

        // Keep scintillation energy bounded: additive white flashes can clip
        // the crown facets in bright studio environments. Modulate existing
        // reflected energy instead of adding an unbounded white contribution.
        gl_FragColor.rgb *= 1.0 + aurumFlash * 0.12;

        float aurumFacetContrast=smoothstep(0.68,0.96,aurumFacing);
        // Stronger diamond-only facet separation addresses the washed-out crown
        // seen against the iJewel reference. This is contrast, not extra exposure:
        // preserve the colored-gem response and leave PBR refraction untouched.
        float aurumFacetFloor=${family === "Diamante" ? "0.50" : "0.992"};
        float aurumContrast=mix(aurumFacetFloor,1.0,aurumScintillationContrast*aurumFacetContrast);
        gl_FragColor.rgb*=aurumContrast;

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
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
                #include <fog_fragment>
                #include <premultiplied_alpha_fragment>
                #include <dithering_fragment>
      `
    );
  };

  material.customProgramCacheKey=()=>`aurum-scintillation-v11-${family}-${familyDispersionScale}-ijewel-${ijewelEnabled?1:0}-pleo-${pleochroismEnabled?1:0}-phen-${phenomenonEnabled?phenomenonType:"none"}-crystal-${String((physicalModel as any)?.crystal?.symmetry??"unknown")}`;

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

export type AurumGemShaderQuality = "live"|"beauty";

export const setAurumGemShaderQuality=(target:any,quality:AurumGemShaderQuality)=>{
  const apply=(material:any)=>{
    if(!material?.isMeshPhysicalMaterial || !material.userData?.aurumBeautyOnBeforeCompile)return;
    const ud=material.userData;
    // Keep the optical/facet shader active for diamonds in the interactive
    // viewer. Disabling onBeforeCompile for every live gemstone also removed
    // the iJewel-inspired diamond facet response, so the central stone appeared
    // uniformly white. Limit this exception to diamonds; other gems stay lean.
    if(quality==="live" && ud.aurumGemFamily==="Diamante"){
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
  else target?.traverse?.((o:any)=>{ if(o.material) Array.isArray(o.material)?o.material.forEach(apply):apply(o.material); });
};
