/**
 * Socket.IO Server for Real-Time Chat
 * Handles WebSocket connections, message broadcasting, and room management
 */

import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { prisma } from '../db.server';
import { generateChatResponse } from './ai.server';
import { getPersonalizedRecommendations } from './recommendations.server';
import { findOrder } from './orders.server';

interface SocketUser {
  sessionId: string;
  shop?: string;
  customerId?: string;
  customerEmail?: string;
}

interface ChatMessage {
  sessionId: string;
  message: string;
  customerId?: string;
  customerEmail?: string;
  language?: string;
}

class SocketService {
  private io: SocketIOServer | null = null;
  private activeSessions: Map<string, SocketUser> = new Map();

  /**
   * Initialize Socket.IO server
   */
  initialize(httpServer: HTTPServer) {
    if (this.io) {
      console.log('Socket.IO already initialized');
      return this.io;
    }

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.APP_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupEventHandlers();
    console.log('✅ Socket.IO server initialized');

    return this.io;
  }

  /**
   * Set up socket event handlers
   */
  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', async (socket) => {
      const sessionId = socket.handshake.query.sessionId as string;
      
      console.log(`🔌 Client connected: ${socket.id} (Session: ${sessionId})`);

      if (!sessionId) {
        socket.emit('error', { message: 'Session ID required' });
        socket.disconnect();
        return;
      }

      try {
        // Verify session and get user info
        const chatSession = await prisma.chatSession.findUnique({
          where: { sessionToken: sessionId },
          include: { store: true },
        });

        if (!chatSession) {
          socket.emit('error', { message: 'Invalid session' });
          socket.disconnect();
          return;
        }

        // Store user info
        const userInfo: SocketUser = {
          sessionId,
          shop: chatSession.store.shopDomain,
          customerId: chatSession.customerId || undefined,
          customerEmail: chatSession.customerEmail || undefined,
        };

        this.activeSessions.set(socket.id, userInfo);

        // Join room for this session
        socket.join(sessionId);
        socket.join(`shop:${chatSession.store.shopDomain}`);

        // Send connection confirmation
        socket.emit('connected', {
          sessionId,
          timestamp: new Date().toISOString(),
        });

        // Handle incoming messages
        socket.on('message', async (data: ChatMessage) => {
          await this.handleMessage(socket, data);
        });

        // Handle typing events
        socket.on('typing', (isTyping: boolean) => {
          socket.to(sessionId).emit('typing', isTyping);
        });

        // Handle quick actions
        socket.on('quick_action', async (action: string) => {
          await this.handleQuickAction(socket, sessionId, action);
        });

        // Handle disconnect
        socket.on('disconnect', () => {
          console.log(`🔌 Client disconnected: ${socket.id}`);
          this.activeSessions.delete(socket.id);
        });

      } catch (error) {
        console.error('Socket connection error:', error);
        socket.emit('error', { message: 'Connection failed' });
        socket.disconnect();
      }
    });

    console.log('✅ Socket.IO event handlers configured');
  }

  /**
   * Handle incoming chat messages
   */
  private async handleMessage(socket: any, data: ChatMessage) {
    const userInfo = this.activeSessions.get(socket.id);
    if (!userInfo) return;

    const { sessionId, message, customerId, customerEmail, language = 'en' } = data;

    console.log(`💬 Message from ${socket.id}: ${message.substring(0, 50)}...`);

    try {
      // Get chat session
      const chatSession = await prisma.chatSession.findUnique({
        where: { sessionToken: sessionId },
        include: {
          messages: {
            orderBy: { sentAt: 'asc' },
            take: 10,
          },
          store: true,
        },
      });

      if (!chatSession) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      // Save user message to database
      await prisma.chatMessage.create({
        data: {
          sessionId: chatSession.id,
          sender: 'customer',
          message,
          messageType: 'text',
          isAI: false,
        },
      });

      // Emit typing indicator
      socket.to(sessionId).emit('typing', true);

      // Build conversation history
      const conversationHistory = chatSession.messages.map(msg => ({
        role: (msg.isAI ? 'assistant' : 'user') as 'system' | 'user' | 'assistant',
        content: msg.message,
      }));

      // Generate AI response
      const aiResponse = await generateChatResponse(message, {
        conversationHistory,
        storeInfo: {
          name: chatSession.store.shopName || 'Store',
          currency: chatSession.store.currency,
          locale: chatSession.store.locale,
        },
        customerInfo: {
          email: customerEmail,
        },
        language,
      });

      // Save AI response to database
      const aiMessage = await prisma.chatMessage.create({
        data: {
          sessionId: chatSession.id,
          sender: 'bot',
          message: aiResponse.message,
          messageType: 'text',
          isAI: true,
          intent: aiResponse.intent,
          confidence: aiResponse.confidence,
        },
      });

      // Update session sentiment
      await prisma.chatSession.update({
        where: { id: chatSession.id },
        data: {
          sentiment: aiResponse.sentiment,
          updatedAt: new Date(),
        },
      });

      // Stop typing indicator
      socket.to(sessionId).emit('typing', false);

      // Emit AI response to all clients in this session
      this.io?.to(sessionId).emit('message', {
        id: aiMessage.id,
        message: aiResponse.message,
        sender: 'bot',
        timestamp: aiMessage.sentAt.toISOString(),
        metadata: {
          intent: aiResponse.intent,
          confidence: aiResponse.confidence,
          sentiment: aiResponse.sentiment,
        },
      });

      // Handle product recommendations
      if (aiResponse.intent === 'product_inquiry' || message.toLowerCase().includes('recommend')) {
        await this.sendRecommendations(socket, sessionId, customerId);
      }

      // Handle order tracking
      if (aiResponse.intent === 'order_tracking') {
        await this.handleOrderTracking(socket, message, chatSession.store.shopDomain);
      }

    } catch (error) {
      console.error('Message handling error:', error);
      
      socket.to(sessionId).emit('typing', false);
      
      socket.emit('message', {
        message: 'I apologize, but I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date().toISOString(),
        metadata: { error: true },
      });
    }
  }

  /**
   * Send product recommendations
   */
  private async sendRecommendations(socket: any, sessionId: string, customerId?: string) {
    try {
      const chatSession = await prisma.chatSession.findUnique({
        where: { sessionToken: sessionId },
        include: { store: true },
      });

      if (!chatSession) return;

      // This would need an admin API context - for now, emit a placeholder
      // In production, you'd create an admin API context here
      const products = [
        {
          id: '1',
          title: 'Sample Product 1',
          price: '29.99',
          handle: 'sample-product-1',
          image: 'https://via.placeholder.com/150',
        },
        {
          id: '2',
          title: 'Sample Product 2',
          price: '39.99',
          handle: 'sample-product-2',
          image: 'https://via.placeholder.com/150',
        },
      ];

      socket.emit('recommendations', products);

    } catch (error) {
      console.error('Recommendations error:', error);
    }
  }

  /**
   * Handle order tracking requests
   */
  private async handleOrderTracking(socket: any, message: string, shop: string) {
    try {
      // Extract order number from message
      const orderMatch = message.match(/#?\d{4,}/);
      if (!orderMatch) return;

      const orderNumber = orderMatch[0];

      // This would need an admin API context
      // For now, emit a placeholder response
      socket.emit('order_status', {
        orderNumber,
        status: 'Processing',
        message: `Order ${orderNumber} is being processed.`,
      });

    } catch (error) {
      console.error('Order tracking error:', error);
    }
  }

  /**
   * Handle quick actions
   */
  private async handleQuickAction(socket: any, sessionId: string, action: string) {
    console.log(`⚡ Quick action: ${action} for session ${sessionId}`);

    switch (action) {
      case 'track_order':
        socket.emit('message', {
          message: 'Please provide your order number to track your order.',
          sender: 'bot',
          timestamp: new Date().toISOString(),
        });
        break;

      case 'browse_products':
        await this.sendRecommendations(socket, sessionId);
        break;

      case 'get_help':
        socket.emit('message', {
          message: 'I\'m here to help! What can I assist you with today?',
          sender: 'bot',
          timestamp: new Date().toISOString(),
        });
        break;

      default:
        console.log(`Unknown quick action: ${action}`);
    }
  }

  /**
   * Broadcast to all sessions for a shop
   */
  broadcastToShop(shop: string, event: string, data: any) {
    if (!this.io) return;
    this.io.to(`shop:${shop}`).emit(event, data);
  }

  /**
   * Broadcast to specific session
   */
  broadcastToSession(sessionId: string, event: string, data: any) {
    if (!this.io) return;
    this.io.to(sessionId).emit(event, data);
  }

  /**
   * Get active connections count
   */
  getActiveConnections(): number {
    return this.activeSessions.size;
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): SocketUser[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Disconnect a specific session
   */
  disconnectSession(sessionId: string) {
    if (!this.io) return;
    
    const sockets = this.io.sockets.sockets;
    sockets.forEach((socket) => {
      const userInfo = this.activeSessions.get(socket.id);
      if (userInfo?.sessionId === sessionId) {
        socket.disconnect(true);
      }
    });
  }

  /**
   * Get Socket.IO instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
