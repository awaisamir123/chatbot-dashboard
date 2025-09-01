// // import { supabase } from './supabase'
// import { supabase } from './supabaseClient'
// export interface ChatbotConfig {
//   documentKey: string
//   apiEndpoint: string
//   theme?: 'gradient' | 'blue' | 'dark'
//   position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
//   primaryColor?: string
//   welcomeMessage?: string
// }

// export const generateChatbotScript = (config: ChatbotConfig): string => {
//   const {
//     documentKey,
//     apiEndpoint,
//     theme = 'gradient',
//     position = 'bottom-right',
//     primaryColor = '#667eea',
//     welcomeMessage = 'Hi! I can help you with questions about the uploaded document.'
//   } = config

//   return `
// <!-- Document Chatbot Script - Generated for Document Key: ${documentKey} -->
// <script>
// (function() {
//   // Configuration
//   const CHATBOT_CONFIG = {
//     documentKey: "${documentKey}",
//     apiEndpoint: "${apiEndpoint}",
//     theme: "${theme}",
//     position: "${position}",
//     primaryColor: "${primaryColor}",
//     welcomeMessage: "${welcomeMessage}",
//     maxFileSize: 8 * 1024 * 1024,
//     allowedFormats: [".txt", ".pdf", ".docx", ".md"]
//   };

//   // Themes
//   const THEMES = {
//     gradient: {
//       primary: "bg-gradient-to-br from-blue-500 to-purple-600",
//       secondary: "bg-gradient-to-r from-blue-400 to-purple-500",
//       accent: "bg-blue-100",
//       text: "text-white"
//     },
//     blue: {
//       primary: "bg-blue-600",
//       secondary: "bg-blue-500",
//       accent: "bg-blue-50",
//       text: "text-white"
//     },
//     dark: {
//       primary: "bg-gray-800",
//       secondary: "bg-gray-700",
//       accent: "bg-gray-100",
//       text: "text-white"
//     }
//   };

//   // Positions
//   const POSITIONS = {
//     "bottom-right": "bottom-6 right-6",
//     "bottom-left": "bottom-6 left-6",
//     "top-right": "top-6 right-6",
//     "top-left": "top-6 left-6"
//   };

//   // Event Emitter
//   class EventEmitter {
//     constructor() { this.handlers = {} }
//     on(evt, cb) { (this.handlers[evt] = this.handlers[evt] || []).push(cb) }
//     emit(evt, payload) { (this.handlers[evt] || []).forEach(cb => { try { cb(payload) } catch(e) { console.error(e) } }) }
//   }

//   // Document Chatbot Class
//   class DocumentChatbot extends EventEmitter {
//     constructor(userApiKey) {
//       super();
//       this.userApiKey = userApiKey;
//       this.isOpen = false;
//       this.messages = [];
//       this.isTyping = false;
//       this.messageIdCounter = 1;
//       this.documentContent = null;
//       this.init();
//     }

//     init() {
//       this.loadTailwind();
//       this.createHTML();
//       this.cacheElements();
//       this.bindEvents();
//       this.addWelcomeMessage();
//       this.loadDocument();
//     }

//     loadTailwind() {
//       if (!document.querySelector('script[src*="tailwindcss"]')) {
//         const script = document.createElement('script');
//         script.src = 'https://cdn.tailwindcss.com';
//         document.head.appendChild(script);
//       }
//     }

//     createHTML() {
//       const theme = THEMES[CHATBOT_CONFIG.theme] || THEMES.gradient;
//       const position = POSITIONS[CHATBOT_CONFIG.position] || POSITIONS["bottom-right"];
      
//       const wrapper = document.createElement("div");
//       wrapper.id = "doc-chatbot-widget";
//       wrapper.innerHTML = \`
//         <!-- Floating Button -->
//         <div id="chat-toggle" class="fixed \${position} w-16 h-16 \${theme.primary} rounded-full shadow-2xl cursor-pointer transform hover:scale-110 transition-all duration-300 flex items-center justify-center z-[9999] pulse-glow">
//           <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
//           </svg>
//           <div class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-bounce"></div>
//         </div>

//         <!-- Chat Window -->
//         <div id="chat-window" class="fixed \${position} w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col z-[9998] hidden overflow-hidden border">
//           <!-- Header -->
//           <div class="\${theme.primary} p-4 \${theme.text}">
//             <div class="flex items-center justify-between">
//               <div class="flex items-center gap-3">
//                 <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
//                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
//                   </svg>
//                 </div>
//                 <div>
//                   <h3 class="font-semibold">Document Assistant</h3>
//                   <span class="text-xs opacity-75">Ready to help</span>
//                 </div>
//               </div>
//               <button id="close-chat" class="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors">
//                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
//                 </svg>
//               </button>
//             </div>
//           </div>

//           <!-- Messages -->
//           <div id="messages-container" class="flex-1 p-4 overflow-y-auto space-y-3" style="scrollbar-width: thin;"></div>

//           <!-- API Key Input (initially shown) -->
//           <div id="api-key-section" class="p-4 border-t bg-yellow-50">
//             <label class="block text-sm font-medium text-gray-700 mb-2">Enter your OpenAI API Key to start chatting:</label>
//             <div class="flex gap-2">
//               <input id="api-key-input" type="password" placeholder="sk-..." class="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
//               <button id="save-api-key" class="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">Save</button>
//             </div>
//             <p class="text-xs text-gray-500 mt-1">Your API key is stored locally and never sent to our servers.</p>
//           </div>

//           <!-- Chat Input (initially hidden) -->
//           <div id="chat-input-section" class="p-4 border-t bg-white hidden">
//             <div class="flex items-center gap-2">
//               <input id="message-input" type="text" placeholder="Ask me about the document..." class="flex-1 px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
//               <button id="send-message" class="px-4 py-2 \${theme.secondary} text-white rounded-xl hover:opacity-90 transition-opacity">Send</button>
//             </div>
//           </div>
//         </div>

//         <!-- Styles -->
//         <style>
//           #doc-chatbot-widget .pulse-glow {
//             animation: chatbot-pulse 2s ease-in-out infinite alternate;
//           }
//           @keyframes chatbot-pulse {
//             from { box-shadow: 0 0 18px rgba(99,102,241,.35); }
//             to { box-shadow: 0 0 28px rgba(99,102,241,.65); }
//           }
//           #doc-chatbot-widget .scrollbar-thin::-webkit-scrollbar { width: 6px; }
//           #doc-chatbot-widget .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
//           #doc-chatbot-widget .scrollbar-thin::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 3px; }
//         </style>
//       \`;
      
//       document.body.appendChild(wrapper);
//     }

//     cacheElements() {
//       const root = document.getElementById("doc-chatbot-widget");
//       this.elements = {
//         toggle: root.querySelector("#chat-toggle"),
//         window: root.querySelector("#chat-window"),
//         messages: root.querySelector("#messages-container"),
//         apiKeySection: root.querySelector("#api-key-section"),
//         apiKeyInput: root.querySelector("#api-key-input"),
//         saveApiKey: root.querySelector("#save-api-key"),
//         chatInputSection: root.querySelector("#chat-input-section"),
//         messageInput: root.querySelector("#message-input"),
//         sendButton: root.querySelector("#send-message"),
//         closeButton: root.querySelector("#close-chat")
//       };
//     }

//     bindEvents() {
//       this.elements.toggle.addEventListener("click", () => this.toggle());
//       this.elements.closeButton.addEventListener("click", () => this.close());
//       this.elements.saveApiKey.addEventListener("click", () => this.saveApiKey());
//       this.elements.sendButton.addEventListener("click", () => this.sendMessage());
//       this.elements.messageInput.addEventListener("keydown", (e) => {
//         if (e.key === "Enter") this.sendMessage();
//       });
//       this.elements.apiKeyInput.addEventListener("keydown", (e) => {
//         if (e.key === "Enter") this.saveApiKey();
//       });
//     }

//     async loadDocument() {
//       try {
//         const response = await fetch(\`\${CHATBOT_CONFIG.apiEndpoint}/api/document/\${CHATBOT_CONFIG.documentKey}\`);
//         if (!response.ok) throw new Error('Document not found');
        
//         const data = await response.json();
//         this.documentContent = data.content;
//         console.log('Document loaded successfully');
//       } catch (error) {
//         console.error('Failed to load document:', error);
//         this.addMessage('assistant', 'Error: Could not load the document. Please check if the document key is valid.');
//       }
//     }

//     saveApiKey() {
//       const apiKey = this.elements.apiKeyInput.value.trim();
//       if (!apiKey) {
//         alert('Please enter a valid OpenAI API key');
//         return;
//       }

//       if (!apiKey.startsWith('sk-')) {
//         alert('Invalid API key format. OpenAI keys start with "sk-"');
//         return;
//       }

//       this.userApiKey = apiKey;
//       localStorage.setItem('chatbot_openai_key', apiKey);
      
//       // Hide API key section, show chat input
//       this.elements.apiKeySection.classList.add('hidden');
//       this.elements.chatInputSection.classList.remove('hidden');
      
//       this.addMessage('assistant', 'Great! API key saved. You can now ask questions about the document.');
//     }

//     toggle() {
//       if (this.isOpen) {
//         this.close();
//       } else {
//         this.open();
//       }
//     }

//     open() {
//       this.elements.window.classList.remove("hidden");
//       this.isOpen = true;
      
//       // Check if API key is already saved
//       const savedKey = localStorage.getItem('chatbot_openai_key');
//       if (savedKey) {
//         this.userApiKey = savedKey;
//         this.elements.apiKeySection.classList.add('hidden');
//         this.elements.chatInputSection.classList.remove('hidden');
//       }
//     }

//     close() {
//       this.elements.window.classList.add("hidden");
//       this.isOpen = false;
//     }

//     addWelcomeMessage() {
//       this.addMessage('assistant', CHATBOT_CONFIG.welcomeMessage);
//     }

//     addMessage(role, text) {
//       const message = {
//         id: this.messageIdCounter++,
//         role,
//         text,
//         timestamp: new Date()
//       };
      
//       this.messages.push(message);
//       this.renderMessage(message);
//       this.scrollToBottom();
//     }

//     renderMessage(message) {
//       const isUser = message.role === 'user';
//       const messageDiv = document.createElement('div');
//       messageDiv.className = \`flex \${isUser ? 'justify-end' : 'justify-start'} w-full\`;
      
//       const bubble = document.createElement('div');
//       bubble.className = \`max-w-[80%] rounded-2xl px-3 py-2 text-sm \${
//         isUser 
//           ? 'bg-blue-600 text-white ml-auto' 
//           : 'bg-gray-100 text-gray-800'
//       }\`;
//       bubble.textContent = message.text;
      
//       const timeDiv = document.createElement('div');
//       timeDiv.className = \`text-[10px] text-gray-400 mt-1 \${isUser ? 'text-right' : 'text-left'}\`;
//       const time = message.timestamp;
//       const hh = time.getHours().toString().padStart(2, '0');
//       const mm = time.getMinutes().toString().padStart(2, '0');
//       timeDiv.textContent = \`\${hh}:\${mm}\`;
      
//       messageDiv.appendChild(bubble);
//       this.elements.messages.appendChild(messageDiv);
//       this.elements.messages.appendChild(timeDiv);
//     }

//     scrollToBottom() {
//       this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
//     }

//     setTyping(show) {
//       if (show && !this.typingElement) {
//         this.typingElement = document.createElement('div');
//         this.typingElement.className = 'text-xs text-gray-500 italic';
//         this.typingElement.textContent = 'Assistant is typing...';
//         this.elements.messages.appendChild(this.typingElement);
//         this.scrollToBottom();
//       } else if (!show && this.typingElement) {
//         this.typingElement.remove();
//         this.typingElement = null;
//       }
//     }

//     async sendMessage() {
//       const input = this.elements.messageInput;
//       const question = input.value.trim();
      
//       if (!question) return;
//       if (!this.userApiKey) {
//         alert('Please enter your OpenAI API key first');
//         return;
//       }
//       if (!this.documentContent) {
//         this.addMessage('assistant', 'Document is still loading. Please wait a moment and try again.');
//         return;
//       }

//       // Add user message
//       this.addMessage('user', question);
//       input.value = '';

//       try {
//         this.setTyping(true);
        
//         // Send request to your API
//         const response = await fetch(\`\${CHATBOT_CONFIG.apiEndpoint}/api/chat\`, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             question,
//             documentKey: CHATBOT_CONFIG.documentKey,
//             apiKey: this.userApiKey
//           })
//         });

//         if (!response.ok) {
//           throw new Error('Failed to get response from AI');
//         }

//         const data = await response.json();
//         this.setTyping(false);
//         this.addMessage('assistant', data.answer);

//       } catch (error) {
//         this.setTyping(false);
//         console.error('Chat error:', error);
//         this.addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
//       }
//     }
//   }

//   // Initialize chatbot when DOM is ready
//   if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', initChatbot);
//   } else {
//     initChatbot();
//   }

//   function initChatbot() {
//     // Check if chatbot is already initialized
//     if (window.docChatbotInstance) return;
    
//     window.docChatbotInstance = new DocumentChatbot();
//   }
// })();
// </script>

// <!-- End Document Chatbot Script -->`;
// }

// lib/chatbot-script.ts

// export interface ChatbotConfig {
//   documentKey: string
//   apiEndpoint: string
//   theme?: 'gradient' | 'blue' | 'dark'
//   position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
//   primaryColor?: string
//   welcomeMessage?: string
// }

// export const generateChatbotScript = (config: ChatbotConfig): string => {
//   const {
//     documentKey,
//     apiEndpoint,
//     theme = 'gradient',
//     position = 'bottom-right',
//     primaryColor = '#667eea',
//     // keep this neutral, no mention of the key
//     welcomeMessage = 'Hi, I can answer questions about your document.'
//   } = config

//   // helper for safe JS literals
//   const js = (v: string) => JSON.stringify(v)

//   return `
// <!-- Document Chatbot Script, key ${documentKey} -->
// <script>(function(){
//   const CHATBOT_CONFIG = {
//     documentKey: ${js(documentKey)},
//     apiEndpoint: ${js(apiEndpoint)},
//     theme: ${js(theme)},
//     position: ${js(position)},
//     primaryColor: ${js(primaryColor)},
//     welcomeMessage: ${js(welcomeMessage)},
//     maxFileSize: 8 * 1024 * 1024,
//     allowedFormats: [".txt", ".pdf", ".docx", ".md"]
//   };

//   const THEMES = {
//     gradient: { primary: "bg-gradient-to-br from-blue-500 to-purple-600", secondary: "bg-gradient-to-r from-blue-400 to-purple-500", accent: "bg-blue-100", text: "text-white" },
//     blue: { primary: "bg-blue-600", secondary: "bg-blue-500", accent: "bg-blue-50", text: "text-white" },
//     dark: { primary: "bg-gray-800", secondary: "bg-gray-700", accent: "bg-gray-100", text: "text-white" }
//   };
//   const POSITIONS = { "bottom-right":"bottom-6 right-6", "bottom-left":"bottom-6 left-6", "top-right":"top-6 right-6", "top-left":"top-6 left-6" };

//   class EventEmitter { constructor(){ this.handlers={} } on(e,cb){(this.handlers[e]=this.handlers[e]||[]).push(cb)} emit(e,p){(this.handlers[e]||[]).forEach(cb=>{try{cb(p)}catch(err){console.error(err)}})} }

//   class DocumentChatbot extends EventEmitter {
//     constructor(){
//       super();
//       this.userApiKey = null;
//       this.isOpen = false;
//       this.messages = [];
//       this.messageIdCounter = 1;
//       this.documentContent = null;
//       this.docTried = false; // do not fetch doc until the user opens chat
//       this.init();
//     }

//     init(){
//       if(!document.querySelector('script[src*="tailwindcss"]')){
//         const s=document.createElement('script'); s.src='https://cdn.tailwindcss.com'; document.head.appendChild(s);
//       }
//       this.createHTML();
//       this.cacheElements();
//       this.bindEvents();
//       this.addMessage('assistant', CHATBOT_CONFIG.welcomeMessage);
//       // do not loadDocument() here, wait until open()
//       // restore saved key if present
//       const saved = localStorage.getItem('chatbot_openai_key');
//       if(saved){
//         this.userApiKey = saved;
//         this.elements.apiKeySection.classList.add('hidden');
//         this.elements.chatInputSection.classList.remove('hidden');
//       }
//     }

//     createHTML(){
//       const theme = THEMES[CHATBOT_CONFIG.theme] || THEMES.gradient;
//       const position = POSITIONS[CHATBOT_CONFIG.position] || POSITIONS['bottom-right'];
//       const wrap = document.createElement('div');
//       wrap.id='doc-chatbot-widget';
//       wrap.innerHTML=\`
//         <div id="chat-toggle" class="fixed \${position} w-16 h-16 \${theme.primary} rounded-full shadow-2xl cursor-pointer transform hover:scale-110 transition-all duration-300 flex items-center justify-center z-[9999]">
//           <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
//         </div>

//         <div id="chat-window" class="fixed \${position} w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col z-[9998] hidden overflow-hidden border">
//           <div class="\${theme.primary} p-4 \${theme.text}">
//             <div class="flex items-center justify-between">
//               <div class="font-semibold">Document Assistant</div>
//               <button id="close-chat" class="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg grid place-items-center">
//                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
//               </button>
//             </div>
//           </div>

//           <div id="messages-container" class="flex-1 p-4 overflow-y-auto space-y-3" style="scrollbar-width: thin;"></div>

//           <!-- Only one input section, OpenAI key, no secret input -->
//           <div id="api-key-section" class="p-4 border-t bg-yellow-50">
//             <label class="block text-sm font-medium text-gray-700 mb-2">Enter your OpenAI API key</label>
//             <div class="flex gap-2">
//               <input id="api-key-input" type="password" placeholder="sk-..." class="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
//               <button id="save-api-key" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Save</button>
//             </div>
//             <p class="text-xs text-gray-500 mt-1">Stored locally in this browser</p>
//           </div>

//           <div id="chat-input-section" class="p-4 border-t bg-white hidden">
//             <div class="flex items-center gap-2">
//               <input id="message-input" type="text" placeholder="Ask me about the document..." class="flex-1 px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
//               <button id="send-message" class="px-4 py-2 \${theme.secondary} text-white rounded-xl hover:opacity-90">Send</button>
//             </div>
//           </div>
//         </div>

//         <style>
//           #doc-chatbot-widget .scrollbar-thin::-webkit-scrollbar{width:6px}
//           #doc-chatbot-widget .scrollbar-thin::-webkit-scrollbar-track{background:transparent}
//           #doc-chatbot-widget .scrollbar-thin::-webkit-scrollbar-thumb{background:#e5e7eb;border-radius:3px}
//         </style>
//       \`;
//       document.body.appendChild(wrap);
//     }

//     cacheElements(){
//       const r = document.getElementById('doc-chatbot-widget');
//       this.elements = {
//         toggle: r.querySelector('#chat-toggle'),
//         window: r.querySelector('#chat-window'),
//         messages: r.querySelector('#messages-container'),
//         apiKeySection: r.querySelector('#api-key-section'),
//         apiKeyInput: r.querySelector('#api-key-input'),
//         saveApiKey: r.querySelector('#save-api-key'),
//         chatInputSection: r.querySelector('#chat-input-section'),
//         messageInput: r.querySelector('#message-input'),
//         sendButton: r.querySelector('#send-message'),
//         closeButton: r.querySelector('#close-chat')
//       };
//     }

//     bindEvents(){
//       this.elements.toggle.addEventListener('click', () => this.toggle());
//       this.elements.closeButton.addEventListener('click', () => this.close());
//       this.elements.saveApiKey.addEventListener('click', () => this.saveApiKey());
//       this.elements.sendButton.addEventListener('click', () => this.sendMessage());
//       this.elements.messageInput.addEventListener('keydown', e => { if(e.key==='Enter') this.sendMessage() });
//       this.elements.apiKeyInput.addEventListener('keydown', e => { if(e.key==='Enter') this.saveApiKey() });
//     }

//     async loadDocumentOnce(){
//       if(this.docTried) return;
//       this.docTried = true;
//       try{
//         const res = await fetch(\`\${CHATBOT_CONFIG.apiEndpoint}/api/document/\${CHATBOT_CONFIG.documentKey}\`);
//         if(!res.ok) throw new Error('not ok');
//         const data = await res.json();
//         this.documentContent = data.content || '';
//       }catch(err){
//         // do not spam the chat on page load, show a single friendly line on open
//         this.addMessage('assistant', 'Error, could not load the document, please check the document key');
//       }
//     }

//     saveApiKey(){
//       const k = this.elements.apiKeyInput.value.trim();
//       if(!k){ alert('Please enter a valid OpenAI API key'); return }
//       if(!k.startsWith('sk-')){ alert('Invalid key format'); return }
//       this.userApiKey = k;
//       localStorage.setItem('chatbot_openai_key', k);
//       this.elements.apiKeySection.classList.add('hidden');
//       this.elements.chatInputSection.classList.remove('hidden');
//       this.addMessage('assistant', 'Great, key saved, you can ask now');
//     }

//     toggle(){ this.isOpen ? this.close() : this.open() }

//     async open(){
//       this.elements.window.classList.remove('hidden');
//       this.isOpen = true;
//       // fetch document when user opens the chat
//       if(!this.documentContent) await this.loadDocumentOnce();
//     }

//     close(){
//       this.elements.window.classList.add('hidden');
//       this.isOpen = false;
//     }

//     addMessage(role, text){
//       const m = { id: this.messageIdCounter++, role, text, timestamp: new Date() };
//       this.messages.push(m);
//       const row = document.createElement('div');
//       row.className = 'flex '+(role==='user'?'justify-end':'justify-start')+' w-full';
//       const b = document.createElement('div');
//       b.className = 'max-w-[80%] rounded-2xl px-3 py-2 text-sm '+(role==='user'?'bg-blue-600 text-white ml-auto':'bg-gray-100 text-gray-800');
//       b.textContent = text;
//       row.appendChild(b);
//       const t = document.createElement('div');
//       t.className = 'text-[10px] text-gray-400 mt-1 '+(role==='user'?'text-right':'text-left');
//       const hh = String(m.timestamp.getHours()).padStart(2,'0');
//       const mm = String(m.timestamp.getMinutes()).padStart(2,'0');
//       t.textContent = hh+':'+mm;
//       this.elements.messages.appendChild(row);
//       this.elements.messages.appendChild(t);
//       this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
//     }

//     async sendMessage(){
//       const input = this.elements.messageInput;
//       const q = input.value.trim();
//       if(!q) return;
//       if(!this.userApiKey){
//         this.elements.apiKeySection.classList.remove('hidden');
//         this.elements.chatInputSection.classList.add('hidden');
//         return;
//       }
//       if(!this.documentContent){
//         this.addMessage('assistant', 'Document is still loading, please try again in a moment');
//         return;
//       }
//       this.addMessage('user', q);
//       input.value = '';
//       try{
//         const res = await fetch(\`\${CHATBOT_CONFIG.apiEndpoint}/api/chat\`, {
//           method:'POST',
//           headers:{'Content-Type':'application/json'},
//           body: JSON.stringify({ question:q, documentKey: CHATBOT_CONFIG.documentKey, apiKey: this.userApiKey })
//         });
//         if(!res.ok) throw new Error('bad response');
//         const data = await res.json();
//         this.addMessage('assistant', data.answer || 'No response');
//       }catch(err){
//         this.addMessage('assistant', 'Sorry, I hit an error, please try again');
//       }
//     }
//   }

//   if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', initChatbot) } else { initChatbot() }
//   function initChatbot(){ if(window.docChatbotInstance) return; window.docChatbotInstance = new DocumentChatbot() }
// })();</script>
// <!-- End Document Chatbot Script -->
// `
// }



// lib/chatbot-script.ts

// lib/chatbot-script.ts
export interface ChatbotConfig {
    documentKey: string
    apiEndpoint: string
    theme?: 'gradient' | 'blue' | 'dark'
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    primaryColor?: string
    welcomeMessage?: string
  }
  
  export const generateChatbotScript = (config: ChatbotConfig): string => {
    const {
      documentKey,
      apiEndpoint,
      theme = 'gradient',
      position = 'bottom-right',
      primaryColor = '#667eea',
      welcomeMessage = 'Hi, I can answer questions about your document.'
    } = config
  
    const js = (v: string) => JSON.stringify(v)
  
    return `
  <!-- Document Chatbot Script, key ${documentKey} -->
  <script>(function(){
    // REQUIRED, paste your OpenAI key then publish your page
    // Example, const OPENAI_KEY = "sk-abc123...";
    const OPENAI_KEY = "sk-PASTE_YOUR_OPENAI_KEY_HERE";
  
    const C = {
      documentKey: ${js(documentKey)},
      apiEndpoint: ${js(apiEndpoint)},
      theme: ${js(theme)},
      position: ${js(position)},
      primaryColor: ${js(primaryColor)},
      welcomeMessage: ${js(welcomeMessage)}
    };
  
    if (document.getElementById('doc-chatbot-widget')) return;
  
    if (!document.querySelector('script[src*="tailwindcss"]')) {
      const t = document.createElement('script'); t.src = 'https://cdn.tailwindcss.com'; document.head.appendChild(t);
    }
  
    const THEMES = {
      gradient:{ primary:"bg-gradient-to-br from-blue-500 to-purple-600", secondary:"bg-gradient-to-r from-blue-400 to-purple-500", text:"text-white" },
      blue:{ primary:"bg-blue-600", secondary:"bg-blue-500", text:"text-white" },
      dark:{ primary:"bg-gray-800", secondary:"bg-gray-700", text:"text-white" }
    };
    const POS = { "bottom-right":"bottom-6 right-6", "bottom-left":"bottom-6 left-6", "top-right":"top-6 right-6", "top-left":"top-6 left-6" };
  
    class Chatbot {
      constructor(){
        this.key = (OPENAI_KEY || "").trim();
        this.docLoaded = false;
        this.documentContent = "";
        this.makeUI(); this.cache(); this.bind();
        const ok = /^sk-/.test(this.key);
        this.showLauncher(ok);
        if (!ok) console.error('[Document Assistant] OpenAI key missing in the embed script.');
      }
  
      makeUI(){
        const t = THEMES[C.theme] || THEMES.gradient;
        const p = POS[C.position] || POS['bottom-right'];
        const root = document.createElement('div');
        root.id = 'doc-chatbot-widget';
        root.innerHTML = \`
          <div id="chat-toggle" class="fixed \${p} w-16 h-16 \${t.primary} rounded-full shadow-2xl cursor-pointer transform hover:scale-110 transition-all duration-300 flex items-center justify-center z-[9999]" style="display:none">
            <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
          </div>
  
          <div id="chat-window" class="fixed \${p} w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col z-[9998] overflow-hidden border" style="display:none">
            <div class="\${t.primary} p-4 \${t.text}">
              <div class="flex items-center justify-between">
                <div class="font-semibold">Document Assistant</div>
                <button id="close-chat" class="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg grid place-items-center">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
  
            <div id="messages" class="flex-1 p-4 overflow-y-auto space-y-3"></div>
  
            <div id="chat-input" class="p-4 border-t bg-white">
              <div class="flex items-center gap-2">
                <input id="q" type="text" placeholder="Ask me about the document..." class="flex-1 px-3 py-2 border rounded-xl">
                <button id="send" class="px-4 py-2 \${t.secondary} text-white rounded-xl">Send</button>
              </div>
            </div>
          </div>
        \`;
        document.body.appendChild(root);
      }
  
      cache(){
        const r = document.getElementById('doc-chatbot-widget');
        this.el = {
          toggle: r.querySelector('#chat-toggle'),
          win: r.querySelector('#chat-window'),
          close: r.querySelector('#close-chat'),
          msgs: r.querySelector('#messages'),
          q: r.querySelector('#q'),
          send: r.querySelector('#send')
        };
      }
  
      bind(){
        this.el.toggle.addEventListener('click', () => this.open());
        this.el.close.addEventListener('click', () => this.close());
        this.el.send.addEventListener('click', () => this.send());
        this.el.q.addEventListener('keydown', e => { if (e.key === 'Enter') this.send() });
      }
  
      showLauncher(show){ this.el.toggle.style.display = show ? 'flex' : 'none' }
  
      async open(){
        this.el.win.style.display = 'flex';
        if (!this.docLoaded) await this.loadDoc();
        if (this.el.msgs.childElementCount === 0) this.add('assistant', C.welcomeMessage);
      }
  
      close(){ this.el.win.style.display = 'none' }
  
      add(role, text){
        const row = document.createElement('div');
        row.className = 'flex ' + (role==='user'?'justify-end':'justify-start') + ' w-full';
        const b = document.createElement('div');
        b.className = 'max-w-[80%] rounded-2xl px-3 py-2 text-sm ' + (role==='user'?'bg-blue-600 text-white ml-auto':'bg-gray-100 text-gray-800');
        b.textContent = text;
        row.appendChild(b);
        this.el.msgs.appendChild(row);
        const t = document.createElement('div');
        t.className = 'text-[10px] text-gray-400 mt-1 ' + (role==='user'?'text-right':'text-left');
        const d = new Date(), hh=String(d.getHours()).padStart(2,'0'), mm=String(d.getMinutes()).padStart(2,'0');
        t.textContent = hh + ':' + mm;
        this.el.msgs.appendChild(t);
        this.el.msgs.scrollTop = this.el.msgs.scrollHeight;
      }
  
      async loadDoc(){
        try{
          const res = await fetch(C.apiEndpoint + '/api/document/' + C.documentKey);
          if (!res.ok) throw new Error('not ok');
          const data = await res.json();
          this.documentContent = data.content || '';
          this.docLoaded = true;
        }catch(e){
          this.add('assistant', 'Error, could not load the document, please check the document key');
        }
      }
  
      async send(){
        const q = this.el.q.value.trim();
        if (!q) return;
  
        if (!this.key) { this.add('assistant', 'Missing OpenAI key in the embed script.'); return }
        if (!this.docLoaded) { this.add('assistant', 'Document is still loading, please try again in a moment'); return }
  
        this.add('user', q);
        this.el.q.value = '';
  
        try{
          const res = await fetch(C.apiEndpoint + '/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: q, documentKey: C.documentKey, apiKey: this.key })
          });
          if (!res.ok) throw new Error('bad response');
          const data = await res.json();
          this.add('assistant', data.answer || 'No response');
        }catch(e){
          this.add('assistant', 'Sorry, I hit an error, please try again');
        }
      }
    }
  
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init) } else { init() }
    function init(){ if (window.docChatbotInstance) return; window.docChatbotInstance = new Chatbot() }
  })();</script>
  <!-- End Document Chatbot Script -->
  `
  }
  