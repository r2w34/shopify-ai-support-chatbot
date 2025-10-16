/**
 * FAQ Management Page
 * Create, edit, delete FAQs with multi-language support
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
  Button,
  DataTable,
  Badge,
  Modal,
  EmptyState,
  Filters,
  ChoiceList,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  language: string;
  priority: number;
  enabled: boolean;
  useCount: number;
  lastUsed: string | null;
}

interface LoaderData {
  faqs: FAQ[];
  storeId: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  try {
    const url = new URL(request.url);
    const language = url.searchParams.get('language') || 'en';
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');

    const store = await prisma.store.findUnique({
      where: { shopDomain: session.shop },
      include: {
        faqs: {
          where: {
            ...(language && { language }),
            ...(category && { category }),
            ...(search && {
              OR: [
                { question: { contains: search } },
                { answer: { contains: search } },
              ],
            }),
          },
          orderBy: { priority: 'desc' },
        },
      },
    });

    if (!store) {
      return json({ error: 'Store not found' }, { status: 404 });
    }

    return json<LoaderData>({
      faqs: store.faqs.map(faq => ({
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        language: faq.language,
        priority: faq.priority,
        enabled: faq.enabled,
        useCount: faq.useCount,
        lastUsed: faq.lastUsed?.toISOString() || null,
      })),
      storeId: store.id,
    });
  } catch (error) {
    console.error('FAQs loader error:', error);
    return json({ faqs: [], storeId: '' });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  try {
    const formData = await request.formData();
    const action = formData.get('_action') as string;
    const storeId = formData.get('storeId') as string;

    if (action === 'create' || action === 'update') {
      const faqData = {
        question: formData.get('question') as string,
        answer: formData.get('answer') as string,
        category: formData.get('category') as string || null,
        language: formData.get('language') as string,
        priority: parseInt(formData.get('priority') as string) || 0,
        enabled: formData.get('enabled') === 'true',
      };

      if (action === 'create') {
        await prisma.fAQ.create({
          data: { ...faqData, storeId },
        });
      } else {
        const faqId = formData.get('faqId') as string;
        await prisma.fAQ.update({
          where: { id: faqId },
          data: faqData,
        });
      }
    } else if (action === 'delete') {
      const faqId = formData.get('faqId') as string;
      await prisma.fAQ.delete({
        where: { id: faqId },
      });
    }

    return json({ success: true });
  } catch (error) {
    console.error('FAQs action error:', error);
    return json({ success: false, error: 'Action failed' }, { status: 500 });
  }
};

export default function FAQs() {
  const data = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const shopify = useAppBridge();

  const isLoading = navigation.state === "submitting";

  // Modal state
  const [modalActive, setModalActive] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('en');
  const [priority, setPriority] = useState('0');
  const [enabled, setEnabled] = useState(true);

  // Filters
  const [searchValue, setSearchValue] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

  const handleOpenModal = useCallback((faq?: FAQ) => {
    if (faq) {
      setEditingFaq(faq);
      setQuestion(faq.question);
      setAnswer(faq.answer);
      setCategory(faq.category || '');
      setLanguage(faq.language);
      setPriority(faq.priority.toString());
      setEnabled(faq.enabled);
    } else {
      setEditingFaq(null);
      setQuestion('');
      setAnswer('');
      setCategory('');
      setLanguage('en');
      setPriority('0');
      setEnabled(true);
    }
    setModalActive(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalActive(false);
    setEditingFaq(null);
  }, []);

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.append('_action', editingFaq ? 'update' : 'create');
    formData.append('storeId', data.storeId);
    if (editingFaq) formData.append('faqId', editingFaq.id);
    formData.append('question', question);
    formData.append('answer', answer);
    formData.append('category', category);
    formData.append('language', language);
    formData.append('priority', priority);
    formData.append('enabled', enabled.toString());

    submit(formData, { method: 'post' });
    handleCloseModal();
    shopify.toast.show('FAQ saved successfully');
  }, [editingFaq, question, answer, category, language, priority, enabled, data.storeId, submit, handleCloseModal, shopify]);

  const handleDelete = useCallback((faqId: string) => {
    if (confirm('Are you sure you want to delete this FAQ?')) {
      const formData = new FormData();
      formData.append('_action', 'delete');
      formData.append('faqId', faqId);
      submit(formData, { method: 'post' });
      shopify.toast.show('FAQ deleted');
    }
  }, [submit, shopify]);

  const filteredFaqs = data.faqs.filter(faq => {
    const matchesSearch = !searchValue ||
      faq.question.toLowerCase().includes(searchValue.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchValue.toLowerCase());
    const matchesLanguage = languageFilter.length === 0 || languageFilter.includes(faq.language);
    const matchesCategory = categoryFilter.length === 0 || categoryFilter.includes(faq.category || '');
    return matchesSearch && matchesLanguage && matchesCategory;
  });

  const faqRows = filteredFaqs.map(faq => [
    faq.question,
    faq.answer.substring(0, 100) + (faq.answer.length > 100 ? '...' : ''),
    faq.category || '--',
    <Badge>{faq.language.toUpperCase()}</Badge>,
    faq.useCount.toString(),
    <Badge tone={faq.enabled ? 'success' : undefined}>{faq.enabled ? 'Active' : 'Disabled'}</Badge>,
    <InlineStack gap="200">
      <Button size="slim" onClick={() => handleOpenModal(faq)}>Edit</Button>
      <Button size="slim" tone="critical" onClick={() => handleDelete(faq.id)}>Delete</Button>
    </InlineStack>,
  ]);

  const languageOptions = [
    { label: 'English', value: 'en' },
    { label: 'Spanish', value: 'es' },
    { label: 'French', value: 'fr' },
    { label: 'German', value: 'de' },
    { label: 'Portuguese', value: 'pt' },
  ];

  const filters = [
    {
      key: 'language',
      label: 'Language',
      filter: (
        <ChoiceList
          title="Language"
          titleHidden
          choices={languageOptions}
          selected={languageFilter}
          onChange={setLanguageFilter}
          allowMultiple
        />
      ),
      shortcut: true,
    },
  ];

  return (
    <Page
      title="FAQ Management"
      backAction={{ url: '/app' }}
      primaryAction={{
        content: 'Add FAQ',
        onAction: () => handleOpenModal(),
      }}
    >
      <TitleBar title="FAQs" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Filters
                queryValue={searchValue}
                queryPlaceholder="Search FAQs..."
                onQueryChange={setSearchValue}
                onQueryClear={() => setSearchValue('')}
                filters={filters}
                onClearAll={() => {
                  setSearchValue('');
                  setLanguageFilter([]);
                  setCategoryFilter([]);
                }}
              />

              {filteredFaqs.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text', 'numeric', 'text', 'text']}
                  headings={['Question', 'Answer', 'Category', 'Language', 'Uses', 'Status', 'Actions']}
                  rows={faqRows}
                />
              ) : (
                <EmptyState
                  heading="No FAQs yet"
                  action={{ content: 'Add FAQ', onAction: () => handleOpenModal() }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Create FAQs to help customers find answers quickly.</p>
                </EmptyState>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">FAQ Statistics</Text>
                <InlineStack align="space-between">
                  <Text>Total FAQs</Text>
                  <Text fontWeight="semibold">{data.faqs.length}</Text>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text>Active FAQs</Text>
                  <Text fontWeight="semibold">
                    {data.faqs.filter(f => f.enabled).length}
                  </Text>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text>Total Uses</Text>
                  <Text fontWeight="semibold">
                    {data.faqs.reduce((sum, f) => sum + f.useCount, 0)}
                  </Text>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">Tips</Text>
                <BlockStack gap="200">
                  <Text as="p">• Keep answers concise and clear</Text>
                  <Text as="p">• Use categories to organize FAQs</Text>
                  <Text as="p">• Add FAQs in multiple languages</Text>
                  <Text as="p">• Higher priority = shown first</Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>

      {/* Add/Edit Modal */}
      <Modal
        open={modalActive}
        onClose={handleCloseModal}
        title={editingFaq ? 'Edit FAQ' : 'Add FAQ'}
        primaryAction={{
          content: 'Save',
          onAction: handleSave,
          loading: isLoading,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: handleCloseModal,
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <TextField
              label="Question"
              value={question}
              onChange={setQuestion}
              autoComplete="off"
              placeholder="What is your return policy?"
            />

            <TextField
              label="Answer"
              value={answer}
              onChange={setAnswer}
              multiline={4}
              autoComplete="off"
              placeholder="We accept returns within 30 days..."
            />

            <TextField
              label="Category"
              value={category}
              onChange={setCategory}
              autoComplete="off"
              placeholder="Returns, Shipping, etc."
              helpText="Optional: Group related FAQs"
            />

            <Select
              label="Language"
              options={languageOptions}
              value={language}
              onChange={setLanguage}
            />

            <TextField
              label="Priority"
              type="number"
              value={priority}
              onChange={setPriority}
              autoComplete="off"
              helpText="Higher numbers appear first (0-100)"
            />

            <label>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span style={{ marginLeft: '8px' }}>Enabled</span>
            </label>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
