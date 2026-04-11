document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();

  const sidebar = document.getElementById('sidebar');
  const openSidebarBtn = document.getElementById('openSidebarBtn');
  const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const chatList = document.getElementById('chatList');
  const chatArea = document.getElementById('chatArea');
  const messageForm = document.getElementById('messageForm');
  const userInput = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');
  const newChatBtn = document.getElementById('newChatBtn');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const themeSelector = document.getElementById('themeSelector');
  const layoutChips = document.querySelectorAll('.layout-chip');
  const profileAvatar = document.getElementById('profileAvatar');
  const avatarNameInput = document.getElementById('avatarName');
  const currentChatTitle = document.getElementById('currentChatTitle');
  const currentModelLabel = document.getElementById('currentModelLabel');
  const settingsModelLabel = document.getElementById('settingsModelLabel');
  const colorPicker = document.getElementById('colorPicker');
  const backgroundColorPicker = document.getElementById('backgroundColorPicker');
  const panelColorPicker = document.getElementById('panelColorPicker');
  const textColorPicker = document.getElementById('textColorPicker');
  const aiTextColorPicker = document.getElementById('aiTextColorPicker');
  const resetColorsBtn = document.getElementById('resetColorsBtn');
  const chatSearchInput = document.getElementById('chatSearchInput');
  const chatCountLabel = document.getElementById('chatCountLabel');
  const emptyState = document.getElementById('emptyState');

  const state = {
    chats: [],
    currentChatId: null,
    settings: {
      theme: 'verde',
      layout: 'spacious',
      avatarName: 'Usuário',
      lastModel: 'mistral:7b',
      primaryColor: '#22c55e',
      backgroundColor: '#0f172a',
      panelColor: '#04070f',
      textColor: '#e2e8f0',
      aiTextColor: '#60a5fa'
    }
  };

  const themeMap = {
    verde: {
      accent: '#22c55e',
      accentSoft: 'rgba(34,197,94,0.18)',
      surface: '#0b1220',
      surfaceSoft: 'rgba(15,23,42,0.95)',
      panel: 'rgba(7,10,17,0.96)',
      border: 'rgba(148,163,184,0.12)',
      text: '#e2e8f0',
      aiText: '#60a5fa',
      muted: '#94a3b8'
    },
    azul: {
      accent: '#3b82f6',
      accentSoft: 'rgba(59,130,246,0.18)',
      surface: '#07122b',
      surfaceSoft: 'rgba(15,23,42,0.95)',
      panel: 'rgba(6,14,32,0.96)',
      border: 'rgba(148,163,184,0.12)',
      text: '#e2e8f0',
      aiText: '#60a5fa',
      muted: '#94a3b8'
    },
    roxo: {
      accent: '#8b5cf6',
      accentSoft: 'rgba(139,92,246,0.18)',
      surface: '#120e30',
      surfaceSoft: 'rgba(19,12,47,0.95)',
      panel: 'rgba(10,8,28,0.96)',
      border: 'rgba(148,163,184,0.12)',
      text: '#e2e8f0',
      aiText: '#60a5fa',
      muted: '#94a3b8'
    }
  };

  function createChat(name) {
    return {
      id: crypto.randomUUID?.() || String(Date.now()),
      name,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      messages: [],
      customTitle: false
    };
  }

  function normalizeChatTitle(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return 'Chat sem título';
    const firstLine = trimmed.split('\n')[0];
    const words = firstLine.split(' ').filter(Boolean);
    if (words.length <= 5) return firstLine;
    return `${words.slice(0, 5).join(' ')}...`;
  }

  function maybeAutoRenameChat(chat, text) {
    if (chat.customTitle) return;
    const title = normalizeChatTitle(text);
    if (title && title !== chat.name) {
      chat.name = title;
    }
  }

  function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function saveState() {
    localStorage.setItem('chromaLlamaState', JSON.stringify(state));
  }

  function loadState() {
    const saved = localStorage.getItem('chromaLlamaState');
    if (saved) {
      try { Object.assign(state, JSON.parse(saved)); } catch { console.warn('Falha ao carregar estado salvo.'); }
    }
    if (!state.chats || !state.chats.length) {
      const initial = createChat('Chat Principal');
      initial.messages.push({ sender: 'ai', text: 'Olá! Eu sou seu assistente Llama. Comece perguntando algo ou crie um novo chat.', time: new Date().toISOString() });
      state.chats = [initial];
      state.currentChatId = initial.id;
    }
    if (!state.currentChatId) state.currentChatId = state.chats[0]?.id;
    applySettings();
    applyThemeSettings();
  }

  function applySettings() {
    updateTheme();
    updateLayout();
    updateProfileAvatar();
    updateModelLabels(state.settings.lastModel);
    if (avatarNameInput.value.trim() !== state.settings.avatarName.trim()) {
      avatarNameInput.value = state.settings.avatarName;
    }
  }

  function updateModelLabels(model) {
    currentModelLabel.textContent = model;
    settingsModelLabel.textContent = `Modelo usado: ${model}`;
  }

  function updateTheme() {
    const theme = themeMap[state.settings.theme] || themeMap.verde;
    const primary = state.settings.primaryColor || theme.accent;
    document.documentElement.style.setProperty('--accent', primary);
    document.documentElement.style.setProperty('--accent-soft', `${primary}22`);
    document.documentElement.style.setProperty('--surface', state.settings.backgroundColor || theme.surface);
    document.documentElement.style.setProperty('--surface-soft', theme.surfaceSoft);
    document.documentElement.style.setProperty('--panel', state.settings.panelColor || theme.panel);
    document.documentElement.style.setProperty('--border', theme.border);
    document.documentElement.style.setProperty('--text', state.settings.textColor || theme.text);
    document.documentElement.style.setProperty('--ai-text', state.settings.aiTextColor || theme.aiText);
    document.documentElement.style.setProperty('--muted', theme.muted);
    document.querySelectorAll('.theme-chip').forEach(btn => {
      btn.classList.toggle('theme-active', btn.dataset.theme === state.settings.theme);
    });
    if (colorPicker) colorPicker.value = state.settings.primaryColor;
    if (backgroundColorPicker) backgroundColorPicker.value = state.settings.backgroundColor;
    if (panelColorPicker) panelColorPicker.value = state.settings.panelColor;
    if (textColorPicker) textColorPicker.value = state.settings.textColor;
    if (aiTextColorPicker) aiTextColorPicker.value = state.settings.aiTextColor;
  }

  function updateLayout() {
    document.body.classList.toggle('layout-compact', state.settings.layout === 'compact');
    document.body.classList.toggle('layout-spacious', state.settings.layout === 'spacious');
    layoutChips.forEach(btn => {
      btn.classList.toggle('theme-active', btn.dataset.layout === state.settings.layout);
    });
  }

  function updateProfileAvatar() {
    const name = state.settings.avatarName.trim() || 'Usuário';
    profileAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=27272a&color=fff&rounded=true`;
    profileAvatar.alt = name;
  }

  function applyThemeSettings() {
    updateTheme();
  }

  function renderChatList() {
    chatList.innerHTML = '';
    const searchValue = chatSearchInput?.value.trim().toLowerCase() || '';
    const filteredChats = state.chats.filter(chat => chat.name.toLowerCase().includes(searchValue) || chat.messages.some(m => m.text.toLowerCase().includes(searchValue)));
    const hasSearch = Boolean(searchValue);
    const visibleChats = hasSearch ? filteredChats : state.chats;
    chatCountLabel.textContent = `${visibleChats.length} chat${visibleChats.length === 1 ? '' : 's'}`;

    if (!visibleChats.length) {
      const empty = document.createElement('div');
      empty.className = 'rounded-3xl border border-zinc-800/70 bg-[#0b1220]/90 p-4 text-sm text-zinc-500';
      empty.textContent = hasSearch ? 'Nenhum chat corresponde à pesquisa.' : 'Não há chats disponíveis.';
      chatList.appendChild(empty);
      return;
    }

    visibleChats.forEach(chat => {
      const active = chat.id === state.currentChatId;
      const lastMessage = chat.messages.slice(-1)[0];
      const item = document.createElement('div');
      item.className = `w-full rounded-3xl p-4 transition ${active ? 'bg-zinc-900/95 border border-[var(--accent)]/40' : 'bg-[#08101d]/90 hover:bg-[#101928]/95'}`;
      item.innerHTML = `
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0 cursor-pointer">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f172a] border border-zinc-800 text-sm font-semibold text-zinc-100">${chat.name.slice(0, 2).toUpperCase()}</div>
            <div class="min-w-0">
              <p class="truncate font-semibold text-white">${chat.name}</p>
              <p class="truncate text-xs text-zinc-500">${lastMessage ? `${lastMessage.sender === 'ai' ? 'Llama:' : 'Você:'} ${lastMessage.text.slice(0, 30)}` : 'Nova conversa'}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[11px] text-zinc-500">${lastMessage ? formatTime(lastMessage.time) : ''}</span>
            <button class="rename-chat-btn rounded-full p-2 text-zinc-400 hover:text-white transition" title="Renomear chat">
              <i data-lucide="edit-2" class="w-4 h-4"></i>
            </button>
            <button class="delete-chat-btn rounded-full p-2 text-zinc-400 hover:text-white transition" title="Apagar chat">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>`;
      item.querySelector('.rename-chat-btn').addEventListener('click', event => {
        event.stopPropagation();
        renameChat(chat.id);
      });
      item.querySelector('.delete-chat-btn').addEventListener('click', event => {
        event.stopPropagation();
        deleteChat(chat.id);
      });
      item.addEventListener('click', () => selectChat(chat.id));
      chatList.appendChild(item);
    });

    lucide.createIcons();
  }

  function renderMessages() {
    const chat = state.chats.find(item => item.id === state.currentChatId);
    if (!chat) return;
    currentChatTitle.textContent = chat.name;
    chatArea.innerHTML = '';
    if (!chat.messages.length) {
      chatArea.appendChild(emptyState);
      emptyState.classList.remove('hidden');
      return;
    }
    chat.messages.forEach(message => {
      const wrapper = document.createElement('div');
      wrapper.className = `message-card ${message.sender === 'user' ? 'flex-row-reverse user' : 'ai'}`;
      wrapper.innerHTML = `
        <div class="flex-shrink-0">
          <div class="relative flex h-11 w-11 items-center justify-center rounded-2xl border ${message.sender === 'user' ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200' : 'border-zinc-800/70 bg-zinc-900/80 text-zinc-400'} text-sm font-semibold">
            ${message.sender === 'user' ? 'EU' : 'AI'}
          </div>
        </div>
        <div class="flex-1">
          <div class="message-bubble message-${message.sender}">
            <div class="mb-3 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.3em] text-zinc-500">
              <span>${message.sender === 'user' ? 'Você' : 'Llama'}</span>
              <span>${formatTime(message.time)}</span>
            </div>
            <div class="text-sm leading-7 ${message.sender === 'user' ? 'text-white' : 'text-zinc-200'}">
              ${message.loading ? '<span class="message-loading"><span></span><span></span><span></span></span>' : message.text.replace(/\n/g, '<br>')}
            </div>
          </div>
        </div>`;
      chatArea.appendChild(wrapper);
    });
    emptyState.classList.add('hidden');
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function selectChat(id) {
    state.currentChatId = id;
    saveState();
    renderChatList();
    renderMessages();
  }

  function renameChat(id) {
    const chat = state.chats.find(c => c.id === id);
    if (!chat) return;
    const newName = prompt('Digite o novo nome do chat:', chat.name);
    if (!newName) return;
    chat.name = newName.trim();
    chat.customTitle = true;
    saveState();
    renderChatList();
    if (chat.id === state.currentChatId) renderMessages();
  }

  function deleteChat(id) {
    if (state.chats.length === 1) {
      alert('Não é possível apagar o último chat.');
      return;
    }
    const index = state.chats.findIndex(c => c.id === id);
    if (index === -1) return;
    state.chats.splice(index, 1);
    if (state.currentChatId === id) {
      state.currentChatId = state.chats[0].id;
    }
    saveState();
    renderChatList();
    renderMessages();
  }

  function addNewChat() {
    const name = `Novo Chat ${state.chats.length + 1}`;
    const chat = createChat(name);
    chat.messages.push({ sender: 'ai', text: 'Novo chat criado! Faça sua pergunta para começar.', time: new Date().toISOString() });
    state.chats.unshift(chat);
    state.currentChatId = chat.id;
    saveState();
    renderChatList();
    renderMessages();
  }

  function clearCurrentChat() {
    const chat = state.chats.find(item => item.id === state.currentChatId);
    if (!chat) return;
    if (!confirm('Deseja limpar todas as mensagens deste chat?')) return;
    chat.messages = [{ sender: 'ai', text: 'Chat limpo. Faça sua pergunta para começar novamente.', time: new Date().toISOString() }];
    saveState();
    renderChatList();
    renderMessages();
  }

  function setLoading(value) {
    sendBtn.disabled = value;
    userInput.disabled = value;
    document.body.style.cursor = value ? 'wait' : '';
  }

  async function sendMessage(text) {
    const chat = state.chats.find(item => item.id === state.currentChatId);
    if (!chat) return;
    const userMessage = { id: crypto.randomUUID?.() || `${Date.now()}_user`, sender: 'user', text, time: new Date().toISOString() };
    const typingMessage = { id: 'typing', sender: 'ai', text: '', time: new Date().toISOString(), loading: true };
    chat.messages.push(userMessage, typingMessage);
    saveState();
    renderChatList();
    renderMessages();
    setLoading(true);

    try {
      const response = await fetch('/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text, session_id: chat.id })
      });
      const data = await response.json();
      const answer = data.answer || 'Não foi possível gerar resposta no momento.';
      const index = chat.messages.findIndex(item => item.id === 'typing');
      if (index >= 0) {
        chat.messages[index] = { id: `response-${Date.now()}`, sender: 'ai', text: answer, time: new Date().toISOString(), loading: false };
      }
      if (data?.model) {
        state.settings.lastModel = data.model;
        updateModelLabels(data.model);
      }
      chat.lastUsed = new Date().toISOString();
      saveState();
      renderChatList();
      renderMessages();
    } catch (error) {
      const index = chat.messages.findIndex(item => item.id === 'typing');
      if (index >= 0) {
        chat.messages[index] = { id: `error-${Date.now()}`, sender: 'ai', text: 'Erro de conexão, tente novamente.', time: new Date().toISOString(), loading: false };
      }
      saveState();
      renderMessages();
    } finally {
      setLoading(false);
    }
  }

  messageForm.addEventListener('submit', event => {
    event.preventDefault();
    const message = userInput.value.trim();
    if (!message || sendBtn.disabled) return;
    userInput.value = '';
    sendMessage(message);
  });

  newChatBtn.addEventListener('click', addNewChat);
  if (clearChatBtn) clearChatBtn.addEventListener('click', clearCurrentChat);

  toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.add('sidebar-hidden');
    openSidebarBtn.classList.remove('hidden');
  });

  openSidebarBtn.addEventListener('click', () => {
    sidebar.classList.remove('sidebar-hidden');
    openSidebarBtn.classList.add('hidden');
  });

  const showSettingsPanel = () => {
    settingsPanel.classList.add('settings-open');
    settingsPanel.style.transform = 'translateX(0)';
  };

  const hideSettingsPanel = () => {
    settingsPanel.classList.remove('settings-open');
    settingsPanel.style.transform = '';
  };

  openSettingsBtn.addEventListener('click', showSettingsPanel);
  closeSettingsBtn.addEventListener('click', hideSettingsPanel);

  themeSelector.addEventListener('click', event => {
    const button = event.target.closest('.theme-chip');
    if (!button) return;
    const theme = themeMap[button.dataset.theme];
    state.settings.theme = button.dataset.theme;
    state.settings.primaryColor = theme.accent;
    state.settings.backgroundColor = theme.surface;
    state.settings.panelColor = theme.panel;
    state.settings.textColor = theme.text;
    state.settings.aiTextColor = theme.aiText;
    updateTheme();
    saveState();
  });

  layoutChips.forEach(button => {
    button.addEventListener('click', () => {
      state.settings.layout = button.dataset.layout;
      updateLayout();
      saveState();
    });
  });

  avatarNameInput.addEventListener('change', () => {
    state.settings.avatarName = avatarNameInput.value;
    updateProfileAvatar();
    saveState();
  });

  if (colorPicker) {
    colorPicker.addEventListener('input', () => {
      state.settings.primaryColor = colorPicker.value;
      updateTheme();
      saveState();
    });
  }

  if (backgroundColorPicker) {
    backgroundColorPicker.addEventListener('input', () => {
      state.settings.backgroundColor = backgroundColorPicker.value;
      updateTheme();
      saveState();
    });
  }

  if (panelColorPicker) {
    panelColorPicker.addEventListener('input', () => {
      state.settings.panelColor = panelColorPicker.value;
      updateTheme();
      saveState();
    });
  }

  if (textColorPicker) {
    textColorPicker.addEventListener('input', () => {
      state.settings.textColor = textColorPicker.value;
      updateTheme();
      saveState();
    });
  }

  if (aiTextColorPicker) {
    aiTextColorPicker.addEventListener('input', () => {
      state.settings.aiTextColor = aiTextColorPicker.value;
      updateTheme();
      saveState();
    });
  }

  if (resetColorsBtn) {
    resetColorsBtn.addEventListener('click', () => {
      const theme = themeMap[state.settings.theme];
      state.settings.primaryColor = theme.accent;
      state.settings.backgroundColor = theme.surface;
      state.settings.panelColor = theme.panel;
      state.settings.textColor = theme.text;
      state.settings.aiTextColor = theme.aiText;
      if (colorPicker) colorPicker.value = state.settings.primaryColor;
      if (backgroundColorPicker) backgroundColorPicker.value = state.settings.backgroundColor;
      if (panelColorPicker) panelColorPicker.value = state.settings.panelColor;
      if (textColorPicker) textColorPicker.value = state.settings.textColor;
      if (aiTextColorPicker) aiTextColorPicker.value = state.settings.aiTextColor;
      updateTheme();
      saveState();
    });
  }

  if (chatSearchInput) {
    chatSearchInput.addEventListener('input', () => {
      renderChatList();
    });
  }

  loadState();
  renderChatList();
  renderMessages();
});
