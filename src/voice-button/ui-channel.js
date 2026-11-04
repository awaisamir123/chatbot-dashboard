// ─────────────────────────────────────────────────────────────
// olleh.ui data-channel receiver for the voice-button widget.
//
// Self-contained module: the main file wires LiveKit room events to the
// exported functions and provides a room + mount-point getter. Everything
// about the "olleh.ui" topic — the wire protocol, request lifecycle, and
// the input-card DOM — lives here.
//
// Wire protocol (keep in sync with olleh_dev ui_tools/channel.py and the
// olleh-frontend useAgentUIChannel.js hook):
//
//   frontend -> agent (on connect AND on each ParticipantConnected):
//     {"v":1, "kind":"ui.capabilities", "presentations":["inline_field"]}
//   agent -> frontend: {"v":1, "kind":"ui.request", "request_id",
//                       "expires_in_ms", "target"?, "view":{...}}
//   frontend -> agent: {"v":1, "kind":"ui.response", "request_id",
//                       "action":"submit", "values":{<key>:<val>}}
//   agent -> frontend: {"v":1, "kind":"ui.dismiss", "request_id", "reason"}
// ─────────────────────────────────────────────────────────────

var UI_TOPIC = 'olleh.ui';
var UI_PROTOCOL_VERSION = 1;
var SUPPORTED_PRESENTATIONS = ['inline_field'];
// Same caps as the /demo receiver — keeps packets under the reliable-
// packet size ceiling even on a giant paste.
var MAX_FIELD_LENGTH = 512;
var MAX_RESPONSE_VALUE_CHARS = 4096;

// Injected by initUiChannel — the module never touches widget state directly.
var getRoom = null;
var getWrap = null;

var activeUiRequest = null; // {request_id, view}
var uiExpireTimer = null;
var uiCardEl = null;

export function initUiChannel(opts) {
  getRoom = opts.getRoom;
  getWrap = opts.getWrap;
}

export function isUiTopic(topic) {
  return topic === UI_TOPIC;
}

// ── Publish ──────────────────────────────────────────────────
function publishUi(payload) {
  var room = getRoom && getRoom();
  if (!room || !room.localParticipant) return;
  try {
    room.localParticipant
      .publishData(new TextEncoder().encode(JSON.stringify(payload)), {
        reliable: true,
        topic: UI_TOPIC,
      })
      .catch(function (e) {
        console.warn('[OllehVoiceButton] ui publish failed:', e);
      });
  } catch (e) {
    console.warn('[OllehVoiceButton] ui publish failed:', e);
  }
}

// The agent dispatches AFTER our Connected event (~1-3s later) and
// reliable packets are not buffered — announce again whenever a remote
// participant connects so the capability packet is never lost. Agent-side
// recording is idempotent (set.add), so re-sending is free.
export function announceUiCapabilities() {
  publishUi({
    v: UI_PROTOCOL_VERSION,
    kind: 'ui.capabilities',
    presentations: SUPPORTED_PRESENTATIONS,
  });
}

// Bounded retries for the opposite ordering: when the agent is ALREADY in
// the room (dispatched before we join — the common case), ParticipantConnected
// never fires for it, and the single Connected-time announce can land before
// the agent finishes registering its data_received handler (~ms after it sees
// us join). A handful of spaced retries covers that window; idempotent, so
// extra sends are free.
var announceRetryTimers = [];

export function startCapabilityAnnounce() {
  stopCapabilityAnnounce();
  announceUiCapabilities();
  [1000, 3000, 6000, 12000].forEach(function (ms) {
    announceRetryTimers.push(setTimeout(announceUiCapabilities, ms));
  });
}

export function stopCapabilityAnnounce() {
  announceRetryTimers.forEach(function (t) { clearTimeout(t); });
  announceRetryTimers = [];
}

// ── Inbound envelopes ────────────────────────────────────────
// Whether two views render the same field(s). A republished ui.request
// identical to the one already open must not re-render — the card DOM is
// rebuilt on each request, so a new request_id would wipe whatever the user
// is mid-way through typing/selecting (e.g. a date picker collapsing
// mid-click). Keep in sync with sameView in olleh-frontend's
// useAgentUIChannel.js.
function sameView(a, b) {
  if (!a || !b || a.presentation !== b.presentation) return false;
  var fa = (a.fields || []).map(function (f) { return f && f.key; });
  var fb = (b.fields || []).map(function (f) { return f && f.key; });
  return (
    fa.length === fb.length &&
    fa.every(function (k, i) { return k === fb[i]; })
  );
}

function isForMe(target) {
  var room = getRoom && getRoom();
  var me =
    room && room.localParticipant && room.localParticipant.identity;
  if (!target) return true;
  if (typeof target.identity === 'string' && target.identity) {
    return target.identity === me;
  }
  if (Array.isArray(target.identities)) {
    return target.identities.indexOf(me) !== -1;
  }
  return false; // unrecognized target shape — default-deny
}

export function handleUiPacket(data) {
  var payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(data));
  } catch (e) {
    return; // malformed — drop quietly
  }
  if (!payload || payload.v !== UI_PROTOCOL_VERSION) return;

  if (payload.kind === 'ui.request') {
    if (!isForMe(payload.target)) return;
    var view = payload.view || {};
    // v1 renders inline_field only — anything else drops silently.
    if (view.presentation !== 'inline_field') return;
    if (!view.fields || !view.fields.length) return;
    // Ignore a republish of the already-open request — re-rendering would
    // wipe in-progress input. Keep the original expiry too: the agent-side
    // pending keeps its own expires_at, so this packet's TTL is not
    // authoritative.
    if (activeUiRequest && sameView(activeUiRequest.view, view)) return;
    // Single-open policy: a newer request replaces the current one.
    activeUiRequest = { request_id: payload.request_id, view: view };
    if (uiExpireTimer) clearTimeout(uiExpireTimer);
    var ttl = Number(payload.expires_in_ms);
    if (isFinite(ttl) && ttl > 0) {
      uiExpireTimer = setTimeout(clearUiRequest, ttl);
    }
    renderUiRequest();
  } else if (payload.kind === 'ui.dismiss') {
    if (
      activeUiRequest &&
      activeUiRequest.request_id === payload.request_id
    ) {
      clearUiRequest();
    }
  }
}

// ── Card lifecycle ───────────────────────────────────────────
export function clearUiRequest() {
  activeUiRequest = null;
  if (uiExpireTimer) {
    clearTimeout(uiExpireTimer);
    uiExpireTimer = null;
  }
  if (uiCardEl && uiCardEl.parentNode) {
    uiCardEl.parentNode.removeChild(uiCardEl);
  }
  uiCardEl = null;
}

var INPUT_TYPE_MAP = {
  email: 'email',
  tel: 'tel',
  number: 'number',
  date: 'date',
  text: 'text',
};

function submitUiRequest(actionId) {
  if (!activeUiRequest || !uiCardEl) return;
  var values = {};
  var inputs = uiCardEl.querySelectorAll('input[data-ui-key]');
  for (var i = 0; i < inputs.length; i++) {
    var v = inputs[i].value;
    if (typeof v === 'string' && v.length > MAX_RESPONSE_VALUE_CHARS) {
      v = v.slice(0, MAX_RESPONSE_VALUE_CHARS);
    }
    values[inputs[i].getAttribute('data-ui-key')] = v;
  }
  publishUi({
    v: UI_PROTOCOL_VERSION,
    kind: 'ui.response',
    request_id: activeUiRequest.request_id,
    action: actionId || 'submit',
    values: values,
  });
  // Close locally — the agent's ui.dismiss ack is idempotent.
  clearUiRequest();
}

// ── Styles (one-time injection, host-page isolated) ──────────
function injectUiStyles() {
  if (document.getElementById('olleh-vb-ui-styles')) return;
  var el = document.createElement('style');
  el.id = 'olleh-vb-ui-styles';
  el.textContent = [
    '.olleh-vb-wrap {',
    '  position: relative !important;',
    '  display: inline-block !important;',
    '}',
    '.olleh-vb-ui {',
    '  position: absolute !important;',
    // Defaults (overridden by JS measurement in positionUiCard): above the
    // button, right edge aligned — safe for a bottom-right fixed button.
    '  bottom: calc(100% + 10px) !important;',
    '  right: 0 !important;',
    '  width: 260px !important;',
    '  background: #fff !important;',
    '  border-radius: 14px !important;',
    '  box-shadow: 0 12px 28px rgba(0,0,0,0.18) !important;',
    '  padding: 8px !important;',
    '  box-sizing: border-box !important;',
    '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
    '  animation: ollehVbUiInAbove 0.25s ease-out !important;',
    '}',
    '.olleh-vb-ui--below { animation-name: ollehVbUiInBelow !important; }',
    '@keyframes ollehVbUiInAbove {',
    '  from { opacity: 0; transform: translateY(12px); }',
    '  to { opacity: 1; transform: translateY(0); }',
    '}',
    '@keyframes ollehVbUiInBelow {',
    '  from { opacity: 0; transform: translateY(-12px); }',
    '  to { opacity: 1; transform: translateY(0); }',
    '}',
    '.olleh-vb-ui-form {',
    '  display: flex !important;',
    '  align-items: center !important;',
    '  gap: 6px !important;',
    '  margin: 0 !important;',
    '}',
    '.olleh-vb-ui-input {',
    '  flex: 1 1 auto !important;',
    '  min-width: 0 !important;',
    '  border: 1px solid #e2e8f0 !important;',
    '  border-radius: 999px !important;',
    '  padding: 8px 12px !important;',
    '  font-size: 13px !important;',
    '  font-family: inherit !important;',
    '  color: #1e293b !important;',
    '  outline: none !important;',
    '  box-sizing: border-box !important;',
    '}',
    '.olleh-vb-ui-input:focus {',
    '  border-color: #0798e4 !important;',
    '  box-shadow: 0 0 0 2px rgba(7,152,228,0.2) !important;',
    '}',
    '.olleh-vb-ui-submit {',
    '  flex: 0 0 auto !important;',
    '  width: 32px !important;',
    '  height: 32px !important;',
    '  border: none !important;',
    '  border-radius: 999px !important;',
    '  background: linear-gradient(135deg, #0578be, #0798e4) !important;',
    '  color: #fff !important;',
    '  display: inline-flex !important;',
    '  align-items: center !important;',
    '  justify-content: center !important;',
    '  cursor: pointer !important;',
    '  padding: 0 !important;',
    '  transition: transform 0.15s ease !important;',
    '}',
    '.olleh-vb-ui-submit:hover { transform: scale(1.06) !important; }',
    '.olleh-vb-ui-ghost {',
    '  flex: 0 0 auto !important;',
    '  border: none !important;',
    '  background: transparent !important;',
    '  color: #64748b !important;',
    '  font-size: 12px !important;',
    '  font-weight: 600 !important;',
    '  font-family: inherit !important;',
    '  padding: 6px 8px !important;',
    '  cursor: pointer !important;',
    '  border-radius: 999px !important;',
    '}',
    '.olleh-vb-ui-ghost:hover { color: #334155 !important; }',
  ].join('\n');
  document.head.appendChild(el);
}

// ── Card render (inline_field only) ──────────────────────────
function renderUiRequest() {
  var wrap = getWrap && getWrap();
  if (!wrap || !activeUiRequest) return;
  injectUiStyles();

  if (uiCardEl && uiCardEl.parentNode) {
    uiCardEl.parentNode.removeChild(uiCardEl);
  }
  uiCardEl = null;

  var view = activeUiRequest.view;
  var field = view.fields[0];
  var actions = view.actions && view.actions.length
    ? view.actions
    : [{ id: 'submit', label: 'Submit', style: 'primary' }];

  var card = document.createElement('div');
  card.className = 'olleh-vb-ui';
  card.setAttribute('role', 'complementary');
  card.setAttribute('aria-label', view.title || 'Agent input');

  var form = document.createElement('form');
  form.className = 'olleh-vb-ui-form';
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    submitUiRequest('submit');
  });

  var input = document.createElement('input');
  input.className = 'olleh-vb-ui-input';
  input.type = INPUT_TYPE_MAP[field.type] || 'text';
  input.setAttribute('data-ui-key', field.key || 'value');
  input.placeholder = field.placeholder || field.label || '';
  input.setAttribute('aria-label', field.label || view.title || 'Value');
  input.maxLength = MAX_FIELD_LENGTH;
  if (field.required !== false) input.required = true;
  form.appendChild(input);

  actions.forEach(function (action) {
    var isSubmit = action.id === 'submit';
    if (isSubmit) {
      var submitBtn = document.createElement('button');
      submitBtn.type = 'submit';
      submitBtn.className = 'olleh-vb-ui-submit';
      submitBtn.setAttribute('aria-label', action.label || 'Submit');
      submitBtn.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" ' +
        'stroke="currentColor" stroke-width="2.5" stroke-linecap="round" ' +
        'stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';
      form.appendChild(submitBtn);
    } else {
      var ghost = document.createElement('button');
      ghost.type = 'button';
      ghost.className = 'olleh-vb-ui-ghost';
      ghost.textContent = action.label || action.id;
      ghost.addEventListener('click', function () {
        submitUiRequest(action.id);
      });
      form.appendChild(ghost);
    }
  });

  card.appendChild(form);
  card.style.visibility = 'hidden';
  wrap.appendChild(card);
  positionUiCard(card, wrap);
  card.style.visibility = '';
  uiCardEl = card;

  try {
    input.focus();
  } catch (e) { /* noop */ }
}

// ── Viewport-aware card placement ────────────────────────────
// The card hangs off .olleh-vb-wrap which only knows its own box — the
// viewport flip/clamp decision must be made here in JS:
//   below the button, horizontally centered  — the default
//   above the button                          — when < ~100px below it
//   horizontally clamped inside [8, vw-8]     — always
// The stylesheet's `!important` rules beat normal inline styles, so every
// override here uses setProperty(..., 'important').
function positionUiCard(card, wrap) {
  var rect = wrap.getBoundingClientRect();
  var cardW = card.offsetWidth;
  var cardH = card.offsetHeight;
  var vw = window.innerWidth;
  var vh = window.innerHeight;
  var gap = 10;
  var margin = 8;

  var spaceBelow = vh - rect.bottom;
  var spaceAbove = rect.top;
  // Below unless <100px under the button or the card can't fit there —
  // and if neither side fits fully (tiny viewport), take the bigger side.
  var placeBelow =
    spaceBelow >= Math.max(100, cardH + gap + margin) ||
    spaceBelow >= spaceAbove;

  if (placeBelow) {
    card.style.setProperty('top', 'calc(100% + ' + gap + 'px)', 'important');
    card.style.setProperty('bottom', 'auto', 'important');
    card.classList.add('olleh-vb-ui--below');
  } else {
    card.style.setProperty('top', 'auto', 'important');
    card.style.setProperty('bottom', 'calc(100% + ' + gap + 'px)', 'important');
  }

  // Center on the button, then clamp into the viewport.
  var left = rect.left + rect.width / 2 - cardW / 2;
  left = Math.max(margin, Math.min(left, vw - cardW - margin));
  card.style.setProperty('left', left - rect.left + 'px', 'important');
  card.style.setProperty('right', 'auto', 'important');
}
