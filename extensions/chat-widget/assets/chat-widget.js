/**
 * AI Chat Widget - Main JavaScript
 * Handles UI interactions, real-time messaging, and API communication
 */

(function() {
  'use strict';

  // Configuration
  const API_BASE = window.location.origin;
  const SOCKET_URL = API_BASE;

  class AIChatWidget {
    constructor() {
      this.widget = document.getElementById('ai-chat-widget');
      if (!this.widget) return;

      this.button = document.getElementById('ai-chat-button');
      this.window = document.getElementById('ai-chat-window');
      this.messages = document.getElementById('ai-chat-messages');
      this.input = document.getElementById('ai-chat-input');
      this.form = document.getElementById('ai-chat-form');
      this.badge = document.getElementById('ai-chat-badge');
      this.typingIndicator = document.querySelector('.ai-chat-typing-indicator');

      this.sessionId = null;
      this.socket = null;
      this.isOpen = false;
      this.unreadCount = 0;

      this.config = {
        position: this.widget.dataset.position || 'bottom-right',
        primaryColor: this.widget.dataset.primaryColor || '#5C6AC4',
        accentColor: this.widget.dataset.accentColor || '#00848E',
        welcomeMessage: this.widget.dataset.welcomeMessage || 'Hi! How can I help you today?',
        showProductRecs: this.widget.dataset.showProductRecs === 'true',
        showOrderTracking: this.widget.dataset.showOrderTracking === 'true',
        enableSound: this.widget.dataset.enableSound === 'true',
        shop: this.widget.dataset.shop,
        customerEmail: this.widget.dataset.customerEmail || `guest_${Date.now()}@temp.com`,
        customerName: this.widget.dataset.customerName || 'Guest',
      };

      this.init();
    }

    async init() {
      // Apply theme colors
      document.documentElement.style.setProperty('--ai-primary-color', this.config.primaryColor);
      document.documentElement.style.setProperty('--ai-accent-color', this.config.accentColor);

      // Event listeners
      this.button.addEventListener('click', () => this.toggle());
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
      
      document.querySelector('.ai-chat-minimize')?.addEventListener('click', () => this.close());
      
      // Quick actions
      document.querySelectorAll('.ai-chat-quick-action').forEach(btn => {
        btn.addEventListener('click', (e) => this.handleQuickAction(e));
      });

      // Create session and connect
      await this.createSession();
      this.connectSocket();

      // Load from localStorage if exists
      this.loadSession();
    }

    async createSession() {
      try {
        const response = await fetch(`${API_BASE}/api/chat/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerEmail: this.config.customerEmail,
            customerName: this.config.customerName,
            channel: 'widget',
            language: navigator.language.split('-')[0] || 'en',
            metadata: {
              userAgent: navigator.userAgent,
              referrer: document.referrer,
              url: window.location.href,
            },
          }),
        });

        const data = await response.json();
        if (data.success) {
          this.sessionId = data.data.sessionId;
          localStorage.setItem('ai_chat_session', this.sessionId);

          // Show welcome message
          this.addMessage('bot', data.data.welcomeMessage, {
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Failed to create session:', error);
        this.addMessage('bot', this.config.welcomeMessage);
      }
    }

    connectSocket() {
      if (!window.io) {
        console.warn('Socket.IO not loaded, falling back to polling');
        return;
      }

      try {
        this.socket = io(SOCKET_URL, {
          query: { sessionId: this.sessionId },
          transports: ['websocket', 'polling'],
        });

        this.socket.on('connect', () => {
          console.log('Socket connected');
        });

        this.socket.on('message', (data) => {
          this.handleIncomingMessage(data);
        });

        this.socket.on('typing', (isTyping) => {
          this.showTyping(isTyping);
        });

        this.socket.on('recommendations', (products) => {
          this.showRecommendations(products);
        });

        this.socket.on('disconnect', () => {
          console.log('Socket disconnected');
        });
      } catch (error) {
        console.error('Socket connection failed:', error);
      }
    }

    toggle() {
      this.isOpen ? this.close() : this.open();
    }

    open() {
      this.window.style.display = 'flex';
      this.button.setAttribute('aria-expanded', 'true');
      this.isOpen = true;
      this.unreadCount = 0;
      this.updateBadge();
      this.input.focus();
      
      // Mark as opened in localStorage
      localStorage.setItem('ai_chat_opened', 'true');
      
      // Scroll to bottom
      this.scrollToBottom();
    }

    close() {
      this.window.style.display = 'none';
      this.button.setAttribute('aria-expanded', 'false');
      this.isOpen = false;
    }

    async handleSubmit(e) {
      e.preventDefault();
      
      const message = this.input.value.trim();
      if (!message) return;

      // Add user message to UI
      this.addMessage('user', message);
      this.input.value = '';

      // Show typing indicator
      this.showTyping(true);

      // Send via socket if available, otherwise use HTTP
      if (this.socket && this.socket.connected) {
        this.socket.emit('message', {
          sessionId: this.sessionId,
          message: message,
        });
      } else {
        await this.sendMessageHTTP(message);
      }
    }

    async sendMessageHTTP(message) {
      try {
        const response = await fetch(`${API_BASE}/api/chat/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: this.sessionId,
            message: message,
            customerEmail: this.config.customerEmail,
          }),
        });

        const data = await response.json();
        
        this.showTyping(false);

        if (data.success) {
          this.addMessage('bot', data.data.response, {
            intent: data.data.intent,
            confidence: data.data.confidence,
          });

          // Handle recommendations
          if (data.data.recommendations && data.data.recommendations.length > 0) {
            this.showRecommendations(data.data.recommendations);
          }

          // Handle order info
          if (data.data.orderInfo) {
            this.showOrderTracking(data.data.orderInfo);
          }
        } else {
          this.addMessage('bot', 'Sorry, I encountered an error. Please try again.');
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        this.showTyping(false);
        this.addMessage('bot', 'Connection error. Please check your internet and try again.');
      }
    }

    handleIncomingMessage(data) {
      this.showTyping(false);
      this.addMessage('bot', data.message, data.metadata);

      if (!this.isOpen) {
        this.unreadCount++;
        this.updateBadge();
        this.playNotificationSound();
      }
    }

    addMessage(sender, text, metadata = {}) {
      const messageEl = document.createElement('div');
      messageEl.className = `ai-chat-message ${sender}`;

      const avatar = document.createElement('div');
      avatar.className = 'ai-chat-message-avatar';
      avatar.textContent = sender === 'bot' ? '🤖' : '👤';

      const content = document.createElement('div');
      content.className = 'ai-chat-message-content';

      const bubble = document.createElement('div');
      bubble.className = 'ai-chat-message-bubble';
      bubble.textContent = text;

      const time = document.createElement('div');
      time.className = 'ai-chat-message-time';
      time.textContent = this.formatTime(metadata.timestamp || new Date().toISOString());

      content.appendChild(bubble);
      content.appendChild(time);
      messageEl.appendChild(avatar);
      messageEl.appendChild(content);

      this.messages.appendChild(messageEl);
      this.scrollToBottom();

      // Save to localStorage
      this.saveMessage({ sender, text, metadata, timestamp: new Date().toISOString() });
    }

    showTyping(isTyping) {
      if (this.typingIndicator) {
        this.typingIndicator.style.display = isTyping ? 'flex' : 'none';
        if (isTyping) this.scrollToBottom();
      }
    }

    showRecommendations(products) {
      if (!this.config.showProductRecs || !products || products.length === 0) return;

      const container = document.getElementById('ai-chat-recommendations');
      const list = document.getElementById('ai-chat-recommendations-list');
      
      list.innerHTML = '';
      
      products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'ai-chat-product-card';
        card.onclick = () => window.location.href = `/products/${product.handle}`;
        
        card.innerHTML = `
          <img src="${product.image || '/images/placeholder.png'}" alt="${product.title}" />
          <h5>${product.title}</h5>
          <p>$${parseFloat(product.price).toFixed(2)}</p>
        `;
        
        list.appendChild(card);
      });

      container.style.display = 'block';
      this.scrollToBottom();
    }

    showOrderTracking(orderInfo) {
      if (!this.config.showOrderTracking) return;

      const container = document.getElementById('ai-chat-order-tracking');
      const details = document.getElementById('ai-chat-order-details');
      
      details.innerHTML = `
        <div class="ai-chat-order-status">
          <span class="ai-chat-order-status-badge">${orderInfo.status}</span>
          <span>${orderInfo.orderNumber}</span>
        </div>
        <p>${orderInfo.statusMessage}</p>
      `;

      container.style.display = 'block';
      this.scrollToBottom();
    }

    handleQuickAction(e) {
      const action = e.target.dataset.action;
      
      switch(action) {
        case 'track-order':
          this.input.value = 'I want to track my order';
          this.form.dispatchEvent(new Event('submit'));
          break;
        case 'browse-products':
          this.showRecommendationsRequest();
          break;
        case 'get-help':
          this.input.value = 'I need help';
          this.form.dispatchEvent(new Event('submit'));
          break;
      }
    }

    async showRecommendationsRequest() {
      this.input.value = 'Show me some product recommendations';
      this.form.dispatchEvent(new Event('submit'));
    }

    scrollToBottom() {
      setTimeout(() => {
        this.messages.scrollTop = this.messages.scrollHeight;
      }, 100);
    }

    updateBadge() {
      if (this.unreadCount > 0) {
        this.badge.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount;
        this.badge.style.display = 'block';
      } else {
        this.badge.style.display = 'none';
      }
    }

    playNotificationSound() {
      if (!this.config.enableSound) return;
      
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwF');
      audio.play().catch(() => {});
    }

    formatTime(timestamp) {
      const date = new Date(timestamp);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
      return `${formattedHours}:${formattedMinutes} ${ampm}`;
    }

    saveMessage(message) {
      try {
        const messages = JSON.parse(localStorage.getItem('ai_chat_messages') || '[]');
        messages.push(message);
        // Keep only last 50 messages
        if (messages.length > 50) messages.shift();
        localStorage.setItem('ai_chat_messages', JSON.stringify(messages));
      } catch (e) {
        console.error('Failed to save message:', e);
      }
    }

    loadSession() {
      try {
        const messages = JSON.parse(localStorage.getItem('ai_chat_messages') || '[]');
        const recentMessages = messages.slice(-10); // Load last 10 messages
        
        recentMessages.forEach(msg => {
          if (msg.sender && msg.text) {
            const messageEl = document.createElement('div');
            messageEl.className = `ai-chat-message ${msg.sender}`;
            
            const avatar = document.createElement('div');
            avatar.className = 'ai-chat-message-avatar';
            avatar.textContent = msg.sender === 'bot' ? '🤖' : '👤';
            
            const content = document.createElement('div');
            content.className = 'ai-chat-message-content';
            
            const bubble = document.createElement('div');
            bubble.className = 'ai-chat-message-bubble';
            bubble.textContent = msg.text;
            
            const time = document.createElement('div');
            time.className = 'ai-chat-message-time';
            time.textContent = this.formatTime(msg.timestamp);
            
            content.appendChild(bubble);
            content.appendChild(time);
            messageEl.appendChild(avatar);
            messageEl.appendChild(content);
            
            this.messages.appendChild(messageEl);
          }
        });

        if (recentMessages.length > 0) {
          this.scrollToBottom();
        }
      } catch (e) {
        console.error('Failed to load session:', e);
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new AIChatWidget());
  } else {
    new AIChatWidget();
  }

})();
