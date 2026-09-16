/**
 * AURUM SSAO ENGINE v1.0
 * Configuración adaptativa de oclusión ambiental.
 * El efecto se integra como AO de contacto muy suave.
 * La intensidad es deliberadamente baja para conservar los reflejos de metales pulidos.
 */
export type AurumSsaoConfig={enabled:boolean;radius:number;intensity:number;bias:number;quality:"low"|"medium"|"high"};
export const AURUM_SSAO_CONFIG:AurumSsaoConfig={
 // AO de contacto suave: aporta profundidad sin ennegrecer los metales pulidos.
 enabled:true,radius:.20,intensity:.14,bias:.018,quality:"medium"
};
export const getAurumSsaoConfig=()=>({...AURUM_SSAO_CONFIG});
