# Auditoría solo lectura: cadena de variables públicas del backend

No se modificó, creó ni desplegó nada. Solo lectura.

## 1. Variables presentes en el entorno (sin valores)

Nombres relacionados con SUPABASE visibles en el entorno del sandbox:

```text
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_SUPABASE_PROJECT_ID
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_SUPABASE_URL
LOVABLE_BROWSER_SUPABASE_ACCESS_TOKEN
LOVABLE_BROWSER_SUPABASE_COOKIES_JSON
LOVABLE_BROWSER_SUPABASE_SESSION_JSON
LOVABLE_BROWSER_SUPABASE_STORAGE_KEY
SUPABASE_DB_URL
SUPABASE_PROJECT_ID
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_URL
```

Comprobación puntual (set = definida y no vacía):

| Variable | Estado |
| --- | --- |
| SUPABASE_URL | set |
| SUPABASE_PUBLISHABLE_KEY | set |
| VITE_SUPABASE_URL | set |
| VITE_SUPABASE_PUBLISHABLE_KEY | set |
| VITE_SUPABASE_PROJECT_ID | set |

Alcance observable: esto corresponde al entorno del sandbox de desarrollo/preview. El entorno del proceso de build de producción publicado no es inspeccionable con las herramientas disponibles, por lo que no puede confirmarse que allí estén presentes las mismas variables.

## 2. Mecanismo de inyección VITE_* del wrapper

Archivo: `node_modules/@lovable.dev/vite-tanstack-config/dist/index.js` (versión 2.23.1), dentro de `defineConfig`:

```js
let envDefine = {};
if (options.envDefine !== false) {
  const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");
  for (const [key, value] of Object.entries(loadedEnv))
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
}
let config = {
  define: envDefine,
  ...
};
if (options.vite) config = mergeConfig(config, options.vite);
```

`loadEnv` es la función de Vite (`node_modules/vite/dist/node/chunks/node.js:5673`), que reúne claves con prefijo `VITE_` desde: los archivos `.env` del directorio indicado y, además, desde `process.env`:

```js
for (const [key, value] of Object.entries(parsed))
  if (prefixes.some((prefix) => key.startsWith(prefix))) env[key] = value;
for (const prefix of prefixes) Object.assign(env, getEnvs({ prefix }));
for (const key in process.env)
  if (prefixes.some((prefix) => key.startsWith(prefix))) env[key] = process.env[key];
```

Consecuencia verificable: el wrapper solo inyecta claves con prefijo `VITE_`. Las variables sin prefijo (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`) nunca llegan al bundle por este mecanismo.

Detalle de forma: las claves generadas son literales con punto (`import.meta.env.VITE_SUPABASE_URL`). Vite convierte esas entradas al objeto `import.meta.env` del cliente (`node_modules/vite/dist/node/chunks/node.js:24721` y `:24761`), por lo que el acceso por corchetes también queda resuelto en build de cliente.

## 3. Archivo `.env`

Existe `.env` en la raíz del proyecto (361 bytes, 6 líneas). Claves contenidas, sin valores:

```text
SUPABASE_PROJECT_ID
SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_URL
```

## 4. `dist` / `.output` y contenido del bundle

No se pudo ejecutar esta comprobación. No existe ningún directorio `dist`, `.output` ni `.nitro` en el proyecto: no hay artefacto de build presente en el sandbox para inspeccionar. Por tanto no puede observarse si el bundle contiene literalmente la URL, la clave pública o la expresión `import.meta.env` sin valor. Generar un build sería una acción de cambio de estado y no se realizó, conforme a la instrucción de solo lectura.

Tampoco hay evidencia en los registros disponibles: la búsqueda de `Missing Supabase`, `SUPABASE_URL` y `VITE_SUPABASE` en `/tmp/dev-server-logs/dev-server.log` no devolvió coincidencias.

## 5. `vite.config.ts` frente al mecanismo del wrapper

El `vite.config.ts` actual construye su propio `define`:

- Lee `VITE_SUPABASE_URL` con respaldo a `SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` con respaldo a `SUPABASE_PUBLISHABLE_KEY`, y lo mismo para el identificador de proyecto.
- Filtra valores vacíos y emite claves `import.meta.env.VITE_*`.
- Se entrega al wrapper como `vite: { define }`, que lo aplica mediante `mergeConfig(config, options.vite)`; al ir en segundo lugar, esas claves prevalecen sobre las del wrapper.

Resultado de la comparación: no hay interferencia ni conflicto con el mecanismo del wrapper. Las claves emitidas usan exactamente el mismo formato, y el `define` del proyecto es estrictamente aditivo: cubre el caso en que el entorno solo ofrece los nombres sin prefijo, que el wrapper por sí solo ignoraría. Si las tres variables faltan por completo, `define` queda vacío y no se inyecta nada, igual que con el wrapper solo.

## Qué no pudo observarse

- El entorno de variables del proceso de build de producción publicado.
- El contenido literal del bundle publicado (no hay artefacto de build en el sandbox y no se generó ninguno).
- Por ello no puede afirmarse todavía si el fallo se origina antes del wrapper (variables ausentes en el build), dentro de él o después; la evidencia disponible descarta únicamente un conflicto de configuración local.
