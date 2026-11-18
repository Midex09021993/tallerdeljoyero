import { resolveAurumLayerKey } from "./layer-identity";
import { classifyAurumSemanticObject } from "./semantic-object-recognition";

export type AurumMeshLayerContext = {
  root: any;
  metadata: Record<string, any>;
  source: Record<string, any>;
  instance: Record<string, any>;
  attributes: Record<string, any>;
  layer: any;
  layerName: string;
  layerIndex: number | null;
  layerId: string | number | null;
  layerColor: any;
  category: "metal" | "gema" | "otro";
  layerKey?: string;
};

const firstValue=(values:any[])=>values.find(value=>value!==undefined&&value!==null&&value!=="");
const validIndex=(value:any):number|null=>{
  if(value===undefined||value===null||value==="")return null;
  const parsed=Number(value);
  return Number.isInteger(parsed)&&parsed>=0?parsed:null;
};
const layerCategory=(value:string):"metal"|"gema"|"otro"=>{
  const segments=value.split(/::|[\\/]/).map(part=>part.trim().toLowerCase().replace(/[_-]+/g," "));
  const gem=/^(?:gem|gems|gemstone|gemstones|gema|gemas|piedra|piedras|stone|stones|diamond|diamonds|diamante|diamantes|zafiro|sapphire|rubi|ruby|esmeralda|emerald|moissanita|moissanite|citrino|amatista|topacio)(?:\\s*0*\\d+(?:\\.\\d+)?(?:\\s*mm)?(?:\\s*[- ]\\s*[a-z0-9 .-]+)?)?$/;
  if(segments.some(segment=>gem.test(segment)))return "gema";
  if(/(?:metal|oro|gold|plata|silver|platino|platinum|metalico|metálico|acero|steel)/i.test(value))return "metal";
  return "otro";
};

/**
 * Resolve a mesh against its complete Rhino/GLB ancestry and the root layer
 * manifest. A child's layer index is authoritative even when the child has
 * no layer name or aurumRhino metadata of its own.
 */
export function resolveAurumMeshLayerContext(node:any, rootOverride?:any):AurumMeshLayerContext {
  const chain:any[]=[];
  let current=node;
  while(current){chain.push(current);current=current.parent;}
  const root=rootOverride??chain[chain.length-1]??node;
  const entries=chain.map(item=>{
    const data=item?.userData??{};
    return {
      item,
      data,
      meta:data.aurumRhino??{},
      source:data.aurumRhinoSource??{},
      instance:data.aurumRhinoInstanceSource??data.aurumRhinoInstanceReference??{},
      attributes:data.attributes??{},
      rhinoLayer:data.rhinoLayer??data.RhinoLayer??{},
    };
  });
  const pick=(selector:(entry:any)=>any)=>firstValue(entries.map(selector));
  const metadata=entries.find(entry=>Object.keys(entry.meta).length)?.meta??{};
  const source=entries.find(entry=>Object.keys(entry.source).length)?.source??{};
  const instance=entries.find(entry=>Object.keys(entry.instance).length)?.instance??{};
  const attributes=entries.find(entry=>Object.keys(entry.attributes).length)?.attributes??{};
  const layerIndex=validIndex(pick(entry=>firstValue([
    entry.instance.layerIndex,entry.instance.LayerIndex,
    entry.source.layerIndex,entry.source.LayerIndex,
    entry.attributes.layerIndex,entry.attributes.LayerIndex,
    entry.data.layerIndex,entry.data.LayerIndex,
    entry.meta.layerIndex,
  ])));
  const layerId=pick(entry=>firstValue([
    entry.instance.layerId,entry.instance.LayerId,
    entry.source.layerId,entry.source.LayerId,
    entry.attributes.layerId,entry.attributes.LayerId,
    entry.data.layerId,entry.data.LayerId,
    entry.rhinoLayer.id,entry.rhinoLayer.Id,
    entry.meta.rhinoLayerId,
  ]))??null;
  const manifestData=root?.userData??{};
  const manifest=[
    manifestData.aurumRhinoSourceLayers,
    manifestData.layers,
    manifestData.rhinoLayers,
  ].find((value:any)=>Array.isArray(value)&&value.length)??[];
  let layer=layerIndex!==null?manifest[layerIndex]:undefined;
  if(!layer&&layerId!==null){
    layer=manifest.find((candidate:any)=>String(candidate?.id??candidate?.Id??"")===String(layerId));
  }
  const layerName=String(firstValue([
    layer?.fullPath,layer?.FullPath,layer?.name,layer?.Name,
    pick(entry=>firstValue([
      entry.rhinoLayer.fullPath,entry.rhinoLayer.FullPath,
      entry.rhinoLayer.name,entry.rhinoLayer.Name,
      entry.instance.layerName,entry.instance.LayerName,
      entry.source.layerName,entry.source.LayerName,
      entry.attributes.layerName,entry.attributes.LayerName,
      entry.data.layerName,entry.data.LayerName,
      entry.meta.capa,entry.meta.layerName,
    ])),
  ])??"").trim();
  const resolvedIndex=layerIndex??(layer?manifest.indexOf(layer):null);
  const resolvedId=layer?.id??layer?.Id??layerId;
  const layerColor=firstValue([
    layer?.color,layer?.Color,
    pick(entry=>firstValue([
      entry.instance.layerColor,entry.source.layerColor,
      entry.attributes.layerColor,entry.attributes.LayerColor,
      entry.meta.colorCapa,
    ])),
  ]);
  const explicitManual=entries.find(entry=>
    entry.meta.aurumManualCategoryAssignment===true &&
    ["metal","gema","otro"].includes(String(entry.meta.categoria).toLowerCase())
  );
  const directCategory=pick(entry=>{
    const value=String(entry.meta.categoria??"").toLowerCase();
    return ["metal","gema","otro"].includes(value)?value:undefined;
  });
  const namedCategory=layerCategory(layerName);
  const semantic=classifyAurumSemanticObject(node,layer);
  const semanticCategory=semantic.confidence>=.7
    ? semantic.classification==="gem"?"gema"
      : semantic.classification==="metal"?"metal":undefined
    : undefined;
  const category=(explicitManual?String(explicitManual.meta.categoria):undefined)
    ??(namedCategory!=="otro"?namedCategory:undefined)
    ??directCategory
    ??semanticCategory
    ??"otro";
  const layerKey=resolveAurumLayerKey({
    layerId:resolvedId,
    layerIndex:resolvedIndex,
    layerName,
    layerColor,
    category,
    existingKey:metadata.layerKey,
  });
  return {
    root,metadata,source,instance,attributes,layer,
    layerName,layerIndex:resolvedIndex,layerId:resolvedId??null,
    layerColor,category,layerKey,
  };
}
