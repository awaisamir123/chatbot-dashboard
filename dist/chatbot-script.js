(function () {
  var d = document, w = window;
  var script = d.currentScript || (function () { 
    var s = d.getElementsByTagName('script'); 
    return s[s.length - 1]; 
  })();

  // Get configuration from script data attributes
  var cfg = {
    documentKey: script?.dataset.docKey || script?.dataset.documentKey || "",
    apiEndpoint: script?.dataset.apiEndpoint || script?.dataset.apiBase || "",
    theme: script?.dataset.theme || "gradient",
    position: script?.dataset.position || "bottom-right",
    primaryColor: script?.dataset.primaryColor || "#667eea",
    welcomeMessage: script?.dataset.welcomeMessage || "Hi, I can answer questions about your document.",
    openaiApiKey: script?.dataset.openaiKey || script?.dataset.apiKey || "",
    autostart: String(script?.dataset.autostart || "false") === "true",
    title: script?.dataset.title || "Document Assistant"
  };

  // Prevent multiple instances
  if (w.__DOC_CHATBOT_ACTIVE__) return;
  w.__DOC_CHATBOT_ACTIVE__ = true;

  // Theme configurations
  var themes = {
    gradient: {
      primary: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      secondary: "linear-gradient(135deg, #5a67d8 0%, #667eea 100%)",
      button: "#667eea",
      text: "#ffffff"
    },
    blue: {
      primary: "#2563eb",
      secondary: "#3b82f6", 
      button: "#2563eb",
      text: "#ffffff"
    },
    dark: {
      primary: "#1f2937",
      secondary: "#374151",
      button: "#1f2937", 
      text: "#ffffff"
    }
  };

  var positions = {
    "bottom-right": { bottom: "24px", right: "24px" },
    "bottom-left": { bottom: "24px", left: "24px" },
    "top-right": { top: "24px", right: "24px" },
    "top-left": { top: "24px", left: "24px" }
  };

  var currentTheme = themes[cfg.theme] || themes.gradient;
  var currentPosition = positions[cfg.position] || positions["bottom-right"];

  var isOpen = false;
  var documentContent = "";
  var docLoaded = false;
  var conversationHistory = [];

  // Create floating button
  var btn = d.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Open Document Assistant');
  btn.id = 'doc-chatbot-btn';
  
  Object.assign(btn.style, {
    position: 'fixed',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    border: 'none',
    background: currentTheme.primary,
    color: currentTheme.text,
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    zIndex: '9999',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    fontSize: '24px'
  });

  // Apply position
  Object.assign(btn.style, currentPosition);

  btn.innerHTML = '💬';
  btn.onclick = toggleChat;

  // Hover effects
  btn.onmouseenter = function() {
    btn.style.transform = 'scale(1.1)';
    btn.style.boxShadow = '0 6px 25px rgba(0,0,0,0.4)';
  };
  btn.onmouseleave = function() {
    btn.style.transform = 'scale(1)';
    btn.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
  };

  d.body.appendChild(btn);

  // Create chat window
  var chatWindow = d.createElement('div');
  chatWindow.id = 'doc-chatbot-window';
  chatWindow.style.cssText = `
    position: fixed;
    width: 380px;
    height: 500px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    z-index: 9998;
    display: none;
    flex-direction: column;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Position chat window
  if (currentPosition.bottom) {
    chatWindow.style.bottom = (parseInt(currentPosition.bottom) + 80) + 'px';
    if (currentPosition.right) chatWindow.style.right = currentPosition.right;
    if (currentPosition.left) chatWindow.style.left = currentPosition.left;
  } else {
    chatWindow.style.top = (parseInt(currentPosition.top) + 80) + 'px';
    if (currentPosition.right) chatWindow.style.right = currentPosition.right;
    if (currentPosition.left) chatWindow.style.left = currentPosition.left;
  }

  // Header
  var header = d.createElement('div');
  header.style.cssText = `
    background: ${currentTheme.primary};
    color: ${currentTheme.text};
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  `;

  var title = d.createElement('div');
  title.textContent = cfg.title;
  header.appendChild(title);

  var closeBtn = d.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = `
    background: rgba(255,255,255,0.2);
    color: ${currentTheme.text};
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  closeBtn.onclick = closeChat;
  header.appendChild(closeBtn);

  // Messages container
  var messagesContainer = d.createElement('div');
  messagesContainer.id = 'doc-chatbot-messages';
  messagesContainer.style.cssText = `
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    background: #f8f9fa;
  `;

  // Input container
  var inputContainer = d.createElement('div');
  inputContainer.style.cssText = `
    padding: 16px;
    border-top: 1px solid #e9ecef;
    background: white;
    display: flex;
    gap: 8px;
  `;

  var messageInput = d.createElement('input');
  messageInput.type = 'text';
  messageInput.placeholder = 'Ask me about the document...';
  messageInput.style.cssText = `
    flex: 1;
    padding: 12px;
    border: 1px solid #dee2e6;
    border-radius: 24px;
    outline: none;
    font-size: 14px;
  `;

  var sendBtn = d.createElement('button');
  sendBtn.textContent = 'Send';
  sendBtn.style.cssText = `
    background: ${currentTheme.button};
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 24px;
    cursor: pointer;
    font-weight: 500;
    font-size: 14px;
  `;

  inputContainer.appendChild(messageInput);
  inputContainer.appendChild(sendBtn);

  chatWindow.appendChild(header);
  chatWindow.appendChild(messagesContainer);
  chatWindow.appendChild(inputContainer);

  d.body.appendChild(chatWindow);

  // Event listeners
  messageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  sendBtn.onclick = sendMessage;

  // Functions
  function toggleChat() {
    if (isOpen) {
      closeChat();
    } else {
      openChat();
    }
  }

  function openChat() {
    if (isOpen) return;
    
    isOpen = true;
    chatWindow.style.display = 'flex';
    btn.setAttribute('aria-label', 'Close Document Assistant');
    
    // Load document if not loaded
    if (!docLoaded) {
      loadDocument();
    }
    
    // Add welcome message if no messages
    if (messagesContainer.children.length === 0) {
      addMessage('assistant', cfg.welcomeMessage);
    }
    
    messageInput.focus();
  }

  function closeChat() {
    if (!isOpen) return;
    
    isOpen = false;
    chatWindow.style.display = 'none';
    btn.setAttribute('aria-label', 'Open Document Assistant');
  }

  function addMessage(role, content) {
    var messageDiv = d.createElement('div');
    messageDiv.style.cssText = `
      margin-bottom: 12px;
      display: flex;
      ${role === 'user' ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
    `;

    var messageBubble = d.createElement('div');
    messageBubble.textContent = content;
    messageBubble.style.cssText = `
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 18px;
      font-size: 14px;
      line-height: 1.4;
      ${role === 'user' 
        ? `background: ${currentTheme.button}; color: white; margin-left: auto;`
        : 'background: white; color: #333; box-shadow: 0 2px 8px rgba(0,0,0,0.1);'
      }
    `;

    messageDiv.appendChild(messageBubble);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // async function loadDocument() {
  //   if (!cfg.documentKey || !cfg.apiEndpoint) {
  //     addMessage('assistant', 'Configuration error: Missing document key or API endpoint.');
  //     return;
  //   }

  //   try {
  //     var response = await fetch(cfg.apiEndpoint + '/api/document/' + cfg.documentKey);
  //     if (!response.ok) {
  //       throw new Error('Failed to load document');
  //     }
      
  //     var data = await response.json();
  //     documentContent = data.content || '';
  //     docLoaded = true;
  //   } catch (error) {
  //     console.error('Document load error:', error);
  //     addMessage('assistant', 'Sorry, I could not load the document. Please check the configuration.');
  //   }
  // }

  async function loadDocument() {
  if (!cfg.apiEndpoint) {
    addMessage('assistant', 'Configuration error: Missing API endpoint.');
    return;
  }

  // Build the URL dynamically based on the provided query parameters
  let url = `${cfg.apiEndpoint}/api/document`;

  // Check if both documentKey and userId are provided in the configuration
  const queryParams = [];
  if (cfg.documentKey) {
    queryParams.push(`document_key=${cfg.documentKey}`);
  }
  if (cfg.userId) {
    queryParams.push(`user_id=${cfg.userId}`);
  }

  // Append query parameters to the URL if any
  if (queryParams.length > 0) {
    url += `?${queryParams.join('&')}`;
  }

  try {
    var response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to load document');
    }

    var data = await response.json();
    documentContent = data.content || '';
    docLoaded = true;
  } catch (error) {
    console.error('Document load error:', error);
    addMessage('assistant', 'Sorry, I could not load the document. Please check the configuration.');
  }
}


  async function sendMessage() {
    var message = messageInput.value.trim();
    if (!message) return;

    if (!cfg.openaiApiKey) {
      addMessage('assistant', 'OpenAI API key is not configured. Please check the script setup.');
      return;
    }

    if (!docLoaded) {
      addMessage('assistant', 'Document is still loading. Please wait a moment and try again.');
      return;
    }

    // Add user message
    addMessage('user', message);
    messageInput.value = '';

    // Show typing indicator
    var typingDiv = d.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.style.cssText = 'margin-bottom: 12px; color: #666; font-style: italic; font-size: 14px;';
    typingDiv.textContent = 'Assistant is typing...';
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
      var response = await fetch(cfg.apiEndpoint + '/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: message,
          documentKey: cfg.documentKey,
          apiKey: cfg.openaiApiKey,
          documentContent: documentContent
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from server');
      }

      var data = await response.json();
      
      // Remove typing indicator
      var typing = d.getElementById('typing-indicator');
      if (typing) typing.remove();
      
      addMessage('assistant', data.answer || 'I apologize, but I could not generate a response.');
      
    } catch (error) {
      console.error('Chat error:', error);
      
      // Remove typing indicator
      var typing = d.getElementById('typing-indicator');
      if (typing) typing.remove();
      
      addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    }
  }

  // Auto-start if configured
  if (cfg.autostart) {
    if (d.readyState === 'loading') {
      d.addEventListener('DOMContentLoaded', openChat);
    } else {
      setTimeout(openChat, 1000);
    }
  }

  // Expose API for external control
  w.DocumentChatbot = {
    open: openChat,
    close: closeChat,
    toggle: toggleChat,
    isOpen: function() { return isOpen; }
  };

})();
