import * as THREE from "three";
import { getAurumModelParts } from "./model-parts";
import { resolveAurumLayerKey } from "./layer-identity";

function isRhinoObjectHidden(attributes:any): boolean {
  if (!attributes) return false;

  // Rhino/rhino3dm puede exponer la visibilidad con nombres distintos según
  // la versión del loader. Tratamos explícitamente todos los estados ocultos.
  const mode = attributes.mode ?? attributes.Mode ?? attributes.objectMode ?? attributes.ObjectMode;
  const modeText = typeof mode === "string" ? mode.toLowerCase() : "";
  return attributes.visible === false
    || attributes.Visible === false
    || attributes.isVisible === false
    || mode === 1
    || modeText === "hidden"
    || modeText === "hidden_object"
    || modeText === "hiddenobject";
}

function buildRhinoLayerVisibility(layers:any[]) {
  const byId = new Map<string, any>();
  const byName = new Map<string, any>();
  for (const layer of layers) {
    const id = layer?.id ?? layer?.Id;
    if (id != null) byId.set(String(id), layer);
    const name = String(layer?.name ?? layer?.Name ?? "").trim().toLowerCase();
    if (name) byName.set(name, layer);
  }

  const cache = new Map<number, boolean>();

  const layerIsDirectlyVisible = (layer:any): boolean => {
    if (!layer) return true;
    const mode = layer.mode ?? layer.Mode ?? layer.visibilityMode ?? layer.VisibilityMode;
    const modeText = typeof mode === "string" ? mode.toLowerCase() : "";
    return layer.visible !== false
      && layer.Visible !== false
      && layer.isVisible !== false
      && layer.visibility !== false
      && mode !== 1
      && modeText !== "hidden"
      && modeText !== "hidden_layer"
      && modeText !== "hiddenlayer";
  };

  const isLayerEffectivelyVisible = (index:number, trail = new Set<number>()): boolean => {
    if (index < 0 || index >= layers.length) return true;
    if (cache.has(index)) return cache.get(index)!;
    if (trail.has(index)) return true;

    const layer = layers[index];
    if (!layer) return true;

    if (!layerIsDirectlyVisible(layer)) {
      cache.set(index, false);
      return false;
    }

    const parentId = layer.parentLayerId ?? layer.parentId ?? layer.parentLayerID ?? layer.ParentLayerId;
    if (parentId != null && String(parentId) && String(parentId) !== "00000000-0000-0000-0000-000000000000") {
      const parent = byId.get(String(parentId));
      if (parent) {
        const parentIndex = layers.indexOf(parent);
        if (parentIndex >= 0) {
          const nextTrail = new Set(trail);
          nextTrail.add(index);
          const visible = isLayerEffectivelyVisible(parentIndex, nextTrail);
          cache.set(index, visible);
          return visible;
        }
      }
    }

    cache.set(index, true);
    return true;
  };

  return (index:number, layerName?:string): boolean => {
    if (Number.isInteger(index) && index >= 0 && index < layers.length) {
      return isLayerEffectivelyVisible(index);
    }

    const name = String(layerName ?? "").trim().toLowerCase();
    if (name) {
      const layer = byName.get(name);
      if (layer) {
        const resolvedIndex = layers.indexOf(layer);
        if (resolvedIndex >= 0) return isLayerEffectivelyVisible(resolvedIndex);
      }
    }

    return true;
  };
}

function resolveRhinoLayerIndex(x:any): number {
  const candidates = [
    x?.userData?.aurumRhino?.layerIndex,
    x?.userData?.attributes?.layerIndex,
    x?.userData?.attributes?.LayerIndex,
    x?.userData?.layerIndex,
    x?.userData?.LayerIndex,
  ];
  for (const value of candidates) {
    if (value === null || value === undefined || value === "") continue;
    const n = typeof value === "number" ? value : Number(value);
    if (Number.isInteger(n) && n >= 0) return n;
  }
  return -1;
}

function colorToHex(color:any): string | undefined {
  if (typeof color === "string") {
    const match = color.match(/^#?([0-9a-f]{6})$/i);
    return match?.[1] ? "#" + match[1].toLowerCase() : undefined;
  }
  let channels:any[] | undefined;
  if (Array.isArray(color) && color.length >= 3) channels = color.slice(0,3);
  else if (color && typeof color === "object") {
    if (color.r !== undefined || color.R !== undefined) channels = [color.r ?? color.R, color.g ?? color.G, color.b ?? color.B];
    else if (color.red !== undefined || color.Red !== undefined) channels = [color.red ?? color.Red, color.green ?? color.Green, color.blue ?? color.Blue];
  }
  if (!channels || !channels.every((v:any) => Number.isFinite(Number(v)))) return undefined;
  let rgb = channels.map((v:any) => Number(v));
  // Some exporters expose normalized 0..1 RGB; Rhino layer colors are commonly 0..255.
  if (Math.max(...rgb) <= 1) rgb = rgb.map(v => v * 255);
  return "#" + rgb.map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("");
}

function classifyRhinoLayer(name:string,colorCapa?:string,clasificarCapa?:(capa:string,colorCapa?:string)=>"metal"|"gema"|"otro"):"metal"|"gema"|"otro" {
  const normalizedName=String(name??"").trim().toLowerCase();
  if (/(gema|gem|piedra|stone|diamante|diamond|zafiro|sapphire|rubi|rub[ií]|ruby|esmeralda|emerald|moissanita|moissanite|citrino|amatista|topacio)/.test(normalizedName)) return "gema";
  if (/(metal|oro|gold|plata|silver|platino|platinum|acero|steel|met[aá]lico)/.test(normalizedName)) return "metal";
  // Color alone is not sufficient to decide between gemstone and metal.
  // MatrixGold layer RGB values must be explicitly mapped from the user's template.
  return clasificarCapa?.(name,colorCapa) ?? "otro";
}

function matrixSlotFromLayer(name:string,category:"metal"|"gema"|"otro",_colorCapa?:string):number|undefined {
  if (category==="otro") return undefined;
  const match=String(name??"").trim().toLowerCase().match(/(?:metal|gema|gem|piedra|stone)[\s_-]*([1-4])\b/);
  return match ? Number(match[1]) : undefined;
}

/**
 * Resolve each mesh from its own Rhino layer index/name and the root layer table.
 * Never pair source and exported meshes by traversal order: GLTF export may reorder nodes.
 */
function hydrateRhinoLayerMetadata(
  object:any,
  clasificarCapa:(capa:string,colorCapa?:string)=>"metal"|"gema"|"otro"
) {
  const rootData=object?.userData??{};
  const layers=Array.isArray(rootData.layers)?rootData.layers:
    Array.isArray(rootData.rhinoLayers)?rootData.rhinoLayers:[];
  const byId=new Map<string,any>();
  const byName=new Map<string,any>();
  layers.forEach((layer:any,index:number)=>{
    const id=layer?.id??layer?.Id;
    if(id!=null)byId.set(String(id),layer);
    const name=String(layer?.name??layer?.Name??"").trim().toLowerCase();
    if(name)byName.set(name,layer);
    // Keep index lookup implicit through the original array.
    void index;
  });

  const audit={meshes:0,meshesWithLayerKey:0,unresolvedMeshes:0,categoryCounts:{metal:0,gema:0,otro:0} as Record<string,number>,layers:{} as Record<string,number>};
  object?.traverse?.((x:any)=>{
    if(!x?.isMesh)return;
    audit.meshes++;
    const data=x.userData??{};
    const attrs=data.attributes??{};
    const existing=data.aurumRhino??{};
    const layerIndex=resolveRhinoLayerIndex(x);
    const layerId=attrs.layerId??attrs.LayerId??data.layerId??data.LayerId??existing.rhinoLayerId;
    let layer=layerIndex>=0?layers[layerIndex]:undefined;
    if(!layer&&layerId!=null)layer=byId.get(String(layerId));
    const rawName=layer?.name??layer?.Name??data.rhinoLayer?.name??data.rhinoLayer?.Name??
      data.RhinoLayer?.name??data.RhinoLayer?.Name??attrs.layerName??attrs.LayerName??
      data.layerName??data.LayerName??existing.capa??"";
    const layerName=String(rawName??"").trim();
    if(!layer&&layerName)layer=byName.get(layerName.toLowerCase());
    const color=colorToHex(layer?.color??layer?.Color??data.rhinoLayer?.color??data.RhinoLayer?.color??
      attrs.layerColor??attrs.LayerColor??existing.colorCapa);
    const hasResolvedLayer=Boolean(layerName||color);
    const category=hasResolvedLayer
      ? classifyRhinoLayer(layerName,color,clasificarCapa)
      : (existing.categoria??classifyRhinoLayer(String(existing.capa??""),existing.colorCapa,clasificarCapa));
    const resolvedLayerIndex=layerIndex>=0?layerIndex:(Number.isInteger(existing.layerIndex)&&existing.layerIndex>=0?existing.layerIndex:-1);
    const resolvedLayerId=layer?.id??layer?.Id??layerId??existing.rhinoLayerId??null;
    const layerKey=resolveAurumLayerKey({layerId:resolvedLayerId,layerIndex:resolvedLayerIndex,layerName:layerName||existing.capa,layerColor:color||existing.colorCapa,category,existingKey:existing.layerKey});
    const matrixSlot=matrixSlotFromLayer(layerName,category,color)??existing.matrixSlot;
    const hasAnyLayerEvidence=!!layerName||!!color||layerIndex>=0||layerId!=null||!!existing.capa||!!existing.layerKey;
    if(!hasAnyLayerEvidence){audit.unresolvedMeshes++;audit.categoryCounts["otro"]=(audit.categoryCounts["otro"]??0)+1;return;}

    if(layerKey){audit.meshesWithLayerKey++;audit.layers[layerKey]=(audit.layers[layerKey]??0)+1;}
    audit.categoryCounts[category]=(audit.categoryCounts[category]??0)+1;
    x.userData={
      ...data,
      aurumRhino:{
        ...existing,
        capa:layerName||existing.capa||(layerIndex>=0?`Capa ${layerIndex+1}`:undefined),
        colorCapa:color||existing.colorCapa||undefined,
        categoria:category,
        layerIndex:resolvedLayerIndex,
        layerKey,
        matrixSlot,
        rhinoLayerId:resolvedLayerId,
        rhinoMaterialIndex:attrs.materialIndex??existing.rhinoMaterialIndex??null,
        visible:x.visible!==false,
        hiddenByRhino:x.visible===false,
      },
    };
  });
  object.userData={...(object.userData??{}),aurumLayerMetadataAudit:{...audit,source:"GLB node extras + source layer table"}};
  if(audit.unresolvedMeshes>0||audit.meshesWithLayerKey!==audit.meshes){
    console.warn("[AURUM][LAYER METADATA AUDIT]",object.userData.aurumLayerMetadataAudit);
  }else{
    console.info("[AURUM][LAYER METADATA AUDIT]",object.userData.aurumLayerMetadataAudit);
  }
  object.updateMatrixWorld?.(true);
}

export async function normalizeAurumModel(
  object:any,
  glb:ArrayBuffer | null,
  extension:string,
  colorRhinoHex:(color:any)=>string|undefined,
  clasificarCapa:(capa:string,colorCapa?:string)=> "metal"|"gema"|"otro"
) {
  // The source mesh metadata is stamped before export; the internal GLB is then
  // hydrated from each node's stable Rhino layer identity.
  // 3DM es la entrada oficial. Su representación de ejecución es el GLB
  // generado internamente. El Object3D Rhino se usa para preparar/exportar,
  // pero el visor trabaja finalmente sobre el GLB, igual que el activo oficial.
  if (extension === "3dm") {
    if (!glb) throw new Error("No se generó el GLB interno del archivo 3DM.");
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
    const interno = (await new GLTFLoader().parseAsync(glb,"")).scene;
    // The exported GLB already carries the layer metadata used by
    // iJewel. Read it from the GLB itself instead of matching meshes by
    // traversal index. Mesh order is not a stable MatrixGold layer identity.
    hydrateRhinoLayerMetadata(interno,clasificarCapa);

    // Do not assign source metadata by mesh traversal order: the GLB exporter can
    // reorder or split meshes. Unresolved meshes remain category "otro" and can be
    // selected individually; never silently apply a wrong layer's material.
    interno.updateMatrixWorld(true);
    return interno;
  }

  // GLB ya fue parseado por parseAurumInput(). No lo serializamos ni
  // parseamos una segunda vez: conservar el Object3D original evita una
  // conversión redundante y mantiene intactas sus normales/materiales authored.
  if (extension === "glb") {
    // Official iJewel-style GLBs carry the layer assignment in node extras.
    // Hydrate it directly so the same MatrixGold layer rules work for GLB input.
    hydrateRhinoLayerMetadata(object,clasificarCapa);
    object?.updateMatrixWorld?.(true);
    return object;
  }

  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  const interno = (await new GLTFLoader().parseAsync(glb as ArrayBuffer,"")).scene;
  return interno;
}
