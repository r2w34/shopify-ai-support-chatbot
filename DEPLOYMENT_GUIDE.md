# 🚀 Shopify AI Chatbot - Deployment Guide

## ✅ Deployment Status: **LIVE**

**Production URL:** https://shopchatai.indigenservices.com  
**VPS Server:** 72.60.99.154  
**Status:** Operational with SSL

---

## 📋 What Was Done

### 1. **Domain Migration**
- ✅ Changed from `twittstock.com` to `shopchatai.indigenservices.com`
- ✅ Updated all references in codebase
- ✅ SSL certificate installed (Let's Encrypt)
- ✅ Auto-renewal configured

### 2. **AI Service Migration**
- ✅ Switched from OpenAI to **Google Gemini API** (free tier)
- ✅ Updated all AI service functions
- ✅ Maintained same functionality

### 3. **GDPR Compliance**
- ✅ `customers/data_request` webhook
- ✅ `customers/redact` webhook  
- ✅ `shop/redact` webhook
- ✅ All webhooks tested and operational

### 4. **Application Fixes**
- ✅ Fixed navigation routes (install-widget → install)
- ✅ Created custom CORS helper
- ✅ Updated email addresses
- ✅ Fixed all domain references

### 5. **Production Setup**
- ✅ PM2 process manager configured
- ✅ Express server wrapper created
- ✅ Auto-restart on failure
- ✅ Environment variables configured
- ✅ Nginx reverse proxy with SSL

---

## 🖥️ CLI Commands for Your Windows Machine

### **Initial Setup (One-Time)**

```cmd
# Clone repository (if not already done)
git clone https://github.com/r2w34/shopify-ai-support-chatbot.git
cd shopify-ai-support-chatbot

# Install dependencies
npm install

# Copy environment variables
copy .env.example .env

# Edit .env file with your credentials
notepad .env
```

### **Pull Latest Changes**

```cmd
# Pull from main branch
git pull origin main

# Install any new dependencies
npm install
```

### **Deploy to Shopify**

```cmd
# Login to Shopify (first time only)
shopify auth login

# Deploy the app
shopify app deploy

# This will:
# - Deploy theme extension
# - Register webhooks
# - Update app configuration
```

### **Test Webhooks**

```cmd
# Test GDPR webhooks
shopify webhook trigger --topic=customers/data_request
shopify webhook trigger --topic=customers/redact
shopify webhook trigger --topic=shop/redact
```

### **Development Mode (Local Testing)**

```cmd
# Start development server
npm run dev

# This opens:
# - Local server: http://localhost:3000
# - Shopify preview in browser
```

### **Clean Old Branches**

```cmd
# View all branches
git branch -a

# Delete local branch (if any)
git branch -d old-branch-name

# Delete remote branch
git push origin --delete old-branch-name

# Clean up tracking branches
git remote prune origin
```

### **Common Git Commands**

```cmd
# Check status
git status

# Pull latest changes
git pull origin main

# View commit history
git log --oneline -10

# View remote info
git remote -v
```

---

## 🌐 Application URLs

### **Admin Panel**
- Dashboard: https://shopchatai.indigenservices.com/app
- Install Widget: https://shopchatai.indigenservices.com/app/install
- Settings: https://shopchatai.indigenservices.com/app/settings
- FAQs: https://shopchatai.indigenservices.com/app/faqs
- Analytics: https://shopchatai.indigenservices.com/app/analytics
- Live Chat: https://shopchatai.indigenservices.com/app/realtime
- Billing: https://shopchatai.indigenservices.com/app/billing
- Help: https://shopchatai.indigenservices.com/app/help

### **API Endpoints**
- Chat: https://shopchatai.indigenservices.com/api/chat/message
- Session: https://shopchatai.indigenservices.com/api/chat/session
- Widget Loader: https://shopchatai.indigenservices.com/widget-loader.js
- Chat Widget JS: https://shopchatai.indigenservices.com/chat-widget.js
- Chat Widget CSS: https://shopchatai.indigenservices.com/chat-widget.css

---

## 🔧 VPS Server Commands (SSH Access)

```bash
# SSH into server
ssh root@72.60.99.154
# Password: Kalilinux@2812

# Navigate to app directory
cd /var/www/shopify-ai-chatbot

# PM2 Commands
pm2 status                    # View app status
pm2 logs shopify-ai-chatbot  # View logs
pm2 restart shopify-ai-chatbot  # Restart app
pm2 stop shopify-ai-chatbot   # Stop app
pm2 start ecosystem.config.cjs  # Start app

# Nginx Commands
sudo systemctl status nginx   # Check Nginx status
sudo systemctl restart nginx  # Restart Nginx
sudo nginx -t                # Test configuration

# SSL Certificate Renewal
sudo certbot renew --dry-run  # Test renewal
sudo certbot certificates     # View certificates

# View logs
tail -f /root/.pm2/logs/shopify-ai-chatbot-out.log
tail -f /root/.pm2/logs/shopify-ai-chatbot-error.log
```

---

## 📦 Environment Variables

Required in `.env`:

```env
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_APP_URL=https://shopchatai.indigenservices.com
HOST=https://shopchatai.indigenservices.com
SCOPES=read_products,write_products,read_orders,write_orders,read_customers,write_customers,read_content,write_content,read_themes,write_themes,read_script_tags,write_script_tags
DATABASE_URL=file:./data/production.sqlite
NODE_ENV=production
PORT=3000
GEMINI_API_KEY=your_gemini_api_key
```

---

## 🎨 How Merchants Install the Widget

1. **Install the app** from Shopify App Store
2. **Go to Admin Panel** → Click "Install Widget"
3. **Open Theme Customizer** (button provided)
4. **Scroll to "App embeds"** section at bottom
5. **Enable "AI Chat Widget"** toggle
6. **Click Save**
7. **Visit store** - widget appears!

---

## 🛠️ Troubleshooting

### **App Not Loading**
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs shopify-ai-chatbot --lines 50

# Restart app
pm2 restart shopify-ai-chatbot
```

### **SSL Certificate Issues**
```bash
# Check certificate
sudo certbot certificates

# Renew if needed
sudo certbot renew

# Restart Nginx
sudo systemctl restart nginx
```

### **Port 3000 Not Listening**
```bash
# Check if process is running
netstat -tlnp | grep 3000

# Kill any zombie processes
pkill -f "node.*3000"

# Restart PM2
pm2 restart shopify-ai-chatbot
```

---

## 📞 Support

- **Email:** support@indigenservices.com
- **Domain:** https://shopchatai.indigenservices.com
- **Repository:** https://github.com/r2w34/shopify-ai-support-chatbot

---

## ✅ Deployment Checklist

- [x] Domain configured and SSL installed
- [x] Application deployed and running
- [x] PM2 configured with auto-restart
- [x] Nginx reverse proxy configured
- [x] Environment variables set
- [x] GDPR webhooks implemented
- [x] Navigation routes fixed
- [x] Domain references updated
- [x] AI service migrated to Gemini
- [x] Git repository updated

**Status: PRODUCTION READY** ✅
