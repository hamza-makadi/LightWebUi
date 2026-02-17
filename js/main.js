import { State } from './state.js';
import { UI } from './ui.js';
import { API } from './api.js';

const Actions = {
  createNewChat() {
    const newChat = { id: Date.now().toString(36), title: 'New Chat', messages: [], createdAt: Date.now(), model: State.settings.model, systemPrompt: State.settings.system };
    State.chats.unshift(newChat);
    State.activeChatId = newChat.id;
    State.saveChats();
    UI.renderChatList(this);
    UI.renderConversation(true);
    UI.els.input.focus();
    document.getElementById('historyDrawer')?.classList.remove('open');
  },
  switchChat(id) {
    State.activeChatId = id;
    UI.renderChatList(this);
    UI.renderConversation(true);
    document.getElementById('historyDrawer')?.classList.remove('open');
  },
  deleteSpecificChat(id) {
    State.chats = State.chats.filter(c => c.id !== id);
    if(!State.chats.length) this.createNewChat();
    else if (State.activeChatId === id) State.activeChatId = State.chats[0].id;
    State.saveChats(); UI.renderChatList(this); UI.renderConversation(true);
    State.chatIdToDelete = null; // Clear pending delete state
  },
  requestChatDelete(id) {
    if (State.chatIdToDelete === id) { // Second click, confirm delete
      this.deleteSpecificChat(id);
    } else { // First click, request confirmation
      State.chatIdToDelete = id;
      UI.renderChatList(this); // Re-render to show confirmation state
      setTimeout(() => {
        if (State.chatIdToDelete === id) {
          State.chatIdToDelete = null;
          UI.renderChatList(this); // Revert confirmation state if no second click
        }
      }, 3000); // 3 seconds to confirm
    }
  },
  submitMessage() {
    const txt = UI.els.input.value.trim();
    if (!txt) return;
    UI.els.input.value = '';
    UI.els.input.style.height = 'auto';
    API.sendMessage(txt, Actions.speak);
  },
  stopGeneration() { if (State.abortController) { State.abortController.abort(); State.abortController = null; } },
  speak(text) {
    if(!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text.replace(/[*#`]/g, '')));
  },
  toggleMic() {
    if (!('webkitSpeechRecognition' in window)) return;
    if (!this.recognition) {
      this.recognition = new window.webkitSpeechRecognition();
      this.recognition.onresult = (e) => { UI.els.input.value += e.results[0][0].transcript; UI.els.input.focus(); };
      this.recognition.onend = () => document.getElementById('micBtn').classList.remove('active');
    }
    const btn = document.getElementById('micBtn');
    if (btn.classList.contains('active')) { this.recognition.stop(); btn.classList.remove('active'); }
    else { this.recognition.start(); btn.classList.add('active'); }
  }
};

window.setInput = (t) => { UI.els.input.value = t; UI.els.input.focus(); UI.els.input.style.height = UI.els.input.scrollHeight + 'px'; };
window.ChatActions = Actions;

async function boot() {
  State.loadLocal();
  UI.init();
  UI.renderChatList(Actions);
  
  document.getElementById('sendBtn')?.addEventListener('click', Actions.submitMessage);
  document.getElementById('stopBtn')?.addEventListener('click', Actions.stopGeneration);
  document.getElementById('newChatBtn')?.addEventListener('click', Actions.createNewChat);
  document.getElementById('micBtn')?.addEventListener('click', Actions.toggleMic);
  
  document.getElementById('exportDataBtn')?.addEventListener('click', State.exportData.bind(State));
  document.getElementById('clearDataBtn')?.addEventListener('click', State.resetData.bind(State));
  
  
  UI.els.input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && State.settings.enterToSend) { e.preventDefault(); Actions.submitMessage(); } });
  document.getElementById('settingsBtn')?.addEventListener('click', () => { UI.els.settingsDrawer.classList.remove('hidden'); API.populateModelDropdown(); });
  
  document.getElementById('closeSettingsDrawer')?.addEventListener('click', () => {
    UI.els.settingsDrawer.classList.add('hidden');
    
    // Update State from DOM
    State.settings.system = document.getElementById('systemInputSettings').value;
    State.settings.model = document.getElementById('modelSelect').value;
    State.settings.theme = document.getElementById('themeSelect').value;
    State.settings.readAloud = document.getElementById('readAloudToggle').checked;
    State.settings.enterToSend = document.getElementById('enterToSendToggle').checked;
    
    State.saveSettings();
    
    // Apply theme change immediately
    UI.setTheme();
    
    const chat = State.getActiveChat(); 
    if(chat) { chat.model = State.settings.model; State.saveChats(); }
  });

  const histBtn = document.getElementById('historyBtn');
  const histDrawer = document.getElementById('historyDrawer');
  if (histBtn && histDrawer) {
    histBtn.addEventListener('click', (e) => { e.stopPropagation(); histDrawer.classList.toggle('open'); });
    document.addEventListener('click', (e) => { if (!histDrawer.contains(e.target)) histDrawer.classList.remove('open'); });
  }

  await API.initializeModels();
  
  // Set initial settings values in the DOM
  document.getElementById('themeSelect').value = State.settings.theme || 'dark';
  document.getElementById('systemInputSettings').value = State.settings.system;
  document.getElementById('readAloudToggle').checked = !!State.settings.readAloud;
  document.getElementById('enterToSendToggle').checked = !!State.settings.enterToSend;

  if (!State.chats.length) Actions.createNewChat();
  else State.activeChatId = State.chats[0].id;
  UI.renderConversation(true);
}
boot();
