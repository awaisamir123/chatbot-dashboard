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
  // Helpers
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
  var iconUrl = script?.dataset.ollehIconSource || "https://cdn.jsdelivr.net/gh/MuhammadAwaisAli/olleh-ai-agent/dist/olleh-bot.svg";
  btn.innerHTML = '<img src="' + iconUrl + '" alt="Chat" style="width:28px;height:28px;pointer-events:none;" />';
  Object.assign(btn.style, {
    position: "fixed", right: "20px", bottom: "20px",
    width: "52px", height: "52px", borderRadius: "50%",
    background: "#ffffff",
    display: "flex", alignItems: "center", justifyContent: "center",
    border: "none", cursor: "pointer",
    boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
    zIndex: "2147483647", transition: "transform 120ms ease"
  });
  btn.onpointerdown = () => (btn.style.transform = "scale(1.05)");
  btn.onpointerup = () => (btn.style.transform = "scale(1)");
  d.body.appendChild(btn);

  // Caption
  var cap = d.createElement("div");
  cap.textContent = "Powered by Olleh AI";
  Object.assign(cap.style, {
    position: "fixed", bottom: "4px", fontSize: "10px",
    color: "rgba(0,0,0,0.55)", userSelect: "none",
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

  // -------------------------
  // Modal (iframe only)
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
// (function () {
//   var d = document, w = window;
//   var script = d.currentScript;

//   var cfg = {
//     iframeSrc: script?.dataset.ollehIframeSrc || "http://localhost:3000/chat",
//     clientToken: script?.dataset.ollehClientToken || "",
//     sessionEndpoint: script?.dataset.ollehSessionEndpoint || "https://api.olleh.ai/user/session-token",
//     allow: script?.dataset.ollehAllow || "microphone; autoplay",
//     sandbox: script?.dataset.ollehSandbox || "allow-scripts allow-forms allow-same-origin allow-presentation",
//     // New customization options
//     chatTitle: script?.dataset.ollehChatTitle || "Olleh AI Assistant",
//     chatSubtitle: script?.dataset.ollehChatSubtitle || "Online • Ready to help",
//     primaryColor: script?.dataset.ollehPrimaryColor || "#667eea",
//     secondaryColor: script?.dataset.ollehSecondaryColor || "#764ba2",
//     iconSource: script?.dataset.ollehIconSource || "https://cdn.jsdelivr.net/gh/MuhammadAwaisAli/olleh-ai-agent/dist/olleh-bot.svg",
//     avatarText: script?.dataset.ollehAvatarText || "AI",
//     buttonPosition: script?.dataset.ollehButtonPosition || "bottom-right" // bottom-right, bottom-left, top-right, top-left
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
//         sid = (w.crypto && crypto.randomUUID)
//           ? crypto.randomUUID()
//           : "sid_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
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
//       var u = new URL(baseUrl || "http://localhost:3000/chat", location.href);
//       if (token) u.searchParams.set("token", token);
//       // Pass theme data to iframe
//       u.searchParams.set("chatTitle", encodeURIComponent(cfg.chatTitle));
//       u.searchParams.set("chatSubtitle", encodeURIComponent(cfg.chatSubtitle));
//       u.searchParams.set("primaryColor", encodeURIComponent(cfg.primaryColor));
//       u.searchParams.set("secondaryColor", encodeURIComponent(cfg.secondaryColor));
//       u.searchParams.set("avatarText", encodeURIComponent(cfg.avatarText));
//       return u.toString();
//     } catch (e) {
//       var joiner = baseUrl.indexOf("?") > -1 ? "&" : "?";
//       return baseUrl + joiner + "token=" + encodeURIComponent(token || "") + 
//              "&chatTitle=" + encodeURIComponent(cfg.chatTitle) +
//              "&primaryColor=" + encodeURIComponent(cfg.primaryColor);
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

//   // Position helper
//   function getPositionStyles() {
//     var pos = cfg.buttonPosition.toLowerCase();
//     if (pos === "bottom-left") return { left: "20px", bottom: "20px", right: "auto", top: "auto" };
//     if (pos === "top-right") return { right: "20px", top: "20px", left: "auto", bottom: "auto" };
//     if (pos === "top-left") return { left: "20px", top: "20px", right: "auto", bottom: "auto" };
//     return { right: "20px", bottom: "20px", left: "auto", top: "auto" }; // default bottom-right
//   }

//   // -------------------------
//   // Styles
//   // -------------------------
//   if (!d.getElementById("olleh-chat-styles")) {
//     var styles = d.createElement("style");
//     styles.id = "olleh-chat-styles";
//     styles.textContent = `
//       :root {
//         --olleh-primary: ${cfg.primaryColor};
//         --olleh-secondary: ${cfg.secondaryColor};
//       }
      
//       .olleh-chat-button {
//         position: fixed;
//         width: 56px;
//         height: 56px;
//         border-radius: 50%;
//         background: linear-gradient(135deg, var(--olleh-primary) 0%, var(--olleh-secondary) 100%);
//         border: none;
//         cursor: pointer;
//         box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
//         z-index: 2147483647;
//         transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
//         display: flex;
//         align-items: center;
//         justify-content: center;
//         padding: 0;
//       }
      
//       .olleh-chat-button:hover {
//         transform: scale(1.1);
//         box-shadow: 0 6px 28px rgba(0, 0, 0, 0.4);
//       }
      
//       .olleh-chat-button:active {
//         transform: scale(0.95);
//       }
      
//       .olleh-chat-button img {
//         width: 28px;
//         height: 28px;
//         pointer-events: none;
//       }
      
//       @keyframes ollehPulse {
//         0%, 100% {
//           box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 0 var(--olleh-primary);
//         }
//         50% {
//           box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 12px transparent;
//         }
//       }
      
//       .olleh-chat-button.pulse {
//         animation: ollehPulse 2s infinite;
//       }
      
//       .olleh-chat-backdrop {
//         position: fixed;
//         inset: 0;
//         background: rgba(0, 0, 0, 0.5);
//         backdrop-filter: blur(2px);
//         opacity: 0;
//         z-index: 2147483646;
//         transition: opacity 0.3s ease;
//         pointer-events: none;
//       }
      
//       .olleh-chat-backdrop.visible {
//         opacity: 1;
//         pointer-events: auto;
//       }
      
//       .olleh-chat-modal {
//         position: fixed;
//         width: 400px;
//         height: 600px;
//         background: #ffffff;
//         border-radius: 16px;
//         overflow: hidden;
//         box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
//         z-index: 2147483647;
//         transform: translateY(20px) scale(0.95);
//         opacity: 0;
//         transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
//       }
      
//       .olleh-chat-modal.visible {
//         transform: translateY(0) scale(1);
//         opacity: 1;
//       }
      
//       @media (max-width: 480px) {
//         .olleh-chat-modal {
//           right: 0 !important;
//           bottom: 0 !important;
//           width: 100%;
//           height: 100%;
//           border-radius: 0;
//         }
        
//         .olleh-chat-button {
//           width: 52px !important;
//           height: 52px !important;
//         }
//       }
      
//       @media (min-width: 481px) and (max-width: 768px) {
//         .olleh-chat-modal {
//           width: calc(100% - 40px);
//           max-width: 420px;
//           height: 80vh;
//           max-height: 640px;
//         }
//       }
      
//       .olleh-chat-loading {
//         position: absolute;
//         inset: 0;
//         display: flex;
//         align-items: center;
//         justify-content: center;
//         background: #f9fafb;
//         z-index: 10;
//       }
      
//       .olleh-chat-spinner {
//         width: 40px;
//         height: 40px;
//         border: 3px solid #e5e7eb;
//         border-top-color: var(--olleh-primary);
//         border-radius: 50%;
//         animation: spin 0.8s linear infinite;
//       }
      
//       @keyframes spin {
//         to { transform: rotate(360deg); }
//       }
      
//       .olleh-chat-branding {
//         position: fixed;
//         font-size: 11px;
//         color: rgba(0, 0, 0, 0.5);
//         font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//         z-index: 2147483645;
//         pointer-events: none;
//         opacity: 0.7;
//         transition: opacity 0.2s;
//       }
      
//       .olleh-chat-branding:hover {
//         opacity: 1;
//       }
//     `;
//     d.head.appendChild(styles);
//   }

//   // -------------------------
//   // UI Elements
//   // -------------------------
//   var posStyles = getPositionStyles();
  
//   // Floating button
//   var btn = d.createElement("button");
//   btn.className = "olleh-chat-button pulse";
//   btn.setAttribute("aria-label", "Open " + cfg.chatTitle);
//   btn.innerHTML = '<img src="' + cfg.iconSource + '" alt="Chat" />';
//   Object.assign(btn.style, posStyles);
//   d.body.appendChild(btn);

//   // Backdrop
//   var backdrop = d.createElement("div");
//   backdrop.className = "olleh-chat-backdrop";
//   d.body.appendChild(backdrop);

//   // Modal
//   var modal = d.createElement("div");
//   modal.className = "olleh-chat-modal";
  
//   // Position modal based on button position
//   var modalPos = {};
//   if (posStyles.right) {
//     modalPos.right = posStyles.right;
//     modalPos.bottom = "100px";
//   } else if (posStyles.left) {
//     modalPos.left = posStyles.left;
//     modalPos.bottom = "100px";
//   }
//   Object.assign(modal.style, modalPos);
  
//   modal.innerHTML = '<div class="olleh-chat-loading"><div class="olleh-chat-spinner"></div></div>';
//   d.body.appendChild(modal);

//   // Branding
//   var branding = d.createElement("div");
//   branding.className = "olleh-chat-branding";
//   branding.textContent = "Powered by Olleh AI";
  
//   var brandingPos = {};
//   if (posStyles.right) {
//     brandingPos.right = "85px";
//     brandingPos.bottom = posStyles.bottom || "32px";
//   } else if (posStyles.left) {
//     brandingPos.left = "85px";
//     brandingPos.bottom = posStyles.bottom || "32px";
//   }
//   Object.assign(branding.style, brandingPos);
//   d.body.appendChild(branding);

//   // Iframe
//   var iframe = d.createElement("iframe");
//   Object.assign(iframe.style, { 
//     width: "100%", 
//     height: "100%", 
//     border: "none",
//     display: "block"
//   });
//   iframe.allow = cfg.allow;
//   iframe.sandbox = cfg.sandbox;
//   modal.appendChild(iframe);

//   var loading = modal.querySelector(".olleh-chat-loading");

//   // -------------------------
//   // Modal toggle
//   // -------------------------
//   var isOpen = false;
//   var isLoaded = false;

//   function openModal() {
//     if (isOpen) return;
//     isOpen = true;
    
//     backdrop.classList.add("visible");
//     modal.classList.add("visible");
//     btn.classList.remove("pulse");

//     if (!isLoaded) {
//       var baseUrl = stripTokenParam(cfg.iframeSrc);
//       var sid = getSessionId();
      
//       loading.style.display = "flex";
      
//       fetchSessionToken(cfg.sessionEndpoint, cfg.clientToken, sid)
//         .then(function (tkn) {
//           iframe.src = buildIframeUrl(baseUrl, tkn);
          
//           iframe.onload = function() {
//             setTimeout(function() {
//               loading.style.display = "none";
//               isLoaded = true;
//             }, 500);
//           };
//         })
//         .catch(function (err) {
//           console.error("Failed to fetch session token:", err);
//           iframe.src = buildIframeUrl(cfg.iframeSrc, "");
          
//           iframe.onload = function() {
//             setTimeout(function() {
//               loading.style.display = "none";
//               isLoaded = true;
//             }, 500);
//           };
//         });
//     }
//   }

//   function closeModal() {
//     if (!isOpen) return;
//     isOpen = false;
//     backdrop.classList.remove("visible");
//     modal.classList.remove("visible");
//   }

//   function toggle() {
//     isOpen ? closeModal() : openModal();
//   }

//   btn.onclick = toggle;
//   backdrop.onclick = closeModal;

//   d.addEventListener("keydown", function(e) {
//     if (e.key === "Escape" && isOpen) {
//       closeModal();
//     }
//   });
// })();
