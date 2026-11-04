import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = 18000 + Math.floor(Math.random() * 10000);
const baseUrl = `http://127.0.0.1:${port}`;
let child;

before(async () => {
  child = spawn(process.execPath, ["--disable-proto=throw", "infra/rea-sandbox/server.mjs"], {
    env: { ...process.env, PORT: String(port) },
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

test("analysis endpoint never executes and always rejects with 503", async () => {
  const response = await fetch(`${baseUrl}/v1/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ files: [{ path: "probe.js", content: "process.exit(99)" }] }),
  });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "execution_disabled");
});

test("analysis endpoint rejects declared payloads above the 12 MiB transport limit", async () => {
  const response = await fetch(`${baseUrl}/v1/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "x".repeat(12 * 1024 * 1024 + 1),
  });
  assert.equal(response.status, 413);
  assert.equal((await response.json()).error, "request_too_large");
});

test("chunked analysis requests are consumed but never executed", async () => {
  const response = await fetch(`${baseUrl}/v1/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ files: [{ path: "probe.js", content: "console.log('not run')" }] }),
  });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "execution_disabled");
});

test("unknown routes are not exposed", async () => {
  const response = await fetch(`${baseUrl}/admin`);
  assert.equal(response.status, 404);
});
