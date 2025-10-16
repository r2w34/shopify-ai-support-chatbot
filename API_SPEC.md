# 🔌 API Specification - AI Support Chatbot

Complete API reference for the AI Support Chatbot Shopify app.

**Base URL**: `https://your-app-domain.com`  
**API Version**: `v1`  
**Authentication**: Shopify Session Tokens / OAuth

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Chat API](#chat-api)
3. [Orders API](#orders-api)
4. [Products API](#products-api)
5. [Analytics API](#analytics-api)
6. [Settings API](#settings-api)
7. [Billing API](#billing-api)
8. [Webhooks](#webhooks)
9. [Error Codes](#error-codes)

---

## 🔐 Authentication

### Session Tokens (Embedded Apps)
All requests to the app from within Shopify admin include a session token in the `Authorization` header:

```
Authorization: Bearer <session_token>
```

### API Key (External Integrations)
For external integrations (e.g., mobile apps):

```
X-API-Key: your_api_key
X-Shop-Domain: store.myshopify.com
```

---

## 💬 Chat API

### Send Message

**Endpoint**: `POST /api/chat/message`

Send a message to the AI chatbot and receive a response.

**Request Body**:
```json
{
  "sessionId": "session_abc123",
  "message": "Where is my order #1234?",
  "customerId": "customer_id_optional",
  "customerEmail": "customer@example.com",
  "language": "en"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "messageId": "msg_xyz789",
    "response": "Let me check your order status for #1234...",
    "intent": "order_tracking",
    "confidence": 0.95,
    "sentiment": "neutral",
    "suggestedActions": ["Show Order Status", "Track Package"],
    "recommendations": [
      {
        "productId": "123",
        "title": "Related Product",
        "price": "29.99"
      }
    ]
  }
}
```

**Status Codes**:
- `200` - Success
- `400` - Invalid request
- `401` - Unauthorized
- `429` - Rate limit exceeded
- `500` - Server error

---

### Get Chat History

**Endpoint**: `GET /api/chat/history/:sessionId`

Retrieve chat history for a session.

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "session_abc123",
    "messages": [
      {
        "id": "msg_001",
        "sender": "customer",
        "message": "Hello!",
        "timestamp": "2025-10-16T10:30:00Z",
        "isAI": false
      },
      {
        "id": "msg_002",
        "sender": "bot",
        "message": "Hi! How can I help you today?",
        "timestamp": "2025-10-16T10:30:01Z",
        "isAI": true,
        "intent": "greeting",
        "confidence": 0.99
      }
    ],
    "metadata": {
      "totalMessages": 2,
      "startedAt": "2025-10-16T10:30:00Z",
      "status": "active"
    }
  }
}
```

---

### Create Chat Session

**Endpoint**: `POST /api/chat/session`

Create a new chat session.

**Request Body**:
```json
{
  "customerId": "customer_123",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "channel": "widget",
  "language": "en",
  "metadata": {
    "source": "homepage",
    "userAgent": "Mozilla/5.0..."
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "session_abc123",
    "sessionToken": "token_xyz",
    "welcomeMessage": "Hi! How can I help you today?",
    "settings": {
      "primaryColor": "#5C6AC4",
      "position": "bottom-right"
    }
  }
}
```

---

### End Chat Session

**Endpoint**: `POST /api/chat/session/:sessionId/end`

End a chat session and collect feedback.

**Request Body**:
```json
{
  "satisfactionScore": 5,
  "feedback": "Very helpful!",
  "resolved": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "session_abc123",
    "endedAt": "2025-10-16T11:00:00Z",
    "duration": 1800,
    "messageCount": 12
  }
}
```

---

## 📦 Orders API

### Find Order

**Endpoint**: `GET /api/orders/find`

Find an order by order number or email.

**Query Parameters**:
- `search` (required): Order number or email
- `customerId` (optional): Customer ID for verification

**Example**:
```
GET /api/orders/find?search=1234
GET /api/orders/find?search=customer@example.com
```

**Response**:
```json
{
  "success": true,
  "data": {
    "orderId": "order_123",
    "orderNumber": "#1234",
    "email": "customer@example.com",
    "totalPrice": "99.99",
    "currency": "USD",
    "financialStatus": "PAID",
    "fulfillmentStatus": "FULFILLED",
    "createdAt": "2025-10-10T10:00:00Z",
    "lineItems": [
      {
        "id": "item_1",
        "title": "Product Name",
        "quantity": 2,
        "price": "49.99",
        "image": "https://cdn.shopify.com/..."
      }
    ],
    "trackingInfo": [
      {
        "company": "USPS",
        "number": "9400123456789",
        "url": "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400123456789"
      }
    ],
    "estimatedDelivery": "2025-10-20T00:00:00Z"
  }
}
```

---

### Get Customer Orders

**Endpoint**: `GET /api/orders/customer/:customerId`

Get all orders for a customer.

**Query Parameters**:
- `limit` (optional, default: 10): Number of orders to return
- `status` (optional): Filter by status

**Response**:
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "orderId": "order_123",
        "orderNumber": "#1234",
        "totalPrice": "99.99",
        "currency": "USD",
        "status": "FULFILLED",
        "createdAt": "2025-10-10T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 10,
      "hasMore": true
    }
  }
}
```

---

## 🛍️ Products API

### Get Recommendations

**Endpoint**: `GET /api/products/recommendations`

Get personalized product recommendations.

**Query Parameters**:
- `customerId` (optional): Customer ID for personalization
- `productId` (optional): Current product for related products
- `cartItems` (optional): Comma-separated product IDs in cart
- `limit` (optional, default: 6): Number of recommendations

**Response**:
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "product_123",
        "title": "Recommended Product",
        "handle": "recommended-product",
        "price": "29.99",
        "currency": "USD",
        "image": "https://cdn.shopify.com/...",
        "tags": ["bestseller", "new"],
        "score": 0.92,
        "reason": "collaborative_filtering"
      }
    ],
    "algorithm": "collaborative_filtering",
    "metadata": {
      "personalizedFor": "customer_123",
      "generatedAt": "2025-10-16T10:30:00Z"
    }
  }
}
```

---

### Search Products

**Endpoint**: `GET /api/products/search`

Search products with AI-enhanced results.

**Query Parameters**:
- `q` (required): Search query
- `limit` (optional, default: 10)
- `language` (optional, default: "en")

**Response**:
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "product_123",
        "title": "Product Name",
        "description": "Product description...",
        "price": "49.99",
        "image": "https://cdn.shopify.com/...",
        "relevanceScore": 0.95
      }
    ],
    "total": 25,
    "query": "blue shoes",
    "suggestions": ["blue sneakers", "navy shoes"]
  }
}
```

---

## 📊 Analytics API

### Get Dashboard Metrics

**Endpoint**: `GET /api/analytics/dashboard`

Get dashboard metrics for the merchant.

**Query Parameters**:
- `startDate` (required): ISO 8601 date
- `endDate` (required): ISO 8601 date
- `timezone` (optional, default: "UTC")

**Response**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalChats": 1234,
      "activeUsers": 456,
      "messagesExchanged": 5678,
      "avgResponseTime": 2.5,
      "avgSatisfaction": 4.7,
      "conversionsFromChat": 89,
      "revenueFromChat": 12345.67
    },
    "trends": {
      "chatVolume": [
        { "date": "2025-10-01", "count": 45 },
        { "date": "2025-10-02", "count": 52 }
      ],
      "satisfactionScore": [
        { "date": "2025-10-01", "score": 4.5 },
        { "date": "2025-10-02", "score": 4.8 }
      ]
    },
    "topIntents": [
      { "intent": "order_tracking", "count": 234, "percentage": 23.4 },
      { "intent": "product_inquiry", "count": 189, "percentage": 18.9 }
    ],
    "topProducts": [
      { "productId": "123", "title": "Product A", "mentions": 45 }
    ]
  }
}
```

---

### Export Analytics

**Endpoint**: `POST /api/analytics/export`

Export analytics data as CSV or JSON.

**Request Body**:
```json
{
  "startDate": "2025-10-01",
  "endDate": "2025-10-31",
  "metrics": ["chats", "conversions", "revenue"],
  "format": "csv"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://cdn.example.com/exports/analytics-2025-10.csv",
    "expiresAt": "2025-10-17T10:30:00Z",
    "fileSize": 12345
  }
}
```

---

## ⚙️ Settings API

### Get Chat Settings

**Endpoint**: `GET /api/settings/chat`

Get current chat settings for the store.

**Response**:
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "widgetPosition": "bottom-right",
    "primaryColor": "#5C6AC4",
    "accentColor": "#00848E",
    "welcomeMessage": "Hi! How can I help you today?",
    "offlineMessage": "We're currently offline. Leave a message!",
    "businessHours": {
      "enabled": true,
      "timezone": "America/New_York",
      "hours": {
        "monday": { "open": "09:00", "close": "17:00" },
        "tuesday": { "open": "09:00", "close": "17:00" }
      }
    },
    "autoReplyEnabled": true,
    "orderTrackingEnabled": true,
    "productRecsEnabled": true,
    "languages": ["en", "es", "fr"],
    "aiModel": "gpt-4",
    "aiTemperature": 0.7,
    "maxTokens": 500
  }
}
```

---

### Update Chat Settings

**Endpoint**: `PUT /api/settings/chat`

Update chat settings.

**Request Body**:
```json
{
  "primaryColor": "#FF0000",
  "welcomeMessage": "Welcome! How may I assist you?",
  "languages": ["en", "es", "fr", "de"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "updated": true,
    "settings": { /* updated settings */ }
  }
}
```

---

### Get FAQs

**Endpoint**: `GET /api/settings/faqs`

Get all FAQs for the store.

**Query Parameters**:
- `language` (optional, default: "en")
- `category` (optional)
- `enabled` (optional, default: true)

**Response**:
```json
{
  "success": true,
  "data": {
    "faqs": [
      {
        "id": "faq_123",
        "question": "What is your return policy?",
        "answer": "We offer 30-day returns...",
        "category": "returns",
        "language": "en",
        "priority": 10,
        "enabled": true,
        "useCount": 45,
        "lastUsed": "2025-10-15T10:00:00Z"
      }
    ],
    "total": 25
  }
}
```

---

### Create/Update FAQ

**Endpoint**: `POST /api/settings/faqs`

Create or update an FAQ.

**Request Body**:
```json
{
  "question": "What is your return policy?",
  "answer": "We offer 30-day returns...",
  "category": "returns",
  "language": "en",
  "priority": 10
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "faqId": "faq_123",
    "created": true
  }
}
```

---

## 💳 Billing API

### Get Current Plan

**Endpoint**: `GET /api/billing/plan`

Get the store's current subscription plan.

**Response**:
```json
{
  "success": true,
  "data": {
    "plan": "professional",
    "status": "ACTIVE",
    "price": 79,
    "currency": "USD",
    "billingInterval": "EVERY_30_DAYS",
    "trialDaysRemaining": 7,
    "currentPeriodStart": "2025-10-01T00:00:00Z",
    "currentPeriodEnd": "2025-10-31T23:59:59Z",
    "features": [
      "2000 chats/month",
      "GPT-4 AI",
      "All integrations",
      "Cart abandonment",
      "Analytics dashboard"
    ],
    "usage": {
      "chatsUsed": 1234,
      "chatsLimit": 2000,
      "percentage": 61.7
    }
  }
}
```

---

### Upgrade/Downgrade Plan

**Endpoint**: `POST /api/billing/plan/change`

Change subscription plan.

**Request Body**:
```json
{
  "newPlan": "enterprise"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "confirmationUrl": "https://admin.shopify.com/charge/...",
    "redirectRequired": true
  }
}
```

---

### Get Billing History

**Endpoint**: `GET /api/billing/history`

Get billing history.

**Query Parameters**:
- `limit` (optional, default: 10)
- `startDate` (optional)
- `endDate` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "charges": [
      {
        "id": "charge_123",
        "amount": 79,
        "currency": "USD",
        "status": "PAID",
        "billingOn": "2025-10-01T00:00:00Z",
        "description": "Professional Plan - October 2025"
      }
    ],
    "total": 3
  }
}
```

---

## 🔔 Webhooks

### Webhook Payload Structure

All webhooks include:
- `X-Shopify-Topic` header
- `X-Shopify-Shop-Domain` header
- `X-Shopify-Webhook-Id` header
- `X-Shopify-Hmac-Sha256` header (for verification)

### Order Created

**Topic**: `orders/create`  
**Endpoint**: `POST /webhooks/orders/create`

**Payload**:
```json
{
  "id": 1234567890,
  "email": "customer@example.com",
  "name": "#1234",
  "total_price": "99.99",
  "financial_status": "paid",
  "fulfillment_status": null,
  "line_items": [...]
}
```

---

### Customer Data Request (GDPR)

**Topic**: `customers/data_request`  
**Endpoint**: `POST /webhooks/customers/data_request`

**Payload**:
```json
{
  "shop_id": 1234567,
  "shop_domain": "store.myshopify.com",
  "customer": {
    "id": 9876543210,
    "email": "customer@example.com"
  },
  "orders_requested": [1234, 5678]
}
```

---

## ❌ Error Codes

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid session ID provided",
    "details": {
      "field": "sessionId",
      "reason": "Session not found or expired"
    }
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Request validation failed |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Access denied |
| `NOT_FOUND` | Resource not found |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `PAYMENT_REQUIRED` | Subscription upgrade required |
| `SERVER_ERROR` | Internal server error |
| `SERVICE_UNAVAILABLE` | Service temporarily down |

---

## 🚦 Rate Limiting

### Limits
- **Free Plan**: 100 requests/minute
- **Starter Plan**: 500 requests/minute
- **Professional Plan**: 2,000 requests/minute
- **Enterprise Plan**: 10,000 requests/minute

### Headers
All responses include rate limit headers:
```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 498
X-RateLimit-Reset: 1634567890
```

### Rate Limit Exceeded Response
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 60 seconds.",
    "retryAfter": 60
  }
}
```

---

## 📝 Best Practices

1. **Always verify webhook HMAC signatures**
2. **Implement exponential backoff for retries**
3. **Cache responses when appropriate**
4. **Use pagination for large datasets**
5. **Handle rate limiting gracefully**
6. **Validate input data**
7. **Use HTTPS for all requests**
8. **Store API keys securely**
9. **Log errors for debugging**
10. **Monitor API usage**

---

**Last Updated**: 2025-10-16  
**API Version**: v1.0.0
