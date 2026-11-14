/**
 * Canonical AURUM module contracts.
 *
 * These interfaces formalize the boundaries between existing production
 * engines. They describe orchestration only: implementations retain ownership
 * of Three.js resources, material calibration, shaders, BVH and HDRI state.
 */
import type * as THREE from "three";

export type AurumRenderMode = "LIVE_MOTION" | "RESTING_SETTLED" | "CAPTURE";

export interface IAurumGeometryContract<TRequest = unknown, TResult = unknown> {
  readonly id: "aurum.import";
  readonly version: string;
  load(request: TRequest): Promise<TResult>;
}

export interface IAurumMetalOpticalContract {
  apply(material: unknown, preset: unknown): unknown;
  applyReferenceOptics(material: unknown, materialId: string): unknown;
  createPreset(config: unknown): unknown;
}

export interface IAurumGemOpticalContract {
  applyBaseMaterial(material: unknown, preset: unknown, thickness: number): unknown;
  applyOpticalProfile(material: unknown, profile: unknown): unknown;
  applyDiamondOptics(material: unknown): unknown;
  applyReferenceOptics(material: unknown, family: string): unknown;
  getOpticalProfile(family: string): unknown;
}

/** Optical facade: metal and gem adapters remain independent owners. */
export interface IAurumOpticalContract {
  readonly metal: IAurumMetalOpticalContract;
  readonly gem: IAurumGemOpticalContract;
}

export interface IAurumRenderPipelineRuntime {
  readonly composer: unknown;
  readonly renderPass: unknown;
  readonly gemMaskPass: unknown;
  readonly fxaaPass: unknown;
  readonly surfaceEdgeAaPass: unknown;
  readonly outputPass: unknown;
  readonly taaPass: unknown;
  setTemporalMotion(active: boolean): void;
  updateTemporal(camera: unknown, options?: unknown): void;
  resetTemporalAccumulation(): void;
  applyQuality(quality: unknown, options?: unknown): void;
}

/**
 * Mode boundary for the production post pipeline.
 * TAA is deliberately not enabled by LIVE_MOTION or RESTING_SETTLED.
 */
export interface IAurumRenderPipelineContract {
  readonly runtime: IAurumRenderPipelineRuntime;
  getMode(): AurumRenderMode;
  setMode(mode: AurumRenderMode): void;
}

export interface IAurumVideoFramePipelineContract {
  renderFrame(): void;
  restore(): void;
}

export interface IAurumMediaExportContract {
  createFramePipeline(options: unknown): IAurumVideoFramePipelineContract;
  recordCanvas(source: HTMLCanvasElement, options?: unknown): Promise<void>;
}

export interface IAurumGeometrySceneResult {
  readonly sourceObject: THREE.Object3D;
  readonly model: THREE.Object3D;
  readonly format: string;
  readonly pipeline: readonly string[];
}


export interface IAurumCameraState {
  readonly position: THREE.Vector3;
  readonly quaternion: THREE.Quaternion;
  readonly target: THREE.Vector3;
  readonly up: THREE.Vector3;
  readonly aspect: number;
  readonly fov: number;
  readonly near: number;
  readonly far: number;
  readonly autoRotate: boolean;
  readonly autoRotateSpeed: number;
}

/**
 * Camera boundary: OrbitControls is owned by AURUM CAMERA and exposed only
 * through semantic view operations to the rest of the application.
 */
export interface IAurumCameraControlsContract {
  readonly id: "aurum.camera.controls";
  readonly version: "1.0.0";
  applyView(model: THREE.Object3D | null, view: "perspectiva" | "frontal" | "superior" | "lateral", category?: string, options?: { distanceScale?: number }): void;
  applyReferencePresentation(model: THREE.Object3D | null): void;
  fitAspect(model: THREE.Object3D | null, aspect: number, margin?: number): void;
  centerOn(target: THREE.Vector3): void;
  /** Configure camera projection and navigation limits through the sole camera owner. */
  configure(options: { fov?: number; near?: number; far?: number; minDistance?: number; maxDistance?: number; enablePan?: boolean; enableRotate?: boolean; enableZoom?: boolean; screenSpacePanning?: boolean; panSpeed?: number; rotateSpeed?: number; zoomSpeed?: number; enableDamping?: boolean; dampingFactor?: number; autoRotateSpeed?: number }): void;
  /** Set an explicit camera pose without bypassing OrbitControls synchronization. */
  setPose(position: THREE.Vector3, target?: THREE.Vector3, up?: THREE.Vector3): void;
  /** Change camera distance while preserving its current viewing direction. */
  setDistance(distance: number): void;
  getDistance(): number;
  getAspect(): number;
  setAutoRotate(enabled: boolean, speed?: number): void;
  setAspect(aspect: number): void;
  captureState(): IAurumCameraState;
  restoreState(state: IAurumCameraState): void;
  update(): void;
  getTarget(): THREE.Vector3;
  getPosition(): THREE.Vector3;
  getUp(): THREE.Vector3;
  getAutoRotate(): boolean;
  getAutoRotateSpeed(): number;
}


/** Object picking boundary; UI and material side effects are callback-owned. */
export interface IAurumObjectSelectionContract {
  readonly id: "aurum.object-selection";
  readonly version: "1.0.0";
  pick(event: MouseEvent): THREE.Intersection<THREE.Object3D> | null;
  handleClick(event: MouseEvent): void;
  dispose(): void;
}
