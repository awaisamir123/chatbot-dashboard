// rag-embed.js  (host this on your CDN)
(function () {
  if (window.__RAG_EMBED_LOADED__) return;
  window.__RAG_EMBED_LOADED__ = true;

  var el = document.currentScript || document.getElementById("rag-chatbot");
  if (!el) return;

  var cfg = {
    documentKey: el.dataset.documentKey || "",
    apiBase: el.dataset.apiEndpoint || "",
    theme: el.dataset.theme || "gradient",
    position: el.dataset.position || "bottom-right",
    title: el.dataset.title || "Smart Assistant",
    welcome: el.dataset.welcomeMessage || "Hi there! How can I help today?",
    autostart: (el.dataset.autostart || "false") === "true",
  };

  if (!cfg.documentKey || !cfg.apiBase) {
    console.warn("[RAG] Missing documentKey or apiBase");
    return;
  }

  // simple theming
  var themes = {
    gradient: { btn: "#667eea", header: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)" },
    blue: { btn: "#2563eb", header: "#2563eb" },
    dark: { btn: "#1f2937", header: "#1f2937" },
  };
  var t = themes[cfg.theme] || themes.gradient;

  var anchors = {
    "bottom-right": { bottom: "24px", right: "24px" },
    "bottom-left": { bottom: "24px", left: "24px" },
    "top-right": { top: "24px", right: "24px" },
    "top-left": { top: "24px", left: "24px" },
  };

  // FAB
  var btn = document.createElement("button");
  btn.id = "rag-chat-btn";
  btn.textContent = "💬";
  btn.style.cssText =
    "position:fixed;width:60px;height:60px;border:none;border-radius:50%;cursor:pointer;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.2);font-size:24px;color:#fff;";
  btn.style.background = t.btn;
  Object.assign(btn.style, anchors[cfg.position] || anchors["bottom-right"]);
  document.body.appendChild(btn);

  // Window
  var win = document.createElement("div");
  win.id = "rag-chat-window";
  win.style.cssText =
    "position:fixed;width:380px;height:500px;background:#fff;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.25);z-index:9998;display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";
  Object.assign(win.style, anchors[cfg.position] || anchors["bottom-right"]);
  if (win.style.bottom)
    win.style.bottom = (parseInt(win.style.bottom) + 80) + "px";
  else
    win.style.top = (parseInt(win.style.top) + 80) + "px";

  win.innerHTML =
    '<div style="background:' + t.header + ';color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center">' +
      '<div style="font-weight:600">' + escapeHtml(cfg.title) + '</div>' +
      '<button id="rag-close" style="background:rgba(255,255,255,.2);border:none;border-radius:50%;width:28px;height:28px;color:#fff;cursor:pointer">✕</button>' +
    '</div>' +
    '<div id="rag-chat-messages" style="flex:1;padding:16px;overflow:auto;background:#f8f9fa"></div>' +
    '<div id="rag-chat-input" style="display:flex;gap:8px;border-top:1px solid #e9ecef;padding:12px;background:#fff">' +
      '<input id="rag-input" type="text" placeholder="Type your question..." style="flex:1;padding:10px 12px;border:1px solid #dee2e6;border-radius:20px;font-size:14px" />' +
      '<button id="rag-send" style="padding:10px 14px;border:none;border-radius:20px;color:#fff;cursor:pointer;background:'+t.btn+'">Send</button>' +
    '</div>';
  document.body.appendChild(win);

  var open = false;
  var msgs = document.getElementById("rag-chat-messages");
  var input = document.getElementById("rag-input");
  var sendBtn = document.getElementById("rag-send");
  var closeBtn = document.getElementById("rag-close");

  function add(role, text) {
    var row = document.createElement("div");
    row.style.cssText = "margin:10px 0;display:flex;" + (role === "user" ? "justify-content:flex-end" : "justify-content:flex-start");
    var bubble = document.createElement("div");
    bubble.textContent = text;
    bubble.style.cssText = "max-width:80%;padding:10px 12px;border-radius:16px;font-size:14px;line-height:1.4;" +
      (role === "user" ? "background:"+t.btn+";color:#fff" : "background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.1);color:#333");
    row.appendChild(bubble);
    msgs.appendChild(row);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function openWin() {
    if (open) return;
    open = true;
    win.style.display = "flex";
    if (!msgs.childElementCount) add("assistant", cfg.welcome);
    input.focus();
  }
  function closeWin() { open = false; win.style.display = "none"; }
  btn.onclick = openWin;
  closeBtn.onclick = closeWin;

  async function ask(q) {
    add("user", q);
    var typing = document.createElement("div");
    typing.textContent = "Assistant is typing...";
    typing.style.cssText = "color:#666;font-style:italic;font-size:13px;margin:8px 0";
    msgs.appendChild(typing); msgs.scrollTop = msgs.scrollHeight;

    try {
      const res = await fetch(cfg.apiBase + "/api/document/chat/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // NOTE: we do NOT send userId; server should infer or ignore
        body: JSON.stringify({ document_key: cfg.documentKey, message: q }),
      });

      if (!res.ok || !res.body) {
        typing.remove();
        add("assistant", "Sorry, I ran into an issue. Please try again.");
        return;
      }

      typing.remove();
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
            if (obj.token) {
              last.textContent += obj.token;
              msgs.scrollTop = msgs.scrollHeight;
            }
          } catch (_) {}
        }
      }
    } catch (e) {
      typing.remove();
      add("assistant", "Hmm, something went wrong. Let’s give it another try.");
    }
  }

  sendBtn.onclick = function () {
    var q = (input.value || "").trim();
    if (!q) return;
    input.value = "";
    ask(q);
  };
  input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") sendBtn.click();
  });

  if (cfg.autostart) setTimeout(openWin, 600);

  // minimal HTML escaping for title
  function escapeHtml(x) {
    return String(x).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }
})();
