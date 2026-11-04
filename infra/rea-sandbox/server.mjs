import { createServer } from "node:http";

const PORT = Number.parseInt(process.env.PORT ?? "8080", 10);
const MAX_REQUEST_BYTES = 1024 * 1024;

// This service is deliberately inert. Do not add REA, shell, package managers,
// dynamic code loading, outbound requests, or user-controlled execution here.
const EXECUTION_ENABLED = false;

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

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;

  if (request.method === "GET" && pathname === "/health") {
    return sendJson(response, 200, {
      service: "aurum-rea-sandbox",
      status: "healthy",
      executionEnabled: EXECUTION_ENABLED,
    });
  }

  if (request.method === "POST" && pathname === "/v1/analyze") {
    const contentLength = Number(request.headers["content-length"] ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return sendJson(response, 413, { error: "request_too_large" });
    }
    return sendJson(response, 503, {
      error: "execution_disabled",
      message: "REA execution is disabled while the sandbox security review is pending.",
    });
  }

  return sendJson(response, 404, { error: "not_found" });
});

server.headersTimeout = 5_000;
server.requestTimeout = 10_000;
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
