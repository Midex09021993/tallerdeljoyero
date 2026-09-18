import * as THREE from "three";

type ThicknessMapResult={
  texture:THREE.DataTexture;
  baseThickness:number;
  hitRatio:number;
  minDepth:number;
  maxDepth:number;
};

const rayTriangleDistance=(origin:THREE.Vector3,direction:THREE.Vector3,a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3)=>{
  const edge1=new THREE.Vector3().subVectors(b,a);
  const edge2=new THREE.Vector3().subVectors(c,a);
  const pvec=new THREE.Vector3().crossVectors(direction,edge2);
  const det=edge1.dot(pvec);
  if(Math.abs(det)<1e-8)return Infinity;
  const invDet=1/det;
  const tvec=new THREE.Vector3().subVectors(origin,a);
  const u=tvec.dot(pvec)*invDet;
  if(u<0||u>1)return Infinity;
  const qvec=new THREE.Vector3().crossVectors(tvec,edge1);
  const v=direction.dot(qvec)*invDet;
  if(v<0||u+v>1)return Infinity;
  const distance=edge2.dot(qvec)*invDet;
  return distance>1e-5?distance:Infinity;
};

const barycentric=(p:THREE.Vector2,a:THREE.Vector2,b:THREE.Vector2,c:THREE.Vector2)=>{
  const den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);
  if(Math.abs(den)<1e-10)return null;
  const w1=((b.y-c.y)*(p.x-c.x)+(c.x-b.x)*(p.y-c.y))/den;
  const w2=((c.y-a.y)*(p.x-c.x)+(a.x-c.x)*(p.y-c.y))/den;
  const w3=1-w1-w2;
  return w1>=-1e-5&&w2>=-1e-5&&w3>=-1e-5?[w1,w2,w3] as [number,number,number]:null;
};

export const buildAurumThicknessMap=(target:any,thicknessScale=1,size=128):ThicknessMapResult|null=>{
  const geometry=target?.geometry;
  const position=geometry?.getAttribute?.("position");
  const normal=geometry?.getAttribute?.("normal");
  const uv=geometry?.getAttribute?.("uv");
  if(!geometry||!position||!normal||!uv||normal.count!==position.count||uv.count!==position.count)return null;
  if(position.count<3)return null;
  for(let i=0;i<uv.count;i++){
    const u=uv.getX(i),v=uv.getY(i);
    if(!Number.isFinite(u)||!Number.isFinite(v)||u<-0.001||u>1.001||v<-0.001||v>1.001)return null;
  }

  const vertexCount=position.count;
  const positions:Array<THREE.Vector3>=Array.from({length:vertexCount},(_,i)=>new THREE.Vector3().fromBufferAttribute(position,i));
  const normals:Array<THREE.Vector3>=Array.from({length:vertexCount},(_,i)=>new THREE.Vector3().fromBufferAttribute(normal,i).normalize());
  const center=new THREE.Vector3();
  positions.forEach(p=>center.add(p));
  center.multiplyScalar(1/vertexCount);

  const triangles:Array<[number,number,number]>=geometry.index
    ? Array.from({length:Math.floor(geometry.index.count/3)},(_,i)=>[
        geometry.index.getX(i*3),geometry.index.getX(i*3+1),geometry.index.getX(i*3+2)
      ] as [number,number,number])
    : Array.from({length:Math.floor(vertexCount/3)},(_,i)=>[i*3,i*3+1,i*3+2] as [number,number,number]);

  const depths=new Float32Array(vertexCount);
  let hits=0,minDepth=Infinity,maxDepth=0;

  for(let i=0;i<vertexCount;i++){
    const origin=positions[i];
    const direction=normals[i].clone();
    if(direction.dot(center.clone().sub(origin))<0)direction.negate();
    const rayOrigin=origin.clone().addScaledVector(direction,1e-4);
    let nearest=Infinity;
    for(const [ia,ib,ic] of triangles){
      const originSkip=1e-10;
      if(positions[ia].distanceToSquared(origin)<originSkip||positions[ib].distanceToSquared(origin)<originSkip||positions[ic].distanceToSquared(origin)<originSkip)continue;
      const d=rayTriangleDistance(rayOrigin,direction,positions[ia],positions[ib],positions[ic]);
      if(d<nearest)nearest=d;
    }
    if(Number.isFinite(nearest)){
      depths[i]=nearest;
      hits++;
      minDepth=Math.min(minDepth,nearest);
      maxDepth=Math.max(maxDepth,nearest);
    }
  }

  const hitRatio=hits/vertexCount;
  if(hitRatio<0.70||!Number.isFinite(maxDepth)||maxDepth<=0)return null;

  const data=new Uint8Array(size*size*4);
  const coverage=new Uint8Array(size*size);
  const writePixel=(x:number,y:number,value:number)=>{
    if(x<0||x>=size||y<0||y>=size)return;
    const index=(y*size+x)*4;
    data[index]=255;
    data[index+1]=Math.round(Math.max(0,Math.min(1,value))*255);
    data[index+2]=255;
    data[index+3]=255;
    coverage[y*size+x]=1;
  };

  const uvAt=(i:number)=>new THREE.Vector2(uv.getX(i),uv.getY(i));
  for(const [ia,ib,ic] of triangles){
    if(!depths[ia]||!depths[ib]||!depths[ic])continue;
    const ua=uvAt(ia),ub=uvAt(ib),uc=uvAt(ic);
    const minU=Math.max(0,Math.floor(Math.min(ua.x,ub.x,uc.x)*size)-1);
    const maxU=Math.min(size-1,Math.ceil(Math.max(ua.x,ub.x,uc.x)*size)+1);
    const minV=Math.max(0,Math.floor(Math.min(ua.y,ub.y,uc.y)*size)-1);
    const maxV=Math.min(size-1,Math.ceil(Math.max(ua.y,ub.y,uc.y)*size)+1);
    for(let y=minV;y<=maxV;y++)for(let x=minU;x<=maxU;x++){
      const p=new THREE.Vector2((x+.5)/size,(y+.5)/size);
      const weights=barycentric(p,ua,ub,uc);
      if(!weights)continue;
      const depth=depths[ia]*weights[0]+depths[ib]*weights[1]+depths[ic]*weights[2];
      writePixel(x,y,depth/(maxDepth*1.05));
    }
  }

  let covered=0;
  for(const v of coverage)covered+=v;
  if(covered<Math.max(32,size*size*.01))return null;

  const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat,THREE.UnsignedByteType);
  texture.colorSpace=THREE.NoColorSpace;
  texture.wrapS=THREE.ClampToEdgeWrapping;
  texture.wrapT=THREE.ClampToEdgeWrapping;
  texture.magFilter=THREE.LinearFilter;
  texture.minFilter=THREE.LinearFilter;
  texture.generateMipmaps=false;
  texture.needsUpdate=true;

  return {
    texture,
    baseThickness:Math.max(.015,maxDepth*1.05*Math.max(.5,Math.min(1.5,Number(thicknessScale??1)))),
    hitRatio,
    minDepth,
    maxDepth,
  };
};
