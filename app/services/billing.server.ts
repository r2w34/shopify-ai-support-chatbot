/**
 * Billing Service - Shopify Billing API Integration
 * Handles subscription management, billing, and payment processing
 */

import type { AdminApiContext } from '@shopify/shopify-app-remix/server';
import { prisma } from '../db.server';

export interface BillingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'EVERY_30_DAYS' | 'ANNUAL';
  trialDays: number;
  features: string[];
  chatLimit: number;
  aiModel: string;
}

export const BILLING_PLANS: Record<string, BillingPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'USD',
    interval: 'EVERY_30_DAYS',
    trialDays: 0,
    features: ['50 chats/month', 'Basic AI', 'Email support'],
    chatLimit: 50,
    aiModel: 'gpt-3.5-turbo',
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 29,
    currency: 'USD',
    interval: 'EVERY_30_DAYS',
    trialDays: 14,
    features: [
      '500 chats/month',
      'GPT-4 AI',
      'Order tracking',
      'Product recommendations',
      'Email support',
    ],
    chatLimit: 500,
    aiModel: 'gpt-4',
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 79,
    currency: 'USD',
    interval: 'EVERY_30_DAYS',
    trialDays: 14,
    features: [
      '2000 chats/month',
      'GPT-4 AI',
      'All integrations',
      'Cart abandonment',
      'Analytics dashboard',
      'Multi-language',
      'Priority support',
    ],
    chatLimit: 2000,
    aiModel: 'gpt-4',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    currency: 'USD',
    interval: 'EVERY_30_DAYS',
    trialDays: 14,
    features: [
      'Unlimited chats',
      'GPT-4 AI',
      'Custom AI training',
      'WhatsApp & Messenger',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
    ],
    chatLimit: -1,
    aiModel: 'gpt-4',
  },
};

/**
 * Create subscription charge
 */
export async function createSubscription(
  admin: AdminApiContext,
  shop: string,
  planId: string
): Promise<{ confirmationUrl: string; chargeId: string } | null> {
  try {
    const plan = BILLING_PLANS[planId];
    
    if (!plan || plan.id === 'free') {
      return null;
    }

    const localCurrency = await getStoreCurrency(admin);

    const mutation = `
      mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $trialDays: Int, $test: Boolean) {
        appSubscriptionCreate(
          name: $name
          lineItems: $lineItems
          returnUrl: $returnUrl
          trialDays: $trialDays
          test: $test
        ) {
          appSubscription {
            id
            status
            createdAt
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await admin.graphql(mutation, {
      variables: {
        name: plan.name,
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: { amount: plan.price, currencyCode: localCurrency },
                interval: plan.interval,
              },
            },
          },
        ],
        returnUrl: `${process.env.APP_URL}/api/billing/callback`,
        trialDays: plan.trialDays,
        test: process.env.NODE_ENV !== 'production',
      },
    });

    const data = await response.json();
    const result = data.data?.appSubscriptionCreate;

    if (result?.userErrors?.length > 0) {
      console.error('Subscription Creation Errors:', result.userErrors);
      return null;
    }

    if (result?.confirmationUrl && result?.appSubscription?.id) {
      await prisma.subscription.create({
        data: {
          storeId: shop,
          shopifyChargeId: result.appSubscription.id,
          plan: planId,
          status: 'PENDING',
          price: plan.price,
          currency: localCurrency,
          billingInterval: plan.interval,
          trialDays: plan.trialDays,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return {
        confirmationUrl: result.confirmationUrl,
        chargeId: result.appSubscription.id,
      };
    }

    return null;
  } catch (error) {
    console.error('Create Subscription Error:', error);
    return null;
  }
}

/**
 * Check if merchant has active subscription
 */
export async function hasActiveSubscription(
  shop: string,
  requiredPlan?: string
): Promise<boolean> {
  try {
    const store = await prisma.store.findUnique({
      where: { shopDomain: shop },
      include: {
        subscriptions: {
          where: {
            status: 'ACTIVE',
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!store || store.subscriptions.length === 0) {
      return false;
    }

    const subscription = store.subscriptions[0];

    if (requiredPlan) {
      return subscription.plan === requiredPlan;
    }

    return subscription.status === 'ACTIVE';
  } catch (error) {
    console.error('Has Active Subscription Error:', error);
    return false;
  }
}

/**
 * Get current subscription for store
 */
export async function getCurrentSubscription(shop: string) {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        storeId: shop,
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      return {
        plan: 'free',
        status: 'ACTIVE',
        ...BILLING_PLANS.free,
      };
    }

    return {
      ...subscription,
      ...BILLING_PLANS[subscription.plan],
    };
  } catch (error) {
    console.error('Get Current Subscription Error:', error);
    return null;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  admin: AdminApiContext,
  shop: string
): Promise<boolean> {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        storeId: shop,
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription || !subscription.shopifyChargeId) {
      return false;
    }

    const mutation = `
      mutation appSubscriptionCancel($id: ID!) {
        appSubscriptionCancel(id: $id) {
          appSubscription {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await admin.graphql(mutation, {
      variables: { id: subscription.shopifyChargeId },
    });

    const data = await response.json();
    const result = data.data?.appSubscriptionCancel;

    if (result?.userErrors?.length > 0) {
      console.error('Cancel Subscription Errors:', result.userErrors);
      return false;
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    await prisma.store.update({
      where: { id: shop },
      data: {
        plan: 'free',
        subscriptionStatus: 'inactive',
      },
    });

    return true;
  } catch (error) {
    console.error('Cancel Subscription Error:', error);
    return false;
  }
}

/**
 * Upgrade/downgrade subscription
 */
export async function updateSubscription(
  admin: AdminApiContext,
  shop: string,
  newPlanId: string
): Promise<{ confirmationUrl: string } | null> {
  try {
    await cancelSubscription(admin, shop);

    return await createSubscription(admin, shop, newPlanId);
  } catch (error) {
    console.error('Update Subscription Error:', error);
    return null;
  }
}

/**
 * Create usage charge (for metered billing)
 */
export async function createUsageCharge(
  admin: AdminApiContext,
  subscriptionId: string,
  amount: number,
  description: string
): Promise<boolean> {
  try {
    const mutation = `
      mutation appUsageRecordCreate($subscriptionLineItemId: ID!, $price: MoneyInput!, $description: String!) {
        appUsageRecordCreate(
          subscriptionLineItemId: $subscriptionLineItemId
          price: $price
          description: $description
        ) {
          appUsageRecord {
            id
            price {
              amount
              currencyCode
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await admin.graphql(mutation, {
      variables: {
        subscriptionLineItemId: subscriptionId,
        price: { amount, currencyCode: 'USD' },
        description,
      },
    });

    const data = await response.json();
    const result = data.data?.appUsageRecordCreate;

    if (result?.userErrors?.length > 0) {
      console.error('Usage Charge Errors:', result.userErrors);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Create Usage Charge Error:', error);
    return false;
  }
}

/**
 * Get store's local billing currency
 */
async function getStoreCurrency(admin: AdminApiContext): Promise<string> {
  try {
    const query = `
      query {
        shop {
          currencyCode
        }
      }
    `;

    const response = await admin.graphql(query);
    const data = await response.json();

    return data.data?.shop?.currencyCode || 'USD';
  } catch (error) {
    console.error('Get Store Currency Error:', error);
    return 'USD';
  }
}

/**
 * Check if store is in trial period
 */
export async function isInTrialPeriod(shop: string): Promise<boolean> {
  try {
    const store = await prisma.store.findUnique({
      where: { shopDomain: shop },
    });

    if (!store || !store.trialEndsAt) {
      return false;
    }

    return new Date() < store.trialEndsAt;
  } catch (error) {
    console.error('Is In Trial Error:', error);
    return false;
  }
}

/**
 * Get days remaining in trial
 */
export async function getTrialDaysRemaining(shop: string): Promise<number> {
  try {
    const store = await prisma.store.findUnique({
      where: { shopDomain: shop },
    });

    if (!store || !store.trialEndsAt) {
      return 0;
    }

    const now = new Date();
    const trialEnd = store.trialEndsAt;

    if (now >= trialEnd) {
      return 0;
    }

    const diffTime = Math.abs(trialEnd.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  } catch (error) {
    console.error('Get Trial Days Remaining Error:', error);
    return 0;
  }
}

export default {
  createSubscription,
  hasActiveSubscription,
  getCurrentSubscription,
  cancelSubscription,
  updateSubscription,
  createUsageCharge,
  isInTrialPeriod,
  getTrialDaysRemaining,
  BILLING_PLANS,
};
