import { test } from "node:test";
import assert from "node:assert/strict";
import { inspectPortableExecutable } from "./pe-inspector.mjs";

function minimalPe() {
  const buffer = Buffer.alloc(1024);
  buffer.write("MZ", 0, "ascii");
  buffer.writeUInt32LE(0x80, 0x3c);
  buffer.write("PE\0\0", 0x80, "binary");

  const coff = 0x84;
  buffer.writeUInt16LE(0x014c, coff);
  buffer.writeUInt16LE(1, coff + 2);
  buffer.writeUInt32LE(1_700_000_000, coff + 4);
  buffer.writeUInt16LE(224, coff + 16);

  const optional = coff + 20;
  buffer.writeUInt16LE(0x10b, optional);
  buffer.writeUInt32LE(16, optional + 92);

  const section = optional + 224;
  buffer.write(".text", section, "ascii");
  buffer.writeUInt32LE(0x100, section + 8);
  buffer.writeUInt32LE(0x1000, section + 12);
  buffer.writeUInt32LE(0x200, section + 16);
  buffer.writeUInt32LE(0x200, section + 20);
  return buffer;
}

test("inspects PE32 metadata without executing the file", () => {
  const report = inspectPortableExecutable(minimalPe());
  assert.equal(report.format, "PE");
  assert.equal(report.architecture, "32-bit");
  assert.equal(report.machine, "x86");
  assert.equal(report.sections[0].name, ".text");
  assert.deepEqual(report.importLibraries, []);
  assert.equal(report.clr.present, false);
});

test("rejects non-PE input", () => {
  assert.throws(() => inspectPortableExecutable(Buffer.alloc(512)), /not_pe/);
});

test("rejects binaries above the static inspection limit", () => {
  assert.throws(() => inspectPortableExecutable(Buffer.alloc(32 * 1024 * 1024 + 1)), /binary_size_invalid/);
});
