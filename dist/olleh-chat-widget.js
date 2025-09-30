(function () {
  var d = document, w = window;
  var script = d.currentScript;

  var cfg = {
    iframeSrc: script?.dataset.ollehIframeSrc || "http://localhost:3000/chat",
    clientToken: script?.dataset.ollehClientToken || "",
    sessionEndpoint: script?.dataset.ollehSessionEndpoint || "https://api.olleh.ai/user/session-token",
    allow: script?.dataset.ollehAllow || "microphone; autoplay",
    sandbox: script?.dataset.ollehSandbox || "allow-scripts allow-forms allow-same-origin"
  };

  if (w.__OLLEH_CHAT_ACTIVE__) return;
  w.__OLLEH_CHAT_ACTIVE__ = true;

  // -------------------------
  // Session helpers
  // -------------------------
  function getSessionId() {
    try {
      var key = "olleh_ai_session_id";
      var sid = sessionStorage.getItem(key);
      if (!sid) {
        sid = (w.crypto && crypto.randomUUID)
          ? crypto.randomUUID()
          : "sid_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
        sessionStorage.setItem(key, sid);
      }
      return sid;
    } catch (e) {
      return "sid_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
    }
  }

  function stripTokenParam(urlStr) {
    try {
      if (!urlStr) return "";
      var u = new URL(urlStr, location.href);
      u.searchParams.delete("token");
      return u.origin + u.pathname + (u.search ? u.search : "");
    } catch (e) {
      return urlStr;
    }
  }

  function buildIframeUrl(baseUrl, token) {
    try {
      var u = new URL(baseUrl || "http://localhost:3000/chat", location.href);
      if (token) u.searchParams.set("token", token);
      return u.toString();
    } catch (e) {
      var joiner = baseUrl.indexOf("?") > -1 ? "&" : "?";
      return baseUrl + joiner + "token=" + encodeURIComponent(token || "");
    }
  }

  function fetchSessionToken(endpoint, clientToken, sessionId) {
    return new Promise(function (resolve, reject) {
      if (!endpoint || !clientToken) {
        return reject(new Error("missing endpoint or client token"));
      }

      var payload = {
        token: clientToken,
        session_id: sessionId,
        origin: location.origin || ""
      };

      function postJson() {
        return fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }
      
      function handle(r) {
        if (!r.ok) {
          return r.text().then(function (t) {
            throw new Error("http " + r.status + ", " + t);
          });
        }
        return r.json().then(function (j) {
          var t = j && j.data && j.data.token;
          if (!t) throw new Error("no token in response");
          return String(t);
        });
      }

      postJson().then(handle).then(resolve).catch(reject);
    });
  }

  // -------------------------
  // Styles
  // -------------------------
  if (!d.getElementById("olleh-chat-styles")) {
    var styles = d.createElement("style");
    styles.id = "olleh-chat-styles";
    styles.textContent = `
      /* Widget Button */
      .olleh-chat-button {
        position: fixed;
        right: 20px;
        bottom: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        z-index: 2147483647;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .olleh-chat-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 28px rgba(102, 126, 234, 0.5);
      }
      
      .olleh-chat-button:active {
        transform: scale(0.95);
      }
      
      .olleh-chat-button svg {
        width: 28px;
        height: 28px;
        fill: white;
      }
      
      /* Pulse animation */
      @keyframes ollehPulse {
        0%, 100% {
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4), 0 0 0 0 rgba(102, 126, 234, 0.7);
        }
        50% {
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4), 0 0 0 12px rgba(102, 126, 234, 0);
        }
      }
      
      .olleh-chat-button.pulse {
        animation: ollehPulse 2s infinite;
      }
      
      /* Badge */
      .olleh-chat-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ef4444;
        color: white;
        border-radius: 12px;
        padding: 2px 6px;
        font-size: 11px;
        font-weight: 600;
        min-width: 20px;
        text-align: center;
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
      }
      
      /* Backdrop */
      .olleh-chat-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(2px);
        opacity: 0;
        z-index: 2147483646;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }
      
      .olleh-chat-backdrop.visible {
        opacity: 1;
        pointer-events: auto;
      }
      
      /* Modal Container */
      .olleh-chat-modal {
        position: fixed;
        right: 20px;
        bottom: 100px;
        width: 400px;
        height: 600px;
        background: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        z-index: 2147483647;
        transform: translateY(20px) scale(0.95);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column;
      }
      
      .olleh-chat-modal.visible {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
      
      /* Mobile responsive */
      @media (max-width: 480px) {
        .olleh-chat-modal {
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          border-radius: 0;
        }
        
        .olleh-chat-button {
          right: 16px;
          bottom: 16px;
          width: 56px;
          height: 56px;
        }
      }
      
      /* Tablet */
      @media (min-width: 481px) and (max-width: 768px) {
        .olleh-chat-modal {
          width: calc(100% - 40px);
          max-width: 420px;
          height: 80vh;
          max-height: 640px;
        }
      }
      
      /* Modal Header */
      .olleh-chat-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }
      
      .olleh-chat-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .olleh-chat-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 16px;
      }
      
      .olleh-chat-info h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      .olleh-chat-info p {
        margin: 2px 0 0 0;
        font-size: 12px;
        opacity: 0.9;
      }
      
      .olleh-chat-close {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      
      .olleh-chat-close:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .olleh-chat-close svg {
        width: 20px;
        height: 20px;
        fill: white;
      }
      
      /* Iframe Container */
      .olleh-chat-body {
        flex: 1;
        position: relative;
        overflow: hidden;
      }
      
      .olleh-chat-body iframe {
        width: 100%;
        height: 100%;
        border: none;
        display: block;
      }
      
      /* Loading State */
      .olleh-chat-loading {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f9fafb;
      }
      
      .olleh-chat-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #e5e7eb;
        border-top-color: #667eea;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      /* Branding */
      .olleh-chat-branding {
        position: fixed;
        right: 90px;
        bottom: 32px;
        font-size: 11px;
        color: rgba(0, 0, 0, 0.5);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        z-index: 2147483645;
        pointer-events: none;
        opacity: 0.7;
        transition: opacity 0.2s;
      }
      
      .olleh-chat-branding:hover {
        opacity: 1;
      }
    `;
    d.head.appendChild(styles);
  }

  // -------------------------
  // UI Elements
  // -------------------------
  
  // Floating button
  var btn = d.createElement("button");
  btn.className = "olleh-chat-button pulse";
  btn.setAttribute("aria-label", "Open Olleh AI Chat");
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
    </svg>
  `;
  d.body.appendChild(btn);

  // Badge (optional, for unread count)
  var badge = d.createElement("span");
  badge.className = "olleh-chat-badge";
  badge.style.display = "none";
  badge.textContent = "1";
  btn.appendChild(badge);

  // Backdrop
  var backdrop = d.createElement("div");
  backdrop.className = "olleh-chat-backdrop";
  d.body.appendChild(backdrop);

  // Modal
  var modal = d.createElement("div");
  modal.className = "olleh-chat-modal";
  modal.innerHTML = `
    <div class="olleh-chat-header">
      <div class="olleh-chat-header-left">
        <div class="olleh-chat-avatar">AI</div>
        <div class="olleh-chat-info">
          <h3>Olleh AI Assistant</h3>
          <p>Online • Ready to help</p>
        </div>
      </div>
      <button class="olleh-chat-close" aria-label="Close chat">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
    <div class="olleh-chat-body">
      <div class="olleh-chat-loading">
        <div class="olleh-chat-spinner"></div>
      </div>
      <iframe allow="${cfg.allow}" sandbox="${cfg.sandbox}"></iframe>
    </div>
  `;
  d.body.appendChild(modal);

  // Branding
  var branding = d.createElement("div");
  branding.className = "olleh-chat-branding";
  branding.textContent = "Powered by Olleh AI";
  d.body.appendChild(branding);

  // Get elements
  var iframe = modal.querySelector("iframe");
  var loading = modal.querySelector(".olleh-chat-loading");
  var closeBtn = modal.querySelector(".olleh-chat-close");

  // -------------------------
  // Modal toggle
  // -------------------------
  var isOpen = false;
  var isLoaded = false;

  function openModal() {
    if (isOpen) return;
    isOpen = true;
    
    backdrop.classList.add("visible");
    modal.classList.add("visible");
    btn.classList.remove("pulse");
    badge.style.display = "none";

    // Load iframe if not loaded
    if (!isLoaded) {
      var baseUrl = stripTokenParam(cfg.iframeSrc);
      var sid = getSessionId();
      
      loading.style.display = "flex";
      
      fetchSessionToken(cfg.sessionEndpoint, cfg.clientToken, sid)
        .then(function (tkn) {
          iframe.src = buildIframeUrl(baseUrl, tkn);
          
          // Hide loading when iframe loads
          iframe.onload = function() {
            setTimeout(function() {
              loading.style.display = "none";
              isLoaded = true;
            }, 500);
          };
        })
        .catch(function (err) {
          console.error("Failed to fetch session token:", err);
          iframe.src = cfg.iframeSrc;
          
          iframe.onload = function() {
            setTimeout(function() {
              loading.style.display = "none";
              isLoaded = true;
            }, 500);
          };
        });
    }
  }

  function closeModal() {
    if (!isOpen) return;
    isOpen = false;
    
    backdrop.classList.remove("visible");
    modal.classList.remove("visible");
  }

  function toggle() {
    isOpen ? closeModal() : openModal();
  }

  // Event listeners
  btn.onclick = toggle;
  backdrop.onclick = closeModal;
  closeBtn.onclick = closeModal;

  // Keyboard shortcut (ESC to close)
  d.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && isOpen) {
      closeModal();
    }
  });

  // Message from iframe (for advanced features)
  w.addEventListener("message", function(e) {
    // Add your message handling logic here
    // Example: if (e.data.type === "olleh-unread") { badge.textContent = e.data.count; }
  });
})();
