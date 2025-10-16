/**
 * GDPR/CCPA Compliance Webhook: Customer Data Request
 * Handles requests from customers to view their stored data
 */

import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { prisma } from '../db.server';

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`[COMPLIANCE] Received data request for shop: ${shop}`, payload);

  try {
    const { customer, orders_requested } = payload;

    const customerData = await gatherCustomerData(
      customer.id,
      customer.email,
      shop
    );

    console.log(`[COMPLIANCE] Customer data compiled for: ${customer.email}`);
    console.log(`[COMPLIANCE] Data includes: ${Object.keys(customerData).join(', ')}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[COMPLIANCE] Data request error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * Gather all customer data from our database
 */
async function gatherCustomerData(
  customerId: string,
  customerEmail: string,
  shop: string
) {
  try {
    const store = await prisma.store.findUnique({
      where: { shopDomain: shop },
    });

    if (!store) {
      return { message: 'No data found for this store' };
    }

    const chatSessions = await prisma.chatSession.findMany({
      where: {
        storeId: store.id,
        OR: [
          { customerId: customerId },
          { customerEmail: customerEmail },
        ],
      },
      include: {
        messages: true,
      },
    });

    const preferences = await prisma.customerPreference.findUnique({
      where: { customerId: customerId },
    });

    const recommendations = await prisma.productRecommendation.findMany({
      where: { customerId: customerId },
    });

    return {
      customerId,
      customerEmail,
      chatSessions: chatSessions.length,
      totalMessages: chatSessions.reduce((sum, session) => sum + session.messages.length, 0),
      preferences,
      recommendationsReceived: recommendations.length,
      dataCollectionDate: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Gather Customer Data Error:', error);
    throw error;
  }
}
