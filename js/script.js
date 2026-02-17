(() => {
  // --- CONFIGURATION ---
  const CONFIG = {
    LS_CHATS: 'zeroram_chats_v4', 
    LS_SETTINGS: 'zeroram_settings_v4',
    DEFAULT_SYSTEM: "You are a helpful assistant. Answer concisely.",
  };

  // --- STATE MANAGEMENT ---
  const State = {
    chats: [],
    activeChatId: null,
    availableModels: [], // We now store what models are actually valid
    settings: {
      system: CONFIG.DEFAULT_SYSTEM,
      model: null, // Will be set dynamically
      readAloud: false,
      enterToSend: true,
      theme: 'dark'
    },
    abortController: null,
    isGenerating: false,
    
    loadLocal() {
      try { State.chats = JSON.parse(localStorage.getItem(CONFIG.LS_CHATS) || '[]'); } catch(e){ State.chats = []; }
      try { 
        const s = JSON.parse(localStorage.getItem(CONFIG.LS_SETTINGS) || '{}'); 
        State.settings = {...State.settings, ...s}; 
      } catch(e){}
    },
    
    saveChats() { localStorage.setItem(CONFIG.LS_CHATS, JSON.stringify(State.chats)); },
    saveSettings() { localStorage.setItem(CONFIG.LS_SETTINGS, JSON.stringify(State.settings)); },
    getActiveChat() { return State.chats.find(c => c.id === State.activeChatId); }
  };

  // --- UI CONTROLLER ---
  const UI = {
    els: {
      chatsList: document.getElementById('chatsList'),
      conversation: document.getElementById('conversation'),
      input: document.getElementById('input'),
      currentTitle: document.getElementById('currentTitle'),
      sendBtn: document.getElementById('sendBtn'),
      stopBtn: document.getElementById('stopBtn'),
      settingsDrawer: document.getElementById('settingsDrawer'),
      hwPill: document.getElementById('hwPill'),
      toast: document.getElementById('toast'),
    },

    init() {
      const renderer = new marked.Renderer();
      renderer.code = (code, language) => {
        const lang = (language || 'text').split(' ').shift();
        const validLang = !!(lang && hljs.getLanguage(lang)) ? lang : 'plaintext';
        const highlighted = hljs.highlight(code, { language: validLang }).value;
        return `
          <div class="code-wrapper">
            <div class="code-header">
              <span class="code-lang">${lang}</span>
              <button class="copy-btn" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(code)}')); this.textContent='Copied!'">Copy</button>
            </div>
            <pre><code class="hljs ${validLang}">${highlighted}</code></pre>
          </div>`;
      };
      marked.setOptions({ renderer });
      setInterval(this.fetchHW, 2000);
      this.fetchHW();
      this.renderChatList();
      this.renderConversation(true);
      if(window.lucide) lucide.createIcons();
    },

    showFatalError(msg, details) {
      const div = document.createElement('div');
      div.style.cssText = "position:fixed;inset:0;background:#000;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;padding:20px;";
      div.innerHTML = `
        <div style="font-size:48px;margin-bottom:20px;">⚠️</div>
        <h2 style="margin-bottom:10px;">Ollama Connection Failed</h2>
        <p style="color:#888;max-width:400px;margin-bottom:30px;">${msg}</p>
        <div style="font-family:monospace;background:#111;padding:10px;border-radius:6px;margin-bottom:20px;color:#ef4444;">${details}</div>
        <button onclick="location.reload()" style="padding:10px 20px;background:#fff;color:#000;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Retry Connection</button>
      `;
      document.body.appendChild(div);
    },

    toast(msg, duration = 3000) {
      const t = UI.els.toast;
      t.textContent = msg;
      t.classList.remove('hidden');
      setTimeout(() => t.classList.add('hidden'), duration);
    },

    // --- RENDERERS ---

    renderChatList() {
      const list = UI.els.chatsList;
      list.innerHTML = '';
      State.chats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `chat-item ${chat.id === State.activeChatId ? 'active' : ''}`;
        item.innerHTML = `
          <div class="chat-info">
             <div class="chat-title">${this.escapeHtml(chat.title)}</div>
          </div>
          <div class="chat-controls">
             <button class="rail-btn rename-trigger" title="Rename" style="width:24px;height:24px;">
               <i data-lucide="pencil" style="width:14px;"></i>
             </button>
          </div>`;
        
        item.addEventListener('click', () => Actions.switchChat(chat.id));
        item.querySelector('.rename-trigger').addEventListener('click', (e) => {
          e.stopPropagation(); Actions.renameChat(chat.id);
        });
        list.appendChild(item);
      });
      if(window.lucide) lucide.createIcons();
    },

    renderConversation(fullRedraw = false) {
      const chat = State.getActiveChat();
      if (!chat) return;
      
      if(UI.els.currentTitle) UI.els.currentTitle.textContent = chat.title;
      const container = UI.els.conversation;

      if (fullRedraw) {
        container.innerHTML = '';
        chat.messages.forEach(msg => container.appendChild(this.createMessageBubble(msg)));
        this.scrollToBottom();
        if(window.lucide) lucide.createIcons();
        return;
      }

      const lastMsgObj = chat.messages[chat.messages.length - 1];
      const lastDomMsg = container.lastElementChild;
      const typingIndicator = container.querySelector('.typing-indicator');
      if (typingIndicator) typingIndicator.remove();

      if (!lastMsgObj) return;

      const isMatch = lastDomMsg && 
                      lastDomMsg.classList.contains(lastMsgObj.role === 'user' ? 'msg-user' : 'msg-assistant') &&
                      !lastDomMsg.classList.contains('finalized');

      if (isMatch) {
        const contentDiv = lastDomMsg.querySelector('.msg-content');
        contentDiv.innerHTML = marked.parse(lastMsgObj.content);
        contentDiv.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
      } else {
        container.appendChild(this.createMessageBubble(lastMsgObj));
      }

      this.scrollToBottom();
      if(window.lucide) lucide.createIcons();
    },

    createMessageBubble(msgObj) {
      const div = document.createElement('div');
      div.className = `message ${msgObj.role === 'user' ? 'msg-user' : 'msg-assistant'}`;
      div.innerHTML = `
        <div class="msg-meta">${msgObj.role === 'user' ? 'You' : 'Assistant'}</div>
        <div class="msg-content">${marked.parse(msgObj.content || '')}</div>`;
      div.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
      return div;
    },

    showTypingIndicator() {
      const div = document.createElement('div');
      div.className = 'typing-indicator';
      div.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
      UI.els.conversation.appendChild(div);
      this.scrollToBottom();
    },

    toggleGeneratingState(isGenerating) {
      State.isGenerating = isGenerating;
      if (isGenerating) {
        UI.els.sendBtn.classList.add('hidden');
        UI.els.stopBtn.classList.remove('hidden');
      } else {
        UI.els.sendBtn.classList.remove('hidden');
        UI.els.stopBtn.classList.add('hidden');
        const typing = UI.els.conversation.querySelector('.typing-indicator');
        if(typing) typing.remove();
      }
      if(window.lucide) lucide.createIcons();
    },

    scrollToBottom() {
      const c = UI.els.conversation;
      const threshold = 150;
      const isNearBottom = c.scrollHeight - c.scrollTop - c.clientHeight < threshold;
      if (isNearBottom || State.isGenerating) c.scrollTop = c.scrollHeight;
    },

    async fetchHW() {
      try {
        const res = await fetch('./stats.json', {cache: 'no-store'});
        if(!res.ok) return;
        const stats = await res.json();
        const cpu = Math.round(stats.cpu_percent || 0);
        const ram = Math.round(stats.ram_percent || 0);
        const temp = stats.temp_c ? Math.round(stats.temp_c) : null;

        document.getElementById('cpuVal').innerHTML = `CPU <span>${cpu}%</span>`;
        document.getElementById('ramVal').innerHTML = `RAM <span>${ram}%</span>`;
        document.getElementById('tmpVal').innerHTML = `${temp ? temp+'°C' : '—'}`;
        
        document.getElementById('cpuVal').style.color = UI.getColor(cpu);
        document.getElementById('ramVal').style.color = UI.getColor(ram);
        document.getElementById('tmpVal').style.color = temp ? UI.getColor(temp) : '#777';
      } catch(e) {}
    },

    getColor(n) { return n < 60 ? '#ededed' : n < 85 ? '#f59e0b' : '#ef4444'; },
    escapeHtml(s) { return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); }
  };

  // --- API HANDLER ---
  const API = {
    async initializeModels() {
      try {
        const res = await fetch('/api/tags');
        if (!res.ok) throw new Error("API not reachable");
        const data = await res.json();
        
        const rawList = data.models || data.tags || [];
        State.availableModels = rawList.map(m => m.name || m);

        if (State.availableModels.length === 0) {
            UI.showFatalError("No models found in Ollama.", "Run 'ollama pull llama2' in your terminal.");
            return false;
        }

        const saved = State.settings.model;
        if (!saved || !State.availableModels.includes(saved)) {
          State.settings.model = State.availableModels[0];
          State.saveSettings();
        }
        
        API.populateModelDropdown();
        return true;

      } catch (err) {
        UI.showFatalError("Could not connect to Ollama.", "Is Ollama running? Check your Nginx config.");
        console.error(err);
        return false;
      }
    },

    populateModelDropdown() {
      const select = document.getElementById('modelSelect');
      if(!select) return;
      select.innerHTML = '';
      State.availableModels.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m; opt.textContent = m;
        select.appendChild(opt);
      });
      select.value = State.settings.model;
    },

    async sendMessage(text) {
      const chat = State.getActiveChat();
      if (!chat) return;

      chat.messages.push({ role: 'user', content: text });
      State.saveChats();
      UI.renderConversation(true);
      UI.showTypingIndicator();
      UI.toggleGeneratingState(true);

      const history = chat.messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const payload = {
        model: chat.model || State.settings.model, // Uses the validated model
        messages: [
          { role: 'system', content: chat.systemPrompt || State.settings.system },
          ...history
        ]
      };

      State.abortController = new AbortController();

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: State.abortController.signal
        });

        if (!res.ok) throw new Error(`Ollama API Error: ${res.statusText}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        chat.messages.push({ role: 'assistant', content: '' });

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); 

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            let token = '';
            try {
              const json = JSON.parse(trimmed);
              token = json.message?.content || json.response || json.text || '';
            } catch (e) { token = trimmed; }
            
            if (token) {
              const lastMsg = chat.messages[chat.messages.length - 1];
              lastMsg.content += token;
              UI.renderConversation(false);
            }
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          const lastMsg = chat.messages[chat.messages.length - 1];
          lastMsg.content += " [Stopped]";
        } else {
          chat.messages.push({ role: 'assistant', content: `**Error:** ${err.message}` });
        }
      } finally {
        State.saveChats();
        UI.renderConversation(false);
        UI.toggleGeneratingState(false);
        const lastMsg = chat.messages[chat.messages.length - 1];
        if (State.settings.readAloud && lastMsg.role === 'assistant') Actions.speak(lastMsg.content);
      }
    }
  };

  // --- ACTIONS ---
  const Actions = {
    createNewChat() {
      const newChat = {
        id: Date.now().toString(36),
        title: 'New Chat',
        messages: [],
        createdAt: Date.now(),
        model: State.settings.model,
        systemPrompt: State.settings.system
      };
      State.chats.unshift(newChat);
      State.activeChatId = newChat.id;
      State.saveChats();
      UI.renderChatList();
      UI.renderConversation(true);
      UI.els.input.focus();
    },

    switchChat(id) {
      State.activeChatId = id;
      UI.renderChatList();
      UI.renderConversation(true);
      document.getElementById('historyDrawer')?.classList.remove('open');
    },

    renameChat(id) {
      const chat = State.chats.find(c => c.id === id);
      if(!chat) return;
      const newTitle = prompt("Rename chat:", chat.title);
      if (newTitle) {
        chat.title = newTitle;
        State.saveChats();
        UI.renderChatList();
        UI.renderConversation(false);
      }
    },

    submitMessage() {
      const txt = UI.els.input.value.trim();
      if (!txt) return;
      UI.els.input.value = '';
      UI.els.input.style.height = 'auto';
      API.sendMessage(txt);
    },

    stopGeneration() {
      if (State.abortController) {
        State.abortController.abort();
        State.abortController = null;
      }
    },

    speak(text) {
      if(!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const clean = text.replace(/[*#`]/g, ''); 
      const u = new SpeechSynthesisUtterance(clean);
      window.speechSynthesis.speak(u);
    },

    toggleMic() {
      if (!('webkitSpeechRecognition' in window)) return UI.toast("Voice not supported");
      const SR = window.webkitSpeechRecognition;
      
      if (!this.recognition) {
        this.recognition = new SR();
        this.recognition.continuous = false; 
        this.recognition.interimResults = false;
        
        this.recognition.onresult = (e) => {
          const t = e.results[0][0].transcript;
          UI.els.input.value += (UI.els.input.value ? ' ' : '') + t;
          UI.els.input.focus();
        };
        this.recognition.onend = () => document.getElementById('micBtn').classList.remove('active');
      }

      const btn = document.getElementById('micBtn');
      if (btn.classList.contains('active')) {
        this.recognition.stop();
        btn.classList.remove('active');
      } else {
        this.recognition.start();
        btn.classList.add('active');
      }
    }
  };

  // --- BOOTSTRAP ---
  async function boot() {
    State.loadLocal();
    
    const success = await API.initializeModels();
    if (!success) return; // Stop if fatal error

    if (!State.chats.length) Actions.createNewChat();
    else State.activeChatId = State.chats[0].id;

    UI.init();
    
    UI.els.sendBtn.addEventListener('click', Actions.submitMessage);
    UI.els.stopBtn.addEventListener('click', Actions.stopGeneration);
    document.getElementById('newChatBtn').addEventListener('click', Actions.createNewChat);
    document.getElementById('deleteBtn')?.addEventListener('click', () => { 
        if(confirm("Delete?")) {
             State.chats = State.chats.filter(c => c.id !== State.activeChatId);
             if(!State.chats.length) Actions.createNewChat();
             else State.activeChatId = State.chats[0].id;
             State.saveChats(); UI.renderChatList(); UI.renderConversation(true);
        }
    });
    document.getElementById('micBtn').addEventListener('click', () => Actions.toggleMic());
    
    UI.els.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && State.settings.enterToSend) {
        e.preventDefault(); Actions.submitMessage();
      }
    });
    
    document.getElementById('settingsBtn').addEventListener('click', () => {
       UI.els.settingsDrawer.classList.remove('hidden');
       API.populateModelDropdown();
    });
    document.getElementById('closeSettingsDrawer').addEventListener('click', () => {
       UI.els.settingsDrawer.classList.add('hidden');
       State.settings.system = document.getElementById('systemInputSettings').value;
       State.settings.model = document.getElementById('modelSelect').value; // Update model
       State.settings.readAloud = document.getElementById('readAloudToggle').checked;
       State.settings.enterToSend = document.getElementById('enterToSendToggle').checked;
       State.saveSettings();
       const chat = State.getActiveChat();
       if(chat) { chat.model = State.settings.model; State.saveChats(); }
    });
    
    document.getElementById('systemInputSettings').value = State.settings.system;
    document.getElementById('readAloudToggle').checked = State.settings.readAloud;
    document.getElementById('enterToSendToggle').checked = State.settings.enterToSend;
  }

  // Start
  boot();

})();
