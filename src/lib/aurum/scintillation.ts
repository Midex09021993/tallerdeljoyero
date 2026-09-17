import type { AurumOpticalProfile } from "../aurum-material-engine";

/**
 * Dynamic scintillation response for AURUM gemstones.
 *
 * The effect is view/facet dependent rather than a time-based sparkle overlay.
 * It uses the physical facet response already produced by MeshPhysicalMaterial
 * and adds only a restrained contrast accent at grazing reflection angles.
 */
export const applyAurumDynamicScintillation=(material:any,profile:AurumOpticalProfile)=>{
  if(!material) return material;

  const family=String(material.userData?.aurumGemFamily??"");
  const brilliance=Math.max(0,Math.min(1.2,Number(profile.brilliance??.75)));
  const facetContrast=Math.max(0,Math.min(1.2,Number(profile.facetContrast??.9)));

  // Diamonds and moissanite naturally show stronger scintillation; colored
  // stones remain restrained so their body color is not washed out.
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
  };

  material.onBeforeCompile=(shader:any)=>{
    shader.uniforms.aurumScintillationStrength={value:strength};
    shader.uniforms.aurumScintillationContrast={value:contrastStrength};

    shader.fragmentShader=`
      uniform float aurumScintillationStrength;
      uniform float aurumScintillationContrast;
    `+shader.fragmentShader;

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

  material.customProgramCacheKey=()=>`aurum-scintillation-v2-${family}`;
  material.needsUpdate=true;
  return material;
};
