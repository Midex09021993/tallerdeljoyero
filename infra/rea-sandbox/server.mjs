import { createServer } from "node:http";

const PORT = Number.parseInt(process.env.PORT ?? "8080", 10);
// 10 MiB of source text plus JSON envelope/UTF-8 serialization overhead.
const MAX_REQUEST_BYTES = 12 * 1024 * 1024;

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

    return sendJson(response, 503, {
      error: "execution_disabled",
      message: "REA execution is disabled while the sandbox security review is pending.",
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
