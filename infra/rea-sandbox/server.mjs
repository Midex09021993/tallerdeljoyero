import { createServer } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";

const PORT = Number.parseInt(process.env.PORT ?? "8080", 10);
// 10 MiB of source text plus JSON envelope/UTF-8 serialization overhead.
const MAX_REQUEST_BYTES = 12 * 1024 * 1024;

// This service is deliberately inert. Do not add REA, shell, package managers,
// dynamic code loading, outbound requests, or user-controlled execution here.
const EXECUTION_ENABLED = false;
const JWT_ISSUER = "tallerdeljoyero";
const JWT_AUDIENCE = "aurum-intelligence-runner";
const JWT_SUBJECT = "5d80fd40-b059-42e9-ad57-28ac5cf9899e";
const MAX_TOKEN_SECONDS = 300;

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

function verifyRunnerToken(request) {
  const authorization = request.headers.authorization;
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) return false;
  const token = authorization.slice(7);
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) return false;
  const secret = process.env.AURUM_RUNNER_JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) return false;
  try {
    const header = JSON.parse(decodeBase64Url(parts[0]).toString("utf8"));
    const claims = JSON.parse(decodeBase64Url(parts[1]).toString("utf8"));
    if (!header || header.alg !== "HS256" || header.typ !== "JWT") return false;
    const expected = createHmac("sha256", secret).update(parts[0] + "." + parts[1]).digest();
    const actual = decodeBase64Url(parts[2]);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
    const now = Math.floor(Date.now() / 1000);
    return claims.iss === JWT_ISSUER &&
      claims.aud === JWT_AUDIENCE &&
      claims.sub === JWT_SUBJECT &&
      Number.isInteger(claims.iat) &&
      Number.isInteger(claims.exp) &&
      claims.iat <= now + 30 &&
      claims.exp > now &&
      claims.exp > claims.iat &&
      claims.exp - claims.iat <= MAX_TOKEN_SECONDS &&
      typeof claims.jti === "string" &&
      /^[a-f0-9]{32}$/.test(claims.jti);
  } catch {
    return false;
  }
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
      executionEnabled: EXECUTION_ENABLED,
    });
  }

  if (request.method === "POST" && pathname === "/v1/analyze") {
    if (!verifyRunnerToken(request)) {
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

    // Fail closed until an atomic, persistent one-time-token store is configured.
    // A process-local cache is intentionally not accepted as replay protection.
    return sendJson(response, 503, {
      error: "replay_protection_unavailable",
      message: "Persistent one-time-token protection is not configured; analysis remains disabled.",
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
  process.stdout.write(`AURUM REA SANDBOX listening on ${PORT}; execution disabled\\n`);
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
