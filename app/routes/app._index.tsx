/**
 * Dashboard Home Page
 * Main overview with metrics, recent chats, and quick actions
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  ProgressBar,
  Button,
  DataTable,
  EmptyState,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { getCurrentSubscription, getTrialDaysRemaining } from "../services/billing.server";

interface DashboardMetrics {
  totalChats: number;
  activeUsers: number;
  avgSatisfaction: number;
  revenueFromChat: number;
  chatsToday: number;
  trendsVsYesterday: { chats: number; users: number };
}

interface RecentSession {
  id: string;
  customerEmail: string;
  startedAt: string;
  messageCount: number;
  sentiment: string;
  status: string;
}

interface SubscriptionInfo {
  plan: string;
  status: string;
  chatsUsed: number;
  chatsLimit: number;
  trialDaysRemaining: number;
}

interface LoaderData {
  metrics: DashboardMetrics;
  recentSessions: RecentSession[];
  subscription: SubscriptionInfo;
  isNewUser: boolean;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  try {
    let store = await prisma.store.findUnique({
      where: { shopDomain: session.shop },
      include: {
        chatSessions: {
          orderBy: { startedAt: 'desc' },
          take: 10,
          include: { messages: true },
        },
        analytics: {
          orderBy: { date: 'desc' },
          take: 7,
        },
      },
    });

    // Create store if first time
    if (!store) {
      store = await prisma.store.create({
        data: {
          shopDomain: session.shop,
          shopName: session.shop.split('.')[0],
          email: '',
          plan: 'free',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          chatSettings: {
            create: {
              enabled: true,
              widgetPosition: 'bottom-right',
              primaryColor: '#5C6AC4',
              welcomeMessage: 'Hi! How can I help you today?',
            },
          },
        },
        include: {
          chatSessions: true,
          analytics: true,
        },
      });

      return json<LoaderData>({
        metrics: {
          totalChats: 0,
          activeUsers: 0,
          avgSatisfaction: 0,
          revenueFromChat: 0,
          chatsToday: 0,
          trendsVsYesterday: { chats: 0, users: 0 },
        },
        recentSessions: [],
        subscription: {
          plan: 'free',
          status: 'trial',
          chatsUsed: 0,
          chatsLimit: 50,
          trialDaysRemaining: 14,
        },
        isNewUser: true,
      });
    }

    // Calculate metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayAnalytics = store.analytics.find(
      a => a.date.getTime() === today.getTime()
    );
    const yesterdayAnalytics = store.analytics.find(
      a => a.date.getTime() === yesterday.getTime()
    );

    const totalChats = store.analytics.reduce((sum, a) => sum + a.totalChats, 0);
    const avgSatisfaction = store.analytics.length > 0
      ? store.analytics.reduce((sum, a) => sum + (a.avgSatisfaction || 0), 0) / store.analytics.length
      : 0;
    const revenueFromChat = store.analytics.reduce((sum, a) => sum + a.revenueFromChat, 0);

    const subscription = await getCurrentSubscription(session.shop);
    const trialDays = await getTrialDaysRemaining(session.shop);
    const chatsUsed = store.chatSessions.length;
    const chatsLimit = subscription?.chatLimit || 50;

    return json<LoaderData>({
      metrics: {
        totalChats,
        activeUsers: todayAnalytics?.activeUsers || 0,
        avgSatisfaction: Math.round(avgSatisfaction * 10) / 10,
        revenueFromChat,
        chatsToday: todayAnalytics?.totalChats || 0,
        trendsVsYesterday: {
          chats: (todayAnalytics?.totalChats || 0) - (yesterdayAnalytics?.totalChats || 0),
          users: (todayAnalytics?.activeUsers || 0) - (yesterdayAnalytics?.activeUsers || 0),
        },
      },
      recentSessions: store.chatSessions.slice(0, 5).map(s => ({
        id: s.id,
        customerEmail: s.customerEmail || 'Anonymous',
        startedAt: s.startedAt.toISOString(),
        messageCount: s.messages.length,
        sentiment: s.sentiment || 'neutral',
        status: s.status,
      })),
      subscription: {
        plan: subscription?.plan || 'free',
        status: subscription?.status || 'trial',
        chatsUsed,
        chatsLimit,
        trialDaysRemaining: trialDays,
      },
      isNewUser: store.chatSessions.length === 0,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return json<LoaderData>({
      metrics: {
        totalChats: 0,
        activeUsers: 0,
        avgSatisfaction: 0,
        revenueFromChat: 0,
        chatsToday: 0,
        trendsVsYesterday: { chats: 0, users: 0 },
      },
      recentSessions: [],
      subscription: {
        plan: 'free',
        status: 'trial',
        chatsUsed: 0,
        chatsLimit: 50,
        trialDaysRemaining: 14,
      },
      isNewUser: true,
    });
  }
};

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);
  const formatCurrency = (num: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);

  const getTrendBadge = (value: number) => {
    if (value > 0) return <Badge tone="success">+{value}</Badge>;
    if (value < 0) return <Badge tone="critical">{value}</Badge>;
    return <Badge>--</Badge>;
  };

  const getSentimentBadge = (sentiment: string) => {
    if (sentiment === 'positive') return <Badge tone="success">Positive</Badge>;
    if (sentiment === 'negative') return <Badge tone="critical">Negative</Badge>;
    return <Badge>Neutral</Badge>;
  };

  const recentSessionsRows = data.recentSessions.map(s => [
    s.customerEmail,
    new Date(s.startedAt).toLocaleString(),
    s.messageCount.toString(),
    getSentimentBadge(s.sentiment),
    <Badge tone={s.status === 'active' ? 'info' : undefined}>{s.status}</Badge>,
  ]);

  const usagePercent = (data.subscription.chatsUsed / data.subscription.chatsLimit) * 100;

  return (
    <Page title="AI Support Chatbot">
      <TitleBar title="Dashboard" />
      <BlockStack gap="500">
        {/* Welcome Banner */}
        {data.isNewUser && (
          <Banner
            title="Welcome to AI Support Chatbot! 🎉"
            tone="success"
            action={{ content: 'Get Started', url: '/app/settings' }}
          >
            <p>Configure your chat widget and start engaging with customers using AI.</p>
          </Banner>
        )}

        {/* Trial Warning */}
        {data.subscription.trialDaysRemaining > 0 && data.subscription.trialDaysRemaining <= 7 && (
          <Banner
            title={`Trial ends in ${data.subscription.trialDaysRemaining} days`}
            tone="warning"
            action={{ content: 'Upgrade Now', url: '/app/billing' }}
          >
            <p>Choose a plan to continue using AI Support Chatbot.</p>
          </Banner>
        )}

        <Layout>
          {/* Main Content */}
          <Layout.Section>
            <BlockStack gap="400">
              {/* Metrics Cards */}
              <InlineStack gap="400" wrap={false}>
                <div style={{ flex: 1 }}>
                  <Card>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm">Total Chats</Text>
                      <Text as="p" variant="heading2xl">{formatNumber(data.metrics.totalChats)}</Text>
                      <InlineStack gap="200">
                        <Text tone="subdued">Today: {data.metrics.chatsToday}</Text>
                        {getTrendBadge(data.metrics.trendsVsYesterday.chats)}
                      </InlineStack>
                    </BlockStack>
                  </Card>
                </div>

                <div style={{ flex: 1 }}>
                  <Card>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm">Active Users</Text>
                      <Text as="p" variant="heading2xl">{formatNumber(data.metrics.activeUsers)}</Text>
                      <InlineStack gap="200">
                        <Text tone="subdued">Today</Text>
                        {getTrendBadge(data.metrics.trendsVsYesterday.users)}
                      </InlineStack>
                    </BlockStack>
                  </Card>
                </div>

                <div style={{ flex: 1 }}>
                  <Card>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm">Satisfaction</Text>
                      <Text as="p" variant="heading2xl">{data.metrics.avgSatisfaction}/5.0</Text>
                      <Text tone="subdued">Average rating</Text>
                    </BlockStack>
                  </Card>
                </div>

                <div style={{ flex: 1 }}>
                  <Card>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm">Revenue</Text>
                      <Text as="p" variant="heading2xl">{formatCurrency(data.metrics.revenueFromChat)}</Text>
                      <Text tone="subdued">From chat</Text>
                    </BlockStack>
                  </Card>
                </div>
              </InlineStack>

              {/* Recent Sessions */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingMd">Recent Chat Sessions</Text>
                    <Button>View All</Button>
                  </InlineStack>

                  {data.recentSessions.length > 0 ? (
                    <DataTable
                      columnContentTypes={['text', 'text', 'numeric', 'text', 'text']}
                      headings={['Customer', 'Started', 'Messages', 'Sentiment', 'Status']}
                      rows={recentSessionsRows}
                    />
                  ) : (
                    <EmptyState
                      heading="No chat sessions yet"
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                      <p>Chat sessions will appear here once customers start conversations.</p>
                    </EmptyState>
                  )}
                </BlockStack>
              </Card>

              {/* Quick Actions */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Quick Actions</Text>
                  <InlineStack gap="300">
                    <Button url="/app/settings">Configure Widget</Button>
                    <Button url="/app/faqs">Manage FAQs</Button>
                    <Button url="/app/analytics">View Analytics</Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          {/* Sidebar */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              {/* Usage Card */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Usage This Month</Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text>
                        {formatNumber(data.subscription.chatsUsed)} / {formatNumber(data.subscription.chatsLimit)} chats
                      </Text>
                      <Text fontWeight="semibold">{Math.round(usagePercent)}%</Text>
                    </InlineStack>
                    <ProgressBar
                      progress={usagePercent}
                      tone={usagePercent >= 90 ? 'critical' : 'primary'}
                    />
                  </BlockStack>
                  <InlineStack align="space-between">
                    <Text tone="subdued">Current Plan</Text>
                    <Badge tone="info">{data.subscription.plan.toUpperCase()}</Badge>
                  </InlineStack>
                  {data.subscription.plan === 'free' && (
                    <Button url="/app/billing" variant="primary" fullWidth>
                      Upgrade Plan
                    </Button>
                  )}
                </BlockStack>
              </Card>

              {/* Getting Started */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Getting Started</Text>
                  <BlockStack gap="200">
                    <Text>1. Configure your chat widget</Text>
                    <Text>2. Add FAQs for common questions</Text>
                    <Text>3. Customize AI personality</Text>
                    <Text>4. Enable the widget on your store</Text>
                  </BlockStack>
                  <Button url="https://docs.example.com" external>
                    View Documentation
                  </Button>
                </BlockStack>
              </Card>

              {/* Support */}
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">Need Help?</Text>
                  <Text tone="subdued">
                    Our support team is ready to assist you.
                  </Text>
                  <Button url="mailto:support@example.com" external>
                    Contact Support
                  </Button>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
