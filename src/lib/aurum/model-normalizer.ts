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
    if (trail.has(index)) return true; // protect against malformed layer cycles

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

    // Si el loader no entregó layerIndex, no debemos asumir que la capa está
    // visible. Intentamos resolverla por nombre antes de aplicar el fallback.
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

export async function normalizeAurumModel(
  object:any,
  glb:ArrayBuffer,
  extension:string,
  colorRhinoHex:(color:any)=>string|undefined,
  clasificarCapa:(capa:string,colorCapa?:string)=> "metal"|"gema"|"otro"
) {
  const metadataCapas = extension === "3dm"
    ? getAurumModelParts(object,colorRhinoHex,clasificarCapa)
        .filter(p=>p.tipo==="malla")
        .map(p=>({nombre:p.nombre,capa:p.capa,colorCapa:p.colorCapa,categoria:p.categoria,matrixSlot:p.matrixSlot}))
    : [];

  // En 3DM conservamos directamente el render mesh producido por
  // Rhino3dmLoader. Esto elimina el round-trip 3DM -> GLB -> GLTFLoader
  // durante el render y permite comparar el shading de la malla Rhino original.
  if (extension === "3dm") {
    const layers = Array.isArray(object?.userData?.layers) ? object.userData.layers : [];
    const isLayerEffectivelyVisible = buildRhinoLayerVisibility(layers);

    let i = 0;
    object?.traverse?.((x:any) => {
      if (!x.isMesh) return;

      const meta = metadataCapas[i++];
      if (!meta) return;

      const attrs = x.userData?.attributes || {};
      const layerIndex = resolveRhinoLayerIndex(x);
      const objectVisible = !isRhinoObjectHidden(attrs);
      const layerVisible = isLayerEffectivelyVisible(layerIndex, meta.capa);

      // Rhino puede ocultar un objeto directamente o mediante su capa.
      // Nunca hacemos visible una malla que venga de una capa oculta.
      const visible = objectVisible && layerVisible;

      x.visible = x.visible !== false && visible;
      x.userData = {
        ...x.userData,
        aurumRhino: {
          ...meta,
          visible,
          hiddenByRhino: !visible,
        },
      };
    });
    object?.updateMatrixWorld?.(true);
    return object;
  }

  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  const interno = (await new GLTFLoader().parseAsync(glb,"")).scene;
  return interno;
}
