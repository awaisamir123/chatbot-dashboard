// (function () {
//   var d = document, w = window;
//   var script = d.currentScript;

//   var cfg = {
//     iframeSrc: script?.dataset.ollehIframeSrc || "https://olleh.ai/chat",
//     clientToken: script?.dataset.ollehClientToken || "",
//     sessionEndpoint: script?.dataset.ollehSessionEndpoint || "https://api.olleh.ai/user/session-token",
//     allow: script?.dataset.ollehAllow || "microphone; autoplay",
//     sandbox: script?.dataset.ollehSandbox || "allow-scripts allow-forms allow-same-origin",
//     brandText: script?.dataset.brandText || "Olleh AI Assistant",
//     primaryColor: script?.dataset.primaryColor || "#0798e4",
//     secondaryColor: script?.dataset.secondaryColor || "#000",
//     iconSource: script?.dataset.iconSource || "https://olleh.ai/assets/call-start-removebg-preview.png"
//   };

//   if (w.__OLLEH_CHAT_ACTIVE__) return;
//   w.__OLLEH_CHAT_ACTIVE__ = true;

//   // -------------------------
//   // Helpers
//   // -------------------------
//   function getSessionId() {
//     try {
//       var key = "olleh_ai_session_id";
//       var sid = sessionStorage.getItem(key);
//       if (!sid) {
//         sid = (w.crypto && crypto.randomUUID) ? crypto.randomUUID() : "sid_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
//         sessionStorage.setItem(key, sid);
//       }
//       return sid;
//     } catch (e) {
//       return "sid_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
//     }
//   }

//   function stripTokenParam(urlStr) {
//     try {
//       if (!urlStr) return "";
//       var u = new URL(urlStr, location.href);
//       u.searchParams.delete("token");
//       return u.origin + u.pathname + (u.search ? u.search : "");
//     } catch (e) {
//       return urlStr;
//     }
//   }

//   function buildIframeUrl(baseUrl, token) {
//     try {
//       var u = new URL(baseUrl || https://olleh.ai/chat", location.href);
//       if (token) u.searchParams.set("token", token);
//       u.searchParams.set("brand_text", cfg.brandText);
//       u.searchParams.set("primary_color", cfg.primaryColor);
//       u.searchParams.set("secondary_color", cfg.secondaryColor);
//       u.searchParams.set("icon_src", cfg.iconSource);
//       return u.toString();
//     } catch (e) {
//       var joiner = baseUrl.indexOf("?") > -1 ? "&" : "?";
//       return baseUrl + joiner + "token=" + encodeURIComponent(token || "") + "&brand_text=" + encodeURIComponent(cfg.brandText) + "&primary_color=" + encodeURIComponent(cfg.primaryColor) + "&secondary_color=" + encodeURIComponent(cfg.secondaryColor) + "&icon_src=" + encodeURIComponent(cfg.iconSource);
//     }
//   }

//   function fetchSessionToken(endpoint, clientToken, sessionId) {
//     return new Promise(function (resolve, reject) {
//       if (!endpoint || !clientToken) return reject(new Error("missing endpoint or client token"));
//       var payload = { token: clientToken, session_id: sessionId, origin: location.origin || "" };

//       function handle(r) {
//         if (!r.ok) return r.text().then(function (t) { throw new Error("http " + r.status + ", " + t); });
//         return r.json().then(function (j) {
//           var t = j && j.data && j.data.token;
//           if (!t) throw new Error("no token in response");
//           return String(t);
//         });
//       }

//       fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
//         .then(handle).then(resolve)
//         .catch(function () {
//           fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(payload) })
//             .then(handle).then(resolve).catch(reject);
//         });
//     });
//   }

//   // -------------------------
//   // Floating button
//   // -------------------------
//   var btn = d.createElement("button");
//   btn.type = "button";
//   btn.setAttribute("aria-label", "Open Olleh AI Assistant");
//   var iconUrl = cfg.iconSource;
//   btn.innerHTML = '<img src="' + iconUrl + '" alt="Chat" style="width:28px;height:28px;pointer-events:none;" />';
//   Object.assign(btn.style, {
//     position: "fixed", right: "20px", bottom: "20px", width: "52px", height: "52px",
//     borderRadius: "50%", background: "#ffffff", display: "flex", alignItems: "center",
//     justifyContent: "center", border: "none", cursor: "pointer",
//     boxShadow: "0 6px 20px rgba(0,0,0,0.25)", zIndex: "2147483647", transition: "transform 120ms ease"
//   });
//   btn.onpointerdown = () => (btn.style.transform = "scale(1.05)");
//   btn.onpointerup = () => (btn.style.transform = "scale(1)");
//   d.body.appendChild(btn);

//   // Caption under the mic icon (dynamic styling with primary color)
//   var cap = d.createElement("div");
//   cap.textContent = "Powered by Olleh AI";
//   Object.assign(cap.style, {
//     position: "fixed", bottom: "4px", fontSize: "10px",
//     color: "rgba(0,0,0,0.55)", userSelect: "none", pointerEvents: "none", zIndex: "2147483647"
//   });
//   d.body.appendChild(cap);

//   function positionCaption() {
//     var b = btn.getBoundingClientRect();
//     var capRect = cap.getBoundingClientRect();
//     var left = b.left + b.width / 2 - capRect.width / 2;
//     left = Math.max(8, Math.min(left, w.innerWidth - capRect.width - 8));
//     cap.style.left = left + "px";
//   }

//   positionCaption();
//   w.addEventListener("resize", positionCaption);

//   // -------------------------
//   // Modal with iframe (dynamic content)
//   // -------------------------
//   var modal = d.createElement("div");
//   Object.assign(modal.style, {
//     position: "fixed", right: "16px", bottom: "80px",
//     width: "340px", maxWidth: "calc(100vw - 32px)", height: "80vh",
//     background: "#fff", borderRadius: "14px", overflow: "hidden",
//     boxShadow: "0 8px 30px rgba(0,0,0,0.25)", zIndex: "2147483647",
//     transform: "translateY(20px)", opacity: "0", transition: "all 200ms ease",
//     display: "flex", flexDirection: "column", padding: "0", margin: "0"
//   });
//   d.body.appendChild(modal);

//   // Iframe only (no extra header, no spacing)
//   var iframe = d.createElement("iframe");
//   Object.assign(iframe.style, { flex: "1", width: "100%", border: "none", margin: "0", padding: "0" });
//   iframe.allow = cfg.allow;
//   iframe.sandbox = cfg.sandbox;
//   modal.appendChild(iframe);

//   // Toggle modal
//   var isOpen = false;
//   function openModal() {
//     if (isOpen) return;
//     isOpen = true;
//     modal.style.opacity = "1";
//     modal.style.transform = "translateY(0)";
//     var baseUrl = stripTokenParam(cfg.iframeSrc);
//     var sid = getSessionId();
//     fetchSessionToken(cfg.sessionEndpoint, cfg.clientToken, sid)
//       .then(function (tkn) { iframe.src = buildIframeUrl(baseUrl, tkn); })
//       .catch(function () { iframe.src = cfg.iframeSrc; });
//   }

//   function closeModal() {
//     if (!isOpen) return;
//     isOpen = false;
//     modal.style.opacity = "0";
//     modal.style.transform = "translateY(20px)";
//   }

//   function toggle() { isOpen ? closeModal() : openModal(); }

//   btn.onclick = toggle;
// })();




(function () {
  var d = document, w = window;
  var script = d.currentScript;

  var cfg = {
    iframeSrc: script?.dataset.ollehIframeSrc || "https://olleh.ai/chat",
    clientToken: script?.dataset.ollehClientToken || "",
    sessionEndpoint: script?.dataset.ollehSessionEndpoint || "https://api.olleh.ai/user/session-token",
    allow: script?.dataset.ollehAllow || "microphone; autoplay",
    sandbox: script?.dataset.ollehSandbox || "allow-scripts allow-forms allow-same-origin",
    brandText: script?.dataset.brandText || "Olleh AI Assistant",
    primaryColor: script?.dataset.primaryColor || "#0798e4",
    secondaryColor: script?.dataset.secondaryColor || "#000",
    iconSource: script?.dataset.iconSource || "https://olleh.ai/assets/call-start-removebg-preview.png",
    position: script?.dataset.ollehPosition || "bottom-right"  // Read the position data
  };

  if (w.__OLLEH_CHAT_ACTIVE__) return;
  w.__OLLEH_CHAT_ACTIVE__ = true;

  // -------------------------
  // Helpers
  // -------------------------
  function getSessionId() {
    try {
      var key = "olleh_ai_session_id";
      var sid = sessionStorage.getItem(key);
      if (!sid) {
        sid = (w.crypto && crypto.randomUUID) ? crypto.randomUUID() : "sid_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
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
      var u = new URL(baseUrl || "https://olleh.ai/chat", location.href);
      if (token) u.searchParams.set("token", token);
      u.searchParams.set("brand_text", cfg.brandText);
      u.searchParams.set("primary_color", cfg.primaryColor);
      u.searchParams.set("secondary_color", cfg.secondaryColor);
      u.searchParams.set("icon_src", cfg.iconSource);
      return u.toString();
    } catch (e) {
      var joiner = baseUrl.indexOf("?") > -1 ? "&" : "?";
      return baseUrl + joiner + "token=" + encodeURIComponent(token || "") + "&brand_text=" + encodeURIComponent(cfg.brandText) + "&primary_color=" + encodeURIComponent(cfg.primaryColor) + "&secondary_color=" + encodeURIComponent(cfg.secondaryColor) + "&icon_src=" + encodeURIComponent(cfg.iconSource);
    }
  }

  function fetchSessionToken(endpoint, clientToken, sessionId) {
    return new Promise(function (resolve, reject) {
      if (!endpoint || !clientToken) return reject(new Error("missing endpoint or client token"));
      var payload = { token: clientToken, session_id: sessionId, origin: location.origin || "" };

      function handle(r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error("http " + r.status + ", " + t); });
        return r.json().then(function (j) {
          var t = j && j.data && j.data.token;
          if (!t) throw new Error("no token in response");
          return String(t);
        });
      }

      fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        .then(handle).then(resolve)
        .catch(function () {
          fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(payload) })
            .then(handle).then(resolve).catch(reject);
        });
    });
  }

  // -------------------------
  // Floating button
  // -------------------------
  var btn = d.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", "Open Olleh AI Assistant");
  var iconUrl = cfg.iconSource;
  btn.innerHTML = '<img src="' + iconUrl + '" alt="Chat" style="width:28px;height:28px;pointer-events:none;" />';
  Object.assign(btn.style, {
    position: "fixed",
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
    zIndex: "2147483647",
    transition: "transform 120ms ease"
  });

  // Set position based on data-olleh-position value
  function setPosition() {
    const chatModal = document.querySelector(".chat-modal"); // Ensure the chat modal has a class to check its height/position
    switch (cfg.position) {
      case "top-left":
        btn.style.top = "20px";
        btn.style.left = "20px";
        break;
      case "top-right":
        btn.style.top = "20px";
        btn.style.right = "20px";
        break;
      case "bottom-left":
        btn.style.bottom = "80px";
        btn.style.left = "20px";
        break;
      case "bottom-right":
        btn.style.bottom = "80px";
        btn.style.right = "20px";
        break;
      default:
        btn.style.bottom = "80px";
        btn.style.right = "20px";
        break;
    }
    // Ensure button stays above the modal when it's open
    if (chatModal) {
      const chatModalRect = chatModal.getBoundingClientRect();
      const buttonRect = btn.getBoundingClientRect();

      if (buttonRect.bottom > chatModalRect.top) {
        btn.style.bottom = `${chatModalRect.height + 20}px`; // Push button up
      }
    }
  }

  // Set position on load and resize
  setPosition();
  w.addEventListener("resize", setPosition);

  btn.onpointerdown = () => (btn.style.transform = "scale(1.05)");
  btn.onpointerup = () => (btn.style.transform = "scale(1)");
  d.body.appendChild(btn);

  // Caption under the mic icon (dynamic styling with primary color)
  var cap = d.createElement("div");
  cap.textContent = "Powered by Olleh AI";
  Object.assign(cap.style, {
    position: "fixed",
    bottom: "4px",
    fontSize: "10px",
    color: "rgba(0,0,0,0.55)",
    userSelect: "none",
    pointerEvents: "none",
    zIndex: "2147483647"
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

  // -------------------------
  // Modal with iframe (dynamic content)
  // -------------------------
  var modal = d.createElement("div");
  Object.assign(modal.style, {
    position: "fixed", right: "16px", bottom: "80px",
    width: "340px", maxWidth: "calc(100vw - 32px)", height: "80vh",
    background: "#fff", borderRadius: "14px", overflow: "hidden",
    boxShadow: "0 8px 30px rgba(0,0,0,0.25)", zIndex: "2147483647",
    transform: "translateY(20px)", opacity: "0", transition: "all 200ms ease",
    display: "flex", flexDirection: "column", padding: "0", margin: "0"
  });
  d.body.appendChild(modal);

  // Iframe only (no extra header, no spacing)
  var iframe = d.createElement("iframe");
  Object.assign(iframe.style, { flex: "1", width: "100%", border: "none", margin: "0", padding: "0" });
  iframe.allow = cfg.allow;
  iframe.sandbox = cfg.sandbox;
  modal.appendChild(iframe);

  // Toggle modal
  var isOpen = false;
  function openModal() {
    if (isOpen) return;
    isOpen = true;
    modal.style.opacity = "1";
    modal.style.transform = "translateY(0)";
    var baseUrl = stripTokenParam(cfg.iframeSrc);
    var sid = getSessionId();
    fetchSessionToken(cfg.sessionEndpoint, cfg.clientToken, sid)
      .then(function (tkn) { iframe.src = buildIframeUrl(baseUrl, tkn); })
      .catch(function () { iframe.src = cfg.iframeSrc; });
  }

  function closeModal() {
    if (!isOpen) return;
    isOpen = false;
    modal.style.opacity = "0";
    modal.style.transform = "translateY(20px)";
  }

  function toggle() { isOpen ? closeModal() : openModal(); }

  btn.onclick = toggle;
})();


