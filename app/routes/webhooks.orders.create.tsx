/**
 * Webhook: Order Created
 * Triggers order tracking cache and automated thank you messages
 */

import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { prisma } from '../db.server';

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);

  console.log(`[WEBHOOK] Order created in shop: ${shop}`, payload.name);

  try {
    const order = payload;

    const store = await prisma.store.findUnique({
      where: { shopDomain: shop },
    });

    if (!store) {
      console.log('[WEBHOOK] Store not found, skipping order processing');
      return new Response(JSON.stringify({ success: false }), { status: 200 });
    }

    await prisma.orderTracking.upsert({
      where: { shopifyOrderId: order.id.toString() },
      create: {
        shopifyOrderId: order.id.toString(),
        orderNumber: order.name,
        customerId: order.customer?.id?.toString(),
        customerEmail: order.email || order.customer?.email || '',
        status: order.financial_status,
        fulfillmentStatus: order.fulfillment_status || 'unfulfilled',
        lastUpdated: new Date(),
      },
      update: {
        status: order.financial_status,
        fulfillmentStatus: order.fulfillment_status || 'unfulfilled',
        lastUpdated: new Date(),
      },
    });

    console.log(`[WEBHOOK] Order tracking created for: ${order.name}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[WEBHOOK] Order create error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
