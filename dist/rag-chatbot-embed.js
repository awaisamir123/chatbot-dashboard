// // rag-embed.js  (host this on your CDN)
// (function () {
//   if (window.__RAG_EMBED_LOADED__) return;
//   window.__RAG_EMBED_LOADED__ = true;

//   var el = document.currentScript || document.getElementById("rag-chatbot");
//   if (!el) return;

//   var cfg = {
//     documentKey: el.dataset.documentKey || "",
//     apiBase: el.dataset.apiEndpoint || "",
//     theme: el.dataset.theme || "gradient",
//     position: el.dataset.position || "bottom-right",
//     title: el.dataset.title || "Smart Assistant",
//     welcome: el.dataset.welcomeMessage || "Hi there! How can I help today?",
//     autostart: (el.dataset.autostart || "false") === "true",
//   };

//   if (!cfg.documentKey || !cfg.apiBase) {
//     console.warn("[RAG] Missing documentKey or apiBase");
//     return;
//   }

//   // simple theming
//   var themes = {
//     gradient: { btn: "#667eea", header: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)" },
//     blue: { btn: "#2563eb", header: "#2563eb" },
//     dark: { btn: "#1f2937", header: "#1f2937" },
//   };
//   var t = themes[cfg.theme] || themes.gradient;

//   var anchors = {
//     "bottom-right": { bottom: "24px", right: "24px" },
//     "bottom-left": { bottom: "24px", left: "24px" },
//     "top-right": { top: "24px", right: "24px" },
//     "top-left": { top: "24px", left: "24px" },
//   };

//   // FAB
//   var btn = document.createElement("button");
//   btn.id = "rag-chat-btn";
//   btn.textContent = "💬";
//   btn.style.cssText =
//     "position:fixed;width:60px;height:60px;border:none;border-radius:50%;cursor:pointer;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.2);font-size:24px;color:#fff;";
//   btn.style.background = t.btn;
//   Object.assign(btn.style, anchors[cfg.position] || anchors["bottom-right"]);
//   document.body.appendChild(btn);

//   // Window
//   var win = document.createElement("div");
//   win.id = "rag-chat-window";
//   win.style.cssText =
//     "position:fixed;width:380px;height:500px;background:#fff;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.25);z-index:9998;display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";
//   Object.assign(win.style, anchors[cfg.position] || anchors["bottom-right"]);
//   if (win.style.bottom)
//     win.style.bottom = (parseInt(win.style.bottom) + 80) + "px";
//   else
//     win.style.top = (parseInt(win.style.top) + 80) + "px";

//   win.innerHTML =
//     '<div style="background:' + t.header + ';color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center">' +
//       '<div style="font-weight:600">' + escapeHtml(cfg.title) + '</div>' +
//       '<button id="rag-close" style="background:rgba(255,255,255,.2);border:none;border-radius:50%;width:28px;height:28px;color:#fff;cursor:pointer">✕</button>' +
//     '</div>' +
//     '<div id="rag-chat-messages" style="flex:1;padding:16px;overflow:auto;background:#f8f9fa"></div>' +
//     '<div id="rag-chat-input" style="display:flex;gap:8px;border-top:1px solid #e9ecef;padding:12px;background:#fff">' +
//       '<input id="rag-input" type="text" placeholder="Type your question..." style="flex:1;padding:10px 12px;border:1px solid #dee2e6;border-radius:20px;font-size:14px" />' +
//       '<button id="rag-send" style="padding:10px 14px;border:none;border-radius:20px;color:#fff;cursor:pointer;background:'+t.btn+'">Send</button>' +
//     '</div>';
//   document.body.appendChild(win);

//   var open = false;
//   var msgs = document.getElementById("rag-chat-messages");
//   var input = document.getElementById("rag-input");
//   var sendBtn = document.getElementById("rag-send");
//   var closeBtn = document.getElementById("rag-close");

//   function add(role, text) {
//     var row = document.createElement("div");
//     row.style.cssText = "margin:10px 0;display:flex;" + (role === "user" ? "justify-content:flex-end" : "justify-content:flex-start");
//     var bubble = document.createElement("div");
//     bubble.textContent = text;
//     bubble.style.cssText = "max-width:80%;padding:10px 12px;border-radius:16px;font-size:14px;line-height:1.4;" +
//       (role === "user" ? "background:"+t.btn+";color:#fff" : "background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.1);color:#333");
//     row.appendChild(bubble);
//     msgs.appendChild(row);
//     msgs.scrollTop = msgs.scrollHeight;
//   }

//   function openWin() {
//     if (open) return;
//     open = true;
//     win.style.display = "flex";
//     if (!msgs.childElementCount) add("assistant", cfg.welcome);
//     input.focus();
//   }
//   function closeWin() { open = false; win.style.display = "none"; }
//   btn.onclick = openWin;
//   closeBtn.onclick = closeWin;

//   async function ask(q) {
//     add("user", q);
//     var typing = document.createElement("div");
//     typing.textContent = "Assistant is typing...";
//     typing.style.cssText = "color:#666;font-style:italic;font-size:13px;margin:8px 0";
//     msgs.appendChild(typing); msgs.scrollTop = msgs.scrollHeight;

//     try {
//       const res = await fetch(cfg.apiBase + "/api/document/chat/rag", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         // NOTE: we do NOT send userId; server should infer or ignore
//         body: JSON.stringify({ document_key: cfg.documentKey, message: q }),
//       });

//       if (!res.ok || !res.body) {
//         typing.remove();
//         add("assistant", "Sorry, I ran into an issue. Please try again.");
//         return;
//       }

//       typing.remove();
//       add("assistant", "");
//       const last = msgs.lastChild.firstChild;

//       const reader = res.body.getReader();
//       const decoder = new TextDecoder();
//       let acc = "";
//       while (true) {
//         const { value, done } = await reader.read();
//         if (done) break;
//         acc += decoder.decode(value, { stream: true });
//         const lines = acc.split("\n");
//         acc = lines.pop() || "";
//         for (const line of lines) {
//           if (!line.trim()) continue;
//           try {
//             const obj = JSON.parse(line);
//             if (obj.token) {
//               last.textContent += obj.token;
//               msgs.scrollTop = msgs.scrollHeight;
//             }
//           } catch (_) {}
//         }
//       }
//     } catch (e) {
//       typing.remove();
//       add("assistant", "Hmm, something went wrong. Let’s give it another try.");
//     }
//   }

//   sendBtn.onclick = function () {
//     var q = (input.value || "").trim();
//     if (!q) return;
//     input.value = "";
//     ask(q);
//   };
//   input.addEventListener("keypress", function (e) {
//     if (e.key === "Enter") sendBtn.click();
//   });

//   if (cfg.autostart) setTimeout(openWin, 600);

//   // minimal HTML escaping for title
//   function escapeHtml(x) {
//     return String(x).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
//   }
// })();

<!-- rag-embed.js (host on your CDN) -->
(function () {
  if (window.__RAG_EMBED_LOADED__) return;
  window.__RAG_EMBED_LOADED__ = true;

  var d = document, w = window;
  var el = d.currentScript || d.getElementById("rag-chatbot");
  if (!el) return;

  // --- config ---------------------------------------------------------------
  var cfg = {
    documentKey: el.dataset.documentKey || "",
    apiBase:     el.dataset.apiEndpoint || "",
    title:       el.dataset.title || "Olleh AI Assistant",
    welcome:     el.dataset.welcomeMessage || "Hi there! How can I help today?",
    autostart:   (el.dataset.autostart || "false") === "true",
    position:    el.dataset.position || "bottom-right",
    iconSrc:     el.dataset.iconSrc || "https://olleh.ai/assets/olleh-icon.svg"
  };
  if (!cfg.documentKey || !cfg.apiBase) {
    console.warn("[RAG] Missing documentKey or apiBase");
    return;
  }

  // Resolve relative icon paths against the script’s URL
  function resolveUrlMaybeRelative(urlStr) {
    try {
      var base = new URL((d.currentScript && d.currentScript.src) || location.href);
      return new URL(urlStr, base).toString();
    } catch (_) { return urlStr; }
  }
  cfg.iconSrc = resolveUrlMaybeRelative(cfg.iconSrc);

  // --- shared styles (pulse) -----------------------------------------------
  if (!d.getElementById("olleh-mic-anim")) {
    var st = d.createElement("style");
    st.id = "olleh-mic-anim";
    st.textContent = '\
      .olleh-mic-btn{ position:fixed; }\
      .olleh-mic-btn::after{\
        content:""; position:absolute; inset:-6px; border-radius:9999px; pointer-events:none; \
        box-shadow:0 0 0 0 rgba(59,130,246,0.55); animation:ollehBeat 1.6s ease-out infinite;\
      }\
      @keyframes ollehBeat{\
        0%{transform:scale(1);   box-shadow:0 0 0 0   rgba(59,130,246,0.55);}\
        60%{transform:scale(1.08);box-shadow:0 0 0 14px rgba(59,130,246,0.0);}\
        100%{transform:scale(1); box-shadow:0 0 0 0   rgba(59,130,246,0.0);}\
      }';
    d.head.appendChild(st);
  }

  var anchors = {
    "bottom-right": { bottom: "24px", right: "24px" },
    "bottom-left":  { bottom: "24px", left:  "24px" },
    "top-right":    { top:    "24px", right: "24px" },
    "top-left":     { top:    "24px", left:  "24px" }
  };

  // --- Floating button (same as voice agent) -------------------------------
  var btn = d.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", "Open Olleh AI Assistant");
  btn.className = (btn.className ? btn.className + " " : "") + "olleh-mic-btn";
  Object.assign(btn.style, {
    position: "fixed",
    width: "56px",
    height: "56px",
    borderRadius: "9999px",
    border: "0",
    cursor: "pointer",
    background: "#ffffff",
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 120ms ease",
    zIndex: "2147483000"
  });
  Object.assign(btn.style, anchors[cfg.position] || anchors["bottom-right"]);
  btn.onpointerdown = function () { btn.style.transform = "scale(1.06) rotate(6deg)"; };
  btn.onpointerup   = function () { btn.style.transform = "scale(1)"; };
  btn.innerHTML = '<img src="'+ cfg.iconSrc +'" alt="" aria-hidden="true" style="width:35px;height:35px;display:block;pointer-events:none;" />';
  d.body.appendChild(btn);

  // Powered by caption (same positioning model as voice)
  var cap = d.createElement("div");
  cap.textContent = "Powered by Olleh AI";
  Object.assign(cap.style, {
    position: "fixed", bottom: "4px", marginBottom: "4px",
    fontSize: "10px", lineHeight: "1", color: "rgba(0,0,0,0.75)",
    userSelect: "none", pointerEvents: "none", zIndex: "2147483000"
  });
  d.body.appendChild(cap);
  function positionCaption(isOpen) {
    var b = btn.getBoundingClientRect();
    var capRect = cap.getBoundingClientRect();
    var left = b.left + b.width/2 - capRect.width/2;
    left = Math.max(8, Math.min(left, w.innerWidth - capRect.width - 8));
    cap.style.left = left + "px";
    cap.style.bottom = Math.max(4, (w.innerHeight - b.bottom - 16)) + "px";
  }

  // --- Scrim ---------------------------------------------------------------
  var scrim = d.createElement("div");
  Object.assign(scrim.style, {
    position: "fixed", inset: "0", background: "rgba(0,0,0,0.25)",
    opacity: "0", transition: "opacity 200ms ease",
    pointerEvents: "none", zIndex: "2147482999"
  });
  d.body.appendChild(scrim);

  // --- Chat window (matched look/feel) -------------------------------------
  var win = d.createElement("div");
  win.setAttribute("role", "dialog");
  win.setAttribute("aria-modal", "true");
  win.setAttribute("aria-label", "Olleh AI Assistant");
  win.tabIndex = -1;
  Object.assign(win.style, {
    position: "fixed",
    right: "16px",
    bottom: "96px",
    width: "22rem",                        // matches voice
    maxWidth: "calc(100vw - 24px)",
    background: "transparent",
    borderRadius: "16px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
    overflow: "hidden",
    transform: "translateY(24px)",
    opacity: "0",
    transition: "transform 200ms ease, opacity 200ms ease",
    zIndex: "2147483000",
    display: "flex",
    flexDirection: "column",
    maxHeight: "80vh"
  });
  // exact height parity with voice modal (header ~44px + body 65vh)
  win.style.height = "calc(65vh + 44px)";

  // Header (same gradient as voice)
  var header = d.createElement("div");
  Object.assign(header.style, {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 12px",
    background: "linear-gradient(90deg, rgb(5,120,190), rgb(7,152,228), rgb(9,180,255))",
    color: "#fff",
    borderTopLeftRadius: "16px",
    borderTopRightRadius: "16px"
  });
  var title = d.createElement("span"); title.textContent = escapeHtml(cfg.title);
  var closeBtn = d.createElement("button");
  closeBtn.type = "button"; closeBtn.setAttribute("aria-label", "Close");
  Object.assign(closeBtn.style, { padding: "6px", border: "0", background: "transparent", color: "#fff", cursor: "pointer" });
  closeBtn.innerHTML = '<svg viewBox="0 0 640 640" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M504.6 148.5C515.9 134.9 514.1 114.7 500.5 103.4C486.9 92.1 466.7 93.9 455.4 107.5L320 270L184.6 107.5C173.3 93.9 153.1 92.1 139.5 103.4C125.9 114.7 124.1 134.9 135.4 148.5L278.3 320L135.4 491.5C124.1 505.1 125.9 525.3 139.5 536.6C153.1 547.9 173.3 546.1 184.6 532.5L320 370L455.4 532.5C466.7 546.1 486.9 547.9 500.5 536.6C514.1 525.3 515.9 505.1 504.6 491.5L361.7 320L504.6 148.5z"/></svg>';
  header.appendChild(title); header.appendChild(closeBtn);

  // Body (light content against gradient header, like your chat mock)
  var body = d.createElement("div");
  Object.assign(body.style, {
    background: "#ffffff",
    display: "flex",
    flexDirection: "column",
    borderBottomLeftRadius: "16px",
    borderBottomRightRadius: "16px",
    height: "65vh",                // match voice body height
    minHeight: "0"                 // allow flex child to shrink
  });

  var msgs = d.createElement("div");
  msgs.id = "rag-chat-messages";
  Object.assign(msgs.style, {
    flex: "1", minHeight: "0",
    padding: "16px",
    overflow: "auto",
    background: "#f8f9fa"
  });

  var inputWrap = d.createElement("div");
  Object.assign(inputWrap.style, {
    display: "flex", gap: "8px",
    borderTop: "1px solid #e9ecef",
    padding: "12px", background: "#fff"
  });

  var input = d.createElement("input");
  input.id = "rag-input";
  input.placeholder = "Type your question...";
  Object.assign(input.style, {
    flex: "1", padding: "10px 12px",
    border: "1px solid #dee2e6", borderRadius: "20px", fontSize: "14px"
  });

  var sendBtn = d.createElement("button");
  sendBtn.id = "rag-send";
  sendBtn.textContent = "Send";
  Object.assign(sendBtn.style, {
    padding: "10px 14px", border: "none", borderRadius: "20px",
    color: "#fff", cursor: "pointer",
    background: "rgb(7,152,228)" // same blue as voice header
  });

  inputWrap.appendChild(input);
  inputWrap.appendChild(sendBtn);
  body.appendChild(msgs);
  body.appendChild(inputWrap);

  win.appendChild(header);
  win.appendChild(body);
  d.body.appendChild(win);

  // --- behavior ------------------------------------------------------------
  var isOpen = false;

  function escapeHtml(x){ return String(x).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
  function add(role, text){
    var row = d.createElement("div");
    row.style.cssText = "margin:10px 0;display:flex;" + (role==="user" ? "justify-content:flex-end" : "justify-content:flex-start");
    var b = d.createElement("div");
    b.textContent = text;
    b.style.cssText = "max-width:80%;padding:10px 12px;border-radius:16px;font-size:14px;line-height:1.4;" +
      (role==="user" ? "background:rgb(7,152,228);color:#fff" : "background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.1);color:#333");
    row.appendChild(b);
    msgs.appendChild(row);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function openWin(){
    if (isOpen) return;
    isOpen = true;
    scrim.style.pointerEvents = "auto"; scrim.style.opacity = "1";
    win.style.opacity = "1"; win.style.transform = "translateY(0)";
    if (!msgs.childElementCount) add("assistant", cfg.welcome);
    input.focus();
    positionCaption(true);
  }
  function closeWin(){
    if (!isOpen) return;
    isOpen = false;
    scrim.style.opacity = "0"; scrim.style.pointerEvents = "none";
    win.style.opacity = "0"; win.style.transform = "translateY(24px)";
    positionCaption(false);
  }
  btn.onclick = openWin; closeBtn.onclick = closeWin;

  // keep caption centered under FAB
  positionCaption(false);
  w.addEventListener("resize", function(){ positionCaption(isOpen); });

  // block outside click / Esc (same UX as voice)
  d.addEventListener("mousedown", function (e) {
    if (!isOpen) return;
    if (!win.contains(e.target) && !btn.contains(e.target)) {
      e.preventDefault(); e.stopPropagation();
    }
  });
  d.addEventListener("keydown", function (e) {
    if (!isOpen) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); }
  });

  // --- chat ---------------------------------------------------------------
  async function ask(q){
    add("user", q);
    var tip = d.createElement("div");
    tip.textContent = "Assistant is typing...";
    tip.style.cssText = "color:#666;font-style:italic;font-size:13px;margin:8px 0";
    msgs.appendChild(tip); msgs.scrollTop = msgs.scrollHeight;

    try {
      const res = await fetch(cfg.apiBase + "/api/document/chat/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_key: cfg.documentKey, message: q }) // no user id
      });

      if (!res.ok || !res.body) {
        tip.remove();
        add("assistant", "Sorry—something went wrong. Let’s try that again.");
        return;
      }

      tip.remove();
      add("assistant", "");
      const last = msgs.lastChild.firstChild;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const lines = acc.split("\n");
        acc = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            if (obj.token) { last.textContent += obj.token; msgs.scrollTop = msgs.scrollHeight; }
          } catch (_) {}
        }
      }
    } catch (e) {
      tip.remove();
      add("assistant", "Hmm, there was a hiccup. Mind asking that once more?");
    }
  }

  sendBtn.onclick = function(){
    var q = (input.value || "").trim();
    if (!q) return;
    input.value = "";
    ask(q);
  };
  input.addEventListener("keypress", function(e){ if (e.key === "Enter") sendBtn.click(); });

  if (cfg.autostart) {
    if (d.readyState === "complete" || d.readyState === "interactive") openWin();
    else d.addEventListener("DOMContentLoaded", openWin);
  }
})();
