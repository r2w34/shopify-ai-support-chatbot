# 🚀 Quick Setup Guide

## Current Status
- ✅ Server configured at **72.60.99.154**
- ✅ Application deployed to `/var/www/shopify-ai-chatbot`
- ⚠️ **DNS needs configuration** (currently pointing to wrong IP)
- ⚠️ **Shopify credentials needed** (app won't start without them)

---

## 🔴 CRITICAL: What You Need to Do NOW

### 1. Fix DNS (5 minutes)
Go to your DNS provider and update:
```
A Record: twittstock.com → 72.60.99.154
A Record: www.twittstock.com → 72.60.99.154
```

### 2. Get Shopify Credentials (10 minutes)
1. Go to: https://partners.shopify.com/
2. Create an app
3. Set App URL: `https://twittstock.com`
4. Get your API Key & Secret

### 3. Update Configuration (2 minutes)
```bash
ssh root@72.60.99.154
cd /var/www/shopify-ai-chatbot
nano .env
```

Change these lines:
```env
SHOPIFY_API_KEY=paste_your_api_key_here
SHOPIFY_API_SECRET=paste_your_api_secret_here
OPENAI_API_KEY=paste_your_openai_key_here  # Optional but recommended
```

Save: `Ctrl+X`, then `Y`, then `Enter`

### 4. Restart & Install SSL (5 minutes)
```bash
pm2 restart shopify-ai-chatbot
pm2 logs shopify-ai-chatbot  # Check if running

# Once DNS is working (wait 10-30 minutes):
certbot --nginx -d twittstock.com -d www.twittstock.com --agree-tos --email your@email.com --redirect
```

---

## ✅ How to Verify It's Working

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs shopify-ai-chatbot

# Test locally
curl http://localhost:3000

# Test domain (after DNS & SSL)
curl -I https://twittstock.com
```

---

## 📞 Quick Reference

**Server**: root@72.60.99.154 (password: Kalilinux@2812)  
**App Path**: `/var/www/shopify-ai-chatbot`  
**Config File**: `/var/www/shopify-ai-chatbot/.env`  
**Domain**: https://twittstock.com

**Common Commands**:
- Restart app: `pm2 restart shopify-ai-chatbot`
- View logs: `pm2 logs shopify-ai-chatbot`
- Edit config: `nano /var/www/shopify-ai-chatbot/.env`
- Test nginx: `nginx -t`
- Reload nginx: `systemctl reload nginx`

---

## 🆘 If Something Goes Wrong

1. **App not starting?**
   ```bash
   pm2 logs shopify-ai-chatbot --lines 100
   ```

2. **DNS not working?**
   ```bash
   nslookup twittstock.com  # Should show 72.60.99.154
   ```

3. **SSL fails?**
   - Make sure DNS is correct first
   - Wait at least 10 minutes after DNS change

4. **Need help?**
   - Check `/root/.pm2/logs/shopify-ai-chatbot-error.log`
   - Check `/var/log/nginx/error.log`

---

## 🎯 Expected Timeline

| Task | Time | Status |
|------|------|--------|
| DNS Update | 10-30 min | ⏳ Waiting |
| Get Shopify Creds | 10 min | ⏳ Waiting |
| Update .env | 2 min | ⏳ Waiting |
| App Start | Immediate | ⏳ Waiting |
| SSL Install | 5 min | ⏳ After DNS |
| **TOTAL** | **~1 hour** | |

---

**That's it! Once you complete these 4 steps, your Shopify AI Support Chatbot will be live at https://twittstock.com 🎉**
