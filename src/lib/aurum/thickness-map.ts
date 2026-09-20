import * as THREE from "three";

type ThicknessMapResult={
  texture:THREE.DataTexture;
  baseThickness:number;
  hitRatio:number;
  minDepth:number;
  maxDepth:number;
  method:"uv-ray-depth-grid-v3";
  cacheKey:string;
  normalMapRes:number;
};

type Tri=[number,number,number];

const rayTriangleDistance=(origin:THREE.Vector3,direction:THREE.Vector3,a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3)=>{
  const e1=new THREE.Vector3().subVectors(b,a);
  const e2=new THREE.Vector3().subVectors(c,a);
  const p=new THREE.Vector3().crossVectors(direction,e2);
  const det=e1.dot(p);
  if(Math.abs(det)<1e-9)return Infinity;
  const inv=1/det;
  const t=new THREE.Vector3().subVectors(origin,a);
  const u=t.dot(p)*inv;
  if(u<0||u>1)return Infinity;
  const q=new THREE.Vector3().crossVectors(t,e1);
  const v=direction.dot(q)*inv;
  if(v<0||u+v>1)return Infinity;
  const d=e2.dot(q)*inv;
  return d>1e-5?d:Infinity;
};

const barycentric=(p:THREE.Vector2,a:THREE.Vector2,b:THREE.Vector2,c:THREE.Vector2)=>{
  const den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);
  if(Math.abs(den)<1e-10)return null;
  const w1=((b.y-c.y)*(p.x-c.x)+(c.x-b.x)*(p.y-c.y))/den;
  const w2=((c.y-a.y)*(p.x-c.x)+(a.x-c.x)*(p.y-c.y))/den;
  const w3=1-w1-w2;
  return w1>=-1e-5&&w2>=-1e-5&&w3>=-1e-5?[w1,w2,w3] as [number,number,number]:null;
};

type CellGrid={
  min:THREE.Vector3;
  max:THREE.Vector3;
  dims:[number,number,number];
  cells:Map<number,number[]>;
};

const cellKey=(x:number,y:number,z:number,nx:number,ny:number)=>x+y*nx+z*nx*ny;

const AURUM_THICKNESS_CACHE=new Map<string,ThicknessMapResult>();
const geometryCacheIdentity=(target:any)=>String(target?.uuid??target?.geometry?.uuid??"anonymous");

const buildGrid=(positions:THREE.Vector3[],triangles:Tri[]):CellGrid=>{
  const box=new THREE.Box3().setFromPoints(positions);
  const size=box.getSize(new THREE.Vector3());
  const longest=Math.max(size.x,size.y,size.z)||1;
  const target=Math.max(8,Math.min(32,Math.round(Math.cbrt(triangles.length)*1.8)));
  const dims:[number,number,number]=[
    Math.max(8,Math.min(32,Math.round(target*size.x/longest))),
    Math.max(8,Math.min(32,Math.round(target*size.y/longest))),
    Math.max(8,Math.min(32,Math.round(target*size.z/longest))),
  ];
  const cells=new Map<number,number[]>();
  const step=new THREE.Vector3(size.x/dims[0]||1,size.y/dims[1]||1,size.z/dims[2]||1);
  const clamp=(v:number,n:number)=>Math.max(0,Math.min(n-1,v));
  for(let ti=0;ti<triangles.length;ti++){
    const [ia,ib,ic]=triangles[ti]!;
    const a=positions[ia]!,b=positions[ib]!,c=positions[ic]!;
    const lo=new THREE.Vector3(Math.min(a.x,b.x,c.x),Math.min(a.y,b.y,c.y),Math.min(a.z,b.z,c.z));
    const hi=new THREE.Vector3(Math.max(a.x,b.x,c.x),Math.max(a.y,b.y,c.y),Math.max(a.z,b.z,c.z));
    const x0=clamp(Math.floor((lo.x-box.min.x)/step.x),dims[0]);
    const x1=clamp(Math.floor((hi.x-box.min.x)/step.x),dims[0]);
    const y0=clamp(Math.floor((lo.y-box.min.y)/step.y),dims[1]);
    const y1=clamp(Math.floor((hi.y-box.min.y)/step.y),dims[1]);
    const z0=clamp(Math.floor((lo.z-box.min.z)/step.z),dims[2]);
    const z1=clamp(Math.floor((hi.z-box.min.z)/step.z),dims[2]);
    for(let z=z0;z<=z1;z++)for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const k=cellKey(x,y,z,dims[0],dims[1]);
      const list=cells.get(k);
      if(list)list.push(ti); else cells.set(k,[ti]);
    }
  }
  return {min:box.min,max:box.max,dims,cells};
};

const rayBoxEntry=(origin:THREE.Vector3,direction:THREE.Vector3,boxMin:THREE.Vector3,boxMax:THREE.Vector3)=>{
  let tmin=-Infinity,tmax=Infinity;
  for(const axis of ["x","y","z"] as const){
    const o=origin[axis],d=direction[axis],lo=boxMin[axis],hi=boxMax[axis];
    if(Math.abs(d)<1e-10){if(o<lo||o>hi)return null;continue;}
    const a=(lo-o)/d,b=(hi-o)/d;
    tmin=Math.max(tmin,Math.min(a,b)); tmax=Math.min(tmax,Math.max(a,b));
    if(tmax<tmin)return null;
  }
  return {tmin,tmax};
};

const gridRayDistance=(origin:THREE.Vector3,direction:THREE.Vector3,grid:CellGrid,positions:THREE.Vector3[],triangles:Tri[])=>{
  const entry=rayBoxEntry(origin,direction,grid.min,grid.max);
  if(!entry)return Infinity;
  const dims=grid.dims;
  const size=grid.max.clone().sub(grid.min);
  const step=new THREE.Vector3(size.x/dims[0]||1,size.y/dims[1]||1,size.z/dims[2]||1);
  const p=origin.clone().addScaledVector(direction,Math.max(0,entry.tmin)+1e-6);
  const ix=Math.max(0,Math.min(dims[0]-1,Math.floor((p.x-grid.min.x)/step.x)));
  const iy=Math.max(0,Math.min(dims[1]-1,Math.floor((p.y-grid.min.y)/step.y)));
  const iz=Math.max(0,Math.min(dims[2]-1,Math.floor((p.z-grid.min.z)/step.z)));
  let x=ix,y=iy,z=iz;
  const sx=direction.x>=0?1:-1,sy=direction.y>=0?1:-1,sz=direction.z>=0?1:-1;
  const nextT=(coord:number,min:number,st:number,s:number)=>((min+(s>0?coord+1:coord)*st-origin.getComponent(coord===0?0:coord===1?1:2))/(s===0?1e-12:direction.getComponent(coord===0?0:coord===1?1:2)));
  let best=Infinity;
  const axisData=(coord:number,min:number,st:number,s:number)=>{
    const d=direction.getComponent(coord);
    if(Math.abs(d)<1e-10)return {t:Infinity,delta:Infinity};
    const boundary=min+(s>0?(coord===0?x:coord===1?y:z)+1:(coord===0?x:coord===1?y:z))*st;
    return {t:(boundary-origin.getComponent(coord))/d,delta:Math.abs(st/d)};
  };
  let ax=axisData(0,grid.min.x,step.x,sx),ay=axisData(1,grid.min.y,step.y,sy),az=axisData(2,grid.min.z,step.z,sz);
  const visited=new Set<number>();
  for(let guard=0;guard<dims[0]+dims[1]+dims[2]+96;guard++){
    if(x<0||x>=dims[0]||y<0||y>=dims[1]||z<0||z>=dims[2])break;
    const k=cellKey(x,y,z,dims[0],dims[1]);
    const list=grid.cells.get(k);
    if(list)for(const ti of list){
      if(visited.has(ti))continue;
      visited.add(ti);
      const [ia,ib,ic]=triangles[ti]!;
      const d=rayTriangleDistance(origin,direction,positions[ia]!,positions[ib]!,positions[ic]!);
      if(d<best)best=d;
    }
    const next=Math.min(ax.t,ay.t,az.t);
    if(best<Infinity&&next>best+1e-5)break;
    if(next===Infinity)break;
    if(ax.t<=ay.t&&ax.t<=az.t){x+=sx;ax.t+=ax.delta;}
    else if(ay.t<=az.t){y+=sy;ay.t+=ay.delta;}
    else{z+=sz;az.t+=az.delta;}
  }
  return best;
};

export const buildAurumThicknessMap=(target:any,thicknessScale=1,size=96):ThicknessMapResult|null=>{
  const cacheKey=`${geometryCacheIdentity(target)}:${size}:${Number(thicknessScale??1).toFixed(4)}`;
  const cached=AURUM_THICKNESS_CACHE.get(cacheKey);
  if(cached)return cached;
  const geometry=target?.geometry;
  const position=geometry?.getAttribute?.("position");
  const normal=geometry?.getAttribute?.("normal");
  const uv=geometry?.getAttribute?.("uv");
  if(!geometry||!position||!normal||!uv||normal.count!==position.count||uv.count!==position.count||position.count<3)return null;
  for(let i=0;i<uv.count;i++){
    const u=uv.getX(i),v=uv.getY(i);
    if(!Number.isFinite(u)||!Number.isFinite(v)||u<-0.001||u>1.001||v<-0.001||v>1.001)return null;
  }
  const positions:Array<THREE.Vector3>=Array.from({length:position.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(position,i));
  const normals:Array<THREE.Vector3>=Array.from({length:position.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(normal,i).normalize());
  const triangles:Tri[]=geometry.index
    ? Array.from({length:Math.floor(geometry.index.count/3)},(_,i)=>[geometry.index.getX(i*3),geometry.index.getX(i*3+1),geometry.index.getX(i*3+2)])
    : Array.from({length:Math.floor(position.count/3)},(_,i)=>[i*3,i*3+1,i*3+2]);
  if(triangles.length>250000)return null;

  const center=positions.reduce((c,p)=>c.add(p),new THREE.Vector3()).multiplyScalar(1/positions.length);
  const grid=buildGrid(positions,triangles);
  const depths=new Float32Array(position.count);
  let hits=0,minDepth=Infinity,maxDepth=0;

  for(let i=0;i<position.count;i++){
    const origin=positions[i]!;
    const direction=normals[i]!.clone();
    if(direction.dot(center.clone().sub(origin))<0)direction.negate();
    const rayOrigin=origin.clone().addScaledVector(direction,1e-4);
    const d=gridRayDistance(rayOrigin,direction,grid,positions,triangles);
    if(Number.isFinite(d)){depths[i]=d;hits++;minDepth=Math.min(minDepth,d);maxDepth=Math.max(maxDepth,d);}
  }

  const hitRatio=hits/position.count;
  if(hitRatio<0.55||!Number.isFinite(maxDepth)||maxDepth<=0)return null;

  const data=new Uint8Array(size*size*4),coverage=new Uint8Array(size*size);
  const writePixel=(x:number,y:number,value:number)=>{
    const i=(y*size+x)*4;data[i]=255;data[i+1]=Math.round(Math.max(0,Math.min(1,value))*255);data[i+2]=255;data[i+3]=255;coverage[y*size+x]=1;
  };
  const uvAt=(i:number)=>new THREE.Vector2(uv.getX(i),uv.getY(i));
  for(const [ia,ib,ic] of triangles){
    if(!depths[ia]||!depths[ib]||!depths[ic])continue;
    const ua=uvAt(ia),ub=uvAt(ib),uc=uvAt(ic);
    const minU=Math.max(0,Math.floor(Math.min(ua.x,ub.x,uc.x)*size)-1),maxU=Math.min(size-1,Math.ceil(Math.max(ua.x,ub.x,uc.x)*size)+1);
    const minV=Math.max(0,Math.floor(Math.min(ua.y,ub.y,uc.y)*size)-1),maxV=Math.min(size-1,Math.ceil(Math.max(ua.y,ub.y,uc.y)*size)+1);
    for(let y=minV;y<=maxV;y++)for(let x=minU;x<=maxU;x++){
      const weights=barycentric(new THREE.Vector2((x+.5)/size,(y+.5)/size),ua,ub,uc);
      if(!weights)continue;
      const depth=depths[ia]*weights[0]+depths[ib]*weights[1]+depths[ic]*weights[2];
      writePixel(x,y,depth/(maxDepth*1.05));
    }
  }
  let covered=0;for(const v of coverage)covered+=v;
  if(covered<Math.max(32,size*size*.01))return null;

  const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat,THREE.UnsignedByteType);
  texture.colorSpace=THREE.NoColorSpace;texture.wrapS=THREE.ClampToEdgeWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
  const result={texture,baseThickness:Math.max(.015,maxDepth*1.05*Math.max(.5,Math.min(1.5,Number(thicknessScale??1)))),hitRatio,minDepth,maxDepth,method:"uv-ray-depth-grid-v3" as const,cacheKey,normalMapRes:size};
  AURUM_THICKNESS_CACHE.set(cacheKey,result);
  return result;
};
