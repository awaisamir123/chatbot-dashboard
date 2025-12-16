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
    primaryColor: script?.dataset.primaryColor || "#4f46e5",
    secondaryColor: script?.dataset.secondaryColor || "#f4f6fb",
      iconSource: script?.dataset.iconSource || "https://olleh.ai/assets/call-start-removebg-preview.png",
      buttonPosition: script?.dataset.buttonPosition || "bottom-right"
    };
  
    // Delete-room API configuration (kept local, not in cfg)
    var DELETE_ROOM_ENDPOINT = "https://pyapi.olleh.ai/delete_room";
    var DELETE_ROOM_TOKEN = "64Ebc56f62Bb33bd6eeb46b43cC49e44f2e5715A988E50d2f3675CFF3Fb1";
    var lastUserId = null;
    var hadConnected = false;
  
    if (w.__OLLEH_CHAT_ACTIVE__) return;
    w.__OLLEH_CHAT_ACTIVE__ = true;
  
    var isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var hasVisualViewport = typeof window.visualViewport !== "undefined";
    var detachViewportSync = function () {};
    var lastScrollY = 0;
  
    var WAIT_MS = 15000; // 30s gate when fully closing the chat
    var waitTimerId = null;
    var waitOverlay = null;
    var waitCountdown = null;
    var waitingForGate = false;
    var waitSpinner = null;
    var waitIntervalId = null;
    var FIRST_OPEN_KEY = "olleh_first_open_at";
    var confirmOverlay = null;
    function logDebug(msg, extra) {
      try { console.log("[OllehChat][wait]", msg, extra || ""); } catch (e) {}
    }
  
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
  
    function deleteRoomOnClose() {
      if (!hadConnected || !lastUserId) {
        logDebug("delete_room skipped (no connection/user yet)");
        return;
      }
      try {
        var sessionId = getSessionId() || null;
        var payload = { user_id: lastUserId || null, session_id: sessionId || null };
        fetch(DELETE_ROOM_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Api-Token": DELETE_ROOM_TOKEN
          },
          body: JSON.stringify(payload)
        })
          .then(function(res){ logDebug("delete_room status", res.status); })
          .catch(function(err){ logDebug("delete_room error", err); });
      } catch (e) {
        logDebug("delete_room failed", e);
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
        var payload = { token: clientToken, session_id: sessionId, origin: "https://olleh.ai"};
  
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
  
    // Position helpers
    function getButtonPosition() {
      var pos = cfg.buttonPosition.toLowerCase();
      if (pos === "bottom-left") return { left: "24px", bottom: "24px", right: "auto", top: "auto" };
      if (pos === "top-right") return { right: "24px", top: "24px", left: "auto", bottom: "auto" };
      if (pos === "top-left") return { left: "24px", top: "24px", right: "auto", bottom: "auto" };
      return { right: "24px", bottom: "24px", left: "auto", top: "auto" };
    }
  
    function getModalPosition() {
      var pos = cfg.buttonPosition.toLowerCase();
      // Position modal so it doesn't overlap the button
      if (pos === "bottom-left") return { left: "24px", bottom: "100px", right: "auto", top: "auto" };
      if (pos === "top-right") return { right: "24px", top: "100px", left: "auto", bottom: "auto" };
      if (pos === "top-left") return { left: "24px", top: "100px", right: "auto", bottom: "auto" };
      return { right: "24px", bottom: "100px", left: "auto", top: "auto" }; // bottom-right
    }
  
    // -------------------------
    // Floating button
    // -------------------------
    var btn = d.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", "Open Olleh AI Assistant");
    var iconUrl = cfg.iconSource;
    btn.innerHTML = '<img src="' + iconUrl + '" alt="" style="width:35px;height:35px;pointer-events:none;display:block;" />';
  
    Object.assign(btn.style, {
      position: "fixed",
      width: "56px",
      height: "56px",
      borderRadius: "9999px",
      background: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "none",
      cursor: "pointer",
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      zIndex: "2147483000",
    });
    Object.assign(btn.style, getButtonPosition());
  
    // Beat animation
    if (!d.getElementById("olleh-mic-anim")) {
      var st = d.createElement("style");
      st.id = "olleh-mic-anim";
      st.textContent = '\
        .olleh-mic-btn::after{\
          content:""; position:absolute; inset:-6px; border-radius:9999px;\
          pointer-events:none; box-shadow:0 0 0 0 rgba(59,130,246,0.55);\
          animation:ollehBeat 1.6s ease-out infinite;\
        }\
        @keyframes ollehBeat{\
          0% { transform:scale(1); box-shadow:0 0 0 0 rgba(59,130,246,0.55); }\
          60% { transform:scale(1.08); box-shadow:0 0 0 14px rgba(59,130,246,0.00); }\
          100% { transform:scale(1); box-shadow:0 0 0 0 rgba(59,130,246,0.00); }\
        }';
      d.head.appendChild(st);
    }
    btn.className += " olleh-mic-btn";
    btn.onpointerdown = function() { btn.style.transform = "scale(1.05)"; };
    btn.onpointerup = function() { btn.style.transform = "scale(1)"; };
    d.body.appendChild(btn);
  
    // caption under the mic
    var cap = d.createElement('div');
    cap.textContent = 'Powered by Olleh AI';
    Object.assign(cap.style, {
      position: 'fixed',
      bottom: '4px',
      marginBottom: '4px',
      fontSize: '10px',
      lineHeight: '1',
      color: 'rgba(0,0,0,0.75)',
      userSelect: 'none',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      zIndex: '2147483000'
    });
    d.body.appendChild(cap);
  
    function positionCaption(){
      var b = btn.getBoundingClientRect();
      var capRect = cap.getBoundingClientRect();
  
      var left = b.left + b.width / 2 - capRect.width / 2;
      left = Math.max(8, Math.min(left, w.innerWidth - capRect.width - 8));
      cap.style.left = left + 'px';
  
      if (isOpen) {
        var gap = 16;
        cap.style.bottom = Math.max(4, (w.innerHeight - b.bottom - gap)) + 'px'; // fixed var name
      } else {
        var offsetDown = 16;
        cap.style.bottom = Math.max(4, (w.innerHeight - b.bottom - offsetDown)) + 'px';
      }
    }
  
    positionCaption();
    w.addEventListener('resize', positionCaption);
  
    var scrim = d.createElement('div');
    Object.assign(scrim.style, {
      position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.25)', opacity: '0',
      transition: 'opacity 200ms ease', pointerEvents: 'none', zIndex: '2147482999'
    });
    d.body.appendChild(scrim);
  
  
    // -------------------------
    // Modal with iframe
    // -------------------------
    var modal = d.createElement("div");
    Object.assign(modal.style, {
      position: "fixed",
      width: "380px",
      maxWidth: "calc(100vw - 32px)",
      height: "80vh",
      maxHeight: "650px",
      background: "#fff",
      borderRadius: "14px",
      overflow: "hidden",
      boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
      zIndex: "2147483646", // below button
      transform: "translateY(20px)",
      opacity: "0",
      transition: "all 200ms ease",
      display: "flex",
      flexDirection: "column",
      padding: "0",
      margin: "0",
      display: "none"
    });
    Object.assign(modal.style, getModalPosition());
    d.body.appendChild(modal);
  
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
    // wait overlay to enforce 30s gating
    waitOverlay = d.createElement("div");
    Object.assign(waitOverlay.style, {
      position: "absolute",
      inset: "0",
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(4px)",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      zIndex: "2147483647",
      textAlign: "center",
      padding: "16px",
      gap: "8px",
      color: "#111827",
      fontFamily: "Inter, sans-serif",
      pointerEvents: "auto"
    });
    var waitTitle = d.createElement("div");
    // waitTitle.textContent = "Preparing your chat...";
    waitTitle.style.fontSize = "20px";
    waitTitle.style.fontWeight = "700";
    waitCountdown = d.createElement("div");
    waitCountdown.textContent = "Please wait a while...";
    waitCountdown.style.fontSize = "18px";
    waitCountdown.style.fontWeight = "500";
    waitCountdown.style.color = "#4f46e5";
    var waitHint = d.createElement("div");
    // waitHint.textContent = "We’re getting an agent ready for you.";
    waitHint.style.fontSize = "12px";
    waitHint.style.color = "#4b5563";
    waitSpinner = d.createElement("div");
    Object.assign(waitSpinner.style, {
      width: "34px",
      height: "34px",
      borderRadius: "9999px",
      border: "3px solid #e5e7eb",
      borderTopColor: "#4f46e5",
      animation: "olleh-wait-spin 1s linear infinite",
      marginTop: "6px",
      marginBottom: "6px"
    });
    // spinner keyframes
    if (!d.getElementById("olleh-wait-spin-style")) {
      var spinStyle = d.createElement("style");
      spinStyle.id = "olleh-wait-spin-style";
      spinStyle.textContent = "@keyframes olleh-wait-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }";
      d.head.appendChild(spinStyle);
    }
    waitOverlay.appendChild(waitTitle);
    waitOverlay.appendChild(waitSpinner);
    waitOverlay.appendChild(waitCountdown);
    waitOverlay.appendChild(waitHint);
    modal.appendChild(waitOverlay);
  
    // Close confirmation overlay (minimize vs close)
    confirmOverlay = d.createElement("div");
    Object.assign(confirmOverlay.style, {
      position: "absolute",
      inset: "0",
      background: "rgba(0,0,0,0.35)",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      zIndex: "2147483650",
      padding: "16px"
    });
    var confirmBox = d.createElement("div");
    Object.assign(confirmBox.style, {
      width: "100%",
      maxWidth: "340px",
      background: "#fff",
      borderRadius: "14px",
      boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
      padding: "18px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      fontFamily: "Inter, sans-serif",
      textAlign: "center"
    });
    var confirmTitle = d.createElement("div");
    confirmTitle.textContent = "What would you like to do?";
    confirmTitle.style.fontSize = "16px";
    confirmTitle.style.fontWeight = "700";
    confirmTitle.style.color = "#111827";
    var confirmDesc = d.createElement("div");
    confirmDesc.textContent = "You can minimize to keep this chat session alive, or close to end it.";
    confirmDesc.style.fontSize = "13px";
    confirmDesc.style.color = "#4b5563";
    confirmDesc.style.lineHeight = "1.5";
    var confirmActions = d.createElement("div");
    Object.assign(confirmActions.style, {
      display: "flex",
      gap: "10px",
      marginTop: "4px"
    });
    var minimizeBtn = d.createElement("button");
    minimizeBtn.type = "button";
    minimizeBtn.textContent = "Minimize";
    Object.assign(minimizeBtn.style, {
      flex: "1",
      padding: "10px 12px",
      borderRadius: "10px",
      border: "1px solid #e5e7eb",
      background: "#f9fafb",
      color: "#111827",
      fontWeight: "600",
      cursor: "pointer"
    });
    var closeBtn = d.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "Close chat";
    Object.assign(closeBtn.style, {
      flex: "1",
      padding: "10px 12px",
      borderRadius: "10px",
      border: "none",
      background: "#ef4444",
      color: "#fff",
      fontWeight: "700",
      cursor: "pointer",
      boxShadow: "0 12px 24px rgba(239,68,68,0.25)"
    });
    confirmActions.appendChild(minimizeBtn);
    confirmActions.appendChild(closeBtn);
    confirmTitle.className = "olleh-confirm-title";
    confirmDesc.className = "olleh-confirm-desc";
    minimizeBtn.className = "olleh-confirm-btn";
    closeBtn.className = "olleh-confirm-btn";
    confirmBox.className = "olleh-confirm-box";
    confirmBox.appendChild(confirmTitle);
    confirmBox.appendChild(confirmDesc);
    confirmBox.appendChild(confirmActions);
    confirmOverlay.appendChild(confirmBox);
    modal.appendChild(confirmOverlay);
    if (!d.getElementById("olleh-confirm-style")) {
      var confirmStyle = d.createElement("style");
      confirmStyle.id = "olleh-confirm-style";
      confirmStyle.textContent = "\
        @media (max-width: 480px) {\
          .olleh-confirm-box{max-width:260px;padding:14px;border-radius:12px;}\
          .olleh-confirm-title{font-size:14px;}\
          .olleh-confirm-desc{font-size:12px;}\
          .olleh-confirm-btn{padding:8px 10px;font-size:13px;border-radius:9px;}\
        }";
      d.head.appendChild(confirmStyle);
    }
  
    function handleMinimize() {
      hideClosePrompt();
      closeModal();
    }
  
    function handleCloseChat() {
      hideClosePrompt();
      deleteRoomOnClose();
      try {
        iframe.contentWindow && iframe.contentWindow.postMessage({ type: "olleh-force-disconnect" }, "*");
      } catch (e) {
        logDebug("Failed to request iframe disconnect", e);
      }
      // If iframe was loaded (not about:blank), set wait anchor immediately
      if (iframe && iframe.src && iframe.src !== "about:blank") {
        var now = Date.now();
        setFirstOpenAt(now);
        setStoredWaitUntil(now + WAIT_MS);
      }
  
      // Wait for iframe to acknowledge disconnect before blanking src
      function ackHandler(evt) {
        if (!evt || !evt.data) return;
        if (evt.data.type === "olleh-disconnect-done") {
          if (evt.data.hadRoom) {
            var now = Date.now();
            setFirstOpenAt(now);
            setStoredWaitUntil(now + WAIT_MS);
          }
          try { iframe.src = "about:blank"; } catch (e) {}
          closeModal();
          w.removeEventListener("message", ackHandler);
        }
      }
      w.addEventListener("message", ackHandler);
  
      // Fallback: if no ack arrives, still blank after 1s to avoid getting stuck
      setTimeout(function(){
        try { iframe.src = "about:blank"; } catch (e) {}
        closeModal();
        w.removeEventListener("message", ackHandler);
      }, 1000);
    }
  
    minimizeBtn.addEventListener("click", handleMinimize);
    closeBtn.addEventListener("click", handleCloseChat);
  
    // floating close button inside modal
    var modalCloseBtn = d.createElement("button");
    modalCloseBtn.type = "button";
    modalCloseBtn.setAttribute("aria-label", "Close chat widget");
    modalCloseBtn.textContent = "×";
    Object.assign(modalCloseBtn.style, {
      position: "absolute",
      top: "14px",
      right: "12px",
      width: "32px",
      height: "32px",
      borderRadius: "9999px",
      border: "none",
      cursor: "pointer",
      background: "rgba(255,255,255,0.9)",
      color: "#333",
      fontSize: "18px",
      lineHeight: "1",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
      display: "none"
    });
    modalCloseBtn.addEventListener("mouseenter", function(){
      modalCloseBtn.style.background = "rgba(255,255,255,0.75)";
    });
    modalCloseBtn.addEventListener("mouseleave", function(){
      modalCloseBtn.style.background = "rgba(255,255,255,0.9)";
    });
    modalCloseBtn.addEventListener("click", showClosePrompt);
    modal.appendChild(modalCloseBtn);
  
    var isOpen = false;
  
    function lockBodyScroll() {
      lastScrollY = window.scrollY || 0;
      d.body.dataset.prevOverflow = d.body.style.overflow || "";
      d.body.dataset.prevPosition = d.body.style.position || "";
      d.body.dataset.prevTop = d.body.style.top || "";
      d.body.dataset.prevWidth = d.body.style.width || "";
      d.body.style.position = "fixed";
      d.body.style.top = -lastScrollY + "px";
      d.body.style.width = "100%";
      d.body.style.overflow = "hidden";
    }
  
    function unlockBodyScroll() {
      d.body.style.position = d.body.dataset.prevPosition || "";
      d.body.style.top = d.body.dataset.prevTop || "";
      d.body.style.width = d.body.dataset.prevWidth || "";
      d.body.style.overflow = d.body.dataset.prevOverflow || "";
      window.scrollTo(0, lastScrollY || 0);
    }
  
    function enableViewportSync() {
      if (!hasVisualViewport) return;
      var handler = function () {
        if (!isOpen) return;
        var vv = window.visualViewport;
        modal.style.width = vv.width + "px";
        modal.style.height = vv.height + "px";
        modal.style.left = vv.offsetLeft + "px";
        modal.style.top = vv.offsetTop + "px";
        modal.style.right = "";
        modal.style.bottom = "";
      };
      handler();
      window.visualViewport.addEventListener("resize", handler);
      window.visualViewport.addEventListener("scroll", handler);
      detachViewportSync = function () {
        window.visualViewport.removeEventListener("resize", handler);
        window.visualViewport.removeEventListener("scroll", handler);
        detachViewportSync = function(){};
      };
    }
  
    function getStoredWaitUntil() {
      try {
        return parseInt(localStorage.getItem("olleh_wait_until") || "0", 10) || 0;
      } catch (e) {
        return 0;
      }
    }
  
    function setStoredWaitUntil(ts) {
      try {
        localStorage.setItem("olleh_wait_until", String(ts));
      } catch (e) {}
    }
  
    function getFirstOpenAt() {
      try {
        return parseInt(localStorage.getItem(FIRST_OPEN_KEY) || "0", 10) || 0;
      } catch (e) {
        return 0;
      }
    }
  
    function setFirstOpenAt(ts) {
      try {
        localStorage.setItem(FIRST_OPEN_KEY, String(ts));
      } catch (e) {}
    }
  
    function clearFirstOpenAt() {
      try {
        localStorage.removeItem(FIRST_OPEN_KEY);
      } catch (e) {}
    }
  
    function clearWaitData() {
      try {
        localStorage.removeItem("olleh_wait_until");
      } catch (e) {}
    }
  
    function markParentWaitDone() {
      try {
        localStorage.setItem("olleh_parent_wait_done_at", String(Date.now()));
      } catch (e) {}
    }
  
    function getRemainingWaitMs() {
      return getEffectiveRemainingMs();
    }
  
    // On a totally fresh browser/session (no anchor), ensure no stale wait is applied
    if (!getFirstOpenAt()) {
      clearWaitData();
    }
  
    function getEffectiveRemainingMs(now) {
      var nowTs = now || Date.now();
      var storedUntil = getStoredWaitUntil();
      if (storedUntil > nowTs) return storedUntil - nowTs;
      var first = getFirstOpenAt();
      if (!first) return 0;
      var until = first + WAIT_MS;
      var rem = until - nowTs;
      return rem > 0 ? rem : 0;
    }
  
    function clearWaitInterval() {
      if (waitIntervalId) {
        clearInterval(waitIntervalId);
        waitIntervalId = null;
      }
    }
  
    function clearWaitTimer() {
      if (waitTimerId) {
        clearInterval(waitTimerId);
        waitTimerId = null;
      }
      clearWaitInterval();
      waitingForGate = false;
      waitOverlay.style.display = "none";
      // restore iframe visibility once waiting is done/cancelled
      try {
        iframe.style.opacity = "1";
        iframe.style.pointerEvents = "auto";
      } catch (e) {}
    }
  
    function showWaitOverlay() {
      try {
        logDebug("Show wait overlay");
        waitOverlay.style.display = "flex";
        iframe.style.opacity = "0";
        iframe.style.pointerEvents = "none";
      } catch (e) {}
    }
  
    function startWaitCountdown(onDone, waitUntilOverride) {
      var now = Date.now();
      var storedUntil = getStoredWaitUntil();
      var waitUntil = waitUntilOverride || (storedUntil > now ? storedUntil : now + WAIT_MS);
      logDebug("Starting wait countdown", { now, storedUntil, waitUntil });
      if (waitUntil !== storedUntil) setStoredWaitUntil(waitUntil);
  
      function updateCountdown() {
        var remaining = waitUntil - Date.now();
        if (remaining <= 0) {
          waitCountdown.textContent = "Ready!";
          // Clear stored wait so child iframe doesn't also show a second wait
          clearWaitData();
          markParentWaitDone();
          clearWaitTimer();
          logDebug("Wait completed, proceeding to load iframe");
          onDone();
          return;
        }
        var secs = Math.ceil(remaining / 1000);
      // waitCountdown.textContent = "Connecting in " + secs + "s";
      waitCountdown.textContent = "Connecting to the agent...";
        logDebug("Wait tick", { remaining, secs });
      }
  
      waitingForGate = true;
      showWaitOverlay();
      updateCountdown();
      clearWaitInterval();
      waitIntervalId = setInterval(updateCountdown, 500);
    }
  
    function loadIframe() {
      logDebug("Loading iframe");
      var baseUrl = stripTokenParam(cfg.iframeSrc);
      fetchSessionToken(cfg.sessionEndpoint, cfg.clientToken, getSessionId())
        .then(function(tkn){ iframe.src = buildIframeUrl(baseUrl, tkn); })
        .catch(function(err){
          logDebug("Token fetch failed, fallback load", err);
          iframe.src = buildIframeUrl(cfg.iframeSrc, "");
        });
    }
  
    function openModal() {
      if (isOpen) return;
      isOpen = true;
      lastActive = d.activeElement;
      btn.setAttribute('aria-label', 'Close Olleh AI Assistant');
      scrim.style.pointerEvents = 'auto'; scrim.style.opacity = '1';
      modal.style.display = "flex";
      modal.style.opacity = '1'; modal.style.transform = 'translateY(0)';
      lockBodyScroll();
      if (isiOS) {
        enableViewportSync();
      }
      modalCloseBtn.style.display = "flex";
      try {
        document.documentElement.classList.add("olleh-open");
      } catch (e) {}
  
      // If iframe already loaded (existing session), skip wait and just show it
      if (iframe && iframe.src && iframe.src !== "about:blank") {
        waitOverlay.style.display = "none";
        iframe.style.opacity = "1";
        iframe.style.pointerEvents = "auto";
        try {
          iframe.contentWindow && iframe.contentWindow.postMessage({ type: "olleh-scroll-latest" }, "*");
        } catch (e) {
          logDebug("Failed to request scroll-latest from iframe", e);
        }
        return;
      }
  
      var now = Date.now();
      var remaining = getEffectiveRemainingMs(now);
      if (remaining > 0) {
        showWaitOverlay();
        startWaitCountdown(function(){
          loadIframe();
        }, now + remaining);
        return;
      }
      waitOverlay.style.display = "none";
      iframe.style.opacity = "1";
      iframe.style.pointerEvents = "auto";
      loadIframe();
    }
  
    function closeModal() {
      if (!isOpen) return;
      isOpen = false;
      modal.style.opacity = "0";
      modal.style.transform = "translateY(20px)";
      cap.style.opacity = "0.7";
      scrim.style.opacity = "0";
      scrim.style.pointerEvents = "none";
      detachViewportSync();
      unlockBodyScroll();
      btn.setAttribute('aria-label', 'Open Olleh AI Assistant');
      try {
        document.documentElement.classList.remove("olleh-open");
      } catch (e) {}
      setTimeout(function(){
        modal.style.display = "none";
        var pos = getModalPosition();
        modal.style.left = pos.left || modal.style.left;
        modal.style.top = pos.top || modal.style.top;
        modal.style.right = pos.right || modal.style.right;
        modal.style.bottom = pos.bottom || modal.style.bottom;
      }, 200);
      modalCloseBtn.style.display = "none";
    }
  
    function showClosePrompt() {
      confirmOverlay.style.display = "flex";
    }
  
    function hideClosePrompt() {
      confirmOverlay.style.display = "none";
    }
  
    function toggleModal() { 
      isOpen ? closeModal() : openModal(); 
    }
    
    btn.onclick = toggleModal;
    // Listen for postMessage from iframe to close widget
    function handleMessage(event) {
      if (!event || !event.data) return;
      if (event.data.type === "olleh-close-widget") {
        showClosePrompt();
        return;
      }
      if (event.data.type === "olleh-user-context") {
        try {
          if (event.data.userId) {
            lastUserId = Number(event.data.userId);
          }
          if (event.data.hadRoom) {
            hadConnected = true;
          }
        } catch (e) {
          logDebug("Failed to capture user context", e);
        }
        return;
      }
      if (event.data.type === "olleh-delete-room") {
        try {
          if (event.data.userId) {
            lastUserId = Number(event.data.userId);
          }
        } catch (e) {
          logDebug("Failed to capture delete-room payload", e);
        }
        deleteRoomOnClose();
        return;
      }
      if (event.data.type === "olleh-check-wait") {
        var rem = getRemainingWaitMs();
        logDebug("Iframe asked for wait status", { remainingMs: rem });
        try {
          event.source && event.source.postMessage({ type: "olleh-wait-status", remainingMs: rem }, "*");
        } catch (e) {
          logDebug("Failed to post wait status", e);
        }
      }
    }
    window.addEventListener("message", handleMessage);
  
    // Handle responsive
    function handleResize() {
      positionCaption();
      
      if (w.innerWidth < 768 && !isOpen) {
        // Full screen on mobile
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
        // Desktop/tablet
        modal.style.width = "380px";
        modal.style.height = "80vh";
        modal.style.maxWidth = "calc(100vw - 32px)";
        modal.style.maxHeight = "650px";
        modal.style.borderRadius = "14px";
        Object.assign(modal.style, getModalPosition());
      }
    }
  
    w.addEventListener("resize", handleResize);
    handleResize();
  
    // On page unload, best-effort delete room if we ever connected
    w.addEventListener("beforeunload", function(){
      try { deleteRoomOnClose(); } catch (e) { logDebug("delete_room on unload failed", e); }
    });
  })();