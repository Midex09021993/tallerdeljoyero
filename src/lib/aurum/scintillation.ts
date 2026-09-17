import type { AurumOpticalProfile } from "../aurum-material-engine";

/**
 * Dynamic scintillation response for AURUM gemstones.
 *
 * The effect is view/facet dependent rather than a time-based sparkle overlay.
 * As the camera or jewel moves, the facet normals change their relationship to
 * the environment/view direction and the flashes naturally appear/disappear.
 * This follows the GIA distinction between brightness, fire and scintillation.
 */
export const applyAurumDynamicScintillation=(material:any,profile:AurumOpticalProfile)=>{
  if(!material) return material;

  const family=String(material.userData?.aurumGemFamily??"");
  const brilliance=Math.max(0,Math.min(1.2,Number(profile.brilliance??.75)));
  const fire=Math.max(0,Math.min(1.25,Number(profile.fire??.35)));
  const facetContrast=Math.max(0,Math.min(1.2,Number(profile.facetContrast??.9)));

  // Keep colored gems restrained. Diamonds and moissanite get the strongest
  // dynamic flashes; colored stones use the effect mainly to animate contrast.
  const strength=family==="Diamante"
    ? .24*brilliance
    : family==="Moissanita"
      ? .30*brilliance
      : .075*brilliance;
  const fireStrength=family==="Diamante"||family==="Moissanita"
    ? .045*fire
    : .012*fire;
  const contrastStrength=.10*facetContrast;

  material.userData={
    ...(material.userData??{}),
    aurumDynamicScintillation:{
      family,
      strength,
      fireStrength,
      contrastStrength,
    },
  };

  material.onBeforeCompile=(shader:any)=>{
    shader.uniforms.aurumScintillationStrength={value:strength};
    shader.uniforms.aurumScintillationFire={value:fireStrength};
    shader.uniforms.aurumScintillationContrast={value:contrastStrength};

    shader.fragmentShader=`
      uniform float aurumScintillationStrength;
      uniform float aurumScintillationFire;
      uniform float aurumScintillationContrast;
    `+shader.fragmentShader;

    shader.fragmentShader=shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `
        // Facet-dependent flash: reflect the view direction against the
        // current physical normal and compare it with several studio-source
        // directions. This changes continuously as the jewel is tilted.
        vec3 aurumN=normalize(normal);
        vec3 aurumV=normalize(vViewPosition);
        vec3 aurumR=normalize(reflect(aurumV,aurumN));
        float a1=max(dot(aurumR,normalize(vec3(0.35,0.45,0.82))),0.0);
        float a2=max(dot(aurumR,normalize(vec3(-0.62,0.18,0.76))),0.0);
        float a3=max(dot(aurumR,normalize(vec3(0.08,-0.72,0.69))),0.0);
        float s1=smoothstep(0.84,0.985,a1);
        float s2=smoothstep(0.90,0.995,a2);
        float s3=smoothstep(0.93,0.998,a3);
        float aurumFlash=(s1+s2*0.72+s3*0.48)*aurumScintillationStrength;

        // A small chromatic component is added only to the flash, while the
        // gemstone's authored dispersion remains responsible for the actual
        // refractive color separation.
        float aurumColorPulse=aurumFlash*aurumScintillationFire;
        vec3 aurumSparkColor=vec3(
          aurumFlash + aurumColorPulse*0.22,
          aurumFlash + aurumColorPulse*0.06,
          aurumFlash + aurumColorPulse*0.34
        );

        // Preserve the physical material response: this is a restrained
        // reflected-light accent, not emission and not a global brightness lift.
        gl_FragColor.rgb += aurumSparkColor;

        // Dynamic contrast is kept subtle and follows the same facet response.
        float aurumContrast=mix(1.0,0.985,aurumScintillationContrast*smoothstep(0.45,0.95,a1));
        gl_FragColor.rgb*=aurumContrast;

        #include <dithering_fragment>
      `
    );
  };

  material.customProgramCacheKey=()=>`aurum-scintillation-v1-${family}`;
  material.needsUpdate=true;
  return material;
};
