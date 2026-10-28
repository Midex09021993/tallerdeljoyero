#!/usr/bin/env node
// Verifica que AURUM Render coincide con el manifiesto aurum-engine.lock.json.
// Uso: node scripts/check-aurum-lock.mjs            -> verifica
//      node scripts/check-aurum-lock.mjs --generate -> regenera (solo tras "DESCONGELAR AURUM RENDER")
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const LOCK = join(ROOT, "aurum-engine.lock.json");

// Motor + componentes del candado (el script y el workflow se autoprotegen).
const PROTECTED_DIRS = ["src/lib/aurum"];
const PROTECTED_FILES = [
  "src/components/AurumRender.tsx",
  "src/components/AurumRenderConfig.tsx",
  "src/lib/aurum-material-engine.ts",
  "scripts/check-aurum-lock.mjs",
  ".github/workflows/quality.yml",
];

const sha256 = (p) =>
  createHash("sha256").update(readFileSync(join(ROOT, p))).digest("hex");

function walk(dir) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).flatMap((name) => {
    const full = join(abs, name);
    const rel = relative(ROOT, full).split(sep).join("/");
    return statSync(full).isDirectory() ? walk(rel) : [rel];
  });
}

function currentFiles() {
  return [...new Set([...PROTECTED_DIRS.flatMap(walk), ...PROTECTED_FILES])].sort();
}

function validPath(p) {
  return (
    typeof p === "string" &&
    !p.startsWith("/") &&
    !p.split("/").includes("..") &&
    resolve(ROOT, p).startsWith(ROOT + sep)
  );
}

if (process.argv.includes("--generate")) {
  const files = {};
  for (const p of currentFiles()) files[p] = sha256(p);
  const lock = {
    description:
      "Candado de integridad de AURUM Render. No editar sin la frase DESCONGELAR AURUM RENDER.",
    baseline_commit: process.env.AURUM_BASELINE ?? "unknown",
    algorithm: "sha256",
    protected_dirs: PROTECTED_DIRS,
    files,
  };
  writeFileSync(LOCK, JSON.stringify(lock, null, 2) + "\n");
  console.log(`aurum-engine.lock.json generado con ${Object.keys(files).length} archivos.`);
  process.exit(0);
}

if (!existsSync(LOCK)) {
  console.error("ERROR: falta aurum-engine.lock.json");
  process.exit(1);
}

const lock = JSON.parse(readFileSync(LOCK, "utf8"));
const errors = [];
const expected = lock.files ?? {};

for (const [p, hash] of Object.entries(expected)) {
  if (!validPath(p)) { errors.push(`RUTA INVÁLIDA: ${p}`); continue; }
  if (!existsSync(join(ROOT, p))) { errors.push(`FALTA: ${p}`); continue; }
  if (sha256(p) !== hash) errors.push(`MODIFICADO: ${p}`);
}
for (const p of currentFiles()) {
  if (!(p in expected)) errors.push(`NO AUTORIZADO (nuevo o fuera del manifiesto): ${p}`);
}

if (errors.length) {
  console.error("AURUM Render: el candado detectó cambios no autorizados:");
  for (const e of errors) console.error("  - " + e);
  console.error('Para cambios legítimos se requiere "DESCONGELAR AURUM RENDER" y regenerar el manifiesto.');
  process.exit(1);
}
console.log(`AURUM Render íntegro: ${Object.keys(expected).length} archivos verificados.`);
