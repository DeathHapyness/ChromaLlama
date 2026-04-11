function chatApp() {
  return {
    sidebarOpen: true,
    settingsOpen: false,
    searchQuery: '',
    currentChatId: 1,
    userInput: '',
    isLoading: false,
    theme: 'dark',
    accentColor: '#22c55e',
    currentModel: 'mistral:7b',

    chats: [
      { id: 1, title: 'Chat Principal', timestamp: 'Hoje' },
      { id: 2, title: 'Sobre IA', timestamp: 'Ontem' },
      { id: 3, title: 'Desenvolvimento Web', timestamp: 'Há 2 dias' },
    ],

    messages: [
      { id: 1, role: 'user', content: 'Olá! Como você pode me ajudar?', timestamp: '14:30' },
      { id: 2, role: 'ai', content: 'Oi! Sou o ChromaLlama, um assistente de IA. Posso ajudar com programação, responder perguntas, gerar textos e muito mais! 🚀', timestamp: '14:31' },
    ],

    init() {
      if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
      }
      this.loadFromStorage();
      this.applyAccentColor();
      this.applyTheme();
    },

    get currentChat() {
      return this.chats.find(c => c.id === this.currentChatId);
    },

    get filteredChats() {
      if (!this.searchQuery) return this.chats;
      return this.chats.filter(c => c.title.toLowerCase().includes(this.searchQuery.toLowerCase()));
    },

    selectChat(id) {
      this.currentChatId = id;
      this.messages = [];
      this.sidebarOpen = false;
    },

    newChat() {
      const id = Math.max(...this.chats.map(c => c.id)) + 1;
      this.chats.unshift({
        id,
        title: `Chat ${id}`,
        timestamp: 'Agora'
      });
      this.currentChatId = id;
      this.messages = [];
      this.saveToStorage();
    },

    deleteChat(id) {
      this.chats = this.chats.filter(c => c.id !== id);
      if (this.currentChatId === id) {
        this.currentChatId = this.chats[0]?.id || null;
        this.messages = [];
      }
      this.saveToStorage();
    },

    async sendMessage() {
      if (!this.userInput.trim()) return;

      const userMsg = {
        id: Date.now(),
        role: 'user',
        content: this.userInput,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };

      this.messages.push(userMsg);
      this.userInput = '';
      this.isLoading = true;

      setTimeout(() => {
        const aiMsg = {
          id: Date.now() + 1,
          role: 'ai',
          content: 'Esta é uma resposta simulada. Em produção, ela viria de um backend real! ✨',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };
        this.messages.push(aiMsg);
        this.isLoading = false;
        this.saveToStorage();
      }, 1000);
    },

    clearChat() {
      if (confirm('Tem certeza? Isso vai limpar todas as mensagens do chat atual.')) {
        this.messages = [];
        this.saveToStorage();
      }
    },

    setTheme(t) {
      this.theme = t;
      this.applyTheme();
      this.saveToStorage();
    },

    setAccentColor(color) {
      this.accentColor = color;
      this.applyAccentColor();
      this.saveToStorage();
    },

    applyTheme() {
      const root = document.documentElement;
      let target = this.theme;
      if (target === 'auto') {
        target = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }

      if (target === 'light') {
        root.style.setProperty('--surface', '#f8fafc');
        root.style.setProperty('--surface-soft', 'rgba(248, 250, 252, 0.95)');
        root.style.setProperty('--panel', 'rgba(255,255,255,0.92)');
        root.style.setProperty('--border', 'rgba(148, 163, 184, 0.25)');
        root.style.setProperty('--text', '#0f172a');
        root.style.setProperty('--muted', '#64748b');
        root.style.setProperty('--ai-text', '#2563eb');
        root.style.setProperty('--accent-soft', this.hexToRgba(this.accentColor, 0.18));
        document.documentElement.style.colorScheme = 'light';
      } else {
        root.style.setProperty('--surface', '#09090b');
        root.style.setProperty('--surface-soft', 'rgba(15, 23, 42, 0.95)');
        root.style.setProperty('--panel', 'rgba(7, 10, 17, 0.96)');
        root.style.setProperty('--border', 'rgba(148, 163, 184, 0.12)');
        root.style.setProperty('--text', '#e2e8f0');
        root.style.setProperty('--muted', '#94a3b8');
        root.style.setProperty('--ai-text', '#60a5fa');
        root.style.setProperty('--accent-soft', this.hexToRgba(this.accentColor, 0.18));
        document.documentElement.style.colorScheme = 'dark';
      }
    },

    applyAccentColor() {
      const root = document.documentElement;
      root.style.setProperty('--accent', this.accentColor);
      root.style.setProperty('--accent-soft', this.hexToRgba(this.accentColor, 0.18));
    },

    hexToRgba(hex, alpha) {
      const clean = hex.replace('#', '');
      const bigint = parseInt(clean, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },

    saveToStorage() {
      localStorage.setItem('chats', JSON.stringify(this.chats));
      localStorage.setItem('messages', JSON.stringify(this.messages));
      localStorage.setItem('currentChatId', this.currentChatId);
      localStorage.setItem('theme', this.theme);
      localStorage.setItem('accentColor', this.accentColor);
    },

    loadFromStorage() {
      const chats = localStorage.getItem('chats');
      const messages = localStorage.getItem('messages');
      const currentChatId = localStorage.getItem('currentChatId');
      const theme = localStorage.getItem('theme');
      const accentColor = localStorage.getItem('accentColor');

      if (chats) this.chats = JSON.parse(chats);
      if (messages) this.messages = JSON.parse(messages);
      if (currentChatId) this.currentChatId = parseInt(currentChatId);
      if (theme) this.theme = theme;
      if (accentColor) this.accentColor = accentColor;
      this.applyAccentColor();
      this.applyTheme();
    }
  };
}
