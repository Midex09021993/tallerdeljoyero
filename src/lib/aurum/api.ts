export function createAurumApi(options:any){
  return {
    cargar: options.cargar,
    material: options.material,
    gema: options.gema,
    escenario: options.escenario,
    hdriGround: options.hdriGround,
    iluminacion: options.iluminacion,
    sceneStudio: options.sceneStudio,
    reset: options.reset,
    autoRotar: options.autoRotar,
    capturar: options.capturar,
    limpiar: options.limpiar,
    partes: options.partes,
    seleccionarParte: options.seleccionarParte,
    fullscreen: options.fullscreen,
    vista: options.vista,
    calidad: options.calidad,
  };
}
