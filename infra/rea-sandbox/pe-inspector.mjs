const MAX_BINARY_BYTES = 32 * 1024 * 1024;
const MAX_SECTIONS = 96;
const MAX_IMPORT_LIBRARIES = 128;

function fail(message) {
  throw new Error(message);
}

function u16(buffer, offset) {
  if (offset < 0 || offset + 2 > buffer.length) fail("pe_truncated");
  return buffer.readUInt16LE(offset);
}

function u32(buffer, offset) {
  if (offset < 0 || offset + 4 > buffer.length) fail("pe_truncated");
  return buffer.readUInt32LE(offset);
}

function readAscii(buffer, start, end, maxLength = 512) {
  let value = "";
  for (let i = start; i < Math.min(end, start + maxLength) && buffer[i] !== 0; i += 1) {
    if (buffer[i] < 32 || buffer[i] > 126) return "";
    value += String.fromCharCode(buffer[i]);
  }
  return value;
}

/**
 * Reads PE metadata only. It never loads, maps, or executes the supplied file.
 * The caller must enforce upload authentication and transport limits.
 */
export function inspectPortableExecutable(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 256 || buffer.length > MAX_BINARY_BYTES) {
    fail("binary_size_invalid");
  }
  if (buffer.toString("ascii", 0, 2) !== "MZ") fail("not_pe");

  const peOffset = u32(buffer, 0x3c);
  if (peOffset < 0x40 || peOffset + 24 > buffer.length ||
      buffer.toString("binary", peOffset, peOffset + 4) !== "PE\0\0") {
    fail("invalid_pe_header");
  }

  const coff = peOffset + 4;
  const machine = u16(buffer, coff);
  const sectionCount = u16(buffer, coff + 2);
  const timestamp = u32(buffer, coff + 4);
  const optionalHeaderSize = u16(buffer, coff + 16);
  const optionalHeader = coff + 20;

  if (sectionCount < 1 || sectionCount > MAX_SECTIONS ||
      optionalHeader + optionalHeaderSize > buffer.length) {
    fail("pe_truncated");
  }

  const magic = u16(buffer, optionalHeader);
  if (magic !== 0x20b && magic !== 0x10b) fail("optional_header_invalid");

  const is64Bit = magic === 0x20b;
  const directoryCountOffset = optionalHeader + (is64Bit ? 108 : 92);
  const directoryOffset = optionalHeader + (is64Bit ? 112 : 96);
  const directoryCount = u32(buffer, directoryCountOffset);
  const sectionTable = optionalHeader + optionalHeaderSize;
  const sections = [];

  for (let index = 0; index < sectionCount; index += 1) {
    const offset = sectionTable + index * 40;
    if (offset + 40 > buffer.length) fail("section_table_truncated");

    const name = readAscii(buffer, offset, offset + 8, 8) || "unnamed";
    const virtualSize = u32(buffer, offset + 8);
    const virtualAddress = u32(buffer, offset + 12);
    const rawSize = u32(buffer, offset + 16);
    const rawOffset = u32(buffer, offset + 20);

    if (rawSize > 0 && (rawOffset > buffer.length || rawSize > buffer.length - rawOffset)) {
      fail("section_out_of_bounds");
    }
    sections.push({ name, virtualSize, virtualAddress, rawSize, rawOffset });
  }

  const rvaToOffset = (rva) => {
    for (const section of sections) {
      const span = Math.max(section.virtualSize, section.rawSize);
      if (rva >= section.virtualAddress && rva < section.virtualAddress + span) {
        const delta = rva - section.virtualAddress;
        return delta < section.rawSize ? section.rawOffset + delta : null;
      }
    }
    return rva < buffer.length ? rva : null;
  };

  const dataDirectory = (index) => {
    if (directoryCount <= index || directoryOffset + (index + 1) * 8 > optionalHeader + optionalHeaderSize) {
      return { rva: 0, size: 0 };
    }
    return {
      rva: u32(buffer, directoryOffset + index * 8),
      size: u32(buffer, directoryOffset + index * 8 + 4),
    };
  };

  const importDirectory = dataDirectory(1);
  const importLibraries = [];
  if (importDirectory.rva) {
    let offset = rvaToOffset(importDirectory.rva);
    if (offset !== null) {
      for (let index = 0; index < MAX_IMPORT_LIBRARIES && offset + 20 <= buffer.length; index += 1, offset += 20) {
        const nameRva = u32(buffer, offset + 12);
        if (!nameRva && !u32(buffer, offset) && !u32(buffer, offset + 16)) break;
        const nameOffset = rvaToOffset(nameRva);
        if (nameOffset !== null) {
          const name = readAscii(buffer, nameOffset, buffer.length, 260);
          if (name && !importLibraries.includes(name)) importLibraries.push(name);
        }
      }
    }
  }

  const clrDirectory = dataDirectory(14);
  let clr = { present: false };
  if (clrDirectory.rva) {
    const offset = rvaToOffset(clrDirectory.rva);
    if (offset !== null && offset + 24 <= buffer.length) {
      clr = {
        present: true,
        headerSize: u32(buffer, offset),
        metadataRva: u32(buffer, offset + 8),
        metadataSize: u32(buffer, offset + 12),
        flags: u32(buffer, offset + 16),
      };
    }
  }

  const machineNames = {
    0x014c: "x86",
    0x8664: "x64",
    0xaa64: "ARM64",
    0x01c0: "ARM",
  };

  return {
    format: "PE",
    fileSizeBytes: buffer.length,
    machine: machineNames[machine] || "unknown",
    machineCode: "0x" + machine.toString(16).padStart(4, "0"),
    optionalHeader: is64Bit ? "PE32+" : "PE32",
    architecture: is64Bit ? "64-bit" : "32-bit",
    compileTimestamp: timestamp ? new Date(timestamp * 1000).toISOString() : null,
    sections,
    importLibraries,
    clr,
    runtimeHint: clr.present
      ? "Common Language Runtime (.NET-compatible assembly)"
      : "Native PE or managed metadata not detected",
  };
}
