import { expect, test } from "bun:test";
import { createAurumWebGLViewer } from "../src/lib/aurum/viewer";

test("the demand-driven viewer preserves its final WebGL frame", () => {
  let rendererOptions: Record<string, unknown> = {};
  const canvas = { className: "" };
  const THREE = {
    Scene: class {},
    PerspectiveCamera: class {},
    WebGLRenderer: class {
      domElement = canvas;
      constructor(options: Record<string, unknown>) { rendererOptions = options; }
      setPixelRatio() {}
    },
  };
  const host = { appendChild() {} } as unknown as HTMLElement;

  createAurumWebGLViewer(THREE, host);

  expect(rendererOptions.preserveDrawingBuffer).toBe(true);
  expect(rendererOptions.antialias).toBe(true);
  expect(rendererOptions.alpha).toBe(true);
});