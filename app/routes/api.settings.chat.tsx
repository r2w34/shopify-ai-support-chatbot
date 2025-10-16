/**
 * API Route: Chat Settings
 * GET/PUT /api/settings/chat
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { prisma } from '../db.server';
import { authenticate } from '../shopify.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  try {
    const store = await prisma.store.findUnique({
      where: { shopDomain: session.shop },
      include: { chatSettings: true },
    });

    if (!store) {
      return json({ success: false, error: 'Store not found' }, { status: 404 });
    }

    const settings = store.chatSettings || {
      enabled: true,
      widgetPosition: 'bottom-right',
      primaryColor: '#5C6AC4',
      accentColor: '#00848E',
      welcomeMessage: 'Hi! How can I help you today?',
      offlineMessage: "We're currently offline. Leave a message!",
      autoReplyEnabled: true,
      orderTrackingEnabled: true,
      productRecsEnabled: true,
      languages: 'en',
      aiModel: 'gpt-4',
      aiTemperature: 0.7,
      maxTokens: 500,
    };

    return json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return json(
      { success: false, error: 'Failed to retrieve settings' },
      { status: 500 }
    );
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);

  try {
    const body = await request.json();

    const store = await prisma.store.findUnique({
      where: { shopDomain: session.shop },
      include: { chatSettings: true },
    });

    if (!store) {
      return json({ success: false, error: 'Store not found' }, { status: 404 });
    }

    const {
      enabled,
      widgetPosition,
      primaryColor,
      accentColor,
      welcomeMessage,
      offlineMessage,
      businessHours,
      autoReplyEnabled,
      orderTrackingEnabled,
      productRecsEnabled,
      languages,
      aiModel,
      aiTemperature,
      maxTokens,
    } = body;

    const updatedSettings = await prisma.chatSettings.upsert({
      where: { storeId: store.id },
      create: {
        storeId: store.id,
        enabled: enabled !== undefined ? enabled : true,
        widgetPosition: widgetPosition || 'bottom-right',
        primaryColor: primaryColor || '#5C6AC4',
        accentColor: accentColor || '#00848E',
        welcomeMessage: welcomeMessage || 'Hi! How can I help you today?',
        offlineMessage: offlineMessage || "We're currently offline. Leave a message!",
        businessHours: businessHours ? JSON.stringify(businessHours) : null,
        autoReplyEnabled: autoReplyEnabled !== undefined ? autoReplyEnabled : true,
        orderTrackingEnabled: orderTrackingEnabled !== undefined ? orderTrackingEnabled : true,
        productRecsEnabled: productRecsEnabled !== undefined ? productRecsEnabled : true,
        languages: languages || 'en',
        aiModel: aiModel || 'gpt-4',
        aiTemperature: aiTemperature !== undefined ? aiTemperature : 0.7,
        maxTokens: maxTokens || 500,
      },
      update: {
        enabled: enabled !== undefined ? enabled : undefined,
        widgetPosition,
        primaryColor,
        accentColor,
        welcomeMessage,
        offlineMessage,
        businessHours: businessHours ? JSON.stringify(businessHours) : undefined,
        autoReplyEnabled,
        orderTrackingEnabled,
        productRecsEnabled,
        languages,
        aiModel,
        aiTemperature,
        maxTokens,
      },
    });

    return json({
      success: true,
      data: {
        updated: true,
        settings: updatedSettings,
      },
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
