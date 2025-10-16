/**
 * AI Service - OpenAI Integration
 * Handles AI-powered chat responses, intent detection, and sentiment analysis
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export interface ChatContext {
  storeInfo?: {
    name: string;
    currency: string;
    locale: string;
  };
  customerInfo?: {
    name?: string;
    email?: string;
    orderHistory?: any[];
  };
  conversationHistory: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  intent?: string;
  language?: string;
}

export interface AIResponse {
  message: string;
  intent?: string;
  confidence?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  suggestedActions?: string[];
  metadata?: Record<string, any>;
}

/**
 * Generate AI response for customer query
 */
export async function generateChatResponse(
  userMessage: string,
  context: ChatContext
): Promise<AIResponse> {
  try {
    const systemPrompt = buildSystemPrompt(context);
    
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...context.conversationHistory,
      { role: 'user', content: userMessage },
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages,
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '500'),
    });

    const aiMessage = completion.choices[0]?.message?.content || 'I apologize, but I encountered an error processing your request.';

    const intent = await detectIntent(userMessage);
    const sentiment = await analyzeSentiment(userMessage);

    return {
      message: aiMessage,
      intent: intent.intent,
      confidence: intent.confidence,
      sentiment,
      suggestedActions: getSuggestedActions(intent.intent),
    };
  } catch (error) {
    console.error('AI Service Error:', error);
    return {
      message: 'I apologize for the inconvenience. How else can I assist you today?',
      intent: 'error',
      confidence: 0,
      sentiment: 'neutral',
    };
  }
}

/**
 * Build system prompt with store and customer context
 */
function buildSystemPrompt(context: ChatContext): string {
  const { storeInfo, customerInfo, language = 'en' } = context;

  let prompt = `You are a helpful AI customer support assistant for ${storeInfo?.name || 'an e-commerce store'}. 

Your responsibilities:
- Answer customer questions accurately and professionally
- Help with order tracking, product information, and general inquiries
- Be empathetic, friendly, and solution-oriented
- Keep responses concise but informative
- Always maintain customer privacy and data security
- If you don't know something, be honest and offer to escalate to a human agent

Store Information:
- Currency: ${storeInfo?.currency || 'USD'}
- Locale: ${storeInfo?.locale || 'en'}
- Language: ${language}
`;

  if (customerInfo?.name) {
    prompt += `\nCustomer: ${customerInfo.name}`;
  }

  if (customerInfo?.orderHistory && customerInfo.orderHistory.length > 0) {
    prompt += `\nCustomer has ${customerInfo.orderHistory.length} previous orders.`;
  }

  prompt += '\n\nRespond in a helpful, professional, and friendly manner. If responding in a non-English language, use the appropriate language consistently.';

  return prompt;
}

/**
 * Detect user intent from message
 */
export async function detectIntent(message: string): Promise<{
  intent: string;
  confidence: number;
  entities?: Record<string, any>;
}> {
  try {
    const prompt = `Analyze this customer message and determine the primary intent. Respond with JSON only.

Message: "${message}"

Possible intents:
- order_tracking: Customer wants to track an order
- product_inquiry: Asking about products
- shipping_info: Questions about shipping
- return_refund: Returns or refunds
- payment_issue: Payment problems
- general_question: General questions
- complaint: Customer complaint
- compliment: Positive feedback
- technical_support: Technical issues

Respond in this exact JSON format:
{
  "intent": "intent_name",
  "confidence": 0.0-1.0,
  "entities": {}
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 150,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(response);

    return {
      intent: result.intent || 'general_question',
      confidence: result.confidence || 0.5,
      entities: result.entities || {},
    };
  } catch (error) {
    console.error('Intent Detection Error:', error);
    return {
      intent: 'general_question',
      confidence: 0.3,
    };
  }
}

/**
 * Analyze sentiment of customer message
 */
export async function analyzeSentiment(
  message: string
): Promise<'positive' | 'neutral' | 'negative'> {
  try {
    const prompt = `Analyze the sentiment of this customer message. Respond with only one word: positive, neutral, or negative.

Message: "${message}"`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 10,
    });

    const sentiment = completion.choices[0]?.message?.content?.trim().toLowerCase();

    if (sentiment === 'positive' || sentiment === 'negative') {
      return sentiment;
    }
    return 'neutral';
  } catch (error) {
    console.error('Sentiment Analysis Error:', error);
    return 'neutral';
  }
}

/**
 * Get suggested actions based on detected intent
 */
function getSuggestedActions(intent?: string): string[] {
  const actionMap: Record<string, string[]> = {
    order_tracking: ['Show Order Status', 'Provide Tracking Link', 'Estimate Delivery'],
    product_inquiry: ['Show Product Details', 'View Similar Products', 'Check Availability'],
    shipping_info: ['Show Shipping Options', 'Calculate Shipping Cost', 'View Delivery Times'],
    return_refund: ['Start Return Process', 'View Return Policy', 'Check Refund Status'],
    payment_issue: ['Contact Support', 'Retry Payment', 'View Payment Methods'],
    complaint: ['Escalate to Human Agent', 'Offer Apology', 'Provide Solution'],
    technical_support: ['Contact Technical Support', 'View Help Articles', 'Submit Ticket'],
  };

  return actionMap[intent || 'general_question'] || ['Continue Conversation'];
}

/**
 * Generate FAQ suggestions based on query
 */
export async function generateFAQSuggestions(
  query: string,
  faqs: Array<{ question: string; answer: string }>
): Promise<Array<{ question: string; answer: string; score: number }>> {
  try {
    if (faqs.length === 0) return [];

    const faqTexts = faqs.map((faq, i) => `${i}: ${faq.question}`).join('\n');

    const prompt = `Given this customer query: "${query}"

Match it against these FAQs and return the top 3 most relevant ones with confidence scores (0-1):
${faqTexts}

Respond in JSON format:
{
  "matches": [
    {"index": 0, "score": 0.95},
    {"index": 1, "score": 0.85}
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 200,
    });

    const response = JSON.parse(completion.choices[0]?.message?.content || '{"matches":[]}');
    
    return response.matches
      .slice(0, 3)
      .map((match: any) => ({
        ...faqs[match.index],
        score: match.score,
      }));
  } catch (error) {
    console.error('FAQ Suggestion Error:', error);
    return [];
  }
}

/**
 * Translate message to target language
 */
export async function translateMessage(
  message: string,
  targetLanguage: string
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: `Translate this message to ${targetLanguage}: "${message}"`,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    return completion.choices[0]?.message?.content || message;
  } catch (error) {
    console.error('Translation Error:', error);
    return message;
  }
}

export default {
  generateChatResponse,
  detectIntent,
  analyzeSentiment,
  generateFAQSuggestions,
  translateMessage,
};
