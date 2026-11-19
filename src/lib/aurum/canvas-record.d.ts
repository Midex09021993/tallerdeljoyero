declare module "canvas-record" {
  export class Recorder {
    constructor(
      context: WebGLRenderingContext | WebGL2RenderingContext,
      options?: {
        name?: string;
        duration?: number;
        frameRate?: number;
        extension?: "mp4" | "webm" | "mkv" | "mov";
        target?: "in-browser" | "file-system";
        download?: boolean;
        encoderOptions?: Record<string, unknown>;
      },
    );
    start(options?: { initOnly?: boolean; filename?: string }): Promise<void>;
    step(): Promise<void>;
    stop(): Promise<ArrayBuffer | Uint8Array | Blob[] | undefined>;
    dispose(): Promise<void>;
  }
}
