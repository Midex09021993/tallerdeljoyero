// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Valores públicos del backend (URL + clave publicable). No son secretos.
// Se usan como respaldo cuando el build de producción no recibe las variables
// VITE_SUPABASE_*, para que la web publicada nunca quede sin conexión.
const SUPABASE_URL_FALLBACK = "https://ynetgjhghfhvyinwvqkl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY_FALLBACK = "sb_publishable_I37emY5b4Sy5q6LpARRaXA_uSk9l9Md";
const SUPABASE_PROJECT_ID_FALLBACK = "ynetgjhghfhvyinwvqkl";

const supabaseUrl = process.env["VITE_SUPABASE_URL"] || SUPABASE_URL_FALLBACK;
const supabaseKey =
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || SUPABASE_PUBLISHABLE_KEY_FALLBACK;
const supabaseProjectId = process.env["VITE_SUPABASE_PROJECT_ID"] || SUPABASE_PROJECT_ID_FALLBACK;

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabaseKey),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(supabaseProjectId),
    },
  },
});
