/**
 * Internal command surface used by AurumRender.
 * Keep this broad interface private to the rendering/editor integration.
 */
export type AurumApi = ReturnType<typeof createAurumApi>;

/**
 * Small allowlisted API intended for embedded/public configurators.
 * It deliberately excludes file cleanup, selection internals, fullscreen,
 * quality controls and all export operations.
 */
export type AurumCatalogApi = {
  cargar?: (...args: any[]) => any;
  material?: (...args: any[]) => any;
  gema?: (...args: any[]) => any;
  materialCatalogo?: (...args: any[]) => any;
  gemaCatalogo?: (...args: any[]) => any;
  escenario?: (...args: any[]) => any;
  metalHdri?: (...args: any[]) => any;
  gemHdri?: (...args: any[]) => any;
  fondo?: (...args: any[]) => any;
  vista?: (...args: any[]) => any;
  reset?: (...args: any[]) => any;
};

const CATALOG_API_METHODS = [
  "cargar",
  "material",
  "gema",
  "materialCatalogo",
  "gemaCatalogo",
  "escenario",
  "metalHdri",
  "gemHdri",
  "fondo",
  "vista",
  "reset",
] as const;

export function createAurumCatalogApi(api: Partial<AurumApi>): AurumCatalogApi {
  const publicApi: AurumCatalogApi = {};
  for (const method of CATALOG_API_METHODS) {
    const candidate = (api as Record<string, unknown>)[method];
    if (typeof candidate === "function") {
      publicApi[method] = (...args: any[]) => candidate(...args);
    }
  }
  return Object.freeze(publicApi);
}

export function createAurumApi(options:any){
  return {
    cargar: options.cargar,
    material: options.material,
    gema: options.gema,
    escenario: options.escenario,
    hdriGround: options.hdriGround,
    sombraContacto: options.sombraContacto,
    iluminacion: options.iluminacion,
    metalHdri: options.metalHdri,
    gemHdri: options.gemHdri,
    ambiente: options.ambiente,
    influenciaMetalAmbiente: options.influenciaMetalAmbiente,
    fondo: options.fondo,
    sceneStudio: options.sceneStudio,
    reset: options.reset,
    autoRotar: options.autoRotar,
    limpiar: options.limpiar,
    partes: options.partes,
    seleccionarParte: options.seleccionarParte,
    fullscreen: options.fullscreen,
    vista: options.vista,
    calidad: options.calidad,
    exportGLB: options.exportGLB,
    exportPNG: options.exportPNG,
    exportPathTraced: options.exportPathTraced,
    exportSceneSettings: options.exportSceneSettings,
  };
}
