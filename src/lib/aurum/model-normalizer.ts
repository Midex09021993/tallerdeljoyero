import * as THREE from "three";
import { getAurumModelParts } from "./model-parts";

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
    x?.userData?.attributes?.layerIndex,
    x?.userData?.attributes?.LayerIndex,
    x?.userData?.layerIndex,
    x?.userData?.LayerIndex,
  ];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isInteger(n) && n >= 0) return n;
  }
  return -1;
}

function classifyRhinoLayer(name:string,colorCapa?:string,clasificarCapa?:(capa:string,colorCapa?:string)=>"metal"|"gema"|"otro"):"metal"|"gema"|"otro" {
  const n=String(name??"").trim().toLowerCase();
  if (/(gema|gem|piedra|stone|diamante|diamond|zafiro|sapphire|rubi|rub[ií]|esmeralda|emerald|moissanita|moissanite)/.test(n)) return "gema";
  if (/(metal|oro|gold|plata|silver|platino|platinum|met[aá]lico)/.test(n)) return "metal";
  return clasificarCapa?.(name,colorCapa) ?? "otro";
}

function matrixSlotFromLayer(name:string,category:"metal"|"gema"|"otro"):number|undefined {
  if (category==="otro") return undefined;
  const match=String(name??"").trim().toLowerCase().match(/(?:metal|gema|gem|piedra|stone)[\s_-]*([1-4])\b/);
  if (match) return Number(match[1]);
  return undefined;
}

/**
 * iJewel reference GLB stores authoritative MatrixGold assignment on each
 * node: node extras contain rhinoLayer and attributes.layerIndex.
 * Never infer assignment from mesh traversal order or GLTF material index.
 */
function hydrateRhinoLayerMetadata(
  object:any,
  clasificarCapa:(capa:string,colorCapa?:string)=>"metal"|"gema"|"otro"
) {
  object?.traverse?.((x:any)=>{
    if (!x?.isMesh) return;
    const data=x.userData??{};
    const layer=data.rhinoLayer ?? data.RhinoLayer ?? null;
    const attrs=data.attributes ?? {};
    const layerName=String(
      layer?.name ??
      layer?.Name ??
      attrs.layerName ??
      attrs.LayerName ??
      data.layerName ??
      ""
    ).trim();
    const layerIndex=resolveRhinoLayerIndex(x);
    const color=layer?.color ?? layer?.Color;
    const colorCapa=typeof color==="string"
      ? color
      : color
        ? "#"+[color.r??color.R,color.g??color.G,color.b??color.B]
            .map((v:any)=>Math.max(0,Math.min(255,Math.round(Number(v)||0))).toString(16).padStart(2,"0"))
            .join("")
        : undefined;
    const category=classifyRhinoLayer(layerName,colorCapa,clasificarCapa);
    const matrixSlot=matrixSlotFromLayer(layerName,category);
    const existing=data.aurumRhino??{};
    if (!layerName && !existing.capa) return;

    x.userData={
      ...data,
      aurumRhino:{
        ...existing,
        capa:layerName || existing.capa || undefined,
        colorCapa:colorCapa || existing.colorCapa || undefined,
        categoria:category,
        layerIndex:layerIndex>=0 ? layerIndex : (existing.layerIndex ?? -1),
        matrixSlot:matrixSlot ?? existing.matrixSlot,
        rhinoLayerId:layer?.id ?? layer?.Id ?? existing.rhinoLayerId ?? null,
        rhinoMaterialIndex:attrs.materialIndex ?? existing.rhinoMaterialIndex ?? null,
        visible:x.visible!==false,
        hiddenByRhino:x.visible===false,
      },
    };
  });
  object.updateMatrixWorld?.(true);
}

export async function normalizeAurumModel(
  object:any,
  glb:ArrayBuffer | null,
  extension:string,
  colorRhinoHex:(color:any)=>string|undefined,
  clasificarCapa:(capa:string,colorCapa?:string)=> "metal"|"gema"|"otro"
) {
  // Do not traverse the Rhino scene just to build fallback metadata on every load.
  // The internal GLB is authoritative and carries Rhino layer extras. We only
  // reconstruct legacy metadata if the exported GLB actually lacks that data.
  let metadataCapas:any[] = [];

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

    // Fallback only for legacy 3DM exports that did not preserve Rhino extras.
    const unresolved:any[]=[];
    interno.traverse((x:any)=>{ if(x.isMesh && !x.userData?.aurumRhino?.capa) unresolved.push(x); });
    if (unresolved.length) {
      metadataCapas = getAurumModelParts(object,colorRhinoHex,clasificarCapa)
        .filter(p=>p.tipo==="malla")
        .map(p=>({
          nombre:p.nombre,
          capa:p.capa,
          colorCapa:p.colorCapa,
          categoria:p.categoria,
          matrixSlot:p.matrixSlot,
          layerIndex:p.layerIndex,
        }));
      metadataCapas.forEach((meta:any,index:number)=>{
        const x=unresolved[index];
        if(!x) return;
        x.userData={
          ...x.userData,
          aurumRhino:{
            ...meta,
            layerIndex:meta.layerIndex ?? -1,
            visible:x.visible!==false,
            hiddenByRhino:x.visible===false,
          },
        };
      });
    }
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
  const interno = (await new GLTFLoader().parseAsync(glb,"")).scene;
  return interno;
}
