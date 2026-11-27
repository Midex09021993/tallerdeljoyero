import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { inspectPortableExecutable } from "./pe-inspector.mjs";

const MAX_OUTPUT_BYTES = 12 * 1024 * 1024;
const ANALYSIS_TIMEOUT_MS = 8 * 60 * 1000;
let analysisInProgress = false;

function classifyReaStderr(stderr) {
  const value = String(stderr).toLowerCase();
  if (/ghidra.{0,40}(not found|missing|unavailable)|provider.{0,40}(not found|unavailable)/.test(value)) return "provider_unavailable";
  if (/java.{0,40}(not found|unable|error)|could not create the java virtual machine/.test(value)) return "java_runtime_error";
  if (/permission denied|eacces/.test(value)) return "filesystem_permission_error";
  if (/enoent|command not found|not found.*rea/.test(value)) return "rea_command_or_dependency_missing";
  if (/out of memory|heap space|memory limit/.test(value)) return "memory_limit";
  if (/invalid.*(pe|executable)|not a valid.*(pe|executable)/.test(value)) return "invalid_pe_input";
  return stderr.trim() ? "unclassified_stderr" : "empty_stderr";
}

function safeSpawnErrorCode(error) {
  const allowed = new Set(["ENOENT", "EACCES", "EPERM", "EMFILE", "ENFILE", "ENOMEM", "E2BIG"]);
  return allowed.has(error?.code) ? error.code : "UNKNOWN";
}

function runRea(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("rea", args, {
      shell: false,
      cwd: "/tmp",
      env: {
        PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
        HOME: "/tmp",
        JAVA_HOME: process.env.JAVA_HOME || "/opt/java/openjdk",
        GHIDRA_INSTALL_DIR: process.env.GHIDRA_INSTALL_DIR || "/opt/ghidra_12.2_PUBLIC",
        LANG: "C.UTF-8",
        LC_ALL: "C.UTF-8",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let outputBytes = 0;
    let settled = false;
    let timer;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      error ? reject(error) : resolve(result);
    };

    timer = setTimeout(() => {
      console.error("[rea-analysis] command_timeout", JSON.stringify({ timeoutMs: ANALYSIS_TIMEOUT_MS }));
      child.kill("SIGKILL");
      finish(new Error("analysis_timeout"));
    }, ANALYSIS_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > MAX_OUTPUT_BYTES) {
        console.error("[rea-analysis] output_limit", JSON.stringify({ maxOutputBytes: MAX_OUTPUT_BYTES }));
        child.kill("SIGKILL");
        finish(new Error("analysis_output_limit"));
        return;
      }
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 64 * 1024) stderr += chunk.toString("utf8").slice(0, 64 * 1024 - stderr.length);
    });
    child.once("error", (error) => {
      console.error("[rea-analysis] spawn_failed", JSON.stringify({
        errorCode: safeSpawnErrorCode(error),
      }));
      finish(new Error("rea_start_failed"));
    });
    child.once("close", (code, signal) => {
      if (settled) return;
      if (code !== 0) {
        console.error("[rea-analysis] command_failed", JSON.stringify({
          exitCode: Number.isInteger(code) ? code : null,
          signal: ["SIGTERM", "SIGKILL", "SIGABRT", "SIGSEGV"].includes(signal) ? signal : null,
          stderrBytes: Buffer.byteLength(stderr),
          diagnostic: classifyReaStderr(stderr),
        }));
        finish(new Error("rea_analysis_failed"));
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
  if (!Buffer.isBuffer(binary) || binary.length < 256 || binary.length > 32 * 1024 * 1024) {
    throw new Error("binary_size_invalid");
  }
  if (!["managed", "native"].includes(mode)) throw new Error("analysis_mode_invalid");

  const staticProfile = inspectPortableExecutable(binary);
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
      return { engine: "REA", provider: "managed-static", executed: false, staticProfile, artifact, members };
    }
    const report = await runRea(["analyze", targetPath, "--provider", "ghidra", "--json"]);
    const investigation = {
      procedures: { status: "pending", result: null },
      strings: { status: "pending", result: null },
      decompilation: { status: "pending", items: [] },
    };

    // Each REA CLI call owns an ephemeral Ghidra session. Keep calls strictly
    // sequential to stay within the runner's 1 GiB memory ceiling.
    try {
      investigation.procedures.result = await runRea([
        "search", targetPath, "--pattern=.*", "--mode", "regex", "--kind", "procedures",
        "--provider", "ghidra", "--json",
      ]);
      investigation.procedures.status = "complete";
    } catch {
      investigation.procedures.status = "unavailable";
    }

    try {
      investigation.strings.result = await runRea([
        "search", targetPath, "--pattern=.*", "--mode", "regex", "--kind", "strings",
        "--provider", "ghidra", "--json",
      ]);
      investigation.strings.status = "complete";
    } catch {
      investigation.strings.status = "unavailable";
    }

    const procedureResult = investigation.procedures.result;
    const normalized = procedureResult?.normalized_result ?? {};
    const procedureRows = Array.isArray(normalized) ? normalized :
      Array.isArray(normalized.procedures) ? normalized.procedures :
      Array.isArray(normalized.rows) ? normalized.rows :
      Array.isArray(normalized.items) ? normalized.items : [];
    const selectors = procedureRows
      .map((item) => item?.address ?? item?.procedure?.address ?? item?.name ?? item?.value)
      .filter((value) => typeof value === "string" && value.length > 0)
      .slice(0, 3);

    if (selectors.length) {
      for (const selector of selectors) {
        try {
          const result = await runRea([
            "decompile", targetPath, "--procedure=" + selector,
            "--provider", "ghidra", "--json",
          ]);
          investigation.decompilation.items.push({ selector, status: "complete", result });
        } catch {
          investigation.decompilation.items.push({ selector, status: "unavailable" });
        }
      }
      investigation.decompilation.status = investigation.decompilation.items.every((item) => item.status === "complete")
        ? "complete"
        : "partial";
    } else {
      investigation.decompilation.status = "not_attempted";
    }

    return {
      engine: "REA + Ghidra",
      provider: "ghidra",
      executed: false,
      staticProfile,
      report,
      investigation,
    };
  } finally {
    try {
      if (directory) await rm(directory, { recursive: true, force: true });
    } finally {
      analysisInProgress = false;
    }
  }
}
