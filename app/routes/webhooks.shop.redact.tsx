/**
 * GDPR/CCPA Compliance Webhook: Shop Data Redaction
 * Triggered 48 hours after app uninstallation - deletes all store data
 */

import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { prisma } from '../db.server';

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);

  console.log(`[COMPLIANCE] Received shop redaction request for: ${shop}`, payload);

  try {
    const { shop_id, shop_domain } = payload;

    await redactShopData(shop_domain || shop);

    console.log(`[COMPLIANCE] Shop data redacted for: ${shop_domain || shop}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[COMPLIANCE] Shop redaction error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * Delete all data associated with a store
 */
async function redactShopData(shopDomain: string) {
  try {
    const store = await prisma.store.findUnique({
      where: { shopDomain },
    });

    if (!store) {
      console.log(`[COMPLIANCE] No store found for ${shopDomain}, nothing to redact`);
      return;
    }

    console.log(`[COMPLIANCE] Starting data deletion for store: ${store.id}`);

    await prisma.chatMessage.deleteMany({
      where: {
        session: {
          storeId: store.id,
        },
      },
    });
    console.log('[COMPLIANCE] ✓ Deleted chat messages');

    await prisma.chatSession.deleteMany({
      where: { storeId: store.id },
    });
    console.log('[COMPLIANCE] ✓ Deleted chat sessions');

    await prisma.chatSettings.deleteMany({
      where: { storeId: store.id },
    });
    console.log('[COMPLIANCE] ✓ Deleted chat settings');

    await prisma.fAQ.deleteMany({
      where: { storeId: store.id },
    });
    console.log('[COMPLIANCE] ✓ Deleted FAQs');

    await prisma.automation.deleteMany({
      where: { storeId: store.id },
    });
    console.log('[COMPLIANCE] ✓ Deleted automations');

    await prisma.analytics.deleteMany({
      where: { storeId: store.id },
    });
    console.log('[COMPLIANCE] ✓ Deleted analytics');

    await prisma.subscription.deleteMany({
      where: { storeId: store.id },
    });
    console.log('[COMPLIANCE] ✓ Deleted subscriptions');

    await prisma.store.delete({
      where: { id: store.id },
    });
    console.log('[COMPLIANCE] ✓ Deleted store record');

    console.log(`[COMPLIANCE] Successfully redacted all data for shop: ${shopDomain}`);
  } catch (error) {
    console.error('Redact Shop Data Error:', error);
    throw error;
  }
}
