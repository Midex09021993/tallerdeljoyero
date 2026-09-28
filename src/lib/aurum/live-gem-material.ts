import * as THREE from "three";

export const createAurumLiveGemMaterial=(beauty:any)=>{
  const live=new THREE.MeshStandardMaterial({
    color:beauty?.color?.clone?.() ?? new THREE.Color(0xffffff),
    metalness:0,
    roughness:Math.max(.018,Math.min(.12,Number(beauty?.roughness??.035))),
    envMap:beauty?.envMap ?? null,
    envMapIntensity:Math.max(.8,Math.min(2.2,Number(beauty?.envMapIntensity??1.3))),
    side:beauty?.side ?? THREE.FrontSide,
    flatShading:Boolean(beauty?.flatShading),
  });
  const src=beauty?.userData??{};
  live.userData={
    ...src,
    aurumLiveGemMaterial:true,
    aurumBeautyMaterial:beauty,
    aurumLiveGemFamily:String(src.aurumGemFamily??"gem"),
  };
  const ior=Math.max(1.01,Math.min(2.8,Number(beauty?.ior??src.aurumOpticalProfile?.ior??2.4)));
  const family=String(src.aurumGemFamily??src.aurumOpticalProfile?.familia??"gem");
  const tint=family==="Esmeralda"?new THREE.Color(0x39b86a):family==="Rubí"?new THREE.Color(0xc73545):family==="Zafiro"?new THREE.Color(0x4168d8):new THREE.Color(0xffffff);
  live.onBeforeCompile=(shader:any)=>{
    shader.uniforms.aurumLiveIOR={value:ior};
    shader.uniforms.aurumLiveTint={value:tint};
    shader.fragmentShader=`uniform float aurumLiveIOR; uniform vec3 aurumLiveTint;
`+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace("#include <dithering_fragment>",`
      float aurumLiveNdotV=clamp(dot(normalize(normal),normalize(vViewPosition)),0.0,1.0);
      float aurumLiveF0=pow((aurumLiveIOR-1.0)/(aurumLiveIOR+1.0),2.0);
      float aurumLiveF=aurumLiveF0+(1.0-aurumLiveF0)*pow(1.0-aurumLiveNdotV,5.0);
      gl_FragColor.rgb=mix(gl_FragColor.rgb,gl_FragColor.rgb*aurumLiveTint,0.16);
      gl_FragColor.rgb*=1.0+aurumLiveF*0.32;
      #include <dithering_fragment>
    `);
  };
  live.customProgramCacheKey=()=>`aurum-live-gem-v1-${family}`;
  return live;
};

export const setAurumGemRenderQuality=(target:any,quality:"live"|"beauty")=>{
  const apply=(mesh:any)=>{
    if(!mesh?.isMesh || mesh.userData?.aurumInternalInclusion) return;
    const current=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    if(!current.some((m:any)=>m?.userData?.aurumBeautyMaterial||m?.userData?.aurumLiveGemMaterial||m?.userData?.aurumOpticalProfile)) return;
    if(quality==="live"){
      mesh.material=current.map((m:any)=>{
        if(m?.userData?.aurumLiveGemMaterial)return m;
        const existing=m?.userData?.aurumLiveMaterial;
        const live=existing??createAurumLiveGemMaterial(m);
        m.userData={...(m.userData??{}),aurumLiveMaterial:live};
        return live;
      });
    }else{
      mesh.material=current.map((m:any)=>m?.userData?.aurumBeautyMaterial??m);
    }
    if(Array.isArray(mesh.material) && mesh.material.length===1)mesh.material=mesh.material[0];
  };
  if(target?.isMesh)apply(target); else target?.traverse?.((o:any)=>apply(o));
};

export const setAurumLiveMaterialQuality=(target:any,quality:"live"|"beauty")=>{
  const apply=(mesh:any)=>{
    if(!mesh?.isMesh || mesh.userData?.aurumInternalInclusion) return;
    const category=String(mesh.userData?.aurumRhino?.categoria??"").toLowerCase();
    if(category!=="metal" && category!=="otro") return;
    const current=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    if(quality==="live"){
      mesh.material=current.map((m:any)=>{
        if(m?.userData?.aurumLiveMetalMaterial)return m;
        const cached=m?.userData?.aurumLiveMaterial;
        if(cached)return cached;
        const live=new THREE.MeshStandardMaterial({
          color:m?.color?.clone?.()??new THREE.Color(0xffffff),
          metalness:Math.max(0,Math.min(1,Number(m?.metalness??1))),
          roughness:Math.max(.08,Math.min(.7,Number(m?.roughness??.25))),
          envMap:m?.envMap??null,
          envMapIntensity:Math.max(.45,Math.min(2,Number(m?.envMapIntensity??1))),
          side:m?.side??THREE.FrontSide,
          flatShading:Boolean(m?.flatShading),
        });
        live.userData={...(m?.userData??{}),aurumLiveMetalMaterial:true,aurumBeautyMaterial:m};
        m.userData={...(m.userData??{}),aurumLiveMaterial:live};
        return live;
      });
    }else{
      mesh.material=current.map((m:any)=>m?.userData?.aurumBeautyMaterial??m);
    }
    if(Array.isArray(mesh.material)&&mesh.material.length===1)mesh.material=mesh.material[0];
  };
  if(target?.isMesh)apply(target); else target?.traverse?.((o:any)=>apply(o));
};
