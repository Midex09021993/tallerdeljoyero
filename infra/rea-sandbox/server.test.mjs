import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";

const port = 18000 + Math.floor(Math.random() * 10000);
const baseUrl = `http://127.0.0.1:${port}`;
let child;
const secret = "test-only-secret-with-at-least-32-bytes-long";
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
function makeToken() {
  const header = b64({ alg: "HS256", typ: "JWT" });
  const now = Math.floor(Date.now() / 1000);
  const payload = b64({ iss: "tallerdeljoyero", aud: "aurum-intelligence-runner", sub: "5d80fd40-b059-42e9-ad57-28ac5cf9899e", iat: now, exp: now + 300, jti: "0123456789abcdef0123456789abcdef" });
  const signature = createHmac("sha256", secret).update(header + "." + payload).digest("base64url");
  return header + "." + payload + "." + signature;
}
const authHeaders = () => ({ authorization: "Bearer " + makeToken() });

before(async () => {
  child = spawn(process.execPath, ["--disable-proto=throw", "infra/rea-sandbox/server.mjs"], {
    env: { ...process.env, PORT: String(port), AURUM_RUNNER_JWT_SECRET: secret },
    stdio: "ignore",
  });

  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("Sandbox server exited before becoming healthy.");
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Sandbox server did not become healthy.");
});

after(() => {
  child?.kill("SIGTERM");
});

test("health endpoint explicitly reports execution disabled", async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    service: "aurum-rea-sandbox",
    status: "healthy",
    executionEnabled: false,
  });
});

test("analysis endpoint rejects requests without a signed token", async () => {
  const response = await fetch(`${baseUrl}/v1/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ files: [{ path: "probe.js", content: "process.exit(99)" }] }),
  });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error, "unauthorized");
});

test("analysis endpoint rejects declared payloads above the 12 MiB transport limit", async () => {
  const response = await fetch(`${baseUrl}/v1/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + makeToken() },
    body: "x".repeat(12 * 1024 * 1024 + 1),
  });
  assert.equal(response.status, 413);
  assert.equal((await response.json()).error, "request_too_large");
});

test("chunked analysis requests are consumed but never executed", async () => {
  const response = await fetch(`${baseUrl}/v1/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    headers: { authorization: "Bearer " + makeToken() },
    body: JSON.stringify({ files: [{ path: "probe.js", content: "console.log('not run')" }] }),
  });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "replay_protection_unavailable");
});

test("unknown routes are not exposed", async () => {
  const response = await fetch(`${baseUrl}/admin`);
  assert.equal(response.status, 404);
});
