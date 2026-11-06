# AURUM Draco runtime assets

Vendored from Google Draco **v1.5.7** (Apache-2.0).

- `draco_encoder.js` / `draco_encoder.wasm`: browser encoder assets, reserved for the GLB compression worker.
- `draco_decoder.js`, `draco_wasm_wrapper.js`, `draco_decoder.wasm`: Three.js GLTFLoader decoder assets.

The runtime decoder is served locally from `/draco/1.5.7/` to avoid a third-party CDN dependency.
The encoder is not wired into GLB export by this asset-only change; export integration must be implemented and validated separately before claiming compressed GLBs.
