# Olleh Widgets — Embeddable Widget Bundles + Dashboard

`chatbot-dashboard/` is a Next.js 14 app that doubles as (a) a small dashboard (Supabase-backed) and (b) the build workspace for the client-embeddable widget bundles served to agent owners' websites.

## Widget bundles (`dist/`, served as CDN scripts)

Four widget types, configured entirely via `data-olleh-*` attributes on the `<script>` tag:

- `olleh-voice-button.js` — self-contained voice call button (idle → connecting → active/End Call); bundles `livekit-client`; optional audio bars, positioning (`inline` / `fixed-bottom-right`), agent timeout
- `olleh-chat-panel.js` — embedded chat panel widget (bundles livekit-client)
- `olleh-voice-widget.js` / `olleh-chat-widget.js` — iframe-based variants (config: `data-olleh-iframe-src`, `-allow`, `-sandbox`, `-autostart`, branding attrs); default iframe target `https://olleh.ai/chat`
- `chatbot-script.js`, `rag-chatbot-embed.js` — legacy embeds, currently fully commented out in dist
- `olleh-voice.svg` — shared asset

## Sources & build

- `src/olleh-voice-button.js` → `npm run build:voice-button` (`build-voice-button.mjs`, esbuild IIFE/minify, version banner from package.json)
- `src/olleh-chat-panel.js` → `npm run build:chat-panel` (`build-chat-panel.mjs`)
- Rebuild + redeploy `dist/` after editing `src/` — the deployed bundle is what customer sites load
- `test-*.html` files are local harnesses for each widget; `README-voice-button.md` / `README-chat-panel.md` document all `data-olleh-*` attributes

## Widget connection flow (hardcoded endpoints, not overridable)

1. Widget generates a uuid session_id, then `POST https://api.olleh.ai/user/session-token` — exchange `data-olleh-client-token` (+ origin allowlist via `data-olleh-origin`) for a session token. Backend validates the request origin, creates a `sessions` record with the uuid, and returns a JWT embedding `session_id` + the agent record `id`.
2. **Iframe widgets** (`olleh-voice-widget`, `olleh-chat-widget`) open `https://olleh.ai/demo` / `https://olleh.ai/chat` with that token — the hosted pages then run the standard `register_user_session` → LiveKit flow.
3. **Bundled widgets** (`olleh-voice-button`, `olleh-chat-panel`) make an extra fetch-user call to resolve agent config, then `POST https://api.olleh.ai/user/register-user-session` for `lt_token` and connect `livekit-client` `Room` directly to `wss://ollehproduction-l1px06vj.livekit.cloud` — agent joins via dispatch. `olleh-chat-panel` also calls `POST https://api.olleh.ai/user/delete-room` on close (was `pyapi.olleh.ai`; endpoints migrate as part of the session-broker move into the Node backend — see `olleh_web/olleh/SESSION_BROKER_MIGRATION.md`).

In both paths `verifyToken` supplies the agent's full config (owner API keys, tool calls, memories, recording provider, instructions).

`data-olleh-agent-timeout` (default 45s) controls how long the widget waits for the agent; a 120s "vectorization" processing countdown exists in the voice button (comment block in source to disable).

## Dashboard app

`app/` (Next.js pages + `app/api`), `lib/` (`auth.ts`, `storage.ts`, `supabaseClient.ts`, `chatbot-script.ts`). Supabase for persistence. `next dev|build|start`, Tailwind, react-toastify.

## Security notes

- `adminToken` JWT is **hardcoded in `src/olleh-voice-button.js`** and shipped in the public bundle (known weakness — documented in `/datadrive/HIPAA_COMPLIANCE_REPORT.md`). Never add new secrets to `src/`; everything here is public.
- Session-token endpoint enforces an origin allowlist server-side; `data-olleh-origin` only overrides `location.origin` for that check.
