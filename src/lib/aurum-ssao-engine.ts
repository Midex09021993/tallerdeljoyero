/**
 * AURUM SSAO ENGINE v1.0
 * Configuración adaptativa de oclusión ambiental.
 * El efecto se mantiene desactivado por defecto hasta conectarlo
 * a un compositor compatible, evitando romper el visor base.
 */
export type AurumSsaoConfig={enabled:boolean;radius:number;intensity:number;bias:number;quality:"low"|"medium"|"high"};
export const AURUM_SSAO_CONFIG:AurumSsaoConfig={
 // AO de contacto suave: aporta profundidad sin ennegrecer los metales pulidos.
 enabled:true,radius:.18,intensity:.16,bias:.02,quality:"medium"
};
export const getAurumSsaoConfig=()=>({...AURUM_SSAO_CONFIG});
