export type AurumLayerCategoryOverride = "metal" | "gema" | "otro";

export interface AurumLayerCategoryIdentity {
  layerId?: unknown;
  layerIndex?: unknown;
  layerName?: unknown;
}

const normalizeName = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase();

export function getAurumLayerCategoryKeys(identity: AurumLayerCategoryIdentity): string[] {
  const keys: string[] = [];
  if (identity.layerId !== null && identity.layerId !== undefined && String(identity.layerId).trim()) {
    keys.push("id:" + String(identity.layerId).trim());
  }
  const index = identity.layerIndex === null || identity.layerIndex === undefined || identity.layerIndex === ""
    ? -1 : Number(identity.layerIndex);
  if (Number.isInteger(index) && index >= 0) keys.push("index:" + index);
  const name = normalizeName(identity.layerName);
  if (name) keys.push("name:" + encodeURIComponent(name));
  return keys;
}

function sameLayerIdentity(a: AurumLayerCategoryIdentity, b: AurumLayerCategoryIdentity): boolean {
  const aId = a.layerId == null ? "" : String(a.layerId).trim();
  const bId = b.layerId == null ? "" : String(b.layerId).trim();
  if (aId && bId) return aId === bId;
  const aIndex = a.layerIndex == null || a.layerIndex === "" ? -1 : Number(a.layerIndex);
  const bIndex = b.layerIndex == null || b.layerIndex === "" ? -1 : Number(b.layerIndex);
  if (Number.isInteger(aIndex) && aIndex >= 0 && Number.isInteger(bIndex) && bIndex >= 0) return aIndex === bIndex;
  const aName = normalizeName(a.layerName);
  const bName = normalizeName(b.layerName);
  return Boolean(aName && bName && aName === bName);
}

function identityForMesh(mesh: any): AurumLayerCategoryIdentity {
  const meta = mesh?.userData?.aurumRhino ?? {};
  const source = mesh?.userData?.aurumRhinoSource ?? {};
  const instance = mesh?.userData?.aurumRhinoInstanceSource ?? {};
  const attrs = mesh?.userData?.attributes ?? {};
  return {
    layerId: instance.layerId ?? source.layerId ?? attrs.layerId ?? attrs.LayerId ?? meta.rhinoLayerId,
    layerIndex: instance.layerIndex ?? source.layerIndex ?? attrs.layerIndex ?? attrs.LayerIndex ?? meta.layerIndex,
    layerName: instance.layerName ?? source.layerName ?? attrs.layerName ?? attrs.LayerName ?? meta.capa,
  };
}

export function getAurumLayerCategoryOverride(
  overrides: Record<string, AurumLayerCategoryOverride> | null | undefined,
  identity: AurumLayerCategoryIdentity
): AurumLayerCategoryOverride | undefined {
  if (!overrides) return undefined;
  const keys = getAurumLayerCategoryKeys(identity);
  // Never fall through from a conflicting stable ID/index to a duplicate
  // layer name. Name is only a fallback when stronger identity is absent.
  const preferredKey = keys[0];
  const value = preferredKey ? overrides[preferredKey] : undefined;
  return value === "metal" || value === "gema" || value === "otro" ? value : undefined;
}

export function applyAurumLayerCategoryOverrides(
  model: any,
  overrides: Record<string, AurumLayerCategoryOverride> | null | undefined
): number {
  if (!model?.traverse || !overrides) return 0;
  let changed = 0;
  model.traverse((mesh: any) => {
    if (!mesh?.isMesh) return;
    const category = getAurumLayerCategoryOverride(overrides, identityForMesh(mesh));
    if (!category) return;
    const meta = mesh.userData?.aurumRhino ?? {};
    if (meta.categoria === category && meta.aurumManualCategoryAssignment === true) return;
    mesh.userData = {
      ...(mesh.userData ?? {}),
      aurumRhino: {
        ...meta,
        aurumOriginalCategory: meta.aurumManualCategoryAssignment ? meta.aurumOriginalCategory : meta.categoria ?? "otro",
        categoria: category,
        aurumManualCategoryAssignment: true,
        aurumManualGemAssignment: category === "gema",
      },
    };
    changed++;
  });
  model.userData = {
    ...(model.userData ?? {}),
    aurumLayerCategoryOverrides: { ...overrides },
  };
  return changed;
}

export function setAurumLayerCategoryOverride(
  model: any,
  identity: AurumLayerCategoryIdentity,
  category: AurumLayerCategoryOverride | null
): { overrides: Record<string, AurumLayerCategoryOverride>; changed: number; keys: string[] } {
  if (!model?.userData) model.userData = {};
  const overrides: Record<string, AurumLayerCategoryOverride> = {
    ...(model.userData.aurumLayerCategoryOverrides ?? {}),
  };
  const keys = getAurumLayerCategoryKeys(identity);
  if (!keys.length) return { overrides, changed: 0, keys };
  if (category) keys.forEach((key) => { overrides[key] = category; });
  else keys.forEach((key) => { delete overrides[key]; });

  let changed = 0;
  model.traverse?.((mesh: any) => {
    if (!mesh?.isMesh) return;
    if (!sameLayerIdentity(identity, identityForMesh(mesh))) return;
    const meta = mesh.userData?.aurumRhino ?? {};
    if (category) {
      mesh.userData = {
        ...(mesh.userData ?? {}),
        aurumRhino: {
          ...meta,
          aurumOriginalCategory: meta.aurumManualCategoryAssignment ? meta.aurumOriginalCategory : meta.categoria ?? "otro",
          categoria: category,
          aurumManualCategoryAssignment: true,
          aurumManualGemAssignment: category === "gema",
        },
      };
    } else {
      const restored = meta.aurumOriginalCategory ?? "otro";
      const nextMeta = { ...meta, categoria: restored };
      delete nextMeta.aurumOriginalCategory;
      delete nextMeta.aurumManualCategoryAssignment;
      delete nextMeta.aurumManualGemAssignment;
      mesh.userData = { ...(mesh.userData ?? {}), aurumRhino: nextMeta };
    }
    changed++;
  });
  model.userData.aurumLayerCategoryOverrides = overrides;
  return { overrides, changed, keys };
}
