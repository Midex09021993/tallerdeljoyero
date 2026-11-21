<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Interactive viewer

- Keep the interactive WebGL drawing buffer preserved while the viewer uses demand-driven rendering; otherwise the browser can clear the last frame after the render loop becomes idle.

## Agent integrations (MCP)

- MCP server logic lives in `src/lib/mcp/` (one `defineTool` per file, registered in `index.ts`) and uses OAuth tokens from the managed auth issuer with a caller-scoped client so RLS always applies as the signed-in user; never use admin keys there.
- MCP tools stay read-only and exclude costs and internal notes unless the owner explicitly asks otherwise, because operators and other roles share the same connector.
- `/auth` honors a validated same-origin `next` path after login so the OAuth consent route (`src/routes/[.]lovable.oauth.consent.tsx`) can resume.
- AURI interno reutiliza los handlers MCP de `src/lib/mcp/tools/` desde una server fn con `requireSupabaseAuth` (`src/lib/auri/`), pasando el token de sesión verificado para que RLS aplique; la Edge Function `auri-chat` es solo pública y rechaza cualquier campo distinto de `message`/`history`. Why: separa datos privados del chat comercial sin duplicar herramientas.
