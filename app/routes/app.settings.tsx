/**
 * Chat Settings Page
 * Configure chat widget appearance, behavior, and AI settings
 */

import { useState, useCallback } from "react";
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
  TextField,
  Select,
  Checkbox,
  Button,
  Banner,
  ColorPicker,
  Form,
  FormLayout,
  Box,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

interface ChatSettings {
  id: string;
  enabled: boolean;
  widgetPosition: string;
  primaryColor: string;
  accentColor: string;
  welcomeMessage: string;
  offlineMessage: string;
  autoReplyEnabled: boolean;
  orderTrackingEnabled: boolean;
  productRecsEnabled: boolean;
  languages: string;
  aiModel: string;
  aiTemperature: number;
  maxTokens: number;
}

interface LoaderData {
  settings: ChatSettings;
  storeId: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  try {
    const store = await prisma.store.findUnique({
      where: { shopDomain: session.shop },
      include: { chatSettings: true },
    });

    if (!store || !store.chatSettings) {
      return json({ error: 'Store not found' }, { status: 404 });
    }

    return json<LoaderData>({
      settings: {
        id: store.chatSettings.id,
        enabled: store.chatSettings.enabled,
        widgetPosition: store.chatSettings.widgetPosition,
        primaryColor: store.chatSettings.primaryColor,
        accentColor: store.chatSettings.accentColor,
        welcomeMessage: store.chatSettings.welcomeMessage,
        offlineMessage: store.chatSettings.offlineMessage,
        autoReplyEnabled: store.chatSettings.autoReplyEnabled,
        orderTrackingEnabled: store.chatSettings.orderTrackingEnabled,
        productRecsEnabled: store.chatSettings.productRecsEnabled,
        languages: store.chatSettings.languages,
        aiModel: store.chatSettings.aiModel,
        aiTemperature: store.chatSettings.aiTemperature,
        maxTokens: store.chatSettings.maxTokens,
      },
      storeId: store.id,
    });
  } catch (error) {
    console.error('Settings loader error:', error);
    return json({ error: 'Failed to load settings' }, { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  try {
    const formData = await request.formData();
    const storeId = formData.get('storeId') as string;

    const updatedSettings = await prisma.chatSettings.update({
      where: { storeId },
      data: {
        enabled: formData.get('enabled') === 'true',
        widgetPosition: formData.get('widgetPosition') as string,
        primaryColor: formData.get('primaryColor') as string,
        accentColor: formData.get('accentColor') as string,
        welcomeMessage: formData.get('welcomeMessage') as string,
        offlineMessage: formData.get('offlineMessage') as string,
        autoReplyEnabled: formData.get('autoReplyEnabled') === 'true',
        orderTrackingEnabled: formData.get('orderTrackingEnabled') === 'true',
        productRecsEnabled: formData.get('productRecsEnabled') === 'true',
        languages: formData.get('languages') as string,
        aiModel: formData.get('aiModel') as string,
        aiTemperature: parseFloat(formData.get('aiTemperature') as string),
        maxTokens: parseInt(formData.get('maxTokens') as string),
      },
    });

    return json({ success: true, settings: updatedSettings });
  } catch (error) {
    console.error('Settings action error:', error);
    return json({ success: false, error: 'Failed to save settings' }, { status: 500 });
  }
};

export default function Settings() {
  const data = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const shopify = useAppBridge();

  const isLoading = navigation.state === "submitting";

  // Form state
  const [enabled, setEnabled] = useState(data.settings.enabled);
  const [widgetPosition, setWidgetPosition] = useState(data.settings.widgetPosition);
  const [primaryColor, setPrimaryColor] = useState(data.settings.primaryColor);
  const [accentColor, setAccentColor] = useState(data.settings.accentColor);
  const [welcomeMessage, setWelcomeMessage] = useState(data.settings.welcomeMessage);
  const [offlineMessage, setOfflineMessage] = useState(data.settings.offlineMessage);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(data.settings.autoReplyEnabled);
  const [orderTrackingEnabled, setOrderTrackingEnabled] = useState(data.settings.orderTrackingEnabled);
  const [productRecsEnabled, setProductRecsEnabled] = useState(data.settings.productRecsEnabled);
  const [languages, setLanguages] = useState(data.settings.languages);
  const [aiModel, setAiModel] = useState(data.settings.aiModel);
  const [aiTemperature, setAiTemperature] = useState(data.settings.aiTemperature.toString());
  const [maxTokens, setMaxTokens] = useState(data.settings.maxTokens.toString());

  const handleSubmit = useCallback(() => {
    const formData = new FormData();
    formData.append('storeId', data.storeId);
    formData.append('enabled', enabled.toString());
    formData.append('widgetPosition', widgetPosition);
    formData.append('primaryColor', primaryColor);
    formData.append('accentColor', accentColor);
    formData.append('welcomeMessage', welcomeMessage);
    formData.append('offlineMessage', offlineMessage);
    formData.append('autoReplyEnabled', autoReplyEnabled.toString());
    formData.append('orderTrackingEnabled', orderTrackingEnabled.toString());
    formData.append('productRecsEnabled', productRecsEnabled.toString());
    formData.append('languages', languages);
    formData.append('aiModel', aiModel);
    formData.append('aiTemperature', aiTemperature);
    formData.append('maxTokens', maxTokens);

    submit(formData, { method: 'post' });
    shopify.toast.show('Settings saved successfully');
  }, [
    enabled, widgetPosition, primaryColor, accentColor, welcomeMessage,
    offlineMessage, autoReplyEnabled, orderTrackingEnabled, productRecsEnabled,
    languages, aiModel, aiTemperature, maxTokens, data.storeId, submit, shopify
  ]);

  const positionOptions = [
    { label: 'Bottom Right', value: 'bottom-right' },
    { label: 'Bottom Left', value: 'bottom-left' },
    { label: 'Top Right', value: 'top-right' },
    { label: 'Top Left', value: 'top-left' },
  ];

  const aiModelOptions = [
    { label: 'GPT-4 (Recommended)', value: 'gpt-4' },
    { label: 'GPT-3.5 Turbo (Faster)', value: 'gpt-3.5-turbo' },
  ];

  return (
    <Page
      title="Chat Settings"
      backAction={{ url: '/app' }}
      primaryAction={{
        content: 'Save Settings',
        onAction: handleSubmit,
        loading: isLoading,
      }}
    >
      <TitleBar title="Settings" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* General Settings */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">General Settings</Text>
                
                <Checkbox
                  label="Enable chat widget"
                  checked={enabled}
                  onChange={setEnabled}
                  helpText="Turn the chat widget on or off for your storefront"
                />

                <Select
                  label="Widget position"
                  options={positionOptions}
                  value={widgetPosition}
                  onChange={setWidgetPosition}
                  helpText="Choose where the chat button appears on your store"
                />

                <TextField
                  label="Supported languages"
                  value={languages}
                  onChange={setLanguages}
                  helpText="Comma-separated language codes (e.g., en,es,fr)"
                  autoComplete="off"
                />
              </BlockStack>
            </Card>

            {/* Appearance */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Appearance</Text>

                <InlineStack gap="400" wrap={false}>
                  <div style={{ flex: 1 }}>
                    <BlockStack gap="200">
                      <Text as="label">Primary color</Text>
                      <TextField
                        value={primaryColor}
                        onChange={setPrimaryColor}
                        placeholder="#5C6AC4"
                        autoComplete="off"
                      />
                      <div style={{
                        width: '100%',
                        height: '40px',
                        backgroundColor: primaryColor,
                        borderRadius: '4px',
                        border: '1px solid #ddd'
                      }} />
                    </BlockStack>
                  </div>

                  <div style={{ flex: 1 }}>
                    <BlockStack gap="200">
                      <Text as="label">Accent color</Text>
                      <TextField
                        value={accentColor}
                        onChange={setAccentColor}
                        placeholder="#00848E"
                        autoComplete="off"
                      />
                      <div style={{
                        width: '100%',
                        height: '40px',
                        backgroundColor: accentColor,
                        borderRadius: '4px',
                        border: '1px solid #ddd'
                      }} />
                    </BlockStack>
                  </div>
                </InlineStack>
              </BlockStack>
            </Card>

            {/* Messages */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Messages</Text>

                <TextField
                  label="Welcome message"
                  value={welcomeMessage}
                  onChange={setWelcomeMessage}
                  multiline={3}
                  helpText="First message customers see when they open the chat"
                  autoComplete="off"
                />

                <TextField
                  label="Offline message"
                  value={offlineMessage}
                  onChange={setOfflineMessage}
                  multiline={3}
                  helpText="Message shown when you're offline or unavailable"
                  autoComplete="off"
                />
              </BlockStack>
            </Card>

            {/* Features */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Features</Text>

                <Checkbox
                  label="Enable auto-reply"
                  checked={autoReplyEnabled}
                  onChange={setAutoReplyEnabled}
                  helpText="AI will automatically respond to customer messages"
                />

                <Checkbox
                  label="Enable order tracking"
                  checked={orderTrackingEnabled}
                  onChange={setOrderTrackingEnabled}
                  helpText="Allow customers to track their orders through chat"
                />

                <Checkbox
                  label="Enable product recommendations"
                  checked={productRecsEnabled}
                  onChange={setProductRecsEnabled}
                  helpText="Show personalized product suggestions in chat"
                />
              </BlockStack>
            </Card>

            {/* AI Settings */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">AI Configuration</Text>

                <Banner tone="info">
                  <p>Advanced AI settings affect response quality and cost. Use defaults for best results.</p>
                </Banner>

                <Select
                  label="AI Model"
                  options={aiModelOptions}
                  value={aiModel}
                  onChange={setAiModel}
                  helpText="GPT-4 provides better responses but costs more"
                />

                <TextField
                  label="Temperature"
                  type="number"
                  value={aiTemperature}
                  onChange={setAiTemperature}
                  min="0"
                  max="1"
                  step="0.1"
                  helpText="Controls creativity (0 = focused, 1 = creative)"
                  autoComplete="off"
                />

                <TextField
                  label="Max tokens"
                  type="number"
                  value={maxTokens}
                  onChange={setMaxTokens}
                  min="100"
                  max="2000"
                  step="50"
                  helpText="Maximum response length (higher = longer responses)"
                  autoComplete="off"
                />
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        {/* Preview Sidebar */}
        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">Widget Preview</Text>
                <Box
                  padding="400"
                  background="bg-surface-secondary"
                  borderRadius="200"
                >
                  <div style={{
                    width: '100%',
                    height: '400px',
                    backgroundColor: '#f6f6f7',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: widgetPosition.includes('right') ? 'flex-end' : 'flex-start',
                    padding: '16px',
                  }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      backgroundColor: primaryColor,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '24px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}>
                      💬
                    </div>
                  </div>
                </Box>
                <Text tone="subdued" as="p">
                  This is how your chat button will appear on your storefront.
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">Tips</Text>
                <BlockStack gap="200">
                  <Text as="p">• Use friendly, conversational welcome messages</Text>
                  <Text as="p">• Match colors to your brand for consistency</Text>
                  <Text as="p">• Enable all features for best customer experience</Text>
                  <Text as="p">• Test the widget after saving changes</Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
