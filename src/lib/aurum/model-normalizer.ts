import * as THREE from "three";
import { getAurumModelParts } from "./model-parts";

function isRhinoObjectHidden(attributes:any): boolean {
  if (!attributes) return false;

  // rhino3dm puede exponer la visibilidad con distintas mayúsculas según
  // la versión / wrapper. Nunca convertimos un objeto explícitamente oculto
  // en visible por el hecho de ser metal o gema.
  const visibleFlags = [attributes.visible, attributes.Visible, attributes.isVisible, attributes.IsVisible];
  if (visibleFlags.some((v:any) => v === false)) return true;

  const mode = attributes.mode ?? attributes.Mode ?? attributes.objectMode ?? attributes.ObjectMode;
  const modeText = typeof mode === "string" ? mode.toLowerCase() : "";
  return mode === 1
    || modeText === "hidden"
    || modeText === "hidden_object"
    || modeText === "hiddenobject";
}

function buildRhinoLayerVisibility(layers:any[]) {
  const byId = new Map<string, any>();
  for (const layer of layers) {
    const id = layer?.id ?? layer?.Id;
    if (id != null) byId.set(String(id), layer);
  }

  const cache = new Map<number, boolean>();

  const readLayerVisibility = (layer:any): boolean => {
    if (!layer) return true;

    // Aceptamos las formas de visibilidad que pueden llegar desde rhino3dm.
    // Si alguna fuente dice explícitamente que la capa está oculta,
    // conservamos ese estado tal cual.
    const flags = [
      layer.visible,
      layer.Visible,
      layer.isVisible,
      layer.IsVisible,
      layer.visibility,
      layer.Visibility,
    ];
    const explicitFalse = flags.find((v:any) => v === false || v === 0);
    if (explicitFalse !== undefined) return false;

    const explicitTrue = flags.find((v:any) => v === true || v === 1);
    if (explicitTrue !== undefined) return true;

    return true;
  };

  const isLayerEffectivelyVisible = (index:number, trail = new Set<number>()): boolean => {
    if (index < 0 || index >= layers.length) return true;
    if (cache.has(index)) return cache.get(index)!;
    if (trail.has(index)) return true; // protect against malformed layer cycles

    const layer = layers[index];
    if (!layer) return true;

    if (!readLayerVisibility(layer)) {
      cache.set(index, false);
      return false;
    }

    const parentId = layer.parentLayerId ?? layer.parentId ?? layer.ParentLayerId ?? layer.ParentId;
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

  return isLayerEffectivelyVisible;
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
  // iJewel/Threepipe soporta 3DM como formato nativo de entrada y recomienda
  // conservar las render meshes de Rhino para el flujo de joyería.
  if (extension === "3dm") {
    const layers = Array.isArray(object?.userData?.layers) ? object.userData.layers : [];
    const isLayerEffectivelyVisible = buildRhinoLayerVisibility(layers);

    let i = 0;
    object?.traverse?.((x:any) => {
      if (!x.isMesh) return;

      const meta = metadataCapas[i++];
      if (!meta) return;

      const attrs = x.userData?.attributes || {};
      const layerIndex = Number.isInteger(attrs.layerIndex) ? attrs.layerIndex : -1;
      const objectVisible = !isRhinoObjectHidden(attrs);
      const layerVisible = isLayerEffectivelyVisible(layerIndex);

      // Rhino puede ocultar un objeto directamente o mediante su capa.
      // Además, una capa hija puede seguir reportando visible=true cuando
      // su capa padre está apagada; por eso comprobamos toda la jerarquía.
      // Esto aplica por igual a las 8 primeras capas (metal/gema) y a las
      // capas posteriores: la clasificación de material nunca puede reactivar
      // una capa que Rhino dejó oculta.
      const visible = objectVisible && layerVisible;

      x.visible = visible;
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
