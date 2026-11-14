import { expect, test } from "bun:test";
import { compareAurumVisualCaptures } from "../src/lib/aurum/visual-regression";

function rgba(width: number, height: number, fill = 0): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  data.fill(fill);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  return data;
}

test("AURUM visual comparator passes identical RGBA captures", () => {
  const reference = { width: 2, height: 2, data: rgba(2, 2, 24) };
  const actual = { width: 2, height: 2, data: rgba(2, 2, 24) };
  const report = compareAurumVisualCaptures(reference, actual);
  expect(report.status).toBe("passed");
  expect(report.changedPixels).toBe(0);
  expect(report.meanAbsoluteError).toBe(0);
});

test("AURUM visual comparator tolerates small per-channel capture noise", () => {
  const reference = rgba(2, 2, 24);
  const actual = rgba(2, 2, 24);
  actual[0] = 30;
  const report = compareAurumVisualCaptures(
    { width: 2, height: 2, data: reference },
    { width: 2, height: 2, data: actual },
    { channelTolerance: 8, maximumChangedPixelRatio: 0 },
  );
  expect(report.status).toBe("passed");
  expect(report.changedPixels).toBe(0);
  expect(report.meanAbsoluteError).toBeGreaterThan(0);
});

test("AURUM visual comparator fails when changed pixel ratio exceeds budget", () => {
  const reference = rgba(2, 2, 0);
  const actual = rgba(2, 2, 0);
  actual[0] = 255;
  actual[1] = 255;
  actual[2] = 255;
  const report = compareAurumVisualCaptures(
    { width: 2, height: 2, data: reference },
    { width: 2, height: 2, data: actual },
    { channelTolerance: 8, maximumChangedPixelRatio: 0.2 },
  );
  expect(report.status).toBe("failed");
  expect(report.changedPixels).toBe(1);
  expect(report.changedPixelRatio).toBe(0.25);
  expect(report.maximumChannelError).toBe(255);
});

test("AURUM visual comparator excludes masked UI regions", () => {
  const reference = rgba(2, 1, 0);
  const actual = rgba(2, 1, 0);
  actual[0] = actual[1] = actual[2] = 255;
  actual[4] = actual[5] = actual[6] = 255;
  const mask = rgba(2, 1, 0);
  mask[3] = 255;
  mask[7] = 0;
  const report = compareAurumVisualCaptures(
    { width: 2, height: 1, data: reference },
    { width: 2, height: 1, data: actual },
    { mask, maximumChangedPixelRatio: 0 },
  );
  expect(report.status).toBe("failed");
  expect(report.comparedPixels).toBe(1);
  expect(report.changedPixels).toBe(1);
});

test("AURUM visual comparator rejects mismatched dimensions and malformed buffers", () => {
  const valid = { width: 1, height: 1, data: rgba(1, 1) };
  expect(() => compareAurumVisualCaptures(valid, { width: 2, height: 1, data: rgba(2, 1) })).toThrow("mismas dimensiones");
  expect(() => compareAurumVisualCaptures(valid, { width: 1, height: 1, data: new Uint8Array(3) })).toThrow("buffer RGBA");
});
