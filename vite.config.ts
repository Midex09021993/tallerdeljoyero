// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Datos públicos (no secretos) del backend de Lovable Cloud de ESTE proyecto.
// El build de producción no siempre recibe las variables VITE_*, y sin ellas la
// web publicada arranca sin conexión y queda en blanco. Por eso se usan como
// respaldo los valores públicos del propio proyecto.
const PROPIO_URL = "https://ynetgjhghfhvyinwvqkl.supabase.co";
const PROPIO_KEY = "sb_publishable_I37emY5b4Sy5q6LpARRaXA_uSk9l9Md";
const PROPIO_ID = "ynetgjhghfhvyinwvqkl";

const publicEnv = {
  VITE_SUPABASE_URL:
    process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"] || PROPIO_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY:
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    PROPIO_KEY,
  VITE_SUPABASE_PROJECT_ID:
    process.env["VITE_SUPABASE_PROJECT_ID"] || process.env["SUPABASE_PROJECT_ID"] || PROPIO_ID,
} as const;

const define = Object.fromEntries(
  Object.entries(publicEnv).map(([key, value]) => [
    `import.meta.env.${key}`,
    JSON.stringify(value),
  ]),
);

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define,
  },
});
