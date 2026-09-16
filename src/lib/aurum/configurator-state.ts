import {
  createAurumConfiguration,
  createAurumVariations,
  createAurumConfiguratorLayers,
  type AurumConfiguratorInput,
} from "./configurator";

export function createAurumConfiguratorState(
  input: AurumConfiguratorInput & { materials: any[]; gems: any[] }
) {
  const configuration = createAurumConfiguration(input);
  const variations = createAurumVariations(input.materials, input.gems);
  const layers = createAurumConfiguratorLayers(variations);
  return { configuration, variations, layers };
}
