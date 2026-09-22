// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Lovable Cloud injecta la configuración pública de Supabase en Preview/Production.
// No se debe incluir aquí ningún proyecto Supabase histórico ni credenciales hardcodeadas.
const publicEnv = {
  VITE_SUPABASE_URL: process.env["VITE_SUPABASE_URL"] ?? process.env["SUPABASE_URL"],
  VITE_SUPABASE_PUBLISHABLE_KEY:
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"],
  VITE_SUPABASE_PROJECT_ID:
    process.env["VITE_SUPABASE_PROJECT_ID"] ?? process.env["SUPABASE_PROJECT_ID"],
} as const;

const define = Object.fromEntries(
  Object.entries(publicEnv)
    .filter(([, value]) => typeof value === "string" && value.length > 0)
    .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
);

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
  vite: {
    define,
  },
});
