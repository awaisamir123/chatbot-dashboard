import { Room, RoomEvent } from 'livekit-client';

// ─────────────────────────────────────────────────────────────
// Olleh Voice Button Widget
// A self-contained embeddable button that connects end-users
// to a LiveKit-powered voice agent with a single click.
// ─────────────────────────────────────────────────────────────

// Capture script reference immediately (must run synchronously during parse)
var currentScript =
  document.currentScript ||
  (function () {
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();

// ── Configuration from data-* attributes ─────────────────────
var cfg = {
  // Required
  clientToken: currentScript.dataset.ollehClientToken || '',
  adminToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im9sbGVoX2FkbWluQG9sbGVoLmFpIiwiaWF0IjoxNzIxMzE1MzYzLCJleHAiOjE3MjE0MDE3NjN9.DwG01WyidZz2-gApVmg3-pxi-nAGunvr_CRRQLWF04476yhbg56',

  // API endpoints (hardcoded, not overridable)
  sessionEndpoint: 'https://api.olleh.ai/user/session-token',
  registerEndpoint: 'https://pyapi.olleh.ai/register_user_session',
  livekitUrl: 'wss://ollehproduction-l1px06vj.livekit.cloud',

  // Placement
  containerId: currentScript.dataset.ollehContainerId || null,
  position: currentScript.dataset.ollehPosition || 'inline', // "inline" | "fixed-bottom-right"

  // Button text for each state
  idleText:
    currentScript.dataset.ollehIdleText !== undefined
      ? currentScript.dataset.ollehIdleText
      : 'Talk to AI',
  loadingText:
    currentScript.dataset.ollehLoadingText !== undefined
      ? currentScript.dataset.ollehLoadingText
      : 'Connecting...',
  activeText:
    currentScript.dataset.ollehActiveText !== undefined
      ? currentScript.dataset.ollehActiveText
      : 'End Call',

  // Styling overrides
  buttonStyle: currentScript.dataset.ollehButtonStyle || '',
  buttonClass: currentScript.dataset.ollehButtonClass || '',

  // Behaviour
  agentTimeout: parseInt(currentScript.dataset.ollehAgentTimeout || '45000', 10),
};

// ── Internal state ───────────────────────────────────────────
var state = 'idle'; // "idle" | "processing" | "loading" | "connected"
var lkRoom = null;
var agentJoined = false;
var agentTimeoutId = null;
var sessionToken = null;

// ── VECTORIZATION TIMER ─────────────────────────────────────
// Comment out this entire block to disable the countdown timer UI.
var processingTimerSecs = 120;
var processingIntervalId = null;

function startProcessingTimer() {
  processingTimerSecs = 120;
  if (processingIntervalId) clearInterval(processingIntervalId);
  processingIntervalId = setInterval(function () {
    processingTimerSecs = Math.max(0, processingTimerSecs - 1);
    if (state === 'processing') updateUI();
  }, 1000);
}

function stopProcessingTimer() {
  if (processingIntervalId) {
    clearInterval(processingIntervalId);
    processingIntervalId = null;
  }
}

function formatProcessingTime(secs) {
  var m = Math.floor(secs / 60);
  var s = secs % 60;
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}
// ── END VECTORIZATION TIMER ──────────────────────────────────

// ── Inject styles (once, guarded by id) ──────────────────────
if (!document.getElementById('olleh-vb-styles')) {
  var styleEl = document.createElement('style');
  styleEl.id = 'olleh-vb-styles';
  styleEl.textContent = [
    /* ── Base button ── */
    '.olleh-vb {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  gap: 8px;',
    '  padding: 12px 24px;',
    '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
    '  font-size: 15px;',
    '  font-weight: 600;',
    '  border: none;',
    '  border-radius: 12px;',
    '  cursor: pointer;',
    '  transition: all 0.2s ease;',
    '  position: relative;',
    '  overflow: visible;',
    '  line-height: 1.4;',
    '  text-decoration: none;',
    '  outline: none;',
    '  -webkit-tap-highlight-color: transparent;',
    '}',

    /* ── Idle state ── */
    '.olleh-vb--idle {',
    '  background: linear-gradient(135deg, #0578be, #0798e4);',
    '  color: #fff;',
    '  box-shadow: 0 4px 14px rgba(7, 152, 228, 0.4);',
    '}',
    '.olleh-vb--idle:hover {',
    '  box-shadow: 0 6px 20px rgba(7, 152, 228, 0.5);',
    '  transform: translateY(-1px);',
    '}',
    '.olleh-vb--idle::after {',
    '  content: "";',
    '  position: absolute;',
    '  inset: -4px;',
    '  border-radius: 14px;',
    '  pointer-events: none;',
    '  box-shadow: 0 0 0 0 rgba(7, 152, 228, 0.5);',
    '  animation: ollehVbBeat 2s ease-out infinite;',
    '}',
    '@keyframes ollehVbBeat {',
    '  0%  { box-shadow: 0 0 0 0   rgba(7, 152, 228, 0.5); }',
    '  70% { box-shadow: 0 0 0 12px rgba(7, 152, 228, 0);   }',
    '  100%{ box-shadow: 0 0 0 0   rgba(7, 152, 228, 0);   }',
    '}',

    /* ── Loading state ── */
    '.olleh-vb--loading {',
    '  background: linear-gradient(135deg, #64748b, #94a3b8);',
    '  color: #fff;',
    '  cursor: wait;',
    '  box-shadow: 0 4px 14px rgba(100, 116, 139, 0.4);',
    '}',
    '.olleh-vb-spinner {',
    '  display: inline-block;',
    '  width: 16px;',
    '  height: 16px;',
    '  border: 2px solid rgba(255,255,255,0.3);',
    '  border-top-color: #fff;',
    '  border-radius: 50%;',
    '  animation: ollehVbSpin 0.6s linear infinite;',
    '}',
    '@keyframes ollehVbSpin {',
    '  to { transform: rotate(360deg); }',
    '}',

    /* ── Connected / active state ── */
    '.olleh-vb--active {',
    '  background: linear-gradient(135deg, #dc2626, #ef4444);',
    '  color: #fff;',
    '  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);',
    '}',
    '.olleh-vb--active:hover {',
    '  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);',
    '  transform: translateY(-1px);',
    '}',
    '.olleh-vb--active::after {',
    '  content: "";',
    '  position: absolute;',
    '  inset: -4px;',
    '  border-radius: 14px;',
    '  pointer-events: none;',
    '  box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5);',
    '  animation: ollehVbBeatRed 1.6s ease-out infinite;',
    '}',
    '@keyframes ollehVbBeatRed {',
    '  0%  { box-shadow: 0 0 0 0   rgba(239, 68, 68, 0.5); }',
    '  70% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0);   }',
    '  100%{ box-shadow: 0 0 0 0   rgba(239, 68, 68, 0);   }',
    '}',

    /* ── Icon sizing ── */
    '.olleh-vb-icon {',
    '  width: 18px;',
    '  height: 18px;',
    '  flex-shrink: 0;',
    '}',
  ].join('\n');
  document.head.appendChild(styleEl);
}

// ── Inline SVG icons ─────────────────────────────────────────
var micIconSvg =
  '<svg class="olleh-vb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="9" y="1" width="6" height="11" rx="3"/>' +
  '<path d="M19 10v2a7 7 0 01-14 0v-2"/>' +
  '<line x1="12" y1="19" x2="12" y2="23"/>' +
  '<line x1="8" y1="23" x2="16" y2="23"/></svg>';

var phoneOffSvg =
  '<svg class="olleh-vb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 ' +
  '12.84 12.84 0 004.33.72 2 2 0 012 2v3a2 2 0 01-2.18 2 19.79 19.79 0 ' +
  '01-8.63-3.07 19.42 19.42 0 01-6-6A19.79 19.79 0 013.12 4.18 2 2 0 ' +
  '015.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 ' +
  '2.11L8.09 9.91"/>' +
  '<line x1="23" y1="1" x2="1" y2="23"/></svg>';

// ── Create button element ────────────────────────────────────
var btn = document.createElement('button');
btn.type = 'button';

// Apply user-supplied inline styles (persists across updateUI calls)
if (cfg.buttonStyle) btn.style.cssText += ';' + cfg.buttonStyle;

// ── UI update (called on every state change) ─────────────────
function updateUI() {
  var cls = 'olleh-vb';
  if (cfg.buttonClass) cls += ' ' + cfg.buttonClass;

  if (state === 'idle') {
    cls += ' olleh-vb--idle';
    // btn.innerHTML = micIconSvg + '<span>' + escHtml(cfg.idleText) + '</span>';
    btn.innerHTML = '<span>' + escHtml(cfg.idleText) + '</span>';
    btn.disabled = false;
    btn.setAttribute('aria-label', cfg.idleText);
  } else if (state === 'loading') {
    cls += ' olleh-vb--loading';
    btn.innerHTML =
      '<span class="olleh-vb-spinner"></span><span>' +
      escHtml(cfg.loadingText) +
      '</span>';
    btn.disabled = true;
    btn.setAttribute('aria-label', cfg.loadingText);
  } else if (state === 'processing') {
    cls += ' olleh-vb--loading';
    btn.disabled = true;
    btn.setAttribute('aria-label', 'Processing Docs...');
    // ── VECTORIZATION TIMER UI ── comment out the innerHTML line below to show plain text instead
    btn.innerHTML = '<span class="olleh-vb-spinner"></span><span>Processing Docs\u2026 ' + formatProcessingTime(processingTimerSecs) + '</span>';
    // ── END VECTORIZATION TIMER UI ──
  } else if (state === 'connected') {
    cls += ' olleh-vb--active';
    // btn.innerHTML = phoneOffSvg + '<span>' + escHtml(cfg.activeText) + '</span>';
    btn.innerHTML = '<span>' + escHtml(cfg.activeText) + '</span>';
    btn.disabled = false;
    btn.setAttribute('aria-label', cfg.activeText);
  }

  btn.className = cls;
}

function escHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// Initial render
updateUI();

// ── Mount button into the DOM ────────────────────────────────
function mountButton() {
  if (cfg.containerId) {
    var container = document.getElementById(cfg.containerId);
    if (container) {
      container.appendChild(btn);
      return;
    }
  }

  if (cfg.position === 'fixed-bottom-right') {
    btn.style.position = 'fixed';
    btn.style.bottom = '24px';
    btn.style.right = '24px';
    btn.style.zIndex = '2147483000';
    document.body.appendChild(btn);
  } else {
    // Default "inline": insert right after the <script> tag
    if (currentScript.parentNode) {
      currentScript.parentNode.insertBefore(btn, currentScript.nextSibling);
    } else {
      document.body.appendChild(btn);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountButton);
} else {
  mountButton();
}

// ── Audio element cleanup ────────────────────────────────────
function removeLiveKitAudioElements() {
  document.querySelectorAll('audio.olleh-vb-audio').forEach(function (el) {
    try { el.pause(); } catch (e) { /* noop */ }
    try { el.srcObject = null; } catch (e) { /* noop */ }
    if (el.parentNode) el.parentNode.removeChild(el);
  });
}

// ── PRE-SESSION: Decode client JWT to extract userId ─────────
function decodeClientToken() {
  try {
    var parts = cfg.clientToken.split('.');
    if (parts.length !== 3) return null;
    var payload = parts[1];
    var pad = payload.length % 4;
    if (pad) payload += '==='.slice(0, 4 - pad);
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch (e) {
    console.warn('[OllehVoiceButton] Could not decode client token:', e);
    return null;
  }
}

// ── PRE-SESSION: Check if agent data is vectorized ───────────
function checkVectorizationFn(userId) {
  return fetch('https://api.olleh.ai/user/' + userId, {
    headers: {
      'Authorization': 'Bearer ' + cfg.adminToken,
      'Content-Type': 'application/json',
    },
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.status !== 200) throw new Error('checkVectorization: unexpected status ' + data.status);
      var isProcessed = !!(data.data && data.data.is_processed);
      var processedData = data.data && data.data.processed_data;
      var succeeded = processedData && processedData.length > 0
        ? processedData.some(function (item) { return item.success; })
        : false;
      return { is_processed: isProcessed, succeeded: succeeded };
    });
}

// ── PRE-SESSION: Trigger vectorization then re-check ─────────
function pollVectorizationFn(userId) {
  return fetch('https://api.olleh.ai/user/vector-data', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + cfg.clientToken,
    },
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.status !== 200) throw new Error('Vectorization trigger failed: ' + (data.message || 'unknown error'));
      return checkVectorizationFn(userId);
    })
    .then(function (result) {
      if (!result.succeeded) {
        throw new Error('Agent data could not be processed. Please check your configuration.');
      }
      return result;
    });
}

// ── API: fetch session token ─────────────────────────────────
function fetchSessionTokenFn() {
  return new Promise(function (resolve, reject) {
    var sid =
      window.crypto && crypto.randomUUID
        ? crypto.randomUUID()
        : 'sid_' +
          Date.now().toString(36) +
          '_' +
          Math.random().toString(36).slice(2, 8);

    var payload = {
      token: cfg.clientToken,
      session_id: sid,
      origin: window.location.origin || '',
    };

    fetch(cfg.sessionEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        var token =
          (data && data.result && data.result.token) ||
          (data && data.data && data.data.token) ||
          (data && data.token);
        if (token) {
          sessionToken = token;
          resolve(token);
        } else {
          reject(new Error('No session token in response'));
        }
      })
      .catch(reject);
  });
}

// ── API: register user session → get LiveKit token ───────────
function registerUserSessionFn() {
  return new Promise(function (resolve, reject) {
    var body = {
      token: sessionToken,
      session_token: sessionToken,
      access_token: sessionToken,
    };

    fetch(cfg.registerEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        var lkToken =
          (data && data.result && data.result.lt_token) ||
          (data && data.lt_token);
        if (lkToken) {
          resolve({ liveKitToken: lkToken, wsUrl: cfg.livekitUrl });
        } else {
          reject(new Error('No LiveKit token in response'));
        }
      })
      .catch(reject);
  });
}

// ── Attach remote audio track to DOM ─────────────────────────
function attachRemoteAudioTrack(track) {
  try {
    var audioEl = track.attach();
    audioEl.classList.add('olleh-vb-audio');
    audioEl.volume = 1.0;
    audioEl.autoplay = true;
    audioEl.playsInline = true;
    document.body.appendChild(audioEl);
    audioEl.play().catch(function () {});
  } catch (e) {
    console.warn('[OllehVoiceButton] Failed to attach audio:', e);
  }
}

// ── Microphone helpers ───────────────────────────────────────
function enableMicrophone(room) {
  return room.localParticipant
    .setMicrophoneEnabled(true, {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    })
    .catch(function (e) {
      console.error('[OllehVoiceButton] Microphone error:', e);
    });
}

function disableMicrophone(room) {
  return room.localParticipant
    .setMicrophoneEnabled(false)
    .catch(function () {});
}

// ── Reset everything back to idle ────────────────────────────
function resetToIdle() {
  stopProcessingTimer(); // ── VECTORIZATION TIMER ──
  if (agentTimeoutId) {
    clearTimeout(agentTimeoutId);
    agentTimeoutId = null;
  }
  lkRoom = null;
  agentJoined = false;
  sessionToken = null;
  state = 'idle';
  updateUI();
  removeLiveKitAudioElements();
}

// ── Start call ───────────────────────────────────────────────
function startCall() {
  if (state !== 'idle') return;

  state = 'loading';
  updateUI();
  agentJoined = false;

  // ── PRE-SESSION: Vectorization check ─────────────────────────
  // Decodes client token → gets userId → checks if agent data is
  // vectorized → waits with timer if not. Requires data-olleh-admin-token.
  // Skip this block (set preSessionPromise = Promise.resolve()) to bypass.
  var decoded = decodeClientToken();
  var userId = decoded && decoded.user && decoded.user.id;

  var preSessionPromise;
  if (!userId || !cfg.adminToken) {
    // No admin token or undecodable token — skip check and proceed
    preSessionPromise = Promise.resolve();
  } else {
    preSessionPromise = checkVectorizationFn(userId)
      .then(function (result) {
        if (!result.is_processed) {
          // ── VECTORIZATION TIMER START ── comment out 3 lines below to disable timer UI
          state = 'processing';
          startProcessingTimer();
          updateUI();
          // ── END VECTORIZATION TIMER START ──
          return pollVectorizationFn(userId).then(function () {
            // ── VECTORIZATION TIMER STOP ── comment out 2 lines below to disable timer UI
            stopProcessingTimer();
            state = 'loading';
            // ── END VECTORIZATION TIMER STOP ──
            updateUI();
          });
        }
        if (!result.succeeded) {
          // All URLs failed to process — abort the call
          throw new Error('Agent data could not be processed. Please check your configuration.');
        }
        // is_processed && succeeded — proceed normally
      })
      .catch(function (err) {
        if (err.message && err.message.indexOf('Agent data') === 0) {
          // Intentional abort: re-throw so the final .catch resets the button
          stopProcessingTimer();
          throw err;
        }
        // Network / API error: log a warning and continue (non-blocking)
        console.warn('[OllehVoiceButton] Pre-session check skipped:', err.message);
        stopProcessingTimer();
        state = 'loading';
        updateUI();
      });
  }
  // ── END PRE-SESSION ──────────────────────────────────────────

  preSessionPromise
    .then(function () {
      return fetchSessionTokenFn();
    })
    .then(function () {
      return registerUserSessionFn();
    })
    .then(function (lkData) {
      lkRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // ── Room events ──

      lkRoom.on(RoomEvent.Connected, function () {
        console.log('[OllehVoiceButton] Connected to room');
        state = 'connected';
        updateUI();

        // Check for participants that were already present
        if (lkRoom.remoteParticipants && lkRoom.remoteParticipants.size > 0) {
          lkRoom.remoteParticipants.forEach(function (participant) {
            var isAgent =
              participant.identity &&
              participant.identity.toLowerCase().indexOf('agent') !== -1;
            if (isAgent) {
              agentJoined = true;
              if (agentTimeoutId) {
                clearTimeout(agentTimeoutId);
                agentTimeoutId = null;
              }
              if (participant.audioTracks) {
                participant.audioTracks.forEach(function (pub) {
                  if (pub.track) attachRemoteAudioTrack(pub.track);
                });
              }
            }
          });
        }

        enableMicrophone(lkRoom);
      });

      lkRoom.on(RoomEvent.ParticipantConnected, function (participant) {
        var isAgent =
          participant.identity &&
          participant.identity.toLowerCase().indexOf('agent') !== -1;
        if (isAgent && !agentJoined) {
          console.log('[OllehVoiceButton] Agent joined');
          agentJoined = true;
          if (agentTimeoutId) {
            clearTimeout(agentTimeoutId);
            agentTimeoutId = null;
          }
        }
      });

      lkRoom.on(RoomEvent.TrackSubscribed, function (track, publication, participant) {
        var isAgent =
          participant.identity &&
          participant.identity.toLowerCase().indexOf('agent') !== -1;
        if (isAgent && !agentJoined) {
          agentJoined = true;
          if (agentTimeoutId) {
            clearTimeout(agentTimeoutId);
            agentTimeoutId = null;
          }
        }
        if (track.kind === 'audio') {
          attachRemoteAudioTrack(track);
        }
      });

      lkRoom.on(RoomEvent.TrackUnsubscribed, function (track) {
        try {
          track.detach().forEach(function (el) {
            el.remove();
          });
        } catch (e) { /* noop */ }
      });

      lkRoom.on(RoomEvent.Disconnected, function (reason) {
        console.log('[OllehVoiceButton] Disconnected:', reason);
        resetToIdle();
      });

      lkRoom.on(RoomEvent.Reconnecting, function () {
        console.log('[OllehVoiceButton] Reconnecting...');
      });

      lkRoom.on(RoomEvent.Reconnected, function () {
        console.log('[OllehVoiceButton] Reconnected');
      });

      // ── Connect to LiveKit ──
      return lkRoom.connect(lkData.wsUrl, lkData.liveKitToken, {
        rtcConfig: { iceTransportPolicy: 'relay' },
        peerConnectionTimeout: 15000,
        websocketTimeout: 15000,
      });
    })
    .then(function () {
      console.log('[OllehVoiceButton] Room connect resolved');
      // Start agent timeout
      agentTimeoutId = setTimeout(function () {
        if (!agentJoined) {
          console.warn('[OllehVoiceButton] Agent did not join within timeout');
          endCall();
        }
      }, cfg.agentTimeout);
    })
    .catch(function (err) {
      console.error('[OllehVoiceButton] Call failed:', err);
      resetToIdle();
    });
}

// ── End call ─────────────────────────────────────────────────
function endCall() {
  if (agentTimeoutId) {
    clearTimeout(agentTimeoutId);
    agentTimeoutId = null;
  }

  if (lkRoom) {
    disableMicrophone(lkRoom);
    try {
      lkRoom.disconnect();
    } catch (e) {
      console.error('[OllehVoiceButton] Disconnect error:', e);
    }
    lkRoom = null;
  }

  state = 'idle';
  updateUI();
  removeLiveKitAudioElements();
}

// ── Click handler ────────────────────────────────────────────
btn.addEventListener('click', function () {
  if (state === 'idle') startCall();
  else if (state === 'connected') endCall();
});
