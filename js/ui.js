import { State } from './state.js';

export const UI = {
  els: {
    chatsList: document.getElementById('chatsList'),
    conversation: document.getElementById('conversation'),
    input: document.getElementById('input'),
    currentTitle: document.getElementById('currentTitle'),
    sendBtn: document.getElementById('sendBtn'),
    stopBtn: document.getElementById('stopBtn'),
    settingsDrawer: document.getElementById('settingsDrawer'),
    toast: document.getElementById('toast'),
    themeSelect: document.getElementById('themeSelect'),
  },

  init() {
    const renderer = new marked.Renderer();
    renderer.code = (code, language) => {
      const lang = (language || 'text').split(' ').shift();
      const validLang = !!(lang && hljs.getLanguage(lang)) ? lang : 'plaintext';
      const highlighted = hljs.highlight(code, { language: validLang }).value;
      return `<div class="code-wrapper">
                <div class="code-header">
                  <span class="code-lang">${lang}</span>
                  <button class="copy-btn" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(code)}')); this.textContent='Copied!'">Copy</button>
                </div>
                <pre><code class="hljs ${validLang}">${highlighted}</code></pre>
              </div>`;
    };
    marked.setOptions({ renderer });
    this.setTheme();
    if (this.els.input) {
      this.els.input.addEventListener('input', () => this.resizeInput());
      this.resizeInput(); 
    }

    setInterval(() => this.fetchHW(), 2000);
    this.fetchHW();
  },

  resizeInput() {
    const textarea = this.els.input;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  },

  setTheme() {
    const themes = ['dark', 'oled', 'midnight', 'playground', 'blossom', 'terminal', 'cotton-candy'];
    document.body.classList.remove(...themes);
    
    const activeTheme = State.settings.theme || 'dark';
    document.body.classList.add(activeTheme);
  },
  renderChatList(actions) {
    if (!actions) actions = window.ChatActions;
    this.els.chatsList.innerHTML = '';
    State.chats.forEach(chat => {
      const item = document.createElement('div');
      item.className = `chat-item ${chat.id === State.activeChatId ? 'active' : ''}`;
      item.innerHTML = `
        <div class="chat-info"><div class="chat-title">${this.escapeHtml(chat.title)}</div></div>
        <div class="chat-controls">
          <button class="rail-btn delete-trigger ${State.chatIdToDelete === chat.id ? 'confirm-delete-state' : ''}" title="${State.chatIdToDelete === chat.id ? 'Confirm Delete' : 'Delete Chat'}" style="width:24px;height:24px;color:#ef4444;background:none;border:none;cursor:pointer;">
            <i data-lucide="${State.chatIdToDelete === chat.id ? 'check' : 'trash-2'}" style="width:14px;"></i>
          </button>
        </div>`;
      item.addEventListener('click', () => actions.switchChat(chat.id));
      item.querySelector('.delete-trigger').addEventListener('click', (e) => {
        e.stopPropagation(); actions.requestChatDelete(chat.id);
      });
      this.els.chatsList.appendChild(item);
    });
    if(window.lucide) lucide.createIcons();
  },

  renderConversation(fullRedraw = false) {
    const chat = State.getActiveChat();
    if (!chat) return;
    if(this.els.currentTitle) this.els.currentTitle.textContent = chat.title;
    const container = this.els.conversation;

    if (fullRedraw) {
      container.innerHTML = '';
      chat.messages.forEach(msg => container.appendChild(this.createMessageBubble(msg)));
      this.scrollToBottom();
      if(window.lucide) lucide.createIcons();
      return;
    }

    const lastMsg = chat.messages[chat.messages.length - 1];
    const lastDom = container.lastElementChild;
    const typing = container.querySelector('.typing-indicator');
    if (typing) typing.remove();

    if (lastMsg && lastDom && lastDom.classList.contains(lastMsg.role === 'user' ? 'msg-user' : 'msg-assistant') && !lastDom.classList.contains('finalized')) {
      const content = lastDom.querySelector('.msg-content');
      content.innerHTML = marked.parse(lastMsg.content);
    } else if (lastMsg) {
      container.appendChild(this.createMessageBubble(lastMsg));
    }
    this.scrollToBottom();
    if(window.lucide) lucide.createIcons();
  },

  createMessageBubble(msg) {
    const div = document.createElement('div');
    div.className = `message ${msg.role === 'user' ? 'msg-user' : 'msg-assistant'}`;
    div.innerHTML = `<div class="msg-meta">${msg.role === 'user' ? 'You' : 'Assistant'}</div><div class="msg-content">${marked.parse(msg.content || '')}</div>`;
    return div;
  },

  showTypingIndicator() {
    const existing = this.els.conversation.querySelector('.typing-indicator');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.className = 'typing-indicator';
    div.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
    this.els.conversation.appendChild(div);
    this.scrollToBottom();
  },

  toggleGeneratingState(isGenerating) {
    State.isGenerating = isGenerating;
    if (isGenerating) {
      this.els.sendBtn.classList.add('hidden');
      this.els.stopBtn.classList.remove('hidden');
    } else {
      this.els.sendBtn.classList.remove('hidden');
      this.els.stopBtn.classList.add('hidden');
      const typing = this.els.conversation.querySelector('.typing-indicator');
      if (typing) typing.remove();
    }
    if(window.lucide) lucide.createIcons();
  },

  scrollToBottom() {
    const c = this.els.conversation;
    if ((c.scrollHeight - c.scrollTop - c.clientHeight < 150) || State.isGenerating) c.scrollTop = c.scrollHeight;
  },

  async fetchHW() {
    try {
      const res = await fetch('./stats.json', {cache: 'no-store'});
      if(!res.ok) return;
      const stats = await res.json();
      const cpu = Math.round(stats.cpu_percent || 0);
      const ram = Math.round(stats.ram_percent || 0);
      const temp = stats.temp_c ? Math.round(stats.temp_c) : null;
      const getColor = (n) => n < 60 ? '#ededed' : n < 85 ? '#f59e0b' : '#ef4444';
      
      const cpuEl = document.getElementById('cpuVal');
      const ramEl = document.getElementById('ramVal');
      const tmpEl = document.getElementById('tmpVal');

      if(cpuEl) cpuEl.innerHTML = `CPU <span style="color:${getColor(cpu)}">${cpu}%</span>`;
      if(ramEl) ramEl.innerHTML = `RAM <span style="color:${getColor(ram)}">${ram}%</span>`;
      if(tmpEl) {
        const tColor = temp ? getColor(temp) : '#777';
        tmpEl.innerHTML = `Temp <span style="color:${tColor}">${temp ? temp+'°C' : '—'}</span>`;
      }
    } catch(e) {}
  },
  
  escapeHtml(s) { return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); }
};
