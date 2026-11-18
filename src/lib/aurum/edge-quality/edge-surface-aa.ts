/**
 * AURUM EDGE QUALITY — conservative surface antialiasing.
 *
 * Applies a low-strength luminance-edge filter to the composed beauty image.
 * A shared profile policy gates the same subtle blend in LIVE and SETTLED
 * states; extreme geometry budgets and Low quality disable the pass.
 */
export function createAurumSurfaceEdgeAaPass(ShaderPass: any, three: any) {
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      resolution: { value: new three.Vector2(1, 1) },
      strength: { value: 0.035 },
      edgeThreshold: { value: 0.16 },
    },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 resolution; uniform float strength; uniform float edgeThreshold; varying vec2 vUv;
      float edgeLuma(vec3 c){return dot(c,vec3(0.2126,0.7152,0.0722));}
      void main(){
        vec4 center=texture2D(tDiffuse,vUv);
        vec2 px=max(resolution,vec2(0.000001));
        vec3 n0=texture2D(tDiffuse,vUv+vec2(-px.x,-px.y)).rgb;
        vec3 n1=texture2D(tDiffuse,vUv+vec2( px.x,-px.y)).rgb;
        vec3 n2=texture2D(tDiffuse,vUv+vec2(-px.x, px.y)).rgb;
        vec3 n3=texture2D(tDiffuse,vUv+vec2( px.x, px.y)).rgb;
        float centerLuma=edgeLuma(center.rgb);
        float lo=min(centerLuma,min(min(edgeLuma(n0),edgeLuma(n1)),min(edgeLuma(n2),edgeLuma(n3))));
        float hi=max(centerLuma,max(max(edgeLuma(n0),edgeLuma(n1)),max(edgeLuma(n2),edgeLuma(n3))));
        float edge=smoothstep(edgeThreshold,edgeThreshold*2.0,hi-lo);
        vec3 diagonal=(n0+n1+n2+n3)*0.25;
        float blendAmount=edge*strength;
        gl_FragColor=vec4(mix(center.rgb,diagonal,blendAmount),center.a);
      }`,
  });
  pass.enabled = false;
  return pass;
}

export function setAurumEdgeAaResolution(pass: any, width: number, height: number): void {
  const resolution = pass?.material?.uniforms?.resolution?.value;
  if (!resolution?.set) return;
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  resolution.set(1 / safeWidth, 1 / safeHeight);
}

export function shouldEnableAurumEdgeAa(
  highQuality: boolean,
  cameraMoving: boolean,
  stillCapture = false,
): boolean {
  return Boolean(highQuality && (!cameraMoving || stillCapture));
}

/** Adjusts the conservative blend strength without rebuilding the shader pass. */
export function setAurumSurfaceEdgeAaStrength(pass: any, strength: number): void {
  const uniform = pass?.material?.uniforms?.strength;
  if (!uniform) return;
  uniform.value = Math.max(0, Math.min(0.1, Number(strength) || 0));
}
