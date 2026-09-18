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
  const contrastStrength=.075*facetContrast;
  const pleochroism:any=(profile as any).pleochroism;
  const pleochroismEnabled=Boolean(pleochroism?.enabled);
  const pleochroismStrength=Math.max(0,Math.min(.65,Number(pleochroism?.strength??0)));
  const pleochroismThirdStrength=Math.max(0,Math.min(.20,Number(pleochroism?.thirdAxisStrength??0)));
  const pleoBlue=new THREE.Color(0x315fd0);
  const pleoViolet=pleoThirdKey==="deepGreen" ? new THREE.Color(0x3f8f75) : pleoThirdKey==="deepRose" ? new THREE.Color(0xc56a9a) : pleoThirdKey==="deepBlue" ? new THREE.Color(0x3f79a8) : new THREE.Color(0x7650c8);
  const pleoThirdKey=String(pleochroism?.axisC??"");
  const pleoThird=pleoThirdKey==="yellowGreen"
    ? new THREE.Color(0x7d8b4a)
    : pleoThirdKey==="deepGreen"
      ? new THREE.Color(0x0e4d2f)
      : pleoThirdKey==="deepRose"
        ? new THREE.Color(0x8e294f)
        : pleoThirdKey==="deepBlue"
          ? new THREE.Color(0x164b70)
          : new THREE.Color(0x9b466f);

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
      uniform vec3 aurumPleoBlue;
      uniform vec3 aurumPleoViolet;
      uniform vec3 aurumPleoThird;
      uniform float aurumPleoStrength;
      uniform float aurumPleoThirdStrength;
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

    shader.fragmentShader=shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `
        // Use the physical surface normal and view direction already present
        // in the PBR pipeline. No synthetic RGB sparkle or emissive overlay.
        vec3 aurumN=normalize(normal);
        vec3 aurumV=normalize(vViewPosition);
        vec3 aurumR=normalize(reflect(aurumV,aurumN));

        // A facet becomes a scintillation candidate only when its reflected
        // direction approaches the viewer. This creates moving light/dark
        // contrast as the jewel or camera moves.
        float aurumFacing=max(dot(aurumR,aurumV),0.0);
        float aurumFlash=smoothstep(0.985,0.9995,aurumFacing)*aurumScintillationStrength;

        // Keep the accent tied to reflected light and extremely restrained.
        // The actual IOR, transmission, thickness and dispersion remain in
        // MeshPhysicalMaterial and continue to determine the gemstone optics.
        gl_FragColor.rgb += vec3(aurumFlash);

        float aurumFacetContrast=smoothstep(0.72,0.98,aurumFacing);
        float aurumContrast=mix(1.0,0.992,aurumScintillationContrast*aurumFacetContrast);
        gl_FragColor.rgb*=aurumContrast;

        #include <dithering_fragment>
      `
    );
  };

  material.customProgramCacheKey=()=>`aurum-scintillation-v4-${family}-${familyDispersionScale}-pleo-${pleochroismEnabled?1:0}`;
  material.needsUpdate=true;
  return material;
};