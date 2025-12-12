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
  
    if (w.__OLLEH_CHAT_ACTIVE__) return;
    w.__OLLEH_CHAT_ACTIVE__ = true;
  
    var isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var hasVisualViewport = typeof window.visualViewport !== "undefined";
    var detachViewportSync = function () {};
    var lastScrollY = 0;
  
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
    modalCloseBtn.addEventListener("click", closeModal);
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
  
      var baseUrl = stripTokenParam(cfg.iframeSrc);
      fetchSessionToken(cfg.sessionEndpoint, cfg.clientToken, getSessionId())
        .then(function(tkn){ iframe.src = buildIframeUrl(baseUrl, tkn); })
        .catch(function(){ iframe.src = buildIframeUrl(cfg.iframeSrc, ""); });
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
      // reset iframe so previous chat doesn't flash next time
      iframe.src = "about:blank";
      modalCloseBtn.style.display = "none";
    }
  
    function toggleModal() { 
      isOpen ? closeModal() : openModal(); 
    }
    
    btn.onclick = toggleModal;
    // Listen for postMessage from iframe to close widget
    function handleMessage(event) {
      if (!event || !event.data) return;
      if (event.data.type === "olleh-close-widget") {
        closeModal();
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
  })();