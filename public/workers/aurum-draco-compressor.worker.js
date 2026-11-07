/* AURUM Draco 1.5.7 browser worker. Keeps the source GLB untouched on failure. */
let encoderModulePromise;
async function getEncoder() {
  if (!encoderModulePromise) {
    encoderModulePromise = (async () => {
      importScripts("/draco/1.5.7/draco_encoder.js");
      const response = await fetch("/draco/1.5.7/draco_encoder.wasm");
      if (!response.ok) throw new Error("No se pudo cargar el encoder Draco local.");
      return await self.DracoEncoderModule({ wasmBinary: await response.arrayBuffer() });
    })().catch((error) => { encoderModulePromise = undefined; throw error; });
  }
  return encoderModulePromise;
}
function align4(value) { return (value + 3) & ~3; }
function readAccessor(gltf, bin, index) {
  const accessor = gltf.accessors[index];
  if (!accessor || accessor.sparse) throw new Error("Accessor Draco no compatible.");
  const view = gltf.bufferViews[accessor.bufferView];
  if (!view || view.buffer !== 0) throw new Error("BufferView Draco no compatible.");
  const components = ({ SCALAR:1, VEC2:2, VEC3:3, VEC4:4 })[accessor.type];
  const bytes = ({ 5120:1, 5121:1, 5122:2, 5123:2, 5125:4, 5126:4 })[accessor.componentType];
  if (!components || !bytes) throw new Error("Tipo de accessor Draco no compatible.");
  const stride = view.byteStride || components * bytes;
  const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  const dv = new DataView(bin), values = new Float32Array(accessor.count * components);
  const read = (offset) => {
    switch (accessor.componentType) {
      case 5120: return dv.getInt8(offset);
      case 5121: return dv.getUint8(offset);
      case 5122: return dv.getInt16(offset, true);
      case 5123: return dv.getUint16(offset, true);
      case 5125: return dv.getUint32(offset, true);
      default: return dv.getFloat32(offset, true);
    }
  };
  for (let i=0;i<accessor.count;i++) for(let c=0;c<components;c++) {
    let value=read(start+i*stride+c*bytes);
    if (accessor.normalized && accessor.componentType !== 5126) {
      if (accessor.componentType===5120) value=Math.max(value/127,-1);
      else if (accessor.componentType===5121) value/=255;
      else if (accessor.componentType===5122) value=Math.max(value/32767,-1);
      else if (accessor.componentType===5123) value/=65535;
      else if (accessor.componentType===5125) value/=4294967295;
    }
    values[i*components+c]=value;
  }
  return { values, count:accessor.count, components };
}
function parseGlb(buffer) {
  const view=new DataView(buffer);
  if(view.getUint32(0,true)!==0x46546c67 || view.getUint32(4,true)!==2) throw new Error("GLB inválido.");
  let offset=12,json=null,bin=null;
  while(offset+8<=buffer.byteLength) {
    const length=view.getUint32(offset,true),type=view.getUint32(offset+4,true); offset+=8;
    if(offset+length>buffer.byteLength) throw new Error("Chunk GLB truncado.");
    if(type===0x4e4f534a) json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,offset,length)).trim());
    else if(type===0x004e4942) bin=buffer.slice(offset,offset+length);
    offset+=length;
  }
  if(!json || !bin || !json.buffers?.[0]) throw new Error("GLB sin JSON/BIN válido.");
  return {json,bin};
}
function buildGlb(json,bin) {
  const jsonBytes=new TextEncoder().encode(JSON.stringify(json));
  const jsonLength=align4(jsonBytes.length),binLength=align4(bin.byteLength),total=12+8+jsonLength+8+binLength;
  const out=new ArrayBuffer(total),dv=new DataView(out),bytes=new Uint8Array(out);
  dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,total,true);
  dv.setUint32(12,jsonLength,true);dv.setUint32(16,0x4e4f534a,true);
  bytes.fill(0x20,20,20+jsonLength);bytes.set(jsonBytes,20);
  const header=20+jsonLength;dv.setUint32(header,binLength,true);dv.setUint32(header+4,0x004e4942,true);
  bytes.set(new Uint8Array(bin),header+8);json.buffers[0].byteLength=bin.byteLength;
  return out;
}

function stripCompressedFallbacks(json, bin, compressedAccessorIndices, dracoBufferViews) {
  const uncompressedAccessorIndices = new Set();
  for (const mesh of (json.meshes || [])) for (const primitive of (mesh.primitives || [])) {
    if (primitive.extensions?.KHR_draco_mesh_compression) continue;
    for (const index of Object.values(primitive.attributes || {})) uncompressedAccessorIndices.add(index);
    if (primitive.indices !== undefined) uncompressedAccessorIndices.add(primitive.indices);
    for (const target of (primitive.targets || [])) for (const index of Object.values(target || {})) uncompressedAccessorIndices.add(index);
  }
  const removable = new Set([...compressedAccessorIndices].filter(index => !uncompressedAccessorIndices.has(index)));
  for (const index of removable) {
    const accessor = json.accessors[index];
    if (accessor) { delete accessor.bufferView; delete accessor.byteOffset; }
  }
  const accessorRefs = new Map();
  (json.accessors || []).forEach((accessor, index) => {
    if (accessor.bufferView === undefined) return;
    const refs = accessorRefs.get(accessor.bufferView) || [];
    refs.push(index); accessorRefs.set(accessor.bufferView, refs);
  });
  const imageViews = new Set((json.images || []).map(image => image.bufferView).filter(index => index !== undefined));
  const keep = [];
  (json.bufferViews || []).forEach((view, index) => {
    const refs = accessorRefs.get(index) || [];
    // A bufferView with no remaining accessor references is also removable.
    // The previous refs.length > 0 guard accidentally retained every original
    // geometry bufferView after its accessors had been detached for Draco.
    const onlyCompressedAccessors = refs.every(ref => removable.has(ref));
    if (!onlyCompressedAccessors || imageViews.has(index) || dracoBufferViews.has(index)) keep.push(index);
  });
  const remap = new Map(), nextViews = [], chunks = [];
  let nextOffset = 0;
  for (const oldIndex of keep) {
    const view = json.bufferViews[oldIndex];
    if (view.buffer !== undefined && view.buffer !== 0) {
      remap.set(oldIndex, nextViews.length); nextViews.push(view); continue;
    }
    const oldOffset = view.byteOffset || 0;
    const start = align4(nextOffset);
    if (start > nextOffset) chunks.push(new Uint8Array(start - nextOffset));
    const chunk = bin.slice(oldOffset, oldOffset + view.byteLength);
    const updated = { ...view, byteOffset: start };
    remap.set(oldIndex, nextViews.length); nextViews.push(updated);
    chunks.push(new Uint8Array(chunk)); nextOffset = start + chunk.byteLength;
  }
  for (const accessor of (json.accessors || [])) {
    if (accessor.bufferView !== undefined && remap.has(accessor.bufferView)) accessor.bufferView = remap.get(accessor.bufferView);
  }
  for (const image of (json.images || [])) {
    if (image.bufferView !== undefined && remap.has(image.bufferView)) image.bufferView = remap.get(image.bufferView);
  }
  json.bufferViews = nextViews;
  const packed = new Uint8Array(nextOffset);
  let cursor = 0;
  for (const chunk of chunks) { packed.set(chunk, cursor); cursor += chunk.byteLength; }
  return packed.buffer;
}

async function compress(buffer) {
  const diagnostics = [];
  const stats = { total: 0, compressed: 0, skipped: 0, attributesAdded: 0, attributesRejected: 0 };
  const record = (entry) => {
    if (diagnostics.length < 250) diagnostics.push(entry);
  };
  const {json,bin}=parseGlb(buffer),Module=await getEncoder(),originalBytes=buffer.byteLength;
  json.bufferViews=json.bufferViews||[];
  if((json.buffers||[]).length!==1 || json.bufferViews.some(view=>view.buffer!==undefined && view.buffer!==0)) {
    record({status:"rejected",reason:"unsupported-buffer-layout",buffers:(json.buffers||[]).length,bufferViews:json.bufferViews.length});
    return {buffer,compressed:0,originalBytes,outputBytes:originalBytes,diagnostics,stats};
  }
  const parts=[new Uint8Array(bin)];let length=bin.byteLength,compressed=0;
  const compressedAccessorIndices=new Set(),dracoBufferViews=new Set();
  const encoder=new Module.Encoder(),builder=new Module.MeshBuilder();
  encoder.SetEncodingMethod(Module.MESH_EDGEBREAKER_ENCODING);encoder.SetSpeedOptions(5,5);
  encoder.SetAttributeQuantization(Module.POSITION,16);encoder.SetAttributeQuantization(Module.NORMAL,12);encoder.SetAttributeQuantization(Module.TEX_COORD,14);
  try {
    for(let meshIndex=0;meshIndex<(json.meshes||[]).length;meshIndex++) {
      const mesh=json.meshes[meshIndex];
      for(let primitiveIndex=0;primitiveIndex<(mesh.primitives||[]).length;primitiveIndex++) {
        const primitive=mesh.primitives[primitiveIndex];
        stats.total++;
        const context={meshIndex,primitiveIndex};
        const skip=(reason,extra={})=>{stats.skipped++;record({...context,status:"skipped",reason,...extra});};
        if((primitive.mode??4)!==4){skip("primitive-mode-not-triangles",{mode:primitive.mode??4});continue;}
        if(!primitive.attributes){skip("missing-attributes");continue;}
        if(primitive.extensions?.KHR_draco_mesh_compression){skip("already-draco-compressed");continue;}
        const positionIndex=primitive.attributes.POSITION;
        if(positionIndex===undefined){skip("missing-position");continue;}
        const position=readAccessor(json,bin,positionIndex);
        if(position.components!==3 || position.count<3){skip("invalid-position-shape",{components:position.components,count:position.count});continue;}
        let indices;
        if(primitive.indices!==undefined) {
          const idx=readAccessor(json,bin,primitive.indices);
          if(idx.components!==1){skip("indices-not-scalar",{components:idx.components});continue;}
          indices=new Int32Array(idx.values.length);for(let i=0;i<indices.length;i++) indices[i]=idx.values[i];
        } else {
          if(position.count%3!==0){skip("non-indexed-vertex-count-not-divisible-by-three",{vertexCount:position.count});continue;}
          indices=new Int32Array(position.count);for(let i=0;i<indices.length;i++) indices[i]=i;
        }
        if(indices.length%3!==0){skip("index-count-not-divisible-by-three",{indexCount:indices.length});continue;}
        let invalidIndex=-1;
        for(let i=0;i<indices.length;i++){if(indices[i]<0||indices[i]>=position.count){invalidIndex=indices[i];break;}}
        if(invalidIndex!==-1){skip("index-out-of-range",{invalidIndex,vertexCount:position.count});continue;}
        const dracoMesh=new Module.Mesh();
        if(!builder.AddFacesToMesh(dracoMesh,indices.length/3,indices)){
          dracoMesh.__destroy__();skip("AddFacesToMesh-returned-false",{faceCount:indices.length/3,vertexCount:position.count});continue;
        }
        const attributeIds={},attributeResults={};
        const addAttribute=(semantic,type,index,components) => {
          if(index===undefined){attributeResults[semantic]="absent";return;}
          const attr=readAccessor(json,bin,index);
          if(attr.count!==position.count || (components && attr.components!==components)){
            attributeResults[semantic]="rejected-shape";
            stats.attributesRejected++;
            record({...context,status:"attribute-rejected",semantic,reason:"attribute-shape-mismatch",attributeCount:attr.count,vertexCount:position.count,components:attr.components,expectedComponents:components??"any"});
            return;
          }
          const id=builder.AddFloatAttributeToMesh(dracoMesh,type,attr.count,attr.components,attr.values);
          if(id>=0){attributeIds[semantic]=id;attributeResults[semantic]="added";stats.attributesAdded++;}
          else {
            attributeResults[semantic]="rejected-by-encoder";
            stats.attributesRejected++;
            record({...context,status:"attribute-rejected",semantic,reason:"AddFloatAttributeToMesh-returned-negative",result:id});
          }
        };
        addAttribute("POSITION",Module.POSITION,positionIndex,3);
        addAttribute("NORMAL",Module.NORMAL,primitive.attributes.NORMAL,3);
        addAttribute("TEXCOORD_0",Module.TEX_COORD,primitive.attributes.TEXCOORD_0,2);
        addAttribute("COLOR_0",Module.COLOR,primitive.attributes.COLOR_0,null);
        addAttribute("TANGENT",Module.GENERIC,primitive.attributes.TANGENT,4);
        if(attributeIds.POSITION===undefined){dracoMesh.__destroy__();skip("position-attribute-not-added",{attributeResults});continue;}
        const encoded=new Module.DracoInt8Array(),size=encoder.EncodeMeshToDracoBuffer(dracoMesh,encoded);
        dracoMesh.__destroy__();
        if(size<=0){encoded.__destroy__();skip("EncodeMeshToDracoBuffer-returned-nonpositive",{encodedSize:size,vertexCount:position.count,faceCount:indices.length/3,attributeResults});continue;}
        const payload=new Uint8Array(size);for(let i=0;i<size;i++)payload[i]=encoded.GetValue(i);encoded.__destroy__();
        const aligned=align4(length);if(aligned>length)parts.push(new Uint8Array(aligned-length));
        const bufferView=json.bufferViews.length;json.bufferViews.push({buffer:0,byteOffset:aligned,byteLength:payload.byteLength});dracoBufferViews.add(bufferView);
        parts.push(payload);length=aligned+payload.byteLength;
        primitive.extensions=primitive.extensions||{};
        primitive.extensions.KHR_draco_mesh_compression={bufferView,attributes:attributeIds};
        for(const semantic of Object.keys(attributeIds)) compressedAccessorIndices.add(primitive.attributes[semantic]);
        if(primitive.indices!==undefined) compressedAccessorIndices.add(primitive.indices);
        compressed++;stats.compressed++;
        record({...context,status:"compressed",vertexCount:position.count,faceCount:indices.length/3,encodedBytes:size,attributeResults});
      }
    }
  } finally {encoder.__destroy__();builder.__destroy__();}
  if(!compressed) {
    record({status:"summary",reason:"no-primitives-compressed"});
    return {buffer,compressed:0,originalBytes,outputBytes:originalBytes,diagnostics,stats};
  }
  const allPrimitivesCompressed=(json.meshes||[]).every(mesh=>(mesh.primitives||[]).every(primitive=>Boolean(primitive.extensions?.KHR_draco_mesh_compression)));
  if(!allPrimitivesCompressed) {
    record({status:"rejected",reason:"not-all-primitives-compressed",compressed,total:stats.total,skipped:stats.skipped});
    return {buffer,compressed:0,originalBytes,outputBytes:originalBytes,diagnostics,stats};
  }
  const binary=new Uint8Array(length);let cursor=0;for(const part of parts){binary.set(part,cursor);cursor+=part.length;}
  json.extensionsUsed=Array.from(new Set([...(json.extensionsUsed||[]),"KHR_draco_mesh_compression"]));
  json.extensionsRequired=Array.from(new Set([...(json.extensionsRequired||[]),"KHR_draco_mesh_compression"]));
  const compactBinary=stripCompressedFallbacks(json,binary.buffer,compressedAccessorIndices,dracoBufferViews);
  const output=buildGlb(json,compactBinary);
  record({status:"summary",reason:"compression-complete",compressed,total:stats.total,originalBytes,outputBytes:output.byteLength,bytesSaved:originalBytes-output.byteLength});
  return {buffer:output,compressed,originalBytes,outputBytes:output.byteLength,diagnostics,stats};
}
self.onmessage=async(event)=>{
  const {id,buffer}=event.data||{};
  try {
    const result=await compress(buffer);
    console.info("[AURUM Draco] Diagnóstico de compresión",result.stats,result.diagnostics);
    self.postMessage({id,ok:true,...result},[result.buffer]);
  } catch(error) {
    const message=error instanceof Error?error.message:String(error);
    console.error("[AURUM Draco] Fallo durante la compresión",message,error);
    self.postMessage({id,ok:false,error:message});
  }
};
