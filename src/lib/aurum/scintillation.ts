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
  const ijewelEnabled=!!ijewel;
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
      shader.uniforms.aurumIJEWELRefractiveIndex={value:Number(ijewel.refractiveIndex??2.6)};
      shader.uniforms.aurumIJEWELRayBounces={value:Math.max(1,Math.min(8,Math.floor(Number(ijewel.rayBounces??5))))};
      shader.uniforms.aurumIJEWELReflectivity={value:Number(ijewel.reflectivity??.5)};
      shader.uniforms.aurumIJEWELGeometryFactor={value:Number(ijewel.geometryFactor??.5)};
      shader.uniforms.aurumIJEWELSQUASHFactor={value:Number(ijewel.squashFactor??.98)};
      shader.uniforms.aurumIJEWELAbsorptionFactor={value:Number(ijewel.absorptionFactor??1)};
      shader.uniforms.aurumIJEWELGammaFactor={value:Number(ijewel.gammaFactor??1)};
      shader.uniforms.aurumIJEWELTransmissionParameter={value:Number(ijewel.transmissionParameter??0)};
      shader.uniforms.aurumIJEWELBoostFactors={value:new THREE.Vector3(Number(ijewel.boostFactors?.x??1),Number(ijewel.boostFactors?.y??1),Number(ijewel.boostFactors?.z??1))};
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

    shader.fragmentShader=shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `
        if(ijewelEnabled){
        #ifdef USE_ENVMAP
        #ifdef ENVMAP_TYPE_CUBE_UV
        // Native iJewel parameter path. The source renderer exposes rayBounces
        // as a material parameter; AURUM uses a bounded iterative internal
        // reflection/refraction path against the same PMREM environment rather
        // than collapsing the value into a different IOR or transmission value.
        vec3 ijView=normalize(-vViewPosition);
        vec3 ijNormal=normalize(normal);
        float ijEta=1.0/max(aurumIJEWELRefractiveIndex,1.0001);
        vec3 ijDir=refract(-ijView,ijNormal,ijEta);
        vec3 ijAccum=vec3(0.0);
        float ijWeight=1.0;
        float ijMaxBounces=clamp(aurumIJEWELRayBounces,1.0,8.0);
        for(int ijB=0;ijB<8;ijB++){
          if(float(ijB)>=ijMaxBounces) break;
          vec3 ijWorldDir=inverseTransformDirection(normalize(ijDir),viewMatrix);
          vec3 ijEnv=textureCubeUV(envMap,envMapRotation*ijWorldDir,0.0).rgb;
          float ijDepth=exp(-float(ijB)*max(aurumIJEWELAbsorptionFactor,0.001)*.18);
          ijAccum+=ijEnv*ijWeight*ijDepth;
          ijWeight*=.62;
          // Internal bounce: reflect inside the stone, then refract again.
          ijDir=reflect(ijDir,ijNormal);
          ijDir=normalize(mix(ijDir,ijNormal,clamp(1.0-aurumIJEWELSQUASHFactor,0.0,.2)));
        }
        float ijNorm=max(ijWeight,0.0001);
        ijAccum/=max(1.0,ijMaxBounces*.35);
        ijAccum*=aurumIJEWELBoostFactors;
        ijAccum=pow(max(ijAccum,vec3(0.0)),vec3(max(aurumIJEWELGammaFactor,.01)));
        float ijFacet=clamp(.5+.5*dot(ijNormal,ijView),0.0,1.0);
        float ijGeometry=mix(1.0,ijFacet,clamp(aurumIJEWELGeometryFactor,0.0,1.0));
        float ijReflect=clamp(aurumIJEWELReflectivity,0.0,1.0);
        // transmissionParameter=0 is preserved as the original iJewel value;
        // it is not mapped to MeshPhysicalMaterial.transmission. The custom
        // optical contribution is blended here using the source reflectivity.
        gl_FragColor.rgb=mix(gl_FragColor.rgb,gl_FragColor.rgb*(1.0-ijReflect)+ijAccum*ijReflect,ijGeometry);
        #endif
        #endif
      }

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
                #include <dithering_fragment>
      `
    );
  };

  material.customProgramCacheKey=()=>`aurum-scintillation-v8-${family}-${familyDispersionScale}-pleo-${pleochroismEnabled?1:0}-phen-${phenomenonEnabled?phenomenonType:"none"}-crystal-${String((physicalModel as any)?.crystal?.symmetry??"unknown")}`;
  material.needsUpdate=true;
  return material;
};

/** Runtime UV excitation: 0=normal, 1=LWUV 365nm, 2=SWUV 254nm. */
export const setAurumUVMode=(target:any,mode:0|1|2=0)=>{
  const apply=(material:any)=>{ if(!material) return; material.userData={...(material.userData??{}),aurumUVMode:mode}; material.needsUpdate=true; };
  if(target?.isMaterial) apply(target);
  else target?.traverse?.((o:any)=>{ if(o.material) Array.isArray(o.material)?o.material.forEach(apply):apply(o.material); });
};
