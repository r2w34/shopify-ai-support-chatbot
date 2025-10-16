/**
 * Analytics Dashboard
 * Charts, KPIs, and export functionality
 */

import { useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Select,
  Badge,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { format, subDays } from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AnalyticsData {
  overview: {
    totalChats: number;
    avgSatisfaction: number;
    conversions: number;
    revenue: number;
  };
  chatVolume: Array<{ date: string; chats: number }>;
  satisfactionTrend: Array<{ date: string; score: number }>;
  topIntents: Array<{ intent: string; count: number }>;
  sentimentDistribution: Array<{ name: string; value: number }>;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  try {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30');

    const store = await prisma.store.findUnique({
      where: { shopDomain: session.shop },
      include: {
        analytics: {
          where: {
            date: {
              gte: subDays(new Date(), days),
            },
          },
          orderBy: { date: 'asc' },
        },
        chatSessions: {
          where: {
            createdAt: {
              gte: subDays(new Date(), days),
            },
          },
          include: { messages: true },
        },
      },
    });

    if (!store) {
      return json({ error: 'Store not found' }, { status: 404 });
    }

    // Calculate overview
    const totalChats = store.analytics.reduce((sum, a) => sum + a.totalChats, 0);
    const avgSatisfaction = store.analytics.length > 0
      ? store.analytics.reduce((sum, a) => sum + (a.avgSatisfaction || 0), 0) / store.analytics.length
      : 0;
    const conversions = store.analytics.reduce((sum, a) => sum + a.conversionsFromChat, 0);
    const revenue = store.analytics.reduce((sum, a) => sum + a.revenueFromChat, 0);

    // Chat volume over time
    const chatVolume = store.analytics.map(a => ({
      date: format(a.date, 'MMM dd'),
      chats: a.totalChats,
    }));

    // Satisfaction trend
    const satisfactionTrend = store.analytics
      .filter(a => a.avgSatisfaction && a.avgSatisfaction > 0)
      .map(a => ({
        date: format(a.date, 'MMM dd'),
        score: a.avgSatisfaction || 0,
      }));

    // Top intents
    const intentCounts: Record<string, number> = {};
    store.chatSessions.forEach(session => {
      session.messages.forEach(msg => {
        if (msg.intent) {
          intentCounts[msg.intent] = (intentCounts[msg.intent] || 0) + 1;
        }
      });
    });

    const topIntents = Object.entries(intentCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([intent, count]) => ({
        intent: intent.replace(/_/g, ' '),
        count,
      }));

    // Sentiment distribution
    const sentiments = { positive: 0, neutral: 0, negative: 0 };
    store.chatSessions.forEach(session => {
      if (session.sentiment) {
        sentiments[session.sentiment as keyof typeof sentiments]++;
      }
    });

    const sentimentDistribution = [
      { name: 'Positive', value: sentiments.positive },
      { name: 'Neutral', value: sentiments.neutral },
      { name: 'Negative', value: sentiments.negative },
    ];

    return json<AnalyticsData>({
      overview: {
        totalChats,
        avgSatisfaction: Math.round(avgSatisfaction * 10) / 10,
        conversions,
        revenue,
      },
      chatVolume,
      satisfactionTrend,
      topIntents,
      sentimentDistribution,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return json({
      overview: { totalChats: 0, avgSatisfaction: 0, conversions: 0, revenue: 0 },
      chatVolume: [],
      satisfactionTrend: [],
      topIntents: [],
      sentimentDistribution: [],
    });
  }
};

export default function Analytics() {
  const data = useLoaderData<typeof loader>();
  const [dateRange, setDateRange] = useState('30');

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);
  const formatCurrency = (num: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);

  const COLORS = ['#00C781', '#5C6AC4', '#E4E5E7'];

  return (
    <Page
      title="Analytics Dashboard"
      backAction={{ url: '/app' }}
      secondaryActions={[
        { content: 'Export Data', onAction: () => alert('Export coming soon!') },
      ]}
    >
      <TitleBar title="Analytics" />
      <BlockStack gap="500">
        {/* Date Range Selector */}
        <Card>
          <InlineStack align="space-between">
            <Text as="h2" variant="headingMd">Performance Overview</Text>
            <Select
              label="Date range"
              labelInline
              options={[
                { label: 'Last 7 days', value: '7' },
                { label: 'Last 30 days', value: '30' },
                { label: 'Last 90 days', value: '90' },
              ]}
              value={dateRange}
              onChange={(value) => {
                setDateRange(value);
                window.location.href = `/app/analytics?days=${value}`;
              }}
            />
          </InlineStack>
        </Card>

        {/* Overview Metrics */}
        <Layout>
          <Layout.Section>
            <InlineStack gap="400" wrap={false}>
              <div style={{ flex: 1 }}>
                <Card>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">Total Chats</Text>
                    <Text as="p" variant="heading2xl">{formatNumber(data.overview.totalChats)}</Text>
                  </BlockStack>
                </Card>
              </div>
              <div style={{ flex: 1 }}>
                <Card>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">Avg Satisfaction</Text>
                    <Text as="p" variant="heading2xl">{data.overview.avgSatisfaction}/5.0</Text>
                  </BlockStack>
                </Card>
              </div>
              <div style={{ flex: 1 }}>
                <Card>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">Conversions</Text>
                    <Text as="p" variant="heading2xl">{formatNumber(data.overview.conversions)}</Text>
                  </BlockStack>
                </Card>
              </div>
              <div style={{ flex: 1 }}>
                <Card>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">Revenue</Text>
                    <Text as="p" variant="heading2xl">{formatCurrency(data.overview.revenue)}</Text>
                  </BlockStack>
                </Card>
              </div>
            </InlineStack>
          </Layout.Section>
        </Layout>

        {/* Charts */}
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              {/* Chat Volume Chart */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Chat Volume Over Time</Text>
                  {data.chatVolume.length > 0 ? (
                    <div style={{ height: '300px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.chatVolume}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="chats"
                            stroke="#5C6AC4"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <Text tone="subdued">No chat data available for this period</Text>
                  )}
                </BlockStack>
              </Card>

              {/* Satisfaction Trend Chart */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Satisfaction Score Trend</Text>
                  {data.satisfactionTrend.length > 0 ? (
                    <div style={{ height: '300px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.satisfactionTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={[0, 5]} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="score"
                            stroke="#00C781"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <Text tone="subdued">No satisfaction data available yet</Text>
                  )}
                </BlockStack>
              </Card>

              {/* Top Intents Chart */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Top Customer Intents</Text>
                  {data.topIntents.length > 0 ? (
                    <div style={{ height: '300px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.topIntents}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="intent" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="#5C6AC4" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <Text tone="subdued">No intent data available yet</Text>
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          {/* Sidebar */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              {/* Sentiment Distribution */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">Sentiment Distribution</Text>
                  {data.sentimentDistribution.some(s => s.value > 0) ? (
                    <div style={{ height: '200px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.sentimentDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {data.sentimentDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <Text tone="subdued">No sentiment data yet</Text>
                  )}
                </BlockStack>
              </Card>

              {/* Export Options */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Export Reports</Text>
                  <BlockStack gap="200">
                    <Button fullWidth onClick={() => alert('CSV export coming soon!')}>
                      Export as CSV
                    </Button>
                    <Button fullWidth onClick={() => alert('PDF export coming soon!')}>
                      Export as PDF
                    </Button>
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Insights */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Key Insights</Text>
                  <BlockStack gap="200">
                    <Text as="p">
                      📈 Chat volume is {data.chatVolume.length > 1 && 
                        data.chatVolume[data.chatVolume.length - 1].chats > 
                        data.chatVolume[0].chats ? 'increasing' : 'stable'}
                    </Text>
                    <Text as="p">
                      😊 Customer sentiment is mostly{' '}
                      {data.sentimentDistribution[0]?.value > 
                       data.sentimentDistribution[2]?.value ? 'positive' : 'neutral'}
                    </Text>
                    {data.topIntents[0] && (
                      <Text as="p">
                        💬 Most common question: {data.topIntents[0].intent}
                      </Text>
                    )}
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
