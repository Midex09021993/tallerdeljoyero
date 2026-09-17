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

    shader.fragmentShader=`
      uniform float aurumScintillationStrength;
      uniform float aurumScintillationContrast;
      uniform float aurumRuntimeDispersion;
    `+shader.fragmentShader;

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

  material.customProgramCacheKey=()=>`aurum-scintillation-v3-${family}-${familyDispersionScale}`;
  material.needsUpdate=true;
  return material;
};