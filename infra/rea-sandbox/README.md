# AURUM REA SANDBOX

Independent, intentionally inert service scaffold for the future REA analysis boundary.

## Current security posture

- REA is not installed; this first analysis capability is a small, static PE metadata inspector.
- No user-supplied code, shell command, package, archive, or binary is executed.
- `GET /health` reports service health and `executionEnabled: false`.
- `POST /v1/inspect-pe` accepts one Base64-encoded `.exe` or `.dll` (maximum 4 MiB), requires a valid short-lived JWT and Redis-backed single-use token, and returns PE architecture, sections, import-library names, and CLR metadata. It parses bytes in memory only; it does not execute or persist the binary. Redis/auth failures fail closed (401/409/503).
- `POST /v1/analyze` remains a validation-only placeholder. It returns `validated_and_discarded`; REA execution remains disabled.
- No Supabase, GitHub, application, or production secrets are configured.
- The service has no application-level outbound network client.
- Run as the unprivileged `node` user.

This service is not an execution sandbox and must not be described as one. The PE inspector is a bounded parser, not a malware verdict or a decompiler. It does not unpack protected installers or recover original source code. Platform-level private reachability and resource limits must still be verified.

## Local smoke test

```sh
docker build -t aurum-rea-sandbox infra/rea-sandbox
docker run --rm -p 8080:8080 aurum-rea-sandbox
curl -i http://localhost:8080/health
curl -i -X POST http://localhost:8080/v1/analyze
```

Expected: health returns 200 and `executionEnabled: false`; unauthenticated inspection requests return 401. Authenticated inspection also requires replay protection; if Redis is unavailable it fails closed with 503. With Redis available, a valid PE file returns static metadata and is neither executed nor stored.
