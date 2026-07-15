# Olleh Chat Panel Widget

Self-contained embeddable chat panel that connects end-users to an Olleh AI text agent via LiveKit. UI matches the Julianna Private chat card (soft-white card, burgundy accents, message timestamps).

## Quick Start

```html
<div id="olleh-chat" style="height:480px;width:100%;"></div>
<script
  src="https://cdn.jsdelivr.net/gh/awaisamir123/chatbot-dashboard/dist/olleh-chat-panel.js"
  data-olleh-client-token="YOUR_CLIENT_TOKEN"
  data-olleh-container-id="olleh-chat"
  data-olleh-title="Julianna"
  data-olleh-primary-color="#6c0034"
  data-olleh-placeholder="Whisper your thoughts..."
  data-olleh-logo-src="https://example.com/your-agent-portrait.jpg"
></script>
```

## Build

```bash
npm run build:chat-panel
```

Output: `dist/olleh-chat-panel.js`

Local test: open `test-chat-panel.html` after building.

## Configuration (`data-*`)

| Attribute | Required | Default | Description |
|-----------|----------|---------|-------------|
| `data-olleh-client-token` | Yes | — | Olleh client JWT |
| `data-olleh-container-id` | Yes | — | Host element id |
| `data-olleh-title` | No | `Julianna` | Header title (also used in message meta) |
| `data-olleh-primary-color` | No | `#6c0034` | Theme primary (send button / accents); send uses a burgundy gradient by default |
| `data-olleh-placeholder` | No | `Whisper your thoughts...` | Input placeholder |
| `data-olleh-logo-src` | No | agent portrait | Header icon / avatar URL (full-bleed in circle) |
| `data-olleh-agent-avatar` | No | woman avatar | Fallback for header when logo unset |
| `data-olleh-user-avatar` | No | boy avatar | Unused in Julianna layout (kept for compatibility) |
| `data-olleh-agent-timeout` | No | `45000` | ms to wait for agent |
| `data-olleh-origin` | No | `location.origin` | Origin sent to session-token |

Messages show `{Title \| You} • 10:24 AM` under each bubble.

## Behavior (API order)

1. **Mount / page reload:** idle empty UI — no session-token or LiveKit until the user sends a message. Reload during chat calls `delete_room` and rotates the session id (chat does not resume).
2. **First Send:** `POST session-token` → `POST register_user_session` → LiveKit `Room.connect`
3. Input unlocks after the agent's welcome message on `lk.transcription`; queued sends flush then
4. **End Chat:** disconnects LiveKit, calls `POST delete_room`, clears messages — stays idle until the next Send (no auto-reconnect)

No FAB / iframe — host page controls size and placement of the container.

## Diagnosing agent-not-joining / no reply

Console should show, in order:

1. `session-token request` (`agent_type: "text"`) → `Session token ready` → `register_user_session ok`
2. `Connected …` → `Agent joined:`
3. `text stream from …` → `agent message via stream:` → `Agent ready (welcome received)`
4. After send: `send lk.chat` → another `agent message via stream`

If you see `Connected` but never `Agent joined:`, A/B the **same client token** with the widget → `/chat` **Start Chat**. Empty `remotes` after connect points at backend agent dispatch.

If LLM OK on the server but never `text stream from` in the browser, check agent `transcription_enabled` in voice-agent (outside this repo). Page refresh fires `delete_room` via `pagehide` to reduce orphan rooms.
