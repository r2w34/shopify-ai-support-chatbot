/**
 * Billing & Plans Page
 * Plan selection, usage meters, upgrade/downgrade functionality
 */

import { useCallback } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Badge,
  ProgressBar,
  DataTable,
  Banner,
  Divider,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import {
  getCurrentSubscription,
  createSubscription,
  cancelSubscription,
  BILLING_PLANS,
  getTrialDaysRemaining,
} from "../services/billing.server";

interface LoaderData {
  currentPlan: {
    id: string;
    name: string;
    price: number;
    status: string;
    chatsUsed: number;
    chatsLimit: number;
    trialDaysRemaining: number;
  };
  plans: Array<{
    id: string;
    name: string;
    price: number;
    interval: string;
    features: string[];
    chatLimit: number;
    isCurrent: boolean;
  }>;
  billingHistory: Array<{
    date: string;
    amount: number;
    status: string;
    description: string;
  }>;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  try {
    const store = await prisma.store.findUnique({
      where: { shopDomain: session.shop },
      include: {
        chatSessions: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!store) {
      return json({ error: 'Store not found' }, { status: 404 });
    }

    const subscription = await getCurrentSubscription(session.shop);
    const trialDays = await getTrialDaysRemaining(session.shop);

    const chatsUsed = store.chatSessions.length;
    const currentPlan = subscription || BILLING_PLANS.free;

    return json<LoaderData>({
      currentPlan: {
        id: currentPlan.id || 'free',
        name: currentPlan.name || 'Free',
        price: currentPlan.price || 0,
        status: currentPlan.status || 'active',
        chatsUsed,
        chatsLimit: currentPlan.chatLimit || 50,
        trialDaysRemaining: trialDays,
      },
      plans: Object.values(BILLING_PLANS).map(plan => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        interval: plan.interval === 'ANNUAL' ? 'year' : 'month',
        features: plan.features,
        chatLimit: plan.chatLimit,
        isCurrent: plan.id === (currentPlan.id || 'free'),
      })),
      billingHistory: store.subscriptions.map(sub => ({
        date: sub.createdAt.toISOString(),
        amount: sub.price,
        status: sub.status,
        description: `${sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)} Plan`,
      })),
    });
  } catch (error) {
    console.error('Billing loader error:', error);
    return json({
      currentPlan: {
        id: 'free',
        name: 'Free',
        price: 0,
        status: 'active',
        chatsUsed: 0,
        chatsLimit: 50,
        trialDaysRemaining: 0,
      },
      plans: [],
      billingHistory: [],
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);

  try {
    const formData = await request.formData();
    const action = formData.get('_action') as string;
    const planId = formData.get('planId') as string;

    if (action === 'upgrade') {
      const result = await createSubscription(admin, session.shop, planId);
      if (result) {
        return json({ success: true, confirmationUrl: result.confirmationUrl });
      }
    } else if (action === 'cancel') {
      await cancelSubscription(admin, session.shop);
      return json({ success: true, message: 'Subscription cancelled' });
    }

    return json({ success: false, error: 'Action failed' }, { status: 400 });
  } catch (error) {
    console.error('Billing action error:', error);
    return json({ success: false, error: 'Action failed' }, { status: 500 });
  }
};

export default function Billing() {
  const data = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const shopify = useAppBridge();

  const isLoading = navigation.state === "submitting";

  const handleUpgrade = useCallback((planId: string) => {
    const formData = new FormData();
    formData.append('_action', 'upgrade');
    formData.append('planId', planId);
    submit(formData, { method: 'post' });
  }, [submit]);

  const handleCancel = useCallback(() => {
    if (confirm('Are you sure you want to cancel your subscription?')) {
      const formData = new FormData();
      formData.append('_action', 'cancel');
      submit(formData, { method: 'post' });
      shopify.toast.show('Subscription cancelled');
    }
  }, [submit, shopify]);

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);
  const formatCurrency = (num: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);

  const usagePercent = (data.currentPlan.chatsUsed / data.currentPlan.chatsLimit) * 100;

  const billingHistoryRows = data.billingHistory.map(item => [
    new Date(item.date).toLocaleDateString(),
    formatCurrency(item.amount),
    <Badge tone={item.status === 'ACTIVE' ? 'success' : undefined}>{item.status}</Badge>,
    item.description,
  ]);

  return (
    <Page
      title="Billing & Plans"
      backAction={{ url: '/app' }}
    >
      <TitleBar title="Billing" />
      <BlockStack gap="500">
        {/* Trial Warning */}
        {data.currentPlan.trialDaysRemaining > 0 && (
          <Banner
            title={`${data.currentPlan.trialDaysRemaining} days left in your trial`}
            tone={data.currentPlan.trialDaysRemaining <= 3 ? 'critical' : 'info'}
          >
            <p>Choose a plan to continue using AI Support Chatbot after your trial ends.</p>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              {/* Current Plan */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <BlockStack gap="200">
                      <Text as="h2" variant="headingLg">Current Plan</Text>
                      <InlineStack gap="200" align="center">
                        <Text as="h3" variant="heading2xl">
                          {data.currentPlan.name}
                        </Text>
                        <Badge tone="success">{data.currentPlan.status.toUpperCase()}</Badge>
                      </InlineStack>
                      <Text as="p" variant="bodyLg">
                        {formatCurrency(data.currentPlan.price)}/month
                      </Text>
                    </BlockStack>
                    {data.currentPlan.id !== 'free' && (
                      <Button tone="critical" onClick={handleCancel}>
                        Cancel Plan
                      </Button>
                    )}
                  </InlineStack>

                  <Divider />

                  <BlockStack gap="300">
                    <Text as="h3" variant="headingMd">Usage This Month</Text>
                    <BlockStack gap="200">
                      <InlineStack align="space-between">
                        <Text>
                          {formatNumber(data.currentPlan.chatsUsed)} /{' '}
                          {data.currentPlan.chatsLimit === -1
                            ? 'Unlimited'
                            : formatNumber(data.currentPlan.chatsLimit)}{' '}
                          chats
                        </Text>
                        {data.currentPlan.chatsLimit !== -1 && (
                          <Text fontWeight="semibold">{Math.round(usagePercent)}%</Text>
                        )}
                      </InlineStack>
                      {data.currentPlan.chatsLimit !== -1 && (
                        <ProgressBar
                          progress={usagePercent}
                          tone={usagePercent >= 90 ? 'critical' : 'primary'}
                        />
                      )}
                    </BlockStack>
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Available Plans */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingLg">Available Plans</Text>
                  <InlineStack gap="400" wrap={false} align="start">
                    {data.plans.map(plan => (
                      <div key={plan.id} style={{ flex: 1 }}>
                        <Card>
                          <BlockStack gap="300">
                            <InlineStack align="space-between">
                              <Text as="h3" variant="headingMd">{plan.name}</Text>
                              {plan.isCurrent && <Badge tone="success">Current</Badge>}
                            </Text>

                            <Text as="p" variant="heading2xl">
                              {formatCurrency(plan.price)}
                              <Text as="span" variant="bodyMd" tone="subdued">
                                /{plan.interval}
                              </Text>
                            </Text>

                            <BlockStack gap="100">
                              {plan.features.map((feature, idx) => (
                                <InlineStack key={idx} gap="200">
                                  <Text>✓</Text>
                                  <Text>{feature}</Text>
                                </InlineStack>
                              ))}
                            </BlockStack>

                            {!plan.isCurrent && (
                              <Button
                                variant="primary"
                                fullWidth
                                onClick={() => handleUpgrade(plan.id)}
                                loading={isLoading}
                                disabled={plan.id === 'free'}
                              >
                                {plan.price < data.currentPlan.price
                                  ? 'Downgrade'
                                  : plan.price > data.currentPlan.price
                                  ? 'Upgrade'
                                  : 'Select Plan'}
                              </Button>
                            )}
                          </BlockStack>
                        </Card>
                      </div>
                    ))}
                  </InlineStack>
                </BlockStack>
              </Card>

              {/* Billing History */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingLg">Billing History</Text>
                  {data.billingHistory.length > 0 ? (
                    <DataTable
                      columnContentTypes={['text', 'numeric', 'text', 'text']}
                      headings={['Date', 'Amount', 'Status', 'Description']}
                      rows={billingHistoryRows}
                    />
                  ) : (
                    <Text tone="subdued">No billing history yet</Text>
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          {/* Sidebar */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Plan Comparison</Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text>Free</Text>
                      <Text fontWeight="semibold">50 chats/mo</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text>Starter</Text>
                      <Text fontWeight="semibold">500 chats/mo</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text>Professional</Text>
                      <Text fontWeight="semibold">2,000 chats/mo</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text>Enterprise</Text>
                      <Text fontWeight="semibold">Unlimited</Text>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Need Help?</Text>
                  <Text as="p" tone="subdued">
                    Contact our sales team for custom enterprise plans or questions about billing.
                  </Text>
                  <Button url="mailto:sales@example.com" external>
                    Contact Sales
                  </Button>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">Payment Info</Text>
                  <Text tone="subdued">
                    All charges are processed through Shopify's secure billing system.
                  </Text>
                  <Text tone="subdued">
                    You can manage payment methods in your Shopify admin.
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
