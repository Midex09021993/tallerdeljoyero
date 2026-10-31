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

## AURUM Render freeze

- AURUM Render is frozen: never create, edit, move or delete `src/components/AurumRender.tsx`, `src/components/AurumRenderConfig.tsx`, `src/lib/aurum-material-engine.ts`, anything under `src/lib/aurum/`, `aurum-engine.lock.json`, `scripts/check-aurum-lock.mjs` or the `aurum-lock` job in `.github/workflows/quality.yml` unless the user's message contains the exact phrase `DESCONGELAR AURUM RENDER`. Why: the stable engine was restored after regressions and must stay byte-identical.
- After an authorized change, regenerate the manifest with `node scripts/check-aurum-lock.mjs --generate` and run `npm run check:aurum`; `npm run check:aurum` must pass before finishing any task.

## Interactive viewer

- Keep the interactive WebGL drawing buffer preserved while the viewer uses demand-driven rendering; otherwise the browser can clear the last frame after the render loop becomes idle.
