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
          headers: { "Content-Type": "application/json", "allow-origin": location.origin || "" },
          body: JSON.stringify(payload)
        });
      }
      function postForm() {
        return fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(payload)
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

      postJson()
        .then(handle)
        .then(resolve)
        .catch(function (err) {
          postForm().then(handle).then(resolve).catch(reject);
        });
    });
  }

  // -------------------------
  // UI Elements
  // -------------------------
  // Floating mic button
  var btn = d.createElement("button");
  btn.type = "button";
  var iconUrl = script?.dataset.ollehIconSource || "https://cdn.jsdelivr.net/gh/MuhammadAwaisAli/olleh-ai-agent/dist/olleh-mic.svg";
  btn.innerHTML = '<img src="' + iconUrl + '" alt="Olleh AI" style="width:32px;height:32px;pointer-events:none;" />';
  btn.setAttribute("aria-label", "Open Olleh Chat");
  Object.assign(btn.style, {
    position: "fixed", right: "24px", bottom: "24px",
    width: "56px", height: "56px", borderRadius: "50%",
    background: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    border: "none", cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    zIndex: "2147483647", transition: "transform 120ms ease"
  });
  btn.onpointerdown = () => (btn.style.transform = "scale(1.06)");
  btn.onpointerup = () => (btn.style.transform = "scale(1)");
  d.body.appendChild(btn);

  // Beat animation
  if (!d.getElementById("olleh-chat-anim")) {
    var st = d.createElement("style");
    st.id = "olleh-chat-anim";
    st.textContent = `
      button[aria-label="Open Olleh Chat"]::after {
        content:"";
        position:absolute;
        inset:-6px;
        border-radius:9999px;
        pointer-events:none;
        box-shadow:0 0 0 0 rgba(59,130,246,0.55);
        animation:ollehBeat 1.6s ease-out infinite;
      }
      @keyframes ollehBeat {
        0%   { transform:scale(1);    box-shadow:0 0 0 0   rgba(59,130,246,0.55); }
        60%  { transform:scale(1.08); box-shadow:0 0 0 14px rgba(59,130,246,0.00); }
        100% { transform:scale(1);    box-shadow:0 0 0 0   rgba(59,130,246,0.00); }
      }
    `;
    d.head.appendChild(st);
  }

  // Caption
  var cap = d.createElement("div");
  cap.textContent = "Powered by Olleh AI";
  Object.assign(cap.style, {
    position: "fixed", bottom: "4px", fontSize: "10px",
    color: "rgba(0,0,0,0.65)", userSelect: "none",
    pointerEvents: "none", zIndex: "2147483647"
  });
  d.body.appendChild(cap);
  function positionCaption() {
    var b = btn.getBoundingClientRect();
    var capRect = cap.getBoundingClientRect();
    var left = b.left + b.width / 2 - capRect.width / 2;
    left = Math.max(8, Math.min(left, w.innerWidth - capRect.width - 8));
    cap.style.left = left + "px";
  }
  positionCaption();
  w.addEventListener("resize", positionCaption);

  // Backdrop
  var backdrop = d.createElement("div");
  Object.assign(backdrop.style, {
    position: "fixed", inset: "0", background: "rgba(0,0,0,0.2)",
    opacity: "0", zIndex: "2147483646", transition: "opacity 200ms ease",
    pointerEvents: "none"
  });
  d.body.appendChild(backdrop);

  // Modal
  var modal = d.createElement("div");
  Object.assign(modal.style, {
    position: "fixed", right: "16px", bottom: "96px",
    width: "100%", maxWidth: "420px",
    height: "70vh", maxHeight: "600px",
    background: "#fff", borderRadius: "16px", overflow: "hidden",
    boxShadow: "0 20px 50px rgba(0,0,0,0.25)", zIndex: "2147483647",
    transform: "translateY(24px)", opacity: "0", transition: "all 200ms ease"
  });
  d.body.appendChild(modal);

  // Iframe
  var iframe = d.createElement("iframe");
  Object.assign(iframe.style, { width: "100%", height: "100%", border: "none" });
  iframe.allow = cfg.allow;
  iframe.sandbox = cfg.sandbox;
  modal.appendChild(iframe);

  // Responsive resize
  function resizeModal() {
    if (w.innerWidth < 480) {
      modal.style.right = "0";
      modal.style.bottom = "0";
      modal.style.width = "100%";
      modal.style.height = "100%";
      modal.style.maxWidth = "100%";
      modal.style.maxHeight = "100%";
      modal.style.borderRadius = "0";
    } else {
      modal.style.right = "16px";
      modal.style.bottom = "96px";
      modal.style.width = "100%";
      modal.style.maxWidth = "420px";
      modal.style.height = "70vh";
      modal.style.maxHeight = "600px";
      modal.style.borderRadius = "16px";
    }
  }
  resizeModal();
  w.addEventListener("resize", resizeModal);

  // -------------------------
  // Modal toggle with token
  // -------------------------
  var isOpen = false;
  function openModal() {
    if (isOpen) return;
    isOpen = true;
    backdrop.style.opacity = "1";
    backdrop.style.pointerEvents = "auto";
    modal.style.opacity = "1";
    modal.style.transform = "translateY(0)";
    var baseUrl = stripTokenParam(cfg.iframeSrc);
    var sid = getSessionId();
    fetchSessionToken(cfg.sessionEndpoint, cfg.clientToken, sid)
      .then(function (tkn) {
        iframe.src = buildIframeUrl(baseUrl, tkn);
      })
      .catch(function () {
        iframe.src = cfg.iframeSrc;
      });
  }
  function closeModal() {
    if (!isOpen) return;
    isOpen = false;
    backdrop.style.opacity = "0";
    backdrop.style.pointerEvents = "none";
    modal.style.opacity = "0";
    modal.style.transform = "translateY(24px)";
  }
  function toggle() {
    isOpen ? closeModal() : openModal();
  }

  btn.onclick = toggle;
  backdrop.onclick = closeModal;
})();
