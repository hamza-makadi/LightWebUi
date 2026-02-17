import { State } from './state.js';
import { UI } from './ui.js';

export const API = {
  async initializeModels() {
    try {
      const res = await fetch('/api/tags');
      const data = await res.json();
      const rawList = data.models || data.tags || [];
      State.availableModels = rawList.map(m => m.name || m);
      const saved = State.settings.model;
      if (!saved || !State.availableModels.includes(saved)) {
        State.settings.model = State.availableModels[0];
        State.saveSettings();
      }
      this.populateModelDropdown();
      return true;
    } catch (err) { return false; }
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

  async sendMessage(text, speakCallback) {
    const chat = State.getActiveChat();
    if (!chat) return;

    if (chat.messages.length === 0) {
      const words = text.split(/\s+/);
      chat.title = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
      UI.renderChatList(window.ChatActions); 
    }

    chat.messages.push({ role: 'user', content: text });
    State.saveChats();
    UI.renderConversation(true);
    UI.showTypingIndicator();
    UI.toggleGeneratingState(true);

    const payload = {
      model: chat.model || State.settings.model,
      messages: [{ role: 'system', content: chat.systemPrompt || State.settings.system }, ...chat.messages.slice(-10).map(m => ({ role: m.role, content: m.content }))]
    };

    State.abortController = new AbortController();
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: State.abortController.signal
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const json = JSON.parse(trimmed);
            const token = json.message?.content || json.response || '';
            if (token) {
              const typing = document.querySelector('.typing-indicator');
              if (typing) {
                typing.remove();
                chat.messages.push({ role: 'assistant', content: '' });
              }
              chat.messages[chat.messages.length - 1].content += token;
              UI.renderConversation(false);
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') chat.messages.push({ role: 'assistant', content: `Error: ${err.message}` });
    } finally {
      State.saveChats();
      UI.renderConversation(false);
      UI.toggleGeneratingState(false);
      const last = chat.messages[chat.messages.length - 1];
      if (State.settings.readAloud && last.role === 'assistant' && speakCallback) speakCallback(last.content);
    }
  }
};
