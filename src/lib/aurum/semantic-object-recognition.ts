export type AurumSemanticClass = "metal" | "gem" | "engraving" | "relief" | "auxiliary" | "unknown";
export type AurumSemanticResult = {
  classification: AurumSemanticClass;
  confidence: number;
  evidence: string[];
  scores: Record<AurumSemanticClass, number>;
};

const RULES: Array<{ category: AurumSemanticClass; pattern: RegExp; weight: number; source: string }> = [
  { category: "gem", pattern: /\b(gem|gema|piedra|stone|diamond|diamante|sapphire|zafiro|ruby|rubi|rubí|esmeralda|emerald|moissanite|moissanita|topaz|topacio|amethyst|amatista)\b/i, weight: 5, source: "nombre/material explícito de gema" },
  { category: "metal", pattern: /\b(metal|oro|gold|plata|silver|platino|platinum|steel|acero|brass|laton|latón|copper|cobre|palladium|paladio)\b/i, weight: 5, source: "nombre/material explícito de metal" },
  { category: "engraving", pattern: /\b(engraving|engrave|grabado|inscripcion|inscripción|texto|lettering|marcado|marca|logo|serial)\b/i, weight: 5, source: "nombre explícito de grabado" },
  { category: "relief", pattern: /\b(relief|emboss|embossed|relieve|repujado|alto relieve|bajo relieve|ornament|ornamento|decoracion|decoración|filigree|filigrana)\b/i, weight: 5, source: "nombre explícito de relieve/decoración" },
  { category: "auxiliary", pattern: /\b(aux|auxiliary|construction|guide|guideline|reference|referencia|helper|helpergeo|curve|curva|axis|eje|dimension|dimensión|annotation|anotacion|anotación|measurement|cota)\b/i, weight: 5, source: "nombre explícito de geometría auxiliar" },
];

function readText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  return "";
}

/**
 * Conservative GLB/Rhino semantic recognition.
 * This is descriptive metadata only: it never changes materials, visibility,
 * geometry, render profiles, or the existing metal/gem family assignment.
 */
export function classifyAurumSemanticObject(node: any, layer: any): AurumSemanticResult {
  const scores: Record<AurumSemanticClass, number> = {
    metal: 0, gem: 0, engraving: 0, relief: 0, auxiliary: 0, unknown: 0,
  };
  const evidence: string[] = [];
  const add = (category: AurumSemanticClass, weight: number, reason: string) => {
    scores[category] += weight;
    evidence.push(reason);
  };

  const data = node?.userData ?? {};
  const attrs = data.attributes ?? {};
  const source = data.aurumRhinoSource ?? {};
  const rhino = data.aurumRhino ?? {};
  const layerName = readText(layer?.name ?? layer?.Name ?? source.layerName ?? rhino.capa);
  const objectNames: string[] = [];
  // GLB exporters often keep the meaningful CAD name on a parent/group node
  // while child meshes have generic names. Include ancestor names as evidence.
  let namedNode = node;
  while (namedNode) {
    const name = readText(
      namedNode === node
        ? (source.objectName ?? attrs.name ?? attrs.Name ?? data.objectName ?? namedNode.name)
        : namedNode.name
    );
    if (name && !objectNames.includes(name)) objectNames.push(name);
    namedNode = namedNode.parent;
  }
  const materialList = (Array.isArray(node?.material) ? node.material : [node?.material]).filter(Boolean);
  const materialNames = materialList.map((material: any) => readText(material?.name)).filter(Boolean);
  const geometryType = readText(data.aurumRhinoGeometryType ?? source.objectType ?? attrs.geometryType ?? attrs.GeometryType);
  const combined = [
    ["objeto", objectNames.join(" ")],
    ["capa", layerName],
    ["material", materialNames.join(" ")],
    ["tipo", geometryType],
    ["atributos", readText(attrs.type ?? attrs.Type) + " " + readText(attrs.objectType ?? attrs.ObjectType)],
  ];

  for (const [origin, value] of combined) {
    if (!value) continue;
    for (const rule of RULES) {
      // Rhino/GLB names commonly use underscores or hyphens as separators.
      const searchableValue = value.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
      if (rule.pattern.test(searchableValue)) add(rule.category, rule.weight, origin + ": " + rule.source);
    }
  }

  if (node?.isLine || node?.isLineSegments || node?.isLineLoop || node?.isPoints) {
    add("auxiliary", 8, "primitiva glTF de línea/puntos");
  }
  if (geometryType && /curve|polyline|point|annotation|dimension/i.test(geometryType)) {
    add("auxiliary", 6, "tipo geométrico auxiliar declarado por el origen");
  }

  const ranked = (Object.keys(scores) as AurumSemanticClass[])
    .filter((key) => key !== "unknown")
    .sort((a, b) => scores[b] - scores[a]);
  const best = ranked[0];
  const second = ranked[1];
  const bestScore = best ? scores[best] : 0;
  const margin = bestScore - (second ? scores[second] : 0);

  if (!best || bestScore < 5 || margin < 2) {
    return { classification: "unknown", confidence: 0, evidence: evidence.length ? evidence : ["sin señales semánticas suficientes"], scores };
  }

  const confidence = Math.max(0, Math.min(1, Math.round((0.55 + Math.min(bestScore, 15) * 0.025 + Math.min(margin, 10) * 0.02) * 100) / 100));
  return { classification: best, confidence, evidence: Array.from(new Set(evidence)), scores };
}
