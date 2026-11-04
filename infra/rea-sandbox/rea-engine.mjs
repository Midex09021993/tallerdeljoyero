import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const MAX_OUTPUT_BYTES = 12 * 1024 * 1024;
const ANALYSIS_TIMEOUT_MS = 8 * 60 * 1000;
let analysisInProgress = false;

function runRea(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("rea", args, {
      shell: false,
      cwd: "/tmp",
      env: {
        PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
        HOME: "/tmp",
        JAVA_HOME: process.env.JAVA_HOME || "/usr/lib/jvm/java-21-openjdk-amd64",
        GHIDRA_INSTALL_DIR: process.env.GHIDRA_INSTALL_DIR || "/opt/ghidra_12.1.4_PUBLIC",
        LANG: "C.UTF-8",
        LC_ALL: "C.UTF-8",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let outputBytes = 0;
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      error ? reject(error) : resolve(result);
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new Error("analysis_timeout"));
    }, ANALYSIS_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > MAX_OUTPUT_BYTES) {
        child.kill("SIGKILL");
        finish(new Error("analysis_output_limit"));
        return;
      }
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 64 * 1024) stderr += chunk.toString("utf8").slice(0, 64 * 1024 - stderr.length);
    });
    child.once("error", () => finish(new Error("rea_start_failed")));
    child.once("close", (code) => {
      if (code !== 0) {
        finish(new Error("rea_analysis_failed:" + String(code) + ":" + stderr.slice(-4000)));
        return;
      }
      try {
        finish(null, JSON.parse(stdout));
      } catch {
        finish(new Error("rea_output_invalid"));
      }
    });
  });
}

/**
 * Analyze user-supplied PE files statically. REA/Ghidra inspect bytes and
 * metadata; the target executable is never launched. Temporary copies are
 * deleted after the result is collected.
 */
export async function analyzeWithRea(fileName, binary, mode) {
  if (analysisInProgress) throw new Error("analysis_busy");
  if (!Buffer.isBuffer(binary) || binary.length < 256 || binary.length > 4 * 1024 * 1024) {
    throw new Error("binary_size_invalid");
  }
  if (!["managed", "native"].includes(mode)) throw new Error("analysis_mode_invalid");

  analysisInProgress = true;
  let directory;
  try {
    directory = await mkdtemp(join(tmpdir(), "aurum-rea-"));
    const safeName = randomUUID() + (fileName.toLowerCase().endsWith(".dll") ? ".dll" : ".exe");
    const targetPath = join(directory, safeName);
    await writeFile(targetPath, binary, { flag: "wx", mode: 0o600 });
    if (mode === "managed") {
      const artifact = await runRea(["inspect-managed-artifact", targetPath, "--json"]);
      const members = await runRea(["inspect-managed-members", targetPath, "--json"]);
      return { engine: "REA", provider: "managed-static", executed: false, artifact, members };
    }
    const report = await runRea(["analyze", targetPath, "--provider", "ghidra", "--json"]);
    return { engine: "REA + Ghidra", provider: "ghidra", executed: false, report };
  } finally {
    try {
      if (directory) await rm(directory, { recursive: true, force: true });
    } finally {
      analysisInProgress = false;
    }
  }
}
