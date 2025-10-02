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
    buttonPosition: script?.dataset.buttonPosition || "bottom-right" // NEW: bottom-right, bottom-left, top-right, top-left
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

  // Get position styles based on config
  function getButtonPosition() {
    var pos = cfg.buttonPosition.toLowerCase();
    if (pos === "bottom-left") return { left: "20px", bottom: "20px", right: "auto", top: "auto" };
    if (pos === "top-right") return { right: "20px", top: "20px", left: "auto", bottom: "auto" };
    if (pos === "top-left") return { left: "20px", top: "20px", right: "auto", bottom: "auto" };
    return { right: "20px", bottom: "20px", left: "auto", top: "auto" }; // default bottom-right
  }

  function getModalPosition() {
    var pos = cfg.buttonPosition.toLowerCase();
    if (pos === "bottom-left") return { left: "20px", bottom: "90px", right: "auto", top: "auto" };
    if (pos === "top-right") return { right: "20px", top: "90px", left: "auto", bottom: "auto" };
    if (pos === "top-left") return { left: "20px", top: "90px", right: "auto", bottom: "auto" };
    return { right: "20px", bottom: "90px", left: "auto", top: "auto" }; // default bottom-right
  }

  function getCaptionPosition() {
    var pos = cfg.buttonPosition.toLowerCase();
    var btnRect = btn.getBoundingClientRect();
    var capRect = cap.getBoundingClientRect();
    
    if (pos === "bottom-left" || pos === "bottom-right") {
      // Caption below button
      var left = btnRect.left + btnRect.width / 2 - capRect.width / 2;
      left = Math.max(8, Math.min(left, w.innerWidth - capRect.width - 8));
      cap.style.left = left + "px";
      cap.style.bottom = "4px";
      cap.style.top = "auto";
    } else {
      // Caption below button for top positions too
      var left = btnRect.left + btnRect.width / 2 - capRect.width / 2;
      left = Math.max(8, Math.min(left, w.innerWidth - capRect.width - 8));
      cap.style.left = left + "px";
      cap.style.top = (btnRect.bottom + 4) + "px";
      cap.style.bottom = "auto";
    }
  }

  // -------------------------
  // Floating button
  // -------------------------
  var btnPos = getButtonPosition();
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
    transition: "transform 120ms ease, opacity 200ms ease"
  });
  Object.assign(btn.style, btnPos);
  
  btn.onpointerdown = function() { btn.style.transform = "scale(1.05)"; };
  btn.onpointerup = function() { btn.style.transform = "scale(1)"; };
  d.body.appendChild(btn);

  // Caption under/near the icon
  var cap = d.createElement("div");
  cap.textContent = "Powered by Olleh AI";
  Object.assign(cap.style, {
    position: "fixed",
    fontSize: "10px",
    color: "rgba(0,0,0,0.55)",
    userSelect: "none",
    pointerEvents: "none",
    zIndex: "2147483647",
    transition: "opacity 200ms ease"
  });
  d.body.appendChild(cap);

  function positionCaption() {
    getCaptionPosition();
  }

  positionCaption();
  w.addEventListener("resize", positionCaption);

  // -------------------------
  // Modal with iframe
  // -------------------------
  var modalPos = getModalPosition();
  var modal = d.createElement("div");
  Object.assign(modal.style, {
    position: "fixed",
    width: "340px",
    maxWidth: "calc(100vw - 32px)",
    height: "80vh",
    maxHeight: "600px",
    background: "#fff",
    borderRadius: "14px",
    overflow: "hidden",
    boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
    zIndex: "2147483646", // One less than button so button stays on top
    transform: "translateY(20px)",
    opacity: "0",
    transition: "all 200ms ease",
    display: "flex",
    flexDirection: "column",
    padding: "0",
    margin: "0"
  });
  Object.assign(modal.style, modalPos);
  d.body.appendChild(modal);

  // Iframe only
  var iframe = d.createElement("iframe");
  Object.assign(iframe.style, {
    flex: "1",
    width: "100%",
    border: "none",
    margin: "0",
    padding: "0"
  });
  iframe.allow = cfg.allow;
  iframe.sandbox = cfg.sandbox;
  modal.appendChild(iframe);

  // -------------------------
  // Toggle modal
  // -------------------------
  var isOpen = false;

  function openModal() {
    if (isOpen) return;
    isOpen = true;
    modal.style.opacity = "1";
    modal.style.transform = "translateY(0)";
    
    // Keep button visible but slightly fade caption
    btn.style.opacity = "1";
    cap.style.opacity = "0.3";
    
    var baseUrl = stripTokenParam(cfg.iframeSrc);
    var sid = getSessionId();
    fetchSessionToken(cfg.sessionEndpoint, cfg.clientToken, sid)
      .then(function (tkn) { iframe.src = buildIframeUrl(baseUrl, tkn); })
      .catch(function () { iframe.src = buildIframeUrl(cfg.iframeSrc, ""); });
  }

  function closeModal() {
    if (!isOpen) return;
    isOpen = false;
    modal.style.opacity = "0";
    modal.style.transform = "translateY(20px)";
    
    // Restore button and caption opacity
    btn.style.opacity = "1";
    cap.style.opacity = "0.7";
  }

  function toggle() {
    isOpen ? closeModal() : openModal();
  }

  btn.onclick = toggle;

  // Handle responsive behavior
  function handleResize() {
    positionCaption();
    
    // On mobile, make modal full screen
    if (w.innerWidth < 480) {
      modal.style.width = "100%";
      modal.style.height = "100%";
      modal.style.maxWidth = "100%";
      modal.style.maxHeight = "100%";
      modal.style.borderRadius = "0";
      modal.style.left = "0";
      modal.style.right = "0";
      modal.style.top = "0";
      modal.style.bottom = "0";
    } else {
      modal.style.width = "340px";
      modal.style.height = "80vh";
      modal.style.maxWidth = "calc(100vw - 32px)";
      modal.style.maxHeight = "600px";
      modal.style.borderRadius = "14px";
      Object.assign(modal.style, modalPos);
    }
  }

  w.addEventListener("resize", handleResize);
  handleResize();
})();
