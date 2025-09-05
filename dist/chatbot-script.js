
// // standalone-document-chatbot.js
// (function () {
//   var d = document, w = window;
//   var script = d.currentScript || (function () {
//     var s = d.getElementsByTagName('script');
//     return s[s.length - 1];
//   })();

//   // Get configuration from script data attributes
//   var cfg = {
//     documentKey: script?.dataset.docKey || script?.dataset.documentKey || "",
//     apiEndpoint: script?.dataset.apiEndpoint || script?.dataset.apiBase || "",
//     theme: script?.dataset.theme || "gradient",
//     position: script?.dataset.position || "bottom-right",
//     primaryColor: script?.dataset.primaryColor || "#667eea",
//     welcomeMessage: script?.dataset.welcomeMessage || "Hi, I can answer questions about your document.",
//     openaiApiKey: script?.dataset.openaiKey || script?.dataset.apiKey || "",
//     autostart: String(script?.dataset.autostart || "false") === "true",
//     title: script?.dataset.title || "Document Assistant",
//     userId: script?.dataset.userId || ""
//   };

//   // Prevent multiple instances
//   if (w.__DOC_CHATBOT_ACTIVE__) return;
//   w.__DOC_CHATBOT_ACTIVE__ = true;

//   // ------- Helpers -------
//   var MAX_DOC_CHARS = 120000; // cap document text in prompt

//   function capTextLength(s, maxChars) {
//     if (!s) return s;
//     if (s.length <= maxChars) return s;
//     var head = s.slice(0, Math.floor(maxChars * 0.7));
//     var tail = s.slice(-Math.floor(maxChars * 0.2));
//     return head + "\n...\n[Content truncated]\n...\n" + tail;
//   }

//   function removeTypingIndicator() {
//     var typing = d.getElementById('typing-indicator');
//     if (typing) typing.remove();
//   }

//   // Lazy-load PDF.js if needed
//   function loadPDFJSLib() {
//     return new Promise(function (resolve, reject) {
//       if (w.pdfjsLib && w.pdfjsLib.getDocument) {
//         try {
//           // Ensure worker set if not already
//           if (!w.pdfjsLib.GlobalWorkerOptions.workerSrc) {
//             w.pdfjsLib.GlobalWorkerOptions.workerSrc =
//               "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.js";
//           }
//           return resolve();
//         } catch (e) {
//           // continue to (re)load below
//         }
//       }
//       var s = d.createElement('script');
//       s.src = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.min.js";
//       s.onload = function () {
//         try {
//           w.pdfjsLib.GlobalWorkerOptions.workerSrc =
//             "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.js";
//           resolve();
//         } catch (err) {
//           reject(err);
//         }
//       };
//       s.onerror = function () { reject(new Error("Failed to load pdf.js")); };
//       d.head.appendChild(s);
//     });
//   }

//   // ------- OpenAI Service -------
//   var OpenAIService = function (apiKey) {
//     this.apiKey = apiKey;
//     this.baseURL = "https://api.openai.com/v1";
//     if (!apiKey) {
//       console.warn("OpenAI API key not provided, chat will not work.");
//     }
//   };

//   OpenAIService.prototype.generateResponse = async function (question, documentContext, options) {
//     if (!this.apiKey) throw new Error("OpenAI API key is missing");

//     options = options || {};
//     var model = options.model || "gpt-4o-mini";
//     var maxTokens = options.maxTokens || 600;
//     var temperature = options.temperature || 0.4;

//     var systemPrompt =
//       "You are a helpful assistant that answers questions based strictly on the provided document content. " +
//       "If the information is not available in the document, clearly state that the document does not contain that information. " +
//       "Do not make up or invent information that is not explicitly stated in the document.";

//     var userPrompt =
//       "Document content:\n" + documentContext +
//       "\n\nQuestion: " + question +
//       "\n\nAnswer based strictly on the document content above. Be concise and accurate.";

//     try {
//       var response = await fetch(this.baseURL + "/chat/completions", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "Authorization": "Bearer " + this.apiKey
//         },
//         body: JSON.stringify({
//           model: model,
//           messages: [
//             { role: "system", content: systemPrompt },
//             { role: "user", content: userPrompt }
//           ],
//           max_tokens: maxTokens,
//           temperature: temperature
//         })
//       });

//       if (!response.ok) {
//         var errorData;
//         try {
//           errorData = await response.json();
//         } catch (e) {
//           throw new Error("Request failed with status " + response.status);
//         }
//         throw new Error(errorData.error?.message || "Request failed");
//       }

//       var data = await response.json();
//       return data.choices?.[0]?.message?.content || "No response generated";
//     } catch (error) {
//       console.error("OpenAI API Error:", error);
//       throw error;
//     }
//   };

//   // Real PDF text extraction using PDF.js
//   OpenAIService.prototype.extractTextFromPDF = async function (documentUrl, opts) {
//     opts = opts || {};
//     var maxPages = Number(opts.maxPages || 300);
//     var timeoutMs = Number(opts.timeoutMs || 30000);

//     var controller = new AbortController();
//     var to = setTimeout(function () { controller.abort(); }, timeoutMs);

//     var res = await fetch(documentUrl, { signal: controller.signal });
//     clearTimeout(to);
//     if (!res.ok) throw new Error("Failed to fetch PDF (" + res.status + ")");

//     var buf = await res.arrayBuffer();

//     await loadPDFJSLib();
//     var loadingTask = w.pdfjsLib.getDocument({ data: buf });
//     var pdf = await loadingTask.promise;

//     var total = Math.min(pdf.numPages, maxPages);
//     var parts = [];

//     for (var pageNo = 1; pageNo <= total; pageNo++) {
//       var page = await pdf.getPage(pageNo);
//       var content = await page.getTextContent();
//       var pageText = content.items.map(function (it) { return it.str; }).join(" ");
//       // Cleanups
//       pageText = pageText.replace(/\s+/g, " ").replace(/(\w)-\s+(\w)/g, "$1$2").trim();
//       if (pageText) parts.push("[[PAGE " + pageNo + "]] " + pageText);
//     }

//     var fullText = parts.join("\n");
//     if (!fullText) throw new Error("No extractable text in PDF");
//     return fullText;
//   };

//   // Theme configurations
//   var themes = {
//     gradient: {
//       primary: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
//       secondary: "linear-gradient(135deg, #5a67d8 0%, #667eea 100%)",
//       button: "#667eea",
//       text: "#ffffff"
//     },
//     blue: {
//       primary: "#2563eb",
//       secondary: "#3b82f6",
//       button: "#2563eb",
//       text: "#ffffff"
//     },
//     dark: {
//       primary: "#1f2937",
//       secondary: "#374151",
//       button: "#1f2937",
//       text: "#ffffff"
//     }
//   };

//   var positions = {
//     "bottom-right": { bottom: "24px", right: "24px" },
//     "bottom-left": { bottom: "24px", left: "24px" },
//     "top-right": { top: "24px", right: "24px" },
//     "top-left": { top: "24px", left: "24px" }
//   };

//   var currentTheme = themes[cfg.theme] || themes.gradient;
//   var currentPosition = positions[cfg.position] || positions["bottom-right"];

//   var isOpen = false;
//   var documentContent = "";
//   var documentUrl = "";
//   var docLoaded = false;
//   var openaiService = new OpenAIService(cfg.openaiApiKey);

//   // Create floating button
//   var btn = d.createElement('button');
//   btn.type = 'button';
//   btn.setAttribute('aria-label', 'Open Document Assistant');
//   btn.id = 'doc-chatbot-btn';

//   Object.assign(btn.style, {
//     position: 'fixed',
//     width: '60px',
//     height: '60px',
//     borderRadius: '50%',
//     border: 'none',
//     background: currentTheme.primary,
//     color: currentTheme.text,
//     cursor: 'pointer',
//     boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
//     zIndex: '9999',
//     display: 'flex',
//     alignItems: 'center',
//     justifyContent: 'center',
//     transition: 'all 0.3s ease',
//     fontSize: '24px'
//   });

//   // Apply position
//   Object.assign(btn.style, currentPosition);

//   btn.innerHTML = '💬';
//   btn.onclick = toggleChat;

//   // Hover effects
//   btn.onmouseenter = function () {
//     btn.style.transform = 'scale(1.1)';
//     btn.style.boxShadow = '0 6px 25px rgba(0,0,0,0.4)';
//   };
//   btn.onmouseleave = function () {
//     btn.style.transform = 'scale(1)';
//     btn.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
//   };

//   d.body.appendChild(btn);

//   // Create chat window
//   var chatWindow = d.createElement('div');
//   chatWindow.id = 'doc-chatbot-window';
//   chatWindow.setAttribute('role', 'dialog');
//   chatWindow.setAttribute('aria-modal', 'true');
//   chatWindow.style.cssText = `
//     position: fixed;
//     width: 380px;
//     height: 500px;
//     background: white;
//     border-radius: 16px;
//     box-shadow: 0 10px 40px rgba(0,0,0,0.3);
//     z-index: 9998;
//     display: none;
//     flex-direction: column;
//     overflow: hidden;
//     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
//   `;

//   // Position chat window
//   if (currentPosition.bottom) {
//     chatWindow.style.bottom = (parseInt(currentPosition.bottom) + 80) + 'px';
//     if (currentPosition.right) chatWindow.style.right = currentPosition.right;
//     if (currentPosition.left) chatWindow.style.left = currentPosition.left;
//   } else {
//     chatWindow.style.top = (parseInt(currentPosition.top) + 80) + 'px';
//     if (currentPosition.right) chatWindow.style.right = currentPosition.right;
//     if (currentPosition.left) chatWindow.style.left = currentPosition.left;
//   }

//   // Header
//   var header = d.createElement('div');
//   header.style.cssText = `
//     background: ${currentTheme.primary};
//     color: ${currentTheme.text};
//     padding: 16px;
//     display: flex;
//     justify-content: space-between;
//     align-items: center;
//     font-weight: 600;
//   `;

//   var title = d.createElement('div');
//   title.textContent = cfg.title;
//   header.appendChild(title);

//   var closeBtn = d.createElement('button');
//   closeBtn.innerHTML = '✕';
//   closeBtn.style.cssText = `
//     background: rgba(255,255,255,0.2);
//     color: ${currentTheme.text};
//     border: none;
//     width: 32px;
//     height: 32px;
//     border-radius: 50%;
//     cursor: pointer;
//     font-size: 16px;
//     display: flex;
//     align-items: center;
//     justify-content: center;
//     transition: all 0.2s ease;
//   `;
//   closeBtn.onmouseenter = function () {
//     closeBtn.style.background = 'rgba(255,255,255,0.3)';
//   };
//   closeBtn.onmouseleave = function () {
//     closeBtn.style.background = 'rgba(255,255,255,0.2)';
//   };
//   closeBtn.onclick = closeChat;
//   header.appendChild(closeBtn);

//   // Messages container
//   var messagesContainer = d.createElement('div');
//   messagesContainer.id = 'doc-chatbot-messages';
//   messagesContainer.style.cssText = `
//     flex: 1;
//     padding: 16px;
//     overflow-y: auto;
//     background: #f8f9fa;
//   `;

//   // Input container
//   var inputContainer = d.createElement('div');
//   inputContainer.style.cssText = `
//     padding: 16px;
//     border-top: 1px solid #e9ecef;
//     background: white;
//     display: flex;
//     gap: 8px;
//   `;

//   var messageInput = d.createElement('input');
//   messageInput.type = 'text';
//   messageInput.placeholder = 'Ask me about the document...';
//   messageInput.setAttribute('aria-label', 'Message input');
//   messageInput.style.cssText = `
//     flex: 1;
//     padding: 12px;
//     border: 1px solid #dee2e6;
//     border-radius: 24px;
//     outline: none;
//     font-size: 14px;
//     transition: border-color 0.2s ease;
//   `;

//   messageInput.onfocus = function () {
//     messageInput.style.borderColor = currentTheme.button;
//   };
//   messageInput.onblur = function () {
//     messageInput.style.borderColor = '#dee2e6';
//   };

//   var sendBtn = d.createElement('button');
//   sendBtn.textContent = 'Send';
//   sendBtn.style.cssText = `
//     background: ${currentTheme.button};
//     color: white;
//     border: none;
//     padding: 12px 20px;
//     border-radius: 24px;
//     cursor: pointer;
//     font-weight: 500;
//     font-size: 14px;
//     transition: all 0.2s ease;
//   `;

//   sendBtn.onmouseenter = function () {
//     sendBtn.style.opacity = '0.9';
//     sendBtn.style.transform = 'translateY(-1px)';
//   };
//   sendBtn.onmouseleave = function () {
//     sendBtn.style.opacity = '1';
//     sendBtn.style.transform = 'translateY(0)';
//   };

//   inputContainer.appendChild(messageInput);
//   inputContainer.appendChild(sendBtn);

//   chatWindow.appendChild(header);
//   chatWindow.appendChild(messagesContainer);
//   chatWindow.appendChild(inputContainer);

//   d.body.appendChild(chatWindow);

//   // Event listeners
//   messageInput.addEventListener('keypress', function (e) {
//     if (e.key === 'Enter') {
//       sendMessage();
//     }
//   });

//   sendBtn.onclick = sendMessage;

//   // Functions
//   function toggleChat() {
//     if (isOpen) {
//       closeChat();
//     } else {
//       openChat();
//     }
//   }

//   function openChat() {
//     if (isOpen) return;

//     isOpen = true;
//     chatWindow.style.display = 'flex';
//     btn.setAttribute('aria-label', 'Close Document Assistant');

//     // Load document if not loaded
//     if (!docLoaded) {
//       loadDocument();
//     }

//     // Add welcome message if no messages
//     if (messagesContainer.children.length === 0) {
//       addMessage('assistant', cfg.welcomeMessage);
//     }

//     setTimeout(function () {
//       messageInput.focus();
//     }, 100);
//   }

//   function closeChat() {
//     if (!isOpen) return;

//     isOpen = false;
//     chatWindow.style.display = 'none';
//     btn.setAttribute('aria-label', 'Open Document Assistant');
//   }

//   function addMessage(role, content) {
//     var messageDiv = d.createElement('div');
//     messageDiv.style.cssText = `
//       margin-bottom: 12px;
//       display: flex;
//       ${role === 'user' ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
//       animation: fadeIn 0.3s ease-in;
//     `;

//     var messageBubble = d.createElement('div');
//     messageBubble.textContent = content;
//     messageBubble.style.cssText = `
//       max-width: 80%;
//       padding: 12px 16px;
//       border-radius: 18px;
//       font-size: 14px;
//       line-height: 1.4;
//       word-wrap: break-word;
//       ${role === 'user'
//         ? `background: ${currentTheme.button}; color: white; margin-left: auto;`
//         : 'background: white; color: #333; box-shadow: 0 2px 8px rgba(0,0,0,0.1);'
//       }
//     `;

//     messageDiv.appendChild(messageBubble);
//     messagesContainer.appendChild(messageDiv);
//     messagesContainer.scrollTop = messagesContainer.scrollHeight;
//   }

//   async function loadDocument() {
//     if (!cfg.apiEndpoint) {
//       addMessage('assistant', 'Configuration error: Missing API endpoint.');
//       return;
//     }

//     // Show loading message
//     addMessage('assistant', 'Loading document, please wait...');

//     // Build the URL dynamically based on the provided query parameters
//     var url = cfg.apiEndpoint + '/api/document';
//     var queryParams = [];

//     if (cfg.documentKey) {
//       queryParams.push('document_key=' + encodeURIComponent(cfg.documentKey));
//     }
//     if (cfg.userId) {
//       queryParams.push('user_id=' + encodeURIComponent(cfg.userId));
//     }

//     if (queryParams.length > 0) {
//       url += '?' + queryParams.join('&');
//     }

//     try {
//       var response = await fetch(url);
//       if (!response.ok) {
//         throw new Error('Failed to load document from server');
//       }

//       var apiResponse = await response.json();
//       console.log('Document API Response:', apiResponse);

//       if (!apiResponse.isSuccess || !apiResponse.data || apiResponse.data.length === 0) {
//         throw new Error('No document found or invalid response');
//       }

//       var documentData = apiResponse.data[0];
//       documentUrl = documentData.document_url;

//       if (!documentUrl) {
//         throw new Error('Document URL not found in response');
//       }

//       // Check file type and handle accordingly
//       var fileExtension = documentData.file_name.toLowerCase().split('.').pop();

//       if (fileExtension === 'pdf') {
//         try {
//           // Extract real text from PDF client-side (no RAG)
//           var text = await openaiService.extractTextFromPDF(documentUrl, { maxPages: 300 });
//           documentContent = capTextLength(text, MAX_DOC_CHARS);
//           docLoaded = true;
//           addMessage('assistant', 'PDF loaded, text extracted. Ask your question.');
//         } catch (error) {
//           console.error('PDF processing error:', error);
//           // Fallback
//           documentContent = "PDF_URL:" + documentUrl;
//           docLoaded = true;
//           addMessage('assistant', 'PDF loaded, but text could not be extracted. I will try to help from the link, answers may be limited.');
//         }
//       } else {
//         // For text-based files, fetch the content directly
//         try {
//           var contentResponse = await fetch(documentUrl);
//           if (contentResponse.ok) {
//             var txt = await contentResponse.text();
//             documentContent = capTextLength(txt, MAX_DOC_CHARS);
//             docLoaded = true;
//             addMessage('assistant', 'Document content loaded successfully! You can now ask questions.');
//           } else {
//             throw new Error('Failed to fetch document content');
//           }
//         } catch (error) {
//           console.error('Content fetch error:', error);
//           documentContent = "DOCUMENT_URL:" + documentUrl;
//           docLoaded = true;
//           addMessage('assistant', 'Document loaded! You can now ask questions about its content.');
//         }
//       }

//     } catch (error) {
//       console.error('Document load error:', error);
//       addMessage('assistant', 'Sorry, I could not load the document. Please check the configuration or try again later.');
//     }
//   }

//   async function sendMessage() {
//     var message = messageInput.value.trim();
//     if (!message) return;

//     if (!cfg.openaiApiKey) {
//       addMessage('assistant', 'OpenAI API key is not configured properly. Please update the script with a valid API key.');
//       return;
//     }

//     if (!docLoaded) {
//       addMessage('assistant', 'Document is still loading. Please wait a moment and try again.');
//       return;
//     }

//     // Add user message
//     addMessage('user', message);
//     messageInput.value = '';

//     // Show typing indicator
//     var typingDiv = d.createElement('div');
//     typingDiv.id = 'typing-indicator';
//     typingDiv.style.cssText = `
//       margin-bottom: 12px; 
//       color: #666; 
//       font-style: italic; 
//       font-size: 14px;
//       display: flex;
//       align-items: center;
//       gap: 8px;
//     `;

//     var dots = d.createElement('div');
//     dots.innerHTML = '●●●';
//     dots.style.cssText = 'animation: pulse 1.5s ease-in-out infinite;';

//     typingDiv.appendChild(d.createTextNode('Assistant is typing'));
//     typingDiv.appendChild(dots);
//     messagesContainer.appendChild(typingDiv);
//     messagesContainer.scrollTop = messagesContainer.scrollHeight;

//     try {
//       var contextToUse = documentContent;

//       // Basic greetings
//       var lowerMessage = message.toLowerCase().trim();
//       var isGreeting = /^(hi|hello|hey|good\s+(morning|afternoon|evening)|greetings?)$/i.test(lowerMessage);
//       if (isGreeting) {
//         removeTypingIndicator(); // fix: avoid stuck indicator
//         addMessage('assistant', "Hello! I'm your document assistant and I'm here to help you understand and find information in your document. What would you like to know about it?");
//         return;
//       }

//       // If we have limited context, add helper note
//       if (documentContent.startsWith('PDF_URL:') ||
//           documentContent.startsWith('DOCUMENT_URL:') ||
//           contextToUse.includes("I'm ready to help answer questions")) {
//         contextToUse = contextToUse +
//           "\n\nNote: I'm a helpful assistant specialized in answering questions about documents. " +
//           "If you have specific questions about the document content, I'll do my best to help based on the information available.";
//       }

//       // Final cap before send
//       contextToUse = capTextLength(contextToUse, MAX_DOC_CHARS);

//       // Disable send while in-flight
//       sendBtn.disabled = true;
//       var response = await openaiService.generateResponse(message, contextToUse, {
//         model: "gpt-4o-mini",
//         maxTokens: 600,
//         temperature: 0.7
//       });

//       removeTypingIndicator();
//       addMessage('assistant', response);
//     } catch (error) {
//       console.error('Chat error:', error);
//       removeTypingIndicator();

//       var errorMessage = 'Sorry, I encountered an error while processing your question. ';
//       if (error.message.includes('API key')) {
//         errorMessage += 'Please check that your OpenAI API key is valid and has sufficient credits.';
//       } else {
//         errorMessage += 'Please try again in a moment.';
//       }
//       addMessage('assistant', errorMessage);
//     } finally {
//       sendBtn.disabled = false;
//     }
//   }

//   // Add CSS animations
//   var style = d.createElement('style');
//   style.textContent = `
//     @keyframes fadeIn {
//       from { opacity: 0; transform: translateY(10px); }
//       to { opacity: 1; transform: translateY(0); }
//     }
//     @keyframes pulse {
//       0%, 100% { opacity: 1; }
//       50% { opacity: 0.3; }
//     }
//   `;
//   d.head.appendChild(style);

//   // Auto-start if configured
//   if (cfg.autostart) {
//     if (d.readyState === 'loading') {
//       d.addEventListener('DOMContentLoaded', function () {
//         setTimeout(openChat, 1000);
//       });
//     } else {
//       setTimeout(openChat, 1000);
//     }
//   }

//   // Expose API for external control
//   w.DocumentChatbot = {
//     open: openChat,
//     close: closeChat,
//     toggle: toggleChat,
//     isOpen: function () { return isOpen; },
//     loadDocument: loadDocument,
//     addMessage: addMessage
//   };

//   console.log('Document Chatbot initialized with config:', cfg);
// })();


// standalone-document-chatbot.js (production, assumes pdf.js is preloaded)
// Require in HTML BEFORE this script:
// <script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.min.js"></script>
// <script>pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.js";</script>

(function () {
  var d = document, w = window;
  var script = d.currentScript || (function () { var s = d.getElementsByTagName('script'); return s[s.length - 1]; })();

  var cfg = {
    documentKey: script?.dataset.docKey || script?.dataset.documentKey || "",
    apiEndpoint: script?.dataset.apiEndpoint || script?.dataset.apiBase || "",
    theme: script?.dataset.theme || "gradient",
    position: script?.dataset.position || "bottom-right",
    primaryColor: script?.dataset.primaryColor || "#667eea",
    welcomeMessage: script?.dataset.welcomeMessage || "Hi, I can answer questions about your document.",
    openaiApiKey: script?.dataset.openaiKey || script?.dataset.apiKey || "",
    autostart: String(script?.dataset.autostart || "false") === "true",
    title: script?.dataset.title || "Document Assistant",
    userId: script?.dataset.userId || ""
  };

  if (w.__DOC_CHATBOT_ACTIVE__) return;
  w.__DOC_CHATBOT_ACTIVE__ = true;

  var MAX_DOC_CHARS = 120000;

  function capTextLength(s, maxChars) {
    if (!s) return s;
    if (s.length <= maxChars) return s;
    var head = s.slice(0, Math.floor(maxChars * 0.7));
    var tail = s.slice(-Math.floor(maxChars * 0.2));
    return head + "\n...\n[Content truncated]\n...\n" + tail;
  }
  function removeTypingIndicator() {
    var typing = d.getElementById('typing-indicator');
    if (typing) typing.remove();
  }

  var OpenAIService = function (apiKey) {
    this.apiKey = apiKey;
    this.baseURL = "https://api.openai.com/v1";
    if (!apiKey) console.warn("OpenAI API key not provided, chat will not work.");
  };

  OpenAIService.prototype.generateResponse = async function (question, documentContext, options) {
    if (!this.apiKey) throw new Error("OpenAI API key is missing");
    options = options || {};
    var model = options.model || "gpt-4o-mini";
    var maxTokens = options.maxTokens || 600;
    var temperature = options.temperature || 0.4;

    var systemPrompt =
      "You are a helpful assistant that answers questions based strictly on the provided document content. " +
      "If the information is not available in the document, clearly state that the document does not contain that information. " +
      "Do not make up or invent information that is not explicitly stated in the document.";
    var userPrompt =
      "Document content:\n" + documentContext +
      "\n\nQuestion: " + question +
      "\n\nAnswer based strictly on the document content above. Be concise and accurate.";

    var response = await fetch(this.baseURL + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + this.apiKey },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature: temperature
      })
    });
    if (!response.ok) {
      var err;
      try { err = await response.json(); } catch (_) {}
      throw new Error(err?.error?.message || ("Request failed with status " + response.status));
    }
    var data = await response.json();
    return data.choices?.[0]?.message?.content || "No response generated";
  };

  // Uses preloaded pdf.js
  OpenAIService.prototype.extractTextFromPDF = async function (documentUrl, opts) {
    if (!w.pdfjsLib || !w.pdfjsLib.getDocument) {
      throw new Error("pdf.js is not loaded. Include pdf.min.js and set GlobalWorkerOptions.workerSrc before this script.");
    }
    opts = opts || {};
    var maxPages = Number(opts.maxPages || 300);
    var timeoutMs = Number(opts.timeoutMs || 30000);

    var controller = new AbortController();
    var to = setTimeout(function () { controller.abort(); }, timeoutMs);
    var res = await fetch(documentUrl, { signal: controller.signal });
    clearTimeout(to);
    if (!res.ok) throw new Error("Failed to fetch PDF (" + res.status + ")");

    var buf = await res.arrayBuffer();
    var loadingTask = w.pdfjsLib.getDocument({ data: buf });
    var pdf = await loadingTask.promise;

    var total = Math.min(pdf.numPages, maxPages);
    var parts = [];
    for (var pageNo = 1; pageNo <= total; pageNo++) {
      var page = await pdf.getPage(pageNo);
      var content = await page.getTextContent();
      var pageText = content.items.map(function (it) { return it.str; }).join(" ");
      pageText = pageText.replace(/\s+/g, " ").replace(/(\w)-\s+(\w)/g, "$1$2").trim();
      if (pageText) parts.push("[[PAGE " + pageNo + "]] " + pageText);
    }
    var fullText = parts.join("\n");
    if (!fullText) throw new Error("No extractable text in PDF");
    return fullText;
  };

  var themes = {
    gradient: { primary: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", secondary: "linear-gradient(135deg, #5a67d8 0%, #667eea 100%)", button: "#667eea", text: "#ffffff" },
    blue: { primary: "#2563eb", secondary: "#3b82f6", button: "#2563eb", text: "#ffffff" },
    dark: { primary: "#1f2937", secondary: "#374151", button: "#1f2937", text: "#ffffff" }
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
  var documentUrl = "";
  var docLoaded = false;
  var openaiService = new OpenAIService(cfg.openaiApiKey);

  var btn = d.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Open Document Assistant');
  btn.id = 'doc-chatbot-btn';
  Object.assign(btn.style, {
    position: 'fixed', width: '60px', height: '60px', borderRadius: '50%', border: 'none',
    background: currentTheme.primary, color: currentTheme.text, cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: '9999', display: 'flex',
    alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease', fontSize: '24px'
  });
  Object.assign(btn.style, currentPosition);
  btn.innerHTML = '💬';
  btn.onclick = toggleChat;
  btn.onmouseenter = function () { btn.style.transform = 'scale(1.1)'; btn.style.boxShadow = '0 6px 25px rgba(0,0,0,0.4)'; };
  btn.onmouseleave = function () { btn.style.transform = 'scale(1)'; btn.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'; };
  d.body.appendChild(btn);

  var chatWindow = d.createElement('div');
  chatWindow.id = 'doc-chatbot-window';
  chatWindow.setAttribute('role', 'dialog');
  chatWindow.setAttribute('aria-modal', 'true');
  chatWindow.style.cssText = `
    position: fixed; width: 380px; height: 500px; background: white; border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 9998; display: none; flex-direction: column;
    overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  if (currentPosition.bottom) {
    chatWindow.style.bottom = (parseInt(currentPosition.bottom) + 80) + 'px';
    if (currentPosition.right) chatWindow.style.right = currentPosition.right;
    if (currentPosition.left) chatWindow.style.left = currentPosition.left;
  } else {
    chatWindow.style.top = (parseInt(currentPosition.top) + 80) + 'px';
    if (currentPosition.right) chatWindow.style.right = currentPosition.right;
    if (currentPosition.left) chatWindow.style.left = currentPosition.left;
  }

  var header = d.createElement('div');
  header.style.cssText = `
    background: ${currentTheme.primary}; color: ${currentTheme.text}; padding: 16px;
    display: flex; justify-content: space-between; align-items: center; font-weight: 600;
  `;
  var title = d.createElement('div'); title.textContent = cfg.title; header.appendChild(title);
  var closeBtn = d.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = `
    background: rgba(255,255,255,0.2); color: ${currentTheme.text}; border: none; width: 32px; height: 32px;
    border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;
  `;
  closeBtn.onmouseenter = function () { closeBtn.style.background = 'rgba(255,255,255,0.3)'; };
  closeBtn.onmouseleave = function () { closeBtn.style.background = 'rgba(255,255,255,0.2)'; };
  closeBtn.onclick = closeChat;
  header.appendChild(closeBtn);

  var messagesContainer = d.createElement('div');
  messagesContainer.id = 'doc-chatbot-messages';
  messagesContainer.style.cssText = `flex: 1; padding: 16px; overflow-y: auto; background: #f8f9fa;`;

  var inputContainer = d.createElement('div');
  inputContainer.style.cssText = `padding: 16px; border-top: 1px solid #e9ecef; background: white; display: flex; gap: 8px;`;

  var messageInput = d.createElement('input');
  messageInput.type = 'text';
  messageInput.placeholder = 'Ask me about the document...';
  messageInput.setAttribute('aria-label', 'Message input');
  messageInput.style.cssText = `
    flex: 1; padding: 12px; border: 1px solid #dee2e6; border-radius: 24px; outline: none; font-size: 14px; transition: border-color 0.2s ease;
  `;
  messageInput.onfocus = function () { messageInput.style.borderColor = currentTheme.button; };
  messageInput.onblur = function () { messageInput.style.borderColor = '#dee2e6'; };

  var sendBtn = d.createElement('button');
  sendBtn.textContent = 'Send';
  sendBtn.style.cssText = `
    background: ${currentTheme.button}; color: white; border: none; padding: 12px 20px; border-radius: 24px;
    cursor: pointer; font-weight: 500; font-size: 14px; transition: all 0.2s ease;
  `;
  sendBtn.onmouseenter = function () { sendBtn.style.opacity = '0.9'; sendBtn.style.transform = 'translateY(-1px)'; };
  sendBtn.onmouseleave = function () { sendBtn.style.opacity = '1'; sendBtn.style.transform = 'translateY(0)'; };

  inputContainer.appendChild(messageInput);
  inputContainer.appendChild(sendBtn);
  chatWindow.appendChild(header);
  chatWindow.appendChild(messagesContainer);
  chatWindow.appendChild(inputContainer);
  d.body.appendChild(chatWindow);

  messageInput.addEventListener('keypress', function (e) { if (e.key === 'Enter') sendMessage(); });
  sendBtn.onclick = sendMessage;

  function toggleChat() { isOpen ? closeChat() : openChat(); }
  function openChat() {
    if (isOpen) return;
    isOpen = true;
    chatWindow.style.display = 'flex';
    btn.setAttribute('aria-label', 'Close Document Assistant');
    if (!docLoaded) loadDocument();
    if (messagesContainer.children.length === 0) addMessage('assistant', cfg.welcomeMessage);
    setTimeout(function () { messageInput.focus(); }, 100);
  }
  function closeChat() {
    if (!isOpen) return;
    isOpen = false;
    chatWindow.style.display = 'none';
    btn.setAttribute('aria-label', 'Open Document Assistant');
  }

  function addMessage(role, content) {
    var row = d.createElement('div');
    row.style.cssText = `
      margin-bottom: 12px; display: flex; ${role === 'user' ? 'justify-content:flex-end;' : 'justify-content:flex-start;'} animation: fadeIn 0.3s ease-in;
    `;
    var bubble = d.createElement('div');
    bubble.textContent = content;
    bubble.style.cssText = `
      max-width:80%; padding:12px 16px; border-radius:18px; font-size:14px; line-height:1.4; word-wrap:break-word;
      ${role === 'user' ? `background:${currentTheme.button};color:#fff;margin-left:auto;` : 'background:#fff;color:#333;box-shadow:0 2px 8px rgba(0,0,0,0.1);'}
    `;
    row.appendChild(bubble);
    messagesContainer.appendChild(row);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  async function loadDocument() {
    if (!cfg.apiEndpoint) { addMessage('assistant', 'Configuration error: Missing API endpoint.'); return; }
    addMessage('assistant', 'Loading document, please wait...');

    var url = cfg.apiEndpoint + '/api/document';
    var qs = [];
    if (cfg.documentKey) qs.push('document_key=' + encodeURIComponent(cfg.documentKey));
    if (cfg.userId) qs.push('user_id=' + encodeURIComponent(cfg.userId));
    if (qs.length) url += '?' + qs.join('&');

    try {
      var response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load document from server');
      var apiResponse = await response.json();
      if (!apiResponse.isSuccess || !apiResponse.data || apiResponse.data.length === 0) throw new Error('No document found or invalid response');

      var documentData = apiResponse.data[0];
      documentUrl = documentData.document_url;
      if (!documentUrl) throw new Error('Document URL not found in response');

      var ext = documentData.file_name.toLowerCase().split('.').pop();
      if (ext === 'pdf') {
        try {
          var text = await openaiService.extractTextFromPDF(documentUrl, { maxPages: 300 });
          documentContent = capTextLength(text, MAX_DOC_CHARS);
          docLoaded = true;
          addMessage('assistant', 'PDF loaded, text extracted. Ask your question.');
        } catch (e) {
          console.error('PDF processing error:', e);
          documentContent = "PDF_URL:" + documentUrl;
          docLoaded = true;
          addMessage('assistant', 'PDF loaded, but text could not be extracted. I will try to help from the link, answers may be limited.');
        }
      } else {
        try {
          var contentResponse = await fetch(documentUrl);
          if (!contentResponse.ok) throw new Error('Failed to fetch document content');
          var txt = await contentResponse.text();
          documentContent = capTextLength(txt, MAX_DOC_CHARS);
          docLoaded = true;
          addMessage('assistant', 'Document content loaded successfully! You can now ask questions.');
        } catch (e) {
          console.error('Content fetch error:', e);
          documentContent = "DOCUMENT_URL:" + documentUrl;
          docLoaded = true;
          addMessage('assistant', 'Document loaded! You can now ask questions about its content.');
        }
      }
    } catch (error) {
      console.error('Document load error:', error);
      addMessage('assistant', 'Sorry, I could not load the document. Please check the configuration or try again later.');
    }
  }

  async function sendMessage() {
    var message = messageInput.value.trim();
    if (!message) return;
    if (!cfg.openaiApiKey) { addMessage('assistant', 'OpenAI API key is not configured properly.'); return; }
    if (!docLoaded) { addMessage('assistant', 'Document is still loading. Please wait a moment and try again.'); return; }

    addMessage('user', message);
    messageInput.value = '';

    var typingDiv = d.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.style.cssText = `
      margin-bottom:12px;color:#666;font-style:italic;font-size:14px;display:flex;align-items:center;gap:8px;
    `;
    var dots = d.createElement('div'); dots.innerHTML = '●●●'; dots.style.cssText = 'animation:pulse 1.5s ease-in-out infinite;';
    typingDiv.appendChild(d.createTextNode('Assistant is typing')); typingDiv.appendChild(dots);
    messagesContainer.appendChild(typingDiv); messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
      var lower = message.toLowerCase().trim();
      var isGreeting = /^(hi|hello|hey|good\s+(morning|afternoon|evening)|greetings?)$/i.test(lower);
      if (isGreeting) { removeTypingIndicator(); addMessage('assistant', "Hello! I'm your document assistant and I'm here to help you understand and find information in your document. What would you like to know about it?"); return; }

      var contextToUse = documentContent;
      if (documentContent.startsWith('PDF_URL:') || documentContent.startsWith('DOCUMENT_URL:') || contextToUse.includes("I'm ready to help answer questions")) {
        contextToUse += "\n\nNote: I'm a helpful assistant specialized in answering questions about documents. If you have specific questions about the document content, I'll do my best to help based on the information available.";
      }
      contextToUse = capTextLength(contextToUse, MAX_DOC_CHARS);

      sendBtn.disabled = true;
      var response = await openaiService.generateResponse(message, contextToUse, { model: "gpt-4o-mini", maxTokens: 600, temperature: 0.7 });
      removeTypingIndicator();
      addMessage('assistant', response);
    } catch (error) {
      console.error('Chat error:', error);
      removeTypingIndicator();
      var msg = 'Sorry, I encountered an error while processing your question. ';
      msg += error.message.includes('API key') ? 'Please check that your OpenAI API key is valid and has sufficient credits.' : 'Please try again in a moment.';
      addMessage('assistant', msg);
    } finally {
      sendBtn.disabled = false;
    }
  }

  var style = d.createElement('style');
  style.textContent = `
    @keyframes fadeIn { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
  `;
  d.head.appendChild(style);

  if (cfg.autostart) {
    if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', function () { setTimeout(openChat, 1000); });
    else setTimeout(openChat, 1000);
  }

  w.DocumentChatbot = { open: openChat, close: closeChat, toggle: toggleChat, isOpen: function () { return isOpen; }, loadDocument: loadDocument, addMessage: addMessage };
  console.log('Document Chatbot initialized with config:', cfg);
})();


