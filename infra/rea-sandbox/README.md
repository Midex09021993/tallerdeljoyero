# AURUM REA SANDBOX

Independent, intentionally inert service scaffold for the future REA analysis boundary.

## Current security posture

- REA is not installed.
- No user-supplied code, shell command, package, archive, or binary is executed.
- `GET /health` reports service health and `executionEnabled: false`.
- `POST /v1/analyze` requires a valid short-lived JWT, bounded request body, and Redis-backed single-use token. On success it returns HTTP 200 with `validated_and_discarded`; the payload is discarded and REA remains disabled. Redis/auth failures fail closed (401/409/503).
- No Supabase, GitHub, application, or production secrets are configured.
- The service has no application-level outbound network client.
- Run as the unprivileged `node` user.

This scaffold is not yet an execution sandbox and must not be described as one. Platform-level isolation, private-only reachability, resource limits, authentication, replay protection, and security tests must be verified before any analysis capability is connected.

## Local smoke test

```sh
docker build -t aurum-rea-sandbox infra/rea-sandbox
docker run --rm -p 8080:8080 aurum-rea-sandbox
curl -i http://localhost:8080/health
curl -i -X POST http://localhost:8080/v1/analyze
```

Expected: health returns 200 and `executionEnabled: false`; an unauthenticated analyze request returns 401. An authenticated request without an available replay store fails closed with 503. With replay protection available, it returns `validated_and_discarded` and never executes the payload.
