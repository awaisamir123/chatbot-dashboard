(function () {
  var d = document, w = window;
  var script = d.currentScript || (function () { var s = d.getElementsByTagName('script'); return s[s.length - 1]; })();

  var cfg = {
    iframeSrc: script?.dataset.ollehIframeSrc || "",
    autostart: String(script?.dataset.ollehAutostart || "false") === "true",
    allow: script?.dataset.ollehAllow || "microphone; camera; autoplay",
    sandbox: script?.dataset.ollehSandbox || "allow-scripts allow-forms allow-same-origin allow-presentation",
    iconSaurce: script?.dataset.ollehIconSource || "https://olleh.ai/assets/olleh-icon.svg",

    // client token and endpoint for session token
    clientToken: script?.dataset.ollehClientToken || script?.dataset.ollehToken || "",
    sessionEndpoint: script?.dataset.ollehSessionEndpoint || "https://api.olleh.ai/user/session-token"
  };

  if (w.__OLLEH_EMBED_ACTIVE__) return;
  w.__OLLEH_EMBED_ACTIVE__ = true;

  var listeners = { open: [], close: [] };
  function on(evt, cb) { if (listeners[evt]) listeners[evt].push(cb); }
  function emit(evt) { (listeners[evt] || []).forEach(function (cb) { try { cb(); } catch (e) { } }); }

  var api = { open: openModal, close: closeModal, toggle: toggleModal, on: on };
  w.OllehAIQueue = w.OllehAIQueue || [];
  w.OllehAI = api;
  w.OllehAIQueue.forEach(function (fn) { try { fn(api); } catch (e) { } });
  w.OllehAIQueue.push = function (fn) { try { fn(api); } catch (e) { } };

  // floating button
  var btn = d.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Open Olleh AI Assistant');
  Object.assign(btn.style, {
    position: 'fixed', right: '24px', bottom: '24px', width: '56px', height: '56px',
    borderRadius: '9999px', background: '#ffffff', border: '0', cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 120ms ease',
    zIndex: '2147483000'
  });
  btn.onpointerdown = function () { btn.style.transform = 'scale(1.06) rotate(6deg)'; };
  btn.onpointerup = function () { btn.style.transform = 'scale(1)'; };
  btn.onclick = toggleModal;

  // icon from same repo or attribute
  var base = new URL(script.src, location.href);
  base.pathname = base.pathname.replace(/[^/]+$/, "");
  var iconUrl = script?.dataset.ollehIconSource
    || cfg.iconSaurce
    || new URL("olleh-mic.svg", base).href;
  btn.innerHTML = '<img src="' + iconUrl + '" alt="" aria-hidden="true" style="width:35px;height:35px;display:block;pointer-events:none;" />';
  btn.className = (btn.className ? btn.className + ' ' : '') + 'olleh-mic-btn';

  // beat animation styles
  if (!d.getElementById('olleh-mic-anim')) {
    var st = d.createElement('style');
    st.id = 'olleh-mic-anim';
    st.textContent = '\
      .olleh-mic-btn{ position:fixed; }\
      .olleh-mic-btn::after{\
        content:"";\
        position:absolute;\
        inset:-6px;\
        border-radius:9999px;\
        pointer-events:none;\
        box-shadow:0 0 0 0 rgba(59,130,246,0.55);\
        animation:ollehBeat 1.6s ease-out infinite;\
      }\
      @keyframes ollehBeat{\
        0%   { transform:scale(1);    box-shadow:0 0 0 0   rgba(59,130,246,0.55); }\
        60%  { transform:scale(1.08); box-shadow:0 0 0 14px rgba(59,130,246,0.00); }\
        100% { transform:scale(1);    box-shadow:0 0 0 0   rgba(59,130,246,0.00); }\
      }';
    d.head.appendChild(st);
  }

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

  // scrim
  var scrim = d.createElement('div');
  Object.assign(scrim.style, {
    position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.25)', opacity: '0',
    transition: 'opacity 200ms ease', pointerEvents: 'none', zIndex: '2147482999'
  });
  d.body.appendChild(scrim);

  // modal
  var modal = d.createElement('div');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Olleh AI Assistant');
  modal.tabIndex = -1;
  Object.assign(modal.style, {
    position: 'fixed', right: '16px', bottom: '96px', width: '22rem', maxWidth: 'calc(100vw - 24px)',
    maxHeight: '80vh',
    background: 'transparent',
    borderRadius: '16px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
    border: '0',
    overflow: 'hidden',
    transform: 'translateY(24px)', opacity: '0',
    transition: 'transform 200ms ease, opacity 200ms ease', zIndex: '2147483000',
    pointerEvents: 'none',
    display: 'none'
  });
  d.body.appendChild(modal);

  // header
  var header = d.createElement('div');
  Object.assign(header.style, {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 12px', background: 'linear-gradient(90deg, rgb(5,120,190),rgb(7,152,228),rgb(9,180,255) )', color: '#fff',
    borderTopLeftRadius: '16px', borderTopRightRadius: '16px'
  });
  var title = d.createElement('span'); title.textContent = 'Olleh AI Assistant';
  var closeBtn = d.createElement('button'); closeBtn.type = 'button'; closeBtn.setAttribute('aria-label', 'Close');
  Object.assign(closeBtn.style, { padding: '6px', border: '0', background: 'transparent', color: '#fff', cursor: 'pointer' });
  closeBtn.innerHTML = '<svg viewBox="0 0 640 640" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M504.6 148.5C515.9 134.9 514.1 114.7 500.5 103.4C486.9 92.1 466.7 93.9 455.4 107.5L320 270L184.6 107.5C173.3 93.9 153.1 92.1 139.5 103.4C125.9 114.7 124.1 134.9 135.4 148.5L278.3 320L135.4 491.5C124.1 505.1 125.9 525.3 139.5 536.6C153.1 547.9 173.3 546.1 184.6 532.5L320 370L455.4 532.5C466.7 546.1 486.9 547.9 500.5 536.6C514.1 525.3 515.9 505.1 504.6 491.5L361.7 320L504.6 148.5z"/></svg>';
  closeBtn.onclick = closeModal;
  header.appendChild(title); header.appendChild(closeBtn); modal.appendChild(header);

  // body with iframe
  var frameWrap = d.createElement('div');
  Object.assign(frameWrap.style, {
    position: 'relative', width: '100%', height: '65vh', maxHeight: 'calc(80vh - 44px)',
    overflow: 'hidden',
    borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px',
    background: 'transparent'
  });
  modal.appendChild(frameWrap);

  var iframe = d.createElement('iframe');
  iframe.title = 'Olleh AI';
  Object.assign(iframe.style, {
    position: 'absolute',
    top: '-8px', left: '-8px',
    width: 'calc(100% + 16px)',
    height: 'calc(100% + 16px)',
    border: '0',
    display: 'block'
  });
  iframe.allow = cfg.allow;
  iframe.sandbox = cfg.sandbox;
  frameWrap.appendChild(iframe);

  var isOpen = false, lastActive = null;

  // session helpers
  function getSessionId(){
    try{
      var key = "olleh_ai_session_id";
      var sid = sessionStorage.getItem(key);
      if (!sid) {
        sid = (w.crypto && crypto.randomUUID) ? crypto.randomUUID()
             : 'sid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
        sessionStorage.setItem(key, sid);
      }
      return sid;
    }catch(e){
      return 'sid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }
  }

  function stripTokenParam(urlStr){
    try{
      if(!urlStr) return "";
      var u = new URL(urlStr, location.href);
      u.searchParams.delete('token');
      return u.origin + u.pathname + (u.search ? u.search : "");
    }catch(e){
      return urlStr;
    }
  }

  function buildIframeUrl(baseUrl, token){
    try{
      var u = new URL(baseUrl || "https://olleh.ai/demo", location.href);
      if (token) u.searchParams.set('token', token);
      return u.toString();
    }catch(e){
      if (!baseUrl) return "https://olleh.ai/demo?token=" + encodeURIComponent(token || "");
      var joiner = baseUrl.indexOf('?') > -1 ? '&' : '?';
      return baseUrl + joiner + 'token=' + encodeURIComponent(token || "");
    }
  }

function fetchSessionToken(endpoint, clientToken, sessionId){
  return new Promise(function(resolve, reject){
    if(!endpoint || !clientToken){
      return reject(new Error('missing endpoint or client token'));
    }

    var payload = {
      token: clientToken,
      session_id: sessionId,
      origin: location.origin || ''
    };

    var forceForm = String(script?.dataset.ollehSessionFormat || "").toLowerCase() === "form";

    function postJson(){
      return fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', "allow-origin": location.origin || "" },
        body: JSON.stringify(payload)
      });
    }
    function postForm(){
      return fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(payload)
      });
    }
    function handle(r){
      if(!r.ok){
        return r.text().then(function(t){
          throw new Error('http ' + r.status + ', ' + t);
        });
      }
      return r.json().then(function(j){
        var t = j && j.data && j.data.token;  // your shape
        if(!t) throw new Error('no token in response');
        return String(t);
      });
    }

    // try JSON first unless forced to form
    var first = forceForm ? postForm() : postJson();

    first.then(handle)
      .then(resolve)
      .catch(function(err){
        // if JSON failed, try form once, this can avoid preflight on some setups
        if(!forceForm){
          postForm().then(handle).then(resolve).catch(function(err2){
            reject(err2);
          });
        }else{
          reject(err);
        }
      });
  });
}


  function openModal() {
    if (isOpen) return;
    isOpen = true;
    lastActive = d.activeElement;
    btn.setAttribute('aria-label', 'Close Olleh AI Assistant');
    scrim.style.pointerEvents = 'auto'; scrim.style.opacity = '1';
    modal.style.display = 'block';
    modal.style.pointerEvents = 'auto';
    requestAnimationFrame(function(){
      modal.style.opacity = '1';
      modal.style.transform = 'translateY(0)';
    });
    d.body.style.overflow = 'hidden';

    var baseUrl = stripTokenParam(cfg.iframeSrc) || "https://olleh.ai/demo";
    var sid = getSessionId();

    fetchSessionToken(cfg.sessionEndpoint, cfg.clientToken, sid)
      .then(function(tkn){
        iframe.src = buildIframeUrl(baseUrl, tkn);
      })
      .catch(function(err){
        console.warn('olleh session-token error', err && err.message ? err.message : err);
        iframe.src = cfg.iframeSrc ? cfg.iframeSrc : buildIframeUrl(baseUrl, "");
      });

    focusLater(modal);
    emit('open');
    positionCaption();
  }

  function closeModal() {
    if (!isOpen) return;
    isOpen = false;
    btn.setAttribute('aria-label', 'Open Olleh AI Assistant');
    scrim.style.opacity = '0'; scrim.style.pointerEvents = 'none';
    modal.style.opacity = '0'; modal.style.transform = 'translateY(24px)';
    modal.style.pointerEvents = 'none';
    d.body.style.overflow = '';
    try { lastActive && lastActive.focus && lastActive.focus(); } catch (e) { }
    emit('close');
    positionCaption();
    setTimeout(function(){
      if (!isOpen) modal.style.display = 'none';
    }, 200);
  }

  function toggleModal() { isOpen ? closeModal() : openModal(); }
  function focusLater(el) { setTimeout(function () { try { el.focus(); } catch (e) { } }, 0); }

  // outside click blocked
  d.addEventListener('mousedown', function (e) {
    if (!isOpen) return;
    if (!modal.contains(e.target) && !btn.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  // Esc blocked
  d.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  if (cfg.autostart) {
    if (d.readyState === 'complete' || d.readyState === 'interactive') openModal();
    else d.addEventListener('DOMContentLoaded', openModal);
  }
})();