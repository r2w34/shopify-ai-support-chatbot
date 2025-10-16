/**
 * API Route: Create Chat Session
 * POST /api/chat/session
 * GET /api/chat/session/:sessionId
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { prisma } from '../db.server';
import { authenticate } from '../shopify.server';
import { nanoid } from 'nanoid';

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.public.appProxy(request);

  try {
    const body = await request.json();
    const {
      customerId,
      customerEmail,
      customerName,
      channel = 'widget',
      language = 'en',
      metadata,
    } = body;

    if (!customerEmail) {
      return json({ success: false, error: 'Customer email required' }, { status: 400 });
    }

    const store = await prisma.store.findFirst({
      include: { chatSettings: true },
    });

    if (!store) {
      return json({ success: false, error: 'Store not configured' }, { status: 400 });
    }

    const sessionToken = nanoid(32);

    const chatSession = await prisma.chatSession.create({
      data: {
        storeId: store.id,
        customerId,
        customerEmail,
        customerName,
        sessionToken,
        channel,
        language,
        status: 'active',
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    const welcomeMessage = store.chatSettings?.welcomeMessage || 'Hi! How can I help you today?';

    await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        sender: 'bot',
        message: welcomeMessage,
        messageType: 'text',
        isAI: true,
        intent: 'greeting',
        confidence: 1.0,
      },
    });

    return json({
      success: true,
      data: {
        sessionId: chatSession.sessionToken,
        sessionToken: chatSession.sessionToken,
        welcomeMessage,
        settings: {
          primaryColor: store.chatSettings?.primaryColor || '#5C6AC4',
          accentColor: store.chatSettings?.accentColor || '#00848E',
          widgetPosition: store.chatSettings?.widgetPosition || 'bottom-right',
          enabled: store.chatSettings?.enabled !== false,
        },
      },
    });
  } catch (error) {
    console.error('Create session error:', error);
    return json(
      { success: false, error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.public.appProxy(request);

  try {
    const url = new URL(request.url);
    const sessionToken = url.pathname.split('/').pop();

    if (!sessionToken) {
      return json({ success: false, error: 'Session ID required' }, { status: 400 });
    }

    const chatSession = await prisma.chatSession.findUnique({
      where: { sessionToken },
      include: {
        messages: {
          orderBy: { sentAt: 'asc' },
        },
      },
    });

    if (!chatSession) {
      return json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    return json({
      success: true,
      data: {
        sessionId: chatSession.sessionToken,
        messages: chatSession.messages.map(msg => ({
          id: msg.id,
          sender: msg.sender,
          message: msg.message,
          timestamp: msg.sentAt.toISOString(),
          isAI: msg.isAI,
          intent: msg.intent,
          confidence: msg.confidence,
        })),
        metadata: {
          totalMessages: chatSession.messages.length,
          startedAt: chatSession.startedAt.toISOString(),
          status: chatSession.status,
          sentiment: chatSession.sentiment,
        },
      },
    });
  } catch (error) {
    console.error('Get session error:', error);
    return json(
      { success: false, error: 'Failed to retrieve session' },
      { status: 500 }
    );
  }
}
