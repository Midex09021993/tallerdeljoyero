# AURI interno con datos reales (plan, sin cambios aún)

## Respuesta clave: ¿la app puede usar su propio MCP con la sesión actual?
- **No a través del endpoint `/mcp`.** El servidor MCP exige token OAuth con `client_id` (`requireOAuthClientClaim`), así que la sesión normal de la app es rechazada a propósito. Saltarse esa regla debilitaría el control; no se hará.
- **Sí reutilizando las mismas herramientas dentro del servidor de la app.** Cada herramienta es un `defineTool` cuyo `handler(args, ctx)` solo usa `ctx.isAuthenticated()` y `ctx.getToken()` para crear `supabaseForUser`. Una función de servidor protegida (`requireSupabaseAuth`, que valida la sesión con el backend) puede llamar esos handlers con un contexto mínimo que entrega el token ya verificado del usuario. RLS aplica igual que en MCP. No es protocolo MCP; es reutilización directa de las cinco herramientas, sin duplicarlas.
- **Alternativa rechazada:** que la app actúe como cliente MCP OAuth contra sí misma (registro DCR, consentimiento, guardar refresh tokens). Más complejo, más secretos que custodiar, sin beneficio de seguridad para un usuario ya dentro de la app. Queda disponible para asistentes externos (Claude, ChatGPT) tal como está.
- **Riesgo a confirmar en la implementación:** que el tipo `ToolContext` acepte un adaptador. Si exige una clase no construible, se extrae la lógica de cada handler a una función compartida `(supabase, args)` que usan tanto la herramienta MCP como AURI interno (sigue siendo una sola implementación).

## Separación de modos
```text
Público (sin cambios)            Privado (nuevo)
ContactoComercial "Hablemos"     AppShell (zona autenticada)
AuriChat modo="publico"          AuriChat modo="interno"
Edge Function auri-chat          createServerFn auri-interno (TanStack)
sin JWT, sin datos               requireSupabaseAuth + RLS del usuario
```
- `auri-chat` queda **solo público**: se endurece para ignorar/rechazar cualquier campo distinto de mensajes de texto (`context`, `tools`, `datos`), y su prompt sigue siendo informativo. Nunca recibe datos privados.
- El modo interno no usa Edge Functions: función de servidor de la app (patrón del proyecto).

## Flujo AURI interno
1. Usuario con sesión abre AURI desde AppShell. Primera vez: aviso de autorización ("AURI consultará pedidos, contratos y clientes que tú ya puedes ver; solo lectura; sin costes ni notas internas"). Aceptar guarda la preferencia localmente; se puede revocar desde el mismo panel.
2. Cliente envía pregunta → `auriInterno` (server fn con `requireSupabaseAuth`).
3. Servidor llama a Gemini (Lovable AI) con **tool calling**: se le declaran las 5 herramientas (nombre, descripción, esquema derivados de los `defineTool`). Gemini elige herramienta y argumentos.
4. Servidor ejecuta el handler con el token del usuario (RLS). Máximo 3 llamadas por pregunta y límites ya presentes (≤100 filas; se recorta a 25 para el modelo).
5. **Contexto mínimo a Gemini:** solo el texto resumido que devuelve la herramienta (referencia, cliente, estado, área, fechas), nunca importes, costes, notas internas, teléfonos ni correos; se aplica una lista blanca de campos antes de enviar. Se justifica porque sin esos datos no se puede redactar la respuesta. Alternativa más estricta opcional: respuestas de plantilla sin enviar datos a Gemini (ver pregunta abierta).
6. Respuesta con texto + tarjetas (pedidos/estado) renderizadas desde `structuredContent`, no desde lo que diga el modelo, para evitar datos inventados.

## Permisos, expiración, revocación y fallback
- Permisos: los decide RLS del usuario (Operario ve solo sus áreas, etc.). AURI no añade ni amplía nada.
- Expiración: la sesión de la app caduca/renueva como hoy; si el token falla → mensaje "Tu sesión expiró, vuelve a iniciar sesión".
- Revocación: botón "Desactivar acceso a datos" en AURI interno; cerrar sesión lo revoca de inmediato. El acceso MCP externo se sigue revocando por OAuth.
- Fallback: si Gemini o una herramienta falla, AURI responde con el error legible y enlaces directos a Pedidos/Producción/Contratos; nunca cae al modo público con datos.
- Límite de uso por usuario (p. ej. 30 preguntas/10 min) en servidor.

## Diseño
- Reutilizar `AuriChat.tsx` con prop `modo`; estilo blanco/dorado/azul de la captura, tokens del sistema de diseño, panel lateral en escritorio y hoja inferior en móvil.
- Sin nuevo service worker ni cambios en manifest/PWA. Sin tocar Aurum Render.

## Cambios por archivo
- `src/lib/mcp/tools/*.ts`: sin cambios funcionales (solo exportar handler/lógica si el adaptador no tipa).
- `src/lib/auri/tool-registry.ts` (nuevo): importa las 5 herramientas, expone esquemas para Gemini y `ejecutarHerramienta(nombre, args, token)`; lista blanca de campos.
- `src/lib/auri/auri-interno.functions.ts` (nuevo): `createServerFn` + `requireSupabaseAuth`, bucle de tool calling con Lovable AI (Gemini), límites.
- `src/components/auri/AuriChat.tsx`: modo público/interno, aviso de autorización, tarjetas, estados de error.
- `src/components/AppShell` (archivo de layout autenticado): botón AURI.
- `src/components/ContactoComercial.tsx`: fija `modo="publico"`.
- `supabase/functions/auri-chat/index.ts`: rechazar campos extra; sin cambios de prompt.
- `AGENTS.md`: regla "AURI interno reutiliza handlers MCP vía server fn autenticada; auri-chat es solo público".

## Pruebas
- Unitarias (bun test): la lista blanca elimina costes/notas; `auri-chat` rechaza `context`; el registro contiene exactamente las 5 herramientas, todas de solo lectura; sin token → error.
- Typecheck (`tsgo -b --noEmit`), lint, build, `deno check` de `auri-chat`, workflow CI existente.
- Navegador: usuario de prueba con sesión pregunta "¿qué pedidos están en producción?" y ve solo sus pedidos; sin sesión, el modal "Hablemos" sigue informativo.
- Re-extraer manifiesto MCP para confirmar que no cambió.

## Riesgos
- Gemini puede pedir herramientas con argumentos inválidos → validación Zod existente.
- Enviar nombres de clientes a Gemini es transferencia de datos personales a un tercero; mitigado con mínimos campos (decisión del Dueño).
- Inyección de instrucciones vía textos de pedidos → el modelo no tiene herramientas de escritura, impacto limitado a la respuesta.
