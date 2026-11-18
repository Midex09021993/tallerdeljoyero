export type AurumConfiguratorInput = {
  material: string;
  gem: string;
  scene: string;
  lighting: string;
  camera: string;
};

export function createAurumConfiguration(input: AurumConfiguratorInput) {
  return {
    ...input,
    finish: input.material.includes("_") ? input.material.split("_").slice(1).join("_") : "pulido",
  };
}

export function createAurumVariations(
  materials: Array<{ id: string; grupo: string; nombre: string }>,
  gems: Array<{ id: string; nombre: string }>
) {
  return {
    metals: Array.from(new Set(materials.map(m => m.grupo))).map(grupo => ({
      id: grupo.toLowerCase().replace(/\s+/g, "-"),
      name: grupo,
      options: materials.filter(m => m.grupo === grupo).map(m => ({ id: m.id, name: m.nombre })),
    })),
    gems: gems.map(g => ({ id: g.id, name: g.nombre })),
    finishes: Array.from(new Set(materials.map(m => m.nombre))).map(nombre => ({
      id: nombre.toLowerCase().replace(/\s+/g, "-"),
      name: nombre,
      materialIds: materials.filter(m => m.nombre === nombre).map(m => m.id),
    })),
  };
}

export function createAurumConfiguratorLayers(variations: ReturnType<typeof createAurumVariations>) {
  return [
    {
      id: "metal",
      title: "Metal",
      preview: "color" as const,
      options: variations.metals.flatMap(group => group.options.map(option => ({
        id: option.id,
        name: group.name + " · " + option.name,
        type: "metal" as const,
      }))),
    },
    {
      id: "gemstone",
      title: "Gema",
      preview: "color" as const,
      options: variations.gems.map(g => ({ id: g.id, name: g.name, type: "gem" as const })),
    },
    {
      id: "finish",
      title: "Acabado",
      preview: "color" as const,
      options: variations.finishes.map(f => ({
        id: f.id,
        name: f.name,
        type: "finish" as const,
        materialIds: f.materialIds,
      })),
    },
  ];
}
