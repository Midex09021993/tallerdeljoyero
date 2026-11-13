export type AurumEdgeCapabilities = {
  webgl2: boolean;
  maxSamples: number;
  requestedSamples: number;
  supportedSamples: number;
};

export function inspectAurumEdgeCapabilities(renderer: any, requestedSamples = 4): AurumEdgeCapabilities {
  const capabilities = renderer?.capabilities;
  const maxSamples = Number(capabilities?.maxSamples ?? 0);
  const safeMaxSamples = Number.isFinite(maxSamples) ? Math.max(0, Math.floor(maxSamples)) : 0;
  const requested = Math.max(0, Math.floor(Number(requestedSamples) || 0));
  const webgl2 = capabilities?.isWebGL2 === true;

  return {
    webgl2,
    maxSamples: safeMaxSamples,
    requestedSamples: requested,
    supportedSamples: webgl2 && safeMaxSamples >= 2 ? Math.min(requested, safeMaxSamples) : 0,
  };
}
