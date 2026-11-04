import { createHash } from "node:crypto";

const MAX_BINARY_BYTES = 32 * 1024 * 1024;
const MAX_SECTIONS = 96;
const MAX_IMPORT_LIBRARIES = 128;
const MAX_IMPORTS_PER_LIBRARY = 512;
const MAX_TOTAL_IMPORTS = 2048;

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

function calculateEntropy(buffer, start, size) {
  if (!size || start < 0 || start + size > buffer.length) return null;
  const counts = new Uint32Array(256);
  for (let i = start; i < start + size; i += 1) counts[buffer[i]] += 1;
  let entropy = 0;
  for (const count of counts) {
    if (!count) continue;
    const probability = count / size;
    entropy -= probability * Math.log2(probability);
  }
  return Number(entropy.toFixed(3));
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
    sections.push({
      name, virtualSize, virtualAddress, rawSize, rawOffset,
      entropy: calculateEntropy(buffer, rawOffset, rawSize),
    });
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
  const importedFunctions = [];
  let importCount = 0;
  if (importDirectory.rva) {
    let offset = rvaToOffset(importDirectory.rva);
    if (offset !== null) {
      for (let index = 0; index < MAX_IMPORT_LIBRARIES && offset + 20 <= buffer.length; index += 1, offset += 20) {
        const originalThunk = u32(buffer, offset);
        const nameRva = u32(buffer, offset + 12);
        const firstThunk = u32(buffer, offset + 16);
        if (!nameRva && !originalThunk && !firstThunk) break;
        const nameOffset = rvaToOffset(nameRva);
        if (nameOffset === null) continue;
        const library = readAscii(buffer, nameOffset, buffer.length, 260);
        if (!library) continue;
        if (!importLibraries.includes(library)) importLibraries.push(library);

        const thunkRva = originalThunk || firstThunk;
        let thunkOffset = rvaToOffset(thunkRva);
        if (thunkOffset === null) continue;
        const width = is64Bit ? 8 : 4;
        const ordinalMask = is64Bit ? 0x8000000000000000n : 0x80000000n;
        const functions = [];
        for (let thunkIndex = 0; thunkIndex < MAX_IMPORTS_PER_LIBRARY && thunkOffset + width <= buffer.length; thunkIndex += 1) {
          const thunk = is64Bit ? buffer.readBigUInt64LE(thunkOffset) : BigInt(u32(buffer, thunkOffset));
          if (thunk === 0n) break;
          const ordinal = (thunk & ordinalMask) !== 0n;
          if (ordinal) {
            functions.push("ordinal_" + String(thunk & 0xffffn));
          } else {
            const importNameOffset = rvaToOffset(Number(thunk));
            if (importNameOffset !== null && importNameOffset + 2 < buffer.length) {
              const functionName = readAscii(buffer, importNameOffset + 2, buffer.length, 256);
              if (functionName) functions.push(functionName);
            }
          }
          importCount += 1;
          if (importCount >= MAX_TOTAL_IMPORTS) break;
          thunkOffset += width;
        }
        if (functions.length) importedFunctions.push({ library, functions });
        if (importCount >= MAX_TOTAL_IMPORTS) break;
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

  const certificateDirectory = dataDirectory(4);
  const debugDirectory = dataDirectory(6);
  const tlsDirectory = dataDirectory(9);
  const maxSectionEntropy = sections.reduce((max, section) => Math.max(max, section.entropy ?? 0), 0);
  const overlayStart = sections.reduce((max, section) => Math.max(max, section.rawOffset + section.rawSize), sectionTable + sectionCount * 40);
  const overlayBytes = Math.max(0, buffer.length - Math.min(buffer.length, overlayStart));
  const sectionNames = sections.map((section) => section.name);
  const observations = [];

  if (maxSectionEntropy >= 7.2) observations.push({
    code: "high_section_entropy",
    severity: "review",
    detail: "Una o más secciones tienen entropía alta; puede corresponder a compresión, cifrado o datos comprimidos.",
    evidence: { maxSectionEntropy: Number(maxSectionEntropy.toFixed(3)) },
  });
  if (sectionNames.some((name) => /^(\.enigma|\.themida|\.vmp|\.upx|\.aspack)/i.test(name))) observations.push({
    code: "unusual_protection_section_name",
    severity: "review",
    detail: "Se detectaron nombres de sección asociados en ocasiones con protectores o empaquetadores; el nombre por sí solo no confirma su uso.",
    evidence: { sectionNames },
  });
  if (clr.present) observations.push({
    code: "clr_directory_present",
    severity: "info",
    detail: "El encabezado PE contiene un directorio CLR. Esto no garantiza que el archivo sea íntegramente administrado.",
  });
  if (importLibraries.some((name) => /^(advapi32|api-ms-win-security|secur32)/i.test(name))) observations.push({
    code: "security_or_registry_library_imported",
    severity: "info",
    detail: "Se importa una biblioteca que puede exponer APIs de seguridad o Registro; esto no demuestra qué funciones se ejecutan ni con qué finalidad.",
  });
  if (tlsDirectory.rva) observations.push({
    code: "tls_directory_present",
    severity: "info",
    detail: "El PE contiene un directorio TLS; puede incluir callbacks ejecutados por el cargador de Windows. No se ejecutaron ni inspeccionaron dinámicamente.",
  });

  const machineNames = {
    0x014c: "x86",
    0x8664: "x64",
    0xaa64: "ARM64",
    0x01c0: "ARM",
  };

  return {
    format: "PE",
    fileSizeBytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    machine: machineNames[machine] || "unknown",
    machineCode: "0x" + machine.toString(16).padStart(4, "0"),
    optionalHeader: is64Bit ? "PE32+" : "PE32",
    architecture: is64Bit ? "64-bit" : "32-bit",
    compileTimestamp: timestamp ? new Date(timestamp * 1000).toISOString() : null,
    sections,
    sectionCount,
    importLibraries,
    importedFunctions,
    importCount,
    directories: {
      clr: clrDirectory,
      certificate: certificateDirectory,
      debug: debugDirectory,
      tls: tlsDirectory,
    },
    clr,
    overlayBytes,
    maxSectionEntropy: Number(maxSectionEntropy.toFixed(3)),
    observations,
    runtimeHint: clr.present
      ? "Common Language Runtime (.NET-compatible assembly)"
      : "Native PE or managed metadata not detected",
    executionPerformed: false,
  };
}
