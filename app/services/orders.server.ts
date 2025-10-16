/**
 * Order Tracking Service
 * Handles order lookups, status updates, and tracking information
 */

import type { AdminApiContext } from '@shopify/shopify-app-remix/server';
import { prisma } from '../db.server';

export interface OrderInfo {
  id: string;
  orderNumber: string;
  name: string;
  email: string;
  phone?: string;
  totalPrice: string;
  currency: string;
  financialStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
  lineItems: Array<{
    id: string;
    title: string;
    quantity: number;
    price: string;
    image?: string;
  }>;
  shippingAddress?: {
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
  };
  trackingInfo?: Array<{
    company?: string;
    number?: string;
    url?: string;
  }>;
  estimatedDelivery?: string;
  statusUrl?: string;
}

/**
 * Find order by order number or email
 */
export async function findOrder(
  admin: AdminApiContext,
  searchTerm: string
): Promise<OrderInfo | null> {
  try {
    let query = '';
    
    if (searchTerm.includes('@')) {
      query = `email:${searchTerm}`;
    } else if (/^\d+$/.test(searchTerm)) {
      query = `name:#${searchTerm}`;
    } else {
      query = `name:${searchTerm}`;
    }

    const graphqlQuery = `
      query findOrder($query: String!) {
        orders(first: 1, query: $query, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              name
              email
              phone
              createdAt
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              displayFinancialStatus
              displayFulfillmentStatus
              statusPageUrl
              shippingAddress {
                address1
                address2
                city
                province
                country
                zip
              }
              lineItems(first: 10) {
                edges {
                  node {
                    id
                    title
                    quantity
                    originalUnitPriceSet {
                      shopMoney {
                        amount
                      }
                    }
                    image {
                      url
                    }
                  }
                }
              }
              fulfillments {
                trackingInfo {
                  company
                  number
                  url
                }
                estimatedDeliveryAt
              }
            }
          }
        }
      }
    `;

    const response = await admin.graphql(graphqlQuery, {
      variables: { query },
    });

    const data = await response.json();
    const edges = data.data?.orders?.edges || [];

    if (edges.length === 0) {
      return null;
    }

    const order = edges[0].node;

    const orderInfo: OrderInfo = {
      id: order.id.replace('gid://shopify/Order/', ''),
      orderNumber: order.name,
      name: order.name,
      email: order.email || '',
      phone: order.phone,
      totalPrice: order.totalPriceSet?.shopMoney?.amount || '0',
      currency: order.totalPriceSet?.shopMoney?.currencyCode || 'USD',
      financialStatus: order.displayFinancialStatus || 'PENDING',
      fulfillmentStatus: order.displayFulfillmentStatus || 'UNFULFILLED',
      createdAt: order.createdAt,
      statusUrl: order.statusPageUrl,
      lineItems: order.lineItems.edges.map((edge: any) => ({
        id: edge.node.id,
        title: edge.node.title,
        quantity: edge.node.quantity,
        price: edge.node.originalUnitPriceSet?.shopMoney?.amount || '0',
        image: edge.node.image?.url,
      })),
      shippingAddress: order.shippingAddress || undefined,
      trackingInfo: order.fulfillments?.flatMap((f: any) => f.trackingInfo || []) || [],
      estimatedDelivery: order.fulfillments?.[0]?.estimatedDeliveryAt,
    };

    await cacheOrderTracking(orderInfo);

    return orderInfo;
  } catch (error) {
    console.error('Find Order Error:', error);
    return null;
  }
}

/**
 * Get order status message
 */
export function getOrderStatusMessage(order: OrderInfo): string {
  const { financialStatus, fulfillmentStatus, orderNumber } = order;

  let message = `Order ${orderNumber}:\n\n`;

  message += `💰 Payment: ${getFinancialStatusText(financialStatus)}\n`;
  message += `📦 Fulfillment: ${getFulfillmentStatusText(fulfillmentStatus)}\n\n`;

  if (order.trackingInfo && order.trackingInfo.length > 0) {
    const tracking = order.trackingInfo[0];
    message += `🚚 Tracking: ${tracking.company || 'Carrier'}\n`;
    message += `📍 Tracking Number: ${tracking.number || 'N/A'}\n`;
    
    if (tracking.url) {
      message += `🔗 Track: ${tracking.url}\n`;
    }
  }

  if (order.estimatedDelivery) {
    const deliveryDate = new Date(order.estimatedDelivery);
    message += `\n📅 Estimated Delivery: ${deliveryDate.toLocaleDateString()}\n`;
  }

  if (order.statusUrl) {
    message += `\n🔗 View Full Details: ${order.statusUrl}`;
  }

  return message;
}

/**
 * Get customer's recent orders
 */
export async function getCustomerOrders(
  admin: AdminApiContext,
  customerEmail: string,
  limit: number = 5
): Promise<OrderInfo[]> {
  try {
    const query = `
      query getCustomerOrders($query: String!) {
        orders(first: ${limit}, query: $query, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              name
              email
              createdAt
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              displayFinancialStatus
              displayFulfillmentStatus
              lineItems(first: 3) {
                edges {
                  node {
                    title
                    quantity
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await admin.graphql(query, {
      variables: { query: `email:${customerEmail}` },
    });

    const data = await response.json();
    const edges = data.data?.orders?.edges || [];

    return edges.map((edge: any) => ({
      id: edge.node.id.replace('gid://shopify/Order/', ''),
      orderNumber: edge.node.name,
      name: edge.node.name,
      email: edge.node.email,
      totalPrice: edge.node.totalPriceSet?.shopMoney?.amount || '0',
      currency: edge.node.totalPriceSet?.shopMoney?.currencyCode || 'USD',
      financialStatus: edge.node.displayFinancialStatus,
      fulfillmentStatus: edge.node.displayFulfillmentStatus,
      createdAt: edge.node.createdAt,
      lineItems: edge.node.lineItems.edges.map((li: any) => ({
        id: li.node.id,
        title: li.node.title,
        quantity: li.node.quantity,
        price: '0',
      })),
    }));
  } catch (error) {
    console.error('Get Customer Orders Error:', error);
    return [];
  }
}

/**
 * Cache order tracking information
 */
async function cacheOrderTracking(order: OrderInfo): Promise<void> {
  try {
    const trackingInfo = order.trackingInfo?.[0];

    await prisma.orderTracking.upsert({
      where: { shopifyOrderId: order.id },
      create: {
        shopifyOrderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.id,
        customerEmail: order.email,
        status: order.financialStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        trackingNumber: trackingInfo?.number,
        trackingUrl: trackingInfo?.url,
        carrier: trackingInfo?.company,
        estimatedDelivery: order.estimatedDelivery ? new Date(order.estimatedDelivery) : null,
        lastUpdated: new Date(),
      },
      update: {
        status: order.financialStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        trackingNumber: trackingInfo?.number,
        trackingUrl: trackingInfo?.url,
        carrier: trackingInfo?.company,
        estimatedDelivery: order.estimatedDelivery ? new Date(order.estimatedDelivery) : null,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    console.error('Cache Order Tracking Error:', error);
  }
}

/**
 * Helper: Get human-readable financial status
 */
function getFinancialStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    PENDING: '⏳ Pending',
    AUTHORIZED: '✅ Authorized',
    PARTIALLY_PAID: '💰 Partially Paid',
    PAID: '✅ Paid',
    PARTIALLY_REFUNDED: '↩️ Partially Refunded',
    REFUNDED: '↩️ Refunded',
    VOIDED: '❌ Voided',
  };

  return statusMap[status] || status;
}

/**
 * Helper: Get human-readable fulfillment status
 */
function getFulfillmentStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    UNFULFILLED: '📋 Not Shipped',
    PARTIALLY_FULFILLED: '📦 Partially Shipped',
    FULFILLED: '✅ Shipped',
    RESTOCKED: '🔄 Restocked',
    PENDING_FULFILLMENT: '⏳ Processing',
    OPEN: '📋 Open',
    IN_PROGRESS: '⚙️ In Progress',
    ON_HOLD: '⏸️ On Hold',
    SCHEDULED: '📅 Scheduled',
  };

  return statusMap[status] || status;
}

/**
 * Check if order can be cancelled
 */
export async function canCancelOrder(
  admin: AdminApiContext,
  orderId: string
): Promise<{ canCancel: boolean; reason?: string }> {
  try {
    const query = `
      query getOrder($id: ID!) {
        order(id: $id) {
          cancelledAt
          displayFulfillmentStatus
          displayFinancialStatus
          closed
        }
      }
    `;

    const response = await admin.graphql(query, {
      variables: { id: `gid://shopify/Order/${orderId}` },
    });

    const data = await response.json();
    const order = data.data?.order;

    if (!order) {
      return { canCancel: false, reason: 'Order not found' };
    }

    if (order.cancelledAt) {
      return { canCancel: false, reason: 'Order already cancelled' };
    }

    if (order.closed) {
      return { canCancel: false, reason: 'Order is closed' };
    }

    if (order.displayFulfillmentStatus === 'FULFILLED') {
      return { canCancel: false, reason: 'Order already fulfilled' };
    }

    return { canCancel: true };
  } catch (error) {
    console.error('Can Cancel Order Error:', error);
    return { canCancel: false, reason: 'Error checking order status' };
  }
}

export default {
  findOrder,
  getOrderStatusMessage,
  getCustomerOrders,
  canCancelOrder,
};
