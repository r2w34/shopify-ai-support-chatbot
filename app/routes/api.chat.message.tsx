/**
 * API Route: Send Chat Message
 * POST /api/chat/message
 */

import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { prisma } from '../db.server';
import { generateChatResponse } from '../services/ai.server';
import { getPersonalizedRecommendations } from '../services/recommendations.server';
import { findOrder, getOrderStatusMessage } from '../services/orders.server';
import { authenticate } from '../shopify.server';

export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.public.appProxy(request);

  try {
    const body = await request.json();
    const { sessionId, message, customerId, customerEmail, language = 'en' } = body;

    if (!sessionId || !message) {
      return json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

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
      return json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        sender: 'customer',
        message,
        messageType: 'text',
        isAI: false,
        sentAt: new Date(),
      },
    });

    const conversationHistory = chatSession.messages.map(msg => ({
      role: (msg.isAI ? 'assistant' : 'user') as 'system' | 'user' | 'assistant',
      content: msg.message,
    }));

    const aiResponse = await generateChatResponse(message, {
      conversationHistory,
      storeInfo: {
        name: chatSession.store.shopName || 'Our Store',
        currency: chatSession.store.currency,
        locale: chatSession.store.locale,
      },
      customerInfo: {
        email: customerEmail,
      },
      language,
    });

    const aiMessage = await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        sender: 'bot',
        message: aiResponse.message,
        messageType: 'text',
        isAI: true,
        intent: aiResponse.intent,
        confidence: aiResponse.confidence,
        sentAt: new Date(),
      },
    });

    let recommendations = null;
    let orderInfo = null;

    if (aiResponse.intent === 'product_inquiry' && admin) {
      try {
        const recs = await getPersonalizedRecommendations(
          admin,
          { customerId, language },
          4
        );
        recommendations = recs;
      } catch (error) {
        console.error('Recommendations error:', error);
      }
    }

    if (aiResponse.intent === 'order_tracking' && admin) {
      try {
        const orderMatch = message.match(/#?\d{4,}/);
        if (orderMatch) {
          const order = await findOrder(admin, orderMatch[0]);
          if (order) {
            orderInfo = {
              orderNumber: order.orderNumber,
              status: order.fulfillmentStatus,
              tracking: order.trackingInfo,
              statusMessage: getOrderStatusMessage(order),
            };
          }
        }
      } catch (error) {
        console.error('Order tracking error:', error);
      }
    }

    await prisma.chatSession.update({
      where: { id: chatSession.id },
      data: {
        sentiment: aiResponse.sentiment,
        updatedAt: new Date(),
      },
    });

    return json({
      success: true,
      data: {
        messageId: aiMessage.id,
        response: aiResponse.message,
        intent: aiResponse.intent,
        confidence: aiResponse.confidence,
        sentiment: aiResponse.sentiment,
        suggestedActions: aiResponse.suggestedActions,
        recommendations,
        orderInfo,
      },
    });
  } catch (error) {
    console.error('Chat message error:', error);
    return json(
      { success: false, error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

export async function loader() {
  return json({ error: 'Method not allowed' }, { status: 405 });
}
