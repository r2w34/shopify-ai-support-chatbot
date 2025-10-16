# 🚀 Quick Start Guide - AI Support Chatbot

Get up and running with the AI Support Chatbot in 15 minutes!

---

## Prerequisites

Before you begin, ensure you have:
- ✅ Node.js 18.20+ or 20.10+ installed
- ✅ npm or yarn
- ✅ Git
- ✅ Shopify Partner account
- ✅ Development store
- ✅ OpenAI API key (for AI features)

---

## Step 1: Clone & Install (2 minutes)

```bash
# Clone the repository
git clone <repository-url>
cd ai-support-chatbot

# Install dependencies
npm install

# This will install 1100+ packages including:
# - Shopify app dependencies
# - Remix framework
# - Prisma ORM
# - OpenAI SDK
# - And more...
```

---

## Step 2: Environment Configuration (3 minutes)

```bash
# Copy the environment template
cp .env.example .env

# Open .env and add your credentials
nano .env  # or use your favorite editor
```

**Minimum Required Variables**:
```env
# Shopify (will be auto-filled when you run dev)
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=

# AI (REQUIRED for chat features)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Security (generate random secrets)
SESSION_SECRET=your-random-secret-32-chars
ENCRYPTION_KEY=your-random-encryption-key

# Application
NODE_ENV=development
PORT=3000
```

**Generate Secrets**:
```bash
# For SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# For ENCRYPTION_KEY
openssl rand -hex 32
```

---

## Step 3: Database Setup (2 minutes)

```bash
# Initialize the database
npx prisma generate
npx prisma db push

# This creates a SQLite database with all tables
# Location: prisma/dev.sqlite
```

**Optional: Explore your database**
```bash
# Open Prisma Studio (visual database browser)
npx prisma studio

# Opens at http://localhost:5555
```

---

## Step 4: Start Development Server (3 minutes)

```bash
# Start the app with Shopify CLI
npm run dev

# You'll see:
# ✓ Creating tunnel...
# ✓ Updating URLs in Partners Dashboard...
# ✓ Starting development server...
# 
# Preview: https://your-tunnel-url.trycloudflare.com
# 
# Press 'p' to open preview
# Press 'q' to quit
```

**First-Time Setup**:
1. You'll be prompted to login to Shopify
2. Select your Partner organization
3. Choose your development store
4. App will be created automatically in Partners Dashboard

---

## Step 5: Install on Development Store (2 minutes)

```bash
# With the dev server running, press 'p'
# This opens the app installation page
```

Or manually:
1. Go to: `https://your-tunnel-url.trycloudflare.com`
2. Click "Install app"
3. Review permissions and click "Install"
4. You'll be redirected to the app dashboard

---

## Step 6: Verify Installation (3 minutes)

### Test the App
1. **Admin Dashboard**: You should see the Shopify admin with your app loaded
2. **Check Database**: 
   ```bash
   npx prisma studio
   # Look for your store in the "Store" table
   ```

### Test Backend Services

**Test AI Service**:
```bash
# In a Node.js REPL or create a test file
node
```
```javascript
import { generateChatResponse } from './app/services/ai.server';

const response = await generateChatResponse(
  "Hello, how can you help me?",
  {
    conversationHistory: [],
    storeInfo: { name: "Test Store", currency: "USD", locale: "en" }
  }
);
console.log(response);
```

**Test Order Tracking** (after creating an order in your dev store):
```bash
# Visit: http://localhost:3000/api/orders/find?search=1001
# (Replace 1001 with an actual order number)
```

---

## Common Commands

### Development
```bash
npm run dev          # Start dev server with Shopify CLI
npm run build        # Build for production
npm start            # Start production server
```

### Database
```bash
npx prisma studio    # Visual database browser
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema changes
```

### Code Quality
```bash
npm run lint         # Run ESLint
npm test             # Run tests (when implemented)
```

### Shopify
```bash
npm run generate     # Generate new extension
npm run deploy       # Deploy to Shopify
```

---

## Project Structure Overview

```
ai-support-chatbot/
├── app/
│   ├── routes/              # Remix routes (pages & API)
│   │   ├── app._index.tsx  # Admin dashboard
│   │   ├── api.*.tsx       # API endpoints
│   │   └── webhooks.*.tsx  # Webhook handlers
│   ├── services/            # Business logic
│   │   ├── ai.server.ts    # AI/OpenAI
│   │   ├── orders.server.ts # Order tracking
│   │   ├── recommendations.server.ts
│   │   └── billing.server.ts
│   ├── db.server.ts         # Database client
│   └── shopify.server.ts    # Shopify setup
├── prisma/
│   └── schema.prisma        # Database schema
├── extensions/              # Shopify extensions (to be created)
├── shopify.app.toml         # App configuration
└── package.json
```

---

## Next Steps

### Immediate (Today)
1. ✅ Installation complete
2. 🔨 Explore the admin dashboard
3. 🔨 Test order tracking with sample orders
4. 🔨 Try the AI chat service
5. 🔨 Review the database schema

### This Week
1. 🚧 Build the admin dashboard UI
2. 🚧 Create the chat widget theme extension
3. 🚧 Implement API routes
4. 🚧 Add email/SMS integrations
5. 🚧 Write tests

### This Month
1. 🎯 Complete all UI components
2. 🎯 Build checkout extension
3. 🎯 Implement web pixel
4. 🎯 Performance optimization
5. 🎯 Security audit
6. 🎯 Beta testing

---

## Key URLs

### Development
- **App**: https://your-tunnel-url.trycloudflare.com
- **Admin**: https://admin.shopify.com/store/your-store/apps/ai-support-chatbot
- **Database Studio**: http://localhost:5555

### Resources
- **Shopify Docs**: https://shopify.dev/docs/apps
- **Polaris UI**: https://polaris.shopify.com
- **Remix Docs**: https://remix.run/docs
- **Prisma Docs**: https://prisma.io/docs
- **OpenAI API**: https://platform.openai.com/docs

---

## Troubleshooting

### Issue: "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Port 3000 already in use"
```bash
# Find and kill the process
lsof -i :3000
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev
```

### Issue: "Database locked"
```bash
# Reset the database
rm prisma/dev.sqlite
npx prisma db push
```

### Issue: "OpenAI API Error"
- Verify your `OPENAI_API_KEY` in `.env`
- Check you have credits in your OpenAI account
- Test the API key: https://platform.openai.com/playground

### Issue: "Shopify authentication failed"
```bash
# Re-login to Shopify
shopify auth logout
npm run dev
# Follow login prompts
```

### Issue: "Webhooks not receiving"
- Make sure your dev server is running
- Check Shopify Partners Dashboard → Webhooks
- Manually trigger a webhook:
  ```bash
  shopify app webhook trigger --topic=orders/create
  ```

---

## Development Tips

### Hot Reload
The development server supports hot module replacement (HMR). Changes to most files will automatically reload without restarting.

### Debugging
```bash
# Enable detailed logging
DEBUG=* npm run dev

# Node.js inspector
node --inspect ./build/server/index.js
```

### Database Changes
When you modify `prisma/schema.prisma`:
```bash
# Option 1: Push directly (dev)
npx prisma db push

# Option 2: Create migration (recommended)
npx prisma migrate dev --name add_new_field
```

### Testing Webhooks
```bash
# Trigger test webhooks
shopify app webhook trigger --topic=orders/create
shopify app webhook trigger --topic=customers/data_request
shopify app webhook trigger --topic=products/update
```

### Viewing Logs
```bash
# App logs
npm run dev 2>&1 | tee logs/app.log

# Shopify CLI logs
cat ~/.shopify/logs/shopify.log
```

---

## Configuration Files

### `shopify.app.toml`
Main app configuration:
- App name and handle
- OAuth scopes
- Webhook subscriptions
- App URL

### `prisma/schema.prisma`
Database schema:
- All data models
- Relationships
- Indexes

### `.env`
Environment variables (NEVER commit this file):
- API keys and secrets
- Database connection
- Feature flags

### `package.json`
Project dependencies and scripts:
- npm scripts
- Dependencies
- Dev dependencies

---

## Getting Help

### Documentation
- 📖 [README_PROJECT.md](./README_PROJECT.md) - Full project overview
- 📋 [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Launch checklist
- 💻 [CLI_COMMANDS.md](./CLI_COMMANDS.md) - All commands
- 🔌 [API_SPEC.md](./API_SPEC.md) - API reference
- 📊 [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Current status

### Support Channels
- GitHub Issues: Report bugs and request features
- Shopify Community: https://community.shopify.com
- Stack Overflow: Tag with `shopify` and `remix`

### Useful Resources
- [Shopify App Examples](https://github.com/Shopify/shopify-app-examples)
- [Polaris Components](https://polaris.shopify.com/components)
- [GraphQL Admin API](https://shopify.dev/api/admin-graphql)

---

## What's Next?

Now that you're set up, here's what to build:

### Week 1: Admin Dashboard
Build the merchant-facing UI with Polaris components:
- Dashboard home with metrics
- Chat settings page
- FAQ management
- Analytics charts

### Week 2: Chat Widget
Create the customer-facing chat interface:
- Theme extension setup
- Real-time messaging
- Product recommendations
- Order tracking UI

### Week 3: Extensions
Build additional Shopify extensions:
- Checkout UI extension
- Web pixel for analytics
- Test on development store

### Week 4: Testing & Polish
Prepare for launch:
- Write tests
- Performance optimization
- Security audit
- Documentation
- Beta testing

---

## Quick Commands Cheat Sheet

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production

# Database
npx prisma studio              # Database GUI
npx prisma db push             # Push schema changes
npx prisma generate            # Regenerate client

# Shopify
shopify app generate extension # Create extension
shopify app deploy             # Deploy to Shopify
shopify app webhook trigger    # Test webhooks

# Code Quality
npm run lint                   # Run linter
npm test                       # Run tests

# Git
git status                     # Check status
git add .                      # Stage changes
git commit -m "message"        # Commit
git push                       # Push to remote
```

---

## Success Checklist

- [x] ✅ Repository cloned
- [x] ✅ Dependencies installed
- [x] ✅ Environment configured
- [x] ✅ Database initialized
- [x] ✅ Dev server running
- [x] ✅ App installed on development store
- [ ] 🚧 Admin dashboard built
- [ ] 🚧 Chat widget created
- [ ] 🚧 API routes implemented
- [ ] 🚧 Extensions deployed
- [ ] 🚧 Tests written
- [ ] 🚧 Ready for production!

---

**Congratulations! You're ready to start building! 🎉**

For detailed information, see the [full documentation](./README_PROJECT.md).

---

**Last Updated**: 2025-10-16  
**Version**: 1.0.0
