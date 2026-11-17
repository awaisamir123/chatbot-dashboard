Here's the API call flow for each of the four widgets (post-change state — agent-session JWT auth, BFF proxying on iframe pages).

## 1. `olleh-voice-button.js` — bundled, calls backend **directly**

```
Customer page          api.olleh.ai              LiveKit Cloud
     │                      │                         │
     │─① POST /user/session-token────────────────────►│  public · origin-checked
     │   {clientToken, session_id, origin}            │
     │◄── agentSessionToken (JWT)─────────────────────│
     │                      │                         │
     │─② GET /user/:id ────►│ Bearer: agentSessionJWT │
     │   (vectorization     │ AgentSessionAuthMw      │
     │    check)            │ + ownership bind        │
     │                      │                         │
     │   if !is_processed:  │                         │
     │─③ GET /user/vector-data►│ Bearer: clientToken  │ public
     │   → poll ② until ready                         │
     │                      │                         │
     │─④ POST /user/register-user-session────────────►│ Bearer: agentSessionJWT
     │   {token: agentSessionJWT, ...}                │ body.token = same JWT
     │◄── lt_token + ws_url─│                         │
     │                      │                         │
     │══════════════ WebSocket (livekit-client) ═════►│══ agent joins via dispatch
     │
     └─ ✗ no delete-room call in this widget
```

## 2. `olleh-chat-panel.js` — bundled, same direct pattern + cleanup

```
Customer page          api.olleh.ai              LiveKit Cloud
     │                      │                         │
     │─① POST /user/session-token────────────────────►│  public
     │◄── agentSessionToken (JWT)─────────────────────│
     │                      │                         │
     │─② POST /user/register-user-session────────────►│ Bearer: agentSessionJWT
     │   (on first Send)    │                         │
     │◄── lt_token ─────────│                         │
     │                      │                         │
     │══════════ WebSocket ══════════════════════════►│══ agent joins
     │                      │                         │
     │─③ POST /user/delete-room (on close/unload) ───►│ Bearer: agentSessionJWT
     │   {user_id, session_id, token: JWT}            │ ownership check → 403 if foreign
```

## 3. `olleh-voice-widget.js` — iframe → `olleh.ai/demo`

```
Customer page          api.olleh.ai         olleh.ai (BFF)      LiveKit
     │                      │                    │                │
     │─① POST /user/session-token───────────────►│                │  public
     │◄── agentSessionToken (JWT)────────────────│                │
     │                      │                    │                │
     │   iframe.src = olleh.ai/demo?token=JWT    │                │
     │══════════ iframe loads ══════════════════►│                │
     │                      │                    │                │
     │              ┌───────┴────────┐           │                │
     │              │ ② GET /api/olleh/user/:id  │                │
     │              │    (BFF→api/user/:id)      │                │
     │              │    Bearer: session JWT →   │                │
     │              │    ownership-bound         │                │
     │              │                            │                │
     │              │ ③ GET /user/vector-data    │                │
     │              │    (direct, public, if     │                │
     │              │     !is_processed)         │                │
     │              │                            │                │
     │              │ ④ POST /api/olleh/register-│                │
     │              │    user-session            │                │
     │              │    body.token=JWT → BFF    │                │
     │              │    forwards JWT AS bearer  │                │
     │              │                            │                │
     │              │ ⑤ POST /api/olleh/delete-  │                │
     │              │    room (on close via      │                │
     │              │    postMessage)            │                │
     │              └───────┬────────┘           │                │
     │                      │ lt_token           │                │
     │                      │═══════════════════►│══ WebSocket ══►│══ agent
```

## 4. `olleh-chat-widget.js` — iframe → `olleh.ai/chat`

```
Customer page          api.olleh.ai         olleh.ai (BFF)      LiveKit
     │                      │                    │                │
     │─① POST /user/session-token───────────────►│                │  public
     │◄── agentSessionToken (JWT)────────────────│                │
     │                      │                    │                │
     │   iframe.src = olleh.ai/chat?token=JWT    │                │
     │══════════ iframe loads ══════════════════►│                │
     │                      │                    │                │
     │              ┌───────┴────────┐           │                │
     │              │ ② POST /user/session-token │                │
     │              │    (useChatConnection      │                │
     │              │     re-exchanges URL       │                │
     │              │     token → new session    │                │
     │              │     JWT; direct, public)   │                │
     │              │                            │                │
     │              │ ③ POST /api/olleh/register-│                │
     │              │    user-session (prefetch) │                │
     │              │    agentSessionToken in    │                │
     │              │    body → BFF bearer       │                │
     │              │                            │                │
     │              │ ④ GET /api/olleh/user/:id  │                │
     │              │    + /user/vector-data     │                │
     │              │    (processing poll)       │                │
     │              │                            │                │
     │              │ ⑤ delete-room → postMessage│                │
     │              │    olleh-delete-room to    │                │
     │              │    parent widget           │                │
     │              └───────┬────────┘           │                │
     │                      │ lt_token           │                │
     │                      │═══════════════════►│══ WebSocket ══►│══ agent
```

## Key differences at a glance

| | Voice-button | Chat-panel | Voice-widget | Chat-widget |
|---|---|---|---|---|
| Bundle → backend | **Direct** api.olleh.ai | **Direct** | session-token only | session-token only |
| Auth on API calls | agentSessionJWT bearer | agentSessionJWT bearer | via **BFF** (JWT forwarded as bearer) | via **BFF** |
| Extra user fetch | `GET /user/:id` direct | — | `/api/olleh/user/:id` | `/api/olleh/user/:id` |
| delete-room | ✗ none | direct | via BFF (postMessage) | postMessage → parent |
| LiveKit | bundled `livekit-client` | bundled `livekit-client` | iframe page | iframe page |

**Auth legend:** `agentSessionJWT` = per-session JWT from `/user/session-token` · BFF attaches `AUTH_TOKEN` server-side only when no session JWT is present · `public` = no auth (rate-limited/origin-checked).