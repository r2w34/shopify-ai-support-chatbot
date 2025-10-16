/**
 * Real-Time Chat Monitoring Dashboard
 * Admin page to monitor active Socket.IO connections
 */

import { useEffect, useState } from "react";
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
  Badge,
  DataTable,
  EmptyState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

interface LoaderData {
  socketEnabled: boolean;
  serverInfo: {
    nodeVersion: string;
    uptime: number;
    environment: string;
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return json<LoaderData>({
    socketEnabled: true,
    serverInfo: {
      nodeVersion: process.version,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    },
  });
};

export default function RealTimeMonitoring() {
  const data = useLoaderData<typeof loader>();
  const [socketStatus, setSocketStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/socket/status');
        const status = await response.json();
        setSocketStatus(status);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch socket status:', error);
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <Page
      title="Real-Time Chat Monitoring"
      backAction={{ url: '/app' }}
    >
      <TitleBar title="Real-Time Monitoring" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {/* Status Cards */}
            <InlineStack gap="400" wrap={false}>
              <div style={{ flex: 1 }}>
                <Card>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">Socket.IO Status</Text>
                    <Badge tone={data.socketEnabled ? 'success' : 'critical'}>
                      {data.socketEnabled ? 'Running' : 'Disabled'}
                    </Badge>
                  </BlockStack>
                </Card>
              </div>

              <div style={{ flex: 1 }}>
                <Card>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">Active Connections</Text>
                    <Text as="p" variant="heading2xl">
                      {socketStatus?.activeConnections || 0}
                    </Text>
                  </BlockStack>
                </Card>
              </div>

              <div style={{ flex: 1 }}>
                <Card>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">Active Sessions</Text>
                    <Text as="p" variant="heading2xl">
                      {socketStatus?.activeSessions || 0}
                    </Text>
                  </BlockStack>
                </Card>
              </div>

              <div style={{ flex: 1 }}>
                <Card>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">Server Uptime</Text>
                    <Text as="p" variant="headingLg">
                      {formatUptime(data.serverInfo.uptime)}
                    </Text>
                  </BlockStack>
                </Card>
              </div>
            </InlineStack>

            {/* Server Information */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Server Information</Text>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text>Node.js Version</Text>
                    <Badge>{data.serverInfo.nodeVersion}</Badge>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text>Environment</Text>
                    <Badge tone={data.serverInfo.environment === 'production' ? 'success' : 'info'}>
                      {data.serverInfo.environment}
                    </Badge>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text>Socket.IO Transport</Text>
                    <Badge>WebSocket + Polling</Badge>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Connection Details */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Real-Time Features</Text>
                {loading ? (
                  <Text tone="subdued">Loading...</Text>
                ) : socketStatus && socketStatus.activeConnections > 0 ? (
                  <BlockStack gap="200">
                    <InlineStack gap="200">
                      <Text>✅ WebSocket connections established</Text>
                    </InlineStack>
                    <InlineStack gap="200">
                      <Text>✅ Real-time message broadcasting</Text>
                    </InlineStack>
                    <InlineStack gap="200">
                      <Text>✅ Typing indicators active</Text>
                    </InlineStack>
                    <InlineStack gap="200">
                      <Text>✅ Room management enabled</Text>
                    </InlineStack>
                  </BlockStack>
                ) : (
                  <EmptyState
                    heading="No active connections"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Customers will appear here when they connect to the chat widget.</p>
                  </EmptyState>
                )}
              </BlockStack>
            </Card>

            {/* Configuration Info */}
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">How It Works</Text>
                <BlockStack gap="200">
                  <Text as="p">
                    • Chat widget connects via WebSocket for instant messaging
                  </Text>
                  <Text as="p">
                    • Falls back to HTTP polling if WebSocket unavailable
                  </Text>
                  <Text as="p">
                    • Each customer gets a unique session with room isolation
                  </Text>
                  <Text as="p">
                    • AI responses are streamed in real-time
                  </Text>
                  <Text as="p">
                    • Typing indicators show when AI is generating responses
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        {/* Sidebar */}
        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">Testing</Text>
                <Text tone="subdued">
                  To test real-time features, open your storefront chat widget in multiple browser tabs or devices.
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">Performance</Text>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text>Ping Timeout</Text>
                    <Text>60s</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text>Ping Interval</Text>
                    <Text>25s</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text>Max Payload</Text>
                    <Text>100kb</Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
