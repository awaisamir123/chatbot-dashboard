import { Room, RoomEvent } from 'livekit-client';

// ─────────────────────────────────────────────────────────────
// Olleh Chat Panel Widget
// Self-contained embeddable chat panel (Julianna Private card design).
// API order:
//   first Send: session-token → register_user_session → LiveKit connect
//   End Chat: disconnect + delete_room (idle until next Send)
//   page reload: delete_room + rotate session (no auto-connect)
// ─────────────────────────────────────────────────────────────

var currentScript =
  document.currentScript ||
  (function () {
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();

var DEFAULT_PORTRAIT =
  'https://olleh.ai/assets/common/woman-avatar.jpg';

var cfg = {
  clientToken: currentScript.dataset.ollehClientToken || '',
  containerId: currentScript.dataset.ollehContainerId || null,
  title: currentScript.dataset.ollehTitle || 'Julianna',
  primaryColor: currentScript.dataset.ollehPrimaryColor || '#6c0034',
  placeholder:
    currentScript.dataset.ollehPlaceholder || 'Whisper your thoughts...',
  logoSrc:
    currentScript.dataset.ollehLogoSrc ||
    currentScript.dataset.ollehAgentAvatar ||
    DEFAULT_PORTRAIT,
  agentAvatar:
    currentScript.dataset.ollehAgentAvatar || DEFAULT_PORTRAIT,
  userAvatar:
    currentScript.dataset.ollehUserAvatar ||
    'https://olleh.ai/assets/common/boy-avatar.png',
  sessionEndpoint: 'https://api.olleh.ai/user/session-token',
  registerEndpoint: 'https://pyapi.olleh.ai/register_user_session',
  deleteRoomEndpoint: 'https://pyapi.olleh.ai/delete_room',
  deleteRoomToken:
    '64Ebc56f62Bb33bd6eeb46b43cC49e44f2e5715A988E50d2f3675CFF3Fb1',
  livekitUrl: 'wss://ollehproduction-l1px06vj.livekit.cloud',
  agentTimeout: parseInt(currentScript.dataset.ollehAgentTimeout || '45000', 10),
  origin:
    currentScript.dataset.ollehOrigin !== undefined
      ? currentScript.dataset.ollehOrigin
      : null,
};

function darkenHex(hex, amount) {
  var h = String(hex || '').replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  if (h.length !== 6) return '#54102E';
  var num = parseInt(h, 16);
  var r = Math.max(0, ((num >> 16) & 255) - amount);
  var g = Math.max(0, ((num >> 8) & 255) - amount);
  var b = Math.max(0, (num & 255) - amount);
  return (
    '#' +
    ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
  );
}

var gradientStart =
  currentScript.dataset.ollehPrimaryColor ? cfg.primaryColor : '#8B1E4B';
var gradientEnd = currentScript.dataset.ollehPrimaryColor
  ? darkenHex(cfg.primaryColor, 40)
  : '#54102E';

var SESSION_STORAGE_KEY = 'olleh_ai_session_id';

if (window.__OLLEH_CHAT_PANEL_ACTIVE__) {
  console.warn('[OllehChatPanel] Already loaded; skipping duplicate init');
} else {
  window.__OLLEH_CHAT_PANEL_ACTIVE__ = true;
  initChatPanel();
}

function initChatPanel() {
  if (!cfg.clientToken) {
    console.error('[OllehChatPanel] Missing data-olleh-client-token');
    return;
  }
  if (!cfg.containerId) {
    console.error('[OllehChatPanel] Missing data-olleh-container-id');
    return;
  }

  var container = document.getElementById(cfg.containerId);
  if (!container) {
    console.error(
      '[OllehChatPanel] Container not found: #' + cfg.containerId
    );
    return;
  }

  // ── State ──────────────────────────────────────────────────
  var sessionToken = null;
  var sessionReady = false;
  var sessionPrefetching = false;
  var sessionPrefetchPromise = null;
  var liveKitToken = null;
  var wsUrl = cfg.livekitUrl;
  var lastUserId = null;
  var hadConnected = false;
  var authInFlight = false;

  var lkRoom = null;
  var connected = false;
  var connecting = false;
  var connectingStarted = false;
  var welcomed = false;
  var agentJoined = false;
  var agentTyping = false;
  var status = 'disconnected'; // disconnected | connecting | connected
  var pendingQueue = [];
  var messages = [];
  var agentTimeoutId = null;
  var agentWaitTimeoutId = null;
  var endingChat = false;
  var AGENT_WAIT_MS = 20000;

  // ── DOM refs ───────────────────────────────────────────────
  var els = {};

  injectStyles();
  buildUI(container);
  bindEvents();
  updateChrome();

  // ── Styles ─────────────────────────────────────────────────
  function injectStyles() {
    if (!document.getElementById('olleh-cp-fonts')) {
      var fontLink = document.createElement('link');
      fontLink.id = 'olleh-cp-fonts';
      fontLink.rel = 'stylesheet';
      fontLink.href =
        'https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700&family=Inter:wght@400;500;600&display=swap';
      document.head.appendChild(fontLink);
    }
    if (document.getElementById('olleh-cp-styles')) return;
    var styleEl = document.createElement('style');
    styleEl.id = 'olleh-cp-styles';
    styleEl.textContent = [
      '.olleh-cp {',
      '  --olleh-cp-primary: ' + cfg.primaryColor + ';',
      '  --olleh-cp-gradient-start: ' + gradientStart + ';',
      '  --olleh-cp-gradient-end: ' + gradientEnd + ';',
      '  --olleh-cp-soft-white: #FAFAFA;',
      '  --olleh-cp-mist: #F1F1F1;',
      '  --olleh-cp-user-bubble: #fbdbde;',
      '  --olleh-cp-user-text: #574144;',
      '  --olleh-cp-on-surface: #1b1c1c;',
      '  --olleh-cp-muted: #564146;',
      '  --olleh-cp-outline: #dcc0c5;',
      '  box-sizing: border-box;',
      '  display: flex;',
      '  flex-direction: column;',
      '  width: 100%;',
      '  height: 100%;',
      '  min-height: 360px;',
      '  font-family: Inter, system-ui, sans-serif;',
      '  background: var(--olleh-cp-soft-white);',
      '  border-radius: 32px;',
      '  box-shadow: 0 20px 40px rgba(84, 16, 46, 0.12);',
      '  border: 1px solid var(--olleh-cp-mist);',
      '  overflow: hidden;',
      '  position: relative;',
      '  color: var(--olleh-cp-on-surface);',
      '}',
      '.olleh-cp *, .olleh-cp *::before, .olleh-cp *::after { box-sizing: border-box; }',
      '.olleh-cp-header {',
      '  flex-shrink: 0;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-between;',
      '  gap: 16px;',
      '  padding: 24px 32px;',
      '  border-bottom: 1px solid var(--olleh-cp-mist);',
      '  background: rgba(250, 250, 250, 0.9);',
      '  backdrop-filter: blur(8px);',
      '  z-index: 2;',
      '}',
      '.olleh-cp-header-left { display: flex; align-items: center; gap: 16px; min-width: 0; }',
      '.olleh-cp-logo-wrap { position: relative; flex-shrink: 0; }',
      '.olleh-cp-logo {',
      '  width: 48px;',
      '  height: 48px;',
      '  border-radius: 9999px;',
      '  overflow: hidden;',
      '  border: 2px solid #ffd9e1;',
      '  background: var(--olleh-cp-mist);',
      '}',
      '.olleh-cp-logo img { width: 100%; height: 100%; object-fit: cover; display: block; }',
      '.olleh-cp-dot {',
      '  position: absolute;',
      '  bottom: 0;',
      '  right: 0;',
      '  width: 14px;',
      '  height: 14px;',
      '  border-radius: 9999px;',
      '  border: 2px solid #fff;',
      '  background: #ef4444;',
      '}',
      '.olleh-cp-dot--online { background: #22c55e; }',
      '.olleh-cp-dot--connecting { background: #facc15; }',
      '.olleh-cp-title {',
      '  margin: 0 !important;',
      '  font-family: Manrope, Inter, sans-serif;',
      '  font-size: 24px !important;',
      '  font-weight: 500;',
      '  line-height: 1.3;',
      '  color: var(--olleh-cp-on-surface);',
      '  white-space: nowrap;',
      '  overflow: hidden;',
      '  text-overflow: ellipsis;',
      '}',
      '.olleh-cp-status {',
      '  margin: 2px 0 0;',
      '  font-family: Inter, sans-serif;',
      '  font-size: 12px;',
      '  font-weight: 600;',
      '  letter-spacing: 0.05em;',
      '  line-height: 1.2;',
      '  color: var(--olleh-cp-muted);',
      '}',
      '.olleh-cp-status.is-online { color: #16a34a; }',
      '.olleh-cp-end {',
      '  flex-shrink: 0;',
      '  border: 1px solid var(--olleh-cp-outline);',
      '  border-radius: 9999px;',
      '  background: transparent;',
      '  color: var(--olleh-cp-muted);',
      '  font-family: Inter, sans-serif;',
      '  font-size: 12px;',
      '  font-weight: 600;',
      '  letter-spacing: 0.05em;',
      '  padding: 8px 16px;',
      '  cursor: pointer;',
      '  transition: background 0.15s ease, opacity 0.15s ease;',
      '}',
      '.olleh-cp-end:hover:not(:disabled) { background: var(--olleh-cp-mist); }',
      '.olleh-cp-end:disabled { opacity: 0.5; cursor: not-allowed; }',
      '.olleh-cp-body {',
      '  position: relative;',
      '  flex: 1;',
      '  min-height: 0;',
      '  display: flex;',
      '  flex-direction: column;',
      '}',
      '.olleh-cp-messages {',
      '  flex: 1;',
      '  overflow-y: auto;',
      '  padding: 32px;',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 24px;',
      '  scrollbar-width: thin;',
      '  scrollbar-color: #e4e2e1 transparent;',
      '}',
      '.olleh-cp-messages::-webkit-scrollbar { width: 4px; }',
      '.olleh-cp-messages::-webkit-scrollbar-thumb { background: #e4e2e1; border-radius: 10px; }',
      '.olleh-cp-row {',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 8px;',
      '  max-width: 85%;',
      '}',
      '.olleh-cp-row--user { align-self: flex-end; }',
      '.olleh-cp-row--agent { align-self: flex-start; }',
      '.olleh-cp-row--system { align-self: center; max-width: 95%; }',
      '.olleh-cp-bubble {',
      '  font-family: Inter, sans-serif;',
      '  font-size: 16px;',
      '  line-height: 1.6;',
      '  padding: 16px;',
      '  border-radius: 16px;',
      '  word-break: break-word;',
      '  white-space: pre-wrap;',
      '}',
      '.olleh-cp-bubble--agent {',
      '  background: #fff;',
      '  color: var(--olleh-cp-on-surface);',
      '  border: 1px solid var(--olleh-cp-mist);',
      '  border-top-left-radius: 0;',
      '  box-shadow: 0 4px 12px -2px rgba(139, 30, 75, 0.05);',
      '}',
      '.olleh-cp-bubble--user {',
      '  background: var(--olleh-cp-user-bubble);',
      '  color: var(--olleh-cp-user-text);',
      '  border-top-right-radius: 0;',
      '  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);',
      '}',
      '.olleh-cp-bubble--system {',
      '  background: #fef3c7;',
      '  color: #92400e;',
      '  font-size: 13px;',
      '  text-align: center;',
      '  border-radius: 12px;',
      '}',
      '.olleh-cp-meta {',
      '  font-family: Inter, sans-serif;',
      '  font-size: 12px;',
      '  font-weight: 600;',
      '  letter-spacing: 0.05em;',
      '  color: var(--olleh-cp-muted);',
      '  padding: 0 4px;',
      '}',
      '.olleh-cp-row--user .olleh-cp-meta { align-self: flex-end; }',
      '.olleh-cp-typing {',
      '  display: inline-flex;',
      '  gap: 6px;',
      '  align-items: center;',
      '}',
      '.olleh-cp-typing span {',
      '  width: 6px;',
      '  height: 6px;',
      '  border-radius: 9999px;',
      '  background: var(--olleh-cp-primary);',
      '  animation: ollehCpPulse 1s ease-in-out infinite;',
      '}',
      '.olleh-cp-typing span:nth-child(2) { animation-delay: 0.15s; opacity: 0.6; }',
      '.olleh-cp-typing span:nth-child(3) { animation-delay: 0.3s; opacity: 0.3; }',
      '@keyframes ollehCpPulse {',
      '  0%, 100% { opacity: 0.35; transform: translateY(0); }',
      '  50% { opacity: 1; transform: translateY(-1px); }',
      '}',
      '.olleh-cp-bubble--typing {',
      '  background: #fff;',
      '  border: 1px solid var(--olleh-cp-mist);',
      '  border-top-left-radius: 0;',
      '  box-shadow: 0 4px 12px -2px rgba(139, 30, 75, 0.05);',
      '  display: inline-flex;',
      '  align-items: center;',
      '  padding: 16px;',
      '}',
      '.olleh-cp-overlay {',
      '  position: absolute;',
      '  inset: 0;',
      '  z-index: 5;',
      '  display: none;',
      '  place-items: center;',
      '  background: rgba(250, 250, 250, 0.7);',
      '  backdrop-filter: blur(2px);',
      '}',
      '.olleh-cp-overlay.is-visible { display: grid; }',
      '.olleh-cp-overlay-inner {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 10px;',
      '  font-size: 14px;',
      '  color: var(--olleh-cp-on-surface);',
      '  font-family: Inter, sans-serif;',
      '}',
      '.olleh-cp-spinner {',
      '  width: 16px;',
      '  height: 16px;',
      '  border: 2px solid rgba(108, 0, 52, 0.2);',
      '  border-top-color: var(--olleh-cp-primary);',
      '  border-radius: 9999px;',
      '  animation: ollehCpSpin 0.6s linear infinite;',
      '}',
      '@keyframes ollehCpSpin { to { transform: rotate(360deg); } }',
      '.olleh-cp-footer {',
      '  flex-shrink: 0;',
      '  border-top: 1px solid var(--olleh-cp-mist);',
      '  padding: 24px;',
      '  background: var(--olleh-cp-soft-white);',
      '}',
      '.olleh-cp-form {',
      '  display: flex !important;',
      '  align-items: center !important;',
      '  gap: 16px !important;',
      '  margin: 0 !important;',
      '}',
      '.olleh-cp-input-wrap { flex: 1 !important; min-width: 0 !important; }',
      '.olleh-cp-input {',
      '  width: 100% !important;',
      '  max-width: 100% !important;',
      '  height: auto !important;',
      '  min-height: 0 !important;',
      '  border: 1px solid var(--olleh-cp-mist) !important;',
      '  outline: none !important;',
      '  border-radius: 24px !important;',
      '  padding: 16px 24px !important;',
      '  margin: 0 !important;',
      '  font-family: Inter, sans-serif !important;',
      '  font-size: 16px !important;',
      '  font-weight: 400 !important;',
      '  line-height: 1.5 !important;',
      '  background: rgba(241, 241, 241, 0.3) !important;',
      '  color: var(--olleh-cp-on-surface) !important;',
      '  box-shadow: none !important;',
      '  transition: border-color 0.15s ease, box-shadow 0.15s ease !important;',
      '  -webkit-appearance: none !important;',
      '  appearance: none !important;',
      '}',
      '.olleh-cp-input:focus {',
      '  border-color: var(--olleh-cp-primary) !important;',
      '  box-shadow: 0 0 0 3px rgba(108, 0, 52, 0.12) !important;',
      '  outline: none !important;',
      '}',
      '.olleh-cp-input::placeholder { color: #897176 !important; opacity: 1 !important; }',
      '.olleh-cp-input:disabled { opacity: 0.6 !important; cursor: not-allowed !important; }',
      '.olleh-cp-send {',
      '  flex-shrink: 0 !important;',
      '  width: 52px !important;',
      '  height: 52px !important;',
      '  min-width: 52px !important;',
      '  min-height: 52px !important;',
      '  border: none !important;',
      '  border-radius: 9999px !important;',
      '  background: linear-gradient(180deg, var(--olleh-cp-gradient-start) 0%, var(--olleh-cp-gradient-end) 100%) !important;',
      '  color: #fff !important;',
      '  display: inline-flex !important;',
      '  align-items: center !important;',
      '  justify-content: center !important;',
      '  cursor: pointer !important;',
      '  padding: 0 !important;',
      '  margin: 0 !important;',
      '  box-shadow: 0 10px 20px rgba(84, 16, 46, 0.25) !important;',
      '  transition: transform 0.1s ease, opacity 0.15s ease !important;',
      '  -webkit-appearance: none !important;',
      '  appearance: none !important;',
      '}',
      '.olleh-cp-send:active:not(:disabled) { transform: scale(0.95) !important; }',
      '.olleh-cp-send:disabled { opacity: 0.5 !important; cursor: not-allowed !important; }',
      '.olleh-cp-send svg { width: 22px !important; height: 22px !important; }',
      '@media (max-width: 560px) {',
      '  .olleh-cp-header { padding: 16px 18px; }',
      '  .olleh-cp-messages { padding: 18px; gap: 16px; }',
      '  .olleh-cp-footer { padding: 16px; }',
      '  .olleh-cp-title { font-size: 20px; }',
      '  .olleh-cp-bubble { font-size: 15px; padding: 12px 14px; }',
      '}',
    ].join('\n');
    document.head.appendChild(styleEl);
  }

  // ── UI ─────────────────────────────────────────────────────
  function buildUI(host) {
    host.innerHTML = '';
    var root = document.createElement('div');
    root.className = 'olleh-cp';
    root.setAttribute('aria-live', 'polite');
    root.style.setProperty('--olleh-cp-primary', cfg.primaryColor);
    root.style.setProperty('--olleh-cp-gradient-start', gradientStart);
    root.style.setProperty('--olleh-cp-gradient-end', gradientEnd);

    root.innerHTML =
      '<div class="olleh-cp-header">' +
      '  <div class="olleh-cp-header-left">' +
      '    <div class="olleh-cp-logo-wrap">' +
      '      <div class="olleh-cp-logo"><img alt="' +
      escapeAttr(cfg.title) +
      '" src="' +
      escapeAttr(cfg.logoSrc) +
      '" /></div>' +
      '      <span class="olleh-cp-dot" data-role="dot"></span>' +
      '    </div>' +
      '    <div>' +
      '      <p class="olleh-cp-title">' +
      escapeHtml(cfg.title) +
      '</p>' +
      '      <p class="olleh-cp-status" data-role="status">Disconnected</p>' +
      '    </div>' +
      '  </div>' +
      '  <button type="button" class="olleh-cp-end" data-role="end" aria-label="End chat">End Chat</button>' +
      '</div>' +
      '<div class="olleh-cp-body">' +
      '  <div class="olleh-cp-overlay" data-role="overlay">' +
      '    <div class="olleh-cp-overlay-inner">' +
      '      <div class="olleh-cp-spinner"></div>' +
      '      <span data-role="overlay-text">Connecting to assistant...</span>' +
      '    </div>' +
      '  </div>' +
      '  <div class="olleh-cp-messages" data-role="messages"></div>' +
      '</div>' +
      '<div class="olleh-cp-footer">' +
      '  <form class="olleh-cp-form" data-role="form">' +
      '    <div class="olleh-cp-input-wrap">' +
      '      <input class="olleh-cp-input" data-role="input" type="text" autocomplete="off" placeholder="' +
      escapeAttr(cfg.placeholder) +
      '" aria-label="Chat message input" />' +
      '    </div>' +
      '    <button type="submit" class="olleh-cp-send" data-role="send" aria-label="Send message">' +
      '      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M13 6l6 6-6 6"/></svg>' +
      '    </button>' +
      '  </form>' +
      '</div>';

    host.appendChild(root);

    els.root = root;
    els.dot = root.querySelector('[data-role="dot"]');
    els.status = root.querySelector('[data-role="status"]');
    els.endBtn = root.querySelector('[data-role="end"]');
    els.overlay = root.querySelector('[data-role="overlay"]');
    els.overlayText = root.querySelector('[data-role="overlay-text"]');
    els.messages = root.querySelector('[data-role="messages"]');
    els.form = root.querySelector('[data-role="form"]');
    els.input = root.querySelector('[data-role="input"]');
    els.sendBtn = root.querySelector('[data-role="send"]');
  }

  function bindEvents() {
    els.form.addEventListener('submit', function (e) {
      e.preventDefault();
      handleSend();
    });
    els.endBtn.addEventListener('click', function () {
      endChat();
    });
    // Avoid orphan LiveKit rooms on refresh / tab close
    window.addEventListener('pagehide', cleanupOnUnload);
    window.addEventListener('beforeunload', cleanupOnUnload);
  }

  // ── Auth ───────────────────────────────────────────────────
  function newSessionId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return (
      'sid_' +
      Date.now().toString(36) +
      '_' +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function getSessionId() {
    try {
      var sid = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!sid) {
        sid = newSessionId();
        sessionStorage.setItem(SESSION_STORAGE_KEY, sid);
      }
      return sid;
    } catch (e) {
      return newSessionId();
    }
  }

  function rotateSessionId() {
    var sid = newSessionId();
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, sid);
    } catch (e) {}
    return sid;
  }

  function resolveOrigin() {
    if (cfg.origin !== null) return cfg.origin;
    try {
      return window.location.origin || '';
    } catch (e) {
      return '';
    }
  }

  function decodeUserIdFromToken(jwt) {
    try {
      var parts = String(jwt || '').split('.');
      if (parts.length < 2) return null;
      var payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (payload.length % 4) payload += '=';
      var json = JSON.parse(atob(payload));
      return (
        (json && json.user && json.user.id) ||
        (json && json.user_id) ||
        null
      );
    } catch (e) {
      return null;
    }
  }

  function isAgentIdentity(identity) {
    return String(identity || '')
      .toLowerCase()
      .indexOf('agent') !== -1;
  }

  /** Accept agent transcription even when SDK omits / odd-identifies the sender. */
  function shouldAcceptTranscription(identity) {
    if (isAgentIdentity(identity)) return true;
    if (!agentJoined) return false;
    if (!identity) return true;
    try {
      var remotes = collectRemoteParticipants(lkRoom);
      if (remotes.length <= 1) return true;
    } catch (e) {}
    return false;
  }

  function extractParticipantIdentity(info) {
    if (!info) return '';
    if (typeof info === 'string') return info;
    return (
      info.identity ||
      (info.participantInfo && info.participantInfo.identity) ||
      (info.participant && info.participant.identity) ||
      ''
    );
  }

  function collectRemoteParticipants(room) {
    var list = [];
    if (!room) return list;
    try {
      var remotes = room.remoteParticipants;
      if (remotes && typeof remotes.values === 'function') {
        list = list.concat(Array.from(remotes.values()));
      } else if (remotes && typeof remotes.forEach === 'function') {
        remotes.forEach(function (p) {
          list.push(p);
        });
      }
    } catch (e) {}
    try {
      // Legacy map on some SDK builds
      var legacy = room.participants;
      if (legacy && typeof legacy.values === 'function') {
        Array.from(legacy.values()).forEach(function (p) {
          if (p && p !== room.localParticipant) list.push(p);
        });
      }
    } catch (e2) {}
    return list;
  }

  function scanExistingAgents(room) {
    if (!room) return false;
    try {
      var list = collectRemoteParticipants(room);
      var identities = list.map(function (p) {
        return p && p.identity;
      });
      console.log('[OllehChatPanel] Remote participants:', identities);
      for (var i = 0; i < list.length; i++) {
        if (isAgentIdentity(list[i] && list[i].identity)) {
          onAgentJoined(list[i].identity);
          return true;
        }
      }
    } catch (e) {
      console.warn('[OllehChatPanel] scanExistingAgents error', e);
    }
    return false;
  }

  /** Agent participant in room — wait for welcome text before flushing queue (ChatPreview). */
  function onAgentJoined(identity) {
    if (agentJoined) return;
    console.log('[OllehChatPanel] Agent joined:', identity || '(unknown)');
    agentJoined = true;
    agentTyping = false;
    updateChrome();
  }

  /** Unlock input and flush queued sends after first agent message (welcome). */
  function handleWelcomed() {
    if (welcomed) return;
    console.log(
      '[OllehChatPanel] Agent ready (welcome received), queue:',
      pendingQueue.length
    );
    welcomed = true;
    connectingStarted = false;
    clearAgentTimeout();
    clearAgentWaitTimeout();
    updateChrome();
    setTimeout(function () {
      flushPending();
    }, 0);
  }

  function fetchSessionToken() {
    var payload = {
      token: cfg.clientToken,
      session_id: getSessionId(),
      origin: resolveOrigin(),
      agent_type: 'chat-panel',
    };

    console.log('[OllehChatPanel] session-token request', {
      origin: payload.origin,
      session_id: payload.session_id,
      agent_type: payload.agent_type,
      has_client_token: !!payload.token,
    });

    function handle(r) {
      if (!r.ok) {
        return r.text().then(function (t) {
          throw new Error('session-token http ' + r.status + ', ' + t);
        });
      }
      return r.json().then(function (j) {
        var t =
          (j && j.data && j.data.token) ||
          (j && j.result && j.result.token) ||
          (j && j.token);
        if (!t) throw new Error('no token in response');
        return String(t);
      });
    }

    return fetch(cfg.sessionEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(handle)
      .catch(function () {
        return fetch(cfg.sessionEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(payload),
        }).then(handle);
      });
  }

  function prefetchSessionToken() {
    if (sessionReady && sessionToken) {
      return Promise.resolve(sessionToken);
    }
    if (sessionPrefetchPromise) return sessionPrefetchPromise;

    sessionPrefetching = true;
    sessionReady = false;
    updateChrome();

    sessionPrefetchPromise = fetchSessionToken()
      .then(function (tkn) {
        sessionToken = tkn;
        lastUserId =
          decodeUserIdFromToken(tkn) || decodeUserIdFromToken(cfg.clientToken);
        sessionReady = true;
        sessionPrefetching = false;
        sessionPrefetchPromise = null;
        console.log('[OllehChatPanel] Session token ready');
        updateChrome();
        return tkn;
      })
      .catch(function (err) {
        sessionPrefetching = false;
        sessionPrefetchPromise = null;
        sessionReady = false;
        sessionToken = null;
        console.error('[OllehChatPanel] Session prefetch failed:', err);
        addMessage(
          'system',
          'Unable to start chat: ' +
            (err && err.message ? err.message : 'session error') +
            '. Check the client token and that this site origin is allowlisted for the agent.'
        );
        updateChrome();
        throw err;
      });

    return sessionPrefetchPromise;
  }

  function registerUserSession(sessToken) {
    var body = {
      token: sessToken,
      end_user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    var endUserId =
      window.ollehUser && window.ollehUser.id != null
        ? String(window.ollehUser.id).trim()
        : '';
    if (endUserId) body.end_user_id = endUserId;

    console.log('[OllehChatPanel] register_user_session request', {
      end_user_id: endUserId || null,
      end_user_timezone: body.end_user_timezone,
    });

    return fetch(cfg.registerEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok) {
            throw new Error(
              'register_user_session http ' +
                r.status +
                ': ' +
                JSON.stringify(j)
            );
          }
          if (j && j.status === false) {
            throw new Error('Authentication failed');
          }
          return j;
        });
      })
      .then(function (data) {
        var result = (data && data.result) || data || {};
        var lkToken = result.lt_token || (data && data.lt_token);
        var url = result.ws_url || (data && data.ws_url) || cfg.livekitUrl;
        console.log('[OllehChatPanel] register_user_session ok', {
          status: data && data.status,
          has_lt_token: !!lkToken,
          ws_url: url || null,
          result_keys: result && typeof result === 'object' ? Object.keys(result) : [],
        });
        if (!lkToken) throw new Error('No LiveKit token in response');
        return { liveKitToken: lkToken, wsUrl: url };
      });
  }

  /** First Send: session-token (if needed) → register → LiveKit. */
  function ensureConnected() {
    if (connected || connecting || authInFlight) return;

    if (!sessionToken || !sessionReady) {
      console.log('[OllehChatPanel] Fetching session token on first send');
      connectingStarted = true;
      updateChrome();
      prefetchSessionToken()
        .then(function () {
          if (sessionReady && sessionToken) ensureConnected();
        })
        .catch(function () {
          connectingStarted = false;
          updateChrome();
        });
      return;
    }

    authInFlight = true;
    connectingStarted = true;
    status = 'connecting';
    updateChrome();

    registerUserSession(sessionToken)
      .then(function (data) {
        liveKitToken = data.liveKitToken;
        wsUrl = data.wsUrl || cfg.livekitUrl;
        authInFlight = false;
        console.log('[OllehChatPanel] Registered — connecting LiveKit (no forced ICE relay)');
        connectToRoom(wsUrl, liveKitToken);
      })
      .catch(function (err) {
        authInFlight = false;
        connecting = false;
        connectingStarted = false;
        status = 'disconnected';
        console.error('[OllehChatPanel] Register failed:', err);
        addMessage(
          'system',
          'Unable to start chat: ' +
            (err && err.message ? err.message : 'register error')
        );
        updateChrome();
      });
  }

  function deleteRoomOnClose(opts) {
    var keepalive = !!(opts && opts.keepalive);
    if (!hadConnected || !lastUserId) {
      console.log('[OllehChatPanel] delete_room skipped (no connection/user yet)');
      return;
    }
    try {
      var payload = {
        user_id: lastUserId || null,
        session_id: getSessionId() || null,
      };
      var body = JSON.stringify(payload);
      fetch(cfg.deleteRoomEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Token': cfg.deleteRoomToken,
        },
        body: body,
        keepalive: keepalive,
      })
        .then(function (res) {
          console.log('[OllehChatPanel] delete_room status', res.status);
        })
        .catch(function (err) {
          console.warn('[OllehChatPanel] delete_room error', err);
        });
    } catch (e) {
      console.warn('[OllehChatPanel] delete_room failed', e);
    }
  }

  /** Tear down LiveKit + delete_room on tab close / refresh (no UI reset / prefetch). */
  function cleanupOnUnload() {
    if (!lkRoom && !hadConnected) return;
    try {
      if (lkRoom) {
        try {
          lkRoom.disconnect();
        } catch (e) {}
        lkRoom = null;
      }
      if (hadConnected) {
        deleteRoomOnClose({ keepalive: true });
        hadConnected = false;
        rotateSessionId();
      }
      connected = false;
      connecting = false;
    } catch (e) {
      console.warn('[OllehChatPanel] cleanupOnUnload failed', e);
    }
  }

  // ── Send / connect ─────────────────────────────────────────
  function handleSend() {
    var text = String(els.input.value || '').trim();
    if (!text) return;

    // Queuing while session loads, registering, or waiting for welcome
    if (
      sessionPrefetching ||
      authInFlight ||
      connecting ||
      (connected && !welcomed)
    ) {
      pendingQueue.push(text);
      els.input.value = '';
      connectingStarted = true;
      updateChrome();
      if (!connected && !connecting && !authInFlight) {
        ensureConnected();
      }
      return;
    }

    els.input.value = '';

    if (!connected || !welcomed) {
      pendingQueue.push(text);
      connectingStarted = true;
      updateChrome();
      ensureConnected();
      return;
    }

    addMessage('user', text);
    agentTyping = true;
    updateChrome();
    sendToAgent(text).catch(function (err) {
      console.error('[OllehChatPanel] send error', err);
      agentTyping = false;
      addMessage(
        'system',
        'Failed to send: ' + (err && err.message ? err.message : 'error')
      );
      updateChrome();
    });
  }

  function connectToRoom(url, token) {
    if (connecting || connected) return;
    connecting = true;
    connectingStarted = true;
    status = 'connecting';
    updateChrome();

    var room = new Room({ adaptiveStream: false, dynacast: false });
    lkRoom = room;

    if (typeof room.registerTextStreamHandler === 'function') {
      room.registerTextStreamHandler('lk.transcription', function (reader, info) {
        var identity = extractParticipantIdentity(info);
        console.log('[OllehChatPanel] text stream from', identity || '(unknown)');
        if (!shouldAcceptTranscription(identity)) {
          console.warn(
            '[OllehChatPanel] ignoring transcription (identity filter)',
            identity || '(empty)'
          );
          return;
        }

        Promise.resolve(reader.readAll())
          .then(function (msg) {
            console.log('[OllehChatPanel] agent message via stream:', msg);
            onAgentMessage(msg);
          })
          .catch(function (e) {
            console.error('[OllehChatPanel] readAll error', e);
            agentTyping = false;
            addMessage('system', 'Agent response error');
            updateChrome();
          });
      });
    }

    room.on(RoomEvent.DataReceived, function (payload, participant, _kind, topic) {
      var identity = participant && participant.identity;
      console.log('[OllehChatPanel] data packet', {
        from: identity,
        topic: topic,
        size: payload && payload.length,
      });
      if (topic === 'lk.transcription' && shouldAcceptTranscription(identity)) {
        try {
          var text = new TextDecoder().decode(payload);
          console.log('[OllehChatPanel] agent message via data:', text);
          onAgentMessage(text);
        } catch (e) {
          console.error('[OllehChatPanel] decode error', e);
        }
      }
    });

    room.on(RoomEvent.Connected, function () {
      var remotes = [];
      try {
        room.remoteParticipants.forEach(function (p) {
          remotes.push(p && p.identity);
        });
      } catch (e) {}
      console.log('[OllehChatPanel] Connected', room.name, {
        remote_count: remotes.length,
        remotes: remotes,
      });
      if (!remotes.length) {
        console.warn(
          '[OllehChatPanel] No remote participants yet — waiting for agent dispatch. ' +
            'If Agent joined never logs, A/B the same client token via widget → /chat Start Chat.'
        );
      }
      connected = true;
      connecting = false;
      hadConnected = true;
      status = 'connected';
      scanExistingAgents(room);
      updateChrome();
    });

    room.on(RoomEvent.Disconnected, function (reason) {
      console.warn('[OllehChatPanel] Disconnected', reason);
      connected = false;
      connecting = false;
      status = 'disconnected';
      agentJoined = false;
      agentTyping = false;
      connectingStarted = false;
      lkRoom = null;
      if (!endingChat) {
        endChat(true);
      }
    });

    room.on(RoomEvent.Reconnecting, function () {
      status = 'connecting';
      updateChrome();
    });

    room.on(RoomEvent.Reconnected, function () {
      status = 'connected';
      scanExistingAgents(room);
      updateChrome();
    });

    room.on(RoomEvent.ParticipantConnected, function (p) {
      console.log('[OllehChatPanel] ParticipantConnected', p && p.identity);
      if (isAgentIdentity(p && p.identity)) {
        onAgentJoined(p.identity);
      }
    });

    room.on(RoomEvent.ParticipantDisconnected, function (p) {
      if (isAgentIdentity(p && p.identity)) {
        agentJoined = false;
        agentTyping = false;
        addMessage('system', 'Agent left the conversation');
        updateChrome();
        setTimeout(function () {
          endChat();
        }, 1500);
      }
    });

    // Match /chat LiveKitChatPlayground: connect(wsUrl, token) only — no forced relay
    room
      .connect(url, token)
      .then(function () {
        scanExistingAgents(room);
        updateChrome();
        startAgentWaitTimers();
      })
      .catch(function (err) {
        console.error('[OllehChatPanel] Connection failed', err);
        connected = false;
        connecting = false;
        status = 'disconnected';
        connectingStarted = false;
        lkRoom = null;
        addMessage(
          'system',
          "Sorry, I'm having trouble connecting right now. Please check your internet or try again in a moment."
        );
        updateChrome();
      });
  }

  function startAgentWaitTimers() {
    clearAgentWaitTimeout();
    clearAgentTimeout();

    // Short wait: surface error, clear overlay so user can End Chat / retry
    agentWaitTimeoutId = setTimeout(function () {
      if (welcomed) return;
      console.warn('[OllehChatPanel] Agent not ready within', AGENT_WAIT_MS, 'ms');
      connectingStarted = false;
      addMessage(
        'system',
        'Still waiting for the assistant. You can End Chat and try again.'
      );
      updateChrome();
    }, AGENT_WAIT_MS);

    // Full timeout: tear down session
    agentTimeoutId = setTimeout(function () {
      if (!welcomed) {
        console.warn('[OllehChatPanel] Agent did not respond within timeout');
        addMessage(
          'system',
          "Sorry, I'm having trouble connecting right now. Please try again in a moment."
        );
        endChat();
      }
    }, cfg.agentTimeout);
  }

  function onAgentMessage(msg) {
    var text = String(msg || '').trim();
    if (!text) {
      console.warn('[OllehChatPanel] empty agent message — clearing typing');
      if (agentTyping) {
        agentTyping = false;
        updateChrome();
      }
      return;
    }
    agentTyping = false;
    if (!agentJoined) onAgentJoined('(via message)');
    if (!welcomed) handleWelcomed();
    addMessage('agent', text);
    updateChrome();
  }

  function flushPending() {
    if (!lkRoom || !welcomed) return;
    var queue = pendingQueue.slice();
    pendingQueue = [];
    var i = 0;

    function next() {
      if (i >= queue.length) return;
      var text = queue[i++];
      addMessage('user', text);
      agentTyping = true;
      updateChrome();
      sendToAgent(text)
        .catch(function (e) {
          console.error('[OllehChatPanel] queued send error', e);
          agentTyping = false;
          updateChrome();
        })
        .then(next);
    }

    next();
  }

  function sendToAgent(text) {
    var room = lkRoom;
    if (!room || !room.localParticipant) {
      return Promise.reject(new Error('Not connected'));
    }

    console.log('[OllehChatPanel] send lk.chat:', text);

    if (typeof room.localParticipant.sendText === 'function') {
      return room.localParticipant
        .sendText(text, { topic: 'lk.chat' })
        .then(function () {
          console.log('[OllehChatPanel] message sent via sendText');
        });
    }

    var data = new TextEncoder().encode(text);
    return room.localParticipant
      .publishData(data, {
        reliable: true,
        topic: 'lk.chat',
      })
      .then(function () {
        console.log('[OllehChatPanel] message sent via publishData');
      });
  }

  // ── End chat ───────────────────────────────────────────────
  function endChat(fromDisconnect) {
    if (endingChat) return;
    endingChat = true;
    clearAgentTimeout();
    clearAgentWaitTimeout();

    var shouldDelete = hadConnected;

    messages = [];
    pendingQueue = [];
    welcomed = false;
    agentJoined = false;
    agentTyping = false;
    connectingStarted = false;
    connecting = false;
    connected = false;
    authInFlight = false;
    status = 'disconnected';
    liveKitToken = null;

    if (!fromDisconnect && lkRoom) {
      try {
        lkRoom.disconnect();
      } catch (e) {}
    }
    lkRoom = null;

    if (shouldDelete) {
      deleteRoomOnClose();
    }
    hadConnected = false;
    rotateSessionId();
    lastUserId = null;
    sessionToken = null;
    sessionReady = false;

    renderMessages();
    updateChrome();
    endingChat = false;
  }

  function clearAgentTimeout() {
    if (agentTimeoutId) {
      clearTimeout(agentTimeoutId);
      agentTimeoutId = null;
    }
  }

  function clearAgentWaitTimeout() {
    if (agentWaitTimeoutId) {
      clearTimeout(agentWaitTimeoutId);
      agentWaitTimeoutId = null;
    }
  }

  // ── Messages / chrome ──────────────────────────────────────
  function formatMessageTime(at) {
    try {
      return new Date(at || Date.now()).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch (e) {
      return '';
    }
  }

  function addMessage(role, content) {
    messages.push({
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      role: role,
      content: content,
      at: Date.now(),
    });
    renderMessages();
    scheduleScroll();
  }

  function renderMessages() {
    var html = '';
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      if (m.role === 'system') {
        html +=
          '<div class="olleh-cp-row olleh-cp-row--system">' +
          '<div class="olleh-cp-bubble olleh-cp-bubble--system">' +
          escapeHtml(m.content) +
          '</div></div>';
        continue;
      }

      var isUser = m.role === 'user';
      var time = formatMessageTime(m.at);
      var who = isUser ? 'You' : cfg.title;
      html +=
        '<div class="olleh-cp-row ' +
        (isUser ? 'olleh-cp-row--user' : 'olleh-cp-row--agent') +
        '">' +
        '<div class="olleh-cp-bubble ' +
        (isUser ? 'olleh-cp-bubble--user' : 'olleh-cp-bubble--agent') +
        '">' +
        escapeHtml(m.content) +
        '</div>' +
        '<span class="olleh-cp-meta">' +
        escapeHtml(who) +
        (time ? ' • ' + escapeHtml(time) : '') +
        '</span>' +
        '</div>';
    }

    var showTyping =
      agentJoined && agentTyping && !(connectingStarted && (!connected || !welcomed));
    if (showTyping) {
      html +=
        '<div class="olleh-cp-row olleh-cp-row--agent">' +
        '<div class="olleh-cp-bubble olleh-cp-bubble--typing">' +
        '<span class="olleh-cp-typing"><span></span><span></span><span></span></span>' +
        '</div></div>';
    }

    els.messages.innerHTML = html;
  }

  function updateChrome() {
    var showOverlay =
      connectingStarted && (!connected || !welcomed || authInFlight);
    els.overlay.classList.toggle('is-visible', showOverlay);
    if (!connected || authInFlight || status === 'connecting') {
      els.overlayText.textContent = 'Connecting to assistant...';
    } else {
      els.overlayText.textContent = 'Waiting for assistant...';
    }

    var label = 'Disconnected';
    var dotClass = 'olleh-cp-dot';
    var statusOnline = false;
    if (!connected) {
      label = 'Disconnected';
      dotClass = 'olleh-cp-dot';
    } else if (welcomed) {
      label = 'Online';
      dotClass = 'olleh-cp-dot olleh-cp-dot--online';
      statusOnline = true;
    } else if (agentJoined) {
      label = 'Connecting...';
      dotClass = 'olleh-cp-dot olleh-cp-dot--connecting';
    } else {
      label = 'Connecting...';
      dotClass = 'olleh-cp-dot olleh-cp-dot--connecting';
    }
    els.status.textContent = label;
    els.status.className =
      'olleh-cp-status' + (statusOnline ? ' is-online' : '');
    els.dot.className = dotClass;

    var endBusy = authInFlight || status === 'connecting';
    els.endBtn.disabled = endBusy;
    els.endBtn.textContent = endBusy ? 'Connecting...' : 'End Chat';

    var inputDisabled =
      authInFlight ||
      status === 'connecting' ||
      (connected && !welcomed);
    els.input.disabled = inputDisabled;
    els.sendBtn.disabled = inputDisabled;

    renderMessages();
  }

  function scheduleScroll() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (els.messages) {
          els.messages.scrollTop = els.messages.scrollHeight;
        }
      });
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/`/g, '&#96;');
  }
}
