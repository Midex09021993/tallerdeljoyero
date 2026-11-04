import { createServer } from "node:http";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { connect } from "node:net";
import { inspectPortableExecutable } from "./pe-inspector.mjs";
import { analyzeWithRea } from "./rea-engine.mjs";

const PORT = Number.parseInt(process.env.PORT ?? "8080", 10);
// 10 MiB of source text plus JSON envelope/UTF-8 serialization overhead.
const MAX_REQUEST_BYTES = 12 * 1024 * 1024;

// This service is deliberately inert. Do not add REA, shell, package managers,
// dynamic code loading, outbound requests, or user-controlled execution here.
const STATIC_ANALYSIS_ENABLED = true;
const TARGET_EXECUTION_ENABLED = false;
const JWT_ISSUER = "tallerdeljoyero";
const JWT_AUDIENCE = "aurum-intelligence-runner";
const JWT_SUBJECT = "5d80fd40-b059-42e9-ad57-28ac5cf9899e";
const MAX_TOKEN_SECONDS = 300;
const ANALYSIS_JOB_TTL_MS = 15 * 60 * 1000;
const MAX_ANALYSIS_JOBS = 4;
const analysisJobs = new Map();

function pruneAnalysisJobs() {
  const now = Date.now();
  for (const [id, job] of analysisJobs) {
    if (job.expiresAt <= now) analysisJobs.delete(id);
  }
  while (analysisJobs.size >= MAX_ANALYSIS_JOBS) {
    const oldest = analysisJobs.keys().next().value;
    if (!oldest) break;
    const job = analysisJobs.get(oldest);
    if (job && (job.status === "queued" || job.status === "running")) break;
    analysisJobs.delete(oldest);
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "connection": "close",
  });
  response.end(JSON.stringify(payload));
}

function decodeBase64Url(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("invalid_base64url");
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function authFailure(reason) {
  // Diagnostic only: never log tokens, claims, signatures, or secret values.
  console.warn("[runner-auth] rejected:", reason);
  return false;
}

function verifyRunnerToken(request) {
  const authorization = request.headers.authorization;
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) {
    return authFailure("missing_bearer");
  }
  const token = authorization.slice(7);
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) return authFailure("malformed_token");
  const secret = process.env.AURUM_RUNNER_JWT_SECRET;
  if (!secret) return authFailure("secret_missing");
  const secretBytes = Buffer.byteLength(secret);
  if (secretBytes < 32) return authFailure("secret_too_short");
  try {
    const header = JSON.parse(decodeBase64Url(parts[0]).toString("utf8"));
    const claims = JSON.parse(decodeBase64Url(parts[1]).toString("utf8"));
    if (!header || header.alg !== "HS256" || header.typ !== "JWT") return authFailure("invalid_header");
    const expected = createHmac("sha256", secret).update(parts[0] + "." + parts[1]).digest();
    const actual = decodeBase64Url(parts[2]);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return authFailure("signature_mismatch");
    }
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== JWT_ISSUER) return authFailure("issuer_mismatch");
    if (claims.aud !== JWT_AUDIENCE) return authFailure("audience_mismatch");
    if (claims.sub !== JWT_SUBJECT) return authFailure("subject_mismatch");
    if (!Number.isInteger(claims.iat) || !Number.isInteger(claims.exp)) return authFailure("invalid_timestamps");
    if (claims.iat > now + 30) return authFailure("issued_in_future");
    if (claims.exp <= now) return authFailure("token_expired");
    if (claims.exp <= claims.iat || claims.exp - claims.iat > MAX_TOKEN_SECONDS) {
      return authFailure("invalid_token_lifetime");
    }
    if (typeof claims.jti !== "string" || !/^[a-f0-9]{32}$/.test(claims.jti)) {
      return authFailure("invalid_token_id");
    }
    return claims;
  } catch {
    return authFailure("invalid_token_encoding_or_json");
  }
}

function safeReplayDiagnostic(error) {
  const message = error instanceof Error ? error.message : "";
  const allowed = new Set([
    "replay_store_not_configured", "replay_store_timeout", "replay_store_auth_failed",
    "redis_command_failed", "redis_protocol_error", "replay_store_unavailable",
    "ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ETIMEDOUT", "EHOSTUNREACH",
    "ENETUNREACH", "ECONNRESET", "EACCES",
  ]);
  return allowed.has(message) ? message : "replay_store_unknown_error";
}

function redisCommand(parts) {
  return "*" + parts.length + "\r\n" + parts.map((part) => {
    const value = String(part);
    return "$" + Buffer.byteLength(value) + "\r\n" + value + "\r\n";
  }).join("");
}

function redisReplyLine(buffer) {
  const end = buffer.indexOf("\r\n");
  if (end < 0) return null;
  const line = buffer.subarray(0, end).toString("utf8");
  if (line.startsWith("+")) return { value: line.slice(1), bytes: end + 2 };
  if (line.startsWith("-")) throw new Error("redis_command_failed");
  if (line === "$-1") return { value: null, bytes: end + 2 };
  throw new Error("redis_protocol_error");
}

async function consumeOneTimeToken(jti, ttlSeconds) {
  const host = process.env.AURUM_REPLAY_STORE_HOST || "aurum-rea-replay.railway.internal";
  const password = process.env.AURUM_REPLAY_STORE_PASSWORD;
  if (!password || Buffer.byteLength(password) < 32) throw new Error("replay_store_not_configured");
  const port = Number.parseInt(process.env.AURUM_REPLAY_STORE_PORT || "6379", 10);
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port });
    let stage = "auth";
    let buffer = Buffer.alloc(0);
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      error ? reject(error) : resolve(value);
    };
    socket.setTimeout(3_000);
    socket.once("timeout", () => finish(new Error("replay_store_timeout")));
    socket.once("error", (error) => {
      const code = ["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ETIMEDOUT", "EHOSTUNREACH", "ENETUNREACH", "ECONNRESET", "EACCES"].includes(error?.code) ? error.code : "replay_store_unavailable";
      finish(new Error(code));
    });
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        const reply = redisReplyLine(buffer);
        if (!reply) return;
        buffer = buffer.subarray(reply.bytes);
        if (stage === "auth") {
          if (reply.value !== "OK") return finish(new Error("replay_store_auth_failed"));
          stage = "set";
          socket.write(redisCommand(["SET", "aurum:runner:jti:" + jti, "1", "NX", "EX", Math.max(1, ttlSeconds)]));
          return;
        }
        finish(null, reply.value === "OK");
      } catch (error) {
        finish(error);
      }
    });
    socket.once("connect", () => socket.write(redisCommand(["AUTH", password])));
  });
}

async function readBoundedBody(request, limit) {
  const chunks = [];
  let received = 0;
  for await (const chunk of request) {
    received += Buffer.byteLength(chunk);
    if (received > limit) return null;
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks, received);
}

async function consumeBoundedBody(request) {
  let received = 0;
  for await (const chunk of request) {
    received += Buffer.byteLength(chunk);
    if (received > MAX_REQUEST_BYTES) return false;
  }
  return true;
}

const server = createServer(async (request, response) => {
  let pathname;
  try {
    pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  } catch {
    return sendJson(response, 400, { error: "invalid_request_target" });
  }

  if (request.method === "GET" && pathname === "/health") {
    return sendJson(response, 200, {
      service: "aurum-rea-sandbox",
      status: "healthy",
      staticAnalysisEnabled: STATIC_ANALYSIS_ENABLED,
      targetExecutionEnabled: TARGET_EXECUTION_ENABLED,
    });
  }

  if (request.method === "POST" && pathname === "/v1/inspect-pe") {
    const tokenClaims = verifyRunnerToken(request);
    if (!tokenClaims) {
      request.resume();
      return sendJson(response, 401, { error: "unauthorized" });
    }
    if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
      request.resume();
      return sendJson(response, 415, { error: "content_type_not_supported" });
    }

    const body = await readBoundedBody(request, 6 * 1024 * 1024);
    if (!body) return sendJson(response, 413, { error: "request_too_large" });

    let payload;
    try {
      payload = JSON.parse(body.toString("utf8"));
    } catch {
      return sendJson(response, 400, { error: "invalid_json" });
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
        Object.keys(payload).some((key) => key !== "fileName" && key !== "contentBase64") ||
        typeof payload.fileName !== "string" ||
        !/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}\.(exe|dll)$/i.test(payload.fileName) ||
        typeof payload.contentBase64 !== "string" ||
        payload.contentBase64.length < 4 ||
        payload.contentBase64.length > 6 * 1024 * 1024 ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(payload.contentBase64)) {
      return sendJson(response, 400, { error: "invalid_pe_request" });
    }

    const binary = Buffer.from(payload.contentBase64, "base64");
    if (binary.length > 4 * 1024 * 1024 || binary.toString("base64") !== payload.contentBase64) {
      return sendJson(response, 413, { error: "binary_size_or_encoding_invalid" });
    }

    try {
      const accepted = await consumeOneTimeToken(tokenClaims.jti, tokenClaims.exp - Math.floor(Date.now() / 1000));
      if (!accepted) return sendJson(response, 409, { error: "token_replayed" });
    } catch {
      return sendJson(response, 503, { error: "replay_protection_unavailable" });
    }

    try {
      const report = inspectPortableExecutable(binary);
      return sendJson(response, 200, {
        status: "static_analysis_complete",
        executed: false,
        stored: false,
        fileName: payload.fileName,
        report,
      });
    } catch (error) {
      const code = error instanceof Error && /^[a-z0-9_]+$/.test(error.message)
        ? error.message
        : "pe_inspection_failed";
      return sendJson(response, 422, { error: code, executed: false, stored: false });
    }
  }

  if (request.method === "POST" && pathname === "/v1/analyze-pe") {
    const tokenClaims = verifyRunnerToken(request);
    if (!tokenClaims) {
      request.resume();
      return sendJson(response, 401, { error: "unauthorized" });
    }
    if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
      request.resume();
      return sendJson(response, 415, { error: "content_type_not_supported" });
    }

    const body = await readBoundedBody(request, 6 * 1024 * 1024);
    if (!body) return sendJson(response, 413, { error: "request_too_large" });

    let payload;
    try {
      payload = JSON.parse(body.toString("utf8"));
    } catch {
      return sendJson(response, 400, { error: "invalid_json" });
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
        Object.keys(payload).some((key) => !["fileName", "contentBase64", "mode"].includes(key)) ||
        typeof payload.fileName !== "string" ||
        !/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}\.(exe|dll)$/i.test(payload.fileName) ||
        typeof payload.contentBase64 !== "string" ||
        payload.contentBase64.length < 4 ||
        payload.contentBase64.length > 6 * 1024 * 1024 ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(payload.contentBase64) ||
        !["managed", "native"].includes(payload.mode)) {
      return sendJson(response, 400, { error: "invalid_pe_analysis_request" });
    }

    const binary = Buffer.from(payload.contentBase64, "base64");
    if (binary.length > 4 * 1024 * 1024 || binary.toString("base64") !== payload.contentBase64) {
      return sendJson(response, 413, { error: "binary_size_or_encoding_invalid" });
    }

    try {
      const accepted = await consumeOneTimeToken(tokenClaims.jti, tokenClaims.exp - Math.floor(Date.now() / 1000));
      if (!accepted) return sendJson(response, 409, { error: "token_replayed" });
    } catch {
      return sendJson(response, 503, { error: "replay_protection_unavailable" });
    }

    pruneAnalysisJobs();
    if (analysisJobs.size >= MAX_ANALYSIS_JOBS) {
      return sendJson(response, 429, { error: "analysis_queue_full", executed: false, stored: false });
    }
    const jobId = randomUUID();
    const job = {
      id: jobId,
      fileName: payload.fileName,
      status: "queued",
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + ANALYSIS_JOB_TTL_MS,
      result: null,
      error: null,
    };
    analysisJobs.set(jobId, job);
    setImmediate(async () => {
      job.status = "running";
      try {
        const result = await analyzeWithRea(payload.fileName, binary, payload.mode);
        job.result = {
          status: "static_analysis_complete",
          fileName: payload.fileName,
          stored: false,
          ...result,
        };
        job.status = "complete";
      } catch (error) {
        const message = error instanceof Error ? error.message : "rea_analysis_failed";
        const safeCode = /^[a-z0-9_]+$/.test(message) ? message : "rea_analysis_failed";
        job.error = safeCode;
        job.status = "failed";
      } finally {
        job.expiresAt = Date.now() + ANALYSIS_JOB_TTL_MS;
      }
    });
    return sendJson(response, 202, {
      status: "queued",
      jobId,
      fileName: payload.fileName,
      expiresInSeconds: ANALYSIS_JOB_TTL_MS / 1000,
      executed: false,
      stored: false,
    });
  }


  const jobMatch = request.method === "GET" ? pathname.match(/^\/v1\/analyze-pe\/([a-f0-9-]{36})$/i) : null;
  if (jobMatch) {
    const tokenClaims = verifyRunnerToken(request);
    if (!tokenClaims) return sendJson(response, 401, { error: "unauthorized" });
    try {
      const accepted = await consumeOneTimeToken(tokenClaims.jti, tokenClaims.exp - Math.floor(Date.now() / 1000));
      if (!accepted) return sendJson(response, 409, { error: "token_replayed" });
    } catch {
      return sendJson(response, 503, { error: "replay_protection_unavailable" });
    }
    pruneAnalysisJobs();
    const job = analysisJobs.get(jobMatch[1]);
    if (!job) return sendJson(response, 404, { error: "analysis_job_not_found" });
    return sendJson(response, 200, {
      status: job.status,
      fileName: job.fileName,
      result: job.status === "complete" ? job.result : null,
      error: job.error,
    });
  }

  if (request.method === "POST" && pathname === "/v1/analyze") {
    const tokenClaims = verifyRunnerToken(request);
    if (!tokenClaims) {
      request.resume();
      return sendJson(response, 401, { error: "unauthorized" });
    }

    const contentLengthHeader = request.headers["content-length"];
    if (contentLengthHeader !== undefined) {
      if (!/^(0|[1-9][0-9]*)$/.test(contentLengthHeader)) {
        request.resume();
        return sendJson(response, 400, { error: "invalid_content_length" });
      }
      if (Number(contentLengthHeader) > MAX_REQUEST_BYTES) {
        request.resume();
        return sendJson(response, 413, { error: "request_too_large" });
      }
    }

    try {
      const withinLimit = await consumeBoundedBody(request);
      if (!withinLimit) {
        return sendJson(response, 413, { error: "request_too_large" });
      }
    } catch {
      if (!response.headersSent) {
        return sendJson(response, 400, { error: "request_body_invalid" });
      }
      return response.destroy();
    }

    try {
      const accepted = await consumeOneTimeToken(tokenClaims.jti, tokenClaims.exp - Math.floor(Date.now() / 1000));
      if (!accepted) return sendJson(response, 409, { error: "token_replayed" });
    } catch {
      return sendJson(response, 503, { error: "replay_protection_unavailable" });
    }

    return sendJson(response, 200, {
      status: "validated_and_discarded",
      executionEnabled: false,
      filePayloadExecuted: false,
      message: "Authentication, request-size limits, and replay protection passed. The payload was discarded; REA execution remains disabled.",
    });
  }

  request.resume();
  return sendJson(response, 404, { error: "not_found" });
});

server.headersTimeout = 5_000;
server.requestTimeout = 15_000;
server.keepAliveTimeout = 1_000;
server.maxHeadersCount = 32;
server.maxRequestsPerSocket = 10;

server.listen(PORT, "0.0.0.0", () => {
  process.stdout.write(`AURUM REA SANDBOX listening on ${PORT}; static REA analysis enabled, target execution disabled\\n`);
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
