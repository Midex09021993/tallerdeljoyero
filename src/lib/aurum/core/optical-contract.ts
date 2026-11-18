import { createAurumGemAdapter } from "./gem-adapter";
import { createAurumMetalAdapter } from "./metal-adapter";
import type { IAurumOpticalContract } from "./module-contracts";

/** Compose the independent metal and gem adapters without merging ownership. */
export function createAurumOpticalContract(): IAurumOpticalContract {
  return Object.freeze({
    metal: createAurumMetalAdapter(),
    gem: createAurumGemAdapter(),
  });
}
