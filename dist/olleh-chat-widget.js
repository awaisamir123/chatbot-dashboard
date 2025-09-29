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
  // Floating chat button
  var btn = d.createElement("button");
  btn.type = "button";
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="#fff" viewBox="0 0 24 24"><path d="M2 3h20v14H5.17L2 20.17V3zm2 2v11.17L5.17 15H20V5H4z"/></svg>';
  Object.assign(btn.style, {
    position: "fixed", right: "24px", bottom: "24px",
    width: "56px", height: "56px", borderRadius: "50%",
    background: "linear-gradient(135deg,#2563eb,#3b82f6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    border: "none", cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
    zIndex: "2147483647", transition: "transform 120ms ease"
  });
  btn.onpointerdown = () => (btn.style.transform = "scale(1.05)");
  btn.onpointerup = () => (btn.style.transform = "scale(1)");
  d.body.appendChild(btn);

  // Modal
  var modal = d.createElement("div");
  Object.assign(modal.style, {
    position: "fixed", right: "16px", bottom: "96px",
    width: "22rem", maxWidth: "calc(100vw - 24px)", height: "70vh",
    background: "#fff", borderRadius: "16px", overflow: "hidden",
    boxShadow: "0 20px 50px rgba(0,0,0,0.25)", zIndex: "2147483647",
    transform: "translateY(24px)", opacity: "0", transition: "all 200ms ease"
  });
  d.body.appendChild(modal);

  // Header
  var header = d.createElement("div");
  header.innerHTML = '<span style="font-weight:600;font-size:14px">Olleh AI Chat</span>';
  Object.assign(header.style, {
    padding: "10px 12px", background: "linear-gradient(90deg,#2563eb,#3b82f6)",
    color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center"
  });
  var close = d.createElement("button");
  close.innerHTML = "✕";
  Object.assign(close.style, { background: "transparent", border: "none", color: "#fff", fontSize: "16px", cursor: "pointer" });
  header.appendChild(close);
  modal.appendChild(header);

  // Iframe body
  var iframe = d.createElement("iframe");
  Object.assign(iframe.style, { width: "100%", height: "calc(100% - 40px)", border: "none" });
  iframe.allow = cfg.allow;
  iframe.sandbox = cfg.sandbox;
  modal.appendChild(iframe);

  // -------------------------
  // Modal toggle with token
  // -------------------------
  var isOpen = false;
  function openModal() {
    if (isOpen) return;
    isOpen = true;
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
    modal.style.opacity = "0";
    modal.style.transform = "translateY(24px)";
  }
  function toggle() {
    isOpen ? closeModal() : openModal();
  }

  btn.onclick = toggle;
  close.onclick = closeModal;
})();
