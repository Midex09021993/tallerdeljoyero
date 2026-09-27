// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Public (non-secret) values of THIS project's Lovable Cloud backend.
// Used only when the build environment does not inject them.
const PUBLIC_URL =
  process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"] || "https://ynetgjhghfhvyinwvqkl.supabase.co";
const PUBLIC_KEY =
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
  process.env["SUPABASE_PUBLISHABLE_KEY"] ||
  "sb_publishable_L_4p3qc_tRUdL4P5x73bWA_qzZwU-ZO";
const PUBLIC_ID =
  process.env["VITE_SUPABASE_PROJECT_ID"] || process.env["SUPABASE_PROJECT_ID"] || "ynetgjhghfhvyinwvqkl";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
  vite: {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(PUBLIC_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(PUBLIC_KEY),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(PUBLIC_ID),
    },
  },
});
