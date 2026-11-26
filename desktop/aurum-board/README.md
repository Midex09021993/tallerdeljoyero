# AURUM BOARD Desktop (Windows)

A lightweight Tauri 2 desktop wrapper that opens the authenticated AURUM LAB board at
`https://www.tallerdeljoyero.com/pizarra?desktop=1`.

## Window modes

- **Floating:** always-on-top.
- **Desktop:** always-on-bottom, so ordinary application windows cover it.

The board's web interface remains hosted and authenticated by AURUM LAB. This first desktop
version therefore requires internet access and an active AURUM LAB session; offline note
storage is not included yet.

## Build locally

Prerequisites: Windows 10/11, Rust stable, Microsoft C++ Build Tools, WebView2 Runtime,
and Node.js.

From this directory:

```powershell
cd src-tauri
cargo install tauri-cli --version "^2"
cargo tauri build
```

The NSIS installer is produced under `src-tauri/target/release/bundle/nsis`.

The GitHub workflow `Build AURUM BOARD Desktop` can build the Windows installer and upload
it as an Actions artifact. It does not publish a release or deploy the web application.
