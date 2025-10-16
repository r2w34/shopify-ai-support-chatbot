/**
 * GDPR/CCPA Compliance Webhook: Customer Data Redaction
 * Handles requests to delete/redact customer data
 */

import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { prisma } from '../db.server';

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);

  console.log(`[COMPLIANCE] Received redaction request for shop: ${shop}`, payload);

  try {
    const { customer, orders_to_redact } = payload;

    await redactCustomerData(customer.id, customer.email, shop);

    console.log(`[COMPLIANCE] Customer data redacted for: ${customer.email}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[COMPLIANCE] Redaction error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * Redact/delete all customer data from our database
 */
async function redactCustomerData(
  customerId: string,
  customerEmail: string,
  shop: string
) {
  try {
    const store = await prisma.store.findUnique({
      where: { shopDomain: shop },
    });

    if (!store) {
      console.log('[COMPLIANCE] No store found, nothing to redact');
      return;
    }

    const chatSessions = await prisma.chatSession.findMany({
      where: {
        storeId: store.id,
        OR: [
          { customerId: customerId },
          { customerEmail: customerEmail },
        ],
      },
    });

    for (const session of chatSessions) {
      await prisma.chatMessage.deleteMany({
        where: { sessionId: session.id },
      });
    }

    await prisma.chatSession.deleteMany({
      where: {
        storeId: store.id,
        OR: [
          { customerId: customerId },
          { customerEmail: customerEmail },
        ],
      },
    });

    await prisma.customerPreference.deleteMany({
      where: { customerId: customerId },
    });

    await prisma.productRecommendation.deleteMany({
      where: { customerId: customerId },
    });

    await prisma.orderTracking.deleteMany({
      where: {
        OR: [
          { customerId: customerId },
          { customerEmail: customerEmail },
        ],
      },
    });

    console.log(`[COMPLIANCE] Successfully redacted data for customer: ${customerId}`);
  } catch (error) {
    console.error('Redact Customer Data Error:', error);
    throw error;
  }
}
