# AURUM REA SANDBOX

Private static-analysis service for AURUM INTELLIGENCE. The runner uses REA for managed .NET inspection and REA + Ghidra for native PE analysis.

## Analysis boundary

- The target binary is never launched or executed.
- Managed analysis reads PE/CLI metadata and CIL using REA's managed workflows; it does not require a native decompiler.
- Native analysis uses REA's Ghidra provider (Ghidra 12.2 + full JDK 25).
- The image installs the Ghidra release archive only after validating its published SHA-256 checksum, then runs `rea doctor --provider ghidra --json` during the image build.
- `POST /v1/analyze-pe` accepts one Base64-encoded `.exe` or `.dll` (maximum 32 MiB), a `mode` of `managed` or `native`, a short-lived owner JWT, and a Redis-backed single-use token.
- The file is written to a unique mode-0600 temporary directory, passed to REA with fixed argument arrays (no shell), and deleted after analysis. No binary or report is persisted by this service.
- Analysis has an eight-minute process timeout and a 12 MiB stdout cap. REA stderr is bounded and never returned to the caller.
- `GET /health` reports static analysis availability separately from target execution; target execution remains disabled.
- `POST /v1/inspect-pe` remains as the lightweight PE metadata parser. `POST /v1/analyze` remains a legacy validation-only placeholder.

## API request

Authenticated JSON request to `/v1/analyze-pe`:

```json
{
  "fileName": "AtomHwIdGeneratorV7.exe",
  "mode": "managed",
  "contentBase64": "<base64 bytes>"
}
```

Use `mode: "native"` for a native PE that needs Ghidra. The managed workflow returns an artifact identity and member/CIL inventory. The native workflow returns REA's static Ghidra analysis evidence. A protected or packed installer may still expose only its loader/stub; static decompilation does not guarantee recovery of original source or unpacking.

## Local build and readiness

```sh
docker build -t aurum-rea-sandbox infra/rea-sandbox
docker run --rm -p 8080:8080 aurum-rea-sandbox
curl -i http://localhost:8080/health
```

The Docker build fails closed if the pinned Ghidra checksum, native decompiler, REA CLI, or Ghidra provider readiness check fails. Runtime requests require the configured JWT secret and Redis replay store; authentication/replay failures fail closed.

## Security notes

- The runner is not a dynamic malware-analysis VM and must not be described as one.
- No shell is used for analysis invocation; arguments are fixed by server code.
- No user-supplied command, script, plugin, or executable is run.
- Uploaded binaries and temporary reports are not committed to GitHub, Supabase, or persistent storage.
- The service runs as the unprivileged `node` user.
- Network isolation, memory/CPU limits, and private Railway ingress still need independent verification at the platform level.
