import { CONFIG } from './config.js';

export const State = {
  chats: [],
  activeChatId: null,
  chatIdToDelete: null,
  availableModels: [],
  settings: {
    system: CONFIG.DEFAULT_SYSTEM,
    model: null,
    readAloud: false,
    enterToSend: true,
    theme: 'dark'
  },
  abortController: null,
  isGenerating: false,

  loadLocal() {
    try { this.chats = JSON.parse(localStorage.getItem(CONFIG.LS_CHATS) || '[]'); } catch(e) { this.chats = []; }
    try { 
      const s = JSON.parse(localStorage.getItem(CONFIG.LS_SETTINGS) || '{}'); 
      this.settings = { ...this.settings, ...s }; 
    } catch(e) {}
  },

  saveChats() { localStorage.setItem(CONFIG.LS_CHATS, JSON.stringify(this.chats)); },
  saveSettings() { localStorage.setItem(CONFIG.LS_SETTINGS, JSON.stringify(this.settings)); },
  getActiveChat() { return this.chats.find(c => c.id === this.activeChatId); },
  exportData() {
    const data = {
      chats: this.chats,
      settings: this.settings,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'webui-light-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  resetData() {
    if (confirm('Are you sure you want to delete all data? This cannot be undone.')) {
      localStorage.clear();
      location.reload();
    }
  }
};
