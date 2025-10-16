# 🧪 Complete Testing & QA Guide

Comprehensive guide for testing all features of the AI Support Chatbot.

**Last Updated:** 2025-10-16  
**Version:** 1.0.0

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Starting the Application](#starting-the-application)
5. [Testing Checklist](#testing-checklist)
6. [Admin Dashboard Tests](#admin-dashboard-tests)
7. [Chat Widget Tests](#chat-widget-tests)
8. [API Endpoint Tests](#api-endpoint-tests)
9. [Socket.IO Tests](#socketio-tests)
10. [Integration Tests](#integration-tests)
11. [Common Issues](#common-issues)
12. [Bug Reporting](#bug-reporting)

---

## 📦 Prerequisites

### Required Tools
- [ ] Node.js v18.20+ or v20.10+ or v21.0+
- [ ] npm v9+
- [ ] Git
- [ ] curl or Postman (for API testing)
- [ ] Modern web browser (Chrome/Firefox/Safari)

### Required Accounts
- [ ] OpenAI account with API key
- [ ] Shopify Partners account
- [ ] Shopify Development Store

### Check Node Version
```bash
node --version  # Should be v18.20+, v20.10+, or v21.0+
npm --version   # Should be v9+
```

---

## 🔧 Environment Setup

### Step 1: Clone & Install

```bash
# Navigate to project
cd /workspace/ai-support-chatbot

# Install dependencies
npm install

# Verify installation
npm list socket.io express recharts date-fns
```

### Step 2: Create Environment File

```bash
# Copy example
cp .env.example .env

# Edit with your credentials
nano .env
```

### Step 3: Configure Environment Variables

**Required Variables:**

```env
# ═══════════════════════════════════════════════════
# REQUIRED - Application will not work without these
# ═══════════════════════════════════════════════════

# OpenAI API Key (Get from: https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Shopify App Credentials (Get from: https://partners.shopify.com)
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_api_secret_here

# Shopify App URL (Your app's public URL)
SHOPIFY_APP_URL=https://your-tunnel-url.ngrok.io

# Scopes (Already configured in shopify.app.toml, but needed here)
SCOPES=write_products,read_customers,write_customers,read_orders,write_orders

# ═══════════════════════════════════════════════════
# OPTIONAL - Have sensible defaults
# ═══════════════════════════════════════════════════

# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Database (SQLite for development)
DATABASE_URL=file:./dev.db

# Session Secret (Generate random string)
SESSION_SECRET=your-random-secret-key-min-32-chars

# Encryption Key (Generate random string)
ENCRYPTION_KEY=another-random-secret-key-32-chars

# ═══════════════════════════════════════════════════
# OPTIONAL - For production/advanced features
# ═══════════════════════════════════════════════════

# Twilio (for SMS features)
# TWILIO_ACCOUNT_SID=your_twilio_sid
# TWILIO_AUTH_TOKEN=your_twilio_token
# TWILIO_PHONE_NUMBER=+1234567890

# SendGrid (for email features)
# SENDGRID_API_KEY=your_sendgrid_key
# SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Sentry (for error tracking)
# SENTRY_DSN=your_sentry_dsn

# Redis (for multi-server Socket.IO)
# REDIS_URL=redis://localhost:6379
```

### Step 4: Generate Secure Keys

```bash
# Generate session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🗄️ Database Setup

### Step 1: Generate Prisma Client

```bash
npx prisma generate
```

**Expected Output:**
```
✔ Generated Prisma Client
```

### Step 2: Push Schema to Database

```bash
npx prisma db push
```

**Expected Output:**
```
🚀 Your database is now in sync with your Prisma schema.
```

### Step 3: Verify Database

```bash
# Open Prisma Studio (optional, great for debugging)
npx prisma studio
```

Opens browser at: http://localhost:5555

**Check:**
- [ ] All 15 tables exist
- [ ] No errors in console

---

## 🚀 Starting the Application

### Option 1: With Shopify CLI (Recommended)

```bash
npm run dev
```

**This starts:**
- Remix development server
- Socket.IO server
- Shopify CLI tunnel (for OAuth)
- File watcher for hot reload

**Expected Output:**
```
🚀 Server started successfully!
📍 URL: https://your-tunnel.ngrok.io
🔌 Socket.IO: Enabled
🌍 Environment: development
```

### Option 2: Standalone Server (Testing Socket.IO)

```bash
npm run dev:server
```

**This starts:**
- Custom server with Socket.IO
- Remix in development mode
- Available at http://localhost:3000

**Use when:**
- Testing Socket.IO specifically
- Don't need Shopify OAuth
- Local development only

### Step 3: Verify Server is Running

```bash
# Health check
curl http://localhost:3000/health

# Expected: {"status":"ok","timestamp":"2025-10-16T..."}

# Socket.IO status
curl http://localhost:3000/socket/status

# Expected: {"status":"running","activeConnections":0,"activeSessions":0}
```

---

## ✅ Testing Checklist

Use this checklist to track your testing progress.

### Backend Services
- [ ] Server starts without errors
- [ ] Database connection works
- [ ] Prisma migrations applied
- [ ] Health endpoint responds
- [ ] Socket.IO status endpoint works

### Admin Dashboard
- [ ] Dashboard home page loads
- [ ] Settings page loads and saves
- [ ] FAQ management (CRUD operations)
- [ ] Analytics dashboard with charts
- [ ] Billing page displays plans
- [ ] Real-time monitoring page

### Chat Widget
- [ ] Widget appears on storefront
- [ ] Chat button clickable
- [ ] Chat window opens/closes
- [ ] Messages send/receive
- [ ] AI responses generate
- [ ] Product recommendations show
- [ ] Order tracking works
- [ ] Typing indicator appears
- [ ] Mobile responsive

### Real-Time Features
- [ ] Socket.IO connects
- [ ] WebSocket upgrade succeeds
- [ ] Messages broadcast instantly
- [ ] Typing indicators work
- [ ] Reconnection works
- [ ] Multiple tabs sync

### API Endpoints
- [ ] Session creation works
- [ ] Message sending works
- [ ] Settings CRUD works
- [ ] Error handling works

### Integration
- [ ] OAuth flow completes
- [ ] Shopify admin embeds correctly
- [ ] Theme extension installs
- [ ] App permissions granted

---

## 🎛️ Admin Dashboard Tests

### Test 1: Dashboard Home Page

**URL:** `http://localhost:3000/app`

**What to Check:**
- [ ] Page loads without errors
- [ ] Metrics cards display (4 cards)
- [ ] Trend badges show (even if 0)
- [ ] "Recent Chat Sessions" table visible
- [ ] "Quick Actions" buttons present
- [ ] Usage progress bar shows
- [ ] Current plan badge displays
- [ ] Getting started guide visible

**Expected Data (First Load):**
- Total Chats: 0
- Active Users: 0
- Satisfaction: 0/5.0
- Revenue: $0.00
- Empty state for chat sessions

**Actions to Test:**
1. Click "Configure Widget" → Should go to `/app/settings`
2. Click "Manage FAQs" → Should go to `/app/faqs`
3. Click "View Analytics" → Should go to `/app/analytics`
4. Click "Upgrade Plan" → Should go to `/app/billing`

**Check Browser Console:**
- [ ] No JavaScript errors
- [ ] No React warnings
- [ ] No 404s on network tab

---

### Test 2: Settings Page

**URL:** `http://localhost:3000/app/settings`

**What to Check:**
- [ ] Form loads with all fields
- [ ] Enable/disable toggle works
- [ ] Position selector has 4 options
- [ ] Color inputs show current colors
- [ ] Color previews display correctly
- [ ] Welcome message textarea works
- [ ] Feature toggles clickable
- [ ] AI model dropdown works
- [ ] Save button present
- [ ] Widget preview shows in sidebar

**Actions to Test:**

1. **Change Widget Position:**
   - Select "Bottom Left"
   - Click "Save Settings"
   - Check for success toast
   - Verify preview updates

2. **Change Colors:**
   - Change primary color to `#FF5722`
   - Change accent color to `#2196F3`
   - Click "Save Settings"
   - Verify widget preview updates

3. **Toggle Features:**
   - Disable "Enable auto-reply"
   - Save
   - Reload page
   - Verify setting persisted

4. **AI Settings:**
   - Change model to "GPT-3.5 Turbo"
   - Change temperature to 0.5
   - Change max tokens to 300
   - Save and verify

**Expected Behavior:**
- Toast notification on save
- No page reload
- Settings persist after page refresh
- Preview updates in real-time

---

### Test 3: FAQ Management

**URL:** `http://localhost:3000/app/faqs`

**What to Check:**
- [ ] Page loads
- [ ] "Add FAQ" button present
- [ ] Search bar functional
- [ ] Language filter available
- [ ] Empty state shows (first load)
- [ ] Statistics sidebar visible

**Actions to Test:**

1. **Create FAQ:**
   - Click "Add FAQ"
   - Fill in:
     - Question: "What is your return policy?"
     - Answer: "We accept returns within 30 days..."
     - Category: "Returns"
     - Language: "English"
     - Priority: 10
     - Enabled: ✓
   - Click "Save"
   - Verify FAQ appears in table

2. **Create Multiple FAQs:**
   - Add 3-5 more FAQs
   - Use different categories
   - Use different languages
   - Vary priorities

3. **Search Functionality:**
   - Type "return" in search
   - Verify only matching FAQs show
   - Clear search
   - All FAQs return

4. **Filter by Language:**
   - Select "English" filter
   - Verify filtering works
   - Clear filter

5. **Edit FAQ:**
   - Click "Edit" on a FAQ
   - Change question
   - Save
   - Verify changes persist

6. **Delete FAQ:**
   - Click "Delete" on a FAQ
   - Confirm deletion
   - Verify FAQ removed

**Expected Behavior:**
- Modal opens/closes smoothly
- Form validation works
- Table updates without reload
- Statistics update in sidebar
- Toast notifications show

---

### Test 4: Analytics Dashboard

**URL:** `http://localhost:3000/app/analytics`

**What to Check:**
- [ ] Page loads
- [ ] Date range selector present
- [ ] Metrics cards display (4 cards)
- [ ] Charts render (even if empty)
- [ ] Export button present
- [ ] Sidebar with insights

**Charts to Verify:**
- [ ] Chat Volume Over Time (Line chart)
- [ ] Satisfaction Score Trend (Line chart)
- [ ] Top Customer Intents (Bar chart)
- [ ] Sentiment Distribution (Pie chart)

**Actions to Test:**

1. **Change Date Range:**
   - Select "Last 7 days"
   - Verify URL updates (?days=7)
   - Charts reload
   - Metrics update

2. **Export Data:**
   - Click "Export Data" → "Export as CSV"
   - Verify placeholder alert shows
   - (Actual export to be implemented)

**Expected Behavior (With No Data):**
- Empty state messages in charts
- All charts still render
- No JavaScript errors
- Graceful handling of no data

---

### Test 5: Billing & Plans

**URL:** `http://localhost:3000/app/billing`

**What to Check:**
- [ ] Current plan displays
- [ ] Usage meter shows (0/50 for free)
- [ ] All 4 plans display as cards
- [ ] Features list for each plan
- [ ] Upgrade buttons present
- [ ] Billing history section
- [ ] Sidebar with plan comparison

**Plans to Verify:**
- Free: $0/month, 50 chats
- Starter: $29/month, 500 chats
- Professional: $79/month, 2000 chats
- Enterprise: $199/month, Unlimited

**Actions to Test:**

1. **View Current Plan:**
   - Verify "FREE" badge shows
   - Check usage is 0/50
   - Progress bar at 0%

2. **Click Upgrade:**
   - Click "Upgrade" on Starter plan
   - Note: Will fail without Shopify connection
   - Should show error or redirect

3. **View Billing History:**
   - Check for "No billing history yet" message

**Expected Behavior:**
- All plans display correctly
- Current plan highlighted
- Upgrade buttons disabled for Free plan
- Features render as checkmarks

---

### Test 6: Real-Time Monitoring

**URL:** `http://localhost:3000/app/realtime`

**What to Check:**
- [ ] Page loads
- [ ] Socket.IO status shows "Running"
- [ ] Active connections shows 0
- [ ] Server uptime displays
- [ ] Node.js version shows
- [ ] Real-time features list
- [ ] Auto-refresh every 5 seconds

**Actions to Test:**

1. **Monitor Status:**
   - Watch for auto-refresh (every 5s)
   - Status should update automatically

2. **Verify Information:**
   - Node version matches `node --version`
   - Environment shows "development"
   - Socket.IO transport shows "WebSocket + Polling"

**Expected Behavior:**
- Real-time updates without page reload
- No errors in console
- Stats update every 5 seconds

---

## 💬 Chat Widget Tests

### Prerequisites
- Shopify development store created
- App installed on dev store
- Theme extension deployed

### Test 1: Widget Visibility

**On Storefront:**

**What to Check:**
- [ ] Chat button visible in corner
- [ ] Button matches configured position
- [ ] Button color matches settings
- [ ] Button has hover effect
- [ ] Button has pulse animation (optional)

**Locations to Test:**
- Homepage
- Product page
- Collection page
- Cart page
- About page

**Expected:**
- Button appears on all pages
- Position consistent
- No layout breaking

---

### Test 2: Opening Chat Window

**Actions:**
1. Click chat button
2. Observe animation
3. Check window contents

**What to Check:**
- [ ] Window slides up smoothly
- [ ] Header shows store name
- [ ] Welcome message appears
- [ ] Input box visible
- [ ] Send button present
- [ ] Quick action buttons show
- [ ] Window is properly sized

**Desktop:**
- Width: 380px
- Height: 600px
- Positioned relative to button

**Mobile:**
- Full screen overlay
- No scrolling issues
- Touch-friendly buttons

---

### Test 3: Sending Messages

**Actions:**
1. Type "Hello" in input
2. Press Enter or click Send
3. Observe response

**What to Check:**
- [ ] User message appears immediately
- [ ] User bubble styled correctly (right side)
- [ ] Typing indicator appears
- [ ] AI response arrives (3-5 seconds)
- [ ] Bot bubble styled correctly (left side)
- [ ] Timestamps show
- [ ] Auto-scroll to bottom

**Test Messages:**
```
1. "Hello"
2. "What are your return policies?"
3. "Show me some products"
4. "I want to track my order #1234"
5. "Do you have this in blue?"
```

**Expected Behavior:**
- Each message gets AI response
- Conversation flows naturally
- No duplicate messages
- No lost messages

---

### Test 4: Real-Time Features

**Socket.IO Connection:**

1. Open browser console
2. Look for Socket.IO logs:
   ```
   Socket connected
   Socket.IO transport: websocket
   ```

**Typing Indicator:**
1. Start typing message
2. Don't send yet
3. Observe typing dots

**Multiple Tabs:**
1. Open storefront in 2 tabs
2. Send message in Tab 1
3. Verify it appears in Tab 2
4. Send from Tab 2
5. Verify in Tab 1

**What to Check:**
- [ ] Both tabs stay in sync
- [ ] Messages appear instantly
- [ ] No lag or delay
- [ ] Typing indicators work

---

### Test 5: Product Recommendations

**Actions:**
1. Send message: "Show me some products"
2. Wait for AI response
3. Observe recommendations section

**What to Check:**
- [ ] Recommendations panel appears
- [ ] Product cards display
- [ ] Images load
- [ ] Titles show
- [ ] Prices formatted correctly
- [ ] Cards are clickable
- [ ] Horizontal scroll works

**Click Product:**
- Should navigate to product page
- Should open in same or new tab

---

### Test 6: Order Tracking

**Actions:**
1. Send message: "Track order #1234"
2. Wait for response
3. Observe order tracking panel

**What to Check:**
- [ ] Order tracking panel appears
- [ ] Order number displays
- [ ] Status badge shows
- [ ] Status message displays

**Note:** Without real orders, this may show placeholder data.

---

### Test 7: Quick Actions

**Available Actions:**
- 📦 Track Order
- 🛍️ Browse Products
- ❓ Get Help

**Actions:**
1. Click "Track Order"
   - Should prompt for order number
   
2. Click "Browse Products"
   - Should show product recommendations
   
3. Click "Get Help"
   - Should get AI greeting

**What to Check:**
- [ ] Buttons clickable
- [ ] Actions trigger correctly
- [ ] Appropriate responses show

---

### Test 8: Mobile Responsive

**Test on Mobile Device or Emulator:**

**Devices to Test:**
- iPhone (iOS Safari)
- Android (Chrome)
- Tablet (iPad)

**What to Check:**
- [ ] Button sized correctly (56px)
- [ ] Chat opens full screen
- [ ] Input keyboard friendly
- [ ] No horizontal scroll
- [ ] Touch targets large enough
- [ ] Text readable
- [ ] Close button works

**Orientation:**
- Test portrait mode
- Test landscape mode
- Both should work

---

### Test 9: Persistence & Storage

**Actions:**
1. Send 5 messages
2. Close chat
3. Reload page
4. Open chat again

**What to Check:**
- [ ] Previous messages still there
- [ ] Last 10 messages show
- [ ] Session persists
- [ ] No data loss

**Clear Storage:**
1. Open browser DevTools
2. Go to Application → Local Storage
3. Clear `ai_chat_session`
4. Clear `ai_chat_messages`
5. Reload page
6. New session should create

---

## 🔌 API Endpoint Tests

### Test 1: Create Chat Session

```bash
curl -X POST http://localhost:3000/api/chat/session \
  -H "Content-Type: application/json" \
  -d '{
    "customerEmail": "test@example.com",
    "customerName": "Test User",
    "channel": "widget",
    "language": "en"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "abc123xyz789...",
    "sessionToken": "abc123xyz789...",
    "welcomeMessage": "Hi! How can I help you today?",
    "settings": {
      "primaryColor": "#5C6AC4",
      "accentColor": "#00848E",
      "widgetPosition": "bottom-right",
      "enabled": true
    }
  }
}
```

**What to Check:**
- [ ] Status 200
- [ ] `success: true`
- [ ] `sessionId` returned
- [ ] Welcome message present
- [ ] Settings included

---

### Test 2: Send Chat Message

```bash
# Use sessionId from previous response
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "YOUR_SESSION_ID_HERE",
    "message": "Hello, I need help",
    "customerEmail": "test@example.com"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "msg_123",
    "response": "Hi! I'd be happy to help you...",
    "intent": "greeting",
    "confidence": 0.95,
    "sentiment": "neutral",
    "suggestedActions": [],
    "recommendations": null,
    "orderInfo": null
  }
}
```

**What to Check:**
- [ ] Status 200
- [ ] AI response generated
- [ ] Intent detected
- [ ] Sentiment analyzed
- [ ] Response time < 5 seconds

**⚠️ BLOCKER:** Requires `OPENAI_API_KEY` in .env

---

### Test 3: Get/Update Settings

**Get Settings:**
```bash
curl http://localhost:3000/api/settings/chat \
  -H "Authorization: Bearer YOUR_SHOPIFY_TOKEN"
```

**Update Settings:**
```bash
curl -X PUT http://localhost:3000/api/settings/chat \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "widgetPosition": "bottom-right",
    "primaryColor": "#FF5722",
    "welcomeMessage": "Hello! Welcome to our store!"
  }'
```

**Note:** These require Shopify authentication.

---

## 🔌 Socket.IO Tests

### Test 1: Connection Test

**Browser Console:**

```javascript
// Open storefront with chat widget
// Open browser console
// You should see:

Socket.IO: Connecting...
Socket connected: abc123
Socket.IO transport: websocket
```

**Check Network Tab:**
- Look for WebSocket connection
- Should show "101 Switching Protocols"
- Connection should be persistent

---

### Test 2: Message Broadcasting

**Test Setup:**
1. Open storefront in Browser A
2. Open storefront in Browser B
3. Both should connect to same session

**Actions:**
1. Send message from Browser A
2. Immediately check Browser B

**Expected:**
- Message appears in Browser B instantly
- No delay or lag
- Message ID matches
- Timestamp accurate

---

### Test 3: Reconnection

**Actions:**
1. Open chat widget
2. Open Network tab in DevTools
3. Throttle to "Offline"
4. Wait 5 seconds
5. Set back to "Online"

**Expected:**
- Socket disconnects
- Automatic reconnection attempt
- Connection re-established
- No messages lost
- Chat continues working

---

### Test 4: Server Status Monitoring

**Check Active Connections:**

```bash
# While chat windows are open
curl http://localhost:3000/socket/status

# Should show:
{
  "status": "running",
  "activeConnections": 2,  # Number of open chats
  "activeSessions": 2
}
```

**Monitor in Dashboard:**
- Go to `/app/realtime`
- Open chat widget in another tab
- Watch connection count increase
- Close chat
- Watch count decrease

---

## 🔗 Integration Tests

### Test 1: Full Chat Flow

**End-to-End Test:**

1. **Start Fresh:**
   - Clear browser cache
   - Clear local storage
   - Reload storefront

2. **Open Chat:**
   - Click chat button
   - Verify welcome message

3. **Send Messages:**
   - "Hello" → Get greeting
   - "What products do you have?" → Get product recs
   - "I want to track order #1234" → Get order status
   - "Do you ship internationally?" → Get policy info

4. **Close and Reopen:**
   - Close chat window
   - Wait 10 seconds
   - Reopen
   - Verify messages persist

5. **Check Admin:**
   - Go to `/app`
   - Verify chat count increased
   - Check analytics for new session
   - Verify in real-time monitor

**Success Criteria:**
- [ ] All messages sent successfully
- [ ] AI responses received
- [ ] Data persists
- [ ] Admin dashboard updates

---

### Test 2: Multi-Device Test

**Test Setup:**
- Device 1: Desktop (Chrome)
- Device 2: Mobile (Safari)
- Device 3: Tablet (Firefox)

**Actions:**
1. Open storefront on all 3 devices
2. Open chat widget on each
3. Send messages from each
4. Verify all receive responses
5. Check admin for 3 sessions

**Expected:**
- Each device gets unique session
- All work independently
- Admin shows 3 active sessions
- No interference between devices

---

## 🐛 Common Issues & Solutions

### Issue 1: Server Won't Start

**Symptoms:**
```
Error: Cannot find module 'socket.io'
```

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

### Issue 2: Database Errors

**Symptoms:**
```
Prisma Client initialization error
```

**Solution:**
```bash
npx prisma generate
npx prisma db push
```

---

### Issue 3: OpenAI API Errors

**Symptoms:**
```
Error: OpenAI API key not configured
```

**Solution:**
1. Check `.env` file has `OPENAI_API_KEY=sk-...`
2. Verify key is valid at https://platform.openai.com/api-keys
3. Restart server

---

### Issue 4: Socket.IO Not Connecting

**Symptoms:**
- Chat works but slow
- Browser console: "Socket.IO connection failed"

**Solution:**
1. Ensure server started with `npm run dev:server`
2. Check CORS settings
3. Verify no firewall blocking
4. Test: `curl http://localhost:3000/socket.io/`

---

### Issue 5: Chat Widget Not Showing

**Symptoms:**
- Storefront loads but no chat button

**Possible Causes:**
1. Extension not deployed
2. Extension not enabled in theme
3. JavaScript errors
4. CSS conflicts

**Solution:**
1. Deploy extension: `shopify app deploy`
2. Check Theme Editor for "AI Chat Widget"
3. Enable app embed
4. Check browser console for errors

---

## 📝 Bug Reporting Template

When you find a bug, document it like this:

```markdown
## Bug: [Short description]

**Severity:** Critical / High / Medium / Low

**Environment:**
- OS: macOS / Windows / Linux
- Browser: Chrome 120 / Safari 17 / Firefox 115
- Node: v20.10.0
- Date: 2025-10-16

**Steps to Reproduce:**
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Screenshots:**
[If applicable]

**Console Errors:**
```
[Paste any console errors]
```

**Additional Context:**
[Any other relevant information]
```

---

## ✅ Testing Sign-Off Checklist

Before proceeding to next sprint, verify:

### Critical Features
- [ ] Server starts successfully
- [ ] Admin dashboard accessible
- [ ] Chat widget visible on storefront
- [ ] Messages send and receive
- [ ] AI responses generate
- [ ] Socket.IO connects
- [ ] Database operations work

### All Features
- [ ] All 6 admin pages load
- [ ] All admin features work
- [ ] Chat widget fully functional
- [ ] Real-time messaging works
- [ ] Product recommendations work
- [ ] Order tracking works
- [ ] Multi-language support
- [ ] Mobile responsive
- [ ] API endpoints respond
- [ ] Error handling works

### Performance
- [ ] Page load < 3 seconds
- [ ] API response < 2 seconds
- [ ] AI response < 5 seconds
- [ ] Socket.IO latency < 100ms
- [ ] No memory leaks
- [ ] No console errors

### Documentation
- [ ] All features documented
- [ ] Environment setup clear
- [ ] Troubleshooting helpful
- [ ] Examples work

---

## 📊 Test Results Template

```markdown
# Test Results - [Date]

## Summary
- **Total Tests:** 50
- **Passed:** 45
- **Failed:** 3
- **Blocked:** 2

## Detailed Results

### Backend Services ✅
- Server starts: PASS
- Database: PASS
- Health check: PASS
- Socket.IO: PASS

### Admin Dashboard ⚠️
- Dashboard: PASS
- Settings: PASS
- FAQs: PASS
- Analytics: FAIL (Charts not rendering)
- Billing: PASS
- Real-time: PASS

### Chat Widget ❌
- Visibility: PASS
- Open/Close: PASS
- Messages: FAIL (AI not responding)
- Real-time: BLOCKED (Need OpenAI key)
- Products: PASS
- Orders: PASS
- Mobile: PASS

### Issues Found
1. Analytics charts not rendering on first load
2. AI responses timing out after 30s
3. OpenAI API key required

### Blockers
1. OpenAI API key not configured
2. Development store not set up

### Recommendations
1. Fix analytics chart initialization
2. Increase AI timeout to 60s
3. Add better error messages
4. Complete OpenAI setup before next tests
```

---

**Happy Testing! 🚀**

Report all issues in this format for tracking.
