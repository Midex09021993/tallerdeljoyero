import { expect, test } from "bun:test";
import { runAurumMediaExportCleanup } from "../src/lib/aurum/media-export-session";

test("AURUM media export cleanup attempts every restoration step in order", () => {
  const calls: string[] = [];
  const failures = runAurumMediaExportCleanup([
    () => { calls.push("restore-composer"); },
    () => { calls.push("restore-renderer"); throw new Error("renderer restore failed"); },
    () => { calls.push("restore-camera"); },
    () => { calls.push("resume-viewer"); },
  ]);
  expect(calls).toEqual(["restore-composer", "restore-renderer", "restore-camera", "resume-viewer"]);
  expect(failures).toHaveLength(1);
  expect((failures[0] as Error).message).toBe("renderer restore failed");
});

test("AURUM media export cleanup returns no failures when all steps succeed", () => {
  const calls: number[] = [];
  const failures = runAurumMediaExportCleanup([
    () => { calls.push(1); },
    () => { calls.push(2); },
  ]);
  expect(calls).toEqual([1, 2]);
  expect(failures).toEqual([]);
});

test("AURUM media export cleanup continues after multiple independent failures", () => {
  const calls: string[] = [];
  const failures = runAurumMediaExportCleanup([
    () => { calls.push("first"); throw new Error("first"); },
    () => { calls.push("second"); throw new Error("second"); },
    () => { calls.push("third"); },
  ]);
  expect(calls).toEqual(["first", "second", "third"]);
  expect(failures).toHaveLength(2);
});